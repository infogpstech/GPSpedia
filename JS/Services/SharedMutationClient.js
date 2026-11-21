// ============================================================================
// GPSpedia — Cliente servidor-a-servidor del coordinador compartido.
// Incluir este archivo en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
// ============================================================================

const SHARED_MUTATION_CLIENT_PROTOCOL_VERSION = 1;

function createSharedMutationClient_(dependencies) {
    const properties = dependencies.properties;
    const fetch = dependencies.fetch;
    const uuid = dependencies.uuid;
    const logger = dependencies.logger || function() {};

    function send_(action, service, operation, extraPayload) {
        const url = String(properties.getProperty("GPSpedia_COORDINATOR_URL") || "").trim();
        const secret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET") || "");
        if (!url.startsWith("https://script.google.com/macros/s/") ||
            !url.endsWith("/exec") || secret.length < 32) {
            throw new Error("La coordinación compartida no está configurada en este servicio; la operación fue rechazada por seguridad.");
        }

        const publishRequest = action === "publishCatalogChange" || action === "publishCatalogChanges";
        const requestId = publishRequest
            ? String(extraPayload && extraPayload.requestId || uuid() || "").trim()
            : "";
        const payload = Object.assign({}, extraPayload || {}, requestId ? { requestId: requestId } : {}, {
            service: service,
            operation: operation,
            secret: secret
        });
        const requestBody = JSON.stringify({
            protocolVersion: SHARED_MUTATION_CLIENT_PROTOCOL_VERSION,
            action: action,
            payload: payload
        });

        for (let attempt = 0; attempt < 2; attempt++) {
            let response;
            try {
                response = fetch(url, {
                    method: "post",
                    contentType: "application/json",
                    payload: requestBody,
                    muteHttpExceptions: true,
                    followRedirects: true
                });
            } catch (error) {
                if (attempt === 0) continue;
                throw new Error("No fue posible contactar el coordinador compartido; la operación no se ejecutó.");
            }

            const httpStatus = response.getResponseCode();
            let result;
            try {
                result = JSON.parse(response.getContentText());
            } catch (error) {
                if (attempt === 0) continue;
                throw new Error("El coordinador compartido no devolvió una respuesta JSON válida (HTTP " + httpStatus + ").");
            }

            if (httpStatus < 200 || httpStatus >= 300 || !result || result.status !== "success") {
                throw new Error(result && result.message
                    ? result.message
                    : "El coordinador compartido rechazó la operación (HTTP " + httpStatus + ").");
            }
            return result;
        }
        throw new Error("No fue posible confirmar la respuesta del coordinador compartido.");
    }

    function withLease(service, operation, callback, options) {
        if (typeof callback !== "function") throw new Error("La operación coordinada requiere una función de ejecución.");
        const nestedToken = String(options && options.nestedToken || "").trim();

        if (nestedToken) {
            const validation = send_("validate", service, operation, { token: nestedToken });
            if (!validation.valid) throw new Error("La lease interna no autoriza esta acción.");
            return callback(nestedToken, validation.actor || null);
        }

        const requestId = uuid();
        const sessionToken = String(options && options.session && options.session.sessionToken || "");
        const acquired = send_("acquire", service, operation, {
            requestId: requestId,
            waitMs: 12000,
            userId: sessionToken ? String(options && options.session && options.session.userId || "") : "",
            sessionToken: sessionToken
        });
        const token = String(acquired.token || "");
        if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
            throw new Error("El coordinador no devolvió una lease válida; la operación fue detenida.");
        }

        try {
            return callback(token, acquired.actor || null);
        } finally {
            try {
                send_("release", service, operation, { token: token });
            } catch (error) {
                logger("No se confirmó la liberación de la lease " + service + "/" + operation + "; se recuperará al vencer el plazo.");
            }
        }
    }

    function publishCatalogChange(service, operation, change) {
        return send_("publishCatalogChange", service, operation, { change: change });
    }
    function publishCatalogChanges(service, operation, changes) {
        return send_("publishCatalogChanges", service, operation, { changes: changes });
    }

    function getServiceTraffic() {
        return send_("getServiceTraffic", "ADMIN", "getServiceTraffic", {});
    }

    function getCatalogChanges(cursor, limit) {
        const url = String(properties.getProperty("GPSpedia_COORDINATOR_URL") || "").trim();
        if (!url.startsWith("https://script.google.com/macros/s/") || !url.endsWith("/exec")) {
            throw new Error("La URL del coordinador compartido no está configurada correctamente.");
        }
        const query = "?catalogFeed=1&cursor=" + encodeURIComponent(cursor == null ? 0 : cursor) +
            "&limit=" + encodeURIComponent(limit == null ? 50 : limit);
        let response;
        try {
            response = fetch(url + query, {
                method: "get",
                muteHttpExceptions: true,
                followRedirects: true
            });
        } catch (error) {
            throw new Error("No fue posible consultar el feed público del catálogo.");
        }
        const httpStatus = response.getResponseCode();
        let result;
        try {
            result = JSON.parse(response.getContentText());
        } catch (error) {
            throw new Error("El coordinador no devolvió un feed de catálogo JSON válido (HTTP " + httpStatus + ").");
        }
        if (httpStatus < 200 || httpStatus >= 300 || !result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "No se pudo consultar el feed público del catálogo (HTTP " + httpStatus + ").");
        }
        return result;
    }
    function registerSession(userId, sessionToken, role, fullName, createdAt, lastActivityAt) {
        return send_("registerSession", "AUTH", "registerSession", { userId, sessionToken, role, fullName, createdAt, lastActivityAt });
    }
    function syncUserSessions(userId, role, fullName, sessions) {
        return send_("syncUserSessions", "AUTH", "syncUserSessions", { userId, role, fullName, sessions });
    }
    function invalidateSessionActorCaches(userId, sessionTokens) {
        const id = String(userId || "").trim();
        const tokens = Array.from(new Set((Array.isArray(sessionTokens) ? sessionTokens : [])
            .map(token => String(token || "")).filter(Boolean)));
        if (!id || id.length > 128 || tokens.some(token => token.length < 16 || token.length > 200)) {
            throw new Error("La invalidación de caché requiere un usuario y tokens de sesión válidos.");
        }
        if (!tokens.length) return { status: "success", invalidated: 0 };
        // Coordinator mantiene las URLs y secretos de WRITE/FEEDBACK/ADMIN. El cliente
        // AUTH solo envía tokens al canal interno autenticado; no conoce credenciales ajenas.
        for (let offset = 0; offset < tokens.length; offset += 25) {
            const batch = tokens.slice(offset, offset + 25);
            const result = send_("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches", {
                userId: id,
                sessionTokens: batch
            });
            if (!result || result.status !== "success" || result.invalidated !== batch.length ||
                !Array.isArray(result.services) || !["WRITE", "FEEDBACK", "ADMIN"].every(service => result.services.includes(service))) {
                throw new Error("Coordinator no confirmó la invalidación remota completa de caché.");
            }
        }
        return { status: "success", invalidated: tokens.length };
    }

    function revokeSession(userId, sessionToken) {
        invalidateSessionActorCaches(userId, [sessionToken]);
        return send_("revokeSession", "AUTH", "revokeSession", { userId, sessionToken });
    }
    function revokeUserSessions(userId, sessionTokens) {
        invalidateSessionActorCaches(userId, sessionTokens);
        return send_("revokeUserSessions", "AUTH", "revokeUserSessions", { userId });
    }
    function validateSessionContext(userId, sessionToken, service) {
        const caller = String(service || "AUTH").trim().toUpperCase();
        return send_("validateSessionContext", caller, "validateSessionContext", { userId, sessionToken });
    }

    return { withLease: withLease, publishCatalogChange: publishCatalogChange,
        publishCatalogChanges: publishCatalogChanges, getCatalogChanges: getCatalogChanges,
        getServiceTraffic: getServiceTraffic,
        registerSession: registerSession, syncUserSessions: syncUserSessions,
        revokeSession: revokeSession, revokeUserSessions: revokeUserSessions,
        invalidateSessionActorCaches: invalidateSessionActorCaches,
        validateSessionContext: validateSessionContext };
}

