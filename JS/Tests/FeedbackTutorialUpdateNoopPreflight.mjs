import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleUpdateTutorialItem(");
assert.ok(start >= 0, "No se encontró handleUpdateTutorialItem");
const code = source.slice(start);
const fields = ["tut-1", "Tema", "", "Identificar", "Ubicación", "Detalle", "", "Ana"];
function makeHarness({ row = fields.slice(), lockAllowed = true, feedbackSheet = null } = {}) {
    let lockCalls = 0, releaseCalls = 0, reads = 0, writes = 0;
    const sheet = {
        getLastRow: () => 2,
        getLastColumn: () => 8,
        getRange(r, c, nr = 1, nc = 1) {
            return {
                getValues: () => [row.slice(c - 1, c - 1 + nc)],
                setValues(values) {
                    writes++;
                    values[0].forEach((value, index) => { row[c - 1 + index] = value; });
                }
            };
        }
    };
    const lock = {
        tryLock() { lockCalls++; return lockAllowed; },
        hasLock() { return true; },
        releaseLock() { releaseCalls++; }
    };
    const fn = new Function(
        "getTutorialSheet_", "findTutorialRow_", "normalizeTutorialField_", "LockService",
        "acquireFeedbackScriptLock_", "getSafeSheet", "findPendingVideoApprovalForTarget_", "normalizeTutorialTitle_",
        "tutorialTitleExists_", "SpreadsheetApp", "COLS_FEEDBACKS",
        code + "\nreturn handleUpdateTutorialItem;"
    )(
        () => { reads++; return sheet; },
        (targetSheet, reference) => {
            assert.equal(targetSheet, sheet);
            assert.equal(reference, "tut-1");
            return { rowIndex: 2, row };
        },
        value => String(value == null ? "" : value).trim(),
        { getScriptLock: () => lock },
        candidate => { if (!candidate.tryLock(0)) throw new Error("busy"); },
        () => feedbackSheet,
        () => null,
        value => String(value || "").trim().toLowerCase(),
        () => false,
        { flush() {} },
        { Problema: 3 }
    );
    return { fn, row, stats: () => ({ lockCalls, releaseCalls, reads, writes }) };
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("reintento idéntico devuelve éxito sin adquirir ScriptLock", () => {
    const h = makeHarness();
    const result = h.fn({ tutorialId: "tut-1", tema: "Tema", comoIdentificarlo: "Identificar" });
    assert.equal(result.status, "success");
    assert.equal(result.alreadyUpdated, true);
    assert.deepEqual(h.stats(), { lockCalls: 0, releaseCalls: 0, reads: 1, writes: 0 });
});
test("una actualización real sigue adquiriendo lock y revalidando dentro", () => {
    const h = makeHarness();
    const result = h.fn({ tutorialId: "tut-1", detalles: "Detalle nuevo" });
    assert.equal(result.status, "success");
    assert.equal(result.updated.detalles, "Detalle nuevo");
    assert.equal(h.stats().lockCalls, 1);
    assert.equal(h.stats().releaseCalls, 1);
    assert.equal(h.stats().writes, 1);
});
test("un tema idéntico no consulta aprobaciones de vídeo ni duplica título", () => {
    const h = makeHarness({ feedbackSheet: { unexpected: true } });
    const result = h.fn({ tutorialId: "tut-1", tema: "Tema" });
    assert.equal(result.alreadyUpdated, true);
    assert.equal(h.stats().lockCalls, 0);
});
test("si no existe hoja en preflight, no afirma éxito y mantiene el flujo protegido", () => {
    let lockCalls = 0, releaseCalls = 0;
    const lock = { tryLock() { lockCalls++; return true; }, hasLock() { return true; }, releaseLock() { releaseCalls++; } };
    const fn = new Function(
        "getTutorialSheet_", "findTutorialRow_", "normalizeTutorialField_", "LockService",
        "acquireFeedbackScriptLock_", "getSafeSheet", "findPendingVideoApprovalForTarget_", "normalizeTutorialTitle_",
        "tutorialTitleExists_", "SpreadsheetApp", "COLS_FEEDBACKS",
        code + "\nreturn handleUpdateTutorialItem;"
    )(() => null, () => null, value => String(value || "").trim(),
        { getScriptLock: () => lock }, candidate => { if (!candidate.tryLock(0)) throw new Error("busy"); },
        () => null, () => null, value => String(value || "").trim().toLowerCase(),
        () => false, { flush() {} }, { Problema: 3 });
    assert.throws(() => fn({ tutorialId: "tut-1", detalles: "Detalle" }), /Tutorial no encontrado|Hoja Tutorial no encontrada/);
    assert.equal(lockCalls, 1);
    assert.equal(releaseCalls, 1);
});
test("rechaza payload sin campos editables antes de adquirir lock", () => {
    const h = makeHarness();
    assert.throws(() => h.fn({ tutorialId: "tut-1" }), /No se recibieron campos editables/);
    assert.equal(h.stats().lockCalls, 0);
});
console.log("FeedbackTutorialUpdateNoopPreflight: " + passed + "/" + passed + " PASS — reintento sin cambios fuera del lock");
