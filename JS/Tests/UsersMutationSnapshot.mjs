import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(resolve(root,"JS/Services/Auth.js"),"utf8");
function block(name){
 const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const next=source.indexOf("\nfunction ",start+10);
 return source.slice(start,next<0?source.length:next);
}
const create=block("handleCreateUser");
assert.equal([...create.matchAll(/readUsersMutationSnapshot_\(userSheet\)/g)].length,1);
assert.match(create,/snapshot\.rows\.map\(row => row\[COLS_USERS\.Nombre_Usuario - 1\]\)/);
assert.match(create,/findNextUserRow_\(userSheet, snapshot\)/);
assert.match(create,/generateNextUserId_\(userSheet, snapshot\)/);
assert.doesNotMatch(create,/getRange\(2, COLS_USERS\.Nombre_Usuario/);

const names=["parseUserIdSequenceFormula_","readUsersMutationSnapshot_","getUserIdSequencePattern_","generateNextUserId_","findNextUserRow_"];
const harness=new Function("COLS_USERS","getAuthUsersSpreadsheet_",names.map(block).join("\n")+
 "\nreturn {readUsersMutationSnapshot_,getUserIdSequencePattern_,generateNextUserId_,findNextUserRow_};")(
 {ID:1,Nombre_Usuario:2,SessionToken:8,TermsAcceptance:9},()=>({getSheetByName:()=>null})
);
const rows=[
 ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
 ["USR-0001","ana","hash","Tecnico","","","","",""],
 ["USR-0002","beto","hash","Tecnico","","","","",""],
 ["","","","","","","","",""]
];
const formulas=[
 ["","","","","","","","",""],
 ["","","","","","","","",""],
 ["","","","","","","","",""],
 ['="USR-"&TEXTO(FILA()-1,"0000")',"","","","","","","",""]
];
let rangeCalls=0, valuesReads=0, formulaReads=0;
const sheet={
 getLastRow:()=>4,getLastColumn:()=>9,
 getRange(row,col,count=1,width=1){
  rangeCalls++;
  return {
   getValues(){valuesReads++;return Array.from({length:count},(_,r)=>Array.from({length:width},(_,c)=>rows[row-1+r]?.[col-1+c]??""));},
   getFormulas(){formulaReads++;return Array.from({length:count},(_,r)=>Array.from({length:width},(_,c)=>formulas[row-1+r]?.[col-1+c]??""));},
   getValue(){return rows[row-1]?.[col-1]??"";}
  };
 }
};
const snapshot=harness.readUsersMutationSnapshot_(sheet);
assert.equal(rangeCalls,1,"La operación debe obtener un único rango de snapshot.");
assert.equal(valuesReads,1);
assert.equal(formulaReads,1);
assert.equal(harness.findNextUserRow_(sheet,snapshot),4,"Debe reutilizar la primera fila realmente vacía.");
assert.equal(harness.generateNextUserId_(sheet,snapshot),"USR-0003","Debe respetar la secuencia y fórmula del snapshot.");
assert.equal(rangeCalls,1,"La búsqueda de fila e ID no deben volver a leer rangos de Users.");
assert.equal(valuesReads,1);
assert.equal(formulaReads,1);
console.log("UsersMutationSnapshot: 10/10 PASS — una lectura de rango compartida para username, fila libre e ID");
