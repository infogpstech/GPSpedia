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
    Logs: 5
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

function beginLoginAttempt(username) {
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const rawState = cache.get(key);
        let state = { attempts: 0 };
        if (rawState) {
            try { state = JSON.parse(rawState) || { attempts: 0 }; }
            catch (e) { state = { attempts: 0 }; }
        }
        if (!state || typeof state !== 'object' || Array.isArray(state)) state = { attempts: 0 };
        const now = Date.now();
        if (state.lockedUntil && now < state.lockedUntil) {
            throw new Error('Se alcanzó el máximo de intentos. Intenta nuevamente en 15 minutos.');
        }
        if (state.lockedUntil && now >= state.lockedUntil) state = { attempts: 0 };
        state.attempts = Number(state.attempts) || 0;
        if (state.attempts >= LOGIN_MAX_ATTEMPTS) {
            state.lockedUntil = now + LOGIN_LOCKOUT_SECONDS * 1000;
            cache.put(key, JSON.stringify(state), LOGIN_LOCKOUT_SECONDS);
            throw new Error('Se alcanzó el máximo de intentos. Intenta nuevamente en 15 minutos.');
        }
        state.attempts++;
        if (state.attempts >= LOGIN_MAX_ATTEMPTS) state.lockedUntil = now + LOGIN_LOCKOUT_SECONDS * 1000;
        cache.put(key, JSON.stringify(state), LOGIN_LOCKOUT_SECONDS);
    } finally {
        lock.releaseLock();
    }
}

function resetLoginAttempts(username) {
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { cache.remove(key); }
    finally { lock.releaseLock(); }
}

function rollbackLoginAttempt(username) {
    const cache = CacheService.getScriptCache();
    const key = getLoginAttemptCacheKey(username);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const rawState = cache.get(key);
        if (!rawState) return;
        let state;
        try { state = JSON.parse(rawState); }
        catch (e) { cache.remove(key); return; }
        if (!state || typeof state !== 'object' || Array.isArray(state)) { cache.remove(key); return; }
        state.attempts = Math.max(0, (Number(state.attempts) || 0) - 1);
        if (state.attempts === 0) { cache.remove(key); return; }
        if (state.attempts < LOGIN_MAX_ATTEMPTS) delete state.lockedUntil;
        cache.put(key, JSON.stringify(state), LOGIN_LOCKOUT_SECONDS);
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
    let attemptReserved = false;
    let invalidCredentials = false;
    try {
        const { username, password } = payload || {};
        logToSheet('INFO', 'handleLogin started.');

        normalizedUsername = String(username || '').trim();
        const normalizedPassword = normalizePassword(password);
        if (!normalizedUsername || !normalizedPassword) throw new Error("Usuario y contraseña son requeridos.");

        beginLoginAttempt(normalizedUsername);
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

        if (passwordCheck.legacy) {
            userSheet.getRange(foundUserIndex + 2, COLS_USERS.Password)
                .setValue(createPasswordHash(normalizedPassword, false));
        }
        resetLoginAttempts(normalizedUsername);
        attemptReserved = false;

        const userRole = (foundUserRow[COLS_USERS.Privilegios - 1] || '').toString().toLowerCase().trim();
        const userId = foundUserRow[COLS_USERS.ID - 1];
        const sessionLimit = SESSION_LIMITS[userRole] ?? 1;

        // Manage sessions atomically. The script lock is shared with login-attempt and log operations.
        // Do not invoke logToSheet() while this lock is held.
        const sessionLock = LockService.getScriptLock();
        let sessionLockAcquired = false;
        let oldestSession = null;
        let sessionCount = 0;
        let sessionToken = '';
        let sessionOperationError = null;
        let sessionDeleteFailed = false;

        try {
            sessionLock.waitLock(10000);
            sessionLockAcquired = true;

            const activeSessionsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
            if (!activeSessionsSheet) throw new Error("Hoja ActiveSessions no encontrada.");

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
            newSessionRow[COLS_ACTIVE_SESSIONS.date - 1] = new Date().toISOString();
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
            SessionToken: sessionToken
        };

        return { status: 'success', user: user };

    } catch (error) {
        if (attemptReserved && !invalidCredentials) {
            try { rollbackLoginAttempt(normalizedUsername); }
            catch (rollbackError) { console.error('No se pudo revertir el intento reservado:', rollbackError.message); }
        }
        logToSheet('ERROR', `Error in handleLogin: ${error.message}`, { stack: error.stack });
        return { status: 'error', message: error.message };
    }
}

function handleValidateSession(payload) {
    try {
        const { userId, sessionToken } = payload;
        if (!userId || !sessionToken) {
            return { valid: false };
        }

        const activeSessionsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const data = activeSessionsSheet.getDataRange().getValues();
        data.shift(); // Remove headers

        for (const row of data) {
            // Compare userId and sessionToken from the ActiveSessions sheet
            if (row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1] == userId && row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken) {
                return { valid: true };
            }
        }

        return { valid: false };
    } catch (error) {
        logToSheet('ERROR', `Error in handleValidateSession: ${error.message}`, { stack: error.stack });
        return { valid: false, error: error.message };
    }
}
