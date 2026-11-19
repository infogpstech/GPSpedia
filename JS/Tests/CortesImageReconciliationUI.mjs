import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const html=read("index.html"),ui=read("JS/Frontend/ui.js"),css=read("style.css"),api=read("JS/Frontend/api-config.js"),admin=read("JS/Services/admin.js"),off=read("JS/Frontend/offline.js");
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
 assert.ok(ui.includes('aclPolicyVersion: "cortes-acl-link-reader-v1"'));
 assert.ok(ui.includes("missingReferenceCheckStatus"));
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
 assert.ok(ui.includes('const reconciliationMessage = "Simulación terminada. " + aggregate.counts.matched +'));
 assert.ok(ui.includes('logDeveloperOperation_("[CONCILIACIÓN DRIVE] " + reconciliationMessage'));
 assert.match(admin,/function handlePreviewCortesImageReconciliation_/);
 assert.match(admin,/Drive\.Permissions\.list/);
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
 assert.ok(admin.includes("plan.capabilities = { applyApprovedReconciliation: applyCapabilityAvailable }"));
 assert.ok(admin.includes("function loadDriveAuditFileMetadata_"));
 assert.ok(admin.includes("function getCortesCanonicalDuplicateFileIds_"));
 assert.ok(admin.includes("state.imageMetadataVersion = 1"));
 assert.ok(ui.includes("report.applyAvailable === true"));
 assert.ok(ui.includes("response.capabilities && response.capabilities.applyApprovedReconciliation === true"));
 assert.ok(ui.includes("auditId, files: batch"));
 assert.ok(ui.includes("confirmed: true, auditId, backupId"));
 const backupIndex = ui.indexOf('routeActionWithRetry("backupDatabase"');
 const applyIndex = ui.indexOf('routeActionWithRetry("applyCortesImageReconciliation"');
 assert.ok(backupIndex >= 0 && backupIndex < applyIndex, "El respaldo debe completarse antes de la aplicación.");
 assert.ok(ui.includes("Respaldo completo verificado. Aplicando asignaciones"));
 assert.ok(ui.includes("respaldo completo, verificado y privado"));
 assert.ok(admin.includes("function verifyImageReconciliationBackup_"));
 assert.ok(admin.includes("function findMissingCortesDriveReferences_"));
 assert.ok(admin.includes("function classifyCortesImageAcl_"));
 assert.ok(ui.includes("Referencias de Cortes sin archivo verificado"));
 assert.ok(ui.includes("publicityCompliance"));
 assert.ok(ui.includes("La lista está limitada a 200 referencias; total detectado: "));
 assert.match(admin,/missingReferenceCount \+\s*" referencias sin archivo verificado"/);
 assert.match(admin,/missingReferencesTruncated \? " \(reporte limitado a 200\)" : ""/);
 assert.ok(ui.includes("applyAvailable: false"));
 assert.ok(admin.includes("entry.cell.getValue()"));
});
testCase("las acciones de auditoría forman una barra iconográfica expandible y accesible",()=>{
 assert.ok(html.includes('id="audit-drive-toolbar" class="audit-drive-toolbar" role="toolbar"'));
 assert.ok(html.includes('id="btn-audit-drive-toolbar-toggle"'));
 assert.ok(html.includes('aria-controls="audit-drive-toolbar-actions"'));
 assert.ok(html.includes('aria-expanded="false"'));
 for(const id of ["btn-audit-drive-start","btn-audit-drive-resume","btn-audit-drive-organize","btn-audit-drive-save-inventory","btn-audit-drive-reconcile"]) {
  assert.ok(html.includes('id="'+id+'"'),id);
  const start=html.indexOf('id="'+id+'"');
  const button=html.slice(start,html.indexOf("</button>",start));
  assert.ok(button.includes('aria-label="'),id+" accessible name");
  assert.ok(button.includes('class="audit-drive-action-label"'),id+" label");
 }
 assert.ok(ui.includes("setAuditToolbarExpanded(false)"));
 assert.ok(ui.includes("auditToolbarToggle.dataset.bound !== 'true'"));
 assert.ok(ui.includes("auditToolbarToggle.setAttribute('aria-expanded', String(Boolean(expanded)))"));
 assert.ok(css.includes(".audit-drive-toolbar.is-expanded .audit-drive-action-label"));
 const reducedMotion=css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
 assert.ok(reducedMotion.includes("#dev-tools-modal .dev-tab-link"));
 assert.ok(reducedMotion.includes("#audit-drive-modal .audit-drive-action-label"));
 assert.ok(reducedMotion.includes("transition: none !important;"));
});
testCase("el reporte es responsive y accesible",()=>{
 assert.match(html,/aria-live="polite"/);
 assert.match(css,/\.audit-drive-reconciliation-panel\[hidden\]/);
 assert.match(css,/@media \(max-width: 600px\)/);
});

testCase("la auditoría concentra progreso y resultados en la consola de Cortes",()=>{
 assert.ok(ui.includes('id="audit-drive-console-output"'));
 assert.ok(ui.includes("const appendAuditConsole ="));
 assert.ok(ui.includes("const appendAuditBatchSummary ="));
 assert.ok(ui.includes("response.foldersVisitedPaths"));
 assert.ok(ui.includes("Carpeta recorrida:"));
 assert.ok(ui.includes("Resumen acumulado:"));
 assert.ok(ui.includes("window.gpsepediaRequestDeveloperConsoleConfirmation"));
 assert.ok(ui.includes("responde «sí» o «no» en la terminal global del Desarrollador"));
 assert.ok(ui.includes("'no_confirmada'"));
 assert.ok(ui.includes("Los conteos del resumen ADMIN no coinciden con los resultados individuales"));
 assert.ok(!ui.includes("container.hidden = true"));
 assert.ok(html.includes('id="audit-drive-results-container" style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 5px;"'));
 assert.ok(css.includes(".audit-drive-console-output"));
});
console.log("CortesImageReconciliationUI: "+passed+"/"+passed+" PASS");
