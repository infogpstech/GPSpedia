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
    {fetch(){return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
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
const headers=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado",
"origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"];
const imageA="https://drive.google.com/file/d/FILE1234567890/view";
const imageB="https://drive.google.com/file/d/FILE0987654321/view";
const event=(overrides={})=>({eventId:"EV-IMG",opId:"OP-IMG",vehicleId:"3",operationHash:"a".repeat(64),kind:"cut",
    payload:{image:imageA},createdAt:"2026-11-21T00:00:00.000Z",status:"review",supersedesEventId:"",...overrides});
const candidate={eventId:"EV-IMG",vehicleId:"3",vehicleLabel:"Nissan Frontier"};
function makeHarness(initialRows=[headers]) {
    const rows=initialRows.map(row=>row.slice()), calls=[], writes=[];
    const inventory={
        getDataRange(){return {getValues:()=>rows.map(row=>row.slice())};},
        getLastRow(){return rows.length;},
        getRange(row,column,rowCount=1,columnCount=1){
            return {
                setValues(values){
                    writes.push({type:"setValues",row,column,values:values.map(v=>v.slice())});
                    values.forEach((valuesRow,r)=>{while(rows.length<row+r)rows.push([]);rows[row-1+r]=valuesRow.slice();});
                },
                setValue(value){
                    writes.push({type:"setValue",row,column,value});
                    while(rows.length<row)rows.push([]);
                    while(rows[row-1].length<column)rows[row-1].push("");
                    rows[row-1][column-1]=value;
                }
            };
        }
    };
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
        payload=>payload.image,url=>String(url).includes("FILE1234567890")?["FILE1234567890"]:String(url).includes("FILE0987654321")?["FILE0987654321"]:[],
        {getFileById:()=>file},eventId=>"CAND-"+eventId,fn=>fn(),()=>headers,{flush(){}}
    );
    return {sync,rows,calls,writes};
}
function candidateRow(overrides={}) {
    const row=Array(headers.length).fill("");
    row[0]="CAND-EV-IMG";row[1]="2026-11-21T00:00:00.000Z";row[2]="aporte_candidato";row[3]="3";row[4]="cut";
    row[5]="FILE1234567890";row[6]="cut.png";row[7]=imageA;row[9]="Nissan Frontier";row[10]="requiere_revision";
    row[11]="aporte_vehiculo";row[12]="image/png";row[18]="EV-IMG";row[19]="candidata_aporte";
    row[24]="OP-IMG";
    Object.entries(overrides).forEach(([key,value])=>{row[Number(key)]=value;});
    return row;
}
{
    const h=makeHarness();
    const result=h.sync([candidate],[event()]);
    assert.equal(result.status,"success");
    assert.equal(result.created,1);
    assert.equal(h.rows.length,2);
    assert.equal(h.rows[1][0],"CAND-EV-IMG");
    assert.equal(h.rows[1][10],"requiere_revision");
    assert.deepEqual(h.calls,["Imagenes_Reemplazadas","Imagenes_Reemplazadas"],"no debe releer AportesVehiculo desde ADMIN");
}
{
    const h=makeHarness();
    const first=h.sync([candidate],[event()]);
    const second=h.sync([candidate],[event()]);
    assert.equal(first.created,1);
    assert.equal(second.created,0);
    assert.equal(second.skipped,1);
    assert.equal(h.rows.length,2,"el replay no debe anexar una segunda fila");
    assert.equal(h.writes.length,1,"el replay idéntico no debe escribir");
}
{
    const h=makeHarness([headers,candidateRow()]);
    h.rows[1][10]="requiere_revision";
    const resolution=event({eventId:"EV-RES",opId:"OP-RES",payload:{image:imageA},status:"accepted",supersedesEventId:"EV-IMG"});
    const result=h.sync([candidate],[event(),resolution]);
    assert.equal(result.updated,1,"la resolución aceptada debe actualizar el estado automático pendiente");
    assert.equal(h.rows[1][10],"en_uso");
    assert.equal(h.rows[1][5],"FILE1234567890");
    assert.equal(h.rows[1][7],imageA);
    assert.equal(h.rows[1][9],"Nissan Frontier");
    assert.deepEqual(h.writes.map(write=>[write.type,write.row,write.column]),[["setValue",2,11]],
        "solo puede cambiar el estado automático; no URL, referencia ni metadatos históricos");
}
{
    const h=makeHarness([headers,candidateRow()]);
    h.rows[1][10]="en_papelera";
    const resolution=event({eventId:"EV-RES",opId:"OP-RES",payload:{image:imageB},status:"accepted",supersedesEventId:"EV-IMG"});
    const result=h.sync([candidate],[event(),resolution]);
    assert.equal(result.updated,0);
    assert.equal(result.skipped,1);
    assert.equal(h.rows[1][10],"en_papelera","un estado manual no debe ser sustituido por la resolución automática");
    assert.equal(h.rows[1][5],"FILE1234567890");
    assert.equal(h.rows[1][7],imageA);
    assert.equal(h.writes.length,0);
}
{
    const h=makeHarness([headers,candidateRow(),candidateRow()]);
    const result=h.sync([candidate],[event()]);
    assert.equal(result.created,0);
    assert.equal(result.updated,0);
    assert.equal(result.skipped,1);
    assert.equal(result.errors.length,1);
    assert.match(result.errors[0].message,/varias filas/);
    assert.equal(h.writes.length,0,"IDs duplicados no autorizan a modificar ninguna fila");
}
{
    const conflicting=candidateRow({"5":"FILE0987654321","7":imageB});
    const h=makeHarness([headers,conflicting]);
    const result=h.sync([candidate],[event()]);
    assert.equal(result.created,0);
    assert.equal(result.updated,0);
    assert.equal(result.skipped,1);
    assert.equal(result.errors.length,1);
    assert.match(result.errors[0].message,/no coincide con la identidad/);
    assert.equal(h.rows[1][5],"FILE0987654321");
    assert.equal(h.rows[1][7],imageB);
    assert.equal(h.writes.length,0,"un opId/eventId reutilizado con otra identidad no debe sobrescribir el historial");
}
{
    const h=makeHarness();
    h.sync([candidate],[event()]);
    assert.equal(h.calls.every(name=>name==="Imagenes_Reemplazadas"),true,
        "la sincronización no debe escribir ni cambiar referencias de Cortes");
}
console.log("AdminCandidateImageInventoryCatalogSource: 7/7 PASS — origen CATALOG, replay, estados manuales e identidad protegida");
