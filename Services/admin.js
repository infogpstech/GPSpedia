// ============================================================================
// GPSPEDIA-ADMIN SERVICE (DESACOPLADO Y EXCLUSIVO PARA DESARROLLADOR/ADMIN)
// ============================================================================
// COMPONENT VERSION: 2.6.0

// Variables globales para el diagnóstico y seguimiento de errores y estado
var currentStage = "Inicialización";
var currentLote = 0;
var currentFila = 0;
var currentRecurso = "Ninguno";

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
    CORTES: "Cortes",
    LOGOS_MARCA: "LogosMarca",
    TUTORIALES: "Tutorial",
    RELAY: "Relay",
    ADMIN_STATE: "AdminState"
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
// PERSISTENCIA DEL ESTADO ADMINISTRATIVO (AdminState Sheet)
// ============================================================================

function getAdminState(action) {
  try {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.ADMIN_STATE);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === action) {
        return {
          action: data[i][0],
          lastIndex: parseInt(data[i][1]) || 0,
          total: parseInt(data[i][2]) || 0,
          percentage: parseFloat(data[i][3]) || 0,
          date: data[i][4],
          processId: data[i][5],
          lote: parseInt(data[i][6]) || 0,
          filaInicial: parseInt(data[i][7]) || 0,
          ultimaFilaProcesada: parseInt(data[i][8]) || 0,
          estado: data[i][9] || "pendiente"
        };
      }
    }
  } catch (e) {
    Logger.log("Error getting admin state: " + e.message);
  }
  return null;
}

function saveAdminState(action, lastIndex, total, percentage, processId, lote, filaInicial, ultimaFilaProcesada, estado) {
  try {
    let sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.ADMIN_STATE);
    if (!sheet) {
      sheet = getSpreadsheet().insertSheet(SHEET_NAMES.ADMIN_STATE);
      sheet.appendRow(["Action", "LastIndex", "Total", "Percentage", "Date", "ProcessId", "Lote", "FilaInicial", "UltimaFilaProcesada", "Estado"]);
    }
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === action) {
        rowIndex = i + 1;
        break;
      }
    }
    const dateStr = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2).setValue(lastIndex);
      sheet.getRange(rowIndex, 3).setValue(total);
      sheet.getRange(rowIndex, 4).setValue(percentage);
      sheet.getRange(rowIndex, 5).setValue(dateStr);
      sheet.getRange(rowIndex, 6).setValue(processId);
      sheet.getRange(rowIndex, 7).setValue(lote);
      sheet.getRange(rowIndex, 8).setValue(filaInicial);
      sheet.getRange(rowIndex, 9).setValue(ultimaFilaProcesada);
      sheet.getRange(rowIndex, 10).setValue(estado);
    } else {
      sheet.appendRow([action, lastIndex, total, percentage, dateStr, processId, lote, filaInicial, ultimaFilaProcesada, estado]);
    }
    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log("Error saving admin state: " + e.message);
  }
}

function clearAdminState(action) {
  try {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.ADMIN_STATE);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === action) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        break;
      }
    }
  } catch (e) {
    Logger.log("Error clearing admin state: " + e.message);
  }
}

// ============================================================================
// ROUTER PRINCIPAL (doPost)
// ============================================================================
function doPost(e) {
    let response;
    const logs = [];

    function logMessage(stage, message, current = 0, total = 0, isWarning = false, isError = false) {
        const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
        logs.push({
            timestamp,
            stage,
            message,
            current,
            total,
            percentage: total > 0 ? Math.round((current / total) * 100) : 0,
            isWarning,
            isError
        });
    }

    const startTime = new Date();

    try {
        const request = JSON.parse(e.postData.contents);
        const { action, payload } = request;

        logMessage("Inicio", `Iniciando acción administrativa: ${action}`);

        switch (action) {
            case 'ping':
                response = { status: 'success', message: 'pong' };
                break;
            case 'backupDatabase':
                response = handleBackupDatabase(payload, logMessage);
                break;
            case 'backupDrive':
                response = handleBackupDrive(payload, logMessage);
                break;
            case 'restoreDatabase':
                response = handleRestoreDatabase(payload, logMessage);
                break;
            case 'restoreDrive':
                response = handleRestoreDrive(payload, logMessage);
                break;
            case 'reorganizeDatabase':
                response = handleReorganizeDatabase(payload, logMessage);
                break;
            case 'normalizeImages':
                response = handleNormalizeImages(payload, logMessage);
                break;
            case 'reorganizeImagesInDrive':
                response = handleReorganizeImagesInDrive(payload, logMessage);
                break;
            case 'restoreAllTrashedImages':
                validateAndRestoreAllTrashedImagesInSpreadsheet(logMessage);
                response = { status: 'success', message: 'Saneamiento exhaustivo de papelera completado exitosamente.' };
                break;
            case 'addLogo':
                response = handleAddLogo(payload, logMessage);
                break;
            case 'updateVehicleField':
                response = handleUpdateVehicleField(payload, logMessage);
                break;
            case 'uploadAdminImage':
                response = handleUploadAdminImage(payload, logMessage);
                break;
            case 'checkOperation':
                response = handleCheckOperation(payload);
                break;
            case 'addOrUpdateCut':
                response = handleAddOrUpdateCut(payload, logMessage);
                break;
            case 'addSupplementaryInfo':
                response = handleAddSupplementaryInfo(payload, logMessage);
                break;
            default:
                throw new Error(`La acción administrativa '${action}' es desconocida o no está soportada.`);
        }

        const endTime = new Date();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        logMessage("Finalización", `Tarea completada con éxito. Duración total: ${durationSec}s`);

        response.logs = logs;
        response.duration = durationSec;

    } catch (error) {
        logMessage("Falla Crítica", `Error: ${error.message}`, 0, 0, false, true);

        // Calcular tiempo acumulado
        const errorEndTime = new Date();
        const durationSec = ((errorEndTime - startTime) / 1000).toFixed(2);

        response = {
            status: 'error',
            estado: 'error',
            etapa: currentStage,
            lote: currentLote,
            fila: currentFila,
            recurso: currentRecurso,
            mensaje: `Falla en el microservicio administrativo: ${error.message}`,
            excepcion: error.stack || error.toString(),
            tiempoTranscurrido: `${durationSec}s`,
            logs: logs,
            details: { errorMessage: error.message, stack: error.stack }
        };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// HANDLERS ADMINISTRATIVOS
// ============================================================================

/**
 * 1. Respaldo automático de la base de datos (Spreadsheet completo)
 */
function handleBackupDatabase(payload, logMessage) {
    logMessage("Respaldo", "Generando respaldo completo de la hoja de cálculo de la base de datos...");

    const ss = getSpreadsheet();
    const folder = DriveApp.getRootFolder(); // Crear carpeta raíz o usar DriveApp para respaldos
    const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss");
    const backupName = `GPSpedia_DB_BACKUP_${timestamp}`;

    logMessage("Respaldo", `Copiando archivo Spreadsheet '${ss.getName()}' con el nombre '${backupName}'...`);
    const backupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);

    logMessage("Respaldo", `Respaldo de base de datos generado con éxito. ID: ${backupFile.getId()}`);
    return {
        status: 'success',
        backupId: backupFile.getId(),
        backupUrl: backupFile.getUrl(),
        timestamp: timestamp,
        message: "Copia íntegra de la base de datos generada correctamente."
    };
}

/**
 * 2. Respaldo de Drive (Estructura de carpetas y archivos de imágenes)
 */
function handleBackupDrive(payload, logMessage) {
    logMessage("Respaldo Drive", "Iniciando respaldo completo de la estructura de carpetas de Drive...");

    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const parentFolder = DriveApp.getRootFolder();
    const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss");
    const backupFolderName = `GPSpedia_Drive_BACKUP_${timestamp}`;

    logMessage("Respaldo Drive", `Creando carpeta contenedora de respaldo '${backupFolderName}' en la raíz...`);
    const backupFolder = parentFolder.createFolder(backupFolderName);

    logMessage("Respaldo Drive", "Copiando de forma jerárquica las carpetas y archivos de imágenes...");
    copyFolderRecursively(rootFolder, backupFolder, logMessage);

    logMessage("Respaldo Drive", `Respaldo de Drive completado. ID de carpeta: ${backupFolder.getId()}`);
    return {
        status: 'success',
        backupId: backupFolder.getId(),
        backupUrl: backupFolder.getUrl(),
        timestamp: timestamp,
        message: "Copia íntegra de los archivos e imágenes de Drive generada correctamente."
    };
}

function copyFolderRecursively(source, target, logMessage) {
    // Copiar archivos del nivel actual
    const files = source.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        file.makeCopy(file.getName(), target);
    }

    // Copiar subcarpetas
    const subFolders = source.getFolders();
    while (subFolders.hasNext()) {
        const subFolder = subFolders.next();
        const targetSubFolder = target.createFolder(subFolder.getName());
        copyFolderRecursively(subFolder, targetSubFolder, logMessage);
    }
}

