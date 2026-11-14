import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const users=fs.readFileSync(resolve(root,"Services/users.js"),"utf8");
function extract(name){
 const start=users.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const next=users.indexOf("\nfunction ",start+10);return users.slice(start,next<0?users.length:next);
}
function sheet(rows){
 return {getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(row=>row.length)),
  getRange:(row,col,count,width)=>({getValues:()=>Array.from({length:count},(_,r)=>Array.from({length:width},(_,c)=>rows[row-1+r]?.[col-1+c]??""))})};
}
const generate=new Function("COLS_USERS",extract("generateNextUserId_")+"\nreturn generateNextUserId_;")(
 {ID:1,SessionToken:8}
);
const checks=[];
function test(name,fn){fn();checks.push(name);console.log("PASS "+name);}
test("Genera el siguiente ID secuencial con formato USR-####",()=>{
 assert.equal(generate(sheet([["ID","User","Password","Role"],["USR-0001","a","x","Tecnico"],["USR-0002","b","x","Tecnico"]])), "USR-0003");
});
test("Detecta IDs duplicados aunque difieran en mayúsculas",()=>{
 assert.throws(()=>generate(sheet([["ID","User"],["USR-0001","a"],["usr-0001","b"]])),/duplicado/);
});
test("Rechaza una fila de cuenta sin identificador",()=>{
 assert.throws(()=>generate(sheet([["ID","User"],["","a"]])),/sin ID/);
});
test("No confunde filas plantilla vacías con cuentas existentes",()=>{
 assert.equal(generate(sheet([["ID","User"],["USR-0099",""],["USR-0004","cuenta"]])), "USR-0005");
});
console.log("UserIdGenerator: "+checks.length+"/"+checks.length+" PASS");
