// ==================================================================
// ARCHIVO DE BACKEND UNIFICADO
// ==================================================================

// --- CONSTANTES GLOBALES ---
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';

// Nombres de las hojas
const USERS_SHEET_NAME = "Users";
const CORTES_SHEET_NAME = "Cortes";
const TUTORIAL_SHEET_NAME = "Tutorial";
const RELAY_SHEET_NAME = "Configuración del Relay";
const FEEDBACK_SHEET_NAME = "Feedbacks";
const COLS = {
    ID: 1, CATEGORIA: 2, IMAGEN_VEHICULO: 3, MARCA: 4, MODELO: 5, TIPO_ENCENDIDO: 6, ANIO: 7,
    TIPO_CORTE_1: 8, DESC_CORTE_1: 9, IMG_CORTE_1: 10, DESC_CORTE_2: 11, TIPO_CORTE_2: 12, IMG_CORTE_2: 13,
    APERTURA: 14, IMG_APERTURA: 15, NOTA_IMPORTANTE: 16, CABLES_ALIMENTACION: 17, IMG_ALIMENTACION: 18,
    COMO_DESARMAR: 19, COLABORADOR: 20, TIPO_CORTE_3: 21, DESC_CORTE_3: 22, IMG_CORTE_3: 23,
    UTIL: 24 // Columna X
};

// --- ENRUTADOR PRINCIPAL (doGet y doPost) ---

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;

    if (action === "getDropdowns") return getDropdownData();
    if (action === "checkVehicle") return checkVehicleExists(e.parameter);
    if (action === "getFeedback") return getFeedbackForVehicle(e.parameter.vehicleId);

    // Lógica de enrutamiento de hoja más explícita para evitar errores.
    if (params.sheet === 'Users') {
      // Para la hoja de usuarios, se requiere un actor para filtrar por permisos.
      if (!params.actor) return createJsonResponse({ status: 'error', message: 'Se requiere un actor para obtener la lista de usuarios.' });
      const actor = JSON.parse(params.actor);
      return getVisibleUsers(actor);
    }

    // Por defecto, o si no se especifica una hoja válida, se devuelve la de "Cortes".
    // Esto previene que se devuelvan datos incorrectos a la página de gestión de usuarios.
    return getSheetDataAsJson(CORTES_SHEET_NAME);

  } catch (error) {
    Logger.log(`Error en doGet: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ status: 'error', message: `Error en el servidor (doGet): ${error.message}` });
  }
}

function doPost(e) {
  try {
    // Registro para depuración: ver exactamente lo que se recibe.
    Logger.log('doPost__Contenido_Recibido: ' + e.postData.contents);

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (jsonError) {
      Logger.log('Error de parseo JSON en doPost: ' + jsonError.message);
      return createJsonResponse({ status: 'error', message: 'La solicitud no es un JSON válido: ' + e.postData.contents });
    }

    const action = payload.action;

    if (action === 'login') {
      return handleLogin(payload.data);
    } else if (['createUser', 'updateUser', 'deleteUser'].includes(action)) {
      return handleUserActions(payload);
    } else if (['addLike', 'reportProblem', 'replyToProblem', 'resolveProblem'].includes(action)) {
      return handleFeedbackActions(payload);
    } else {
      return handleCortesPost(payload);
    }
  } catch (error) {
    Logger.log(`Error crítico en doPost: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ status: 'error', message: `Error en el servidor (doPost): ${error.message}` });
  }
}

// ==================================================================
// LÓGICA PARA FEEDBACK
// ==================================================================

function getFeedbackForVehicle(vehicleId) {
  if (!vehicleId) return createJsonResponse({ comments: [], likeCount: 0 });
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
  const cortesSheet = spreadsheet.getSheetByName(CORTES_SHEET_NAME);

  // --- Obtener comentarios (Refactorizado para ser robusto) ---
  const feedbackData = feedbackSheet.getDataRange().getValues();
  const headerRow = feedbackData.shift() || [];
  const headers = getHeaderIndices(headerRow); // Usa la función de ayuda para mapear encabezados

  const comments = feedbackData
    .filter(row => row[headers['ID_vehiculo']] == vehicleId)
    .map(row => ({
      id: row[headers['ID']],
      user: row[headers['Usuario']],
      problem: row[headers['Problema']],
      response: row[headers['Respuesta']],
      resolved: row[headers['¿Se resolvió?']],
      responder: row[headers['Responde']]
    }));

  // --- Obtener likes (sin cambios, ya es robusto) ---
  let likeCount = 0;
  const cortesData = cortesSheet.getDataRange().getValues();
  const idIndex = COLS.ID - 1;
  const utilIndex = COLS.UTIL - 1;

  const vehicleRow = cortesData.find(row => row[idIndex] == vehicleId);
  if (vehicleRow && vehicleRow[utilIndex]) {
    likeCount = parseInt(vehicleRow[utilIndex], 10) || 0;
  }

  return createJsonResponse({ comments, likeCount });
}


