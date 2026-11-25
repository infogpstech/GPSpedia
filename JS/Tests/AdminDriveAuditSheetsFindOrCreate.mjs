import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const stateStart=admin.indexOf('const DRIVE_AUDIT_STATE_PROPERTY_PREFIX_');
const stateEnd=admin.indexOf("\nfunction readDriveAuditStateBaselineState_",stateStart);
const latestStart=admin.indexOf('const DRIVE_AUDIT_LATEST_PROPERTY_PREFIX_');
const latestEnd=admin.indexOf("\nfunction readDriveAuditLatestBaselineState_",latestStart);
assert.ok(stateStart>=0&&stateEnd>stateStart&&latestStart>stateEnd&&latestEnd>latestStart);
const source=admin.slice(stateStart,stateEnd)+"\n"+admin.slice(latestStart,latestEnd);
class Sheet{
 constructor(name,columns=26){this.name=name;this.maxColumns=columns;this.rows=[];this.inserted=0;}
 getName(){return this.name;}
 getMaxColumns(){return this.maxColumns;}
 insertColumnsAfter(after,count){this.maxColumns+=count;this.inserted+=count;}
 getLastRow(){let n=this.rows.length;while(n>0&&(!this.rows[n-1]||this.rows[n-1].every(v=>v===""||v===null||v===undefined)))n--;return n;}
 getRange(row,col,count=1,width=1){const self=this;return{
  getValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>((self.rows[row-1+i]||[])[col-1+j])??""));},
  setValues(values){values.forEach((valuesRow,i)=>{const index=row-1+i;while(self.rows.length<=index)self.rows.push([]);valuesRow.forEach((v,j)=>{self.rows[index][col-1+j]=v;});});},
  setValue(value){while(self.rows.length<row)self.rows.push([]);self.rows[row-1][col-1]=value;}
 };}
}
function harness(options={}){
 const sheets=new Map(Object.entries(options.sheets||{}));let race=false,flushes=0;
 const spreadsheet={
  getSheetByName(name){return sheets.get(name)||null;},
  insertSheet(name){if(race){race=false;sheets.set(name,new Sheet(name));throw new Error("already exists");}if(sheets.has(name))throw new Error("duplicate");const sheet=new Sheet(name);sheets.set(name,sheet);return sheet;}
 };
 const get=new Function("getSpreadsheet","SpreadsheetApp",source+"\nreturn {getDriveAuditStateSheet_,getDriveAuditLatestSheet_};")(
  ()=>spreadsheet,{flush(){flushes++;}});
 return{sheets,spreadsheet,get,flushes:()=>flushes,setRace(){race=true;}};
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("crea y nombra DriveAuditRuns y DriveAuditLatest cuando faltan",()=>{
 const h=harness(),state=h.get.getDriveAuditStateSheet_(),latest=h.get.getDriveAuditLatestSheet_();
 assert.equal(state.name,"DriveAuditRuns");assert.deepEqual(state.rows[0],["auditId","ownerId","status","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"]);
 assert.equal(latest.name,"DriveAuditLatest");assert.deepEqual(latest.rows[0],["ownerHash","ownerId","latestAuditId","updatedAt","schemaVersion"]);
 assert.equal(h.flushes(),2);
});
test("inicializa una hoja existente vacía sin reemplazarla",()=>{
 const existing=new Sheet("DriveAuditRuns"),h=harness({sheets:{DriveAuditRuns:existing}});
 assert.equal(h.get.getDriveAuditStateSheet_(),existing);
 assert.deepEqual(existing.rows[0],["auditId","ownerId","status","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"]);
});
test("completa un encabezado ausente cuando la columna no contiene datos",()=>{
 const sheet=new Sheet("DriveAuditRuns");sheet.rows=[["auditId","ownerId","","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"],["a","u","","1","1","1","{}","1"]];
 const h=harness({sheets:{DriveAuditRuns:sheet}});
 assert.equal(h.get.getDriveAuditStateSheet_(),sheet);assert.equal(sheet.rows[0][2],"status");assert.equal(sheet.rows[1][0],"a");
});
test("no inventa encabezado si la columna ausente ya contiene datos",()=>{
 const sheet=new Sheet("DriveAuditRuns");sheet.rows=[["auditId","ownerId","","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"],["a","u","running","1","1","1","{}","1"]];
 const h=harness({sheets:{DriveAuditRuns:sheet}});const before=JSON.stringify(sheet.rows);
 assert.throws(()=>h.get.getDriveAuditStateSheet_(),/datos sin encabezado/);assert.equal(JSON.stringify(sheet.rows),before);
});
test("rechaza encabezado incompatible sin modificarlo",()=>{
 const sheet=new Sheet("DriveAuditRuns");sheet.rows=[["auditId","otro","status","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"]];
 const h=harness({sheets:{DriveAuditRuns:sheet}});const before=JSON.stringify(sheet.rows);
 assert.throws(()=>h.get.getDriveAuditStateSheet_(),/no coincide/);assert.equal(JSON.stringify(sheet.rows),before);
});
test("recupera carrera de creación releyendo la hoja",()=>{
 const h=harness();h.setRace();const sheet=h.get.getDriveAuditStateSheet_();
 assert.equal(sheet.name,"DriveAuditRuns");assert.deepEqual(sheet.rows[0],["auditId","ownerId","status","createdAt","updatedAt","expiresAt","stateJson","schemaVersion"]);
});
test("crea columnas físicas faltantes antes de asignar encabezados",()=>{
 const sheet=new Sheet("DriveAuditRuns",2),h=harness({sheets:{DriveAuditRuns:sheet}});
 h.get.getDriveAuditStateSheet_();assert.equal(sheet.maxColumns,8);assert.equal(sheet.inserted,6);
});
console.log("AdminDriveAuditSheetsFindOrCreate: "+passed+"/"+passed+" PASS");
assert.equal(passed,7);
