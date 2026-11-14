import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"Services/admin.js"),"utf8");
function extract(name) {
 const start=admin.indexOf("function "+name+"(");
 const end=admin.indexOf("\n}\n",start)+2;
 assert.ok(start>=0&&end>start,"función ausente: "+name);
 return admin.slice(start,end);
}
const validatorSource=extract("buildCortesImageReconciliationApprovalManifest_");
const countSource=extract("countCortesImageCells_");
const duplicateSource=extract("getCortesCanonicalDuplicateFileIds_");
const handlerSource=extract("handleApplyCortesImageReconciliation_");
const digest="a".repeat(64),fileId="drive-file-id-0000000000000001";
const auditId="11111111-1111-4111-8111-111111111111";
const url="https://drive.google.com/uc?export=view&id="+fileId;
const approval={fileId,row:2,column:9,vehicleId:"V-001",field:"imagenVehiculo",proposedUrl:url};
function createHarness(options={}) {
 const values=[Array(16).fill(""),Array(16).fill("")];values[1][0]="V-001";
 const formulas=new Map();
 const cell=(row,column)=>({getValue:()=>values[row-1][column-1],getFormula:()=>formulas.get(row+":"+column)||"",setValue:value=>{values[row-1][column-1]=value;},clearContent:()=>{values[row-1][column-1]="";}});
 const sheet={getLastRow:()=>2,getRange:(row,column,numRows,numColumns)=>numRows!==undefined&&numColumns!==undefined?{getValues:()=>values.slice(row-1,row-1+numRows).map(line=>line.slice(column-1,column-1+numColumns))}:cell(row,column)};
 let released=false,previewCalls=0,activityCalls=[];
 const lock={waitLock:()=>{},releaseLock:()=>{released=true;}},LockService={getScriptLock:()=>lock};
 const SHEET_NAMES={CORTES:"Cortes"};
 const COLS_CORTES={id:1,imagenVehiculo:9,imgCorte1:10,imgCorte2:11,imgCorte3:12,imgApertura:13,imgCableAlimen:14,imgCableAlimen2:15,imgCableAlimen3:16};
 const SpreadsheetApp={flush:()=>{}},getSpreadsheet=()=>({getSheetByName:name=>name==="Cortes"?sheet:null});
 const metadata=options.metadata||[{fileId,fileName:"same.png",mimeType:"image/png"}];
 const auditState={ownerId:"DEV-1",status:"complete",scanVersion:"2.6.2",imageMetadataVersion:1,completedAt:Date.now(),pageCount:1,totalDiscovered:metadata.length};
 const loadDriveAuditServerState_=id=>{assert.equal(id,auditId);return auditState;};
 const getLatestDriveAuditIdForUser_=owner=>{assert.equal(owner,"DEV-1");return auditId;};
 const loadDriveAuditSeenIds_=()=>({fileIds:metadata.map(item=>item.fileId)});
 const loadDriveAuditFileMetadata_=()=>metadata;
 const handlePreviewCortesImageReconciliation_=payload=>{previewCalls++;assert.deepEqual(payload.files,[{fileId}]);return {writePerformed:false,manifestDigest:options.previewDigest||digest,results:[{status:"matched",fileId,fileName:"same.png",target:{row:2,column:9,vehicleId:"V-001",field:"imagenVehiculo",currentValue:"",hasFormula:false},proposedUrl:url}]};};
 const recordImageAdministrationActivity=(context,action,id,details)=>{activityCalls.push({action,id,details});if(options.activityFailure&&action==="cortes_image_reconciliation_applied"){if(options.externalChange)values[1][8]="https://manual.example/changed";return false;}return true;};
 const factory=new Function("LockService","handlePreviewCortesImageReconciliation_","getSpreadsheet","SHEET_NAMES","COLS_CORTES","SpreadsheetApp","recordImageAdministrationActivity","loadDriveAuditServerState_","getLatestDriveAuditIdForUser_","loadDriveAuditSeenIds_","loadDriveAuditFileMetadata_","ADMIN_SERVICE_VERSION",
  validatorSource+"\n"+countSource+"\n"+duplicateSource+"\n"+handlerSource+"\\nreturn handleApplyCortesImageReconciliation_;");
 const handler=factory(LockService,handlePreviewCortesImageReconciliation_,getSpreadsheet,SHEET_NAMES,COLS_CORTES,SpreadsheetApp,recordImageAdministrationActivity,loadDriveAuditServerState_,getLatestDriveAuditIdForUser_,loadDriveAuditSeenIds_,loadDriveAuditFileMetadata_,"2.6.2");
 const payload={confirmed:true,auditId,manifestDigest:digest,approved:[approval]};
 return {handler,payload,values,activityCalls,get released(){return released;},get previewCalls(){return previewCalls;}};
}
let passed=0;
function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("aplica una propuesta aprobada y verifica el conteo antes/después",()=>{
 const h=createHarness(),result=h.handler(h.payload,()=>{},{userId:"DEV-1"});
 assert.equal(result.status,"success");assert.equal(result.appliedCount,1);
 assert.equal(result.beforeCount,0);assert.equal(result.afterCount,1);
 assert.equal(h.values[1][8],url);assert.equal(h.previewCalls,1);assert.equal(h.released,true);
 assert.equal(h.activityCalls[0].action,"cortes_image_reconciliation_applied");
});
testCase("rechaza digest vencido antes de escribir y libera el bloqueo",()=>{
 const h=createHarness({previewDigest:"b".repeat(64)});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/no coincide/);
 assert.equal(h.values[1][8],"");assert.equal(h.released,true);
});
testCase("rechaza celdas ocupadas durante la precondición sin sobrescribirlas",()=>{
 const h=createHarness();h.values[1][8]="https://manual.example/current";
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/cambió desde el preview/);
 assert.equal(h.values[1][8],"https://manual.example/current");assert.equal(h.released,true);
});
testCase("si falla el registro, revierte solo la URL que acaba de escribir",()=>{
 const h=createHarness({activityFailure:true});
 const result=h.handler(h.payload,()=>{},{userId:"DEV-1"});
 assert.equal(result.status,"warning");assert.equal(result.rollbackConfirmed,true);
 assert.equal(result.appliedCount,0);assert.equal(result.rolledBackCount,1);
 assert.equal(h.values[1][8],"");assert.equal(h.activityCalls[1].action,"cortes_image_reconciliation_rollback");
});
testCase("el rollback conserva un cambio externo y reporta revisión manual",()=>{
 const h=createHarness({activityFailure:true,externalChange:true});
 const result=h.handler(h.payload,()=>{},{userId:"DEV-1"});
 assert.equal(result.status,"partial");assert.equal(result.rollbackConfirmed,false);
 assert.equal(h.values[1][8],"https://manual.example/changed");
 assert.ok(result.rollbackErrors.length>0);
});
testCase("requiere confirmación y sesión Desarrollador",()=>{
 const h=createHarness();
 assert.throws(()=>h.handler({...h.payload,confirmed:false},()=>{},{userId:"DEV-1"}),/confirmación explícita/);
 assert.throws(()=>h.handler(h.payload,()=>{},{}),/sesión Desarrollador/);
 assert.equal(h.previewCalls,0);
});
testCase("rechaza nombres canónicos duplicados en el inventario Drive completo",()=>{
 const h=createHarness({metadata:[
  {fileId,fileName:"same.png",mimeType:"image/png"},
  {fileId:"drive-file-id-0000000000000002",fileName:"SAME.jpg",mimeType:"image/jpeg"}
 ]});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/nombres canónicos duplicados/);
 assert.equal(h.values[1][8],"");assert.equal(h.previewCalls,0);assert.equal(h.released,true);
});
console.log("CortesImageReconciliationApply: "+passed+"/7 PASS");
