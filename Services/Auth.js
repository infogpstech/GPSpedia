// ============================================================================
// GPSPEDIA-AUTH SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.2.5

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os"; // <-- ACTUALIZADO A DB V2.0
const SHEET_NAMES = {
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions",
    LOGS: "Logs"
};

// Mapas de columnas corregidos para coincidir con la hoja de cálculo real
const COLS_USERS = {
    ID: 1,
    Nombre_Usuario: 2,
    Password: 3,
    Privilegios: 4,
    Telefono: 5,
    Correo_Electronico: 6,
    Nombre_Completo: 7,
    SessionToken: 8,
    TermsAcceptance: 9
};

const COLS_ACTIVE_SESSIONS = {
    ID_Usuario: 1,
    Usuario: 2,
    ActiveSessions: 3,
    date: 4,
    Logs: 5,
    LastActivityAt: 6,
    SessionTermsAcceptance: 7
};

const SESSION_LIMITS = {
    'desarrollador': Infinity,
    'gefe': 10,
    'jefe': 3, // Alias de compatibilidad con USERS
    'supervisor': 3,
    'tecnico': 2,
    'tecnico_exterior': 1
};

const ROLE_REVOCATION_PROPERTY_PREFIX = 'role_revocation_pending_';
const ROLE_REVOCATION_SHARED_PREFIX = '__role_revocation_pending__:';
const LOGIN_REQUEST_PROPERTY_PREFIX = 'login_request_';
const LOGIN_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// CONTRASEÑAS Y CONTROL DE INTENTOS DE INICIO DE SESIÓN
// ============================================================================
const PASSWORD_HASH_PREFIX = 'sha256$';
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

function normalizePassword(password) {
    return String(password === null || password === undefined ? '' : password).trim();
}

function digestToHex(bytes) {
    return bytes.map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function createPasswordHash(password, enforceMinimumLength = true) {
    const normalizedPassword = normalizePassword(password);
    if (enforceMinimumLength && normalizedPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres después de quitar espacios al inicio y al final.');
    }
    const salt = Utilities.getUuid().replace(/-/g, '');
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + normalizedPassword, Utilities.Charset.UTF_8);
    return PASSWORD_HASH_PREFIX + salt + '$' + digestToHex(digest);
}

function constantTimeEquals(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    return difference === 0;
}

function verifyStoredPassword(storedPassword, providedPassword) {
    const stored = String(storedPassword === null || storedPassword === undefined ? '' : storedPassword);
    const normalizedPassword = normalizePassword(providedPassword);
    if (stored.indexOf(PASSWORD_HASH_PREFIX) === 0) {
        const parts = stored.split('$');
        if (parts.length !== 3 || !parts[1] || !/^[0-9a-f]{64}$/i.test(parts[2])) return { matches: false, legacy: false };
        const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, parts[1] + ':' + normalizedPassword, Utilities.Charset.UTF_8);
        return { matches: constantTimeEquals(digestToHex(digest), parts[2].toLowerCase()), legacy: false };
    }
    return { matches: normalizePassword(stored) === normalizedPassword, legacy: true };
}

function getLoginAttemptCacheKey(username) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizedUsername, Utilities.Charset.UTF_8);
    return 'login_attempts_' + digestToHex(digest);
}

// CacheService es temporal: puede desalojar el estado antes del TTL; el bloqueo es de mejor esfuerzo.
function readLoginAttemptState_(cache, key, now) {
    const rawState = cache.get(key);
    let state = {};
    if (rawState) {
        try { state = JSON.parse(rawState) || {}; }
        catch (e) { state = {}; }
    }
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};

    // Compatibilidad temporal con el contador anterior { attempts, lockedUntil }.
    if (!Object.prototype.hasOwnProperty.call(state, 'failedAttempts')) {
        state.failedAttempts = Math.max(0, Number(state.attempts) || 0);
    }
    state.failedAttempts = Math.floor(Math.max(0, Number(state.failedAttempts) || 0));
    const oldestPendingAt = now - LOGIN_LOCKOUT_SECONDS * 1000;
    state.pendingAttempts = Array.isArray(state.pendingAttempts)
        ? state.pendingAttempts.filter(item =>
            item &&
            typeof item.id === 'string' &&
            item.id.length > 0 &&
            Number.isFinite(Number(item.startedAt)) &&
            Number(item.startedAt) <= now &&
            Number(item.startedAt) > oldestPendingAt
        )
        : [];

    const lockedUntil = Number(state.lockedUntil);
    if (Number.isFinite(lockedUntil) && lockedUntil > now) {
        state.lockedUntil = lockedUntil;
    } else {
        delete state.lockedUntil;
        if (Number.isFinite(lockedUntil) && lockedUntil <= now) state.failedAttempts = 0;
    }
    delete state.attempts;
    return state;
}

function writeLoginAttemptState_(cache, key, state) {
    const hasActiveLock = Number(state.lockedUntil) > Date.now();
    if (state.failedAttempts === 0 && state.pendingAttempts.length === 0 && !hasActiveLock) {
        cache.remove(key);
        return;
    }
    cache.put(key, JSON.stringify(state), LOGIN_LOCKOUT_SECONDS);
}

function removeLoginAttemptReservation_(state, attemptId) {
    const previousLength = state.pendingAttempts.length;
    state.pendingAttempts = state.pendingAttempts.filter(item => item.id !== attemptId);
}

function beginLoginAttempt(username) {
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    const attemptId = Utilities.getUuid();
    lock.waitLock(10000);
    try {
        const now = Date.now();
        const state = readLoginAttemptState_(cache, key, now);
        if (state.lockedUntil && now < state.lockedUntil) {
            throw new Error('Se alcanzó el máximo de intentos. Intenta nuevamente en 15 minutos.');
        }

        const activeAttempts = state.failedAttempts + state.pendingAttempts.length;
        if (activeAttempts >= LOGIN_MAX_ATTEMPTS) {
            state.lockedUntil = now + LOGIN_LOCKOUT_SECONDS * 1000;
            writeLoginAttemptState_(cache, key, state);
            throw new Error('Se alcanzó el máximo de intentos. Intenta nuevamente en 15 minutos.');
        }

        state.pendingAttempts.push({ id: attemptId, startedAt: now });
        if (state.failedAttempts + state.pendingAttempts.length >= LOGIN_MAX_ATTEMPTS) {
            state.lockedUntil = now + LOGIN_LOCKOUT_SECONDS * 1000;
        }
        writeLoginAttemptState_(cache, key, state);
        return attemptId;
    } finally {
        lock.releaseLock();
    }
}

function resetLoginAttempts(username, attemptId) {
    if (typeof attemptId !== 'string' || !attemptId) {
        throw new Error('Se requiere el identificador de la reserva para reiniciar intentos.');
    }
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const state = readLoginAttemptState_(cache, key, Date.now());
        removeLoginAttemptReservation_(state, attemptId);
        state.failedAttempts = 0;
        delete state.lockedUntil;
        writeLoginAttemptState_(cache, key, state);
    } finally {
        lock.releaseLock();
    }
}

function registerFailedLoginAttempt(username, attemptId) {
    if (typeof attemptId !== 'string' || !attemptId) {
        throw new Error('Se requiere el identificador de la reserva para registrar el fallo.');
    }
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const now = Date.now();
        const state = readLoginAttemptState_(cache, key, now);
        removeLoginAttemptReservation_(state, attemptId);
        state.failedAttempts++;
        if (state.failedAttempts >= LOGIN_MAX_ATTEMPTS ||
            state.failedAttempts + state.pendingAttempts.length >= LOGIN_MAX_ATTEMPTS) {
            if (!state.lockedUntil || state.lockedUntil <= now) {
                state.lockedUntil = now + LOGIN_LOCKOUT_SECONDS * 1000;
            }
        } else {
            delete state.lockedUntil;
        }
        writeLoginAttemptState_(cache, key, state);
    } finally {
        lock.releaseLock();
    }
}

function rollbackLoginAttempt(username, attemptId) {
    if (typeof attemptId !== 'string' || !attemptId) {
        throw new Error('Se requiere el identificador de la reserva para revertir el intento.');
    }
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const state = readLoginAttemptState_(cache, key, Date.now());
        removeLoginAttemptReservation_(state, attemptId);
        if (state.failedAttempts < LOGIN_MAX_ATTEMPTS &&
            state.failedAttempts + state.pendingAttempts.length < LOGIN_MAX_ATTEMPTS) {
            delete state.lockedUntil;
        }
        writeLoginAttemptState_(cache, key, state);
    } finally {
        lock.releaseLock();
    }
}

// ============================================================================
// MÓDULO DE DEPURACIÓN
// ============================================================================
function logToSheet(level, message, details = {}) {
    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    try {
        lock.waitLock(10000);
        lockAcquired = true;
        const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.LOGS);
        if (!logSheet) throw new Error("Hoja Logs no encontrada.");
        if (logSheet.getLastRow() < 1) throw new Error("La hoja Logs no contiene una fila de encabezados.");
        const timestamp = new Date().toISOString();
        const detailsString = Object.keys(details).length > 0 ? JSON.stringify(details) : '';
        // La fila 1 conserva los encabezados; cada registro nuevo se inserta en la fila 2.
        logSheet.insertRowBefore(2);
        logSheet.getRange(2, 1, 1, 4).setValues([[timestamp, level, message, detailsString]]);
        SpreadsheetApp.flush();
    } catch (e) {
        console.error("Fallo al escribir en la hoja de logs:", e.message);
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}


// ============================================================================
// PURGA COORDINADA DE LOGS — ÚNICA AUTORIDAD AUTH
// ============================================================================
function isSensitiveLogRecord_(row) {
    const message = String(row[2] || "").trim();
    const details = String(row[3] || "");
    const containsCredentialFields = /"(?:password|sheetPassword|currentPassword|newPassword|fromSheet|fromClient)"\s*:/i.test(details);
    const containsLoginUsername = message === "handleLogin started." && /"username"\s*:/i.test(details);
    const isPasswordComparison = message === "Password comparison";
    return containsCredentialFields || containsLoginUsername || isPasswordComparison;
}

function handleClearSensitiveLogs(payload) {
    const userId = normalizeUserId(payload && payload.userId);
    const sessionToken = payload && payload.sessionToken;
    if (!userId || typeof sessionToken !== "string" || !sessionToken) {
        throw new Error("Se requiere una sesión válida de Desarrollador para purgar Logs.");
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let scannedCount = 0;
    let deletedCount = 0;
    let deletionError = null;

    try {
        lock.waitLock(10000);
        lockAcquired = true;

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const logsSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOGS);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!logsSheet || !sessionsSheet || !usersSheet) {
            throw new Error("No se encontraron las hojas Logs, ActiveSessions y Users.");
        }

        const sessionsData = sessionsSheet.getDataRange().getValues();
        const requesterSessions = sessionsData.slice(1).filter(row =>
            row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken
        );
        if (requesterSessions.length !== 1) {
            throw new Error(requesterSessions.length > 1
                ? "El token del solicitante está duplicado; no se modificó Logs."
                : "Acceso denegado: sesión inválida o expirada.");
        }

        const requesterSession = requesterSessions[0];
        if (normalizeUserId(requesterSession[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== userId) {
            throw new Error("Acceso denegado: la sesión no corresponde al usuario indicado.");
        }
        const expiration = getSessionExpirationStatus_(requesterSession, new Date());
        if (expiration.expired) {
            throw new Error("Acceso denegado: la sesión expiró por " + expiration.reason + ".");
        }

        const requesterUsers = usersSheet.getDataRange().getValues().slice(1).filter(row =>
            normalizeUserId(row[COLS_USERS.ID - 1]) === userId
        );
        if (requesterUsers.length !== 1 || !isActiveAuthUserRecord(requesterUsers[0])) {
            throw new Error("Acceso denegado: no se pudo identificar una cuenta activa y única.");
        }
        assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, userId);
        if (normalizeRoleName(requesterUsers[0][COLS_USERS.Privilegios - 1]) !== "desarrollador") {
            throw new Error("Acceso denegado: la purga de Logs está reservada a Desarrollador.");
        }

        const lastRow = logsSheet.getLastRow();
        if (lastRow < 1) throw new Error("La hoja Logs no contiene una fila de encabezados.");
        if (lastRow > 1) {
            const lastColumn = Math.max(logsSheet.getLastColumn(), 4);
            const data = logsSheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
            scannedCount = data.length;
            const rowsToDelete = [];
            for (let i = 0; i < data.length; i++) {
                if (isSensitiveLogRecord_(data[i])) rowsToDelete.push(i + 2);
            }

            // AUTH logToSheet() usa este mismo ScriptLock; ninguna inserción AUTH
            // puede desplazar estos índices hasta que termine el borrado.
            for (let i = rowsToDelete.length - 1; i >= 0; i--) {
                try {
                    logsSheet.deleteRow(rowsToDelete[i]);
                    deletedCount++;
                } catch (error) {
                    deletionError = error;
                    break;
                }
            }
            try {
                SpreadsheetApp.flush();
            } catch (error) {
                if (!deletionError) deletionError = error;
            }
        }
    } finally {
        if (lockAcquired) lock.releaseLock();
    }

    // No adquirir logToSheet() mientras el lock anterior siga retenido.
    if (deletionError) {
        logToSheet("ERROR", "Sensitive Logs purge incomplete.", {
            requesterUserId: userId,
            scannedCount,
            deletedCount,
            cleanupPending: true
        });
        return {
            status: "error",
            scannedCount,
            deletedCount,
            cleanupPending: true,
            message: "La purga quedó incompleta. Se eliminaron " + deletedCount + " registros; ejecuta nuevamente la operación para revisar los restantes."
        };
    }

    logToSheet("INFO", "Sensitive Logs purge completed.", {
        requesterUserId: userId,
        scannedCount,
        deletedCount
    });
    return {
        status: "success",
        scannedCount,
        deletedCount,
        message: "Se eliminaron " + deletedCount + " registros confidenciales de Logs."
    };
}

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const scriptProperties = PropertiesService.getScriptProperties();
        const coordinatorUrl = String(scriptProperties.getProperty('GPSpedia_COORDINATOR_URL') || '').trim();
        const coordinatorSecret = String(scriptProperties.getProperty('GPSpedia_COORDINATOR_SECRET') || '');
        const serviceState = {
            service: 'GPSpedia-Auth',
            version: '2.2.5',
            status: 'available',
            coordinatorConfigured: coordinatorUrl.startsWith('https://script.google.com/macros/s/') &&
                coordinatorUrl.endsWith('/exec') && coordinatorSecret.length >= 32
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.JSON);
    }
    // Comportamiento por defecto si no está en modo de depuración
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Auth-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["login","touchSession","acceptTerms","changePassword","resetUserPassword","resetUserSessions","clearSensitiveLogs","deleteUser","updateUser","logout"].includes(action);
}

