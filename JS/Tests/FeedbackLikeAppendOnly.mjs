import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const feedback=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const catalog=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
function extract(source,name){const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);const end=source.indexOf("\nfunction ",start+10);return source.slice(start,end<0?source.length:end);}
const handler=extract(feedback,"handleRecordLike");
assert.match(handler,/findLikeEventReplayNoop_/);
assert.match(handler,/eventLedger\.appendRow\(\[actorKey, vehicleId, corteIndex, 0, 0, "event"/);
assert.ok(handler.indexOf('eventLedger.appendRow')<handler.indexOf('LockService.getScriptLock'),"Los likes nuevos deben anexarse antes de cualquier lock heredado");
const eventPath=handler.slice(handler.indexOf("const eventReplay"),handler.indexOf("let activityLogRequest"));
assert.doesNotMatch(eventPath,/LockService|setValue\(/);
assert.match(extract(feedback,"ensureFeedbackLikesSheet_"),/catch \(createError\)/,"La creación concurrente de la hoja debe recuperarse por relectura");
assert.doesNotMatch(extract(feedback,"findLikeEventReplayNoop_"),/LockService|setValue\(/);
assert.match(extract(catalog,"handleGetCatalogData"),/readFeedbackLikeEventCounts_/,"CATALOG debe proyectar los likes nuevos");
assert.match(extract(feedback,"buildFeedbackCortesCatalogChange_"),/getFeedbackLikeEventCount_/,"El feed incremental debe incluir eventos de likes");
assert.match(extract(feedback,"findCompletedLikeReplayNoop_"),/getFeedbackLikeEventCount_/,"El replay legacy debe devolver el contador efectivo");
const helper=extract(catalog,"readFeedbackLikeEventCounts_");
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
test("deduplica actores y separa vehículo/corte",()=>{
 const result=readCounts({getSheetByName:()=>sheet});
 assert.equal(result.get("100|1"),2);assert.equal(result.get("100|2"),1);assert.equal(result.get("200|1"),1);
});
test("ignora likes legacy completed porque ya están en el contador base",()=>{
 const result=readCounts({getSheetByName:()=>sheet});assert.equal(result.get("100|1"),2);
});
test("rechaza eventos con actor o vehículo inválido",()=>{
 const bad=rows.concat([["", "100","1",0,0,"event","t7"]]);
 const badSheet={getLastRow:()=>bad.length+1,getRange(r,c,h,w){return{getValues(){return r===1?[headers]:bad.slice(r-2,r-2+h).map(row=>row.slice(c-1,c-1+w));}};}};
 assert.throws(()=>readCounts({getSheetByName:()=>badSheet}),/evento de like inválido/);
});
test("el contrato de likes nuevos es append-only y sin lock",()=>{assert.ok(eventPath.includes('"event"'));assert.ok(handler.indexOf("eventLedger.appendRow")<handler.indexOf("LockService.getScriptLock"));});
console.log("FeedbackLikeAppendOnly: "+passed+"/"+passed+" PASS");
