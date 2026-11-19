import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=source.indexOf("function findVinDuplicateForAdmin("),end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró findVinDuplicateForAdmin");
const code=source.slice(start,end);
assert.doesNotMatch(code,/getLastColumn\(\)/,"No debe leer el ancho completo de Cortes");
let headerReads=0;
const fn=new Function("COLS_CORTES","getVinColumnIndex","parseVinCollectionForAdmin",code+"\nreturn findVinDuplicateForAdmin;")({
 id:1,marca:3,modelo:4,anoDesde:6,anoHasta:7
 },()=>{headerReads++;return 9;},value=>String(value||"").split(",").map(x=>x.trim()).filter(Boolean));
const calls=[];
const rows={
 "2,1,3,4":[["11","cat","Toyota","Hilux"],["12","cat","Nissan","Frontier"],["13","cat","Ford","Ranger"]],
 "2,6,3,2":[[2018,2020],[2021,2023],[2019,2022]],
 "2,9,3,1":[["VIN-A"],["VIN-B"],["VIN-A"]]
};
const sheet={getLastRow:()=>4,getRange:(...args)=>{calls.push(args);return{getValues:()=>rows[args.join(",")]};}};
assert.deepEqual(fn(sheet,"VIN-A",null,9),{vehicleId:"11",modelName:"Toyota Hilux (2018-2020)"});
assert.equal(headerReads,0,"El índice VIN ya resuelto debe reutilizarse sin volver a leer encabezados");
assert.deepEqual(calls,[[2,1,3,4],[2,6,3,2],[2,9,3,1]],"Solo debe leer identidad, años y VIN");
calls.length=0;
assert.deepEqual(fn(sheet,"VIN-A","11"),{vehicleId:"13",modelName:"Ford Ranger (2019-2022)"});
assert.equal(headerReads,1,"Sin override se conserva la resolución compatible del encabezado");
assert.deepEqual(calls,[[2,1,3,4],[2,6,3,2],[2,9,3,1]]);
assert.equal(fn(sheet,"VIN-Z",null),null);
assert.throws(()=>new Function("COLS_CORTES","getVinColumnIndex","parseVinCollectionForAdmin",code+"\nreturn findVinDuplicateForAdmin;")(
 {id:1,marca:3,modelo:4,anoDesde:6,anoHasta:7},()=>0,()=>[]
)({getLastRow:()=>2},"VIN-A",null),/no contiene el encabezado/);
assert.equal(fn({getLastRow:()=>1},"VIN-A",null),null);
assert.ok(source.includes("findVinDuplicateForAdmin(sheet, vinPrefix, vehicleId, vinColumnIndex)"),"Debe reutilizar índice en preparación");
assert.ok(source.includes("findVinDuplicateForAdmin(sheet, vinPrefix, null, vinColumnIndex)"),"Debe reutilizar índice en alta nueva");
assert.ok(source.includes("prepareAdminVinCollectionEdit_(sheet, rowValues, vehicleId, rawValue, vinColumnIndex)"),"Debe reutilizar índice en edición");
assert.ok(source.includes("findVinDuplicateForAdmin(sheet, next, vehicleId, resolvedVinColumnIndex)"),"La edición de colección debe reutilizar el índice resuelto en sus validaciones");

console.log("AdminVinDuplicateBoundedRead: 11/11 PASS — lectura selectiva, exclusión del vehículo actual y VIN duplicado");
