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
  options=options||{};let authCalls=0,roleReads=0,lockAcquired=0,lockReleased=0,allocations=0,spreadsheetReads=0;
  const authFn=payload=>{authCalls++;if(!payload||!payload.userId||!payload.sessionToken)throw Error("Sesión inválida.");if(options.revokeOnSecondAuth&&authCalls>1)throw Error("Sesión revocada.");};
  const spreadsheet=()=>{spreadsheetReads++;return{getSheetByName(name){
   if(name==="Users"){roleReads++;const role=options.roleAtRead?options.roleAtRead(roleReads):(options.role||"Desarrollador");return{getDataRange:()=>({getValues:()=>[["ID","","","Privilegios"],["USR-1","","",role]]})};}
   if(name==="Cortes")return{getLastRow:()=>1};
   return null;
  }};};
  const lockService={getScriptLock:()=>({waitLock(){lockAcquired++;},releaseLock(){lockReleased++;}})};
  const fn=new Function("getAuthenticatedCollaborator","getSpreadsheet","SHEET_NAMES","COLS_USERS","LockService","getNextCortesVehicleIdLocked",
   auth+"\n"+allocate+"\nreturn handleAllocateVehicleId;")(
   authFn,spreadsheet,{USERS:"Users",CORTES:"Cortes"},{ID:1,Privilegios:4},lockService,()=>{allocations++;return 77;});
  return{fn,stats:()=>({authCalls,roleReads,lockAcquired,lockReleased,allocations,spreadsheetReads})};
 }
 const payload={userId:"USR-1",sessionToken:"session-1"};
 run("allocateVehicleId valida sesión y permite únicamente Desarrollador",()=>{const h=harness({role:"Desarrollador"});const r=h.fn(payload);const x=h.stats();assert(r.status==="success"&&r.vehicleId===77&&x.authCalls===2&&x.roleReads===2&&x.allocations===1&&x.lockReleased===1);});
 run("rol ordinario no adquiere lock ni incrementa el contador",()=>{const h=harness({role:"Tecnico"});let rejected=false;try{h.fn(payload);}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}const x=h.stats();assert(rejected&&x.lockAcquired===0&&x.allocations===0);});
 run("cambio de rol a ordinario entre validaciones detiene la reserva bajo lock",()=>{const h=harness({roleAtRead:n=>n===1?"Desarrollador":"Tecnico"});let rejected=false;try{h.fn(payload);}catch(e){rejected=/privilegio Desarrollador/.test(e.message);}const x=h.stats();assert(rejected&&x.lockAcquired===1&&x.lockReleased===1&&x.allocations===0);});
 run("sesión ausente/revocada antes de reservar no consulta Users ni contador",()=>{const h=harness({role:"Desarrollador"});let rejected=false;try{h.fn({userId:"USR-1"});}catch(_){rejected=true;}const x=h.stats();assert(rejected&&x.roleReads===0&&x.lockAcquired===0&&x.allocations===0);});
 run("sesión revocada entre validación inicial y revalidación libera lock sin reservar",()=>{const h=harness({role:"Desarrollador",revokeOnSecondAuth:true});let rejected=false;try{h.fn(payload);}catch(_){rejected=true;}const x=h.stats();assert(rejected&&x.lockAcquired===1&&x.lockReleased===1&&x.allocations===0);});
 run("ADMIN transmite identidad y token al asignador WRITE",()=>{const fn=extract(admin,"requestNextVehicleIdFromWriteService");assert(/userId:\s*payload\s*&&\s*payload\.userId/.test(fn)&&/sessionToken:\s*payload\s*&&\s*payload\.sessionToken/.test(fn)&&/sharedMutationToken/.test(fn));});
 run("los modales de apertura y alimentación adjuntan la sesión activa",()=>{const calls=ui.match(/routeAction\(["']addSupplementaryInfo["']/g)||[];assert(calls.length===2,"Se esperaban exactamente dos consumidores de addSupplementaryInfo en ui.js.");assert((ui.match(/getDeveloperSessionPayload\(\)/g)||[]).length>=2,"Falta adjuntar el contexto de sesión en los modales.");});
 run("handleStage3Submit transmite userId y sessionToken y conserva ruta ADMIN silenciosa",()=>{const start=html.indexOf("async function handleStage3Submit"),end=html.indexOf("\n        // --- UI & UTILITY HELPERS",start),fn=html.slice(start,end);assert(start>=0&&end>start);assert(/userId:\s*state\.userId/.test(fn)&&/sessionToken:\s*state\.sessionToken/.test(fn));assert(/silentVal\s*\?\s*'ADMIN'/.test(fn)&&/routeAction\('addSupplementaryInfo',\s*payload,\s*serviceOverride\)/.test(fn));});
 run("ADMIN exige assertDeveloperSession antes de despachar addSupplementaryInfo",()=>{const dispatch=admin.slice(admin.indexOf("function doPostInternal_"));assert(dispatch.includes("assertDeveloperSession(payload)"));assert(dispatch.includes("case 'addSupplementaryInfo'"));});
 run("WRITE autentica addSupplementaryInfo antes y después del lock",()=>{const outer=extract(write,"handleAddSupplementaryInfo"),inner=extract(write,"handleAddSupplementaryInfoLocked");assert(outer.indexOf("getAuthenticatedCollaborator")>=0&&outer.indexOf("getAuthenticatedCollaborator")<outer.indexOf("waitLock"));assert(outer.includes("finally")&&outer.includes("releaseLock"));assert(inner.includes("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)"));});
 return{passed,failed,total:passed+failed,results};
}
