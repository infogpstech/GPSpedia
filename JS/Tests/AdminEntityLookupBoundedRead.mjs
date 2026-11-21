import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=source.indexOf("function getExistingEntities("),end=source.indexOf("\n// ============================================================================",start);
assert.ok(start>=0&&end>start,"No se encontró getExistingEntities");
const code=source.slice(start,end);
assert.doesNotMatch(code,/getLastColumn\(\)/,"No debe consultar el ancho completo de Cortes");
const fn=new Function("COLS_CORTES",code+"\nreturn getExistingEntities;")({
 marca:3,modelo:4,versionesAplicables:5
});
let requested=null;
const sheet={
 getLastRow:()=>4,
 getRange:(...args)=>{requested=args;return{getValues:()=>[
  ["Toyota","Hilux","2020-2024"],
  ["Toyota","Hilux","2018"],
  ["Nissan","Frontier","2022"]
 ]};}
};
assert.deepEqual(fn(sheet),{
 brands:["Toyota","Nissan"],
 models:["Hilux","Frontier"],
 versions:["2020-2024","2018","2022"]
});
assert.deepEqual(requested,[2,3,3,3],"Debe leer únicamente columnas marca, modelo y versiones");
const empty=fn({getLastRow:()=>1,getRange:()=>{throw new Error("No debe leer rangos vacíos");}});
assert.deepEqual(empty,{brands:[],models:[],versions:[]});
const sparseFn=new Function("COLS_CORTES",code+"\nreturn getExistingEntities;")({
 marca:2,modelo:6,versionesAplicables:9
});
let sparseRange=null;
const sparse=sparseFn({getLastRow:()=>2,getRange:(...args)=>{sparseRange=args;return{getValues:()=>[["A","","","","B","","","C"]]};}});
assert.deepEqual(sparse,{brands:["A"],models:["B"],versions:["C"]});
assert.deepEqual(sparseRange,[2,2,1,8],"Debe calcular índices relativos cuando las columnas no sean contiguas");
console.log("AdminEntityLookupBoundedRead: 7/7 PASS — lectura acotada y compatible con columnas dispersas");
