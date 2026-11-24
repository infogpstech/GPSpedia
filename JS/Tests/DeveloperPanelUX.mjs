import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const html=fs.readFileSync(resolve(root,"index.html"),"utf8");
const css=fs.readFileSync(resolve(root,"style.css"),"utf8");
const panel=html.slice(html.indexOf('id="dev-panel-database"'),html.indexOf('id="dev-panel-images"'));
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("respaldos, restauración y base de datos comparten una sola pestaña",()=>{
 assert.ok(html.includes('id="dev-tab-database"'));
 assert.ok(panel.includes("Respaldos"));
 assert.ok(panel.includes("Datos y respaldos"));
 assert.ok(panel.includes("Migración VIN"));
 assert.ok(panel.includes("Orden de registros"));
 assert.ok(panel.includes("Limpieza de registros"));
 assert.equal((html.match(/id="dev-tab-backups"/g)||[]).length,0);
});
testCase("las acciones Developer usan ancho automático y se apilan en móvil",()=>{
 assert.match(css,/#dev-tools-modal \.dev-action-row \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap/);
 assert.match(css,/#dev-tools-modal \.dev-action-row button \{\s*flex: 0 1 auto;\s*width: auto;\s*min-width: 0/);
 assert.match(css,/@media \(max-width: 520px\)[\s\S]*?#dev-tools-modal \.dev-action-row \{\s*align-items: stretch;\s*flex-direction: column/);
 assert.match(css,/@media \(max-width: 520px\)[\s\S]*?#dev-tools-modal \.dev-action-row button \{\s*flex: 0 0 auto;\s*width: 100%/);
});
testCase("los botones Developer usan etiquetas breves y conservan nombre accesible completo",()=>{
 for(const [id,label,aria] of [
  ["btn-admin-reorganize-db","Ordenar por marca","Reorganizar la base de datos alfabéticamente por marca"],
  ["btn-admin-normalize-images","Normalizar imágenes","Normalizar nombres y quitar duplicados"],
  ["btn-admin-organize-primary-images","Organizar imágenes","Organizar imágenes principales de vehículos"],
  ["btn-admin-restore-trash","Revisar papelera","Revisar y recuperar imágenes de la papelera"]
 ]) {
  const start=html.indexOf('id="'+id+'"');
  const button=html.slice(start,html.indexOf("</button>",start));
  assert.ok(button.includes(label),id);assert.ok(button.includes('aria-label="'+aria+'"'),id);
 }
});

testCase("la consola y la línea de comandos preceden a la barra de pestañas y duplican su altura",()=>{
 const consoleIndex=html.indexOf("dev-console-shared");
 const tabsIndex=html.indexOf('class="dev-tools-tabs"');
 const commandIndex=html.indexOf('id="dev-terminal-input"');
 assert.ok(consoleIndex >= 0 && commandIndex > consoleIndex && tabsIndex > commandIndex);
 const nav=css.slice(css.lastIndexOf("/* REV-2026-11-24 — panel Developer"));
 assert.match(nav,/#dev-tools-modal \.dev-console-shared \{[\s\S]*?flex: 0 0 48%[\s\S]*?max-height: 52%/);
 assert.match(css,/#dev-tools-modal \.dev-console-output \{[\s\S]*?flex: 1 1 0/);
});
testCase("en móvil la consola conserva una altura compacta y la barra de comandos es horizontal",()=>{
 const consoleBase=css.indexOf("/* AUG-146 — consola compacta");
 const start=css.indexOf("@media (max-width: 520px)",consoleBase);
 const mobile=css.slice(start,css.indexOf("/* AUG-146 — navegación del desarrollador",start));
 assert.match(mobile,/#dev-tools-modal \.dev-console-shared \{[\s\S]*?flex-basis: 27%[\s\S]*?max-height: 30%/);
 assert.match(mobile,/#dev-tools-modal \.dev-terminal-row \{[\s\S]*?flex-direction: row/);
 assert.match(css,/#dev-tools-modal \.dev-terminal-input-shell \{[\s\S]*?display: flex/);
 assert.match(html,/class="dev-terminal-input-shell"[\s\S]*?id="dev-terminal-input"/);
 assert.match(html,/id="btn-terminal-send"[^>]*>&gt;_/);
});
testCase("limpiar y copiar comparten la fila del título y muestran solo iconos",()=>{
 const start=html.indexOf('class="dev-card-heading dev-heading-with-help"');
 const end=html.indexOf("</div>",start);
 const heading=html.slice(start,end);
 assert.ok(heading.indexOf('class="gp-help-trigger"') > heading.indexOf("<h4>"));
 assert.ok(heading.indexOf('id="btn-clear-console-log"') > heading.indexOf('class="gp-help-trigger"'));
 assert.ok(heading.indexOf('id="btn-copy-console-log"') > heading.indexOf('id="btn-clear-console-log"'));
 assert.doesNotMatch(heading,/Limpiar consola<|Copiar registro</);
});
testCase("el título del panel tiene expansión animada y respeta movimiento reducido",()=>{
 assert.match(css,/@keyframes dev-tools-title-expand/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)[\s\S]*?dev-tools-title \{ animation: none; \}/);
});
testCase("la expansión de la pestaña activa desactiva transiciones con movimiento reducido",()=>{
 const reducedMotion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
 assert.match(reducedMotion, /#dev-tools-modal \.dev-tools-sidebar,[\s\S]*?#dev-tools-modal \.dev-tab-link,[\s\S]*?#dev-tools-modal \.dev-tab-link span,[\s\S]*?#audit-drive-modal \.audit-drive-action-label\s*\{\s*transition: none !important;/);
});
testCase("limpiar y copiar expanden su etiqueta solo al recibir foco",()=>{
 assert.match(css,/#dev-tools-modal #btn-clear-console-log::after \{ content: "Limpiar consola"; \}/);
 assert.match(css,/#dev-tools-modal #btn-copy-console-log::after \{ content: "Copiar registro"; \}/);
 assert.match(css,/#dev-tools-modal #btn-clear-console-log:focus,[\s\S]*?#dev-tools-modal #btn-copy-console-log:focus \{[\s\S]*?width: 126px/);
 const reduced=css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
 assert.match(reduced,/#dev-tools-modal #btn-clear-console-log::after/);
 assert.match(reduced,/#dev-tools-modal #btn-copy-console-log::after/);
});
testCase("las pestañas muestran icono siempre y etiqueta solo en la sección seleccionada",()=>{
 const start=css.lastIndexOf("/* REV-2026-11-24 — panel Developer");
 const nav=css.slice(start);
 assert.match(nav,/#dev-tools-modal \.dev-tab-link span \{[\s\S]*?max-width: 0[\s\S]*?opacity: 0/);
 assert.match(nav,/:has\(#dev-tab-diagnostics:checked\)[\s\S]*?\.dev-tab-link\[for="dev-tab-diagnostics"\] span[\s\S]*?max-width: 150px[\s\S]*?opacity: 1/);
 assert.match(nav,/@media \(max-width: 520px\)[\s\S]*?\.dev-tab-link span \{[\s\S]*?display: inline-block/);
 assert.doesNotMatch(nav,/\.dev-tab-link span \{[^}]*display: none/);
});
testCase("consola de ancho completo, compactación y botones alineados",()=>{
 const start=css.lastIndexOf("/* REV-2026-11-24 — panel Developer");
 const nav=css.slice(start);
 assert.match(nav,/#dev-tools-modal \.dev-console-shared \{[\s\S]*?width: 100%[\s\S]*?max-width: 100%/);
 assert.match(nav,/#dev-tools-modal \.dev-tools-sidebar \{[\s\S]*?padding: 3px/);
 assert.match(nav,/\.dev-card-heading \.gp-help-trigger,[\s\S]*?#btn-clear-console-log,[\s\S]*?#btn-copy-console-log[\s\S]*?margin: 0 !important/);
});
console.log("DeveloperPanelUX: "+passed+"/"+passed+" PASS");
