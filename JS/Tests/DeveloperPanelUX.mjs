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

testCase("la consola está sobre las pestañas y ocupa menos del 30% del modal en escritorio",()=>{
 assert.ok(html.indexOf('class="dev-console-shared"') < html.indexOf('class="dev-tools-tabs"'));
 const start=css.lastIndexOf("#dev-tools-modal .dev-console-shared {");
 const rule=css.slice(start,css.indexOf("}",start));
 assert.match(rule,/flex: 0 0 24%/);
 assert.match(rule,/max-height: 28%/);
 assert.match(css,/#dev-tools-modal \.dev-console-output \{[\s\S]*?flex: 1 1 0/);
});
testCase("en móvil la consola conserva una altura compacta y la barra de comandos es horizontal",()=>{
 const start=css.lastIndexOf("@media (max-width: 520px)");
 const mobile=css.slice(start);
 assert.match(mobile,/#dev-tools-modal \.dev-console-shared \{[\s\S]*?flex-basis: 27%[\s\S]*?max-height: 30%/);
 assert.match(mobile,/#dev-tools-modal \.dev-terminal-row,[\s\S]*?flex-direction: row/);
 assert.match(css,/#dev-tools-modal \.dev-terminal-input-shell \{[\s\S]*?display: flex/);
 assert.match(html,/class="dev-terminal-input-shell"[\s\S]*?id="dev-terminal-input"/);
 assert.match(html,/id="btn-terminal-send"[^>]*>&gt;_/);
});
testCase("limpiar y copiar comparten la fila del título y muestran solo iconos",()=>{
 const start=html.indexOf('class="dev-card-heading dev-heading-with-help"');
 const end=html.indexOf("</div>",start);
 const heading=html.slice(start,end);
 assert.ok(heading.indexOf('id="btn-clear-console-log"') > heading.indexOf("<h4>"));
 assert.ok(heading.indexOf('id="btn-copy-console-log"') > heading.indexOf('id="btn-clear-console-log"'));
 assert.doesNotMatch(heading,/Limpiar consola<|Copiar registro</);
});
testCase("el título del panel tiene expansión animada y respeta movimiento reducido",()=>{
 assert.match(css,/@keyframes dev-tools-title-expand/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)[\s\S]*?dev-tools-title \{ animation: none; \}/);
});
testCase("la expansión de la pestaña activa desactiva transiciones con movimiento reducido",()=>{
 const reducedMotion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
 assert.match(reducedMotion, /#dev-tools-modal \.dev-tab-link,\s*#dev-tools-modal \.dev-tab-link span\s*\{\s*transition: none;/);
 assert.match(reducedMotion, /#dev-tools-modal \.dev-tools-title\s*\{\s*animation: none;/);
});
testCase("la navegación es horizontal, con icono compacto y expansión animada",()=>{
 assert.match(css,/#dev-tools-modal \.dev-tools-sidebar \{[\s\S]*?flex-direction: row/);
 assert.match(css,/#dev-tools-modal \.dev-tab-link \{[\s\S]*?flex-basis: 42px/);
 assert.match(css,/transition: width \.24s ease, flex-basis \.24s ease/);
 assert.match(css,/max-width: 180px;[\s\S]*?opacity: 1/);
});
console.log("DeveloperPanelUX: "+passed+"/"+passed+" PASS");
