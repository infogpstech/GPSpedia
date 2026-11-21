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
assert.doesNotMatch(handler, /LockService\.getScriptLock|acquireFeedbackScriptLock_|releaseLock/,
    "suggestYear debe coordinarse con registros append-only, sin ScriptLock global");
assert.ok(handler.indexOf("handleSuggestYearLocked(payload)") >= 0);
assert.ok(handler.indexOf("currentRow[COLS_CORTES.id - 1]") < handler.indexOf("movePrimaryVehicleImageToCanonicalFolder("));
assert.ok(handler.indexOf("currentRow[COLS_CORTES.imagenVehiculo - 1]") < handler.indexOf("movePrimaryVehicleImageToCanonicalFolder("));

function createHarness({ currentId = "VEH-1", currentImage = "drive-image-url", moveError = null, resultOverride = null } = {}) {
    const events = [];
    const sheet = {
        getLastColumn() { return 48; },
        getRange() {
            return { getValues: () => {
                const row = Array(48).fill("");
                row[0] = currentId; row[8] = currentImage;
                return [row];
            } };
        }
    };
    const fn = new Function("handleSuggestYearLocked", "logUserActivity", "COLS_CORTES",
        "movePrimaryVehicleImageToCanonicalFolder", "Logger",
        handler + "\nreturn handleSuggestYear;")(
        () => {
            events.push("handler");
            return resultOverride || {
                status: "success", message: "Rango actualizado.",
                _activityLogRequest: { userId: "U1", userName: "User", activityType: "apply_year_suggestion", associatedId: "VEH-1", details: "Applied" },
                _folderSyncRequest: { sheet, rowNumber: 2, vehicleId: "VEH-1", expectedImageUrl: "drive-image-url" }
            };
        },
        () => { events.push("activity"); },
        { id: 1, imagenVehiculo: 9 },
        () => { events.push("drive"); if (moveError) throw moveError; return { moved: true }; },
        { log: () => events.push("log") }
    );
    return { run: () => fn({}), events };
}

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("procesa actividad y Drive después del append y elimina datos internos de la respuesta", () => {
    const h = createHarness();
    const result = h.run();
    assert.deepEqual(h.events, ["handler", "activity", "drive"]);
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
    assert.deepEqual(h.events, ["handler"]);
    assert.equal(result.status, "info");
});

console.log("FeedbackYearFolderSyncOutsideLock: " + passed + "/" + passed + " PASS");