function doPost(e) {
    let request;
    try {
        request = JSON.parse(e && e.postData && e.postData.contents || "{}");
    } catch (error) {
        return doPostInternal_(e);
    }
    if (!request || typeof request !== "object") return doPostInternal_(e);
    const action = String(request.action || "");
    if (!isSharedMutationAction_(action)) return doPostInternal_(e);

    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    const nestedToken = String(payload.__sharedMutationToken || "").trim();
    try {
        return withSharedMutationLease_("AUTH", action, function(token) {
            
            const wrappedEvent = Object.assign({}, e || {}, {
                postData: Object.assign({}, e && e.postData || {}, { contents: JSON.stringify(request) })
            });
            return doPostInternal_(wrappedEvent);
        }, nestedToken ? { nestedToken: nestedToken } : undefined);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "La operación fue rechazada por el coordinador compartido."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

function doPostInternal_(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);

        switch (request.action) {
            case 'login':
                response = handleLogin(request.payload);
                break;
            case 'validateSession':
                response = handleValidateSession(request.payload);
                break;
            case 'acceptTerms':
                response = handleAcceptTerms(request.payload);
                break;
            case 'touchSession':
                response = handleTouchSession(request.payload);
                break;
            case 'changePassword':
                response = handleChangePassword(request.payload);
                break;
            case 'resetUserPassword':
                response = handleResetUserPassword(request.payload);
                break;
            case 'resetUserSessions':
                response = handleResetUserSessions(request.payload);
                break;
            case 'clearSensitiveLogs':
                response = handleClearSensitiveLogs(request.payload);
                break;
            case 'deleteUser':
                response = handleDeleteUser(request.payload);
                break;
            case 'updateUser':
                response = handleUpdateUser(request.payload);
                break;
            case 'logout':
                response = handleLogout(request.payload);
                break;
            default:
                throw new Error(`Acción desconocida: ${request.action}`);
        }
    } catch (error) {
        logToSheet('ERROR', `Error in doPost: ${error.message}`, { stack: error.stack });
        response = { status: 'error', message: error.message };
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// LÓGICA DE AUTENTICACIÓN
// ============================================================================
function normalizeLoginRequestId_(value) {
    if (value === null || value === undefined || value === '') return Utilities.getUuid();
    const requestId = String(value).trim();
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
        throw new Error('Identificador de solicitud de login inválido.');
    }
    return requestId;
}

function cleanupExpiredLoginRequests_(properties, now, sessionsSheet) {
    const all = properties.getProperties();
    Object.keys(all).forEach(key => {
        if (!key.startsWith(LOGIN_REQUEST_PROPERTY_PREFIX)) return;
        try {
            const record = JSON.parse(all[key]);
            const createdAtMs = record && Number.isFinite(Number(record.createdAtMs))
                ? Number(record.createdAtMs)
                : (record && Date.parse(record.createdAt));
            if (!record || !Number.isFinite(createdAtMs) ||
                now - createdAtMs > LOGIN_REQUEST_TTL_MS) {
                if (record && record.status === 'pending' && record.token && sessionsSheet) {
                    const matches = findSessionRowsByTokenUnderLock_(sessionsSheet, record.token);
                    if (matches.length > 1) throw new Error('Un intento de login vencido tiene un token duplicado.');
                    if (matches.length === 1) {
                        const rowIndex = matches[0].rowIndex;
                        sessionsSheet.getRange(rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent();
                        if (sessionsSheet.getRange(rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).getValue()) {
                            throw new Error('No se pudo invalidar un intento de login vencido.');
                        }
                        try { sessionsSheet.deleteRow(rowIndex); } catch (deleteError) {}
                    }
                }
                properties.deleteProperty(key);
            }
        } catch (error) {
            throw new Error('No se pudo reconciliar un intento de login vencido: ' + error.message);
        }
    });
}

function revokePendingLoginRequestsForUserUnderLock_(userId) {
    const properties = PropertiesService.getScriptProperties();
    const all = properties.getProperties();
    let revoked = 0;
    try {
        Object.keys(all).forEach(key => {
            if (!key.startsWith(LOGIN_REQUEST_PROPERTY_PREFIX)) return;
            let record;
            try { record = JSON.parse(all[key]); } catch (error) { return; }
            if (!record || normalizeUserId(record.userId) !== normalizeUserId(userId) || record.status === 'revoked') return;
            record.status = 'revoked';
            record.revokedAt = Date.now();
            properties.setProperty(key, JSON.stringify(record));
            revoked++;
        });
    } catch (error) {
        return { pending: true, revoked, error };
    }
    return { pending: false, revoked };
}

function revokeLoginRequestForTokenUnderLock_(token, expectedUserId = null) {
    const properties = PropertiesService.getScriptProperties();
    const all = properties.getProperties();
    const matchingRecords = [];
    try {
        Object.keys(all).forEach(key => {
            if (!key.startsWith(LOGIN_REQUEST_PROPERTY_PREFIX)) return;
            let record;
            try { record = JSON.parse(all[key]); } catch (error) { return; }
            if (!record || record.token !== token || record.status === 'revoked') return;
            if (expectedUserId !== null &&
                normalizeUserId(record.userId) !== normalizeUserId(expectedUserId)) {
                throw new Error('El intento de login asociado no coincide con la identidad solicitada.');
            }
            matchingRecords.push({ key, record });
        });
        matchingRecords.forEach(item => {
            item.record.status = 'revoked';
            item.record.revokedAt = Date.now();
            properties.setProperty(item.key, JSON.stringify(item.record));
        });
    } catch (error) {
        return { pending: true, matched: false, error };
    }
    return { pending: false, matched: matchingRecords.length > 0 };
}

function findSessionRowsByTokenUnderLock_(sheet, token) {
    const data = sheet.getDataRange().getValues();
    const matches = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === token) {
            matches.push({ rowIndex: i + 1, row: data[i] });
        }
    }
    return matches;
}

