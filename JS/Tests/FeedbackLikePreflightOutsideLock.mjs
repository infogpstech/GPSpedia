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

const handler = extract("handleRecordLike", "findFeedbackRowById_");
test("el handler serializa la búsqueda de duplicados y la inserción", () => {
    assert.match(handler, /withFeedbackLikeLock_\(\(\) =>/);
    assert.match(handler, /findFeedbackLikeRowsForActor_\(ledger, actorKey, vehicleId\)/);
    assert.match(extract("withFeedbackLikeLock_"), /waitLock\(10000\)/);
    assert.match(extract("withFeedbackLikeLock_"), /finally[\s\S]*releaseLock/);
});
test("la unicidad se comprueba por actor y vehículo, no por corte", () => {
    const rows = extract("findFeedbackLikeRowsForActor_");
    assert.match(rows, /String\(row\[1\] \|\| ""\)\.trim\(\) !== String\(vehicleId\)/);
    assert.doesNotMatch(rows, /Number\(row\[2\]\) !== Number\(corteIndex\)/);
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
console.log("FeedbackLikePreflightOutsideLock: " + passed + "/" + passed + " PASS — unicidad por usuario/vehículo con sección crítica breve");
