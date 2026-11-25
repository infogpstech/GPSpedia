import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    const end = source.indexOf("\nfunction ", start + 10);
    assert.ok(start >= 0 && end > start, "No se encontró " + name);
    return source.slice(start, end);
}
const headers = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
function makeHarness(seedRows = [], options = {}) {
    const cutsRows = [Array(42).fill("header"), Array(42).fill("")];
    cutsRows[1][0] = "100";
    cutsRows[1][11] = "Corte de ignición";
    cutsRows[1][16] = 0;
    cutsRows[1][18] = "Corte de bomba";
    cutsRows[1][23] = 0;
    const ledgerRows = [headers.slice(), ...seedRows.map(row => row.slice())];
    const state = { waits: 0, releases: 0, activities: 0, flushes: 0, lockHeld: false };
    const lockAvailable = options.lockAvailable !== false;
    function sheet(rows) {
        return {
            getLastRow: () => rows.length,
            getLastColumn: () => rows[0].length,
            getRange(row, col, rowCount = 1, colCount = 1) {
                return {
                    getValue: () => rows[row - 1]?.[col - 1] ?? "",
                    getValues: () => rows.slice(row - 1, row - 1 + rowCount)
                        .map(line => line.slice(col - 1, col - 1 + colCount)),
                    setValues(values) {
                        values.forEach((line, offset) => {
                            rows[row - 1 + offset] = rows[row - 1 + offset] || [];
                            line.forEach((value, index) => { rows[row - 1 + offset][col - 1 + index] = value; });
                        });
                    },
                    createTextFinder(query) {
                        let caseSensitive = false;
                        return {
                            matchCase() { caseSensitive = true; return this; },
                            matchEntireCell() { return this; },
                            findAll() {
                                const expected = String(query);
                                const matches = [];
                                for (let index = row - 1; index < Math.min(rows.length, row - 1 + rowCount); index++) {
                                    const value = String(rows[index]?.[col - 1] ?? "");
                                    if ((caseSensitive ? value : value.toLowerCase()) ===
                                        (caseSensitive ? expected : expected.toLowerCase())) {
                                        matches.push({ getRow: () => index + 1 });
                                    }
                                }
                                return matches;
                            }
                        };
                    }
                };
            },
            appendRow(row) { rows.push(row.slice()); }
        };
    }
    const cuts = sheet(cutsRows), ledger = sheet(ledgerRows);
    const dependencies = {
        LockService: { getScriptLock: () => ({
            tryLock(ms) { assert.equal(ms, 0); state.waits++; if (!lockAvailable) return false; state.lockHeld = true; return true; },
            releaseLock() { state.lockHeld = false; state.releases++; }
        }) },
        Utilities: { DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
            computeDigest: (_algorithm, value) => Array.from(Buffer.from(String(value)).subarray(0, 32)) },
        SpreadsheetApp: { flush() { state.flushes++; } },
        SHEET_NAMES: { CORTES: "Cortes" },
        COLS_CORTES: { id:1, tipoCorte1:12, utilCorte1:17, tipoCorte2:19, utilCorte2:24, tipoCorte3:26, utilCorte3:31 },
        getSafeSheet: () => { assert.equal(state.lockHeld, false, "La localización del vehículo debe quedar fuera del lock."); return cuts; },
        getSpreadsheet: () => { assert.equal(state.lockHeld, false, "La preparación del ledger debe quedar fuera del lock."); return { getSheetByName: name => name === "FeedbackLikes" ? ledger : null }; },
        logUserActivity() { state.activities++; },
        state, cutsRows, ledgerRows
    };
    const code = [
        "function ensureFeedbackLikesSheet_(){const sheet=getSpreadsheet().getSheetByName('FeedbackLikes');const expected=" + JSON.stringify(headers) + ";const actual=sheet.getRange(1,1,1,7).getValues()[0];if(expected.some((value,index)=>String(actual[index]||'').trim()!==value))throw new Error('bad headers');return sheet;}",
        extract("normalizeFeedbackLikeActorKey_"),
        extract("buildFeedbackLikeActorKey_"),
        extract("withFeedbackLikeLock_"),
        extract("findFeedbackLikeRowsForActor_"),
        extract("getFeedbackLikeEventCount_"),
        extract("getFeedbackLikeCountWithEvents_"),
        extract("logLikeActivityAfterAppend_"),
        extract("findFeedbackVehicleRowForLike_"),
        extract("handleRecordLike")
    ].join("\n");
    const api = new Function(...Object.keys(dependencies), code + "\nreturn handleRecordLike;")(...Object.values(dependencies));
    return { run: api, state, ledgerRows };
}
const h = makeHarness();
const first = h.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" });
assert.deepEqual(first, { status:"success", alreadyLiked:false, corteIndex:1, likeCount:1 });
assert.equal(h.ledgerRows.length, 2, "El primer útil crea una fila.");
const duplicateSameCut = h.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" });
assert.deepEqual(duplicateSameCut, { status:"success", alreadyLiked:true, corteIndex:1, likeCount:1 });
assert.equal(h.ledgerRows.length, 2, "El mismo útil no crea otra fila.");
const duplicateOtherCut = h.run({ vehicleId:"100", corteIndex:2, userId:"7", userName:"Pablo Peña" });
assert.deepEqual(duplicateOtherCut, { status:"success", alreadyLiked:true, corteIndex:1, likeCount:1 });
assert.equal(h.ledgerRows.length, 2, "El mismo usuario no puede crear un segundo útil en el mismo vehículo.");
const otherUser = h.run({ vehicleId:"100", corteIndex:1, userId:"8", userName:"Ana" });
assert.deepEqual(otherUser, { status:"success", alreadyLiked:false, corteIndex:1, likeCount:2 });
assert.equal(h.ledgerRows.length, 3);
assert.equal(h.state.waits, 4);
assert.equal(h.state.releases, 4);
assert.equal(h.state.activities, 2, "Solo los útiles nuevos generan actividad.");
assert.ok(h.ledgerRows.slice(1).every(row => row[5] === "event"));
const busy = makeHarness([], { lockAvailable: false });
assert.throws(() => busy.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" }),
    error => error && error.code === "LIKE_LOCK_BUSY");
