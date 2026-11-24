import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const addCuts = readFileSync(resolve(root, "HTML/add_cortes.html"), "utf8");
const replacedStart = ui.indexOf("export async function openReplacedImagesModal()");
const auditStart = ui.indexOf("export async function openAuditDriveModal()", replacedStart);
const auditEnd = ui.indexOf("\nexport const openAboutUs", auditStart);
const replaced = ui.slice(replacedStart, auditStart);
const audit = ui.slice(auditStart, auditEnd);
let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("el logger central escribe en la consola Developer sin crear avisos paralelos", () => {
    const start = ui.indexOf("function logDeveloperOperation_");
    const end = ui.indexOf("export async function openReplacedImagesModal()", start);
    const logger = ui.slice(start, end);
    assert.match(logger, /window\.gpsepediaDeveloperLog/);
    assert.match(logger, /console\[method\]/);
    assert.doesNotMatch(logger, /mostrarNotificacion|alert\(/);
});

testCase("el gestor de imágenes no usa alertas ni notificaciones externas", () => {
    assert.ok(replacedStart >= 0 && auditStart > replacedStart);
    assert.doesNotMatch(replaced, /mostrarNotificacion\(|alert\(/);
    assert.match(replaced, /logDeveloperOperation_\(/);
    assert.match(replaced, /\[IMÁGENES\]/);
});

testCase("el borrado, restauración, movimiento y acciones masivas informan resultados en consola", () => {
    for (const action of ["deleteReplacedImage", "permanentlyDeleteReplacedImage", "restoreReplacedImageFromTrash", "recoverReplacedImage", "moveReplacedImage"]) {
        const index = replaced.indexOf('routeAction("' + action + '"');
        assert.ok(index >= 0, action);
        const context = replaced.slice(index, index + 500);
        assert.match(context, /logDeveloperOperation_\(/, action);
    }
    assert.match(replaced, /fallidas|requieren revisión/);
});

testCase("la auditoría registra inicio, avance, resultados y errores en la consola del modal", () => {
    assert.doesNotMatch(audit, /mostrarNotificacion\(|alert\(/);
    const start = audit.indexOf("const runAudit = async (resume) =>");
    const end = audit.indexOf("if (startButton) startButton.onclick", start);
    const run = audit.slice(start, end);
    assert.match(run, /Iniciando recorrido de Cortes/);
    assert.match(run, /appendAuditBatchSummary\(response, uniqueResponseFiles\)/);
    assert.match(run, /updateSummary\(batchStatusMessage, "progress"\)/);
    assert.match(run, /updateSummary\(inventoryMessage/);
    assert.match(run, /updateSummary\(statusMessage, "error"\)/);
    assert.match(audit, /const appendAuditConsole =/);
    assert.match(audit, /const appendFiles = \(files\)/);
    assert.match(audit, /const requestAuditConsoleConfirmation = async/);
});

testCase("los errores de cortes y modelos son breves y los detalles quedan en la consola de desarrollo", () => {
    assert.match(ui, /logDeveloperOperation_\("\[CORTES\] Error al agregar corte:/);
    assert.match(ui, /showGlobalError\("No se pudo agregar el corte\. Inténtalo de nuevo\."\)/);
    assert.match(ui, /logDeveloperOperation_\("\[PYS\] Error al vincular modelos:/);
    assert.match(ui, /showGlobalError\("No se pudieron vincular los modelos\."\)/);
    assert.doesNotMatch(ui, /showGlobalError\("No se pudo confirmar el agregado del corte: /);
    assert.doesNotMatch(ui, /showGlobalError\("Error al vincular modelos: /);
    assert.match(addCuts, /window\.parent\.gpsepediaDeveloperLog/);
    assert.match(addCuts, /No se pudieron cargar los datos del formulario/);
    assert.match(addCuts, /No se pudo verificar el vehículo/);
    assert.match(addCuts, /Corte agregado correctamente/);
    assert.match(addCuts, /Cambios guardados correctamente/);
    assert.doesNotMatch(addCuts, /Error al verificar: \$\{error\.message\}/);
    assert.doesNotMatch(addCuts, /Error al cargar datos del formulario: \$\{error\.message\}/);
});

testCase("inventario y organización conservan confirmación global y resultados en consola de Cortes", () => {
    assert.match(audit, /updateSummary\(inventoryMessage/);
    assert.match(audit, /requestAuditConsoleConfirmation\(/);
    assert.match(audit, /window\.gpsepediaRequestDeveloperConsoleConfirmation\(message\)/);
    assert.match(audit, /appendAuditConsole\(/);
    assert.match(audit, /Lote de organización/);
    assert.match(audit, /\[CONCILIACIÓN DRIVE\]/);
    assert.match(audit, /rollback confirmado/);
    assert.match(audit, /Sin cambios en Spreadsheet, Drive ni permisos/);
});

console.log("DeveloperOperationMessages: " + passed + "/" + passed + " PASS");
