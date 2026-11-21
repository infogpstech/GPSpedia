import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseDeveloperConsoleConfirmation } from "../Frontend/developerConsoleConfirmation.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const html = readFileSync(resolve(root, "index.html"), "utf8");
let passed = 0;
function testCase(name, fn) { fn(); passed++; console.log("PASS " + name); }

testCase("normaliza respuestas afirmativas definidas", () => {
    for (const value of ["y", "Y", "si", " SI ", "sí", "S", "ok", " OK "]) {
        assert.equal(parseDeveloperConsoleConfirmation(value), true, value);
    }
});

testCase("normaliza respuestas negativas definidas", () => {
    for (const value of ["n", "N", "no", " NO "]) {
        assert.equal(parseDeveloperConsoleConfirmation(value), false, value);
    }
});

testCase("rechaza respuestas vacías, ambiguas o no incluidas en el contrato", () => {
    for (const value of ["", " ", "tal vez", "quizá", "yes", "cancelar", "1", "si/no", "ok luego"]) {
        assert.equal(parseDeveloperConsoleConfirmation(value), null, value);
    }
});

testCase("la solicitud queda pendiente y se registra antes de aceptar", () => {
    const start = ui.indexOf("function requestDeveloperConsoleConfirmation_");
    const end = ui.indexOf("function consumeDeveloperConsoleConfirmation_", start);
    const block = ui.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(block, /pendingDeveloperConsoleConfirmation_/);
    assert.match(block, /log\("\[CONFIRMACIÓN\] "/);
    assert.match(block, /window\.setTimeout/);
    assert.match(block, /120000/);
    assert.match(block, /Respuesta: si \/ no/);
});

testCase("la terminal intercepta respuestas antes de ejecutar comandos", () => {
    const start = ui.indexOf("const termInput = document.getElementById('dev-terminal-input')");
    const end = ui.indexOf("// Botón Copiar Registro", start);
    const block = ui.slice(start, end);
    assert.match(block, /consumeDeveloperConsoleConfirmation_\(val\)/);
    assert.match(block, /finishDeveloperConsoleConfirmation_\(false, "Confirmación cancelada con Escape\."/);
    assert.ok(block.indexOf("consumeDeveloperConsoleConfirmation_(val)") < block.indexOf("executeTerminalCommand(val)"));
    assert.match(html, /id="dev-terminal-input"/);
});

testCase("las respuestas ambiguas no resuelven la solicitud pendiente", () => {
    const start = ui.indexOf("function consumeDeveloperConsoleConfirmation_");
    const end = ui.indexOf("window.gpsepediaDeveloperLog", start);
    const block = ui.slice(start, end);
    assert.match(block, /parsed === null/);
    assert.match(block, /la operación sigue suspendida/);
    assert.match(block, /finishDeveloperConsoleConfirmation_\(parsed/);
});

testCase("las operaciones administrativas ya no dependen de confirm() nativo", () => {
    const start = ui.indexOf("function initAdminPanelListeners()");
    const stop = ui.indexOf("\nfunction ", start + 20);
    const block = ui.slice(start, stop > start ? stop : undefined);
    assert.doesNotMatch(block, /(?:window\.)?confirm\(/);
    assert.ok((block.match(/requestDeveloperConsoleConfirmation_\(/g) || []).length >= 10);
});

testCase("las acciones del historial y auditoría de imágenes usan la confirmación de consola", () => {
    assert.match(ui, /window\.gpsepediaRequestDeveloperConsoleConfirmation = requestDeveloperConsoleConfirmation_/);
    const start = ui.indexOf("const runBulkOperation = async");
    const end = ui.indexOf("const reconciliationStatus", start);
    const imageActions = ui.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(imageActions, /gpsepediaRequestDeveloperConsoleConfirmation/);
    assert.doesNotMatch(imageActions, /(?:window\.)?confirm\(/);
});

console.log("DeveloperConsoleConfirmation: " + passed + "/" + passed + " PASS");
