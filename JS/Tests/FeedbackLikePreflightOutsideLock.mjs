import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function extract(name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName
        ? source.indexOf("\nfunction " + nextName + "(", start + 10)
        : source.indexOf("\nfunction ", start + 10);
    assert.ok(end > start, "No se encontró el final de " + name);
    return source.slice(start, end);
}

const helperCode = extract("findFeedbackVehicleRowForLike_", "handleRecordLike");
const findVehicle = new Function("COLS_CORTES", helperCode + "\nreturn findFeedbackVehicleRowForLike_;")({ id: 1 });
function makeSheet(ids) {
    const rows = [["id", "marca", "modelo"], ...ids.map((id, index) => [id, "Marca " + index, "Modelo " + index])];
    return {
        getLastRow: () => rows.length,
        getLastColumn: () => 3,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            return {
                getValue: () => (rows[row - 1] || [])[column - 1] ?? "",
                getValues: () => rows.slice(row - 1, row - 1 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount)),
                createTextFinder(query) {
                    return {
                        matchCase() { return this; },
                        findAll() {
                            const matches = [];
                            for (let index = row - 1; index < row - 1 + rowCount; index++) {
                                if (String((rows[index] || [])[column - 1] ?? "").includes(String(query))) {
                                    matches.push({ getRow: () => index + 1 });
                                }
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

test("localiza por ID conservando compatibilidad con espacios heredados", () => {
    const result = findVehicle(makeSheet(["101", " 202 ", "303"]), "202");
    assert.equal(result.rowIndex, 3);
    assert.equal(result.row[0], " 202 ");
});
test("rechaza IDs duplicados después de normalizar espacios", () => {
    assert.throws(() => findVehicle(makeSheet(["101", " 101 "]), "101"), /ID duplicado/);
});
test("rechaza vehículos inexistentes sin descargar Cortes completo", () => {
    assert.throws(() => findVehicle(makeSheet(["101", "202"]), "303"), /No se encontró el vehículo/);
});
test("el handler de likes usa append-only sin lock global", () => {
    const handler = extract("handleRecordLike", "findReportByReportId_");
    assert.match(handler, /findFeedbackVehicleRowForLike_\(cuts, vehicleId\)/);
    assert.match(handler, /findLikeEventReplayNoop_/);
    assert.match(handler, /eventLedger\.appendRow\(/);
    assert.doesNotMatch(handler, /LockService|getScriptLock|acquireFeedbackScriptLock_|setValue\(/);
    assert.doesNotMatch(handler, /getDataRange\(/, "El handler no debe descargar toda la hoja Cortes ni FeedbackLikes");
});

test("el ledger consulta solo likes del actor y la actividad queda fuera del lock", () => {
    const handler = extract("handleRecordLike", "findReportByReportId_");
    assert.match(handler, /createTextFinder\(actorKey\)/);
    assert.match(handler, /getRange\(rowIndex, 1, 1, 7\)\.getValues\(\)/);
    const release = handler.indexOf("lock.releaseLock()");
    const activity = handler.indexOf('logUserActivity(userId, userName, "like"');
    assert.ok(release >= 0 && activity > release);
});
console.log("FeedbackLikePreflightOutsideLock: " + passed + "/" + passed + " PASS — lectura dirigida y revalidación bajo lock");
