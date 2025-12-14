const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';
const DATA_SHEET_NAME = "Cortes";

const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DATA_SHEET_NAME);

// Column mapping based on the user's description
const COLS = {
    ID: 1,
    CATEGORIA: 2,
    IMAGEN_VEHICULO: 3,
    MARCA: 4,
    MODELO: 5,
    TIPO_ENCENDIDO: 6,
    ANIO: 7,
    TIPO_CORTE_1: 8,
    DESC_CORTE_1: 9,
    IMG_CORTE_1: 10,
    DESC_CORTE_2: 11,
    TIPO_CORTE_2: 12,
    IMG_CORTE_2: 13,
    APERTURA: 14,
    IMG_APERTURA: 15,
    NOTA_IMPORTANTE: 16,
    CABLES_ALIMENTACION: 17,
    IMG_ALIMENTACION: 18,
    COMO_DESARMAR: 19,
    COLABORADOR: 20,
    TIPO_CORTE_3: 21,
    DESC_CORTE_3: 22,
    IMG_CORTE_3: 23
};

/**
 * Checks if a given year falls within a specified range from a sheet cell.
 * @param {string} inputYear The year provided by the user (e.g., "2016").
 * @param {string} sheetYearValue The value from the sheet, which can be a single year or a range (e.g., "2015-2020").
 * @returns {boolean} True if the year is a match or within the range.
 */
