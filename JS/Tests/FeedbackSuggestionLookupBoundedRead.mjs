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
const byOperationCode = extract("findCutSuggestionByOperation_", "buildCutSuggestionReplayResponse_");
const byRequestCode = extract("findCutSuggestionByRequest_", "validateCutSuggestionReportContext_");
const byOperation = new Function("COLS_FEEDBACKS", byOperationCode + "\nreturn findCutSuggestionByOperation_;")({ Problema: 3 });
const byRequest = new Function("COLS_FEEDBACKS", byRequestCode + "\nreturn findCutSuggestionByRequest_;")({ Problema: 3 });

function makeSheet(records) {
    const calls = [];
    return {
        calls,
        getLastRow: () => records.length + 1,
        getDataRange() { throw new Error("No se debe descargar la hoja completa."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            return {
                getValue: () => (records[row - 2] || [])[column - 1] ?? "",
                createTextFinder(query) {
                    return {
                        matchCase() { return this; },
                        findAll() {
                            const matches = [];
                            for (let index = 0; index < rowCount; index++) {
                                const value = String((records[row - 2 + index] || [])[column - 1] ?? "");
                                if (value.includes(String(query))) matches.push({ getRow: () => row + index });
                            }
                            return matches;
                        }
                    };
                }
            };
        }
    };
}
function record(overrides = {}) {
    return JSON.stringify({
        subType: "suggestion_cut", suggestionOperationId: "OP-1", reportId: "REP-1",
        vehicleId: "101", corteIndex: 2, userId: "USR-1", details: "Cambio propuesto",
        ...overrides
    });
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("encuentra por suggestionOperationId con lectura dirigida", () => {
    const sheet = makeSheet([["F-1", "", record()], ["F-2", "", record({ suggestionOperationId: "OP-2" })]]);
    const result = byOperation(sheet, "OP-1");
    assert.equal(result.rowNumber, 2);
    assert.equal(result.record.vehicleId, "101");
    assert.deepEqual(sheet.calls, [[2, 3, 2, 1], [2, 3, 1, 1]]);
});
test("un registro malformado que contiene la operación requiere revisión", () => {
    const sheet = makeSheet([["F-1", "", '{"suggestionOperationId":"OP-1"']]);
    assert.throws(() => byOperation(sheet, "OP-1"), /registro incompleto/);
});
test("rechaza suggestionOperationId duplicado", () => {
    const sheet = makeSheet([["F-1", "", record()], ["F-2", "", record()]]);
    assert.throws(() => byOperation(sheet, "OP-1"), /identificador de operación aparece duplicado/);
});
test("encuentra por reportId y valida vehículo, corte y actor", () => {
    const sheet = makeSheet([["F-1", "", record()], ["F-2", "", record({ vehicleId: "202" })]]);
    const result = byRequest(sheet, "REP-1", "101", 2, "USR-1");
    assert.equal(result.rowNumber, 2);
    assert.equal(result.record.userId, "USR-1");
    assert.ok(sheet.calls.every(call => call[1] === 3), "Solo debe consultar la columna Problema");
});
test("rechaza duplicados de la misma solicitud heredada", () => {
    const sheet = makeSheet([["F-1", "", record()], ["F-2", "", record()]]);
    assert.throws(() => byRequest(sheet, "REP-1", "101", 2, "USR-1"), /sugerencia asociada al reporte ya aparece duplicada/);
});
test("ignora reportId inexistente y N/A sin lectura completa", () => {
    const sheet = makeSheet([["F-1", "", record()]]);
    assert.equal(byRequest(sheet, "REP-2", "101", 2, "USR-1"), null);
    assert.equal(byRequest(sheet, "N/A", "101", 2, "USR-1"), null);
    assert.ok(sheet.calls.every(call => call[1] === 3));
});
console.log("FeedbackSuggestionLookupBoundedRead: " + passed + "/" + passed + " PASS — lookup de operación y reporte sin lectura integral");
