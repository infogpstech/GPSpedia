// ==================================================================
// LÓGICA PARA GESTIÓN DEL CATÁLOGO Y FEEDBACK
// ==================================================================

// --- CONSTANTES GLOBALES (Requeridas por el catálogo) ---
const SPREADSHEET_ID_CATALOG = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID_CATALOG = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';

// Nombres de las hojas
const CORTES_SHEET_NAME_CATALOG = "Cortes";
const TUTORIAL_SHEET_NAME_CATALOG = "Tutorial";
const RELAY_SHEET_NAME_CATALOG = "Configuración del Relay";
const FEEDBACK_SHEET_NAME_CATALOG = "Feedbacks";
const COLS_CATALOG = {
    ID: 1, CATEGORIA: 2, IMAGEN_VEHICULO: 3, MARCA: 4, MODELO: 5, TIPO_ENCENDIDO: 6, ANIO: 7,
    TIPO_CORTE_1: 8, DESC_CORTE_1: 9, IMG_CORTE_1: 10, DESC_CORTE_2: 11, TIPO_CORTE_2: 12, IMG_CORTE_2: 13,
    APERTURA: 14, IMG_APERTURA: 15, NOTA_IMPORTANTE: 16, CABLES_ALIMENTACION: 17, IMG_ALIMENTACION: 18,
    COMO_DESARMAR: 19, COLABORADOR: 20, TIPO_CORTE_3: 21, DESC_CORTE_3: 22, IMG_CORTE_3: 23,
    UTIL: 24 // Columna X
};


// ==================================================================
// LÓGICA PARA FEEDBACK
// ==================================================================

function getFeedbackForVehicle(vehicleId) {
  if (!vehicleId) return createJsonResponse({ comments: [], likeCount: 0 });
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG);
  const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME_CATALOG);
  const cortesSheet = spreadsheet.getSheetByName(CORTES_SHEET_NAME_CATALOG);

  const feedbackData = feedbackSheet.getDataRange().getValues();
  const feedbackHeaders = feedbackData.shift() || [];
  const vehicleIdIndex = feedbackHeaders.indexOf("ID_vehiculo");
  const comments = feedbackData.filter(row => String(row[vehicleIdIndex]) === String(vehicleId)).map(row => ({
      id: row[0], user: row[1], problem: row[3], response: row[4], resolved: row[5], responder: row[6]
  }));

  let likeCount = 0;
  const cortesData = cortesSheet.getDataRange().getValues();
  const idIndex = COLS_CATALOG.ID - 1;
  const utilIndex = COLS_CATALOG.UTIL - 1;

  const vehicleRow = cortesData.find(row => String(row[idIndex]) === String(vehicleId));
  if (vehicleRow && vehicleRow[utilIndex]) {
    likeCount = parseInt(vehicleRow[utilIndex], 10) || 0;
  }

  return createJsonResponse({ comments, likeCount });
}

function handleFeedbackActions(payload) {
  const { action, data, actor } = payload;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG);

  switch(action) {
    case 'reportProblem':
      if (!data.vehicleId || !data.problem || !actor) throw new Error("Faltan datos para reportar el problema.");
      const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME_CATALOG);
      feedbackSheet.appendRow([ new Date().getTime(), actor.nombre, data.vehicleId, data.problem, "", "No", "" ]);
      return createJsonResponse({ status: 'success', message: 'Problema reportado exitosamente.' });

    case 'addLike':
      try {
        if (!data.vehicleId) {
          throw new Error("Falta el ID del vehículo para 'addLike'.");
        }
        const cortesSheet = spreadsheet.getSheetByName(CORTES_SHEET_NAME_CATALOG);
        if (!cortesSheet) throw new Error("La hoja 'Cortes' no fue encontrada.");

        const cortesData = cortesSheet.getDataRange().getValues();
        const idIndex = COLS_CATALOG.ID - 1;
        const vehicleIdStr = String(data.vehicleId);
        let rowIndex = -1;
        for (let i = 1; i < cortesData.length; i++) {
          if (String(cortesData[i][idIndex]) === vehicleIdStr) {
            rowIndex = i + 1;
            break;
          }
        }
        if (rowIndex !== -1) {
          const utilCell = cortesSheet.getRange(rowIndex, COLS_CATALOG.UTIL);
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

    case 'replyToProblem': return createJsonResponse({ status: 'pending', message: 'Función no implementada.' });
    case 'resolveProblem': return createJsonResponse({ status: 'pending', message: 'Función no implementada.' });

    default:
      return createJsonResponse({ status: 'error', message: 'Acción de feedback no válida.' });
  }
}

// ==================================================================
// LÓGICA PARA GESTIÓN DE CORTES
// ==================================================================

function getDropdownData() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG).getSheetByName(CORTES_SHEET_NAME_CATALOG);
  const dropdowns = {
    'categoria': getListDataValidationValues(sheet, COLS_CATALOG.CATEGORIA),
    'tipo-encendido': getListDataValidationValues(sheet, COLS_CATALOG.TIPO_ENCENDIDO),
    'tipo-corte': getListDataValidationValues(sheet, COLS_CATALOG.TIPO_CORTE_1)
  };
  return createJsonResponse(dropdowns);
}

