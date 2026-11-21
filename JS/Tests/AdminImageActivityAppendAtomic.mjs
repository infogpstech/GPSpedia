import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
function extract(name) {
    const start = admin.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = admin.indexOf("\nfunction ", start + 10);
    return admin.slice(start, end > start ? end : admin.length);
}
const activity = extract("recordImageAdministrationActivity");
const pattern = extract("getAdminFormulaBasedIdPattern_");
const policy = new Function(coordinator + "\nreturn coordinatorPolicy_;")();

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("el registro de actividad no adquiere lease ni usa lastRow/setValue", () => {
    assert.doesNotMatch(activity, /withSharedMutationLease_|getNextAdminFormulaBasedId_|getLastRow\(|setValue\(/);
    assert.match(activity, /sheet\.appendRow\(/);
    assert.match(activity, /SpreadsheetApp\.flush\(\)/);
});

test("el patrón de ID se obtiene de configuración/fórmulas sin contador PropertiesService", () => {
    assert.match(pattern, /IDENTIFIER_SEQUENCE_CONFIG_SHEET_/);
    assert.match(pattern, /parseIdentifierSequenceFormula_\(pattern\.formula\)/);
    assert.match(pattern, /formulas\.some\(formula => formula && formula !== pattern\.formula\)/);
    assert.doesNotMatch(pattern, /PropertiesService|setProperty\(/);
});

test("el registro anexa fórmula e información de actividad en una sola operación", () => {
    let appended = null, flushes = 0;
    const sheet = { appendRow(row) { appended = row; } };
    const fn = new Function("getSpreadsheet", "getAdminFormulaBasedIdPattern_", "SpreadsheetApp", "Logger",
        activity + "\nreturn recordImageAdministrationActivity;")(
        () => ({ getSheetByName: name => name === "ActividadUsuario" ? sheet : null }),
        () => ({ formula: '="ACT-"&TEXT(ROW()-1,"0000")' }),
        { flush() { flushes++; } }, { log() {} }
    );
    assert.equal(fn({ userId: "U-1", userName: "Operador" }, "image_deleted", "IMG-1", "detalle"), true);
    assert.equal(appended.length, 7);
    assert.equal(appended[0], '="ACT-"&TEXT(ROW()-1,"0000")');
    assert.equal(appended[2], "U-1");
    assert.equal(appended[3], "Operador");
    assert.equal(appended[4], "image_deleted");
    assert.equal(appended[5], "IMG-1");
    assert.equal(flushes, 1);
});

test("el registro sin actor no escribe", () => {
    let calls = 0;
    const fn = new Function("getSpreadsheet", "getAdminFormulaBasedIdPattern_", "SpreadsheetApp", "Logger",
        activity + "\nreturn recordImageAdministrationActivity;")(
        () => { calls++; return { getSheetByName: () => null }; },
        () => { throw new Error("must not call"); }, { flush() {} }, { log() {} }
    );
    assert.equal(fn(null, "image_deleted", "IMG-1", ""), false);
    assert.equal(calls, 0);
});

test("la policy ACTIVITY independiente desaparece de Coordinator", () => {
    assert.equal(Boolean(policy("ADMIN", "recordAdminImageActivity")), false);
});

console.log("AdminImageActivityAppendAtomic: " + passed + "/" + passed + " PASS");