function attemptRestoreImage(fileId, expectedBaseName, brandFolder, logMessage) {
    if (!fileId || typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]{25,110}$/.test(fileId)) {
        return null;
    }

    try {
        const file = DriveApp.getFileById(fileId);
        if (file.isTrashed()) {
            file.setTrashed(false);
            if (logMessage) logMessage("Restauración", `Archivo '${file.getName()}' restaurado desde la papelera.`);
        }
        return file;
    } catch (err) {
        if (logMessage) logMessage("Restauración", `ID '${fileId}' inalcanzable. Buscando equivalente '${expectedBaseName}' de forma indexada...`, 0, 0, true);

        // Buscar un duplicado usando búsqueda indexada nativa de Drive (súper veloz, evita timeouts)
        if (brandFolder && expectedBaseName) {
            try {
                const query = "title contains '" + expectedBaseName + "' and trashed = false";
                const files = brandFolder.searchFiles(query);
                if (files.hasNext()) {
                    const found = files.next();
                    if (logMessage) logMessage("Restauración", `Archivo equivalente encontrado indexado: '${found.getName()}' (ID: ${found.getId()}).`);
                    return found;
                }
            } catch (searchErr) {
                if (logMessage) logMessage("Restauración", `Error en búsqueda indexada: ${searchErr.message}`, 0, 0, true);
            }
        }
    }
    return null;
}

/**
 * Restaurar la base de datos completa a partir de un ID de copia
 */
function handleRestoreDatabase(payload, logMessage) {
    const { backupId } = payload;
    if (!backupId) throw new Error("ID de respaldo no proporcionado.");

    logMessage("Restauración DB", `Iniciando restauración de base de datos a partir de ID: ${backupId}`);

    const backupFile = DriveApp.getFileById(backupId);
    const targetFile = DriveApp.getFileById(SPREADSHEET_ID);

    // Abrir respaldo y destino
    const backupSS = SpreadsheetApp.openById(backupId);
    const targetSS = SpreadsheetApp.openById(SPREADSHEET_ID);

    logMessage("Restauración DB", "Limpiando hojas del Spreadsheet actual...");
    const sheets = targetSS.getSheets();
    const tempSheet = targetSS.insertSheet("TEMP_RESTORE_HOLDER");

    for (let i = 0; i < sheets.length; i++) {
        targetSS.deleteSheet(sheets[i]);
    }

    logMessage("Restauración DB", "Copiando hojas del respaldo...");
    const backupSheets = backupSS.getSheets();
    for (let i = 0; i < backupSheets.length; i++) {
        const sheet = backupSheets[i];
        sheet.copyTo(targetSS).setName(sheet.getName());
    }

    // Eliminar la hoja temporal
    targetSS.deleteSheet(tempSheet);
    SpreadsheetApp.flush();

    logMessage("Restauración DB", "Restauración de base de datos finalizada.");
    return {
        status: 'success',
        message: "La base de datos se restauró íntegramente de forma satisfactoria."
    };
}

/**
 * Restaurar carpeta de Drive a partir de un ID de respaldo
 */
function handleRestoreDrive(payload, logMessage) {
    const { backupId } = payload;
    if (!backupId) throw new Error("ID de respaldo de Drive no proporcionado.");

    logMessage("Restauración Drive", `Iniciando restauración de archivos de Drive a partir del ID de respaldo: ${backupId}`);

    const backupFolder = DriveApp.getFolderById(backupId);
    const targetFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    logMessage("Restauración Drive", "Limpiando archivos de la carpeta de destino actual de forma segura...");
    clearFolderContents(targetFolder);

    logMessage("Restauración Drive", "Copiando elementos de respaldo al destino...");
    copyFolderRecursively(backupFolder, targetFolder, logMessage);

    logMessage("Restauración Drive", "Restauración de Drive completada.");
    return {
        status: 'success',
        message: "Los archivos e imágenes se restauraron de forma exitosa en el Drive."
    };
}

function clearFolderContents(folder) {
    const files = folder.getFiles();
    while (files.hasNext()) {
        folder.removeFile(files.next());
    }
    const folders = folder.getFolders();
    while (folders.hasNext()) {
        folder.removeFolder(folders.next());
    }
}

/**
 * 3. Organización automática de la base de datos (por Marca)
 */
function handleReorganizeDatabase(payload, logMessage) {
    logMessage("Reorganización DB", "Ejecutando copia de seguridad preventiva antes de reorganizar...");
    const backupInfo = handleBackupDatabase(payload, logMessage);

    logMessage("Reorganización DB", "Iniciando reordenamiento alfabético por marca en la hoja Cortes...");
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const lastRow = sheet.getLastRow();

    if (lastRow > 2) {
        // Obtenemos los datos desde la fila 2 en adelante
        const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());

        logMessage("Reorganización DB", `Ordenando ${lastRow - 1} filas por columna Marca (Columna 3)...`);
        range.sort({ column: COLS_CORTES.marca, ascending: true });

        SpreadsheetApp.flush();
    }

    logMessage("Reorganización DB", "La base de datos fue organizada alfabéticamente por fabricante.");
    return {
        status: 'success',
        backupId: backupInfo.backupId,
        message: "Los vehículos fueron agrupados por marca de manera segura conservando la integridad de sus registros."
    };
}

/**
 * 4. Normalización automática de nombres de imágenes (Nomenclatura uniforme e imágenes compartidas)
 */
