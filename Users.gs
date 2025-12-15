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
    const action = e.parameter.action;

    if (action === "getDropdowns") return getDropdownData();
    if (action === "checkVehicle") return checkVehicleExists(e.parameter);
    if (action === "getFeedback") return getFeedbackForVehicle(e.parameter.vehicleId);

    const sheetName = e.parameter.sheet || CORTES_SHEET_NAME;
    if (sheetName === USERS_SHEET_NAME) {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      return createJsonResponse({ values: data });
    } else {
      return getSheetDataAsJson(sheetName);
    }
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
// LÓGICA PARA FEEDBACK
// ==================================================================

function getFeedbackForVehicle(vehicleId) {
  if (!vehicleId) return createJsonResponse({ comments: [], likeCount: 0 });
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
  const cortesSheet = spreadsheet.getSheetByName(CORTES_SHEET_NAME);

  // Obtener comentarios (sin cambios)
  const feedbackData = feedbackSheet.getDataRange().getValues();
  const feedbackHeaders = feedbackData.shift() || [];
  const vehicleIdIndex = feedbackHeaders.indexOf("ID_vehiculo");
  const comments = feedbackData.filter(row => row[vehicleIdIndex] == vehicleId).map(row => ({
      id: row[0], user: row[1], problem: row[3], response: row[4], resolved: row[5], responder: row[6]
  }));

  // Obtener likes de la hoja "Cortes"
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
      feedbackSheet.appendRow([ new Date().getTime(), actor.Nombre, data.vehicleId, data.problem, "", "No", "" ]);
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
  if (!rowIndex || rowIndex === -1) {
    const placeholderRow = new Array(sheet.getMaxColumns()).fill('');
    sheet.appendRow(placeholderRow);
    targetRow = sheet.getLastRow();

    const previousRowRange = sheet.getRange(targetRow - 1, 1, 1, sheet.getMaxColumns());
    const newRowRange = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns());
    previousRowRange.copyTo(newRowRange, {formatOnly: true});
    sheet.getRange(targetRow, 2, 1, sheet.getMaxColumns() - 1).clearContent();

    sheet.getRange(targetRow, COLS.CATEGORIA).setValue(categoria);
    sheet.getRange(targetRow, COLS.MARCA).setValue(marca);
    sheet.getRange(targetRow, COLS.MODELO).setValue(modelo);
    sheet.getRange(targetRow, COLS.ANIO).setValue(anio);
    sheet.getRange(targetRow, COLS.TIPO_ENCENDIDO).setValue(tipoEncendido);
    if (fileUrls.imagenVehiculo) sheet.getRange(targetRow, COLS.IMAGEN_VEHICULO).setValue(fileUrls.imagenVehiculo);
  } else {
    targetRow = parseInt(rowIndex, 10);
  }

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
// LÓGICA PARA GESTIÓN DE USUARIOS (del antiguo Users.gs)
// ==================================================================

function handleUserActions(payload) {
  const { action, data, actor } = payload;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  const allUsers = sheet.getDataRange().getValues();
  const headers = getHeaderIndices(allUsers[0]);

  if (!actor && action !== 'changePassword') return createJsonResponse({ status: 'error', message: 'No se ha identificado al actor de la acción.' });

  switch (action) {
    case 'createUser': return createUser(sheet, allUsers, headers, data, actor);
    case 'updateUser': return updateUser(sheet, allUsers, headers, data, actor);
    case 'deleteUser': return deleteUser(sheet, allUsers, headers, data.username, actor);
    default: return createJsonResponse({ status: 'error', message: 'Acción de usuario no válida.' });
  }
}

function createUser(sheet, allUsers, headers, newUser, actor) {
  const nombreCompleto = newUser.nombre;
  const partesNombre = nombreCompleto.split(' ');
  const primerNombre = partesNombre[0];
  let username = `${primerNombre.charAt(0).toLowerCase()}_${(partesNombre.length > 1 ? partesNombre[1] : '').toLowerCase()}`;

  const usernameIndex = headers['Nombre_Usuario'];
  if (allUsers.some(row => row[usernameIndex] === username)) {
    const segundoApellido = partesNombre.length > 2 ? partesNombre[2] : null;
    if(segundoApellido) username = `${primerNombre.charAt(0).toLowerCase()}_${segundoApellido.toLowerCase()}`;
  }
  if (allUsers.some(row => row[usernameIndex] === username)) {
    let count = 1;
    while(allUsers.some(row => row[usernameIndex] === `${username}${count}`)) count++;
    username = `${username}${count}`;
  }

  const newRow = [];
  newRow[headers['ID']] = allUsers.length;
  newRow[headers['Nombre_Usuario']] = username;
  newRow[headers['Password']] = newUser.password;
  newRow[headers['Privilegios']] = newUser.privilegios;
  newRow[headers['Nombre']] = newUser.nombre;
  newRow[headers['Telefono']] = newUser.telefono;
  newRow[headers['Correo_Electronico']] = newUser.correo;
  newRow[headers['SessionToken']] = '';
  sheet.appendRow(newRow);
  return createJsonResponse({ status: 'success', message: 'Usuario creado exitosamente.', username: username });
}

