import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=admin.indexOf('const CORTES_ORGANIZER_LEDGER_PREFIX_ = "GPSpedia_CORTES_ORGANIZER_OP_V1_";');
const end=admin.indexOf("\nfunction resolveCortesOrganizerFolderPath_(",start);
assert.ok(start>=0&&end>start,"No se encontró el ledger Safe Apply");
const source=admin.slice(start,end);
let reads=0,writes=0,deletes=0;
const values=new Map();
const properties={getProperties(){reads++;return Object.fromEntries(values);},getProperty(k){return values.get(k)||null;},setProperty(k,v){writes++;values.set(k,v);},deleteProperty(k){deletes++;values.delete(k);}};
class Sheet{
 constructor(headers){this.rows=[headers.slice()];}
 getLastRow(){let n=this.rows.length;while(n>0&&this.rows[n-1].every(v=>v===""||v===null))n--;return n;}
 getRange(row,col,count,width){const self=this;return{
  getValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>((self.rows[row-1+i]||[])[col-1+j])??""));},
  setValues(data){data.forEach((r,i)=>{const n=row-1+i;while(self.rows.length<=n)self.rows.push([]);self.rows[n]=self.rows[n].slice();r.forEach((v,j)=>{self.rows[n][col-1+j]=v;});});}
 };}
 deleteRow(n){this.rows.splice(n-1,1);}
}
const headers=["operationId","ownerId","fileId","manifestDigest","auditId","status","attempts","sourceFolderPath","sourceName","targetFolderPath","targetName","currentFolderPath","currentName","createdAt","updatedAt","completedAt","rolledBackAt","error","recoveryError","schemaVersion"];
const sheet=new Sheet(headers),book={getSheetByName:n=>{assert.equal(n,"CortesOrganizerOperations");return sheet;}};
let held=false,busy=false,releases=0;
const locks={getScriptLock(){return{tryLock(ms){assert.equal(ms,0);if(held||busy)return false;held=true;return true;},hasLock(){return held;},releaseLock(){assert.equal(held,true);held=false;releases++;}};}};
const util={DigestAlgorithm:{SHA_256:"sha256"},Charset:{UTF_8:"utf8"},computeDigest(_a,v){return Array.from(String(v)).map(c=>c.charCodeAt(0));}};
const api=new Function("getSpreadsheet","Utilities","LockService","PropertiesService","SpreadsheetApp",source+
"\nreturn {getCortesOrganizerLedgerKey_,getCortesOrganizerLedgerSheet_,readCortesOrganizerLedgerBaselineState_,cortesOrganizerLedgerRecordToRow_,getCortesOrganizerLedgerRows_,findCortesOrganizerLedgerRecord_,ensureCortesOrganizerLedgerBaseline_,loadCortesOrganizerOperationLedger_,pruneCortesOrganizerOperationLedger_,getCortesOrganizerOperationLedgerPage_,saveCortesOrganizerOperationLedger_,withCortesOrganizerLedgerLock_};"
)(()=>book,util,locks,{getScriptProperties:()=>properties},{flush(){}});
const run=(n,f)=>{f();console.log("PASS "+n);};
const now=Date.now(),sample={operationId:"a".repeat(64)+":drive_file_id_0000000000000001",ownerId:"developer-a",fileId:"drive_file_id_0000000000000001",manifestDigest:"a".repeat(64),auditId:"12345678-1234-4234-8234-123456789abc",status:"complete",attempts:1,sourceFolderPath:"Cortes/Entrada",sourceName:"old.jpg",targetFolderPath:"Cortes/Toyota/Hilux",targetName:"new.jpg",currentFolderPath:"Cortes/Toyota/Hilux",currentName:"new.jpg",createdAt:now,updatedAt:now,completedAt:now};
const key=api.getCortesOrganizerLedgerKey_(sample.operationId);
run("esquema versionado obligatorio; no crea hojas implícitamente",()=>{assert.equal(api.getCortesOrganizerLedgerSheet_(),sheet);assert.equal(sheet.getLastRow(),1);});
run("baseline importa legacy con read-back y no escribe ni elimina propiedades",()=>{values.set(key,JSON.stringify(sample));const result=api.ensureCortesOrganizerLedgerBaseline_();assert.equal(result.imported,1);assert.equal(api.readCortesOrganizerLedgerBaselineState_(sheet),"cortes_organizer_ledger_v1");assert.equal(api.loadCortesOrganizerOperationLedger_(sample.operationId).status,"complete");assert.equal(writes,0);assert.equal(deletes,0);const n=reads;api.ensureCortesOrganizerLedgerBaseline_();assert.equal(reads,n);});
run("baseline reanudable no duplica filas y rechaza operationId duplicado",()=>{const row=api.cortesOrganizerLedgerRecordToRow_(sample);sheet.getRange(sheet.getLastRow()+1,1,1,headers.length).setValues([row]);assert.throws(()=>api.findCortesOrganizerLedgerRecord_(sheet,sample.operationId),/duplicados/i);sheet.deleteRow(sheet.getLastRow());assert.equal(api.ensureCortesOrganizerLedgerBaseline_().alreadyComplete,true);});
run("save actualiza una fila y confirma escritura mediante read-back",()=>{const next=Object.assign({},sample,{operationId:"b".repeat(64)+":drive_file_id_0000000000000002",fileId:"drive_file_id_0000000000000002",status:"processing",completedAt:0});api.withCortesOrganizerLedgerLock_(()=>api.saveCortesOrganizerOperationLedger_(next));assert.equal(api.loadCortesOrganizerOperationLedger_(next.operationId).status,"processing");api.withCortesOrganizerLedgerLock_(()=>api.saveCortesOrganizerOperationLedger_(Object.assign({},next,{status:"complete",completedAt:now})));assert.equal(api.loadCortesOrganizerOperationLedger_(next.operationId).status,"complete");});
run("historial pagina por propietario y no expone campos internos",()=>{const p=api.getCortesOrganizerOperationLedgerPage_(sheet,"developer-a",0,1);assert.equal(p.total,2);assert.equal(p.limit,1);assert.equal(p.operations.length,1);assert.equal(Object.hasOwn(p.operations[0],"ownerId"),false);assert.equal(p.nextOffset,1);});
run("retención elimina terminales vencidos y conserva estados no terminales",()=>{const old=Object.assign({},sample,{operationId:"c".repeat(64)+":drive_file_id_0000000000000003",fileId:"drive_file_id_0000000000000003"});api.withCortesOrganizerLedgerLock_(()=>api.saveCortesOrganizerOperationLedger_(old));const oldRow=api.findCortesOrganizerLedgerRecord_(sheet,old.operationId);sheet.getRange(oldRow.rowIndex,15,1,1).setValues([[now-181*86400000]]);const pending=Object.assign({},sample,{operationId:"d".repeat(64)+":drive_file_id_0000000000000004",fileId:"drive_file_id_0000000000000004",status:"processing",updatedAt:now-300*86400000});api.withCortesOrganizerLedgerLock_(()=>api.saveCortesOrganizerOperationLedger_(pending));api.withCortesOrganizerLedgerLock_(()=>api.pruneCortesOrganizerOperationLedger_(sheet,now));assert.equal(api.loadCortesOrganizerOperationLedger_(old.operationId),null);assert.equal(api.loadCortesOrganizerOperationLedger_(pending.operationId).status,"processing");});
run("lock ocupado falla rápido y no libera el lock ajeno",()=>{busy=true;let called=false;assert.throws(()=>api.withCortesOrganizerLedgerLock_(()=>{called=true;}),e=>e.code==="ORGANIZER_LEDGER_BUSY");assert.equal(called,false);assert.equal(held,false);busy=false;});
run("baseline pending se reanuda sin duplicar la fila ya importada",()=>{const secondSheet=new Sheet(headers),secondBook={getSheetByName:()=>secondSheet};const secondProps={getScriptProperties:()=>({getProperties:()=>({[key]:JSON.stringify(sample)})})};const second=new Function("getSpreadsheet","Utilities","LockService","PropertiesService","SpreadsheetApp",source+"\nreturn ensureCortesOrganizerLedgerBaseline_;")(()=>secondBook,util,locks,secondProps,{flush(){}});secondSheet.getRange(2,1,1,headers.length).setValues([["META","BASELINE","pending",...new Array(headers.length-3).fill("")]]);secondSheet.getRange(3,1,1,headers.length).setValues([api.cortesOrganizerLedgerRecordToRow_(sample)]);assert.equal(second().imported,0);assert.equal(secondSheet.getLastRow(),3);});
run("ledger no usa esperas temporizadas ni escribe/elimina propiedades legacy",()=>{assert.equal(/waitLock|tryLock\s*\(\s*[1-9]/.test(source),false);assert.equal(/\.setProperty\s*\(|\.deleteProperty\s*\(/.test(source),false);assert.equal(writes,0);assert.equal(deletes,0);});
console.log("CortesImageOrganizerLedger: 9/9 PASS");
