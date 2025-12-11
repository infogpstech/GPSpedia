const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';
const DATA_SHEET_NAME = "Cortes";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Decode all base64 files into blobs
    const fileData = {};
    for (const key in data) {
      if (key.endsWith('Base64')) {
        const fieldName = key.replace('Base64', '');
        const mimeType = data[fieldName + 'MimeType'];
        const fileName = data[fieldName + 'FileName'];
        if (data[key]) {
             const fileContent = Utilities.base64Decode(data[key]);
             fileData[fieldName] = {
                fileName: fileName,
                blob: Utilities.newBlob(fileContent, mimeType, fileName)
             };
        }
      }
    }

    // 2. Find if the row exists
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DATA_SHEET_NAME);
    const range = sheet.getDataRange();
    const values = range.getValues();
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Columns: D=Marca (3), E=Modelo (4), G=Año (6)
      if (row[3] == data.marca && row[4] == data.modelo && row[6] == data.anio) {
        rowIndex = i + 1; // 1-based index for sheet ranges
        break;
      }
    }

    // 3. Upload files to Drive and get their URLs
    const imageUrls = uploadFilesToDrive(data, fileData);

    // 4. Update or create row in Sheet
    if (rowIndex !== -1) {
      updateRow(sheet, rowIndex, data, imageUrls);
    } else {
      createNewRow(sheet, data, imageUrls);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Registro guardado correctamente.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Ocurrió un error al procesar la solicitud: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

function uploadFilesToDrive(data, fileData) {
  const { categoria, marca, modelo, anio } = data;
  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const categoriaFolder = getOrCreateFolder(rootFolder, categoria);
  const marcaFolder = getOrCreateFolder(categoriaFolder, marca);
  const modeloFolder = getOrCreateFolder(marcaFolder, modelo);
  const anioFolder = getOrCreateFolder(modeloFolder, anio);

  const urls = {};

  for (const fieldName in fileData) {
    const file = fileData[fieldName];
    const originalFileName = file.fileName;
    const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'jpg';

    let newFileName;
    if (fieldName === 'imagen_vehiculo') newFileName = `${marca}_${modelo}_${anio}_Vehiculo.${extension}`;
    else if (fieldName === 'imagen_corte1') newFileName = `${marca}_${modelo}_${anio}_${(data.tipo_corte1 || 'Corte1').replace(/ /g, '_')}.${extension}`;
    else if (fieldName === 'imagen_corte2') newFileName = `${marca}_${modelo}_${anio}_${(data.tipo_corte2 || 'Corte2').replace(/ /g, '_')}.${extension}`;
    else if (fieldName === 'imagen_corte3') newFileName = `${marca}_${modelo}_${anio}_${(data.tipo_corte3 || 'Corte3').replace(/ /g, '_')}.${extension}`;
    else if (fieldName === 'imagen_apertura') newFileName = `${marca}_${modelo}_${anio}_Apertura.${extension}`;
    else if (fieldName === 'imagen_alimentacion') newFileName = `${marca}_${modelo}_${anio}_Alimentacion.${extension}`;
    else newFileName = `${marca}_${modelo}_${anio}_${fieldName}.${extension}`; // Fallback

    const uploadedFile = anioFolder.createFile(file.blob).setName(newFileName);
    uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urls[fieldName] = `https://drive.google.com/uc?export=view&id=${uploadedFile.getId()}`;
  }
  return urls;
}

function updateRow(sheet, rowIndex, data, imageUrls) {
  const columnMap = getColumnMap();
  const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  const values = range.getValues()[0];
  let informationAdded = false;

  const updateCell = (colName, value) => {
    if (value) {
      const colIndex = columnMap[colName] - 1;
      if (values[colIndex] === "" || values[colIndex] == null) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(value);
        informationAdded = true;
      }
    }
  };

  updateCell('Tipo de corte 2', data.tipo_corte2);
  updateCell('Descripción del Segundo corte', data.descripcion_corte2);
  updateCell('Imagen de corte 2', imageUrls.imagen_corte2);
  updateCell('Tipo de corte 3', data.tipo_corte3);
  updateCell('Descripción del corte 3', data.descripcion_corte3);
  updateCell('Imagen del corte 3', imageUrls.imagen_corte3);
  updateCell('Apertura', data.apertura);
  updateCell('Imagen de la apertura', imageUrls.imagen_apertura);
  updateCell('Cables de Alimentacion', data.cables_alimentacion);
  updateCell('Imagen de los cables de alimentacion', imageUrls.imagen_alimentacion);
  updateCell('Nota Importante', data.notas);

  if (informationAdded && data.colaborador) {
    const colaboradorCell = sheet.getRange(rowIndex, columnMap['Colaborador']);
    const existingCollaborators = colaboradorCell.getValue().toString();
    if (existingCollaborators && !existingCollaborators.includes(data.colaborador)) {
      colaboradorCell.setValue(existingCollaborators + "<br>" + data.colaborador);
    } else if (!existingCollaborators) {
      colaboradorCell.setValue(data.colaborador);
    }
  }
}