function handleFeedbackActions(payload) {
  const { action, data, actor } = payload;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  switch(action) {
    case 'reportProblem':
      if (!data.vehicleId || !data.problem || !actor) throw new Error("Faltan datos para reportar el problema.");
      const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
      // CORRECCIÓN CRÍTICA: El objeto de sesión del frontend usa `nombre` (minúscula), no `Nombre`.
      feedbackSheet.appendRow([ new Date().getTime(), actor.nombre, data.vehicleId, data.problem, "", "No", "" ]);
      return createJsonResponse({ status: 'success', message: 'Problema reportado exitosamente.' });

    case 'addLike':
      try {
        if (!data.vehicleId) {
          throw new Error("Falta el ID del vehículo para 'addLike'.");
        }

        // Invalidar la caché de 'Cortes' antes de modificar
        CacheService.getScriptCache().remove(CORTES_SHEET_NAME);

        const cortesSheet = spreadsheet.getSheetByName(CORTES_SHEET_NAME);
        if (!cortesSheet) {
          throw new Error("La hoja 'Cortes' no fue encontrada.");
        }

        const cortesData = cortesSheet.getDataRange().getValues();
        const idIndex = COLS.ID - 1;

        let rowIndex = -1;
        // Se compara el vehicleId como string para evitar problemas de tipo de dato (ej. '1' vs 1)
        const vehicleIdStr = String(data.vehicleId);
        for (let i = 1; i < cortesData.length; i++) {
          if (String(cortesData[i][idIndex]) == vehicleIdStr) {
            rowIndex = i + 1;
            break;
          }
        }

        if (rowIndex !== -1) {
          const utilCell = cortesSheet.getRange(rowIndex, COLS.UTIL);
          const currentLikes = parseInt(utilCell.getValue(), 10) || 0;
          const newLikeCount = currentLikes + 1;
          utilCell.setValue(newLikeCount);
          return createJsonResponse({ status: 'success', message: 'Like añadido.', newLikeCount: newLikeCount });
        } else {
          Logger.log(`No se encontró el vehículo con ID: ${data.vehicleId} para añadir el like.`);
          return createJsonResponse({ status: 'error', message: 'No se encontró el registro del vehículo para actualizar.' });
        }
      } catch (error) {
        Logger.log(`Error en 'addLike': ${error.message} (Vehicle ID: ${data.vehicleId}). Stack: ${error.stack}`);
        return createJsonResponse({ status: 'error', message: `Error interno del servidor: ${error.message}` });
      }

    // Placeholder para futuras implementaciones
    case 'replyToProblem': return createJsonResponse({ status: 'pending', message: 'Función no implementada.' });
    case 'resolveProblem': return createJsonResponse({ status: 'pending', message: 'Función no implementada.' });

    default:
      return createJsonResponse({ status: 'error', message: 'Acción de feedback no válida.' });
  }
}

// ... (El resto del código se mantiene igual) ...

// ==================================================================
// LÓGICA PARA GESTIÓN DE CORTES (del antiguo Code.gs)
// ==================================================================

function getDropdownData() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CORTES_SHEET_NAME);
  const dropdowns = {
    'categoria': getListDataValidationValues(sheet, COLS.CATEGORIA),
    'tipo-encendido': getListDataValidationValues(sheet, COLS.TIPO_ENCENDIDO),
    'tipo-corte': getListDataValidationValues(sheet, COLS.TIPO_CORTE_1)
  };
  return createJsonResponse(dropdowns);
}

