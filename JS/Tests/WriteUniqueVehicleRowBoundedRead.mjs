import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const declarations=[...source.matchAll(/function findUniqueCortesVehicleRow_/g)];
assert.equal(declarations.length,1,"Debe existir una sola implementación efectiva de findUniqueCortesVehicleRow_");
const start=declarations[0].index;
const end=source.indexOf("\nfunction ",start+10);
const code=source.slice(start,end);
assert.doesNotMatch(code,/getDataRange\(/,"El localizador no debe cargar toda la hoja Cortes");
const normalize=(value,context)=>{
 const id=String(value==null?"":value).trim();
 if(!id||id.length>80||/[\u0000-\u001f\u007f]/.test(id))throw new Error(context+" vehicleId inválido");
 return id;
};
const blank=value=>value===null||value===undefined||String(value).trim()==="";
const fn=new Function("normalizeIdempotenciaVehicleId_","isBlankIdempotenciaValue_","COLS_CORTES",code+"\nreturn findUniqueCortesVehicleRow_;")(normalize,blank,{id:1});
function makeSheet(ids){
 const calls=[];
 const sheet={
  getLastRow:()=>ids.length+1,
  getLastColumn:()=>48,
  getDataRange(){throw new Error("getDataRange no debe utilizarse");},
  getRange(...args){
   calls.push(args);
   if(args.length===4&&args[0]===2&&args[1]===1&&args[2]===ids.length&&args[3]===1){
    return{getValues:()=>ids.map(id=>[id])};
   }
   if(args.length===4&&args[1]===1&&args[2]===1&&args[3]===48){
    const row=Array(48).fill("");
    row[0]=ids[args[0]-2];
    row[2]="Toyota";
    return{getValues:()=>[row]};
   }
   throw new Error("Rango inesperado: "+args.join(","));
  }
 };
 return{sheet,calls};
}
let passed=0;function test(name,fn){fn();passed++;}
test("lee solo la columna ID y luego la fila coincidente",()=>{
 const h=makeSheet(["10","20","30"]),result=fn(h.sheet,"20","OP-20");
 assert.equal(result.rowIndex,3);assert.equal(result.rowValues.length,48);assert.equal(result.rowValues[2],"Toyota");
 assert.deepEqual(h.calls,[[2,1,3,1],[3,1,1,48]]);
});
test("rechaza ID duplicado sin leer una fila completa",()=>{
 const h=makeSheet(["20","20","30"]);
 assert.throws(()=>fn(h.sheet,"20","OP-DUP"),/aparece en 2 filas/);
 assert.deepEqual(h.calls,[[2,1,3,1]]);
});
test("rechaza vehicleId inexistente",()=>{
 const h=makeSheet(["10","30"]);
 assert.throws(()=>fn(h.sheet,"20","OP-MISS"),/aparece en 0 filas/);
 assert.deepEqual(h.calls,[[2,1,2,1]]);
});
test("conserva validación de IDs corruptos en otras filas",()=>{
 const h=makeSheet(["10","bad\u0001","20"]);
 assert.throws(()=>fn(h.sheet,"20","OP-BAD"),/vehicleId inválido/);
 assert.deepEqual(h.calls,[[2,1,3,1]]);
});
test("hoja sin registros no genera lectura de rangos",()=>{
 const h=makeSheet([]);
 assert.throws(()=>fn(h.sheet,"20","OP-EMPTY"),/aparece en 0 filas/);
 assert.deepEqual(h.calls,[]);
});
test("rechaza hoja inexistente",()=>{
 assert.throws(()=>fn(null,"20","OP-NULL"),/No se encontró la hoja Cortes/);
});
console.log("WriteUniqueVehicleRowBoundedRead: "+passed+"/"+passed+" PASS — una declaración, columna ID, fila única y detección de corrupción");
