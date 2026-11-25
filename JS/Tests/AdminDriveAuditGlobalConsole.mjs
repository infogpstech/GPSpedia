import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const start = ui.indexOf("export async function openAuditDriveModal(options = {})");
const end = ui.indexOf("\nexport ", start + 20);
assert.ok(start >= 0 && end > start, "debe existir el modal de auditoría de Drive");
const auditUi = ui.slice(start, end);
assert.ok(!auditUi.includes("audit-drive-console-output"), "el modal ya no debe crear una consola local");
assert.ok(!auditUi.includes("auditConsoleOutput") && !auditUi.includes("auditConsoleStatus"),
    "la salida no debe depender de nodos locales del modal");
assert.ok(auditUi.includes("const showModal = !(options && options.showModal === false);"));
assert.match(auditUi,/if \(showModal\) \{[\s\S]*?modal\.style\.display = 'flex';[\s\S]*?\} else \{[\s\S]*?modal\.style\.display = 'none';/);
assert.ok(!auditUi.includes("modal.style.display = showModal ? 'flex' : 'none';"),
    "el modo Developer no debe abrir el modal independiente");
assert.ok(auditUi.includes("if (startImmediately && isCurrentRequest())"));
assert.ok(auditUi.includes("await runAudit(canResume);"), "la acción Developer debe iniciar o reanudar el escaneo");
assert.ok(ui.includes("openAuditDriveModal({ showModal: false, startImmediately: true })"),
    "Auditar Cortes debe ejecutar el escaneo sin abrir otro modal");
assert.ok(auditUi.includes("El avance, los lotes y los resultados se registran en la consola global Developer"),
    "el modo headless anuncia el destino del progreso");
assert.ok(html.includes('id="dev-console-log"'), "debe existir la consola global del panel Desarrollador");
assert.ok(ui.includes("window.gpsepediaDeveloperLog = (message, level = 'info') =>"),
    "el panel debe exponer el logger global");

const appendStart = auditUi.indexOf("const appendAuditConsole =");
const appendEnd = auditUi.indexOf("\n\n    const appendFiles", appendStart);
assert.ok(appendStart >= 0 && appendEnd > appendStart, "debe existir el adaptador de salida del escáner");
const appendSource = auditUi.slice(appendStart, appendEnd);
// Mock DOM mínimo para el espejo integrado; la prueba no requiere navegador real.
const previousDocument = globalThis.document;
const logEntries = [];
const mockScanConsole = {
  appendChild(entry) { logEntries.push(entry); },
  get childElementCount() { return logEntries.length; },
  get firstElementChild() { return logEntries[0] || null; },
  scrollHeight: 100,
  scrollTop: 0
};
Object.defineProperty(mockScanConsole.firstElementChild || {}, 'remove', { value: () => {} });
globalThis.document = {
  getElementById(id) { return id === 'audit-drive-scan-console' ? mockScanConsole : null; },
  createElement() { return { className: '', textContent: '' }; }
};
const logged = [];
const append = new Function("isCurrentRequest", "logDeveloperOperation_",
    appendSource + "\nreturn appendAuditConsole;"
)(() => true, (message, level) => logged.push({ message, level }));
append("  Lote 3 confirmado  ", "progress");
append("Conflicto de identidad", "warning");
append("Error de lectura", "error");
assert.deepEqual(logged, [
    { message: "[AUDITORÍA DRIVE] Lote 3 confirmado", level: "progress" },
    { message: "[AUDITORÍA DRIVE] Conflicto de identidad", level: "warning" },
    { message: "[AUDITORÍA DRIVE] Error de lectura", level: "error" }
], "todos los niveles deben llegar al logger global con prefijo y texto normalizado");
const staleAppend = new Function("isCurrentRequest", "logDeveloperOperation_",
    appendSource + "\nreturn appendAuditConsole;"
)(() => false, () => { throw new Error("No debe escribir con sesión obsoleta"); });
staleAppend("ignorado", "info");

const filesStart = auditUi.indexOf("const appendFiles =");
const filesEnd = auditUi.indexOf("\n\n    const appendAuditBatchSummary", filesStart);
assert.ok(filesStart >= 0 && filesEnd > filesStart, "debe conservarse el renderizado de resultados");
const filesSource = auditUi.slice(filesStart, filesEnd);
assert.ok(filesSource.includes("container.appendChild(row)"), "los resultados clasificados siguen visibles en la lista");
assert.ok(!filesSource.includes("appendAuditConsole("), "no debe enviar cada archivo como una línea masiva al log global");
const batchStart = auditUi.indexOf("const appendAuditBatchSummary =");
const batchEnd = auditUi.indexOf("\n\n    const updateSummary", batchStart);
const batchSource = auditUi.slice(batchStart, batchEnd);
assert.ok(batchSource.includes("Carpeta recorrida:"), "la consola global conserva los conteos por carpeta");
assert.ok(batchSource.includes("'Lote ' + batches"), "la consola global conserva el avance por lote");
const summaryStart = auditUi.indexOf("const updateSummary =");
const summaryEnd = auditUi.indexOf("\n\n    const requestAuditConsoleConfirmation", summaryStart);
const summarySource = auditUi.slice(summaryStart, summaryEnd);
assert.ok(summarySource.includes("Resumen acumulado:"), "la consola global conserva los conteos acumulados");
assert.ok(summarySource.includes("referencias no interpretables"), "se conservan los indicadores de revisión");

assert.ok(auditUi.includes("appendAuditBatchSummary(response, uniqueResponseFiles)"));
assert.ok(auditUi.includes("appendFiles(uniqueResponseFiles)"));
assert.ok(auditUi.includes("await persistState(complete ? 'complete' : 'running')"),
    "cada lote confirmado sigue persistiendo el estado");
assert.ok(auditUi.includes("if (resumeButton) resumeButton.onclick = () => runAudit(true)"),
    "se conserva la acción de reanudar");
assert.ok(auditUi.includes("const hasResumableCursor = !complete && !!cursor && !resumeUnavailable"),
    "el botón de reanudación sigue dependiendo del cursor válido");
assert.ok(auditUi.includes("cursor = response.cursor || null"), "se conserva el cursor del servidor");
if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
console.log("AdminDriveAuditGlobalConsole: 1/1 PASS — logger global, resultados y reanudación conservados");
