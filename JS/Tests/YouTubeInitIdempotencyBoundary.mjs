import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const client = readFileSync("JS/Frontend/youtubeUpload.js", "utf8");
const feedback = readFileSync("JS/Services/feedback.js", "utf8");

function extractFunction(source, name) {
    const marker = "function " + name + "(";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "No se encontró " + name);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === "{") depth++;
        else if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
    }
    throw new Error("Función sin cerrar: " + name);
}
function extractConstant(source, name) {
    const start = source.indexOf("const " + name + " =");
    assert.notEqual(start, -1, "No se encontró constante " + name);
    const end = source.indexOf(";", start);
    return source.slice(start, end + 1);
}
function makeSheet(initialRows = []) {
    const rows = initialRows.map(row => row.slice());
    function range(row, column, rowCount = 1, columnCount = 1) {
        return {
            getValues() {
                return Array.from({ length: rowCount }, (_, r) =>
                    Array.from({ length: columnCount }, (_, c) => {
                        const value = rows[row - 1 + r]?.[column - 1 + c];
                        return value === undefined || value === null ? "" : value;
                    }));
            },
            getDisplayValues() { return this.getValues().map(values => values.map(value => String(value))); },
            getValue() { return this.getValues()[0][0]; },
            setValues(values) {
                values.forEach((valuesRow, r) => {
                    const targetRow = row - 1 + r;
                    while (rows.length <= targetRow) rows.push([]);
                    valuesRow.forEach((value, c) => { rows[targetRow][column - 1 + c] = value; });
                });
            }
        };
    }
    return {
        rows,
        getLastRow: () => rows.length,
        getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
        getRange: range,
        appendRow(values) { rows.push(values.slice()); }
    };
}

const clientDeclarations = [
    extractConstant(client, "YOUTUBE_PENDING_OPERATION_PREFIX"),
    extractConstant(client, "YOUTUBE_PENDING_OPERATION_TTL_MS"),
    extractFunction(client, "createYouTubeOperationId_"),
    extractFunction(client, "getYouTubeOperationContext_")
].join("\n");
let generatedId = 0;
const fakeWindow = { crypto: { randomUUID: () => "tab-op-" + (++generatedId).toString().padStart(24, "0") } };
function createTabContext() {
    const storage = new Map();
    const getContext = new Function("window", "sessionStorage", "Date",
        clientDeclarations + "\nreturn getYouTubeOperationContext_;"
    )(fakeWindow, {
        getItem: key => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
    }, Date);
    return { getContext, storage };
}

function createHarness() {
    const cacheValues = new Map();
    const cache = {
        get: key => cacheValues.get(key) || null,
        put: (key, value) => cacheValues.set(key, value),
        remove: key => cacheValues.delete(key)
    };
    const feedbackSheet = makeSheet([["ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta", "Se resolvio", "Responde", "Reporte de util", "anoSugerido"]]);
    const headers = new Array(45).fill("");
    headers[0] = "id";
    headers[9] = "videoGuiaDesarmeUrl";
    const destinationRow = new Array(45).fill("");
    destinationRow[0] = "vehicle-1";
    const destinationSheet = makeSheet([headers, destinationRow]);
    const sheets = { Feedbacks: feedbackSheet, Cortes: destinationSheet };
    const spreadsheet = {
        getSheetByName: name => sheets[name] || null,
        insertSheet(name) {
            const sheet = makeSheet();
            sheets[name] = sheet;
            return sheet;
        }
    };
    let createdSessions = 0;
    const logs = [];
    const requests = [];
    const apiConstants = [
        "YOUTUBE_UPLOAD_RESERVATIONS_SHEET_",
        "YOUTUBE_UPLOAD_RESERVATION_HEADERS_",
        "YOUTUBE_UPLOAD_SESSION_CACHE_TTL_SECONDS_",
        "YOUTUBE_UPLOAD_RESERVATION_TTL_MS_"
    ].map(name => extractConstant(feedback, name));
    const helperNames = [
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
    ];
    const helpers = helperNames.map(name => extractFunction(feedback, name)).join("\n");
    const api = new Function(
        "CacheService", "LockService", "Utilities", "SpreadsheetApp", "getSpreadsheet",
        "SHEET_NAMES", "getSafeSheet", "findPendingVideoApprovalForTarget_",
        "getVideoApprovalTarget_", "ScriptApp", "UrlFetchApp", "Logger",
        apiConstants.join("\n") + "\n" + helpers +
        "\nreturn { handleInitYouTubeUpload, markYouTubeUploadReservationSubmitted_ };"
    )(
        { getScriptCache: () => cache },
        { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
        {
            DigestAlgorithm: { SHA_256: "SHA_256" },
            Charset: { UTF_8: "UTF-8" },
            computeDigest: (_algorithm, value) => Array.from(
                createHash("sha256").update(String(value), "utf8").digest(),
                byte => byte > 127 ? byte - 256 : byte
            )
        },
        { flush() {} },
        () => spreadsheet,
        { FEEDBACKS: "Feedbacks" },
        name => sheets[name] || null,
        () => null,
        () => ({ record: { rowIndex: 2 }, sheet: destinationSheet, videoColumn: 10 }),
        { getOAuthToken: () => "oauth-token-must-not-be-persisted" },
        {
            fetch: (url, options) => {
                createdSessions++;
                requests.push({ url, options });
                return {
                    getResponseCode: () => 201,
                    getAllHeaders: () => ({
                        Location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=session-" + createdSessions
                    })
                };
            }
        },
        { log: message => logs.push(String(message)) }
    );
    return {
        api, sheets, spreadsheet, cacheValues, logs, requests,
        get createdSessions() { return createdSessions; }
    };
}

function payload(opVideoId, overrides = {}) {
    return {
        title: "Vídeo técnico", description: "Prueba de recuperación",
        contentType: "corte", referenceId: "vehicle-1",
        fileName: "video.mp4", fileSize: 2048, fileType: "video/mp4",
        userId: "user-1", opVideoId, ...overrides
    };
}
let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}
function expectError(callback, text) {
    let error = null;
    try { callback(); } catch (caught) { error = caught; }
    assert.ok(error, "Se esperaba un rechazo.");
    assert.ok(String(error.message || error).includes(text),
        "Error inesperado: " + String(error.message || error));
}

