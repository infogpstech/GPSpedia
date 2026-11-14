import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("JS/Frontend/youtubeUpload.js", "utf8");

function extractFunction(name) {
    const marker = "function " + name + "(";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "No se encontró " + name);
    const declarationStart = source.slice(0, start).endsWith("async ") ? start - 6 : start;
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return source.slice(declarationStart, i + 1);
    }
    assert.fail("Función " + name + " sin cerrar");
}

const declarations = [
    "openYouTubeUploadDb_",
    "watchYouTubeUploadTransaction_",
    "saveYouTubeUploadRecord_",
    "getYouTubeUploadRecord_",
    "findPendingYouTubeUploadRecord_",
    "deleteYouTubeUploadRecord_"
].map(extractFunction).join("\n");

function createIndexedDb() {
    const records = new Map();
    let nextOutcome = null;
    let closeCount = 0;

    function schedule(tx, outcome, callback) {
        queueMicrotask(() => {
            if (outcome === "abort") return tx.onabort && tx.onabort();
            if (outcome === "error") return tx.onerror && tx.onerror();
            callback();
            if (outcome === "abort-after-request") return tx.onabort && tx.onabort();
            if (outcome === "error-after-request") return tx.onerror && tx.onerror();
            if (tx.oncomplete) tx.oncomplete();
        });
    }

    const database = {
        objectStoreNames: { contains: () => true },
        close() { closeCount++; },
        transaction() {
            const outcome = nextOutcome;
            nextOutcome = null;
            return {
                objectStore() {
                    return {
                        put(record) {
                            schedule(this.tx, outcome, () => records.set(String(record.opVideoId), { ...record }));
                        },
                        get(key) {
                            const request = {};
                            schedule(this.tx, outcome, () => {
                                request.result = records.get(String(key)) || null;
                                if (request.onsuccess) request.onsuccess();
                            });
                            return request;
                        },
                        getAll() {
                            const request = {};
                            schedule(this.tx, outcome, () => {
                                request.result = Array.from(records.values());
                                if (request.onsuccess) request.onsuccess();
                            });
                            return request;
                        },
                        delete(key) {
                            schedule(this.tx, outcome, () => records.delete(String(key)));
                        },
                        tx: this
                    };
                }
            };
        }
    };

    // Attach the transaction to each object store while preserving a fresh transaction per operation.
    const originalTransaction = database.transaction.bind(database);
    database.transaction = function() {
        const tx = originalTransaction();
        const originalObjectStore = tx.objectStore.bind(tx);
        tx.objectStore = function() {
            const store = originalObjectStore();
            store.tx = tx;
            return store;
        };
        return tx;
    };

    return {
        window: {
            indexedDB: {
                open() {
                    const request = { result: database };
                    queueMicrotask(() => request.onsuccess && request.onsuccess());
                    return request;
                }
            }
        },
        database,
        records,
        setOutcome(value) { nextOutcome = value; },
        get closeCount() { return closeCount; }
    };
}

const fake = createIndexedDb();
const api = new Function(
    "window", "YOUTUBE_UPLOAD_DB_NAME", "YOUTUBE_UPLOAD_STORE_NAME",
    declarations + "\nreturn { saveYouTubeUploadRecord_, getYouTubeUploadRecord_, findPendingYouTubeUploadRecord_, deleteYouTubeUploadRecord_ };"
)(fake.window, "gpsepedia-youtube-upload", "operations");

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log("PASS", name);
}

await test("persiste y recupera los cinco estados admitidos", async () => {
    for (const status of ["new", "uploading", "paused", "interrupted", "uploaded"]) {
        await api.saveYouTubeUploadRecord_({
            opVideoId: status, userId: "u1", contentType: status,
            referenceId: "null", status, bytesUploaded: 12
        });
    }
    for (const status of ["new", "uploading", "paused", "interrupted", "uploaded"]) {
        const record = await api.getYouTubeUploadRecord_(status);
        assert.equal(record.status, status);
        assert.equal(record.bytesUploaded, 12);
    }
    const recovered = await api.findPendingYouTubeUploadRecord_("u1", "paused", null);
    assert.equal(recovered.opVideoId, "paused");
});

await test("la búsqueda mantiene aislamiento por usuario, tipo y referencia", async () => {
    assert.equal(await api.findPendingYouTubeUploadRecord_("u2", "paused", null), null);
    assert.equal(await api.findPendingYouTubeUploadRecord_("u1", "paused", "otra-referencia"), null);
});

await test("rechaza duplicados para el mismo usuario, tipo y referencia", async () => {
    await api.saveYouTubeUploadRecord_({
        opVideoId: "duplicate", userId: "u1", contentType: "paused",
        referenceId: "null", status: "paused"
    });
    await assert.rejects(
        api.findPendingYouTubeUploadRecord_("u1", "paused", null),
        /varias subidas pendientes/
    );
});

await test("elimina el registro solo al completar la transacción", async () => {
    await api.deleteYouTubeUploadRecord_("duplicate");
    assert.equal(fake.records.has("duplicate"), false);
});

for (const [name, operation] of [
    ["save", () => api.saveYouTubeUploadRecord_({ opVideoId: "abort-save" })],
    ["get", () => api.getYouTubeUploadRecord_("new")],
    ["find", () => api.findPendingYouTubeUploadRecord_("u1", "new", null)],
    ["delete", () => api.deleteYouTubeUploadRecord_("new")]
]) {
    await test("rechaza abort de transacción en " + name, async () => {
        fake.setOutcome("abort");
        await assert.rejects(operation());
    });
}

for (const [name, operation] of [
    ["save", () => api.saveYouTubeUploadRecord_({ opVideoId: "error-save" })],
    ["get", () => api.getYouTubeUploadRecord_("new")],
    ["find", () => api.findPendingYouTubeUploadRecord_("u1", "new", null)],
    ["delete", () => api.deleteYouTubeUploadRecord_("new")]
]) {
    await test("rechaza error de transacción en " + name, async () => {
        fake.setOutcome("error");
        await assert.rejects(operation());
    });
}

for (const [name, operation] of [
    ["get", () => api.getYouTubeUploadRecord_("new")],
    ["find", () => api.findPendingYouTubeUploadRecord_("u1", "new", null)]
]) {
    await test("no acepta una lectura si la transacción aborta después de la solicitud: " + name, async () => {
        fake.setOutcome("abort-after-request");
        await assert.rejects(operation());
    });
}

console.log("YouTubeUploadRecordPersistence: " + passed + "/14 PASS");
