import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { invalidateSessionActorCaches, SESSION_CACHE_SERVICES, SESSION_ACTOR_CACHE_TTL_SECONDS } from "../Frontend/sessionCacheInvalidation.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const api = read("JS/Frontend/api-config.js");
const auth = read("JS/Frontend/auth.js");
const ui = read("JS/Frontend/ui.js");
const css = read("style.css");
const index = read("index.html");

assert.match(api, /confirmedRevocation/);
assert.match(api, /window\.dispatchEvent\(new CustomEvent\("gpsepedia:session-invalid"/);
assert.match(api, /code: "SESSION_INVALID"/);
assert.match(auth, /window\.addEventListener\('gpsepedia:session-invalid'/);
assert.match(auth, /String\(currentSession\.SessionToken \|\| ''\) !== rejectedToken/);

const start = auth.indexOf("function endSessionForReauthentication_");
const end = auth.indexOf("\nif (typeof window", start);
assert.ok(start >= 0 && end > start);
const helperAndHandler = auth.slice(start, end);
const stored = { ID: "U1", SessionToken: "old-token", Privilegios: "Desarrollador" };
let session = stored;
const state = { currentUser: stored };
const calls = { stopped: 0, cancelled: 0, removed: 0, notices: [] };
const storage = { removeItem(key) { assert.equal(key, "gpsepedia_session"); session = null; calls.removed++; } };
const same = (a, b) => Boolean(a && b && a.ID === b.ID && a.SessionToken === b.SessionToken);
const factory = new Function(
    "SESSION_KEY", "localStorage", "readStoredSession", "getState", "sameSession",
    "stopCatalogPolling_", "cancelCatalogLoad_", "setState", "showLoginScreen",
    "logoutGeneration_", helperAndHandler + "\nreturn handleConfirmedSessionInvalidation_;"
);
const handle = factory(
    "gpsepedia_session", storage, () => session, () => state, same,
    () => calls.stopped++, () => calls.cancelled++,
    next => Object.assign(state, next),
    message => calls.notices.push(message), 0
);
assert.equal(handle({ detail: { sessionToken: "other-token" } }), false);
assert.equal(session.SessionToken, "old-token");
assert.equal(handle({ detail: { sessionToken: "old-token" } }), true);
assert.equal(session, null);
assert.equal(state.currentUser, null);
assert.equal(calls.removed, 1);
assert.equal(calls.stopped, 1);
assert.equal(calls.cancelled, 1);
assert.deepEqual(calls.notices, ["Sesión terminada"]);
assert.equal(handle({ detail: { sessionToken: "old-token" } }), false);

assert.match(ui, /loginError\.classList\.toggle\('login-session-ended', sessionEnded\)/);
assert.match(ui, /loginError\.setAttribute\('aria-live', sessionEnded \? 'polite' : 'assertive'\)/);
assert.match(index, /id="login-error" role="alert"/);
assert.match(css, /#login-modal #login-error\.login-session-ended[\s\S]*?background: #fff7d6/);
assert.match(css, /body\.dark-mode #login-modal #login-error\.login-session-ended/);
assert.match(ui, /deactivateLegalModalFocus_\(termsModal, false\)/);
assert.match(ui, /termsModal\.style\.display = 'none'/);
console.log("SessionInvalidationFlow: 15/15 PASS");

const sharedKeys = ["GPSpedia_SHARED_SESSION_ACTOR_V1_" + "a".repeat(64)];
const catalogKeys = ["GPSpedia_CATALOG_SESSION_ACTOR_V1_" + "b".repeat(64)];
const calls = [];
const attempts = new Map();
const fanout = await invalidateSessionActorCaches({
    sessionCacheKeys: { userId: "U-1", shared: sharedKeys, catalog: catalogKeys },
    routeAction: async (action, payload, service) => {
        calls.push({ action, payload, service });
        const attemptKey = service + ":" + payload.cacheKeys[0];
        const attempt = (attempts.get(attemptKey) || 0) + 1;
        attempts.set(attemptKey, attempt);
        if (service === "ADMIN" && attempt === 1) throw new Error("fallo transitorio");
        return { status: "success", invalidated: payload.cacheKeys.length };
    },
    routeActionWithRetry: async (action, payload, options) => {
        let lastError;
        for (let i = 0; i < options.maxAttempts; i++) {
            try { return await options.routeAction(action, payload); }
            catch (error) { lastError = error; }
        }
        throw lastError;
    }
});
assert.equal(fanout.status, "success");
assert.deepEqual(fanout.invalidatedServices, SESSION_CACHE_SERVICES);
assert.equal(attempts.get("ADMIN:" + sharedKeys[0]), 2);
assert.equal(calls.length, SESSION_CACHE_SERVICES.length + 1);
assert.ok(calls.every(call => call.action === "__invalidateSessionActorCache"));
assert.ok(calls.find(call => call.service === "CATALOG").payload.cacheKeys[0].startsWith("GPSpedia_CATALOG_SESSION_ACTOR_V1_"));
assert.ok(calls.filter(call => call.service !== "CATALOG").every(call => call.payload.cacheKeys[0].startsWith("GPSpedia_SHARED_SESSION_ACTOR_V1_")));
assert.equal(SESSION_ACTOR_CACHE_TTL_SECONDS, 21600);

const partialFanout = await invalidateSessionActorCaches({
    sessionCacheKeys: { userId: "U-2", shared: sharedKeys, catalog: catalogKeys },
    routeAction: async (action, payload, service) => {
        if (service === "FEEDBACK") throw new Error("servicio no disponible");
        return { status: "success", invalidated: payload.cacheKeys.length };
    },
    routeActionWithRetry: async (action, payload, options) => options.routeAction(action, payload)
});
assert.equal(partialFanout.status, "partial");
assert.deepEqual(partialFanout.failedServices, ["FEEDBACK"]);
assert.equal(partialFanout.maxCacheTtlSeconds, 21600);
assert.doesNotMatch(JSON.stringify(calls), /opaque-session-token/);
console.log("MIG-014 frontend fan-out: 6 servicios, retry, fallo parcial y TTL 21600s PASS");

const sharedSource = read("JS/Services/SharedMutationClient.js");
const sharedRemoved = [];
const sharedHandler = new Function("CacheService", sharedSource + "\nreturn handleSharedSessionActorCacheInvalidation_;")({
    getScriptCache: () => ({ remove: key => sharedRemoved.push(key) })
});
const sharedKey = "GPSpedia_SHARED_SESSION_ACTOR_V1_" + "d".repeat(64);
assert.deepEqual(sharedHandler({ userId: "U-3", cacheKeys: [sharedKey] }), { status: "success", invalidated: 1 });
assert.deepEqual(sharedRemoved, [sharedKey]);
assert.equal(sharedHandler({ userId: "U-3", cacheKeys: ["GPSpedia_CATALOG_SESSION_ACTOR_V1_" + "d".repeat(64)] }).status, "error");

const catalogSource = read("JS/Services/catalog.js");
const catalogRemoved = [];
const catalogHandler = new Function("CacheService", catalogSource + "\nreturn invalidateCatalogSessionActorCache_;")({
    getScriptCache: () => ({ remove: key => catalogRemoved.push(key) })
});
const catalogKey = "GPSpedia_CATALOG_SESSION_ACTOR_V1_" + "e".repeat(64);
assert.deepEqual(catalogHandler({ userId: "U-3", cacheKeys: [catalogKey] }), { status: "success", invalidated: 1 });
assert.deepEqual(catalogRemoved, [catalogKey]);
assert.equal(catalogHandler({ userId: "U-3", cacheKeys: [sharedKey] }).status, "error");

const authServiceSource = read("JS/Services/Auth.js");
const captureStart = authServiceSource.indexOf("function recordSessionCacheKeysForResponse_");
const captureEnd = authServiceSource.indexOf("\nfunction doPostInternal_", captureStart);
assert.ok(captureStart >= 0 && captureEnd > captureStart);
const captureFunction = authServiceSource.slice(captureStart, captureEnd);
const captureResult = new Function("getSharedSessionActorCacheKey_", "let sessionCacheKeysForResponse_ = { userId: '', shared: new Set(), catalog: new Set(), error: false }; " +
    captureFunction + "; recordSessionCacheKeysForResponse_('U-4', ['opaque-session-token-01']); return sessionCacheKeysForResponse_;")(
    () => sharedKey
);
assert.deepEqual(Array.from(captureResult.shared), [sharedKey]);
assert.deepEqual(Array.from(captureResult.catalog), ["GPSpedia_CATALOG_SESSION_ACTOR_V1_" + "d".repeat(64)]);
assert.doesNotMatch(JSON.stringify({ shared: Array.from(captureResult.shared), catalog: Array.from(captureResult.catalog) }), /opaque-session-token-01/);
assert.match(authServiceSource, /response\.sessionCacheKeys =/);
assert.match(sharedSource, /recordSessionCacheKeysForResponse_\(id, tokens\)/);
console.log("MIG-014 cache fan-out and backend contracts: 10/10 PASS");
