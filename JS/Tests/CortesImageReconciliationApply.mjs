import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"JS/Services/admin.js"),"utf8");
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
 let released=false,locked=false,tryLockCalls=0,logCalls=0,previewCalls=0,activityCalls=[],backupChecks=0,cacheRemovals=[];
 const lock={hasLock:()=>locked,waitLock:()=>{locked=true;},tryLock(timeout){assert.equal(timeout,0);tryLockCalls++;if(options.lockReacquireFailure)return false;locked=true;return true;},releaseLock:()=>{released=true;locked=false;}},LockService={getScriptLock:()=>lock};
 const SHEET_NAMES={CORTES:"Cortes"};
 const COLS_CORTES={id:1,imagenVehiculo:9,imgCorte1:10,imgCorte2:11,imgCorte3:12,imgApertura:13,imgCableAlimen:14,imgCableAlimen2:15,imgCableAlimen3:16};
 const SpreadsheetApp={flush:()=>{}},getSpreadsheet=()=>({getSheetByName:name=>name==="Cortes"?sheet:null});
 const metadata=options.metadata||[{fileId,fileName:"same.png",mimeType:"image/png"}];
 const auditState={ownerId:"DEV-1",status:"complete",scanVersion:"2.7.1",imageMetadataVersion:1,completedAt:Date.now(),pageCount:1,totalDiscovered:metadata.length};
 const loadDriveAuditServerState_=id=>{assert.equal(id,auditId);return auditState;};
 const getLatestDriveAuditIdForUser_=owner=>{assert.equal(owner,"DEV-1");return auditId;};
 const loadDriveAuditSeenIds_=()=>({fileIds:metadata.map(item=>item.fileId)});
 const loadDriveAuditFileMetadata_=()=>metadata;
 const handlePreviewCortesImageReconciliation_=payload=>{previewCalls++;assert.deepEqual(payload.files,[{fileId}]);assert.equal(payload.auditId,auditId);return {writePerformed:false,manifestDigest:options.previewDigest||digest,missingReferenceCheckStatus:"verified",missingReferences:options.missingReferences||[],missingReferenceCount:options.missingReferenceCount===undefined?(options.missingReferences||[]).length:options.missingReferenceCount,results:[{status:"matched",fileId,fileName:"same.png",target:{row:2,column:9,vehicleId:"V-001",field:"imagenVehiculo",currentValue:"",hasFormula:false},proposedUrl:url}]};};
 const recordImageAdministrationActivity=(context,action,id,details)=>{assert.equal(locked,false,"La actividad Coordinator debe ejecutarse sin ScriptLock");activityCalls.push({action,id,details});if(options.activityFailure&&action==="cortes_image_reconciliation_applied"){if(options.externalChange)values[1][8]="https://manual.example/changed";return false;}return true;};
 const backupId="backup-file-id-0000000000000001";
 const verifyImageReconciliationBackup_=(id,context)=>{backupChecks++;if(id!==backupId||!context||context.userId!=="DEV-1"||options.backupFailure)throw new Error("respaldo no válido");return {backupId:id,backupName:"GPSpedia_DB_BACKUP_test",fingerprint:"b".repeat(64)};};
 const CacheService={getScriptCache:()=>({remove:key=>cacheRemovals.push(key)})};
 const getImageReconciliationBackupCacheKey=userId=>"CORTES_IMAGE_RECONCILIATION_BACKUP_"+userId;
 const runAdminDriveWorkOutsideScriptLock_=new Function(extract("runAdminDriveWorkOutsideScriptLock_")+"\nreturn runAdminDriveWorkOutsideScriptLock_;")();
 const factory=new Function("LockService","runAdminDriveWorkOutsideScriptLock_","handlePreviewCortesImageReconciliation_","getSpreadsheet","SHEET_NAMES","COLS_CORTES","SpreadsheetApp","recordImageAdministrationActivity","loadDriveAuditServerState_","getLatestDriveAuditIdForUser_","loadDriveAuditSeenIds_","loadDriveAuditFileMetadata_","ADMIN_SERVICE_VERSION","verifyImageReconciliationBackup_","CacheService","getImageReconciliationBackupCacheKey",
  validatorSource+"\n"+countSource+"\n"+duplicateSource+"\n"+handlerSource+"\nreturn handleApplyCortesImageReconciliation_;");
 const handler=factory(LockService,runAdminDriveWorkOutsideScriptLock_,handlePreviewCortesImageReconciliation_,getSpreadsheet,SHEET_NAMES,COLS_CORTES,SpreadsheetApp,recordImageAdministrationActivity,loadDriveAuditServerState_,getLatestDriveAuditIdForUser_,loadDriveAuditSeenIds_,loadDriveAuditFileMetadata_,"2.7.1",verifyImageReconciliationBackup_,CacheService,getImageReconciliationBackupCacheKey);
 const payload={confirmed:true,auditId,backupId,manifestDigest:digest,approved:[approval]};
 return {handler,payload,values,activityCalls,cacheRemovals,get backupChecks(){return backupChecks;},get released(){return released;},get previewCalls(){return previewCalls;},get locked(){return locked;},get tryLockCalls(){return tryLockCalls;},get logCalls(){return logCalls;},logMessage(){assert.equal(locked,false,"El logger debe ejecutarse sin ScriptLock");logCalls++;}};
}
let passed=0;
function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("aplica una propuesta aprobada y verifica el conteo antes/después",()=>{
 const h=createHarness(),result=h.handler(h.payload,()=>h.logMessage(),{userId:"DEV-1"});
 assert.equal(result.status,"success");assert.equal(result.appliedCount,1);
 assert.equal(result.beforeCount,0);assert.equal(result.afterCount,1);
 assert.equal(h.values[1][8],url);assert.equal(h.previewCalls,1);assert.equal(h.released,true);
 assert.equal(h.backupChecks,1);assert.equal(result.backupId,h.payload.backupId);
 assert.equal(h.cacheRemovals.length,1);
 assert.equal(h.activityCalls[0].action,"cortes_image_reconciliation_applied");assert.equal(h.logCalls,1);assert.equal(h.locked,false);
 assert.ok(h.activityCalls[0].details.includes(h.payload.backupId));
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
testCase("rechaza archivos renombrados después de la auditoría completa",()=>{
 const h=createHarness({metadata:[{fileId,fileName:"renamed.png",mimeType:"image/png"}]});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/cambió desde la auditoría/);
 assert.equal(h.values[1][8],"");assert.equal(h.previewCalls,1);assert.equal(h.released,true);
});
testCase("rechaza la aplicación si no se proporciona un respaldo",()=>{
 const h=createHarness();
 assert.throws(()=>h.handler({...h.payload,backupId:""},()=>{},{userId:"DEV-1"}),/respaldo completo y verificado/);
 assert.equal(h.backupChecks,0);assert.equal(h.previewCalls,0);assert.equal(h.values[1][8],"");
});
testCase("rechaza un respaldo que no puede verificarse antes de la simulación",()=>{
 const h=createHarness({backupFailure:true});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/respaldo no válido/);
 assert.equal(h.backupChecks,1);assert.equal(h.previewCalls,0);assert.equal(h.values[1][8],"");
});
testCase("bloquea la aplicación cuando existen referencias de Cortes sin archivo verificado",()=>{
 const h=createHarness({missingReferences:[{fileId:"missing-drive-file-000000000000",status:"missing_or_unverifiable"}]});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/referencias de Cortes sin archivo verificado/);
 assert.equal(h.previewCalls,1);assert.equal(h.values[1][8],"");
});
testCase("bloquea la aplicación si el total de referencias supera el detalle truncado",()=>{
 const h=createHarness({missingReferenceCount:205,missingReferences:[]});
 assert.throws(()=>h.handler(h.payload,()=>{},{userId:"DEV-1"}),/referencias de Cortes sin archivo verificado/);
 assert.equal(h.previewCalls,1);assert.equal(h.values[1][8],"");
});

