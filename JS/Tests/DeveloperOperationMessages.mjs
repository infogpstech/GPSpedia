import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
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

testCase("la auditoría registra inicio, avance, resultado y error sin duplicar toasts", () => {
    assert.doesNotMatch(audit, /mostrarNotificacion\(|alert\(/);
    const start = audit.indexOf("const runAudit = async (resume) =>");
    const end = audit.indexOf("if (startButton) startButton.onclick", start);
    const run = audit.slice(start, end);
    assert.match(run, /Iniciando recorrido de Cortes/);
    assert.match(run, /AUDITORÍA DRIVE.*batchStatusMessage/);
    assert.match(run, /AUDITORÍA DRIVE.*inventoryMessage/);
    assert.match(run, /AUDITORÍA DRIVE.*statusMessage/);
});

testCase("inventario, organización y conciliación conservan estados y reportan resultados", () => {
    assert.match(audit, /\[AUDITORÍA DRIVE\] " \+ inventoryMessage/);
    assert.match(audit, /\[ORGANIZACIÓN DRIVE\]/);
    assert.match(audit, /\[CONCILIACIÓN DRIVE\]/);
    assert.match(audit, /rollback confirmado/);
    assert.match(audit, /No se modificó Spreadsheet, Drive ni permisos/);
});

console.log("DeveloperOperationMessages: " + passed + "/" + passed + " PASS");
