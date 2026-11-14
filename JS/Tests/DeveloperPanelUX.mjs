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
 assert.ok(panel.includes("Respaldos y restauración"));
 assert.ok(panel.includes("Migración de VIN e idempotencia"));
 assert.ok(panel.includes("Organización de registros"));
 assert.ok(panel.includes("Limpieza de registros"));
 assert.equal((html.match(/id="dev-tab-backups"/g)||[]).length,0);
});
testCase("los botones de acciones comparten altura, espaciado y distribución",()=>{
 assert.match(css,/#dev-tools-modal \.dev-action-row \{\s*display: grid/);
 assert.match(css,/#dev-tools-modal \.dev-action-row button,\s*#dev-tools-modal \.dev-action-full \{\s*min-width: 0;\s*min-height: 38px/);
 assert.match(css,/@media \(max-width: 520px\) \{\s*#dev-tools-modal \.dev-action-row \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});
console.log("DeveloperPanelUX: "+passed+"/"+passed+" PASS");