// La solicitud conserva el mismo token entre reintentos. ScriptProperties se escribe
// antes de tocar Sheets; la fila y el puntero se verifican por lectura posterior.
function createOrRecoverLoginSessionUnderLock_(userSheet, sessionsSheet, userRowIndex, userId, username, sessionLimit, requestId) {
    const properties = PropertiesService.getScriptProperties();
    const now = Date.now();
    cleanupExpiredLoginRequests_(properties, now, sessionsSheet);
    const key = LOGIN_REQUEST_PROPERTY_PREFIX + requestId;
    let record = null;
    const raw = properties.getProperty(key);
    if (raw) {
        try { record = JSON.parse(raw); } catch (error) { throw new Error('El registro de recuperación del login está dañado.'); }
        if (record && record.status === 'revoked') throw new Error('LOGIN_REQUEST_ALREADY_REVOKED: La solicitud de login ya fue invalidada. Inicia un nuevo intento.');
        if (!record || normalizeUserId(record.userId) !== normalizeUserId(userId) ||
            typeof record.token !== 'string' || !record.token) {
            throw new Error('El identificador de login ya está asociado a otra solicitud.');
        }
    }

    const isNewRequest = !record;
    const token = record ? record.token : Utilities.getUuid();
    let createdAt = record && record.createdAt ? record.createdAt : new Date().toISOString();
    let matches = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
    if (matches.length > 1) throw new Error('El token de recuperación aparece duplicado; no se creó otra sesión.');
    if (record && record.status === 'committed' && matches.length === 0) {
        throw new Error('LOGIN_REQUEST_ALREADY_REVOKED: La sesión de esa solicitud ya fue cerrada. Inicia un nuevo intento de login.');
    }
    if (matches.length === 1) {
        if (normalizeUserId(matches[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId)) {
            throw new Error('El token de recuperación pertenece a otra cuenta.');
        }
        const expiry = getSessionExpirationStatus_(matches[0].row, new Date());
        if (expiry.expired) throw new Error('LOGIN_REQUEST_ALREADY_REVOKED: La sesión de esa solicitud ya expiró. Inicia un nuevo intento de login.');
        createdAt = expiry.createdAt.toISOString();
    } else {
        if (!record) {
            record = { userId: normalizeUserId(userId), token, createdAt, createdAtMs: now, status: 'pending', pointerSet: false };
            properties.setProperty(key, JSON.stringify(record));
        }
        const newSessionRow = [];
        newSessionRow[COLS_ACTIVE_SESSIONS.ID_Usuario - 1] = userId;
        newSessionRow[COLS_ACTIVE_SESSIONS.Usuario - 1] = username;
        newSessionRow[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] = token;
        newSessionRow[COLS_ACTIVE_SESSIONS.date - 1] = createdAt;
        newSessionRow[COLS_ACTIVE_SESSIONS.Logs - 1] = '';
        newSessionRow[COLS_ACTIVE_SESSIONS.LastActivityAt - 1] = createdAt;
        newSessionRow[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1] = '';
        try {
            sessionsSheet.appendRow(newSessionRow);
        } catch (appendError) {
            matches = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
            if (matches.length !== 1) throw appendError;
        }
        matches = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
        if (matches.length !== 1) throw new Error('No se pudo confirmar la creación de la sesión; el mismo intento puede reintentarse.');
    }

    if (!record.pointerSet) {
        const pointerRange = userSheet.getRange(userRowIndex, COLS_USERS.SessionToken);
        const currentPointer = pointerRange.getValue();
        let pointerAlreadyReferencesActiveSession = false;
        if (currentPointer && currentPointer !== token) {
            const pointerRows = findSessionRowsByTokenUnderLock_(sessionsSheet, currentPointer);
            pointerAlreadyReferencesActiveSession = !isNewRequest && pointerRows.length === 1 &&
                normalizeUserId(pointerRows[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) === normalizeUserId(userId);
        }
        if (!pointerAlreadyReferencesActiveSession) {
            try { pointerRange.setValue(token); }
            catch (writeError) {
                if (pointerRange.getValue() !== token) {
                    throw new Error('La sesión fue creada, pero no se pudo confirmar Users.SessionToken. Reintenta el mismo inicio de sesión.');
                }
            }
            if (pointerRange.getValue() !== token) {
                throw new Error('La sesión fue creada, pero Users.SessionToken no coincide. Reintenta el mismo inicio de sesión.');
            }
        }
        record.pointerSet = true;
        properties.setProperty(key, JSON.stringify(record));
    }

    const sessionData = sessionsSheet.getDataRange().getValues();
    const activeRows = [];
    const expiredRows = [];
    const tokenCounts = new Map();
    const nowForSessionLimit = new Date();
    for (let i = 1; i < sessionData.length; i++) {
        const row = sessionData[i];
        const rowToken = String(row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
        if (rowToken) tokenCounts.set(rowToken, (tokenCounts.get(rowToken) || 0) + 1);
        if (normalizeUserId(row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId) || !rowToken) continue;
        const session = { rowIndex: i + 1, token: rowToken };
        if (getSessionExpirationStatus_(row, nowForSessionLimit).expired) expiredRows.push(session);
        else activeRows.push(session);
    }
    const sessionCount = activeRows.length;
    let cleanupPending = false;
    let oldestSession = null;
    const candidates = [...expiredRows];
    if (Number.isFinite(sessionLimit) && activeRows.length > sessionLimit) {
        const excess = activeRows.length - sessionLimit;
        const oldestActive = activeRows.filter(row => row.token !== token)
            .sort((a, b) => a.rowIndex - b.rowIndex).slice(0, excess);
        if (oldestActive.length !== excess) throw new Error('No se pudo identificar la cantidad de sesiones que deben revocarse.');
        candidates.push(...oldestActive);
    }
    candidates.forEach(row => {
        if (tokenCounts.get(row.token) > 1) throw new Error('Existe un token de sesión duplicado; no se modificó la sesión antigua.');
    });
    for (const row of candidates.sort((a, b) => b.rowIndex - a.rowIndex)) {
        try {
            sessionsSheet.getRange(row.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent();
        } catch (clearError) {}
        const remainingToken = sessionsSheet.getRange(row.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).getValue();
        if (remainingToken) {
            throw new Error('La nueva sesión quedó creada; la revocación de una sesión anterior o expirada sigue pendiente. Reintenta el mismo inicio de sesión.');
        }
        if (!oldestSession || row.rowIndex < oldestSession.rowIndex) oldestSession = row;
        try {
            sessionsSheet.deleteRow(row.rowIndex);
        } catch (deleteError) {
            cleanupPending = true;
        }
    }

    record = { ...record, userId: normalizeUserId(userId), token, createdAt, createdAtMs: record && record.createdAtMs ? record.createdAtMs : now, status: 'committed', pointerSet: true, committedAt: Date.now() };
    properties.setProperty(key, JSON.stringify(record));
    const confirmedRows = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
    if (confirmedRows.length !== 1) throw new Error('No se pudo confirmar la sesión después de aplicar el límite de sesiones.');
    const termsAcceptance = parseTermsAcceptance_(confirmedRows[0].row[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1]);
    SpreadsheetApp.flush();
    return { token, createdAt, sessionCount, oldestSession, cleanupPending, termsAcceptance };
}

function handleLogin(payload) {
    let normalizedUsername = '';
    let attemptId = null;
    let attemptReserved = false;
    let invalidCredentials = false;
    try {
        const { username, password, requestId: rawRequestId } = payload || {};
        const loginRequestId = normalizeLoginRequestId_(rawRequestId);

        normalizedUsername = String(username || '').trim();
        const normalizedPassword = normalizePassword(password);
        if (!normalizedUsername || !normalizedPassword) throw new Error("Usuario y contraseña son requeridos.");

        attemptId = beginLoginAttempt(normalizedUsername);
        attemptReserved = true;

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const userSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        const data = userSheet.getDataRange().getValues();
        data.shift();

        let foundUserRow = null;
        let foundUserIndex = -1;
        for (let i = 0; i < data.length; i++) {
            const sheetUsername = (data[i][COLS_USERS.Nombre_Usuario - 1] || '').toString();
            if (sheetUsername.trim().toLowerCase() === normalizedUsername.toLowerCase()) {
                foundUserRow = data[i];
                foundUserIndex = i;
                break;
            }
        }

        if (!foundUserRow) {
            invalidCredentials = true;
            throw new Error("Credenciales inválidas.");
        }

        const sheetPassword = foundUserRow[COLS_USERS.Password - 1];
        const passwordCheck = verifyStoredPassword(sheetPassword, normalizedPassword);
        if (!passwordCheck.matches) {
            invalidCredentials = true;
            throw new Error("Credenciales inválidas.");
        }

        resetLoginAttempts(normalizedUsername, attemptId);
        attemptReserved = false;

        const userId = foundUserRow[COLS_USERS.ID - 1];
        let sessionLimit = 1;
        const sessionLock = LockService.getScriptLock();
        let sessionLockAcquired = false;
        let sessionCount = 0;
        let sessionToken = '';
        let sessionCreatedAt = '';
        let sessionTermsAcceptance = { version: '', acceptedAt: '', status: 'pending' };
        let oldestSession = null;
        let sessionCleanupPending = false;
        let sessionOperationError = null;

        try {
            sessionLock.waitLock(10000);
            sessionLockAcquired = true;
            ensureTermsAcceptanceColumn_(userSheet);
            const currentUserRows = userSheet.getDataRange().getValues().slice(1)
                .map((row, index) => ({ row, rowIndex: index + 2 }))
                .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === normalizeUserId(userId));
            if (currentUserRows.length !== 1 || !isActiveAuthUserRecord(currentUserRows[0].row)) {
                throw new Error('La cuenta fue desactivada o su ID dejó de ser único; no se creará una sesión.');
            }

            foundUserRow = currentUserRows[0].row;
            const currentPasswordCheck = verifyStoredPassword(
                foundUserRow[COLS_USERS.Password - 1], normalizedPassword
            );
            if (!currentPasswordCheck.matches) {
                invalidCredentials = true;
                throw new Error('Credenciales inválidas.');
            }
            if (currentPasswordCheck.legacy) {
                userSheet.getRange(currentUserRows[0].rowIndex, COLS_USERS.Password)
                    .setValue(createPasswordHash(normalizedPassword, false));
            }
            const activeSessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
            if (!activeSessionsSheet) throw new Error('Hoja ActiveSessions no encontrada.');
            ensureActiveSessionsActivityColumn_(activeSessionsSheet);
            ensureSessionTermsAcceptanceColumn_(activeSessionsSheet);
            const roleRevocation = reconcileRoleRevocationUnderLock_(userSheet, activeSessionsSheet, userId);
            if (roleRevocation.pending) throw new Error('La revocación de sesiones anterior sigue pendiente. Intenta iniciar sesión nuevamente más tarde.');

            const refreshedUserRows = userSheet.getDataRange().getValues().slice(1)
                .map((row, index) => ({ row, rowIndex: index + 2 }))
                .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === normalizeUserId(userId));
            if (refreshedUserRows.length !== 1 || !isActiveAuthUserRecord(refreshedUserRows[0].row)) {
                throw new Error('La cuenta cambió durante la recuperación de sesión; no se creará una sesión.');
            }
            foundUserRow = refreshedUserRows[0].row;
            const currentUserRole = normalizeRoleName(foundUserRow[COLS_USERS.Privilegios - 1]);
            sessionLimit = SESSION_LIMITS[currentUserRole] ?? 1;

            const sessionResult = createOrRecoverLoginSessionUnderLock_(
                userSheet, activeSessionsSheet, refreshedUserRows[0].rowIndex, userId,
                foundUserRow[COLS_USERS.Nombre_Usuario - 1], sessionLimit, loginRequestId
            );
            sessionToken = sessionResult.token;
            sessionCreatedAt = sessionResult.createdAt;
            sessionTermsAcceptance = sessionResult.termsAcceptance || sessionTermsAcceptance;
            sessionCount = sessionResult.sessionCount;
            oldestSession = sessionResult.oldestSession;
            sessionCleanupPending = sessionResult.cleanupPending;
        } catch (sessionError) {
            sessionOperationError = sessionError;
        } finally {
            if (sessionLockAcquired) sessionLock.releaseLock();
        }

        if (sessionOperationError) {
            logToSheet('ERROR', 'Failed to create or recover active session.', { error: sessionOperationError.message, requestId: loginRequestId });
            throw sessionOperationError;
        }
        if (sessionCleanupPending) logToSheet('ERROR', 'Login succeeded but an inactive session row could not be deleted.', { userId, requestId: loginRequestId });

        const user = {
            ID: userId,
            Nombre_Usuario: foundUserRow[COLS_USERS.Nombre_Usuario - 1],
            Nombre_Completo: foundUserRow[COLS_USERS.Nombre_Completo - 1], // <-- FIX: Add missing field
            Privilegios: foundUserRow[COLS_USERS.Privilegios - 1],
            Telefono: foundUserRow[COLS_USERS.Telefono - 1],
            Correo_Electronico: foundUserRow[COLS_USERS.Correo_Electronico - 1],
            SessionToken: sessionToken,
            SessionCreatedAt: sessionCreatedAt,
            SessionLastActivityAt: sessionCreatedAt,
            TermsAcceptance: sessionTermsAcceptance
        };

        return { status: 'success', user: user, sessionCleanupPending };

    } catch (error) {
        if (attemptReserved) {
            try {
                if (invalidCredentials) {
                    registerFailedLoginAttempt(normalizedUsername, attemptId);
                } else {
                    rollbackLoginAttempt(normalizedUsername, attemptId);
                }
                attemptReserved = false;
            } catch (rollbackError) {
                console.error('No se pudo finalizar la reserva de intento:', rollbackError.message);
            }
        }
        logToSheet('ERROR', `Error in handleLogin: ${error.message}`, { stack: error.stack });
        return { status: 'error', message: error.message };
    }
}

function validateSessionReadOnly_(sessionToken, expectedUserId) {
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        if (!lock.tryLock(2500)) return { valid: null, unavailable: true, reason: 'session_busy' };
        acquired = true;
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) return { valid: null, unavailable: true, reason: 'missing_sheet' };
        const sessions = sessionsSheet.getDataRange().getValues();
        const matches = [];
        for (let index = 1; index < sessions.length; index++) {
            if (String(sessions[index][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '') === sessionToken) {
                matches.push({ row: sessions[index], rowIndex: index + 1 });
            }
        }
        if (matches.length !== 1) return { valid: false, reason: matches.length > 1 ? 'duplicate_token' : 'missing_session' };
        const session = matches[0];
        const userId = normalizeUserId(session.row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!userId || userId !== normalizeUserId(expectedUserId)) return { valid: false, reason: 'identity_mismatch' };
        const expiration = getSessionExpirationStatus_(session.row, new Date());
        if (expiration.expired) return { valid: false, reason: expiration.reason };
        if (hasPendingRoleRevocation_(userId)) return { valid: null, unavailable: true, reason: 'role_revocation_pending' };
        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (users.length !== 1 || !isActiveAuthUserRecord(users[0].row)) {
            return { valid: false, reason: 'inactive_or_ambiguous_user' };
        }
        const sessionTermsHeader = String(sessionsSheet.getRange(1, COLS_ACTIVE_SESSIONS.SessionTermsAcceptance).getValue() || '').trim();
        const termsAcceptance = sessionTermsHeader === 'SessionTermsAcceptance'
            ? parseTermsAcceptance_(session.row[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1])
            : { version: '', acceptedAt: '', status: 'pending' };
        return {
            valid: true, userId, createdAt: expiration.createdAt.toISOString(),
            lastActivityAt: session.row[COLS_ACTIVE_SESSIONS.LastActivityAt - 1] || session.row[COLS_ACTIVE_SESSIONS.date - 1],
            termsAcceptance,
            profile: {
                ID: userId,
                Nombre_Usuario: users[0].row[COLS_USERS.Nombre_Usuario - 1],
                Nombre_Completo: users[0].row[COLS_USERS.Nombre_Completo - 1],
                Privilegios: users[0].row[COLS_USERS.Privilegios - 1],
                Telefono: users[0].row[COLS_USERS.Telefono - 1],
                Correo_Electronico: users[0].row[COLS_USERS.Correo_Electronico - 1]
            }
        };
    } catch (error) {
        console.error('validateSessionReadOnly_:', error && error.message ? error.message : error);
        return { valid: null, unavailable: true, reason: 'validation_unavailable' };
    } finally {
        if (acquired) lock.releaseLock();
    }
}

function handleValidateSession(payload) {
    try {
        const { userId, sessionToken } = payload || {};
        if (!userId || !sessionToken) return { valid: false };
        return validateSessionReadOnly_(sessionToken, userId);
    } catch (error) {
        console.error('handleValidateSession:', error && error.message ? error.message : error);
        return { valid: null, unavailable: true, reason: 'validation_unavailable' };
    }
}
function handleTouchSession(payload) {
    try { const token=payload&&payload.sessionToken; if(typeof token!=='string'||!token)return{valid:false}; return validateAndTouchSession_(token); }
    catch(error){
        logToSheet('ERROR',`Error in handleTouchSession: ${error.message}`,{stack:error.stack});
        return{valid:null,unavailable:true,reason:'validation_unavailable'};
    }
}

// Todas las mutaciones de ActiveSessions y las eliminaciones de cuenta se coordinan en AUTH.
function isActiveAuthUserRecord(row) {
    if (!row) return false;
    const username = String(row[COLS_USERS.Nombre_Usuario - 1] || '').trim();
    const role = normalizeRoleName(row[COLS_USERS.Privilegios - 1]);
    return Boolean(username) && !username.startsWith('__deleted__:') &&
        ['desarrollador', 'gefe', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
}

// Cuenta únicamente cuentas activas con identidad de rol Desarrollador.
// Acepta filas directas o registros { row } usados por los handlers.
function countActiveDevelopers_(records) {
    if (!Array.isArray(records)) return 0;
    return records.filter(record => {
        const row = Array.isArray(record) ? record : record && record.row;
        return isActiveAuthUserRecord(row) &&
            normalizeRoleName(row[COLS_USERS.Privilegios - 1]) === 'desarrollador';
    }).length;
}
function normalizeRoleName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function normalizeUserId(value) {
    return String(value === null || value === undefined ? '' : value).trim();
}

const TERMS_CURRENT_VERSION = '2026-07';
function parseTermsAcceptance_(value) {
    if (value === null || value === undefined || String(value).trim() === '') return { version: '', acceptedAt: '', status: 'pending' };
    let record;
    try { record = JSON.parse(String(value)); } catch (error) { return { version: '', acceptedAt: '', status: 'invalid' }; }
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        typeof record.version !== 'string' || !record.version.trim() ||
        typeof record.acceptedAt !== 'string' || !record.acceptedAt.trim() ||
        !Number.isFinite(Date.parse(record.acceptedAt)) || record.status !== 'accepted') {
        return { version: '', acceptedAt: '', status: 'invalid' };
    }
    return { version: record.version.trim(), acceptedAt: record.acceptedAt, status: 'accepted' };
}
function ensureTermsAcceptanceColumn_(sheet) {
    if (!sheet) throw new Error('No se encontró la hoja Users.');
    const column = COLS_USERS.TermsAcceptance;
    const header = String(sheet.getRange(1, column).getValue() || '').trim();
    if (header === 'TermsAcceptance') return column;
    if (header) throw new Error('La columna I de Users ya contiene otro encabezado; no se modificó el esquema.');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const occupied = sheet.getRange(2, column, lastRow - 1, 1).getValues()
            .some(row => row[0] !== null && row[0] !== undefined && String(row[0]).trim() !== '');
        if (occupied) throw new Error('La columna I de Users contiene datos sin encabezado; no se modificó el esquema.');
    }
    sheet.getRange(1, column).setValue('TermsAcceptance');
    SpreadsheetApp.flush();
    if (String(sheet.getRange(1, column).getValue() || '').trim() !== 'TermsAcceptance') {
        throw new Error('No se pudo confirmar el encabezado TermsAcceptance en Users.');
    }
    return column;
}


