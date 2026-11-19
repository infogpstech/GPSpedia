import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function sliceFunction(name,nextName){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const end=nextName?source.indexOf("\nfunction "+nextName+"(",start+10):source.indexOf("\nfunction ",start+10);
 assert.ok(end>start,"No se encontró el límite de "+name);
 return source.slice(start,end);
}
const readerCode=sliceFunction("readIdempotenciaEntryByOpId_","updateIdempotenciaEntriesSnapshot_");
const updateCode=sliceFunction("updateIdempotenciaEntriesSnapshot_","initializeIdempotenciaSheet");
const normalizeOpId=value=>{const v=String(value||"").trim();if(!/^OP-[A-Za-z0-9_-]{1,100}$/.test(v))throw Error("opId inválido");return v;};
const normalizeEntry=(row,rowIndex)=>{
 const opId=String(row[0]||"").trim();if(!opId)return null;
 return{opId,vehicleId:String(row[1]||"").trim(),slotIndex:Number(row[2]),timestamp:row[3],status:String(row[4]||""),operationHash:String(row[5]||""),rowIndex};
};
const reader=new Function("normalizeIdempotenciaOpId_","getIdempotenciaHeaderState","IDEMPOTENCIA_HEADERS","normalizeIdempotenciaEntry_",readerCode+"\nreturn readIdempotenciaEntryByOpId_;")(
 normalizeOpId,()=>({compatible:true,missingIndexes:[]}),["opId","vehicleId","slotIndex","timestamp","status","operationHash"],normalizeEntry
);
function makeLedger(rows){
 const calls=[],config={};
 const sheet={
  getLastRow:()=>rows.length+1,getMaxColumns:()=>6,
  getRange(...args){
   calls.push(args);
   if(args.length===4&&args[0]===2&&args[1]===1&&args[3]===1){
    return{createTextFinder(query){
     return{
      matchCase(v){config.matchCase=v;return this;},
      matchEntireCell(v){config.matchEntireCell=v;return this;},
      useRegularExpression(v){config.useRegularExpression=v;return this;},
      matchFormulaText(v){config.matchFormulaText=v;return this;},
      findAll(){return rows.map((row,index)=>({row,index})).filter(x=>String(x.row[0]||"").includes(query)).map(x=>({
       getRow:()=>x.index+2,getValue:()=>x.row[0]
      }));}
     };
    }};
   }
   if(args.length===4&&args[1]===1&&args[2]===1&&args[3]===6){
    return{getValues:()=>[rows[args[0]-2]]};
   }
   throw Error("Rango inesperado "+args.join(","));
  }
 };
 return{sheet,calls,config};
}
let passed=0;function test(name,fn){fn();passed++;}
test("lectura dirigida encuentra un opId con espacios y lee solo su fila",()=>{
 const h=makeLedger([[" OP-1 ","42",1,"fecha","pending","a".repeat(64)]]);
 const entry=reader(h.sheet,"OP-1");
 assert.equal(entry.opId,"OP-1");assert.equal(entry.vehicleId,"42");assert.equal(entry.rowIndex,2);
 assert.deepEqual(h.config,{matchCase:true,matchEntireCell:false,useRegularExpression:false,matchFormulaText:false});
 assert.deepEqual(h.calls,[[2,1,1,1],[2,1,1,6]]);
});
test("lectura dirigida rechaza duplicados incluso con espacios",()=>{
 const h=makeLedger([["OP-1","42",1,"fecha","pending","a".repeat(64)],[" OP-1 ","42",1,"fecha","pending","a".repeat(64)]]);
 assert.throws(()=>reader(h.sheet,"OP-1"),/opId duplicado/);
});
test("lectura dirigida devuelve null si no existe el opId",()=>{
 const h=makeLedger([["OP-2","42",1,"fecha","pending","a".repeat(64)]]);
 assert.equal(reader(h.sheet,"OP-1"),null);
 assert.deepEqual(h.calls,[[2,1,1,1]]);
});
test("findRowByOpId reutiliza snapshot y no vuelve a leer el ledger",()=>{
 const code=sliceFunction("findRowByOpId");
 let fullReads=0;
 const find=new Function("normalizeIdempotenciaOpId_","readIdempotenciaEntries_","getIdempotenciaSheet","getSpreadsheet","SHEET_NAMES","findUniqueCortesVehicleRow_","COLS_CORTES","normalizeIdempotenciaVehicleId_",code+"\nreturn findRowByOpId;")(
  normalizeOpId,()=>{fullReads++;throw Error("lectura integral inesperada");},()=>{throw Error("getIdempotenciaSheet inesperado");},
  ()=>{throw Error("getSpreadsheet inesperado");},{CORTES:"Cortes"},
  (sheet,vehicleId,opId)=>({rowIndex:2,rowValues:Array(37).fill("").map((v,i)=>i===0?vehicleId:i===36?"fecha":"")}),
  {colaboradorCorte1:18,timestamp:37},value=>String(value)
 );
 const entry={opId:"OP-1",vehicleId:"42",slotIndex:1,timestamp:"fecha",status:"pending",operationHash:"a".repeat(64),rowIndex:2};
 const snapshot={entries:[entry],byOpId:new Map([["OP-1",entry]])};
 const result=find({}, "OP-1",snapshot);
 assert.equal(result.fromIdempotenciaSheet,true);assert.equal(result.vehicleId,"42");assert.equal(fullReads,0);
});
function makeRecordHarness(initialRows=[]){
 const rows=initialRows.map(row=>row.slice()),counts={targeted:0,full:0,flush:0,statusWrites:0};
 const sheet={
  getLastRow:()=>rows.length+1,getMaxColumns:()=>6,
  appendRow(row){rows.push(row.slice());},
  getRange(rowIndex,column){
   return{setValue(value){rows[rowIndex-2][column-1]=value;if(column===5)counts.statusWrites++;}};
  }
 };
 const targeted=(targetSheet,opId)=>{
  counts.targeted++;
  const found=rows.map((row,index)=>({row,index})).filter(x=>String(x.row[0]||"").trim()===opId);
  if(found.length>1)throw Error("opId duplicado");
  if(!found.length)return null;
  const x=found[0];
  return normalizeEntry(x.row,x.index+2);
 };
 const update=new Function(updateCode+"\nreturn updateIdempotenciaEntriesSnapshot_;")();
 const recordCode=sliceFunction("recordOpId");
 const record=new Function(
  "normalizeIdempotenciaOpId_","normalizeIdempotenciaVehicleId_","normalizeIdempotenciaSlotIndex_",
  "isValidIdempotenciaTimestamp_","normalizeIdempotenciaStatus_","normalizeIdempotenciaOperationHash_",
  "getIdempotenciaSheet","readIdempotenciaEntries_","readIdempotenciaEntryByOpId_","updateIdempotenciaEntriesSnapshot_","SpreadsheetApp",
  recordCode+"\nreturn recordOpId;"
 )(
  normalizeOpId,value=>String(value||"").trim(),value=>Number(value),
  value=>!!String(value||"").trim(),value=>String(value||"").toLowerCase(),
  value=>{const v=String(value||"").toLowerCase();if(!/^[a-f0-9]{64}$/.test(v))throw Error("hash inválido");return v;},
  ()=>{throw Error("getIdempotenciaSheet inesperado");},
  ()=>{counts.full++;throw Error("lectura integral inesperada");},
  targeted,update,{flush(){counts.flush++;}}
 );
 const snapshot={entries:[],byOpId:new Map(),sheet};
 return{record:(...args)=>record(...args,snapshot),rows,counts,snapshot};
}
test("recordOpId comparte snapshot y completa pending a completed sin lecturas integrales",()=>{
 const h=makeRecordHarness(),hash="b".repeat(64);
 let entry=h.record("OP-2","42",1,"2026-11-19T12:00:00Z","pending",hash);
 assert.equal(entry.status,"pending");assert.equal(h.rows.length,1);
 assert.equal(h.snapshot.byOpId.get("OP-2").status,"pending");
 entry=h.record("OP-2","42",1,"2026-11-19T12:00:00Z","completed",hash);
 assert.equal(entry.status,"completed");assert.equal(h.rows.length,1);
 assert.equal(h.snapshot.entries.length,1);assert.equal(h.snapshot.byOpId.get("OP-2").status,"completed");
 assert.equal(h.counts.full,0);assert.equal(h.counts.targeted,4);assert.equal(h.counts.statusWrites,1);
});
test("completed no retrocede a pending",()=>{
 const hash="c".repeat(64),h=makeRecordHarness([["OP-3","42",1,"fecha","completed",hash]]);
 const existing=normalizeEntry(h.rows[0],2);
 h.snapshot.entries.push(existing);h.snapshot.byOpId.set(existing.opId,existing);
 const result=h.record("OP-3","42",1,"fecha","pending",hash);
 assert.equal(result.status,"completed");assert.equal(h.counts.statusWrites,0);assert.equal(h.counts.full,0);
});
test("snapshot detecta una entrada creada en paralelo",()=>{
 const hash="d".repeat(64),h=makeRecordHarness([["OP-4","42",1,"fecha","pending",hash]]);
 assert.throws(()=>h.record("OP-4","42",1,"fecha","completed",hash),/cambió durante la operación/);
 assert.equal(h.rows.length,1);assert.equal(h.counts.statusWrites,0);
});
test("snapshot detecta cambio de asociación antes de actualizar",()=>{
 const hash="e".repeat(64),h=makeRecordHarness([["OP-5","99",1,"fecha","pending",hash]]);
 const snapshotEntry={opId:"OP-5",vehicleId:"42",slotIndex:1,timestamp:"fecha",status:"pending",operationHash:hash,rowIndex:2};
 h.snapshot.entries.push(snapshotEntry);h.snapshot.byOpId.set("OP-5",snapshotEntry);
 assert.throws(()=>h.record("OP-5","42",1,"fecha","completed",hash),/asociación.*cambió/);
 assert.equal(h.counts.statusWrites,0);
});
test("handler toma una lectura integral y la comparte con todos los pasos",()=>{
 const lockedStart=source.indexOf("function handleAddOrUpdateCutLocked("),lockedEnd=source.indexOf("\nfunction handleAddOrUpdateCutLockedUnsafe_",lockedStart);
 const locked=source.slice(lockedStart,lockedEnd);
 assert.equal((locked.match(/readIdempotenciaEntries_\(/g)||[]).length,1);
 assert.match(locked,/idempotencyEntriesSnapshot\.sheet = idempotencySheetBefore/);
 assert.match(locked,/handleAddOrUpdateCutLockedUnsafe_\(validatedPayload, lock, lockState, collaboratorName, idempotencyEntriesSnapshot\)/);
 assert.match(locked,/const idempotencySheet = idempotencySheetBefore/);
 const unsafeStart=source.indexOf("function handleAddOrUpdateCutLockedUnsafe_"),unsafeEnd=source.indexOf("\nfunction ",unsafeStart+10);
 const unsafe=source.slice(unsafeStart,unsafeEnd);
 const recordCalls=unsafe.match(/recordOpId\([^\n]+/g)||[];
 const findCalls=unsafe.match(/findRowByOpId\([^\n]+/g)||[];
 assert.ok(recordCalls.length>=5&&recordCalls.every(line=>line.includes("idempotencyEntriesSnapshot")));
 assert.ok(findCalls.length>=2&&findCalls.every(line=>line.includes("idempotencyEntriesSnapshot")));
});
console.log("WriteIdempotencySnapshotReuse: "+passed+"/"+passed+" PASS — una lectura integral por operación y verificación dirigida");
