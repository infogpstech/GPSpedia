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
 * Handles GET requests to the web app.
 * Used for two purposes:
 * 1. action=getDropdowns: Fetches options for select inputs from spreadsheet data validations.
 * 2. action=checkVehicle: Checks if a vehicle already exists in the sheet.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "getDropdowns") {
      // ... (same as before)
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
      Logger.log(`Checking vehicle with params: marca=${marca}, modelo=${modelo}, anio=${anio}, tipoEncendido=${tipoEncendido}`);

      const data = sheet.getDataRange().getValues();
      const headers = data.shift();

      let existingRow = null;
      let rowIndex = -1;

      for(let i = 0; i < data.length; i++) {
        const row = data[i];

        const sheetMarca = row[COLS.MARCA - 1].toString().trim().toLowerCase();
        const sheetModelo = row[COLS.MODELO - 1].toString().trim().toLowerCase();
        const sheetAnio = row[COLS.ANIO - 1].toString().trim().toLowerCase();
        const sheetTipoEncendido = row[COLS.TIPO_ENCENDIDO - 1].toString().trim().toLowerCase();

        const paramMarca = marca.trim().toLowerCase();
        const paramModelo = modelo.trim().toLowerCase();
        const paramAnio = anio.trim().toLowerCase();
        const paramTipoEncendido = tipoEncendido.trim().toLowerCase();

        // Detailed logging for each comparison
        // Logger.log(`Row ${i+2}: Comparing '${sheetMarca}' vs '${paramMarca}', '${sheetModelo}' vs '${paramModelo}', '${sheetAnio}' vs '${paramAnio}', '${sheetTipoEncendido}' vs '${paramTipoEncendido}'`);

        if (
          sheetMarca === paramMarca &&
          sheetModelo === paramModelo &&
          sheetAnio === paramAnio &&
          sheetTipoEncendido === paramTipoEncendido
        ) {
          rowIndex = i + 2; // +1 for header, +1 for 0-based index
          existingRow = headers.reduce((obj, header, index) => {
            obj[header] = row[index];
            return obj;
          }, {});
          Logger.log(`Match found at row: ${rowIndex}`);
          break;
        }
      }

      if (!existingRow) {
        Logger.log("No matching vehicle found.");
      }

      const response = {
        exists: !!existingRow,
        data: existingRow,
        rowIndex: rowIndex
      };

      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action." }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error in doGet: ${error.message}\nStack: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({
      error: "Server error in doGet",
      details: { message: error.message, stack: error.stack }
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Retrieves the list items from a data validation rule on the first data row of a given column.
 */
function getListDataValidationValues(column) {
  const range = sheet.getRange(2, column); // Check validation on the first data row
  const rule = range.getDataValidation();
  if (rule != null && rule.getCriteriaType() == SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return rule.getCriteriaValues()[0];
  }
  return [];
}


/**
 * Handles POST requests to the web app.
 * This function processes the form submission, uploads files to Google Drive,
 * and updates the Google Sheet.
 */
function doPost(e) {
  Logger.log("doPost started");
  try {
    // Step 1: Parse incoming data
    let params;
    try {
      params = JSON.parse(e.postData.contents);
      Logger.log("Successfully parsed JSON payload.");
    } catch (parseError) {
      Logger.log(`JSON Parsing Error: ${parseError.message}`);
      throw new Error(`Invalid JSON format: ${parseError.message}`);
    }

    // --- Defensive Data Handling ---
    // Ensure top-level keys exist to prevent destructuring errors.
    const vehicleInfo = params.vehicleInfo || {};
    const additionalInfo = params.additionalInfo || {};
    const files = params.files || {};

    // Proceed if we have the essential vehicle info.
    if (!vehicleInfo.marca || !vehicleInfo.modelo || !vehicleInfo.anio) {
      throw new Error("Información esencial del vehículo (marca, modelo, año) no fue recibida.");
    }
    const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;
    // --- End Defensive Data Handling ---

    Logger.log(`Processing data for: ${marca} ${modelo} ${anio}`);

    // Step 2: Handle File Uploads
    let fileUrls = {};
    try {
      // Only proceed if files object is not empty
      if (Object.keys(files).length > 0) {
          Logger.log("Starting file uploads.");
          const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
          const categoriaFolder = getOrCreateFolder(parentFolder, categoria);
          const marcaFolder = getOrCreateFolder(categoriaFolder, marca);
          const modeloFolder = getOrCreateFolder(marcaFolder, modelo);
          const anioFolder = getOrCreateFolder(modeloFolder, anio);

          for (const fieldName in files) {
              const file = files[fieldName];
              // Double-check file and data property exist before processing
              if(file && file.data) {
                const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
                Logger.log(`Uploading file for field: ${fieldName} with name: ${fileName}`);
                fileUrls[fieldName] = uploadFileToDrive(anioFolder, file, fileName);
              }
          }
          Logger.log("File uploads completed.");
      } else {
        Logger.log("No files to upload.");
      }
    } catch (fileError) {
       Logger.log(`Error during file upload: ${fileError.message}`);
       throw new Error(`File upload failed: ${fileError.message}`);
    }


    // Step 3: Update Spreadsheet
    Logger.log("Starting spreadsheet update.");
    let targetRow;
    let isNewRow = !rowIndex || rowIndex === -1;

    if (isNewRow) {
      Logger.log("Creating a new row.");
      sheet.appendRow([]);
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
      Logger.log(`New row created at index: ${targetRow}`);
    } else {
      targetRow = parseInt(rowIndex, 10);
      Logger.log(`Updating existing row at index: ${targetRow}`);
    }

    const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).getValues()[0];
    const { nuevoCorte, apertura, alimentacion, notas } = additionalInfo;

    // Update logic for cuts
    if (nuevoCorte && nuevoCorte.tipo) {
      Logger.log("Adding new cut information.");
      if (!rowValues[COLS.DESC_CORTE_1 - 1]) {
        sheet.getRange(targetRow, COLS.TIPO_CORTE_1).setValue(nuevoCorte.tipo);
        sheet.getRange(targetRow, COLS.DESC_CORTE_1).setValue(nuevoCorte.descripcion);
        if(fileUrls.imagenCorte) sheet.getRange(targetRow, COLS.IMG_CORTE_1).setValue(fileUrls.imagenCorte);
      } else if (!rowValues[COLS.DESC_CORTE_2 - 1]) {
        sheet.getRange(targetRow, COLS.TIPO_CORTE_2).setValue(nuevoCorte.tipo);
        sheet.getRange(targetRow, COLS.DESC_CORTE_2).setValue(nuevoCorte.descripcion);
        if(fileUrls.imagenCorte) sheet.getRange(targetRow, COLS.IMG_CORTE_2).setValue(fileUrls.imagenCorte);
      } else if (!rowValues[COLS.DESC_CORTE_3 - 1]) {
        sheet.getRange(targetRow, COLS.TIPO_CORTE_3).setValue(nuevoCorte.tipo);
        sheet.getRange(targetRow, COLS.DESC_CORTE_3).setValue(nuevoCorte.descripcion);
        if(fileUrls.imagenCorte) sheet.getRange(targetRow, COLS.IMG_CORTE_3).setValue(fileUrls.imagenCorte);
      }
    }

    // Update other fields
    if (apertura && !rowValues[COLS.APERTURA - 1]) {
      sheet.getRange(targetRow, COLS.APERTURA).setValue(apertura);
      if(fileUrls.imagenApertura) sheet.getRange(targetRow, COLS.IMG_APERTURA).setValue(fileUrls.imagenApertura);
    }
    if (alimentacion && !rowValues[COLS.CABLES_ALIMENTACION - 1]) {
      sheet.getRange(targetRow, COLS.CABLES_ALIMENTACION).setValue(alimentacion);
      if(fileUrls.imagenAlimentacion) sheet.getRange(targetRow, COLS.IMG_ALIMENTACION).setValue(fileUrls.imagenAlimentacion);
    }
    if (notas && !rowValues[COLS.NOTA_IMPORTANTE - 1]) {
      sheet.getRange(targetRow, COLS.NOTA_IMPORTANTE).setValue(notas);
    }

    // Update collaborator
    const existingColaborador = sheet.getRange(targetRow, COLS.COLABORADOR).getValue().toString();
    if (existingColaborador && !existingColaborador.includes(colaborador)) {
      sheet.getRange(targetRow, COLS.COLABORADOR).setValue(`${existingColaborador}<br>${colaborador}`);
    } else if (!existingColaborador) {
      sheet.getRange(targetRow, COLS.COLABORADOR).setValue(colaborador);
    }
    Logger.log("Spreadsheet update complete.");

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Registro guardado exitosamente.", row: targetRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Critical Error in doPost: ${error.message}\nStack: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "A server error occurred.",
        details: {
          message: error.message,
          stack: error.stack
        }
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Gets a folder by name within a parent folder, or creates it if it doesn't exist.
 */
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

/**
 * Uploads a file (sent as a base64 string from the client) to a specific Drive folder.
 */
function uploadFileToDrive(folder, fileObject, fileName) {
    const decoded = Utilities.base64Decode(fileObject.data);
    const blob = Utilities.newBlob(decoded, fileObject.mimeType, fileName);

    // Check if file with the same name exists, if so, create a new version (or handle as needed)
    const existingFiles = folder.getFilesByName(fileName);
    if(existingFiles.hasNext()){
        // Overwrite existing file. Alternatively, could version it e.g., fileName + new Date().getTime()
       const existingFile = existingFiles.next();
       existingFile.setContent(blob);
       existingFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       return existingFile.getUrl();
    } else {
       const newFile = folder.createFile(blob);
       newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       return newFile.getUrl();
    }
}
