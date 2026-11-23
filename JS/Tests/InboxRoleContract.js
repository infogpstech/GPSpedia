// Contrato de rol canónico del Inbox — AUG-115.
// Pruebas aisladas: no consulta Apps Script, Spreadsheet ni deployments.
function runInboxRoleContractTests(sources) {
 const ui=String(sources.ui||''),feedback=String(sources.feedback||''),inbox=String(sources.inbox||''),usersHtml=String(sources.usersHtml||''),authClient=String(sources.authClient||''),api=String(sources.api||'');const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw new Error(m||'Aserción fallida');};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}};
 const extract=(source,name)=>{const start=source.indexOf('function '+name+'(');assert(start>=0,'No se encontró '+name);const marks=["\nfunction ","\nconst ","\nexport function "].map(x=>source.indexOf(x,start+10)).filter(x=>x>=0);return source.slice(start,marks.length?Math.min(...marks):source.length).trim();};
 let session,canApprove;
 try {const code=[extract(ui,'normalizeUiRole_'),extract(ui,'getUiSessionContext_'),extract(ui,'canApproveInboxVideo_'),'return {getUiSessionContext_,canApproveInboxVideo_};'].join('\n');const api=new Function('getState',code)(()=>({currentUser:null}));session=api.getUiSessionContext_;canApprove=api.canApproveInboxVideo_;}catch(e){throw new Error('Helpers UI inválidos: '+e.message);}
 run('Sesión toma Privilegios como campo canónico y no admite el alias retirado',()=>{const c=session({ID:'U1',SessionToken:'S1',Privilegios:'Jefe',Rol:'Tecnico'});assert(c.role==='jefe');const legacy=session({ID:'U1',SessionToken:'S1',Privilegios:'Gefe'});assert(legacy.role==='gefe');});
 run('Sesión normaliza el rol',()=>{assert(session({ID:'U1',SessionToken:'S1',Privilegios:' DESARROLLADOR '}).role==='desarrollador');});
 run('Campo Rol no concede acceso sin Privilegios',()=>{const c=session({ID:'U1',SessionToken:'S1',Rol:'Desarrollador'});assert(c&&c.role==='');});
 run('UI permite únicamente Desarrollador',()=>{['Desarrollador'].forEach(r=>assert(canApprove(r)));['Jefe','Supervisor','Tecnico','Tecnico_exterior','Anónimo','Gefe',''].forEach(r=>assert(!canApprove(r)));});
 run('Detalle Inbox usa el rol normalizado del contexto',()=>{const s=ui.indexOf('export function renderInboxDetail(');assert(s>=0);const marks=["\nexport function ","\nfunction "].map(x=>ui.indexOf(x,s+20)).filter(x=>x>=0);const body=ui.slice(s,marks.length?Math.min(...marks):ui.length);assert(body.includes('const userRole = context.role'));assert(body.includes('canApproveInboxVideo_(userRole)'));assert(!/currentUser\.(?:Rol|Privilegios)/.test(body));});
 run('el diagnóstico de salud no conserva indicadores ni configuración de Coordinator',()=>{
  assert(!/Coordinator|coordinatorConfigured|globalServiceTraffic|getServiceTraffic/.test(ui));
  assert(!/COORDINATOR|getServiceTraffic/.test(api));
 });
 run('Backend mantiene RBAC para aprobación y rechazo',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(');assert(s>=0);const e=feedback.indexOf(');',s)+2;const policy=feedback.slice(s,e);assert(policy.includes('approveVideo: ["Desarrollador"]'));assert(policy.includes('rejectVideo: ["Desarrollador"]'));});
 run('Las acciones de no leído y ocultación son autenticadas, coordinadas y privadas',()=>{
  assert(feedback.includes('markInboxUnread: null')&&feedback.includes('deleteInboxConversation: null'),'Las acciones nuevas deben exigir actor autenticado.');
  assert(feedback.includes('handleMarkInboxUnread(payload)')&&feedback.includes('handleDeleteInboxConversation(payload)'),'FEEDBACK debe despachar ambas acciones.');
  assert(inbox.includes('function handleMarkInboxUnread(payload)')&&inbox.includes('function handleDeleteInboxConversation(payload)'),'Los handlers backend no están definidos.');
  assert(inbox.includes('inboxAssertVisible_')&&inbox.includes('Conversación ocultada solo para este participante'),'El borrado debe ocultar solo al participante y preservar el historial.');
 });
 run('Inbox reutiliza el actor autenticado por el dispatcher y evita una segunda lectura de sesión',()=>{
  assert(feedback.includes('userRole: actor.role, __feedbackActor: actor'),'El dispatcher no adjunta el actor verificado.');
  assert(inbox.includes('payload && payload.__feedbackActor'),'Inbox no reutiliza el actor verificado.');
  const authorized=feedback.indexOf('const authorized = { ...source');
  const actorAttach=feedback.indexOf('__feedbackActor: actor',authorized);
  assert(authorized>=0&&actorAttach>authorized,'El actor confiable debe sobrescribir cualquier campo enviado por el cliente.');
 });
 run('FEEDBACK consume exclusivamente el actor central sin consultar hojas de sesión',()=>{
  const body=extract(feedback,'assertFeedbackSession');
  assert(body.includes('__sharedSessionActor'),'FEEDBACK debe exigir actor compartido.');
  assert(!/ActiveSessions|Users|findUniqueRowsByExactValue_|touchSessionActivityIfDue_|getSessionExpirationStatus_/.test(body),
   'FEEDBACK conserva una revalidación local de usuario/sesión.');
 });

run('FEEDBACK no guarda URLs, secretos ni configuración local de COORDINATOR',()=>{
  assert(!/GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|isFeedbackCoordinatorConfigured_|handleGetCatalogChanges/.test(feedback));
  assert(!/coordinatorConfigured/.test(feedback));
  const router=feedback.slice(feedback.indexOf('function doPost(e)'),feedback.indexOf('const RICH_TEXT_MODE_PROPERTY_'));
  assert(!router.includes('getCatalogChanges'));
  assert(!/FEEDBACK_PUBLIC_ACTIONS[^;]*getCatalogChanges/.test(feedback));
});
run('El journal de cambios se consulta desde frontend directamente en CATALOG',()=>{
  assert(/'getCatalogChanges': 'CATALOG'/.test(api));
  const start=api.indexOf('export async function getCatalogChanges(');
  const end=api.indexOf('\nexport async function ',start+10);
  const body=api.slice(start,end>start?end:api.length);
  assert(start>=0&&body.includes("getConfiguredServiceEndpoint_(\"CATALOG\")"));
  assert(!/GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/.test(body));
});
 run('Lecturas FEEDBACK protegidas usan actor cacheado; rutas públicas no requieren sesión',()=>{const d=feedback.slice(feedback.indexOf('function doPost(e)'),feedback.indexOf('const RICH_TEXT_MODE_PROPERTY_'));assert(d.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "FEEDBACK" })'));assert(!d.includes('withSharedMutationLease_'));assert(d.includes('FEEDBACK_PUBLIC_ACTIONS.has(action)'));});

 run('Backend ignora rol falsificado y usa actor autenticado',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze('),e=feedback.indexOf(');',s)+2;const api=new Function('assertFeedbackSession',feedback.slice(s,e)+'\n'+extract(feedback,'authorizeFeedbackAction_')+'\nreturn authorizeFeedbackAction_;')(()=>({userId:'U1',userName:'Verificado',role:'Supervisor'}));const out=api('approveVideo',{userRole:'Desarrollador'});assert(out.userRole==='Supervisor');});
 run('Todos los rangos autorizados pueden iniciar mensajes desde el control existente',()=>{
  const open=sliceUi_('export async function openInbox()','');
  assert(open.includes("'tecnico'")&&open.includes("'tecnico_exterior'"));
  const modal=ui.slice(ui.indexOf("const openInboxModal_ = setupModal('inbox-modal'"),ui.indexOf("export async function openInbox()",ui.indexOf("const openInboxModal_")));
  assert(!ui.includes("inbox-requests-tab"),'La pestaña redundante Solicitudes no debe mostrarse.');
  assert(modal.includes("if (newMessageButton) newMessageButton.hidden = false"));
  assert(ui.includes('getElementById("inbox-new-message")'),'El control Nuevo mensaje debe conservar su enlace funcional.');
  assert(!ui.includes("inbox-consult-developer"));
  assert(feedback.includes('reportProblem: null')&&feedback.includes('case \'reportProblem\''),
   'El reporte de problema autenticado debe seguir siendo el canal de incidencias para soporte.');
  assert(feedback.includes('getMyProblemReports: null')&&feedback.includes('handleGetMyProblemReports(payload)'),
   'El usuario debe poder consultar solo sus tickets y respuestas mediante su sesión.');
  assert(feedback.includes('function handleReplyToFeedback')&&feedback.includes('function handleMarkAsResolved'),
   'El ticket debe conservar respuesta y resolución.');
  assert(ui.includes("Estado del ticket")&&ui.includes("ticketCategoryLabels"),
   'El detalle del reporte debe mostrar categoría y estado sin añadir controles nuevos.');
  const formStart=ui.indexOf("async function openInboxNewConversationForm_()");
  const formEnd=ui.indexOf("\nasync function toggleInboxConversationArchive_",formStart);
  const form=ui.slice(formStart,formEnd);
  assert(form.includes('const draftKind = "new:direct"'));
  assert(!form.includes('"Nuevo mensaje"')&&!form.includes("inbox-new-title"),'El compositor no debe repetir un título redundante.');
  assert(form.includes("getInboxRecipients(context)"));
  assert(!form.includes("Consultar al desarrollador"));
  function sliceUi_(start,end){const i=ui.indexOf(start);assert(i>=0);const j=end?ui.indexOf(end,i+start.length):-1;return ui.slice(i,j>i?j:ui.length);}
 });
 run('Backend impone la jerarquía de destinatarios en lectura y creación',()=>{
  assert(inbox.includes('desarrollador: new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"])'));
  assert(inbox.includes('jefe: new Set(["supervisor","tecnico","tecnico_exterior"])'));
  assert(inbox.includes('supervisor: new Set(["jefe"])'));
  assert(inbox.includes('tecnico: new Set(["supervisor"])'));
  assert(inbox.includes('tecnico_exterior: new Set(["supervisor"])'));
  assert(inbox.includes('inboxAssertRecipientAllowed_(actor, recipient)'));
  assert(inbox.includes('const type = "direct"'));
 });
 run('Las solicitudes de aprobación de YouTube solo son visibles para Desarrollador',()=>{
  const start=feedback.indexOf('function handleGetFeedbackItems(');
  const end=feedback.indexOf('\nfunction handleGetMyProblemReports',start);
  assert(start>=0&&end>start,'No se encontró el lector de solicitudes del Inbox.');
  const body=feedback.slice(start,end);
  assert(body.includes('canSeeVideoApprovals=String(actor&&actor.role||"")==="Desarrollador"'));
  assert(body.includes('mappedFeedback.filter(item=>canSeeVideoApprovals||item.type!=="video_approval")'));
  assert(feedback.includes('approveVideo: ["Desarrollador"]'));
  assert(feedback.includes('rejectVideo: ["Desarrollador"]'));
 });
  run('Técnicos y técnicos exteriores ven únicamente sus vídeos y el motivo de rechazo',()=>{
   const start=feedback.indexOf('function handleGetMyProblemReports(payload)');
   const end=feedback.indexOf('\nfunction ensureInboxAuditSheet_()',start);
   assert(start>=0&&end>start,'No se encontró el lector de solicitudes propias.');
   const body=feedback.slice(start,end);
   assert(body.includes('["tecnico","tecnico_exterior"].includes(normalizeFeedbackRole(actor.role))'));
   assert(body.includes('videoData.subType === "video_approval"'));
   assert(body.includes('String(videoData.createdByUserId || "").trim() === actor.userId'));
   assert(body.includes('item._cursor = "video:" + item.id'));
   assert(feedback.includes('rejectionReason:normalizeInboxStoredText_(videoMeta.rejectReason,500,"")'));
   assert(ui.includes("item.type === 'problem_report' || item.type === 'video_approval'"));
   assert(ui.includes("appendLabeledValue(rejectionPanel, 'Motivo del rechazo', item.rejectionReason"));
   assert(ui.includes("if (item.reply && !isVideoItem)"));
  });
 run('InboxConversations mantiene una sola entrada Jefe en su lista de roles',()=>{assert(inbox.includes('new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"])'));assert(!/INBOX_ACTIVE_ROLES_[^\\n]*gefe/.test(inbox));});
 run('Gestión de usuarios ofrece y muestra únicamente Jefe',()=>{assert(usersHtml.includes("availableRoles = ['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior']"));assert(usersHtml.includes("return normalized === 'jefe' ? 'Jefe' : role"));assert(!usersHtml.toLowerCase().includes('gefe'));});
 run('Perfil frontend normaliza únicamente el rol canónico Jefe',()=>{assert(authClient.includes("if(role==='jefe')updated.Privilegios='Jefe'"));assert(!authClient.toLowerCase().includes('gefe'));});
 run('Aprobación y rechazo reciben el mismo rol canónico que controla la visibilidad',()=>{const i=ui.indexOf('export function renderInboxDetail(');const body=ui.slice(i,ui.indexOf('\nexport function ',i+20)>i?ui.indexOf('\nexport function ',i+20):ui.length);assert(body.includes('const userRole = context.role'));assert(body.includes('approveVideo(item.id, userName, userRole, getSessionPayload_())'));assert(body.includes('rejectVideo(item.id, userName, reason, userRole, getSessionPayload_())'));});
 return {status:failed===0?'PASS':'FAIL',passed,failed,results};
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const result=runInboxRoleContractTests({ui:readFileSync(resolve(root,'JS/Frontend/ui.js'),'utf8'),feedback:readFileSync(resolve(root,'Services/feedback.js'),'utf8'),api:readFileSync(resolve(root,'JS/Frontend/api-config.js'),'utf8')});
result.results.forEach(item=>console.log(item.status+' '+item.name+(item.message?' — '+item.message:'')));
console.log('AUG-115: '+result.passed+'/'+(result.passed+result.failed)+' pruebas aprobadas.');
if(result.failed)process.exitCode=1;