function checkVehicleExists(params) {
  const { marca, modelo, anio, tipoEncendido } = params;
  if (!marca || !modelo || !anio || !tipoEncendido) throw new Error("Parámetros de búsqueda incompletos.");

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CORTES_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  let existingRowData = null, rowIndex = -1;

  for(let i = 0; i < data.length; i++) {
    const row = data[i];
    if (
      safeToString(row[COLS.MARCA - 1]) === safeToString(marca) &&
      safeToString(row[COLS.MODELO - 1]) === safeToString(modelo) &&
      isYearInRange(anio, safeToString(row[COLS.ANIO - 1])) &&
      safeToString(row[COLS.TIPO_ENCENDIDO - 1]) === safeToString(tipoEncendido)
    ) {
      rowIndex = i + 2;
      const normalizedHeaders = normalizeHeaders(headers);
      existingRowData = normalizedHeaders.reduce((obj, header, index) => {
        obj[header] = row[index];
        return obj;
      }, {});
      break;
    }
  }
  return createJsonResponse({ exists: !!existingRowData, data: existingRowData, rowIndex: rowIndex });
}

function handleCortesPost(payload) {
  // Invalidar la caché de 'Cortes' porque se va a modificar
  CacheService.getScriptCache().remove(CORTES_SHEET_NAME);

  const { vehicleInfo = {}, additionalInfo = {}, files = {} } = payload;
  const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;
  if (!marca || !modelo || !anio || !categoria || !tipoEncendido) throw new Error("Información esencial del vehículo está incompleta.");

  const fileUrls = handleFileUploads(files, { categoria, marca, modelo, anio });

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CORTES_SHEET_NAME);
  let targetRow;

  // Si no hay rowIndex o es -1, significa que es un nuevo registro.
  if (!rowIndex || rowIndex === -1) {
    const lastRow = sheet.getLastRow();
    // CORRECCIÓN CRÍTICA: Insertar una fila después de la última fila con contenido.
    // Esto hereda automáticamente el formato y las validaciones de datos.
    sheet.insertRowAfter(lastRow);
    targetRow = lastRow + 1;

    // Poblar la nueva fila con la información básica del vehículo.
    sheet.getRange(targetRow, COLS.CATEGORIA).setValue(categoria);
    sheet.getRange(targetRow, COLS.MARCA).setValue(marca);
    sheet.getRange(targetRow, COLS.MODELO).setValue(modelo);
    sheet.getRange(targetRow, COLS.ANIO).setValue(anio);
    sheet.getRange(targetRow, COLS.TIPO_ENCENDIDO).setValue(tipoEncendido);
    if (fileUrls.imagenVehiculo) sheet.getRange(targetRow, COLS.IMAGEN_VEHICULO).setValue(fileUrls.imagenVehiculo);
  } else {
    // Si ya existe, simplemente usamos el rowIndex proporcionado.
    targetRow = parseInt(rowIndex, 10);
  }

  // Llamar a la función unificada para actualizar o llenar el resto de la información.
  updateRowData(sheet, targetRow, additionalInfo, fileUrls, colaborador);
  return createJsonResponse({ success: true, message: "Registro guardado exitosamente.", row: targetRow });
}

function handleFileUploads(files, vehicleData) {
  let fileUrls = {};
  if (Object.keys(files).length === 0) return fileUrls;

  const { categoria, marca, modelo, anio } = vehicleData;
  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const anioFolder = getOrCreateFolder(parentFolder, [categoria, marca, modelo, anio]);

  for (const fieldName in files) {
      const file = files[fieldName];
      if(file && file.data) {
        const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
        fileUrls[fieldName] = uploadFileToDrive(anioFolder, file, fileName);
      }
  }
  return fileUrls;
}

