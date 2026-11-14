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
testCase("restaura el reporte guardado al reabrir y solo reanuda estados parciales",()=>{
 assert.ok(ui.includes("restoreCortesReconciliationState_()"));
 assert.ok(ui.includes("saved.status === \"complete\""));
 assert.ok(ui.includes("previous.status !== \"complete\" && previous.fileSignature === fileSignature"));
 assert.ok(ui.includes("pulsa Conciliar para actualizarla con datos actuales"));
 assert.ok(ui.includes("String(file.fileName || \"\"), String(file.mimeType || \"\").toLowerCase()"));
 assert.ok(ui.includes("await saveProgress(\"running\")"));
 assert.ok(!ui.includes("saveProgress(nextBatchIndex === totalBatches ? \"complete\" : \"running\")"));
});
testCase("la firma segura está protegida y cualquier fallo libera los bloqueos",()=>{
 const helperStart=ui.indexOf("const createCortesImageFileSignature_ = async");
 const helperEnd=ui.indexOf("const restoreCortesReconciliationState_",helperStart);
 const helper=ui.slice(helperStart,helperEnd);
 const start=ui.indexOf("const runCortesReconciliation = async () => {");
 const end=ui.indexOf("\n    if (saveInventoryButton)",start);
 const fn=ui.slice(start,end);
 assert.ok(helper.includes("globalThis.crypto.subtle.digest"));
 assert.ok(helper.includes("if (!globalThis.crypto || !globalThis.crypto.subtle)"));
 assert.ok(fn.indexOf("try {") < fn.indexOf("createCortesImageFileSignature_(imageFiles)"));
 assert.match(fn,/if \(fileSignature\) \{\s+try \{ await saveProgress\("partial"\);/);
 assert.match(fn,/\} finally \{\s+isReconciling = false;\s+isRunning = false;\s+isDriveAuditRunning = false;/);
});
testCase("el reporte usa texto seguro y no modifica datos productivos",()=>{
 assert.match(ui,/title\.textContent = String\(item\.fileName/);
 assert.match(ui,/aggregate\.counts\.matched \+ " coincidencias exactas propuestas; referencias: " \+ referenceCheckStatus/);
 assert.match(admin,/function handlePreviewCortesImageReconciliation_/);
 assert.match(admin,/plan\.writePerformed = false/);
 assert.match(api,/'previewCortesImageReconciliation': 'ADMIN'/);
});
testCase("la aplicación requiere aprobación visible, confirmación y endpoint ADMIN dedicado",()=>{
 assert.ok(html.includes('id="btn-audit-drive-apply-reconciliation"'));
 assert.ok(ui.includes('data-reconciliation-approve'));
 assert.ok(ui.includes('window.confirm('));
 assert.ok(ui.includes('routeActionWithRetry("applyCortesImageReconciliation"'));
 assert.ok(api.includes("'applyCortesImageReconciliation': 'ADMIN'"));
 assert.ok(admin.includes("function handleApplyCortesImageReconciliation_"));
 assert.ok(admin.includes("function buildCortesImageReconciliationApprovalManifest_"));
 assert.ok(admin.includes("rollbackConfirmed"));
 assert.ok(admin.includes("plan.capabilities = { applyApprovedReconciliation: true }"));
 assert.ok(ui.includes("report.applyAvailable === true"));
 assert.ok(ui.includes("response.capabilities && response.capabilities.applyApprovedReconciliation === true"));
 assert.ok(ui.includes("applyAvailable: false"));
 assert.ok(admin.includes("entry.cell.getValue()"));
});
testCase("el reporte es responsive y accesible",()=>{
 assert.match(html,/aria-live="polite"/);
 assert.match(css,/\.audit-drive-reconciliation-panel\[hidden\]/);
 assert.match(css,/@media \(max-width: 600px\)/);
});
console.log("CortesImageReconciliationUI: "+passed+"/"+passed+" PASS");
