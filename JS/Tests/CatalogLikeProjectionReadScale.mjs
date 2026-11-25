import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
const start=source.indexOf("function readFeedbackLikeEventCounts_("),end=source.indexOf("\nfunction tutorialEditFieldsHash_",start);
assert.ok(start>=0&&end>start,"No se encontró la proyección de útiles.");
const code=source.slice(start,end);
const headers=["actorKey","vehicleId","corteIndex","previousCount","targetCount","status","createdAt"];
const rows=[
 ["actorA","100","1",0,0,"event","x"],
 ["actorA","100","1",0,0,"event","y"],
 ["actorB","100","1",0,0,"event","z"],
 ["actorA","100","2",0,0,"event","q"],
 ["actorB","100","3",0,0,"completed","r"]
];
const calls=[];
const sheet={getLastRow:()=>rows.length+1,getRange(row,col,n=1,width=1){calls.push({row,col,n,width});const all=[headers,...rows];return {getValues:()=>all.slice(row-1,row-1+n).map(r=>r.slice(col-1,col-1+width))};}};
const counts=new Function("getSpreadsheet","normalizeFeedbackLikeActorKey_",code+"\nreturn readFeedbackLikeEventCounts_;")(()=>({getSheetByName:()=>sheet}),key=>String(key));
const result=counts();
assert.equal(result.get("100|1"),2);
assert.equal(result.get("100|2"),1);
assert.equal(result.has("100|3"),false);
assert.deepEqual(calls.filter(c=>c.row>1).map(c=>c.width),[3,1],"Solo se transfieren tres columnas de identidad y una de estado.");
assert.ok(!calls.some(c=>c.row>1&&c.width===7),"No se debe leer la fila completa de siete columnas.");
console.log("CatalogLikeProjectionReadScale: 6/6 PASS — lectura compacta A:C + F y deduplicación actor/corte");
