// ============================================================================
// GPSPEDIA-AUTH SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.2.5

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SHEET_NAMES = {
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions",
    LOGS: "Logs",
    LOGIN_REQUESTS: "LoginRequests"
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
    'jefe': 5,
    'supervisor': 3,
    'tecnico': 1,
    'tecnico_exterior': 1
};

const ROLE_REVOCATION_PROPERTY_PREFIX = 'role_revocation_pending_';
const ROLE_REVOCATION_SHARED_PREFIX = '__role_revocation_pending__:';
const ROLE_REVOCATION_BASELINE_PENDING_ = 'role_revocation_baseline_pending';
const ROLE_REVOCATION_BASELINE_VERSION_ = 'role_revocation_baseline_v1';
const LEGACY_LOGIN_REQUEST_PROPERTY_PREFIX = 'login_request_';
const LOGIN_REQUEST_HEADERS_ = Object.freeze(['requestId','userId','token','createdAt','createdAtMs','status','pointerSet','committedAt','revokedAt','updatedAt']);
const LOGIN_REQUEST_BASELINE_MARKER_ = '__META__:LOGIN_REQUESTS_BASELINE_V1';
const LOGIN_REQUEST_STATUS_ = Object.freeze(['pending','committed','revoked']);
const LOGIN_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// CONTRASEÑAS Y CONTROL DE INTENTOS DE INICIO DE SESIÓN
// ============================================================================
const PASSWORD_HASH_PREFIX = 'pbkdf2-sha256$';
const LEGACY_PASSWORD_HASH_PREFIX = 'sha256$';
const PASSWORD_KDF_ITERATIONS = 12000;
const PASSWORD_KDF_MIN_ITERATIONS = 1000;
const PASSWORD_KDF_MAX_ITERATIONS = 200000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

function normalizePassword(password) {
    return String(password === null || password === undefined ? '' : password).trim();
}

function digestToHex(bytes) {
    return bytes.map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function passwordHexToBytes_(hex) {
    const value = String(hex || '');
    if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Salt de contraseña inválido.');
    const bytes = [];
    for (let i = 0; i < value.length; i += 2) {
        const byte = parseInt(value.slice(i, i + 2), 16);
        bytes.push(byte > 127 ? byte - 256 : byte);
    }
    return bytes;
}

// PBKDF2-HMAC-SHA256; el formato almacena versión, iteraciones, salt aleatorio y digest.
// PBKDF2 opera sobre bytes binarios; Utilities.computeHmacSha256Signature solo acepta texto.
// Se implementa HMAC-SHA256 sobre bytes para conservar exactamente el vector PBKDF2.
function passwordBytesToUnsigned_(bytes) {
    const result = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) result[i] = (Number(bytes[i]) + 256) % 256;
    return result;
}

function sha256Bytes_(input) {
    const bytes = passwordBytesToUnsigned_(input);
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const highBits = Math.floor(bitLength / 0x100000000);
    const lowBits = bitLength >>> 0;
    bytes.push((highBits >>> 24) & 255, (highBits >>> 16) & 255, (highBits >>> 8) & 255, highBits & 255,
        (lowBits >>> 24) & 255, (lowBits >>> 16) & 255, (lowBits >>> 8) & 255, lowBits & 255);
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0xfc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x6ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotateRight = (value, count) => (value >>> count) | (value << (32 - count));
    for (let offset = 0; offset < bytes.length; offset += 64) {
        const words = new Array(64);
        for (let i = 0; i < 16; i++) {
            const p = offset + i * 4;
            words[i] = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
        }
        for (let i = 16; i < 64; i++) {
            const x = words[i - 15], y = words[i - 2];
            const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
            const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
            words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
        }
        let a=hash[0],b=hash[1],c=hash[2],d=hash[3],e=hash[4],f=hash[5],g=hash[6],h=hash[7];
        for (let i = 0; i < 64; i++) {
            const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choice = (e & f) ^ (~e & g);
            const temp1 = (h + sum1 + choice + constants[i] + words[i]) >>> 0;
            const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (sum0 + majority) >>> 0;
            h=g;g=f;f=e;e=(d+temp1)>>>0;d=c;c=b;b=a;a=(temp1+temp2)>>>0;
        }
        hash[0]=(hash[0]+a)>>>0;hash[1]=(hash[1]+b)>>>0;hash[2]=(hash[2]+c)>>>0;hash[3]=(hash[3]+d)>>>0;
        hash[4]=(hash[4]+e)>>>0;hash[5]=(hash[5]+f)>>>0;hash[6]=(hash[6]+g)>>>0;hash[7]=(hash[7]+h)>>>0;
    }
    const digest=[];
    for (let i=0;i<hash.length;i++) digest.push((hash[i]>>>24)&255,(hash[i]>>>16)&255,(hash[i]>>>8)&255,hash[i]&255);
    return digest;
}

function hmacSha256Bytes_(keyBytes, messageBytes) {
    let key = passwordBytesToUnsigned_(keyBytes);
    if (key.length > 64) key = sha256Bytes_(key);
    const innerPad = new Array(64), outerPad = new Array(64);
    for (let i=0;i<64;i++) {
        const byte = key[i] || 0;
        innerPad[i] = byte ^ 0x36;
        outerPad[i] = byte ^ 0x5c;
    }
    const innerHash = sha256Bytes_(innerPad.concat(passwordBytesToUnsigned_(messageBytes)));
    return sha256Bytes_(outerPad.concat(innerHash));
}

function pbkdf2Sha256Hex_(password, saltHex, iterations) {
    const rounds = Number(iterations);
    if (!Number.isInteger(rounds) || rounds < PASSWORD_KDF_MIN_ITERATIONS || rounds > PASSWORD_KDF_MAX_ITERATIONS) {
        throw new Error('Parámetro de coste PBKDF2 fuera de límites.');
    }
    const keyBytes = passwordBytesToUnsigned_(Utilities.newBlob(String(password)).getBytes());
    const block = passwordHexToBytes_(saltHex).concat([0, 0, 0, 1]);
    let u = hmacSha256Bytes_(keyBytes, block);
    const result = u.map(byte => (byte + 256) % 256);
    for (let round = 1; round < rounds; round++) {
        u = hmacSha256Bytes_(keyBytes, u);
        for (let i = 0; i < result.length; i++) result[i] ^= (u[i] + 256) % 256;
    }
    return digestToHex(result);
}

function createPasswordHash(password, enforceMinimumLength = true) {
    const normalizedPassword = normalizePassword(password);
    if (enforceMinimumLength && normalizedPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres después de quitar espacios al inicio y al final.');
    }
    const salt = Utilities.getUuid().replace(/-/g, '').toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(salt)) throw new Error('No se pudo generar un salt aleatorio válido.');
    const digest = pbkdf2Sha256Hex_(normalizedPassword, salt, PASSWORD_KDF_ITERATIONS);
    return PASSWORD_HASH_PREFIX + PASSWORD_KDF_ITERATIONS + '$' + salt + '$' + digest;
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
        if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' ||
            !/^[0-9a-f]{32}$/i.test(parts[2]) || !/^[0-9a-f]{64}$/i.test(parts[3])) {
            return { matches: false, legacy: false, needsRehash: false };
        }
        const iterations = Number(parts[1]);
        if (!Number.isInteger(iterations) || iterations < PASSWORD_KDF_MIN_ITERATIONS || iterations > PASSWORD_KDF_MAX_ITERATIONS) {
            return { matches: false, legacy: false, needsRehash: false };
        }
        const digest = pbkdf2Sha256Hex_(normalizedPassword, parts[2], iterations);
        const matches = constantTimeEquals(digest, parts[3].toLowerCase());
        return { matches, legacy: false, needsRehash: matches && iterations < PASSWORD_KDF_ITERATIONS };
    }
    if (stored.indexOf(LEGACY_PASSWORD_HASH_PREFIX) === 0) {
        const parts = stored.split('$');
        if (parts.length !== 3 || !/^[0-9a-f]{32}$/i.test(parts[1]) || !/^[0-9a-f]{64}$/i.test(parts[2])) {
            return { matches: false, legacy: false, needsRehash: false };
        }
        const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, parts[1] + ':' + normalizedPassword, Utilities.Charset.UTF_8);
        const matches = constantTimeEquals(digestToHex(digest), parts[2].toLowerCase());
        return { matches, legacy: false, needsRehash: matches };
    }
    const matches = constantTimeEquals(stored, normalizedPassword);
    return { matches, legacy: true, needsRehash: matches };
}

// Ejecutar desde el editor del proyecto AUTH en un entorno de prueba para calibrar
// el coste real de Utilities.computeHmacSha256Signature; no lee ni modifica datos.
function benchmarkPasswordKdf_() {
    const salt = '00112233445566778899aabbccddeeff';
    return [1000, 2500, 5000, 10000, PASSWORD_KDF_ITERATIONS].map(iterations => {
        const started = Date.now();
        pbkdf2Sha256Hex_('GPSpedia-KDF-benchmark-only', salt, iterations);
        return { iterations, durationMs: Date.now() - started };
    });
}

// Diagnóstico de coste PBKDF2: solo lectura, exclusivo de Desarrollador y sin credenciales reales.
function handleBenchmarkPasswordKdf_(payload) {
    requireSharedAuthActor_(payload, ["desarrollador"], "el benchmark PBKDF2");
    return {
        status: 'success',
        benchmarkOnly: true,
        readOnly: true,
        note: 'Usa únicamente una cadena de prueba fija; no lee, registra ni modifica contraseñas de usuarios.',
        results: benchmarkPasswordKdf_()
    };
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
    if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
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
    if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
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
    if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
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
    if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
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
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        lockAcquired = true;
        const logSheet = getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.LOGS);
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

function requireSharedAuthActor_(payload, allowedRoles, actionLabel) {
    const actor = payload && payload.__sharedSessionActor;
    const userId = normalizeUserId(actor && actor.userId);
    const role = normalizeRoleName(actor && actor.role);
    if (!actor || !userId || !Number.isSafeInteger(actor.epoch) || actor.epoch < 1 ||
        !Array.isArray(allowedRoles) || !allowedRoles.includes(role)) {
        throw new Error("Acceso denegado: el contexto central no autoriza " + String(actionLabel || "esta operación") + ".");
    }
    return { userId, role, fullName: String(actor.fullName || ""), epoch: actor.epoch };
}

