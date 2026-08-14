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
    timestamp: 37, notaImportante: 38,
    cableAlimen2: 39, imgCableAlimen2: 40, cableAlimen3: 41, imgCableAlimen3: 42
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
            case 'getHeaders':
                const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
                response = { status: 'success', headers: cortesSheet.getRange(1, 1, 1, cortesSheet.getLastColumn()).getValues()[0] };
                break;
            case 'checkVehicle':
                response = handleCheckVehicle(request.payload);
                break;
            case 'getSuggestion': // Acción nueva para sugerencias
                response = handleGetSuggestion(request.payload);
                break;
            case 'checkOperation':
                response = handleCheckOperation(request.payload);
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

    let opId = payload.opId || null;
    let colaboradorName = colaborador;
    if (colaboradorName) {
        const opMatch = colaboradorName.match(/\[(OP-[a-zA-Z0-9_-]+)\]/);
        if (opMatch) {
            opId = opId || opMatch[1];
            colaboradorName = colaboradorName.replace(/\s*\[OP-[a-zA-Z0-9_-]+\]/, '').trim();
        }
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);

    if (opId) {
        const match = findRowByOpId(sheet, opId);
        if (match) {
            const rowIndex = match.rowIndex;
            const rowValues = match.rowValues;
            const rowObj = mapRowToObject(rowValues, COLS_CORTES);
            const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            const matchedColName = String(headers[match.colIndex - 1]).toLowerCase();

            let slotIndex = 1;
            if (matchedColName.includes("1") || match.colIndex === COLS_CORTES.colaboradorCorte1) slotIndex = 1;
            else if (matchedColName.includes("2") || match.colIndex === COLS_CORTES.colaboradorCorte2) slotIndex = 2;
            else if (matchedColName.includes("3") || match.colIndex === COLS_CORTES.colaboradorCorte3) slotIndex = 3;

            // 1. Check and repair vehicle image if it was registered but is invalid/corrupted/trashed
            if (vehicleData && vehicleData.imagenVehiculo) {
                const currentImg = rowObj.imagenVehiculo;
                if (!checkFileIdValid(currentImg)) {
                    const folder = getOrCreateFolder(rowObj.categoria, rowObj.marca, rowObj.modelo, rowObj.anoDesde);
                    const filename = `${sanitizeForFilename(rowObj.marca)}_${sanitizeForFilename(rowObj.modelo)}_${sanitizeForFilename(rowObj.tipoEncendido)}_${rowObj.anoDesde}_Vehiculo_repaired`;
                    const newUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder);
                    sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(newUrl);
                }
            }

            // 2. Check and repair cut image if it was registered but is invalid/corrupted/trashed
            if (cutData && cutData.imgCorte1 && cutData.tipoCorte1 !== 'No recomendado') {
                const currentCorteImg = rowObj[`imgCorte${slotIndex}`];
                if (!checkFileIdValid(currentCorteImg)) {
                    const folder = getOrCreateFolder(rowObj.categoria, rowObj.marca, rowObj.modelo, rowObj.anoDesde);
                    const filename = `${sanitizeForFilename(rowObj.marca)}_${sanitizeForFilename(rowObj.modelo)}_${sanitizeForFilename(rowObj.tipoEncendido)}_${rowObj.anoDesde}_Corte${slotIndex}_repaired`;
                    const newCorteImgUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder);
                    sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${slotIndex}`]).setValue(newCorteImgUrl);
                }
            }

            // 3. Complete missing/empty text fields in the sheet (partially completed registration)
            if (vehicleData) {
                if (!rowObj.categoria && vehicleData.categoria) {
                    sheet.getRange(rowIndex, COLS_CORTES.categoria).setValue(vehicleData.categoria);
                }
                if (!rowObj.marca && vehicleData.marca) {
                    sheet.getRange(rowIndex, COLS_CORTES.marca).setValue(vehicleData.marca);
                }
                if (!rowObj.modelo && vehicleData.modelo) {
                    sheet.getRange(rowIndex, COLS_CORTES.modelo).setValue(vehicleData.modelo);
                }
                if (!rowObj.versionesAplicables && vehicleData.versionesAplicables) {
                    sheet.getRange(rowIndex, COLS_CORTES.versionesAplicables).setValue(vehicleData.versionesAplicables);
                }
                if (!rowObj.anoDesde && vehicleData.anoDesde) {
                    const yearInput = String(vehicleData.anoDesde).trim();
                    let anoDesde = yearInput;
                    let anoHasta = yearInput;
                    if (yearInput.includes('-')) {
                        const [start, end] = yearInput.split('-').map(function(y) { return parseInt(y.trim(), 10); });
                        anoDesde = Math.min(start, end);
                        anoHasta = Math.max(start, end);
                    }
                    sheet.getRange(rowIndex, COLS_CORTES.anoDesde).setValue(anoDesde);
                    if (!rowObj.anoHasta) {
                        sheet.getRange(rowIndex, COLS_CORTES.anoHasta).setValue(anoHasta);
                    }
                }
                if (!rowObj.tipoEncendido && vehicleData.tipoEncendido) {
                    sheet.getRange(rowIndex, COLS_CORTES.tipoEncendido).setValue(vehicleData.tipoEncendido);
                }
            }

            if (cutData) {
                if (!rowObj[`tipoCorte${slotIndex}`] && cutData.tipoCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${slotIndex}`]).setValue(cutData.tipoCorte1 || "");
                }
                if (!rowObj[`ubicacionCorte${slotIndex}`] && cutData.ubicacionCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${slotIndex}`]).setValue(cutData.ubicacionCorte1 || "");
                }
                if (!rowObj[`colorCableCorte${slotIndex}`] && cutData.colorCableCorte1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${slotIndex}`]).setValue(cutData.colorCableCorte1 || "");
                }
                if (!rowObj[`configRelay${slotIndex}`] && cutData.configRelay1) {
                    sheet.getRange(rowIndex, COLS_CORTES[`configRelay${slotIndex}`]).setValue(cutData.configRelay1 || "");
                }
                if (!rowObj[`colaboradorCorte${slotIndex}`] && colaboradorName) {
                    sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${slotIndex}`]).setValue(colaboradorName || "");
                }
            }

            SpreadsheetApp.flush();
            return {
                status: 'success',
                message: 'La operación ya fue completada (recuperada, reparada y completada).',
                vehicleId: rowObj.id,
                timestamp: rowObj.timestamp
            };
        }
    }

    let targetDate = new Date();
    if (payload && payload.silent === true) {
        targetDate.setDate(targetDate.getDate() - 365); // Hace 365 días para evitar "Agregados recientemente"
    }
    const formattedDate = Utilities.formatDate(targetDate, "GMT-6", "dd/MM/yyyy");
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
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Corte${cutSlotIndex}`;
            imageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder);
        }

        sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${cutSlotIndex}`]).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${cutSlotIndex}`]).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${cutSlotIndex}`]).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`configRelay${cutSlotIndex}`]).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${cutSlotIndex}`]).setValue(imageUrl);
        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${cutSlotIndex}`]).setValue(colaboradorName);
        if (opId) {
            const opIdColIndex = getOpIdColIndex(sheet, cutSlotIndex);
            sheet.getRange(rowIndex, opIdColIndex).setValue(opId);
        }
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);

        newId = vehicleId;

    } else { // --- Lógica para vehículo NUEVO (CORREGIDO PARA PRESERVAR FÓRMULA DE ID) ---
        if (!vehicleData) throw new Error("Los datos del vehículo son requeridos para un nuevo registro.");

        var entities = getExistingEntities(sheet);
        vehicleData.marca = resolveAndNormalizeEntity(vehicleData.marca, entities.brands, false);
        vehicleData.modelo = resolveAndNormalizeEntity(vehicleData.modelo, entities.models, false);
        vehicleData.versionesAplicables = resolveAndNormalizeEntity(vehicleData.versionesAplicables, entities.versions, true);

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
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${yearInput}_Vehiculo`;
            vehiculoImageUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder);
        }
        let corteImageUrl = '';
        if (cutData.imgCorte1) {
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${anioParaFolder}_Corte1`;
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
        sheet.getRange(rowIndex, COLS_CORTES.colaboradorCorte1).setValue(colaboradorName);
        if (opId) {
            const opIdColIndex = getOpIdColIndex(sheet, 1);
            sheet.getRange(rowIndex, opIdColIndex).setValue(opId);
        }

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

        // Limpiar explícitamente cualquier celda residual de ID que no deba estar compartida
        sheet.getRange(rowIndex, COLS_CORTES.id).setValue("");
        sheet.getRange(rowIndex, COLS_CORTES.id).setFormula(sheet.getRange(lastRow, COLS_CORTES.id).getFormula() || `=ROW()-1`);
        SpreadsheetApp.flush();
        Utilities.sleep(500);
        newId = sheet.getRange(rowIndex, COLS_CORTES.id).getValue();
    }

    return { status: 'success', message: `Corte agregado exitosamente.`, vehicleId: newId, timestamp: formattedDate };
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

        // Búsqueda flexible (parcial) basada en claves de comparación normalizadas
        const compSheetMarca = toComparisonKey(sheetMarca, false);
        const compParamMarca = toComparisonKey(paramMarca, false);
        const marcaMatch = compSheetMarca.indexOf(compParamMarca) !== -1 || compParamMarca.indexOf(compSheetMarca) !== -1;

        const compSheetModelo = toComparisonKey(sheetModelo, false);
        const compParamModelo = toComparisonKey(paramModelo, false);
        const compSheetVersiones = toComparisonKey(sheetVersiones, true);
        const modeloMatch = compSheetModelo.indexOf(compParamModelo) !== -1 || compParamModelo.indexOf(compSheetModelo) !== -1 || compSheetVersiones.indexOf(compParamModelo) !== -1;

        // Búsqueda exacta para año y tipo de encendido
        const anioMatch = isYearInRange(paramAnio, sheetAnoDesde, sheetAnoHasta);
        const tipoEncendidoMatch = sheetTipoEncendido === paramTipoEncendido;

        return marcaMatch && modeloMatch && anioMatch && tipoEncendidoMatch;
    }).map(row => mapRowToObject(row, COLS_CORTES));

    return { status: 'success', matches: matches };
}

function handleAddSupplementaryInfo(payload) {
    const { vehicleId, apertura, imgApertura, cableAlimen, imgCableAlimen, cableAlimen2, imgCableAlimen2, cableAlimen3, imgCableAlimen3, notaImportante, timestamp } = payload;
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
    if (cableAlimen2) sheet.getRange(actualRow, COLS_CORTES.cableAlimen2).setValue(cableAlimen2);
    if (cableAlimen3) sheet.getRange(actualRow, COLS_CORTES.cableAlimen3).setValue(cableAlimen3);
    if (notaImportante) sheet.getRange(actualRow, COLS_CORTES.notaImportante).setValue(notaImportante);

    // Subir imágenes si se proporcionaron y no están ya correctamente subidas
    if (imgApertura) {
        const currentAperturaImg = rowValues[COLS_CORTES.imgApertura - 1];
        if (!checkFileIdValid(currentAperturaImg)) {
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Apertura`;
            const imageUrl = uploadImageToDrive(imgApertura, filename, folder);
            sheet.getRange(actualRow, COLS_CORTES.imgApertura).setValue(imageUrl);
        }
    }
    if (imgCableAlimen) {
        const currentAlimenImg = rowValues[COLS_CORTES.imgCableAlimen - 1];
        if (!checkFileIdValid(currentAlimenImg)) {
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Alimentacion`;
            const imageUrl = uploadImageToDrive(imgCableAlimen, filename, folder);
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen).setValue(imageUrl);
        }
    }
    if (imgCableAlimen2) {
        const currentAlimenImg2 = rowValues[COLS_CORTES.imgCableAlimen2 - 1];
        if (!checkFileIdValid(currentAlimenImg2)) {
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Alimentacion2`;
            const imageUrl = uploadImageToDrive(imgCableAlimen2, filename, folder);
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen2).setValue(imageUrl);
        }
    }
    if (imgCableAlimen3) {
        const currentAlimenImg3 = rowValues[COLS_CORTES.imgCableAlimen3 - 1];
        if (!checkFileIdValid(currentAlimenImg3)) {
            const filename = `${sanitizeForFilename(vehicleInfo.marca)}_${sanitizeForFilename(vehicleInfo.modelo)}_${sanitizeForFilename(vehicleInfo.tipoEncendido)}_${vehicleInfo.anoDesde}_Alimentacion3`;
            const imageUrl = uploadImageToDrive(imgCableAlimen3, filename, folder);
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen3).setValue(imageUrl);
        }
    }

    // Actualizar el timestamp al añadir información o usar el proporcionado si es registro silencioso (solo si está vacío)
    const currentTimestamp = rowValues[COLS_CORTES.timestamp - 1];
    if (!currentTimestamp) {
        const formattedDate = timestamp || Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy");
        sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);
    }

    return { status: 'success', message: 'Información suplementaria agregada exitosamente.' };
}

