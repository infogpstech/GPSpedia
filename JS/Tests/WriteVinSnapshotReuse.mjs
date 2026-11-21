import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function extract(name){
 const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const end=source.indexOf("\nfunction ",start+10);return source.slice(start,end<0?source.length:end);
}
const check=extract("checkVinDuplicateInSheet");
const handler=extract("handleAddVinToVehicleLocked");
assert.match(check,/Array\.isArray\(rowsSnapshot\)[\s\S]*?\?\s*rowsSnapshot/);
assert.match(handler,/checkVinDuplicateInSheet\(sheet, prefix, vehicleId, data\)/);
const fn=new Function("getVinColumnIndex","parseVinCollection","COLS_CORTES",check+"\nreturn checkVinDuplicateInSheet;")(
 ()=>6,
 value=>{try{return JSON.parse(value||"[]");}catch(_){return[];}},
 {id:1,marca:2,modelo:3,anoDesde:4,anoHasta:5}
);
const prefix="1HGCM82633A";
const snapshot=[
 ["101","Toyota","Corolla","2020","2022",JSON.stringify(["OTHER"])],
 ["202","Honda","Civic","2018","2021",JSON.stringify([prefix])]
];
let reads=0;
const sheet={getLastRow:()=>3,getLastColumn:()=>6,getRange(){reads++;throw new Error("No debe releer Cortes con snapshot disponible.");}};
assert.deepEqual(fn(sheet,prefix,"101",snapshot),{
 vehicleId:"202",modelName:"Honda Civic (2018-2021)",vinPrefix:prefix
});
assert.equal(fn(sheet,prefix,"101",snapshot.slice(0,1)),null);
assert.equal(reads,0);
console.log("WriteVinSnapshotReuse: 8/8 PASS — VIN duplicate scan reuses the already-read Cortes snapshot");
