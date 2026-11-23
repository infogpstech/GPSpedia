// ============================================================================
// GPSpedia — Cliente servidor-a-servidor del coordinador compartido.
// Incluir este archivo en cada proyecto AUTH, WRITE, ADMIN, FEEDBACK y UTILITIES.
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
    // API legacy para clientes externos; no participa en el flujo de sesión de GPSpedia.
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
        for (let offset = 0; offset < tokens.length; offset += 25) {
            const batch = tokens.slice(offset, offset + 25);
            const result = send_("invalidateSessionActorCaches", "AUTH", "invalidateSessionActorCaches", {
                userId: id, sessionTokens: batch
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
        getServiceTraffic: getServiceTraffic, registerSession: registerSession,
        syncUserSessions: syncUserSessions, revokeSession: revokeSession,
        revokeUserSessions: revokeUserSessions, invalidateSessionActorCaches: invalidateSessionActorCaches,
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


function revokeSharedSessionContext_(userId, sessionToken) {
    return invalidateLocalSharedSessionActorCaches_(userId, [sessionToken]);
}

function revokeSharedUserSessionContexts_(userId, sessionTokens) {
    return invalidateLocalSharedSessionActorCaches_(userId, sessionTokens);
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


function getSharedSessionActorCacheKey_(userId, sessionToken) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
        String(userId || "").trim() + "\\n" + String(sessionToken || ""), Utilities.Charset.UTF_8);
    return "GPSpedia_SHARED_SESSION_ACTOR_V1_" +
        bytes.map(byte => ((Number(byte) + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function handleSharedSessionActorCacheInvalidation_(payload, dependencies) {
    const source = payload && typeof payload === "object" ? payload : {};
    const userId = String(source.userId || "").trim();
    const tokens = Array.isArray(source.sessionTokens) ? source.sessionTokens : [];
    if (!userId || userId.length > 128 || !tokens.length || tokens.length > 25 ||
        tokens.some(token => typeof token !== "string" || token.length < 16 || token.length > 200)) {
        return { status: "error", message: "Datos de invalidación no válidos." };
    }
    const invalidated = invalidateLocalSharedSessionActorCaches_(userId, tokens, dependencies);
    return { status: "success", invalidated };
}

// El contexto de usuario/rol se sincroniza al iniciar sesión; CacheService admite hasta 6 h.
const SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600;
function getCachedSharedSessionActor_(userId, sessionToken, dependencies) {
    const id = String(userId || "").trim(), token = String(sessionToken || "");
    if (!id || !token) throw new Error("La sesión requiere userId y sessionToken.");
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
    const keyFor = typeof deps.keyFor === "function" ? deps.keyFor : getSharedSessionActorCacheKey_;
    const cacheKey = keyFor(id, token);
    const forceReload = deps.forceReload === true;
    const validActor = actor => actor && typeof actor === "object" && actor.userId === id &&
        typeof actor.role === "string" &&
        ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(actor.role.trim().toLowerCase()) &&
        Number.isSafeInteger(actor.epoch) && actor.epoch > 0;
    if (cache && typeof cache.get === "function") {
        try {
            const cached = cache.get(cacheKey);
            if (cached && !forceReload) {
                const actor = JSON.parse(cached);
                if (validActor(actor)) {
                    // TTL fijo: evita prolongar indefinidamente una identidad cacheada.
                    return actor;
                }
                if (typeof cache.remove === "function") cache.remove(cacheKey);
            }
        } catch (cacheError) {
            throw new Error("No se pudo leer el contexto local de sesión. Inicia sesión nuevamente.");
        }
    }
    const loader = typeof deps.loadActor === "function"
        ? deps.loadActor
        : loadSharedSessionActorFromSpreadsheet_;
    try {
        const actor = loader(id, token, deps);
        if (!validActor(actor)) throw new Error("La sesión no está activa en Users/ActiveSessions.");
        cacheSharedSessionActor_(id, token, actor, deps);
        return actor;
    } catch (loadError) {
        const error = new Error(loadError && loadError.message
            ? loadError.message : "No se pudo confirmar la sesión desde Users/ActiveSessions.");
        error.code = loadError && loadError.code || "SESSION_ACTOR_CACHE_MISS";
        throw error;
    }
}

function loadSharedSessionActorFromSpreadsheet_(userId, sessionToken, dependencies) {
    const id = String(userId || "").trim(), token = String(sessionToken || "");
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    if (!id || !token) throw new Error("La sesión requiere userId y sessionToken.");
    const spreadsheetId = String(deps.spreadsheetId ||
        (typeof SPREADSHEET_ID !== "undefined" ? SPREADSHEET_ID : "") || "").trim();
    if (!spreadsheetId) throw new Error("No está disponible la referencia de la Spreadsheet de identidad.");
    const openSpreadsheet = typeof deps.openSpreadsheet === "function"
        ? deps.openSpreadsheet : value => SpreadsheetApp.openById(value);
    const ss = openSpreadsheet(spreadsheetId);
    const usersSheet = ss.getSheetByName("Users");
    const sessionsSheet = ss.getSheetByName("ActiveSessions");
    if (!usersSheet || !sessionsSheet) throw new Error("No se encontraron Users y ActiveSessions.");
    const sessionRows = sessionsSheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < sessionRows.length; index++) {
        const row = sessionRows[index];
        if (String(row[2] || "") === token) matches.push({ row, rowIndex: index + 1 });
    }
    if (matches.length !== 1) throw new Error(matches.length > 1
        ? "El token aparece en varias sesiones." : "La sesión fue revocada o no existe.");
    const session = matches[0].row;
    const sessionUserId = String(session[0] === null || session[0] === undefined ? "" : session[0]).trim();
    if (!sessionUserId || sessionUserId !== id) throw new Error("La identidad no corresponde al token de sesión.");
    const createdAt = session[3] instanceof Date ? new Date(session[3].getTime()) : new Date(session[3]);
    const rawActivity = session[5] === null || session[5] === undefined || String(session[5]).trim() === ""
        ? session[3] : session[5];
    const lastActivityAt = rawActivity instanceof Date ? new Date(rawActivity.getTime()) : new Date(rawActivity);
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(lastActivityAt.getTime())) {
        throw new Error("La fecha de la sesión no es válida.");
    }
    const now = typeof deps.now === "function" ? Number(deps.now()) : Date.now();
    const addMonths = (date, months) => {
        const value = new Date(date.getTime()), day = value.getUTCDate();
        value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + months);
        const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
        value.setUTCDate(Math.min(day, lastDay));
        return value.getTime();
    };
    if (now >= addMonths(createdAt, 3) || now >= addMonths(lastActivityAt, 1)) {
        throw new Error("La sesión expiró por antigüedad o inactividad.");
    }
    const userRows = usersSheet.getDataRange().getValues().slice(1)
        .filter(row => String(row[0] === null || row[0] === undefined ? "" : row[0]).trim() === id);
    if (userRows.length !== 1) throw new Error("La cuenta no existe o su identificador no es único.");
    const user = userRows[0];
    const username = String(user[1] || "").trim();
    const role = String(user[3] || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const allowedRoles = ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"];
    if (!username || username.startsWith("__deleted__:") || !allowedRoles.includes(role)) {
        throw new Error("La cuenta está desactivada o no tiene un rol válido.");
    }
    const pendingMarker = String(user[7] || "");
    if (pendingMarker.startsWith("__role_revocation_pending__:")) {
        throw new Error("La revocación de rol de esta cuenta sigue pendiente.");
    }
    return { userId: id, role, fullName: String(user[6] || ""), epoch: 1,
        createdAt: createdAt.getTime(), lastActivityAt: lastActivityAt.getTime() };
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

