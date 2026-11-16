import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"JS/Services/admin.js"),"utf8");
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
const validatorStart=admin.indexOf("function buildCortesImageReconciliationApprovalManifest_");
const validatorEnd=admin.indexOf("\n}\n",validatorStart)+2;
assert.ok(validatorStart>=0&&validatorEnd>validatorStart,"validador de aprobaciones ausente");
const validator=new Function(admin.slice(validatorStart,validatorEnd)+";return buildCortesImageReconciliationApprovalManifest_;")();
const digest="a".repeat(64);
const approved=(extra={})=>({fileId:id(1),row:2,column:9,vehicleId:"V-001",field:"imagenVehiculo",proposedUrl:"https://drive.google.com/uc?export=view&id="+id(1),...extra});
const matchedPlan=()=>({writePerformed:false,manifestDigest:digest,results:[{status:"matched",fileId:id(1),fileName:"same.png",target:target("same"),proposedUrl:"https://drive.google.com/uc?export=view&id="+id(1)}]});
testCase("el manifiesto acepta solo una propuesta exacta del preview",()=>{
 const result=validator(matchedPlan(),[approved()],digest);
 assert.equal(result.length,1);assert.equal(result[0].fileId,id(1));assert.equal(result[0].column,9);
});
testCase("rechaza digest distinto y resultados que no sean matched",()=>{
 assert.throws(()=>validator(matchedPlan(),[approved()],"b".repeat(64)),/no coincide/);
 const plan=matchedPlan();plan.results[0].status="occupied";
 assert.throws(()=>validator(plan,[approved()],digest),/coincidencia segura/);
});
testCase("rechaza fila, campo, columna o URL alterados",()=>{
 for(const change of [{row:3},{column:10},{field:"imgCorte2"},{proposedUrl:"https://example.com/"}]) assert.throws(()=>validator(matchedPlan(),[approved(change)],digest));
});
testCase("rechaza archivo o celda aprobados más de una vez",()=>{
 assert.throws(()=>validator(matchedPlan(),[approved(),approved()],digest),/dos veces/);
 const plan=matchedPlan();plan.results.push({...plan.results[0],fileId:id(2),target:{...plan.results[0].target}});
 assert.throws(()=>validator(plan,[approved(),approved({fileId:id(2),proposedUrl:"https://drive.google.com/uc?export=view&id="+id(2)})],digest),/misma celda/);
});
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