function hasPermission(actor, action, targetUser) {
  const actorRole = actor.Privilegios;
  const targetRole = targetUser[getHeaderIndices(SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME).getDataRange().getValues()[0])['Privilegios']];

  const roleHierarchy = {
    'Desarrollador': 4,
    'Gefe': 3,
    'Supervisor': 2,
    'Técnico': 1,
    'Tecnico_Exterior': 0
  };

  const actorLevel = roleHierarchy[actorRole];
  const targetLevel = roleHierarchy[targetRole];

  if (actorRole === 'Desarrollador') return true;

  if (actorRole === 'Gefe') {
    if (targetRole === 'Tecnico_Exterior' || actorLevel <= targetLevel) return false; // Gefes cannot edit other Gefes
    return true;
  }

  if (actorRole === 'Supervisor') {
     if (targetRole === 'Tecnico_Exterior' || actorLevel <= targetLevel) return false; // Supervisors cannot edit other Supervisors
    return true;
  }

  // Technicians can only edit themselves (validated differently)
  return false;
}


function updateUser(sheet, allUsers, headers, userData, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === userData.originalUsername);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });

  const targetUser = allUsers[rowIndex];

  // Self-edit case for technicians
  if (actor.Nombre_Usuario === userData.originalUsername) {
     const sheetRowIndex = rowIndex + 1;
     // Allow updating specific fields
     sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
     sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correo);
     if (userData.password && userData.currentPassword) {
         if(targetUser[headers['Password']] !== userData.currentPassword) {
            return createJsonResponse({ status: 'error', message: 'La contraseña actual es incorrecta.' });
         }
         sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
     }
     return createJsonResponse({ status: 'success', message: 'Tu perfil ha sido actualizado.' });
  }

  // Admin/Supervisor edit case
  if (!hasPermission(actor, 'update', targetUser)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para editar este usuario.' });
  }

  const sheetRowIndex = rowIndex + 1;
  sheet.getRange(sheetRowIndex, headers['Nombre_Usuario'] + 1).setValue(userData.nombreUsuario);
  sheet.getRange(sheetRowIndex, headers['Nombre'] + 1).setValue(userData.nombre);
  sheet.getRange(sheetRowIndex, headers['Privilegios'] + 1).setValue(userData.privilegios);
  sheet.getRange(sheetRowIndex, headers['Telefono'] + 1).setValue(userData.telefono);
  sheet.getRange(sheetRowIndex, headers['Correo_Electronico'] + 1).setValue(userData.correo);
  if (userData.password && userData.password.length >= 8) {
    sheet.getRange(sheetRowIndex, headers['Password'] + 1).setValue(userData.password);
  }
  return createJsonResponse({ status: 'success', message: 'Usuario actualizado exitosamente.' });
}

function deleteUser(sheet, allUsers, headers, username, actor) {
  const rowIndex = allUsers.findIndex(row => row[headers['Nombre_Usuario']] === username);
  if (rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Usuario no encontrado.' });

  const targetUser = allUsers[rowIndex];
  if (!hasPermission(actor, 'delete', targetUser)) {
    return createJsonResponse({ status: 'error', message: 'No tienes permiso para eliminar este usuario.' });
  }

  sheet.deleteRow(rowIndex + 1);
  return createJsonResponse({ status: 'success', message: 'Usuario eliminado exitosamente.' });
}


// ==================================================================
// LÓGICA PARA OBTENER DATOS DEL CATÁLOGO
// ==================================================================

function getSheetDataAsJson(sheetName) {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get(sheetName);

  if (cachedData) {
    // Si los datos están en caché, devolverlos directamente
    return createJsonResponse(JSON.parse(cachedData));
  }

  // Si no, obtener los datos de la hoja
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

  // Guardar los datos en la caché por 10 minutos (600 segundos)
  cache.put(sheetName, JSON.stringify(data), 600);

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

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
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
  if (!text) return '';
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, '').replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()).replace(/\s/g, '').replace(/^(.)/, (_, chr) => chr.toLowerCase());
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
