import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const wrapperStart = admin.indexOf("function handleGetVehicleContributionCandidates_(payload)");
const wrapperEnd = admin.indexOf("function handleResolveVehicleContributionCandidate_", wrapperStart);
assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart, "debe existir el wrapper ADMIN de candidatos");
const wrapperSource = admin.slice(wrapperStart, wrapperEnd);
const sourceEvents = [{eventId:"EV-IMG",opId:"OP-IMG",vehicleId:"3",kind:"cut",
    payload:{image:"https://drive.google.com/file/d/FILE1234567890/view"},createdAt:"2026-11-21T00:00:00.000Z",
    status:"review",supersedesEventId:""}];
let request;
const properties = {getScriptProperties:()=>({getProperty:key=>key==="GPSpedia_CATALOG_TRAFFIC_SECRET"?"s".repeat(40):""})};
const wrapper = new Function("UrlFetchApp","CATALOG_SERVICE_URL","PropertiesService","CATALOG_TRAFFIC_SECRET_PROPERTY_",wrapperSource+String.fromCharCode(10)+"return handleGetVehicleContributionCandidates_;")(
    {fetch(url,options){request=JSON.parse(options.payload);return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
        status:"success",candidates:[],total:0,limit:500,truncated:false,
        imageInventoryCandidates:[{eventId:"EV-IMG",vehicleId:"3",vehicleLabel:"Nissan Frontier"}],
        imageInventoryEvents:sourceEvents
    })};}},"https://catalog.test/exec",properties,"GPSpedia_CATALOG_TRAFFIC_SECRET"
);
const response=wrapper({limit:500,includeImageInventoryEvents:true});
assert.equal(request.payload.includeImageInventoryEvents,true);
assert.equal(request.payload.secret,"s".repeat(40));
assert.equal(response.imageInventoryCandidates[0].eventId,"EV-IMG");
assert.equal(response.imageInventoryEvents[0].eventId,"EV-IMG");
const legacyWrapper = new Function("UrlFetchApp","CATALOG_SERVICE_URL","PropertiesService","CATALOG_TRAFFIC_SECRET_PROPERTY_",wrapperSource+String.fromCharCode(10)+"return handleGetVehicleContributionCandidates_;")(
    {fetch(url,options){return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
        status:"success",candidates:[],total:0,limit:500,truncated:false
    })};}},"https://catalog.legacy.test/exec",properties,"GPSpedia_CATALOG_TRAFFIC_SECRET"
);
const legacyResponse=legacyWrapper({limit:500,includeImageInventoryEvents:true});
assert.equal(legacyResponse.status,"success","ADMIN debe mantener fallback compatible con CATALOG aún no desplegado");
assert.equal(legacyResponse.imageInventoryEvents,undefined);

const syncStart=admin.indexOf("function syncContributionCandidateImageInventory_(currentCandidates, inventoryEvents)");
const syncEnd=admin.indexOf("function handleGetReplacedImages",syncStart);
assert.ok(syncStart>=0&&syncEnd>syncStart,"debe existir sincronización de inventario desde eventos CATALOG");
const source=admin.slice(syncStart,syncEnd);
const calls=[],appended=[];
const headers=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado",
"origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"];
const inventory={getDataRange:()=>({getValues:()=>[headers]}),getLastRow:()=>1,getRange(...args){return {setValues(rows){appended.push({args,rows});},setValue(){}};}};
const spreadsheet={getSheetByName(name){calls.push(name);return name==="Imagenes_Reemplazadas"?inventory:null;}};
const file={getName:()=>"cut.png",getMimeType:()=>"image/png",getDateCreated:()=>"2026-11-21T00:00:00.000Z",
getParents(){return {hasNext:()=>false,next:()=>null};},isTrashed:()=>false};
const sync=new Function(
"getSpreadsheet","SHEET_NAMES","getReplacedImagesReadSchema_","ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_",
"getContributionCandidateImageUrl_","extractDriveFileIds","DriveApp","getContributionCandidateInventoryId_",
"withReplacedImagesSchemaLock_","ensureReplacedImagesInventoryColumns","SpreadsheetApp",
source+String.fromCharCode(10)+"return syncContributionCandidateImageInventory_;"
)(
()=>spreadsheet,{IMAGENES_REEMPLAZADAS:"Imagenes_Reemplazadas"},
()=>({sheet:inventory,missingHeaders:[]}),"AportesVehiculo",
payload=>payload.image,url=>String(url).includes("FILE1234567890")?["FILE1234567890"]:[],
{getFileById:()=>file},eventId=>"CAND-"+eventId,fn=>fn(),()=>headers,{flush(){}}
);
const event={eventId:"EV-IMG",opId:"OP-IMG",vehicleId:"3",operationHash:"a".repeat(64),kind:"cut",
payload:{image:"https://drive.google.com/file/d/FILE1234567890/view"},createdAt:"2026-11-21T00:00:00.000Z",
status:"review",supersedesEventId:""};
const result=sync([{eventId:"EV-IMG",vehicleId:"3",vehicleLabel:"Nissan Frontier"}],[event]);
assert.equal(result.status,"success");
assert.equal(result.created,1);
assert.equal(appended.length,1);
assert.equal(appended[0].rows[0][0],"CAND-EV-IMG");
assert.equal(appended[0].rows[0][10],"requiere_revision");
assert.deepEqual(calls,["Imagenes_Reemplazadas","Imagenes_Reemplazadas"],"no debe releer AportesVehiculo desde ADMIN");
console.log("AdminCandidateImageInventoryCatalogSource: 2/2 PASS — wrapper y ledger reutilizado");
