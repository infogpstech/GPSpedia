import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function extract(name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const candidateEnd = nextName
        ? source.indexOf("\nfunction " + nextName + "(", start + 10)
        : source.indexOf("\nfunction ", start + 10);
    const end = candidateEnd > start ? candidateEnd : source.length;
    assert.ok(end > start, "No se encontró el final de " + name);
    return source.slice(start, end);
}
const helperCode = extract("tutorialTitleExists_", "tutorialRowMatchesSubmission_");
let renameSheetAvailable = false, renameReads = 0, renameEvents = [];
const normalizeTitle = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
const titleExists = new Function("normalizeTutorialTitle_", "getTutorialRenameEventsSheet_", "readTutorialRenameEvents_", "projectTutorialTitle_",
    helperCode + "\nreturn tutorialTitleExists_;")(
    normalizeTitle,
    () => renameSheetAvailable ? {} : null,
    () => { renameReads++; return renameEvents; },
    (id, title, events) => (events || []).filter(event => event.tutorialId === id)
        .reduce((current, event) => event.expectedTitleKey === normalizeTitle(current) ? event.title : current, title)
);
function makeSheet(titles) {
    const calls = [];
    const rows = titles.map((title, index) => ["tut-" + index, title]);
    return {
        calls,
        getLastRow: () => rows.length + 1,
        getDataRange() { throw new Error("No se debe descargar toda Tutorial."); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            calls.push([row, column, rowCount, columnCount]);
            return {
                getValues: () => rows.slice(row - 2, row - 2 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount))
            };
        }
    };
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("excluye la fila actual al conservar el mismo título", () => {
    const sheet = makeSheet(["Motor no arranca", "Otro"]);
    assert.equal(titleExists(sheet, "Motor no arranca", 2), false);
});
test("detecta el mismo título en otra fila", () => {
    const sheet = makeSheet(["Motor no arranca", "Motor no arranca"]);
    assert.equal(titleExists(sheet, "Motor no arranca", 2), true);
});
test("normaliza espacios y acentos antes de comparar", () => {
    const sheet = makeSheet(["Sistema eléctrico"]);
    assert.equal(titleExists(sheet, "  SISTEMA   electrico ", 0), true);
});
test("lee únicamente las columnas A:B para excluir todas las copias físicas del mismo tutorial", () => {
    const sheet = makeSheet(["A", "B"]);
    titleExists(sheet, "B", 2, "tut-1");
    assert.deepEqual(sheet.calls, [[2, 1, 2, 2]]);
});
test("proyecta títulos renombrados leyendo el ledger una sola vez para todas las filas", () => {
    renameSheetAvailable = true;
    renameReads = 0;
    renameEvents = [{ tutorialId:"tut-0", expectedTitleKey:"motor antiguo", title:"Motor actualizado" }];
    try {
        const sheet = makeSheet(["Motor antiguo","Otro tema","Tercer tema","Cuarto tema"]);
        assert.equal(titleExists(sheet,"Motor actualizado",0),true);
        assert.equal(renameReads,1,"La proyección de eventos de renombrado se carga una vez por comprobación, no una vez por tutorial.");
    } finally {
        renameSheetAvailable = false;
        renameEvents = [];
        renameReads = 0;
    }
});
test("la edición ejecuta la comprobación dirigida sin lock", () => {
    const handler = extract("handleUpdateTutorialItem");
    const check = handler.indexOf("tutorialTitleExists_(sheet, updates.tema, target.rowIndex, target.row[0])");
    assert.ok(check >= 0);
    assert.doesNotMatch(handler, /acquireFeedbackScriptLock_|LockService\\.getScriptLock/);
    assert.doesNotMatch(handler, /getDataRange\(/);
});
console.log("FeedbackTutorialUpdateTitleLookupBoundedRead: " + passed + "/" + passed + " PASS — unicidad de título por columna B");
