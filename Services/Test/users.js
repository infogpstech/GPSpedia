// ============================================================================
// GPSPEDIA-USERS SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.4.2

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k"; // COPIA AISLADA DE PRUEBAS; NO USAR EN PRODUCCIÓN
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
    Logs: 5
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
            case 'deleteUser':
                response = handleDeleteUser(request.payload);
                break;
            case 'changePassword':
                response = handleChangePassword(request.payload);
                break;
            case 'updateProfile':
                response = handleUpdateProfile(request.payload);
                break;
            case 'resetUserSessions':
                response = handleResetUserSessions(request.payload);
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

function getVerifiedSession(sessionToken) {
    if (!sessionToken) {
        throw new Error("Acceso no autorizado: Se requiere token de sesión.");
    }

    const sessionsSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
    if (!sessionsSheet) throw new Error("Hoja de sesiones no encontrada.");
    const sessionsData = sessionsSheet.getDataRange().getValues();
    sessionsData.shift();

    let userId = null;
    for (const row of sessionsData) {
        if (row[COLS_ACTIVE_SESSIONS.ActiveSessions - 1] === sessionToken) {
            userId = row[COLS_ACTIVE_SESSIONS.ID_Usuario - 1];
            break;
        }
    }

    if (!userId) {
        throw new Error("Acceso no autorizado: Sesión inválida o expirada.");
    }

    const usersSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    if (!usersSheet) throw new Error("Hoja de usuarios no encontrada.");
    const usersData = usersSheet.getDataRange().getValues();
    usersData.shift();

    for (const row of usersData) {
        if (row[COLS_USERS.ID - 1] == userId) {
            return {
                userId: String(userId),
                role: row[COLS_USERS.Privilegios - 1]
            };
        }
    }

    throw new Error("Acceso no autorizado: Usuario asociado a la sesión no encontrado.");
}

// ============================================================================
// MANEJADORES DE ACCIONES
// ============================================================================

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

function handleResetUserSessions(payload) {
    const { targetUserId, sessionToken } = payload || {};
    if (!targetUserId || !sessionToken) {
        throw new Error("Datos insuficientes para cerrar las sesiones del usuario.");
    }
    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    try {
        lock.waitLock(30000);
        lockAcquired = true;
        const requester = getVerifiedSession(sessionToken);
        const requesterRole = String(requester.role || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
        if (requesterRole !== "desarrollador") {
            throw new Error("Acceso denegado. Esta operación está reservada al rol Desarrollador.");
        }
        if (String(requester.userId) === String(targetUserId)) {
            throw new Error("No puedes cerrar remotamente tu propia sesión desde esta operación.");
        }
        const ss = getSpreadsheet();
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
        const sessionsSheet = ss.getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
        if (!usersSheet || !sessionsSheet) throw new Error("No se encontraron las hojas Users o ActiveSessions.");
        const usersData = usersSheet.getDataRange().getValues();
        let targetUserRow = -1;
        for (let i = 1; i < usersData.length; i++) {
            if (String(usersData[i][COLS_USERS.ID - 1]).trim() === String(targetUserId).trim()) {
                targetUserRow = i + 1;
                break;
            }
        }
        if (targetUserRow < 0) throw new Error("El usuario seleccionado no existe.");
        const sessionsData = sessionsSheet.getDataRange().getValues();
        let closedSessions = 0;
        for (let i = sessionsData.length - 1; i >= 1; i--) {
            if (String(sessionsData[i][COLS_ACTIVE_SESSIONS.ID_Usuario - 1]).trim() === String(targetUserId).trim()) {
                sessionsSheet.deleteRow(i + 1);
                closedSessions++;
            }
        }
        usersSheet.getRange(targetUserRow, COLS_USERS.SessionToken).clearContent();
        SpreadsheetApp.flush();
        return {
            status: "success",
            closedSessions,
            message: closedSessions > 0
                ? `Se cerraron ${closedSessions} sesión(es) activa(s) de ${usersData[targetUserRow - 1][COLS_USERS.Nombre_Usuario - 1]}.`
                : "El usuario no tenía sesiones activas. Se limpió el token de referencia."
        };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
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
        const newRowNumber = lastRow + 1;
        const lastColumn = userSheet.getLastColumn();

        // 1. Copiar la fila anterior para heredar TODAS las validaciones, formatos y FÓRMULAS (incluyendo ID).
        if (lastRow > 0) {
            const previousRowRange = userSheet.getRange(lastRow, 1, 1, lastColumn);
            const newRowRange = userSheet.getRange(newRowNumber, 1, 1, lastColumn);
            previousRowRange.copyTo(newRowRange);
        }

        // 2. Preparar los datos que se van a escribir, EXCLUYENDO la columna de ID.
        const dataToWrite = [
            newUsername,
            passwordHash,
            newUser.Privilegios,
            newUser.Telefono || '',
            newUser.Correo_Electronico || '',
            newUser.Nombre_Completo || '',
            '' // SessionToken se deja vacío
        ];

        // 3. Obtener el rango SOLO para las celdas de datos y escribirlos.
        // Esto deja la columna 1 (ID) intacta, conservando la fórmula heredada.
        const dataRange = userSheet.getRange(newRowNumber, COLS_USERS.Nombre_Usuario, 1, dataToWrite.length);
        dataRange.setValues([dataToWrite]);

        return { status: 'success', message: `Usuario '${newUsername}' creado.` };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}
function handleUpdateUser(payload) {
    const { userId, updates, sessionToken } = payload;
    if (!userId || !updates || !sessionToken) throw new Error("Datos insuficientes para actualizar. Se requiere sessionToken.");

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
            if (updates.Password) {
                userSheet.getRange(i + 2, COLS_USERS.Password).setValue(createPasswordHash(updates.Password));
            }

            return { status: 'success', message: 'Usuario actualizado.' };
        }
    }
    throw new Error("Usuario no encontrado para actualizar.");
}

