import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const users=fs.readFileSync(resolve(root,"JS/Services/users.js"),"utf8");
function extract(name){
 const start=users.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const next=users.indexOf("\nfunction ",start+10);return users.slice(start,next<0?users.length:next);
}
function sheet(rows,formulas=[]){
 return {getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(row=>row.length)),
  getRange:(row,col,count=1,width=1)=>({
   getValues:()=>Array.from({length:count},(_,r)=>Array.from({length:width},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
   getFormulas:()=>Array.from({length:count},(_,r)=>Array.from({length:width},(_,c)=>formulas[row-1+r]?.[col-1+c]??"")),
   getValue:()=>rows[row-1]?.[col-1]??""
  })};
}
let spreadsheet={getSheetByName:()=>null};
const generate=new Function("COLS_USERS","getSpreadsheet",
 extract("parseUserIdSequenceFormula_")+"\n"+
 extract("getUserIdSequencePattern_")+"\n"+
 extract("generateNextUserId_")+"\nreturn generateNextUserId_;")(
 {ID:1,SessionToken:8},()=>spreadsheet
);
const checks=[];
function test(name,fn){fn();checks.push(name);console.log("PASS "+name);}
test("Genera el siguiente ID secuencial con formato USR-####",()=>{
 assert.equal(generate(sheet([["ID","User","Password","Role"],["USR-0001","a","x","Tecnico"],["USR-0002","b","x","Tecnico"]])), "USR-0003");
});
test("Conserva el prefijo y relleno de la fórmula histórica antes de migrarla",()=>{
 const formula='="U-"&TEXTO(FILA()-1,"000")';
 assert.equal(generate(sheet([["ID","User"],["U-001","a"],["U-002","b"]],[["ID"],[formula],[formula]])),"U-003");
});
test("Conserva el formato guardado en la configuración después de congelar fórmulas",()=>{
 const formula='="U-"&TEXTO(FILA()-1,"000")';
 const config=sheet([
  ["sheet","column","header","prefix","padding","formula","updatedAt"],
  ["Users",1,"ID","U-",3,formula,"2026-11-15"]
 ]);
 spreadsheet={getSheetByName:name=>name==="__IdentifierSequenceConfig__"?config:null};
 assert.equal(generate(sheet([["ID","User"],["U-008","a"],["U-009","b"]])),"U-010");
 spreadsheet={getSheetByName:()=>null};
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
