import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function extract(name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction " + nextName + "(", start + 10);
    assert.ok(end > start, "No se encontró el final de " + name);
    return source.slice(start, end);
}
const helperCode = extract("findExistingCutSuggestionForRequest_", "validateCutSuggestionReportContext_");
const operationRecord = {
    rowNumber: 4,
    record: {
        subType: "suggestion_cut", suggestionOperationId: "OP-123",
        reportId: "REP-1", vehicleId: "101", corteIndex: 2, userId: "USR-1",
        requestFingerprint: "fingerprint-current"
    }
};
function makeResolver({ byOperation = null, byRequest = null } = {}) {
    const calls = [];
    const resolver = new Function("findCutSuggestionByOperation_", "findCutSuggestionByRequest_",
        helperCode + "\nreturn findExistingCutSuggestionForRequest_;")(
        (sheet, id) => { calls.push(["operation", id]); return byOperation; },
        (sheet, reportId, vehicleId, corteIndex, userId) => {
            calls.push(["request", reportId, vehicleId, corteIndex, userId]);
            return byRequest;
        }
    );
    return { resolver, calls };
}
const request = {
    suggestionOperationId: "OP-123", reportId: "REP-1", vehicleId: "101",
    corteIndex: 2, userId: "USR-1", requestFingerprint: "fingerprint-current",
    legacyRequestFingerprint: "fingerprint-legacy"
};
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("una sugerencia nueva se anexa como fila completa", () => {
    const handler = extract("handleSuggestCutChange", "parseModelosAsociados");
    const writeStart = handler.indexOf("const suggestionRow = new Array(lastCol).fill(\"\")");
    const writeEnd = handler.indexOf("rowCommitted = true;", writeStart);
    const writeBlock = handler.slice(writeStart, writeEnd);
    assert.ok(writeStart >= 0 && writeEnd > writeStart);
    assert.match(writeBlock, /suggestionRow\[COLS_FEEDBACKS\.ID - 1\] = reservedId/);
    assert.match(writeBlock, /suggestionRow\[COLS_FEEDBACKS\.Problema - 1\] = problemDesc/);
    assert.match(writeBlock, /sheet\.appendRow\(suggestionRow\)/);
    assert.match(writeBlock, /savedRow = sheet\.getRange/);
    assert.ok(writeBlock.includes('String(savedRow[COLS_FEEDBACKS.Problema - 1] || "") !== problemDesc'));
    assert.ok(!writeBlock.includes("savedRow[COLS_FEEDBACKS.Problema]"), "No debe leer la columna Problema con índice desplazado.");
    assert.doesNotMatch(writeBlock, /getRange\([^)]*\)\.setValue|\.setValues\(/);
    const catchBlock = handler.slice(handler.indexOf("} catch (error) {"));
    assert.match(catchBlock, /appendAttempted/);
    assert.doesNotMatch(catchBlock, /clearContent\(\)/);
});
test("reproduce una operación idéntica por opId", () => {
    const h = makeResolver({ byOperation: operationRecord });
    assert.equal(h.resolver({}, request), operationRecord);
    assert.deepEqual(h.calls, [["operation", "OP-123"]]);
});
test("rechaza reutilizar opId con contenido distinto", () => {
    const changed = { ...operationRecord, record: { ...operationRecord.record, requestFingerprint: "other" } };
    const h = makeResolver({ byOperation: changed });
    assert.throws(() => h.resolver({}, request), /identificador de operación ya pertenece/);
    assert.equal(h.calls.length, 1, "No debe caer al fallback por request después de un opId conflictivo");
});
test("reproduce solicitud legacy con huella anterior compatible", () => {
    const legacy = { ...operationRecord, record: { ...operationRecord.record, suggestionOperationId: "", requestFingerprint: "fingerprint-legacy" } };
    const h = makeResolver({ byRequest: legacy });
    assert.equal(h.resolver({}, { ...request, suggestionOperationId: "" }), legacy);
    assert.equal(h.calls[0][0], "request");
});
test("rechaza solicitud legacy con huella distinta", () => {
    const legacy = { ...operationRecord, record: { ...operationRecord.record, suggestionOperationId: "", requestFingerprint: "other" } };
    const h = makeResolver({ byRequest: legacy });
    assert.throws(() => h.resolver({}, { ...request, suggestionOperationId: "" }), /datos distintos/);
});
test("devuelve null cuando no existe una sugerencia previa", () => {
    const h = makeResolver();
    assert.equal(h.resolver({}, request), null);
    assert.equal(h.calls.length, 2);
});
test("el handler resuelve replay antes de Drive y lock, y revalida dentro del lock", () => {
    const handler = extract("handleSuggestCutChange", "parseModelosAsociados");
    const preflight = handler.indexOf("findExistingCutSuggestionForRequest_(feedbackSheet, replayRequest)");
    const drive = handler.indexOf("saveSuggestionImageAttachment_");
    const lock = handler.indexOf("LockService.getScriptLock()");
    const recheck = handler.indexOf("findExistingCutSuggestionForRequest_(sheet, replayRequest)");
    assert.ok(preflight >= 0 && preflight < drive && drive < lock);
    assert.ok(recheck > lock, "Debe revalidar bajo lock si la operación se creó después del preflight");
});
console.log("FeedbackSuggestionPreflightOutsideLock: " + passed + "/" + passed + " PASS — replay sin lock/Drive y revalidación crítica");