const tabA = createTabContext();
const tabB = createTabContext();
const operationArgs = ["user-1", "corte", "vehicle-1", "Vídeo técnico"];
const operationA1 = tabA.getContext(...operationArgs);
const operationA2 = tabA.getContext(...operationArgs);
const operationB = tabB.getContext(...operationArgs);

test("sessionStorage conserva opVideoId en la pestaña y aísla pestañas distintas", () => {
    assert.equal(operationA1.opVideoId, operationA2.opVideoId);
    assert.notEqual(operationA1.opVideoId, operationB.opVideoId);
});

test("reintento con el mismo opVideoId recupera la misma sesión sin crear otra", () => {
    const h = createHarness();
    const first = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    const retry = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    assert.equal(first.status, "success");
    assert.equal(retry.status, "success");
    assert.equal(retry.reusedSession, true);
    assert.equal(retry.uploadUrl, first.uploadUrl);
    assert.equal(h.createdSessions, 1);
});

test("otra pestaña no puede crear una segunda sesión para el mismo destino", () => {
    const h = createHarness();
    const first = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    assert.equal(first.status, "success");
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationB.opVideoId)),
        "carga de vídeo en curso"
    );
    assert.equal(h.createdSessions, 1);
});

test("el mismo opVideoId no puede reutilizarse con metadatos distintos", () => {
    const h = createHarness();
    h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId, { title: "Otro título" })),
        "otra carga o destino"
    );
    assert.equal(h.createdSessions, 1);
});

test("la renovación rechaza URL ausente o ajena al endpoint oficial", () => {
    const h = createHarness();
    h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId, { renewSession: true })),
        "URL de sesión reanudable"
    );
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId, {
            renewSession: true, expiredUploadUrl: "https://evil.example/session"
        })),
        "URL de sesión reanudable"
    );
    assert.equal(h.createdSessions, 1);
});

test("renueva solo la URL que YouTube confirmó expirada y vuelve a deduplicar", () => {
    const h = createHarness();
    const first = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    const renewed = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId, {
        renewSession: true, expiredUploadUrl: first.uploadUrl
    }));
    const retry = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    assert.equal(renewed.status, "success");
    assert.notEqual(renewed.uploadUrl, first.uploadUrl);
    assert.equal(retry.uploadUrl, renewed.uploadUrl);
    assert.equal(retry.reusedSession, true);
    assert.equal(h.createdSessions, 2);
});

test("la pérdida de CacheService no crea una sesión duplicada", () => {
    const h = createHarness();
    h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    h.cacheValues.clear();
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId)),
        "sesión anterior no está disponible"
    );
    assert.equal(h.createdSessions, 1);
});

test("la reserva enviada a aprobación no puede inicializarse otra vez", () => {
    const h = createHarness();
    h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    h.api.markYouTubeUploadReservationSubmitted_({
        opVideoId: operationA1.opVideoId, userId: "user-1",
        contentType: "corte", referenceId: "vehicle-1"
    });
    expectError(
        () => h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId)),
        "ya fue enviada a aprobación"
    );
    assert.equal(h.createdSessions, 1);
});

test("la hoja y los logs no almacenan OAuth token ni URL temporal", () => {
    const h = createHarness();
    const result = h.api.handleInitYouTubeUpload(payload(operationA1.opVideoId));
    const reservationSheet = h.spreadsheet.getSheetByName("YouTubeUploadReservations");
    const persisted = JSON.stringify(reservationSheet.rows);
    const logged = h.logs.join("\n");
    assert.equal(result.status, "success");
    assert.ok(persisted.includes("requestHash"));
    assert.ok(!persisted.includes("oauth-token-must-not-be-persisted"));
    assert.ok(!persisted.includes(result.uploadUrl));
    assert.ok(!logged.includes("oauth-token-must-not-be-persisted"));
    assert.ok(!logged.includes(result.uploadUrl));
    assert.ok(Array.from(h.cacheValues.values()).includes(result.uploadUrl));
});

console.log("YouTubeInitIdempotencyBoundary: " + passed + "/" + passed + " PASS — reserva real, renovación y aislamiento probados sin llamar YouTube real.");
