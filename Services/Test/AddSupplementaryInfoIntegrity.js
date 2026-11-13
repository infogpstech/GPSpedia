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
  run_(label+" persistencia verificada",function(){let values=Array(10).fill("");const range={setValues:function(v){values=v[0].slice();},getValues:function(){return[values.slice()];}};runtime.persist({getRange:function(){return range;}},2,Array(10).fill(""),["A"].concat(Array(9).fill("")));assert_(values[0]==="A");});
  run_(label+" rollback ante fallo de escritura",function(){let values=["old"].concat(Array(9).fill("")),calls=0;const range={setValues:function(v){calls++;values=v[0].slice();if(calls===1)throw Error("write");},getValues:function(){return[values.slice()];}};try{runtime.persist({getRange:function(){return range;}},2,["old"].concat(Array(9).fill("")),["new"].concat(Array(9).fill("")));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_PERSISTENCE_FAILED"&&values[0]==="old"&&calls===2);}});
  run_(label+" ScriptLock se libera en finally",function(){const p=source.indexOf("function handleAddSupplementaryInfo(payload"),q=source.indexOf("function handleAddSupplementaryInfoLocked",p),block=source.slice(p,q);assert_(block.includes("waitLock(30000)")&&block.includes("finally")&&block.includes("releaseLock"));});
 });
 run_("Coordinador cubre Cortes, Drive y ledger",function(){assert_(String(sources.coordinator||"").includes('addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_UPLOAD_LEDGER"] }'));});
 run_("UI no calcula slot desde item posiblemente obsoleto",function(){assert_(!String(sources.ui||"").includes("if (!item.cableAlimen)")&&String(sources.ui||"").includes("El servidor asigna el primer par"));});

 const authStart=String(sources.write).indexOf("function getAuthenticatedCollaborator(");
 const authEnd=String(sources.write).indexOf("\n// ============================================================================",authStart);
 const authSource=String(sources.write).slice(authStart,authEnd);
 const authNames={ACTIVE_SESSIONS:"ActiveSessions",USERS:"Users"};
 const authColsSessions={ActiveSessions:1,ID_Usuario:2};
 const authColsUsers={ID:1,Nombre_Usuario:2,Privilegios:3,Nombre_Completo:4,SessionToken:5};
 function authHarness(role,options){
  options=options||{};
  const now=new Date().toISOString();
  const session=["user-1","tecnico","token-1",options.expired?"expired":now,"",now];
  const user=["user-1",options.deleted?"__deleted__:tecnico":"tecnico","",role||"Tecnico","","","Nombre Servidor",options.revoked?"__role_revocation_pending__:pending":"token-1",""];
  const rows={ActiveSessions:[["userId","username","token","createdAt","logs","lastActivityAt"],session],Users:[["id","username","password","role","phone","email","fullName","session","terms"],user]};
  if(options.duplicate)rows.ActiveSessions.push(session.slice());
  const sheets={getSheetByName:name=>rows[name]?{getDataRange:()=>({getValues:()=>rows[name]})}:null};
  const getAuth=new Function("getSpreadsheet","SHEET_NAMES","COLS_ACTIVE_SESSIONS","COLS_USERS","ROLE_REVOCATION_SHARED_PREFIX","getSessionExpirationStatus_",authSource+";return getAuthenticatedCollaborator;")(
   ()=>sheets,authNames,{ActiveSessions:3,ID_Usuario:1},{ID:1,Nombre_Usuario:2,Privilegios:4,Nombre_Completo:7,SessionToken:8},"__role_revocation_pending__:",row=>({expired:row[3]==="expired"}));
  return {getAuth,rows};
 }
 const allowedSupplementaryRoles=["desarrollador","gefe","jefe","supervisor","tecnico","tecnico_exterior"];
 run_("WRITE exige sesión y rechaza payload sin token",function(){const h=authHarness("Tecnico");let rejected=false;try{h.getAuth({userId:"user-1"},allowedSupplementaryRoles);}catch(e){rejected=/sesión válida/.test(e.message);}assert_(rejected);});
 run_("WRITE rechaza token inválido o cruzado",function(){const h=authHarness("Tecnico");let rejected=false;try{h.getAuth({userId:"user-1",sessionToken:"otro"},allowedSupplementaryRoles);}catch(e){rejected=/sesión inválida/.test(e.message);}assert_(rejected);});
 run_("WRITE rechaza sesión duplicada o expirada",function(){[{"duplicate":true},{"expired":true}].forEach(options=>{const h=authHarness("Tecnico",options);let rejected=false;try{h.getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles);}catch(e){rejected=/sesión inválida/.test(e.message);}assert_(rejected);});});
 run_("WRITE rechaza sesión con revocación de rol pendiente",function(){const h=authHarness("Tecnico",{revoked:true});let rejected=false;try{h.getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles);}catch(e){rejected=/revocación de rol/.test(e.message);}assert_(rejected);});
 run_("WRITE rechaza roles fuera de la política suplementaria",function(){const h=authHarness("Lector");let rejected=false;try{h.getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles);}catch(e){rejected=/rol válido/.test(e.message)||/no puede agregar información suplementaria/.test(e.message);}assert_(rejected);});
 run_("WRITE acepta cada rol operativo permitido",function(){allowedSupplementaryRoles.forEach(role=>{const h=authHarness(role);assert_(h.getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles)==="Nombre Servidor");});});
 run_("WRITE deriva el actor del perfil y no del payload",function(){const h=authHarness("Tecnico");assert_(h.getAuth({userId:"user-1",sessionToken:"token-1",colaborador:"Administrador Falso"},allowedSupplementaryRoles)==="Nombre Servidor");});
 run_("WRITE bloquea cuentas eliminadas aunque conserven token",function(){const h=authHarness("Tecnico",{deleted:true});let rejected=false;try{h.getAuth({userId:"user-1",sessionToken:"token-1"},allowedSupplementaryRoles);}catch(e){rejected=/cuenta no está activa/.test(e.message);}assert_(rejected);});
 run_("Handler suplementario autentica antes y después del lock y registra actor servidor",function(){const p=String(sources.write).indexOf("function handleAddSupplementaryInfo(payload)"),q=String(sources.write).indexOf("function handleAddSupplementaryInfoLocked(payload)",p),end=String(sources.write).indexOf("\nfunction ",q+10),outer=String(sources.write).slice(p,q),inner=String(sources.write).slice(q,end>0?end:undefined);assert_(outer.includes("SUPPLEMENTARY_INFO_ALLOWED_ROLES_")&&outer.includes("getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)"));assert_(inner.includes("const actorName = getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_)")&&inner.includes("Logger.log(\"Información suplementaria guardada por \"+actorName"));});

 return {passed:passed,failed:failed,results:results};
}