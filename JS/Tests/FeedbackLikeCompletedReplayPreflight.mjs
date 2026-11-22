import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findCompletedLikeReplayNoop_(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró findCompletedLikeReplayNoop_");
const rowsStart = source.indexOf("function findFeedbackLikeRowsForActor_(");
const rowsEnd = source.indexOf("\nfunction ", rowsStart + 10);
assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, "No se encontró findFeedbackLikeRowsForActor_");
const snapshotStart = source.indexOf("function readLikeActorReplaySnapshot_(");
const snapshotEnd = source.indexOf("\nfunction ", snapshotStart + 10);
assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart, "No se encontró readLikeActorReplaySnapshot_");
const countStart = source.indexOf("function getFeedbackLikeEventCount_(");
const countEnd = source.indexOf("\nfunction ", countStart + 10);
assert.ok(countStart >= 0 && countEnd > countStart, "No se encontró getFeedbackLikeEventCount_");
const code = source.slice(rowsStart, rowsEnd) + "\n" + source.slice(snapshotStart, snapshotEnd) +
    "\n" + source.slice(countStart, countEnd) + "\n" + source.slice(start, end);
const headers = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
function makeHarness({ rows = [["user:7", "10", 2, 4, 5, "completed", "now"]], schema = headers, counter = 8, ledgerExists = true } = {}) {
    const calls = [];
    const ledger = {
        getLastRow: () => rows.length + 1,
        getLastColumn: () => 7,
        getRange(...args) {
            calls.push(args);
            if (args[0] === 1) return { getValues: () => [schema] };
            if (args[1] === 2 && args[3] === 1) return {
                createTextFinder: () => ({ matchCase() { return this; }, matchEntireCell() { return this; }, findAll: () => [] })
            };
            if (args[1] === 1 && args[3] === 1) return {
                createTextFinder: key => ({
                    matchCase() { return this; },
                    findAll: () => rows.map((row, index) => ({ row, rowIndex: index + 2 }))
                        .filter(item => item.row[0] === key).map(item => ({ getRow: () => item.rowIndex }))
                })
            };
            return { getValues: () => [rows[args[0] - 2]] };
        }
    };
    const replay = new Function("getSpreadsheet", code + "\nreturn findCompletedLikeReplayNoop_;")(
        () => ({ getSheetByName: () => ledgerExists ? ledger : null })
    );
    const cuts = { getRange: () => ({ getValue: () => counter }) };
    return { run: () => replay(cuts, { rowIndex: 4 }, "user:7", "10", 2, 17), calls };
}
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("like completado e íntegro se resuelve sin mutación", () => {
    const h = makeHarness();
    assert.deepEqual(h.run(), { status: "success", alreadyLiked: true, likeCount: 8, message: "Este usuario ya había registrado su like." });
});
test("el snapshot de replay valida encabezados y consulta una sola vez las filas del actor", () => {
    const h = makeHarness();
    assert.deepEqual(h.run().alreadyLiked, true);
    assert.equal(h.calls.filter(args => args[0] === 1 && args[1] === 1).length, 1,
        "Los encabezados de FeedbackLikes se leen una sola vez.");
    assert.equal(h.calls.filter(args => args[0] === 2 && args[1] === 1 && args[3] === 1).length, 1,
        "Las filas del actor se localizan una sola vez y se reutilizan para el replay.");
});
test("like pendiente vuelve a la ruta protegida", () => {
    const h = makeHarness({ rows: [["user:7", "10", 2, 4, 5, "pending", "now"]] });
    assert.equal(h.run(), null);
});
test("registros duplicados no se resuelven como replay", () => {
    const row = ["user:7", "10", 2, 4, 5, "completed", "now"];
    const h = makeHarness({ rows: [row, row] });
    assert.equal(h.run(), null);
});
test("esquema incompatible no permite un falso replay", () => {
    const h = makeHarness({ schema: ["wrong", ...headers.slice(1)] });
    assert.equal(h.run(), null);
});
test("contador inválido vuelve a la ruta protegida", () => {
    const h = makeHarness({ counter: -1 });
    assert.equal(h.run(), null);
});
test("ausencia de ledger no crea hojas durante el preflight", () => {
    const h = makeHarness({ ledgerExists: false });
    assert.equal(h.run(), null);
});
const handlerStart = source.indexOf("function handleRecordLike(");
const handlerEnd = source.indexOf("\nfunction ", handlerStart + 10);
const handler = source.slice(handlerStart, handlerEnd);
assert.ok(handler.indexOf("findCompletedLikeReplayNoop_") < handler.indexOf("const ledger = replaySnapshot ? replaySnapshot.ledger : ensureFeedbackLikesSheet_"),
    "El replay completado debe resolverse antes de crear/leer el ledger para mutación.");
assert.match(handler, /const ledger = replaySnapshot \\? replaySnapshot\\.ledger : ensureFeedbackLikesSheet_\\(\\)/,
    "Si el preflight ya validó encabezados y filas, el handler debe reutilizar ese ledger sin leer encabezados por segunda vez.");
assert.match(handler,/const replaySnapshot = readLikeActorReplaySnapshot_\(/);
assert.match(handler,/findCompletedLikeReplayNoop_\([\s\S]*?utilCol, replaySnapshot\)/);
assert.match(handler,/findLikeEventReplayNoop_\([\s\S]*?utilCol, replaySnapshot\)/);
assert.match(handler,/const existingRows = replaySnapshot\s*\?\s*replaySnapshot\.rows/);
assert.equal((handler.match(/findFeedbackLikeRowsForActor_\(/g)||[]).length,1,
    "El handler debe conservar una sola consulta de respaldo cuando el preflight no puede obtener snapshot.");
assert.doesNotMatch(handler,/LockService|getScriptLock|acquireFeedbackScriptLock_/,
    "La ruta de likes no debe adquirir lock global.");
console.log("FeedbackLikeCompletedReplayPreflight: " + passed + "/" + passed + " PASS — replays completados y pendientes fuera del lock");
