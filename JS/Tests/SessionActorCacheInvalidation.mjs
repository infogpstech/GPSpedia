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
    { properties: { getProperty: name => name === "GPSpedia_COORDINATOR_SECRET" ? secret : "" },
        cache: { remove: value => removed.push(value) } }
);
assert.deepEqual(accepted, { status: "success", invalidated: 2 });
assert.equal(removed.length, 2, "La invalidación elimina claves exactas y deduplica tokens.");

function createClient(events, failAction = "") {
    const properties = {
        getProperty(name) {
            return ({
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
            assert.equal(url, "https://script.google.com/macros/s/COORDINATOR/exec",
                "AUTH debe comunicarse únicamente con Coordinator.");
            const request = JSON.parse(options.payload);
            const event = {
                service: "COORDINATOR",
                action: request.action,
                payload: request.payload,
                protocolVersion: request.protocolVersion
            };
            events.push(event);
            if (request.action === failAction) {
                return {
                    getResponseCode: () => 503,
                    getContentText: () => JSON.stringify({ status: "error", message: "fallo controlado de invalidación" })
                };
            }
            const result = request.action === "invalidateSessionActorCaches"
                ? { status: "success", invalidated: request.payload.sessionTokens.length, services: ["WRITE", "FEEDBACK"] }
                : { status: "success", revoked: true };
            return { getResponseCode: () => 200, getContentText: () => JSON.stringify(result) };
        }
    });
}

const singleEvents = [];
const single = createClient(singleEvents);
single.revokeSession("U-1", "token-A");
assert.deepEqual(singleEvents.map(event => event.action), ["invalidateSessionActorCaches", "revokeSession"]);
assert.ok(singleEvents.every(event => event.service === "COORDINATOR"));
assert.equal(singleEvents[0].protocolVersion, 1);
assert.equal(singleEvents[0].payload.service, "AUTH");
assert.equal(singleEvents[0].payload.operation, "invalidateSessionActorCaches");
assert.deepEqual(singleEvents[0].payload.sessionTokens, ["token-A"]);
assert.equal(singleEvents[1].payload.service, "AUTH");

const multipleEvents = [];
createClient(multipleEvents).revokeUserSessions("U-2", ["token-B", "token-C"]);
assert.deepEqual(multipleEvents.map(event => event.action), ["invalidateSessionActorCaches", "revokeUserSessions"]);
assert.deepEqual(multipleEvents[0].payload.sessionTokens, ["token-B", "token-C"]);

const partialEvents = [];
assert.throws(() => createClient(partialEvents, "invalidateSessionActorCaches").revokeSession("U-1", "token-A"),
    /fallo controlado de invalidación/);
assert.deepEqual(partialEvents.map(event => event.action), ["invalidateSessionActorCaches"],
    "Si Coordinator no confirma la invalidación, AUTH no solicita la revocación central.");

const unlimitedEvents = [];
const unlimitedTokens = Array.from({ length: 13 }, (_, index) => "developer-token-" + index);
createClient(unlimitedEvents).revokeUserSessions("DEV-1", unlimitedTokens);
assert.deepEqual(unlimitedEvents.map(event => event.action), ["invalidateSessionActorCaches", "revokeUserSessions"]);
assert.equal(unlimitedEvents[0].payload.sessionTokens.length, 13,
    "El cliente envía a Coordinator lotes de hasta 25; no divide anticipadamente en lotes de cinco.");

const batchEvents = [];
const batchTokens = Array.from({ length: 26 }, (_, index) => "developer-batch-token-" + index);
createClient(batchEvents).revokeUserSessions("DEV-2", batchTokens);
assert.deepEqual(batchEvents.map(event => event.action),
    ["invalidateSessionActorCaches", "invalidateSessionActorCaches", "revokeUserSessions"]);
assert.deepEqual(batchEvents.slice(0, 2).map(event => event.payload.sessionTokens.length), [25, 1]);

assert.equal(authSource.includes("tokens.length > 5"), false,
    "AUTH debe enumerar todas las sesiones activas, incluso las cuentas Developer ilimitadas.");
assert.match(authSource, /'desarrollador': Infinity/);
assert.match(writeSource, /action === "__invalidateSessionActorCache"[\s\S]*?handleSharedSessionActorCacheInvalidation_/);
assert.match(feedbackSource, /action === "__invalidateSessionActorCache"[\s\S]*?handleSharedSessionActorCacheInvalidation_/);
assert.match(authSource, /function handleLogout[\s\S]*?revokeSharedSessionContext_/);
assert.equal(authSource.includes("revokeSharedUserSessionContexts_(userId, getActiveSessionTokensForUserUnderLock_(sessionsSheet, userId))"), true);
assert.equal(authSource.includes("revokeSharedUserSessionContexts_(targetUserId, getActiveSessionTokensForUserUnderLock_(sessionsSheet, targetUserId))"), true);
assert.equal(authSource.includes("revokeSharedUserSessionContexts_(targetId, getActiveSessionTokensForUserUnderLock_(sessionsSheet, targetId))"), true);
assert.match(authSource, /function getActiveSessionTokensForUserUnderLock_/);
assert.doesNotMatch(apiConfigSource, /__invalidateSessionActorCache/);
assert.match(source, /GPSpedia_COORDINATOR_SECRET/);
assert.doesNotMatch(source, /GPSpedia_SESSION_CACHE_INVALIDATION_SECRET/);
assert.doesNotMatch(source, /GPSpedia_WRITE_URL|GPSpedia_FEEDBACK_URL|GPSpedia_COORDINATOR_SECRET_WRITE|GPSpedia_COORDINATOR_SECRET_FEEDBACK/);
console.log("SessionActorCacheInvalidation: 1/1 PASS — claves compatibles, autenticación interna, aislamiento por token, flujos AUTH y fallo parcial");
