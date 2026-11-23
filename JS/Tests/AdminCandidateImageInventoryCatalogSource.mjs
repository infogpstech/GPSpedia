import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const catalog=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
assert.equal(admin.includes("CATALOG_SERVICE_URL"),false);
assert.equal(admin.includes("CATALOG_TRAFFIC_SECRET_PROPERTY_"),false);
assert.equal(admin.includes("handleGetVehicleContributionCandidates_"),false);
assert.ok(ui.includes("includeImageInventoryCandidates:true"));
const start=admin.indexOf("function syncContributionCandidateImageInventory_(currentCandidates)"),end=admin.indexOf("function handleGetReplacedImages",start);
assert.ok(start>=0&&end>start);
const source=admin.slice(start,end);
const headers=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado","origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"];
const image="https://drive.google.com/file/d/FILE1234567890/view";
const eventRow=["EV-IMG","OP-IMG","3","a".repeat(64),"cut",JSON.stringify({image}),"USER","Dev","2026-11-21T00:00:00.000Z","review",""];
function harness(){
 const rows=[headers.slice()],ledgerRows=[["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"],eventRow];
 const inventory={getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),getLastRow:()=>rows.length,getRange(row,col){return{setValues(values){values.forEach((v,i)=>{rows[row-1+i]=v.slice();});},setValue(value){rows[row-1][col-1]=value;}};}};
 const ledger={getLastRow:()=>ledgerRows.length,getRange:()=>({getValues:()=>ledgerRows.slice(1).map(r=>r.slice())})};
 const ss={getSheetByName:name=>name==="Imagenes_Reemplazadas"?inventory:name==="AportesVehiculo"?ledger:null};
 const fn=new Function("getSpreadsheet","SHEET_NAMES","getReplacedImagesReadSchema_","ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_","getContributionCandidateImageUrl_","extractDriveFileIds","DriveApp","getContributionCandidateInventoryId_","withReplacedImagesSchemaLock_","ensureReplacedImagesInventoryColumns","SpreadsheetApp",source+";return syncContributionCandidateImageInventory_;")(
  ()=>ss,{IMAGENES_REEMPLAZADAS:"Imagenes_Reemplazadas"},()=>({sheet:inventory,missingHeaders:[]}),"AportesVehiculo",
  p=>p.image,()=>["FILE1234567890"],
  {getFileById:()=>({getName:()=>"cut.png",getMimeType:()=>"image/png",getDateCreated:()=>"2026-11-21T00:00:00.000Z",getParents:()=>({hasNext:()=>false}),isTrashed:()=>false})},
  id=>"CAND-"+id,fn=>fn(),()=>headers,{flush(){}}
 );
 return{fn,rows};
}
const candidate={eventId:"EV-IMG",vehicleId:"3",vehicleLabel:"No se confía en esta etiqueta"};
{
 const h=harness(),result=h.fn([candidate]);
 assert.equal(result.status,"success");assert.equal(result.created,1);assert.equal(h.rows.length,2);
 assert.equal(h.rows[1][0],"CAND-EV-IMG");assert.equal(h.rows[1][9],"Vehículo 3");
}
{
 const h=harness();h.fn([candidate]);const result=h.fn([candidate]);
 assert.equal(result.created,0);assert.equal(result.skipped,1);assert.equal(h.rows.length,2);
}
{
 const h=harness(),result=h.fn([{eventId:"EV-IMG",vehicleId:"999"}]);
 assert.equal(result.created,0);assert.equal(h.rows.length,1);
}
{
 const h=harness(),result=h.fn([{eventId:"EV-NOT-LOCAL",vehicleId:"3"}]);
 assert.equal(result.created,0);assert.equal(h.rows.length,1);
}
assert.ok(catalog.includes("verifyCatalogDeveloperSession_(payload)"));
console.log("AdminCandidateImageInventoryCatalogSource: 4/4 PASS — CATALOG frontend, ledger local autoritativo");
