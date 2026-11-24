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
 run("handleAddSupplementaryInfo registra aportes mediante ledger append-only sin lock",()=>{
  const start=write.indexOf("function handleAddSupplementaryInfo(payload)");
  const end=write.indexOf("\nfunction handleAddSupplementaryInfoLocked",start);
  assert(start>=0&&end>start,"No se encontró el handler suplementario completo");
  const outer=write.slice(start,end);
  const authAt=outer.indexOf("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)");
  const snapshotAt=outer.indexOf("readSupplementaryVehicleSnapshot_");
  const prepareAt=outer.indexOf("prepareSupplementaryImageUploads_");
  const appendAt=outer.indexOf("appendVehicleContributionEvent_");
  assert(authAt>=0&&authAt<snapshotAt&&snapshotAt<prepareAt&&prepareAt<appendAt);
  assert(outer.includes("opId")&&outer.includes("contributionEvents")&&outer.includes("duplicate:events.length>0&&events.every(e=>e.event.duplicate===true)"));
  assert(!/tryLock\(|waitLock\(|getWriteContributionLock_\(|withSharedMutationLease_\(/.test(outer));
 });
 run("La carga suplementaria prepara imágenes y registra el evento sin retener locks",()=>{
  const outerStart=write.indexOf("function handleAddSupplementaryInfo(payload)");
  const outerEnd=write.indexOf("\nfunction handleAddSupplementaryInfoLocked",outerStart);
  const outer=write.slice(outerStart,outerEnd);
  const folderStart=write.indexOf("function findOrCreateSupplementaryVehicleFolder_(vehicle)");
  const folderEnd=write.indexOf("\nfunction prepareSupplementaryImageUploads_",folderStart);
  const folder=write.slice(folderStart,folderEnd);
  assert(outer.indexOf("prepareSupplementaryImageUploads_")<outer.indexOf("appendVehicleContributionEvent_"));
  assert(!/tryLock\(|waitLock\(|getWriteContributionLock_\(|withSharedMutationLease_\(/.test(outer));
  assert(/return findOrCreateVehicleFolder\(vehicle\)/.test(folder));
  assert(!/withSharedMutationLease_/.test(folder));
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

 run("allocateVehicleId valida sesión y rol Desarrollador antes de reservar sin lock",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  let authCalls=0,roleReads=0,lockCalls=0,reservations=0,spreadsheetReads=0;
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{authCalls++;if(!payload||!payload.userId||!payload.sessionToken)throw Error("Sesión inválida.");roleReads++;const role=String("Desarrollador").trim().toLowerCase();if(!roles.includes(role))throw Error("Se requiere privilegio Desarrollador.");return{role};});
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperation_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock(){lockCalls++;throw Error("El asignador no debe adquirir ScriptLock.");}},
   ()=>{spreadsheetReads++;return{getSheetByName:()=>({})};},{CORTES:"Cortes"},
   payload=>({opId:payload.opId,operationHash:payload.operationHash}),
   (sheet,request)=>{reservations++;assert(request.opId==="OP-1"&&request.operationHash==="a".repeat(64));return 77;});
  const result=fn({userId:"U1",sessionToken:"valid",opId:"OP-1",operationHash:"a".repeat(64),role:"Tecnico"});
  assert(result.status==="success"&&result.vehicleId===77&&authCalls===1&&roleReads===1&&lockCalls===0&&spreadsheetReads===1&&reservations===1);
 });
 run("allocateVehicleId rechaza rol ordinario antes de consultar Spreadsheet o reservar",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  let authCalls=0,roleReads=0,lockCalls=0,reservations=0,spreadsheetReads=0;
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{authCalls++;roleReads++;if(!roles.includes("desarrollador"))throw Error("política incorrecta");throw Error("Se requiere privilegio Desarrollador.");});
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperation_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock(){lockCalls++;throw Error("No debe adquirir lock.");}},
   ()=>{spreadsheetReads++;return{getSheetByName:()=>({})};},{CORTES:"Cortes"},()=>({opId:"OP-1",operationHash:"a".repeat(64)}),
   ()=>{reservations++;return 77;});
  let rejected=false;try{fn({userId:"U1",sessionToken:"valid",opId:"OP-1",operationHash:"a".repeat(64)});}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  assert(rejected&&authCalls===1&&roleReads===1&&lockCalls===0&&spreadsheetReads===0&&reservations===0);
 });
 run("allocateVehicleId confía en el rol autenticado y no en payload.role",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  let lockCalls=0,spreadsheetReads=0,reservations=0;
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{const serverRole="tecnico";if(!roles.includes(serverRole))throw Error("Se requiere privilegio Desarrollador.");return{role:serverRole};});
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperation_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock(){lockCalls++;throw Error("No debe adquirir lock.");}},
   ()=>{spreadsheetReads++;return{getSheetByName:()=>({})};},{CORTES:"Cortes"},()=>({opId:"OP-1",operationHash:"a".repeat(64)}),
   ()=>{reservations++;return 77;});
  let rejected=false;try{fn({userId:"U1",sessionToken:"valid",opId:"OP-1",operationHash:"a".repeat(64),role:"Desarrollador"});}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  assert(rejected&&lockCalls===0&&spreadsheetReads===0&&reservations===0);
 });
 run("sesión ausente no consulta perfil, Spreadsheet ni ledger",()=>{
  const handler=extract(write,"handleAllocateVehicleId"),auth=extract(write,"assertDeveloperForIdMaintenance");
  let authCalls=0,roleReads=0,lockCalls=0,spreadsheetReads=0,reservations=0;
  const check=new Function("getAuthenticatedCollaborator",auth+";return assertDeveloperForIdMaintenance;")(
   (payload,roles)=>{authCalls++;if(!payload||!payload.sessionToken)throw Error("Sesión inválida.");roleReads++;return{role:"desarrollador"};});
  const fn=new Function("assertDeveloperForIdMaintenance","LockService","getSpreadsheet","SHEET_NAMES","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperation_",
   handler+";return handleAllocateVehicleId;")(check,{getScriptLock(){lockCalls++;throw Error("No debe adquirir lock.");}},
   ()=>{spreadsheetReads++;return{getSheetByName:()=>({})};},{CORTES:"Cortes"},()=>({opId:"OP-1",operationHash:"a".repeat(64)}),
   ()=>{reservations++;return 77;});
  let rejected=false;try{fn({userId:"U1",opId:"OP-1",operationHash:"a".repeat(64)});}catch(_){rejected=true;}
  assert(rejected&&authCalls===1&&roleReads===0&&lockCalls===0&&spreadsheetReads===0&&reservations===0);
 });
 run("WRITE asigna IDs desde el servicio propietario mediante el ledger compartido",()=>{
  const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
  const end=write.indexOf("\nfunction handleCheckVehicle",start);
  const handler=write.slice(start,end);
  assert(start>=0&&end>start,"No se encontró la ruta de alta de vehículo nuevo.");
  assert(handler.includes("reserveCortesVehicleIdForOperation_"));
  assert(!handler.includes("getNextCortesVehicleIdLocked"));
  assert(extract(write,"handleAllocateVehicleId").includes("reserveCortesVehicleIdForOperation_"));
 });
 run("checkOperation consulta estado sin lease y las mutaciones usan actor cacheado",()=>{
  const fn=extract(write,"handleCheckOperation");
  const start=write.indexOf("function doPost(e)"),end=write.indexOf("\nfunction doPostInternal_",start),router=write.slice(start,end);
  assert(!fn.includes("getAuthenticatedCollaborator(payload)"));
  assert(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "WRITE", loadSpreadsheet: getSpreadsheet })'));
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
  assert(stage.includes("getCurrentSessionForOwner(state.userId)"));
  assert(stage.includes("Object.assign({},pending.requestData,{userId:session.userId,sessionToken:session.sessionToken})"));
  assert(stage.indexOf("getCurrentSessionForOwner(state.userId)")<stage.indexOf("routeAction('addSupplementaryInfo'"));
 });
 run("Registro silencioso se procesa en WRITE y solo lo puede ejecutar Desarrollador",()=>{
  assert(add.includes("const serviceOverride = null")&&add.includes("silent: silentVal"));
  const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_"),end=write.indexOf("\nfunction ",start+10),handler=write.slice(start,end<0?write.length:end);
   const preflightStart=write.indexOf("function prepareAddOrUpdateCutRequest_"),preflightEnd=write.indexOf("\nfunction handleAddOrUpdateCut(payload)",preflightStart),preflight=write.slice(preflightStart,preflightEnd);
   const outerStart=write.indexOf("function handleAddOrUpdateCut(payload)");
   const outerEnd=write.indexOf("\nfunction ",outerStart+10);
   const outer=write.slice(outerStart,outerEnd);
   const lockedStart=write.indexOf("function handleAddOrUpdateCutLocked("),lockedEnd=write.indexOf("\nfunction handleAddOrUpdateCutLockedUnsafe_",lockedStart),locked=write.slice(lockedStart,lockedEnd);
   assert(preflight.includes('getAuthenticatedCollaborator(payload, payload && payload.silent === true ? ["desarrollador"] : undefined)'));
   assert(preflight.includes("getAddCutPayloadValidationOptions_")&&preflight.includes("validateAddOrUpdateCutPayload_"));
   assert(outer.indexOf("prepareAddOrUpdateCutRequest_(payload)")<outer.indexOf("lock.tryLock(0)"),"El preflight debe terminar antes de intentar adquirir el lock no bloqueante.");
   assert(!locked.includes("getAuthenticatedCollaborator(")&&!locked.includes("validateAddOrUpdateCutPayload_"),"No debe repetir autenticación ni validación bajo el lock.");
   assert(!handler.includes("getAuthenticatedCollaborator("),"La identidad del colaborador no debe resolverse dos veces.");
   assert(/'addOrUpdateCut':\s*'WRITE'/.test(api));
 });
 run("WRITE reserva el ID antes de crear la fila física y conserva la clave de operación",()=>{
  const start=write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
  const end=write.indexOf("\nfunction handleCheckVehicle",start);
  const handler=write.slice(start,end);
  const reserveAt=handler.indexOf("reserveCortesVehicleIdForOperation_(");
  const rowAt=handler.indexOf("const lastRow = sheet.getLastRow()",reserveAt);
  assert(start>=0&&end>start&&reserveAt>=0&&rowAt>reserveAt,"La reserva persistente debe preceder a la creación de la fila.");
  assert(handler.includes("opId: opId ||")&&handler.includes("operationHash: operationHash ||"),
   "Las altas legacy y las operaciones con opId deben conservar una huella de reserva válida.");
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
   else if(name==="handleFreezeCortesIds"){const start=write.indexOf("function handleFreezeCortesIds("),end=write.indexOf("\\nfunction fingerprintValue_",start);fn=write.slice(start,end);}
   else fn=extract(write,name);
   assert(fn.includes("getAuthenticatedCollaborator")||fn.includes("assertDeveloperForIdMaintenance"),"Falta protección en "+name);
  }
 });
 return {status:failed?"FAIL":"PASS",passed,failed,results};
}
