import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
function extract(startName,endName){
 const a=source.indexOf("function "+startName+"("),b=source.indexOf("\nfunction "+endName+"(",a);
 assert.ok(a>=0&&b>a,startName);return source.slice(a,b);
}
const canonicalCode=extract("findCanonicalPysRowsById_","findPysRowsById_");
const physicalCode=extract("findPysRowsById_","getPysNextId_");
function makeSheet(rows,withFinder=true){
 return {getLastRow:()=>rows.length+1,getRange(row,col,count=1,width=1){
  return {getValues:()=>rows.slice(row-2,row-2+count).map(r=>r.slice(col-1,col-1+width)),
   createTextFinder(query){if(!withFinder)throw new Error("TextFinder disabled");return{matchCase(){return this;},findAll(){return rows.flatMap((r,i)=>String(r[col-1]||"").toLowerCase().includes(String(query).toLowerCase())?[{getRow:()=>i+2}]:[]);}};}
  };
 }};
}
const canonical=new Function("COLS_FEEDBACKS",canonicalCode+"\nreturn findCanonicalPysRowsById_;")({});
const physical=new Function("COLS_FEEDBACKS",physicalCode+"\nreturn findPysRowsById_;")({});
const row=(id,title="A")=>[id,title,"Descripción","","Solución","","https://drive.google.com/file/d/1234567890/view","","Usuario","[]"];
let passed=0;const test=(n,fn)=>{fn();passed++;};
test("lookup canónico usa una búsqueda dirigida por columna ID",()=>{
 const result=canonical(makeSheet([row("isue-001")]),"isue-001");assert.equal(result.length,1);assert.equal(result[0].rowNumber,2);
});
test("proyecta la primera fila cuando los duplicados físicos son idénticos",()=>{
 const result=canonical(makeSheet([row("isue-001"),row("isue-001")]),"isue-001");
 assert.equal(result.length,1);assert.equal(result[0].rowNumber,2);assert.equal(result[0].duplicateCount,1);
});
test("rechaza duplicados físicos con contenido contradictorio",()=>{
 assert.throws(()=>canonical(makeSheet([row("isue-001","A"),row("isue-001","B")]),"isue-001"),/contenido contradictorio/);
});
test("el lookup físico conserva todas las filas para consumidores que deben rechazar ambigüedad",()=>{
 assert.equal(physical(makeSheet([row("isue-001"),row("isue-001")]),"isue-001").length,2);
});
test("el fallback sin TextFinder mantiene coincidencia exacta",()=>{
 assert.equal(canonical(makeSheet([row("isue-001"),row("isue-010")],false),"isue-001").length,1);
});
console.log("FeedbackPysLookupBoundedRead: "+passed+"/"+passed+" PASS — lookup canónico y físico separados");
