import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
const start=admin.indexOf("function buildCortesImageModelAssociationSuggestions_(");
const end=admin.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró el motor de asociación de imágenes.");
const source=admin.slice(start,end);
const build=new Function(source+"\nreturn buildCortesImageModelAssociationSuggestions_;")();
const columns={id:1,categoria:2,marca:3,modelo:4};
const rows=[["ID","Categoria","Marca","Modelo"],
 ["V-1","Motocicleta","Yamaha","MTN155"],
 ["V-2","Motocicleta","Yamaha","MTN155"],
 ["V-3","Automóvil","Honda","Civic"]];
const metadata=[
 {fileId:"unused-image-123456789012345",fileName:"corte-civic.jpg",mimeType:"image/jpeg",folderPath:"Cortes/Honda/Civic"},
 {fileId:"unused-image-223456789012345",fileName:"IMG_01.jpg",mimeType:"image/jpeg",folderPath:"Cortes/Yamaha/MTN155"},
 {fileId:"unused-image-323456789012345",fileName:"other.jpg",mimeType:"image/jpeg",folderPath:"Cortes/Otros"}
];
const result=build(metadata,rows,new Map(),new Set(),[],columns);
assert.equal(result.summary.total,2);
assert.equal(result.summary.suggested,1);
assert.equal(result.summary.ambiguous,1);
const unique=result.suggestions.find(x=>x.fileId===metadata[0].fileId);
assert.equal(unique.status,"suggested");
assert.deepEqual(unique.candidates[0].vehicleIds,["V-3"]);
const ambiguous=result.suggestions.find(x=>x.fileId===metadata[1].fileId);
assert.equal(ambiguous.status,"ambiguous");
assert.deepEqual(ambiguous.candidates[0].vehicleIds,["V-1","V-2"]);
assert.deepEqual(ambiguous.candidates[0].rows,[2,3]);
assert.ok(ui.includes("candidate.vehicleIds")&&ui.includes("candidate.rows"));
assert.ok(admin.includes("buildCortesImageModelAssociationSuggestions_("));
assert.ok(admin.includes('setField("asociacion_candidatos_json", JSON.stringify'));
assert.ok(admin.includes('setField("asociacion_estado", association'));
assert.ok(admin.includes('asociacion_candidatos_json: valueAt(row, "asociacion_candidatos_json")'));
assert.ok(ui.includes('JSON.parse(String(rep.asociacion_candidatos_json || "[]"))'));
assert.ok(ui.includes('associationDetails.textContent = "Asociación: "'));
console.log("AdminDriveAuditAssociation: 16/16 PASS");
