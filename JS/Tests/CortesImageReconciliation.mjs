import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"Services/admin.js"),"utf8");
const start=admin.indexOf("function buildCortesImageReconciliationPlan_");
const end=admin.indexOf("\n}\n",start)+2;
assert.ok(start>=0&&end>start,"planner de conciliación ausente");
const extractDriveFileIds=value=>{const text=String(value||"");const matches=[...text.matchAll(/(?:file\/d\/|id=|\/d\/)([a-zA-Z0-9_-]{20,})/g)].map(m=>m[1]);if(!matches.length&&/^[a-zA-Z0-9_-]{20,}$/.test(text))matches.push(text);return [...new Set(matches)];};
const SHEET_NAMES={CORTES:"Cortes"};
const planner=new Function("extractDriveFileIds","SHEET_NAMES",admin.slice(start,end)+";return buildCortesImageReconciliationPlan_;")(extractDriveFileIds,SHEET_NAMES);
const id=n=>"drive-file-id-000000000000000"+n;
const target=(baseName,extra={})=>({row:2,vehicleId:"V-001",field:"imagenVehiculo",column:9,baseName,currentValue:"",...extra});
const file=(n,name,mimeType="image/jpeg")=>({fileId:id(n),fileName:name,mimeType,accessPublic:true});
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("no reutiliza imágenes que ya están en el historial",()=>{
 const p=planner([target("same")],[file(1,"same.png")],new Map(),true,new Set([id(1)]));
 assert.equal(p.results[0].status,"historical");
});
testCase("bloquea destinos con fórmula aunque el valor calculado esté vacío",()=>{
 const p=planner([target("same",{hasFormula:true})],[file(1,"same.png")],new Map());
 assert.equal(p.results[0].status,"occupied");
});
testCase("clasifica como histórico un archivo sin destino canónico",()=>{
 const p=planner([], [file(1,"old-image.png")],new Map(),true,new Set([id(1)]));
 assert.equal(p.results[0].status,"historical");
});
testCase("no declara huérfanos cuando el escaneo de referencias es incompleto",()=>{
 const p=planner([], [file(1,"orphan.png")],new Map(),false);
 assert.equal(p.results[0].status,"unverifiable");
});
testCase("no propone URL si el archivo no tiene acceso público verificado",()=>{
 const p=planner([target("same")],[{...file(1,"same.png"),accessPublic:false}],new Map(),true);
 assert.equal(p.results[0].status,"access_restricted");
});
testCase("propone coincidencia exacta y URL sin realizar escrituras",()=>{
 const p=planner([target("toyota_corolla_key_2020")],[file(1,"toyota_corolla_key_2020.jpg")],new Map());
 assert.equal(p.results[0].status,"matched");assert.equal(p.results[0].target.row,2);
 assert.equal(p.results[0].proposedUrl,"https://drive.google.com/uc?export=view&id="+id(1));assert.equal(p.writePerformed,false);
});
testCase("no usa coincidencias parciales ni aproximadas",()=>{
 const p=planner([target("toyota_corolla_key_2020")],[file(1,"toyota_corolla_key_2020_repaired.jpg")],new Map());
 assert.equal(p.results[0].status,"orphaned");
});
testCase("clasifica varios destinos con el mismo nombre como ambiguos",()=>{
 const p=planner([target("same",{row:2}),target("same",{row:8,vehicleId:"V-008"})],[file(1,"same.png")],new Map());
 assert.equal(p.results[0].status,"ambiguous");
});
testCase("clasifica archivos duplicados con el mismo nombre como ambiguos",()=>{
 const p=planner([target("same")],[file(1,"same.png"),file(2,"same.jpg")],new Map());
 assert.equal(p.results.every(x=>x.status==="ambiguous"),true);
});
testCase("no sobrescribe celdas que ya contienen otra imagen",()=>{
 const p=planner([target("same",{currentValue:id(9)})],[file(1,"same.png")],new Map());
 assert.equal(p.results[0].status,"occupied");
});
testCase("reconoce el mismo ID ya vinculado al destino",()=>{
 const p=planner([target("same",{currentValue:id(1)})],[file(1,"same.png")],new Map());
 assert.equal(p.results[0].status,"already_linked");
});
testCase("no reutiliza archivos referenciados en otras celdas",()=>{
 const refs=new Map([[id(1),[{sheet:"Cortes",row:5,column:16}]]]);
 const p=planner([target("same")],[file(1,"same.png")],refs);
 assert.equal(p.results[0].status,"referenced_elsewhere");
});
testCase("separa huérfanos de archivos referenciados fuera de Cortes",()=>{
 const refs=new Map([[id(2),[{sheet:"Tutorial",row:3,column:3}]]]);
 const p=planner([], [file(1,"orphan.png"),file(2,"other.png")],refs);
 assert.deepEqual(p.results.map(x=>x.status).sort(),["orphaned","referenced_elsewhere"]);
});
testCase("rechaza archivos sin ID válido o sin MIME de imagen",()=>{
 const p=planner([], [{fileId:"bad",fileName:"a.png",mimeType:"image/png"},file(2,"b.pdf","application/pdf")],new Map());
 assert.equal(p.invalidFiles.length,2);assert.equal(p.counts.invalid,2);
});
testCase("deduplica el mismo ID de Drive y devuelve conteos coherentes",()=>{
 const f=file(1,"same.png"),p=planner([target("same")],[f,{...f}],new Map());
 assert.equal(p.results.length,1);assert.equal(p.counts.matched,1);assert.equal(p.counts.invalid,0);
});
assert.match(admin,/function collectReplacedImageHistoryIds_\(/);
assert.match(admin,/extractDriveFileIds\(row\[8\]\)/);
console.log("CortesImageReconciliation: "+passed+"/"+passed+" PASS");
