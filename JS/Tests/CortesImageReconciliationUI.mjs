import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const html=read("index.html"),ui=read("JS/Frontend/ui.js"),css=read("style.css"),api=read("JS/Frontend/api-config.js"),admin=read("Services/admin.js"),off=read("JS/Frontend/offline.js");
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
 assert.ok(ui.includes('routeActionWithRetry("previewCortesImageReconciliation"'));
 ["matched","already_linked","historical","orphaned","ambiguous","occupied","referenced_elsewhere","access_restricted","unverifiable","invalid"].forEach(s=>assert.ok(ui.includes(s),s));
 assert.ok(html.includes('id="audit-drive-reconciliation-panel"'));
 assert.ok(html.includes('id="btn-audit-drive-reconcile"'));
});
testCase("limita reintentos y libera el bloqueo global si la vista deja de ser actual",()=>{
 assert.ok(ui.includes('routeActionWithRetry("previewCortesImageReconciliation"'));
 assert.ok(ui.includes("shouldContinue: isCurrentRequest"));
 assert.ok(ui.includes("isDriveAuditRunning = false;"));
 assert.ok(ui.includes("if (isCurrentRequest()) updateControls();"));
});
testCase("consolida duplicados canónicos entre lotes antes de mostrar coincidencias",()=>{
 assert.match(ui,/const canonicalGroups = new Map/);
 assert.match(ui,/Hay varios archivos con el mismo nombre canónico en el árbol Drive/);
 assert.match(ui,/aggregate\.counts\.invalid = aggregate\.invalidFiles\.length/);
 assert.match(ui,/historical: 0/);
});
testCase("libera el bloqueo global al cerrar la vista durante auditoría u organización",()=>{
 assert.ok((ui.match(/isDriveAuditRunning = false;/g)||[]).length >= 4);
 assert.ok(ui.includes("if (isCurrentRequest()) updateControls();"));
});
testCase("el escaneo y dry-run no escriben inventario automáticamente",()=>{
 assert.ok(!ui.includes("await saveUnusedInventory(true)"));
 assert.ok(!ui.includes("await saveUnusedInventory(false)"));
 assert.ok(ui.includes("saveInventoryButton.onclick = () => saveUnusedInventory()"));
 assert.ok(ui.includes("window.confirm("));
 assert.ok(html.includes('id="btn-audit-drive-save-inventory"'));
 assert.ok(ui.includes("No se escribió en Spreadsheet"));
});
testCase("persiste y reanuda el preview por cuenta, auditoría, digest y lote confirmado",()=>{
 assert.ok(ui.includes("offline.saveCortesImageReconciliationState"));
 assert.ok(ui.includes("offline.getCortesImageReconciliationState"));
 assert.ok(ui.includes("offline.clearCortesImageReconciliationState"));
 assert.ok(ui.includes("nextBatchIndex = batchIndex + 1"));
 assert.ok(ui.includes("previous.fileSignature === fileSignature"));
 assert.ok(ui.includes("Simulación parcial guardada"));
 assert.ok(off.includes("export async function saveCortesImageReconciliationState"));
 assert.ok(off.includes("export async function getCortesImageReconciliationState"));
 assert.ok(off.includes("export async function clearCortesImageReconciliationState"));
 assert.ok(off.includes("Number(current.revision) !== expectedRevision"));
});
testCase("la firma se calcula dentro del try y cualquier fallo libera los bloqueos",()=>{
 const start=ui.indexOf("const runCortesReconciliation = async () => {");
 const end=ui.indexOf("\n    if (saveInventoryButton)",start);
 const fn=ui.slice(start,end);
 assert.ok(fn.indexOf("try {") < fn.indexOf("globalThis.crypto.subtle.digest"));
 assert.ok(fn.includes("if (!globalThis.crypto || !globalThis.crypto.subtle)"));
 assert.ok(fn.includes("if (fileSignature) {\\n                try { await saveProgress(\"partial\");"));
 assert.ok(fn.includes("} finally {\\n            isReconciling = false;\\n            isRunning = false;\\n            isDriveAuditRunning = false;"));
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