function handleNormalizeImages(payload, logMessage) {
    currentStage = "Normalización de Imágenes";
    const { limit = 10, reset = false } = payload || {};

    let startIndex = 0;
    let lote = 1;
    let filaInicial = 2;
    let processId = payload?.processId || ("P-" + Date.now());

    if (reset) {
        clearAdminState('normalizeImages');
    } else {
        const savedState = getAdminState('normalizeImages');
        if (savedState) {
            startIndex = savedState.lastIndex;
            lote = (savedState.lote || 0) + 1;
            filaInicial = savedState.ultimaFilaProcesada + 1;
        }
    }

    currentLote = lote;

    // --- OPTIMIZACIÓN DE RENDIMIENTO: VALIDACIÓN DE PAPELERA DESACOPLADA ---
    // Se ha eliminado el escaneo exhaustivo inicial para evitar el timeout de 6 minutos de Google Apps Script.
    // La recuperación de archivos en la papelera de Drive se realiza de manera segura "al vuelo"
    // dentro del bucle de procesamiento principal para los archivos correspondientes a este lote.

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Quitar cabecera

    const totalVehicles = data.length;

    // Comprobar si realmente existen registros pendientes
    if (startIndex >= totalVehicles) {
        logMessage("Normalización Imágenes", `No hay registros pendientes para procesar. Normalización finalizada.`);
        clearAdminState('normalizeImages');
        return {
            status: 'success',
            processedCount: 0,
            totalVehicles: totalVehicles,
            imagesRenamed: 0,
            nextIndex: startIndex,
            lote: lote,
            filaInicial: filaInicial,
            ultimaFilaProcesada: filaInicial - 1,
            estado: "completado"
        };
    }

    logMessage("Normalización Imágenes", `Iniciando normalización de Lote ${lote}: filas del ${filaInicial} al ${filaInicial + limit - 1}...`);
    let imagesRenamed = 0;

    const imgFields = ['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen'];

    // Mapeo para detectar imágenes compartidas
    const imageToRowMap = {};
    data.forEach((row, index) => {
        const rowNum = index + 2;
        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            const imgUrl = row[colIndex];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    if (!imageToRowMap[id]) imageToRowMap[id] = [];
                    imageToRowMap[id].push({ rowNum, field, colIndex });
                }
            }
        });
    });

    // Procesar solo las filas dentro del lote especificado
    const batchData = data.slice(startIndex, startIndex + limit);

    batchData.forEach((row, index) => {
        const rowNum = startIndex + index + 2;

        // Obtener datos reales para la nomenclatura
        const rawModelo = (row[COLS_CORTES.modelo - 1] || "").toString().trim();
        const rawVersion = (row[COLS_CORTES.versionesAplicables - 1] || "").toString().trim();
        const rawEncendido = (row[COLS_CORTES.tipoEncendido - 1] || "").toString().trim();
        const rawAnio = (row[COLS_CORTES.anoDesde - 1] || "").toString().trim();

        const versionPart = rawVersion ? rawVersion : rawEncendido;

        // Sanitización para nomenclatura uniforme
        const modelo = sanitizeForNomenclature(rawModelo);
        const version = sanitizeForNomenclature(versionPart);
        const anio = sanitizeForNomenclature(rawAnio || "XXXX");

        const baseName = `${modelo}_${version}_${anio}`.toLowerCase();

        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            let imgUrl = row[colIndex];

            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    const usages = imageToRowMap[id];
                    try {
                        const file = DriveApp.getFileById(id);

                        // --- INTEGRACIÓN: VALIDACIÓN Y RECUPERACIÓN DE LA PAPELERA EN EL BUCLE ---
                        if (file.isTrashed()) {
                            logMessage("Normalización Imágenes", `Fila ${rowNum}: Imagen '${file.getName()}' de la papelera restaurada correctamente.`);
                            file.setTrashed(false);
                        }

                        let fileToProcess = file;

                        // Determinar el tipoFuncion de nomenclatura según el campo
                        let typeFuncion = "";
                        if (field === "imagenVehiculo") typeFuncion = "";
                        else if (field === "imgCorte1") typeFuncion = "_corte1";
                        else if (field === "imgCorte2") typeFuncion = "_corte2";
                        else if (field === "imgCorte3") typeFuncion = "_corte3";
                        else if (field === "imgApertura") typeFuncion = "_apert";
                        else if (field === "imgCableAlimen") typeFuncion = "_alimen";

                        const extension = getExtensionFromName(fileToProcess.getName());
                        const newFilename = `${baseName}${typeFuncion}${extension}`;

                        // --- OPTIMIZACIÓN: EVITAR RENOMBRADO SI YA ESTÁ CORRECTO Y UBICADO EN LA GENERACIÓN ---
                        const parents = fileToProcess.getParents();
                        let inCorrectFolder = false;
                        const rawDesde = (row[COLS_CORTES.anoDesde - 1] || "").toString().trim();
                        const rawHasta = (row[COLS_CORTES.anoHasta - 1] || "").toString().trim();
                        const expectedGenName = (rawDesde && rawHasta && rawDesde !== rawHasta) ? `${rawDesde}_${rawHasta}` : (rawDesde || 'Sin_Ano');

                        while (parents.hasNext()) {
                            if (parents.next().getName() === expectedGenName) {
                                inCorrectFolder = true;
                                break;
                            }
                        }

                        if (fileToProcess.getName() === newFilename && inCorrectFolder) {
                            logMessage("Normalización Imágenes", `Fila ${rowNum}: Imagen '${newFilename}' ya está correctamente nombrada y ubicada.`);
                            return;
                        }

                        // Si se comparte entre más de un registro, crear copia física propia para este vehículo
                        if (usages && usages.length > 1) {
                            const usageIndexForThisRow = usages.findIndex(u => u.rowNum === rowNum && u.field === field);
                            if (usageIndexForThisRow > 0) { // Solo duplicar a partir del segundo uso
                                logMessage("Normalización Imágenes", `Fila ${rowNum}: Imagen compartida para el campo ${field}. Duplicando archivo en Drive...`);
                                const currentFolders = file.getParents();
                                const parentFolder = currentFolders.hasNext() ? currentFolders.next() : DriveApp.getRootFolder();
                                fileToProcess = file.makeCopy(file.getName(), parentFolder);
                                imgUrl = `https://drive.google.com/uc?export=view&id=${fileToProcess.getId()}`;
                                sheet.getRange(rowNum, colIndex + 1).setValue(imgUrl);
                                imagesRenamed++;
                            }
                        }

                        if (fileToProcess.getName() !== newFilename) {
                            logMessage("Normalización Imágenes", `Fila ${rowNum}: Renombrando '${fileToProcess.getName()}' a '${newFilename}'`);
                            fileToProcess.setName(newFilename);
                            imagesRenamed++;
                        }
                    } catch (e) {
                        logMessage("Normalización Imágenes", `Advertencia: Falla con imagen ID '${id}' (Fila ${rowNum}, Campo ${field}). Causa: ${e.message}`, 0, 0, true);
                    }
                }
            }
        });
    });

    SpreadsheetApp.flush();

    const nextIndex = startIndex + batchData.length;
    const ultimaFilaProcesada = startIndex + batchData.length + 1;
    const percentage = totalVehicles > 0 ? Math.round((nextIndex / totalVehicles) * 100) : 100;
    const estado = nextIndex >= totalVehicles ? "completado" : "pendiente";

    if (nextIndex >= totalVehicles) {
        clearAdminState('normalizeImages');
    } else {
        saveAdminState('normalizeImages', nextIndex, totalVehicles, percentage, processId, lote, filaInicial, ultimaFilaProcesada, estado);
    }

    logMessage("Normalización Imágenes", `Lote ${lote} finalizado. Filas del ${filaInicial} al ${ultimaFilaProcesada} procesadas. Archivos modificados: ${imagesRenamed}`);

    return {
        status: 'success',
        processedCount: batchData.length,
        totalVehicles: totalVehicles,
        imagesRenamed: imagesRenamed,
        nextIndex: nextIndex,
        lote: lote,
        filaInicial: filaInicial,
        ultimaFilaProcesada: ultimaFilaProcesada,
        estado: estado
    };
}

function getExtensionFromName(filename) {
    const dotIndex = filename.lastIndexOf(".");
    return dotIndex !== -1 ? filename.substring(dotIndex) : ".jpg";
}

function sanitizeForNomenclature(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .toLowerCase()
        .replace(/[\/,]/g, '_') // Reemplazar barras y comas con guión bajo
        .replace(/[^a-z0-9_.-]/g, '_') // Limpiar cualquier carácter extraño
        .replace(/__+/g, '_') // Eliminar guiones bajos múltiples
        .replace(/^_+|_+$/g, ''); // Limpiar extremos
}

