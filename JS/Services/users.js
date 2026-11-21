// ============================================================================
// GPSPEDIA-USERS SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.4.2

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os";
let spreadsheet = null;

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

const SHEET_NAMES = {
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions"
};

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
const ROLE_REVOCATION_SHARED_PREFIX = "__role_revocation_pending__:";
function hasPendingRoleRevocationForUser_(userRow) { return String(userRow && userRow[COLS_USERS.SessionToken - 1] || '').startsWith(ROLE_REVOCATION_SHARED_PREFIX); }

const COLS_ACTIVE_SESSIONS = {
    ID_Usuario: 1,
    Usuario: 2,
    ActiveSessions: 3,
    date: 4,
    Logs: 5,
    LastActivityAt: 6
};

// ============================================================================
// HASH DE CONTRASEÑAS (FORMATO COMPARTIDO CON AUTH)
// ============================================================================
const PASSWORD_HASH_PREFIX = 'pbkdf2-sha256$';
const LEGACY_PASSWORD_HASH_PREFIX = 'sha256$';
const PASSWORD_KDF_ITERATIONS = 12000;
const PASSWORD_KDF_MIN_ITERATIONS = 1000;
const PASSWORD_KDF_MAX_ITERATIONS = 200000;

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

function createPasswordHash(password) {
    const normalizedPassword = normalizePassword(password);
    if (normalizedPassword.length < 8) {
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


// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

function doGet(e) {
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Users',
            version: '2.4.2',
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Users-SERVICE v2.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}



const USERS_DIRECT_TRAFFIC_PREFIX_ = "GPSpedia_USERS_DIRECT_TRAFFIC_HOUR_V1_";
const USERS_TRAFFIC_SECRET_PROPERTY_ = "GPSpedia_USERS_TRAFFIC_SECRET";
const USERS_DIRECT_TRAFFIC_BUCKET_MS_ = 60 * 60 * 1000;
const USERS_DIRECT_TRAFFIC_WINDOW_MS_ = 24 * 60 * 60 * 1000;

function recordUsersDirectTraffic_() {
    // Métrica best-effort: no es rate limit ni control de acceso. Se acepta
    // subconteo por escrituras concurrentes en PropertiesService antes que
    // serializar las lecturas ordinarias de getUsers con el ScriptLock global.
    try {
        const properties = PropertiesService.getScriptProperties();
        const capturedAt = Date.now();
        const bucketStart = Math.floor(capturedAt / USERS_DIRECT_TRAFFIC_BUCKET_MS_) * USERS_DIRECT_TRAFFIC_BUCKET_MS_;
        if (!Number.isSafeInteger(bucketStart) || bucketStart <= 0) return false;
        const key = USERS_DIRECT_TRAFFIC_PREFIX_ + bucketStart;
        const raw = properties.getProperty(key);
        let count = 0;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === 1 && parsed.startAt === bucketStart &&
                    Number.isSafeInteger(parsed.count) && parsed.count >= 0) count = parsed.count;
            } catch (error) {}
        } else {
            const firstBucket = bucketStart - USERS_DIRECT_TRAFFIC_WINDOW_MS_ + USERS_DIRECT_TRAFFIC_BUCKET_MS_;
            const all = properties.getProperties() || {};
            Object.keys(all).forEach(propertyKey => {
                if (!propertyKey.startsWith(USERS_DIRECT_TRAFFIC_PREFIX_)) return;
                const startAt = Number(propertyKey.slice(USERS_DIRECT_TRAFFIC_PREFIX_.length));
                if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > bucketStart) {
                    properties.deleteProperty(propertyKey);
                }
            });
        }
        properties.setProperty(key, JSON.stringify({
            version: 1, startAt: bucketStart, count: Math.min(Number.MAX_SAFE_INTEGER, count + 1)
        }));
        return true;
    } catch (error) {
        return false;
    }
}

