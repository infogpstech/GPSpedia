import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function publishFeedbackCatalogChange_(action, buildChange)");
const end = source.indexOf("\nfunction publishFeedbackCortesCatalogChange_", start);
assert.ok(start >= 0 && end > start, "No se encontró el publicador FEEDBACK");
const block = source.slice(start, end);
const calls = [];
let clock = 1700000000000;
let publishError = null;
const publish = (service, action, change) => {
    if (publishError) throw publishError;
    calls.push({ service, action, change });
    return { status: "success" };
};
const fakeDate = { now: () => clock++ };
const api = new Function("publishSharedCatalogChange_", "Date",
    block + "\nreturn publishFeedbackCatalogChange_;")(publish, fakeDate);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("construye snapshot y publica versión temporal sin lock ni PropertiesService", () => {
    api("recordLike", () => ({ collection: "cortes", recordId: "V-1", operation: "upsert", snapshot: { id: "V-1" } }));
    const first = calls.at(-1);
    assert.equal(first.service, "FEEDBACK");
    assert.equal(first.change.sourceVersion, 1700000000000);
    assert.doesNotMatch(block, /LockService|PropertiesService|tryLock|waitLock|acquireFeedbackScriptLock_/);
});
test("cada snapshot posterior usa una versión temporal posterior", () => {
    api("addProblem", () => ({ collection: "pys", recordId: "isue-1", operation: "upsert", snapshot: { id_problem: "isue-1" } }));
    assert.equal(calls.at(-1).change.sourceVersion, 1700000000001);
});
test("si el snapshot falla publica reset sin bloquear la operación principal", () => {
    const before = calls.length;
    api("updatePysItem", () => { throw new Error("sheet unavailable"); });
    assert.equal(calls.length, before + 1);
    assert.deepEqual(calls.at(-1).change, { operation: "reset" });
});
test("un reset explícito no inventa sourceVersion", () => {
    api("updateTutorialItem", () => ({ operation: "reset" }));
    assert.deepEqual(calls.at(-1).change, { operation: "reset" });
});
test("si Coordinator falla propaga el error sin lock retenido", () => {
    publishError = new Error("Coordinator unavailable");
    assert.throws(() => api("recordLike", () => ({ collection: "cortes", recordId: "V-2", operation: "upsert", snapshot: { id: "V-2" } })), /Coordinator unavailable/);
    publishError = null;
});
console.log("FeedbackCatalogPublicationIsolation: " + passed + "/" + passed + " PASS");