/**
 * 5. Reorganización automática de imágenes en carpetas de Drive según la estructura jerárquica oficial
 */
function handleReorganizeImagesInDrive(payload, logMessage) {
    currentStage = "Reorganización de Imágenes en Drive";
    const { limit = 10, reset = false } = payload || {};

    // Inicializar contadores de rendimiento para este lote
    foldersCheckedCount = 0;
    foldersCreatedCount = 0;
    foldersRenamedCount = 0;
    foldersDeletedCount = 0;

    let startIndex = 0;
    let lote = 1;
    let filaInicial = 2;
    let processId = payload?.processId || ("P-" + Date.now());

    if (reset) {
        clearAdminState('reorganizeImagesInDrive');
    } else {
        const savedState = getAdminState('reorganizeImagesInDrive');
        if (savedState) {
            startIndex = savedState.lastIndex;
            lote = (savedState.lote || 0) + 1;
            filaInicial = savedState.ultimaFilaProcesada + 1;
        }
    }

    currentLote = lote;

    // --- OPTIMIZACIÓN DE RENDIMIENTO: VALIDACIÓN DE PAPELERA DESACOPLADA ---
    // Se ha eliminado el escaneo exhaustivo inicial para evitar el timeout de 6 minutos de Google Apps Script.
    // La recuperación de archivos en la papelera de Drive se realiza de manera segura "al vuelo"
    // dentro del bucle de procesamiento principal para los archivos correspondientes a este lote.

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    data.shift(); // Quitar cabecera

    const totalVehicles = data.length;

    // Comprobar si realmente existen registros pendientes
    if (startIndex >= totalVehicles) {
        logMessage("Reorganización Drive", `No hay registros pendientes para procesar. Reorganización finalizada.`);
        clearAdminState('reorganizeImagesInDrive');
        return {
            status: 'success',
            processedCount: 0,
            totalVehicles: totalVehicles,
            movedFiles: 0,
            foldersChecked: 0,
            foldersCreated: 0,
            foldersRenamed: 0,
            foldersDeleted: 0,
            nextIndex: startIndex,
            lote: lote,
            filaInicial: filaInicial,
            ultimaFilaProcesada: filaInicial - 1,
            estado: "completado"
        };
    }

    logMessage("Reorganización Drive", `Iniciando reorganización de Lote ${lote}: filas del ${filaInicial} al ${filaInicial + limit - 1}...`);
    let movedFiles = 0;

    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const imgFields = ['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen'];

    const batchData = data.slice(startIndex, startIndex + limit);

    batchData.forEach((row, index) => {
        const rowNum = startIndex + index + 2;

        // --- HIGIENE CRÍTICA: EVITAR POPULAR CARPETAS VACÍAS EN DRIVE ---
        // Verificar si la fila realmente tiene al menos una imagen antes de crear cualquier estructura de carpetas
        let hasValidImages = false;
        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            const imgUrl = row[colIndex];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    hasValidImages = true;
                }
            }
        });

        if (!hasValidImages) {
            logMessage("Reorganización Drive", `Fila ${rowNum}: No tiene imágenes asociadas. Omitiendo creación de carpetas.`);
            return;
        }

        // Datos reales para las carpetas
        const categoria = sanitizeForFolderDisplay(row[COLS_CORTES.categoria - 1] || 'Sin_Categoria');
        const marca = sanitizeForFolderDisplay(row[COLS_CORTES.marca - 1] || 'Sin_Marca');
        const modelo = sanitizeForFolderDisplay(row[COLS_CORTES.modelo - 1] || 'Sin_Modelo');

        // Versión de equipamiento / Tipo de encendido unificado
        const rawVersion = (row[COLS_CORTES.versionesAplicables - 1] || "").toString().trim();
        const rawEncendido = (row[COLS_CORTES.tipoEncendido - 1] || "").toString().trim();
        const folderVersionName = rawVersion ? `${rawVersion} / ${rawEncendido}` : rawEncendido;
        const versionEncendido = sanitizeForFolderDisplay(folderVersionName);

        const rawDesde = (row[COLS_CORTES.anoDesde - 1] || "").toString().trim();
        const rawHasta = (row[COLS_CORTES.anoHasta - 1] || "").toString().trim();
        const folderGeneracion = (rawDesde && rawHasta && rawDesde !== rawHasta) ? `${rawDesde}_${rawHasta}` : (rawDesde || 'Sin_Ano');
        const generacion = sanitizeForFolderDisplay(folderGeneracion);

        // Construir jerarquía de carpetas real
        const catFolder = getOrCreateSubFolder(rootFolder, categoria);
        const marFolder = getOrCreateSubFolder(catFolder, marca);
        const modFolder = getOrCreateSubFolder(marFolder, modelo);
        const verFolder = getOrCreateSubFolder(modFolder, versionEncendido);
        const genFolder = getOrCreateSubFolder(verFolder, generacion);

        const nameModelo = sanitizeForNomenclature(modelo);
        const nameVersion = sanitizeForNomenclature(rawVersion ? rawVersion : rawEncendido);
        const nameAnio = sanitizeForNomenclature(rawDesde || "XXXX");

        const baseName = `${nameModelo}_${nameVersion}_${nameAnio}`.toLowerCase();

        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            const imgUrl = row[colIndex];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];

                    // Actualizar variables de diagnóstico para el seguimiento en caliente de errores
                    currentFila = rowNum;
                    currentRecurso = `Imagen ID: ${id} (${field})`;

                    try {
                        let typeFuncion = "";
                        if (field === "imagenVehiculo") typeFuncion = "";
                        else if (field === "imgCorte1") typeFuncion = "_corte1";
                        else if (field === "imgCorte2") typeFuncion = "_corte2";
                        else if (field === "imgCorte3") typeFuncion = "_corte3";
                        else if (field === "imgApertura") typeFuncion = "_apert";
                        else if (field === "imgCableAlimen") typeFuncion = "_alimen";

                        const expectedBaseName = `${baseName}${typeFuncion}`;

                        // Intentar obtener y restaurar/recuperar la imagen
                        const file = attemptRestoreImage(id, expectedBaseName, marFolder, logMessage);
                        if (!file) {
                            throw new Error(`Archivo no existe físicamente en Drive ni se pudo recuperar.`);
                        }

                        // Si el archivo recuperado es diferente (ej. un duplicado o respaldo de otra ubicación),
                        // actualizar la URL en la hoja de cálculo
                        const newUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
                        if (id !== file.getId()) {
                            sheet.getRange(rowNum, colIndex + 1).setValue(newUrl);
                            logMessage("Reorganización Drive", `Fila ${rowNum}: Imagen restaurada con equivalente ID '${file.getId()}'. URL actualizada en Spreadsheet.`);
                        }

                        const currentParents = file.getParents();
                        let alreadyInPlace = false;

                        while (currentParents.hasNext()) {
                            const parent = currentParents.next();
                            if (parent.getId() === genFolder.getId() && parent.getName() === generacion) {
                                alreadyInPlace = true;
                                break;
                            }
                        }

                        // --- OPTIMIZACIÓN: EVITAR MOVER IMÁGENES QUE YA ESTÁN CORRECTAMENTE UBICADAS ---
                        if (alreadyInPlace) {
                            logMessage("Reorganización Drive", `Fila ${rowNum}: Imagen '${file.getName()}' ya está en su ubicación jerárquica correcta.`);
                        } else {
                            logMessage("Reorganización Drive", `Fila ${rowNum}: Moviendo '${file.getName()}' a carpeta jerárquica...`);

                            // --- RESOLUCIÓN DE COPIAS BUGGY: USAR MOVETO EN LUGAR DE ADDFILE/REMOVEFILE ---
                            // moveTo() es el estándar oficial de Google que previene la duplicación de padres
                            file.moveTo(genFolder);
                            movedFiles++;
                        }
                    } catch (e) {
                        logMessage("Reorganización Drive", `Advertencia: Falla con archivo ID '${id}' (Fila ${rowNum}, Campo ${field}). Causa: ${e.message}`, 0, 0, true);
                    }
                }
            }
        });
    });

    const nextIndex = startIndex + batchData.length;
    const ultimaFilaProcesada = startIndex + batchData.length + 1;
    const percentage = totalVehicles > 0 ? Math.round((nextIndex / totalVehicles) * 100) : 100;
    const estado = nextIndex >= totalVehicles ? "completado" : "pendiente";

    // Limpieza recursiva de carpetas vacías y eliminación inteligente de duplicados.
    // OPTIMIZACIÓN CRÍTICA: Se omite de forma sincrónica durante el flujo normal por lotes para evitar timeouts del Apps Script.
    // En su lugar, finaliza limpiamente, guarda el estado completado y responde de inmediato para evitar bloqueos.
    if (nextIndex >= totalVehicles) {
        logMessage("Reorganización Drive", "Lote final alcanzado con éxito. Procesamiento de organización completado.");
        clearAdminState('reorganizeImagesInDrive');
    } else {
        saveAdminState('reorganizeImagesInDrive', nextIndex, totalVehicles, percentage, processId, lote, filaInicial, ultimaFilaProcesada, estado);
    }

    logMessage("Reorganización Drive", `Lote ${lote} finalizado. Filas del ${filaInicial} al ${ultimaFilaProcesada} procesadas. Archivos movidos: ${movedFiles}. Carpetas creadas: ${foldersCreatedCount}, renombradas: ${foldersRenamedCount}, eliminadas: ${foldersDeletedCount}`);
    return {
        status: 'success',
        processedCount: batchData.length,
        totalVehicles: totalVehicles,
        movedFiles: movedFiles,
        foldersChecked: foldersCheckedCount,
        foldersCreated: foldersCreatedCount,
        foldersRenamed: foldersRenamedCount,
        foldersDeleted: foldersDeletedCount,
        nextIndex: nextIndex,
        lote: lote,
        filaInicial: filaInicial,
        ultimaFilaProcesada: ultimaFilaProcesada,
        estado: estado
    };
}

