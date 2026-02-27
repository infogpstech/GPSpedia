// ============================================================================
// GPSPEDIA-WRITE SERVICE (STANDARDIZED FOR DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.1

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';
let spreadsheet = null;

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

const SHEET_NAMES = {
    CORTES: "Cortes"
};

const COLS_CORTES = {
    id: 1, categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, anoHasta: 7, tipoEncendido: 8,
    imagenVehiculo: 9, videoGuiaDesarmeUrl: 10, contadorBusqueda: 11, tipoCorte1: 12, ubicacionCorte1: 13,
    colorCableCorte1: 14, configRelay1: 15, imgCorte1: 16, utilCorte1: 17, colaboradorCorte1: 18,
    tipoCorte2: 19, ubicacionCorte2: 20, colorCableCorte2: 21, configRelay2: 22, imgCorte2: 23,
    utilCorte2: 24, colaboradorCorte2: 25, tipoCorte3: 26, ubicacionCorte3: 27, colorCableCorte3: 28,
    configRelay3: 29, imgCorte3: 30, utilCorte3: 31, colaboradorCorte3: 32,
    apertura: 33, imgApertura: 34, cableAlimen: 35, imgCableAlimen: 36,
    timestamp: 37, notaImportante: 38
};


// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Write',
            version: '2.3.1',
            spreadsheetId: SPREADSHEET_ID,
            driveFolderId: DRIVE_FOLDER_ID,
            sheetsAccessed: [SHEET_NAMES.CORTES]
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Write-SERVICE v2.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        switch (request.action) {
            case 'checkVehicle':
                response = handleCheckVehicle(request.payload);
                break;
            case 'getSuggestion': // Acción nueva para sugerencias
                response = handleGetSuggestion(request.payload);
                break;
            case 'addOrUpdateCut':
                response = handleAddOrUpdateCut(request.payload);
                break;
            case 'addSupplementaryInfo':
                response = handleAddSupplementaryInfo(request.payload);
                break;
            default:
                throw new Error(`La acción '${request.action}' es desconocida.`);
        }
    } catch (error) {
        Logger.log(`Error en Write-Service doPost: ${error.stack}`);
        response = { status: 'error', message: 'Ocurrió un error en el servicio.', details: { errorMessage: error.message } };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}


// ============================================================================
// HANDLERS DE ACCIONES
// ============================================================================

