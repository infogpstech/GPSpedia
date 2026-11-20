import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("const FEEDBACK_CATALOG_SOURCE_VERSION_PROPERTY_");
const end = source.indexOf("\nfunction publishFeedbackCortesCatalogChange_", start);
assert.ok(start >= 0 && end > start, "No se encontró el publicador versionado FEEDBACK");
const block = source.slice(start, end);

const store = new Map();
const calls = { tryLock: [], releases: 0, publications: [] };
let lockHeld = false;
let lockAvailable = true;
let publishError = null;
const lock = {
    tryLock(timeout) {
        calls.tryLock.push(timeout);
        if (!lockAvailable) return false;
        lockHeld = true;
        return true;
    },
    releaseLock() {
        calls.releases++;
        lockHeld = false;
    }
};
const properties = {
    getProperty: key => store.has(key) ? store.get(key) : null,
    setProperty: (key, value) => store.set(key, String(value))
};
const publish = (service, action, change) => {
    assert.equal(lockHeld, false, "UrlFetch/Coordinator debe ejecutarse después de liberar ScriptLock");
    if (publishError) throw publishError;
    calls.publications.push({ service, action, change });
    return { status: "success" };
};
const api = new Function("LockService", "PropertiesService", "acquireFeedbackScriptLock_", "publishSharedCatalogChange_",
    block + "\nreturn { publishFeedbackCatalogChange_, nextFeedbackCatalogSourceVersionLocked_ };")(
    { getScriptLock: () => lock },
    { getScriptProperties: () => properties },
    candidate => { if (!candidate.tryLock(0)) throw new Error("FEEDBACK_BUSY"); },
    publish
);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("construye snapshot bajo lock y publica fuera con versión monotónica", () => {
    api.publishFeedbackCatalogChange_("recordLike", () => {
        assert.equal(lockHeld, true, "La lectura del snapshot debe protegerse");
        return { collection: "cortes", recordId: "V-1", operation: "upsert", snapshot: { id: "V-1" } };
    });
    assert.equal(calls.publications.at(-1).change.sourceVersion, 1);
    assert.equal(calls.publications.at(-1).service, "FEEDBACK");
    assert.equal(lockHeld, false);
});

test("cada snapshot confirmado incrementa la versión dentro de la sección crítica", () => {
    api.publishFeedbackCatalogChange_("addProblem", () => ({
        collection: "pys", recordId: "isue-1", operation: "upsert", snapshot: { id_problem: "isue-1" }
    }));
    assert.equal(calls.publications.at(-1).change.sourceVersion, 2);
});

test("si no adquiere el lock publica reset fuera del lock sin inventar una versión", () => {
    lockAvailable = false;
    const before = calls.publications.length;
    api.publishFeedbackCatalogChange_("updateTutorialItem", () => {
        throw new Error("No debe ejecutar el builder sin lock");
    });
    lockAvailable = true;
    assert.equal(calls.publications.length, before + 1);
    assert.deepEqual(calls.publications.at(-1).change, { operation: "reset" });
    assert.equal(lockHeld, false);
    assert.equal(store.get("GPSpedia_FEEDBACK_CATALOG_SOURCE_VERSION_V1"), "2");
});

test("si falla el snapshot publica reset después de liberar el lock", () => {
    const before = calls.publications.length;
    api.publishFeedbackCatalogChange_("updatePysItem", () => { throw new Error("sheet unavailable"); });
    assert.equal(calls.publications.length, before + 1);
    assert.deepEqual(calls.publications.at(-1).change, { operation: "reset" });
    assert.equal(lockHeld, false);
    assert.equal(calls.releases, 3);
});

test("si Coordinator falla, propaga el error después de liberar el lock", () => {
    publishError = new Error("Coordinator unavailable");
    assert.throws(() => api.publishFeedbackCatalogChange_("recordLike", () => ({
        collection: "cortes", recordId: "V-2", operation: "upsert", snapshot: { id: "V-2" }
    })), /Coordinator unavailable/);
    publishError = null;
    assert.equal(lockHeld, false);
    assert.equal(calls.releases, 4);
});

console.log("FeedbackCatalogPublicationIsolation: " + passed + "/" + passed + " PASS");
