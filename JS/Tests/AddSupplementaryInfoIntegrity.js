function runAddSupplementaryInfoIntegrityTests(sources) {
 const results=[];let passed=0,failed=0;
 function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
 function run_(name,fn){try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}}
 function buildRuntime(source){
  const sanitizerStart=source.indexOf("function sanitizeSupplementaryRichText_");
  const start=sanitizerStart>=0?sanitizerStart:source.indexOf("function createSupplementaryInfoError_"),end=source.indexOf("function handleAddSupplementaryInfo(payload",start);
  assert_(start>=0&&end>start,"No se encontró el bloque de helpers.");
  return new Function("COLS_CORTES","SpreadsheetApp",source.slice(start,end)+";return {plan:buildSupplementaryInfoPlan_,persist:persistSupplementaryInfoValues_};")(
   {apertura:33,imgApertura:34,cableAlimen:35,imgCableAlimen:36,timestamp:37,notaImportante:38,cableAlimen2:39,imgCableAlimen2:40,cableAlimen3:41,imgCableAlimen3:42},{flush:function(){}});
 }
 const empty={apertura:"",imgApertura:"",cableAlimen:"",imgCableAlimen:"",cableAlimen2:"",imgCableAlimen2:"",cableAlimen3:"",imgCableAlimen3:""};
 [["WRITE",sources.write],["ADMIN",sources.admin]].forEach(function(pair){
  const label=pair[0],source=String(pair[1]||""),runtime=buildRuntime(source);
  run_(label+" payload vacío",function(){try{runtime.plan({},empty);throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_EMPTY_PAYLOAD");}});
  run_(label+" apertura texto e imagen",function(){const p=runtime.plan({apertura:"texto",imgApertura:"data:image/png;base64,AA"},empty);assert_(p.updates.apertura&&p.updates.imgApertura);});
  run_(label+" apertura ocupada por texto",function(){try{runtime.plan({apertura:"nuevo"},Object.assign({},empty,{apertura:"viejo"}));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_CONFLICT");}});
  run_(label+" apertura ocupada por imagen",function(){try{runtime.plan({apertura:"nuevo"},Object.assign({},empty,{imgApertura:"URL"}));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_CONFLICT");}});
  run_(label+" asignación server-side ignora índice cliente",function(){const p=runtime.plan({cableAlimen3:"desc"},empty);assert_(p.slotIndex===1&&p.updates.cableAlimen==="desc");});
  run_(label+" imagen sola ocupa slot",function(){assert_(runtime.plan({imgCableAlimen:"data:image/png;base64,AA"},empty).slotIndex===1);});
  run_(label+" texto solo ocupa siguiente slot",function(){assert_(runtime.plan({cableAlimen:"nuevo"},Object.assign({},empty,{cableAlimen:"old"})).slotIndex===2);});
  run_(label+" imagen existente ocupa slot",function(){assert_(runtime.plan({cableAlimen:"nuevo"},Object.assign({},empty,{imgCableAlimen:"URL"})).slotIndex===2);});
  run_(label+" texto existente ocupa slot",function(){assert_(runtime.plan({imgCableAlimen:"data:image/png;base64,AA"},Object.assign({},empty,{cableAlimen:"old"})).slotIndex===2);});
  run_(label+" ficha obsoleta usa estado actual",function(){assert_(runtime.plan({cableAlimen:"nuevo"},Object.assign({},empty,{cableAlimen:"actual"})).slotIndex===2);});
  run_(label+" tres slots ocupados rechazan",function(){try{runtime.plan({cableAlimen:"nuevo"},Object.assign({},empty,{cableAlimen:"A",imgCableAlimen2:"B",cableAlimen3:"C"}));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_CONFLICT");}});
  run_(label+" pares entrantes múltiples rechazan",function(){try{runtime.plan({cableAlimen:"A",cableAlimen2:"B"},empty);throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_INVALID_PAYLOAD");}});
  run_(label+" nota sola válida",function(){assert_(runtime.plan({notaImportante:"Nota"},empty).updates.notaImportante==="Nota");});
  run_(label+" nota importante se sanitiza en backend",function(){const p=runtime.plan({notaImportante:'<script>alert(1)</script><strong>Nota segura</strong>'},empty);assert_(p.updates.notaImportante==="<strong>Nota segura</strong>");});
  run_(label+" sanea todos los campos enriquecidos antes de persistir",function(){
   const opening=runtime.plan({apertura:'<img src="https://cdn.example/a.png" onerror="alert(1)"><b>Apertura</b>'},empty);
   const feed=runtime.plan({cableAlimen2:'<svg onload="alert(1)">x</svg><em>Alimentación</em>'},empty);
   assert_(opening.updates.apertura==='<img src="https://cdn.example/a.png"><b>Apertura</b>');
   assert_(feed.updates.cableAlimen==="<em>Alimentación</em>");
  });
  run_(label+" rechaza campos enriquecidos mayores de 5000",function(){
   try{runtime.plan({notaImportante:"N".repeat(5001)},empty);throw Error("Debió fallar");}
   catch(e){assert_(e.code==="SUPPLEMENTARY_INVALID_PAYLOAD");}
  });
  run_(label+" acepta el límite de 5000 caracteres",function(){
   assert_(runtime.plan({notaImportante:"N".repeat(5000)},empty).updates.notaImportante.length===5000);
  });
  run_(label+" rechaza tipos no textuales para nota",function(){
   try{runtime.plan({notaImportante:{html:"<b>x</b>"}},empty);throw Error("Debió fallar");}
   catch(e){assert_(e.code==="SUPPLEMENTARY_INVALID_PAYLOAD");}
  });
  if(label==="WRITE"){
   run_(label+" persistencia verificada por campo",function(){const values={};const sheet={getRange:function(row,column){return {setValue:function(v){values[column]=v;},getValue:function(){return values[column]||"";}};}};runtime.persist(sheet,2,Array(10).fill(""),["A"].concat(Array(9).fill("")));assert_(values[33]==="A"&&Object.keys(values).length===1);});
   run_(label+" dos aportes concurrentes en campos distintos se conservan",function(){const values={33:"",34:""},base=Array(10).fill("");let nested=false;const sheet={getRange:function(row,column){return {setValue:function(v){values[column]=v;if(column===33&&!nested){nested=true;const other=base.slice();other[1]="B";runtime.persist(sheet,2,base,other);}},getValue:function(){return values[column];}};}};const first=base.slice();first[0]="A";runtime.persist(sheet,2,base,first);assert_(values[33]==="A"&&values[34]==="B");});
   run_(label+" fallo parcial no revierte otros campos",function(){let calls=0;const values={33:"old"};const sheet={getRange:function(row,column){return {setValue:function(v){calls++;if(column===33)throw Error("write");values[column]=v;},getValue:function(){return values[column]||"";}};}};try{runtime.persist(sheet,2,["old"].concat(Array(9).fill("")),["new"].concat(Array(9).fill("")));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_PERSISTENCE_FAILED"&&values[33]==="old"&&calls===1);}});
  }else{
   run_(label+" persistencia verificada",function(){let values=Array(10).fill("");const range={setValues:function(v){values=v[0].slice();},getValues:function(){return[values.slice()];}};runtime.persist({getRange:function(){return range;}},2,Array(10).fill(""),["A"].concat(Array(9).fill("")));assert_(values[0]==="A");});
   run_(label+" no restaura un snapshot anterior ante fallo de escritura",function(){let values=["old"].concat(Array(9).fill("")),calls=0;const range={setValues:function(v){calls++;values=v[0].slice();if(calls===1)throw Error("write");},getValues:function(){return[values.slice()];}};try{runtime.persist({getRange:function(){return range;}},2,["old"].concat(Array(9).fill("")),["new"].concat(Array(9).fill("")));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_PERSISTENCE_FAILED"&&values[0]==="new"&&calls===1);}});
  }
  run_(label+" la carga y persistencia suplementaria no retienen locks",function(){
   const p=source.indexOf("function handleAddSupplementaryInfo(payload"),q=source.indexOf("function handleAddSupplementaryInfoLocked",p),block=source.slice(p,q);
   if(label==="WRITE"){
    assert_(!/tryLock|waitLock|getWriteContributionLock_/.test(block));
    assert_(block.indexOf("prepareSupplementaryImageUploads_")<block.indexOf("handleAddSupplementaryInfoLocked"));
    const locked=source.slice(q,source.indexOf(String.fromCharCode(10)+"function ",q+10));
    assert_(!/uploadImageToDrive|findOrCreateVehicleFolder|DriveApp|tryLock|waitLock/.test(locked));
   }else assert_(block.includes("tryLock(0)")&&block.includes("finally")&&block.includes("releaseLock"));
  });
 });
 run_("WRITE procesa aportes sin lease ni dependencia de Coordinator",function(){const source=String(sources.write||"");assert_(source.includes("getAuthenticatedCollaborator"));assert_(!/withSharedMutationLease_|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/.test(source));});
 run_("WRITE no acepta el token legacy de SharedMutation en aportes",function(){assert_(!String(sources.write||"").includes("__sharedMutationToken"));});
 run_("UI no calcula slot desde item posiblemente obsoleto",function(){assert_(!String(sources.ui||"").includes("if (!item.cableAlimen)")&&String(sources.ui||"").includes("El servidor asigna el primer par"));});

 const authStart=String(sources.write).indexOf("function getAuthenticatedCollaborator(");
 const authEnd=String(sources.write).indexOf(String.fromCharCode(10)+"}",authStart)+2;
 const authSource=String(sources.write).slice(authStart,authEnd<0?undefined:authEnd);
 const getAuth=new Function(authSource+";return getAuthenticatedCollaborator;")();
 const allowedSupplementaryRoles=["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"];
 const payloadFor=(role,extra={})=>({userId:"user-1",sessionToken:"token-1",colaborador:"Nombre falso",userRole:"Desarrollador",
  __sharedSessionActor:{userId:"user-1",role:String(role).toLowerCase(),fullName:"Nombre Servidor",epoch:1},...extra});
 run_("WRITE exige actor compartido y rechaza payload sin actor",function(){
  let rejected=false;try{getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles);}catch(e){rejected=/contexto de sesión compartido/.test(e.message);}
  assert_(rejected);
 });
 run_("WRITE rechaza identidad solicitada distinta al actor",function(){
  let rejected=false;try{getAuth(payloadFor("Tecnico",{userId:"user-2"}),allowedSupplementaryRoles);}catch(e){rejected=/contexto compartido/.test(e.message);}
  assert_(rejected);
 });
 run_("WRITE rechaza actor con epoch inválido o rol desconocido",function(){
  for(const actor of [{userId:"user-1",role:"tecnico",fullName:"Nombre",epoch:0},{userId:"user-1",role:"Gefe",fullName:"Nombre",epoch:1}]){
   let rejected=false;try{getAuth({userId:"user-1",__sharedSessionActor:actor},allowedSupplementaryRoles);}catch(_){rejected=true;}
   assert_(rejected);
  }
 });
 run_("WRITE rechaza roles fuera de la política suplementaria",function(){
  let rejected=false;try{getAuth(payloadFor("lector"),allowedSupplementaryRoles);}catch(e){rejected=/contexto compartido/.test(e.message);}
  assert_(rejected);
 });
 run_("WRITE acepta los cinco roles operativos del actor central",function(){
  allowedSupplementaryRoles.forEach(role=>assert_(getAuth(payloadFor(role),allowedSupplementaryRoles)==="Nombre Servidor"));
 });
 run_("WRITE no confía en colaborador ni rol falsificados por el cliente",function(){
  assert_(getAuth(payloadFor("Tecnico"),allowedSupplementaryRoles)==="Nombre Servidor");
 });
 run_("WRITE helper no consulta Users ni ActiveSessions",function(){
  assert_(!/getSpreadsheet|ActiveSessions|Users|findUniqueRowsByExactValue_|getSessionExpirationStatus_|touchSessionActivityIfDue_/.test(authSource));
 });
 run_("Handler suplementario autentica antes de cargar y no retiene locks",function(){
  const p=String(sources.write).indexOf("function handleAddSupplementaryInfo(payload)"),q=String(sources.write).indexOf("function handleAddSupplementaryInfoLocked",p),end=String(sources.write).indexOf(String.fromCharCode(10)+"function ",q+10),outer=String(sources.write).slice(p,q),inner=String(sources.write).slice(q,end>0?end:undefined);
  assert_(outer.indexOf("getAuthenticatedCollaborator")<outer.indexOf("prepareSupplementaryImageUploads_"));
  assert_(!/tryLock\(|waitLock\(|getWriteContributionLock_\(/.test(outer));
  assert_(inner.includes("buildSupplementaryInfoPlan_")&&inner.includes("persistSupplementaryInfoValues_")&&inner.includes("Logger.log(")&&inner.includes("actorName"));
  assert_(!/uploadImageToDrive|findOrCreateVehicleFolder|DriveApp/.test(inner));
 });


 run_("WRITE valida el ledger de aportes una sola vez y reutiliza el handle",function(){
  const start=String(sources.write).indexOf("function handleAddSupplementaryInfo(payload)");
  const end=String(sources.write).indexOf("function handleAddSupplementaryInfoLocked",start);
  const handler=String(sources.write).slice(start,end);
  const calls=handler.match(/getVehicleContributionLedgerSheet_\(spreadsheet\)/g)||[];
  assert_(calls.length===1,"El ledger se vuelve a validar/leer durante la misma operación.");
  assert_(handler.indexOf("getVehicleContributionLedgerSheet_(spreadsheet)")<handler.indexOf("prepareSupplementaryImageUploads_"));
  assert_(handler.includes("const appendLedgerSheet = contributionLedgerSheet;"));
 });

 run_("WRITE marca las imágenes suplementarias como linked solo después de persistir",function(){
  const outer=String(sources.write).slice(String(sources.write).indexOf("function handleAddSupplementaryInfo(payload)"),String(sources.write).indexOf("function handleAddSupplementaryInfoLocked"));
  assert_(outer.indexOf("appendVehicleContributionEvent_")<outer.indexOf("uploadedUrls.forEach"));
  assert_(outer.includes("markImageUploadLinked(url, { shortLedgerLock: true })"));
  assert_(outer.includes("pendiente de reconciliación"));
  assert_(outer.includes("handleAddSupplementaryInfoLocked"),"La ruta legacy de notas sigue disponible.");
 });
 run_("WRITE cargas de imagen usan journal append-only sin ScriptLock",function(){
  const upload=String(sources.write).slice(String(sources.write).indexOf("function uploadImageToDriveWithShortLedgerLocks_"),String(sources.write).indexOf("function uploadImageToDrive("));
  assert_(upload.includes("getOrCreateImageUploadEventsSheet_")&&upload.includes("appendImageUploadEventRequired_"));
  assert_(upload.includes("findImageUploadEventsByOperationKey_"));
  assert_(!/withImageUploadLedgerLock_|getOrCreateImageUploadLedgerSheet_|saveImageUploadLedgerRecord_|upload_in_progress/.test(upload));
  assert_(upload.indexOf('appendImageUploadEventRequired_(eventsSheet, expected, "reserved"')<upload.indexOf("folder.createFile"));
  assert_(upload.includes('appendImageUploadEventRequired_(eventsSheet, expected, "pending"'));
  const linked=String(sources.write).slice(String(sources.write).indexOf("function markImageUploadLinkedWithShortLedgerLock_"),String(sources.write).indexOf("function markImageUploadLinked(imageUrl"));
  assert_(linked.includes("getImageUploadReferences_")&&linked.includes("appendImageUploadEventRequired_"));
  assert_(!/withImageUploadLedgerLock_|getOrCreateImageUploadLedgerSheet_|saveImageUploadLedgerRecord_/.test(linked));
  assert_(linked.indexOf('appendImageUploadEventRequired_(eventsSheet, expected, "linked"')<linked.indexOf("file.setDescription"));
 });

 run_("WRITE vinculación reutiliza evento pending confirmado y conserva lectura final",function(){
  const linked=String(sources.write).slice(String(sources.write).indexOf("function markImageUploadLinkedWithShortLedgerLock_"),String(sources.write).indexOf("function markImageUploadLinked(imageUrl"));
  const start=linked.indexOf('const pendingEvent = appendImageUploadEventRequired_(eventsSheet, expected, "pending"');
  const end=linked.indexOf("if (!projection || projection.state",start);
  assert_(start>=0&&end>start);
  const pending=linked.slice(start,end);
  assert_(pending.includes("events = events.concat([pendingEvent])"));
  assert_(!pending.includes("readImageUploadEventsByToken_"),"Se repite la lectura completa inmediatamente después del append.");
  assert_(linked.includes("const latest = projectImageUploadEvents_(readImageUploadEventsByToken_(eventsSheet, expected.token))"),
    "Debe conservarse la lectura final después del evento linked.");
 });

 run_("WRITE reintento suplementario conserva la clave estable por opId/vehículo/campo",function(){
  const prepare=String(sources.write).slice(String(sources.write).indexOf("function prepareSupplementaryImageUploads_"),String(sources.write).indexOf("function handleAddSupplementaryInfo(payload)"));
  assert_(prepare.includes('buildImageUploadOperationKey(payload.opId, payload.vehicleId, field)'));
  assert_(prepare.includes('buildCanonicalImageBaseName(vehicle, field)'));
  assert_(prepare.includes('buildImageUploadOperationKey(payload.opId, payload.vehicleId, field)'));
 });

 run_("WRITE reserva imagen y reutiliza el evento confirmado sin releer el ledger",function(){
  const upload=String(sources.write).slice(String(sources.write).indexOf("function uploadImageToDriveWithShortLedgerLocks_"),String(sources.write).indexOf("function uploadImageToDrive("));
  const start=upload.indexOf('const reservedEvent = appendImageUploadEventRequired_(eventsSheet, expected, "reserved"');
  const end=upload.indexOf("let file = null",start);
  assert_(start>=0&&end>start);
  const reservation=upload.slice(start,end);
  assert_(reservation.includes("events = [reservedEvent]"));
  assert_(reservation.includes("projectImageUploadEvents_(events)"));
  assert_(!reservation.includes("readImageUploadEventsByToken_"),"Se repite la lectura completa tras confirmar el append.");
  assert_(upload.indexOf("appendImageUploadEventRequired_(eventsSheet, expected, \"reserved\"")<upload.indexOf("folder.createFile(blob)"));
 });

 run_("WRITE rechaza contenido distinto para una operationKey antes de crear otro archivo",function(){
  const upload=String(sources.write).slice(String(sources.write).indexOf("function uploadImageToDriveWithShortLedgerLocks_"),String(sources.write).indexOf("function uploadImageToDrive("));
  const conflict=upload.indexOf("operationEvents.some(entry => String(entry.values[1] || \"\").trim() !== token)");
  const create=upload.indexOf("folder.createFile(blob)");
  assert_(conflict>=0&&create>conflict);
  assert_(upload.indexOf("throw new Error(\"El opId/campo ya está asociado a otro contenido")>conflict);
 });
 run_("WRITE reintento reutiliza fileId proyectado o archivo temporal antes de crear",function(){
  const upload=String(sources.write).slice(String(sources.write).indexOf("function uploadImageToDriveWithShortLedgerLocks_"),String(sources.write).indexOf("function uploadImageToDrive("));
  const recorded=upload.indexOf("if (projection && projection.fileId)");
  const lookup=upload.indexOf("findExistingImageUpload(folder, temporaryFilename, expected, token)");
  const create=upload.indexOf("folder.createFile(blob)");
  assert_(recorded>=0&&lookup>recorded&&create>lookup);
  assert_(upload.includes("verifyImageUploadFile_(file, folder, expected)"));
 });

 return {passed:passed,failed:failed,results:results};
}