// Contadores de rendimiento para el lote actual
let foldersCheckedCount = 0;
let foldersCreatedCount = 0;
let foldersRenamedCount = 0;
let foldersDeletedCount = 0;

function getCanonicalName(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // remove all non-alphanumeric chars
        .trim();
}

let folderCacheMap = {};

function getOrCreateSubFolder(parentFolder, desiredName) {
    const parentId = parentFolder.getId();
    const canonicalDesired = getCanonicalName(desiredName);
    const cacheKey = `${parentId}_${canonicalDesired}`;

    if (folderCacheMap[cacheKey]) {
        return folderCacheMap[cacheKey];
    }

    try {
        foldersCheckedCount++;
        const subFolders = parentFolder.getFolders();
        let matchedFolder = null;
        let foldersToMerge = [];

        while (subFolders.hasNext()) {
            const folder = subFolders.next();
            const canonicalCurrent = getCanonicalName(folder.getName());
            if (canonicalCurrent === canonicalDesired) {
                foldersToMerge.push(folder);
            }
        }

        if (foldersToMerge.length > 0) {
            // Priorizar la carpeta que tenga el mejor formato visual (frecuencia de underscores más baja)
            foldersToMerge.sort((a, b) => {
                const nameA = a.getName();
                const nameB = b.getName();
                const underscoresA = (nameA.match(/_/g) || []).length;
                const underscoresB = (nameB.match(/_/g) || []).length;
                if (underscoresA !== underscoresB) {
                    return underscoresA - underscoresB; // Menos underscores primero
                }
                const humanA = (nameA.match(/[\s()]/g) || []).length;
                const humanB = (nameB.match(/[\s()]/g) || []).length;
                return humanB - humanA; // Más espacios y paréntesis primero
            });

            matchedFolder = foldersToMerge[0];

            // Renombrar la carpeta seleccionada si desiredName está mejor formateado
            const matchedName = matchedFolder.getName();
            const desiredUnderscores = (desiredName.match(/_/g) || []).length;
            const matchedUnderscores = (matchedName.match(/_/g) || []).length;
            if (desiredUnderscores < matchedUnderscores) {
                try {
                    matchedFolder.setName(desiredName);
                    foldersRenamedCount++;
                } catch(e) {
                    Logger.log("Error renaming folder: " + e.message);
                }
            }

            // Fusionar subcarpetas y archivos de los duplicados restantes
            for (let i = 1; i < foldersToMerge.length; i++) {
                const extraFolder = foldersToMerge[i];
                try {
                    mergeFolders(extraFolder, matchedFolder);
                } catch(e) {
                    Logger.log("Error merging folders: " + e.message);
                }
            }
        } else {
            try {
                matchedFolder = parentFolder.createFolder(desiredName);
                foldersCreatedCount++;
            } catch(e) {
                Logger.log("Error creating subfolder " + desiredName + ": " + e.message);
                return parentFolder;
            }
        }

        if (matchedFolder) {
            folderCacheMap[cacheKey] = matchedFolder;
        }
        return matchedFolder;
    } catch (e) {
        Logger.log("Critical error in getOrCreateSubFolder: " + e.message);
        return parentFolder;
    }
}

function mergeFolders(sourceFolder, targetFolder) {
    try {
        if (sourceFolder.getId() === targetFolder.getId()) return;

        // Mover archivos
        const files = sourceFolder.getFiles();
        while (files.hasNext()) {
            try {
                const file = files.next();
                file.moveTo(targetFolder);
            } catch(e) {
                Logger.log("Error moving file in mergeFolders: " + e.message);
            }
        }

        // Fusionar subcarpetas de manera recursiva
        const subFolders = sourceFolder.getFolders();
        while (subFolders.hasNext()) {
            try {
                const sub = subFolders.next();
                const subName = sub.getName();
                const targetSub = getOrCreateSubFolder(targetFolder, subName);
                mergeFolders(sub, targetSub);
            } catch(e) {
                Logger.log("Error merging subfolders in mergeFolders: " + e.message);
            }
        }

        // Eliminar carpeta origen duplicada ya vacía
        try {
            sourceFolder.setTrashed(true);
            foldersDeletedCount++;
        } catch (e) {
            Logger.log("Error trashing merged folder: " + e.message);
        }
    } catch (e) {
        Logger.log("Error in mergeFolders: " + e.message);
    }
}

