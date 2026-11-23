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
const as=catalog.indexOf("function normalizeCatalogRole_"),ae=catalog.indexOf("function getSpreadsheet()",as),auth=catalog.slice(as,ae);
function sheets(role="Desarrollador",created=new Date(),activity=new Date(),token="S-1"){
 const sh=rows=>({getDataRange:()=>({getValues:()=>rows})});
 return {getSheetByName:name=>name==="Users"?sh([["id","username","password","role"],["U-1","dev","",role]]):name==="ActiveSessions"?sh([["id","username","token","date","logs","lastActivityAt"],["U-1","dev",token,created,"",activity]]):null};
}
const verify=ss=>new Function("getSpreadsheet",auth+";return verifyCatalogDeveloperSession_;")(()=>ss);
assert.equal(verify(sheets())({userId:"U-1",sessionToken:"S-1"}),true);
assert.throws(()=>verify(sheets("Técnico"))({userId:"U-1",sessionToken:"S-1"}),/Desarrollador/);
assert.throws(()=>verify(sheets("Desarrollador",new Date("2020-01-01"),new Date("2020-01-01")))({userId:"U-1",sessionToken:"S-1"}),/expiró/);
console.log("MIG010FrontendServiceOrchestration: 16/16 PASS — secuencia, reanudación, RBAC y ausencia de backend→backend");
