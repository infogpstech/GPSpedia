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
const byIdCode = extract("findTutorialById_", "tutorialTitleExists_");
const rowCode = extract("findTutorialRow_", "findTutorialById_");
const findById = new Function(byIdCode + "\nreturn findTutorialById_;")();
const findRow = new Function("findTutorialById_", rowCode + "\nreturn findTutorialRow_;")(findById);

function makeSheet(rows) {
    const calls = [];
    return {
        calls,
        getLastRow: () => rows.length + 1,
        getLastColumn: () => 8,
        getDataRange() { throw new Error("No se debe descargar toda la hoja Tutorial."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            return {
                getValue: () => (rows[row - 2] || [])[column - 1] ?? "",
                getValues: () => rows.slice(row - 2, row - 2 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount)),
                createTextFinder(query) {
                    return {
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
                    };
                }
            };
        }
    };
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("resuelve por ID sin leer la tabla completa", () => {
    const sheet = makeSheet([["TUT-ABC123", "Tema A"], ["tut-def456", "Tema B"]]);
    const result = findRow(sheet, "tut-abc123", true);
    assert.equal(result.rowIndex, 2);
    assert.equal(result.row[0], "TUT-ABC123");
    assert.ok(sheet.calls.every(call => call[1] === 1));
});
test("resuelve por título exacto leyendo solo la columna B y la fila coincidente", () => {
    const sheet = makeSheet([["tut-a", "Motor no arranca"], ["tut-b", "Otro tema"]]);
    const result = findRow(sheet, "Motor no arranca", true);
    assert.equal(result.rowIndex, 2);
    assert.equal(result.row[1], "Motor no arranca");
    assert.ok(sheet.calls.some(call => call[1] === 2));
    assert.ok(sheet.calls.every(call => call[1] === 1 || call[1] === 2));
});
test("rechaza títulos duplicados sin descargar la hoja completa", () => {
    const sheet = makeSheet([["tut-a", "Motor"], ["tut-b", "Motor"]]);
    assert.throws(() => findRow(sheet, "Motor", true), /tema del tutorial aparece más de una vez/);
    assert.ok(sheet.calls.every(call => call[1] === 1 || call[1] === 2));
});
test("un ID canónico ausente no cae a la búsqueda por título", () => {
    const sheet = makeSheet([["tut-other", "Tema"]]);
    assert.throws(() => findRow(sheet, "tut-abcdefghijklmnopqrstuvwx", true), /Tutorial no encontrado/);
    assert.ok(sheet.calls.every(call => call[1] === 1));
});
test("preferId false mantiene búsqueda estricta por ID", () => {
    const sheet = makeSheet([["tut-a", "Motor"]]);
    assert.throws(() => findRow(sheet, "Motor", false), /Tutorial no encontrado/);
    assert.ok(sheet.calls.every(call => call[1] === 1));
});
test("conserva la primera fila física como canónica ante IDs duplicados", () => {
    const sheet = makeSheet([["tut-abc123", "A"], ["TUT-ABC123", "B"]]);
    const result = findRow(sheet, "tut-abc123", true);
    assert.equal(result.row[1], "A");
});
console.log("FeedbackTutorialLookupBoundedRead: " + passed + "/" + passed + " PASS — ID/título con lecturas dirigidas");
