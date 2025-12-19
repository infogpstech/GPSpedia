// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';

let spreadsheet = null; // Variable para cachear la instancia de la hoja de cálculo

/**
 * Obtiene la instancia de la hoja de cálculo, abriéndola solo una vez por ejecución.
 * Esto mueve la conexión de la hoja de cálculo desde el ámbito global a una función,
 * permitiendo que cualquier error de inicialización (ej. permisos) sea capturado
 * por los bloques try/catch en doPost y doGet.
 * @returns {Spreadsheet} El objeto de la hoja de cálculo activa.
 */
function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

// Definiciones de Hojas
const SHEET_NAMES = {
    CORTES: "Cortes",
    USERS: "Users",
    FEEDBACKS: "Feedbacks",
    ACTIVE_SESSIONS: "ActiveSessions"
};

// Límites de sesión por rol de usuario
const SESSION_LIMITS = {
    'Desarrollador': 5,
    'Gefe': 3,
    'Supervisor': 2,
    'Tecnico': 1,
    'Tecnico_Exterior': 1
};


// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

/**
 * Maneja las solicitudes GET. Actualmente usado para obtener datos de dropdowns
 * y verificar la existencia de vehículos (flujo de add_cortes).
 */
function doGet(e) {
  try {
    // Retorna un mensaje JSON para verificar que el script está activo y mantener la consistencia.
    const response = { status: 'success', message: 'GPSpedia Backend v3.004 is active.' };
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error en doGet: ${error.toString()}`);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Error en el servidor (doGet).', details: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Manejador central para todas las solicitudes POST.
 * Dirige la acción al manejador correspondiente.
 */
function doPost(e) {
    let response;
    let request;

    try {
        // Intento de analizar el JSON
        try {
            request = JSON.parse(e.postData.contents);
        } catch (jsonError) {
            Logger.log(`Error GRAVE al analizar JSON: ${jsonError.stack}`);
            Logger.log(`Contenido POST recibido (no es JSON válido): ${e.postData.contents}`);
            throw new Error(`El formato de la solicitud no es un JSON válido.`);
        }

        Logger.log(`Acción recibida: ${request.action}`);

        switch (request.action) {
            // --- Acciones del Catálogo ---
            case 'getCatalogData':
                response = handleGetCatalogData();
                break;
            case 'getDropdownData':
                 response = handleGetDropdownData();
                 break;
            case 'checkVehicle':
                 response = handleCheckVehicle(request.payload);
                 break;
            case 'addCorte':
                response = handleAddCorte(request.payload);
                break;

            // --- Acciones de Feedback ---
            case 'recordLike':
                response = handleRecordLike(request.payload);
                break;
            case 'reportProblem':
                response = handleReportProblem(request.payload);
                break;

            // --- Acciones de Usuario ---
            case 'login':
                response = handleLogin(request.payload);
                break;
            case 'validateSession':
                response = handleValidateSession(request.payload);
                break;
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

            // --- Acciones de Depuración ---
            case 'logFrontend':
                Logger.log(`[FRONTEND ${request.payload.level}] ${request.payload.message} | Data: ${JSON.stringify(request.payload.data)}`);
                response = { status: 'success', message: 'Log recibido.' };
                break;

            default:
                throw new Error(`Acción desconocida: ${request.action}`);
        }
    } catch (error) {
        Logger.log(`Error en doPost: ${error.stack}`);
        response = {
            status: 'error',
            message: 'Ocurrió un error en el servidor.',
            details: {
                message: error.message,
                stack: error.stack
            }
        };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================================
// MANEJADORES DE ACCIONES (HANDLERS)
// ============================================================================

// ----------------------------------------------------------------------------
// Handlers: CATÁLOGO (Cortes)
// ----------------------------------------------------------------------------
/**
 * Obtiene todos los datos del catálogo para la carga inicial.
 */
function handleGetCatalogData() {
    const sheetsToFetch = {
        cortes: SHEET_NAMES.CORTES,
        tutoriales: "Tutoriales",
        relay: "Relay"
    };
    const allData = {};

    for (const key in sheetsToFetch) {
        try {
            const sheet = getSpreadsheet().getSheetByName(sheetsToFetch[key]);
            if (sheet) {
                const data = sheet.getDataRange().getValues();
                const headers = data.shift().map(header => camelCase(header.trim()));
                allData[key] = data.map(row => {
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = row[i];
                    });
                    return obj;
                });
            } else {
                allData[key] = [];
            }
        } catch (e) {
            Logger.log(`Error cargando la hoja ${sheetsToFetch[key]}: ${e.message}`);
            allData[key] = [];
        }
    }
    return { status: 'success', data: allData };
}

/**
 * Obtiene los valores de las listas de validación de datos para los dropdowns.
 */
function handleGetDropdownData() {
    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cortesSheet) throw new Error(`La hoja "${SHEET_NAMES.CORTES}" no fue encontrada.`);

    const getValues = (col) => {
        const rule = cortesSheet.getRange(2, col).getDataValidation();
        if (rule && rule.getCriteriaType() == SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
            return rule.getCriteriaValues()[0];
        }
        return [];
    };

    // Mapeo basado en la descripción del usuario
    const COLS = getColumnMap(SHEET_NAMES.CORTES);

    return {
        status: 'success',
        dropdowns: {
            categoria: getValues(COLS.categoria),
            tipoDeEncendido: getValues(COLS.tipoDeEncendido),
            tipoDeCorte: getValues(COLS.tipoDeCorte)
        }
    };
}


/**
 * Verifica si un vehículo ya existe en la base de datos.
 */
function handleCheckVehicle(payload) {
    const { marca, modelo, anio, tipoEncendido } = payload;
    if (!marca || !modelo || !anio || !tipoEncendido) {
        throw new Error("Parámetros de búsqueda incompletos.");
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const normalizedHeaders = headers.map(h => camelCase(h.trim()));
    const COLS = arrayToMap(normalizedHeaders);

    const paramMarca = marca.trim().toLowerCase();
    const paramModelo = modelo.trim().toLowerCase();
    const paramAnio = anio.trim();
    const paramTipoEncendido = tipoEncendido.trim().toLowerCase();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const sheetMarca = (row[COLS.marca] || "").toString().trim().toLowerCase();
        const sheetModelo = (row[COLS.modelo] || "").toString().trim().toLowerCase();
        const sheetAnioRaw = (row[COLS.anoGeneracion] || "").toString();
        const sheetTipoEncendido = (row[COLS.tipoDeEncendido] || "").toString().trim().toLowerCase();

        if (sheetMarca === paramMarca && sheetModelo === paramModelo && isYearInRange(paramAnio, sheetAnioRaw) && sheetTipoEncendido === paramTipoEncendido) {
            const existingRowData = normalizedHeaders.reduce((obj, header, index) => {
                obj[header] = row[index];
                return obj;
            }, {});
            return { status: 'success', exists: true, data: existingRowData, rowIndex: i + 2 };
        }
    }

    return { status: 'success', exists: false };
}


/**
 * Agrega un nuevo corte o información adicional a un corte existente.
 */
function handleAddCorte(payload) {
    const { vehicleInfo, additionalInfo, files } = payload;
    const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;

    if (!marca || !modelo || !anio || !categoria || !tipoEncendido) {
        throw new Error("Información esencial del vehículo está incompleta.");
    }

    const fileUrls = handleFileUploads(files, { categoria, marca, modelo, anio });
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const COLS = getColumnMap(SHEET_NAMES.CORTES);

    let targetRow;
    const isNewRow = !rowIndex || rowIndex === -1;

    if (isNewRow) {
        const lastRow = sheet.getLastRow();
        sheet.insertRowAfter(lastRow);
        targetRow = lastRow + 1;

        const previousRowRange = sheet.getRange(lastRow, 1, 1, sheet.getMaxColumns());
        const newRowRange = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns());
        previousRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        previousRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
        newRowRange.clearContent();

        sheet.getRange(targetRow, COLS.categoria).setValue(categoria);
        sheet.getRange(targetRow, COLS.marca).setValue(marca);
        sheet.getRange(targetRow, COLS.modelo).setValue(modelo);
        sheet.getRange(targetRow, COLS.anoGeneracion).setValue(anio);
        sheet.getRange(targetRow, COLS.tipoDeEncendido).setValue(tipoEncendido);
        if (fileUrls.imagenVehiculo) {
            sheet.getRange(targetRow, COLS.imagenDelVehiculo).setValue(fileUrls.imagenVehiculo);
        }
    } else {
        targetRow = parseInt(rowIndex, 10);
    }

    updateRowData(sheet, COLS, targetRow, additionalInfo, fileUrls, colaborador);

    return { status: 'success', message: "Registro guardado exitosamente.", row: targetRow };
}


// ----------------------------------------------------------------------------
// Handlers: FEEDBACK
// ----------------------------------------------------------------------------
function handleRecordLike(payload) {
    const { vehicleId, userName } = payload;
    if (!vehicleId || !userName) throw new Error("Falta el ID del vehículo o el nombre de usuario.");

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const COLS = getColumnMap(SHEET_NAMES.CORTES);
    const data = sheet.getRange(2, COLS.id, sheet.getLastRow() - 1, COLS.util).getValues();

    for (let i = 0; i < data.length; i++) {
        if (data[i][0] == vehicleId) { // Compara ID en la primera columna del rango
            const rowIndex = i + 2;
            const utilCell = sheet.getRange(rowIndex, COLS.util);
            const currentLikes = utilCell.getValue().toString().trim();
            const usersWhoLiked = currentLikes ? currentLikes.split(',').map(u => u.trim()) : [];

            if (!usersWhoLiked.includes(userName)) {
                usersWhoLiked.push(userName);
                utilCell.setValue(usersWhoLiked.join(', '));
                return { status: 'success', message: 'Like registrado.' };
            } else {
                return { status: 'success', message: 'El usuario ya ha dado like.' };
            }
        }
    }
    throw new Error("No se encontró el vehículo con el ID proporcionado.");
}


function handleReportProblem(payload) {
    const { vehicleId, userName, problemText } = payload;
    if (!vehicleId || !userName || !problemText) {
        throw new Error("Faltan datos para registrar el problema.");
    }

    const feedbackSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error(`La hoja "${SHEET_NAMES.FEEDBACKS}" no existe.`);

    // ID, Usuario, ID_vehiculo, Problema, Respuesta, ¿Se resolvió?, Responde
    feedbackSheet.appendRow(['', userName, vehicleId, problemText, '', '', '']);

    return { status: 'success', message: 'Problema reportado exitosamente.' };
}


// ----------------------------------------------------------------------------
// Handlers: GESTIÓN DE USUARIOS
// ----------------------------------------------------------------------------
function handleLogin(payload) {
    try {
        const { username, password } = payload;
        if (!username || !password) throw new Error("Usuario y contraseña son requeridos.");

        const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        const COLS = getColumnMap(SHEET_NAMES.USERS);
        const data = userSheet.getDataRange().getValues();
        const headers = data.shift().map(h => camelCase(h.trim()));

        for (let i = 0; i < data.length; i++) {
            const userRow = data[i];
            const sheetUsername = (userRow[COLS.nombreUsuario - 1] || '').toString().trim();
            const sheetPassword = (userRow[COLS.password - 1] || '').toString().trim();

            if (sheetUsername !== username.trim() || sheetPassword !== password.trim()) {
                continue; // Siguiente iteración si no coincide
            }

            // --- INICIO: LÓGICA DE LÍMITE DE SESIONES ---
            const userRole = userRow[COLS.privilegios - 1];
            const userId = userRow[COLS.id - 1];
            const sessionLimit = SESSION_LIMITS[userRole] || 1;

            let activeSessionsSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVE_SESSIONS);
            if (!activeSessionsSheet) {
                activeSessionsSheet = getSpreadsheet().insertSheet(SHEET_NAMES.ACTIVE_SESSIONS);
                activeSessionsSheet.appendRow(['UserID', 'SessionToken', 'Timestamp']);
            }

            const sessionsData = activeSessionsSheet.getDataRange().getValues();
            sessionsData.shift(); // Quitar cabeceras

            const userSessions = sessionsData
                .map((row, index) => ({
                    userId: row[0],
                    token: row[1],
                    timestamp: new Date(row[2]),
                    rowIndex: index + 2
                }))
                .filter(session => session.userId == userId)
                .sort((a, b) => a.timestamp - b.timestamp); // Ordenar: más antigua a más nueva

            const sessionsToCloseCount = userSessions.length - sessionLimit + 1;
            if (sessionsToCloseCount > 0) {
                const sessionsToClose = userSessions.slice(0, sessionsToCloseCount);

                // Invalidar tokens en la hoja de Users
                const allUsersData = userSheet.getDataRange().getValues();
                for (const session of sessionsToClose) {
                    for (let j = 1; j < allUsersData.length; j++) {
                        if (allUsersData[j][COLS.sessionToken - 1] === session.token) {
                            userSheet.getRange(j + 1, COLS.sessionToken).clearContent();
                            break;
                        }
                    }
                }

                // Eliminar filas de ActiveSessions (de abajo hacia arriba)
                sessionsToClose.reverse().forEach(session => {
                    activeSessionsSheet.deleteRow(session.rowIndex);
                });
            }
            // --- FIN: LÓGICA DE LÍMITE DE SESIONES ---

            const sessionToken = Utilities.getUuid();
            userSheet.getRange(i + 2, COLS.sessionToken).setValue(sessionToken);

            // Registrar nueva sesión
            activeSessionsSheet.appendRow([userId, sessionToken, new Date().toISOString()]);

            const user = {};
            headers.forEach((header, index) => {
                if (header !== 'password') {
                    user[header] = userRow[index];
                }
            });
            user.sessionToken = sessionToken;
            user.id = userId;

            return { status: 'success', user };
        }

        throw new Error("Credenciales inválidas.");
    } catch (error) {
        Logger.log(`Error crítico en handleLogin para el usuario '${payload ? payload.username : 'N/A'}': ${error.stack}`);
        return {
            status: 'error',
            message: 'Error interno al intentar iniciar sesión.',
            details: {
                message: error.message,
                stack: error.stack
            }
        };
    }
}

function handleValidateSession(payload) {
    const { userId, sessionToken } = payload;
    if (!userId || !sessionToken) return { valid: false };

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const COLS = getColumnMap(SHEET_NAMES.USERS);
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, Math.max(COLS.id, COLS.sessionToken)).getValues();

    for (const row of data) {
        if (row[COLS.id - 1] == userId && row[COLS.sessionToken - 1] === sessionToken) {
            return { valid: true };
        }
    }
    return { valid: false };
}

function handleGetUsers(payload) {
    const { privilegios } = payload;
    if (!privilegios) throw new Error("Se requiere el rol del solicitante.");

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    const headers = data.shift().map(h => camelCase(h.trim()));
    const allUsers = data.map(row => {
        const user = {};
        headers.forEach((h, i) => { if (h !== 'password' && h !== 'sessionToken') user[h] = row[i]; });
        return user;
    });

    // Lógica de filtrado basada en la jerarquía de roles
    const visibleUsers = allUsers.filter(user => {
        switch (privilegios) {
            case 'Desarrollador': return true;
            case 'Gefe': return !['Desarrollador', 'Tecnico_Exterior'].includes(user.privilegios);
            case 'Supervisor': return user.privilegios === 'Tecnico';
            default: return false;
        }
    });

    return { status: 'success', users: visibleUsers };
}

/**
 * Genera un nombre de usuario único basado en el nombre completo.
 * Estrategia: p_pena -> e_pena -> p_ordonez -> etc.
 */
function generateUniqueUsername(sheet, COLS, fullname) {
    if (!fullname || typeof fullname !== 'string') return '';
    const parts = fullname.trim().toLowerCase().split(' ');
    if (parts.length < 2) return ''; // Requiere al menos nombre y un apellido

    const nombre = parts[0];
    const primerApellido = parts.find((p, i) => i > 0 && p.length > 2); // Simple heuristic for a surname
    const segundoApellido = parts.find((p, i) => i > 1 && p !== primerApellido && p.length > 2);

    const potentialUsernames = [
        `${nombre.charAt(0)}_${primerApellido}`,
        parts.length > 2 ? `${parts[1].charAt(0)}_${primerApellido}` : null, // p_pena, a_pena (Pablo Antonio)
        segundoApellido ? `${nombre.charAt(0)}_${segundoApellido}` : null
    ].filter(Boolean); // Filtra nulos

    const data = sheet.getRange(2, COLS.nombreUsuario, sheet.getLastRow() -1, 1).getValues().flat();

    for(const username of potentialUsernames) {
        if (!data.includes(username)) {
            return username;
        }
    }
    // Fallback con número aleatorio si todo falla
    return `${nombre.charAt(0)}_${primerApellido}${Math.floor(Math.random() * 100)}`;
}


function handleCreateUser(payload) {
    const { newUser, creatorRole } = payload;
    if (!newUser || !creatorRole) throw new Error("Datos insuficientes para crear el usuario.");

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const COLS = getColumnMap(SHEET_NAMES.USERS);

    // 1. Validar permisos
    const allowedRoles = {
        'Desarrollador': ['Desarrollador', 'Gefe', 'Supervisor', 'Tecnico', 'Tecnico_Exterior'],
        'Gefe': ['Gefe', 'Supervisor', 'Tecnico'],
        'Supervisor': ['Tecnico']
    };
    if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(newUser.privilegios)) {
        throw new Error(`El rol '${creatorRole}' no tiene permisos para crear usuarios de tipo '${newUser.privilegios}'.`);
    }

    // 2. Generar nombre de usuario
    if (!newUser.nombreUsuario) {
        newUser.nombreUsuario = generateUniqueUsername(userSheet, COLS, newUser.nombre);
    }

    // 3. Verificar que el nombre de usuario no exista
    const usernames = userSheet.getRange(2, COLS.nombreUsuario, userSheet.getLastRow() - 1, 1).getValues().flat();
    if (usernames.includes(newUser.nombreUsuario)) {
        throw new Error(`El nombre de usuario '${newUser.nombreUsuario}' ya existe.`);
    }

    // 4. Agregar usuario a la hoja
    const newRow = [
        '', // ID se autogenera
        newUser.nombreUsuario,
        newUser.password || '12345678', // Contraseña por defecto
        newUser.privilegios,
        newUser.nombre,
        newUser.telefono || '',
        newUser.correoElectronico || '',
        '' // SessionToken
    ];
    userSheet.appendRow(newRow);

    return { status: 'success', message: `Usuario '${newUser.nombreUsuario}' creado exitosamente.` };
}

function handleUpdateUser(payload) {
    const { userId, updates, updaterRole } = payload;
    if (!userId || !updates || !updaterRole) throw new Error("Datos insuficientes para actualizar.");

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const COLS = getColumnMap(SHEET_NAMES.USERS);
    const data = userSheet.getDataRange().getValues();
    const headers = data.shift();

    for (let i = 0; i < data.length; i++) {
        if (data[i][COLS.id - 1] == userId) {
            const userToUpdateRole = data[i][COLS.privilegios - 1];

            // Lógica de permisos de actualización
            const canUpdate = {
                'Desarrollador': () => true,
                'Gefe': (targetRole) => !['Desarrollador', 'Tecnico_Exterior'].includes(targetRole),
                'Supervisor': (targetRole) => targetRole === 'Tecnico'
            };

            if (!canUpdate[updaterRole] || !canUpdate[updaterRole](userToUpdateRole)) {
                 throw new Error(`Rol '${updaterRole}' no puede modificar a '${userToUpdateRole}'.`);
            }

            // Aplicar actualizaciones
            Object.keys(updates).forEach(key => {
                const colIndex = COLS[key];
                if (colIndex && key !== 'id') { // No se puede cambiar el ID
                    // Si la contraseña está vacía, no la actualices
                    if (key === 'password' && !updates.password) return;
                    userSheet.getRange(i + 2, colIndex).setValue(updates[key]);
                }
            });

            return { status: 'success', message: 'Usuario actualizado.' };
        }
    }
    throw new Error("Usuario no encontrado para actualizar.");
}

function handleDeleteUser(payload) {
    const { userId, deleterRole } = payload;
    if (!userId || !deleterRole) throw new Error("Datos insuficientes para eliminar.");

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const COLS = getColumnMap(SHEET_NAMES.USERS);
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, COLS.privilegios).getValues();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row[COLS.id - 1] == userId) {
            const userToDeleteRole = row[COLS.privilegios - 1];

            // Lógica de permisos de eliminación
            const canDelete = {
                 'Desarrollador': (targetRole) => true,
                 'Gefe': (targetRole) => !['Desarrollador', 'Gefe', 'Tecnico_Exterior'].includes(targetRole),
                 'Supervisor': (targetRole) => targetRole === 'Tecnico'
            };

            if (!canDelete[deleterRole] || !canDelete[deleterRole](userToDeleteRole)) {
                throw new Error(`Rol '${deleterRole}' no puede eliminar a '${userToDeleteRole}'.`);
            }

            userSheet.deleteRow(i + 2);
            return { status: 'success', message: 'Usuario eliminado.' };
        }
    }
    throw new Error("Usuario no encontrado para eliminar.");
}

function handleChangePassword(payload) {
    const { userId, currentPassword, newPassword } = payload;
    if(!userId || !currentPassword || !newPassword) throw new Error("Faltan datos para el cambio de contraseña.");

    const userSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    const COLS = getColumnMap(SHEET_NAMES.USERS);
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, Math.max(COLS.id, COLS.password)).getValues();

    for (let i = 0; i < data.length; i++) {
        if (data[i][COLS.id - 1] == userId) {
            if (data[i][COLS.password - 1] === currentPassword) {
                userSheet.getRange(i + 2, COLS.password).setValue(newPassword);
                return { status: 'success', message: 'Contraseña actualizada.' };
            } else {
                throw new Error("La contraseña actual es incorrecta.");
            }
        }
    }
    throw new Error("Usuario no encontrado.");
}


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Convierte un string a camelCase. Ej: "Tipo de Corte" -> "tipoDeCorte"
 */
function camelCase(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "").trim().split(' ')
        .map((word, index) => {
            if (!word) return '';
            const lowerWord = word.toLowerCase();
            return index === 0 ? lowerWord : lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
        }).join('');
}

/**
 * Obtiene un mapa de nombres de columna (camelCase) a sus índices (base 1).
 */
function getColumnMap(sheetName) {
    const sheet = getSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Hoja no encontrada: ${sheetName}`);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headers.reduce((map, header, i) => {
        map[camelCase(header)] = i + 1;
        return map;
    }, {});
}

