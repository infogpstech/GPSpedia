import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"Services/admin.js"),"utf8");
function extract(name){
 const start=admin.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const next=admin.indexOf("\nfunction ",start+10);return admin.slice(start,next<0?admin.length:next);
}
function sheet(rows,formulas=[]){
 let writes=0;
 return {
  getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(r=>r.length)),
  getRange:(row,col,nr=1,nc=1)=>({
   getValues:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
   getFormulas:()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>formulas[row-1+r]?.[col-1+c]??"")),
   getValue:()=>rows[row-1]?.[col-1]??""
  }),
  get writes(){return writes;}
 };
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
function generator(sheetValue,storedValue=null){
 let stored=storedValue;
 const fn=new Function("PropertiesService","LOGOS_MARCA_ID_COUNTER_PROPERTY",extract("getNextLogoIdLocked_")+"\nreturn getNextLogoIdLocked_;")(
  {getScriptProperties:()=>({getProperty:()=>stored,setProperty:(key,value)=>{stored=value;}})},
  "LOGOS_MARCA_ID_COUNTER"
 );
 return {next:()=>fn(sheetValue),stored:()=>stored};
}
test("Asigna ID numérico posterior al máximo histórico y contador central",()=>{
 const h=generator(sheet([["id","nombre","url","marca"],[1,"A","u","A"],[3,"B","u","B"]]),2);
 assert.equal(h.next(),4);assert.equal(h.stored(),"4");
});
test("Respeta contador central cuando está adelantado a la hoja",()=>{
 const h=generator(sheet([["id","nombre"],[2,"A"]]),8);assert.equal(h.next(),9);
});
test("Rechaza IDs duplicados aunque uno tenga ceros a la izquierda",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"],["001","B"]]));assert.throws(()=>h.next(),/duplicado/);
});
test("Rechaza IDs malformados y filas con datos sin ID",()=>{
 assert.throws(()=>generator(sheet([["id","nombre"],["X-1","A"]])).next(),/entero positivo/);
 assert.throws(()=>generator(sheet([["id","nombre"],["","A"]])).next(),/no tiene ID/);
});
test("Ignora filas plantilla vacías con fórmula histórica",()=>{
 const h=generator(sheet([["id","nombre"],[1,"A"],["",""]],[["id"],["=ROW()-1"],["=ROW()-1"]]));assert.equal(h.next(),2);
});
test("handleAddLogo escribe el ID como valor y elimina la espera de fórmula",()=>{
 const fn=extract("handleAddLogo");assert.match(fn,/getNextLogoIdLocked_\(sheet\)/);assert.match(fn,/getRange\(newRow, 1\)\.setValue\(newId\)/);
 assert.doesNotMatch(fn,/setFormula|Utilities\.sleep/);
});
console.log("LogoIdIntegrity: "+passed+"/"+passed+" PASS");