function cleanUpDuplicatesInBrandTree(brandFolder, activeUrls, logMessage) {
    if (!brandFolder) return;

    if (logMessage) logMessage("Depuración", `Iniciando escaneo indexado de duplicados para la marca: '${brandFolder.getName()}'`);

    // 1. Obtener todos los archivos del árbol de la marca mediante una única búsqueda indexada (ultra-rápido)
    const filesList = [];
    try {
        const query = "trashed = false";
        const filesIter = brandFolder.searchFiles(query);
        while (filesIter.hasNext()) {
            const file = filesIter.next();
            filesList.push({
                file: file,
                id: file.getId(),
                name: file.getName(),
                size: file.getSize(),
                mimeType: file.getMimeType(),
                created: file.getDateCreated().getTime()
            });
        }
    } catch (e) {
        if (logMessage) logMessage("Depuración", `Error en búsqueda indexada de archivos de marca: ${e.message}`, 0, 0, true);
        return;
    }

    if (logMessage) logMessage("Depuración", `Total archivos indexados en la marca: ${filesList.length}`);

    // Separar archivos activos (referenciados en Spreadsheet) y archivos candidatos a eliminación
    const activeFiles = [];
    const candidateFiles = [];

    filesList.forEach(item => {
        if (activeUrls.has(item.id)) {
            activeFiles.push(item);
        } else {
            candidateFiles.push(item);
        }
    });

    const activeIds = new Set(activeFiles.map(i => i.id));
    const activeNames = new Set(activeFiles.map(i => i.name));

    // Mapa para Caso 3 & Caso 4 (búsqueda rápida por metadatos / tamaño)
    const activeMetadataMap = {};
    activeFiles.forEach(item => {
        const key = `${item.size}_${item.mimeType}`;
        activeMetadataMap[key] = item;
    });

    const candidateMetadataMap = {};

    candidateFiles.forEach(item => {
        const id = item.id;
        const name = item.name;

        // Caso 1: Duplicados por sufijo automático (ej: "hilux_srv_boton_2020(2).png" o "hilux_srv_boton_2020 (2).png")
        const cleanName = name.replace(/\s*\(\d+\)/g, '').replace(/\(\d+\)/g, '');
        if (cleanName !== name) {
            // Verificar si existe el archivo original sin el sufijo y está en Spreadsheet
            const originalInSpreadsheet = activeFiles.some(f => f.name === cleanName);
            if (originalInSpreadsheet) {
                try {
                    item.file.setTrashed(true);
                    if (logMessage) logMessage("Depuración", `Caso 1: Eliminado duplicado con sufijo automático '${name}' (no referenciado).`);
                    return; // Ya procesado, no continuar con otros casos
                } catch (e) {
                    Logger.log("Error trashing file Caso 1: " + e.message);
                }
            }
        }

        // Caso 2: Duplicados con exactamente el mismo nombre pero en carpetas no utilizadas o duplicadas
        // Si existe otro archivo con exactamente el mismo nombre que está siendo referenciado en el Spreadsheet
        const hasReferencedSameName = activeNames.has(name);
        if (hasReferencedSameName) {
            try {
                item.file.setTrashed(true);
                if (logMessage) logMessage("Depuración", `Caso 2: Eliminado duplicado con idéntico nombre '${name}' en carpeta no utilizada.`);
                return; // Ya procesado
            } catch (e) {
                Logger.log("Error trashing file Caso 2: " + e.message);
            }
        }

        // Caso 3: Duplicados con el mismo nombre y mismos metadatos
        // Caso 4: Duplicados con nombres distintos pero compartiendo tamaño, mime-type, y metadatos idénticos
        const metaKey = `${item.size}_${item.mimeType}`;
        const activeEquivalent = activeMetadataMap[metaKey];
        if (activeEquivalent) {
            try {
                item.file.setTrashed(true);
                if (logMessage) logMessage("Depuración", `Caso 3/4: Eliminado archivo equivalente '${name}' por coincidencia de metadatos con el referenciado '${activeEquivalent.name}'.`);
                return; // Ya procesado
            } catch (e) {
                Logger.log("Error trashing file Caso 3/4: " + e.message);
            }
        }

        // Si hay duplicados entre los mismos archivos no referenciados, conservar el más antiguo
        if (candidateMetadataMap[metaKey]) {
            const existingCandidate = candidateMetadataMap[metaKey];
            if (item.created < existingCandidate.created) {
                // El actual es más antiguo, eliminar el existente y registrar el actual
                try {
                    existingCandidate.file.setTrashed(true);
                    if (logMessage) logMessage("Depuración", `Depuración: Eliminado duplicado no referenciado '${existingCandidate.name}' por duplicidad física.`);
                } catch (e) {}
                candidateMetadataMap[metaKey] = item;
            } else {
                // El existente es más antiguo, eliminar el actual
                try {
                    item.file.setTrashed(true);
                    if (logMessage) logMessage("Depuración", `Depuración: Eliminado duplicado no referenciado '${name}' por duplicidad física.`);
                } catch (e) {}
            }
        } else {
            candidateMetadataMap[metaKey] = item;
        }
    });
}

function validateAndRestoreAllTrashedImagesInSpreadsheet(logMessage) {
    logMessage("Validación de Papelera", "Iniciando escaneo preventivo de todas las URL de imágenes en todas las hojas de la base de datos...");

    const spreadsheet = getSpreadsheet();
    const sheets = spreadsheet.getSheets();
    let restoredCount = 0;
    let checkedUrls = 0;

    sheets.forEach(sheet => {
        const sheetName = sheet.getName();
        // Omitir hojas administrativas o de log internas
        if (sheetName === SHEET_NAMES.ADMIN_STATE || sheetName === SHEET_NAMES.LOGS || sheetName === "Logs" || sheetName === "Feedbacks" || sheetName === "Feedback") {
            return;
        }

        const data = sheet.getDataRange().getValues();
        for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
            const rowNum = rowIdx + 1;
            const cols = data[rowIdx];
            for (let colIdx = 0; colIdx < cols.length; colIdx++) {
                const value = cols[colIdx];
                if (value && typeof value === 'string' && value.indexOf('id=') !== -1) {
                    const idMatch = value.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idMatch) {
                        const id = idMatch[1];
                        checkedUrls++;
                        try {
                            const file = DriveApp.getFileById(id);
                            if (file.isTrashed()) {
                                logMessage("Validación de Papelera", `Higiene: El archivo '${file.getName()}' de la hoja '${sheetName}' (Fila ${rowNum}, Col ${colIdx + 1}) estaba en la papelera. Recuperándolo...`);
                                file.setTrashed(false);
                                restoredCount++;
                            }
                        } catch (e) {
                            // Ignorar si el ID no es accesible o no es un archivo de Drive real
                        }
                    }
                }
            }
        }
    });

    logMessage("Validación de Papelera", `Escaneo completo de la papelera finalizado. Enlaces verificados: ${checkedUrls}. Archivos restaurados: ${restoredCount}.`);
}

function deleteEmptyFoldersRecursively(folder, rootDriveFolderId) {
    const isRoot = (folder.getId() === rootDriveFolderId);
    let hasContents = false;

    const subDirs = folder.getFolders();
    while (subDirs.hasNext()) {
        const subDir = subDirs.next();
        const subDirIsEmpty = deleteEmptyFoldersRecursively(subDir, rootDriveFolderId);
        if (!subDirIsEmpty) {
            hasContents = true;
        }
    }

    const files = folder.getFiles();
    if (files.hasNext()) {
        hasContents = true;
    }

    if (!isRoot && !hasContents) {
        try {
            if (folder.getName() !== "Logos") {
                folder.setTrashed(true);
                return true; // indicamos que fue borrado / está vacío
            }
        } catch (e) {
            Logger.log("Error trashing empty folder: " + e.message);
        }
    }

    return false; // no está vacío o no se borró
}

/**
 * 8. Registro de nuevos logotipos de fabricante con soporte transparente
 */