function ensureSessionTermsAcceptanceColumn_(sheet) {
    if (!sheet) throw new Error('No se encontró la hoja ActiveSessions.');
    const column = COLS_ACTIVE_SESSIONS.SessionTermsAcceptance;
    const header = String(sheet.getRange(1, column).getValue() || '').trim();
    if (header === 'SessionTermsAcceptance') return column;
    if (header) throw new Error('La columna G de ActiveSessions ya contiene otro encabezado; no se modificó el esquema.');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const occupied = sheet.getRange(2, column, lastRow - 1, 1).getValues()
            .some(row => row[0] !== null && row[0] !== undefined && String(row[0]).trim() !== '');
        if (occupied) throw new Error('La columna G de ActiveSessions contiene datos sin encabezado; no se modificó el esquema.');
    }
    sheet.getRange(1, column).setValue('SessionTermsAcceptance');
    SpreadsheetApp.flush();
    if (String(sheet.getRange(1, column).getValue() || '').trim() !== 'SessionTermsAcceptance') {
        throw new Error('No se pudo confirmar el encabezado SessionTermsAcceptance.');
    }
    return column;
}

function roleRevocationPropertyKey_(userId) {
    return ROLE_REVOCATION_PROPERTY_PREFIX + encodeURIComponent(normalizeUserId(userId));
}

function isRoleRevocationPendingValue_(value) { return String(value || '').startsWith(ROLE_REVOCATION_SHARED_PREFIX); }
function parseRoleRevocationMarker_(raw) {
 if(typeof raw!=='string'||!raw)return null;let marker;try{marker=JSON.parse(raw);}catch(error){return{invalid:true};}
 if(!marker||typeof marker!=='object'||Array.isArray(marker)||!normalizeUserId(marker.userId)||typeof marker.oldRole!=='string'||!marker.oldRole.trim()||typeof marker.newRole!=='string'||!marker.newRole.trim()||!Number.isFinite(Number(marker.markedAt))||!['desarrollador','gefe','jefe','supervisor','tecnico','tecnico_exterior'].includes(normalizeRoleName(marker.oldRole))||!['desarrollador','gefe','supervisor','tecnico','tecnico_exterior'].includes(normalizeRoleName(marker.newRole)))return{invalid:true};
 if(Object.prototype.hasOwnProperty.call(marker,'newFullName')&&(typeof marker.newFullName!=='string'||marker.newFullName.length>120))return{invalid:true};
 return marker;
}
function parseSharedRoleRevocationMarker_(value) {const raw=String(value||'');if(!raw.startsWith(ROLE_REVOCATION_SHARED_PREFIX))return null;return parseRoleRevocationMarker_(raw.slice(ROLE_REVOCATION_SHARED_PREFIX.length));}
function sameRoleRevocationMarker_(a,b) {return Boolean(a&&b&&!a.invalid&&!b.invalid&&normalizeUserId(a.userId)===normalizeUserId(b.userId)&&String(a.oldRole)===String(b.oldRole)&&String(a.newRole)===String(b.newRole)&&Number(a.markedAt)===Number(b.markedAt)&&(Object.prototype.hasOwnProperty.call(a,'newFullName')===Object.prototype.hasOwnProperty.call(b,'newFullName'))&&(!Object.prototype.hasOwnProperty.call(a,'newFullName')||a.newFullName===b.newFullName));}
function migrateLegacyRoleRevocationMarkersToSharedState_() {
    return withSharedMutationLease_("AUTH", "migrateLegacyRoleRevocationMarkersToSharedState", function() {
        return migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_();
    });
}

function migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_() {
 const lock=LockService.getScriptLock();let acquired=false;
 try {
  lock.waitLock(10000);acquired=true;const properties=PropertiesService.getScriptProperties(),all=properties.getProperties();
  const keys=Object.keys(all).filter(key=>key.startsWith(ROLE_REVOCATION_PROPERTY_PREFIX));
  const usersSheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);if(!usersSheet)throw new Error('No se encontró la hoja Users.');
  let migrated=0;
  for(const key of keys){
   const marker=parseRoleRevocationMarker_(all[key]);if(!marker||marker.invalid)throw new Error('Marcador legacy dañado: '+key);
   let userId='';try{userId=decodeURIComponent(key.slice(ROLE_REVOCATION_PROPERTY_PREFIX.length));}catch(error){throw new Error('ID inválido en marcador legacy: '+key);}
   if(normalizeUserId(marker.userId)!==normalizeUserId(userId))throw new Error('El ID del marcador legacy no coincide con su clave.');
   const rows=usersSheet.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(item=>normalizeUserId(item.row[COLS_USERS.ID-1])===normalizeUserId(userId));
   if(rows.length!==1||!isActiveAuthUserRecord(rows[0].row))throw new Error('El usuario del marcador legacy no es único o no está activo: '+userId);
   const currentRole=normalizeRoleName(rows[0].row[COLS_USERS.Privilegios-1]);
   if(currentRole!==normalizeRoleName(marker.oldRole)&&currentRole!==normalizeRoleName(marker.newRole))throw new Error('El rol actual no coincide con el marcador legacy: '+userId);
   const cell=usersSheet.getRange(rows[0].rowIndex,COLS_USERS.SessionToken),value=String(cell.getValue()||''),shared=parseSharedRoleRevocationMarker_(value);
   if(shared&&!sameRoleRevocationMarker_(shared,marker))throw new Error('Existe un marcador compartido distinto para '+userId);
   if(!shared){const expected=ROLE_REVOCATION_SHARED_PREFIX+JSON.stringify(marker);try{cell.setValue(expected);}catch(error){}if(String(cell.getValue()||'')!==expected)throw new Error('No se confirmó el marcador compartido para '+userId);migrated++;}
  }
  SpreadsheetApp.flush();return{status:'success',markers:keys.length,migrated};
 } finally {if(acquired)lock.releaseLock();}
}
function hasPendingRoleRevocation_(userId,usersSheetOverride=null) {
 const key=roleRevocationPropertyKey_(userId);try{if(PropertiesService.getScriptProperties().getProperty(key))return true;}catch(error){return true;}
 try{const sh=usersSheetOverride||SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);if(!sh)return true;
  const rows=sh.getDataRange().getValues().slice(1).filter(r=>normalizeUserId(r[COLS_USERS.ID-1])===normalizeUserId(userId));
  if(rows.length!==1)return true;return isRoleRevocationPendingValue_(rows[0][COLS_USERS.SessionToken-1]);
 }catch(error){return true;}
}


function assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, requesterUserId) {
    if (!hasPendingRoleRevocation_(requesterUserId, usersSheet)) return;
    let reconciliation;
    try {
        reconciliation = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, requesterUserId);
    } catch (error) {
        throw new Error('Acceso denegado: no se pudo verificar o completar la revocación de rol del solicitante. ' + error.message);
    }
    if (reconciliation && reconciliation.pending) {
        throw new Error('Acceso denegado: el solicitante tiene una revocación de rol pendiente. Reintenta cuando finalice y vuelve a iniciar sesión.');
    }
    throw new Error('Acceso denegado: la sesión del solicitante fue invalidada por un cambio de rol. Inicia sesión nuevamente.');
}


