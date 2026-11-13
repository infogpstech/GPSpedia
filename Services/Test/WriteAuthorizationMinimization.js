// AUG-039: autorización de WRITE, asignación de IDs y minimización de checkOperation.
function runWriteAuthorizationMinimizationTests(sources) {
 const write=String(sources.write||""),admin=String(sources.admin||""),ui=String(sources.ui||""),
  add=String(sources.addCortes||""),api=String(sources.apiConfig||"");
 const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw Error(m||"Aserción fallida.");};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e&&e.message||e)});}};
 function extract(source,name){
  const re=new RegExp("(?:async\\s+)?function\\s+"+name+"\\s*\\("),match=re.exec(source);
  assert(match,"No se encontró "+name);
  const start=match.index,open=source.indexOf("{",start);let depth=0,quote="",escape=false,line=false,block=false;
  for(let i=open;i<source.length;i++){const c=source[i],n=source[i+1];
   if(line){if(c==="\\n")line=false;continue;}
   if(block){if(c==="*"&&n==="/"){block=false;i++;}continue;}
   if(quote){if(escape)escape=false;else if(c==="\\\\")escape=true;else if(c===quote)quote="";continue;}
   if(c==="/"&&n==="/"){line=true;i++;continue;}if(c==="/"&&n==="*"){block=true;i++;continue;}
   if(c==="'"||c==='"'||c==="\x60"){quote=c;continue;}
   if(c==="{")depth++;else if(c==="}"&&--depth===0)return source.slice(start,i+1);
  }
  throw Error("Función incompleta: "+name);
 }
 run("handleAddSupplementaryInfo rechaza sesión antes de adquirir lock o mutar",()=>{
  const fn=new Function("getAuthenticatedCollaborator","LockService","handleAddSupplementaryInfoLocked",
   extract(write,"handleAddSupplementaryInfo")+";return handleAddSupplementaryInfo;")(
   ()=>{throw Error("unauthorized");},{getScriptLock:()=>({waitLock(){throw Error("No debe adquirir lock");},releaseLock(){}})},
   ()=>{throw Error("No debe ejecutar mutación");});
  let rejected=false;try{fn({vehicleId:"V1"});}catch(e){rejected=true;}assert(rejected);
 });
 run("La mutación suplementaria revalida identidad y rol después del lock",()=>{
  const outer=extract(write,"handleAddSupplementaryInfo"),inner=extract(write,"handleAddSupplementaryInfoLocked");
  assert(outer.indexOf("getAuthenticatedCollaborator(payload")<outer.indexOf("waitLock"));
  assert(outer.includes("finally")&&outer.includes("releaseLock"));
  assert(inner.includes("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)"));
  assert(inner.indexOf("getAuthenticatedCollaborator")<inner.indexOf("getSpreadsheet()"));
 });

 run("WRITE declara contratos locales idénticos a AUTH para Users y ActiveSessions",()=>{
  assert(write.includes("const COLS_USERS = Object.freeze({")&&write.includes("Privilegios: 4")&&write.includes("Nombre_Completo: 7")&&write.includes("SessionToken: 8"));
  assert(write.includes("const COLS_ACTIVE_SESSIONS = Object.freeze({")&&write.includes("ID_Usuario: 1")&&write.includes("ActiveSessions: 3")&&write.includes("LastActivityAt: 6"));
  assert(write.includes('const ROLE_REVOCATION_SHARED_PREFIX = "__role_revocation_pending__:'));
 });
 run("El perfil servidor determina nombre y rol; no se confía en colaborador enviado",()=>{
  const helper=extract(write,"getAuthenticatedCollaborator");
  assert(helper.includes("tokenMatches.length!==1")&&helper.includes("ID_Usuario")&&helper.includes("getSessionExpirationStatus_"));
  assert(helper.includes("userMatches.length!==1")&&helper.includes("ROLE_REVOCATION_SHARED_PREFIX"));
  assert(helper.includes("COLS_USERS.Privilegios")&&helper.includes("COLS_USERS.Nombre_Completo"));
  assert(!helper.includes("payload.colaborador"));
 });
 run("allocateVehicleId valida sesión y rol Desarrollador antes y dentro del lock",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  assert(handler.indexOf("assertDeveloperForIdMaintenance(payload)")<handler.indexOf("waitLock"));
  assert(handler.lastIndexOf("assertDeveloperForIdMaintenance(payload)")<handler.indexOf("getNextCortesVehicleIdLocked"));
  assert(handler.includes("finally")&&handler.includes("releaseLock"));
  assert(auth.includes("getAuthenticatedCollaborator(payload)")&&auth.includes('role !== "desarrollador"'));
  assert(!auth.includes("payload.role")&&!auth.includes("payload.userRole"));
 });
 run("allocateVehicleId rechaza colaborador ordinario sin incrementar contador",()=>{
  const auth=extract(write,"assertDeveloperForIdMaintenance"),handler=extract(write,"handleAllocateVehicleId");
  let count=0,role="tecnico",locked=0;
  const getAuth=()=>true,users={getDataRange:()=>({getValues:()=>[["id","user","password","role"],["U1","tech","",role]]})};
  const deps={
   getAuthenticatedCollaborator:getAuth,getSpreadsheet:()=>({getSheetByName:()=>users}),
   SHEET_NAMES:{USERS:"Users"},COLS_USERS:{ID:1,Privilegios:4}
  };
  const check=new Function("deps",Object.keys(deps).map(k=>"const "+k+"=deps."+k+";").join(String.fromCharCode(10))+auth+";return assertDeveloperForIdMaintenance;")(deps);
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock:()=>({waitLock(){locked++;},releaseLock(){locked--;}})},()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{count++;return 99;});
  let rejected=false;try{fn({userId:"U1",sessionToken:"valid",role:"desarrollador"});}catch(_){rejected=true;}
  assert(rejected&&count===0&&locked===0,"El rol enviado por cliente autorizó el contador.");
 });
 run("allocateVehicleId permite solo perfil Desarrollador verificado en Users",()=>{
  const auth=extract(write,"assertDeveloperForIdMaintenance"),handler=extract(write,"handleAllocateVehicleId");
  const users={getDataRange:()=>({getValues:()=>[["id","user","password","role"],["U1","dev","","Desarrollador"]]})};
  const deps={getAuthenticatedCollaborator:()=>true,getSpreadsheet:()=>({getSheetByName:()=>users}),SHEET_NAMES:{USERS:"Users"},COLS_USERS:{ID:1,Privilegios:3}};
  const check=new Function("deps",Object.keys(deps).map(k=>"const "+k+"=deps."+k+";").join(String.fromCharCode(10))+auth+";return assertDeveloperForIdMaintenance;")(deps);
  let calls=0;const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked",handler+";return handleAllocateVehicleId;")(
   check,{getScriptLock:()=>({waitLock(){},releaseLock(){}})},()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{calls++;return 42;});
  assert(fn({userId:"U1",sessionToken:"valid",role:"tecnico"}).vehicleId===42&&calls===1);
 });
 run("checkOperation está autenticado y no devuelve rowData",()=>{
  const fn=extract(write,"handleCheckOperation");
  assert(fn.indexOf("getAuthenticatedCollaborator(payload)")<fn.indexOf("findRowByOpId"));
  assert(!fn.includes("rowData")&&!fn.includes("rowValues:"));
  assert(fn.includes("operationHash")&&fn.includes("vehicleId")&&fn.includes("timestamp"));
 });
 run("Todos los callsites suplementarios transmiten sesión",()=>{
  const calls=[...ui.matchAll(/routeAction\(["']addSupplementaryInfo["']/g)];
  assert(calls.length===2,"Cantidad inesperada de callsites UI: "+calls.length);
  assert(calls.every(m=>ui.slice(m.index,ui.indexOf(");",m.index)+2).includes("getDeveloperSessionPayload")));
  const start=add.indexOf("async function handleStage3Submit"),end=add.indexOf("\n        // --- UI & UTILITY HELPERS",start),stage=add.slice(start,end);
  assert(stage.includes("userId: state.userId, sessionToken: state.sessionToken"));
  assert(stage.indexOf("userId: state.userId")<stage.indexOf("routeAction('addSupplementaryInfo'"));
 });
 run("Registro silencioso conserva ADMIN y la autorización servidor",()=>{
  const stage=add.slice(add.indexOf("async function handleStage3Submit"),add.indexOf("\n        // --- UI & UTILITY HELPERS"));
  assert(stage.includes("const serviceOverride = silentVal ? 'ADMIN' : null"));
  assert(stage.includes("sessionToken: state.sessionToken"));
  const dispatch=admin.slice(admin.indexOf("function doPostInternal_"),admin.indexOf("\nfunction ",admin.indexOf("function doPostInternal_")+20));
  assert(dispatch.includes("assertDeveloperSession(payload)")&&dispatch.indexOf("assertDeveloperSession(payload)")<dispatch.indexOf("switch (action)"));
 });
 run("ADMIN solicita el ID a WRITE con credenciales de sesión, sin rol cliente",()=>{
  const fn=extract(admin,"requestNextVehicleIdFromWriteService");
  assert(fn.includes("userId: payload && payload.userId")&&fn.includes("sessionToken: payload && payload.sessionToken"));
  assert(!fn.includes("role:")&&!fn.includes("userRole"));
 });
 run("Router canónico mantiene acciones sensibles en WRITE",()=>{
  assert(/'addSupplementaryInfo':\s*'WRITE'/.test(api));
  assert(/'checkOperation':\s*'WRITE'/.test(api));
  assert(/'allocateVehicleId':\s*'WRITE'/.test(api));
 });
 run("Controles existentes addOrUpdateCut, addVinToVehicle y freezeCortesIds siguen autenticados",()=>{
  for(const name of ["handleAddOrUpdateCutLocked","handleAddVinToVehicleLocked","handleFreezeCortesIds"]){
   const fn=extract(write,name);assert(fn.includes("getAuthenticatedCollaborator")||fn.includes("assertDeveloperForIdMaintenance"),"Falta protección en "+name);
  }
 });
 return {status:failed?"FAIL":"PASS",passed,failed,results};
}