function handleAddLogo(payload, logMessage) {
    const { nombreMarca, fileData, filename, mimeType } = payload;
    if (!nombreMarca || !fileData || !filename || !mimeType) {
        throw new Error("Datos de logotipo incompletos.");
    }

    logMessage("Registro Logo", `Iniciando registro de logotipo para la marca: ${nombreMarca}`);

    // Obtener la carpeta de logos (usualmente dentro de la carpeta raíz o una subcarpeta Logos)
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const logosFolder = getOrCreateSubFolder(rootFolder, "Logos");

    // Subir el archivo de logotipo manteniendo su extensión y transparencia originales
    logMessage("Registro Logo", `Subiendo logotipo '${filename}' de tipo '${mimeType}'...`);
    const decodedData = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);
    const file = logosFolder.createFile(blob);

    const logoUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
    logMessage("Registro Logo", `Logotipo subido exitosamente. URL: ${logoUrl}`);

    // Registrar en la hoja LogosMarca
    logMessage("Registro Logo", "Registrando información en la hoja de cálculo...");
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.LOGOS_MARCA);
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;

    // Copiar fila anterior para heredar validaciones y ID autoincremental si aplica
    if (lastRow > 1) {
        sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).copyTo(sheet.getRange(newRow, 1, 1, sheet.getLastColumn()));
        sheet.getRange(newRow, 2, 1, sheet.getLastColumn() - 1).clearContent();
    } else {
        // Fallback si la hoja está vacía
        sheet.getRange(newRow, 1).setFormula(`=ROW()-1`);
    }

    sheet.getRange(newRow, 2).setValue(nombreMarca);
    sheet.getRange(newRow, 3).setValue(logoUrl);
    sheet.getRange(newRow, 4).setValue(nombreMarca);

    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    const generatedId = sheet.getRange(newRow, 1).getValue();

    logMessage("Registro Logo", `Registro completado. ID de logotipo asignado: ${generatedId}`);
    return {
        status: 'success',
        logoId: generatedId,
        logoUrl: logoUrl,
        message: "Logotipo registrado exitosamente en la base de datos conservando su formato y transparencia."
    };
}

/**
 * Actualizar de manera silenciosa una celda en Google Sheets por ID de vehículo y columna/campo
 */
function handleUpdateVehicleField(payload, logMessage) {
    const { vehicleId, fieldName, value } = payload;
    if (!vehicleId || !fieldName) {
        throw new Error("Parámetros de edición de campo incompletos.");
    }

    const colIndex = COLS_CORTES[fieldName];
    if (!colIndex) {
        throw new Error(`El campo '${fieldName}' no existe en el esquema del catálogo.`);
    }

    logMessage("Edición In-Modal", `Actualizando campo '${fieldName}' para el vehículo ID: ${vehicleId}...`);
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() == vehicleId.toString());
    if (rowIndex === -1) {
        throw new Error(`No se encontró el vehículo con ID '${vehicleId}' en la base de datos.`);
    }

    const actualRow = rowIndex + 2;
    sheet.getRange(actualRow, colIndex).setValue(value !== undefined ? value : "");
    SpreadsheetApp.flush();

    logMessage("Edición In-Modal", `Campo '${fieldName}' actualizado silenciosamente con éxito.`);
    return {
        status: 'success',
        message: `El campo '${fieldName}' fue guardado silenciosamente en el registro de la fila ${actualRow}.`
    };
}

/**
 * Subir una imagen modificada a la subcarpeta del vehículo en Drive
 */
function handleUploadAdminImage(payload, logMessage) {
    const { vehicleId, fileData, filename, mimeType, fieldName } = payload;
    if (!vehicleId || !fileData || !filename || !mimeType || !fieldName) {
        throw new Error("Parámetros incompletos para subir la imagen.");
    }

    logMessage("Edición In-Modal", `Subiendo imagen para el campo '${fieldName}' del vehículo ID: ${vehicleId}...`);

    // Obtener los datos del vehículo para ubicar la subcarpeta jerárquica
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() == vehicleId.toString());
    if (rowIndex === -1) {
        throw new Error(`Vehículo ID '${vehicleId}' no encontrado.`);
    }
    const actualRow = rowIndex + 2;
    const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];

    const categoria = rowValues[COLS_CORTES.categoria - 1] || "Sin_Categoria";
    const marca = rowValues[COLS_CORTES.marca - 1] || "Sin_Marca";
    const modelo = rowValues[COLS_CORTES.modelo - 1] || "Sin_Modelo";
    const versionEncendido = (rowValues[COLS_CORTES.versionesAplicables - 1] || "SRV") + "_" + (rowValues[COLS_CORTES.tipoEncendido - 1] || "BTN");
    const generacion = rowValues[COLS_CORTES.anoDesde - 1] || "Sin_Ano";

    // 1. Intentar ubicar la carpeta original de la imagen que ya está guardada para el registro
    const originalUrl = rowValues[COLS_CORTES[fieldName] - 1];
    let genFolder = null;
    if (originalUrl && typeof originalUrl === "string" && originalUrl.startsWith("http")) {
        const match = originalUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
            try {
                const originalFile = DriveApp.getFileById(match[1]);
                const parents = originalFile.getParents();
                if (parents.hasNext()) {
                    genFolder = parents.next();
                    logMessage("Edición In-Modal", `Carpeta original encontrada: '${genFolder.getName()}'`);
                }
            } catch (err) {
                logMessage("Edición In-Modal", `No se pudo acceder al archivo original o su carpeta: ${err.message}`, 0, 0, true);
            }
        }
    }

    // 2. Si no se encontró la carpeta original, usar o crear la estructura jerárquica
    if (!genFolder) {
        const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const catFolder = getOrCreateSubFolder(rootFolder, sanitizeForFolderDisplay(categoria));
        const marFolder = getOrCreateSubFolder(catFolder, sanitizeForFolderDisplay(marca));
        const modFolder = getOrCreateSubFolder(marFolder, sanitizeForFolderDisplay(modelo));
        const verFolder = getOrCreateSubFolder(modFolder, sanitizeForFolderDisplay(versionEncendido));
        genFolder = getOrCreateSubFolder(verFolder, sanitizeForFolderDisplay(generacion));
        logMessage("Edición In-Modal", `Carpeta original no encontrada. Usando carpeta jerárquica: '${genFolder.getName()}'`);
    }

    // 3. Generar la nomenclatura uniforme oficial basada en los datos reales del registro
    const rawModelo = (rowValues[COLS_CORTES.modelo - 1] || "").toString().trim();
    const rawVersion = (rowValues[COLS_CORTES.versionesAplicables - 1] || "").toString().trim();
    const rawEncendido = (rowValues[COLS_CORTES.tipoEncendido - 1] || "").toString().trim();
    const rawAnio = (rowValues[COLS_CORTES.anoDesde - 1] || "").toString().trim();

    const nameModelo = sanitizeForNomenclature(rawModelo);
    const nameVersion = sanitizeForNomenclature(rawVersion);
    const nameEncendido = sanitizeForNomenclature(rawEncendido);
    const nameAnio = sanitizeForNomenclature(rawAnio || "XXXX");

    let baseNameParts = [nameModelo];
    if (nameVersion) baseNameParts.push(nameVersion);
    if (nameEncendido) baseNameParts.push(nameEncendido);
    baseNameParts.push(nameAnio);

    const baseName = baseNameParts.join("_").toLowerCase();

    let typeFuncion = "";
    if (fieldName === "imagenVehiculo") typeFuncion = "";
    else if (fieldName === "imgCorte1") typeFuncion = "_corte1";
    else if (fieldName === "imgCorte2") typeFuncion = "_corte2";
    else if (fieldName === "imgCorte3") typeFuncion = "_corte3";
    else if (fieldName === "imgApertura") typeFuncion = "_apert";
    else if (fieldName === "imgCableAlimen") typeFuncion = "_alimen";

    const extension = getExtensionFromName(filename);
    const newFilename = `${baseName}${typeFuncion}${extension}`;

    // 4. Limpiar datos Base64 de prefijos tipo Data URL
    let cleanBase64 = fileData;
    let actualMimeType = mimeType;
    if (fileData.indexOf(",") !== -1) {
        const parts = fileData.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) {
            actualMimeType = mimeMatch[1];
        }
        cleanBase64 = parts[1];
    }

    // Guardar archivo en Drive
    const decodedData = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedData, actualMimeType, newFilename);
    const file = genFolder.createFile(blob);
    const imageUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

    // Actualizar campo en Sheets de manera silenciosa
    const colIndex = COLS_CORTES[fieldName];
    sheet.getRange(actualRow, colIndex).setValue(imageUrl);
    SpreadsheetApp.flush();

    logMessage("Edición In-Modal", `Imagen subida y registrada en Sheets con éxito para el campo '${fieldName}'.`);
    return {
        status: 'success',
        imageUrl: imageUrl,
        message: `La imagen del campo '${fieldName}' se actualizó en Drive y Sheets.`
    };
}