function handleAddOrUpdateCut(payload) {
    const { vehicleData, cutData, vehicleId, colaborador } = payload;
    if (!cutData || !colaborador) {
        throw new Error("Datos del corte y del colaborador son requeridos.");
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const formattedDate = Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy");
    let rowIndex;
    let newId;

    if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---
        const ids = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues().flat();
        const existingIndex = ids.findIndex(id => id.toString() == vehicleId.toString());
        if (existingIndex === -1) throw new Error("El ID del vehículo no fue encontrado.");
        rowIndex = existingIndex + 2;

        const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
        const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);

        let cutSlotIndex = -1;
        for (let i = 1; i <= 3; i++) {
            if (!rowValues[COLS_CORTES[`tipoCorte${i}`] - 1]) {
                cutSlotIndex = i;
                break;
            }
        }
        if (cutSlotIndex === -1) throw new Error("No hay espacios disponibles para más cortes.");

        let imageUrl = '';
        if (cutData.imgCorte1) {
            const folder = getOrCreateFolder(vehicleInfo.categoria, vehicleInfo.marca, vehicleInfo.modelo, vehicleInfo.anoDesde);
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Corte${cutSlotIndex}.jpg`;
            imageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder);
        }

        sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${cutSlotIndex}`]).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${cutSlotIndex}`]).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${cutSlotIndex}`]).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`configRelay${cutSlotIndex}`]).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${cutSlotIndex}`]).setValue(imageUrl);
        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${cutSlotIndex}`]).setValue(colaborador);
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);

        newId = vehicleId;

    } else { // --- Lógica para vehículo NUEVO (CORREGIDO PARA PRESERVAR FÓRMULA DE ID) ---
        if (!vehicleData) throw new Error("Los datos del vehículo son requeridos para un nuevo registro.");

        const lastRow = sheet.getLastRow();
        rowIndex = lastRow + 1;
        const lastColumn = sheet.getLastColumn();

        // 1. Copiar la fila anterior para heredar TODAS las validaciones, formatos y FÓRMULAS (incluyendo ID).
        const previousRowRange = sheet.getRange(lastRow, 1, 1, lastColumn);
        const newRowRange = sheet.getRange(rowIndex, 1, 1, lastColumn);
        previousRowRange.copyTo(newRowRange);

        // 2. Limpiar el contenido de las columnas de DATOS para eliminar datos viejos, preservando la fórmula del ID.
        const dataRange = sheet.getRange(rowIndex, 2, 1, lastColumn - 1);
        dataRange.clearContent();

        // 3. Preparar los datos que se van a escribir.
        // Parsear año...
        const yearInput = vehicleData.anoDesde.trim();
        let anoDesde, anoHasta, anioParaFolder;
        if (yearInput.includes('-')) {
            const [start, end] = yearInput.split('-').map(y => parseInt(y.trim(), 10));
            anoDesde = Math.min(start, end);
            anoHasta = Math.max(start, end);
        } else {
            anoDesde = parseInt(yearInput, 10);
            anoHasta = anoDesde;
        }
        anioParaFolder = anoDesde;

        // Subir imágenes y obtener URLs...
        const folder = getOrCreateFolder(vehicleData.categoria, vehicleData.marca, vehicleData.modelo, anioParaFolder);
        let vehiculoImageUrl = '';
        if (vehicleData.imagenVehiculo) {
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${yearInput}_Vehiculo.jpg`;
            vehiculoImageUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder);
        }
        let corteImageUrl = '';
        if (cutData.imgCorte1) {
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${anioParaFolder}_Corte1.jpg`;
            corteImageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder);
        }

        // 4. Escribir los nuevos datos en las celdas específicas usando múltiples `setValue` para claridad.
        // Esto es más legible que crear un array gigante y previene errores de índice.
        sheet.getRange(rowIndex, COLS_CORTES.categoria).setValue(vehicleData.categoria || '');
        sheet.getRange(rowIndex, COLS_CORTES.marca).setValue(vehicleData.marca);
        sheet.getRange(rowIndex, COLS_CORTES.modelo).setValue(vehicleData.modelo);
        sheet.getRange(rowIndex, COLS_CORTES.versionesAplicables).setValue(vehicleData.versionesAplicables || '');
        sheet.getRange(rowIndex, COLS_CORTES.anoDesde).setValue(anoDesde);
        sheet.getRange(rowIndex, COLS_CORTES.anoHasta).setValue(anoHasta);
        sheet.getRange(rowIndex, COLS_CORTES.tipoEncendido).setValue(vehicleData.tipoEncendido);
        sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(vehiculoImageUrl);
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);

        // Datos del primer corte
        sheet.getRange(rowIndex, COLS_CORTES.tipoCorte1).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.ubicacionCorte1).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.colorCableCorte1).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES.configRelay1).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES.imgCorte1).setValue(corteImageUrl);
        sheet.getRange(rowIndex, COLS_CORTES.colaboradorCorte1).setValue(colaborador);

        // 5. Esperar a que la hoja calcule el valor del ID generado por la fórmula.
        SpreadsheetApp.flush();
        Utilities.sleep(1500); // Espera para asegurar que la fórmula se calcule.
        newId = sheet.getRange(rowIndex, COLS_CORTES.id).getValue();

        // 6. Si el ID sigue vacío, intentar forzar la fórmula de la fila anterior o usar una genérica
        if (!newId) {
            const previousFormula = sheet.getRange(lastRow, COLS_CORTES.id).getFormula();
            if (previousFormula) {
                sheet.getRange(rowIndex, COLS_CORTES.id).setFormula(previousFormula);
            } else {
                // Fallback: Si no hay fórmula, usar una basada en la fila (común en este proyecto)
                sheet.getRange(rowIndex, COLS_CORTES.id).setFormula(`=ROW()-1`);
            }
            SpreadsheetApp.flush();
            Utilities.sleep(500);
            newId = sheet.getRange(rowIndex, COLS_CORTES.id).getValue();
        }
    }

    return { status: 'success', message: `Corte agregado exitosamente.`, vehicleId: newId };
}


