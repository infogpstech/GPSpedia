import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("JS/Services/Coordinator.js", "utf8");
const boundary = source.indexOf("\nfunction doGet(e)");
assert.ok(boundary > 0, "No se encontró el límite del dispatcher Coordinator.");
const factorySource = source.slice(0, boundary);
const now = Date.UTC(2026, 10, 23, 18, 0, 0);
function makeProperties(role = "desarrollador") {
    const values = new Map(), userId = "developer-1", token = "session-token-for-coordinator-test";
    values.set("GPSpedia_AUTH_CONTEXT_V1_" + encodeURIComponent(userId), JSON.stringify({
        schemaVersion: 1, userId, epoch: 1, revokedBefore: 0,
        sessions: [{ token, role, fullName: "Test User", createdAt: now - 86400000, lastActivityAt: now - 60000 }]
    }));
    return {
        values, userId, token,
        getProperty: key => values.has(key) ? values.get(key) : null,
        setProperty: (key, value) => values.set(key, String(value)),
        deleteProperty: key => values.delete(key),
        getProperties: () => Object.fromEntries(values.entries())
    };
}
function createCoordinator(properties) {
    const factory = new Function("properties", "lockService", "now", "uuid", "sleep", "fetch", "fetchAll",
        factorySource + "\nreturn createSharedMutationCoordinator_({properties,lockService,now,uuid,sleep,fetch,fetchAll});");
    return factory(properties,
        { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
        () => now, () => "test-uuid-00000001", () => {}, () => ({}), () => []);
}
let passed = 0;
function test(name, fn) { fn(); passed++; }
function expectThrow(fn, expected) {
    let error = null; try { fn(); } catch (caught) { error = caught; }
    assert.ok(error, "Se esperaba rechazo.");
    if (expected) assert.match(String(error.message || error), expected);
}
const properties = makeProperties(), coordinator = createCoordinator(properties);
test("publica reset con sesión válida y sin secreto compartido", () => {
    const result = coordinator.publishVideoCatalogResetFromBrowser({
        userId: properties.userId, sessionToken: properties.token,
        operation: "approveVideo", requestId: "video-vid-123-approved"
    });
    assert.equal(result.status, "success");
    assert.equal(result.revision, 1);
    assert.equal(properties.getProperty("GPSpedia_COORDINATOR_SECRET_FEEDBACK"), null);
});
test("el reset publicado aparece en el feed público", () => {
    const feed = coordinator.getPublicCatalogChanges({ cursor: 0, limit: 10 });
    assert.equal(feed.status, "success");
    assert.equal(feed.changes.length, 1);
    assert.equal(feed.changes[0].operation, "reset");
    assert.equal(feed.changes[0].sourceService, "FEEDBACK");
});
test("el reintento con el mismo requestId es idempotente", () => {
    const result = coordinator.publishVideoCatalogResetFromBrowser({
        userId: properties.userId, sessionToken: properties.token,
        operation: "approveVideo", requestId: "video-vid-123-approved"
    });
    assert.equal(result.status, "success");
    assert.equal(result.duplicate, true);
    assert.equal(coordinator.getPublicCatalogChanges({ cursor: 0, limit: 10 }).currentRevision, 1);
});
test("rechaza sesiones de rol no autorizado", () => {
    const junior = makeProperties("tecnico");
    expectThrow(() => createCoordinator(junior).publishVideoCatalogResetFromBrowser({
        userId: junior.userId, sessionToken: junior.token,
        operation: "approveVideo", requestId: "video-vid-456-approved"
    }), /solo Desarrollador/);
});
test("rechaza ausencia de sesión y operaciones fuera de aprobación/rechazo", () => {
    expectThrow(() => coordinator.publishVideoCatalogResetFromBrowser({
        userId: properties.userId, operation: "approveVideo", requestId: "video-vid-789-approved"
    }), /sesión autenticada/);
    expectThrow(() => coordinator.publishVideoCatalogResetFromBrowser({
        userId: properties.userId, sessionToken: properties.token,
        operation: "addProblem", requestId: "video-vid-789-approved"
    }), /no está autorizada/);
});
test("el dispatcher HTTP expone la acción de navegador", () => {
    assert.match(source, /request\.action === "publishVideoCatalogReset"/);
    assert.match(source, /coordinator\.publishVideoCatalogResetFromBrowser\(request\.payload\)/);
});
console.log("CoordinatorBrowserCatalogReset: " + passed + "/" + passed + " PASS");
