// ==================================================================
// ARCHIVO DE BACKEND PARA GESTIÓN DE USUARIOS
// ==================================================================

// --- CONSTANTES GLOBALES ---
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const USERS_SHEET_NAME = "Users";

// --- ENRUTADOR PRINCIPAL (doGet y doPost) ---

function doGet(e) {
  try {
    const action = e.parameter.action;

    // Enrutamiento para acciones del catálogo
    if (action === "getDropdowns") return getDropdownData();
    if (action === "checkVehicle") return checkVehicleExists(e.parameter);
    if (action === "getFeedback") return getFeedbackForVehicle(e.parameter.vehicleId);

    // Acción por defecto: obtener datos de una hoja (puede ser para usuarios o catálogo)
    const sheetName = e.parameter.sheet;
    if (sheetName === USERS_SHEET_NAME) {
       // Si se piden los usuarios, se devuelven como JSON sin la conversión a camelCase
       // para mantener la consistencia con el frontend existente.
       const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
       const values = sheet.getDataRange().getValues();
       const headers = values.shift();
       const data = values.map(row => {
         const rowObject = {};
         headers.forEach((header, index) => {
           // CORRECCIÓN IMPORTANTE: Normalizar los encabezados aquí también para asegurar consistencia
           const camelCaseHeader = toCamelCase(header);
           if (camelCaseHeader) rowObject[camelCaseHeader] = row[index];
         });
         return rowObject;
       });
       return createJsonResponse(data);
    }

    // Por defecto, asumimos que es una petición para el catálogo
    return getSheetDataAsJson(sheetName || CORTES_SHEET_NAME_CATALOG);

  } catch (error) {
    Logger.log(`Error en doGet: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ error: "Error en el servidor (doGet)", details: { message: error.message } });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (['createUser', 'updateUser', 'deleteUser', 'changePassword'].includes(action)) {
      return handleUserActions(payload);
    } else if (['addLike', 'reportProblem', 'replyToProblem', 'resolveProblem'].includes(action)) {
      return handleFeedbackActions(payload);
    } else {
      return handleCortesPost(payload);
    }
  } catch (error) {
    Logger.log(`Error crítico en doPost: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ success: false, error: "Error en el servidor (doPost)", details: { message: error.message } });
  }
}

// ==================================================================
// LÓGICA PARA GESTIÓN DE USUARIOS
// ==================================================================

function handleUserActions(payload) {
  const { action, data, actor } = payload;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  const allUsers = sheet.getDataRange().getValues();
  // Usamos una función de ayuda para obtener los índices de las columnas, sin importar espacios
  const headers = getHeaderIndices(allUsers[0]);

  // Validar actor para acciones protegidas
  if (!actor) {
    return createJsonResponse({ status: 'error', message: 'Acción no autorizada: actor no identificado.' });
  }

  switch (action) {
    case 'createUser': return createUser(sheet, allUsers, headers, data, actor);
    case 'updateUser': return updateUser(sheet, allUsers, headers, data, actor);
    case 'deleteUser': return deleteUser(sheet, allUsers, headers, data.username, actor);
    default: return createJsonResponse({ status: 'error', message: 'Acción de usuario no válida.' });
  }
}

function createUser(sheet, allUsers, headers, newUser, actor) {
  // Aquí iría la lógica de permisos para crear usuario

  const nombreCompleto = newUser.nombre;
  const partesNombre = nombreCompleto.split(' ').filter(p => p);
  const primerNombre = partesNombre[0] || '';
  let username = '';

  // Lógica mejorada para generar nombre de usuario
  if (partesNombre.length > 1) {
      const primerApellido = partesNombre[1];
      username = `${primerNombre.charAt(0).toLowerCase()}_${primerApellido.toLowerCase()}`;
      if (allUsers.some(row => row[headers['Nombre_Usuario']] === username)) {
          const segundoApellido = partesNombre.length > 2 ? partesNombre[2] : null;
          if (segundoApellido) {
              username = `${primerNombre.charAt(0).toLowerCase()}_${segundoApellido.toLowerCase()}`;
          }
      }
  } else {
      username = primerNombre.toLowerCase();
  }

  // Manejo de colisiones
  let finalUsername = username;
  let count = 1;
  while(allUsers.some(row => row[headers['Nombre_Usuario']] === finalUsername)) {
      finalUsername = `${username}${count}`;
      count++;
  }

  const newRowData = new Array(allUsers[0].length).fill('');
  newRowData[headers['ID']] = allUsers.length;
  newRowData[headers['Nombre_Usuario']] = finalUsername;
  newRowData[headers['Password']] = newUser.password;
  newRowData[headers['Privilegios']] = newUser.privilegios;
  newRowData[headers['Nombre']] = newUser.nombre;
  newRowData[headers['Telefono']] = newUser.telefono;
  newRowData[headers['Correo_Electronico']] = newUser.correo;
  newRowData[headers['SessionToken']] = '';

  sheet.appendRow(newRowData);
  return createJsonResponse({ status: 'success', message: 'Usuario creado exitosamente.', username: finalUsername });
}

