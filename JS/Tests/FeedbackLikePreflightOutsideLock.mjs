import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const frontend = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
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

const handler = extract("handleRecordLike", "findFeedbackRowById_");
test("el lock solo cubre la búsqueda de idempotencia y el append", () => {
    const lockStart = handler.indexOf("const outcome = withFeedbackLikeLock_");
    const lockBodyStart = handler.indexOf("() => {", lockStart);
    const lockEnd = handler.indexOf("\n    });", lockBodyStart);
    assert.ok(lockStart > 0 && lockBodyStart > lockStart && lockEnd > lockBodyStart);
    const critical = handler.slice(lockBodyStart, lockEnd);
    assert.ok(handler.indexOf("findFeedbackVehicleRowForLike_") < lockStart);
    assert.ok(handler.indexOf("ensureFeedbackLikesSheet_") < lockStart);
    assert.doesNotMatch(critical, /findFeedbackVehicleRowForLike_|getFeedbackLikeCountWithEvents_|getSafeSheet/);
    assert.match(critical, /findFeedbackLikeRowsForActor_\(ledger, actorKey, vehicleId, corteIndex, legacyActorKey\)/);
    assert.match(critical, /ledger\.appendRow\(/);
    assert.ok(handler.indexOf("getFeedbackLikeCountWithEvents_") > lockEnd);
    assert.match(extract("withFeedbackLikeLock_"), /tryLock\(0\)/);
    assert.match(extract("withFeedbackLikeLock_"), /finally[\s\S]*releaseLock/);
});
test("la unicidad se comprueba por actor, vehículo y corte", () => {
    const rows = extract("findFeedbackLikeRowsForActor_");
    assert.match(rows, /String\(row\[1\] \|\| ""\)\.trim\(\) !== String\(vehicleId\)/);
    assert.match(rows, /storedCut !== Number\\(corteIndex\\)/);
});
test("la telemetría se registra después de liberar el lock", () => {
    assert.ok(handler.indexOf("const outcome = withFeedbackLikeLock_") < handler.indexOf("if (outcome.created)"));
    assert.match(handler, /logLikeActivityAfterAppend_\(userId, userName, vehicleId/);
    assert.match(extract("logLikeActivityAfterAppend_"), /logUserActivity\(/);
});
test("la ruta no descarga la hoja completa y valida el ID de vehículo antes de escribir", () => {
    assert.doesNotMatch(handler, /getDataRange\(/);
    assert.match(handler, /!\/\^\[1-9\]\\d\{0,14\}\$\//);
});
test("el frontend reintenta únicamente la contención de idempotencia y conserva el código del backend", () => {
    const recordLikeStart = frontend.indexOf("export async function recordLike(");
    const recordLikeEnd = frontend.indexOf("\n}", recordLikeStart) + 2;
    const recordLike = frontend.slice(recordLikeStart, recordLikeEnd);
    assert.match(recordLike, /attempt <= 5/);
    assert.match(recordLike, /error\.code !== "LIKE_LOCK_BUSY"/);
    assert.match(recordLike, /setTimeout\(resolve, 100 \* attempt\)/);
    assert.match(frontend, /code: String\(result\.code \|\| "API_ERROR"\)/);
});
console.log("FeedbackLikePreflightOutsideLock: " + passed + "/" + passed + " PASS — preflight fuera del lock y sección crítica mínima");
