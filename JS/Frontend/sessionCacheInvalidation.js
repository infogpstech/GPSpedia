// Coordinación de invalidación de caché de sesión desde el navegador.
// Las referencias son hashes de claves de caché; nunca se transmiten tokens de sesión entre servicios.
export const SESSION_CACHE_SERVICES = Object.freeze([
    "AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"
]);
export const SESSION_ACTOR_CACHE_TTL_SECONDS = 21600;

function uniqueKeys(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
        .filter(key => typeof key === "string" && key.length <= 128)));
}

export async function invalidateSessionActorCaches(options = {}) {
    const source = options && typeof options === "object" ? options : {};
    const keys = source.sessionCacheKeys && typeof source.sessionCacheKeys === "object"
        ? source.sessionCacheKeys : {};
    const userId = String(keys.userId || "").trim();
    const sharedKeys = uniqueKeys(keys.shared);
    const catalogKeys = uniqueKeys(keys.catalog);
    const request = source.routeAction;
    const retry = source.routeActionWithRetry;
    if (!userId || (!sharedKeys.length && !catalogKeys.length)) {
        return { status: "not_required", invalidatedServices: [], failedServices: [], maxCacheTtlSeconds: SESSION_ACTOR_CACHE_TTL_SECONDS };
    }
    if (typeof request !== "function" || typeof retry !== "function") {
        return { status: "partial", invalidatedServices: [], failedServices: SESSION_CACHE_SERVICES.slice(), maxCacheTtlSeconds: SESSION_ACTOR_CACHE_TTL_SECONDS };
    }
    const results = await Promise.all(SESSION_CACHE_SERVICES.map(async service => {
        const cacheKeys = service === "CATALOG" ? catalogKeys : sharedKeys;
        if (!cacheKeys.length) return { service, success: true, skipped: true };
        const payload = { userId, cacheKeys };
        const serviceRequest = (action, body) => request(action, body, service);
        try {
            const result = await retry("__invalidateSessionActorCache", payload, {
                routeAction: serviceRequest, maxAttempts: 2, retryDelayMs: 250, timeoutMs: 10000
            });
            if (!result || result.status !== "success" || result.invalidated !== cacheKeys.length) {
                throw new Error("El servicio no confirmó todas las referencias de caché.");
            }
            return { service, success: true };
        } catch (error) {
            return { service, success: false };
        }
    }));
    const invalidatedServices = results.filter(item => item.success && !item.skipped).map(item => item.service);
    const failedServices = results.filter(item => !item.success).map(item => item.service);
    return {
        status: failedServices.length ? "partial" : "success",
        invalidatedServices, failedServices,
        maxCacheTtlSeconds: SESSION_ACTOR_CACHE_TTL_SECONDS
    };
}
