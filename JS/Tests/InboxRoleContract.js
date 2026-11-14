// Contrato de rol canónico del Inbox — AUG-115.
// Pruebas aisladas: no consulta Apps Script, Spreadsheet ni deployments.
function runInboxRoleContractTests(sources) {
 const ui=String(sources.ui||''),feedback=String(sources.feedback||'');const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw new Error(m||'Aserción fallida');};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}};
 const extract=(source,name)=>{const start=source.indexOf('function '+name+'(');assert(start>=0,'No se encontró '+name);const marks=["\nfunction ","\nconst ","\nexport function "].map(x=>source.indexOf(x,start+10)).filter(x=>x>=0);return source.slice(start,marks.length?Math.min(...marks):source.length).trim();};
 let session,canApprove;
 try {const code=[extract(ui,'normalizeUiRole_'),extract(ui,'getUiSessionContext_'),extract(ui,'canApproveInboxVideo_'),'return {getUiSessionContext_,canApproveInboxVideo_};'].join('\n');const api=new Function('getState',code)(()=>({currentUser:null}));session=api.getUiSessionContext_;canApprove=api.canApproveInboxVideo_;}catch(e){throw new Error('Helpers UI inválidos: '+e.message);}
 run('Sesión toma Privilegios como campo canónico',()=>{const c=session({ID:'U1',SessionToken:'S1',Privilegios:'Jefe',Rol:'Tecnico'});assert(c.role==='jefe');const legacy=session({ID:'U1',SessionToken:'S1',Privilegios:'Gefe'});assert(legacy.role==='jefe');});
 run('Sesión normaliza el rol',()=>{assert(session({ID:'U1',SessionToken:'S1',Privilegios:' DESARROLLADOR '}).role==='desarrollador');});
 run('Campo Rol no concede acceso sin Privilegios',()=>{const c=session({ID:'U1',SessionToken:'S1',Rol:'Desarrollador'});assert(c&&c.role==='');});
 run('UI permite solo Desarrollador, Jefe y Supervisor',()=>{['Desarrollador','Jefe','Supervisor','Gefe'].forEach(r=>assert(canApprove(r)));['Tecnico','Tecnico_exterior','Anónimo',''].forEach(r=>assert(!canApprove(r)));});
 run('Detalle Inbox usa el rol normalizado del contexto',()=>{const s=ui.indexOf('export function renderInboxDetail(');assert(s>=0);const marks=["\nexport function ","\nfunction "].map(x=>ui.indexOf(x,s+20)).filter(x=>x>=0);const body=ui.slice(s,marks.length?Math.min(...marks):ui.length);assert(body.includes('const userRole = context.role'));assert(body.includes('canApproveInboxVideo_(userRole)'));assert(!/currentUser\.(?:Rol|Privilegios)/.test(body));});
 run('Backend mantiene RBAC para aprobación y rechazo',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(');assert(s>=0);const e=feedback.indexOf(');',s)+2;const policy=feedback.slice(s,e);assert(policy.includes('approveVideo: ["Desarrollador", "Gefe", "Supervisor"]'));assert(policy.includes('rejectVideo: ["Desarrollador", "Gefe", "Supervisor"]'));});
 run('Backend ignora rol falsificado y usa actor autenticado',()=>{const s=feedback.indexOf('const FEEDBACK_ACTION_PERMISSIONS = Object.freeze('),e=feedback.indexOf(');',s)+2;const api=new Function('assertFeedbackSession',feedback.slice(s,e)+'\n'+extract(feedback,'authorizeFeedbackAction_')+'\nreturn authorizeFeedbackAction_;')(()=>({userId:'U1',userName:'Verificado',role:'Supervisor'}));const out=api('approveVideo',{userRole:'Desarrollador'});assert(out.userRole==='Supervisor');});
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