function updateRowData(sheet, targetRow, additionalInfo, fileUrls, colaborador) {
  const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).getValues()[0];
  const { nuevoCorte, apertura, alimentacion, notas } = additionalInfo;

  if (nuevoCorte && nuevoCorte.tipo) {
    const cutSlots = [
      { typeCol: COLS.TIPO_CORTE_1, descCol: COLS.DESC_CORTE_1, imgCol: COLS.IMG_CORTE_1, imgUrl: fileUrls.imagenCorte },
      { typeCol: COLS.TIPO_CORTE_2, descCol: COLS.DESC_CORTE_2, imgCol: COLS.IMG_CORTE_2, imgUrl: fileUrls.imagenCorte },
      { typeCol: COLS.TIPO_CORTE_3, descCol: COLS.DESC_CORTE_3, imgCol: COLS.IMG_CORTE_3, imgUrl: fileUrls.imagenCorte }
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
  if (apertura && !rowValues[COLS.APERTURA - 1]) {
    sheet.getRange(targetRow, COLS.APERTURA).setValue(apertura);
    if (fileUrls.imagenApertura) sheet.getRange(targetRow, COLS.IMG_APERTURA).setValue(fileUrls.imagenApertura);
  }
  if (alimentacion && !rowValues[COLS.CABLES_ALIMENTACION - 1]) {
    sheet.getRange(targetRow, COLS.CABLES_ALIMENTACION).setValue(alimentacion);
    if (fileUrls.imagenAlimentacion) sheet.getRange(targetRow, COLS.IMG_ALIMENTACION).setValue(fileUrls.imagenAlimentacion);
  }
  if (notas && !rowValues[COLS.NOTA_IMPORTANTE - 1]) {
    sheet.getRange(targetRow, COLS.NOTA_IMPORTANTE).setValue(notas);
  }

  const rawColab = sheet.getRange(targetRow, COLS.COLABORADOR).getValue();
  const existingColab = safeToString(rawColab);
  const currentColab = safeToString(colaborador);
  if (existingColab && !existingColab.includes(currentColab)) {
    sheet.getRange(targetRow, COLS.COLABORADOR).setValue(`${rawColab}<br>${colaborador}`);
  } else if (!existingColab) {
    sheet.getRange(targetRow, COLS.COLABORADOR).setValue(colaborador);
  }
}

// ==================================================================
// LÓGICA DE AUTENTICACIÓN
// ==================================================================

function handleLogin(credentials) {
  const { username, password } = credentials;
  if (!username || !password) {
    return createJsonResponse({ status: 'error', message: 'Usuario y contraseña son requeridos.' });
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  const allUsers = sheet.getDataRange().getValues();
  const headersRaw = allUsers.shift();
  const headers = getHeaderIndices(headersRaw);

  const userRow = allUsers.find(row =>
    row[headers['Nombre_Usuario']] === username &&
    String(row[headers['Password']]) === String(password)
  );

  if (userRow) {
    const actor = {
      id: userRow[headers['ID']],
      nombreUsuario: userRow[headers['Nombre_Usuario']],
      privilegios: userRow[headers['Privilegios']],
      nombre: userRow[headers['Nombre']]
    };
    return createJsonResponse({ status: 'success', actor: actor });
  } else {
    return createJsonResponse({ status: 'error', message: 'Credenciales inválidas.' });
  }
}

// ==================================================================
// LÓGICA PARA GESTIÓN DE USUARIOS (REFACTORIZADO CON ROLES)
// ==================================================================

function handleUserActions(payload) {
  const { action, data, actor } = payload;
  if (!actor) return createJsonResponse({ status: 'error', message: 'Acción no autorizada: actor no identificado.' });

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  const allUsers = sheet.getDataRange().getValues();
  const headers = getHeaderIndices(allUsers.shift() || []); // Consume la fila de cabecera

  switch (action) {
    case 'createUser': return createUser(sheet, allUsers, headers, data, actor);
    case 'updateUser': return updateUser(sheet, allUsers, headers, data, actor);
    case 'deleteUser': return deleteUser(sheet, allUsers, headers, data.username, actor);
    default: return createJsonResponse({ status: 'error', message: 'Acción de usuario no válida.' });
  }
}

function hasPermission(actor, action, targetRole) {
    const actorRole = normalizeRole(actor.privilegios);
    const normalizedTargetRole = normalizeRole(targetRole);

    const roleHierarchy = { 'desarrollador': 4, 'gefe': 3, 'supervisor': 2, 'tecnico': 1, 'tecnico_exterior': 1 };
    const actorLevel = roleHierarchy[actorRole] || 0;
    const targetLevel = roleHierarchy[normalizedTargetRole] || 0;

    // El desarrollador tiene control total
    if (actorRole === 'desarrollador') return true;

    // Reglas de Creación
    if (action === 'create') {
        if (actorRole === 'gefe' && ['supervisor', 'tecnico', 'gefe'].includes(normalizedTargetRole)) return true;
        if (actorRole === 'supervisor' && normalizedTargetRole === 'tecnico') return true;
        return false;
    }

    // Reglas de Edición y Eliminación
    if (action === 'edit' || action === 'delete') {
        // Un rol no puede actuar sobre un nivel igual o superior
        if (actorLevel <= targetLevel) return false;

        // Excepciones específicas
        if (actorRole === 'gefe' && ['desarrollador', 'tecnico_exterior'].includes(normalizedTargetRole)) return false;
        if (actorRole === 'supervisor' && normalizedTargetRole !== 'tecnico') return false;

        // Restricción adicional para eliminar
        if (action === 'delete' && actorRole === 'gefe' && normalizedTargetRole === 'gefe') return false;

        return true;
    }
    return false;
}

function createUser(sheet, allUsers, headers, newUser, actor) {
  if (!hasPermission(actor, 'create', newUser.privilegios)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para crear este tipo de usuario.' });
  }

  // Lógica para generar nombre de usuario (sin cambios)
  const nombreCompleto = newUser.nombre;
  const partesNombre = nombreCompleto.split(' ');
  const primerNombre = partesNombre[0];
  let username = `${primerNombre.charAt(0).toLowerCase()}_${(partesNombre.length > 1 ? partesNombre[1] : '').toLowerCase()}`;
  const usernameIndex = headers['Nombre_Usuario'];
  if (allUsers.some(row => row[usernameIndex] === username)) {
      let count = 1;
      while (allUsers.some(row => row[usernameIndex] === `${username}${count}`)) count++;
      username = `${username}${count}`;
  }

  const newRowData = [];
  newRowData[headers['ID']] = allUsers.length + 1;
  newRowData[headers['Nombre_Usuario']] = username;
  newRowData[headers['Password']] = newUser.password;
  newRowData[headers['Privilegios']] = newUser.privilegios;
  newRowData[headers['Nombre']] = newUser.nombre;
  newRowData[headers['Telefono']] = newUser.telefono;
  newRowData[headers['Correo_Electronico']] = newUser.correoElectronico;
  newRowData[headers['SessionToken']] = '';

  sheet.appendRow(newRowData);
  return createJsonResponse({ status: 'success', message: 'Usuario creado exitosamente.', username: username });
}

function updateUser(sheet, allUsers, headers, userData, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === userData.originalUsername);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });

  const targetUserRow = allUsers[rowIndex];
  const targetUserRole = targetUserRow[headers['Privilegios']];
  const sheetRowIndex = rowIndex + 2; // +1 porque findIndex es 0-based y +1 por la cabecera

  // Caso 1: Auto-edición (cualquier rol puede editar su propio perfil)
  if (actor.nombreUsuario === userData.originalUsername) {
      if (userData.password && userData.currentPassword) {
          if (targetUserRow[headers['Password']] !== userData.currentPassword) {
              return createJsonResponse({ status: 'error', message: 'La contraseña actual es incorrecta.' });
          }
          sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
      }
      sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
      sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correoElectronico);
      return createJsonResponse({ status: 'success', message: 'Tu perfil ha sido actualizado.' });
  }

  // Caso 2: Edición por un administrador
  if (!hasPermission(actor, 'edit', targetUserRole)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para editar este usuario.' });
  }

  // Actualizar campos permitidos
  sheet.getRange(sheetRowIndex, headers['Nombre'] + 1).setValue(userData.nombre);
  sheet.getRange(sheetRowIndex, headers['Privilegios'] + 1).setValue(userData.privilegios);
  sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
  sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correoElectronico);
  if (userData.password && userData.password.length >= 8) {
    sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
  }

  return createJsonResponse({ status: 'success', message: 'Usuario actualizado exitosamente.' });
}

