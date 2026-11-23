import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const runner = readFileSync(new URL("RunServiceTests.mjs", import.meta.url), "utf8");

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("las acciones del feed se enrutan a CATALOG", () => {
    assert.match(api, /'publishCatalogReset': 'CATALOG'/);
    assert.match(api, /'publishCatalogChange': 'CATALOG'/);
    assert.match(api, /'getCatalogChanges': 'CATALOG'/);
});

test("la lectura del feed usa endpoint CATALOG y no COORDINATOR", () => {
    const start = api.indexOf("async function getCatalogChanges");
    assert.ok(start >= 0, "Debe existir getCatalogChanges.");
    const end = api.indexOf("\n}", start);
    const block = api.slice(start, end >= 0 ? end + 2 : api.length);
    assert.match(block, /getConfiguredServiceEndpoint_\("CATALOG"\)/);
    assert.match(block, /service:\s*"CATALOG"/);
    assert.doesNotMatch(block, /COORDINATOR/);
});

test("la publicación de reset y delta se coordina desde el frontend", () => {
    assert.match(api, /routeActionInternal_\("publishCatalogReset"/);
    assert.match(api, /routeActionInternal_\("publishCatalogChange"/);
    assert.match(api, /service === "FEEDBACK"[\s\S]{0,220}result\.catalogChange/);
});

test("CATALOG atiende el feed GET con cursor y límite", () => {
    assert.match(catalog, /String\(parameters\.catalogFeed \|\| ""\) === "1"/);
    assert.match(catalog, /createCatalogChangeFeed_\(\)\.getChanges\(parameters\)/);
    assert.match(catalog, /CATALOG_FEED_MAX_EVENTS_ = 100/);
});

test("CATALOG recibe reset y delta por POST con sesión local", () => {
    assert.match(catalog, /case 'publishCatalogReset':[\s\S]{0,100}handlePublishCatalogReset_\(payload\)/);
    assert.match(catalog, /case 'publishCatalogChange':[\s\S]{0,100}handlePublishCatalogChange_\(payload\)/);
    assert.match(catalog, /const actor = getCatalogSessionActor_\(userId, sessionToken\)/);
});

test("los deltas se reconstruyen desde Spreadsheet y PyS canónico", () => {
    assert.match(catalog, /function resolveCanonicalCatalogChange_\(change\)/);
    assert.match(catalog, /handleGetCatalogData\(\{ forceRefresh: true \}\)/);
    assert.match(catalog, /function buildCatalogPysSnapshot_\(recordId\)/);
    assert.match(catalog, /El navegador no puede proporcionar snapshots/);
});

test("CATALOG aplica RBAC a la publicación de deltas", () => {
    assert.match(catalog, /function publishCatalogChangeForActor_\(/);
    assert.match(catalog, /Solo Desarrollador puede publicar esta actualización del catálogo/);
    assert.match(catalog, /CATALOG_FEED_ALLOWED_COLLECTIONS_/);
});

test("el evento de catálogo no persiste secretos ni tokens de sesión", () => {
    const start = catalog.indexOf("function createCatalogChangeFeed_");
    const end = catalog.indexOf("function publishCatalogResetForActor_", start);
    const block = catalog.slice(start, end);
    assert.doesNotMatch(block, /sessionToken|password|secret|COORDINATOR|UrlFetchApp/i);
    assert.match(block, /sourceRequestId/);
});

test("FEEDBACK devuelve referencias y no llama a SharedMutationClient", () => {
    assert.match(feedback, /function attachFeedbackCatalogChange_\(/);
    assert.match(feedback, /response = attachFeedbackCatalogChange_\(action, payload, response\)/);
    assert.doesNotMatch(feedback, /publishSharedCatalogChange_/);
    assert.doesNotMatch(feedback, /publishFeedbackCatalogChange_/);
});

test("el runner sustituye la prueba Coordinator por la prueba CATALOG", () => {
    assert.match(runner, /CatalogBrowserReset\.mjs/);
    assert.doesNotMatch(runner, /CoordinatorBrowserCatalogReset\.mjs/);
});

await (async function testCatalogPublicationRequestIds() {
    const nonceStart = api.indexOf("function createCatalogPublicationNonce_()");
    const nonceEnd = api.indexOf("\\n}\\n", nonceStart) + 2;
    const deltaStart = api.indexOf("async function publishCatalogChangeAfterMutation_");
    const deltaEnd = api.indexOf("\\n}\\n", deltaStart) + 2;
    assert.ok(nonceStart >= 0 && nonceEnd > nonceStart);
    assert.ok(deltaStart >= 0 && deltaEnd > deltaStart);
    const nonceSource = api.slice(nonceStart, nonceEnd);
    const deltaSource = api.slice(deltaStart, deltaEnd);
    let nonce = 0;
    const requests = [];
    const route = async (action, payload) => {
        requests.push({ action, payload });
        return { status: "success" };
    };
    const publish = new Function("routeActionInternal_", "crypto",
        nonceSource + "\\n" + deltaSource + "\\nreturn publishCatalogChangeAfterMutation_;")(
        route, { randomUUID: () => "unique-" + (++nonce) }
    );
    const mutation = {
        userId: "USER-1",
        sessionToken: "session-token-not-persisted",
        problemId: "isue-42"
    };
    const result = {
        status: "success",
        catalogChange: { collection: "pys", recordId: "isue-42", operation: "upsert" }
    };
    const first = await publish("FEEDBACK", "addSolution", mutation, result);
    const second = await publish("FEEDBACK", "addSolution", mutation, result);
    assert.equal(first, result);
    assert.equal(second, result);
    assert.notEqual(requests[0].payload.requestId, requests[1].payload.requestId);
    assert.equal(requests[0].payload.change.snapshot, undefined);
    assert.equal(requests[0].payload.sessionToken, "session-token-not-persisted");

    const retryRequests = [];
    const retryPublish = new Function("routeActionInternal_", "crypto",
        nonceSource + "\\n" + deltaSource + "\\nreturn publishCatalogChangeAfterMutation_;")(
        async (action, payload) => { retryRequests.push(payload); return { status: "success" }; },
        { randomUUID: () => "retry-" + (++nonce) }
    );
    const stablePayload = { ...mutation, opId: "operation-stable-0001" };
    await retryPublish("FEEDBACK", "addSolution", stablePayload, result);
    await retryPublish("FEEDBACK", "addSolution", stablePayload, result);
    assert.equal(retryRequests[0].requestId, retryRequests[1].requestId);
    passed++;
    console.log("PASS IDs de publicación únicos por mutación y estables al reintentar");
})();
console.log("CatalogBrowserReset: " + passed + "/11 PASS");
assert.equal(passed, 11);
