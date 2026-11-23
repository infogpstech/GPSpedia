import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const admin=read("Services/admin.js"),catalog=read("Services/catalog.js"),ui=read("Frontend/ui.js"),api=read("Frontend/api-config.js");
for(const value of ["WRITE_SERVICE_URL","CATALOG_SERVICE_URL","AUTH_SERVICE_URL","CATALOG_TRAFFIC_SECRET_PROPERTY_","callWriteServiceAction","requestCortesIdFreezeFromWriteService","getAdminProjectedVehicleFieldSnapshot_","verifyAdminVehicleFieldUpdateProjection_","handleGetVehicleContributionCandidates_"])assert.equal(admin.includes(value),false,value);
assert.equal(admin.includes("script.google.com/macros/s/"),false);
const rs=admin.indexOf("function handleReorganizeDatabase("),re=admin.indexOf("\n}",rs)+2,handler=admin.slice(rs,re);
assert.ok(rs>=0&&re>rs);assert.ok(handler.includes("payload.idsFrozen !== true"));assert.ok(handler.includes("backupFile.getDescription()"));assert.ok(handler.includes("getFormulas()"));
for(const forbidden of ["handleBackupDatabase","requestCortesIdFreezeFromWriteService","UrlFetchApp"])assert.equal(handler.includes(forbidden),false,forbidden);
const ws=ui.indexOf("document.getElementById('btn-admin-reorganize-db').onclick"),we=ui.indexOf("document.getElementById('btn-admin-normalize-images')",ws),workflow=ui.slice(ws,we);
const backup=workflow.indexOf('step("backupDatabase"'),freeze=workflow.indexOf('step("freezeCortesIds"'),sort=workflow.indexOf('step("reorganizeDatabase"');
assert.ok(backup>=0&&backup<freeze&&freeze<sort);
for(const value of ["localStorage.setItem","localStorage.removeItem","backup_pending","freeze_pending","sort_pending"])assert.ok(workflow.includes(value));
for(const value of ["verifyAdminVehicleFieldUpdateProjectionFrontend_","loadCatalogImageProjection_",'routeAction("getVehicleProjection"',"includeImageInventoryCandidates","getReplacedImages"])assert.ok(ui.includes(value),value);
assert.ok(api.includes("'getVehicleContributionCandidates': 'CATALOG'"));
assert.ok(catalog.includes("verifyCatalogDeveloperSession_(payload)"));
assert.equal(catalog.includes("CATALOG_TRAFFIC_SECRET_PROPERTY_"),false);
const projectionHandlerStart=catalog.indexOf("function handleGetVehicleProjection_");
const projectionHandlerEnd=catalog.indexOf("\nfunction handleGetContributionCandidates_",projectionHandlerStart);
const projectionHandler=catalog.slice(projectionHandlerStart,projectionHandlerEnd);
assert.ok(projectionHandlerEnd > projectionHandlerStart);
assert.ok(projectionHandler.includes("verifyCatalogModalEditSession_(payload)"));
assert.ok(ui.includes('routeAction("getVehicleProjection",{vehicleId:String(vehicleId||"").trim(),...getDeveloperSessionPayload()})'));
const as=catalog.indexOf("function normalizeCatalogRole_"),ae=catalog.indexOf("function getSpreadsheet()",as),auth=catalog.slice(as,ae);
function sheets(role="Desarrollador",created=new Date(),activity=new Date(),token="S-1"){
 const sh=rows=>({getDataRange:()=>({getValues:()=>rows})});
 return {getSheetByName:name=>name==="Users"?sh([["id","username","password","role"],["U-1","dev","",role]]):name==="ActiveSessions"?sh([["id","username","token","date","logs","lastActivityAt"],["U-1","dev",token,created,"",activity]]):null};
}
const verify=ss=>new Function("getSpreadsheet",auth+";return {developer:verifyCatalogDeveloperSession_,modal:verifyCatalogModalEditSession_};")(()=>ss);
assert.equal(verify(sheets()).developer({userId:"U-1",sessionToken:"S-1"}),true);
assert.equal(verify(sheets("Jefe")).modal({userId:"U-1",sessionToken:"S-1"}),true);
assert.equal(verify(sheets("Supervisor")).modal({userId:"U-1",sessionToken:"S-1"}),true);
assert.throws(()=>verify(sheets("Técnico")).developer({userId:"U-1",sessionToken:"S-1"}),/Desarrollador/);
assert.throws(()=>verify(sheets("Técnico")).modal({userId:"U-1",sessionToken:"S-1"}),/Desarrollador, Jefe o Supervisor/);
assert.throws(()=>verify(sheets("Desarrollador",new Date("2020-01-01"),new Date("2020-01-01"))).modal({userId:"U-1",sessionToken:"S-1"}),/expiró/);
assert.ok(admin.includes("function cacheVerifiedDatabaseBackupForDeveloper_"));
assert.ok(admin.includes("DriveApp.getFilesByName(backupName)"));
assert.ok(admin.includes("existingBackup.getId() === ss.getId()"));
assert.ok(admin.includes("if (!ownerId) throw new Error"));
assert.ok(admin.includes("existingManifest.operationId !== operationId"));
assert.ok(admin.includes('String(existingManifest.ownerId || "") !== ownerId'));
const operationPersist = workflow.indexOf("persist();");
const backupCallIndex = workflow.indexOf('step("backupDatabase",{operationId:state.operationId}');
assert.ok(operationPersist >= 0 && backupCallIndex > operationPersist, "El operationId debe persistirse antes de solicitar el respaldo.");
assert.ok(workflow.includes("state.operationId =") || workflow.includes("state.operationId="));