// Invalida primero los tokens con una escritura consolidada y verifica el estado leído.
// No presupone atomicidad: cualquier token que permanezca se informa como pendiente.
function revokeAllUserSessionsUnderLock_(sheet, userId) {
    const requestRevocation = revokePendingLoginRequestsForUserUnderLock_(userId);
    if (requestRevocation.pending) {
        return {
            rows: [], revokedSessions: 0, pendingRows: [],
            pendingLoginRequests: true,
            writeError: requestRevocation.error
        };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { rows: [], revokedSessions: 0, pendingRows: [], pendingLoginRequests: false, writeError: null };
    const width = Math.max(COLS_ACTIVE_SESSIONS.LastActivityAt, sheet.getLastColumn());
    const data = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const tokenCounts = new Map();
    data.forEach(row => {
        const token = String(row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
        if (token) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
    const rows = [];
    for (let i = 0; i < data.length; i++) {
        if (normalizeUserId(data[i][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId)) continue;
        const token = String(data[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
        if (token && tokenCounts.get(token) > 1) {
            throw new Error('La cuenta tiene un token duplicado; no se modificaron las sesiones.');
        }
        rows.push({ rowIndex: i + 2, token });
    }
    if (!rows.some(row => row.token)) {
        return { rows, revokedSessions: 0, pendingRows: [], pendingLoginRequests: false, writeError: null };
    }

    const tokenRange = sheet.getRange(2, COLS_ACTIVE_SESSIONS.ActiveSessions, lastRow - 1, 1);
    const nextValues = tokenRange.getValues();
    rows.forEach(row => {
        if (row.token) nextValues[row.rowIndex - 2][0] = '';
    });
    let writeError = null;
    try {
        tokenRange.setValues(nextValues);
        SpreadsheetApp.flush();
    } catch (error) {
        writeError = error;
    }

    let verified;
    try {
        verified = tokenRange.getValues();
    } catch (readError) {
        return {
            rows, revokedSessions: 0, pendingRows: rows.filter(row => row.token),
            pendingLoginRequests: false, writeError: writeError || readError
        };
    }
    const pendingRows = rows.filter(row =>
        row.token && String(verified[row.rowIndex - 2][0] || '') !== ''
    );
    const revokedSessions = rows.filter(row =>
        row.token && String(verified[row.rowIndex - 2][0] || '') === ''
    ).length;
    return { rows, revokedSessions, pendingRows, pendingLoginRequests: false, writeError };
}

function deleteRevokedSessionRowsUnderLock_(sheet, rows) {
    let cleanupPending = false;
    let cleanupError = null;
    const ordered = [...rows].sort((a, b) => b.rowIndex - a.rowIndex);
    for (const row of ordered) {
        if (row.rowIndex > sheet.getLastRow()) continue;
        let token;
        try {
            token = sheet.getRange(row.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).getValue();
        } catch (error) {
            cleanupPending = true;
            cleanupError = error;
            break;
        }
        if (token !== null && token !== undefined && String(token) !== '') {
            cleanupPending = true;
            continue;
        }
        try {
            sheet.deleteRow(row.rowIndex);
        } catch (error) {
            cleanupPending = true;
            cleanupError = error;
            break;
        }
    }
    return { cleanupPending, cleanupError };
}


function reconcileRoleRevocationUnderLock_(usersSheet,sessionsSheet,userId) {
 const properties=PropertiesService.getScriptProperties(),key=roleRevocationPropertyKey_(userId);
 let raw=null,propertyReadError=null;try{raw=properties.getProperty(key);}catch(error){propertyReadError=error;}
 let rows=usersSheet.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(item=>normalizeUserId(item.row[COLS_USERS.ID-1])===normalizeUserId(userId));
 if(rows.length!==1||!isActiveAuthUserRecord(rows[0].row))return{pending:true,cleanupPending:true,revokedSessions:0,error:'La cuenta destino dejó de ser única o activa.'};
 const pointer=usersSheet.getRange(rows[0].rowIndex,COLS_USERS.SessionToken),shared=parseSharedRoleRevocationMarker_(rows[0].row[COLS_USERS.SessionToken-1]);
 if(shared&&shared.invalid)return{pending:true,cleanupPending:true,revokedSessions:0,error:'El marcador compartido de revocación está dañado.'};
 const local=raw?parseRoleRevocationMarker_(raw):null;
 if(local&&local.invalid&&!shared)return{pending:true,cleanupPending:true,revokedSessions:0,error:'El marcador local de revocación está dañado.'};
 if(shared&&local&&!local.invalid&&!sameRoleRevocationMarker_(shared,local))return{pending:true,cleanupPending:true,revokedSessions:0,error:'Los marcadores local y compartido de revocación no coinciden.'};
 const marker=shared||local;if(!marker){if(propertyReadError)return{pending:true,cleanupPending:true,revokedSessions:0,error:propertyReadError.message};return{pending:false,cleanupPending:false,revokedSessions:0};}
 if(normalizeUserId(marker.userId)!==normalizeUserId(userId))return{pending:true,cleanupPending:true,revokedSessions:0,error:'El marcador de revocación pertenece a otra cuenta.'};
 const sharedValue=ROLE_REVOCATION_SHARED_PREFIX+JSON.stringify(marker);
 if(!shared){let writeError=null;try{pointer.setValue(sharedValue);}catch(error){writeError=error;}let persisted='';try{persisted=String(pointer.getValue()||'');}catch(error){return{pending:true,cleanupPending:true,revokedSessions:0,error:error.message};}
  if(persisted!==sharedValue)return{pending:true,cleanupPending:true,revokedSessions:0,error:writeError?writeError.message:'No se confirmó el marcador compartido de revocación.'};}
 if(!raw){try{properties.setProperty(key,JSON.stringify(marker));}catch(error){}}
 const revocation=revokeAllUserSessionsUnderLock_(sessionsSheet,userId);
 if(revocation.pendingRows.length||revocation.pendingLoginRequests)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,pendingTokens:revocation.pendingRows.length,error:revocation.writeError?revocation.writeError.message:''};
 rows=usersSheet.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(item=>normalizeUserId(item.row[COLS_USERS.ID-1])===normalizeUserId(userId));
 if(rows.length!==1||!isActiveAuthUserRecord(rows[0].row))return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'La cuenta destino dejó de ser única o activa.'};
 const role=String(rows[0].row[COLS_USERS.Privilegios-1]||'').trim();
 if(role!==marker.newRole&&role!==marker.oldRole)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'El rol cambió fuera de la operación pendiente; se requiere revisión.'};
 if(role!==marker.newRole){let writeError=null;try{usersSheet.getRange(rows[0].rowIndex,COLS_USERS.Privilegios).setValue(marker.newRole);}catch(error){writeError=error;}
  if(String(usersSheet.getRange(rows[0].rowIndex,COLS_USERS.Privilegios).getValue()||'').trim()!==marker.newRole)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:writeError?writeError.message:'No se confirmó la escritura del nuevo rol.'};}
 if(Object.prototype.hasOwnProperty.call(marker,'newFullName')){
  const nameRange=usersSheet.getRange(rows[0].rowIndex,COLS_USERS.Nombre_Completo);let nameWriteError=null;
  try{nameRange.setValue(marker.newFullName);}catch(error){nameWriteError=error;}
  let persistedName='';try{persistedName=String(nameRange.getValue()===null||nameRange.getValue()===undefined?'':nameRange.getValue());}
  catch(error){return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'No se pudo verificar el nombre completo pendiente: '+error.message};}
  if(persistedName!==marker.newFullName)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:nameWriteError?nameWriteError.message:'No se confirmó el nombre completo pendiente.'};
 }
 try{SpreadsheetApp.flush();}catch(error){return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'No se pudo confirmar la escritura del rol y el perfil: '+error.message};}
 const confirmedRole=String(usersSheet.getRange(rows[0].rowIndex,COLS_USERS.Privilegios).getValue()||'').trim();
 if(confirmedRole!==marker.newRole)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'El rol no quedó confirmado después de flush.'};
 if(Object.prototype.hasOwnProperty.call(marker,'newFullName')){
  const confirmedName=String(usersSheet.getRange(rows[0].rowIndex,COLS_USERS.Nombre_Completo).getValue()||'');
  if(confirmedName!==marker.newFullName)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'El nombre completo no quedó confirmado después de flush.'};
 }
 const latest=usersSheet.getRange(rows[0].rowIndex,COLS_USERS.SessionToken),latestMarker=parseSharedRoleRevocationMarker_(String(latest.getValue()||''));
 if(!latestMarker||latestMarker.invalid||!sameRoleRevocationMarker_(latestMarker,marker))return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'El marcador compartido cambió antes de completar la revocación.'};
 const deletion=deleteRevokedSessionRowsUnderLock_(sessionsSheet,revocation.rows);
 try{properties.deleteProperty(key);if(properties.getProperty(key))return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:'El marcador local de revocación sigue activo.'};}
 catch(error){return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:error.message};}
 let clearError=null;try{latest.clearContent();}catch(error){clearError=error;}let remaining='';try{remaining=String(latest.getValue()||'');}catch(error){clearError=clearError||error;}
 if(remaining)return{pending:true,cleanupPending:true,revokedSessions:revocation.revokedSessions,error:clearError?clearError.message:'Users.SessionToken conserva el marcador compartido.'};
 return{pending:false,cleanupPending:deletion.cleanupPending,revokedSessions:revocation.revokedSessions,cleanupError:deletion.cleanupError?deletion.cleanupError.message:''};
}

function handleUpdateUser(payload) {
    const userId = normalizeUserId(payload && payload.userId);
    const updates = payload && payload.updates;
    const sessionToken = payload && payload.sessionToken;
    if (!userId || !updates || typeof sessionToken !== 'string' || !sessionToken) {
        throw new Error('Datos insuficientes para actualizar. Se requiere sessionToken.');
    }
    if (updates.Password) {
        throw new Error('El restablecimiento administrativo de contraseñas debe realizarse mediante AUTH con el rol Desarrollador.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let requesterUserId = '';
    let roleChanged = false;
    let cleanupPending = false;
    let revokedSessions = 0;
    let targetUsername = '';
    try {
        lock.waitLock(10000);
        acquired = true;
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');

        const sessionRows = sessionsSheet.getDataRange().getValues().slice(1)
            .filter(row => row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken);
        if (sessionRows.length !== 1) throw new Error('Acceso no autorizado: sesión inválida, duplicada o expirada.');
        const expiration = getSessionExpirationStatus_(sessionRows[0], new Date());
        if (expiration.expired) throw new Error('La sesión del solicitante expiró por ' + expiration.reason + '.');
        requesterUserId = normalizeUserId(sessionRows[0][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!requesterUserId) throw new Error('Identidad de sesión inválida.');
        if (hasPendingRoleRevocation_(requesterUserId)) {
            reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, requesterUserId);
            throw new Error('Tu rol cambió o tiene una revocación pendiente. Inicia sesión nuevamente.');
        }

        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const requesterRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === requesterUserId);
        const targetRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (requesterRows.length !== 1 || !isActiveAuthUserRecord(requesterRows[0].row)) {
            throw new Error('No se pudo identificar una cuenta solicitante activa y única.');
        }
        if (targetRows.length !== 1 || !isActiveAuthUserRecord(targetRows[0].row)) {
            throw new Error('El usuario destino no existe, está desactivado o su ID no es único.');
        }

        const requesterRole = normalizeRoleName(requesterRows[0].row[COLS_USERS.Privilegios - 1]);
        const currentTargetRole = String(targetRows[0].row[COLS_USERS.Privilegios - 1] || '').trim();
        const normalizedTargetRole = normalizeRoleName(currentTargetRole);
        const canUpdate = {
            desarrollador: () => true,
            gefe: role => ['supervisor', 'tecnico'].includes(role),
            jefe: role => ['supervisor', 'tecnico'].includes(role),
            supervisor: role => role === 'tecnico'
        };
        if (!canUpdate[requesterRole] || !canUpdate[requesterRole](normalizedTargetRole)) {
            throw new Error(`Rol '${requesterRows[0].row[COLS_USERS.Privilegios - 1]}' no tiene permisos para modificar a un '${currentTargetRole}'.`);
        }

        const allowedRoles = {
            desarrollador: ['desarrollador', 'gefe', 'supervisor', 'tecnico', 'tecnico_exterior'],
            gefe: ['supervisor', 'tecnico'],
            jefe: ['supervisor', 'tecnico'],
            supervisor: ['tecnico']
        };
        let nextRole = currentTargetRole;
        if (Object.prototype.hasOwnProperty.call(updates, 'Privilegios') && updates.Privilegios !== undefined && updates.Privilegios !== '') {
            nextRole = String(updates.Privilegios).trim();
            if (!allowedRoles[requesterRole] || !allowedRoles[requesterRole].includes(normalizeRoleName(nextRole))) {
                throw new Error(`El rol no tiene permisos para asignar el privilegio '${nextRole}'.`);
            }
            if (!['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'].includes(nextRole)) {
                throw new Error('El privilegio solicitado no es válido.');
            }
        }

        // La última cuenta Desarrollador no puede perder el rol. Se evalúa bajo el mismo lock
        // y antes de cualquier escritura, incluida la actualización del nombre.
        if (normalizedTargetRole === 'desarrollador' && normalizeRoleName(nextRole) !== 'desarrollador' && countActiveDevelopers_(users) <= 1) {
            throw new Error('No se puede degradar la última cuenta activa con rol Desarrollador. Asigna primero ese rol a otra cuenta.');
        }

        const hasFullNameUpdate = Boolean(updates.Nombre_Completo);
        if (hasFullNameUpdate && (typeof updates.Nombre_Completo !== 'string' || updates.Nombre_Completo.length > 120)) {
            throw new Error('El nombre completo debe ser texto y no superar 120 caracteres.');
        }
        const requestedFullName = hasFullNameUpdate
            ? updates.Nombre_Completo
            : String(targetRows[0].row[COLS_USERS.Nombre_Completo - 1] || '');

        const markerKey = roleRevocationPropertyKey_(userId);
        const properties = PropertiesService.getScriptProperties();
        let pendingRaw = null;
        try { pendingRaw = properties.getProperty(markerKey); } catch (error) { throw new Error('No se pudo verificar el estado pendiente del cambio de rol.'); }
        const sharedMarker = parseSharedRoleRevocationMarker_(String(targetRows[0].row[COLS_USERS.SessionToken - 1] || ''));
        const propertyMarker = pendingRaw ? parseRoleRevocationMarker_(pendingRaw) : null;
        if ((sharedMarker && sharedMarker.invalid) || (propertyMarker && propertyMarker.invalid && !sharedMarker)) throw new Error('Existe un marcador de cambio de rol dañado que requiere revisión.');
        if (sharedMarker && propertyMarker && !propertyMarker.invalid && !sameRoleRevocationMarker_(sharedMarker, propertyMarker)) throw new Error('Los marcadores de cambio de rol no coinciden; se requiere revisión.');
        const pendingMarker = sharedMarker || propertyMarker, hasPending = Boolean(pendingRaw) || Boolean(sharedMarker);
        if (hasPending && pendingMarker && pendingMarker.newRole && nextRole !== currentTargetRole && nextRole !== pendingMarker.newRole) throw new Error('Existe un cambio de rol anterior pendiente. Completa primero esa revocación antes de solicitar otro rol.');
        if (hasPending && hasFullNameUpdate && (!pendingMarker || !Object.prototype.hasOwnProperty.call(pendingMarker,'newFullName'))) {
            throw new Error('Existe una revocación anterior sin datos de perfil recuperables. Completa primero la revocación y actualiza el nombre por separado.');
        }
        if (hasPending && hasFullNameUpdate && pendingMarker.newFullName !== requestedFullName) {
            throw new Error('El nombre solicitado no coincide con la actualización pendiente. Completa primero esa operación.');
        }
        if (nextRole !== currentTargetRole && !hasPending) {
            const marker = { userId, markedAt: Date.now(), oldRole: currentTargetRole, newRole: nextRole };
            if (hasFullNameUpdate) marker.newFullName = requestedFullName;
            const sharedValue = ROLE_REVOCATION_SHARED_PREFIX + JSON.stringify(marker);
            const pointer = usersSheet.getRange(targetRows[0].rowIndex, COLS_USERS.SessionToken);
            let sharedWriteError = null; try { pointer.setValue(sharedValue); } catch (error) { sharedWriteError = error; }
            if (String(pointer.getValue() || '') !== sharedValue) throw new Error('No se pudo confirmar el estado compartido de revocación; no se inició el cambio de rol. ' + (sharedWriteError ? sharedWriteError.message : ''));
            try { properties.setProperty(markerKey, JSON.stringify(marker)); } catch (error) { /* El marcador compartido permite reintentar. */ }
        }
        if (nextRole !== currentTargetRole || hasPending) {
            const reconciliation = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, userId);
            revokedSessions = reconciliation.revokedSessions || 0;
            cleanupPending = reconciliation.pending || reconciliation.cleanupPending;
            targetUsername = String(targetRows[0].row[COLS_USERS.Nombre_Usuario - 1] || '');
            const persistedRole = String(usersSheet.getRange(targetRows[0].rowIndex, COLS_USERS.Privilegios).getValue() || '').trim();
            roleChanged = persistedRole !== currentTargetRole;
            if (reconciliation.pending) throw new Error('La actualización del rol quedó pendiente hasta confirmar la revocación de todas las sesiones y el perfil. Reintenta la operación. ' + (reconciliation.error || ''));
        } else if (hasFullNameUpdate) {
            const nameRange = usersSheet.getRange(targetRows[0].rowIndex, COLS_USERS.Nombre_Completo);
            let writeError = null;
            try { nameRange.setValue(requestedFullName); } catch (error) { writeError = error; }
            let persistedName = '';
            try { persistedName = String(nameRange.getValue() === null || nameRange.getValue() === undefined ? '' : nameRange.getValue()); }
            catch (error) { throw new Error('No se pudo verificar el nombre completo. Reintenta la actualización. ' + (writeError ? writeError.message : error.message)); }
            if (persistedName !== requestedFullName) throw new Error('No se confirmó el nombre completo. Reintenta la actualización. ' + (writeError ? writeError.message : ''));
        }
        SpreadsheetApp.flush();
    } finally {
        if (acquired) lock.releaseLock();
    }

    logToSheet(cleanupPending ? 'ERROR' : 'INFO', 'User updated in AUTH; role changes revoke all target sessions.', {
        requesterUserId, targetUserId: userId, targetUsername, roleChanged, revokedSessions, cleanupPending
    });
    const selfSessionRevoked = roleChanged && requesterUserId === userId;
    return {
        status: 'success',
        roleChanged,
        selfSessionRevoked,
        revokedSessions,
        cleanupPending,
        message: cleanupPending
            ? 'Usuario actualizado; la revocación o limpieza de algunas sesiones quedó pendiente. Reintenta la actualización para completar la operación.'
            : (roleChanged
                ? 'Usuario actualizado. Se revocaron todas sus sesiones; deberá iniciar sesión nuevamente en sus dispositivos.'
                : 'Usuario actualizado.')
    };
}


