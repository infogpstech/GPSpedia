import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findPendingVideoApprovalForTarget_(");
const end = source.indexOf("\nfunction handleGetVideoApprovalByOperation", start);
assert.ok(start >= 0 && end > start, "No se encontró findPendingVideoApprovalForTarget_");
const code = source.slice(start, end);
const findPending = new Function("COLS_FEEDBACKS", code + "\nreturn findPendingVideoApprovalForTarget_;")({ Problema: 3 });

function approval(overrides = {}) {
    return JSON.stringify({
        subType: "video_approval", status: "pending", contentType: "tutorial",
        referenceId: "tut-abc123", opVideoId: "OP-VIDEO-1", ...overrides
    });
}
function makeSheet(records) {
    const calls = [];
    return {
        calls,
        getLastRow: () => records.length + 1,
        getLastColumn: () => 4,
        getDataRange() { throw new Error("No se debe descargar toda Feedbacks."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            return {
                getValue: () => (records[row - 2] || [])[column - 1] ?? "",
                getValues: () => records.slice(row - 2, row - 2 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount)),
                createTextFinder(query) {
                    return {
                        matchCase() { return this; },
                        findAll: () => {
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
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("encuentra solicitud pendiente por destino y lee solo la fila coincidente", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"], ["F-2", "", approval({ referenceId: "tut-other" }), "y"]]);
    const result = findPending(sheet, "tutorial", "tut-abc123");
    assert.equal(result.rowIndex, 2);
    assert.equal(result.data.opVideoId, "OP-VIDEO-1");
    assert.equal(result.row[0], "F-1");
    assert.deepEqual(sheet.calls, [[2, 3, 2, 1], [2, 3, 1, 1], [2, 1, 1, 4]]);
});
test("ignora solicitudes aprobadas o de otro tipo", () => {
    const sheet = makeSheet([
        ["F-1", "", approval({ status: "approved" }), "x"],
        ["F-2", "", approval({ contentType: "pys" }), "y"]
    ]);
    assert.equal(findPending(sheet, "tutorial", "tut-abc123"), null);
});
test("rechaza más de una solicitud pendiente para el mismo destino", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"], ["F-2", "", approval(), "y"]]);
    assert.throws(() => findPending(sheet, "tutorial", "tut-abc123"), /varias solicitudes de vídeo pendientes/);
});
test("no descarga toda Feedbacks para revisar aprobaciones pendientes", () => {
    const sheet = makeSheet([["F-1", "", approval(), "x"]]);
    findPending(sheet, "tutorial", "tut-abc123");
    assert.ok(sheet.calls.every(call => call[1] === 3 || (call[1] === 1 && call[2] === 1)));
});
test("funciona con adaptadores Range que exponen getValues pero no getValue", () => {
    const original = makeSheet([["F-1", "", approval(), "x"]]);
    const sheet = {
        getLastRow: original.getLastRow,
        getLastColumn: original.getLastColumn,
        getRange(...args) {
            const range = original.getRange(...args);
            return { getValues: range.getValues };
        }
    };
    assert.equal(findPending(sheet, "tutorial", "tut-abc123").rowIndex, 2);
});
test("fallback sin TextFinder sigue limitado a la columna Problema", () => {
    const original = makeSheet([["F-1", "", approval(), "x"]]);
    const sheet = {
        getLastRow: original.getLastRow,
        getLastColumn: original.getLastColumn,
        getRange(...args) {
            const range = original.getRange(...args);
            return { getValue: range.getValue, getValues: range.getValues };
        }
    };
    assert.equal(findPending(sheet, "tutorial", "tut-abc123").rowIndex, 2);
});
console.log("FeedbackPendingVideoLookupBoundedRead: " + passed + "/" + passed + " PASS — consulta dirigida de aprobaciones");