function handleCheckVehicle(payload) {
    const { marca, modelo, anoDesde, tipoEncendido } = payload;
    if (!marca || !modelo || !anoDesde || !tipoEncendido) {
        throw new Error("Parámetros de búsqueda incompletos.");
    }
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    data.shift(); // Quitar encabezados

    const paramMarca = marca.trim().toLowerCase();
    const paramModelo = modelo.trim().toLowerCase();
    const paramAnio = parseInt(anoDesde.trim(), 10);
    const paramTipoEncendido = tipoEncendido.trim().toLowerCase();

    const matches = data.filter(row => {
        if (!row[0]) return false; // Omitir filas vacías

        const sheetMarca = (row[COLS_CORTES.marca - 1] || "").toString().trim().toLowerCase();
        const sheetModelo = (row[COLS_CORTES.modelo - 1] || "").toString().trim().toLowerCase();
        const sheetVersiones = (row[COLS_CORTES.versionesAplicables - 1] || "").toString().toLowerCase();
        const sheetTipoEncendido = (row[COLS_CORTES.tipoEncendido - 1] || "").toString().trim().toLowerCase();
        const sheetAnoDesde = row[COLS_CORTES.anoDesde - 1];
        const sheetAnoHasta = row[COLS_CORTES.anoHasta - 1];

        // Búsqueda flexible (parcial) para marca y modelo
        const marcaMatch = sheetMarca.includes(paramMarca) || paramMarca.includes(sheetMarca);
        const modeloMatch = sheetModelo.includes(paramModelo) || paramModelo.includes(sheetModelo) || sheetVersiones.includes(paramModelo);

        // Búsqueda exacta para año y tipo de encendido
        const anioMatch = isYearInRange(paramAnio, sheetAnoDesde, sheetAnoHasta);
        const tipoEncendidoMatch = sheetTipoEncendido === paramTipoEncendido;

        return marcaMatch && modeloMatch && anioMatch && tipoEncendidoMatch;
    }).map(row => mapRowToObject(row, COLS_CORTES));

    return { status: 'success', matches: matches };
}

function handleAddSupplementaryInfo(payload) {
    const { vehicleId, apertura, imgApertura, cableAlimen, imgCableAlimen, notaImportante } = payload;
    if (!vehicleId) {
        throw new Error("El ID del vehículo es requerido para agregar información suplementaria.");
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() == vehicleId.toString());

    if (rowIndex === -1) {
        throw new Error("El ID del vehículo proporcionado no fue encontrado para actualizar.");
    }
    const actualRow = rowIndex + 2;

    const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);

    const folder = getOrCreateFolder(vehicleInfo.categoria, vehicleInfo.marca, vehicleInfo.modelo, vehicleInfo.anoDesde);

    // Actualizar campos de texto si se proporcionaron
    if (apertura) sheet.getRange(actualRow, COLS_CORTES.apertura).setValue(apertura);
    if (cableAlimen) sheet.getRange(actualRow, COLS_CORTES.cableAlimen).setValue(cableAlimen);
    if (notaImportante) sheet.getRange(actualRow, COLS_CORTES.notaImportante).setValue(notaImportante);

    // Subir imágenes si se proporcionaron
    if (imgApertura) {
        const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Apertura.jpg`;
        const imageUrl = uploadImageToDrive(imgApertura, filename, folder);
        sheet.getRange(actualRow, COLS_CORTES.imgApertura).setValue(imageUrl);
    }
    if (imgCableAlimen) {
        const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Alimentacion.jpg`;
        const imageUrl = uploadImageToDrive(imgCableAlimen, filename, folder);
        sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen).setValue(imageUrl);
    }

    // Actualizar siempre el timestamp al añadir información
    const formattedDate = Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy");
    sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);

    return { status: 'success', message: 'Información suplementaria agregada exitosamente.' };
}

