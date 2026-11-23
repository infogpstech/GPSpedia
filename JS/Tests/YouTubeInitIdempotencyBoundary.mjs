import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const feedback = readFileSync("JS/Services/feedback.js", "utf8");
const client = readFileSync("JS/Frontend/youtubeUpload.js", "utf8");

function extractFunction(source, name) {
    const marker = new RegExp("function\\s+" + name + "\\s*\\(");
    const match = marker.exec(source);
    assert.ok(match, "No se encontró " + name);
    const start = match.index;
    const brace = source.indexOf("{", start);
    let depth = 0;
    for (let i = brace; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    throw new Error("No se pudo extraer " + name);
}
function extractConstant(source, name) {
    const start = source.indexOf("const " + name + " =");
    assert.ok(start >= 0, "No se encontró constante " + name);
    const end = source.indexOf(";", start);
    assert.ok(end > start, "No se pudo extraer constante " + name);
    return source.slice(start, end + 1);
}
const declarations = [
    "YOUTUBE_UPLOAD_RESERVATIONS_SHEET_",
    "YOUTUBE_UPLOAD_RESERVATION_HEADERS_",
    "YOUTUBE_UPLOAD_SESSION_CACHE_TTL_SECONDS_",
    "YOUTUBE_UPLOAD_RESERVATION_TTL_MS_"
].map(name => extractConstant(feedback, name)).join("\n") + "\n" + [
    "getYouTubeUploadReservationSheet_",
    "buildYouTubeUploadReservationHash_",
    "buildYouTubeUploadSessionCacheKey_",
    "isValidYouTubeUploadSessionUrl_",
    "withYouTubeUploadReservationLock_",
    "findYouTubeUploadReservation_",
    "saveYouTubeUploadReservation_",
    "reserveYouTubeUploadInitialization_",
    "finishYouTubeUploadInitialization_",
    "markYouTubeUploadReservationSubmitted_",
    "handleInitYouTubeUpload"
].map(name => extractFunction(feedback, name)).join("\n");

class FakeSheet {
    constructor() { this.rows = []; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
    appendRow(row) { this.rows.push(row.slice()); }
    getRange(row, column, numRows = 1, numColumns = 1) {
        const sheet = this;
        return {
            getValues() {
                return Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numColumns }, (_, c) => {
                        const value = (sheet.rows[row - 1 + r] || [])[column - 1 + c];
                        return value === undefined || value === null ? "" : value;
                    }));
            },
            getDisplayValues() { return this.getValues().map(line => line.map(value => String(value))); },
            getValue() {
                const value = (sheet.rows[row - 1] || [])[column - 1];
                return value === undefined || value === null ? "" : value;
            },
            setValue(value) { this.setValues([[value]]); },
            setValues(values) {
                values.forEach((line, r) => {
                    const rowIndex = row - 1 + r;
                    while (sheet.rows.length <= rowIndex) sheet.rows.push([]);
                    const target = sheet.rows[rowIndex];
                    line.forEach((value, c) => { target[column - 1 + c] = value; });
                });
            }
        };
    }
}
const sheets = new Map();
const spreadsheet = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) { const sheet = new FakeSheet(); sheets.set(name, sheet); return sheet; }
};
const targetSheet = { getRange: () => ({ getValue: () => "" }) };
const cacheStore = new Map();
const cache = {
    get(key) { return cacheStore.has(key) ? cacheStore.get(key) : null; },
    put(key, value) { cacheStore.set(key, String(value)); },
    remove(key) { cacheStore.delete(key); }
};
const logs = [], requests = [];
let sessionCount = 0, uuidCount = 0, throwNextFetch = false;
const lock = { tryLock: () => true, releaseLock: () => {} };
const utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF-8" },
    computeDigest: (_algorithm, value) => Array.from(createHash("sha256").update(String(value)).digest()),
    getUuid: () => "uuid-" + (++uuidCount),
    formatDate: () => "2026-11-23T00:00:00.000Z"
};
const api = new Function(
    "getSafeSheet", "SHEET_NAMES", "findPendingVideoApprovalForTarget_", "getVideoApprovalTarget_",
    "ScriptApp", "UrlFetchApp", "Logger", "getSpreadsheet", "CacheService", "LockService",
    "Utilities", "SpreadsheetApp",
    declarations + "\nreturn { init: handleInitYouTubeUpload, markSubmitted: markYouTubeUploadReservationSubmitted_, " +
    "getReservationSheet: getYouTubeUploadReservationSheet_, buildCacheKey: buildYouTubeUploadSessionCacheKey_ };"
)(
    () => ({}),
    { FEEDBACKS: "Feedbacks" },
    () => null,
    () => ({ record: { rowIndex: 2 }, sheet: targetSheet, videoColumn: 10 }),
    { getOAuthToken: () => "sensitive-oauth-token" },
    { fetch: (url, options) => {
        requests.push({ url, options });
        if (throwNextFetch) { throwNextFetch = false; throw new Error("network uncertain"); }
        const id = ++sessionCount;
        return {
            getResponseCode: () => 201,
            getAllHeaders: () => ({ Location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=session-" + id })
        };
    } },
    { log: value => logs.push(String(value)) },
    () => spreadsheet,
    { getScriptCache: () => cache },
    { getScriptLock: () => lock },
    utilities,
    { flush: () => {} }
);

const basePayload = {
    opVideoId: "op-video-0000000000000001",
    userId: "user-1",
    title: "Video de prueba",
    description: "Descripción",
    contentType: "corte",
    referenceId: "veh-001",
    fileName: "video.mp4",
    fileSize: 1024,
    fileType: "video/mp4"
};
let checks = 0;
function test(name, fn) { fn(); checks++; }
const first = api.init({ ...basePayload });
test("crea una reserva y una sola sesión inicial", () => {
    assert.equal(first.status, "success");
    assert.equal(first.reusedSession, false);
    assert.equal(sessionCount, 1);
});
const reservationSheet = api.getReservationSheet();
test("guarda solo hash y estado en Spreadsheet; URL y OAuth quedan fuera", () => {
    const stored = JSON.stringify(reservationSheet.rows);
    assert.doesNotMatch(stored, /https:\/\/www\.googleapis\.com\/upload\/youtube|sensitive-oauth-token/);
    assert.doesNotMatch(logs.join("\n"), /https:\/\/www\.googleapis\.com\/upload\/youtube|sensitive-oauth-token/);
    assert.match(String(reservationSheet.rows[1][4]), /^[a-f0-9]{64}$/);
    assert.equal(cache.get(api.buildCacheKey("user-1", basePayload.opVideoId)), first.uploadUrl);
    assert.match(requests[0].options.headers.Authorization, /^Bearer sensitive-oauth-token$/);
});
const retry = api.init({ ...basePayload });
test("reintento de la misma operación reutiliza URL y no crea otra sesión", () => {
    assert.equal(retry.status, "success");
    assert.equal(retry.reusedSession, true);
    assert.equal(retry.uploadUrl, first.uploadUrl);
    assert.equal(sessionCount, 1);
});
test("el mismo opVideoId no admite cambios de metadatos", () => {
    assert.throws(() => api.init({ ...basePayload, title: "Otro título" }), /ya pertenece a otra carga o destino/);
});
test("una operación distinta no reserva un destino que ya tiene carga activa", () => {
    assert.throws(() => api.init({ ...basePayload, opVideoId: "op-video-0000000000000002" }),
        /ya tiene una carga de vídeo en curso o sin resolver/);
});
const renewed = api.init({ ...basePayload, renewSession: true, expiredUploadUrl: first.uploadUrl });
test("renueva solo la sesión expirada identificada por su URL exacta", () => {
    assert.equal(renewed.status, "success");
    assert.equal(renewed.reusedSession, false);
    assert.notEqual(renewed.uploadUrl, first.uploadUrl);
    assert.equal(sessionCount, 2);
});
const renewedRetry = api.init({ ...basePayload });
test("el reintento posterior a la renovación reutiliza la sesión nueva", () => {
    assert.equal(renewedRetry.reusedSession, true);
    assert.equal(renewedRetry.uploadUrl, renewed.uploadUrl);
    assert.equal(sessionCount, 2);
});
test("rechaza renovar con una URL externa o mal formada", () => {
    assert.throws(() => api.init({ ...basePayload, opVideoId: "op-video-0000000000000003",
        renewSession: true, expiredUploadUrl: "https://evil.example/upload" }),
        /URL de sesión reanudable de YouTube confirmada como expirada/);
});
test("la reserva vincula operación, usuario y destino", () => {
    assert.throws(() => api.init({ ...basePayload, userId: "user-2" }), /ya pertenece a otra carga o destino/);
});
test("marca submitted de forma idempotente y elimina la capacidad de sesión", () => {
    const record = { ...basePayload };
    assert.equal(api.markSubmitted(record), true);
    assert.equal(api.markSubmitted(record), true);
    assert.equal(reservationSheet.rows[1][5], "submitted");
    assert.equal(cache.get(api.buildCacheKey("user-1", basePayload.opVideoId)), null);
});
test("una operación enviada a aprobación no puede inicializar otra sesión", () => {
    assert.throws(() => api.init({ ...basePayload }), /ya fue enviada a aprobación/);
});
const uncertainPayload = { ...basePayload, opVideoId: "op-video-0000000000000004", referenceId: "veh-002" };
throwNextFetch = true;
const uncertain = api.init(uncertainPayload);
test("un resultado de red incierto se conserva como requires_review", () => {
    assert.equal(uncertain.status, "error");
    assert.match(uncertain.message, /requiere revisión/);
    const row = reservationSheet.rows.find(value => value[0] === uncertainPayload.opVideoId);
    assert.equal(row[5], "requires_review");
});
test("una operación requires_review bloquea nuevos intentos y sesiones duplicadas", () => {
    assert.throws(() => api.init(uncertainPayload), /quedó en estado incierto/);
    assert.equal(sessionCount, 2);
});
test("el contexto de operación del navegador se separa por pestaña y usuario", () => {
    assert.match(client, /sessionStorage/);
    assert.match(client, /getYouTubeOperationContext_/);
    assert.match(client, /opVideoId/);
});
console.log("YouTubeInitIdempotencyBoundary: " + checks + "/" + checks + " PASS — reserva por operación/destino, reintento, renovación segura, estado incierto y secretos fuera de logs/Spreadsheet.");