import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("youtubeUpload.js", "utf8");

function extractFunction(name) {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `No se encontró ${name}`);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    assert.fail(`Función ${name} sin cerrar`);
}

const openDb = extractFunction("openYouTubeUploadDb_");
const findPending = extractFunction("findPendingYouTubeUploadRecord_");

function createIndexedDb(records) {
    const db = {
        objectStoreNames: { contains: () => true },
        close() {},
        transaction() {
            return {
                objectStore() {
                    return {
                        getAll() {
                            const request = { result: records };
                            queueMicrotask(() => request.onsuccess());
                            return request;
                        }
                    };
                }
            };
        }
    };
    return {
        open() {
            const request = { result: db };
            queueMicrotask(() => request.onsuccess());
            return request;
        }
    };
}

const lookup = new Function("window", "YOUTUBE_UPLOAD_DB_NAME", "YOUTUBE_UPLOAD_STORE_NAME",
    openDb + "\n" + findPending + "\nreturn findPendingYouTubeUploadRecord_;"
)( { indexedDB: createIndexedDb([
    { opVideoId: "draft-1", userId: "u1", contentType: "tutorial",
      referenceId: "null", status: "paused", bytesUploaded: 12 },
    { opVideoId: "vehicle-1", userId: "u1", contentType: "corte",
      referenceId: "vehicle-9", status: "interrupted", bytesUploaded: 20 }
]) }, "gpsepedia-youtube-upload", "operations");

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log("PASS", name);
}

await test("recupera un borrador con referenceId null", async () => {
    const record = await lookup("u1", "tutorial", null);
    assert.equal(record.opVideoId, "draft-1");
    assert.equal(record.bytesUploaded, 12);
});

await test("mantiene la búsqueda de contenido con referencia", async () => {
    const record = await lookup("u1", "corte", "vehicle-9");
    assert.equal(record.opVideoId, "vehicle-1");
});

await test("la apertura del modal busca recuperación aunque referenceId sea null", async () => {
    const modalSource = source.slice(source.indexOf("export function openYouTubeUploadModal"));
    assert.match(modalSource, /const recoveryLookupPromise = initialUserId\s*\?\s*findPendingYouTubeUploadRecord_\(initialUserId, contentType, referenceId\)/);
    assert.doesNotMatch(modalSource, /const recoveryLookupPromise = initialUserId && referenceId/);
});

console.log("YouTubeUploadDraftRecovery:", passed + "/3 PASS");