function handleGetSuggestion(payload) {
    const { term, field, brand } = payload;
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

    var uniqueValues = [];
    if (field.toLowerCase() === 'modelo' && brand) {
        var compBrand = toComparisonKey(brand, false);
        var rowsForBrand = data.filter(function(row) {
            var rowBrand = row[COLS_CORTES.marca - 1];
            return rowBrand && toComparisonKey(rowBrand, false) === compBrand;
        });

        uniqueValues = Array.from(new Set(rowsForBrand.map(function(row) { return row[columnIndex]; }).filter(Boolean)));

        if (uniqueValues.length === 0) {
            uniqueValues = Array.from(new Set(data.map(function(row) { return row[columnIndex]; }).filter(Boolean)));
        }
    } else {
        uniqueValues = Array.from(new Set(data.map(function(row) { return row[columnIndex]; }).filter(Boolean)));
    }

    const searchTerm = term.trim();
    const searchKey = toComparisonKey(searchTerm, false);

    // 1. Buscar coincidencia exacta por clave de comparación
    for (var i = 0; i < uniqueValues.length; i++) {
        var val = uniqueValues[i];
        if (toComparisonKey(val, false) === searchKey) {
            if (val !== searchTerm) {
                return { status: 'success', suggestion: val };
            } else {
                return { status: 'success', suggestion: null };
            }
        }
    }

    // 2. Buscar coincidencia aproximada usando Levenshtein
    let bestMatch = null;
    let minDistance = Infinity;
    const searchTermLower = searchTerm.toLowerCase();

    for (var i = 0; i < uniqueValues.length; i++) {
        var val = uniqueValues[i];
        var valLower = val.toLowerCase();
        if (valLower === searchTermLower) {
            return { status: 'success', suggestion: null };
        }

        const distance = levenshteinDistance(searchTermLower, valLower);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = val;
        }
    }

    var maxDistance = searchTerm.length <= 3 ? 1 : 3;
    if (minDistance <= maxDistance && bestMatch.toLowerCase().indexOf(searchTermLower) === -1) {
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
    let finalFilename = filename;

    if (imageData.startsWith('http')) {
        try {
            const response = UrlFetchApp.fetch(imageData);
            blob = response.getBlob();
            const mimeType = blob.getContentType();
            const extension = getExtensionFromMimeType(mimeType);
            finalFilename = filename + extension;
            blob.setName(finalFilename);
        } catch (e) {
            console.error(`Failed to fetch image from URL: ${imageData}. Error: ${e.message}`);
            return "";
        }
    } else if (imageData.startsWith('data:image/')) {
        try {
            const parts = imageData.split(',');
            const mimeType = parts[0].match(/:(.*?);/)[1];
            const decodedData = Utilities.base64Decode(parts[1]);

            // Determinar la extensión correcta basándose en el tipo MIME
            const extension = getExtensionFromMimeType(mimeType);
            finalFilename = filename + extension;

            blob = Utilities.newBlob(decodedData, mimeType, finalFilename);
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

/**
 * Mapea un tipo MIME a su extensión de archivo correspondiente.
 * @param {string} mimeType - El tipo MIME de la imagen.
 * @returns {string} - La extensión del archivo (incluyendo el punto).
 */
function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff'
    };
    return mimeMap[mimeType] || '.jpg'; // Fallback a .jpg si no se reconoce el tipo
}

function checkFileIdValid(url) {
    if (!url || typeof url !== 'string' || url.indexOf('drive.google.com') === -1) {
        return false;
    }
    const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return false;
    const id = match[1];
    try {
        const file = DriveApp.getFileById(id);
        if (file.isTrashed()) {
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

function getOpIdColIndex(sheet, slotIndex) {
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const expectedHeader = `idOperacion${slotIndex}`;

    for (let c = 0; c < headers.length; c++) {
        const header = String(headers[c]).trim();
        if (header === expectedHeader || header.toLowerCase() === `id_operacion_${slotIndex}` || header.toLowerCase() === `idoperacion${slotIndex}`) {
            return c + 1;
        }
    }

    // Not found, append dynamically
    const newColIndex = lastCol + 1;
    sheet.getRange(1, newColIndex).setValue(expectedHeader);
    SpreadsheetApp.flush();
    return newColIndex;
}

function findRowByOpId(sheet, opId) {
    if (!opId) return null;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null;

    const headers = data[0];
    const opIdCols = [];
    for (let c = 0; c < headers.length; c++) {
        const h = String(headers[c]).toLowerCase();
        if (h.includes("idoperacion") || h.includes("id_operacion")) {
            opIdCols.push(c);
        }
    }

    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        for (let i = 0; i < opIdCols.length; i++) {
            const idx = opIdCols[i];
            const cellVal = row[idx];
            if (cellVal && String(cellVal).trim() === opId.trim()) {
                return { rowIndex: r + 1, rowValues: row, colIndex: idx + 1 };
            }
        }
    }

    // Fallback for old tagged collaborator format
    const tag = `[${opId}]`;
    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && typeof cell === 'string' && (cell.indexOf(tag) !== -1 || cell === opId)) {
                return { rowIndex: r + 1, rowValues: row, colIndex: c + 1 };
            }
        }
    }
    return null;
}

