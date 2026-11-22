import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
        else if (source[index] === "}") {
            depth--;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    throw new Error("Función sin cerrar: " + name);
}
function extractConstant(source, name) {
    const start = source.indexOf("const " + name + " =");
    assert.notEqual(start, -1, "No se encontró constante " + name);
    const end = source.indexOf(";", start);
    return source.slice(start, end + 1);
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
        clientDeclarations + "\nreturn getYouTubeOperationContext_;")(fakeWindow, {
            getItem: key => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key)
        }, Date);
    return { getContext, storage };
}
const tabA = createTabContext();
const tabB = createTabContext();
const args = ["user-1", "corte", "vehicle-1", "Video técnico"];
const opA1 = tabA.getContext(...args);
const opA2 = tabA.getContext(...args);
const opB = tabB.getContext(...args);
assert.equal(opA1.opVideoId, opA2.opVideoId,
    "una misma pestaña conserva su opVideoId");
assert.notEqual(opA1.opVideoId, opB.opVideoId,
    "sessionStorage aislado por pestaña genera contextos independientes");

const serverFunction = extractFunction(feedback, "handleInitYouTubeUpload");
let createdSessions = 0;
const serverInit = new Function(
    "getSafeSheet", "SHEET_NAMES", "findPendingVideoApprovalForTarget_",
    "getVideoApprovalTarget_", "ScriptApp", "UrlFetchApp", "Logger",
    serverFunction + "\nreturn handleInitYouTubeUpload;"
)(
    () => ({}),
    { FEEDBACKS: "Feedbacks" },
    () => null,
    () => ({
        record: { rowIndex: 2 },
        sheet: { getRange: () => ({ getValue: () => "" }) },
        videoColumn: 10
    }),
    { getOAuthToken: () => "test-oauth-token" },
    {
        fetch: () => {
            createdSessions++;
            return {
                getResponseCode: () => 201,
                getAllHeaders: () => ({
                    Location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test-" + createdSessions
                })
            };
        }
    },
    { log: () => {} }
);
const payload = {
    title: "Vídeo técnico", description: "Prueba", contentType: "corte",
    referenceId: "vehicle-1", fileName: "test.mp4", fileSize: 1024,
    fileType: "video/mp4"
};
const firstTabInit = serverInit({ ...payload, opVideoId: opA1.opVideoId });
const sameOperationRetry = serverInit({ ...payload, opVideoId: opA1.opVideoId });
const secondTabInit = serverInit({ ...payload, opVideoId: opB.opVideoId });

assert.equal(firstTabInit.status, "success");
assert.equal(sameOperationRetry.status, "success");
assert.notEqual(firstTabInit.uploadUrl, sameOperationRetry.uploadUrl,
    "reintentar init con el mismo opVideoId crea otra sesión resumable");
assert.equal(secondTabInit.status, "success");
assert.equal(createdSessions, 3,
    "el backend no reserva el destino frente a inicios simultáneos sin aprobación pendiente");

console.log("YouTubeInitIdempotencyBoundary: PASS 7/7 caracterización — RISK CONFIRMED: init no deduplica por opVideoId ni destino; no se llamó a YouTube real.");