function handleClearSensitiveLogs(payload) {
    // La sesión/token se valida localmente en AUTH antes de ejecutar la acción.
    // Solo se consume el actor confiable y su rol; no se vuelven a leer Users/ActiveSessions.
    const actor = payload && payload.__sharedSessionActor;
    const requestedUserId = normalizeUserId(payload && payload.userId);
    const userId = normalizeUserId(actor && actor.userId);
    const actorRole = normalizeRoleName(actor && actor.role);
    if (!actor || !userId || requestedUserId !== userId ||
        !Number.isSafeInteger(actor.epoch) || actor.epoch < 1 || actorRole !== "desarrollador") {
        throw new Error("Acceso denegado: la purga de Logs está reservada a una sesión Desarrollador autorizada.");
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let scannedCount = 0;
    let deletedCount = 0;
    let deletionError = null;

    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        lockAcquired = true;

        const spreadsheet = getAuthUsersSpreadsheet_();
        const logsSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOGS);
        if (!logsSheet) throw new Error("No se encontró la hoja Logs.");

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

    const resultMessage = deletedCount > 0
        ? "Se eliminaron " + deletedCount + " registros confidenciales de Logs tras revisar " + scannedCount + " registros."
        : scannedCount > 0
            ? "Se revisaron " + scannedCount + " registros y no se encontraron datos confidenciales para eliminar."
            : "No hay registros en la hoja Logs para revisar.";
    logToSheet("INFO", "Sensitive Logs purge completed.", {
        requesterUserId: userId,
        scannedCount,
        deletedCount
    });
    return {
        status: "success",
        scannedCount,
        deletedCount,
        message: resultMessage
    };
}

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Auth',
            version: '2.2.5',
            status: 'available',
            sessionAuthority: 'Users/ActiveSessions'
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
    return ["deleteUser"].includes(action);
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
    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    if (action === "__invalidateSessionActorCache") {
        const invalidation = handleSharedSessionActorCacheInvalidation_(payload);
        return ContentService.createTextOutput(JSON.stringify(invalidation))
            .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "getPublicConfiguration") {
        // Proyección pública únicamente: no incluye recursos, parámetros backend/admin ni identidad.
        // Esta ruta no coordina otros servicios y no requiere sesión para datos ya públicos.
        let result;
        try {
            result = handleGetPublicConfiguration_();
        } catch (error) {
            result = {
                status: "error",
                code: String(error && error.code || "CONFIGURATION_UNAVAILABLE"),
                message: "La configuración pública central no está disponible."
            };
        }
        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const requiresSessionActor = action === "clearSensitiveLogs" ||
        ["acceptTerms", "changePassword", "resetUserPassword", "resetUserSessions", "updateUser", "migrateLegacyPasswords", "getUsers", "createUser", "updateProfile", "benchmarkPasswordKdf"].includes(action) ||
        isSharedMutationAction_(action);
    if (requiresSessionActor) {
        try { migrateLegacyRoleRevocationMarkersToSharedState_(); }
        catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "No se pudo verificar el estado de revocación AUTH."
            })).setMimeType(ContentService.MimeType.JSON);
        }
    }
    if (action === "clearSensitiveLogs") {
        try {
            // La purga de Logs solo requiere capacidad Desarrollador; no modifica
            // sesiones ni necesita una lease o autorización remota por acción.
            const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH", loadSpreadsheet: getAuthUsersSpreadsheet_ });
            return doPostInternal_(withSharedSessionActor_(e, actor));
        } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "No se pudo recuperar el contexto de sesión."
            })).setMimeType(ContentService.MimeType.TEXT);
        }
    }
    if (["acceptTerms", "changePassword", "resetUserPassword", "resetUserSessions", "updateUser", "migrateLegacyPasswords", "getUsers", "createUser", "updateProfile"].includes(action)) {
        try {
            // Las acciones ordinarias consumen el actor local preparado al iniciar sesión o cargado
            // desde Users/ActiveSessions ante un cache miss. No adquieren lease ni revalidan
            // identidad por acción; cada mutación invalida la caché local AUTH.
            const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH", loadSpreadsheet: getAuthUsersSpreadsheet_ });
            return doPostInternal_(withSharedSessionActor_(e, actor));
        } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "No se pudo recuperar el contexto de sesión."
            })).setMimeType(ContentService.MimeType.TEXT);
        }
    }
    if (action === "benchmarkPasswordKdf") {
        try {
            // El benchmark solo calcula con una cadena fija: el actor cacheado basta;
            // no requiere lease ni coordinación remota de actividad.
            const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH", loadSpreadsheet: getAuthUsersSpreadsheet_ });
            return doPostInternal_(withSharedSessionActor_(e, actor));
        } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "No se pudo recuperar el contexto de sesión."
            })).setMimeType(ContentService.MimeType.TEXT);
        }
    }
    if (!isSharedMutationAction_(action)) return doPostInternal_(withSharedSessionActor_(e, null));
    try {
        const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH", loadSpreadsheet: getAuthUsersSpreadsheet_ });
        return doPostInternal_(withSharedSessionActor_(e, actor));
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "No se pudo recuperar el contexto de sesión."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

function handleGetPublicConfiguration_() {
    return getPublicCentralConfiguration_();
}

var sessionCacheKeysForResponse_ = null;

function recordSessionCacheKeysForResponse_(userId, sessionTokens) {
    if (!sessionCacheKeysForResponse_) return;
    const id = String(userId || "").trim();
    const tokens = Array.from(new Set((Array.isArray(sessionTokens) ? sessionTokens : [])
        .map(token => String(token || "")).filter(Boolean)));
    if (!id || !tokens.length) return;
    if (sessionCacheKeysForResponse_.userId && sessionCacheKeysForResponse_.userId !== id) {
        sessionCacheKeysForResponse_.error = true;
        return;
    }
    sessionCacheKeysForResponse_.userId = id;
    tokens.forEach(token => {
        try {
            const sharedKey = getSharedSessionActorCacheKey_(id, token);
            const digest = sharedKey.replace("GPSpedia_SHARED_SESSION_ACTOR_V1_", "");
            sessionCacheKeysForResponse_.shared.add(sharedKey);
            sessionCacheKeysForResponse_.catalog.add("GPSpedia_CATALOG_SESSION_ACTOR_V1_" + digest);
        } catch (error) {
            sessionCacheKeysForResponse_.error = true;
        }
    });
}

function doPostInternal_(e) {
    sessionCacheKeysForResponse_ = { userId: "", shared: new Set(), catalog: new Set(), error: false };
    let response;
    try {
        const request = JSON.parse(e.postData.contents);

        switch (request.action) {
            case 'getPublicConfiguration':
                response = handleGetPublicConfiguration_();
                break;
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
            case 'requestPasswordRecovery':
                response = handleRequestPasswordRecovery(request.payload);
                break;
            case 'completePasswordRecovery':
                response = handleCompletePasswordRecovery(request.payload);
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
            case 'getUsers':
                response = handleGetUsers(request.payload);
                break;
            case 'createUser':
                response = handleCreateUser(request.payload);
                break;
            case 'updateProfile':
                response = handleUpdateProfile(request.payload);
                break;
            case 'updateUser':
                response = handleUpdateUser(request.payload);
                break;
            case 'logout':
                response = handleLogout(request.payload);
                break;
            case 'migrateLegacyPasswords':
                response = handleMigrateLegacyPasswords(request.payload);
                break;
            case 'benchmarkPasswordKdf':
                response = handleBenchmarkPasswordKdf_(request.payload);
                break;
            default:
                throw new Error(`Acción desconocida: ${request.action}`);
        }
    } catch (error) {
        logToSheet('ERROR', `Error in doPost: ${error.message}`, { stack: error.stack });
        response = { status: 'error', message: error.message };
    }
    if (sessionCacheKeysForResponse_ &&
        (sessionCacheKeysForResponse_.shared.size || sessionCacheKeysForResponse_.catalog.size || sessionCacheKeysForResponse_.error)) {
        response = response && typeof response === "object" && !Array.isArray(response)
            ? response : { status: "error", message: "La operación no devolvió una respuesta válida." };
        response.sessionCacheKeys = {
            userId: sessionCacheKeysForResponse_.userId,
            shared: Array.from(sessionCacheKeysForResponse_.shared),
            catalog: Array.from(sessionCacheKeysForResponse_.catalog)
        };
        if (sessionCacheKeysForResponse_.error) response.sessionCacheInvalidationPending = true;
    }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// LÓGICA DE AUTENTICACIÓN
// ============================================================================
function normalizeLoginRequestId_(value) {
    if (value === null || value === undefined || value === '') return Utilities.getUuid();
    const requestId = String(value).trim();
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) throw new Error('Identificador de solicitud de login inválido.');
    return requestId;
}

function loginRequestRecordToRow_(record) {
    return [String(record.requestId || ''), normalizeUserId(record.userId), String(record.token || ''),
        String(record.createdAt || ''), Number(record.createdAtMs), String(record.status || ''),
        record.pointerSet === true, String(record.committedAt || ''), String(record.revokedAt || ''),
        String(record.updatedAt || new Date().toISOString())];
}

function loginRequestRecordFromRow_(row) {
    if (!Array.isArray(row) || row.length < LOGIN_REQUEST_HEADERS_.length) throw new Error('El registro de LoginRequests está incompleto.');
    const record = { requestId:String(row[0]||''), userId:normalizeUserId(row[1]), token:String(row[2]||''),
        createdAt:String(row[3]||''), createdAtMs:Number(row[4]), status:String(row[5]||''),
        pointerSet:row[6]===true||String(row[6]).toLowerCase()==='true',
        committedAt:String(row[7]||''), revokedAt:String(row[8]||''), updatedAt:String(row[9]||'') };
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(record.requestId) || !record.userId || !record.token ||
        !record.createdAt || !Number.isFinite(record.createdAtMs) || !LOGIN_REQUEST_STATUS_.includes(record.status)) {
        throw new Error('El registro de LoginRequests contiene datos inválidos.');
    }
    return record;
}

function ensureLoginRequestsSheet_(spreadsheet) {
    if (!spreadsheet) throw new Error('No se pudo obtener la Spreadsheet de AUTH.');
    let sheet=spreadsheet.getSheetByName(SHEET_NAMES.LOGIN_REQUESTS);
    if (!sheet) sheet=spreadsheet.insertSheet(SHEET_NAMES.LOGIN_REQUESTS);
    if (sheet.getLastRow()===0) {
        sheet.getRange(1,1,1,LOGIN_REQUEST_HEADERS_.length).setValues([LOGIN_REQUEST_HEADERS_.slice()]);
        SpreadsheetApp.flush();
    }
    const headers=sheet.getRange(1,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0].map(v=>String(v||''));
    if (JSON.stringify(headers)!==JSON.stringify(LOGIN_REQUEST_HEADERS_)) throw new Error('La hoja LoginRequests no tiene el esquema esperado; no se modificó.');
    if (sheet.getLastRow()<2) {
        sheet.getRange(2,1,1,LOGIN_REQUEST_HEADERS_.length).setValues([[LOGIN_REQUEST_BASELINE_MARKER_,'__SYSTEM__','3',new Date().toISOString(),Date.now(),'baseline_pending',true,'','','']]);
        SpreadsheetApp.flush();
    }
    const marker=sheet.getRange(2,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0];
    if (String(marker[0]||'')!==LOGIN_REQUEST_BASELINE_MARKER_) throw new Error('LoginRequests no contiene el marcador de baseline esperado; se requiere revisión.');
    if (String(marker[5]||'')==='baseline_v1') { if(!Number.isInteger(Number(marker[2]))||Number(marker[2])<3){sheet.getRange(2,3).setValue('3');SpreadsheetApp.flush();} return sheet; }
    if (String(marker[5]||'')!=='baseline_pending') throw new Error('El estado del baseline LoginRequests no es válido.');

    // Importación única e idempotente. Las propiedades legacy se leen, pero nunca se escriben ni eliminan.
    const legacy=PropertiesService.getScriptProperties().getProperties();
    const last=sheet.getLastRow(), rows=last>2?sheet.getRange(3,1,last-2,LOGIN_REQUEST_HEADERS_.length).getValues():[];
    const existing=new Map();
    rows.forEach((row,index)=>{const id=String(row[0]||'');if(!id)return;if(existing.has(id))throw new Error('LoginRequests contiene requestId duplicados.');existing.set(id,{rowIndex:index+3,row});});
    const imports=[];
    Object.keys(legacy).forEach(key=>{
        if(!key.startsWith(LEGACY_LOGIN_REQUEST_PROPERTY_PREFIX))return;
        const requestId=key.slice(LEGACY_LOGIN_REQUEST_PROPERTY_PREFIX.length);
        if(!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))throw new Error('Existe una clave legacy de login con requestId inválido.');
        let old;try{old=JSON.parse(legacy[key]);}catch(error){throw new Error('Existe un registro legacy de login dañado; no se completó el baseline.');}
        if(!old||!normalizeUserId(old.userId)||typeof old.token!=='string'||!old.token||!LOGIN_REQUEST_STATUS_.includes(String(old.status||'')))throw new Error('Existe un registro legacy de login incompleto; no se completó el baseline.');
        const createdAt=String(old.createdAt||''),createdAtMs=Number.isFinite(Number(old.createdAtMs))?Number(old.createdAtMs):Date.parse(createdAt);
        if(!createdAt||!Number.isFinite(createdAtMs))throw new Error('Existe un registro legacy de login sin fecha válida; no se completó el baseline.');
        const record={requestId,userId:normalizeUserId(old.userId),token:old.token,createdAt,createdAtMs,status:String(old.status),pointerSet:old.pointerSet===true,committedAt:String(old.committedAt||''),revokedAt:String(old.revokedAt||''),updatedAt:new Date().toISOString()};
        const row=loginRequestRecordToRow_(record),prior=existing.get(requestId);
        if(prior){if(JSON.stringify(prior.row.slice(0,7))!==JSON.stringify(row.slice(0,7)))throw new Error('El baseline detectó un registro distinto para el mismo requestId.');}
        else{imports.push(row);existing.set(requestId,{row});}
    });
    if(imports.length){
        const start=sheet.getLastRow()+1;sheet.getRange(start,1,imports.length,LOGIN_REQUEST_HEADERS_.length).setValues(imports);SpreadsheetApp.flush();
        const back=sheet.getRange(start,1,imports.length,LOGIN_REQUEST_HEADERS_.length).getValues();
        if(JSON.stringify(back)!==JSON.stringify(imports))throw new Error('No se pudo verificar el baseline de LoginRequests; se reintentará sin duplicar.');
    }
    sheet.getRange(2,6).setValue('baseline_v1');sheet.getRange(2,10).setValue(new Date().toISOString());SpreadsheetApp.flush();
    if(String(sheet.getRange(2,6).getValue()||'')!=='baseline_v1')throw new Error('No se pudo confirmar el baseline de LoginRequests.');
    return sheet;
}

function findLoginRequestEntry_(sheet,requestId){
    const last=sheet.getLastRow();if(last<3)return null;
    const matches=sheet.getRange(3,1,last-2,1).createTextFinder(String(requestId)).matchEntireCell(true).findAll();
    if(matches.length>1)throw new Error('LoginRequests contiene un requestId duplicado.');
    if(!matches.length)return null;
    const rowIndex=matches[0].getRow();
    return{rowIndex,record:loginRequestRecordFromRow_(sheet.getRange(rowIndex,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0])};
}

function saveLoginRequestRecord_(sheet,record,rowIndex=null){
    const row=loginRequestRecordToRow_(record);
    if(rowIndex===null){sheet.appendRow(row);rowIndex=sheet.getLastRow();}
    else sheet.getRange(rowIndex,1,1,LOGIN_REQUEST_HEADERS_.length).setValues([row]);
    SpreadsheetApp.flush();
    const back=sheet.getRange(rowIndex,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0];
    if(JSON.stringify(back)!==JSON.stringify(row))throw new Error('No se pudo confirmar el registro de idempotencia de login; reintenta la misma solicitud.');
    return rowIndex;
}

function cleanupExpiredLoginRequestsBounded_(loginRequestsSheet,sessionsSheet,sessionData,now){
    const last=loginRequestsSheet.getLastRow();
    if(last<3){loginRequestsSheet.getRange(2,3).setValue('3');return;}
    const marker=loginRequestsSheet.getRange(2,3).getValue();
    let start=Number(marker);
    if(!Number.isInteger(start)||start<3||start>last)start=3;
    const end=Math.min(last,start+24);
    const rows=loginRequestsSheet.getRange(start,1,end-start+1,LOGIN_REQUEST_HEADERS_.length).getValues();
    const expiredRows=[];
    rows.forEach((row,index)=>{
        if(!String(row[0]||''))return;
        const record=loginRequestRecordFromRow_(row);
        if(now-record.createdAtMs<=LOGIN_REQUEST_TTL_MS)return;
        if(record.status==='pending'){
            const matches=findSessionRowsByTokenInData_(sessionData,record.token);
            if(matches.length>1)throw new Error('Un intento de login vencido tiene un token duplicado.');
            if(matches.length===1){
                const tokenCell=sessionsSheet.getRange(matches[0].rowIndex,COLS_ACTIVE_SESSIONS.ActiveSessions);
                tokenCell.clearContent();
                if(tokenCell.getValue())throw new Error('No se pudo invalidar un intento de login vencido.');
                sessionData[matches[0].rowIndex-1][COLS_ACTIVE_SESSIONS.ActiveSessions-1]='';
            }
        }
        expiredRows.push(start+index);
    });
    expiredRows.sort((a,b)=>b-a).forEach(rowIndex=>loginRequestsSheet.deleteRow(rowIndex));
    SpreadsheetApp.flush();
    const next=start+(end-start+1)-expiredRows.length;
    const newLast=loginRequestsSheet.getLastRow();
    const nextCursor=next>newLast?3:next;
    loginRequestsSheet.getRange(2,3).setValue(String(nextCursor));
    SpreadsheetApp.flush();
    if(String(loginRequestsSheet.getRange(2,3).getValue()||'')!==String(nextCursor)){
        throw new Error('No se pudo confirmar el cursor de limpieza LoginRequests.');
    }
}

function findLoginRequestRowsByValue_(sheet,column,value){
    const last=sheet.getLastRow();if(last<3)return[];
    return sheet.getRange(3,column,last-2,1).createTextFinder(String(value)).matchEntireCell(true).findAll().map(range=>range.getRow());
}

function revokePendingLoginRequestsForUserUnderLock_(userId,spreadsheet){
    let revoked=0;
    try{
        const sheet=ensureLoginRequestsSheet_(spreadsheet),rows=findLoginRequestRowsByValue_(sheet,2,normalizeUserId(userId));
        rows.forEach(rowIndex=>{const record=loginRequestRecordFromRow_(sheet.getRange(rowIndex,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0]);if(record.status==='revoked')return;record.status='revoked';record.revokedAt=Date.now();record.updatedAt=new Date().toISOString();saveLoginRequestRecord_(sheet,record,rowIndex);revoked++;});
    }catch(error){return{pending:true,revoked,error};}
    return{pending:false,revoked};
}