function createBackupVerifier(options={}) {
 const backupId="backup-file-id-0000000000000001", sourceId="source-spreadsheet-id";
 const fingerprint="a".repeat(64), backupName="GPSpedia_DB_BACKUP_run-1";
 const record={backupId,backupName,sourceSpreadsheetId:sourceId,createdAt:"run-1",fingerprint,sheetCount:4,rowCount:40,cellCount:400,formulaCount:12};
 const manifest={kind:"GPSpedia_DB_BACKUP_MANIFEST",version:2,status:"complete",sourceSpreadsheetId:sourceId,createdAt:"run-1",fingerprint,sheetCount:4};
 const backupFile={isTrashed:()=>false,getMimeType:()=>"application/vnd.google-apps.spreadsheet",getName:()=>backupName,
  getSharingAccess:()=>options.access||"PRIVATE",getDescription:()=>JSON.stringify(options.badManifest?{...manifest,status:"partial"}:manifest)};
 const backupSpreadsheet={getId:()=>backupId,getSheetByName:()=>({})};
 const sourceSpreadsheet={getId:()=>sourceId};
 const cache={get:key=>JSON.stringify(options.badCache?{...record,backupId:"another-backup-id-000000000000"}:record)};
 const CacheService={getScriptCache:()=>cache};
 const DriveApp={Access:{PRIVATE:"PRIVATE"},getFileById:()=>backupFile};
 const SpreadsheetApp={openById:()=>backupSpreadsheet};
 const adminRestoreValidateDatabaseSchema_=ss=>{
  const result={fingerprint,sheetCount:4,rowCount:40,cellCount:400,formulaCount:12};
  if(options.backupFingerprint && ss.getId()===backupId)result.fingerprint=options.backupFingerprint;
  if(options.sourceFingerprint && ss.getId()===sourceId)result.fingerprint=options.sourceFingerprint;
  return result;
 };
 const keyStart=admin.indexOf("function getImageReconciliationBackupCacheKey");
 const keyEnd=admin.indexOf("\n}\n",keyStart)+2;
 const verifyStart=admin.indexOf("function verifyImageReconciliationBackup_");
 const verifyEnd=admin.indexOf("\n}\n",verifyStart)+2;
 const keySource=admin.slice(keyStart,keyEnd),verifySource=admin.slice(verifyStart,verifyEnd);
 const verify=new Function("CacheService","DriveApp","SpreadsheetApp","SPREADSHEET_ID","SHEET_NAMES","isDirectChildOfDriveRoot","ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_","adminRestoreValidateDatabaseSchema_","getSpreadsheet",
  keySource+"\n"+verifySource+"\nreturn verifyImageReconciliationBackup_;")(
  CacheService,DriveApp,SpreadsheetApp,sourceId,{CORTES:"Cortes"},()=>true,"GPSpedia_DB_BACKUP_MANIFEST",
  adminRestoreValidateDatabaseSchema_,()=>sourceSpreadsheet);
 return {verify,backupId,fingerprint};
}
testCase("verifica copia, manifiesto, ACL privada y fingerprint actual del respaldo",()=>{
 const h=createBackupVerifier(),result=h.verify(h.backupId,{userId:"DEV-1"});
 assert.equal(result.backupId,h.backupId);assert.equal(result.fingerprint,h.fingerprint);
});
testCase("rechaza respaldos públicos, alterados o con manifiesto inválido",()=>{
 assert.throws(()=>createBackupVerifier({access:"ANYONE_WITH_LINK"}).verify("backup-file-id-0000000000000001",{userId:"DEV-1"}),/no es privado/);
 assert.throws(()=>createBackupVerifier({backupFingerprint:"b".repeat(64)}).verify("backup-file-id-0000000000000001",{userId:"DEV-1"}),/cambió después/);
 assert.throws(()=>createBackupVerifier({badManifest:true}).verify("backup-file-id-0000000000000001",{userId:"DEV-1"}),/manifiesto/);
});
testCase("rechaza respaldo de otra sesión y base operativa modificada",()=>{
 assert.throws(()=>createBackupVerifier({badCache:true}).verify("backup-file-id-0000000000000001",{userId:"DEV-1"}),/esta sesión/);
 assert.throws(()=>createBackupVerifier({sourceFingerprint:"b".repeat(64)}).verify("backup-file-id-0000000000000001",{userId:"DEV-1"}),/base de datos cambió/);
});
assert.match(admin,/getImageReconciliationBackupCacheKey\(developerContext\.userId\)/);
assert.match(admin,/backupFile\.getSharingAccess\(\) !== DriveApp\.Access\.PRIVATE/);
console.log("CortesImageReconciliationApply: "+passed+"/"+passed+" PASS");