function deleteUser(sheet, allUsers, headers, username, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === username);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });

  const targetUserRole = allUsers[rowIndex][headers['Privilegios']];

  if (!hasPermission(actor, 'delete', targetUserRole)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para eliminar este usuario.' });
  }

  sheet.deleteRow(rowIndex + 2); // +1 por 0-based y +1 por cabecera
  return createJsonResponse({ status: 'success', message: 'Usuario eliminado exitosamente.' });
}

function getVisibleUsers(actor) {
  const actorRole = normalizeRole(actor.privilegios);

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  const allUsersData = sheet.getDataRange().getValues();
  const headersRaw = allUsersData.shift();
  const headers = getHeaderIndices(headersRaw);
  const privilegeIndex = headers['Privilegios'];

  const visibleUsers = allUsersData.filter(userRow => {
    const userRole = normalizeRole(userRow[privilegeIndex]);
    if (actorRole === 'desarrollador') return true;
    if (actorRole === 'gefe' && ['supervisor', 'tecnico'].includes(userRole)) return true;
    if (actorRole === 'supervisor' && userRole === 'tecnico') return true;
    return false;
  });

  // Convertir las filas filtradas a objetos JSON
  const camelCaseHeaders = headersRaw.map(toCamelCase);
  const jsonData = visibleUsers.map(row => {
    const rowObject = {};
    camelCaseHeaders.forEach((header, index) => {
      if (header) rowObject[header] = row[index];
    });
    return rowObject;
  });

  return createJsonResponse(jsonData);
}