function revokeLoginRequestForTokenUnderLock_(token,expectedUserId=null,spreadsheet=null){
    let matched=false;
    try{
        const sheet=ensureLoginRequestsSheet_(spreadsheet),rows=findLoginRequestRowsByValue_(sheet,3,token);
        rows.forEach(rowIndex=>{const record=loginRequestRecordFromRow_(sheet.getRange(rowIndex,1,1,LOGIN_REQUEST_HEADERS_.length).getValues()[0]);if(expectedUserId!==null&&normalizeUserId(record.userId)!==normalizeUserId(expectedUserId))throw new Error('El intento de login asociado no coincide con la identidad solicitada.');if(record.status!=='revoked'){record.status='revoked';record.revokedAt=Date.now();record.updatedAt=new Date().toISOString();saveLoginRequestRecord_(sheet,record,rowIndex);}matched=true;});
    }catch(error){return{pending:true,matched:false,error};}
    return{pending:false,matched};
}
function findSessionRowsByTokenInData_(data, token) {
    const matches = [];
    if (!Array.isArray(data)) return matches;
    for (let i = 1; i < data.length; i++) {
        if (data[i][COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === token) {
            matches.push({ rowIndex: i + 1, row: data[i] });
        }
    }
    return matches;
}

function findSessionRowsByTokenUnderLock_(sheet, token) {
    return findSessionRowsByTokenInData_(sheet.getDataRange().getValues(), token);
}

function getOldestSessionsToRevoke_(activeRows, currentToken, sessionLimit) {
    if (!Number.isFinite(sessionLimit) || activeRows.length <= sessionLimit) return [];
    const excess = activeRows.length - sessionLimit;
    const oldestActive = activeRows.filter(row => row.token !== currentToken)
        .sort((a, b) => a.createdAt - b.createdAt || a.rowIndex - b.rowIndex)
        .slice(0, excess);
    if (oldestActive.length !== excess) {
        throw new Error('No se pudo identificar la cantidad de sesiones que deben revocarse.');
    }
    return oldestActive;
}


// La solicitud conserva el mismo token entre reintentos. LoginRequests se escribe
// antes de tocar ActiveSessions; cada escritura se confirma por lectura posterior.
function createOrRecoverLoginSessionUnderLock_(userSheet, sessionsSheet, loginRequestsSheet, userRowIndex, userId, username, sessionLimit, requestId) {
    if (!loginRequestsSheet) throw new Error('No se encontró la hoja LoginRequests.');
    const now = Date.now();
    let sessionData = sessionsSheet.getDataRange().getValues();
    cleanupExpiredLoginRequestsBounded_(loginRequestsSheet, sessionsSheet, sessionData, now);
    const requestEntry = findLoginRequestEntry_(loginRequestsSheet, requestId);
    let requestRowIndex = requestEntry ? requestEntry.rowIndex : null;
    let record = requestEntry ? requestEntry.record : null;
    if (record && now - record.createdAtMs > LOGIN_REQUEST_TTL_MS) {
        if (record.status === 'pending') {
            const expiredMatches = findSessionRowsByTokenInData_(sessionData, record.token);
            if (expiredMatches.length > 1) throw new Error('Un intento de login vencido tiene un token duplicado.');
            if (expiredMatches.length === 1) {
                const expiredRow = expiredMatches[0].rowIndex;
                sessionsSheet.getRange(expiredRow, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent();
                if (sessionsSheet.getRange(expiredRow, COLS_ACTIVE_SESSIONS.ActiveSessions).getValue()) throw new Error('No se pudo invalidar un intento de login vencido.');
                try { sessionsSheet.deleteRow(expiredRow); } catch (deleteError) {}
                sessionData.splice(expiredRow - 1, 1);
            }
        }
        record = null;
    }
    if (record && record.status === 'revoked') throw new Error('LOGIN_REQUEST_ALREADY_REVOKED: La solicitud de login ya fue invalidada. Inicia un nuevo intento.');
    if (record && (normalizeUserId(record.userId) !== normalizeUserId(userId) || typeof record.token !== 'string' || !record.token)) {
        throw new Error('El identificador de login ya está asociado a otra solicitud.');
    }
    const isNewRequest = !record;
    const token = record ? record.token : Utilities.getUuid();
    let createdAt = record && record.createdAt ? record.createdAt : new Date().toISOString();
    let matches = findSessionRowsByTokenInData_(sessionData, token);
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
            record = { requestId, userId: normalizeUserId(userId), token, createdAt, createdAtMs: now, status: 'pending', pointerSet: false, committedAt: '', revokedAt: '', updatedAt: new Date().toISOString() };
            requestRowIndex = saveLoginRequestRecord_(loginRequestsSheet, record, requestRowIndex);
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
            // Solo el camino de error vuelve a leer la hoja para reconciliar un append ambiguo.
            sessionData = sessionsSheet.getDataRange().getValues();
            matches = findSessionRowsByTokenInData_(sessionData, token);
            if (matches.length !== 1) throw appendError;
        }
        if (matches.length === 0) {
            const appendedRowIndex = sessionsSheet.getLastRow();
            const readWidth = Math.max(COLS_ACTIVE_SESSIONS.LastActivityAt, COLS_ACTIVE_SESSIONS.SessionTermsAcceptance);
            const appendedRow = sessionsSheet.getRange(appendedRowIndex, 1, 1, readWidth).getValues()[0];
            if (appendedRow[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] !== token ||
                normalizeUserId(appendedRow[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId)) {
                throw new Error('No se pudo confirmar la creación de la sesión; el mismo intento puede reintentarse.');
            }
            sessionData.push(appendedRow);
            matches = [{ rowIndex: appendedRowIndex, row: appendedRow }];
        }
    }
    if (matches.length !== 1) throw new Error('No se pudo confirmar una única fila para la sesión.');
    if (normalizeUserId(matches[0].row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId)) {
        throw new Error('El token de recuperación pertenece a otra cuenta.');
    }

    let currentTokenRowIndex = matches[0].rowIndex;
    if (!record.pointerSet) {
        const pointerRange = userSheet.getRange(userRowIndex, COLS_USERS.SessionToken);
        const currentPointer = pointerRange.getValue();
        let pointerAlreadyReferencesActiveSession = false;
        if (currentPointer && currentPointer !== token) {
            const pointerRows = findSessionRowsByTokenInData_(sessionData, currentPointer);
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
        record.updatedAt = new Date().toISOString();
        requestRowIndex = saveLoginRequestRecord_(loginRequestsSheet, record, requestRowIndex);
    }

    const activeRows = [];
    const expiredRows = [];
    const tokenCounts = new Map();
    const nowForSessionLimit = new Date();
    for (let i = 1; i < sessionData.length; i++) {
        const row = sessionData[i];
        const rowToken = String(row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
        if (rowToken) tokenCounts.set(rowToken, (tokenCounts.get(rowToken) || 0) + 1);
        if (normalizeUserId(row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId) || !rowToken) continue;
        const expiration = getSessionExpirationStatus_(row, nowForSessionLimit);
        const session = {
            rowIndex: i + 1,
            token: rowToken,
            createdAt: expiration.createdAt ? expiration.createdAt.getTime() : 0
        };
        if (expiration.expired) expiredRows.push(session);
        else activeRows.push(session);
    }
    const sessionCount = activeRows.length;
    let cleanupPending = false;
    let oldestSession = null;
    const candidates = [...expiredRows];
    candidates.push(...getOldestSessionsToRevoke_(activeRows, token, sessionLimit));
    candidates.forEach(row => {
        if (tokenCounts.get(row.token) > 1) throw new Error('Existe un token de sesión duplicado; no se modificó la sesión antigua.');
    });
    // Invalidar cachés/contexto antes de retirar tokens de dispositivos anteriores.
    candidates.forEach(row => revokeSharedSessionContext_(userId, row.token));
    const readWidth = Math.max(COLS_ACTIVE_SESSIONS.LastActivityAt, COLS_ACTIVE_SESSIONS.SessionTermsAcceptance);
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
            if (row.rowIndex < currentTokenRowIndex) currentTokenRowIndex--;
        } catch (deleteError) {
            cleanupPending = true;
            const currentMatches = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
            if (currentMatches.length !== 1) throw new Error('No se pudo localizar la sesión actual después de una limpieza parcial.');
            currentTokenRowIndex = currentMatches[0].rowIndex;
        }
    }

    record = { ...record, requestId, userId: normalizeUserId(userId), token, createdAt, createdAtMs: record && record.createdAtMs ? record.createdAtMs : now, status: 'committed', pointerSet: true, committedAt: Date.now(), updatedAt: new Date().toISOString() };
    requestRowIndex = saveLoginRequestRecord_(loginRequestsSheet, record, requestRowIndex);
    let confirmedRow = sessionsSheet.getRange(currentTokenRowIndex, 1, 1, readWidth).getValues()[0];
    if (confirmedRow[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] !== token ||
        normalizeUserId(confirmedRow[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== normalizeUserId(userId)) {
        const confirmedRows = findSessionRowsByTokenUnderLock_(sessionsSheet, token);
        if (confirmedRows.length !== 1) throw new Error('No se pudo confirmar la sesión después de aplicar el límite de sesiones.');
        currentTokenRowIndex = confirmedRows[0].rowIndex;
        confirmedRow = confirmedRows[0].row;
    }
    const termsAcceptance = parseTermsAcceptance_(confirmedRow[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1]);
    SpreadsheetApp.flush();
    return { token, createdAt, sessionCount, oldestSession, cleanupPending, termsAcceptance };
}

function cacheLocalSessionActorAfterLogin_(userId, role, fullName, currentSessionToken) {
    const normalizedId = normalizeUserId(userId);
    const normalizedRole = normalizeRoleName(role);
    if (!normalizedId || !currentSessionToken ||
        !["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"].includes(normalizedRole)) {
        throw new Error("No se pudo registrar una identidad o rol válido en la sesión.");
    }
    const actor = { userId: normalizedId, role: normalizedRole,
        fullName: String(fullName || ""), epoch: 1 };
    let cached = false;
    try {
        cached = cacheSharedSessionActor_(normalizedId, currentSessionToken, actor);
    } catch (cacheError) {
        console.warn("No se pudo precalentar la caché local AUTH; el primer acceso la cargará desde ActiveSessions.",
            cacheError && cacheError.message ? cacheError.message : cacheError);
    }
    return { registered: true, epoch: 1, cachePriming: { local: cached, remote: false } };
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

        const spreadsheet = getAuthUsersSpreadsheet_();
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
            if (!sessionLock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
            sessionLockAcquired = true;
            ensureTermsAcceptanceColumn_(userSheet);
            const currentUserRowIndex = foundUserIndex + 2;
            const matchingUserIdCount = data.filter(row =>
                normalizeUserId(row[COLS_USERS.ID - 1]) === normalizeUserId(userId)
            ).length;
            const currentUserRow = userSheet.getRange(currentUserRowIndex, 1, 1, COLS_USERS.TermsAcceptance).getValues()[0];
            if (matchingUserIdCount !== 1 ||
                normalizeUserId(currentUserRow[COLS_USERS.ID - 1]) !== normalizeUserId(userId) ||
                !isActiveAuthUserRecord(currentUserRow)) {
                throw new Error('La cuenta fue desactivada o su ID dejó de ser único; no se creará una sesión.');
            }

            foundUserRow = currentUserRow;
            const currentPasswordCheck = verifyStoredPassword(
                foundUserRow[COLS_USERS.Password - 1], normalizedPassword
            );
            if (!currentPasswordCheck.matches) {
                invalidCredentials = true;
                throw new Error('Credenciales inválidas.');
            }
            if (currentPasswordCheck.needsRehash) {
                userSheet.getRange(currentUserRowIndex, COLS_USERS.Password)
                    .setValue(createPasswordHash(normalizedPassword, false));
            }
            const activeSessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
            if (!activeSessionsSheet) throw new Error('Hoja ActiveSessions no encontrada.');
            migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(spreadsheet, userSheet);
            ensureActiveSessionsActivityColumn_(activeSessionsSheet);
            ensureSessionTermsAcceptanceColumn_(activeSessionsSheet);
            const roleRevocation = reconcileRoleRevocationUnderLock_(userSheet, activeSessionsSheet, userId, currentUserRowIndex);
            if (roleRevocation.pending) throw new Error('La revocación de sesiones anterior sigue pendiente. Intenta iniciar sesión nuevamente más tarde.');

            const refreshedUserRow = userSheet.getRange(currentUserRowIndex, 1, 1, COLS_USERS.TermsAcceptance).getValues()[0];
            if (normalizeUserId(refreshedUserRow[COLS_USERS.ID - 1]) !== normalizeUserId(userId) ||
                !isActiveAuthUserRecord(refreshedUserRow)) {
                throw new Error('La cuenta cambió durante la recuperación de sesión; no se creará una sesión.');
            }
            foundUserRow = refreshedUserRow;
            const currentUserRole = normalizeRoleName(foundUserRow[COLS_USERS.Privilegios - 1]);
            sessionLimit = SESSION_LIMITS[currentUserRole] ?? 1;

            const loginRequestsSheet = ensureLoginRequestsSheet_(spreadsheet);
            const sessionResult = createOrRecoverLoginSessionUnderLock_(
                userSheet, activeSessionsSheet, loginRequestsSheet, currentUserRowIndex, userId,
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
        cacheLocalSessionActorAfterLogin_(
            userId,
            foundUserRow[COLS_USERS.Privilegios - 1],
            foundUserRow[COLS_USERS.Nombre_Completo - 1],
            sessionToken
        );

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
        return {
            status: 'error',
            code: invalidCredentials ? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED',
            message: error.message
        };
    }
}

function validateSessionReadOnly_(sessionToken, expectedUserId, trustedActor) {
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        if (!lock.tryLock(0)) return { valid: null, unavailable: true, reason: 'session_busy' };
        acquired = true;
        const spreadsheet = getAuthUsersSpreadsheet_();
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) return { valid: null, unavailable: true, reason: 'missing_sheet' };
        migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(spreadsheet, usersSheet);
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
        if (trustedActor && (trustedActor.userId !== userId || !Number.isSafeInteger(trustedActor.epoch) || trustedActor.epoch < 1)) {
            return { valid: false, reason: 'shared_context_identity_mismatch' };
        }
        const expiration = trustedActor ? null : getSessionExpirationStatus_(session.row, new Date());
        if (expiration && expiration.expired) return { valid: false, reason: expiration.reason };
        if (hasPendingRoleRevocation_(userId)) return { valid: null, unavailable: true, reason: 'role_revocation_pending' };
        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (users.length !== 1 || !isActiveAuthUserRecord(users[0].row)) {
            return { valid: false, reason: 'inactive_or_ambiguous_user' };
        }
        if (trustedActor && normalizeRoleName(users[0].row[COLS_USERS.Privilegios - 1]) !== String(trustedActor.role || '').trim().toLowerCase()) {
            return { valid: false, reason: 'role_changed' };
        }
        const createdAtValue = session.row[COLS_ACTIVE_SESSIONS.date - 1];
        const createdAt = createdAtValue instanceof Date ? new Date(createdAtValue.getTime()) : new Date(createdAtValue);
        if (Number.isNaN(createdAt.getTime())) return { valid: null, unavailable: true, reason: 'invalid_session_timestamp' };
        const sessionTermsHeader = String(sessionsSheet.getRange(1, COLS_ACTIVE_SESSIONS.SessionTermsAcceptance).getValue() || '').trim();
        if (sessionTermsHeader && sessionTermsHeader !== 'SessionTermsAcceptance') {
            return { valid: null, unavailable: true, reason: 'terms_schema_conflict' };
        }
        const termsAcceptance = sessionTermsHeader === 'SessionTermsAcceptance'
            ? parseTermsAcceptance_(session.row[COLS_ACTIVE_SESSIONS.SessionTermsAcceptance - 1])
            : { version: '', acceptedAt: '', status: 'pending' };
        return {
            valid: true, userId, createdAt: createdAt.toISOString(),
            lastActivityAt: trustedActor
                ? new Date(trustedActor.lastActivityAt).toISOString()
                : (session.row[COLS_ACTIVE_SESSIONS.LastActivityAt - 1] || session.row[COLS_ACTIVE_SESSIONS.date - 1]),
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
        ['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
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
    const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return normalized;
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
function parseDeviceTermsAcceptanceStore_(value) {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    if (!raw) return { schemaVersion: 1, devices: {}, legacyAcceptance: null };

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (error) { throw new Error('El registro histórico de aceptación de términos no tiene un formato válido; no se modificó.'); }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        parsed.schemaVersion === 1 && parsed.devices && typeof parsed.devices === 'object' &&
        !Array.isArray(parsed.devices)) {
        const devices = {};
        Object.keys(parsed.devices).forEach(deviceId => {
            if (!/^[a-f0-9]{32}$/i.test(deviceId)) {
                throw new Error('El registro de aceptación contiene un identificador de dispositivo inválido; no se modificó.');
            }
            const acceptance = parseTermsAcceptance_(JSON.stringify(parsed.devices[deviceId]));
            if (acceptance.status !== 'accepted') {
                throw new Error('El registro de aceptación de un dispositivo está dañado; no se modificó.');
            }
            devices[deviceId.toLowerCase()] = acceptance;
        });
        let legacyAcceptance = null;
        if (parsed.legacyAcceptance !== null && parsed.legacyAcceptance !== undefined) {
            legacyAcceptance = parseTermsAcceptance_(JSON.stringify(parsed.legacyAcceptance));
            if (legacyAcceptance.status !== 'accepted') {
                throw new Error('El registro histórico de aceptación está dañado; no se modificó.');
            }
        }
        return { schemaVersion: 1, devices, legacyAcceptance };
    }

    // Conserva el registro anterior por usuario como antecedente, pero no lo
    // aplica a dispositivos nuevos: cada combinación usuario/dispositivo acepta una vez.
    const legacyAcceptance = parseTermsAcceptance_(raw);
    if (legacyAcceptance.status === 'accepted') {
        return { schemaVersion: 1, devices: {}, legacyAcceptance };
    }
    throw new Error('El registro histórico de aceptación no se reconoce; no se modificó.');
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

function isRoleRevocationPendingValue_(value) { return String(value || '').startsWith(ROLE_REVOCATION_SHARED_PREFIX); }
function parseRoleRevocationMarker_(raw) {
 if(typeof raw!=='string'||!raw)return null;let marker;try{marker=JSON.parse(raw);}catch(error){return{invalid:true};}
 if(!marker||typeof marker!=='object'||Array.isArray(marker)||!normalizeUserId(marker.userId)||typeof marker.oldRole!=='string'||!marker.oldRole.trim()||typeof marker.newRole!=='string'||!marker.newRole.trim()||!Number.isFinite(Number(marker.markedAt))||!['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(normalizeRoleName(marker.oldRole))||!['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(normalizeRoleName(marker.newRole)))return{invalid:true};
 if(Object.prototype.hasOwnProperty.call(marker,'newFullName')&&(typeof marker.newFullName!=='string'||marker.newFullName.length>120))return{invalid:true};
 return marker;
}
function parseSharedRoleRevocationMarker_(value) {const raw=String(value||'');if(!raw.startsWith(ROLE_REVOCATION_SHARED_PREFIX))return null;return parseRoleRevocationMarker_(raw.slice(ROLE_REVOCATION_SHARED_PREFIX.length));}
function sameRoleRevocationMarker_(a,b) {return Boolean(a&&b&&!a.invalid&&!b.invalid&&normalizeUserId(a.userId)===normalizeUserId(b.userId)&&String(a.oldRole)===String(b.oldRole)&&String(a.newRole)===String(b.newRole)&&Number(a.markedAt)===Number(b.markedAt)&&(Object.prototype.hasOwnProperty.call(a,'newFullName')===Object.prototype.hasOwnProperty.call(b,'newFullName'))&&(!Object.prototype.hasOwnProperty.call(a,'newFullName')||a.newFullName===b.newFullName));}
function migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(spreadsheet, usersSheet) {
    if (!spreadsheet || !usersSheet) throw new Error('No se pudo abrir Users para migrar los marcadores de revocación.');
    const loginRequestsSheet = ensureLoginRequestsSheet_(spreadsheet);
    // Fila 2 es metadato del ledger AUTH; la columna H reserva el estado del baseline de revocación.
    const baselineCell = loginRequestsSheet.getRange(2, 8);
    let baselineState = String(baselineCell.getValue() || '');
    if (baselineState === ROLE_REVOCATION_BASELINE_VERSION_) return { status: 'success', markers: 0, migrated: 0, alreadyComplete: true };
    if (baselineState && baselineState !== ROLE_REVOCATION_BASELINE_PENDING_) throw new Error('El marcador de baseline de revocación AUTH no es válido.');
    if (!baselineState) {
        baselineCell.setValue(ROLE_REVOCATION_BASELINE_PENDING_);
        SpreadsheetApp.flush();
        baselineState = String(baselineCell.getValue() || '');
        if (baselineState !== ROLE_REVOCATION_BASELINE_PENDING_) throw new Error('No se pudo iniciar el baseline de revocación AUTH.');
    }

    // Importación única y reanudable. Las propiedades legacy se leen, pero nunca se escriben ni eliminan.
    const legacy = PropertiesService.getScriptProperties().getProperties();
    const keys = Object.keys(legacy).filter(key => key.startsWith(ROLE_REVOCATION_PROPERTY_PREFIX));
    const userRows = usersSheet.getDataRange().getValues().slice(1)
        .map((row, index) => ({ row, rowIndex: index + 2 }));
    const rowsById = new Map();
    userRows.forEach(item => {
        const id = normalizeUserId(item.row[COLS_USERS.ID - 1]);
        if (!id) return;
        if (!rowsById.has(id)) rowsById.set(id, []);
        rowsById.get(id).push(item);
    });
    const migratedUsers = new Set();
    let migrated = 0;
    for (const key of keys) {
        let userId = '';
        try { userId = decodeURIComponent(key.slice(ROLE_REVOCATION_PROPERTY_PREFIX.length)); }
        catch (error) { throw new Error('Existe un ID inválido en un marcador legacy de revocación.'); }
        if (!userId || migratedUsers.has(userId)) throw new Error('Existe más de un marcador legacy para la misma cuenta.');
        migratedUsers.add(userId);
        const marker = parseRoleRevocationMarker_(String(legacy[key] || ''));
        if (!marker || marker.invalid || normalizeUserId(marker.userId) !== userId) {
            throw new Error('Existe un marcador legacy de revocación dañado o inconsistente.');
        }
        const matches = rowsById.get(userId) || [];
        if (matches.length !== 1 || !isActiveAuthUserRecord(matches[0].row)) {
            throw new Error('La cuenta asociada a un marcador legacy no es única y activa: ' + userId);
        }
        const currentRole = normalizeRoleName(matches[0].row[COLS_USERS.Privilegios - 1]);
        if (currentRole !== normalizeRoleName(marker.oldRole) && currentRole !== normalizeRoleName(marker.newRole)) {
            throw new Error('El rol actual no coincide con el marcador legacy de revocación.');
        }
        const pointer = usersSheet.getRange(matches[0].rowIndex, COLS_USERS.SessionToken);
        const shared = parseSharedRoleRevocationMarker_(String(pointer.getValue() || ''));
        if (shared && shared.invalid) throw new Error('El marcador compartido de revocación está dañado.');
        if (shared && !sameRoleRevocationMarker_(shared, marker)) throw new Error('Los marcadores legacy y compartido de revocación no coinciden.');
        if (!shared) {
            const expected = ROLE_REVOCATION_SHARED_PREFIX + JSON.stringify(marker);
            let writeError = null;
            try { pointer.setValue(expected); } catch (error) { writeError = error; }
            SpreadsheetApp.flush();
            if (String(pointer.getValue() || '') !== expected) {
                throw new Error('No se pudo confirmar el marcador compartido de revocación.' + (writeError ? ' ' + writeError.message : ''));
            }
            migrated++;
        }
    }
    SpreadsheetApp.flush();
    baselineCell.setValue(ROLE_REVOCATION_BASELINE_VERSION_);
    SpreadsheetApp.flush();
    if (String(baselineCell.getValue() || '') !== ROLE_REVOCATION_BASELINE_VERSION_) {
        throw new Error('No se pudo confirmar el baseline de marcadores de revocación AUTH.');
    }
    return { status: 'success', markers: keys.length, migrated, alreadyComplete: false };
}

function migrateLegacyRoleRevocationMarkersToSharedState_() {
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const spreadsheet = getAuthUsersSpreadsheet_();
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!usersSheet) throw new Error('No se encontró la hoja Users.');
        return migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(spreadsheet, usersSheet);
    } finally {
        if (acquired) lock.releaseLock();
    }
}

function hasPendingRoleRevocation_(userId, usersSheetOverride = null) {
    try {
        const usersSheet = usersSheetOverride || getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.USERS);
        if (!usersSheet) return true;
        const matches = usersSheet.getDataRange().getValues().slice(1)
            .filter(row => normalizeUserId(row[COLS_USERS.ID - 1]) === normalizeUserId(userId));
        if (matches.length !== 1 || !isActiveAuthUserRecord(matches[0])) return true;
        return isRoleRevocationPendingValue_(matches[0][COLS_USERS.SessionToken - 1]);
    } catch (error) { return true; }
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
function revokeAllUserSessionsUnderLock_(sheet, userId, beforeClear) {
    const requestRevocation = revokePendingLoginRequestsForUserUnderLock_(userId, sheet.getParent());
    if (requestRevocation.pending) {
        return {
            rows: [], revokedSessions: 0, pendingRows: [],
            pendingLoginRequests: true,
            writeError: requestRevocation.error
        };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        if (typeof beforeClear === "function") beforeClear([]);
        return { rows: [], tokens: [], revokedSessions: 0, pendingRows: [], pendingLoginRequests: false, writeError: null };
    }
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
    const tokens = rows.filter(row => row.token).map(row => row.token);
    // Invalidar cachés/contexto central antes de borrar tokens de ActiveSessions.
    if (typeof beforeClear === "function") beforeClear(tokens);
    if (!tokens.length) {
        return { rows, tokens, revokedSessions: 0, pendingRows: [], pendingLoginRequests: false, writeError: null };
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
            rows, tokens, revokedSessions: 0, pendingRows: rows.filter(row => row.token),
            pendingLoginRequests: false, writeError: writeError || readError
        };
    }
    const pendingRows = rows.filter(row =>
        row.token && String(verified[row.rowIndex - 2][0] || '') !== ''
    );
    const revokedSessions = rows.filter(row =>
        row.token && String(verified[row.rowIndex - 2][0] || '') === ''
    ).length;
    return { rows, tokens, revokedSessions, pendingRows, pendingLoginRequests: false, writeError };
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


function reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, userId, knownRowIndex) {
    const readTargetRows = () => Number.isInteger(knownRowIndex) && knownRowIndex >= 2
        ? [{ row: usersSheet.getRange(knownRowIndex, 1, 1, COLS_USERS.TermsAcceptance).getValues()[0], rowIndex: knownRowIndex }]
        : usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === normalizeUserId(userId));
    let rows = readTargetRows();
    if (rows.length !== 1 || normalizeUserId(rows[0].row[COLS_USERS.ID - 1]) !== normalizeUserId(userId) ||
        !isActiveAuthUserRecord(rows[0].row)) {
        return { pending: true, cleanupPending: true, revokedSessions: 0, error: 'La cuenta destino dejó de ser única o activa.' };
    }
    const shared = parseSharedRoleRevocationMarker_(String(rows[0].row[COLS_USERS.SessionToken - 1] || ''));
    if (shared && shared.invalid) return { pending: true, cleanupPending: true, revokedSessions: 0, error: 'El marcador compartido de revocación está dañado.' };
    if (!shared) return { pending: false, cleanupPending: false, revokedSessions: 0 };
    const marker = shared;
    if (normalizeUserId(marker.userId) !== normalizeUserId(userId)) {
        return { pending: true, cleanupPending: true, revokedSessions: 0, error: 'El marcador de revocación pertenece a otra cuenta.' };
    }

    const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, userId,
        tokens => revokeSharedUserSessionContexts_(userId, tokens));
    if (revocation.pendingRows.length || revocation.pendingLoginRequests) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions,
            pendingTokens: revocation.pendingRows.length, error: revocation.writeError ? revocation.writeError.message : '' };
    }
    rows = readTargetRows();
    if (rows.length !== 1 || normalizeUserId(rows[0].row[COLS_USERS.ID - 1]) !== normalizeUserId(userId) ||
        !isActiveAuthUserRecord(rows[0].row)) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'La cuenta destino dejó de ser única o activa.' };
    }
    const role = String(rows[0].row[COLS_USERS.Privilegios - 1] || '').trim();
    if (role !== marker.newRole && role !== marker.oldRole) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'El rol cambió fuera de la operación pendiente; se requiere revisión.' };
    }
    if (role !== marker.newRole) {
        const roleRange = usersSheet.getRange(rows[0].rowIndex, COLS_USERS.Privilegios);
        let writeError = null;
        try { roleRange.setValue(marker.newRole); } catch (error) { writeError = error; }
        if (String(roleRange.getValue() || '').trim() !== marker.newRole) {
            return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions,
                error: writeError ? writeError.message : 'No se confirmó la escritura del nuevo rol.' };
        }
    }
    if (Object.prototype.hasOwnProperty.call(marker, 'newFullName')) {
        const nameRange = usersSheet.getRange(rows[0].rowIndex, COLS_USERS.Nombre_Completo);
        let nameWriteError = null;
        try { nameRange.setValue(marker.newFullName); } catch (error) { nameWriteError = error; }
        let persistedName = '';
        try { persistedName = String(nameRange.getValue() === null || nameRange.getValue() === undefined ? '' : nameRange.getValue()); }
        catch (error) { return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'No se pudo verificar el nombre completo pendiente: ' + error.message }; }
        if (persistedName !== marker.newFullName) {
            return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions,
                error: nameWriteError ? nameWriteError.message : 'No se confirmó el nombre completo pendiente.' };
        }
    }
    try { SpreadsheetApp.flush(); }
    catch (error) { return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'No se pudo confirmar la escritura del rol y el perfil: ' + error.message }; }
    const confirmedRole = String(usersSheet.getRange(rows[0].rowIndex, COLS_USERS.Privilegios).getValue() || '').trim();
    if (confirmedRole !== marker.newRole) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'El rol no quedó confirmado después de flush.' };
    }
    if (Object.prototype.hasOwnProperty.call(marker, 'newFullName')) {
        const confirmedName = String(usersSheet.getRange(rows[0].rowIndex, COLS_USERS.Nombre_Completo).getValue() || '');
        if (confirmedName !== marker.newFullName) {
            return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'El nombre completo no quedó confirmado después de flush.' };
        }
    }
    const latest = usersSheet.getRange(rows[0].rowIndex, COLS_USERS.SessionToken);
    const latestMarker = parseSharedRoleRevocationMarker_(String(latest.getValue() || ''));
    if (!latestMarker || latestMarker.invalid || !sameRoleRevocationMarker_(latestMarker, marker)) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions, error: 'El marcador compartido cambió antes de completar la revocación.' };
    }
    const deletion = deleteRevokedSessionRowsUnderLock_(sessionsSheet, revocation.rows);
    let clearError = null;
    try { latest.clearContent(); } catch (error) { clearError = error; }
    let remaining = '';
    try { remaining = String(latest.getValue() || ''); } catch (error) { clearError = clearError || error; }
    if (remaining) {
        return { pending: true, cleanupPending: true, revokedSessions: revocation.revokedSessions,
            error: clearError ? clearError.message : 'Users.SessionToken conserva el marcador compartido.' };
    }
    return { pending: false, cleanupPending: deletion.cleanupPending, revokedSessions: revocation.revokedSessions,
        cleanupError: deletion.cleanupError ? deletion.cleanupError.message : '' };
}
function handleUpdateUser(payload) {
    const actor = requireSharedAuthActor_(payload, ["desarrollador", "jefe", "supervisor"], "actualizar usuarios");
    const requesterUserId = actor.userId;
    const userId = normalizeUserId(payload && payload.userId);
    const updates = payload && payload.updates;
    if (!userId || !updates || typeof updates !== "object" || Array.isArray(updates)) throw new Error("Datos insuficientes para actualizar el usuario destino.");
    if (updates.Password) {
        throw new Error('El restablecimiento administrativo de contraseñas debe realizarse mediante AUTH con el rol Desarrollador.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    let roleChanged = false;
    let cleanupPending = false;
    let revokedSessions = 0;
    let targetUsername = '';
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');

        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const targetRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (targetRows.length !== 1 || !isActiveAuthUserRecord(targetRows[0].row)) {
            throw new Error('El usuario destino no existe, está desactivado o su ID no es único.');
        }

        const requesterRole = actor.role;
        const currentTargetRole = String(targetRows[0].row[COLS_USERS.Privilegios - 1] || '').trim();
        const normalizedTargetRole = normalizeRoleName(currentTargetRole);
        const canUpdate = {
            desarrollador: () => true,
            jefe: role => ['supervisor', 'tecnico'].includes(role),
            supervisor: role => role === 'tecnico'
        };
        if (!canUpdate[requesterRole] || !canUpdate[requesterRole](normalizedTargetRole)) {
            throw new Error(`Rol '${requesterRole}' no tiene permisos para modificar a un '${currentTargetRole}'.`);
        }

        const allowedRoles = {
            desarrollador: ['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'],
            jefe: ['supervisor', 'tecnico'],
            supervisor: ['tecnico']
        };
        let nextRole = currentTargetRole;
        if (Object.prototype.hasOwnProperty.call(updates, 'Privilegios') && updates.Privilegios !== undefined && updates.Privilegios !== '') {
            nextRole = String(updates.Privilegios).trim();
            if (!allowedRoles[requesterRole] || !allowedRoles[requesterRole].includes(normalizeRoleName(nextRole))) {
                throw new Error(`El rol no tiene permisos para asignar el privilegio '${nextRole}'.`);
            }
            if (!['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'].includes(nextRole)) {
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

        const sharedMarker = parseSharedRoleRevocationMarker_(String(targetRows[0].row[COLS_USERS.SessionToken - 1] || ''));
        if (sharedMarker && sharedMarker.invalid) throw new Error('Existe un marcador de cambio de rol dañado que requiere revisión.');
        const pendingMarker = sharedMarker, hasPending = Boolean(sharedMarker);
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
        }
        if (nextRole !== currentTargetRole || hasPending) {
            const reconciliation = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, userId, targetRows[0].rowIndex);
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
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.'); acquired = true;
        const spreadsheet = getAuthUsersSpreadsheet_();
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
            const requestRevocation = revokeLoginRequestForTokenUnderLock_(token, userId, spreadsheet);
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
    const actor = requireSharedAuthActor_(payload, ["desarrollador"], "cerrar sesiones de otro usuario");
    const requesterUserId = actor.userId;
    const targetUserId = normalizeUserId(payload && payload.targetUserId);
    if (!targetUserId) throw new Error("Se requiere el usuario destino para cerrar sus sesiones.");

    const lock = LockService.getScriptLock();
    let acquired = false;
    let targetUsername = '';
    let revokedSessions = 0;
    let cleanupPending = false;
    let operationError = null;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(ss, usersSheet);

        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const targetRows = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === targetUserId);
        if (requesterUserId === targetUserId) throw new Error('No puedes cerrar remotamente tu propia sesión desde esta operación.');
        if (targetRows.length !== 1 || !isActiveAuthUserRecord(targetRows[0].row)) {
            throw new Error('El usuario seleccionado no existe, está desactivado o su ID no es único.');
        }

        targetUsername = String(targetRows[0].row[COLS_USERS.Nombre_Usuario - 1] || '');
        if (hasPendingRoleRevocation_(targetUserId)) {
            const reconciliation = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, targetUserId, targetRows[0].rowIndex);
            revokedSessions = reconciliation.revokedSessions || 0;
            cleanupPending = reconciliation.pending || reconciliation.cleanupPending;
            if (reconciliation.pending) {
                operationError = new Error('La revocación de rol pendiente no pudo completarse; reintenta la operación.');
            }
        } else {
            const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, targetUserId,
                tokens => revokeSharedUserSessionContexts_(targetUserId, tokens));
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
    const actor = requireSharedAuthActor_(payload, ["desarrollador", "jefe", "supervisor"], "eliminar usuarios");
    const requesterUserId = actor.userId;
    const userId = normalizeUserId(payload && payload.userId);
    if (!userId) throw new Error("Se requiere el usuario destino para eliminar.");

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    let closedSessions = 0;
    let deletionError = null;
    let alreadyDeleted = false;

    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        lockAcquired = true;

        const spreadsheet = getAuthUsersSpreadsheet_();
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) {
            throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        }

        const sessionsLastRow = sessionsSheet.getLastRow();
        const sessionWidth = Math.max(COLS_ACTIVE_SESSIONS.ID_Usuario, COLS_ACTIVE_SESSIONS.ActiveSessions);
        const sessionsData = [[]].concat(sessionsLastRow >= 2
            ? sessionsSheet.getRange(2, 1, sessionsLastRow - 1, sessionWidth).getValues()
            : []);
        const usersData = usersSheet.getDataRange().getValues();
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

            if (rowId === userId) targetRows.push({ rowIndex: i + 1, row });
        }

        if (requesterUserId === userId) {
            throw new Error('No puedes eliminar tu propia cuenta.');
        }
        if (targetRows.length !== 1) {
            throw new Error(targetRows.length > 1 ? 'ID destino duplicado.' : 'Usuario no encontrado.');
        }

        const target = targetRows[0];
        alreadyDeleted = !isActiveAuthUserRecord(target.row);
        const requesterRole = actor.role;
        const targetRole = normalizeRoleName(target.row[COLS_USERS.Privilegios - 1]);
        const canDelete = {
            desarrollador: () => true,
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
        const targetSessionTokens = [];
        const seenTokens = new Set();
        const tokenCounts = new Map();
        sessionsData.slice(1).forEach(row => {
            const token = String(row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
            if (token) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
        });
        for (let i = 1; i < sessionsData.length; i++) {
            const row = sessionsData[i];
            if (normalizeUserId(row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1]) !== userId) continue;

            const token = String(row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] || '');
            if (token) {
                if (seenTokens.has(token) || tokenCounts.get(token) !== 1) {
                    throw new Error('Token de sesión duplicado; no se modificó ninguna fila.');
                }
                seenTokens.add(token);
                targetSessionTokens.push(token);
            }
            targetSessionRows.push(i + 1);
        }

        const pendingLoginRevocation = revokePendingLoginRequestsForUserUnderLock_(userId, sessionsSheet.getParent());
        if (pendingLoginRevocation.pending) {
            throw new Error('No se pudieron invalidar todos los intentos de login pendientes; la cuenta no fue eliminada.');
        }

        revokeSharedUserSessionContexts_(userId, targetSessionTokens);

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
        // Confirmar la limpieza por identidad; una fila residual mantiene la operación reintentable.
        try {
            const remainingLastRow = sessionsSheet.getLastRow();
            const remainingIds = remainingLastRow >= 2
                ? sessionsSheet.getRange(2, COLS_ACTIVE_SESSIONS.ID_Usuario, remainingLastRow - 1, 1).getValues()
                : [];
            const hasRemainingSessions = remainingIds.some(row => normalizeUserId(row[0]) === userId);
            if (hasRemainingSessions) {
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


// Recuperación autoservicio. CacheService conserva únicamente digests y estados temporales.
function createPasswordRecoveryManager_(dependencies) {
    const deps=dependencies||{},get=deps.get,put=deps.put,remove=deps.remove;
    const now=typeof deps.now==="function"?deps.now:()=>Date.now(),hash=deps.hash,createCode=deps.createCode,createId=deps.createId;
    const challengeTtlSeconds=Number(deps.challengeTtlSeconds)>0?Number(deps.challengeTtlSeconds):600;
    const rateWindowSeconds=Number(deps.rateWindowSeconds)>0?Number(deps.rateWindowSeconds):3600;
    const maxRequests=Number(deps.maxRequests)>0?Number(deps.maxRequests):3,maxAttempts=Number(deps.maxAttempts)>0?Number(deps.maxAttempts):5;
    if(![get,put,remove,hash,createCode,createId].every(value=>typeof value==="function"))throw new Error("Dependencias incompletas para recuperación de contraseña.");
    function normalize_(value){return String(value||"").trim().toLowerCase();}
    function readJson_(key){const raw=get(key);if(!raw)return null;try{const value=JSON.parse(raw);return value&&typeof value==="object"&&!Array.isArray(value)?value:null;}catch(error){return null;}}
    function writeJson_(key,value,ttl){const serialized=JSON.stringify(value);put(key,serialized,Math.max(1,Math.min(21600,Math.ceil(Number(ttl)||1))));if(get(key)!==serialized)throw new Error("No se pudo confirmar el almacenamiento temporal de recuperación.");}
    function challengeKey_(id){return "GPSpedia_PASSWORD_RECOVERY_V1_"+hash("challenge:"+String(id||""));}
    function rateKey_(kind,value){return "GPSpedia_PASSWORD_RECOVERY_RATE_V1_"+hash(kind+":"+normalize_(value));}
    function reserveRequest(username,email,userId){
        const current=Number(now()),identities=[["username",normalize_(username)],["email",normalize_(email)],["user",String(userId||"").trim()]].filter(item=>item[1]);
        if(!Number.isFinite(current)||identities.length<2)return false;
        const records=identities.map(([kind,value])=>{
            const key=rateKey_(kind,value),previous=readJson_(key);
            const valid=previous&&Number.isFinite(Number(previous.windowStartedAt))&&current>=Number(previous.windowStartedAt)&&current-Number(previous.windowStartedAt)<rateWindowSeconds*1000;
            return {key,state:valid?{windowStartedAt:Number(previous.windowStartedAt),count:Math.max(0,Number(previous.count)||0)}:{windowStartedAt:current,count:0}};
        });
        if(records.some(item=>item.state.count>=maxRequests))return false;
        records.forEach(item=>{item.state.count++;writeJson_(item.key,item.state,rateWindowSeconds);});
        return true;
    }
    function issue(userId,email){
        const id=String(userId||"").trim(),normalizedEmail=normalize_(email);if(!id||!normalizedEmail)return null;
        const code=String(createCode()||"").trim().toUpperCase();if(!/^[A-F0-9]{24}$/.test(code))throw new Error("No se pudo generar un código de recuperación válido.");
        const challengeId=String(createId()||"").trim();if(!challengeId)throw new Error("No se pudo generar el identificador de recuperación.");
        const current=Number(now()),challenge={id:challengeId,userId:id,emailDigest:hash("email:"+normalizedEmail),codeDigest:hash("code:"+code),attempts:0,status:"issued",createdAt:current,expiresAt:current+challengeTtlSeconds*1000};
        writeJson_(challengeKey_(id),challenge,challengeTtlSeconds);return {code,challengeId,expiresAt:challenge.expiresAt};
    }
    function verify(userId,email,code){
        const id=String(userId||"").trim(),normalizedEmail=normalize_(email),key=challengeKey_(id),challenge=readJson_(key),current=Number(now());
        if(!challenge||challenge.userId!==id||challenge.status!=="issued"||!Number.isFinite(Number(challenge.expiresAt))||Number(challenge.expiresAt)<=current||
            !constantTimeEquals(String(challenge.emailDigest||""),String(hash("email:"+normalizedEmail)))){
            if(challenge&&Number(challenge.expiresAt)<=current)remove(key);return {valid:false};
        }
        const supplied=String(code||"").replace(/[\s-]/g,"").toUpperCase();
        const matches=/^[A-F0-9]{24}$/.test(supplied)&&constantTimeEquals(String(challenge.codeDigest||""),String(hash("code:"+supplied)));
        if(!matches){challenge.attempts=Math.max(0,Number(challenge.attempts)||0)+1;if(challenge.attempts>=maxAttempts)challenge.status="locked";
            const remaining=Math.ceil((Number(challenge.expiresAt)-current)/1000);if(remaining>0)writeJson_(key,challenge,remaining);else remove(key);
            return {valid:false,locked:challenge.status==="locked"};}
        challenge.status="processing";challenge.processingAt=current;
        const remaining=Math.ceil((Number(challenge.expiresAt)-current)/1000);if(remaining<=0){remove(key);return {valid:false};}
        writeJson_(key,challenge,remaining);return {valid:true,challengeId:challenge.id};
    }
    function finish(userId,challengeId){
        const key=challengeKey_(userId),challenge=readJson_(key);
        if(!challenge||challenge.id!==String(challengeId||"")||challenge.status!=="processing")return false;
        remove(key);return !get(key);
    }
    function invalidate(userId,challengeId){
        const key=challengeKey_(userId),challenge=readJson_(key);
        if(!challenge||(challengeId&&challenge.id!==String(challengeId)))return false;
        remove(key);return !get(key);
    }
    return {reserveRequest,issue,verify,consume:finish,fail:finish,invalidate};
}

function getPasswordRecoveryManager_(){
    const cache=CacheService.getScriptCache();
    // El código aleatorio tiene 96 bits; solo se conserva su digest SHA-256 en CacheService.
    // No se necesita una clave HMAC ni un secreto persistente de configuración.
    const hash=value=>digestToHex(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, String(value||""), Utilities.Charset.UTF_8));
    return createPasswordRecoveryManager_({get:key=>cache.get(key),put:(key,value,ttl)=>cache.put(key,value,ttl),remove:key=>cache.remove(key),
        now:()=>Date.now(),hash,createCode:()=>Utilities.getUuid().replace(/-/g,"").slice(0,24).toUpperCase(),createId:()=>Utilities.getUuid()});
}

function handleRequestPasswordRecovery(payload){
    const generic={status:"success",message:"Si los datos corresponden a una cuenta activa y a su correo registrado, recibirás un código de recuperación."};
    const username=String(payload&&payload.username||"").trim().toLowerCase(),email=String(payload&&payload.email||"").trim().toLowerCase();
    if(!username||!email||username.length>80||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return generic;
    const lock=LockService.getScriptLock();let acquired=false,manager=null,delivery=null,userId="";
    try{
        const ss=getAuthUsersSpreadsheet_(),usersSheet=ss.getSheetByName(SHEET_NAMES.USERS);if(!usersSheet)return generic;
        const matches=usersSheet.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2}))
            .filter(item=>isActiveAuthUserRecord(item.row)&&String(item.row[COLS_USERS.Nombre_Usuario-1]||"").trim().toLowerCase()===username&&
                String(item.row[COLS_USERS.Correo_Electronico-1]||"").trim().toLowerCase()===email);
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');acquired=true;manager=getPasswordRecoveryManager_();
        userId=matches.length===1?normalizeUserId(matches[0].row[COLS_USERS.ID-1]):"";
        if(!manager.reserveRequest(username,email,userId)||matches.length!==1||!userId)return generic;
        const currentRow=usersSheet.getRange(matches[0].rowIndex,1,1,COLS_USERS.TermsAcceptance).getValues()[0];
        if(!isActiveAuthUserRecord(currentRow)||normalizeUserId(currentRow[COLS_USERS.ID-1])!==userId||
            String(currentRow[COLS_USERS.Nombre_Usuario-1]||"").trim().toLowerCase()!==username||
            String(currentRow[COLS_USERS.Correo_Electronico-1]||"").trim().toLowerCase()!==email)return generic;
        const issued=manager.issue(userId,email);if(issued)delivery={email,code:issued.code,challengeId:issued.challengeId,userId};
    }catch(error){return generic;}finally{if(acquired)lock.releaseLock();}
    if(delivery){
        try{MailApp.sendEmail({to:delivery.email,subject:"Recuperación de contraseña de GPSpedia",
            body:"Se solicitó recuperar la contraseña de tu cuenta de GPSpedia.\n\nCódigo de recuperación: "+delivery.code+
                "\n\nEl código vence en 10 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este mensaje."});}
        catch(error){
            let cleanupAcquired=false;
            try{if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');cleanupAcquired=true;if(!manager)manager=getPasswordRecoveryManager_();manager.invalidate(delivery.userId,delivery.challengeId);}
            catch(cleanupError){/* El TTL mantiene limitado el desafío no invalidado. */}
            finally{if(cleanupAcquired)lock.releaseLock();}
        }
    }
    return generic;
}

