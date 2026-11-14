import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const ui=read("JS/Frontend/ui.js"),html=read("index.html"),css=read("style.css"),admin=read("Services/admin.js");
const helperStart=ui.indexOf("function getReplacedImageCapabilities_(");
const helperEnd=ui.indexOf("\n}\n",helperStart)+2;
assert.ok(helperStart>=0&&helperEnd>helperStart,"helper de capacidades ausente");
const capabilities=new Function(ui.slice(helperStart,helperEnd)+"; return getReplacedImageCapabilities_;")();
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("La descarga se limita a Desarrollador y a registros sin referencias activas",()=>{
 const item={tipo_registro:"reemplazada",estado:"historica",active_reference_count:0};
 assert.equal(capabilities(item,true,"verified","Desarrollador").canDownload,true);
 assert.equal(capabilities(item,true,"verified","Tecnico").canDownload,false);
 assert.equal(capabilities({...item,active_reference_count:1},true,"verified","Desarrollador").canDownload,false);
});
testCase("Las acciones de gestión requieren esquema y referencias verificadas",()=>{
 const item={tipo_registro:"reemplazada",estado:"historica",active_reference_count:0};
 const blocked=capabilities(item,false,"unavailable","Desarrollador");
 assert.equal(blocked.canMove,false);assert.equal(blocked.canTrash,false);assert.equal(blocked.canRecover,false);
 assert.equal(blocked.canDownload,false);
});
testCase("La papelera permite restaurar pero no descargar como imagen histórica",()=>{
 const item={tipo_registro:"reemplazada",estado:"en_papelera",active_reference_count:0};
 const result=capabilities(item,true,"verified","Desarrollador");
 assert.equal(result.canRestoreFromTrash,true);assert.equal(result.canPermanentlyDelete,true);
 assert.equal(result.canDownload,false);assert.equal(result.canRecover,false);
});
testCase("Los registros con referencias activas no ofrecen mover, borrar ni eliminar definitivamente",()=>{
 const item={tipo_registro:"reemplazada",estado:"historica",active_reference_count:2};
 const result=capabilities(item,true,"verified","Desarrollador");
 assert.equal(result.canMove,false);assert.equal(result.canTrash,false);assert.equal(result.canPermanentlyDelete,false);
});
testCase("La biblioteca incluye selección individual, selección visible y acciones por lote",()=>{
 ["replaced-images-select-all","replaced-images-selection-count","btn-replaced-bulk-move","btn-replaced-bulk-restore","btn-replaced-bulk-trash","btn-replaced-clear-selection"].forEach(id=>assert.ok(html.includes('id="'+id+'"'),id));
 assert.match(ui,/selectCheckbox\.onchange/);assert.match(ui,/selectAllCheckbox\.onchange/);
 assert.match(ui,/selectedIds\.clear\(\); failures\.forEach/);
});
testCase("El menú contextual expone las acciones permitidas y conserva confirmaciones",()=>{
 ["getReplacedImageDownloadUrl","moveReplacedImage","recoverReplacedImage","restoreReplacedImageFromTrash","deleteReplacedImage","permanentlyDeleteReplacedImage","markReplacedImageInUse"].forEach(action=>assert.ok(ui.includes('routeAction("'+action+'"'),action));
 assert.match(ui,/aria-haspopup", "menu"/);assert.match(ui,/setAttribute\("role", "menuitem"\)/);
 assert.match(ui,/confirm\("Esta acción es irreversible/);assert.match(ui,/El servidor volverá a validar las referencias/);
});
testCase("Los menús se cierran al hacer clic fuera, con Escape y al cerrar el modal",()=>{
 assert.match(ui,/closeMenusHandler = event =>/);assert.match(ui,/closeMenusKeyHandler = event => \{ if \(event\.key === "Escape"\)/);
 assert.match(ui,/removeEventListener\("click", closeMenusHandler\)/);assert.match(ui,/removeEventListener\("keydown", closeMenusKeyHandler\)/);
});
testCase("Las operaciones por lote son secuenciales y reportan fallos parciales",()=>{
 assert.match(ui,/for \(let index = 0; index < items\.length; index\+\+\)/);
 assert.match(ui,/failures\.push\(\{ id:/);assert.match(ui,/procesadas; .* requieren revisión/);
 assert.match(ui,/El servidor validará cada archivo por separado/);
});
testCase("Las vistas usan miniaturas distintas y mantienen accesibilidad",()=>{
 assert.match(ui,/currentView === "grid" \? IMG_SIZE_MEDIUM : IMG_SIZE_SMALL/);
 assert.match(ui,/replaced-image-list-thumb/);
 assert.match(html,/aria-label="Vista de cuadrícula" aria-pressed="true"/);
 assert.match(html,/aria-label="Vista de lista" aria-pressed="false"/);
 assert.match(html,/role="dialog" aria-modal="true" aria-labelledby="replaced-images-title"/);
});
testCase("La vista de lista y la cuadrícula responden a pantallas móviles",()=>{
 assert.match(css,/\.replaced-images-list\.view-grid \{ grid-template-columns: repeat\(auto-fill, minmax\(215px, 1fr\)\)/);
 assert.match(css,/@media \(max-width: 680px\)/);
 assert.match(css,/\.replaced-images-list\.view-list \.replaced-image-list-thumb/);
 assert.match(css,/\.replaced-image-menu-panel\[hidden\] \{ display: none !important; \}/);
});
testCase("El endpoint de descarga conserva el control backend exclusivo de Desarrollador",()=>{
 assert.match(admin,/ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)/);
 const i=admin.indexOf("getReplacedImageDownloadUrl");
 assert.ok(i>=0);assert.equal(admin.slice(admin.indexOf("const ADMIN_MODAL_EDIT_ACTIONS"),admin.indexOf("function ")).includes("getReplacedImageDownloadUrl"),false);
});
testCase("La interfaz no incluye eliminación definitiva en acciones masivas",()=>{
 assert.ok(html.includes('id="btn-replaced-bulk-trash"'));
 assert.equal(html.includes('id="btn-replaced-bulk-permanent-delete"'),false);
});
console.log("ReplacedImagesLibraryUX: "+passed+"/"+passed+" PASS");
