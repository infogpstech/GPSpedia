import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findReportByReportId_(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró findReportByReportId_");
const code = source.slice(start, end);

function makeSheet(rows) {
    const calls = [];
    const sheet = {
        getLastRow: () => rows.length + 1,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            return {
                getValue: () => (rows[row - 2] || [])[column - 1] ?? "",
                getValues: () => [((rows[row - 2] || []).slice(0, columnCount))],
                createTextFinder(query) {
                    return {
                        matchCase() { return this; },
                        findAll() {
                            const matches = [];
                            for (let index = 0; index < rowCount; index++) {
                                const value = String((rows[row - 2 + index] || [])[column - 1] ?? "");
                                if (value.includes(String(query))) matches.push({ getRow: () => row + index });
                            }
                            return matches;
                        }
                    };
                }
            };
        }
    };
    return { sheet, calls };
}
function find(sheet) {
    return new Function("COLS_FEEDBACKS", code + "\nreturn findReportByReportId_;")({ Problema: 3 })(sheet, "REP-1", 8);
}

let passed = 0;
function test(name, fn) { fn(); passed++; }

test("encuentra un reporte y lee la fila completa solo después del match de metadata", () => {
    const h = makeSheet([
        ["F-1", "Ana", "Problema 1", "", "", "", "", JSON.stringify({ reportId: "REP-1", vehicleId: "101" })],
        ["F-2", "Luis", "Problema 2", "", "", "", "", JSON.stringify({ reportId: "REP-2", vehicleId: "202" })]
    ]);
    const result = find(h.sheet);
    assert.equal(result.rowIndex, 2);
    assert.equal(result.metadata.vehicleId, "101");
    assert.deepEqual(h.calls, [[2, 8, 2, 1], [2, 8, 1, 1], [2, 1, 1, 8]]);
});
test("un ID que solo coincide como subcadena no se considera el mismo reporte", () => {
    const h = makeSheet([["F-1", "Ana", "Problema", "", "", "", "", JSON.stringify({ reportId: "REP-12" })]]);
    assert.equal(find(h.sheet), null);
    assert.deepEqual(h.calls, [[2, 8, 1, 1], [2, 8, 1, 1]]);
});
test("proyecta la primera fila cuando reportId repetido tiene contenido idéntico", () => {
    const metadata = JSON.stringify({ reportId: "REP-1", vehicleId: "101", userId: "USR-1", corteIndex: 2, activaTestigoMotor: false });
    const h = makeSheet([
        ["F-1", "Ana", "Problema 1", "", "", "", "", metadata],
        ["F-2", "Ana", "Problema 1", "", "", "", "", metadata]
    ]);
    const result = find(h.sheet);
    assert.equal(result.rowIndex, 2);
    assert.equal(result.duplicateCount, 1);
});
test("rechaza reportId repetido con contenido contradictorio", () => {
    const first = JSON.stringify({ reportId: "REP-1", vehicleId: "101", userId: "USR-1", corteIndex: 2, activaTestigoMotor: false });
    const second = JSON.stringify({ reportId: "REP-1", vehicleId: "202", userId: "USR-1", corteIndex: 2, activaTestigoMotor: false });
    const h = makeSheet([
        ["F-1", "Ana", "Problema 1", "", "", "", "", first],
        ["F-2", "Ana", "Problema 1", "", "", "", "", second]
    ]);
    assert.throws(() => find(h.sheet), /contenido contradictorio/);
});
test("no descarga la tabla completa de Feedbacks para localizar un reporte", () => {
    const h = makeSheet([["F-1", "Ana", "Problema", "", "", "", "", JSON.stringify({ reportId: "REP-1" })]]);
    find(h.sheet);
    assert.ok(h.calls.every(call => !(call[0] === 2 && call[1] === 1 && call[2] > 1)),
        "La búsqueda debe limitarse a la columna de metadata y a filas coincidentes");
});
console.log("FeedbackReportLookupBoundedRead: " + passed + "/" + passed + " PASS — búsqueda por metadata y lectura dirigida");
