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

function doPost(e) {
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
            case 'updateUser':
                response = handleUpdateUser(request.payload);
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

    const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
    const rows = userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, lastColumn - 1).getValues();
    for (let i = 0; i < rows.length; i++) {
        const rowIsEmpty = rows[i].every(value =>
            String(value === null || value === undefined ? '' : value).trim() === ''
        );
        if (rowIsEmpty) return i + 2;
    }
    return lastRow + 1;
}

function handleCreateUser(payload) {
    const { newUser, sessionToken } = payload || {};
    if (!newUser || !sessionToken) {
        throw new Error("Datos insuficientes para crear el usuario. Se requiere sessionToken.");
    }

    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    try {
        lock.waitLock(30000);
        lockAcquired = true;
    } catch (e) {
        throw new Error("El servidor está ocupado. Por favor intenta de nuevo en unos momentos.");
    }

    try {
        const { role: creatorRole } = getVerifiedSession(sessionToken);
        const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);

        const allowedRoles = {
            'Desarrollador': ['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'],
            'Gefe': ['Supervisor', 'Tecnico'],
            'Jefe': ['Supervisor', 'Tecnico'],
            'Supervisor': ['Tecnico']
        };
        if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(newUser.Privilegios)) {
            throw new Error(`El rol '${creatorRole}' no tiene permisos para crear usuarios de tipo '${newUser.Privilegios}'.`);
        }

            const newUsername = String(newUser.Nombre_Usuario || '').trim();
        if (!newUsername) throw new Error('El nombre de usuario es obligatorio.');
        if (newUsername.toLowerCase().startsWith('__deleted__:')) {
            throw new Error('El prefijo __deleted__: está reservado para cuentas desactivadas.');
        }
        const lastRow = userSheet.getLastRow();
        const existingUsernames = lastRow > 1
            ? userSheet.getRange(2, COLS_USERS.Nombre_Usuario, lastRow - 1, 1).getValues().flat()
            : [];
        const usernameExists = existingUsernames.some(username =>
            String(username || '').trim().toLowerCase() === newUsername.toLowerCase()
        );
        if (usernameExists) {
            return { status: 'error', message: 'Ese nombre de usuario no está disponible' };
        }

        const passwordHash = createPasswordHash(newUser.Password);
        const newRowNumber = findNextUserRow_(userSheet);
        const lastColumn = Math.max(userSheet.getLastColumn(), COLS_USERS.SessionToken);
        const newUserId = generateNextUserId_(userSheet);
        // Copiar formato/validaciones solo al extender la hoja; nunca copiar fórmulas.
        if (lastRow > 0 && newRowNumber > lastRow) {
            const previousRow = userSheet.getRange(lastRow, 1, 1, lastColumn);
            const newRow = userSheet.getRange(newRowNumber, 1, 1, lastColumn);
            previousRow.copyTo(newRow, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            previousRow.copyTo(newRow, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
        }
        userSheet.getRange(newRowNumber, COLS_USERS.ID).setValue(newUserId);
        const dataToWrite = [newUsername, passwordHash, newUser.Privilegios, newUser.Telefono || '', newUser.Correo_Electronico || '', newUser.Nombre_Completo || '', ''];
        userSheet.getRange(newRowNumber, COLS_USERS.Nombre_Usuario, 1, dataToWrite.length).setValues([dataToWrite]);

        return { status: 'success', message: `Usuario '${newUsername}' creado.` };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}
function handleUpdateUser(payload) {
    const { userId, updates, sessionToken } = payload;
    if (!userId || !updates || !sessionToken) throw new Error("Datos insuficientes para actualizar. Se requiere sessionToken.");
    if (updates.Password) throw new Error('El restablecimiento administrativo de contraseñas debe realizarse mediante AUTH con el rol Desarrollador.');

    const { role: updaterRole } = getVerifiedSession(sessionToken);
    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    data.shift();

    for (let i = 0; i < data.length; i++) {
        if (String(data[i][COLS_USERS.ID - 1]) === String(userId)) {
            const userToUpdateRole = data[i][COLS_USERS.Privilegios - 1];

            /* TAREA 2 (B16): GESTIÓN DE USUARIOS, RBAC Y SEGURIDAD */
            // RBAC strict enforcement
            const canUpdate = {
                'Desarrollador': () => true,
                'Gefe': (targetRole) => ['Supervisor', 'Tecnico'].includes(targetRole),
                'Jefe': (targetRole) => ['Supervisor', 'Tecnico'].includes(targetRole),
                'Supervisor': (targetRole) => targetRole === 'Tecnico'
            };

            if (!canUpdate[updaterRole] || !canUpdate[updaterRole](userToUpdateRole)) {
                 throw new Error(`Rol '${updaterRole}' no tiene permisos para modificar a un '${userToUpdateRole}'.`);
            }

            // PROHIBIDO cambiar nombre de usuario
            // updates.Nombre_Usuario es ignorado deliberadamente

            if (updates.Nombre_Completo) {
                userSheet.getRange(i + 2, COLS_USERS.Nombre_Completo).setValue(updates.Nombre_Completo);
            }
            if (updates.Privilegios) {
                // Verificar que el nuevo privilegio también esté permitido para el updater
                const allowedRoles = {
                    'Desarrollador': ['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_exterior'],
                    'Gefe': ['Supervisor', 'Tecnico'],
                    'Jefe': ['Supervisor', 'Tecnico'],
                    'Supervisor': ['Tecnico']
                };
                if (allowedRoles[updaterRole].includes(updates.Privilegios)) {
                    userSheet.getRange(i + 2, COLS_USERS.Privilegios).setValue(updates.Privilegios);
                } else {
                    throw new Error(`El rol '${updaterRole}' no puede asignar el privilegio '${updates.Privilegios}'.`);
                }
            }
            return { status: 'success', message: 'Usuario actualizado.' };
        }
    }
    throw new Error("Usuario no encontrado para actualizar.");
}

function handleUpdateProfile(payload) {
    const { userId, updates, sessionToken } = payload;
    if (!userId || !updates || !sessionToken) throw new Error("Datos insuficientes.");

    const { userId: authenticatedUserId } = getVerifiedSession(sessionToken);

    if (authenticatedUserId !== String(userId)) {
        throw new Error("Acceso no autorizado: Solo puedes editar tu propio perfil.");
    }

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    data.shift();

    for (let i = 0; i < data.length; i++) {
        if (String(data[i][COLS_USERS.ID - 1]) === String(userId)) {
            // Solo permitir cambios en Nombre_Completo
            if (updates.Nombre_Completo) {
                userSheet.getRange(i + 2, COLS_USERS.Nombre_Completo).setValue(updates.Nombre_Completo);
            }
            // Password se maneja en handleChangePassword por seguridad (requiere contraseña actual)
            return { status: 'success', message: 'Perfil actualizado correctamente.' };
        }
    }
    throw new Error("Usuario no encontrado.");
}


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================


