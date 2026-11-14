import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const html=fs.readFileSync(resolve(root,"HTML/add_cortes.html"),"utf8");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("Año, versión, tipo de corte y relay tienen ayudas breves asociadas",()=>{
 for(const [id,phrase] of [["help-ano-desde","rango continuo"],["help-versiones","nivel de equipamiento"],["help-tipo-corte","diagrama eléctrico"],["help-config-relay","esquema de conexión"]]){
  assert.ok(html.includes("aria-controls=\""+id+"\""));assert.ok(html.includes("id=\""+id+"\" role=\"tooltip\" hidden"));assert.ok(html.includes(phrase),id);
 }
});
testCase("Las ayudas son botones accesibles y no alteran el envío del formulario",()=>{
 assert.equal((html.match(/class="gp-help-trigger"/g)||[]).length,4);
 assert.ok(html.includes("aria-label=\"Ayuda sobre el año\""));assert.ok(html.includes("aria-label=\"Ayuda sobre la configuración de relay\""));
});
testCase("El patrón contextual tiene foco visible, contraste por tema y estado oculto",()=>{
 assert.ok(html.includes(".gp-help-trigger:focus-visible"));assert.ok(html.includes("var(--gp-color-info-bg)"));assert.ok(html.includes(".gp-help-popover[hidden] { display: none; }"));
});
testCase("La ayuda se controla por pulsación, se cierra fuera y permite Escape",()=>{
 assert.ok(html.includes("document.addEventListener(\'click\', event =>"));assert.ok(html.includes("event.key === \'Escape\'"));assert.ok(html.includes("closeContextHelp(true)"));
});
testCase("la ayuda dinámica se cierra al pulsar fuera y anuncia el panel asociado",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 assert.ok(ui.includes('document.addEventListener("click", event =>'));
 assert.ok(ui.includes('element.closest(".gp-context-help-panel")'));
 assert.ok(ui.includes('trigger.setAttribute("aria-describedby", panel.id)'));
 assert.ok(ui.includes('closeContextualHelpPanels_(true)'));
 assert.ok(ui.includes('active.focus()'));
});
testCase("el alta de tutorial y los controles Developer tienen ayuda contextual",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 const tutorial=ui.slice(ui.indexOf("export function openAddTutorialModal"),ui.indexOf("export async function openAssociateExistingProblemModal"));
 for(const id of ["tut-tema","tut-como-identificarlo","tut-donde-encontrarlo","tut-desc"]) assert.ok(tutorial.includes('attachContextualHelp_(content, "'+id+'"'),id);
 const developer=ui.slice(ui.indexOf("const openDevToolsModal_"),ui.indexOf("export async function openDevTools"));
 for(const id of ["recalculate-vin-signatures-checkbox","diagnose-vin-signatures-checkbox","clear-activity-logs-checkbox","clear-logs-option-select","clear-sensitive-logs-checkbox"]) assert.ok(developer.includes('attachContextualHelp_(modal, "'+id+'"'),id);
});
testCase("el modal de detalles de vehículos permanece sin ayudas contextuales",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 const start=ui.indexOf("function mostrarDetalleModal");
 const end=ui.indexOf("\nfunction ",start+10);
 assert.ok(start>=0&&end>start);
 assert.equal(ui.slice(start,end).includes("attachContextualHelp_"),false);
});

testCase("Los formularios dinámicos de sugerencias PYS incluyen ayudas asociadas y accesibles",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 assert.match(ui,/function attachContextualHelp_\(root, fieldId, message\)/);
 for(const id of ["sug-tipo","sug-relay","sug-ubicacion","sug-color","sug-check-engine","sug-detalles","tut-tema","tut-como-identificarlo","tut-donde-encontrarlo","tut-desc"]){ assert.ok(ui.includes('attachContextualHelp_(content, "'+id+'"'),id); }
 assert.match(ui,/setAttribute\("role", "tooltip"\)/);assert.match(ui,/event.key !== "Escape"/);assert.match(ui,/active.focus\(\)/);
 assert.match(fs.readFileSync(resolve(root,"style.css"),"utf8"),/\.gp-context-help-trigger:focus-visible/);
});

testCase("el formulario de alta PYS explica alcance, modelos, título, evidencia y solución",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 for(const id of ["pys-alcance","pys-search-vehicle","pys-titulo","pys-img-file","pys-detalle","pys-sin-solucion","pys-solucion","pys-prevenir","assoc-search-input"]){
  assert.ok(ui.includes('attachContextualHelp_(content, "'+id+'"'),id);
  assert.ok(ui.includes('for="'+id+'"'),"label asociado: "+id);
 }
});
testCase("respaldo y base de datos permanecen en la misma pestaña y sus controles son compactos",()=>{
 const index=fs.readFileSync(resolve(root,"index.html"),"utf8");
 const panel=index.slice(index.indexOf('id="dev-panel-database"'),index.indexOf('id="dev-panel-images"'));
 for(const id of ["backup-management-panel","btn-admin-backup-db","btn-admin-restore-db","btn-admin-preview-vin-migration","btn-admin-confirm-vin-migration","btn-admin-clear-selected-logs"])assert.ok(panel.includes('id="'+id+'"'),id);
 const css=fs.readFileSync(resolve(root,"style.css"),"utf8");
 assert.match(css,/grid-template-columns: repeat\(auto-fit, minmax\(170px, 1fr\)\)/);
 assert.match(css,/@media \(max-width: 520px\)/);
});

testCase("la burbuja queda fuera de etiquetas checkbox y se coloca después del control de ayuda",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 assert.ok(ui.includes("labelParent.insertBefore(panel, row.nextSibling)"));
 assert.ok(ui.includes("const label = root.querySelector('label[for=\"' + fieldId + '\"]')"));
 assert.ok(ui.includes("const field = root.querySelector(\"#\" + fieldId)"));
});
testCase("el formulario PYS registra cada ayuda una sola vez",()=>{
 const ui=fs.readFileSync(resolve(root,"JS/Frontend/ui.js"),"utf8");
 const start=ui.indexOf("export function openAddProblemModal");
 const end=ui.indexOf("export function openSearchVehicleForPysAssociationModal",start);
 const body=ui.slice(start,end);
 assert.equal((body.match(/attachContextualHelp_\(content, \"pys-/g)||[]).length,8);
});
console.log("ContextualHelpForms: "+passed+"/"+passed+" PASS");