function handleCompletePasswordRecovery(payload){
    const invalid={status:"error",message:"El código no es válido o expiró, o los datos de recuperación no coinciden."};
    const username=String(payload&&payload.username||"").trim().toLowerCase(),email=String(payload&&payload.email||"").trim().toLowerCase();
    const code=String(payload&&payload.code||"").replace(/[\s-]/g,"").toUpperCase(),newPassword=normalizePassword(payload&&payload.newPassword);
    if(!username||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[A-F0-9]{24}$/.test(code))return invalid;
    if(newPassword.length<8||newPassword.length>256)return {status:"error",message:"La contraseña nueva debe tener entre 8 y 256 caracteres."};
    const lock=LockService.getScriptLock();let acquired=false,userId="",result=null;
    try{
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');acquired=true;
        const ss=getAuthUsersSpreadsheet_(),usersSheet=ss.getSheetByName(SHEET_NAMES.USERS),sessionsSheet=ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if(!usersSheet||!sessionsSheet)throw new Error("No se encontraron las hojas Users y ActiveSessions.");
        migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(ss, usersSheet);
        const matches=usersSheet.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2}))
            .filter(item=>isActiveAuthUserRecord(item.row)&&String(item.row[COLS_USERS.Nombre_Usuario-1]||"").trim().toLowerCase()===username&&
                String(item.row[COLS_USERS.Correo_Electronico-1]||"").trim().toLowerCase()===email);
        if(matches.length!==1)return invalid;
        userId=normalizeUserId(matches[0].row[COLS_USERS.ID-1]);if(!userId)return invalid;
        const manager=getPasswordRecoveryManager_(),verification=manager.verify(userId,email,code);
        if(!verification.valid)return invalid;
        if(!manager.consume(userId,verification.challengeId))throw new Error("No se pudo consumir el código de recuperación. Solicita uno nuevo.");
        const newHash=createPasswordHash(newPassword);
        const revocation=revokeAllUserSessionsUnderLock_(sessionsSheet,userId,
            tokens => revokeSharedUserSessionContexts_(userId, tokens));
        if(revocation.pendingRows.length||revocation.pendingLoginRequests)throw new Error("No se pudo confirmar la revocación de todas las sesiones. Solicita un nuevo código e inténtalo nuevamente.");
        writePasswordHashAndVerifyUnderLock_(usersSheet,matches[0].rowIndex,newHash);
        const pointer=clearUserSessionPointerUnderLock_(usersSheet,matches[0].rowIndex),deletion=deleteRevokedSessionRowsUnderLock_(sessionsSheet,revocation.rows);
        const cleanupPending=Boolean(pointer.pending||deletion.cleanupPending);
        SpreadsheetApp.flush();
        result={status:"success",message:cleanupPending?
            "La contraseña se actualizó y las sesiones fueron invalidadas. La limpieza de algunas referencias quedó pendiente.":
            "La contraseña se actualizó correctamente. Todas las sesiones fueron cerradas; inicia sesión nuevamente.",cleanupPending};
    }finally{if(acquired)lock.releaseLock();}
    // Logs comparte ScriptLock con la purga; nunca solicitarlo mientras AUTH ya lo retiene.
    try{logToSheet("INFO","User password recovered; all session tokens were invalidated.",{userId,revokedSessions:result.revokedSessions,cleanupPending:result.cleanupPending});}catch(logError){}
    return result;
}

