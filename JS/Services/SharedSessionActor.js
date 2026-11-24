// GPSpedia — Helpers locales de contexto y caché de actor de sesión.
// No realiza llamadas entre servicios ni utiliza URLs o secretos compartidos.
// Incluir únicamente en proyectos Apps Script que consuman estas funciones locales.

const SHARED_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600;

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
    const cacheKeys = Array.from(new Set(Array.isArray(source.cacheKeys) ? source.cacheKeys : []));
    const tokens = Array.isArray(source.sessionTokens) ? source.sessionTokens : [];
    if (!userId || userId.length > 128) {
        return { status: "error", message: "Datos de invalidación no válidos." };
    }
    if (cacheKeys.length) {
        const pattern = /^GPSpedia_SHARED_SESSION_ACTOR_V1_[a-f0-9]{64}$/;
        if (cacheKeys.length > 100 || cacheKeys.some(key => typeof key !== "string" || !pattern.test(key))) {
            return { status: "error", message: "Las referencias de caché no son válidas." };
        }
        const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
        const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
        if (!cache || typeof cache.remove !== "function") {
            return { status: "error", message: "La caché local no está disponible." };
        }
        cacheKeys.forEach(key => cache.remove(key));
        return { status: "success", invalidated: cacheKeys.length };
    }
    if (!tokens.length || tokens.length > 25 ||
        tokens.some(token => typeof token !== "string" || token.length < 16 || token.length > 200)) {
        return { status: "error", message: "Datos de invalidación no válidos." };
    }
    const invalidated = invalidateLocalSharedSessionActorCaches_(userId, tokens, dependencies);
    return { status: "success", invalidated };
}

// El contexto de usuario/rol se sincroniza al iniciar sesión; CacheService admite hasta 6 h.
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
    const loadSpreadsheet = typeof deps.loadSpreadsheet === "function" ? deps.loadSpreadsheet : null;
    if (!loadSpreadsheet) throw new Error("No se inyectó el proveedor de la Spreadsheet de identidad.");
    const ss = loadSpreadsheet();
    if (!ss || typeof ss.getSheetByName !== "function") {
        throw new Error("El proveedor de la Spreadsheet de identidad no devolvió un contenedor válido.");
    }
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
    if (typeof recordSessionCacheKeysForResponse_ === "function") {
        recordSessionCacheKeysForResponse_(id, tokens);
    }
    const deps = dependencies && typeof dependencies === "object" ? dependencies : {};
    const cache = Object.prototype.hasOwnProperty.call(deps, "cache") ? deps.cache : CacheService.getScriptCache();
    const keyFor = typeof deps.keyFor === "function" ? deps.keyFor : getSharedSessionActorCacheKey_;
    if (!cache || typeof cache.remove !== "function") return 0;
    tokens.forEach(token => cache.remove(keyFor(id, token)));
    return tokens.length;
}