/**
 * Convierte un array de strings a un objeto clave-valor.
 */
function arrayToMap(arr) {
    return arr.reduce((obj, item, index) => {
        obj[item] = index;
        return obj;
    }, {});
}


/**
 * Verifica si un año está dentro de un rango (ej. "2015-2020").
 */
function isYearInRange(inputYear, sheetYearValue) {
    const year = parseInt(inputYear.trim(), 10);
    if (isNaN(year)) return false;
    const cleanedSheetYear = sheetYearValue.toString().trim();
    if (cleanedSheetYear.includes('-')) {
        const parts = cleanedSheetYear.split('-').map(p => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return year >= parts[0] && year <= parts[1];
        }
    }
    return year === parseInt(cleanedSheetYear, 10);
}

/**
 * Sube archivos a Google Drive y devuelve sus URLs públicas.
 */
function handleFileUploads(files, vehicleData) {
    if (Object.keys(files).length === 0) return {};
    const { categoria, marca, modelo, anio } = vehicleData;
    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const anioFolder = getOrCreateFolder(parentFolder, [categoria, marca, modelo, anio]);
    const fileUrls = {};

    for (const fieldName in files) {
        const file = files[fieldName];
        if (file && file.data) {
            const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
            const decoded = Utilities.base64Decode(file.data);
            const blob = Utilities.newBlob(decoded, file.mimeType, fileName);
            const driveFile = anioFolder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrls[fieldName] = driveFile.getUrl();
        }
    }
    return fileUrls;
}