function handleChangePassword(payload) {
    const actor = requireSharedAuthActor_(payload, ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"], "cambiar contraseña");
    const userId = actor.userId;
    const requestedUserId = normalizeUserId(payload && payload.userId);
    const currentPassword = payload && payload.currentPassword;
    const newPassword = payload && payload.newPassword;
    if ((requestedUserId && requestedUserId !== userId) || !currentPassword || !newPassword) throw new Error("Datos insuficientes o identidad incorrecta para cambiar la contraseña.");

    const lock = LockService.getScriptLock();
    let acquired = false;
    let revokedSessions = 0;
    let cleanupPending = false;
    let cleanupError = null;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        const matches = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (matches.length !== 1) {
            throw new Error('No se pudo localizar una fila única para la cuenta autenticada.');
        }
        if (!verifyStoredPassword(matches[0].row[COLS_USERS.Password - 1], currentPassword).matches) {
            throw new Error('La contraseña actual es incorrecta.');
        }

        const newHash = createPasswordHash(newPassword);
        const revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, userId,
            tokens => revokeSharedUserSessionContexts_(userId, tokens));
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
    const actor = requireSharedAuthActor_(payload, ["desarrollador"], "restablecer contraseñas");
    const requesterId = actor.userId;
    const targetId = normalizeUserId(payload && payload.targetUserId);
    const newPassword = payload && payload.newPassword;
    if (!targetId || !newPassword) throw new Error("Datos insuficientes para restablecer la contraseña.");

    const lock = LockService.getScriptLock();
    let acquired = false;
    let revokedSessions = 0;
    let cleanupPending = false;
    let cleanupError = null;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        if (requesterId === targetId) throw new Error("Para cambiar tu propia contraseña utiliza la opción Cambiar contraseña del perfil.");
        const users = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }));
        const target = users.filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === targetId);
        if (target.length !== 1 || !isActiveAuthUserRecord(target[0].row)) {
            throw new Error('La cuenta destino no existe, está desactivada o su ID no es único.');
        }
        let revocation;
        if (hasPendingRoleRevocation_(targetId)) {
            const pending = reconcileRoleRevocationUnderLock_(usersSheet, sessionsSheet, targetId, target[0].rowIndex);
            if (pending.pending) throw new Error('La revocación de sesiones por cambio de rol sigue pendiente; reintenta el restablecimiento.');
            revocation = { rows: [], revokedSessions: pending.revokedSessions || 0, pendingRows: [],
                pendingLoginRequests: false, cleanupPending: pending.cleanupPending };
        } else {
            revocation = revokeAllUserSessionsUnderLock_(sessionsSheet, targetId,
                tokens => revokeSharedUserSessionContexts_(targetId, tokens));
        }
        const newHash = createPasswordHash(newPassword);
        revokedSessions = revocation.revokedSessions;
        if (revocation.pendingRows.length || revocation.pendingLoginRequests) {
            throw new Error('No se pudo confirmar la revocación de todas las sesiones y solicitudes de login destino. No se cambió la contraseña; reintenta el restablecimiento.');
        }
        writePasswordHashAndVerifyUnderLock_(usersSheet, target[0].rowIndex, newHash);
        const pointer = clearUserSessionPointerUnderLock_(usersSheet, target[0].rowIndex);
        cleanupPending = Boolean(revocation.cleanupPending) || pointer.pending;
        cleanupError = pointer.error;

        const deletion = deleteRevokedSessionRowsUnderLock_(sessionsSheet, revocation.rows);
        cleanupPending = cleanupPending || deletion.cleanupPending;
        cleanupError = cleanupError || deletion.cleanupError;
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
    const actor = requireSharedAuthActor_(payload, ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"], "aceptar términos");
    const userId = actor.userId;
    const requestedUserId = normalizeUserId(payload && payload.userId);
    const requestedVersion = String(payload && payload.version || '').trim();
    const deviceId = String(payload && payload.deviceId || '').trim().toLowerCase();
    if (requestedUserId && requestedUserId !== userId) throw new Error("La identidad no coincide con la sesión autorizada.");
    if (!/^[a-f0-9]{32}$/.test(deviceId)) throw new Error('No se pudo identificar este dispositivo. Actualiza la página e intenta nuevamente.');
    if (requestedVersion !== TERMS_CURRENT_VERSION) throw new Error('La versión de términos enviada no coincide con la versión vigente. Actualiza la página e intenta nuevamente.');
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.'); acquired = true;
        const spreadsheet = getAuthUsersSpreadsheet_();
        const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
        if (!usersSheet) throw new Error('No se encontró la hoja Users.');
        const userMatches = usersSheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ row, rowIndex: index + 2 }))
            .filter(item => normalizeUserId(item.row[COLS_USERS.ID - 1]) === userId);
        if (userMatches.length !== 1) {
            throw new Error('No se pudo localizar una fila única para registrar la aceptación.');
        }
        ensureTermsAcceptanceColumn_(usersSheet);
        const userCell = usersSheet.getRange(userMatches[0].rowIndex, COLS_USERS.TermsAcceptance);
        const acceptanceStore = parseDeviceTermsAcceptanceStore_(userCell.getValue());
        const currentAcceptance = acceptanceStore.devices[deviceId]
            ? parseTermsAcceptance_(JSON.stringify(acceptanceStore.devices[deviceId]))
            : parseTermsAcceptance_(null);
        if (currentAcceptance.status === 'accepted' && currentAcceptance.version === TERMS_CURRENT_VERSION) {
            return { status: 'success', accepted: true, alreadyAccepted: true, termsAcceptance: currentAcceptance };
        }

        const acceptance = { version: TERMS_CURRENT_VERSION, acceptedAt: new Date().toISOString(), status: 'accepted' };
        acceptanceStore.devices[deviceId] = acceptance;
        const serialized = JSON.stringify(acceptanceStore);
        if (serialized.length > 45000) throw new Error('El historial de dispositivos alcanzó el límite seguro; no se modificó.');
        userCell.setValue(serialized);
        SpreadsheetApp.flush();
        if (String(userCell.getValue() || '') !== serialized) {
            throw new Error('No se pudo confirmar el registro de aceptación. El catálogo permanece bloqueado.');
        }
        return { status: 'success', accepted: true, alreadyAccepted: false, termsAcceptance: acceptance };
    } finally { if (acquired) lock.releaseLock(); }
}
function handleMigrateLegacyPasswords(payload) {
    const actor = requireSharedAuthActor_(payload, ["desarrollador"], "migrar contraseñas heredadas");
    const actorUserId = actor.userId;
    const dryRun = !payload || payload.dryRun !== false;
    const confirmed = Boolean(payload && payload.confirm === true);
    const requestedBatchSize = Number(payload && payload.batchSize);
    const batchSize = Number.isInteger(requestedBatchSize) && requestedBatchSize > 0
        ? Math.min(requestedBatchSize, 10) : 5;
    if (!dryRun && !confirmed) {
        throw new Error('La migración con escritura requiere confirm:true después de revisar el dry-run.');
    }

    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        ensureActiveSessionsActivityColumn_(sessionsSheet);
        const sessionToken = String(payload && payload.sessionToken || "").trim();
        if (sessionToken) {
            const activityRows = findSessionRowsByTokenUnderLock_(sessionsSheet, sessionToken);
            if (activityRows.length === 1) {
                sessionsSheet.getRange(activityRows[0].rowIndex, COLS_ACTIVE_SESSIONS.LastActivityAt).setValue(new Date().toISOString());
            }
        }

        const readCandidates = () => {
            const rows = usersSheet.getDataRange().getValues();
            const candidates = [];
            const activeIds = [];
            let alreadyCurrent = 0, legacyHashedPendingLogin = 0, inactiveSkipped = 0, emptySkipped = 0, unsupportedSkipped = 0;
            for (let i = 1; i < rows.length; i++) {
                const account = rows[i];
                if (isActiveAuthUserRecord(account)) {
                    activeIds.push(normalizeUserId(account[COLS_USERS.ID - 1]).toUpperCase());
                }
            }
            const activeIdCounts = activeIds.reduce((counts, id) => {
                const key = id || '__MISSING_ID__';
                counts[key] = (counts[key] || 0) + 1;
                return counts;
            }, {});
            const ambiguousActiveAccounts = activeIds.filter(id => !id || activeIdCounts[id] > 1).length;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!isActiveAuthUserRecord(row)) { inactiveSkipped++; continue; }
                const stored = String(row[COLS_USERS.Password - 1] === null || row[COLS_USERS.Password - 1] === undefined
                    ? '' : row[COLS_USERS.Password - 1]);
                if (!stored) { emptySkipped++; continue; }
                if (stored.indexOf(PASSWORD_HASH_PREFIX) === 0) {
                    if (/^pbkdf2-sha256\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/i.test(stored)) alreadyCurrent++;
                    else unsupportedSkipped++;
                    continue;
                }
                if (stored.indexOf(LEGACY_PASSWORD_HASH_PREFIX) === 0) {
                    if (/^sha256\$[0-9a-f]{32}\$[0-9a-f]{64}$/i.test(stored)) legacyHashedPendingLogin++;
                    else unsupportedSkipped++;
                    continue;
                }
                if (/^(?:pbkdf2-|\$2[aby]\$|\$argon2|scrypt\$)/i.test(stored)) { unsupportedSkipped++; continue; }
                candidates.push({ rowIndex: i + 1, password: stored });
            }
            return { rows, candidates, alreadyCurrent, legacyHashedPendingLogin, inactiveSkipped, emptySkipped, unsupportedSkipped, ambiguousActiveAccounts };
        };

        const snapshot = readCandidates();
        if (dryRun) {
            return {
                status: 'success', dryRun: true, batchSize,
                eligiblePlaintext: snapshot.candidates.length,
                wouldMigrate: Math.min(snapshot.candidates.length, batchSize),
                alreadyCurrent: snapshot.alreadyCurrent,
                legacyHashedPendingLogin: snapshot.legacyHashedPendingLogin,
                ambiguousActiveAccounts: snapshot.ambiguousActiveAccounts,
                inactiveSkipped: snapshot.inactiveSkipped,
                emptySkipped: snapshot.emptySkipped,
                unsupportedSkipped: snapshot.unsupportedSkipped,
                complete: snapshot.candidates.length === 0,
                resumeMode: 'Repetir la acción; las credenciales ya migradas se omiten automáticamente.'
            };
        }

        if (snapshot.ambiguousActiveAccounts > 0) {
            throw new Error('Migración detenida: hay cuentas activas con ID vacío o duplicado. Resuelve esas ambigüedades y repite el dry-run antes de escribir.');
        }
        const batch = snapshot.candidates.slice(0, batchSize);
        let migrated = 0;
        for (const item of batch) {
            const hash = createPasswordHash(item.password, false);
            const cell = usersSheet.getRange(item.rowIndex, COLS_USERS.Password);
            cell.setValue(hash);
            if (String(cell.getValue() || '') !== hash) {
                throw new Error('No se pudo verificar la actualización de una credencial. La migración puede reanudarse sin repetir hashes confirmados.');
            }
            migrated++;
        }
        SpreadsheetApp.flush();
        const remaining = readCandidates();
        return {
            status: 'success', dryRun: false, batchSize, migrated,
            remainingPlaintext: remaining.candidates.length,
            alreadyCurrent: remaining.alreadyCurrent,
            legacyHashedPendingLogin: remaining.legacyHashedPendingLogin,
            unsupportedSkipped: remaining.unsupportedSkipped,
            complete: remaining.candidates.length === 0,
            resumeMode: remaining.candidates.length
                ? 'Repetir la acción con confirm:true para continuar; las filas ya migradas se omiten.'
                : 'Migración de contraseñas plaintext completada.'
        };
    } finally {
        if (acquired) lock.releaseLock();
    }
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
        if (!lock.tryLock(0)) throw new Error('AUTH está ocupado; la operación solicitada no esperó por otra ejecución. Intenta nuevamente.');
        acquired = true;
        const ss = getAuthUsersSpreadsheet_();
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        if (!sessionsSheet || !usersSheet) throw new Error('No se encontraron las hojas Users y ActiveSessions.');
        migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_(ss, usersSheet);

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

            const requestRevocation = revokeLoginRequestForTokenUnderLock_(sessionToken, requestedUserId, ss);
            if (requestRevocation.pending) {
                throw new Error('No se pudo confirmar la invalidación del intento de login asociado. Reintenta el cierre.');
            }

            revokeSharedSessionContext_(requestedUserId, sessionToken);
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

            const requestRevocation = revokeLoginRequestForTokenUnderLock_(sessionToken, requestedUserId, ss);
            if (requestRevocation.pending) {
                throw new Error('No se pudo confirmar la invalidación del intento de login asociado. Reintenta el cierre.');
            }
            revokeSharedSessionContext_(requestedUserId, sessionToken);
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

