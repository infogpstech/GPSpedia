import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=admin.indexOf("function writeDriveInventoryRowVerified_(");
const end=admin.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró el escritor verificado del inventario.");
const source=admin.slice(start,end);
const headers=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado",
 "origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario",
 "drive_folder_id","formato_archivo","tamano_bytes","fecha_modificacion_drive","referencias_catalogo_json","asociacion_estado","asociacion_confianza","asociacion_candidatos_json"];
const fileId="image-file-id-123456789012345";
const row=Array(headers.length).fill("");
const put=(name,value)=>{row[headers.indexOf(name)]=value;};
put("id_reemplazo","INV-"+fileId);put("archivo_drive_id",fileId);put("estado","sin_uso_detectado");
put("ultima_auditoria_id","audit-123");put("ultima_operacion_inventario_id","operation-123");
put("resultado_inventario","confirmado");put("estado_organizacion","pendiente");put("ubicacion_actual","Cortes/Honda/Civic");
put("drive_folder_id","folder-12345678901234567890");put("formato_archivo","jpg");put("tamano_bytes",5120);
put("fecha_modificacion_drive","2026-11-25 10:00:00");put("referencias_catalogo_json","[]");
const cells=[headers,row.slice()];
const sheet={getRange(r,c,n=1,w=1){return{
 getValues(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>cells[r-1+i]?.[c-1+j]??""));},
 setValues(values){values.forEach((rr,i)=>rr.forEach((v,j)=>{cells[r-1+i][c-1+j]=v;}));return this;}
};}};
let flushes=0;
const write=new Function("extractDriveFileId","SpreadsheetApp",source+"\nreturn writeDriveInventoryRowVerified_;")(
 value=>String(value||"").replace(/^.*\/d\//,"").replace(/\/view.*$/,""),{flush(){flushes++;}});
const saved=write(sheet,2,row,headers,fileId,"audit-123","operation-123","sin_uso_detectado","confirmado","pendiente","Cortes/Honda/Civic");
for(const name of ["drive_folder_id","formato_archivo","tamano_bytes","fecha_modificacion_drive","referencias_catalogo_json","asociacion_estado","asociacion_confianza","asociacion_candidatos_json"])
 assert.equal(saved[headers.indexOf(name)],row[headers.indexOf(name)],name+" no se confirmó en read-back");
assert.equal(flushes,1);
console.log("AdminDriveAuditMetadataPersistence: 10/10 PASS");
