import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const helperStart = ui.indexOf("function isDeveloperConsoleVisible_()");
const errorStart = ui.indexOf("export function showGlobalError(message)");
const notificationStart = ui.indexOf("export function showGlobalNotification(message, type = 'info')");
const notificationEnd = ui.indexOf("/*", notificationStart + 20);
const errorBlock = ui.slice(errorStart, ui.indexOf("/* TAREA 1:", errorStart));
const notificationBlock = ui.slice(notificationStart, notificationEnd > notificationStart ? notificationEnd : undefined);
const adminStart = ui.indexOf("function initAdminPanelListeners()");
const copyStart = ui.indexOf("const btnCopyLog", adminStart);
const copyEnd = ui.indexOf("// Respaldos y restauración", copyStart);
const copyBlock = ui.slice(copyStart, copyEnd);

let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("la consola se considera activa solo mientras el modal está abierto", () => {
    assert.ok(helperStart >= 0 && helperStart < errorStart);
    const helper = ui.slice(helperStart, errorStart);
    assert.match(helper, /getAttribute\("aria-hidden"\) === "false"/);
    assert.match(helper, /modal\.style\.display !== "none"/);
    assert.match(helper, /dev-console-log/);
});

testCase("los errores del panel se envían a la consola sin mostrar un toast paralelo", () => {
    assert.match(errorBlock, /if \(isDeveloperConsoleVisible_\(\)\) \{\s*logDeveloperDiagnostic_\(original, 'error'\);\s*return;\s*\}/);
    assert.ok(errorBlock.indexOf("isDeveloperConsoleVisible_()") < errorBlock.indexOf("const toast"));
});

testCase("éxitos, advertencias y errores del panel comparten el mismo registro", () => {
    assert.match(notificationBlock, /if \(isDeveloperConsoleVisible_\(\)\) \{[\s\S]*?logDeveloperDiagnostic_\(original, level\);\s*return;/);
    assert.match(notificationBlock, /type === 'error' \? 'error' : type === 'warning' \? 'warning' : 'info'/);
    assert.ok(notificationBlock.indexOf("isDeveloperConsoleVisible_()") < notificationBlock.indexOf("const toast"));
});

testCase("la copia del registro no abre alertas nativas", () => {
    assert.ok(copyBlock.includes('log("No se encontraron errores ni advertencias críticas para copiar.")'));
    assert.ok(copyBlock.includes('log("No se pudo copiar el registro: " + err, false, true)'));
    assert.doesNotMatch(copyBlock, /alert\(/);
});

testCase("la consola conserva salida accesible y registro de progreso", () => {
    assert.match(html, /id="dev-console-log" class="dev-console-output" role="log" aria-live="polite"/);
    assert.match(ui, /window\.gpsepediaDeveloperLog = \(message, level = 'info'\)/);
    assert.match(ui, /developerDiagnosticQueue_\.splice\(0\)\.forEach/);
    assert.ok(ui.includes("Tiempo de respuesta:"));
});

console.log("DeveloperConsoleRouting: " + passed + "/" + passed + " PASS");