// MIG-012: gestión de usuarios integrada en AUTH; no depende de un endpoint USERS.
let authSpreadsheet = null;
function getAuthUsersSpreadsheet_() {
    if (authSpreadsheet === null) {
        authSpreadsheet = SpreadsheetApp.openById(GPSpediaSpreadsheetId_);
        if (!authSpreadsheet) throw new Error("No se pudo abrir la Spreadsheet central configurada para AUTH.");
    }
    return authSpreadsheet;
}


// Inicialización manual de la estructura central.
// Ejecutar únicamente desde el editor del proyecto AUTH y sobre la Spreadsheet central configurada.
// No publica una revisión ni introduce endpoints, IDs o valores operativos.
// No usa ScriptLock para no competir con el login ni con otras operaciones de AUTH.
function initializeCentralConfigurationSheets() {
    const spreadsheet = getAuthUsersSpreadsheet_();
    const definitions = [
        { name: "ConfiguracionControl", headers: ["control_key", "schema_version", "active_revision", "publication_state", "published_at", "updated_by", "change_reason"] },
        { name: "ConfiguracionEsquema", headers: ["config_key", "entity_type", "value_type", "scope_allowed", "visibility_allowed", "required", "default_json", "validation_rule", "introduced_schema_version", "deprecated_schema_version", "replacement_key", "owner_service", "description"] },
        { name: "Servicios", headers: ["config_revision", "service_key", "endpoint_url", "enabled", "contract_version", "min_client_version", "health_action", "updated_at", "updated_by", "change_reason"] },
        { name: "ConfiguracionParametros", headers: ["config_revision", "config_key", "value_json", "value_type", "scope", "visibility", "enabled", "default_json", "validation_rule", "schema_version", "updated_at", "updated_by", "change_reason"] },
        { name: "ConfiguracionRecursos", headers: ["config_revision", "resource_key", "resource_type", "resource_id", "scope", "visibility", "enabled", "expected_parent_id", "expected_name", "updated_at", "updated_by", "change_reason"] },
        { name: "ConfiguracionHistorial", headers: ["history_id", "config_revision", "entity_type", "entity_key", "operation", "previous_value_json", "new_value_json", "actor_id", "changed_at", "change_reason", "rollback_of_revision", "schema_version"] }
    ];

    const createdSheets = [];
    const initializedSheets = [];
    const preservedSheets = [];

    definitions.forEach(function(definition) {
        let sheet = spreadsheet.getSheetByName(definition.name);
        if (!sheet) {
            try {
                sheet = spreadsheet.insertSheet(definition.name);
                createdSheets.push(definition.name);
            } catch (createError) {
                // Otra ejecución pudo crear la misma pestaña entre la consulta y la inserción.
                sheet = spreadsheet.getSheetByName(definition.name);
                if (!sheet) throw createError;
            }
        }

        const lastRow = sheet.getLastRow();
        const lastColumn = sheet.getLastColumn();
        if (lastRow === 0 && lastColumn === 0) {
            sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
            sheet.setFrozenRows(1);
            initializedSheets.push(definition.name);
            return;
        }
        if (lastRow < 1 || lastColumn < 1) {
            throw new Error("La hoja " + definition.name + " contiene datos sin una fila de encabezados válida. No se modificó.");
        }

        const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
            .map(function(value) { return String(value === null || value === undefined ? "" : value).trim(); });
        const positions = {};
        currentHeaders.forEach(function(header) {
            if (!header) return;
            if (Object.prototype.hasOwnProperty.call(positions, header)) {
                throw new Error("La hoja " + definition.name + " contiene encabezados duplicados. No se modificó.");
            }
            positions[header] = true;
        });
        const missing = definition.headers.filter(function(header) {
            return !Object.prototype.hasOwnProperty.call(positions, header);
        });
        if (missing.length) {
            throw new Error("La hoja " + definition.name + " ya contiene información, pero no cumple el esquema. Faltan: " + missing.join(", ") + ". No se sobrescribió.");
        }
        preservedSheets.push(definition.name);
    });

    SpreadsheetApp.flush();
    definitions.forEach(function(definition) {
        const sheet = spreadsheet.getSheetByName(definition.name);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
            .map(function(value) { return String(value === null || value === undefined ? "" : value).trim(); });
        const missing = definition.headers.filter(function(header) { return headers.indexOf(header) < 0; });
        if (missing.length) throw new Error("No se pudo confirmar la estructura de " + definition.name + ": " + missing.join(", ") + ".");
    });

    return {
        status: "success",
        spreadsheetName: spreadsheet.getName(),
        createdSheets: createdSheets,
        initializedSheets: initializedSheets,
        preservedSheets: preservedSheets,
        publicationReady: false,
        message: "Estructura creada y verificada. Aún faltan los datos operativos y la publicación de una revisión válida."
    };
}