function withSharedMutationLease_(service, operation, callback, options) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, requestOptions) { return UrlFetchApp.fetch(url, requestOptions); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.withLease(service, operation, callback, options);
}


function publishSharedCatalogChange_(service, operation, change) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.publishCatalogChange(service, operation, change);
}

function publishSharedCatalogChanges_(service, operation, changes) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.publishCatalogChanges(service, operation, changes);
}

function getSharedServiceTraffic_() {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.getServiceTraffic();
}

function getSharedCatalogChanges_(cursor, limit) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.getCatalogChanges(cursor, limit);
}


function registerSharedSessionContext_(userId, sessionToken, role, fullName, createdAt, lastActivityAt) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.registerSession(userId, sessionToken, role, fullName, createdAt, lastActivityAt);
}

function revokeSharedSessionContext_(userId, sessionToken) {
    invalidateLocalSharedSessionActorCaches_(userId, [sessionToken]);
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.revokeSession(userId, sessionToken);
}

function revokeSharedUserSessionContexts_(userId, sessionTokens) {
    invalidateLocalSharedSessionActorCaches_(userId, sessionTokens);
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.revokeUserSessions(userId, sessionTokens);
}


function withSharedSessionActor_(event, actor) {
    const source = event && event.postData && typeof event.postData.contents === "string"
        ? event.postData.contents : "{}";
    const request = JSON.parse(source);
    if (!request || typeof request !== "object" || Array.isArray(request)) {
        throw new Error("La solicitud protegida no tiene un formato válido.");
    }
    const payload = request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
        ? Object.assign({}, request.payload) : {};
    delete payload.__sharedSessionActor;
    delete payload.__feedbackActor;
    if (actor && typeof actor === "object" &&
        typeof actor.userId === "string" && typeof actor.role === "string" &&
        Number.isSafeInteger(actor.epoch) && actor.epoch > 0) {
        payload.__sharedSessionActor = {
            userId: actor.userId,
            role: actor.role,
            fullName: String(actor.fullName || ""),
            epoch: actor.epoch
        };
    }
    request.payload = payload;
    return Object.assign({}, event || {}, {
        postData: Object.assign({}, event && event.postData || {}, { contents: JSON.stringify(request) })
    });
}


