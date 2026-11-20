import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const helperStart = source.indexOf("function completeFeedbackYearApplication_");
const helperEnd = source.indexOf("\nfunction yearRangesOverlapInclusive_", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "No se encontró completeFeedbackYearApplication_");
const helper = source.slice(helperStart, helperEnd);
assert.doesNotMatch(helper, /movePrimaryVehicleImageToCanonicalFolder|logUserActivity/,
    "El helper de mutación no debe hacer Drive ni registrar actividad bajo lock");
assert.match(helper, /_folderSyncRequest/);
assert.match(helper, /_activityLogRequest/);

const start = source.indexOf("function handleSuggestYear(payload) {");
const end = source.indexOf("\nfunction isVerifiedSuggestionActorKey_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleSuggestYear");
const handler = source.slice(start, end);
const release = handler.indexOf("lock.releaseLock()");
const activity = handler.indexOf("logUserActivity(");
const folderMove = handler.indexOf("movePrimaryVehicleImageToCanonicalFolder(");
assert.ok(release >= 0 && release < activity && release < folderMove,
    "Actividad y sincronización de carpeta deben ocurrir después de liberar ScriptLock");
assert.ok(handler.indexOf("currentRow[COLS_CORTES.id - 1]") < folderMove);
assert.ok(handler.indexOf("currentRow[COLS_CORTES.imagenVehiculo - 1]") < folderMove);

function createHarness({ currentId = "VEH-1", currentImage = "drive-image-url", moveError = null, resultOverride = null } = {}) {
    const events = [];
    let lockHeld = false;
    const lock = {
        tryLock(timeout) { events.push("lock"); assert.equal(timeout, 0); lockHeld = true; return true; },
        releaseLock() { events.push("release"); lockHeld = false; }
    };
    const sheet = {
        getLastColumn() { assert.equal(lockHeld, false); return 48; },
        getRange() {
            assert.equal(lockHeld, false);
            return { getValues: () => {
                const row = Array(48).fill("");
                row[0] = currentId; row[8] = currentImage;
                return [row];
            } };
        }
    };
    const fn = new Function("LockService", "acquireFeedbackScriptLock_", "handleSuggestYearLocked",
        "logUserActivity", "COLS_CORTES", "movePrimaryVehicleImageToCanonicalFolder", "Logger",
        handler + "\nreturn handleSuggestYear;")(
        { getScriptLock: () => lock },
        candidate => { if (!candidate.tryLock(0)) throw new Error("FEEDBACK_BUSY"); },
        () => {
            assert.equal(lockHeld, true);
            return resultOverride || {
                status: "success", message: "Rango actualizado.",
                _activityLogRequest: { userId: "U1", userName: "User", activityType: "apply_year_suggestion", associatedId: "VEH-1", details: "Applied" },
                _folderSyncRequest: { sheet, rowNumber: 2, vehicleId: "VEH-1", expectedImageUrl: "drive-image-url" }
            };
        },
        () => { assert.equal(lockHeld, false); events.push("activity"); },
        { id: 1, imagenVehiculo: 9 },
        () => { assert.equal(lockHeld, false); events.push("drive"); if (moveError) throw moveError; return { moved: true }; },
        { log: () => events.push("log") }
    );
    return { run: () => fn({}), events, isLocked: () => lockHeld };
}
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("libera ScriptLock antes de actividad y Drive y elimina datos internos de la respuesta", () => {
    const h = createHarness();
    const result = h.run();
    assert.deepEqual(h.events, ["lock", "release", "activity", "drive"]);
    assert.equal(h.isLocked(), false);
    assert.equal(result.folderSyncWarning, false);
    assert.equal("_folderSyncRequest" in result, false);
    assert.equal("_activityLogRequest" in result, false);
});

test("si cambia la identidad de la fila no mueve una imagen posiblemente ajena", () => {
    const h = createHarness({ currentId: "VEH-OTHER" });
    const result = h.run();
    assert.equal(h.events.includes("drive"), false);
    assert.equal(result.folderSyncWarning, true);
    assert.match(result.message, /cambió/);
});

test("si cambia la URL de imagen no mueve un archivo obsoleto", () => {
    const h = createHarness({ currentImage: "new-image-url" });
    const result = h.run();
    assert.equal(h.events.includes("drive"), false);
    assert.equal(result.folderSyncWarning, true);
    assert.match(result.message, /imagen principal cambió/);
});

test("si Drive falla devuelve advertencia sin revertir la ampliación confirmada", () => {
    const h = createHarness({ moveError: new Error("Drive unavailable") });
    const result = h.run();
    assert.equal(result.status, "success");
    assert.equal(result.folderSyncWarning, true);
    assert.match(result.message, /Drive unavailable/);
});

test("una respuesta informativa no ejecuta actividad ni sincronización Drive", () => {
    const h = createHarness({ resultOverride: { status: "info", message: "Sin cambios." } });
    const result = h.run();
    assert.deepEqual(h.events, ["lock", "release"]);
    assert.equal(result.status, "info");
});

console.log("FeedbackYearFolderSyncOutsideLock: " + passed + "/" + passed + " PASS");
