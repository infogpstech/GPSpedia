// ============================================================================
// GPSPEDIA-ADMIN SERVICE
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

function getSafeSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const altName = name.endsWith('s') ? name.slice(0, -1) : name + 's';
    sheet = ss.getSheetByName(altName);
  }
  return sheet;
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    LOGOS_MARCA: "LogosMarca",
    TUTORIALES: "Tutorial",
    RELAY: "Relay"
};

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================
function doGet(e) {
    const defaultResponse = { status: 'success', message: 'GPSpedia Admin-SERVICE is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        const action = request.action;
        const payload = request.payload || {};

        // Validar privilegios de desarrollador/administrador
        const { sessionToken } = payload;
        const { role } = getVerifiedSession(sessionToken);
        if (role !== 'Desarrollador' && role !== 'desarrollador') {
            throw new Error("Acceso denegado. Se requieren privilegios de desarrollador.");
        }

        switch (action) {
            case 'backupDatabase':
                response = handleBackupDatabase(payload);
                break;
            case 'restoreDatabase':
                response = handleRestoreDatabase(payload);
                break;
            case 'backupDrive':
                response = handleBackupDrive(payload);
                break;
            case 'restoreDrive':
                response = handleRestoreDrive(payload);
                break;
            case 'organizeDatabase':
                response = handleOrganizeDatabase(payload);
                break;
            case 'normalizeImageNames':
                response = handleNormalizeImageNames(payload);
                break;
            case 'reorganizeImagesInDrive':
                response = handleReorganizeImagesInDrive(payload);
                break;
            case 'addCorteSilent':
                response = handleAddCorteSilent(payload);
                break;
            case 'registerBrandLogo':
                response = handleRegisterBrandLogo(payload);
                break;
            case 'updateCorteField':
                response = handleUpdateCorteField(payload);
                break;
            default:
                throw new Error(`Acción desconocida en Admin Service: ${action}`);
        }
    } catch (error) {
        response = { status: 'error', message: error.message };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// AUTENTICACIÓN / VERIFICACIÓN DE SESIÓN (Reutilizado de users.js)
// ============================================================================
function getVerifiedSession(sessionToken) {
    if (!sessionToken) {
        throw new Error("Acceso no autorizado: Se requiere token de sesión.");
    }

    const sessionsSheet = getSpreadsheet().getSheetByName("ActiveSessions");
    if (!sessionsSheet) throw new Error("Hoja de sesiones no encontrada.");
    const sessionsData = sessionsSheet.getDataRange().getValues();
    sessionsData.shift();

    let userId = null;
    for (const row of sessionsData) {
        if (row[2] === sessionToken) { // ActiveSessions token is in column 3
            userId = row[0]; // ID_Usuario is in column 1
            break;
        }
    }

    if (!userId) {
        throw new Error("Acceso no autorizado: Sesión inválida o expirada.");
    }

    const usersSheet = getSpreadsheet().getSheetByName("Users");
    if (!usersSheet) throw new Error("Hoja de usuarios no encontrada.");
    const usersData = usersSheet.getDataRange().getValues();
    usersData.shift();

    for (const row of usersData) {
        if (row[0] == userId) {
            return {
                userId: String(userId),
                role: row[3] // Privilegios is in column 4
            };
        }
    }

    throw new Error("Acceso no autorizado: Usuario asociado a la sesión no encontrado.");
}

// ============================================================================
// SISTEMA DE RESPALDO Y RESTAURACIÓN DE LA BASE DE DATOS
// ============================================================================
function handleBackupDatabase(payload) {
    const file = DriveApp.getFileById(SPREADSHEET_ID);
    const backupFile = file.makeCopy("GPSpedia_DB_Backup_" + new Date().toISOString().replace(/[:.]/g, '-'));
    const backupId = backupFile.getId();

    // Guardar ID en propiedades del script
    const props = PropertiesService.getScriptProperties();
    let backups = JSON.parse(props.getProperty("DB_BACKUPS") || "[]");
    backups.push({ id: backupId, timestamp: new Date().toISOString() });
    props.setProperty("DB_BACKUPS", JSON.stringify(backups));

    return { status: 'success', message: 'Respaldo de base de datos generado con éxito.', backupId: backupId };
}

function handleRestoreDatabase(payload) {
    const { backupId } = payload;
    if (!backupId) throw new Error("El ID del respaldo es requerido para restaurar.");

    const backupSpreadsheet = SpreadsheetApp.openById(backupId);
    const currentSpreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Copiar hojas
    const backupSheets = backupSpreadsheet.getSheets();
    const tempSheet = currentSpreadsheet.insertSheet("TempRestoreSheet_" + Date.now());

    // Borrar hojas antiguas
    const oldSheets = currentSpreadsheet.getSheets();
    for (const oldSheet of oldSheets) {
        if (oldSheet.getName() !== tempSheet.getName()) {
            currentSpreadsheet.deleteSheet(oldSheet);
        }
    }

    // Insertar las restauradas
    for (const sheet of backupSheets) {
        sheet.copyTo(currentSpreadsheet).setName(sheet.getName());
    }

    // Borrar temporal
    currentSpreadsheet.deleteSheet(tempSheet);
    SpreadsheetApp.flush();

    return { status: 'success', message: 'Base de datos restaurada con éxito desde el respaldo.' };
}

// ============================================================================
// SISTEMA DE RESPALDO Y RESTAURACIÓN DE DRIVE
// ============================================================================
function handleBackupDrive(payload) {
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const parentFolder = rootFolder.getParents().hasNext() ? rootFolder.getParents().next() : DriveApp.getRootFolder();

    const backupFolder = parentFolder.createFolder("GPSpedia_Drive_Backup_" + new Date().toISOString().replace(/[:.]/g, '-'));
    const idMap = {};
    recursiveCopyFolder(rootFolder, backupFolder, idMap);

    const backupFolderId = backupFolder.getId();
    const props = PropertiesService.getScriptProperties();
    let backups = JSON.parse(props.getProperty("DRIVE_BACKUPS") || "[]");
    backups.push({ id: backupFolderId, timestamp: new Date().toISOString() });
    props.setProperty("DRIVE_BACKUPS", JSON.stringify(backups));
    props.setProperty("DRIVE_MAP_" + backupFolderId, JSON.stringify(idMap));

    return { status: 'success', message: 'Respaldo de archivos de Drive completado con éxito.', backupFolderId: backupFolderId };
}

function handleRestoreDrive(payload) {
    const { backupFolderId } = payload;
    if (!backupFolderId) throw new Error("ID de carpeta de respaldo requerido.");

    const backupFolder = DriveApp.getFolderById(backupFolderId);
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Limpiar carpeta destino actual
    const currentFolders = rootFolder.getFolders();
    while (currentFolders.hasNext()) {
        rootFolder.removeFolder(currentFolders.next());
    }
    const currentFiles = rootFolder.getFiles();
    while (currentFiles.hasNext()) {
        rootFolder.removeFile(currentFiles.next());
    }

    // Copiar de vuelta
    const idMap = {}; // backupId -> restoredId
    recursiveCopyFolder(backupFolder, rootFolder, idMap);

    // Reconciliar relaciones en la hoja de cálculo
    const props = PropertiesService.getScriptProperties();
    const originalMapStr = props.getProperty("DRIVE_MAP_" + backupFolderId);
    if (originalMapStr) {
        const originalMap = JSON.parse(originalMapStr); // originalId -> backupId
        const finalMap = {}; // originalId -> restoredId
        for (const origId in originalMap) {
            const bkpId = originalMap[origId];
            if (idMap[bkpId]) {
                finalMap[origId] = idMap[bkpId];
            }
        }
        updateSpreadsheetImageReferences(finalMap);
    }

    return { status: 'success', message: 'Archivos de Drive y relaciones restaurados con éxito.' };
}

function recursiveCopyFolder(source, target, idMap) {
    const folders = source.getFolders();
    while (folders.hasNext()) {
        const subFolder = folders.next();
        const newSubFolder = target.createFolder(subFolder.getName());
        recursiveCopyFolder(subFolder, newSubFolder, idMap);
    }
    const files = source.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        const newFile = file.makeCopy(file.getName(), target);
        idMap[file.getId()] = newFile.getId();
    }
}

function updateSpreadsheetImageReferences(idMap) {
    const ss = getSpreadsheet();
    const sheets = ss.getSheets();
    for (const sheet of sheets) {
        const range = sheet.getDataRange();
        const values = range.getValues();
        let changed = false;

        for (let r = 0; r < values.length; r++) {
            for (let c = 0; c < values[r].length; c++) {
                const val = String(values[r][c]);
                if (val.includes("id=")) {
                    for (const oldId in idMap) {
                        if (val.includes(oldId)) {
                            values[r][c] = val.replace(oldId, idMap[oldId]);
                            changed = true;
                        }
                    }
                } else {
                    for (const oldId in idMap) {
                        if (val === oldId) {
                            values[r][c] = idMap[oldId];
                            changed = true;
                        }
                    }
                }
            }
        }
        if (changed) {
            range.setValues(values);
        }
    }
    SpreadsheetApp.flush();
}

// ============================================================================
// ORGANIZACIÓN AUTOMÁTICA DE LA BASE DE DATOS
// ============================================================================
function handleOrganizeDatabase(payload) {
    // Generar respaldo automático antes de modificar información estructural
    handleBackupDatabase(payload);

    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow > 1) {
        const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
        // Ordenar por Marca (col 3), Modelo (col 4), Año Desde (col 6)
        range.sort([
            { column: 3, ascending: true },
            { column: 4, ascending: true },
            { column: 6, ascending: true }
        ]);
        SpreadsheetApp.flush();
    }

    return { status: 'success', message: 'Base de datos organizada y agrupada por marca con éxito.' };
}

