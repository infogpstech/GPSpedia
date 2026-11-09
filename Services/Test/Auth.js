// ============================================================================
// GPSPEDIA-AUTH SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.2.5

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k"; // COPIA AISLADA DE PRUEBAS; NO USAR EN PRODUCCIÓN
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
    SessionToken: 8
};

const COLS_ACTIVE_SESSIONS = {
    ID_Usuario: 1,
    Usuario: 2,
    ActiveSessions: 3,
    date: 4,
    Logs: 5,
    LastActivityAt: 6
};

const SESSION_LIMITS = {
    'desarrollador': Infinity,
    'gefe': 10,
    'jefe': 3, // Alias de compatibilidad con USERS
    'supervisor': 3,
    'tecnico': 2,
    'tecnico_exterior': 1
};

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
        const serviceState = {
            service: 'GPSpedia-Auth',
            version: '2.2.5', // Mantener sincronizado con la versión del componente
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    // Comportamiento por defecto si no está en modo de depuración
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Auth-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    let response;
    try {
        logToSheet('INFO', 'doPost received a request.');
        const request = JSON.parse(e.postData.contents);
        logToSheet('DEBUG', `Request parsed. Action: ${request.action}`);

        switch (request.action) {
            case 'login':
                response = handleLogin(request.payload);
                break;
            case 'validateSession':
                response = handleValidateSession(request.payload);
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
function handleLogin(payload) {
    let normalizedUsername = '';
    let attemptId = null;
    let attemptReserved = false;
    let invalidCredentials = false;
    try {
        const { username, password } = payload || {};
        logToSheet('INFO', 'handleLogin started.');

        normalizedUsername = String(username || '').trim();
        const normalizedPassword = normalizePassword(password);
        if (!normalizedUsername || !normalizedPassword) throw new Error("Usuario y contraseña son requeridos.");

        attemptId = beginLoginAttempt(normalizedUsername);
        attemptReserved = true;

        const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
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

        // Serialize session and legacy-password mutations within the AUTH project.
        // The ScriptLock is also used by login-attempt and log operations; do not call logToSheet() while held.
        const sessionLock = LockService.getScriptLock();
        let sessionLockAcquired = false;
        let oldestSession = null;
        let sessionCount = 0;
        let sessionToken = '';
        let sessionCreatedAt = '';
        let sessionOperationError = null;
        let sessionDeleteFailed = false;

        try {
            sessionLock.waitLock(10000);
            sessionLockAcquired = true;

            // Revalidar la cuenta dentro del mismo lock que serializa login y eliminación.
            const currentUserRows = userSheet.getDataRange().getValues().slice(1)
                .map((row, index) => ({ row, rowIndex: index + 2 }))
                .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === normalizeUserId(userId));
            if (currentUserRows.length !== 1 || !isActiveAuthUserRecord(currentUserRows[0].row)) {
                throw new Error('La cuenta fue desactivada o su ID dejó de ser único; no se creará una sesión.');
            }

            // Revalidar la contraseña dentro del mismo lock que changePassword/resetUserPassword.
            // Una migración legacy atrasada nunca debe sobrescribir un hash más reciente.
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
            const currentUserRole = (foundUserRow[COLS_USERS.Privilegios - 1] || '').toString().toLowerCase().trim();
            sessionLimit = SESSION_LIMITS[currentUserRole] ?? 1;
            foundUserIndex = currentUserRows[0].rowIndex - 2;

            const activeSessionsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
            if (!activeSessionsSheet) throw new Error("Hoja ActiveSessions no encontrada.");
            ensureActiveSessionsActivityColumn_(activeSessionsSheet);

            const sessionsData = activeSessionsSheet.getDataRange().getValues();
            sessionsData.shift(); // Remove header

            const userSessionRows = sessionsData
                .map((row, index) => ({
                    userId: row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1],
                    rowIndex: index + 2
                }))
                .filter(session => String(session.userId).trim() == String(userId).trim());

            sessionCount = userSessionRows.length;

            if (sessionCount >= sessionLimit) {
                userSessionRows.sort((left, right) => left.rowIndex - right.rowIndex);
                oldestSession = userSessionRows[0];

                try {
                    activeSessionsSheet.deleteRow(oldestSession.rowIndex);
                } catch (deleteError) {
                    sessionDeleteFailed = true;
                    throw deleteError;
                }
            }

            sessionToken = Utilities.getUuid();
            userSheet.getRange(foundUserIndex + 2, COLS_USERS.SessionToken).setValue(sessionToken);

            const newSessionRow = [];
            newSessionRow[COLS_ACTIVE_SESSIONS.ID_Usuario - 1] = userId;
            newSessionRow[COLS_ACTIVE_SESSIONS.Usuario - 1] = username;
            newSessionRow[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] = sessionToken;
            sessionCreatedAt = new Date().toISOString();
            newSessionRow[COLS_ACTIVE_SESSIONS.date - 1] = sessionCreatedAt;
            newSessionRow[COLS_ACTIVE_SESSIONS.Logs - 1] = '';
            newSessionRow[COLS_ACTIVE_SESSIONS.LastActivityAt - 1] = sessionCreatedAt;
            activeSessionsSheet.appendRow(newSessionRow);
        } catch (sessionError) {
            sessionOperationError = sessionError;
        } finally {
            if (sessionLockAcquired) sessionLock.releaseLock();
        }

        // Logging happens after release so logToSheet() can acquire the same ScriptLock.
        if (sessionOperationError) {
            if (sessionDeleteFailed && oldestSession) {
                logToSheet('ERROR', `Failed to delete oldest session at row ${oldestSession.rowIndex}`, { error: sessionOperationError.message });
                throw new Error('No fue posible cerrar la sesión más antigua. No se creará una sesión nueva.');
            }
            logToSheet('ERROR', 'Failed to manage active sessions.', { error: sessionOperationError.message });
            throw sessionOperationError;
        }

        logToSheet('DEBUG', `Found ${sessionCount} sessions for user ${userId}. Limit is ${sessionLimit}.`);
        if (oldestSession) {
            logToSheet('INFO', 'Session limit reached. Removed the oldest session.', { oldestSession });
        }

        const user = {
            ID: userId,
            Nombre_Usuario: foundUserRow[COLS_USERS.Nombre_Usuario - 1],
            Nombre_Completo: foundUserRow[COLS_USERS.Nombre_Completo - 1], // <-- FIX: Add missing field
            Privilegios: foundUserRow[COLS_USERS.Privilegios - 1],
            Telefono: foundUserRow[COLS_USERS.Telefono - 1],
            Correo_Electronico: foundUserRow[COLS_USERS.Correo_Electronico - 1],
            SessionToken: sessionToken,
            SessionCreatedAt: sessionCreatedAt,
            SessionLastActivityAt: sessionCreatedAt
        };

        return { status: 'success', user: user };

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

function handleValidateSession(payload) {
    try {
        const { userId, sessionToken } = payload || {};
        if (!userId || !sessionToken) return { valid: false };
        return validateAndTouchSession_(sessionToken, userId);
    } catch (error) {
        logToSheet('ERROR', `Error in handleValidateSession: ${error.message}`, { stack: error.stack });
        return { valid: false, error: error.message };
    }
}
function handleTouchSession(payload) {
    try { const token=payload&&payload.sessionToken; if(typeof token!=='string'||!token)return{valid:false}; return validateAndTouchSession_(token); }
    catch(error){logToSheet('ERROR',`Error in handleTouchSession: ${error.message}`,{stack:error.stack});return{valid:false,error:error.message};}
}

// Todas las mutaciones de ActiveSessions y las eliminaciones de cuenta se coordinan en AUTH.
function isActiveAuthUserRecord(row) {
    if (!row) return false;
    const username = String(row[COLS_USERS.Nombre_Usuario - 1] || '').trim();
    const role = normalizeRoleName(row[COLS_USERS.Privilegios - 1]);
    return Boolean(username) && !username.startsWith('__deleted__:') &&
        ['desarrollador', 'gefe', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
}
function normalizeRoleName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function normalizeUserId(value) {
    return String(value === null || value === undefined ? '' : value).trim();
}

const SESSION_ABSOLUTE_MONTHS=3, SESSION_IDLE_MONTHS=1;
function parseSessionDate_(v){if(v===null||v===undefined||String(v).trim()==='')return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;}
function addCalendarMonthsUTC_(date,months){const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
function getSessionExpirationStatus_(row,now=new Date()){if(!row)return{expired:true,reason:'missing_session'};const created=parseSessionDate_(row[COLS_ACTIVE_SESSIONS.date-1]),raw=row[COLS_ACTIVE_SESSIONS.LastActivityAt-1],activity=raw===null||raw===undefined||String(raw).trim()===''?created:parseSessionDate_(raw);if(!created||!activity)return{expired:true,reason:'invalid_timestamp'};if(now.getTime()>=addCalendarMonthsUTC_(created,SESSION_ABSOLUTE_MONTHS).getTime())return{expired:true,reason:'absolute_expiration'};if(now.getTime()>=addCalendarMonthsUTC_(activity,SESSION_IDLE_MONTHS).getTime())return{expired:true,reason:'inactivity_expiration'};return{expired:false,createdAt:created,lastActivityAt:activity};}
function ensureActiveSessionsActivityColumn_(sheet){const col=COLS_ACTIVE_SESSIONS.LastActivityAt;if(sheet.getMaxColumns()<col)sheet.insertColumnsAfter(sheet.getMaxColumns(),col-sheet.getMaxColumns());const header=String(sheet.getRange(1,col).getValue()||'').trim();if(header==='lastActivityAt')return col;if(header!=='')throw new Error('La columna F de ActiveSessions está ocupada por otro encabezado; no se modificó el esquema.');const last=sheet.getLastRow();if(last>1&&sheet.getRange(2,col,last-1,1).getValues().some(r=>r[0]!==null&&r[0]!==undefined&&String(r[0]).trim()!==''))throw new Error('La columna F de ActiveSessions contiene datos sin encabezado; no se modificó el esquema.');sheet.getRange(1,col).setValue('lastActivityAt');SpreadsheetApp.flush();return col;}
function validateAndTouchSession_(token,expectedUserId=null){const lock=LockService.getScriptLock();let acquired=false;try{lock.waitLock(10000);acquired=true;const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS),uh=ss.getSheetByName(SHEET_NAMES.USERS);if(!sh||!uh)return{valid:false,reason:'missing_sheet'};ensureActiveSessionsActivityColumn_(sh);const data=sh.getDataRange().getValues(),matches=[];for(let i=1;i<data.length;i++)if(data[i][COLS_ACTIVE_SESSIONS.ActiveSessions-1]===token)matches.push({rowIndex:i+1,row:data[i]});if(matches.length!==1)return{valid:false,reason:matches.length>1?'duplicate_token':'missing_session'};const session=matches[0],userId=normalizeUserId(session.row[COLS_ACTIVE_SESSIONS.ID_Usuario-1]);if(!userId||(expectedUserId!==null&&userId!==normalizeUserId(expectedUserId)))return{valid:false,reason:'identity_mismatch'};const userRows=uh.getDataRange().getValues().slice(1).filter(r=>normalizeUserId(r[COLS_USERS.ID-1])===userId);if(userRows.length!==1||!isActiveAuthUserRecord(userRows[0]))return{valid:false,reason:'inactive_or_ambiguous_user'};const expiry=getSessionExpirationStatus_(session.row,new Date());if(expiry.expired){try{sh.deleteRow(session.rowIndex);}catch(e){console.error('No se pudo retirar la fila expirada:',e.message);}if(userRows[0][COLS_USERS.SessionToken-1]===token){try{const current=uh.getDataRange().getValues().slice(1).map((r,i)=>({r,rowIndex:i+2})).filter(x=>normalizeUserId(x.r[COLS_USERS.ID-1])===userId);if(current.length===1)uh.getRange(current[0].rowIndex,COLS_USERS.SessionToken).clearContent();}catch(e){console.error('No se pudo limpiar Users.SessionToken:',e.message);}}SpreadsheetApp.flush();return{valid:false,reason:expiry.reason};}const lastActivityAt=new Date().toISOString();sh.getRange(session.rowIndex,COLS_ACTIVE_SESSIONS.LastActivityAt).setValue(lastActivityAt);SpreadsheetApp.flush();return{valid:true,userId,createdAt:expiry.createdAt.toISOString(),lastActivityAt};}finally{if(acquired)lock.releaseLock();}}
function revokeAllUserSessionsUnderLock_(sheet,userId){const data=sheet.getDataRange().getValues(),counts=new Map(),rows=[];data.slice(1).forEach(r=>{const t=String(r[COLS_ACTIVE_SESSIONS.ActiveSessions-1]||'');if(t)counts.set(t,(counts.get(t)||0)+1);});for(let i=1;i<data.length;i++){if(normalizeUserId(data[i][COLS_ACTIVE_SESSIONS.ID_Usuario-1])!==normalizeUserId(userId))continue;const t=String(data[i][COLS_ACTIVE_SESSIONS.ActiveSessions-1]||'');if(t&&counts.get(t)>1)throw new Error('La cuenta tiene un token duplicado; no se modificaron contraseña ni sesiones.');rows.push({rowIndex:i+1,token:t});}rows.forEach(x=>{if(x.token)sheet.getRange(x.rowIndex,COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent();});SpreadsheetApp.flush();return{rows,revokedSessions:rows.filter(x=>x.token).length};}

function handleResetUserSessions(payload) {
    const targetUserId = payload && payload.targetUserId;
    const sessionToken = payload && payload.sessionToken;
    const normalizeId = value => String(value === null || value === undefined ? '' : value).trim();

    if (normalizeId(targetUserId) === '' || typeof sessionToken !== 'string' || sessionToken.length === 0) {
        throw new Error('Datos insuficientes para cerrar las sesiones del usuario.');
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let requesterUserId = null;
    let closedSessions = 0;
    let targetUsername = '';
    let cleanupError = null;
    let deletionError = null;
    let userSessionTokenCleared = false;

    try {
        lock.waitLock(10000);
        lockAcquired = true;

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) {
            throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        }

        const sessionsData = sessionsSheet.getDataRange().getValues();
        const requesterMatches = [];
        for (let i = 1; i < sessionsData.length; i++) {
            if (sessionsData[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken) {
                requesterMatches.push(sessionsData[i]);
            }
        }
        if (requesterMatches.length !== 1) {
            throw new Error(requesterMatches.length > 1
                ? 'El token del solicitante aparece duplicado; no se modificó ninguna sesión.'
                : 'Acceso no autorizado: sesión inválida o expirada.');
        }

        const requesterExpiration=getSessionExpirationStatus_(requesterMatches[0],new Date());
        if(requesterExpiration.expired)throw new Error('La sesión del Desarrollador expiró por '+requesterExpiration.reason+'.');
        requesterUserId = normalizeId(requesterMatches[0][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]);
        if (!requesterUserId) {
            throw new Error('Acceso no autorizado: identidad de sesión inválida.');
        }

        const usersData = usersSheet.getDataRange().getValues();
        const requesterRows = [];
        const targetRows = [];
        for (let i = 1; i < usersData.length; i++) {
            const rowUserId = normalizeId(usersData[i][COLS_USERS.ID - 1]);
            if (rowUserId === requesterUserId) requesterRows.push(usersData[i]);
            if (rowUserId === normalizeId(targetUserId)) {
                targetRows.push({ rowIndex: i + 1, row: usersData[i] });
            }
        }
        if (requesterRows.length !== 1 || !isActiveAuthUserRecord(requesterRows[0])) {
            throw new Error('No se pudo identificar de forma única una cuenta solicitante activa.');
        }

        const requesterRole = String(requesterRows[0][COLS_USERS.Privilegios - 1] || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        if (requesterRole !== 'desarrollador') {
            throw new Error('Acceso denegado. Esta operación está reservada al rol Desarrollador.');
        }
        if (requesterUserId === normalizeId(targetUserId)) {
            throw new Error('No puedes cerrar remotamente tu propia sesión desde esta operación.');
        }
        if (targetRows.length !== 1) {
            throw new Error(targetRows.length > 1
                ? 'El ID del usuario seleccionado está duplicado.'
                : 'El usuario seleccionado no existe.');
        }

        if (!isActiveAuthUserRecord(targetRows[0].row)) {
            throw new Error('No se pueden cerrar sesiones de una cuenta desactivada.');
        }

        targetUsername = String(targetRows[0].row[COLS_USERS.Nombre_Usuario - 1] || '');
        const targetSessions = [];
        for (let i = 1; i < sessionsData.length; i++) {
            if (normalizeId(sessionsData[i][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) === normalizeId(targetUserId)) {
                const token = sessionsData[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1];
                if (token !== null && token !== undefined && String(token) !== '') {
                    const duplicateCount = sessionsData.filter(row =>
                        row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === token
                    ).length;
                    if (duplicateCount > 1) {
                        throw new Error('Una sesión del usuario seleccionado tiene un token duplicado; no se modificó ninguna fila.');
                    }
                }
                targetSessions.push(i + 1);
            }
        }

        // Invalidar primero todos los tokens; si falla la limpieza de filas, ninguna sesión seguirá autorizada.
        let invalidatedSessions = 0;
        for (let i = 0; i < targetSessions.length; i++) {
            const rowIndex = targetSessions[i];
            const token = sessionsData[rowIndex - 1][COLS_ACTIVE_SESSIONS.ActiveSessions - 1];
            if (token !== null && token !== undefined && String(token) !== '') {
                sessionsSheet.getRange(rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent();
                invalidatedSessions++;
            }
        }
        SpreadsheetApp.flush();

        for (let i = targetSessions.length - 1; i >= 0; i--) {
            try {
                sessionsSheet.deleteRow(targetSessions[i]);
                closedSessions++;
            } catch (error) {
                deletionError = error;
                break;
            }
        }
        try {
            usersSheet.getRange(targetRows[0].rowIndex, COLS_USERS.SessionToken).clearContent();
            userSessionTokenCleared = true;
        } catch (error) {
            cleanupError = error;
        }
        SpreadsheetApp.flush();
    } finally {
        if (lockAcquired) lock.releaseLock();
    }

    if (deletionError) {
        logToSheet('ERROR', 'Session tokens invalidated; row cleanup is pending in AUTH.', {
            requesterUserId,
            targetUserId: normalizeId(targetUserId),
            invalidatedSessions,
            closedSessions,
            userSessionTokenCleared,
            error: deletionError.message,
            cleanupError: cleanupError ? cleanupError.message : ''
        });
        return {
            status: 'error',
            closedSessions,
            invalidatedSessions,
            cleanupPending: true,
            message: `Se invalidaron ${invalidatedSessions} sesión(es) de ${targetUsername}; la limpieza de algunas filas quedó pendiente. Vuelve a intentarlo para completar la limpieza.`
        };
    }

    if (cleanupError) {
        logToSheet('ERROR', 'Sessions revoked but Users.SessionToken cleanup failed.', {
            requesterUserId,
            targetUserId: normalizeId(targetUserId),
            closedSessions,
            error: cleanupError.message
        });
    } else {
        logToSheet('INFO', 'User sessions reset through AUTH.', {
            requesterUserId,
            targetUserId: normalizeId(targetUserId),
            closedSessions,
            invalidatedSessions,
            userSessionTokenCleared,
            cleanupPending: Boolean(cleanupError)
        });
    }

    const message = invalidatedSessions > 0
        ? `Se invalidaron ${invalidatedSessions} sesión(es) activa(s) de ${targetUsername}.`
        : 'El usuario no tenía sesiones activas.';
    return {
        status: 'success',
        closedSessions,
        invalidatedSessions,
        userSessionTokenCleared,
        cleanupPending: Boolean(cleanupError),
        message: cleanupError
            ? message + ' No se pudo limpiar la referencia del token; requiere revisión.'
            : message + (userSessionTokenCleared ? '' : ' No había una referencia de token que limpiar.')
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


function handleChangePassword(payload) {
 const userId=normalizeUserId(payload&&payload.userId),currentPassword=payload&&payload.currentPassword,newPassword=payload&&payload.newPassword,token=payload&&payload.sessionToken;
 if(!userId||!currentPassword||!newPassword||typeof token!=='string'||!token)throw new Error('Datos insuficientes para cambiar la contraseña.');
 const lock=LockService.getScriptLock();let acquired=false,revokedSessions=0,cleanupPending=false,cleanupError=null;
 try{lock.waitLock(10000);acquired=true;const ss=SpreadsheetApp.openById(SPREADSHEET_ID),users=ss.getSheetByName(SHEET_NAMES.USERS),sessions=ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);if(!users||!sessions)throw new Error('No se encontraron las hojas Users y ActiveSessions.');ensureActiveSessionsActivityColumn_(sessions);
 const data=sessions.getDataRange().getValues(),requester=data.slice(1).filter(r=>r[COLS_ACTIVE_SESSIONS.ActiveSessions-1]===token);if(requester.length!==1||normalizeUserId(requester[0][COLS_ACTIVE_SESSIONS.ID_Usuario-1])!==userId)throw new Error('Acceso no autorizado: sesión inválida o identidad no coincidente.');
 const expiry=getSessionExpirationStatus_(requester[0],new Date());if(expiry.expired)throw new Error('La sesión expiró por '+expiry.reason+'.');
 const matches=users.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(x=>normalizeUserId(x.row[COLS_USERS.ID-1])===userId);if(matches.length!==1||!isActiveAuthUserRecord(matches[0].row))throw new Error('No se pudo identificar una cuenta activa y única.');
 if(!verifyStoredPassword(matches[0].row[COLS_USERS.Password-1],currentPassword).matches)throw new Error('La contraseña actual es incorrecta.');
 const newHash=createPasswordHash(newPassword),revocation=revokeAllUserSessionsUnderLock_(sessions,userId);revokedSessions=revocation.revokedSessions;users.getRange(matches[0].rowIndex,COLS_USERS.Password).setValue(newHash);
 try{users.getRange(matches[0].rowIndex,COLS_USERS.SessionToken).clearContent();}catch(e){cleanupPending=true;cleanupError=e;}
 for(let i=revocation.rows.length-1;i>=0;i--){try{sessions.deleteRow(revocation.rows[i].rowIndex);}catch(e){cleanupPending=true;cleanupError=e;break;}}SpreadsheetApp.flush();
 }finally{if(acquired)lock.releaseLock();}
 logToSheet(cleanupPending?'ERROR':'INFO','Own password changed; all session tokens were invalidated.',{userId,revokedSessions,cleanupPending,cleanupError:cleanupError?cleanupError.message:''});
 return{status:'success',revokedSessions,cleanupPending,message:cleanupPending?'Contraseña actualizada y sesiones invalidadas. La limpieza de algunas filas quedó pendiente.':'Contraseña actualizada. Todas las sesiones fueron cerradas; inicia sesión nuevamente.'};
}
function handleResetUserPassword(payload) {
 const targetId=normalizeUserId(payload&&payload.targetUserId),newPassword=payload&&payload.newPassword,token=payload&&payload.sessionToken;if(!targetId||!newPassword||typeof token!=='string'||!token)throw new Error('Datos insuficientes para restablecer la contraseña.');
 const lock=LockService.getScriptLock();let acquired=false,requesterId='',revokedSessions=0,cleanupPending=false,cleanupError=null;
 try{lock.waitLock(10000);acquired=true;const ss=SpreadsheetApp.openById(SPREADSHEET_ID),users=ss.getSheetByName(SHEET_NAMES.USERS),sessions=ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);if(!users||!sessions)throw new Error('No se encontraron las hojas Users y ActiveSessions.');ensureActiveSessionsActivityColumn_(sessions);
 const data=sessions.getDataRange().getValues(),requester=data.slice(1).filter(r=>r[COLS_ACTIVE_SESSIONS.ActiveSessions-1]===token);if(requester.length!==1)throw new Error('Sesión solicitante inválida o duplicada.');
 const expiry=getSessionExpirationStatus_(requester[0],new Date());if(expiry.expired)throw new Error('La sesión del solicitante expiró por '+expiry.reason+'.');requesterId=normalizeUserId(requester[0][COLS_ACTIVE_SESSIONS.ID_Usuario-1]);if(requesterId===targetId)throw new Error('Para cambiar tu propia contraseña utiliza la opción Cambiar contraseña del perfil.');
 const rows=users.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})),actor=rows.filter(x=>normalizeUserId(x.row[COLS_USERS.ID-1])===requesterId),target=rows.filter(x=>normalizeUserId(x.row[COLS_USERS.ID-1])===targetId);
 if(actor.length!==1||!isActiveAuthUserRecord(actor[0].row)||normalizeRoleName(actor[0].row[COLS_USERS.Privilegios-1])!=='desarrollador')throw new Error('Acceso denegado: solo una cuenta Desarrollador activa puede restablecer contraseñas.');
 if(target.length!==1||!isActiveAuthUserRecord(target[0].row))throw new Error('La cuenta destino no existe, está desactivada o su ID no es único.');
 const newHash=createPasswordHash(newPassword),revocation=revokeAllUserSessionsUnderLock_(sessions,targetId);revokedSessions=revocation.revokedSessions;users.getRange(target[0].rowIndex,COLS_USERS.Password).setValue(newHash);
 try{users.getRange(target[0].rowIndex,COLS_USERS.SessionToken).clearContent();}catch(e){cleanupPending=true;cleanupError=e;}
 for(let i=revocation.rows.length-1;i>=0;i--){try{sessions.deleteRow(revocation.rows[i].rowIndex);}catch(e){cleanupPending=true;cleanupError=e;break;}}SpreadsheetApp.flush();
 }finally{if(acquired)lock.releaseLock();}
 logToSheet(cleanupPending?'ERROR':'INFO','Developer reset a user password; all target session tokens were invalidated.',{requesterId,targetId,revokedSessions,cleanupPending,cleanupError:cleanupError?cleanupError.message:''});
 return{status:'success',revokedSessions,cleanupPending,message:cleanupPending?'Contraseña restablecida y sesiones invalidadas. La limpieza de algunas filas quedó pendiente.':'Contraseña restablecida. Se cerraron todas las sesiones de la cuenta.'};
}

function handleLogout(payload) {
    const sessionToken = payload && payload.sessionToken;
    if (typeof sessionToken !== 'string' || sessionToken.length === 0) {
        throw new Error('Token de sesión requerido para cerrar la sesión.');
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let userId = null;
    let revoked = false;
    let alreadyRevoked = false;
    let userSessionTokenMatched = false;
    let userSessionTokenCleared = false;
    let cleanupError = null;

    try {
        lock.waitLock(10000);
        lockAcquired = true;

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const activeSessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!activeSessionsSheet || !usersSheet) {
            throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        }

        const sessionsData = activeSessionsSheet.getDataRange().getValues();
        const matchingSessions = [];
        for (let i = 1; i < sessionsData.length; i++) {
            if (sessionsData[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken) {
                matchingSessions.push({
                    rowIndex: i + 1,
                    userId: sessionsData[i][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]
                });
            }
        }
        if (matchingSessions.length > 1) {
            throw new Error('El token aparece en varias sesiones; no se modificó ninguna fila.');
        }

        const usersData = usersSheet.getDataRange().getValues();
        if (matchingSessions.length === 1) {
            userId = matchingSessions[0].userId;
            const matchingUsers = [];
            if (userId !== null && userId !== undefined && String(userId).trim() !== '') {
                for (let i = 1; i < usersData.length; i++) {
                    if (String(usersData[i][COLS_USERS.ID - 1]) === String(userId)) {
                        matchingUsers.push({ rowIndex: i + 1, row: usersData[i] });
                    }
                }
            }
            if (matchingUsers.length > 1) {
                throw new Error('El ID de usuario asociado a la sesión está duplicado; no se modificó ninguna fila.');
            }

            activeSessionsSheet.deleteRow(matchingSessions[0].rowIndex);
            revoked = true;

            if (matchingUsers.length === 1 &&
                matchingUsers[0].row[COLS_USERS.SessionToken - 1] === sessionToken) {
                userSessionTokenMatched = true;
                try {
                    usersSheet.getRange(matchingUsers[0].rowIndex, COLS_USERS.SessionToken).setValue('');
                    userSessionTokenCleared = true;
                } catch (error) {
                    cleanupError = error;
                }
            }
        } else {
            alreadyRevoked = true;
            const staleUserMatches = [];
            for (let i = 1; i < usersData.length; i++) {
                if (usersData[i][COLS_USERS.SessionToken - 1] === sessionToken) {
                    staleUserMatches.push({ rowIndex: i + 1, row: usersData[i] });
                }
            }
            if (staleUserMatches.length > 1) {
                throw new Error('El token aparece en varias cuentas; no se modificó ninguna fila.');
            }
            if (staleUserMatches.length === 1) {
                userId = staleUserMatches[0].row[COLS_USERS.ID - 1];
                userSessionTokenMatched = true;
                try {
                    usersSheet.getRange(staleUserMatches[0].rowIndex, COLS_USERS.SessionToken).setValue('');
                    userSessionTokenCleared = true;
                } catch (error) {
                    cleanupError = error;
                }
            }
        }
        SpreadsheetApp.flush();
    } finally {
        if (lockAcquired) lock.releaseLock();
    }

    if (revoked) {
        logToSheet('INFO', 'Session revoked through logout.', { userId, userSessionTokenCleared });
    } else {
        logToSheet('INFO', 'Logout requested for an already revoked session.', { userId, userSessionTokenCleared });
    }
    if (cleanupError) {
        logToSheet('ERROR', 'Session revoked but Users.SessionToken cleanup failed.', {
            userId,
            error: cleanupError.message
        });
    }

    return {
        status: 'success',
        revoked,
        alreadyRevoked,
        userSessionTokenMatched,
        userSessionTokenCleared,
        cleanupPending: Boolean(cleanupError)
    };
}