const SESSION_ABSOLUTE_MONTHS=3, SESSION_IDLE_MONTHS=1;
function parseSessionDate_(v){if(v===null||v===undefined||String(v).trim()==='')return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;}
function addCalendarMonthsUTC_(date,months){const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
function getSessionExpirationStatus_(row,now=new Date()){if(!row)return{expired:true,reason:'missing_session'};const created=parseSessionDate_(row[COLS_ACTIVE_SESSIONS.date-1]),raw=row[COLS_ACTIVE_SESSIONS.LastActivityAt-1],activity=raw===null||raw===undefined||String(raw).trim()===''?created:parseSessionDate_(raw);if(!created||!activity)return{expired:true,reason:'invalid_timestamp'};if(now.getTime()>=addCalendarMonthsUTC_(created,SESSION_ABSOLUTE_MONTHS).getTime())return{expired:true,reason:'absolute_expiration'};if(now.getTime()>=addCalendarMonthsUTC_(activity,SESSION_IDLE_MONTHS).getTime())return{expired:true,reason:'inactivity_expiration'};return{expired:false,createdAt:created,lastActivityAt:activity};}
function ensureActiveSessionsActivityColumn_(sheet){const col=COLS_ACTIVE_SESSIONS.LastActivityAt;if(sheet.getMaxColumns()<col)sheet.insertColumnsAfter(sheet.getMaxColumns(),col-sheet.getMaxColumns());const header=String(sheet.getRange(1,col).getValue()||'').trim();if(header==='lastActivityAt')return col;if(header!=='')throw new Error('La columna F de ActiveSessions está ocupada por otro encabezado; no se modificó el esquema.');const last=sheet.getLastRow();if(last>1&&sheet.getRange(2,col,last-1,1).getValues().some(r=>r[0]!==null&&r[0]!==undefined&&String(r[0]).trim()!==''))throw new Error('La columna F de ActiveSessions contiene datos sin encabezado; no se modificó el esquema.');sheet.getRange(1,col).setValue('lastActivityAt');SpreadsheetApp.flush();return col;}
function validateAndTouchSession_(token, expectedUserId = null) {
    const lock = LockService.getScriptLock(); let acquired = false;
    try {
        lock.waitLock(10000); acquired = true;
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) return { valid: null, unavailable: true, reason: 'missing_sheet' };
        ensureActiveSessionsActivityColumn_(sessionsSheet);
        ensureSessionTermsAcceptanceColumn_(sessionsSheet);
        const data = sessionsSheet.getDataRange().getValues(), matches = [];
        for (let i = 1; i < data.length; i++) if (data[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === token) matches.push({ rowIndex: i + 1, row: data[i] });
        if (matches.length !== 1) return { valid: false, reason: matches.length > 1 ? 'duplicate_token' : 'missing_session' };
        const session = matches[0], userId = normalizeUserId(session.row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!userId || (expectedUserId !== null && userId !== normalizeUserId(expectedUserId))) return { valid: false, reason: 'identity_mismatch' };
        const userRows = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (userRows.length !== 1 || !isActiveAuthUserRecord(userRows[0].row)) return { valid: false, reason: 'inactive_or_ambiguous_user' };
        try {
            if (hasPendingRoleRevocation_(userId)) {
                reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, userId);
                return { valid: false, reason: 'role_changed_reauthentication_required' };
            }
        } catch (error) { return { valid: null, unavailable: true, reason: 'role_revocation_pending' }; }
        const expiration = getSessionExpirationStatus_(session.row, new Date());
        if (expiration.expired) {
            const requestRevocation = revokeLoginRequestForTokenUnderLock_(token, userId);
            if (requestRevocation.pending) return { valid: false, reason: 'expired_request_revocation_pending' };
            try { sessionsSheet.deleteRow(session.rowIndex); } catch (error) { console.error('No se pudo retirar la fila expirada:', error.message); }
            if (userRows[0].row[COLS_USERS.SessionToken - 1] === token) {
                try {
                    const current = usersSheet.getDataRange().getValues().slice(1)
                        .map((row, index) => ({ row, rowIndex: index + 2 }))
                        .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
                    if (current.length === 1) usersSheet.getRange(current[0].rowIndex, COLS_USERS.SessionToken).clearContent();
                } catch (error) { console.error('No se pudo limpiar Users.SessionToken:', error.message); }
            }
            SpreadsheetApp.flush(); return { valid: false, reason: expiration.reason };
        }
        const termsAcceptance = parseTermsAcceptance_(session.row[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1]);
        const lastActivityAt = new Date().toISOString();
        sessionsSheet.getRange(session.rowIndex, COLS_ACTIVE_SESSIONS.LastActivityAt).setValue(lastActivityAt);
        SpreadsheetApp.flush();
        return {
            valid: true, userId, createdAt: expiration.createdAt.toISOString(), lastActivityAt, termsAcceptance,
            // Perfil mínimo leído de Users y asociado al token validado; nunca incluye contraseña ni token.
            profile: {
                ID: userId,
                Nombre_Usuario: userRows[0].row[COLS_USERS.Nombre_Usuario - 1],
                Nombre_Completo: userRows[0].row[COLS_USERS.Nombre_Completo - 1],
                Privilegios: userRows[0].row[COLS_USERS.Privilegios - 1],
                Telefono: userRows[0].row[COLS_USERS.Telefono - 1],
                Correo_Electronico: userRows[0].row[COLS_USERS.Correo_Electronico - 1]
            }
        };
    } finally { if (acquired) lock.releaseLock(); }
}

function handleResetUserSessions(payload) {
    const targetUserId = normalizeUserId(payload && payload.targetUserId);
    const sessionToken = payload && payload.sessionToken;
    if (!targetUserId || typeof sessionToken !== 'string' || !sessionToken) {
        throw new Error('Datos insuficientes para cerrar las sesiones del usuario.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let requesterUserId = '';
    let targetUsername = '';
    let revokedSessions = 0;
    let cleanupPending = false;
    let operationError = null;
    try {
        lock.waitLock(10000);
        acquired = true;
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');

        const requesterMatches = findSessionRowsByTokenUnderLock_(sessionsSheet, sessionToken);
        if (requesterMatches.length !== 1) throw new Error('Sesión solicitante inválida o duplicada.');
        const expiry = getSessionExpirationStatus_(requesterMatches[0].row, new Date());
        if (expiry.expired) throw new Error('La sesión del solicitante expiró por ' + expiry.reason + '.');
        requesterUserId = normalizeUserId(requesterMatches[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, requesterUserId);

        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const requesterRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === requesterUserId);
        const targetRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === targetUserId);
        if (requesterRows.length !== 1 || !isActiveAuthUserRecord(requesterRows[0].row)) {
            throw new Error('No se pudo identificar una cuenta solicitante activa y única.');
        }
        if (normalizeRoleName(requesterRows[0].row[COLS_USERS.Privilegios - 1]) !== 'desarrollador') {
            throw new Error('Acceso denegado. Esta operación está reservada al rol Desarrollador.');
        }
        if (requesterUserId === targetUserId) throw new Error('No puedes cerrar remotamente tu propia sesión desde esta operación.');
        if (targetRows.length !== 1 || !isActiveAuthUserRecord(targetRows[0].row)) {
            throw new Error('El usuario seleccionado no existe, está desactivado o su ID no es único.');
        }

        targetUsername = String(targetRows[0].row[COLS_USERS.Nombre_Usuario - 1] || '');
        if (hasPendingRoleRevocation_(targetUserId)) {
            const reconciliation = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, targetUserId);
            revokedSessions = reconciliation.revokedSessions || 0;
            cleanupPending = reconciliation.pending || reconciliation.cleanupPending;
            if (reconciliation.pending) {
                operationError = new Error('La revocación de rol pendiente no pudo completarse; reintenta la operación.');
            }
        } else {
            const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, targetUserId);
            revokedSessions = revocation.revokedSessions;
            if (revocation.pendingRows.length || revocation.pendingLoginRequests) {
                operationError = new Error('No se pudo confirmar la revocación de todas las sesiones y solicitudes de login. Reintenta la operación para completar la revocación.');
                cleanupPending = true;
            } else {
                const deletion = deleteRevokedSessionRowsUnderLock_(sessionsSheet, revocation.rows);
                cleanupPending = deletion.cleanupPending;
                if (deletion.cleanupError) operationError = deletion.cleanupError;

                const pointer = usersSheet.getRange(targetRows[0].rowIndex, COLS_USERS.SessionToken);
                try { pointer.clearContent(); } catch (error) { cleanupPending = true; operationError = operationError || error; }
                try {
                    if (pointer.getValue()) cleanupPending = true;
                } catch (error) { cleanupPending = true; operationError = operationError || error; }
            }
        }
        SpreadsheetApp.flush();
    } finally {
        if (acquired) lock.releaseLock();
    }

    if (cleanupPending || operationError) {
        logToSheet('ERROR', 'Remote session revocation requires retry.', {
            requesterUserId, targetUserId, revokedSessions,
            error: operationError ? operationError.message : ''
        });
        return {
            status: 'error',
            revokedSessions,
            cleanupPending: true,
            message: 'Se invalidaron ' + revokedSessions + ' sesión(es), pero la operación no pudo confirmarse por completo. Reintenta para completar la revocación y limpieza.'
        };
    }

    logToSheet('INFO', 'All target sessions revoked through AUTH.', { requesterUserId, targetUserId, targetUsername, revokedSessions });
    return {
        status: 'success',
        revokedSessions,
        cleanupPending: false,
        message: 'Se cerraron todas las sesiones de ' + targetUsername + '.'
    };
}