// ============================================================================
// NORMALIZACIÓN DE NOMBRES DE IMÁGENES
// ============================================================================
function handleNormalizeImageNames(payload) {
    // Generar respaldo automático antes de modificar información estructural
    handleBackupDatabase(payload);

    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();

    // Mapas de columnas para Cortes
    const COLS = {
        id: 1, categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, anoHasta: 7, tipoEncendido: 8,
        imagenVehiculo: 9, imgCorte1: 16, imgCorte2: 23, imgCorte3: 30, imgApertura: 34, imgCableAlimen: 36
    };

    const imageFields = [
        { col: COLS.imagenVehiculo, type: 'vehiculo' },
        { col: COLS.imgCorte1, type: 'corte1' },
        { col: COLS.imgCorte2, type: 'corte2' },
        { col: COLS.imgCorte3, type: 'corte3' },
        { col: COLS.imgApertura, type: 'apertura' },
        { col: COLS.imgCableAlimen, type: 'alimentacion' }
    ];

    // 1. Detectar uso compartido de imágenes
    const fileIdToRefs = {};
    for (let r = 0; r < data.length; r++) {
        const rowData = data[r];
        const rowNum = r + 2;
        imageFields.forEach(f => {
            const val = rowData[f.col - 1];
            const fileId = getFileIdFromValue(val);
            if (fileId) {
                if (!fileIdToRefs[fileId]) fileIdToRefs[fileId] = [];
                fileIdToRefs[fileId].push({ row: rowNum, col: f.col, type: f.type, rowData: rowData });
            }
        });
    }

    // 2. Duplicar imágenes compartidas para que cada registro tenga su propio archivo independiente
    for (const fileId in fileIdToRefs) {
        const refs = fileIdToRefs[fileId];
        if (refs.length > 1) {
            // Mantener la primera, duplicar el resto
            for (let i = 1; i < refs.length; i++) {
                const ref = refs[i];
                try {
                    const file = DriveApp.getFileById(fileId);
                    const copy = file.makeCopy(file.getName(), file.getParents().next());
                    const newUrl = `https://drive.google.com/uc?export=view&id=${copy.getId()}`;
                    sheet.getRange(ref.row, ref.col).setValue(newUrl);
                    // Actualizar en nuestros datos locales
                    ref.newFileId = copy.getId();
                } catch (e) {
                    // Ignorar si el archivo no existe
                }
            }
        }
    }

    SpreadsheetApp.flush();

    // Volver a leer datos para normalizar nombres con referencias limpias e independientes
    const updatedData = sheet.getDataRange().getValues();
    updatedData.shift();

    for (let r = 0; r < updatedData.length; r++) {
        const rowData = updatedData[r];
        const rowNum = r + 2;

        const baseObj = {
            marca: String(rowData[COLS.marca - 1] || ''),
            modelo: String(rowData[COLS.modelo - 1] || ''),
            version: String(rowData[COLS.versionesAplicables - 1] || ''),
            encendido: String(rowData[COLS.tipoEncendido - 1] || ''),
            anio: String(rowData[COLS.anoDesde - 1] || '')
        };

        const parts = [
            sanitizeFilenamePart(baseObj.modelo),
            sanitizeFilenamePart(baseObj.version),
            sanitizeFilenamePart(baseObj.encendido),
            sanitizeFilenamePart(baseObj.anio)
        ].filter(Boolean);
        const baseName = parts.join('_');

        imageFields.forEach(f => {
            const val = rowData[f.col - 1];
            const fileId = getFileIdFromValue(val);
            if (fileId) {
                try {
                    const file = DriveApp.getFileById(fileId);
                    const extMatch = file.getName().match(/\.[a-zA-Z0-9]+$/);
                    const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
                    let suffix = '';
                    if (f.type === 'corte1') suffix = '_corte1';
                    else if (f.type === 'corte2') suffix = '_corte2';
                    else if (f.type === 'corte3') suffix = '_corte3';
                    else if (f.type === 'apertura') suffix = '_apert';
                    else if (f.type === 'alimentacion') suffix = '_alimen';

                    const newName = baseName + suffix + ext;
                    file.setName(newName);
                } catch (e) {
                    // Ignorar si falla o el archivo no existe
                }
            }
        });
    }

    return { status: 'success', message: 'Nombres de imágenes normalizados con éxito.' };
}

