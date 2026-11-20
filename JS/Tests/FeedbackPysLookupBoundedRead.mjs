import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findPysRowsById_(");
const end = source.indexOf("\nfunction getPysNextId_", start);
assert.ok(start >= 0 && end > start, "No se encontró findPysRowsById_");
const code = source.slice(start, end);
const findRows = new Function(code + "\nreturn findPysRowsById_;")();

function makeSheet(rows, withTextFinder = true) {
    const calls = [];
    return {
        calls,
        getLastRow: () => rows.length + 1,
        getDataRange() { throw new Error("No se debe descargar toda la hoja PyS."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            const range = {
                getValues: () => rows.slice(row - 2, row - 2 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount))
            };
            if (withTextFinder) range.createTextFinder = query => ({
                matchCase(value) { this.caseSensitive = value; return this; },
                findAll: () => {
                    const matches = [];
                    for (let index = 0; index < rowCount; index++) {
                        const value = String((rows[row - 2 + index] || [])[column - 1] ?? "");
                        const haystack = this.caseSensitive ? value : value.toLowerCase();
                        const needle = this.caseSensitive ? String(query) : String(query).toLowerCase();
                        if (haystack.includes(needle)) matches.push({ getRow: () => row + index });
                    }
                    return matches;
                }
            });
            return range;
        }
    };
}
function row(id, problem) {
    const values = new Array(10).fill("");
    values[0] = id;
    values[1] = problem || "";
    return values;
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("localiza un problema y solo lee la fila coincidente", () => {
    const sheet = makeSheet([row("isue-001", "A"), row("isue-002", "B")]);
    const result = findRows(sheet, "isue-002");
    assert.equal(result.length, 1);
    assert.equal(result[0].rowNumber, 3);
    assert.equal(result[0].row[1], "B");
    assert.deepEqual(sheet.calls, [[2, 1, 2, 1], [3, 1, 1, 1], [3, 1, 1, 10]]);
});
test("filtra coincidencias parciales por ID exacto", () => {
    const sheet = makeSheet([row("isue-001"), row("isue-010")]);
    const result = findRows(sheet, "isue-01");
    assert.equal(result.length, 0);
});
test("devuelve duplicados para que el caller los rechace sin ocultarlos", () => {
    const sheet = makeSheet([row("isue-001"), row("ISUE-001")]);
    const result = findRows(sheet, "isue-001");
    assert.equal(result.length, 2);
});
test("fallback sin TextFinder mantiene lectura limitada a columna A", () => {
    const sheet = makeSheet([row("isue-001"), row("isue-002")], false);
    const result = findRows(sheet, "isue-001");
    assert.equal(result.length, 1);
    assert.ok(sheet.calls.every(call => call[1] === 1));
});
test("ID vacío no provoca una lectura de la hoja", () => {
    const sheet = makeSheet([row("isue-001")]);
    assert.deepEqual(findRows(sheet, ""), []);
    assert.deepEqual(sheet.calls, []);
});
console.log("FeedbackPysLookupBoundedRead: " + passed + "/" + passed + " PASS — lookup por columna ID");
