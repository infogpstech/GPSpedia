function runAddSupplementaryInfoIntegrityTests(sources) {
 const results=[];let passed=0,failed=0;
 function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
 function run_(name,fn){try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}}
 function buildRuntime(source){
  const start=source.indexOf("function createSupplementaryInfoError_"),end=source.indexOf("function handleAddSupplementaryInfo(payload",start);
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
  run_(label+" persistencia verificada",function(){let values=Array(10).fill("");const range={setValues:function(v){values=v[0].slice();},getValues:function(){return[values.slice()];}};runtime.persist({getRange:function(){return range;}},2,Array(10).fill(""),["A"].concat(Array(9).fill("")));assert_(values[0]==="A");});
  run_(label+" rollback ante fallo de escritura",function(){let values=["old"].concat(Array(9).fill("")),calls=0;const range={setValues:function(v){calls++;values=v[0].slice();if(calls===1)throw Error("write");},getValues:function(){return[values.slice()];}};try{runtime.persist({getRange:function(){return range;}},2,["old"].concat(Array(9).fill("")),["new"].concat(Array(9).fill("")));throw Error("Debió fallar");}catch(e){assert_(e.code==="SUPPLEMENTARY_PERSISTENCE_FAILED"&&values[0]==="old"&&calls===2);}});
  run_(label+" ScriptLock se libera en finally",function(){const p=source.indexOf("function handleAddSupplementaryInfo(payload"),q=source.indexOf("function handleAddSupplementaryInfoLocked",p),block=source.slice(p,q);assert_(block.includes("waitLock(30000)")&&block.includes("finally")&&block.includes("releaseLock"));});
 });
 run_("Coordinador cubre Cortes, Drive y ledger",function(){assert_(String(sources.coordinator||"").includes('addSupplementaryInfo: { read: identityRead, write: ["CORTES", "DRIVE", "IMAGE_UPLOAD_LEDGER"] }'));});
 run_("UI no calcula slot desde item posiblemente obsoleto",function(){assert_(!String(sources.ui||"").includes("if (!item.cableAlimen)")&&String(sources.ui||"").includes("El servidor asigna el primer par"));});
 return {passed:passed,failed:failed,results:results};
}