// ==================================================================
// LÓGICA PARA OBTENER DATOS DEL CATÁLOGO
// ==================================================================

function getSheetDataAsJson(sheetName) {
  // NOTA: La caché se ha deshabilitado para las hojas grandes como "Cortes".
  // El JSON generado excedía el límite de 100KB de CacheService, causando el error "Argument too large".
  // Para hojas más pequeñas como Tutorial y Relay, la caché podría reactivarse si fuera necesario.

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return createJsonResponse([]);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return createJsonResponse([]);

  const headers = values[0].map(toCamelCase);
  const data = values.slice(1).map(row => {
    const rowObject = {};
    headers.forEach((header, index) => {
      if (header) rowObject[header] = row[index];
    });
    return rowObject;
  });

  return createJsonResponse(data);
}

// ==================================================================
// FUNCIONES DE AYUDA GENÉRICAS
// ==================================================================

function getHeaderIndices(headerRow) {
  const headers = {};
  headerRow.forEach((header, index) => { headers[header] = index; });
  return headers;
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  return role.trim().toLowerCase().replace('_', '');
}

function safeToString(value) {
  return value !== null && value !== undefined ? value.toString().trim().toLowerCase() : "";
}

function isYearInRange(inputYear, sheetYearValue) {
  const year = parseInt(inputYear.trim(), 10);
  if (isNaN(year)) return false;
  const cleanedSheetYear = sheetYearValue.toString().trim();
  if (cleanedSheetYear.includes('-')) {
    const parts = cleanedSheetYear.split('-').map(part => parseInt(part.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return year >= parts[0] && year <= parts[1];
    }
  }
  const sheetYearNum = parseInt(cleanedSheetYear, 10);
  return !isNaN(sheetYearNum) ? year === sheetYearNum : inputYear.trim() === cleanedSheetYear;
}

function getListDataValidationValues(sheet, column) {
  const rule = sheet.getRange(2, column).getDataValidation();
  return (rule && rule.getCriteriaType() == SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) ? rule.getCriteriaValues()[0] : [];
}

function normalizeHeaders(headers) {
  return headers.map(header => {
    if (!header) return '';
    return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().split(' ').map((word, index) => {
      if (!word) return '';
      const lowerWord = word.toLowerCase();
      return index === 0 ? lowerWord : lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    }).join('');
  });
}

function toCamelCase(text) {
    if (!text || typeof text !== 'string') return '';

    // Normaliza, quita acentos y convierte a minúsculas
    let cleanedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Reemplaza guiones bajos y espacios con un espacio para la división
    cleanedText = cleanedText.replace(/[_\s]+/g, ' ');

    // Quita cualquier otro caracter no alfanumérico
    cleanedText = cleanedText.replace(/[^a-z0-9\s]/g, '');

    const words = cleanedText.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return '';

    const camelCase = words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    return words[0] + camelCase;
}

function getOrCreateFolder(parentFolder, pathArray) {
  let currentFolder = parentFolder;
  pathArray.forEach(folderName => {
    const folders = currentFolder.getFoldersByName(folderName);
    currentFolder = folders.hasNext() ? folders.next() : currentFolder.createFolder(folderName);
  });
  return currentFolder;
}

function uploadFileToDrive(folder, fileObject, fileName) {
  const decoded = Utilities.base64Decode(fileObject.data);
  const blob = Utilities.newBlob(decoded, fileObject.mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