function handleCheckOperation(payload) {
    const { opId } = payload;
    if (!opId) throw new Error("ID de operación requerido.");

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const match = findRowByOpId(sheet, opId);
    if (match) {
        const rowObj = mapRowToObject(match.rowValues, COLS_CORTES);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const matchedColName = String(headers[match.colIndex - 1]).toLowerCase();

        let slotIndex = 1;
        if (matchedColName.includes("1") || match.colIndex === COLS_CORTES.colaboradorCorte1) slotIndex = 1;
        else if (matchedColName.includes("2") || match.colIndex === COLS_CORTES.colaboradorCorte2) slotIndex = 2;
        else if (matchedColName.includes("3") || match.colIndex === COLS_CORTES.colaboradorCorte3) slotIndex = 3;

        const filesStatus = {
            imagenVehiculo: checkFileIdValid(rowObj.imagenVehiculo),
            imgCorte1: checkFileIdValid(rowObj[`imgCorte${slotIndex}`])
        };

        return {
            status: 'success',
            exists: true,
            vehicleId: rowObj.id,
            timestamp: rowObj.timestamp,
            slotIndex: slotIndex,
            filesStatus: filesStatus,
            rowData: rowObj
        };
    }
    return {
        status: 'success',
        exists: false
    };
}

// ============================================================================
// LÓGICA DE NORMALIZACIÓN Y EQUIVALENCIA
// ============================================================================