function readUsersDirectTraffic_(suppliedSecret) {
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET") ||
        properties.getProperty(USERS_TRAFFIC_SECRET_PROPERTY_) || "");
    const supplied = String(suppliedSecret || "");
    let difference = expectedSecret.length ^ supplied.length;
    const length = Math.max(expectedSecret.length, supplied.length);
    for (let index = 0; index < length; index++) {
        difference |= (expectedSecret.charCodeAt(index) || 0) ^ (supplied.charCodeAt(index) || 0);
    }
    if (expectedSecret.length < 32 || difference !== 0) {
        return { status: "error", message: "Acceso denegado a la telemetría USERS." };
    }
    const capturedAt = Date.now();
    const currentBucket = Math.floor(capturedAt / USERS_DIRECT_TRAFFIC_BUCKET_MS_) * USERS_DIRECT_TRAFFIC_BUCKET_MS_;
    const firstBucket = currentBucket - USERS_DIRECT_TRAFFIC_WINDOW_MS_ + USERS_DIRECT_TRAFFIC_BUCKET_MS_;
    const all = properties.getProperties() || {};
    const stored = new Map();
    Object.keys(all).forEach(key => {
        if (!key.startsWith(USERS_DIRECT_TRAFFIC_PREFIX_)) return;
        const startAt = Number(key.slice(USERS_DIRECT_TRAFFIC_PREFIX_.length));
        if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > currentBucket) return;
        let parsed;
        try { parsed = JSON.parse(all[key]); } catch (error) { parsed = null; }
        if (parsed && parsed.version === 1 && parsed.startAt === startAt &&
            Number.isSafeInteger(parsed.count) && parsed.count >= 0) stored.set(startAt, parsed.count);
    });
    const buckets = [];
    const totals = { lastHour: 0, last6Hours: 0, last24Hours: 0 };
    for (let startAt = firstBucket; startAt <= currentBucket; startAt += USERS_DIRECT_TRAFFIC_BUCKET_MS_) {
        const count = stored.get(startAt) || 0;
        buckets.push({ startAt, count });
        if (startAt + USERS_DIRECT_TRAFFIC_BUCKET_MS_ > capturedAt - 60 * 60 * 1000) totals.lastHour += count;
        if (startAt + USERS_DIRECT_TRAFFIC_BUCKET_MS_ > capturedAt - 6 * 60 * 60 * 1000) totals.last6Hours += count;
        totals.last24Hours += count;
    }
    return {
        status: "success", service: "USERS", scope: "direct_post_requests",
        source: "service_script_properties", accuracy: "best_effort_nonblocking",
        mayUndercount: true, capturedAt, windowMs: USERS_DIRECT_TRAFFIC_WINDOW_MS_,
        bucketMs: USERS_DIRECT_TRAFFIC_BUCKET_MS_, buckets, totals
    };
}