function validateSharedSessionContext_(userId, sessionToken, service) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.validateSessionContext(userId, sessionToken, service);
}



function getSharedSessionActorCacheKey_(userId, sessionToken) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
        String(userId || "").trim() + "\\n" + String(sessionToken || ""), Utilities.Charset.UTF_8);
    return "GPSpedia_SHARED_SESSION_ACTOR_V1_" +
        bytes.map(byte => ((Number(byte) + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function handleSharedSessionActorCacheInvalidation_(payload, dependencies) {
    const source = payload && typeof payload === "object" ? payload : {};
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const properties = deps.properties || PropertiesService.getScriptProperties();
    const cache = deps.cache || CacheService.getScriptCache();
    const expected = String(deps.secret !== undefined ? deps.secret :
        properties.getProperty("GPSpedia_COORDINATOR_SECRET") || "");
    const supplied = String(source.secret || "");
    let difference = expected.length ^ supplied.length;
    for (let i = 0; i < Math.max(expected.length, supplied.length); i++) {
        difference |= (expected.charCodeAt(i) || 0) ^ (supplied.charCodeAt(i) || 0);
    }
    if (expected.length < 32 || difference !== 0) {
        return { status: "error", message: "Solicitud interna no autorizada." };
    }
    const userId = String(source.userId || "").trim();
    const tokens = Array.isArray(source.sessionTokens) ? source.sessionTokens : [];
    if (!userId || userId.length > 128 || !tokens.length || tokens.length > 5 ||
        tokens.some(token => typeof token !== "string" || !token || token.length > 200)) {
        return { status: "error", message: "Datos de invalidación no válidos." };
    }
    const uniqueTokens = Array.from(new Set(tokens));
    uniqueTokens.forEach(token => cache.remove(getSharedSessionActorCacheKey_(userId, token)));
    return { status: "success", invalidated: uniqueTokens.length };
}

// El contexto de usuario/rol se sincroniza al iniciar sesión; CacheService admite hasta 6 h.
const SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600;
function getCachedSharedSessionActor_(userId, sessionToken, dependencies) {
    const id = String(userId || "").trim(), token = String(sessionToken || "");
    if (!id || !token) throw new Error("La sesión requiere userId y sessionToken.");
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
    const validate = typeof deps.validate === "function" ? deps.validate :
        (actorUserId, actorToken) => validateSharedSessionContext_(actorUserId, actorToken, deps.service || "AUTH");
    const keyFor = typeof deps.keyFor === "function" ? deps.keyFor : getSharedSessionActorCacheKey_;
    const cacheKey = keyFor(id, token);
    const validActor = actor => actor && typeof actor === "object" && actor.userId === id &&
        typeof actor.role === "string" &&
        ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(actor.role.trim().toLowerCase()) &&
        Number.isSafeInteger(actor.epoch) && actor.epoch > 0;
    if (cache && typeof cache.get === "function") {
        try {
            const cached = cache.get(cacheKey);
            if (cached) {
                const actor = JSON.parse(cached);
                if (validActor(actor)) return actor;
                if (typeof cache.remove === "function") cache.remove(cacheKey);
            }
        } catch (cacheError) { /* La caché es opcional; se valida por el canal normal. */ }
    }
    const result = validate(id, token), actor = result && result.actor;
    if (!result || result.status !== "success" || result.valid !== true || !validActor(actor)) {
        throw new Error(result && result.message ? result.message : "La sesión fue revocada o no es válida.");
    }
    if (cache && typeof cache.put === "function") {
        try {
            const ttl = Math.max(1, Math.min(21600, Number(deps.ttlSeconds) || SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_));
            cache.put(cacheKey, JSON.stringify(actor), ttl);
        } catch (cacheError) { /* La indisponibilidad de caché no bloquea el aporte. */ }
    }
    return actor;
}

function cacheSharedSessionActor_(userId, sessionToken, actor, dependencies) {
    const id = String(userId || "").trim(), token = String(sessionToken || "");
    const source = actor && typeof actor === "object" ? actor : {};
    const role = String(source.role || "").trim().toLowerCase();
    if (!id || !token || source.userId !== id ||
        !["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(role) ||
        !Number.isSafeInteger(source.epoch) || source.epoch < 1) return false;
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
    const keyFor = typeof deps.keyFor === "function" ? deps.keyFor : getSharedSessionActorCacheKey_;
    if (!cache || typeof cache.put !== "function") return false;
    const cachedActor = { userId: id, role, fullName: String(source.fullName || ""), epoch: source.epoch };
    const ttl = Math.max(1, Math.min(21600, Number(deps.ttlSeconds) || SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_));
    cache.put(keyFor(id, token), JSON.stringify(cachedActor), ttl);
    return true;
}

function invalidateLocalSharedSessionActorCaches_(userId, sessionTokens, dependencies) {
    const id = String(userId || "").trim();
    const tokens = Array.from(new Set((Array.isArray(sessionTokens) ? sessionTokens : [])
        .map(token => String(token || "")).filter(Boolean)));
    if (!id || !tokens.length) return 0;
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
    const keyFor = typeof deps.keyFor === "function" ? deps.keyFor : getSharedSessionActorCacheKey_;
    if (!cache || typeof cache.remove !== "function") return 0;
    tokens.forEach(token => cache.remove(keyFor(id, token)));
    return tokens.length;
}

function syncSharedUserSessionContexts_(userId, role, fullName, sessions) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.syncUserSessions(userId, role, fullName, sessions);
}
