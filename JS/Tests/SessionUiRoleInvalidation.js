// AUG-042 — invalidación de sesión, estado privilegiado y contrato de rol del cliente.
function runSessionUiRoleInvalidationTests(sources) {
 const ui=String(sources.ui||""),auth=String(sources.auth||""),users=String(sources.users||""),authService=String(sources.authService||""),main=String(sources.main||""),feedback=String(sources.feedback||"");
 const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw Error(m||"Aserción fallida");};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}};
 const slice=(source,start,end)=>{const i=source.indexOf(start);assert(i>=0,"No se encontró "+start);const j=end?source.indexOf(end,i+start.length):-1;return source.slice(i,j>i?j:source.length);};
 run("logout elimina estado en memoria y persistencia local antes de revocación remota",()=>{
  const f=slice(auth,"export function logout(","/**");
  assert(f.includes("setState({ currentUser: null"));
  assert(f.includes("localStorage.removeItem(SESSION_KEY)"));
  assert(f.includes("showLoginScreen(reason)"));
  assert(f.includes("routeAction('logout', { userId, sessionToken })"));
  assert(f.includes("logoutGeneration_")&&f.includes("sameSession"),"Debe proteger cierres obsoletos frente a otra sesión.");
 });
 run("showLoginScreen limpia estado privilegiado antes de mostrar login",()=>{
  const f=slice(ui,"export function showLoginScreen(","function renderTermsGate_");
  assert(f.indexOf("resetSessionUi_()")>=0&&f.indexOf("resetSessionUi_()")<f.indexOf("setState("));
  assert(f.includes("currentUser: null"));
 });
 run("resetSessionUi limpia modales, buffers, cachés y vistas sensibles",()=>{
  const f=slice(ui,"function resetSessionUi_()","export function showLoginScreen");
  for(const x of ["inEditMode = false","clearInMemoryEditBackup_()","pendingAdminImageUploads.clear()","resetRoleScopedViews_()","closeReplacedImagesLightbox_(true)","restorePrivilegedModalTemplates_()"])assert(f.includes(x),"Falta "+x);
  const ids=slice(ui,"const PRIVILEGED_MODAL_IDS_","function capturePrivilegedModalTemplates_");
  for(const id of ["dev-tools-modal","replaced-images-modal","inbox-modal","dashboard-modal"])assert(ids.includes(id),"Falta reset de "+id);
  const role=slice(ui,"function resetRoleScopedViews_()","function resetSessionUi_()");
  for(const x of ["inboxList.innerHTML = ''","inboxDetail.innerHTML = ''","activityLogs.innerHTML = ''","invalidateInboxCache_()"])assert(role.includes(x));
 });
 run("showApp reinicia estado al cambiar cuenta, token o rol",()=>{
  const f=slice(ui,"export function showApp(","function ");
  assert(f.includes("appContext.userId")&&f.includes("appContext.sessionToken")&&f.includes("appContext.role"));
  assert(f.includes("if (lastShownAppContextKey !== appContextKey)"));
  assert(f.includes("resetSessionUi_()"));
 });
 run("vistas privilegiadas abren sin esperar AUTH y validan en segundo plano",()=>{
  const f=slice(ui,"async function ensureUiSessionRole_(","function getSessionPayload_");
  assert(f.includes("validateActiveSession(false)"));
  assert(f.includes("isCurrentUiSessionContext_(expected)"));
  assert(f.includes("const current = getUiSessionContext_()"));
  assert(f.includes("allowedRoles.includes(current.role)"));
  assert(f.includes("promise.then("));
  assert(!f.includes("await pending.promise"),"La interfaz no debe esperar la red para abrir.");
  assert(f.includes("return null"));
  for(const name of ["openDevToolsModal_","openInboxModal_","openDashboardModal_"]){
   const k=ui.indexOf("const "+name);assert(k>=0,"No se encontró "+name);
   const body=ui.slice(k,ui.indexOf("\n",k+1)+3000);
   assert(body.includes("ensureUiSessionRole_"),name+" no comprueba el rol local.");
  }
 });
 run("window.state no conserva token tras logout y window.ui no almacena credenciales",()=>{
  const payload=slice(ui,"function getSessionPayload_()","function invalidateInboxCache_");
  assert(payload.includes("getUiSessionContext_()")&&payload.includes("throw new Error"));
  const context=slice(ui,"function getUiSessionContext_(","function isCurrentUiSessionContext_");
  assert(context.includes("getState().currentUser")&&context.includes("user.SessionToken"));
  assert(main.includes("window.state = state")&&main.includes("window.ui = ui"));
  assert(!/window\.ui\s*=\s*\{[^}]*SessionToken\s*:/.test(main));
 });
 run("Inbox usa Privilegios normalizado y entrega el mismo rol a approve/reject",()=>{
  const f=slice(ui,"export function renderInboxDetail(","\nexport function ");
  assert(f.includes("const userRole = context.role"));
  assert(f.includes("canApproveInboxVideo_(userRole)"));
  assert(f.includes("approveVideo(item.id, userName, userRole, getSessionPayload_())"));
  assert(f.includes("rejectVideo(item.id, userName, reason, userRole, getSessionPayload_())"));
  assert(f.includes("['desarrollador', 'jefe', 'supervisor'].includes(context.role)"));
 });
 run("Jefe puede acceder al Inbox y aprobar o rechazar según la matriz del backend",()=>{
  const can=slice(ui,"function canApproveInboxVideo_(","function getUiSessionContext_");
  assert(can.includes("['desarrollador', 'jefe', 'supervisor']"));
  assert(can.includes("'jefe'"));
  const policy=slice(feedback,"const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(","\n);");
  assert(policy.includes("approveVideo: [\"Desarrollador\", \"Jefe\", \"Supervisor\"]"));
  assert(policy.includes("rejectVideo: [\"Desarrollador\", \"Jefe\", \"Supervisor\"]"));
 });
 run("cambio de rol en servidor marca revocación, cierra sesiones y protege la última cuenta Desarrollador",()=>{
  const f=slice(authService,"function handleUpdateUser(","const SESSION_ABSOLUTE_MONTHS");
  assert(f.includes("ROLE_REVOCATION_SHARED_PREFIX"));
  assert(f.includes("reconcileRoleRevocationUnderLock_"));
  assert(f.includes("revokeAllUserSessionsUnderLock_")||f.includes("reconcileRoleRevocationUnderLock_"));
  assert(f.includes("selfSessionRevoked"));
  assert(f.includes("countActiveDevelopers_"));
 });
 run("auto-cambio de rol elimina sesión local, limpia state y redirige",()=>{
  const f=slice(users,"const wasDeveloper","async function deleteUser");
  assert(f.includes("updateResult.selfSessionRevoked"));
  assert(f.includes("localStorage.removeItem(SESSION_KEY)"));
  assert(f.includes("window.state.setState({ currentUser: null })"));
  assert(f.includes("window.location.replace('../index.html')"));
 });
 run("AUTH revocado fuerza logout; las vistas no bloquean su apertura por red lenta",()=>{
  const f=slice(auth,"export async function validateActiveSession(","export async function checkSession");
  assert(f.includes("result.valid === false")&&f.includes("logout('Tu sesión ya no está vigente. Inicia sesión nuevamente.', user)"));
  const guard=slice(ui,"async function ensureUiSessionRole_(","function getSessionPayload_");
  assert(guard.includes("validateActiveSession(false)")&&guard.includes("promise.then("));
  assert(guard.includes("if (valid === null)"));
  assert(guard.includes("return current && isCurrentUiSessionContext_(expected)"));
  assert(!guard.includes("await pending.promise"));
 });
 return {status:failed===0?"PASS":"FAIL",passed,failed,results};
}