// ============================================================================
// MICROSERVICIO REGISTRO DE CORTES (Silencioso y Administrativo)
// ============================================================================

function handleAddOrUpdateCut(payload, logMessage) {
    const lock = LockService.getScriptLock();
    try {
        // Intentar obtener el bloqueo por un máximo de 30 segundos
        lock.waitLock(30000);
    } catch (e) {
        throw new Error("No se pudo obtener el bloqueo de la hoja de cálculo. Por favor reintente en unos instantes.");
    }

    try {
        const { vehicleData, cutData, vehicleId, colaborador } = payload;
        if (!cutData || !colaborador) {
            throw new Error("Datos del corte y del colaborador son requeridos.");
        }

        logMessage("Registro Administrativo", `Procesando addOrUpdateCut administrativo...`);
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);

        let opId = null;
        if (colaborador) {
            const opMatch = colaborador.match(/\[(OP-[a-zA-Z0-9_-]+)\]/);
            if (opMatch) {
                opId = opMatch[1];
            }
        }

        if (opId) {
            const match = findRowByOpId(sheet, opId);
            if (match) {
                const rowIndex = match.rowIndex;
                const rowValues = match.rowValues;
                const rowObj = mapRowToObject(rowValues, COLS_CORTES);

                let slotIndex = 1;
                if (match.colIndex === COLS_CORTES.colaboradorCorte1) slotIndex = 1;
                else if (match.colIndex === COLS_CORTES.colaboradorCorte2) slotIndex = 2;
                else if (match.colIndex === COLS_CORTES.colaboradorCorte3) slotIndex = 3;

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

                SpreadsheetApp.flush();
                return {
                    status: 'success',
                    message: 'La operación ya fue completada (recuperada y reparada).',
                    vehicleId: rowObj.id,
                    timestamp: rowObj.timestamp
                };
            }
        }

        // Forzar timestamp administrativo (hace 365 días) para registro silencioso
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 365);
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
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${yearInput}_Vehiculo`;
            vehiculoImageUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder);
        }
        let corteImageUrl = '';
        if (cutData.imgCorte1) {
            const filename = `${sanitizeForFilename(vehicleData.marca)}_${sanitizeForFilename(vehicleData.modelo)}_${sanitizeForFilename(vehicleData.tipoEncendido)}_${anioParaFolder}_Corte1`;
            corteImageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder);
        }

        // 4. Escribir los nuevos datos en las celdas específicas usando múltiples `setValue` para claridad.
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

    logMessage("Registro Administrativo", `Corte administrativo guardado exitosamente. ID asignado: ${newId}`);
    return { status: 'success', message: `Corte administrativo agregado de forma silenciosa.`, vehicleId: newId, timestamp: formattedDate };
    } finally {
        lock.releaseLock();
    }
}

function handleAddSupplementaryInfo(payload, logMessage) {
    const { vehicleId, apertura, imgApertura, cableAlimen, imgCableAlimen, notaImportante, timestamp } = payload;
    if (!vehicleId) {
        throw new Error("El ID del vehículo es requerido para agregar información suplementaria.");
    }

    logMessage("Registro Administrativo", `Procesando addSupplementaryInfo administrativo para ID: ${vehicleId}...`);
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

    // Forzar timestamp administrativo (hace 365 días) o el recibido en la carga
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 365);
    const formattedDate = timestamp || Utilities.formatDate(targetDate, "GMT-6", "dd/MM/yyyy");
    sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);

    SpreadsheetApp.flush();
    logMessage("Registro Administrativo", `Información suplementaria administrativa agregada con éxito.`);
    return { status: 'success', message: 'Información suplementaria administrativa agregada de forma silenciosa.' };
}

// ============================================================================
// HELPERS COMUNES
// ============================================================================
function getActiveImageUrls() {
    const activeUrls = new Set();
    const ss = getSpreadsheet();
    const sheets = ss.getSheets();

    sheets.forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetName === SHEET_NAMES.ADMIN_STATE || sheetName === "Logs" || sheetName === "Feedbacks" || sheetName === "Feedback") {
            return;
        }
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return;

        // Determinar qué índices de columnas escanear para esta hoja
        let colIndices = null;
        if (sheetName === SHEET_NAMES.CORTES) {
            // Columnas: 9 (imagenVehiculo), 16 (imgCorte1), 23 (imgCorte2), 30 (imgCorte3), 34 (imgApertura), 36 (imgCableAlimen)
            // En base 0: 8, 15, 22, 29, 33, 35
            colIndices = [8, 15, 22, 29, 33, 35];
        } else if (sheetName === SHEET_NAMES.LOGOS_MARCA) {
            colIndices = [2]; // Columna 3 (urlLogo)
        } else if (sheetName === SHEET_NAMES.RELAY) {
            colIndices = [2]; // Columna 3 (imagen)
        }

        for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (colIndices) {
                for (let i = 0; i < colIndices.length; i++) {
                    const c = colIndices[i];
                    if (c < row.length) {
                        const cell = row[c];
                        if (cell && typeof cell === 'string' && cell.indexOf('drive.google.com') !== -1) {
                            const idMatch = cell.match(/id=([a-zA-Z0-9_-]+)/) || cell.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                            if (idMatch) {
                                activeUrls.add(idMatch[1]);
                            }
                        }
                    }
                }
            } else {
                // Para Tutorial u otras hojas pequeñas, escaneo normal rápido
                for (let c = 0; c < row.length; c++) {
                    const cell = row[c];
                    if (cell && typeof cell === 'string' && cell.indexOf('drive.google.com') !== -1) {
                        const idMatch = cell.match(/id=([a-zA-Z0-9_-]+)/) || cell.match(/file\/d\/([a-zA-Z0-9_-]+)/);
                        if (idMatch) {
                            activeUrls.add(idMatch[1]);
                        }
                    }
                }
            }
        }
    });
    return activeUrls;
}

function sanitizeForFilename(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_');
}

function sanitizeForFolderDisplay(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/\s+/g, ' ')      // normalizar multiples espacios
        .replace(/__+/g, '_')      // limpiar multiples underscores
        .trim();
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
    const cat = sanitizeForFolderDisplay(categoria || 'Sin_Categoria');
    const mar = sanitizeForFolderDisplay(marca || 'Sin_Marca');
    const mod = sanitizeForFolderDisplay(modelo || 'Sin_Modelo');
    const an = sanitizeForFolderDisplay(anio || 'Sin_Año');

    const categoriaFolder = getOrCreateSubFolder(rootFolder, cat);
    const marcaFolder = getOrCreateSubFolder(categoriaFolder, mar);
    const modeloFolder = getOrCreateSubFolder(marcaFolder, mod);
    return getOrCreateSubFolder(modeloFolder, an);
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
    return mimeMap[mimeType] || '.jpg';
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

function findRowByOpId(sheet, opId) {
    if (!opId) return null;
    const data = sheet.getDataRange().getValues();
    const tag = `[${opId}]`;
    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && typeof cell === 'string' && cell.indexOf(tag) !== -1) {
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

        let slotIndex = 1;
        if (match.colIndex === COLS_CORTES.colaboradorCorte1) slotIndex = 1;
        else if (match.colIndex === COLS_CORTES.colaboradorCorte2) slotIndex = 2;
        else if (match.colIndex === COLS_CORTES.colaboradorCorte3) slotIndex = 3;

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