function checkVehicleExists(params) {
  const { marca, modelo, anio, tipoEncendido } = params;
  if (!marca || !modelo || !anio || !tipoEncendido) throw new Error("Parámetros de búsqueda incompletos.");

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG).getSheetByName(CORTES_SHEET_NAME_CATALOG);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  let existingRowData = null, rowIndex = -1;
  for(let i = 0; i < data.length; i++) {
    const row = data[i];
    if (
      safeToString(row[COLS_CATALOG.MARCA - 1]) === safeToString(marca) &&
      safeToString(row[COLS_CATALOG.MODELO - 1]) === safeToString(modelo) &&
      isYearInRange(anio, safeToString(row[COLS_CATALOG.ANIO - 1])) &&
      safeToString(row[COLS_CATALOG.TIPO_ENCENDIDO - 1]) === safeToString(tipoEncendido)
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
  const { vehicleInfo = {}, additionalInfo = {}, files = {} } = payload;
  const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;
  if (!marca || !modelo || !anio || !categoria || !tipoEncendido) throw new Error("Información esencial del vehículo está incompleta.");
  const fileUrls = handleFileUploads(files, { categoria, marca, modelo, anio });
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG).getSheetByName(CORTES_SHEET_NAME_CATALOG);
  let targetRow;
  if (!rowIndex || rowIndex === -1) {
    const placeholderRow = new Array(sheet.getMaxColumns()).fill('');
    sheet.appendRow(placeholderRow);
    targetRow = sheet.getLastRow();
    const previousRowRange = sheet.getRange(targetRow - 1, 1, 1, sheet.getMaxColumns());
    const newRowRange = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns());
    previousRowRange.copyTo(newRowRange, {formatOnly: true});
    sheet.getRange(targetRow, 2, 1, sheet.getMaxColumns() - 1).clearContent();
    sheet.getRange(targetRow, COLS_CATALOG.CATEGORIA).setValue(categoria);
    sheet.getRange(targetRow, COLS_CATALOG.MARCA).setValue(marca);
    sheet.getRange(targetRow, COLS_CATALOG.MODELO).setValue(modelo);
    sheet.getRange(targetRow, COLS_CATALOG.ANIO).setValue(anio);
    sheet.getRange(targetRow, COLS_CATALOG.TIPO_ENCENDIDO).setValue(tipoEncendido);
    if (fileUrls.imagenVehiculo) sheet.getRange(targetRow, COLS_CATALOG.IMAGEN_VEHICULO).setValue(fileUrls.imagenVehiculo);
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
  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID_CATALOG);
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
      { typeCol: COLS_CATALOG.TIPO_CORTE_1, descCol: COLS_CATALOG.DESC_CORTE_1, imgCol: COLS_CATALOG.IMG_CORTE_1, imgUrl: fileUrls.imagenCorte },
      { typeCol: COLS_CATALOG.TIPO_CORTE_2, descCol: COLS_CATALOG.DESC_CORTE_2, imgCol: COLS_CATALOG.IMG_CORTE_2, imgUrl: fileUrls.imagenCorte },
      { typeCol: COLS_CATALOG.TIPO_CORTE_3, descCol: COLS_CATALOG.DESC_CORTE_3, imgCol: COLS_CATALOG.IMG_CORTE_3, imgUrl: fileUrls.imagenCorte }
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
  if (apertura && !rowValues[COLS_CATALOG.APERTURA - 1]) {
    sheet.getRange(targetRow, COLS_CATALOG.APERTURA).setValue(apertura);
    if (fileUrls.imagenApertura) sheet.getRange(targetRow, COLS_CATALOG.IMG_APERTURA).setValue(fileUrls.imagenApertura);
  }
  if (alimentacion && !rowValues[COLS_CATALOG.CABLES_ALIMENTACION - 1]) {
    sheet.getRange(targetRow, COLS_CATALOG.CABLES_ALIMENTACION).setValue(alimentacion);
    if (fileUrls.imagenAlimentacion) sheet.getRange(targetRow, COLS_CATALOG.IMG_ALIMENTACION).setValue(fileUrls.imagenAlimentacion);
  }
  if (notas && !rowValues[COLS_CATALOG.NOTA_IMPORTANTE - 1]) {
    sheet.getRange(targetRow, COLS_CATALOG.NOTA_IMPORTANTE).setValue(notas);
  }
  const rawColab = sheet.getRange(targetRow, COLS_CATALOG.COLABORADOR).getValue();
  const existingColab = safeToString(rawColab);
  const currentColab = safeToString(colaborador);
  if (existingColab && !existingColab.includes(currentColab)) {
    sheet.getRange(targetRow, COLS_CATALOG.COLABORADOR).setValue(`${rawColab}<br>${colaborador}`);
  } else if (!existingColab) {
    sheet.getRange(targetRow, COLS_CATALOG.COLABORADOR).setValue(colaborador);
  }
}

// ==================================================================
// LÓGICA PARA OBTENER DATOS DEL CATÁLOGO
// ==================================================================

function getSheetDataAsJson(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID_CATALOG).getSheetByName(sheetName);
  if (!sheet) return createJsonResponse([]);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return createJsonResponse([]);

  // CORRECCIÓN: Asegurar que los encabezados se limpien de espacios antes de la conversión.
  const headers = values[0].map(header => toCamelCase(header.trim()));

  const data = values.slice(1).map(row => {
    const rowObject = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObject[header] = row[index];
      }
    });
    return rowObject;
  });
  return createJsonResponse(data);
}

// ==================================================================
// FUNCIONES DE AYUDA (Requeridas por el catálogo)
// ==================================================================

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