function hasPermission(actor, action, targetUserRow, headers) {
    if (!actor || !targetUserRow) return false;
    const actorRole = (actor.privilegios || "").trim();
    const targetRole = (targetUserRow[headers['Privilegios']] || "").trim();

    const roleHierarchy = { 'Desarrollador': 4, 'Gefe': 3, 'Supervisor': 2, 'Técnico': 1, 'Tecnico_Exterior': 0 };
    const actorLevel = roleHierarchy[actorRole] || -1;
    const targetLevel = roleHierarchy[targetRole] || -1;

    if (actorRole === 'Desarrollador') return true;
    if (actorLevel <= targetLevel && actor.nombreUsuario !== targetUserRow[headers['Nombre_Usuario']]) return false;
    if (targetRole === 'Tecnico_Exterior' && actorRole !== 'Desarrollador') return false;

    if (action === 'delete' && actorLevel === targetLevel) return false;

    return true;
}

function updateUser(sheet, allUsers, headers, userData, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === userData.originalUsername);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });
  const targetUser = allUsers[rowIndex];

  // Un usuario puede editar su propia información no sensible.
  const isSelfEdit = actor.nombreUsuario === userData.originalUsername;

  if (!isSelfEdit && !hasPermission(actor, 'update', targetUser, headers)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para editar este usuario.' });
  }

  const sheetRowIndex = rowIndex + 1;
  if (isSelfEdit) {
     sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
     sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correo);
     if (userData.password && userData.currentPassword) {
         if(targetUser[headers['Password']] !== userData.currentPassword) {
            return createJsonResponse({ status: 'error', message: 'La contraseña actual es incorrecta.' });
         }
         sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
     }
     return createJsonResponse({ status: 'success', message: 'Tu perfil ha sido actualizado.' });
  } else { // Edición por un admin/supervisor
    sheet.getRange(sheetRowIndex, headers['Nombre_Usuario'] + 1).setValue(userData.nombreUsuario);
    sheet.getRange(sheetRowIndex, headers['Nombre'] + 1).setValue(userData.nombre);
    sheet.getRange(sheetRowIndex, headers['Privilegios'] + 1).setValue(userData.privilegios);
    sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
    sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correo);
    if (userData.password && userData.password.length >= 8) {
      sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
    }
  }
  return createJsonResponse({ status: 'success', message: 'Usuario actualizado exitosamente.' });
}

function deleteUser(sheet, allUsers, headers, username, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === username);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });

  const targetUser = allUsers[rowIndex];
  if (!hasPermission(actor, 'delete', targetUser, headers)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para eliminar este usuario.' });
  }

  sheet.deleteRow(rowIndex + 1);
  return createJsonResponse({ status: 'success', message: 'Usuario eliminado exitosamente.' });
}


// ==================================================================
// FUNCIONES DE AYUDA GENÉRICAS
// ==================================================================

function getHeaderIndices(headerRow) {
  const headers = {};
  headerRow.forEach((header, index) => {
    // Limpiar espacios en blanco de los encabezados para hacerlos claves consistentes
    const cleanHeader = header.trim();
    if(cleanHeader) headers[cleanHeader] = index;
  });
  return headers;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function safeToString(value) {
  return value !== null && value !== undefined ? value.toString().trim().toLowerCase() : "";
}

function toCamelCase(text) {
    if (!text || typeof text !== 'string') return '';
    let cleanedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    cleanedText = cleanedText.replace(/[_\s]+/g, ' ');
    cleanedText = cleanedText.replace(/[^a-z0-9\s]/g, '');
    const words = cleanedText.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return '';
    const camelCase = words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    return words[0] + camelCase;
}
