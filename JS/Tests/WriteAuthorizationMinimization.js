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
 run("handleAddSupplementaryInfo adquiere lock y delega autenticación antes de mutar",()=>{
  let acquired=0,released=0,delegated=false,rejected=false;
  const fn=new Function("LockService","handleAddSupplementaryInfoLocked",
   extract(write,"handleAddSupplementaryInfo")+";return handleAddSupplementaryInfo;")(
   {getScriptLock:()=>({waitLock(){acquired++;},releaseLock(){released++;}})},
   ()=>{delegated=true;throw Error("unauthorized");});
  try{fn({vehicleId:"V1"});}catch(_){rejected=true;}
  assert(rejected&&delegated&&acquired===1&&released===1);
 });
 run("La mutación suplementaria valida una sola vez después de adquirir el lock",()=>{
  const outer=extract(write,"handleAddSupplementaryInfo"),inner=extract(write,"handleAddSupplementaryInfoLocked");
  assert(!outer.includes("getAuthenticatedCollaborator("));
  assert(outer.indexOf("waitLock")<outer.indexOf("handleAddSupplementaryInfoLocked(payload)"));
  assert(outer.includes("finally")&&outer.includes("releaseLock"));
  assert(inner.includes("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)"));
  assert(inner.indexOf("getAuthenticatedCollaborator")<inner.indexOf("getSpreadsheet()"));
 });
 run("WRITE no duplica los esquemas ni la autenticación local de AUTH",()=>{
  assert(!write.includes("COLS_USERS")&&!write.includes("COLS_ACTIVE_SESSIONS"));
  assert(!write.includes("ROLE_REVOCATION_SHARED_PREFIX"));
  assert(!write.includes("findUniqueRowsByExactValue_")&&!write.includes("getSessionExpirationStatus_"));
 });
 run("WRITE consume identidad/rol del actor central sin consultar hojas de sesión",()=>{
  const helper=extract(write,"getAuthenticatedCollaborator");
  assert(helper.includes("__sharedSessionActor"));
  assert(helper.includes("Number.isSafeInteger(trusted.epoch)"));
  assert(helper.includes("trusted.fullName")&&helper.includes("trusted.role"));
  assert(!/getSpreadsheet|ActiveSessions|Users|findUniqueRowsByExactValue_|getSessionExpirationStatus_|touchSessionActivityIfDue_/.test(helper));
  assert(!helper.includes("payload.colaborador"));
 });

 run("allocateVehicleId valida sesión y rol Desarrollador una vez dentro del lock",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  assert(handler.indexOf("waitLock")<handler.indexOf("assertDeveloperForIdMaintenance(payload)"));
  assert((handler.match(/assertDeveloperForIdMaintenance\(payload\)/g)||[]).length===1);
  assert(handler.lastIndexOf("assertDeveloperForIdMaintenance(payload)")<handler.indexOf("getNextCortesVehicleIdLocked"));
  assert(handler.includes("finally")&&handler.includes("releaseLock"));
  assert(auth.includes('getAuthenticatedCollaborator(payload, ["desarrollador"])'));
  assert(!auth.includes("getSpreadsheet")&&!auth.includes("payload.role")&&!auth.includes("payload.userRole"));
 });
 run("allocateVehicleId rechaza rol ordinario dentro del lock sin incrementar contador",()=>{
  const auth=extract(write,"assertDeveloperForIdMaintenance"),handler=extract(write,"handleAllocateVehicleId");
  let count=0,locked=0,released=0;
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{if(!roles.includes("desarrollador"))throw Error("política incorrecta");throw Error("Se requiere privilegio Desarrollador.");});
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock:()=>({waitLock(){locked++;},releaseLock(){released++;}})},
   ()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{count++;return 99;});
  let rejected=false;try{fn({userId:"U1",sessionToken:"valid",role:"Desarrollador"});}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  assert(rejected&&count===0&&locked===1&&released===1);
 });
 run("allocateVehicleId permite solo rol Desarrollador devuelto por autenticación servidor",()=>{
  const auth=extract(write,"assertDeveloperForIdMaintenance"),handler=extract(write,"handleAllocateVehicleId");
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{if(!roles.includes("desarrollador"))throw Error("Falta política");return "Desarrollador verificado";});
  let calls=0,locked=0,released=0;
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock:()=>({waitLock(){locked++;},releaseLock(){released++;}})},
   ()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{calls++;return 42;});
  assert(fn({userId:"U1",sessionToken:"valid",role:"Tecnico"}).vehicleId===42&&calls===1&&locked===1&&released===1);
 });
 run("checkOperation consulta estado sin lease ni revalidación de sesión y no devuelve rowData",()=>{
  const fn=extract(write,"handleCheckOperation");
  const router=extract(write,"doPost");
  const branch=router.slice(router.indexOf("if (!isSharedMutationAction_(action))"),router.indexOf("const nestedToken"));
  assert(!fn.includes("getAuthenticatedCollaborator(payload)"));
  assert(!branch.includes("withSharedMutationLease_"));
  assert(branch.includes("doPostInternal_(withSharedSessionActor_(e, null))"));
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