function isSharedMutationAction_(action) {
    return ["createUser"].includes(action);
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
        const result = handleSharedSessionActorCacheInvalidation_(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "__primeSessionActorCache") {
        const result = handleSharedSessionActorCachePriming_(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "getServiceTraffic") {
        const traffic = readUsersDirectTraffic_(payload.secret);
        return ContentService.createTextOutput(JSON.stringify(traffic)).setMimeType(ContentService.MimeType.TEXT);
    }
    if (action === "getUsers") recordUsersDirectTraffic_();
    const sessionOptions = { session: { sessionToken: payload.sessionToken } };
    if (!isSharedMutationAction_(action)) {
        if (!["getUsers", "updateProfile"].includes(action)) return doPostInternal_(withSharedSessionActor_(e, null));
        try {
            // getUsers es una lectura: reutiliza el actor local y no adquiere una lease
            // de actividad en Coordinator en cada apertura de la pantalla.
            const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "USERS" });
            return doPostInternal_(withSharedSessionActor_(e, actor));
        } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "No se pudo recuperar el contexto de sesión."
            })).setMimeType(ContentService.MimeType.TEXT);
        }
    }

    const nestedToken = String(payload.__sharedMutationToken || "").trim();
    try {
        return withSharedMutationLease_("USERS", action, function(token, actor) {
            return doPostInternal_(withSharedSessionActor_(e, actor));
        }, Object.assign(sessionOptions, nestedToken ? { nestedToken: nestedToken } : {}));
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
            case 'getUsers':
                response = handleGetUsers(request.payload);
                break;
            case 'createUser':
                response = handleCreateUser(request.payload);
                break;
            case 'updateProfile':
                response = handleUpdateProfile(request.payload);
                break;
            default:
                throw new Error(`La acción '${request.action}' es desconocida.`);
        }
    } catch (error) {
        response = { status: 'error', message: 'Ocurrió un error en el servicio.', details: { errorMessage: error.message } };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// VERIFICACIÓN DE ROL
// ============================================================================

function parseSessionDate_(v){if(v===null||v===undefined||String(v).trim()==='')return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;}
function addCalendarMonthsUTC_(date,months){const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
function findUniqueRowsByExactValue_(sheet,column,value,minWidth=1,trimCell=false) {
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
    const lastColumn = Number(sheet.getLastColumn ? sheet.getLastColumn() : 0);
    const width = Math.max(Number(minWidth)||1,lastColumn||1);
    return rowNumbers.map(rowIndex => ({rowIndex,row:sheet.getRange(rowIndex,1,1,width).getValues()[0]}))
        .filter(item => {
            const actual = String(item.row[column-1] === null || item.row[column-1] === undefined ? "" : item.row[column-1]);
            return (trimCell ? actual.trim() : actual) === expected;
        });
}

function getVerifiedSession(_sessionToken, payload, requireUserRow) {
    const trustedActor = payload && payload.__sharedSessionActor;
    if (!trustedActor || typeof trustedActor.userId !== "string" || typeof trustedActor.role !== "string" || !Number.isSafeInteger(trustedActor.epoch) || trustedActor.epoch < 1) throw new Error("Acceso no autorizado: falta el contexto de sesión compartido.");
    const userId = trustedActor.userId.trim(), requestedUserId = String(payload.userId || userId).trim(), normalizedRole = trustedActor.role.trim().toLowerCase();
    const displayRoles = {desarrollador:"Desarrollador",jefe:"Jefe",supervisor:"Supervisor",tecnico:"Tecnico",tecnico_exterior:"Tecnico_exterior"};
    if (!userId || requestedUserId !== userId || !displayRoles[normalizedRole]) throw new Error("Acceso no autorizado: el contexto compartido no coincide con la identidad solicitada.");
    let userRowIndex = null;
    if (requireUserRow === true) {
        const usersSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        const userRows = findUniqueRowsByExactValue_(usersSheet, COLS_USERS.ID, userId, 9, true);
        if (userRows.length !== 1) throw new Error("No se encontró una fila única para actualizar el perfil autenticado.");
        userRowIndex = userRows[0].rowIndex;
    }
    return {userId,role:displayRoles[normalizedRole],userRowIndex,epoch:trustedActor.epoch};
}

// ============================================================================
// MANEJADORES DE ACCIONES
// ============================================================================
function isActiveUserRecord(row) {
    if (!row) return false;
    const username = String(row[COLS_USERS.Nombre_Usuario - 1] || '').trim();
    const rawRole = String(row[COLS_USERS.Privilegios - 1] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const role = rawRole;
    return Boolean(username) && !username.startsWith('__deleted__:') &&
        ['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
}

function handleGetUsers(payload) {
    const { sessionToken } = payload;
    const { role: requesterRole } = getVerifiedSession(sessionToken, payload);

    if (!['Desarrollador', 'Jefe', 'Supervisor'].includes(requesterRole)) {
        throw new Error('Acceso denegado. Permisos insuficientes.');
    }

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    data.shift(); // Remove headers

    const users = data
        .filter(row => {
            if (!isActiveUserRecord(row)) return false;
            const role = row[COLS_USERS.Privilegios - 1];
            if (requesterRole === 'Desarrollador') return true;
            if (requesterRole === 'Jefe') return ['Supervisor', 'Tecnico'].includes(role);
            if (requesterRole === 'Supervisor') return role === 'Tecnico';
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
    const configSheet = getSpreadsheet().getSheetByName("__IdentifierSequenceConfig__");
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
    const { role: creatorRole } = getVerifiedSession(sessionToken, payload);
    const allowedRoles = {
        'Desarrollador': ['Desarrollador', 'Jefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'],
        'Jefe': ['Supervisor', 'Tecnico'],
        'Supervisor': ['Tecnico']
    };
    if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(normalized.role)) {
        throw new Error("El rol '" + creatorRole + "' no tiene permisos para crear usuarios de tipo '" + normalized.role + "'.");
    }
    const passwordHash = createPasswordHash(normalized.password);

    return withUsersMutationLock_(() => {
        const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
        const snapshot = readUsersMutationSnapshot_(userSheet);
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

    const { userId: authenticatedUserId, userRowIndex } = getVerifiedSession(sessionToken, payload, true);
    if (String(authenticatedUserId).trim() !== userId) {
        throw new Error('Acceso no autorizado: Solo puedes editar tu propio perfil.');
    }
    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
    const rowIndex = userRowIndex;
    if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error('No se pudo confirmar la fila del perfil autenticado.');
    writeUserProfileNameNonBlocking_(userSheet, rowIndex, updates.Nombre_Completo);
    return { status: 'success', message: 'Perfil actualizado correctamente.' };
}


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================


