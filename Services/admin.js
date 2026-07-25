// ============================================================================
// GPSPEDIA-ADMIN SERVICE (DESACOPLADO Y EXCLUSIVO PARA DESARROLLADOR/ADMIN)
// ============================================================================
// COMPONENT VERSION: 1.0.0

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
    RELAY: "Relay"
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
            case 'addLogo':
                response = handleAddLogo(payload, logMessage);
                break;
            case 'updateVehicleField':
                response = handleUpdateVehicleField(payload, logMessage);
                break;
            case 'uploadAdminImage':
                response = handleUploadAdminImage(payload, logMessage);
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
        response = {
            status: 'error',
            message: `Falla en el microservicio administrativo: ${error.message}`,
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
    logMessage("Normalización Imágenes", "Iniciando normalización de nomenclatura de imágenes...");
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();

    const totalVehicles = data.length;
    logMessage("Normalización Imágenes", `Se detectaron ${totalVehicles} registros de vehículos para analizar.`);

    let processedCount = 0;
    let imagesRenamed = 0;

    // Mapeo para detectar imágenes compartidas por múltiples vehículos
    const imageToRowMap = {};
    const imgFields = ['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen'];

    // Fase 1: Recopilar uso de imágenes para detectar duplicidades virtuales/compartidas
    data.forEach((row, index) => {
        const rowNum = index + 2;
        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            const imgUrl = row[colIndex];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    if (!imageToRowMap[id]) imageToRowMap[id] = [];
                    imageToRowMap[id].push({ rowNum, field, colIndex });
                }
            }
        });
    });

    // Fase 2: Procesar y duplicar si son compartidas, y renombrar de forma estandarizada
    data.forEach((row, index) => {
        const rowNum = index + 2;
        const marca = sanitizeForFilename(row[COLS_CORTES.marca - 1]);
        const modelo = sanitizeForFilename(row[COLS_CORTES.modelo - 1]);
        const version = sanitizeForFilename(row[COLS_CORTES.versionesAplicables - 1] || "base");
        const encendido = sanitizeForFilename(row[COLS_CORTES.tipoEncendido - 1]);
        const anio = sanitizeForFilename(row[COLS_CORTES.anoDesde - 1] || "XXXX");

        const baseName = `${modelo}_${version}_${encendido}_${anio}`.toLowerCase();

        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            let imgUrl = row[colIndex];

            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    const usages = imageToRowMap[id];
                    let file;
                    try {
                        file = DriveApp.getFileById(id);
                    } catch (e) {
                        return; // Omitir si no se puede acceder
                    }

                    let fileToProcess = file;
                    // Si se comparte entre más de un registro, crear copia física propia para este vehículo
                    if (usages && usages.length > 1) {
                        const usageIndexForThisRow = usages.findIndex(u => u.rowNum === rowNum && u.field === field);
                        if (usageIndexForThisRow > 0) { // Solo duplicar a partir del segundo uso
                            logMessage("Normalización Imágenes", `Imagen compartida detectada en fila ${rowNum}. Creando copia física propia...`);
                            const currentFolders = file.getParents();
                            const parentFolder = currentFolders.hasNext() ? currentFolders.next() : DriveApp.getRootFolder();
                            fileToProcess = file.makeCopy(file.getName(), parentFolder);
                            imgUrl = `https://drive.google.com/uc?export=view&id=${fileToProcess.getId()}`;
                            sheet.getRange(rowNum, colIndex + 1).setValue(imgUrl);
                            imagesRenamed++;
                        }
                    }

                    // Determinar el sufijo según el tipo de campo
                    let suffix = "";
                    if (field === "imagenVehiculo") suffix = "";
                    else if (field === "imgCorte1") suffix = "_corte1";
                    else if (field === "imgCorte2") suffix = "_corte2";
                    else if (field === "imgCorte3") suffix = "_corte3";
                    else if (field === "imgApertura") suffix = "_apert";
                    else if (field === "imgCableAlimen") suffix = "_alimen";

                    const extension = getExtensionFromName(fileToProcess.getName());
                    const newFilename = `${baseName}${suffix}${extension}`;

                    if (fileToProcess.getName() !== newFilename) {
                        fileToProcess.setName(newFilename);
                        imagesRenamed++;
                    }
                }
            }
        });

        processedCount++;
        if (processedCount % 10 === 0 || processedCount === totalVehicles) {
            logMessage("Normalización Imágenes", `Progreso de normalización...`, processedCount, totalVehicles);
        }
    });

    SpreadsheetApp.flush();
    logMessage("Normalización Imágenes", `Normalización finalizada de manera segura. Archivos renombrados/duplicados: ${imagesRenamed}`);
    return {
        status: 'success',
        processedCount: processedCount,
        imagesRenamed: imagesRenamed,
        message: "Nomenclatura uniforme aplicada a todas las imágenes e independientes físicas aseguradas."
    };
}