function isYearInRange(inputYear, sheetYearValue) {
  const year = parseInt(inputYear.trim(), 10);
  if (isNaN(year)) {
    return false; // User input is not a valid year number
  }

  const cleanedSheetYear = sheetYearValue.toString().trim();

  // Check for range (e.g., "2015-2020" or "2015 - 2020")
  if (cleanedSheetYear.includes('-')) {
    const parts = cleanedSheetYear.split('-').map(part => parseInt(part.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [startYear, endYear] = parts;
      return year >= startYear && year <= endYear;
    }
  }

  // Check for single year match
  const sheetYearNum = parseInt(cleanedSheetYear, 10);
  if (!isNaN(sheetYearNum)) {
    return year === sheetYearNum;
  }

  // Fallback for non-numeric or complex string exact matches like "2015-2020" vs "2015-2020"
  return inputYear.trim() === cleanedSheetYear;
}


function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "getDropdowns") {
      const dropdowns = {
        'categoria': getListDataValidationValues(COLS.CATEGORIA),
        'tipo-encendido': getListDataValidationValues(COLS.TIPO_ENCENDIDO),
        'tipo-corte': getListDataValidationValues(COLS.TIPO_CORTE_1)
      };
      return ContentService.createTextOutput(JSON.stringify(dropdowns))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "checkVehicle") {
      const { marca, modelo, anio, tipoEncendido } = e.parameter;
      if (!marca || !modelo || !anio || !tipoEncendido) {
        throw new Error("Parámetros de búsqueda incompletos.");
      }
      Logger.log(`Checking vehicle: marca=${marca}, modelo=${modelo}, anio=${anio}, tipoEncendido=${tipoEncendido}`);

      const data = sheet.getDataRange().getValues();
      const headers = data.shift();

      let existingRowData = null;
      let rowIndex = -1;

      const paramMarca = marca.trim().toLowerCase();
      const paramModelo = modelo.trim().toLowerCase();
      const paramAnio = anio.trim(); // Keep raw for range check
      const paramTipoEncendido = tipoEncendido.trim().toLowerCase();

      for(let i = 0; i < data.length; i++) {
        const row = data[i];

        const sheetMarca = (row[COLS.MARCA - 1] || "").toString().trim().toLowerCase();
        const sheetModelo = (row[COLS.MODELO - 1] || "").toString().trim().toLowerCase();
        const sheetAnioRaw = (row[COLS.ANIO - 1] || "").toString();
        const sheetTipoEncendido = (row[COLS.TIPO_ENCENDIDO - 1] || "").toString().trim().toLowerCase();

        if (
          sheetMarca === paramMarca &&
          sheetModelo === paramModelo &&
          isYearInRange(paramAnio, sheetAnioRaw) &&
          sheetTipoEncendido === paramTipoEncendido
        ) {
          rowIndex = i + 2;
          const normalizedHeaders = normalizeHeaders(headers);
          existingRowData = normalizedHeaders.reduce((obj, header, index) => {
            obj[header] = row[index];
            return obj;
          }, {});
          Logger.log(`Match found at row: ${rowIndex}`);
          break;
        }
      }

      if (!existingRowData) Logger.log("No matching vehicle found.");

      return ContentService.createTextOutput(JSON.stringify({ exists: !!existingRowData, data: existingRowData, rowIndex: rowIndex }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action." })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error in doGet: ${error.message}\nStack: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ error: "Server error in doGet", details: { message: error.message } }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  Logger.log("doPost started");
  try {
    const params = JSON.parse(e.postData.contents);
    const { vehicleInfo = {}, additionalInfo = {}, files = {} } = params;
    const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;

    if (!marca || !modelo || !anio || !categoria || !tipoEncendido) {
      throw new Error("Información esencial del vehículo está incompleta.");
    }
    Logger.log(`Processing: ${categoria} > ${marca} ${modelo} ${anio}`);

    const fileUrls = handleFileUploads(files, { categoria, marca, modelo, anio });

    let targetRow;
    const isNewRow = !rowIndex || rowIndex === -1;

    if (isNewRow) {
      Logger.log("Creating a new row.");
      // Ensure appendRow receives an array of the correct length to prevent errors.
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
      if (fileUrls.imagenVehiculo) {
        sheet.getRange(targetRow, COLS.IMAGEN_VEHICULO).setValue(fileUrls.imagenVehiculo);
      }
    } else {
      targetRow = parseInt(rowIndex, 10);
      Logger.log(`Updating existing row: ${targetRow}`);
    }

    updateRowData(targetRow, additionalInfo, fileUrls, colaborador);

    Logger.log("Spreadsheet update complete.");
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Registro guardado exitosamente.", row: targetRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Critical Error in doPost: ${error.message}\nStack: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "A server error occurred.", details: { message: error.message } }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFileUploads(files, vehicleData) {
  let fileUrls = {};
  if (Object.keys(files).length === 0) {
    Logger.log("No files to upload.");
    return fileUrls;
  }

  Logger.log("Starting file uploads.");
  const { categoria, marca, modelo, anio } = vehicleData;
  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const anioFolder = getOrCreateFolder(parentFolder, [categoria, marca, modelo, anio]);

  for (const fieldName in files) {
      const file = files[fieldName];
      if(file && file.data) {
        const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
        Logger.log(`Uploading: ${fileName}`);
        fileUrls[fieldName] = uploadFileToDrive(anioFolder, file, fileName);
      }
  }
  Logger.log("File uploads completed.");
  return fileUrls;
}

function updateRowData(targetRow, additionalInfo, fileUrls, colaborador) {
  const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).getValues()[0];
  const { nuevoCorte, apertura, alimentacion, notas } = additionalInfo;

  // Update logic for cuts
  if (nuevoCorte && nuevoCorte.tipo) {
    Logger.log("Adding new cut info.");
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

  // Update other fields
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

  // Safely update collaborator
  const rawExistingColaborador = sheet.getRange(targetRow, COLS.COLABORADOR).getValue();
  const existingColaborador = safeToString(rawExistingColaborador);
  const currentCollaborator = safeToString(colaborador);

  if (existingColaborador && !existingColaborador.includes(currentCollaborator)) {
    sheet.getRange(targetRow, COLS.COLABORADOR).setValue(`${rawExistingColaborador}<br>${colaborador}`);
  } else if (!existingColaborador) {
    sheet.getRange(targetRow, COLS.COLABORADOR).setValue(colaborador);
  }
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
    const file = folder.createFile(blob); // Simplified: always create new, versioning is handled by Drive.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
}

function getListDataValidationValues(column) {
  const rule = sheet.getRange(2, column).getDataValidation();
  if (rule && rule.getCriteriaType() == SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return rule.getCriteriaValues()[0];
  }
  return [];
}

// --- Helper Functions ---
function safeToString(value) {
  return value !== null && value !== undefined ? value.toString().trim().toLowerCase() : "";
}

function normalizeHeaders(headers) {
  return headers.map(header => {
    if (!header) return '';
    return header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(' ')
      .map((word, index) => {
        if (!word) return '';
        const lowerWord = word.toLowerCase();
        return index === 0 ? lowerWord : lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      })
      .join('');
  });
}