function handleGetSuggestion(payload) {
    const { term, field } = payload;
    if (!term || !field) {
        throw new Error("El término y el campo son requeridos para obtener una sugerencia.");
    }

    let columnIndex;
    if (field.toLowerCase() === 'marca') {
        columnIndex = COLS_CORTES.marca - 1;
    } else if (field.toLowerCase() === 'modelo') {
        columnIndex = COLS_CORTES.modelo - 1;
    } else {
        throw new Error(`El campo '${field}' no es válido para sugerencias.`);
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) return { status: 'success', suggestion: null };

    const data = sheet.getDataRange().getValues();
    data.shift();

    const uniqueValues = Array.from(new Set(data.map(row => row[columnIndex]).filter(String)));

    let bestMatch = null;
    let minDistance = Infinity;
    const searchTerm = term.toLowerCase();

    for (const value of uniqueValues) {
        const valueLower = value.toLowerCase();
        if (valueLower === searchTerm) {
            return { status: 'success', suggestion: null }; // Coincidencia exacta
        }

        const distance = levenshteinDistance(searchTerm, valueLower);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = value;
        }
    }

    // Umbral: solo sugerir si la distancia es <= 3 y no es un substring obvio
    if (minDistance <= 3 && bestMatch.toLowerCase().indexOf(searchTerm) === -1) {
        return { status: 'success', suggestion: bestMatch };
    }

    return { status: 'success', suggestion: null };
}


// ============================================================================
// HELPERS
// ============================================================================

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // deletion
                matrix[j - 1][i] + 1,      // insertion
                matrix[j - 1][i - 1] + cost // substitution
            );
        }
    }
    return matrix[b.length][a.length];
}
function sanitizeForFilename(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_');
}

function mapRowToObject(row, colMap) {
    const obj = {};
    for (const key in colMap) {
        const colIndex = colMap[key] - 1;
        obj[key] = (colIndex < row.length) ? row[colIndex] : "";
    }
    return obj;
}

function isYearInRange(inputYear, anoDesde, anoHasta) {
    if (isNaN(inputYear)) return false;
    const desde = anoDesde ? parseInt(anoDesde, 10) : inputYear;
    const hasta = anoHasta ? parseInt(anoHasta, 10) : desde;
    return inputYear >= desde && inputYear <= hasta;
}

function isFlexibleModelMatch(inputModelo, sheetModelo, sheetVersiones) {
    const inputWords = new Set(inputModelo.toLowerCase().split(' ').filter(Boolean));
    const sheetWords = new Set(`${sheetModelo.toLowerCase()} ${sheetVersiones.toLowerCase()}`.split(' ').filter(Boolean));
    for (const word of inputWords) {
        if (sheetWords.has(word)) return true;
    }
    return false;
}

function getOrCreateFolder(categoria, marca, modelo, anio) {
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const cat = sanitizeForFilename(categoria || 'Sin_Categoria');
    const mar = sanitizeForFilename(marca || 'Sin_Marca');
    const mod = sanitizeForFilename(modelo || 'Sin_Modelo');
    const an = sanitizeForFilename(anio || 'Sin_Año');

    const categoriaFolder = getOrCreateSubFolder(rootFolder, cat);
    const marcaFolder = getOrCreateSubFolder(categoriaFolder, mar);
    const modeloFolder = getOrCreateSubFolder(marcaFolder, mod);
    return getOrCreateSubFolder(modeloFolder, an);
}

function getOrCreateSubFolder(parentFolder, name) {
    const folders = parentFolder.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parentFolder.createFolder(name);
}

function uploadImageToDrive(imageData, filename, folder) {
    if (!imageData) return "";
    let blob;
    if (imageData.startsWith('http')) {
        try {
            blob = UrlFetchApp.fetch(imageData).getBlob().setName(filename);
        } catch (e) {
            console.error(`Failed to fetch image from URL: ${imageData}. Error: ${e.message}`);
            return "";
        }
    } else if (imageData.startsWith('data:image/')) {
        try {
            const parts = imageData.split(',');
            const mimeType = parts[0].match(/:(.*?);/)[1];
            const decodedData = Utilities.base64Decode(parts[1]);
            blob = Utilities.newBlob(decodedData, mimeType, filename);
        } catch (e) {
            console.error(`Failed to decode base64. Error: ${e.message}`);
            return "";
        }
    } else {
        console.error("Unrecognized image data format.");
        return "";
    }
    const file = folder.createFile(blob);
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
}
