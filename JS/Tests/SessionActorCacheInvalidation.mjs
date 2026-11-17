import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("JS/Services/SharedMutationClient.js", "utf8");
const authSource = fs.readFileSync("JS/Services/Auth.js", "utf8");
const writeSource = fs.readFileSync("JS/Services/write.js", "utf8");
const feedbackSource = fs.readFileSync("JS/Services/feedback.js", "utf8");
const apiConfigSource = fs.readFileSync("JS/Frontend/api-config.js", "utf8");
const removed = [];
const digest = () => [1, 2, 3, 4];
const api = new Function("Utilities", "PropertiesService", "CacheService",
    source + "\nreturn { createSharedMutationClient_, getSharedSessionActorCacheKey_, handleSharedSessionActorCacheInvalidation_ };"
)({
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: digest
}, { getScriptProperties: () => ({ getProperty: () => "x".repeat(40) }) },
{ getScriptCache: () => ({ remove: key => removed.push(key) }) });

const secret = "session-cache-invalidation-secret-40";
let digestInput = "";
const originalDigest = digest;
const keyApi = new Function("Utilities", source + "\nreturn getSharedSessionActorCacheKey_;")({
    DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" },
    computeDigest: (algorithm, input) => { digestInput = input; return originalDigest(); }
});
const key = keyApi("U-1", "token-A");
assert.match(key, /^GPSpedia_SHARED_SESSION_ACTOR_V1_/);
assert.equal(digestInput, "U-1\\n" + "token-A", "La clave conserva el separador histórico para invalidar entradas ya creadas.");

const denied = api.handleSharedSessionActorCacheInvalidation_(
    { secret: "wrong", userId: "U-1", sessionTokens: ["token-A"] },
    { secret, cache: { remove: value => removed.push(value) } }
);
assert.equal(denied.status, "error");
assert.equal(removed.length, 0);

const accepted = api.handleSharedSessionActorCacheInvalidation_(
    { secret, userId: "U-1", sessionTokens: ["token-A", "token-A", "token-B"] },
    { secret, cache: { remove: value => removed.push(value) } }
);
assert.deepEqual(accepted, { status: "success", invalidated: 2 });
assert.equal(removed.length, 2, "La invalidación elimina claves exactas y deduplica tokens.");

function createClient(events, failService = "") {
    const properties = {
        getProperty(name) {
            return ({
                GPSpedia_SESSION_CACHE_INVALIDATION_SECRET: secret,
                GPSpedia_WRITE_URL: "https://script.google.com/macros/s/WRITE/exec",
                GPSpedia_FEEDBACK_URL: "https://script.google.com/macros/s/FEEDBACK/exec",
                GPSpedia_COORDINATOR_URL: "https://script.google.com/macros/s/COORDINATOR/exec",
                GPSpedia_COORDINATOR_SECRET: "coordinator-secret-40-characters-long"
            })[name] || "";
        }
    };
    return api.createSharedMutationClient_({
        properties,
        uuid: () => "request-id",
        logger: () => {},
        fetch(url, options) {
            const service = url.includes("/WRITE/") ? "WRITE" :
                url.includes("/FEEDBACK/") ? "FEEDBACK" : "COORDINATOR";
            const request = JSON.parse(options.payload);
            events.push({ service, action: request.action, payload: request.payload });
            if (service === failService) {
                return { getResponseCode: () => 503, getContentText: () => "{}" };
            }
            const result = service === "COORDINATOR"
                ? { status: "success", revoked: true }
                : { status: "success", invalidated: request.payload.sessionTokens.length };
            return { getResponseCode: () => 200, getContentText: () => JSON.stringify(result) };
        }
    });
}

const singleEvents = [];
const single = createClient(singleEvents);
single.revokeSession("U-1", "token-A");
assert.deepEqual(singleEvents.map(event => event.service), ["WRITE", "FEEDBACK", "COORDINATOR"]);
assert.deepEqual(singleEvents.slice(0, 2).map(event => event.payload.sessionTokens), [["token-A"], ["token-A"]]);
assert.equal(singleEvents[2].action, "revokeSession");

const multipleEvents = [];
createClient(multipleEvents).revokeUserSessions("U-2", ["token-B", "token-C"]);
assert.deepEqual(multipleEvents.map(event => event.service), ["WRITE", "FEEDBACK", "COORDINATOR"]);
assert.deepEqual(multipleEvents[0].payload.sessionTokens, ["token-B", "token-C"]);
assert.equal(multipleEvents[2].action, "revokeUserSessions");

const partialEvents = [];
assert.throws(() => createClient(partialEvents, "FEEDBACK").revokeSession("U-1", "token-A"),
    /No se pudo confirmar la invalidación de caché en FEEDBACK/);
assert.deepEqual(partialEvents.map(event => event.service), ["WRITE", "FEEDBACK"],
    "Si falla un servicio, AUTH no solicita todavía la revocación central.");
assert.throws(() => single.invalidateSessionActorCaches("U-1", ["a", "b", "c", "d", "e", "f"]),
    /hasta cinco tokens/);

// Cobertura del cableado real de los tres servicios y de los flujos de revocación AUTH.
assert.match(writeSource, /action === "__invalidateSessionActorCache"[\\s\\S]*?handleSharedSessionActorCacheInvalidation_/);
assert.match(feedbackSource, /action === "__invalidateSessionActorCache"[\\s\\S]*?handleSharedSessionActorCacheInvalidation_/);
assert.match(authSource, /function handleLogout[\\s\\S]*?revokeSharedSessionContext_\\(requestedUserId, sessionToken\\)/);
assert.match(authSource, /revokeSharedUserSessionContexts_\\(userId, getActiveSessionTokensForUserUnderLock_\\(sessionsSheet, userId\\)\\)/);
assert.match(authSource, /revokeSharedUserSessionContexts_\\(targetUserId, getActiveSessionTokensForUserUnderLock_\\(sessionsSheet, targetUserId\\)\\)/);
assert.doesNotMatch(apiConfigSource, /__invalidateSessionActorCache/);

console.log("SessionActorCacheInvalidation: PASS — claves compatibles, autenticación interna, aislamiento por token, flujos AUTH y fallo parcial");
