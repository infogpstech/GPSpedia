// =================================================================
// --- GLOBAL CONSTANTS ---
// =================================================================
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';

const SHEET_NAMES = {
  CORTES: "Cortes",
  USERS: "Users",
  FEEDBACKS: "Feedbacks",
  TUTORIALES: "Tutorial",
  RELAY: "Configuración del Relay"
};

const CACHE_EXPIRATION = 300; // 5 minutes

// =================================================================
// --- UTILITY & HELPER FUNCTIONS ---
// =================================================================

function jsonResponse(data, statusCode = 200) {
  if (statusCode !== 200) Logger.log(`Responding with error (${statusCode}): ${JSON.stringify(data)}`);
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function handleError(error, functionName = 'Unknown') {
  Logger.log(`ERROR in ${functionName}: ${error.message}\nStack: ${error.stack}`);
  return jsonResponse({ status: 'error', message: `Server error in ${functionName}.`, details: error.message }, 500);
}

function getSheetDataAsObjects(sheetName) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
    const [header, ...rows] = sheet.getDataRange().getValues();
    const camelCaseHeaders = header.map(h =>
        h.toString().trim().replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase())
    );
    return rows.map(row => camelCaseHeaders.reduce((obj, key, index) => {
        obj[key] = row[index];
        return obj;
    }, {}));
}


// =================================================================
// --- MAIN ROUTERS (doGet / doPost) ---
// =================================================================

function doGet(e) {
  // Kept for simple service status check, but not used by the app.
  return jsonResponse({ status: 'success', message: 'GPSpedia backend is running.' });
}

function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
    if (!request.action) throw new Error("Action not specified.");
    Logger.log(`Received action: ${request.action}`);

    switch (request.action) {
      case 'login':
        return handleLogin(request.payload);
      case 'getCatalogData':
        return handleGetCatalogData();
      case 'recordLike':
        return handleRecordLike(request.payload);
      case 'addCorte':
        return handleAddCorte(request.payload);
      // Future actions can be added here
      default:
        throw new Error(`Invalid action: ${request.action}`);
    }
  } catch (error) {
    return handleError(error, `doPost router (action: ${request ? request.action : 'unknown'})`);
  }
}

// =================================================================
// --- ACTION HANDLERS ---
// =================================================================

function handleLogin(payload) {
    const { username, password } = payload;
    if (!username || !password) return jsonResponse({ status: 'error', message: 'Username and password required.' }, 400);

    const users = getSheetDataAsObjects(SHEET_NAMES.USERS);
    const user = users.find(u => u.nombreUsuario === username);

    if (user && user.password === password) {
        const { password, ...userSafeData } = user;
        return jsonResponse({ status: 'success', user: userSafeData });
    } else {
        return jsonResponse({ status: 'error', message: 'Invalid credentials.' }, 401);
    }
}

function handleGetCatalogData() {
    const cache = CacheService.getScriptCache();
    const CACHE_KEY = 'catalogData';
    const cached = cache.get(CACHE_KEY);
    if (cached) {
        Logger.log("Returning cached catalog data.");
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    const responseData = {
      status: 'success',
      data: {
        cortes: getSheetDataAsObjects(SHEET_NAMES.CORTES),
        tutoriales: getSheetDataAsObjects(SHEET_NAMES.TUTORIALES),
        relay: getSheetDataAsObjects(SHEET_NAMES.RELAY)
      }
    };

    const responseJson = JSON.stringify(responseData);
    cache.put(CACHE_KEY, responseJson, CACHE_EXPIRATION);
    return ContentService.createTextOutput(responseJson).setMimeType(ContentService.MimeType.JSON);
}

function handleRecordLike(payload) {
    const { vehicleId, userName } = payload;
    if (!vehicleId || !userName) return jsonResponse({ status: 'error', message: 'Vehicle ID and User Name required.' }, 400);

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.CORTES);
    const [header, ...rows] = sheet.getDataRange().getValues();
    const idColIndex = header.indexOf("ID");
    const utilColIndex = header.indexOf("Util");
    if (idColIndex === -1 || utilColIndex === -1) throw new Error("'ID' or 'Util' column not found.");

    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === vehicleId.toString());
    if (rowIndex === -1) return jsonResponse({ status: 'error', message: 'Vehicle not found.' }, 404);

    const sheetRowIndex = rowIndex + 2;
    const utilCell = sheet.getRange(sheetRowIndex, utilColIndex + 1);
    const likers = utilCell.getValue().toString().trim();
    const likersArray = likers ? likers.split(',').map(name => name.trim()) : [];

    if (likersArray.includes(userName)) {
        return jsonResponse({ status: 'success', message: 'Already liked.', likeCount: likersArray.length });
    }

    likersArray.push(userName);
    utilCell.setValue(likersArray.join(', '));
    return jsonResponse({ status: 'success', message: 'Like recorded.', likeCount: likersArray.length });
}

