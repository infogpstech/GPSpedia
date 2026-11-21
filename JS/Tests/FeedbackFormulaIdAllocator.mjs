import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
function extract(name){const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);const next=source.indexOf("\nfunction ",start+10);return source.slice(start,next<0?source.length:next);}
const allocator=extract("getNextFormulaBasedId_");
const reservations=extract("getIdentifierSequenceReservationsSheet_");
assert.doesNotMatch(allocator,/LockService|tryLock|waitLock|PropertiesService/,"El asignador no debe depender de locks ni contadores no atómicos.");
assert.match(allocator,/ledger\.appendRow\(/);
assert.match(allocator,/COUNTIFS\(/);
assert.match(allocator,/createTextFinder\(reservationId\)/);
assert.match(allocator,/blankOffsets/);
assert.match(reservations,/insertSheet\(IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET\)/);
assert.match(reservations,/IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS/);
assert.doesNotMatch(reservations,/LockService|tryLock|waitLock/);
for(const name of ["handleSuggestYearLocked" ,"handleSuggestCutChange","handleReportProblem","handleSendContactForm"])assert.match(extract(name),/getNextFormulaBasedId_/,name+" debe reservar el ID desde backend");
function makeSheet(name,rows,headers=null){
 const data=rows.map(r=>r.slice());let formulas=[];
 return {name,data,getName(){return name;},getLastRow(){return data.length;},getLastColumn(){return Math.max(1,...data.map(r=>r.length));},
 getRange(row,col,height=1,width=1){return{
  getValue(){return data[row-1]?.[col-1]??"";},
  getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>data[row-1+i]?.[col-1+j]??""));},
  setValues(values){values.forEach((line,i)=>line.forEach((value,j)=>{data[row-1+i]??=[];data[row-1+i][col-1+j]=value;}));},
  createTextFinder(query){return{matchCase(){return this;},matchEntireCell(){return this;},findAll(){const found=[];for(let i=row-1;i<Math.min(data.length,row-1+height);i++)if(String(data[i]?.[col-1]??"")===String(query))found.push({getRow:()=>i+1});return found;}};}
 };},
 appendRow(row){data.push(row.slice());const current=data.length,prior=data.slice(1,current-1).filter(r=>r[1]===row[1]&&Number(r[2])===Number(row[2])).length;data[current-1][3]=Number(row[4])+prior+1;}
 };
}
function harness(initialIds,opts={}){
 const sourceRows=[["ID"],...initialIds.map(id=>[id])];if(opts.blankRow)sourceRows.push(opts.blankRow);
 const src=makeSheet("Users",sourceRows),ledger=makeSheet("__IdentifierSequenceReservations__",opts.badHeaders?[["bad"]]:[["reservationId","sheet","column","reservedSuffix","baseSuffix","createdAt"]]);
 const ss={getSheetByName(name){return name==="Users"?src:name==="__IdentifierSequenceReservations__"?(opts.noLedger?null:ledger):null;},
 insertSheet(name){if(name!=="__IdentifierSequenceReservations__")throw Error("unexpected sheet");opts.noLedger=false;return ledger;}};
 let uuid=0;
 const code=[ 'const IDENTIFIER_SEQUENCE_RESERVATIONS_SHEET="__IdentifierSequenceReservations__";',
 'const IDENTIFIER_SEQUENCE_RESERVATIONS_HEADERS=["reservationId","sheet","column","reservedSuffix","baseSuffix","createdAt"];',
 reservations,allocator,"return {getIdentifierSequenceReservationsSheet_,getNextFormulaBasedId_};"].join("\n");
 const api=new Function("getSpreadsheet","getFormulaBasedIdPattern_","Utilities","SpreadsheetApp",code)(
  ()=>ss,()=>({prefix:"U-",padding:3}),{getUuid:()=>"reservation-"+(++uuid)},{flush(){}});
 return{api,src,ledger,run:(minimum)=>api.getNextFormulaBasedId_(src,1,minimum)};
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("reservas concurrentes reciben sufijos distintos sin lock",()=>{
 const h=harness(["U-001","U-002"]);
 assert.equal(h.run(),"U-003");assert.equal(h.run(),"U-004");assert.equal(h.run(),"U-005");
 assert.equal(h.ledger.data.length,4);
 assert.ok(h.ledger.data.slice(1).every(row=>Number.isInteger(Number(row[3]))));
});
test("respeta un sufijo mínimo legacy reservado fuera del catálogo",()=>{
 const h=harness(["U-001"]);assert.equal(h.run(25),"U-026");
});
test("reconcilia IDs existentes más altos sin colisionar con reservas previas",()=>{
 const h=harness(["U-001","U-002"]);assert.equal(h.run(),"U-003");
 h.src.data.push(["U-010"]);assert.equal(h.run(),"U-011");
});
test("rechaza IDs duplicados y sufijos inválidos",()=>{
 assert.throws(()=>harness(["U-001","U-001"]).run(),/ID duplicado/);
 assert.throws(()=>harness(["U-X01"]).run(),/sufijo numérico/);
});
test("conserva validación de filas con datos sin ID",()=>{
 const h=harness(["U-001"],{blankRow:["","dato"]});
 assert.throws(()=>h.run(),/contiene datos, pero no tiene ID/);
});
test("rechaza esquema incompatible de reservas",()=>{
 const h=harness(["U-001"],{badHeaders:true});
 assert.throws(()=>h.run(),/esquema de reservas.*incompatible/);
});
test("reconoce el patrón histórico PyS isue-### sin exigir fórmulas en filas existentes",()=>{
 const getPattern=extract("getFormulaBasedIdPattern_");
 const pattern=new Function("getSpreadsheet","IDENTIFIER_SEQUENCE_CONFIG_SHEET","IDENTIFIER_SEQUENCE_CONFIG_HEADERS",
  getPattern+"\nreturn getFormulaBasedIdPattern_;")(()=>({getSheetByName:()=>null}),"__IdentifierSequenceConfig__",
  ["sheet","column","header","prefix","padding","formula","updatedAt"])(
   {getName:()=>"pys",getRange:()=>({getValue:()=>"id_problem"})},1);
 assert.deepEqual(pattern,{prefix:"isue-",padding:3,formula:'="isue-"&TEXT(ROW()-1,"000")'});
});
console.log("FeedbackFormulaIdAllocator: "+passed+"/"+passed+" PASS — reservas append-only sin ScriptLock");
