// Contrato de rol canónico del Inbox — AUG-115.
// Pruebas aisladas: no consulta Apps Script, Spreadsheet ni deployments.
function runInboxRoleContractTests(sources) {
 const ui=String(sources.ui||''),feedback=String(sources.feedback||''),inbox=String(sources.inbox||''),usersHtml=String(sources.usersHtml||''),authClient=String(sources.authClient||'');const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw new Error(m||'Aserción fallida');};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}};
 const extract=(source,name)=>{const start=source.indexOf('function '+name+'(');assert(start>=0,'No se encontró '+name);const marks=["\nfunction ","\nconst ","\nexport function "].map(x=>source.indexOf(x,start+10)).filter(x=>x>=0);return source.slice(start,marks.length?Math.min(...marks):source.length).trim();};
 let session,canApprove;
 try {const code=[extract(ui,'normalizeUiRole_'),extract(ui,'getUiSessionContext_'),extract(ui,'canApproveInboxVideo_'),'return {getUiSessionContext_,canApproveInboxVideo_};'].join('\n');const api=new Function('getState',code)(()=>({currentUser:null}));session=api.getUiSessionContext_;canApprove=api.canApproveInboxVideo_;}catch(e){throw new Error('Helpers UI inválidos: '+e.message);}
 run('Sesión toma Privilegios como campo canónico y no admite el alias retirado',()=>{const c=session({ID:'U1',SessionToken:'S1',Privilegios:'Jefe',Rol:'Tecnico'});assert(c.role==='jefe');const legacy=session({ID:'U1',SessionToken:'S1',Privilegios:'Gefe'});assert(legacy.role==='gefe');});
 run('Sesión normaliza el rol',()=>{assert(session({ID:'U1',SessionToken:'S1',Privilegios:' DESARROLLADOR '}).role==='desarrollador');});
 run('Campo Rol no concede acceso sin Privilegios',()=>{const c=session({ID:'U1',SessionToken:'S1',Rol:'Desarrollador'});assert(c&&c.role==='');});
 run('UI permite solo Desarrollador, Jefe y Supervisor',()=>{['Desarrollador','Jefe','Supervisor'].forEach(r=>assert(canApprove(r)));['Tecnico','Tecnico_exterior','Anónimo','Gefe',''].forEach(r=>assert(!canApprove(r)));});
 run('Detalle Inbox usa el rol normalizado del contexto',()=>{const s=ui.indexOf('export function renderInboxDetail(');assert(s>=0);const marks=["\nexport function ","\nfunction "].map(x=>ui.indexOf(x,s+20)).filter(x=>x>=0);const body=ui.slice(s,marks.length?Math.min(...marks):ui.length);assert(body.includes('const userRole = context.role'));assert(body.includes('canApproveInboxVideo_(userRole)'));assert(!/currentUser\.(?:Rol|Privilegios)/.test(body));});
 run('Backend mantiene RBAC para aprobación y rechazo',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(');assert(s>=0);const e=feedback.indexOf(');',s)+2;const policy=feedback.slice(s,e);assert(policy.includes('approveVideo: ["Desarrollador", "Jefe", "Supervisor"]'));assert(policy.includes('rejectVideo: ["Desarrollador", "Jefe", "Supervisor"]'));});
 run('FEEDBACK actualiza LastActivityAt después de autenticar y autorizar al actor',()=>{assert(feedback.includes('sh.getRange(sessionMatch.rowIndex,6).setValue(new Date().toISOString())'));const touch=feedback.indexOf('sh.getRange(sessionMatch.rowIndex,6).setValue');const allowed=feedback.indexOf('if(Array.isArray(allowedRoles)',feedback.indexOf('function assertFeedbackSession'));assert(touch>allowed,'La actividad no debe actualizarse antes de validar el rol solicitado.');});
 run('Lecturas FEEDBACK protegidas adquieren lease de actividad; acciones públicas no',()=>{const d=feedback.slice(feedback.indexOf('function doPost(e)'),feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS'));assert(d.includes('withSharedMutationLease_("FEEDBACK", "sessionActivity"'));assert(d.includes('FEEDBACK_PUBLIC_ACTIONS.has(action)'));});

 run('Backend ignora rol falsificado y usa actor autenticado',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze('),e=feedback.indexOf(');',s)+2;const api=new Function('assertFeedbackSession',feedback.slice(s,e)+'\n'+extract(feedback,'authorizeFeedbackAction_')+'\nreturn authorizeFeedbackAction_;')(()=>({userId:'U1',userName:'Verificado',role:'Supervisor'}));const out=api('approveVideo',{userRole:'Desarrollador'});assert(out.userRole==='Supervisor');});
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
const result=runInboxRoleContractTests({ui:readFileSync(resolve(root,'JS/Frontend/ui.js'),'utf8'),feedback:readFileSync(resolve(root,'Services/feedback.js'),'utf8')});
result.results.forEach(item=>console.log(item.status+' '+item.name+(item.message?' — '+item.message:'')));
console.log('AUG-115: '+result.passed+'/'+(result.passed+result.failed)+' pruebas aprobadas.');
if(result.failed)process.exitCode=1;
