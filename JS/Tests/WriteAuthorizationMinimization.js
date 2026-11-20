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
 run("handleAddSupplementaryInfo autentica primero y delega persistencia bajo lock corto",()=>{
  let acquired=0,released=0,delegated=false,rejected=false,authCalls=0;
  const fn=new Function("getAuthenticatedCollaborator","SUPPLEMENTARY_INFO_ALLOWED_ROLES_","getSpreadsheet","hasSupplementaryValue_","SHEET_NAMES","LockService","handleAddSupplementaryInfoLocked","createSupplementaryInfoError_",
   extract(write,"handleAddSupplementaryInfo")+";return handleAddSupplementaryInfo;")(
   ()=>{authCalls++;return "Nombre servidor";},["tecnico"],()=>({getSheetByName:()=>({})}),()=>false,{CORTES:"Cortes"},
   {getScriptLock:()=>({waitLock(ms){assert(ms===5000);acquired++;},releaseLock(){released++;}})},
   ()=>{delegated=true;throw Error("persistencia");},(code,message)=>{const error=Error(message);error.code=code;return error;});
  try{fn({vehicleId:"V1"});}catch(_){rejected=true;}
  assert(rejected&&delegated&&authCalls===1&&acquired===1&&released===1);
 });
 run("La mutación suplementaria carga imágenes antes del lock y recalcula bajo lock",()=>{
  const outer=extract(write,"handleAddSupplementaryInfo"),inner=extract(write,"handleAddSupplementaryInfoLocked");
  assert(outer.indexOf("getAuthenticatedCollaborator")<outer.indexOf("prepareSupplementaryImageUploads_"));
  assert(outer.indexOf("prepareSupplementaryImageUploads_")<outer.indexOf("waitLock(5000)"));
  assert(outer.includes("finally")&&outer.includes("releaseLock"));
  assert(inner.includes("buildSupplementaryInfoPlan_")&&inner.includes("persistSupplementaryInfoValues_"));
  assert(!/uploadImageToDrive|findOrCreateVehicleFolder|DriveApp/.test(inner));
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
  assert(handler.indexOf("tryLock(0)")<handler.indexOf("assertDeveloperForIdMaintenance(payload)"));
  assert(!handler.includes("waitLock("));
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
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperationLocked_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock:()=>({tryLock(ms){assert(ms===0,"El asignador debe usar tryLock(0).");locked++;return true;},releaseLock(){released++;}})},
   ()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{count++;return 99;},()=>null,()=>{throw Error("No debe reservar en este caso");});
  let rejected=false;try{fn({userId:"U1",sessionToken:"valid",role:"Desarrollador"});}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  assert(rejected&&count===0&&locked===1&&released===1);
 });
 run("allocateVehicleId permite solo rol Desarrollador devuelto por autenticación servidor",()=>{
  const auth=extract(write,"assertDeveloperForIdMaintenance"),handler=extract(write,"handleAllocateVehicleId");
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{if(!roles.includes("desarrollador"))throw Error("Falta política");return "Desarrollador verificado";});
  let calls=0,locked=0,released=0;
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","getNextCortesVehicleIdLocked","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperationLocked_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock:()=>({tryLock(ms){assert(ms===0,"El asignador debe usar tryLock(0).");locked++;return true;},releaseLock(){released++;}})},
   ()=>({getSheetByName:()=>({})}),{CORTES:"Cortes"},()=>{calls++;return 42;},()=>null,()=>{throw Error("No debe reservar en este caso");});
  assert(fn({userId:"U1",sessionToken:"valid",role:"Tecnico"}).vehicleId===42&&calls===1&&locked===1&&released===1);
 });
 run("checkOperation consulta estado sin lease y las mutaciones usan actor cacheado",()=>{
  const fn=extract(write,"handleCheckOperation");
  const start=write.indexOf("function doPost(e)"),end=write.indexOf("\nfunction doPostInternal_",start),router=write.slice(start,end);
  assert(!fn.includes("getAuthenticatedCollaborator(payload)"));
  assert(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "WRITE" })'));
  assert(!router.includes("withSharedMutationLease_"));
  assert(router.includes("doPostInternal_(withSharedSessionActor_(e, null))"));
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
 run("Registro silencioso se procesa en WRITE y solo lo puede ejecutar Desarrollador",()=>{
  assert(add.includes("const serviceOverride = null")&&add.includes("silent: silentVal"));
  const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_"),end=write.indexOf("\nfunction ",start+10),handler=write.slice(start,end<0?write.length:end);
   const preflightStart=write.indexOf("function prepareAddOrUpdateCutRequest_"),preflightEnd=write.indexOf("\nfunction handleAddOrUpdateCut(payload)",preflightStart),preflight=write.slice(preflightStart,preflightEnd);
   const outer=extract(write,"handleAddOrUpdateCut");
   const lockedStart=write.indexOf("function handleAddOrUpdateCutLocked("),lockedEnd=write.indexOf("\nfunction handleAddOrUpdateCutLockedUnsafe_",lockedStart),locked=write.slice(lockedStart,lockedEnd);
   assert(preflight.includes('getAuthenticatedCollaborator(payload, payload && payload.silent === true ? ["desarrollador"] : undefined)'));
   assert(preflight.includes("getAddCutPayloadValidationOptions_")&&preflight.includes("validateAddOrUpdateCutPayload_"));
   assert(outer.indexOf("prepareAddOrUpdateCutRequest_(payload)")<outer.indexOf("lock.tryLock(0)"),"El preflight debe ejecutarse antes del lock.");
   assert(!locked.includes("getAuthenticatedCollaborator(")&&!locked.includes("validateAddOrUpdateCutPayload_"),"No debe repetir autenticación ni validación bajo el lock.");
   assert(!handler.includes("getAuthenticatedCollaborator("),"La identidad del colaborador no debe resolverse dos veces.");
   assert(/'addOrUpdateCut':\s*'WRITE'/.test(api));
 });
 run("WRITE asigna IDs desde el servicio propietario",()=>{
  const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_"),end=write.indexOf("\nfunction ",start+10),handler=write.slice(start,end<0?write.length:end);
  assert(handler.includes("getNextCortesVehicleIdLocked"));
 });
 run("Router canónico mantiene acciones sensibles en WRITE",()=>{
  assert(/'addSupplementaryInfo':\s*'WRITE'/.test(api));
  assert(/'checkOperation':\s*'WRITE'/.test(api));
  assert(/'allocateVehicleId':\s*'WRITE'/.test(api));
 });
 run("Controles existentes addOrUpdateCut, addVinToVehicle y freezeCortesIds siguen autenticados",()=>{
  for(const name of ["handleAddOrUpdateCutLocked","handleAddVinToVehicleLocked","handleFreezeCortesIds"]){
   let fn;
   if(name==="handleAddOrUpdateCutLocked"){const start=write.indexOf("function prepareAddOrUpdateCutRequest_"),end=write.indexOf("\nfunction handleAddOrUpdateCut(payload)",start);fn=write.slice(start,end);}
   else fn=extract(write,name);
   assert(fn.includes("getAuthenticatedCollaborator")||fn.includes("assertDeveloperForIdMaintenance"),"Falta protección en "+name);
  }
 });
 return {status:failed?"FAIL":"PASS",passed,failed,results};
}