const backupHelperStart=admin.indexOf("function cacheVerifiedDatabaseBackupForDeveloper_");
const backupHelperEnd=admin.indexOf("\n/**\n * 1. Respaldo",backupHelperStart);
const backupHandlerStart=admin.indexOf("function handleBackupDatabase(");
const backupHandlerEnd=admin.indexOf("\nfunction handleBackupDrive(",backupHandlerStart);
assert.ok(backupHelperStart>=0&&backupHelperEnd>backupHelperStart);
assert.ok(backupHandlerStart>=0&&backupHandlerEnd>backupHandlerStart);
const backupSource=admin.slice(backupHelperStart,backupHelperEnd)+"\n"+admin.slice(backupHandlerStart,backupHandlerEnd);
const mockFiles=new Map(),mockCache=new Map();let backupCopies=0;
const sourceSpreadsheet={getId:()=>"SOURCE_ID",getName:()=>"GPSpedia DB",getSheetByName:()=>({})};
function mockBackupFile(name,id){
 let description="";
 return {getId:()=>id,getName:()=>name,getMimeType:()=>"application/vnd.google-apps.spreadsheet",
  getSharingAccess:()=>"PRIVATE",isTrashed:()=>false,getUrl:()=>`https://docs.google.com/spreadsheets/d/${id}/edit`,
  getDescription:()=>description,setDescription:value=>{description=value;},setTrashed:()=>{}};
}
const mockDrive={Access:{PRIVATE:"PRIVATE"},getRootFolder:()=>({}),
 getFilesByName:name=>{const matches=[...mockFiles.values()].filter(file=>file.getName()===name);let index=0;
  return {hasNext:()=>index<matches.length,next:()=>matches[index++]};},
 getFileById:id=>id==="SOURCE_ID"?{makeCopy:name=>{backupCopies++;const file=mockBackupFile(name,"BACKUP_ID_0000000000000001");mockFiles.set(file.getId(),file);return file;}}:mockFiles.get(id)};
const mockSpreadsheetApp={openById:id=>({getId:()=>id,getSheetByName:()=>({})})};
const mockCacheService={getScriptCache:()=>({put:(key,value)=>mockCache.set(key,value),get:key=>mockCache.get(key)})};
const backupDeps={
 getSpreadsheet:()=>sourceSpreadsheet,
 adminRestoreValidateDatabaseSchema_:()=>({fingerprint:"fingerprint-1",sheetCount:4,rowCount:20,cellCount:100,formulaCount:3}),
 getImageReconciliationBackupCacheKey:userId=>"IMG_"+userId,
 getVinMigrationBackupCacheKey:userId=>"VIN_"+userId,
 isDirectChildOfDriveRoot:()=>true,isBackupUrlForResource:()=>true,
 ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_:"GP_DB_MANIFEST",SHEET_NAMES:{CORTES:"Cortes"},
 adminRestoreRunId_:()=>"RUN-1",logMessage:()=>{}
};
const runBackup=new Function("DriveApp","SpreadsheetApp","CacheService",...Object.keys(backupDeps),
 backupSource+"\nreturn handleBackupDatabase;")(mockDrive,mockSpreadsheetApp,mockCacheService,...Object.values(backupDeps));
const backupRequest={operationId:"reorg_test_20261123_abc123xyz"},backupOwner={userId:"U-1"};
const firstBackup=runBackup(backupRequest,backupDeps.logMessage,backupOwner);
const replayBackup=runBackup(backupRequest,backupDeps.logMessage,backupOwner);
assert.equal(firstBackup.status,"success");
assert.equal(firstBackup.reused,undefined);
assert.equal(replayBackup.status,"success");
assert.equal(replayBackup.reused,true);
assert.equal(replayBackup.backupId,firstBackup.backupId);
assert.equal(backupCopies,1,"El reintento no debe crear una segunda copia.");
assert.throws(()=>runBackup(backupRequest,backupDeps.logMessage,{userId:"U-2"}),/no coincide con la sesión/);
assert.equal(backupCopies,1,"Una sesión distinta no debe crear ni reutilizar el respaldo.");

console.log("MIG010FrontendServiceOrchestration: PASS — secuencia, reanudación idempotente, RBAC por rol y ausencia de backend→backend");