function getExtensionFromName(filename) {
    const dotIndex = filename.lastIndexOf(".");
    return dotIndex !== -1 ? filename.substring(dotIndex) : ".jpg";
}

/**
 * 5. Reorganización automática de imágenes en carpetas de Drive según la estructura jerárquica oficial
 */
function handleReorganizeImagesInDrive(payload, logMessage) {
    logMessage("Reorganización Drive", "Reestructurando y reorganizando carpetas e imágenes en Google Drive...");
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    data.shift(); // Quitar cabecera

    const totalVehicles = data.length;
    let processedCount = 0;
    let movedFiles = 0;

    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const imgFields = ['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen'];

    data.forEach((row, index) => {
        const rowNum = index + 2;
        const categoria = sanitizeForFilename(row[COLS_CORTES.categoria - 1] || 'Sin_Categoria');
        const marca = sanitizeForFilename(row[COLS_CORTES.marca - 1] || 'Sin_Marca');
        const modelo = sanitizeForFilename(row[COLS_CORTES.modelo - 1] || 'Sin_Modelo');
        const versionEncendido = sanitizeForFilename((row[COLS_CORTES.versionesAplicables - 1] || "SRV") + "_" + (row[COLS_CORTES.tipoEncendido - 1] || "BTN"));
        const generacion = sanitizeForFilename(row[COLS_CORTES.anoDesde - 1] || 'Sin_Ano');

        // Construir jerarquía de carpetas
        const catFolder = getOrCreateSubFolder(rootFolder, categoria);
        const marFolder = getOrCreateSubFolder(catFolder, marca);
        const modFolder = getOrCreateSubFolder(marFolder, modelo);
        const verFolder = getOrCreateSubFolder(modFolder, versionEncendido);
        const genFolder = getOrCreateSubFolder(verFolder, generacion);

        imgFields.forEach(field => {
            const colIndex = COLS_CORTES[field] - 1;
            const imgUrl = row[colIndex];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    try {
                        const file = DriveApp.getFileById(id);
                        const currentParents = file.getParents();
                        let alreadyInPlace = false;

                        while (currentParents.hasNext()) {
                            if (currentParents.next().getId() === genFolder.getId()) {
                                alreadyInPlace = true;
                                break;
                            }
                        }

                        if (!alreadyInPlace) {
                            // Mover archivo
                            genFolder.addFile(file);
                            // Remover de padres antiguos
                            const oldParents = file.getParents();
                            while (oldParents.hasNext()) {
                                const oldParent = oldParents.next();
                                if (oldParent.getId() !== genFolder.getId()) {
                                    oldParent.removeFile(file);
                                }
                            }
                            movedFiles++;
                        }
                    } catch (e) {
                        // Error de acceso u omitido
                    }
                }
            }
        });

        processedCount++;
        if (processedCount % 10 === 0 || processedCount === totalVehicles) {
            logMessage("Reorganización Drive", "Reestructurando jerarquía...", processedCount, totalVehicles);
        }
    });

    logMessage("Reorganización Drive", `Organización jerárquica completada. Archivos movidos o reubicados: ${movedFiles}`);
    return {
        status: 'success',
        processedCount: processedCount,
        movedFiles: movedFiles,
        message: "Estructura jerárquica unificada de carpetas de imágenes asegurada con éxito."
    };
}

function getOrCreateSubFolder(parentFolder, name) {
    const folders = parentFolder.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parentFolder.createFolder(name);
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

    // Ubicar o crear subcarpeta oficial
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const catFolder = getOrCreateSubFolder(rootFolder, sanitizeForFilename(categoria));
    const marFolder = getOrCreateSubFolder(catFolder, sanitizeForFilename(marca));
    const modFolder = getOrCreateSubFolder(marFolder, sanitizeForFilename(modelo));
    const verFolder = getOrCreateSubFolder(modFolder, sanitizeForFilename(versionEncendido));
    const genFolder = getOrCreateSubFolder(verFolder, sanitizeForFilename(generacion));

    // Guardar archivo en Drive
    const decodedData = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);
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
// HELPERS COMUNES
// ============================================================================
function sanitizeForFilename(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_');
}
