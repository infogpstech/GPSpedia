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
const idCode = extract("findTutorialById_", "tutorialTitleExists_");
const titleCode = extract("tutorialTitleExists_", "tutorialRowMatchesSubmission_");
const rowCode = extract("tutorialRowMatchesSubmission_", "handleAddTutorial");
function makeSheet(rows) {
    const calls = [];
    return {
        calls,
        getLastRow: () => rows.length + 1,
        getLastColumn: () => 8,
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
const findById = new Function(idCode + "\nreturn findTutorialById_;")();
const titleExists = new Function("normalizeTutorialTitle_", titleCode + "\nreturn tutorialTitleExists_;")(
    value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase()
);
const rowMatches = new Function(rowCode + "\nreturn tutorialRowMatchesSubmission_;")();
const submission = { title: "Motor no arranca", comoIdentificarlo: "Síntoma", dondeEncontrarlo: "Zona", detalles: "Detalle", collaborator: "Ana" };
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("localiza el ID del tutorial sin leer toda la hoja y conserva comparación sin distinguir mayúsculas", () => {
    const sheet = makeSheet([["TUT-abc123", "Tema", "", "", "", "", "", "Ana"]]);
    const result = findById(sheet, "tut-ABC123");
    assert.equal(result.rowIndex, 2);
    assert.equal(result.row[0], "TUT-abc123");
    assert.deepEqual(sheet.calls, [[2, 1, 1, 1], [2, 1, 1, 1], [2, 1, 1, 8]]);
});
test("rechaza IDs de tutorial duplicados después de normalizar mayúsculas", () => {
    const sheet = makeSheet([["tut-abc123"], ["TUT-ABC123"]]);
    assert.throws(() => findById(sheet, "tut-abc123"), /ID del tutorial aparece más de una vez/);
});
test("comprueba unicidad de título leyendo únicamente la columna B", () => {
    const sheet = makeSheet([["id1", "  Motor   No Arranca "], ["id2", "Otro"]]);
    assert.equal(titleExists(sheet, "motor no arranca"), true);
    assert.ok(sheet.calls.every(call => call[1] === 2));
});
test("compara todos los campos persistidos para replays de opId", () => {
    const row = ["tut-id", submission.title, "", submission.comoIdentificarlo, submission.dondeEncontrarlo,
        submission.detalles, "", submission.collaborator];
    assert.equal(rowMatches(row, submission), true);
    assert.equal(rowMatches(row, { ...submission, detalles: "Otro" }), false);
});
test("el replay se resuelve antes del lock y la creación revalida dentro", () => {
    const handler = extract("handleAddTutorial", "extractYouTubeId");
    const preflight = handler.indexOf("getTutorialSheet_(false)");
    const preflightLookup = handler.indexOf("findTutorialById_(preflightSheet, tutorialId)");
    const lock = handler.indexOf("LockService.getScriptLock()");
    const acquire = handler.indexOf("acquireFeedbackScriptLock_(lock)");
    const recheck = handler.indexOf("findTutorialById_(sheet, tutorialId)");
    const titleCheck = handler.indexOf("tutorialTitleExists_(sheet, title)");
    assert.ok(preflight >= 0 && preflight < preflightLookup && preflightLookup < lock);
    assert.ok(recheck > acquire && titleCheck > acquire);
});
test("la sección crítica ya no descarga toda Tutorial para ID y unicidad de título", () => {
    const handler = extract("handleAddTutorial", "extractYouTubeId");
    assert.doesNotMatch(handler, /getDataRange\(/);
    assert.ok(handler.indexOf("sheet.appendRow(newRow)") > handler.indexOf("tutorialTitleExists_(sheet, title)"));
});
console.log("FeedbackTutorialPreflightOutsideLock: " + passed + "/" + passed + " PASS — replay y lecturas dirigidas");
