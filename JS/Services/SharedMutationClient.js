// ============================================================================
// GPSpedia — Cliente servidor-a-servidor del coordinador compartido.
// Incluir este archivo en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
// ============================================================================

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

        const payload = Object.assign({}, extraPayload || {}, {
            service: service,
            operation: operation,
            secret: secret
        });
        const requestBody = JSON.stringify({ action: action, payload: payload });

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
        const acquired = send_("acquire", service, operation, {
            requestId: requestId,
            waitMs: 12000,
            userId: String(options && options.session && options.session.userId || ""),
            sessionToken: String(options && options.session && options.session.sessionToken || "")
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

    function getCatalogChanges(cursor, limit) {
        return send_("getCatalogChanges", "FEEDBACK", "getCatalogChanges", { cursor: cursor, limit: limit });
    }
    function registerSession(userId, sessionToken, role, fullName, createdAt, lastActivityAt) {
        return send_("registerSession", "AUTH", "registerSession", { userId, sessionToken, role, fullName, createdAt, lastActivityAt });
    }
    function revokeSession(userId, sessionToken) {
        return send_("revokeSession", "AUTH", "revokeSession", { userId, sessionToken });
    }
    function revokeUserSessions(userId) {
        return send_("revokeUserSessions", "AUTH", "revokeUserSessions", { userId });
    }

    return { withLease: withLease, publishCatalogChange: publishCatalogChange, getCatalogChanges: getCatalogChanges,
        registerSession: registerSession, revokeSession: revokeSession, revokeUserSessions: revokeUserSessions };
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
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.revokeSession(userId, sessionToken);
}

function revokeSharedUserSessionContexts_(userId) {
    const client = createSharedMutationClient_({
        properties: PropertiesService.getScriptProperties(),
        fetch: function(url, options) { return UrlFetchApp.fetch(url, options); },
        uuid: function() { return Utilities.getUuid(); },
        logger: function(message) { Logger.log(message); }
    });
    return client.revokeUserSessions(userId);
}
