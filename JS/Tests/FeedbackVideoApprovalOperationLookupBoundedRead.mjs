import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findVideoApprovalByOperation_(");
const end = source.indexOf("\nfunction findPendingVideoApprovalForTarget_", start);
assert.ok(start >= 0 && end > start, "No se encontró findVideoApprovalByOperation_");
const code = source.slice(start, end);
const findByOperation = new Function("COLS_FEEDBACKS", code + "\nreturn findVideoApprovalByOperation_;")({ Problema: 3 });
function approval(overrides = {}) {
    return JSON.stringify({
        subType: "video_approval", opVideoId: "OP-12345678901234567890",
        status: "pending", contentType: "tutorial", referenceId: "tut-1", ...overrides
    });
}
function makeSheet(records, withTextFinder = true) {
    const calls = [];
    return {
        calls,
        getLastRow: () => records.length + 1,
        getLastColumn: () => 4,
        getDataRange() { throw new Error("No se debe descargar toda Feedbacks."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            const range = {
                getValues: () => records.slice(row - 2, row - 2 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount))
            };
            if (withTextFinder) range.createTextFinder = query => ({
                matchCase() { return this; },
                findAll: () => {
                    const matches = [];
                    for (let index = 0; index < rowCount; index++) {
                        const value = String((records[row - 2 + index] || [])[column - 1] ?? "");
                        if (value.includes(String(query))) matches.push({ getRow: () => row + index });
                    }
                    return matches;
                }
            });
            return range;
        }
    };
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("encuentra opVideoId y lee solo la fila coincidente", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"], ["F-2", "", approval({ opVideoId: "OP-OTHER" }), "y"]]);
    const result = findByOperation(sheet, "OP-12345678901234567890");
    assert.equal(result.rowIndex, 2);
    assert.equal(result.data.referenceId, "tut-1");
    assert.equal(result.row[0], "F-1");
    assert.deepEqual(sheet.calls, [[2, 3, 2, 1], [2, 3, 1, 1], [2, 1, 1, 4]]);
});
test("filtra coincidencias parciales del ID antes de devolver el registro", () => {
    const sheet = makeSheet([["F-1", "", approval({ opVideoId: "OP-12345678901234567890-X" }), "x"]]);
    assert.equal(findByOperation(sheet, "OP-12345678901234567890"), null);
});
test("rechaza opVideoId duplicado", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"], ["F-2", "", approval(), "y"]]);
    assert.throws(() => findByOperation(sheet, "OP-12345678901234567890"), /identificador de operación ya está duplicado/);
});
test("fallback sin TextFinder sigue limitado a Problema", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"]], false);
    assert.equal(findByOperation(sheet, "OP-12345678901234567890").rowIndex, 2);
    assert.ok(sheet.calls.every(call => call[1] === 3 || (call[1] === 1 && call[2] === 1)));
});
test("ignora solicitudes sin opVideoId y evita lectura completa", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"]]);
    assert.equal(findByOperation(sheet, ""), null);
    assert.deepEqual(sheet.calls, []);
});
console.log("FeedbackVideoApprovalOperationLookupBoundedRead: " + passed + "/" + passed + " PASS — búsqueda dirigida por opVideoId");