/**
 * Crea una jerarquía de carpetas si no existe.
 */
function getOrCreateFolder(parentFolder, pathArray) {
    let currentFolder = parentFolder;
    pathArray.forEach(folderName => {
        const folders = currentFolder.getFoldersByName(folderName);
        currentFolder = folders.hasNext() ? folders.next() : currentFolder.createFolder(folderName);
    });
    return currentFolder;
}

/**
 * Actualiza una fila con la nueva información de cortes, apertura, etc.
 */
function updateRowData(sheet, COLS, targetRow, additionalInfo, fileUrls, colaborador) {
    const { nuevoCorte, apertura, alimentacion, notas } = additionalInfo;
    const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).getValues()[0];

    // Actualizar cortes
    if (nuevoCorte && nuevoCorte.tipo && nuevoCorte.descripcion) {
        const cutSlots = [
            { typeCol: COLS.tipoDeCorte, descCol: COLS.descripcionDelCorte, imgCol: COLS.imagenDelCorte, imgUrl: fileUrls.imagenCorte },
            { typeCol: COLS.tipoDeCorte2, descCol: COLS.descripcionDelSegundoCorte, imgCol: COLS.imagenDeCorte2, imgUrl: fileUrls.imagenCorte },
            { typeCol: COLS.tipoDeCorte3, descCol: COLS.descripcionDelCorte3, imgCol: COLS.imagenDelCorte3, imgUrl: fileUrls.imagenCorte }
        ];
        for (const slot of cutSlots) {
            if (!rowValues[slot.descCol - 1]) {
                sheet.getRange(targetRow, slot.typeCol).setValue(nuevoCorte.tipo);
                sheet.getRange(targetRow, slot.descCol).setValue(nuevoCorte.descripcion);
                if (slot.imgUrl) sheet.getRange(targetRow, slot.imgCol).setValue(slot.imgUrl);
                break;
            }
        }
    }

    // Actualizar otros campos si están vacíos
    if (apertura && !rowValues[COLS.apertura - 1]) {
        sheet.getRange(targetRow, COLS.apertura).setValue(apertura);
        if (fileUrls.imagenApertura) sheet.getRange(targetRow, COLS.imagenDeLaApertura).setValue(fileUrls.imagenApertura);
    }
    if (alimentacion && !rowValues[COLS.cablesDeAlimentacion - 1]) {
        sheet.getRange(targetRow, COLS.cablesDeAlimentacion).setValue(alimentacion);
        if (fileUrls.imagenAlimentacion) sheet.getRange(targetRow, COLS.imagenDeLosCablesDeAlimentacion).setValue(fileUrls.imagenAlimentacion);
    }
    if (notas && !rowValues[COLS.notaImportante - 1]) {
        sheet.getRange(targetRow, COLS.notaImportante).setValue(notas);
    }

    // Actualizar colaborador
    const existingColaborador = (rowValues[COLS.colaborador - 1] || "").toString();
    if (existingColaborador && !existingColaborador.toLowerCase().includes(colaborador.toLowerCase())) {
        sheet.getRange(targetRow, COLS.colaborador).setValue(`${existingColaborador}<br>${colaborador}`);
    } else if (!existingColaborador) {
        sheet.getRange(targetRow, COLS.colaborador).setValue(colaborador);
    }
}
