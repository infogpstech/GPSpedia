// ============================================================================
// GPSPEDIA-USERS SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.4.2

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";
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
const PASSWORD_HASH_PREFIX = 'sha256$';

function normalizePassword(password) {
    return String(password === null || password === undefined ? '' : password).trim();
}

function digestToHex(bytes) {
    return bytes.map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function createPasswordHash(password) {
    const normalizedPassword = normalizePassword(password);
    if (normalizedPassword.length < 8) {
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

// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

function doGet(e) {
    const defaultResponse = { status: 'success', message: 'GPSpedia Users-SERVICE v2.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["createUser","updateProfile"].includes(action);
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
        return withSharedMutationLease_("USERS", action, function(token) {
            
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
function getSessionExpirationStatus_(row,now=new Date()){const created=parseSessionDate_(row[COLS_ACTIVE_SESSIONS.date-1]),raw=row[COLS_ACTIVE_SESSIONS.LastActivityAt-1],activity=raw===null||raw===undefined||String(raw).trim()===''?created:parseSessionDate_(raw);if(!created||!activity)return{expired:true,reason:'invalid_timestamp'};if(now.getTime()>=addCalendarMonthsUTC_(created,3).getTime())return{expired:true,reason:'absolute_expiration'};if(now.getTime()>=addCalendarMonthsUTC_(activity,1).getTime())return{expired:true,reason:'inactivity_expiration'};return{expired:false};}
function getVerifiedSession(sessionToken) {
    if (!sessionToken) throw new Error("Acceso no autorizado: Se requiere token de sesión.");
    const ss = getSpreadsheet(), sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
    if (!sessionsSheet) throw new Error("Hoja de sesiones no encontrada.");
    const sessionRows = sessionsSheet.getDataRange().getValues().slice(1).filter(row => row[2] === sessionToken);
    if (sessionRows.length !== 1) throw new Error("Acceso no autorizado: Sesión inválida, duplicada o expirada.");
    const expiration=getSessionExpirationStatus_(sessionRows[0],new Date());
    if(expiration.expired)throw new Error('Acceso no autorizado: Sesión expirada por '+expiration.reason+'.');
    const userId = String(sessionRows[0][0] ?? '').trim();
    if (!userId) throw new Error("Acceso no autorizado: Identidad de sesión inválida.");
    const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
    if (!usersSheet) throw new Error("Hoja de usuarios no encontrada.");
    const userRows = usersSheet.getDataRange().getValues().slice(1).filter(row => String(row[0] ?? '').trim() === userId);
    if (userRows.length !== 1 || !isActiveUserRecord(userRows[0])) throw new Error("Acceso no autorizado: Usuario inexistente o desactivado.");
    if (hasPendingRoleRevocationForUser_(userRows[0])) throw new Error("Acceso no autorizado: existe una revocación de rol pendiente. Inicia sesión nuevamente cuando finalice.");
    return { userId, role: userRows[0][3] };
}

// ============================================================================
// MANEJADORES DE ACCIONES
// ============================================================================
function isActiveUserRecord(row) {
    if (!row) return false;
    const username = String(row[COLS_USERS.Nombre_Usuario - 1] || '').trim();
    const role = String(row[COLS_USERS.Privilegios - 1] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return Boolean(username) && !username.startsWith('__deleted__:') &&
        ['desarrollador', 'gefe', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(role);
}

function handleGetUsers(payload) {
    const { sessionToken } = payload;
    const { role: requesterRole } = getVerifiedSession(sessionToken);

    if (!['Desarrollador', 'Gefe', 'Jefe', 'Supervisor'].includes(requesterRole)) {
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
            if (requesterRole === 'Gefe' || requesterRole === 'Jefe') return ['Supervisor', 'Tecnico'].includes(role);
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

// Genera IDs permanentes secuenciales. La columna ID se escribe como valor,
// nunca se copia ni se conserva su fórmula en las filas nuevas.
function generateNextUserId_(userSheet) {
    const lastRow = userSheet.getLastRow();
    if (lastRow < 2) return 'USR-0001';

    const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
    const rows = userSheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const seen = new Set();
    let maxSequence = 0;

    rows.forEach(row => {
        const id = String(row[COLS_USERS.ID - 1] === null || row[COLS_USERS.ID - 1] === undefined
            ? '' : row[COLS_USERS.ID - 1]).trim();
        const hasAccountData = row.slice(1).some(value =>
            String(value === null || value === undefined ? '' : value).trim() !== ''
        );
        if (!hasAccountData && !id) return;
        if (!hasAccountData) return;
        if (!id) throw new Error('Existe una fila de usuario con datos pero sin ID. No se creó la cuenta.');
        if (seen.has(id)) throw new Error('Se detectó un ID de usuario duplicado. No se creó la cuenta.');
        seen.add(id);

        const match = /^USR-(\d{4,})$/i.exec(id);
        if (match) maxSequence = Math.max(maxSequence, Number(match[1]));
    });

    if (!Number.isSafeInteger(maxSequence) || maxSequence >= Number.MAX_SAFE_INTEGER) {
        throw new Error('Se agotó el rango disponible para generar IDs de usuario.');
    }
    return 'USR-' + String(maxSequence + 1).padStart(4, '0');
}

// Reutiliza la primera fila sin datos de cuenta. Si la hoja tiene fórmulas
// prellenadas en Users.ID, la escritura del ID fijo sustituye la fórmula de esa fila.
function findNextUserRow_(userSheet) {
    const lastRow = userSheet.getLastRow();
    if (lastRow < 2) return 2;

    const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.TermsAcceptance);
    const range = userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, lastColumn - 1);
    const rows = range.getValues();
    const formulas = range.getFormulas();
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

// Serializa las mutaciones que pertenecen al proyecto USERS.
// Este lock solo coordina ejecuciones del mismo proyecto Apps Script.
function withUsersMutationLock_(operation) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);
    } catch (error) {
        throw new Error('El servidor está ocupado. Por favor intenta de nuevo en unos momentos.');
    }
    try {
        return operation();
    } finally {
        lock.releaseLock();
    }
}

const USERS_ALLOWED_ROLES_ = Object.freeze(['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior']);

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

function handleCreateUser(payload) {
    const { newUser, sessionToken } = payload || {};
    if (!newUser || typeof sessionToken !== 'string' || !sessionToken.trim()) {
        throw new Error('Datos insuficientes para crear el usuario. Se requiere sessionToken.');
    }
    const normalized = normalizeNewUserInput_(newUser);
    const passwordHash = createPasswordHash(normalized.password);

    return withUsersMutationLock_(() => {
        const { role: creatorRole } = getVerifiedSession(sessionToken);
        const allowedRoles = {
            'Desarrollador': ['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'],
            'Gefe': ['Supervisor', 'Tecnico'],
            'Jefe': ['Supervisor', 'Tecnico'],
            'Supervisor': ['Tecnico']
        };
        if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(normalized.role)) {
            throw new Error("El rol '" + creatorRole + "' no tiene permisos para crear usuarios de tipo '" + normalized.role + "'.");
        }

        const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
        const lastRow = userSheet.getLastRow();
        const existingUsernames = lastRow > 1
            ? userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, 1).getValues().flat()
            : [];
        if (existingUsernames.some(username => String(username || '').trim().toLowerCase() === normalized.username.toLowerCase())) {
            return { status: 'error', message: 'Ese nombre de usuario no está disponible' };
        }

        const newRowNumber = findNextUserRow_(userSheet);
        const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
        const newRowRange = userSheet.getRange(newRowNumber, 1, 1, COLS_USERS.SessionToken);
        const currentRow = newRowRange.getValues()[0];
        if (currentRow.slice(1).some(value => String(value === null || value === undefined ? '' : value).trim() !== '')) {
            throw new Error('La fila seleccionada para el nuevo usuario dejó de estar vacía. Intenta nuevamente.');
        }
        const newUserId = generateNextUserId_(userSheet);

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

    return withUsersMutationLock_(() => {
        const { userId: authenticatedUserId } = getVerifiedSession(sessionToken);
        if (String(authenticatedUserId).trim() !== userId) {
            throw new Error('Acceso no autorizado: Solo puedes editar tu propio perfil.');
        }
        const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        if (!userSheet) throw new Error('Hoja de usuarios no encontrada.');
        const rowIndex = findUniqueUserRow_(userSheet, userId);
        writeUserRangeAtomically_(userSheet, rowIndex, COLS_USERS.Nombre_Completo, [[updates.Nombre_Completo]]);
        return { status: 'success', message: 'Perfil actualizado correctamente.' };
    });
}


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================