assert.equal(busy.ledgerRows.length, 1, "La contención no debe insertar un voto sin comprobar idempotencia.");
const countReadFailure = makeHarness();
countReadFailure.cutsRows[1][16] = "contador-no-numérico";
const savedDespiteCountReadFailure = countReadFailure.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" });
assert.equal(savedDespiteCountReadFailure.status, "success", "El error posterior de conteo no debe falsear un append confirmado.");
assert.equal(countReadFailure.ledgerRows.length, 2, "El primer voto debe permanecer guardado.");
assert.equal(Object.hasOwn(savedDespiteCountReadFailure, "likeCount"), false);
const invalidOtherActor = makeHarness([["", "100", "1", 0, 0, "event", "legacy-invalid-actor"]]);
const validAfterInvalid = invalidOtherActor.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" });
assert.deepEqual(validAfterInvalid, { status:"success", alreadyLiked:false, corteIndex:1, likeCount:1 });
assert.equal(invalidOtherActor.ledgerRows.length, 3, "La fila histórica se conserva y el voto válido se registra.");
const invalidCutOtherActor = makeHarness([["user:8", "100", "9", 0, 0, "event", "legacy-invalid-cut"]]);
const validAfterInvalidCut = invalidCutOtherActor.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" });
assert.equal(validAfterInvalidCut.status, "success");
assert.equal(validAfterInvalidCut.likeCount, 1);
const invalidSameActor = makeHarness([["user:7", "100", "9", 0, 0, "event", "legacy-invalid-same-actor"]]);
assert.throws(() => invalidSameActor.run({ vehicleId:"100", corteIndex:1, userId:"7", userName:"Pablo Peña" }), /referencia de corte inválida/);
assert.equal(invalidSameActor.ledgerRows.length, 2, "No se inserta otra fila si la identidad coincide con un evento corrupto.");
const legacyActor = makeHarness([["user:user:7","100","1",0,0,"event","legacy"]]);
const legacyDuplicate = legacyActor.run({ vehicleId:"100", corteIndex:2, userId:"user:7", userName:"Pablo Peña" });
assert.equal(legacyDuplicate.alreadyLiked, true);
assert.equal(legacyActor.ledgerRows.length, 2, "La identidad histórica no crea una fila adicional al normalizarse.");
assert.equal(legacyActor.state.activities, 0);
console.log("FeedbackLikeIdempotency: PASS — duplicados, legacy, contención, conteo posterior y eventos históricos");
