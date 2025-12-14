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
      const dropdowns = {
        'categoria': getListDataValidationValues(COLS.CATEGORIA),
        'tipo-encendido': getListDataValidationValues(COLS.TIPO_ENCENDIDO),
        'tipo-corte': getListDataValidationValues(COLS.TIPO_CORTE_1) // All cut types share the same validation
      };
      return ContentService.createTextOutput(JSON.stringify(dropdowns))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "checkVehicle") {
      const { marca, modelo, anio, tipoEncendido } = e.parameter;
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();

      let existingRow = null;
      let rowIndex = -1;

      for(let i = 0; i < data.length; i++) {
        const row = data[i];
        if (
          row[COLS.MARCA - 1].toString().trim().toLowerCase() === marca.trim().toLowerCase() &&
          row[COLS.MODELO - 1].toString().trim().toLowerCase() === modelo.trim().toLowerCase() &&
          row[COLS.ANIO - 1].toString().trim().toLowerCase() === anio.trim().toLowerCase() &&
          row[COLS.TIPO_ENCENDIDO - 1].toString().trim().toLowerCase() === tipoEncendido.trim().toLowerCase()
        ) {
          rowIndex = i + 2; // +1 for header, +1 for 0-based index
          existingRow = headers.reduce((obj, header, index) => {
            obj[header] = row[index];
            return obj;
          }, {});
          break;
        }
      }

      const response = {
        exists: !!existingRow,
        data: existingRow,
        rowIndex: rowIndex
      };

      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default response for invalid action
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action." }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
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
  try {
    const params = JSON.parse(e.postData.contents);
    const {
      rowIndex,
      categoria,
      marca,
      modelo,
      anio,
      tipoEncendido,
      colaborador
    } = params.vehicleInfo;

    const files = params.files;
    let fileUrls = {};

    // 1. Handle File Uploads
    if (Object.keys(files).length > 0) {
        const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const categoriaFolder = getOrCreateFolder(parentFolder, categoria);
        const marcaFolder = getOrCreateFolder(categoriaFolder, marca);
        const modeloFolder = getOrCreateFolder(marcaFolder, modelo);
        const anioFolder = getOrCreateFolder(modeloFolder, anio);

        for (const fieldName in files) {
            const file = files[fieldName];
            if(file) {
              const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
              fileUrls[fieldName] = uploadFileToDrive(anioFolder, file, fileName);
            }
        }
    }

    // 2. Update Spreadsheet
    let targetRow;
    let isNewRow = !rowIndex || rowIndex === -1;

    if (isNewRow) {
      sheet.appendRow([]); // Create a new row
      targetRow = sheet.getLastRow();
      // Inherit data validations from the row above
      const previousRowRange = sheet.getRange(targetRow - 1, 1, 1, sheet.getMaxColumns());
      const newRowRange = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns());
      previousRowRange.copyTo(newRowRange, {formatOnly: true});

      // Clear content of the new row except formulas (like ID)
      const dataRangeToClear = sheet.getRange(targetRow, 2, 1, sheet.getMaxColumns() - 1);
      dataRangeToClear.clearContent();

      // Set basic vehicle info for the new row
      sheet.getRange(targetRow, COLS.CATEGORIA).setValue(categoria);
      sheet.getRange(targetRow, COLS.MARCA).setValue(marca);
      sheet.getRange(targetRow, COLS.MODELO).setValue(modelo);
      sheet.getRange(targetRow, COLS.ANIO).setValue(anio);
      sheet.getRange(targetRow, COLS.TIPO_ENCENDIDO).setValue(tipoEncendido);
      if (fileUrls.imagenVehiculo) {
        sheet.getRange(targetRow, COLS.IMAGEN_VEHICULO).setValue(fileUrls.imagenVehiculo);
      }

    } else {
      targetRow = parseInt(rowIndex);
    }

    const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).getValues()[0];

    // Update fields based on what's new
    const { nuevoCorte, apertura, alimentacion, notas } = params.additionalInfo;

    // Add new cut information to the first available slot
    if (nuevoCorte && nuevoCorte.tipo) {
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

    // Add other info if provided and cell is empty
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
    const existingColaborador = sheet.getRange(targetRow, COLS.COLABORADOR).getValue();
    if (existingColaborador) {
        if (!existingColaborador.includes(colaborador)) {
            sheet.getRange(targetRow, COLS.COLABORADOR).setValue(existingColaborador + "<br>" + colaborador);
        }
    } else {
        sheet.getRange(targetRow, COLS.COLABORADOR).setValue(colaborador);
    }


    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Registro guardado exitosamente.", row: targetRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
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