function getFileIdFromValue(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    const idMatch = trimmed.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        return idMatch[1] || idMatch[2] || idMatch[3];
    } else if (trimmed.length > 20 && !trimmed.includes('/') && !trimmed.includes(':')) {
        return trimmed;
    }
    return null;
}

function sanitizeFilenamePart(text) {
    if (!text) return '';
    return String(text).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// ============================================================================
// REORGANIZACIÓN AUTOMÁTICA DE IMÁGENES EN DRIVE
// ============================================================================
function handleReorganizeImagesInDrive(payload) {
    // Generar respaldo automático antes de modificar información estructural
    handleBackupDatabase(payload);

    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const data = sheet.getDataRange().getValues();
    data.shift();

    const COLS = {
        categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, tipoEncendido: 8,
        imagenVehiculo: 9, imgCorte1: 16, imgCorte2: 23, imgCorte3: 30, imgApertura: 34, imgCableAlimen: 36
    };

    const imageColumns = [COLS.imagenVehiculo, COLS.imgCorte1, COLS.imgCorte2, COLS.imgCorte3, COLS.imgApertura, COLS.imgCableAlimen];

    data.forEach(rowData => {
        const rowObj = {
            categoria: String(rowData[COLS.categoria - 1] || 'Sin_Categoria'),
            marca: String(rowData[COLS.marca - 1] || 'Sin_Marca'),
            modelo: String(rowData[COLS.modelo - 1] || 'Sin_Modelo'),
            version: String(rowData[COLS.versionesAplicables - 1] || ''),
            encendido: String(rowData[COLS.tipoEncendido - 1] || ''),
            anio: String(rowData[COLS.anoDesde - 1] || 'Sin_Anio')
        };

        const targetFolder = getFolderForHierarchy(rowObj);

        imageColumns.forEach(colIndex => {
            const val = rowData[colIndex - 1];
            const fileId = getFileIdFromValue(val);
            if (fileId) {
                try {
                    const file = DriveApp.getFileById(fileId);
                    const parents = file.getParents();
                    let alreadyThere = false;
                    while (parents.hasNext()) {
                        if (parents.next().getId() === targetFolder.getId()) {
                            alreadyThere = true;
                            break;
                        }
                    }
                    if (!alreadyThere) {
                        file.moveTo(targetFolder);
                    }
                } catch (e) {
                    // Ignorar si falla
                }
            }
        });
    });

    return { status: 'success', message: 'Imágenes reorganizadas físicamente en carpetas Drive.' };
}

function getFolderForHierarchy(rowData) {
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const cat = sanitizeFolderName(rowData.categoria);
    const mar = sanitizeFolderName(rowData.marca);
    const mod = sanitizeFolderName(rowData.modelo);

    // Versión de equipamiento / Tipo de encendido
    const verPart = [rowData.version, rowData.encendido].filter(Boolean).join('_') || 'Sin_Version';
    const ver = sanitizeFolderName(verPart);
    const gen = sanitizeFolderName(rowData.anio);

    const fCat = getOrCreateSubFolder(rootFolder, cat);
    const fMar = getOrCreateSubFolder(fCat, mar);
    const fMod = getOrCreateSubFolder(fMar, mod);
    const fVer = getOrCreateSubFolder(fMod, ver);
    const fGen = getOrCreateSubFolder(fVer, gen);
    return fGen;
}

function sanitizeFolderName(text) {
    if (!text) return '';
    return String(text).trim().replace(/[\/\\?%*:|"<>\s]/g, '_');
}

function getOrCreateSubFolder(parentFolder, name) {
    const folders = parentFolder.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parentFolder.createFolder(name);
}

// ============================================================================
// REGISTRO SILENCIOSO DE NUEVOS CORTES
// ============================================================================
function handleAddCorteSilent(payload) {
    // Reutilizar la lógica de escritura ya existente
    // Al estar todos los .gs en el mismo scope de script, handleAddOrUpdateCut está disponible
    const result = handleAddOrUpdateCut(payload);

    if (result.status === 'success' && result.vehicleId) {
        // Forzar un timestamp antiguo "01/01/2000" para que no salga en "Agregados recientemente"
        const sheet = getSafeSheet(SHEET_NAMES.CORTES);
        const ids = sheet.getRange(2, 1, sheet.getLastRow(), 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id.toString() == result.vehicleId.toString());
        if (rowIndex !== -1) {
            // Columna 37 es timestamp en COLS_CORTES (v2.0)
            sheet.getRange(rowIndex + 2, 37).setValue("01/01/2000");
            SpreadsheetApp.flush();
        }
    }
    return result;
}

// ============================================================================
// REGISTRO DE NUEVOS LOGOTIPOS DE MARCAS
// ============================================================================
function handleRegisterBrandLogo(payload) {
    const { nombreMarca, logoData, fabricanteNombre } = payload;
    if (!nombreMarca || !logoData) {
        throw new Error("Nombre de marca y logotipo son requeridos.");
    }

    const normalizedMarca = nombreMarca.trim();

    // Guardar logo en carpeta "LogosMarca" de Drive
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const logosFolder = getOrCreateSubFolder(rootFolder, "LogosMarca");

    // Subir imagen preservando el formato original
    const filename = "logo_" + sanitizeFilenamePart(normalizedMarca);
    const logoUrl = uploadImageToDriveLocal(logoData, filename, logosFolder);

    // Escribir en la hoja LogosMarca
    const sheet = getSafeSheet("LogosMarca");
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    const lastCol = sheet.getLastColumn() || 4;
    const FORMULA_ROW = 2;

    if (lastRow >= FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        if (lastCol > 1) {
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
    }

    sheet.getRange(newRowNumber, 2).setValue(normalizedMarca);
    sheet.getRange(newRowNumber, 3).setValue(logoUrl);
    sheet.getRange(newRowNumber, 4).setValue(fabricanteNombre || normalizedMarca);

    SpreadsheetApp.flush();
    return { status: 'success', message: `Marca ${normalizedMarca} registrada con éxito.`, logoUrl: logoUrl };
}

function uploadImageToDriveLocal(imageData, filename, folder) {
    if (!imageData) return "";
    let blob;
    let finalFilename = filename;

    if (imageData.startsWith('http')) {
        const response = UrlFetchApp.fetch(imageData);
        blob = response.getBlob();
        const mimeType = blob.getContentType();
        const extension = getExtensionFromMimeType(mimeType);
        finalFilename = filename + extension;
        blob.setName(finalFilename);
    } else if (imageData.startsWith('data:image/')) {
        const parts = imageData.split(',');
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const decodedData = Utilities.base64Decode(parts[1]);
        const extension = getExtensionFromMimeType(mimeType);
        finalFilename = filename + extension;
        blob = Utilities.newBlob(decodedData, mimeType, finalFilename);
    } else {
        throw new Error("Formato de imagen no soportado.");
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

// ============================================================================
// ACTUALIZACIÓN DIRECTA DE CAMPOS DE CORTES (Para Modo Edición In-Modal)
// ============================================================================
function handleUpdateCorteField(payload) {
    const { vehicleId, field, value } = payload;
    if (!vehicleId || !field) {
        throw new Error("ID de vehículo y campo requeridos.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() === vehicleId.toString());

    if (rowIndex === -1) {
        throw new Error("El vehículo no fue encontrado.");
    }
    const actualRow = rowIndex + 2;

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

    const colNum = COLS_CORTES[field];
    if (!colNum) {
        throw new Error(`El campo '${field}' no es editable o no es válido.`);
    }

    let finalValue = value;

    // Si el valor es una imagen base64, subirla
    if (typeof value === 'string' && value.startsWith('data:image/')) {
        const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
        const marca = rowValues[COLS_CORTES.marca - 1];
        const modelo = rowValues[COLS_CORTES.modelo - 1];
        const categoria = rowValues[COLS_CORTES.categoria - 1];
        const anoDesde = rowValues[COLS_CORTES.anoDesde - 1];
        const tipoEncendido = rowValues[COLS_CORTES.tipoEncendido - 1];

        const folder = getFolderForHierarchy({
            categoria: categoria,
            marca: marca,
            modelo: modelo,
            version: rowValues[COLS_CORTES.versionesAplicables - 1] || '',
            encendido: tipoEncendido,
            anio: anoDesde
        });

        const filename = `${sanitizeFilenamePart(marca)}_${sanitizeFilenamePart(modelo)}_${sanitizeFilenamePart(tipoEncendido)}_${anoDesde}_${field}`;
        finalValue = uploadImageToDriveLocal(value, filename, folder);
    }

    sheet.getRange(actualRow, colNum).setValue(finalValue);

    // Actualizar timestamp
    const formattedDate = Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy");
    sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Campo actualizado.', newValue: finalValue };
}
