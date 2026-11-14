import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const html=read("index.html"),ui=read("JS/Frontend/ui.js"),css=read("style.css"),api=read("JS/Frontend/api-config.js"),admin=read("Services/admin.js");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("la simulación solo se habilita después de completar la auditoría",()=>{
 assert.match(ui,/reconcileButton\.hidden = !complete/);
 assert.match(ui,/reconcileButton\.disabled = isRunning \|\| isDriveAuditRunning \|\| isReconciling \|\| !complete/);
});
testCase("el frontend procesa lotes acotados y verifica consistencia del snapshot",()=>{
 assert.match(ui,/const batchSize = 25/);
 assert.match(ui,/sourceDigest !== response\.manifestDigest/);
 assert.match(ui,/response\.writePerformed !== false/);
});
testCase("el frontend consume el endpoint y presenta estados diferenciados",()=>{
 assert.match(ui,/routeAction\("previewCortesImageReconciliation"/);
 ["matched","already_linked","historical","orphaned","ambiguous","occupied","referenced_elsewhere","access_restricted","unverifiable","invalid"].forEach(s=>assert.ok(ui.includes(s),s));
 assert.ok(html.includes('id="audit-drive-reconciliation-panel"'));
 assert.ok(html.includes('id="btn-audit-drive-reconcile"'));
});
testCase("el reporte usa texto seguro y no modifica datos productivos",()=>{
 assert.match(ui,/title\.textContent = String\(item\.fileName/);
 assert.match(ui,/aggregate\.counts\.matched \+ " coincidencias exactas propuestas; referencias: " \+ referenceCheckStatus/);
 assert.match(admin,/function handlePreviewCortesImageReconciliation_/);
 assert.match(admin,/plan\.writePerformed = false/);
 assert.match(api,/'previewCortesImageReconciliation': 'ADMIN'/);
});
testCase("el reporte es responsive y accesible",()=>{
 assert.match(html,/aria-live="polite"/);
 assert.match(css,/\.audit-drive-reconciliation-panel\[hidden\]/);
 assert.match(css,/@media \(max-width: 600px\)/);
});
console.log("CortesImageReconciliationUI: "+passed+"/"+passed+" PASS");