testCase("solo anyone/reader por enlace y no indexable se considera público por diseño",()=>{
 const drive={Permissions:{list:id=>({permissions:id==="file-1"?[{type:"anyone",role:"reader",allowFileDiscovery:false}]:[]})}};
 const start=admin.indexOf("function getDrivePermissionsForImageResource_"),end=admin.indexOf("\n}\n",start)+2;
 const classStart=admin.indexOf("function classifyCortesImageAcl_"),classEnd=admin.indexOf("\n}\n",classStart)+2;
 const classify=new Function("Drive",admin.slice(start,end)+"\n"+admin.slice(classStart,classEnd)+"\nreturn classifyCortesImageAcl_;")(drive);
 const result=classify([{resourceId:"file-1",resourceType:"file",resourceName:"active.png"}],new Map());
 assert.equal(result.accessClass,"public_link_viewer");assert.equal(result.accessPublic,true);assert.equal(result.publicByDesign,true);
});
testCase("bloquea acceso web indexable y permisos públicos de escritura",()=>{
 const make=permissions=>new Function("Drive",
  admin.slice(admin.indexOf("function getDrivePermissionsForImageResource_"),admin.indexOf("\n}\n",admin.indexOf("function getDrivePermissionsForImageResource_"))+2)+"\n"+
  admin.slice(admin.indexOf("function classifyCortesImageAcl_"),admin.indexOf("\n}\n",admin.indexOf("function classifyCortesImageAcl_"))+2)+
  "\nreturn classifyCortesImageAcl_;")({Permissions:{list:()=>({permissions})}});
 const web=make([{type:"anyone",role:"reader",allowFileDiscovery:true}])([{resourceId:"f",resourceType:"file"}],new Map());
 const writer=make([{type:"anyone",role:"writer",allowFileDiscovery:false}])([{resourceId:"f",resourceType:"file"}],new Map());
 assert.equal(web.accessClass,"public_web_viewer");assert.equal(web.accessPublic,false);
 assert.equal(writer.accessClass,"public_write");assert.equal(writer.accessPublic,false);
});
testCase("hereda la clasificación pública de una carpeta superior",()=>{
 const drive={Permissions:{list:id=>({permissions:id==="folder-cortes"?[{type:"anyone",role:"reader",allowFileDiscovery:false}]:[]})}};
 const start=admin.indexOf("function getDrivePermissionsForImageResource_"),end=admin.indexOf("\n}\n",start)+2;
 const classStart=admin.indexOf("function classifyCortesImageAcl_"),classEnd=admin.indexOf("\n}\n",classStart)+2;
 const classify=new Function("Drive",admin.slice(start,end)+"\n"+admin.slice(classStart,classEnd)+"\nreturn classifyCortesImageAcl_;")(drive);
 const result=classify([{resourceId:"file-1",resourceType:"file"},{resourceId:"folder-cortes",resourceType:"folder",resourceName:"Cortes"}],new Map());
 assert.equal(result.accessClass,"public_link_viewer");assert.equal(result.accessSources[0].resourceType,"folder");
});
testCase("falla de Drive API, rol desconocido o allowFileDiscovery ausente se clasifican como no verificables",()=>{
 const source=admin.slice(admin.indexOf("function getDrivePermissionsForImageResource_"),admin.indexOf("\n}\n",admin.indexOf("function getDrivePermissionsForImageResource_"))+2)+"\n"+
  admin.slice(admin.indexOf("function classifyCortesImageAcl_"),admin.indexOf("\n}\n",admin.indexOf("function classifyCortesImageAcl_"))+2)+"\nreturn classifyCortesImageAcl_;";
 const unavailable=new Function("Drive",source)(undefined);
 assert.equal(unavailable([{resourceId:"f"}],new Map()).accessClass,"unverifiable");
 const unknown=new Function("Drive",source)({Permissions:{list:()=>({permissions:[{type:"anyone",role:"manager"}]})}});
 assert.equal(unknown([{resourceId:"f"}],new Map()).accessClass,"unverifiable");
 const missingDiscovery=new Function("Drive",source)({Permissions:{list:()=>({permissions:[{type:"anyone",role:"reader"}]})}});
 assert.equal(missingDiscovery([{resourceId:"f"}],new Map()).accessClass,"unverifiable");
});
testCase("sigue la paginación de ACL antes de clasificar",()=>{
 let calls=0;
 const drive={Permissions:{list:(id,options)=>{calls++;return options.pageToken
  ? {permissions:[{type:"anyone",role:"reader",allowFileDiscovery:false}]}
  : {permissions:[],nextPageToken:"next"};}}};
 const start=admin.indexOf("function getDrivePermissionsForImageResource_"),end=admin.indexOf("\n}\n",start)+2;
 const classStart=admin.indexOf("function classifyCortesImageAcl_"),classEnd=admin.indexOf("\n}\n",classStart)+2;
 const classify=new Function("Drive",admin.slice(start,end)+"\n"+admin.slice(classStart,classEnd)+"\nreturn classifyCortesImageAcl_;")(drive);
 const result=classify([{resourceId:"f"}],new Map());
 assert.equal(calls,2);assert.equal(result.accessClass,"public_link_viewer");
});
testCase("identifica referencias de Cortes fuera del inventario, en papelera y no disponibles",()=>{
 const start=admin.indexOf("function findMissingCortesDriveReferences_"),end=admin.indexOf("\n}\n",start)+2;
 const files={
  outside:{isTrashed:()=>false,location:"outside"},
  trashed:{isTrashed:()=>true,location:"inside"},
  inside:{isTrashed:()=>false,location:"inside"},
  ambiguous:{isTrashed:()=>false,location:"ambiguous"}
 };
 const DriveApp={getFileById:id=>{if(id==="missing")throw new Error("not found or access denied");return files[id];}};
 const parent=file=>{if(file.location==="outside")throw new Error("ubicación fuera del árbol Cortes");if(file.location==="ambiguous")throw new Error("no se pudo confirmar una única carpeta principal");return {};};
 const find=new Function("SHEET_NAMES","DriveApp","getSingleParentFolderInsideCortes",admin.slice(start,end)+"\nreturn findMissingCortesDriveReferences_;")(
  {CORTES:"Cortes"},DriveApp,parent);
 const refs=new Map([
  ["outside",[{sheet:"Cortes",row:3,column:9}]],["trashed",[{sheet:"Cortes",row:4,column:9}]],
  ["inside",[{sheet:"Cortes",row:5,column:9}]],["ambiguous",[{sheet:"Cortes",row:6,column:9}]],
  ["missing",[{sheet:"Cortes",row:7,column:9}]],["other-sheet",[{sheet:"Tutorial",row:8,column:3}]]
 ]);
 const result=find(refs,[], "root");
 assert.equal(result.verified,true);assert.equal(result.totalMissingReferences,5);
 assert.deepEqual(result.missingReferences.map(item=>item.status).sort(),
  ["ambiguous_location","missing_from_audit","missing_or_unverifiable","outside_cortes_tree","trashed"].sort());
});
testCase("solo el acceso por enlace lector permite asignar y marca exposición innecesaria",()=>{
 const active=planner([target("same")],[{...file(1,"same.png"),accessClass:"public_link_viewer"}],new Map());
 assert.equal(active.results[0].status,"matched");assert.equal(active.results[0].publicityCompliance,"compliant");
 const web=planner([target("same")],[{...file(1,"same.png"),accessClass:"public_web_viewer",accessPublic:false}],new Map());
 assert.equal(web.results[0].status,"access_restricted");assert.equal(web.results[0].publicityCompliance,"too_broad");
 const unused=planner([], [{...file(1,"orphan.png"),accessClass:"public_link_viewer"}],new Map());
 assert.equal(unused.results[0].publicityRequirement,"not_required");
 assert.equal(unused.results[0].publicityCompliance,"public_not_required");
});
testCase("detecta ACL no permitida en imágenes ya referenciadas",()=>{
 const refs=new Map([[id(1),[{sheet:"Cortes",row:5,column:9}]]]);
 const p=planner([], [{...file(1,"active.png"),accessPublic:false,accessClass:"restricted",accessReason:"sin permiso público"}],refs);
 assert.equal(p.results[0].status,"access_restricted");
 assert.equal(p.results[0].referenceStatus,"referenced_elsewhere");
 assert.equal(p.results[0].publicityCompliance,"missing_public_access");
});
assert.match(admin,/Drive\.Permissions\.list/);

console.log("CortesImageReconciliation: "+passed+"/"+passed+" PASS");
