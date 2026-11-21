import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
function extract(source,name){const start=source.indexOf("function "+name+"(");assert.notEqual(start,-1,"No se encontró "+name);const open=source.indexOf("{",start);let depth=0,q="",esc=false,line=false,block=false;
 for(let i=open;i<source.length;i++){const ch=source[i],n=source[i+1];if(line){if(ch==="\n")line=false;continue;}if(block){if(ch==="*"&&n==="/"){block=false;i++;}continue;}
  if(q){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch===q)q="";continue;}if(ch==="/"&&n==="/"){line=true;i++;continue;}if(ch==="/"&&n==="*"){block=true;i++;continue;}
  if(ch==="'"||ch=='"'||ch==="`"){q=ch;continue;}if(ch==="{")depth++;if(ch==="}"&&--depth===0)return source.slice(start,i+1);}throw Error("Función incompleta "+name);}
function runtime(){
 const headers=["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"],rows=[headers.slice()];let uuid=0;
 const contributions={getLastRow:()=>rows.length,getLastColumn:()=>11,getRange(row,col,count=1,width=1){return{getDisplayValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width).map(v=>String(v??""))),getValues:()=>Array.from({length:count},(_,i)=>(rows[row-1+i]||[]).slice(col-1,col-1+width))};},appendRow(row){rows.push(row.slice());}};
 const vehicle={getLastRow:()=>2,getLastColumn:()=>3,getRange(){return{getValues:()=>[["V-101","Corolla",""]]};}};
 const ss={getSheetByName:n=>n==="Cortes"?vehicle:n==="AportesVehiculo"?contributions:null};
 const fn=new Function("isAdminModalEditField_","handleUpdateVehicleVinCollection_","COLS_CORTES","SHEET_NAMES","getSpreadsheet","findUniqueAdminVehicleRow_","validateAdminModalFieldValue_","verifyAdminVehicleFieldUpdateProjection_","ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_","ADMIN_VEHICLE_CONTRIBUTIONS_HEADERS_","Utilities","SpreadsheetApp",
  extract(admin,"appendAdminVehicleFieldUpdate_")+"\n"+extract(admin,"handleUpdateVehicleField")+";return handleUpdateVehicleField;")(
  f=>["modelo","categoria"].includes(f),()=>{throw Error("VIN no esperado");},{id:1,modelo:2,categoria:3},{CORTES:"Cortes"},()=>ss,()=>2,(sheet,field,value)=>String(value).trim(),
  ()=>({candidateReviewPending:false,projectionVerification:"applied",currentValue:"Corolla X",currentSourceEventId:"EV-TEST"}),
  "AportesVehiculo",headers,{DigestAlgorithm:{SHA_256:"SHA-256"},Charset:{UTF_8:"UTF-8"},
   computeDigest:(a,s)=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return Array.from({length:32},(_,i)=>(h>>>((i%4)*8))&255);},
   getUuid:()=>"uuid-"+(++uuid)},{flush(){}});
 return{fn,rows};
}
const context={userId:"USER-1",fullName:"Editor"},base={vehicleId:"101",fieldName:"modelo",value:"Corolla X",expectedCurrentValue:"Corolla",expectedSourceEventId:"",enforceExpectedCurrentValue:true};
const r=runtime(),first=r.fn(base,()=>{},context),retry=r.fn(base,()=>{},context);
assert.equal(first.status,"success");assert.equal(first.duplicate,false);assert.equal(retry.duplicate,true);assert.equal(first.eventId,retry.eventId);
assert.equal(r.rows.length,2);assert.equal(r.rows[1][4],"vehicle_update");assert.equal(r.rows[1][9],"accepted");assert.equal(r.rows[1][6],"USER-1");
const otherVehicle=r.fn({...base,vehicleId:"202"},()=>{},context),otherField=r.fn({...base,fieldName:"categoria",value:"Automóvil"},()=>{},context);
assert.equal(otherVehicle.status,"success");assert.equal(otherField.status,"success");assert.equal(r.rows.length,4);
assert.throws(()=>r.fn({...base,expectedSourceEventId:"bad-id"},()=>{},context),/versión fuente/);
const {expectedCurrentValue,...missingExpected}=base;
assert.throws(()=>r.fn(missingExpected,()=>{},context),/edición requiere/);
assert.ok(ui.includes("adminModalFieldVersions"));assert.ok(ui.includes("expectedSourceEventId"));assert.ok(ui.includes("currentSourceEventId"));
console.log("AdminVehicleFieldVersioning: 8/8 PASS");