function getAuthUserActor_(payload,allowedRoles,actionLabel,requireUserRow){const actor=requireSharedAuthActor_(payload,allowedRoles,actionLabel),requestedUserId=normalizeUserId(payload&&payload.userId);if(!requestedUserId||requestedUserId!==actor.userId)throw new Error("Acceso no autorizado: el contexto de sesión no coincide con la identidad solicitada.");let userRowIndex=null;if(requireUserRow===true){const usersSheet=getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.USERS),matches=findUniqueRowsByExactValue_(usersSheet,COLS_USERS.ID,actor.userId,true);if(matches.length!==1)throw new Error("No se encontró una fila única para actualizar el perfil autenticado.");userRowIndex=matches[0].rowIndex;}return {userId:actor.userId,role:actor.role,userRowIndex,epoch:actor.epoch};}
function findUniqueRowsByExactValue_(sheet,column,value,trimCell=false) {
    if (!sheet || !value) return [];
    const lastRow = Number(sheet.getLastRow ? sheet.getLastRow() : 0);
    if (lastRow < 2) return [];
    const expected = String(value), range = sheet.getRange(2,column,lastRow-1,1);
    let rowNumbers = [];
    if (range && typeof range.createTextFinder === "function") {
        const finder = range.createTextFinder(expected);
        if (finder && typeof finder.matchCase === "function") finder.matchCase(true);
        if (finder && typeof finder.matchEntireCell === "function") finder.matchEntireCell(!trimCell);
        const matches = finder && typeof finder.findAll === "function" ? finder.findAll() || [] : [];
        rowNumbers = matches.map(cell => cell.getRow());
    } else {
        const values = range.getValues();
        for (let i=0;i<values.length;i++) {
            const actual = String(values[i][0] === null || values[i][0] === undefined ? "" : values[i][0]);
            if ((trimCell ? actual.trim() : actual) === expected) rowNumbers.push(i+2);
        }
    }
    return rowNumbers.map(rowIndex => {
        const cell = sheet.getRange(rowIndex,column,1,1).getValue();
        const actual = String(cell === null || cell === undefined ? "" : cell);
        return {rowIndex,actual:trimCell ? actual.trim() : actual};
    }).filter(item => item.actual === expected).map(item => ({rowIndex:item.rowIndex}));
}

function isActiveUserRecord(row) {
    if (!row) return false;
    const username = String(row[COLS_USERS.Nombre_Usuario - 1] || '').trim();
    const rawRole = String(row[COLS_USERS.Privilegios - 1] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const role = rawRole;
    return Boolean(username) && !username.startsWith('__deleted__:') &&
        ['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
}

function handleGetUsers(payload) {
    const { role: requesterRole } = getAuthUserActor_(payload, ["desarrollador", "jefe", "supervisor"], "consultar usuarios");

    if (!['desarrollador', 'jefe', 'supervisor'].includes(requesterRole)) {
        throw new Error('Acceso denegado. Permisos insuficientes.');
    }

    const userSheet = getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.USERS);
    const lastRow = userSheet.getLastRow();
    const data = lastRow > 1
        ? userSheet.getRange(1, 1, lastRow, COLS_USERS.Nombre_Completo).getValues()
        : [];
    data.shift(); // Remove headers

    const users = data
        .filter(row => {
            if (!isActiveUserRecord(row)) return false;
            const role = row[COLS_USERS.Privilegios - 1];
            const targetRole = String(role || '').trim().toLowerCase();
            if (requesterRole === 'desarrollador') return true;
            if (requesterRole === 'jefe') return ['supervisor', 'tecnico'].includes(targetRole);
            if (requesterRole === 'supervisor') return targetRole === 'tecnico';
            return false;
        })
        .map(row => {
            return {
                ID: row[COLS_USERS.ID - 1],
                Nombre_Usuario: row[COLS_USERS.Nombre_Usuario - 1],
                Privilegios: row[COLS_USERS.Privilegios - 1],
                Telefono: row[COLS_USERS.Telefono - 1],
                Correo_Electronico: row[COLS_USERS.Correo_Electronico - 1],
                Nombre_Completo: row[COLS_USERS.Nombre_Completo - 1]
            };
        });

    return { status: 'success', users: users };
}

function parseUserIdSequenceFormula_(formula) {
    const raw = String(formula || "").trim();
    const match = /^=\s*"([^"]{1,40})"\s*&\s*(?:TEXTO|TEXT)\s*\(\s*(?:FILA|ROW)\s*\(\s*\)\s*-\s*\d+\s*,\s*"([0]+)"\s*\)\s*$/i.exec(raw);
    return match ? { prefix: match[1], padding: match[2].length, formula: raw } : null;
}

function readUsersMutationSnapshot_(userSheet) {
    const lastRow = userSheet.getLastRow();
    const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.TermsAcceptance);
    const rowCount = Math.max(0, lastRow - 1);
    const range = rowCount ? userSheet.getRange(2, 1, rowCount, lastColumn) : null;
    return {
        lastRow,
        lastColumn,
        rows: range ? range.getValues() : [],
        formulas: range ? range.getFormulas() : []
    };
}

function getUserIdSequencePattern_(userSheet, snapshot) {
    const configHeaders = ["sheet","column","header","prefix","padding","formula","updatedAt"];
    const configSheet = getAuthUsersSpreadsheet_().getSheetByName("__IdentifierSequenceConfig__");
    if (configSheet && configSheet.getLastRow() > 1) {
        const headers = configSheet.getRange(1, 1, 1, configHeaders.length).getValues()[0].map(value => String(value || ""));
        if (JSON.stringify(headers) !== JSON.stringify(configHeaders)) {
            throw new Error("La configuración central de IDs no tiene un esquema compatible.");
        }
        const rows = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configHeaders.length).getValues();
        const matches = rows.filter(row => String(row[0]) === "Users" && Number(row[1]) === COLS_USERS.ID);
        if (matches.length > 1) throw new Error("La configuración de IDs de Users está duplicada.");
        if (matches.length === 1) {
            const pattern = { prefix: String(matches[0][3] || ""), padding: Number(matches[0][4]), formula: String(matches[0][5] || "") };
            if (String(userSheet.getRange(1, COLS_USERS.ID).getValue() || "").trim() !== String(matches[0][2] || "") ||
                !pattern.prefix || !pattern.formula || !Number.isInteger(pattern.padding) || pattern.padding < 1 || pattern.padding > 20) {
                throw new Error("La configuración backend de IDs no coincide con la columna Users.");
            }
            const formulas = snapshot
                ? snapshot.formulas.map(row => row[COLS_USERS.ID - 1] || "")
                : (() => {
                    const lastRow = userSheet.getLastRow();
                    return lastRow > 1 ? userSheet.getRange(2, COLS_USERS.ID, lastRow - 1, 1).getFormulas().flat() : [];
                })();
            if (formulas.some(formula => formula && formula !== pattern.formula)) {
                throw new Error("La columna Users.ID contiene una fórmula distinta de la configuración backend.");
            }
            return pattern;
        }
    }
    const formulas = snapshot
        ? snapshot.formulas.map(row => row[COLS_USERS.ID - 1] || "").filter(Boolean)
        : (() => {
            const lastRow = userSheet.getLastRow();
            return lastRow > 1 ? userSheet.getRange(2, COLS_USERS.ID, lastRow - 1, 1).getFormulas().flat().filter(Boolean) : [];
        })();
    if (!formulas.length) return { prefix: "USR-", padding: 4, formula: "" };
    const patterns = formulas.map(parseUserIdSequenceFormula_);
    if (patterns.some(pattern => !pattern)) throw new Error("La fórmula histórica de Users.ID no es compatible con un generador backend seguro.");
    const first = patterns[0];
    if (patterns.some(pattern => pattern.prefix !== first.prefix || pattern.padding !== first.padding || pattern.formula !== first.formula)) {
        throw new Error("Users.ID contiene fórmulas con formatos diferentes; se requiere revisión.");
    }
    return first;
}