function createNewRow(sheet, data, imageUrls) {
    const lastRow = sheet.getLastRow();
    const newRowRange = sheet.getRange(lastRow + 1, 1, 1, sheet.getLastColumn());

    if (lastRow > 0) {
        const lastDataRowRange = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn());
        lastDataRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        lastDataRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    }

    const columnMap = getColumnMap();
    const numColumns = sheet.getLastColumn();
    const newRowData = new Array(numColumns).fill("");

    newRowData[columnMap['Categoria'] - 1] = data.categoria;
    newRowData[columnMap['Imagen del vehiculo'] - 1] = imageUrls.imagen_vehiculo || "";
    newRowData[columnMap['Marca'] - 1] = data.marca;
    newRowData[columnMap['Modelo'] - 1] = data.modelo;
    newRowData[columnMap['Tipo de encendido'] - 1] = data.tipo_encendido;
    newRowData[columnMap['Año (generacion)'] - 1] = data.anio;
    newRowData[columnMap['Tipo de corte'] - 1] = data.tipo_corte1;
    newRowData[columnMap['Descripcion del corte'] - 1] = data.descripcion_corte1;
    newRowData[columnMap['Imagen del Corte'] - 1] = imageUrls.imagen_corte1 || "";
    newRowData[columnMap['Apertura'] - 1] = data.apertura || "";
    newRowData[columnMap['Imagen de la apertura'] - 1] = imageUrls.imagen_apertura || "";
    newRowData[columnMap['Nota Importante'] - 1] = data.notas || "";
    newRowData[columnMap['Cables de Alimentacion'] - 1] = data.cables_alimentacion || "";
    newRowData[columnMap['Imagen de los cables de alimentacion'] - 1] = imageUrls.imagen_alimentacion || "";
    newRowData[columnMap['Colaborador'] - 1] = data.colaborador;

    sheet.getRange(lastRow + 1, 1, 1, numColumns).setValues([newRowData]);
    sheet.getRange(lastRow + 1, columnMap['ID']).setFormula(`=IF(B${lastRow + 1}<>"", ROW()-1, "")`);
}

function getColumnMap() {
    return {
        'ID': 1, 'Categoria': 2, 'Imagen del vehiculo': 3, 'Marca': 4, 'Modelo': 5,
        'Tipo de encendido': 6, 'Año (generacion)': 7, 'Tipo de corte': 8,
        'Descripcion del corte': 9, 'Imagen del Corte': 10, 'Descripción del Segundo corte': 11,
        'Tipo de corte 2': 12, 'Imagen de corte 2': 13, 'Apertura': 14,
        'Imagen de la apertura': 15, 'Nota Importante': 16, 'Cables de Alimentacion': 17,
        'Imagen de los cables de alimentacion': 18, 'Como desarmar los plasticos': 19,
        'Colaborador': 20, 'Tipo de corte 3': 21, 'Descripción del corte 3': 22,
        'Imagen del corte 3': 23
    };
}
