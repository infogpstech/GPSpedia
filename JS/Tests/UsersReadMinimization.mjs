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
const list=block("handleGetUsers");
assert.match(list,/getRange\(1, 1, lastRow, COLS_USERS\.Nombre_Completo\)/);
assert.doesNotMatch(list,/getDataRange\(\)/);
const verifier=block("getAuthUserActor_");
assert.match(verifier,/findUniqueRowsByExactValue_\(usersSheet, COLS_USERS\.ID, actor\.userId, true\)/);
const lookup=block("findUniqueRowsByExactValue_");
assert.match(lookup,/getRange\(rowIndex,column,1,1\)\.getValue\(\)/);
assert.doesNotMatch(lookup,/getLastColumn|getRange\(rowIndex,1,1,/);

const fn=new Function(lookup+"\nreturn findUniqueRowsByExactValue_;")();
let ranges=[];
const rows=[["USR-1","a"],["USR-2","b"],[" USR-3 ","c"]];
const sheet={
 getLastRow:()=>4,
 getRange(row,col,count=1,width=1){
  ranges.push({row,col,count,width});
  return {getValues:()=>Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>rows[row-2+i]?.[col-1+j]??"")),
   getValue:()=>rows[row-2]?.[col-1]??""};
 }
};
assert.deepEqual(fn(sheet,1,"USR-3",true),[{rowIndex:4}]);
assert.deepEqual(ranges,[{row:2,col:1,count:3,width:1},{row:4,col:1,count:1,width:1}],
 "La búsqueda debe leer la columna ID y confirmar solo la celda coincidente, no la fila completa.");
ranges=[];
assert.deepEqual(fn(sheet,1,"USR-2",false),[{rowIndex:3}]);
assert.equal(ranges.length,2);
assert.equal(ranges[1].width,1);
console.log("UsersReadMinimization: 8/8 PASS — getUsers limita columnas y perfil lee solo el ID");