function handleAddCorte(payload) {
    const { vehicleInfo = {}, additionalInfo = {}, files = {} } = payload;
    const { rowIndex, categoria, marca, modelo, anio, tipoEncendido, colaborador } = vehicleInfo;
    if (!marca || !modelo || !anio || !categoria || !tipoEncendido) throw new Error("Incomplete vehicle information.");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.CORTES);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const fileUrls = handleFileUploads(files, vehicleInfo);

    let targetRow;
    if (!rowIndex || rowIndex === -1) {
        const lastRow = sheet.getLastRow();
        sheet.insertRowAfter(lastRow);
        targetRow = lastRow + 1;
        sheet.getRange(lastRow, 1, 1, sheet.getMaxColumns()).copyTo(sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()));
        sheet.getRange(targetRow, 1, 1, sheet.getMaxColumns()).clearContent();

        const newRowData = { Categoria: categoria, Marca: marca, Modelo: modelo, 'Año (generacion)': anio, 'Tipo de encendido': tipoEncendido };
        if (fileUrls.imagenVehiculo) newRowData['Imagen del vehiculo'] = fileUrls.imagenVehiculo;

        headers.forEach((header, index) => {
            if (newRowData[header]) sheet.getRange(targetRow, index + 1).setValue(newRowData[header]);
        });
    } else {
        targetRow = parseInt(rowIndex, 10);
    }

    updateRowData(sheet, headers, targetRow, additionalInfo, fileUrls, colaborador);

    // Invalidate cache after adding/updating data
    CacheService.getScriptCache().remove('catalogData');

    return jsonResponse({ success: true, message: "Registro guardado exitosamente.", row: targetRow });
}


// =================================================================
// --- ADD CORTE HELPERS (Adapted from original logic) ---
// =================================================================

function handleFileUploads(files, vehicleData) {
    let fileUrls = {};
    if (Object.keys(files).length === 0) return fileUrls;

    const { categoria, marca, modelo, anio } = vehicleData;
    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const targetFolder = getOrCreateFolder(parentFolder, [categoria, marca, modelo, anio]);

    for (const fieldName in files) {
        const file = files[fieldName];
        if (file && file.data) {
            const fileName = `${marca}_${modelo}_${anio}_${fieldName}`;
            fileUrls[fieldName] = uploadFileToDrive(targetFolder, file, fileName);
        }
    }
    return fileUrls;
}

function updateRowData(sheet, headers, targetRow, additionalInfo, fileUrls, colaborador) {
    const rowValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
    const { nuevoCorte, apertura, alimentacion, notas } = additionalInfo;

    const colMap = headers.reduce((acc, header, i) => { acc[header] = i; return acc; }, {});

    if (nuevoCorte && nuevoCorte.tipo) {
        const cutSlots = [
            { type: 'Tipo de corte', desc: 'Descripcion del corte', img: 'Imagen del Corte' },
            { type: 'Tipo de corte 2', desc: 'Descripción del Segundo corte', img: 'Imagen de corte 2' },
            { type: 'Tipo de corte 3', desc: 'Descripción del corte 3', img: 'Imagen del corte 3' }
        ];
        for (const slot of cutSlots) {
            if (!rowValues[colMap[slot.desc]]) {
                sheet.getRange(targetRow, colMap[slot.type] + 1).setValue(nuevoCorte.tipo);
                sheet.getRange(targetRow, colMap[slot.desc] + 1).setValue(nuevoCorte.descripcion);
                if (fileUrls.imagenCorte) sheet.getRange(targetRow, colMap[slot.img] + 1).setValue(fileUrls.imagenCorte);
                break;
            }
        }
    }

    if (apertura && !rowValues[colMap['Apertura']]) {
        sheet.getRange(targetRow, colMap['Apertura'] + 1).setValue(apertura);
        if (fileUrls.imagenApertura) sheet.getRange(targetRow, colMap['Imagen de la apertura'] + 1).setValue(fileUrls.imagenApertura);
    }
    if (alimentacion && !rowValues[colMap['Cables de Alimentacion']]) {
        sheet.getRange(targetRow, colMap['Cables de Alimentacion'] + 1).setValue(alimentacion);
        if (fileUrls.imagenAlimentacion) sheet.getRange(targetRow, colMap['Imagen de los cables de alimentacion'] + 1).setValue(fileUrls.imagenAlimentacion);
    }
    if (notas && !rowValues[colMap['Nota Importante']]) {
        sheet.getRange(targetRow, colMap['Nota Importante'] + 1).setValue(notas);
    }

    const colabCell = sheet.getRange(targetRow, colMap['Colaborador'] + 1);
    const existingColab = colabCell.getValue().toString();
    if (existingColab && !existingColab.includes(colaborador)) {
        colabCell.setValue(`${existingColab}<br>${colaborador}`);
    } else if (!existingColab) {
        colabCell.setValue(colaborador);
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
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
}
