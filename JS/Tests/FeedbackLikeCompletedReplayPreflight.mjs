import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleRecordLike(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleRecordLike.");
const handler = source.slice(start, end);
function extract(name) {
    const a = source.indexOf("function " + name + "(");
    const b = source.indexOf("\nfunction ", a + 10);
    assert.ok(a >= 0 && b > a, "No se encontró " + name);
    return source.slice(a, b);
}
let passed = 0;
function test(name, callback) { callback(); passed++; console.log("PASS " + name); }

test("el replay existente se comprueba dentro del lock antes de insertar", () => {
    assert.match(handler, /withFeedbackLikeLock_\(\(\) =>/);
    assert.ok(handler.indexOf("findFeedbackLikeRowsForActor_(ledger, actorKey, vehicleId)") <
        handler.indexOf('ledger.appendRow([actorKey, vehicleId, corteIndex, 0, 0, "event"'));
});
test("cualquier evento previo del mismo usuario y vehículo evita una nueva fila", () => {
    assert.match(handler, /existingRows = findFeedbackLikeRowsForActor_\(ledger, actorKey, vehicleId\)/);
    assert.match(handler, /existingEvents\.length/);
    assert.doesNotMatch(handler, /existingRows\.length > 1/);
    assert.doesNotMatch(handler, /alreadyLiked:\s*true[^}]*message:/s);
});
test("los registros legacy completed y pending conservan reconciliación sin duplicar filas", () => {
    assert.match(handler, /completedRows/);
    assert.match(handler, /pendingRows/);
    assert.match(handler, /ledger\.getRange\(pending\.rowIndex, 1, 1, 7\)\.setValues\(\[recoveredRow\]\)/);
    assert.doesNotMatch(handler, /appendRow\([\s\S]*pending/);
});
test("la respuesta idempotente no devuelve mensajes al usuario", () => {
    assert.doesNotMatch(handler, /message:/);
    assert.match(handler, /status: "success", alreadyLiked: true/);
});
test("la proyección usa identidad normalizada y deduplica una vez por vehículo", () => {
    assert.match(extract("normalizeFeedbackLikeActorKey_"), /computeDigest/);
    assert.match(extract("getFeedbackLikeEventCount_"), /firstCutByActor/);
});
console.log("FeedbackLikeCompletedReplayPreflight: " + passed + "/" + passed + " PASS");
