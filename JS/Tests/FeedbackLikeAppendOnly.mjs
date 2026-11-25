import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const catalog=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
function extract(source,name){const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);const end=source.indexOf("\nfunction ",start+10);return source.slice(start,end<0?source.length:end);}
const handler=extract(feedback,"handleRecordLike");
assert.match(handler,/ledger\.appendRow\(\[actorKey, vehicleId, corteIndex, 0, 0, "event"/);
assert.match(handler,/withFeedbackLikeLock_\(\(\) =>/,"La comprobación y el append deben ser una sola sección crítica.");
assert.doesNotMatch(handler,/setValue\(/,"Los útiles nuevos no modifican el contador físico.");
assert.doesNotMatch(handler,/message:/,"La respuesta idempotente no debe mostrar mensajes de útil duplicado.");
assert.match(extract(feedback,"ensureFeedbackLikesSheet_"),/catch \(createError\)/,"La creación concurrente de la hoja debe recuperarse por relectura");
assert.match(extract(catalog,"handleGetCatalogData"),/readFeedbackLikeEventCounts_/,"CATALOG debe proyectar los likes nuevos");
assert.match(extract(feedback,"buildFeedbackCortesCatalogChange_"),/getFeedbackLikeEventCount_/,"El feed incremental debe incluir eventos de likes");
assert.match(extract(feedback,"getFeedbackLikeEventCount_"),/firstCutByActor/,"El contador debe deduplicar por usuario y vehículo.");
const helperStart=feedback.indexOf("const FEEDBACK_CATALOG_PYS_CHANGE_ACTIONS_");
const helperEnd=feedback.indexOf("\nfunction doGet(e)",helperStart);
const attachFeedbackCatalogChange_=new Function(feedback.slice(helperStart,helperEnd)+"\nreturn attachFeedbackCatalogChange_;")();
const likeDelta=attachFeedbackCatalogChange_("recordLike",{vehicleId:"100"},{status:"success",alreadyLiked:false});
const duplicateLike=attachFeedbackCatalogChange_("recordLike",{vehicleId:"100"},{status:"success",alreadyLiked:true});
assert.deepEqual(likeDelta.catalogChange,{collection:"cortes",recordId:"100",operation:"upsert"});
assert.equal(duplicateLike.catalogChange,undefined);
assert.match(feedback,/response = attachFeedbackCatalogChange_\(action, payload, response\)/);
assert.doesNotMatch(feedback,/publishSharedCatalogChange_/, "FEEDBACK no debe llamar a Coordinator para publicar likes.");
const helper=extract(catalog,"normalizeFeedbackLikeActorKey_")+"\n"+extract(catalog,"readFeedbackLikeEventCounts_");
const code=helper+"\nreturn readFeedbackLikeEventCounts_;";
const readCounts=new Function("getSpreadsheet",code)(()=>{throw new Error("No debe resolver spreadsheet global si se pasa argumento");});
const headers=["actorKey","vehicleId","corteIndex","previousCount","targetCount","status","createdAt"];
const rows=[
 ["user:1","100","1",0,0,"event","t1"],
 ["user:1","100","1",0,0,"event","t2"],
 ["user:2","100","1",0,0,"event","t3"],
 ["user:1","100","2",0,0,"event","t4"],
 ["user:3","100","1",0,1,"completed","t5"],
 ["user:4","200","1",0,0,"event","t6"]
];
const sheet={getLastRow:()=>rows.length+1,getRange(r,c,h,w){return{getValues(){if(r===1)return[headers];return rows.slice(r-2,r-2+h).map(row=>row.slice(c-1,c-1+w));}};}};
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("deduplica por usuario y vehículo aunque existan filas repetidas o cortes distintos",()=>{
 const result=readCounts({getSheetByName:()=>sheet});
 assert.equal(result.get("100|1"),2);assert.equal(result.get("100|2") || 0,0);assert.equal(result.get("200|1"),1);
});
test("ignora likes legacy completed porque ya están en el contador base",()=>{
 const result=readCounts({getSheetByName:()=>sheet});assert.equal(result.get("100|1"),2);
});
test("ignora eventos históricos inválidos sin interrumpir la proyección",()=>{
 const bad=rows.concat([
  ["", "100","1",0,0,"event","t7"],
  ["user:5", "100","9",0,0,"event","t8"],
  ["user:6", "not-a-vehicle","1",0,0,"event","t9"]
 ]);
 const badSheet={getLastRow:()=>bad.length+1,getRange(r,c,h,w){return{getValues(){return r===1?[headers]:bad.slice(r-2,r-2+h).map(row=>row.slice(c-1,c-1+w));}};}};
 const result=readCounts({getSheetByName:()=>badSheet});
 assert.equal(result.get("100|1"),2,"Los votos válidos conservan su conteo.");
 assert.equal(result.get("200|1"),1,"Los eventos de otros vehículos siguen proyectándose.");
 assert.equal(result.get("100|2") || 0,0,"Los eventos inválidos no se atribuyen a un corte.");
 assert.equal(result.has("not-a-vehicle|1"),false);
});
test("el contrato de likes nuevos serializa la comprobación y el append",()=>{assert.ok(handler.includes('"event"'));assert.match(handler,/withFeedbackLikeLock_/);assert.match(extract(feedback,"withFeedbackLikeLock_"),/tryLock\(0\)/);assert.match(extract(feedback,"withFeedbackLikeLock_"),/finally[\s\S]*releaseLock/);});
console.log("FeedbackLikeAppendOnly: "+passed+"/"+passed+" PASS");