function handleDeleteUser(payload) {
    const { userId, sessionToken } = payload;
    if (!userId || !sessionToken) throw new Error("Datos insuficientes para eliminar. Se requiere sessionToken.");

    const { role: deleterRole } = getVerifiedSession(sessionToken);
    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    data.shift();

    for (let i = 0; i < data.length; i++) {
        if (String(data[i][COLS_USERS.ID - 1]) === String(userId)) {
            const userToDeleteRole = data[i][COLS_USERS.Privilegios - 1];

            const canDelete = {
                 'Desarrollador': () => true,
                 'Gefe': (targetRole) => ['Supervisor', 'Tecnico'].includes(targetRole),
                 'Jefe': (targetRole) => ['Supervisor', 'Tecnico'].includes(targetRole),
                 'Supervisor': (targetRole) => targetRole === 'Tecnico'
            };

            if (!canDelete[deleterRole] || !canDelete[deleterRole](userToDeleteRole)) {
                throw new Error(`Rol '${deleterRole}' no tiene permisos para eliminar a un '${userToDeleteRole}'.`);
            }
            userSheet.deleteRow(i + 2);
            return { status: 'success', message: 'Usuario eliminado.' };
        }
    }
    throw new Error("Usuario no encontrado para eliminar.");
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

function handleChangePassword(payload) {
    const { userId, currentPassword, newPassword, sessionToken } = payload;
    if (!userId || !currentPassword || !newPassword || !sessionToken) {
        throw new Error("Datos insuficientes para cambiar la contraseña.");
    }

    const { userId: authenticatedUserId } = getVerifiedSession(sessionToken);

    if (authenticatedUserId !== String(userId)) {
        throw new Error("Acceso no autorizado: No puedes cambiar la contraseña de otro usuario.");
    }

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    data.shift();

    for (let i = 0; i < data.length; i++) {
        // Comparación flexible del ID (soporta string o number)
        if (String(data[i][COLS_USERS.ID - 1]) === String(userId)) {
            const storedPassword = data[i][COLS_USERS.Password - 1];
            const currentPasswordCheck = verifyStoredPassword(storedPassword, currentPassword);

            if (!currentPasswordCheck.matches) {
                throw new Error("La contraseña actual es incorrecta.");
            }

            const newPasswordHash = createPasswordHash(newPassword);
            userSheet.getRange(i + 2, COLS_USERS.Password).setValue(newPasswordHash);
            return { status: 'success', message: 'Contraseña actualizada correctamente.' };
        }
    }
    throw new Error("Usuario no encontrado.");
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
