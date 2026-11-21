import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/SharedMutationClient.js", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../Services/Auth.js", import.meta.url), "utf8");
const primeStart = source.indexOf("function handleSharedSessionActorCachePriming_");
const primeEnd = source.indexOf("\n// El contexto de usuario/rol se sincroniza", primeStart);
const cacheStart = primeEnd;
const cacheEnd = source.indexOf("\nfunction syncSharedUserSessionContexts_", cacheStart);
assert.ok(primeStart >= 0 && primeEnd > primeStart && cacheEnd > cacheStart, "No se encontró el contrato de precarga/caché de actor.");
const block = source.slice(primeStart, cacheEnd);
assert.match(block, /SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600/);
assert.match(block, /Math\.min\(21600, Number\(deps\.ttlSeconds\)/);
assert.match(authSource, /cacheSharedSessionActor_\(normalizedId, currentSessionToken/);

const values = new Map(), puts = [];
const cache = {
    get: key => values.get(key) || null,
    put: (key, value, ttl) => { values.set(key, value); puts.push({ key, value, ttl }); },
    remove: key => values.delete(key)
};
const actor = { userId: "U-1", role: "tecnico", fullName: "Técnico", epoch: 4 };
const api = new Function("CacheService", "PropertiesService", block +
    "\nreturn { getCachedSharedSessionActor_, cacheSharedSessionActor_, handleSharedSessionActorCachePriming_ };")(
    { getScriptCache: () => cache }, { getScriptProperties: () => ({ getProperty: () => "S".repeat(40) }) }
);
let validations = 0;
const deps = { cache, keyFor: () => "session-key", validate: () => { validations++; throw new Error("Coordinator no debe consultarse"); } };

assert.throws(() => api.getCachedSharedSessionActor_("U-1", "token-1", deps), error =>
    error.code === "SESSION_ACTOR_CACHE_MISS");
assert.equal(validations, 0, "Un cache miss no debe disparar revalidación remota.");

assert.equal(api.cacheSharedSessionActor_("U-1", "token-1", actor, { cache, keyFor: () => "session-key" }), true);
assert.deepEqual(JSON.parse(values.get("session-key")), actor);
assert.deepEqual(api.getCachedSharedSessionActor_("U-1", "token-1", deps), actor);
assert.equal(validations, 0);
assert.equal(puts.at(-1).ttl, 21600, "Un hit renueva TTL local sin llamar a Coordinator.");

values.set("session-key", JSON.stringify({ userId: "U-2", role: "tecnico", epoch: 4 }));
assert.throws(() => api.getCachedSharedSessionActor_("U-1", "token-1", deps), error =>
    error.code === "SESSION_ACTOR_CACHE_MISS");
assert.equal(validations, 0, "Un actor de otra identidad se descarta sin revalidación remota.");
assert.equal(values.has("session-key"), false);

const capped = api.cacheSharedSessionActor_("U-1", "token-2", actor, {
    cache, keyFor: () => "capped-key", ttlSeconds: 99999
});
assert.equal(capped, true);
assert.equal(puts.at(-1).ttl, 21600, "El TTL nunca supera el máximo de CacheService.");

const prime = api.handleSharedSessionActorCachePriming_({
    secret: "S".repeat(40), userId: "U-2", role: "supervisor", fullName: "Jefe de prueba",
    epoch: 9, sessionTokens: ["token-priming-0001", "token-priming-0002"]
}, { properties: { getProperty: () => "S".repeat(40) }, cache, keyFor: (id, token) => id + ":" + token });
assert.deepEqual(prime, { status: "success", primed: 2 });
assert.equal(JSON.parse(values.get("U-2:token-priming-0001")).epoch, 9);
const denied = api.handleSharedSessionActorCachePriming_({
    secret: "X".repeat(40), userId: "U-2", role: "supervisor", epoch: 9,
    sessionTokens: ["token-priming-0003"]
}, { properties: { getProperty: () => "S".repeat(40) }, cache });
assert.equal(denied.status, "error");
console.log("SessionActorCacheLifetime: 6/6 PASS — actor precargado al login, sin revalidación por acción y TTL local renovable");