function toComparisonKey(str, isVersion) {
  if (!str) return "";
  var val = String(str).toLowerCase().trim();
  val = val.replace(/[\/\\.,_\-]/g, ' ');
  var words = val.split(/\s+/).filter(Boolean);
  if (isVersion) {
    words.sort();
  }
  return words.join(' ');
}

function normalizeForStorage(text) {
  if (!text) return "";
  var tokens = String(text).split(/([a-zA-Z0-9]+)/);
  var normalizedTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (/^[a-zA-Z0-9]+$/.test(token)) {
      if (token.length <= 3) {
        normalizedTokens.push(token.toUpperCase());
      } else {
        normalizedTokens.push(token.charAt(0).toUpperCase() + token.substring(1).toLowerCase());
      }
    } else {
      normalizedTokens.push(token);
    }
  }
  return normalizedTokens.join('');
}

function resolveAndNormalizeEntity(value, existingList, isVersion) {
  if (!value) return "";
  var valTrimmed = String(value).trim();
  var keyVal = toComparisonKey(valTrimmed, isVersion);

  for (var i = 0; i < existingList.length; i++) {
    var item = existingList[i];
    if (item) {
      var keyItem = toComparisonKey(item, isVersion);
      if (keyVal === keyItem) {
        return item;
      }
    }
  }

  return normalizeForStorage(valTrimmed);
}

function getExistingEntities(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { brands: [], models: [], versions: [] };
  }
  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var brands = [];
  var models = [];
  var versions = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brandVal = String(row[COLS_CORTES.marca - 1] || "").trim();
    var modelVal = String(row[COLS_CORTES.modelo - 1] || "").trim();
    var versionVal = String(row[COLS_CORTES.versionesAplicables - 1] || "").trim();

    if (brandVal && brands.indexOf(brandVal) === -1) brands.push(brandVal);
    if (modelVal && models.indexOf(modelVal) === -1) models.push(modelVal);
    if (versionVal && versions.indexOf(versionVal) === -1) versions.push(versionVal);
  }

  return { brands: brands, models: models, versions: versions };
}
