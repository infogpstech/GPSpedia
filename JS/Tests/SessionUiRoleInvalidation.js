// AUG-042 — invalidación de sesión, estado privilegiado y contrato de rol del cliente.
function runSessionUiRoleInvalidationTests(sources) {
 const ui=String(sources.ui||""),auth=String(sources.auth||""),users=String(sources.users||""),authService=String(sources.authService||""),main=String(sources.main||""),feedback=String(sources.feedback||""),css=String(sources.css||"");
 const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw Error(m||"Aserción fallida");};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}};
 const slice=(source,start,end)=>{const i=source.indexOf(start);assert(i>=0,"No se encontró "+start);const j=end?source.indexOf(end,i+start.length):-1;return source.slice(i,j>i?j:source.length);};
 run("logout elimina estado en memoria y persistencia local antes de revocación remota",()=>{
  const f=slice(auth,"export function logout(","/**");
  assert(f.includes("setState({ currentUser: null"));
  assert(f.includes("localStorage.removeItem(SESSION_KEY)"));
  assert(f.includes("showLoginScreen(reason ? 'Error en el inicio de sesión, intente otra vez' : undefined)"));
  assert(f.includes("routeAction('logout', { userId, sessionToken })"));
  assert(f.includes("logoutGeneration_")&&f.includes("sameSession"),"Debe proteger cierres obsoletos frente a otra sesión.");
 });
 run("showLoginScreen limpia estado privilegiado antes de mostrar login",()=>{
  const f=slice(ui,"export function showLoginScreen(","function renderTermsGate_");
  assert(f.indexOf("resetSessionUi_()")>=0&&f.indexOf("resetSessionUi_()")<f.indexOf("setState("));
  assert(f.includes("currentUser: null"));
 });
 run("El aviso de sesión terminada centra solo su texto y no altera los errores de acceso",()=>{
  const endedRule=slice(css,"#login-modal #login-error.login-session-ended {","}");
  const accessRule=slice(css,"#login-modal #login-error:not(.login-session-ended) {","}");
  const screen=slice(ui,"export function showLoginScreen(","function renderTermsGate_");
  assert(/text-align:\s*center/.test(endedRule),"El aviso de sesión terminada debe centrar su texto.");
  assert(!/text-align:\s*center/.test(accessRule),"Los errores de acceso deben conservar su alineación original.");
  assert(screen.includes("loginError.classList.toggle('login-session-ended', sessionEnded)"));
  assert(screen.includes("loginError.setAttribute('role', sessionEnded ? 'status' : 'alert')"));
  assert(screen.includes("loginError.setAttribute('aria-live', sessionEnded ? 'polite' : 'assertive')"));
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
 run("abrir paneles usa la sesión y el rol ya establecidos sin solicitar otra validación AUTH",()=>{
  const f=slice(ui,"function ensureUiSessionRole_(","function getSessionPayload_");
  assert(f.includes("getUiSessionContext_()"));
  assert(f.includes("allowedRoles.includes(context.role)"));
  assert(!f.includes("validateActiveSession"),"Abrir un panel no debe revalidar la sesión.");
  assert(!f.includes("routeAction("),"Abrir un panel no debe generar una petición de autenticación.");
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
 run("el contexto de rol reconoce sesiones AUTH heredadas con ID o id sin relajar token ni permisos",()=>{
  const context=slice(ui,"function getUiSessionContext_(","function isCurrentUiSessionContext_");
  assert(context.includes("user.ID || user.id"),"Debe aceptar las dos formas de identificador admitidas por AUTH.");
  assert(context.includes("user.SessionToken"),"Debe seguir exigiendo token de sesión.");
  assert(context.includes("normalizeUiRole_(user.Privilegios)"),"Debe normalizar el rol de la sesión autenticada.");
 });
 run("el contexto de sesión acepta ID e id heredados y rechaza sesiones sin token",()=>{
  const helpers=slice(ui,"function normalizeUiRole_","function isCurrentUiSessionContext_");
  const resolve=new Function("getState",helpers+"; return getUiSessionContext_();");
  const legacy=resolve(()=>({currentUser:{id:"legacy-user",SessionToken:"token-1",Privilegios:"Desarrollador"}}));
  assert(legacy&&legacy.userId==="legacy-user"&&legacy.role==="desarrollador");
  const canonical=resolve(()=>({currentUser:{ID:"canonical-user",SessionToken:"token-2",Privilegios:"Técnico"}}));
  assert(canonical&&canonical.userId==="canonical-user"&&canonical.role==="tecnico");
  const invalid=resolve(()=>({currentUser:{id:"legacy-user",Privilegios:"Desarrollador"}}));
  assert(invalid===null,"Una sesión sin token no debe producir contexto autenticado.");
 });
 run("la tarjeta Agregar Tutorial se muestra solo a Desarrollador y el modal vuelve a validar el rol",()=>{
  const render=slice(ui,"function mostrarTutorialesGrid()","function mostrarRelayGrid()");
  assert(render.includes("getUiSessionContext_()?.role === \"desarrollador\""));
  assert(render.includes("createCard.className = \"card card-create-tutorial\""));
  assert(render.includes("grid.appendChild(createCard)"));
  const modal=slice(ui,"export function openAddTutorialModal()","const SESSION_ABSOLUTE_MONTHS");
  assert(modal.includes("getUiSessionContext_()?.role !== \"desarrollador\""));
  assert(modal.includes("La sesión ya no tiene permisos para registrar tutoriales."));
 });
 run("El acceso Developer usa el mismo contexto autenticado para mostrar y abrir el panel",()=>{
  const render=slice(ui,"export function showApp(user)","// Variable local");
  assert(render.includes("const appContext = getUiSessionContext_(user)"));
  assert(render.includes("const userRole = appContext ? appContext.role : ''"));
  assert(render.includes("userRole === 'desarrollador' ? 'flex' : 'none'"));
  const open=slice(ui,"export async function openDevTools(...args)","function initAdminPanelListeners");
  assert(open.includes("ensureUiSessionRole_(['desarrollador'])"));
  assert(open.includes("openDevToolsModal_(...args)"));
  assert(open.includes("showGlobalError"),"Si el contexto no es válido, debe explicar por qué no abre.");
  const menu=slice(main,"// Dev Tools button listener","// 3. PWA installation prompt handler");
  assert(menu.includes("ui.closeSideMenuAndRun(() => ui.openDevTools"));
 });
 run("Inbox usa Privilegios normalizado y entrega el mismo rol a approve/reject",()=>{
  const f=slice(ui,"export function renderInboxDetail(","\nexport function ");
  assert(f.includes("const userRole = context.role"));
  assert(f.includes("canApproveInboxVideo_(userRole)"));
  assert(f.includes("approveVideo(item.id, userName, userRole, getSessionPayload_())"));
  assert(f.includes("rejectVideo(item.id, userName, reason, userRole, getSessionPayload_())"));
  assert(f.includes("['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(normalizeUiRole_(context.role))"));
 });
 run("Jefe puede consultar el Inbox pero no aprobar ni rechazar vídeos",()=>{
  const can=slice(ui,"function canApproveInboxVideo_(","function getUiSessionContext_");
  assert(can.includes("role) === 'desarrollador'"));
  assert(!can.includes("'jefe'"));
  const policy=slice(feedback,"const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(","\n);");
  assert(policy.includes('approveVideo: ["Desarrollador"]'));
  assert(policy.includes('rejectVideo: ["Desarrollador"]'));
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
 run("payload Developer acepta ID e id mediante el contexto autenticado común",()=>{
  const helper=slice(ui,"function getDeveloperSessionPayload()","function getReplacedImageCapabilities_");
  const resolve=new Function("getUiSessionContext_",helper+"; return getDeveloperSessionPayload();");
  const legacy=resolve(()=>({userId:"legacy-user",sessionToken:"token-legacy",role:"desarrollador"}));
  assert(legacy.userId==="legacy-user"&&legacy.sessionToken==="token-legacy");
  const canonical=resolve(()=>({userId:"canonical-user",sessionToken:"token-canonical",role:"desarrollador"}));
  assert(canonical.userId==="canonical-user"&&canonical.sessionToken==="token-canonical");
  let rejected=false;try{resolve(()=>null);}catch(error){rejected=/sesión autenticada válida/.test(error.message);}
  assert(rejected,"Debe rechazar sesiones sin contexto o token.");
 });
 run("Las operaciones UI no dependen de currentUser.ID sin fallback ni contexto común",()=>{
  assert(!/currentUser\.ID(?!\s*\|\|\s*currentUser\.id)/.test(ui),"No debe quedar ninguna operación dependiente de currentUser.ID exclusivo.");
  assert(/function getDeveloperSessionPayload\(\) \{[\s\S]*?getUiSessionContext_\(\)/.test(ui),"El payload Developer debe usar el contexto común.");
  assert(/const latestSessionContext = getUiSessionContext_\(\)/.test(ui),"El reintento de corte debe resolver la sesión actual con el contexto común.");
 });
 run("AUTH conserva la validación de inicio/restauración y el backend protege las operaciones; los paneles no revalidan",()=>{
  const f=slice(auth,"export async function validateActiveSession(","export async function checkSession");
  assert(f.includes("result.valid === false")&&f.includes("logout('Tu sesión ya no está vigente. Inicia sesión nuevamente.', user)"));
  const startup=slice(auth,"export async function checkSession()","export async function ");
  assert(!startup.includes("validateSessionCoordinated")&&!startup.includes("apiValidateSession"));
  assert(startup.includes("normalizedRole")&&startup.includes("handleLoginSuccess(user, false)"));
  const guard=slice(ui,"function ensureUiSessionRole_(","function getSessionPayload_");
  assert(!guard.includes("validateActiveSession"));
  assert(authService.includes("validateAndTouchSession_"),"El backend conserva la autorización integrada en la operación protegida.");
 });
 return {status:failed===0?"PASS":"FAIL",passed,failed,results};
}
