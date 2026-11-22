import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const write = read("Services/write.js"), offline = read("Frontend/offline.js"), form = read("../HTML/add_cortes.html");
function extract(source, marker) {
 const start=source.indexOf(marker);assert.ok(start>=0,"No se encontró "+marker);
 let i=source.indexOf("{",start),depth=0,quote="",escape=false,line=false,block=false;
 for(;i<source.length;i++){const c=source[i],n=source[i+1];
  if(line){if(c==="\n")line=false;continue;}
  if(block){if(c==="*"&&n==="/"){block=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==="\\")escape=true;else if(c===quote)quote="";continue;}
  if(c==="/"&&n==="/"){line=true;i++;continue;}if(c==="/"&&n==="*"){block=true;i++;continue;}
  if(c==="'"||c==='"'||c==="`"){quote=c;continue;}
  if(c==="{")depth++;else if(c==="}"&&--depth===0)return source.slice(start,i+1);
 }
 throw new Error("Bloque sin cierre: "+marker);
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("WRITE admite contributionOpIds sin abrir campos arbitrarios",()=>{
 const block=extract(write,"function assertSupplementaryInfoPayloadKeys_");
 assert.match(block,/"contributionOpIds"/);assert.match(block,/unexpected=keys\.filter/);
});
test("WRITE registra apertura y alimentación con IDs distintos y conserva nota",()=>{
 const handler=extract(write,"function handleAddSupplementaryInfo(payload");
 assert.match(handler,/payload\.contributionOpIds !== undefined/);
 assert.match(handler,/new Set\(all\)\.size!==all\.length/);
 assert.match(handler,/kind:"opening"/);assert.match(handler,/kind:"feed"/);
 assert.match(handler,/handleAddSupplementaryInfoLocked\(/);
 assert.match(handler,/payload\.__sharedSessionActor&&payload\.__sharedSessionActor\.userId/);
});
test("WRITE conserva actor confiable y fecha de servidor en el ledger",()=>{
 const append=extract(write,"function appendVehicleContributionEvent_");
 assert.match(append,/new Date\(\)\.toISOString\(\)/);
 assert.match(append,/options\.actorId/);assert.match(append,/options\.actorName/);
});
test("WRITE resuelve el slot de alimentación considerando catálogo y ledger",()=>{
 const helper=extract(write,"function getVehicleContributionFeedSlotIndex_");
 const fn=new Function(helper+";return getVehicleContributionFeedSlotIndex_;")();
 const snapshot={vehicle:{id:"101",cableAlimen:"12V",imgCableAlimen:"",cableAlimen2:"",imgCableAlimen2:"",cableAlimen3:"",imgCableAlimen3:""}};
 const rows=[["EV-FEED-2","OP-FEED-2","101","a".repeat(64),"feed",'{"text":"24V","image":""}',"U1","Técnico","2026-11-22T00:00:00.000Z","accepted",""]];
 assert.equal(fn(snapshot,"EV-FEED-2",rows),2);
});
test("IndexedDB acepta snapshot suplementario válido y rechaza IDs repetidos o credenciales",()=>{
 const validator=extract(offline,"function isValidAddCutOperationSnapshot_");
 const fn=new Function(validator+";return isValidAddCutOperationSnapshot_;")();
 const base={id:"OP-MAIN-1",ownerId:"U1",operationType:"addSupplementaryInfo",stage:3,status:"processing",operationHash:"a".repeat(64),vehicleId:"101",
  requestData:{vehicleId:"101",opId:"OP-MAIN-1",apertura:"IGN",notaImportante:"",contributionOpIds:{opening:"OP-OPEN-1"}}};
 assert.equal(fn(base,"U1"),true);
 assert.equal(fn({...base,requestData:{...base.requestData,contributionOpIds:{opening:"OP-MAIN-1"}}},"U1"),false);
 assert.equal(fn({...base,requestData:{...base.requestData,sessionToken:"secret"}},"U1"),false);
});
test("formulario conserva la operación y sus IDs durante reintentos y recuperación",()=>{
 assert.match(form,/getOrCreateSupplementaryOperation_/);
 assert.match(form,/saveAddCutOperationPendingOperation\(snapshot\)/);
 assert.match(form,/removeAddCutOperationPendingOperation\(pending\.ownerId,pending\.id,pending\.operationHash\)/);
 assert.match(form,/SUPPLEMENTARY_RECOVERY_EVENT_UNCONFIRMED/);
 assert.match(form,/routeAction\('addSupplementaryInfo',request\)/);
});
test("imagen de alimentación usa el campo correspondiente al slot 2 o 3",()=>{
 assert.match(write,/field==="cableAlimen2"\?"imgCableAlimen2":field==="cableAlimen3"\?"imgCableAlimen3"/);
});
console.log("AddSupplementaryOperationRecovery: "+passed+"/"+passed+" PASS");
