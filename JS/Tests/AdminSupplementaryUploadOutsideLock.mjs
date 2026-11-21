import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function handleAddSupplementaryInfo(payload");
const end = admin.indexOf("\n// ============================================================================", start);
assert.ok(start >= 0 && end > start, "No se encontró el handler de información suplementaria");
const handler = admin.slice(start, end);
const persistStart = admin.indexOf("function persistSupplementaryInfoValues_(");
const persistEnd = admin.indexOf("\nfunction ", persistStart + 10);
assert.ok(persistStart >= 0 && persistEnd > persistStart, "No se encontró el helper de persistencia");
const persist = admin.slice(persistStart, persistEnd);

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("la carga Drive y la escritura ordinaria no adquieren ScriptLock ni lease", () => {
    assert.ok(handler.indexOf("uploadImageToDrive(") < handler.indexOf("range.setValues([updated])"),
        "La carga Drive debe completarse antes de escribir la fila");
    assert.doesNotMatch(handler, /LockService|tryLock|waitLock|withSharedMutationLease_/);
    assert.doesNotMatch(handler, /getSupplementaryInfoPlanSignature_|SUPPLEMENTARY_LOCK_FAILED/);
});

test("la fila se vuelve a localizar por ID y se parte del rango más reciente", () => {
    assert.ok(handler.indexOf("findUniqueAdminVehicleRow_(") < handler.indexOf("range.getValues()"),
        "La fila debe reubicarse por ID tras la carga Drive");
    assert.ok(handler.includes("const updated=current.slice()"), "La actualización debe conservar los valores actuales no modificados");
    assert.ok(handler.includes("Object.keys(prepared.plan.updates).forEach"),
        "Solo deben superponerse los campos solicitados");
});

test("la persistencia usa una escritura de rango y confirma lectura posterior", () => {
    assert.ok(persist.includes("range.setValues([updated])"));
    assert.ok(persist.includes("SpreadsheetApp.flush()"));
    assert.ok(persist.includes("range.getValues()"));
    assert.doesNotMatch(persist, /range\.setValues\(\[original\]\)|rollback|reversión automática/i);
});

test("el helper no revierte un snapshot anterior si la confirmación falla", () => {
    let writes = 0;
    let stored = ["old"];
    const sheet = { getRange() { return {
        setValues(values) { writes++; stored = values[0].slice(); },
        getValues() { return [["unexpected"]]; }
    }; } };
    const api = new Function("COLS_CORTES", "SpreadsheetApp", "createSupplementaryInfoError_",
        persist + "\nreturn persistSupplementaryInfoValues_;")(
        { apertura: 1 }, { flush() {} }, (code, message) => Object.assign(new Error(message), { code })
    );
    assert.throws(() => api(sheet, 2, ["old"], ["new"]), /No se pudo confirmar/);
    assert.equal(writes, 1, "No debe existir una segunda escritura de rollback");
});

test("la confirmación del vínculo de imagen ocurre después de persistir", () => {
    assert.ok(handler.indexOf("persistSupplementaryInfoValues_(") < handler.indexOf("markImageUploadLinked("));
});

console.log("AdminSupplementaryUploadOutsideLock: " + passed + "/" + passed + " PASS");
