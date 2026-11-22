// AUG-039: contratos del asignador central de IDs y consumidores autenticados de WRITE.
function runWriteAuthorizationContracts(sources) {
 const write=String(sources.write||""),admin=String(sources.admin||""),ui=String(sources.ui||""),html=String(sources.addCuts||"");
 const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw Error(m||"Aserción fallida.");};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}};
 function extract(source,name){
  const start=source.indexOf("function "+name+"(");assert(start>=0,"No existe "+name);
  const open=source.indexOf("{",start);let depth=0,quote="",escape=false,line=false,block=false;
  for(let i=open;i<source.length;i++){
   const c=source[i],n=source[i+1];
   if(line){if(c==="\n")line=false;continue;}
   if(block){if(c==="*"&&n==="/"){block=false;i++;}continue;}
   if(quote){if(escape)escape=false;else if(c==="\\")escape=true;else if(c===quote)quote="";continue;}
   if(c==="/"&&n==="/"){line=true;i++;continue;}
   if(c==="/"&&n==="*"){block=true;i++;continue;}
   if(c==="'"||c==='"'||c==="\x60"){quote=c;continue;}
   if(c==="{")depth++;
   if(c==="}"&&--depth===0)return source.slice(start,i+1);
  }
  throw Error("Función incompleta "+name);
 }
 const auth=extract(write,"assertDeveloperForIdMaintenance"),allocate=extract(write,"handleAllocateVehicleId");
 function harness(options){
  options=options||{};
  let authCalls=0,roleReads=0,lockCalls=0,allocations=0,spreadsheetReads=0;
  const authFn=(payload,allowedRoles)=>{
   authCalls++;
   if(!payload||!payload.userId||!payload.sessionToken)throw Error("Sesión inválida.");
   const role=options.roleAtRead?options.roleAtRead(roleReads+1):(options.role||"Desarrollador");
   roleReads++;
   const normalized=String(role||"").trim().toLowerCase();
   if(Array.isArray(allowedRoles)&&!allowedRoles.includes(normalized))throw Error("El mantenimiento de IDs de Cortes requiere privilegio Desarrollador.");
   return{role:normalized};
  };
  const spreadsheet=()=>{spreadsheetReads++;return{getSheetByName:name=>name==="Cortes"?{}:null};};
  const lockService={getScriptLock(){lockCalls++;throw Error("El asignador central no debe adquirir ScriptLock.");}};
  const fn=new Function("getAuthenticatedCollaborator","LockService","getSpreadsheet","SHEET_NAMES","normalizeCortesIdAllocationRequest_","reserveCortesVehicleIdForOperation_",
   auth+"\n"+allocate+"\nreturn handleAllocateVehicleId;")(
   authFn,lockService,spreadsheet,{CORTES:"Cortes"},
   payload=>({opId:payload.opId,operationHash:payload.operationHash}),
   (sheet,request)=>{allocations++;if(!sheet||!request.opId||!request.operationHash)throw Error("Reserva incompleta.");return 77;});
  return{fn,stats:()=>({authCalls,roleReads,lockCalls,allocations,spreadsheetReads})};
 }
 const payload={userId:"USR-1",sessionToken:"session-1",opId:"OP-1",operationHash:"a".repeat(64),role:"Tecnico"};
 run("allocateVehicleId valida sesión y permite únicamente Desarrollador sin lock",()=>{
  const h=harness({role:"Desarrollador"}),r=h.fn(payload),x=h.stats();
  assert(r.status==="success"&&r.vehicleId===77&&x.authCalls===1&&x.roleReads===1&&x.lockCalls===0&&x.spreadsheetReads===1&&x.allocations===1);
 });
 run("rol ordinario se rechaza antes de consultar Spreadsheet o reservar",()=>{
  const h=harness({role:"Tecnico"});let rejected=false;
  try{h.fn(payload);}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  const x=h.stats();assert(rejected&&x.authCalls===1&&x.roleReads===1&&x.lockCalls===0&&x.spreadsheetReads===0&&x.allocations===0);
 });
 run("el rol servidor prevalece sobre payload.role",()=>{
  const h=harness({roleAtRead:()=>"Tecnico"});let rejected=false;
  try{h.fn({...payload,role:"Desarrollador"});}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}
  const x=h.stats();assert(rejected&&x.authCalls===1&&x.roleReads===1&&x.lockCalls===0&&x.spreadsheetReads===0&&x.allocations===0);
 });
 run("sesión ausente no consulta perfil, Spreadsheet ni ledger",()=>{
  const h=harness();let rejected=false;
  try{h.fn({...payload,sessionToken:""});}catch(_){rejected=true;}
  const x=h.stats();assert(rejected&&x.authCalls===1&&x.roleReads===0&&x.lockCalls===0&&x.spreadsheetReads===0&&x.allocations===0);
 });
 run("allocateVehicleId no repite la autenticación dentro de la misma solicitud",()=>{
  const h=harness({role:"Desarrollador"});h.fn(payload);const x=h.stats();assert(x.authCalls===1&&x.roleReads===1);
 });
 run("ADMIN transmite identidad y sesión al asignador WRITE sin token de lease",()=>{const fn=extract(admin,"requestNextVehicleIdFromWriteService");assert(/userId:\s*payload\s*&&\s*payload\.userId/.test(fn)&&/sessionToken:\s*payload\s*&&\s*payload\.sessionToken/.test(fn)&&!/sharedMutationToken|__sharedMutationToken/.test(fn));});
 run("los modales de apertura y alimentación adjuntan la sesión activa",()=>{const calls=ui.match(/routeAction\(["']addSupplementaryInfo["']/g)||[];assert(calls.length===2,"Se esperaban exactamente dos consumidores de addSupplementaryInfo en ui.js.");assert((ui.match(/getDeveloperSessionPayload\(\)/g)||[]).length>=2,"Falta adjuntar el contexto de sesión en los modales.");});
 run("handleStage3Submit recupera la sesión vigente y usa WRITE para información suplementaria",()=>{const start=html.indexOf("async function handleStage3Submit"),end=html.indexOf("\n        // --- UI & UTILITY HELPERS",start),fn=html.slice(start,end);assert(start>=0&&end>start);assert(/getCurrentSessionForOwner\(state\.userId\)/.test(fn));assert(/Object\.assign\(\{\},pending\.requestData,\{userId:session\.userId,sessionToken:session\.sessionToken\}\)/.test(fn));assert(/routeAction\('addSupplementaryInfo',request\)/.test(fn));});
  run("ADMIN rechaza rutas WRITE heredadas antes de resolver el actor y no usa Coordinator",()=>{const start=admin.indexOf("function doPost(e)"),end=admin.indexOf("\nfunction doPostInternal_",start),router=admin.slice(start,end);const rejection=router.indexOf('[\"checkOperation\", \"addOrUpdateCut\", \"addSupplementaryInfo\"].includes(action)');assert(rejection>=0&&rejection<router.indexOf("getCachedSharedSessionActor_"));assert(!router.includes("withSharedMutationLease_"));});
 run("WRITE autentica addSupplementaryInfo y registra aportes append-only sin lock",()=>{const start=write.indexOf("function handleAddSupplementaryInfo(payload)"),end=write.indexOf("\nfunction handleAddSupplementaryInfoLocked",start),outer=write.slice(start,end);const authAt=outer.indexOf("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)"),snapshotAt=outer.indexOf("readSupplementaryVehicleSnapshot_"),prepareAt=outer.indexOf("prepareSupplementaryImageUploads_"),appendAt=outer.indexOf("appendVehicleContributionEvent_");assert(start>=0&&end>start&&authAt>=0&&authAt<snapshotAt&&snapshotAt<prepareAt&&prepareAt<appendAt);assert((outer.match(/getAuthenticatedCollaborator\(/g)||[]).length===1);assert(!/tryLock\(|waitLock\(|getWriteContributionLock_\(|withSharedMutationLease_\(/.test(outer));});

 return{passed,failed,total:passed+failed,results};
}