function handleDeleteUser(payload) {
    const userId = normalizeUserId(payload && payload.userId);
    const sessionToken = payload && payload.sessionToken;
    if (!userId || typeof sessionToken !== 'string' || !sessionToken) {
        throw new Error('Datos insuficientes para eliminar. Se requiere userId y sessionToken.');
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let requesterUserId = '';
    let closedSessions = 0;
    let deletionError = null;
    let alreadyDeleted = false;

    try {
        lock.waitLock(10000);
        lockAcquired = true;

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) {
            throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        }

        const sessionsData = sessionsSheet.getDataRange().getValues();
        const requesterSessions = sessionsData.slice(1).filter(row =>
            row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken
        );
        if (requesterSessions.length !== 1) {
            throw new Error(requesterSessions.length > 1
                ? 'Token solicitante duplicado; no se modificó ninguna cuenta.'
                : 'Sesión inválida o expirada.');
        }

        const requesterExpiration=getSessionExpirationStatus_(requesterSessions[0],new Date());
        if(requesterExpiration.expired)throw new Error('La sesión del solicitante expiró por '+requesterExpiration.reason+'.');
        requesterUserId = normalizeUserId(requesterSessions[0][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!requesterUserId) {
            throw new Error('Identidad de sesión inválida.');
        }
        assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, requesterUserId);

        const usersData = usersSheet.getDataRange().getValues();
        const requesterRows = [];
        const targetRows = [];
        const uniqueIds = new Set();

        for (let i = 1; i < usersData.length; i++) {
            const row = usersData[i];
            const rowId = normalizeUserId(row[COLS_USERS.ID - 1]);
            const rowHasData = row.some(value => String(value === null || value === undefined ? '' : value).trim() !== '');

            if (rowHasData && !rowId) {
                throw new Error('Existe una cuenta sin ID; no se modificó ninguna cuenta.');
            }
            if (rowId && uniqueIds.has(rowId)) {
                throw new Error('Hay IDs de usuario duplicados; no se modificó ninguna cuenta.');
            }
            if (rowId) uniqueIds.add(rowId);

            if (rowId === requesterUserId) requesterRows.push({ rowIndex: i + 1, row });
            if (rowId === userId) targetRows.push({ rowIndex: i + 1, row });
        }

        if (requesterRows.length !== 1 || !isActiveAuthUserRecord(requesterRows[0].row)) {
            throw new Error('Solicitante no único o inactivo.');
        }
        if (requesterUserId === userId) {
            throw new Error('No puedes eliminar tu propia cuenta.');
        }
        if (targetRows.length !== 1) {
            throw new Error(targetRows.length > 1 ? 'ID destino duplicado.' : 'Usuario no encontrado.');
        }

        const target = targetRows[0];
        alreadyDeleted = !isActiveAuthUserRecord(target.row);
        const requesterRole = normalizeRoleName(requesterRows[0].row[COLS_USERS.Privilegios - 1]);
        const targetRole = normalizeRoleName(target.row[COLS_USERS.Privilegios - 1]);
        const canDelete = {
            desarrollador: () => true,
            gefe: role => ['supervisor', 'tecnico'].includes(role),
            jefe: role => ['supervisor', 'tecnico'].includes(role),
            supervisor: role => role === 'tecnico'
        };

        if (!alreadyDeleted && (!canDelete[requesterRole] || !canDelete[requesterRole](targetRole))) {
            throw new Error('Permisos insuficientes para eliminar la cuenta.');
        }
        if (alreadyDeleted && requesterRole !== 'desarrollador') {
            throw new Error('Solo Desarrollador puede completar la limpieza.');
        }
        if (!alreadyDeleted && targetRole === 'desarrollador' && countActiveDevelopers_(usersData.slice(1)) <= 1) {
            throw new Error('No se puede eliminar la última cuenta activa con rol Desarrollador. Asigna primero ese rol a otra cuenta.');
        }

        const targetSessionRows = [];
        const seenTokens = new Set();
        for (let i = 1; i < sessionsData.length; i++) {
            const row = sessionsData[i];
            if (normalizeUserId(row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== userId) continue;

            const token = row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1];
            if (token !== null && token !== undefined && String(token) !== '') {
                const tokenKey = String(token);
                const globalCount = sessionsData.filter(session =>
                    session[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === token
                ).length;
                if (seenTokens.has(tokenKey) || globalCount > 1) {
                    throw new Error('Token de sesión duplicado; no se modificó ninguna fila.');
                }
                seenTokens.add(tokenKey);
            }
            targetSessionRows.push(i + 1);
        }

        const pendingLoginRevocation = revokePendingLoginRequestsForUserUnderLock_(userId);
        if (pendingLoginRevocation.pending) {
            throw new Error('No se pudieron invalidar todos los intentos de login pendientes; la cuenta no fue eliminada.');
        }

        // Congelar los IDs calculados actuales antes de cambiar nombres/roles.
        // Esto conserva referencias históricas aunque alguna fórmula dependa de otros campos.
        if (usersData.length > 1) {
            const idValues = usersData.slice(1).map(row => [row[COLS_USERS.ID - 1]]);
            usersSheet.getRange(2, COLS_USERS.ID, idValues.length, 1).setValues(idValues);
        }

        // Desactivar primero: AUTH rechazará inmediatamente cualquier sesión residual.
        if (!alreadyDeleted) {
            const tombstone = '__deleted__:' + Utilities.getUuid();
            usersSheet.getRange(target.rowIndex, COLS_USERS.Nombre_Usuario, 1, 7)
                .setValues([[tombstone, '', '', '', '', '', '']]);
            alreadyDeleted = true;
        }

        try { PropertiesService.getScriptProperties().deleteProperty(roleRevocationPropertyKey_(userId)); }
        catch (markerError) { console.error('No se pudo retirar el marcador de rol de la cuenta desactivada:', markerError.message); }

        // Revocar todas las sesiones en orden descendente; un fallo es reintentable.
        for (let i = targetSessionRows.length - 1; i >= 0; i--) {
            try {
                sessionsSheet.deleteRow(targetSessionRows[i]);
                closedSessions++;
            } catch (error) {
                deletionError = error;
                break;
            }
        }
        SpreadsheetApp.flush();
        // Confirmar la limpieza por identidad; una fila residual mantiene la operación reintentable.
        try {
            const remainingSessions = sessionsSheet.getDataRange().getValues().slice(1).filter(row =>
                normalizeUserId(row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) === userId
            );
            if (remainingSessions.length) {
                deletionError = deletionError || new Error('Quedaron filas de sesión asociadas a la cuenta desactivada.');
            }
        } catch (verificationError) {
            deletionError = deletionError || verificationError;
        }
    } finally {
        if (lockAcquired) lock.releaseLock();
    }

    if (deletionError) {
        logToSheet('ERROR', 'Partial account deletion in AUTH; account remains disabled.', {
            requesterUserId, targetUserId: userId, closedSessions, error: deletionError.message
        });
        return {
            status: 'error',
            closedSessions,
            disabled: true,
            message: 'Cuenta desactivada; limpieza de sesiones incompleta y reintentable.'
        };
    }

    logToSheet('INFO', 'Account logically deleted in AUTH.', {
        requesterUserId, targetUserId: userId, closedSessions, alreadyDeleted
    });
    return {
        status: 'success',
        deleted: true,
        alreadyDeleted,
        closedSessions,
        message: 'Cuenta desactivada y sesiones revocadas.'
    };
}


function writePasswordHashAndVerifyUnderLock_(usersSheet, rowIndex, passwordHash) {
    let writeError = null;
    try {
        usersSheet.getRange(rowIndex, COLS_USERS.Password).setValue(passwordHash);
    } catch (error) {
        writeError = error;
    }
    let persisted;
    try {
        persisted = usersSheet.getRange(rowIndex, COLS_USERS.Password).getValue();
    } catch (readError) {
        throw new Error('Las sesiones fueron invalidadas, pero no se pudo verificar el resultado de la escritura de contraseña. Inicia sesión con la contraseña nueva; si no funciona, utiliza la anterior y vuelve a intentarlo.');
    }
    if (persisted !== passwordHash) {
        throw new Error('Las sesiones fueron invalidadas, pero la contraseña nueva no quedó confirmada. La contraseña anterior debe seguir vigente; inicia sesión nuevamente y reintenta.');
    }
    return { writeError };
}

function clearUserSessionPointerUnderLock_(usersSheet, rowIndex) {
    let cleanupError = null;
    const range = usersSheet.getRange(rowIndex, COLS_USERS.SessionToken);
    try { range.clearContent(); } catch (error) { cleanupError = error; }
    try {
        if (range.getValue()) return { pending: true, error: cleanupError || new Error('Users.SessionToken conserva un valor.') };
    } catch (error) {
        return { pending: true, error: cleanupError || error };
    }
    return { pending: false, error: cleanupError };
}

function handleChangePassword(payload) {
    const userId = normalizeUserId(payload && payload.userId);
    const currentPassword = payload && payload.currentPassword;
    const newPassword = payload && payload.newPassword;
    const token = payload && payload.sessionToken;
    if (!userId || !currentPassword || !newPassword || typeof token !== 'string' || !token) {
        throw new Error('Datos insuficientes para cambiar la contraseña.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let revokedSessions = 0;
    let cleanupPending = false;
    let cleanupError = null;
    try {
        lock.waitLock(10000);
        acquired = true;
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        ensureActiveSessionsActivityColumn_(sessionsSheet);

        const requester = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
        if (requester.length !== 1 || normalizeUserId(requester[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== userId) {
            throw new Error('Acceso no autorizado: sesión inválida o identidad no coincidente.');
        }
        const expiry = getSessionExpirationStatus_(requester[0].row, new Date());
        if (expiry.expired) throw new Error('La sesión expiró por ' + expiry.reason + '.');

        const matches = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (matches.length !== 1 || !isActiveAuthUserRecord(matches[0].row)) {
            throw new Error('No se pudo identificar una cuenta activa y única.');
        }
        if (hasPendingRoleRevocation_(userId)) {
            const pending = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, userId);
            throw new Error(pending.pending
                ? 'La revocación de sesiones por cambio de rol sigue pendiente. Intenta nuevamente más tarde.'
                : 'Tu rol cambió y todas tus sesiones fueron cerradas. Inicia sesión nuevamente antes de cambiar la contraseña.');
        }
        if (!verifyStoredPassword(matches[0].row[COLS_USERS.Password - 1], currentPassword).matches) {
            throw new Error('La contraseña actual es incorrecta.');
        }

        const newHash = createPasswordHash(newPassword);
        const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, userId);
        revokedSessions = revocation.revokedSessions;
        if (revocation.pendingRows.length || revocation.pendingLoginRequests) {
            throw new Error('No se pudo confirmar la revocación de todas las sesiones y solicitudes de login. No se cambió la contraseña; reintenta con la contraseña actual.');
        }
        writePasswordHashAndVerifyUnderLock_(usersSheet, matches[0].rowIndex, newHash);
        const pointer = clearUserSessionPointerUnderLock_(usersSheet, matches[0].rowIndex);
        cleanupPending = pointer.pending;
        cleanupError = pointer.error;

        const deletion = deleteRevokedSessionRowsUnderLock_(sessionsSheet, revocation.rows);
        cleanupPending = cleanupPending || deletion.cleanupPending;
        cleanupError = cleanupError || deletion.cleanupError;
        if (!cleanupPending && hasPendingRoleRevocation_(userId)) {
            PropertiesService.getScriptProperties().deleteProperty(roleRevocationPropertyKey_(userId));
        }
        SpreadsheetApp.flush();
    } finally {
        if (acquired) lock.releaseLock();
    }

    logToSheet(cleanupPending ? 'ERROR' : 'INFO', 'Own password changed; all session tokens were invalidated.', {
        userId, revokedSessions, cleanupPending, cleanupError: cleanupError ? cleanupError.message : ''
    });
    return {
        status: 'success',
        revokedSessions,
        cleanupPending,
        message: cleanupPending
            ? 'Contraseña actualizada y sesiones invalidadas. La limpieza de algunas referencias o filas quedó pendiente.'
            : 'Contraseña actualizada. Todas las sesiones fueron cerradas; inicia sesión nuevamente.'
    };
}

function handleResetUserPassword(payload) {
    const targetId = normalizeUserId(payload && payload.targetUserId);
    const newPassword = payload && payload.newPassword;
    const token = payload && payload.sessionToken;
    if (!targetId || !newPassword || typeof token !== 'string' || !token) {
        throw new Error('Datos insuficientes para restablecer la contraseña.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let requesterId = '';
    let revokedSessions = 0;
    let cleanupPending = false;
    let cleanupError = null;
    try {
        lock.waitLock(10000);
        acquired = true;
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        ensureActiveSessionsActivityColumn_(sessionsSheet);

        const requester = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
        if (requester.length !== 1) throw new Error('Sesión solicitante inválida o duplicada.');
        const expiry = getSessionExpirationStatus_(requester[0].row, new Date());
        if (expiry.expired) throw new Error('La sesión del solicitante expiró por ' + expiry.reason + '.');
        requesterId = normalizeUserId(requester[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, requesterId);
        if (requesterId === targetId) throw new Error('Para cambiar tu propia contraseña utiliza la opción Cambiar contraseña del perfil.');

        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const actor = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === requesterId);
        const target = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === targetId);
        if (actor.length !== 1 || !isActiveAuthUserRecord(actor[0].row) ||
            normalizeRoleName(actor[0].row[COLS_USERS.Privilegios - 1]) !== 'desarrollador') {
            throw new Error('Acceso denegado: solo una cuenta Desarrollador activa puede restablecer contraseñas.');
        }
        if (target.length !== 1 || !isActiveAuthUserRecord(target[0].row)) {
            throw new Error('La cuenta destino no existe, está desactivada o su ID no es único.');
        }
        if (hasPendingRoleRevocation_(targetId)) {
            const pending = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, targetId);
            if (pending.pending) throw new Error('La revocación de sesiones por cambio de rol sigue pendiente; reintenta el restablecimiento.');
        }

        const newHash = createPasswordHash(newPassword);
        const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, targetId);
        revokedSessions = revocation.revokedSessions;
        if (revocation.pendingRows.length || revocation.pendingLoginRequests) {
            throw new Error('No se pudo confirmar la revocación de todas las sesiones y solicitudes de login destino. No se cambió la contraseña; reintenta el restablecimiento.');
        }
        writePasswordHashAndVerifyUnderLock_(usersSheet, target[0].rowIndex, newHash);
        const pointer = clearUserSessionPointerUnderLock_(usersSheet, target[0].rowIndex);
        cleanupPending = pointer.pending;
        cleanupError = pointer.error;

        const deletion = deleteRevokedSessionRowsUnderLock_(sessionsSheet, revocation.rows);
        cleanupPending = cleanupPending || deletion.cleanupPending;
        cleanupError = cleanupError || deletion.cleanupError;
        if (!cleanupPending && hasPendingRoleRevocation_(targetId)) {
            PropertiesService.getScriptProperties().deleteProperty(roleRevocationPropertyKey_(targetId));
        }
        SpreadsheetApp.flush();
    } finally {
        if (acquired) lock.releaseLock();
    }

    logToSheet(cleanupPending ? 'ERROR' : 'INFO', 'Developer reset a user password; all target session tokens were invalidated.', {
        requesterId, targetId, revokedSessions, cleanupPending, cleanupError: cleanupError ? cleanupError.message : ''
    });
    return {
        status: 'success',
        revokedSessions,
        cleanupPending,
        message: cleanupPending
            ? 'Contraseña restablecida y sesiones invalidadas. La limpieza de algunas referencias o filas quedó pendiente.'
            : 'Contraseña restablecida. Se cerraron todas las sesiones de la cuenta.'
    };
}


function handleAcceptTerms(payload) {
    const sessionToken = payload && payload.sessionToken;
    const requestedVersion = String(payload && payload.version || '').trim();
    if (typeof sessionToken !== 'string' || !sessionToken) throw new Error('Se requiere una sesión válida para aceptar los términos.');
    if (requestedVersion !== TERMS_CURRENT_VERSION) throw new Error('La versión de términos enviada no coincide con la versión vigente. Actualiza la página e intenta nuevamente.');
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        lock.waitLock(10000); acquired = true;
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        const sessionMatches = findSessionRowsByTokenUnderLock_(sessionsSheet, sessionToken);
        if (sessionMatches.length !== 1) throw new Error(sessionMatches.length > 1
            ? 'El token de sesión está duplicado; no se registró la aceptación.'
            : 'La sesión no es válida o expiró. Inicia sesión nuevamente.');
        const session = sessionMatches[0];
        const userId = normalizeUserId(session.row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!userId) throw new Error('No se pudo identificar al usuario de la sesión.');
        if (payload && payload.userId !== undefined && normalizeUserId(payload.userId) !== userId) {
            throw new Error('La identidad enviada no corresponde a la sesión activa.');
        }
        const expiration = getSessionExpirationStatus_(session.row, new Date());
        if (expiration.expired) throw new Error('La sesión expiró por ' + expiration.reason + '.');
        const userMatches = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (userMatches.length !== 1 || !isActiveAuthUserRecord(userMatches[0].row)) {
            throw new Error('No se pudo identificar una cuenta activa y única.');
        }
        assertRequesterRoleRevocationClear_(usersSheet, sessionsSheet, userId);
        ensureTermsAcceptanceColumn_(usersSheet);
        ensureSessionTermsAcceptanceColumn_(sessionsSheet);
        const sessionCell = sessionsSheet.getRange(session.rowIndex, COLS_ACTIVE_SESSIONS.SessionTermsAcceptance);
        const sessionCurrent = parseTermsAcceptance_(sessionCell.getValue());
        if (sessionCurrent.status === 'accepted' && sessionCurrent.version === TERMS_CURRENT_VERSION) {
            return { status: 'success', accepted: true, alreadyAccepted: true, termsAcceptance: sessionCurrent };
        }
        const acceptance = { version: TERMS_CURRENT_VERSION, acceptedAt: new Date().toISOString(), status: 'accepted' };
        const serialized = JSON.stringify(acceptance);
        sessionCell.setValue(serialized);
        const userCell = usersSheet.getRange(userMatches[0].rowIndex, COLS_USERS.TermsAcceptance);
        userCell.setValue(serialized);
        SpreadsheetApp.flush();
        if (String(sessionCell.getValue() || '') !== serialized) throw new Error('No se pudo confirmar el registro de aceptación. El catálogo permanece bloqueado.');
        return { status: 'success', accepted: true, alreadyAccepted: false, termsAcceptance: parseTermsAcceptance_(sessionCell.getValue()) };
    } finally { if (acquired) lock.releaseLock(); }
}

function handleLogout(payload) {
    const requestedUserId = normalizeUserId(payload && payload.userId);
    const sessionToken = payload && payload.sessionToken;
    if (!requestedUserId || typeof sessionToken !== 'string' || !sessionToken) {
        throw new Error('userId y sessionToken son requeridos para cerrar la sesión.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let revoked = false;
    let alreadyRevoked = false;
    let userSessionTokenMatched = false;
    let userSessionTokenCleared = false;
    let cleanupPending = false;
    let cleanupError = null;
    try {
        lock.waitLock(10000);
        acquired = true;
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');

        const matchingSessions = findSessionRowsByTokenUnderLock_(sessionsSheet, sessionToken);
        if (matchingSessions.length > 1) throw new Error('El token aparece en varias sesiones; no se modificó ninguna fila.');
        const usersData = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));

        if (matchingSessions.length === 1) {
            const session = matchingSessions[0];
            const sessionUserId = normalizeUserId(session.row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
            if (!sessionUserId || sessionUserId !== requestedUserId) {
                throw new Error('La identidad no corresponde al token de sesión; no se modificó ningún registro.');
            }

            const matchingUsers = usersData.filter(item =>
                normalizeUserId(item.row[COLS_USERS.ID - 1]) === requestedUserId);
            if (matchingUsers.length > 1) {
                throw new Error('El ID de usuario está duplicado; no se modificó ningún registro.');
            }

            const requestRevocation = revokeLoginRequestForTokenUnderLock_(sessionToken, requestedUserId);
            if (requestRevocation.pending) {
                throw new Error('No se pudo confirmar la invalidación del intento de login asociado. Reintenta el cierre.');
            }

            let clearError = null;
            try { sessionsSheet.getRange(session.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent(); }
            catch (error) { clearError = error; }
            const persistedToken = sessionsSheet.getRange(session.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).getValue();
            if (persistedToken) throw new Error('No se pudo confirmar la revocación de la sesión. Reintenta el cierre.');
            revoked = true;

            if (matchingUsers.length === 1 &&
                matchingUsers[0].row[COLS_USERS.SessionToken - 1] === sessionToken) {
                userSessionTokenMatched = true;
                const pointer = usersSheet.getRange(matchingUsers[0].rowIndex, COLS_USERS.SessionToken);
                try { pointer.clearContent(); } catch (error) { cleanupError = error; }
                try {
                    userSessionTokenCleared = !pointer.getValue();
                    if (!userSessionTokenCleared) cleanupPending = true;
                } catch (error) { cleanupPending = true; cleanupError = cleanupError || error; }
            }
            try { sessionsSheet.deleteRow(session.rowIndex); }
            catch (error) { cleanupPending = true; cleanupError = cleanupError || error; }
            if (clearError && !cleanupError) cleanupError = clearError;
        } else {
            const staleUserMatches = usersData.filter(item =>
                item.row[COLS_USERS.SessionToken - 1] === sessionToken);
            if (staleUserMatches.length > 1) {
                throw new Error('El token aparece en varias cuentas; no se modificó ninguna fila.');
            }
            if (staleUserMatches.length === 1) {
                const staleUserId = normalizeUserId(staleUserMatches[0].row[COLS_USERS.ID - 1]);
                if (staleUserId !== requestedUserId) {
                    throw new Error('La identidad no corresponde al token de sesión; no se modificó ningún registro.');
                }
                const matchingUsers = usersData.filter(item =>
                    normalizeUserId(item.row[COLS_USERS.ID - 1]) === requestedUserId);
                if (matchingUsers.length !== 1) {
                    throw new Error('El ID de usuario está duplicado o no es único; no se modificó ningún registro.');
                }
            }

            const requestRevocation = revokeLoginRequestForTokenUnderLock_(sessionToken, requestedUserId);
            if (requestRevocation.pending) {
                throw new Error('No se pudo confirmar la invalidación del intento de login asociado. Reintenta el cierre.');
            }
            alreadyRevoked = true;

            if (staleUserMatches.length === 1) {
                userSessionTokenMatched = true;
                const pointer = usersSheet.getRange(staleUserMatches[0].rowIndex, COLS_USERS.SessionToken);
                try { pointer.clearContent(); } catch (error) { cleanupError = error; }
                try {
                    userSessionTokenCleared = !pointer.getValue();
                    if (!userSessionTokenCleared) cleanupPending = true;
                } catch (error) { cleanupPending = true; cleanupError = cleanupError || error; }
            }
        }
        SpreadsheetApp.flush();
    } finally {
        if (acquired) lock.releaseLock();
    }

    logToSheet(cleanupPending ? 'ERROR' : 'INFO',
        revoked ? 'Session token revoked through logout.' : 'Logout requested for an already revoked session.',
        { userId: requestedUserId, userSessionTokenCleared, cleanupPending, cleanupError: cleanupError ? cleanupError.message : '' });
    return {
        status: 'success',
        revoked,
        alreadyRevoked,
        userSessionTokenMatched,
        userSessionTokenCleared,
        cleanupPending
    };
}
