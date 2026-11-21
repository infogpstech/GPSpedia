import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const transaction = extract("handleAddOrUpdateCutLocked");
const targetedRead = extract("readIdempotenciaEntryByOpId_");
const record = extract("recordOpId");

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("la sección crítica no recorre el historial completo de Idempotencia", () => {
    assert.doesNotMatch(transaction, /readIdempotenciaEntries_\(/);
    assert.match(transaction, /readIdempotenciaEntryByOpId_\(idempotencySheetBefore, opId\)/);
});

test("el snapshot de transacción contiene únicamente el opId activo y conserva la hoja", () => {
    assert.match(transaction, /\{ entries: \[\], byOpId: new Map\(\), sheet: idempotencySheetBefore \}/);
    assert.match(transaction, /idempotencyEntriesSnapshot\.entries\.push\(currentEntry\)/);
    assert.match(transaction, /idempotencyEntriesSnapshot\.byOpId\.set\(opId, currentEntry\)/);
});

test("la lectura focalizada valida esquema y detecta duplicados del opId consultado", () => {
    assert.match(targetedRead, /getIdempotenciaHeaderState\(sheet\)/);
    assert.match(targetedRead, /createTextFinder\(cleanOpId\)/);
    assert.match(targetedRead, /matches\.length > 1/);
    assert.match(targetedRead, /normalizeIdempotenciaEntry_\(row, rowIndex\)/);
});

test("recordOpId revalida la fila actual mediante búsqueda focalizada", () => {
    assert.match(record, /readIdempotenciaEntryByOpId_\\(sheet,\\s*cleanOpId\\)/);
    assert.match(record, /!!existing !== !!current/);
    assert.match(record, /existing\.rowIndex !== current\.rowIndex/);
    assert.match(record, /updateIdempotenciaEntriesSnapshot_\(entriesSnapshot, verified\)/);
});

console.log("WriteIdempotencyTargetedRead: " + passed + "/" + passed + " PASS");