// Genera IDs permanentes secuenciales. La columna ID se escribe como valor,
// nunca se copia ni se conserva su fórmula en las filas nuevas.
function generateNextUserId_(userSheet, snapshot) {
    const pattern = getUserIdSequencePattern_(userSheet, snapshot);
    const lastRow = snapshot ? snapshot.lastRow : userSheet.getLastRow();
    const lastColumn = snapshot ? snapshot.lastColumn : Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
    const rows = snapshot
        ? snapshot.rows
        : (lastRow > 1 ? userSheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : []);
    const seen = new Set();
    let maxSequence = 0;

    rows.forEach((row, index) => {
        const id = String(row[COLS_USERS.ID - 1] === null || row[COLS_USERS.ID - 1] === undefined
            ? '' : row[COLS_USERS.ID - 1]).trim();
        const hasAccountData = row.slice(1).some(value =>
            String(value === null || value === undefined ? '' : value).trim() !== ''
        );
        if (!hasAccountData && !id) return;
        if (!hasAccountData) return;
        if (!id) throw new Error('Existe una fila de usuario con datos pero sin ID. No se creó la cuenta.');
        if (!id.toUpperCase().startsWith(pattern.prefix.toUpperCase()) || !/^\d+$/.test(id.slice(pattern.prefix.length))) {
            throw new Error('El ID de usuario de la fila ' + (index + 2) + ' no coincide con el formato backend configurado.');
        }
        const normalizedId = id.toUpperCase();
        if (seen.has(normalizedId)) throw new Error('Se detectó un ID de usuario duplicado. No se creó la cuenta.');
        seen.add(normalizedId);
        const suffix = Number(id.slice(pattern.prefix.length));
        if (!Number.isSafeInteger(suffix) || suffix < 1) throw new Error('El sufijo del ID de usuario no es un entero positivo seguro.');
        maxSequence = Math.max(maxSequence, suffix);
    });

    if (!Number.isSafeInteger(maxSequence) || maxSequence >= Number.MAX_SAFE_INTEGER) {
        throw new Error('Se agotó el rango disponible para generar IDs de usuario.');
    }
    return pattern.prefix + String(maxSequence + 1).padStart(pattern.padding, '0');
}

// Reutiliza la primera fila sin datos de cuenta. Si la hoja tiene fórmulas
// prellenadas en Users.ID, la escritura del ID fijo sustituye la fórmula de esa fila.
function findNextUserRow_(userSheet, snapshot) {
    const lastRow = snapshot ? snapshot.lastRow : userSheet.getLastRow();
    if (lastRow < 2) return 2;

    const lastColumn = snapshot ? snapshot.lastColumn : Math.max(userSheet.getLastColumn(), COLS_USERS.TermsAcceptance);
    const rows = snapshot
        ? snapshot.rows.map(row => row.slice(COLS_USERS.Nombre_Usuario - 1, lastColumn))
        : userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, lastColumn - 1).getValues();
    const formulas = snapshot
        ? snapshot.formulas.map(row => row.slice(COLS_USERS.Nombre_Usuario - 1, lastColumn))
        : userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, lastColumn - 1).getFormulas();
    for (let i = 0; i < rows.length; i++) {
        const valuesEmpty = rows[i].every(value =>
            String(value === null || value === undefined ? '' : value).trim() === ''
        );
        const formulasEmpty = formulas[i].every(formula => !String(formula || '').trim());
        if (valuesEmpty && formulasEmpty) return i + 2;
    }
    return lastRow + 1;
}

// Nombre de usuario: el backend acepta solo texto y aplica la política común de identidad.
function normalizeUsername_(value) {
    if (typeof value !== 'string') throw new Error('El nombre de usuario debe ser texto.');
    const normalized = value.trim();
    if (!normalized) throw new Error('El nombre de usuario es obligatorio.');
    if (normalized.toLowerCase().startsWith('__deleted__:')) {
        throw new Error('El prefijo __deleted__: está reservado para cuentas desactivadas.');
    }
    return normalized;
}

// Serializa únicamente la creación de cuentas: username e ID deben ser únicos.
// Es fail-fast; no mantiene solicitudes ordinarias esperando por el lock global.
function withUsersMutationLock_(operation) {
    const lock = LockService.getScriptLock();
    let acquired = false;
    try { acquired = lock.tryLock(0); } catch (error) { acquired = false; }
    if (!acquired) throw new Error('El servidor está ocupado. Por favor intenta de nuevo en unos momentos.');
    try {
        return operation();
    } finally {
        if (acquired) lock.releaseLock();
    }
}

const USERS_ALLOWED_ROLES_ = Object.freeze(['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior']);

function normalizeNewUserInput_(newUser) {
    if (!newUser || typeof newUser !== 'object' || Array.isArray(newUser)) {
        throw new Error('Los datos del nuevo usuario no tienen un formato válido.');
    }
    const allowedKeys = ['Nombre_Usuario', 'Password', 'Privilegios', 'Telefono', 'Correo_Electronico', 'Nombre_Completo'];
    Object.keys(newUser).forEach(key => {
        if (!allowedKeys.includes(key)) throw new Error("La propiedad '" + key + "' no está permitida para crear usuarios.");
    });
    const username = normalizeUsername_(newUser.Nombre_Usuario);
    if (username.length > 80) throw new Error('El nombre de usuario no puede superar 80 caracteres.');
    if (typeof newUser.Password !== 'string' || normalizePassword(newUser.Password).length < 8 || normalizePassword(newUser.Password).length > 256) {
        throw new Error('La contraseña debe contener entre 8 y 256 caracteres después de quitar espacios externos.');
    }
    if (typeof newUser.Privilegios !== 'string' || !USERS_ALLOWED_ROLES_.includes(newUser.Privilegios)) {
        throw new Error('El privilegio solicitado no es válido.');
    }
    const optionalText = (key, maxLength) => {
        const value = newUser[key] === undefined || newUser[key] === null ? '' : newUser[key];
        if (typeof value !== 'string') throw new Error("El campo '" + key + "' debe ser texto.");
        const normalized = value.trim();
        if (normalized.length > maxLength) throw new Error("El campo '" + key + "' supera la longitud permitida.");
        return normalized;
    };
    const phone = optionalText('Telefono', 30);
    const email = optionalText('Correo_Electronico', 254);
    const fullName = optionalText('Nombre_Completo', 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('El correo electrónico no tiene un formato válido.');
    }
    if (phone && !/^[0-9+().\-\s]+$/.test(phone)) throw new Error('El teléfono contiene caracteres no permitidos.');
    return {
        username,
        password: normalizePassword(newUser.Password),
        role: newUser.Privilegios,
        phone,
        email,
        fullName
    };
}

function normalizeUserProfileUpdates_(updates) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw new Error('Los cambios del perfil no tienen un formato válido.');
    }
    const keys = Object.keys(updates);
    if (!keys.length) throw new Error('No se recibieron campos para actualizar.');
    keys.forEach(key => {
        if (key !== 'Nombre_Completo') throw new Error("El campo '" + key + "' no está permitido en la actualización del perfil.");
    });
    if (typeof updates.Nombre_Completo !== 'string') throw new Error('El nombre completo debe ser texto.');
    const fullName = updates.Nombre_Completo.trim();
    if (!fullName || fullName.length > 120) throw new Error('El nombre completo debe contener entre 1 y 120 caracteres.');
    return { Nombre_Completo: fullName };
}

function findUniqueUserRow_(userSheet, userId) {
    const normalizedId = String(userId === null || userId === undefined ? '' : userId).trim();
    if (!normalizedId) throw new Error('El ID de usuario es obligatorio.');
    const lastRow = userSheet.getLastRow();
    if (lastRow < 2) throw new Error('Usuario no encontrado.');
    const matches = userSheet.getRange(2, COLS_USERS.ID, lastRow - 1, 1).getValues()
        .map((row, index) => ({ id: String(row[0] === null || row[0] === undefined ? '' : row[0]).trim(), rowIndex: index + 2 }))
        .filter(item => item.id === normalizedId);
    if (matches.length !== 1) {
        throw new Error(matches.length > 1
            ? 'El ID de usuario está duplicado; no se modificó ninguna fila.'
            : 'Usuario no encontrado.');
    }
    return matches[0].rowIndex;
}

function writeUserRangeAtomically_(userSheet, rowIndex, columnIndex, values) {
    const range = userSheet.getRange(rowIndex, columnIndex, values.length, values[0].length);
    const previousValues = range.getValues();
    const previousFormulas = range.getFormulas();
    let writeError = null;
    try {
        range.setValues(values);
        SpreadsheetApp.flush();
        const persisted = range.getValues();
        if (JSON.stringify(persisted) !== JSON.stringify(values)) {
            throw new Error('La hoja no confirmó todos los valores solicitados.');
        }
        return true;
    } catch (error) {
        writeError = error;
    }
    let rollbackError = null;
    try {
        range.setValues(previousValues);
        for (let r = 0; r < previousFormulas.length; r++) {
            for (let c = 0; c < previousFormulas[r].length; c++) {
                if (previousFormulas[r][c]) {
                    userSheet.getRange(rowIndex + r, columnIndex + c).setFormula(previousFormulas[r][c]);
                }
            }
        }
        SpreadsheetApp.flush();
        const restored = range.getValues();
        const formulasRestored = range.getFormulas();
        if (JSON.stringify(restored) !== JSON.stringify(previousValues) ||
            JSON.stringify(formulasRestored) !== JSON.stringify(previousFormulas)) {
            throw new Error('La restauración no pudo verificarse.');
        }
    } catch (error) {
        rollbackError = error;
    }
    throw new Error((writeError && writeError.message ? writeError.message : 'Falló la escritura del usuario.') +
        (rollbackError ? ' Además, la restauración requiere revisión: ' + rollbackError.message : ' Se restauraron los valores anteriores.'));
}

function writeUserProfileNameNonBlocking_(userSheet, rowIndex, fullName) {
    const cell = userSheet.getRange(rowIndex, COLS_USERS.Nombre_Completo);
    let writeError = null;
    try {
        cell.setValue(fullName);
        SpreadsheetApp.flush();
    } catch (error) {
        writeError = error;
    }

    let persisted;
    try {
        const rawPersisted = cell.getValue();
        persisted = String(rawPersisted === null || rawPersisted === undefined ? "" : rawPersisted);
    } catch (readError) {
        throw new Error((writeError && writeError.message ? writeError.message : "No se pudo confirmar el perfil.") +
            " No fue posible verificar el valor persistido.");
    }
    if (persisted !== fullName) {
        throw new Error((writeError && writeError.message ? writeError.message + " " : "") +
            "La actualización no quedó confirmada; consulta el perfil antes de volver a intentarlo.");
    }
    // Escritura de una sola celda: no restaurar un snapshot antiguo, porque
    // podría sobrescribir una edición concurrente posterior (last-write-wins).
    return true;
}

function handleCreateUser(payload) {
    const { newUser, sessionToken } = payload || {};
    if (!newUser || typeof sessionToken !== 'string' || !sessionToken.trim()) {
        throw new Error('Datos insuficientes para crear el usuario. Se requiere sessionToken.');
    }
    const normalized = normalizeNewUserInput_(newUser);
    const { role: creatorRole } = getAuthUserActor_(payload, ["desarrollador", "jefe", "supervisor"], "crear usuarios");
    const allowedRoles = {
        'desarrollador': ['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'],
        'jefe': ['Supervisor', 'Tecnico'],
        'supervisor': ['Tecnico']
    };
    if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(normalized.role)) {
        throw new Error("El rol '" + creatorRole + "' no tiene permisos para crear usuarios de tipo '" + normalized.role + "'.");
    }
    const passwordHash = createPasswordHash(normalized.password);

    return withUsersMutationLock_(() => {
        const userSheet = getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.USERS);
        if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
        const snapshot = readUsersMutationSnapshot_(userSheet);
        const lastRow = snapshot.lastRow;
        const existingUsernames = snapshot.rows.map(row => row[COLS_USERS.Nombre_Usuario - 1]);
        if (existingUsernames.some(username => String(username || '').trim().toLowerCase() === normalized.username.toLowerCase())) {
            return { status: 'error', message: 'Ese nombre de usuario no está disponible' };
        }

        const newRowNumber = findNextUserRow_(userSheet, snapshot);
        const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
        const newRowRange = userSheet.getRange(newRowNumber, 1, 1, COLS_USERS.SessionToken);
        const currentRow = newRowRange.getValues()[0];
        if (currentRow.slice(1).some(value => String(value === null || value === undefined ? '' : value).trim() !== '')) {
            throw new Error('La fila seleccionada para el nuevo usuario dejó de estar vacía. Intenta nuevamente.');
        }
        const newUserId = generateNextUserId_(userSheet, snapshot);

        // Copiar únicamente formato y validaciones al extender la hoja; nunca fórmulas.
        if (lastRow > 0 && newRowNumber > lastRow) {
            const previousRow = userSheet.getRange(lastRow, 1, 1, lastColumn);
            const destinationRow = userSheet.getRange(newRowNumber, 1, 1, lastColumn);
            previousRow.copyTo(destinationRow, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            previousRow.copyTo(destinationRow, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
        }
        const rowValues = [[newUserId, normalized.username, passwordHash, normalized.role,
            normalized.phone, normalized.email, normalized.fullName, '']];
        writeUserRangeAtomically_(userSheet, newRowNumber, COLS_USERS.ID, rowValues);
        return { status: 'success', message: "Usuario '" + normalized.username + "' creado." };
    });
}

function handleUpdateProfile(payload) {
    const userId = String(payload && payload.userId === undefined ? '' : payload && payload.userId || '').trim();
    const updates = normalizeUserProfileUpdates_(payload && payload.updates);
    const sessionToken = payload && payload.sessionToken;
    if (!userId || typeof sessionToken !== 'string' || !sessionToken.trim()) throw new Error('Datos insuficientes.');

    const { userId: authenticatedUserId, userRowIndex } = getAuthUserActor_(payload, ["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"], "actualizar perfil", true);
    if (String(authenticatedUserId).trim() !== userId) {
        throw new Error('Acceso no autorizado: Solo puedes editar tu propio perfil.');
    }
    const userSheet = getAuthUsersSpreadsheet_().getSheetByName(SHEET_NAMES.USERS);
    if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
    const rowIndex = userRowIndex;
    if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error('No se pudo confirmar la fila del perfil autenticado.');
    writeUserProfileNameNonBlocking_(userSheet, rowIndex, updates.Nombre_Completo);
    return { status: 'success', message: 'Perfil actualizado correctamente.' };
}


