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


const WRITE_SERVICE_URL = "https://script.google.com/macros/s/AKfycbwsRkcK8-q8hiOpaUNrU1e79WD2SH87MsZkfaFU3S19ayAC9ZMhxDuZUv0cx9iaW7cPlw/exec";

/** WRITE es la autoridad única para asignar y estabilizar IDs de Cortes. */
function callWriteServiceAction(action, payload, sharedMutationToken) {
    if (!sharedMutationToken) throw new Error("La llamada interna a WRITE requiere una lease compartida válida.");
    const requestPayload = Object.assign({}, payload || {}, { __sharedMutationToken: sharedMutationToken });
    const response = UrlFetchApp.fetch(WRITE_SERVICE_URL, {
        method: "post",
        contentType: "text/plain",
        payload: JSON.stringify({ action, payload: requestPayload }),
        muteHttpExceptions: true,
        followRedirects: true
    });
    const httpStatus = response.getResponseCode();
    let result;
    try {
        result = JSON.parse(response.getContentText());
    } catch (error) {
        throw new Error(`WRITE no devolvió JSON válido para ${action} (HTTP ${httpStatus}).`);
    }
    if (httpStatus < 200 || httpStatus >= 300 || !result || result.status !== "success") {
        const detail = result && result.details && result.details.errorMessage;
        throw new Error(detail || (result && result.message) || `WRITE rechazó ${action} (HTTP ${httpStatus}).`);
    }
    return result;
}

function requestNextVehicleIdFromWriteService(payload, sharedMutationToken) {
    const result = callWriteServiceAction("allocateVehicleId", {
        userId: payload && payload.userId,
        sessionToken: payload && payload.sessionToken
    }, sharedMutationToken);
    const vehicleId = Number(result.vehicleId);
    if (!Number.isSafeInteger(vehicleId) || vehicleId < 1) throw new Error("WRITE devolvió un ID de vehículo inválido.");
    return vehicleId;
}

function requestCortesIdFreezeFromWriteService(payload, backupId, sharedMutationToken) {
    return callWriteServiceAction("freezeCortesIds", {
        userId: payload && payload.userId,
        sessionToken: payload && payload.sessionToken,
        backupId,
        confirm: true
    }, sharedMutationToken);
}


function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

/**
 * Autoriza acciones sensibles exclusivamente para una sesión activa con privilegio Desarrollador.
 * La identidad y el rol se obtienen de las hojas del servidor; nunca se confía en el rol enviado por el navegador.
 */
function getSessionExpirationStatus_(row,now=new Date()){
 if(!row)return{expired:true,reason:'missing_session'};
 const parse=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;};
 const add=(date,n)=>{const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;};
 const created=parse(row[3]),raw=row[5],activity=raw===null||raw===undefined||String(raw).trim()===''?created:parse(raw);
 if(!created||!activity)return{expired:true,reason:'invalid_timestamp'};
 if(now.getTime()>=add(created,3).getTime())return{expired:true,reason:'absolute_expiration'};
 if(now.getTime()>=add(activity,1).getTime())return{expired:true,reason:'inactivity_expiration'};
 return{expired:false};
}
const ROLE_REVOCATION_SHARED_PREFIX = "__role_revocation_pending__:";
function getAdminSessionContext_(payload, allowedRoles){
 const id=String(payload&&payload.userId||"").trim(),token=String(payload&&payload.sessionToken||"").trim();if(!id||!token)throw new Error("Acceso denegado: sesión no autorizada.");
 const ss=getSpreadsheet(),sh=ss.getSheetByName("ActiveSessions"),uh=ss.getSheetByName("Users");if(!sh||!uh)throw new Error("Acceso denegado: sesión no autorizada.");
 const tokenMatches=sh.getDataRange().getValues().slice(1).filter(r=>String(r[2]||"").trim()===token);
 if(tokenMatches.length!==1||String(tokenMatches[0][0]||"").trim()!==id||getSessionExpirationStatus_(tokenMatches[0],new Date()).expired)throw new Error("Acceso denegado: sesión inválida, duplicada, cruzada o expirada.");
 const userMatches=uh.getDataRange().getValues().slice(1).filter(r=>String(r[0]||"").trim()===id);if(userMatches.length!==1)throw new Error("Acceso denegado: perfil de usuario ausente o ambiguo.");
 const u=userMatches[0];if(String(u[7]||"").startsWith(ROLE_REVOCATION_SHARED_PREFIX))throw new Error("Acceso no autorizado: existe una revocación de rol pendiente. Inicia sesión nuevamente cuando finalice.");
 const username=String(u[1]||"").trim();if(!username||username.startsWith("__deleted__:"))throw new Error("Acceso denegado: cuenta inactiva.");
 const role=String(u[3]||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
 if(!Array.isArray(allowedRoles)||!allowedRoles.includes(role))throw new Error("Acceso denegado: sesión no autorizada.");
 const fullName=String(u[6]||"").trim(),displayRole=role==="desarrollador"?"Desarrollador":"Gefe";
 return{userId:id,role:displayRole,fullName,userName:fullName||username};
}
function assertDeveloperSession(payload){return getAdminSessionContext_(payload,["desarrollador"]);}
function assertModalEditSession(payload){return getAdminSessionContext_(payload,["desarrollador","gefe"]);}
const ADMIN_MODAL_EDIT_ACTIONS = new Set(["updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"]);
const ADMIN_MODAL_EDIT_FIELDS = new Set([
 "categoria","modelo","versionesAplicables","tipoEncendido","anoDesde","anoHasta","vin","notaImportante",
 "apertura","cableAlimen","cableAlimen2","cableAlimen3",
 "imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura",
 "imgCableAlimen","imgCableAlimen2","imgCableAlimen3"
]);
function isAdminModalEditField_(fieldName){
 const field=String(fieldName||"");
 return ADMIN_MODAL_EDIT_FIELDS.has(field)||/^(tipoCorte|configRelay|ubicacionCorte|colorCableCorte)[1-3]$/.test(field);
}
function extractDriveFileIds(value) {
    const text = String(value || "");
    const ids = new Set();
    const patterns = [
        /[?&]id=([a-zA-Z0-9_-]{10,})/g,
        new RegExp("[/]d/([a-zA-Z0-9_-]{10,})", "g")
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
    });
    if (/^[a-zA-Z0-9_-]{20,}$/.test(text.trim())) ids.add(text.trim());
    return Array.from(ids);
}

function extractDriveFileId(value) {
    return extractDriveFileIds(value)[0] || "";
}

function extractBackupFolderId(value) {
    const text = String(value || "").trim();
    if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
    const folderUrlMatch = text.match(/^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders|folders)\/([a-zA-Z0-9_-]{20,})(?:[/?#].*)?$/i);
    const queryUrlMatch = text.match(/^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?(?:open|folderview)|open)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]{20,})(?:&|#|$)/i);
    return (folderUrlMatch && folderUrlMatch[1]) || (queryUrlMatch && queryUrlMatch[1]) || "";
}

function isDirectChildOfDriveRoot(resource) {
    const rootFolderId = DriveApp.getRootFolder().getId();
    const parents = resource.getParents();
    while (parents.hasNext()) {
        if (parents.next().getId() === rootFolderId) return true;
    }
    return false;
}
function getCortesRootFolder() {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    if (String(folder.getId()) !== String(DRIVE_FOLDER_ID) ||
        String(folder.getName() || "").trim().toLowerCase() !== "cortes" ||
        !isDirectChildOfDriveRoot(folder)) {
        throw new Error("DRIVE_FOLDER_ID no corresponde a la carpeta raíz «Cortes» ubicada directamente en Drive.");
    }
    return folder;
}

function isBackupUrlForResource(backupUrl, expectedPrefix) {
    return backupUrl === expectedPrefix ||
        backupUrl.startsWith(expectedPrefix + "/") ||
        backupUrl.startsWith(expectedPrefix + "?");
}
function getVinMigrationBackupCacheKey(userId) {
    return "VIN_MIGRATION_BACKUP_" + String(userId || "").trim();
}
function verifyVinMigrationBackup(backupId, developerContext) {
    const cleanBackupId = String(backupId || "").trim();
    const userId = String(developerContext && developerContext.userId || "").trim();
    if (!userId || !/^[a-zA-Z0-9_-]{20,}$/.test(cleanBackupId)) throw new Error("La migración VIN requiere el ID de un respaldo de Spreadsheet válido.");
    if (cleanBackupId === String(SPREADSHEET_ID)) throw new Error("La Spreadsheet operativa no puede utilizarse como respaldo de sí misma.");
    const cachedBackupId = CacheService.getScriptCache().get(getVinMigrationBackupCacheKey(userId));
    if (cachedBackupId !== cleanBackupId) throw new Error("El respaldo no fue generado y verificado por esta sesión de desarrollador. Genera un nuevo respaldo antes de continuar.");
    const backupFile = DriveApp.getFileById(cleanBackupId);
    if (backupFile.isTrashed() || backupFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
        !String(backupFile.getName() || "").startsWith("GPSpedia_DB_BACKUP_") || !isDirectChildOfDriveRoot(backupFile)) {
        throw new Error("El ID proporcionado no corresponde a un respaldo de Spreadsheet válido y disponible en Drive.");
    }
    const backupSpreadsheet = SpreadsheetApp.openById(cleanBackupId);
    const backupCortesSheet = backupSpreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    if (backupSpreadsheet.getId() !== cleanBackupId || !backupCortesSheet || backupCortesSheet.getMaxColumns() < 45) {
        throw new Error("El respaldo no contiene una hoja «Cortes» compatible con la migración VIN.");
    }
    return { backupId: cleanBackupId, backupName: backupFile.getName() };
}

function collectActiveDriveReferences(includeLocations = true) {
    const excludedSheets = new Set([
        SHEET_NAMES.IMAGENES_REEMPLAZADAS, "Logs", "ActividadUsuario", "ActiveSessions", "Users",
        SHEET_NAMES.ADMIN_STATE, SHEET_NAMES.IDEMPOTENCIA, SHEET_NAMES.IDEMPOTENCIA_FALLBACK
    ]);
    const references = new Map();
    let unverifiableReferenceCount = 0;

    getSpreadsheet().getSheets().forEach(sheet => {
        if (excludedSheets.has(sheet.getName())) return;
        const range = sheet.getDataRange();
        const values = range.getDisplayValues();
        const formulas = range.getFormulas();
        const richTextValues = range.getRichTextValues();

        for (let r = 0; r < values.length; r++) {
            for (let c = 0; c < values[r].length; c++) {
                const candidates = [
                    String(values[r][c] || ""),
                    String((formulas[r] && formulas[r][c]) || "")
                ];
                const richText = richTextValues[r] && richTextValues[r][c];
                if (richText) {
                    const wholeCellLink = richText.getLinkUrl();
                    if (wholeCellLink) candidates.push(wholeCellLink);
                    const runs = richText.getRuns ? richText.getRuns() : [];
                    runs.forEach(run => {
                        const runLink = run.getLinkUrl();
                        if (runLink) candidates.push(runLink);
                    });
                }

                const cellIds = new Set();
                let cellHasUnverifiableDriveLink = false;
                candidates.forEach(candidate => {
                    if (!candidate) return;
                    const ids = extractDriveFileIds(candidate);
                    ids.forEach(id => cellIds.add(id));
                    if (!ids.length && /drive\.google\.com\/(?:uc|thumbnail|file|open)|googleusercontent\.com/i.test(candidate)) {
                        cellHasUnverifiableDriveLink = true;
                    }
                });

                cellIds.forEach(id => {
                    if (includeLocations) {
                        if (!references.has(id)) references.set(id, []);
                        references.get(id).push({ sheet: sheet.getName(), row: r + 1, column: c + 1 });
                    } else {
                        references.set(id, true);
                    }
                });
                if (cellHasUnverifiableDriveLink) unverifiableReferenceCount++;
            }
        }
    });

    return { references, unverifiableReferenceCount };
}

function collectCortesImageReferences(includeLocations = true) {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) throw new Error("No se encontró la hoja «Cortes» para verificar las referencias de imágenes.");
    const imageFields = ["imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"];
    const imageColumns = imageFields.map(field => ({ field: field, column: COLS_CORTES[field] })).filter(item => Number.isInteger(item.column) && item.column > 0);
    const references = new Map();
    let unverifiableReferenceCount = 0;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { references: references, unverifiableReferenceCount: 0 };
    const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const values = range.getDisplayValues();
    const formulas = range.getFormulas();
    const richTextValues = range.getRichTextValues();
    for (let r = 0; r < values.length; r++) {
        imageColumns.forEach(item => {
            const c = item.column - 1;
            const candidates = [String(values[r][c] || ""), String((formulas[r] && formulas[r][c]) || "")];
            const richText = richTextValues[r] && richTextValues[r][c];
            if (richText) {
                const wholeCellLink = richText.getLinkUrl();
                if (wholeCellLink) candidates.push(wholeCellLink);
                const runs = richText.getRuns ? richText.getRuns() : [];
                runs.forEach(run => { const runLink = run.getLinkUrl(); if (runLink) candidates.push(runLink); });
            }
            const cellIds = new Set();
            let hasUnverifiableDriveLink = false;
            candidates.forEach(candidate => {
                if (!candidate) return;
                const ids = extractDriveFileIds(candidate);
                ids.forEach(id => cellIds.add(id));
                if (!ids.length && /drive\.google\.com\/(?:uc|thumbnail|file|open)|googleusercontent\.com/i.test(candidate)) hasUnverifiableDriveLink = true;
            });
            cellIds.forEach(id => {
                if (includeLocations) {
                    if (!references.has(id)) references.set(id, []);
                    references.get(id).push({ sheet: SHEET_NAMES.CORTES, row: r + 2, column: item.column, field: item.field });
                } else references.set(id, true);
            });
            if (hasUnverifiableDriveLink) unverifiableReferenceCount++;
        });
    }
    return { references: references, unverifiableReferenceCount: unverifiableReferenceCount };
}

function isFolderInsideCortes(folder, rootFolderId) {
    const pending = [folder];
    const visited = new Set();
    let index = 0;

    while (index < pending.length) {
        const current = pending[index++];
        if (!current) continue;

        const currentId = current.getId();
        if (currentId === rootFolderId) return true;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const parents = current.getParents();
        while (parents.hasNext()) pending.push(parents.next());
    }

    return false;
}

function getFolderPathInsideCortes(folder, rootFolderId) {
    const segments = [];
    const visited = new Set();
    let current = folder;

    while (current) {
        const currentId = current.getId();
        if (visited.has(currentId)) throw new Error("Se detectó un ciclo en la jerarquía de carpetas de Drive.");
        visited.add(currentId);
        segments.push(current.getName());

        if (currentId === rootFolderId) return segments.reverse().join("/");

        const parents = current.getParents();
        let parentInsideCortes = null;
        while (parents.hasNext()) {
            const parent = parents.next();
            if (isFolderInsideCortes(parent, rootFolderId)) {
                parentInsideCortes = parent;
                break;
            }
        }
        if (!parentInsideCortes) {
            throw new Error("No se pudo reconstruir la ubicación de la carpeta dentro de «Cortes».");
        }
        current = parentInsideCortes;
    }

    throw new Error("No se pudo reconstruir la ubicación de la carpeta dentro de «Cortes».");
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    LOGOS_MARCA: "LogosMarca",
    TUTORIALES: "Tutorial",
    RELAY: "Relay",
    ADMIN_STATE: "AdminState",
    IDEMPOTENCIA: "Idempotencia",
    IDEMPOTENCIA_FALLBACK: "Idempotencia_Cortes",
    IMAGENES_REEMPLAZADAS: "Imagenes_Reemplazadas"
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
    cableAlimen2: 39, imgCableAlimen2: 40, cableAlimen3: 41, imgCableAlimen3: 42,
    activaTestigo1: 46, activaTestigo2: 47, activaTestigo3: 48
};

/**
 * Resuelve el encabezado VIN sin depender de la capitalización.
 */
function getVinColumnIndex(sheet) {
    if (!sheet || sheet.getLastColumn() < 1) return 0;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const matches = [];
    headers.forEach((value, index) => {
        if (String(value || "").trim().toLowerCase() === "vin") matches.push(index + 1);
    });
    if (matches.length > 1) {
        throw new Error("La hoja «Cortes» contiene encabezados VIN duplicados en las columnas " + matches.join(", ") + "; no se realizó ninguna escritura.");
    }
    return matches.length === 1 ? matches[0] : 0;
}

function normalizeVinCollectionValue_(value, context) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") throw new Error((context || "VIN") + ": cada elemento debe ser texto.");
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized.startsWith("OP-") || normalized.startsWith("OP_") || normalized.includes("IDOPERACION")) return "";
    if (!/^[A-Z0-9]{1,18}$/.test(normalized)) throw new Error((context || "VIN") + ": identificador heredado inválido «" + normalized + "».");
    return normalized;
}
function normalizeVinCollectionArray_(values, context) {
    if (!Array.isArray(values)) throw new Error((context || "VIN") + ": se esperaba una colección.");
    if (values.length > 3) throw new Error((context || "VIN") + ": la colección no puede superar tres posiciones.");
    const normalized = values.map(value => normalizeVinCollectionValue_(value, context));
    const seen = new Set();
    normalized.forEach(value => {
        if (!value) return;
        if (seen.has(value)) throw new Error((context || "VIN") + ": el VIN «" + value + "» está duplicado en la misma colección.");
        seen.add(value);
    });
    return normalized;
}
function parseVinCollection(rawVin) {
    if (rawVin === null || rawVin === undefined || rawVin === "") return [];
    if (Array.isArray(rawVin)) return normalizeVinCollectionArray_(rawVin, "Colección VIN");
    const text = String(rawVin).trim();
    if (!text) return [];
    if (text.startsWith("[") || text.endsWith("]")) {
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (error) { throw new Error("La colección VIN contiene JSON mal formado; no se interpretó como texto heredado."); }
        if (!Array.isArray(parsed)) throw new Error("El formato JSON de VIN debe ser un array.");
        return normalizeVinCollectionArray_(parsed, "Colección VIN JSON");
    }
    const values = text.split(/[,/\\;]+/)
        .map(value => normalizeVinCollectionValue_(value, "Colección VIN heredada"))
        .filter(Boolean);
    if (values.length > 3) throw new Error("La colección VIN heredada supera el máximo de tres identificadores.");
    return normalizeVinCollectionArray_(values, "Colección VIN heredada");
}
function serializeVinCollection(vinArray) {
    const normalized = normalizeVinCollectionArray_(vinArray, "Serialización VIN");
    return normalized.some(Boolean) ? JSON.stringify(normalized) : "";
}
function parseVinCollectionForAdmin(rawVin) {
    return parseVinCollection(rawVin);
}

function addVinToAvailableSlot(existingCollection, vinPrefix, maxAllowed, requestedIndex) {
    const prefix = String(vinPrefix || "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(3, Math.floor(Number(maxAllowed) || 1)));
    const original = Array.isArray(existingCollection) ? existingCollection.map(value => String(value || "").trim().toUpperCase()) : [];
    if (!prefix) throw new Error("El prefijo VIN está vacío.");
    if (original.slice(limit).some(Boolean)) throw new Error("La colección VIN contiene identificadores fuera del máximo permitido para las versiones registradas.");
    const collection = original.slice(0, limit);
    const duplicateIndex = collection.findIndex(value => value === prefix);
    if (duplicateIndex >= 0) return { alreadyPresent: true, duplicateIndex, slotIndex: duplicateIndex, collection };
    let slotIndex = Number.isInteger(requestedIndex) ? requestedIndex : collection.findIndex(value => !value);
    if (slotIndex < 0) slotIndex = collection.length;
    if (slotIndex >= limit || slotIndex < 0) throw new Error("Este vehículo ya alcanzó el máximo de VIN permitido según sus versiones de equipamiento.");
    if (collection[slotIndex]) throw new Error("La versión de equipamiento seleccionada ya tiene un VIN registrado. No se sobrescribió el identificador existente.");
    while (collection.length <= slotIndex) collection.push("");
    collection[slotIndex] = prefix;
    return { alreadyPresent: false, duplicateIndex: -1, slotIndex, collection };
}

function extractVinPrefixForAdmin(vinRaw) {
    if (!vinRaw) return "";
    const cleaned = String(vinRaw).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.length > 5 ? cleaned.substring(0, cleaned.length - 5) : "";
}

function countEquipmentVersionsForAdmin(rawVersions) {
    if (!rawVersions) return 1;
    const versions = String(rawVersions).split(/[,/\\;]+/).map(value => value.trim()).filter(Boolean);
    return Math.max(1, Math.min(3, versions.length));
}

function findVinDuplicateForAdmin(sheet, vinPrefix, currentVehicleId) {
    if (!sheet || !vinPrefix || sheet.getLastRow() < 2) return null;
    const vinColumnIndex = getVinColumnIndex(sheet);
    if (!vinColumnIndex) throw new Error("La hoja «Cortes» no contiene el encabezado «VIN».");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const vehicleId = String(row[COLS_CORTES.id - 1] || "").trim();
        if (currentVehicleId && vehicleId === String(currentVehicleId)) continue;
        if (!parseVinCollectionForAdmin(row[vinColumnIndex - 1]).includes(vinPrefix)) continue;
        const brand = row[COLS_CORTES.marca - 1] || "";
        const model = row[COLS_CORTES.modelo - 1] || "";
        const fromYear = row[COLS_CORTES.anoDesde - 1] || "";
        const toYear = row[COLS_CORTES.anoHasta - 1] || "";
        return { vehicleId: vehicleId, modelName: (brand + " " + model + " (" + fromYear + (toYear ? "-" + toYear : "") + ")").trim() };
    }
    return null;
}

function prepareVinCollectionForAdmin(sheet, rowValues, vehicleId, vinColumnIndex, vinPrefix, versionsOverride) {
    if (!vinPrefix) return null;
    const existing = parseVinCollectionForAdmin(rowValues[vinColumnIndex - 1]);
    if (existing.includes(vinPrefix)) return null;
    const duplicate = findVinDuplicateForAdmin(sheet, vinPrefix, vehicleId);
    if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
    const maxAllowed = countEquipmentVersionsForAdmin(versionsOverride || rowValues[COLS_CORTES.versionesAplicables - 1]);
    const update = addVinToAvailableSlot(existing, vinPrefix, maxAllowed);
    return update.alreadyPresent ? null : update.collection;
}

/**
 * Comprueba y agrega al final de «Cortes» las columnas de activación del testigo.
 * Las columnas 44 y 45 se reservan; los campos de testigo se agregan a partir de la 46.
 */
function ensureTestigoColumns(sheet, lockAlreadyHeld = false) {
    if (!sheet) throw new Error('No se encontró la hoja «Cortes».');
    const lock = lockAlreadyHeld ? null : LockService.getScriptLock();
    let lockAcquired = false;
    try {
        if (lock) {
            lock.waitLock(30000);
            lockAcquired = true;
        }
        const targetColumns = [46, 47, 48]; // AT:AV es el contrato físico obligatorio.
        const headerNames = ["activaTestigo1", "activaTestigo2", "activaTestigo3"];
        const lastColumn = sheet.getLastColumn();
        if (lastColumn < 1) throw new Error('La hoja «Cortes» no contiene encabezados.');
        getVinColumnIndex(sheet); // Rechaza encabezados VIN duplicados antes de modificar AT:AV.

        const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
        headerNames.forEach((name, index) => {
            const matches = [];
            currentHeaders.forEach((value, column) => {
                if (String(value || "").trim().toLowerCase() === name.toLowerCase()) matches.push(column + 1);
            });
            if (matches.length > 1) {
                throw new Error("El encabezado " + name + " está duplicado en las columnas " + matches.join(", ") + ".");
            }
            if (matches.length === 1 && matches[0] !== targetColumns[index]) {
                throw new Error("El encabezado " + name + " está en la columna " + matches[0] +
                    "; el contrato requiere la columna " + targetColumns[index] + " (" +
                    ["AT", "AU", "AV"][index] + "). No se desplazaron datos.");
            }
        });

        const maxColumns = sheet.getMaxColumns();
        if (maxColumns < 48) sheet.insertColumnsAfter(maxColumns, 48 - maxColumns);

        const lastRow = sheet.getLastRow();
        const targetHeaders = sheet.getRange(1, 46, 1, 3).getValues()[0];
        for (let index = 0; index < headerNames.length; index++) {
            const current = String(targetHeaders[index] || "").trim();
            if (current && current.toLowerCase() !== headerNames[index].toLowerCase()) {
                throw new Error("La columna " + ["AT", "AU", "AV"][index] + " ya contiene el encabezado «" +
                    current + "»; no se sobrescribió.");
            }
            if (!current && lastRow > 1) {
                const values = sheet.getRange(2, targetColumns[index], lastRow - 1, 1).getValues();
                if (values.some(row => row[0] !== "" && row[0] !== null && row[0] !== undefined)) {
                    throw new Error("La columna " + ["AT", "AU", "AV"][index] +
                        " contiene datos sin encabezado; no se reasignó.");
                }
            }
        }

        for (let index = 0; index < headerNames.length; index++) {
            if (String(targetHeaders[index] || "").trim() !== headerNames[index]) {
                sheet.getRange(1, targetColumns[index]).setValue(headerNames[index]);
            }
            COLS_CORTES[headerNames[index]] = targetColumns[index];
        }
        return {
            activaTestigo1: 46,
            activaTestigo2: 47,
            activaTestigo3: 48
        };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}

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
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================
/* TAREA 1.1: RECUPERACIÓN DE LA COMUNICACIÓN CON EL MICROSERVICIO DE ADMINISTRACIÓN */
function doGet(e) {
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Admin',
            version: '2.6.0',
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Admin-SERVICE v2.6.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["backupDatabase","backupDrive","restoreDatabase","restoreDrive","reorganizeDatabase","normalizeImages","organizePrimaryVehicleImages","restoreAllTrashedImages","addLogo","updateVehicleField","uploadAdminImage","migrateCortesOperationIds","reconcilePendingImageUploads","addOrUpdateCut","addSupplementaryInfo","createSheet","addColumn","driveCommand","recoverReplacedImage","deleteReplacedImage","saveUnusedImagesInventory","createCortesImageFolder","moveReplacedImage","getReplacedImageDownloadUrl"].includes(action);
}

function doPost(e) {
    let request;
    try {
        request = JSON.parse(e && e.postData && e.postData.contents || "{}");
    } catch (error) {
        return doPostInternal_(e);
    }
    if (!request || typeof request !== "object") return doPostInternal_(e);
    const action = String(request.action || "");
    if (!isSharedMutationAction_(action)) return doPostInternal_(e);

    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    const nestedToken = String(payload.__sharedMutationToken || "").trim();
    try {
        return withSharedMutationLease_("ADMIN", action, function(token) {
            request.payload = Object.assign({}, payload, { __sharedMutationToken: token });
            const wrappedEvent = Object.assign({}, e || {}, {
                postData: Object.assign({}, e && e.postData || {}, { contents: JSON.stringify(request) })
            });
            return doPostInternal_(wrappedEvent);
        }, nestedToken ? { nestedToken: nestedToken } : undefined);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "La operación fue rechazada por el coordinador compartido."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

function doPostInternal_(e) {
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

        const developerContext = action === 'ping' ? null : (ADMIN_MODAL_EDIT_ACTIONS.has(action) ? assertModalEditSession(payload) : assertDeveloperSession(payload));

        logMessage("Inicio", `Iniciando acción administrativa: ${action}`);

        switch (action) {
            case 'ping':
                response = { status: 'success', message: 'pong' };
                break;
            case 'backupDatabase':
                response = handleBackupDatabase(payload, logMessage, developerContext);
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
                response = handleReorganizeDatabase(payload, logMessage, developerContext);
                break;
            case 'normalizeImages':
                response = handleNormalizeImages(payload, logMessage);
                break;
            case 'organizePrimaryVehicleImages':
                response = handleOrganizePrimaryVehicleImages(payload, logMessage);
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
            case 'getAdminImageUploadStatus':
                response = handleGetAdminImageUploadStatus(payload, logMessage);
                break;
            // Compatibilidad directa histórica; el mapa canónico dirige esta acción a WRITE.
            case 'checkOperation':
                response = handleCheckOperation(payload);
                break;
            case 'migrateCortesOperationIds':
                response = handleMigrateCortesOperationIds(payload, logMessage, developerContext);
                break;
            case 'reconcilePendingImageUploads':
                response = handleReconcilePendingImageUploads(payload, logMessage);
                break;
            // Compatibilidad directa histórica; requiere sesión Desarrollador en doPostInternal_.
            case 'addOrUpdateCut':
                response = handleAddOrUpdateCut(payload, logMessage, developerContext);
                break;
            // Compatibilidad directa histórica; requiere sesión Desarrollador en doPostInternal_.
            case 'addSupplementaryInfo':
                response = handleAddSupplementaryInfo(payload, logMessage);
                break;
            case 'createSheet':
                response = handleCreateSheet(payload, logMessage);
                break;
            case 'addColumn':
                response = handleAddColumn(payload, logMessage);
                break;
            case 'driveCommand':
                response = handleDriveCommand(payload, logMessage);
                break;
            case 'getReplacedImages':
                response = handleGetReplacedImages(payload, logMessage);
                break;
            case 'getDriveStorage':
                response = handleGetDriveStorage(payload, logMessage);
                break;
            case 'recoverReplacedImage':
                response = handleRecoverReplacedImage(payload, logMessage);
                break;
            case 'deleteReplacedImage':
                response = handleDeleteReplacedImage(payload, logMessage, developerContext);
                break;
            case 'auditDriveImagesInCortes':
                response = handleAuditDriveImagesInCortes(payload, logMessage);
                break;
            case 'saveUnusedImagesInventory':
                response = payload && payload.mode === "organize"
                    ? handleOrganizeUnusedImagesBatch(payload, logMessage, developerContext)
                    : handleSaveUnusedImagesInventory(payload, logMessage);
                break;
            case 'getCortesImageFolders':
                response = handleGetCortesImageFolders(payload, logMessage);
                break;
            case 'createCortesImageFolder':
                response = handleCreateCortesImageFolder(payload, logMessage, developerContext);
                break;
            case 'moveReplacedImage':
                response = handleMoveReplacedImage(payload, logMessage, developerContext);
                break;
            case 'getReplacedImageDownloadUrl':
                response = handleGetReplacedImageDownloadUrl(payload, logMessage, developerContext);
                break;
            default:
                throw new Error(`La acción administrativa '${action}' es desconocida o no está soportada.`);
        }

        const endTime = new Date();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        if (action === 'organizePrimaryVehicleImages' &&
            (response.status === 'warning' || Number(response.itemErrors) > 0)) {
            logMessage("Finalización", "Organización finalizada con advertencias. Duración total: " + durationSec + "s", 0, 0, true);
        } else {
            logMessage("Finalización", `Tarea completada con éxito. Duración total: ${durationSec}s`);
        }

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
            message: error.message,
            mensaje: error.message,
            tiempoTranscurrido: `${durationSec}s`,
            logs: logs
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
function handleBackupDatabase(payload, logMessage, developerContext) {
    logMessage("Respaldo", "Generando respaldo completo de la hoja de cálculo de la base de datos...");

    const ss = getSpreadsheet();
    const folder = DriveApp.getRootFolder();
    const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss");
    const backupName = `GPSpedia_DB_BACKUP_${timestamp}`;

    logMessage("Respaldo", `Copiando archivo Spreadsheet '${ss.getName()}' con el nombre '${backupName}'...`);
    const createdBackupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);
    const backupId = createdBackupFile.getId();
    const backupFile = DriveApp.getFileById(backupId);
    const backupUrl = backupFile.getUrl();

    if (backupFile.getId() !== backupId ||
        backupId === ss.getId() ||
        backupFile.isTrashed() ||
        backupFile.getName() !== backupName ||
        backupFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
        !isDirectChildOfDriveRoot(backupFile) ||
        !isBackupUrlForResource(backupUrl, `https://docs.google.com/spreadsheets/d/${backupId}`)) {
        throw new Error("El recurso creado no pudo verificarse como un respaldo de Spreadsheet válido.");
    }

    const verifiedSpreadsheet = SpreadsheetApp.openById(backupId);
    if (verifiedSpreadsheet.getId() !== backupId || !verifiedSpreadsheet.getSheetByName(SHEET_NAMES.CORTES)) {
        throw new Error("La Spreadsheet creada no coincide con el identificador del respaldo o no contiene la hoja Cortes.");
    }
    if (!developerContext || !developerContext.userId) throw new Error("No se pudo asociar el respaldo verificado con la sesión de desarrollador.");
    CacheService.getScriptCache().put(getVinMigrationBackupCacheKey(developerContext.userId), backupId, 21600);

    logMessage("Respaldo", `Recurso de respaldo de base de datos creado y verificado. ID: ${backupId}`);
    return {
        status: 'success',
        backupId: backupId,
        backupUrl: backupUrl,
        timestamp: timestamp,
        message: "Recurso de respaldo de base de datos creado y verificado correctamente."
    };
}

/**
 * 2. Respaldo de Drive (Estructura de carpetas y archivos de imágenes)
 */
function handleBackupDrive(payload, logMessage) {
    logMessage("Respaldo Drive", "Iniciando respaldo completo de la estructura de carpetas de Drive...");

    const rootFolder = getCortesRootFolder();
    const parentFolder = DriveApp.getRootFolder();
    const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss");
    const backupFolderName = `GPSpedia_Drive_BACKUP_${timestamp}`;

    logMessage("Respaldo Drive", `Creando carpeta contenedora de respaldo '${backupFolderName}' en la raíz...`);
    const createdBackupFolder = parentFolder.createFolder(backupFolderName);

    logMessage("Respaldo Drive", "Copiando de forma jerárquica las carpetas y archivos de imágenes...");
    copyFolderRecursively(rootFolder, createdBackupFolder, logMessage);

    const backupId = createdBackupFolder.getId();
    const backupFolder = DriveApp.getFolderById(backupId);
    const backupUrl = backupFolder.getUrl();
    if (backupFolder.getId() !== backupId ||
        backupId === DRIVE_FOLDER_ID ||
        backupFolder.isTrashed() ||
        backupFolder.getName() !== backupFolderName ||
        !isDirectChildOfDriveRoot(backupFolder) ||
        !isBackupUrlForResource(backupUrl, `https://drive.google.com/drive/folders/${backupId}`)) {
        throw new Error("La carpeta creada no pudo verificarse como un respaldo de Drive válido.");
    }

    logMessage("Respaldo Drive", `Carpeta de respaldo de Drive creada y recurso verificado. ID: ${backupId}`);
    return {
        status: 'success',
        backupId: backupId,
        backupUrl: backupUrl,
        timestamp: timestamp,
        message: "Carpeta de respaldo de Drive creada y recurso verificado correctamente."
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
    const backupId = extractDriveFileId(payload && payload.backupId);
    if (!backupId) throw new Error("ID o enlace de respaldo de Google Sheets no válido o no proporcionado.");
    if (backupId === SPREADSHEET_ID) throw new Error("El Spreadsheet productivo no puede utilizarse como origen de su propia restauración.");

    const backupFile = DriveApp.getFileById(backupId);
    if (backupFile.getId() !== backupId ||
        backupFile.isTrashed() ||
        backupFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
        !backupFile.getName().startsWith("GPSpedia_DB_BACKUP_") ||
        !isDirectChildOfDriveRoot(backupFile)) {
        throw new Error("El recurso indicado no es un respaldo de Spreadsheet válido dentro de la ubicación autorizada.");
    }

    logMessage("Restauración DB", `Respaldo de Spreadsheet validado. Iniciando restauración desde ID: ${backupId}`);

    const backupSS = SpreadsheetApp.openById(backupId);
    if (backupSS.getId() !== backupId || backupSS.getSheets().length === 0) {
        throw new Error("No se pudo verificar la identidad o el contenido de la Spreadsheet de respaldo.");
    }
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
    const backupId = extractBackupFolderId(payload && payload.backupId);
    if (!backupId) throw new Error("ID o enlace de carpeta de respaldo de Drive no válido o no proporcionado.");
    if (backupId === DRIVE_FOLDER_ID) throw new Error("La carpeta productiva no puede utilizarse como origen de su propia restauración.");

    const backupFolder = DriveApp.getFolderById(backupId);
    if (backupFolder.getId() !== backupId ||
        backupFolder.isTrashed() ||
        !backupFolder.getName().startsWith("GPSpedia_Drive_BACKUP_") ||
        !isDirectChildOfDriveRoot(backupFolder)) {
        throw new Error("La carpeta indicada no es un respaldo de Drive válido dentro de la ubicación autorizada.");
    }

    const targetFolder = getCortesRootFolder();
    if (backupFolder.getId() === targetFolder.getId()) {
        throw new Error("La carpeta de respaldo debe ser distinta de la carpeta productiva.");
    }

    logMessage("Restauración Drive", `Respaldo de Drive validado. Iniciando restauración desde ID: ${backupId}`);
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
function handleReorganizeDatabase(payload, logMessage, developerContext) {
    logMessage("Reorganización DB", "Ejecutando copia de seguridad preventiva antes de reorganizar...");
    const backupInfo = handleBackupDatabase(payload, logMessage, developerContext);
    logMessage("Reorganización DB", "Estabilizando los IDs de Cortes antes de cambiar el orden de las filas...");
    const idFreezeResult = requestCortesIdFreezeFromWriteService(payload, backupInfo.backupId, payload && payload.__sharedMutationToken);
    logMessage("Reorganización DB", `IDs estabilizados: ${idFreezeResult.formulasToFreeze || 0} fórmulas convertidas y ${idFreezeResult.emptyFormulaRowsToClear || 0} fórmulas vacías retiradas.`);

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
            imagesDuplicated: 0,
            foldersRenamed: 0,
            imagesSkippedConflicts: 0,
            nextIndex: startIndex,
            lote: lote,
            filaInicial: filaInicial,
            ultimaFilaProcesada: filaInicial - 1,
            estado: "completado"
        };
    }

    logMessage("Normalización Imágenes", `Iniciando normalización de Lote ${lote}: filas del ${filaInicial} al ${filaInicial + limit - 1}...`);
    let imagesRenamed = 0;
    let imagesDuplicated = 0;
    let imagesSkippedConflicts = 0;
    let foldersRenamed = 0;

    const imgFields = ['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen', 'imgCableAlimen2', 'imgCableAlimen3'];

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

        const vehicleInfo = mapRowToObject(row, COLS_CORTES);
        const rowHasImages = imgFields.some(field => String(row[COLS_CORTES[field] - 1] || "").trim());
        if (rowHasImages) {
            try {
                const folderResult = normalizeExistingVehicleFolderPath(vehicleInfo);
                foldersRenamed += folderResult.renamed;
                (folderResult.renamedItems || []).forEach(item =>
                    logMessage("Normalización Imágenes", `Carpeta '${item.from}' renombrada a '${item.to}' (ID ${item.id}).`));
                if (folderResult.warning) logMessage("Normalización Imágenes", `Fila ${rowNum}: ${folderResult.warning}`, 0, 0, true);
            } catch (folderError) {
                logMessage("Normalización Imágenes", `Fila ${rowNum}: no se pudo normalizar la ruta de carpetas; las imágenes se procesarán sin alterar esa ruta. Motivo: ${folderError.message}`, 0, 0, true);
            }
        }

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
                        if (!String(file.getMimeType() || "").toLowerCase().startsWith("image/")) {
                            logMessage("Normalización Imágenes", `Fila ${rowNum}: el recurso ID '${id}' no tiene MIME de imagen; se omitió.`, 0, 0, true);
                            return;
                        }
                        const newFilename = buildCanonicalImageFilename(vehicleInfo, field, file);

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

                        // Separar referencias compartidas solo cuando sus nombres canónicos sean distintos.
                        if (usages && usages.length > 1) {
                            const usageIndexForThisRow = usages.findIndex(u => u.rowNum === rowNum && u.field === field);
                            if (usageIndexForThisRow > 0 && file.getName() !== newFilename) {
                                const currentFolders = file.getParents();
                                const parentFolder = currentFolders.hasNext() ? currentFolders.next() : DriveApp.getRootFolder();
                                if (hasDriveFilenameConflictInParents(file, newFilename)) {
                                    imagesSkippedConflicts++;
                                    logMessage("Normalización Imágenes", `Fila ${rowNum}: ya existe otro archivo llamado '${newFilename}' en la carpeta; no se duplicó ni renombró.`, 0, 0, true);
                                    return;
                                }
                                fileToProcess = file.makeCopy(file.getName(), parentFolder);
                                if (hasDriveFilenameConflictInParents(fileToProcess, newFilename)) {
                                    fileToProcess.setTrashed(true);
                                    imagesSkippedConflicts++;
                                    logMessage("Normalización Imágenes", `Fila ${rowNum}: apareció un conflicto con '${newFilename}' durante la copia; se descartó la copia.`, 0, 0, true);
                                    return;
                                }
                                fileToProcess.setName(newFilename);
                                imgUrl = `https://drive.google.com/uc?export=view&id=${fileToProcess.getId()}`;
                                sheet.getRange(rowNum, colIndex + 1).setValue(imgUrl);
                                imagesDuplicated++;
                                imagesRenamed++;
                            }
                        }
                        if (fileToProcess.getName() !== newFilename) {
                            if (hasDriveFilenameConflictInParents(fileToProcess, newFilename)) {
                                imagesSkippedConflicts++;
                                logMessage("Normalización Imágenes", `Fila ${rowNum}: ya existe otro archivo llamado '${newFilename}' en la carpeta; se conservó el nombre actual.`, 0, 0, true);
                                return;
                            }
                            logMessage("Normalización Imágenes", `Fila ${rowNum}: renombrando '${fileToProcess.getName()}' a '${newFilename}'.`);
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

    logMessage("Normalización Imágenes", `Lote ${lote} finalizado. Filas del ${filaInicial} al ${ultimaFilaProcesada} procesadas. Imágenes renombradas: ${imagesRenamed}; copias independientes: ${imagesDuplicated}; carpetas renombradas: ${foldersRenamed}; conflictos omitidos: ${imagesSkippedConflicts}.`);

    return {
        status: 'success',
        processedCount: batchData.length,
        totalVehicles: totalVehicles,
        imagesRenamed: imagesRenamed,
        imagesDuplicated: imagesDuplicated,
        foldersRenamed: foldersRenamed,
        imagesSkippedConflicts: imagesSkippedConflicts,
        nextIndex: nextIndex,
        lote: lote,
        filaInicial: filaInicial,
        ultimaFilaProcesada: ultimaFilaProcesada,
        estado: estado
    };
}

function handleOrganizePrimaryVehicleImages(payload, logMessage) {
    currentStage = "Organización de imágenes principales";
    const options = payload || {};
    const limit = Math.max(1, Math.min(50, parseInt(options.limit, 10) || 10));
    const reset = options.reset === true;
    const processId = options.processId || ("P-" + Date.now());

    let startIndex = 0;
    let lote = 1;
    let filaInicial = 2;
    if (reset) {
        clearAdminState('organizePrimaryVehicleImages');
    } else {
        const savedState = getAdminState('organizePrimaryVehicleImages');
        if (savedState) {
            startIndex = savedState.lastIndex;
            lote = (savedState.lote || 0) + 1;
            filaInicial = savedState.ultimaFilaProcesada + 1;
        }
    }
    currentLote = lote;

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) throw new Error('No se encontró la hoja «Cortes».');
    const data = sheet.getDataRange().getValues();
    data.shift();
    const totalVehicles = data.length;

    if (startIndex >= totalVehicles) {
        clearAdminState('organizePrimaryVehicleImages');
        return {
            status: 'success', processedCount: 0, totalVehicles: totalVehicles,
            movedFiles: 0, skippedFiles: 0, itemErrors: 0, nextIndex: startIndex,
            lote: lote, filaInicial: filaInicial, ultimaFilaProcesada: filaInicial - 1,
            estado: 'completado'
        };
    }

    const referenceData = collectCortesImageReferences(true);
    if (referenceData.unverifiableReferenceCount > 0) {
        clearAdminState('organizePrimaryVehicleImages');
        const message = 'La organización se detuvo: existen ' + referenceData.unverifiableReferenceCount +
            ' referencias de Drive no verificables en los campos de imagen de Cortes. No se movió ningún archivo.';
        logMessage('Organización de imágenes principales', message, 0, totalVehicles, true);
        return {
            status: 'warning', message: message, processedCount: 0, totalVehicles: totalVehicles,
            movedFiles: 0, skippedFiles: 0, itemErrors: 0, nextIndex: startIndex,
            lote: lote, filaInicial: filaInicial, ultimaFilaProcesada: filaInicial - 1,
            estado: 'bloqueado'
        };
    }

    const batchData = data.slice(startIndex, startIndex + limit);
    let movedFiles = 0;
    let renamedFiles = 0;
    let foldersRenamed = 0;
    let skippedFiles = 0;
    let itemErrors = 0;

    batchData.forEach((row, index) => {
        const rowNumber = startIndex + index + 2;
        const vehicleInfo = mapRowToObject(row, COLS_CORTES);
        const imageUrl = String(vehicleInfo.imagenVehiculo || '').trim();
        if (!imageUrl) {
            skippedFiles++;
            return;
        }
        if (!extractDriveFileId(imageUrl)) {
            skippedFiles++;
            logMessage('Organización de imágenes principales', 'Fila ' + rowNumber + ': imagenVehiculo no contiene un ID de Drive reconocible; se omitió.', index + 1, batchData.length, true);
            return;
        }

        try {
            const result = movePrimaryVehicleImageToCanonicalFolder(
                sheet, rowNumber, vehicleInfo, referenceData, logMessage
            );
            if (result.moved) movedFiles++;
            if (result.renamed) renamedFiles++;
            foldersRenamed += result.foldersRenamed || 0;
            if (result.moved || result.renamed) {
                logMessage('Organización de imágenes principales', 'Fila ' + rowNumber + ': ' +
                    (result.moved ? 'imagen principal movida a la carpeta canónica; ' : '') +
                    (result.renamed ? 'nombre de imagen normalizado.' : 'nombre ya canónico.'),
                    index + 1, batchData.length);
            } else {
                skippedFiles++;
                if (result.warning) itemErrors++;
                if (result.reason) logMessage('Organización de imágenes principales', 'Fila ' + rowNumber + ': ' + result.reason, index + 1, batchData.length, Boolean(result.warning), Boolean(result.warning));
            }
        } catch (error) {
            itemErrors++;
            logMessage('Organización de imágenes principales', 'Fila ' + rowNumber + ': no se pudo organizar imagenVehiculo. Motivo: ' + error.message, index + 1, batchData.length, true, true);
        }
    });

    const nextIndex = startIndex + batchData.length;
    const ultimaFilaProcesada = nextIndex + 1;
    const percentage = totalVehicles > 0 ? Math.round((nextIndex / totalVehicles) * 100) : 100;
    const estado = nextIndex >= totalVehicles ? 'completado' : 'pendiente';
    if (nextIndex >= totalVehicles) {
        clearAdminState('organizePrimaryVehicleImages');
    } else {
        saveAdminState('organizePrimaryVehicleImages', nextIndex, totalVehicles, percentage, processId, lote, filaInicial, ultimaFilaProcesada, estado);
    }

    logMessage('Organización de imágenes principales',
        'Lote ' + lote + ' finalizado. Imágenes movidas: ' + movedFiles +
        '; renombradas: ' + renamedFiles + '; carpetas renombradas: ' + foldersRenamed + '; omitidas: ' + skippedFiles + '; errores: ' + itemErrors + '.',
        nextIndex, totalVehicles, itemErrors > 0, itemErrors > 0);

    return {
        status: 'success', processedCount: batchData.length, totalVehicles: totalVehicles,
        movedFiles: movedFiles, renamedFiles: renamedFiles, foldersRenamed: foldersRenamed, skippedFiles: skippedFiles, itemErrors: itemErrors,
        imagesRenamed: renamedFiles, nextIndex: nextIndex, lote: lote, filaInicial: filaInicial,
        ultimaFilaProcesada: ultimaFilaProcesada, estado: estado
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


function buildCanonicalImageBaseName(vehicleInfo, fieldName, extraSuffix) {
    const info = vehicleInfo || {};
    const suffixes = { imagenVehiculo: "", imgCorte1: "_corte1", imgCorte2: "_corte2", imgCorte3: "_corte3",
        imgApertura: "_apert", imgCableAlimen: "_alimen", imgCableAlimen2: "_alimen2", imgCableAlimen3: "_alimen3" };
    if (!Object.prototype.hasOwnProperty.call(suffixes, fieldName)) throw new Error("El campo de imagen no tiene una nomenclatura canónica definida.");
    const parts = [sanitizeForNomenclature(info.modelo), sanitizeForNomenclature(info.versionesAplicables),
        sanitizeForNomenclature(info.tipoEncendido), sanitizeForNomenclature(info.anoDesde || "XXXX")].filter(Boolean);
    if (!parts.length) throw new Error("No hay metadatos suficientes para construir el nombre canónico de la imagen.");
    return (parts.join("_") + suffixes[fieldName] + String(extraSuffix || "")).toLowerCase();
}
function getCanonicalImageExtension(file) {
    const name = String(file && file.getName ? file.getName() : "");
    const match = name.match(/(\.[A-Za-z0-9]{2,5})$/);
    if (match) return match[1];
    const mime = String(file && file.getMimeType ? file.getMimeType() : "").toLowerCase();
    const extensions = { "image/jpeg":".jpg", "image/jpg":".jpg", "image/pjpeg":".jpg",
        "image/png":".png", "image/x-png":".png", "image/gif":".gif", "image/webp":".webp",
        "image/svg+xml":".svg", "image/bmp":".bmp", "image/x-ms-bmp":".bmp", "image/tiff":".tiff",
        "image/heic":".heic", "image/heif":".heif", "image/avif":".avif",
        "image/x-icon":".ico", "image/vnd.microsoft.icon":".ico" };
    return extensions[mime] || "";
}
function buildCanonicalImageFilename(vehicleInfo, fieldName, file, extraSuffix) {
    const extension = getCanonicalImageExtension(file);
    if (!extension) throw new Error("No se pudo determinar una extensión compatible sin alterar el archivo original.");
    return buildCanonicalImageBaseName(vehicleInfo, fieldName, extraSuffix) + extension;
}
function hasDriveFilenameConflictInFolder(folder, filename, currentFileId) {
    const matches = folder.getFilesByName(filename);
    while (matches.hasNext()) if (String(matches.next().getId()) !== String(currentFileId || "")) return true;
    return false;
}
function hasDriveFilenameConflictInParents(file, filename) {
    const parents = file.getParents();
    while (parents.hasNext()) if (hasDriveFilenameConflictInFolder(parents.next(), filename, file.getId())) return true;
    return false;
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
    const rootFolder = getCortesRootFolder();
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
    const { vehicleId, fieldName, value } = payload || {};
    if (!vehicleId || !fieldName) throw new Error("Parámetros de edición de campo incompletos.");
    if (!isAdminModalEditField_(fieldName)) {
        throw new Error("El campo '" + fieldName + "' no forma parte de la edición del modal de detalle.");
    }
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const colIndex = fieldName === "vin" ? getVinColumnIndex(sheet) : COLS_CORTES[fieldName];
    if (!colIndex) throw new Error("El campo '" + fieldName + "' no existe en el esquema del catálogo.");

    logMessage("Edición In-Modal", `Actualizando campo '${fieldName}' para el vehículo ID: ${vehicleId}...`);
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id.toString() == vehicleId.toString());
    if (rowIndex === -1) {
        throw new Error(`No se encontró el vehículo con ID '${vehicleId}' en la base de datos.`);
    }

    const actualRow = rowIndex + 2;
    sheet.getRange(actualRow, colIndex).setValue(value !== undefined ? value : "");
    SpreadsheetApp.flush();

    let folderSyncWarning = false;
    const folderMetadataFields = new Set([
        "categoria", "marca", "modelo", "versionesAplicables", "tipoEncendido", "anoDesde", "anoHasta"
    ]);
    if (folderMetadataFields.has(fieldName)) {
        try {
            const updatedValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
            const syncResult = movePrimaryVehicleImageToCanonicalFolder(
                sheet, actualRow, mapRowToObject(updatedValues, COLS_CORTES), null, logMessage
            );
            folderSyncWarning = Boolean(syncResult && syncResult.warning);
            if (folderSyncWarning && syncResult.reason) {
                logMessage("Edición In-Modal", "El metadato se guardó, pero la imagen principal no se movió: " + syncResult.reason, 0, 0, true);
            }
        } catch (syncError) {
            folderSyncWarning = true;
            logMessage("Edición In-Modal", "El campo se guardó, pero no se pudo sincronizar la carpeta de imagenVehiculo: " + syncError.message, 0, 0, true, true);
        }
    }

    logMessage("Edición In-Modal", "Campo '" + fieldName + "' actualizado silenciosamente con éxito.");
    return {
        status: 'success',
        folderSyncWarning: folderSyncWarning,
        message: "El campo '" + fieldName + "' fue guardado silenciosamente en el registro de la fila " + actualRow + "."
    };
}

const ADMIN_IMAGE_UPLOAD_SHEET_NAME = "AdminImageUploads";
const ADMIN_IMAGE_UPLOAD_HEADERS = [
    "opId", "vehicleId", "fieldName", "urlAnterior", "urlNueva", "archivoDriveId",
    "contentHash", "tipoMime", "nombreArchivo", "estado", "fechaCreacion", "fechaActualizacion"
];

function getOrCreateAdminImageUploadsSheet() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(ADMIN_IMAGE_UPLOAD_SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(ADMIN_IMAGE_UPLOAD_SHEET_NAME);
    }
    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, ADMIN_IMAGE_UPLOAD_HEADERS.length)
            .setValues([ADMIN_IMAGE_UPLOAD_HEADERS])
            .setFontWeight("bold")
            .setBackground("#f0f4f8");
        sheet.setFrozenRows(1);
    }
    if (sheet.getLastColumn() < ADMIN_IMAGE_UPLOAD_HEADERS.length) {
        throw new Error("La hoja «AdminImageUploads» tiene una estructura incompleta; no se modificó.");
    }
    const headers = sheet.getRange(1, 1, 1, ADMIN_IMAGE_UPLOAD_HEADERS.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (ADMIN_IMAGE_UPLOAD_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("La estructura de «AdminImageUploads» no coincide con el esquema esperado; no se modificó.");
    }
    return sheet;
}

function findAdminImageUploadOperation(sheet, opId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    ids.forEach((value, index) => {
        if (String(value || "").trim() === opId) matches.push(index + 2);
    });
    if (matches.length > 1) {
        throw new Error("El opId ya aparece más de una vez en «AdminImageUploads»; se detuvo la operación por integridad.");
    }
    if (!matches.length) return null;
    const rowIndex = matches[0];
    return {
        rowIndex: rowIndex,
        values: sheet.getRange(rowIndex, 1, 1, ADMIN_IMAGE_UPLOAD_HEADERS.length).getValues()[0]
    };
}

function saveAdminImageUploadOperation(sheet, operation) {
    if (!operation || !Array.isArray(operation.values) ||
        operation.values.length !== ADMIN_IMAGE_UPLOAD_HEADERS.length) {
        throw new Error("No se pudo guardar el estado de la operación de imagen: estructura inválida.");
    }
    const rowIndex = operation.rowIndex || (sheet.getLastRow() + 1);
    sheet.getRange(rowIndex, 1, 1, ADMIN_IMAGE_UPLOAD_HEADERS.length).setValues([operation.values]);
    SpreadsheetApp.flush();
    const verified = sheet.getRange(rowIndex, 1, 1, ADMIN_IMAGE_UPLOAD_HEADERS.length).getValues()[0];
    ADMIN_IMAGE_UPLOAD_HEADERS.forEach((header, index) => {
        const actual = String(verified[index] === null || verified[index] === undefined ? "" : verified[index]);
        const expected = String(operation.values[index] === null || operation.values[index] === undefined ? "" : operation.values[index]);
        if (actual !== expected) {
            throw new Error("No se pudo verificar por lectura posterior el campo " + header + " del ledger AdminImageUploads, fila " + rowIndex + ".");
        }
    });
    operation.rowIndex = rowIndex;
    return operation;
}

function buildAdminImageUploadDescription(opId, contentHash, state) {
    return "GPSpediaAdminImageUpload|opId=" + opId +
        "|hash=" + contentHash + "|state=" + state;
}

function calculateAdminImageUploadHash(bytes) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
        .map(value => ("0" + ((value + 256) % 256).toString(16)).slice(-2))
        .join("");
}

function verifyAdminImageUploadFile(file, expectedMimeType, expectedHash) {
    if (!file || !String(file.getMimeType() || "").startsWith("image/") ||
        String(file.getMimeType()) !== String(expectedMimeType)) {
        throw new Error("El archivo Drive asociado al intento no coincide con el tipo MIME recibido.");
    }
    const bytes = file.getBlob().getBytes();
    if (!bytes || !bytes.length || calculateAdminImageUploadHash(bytes) !== expectedHash) {
        throw new Error("El archivo Drive asociado al opId no coincide con el contenido del intento original.");
    }
}

function findReplacedImageRecordById(sheet, replacementId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    ids.forEach((value, index) => {
        if (String(value || "").trim() === replacementId) matches.push(index + 2);
    });
    if (matches.length > 1) {
        throw new Error("El identificador del historial de imágenes está duplicado; no se agregó otro registro.");
    }
    if (!matches.length) return null;
    const rowIndex = matches[0];
    return { rowIndex: rowIndex, values: sheet.getRange(rowIndex, 1, 1, 11).getValues()[0] };
}

/**
 * Subir una imagen modificada a la subcarpeta del vehículo en Drive
 */
/**
 * Subir o recuperar de forma idempotente una imagen modificada desde el modal.
 * El ledger AdminImageUploads conserva el estado incluso cuando el campo no tenía URL anterior.
 */
function handleGetAdminImageUploadStatus(payload, logMessage) {
    const { vehicleId, fieldName, opId } = payload || {};
    const cleanVehicleId = String(vehicleId || "").trim();
    const cleanFieldName = String(fieldName || "").trim();
    const operationId = String(opId || "").trim();
    const imageFields = new Set([
        "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
        "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
    ]);
    if (!cleanVehicleId || !imageFields.has(cleanFieldName) ||
        !/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) {
        throw new Error("Parámetros inválidos para consultar el estado del reemplazo de imagen.");
    }

    const cutsSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cutsSheet || cutsSheet.getLastRow() < 2) throw new Error("No hay registros disponibles en la hoja Cortes.");
    const vehicleIds = cutsSheet.getRange(2, 1, cutsSheet.getLastRow() - 1, 1).getValues().flat();
    const vehicleRows = [];
    vehicleIds.forEach((id, index) => { if (String(id) === cleanVehicleId) vehicleRows.push(index + 2); });
    if (vehicleRows.length !== 1) throw new Error("El vehículo no existe o su identificador está duplicado.");
    const imageColumn = COLS_CORTES[cleanFieldName];
    const currentImageUrl = String(cutsSheet.getRange(vehicleRows[0], imageColumn).getValue() || "").trim();

    const ledger = getOrCreateAdminImageUploadsSheet();
    const operation = findAdminImageUploadOperation(ledger, operationId);
    if (!operation) {
        logMessage("Edición In-Modal", "No existe registro remoto para el intento " + operationId + ".");
        return { status: "success", operationStatus: "not_found", currentImageUrl: currentImageUrl, newImageUrl: "", fileIntegrity: "not_available" };
    }

    const values = operation.values;
    if (String(values[1] || "") !== cleanVehicleId || String(values[2] || "") !== cleanFieldName) {
        throw new Error("El identificador de operación no corresponde al vehículo y campo solicitados.");
    }
    const operationStatus = String(values[9] || "pending");
    if (!["pending", "linked", "cancelled", "requires_review"].includes(operationStatus)) {
        throw new Error("El ledger contiene un estado de reemplazo no reconocido.");
    }
    const newImageUrl = String(values[4] || "").trim();
    const fileId = String(values[5] || "").trim();
    const contentHash = String(values[6] || "").trim();
    const mimeType = String(values[7] || "").trim();
    let fileIntegrity = "not_available";
    if (newImageUrl || fileId) {
        fileIntegrity = "invalid";
        const urlFileId = extractDriveFileId(newImageUrl);
        if (fileId && urlFileId === fileId && contentHash && /^image\/[a-zA-Z0-9.+-]+$/i.test(mimeType)) {
            try {
                const file = DriveApp.getFileById(fileId);
                const description = String(file.getDescription() || "");
                const opMatch = description.match(/(?:^|\|)opId=([^|]*)/);
                const hashMatch = description.match(/(?:^|\|)hash=([^|]*)/);
                if (!file.isTrashed() && opMatch && opMatch[1] === operationId &&
                    hashMatch && hashMatch[1] === contentHash) {
                    verifyAdminImageUploadFile(file, mimeType, contentHash);
                    fileIntegrity = "valid";
                }
            } catch (error) {
                fileIntegrity = "invalid";
            }
        }
    }
    logMessage("Edición In-Modal", "Estado del reemplazo " + operationId + ": " + operationStatus + ".");
    return {
        status: "success",
        operationStatus: operationStatus,
        currentImageUrl: currentImageUrl,
        newImageUrl: newImageUrl,
        fileIntegrity: fileIntegrity
    };
}

function handleUploadAdminImage(payload, logMessage) {
    const { vehicleId, fileData, filename, mimeType, fieldName, opId } = payload || {};
    const imageFields = new Set([
        "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
        "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
    ]);
    const operationId = String(opId || "").trim();
    if (!vehicleId || typeof fileData !== "string" || !fileData || !filename ||
        !mimeType || !fieldName || !imageFields.has(fieldName) ||
        !/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) {
        throw new Error("Parámetros incompletos o identificador de operación inválido para reemplazar la imagen.");
    }

    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);
    } catch (e) {
        throw new Error("No se pudo bloquear la operación de reemplazo. Intenta nuevamente.");
    }

    let newFile = null;
    let fileCreatedThisAttempt = false;
    let historyRecord = null;
    let operationSheet = null;
    let operationRecord = null;
    let originalUrl = "";
    let activeCell = null;
    let newImageUrl = "";
    let previousNewImageUrl = "";
    let operationConflict = false;

    try {
        logMessage("Edición In-Modal", "Procesando el intento " + operationId + " para el campo '" + fieldName + "' del vehículo ID: " + vehicleId + "...");

        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if (!sheet || sheet.getLastRow() < 2) throw new Error("No hay registros disponibles en la hoja Cortes.");
        const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => String(id) === String(vehicleId));
        if (rowIndex === -1) throw new Error("Vehículo ID '" + vehicleId + "' no encontrado.");

        const actualRow = rowIndex + 2;
        const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
        const colIndex = COLS_CORTES[fieldName];
        if (!colIndex) throw new Error("El campo '" + fieldName + "' no tiene una columna válida en Cortes.");
        activeCell = sheet.getRange(actualRow, colIndex);

        let cleanBase64 = fileData;
        let actualMimeType = mimeType;
        if (fileData.indexOf(",") !== -1) {
            const parts = fileData.split(",");
            if (parts.length < 2 || !parts[1]) throw new Error("Los datos Base64 de la imagen tienen un formato inválido.");
            const mimeMatch = parts[0].match(/:(.*?);/);
            if (mimeMatch) actualMimeType = mimeMatch[1];
            cleanBase64 = parts.slice(1).join(",");
        }
        if (!/^image\/[a-zA-Z0-9.+-]+$/i.test(String(actualMimeType))) {
            throw new Error("El archivo seleccionado no tiene un tipo MIME de imagen válido.");
        }

        const decodedData = Utilities.base64Decode(cleanBase64);
        if (!decodedData || !decodedData.length) throw new Error("La imagen recibida está vacía.");
        const contentHash = calculateAdminImageUploadHash(decodedData);
        const extension = getCanonicalImageExtension({ getName: () => filename, getMimeType: () => actualMimeType });
        if (!extension) throw new Error("No se pudo determinar la extensión original de la imagen a partir del nombre o MIME.");
        const newFilename = buildCanonicalImageBaseName(mapRowToObject(rowValues, COLS_CORTES), fieldName) + extension;
        const temporaryFilename = "__GPSpediaAdminUpload_" + operationId + extension;

        const currentUrl = String(activeCell.getValue() || "").trim();
        if (currentUrl && !extractDriveFileId(currentUrl)) {
            throw new Error("La URL de la imagen activa no contiene un ID de Drive reconocible; se conserva la referencia actual.");
        }

        operationSheet = getOrCreateAdminImageUploadsSheet();
        operationRecord = findAdminImageUploadOperation(operationSheet, operationId);

        if (!operationRecord) {
            originalUrl = currentUrl;
            const timestamp = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
            operationRecord = {
                rowIndex: operationSheet.getLastRow() + 1,
                values: [
                    operationId, String(vehicleId), fieldName, originalUrl, "", "",
                    contentHash, actualMimeType, String(filename), "pending", timestamp, timestamp
                ]
            };
            saveAdminImageUploadOperation(operationSheet, operationRecord);
        } else {
            const values = operationRecord.values;
            if (String(values[1]) !== String(vehicleId) ||
                String(values[2]) !== String(fieldName) ||
                String(values[6]) !== contentHash ||
                String(values[7]) !== actualMimeType ||
                String(values[8]) !== String(filename)) {
                throw new Error("El opId ya está asociado a otro vehículo, campo o contenido. No se modificó la imagen.");
            }
            originalUrl = String(values[3] || "").trim();
            newImageUrl = String(values[4] || "").trim();
            previousNewImageUrl = newImageUrl;
            if (originalUrl && !extractDriveFileId(originalUrl)) {
                throw new Error("El intento guardado contiene una URL anterior inválida; requiere revisión.");
            }
            if (newImageUrl && !extractDriveFileId(newImageUrl)) {
                throw new Error("El intento guardado contiene una URL nueva inválida; requiere revisión.");
            }
            if (values[5] && newImageUrl && String(values[5]) !== extractDriveFileId(newImageUrl)) {
                throw new Error("El ledger contiene un ID de Drive y una URL nueva que no coinciden.");
            }

            const status = String(values[9] || "pending");
            if (!["pending", "linked", "cancelled", "requires_review"].includes(status)) {
                throw new Error("El estado guardado del intento no es compatible; requiere revisión.");
            }
            if (status === "linked") {
                if (!newImageUrl) throw new Error("La operación figura vinculada, pero no contiene una URL nueva verificable.");
                const latestLinkedUrl = String(activeCell.getValue() || "").trim();
                if (latestLinkedUrl === newImageUrl) {
                    const linkedFileId = String(values[5] || extractDriveFileId(newImageUrl) || "");
                    if (!linkedFileId) throw new Error("La operación figura vinculada, pero no contiene un ID de archivo verificable.");
                    newFile = DriveApp.getFileById(linkedFileId);
                    if (newFile.isTrashed()) newFile.setTrashed(false);
                    verifyAdminImageUploadFile(newFile, actualMimeType, contentHash);
                    if (originalUrl) {
                        historyRecord = recordReplacedImage({
                            tipoContenido: "vehiculo", registroId: vehicleId, campo: fieldName,
                            imagenAnteriorUrl: originalUrl, sustituidaPorUrl: newImageUrl,
                            nombreVehiculo: String(rowValues[COLS_CORTES.marca - 1] || "") + " " +
                                String(rowValues[COLS_CORTES.modelo - 1] || "") + " (" +
                                String(rowValues[COLS_CORTES.anoDesde - 1] || "") + ")",
                            operationId: operationId
                        });
                    }
                    newFile.setDescription(buildAdminImageUploadDescription(operationId, contentHash, "linked"));
                    return {
                        status: "success", imageUrl: newImageUrl, currentImageUrl: latestLinkedUrl,
                        message: "El reemplazo ya estaba completado; se recuperó la confirmación."
                    };
                }
                return {
                    status: "success", imageUrl: newImageUrl, currentImageUrl: latestLinkedUrl, superseded: true,
                    message: "El intento ya se había completado, pero el campo fue actualizado posteriormente."
                };
            }

            if (currentUrl !== originalUrl && currentUrl !== newImageUrl) {
                operationConflict = true;
                throw new Error("El campo de imagen cambió desde que se inició este intento. No se sobrescribió la referencia más reciente.");
            }
        }

        const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);
        const genFolder = findOrCreateVehicleFolder(vehicleInfo);
        const operationStatus = String(operationRecord.values[9] || "pending");
        const storedFileId = String(operationRecord.values[5] || "").trim();

        if (storedFileId) {
            try {
                newFile = DriveApp.getFileById(storedFileId);
            } catch (fileLookupError) {
                newFile = null;
            }
        }

        if (!newFile) {
            const namedFiles = genFolder.getFilesByName(temporaryFilename);
            let foundFile = null;
            while (namedFiles.hasNext()) {
                const candidate = namedFiles.next();
                if (foundFile) throw new Error("Se encontraron varios archivos temporales para el mismo opId; se detuvo la recuperación.");
                foundFile = candidate;
            }
            if (foundFile) {
                newFile = foundFile;
            } else {
                const blob = Utilities.newBlob(decodedData, actualMimeType, temporaryFilename);
                newFile = genFolder.createFile(blob);
                fileCreatedThisAttempt = true;
            }
        }

        if (newFile.isTrashed()) {
            if (["pending", "cancelled", "requires_review"].includes(operationStatus) || currentUrl === newImageUrl) {
                newFile.setTrashed(false);
            } else {
                throw new Error("El archivo de esta operación está en la papelera y no se puede reactivar automáticamente.");
            }
        }
        verifyAdminImageUploadFile(newFile, actualMimeType, contentHash);

        const description = String(newFile.getDescription() || "");
        if (description.startsWith("GPSpediaAdminImageUpload|")) {
            const opMatch = description.match(/(?:^|\|)opId=([^|]*)/);
            const hashMatch = description.match(/(?:^|\|)hash=([^|]*)/);
            if (!opMatch || opMatch[1] !== operationId || !hashMatch || hashMatch[1] !== contentHash) {
                throw new Error("El archivo Drive encontrado contiene metadatos de otra operación.");
            }
        }
        newFile.setDescription(buildAdminImageUploadDescription(operationId, contentHash, "pending"));
        newImageUrl = "https://drive.google.com/uc?export=view&id=" + newFile.getId();

        operationRecord.values[4] = newImageUrl;
        operationRecord.values[5] = newFile.getId();
        operationRecord.values[9] = "pending";
        operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
        saveAdminImageUploadOperation(operationSheet, operationRecord);

        const latestActiveUrl = String(activeCell.getValue() || "").trim();
        if (latestActiveUrl !== originalUrl &&
            latestActiveUrl !== newImageUrl &&
            latestActiveUrl !== previousNewImageUrl) {
            operationConflict = true;
            throw new Error("La referencia de imagen cambió durante el reemplazo. No se sobrescribió el valor actual.");
        }

        if (originalUrl) {
            const vehicleName = String(rowValues[COLS_CORTES.marca - 1] || "") + " " +
                String(rowValues[COLS_CORTES.modelo - 1] || "") + " (" +
                String(rowValues[COLS_CORTES.anoDesde - 1] || "") + ")";
            historyRecord = recordReplacedImage({
                tipoContenido: "vehiculo", registroId: vehicleId, campo: fieldName,
                imagenAnteriorUrl: originalUrl, sustituidaPorUrl: newImageUrl,
                nombreVehiculo: vehicleName, operationId: operationId
            });
        }

        if (latestActiveUrl !== newImageUrl) {
            activeCell.setValue(newImageUrl);
            SpreadsheetApp.flush();
        }
        if (String(activeCell.getValue() || "").trim() !== newImageUrl) {
            throw new Error("No se pudo verificar la nueva URL en Cortes después de SpreadsheetApp.flush().");
        }

        if (newFile.getName() !== newFilename) newFile.setName(newFilename);
        newFile.setDescription(buildAdminImageUploadDescription(operationId, contentHash, "linked"));

        operationRecord.values[9] = "linked";
        operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
        saveAdminImageUploadOperation(operationSheet, operationRecord);

        logMessage("Edición In-Modal", "Imagen vinculada y operación " + operationId + " confirmada para el campo '" + fieldName + "'.");
        return {
            status: "success", imageUrl: newImageUrl, currentImageUrl: newImageUrl,
            message: "La imagen del campo '" + fieldName + "' se actualizó en Drive y Sheets."
        };
    } catch (error) {
        let rollbackMessage = "";
        let rollbackFailed = false;

        if (activeCell && newImageUrl) {
            try {
                const currentValue = String(activeCell.getValue() || "").trim();
                if ((currentValue === newImageUrl || currentValue === previousNewImageUrl) &&
                    currentValue !== originalUrl) {
                    activeCell.setValue(originalUrl);
                    SpreadsheetApp.flush();
                } else if (currentValue !== originalUrl &&
                    currentValue !== newImageUrl &&
                    currentValue !== previousNewImageUrl) {
                    operationConflict = true;
                    rollbackMessage += " La referencia activa cambió por otra operación y se conservó sin sobrescribir.";
                }
            } catch (cellError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo confirmar la reversión de la referencia activa: " + cellError.message + ".";
            }
        }

        if (newFile && fileCreatedThisAttempt) {
            try { newFile.setTrashed(true); }
            catch (fileError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo enviar el archivo nuevo a papelera: " + fileError.message + ".";
            }
        }

        if (operationSheet && operationRecord) {
            try {
                operationRecord.values[9] = rollbackFailed || operationConflict ? "requires_review" : "cancelled";
                operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                saveAdminImageUploadOperation(operationSheet, operationRecord);
            } catch (ledgerError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo actualizar el ledger de la operación: " + ledgerError.message + ".";
            }
        }

        if (historyRecord) {
            try {
                const historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
                if (historySheet) {
                    historySheet.getRange(historyRecord.rowIndex, 11)
                        .setValue(rollbackFailed || operationConflict ? "requiere_revision" : "cancelada");
                    SpreadsheetApp.flush();
                }
            } catch (historyError) {
                rollbackMessage += " No se pudo actualizar el estado del registro histórico: " + historyError.message + ".";
            }
        } else if (operationRecord && originalUrl) {
            try {
                const historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
                if (historySheet) {
                    const existingHistory = findReplacedImageRecordById(historySheet, "REP-" + operationId);
                    if (existingHistory) {
                        historySheet.getRange(existingHistory.rowIndex, 11)
                            .setValue(rollbackFailed || operationConflict ? "requiere_revision" : "cancelada");
                        SpreadsheetApp.flush();
                    }
                }
            } catch (historyError) {
                rollbackMessage += " No se pudo reconciliar el registro histórico existente: " + historyError.message + ".";
            }
        }

        logMessage("Edición In-Modal", "Reemplazo " + operationId + " no confirmado. Motivo: " + error.message + rollbackMessage, 0, 0, true, true);
        throw new Error("No se completó el reemplazo; se intentó conservar la referencia anterior. " + error.message + rollbackMessage);
    } finally {
        lock.releaseLock();
    }
}

// ============================================================================
// MICROSERVICIO REGISTRO DE CORTES (Silencioso y Administrativo)
// ============================================================================

function fingerprintValue_(value) {
    return value === null || value === undefined ? "" : String(value);
}
function buildCutOperationFingerprintPayload_(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const vehicle = data.vehicleData && typeof data.vehicleData === "object" ? data.vehicleData : null;
    const cut = data.cutData && typeof data.cutData === "object" ? data.cutData : {};
    const vehicleId = data.vehicleId === null || data.vehicleId === undefined || data.vehicleId === ""
        ? null : String(data.vehicleId).trim();
    return JSON.stringify([
        "addOrUpdateCut:v1", vehicleId,
        vehicle ? [
            fingerprintValue_(vehicle.categoria), fingerprintValue_(vehicle.marca),
            fingerprintValue_(vehicle.modelo), fingerprintValue_(vehicle.versionesAplicables),
            fingerprintValue_(vehicle.anoDesde), fingerprintValue_(vehicle.anoHasta),
            fingerprintValue_(vehicle.tipoEncendido), fingerprintValue_(vehicle.imagenVehiculo)
        ] : null,
        [
            fingerprintValue_(cut.tipoCorte1), fingerprintValue_(cut.configRelay1),
            fingerprintValue_(cut.ubicacionCorte1), fingerprintValue_(cut.colorCableCorte1),
            cut.activaTestigo1 === true, fingerprintValue_(cut.imgCorte1), fingerprintValue_(cut.vin)
        ],
        data.silent === true
    ]);
}
function computeCutOperationFingerprint_(payload) {
    const canonical = buildCutOperationFingerprintPayload_(payload);
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8);
    return digest.map(byte => ((Number(byte) + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function handleAddOrUpdateCut(payload, logMessage, developerContext) {
    const lock = LockService.getScriptLock();
    try {
        // Intentar obtener el bloqueo por un máximo de 30 segundos
        lock.waitLock(30000);
    } catch (e) {
        throw new Error("No se pudo obtener el bloqueo de la hoja de cálculo. Por favor reintente en unos instantes.");
    }

    try {
        const { vehicleData, cutData, vehicleId } = payload || {};
        if (!cutData) {
            throw new Error("Los datos del corte son requeridos.");
        }
        const colaboradorName = String(developerContext && developerContext.fullName || "").trim();
        if (!colaboradorName) {
            throw new Error("El perfil del usuario autenticado no tiene un nombre completo registrado.");
        }

        logMessage("Registro Administrativo", `Procesando addOrUpdateCut administrativo...`);
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        ensureTestigoColumns(sheet, true);
        const vinColumnIndex = getVinColumnIndex(sheet);
        const vinPrefix = cutData.vin ? extractVinPrefixForAdmin(cutData.vin) : "";
        if (cutData.vin && !vinColumnIndex) {
            throw new Error("La hoja «Cortes» no contiene el encabezado «VIN»; no se puede guardar el identificador sin alterar otras columnas.");
        }

        let opId = payload.opId || null;
        // Compatibilidad con operaciones antiguas: solo se extrae el opId del campo heredado.
        // El nombre de colaborador enviado por el cliente nunca se utiliza como identidad.
        if (!opId && typeof payload.colaborador === 'string') {
            const opMatch = payload.colaborador.match(/\[(OP-[a-zA-Z0-9_-]+)\]/);
            if (opMatch) opId = opMatch[1];
        }
        const operationHash = opId ? computeCutOperationFingerprint_(payload) : null;
        if (opId && normalizeIdempotenciaOperationHash_(payload.operationHash, "Solicitud addOrUpdateCut ADMIN") !== operationHash) {
            throw new Error("La huella enviada no coincide con el contenido de la operación.");
        }

        if (opId) {
            const match = findRowByOpId(sheet, opId);
            if (match) {
                if (!match.operationHash || match.operationHash !== operationHash) {
                    throw new Error("El opId ya existe, pero su contenido no coincide o pertenece a un registro legado sin huella verificable.");
                }
                const storedVehicleId = normalizeIdempotenciaVehicleId_(match.vehicleId || match.rowValues[COLS_CORTES.id - 1], "Reintento addOrUpdateCut ADMIN");
                if (vehicleId && storedVehicleId !== normalizeIdempotenciaVehicleId_(vehicleId, "Reintento addOrUpdateCut ADMIN")) {
                    throw new Error("El opId ya está vinculado a otro vehículo; no se modificó.");
                }
                const rowIndex = match.rowIndex;
                const rowValues = match.rowValues;
                const rowObj = mapRowToObject(rowValues, COLS_CORTES);
                const recoveredVinCollection = vinPrefix
                    ? prepareVinCollectionForAdmin(sheet, rowValues, rowObj.id, vinColumnIndex, vinPrefix, vehicleData && vehicleData.versionesAplicables)
                    : null;
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
                        const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
const filename = buildCanonicalImageBaseName(rowObj, "imagenVehiculo", "_repaired");
                        const newUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imagenVehiculo"));
                        sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(newUrl);
                    }
                }

                // 2. Check and repair cut image if it was registered but is invalid/corrupted/trashed
                if (cutData && cutData.imgCorte1 && cutData.tipoCorte1 !== 'No recomendado') {
                    const currentCorteImg = rowObj[`imgCorte${slotIndex}`];
                    if (!checkFileIdValid(currentCorteImg)) {
                        const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
const filename = buildCanonicalImageBaseName(rowObj, "imgCorte" + slotIndex, "_repaired");
                        const newCorteImgUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imgCorte" + slotIndex));
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
                    const testigoKey = `activaTestigo${slotIndex}`;
                    if ((rowObj[testigoKey] === "" || rowObj[testigoKey] === null || rowObj[testigoKey] === undefined) && typeof cutData.activaTestigo1 === "boolean") {
                        sheet.getRange(rowIndex, COLS_CORTES[testigoKey]).setValue(cutData.activaTestigo1);
                    }
                    if (!rowObj[`colaboradorCorte${slotIndex}`] && colaboradorName) {
                        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${slotIndex}`]).setValue(colaboradorName || "");
                    }
                }

                if (recoveredVinCollection) {
                    sheet.getRange(rowIndex, vinColumnIndex).setValue(serializeVinCollection(recoveredVinCollection));
                }
                if (match.timestamp && (match.status === "pending" || !rowObj.timestamp)) {
                    sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(match.timestamp);
                }
                SpreadsheetApp.flush();
                markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).getValue());
                markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + slotIndex]).getValue());
                if (opId && rowObj.id) {
                    recordOpId(opId, rowObj.id, slotIndex, match.timestamp || rowObj.timestamp, "completed", operationHash);
                }
                return {
                    status: 'success',
                    message: 'La operación ya fue completada (recuperada, reparada y completada).',
                    vehicleId: rowObj.id,
                    timestamp: match.timestamp || rowObj.timestamp,
                    operationHash: operationHash
                };
            }
        }

        if (vinPrefix && !vehicleId) {
            const duplicate = findVinDuplicateForAdmin(sheet, vinPrefix, null);
            if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
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
        const preparedVinCollection = vinPrefix
            ? prepareVinCollectionForAdmin(sheet, rowValues, vehicleId, vinColumnIndex, vinPrefix, vehicleData && vehicleData.versionesAplicables)
            : null;

        let cutSlotIndex = -1;
        for (let i = 1; i <= 3; i++) {
            if (!rowValues[COLS_CORTES[`tipoCorte${i}`] - 1]) {
                cutSlotIndex = i;
                break;
            }
        }
        if (cutSlotIndex === -1) throw new Error("No hay espacios disponibles para más cortes.");

        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "pending", operationHash);

        let imageUrl = '';
        if (cutData.imgCorte1) {
            const folder = findOrCreateVehicleFolder(vehicleInfo);
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCorte" + cutSlotIndex);
            imageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, vehicleId, "imgCorte" + cutSlotIndex));
        }

        sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${cutSlotIndex}`]).setValue(cutData.tipoCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`ubicacionCorte${cutSlotIndex}`]).setValue(cutData.ubicacionCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`colorCableCorte${cutSlotIndex}`]).setValue(cutData.colorCableCorte1);
        sheet.getRange(rowIndex, COLS_CORTES[`configRelay${cutSlotIndex}`]).setValue(cutData.configRelay1);
        sheet.getRange(rowIndex, COLS_CORTES[`activaTestigo${cutSlotIndex}`]).setValue(cutData.activaTestigo1 === true);
        sheet.getRange(rowIndex, COLS_CORTES[`imgCorte${cutSlotIndex}`]).setValue(imageUrl);
        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${cutSlotIndex}`]).setValue(colaboradorName);
        if (preparedVinCollection) {
            sheet.getRange(rowIndex, vinColumnIndex).setValue(serializeVinCollection(preparedVinCollection));
        }
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);
        SpreadsheetApp.flush();
        markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + cutSlotIndex]).getValue());
        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "completed", operationHash);

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

        // Copiar la plantilla de formato/validación y retirar la fórmula heredada de ID.
        const previousRowRange = sheet.getRange(lastRow, 1, 1, lastColumn);
        const newRowRange = sheet.getRange(rowIndex, 1, 1, lastColumn);
        previousRowRange.copyTo(newRowRange);

        const dataRange = sheet.getRange(rowIndex, 2, 1, lastColumn - 1);
        dataRange.clearContent();
        sheet.getRange(rowIndex, COLS_CORTES.id).clearContent();
        SpreadsheetApp.flush();

        // ADMIN solicita el ID al asignador central de WRITE; nunca genera uno localmente.
        try {
            newId = requestNextVehicleIdFromWriteService(payload, payload && payload.__sharedMutationToken);
            sheet.getRange(rowIndex, COLS_CORTES.id).setValue(newId);
            SpreadsheetApp.flush();
            if (Number(sheet.getRange(rowIndex, COLS_CORTES.id).getValue()) !== newId) {
                throw new Error("La celda ID no conservó el valor asignado por WRITE.");
            }
        } catch (allocationError) {
            removeEmptyPendingCutRow(sheet, rowIndex, lastColumn);
            throw new Error("No se pudo asignar un ID centralizado al nuevo vehículo: " + allocationError.message);
        }
        if (opId) {
            try {
                recordOpId(opId, newId, 1, formattedDate, "pending", operationHash);
            } catch (error) {
                try {
                    const persistedOperation = findRowByOpId(sheet, opId);
                    if (!persistedOperation || persistedOperation.rowIndex !== rowIndex) removeEmptyPendingCutRow(sheet, rowIndex, lastColumn);
                } catch (verificationError) {
                    Logger.log("No se pudo determinar si la reserva de opId quedó persistida: " + verificationError.message);
                }
                throw error;
            }
        }
        if (vinPrefix) {
            sheet.getRange(rowIndex, vinColumnIndex).setValue(serializeVinCollection([vinPrefix]));
        }


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
        const folder = findOrCreateVehicleFolder(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }));
        let vehiculoImageUrl = '';
        if (vehicleData.imagenVehiculo) {
const filename = buildCanonicalImageBaseName(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }), "imagenVehiculo");
            vehiculoImageUrl = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, newId, "imagenVehiculo"));
        }
        let corteImageUrl = '';
        if (cutData.imgCorte1) {
const filename = buildCanonicalImageBaseName(Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta }), "imgCorte1");
            corteImageUrl = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, newId, "imgCorte1"));
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
        sheet.getRange(rowIndex, COLS_CORTES.activaTestigo1).setValue(cutData.activaTestigo1 === true);
        sheet.getRange(rowIndex, COLS_CORTES.imgCorte1).setValue(corteImageUrl);
        sheet.getRange(rowIndex, COLS_CORTES.colaboradorCorte1).setValue(colaboradorName);
        SpreadsheetApp.flush();
        markImageUploadLinked(vehiculoImageUrl);
        markImageUploadLinked(corteImageUrl);
        if (opId) recordOpId(opId, newId, 1, formattedDate, "completed", operationHash);
    }

    logMessage("Registro Administrativo", `Corte administrativo guardado exitosamente. ID asignado: ${newId}`);
    return { status: 'success', message: `Corte administrativo agregado de forma silenciosa.`, vehicleId: newId, timestamp: formattedDate, operationHash: operationHash };
    } finally {
        lock.releaseLock();
    }
}

function handleAddSupplementaryInfo(payload, logMessage) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo bloquear el registro de información suplementaria administrativa. Intente nuevamente."); }
    try { return handleAddSupplementaryInfoLocked(payload, logMessage); }
    finally { lock.releaseLock(); }
}

function handleAddSupplementaryInfoLocked(payload, logMessage) {
    const { vehicleId, apertura, imgApertura, cableAlimen, imgCableAlimen, cableAlimen2, imgCableAlimen2, cableAlimen3, imgCableAlimen3, notaImportante, timestamp } = payload;
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

    const folder = findOrCreateVehicleFolder(vehicleInfo);

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
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgApertura");
            const imageUrl = uploadImageToDrive(imgApertura, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgApertura"));
            sheet.getRange(actualRow, COLS_CORTES.imgApertura).setValue(imageUrl);
        }
    }
    if (imgCableAlimen) {
        const currentAlimenImg = rowValues[COLS_CORTES.imgCableAlimen - 1];
        if (!checkFileIdValid(currentAlimenImg)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen");
            const imageUrl = uploadImageToDrive(imgCableAlimen, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen).setValue(imageUrl);
        }
    }
    if (imgCableAlimen2) {
        const currentAlimenImg2 = rowValues[COLS_CORTES.imgCableAlimen2 - 1];
        if (!checkFileIdValid(currentAlimenImg2)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen2");
            const imageUrl = uploadImageToDrive(imgCableAlimen2, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen2"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen2).setValue(imageUrl);
        }
    }
    if (imgCableAlimen3) {
        const currentAlimenImg3 = rowValues[COLS_CORTES.imgCableAlimen3 - 1];
        if (!checkFileIdValid(currentAlimenImg3)) {
const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCableAlimen3");
            const imageUrl = uploadImageToDrive(imgCableAlimen3, filename, folder, buildImageUploadOperationKey(payload.opId, vehicleId, "imgCableAlimen3"));
            sheet.getRange(actualRow, COLS_CORTES.imgCableAlimen3).setValue(imageUrl);
        }
    }

    // Forzar timestamp administrativo (hace 365 días) o el recibido en la carga (solo si está vacío)
    const currentTimestamp = rowValues[COLS_CORTES.timestamp - 1];
    if (!currentTimestamp) {
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 365);
        const formattedDate = timestamp || Utilities.formatDate(targetDate, "GMT-6", "dd/MM/yyyy");
        sheet.getRange(actualRow, COLS_CORTES.timestamp).setValue(formattedDate);
    }

    SpreadsheetApp.flush();
    [COLS_CORTES.imgApertura, COLS_CORTES.imgCableAlimen, COLS_CORTES.imgCableAlimen2, COLS_CORTES.imgCableAlimen3]
        .forEach(column => markImageUploadLinked(sheet.getRange(actualRow, column).getValue()));
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
            // Columnas: 9 (imagenVehiculo), 16 (imgCorte1), 23 (imgCorte2), 30 (imgCorte3), 34 (imgApertura), 36 (imgCableAlimen), 40 (imgCableAlimen2), 42 (imgCableAlimen3)
            // En base 0: 8, 15, 22, 29, 33, 35, 39, 41
            colIndices = [8, 15, 22, 29, 33, 35, 39, 41];
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

function getFolderCanonicalName(name) {
    return String(name || '').normalize('NFD').replace(/\p{M}/gu, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findOrCreateSubFolder(parentFolder, desiredName) {
    if (!parentFolder) throw new Error('No se proporcionó la carpeta padre.');
    const name = sanitizeForFolderDisplay(desiredName);
    const canonical = getFolderCanonicalName(name);
    if (!canonical) throw new Error('El nombre de carpeta no es válido.');

    const matches = [];
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
        const folder = folders.next();
        if (getFolderCanonicalName(folder.getName()) === canonical) matches.push(folder);
    }

    const exactMatches = matches.filter(folder => folder.getName() === name);
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1 || matches.length > 1) {
        throw new Error('Existen varias carpetas equivalentes a «' + name + '»; no se fusionaron ni modificaron.');
    }
    if (matches.length === 1) {
        matches[0].setName(name);
        return matches[0];
    }

    try {
        return parentFolder.createFolder(name);
    } catch (error) {
        const retryMatches = [];
        const retryFolders = parentFolder.getFolders();
        while (retryFolders.hasNext()) {
            const folder = retryFolders.next();
            if (getFolderCanonicalName(folder.getName()) === canonical) retryMatches.push(folder);
        }
        if (retryMatches.length === 1) return retryMatches[0];
        throw error;
    }
}

function mergeVehicleFolderInfo(existingInfo, incomingInfo) {
    const merged = Object.assign({}, existingInfo || {});
    const incoming = incomingInfo || {};
    ['categoria', 'marca', 'modelo', 'versionesAplicables', 'tipoEncendido', 'anoDesde', 'anoHasta'].forEach(key => {
        const current = String(merged[key] === null || merged[key] === undefined ? '' : merged[key]).trim();
        const next = String(incoming[key] === null || incoming[key] === undefined ? '' : incoming[key]).trim();
        if (!current && next) merged[key] = incoming[key];
    });
    return merged;
}

function getVehicleYearFolderName(vehicleInfo) {
    const info = vehicleInfo || {};
    const rawDesde = String(info.anoDesde === null || info.anoDesde === undefined ? '' : info.anoDesde).trim();
    const rawHasta = String(info.anoHasta === null || info.anoHasta === undefined ? '' : info.anoHasta).trim();
    const inlineRange = rawDesde.match(/^(\\d{4})\\s*[-–]\\s*(\\d{4})$/);
    let desde = inlineRange ? parseInt(inlineRange[1], 10) : parseInt(rawDesde, 10);
    let hasta = inlineRange ? parseInt(inlineRange[2], 10) : parseInt(rawHasta, 10);
    if (!Number.isFinite(desde)) return 'Sin_Año';
    if (!Number.isFinite(hasta)) hasta = desde;
    const start = Math.min(desde, hasta);
    const end = Math.max(desde, hasta);
    return start === end ? String(start) : String(start) + '_' + String(end);
}

function findOrCreateVehicleFolder(vehicleInfo) {
    const info = vehicleInfo || {};
    const rootFolder = getCortesRootFolder();
    const category = sanitizeForFolderDisplay(info.categoria || 'Sin_Categoria');
    const brand = sanitizeForFolderDisplay(info.marca || 'Sin_Marca');
    const model = sanitizeForFolderDisplay(info.modelo || 'Sin_Modelo');
    const versionOrIgnition = sanitizeForFolderDisplay(
        String(info.versionesAplicables || '').trim() || String(info.tipoEncendido || '').trim() || 'Sin_Tipo_de_Encendido'
    );
    const yearRange = sanitizeForFolderDisplay(getVehicleYearFolderName(info));

    const categoryFolder = findOrCreateSubFolder(rootFolder, category);
    const brandFolder = findOrCreateSubFolder(categoryFolder, brand);
    const modelFolder = findOrCreateSubFolder(brandFolder, model);
    const versionFolder = findOrCreateSubFolder(modelFolder, versionOrIgnition);
    return findOrCreateSubFolder(versionFolder, yearRange);
}


function normalizeExistingVehicleFolderPath(vehicleInfo) {
    const info = vehicleInfo || {};
    const root = getCortesRootFolder();
    const expected = [
        sanitizeForFolderDisplay(info.categoria || "Sin_Categoria"),
        sanitizeForFolderDisplay(info.marca || "Sin_Marca"),
        sanitizeForFolderDisplay(info.modelo || "Sin_Modelo"),
        sanitizeForFolderDisplay(String(info.versionesAplicables || "").trim() || String(info.tipoEncendido || "").trim() || "Sin_Tipo_de_Encendido"),
        sanitizeForFolderDisplay(getVehicleYearFolderName(info))
    ];
    let parent = root, renamed = 0;
    const renamedItems = [];
    for (const expectedName of expected) {
        const canonical = getFolderCanonicalName(expectedName);
        if (!canonical) return { renamed: renamed, warning: "segmento esperado sin nombre canónico." };
        const matches = [], iterator = parent.getFolders();
        while (iterator.hasNext()) {
            const folder = iterator.next();
            if (getFolderCanonicalName(folder.getName()) === canonical) matches.push(folder);
        }
        if (matches.length !== 1) return { renamed: renamed, renamedItems: renamedItems, warning: matches.length > 1
            ? "hay varias carpetas equivalentes a «" + expectedName + "»; no se eligió ni fusionó ninguna."
            : "no existe una coincidencia inequívoca para «" + expectedName + "»; no se creó ninguna carpeta." };
        const folder = matches[0];
        if (folder.getName() !== expectedName) {
            const previousName = folder.getName();
            try {
                folder.setName(expectedName);
                renamed++;
                renamedItems.push({ id: folder.getId(), from: previousName, to: expectedName });
            } catch (renameError) {
                return { renamed: renamed, renamedItems: renamedItems, warning: "no se pudo renombrar «" + previousName + "» a «" + expectedName + "»: " + renameError.message };
            }
        }
        parent = folder;
    }
    return { renamed: renamed, renamedItems: renamedItems, warning: "" };
}


// Compatibilidad para consumidores heredados que solo proporcionen un año.
function getOrCreateFolder(categoria, marca, modelo, anio) {
    return findOrCreateVehicleFolder({
        categoria: categoria, marca: marca, modelo: modelo,
        anoDesde: anio, anoHasta: anio
    });
}

function movePrimaryVehicleImageToCanonicalFolder(sheet, rowNumber, vehicleInfo, referenceData, logMessage) {
    const imageId = extractDriveFileId(vehicleInfo && vehicleInfo.imagenVehiculo);
    if (!imageId) return { skipped: true, reason: 'No hay una URL de imagenVehiculo verificable.' };
    const references = referenceData || collectCortesImageReferences(true);
    if (references.unverifiableReferenceCount > 0) {
        const message = 'Existen enlaces de imagen de Cortes no verificables; se omitió el movimiento para proteger referencias compartidas.';
        if (logMessage) logMessage('Organización imagen principal', message, 0, 0, true);
        return { skipped: true, warning: true, reason: message };
    }
    const locations = references.references.get(imageId) || [];
    if (!locations.length) return { skipped: true, warning: true, reason: 'No se pudo confirmar la referencia activa de imagenVehiculo.' };
    if (locations.some(location => location.field !== 'imagenVehiculo')) return { skipped: true, warning: true, reason: 'La imagen también está referenciada por un campo de corte, apertura o alimentación.' };
    const primaryLocations = locations.filter(location => location.field === 'imagenVehiculo').sort((a, b) => a.row - b.row);
    if (primaryLocations.length && primaryLocations[0].row !== rowNumber) return { skipped: true, reason: 'La imagen principal pertenece al primer registro que la utiliza (fila ' + primaryLocations[0].row + ').' };
    const file = DriveApp.getFileById(imageId);
    if (file.isTrashed()) return { skipped: true, warning: true, reason: 'La imagen principal está en la papelera de Drive.' };
    if (!String(file.getMimeType() || '').toLowerCase().startsWith('image/')) return { skipped: true, warning: true, reason: 'El archivo referenciado por imagenVehiculo no tiene MIME de imagen.' };
    const folderNormalization = normalizeExistingVehicleFolderPath(vehicleInfo);
    const foldersRenamed = folderNormalization.renamed || 0;
    (folderNormalization.renamedItems || []).forEach(item => {
        if (logMessage) logMessage("Carpetas de Cortes", `Carpeta '${item.from}' renombrada a '${item.to}' (ID ${item.id}).`);
    });
    const target = findOrCreateVehicleFolder(vehicleInfo);
    const canonicalName = buildCanonicalImageFilename(vehicleInfo, "imagenVehiculo", file);
    if (hasDriveFilenameConflictInFolder(target, canonicalName, imageId)) return { skipped: true, warning: true, foldersRenamed: foldersRenamed, reason: 'Ya existe otro archivo con el nombre canónico «' + canonicalName + '» en la carpeta destino; no se movió ni renombró la imagen.' };
    const parents = file.getParents();
    let source = null, parentCount = 0, alreadyInTarget = false;
    while (parents.hasNext()) {
        const parent = parents.next(); parentCount++;
        if (!source) source = parent;
        if (parent.getId() === target.getId()) alreadyInTarget = true;
    }
    if (!alreadyInTarget && parentCount > 1) return { skipped: true, warning: true, foldersRenamed: foldersRenamed, reason: 'La imagen tiene varios padres en Drive; se omitió el movimiento para no alterar otras ubicaciones.' };
    if (!source && parentCount === 0) source = DriveApp.getRootFolder();
    const originalName = file.getName();
    let moved = false, renamed = false;
    try {
        if (!alreadyInTarget) { file.moveTo(target); moved = true; }
        if (file.getName() !== canonicalName) { file.setName(canonicalName); renamed = true; }
    } catch (error) {
        let rollback = "";
        if (moved && source) { try { file.moveTo(source); } catch (e) { rollback += " No se pudo restaurar la ubicación anterior: " + e.message; } }
        if (renamed) { try { file.setName(originalName); } catch (e) { rollback += " No se pudo restaurar el nombre anterior: " + e.message; } }
        throw new Error(error.message + rollback);
    }
    if (logMessage && (moved || renamed)) logMessage('Organización imagen principal',
        'Imagen principal del vehículo ID ' + vehicleInfo.id + ': ' +
        (moved ? 'movida a la carpeta canónica; ' : '') +
        (renamed ? 'renombrada a ' + canonicalName : 'nombre ya canónico') + '.', 0, 0);
    return { moved: moved, renamed: renamed, foldersRenamed: foldersRenamed, skipped: !moved && !renamed };
}
const IMAGE_UPLOAD_LEDGER_SHEET_NAME = "ImageUploadLedger";
const IMAGE_UPLOAD_LEDGER_HEADERS = [
    "token", "operationKey", "folderId", "mimeType", "sizeBytes", "contentHash",
    "fileId", "fileUrl", "state", "referenceSheet", "referenceRow", "referenceColumns",
    "referencesJson", "fileName", "createdAt", "updatedAt", "lastError"
];
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

function getOrCreateImageUploadLedgerSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(IMAGE_UPLOAD_LEDGER_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(IMAGE_UPLOAD_LEDGER_SHEET_NAME);

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        const headerRange = sheet.getRange(1, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length);
        headerRange.setValues([IMAGE_UPLOAD_LEDGER_HEADERS]);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#f0f4f8");
        sheet.setFrozenRows(1);
        SpreadsheetApp.flush();
    }

    if (sheet.getLastColumn() < IMAGE_UPLOAD_LEDGER_HEADERS.length) {
        throw new Error("La hoja ImageUploadLedger tiene una estructura incompleta; no se creó ningún archivo Drive.");
    }
    const headers = sheet.getRange(1, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (IMAGE_UPLOAD_LEDGER_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error("La estructura de ImageUploadLedger no coincide con el contrato esperado; no se creó ningún archivo Drive.");
    }
    const tokenValues = sheet.getLastRow() > 1
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat()
        : [];
    const seenTokens = new Set();
    tokenValues.forEach(value => {
        const token = String(value || "").trim();
        if (!token) return;
        if (seenTokens.has(token)) {
            throw new Error("ImageUploadLedger contiene tokens duplicados; no se continuará con cargas ni reconciliaciones.");
        }
        seenTokens.add(token);
    });
    return sheet;
}

function findImageUploadLedgerRecord_(sheet, token) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const tokens = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    tokens.forEach((value, index) => {
        if (String(value || "").trim() === token) matches.push(index + 2);
    });
    if (matches.length > 1) {
        throw new Error("El token de carga aparece duplicado en ImageUploadLedger; se detuvo la operación por integridad.");
    }
    if (!matches.length) return null;
    return {
        rowIndex: matches[0],
        values: sheet.getRange(matches[0], 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0]
    };
}

function findImageUploadLedgerOperationKey_(sheet, operationKey) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
    const matches = [];
    values.forEach((value, index) => {
        if (String(value || "").trim() === operationKey) matches.push(index + 2);
    });
    return matches.map(rowIndex => ({
        rowIndex: rowIndex,
        values: sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0]
    }));
}

function saveImageUploadLedgerRecord_(sheet, record) {
    if (!record || !Array.isArray(record.values) ||
        record.values.length !== IMAGE_UPLOAD_LEDGER_HEADERS.length) {
        throw new Error("No se pudo guardar ImageUploadLedger: estructura de registro inválida.");
    }
    const rowIndex = record.rowIndex || sheet.getLastRow() + 1;
    sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).setValues([record.values]);
    SpreadsheetApp.flush();

    const verified = sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues()[0];
    IMAGE_UPLOAD_LEDGER_HEADERS.forEach((header, index) => {
        if (String(verified[index] === null || verified[index] === undefined ? "" : verified[index]) !==
            String(record.values[index] === null || record.values[index] === undefined ? "" : record.values[index])) {
            throw new Error("No se pudo verificar la persistencia del registro de ImageUploadLedger en la fila " + rowIndex + ".");
        }
    });
    record.rowIndex = rowIndex;
    return record;
}

function calculateImageUploadContentHash_(bytes) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
        .map(value => ("0" + ((value + 256) % 256).toString(16)).slice(-2))
        .join("");
}

function buildImageUploadOperationKey(opId, vehicleId, fieldName) {
    const operationId = String(opId || "").trim() || "legacy";
    return operationId + "|" + String(vehicleId || "").trim() + "|" + String(fieldName || "").trim();
}

function buildImageUploadToken(operationKey, blob, folder, mimeType) {
    const prefix = Utilities.newBlob(String(operationKey || "") + "|" + folder.getId() + "|" + mimeType + "|").getBytes();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prefix.concat(blob.getBytes()));
    return digest.slice(0, 16).map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function parseImageUploadDescription_(description) {
    const raw = String(description || "");
    if (!raw.startsWith("GPSpediaImageUpload|")) return null;
    const metadata = {};
    raw.split("|").slice(1).forEach(part => {
        const separator = part.indexOf("=");
        if (separator < 1) return;
        const key = part.slice(0, separator);
        const value = part.slice(separator + 1);
        try { metadata[key] = decodeURIComponent(value); }
        catch (error) { metadata[key] = value; }
    });
    return metadata;
}

function buildImageUploadDescription_(record, state, referencesJson) {
    return "GPSpediaImageUpload|v=2" +
        "|operationKey=" + encodeURIComponent(String(record.operationKey || "")) +
        "|token=" + String(record.token || "") +
        "|folderId=" + String(record.folderId || "") +
        "|mimeType=" + encodeURIComponent(String(record.mimeType || "")) +
        "|sizeBytes=" + String(record.sizeBytes || "") +
        "|contentHash=" + String(record.contentHash || "") +
        "|state=" + String(state || "pending") +
        "|name=" + encodeURIComponent(String(record.fileName || "")) +
        "|references=" + encodeURIComponent(String(referencesJson || "[]"));
}

function getImageUploadFileId_(value) {
    const text = String(value || "");
    const match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/) || text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
}

function verifyImageUploadFile_(file, folder, expected) {
    if (!file || file.isTrashed()) throw new Error("El archivo asociado a la carga no existe o está en la papelera.");
    const actualMime = String(file.getMimeType() || "").trim().toLowerCase();
    if (actualMime !== String(expected.mimeType || "").trim().toLowerCase()) {
        throw new Error("El archivo Drive recuperado no coincide con el MIME esperado.");
    }
    const bytes = file.getBlob().getBytes();
    if (!bytes || !bytes.length || Number(file.getSize()) !== Number(expected.sizeBytes)) {
        throw new Error("El tamaño del archivo Drive recuperado no coincide con el payload.");
    }
    const contentHash = calculateImageUploadContentHash_(bytes);
    if (contentHash !== String(expected.contentHash || "")) {
        throw new Error("El contenido del archivo Drive recuperado no coincide con el hash del payload.");
    }
    const parents = file.getParents();
    let inExpectedFolder = false;
    while (parents.hasNext()) {
        if (String(parents.next().getId()) === String(expected.folderId || folder && folder.getId())) {
            inExpectedFolder = true;
        }
    }
    if (!inExpectedFolder) throw new Error("El archivo Drive recuperado no pertenece a la carpeta esperada.");

    const expectedToken = buildImageUploadToken(expected.operationKey, file.getBlob(), folder, expected.mimeType);
    if (expectedToken !== String(expected.token || "")) {
        throw new Error("El token de operación no coincide con el contenido, la carpeta y el MIME recuperados.");
    }

    const metadata = parseImageUploadDescription_(file.getDescription());
    if (metadata) {
        if (metadata.token && metadata.token !== expected.token) throw new Error("El archivo contiene un token de otra operación.");
        if (metadata.operationKey && metadata.operationKey !== expected.operationKey) throw new Error("El archivo contiene otra operación.");
        if (metadata.folderId && metadata.folderId !== expected.folderId) throw new Error("El archivo contiene otra carpeta de destino.");
        if (metadata.mimeType && metadata.mimeType !== expected.mimeType) throw new Error("El archivo contiene otro MIME.");
        if (metadata.sizeBytes && Number(metadata.sizeBytes) !== Number(expected.sizeBytes)) throw new Error("El archivo contiene otro tamaño declarado.");
        if (metadata.contentHash && metadata.contentHash !== expected.contentHash) throw new Error("El archivo contiene otro hash declarado.");
    }
    return true;
}

function findExistingImageUpload(folder, temporaryFilename, expected, token) {
    const matches = [];
    const byName = folder.getFilesByName(temporaryFilename);
    while (byName.hasNext()) matches.push(byName.next());
    const files = folder.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        const metadata = parseImageUploadDescription_(file.getDescription());
        if (metadata && metadata.token === token) matches.push(file);
    }

    const unique = new Map();
    matches.forEach(file => unique.set(file.getId(), file));
    if (unique.size > 1) {
        throw new Error("Se encontraron varios archivos para la misma operación de imagen; no se creó ni reutilizó ninguno.");
    }
    if (!unique.size) return null;

    const file = Array.from(unique.values())[0];
    verifyImageUploadFile_(file, folder, expected);
    return file;
}

function getImageUploadReferences_(fileId) {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const fields = [
        ["imagenVehiculo", COLS_CORTES.imagenVehiculo],
        ["imgCorte1", COLS_CORTES.imgCorte1],
        ["imgCorte2", COLS_CORTES.imgCorte2],
        ["imgCorte3", COLS_CORTES.imgCorte3],
        ["imgApertura", COLS_CORTES.imgApertura],
        ["imgCableAlimen", COLS_CORTES.imgCableAlimen],
        ["imgCableAlimen2", COLS_CORTES.imgCableAlimen2],
        ["imgCableAlimen3", COLS_CORTES.imgCableAlimen3]
    ].filter(item => Number(item[1]) > 0);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const references = [];
    rows.forEach((row, offset) => {
        fields.forEach(field => {
            if (getImageUploadFileId_(row[field[1] - 1]) === fileId) {
                references.push({
                    sheet: SHEET_NAMES.CORTES,
                    row: offset + 2,
                    field: field[0],
                    column: field[1],
                    url: String(row[field[1] - 1] || "")
                });
            }
        });
    });
    return references;
}

function markImageUploadLinked(imageUrl) {
    const fileId = getImageUploadFileId_(imageUrl);
    if (!fileId) return false;
    try {
        const file = DriveApp.getFileById(fileId);
        const metadata = parseImageUploadDescription_(file.getDescription());
        if (!metadata || metadata.v !== "2" || !metadata.token || !metadata.operationKey ||
            !metadata.folderId || !metadata.mimeType || !metadata.contentHash || !metadata.sizeBytes) {
            return false;
        }

        const expected = {
            token: String(metadata.token),
            operationKey: String(metadata.operationKey),
            folderId: String(metadata.folderId),
            mimeType: String(metadata.mimeType),
            sizeBytes: Number(metadata.sizeBytes),
            contentHash: String(metadata.contentHash)
        };
        const folder = DriveApp.getFolderById(expected.folderId);
        verifyImageUploadFile_(file, folder, expected);

        const ledgerSheet = getOrCreateImageUploadLedgerSheet_();
        let record = findImageUploadLedgerRecord_(ledgerSheet, expected.token);
        if (!record) {
            const timestamp = new Date().toISOString();
            record = saveImageUploadLedgerRecord_(ledgerSheet, {
                rowIndex: 0,
                values: [
                    expected.token, expected.operationKey, expected.folderId, expected.mimeType,
                    expected.sizeBytes, expected.contentHash, fileId,
                    "https://drive.google.com/uc?export=view&id=" + fileId, "pending",
                    "", "", "", "[]", metadata.name || file.getName(), timestamp, timestamp,
                    "Registro reconstruido desde metadatos Drive v2."
                ]
            });
        }

        const values = record.values;
        if (String(values[6] || "").trim() && String(values[6]).trim() !== fileId) {
            throw new Error("El token de carga ya está asociado a otro fileId en ImageUploadLedger.");
        }
        if (String(values[1]) !== expected.operationKey || String(values[2]) !== expected.folderId ||
            String(values[3]) !== expected.mimeType || Number(values[4]) !== expected.sizeBytes ||
            String(values[5]) !== expected.contentHash) {
            throw new Error("Los metadatos Drive no coinciden con ImageUploadLedger.");
        }

        const references = getImageUploadReferences_(fileId);
        if (!references.length) return false;

        values[6] = fileId;
        values[7] = "https://drive.google.com/uc?export=view&id=" + fileId;
        values[8] = "linked";
        values[9] = SHEET_NAMES.CORTES;
        values[10] = references[0].row;
        values[11] = references.map(item => item.field).join(",");
        values[12] = JSON.stringify(references);
        values[14] = values[14] || new Date().toISOString();
        values[15] = new Date().toISOString();
        values[16] = "";
        saveImageUploadLedgerRecord_(ledgerSheet, record);

        try {
            const originalName = String(values[13] || "");
            if (originalName && file.getName() !== originalName) file.setName(originalName);
            const linkedDescription = buildImageUploadDescription_({ ...expected, fileName: String(values[13] || "") }, "linked", JSON.stringify(references));
            file.setDescription(linkedDescription);
            if (String(file.getDescription() || "") !== linkedDescription) {
                Logger.log("ImageUploadLedger quedó linked, pero Drive no confirmó la descripción final para " + fileId + ".");
            }
        } catch (descriptionError) {
            Logger.log("ImageUploadLedger quedó linked; no se pudo actualizar la descripción Drive: " + descriptionError.message);
        }
        return true;
    } catch (error) {
        Logger.log("No se pudo reconciliar la carga de imagen " + fileId + ": " + error.message);
        return false;
    }
}

function uploadImageToDrive(imageData, filename, folder, operationKey) {
    if (!imageData) return "";
    if (!folder || typeof folder.getId !== "function") throw new Error("No se encontró una carpeta válida para guardar la imagen.");

    let blob;
    let mimeType = "";
    if (/^https?:\/\//i.test(String(imageData))) {
        const response = UrlFetchApp.fetch(String(imageData), { muteHttpExceptions: true });
        const responseCode = response.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) throw new Error("No se pudo descargar la imagen de origen. HTTP " + responseCode + ".");
        blob = response.getBlob();
        mimeType = String(blob.getContentType() || "").split(";")[0].trim().toLowerCase();
    } else if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
        const parts = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i);
        if (!parts) throw new Error("Los datos Base64 de la imagen tienen un formato inválido.");
        mimeType = String(parts[1] || "").toLowerCase();
        const decodedData = Utilities.base64Decode(parts[2]);
        if (!decodedData || !decodedData.length) throw new Error("La imagen recibida está vacía.");
        blob = Utilities.newBlob(decodedData, mimeType);
    } else {
        throw new Error("El formato de imagen recibido no es compatible.");
    }

    const bytes = blob.getBytes();
    if (!bytes || !bytes.length) throw new Error("La imagen recibida está vacía.");
    if (!mimeType.startsWith("image/")) throw new Error("El MIME recibido no corresponde a una imagen.");
    if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) {
        throw new Error("La imagen supera el límite de 10 MB por archivo.");
    }

    const contentHash = calculateImageUploadContentHash_(bytes);
    let stableOperationKey = String(operationKey || "").trim();
    if (!stableOperationKey) stableOperationKey = "legacy|" + folder.getId() + "|" + String(filename || "") + "|" + contentHash;
    else if (stableOperationKey.startsWith("legacy|")) stableOperationKey += "|" + contentHash;

    const extension = getExtensionFromMimeType(mimeType);
    const originalFilename = String(filename || "imagen") + extension;
    const token = buildImageUploadToken(stableOperationKey, blob, folder, mimeType);
    const temporaryFilename = "__GPSpediaUpload_" + token + extension;
    const expected = {
        token: token, operationKey: stableOperationKey, folderId: String(folder.getId()),
        mimeType: mimeType, sizeBytes: bytes.length, contentHash: contentHash
    };

    // La reserva durable se confirma antes de crear o reutilizar un archivo Drive.
    const ledgerSheet = getOrCreateImageUploadLedgerSheet_();
    let record = findImageUploadLedgerRecord_(ledgerSheet, token);
    if (record) {
        const old = record.values;
        if (String(old[1]) !== expected.operationKey || String(old[2]) !== expected.folderId ||
            String(old[3]) !== expected.mimeType || Number(old[4]) !== expected.sizeBytes ||
            String(old[5]) !== expected.contentHash) {
            throw new Error("El token ya está registrado con otra operación, carpeta, MIME, tamaño o contenido.");
        }
        if (String(old[8]) === "requires_review") {
            throw new Error("La carga tiene estado requires_review; no se reutilizó el archivo.");
        }
    } else {
        if (!stableOperationKey.startsWith("legacy|")) {
            const previousOperations = findImageUploadLedgerOperationKey_(ledgerSheet, stableOperationKey);
            if (previousOperations.some(item => String(item.values[0]) !== token)) {
                throw new Error("El opId/campo ya está asociado a otro contenido; no se creó un segundo archivo.");
            }
        }
        const timestamp = new Date().toISOString();
        record = {
            rowIndex: 0,
            values: [
                token, stableOperationKey, expected.folderId, mimeType, bytes.length, contentHash,
                "", "", "pending", "", "", "", "[]", originalFilename, timestamp, timestamp, ""
            ]
        };
        saveImageUploadLedgerRecord_(ledgerSheet, record);
    }

    let file = null;
    if (String(record.values[6] || "").trim()) {
        try {
            file = DriveApp.getFileById(String(record.values[6]).trim());
        } catch (lookupError) {
            file = null;
        }
        if (!file) {
            file = findExistingImageUpload(folder, temporaryFilename, expected, token);
            if (!file) {
                record.values[8] = "file_missing";
                record.values[16] = "El ID registrado no está disponible y no se encontró el token en la carpeta.";
                record.values[15] = new Date().toISOString();
                saveImageUploadLedgerRecord_(ledgerSheet, record);
                throw new Error("El archivo de esta operación no está disponible; se conservó el registro para reconciliación.");
            }
        } else {
            verifyImageUploadFile_(file, folder, expected);
        }
    } else {
        file = findExistingImageUpload(folder, temporaryFilename, expected, token);
    }

    if (!file) {
        blob.setName(temporaryFilename);
        file = folder.createFile(blob);
    }
    verifyImageUploadFile_(file, folder, expected);

    const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
    const finalState = String(record.values[8]) === "linked" ? "linked" : "pending";
    const existingReferences = String(record.values[12] || "[]");
    const description = buildImageUploadDescription_({
        operationKey: stableOperationKey, token: token, folderId: expected.folderId,
        mimeType: mimeType, sizeBytes: bytes.length, contentHash: contentHash,
        fileName: originalFilename
    }, finalState, existingReferences);
    file.setDescription(description);
    if (String(file.getDescription() || "") !== description) {
        throw new Error("Drive no confirmó por lectura posterior los metadatos de la carga; el registro pending se conservó.");
    }

    record.values[6] = file.getId();
    record.values[7] = url;
    if (String(record.values[8]) !== "linked") record.values[8] = "pending";
    record.values[13] = originalFilename;
    record.values[15] = new Date().toISOString();
    record.values[16] = "";
    saveImageUploadLedgerRecord_(ledgerSheet, record);
    return url;
}

function getImageUploadReferenceMap_() {
    const map = new Map();
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) return map;
    const fields = [
        ["imagenVehiculo", COLS_CORTES.imagenVehiculo],
        ["imgCorte1", COLS_CORTES.imgCorte1],
        ["imgCorte2", COLS_CORTES.imgCorte2],
        ["imgCorte3", COLS_CORTES.imgCorte3],
        ["imgApertura", COLS_CORTES.imgApertura],
        ["imgCableAlimen", COLS_CORTES.imgCableAlimen],
        ["imgCableAlimen2", COLS_CORTES.imgCableAlimen2],
        ["imgCableAlimen3", COLS_CORTES.imgCableAlimen3]
    ].filter(item => Number(item[1]) > 0);
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    rows.forEach((row, offset) => fields.forEach(field => {
        const fileId = getImageUploadFileId_(row[field[1] - 1]);
        if (!fileId) return;
        if (!map.has(fileId)) map.set(fileId, []);
        map.get(fileId).push({
            sheet: SHEET_NAMES.CORTES, row: offset + 2, field: field[0],
            column: field[1], url: String(row[field[1] - 1] || "")
        });
    }));
    return map;
}

function classifyImageUploadReconciliation_(previousState, fileState, referenceCount) {
    if (fileState === "missing") return "file_missing";
    if (fileState === "altered") return "requires_review";
    if (previousState === "requires_review") return "requires_review";
    if (Number(referenceCount) > 0) return "linked";
    if (previousState === "linked" || previousState === "orphan_candidate") return "orphan_candidate";
    return "pending_unreferenced";
}

function handleReconcilePendingImageUploads(payload, logMessage) {
    const existingLedgerSheet = getSpreadsheet().getSheetByName(IMAGE_UPLOAD_LEDGER_SHEET_NAME);
    if (!existingLedgerSheet) {
        return { status: "success", dryRun: !(payload && payload.confirm === true), processed: 0,
            message: "ImageUploadLedger todavía no existe; no hay cargas registradas para reconciliar." };
    }
    const ledgerSheet = getOrCreateImageUploadLedgerSheet_();
    const lastRow = ledgerSheet.getLastRow();
    const requestedStart = Number(payload && payload.startRow);
    const startRow = Number.isInteger(requestedStart) && requestedStart >= 2 ? requestedStart : 2;
    const requestedLimit = payload && payload.limit !== undefined ? Number(payload.limit) : 50;
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 50;
    const confirm = !!(payload && payload.confirm === true);
    if (lastRow < 2 || startRow > lastRow) {
        return { status: "success", dryRun: !confirm, processed: 0, message: "No hay registros de cargas generales pendientes de reconciliación." };
    }

    const count = Math.min(limit, lastRow - startRow + 1);
    const records = ledgerSheet.getRange(startRow, 1, count, IMAGE_UPLOAD_LEDGER_HEADERS.length).getValues();
    const referenceMap = getImageUploadReferenceMap_();
    const ledgerFileIds = new Set();
    const allReferenceIds = new Set();
    const items = [];
    const counts = { linked: 0, pending_unreferenced: 0, orphan_candidate: 0, file_missing: 0, requires_review: 0, errors: 0 };

    ledgerSheet.getRange(2, 7, lastRow - 1, 1).getDisplayValues().flat()
        .forEach(value => { if (String(value || "").trim()) ledgerFileIds.add(String(value).trim()); });
    referenceMap.forEach((references, fileId) => allReferenceIds.add(fileId));

    records.forEach((values, offset) => {
        const rowIndex = startRow + offset;
        const token = String(values[0] || "").trim();
        const operationKey = String(values[1] || "").trim();
        const folderId = String(values[2] || "").trim();
        const mimeType = String(values[3] || "").trim();
        const sizeBytes = Number(values[4]);
        const contentHash = String(values[5] || "").trim();
        let fileId = String(values[6] || "").trim();
        const previousState = String(values[8] || "pending").trim();
        const item = { rowIndex, token, operationKey, fileId, previousState, state: previousState, referenceCount: 0, reason: "" };

        try {
            if (!token || !operationKey || !folderId || !mimeType || !Number.isFinite(sizeBytes) || !contentHash) {
                throw new Error("El registro no contiene token, operación, carpeta, MIME, tamaño o hash completos.");
            }
            const folder = DriveApp.getFolderById(folderId);
            if (String(folder.getId()) !== folderId) throw new Error("La carpeta del registro no coincide con el ID persistido.");
            const expected = { token, operationKey, folderId, mimeType, sizeBytes, contentHash };
            let file = null;
            if (fileId) {
                try { file = DriveApp.getFileById(fileId); } catch (lookupError) { file = null; }
            }
            if (!file) {
                const extension = getExtensionFromMimeType(mimeType);
                file = findExistingImageUpload(folder, "__GPSpediaUpload_" + token + extension, expected, token);
                if (file) fileId = file.getId();
            }

            let fileState = "valid";
            if (!file) {
                fileState = "missing";
                item.reason = "No se encontró el archivo en Drive ni en la carpeta registrada.";
            } else {
                try { verifyImageUploadFile_(file, folder, expected); }
                catch (verifyError) { fileState = "altered"; item.reason = verifyError.message; }
            }

            const references = fileId ? (referenceMap.get(fileId) || []) : [];
            item.fileId = fileId;
            item.referenceCount = references.length;
            const nextState = classifyImageUploadReconciliation_(previousState, fileState, references.length);
            item.state = nextState;
            if (!item.reason && !references.length && fileState === "valid") {
                item.reason = previousState === "linked"
                    ? "El archivo existe, pero ya no se encontró una referencia en Cortes; se conserva para revisión."
                    : "El archivo existe, pero todavía no se encontró una referencia en Cortes; no se elimina.";
            } else if (!item.reason && references.length) {
                item.reason = "La referencia de Spreadsheet se verificó por ID de Drive.";
            }

            if (confirm) {
                values[6] = fileId;
                if (file) values[7] = "https://drive.google.com/uc?export=view&id=" + fileId;
                values[8] = nextState;
                values[9] = references.length ? SHEET_NAMES.CORTES : "";
                values[10] = references.length ? references[0].row : "";
                values[11] = references.map(reference => reference.field).join(",");
                values[12] = JSON.stringify(references);
                values[15] = new Date().toISOString();
                values[16] = (nextState === "file_missing" || nextState === "requires_review") ? item.reason : "";
                saveImageUploadLedgerRecord_(ledgerSheet, { rowIndex, values });

                if (file && nextState === "linked") {
                    try {
                        const originalName = String(values[13] || "");
                        if (originalName && file.getName() !== originalName) file.setName(originalName);
                        const description = buildImageUploadDescription_({
                            operationKey, token, folderId, mimeType, sizeBytes,
                            contentHash, fileName: originalName
                        }, "linked", JSON.stringify(references));
                        file.setDescription(description);
                        if (String(file.getDescription() || "") !== description) {
                            item.descriptionWarning = "La fila ledger quedó linked, pero Drive no confirmó la descripción.";
                        }
                    } catch (descriptionError) {
                        item.descriptionWarning = descriptionError.message;
                    }
                }
            }
        } catch (error) {
            item.state = "requires_review";
            item.reason = error.message;
            if (confirm) {
                values[8] = "requires_review";
                values[15] = new Date().toISOString();
                values[16] = error.message;
                try { saveImageUploadLedgerRecord_(ledgerSheet, { rowIndex, values }); }
                catch (saveError) { item.saveError = saveError.message; }
            }
        }

        counts[item.state] = (counts[item.state] || 0) + 1;
        if (item.saveError) counts.errors++;
        items.push(item);
    });

    items.forEach(item => { if (item.fileId) ledgerFileIds.add(item.fileId); });
    const untrackedReferences = Array.from(allReferenceIds).filter(fileId => !ledgerFileIds.has(fileId));
    const nextStartRow = startRow + count <= lastRow ? startRow + count : null;
    if (logMessage) logMessage("Reconciliación de cargas",
        (confirm ? "Aplicados" : "Simulados") + " " + items.length + " registros; no se eliminó ningún archivo.");
    return {
        status: "success", dryRun: !confirm, processed: items.length,
        startRow, nextStartRow, truncated: nextStartRow !== null,
        counts, untrackedReferenceCount: untrackedReferences.length,
        untrackedReferenceFileIds: untrackedReferences.slice(0, 50),
        items: items.slice(0, 100),
        message: confirm
            ? "Reconciliación aplicada. Los archivos sin referencia o con integridad dudosa se conservaron."
            : "Simulación completada. Usa confirm:true para aplicar los estados propuestos; no se borran archivos."
    };
}

function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/pjpeg': '.jpg',
        'image/png': '.png', 'image/x-png': '.png', 'image/gif': '.gif',
        'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp',
        'image/x-ms-bmp': '.bmp', 'image/tiff': '.tiff', 'image/heic': '.heic',
        'image/heif': '.heif', 'image/avif': '.avif', 'image/x-icon': '.ico',
        'image/vnd.microsoft.icon': '.ico'
    };
    const extension = mimeMap[String(mimeType || "").toLowerCase()];
    if (!extension) throw new Error("No se reconoce una extensión para el MIME de imagen: " + mimeType);
    return extension;
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

// ============================================================================
// GESTIÓN DE IDEMPOTENCIA EN HOJA DEDICADA ("Idempotencia")
// ============================================================================

const IDEMPOTENCIA_HEADERS = ["opId", "vehicleId", "slotIndex", "timestamp", "status", "operationHash"];

/**
 * Comprueba el esquema A:F sin modificar la hoja.
 * Los encabezados vacíos son reparables; los encabezados no vacíos distintos
 * del esquema esperado hacen que la hoja sea incompatible.
 */
function isBlankIdempotenciaValue_(value) {
    return value === "" || value === null || value === undefined;
}

function getIdempotenciaHeaderState(sheet) {
    if (!sheet) return { compatible: false, missingIndexes: [], reason: "missing_sheet" };
    const maxColumns = Math.max(0, Number(sheet.getMaxColumns()) || 0);
    const lastRow = sheet.getLastRow();
    if (maxColumns < IDEMPOTENCIA_HEADERS.length - 1 && lastRow > 1) {
        return { compatible: false, missingIndexes: [], reason: "insufficient_columns_with_data" };
    }
    const availableColumns = Math.min(maxColumns, IDEMPOTENCIA_HEADERS.length);
    const headers = availableColumns
        ? sheet.getRange(1, 1, 1, availableColumns).getValues()[0]
        : [];
    const missingIndexes = [];
    let recognizedHeaders = 0;

    for (let index = 0; index < IDEMPOTENCIA_HEADERS.length; index++) {
        const header = index < availableColumns ? String(headers[index] || "").trim() : "";
        if (!header) {
            missingIndexes.push(index);
            continue;
        }
        if (header.toLowerCase() !== IDEMPOTENCIA_HEADERS[index].toLowerCase()) {
            return {
                compatible: false, missingIndexes: [], reason: "incompatible_header",
                column: index + 1, header: header
            };
        }
        recognizedHeaders++;
    }

    if (lastRow > 1) {
        for (const index of missingIndexes) {
            if (index < availableColumns) {
                const values = sheet.getRange(2, index + 1, lastRow - 1, 1).getValues();
                if (values.some(row => !isBlankIdempotenciaValue_(row[0]))) {
                    return { compatible: false, missingIndexes: [], reason: "missing_header_with_data", column: index + 1 };
                }
            }
        }
        if (recognizedHeaders === 0) {
            return { compatible: false, missingIndexes: [], reason: "no_recognized_headers_with_data" };
        }
    }

    return {
        compatible: true,
        missingIndexes: missingIndexes,
        reason: missingIndexes.length ? "missing_headers" : null
    };
}

function isUnsafeIdempotenciaHeaderState_(state) {
    return !!state && (
        state.reason === "missing_header_with_data" ||
        state.reason === "no_recognized_headers_with_data" ||
        state.reason === "insufficient_columns_with_data"
    );
}

function isIdempotenciaSheetCompatible(sheet) {
    return getIdempotenciaHeaderState(sheet).compatible;
}

function normalizeIdempotenciaOpId_(value, context) {
    const opId = String(value === null || value === undefined ? "" : value).trim();
    if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId)) {
        throw new Error((context || "Idempotencia") + ": opId vacío o inválido.");
    }
    return opId;
}

function normalizeIdempotenciaVehicleId_(value, context) {
    const vehicleId = String(value === null || value === undefined ? "" : value).trim();
    if (!vehicleId || vehicleId.length > 80 || /[\u0000-\u001f\u007f]/.test(vehicleId)) {
        throw new Error((context || "Idempotencia") + ": vehicleId vacío o inválido.");
    }
    return vehicleId;
}

function normalizeIdempotenciaSlotIndex_(value, context) {
    const slotIndex = String(value === null || value === undefined ? "" : value).trim();
    if (!/^[1-3]$/.test(slotIndex)) {
        throw new Error((context || "Idempotencia") + ": slotIndex debe ser 1, 2 o 3.");
    }
    return Number(slotIndex);
}

function isValidIdempotenciaTimestamp_(value) {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 && !Number.isNaN(new Date(value).getTime());
    }

    const raw = String(value === null || value === undefined ? "" : value).trim();
    if (!raw) return false;
    const localDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
    if (localDate) {
        const day = Number(localDate[1]);
        const month = Number(localDate[2]);
        const year = Number(localDate[3]);
        const hour = Number(localDate[4] || 0);
        const minute = Number(localDate[5] || 0);
        const second = Number(localDate[6] || 0);
        const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        return parsed.getUTCFullYear() === year &&
            parsed.getUTCMonth() === month - 1 &&
            parsed.getUTCDate() === day &&
            hour <= 23 && minute <= 59 && second <= 59;
    }
    return !Number.isNaN(Date.parse(raw));
}

function normalizeIdempotenciaOperationHash_(value, context) {
    const hash = String(value === null || value === undefined ? "" : value).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error((context || "Idempotencia") + ": operationHash debe ser SHA-256 hexadecimal de 64 caracteres.");
    return hash;
}

function normalizeIdempotenciaStatus_(value, context) {
    const status = String(value === null || value === undefined ? "" : value).trim().toLowerCase();
    if (status !== "pending" && status !== "completed") {
        throw new Error((context || "Idempotencia") + ": status debe ser pending o completed.");
    }
    return status;
}

function normalizeIdempotenciaEntry_(row, rowIndex) {
    if (row.every(isBlankIdempotenciaValue_)) return null;
    const context = "Idempotencia fila " + rowIndex;
    if (!isValidIdempotenciaTimestamp_(row[3])) {
        throw new Error(context + ": timestamp vacío o inválido.");
    }
    return {
        opId: normalizeIdempotenciaOpId_(row[0], context),
        vehicleId: normalizeIdempotenciaVehicleId_(row[1], context),
        slotIndex: normalizeIdempotenciaSlotIndex_(row[2], context),
        timestamp: row[3],
        status: normalizeIdempotenciaStatus_(row[4], context),
        operationHash: isBlankIdempotenciaValue_(row[5]) ? "" : normalizeIdempotenciaOperationHash_(row[5], context),
        rowIndex: rowIndex
    };
}

function readIdempotenciaEntries_(sheet, allowMissingHeaders) {
    if (!sheet) return { entries: [], byOpId: new Map() };
    const state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible || (!allowMissingHeaders && state.missingIndexes.length)) {
        throw new Error("La hoja Idempotencia tiene encabezados o contenido incompatibles (" +
            (state.reason || "faltan encabezados") + "); no se modificó.");
    }

    const entries = [];
    const byOpId = new Map();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { entries: entries, byOpId: byOpId };

    const availableColumns = Math.min(IDEMPOTENCIA_HEADERS.length, Math.max(0, Number(sheet.getMaxColumns()) || 0));
    const rows = availableColumns
        ? sheet.getRange(2, 1, lastRow - 1, availableColumns).getValues()
        : [];
    rows.forEach((sourceRow, offset) => {
        const row = sourceRow.concat(Array(Math.max(0, IDEMPOTENCIA_HEADERS.length - sourceRow.length)).fill(""));
        const entry = normalizeIdempotenciaEntry_(row, offset + 2);
        if (!entry) return;
        if (byOpId.has(entry.opId)) {
            const previous = byOpId.get(entry.opId);
            throw new Error("opId duplicado " + entry.opId + " en filas " + previous.rowIndex +
                " y " + entry.rowIndex + "; no se fusionaron ni eliminaron filas. Requiere reconciliación manual.");
        }
        entries.push(entry);
        byOpId.set(entry.opId, entry);
    });
    return { entries: entries, byOpId: byOpId };
}

function initializeIdempotenciaSheet(sheet) {
    if (!sheet) throw new Error("No se puede inicializar una hoja de idempotencia inexistente.");
    let state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible) {
        throw new Error("La hoja «" + sheet.getName() + "» no es compatible (" + state.reason + "); se conserva sin modificar.");
    }

    // Valida todas las filas antes de reparar encabezados o ampliar la hoja.
    readIdempotenciaEntries_(sheet, true);
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < IDEMPOTENCIA_HEADERS.length) {
        sheet.insertColumnsAfter(maxColumns, IDEMPOTENCIA_HEADERS.length - maxColumns);
    }

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, IDEMPOTENCIA_HEADERS.length).setValues([IDEMPOTENCIA_HEADERS]);
    } else {
        state.missingIndexes.forEach(index => {
            sheet.getRange(1, index + 1).setValue(IDEMPOTENCIA_HEADERS[index]);
        });
    }

    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible || state.missingIndexes.length) {
        throw new Error("No se pudo verificar la estructura A:F de la hoja «" + sheet.getName() + "».");
    }
    readIdempotenciaEntries_(sheet, false);
    return sheet;
}

function createIdempotenciaSheetIfMissing(ss, sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) return sheet;
    try {
        return ss.insertSheet(sheetName);
    } catch (error) {
        sheet = ss.getSheetByName(sheetName);
        if (sheet) return sheet;
        throw error;
    }
}

function findOrCreateIdempotenciaSheet() {
    const ss = getSpreadsheet();
    const primary = ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA);
    const fallback = ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA_FALLBACK);

    if (primary) {
        const state = getIdempotenciaHeaderState(primary);
        if (isUnsafeIdempotenciaHeaderState_(state)) {
            throw new Error("La hoja Idempotencia tiene datos bajo un encabezado vacío o incompleto; se detuvo sin repararla ni cambiar de hoja.");
        }
        if (state.compatible) return initializeIdempotenciaSheet(primary);
    }

    if (fallback) {
        const state = getIdempotenciaHeaderState(fallback);
        if (isUnsafeIdempotenciaHeaderState_(state)) {
            throw new Error("La hoja Idempotencia_Cortes tiene datos bajo un encabezado vacío o incompleto; se detuvo sin modificarla.");
        }
        if (!state.compatible) {
            throw new Error("La hoja Idempotencia_Cortes existe, pero su estructura no es compatible; requiere revisión manual.");
        }
        return initializeIdempotenciaSheet(fallback);
    }

    if (primary) {
        throw new Error("La hoja Idempotencia principal no es compatible y no existe una hoja alternativa segura; requiere revisión manual.");
    }
    return initializeIdempotenciaSheet(createIdempotenciaSheetIfMissing(ss, SHEET_NAMES.IDEMPOTENCIA));
}

function getIdempotenciaSheet() {
    return findOrCreateIdempotenciaSheet();
}

function removeEmptyPendingCutRow(sheet, rowIndex, lastColumn) {
    try {
        if (!sheet || sheet.getLastRow() !== rowIndex) return false;
        const width = Math.max(0, lastColumn - 1);
        if (width > 0) {
            const values = sheet.getRange(rowIndex, 2, 1, width).getValues()[0];
            if (values.some(value => value !== "" && value !== null && value !== undefined)) return false;
        }
        sheet.deleteRow(rowIndex);
        return true;
    } catch (error) {
        Logger.log("No se pudo retirar la fila vacía de una operación sin reservar: " + error.message);
        return false;
    }
}

function recordOpId(opId, vehicleId, slotIndex, timestamp, status, operationHash) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Registro de operación");

    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Registro de operación");
    const cleanSlotIndex = normalizeIdempotenciaSlotIndex_(slotIndex, "Registro de operación");
    const cleanTimestamp = timestamp === null || timestamp === undefined || timestamp === ""
        ? new Date().toISOString()
        : timestamp;
    if (!isValidIdempotenciaTimestamp_(cleanTimestamp)) {
        throw new Error("Registro de operación: timestamp vacío o inválido.");
    }
    const targetStatus = normalizeIdempotenciaStatus_(status === undefined ? "completed" : status, "Registro de operación");
    const cleanOperationHash = normalizeIdempotenciaOperationHash_(operationHash, "Registro de operación");
    const sheet = getIdempotenciaSheet();
    const existing = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);

    if (existing) {
        if (existing.vehicleId !== cleanVehicleId || existing.slotIndex !== cleanSlotIndex) {
            throw new Error("El opId " + cleanOpId + " ya está asociado a otro vehicleId/slotIndex; no se modificó.");
        }
        if (!existing.operationHash || existing.operationHash !== cleanOperationHash) {
            throw new Error("El opId " + cleanOpId + " no coincide con la huella del contenido original; no se modificó.");
        }
        const finalStatus = existing.status === "completed" || targetStatus === "completed" ? "completed" : "pending";
        if (existing.status !== finalStatus) sheet.getRange(existing.rowIndex, 5).setValue(finalStatus);
        SpreadsheetApp.flush();

        const verified = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
        if (!verified || verified.vehicleId !== cleanVehicleId ||
            verified.slotIndex !== cleanSlotIndex || verified.status !== finalStatus || verified.operationHash !== cleanOperationHash) {
            throw new Error("No se pudo verificar la actualización del opId " + cleanOpId + ".");
        }
        return verified;
    }

    sheet.appendRow([cleanOpId, cleanVehicleId, cleanSlotIndex, cleanTimestamp, targetStatus, cleanOperationHash]);
    SpreadsheetApp.flush();
    const verified = readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
    if (!verified || verified.vehicleId !== cleanVehicleId ||
        verified.slotIndex !== cleanSlotIndex || verified.status !== targetStatus || verified.operationHash !== cleanOperationHash) {
        throw new Error("No se pudo verificar el registro del opId " + cleanOpId + ".");
    }
    return verified;
}

function findUniqueCortesVehicleRow_(sheet,vehicleId,opId){if(!sheet)throw Error("No se encontró la hoja Cortes para recuperar el opId "+opId+".");const id=normalizeIdempotenciaVehicleId_(vehicleId,"Recuperación "+opId),data=sheet.getDataRange().getValues(),matches=[];for(let r=1;r<data.length;r++){const v=data[r][COLS_CORTES.id-1];if(isBlankIdempotenciaValue_(v))continue;if(normalizeIdempotenciaVehicleId_(v,"Cortes fila "+(r+1))===id)matches.push({rowIndex:r+1,rowValues:data[r]});}if(matches.length!==1)throw Error("No se puede recuperar el opId "+opId+": vehicleId "+id+" aparece en "+matches.length+" filas de Cortes; se requiere exactamente una. No se modificó.");return matches[0];}
function findUniqueCortesVehicleRow_(cortesSheet, vehicleId, opId) {
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar el opId " + opId + ".");
    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación " + opId);
    const data = cortesSheet.getDataRange().getValues();
    const matches = [];

    for (let rowOffset = 1; rowOffset < data.length; rowOffset++) {
        const rawId = data[rowOffset][COLS_CORTES.id - 1];
        if (isBlankIdempotenciaValue_(rawId)) continue;
        if (normalizeIdempotenciaVehicleId_(rawId, "Cortes fila " + (rowOffset + 1)) === cleanVehicleId) {
            matches.push({ rowIndex: rowOffset + 1, rowValues: data[rowOffset] });
        }
    }
    if (matches.length !== 1) {
        throw new Error("No se puede recuperar el opId " + opId + ": vehicleId " + cleanVehicleId +
            " aparece en " + matches.length + " filas de Cortes; se requiere exactamente una. No se modificó.");
    }
    return matches[0];
}

function findUniqueCortesVehicleRow_(cortesSheet, vehicleId, opId) {
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar el opId " + opId + ".");
    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación " + opId);
    const data = cortesSheet.getDataRange().getValues();
    const matches = [];
    for (let rowOffset = 1; rowOffset < data.length; rowOffset++) {
        const rawId = data[rowOffset][COLS_CORTES.id - 1];
        if (isBlankIdempotenciaValue_(rawId)) continue;
        if (normalizeIdempotenciaVehicleId_(rawId, "Cortes fila " + (rowOffset + 1)) === cleanVehicleId) {
            matches.push({ rowIndex: rowOffset + 1, rowValues: data[rowOffset] });
        }
    }
    if (matches.length !== 1) {
        throw new Error("No se puede recuperar el opId " + opId + ": vehicleId " + cleanVehicleId +
            " aparece en " + matches.length + " filas de Cortes; se requiere exactamente una. No se modificó.");
    }
    return matches[0];
}

function findRowByOpId(sheet, opId) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Recuperación de operación");

    const idempotenciaSheet = getIdempotenciaSheet();
    const entry = readIdempotenciaEntries_(idempotenciaSheet, false).byOpId.get(cleanOpId);
    const cortesSheet = sheet || getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar " + cleanOpId + ".");

    if (entry) {
        const unique = findUniqueCortesVehicleRow_(cortesSheet, entry.vehicleId, cleanOpId);
        return {
            rowIndex: unique.rowIndex,
            rowValues: unique.rowValues,
            colIndex: COLS_CORTES["colaboradorCorte" + entry.slotIndex],
            slotIndex: entry.slotIndex,
            timestamp: entry.timestamp,
            status: entry.status,
            vehicleId: entry.vehicleId,
            operationHash: entry.operationHash,
            fromIdempotenciaSheet: true
        };
    }

    if (cortesSheet.getLastRow() <= 1) return null;
    const data = cortesSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const vinColumn = headers.findIndex(header => String(header || "").trim().toLowerCase() === "vin") + 1;
    const operationColumns = [];
    headers.forEach((header, index) => {
        const normalized = String(header || "").trim().toLowerCase();
        const legacyVinColumn = vinColumn > 0 && index + 1 === vinColumn &&
            data.slice(1).some(row => /^OP-[A-Za-z0-9_-]{1,100}$/.test(String(row[index] || "").trim()));
        if (normalized.includes("idoperacion") || normalized.includes("id_operacion") || legacyVinColumn) {
            operationColumns.push(index);
        }
    });

    const directMatches = [];
    data.slice(1).forEach((row, offset) => {
        operationColumns.forEach(column => {
            if (String(row[column] || "").trim() === cleanOpId) {
                directMatches.push({ rowIndex: offset + 2, rowValues: row, colIndex: column + 1 });
            }
        });
    });

    let match = null;
    if (directMatches.length > 1) {
        throw new Error("El opId heredado " + cleanOpId +
            " aparece en varias columnas de operación de Cortes; no se eligió ni limpió ninguna coincidencia.");
    }
    if (directMatches.length === 1) {
        match = directMatches[0];
    } else {
        const taggedMatches = [];
        data.slice(1).forEach((row, offset) => {
            row.forEach((value, column) => {
                if (typeof value === "string" &&
                    (value === cleanOpId || value.includes("[" + cleanOpId + "]"))) {
                    taggedMatches.push({ rowIndex: offset + 2, rowValues: row, colIndex: column + 1 });
                }
            });
        });
        if (taggedMatches.length > 1) {
            throw new Error("El opId heredado " + cleanOpId +
                " aparece en varias celdas de Cortes; no se eligió ni limpió ninguna coincidencia.");
        }
        if (taggedMatches.length === 1) match = taggedMatches[0];
    }

    if (!match) return null;
    const vehicleId = match.rowValues[COLS_CORTES.id - 1];
    const unique = findUniqueCortesVehicleRow_(cortesSheet, vehicleId, cleanOpId);
    if (unique.rowIndex !== match.rowIndex) {
        throw new Error("La fila heredada del opId " + cleanOpId + " no coincide con la única fila de su vehicleId.");
    }
    return {
        rowIndex: unique.rowIndex,
        rowValues: unique.rowValues,
        colIndex: match.colIndex,
        slotIndex: null,
        timestamp: unique.rowValues[COLS_CORTES.timestamp - 1] || "",
        status: "completed",
        vehicleId: normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación heredada " + cleanOpId),
        operationHash: null,
        fromIdempotenciaSheet: false
    };
}

function normalizeIdempotenciaHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_]/g, "");
}

function inspectIdempotenciaMigrationTarget(){const ss=getSpreadsheet(),p=ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA),f=ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA_FALLBACK);if(p){const st=getIdempotenciaHeaderState(p);if(isUnsafeIdempotenciaHeaderState_(st))throw Error("La hoja Idempotencia tiene datos bajo un encabezado vacío; migración detenida.");if(st.compatible){readIdempotenciaEntries_(p,true);return{sheet:p,name:SHEET_NAMES.IDEMPOTENCIA,usingFallback:false};}}if(f){const st=getIdempotenciaHeaderState(f);if(isUnsafeIdempotenciaHeaderState_(st))throw Error("La hoja Idempotencia_Cortes tiene datos bajo un encabezado vacío; migración detenida.");if(!st.compatible)throw Error("La hoja Idempotencia_Cortes existe, pero su estructura no es compatible.");readIdempotenciaEntries_(f,true);return{sheet:f,name:SHEET_NAMES.IDEMPOTENCIA_FALLBACK,usingFallback:true,primaryIncompatible:Boolean(p)};}if(p)throw Error("La hoja Idempotencia existe pero no es compatible; se conserva para revisión manual.");return{sheet:null,name:SHEET_NAMES.IDEMPOTENCIA,usingFallback:false};}

function readIdempotenciaOperationMap(s){const map=new Map(),v=readIdempotenciaEntries_(s,true);v.entries.forEach(e=>map.set(e.opId,{vehicleId:e.vehicleId,slotIndex:e.slotIndex,timestamp:e.timestamp,status:e.status,operationHash:e.operationHash,rowIndex:e.rowIndex}));return map;}

function buildCortesOperationIdMigrationPlan(sheet) {
    if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
    if (sheet.getMaxColumns() < 45) {
        throw new Error("La hoja «Cortes» no dispone de las columnas 43–45 requeridas; no se insertarán columnas durante la migración.");
    }
    const lastRow = sheet.getLastRow();
    const lastColumn = Math.max(45, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const vinHeaders = [];
    headers.forEach((header, index) => {
        const normalized = normalizeIdempotenciaHeader(header);
        if (normalized === "vin") vinHeaders.push(index + 1);
        if (normalized.indexOf("idoperacion") === 0 && (index + 1 < 43 || index + 1 > 45)) {
            throw new Error("Se encontró un encabezado de operación fuera de las columnas 43–45; la migración se detuvo.");
        }
    });
    if (vinHeaders.some(column => column !== 43)) {
        throw new Error("Existe un encabezado VIN fuera de la columna 43; la migración se detuvo.");
    }
    const data = lastRow > 1
        ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
        : [];
    const acceptedHeaders = {
        43: ["idoperacion", "idoperacion1"],
        44: ["idoperacion2"],
        45: ["idoperacion3"]
    };
    const sourceColumns = [];
    [43, 44, 45].forEach(column => {
        const header = normalizeIdempotenciaHeader(headers[column - 1]);
        const hasValues = data.some(row => String(row[column - 1] || "").trim() !== "");
        if (column === 43 && header === "vin") {
            const rawValues = data.map(row => String(row[column - 1] || "").trim()).filter(Boolean);
            const operationValues = rawValues.filter(value => /^OP-[a-zA-Z0-9_-]+$/.test(value));
            const embeddedOperationValues = rawValues.some(value => /"OP-[a-zA-Z0-9_-]+"/.test(value));
            if (embeddedOperationValues || (operationValues.length > 0 && operationValues.length !== rawValues.length)) {
                throw new Error("La columna 43 tiene encabezado VIN, pero mezcla datos VIN con identificadores de operación o una colección ambigua; se requiere revisión manual.");
            }
            if (operationValues.length) {
                sourceColumns.push({ column: 43, slotIndex: 1, legacyHeaderWasVin: true });
            }
            return;
        }
        if (!header) {
            if (hasValues) {
                throw new Error("La columna " + column + " tiene datos, pero carece de un encabezado de operación reconocido.");
            }
            return;
        }
        if (!acceptedHeaders[column].includes(header)) {
            throw new Error("El encabezado de la columna " + column + " no coincide con el campo de operación esperado.");
        }
        sourceColumns.push({ column: column, slotIndex: column - 42 });
    });
    const vehicleIdCounts = new Map();
    data.forEach(row => {
        const vehicleId = String(row[0] || "").trim();
        if (vehicleId) vehicleIdCounts.set(vehicleId, (vehicleIdCounts.get(vehicleId) || 0) + 1);
    });
    const sourceMap = new Map();
    let sourceCount = 0;
    data.forEach((row, rowOffset) => {
        sourceColumns.forEach(sourceColumn => {
            const opId = String(row[sourceColumn.column - 1] || "").trim();
            if (!opId) return;
            sourceCount++;
            if (!/^OP-[a-zA-Z0-9_-]+$/.test(opId)) {
                throw new Error("Se encontró un valor que no coincide con el formato de opId en la columna " + sourceColumn.column + ", fila " + (rowOffset + 2) + ".");
            }
            const vehicleId = String(row[0] || "").trim();
            if (!vehicleId) {
                throw new Error("El opId " + opId + " no tiene un ID de vehículo asociado en la fila " + (rowOffset + 2) + ".");
            }
            if (vehicleIdCounts.get(vehicleId) > 1) {
                throw new Error("El ID de vehículo " + vehicleId + " está duplicado en Cortes; no se puede garantizar la asociación del opId.");
            }
            const entry = {
                opId: opId,
                vehicleId: vehicleId,
                slotIndex: sourceColumn.slotIndex,
                timestamp: row[36] || "",
                status: "completed"
            };
            if (sourceMap.has(opId)) {
                const previous = sourceMap.get(opId);
                throw new Error("El opId " + opId + " está duplicado en Cortes (filas " + previous.sourceRowIndex + " y " + (rowOffset + 2) + "); no se fusionaron coincidencias aunque la asociación coincida.");
            } else {
                entry.sourceRowIndex = rowOffset + 2;
                if (!isValidIdempotenciaTimestamp_(entry.timestamp)) throw new Error("El opId " + opId + " no tiene timestamp válido en Cortes fila " + (rowOffset + 2) + ".");
                sourceMap.set(opId, entry);
            }
        });
    });
    return {
        lastRow: lastRow,
        lastColumn: lastColumn,
        sourceColumns: sourceColumns,
        sourceCount: sourceCount,
        sourceEntries: Array.from(sourceMap.values())
    };
}

function getNewIdempotenciaEntries(entries,map){const entriesToWrite=[],entriesToComplete=[];let alreadyPresent=0;entries.forEach(e=>{if(map.has(e.opId)){const old=map.get(e.opId);if(old.vehicleId!==String(e.vehicleId).trim()||Number(old.slotIndex)!==Number(e.slotIndex))throw Error("El opId "+e.opId+" ya existe en Idempotencia con una asociación diferente.");if(old.operationHash)throw Error("El opId "+e.opId+" ya está vinculado a una huella de contenido; la migración histórica no puede demostrar que sea la misma operación.");if(old.status==="pending")entriesToComplete.push({rowIndex:old.rowIndex,opId:e.opId});alreadyPresent++;}else entriesToWrite.push([e.opId,String(e.vehicleId).trim(),String(e.slotIndex),e.timestamp,"completed",""]);});return{entriesToWrite,entriesToComplete,alreadyPresent};}

function renameVinColumnHeader(sheet) {
    if (!sheet || sheet.getMaxColumns() < 45) {
        throw new Error("No se puede renombrar la columna VIN: las columnas 43–45 no están disponibles.");
    }
    const headerCell = sheet.getRange(1, 43);
    const currentHeader = String(headerCell.getValue() || "").trim();
    const normalized = normalizeIdempotenciaHeader(currentHeader);
    const headers = sheet.getRange(1, 1, 1, Math.max(45, sheet.getLastColumn())).getValues()[0];
    const duplicateVin = headers.findIndex((value, index) => index !== 42 && normalizeIdempotenciaHeader(value) === "vin");
    if (duplicateVin >= 0) {
        throw new Error("No se renombró la columna 43 porque ya existe otro encabezado VIN en la columna " + (duplicateVin + 1) + ".");
    }
    if (normalized === "vin") {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            const existingValues = sheet.getRange(2, 43, lastRow - 1, 1).getValues();
            if (existingValues.some(row => /^OP-[a-zA-Z0-9_-]+$/.test(String(row[0] || "").trim()) ||
                /"OP-[a-zA-Z0-9_-]+"/.test(String(row[0] || "")))) {
                throw new Error("No se puede confirmar el encabezado VIN mientras la columna 43 contenga identificadores de operación.");
            }
        }
        headerCell.setValue("VIN");
        return { column: 43, previousHeader: currentHeader, header: "VIN", changed: currentHeader !== "VIN" };
    }
    if (normalized && normalized !== "idoperacion" && normalized !== "idoperacion1") {
        throw new Error("No se renombró la columna 43 porque su encabezado no es VIN ni IdOperacion1.");
    }
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const values = sheet.getRange(2, 43, lastRow - 1, 1).getValues();
        if (values.some(row => String(row[0] || "").trim() !== "")) {
            throw new Error("No se renombró la columna 43 porque aún contiene datos que deben migrarse.");
        }
    }
    headerCell.setValue("VIN");
    return { column: 43, previousHeader: currentHeader, header: "VIN", changed: true };
}

/**
 * Recuperación ante interrupciones: escribe y verifica el mapa destino antes de
 * limpiar los opId de origen. Un reintento reutiliza las asociaciones ya guardadas
 * y agrega únicamente las faltantes; nunca limpia el origen sin read-back exitoso.
 */
function handleMigrateCortesOperationIds(payload, logMessage, developerContext) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);
    } catch (error) {
        throw new Error("No se pudo obtener el bloqueo para migrar los identificadores de operación.");
    }
    try {
        if (!developerContext || !developerContext.fullName) {
            throw new Error("La migración de identificadores requiere una sesión de desarrollador válida.");
        }
        const options = payload || {};
        verifyVinMigrationBackup(options.backupId, developerContext);
        const confirm = options.confirm === true;
        const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        const migrationPlan = buildCortesOperationIdMigrationPlan(cortesSheet);
        const targetInfo = inspectIdempotenciaMigrationTarget();
        const existingMap = readIdempotenciaOperationMap(targetInfo.sheet);
        const planned = getNewIdempotenciaEntries(migrationPlan.sourceEntries, existingMap);
        if (!confirm) {
            if (logMessage) logMessage("Diagnóstico VIN", "Simulación completada; no se modificaron hojas ni encabezados.", migrationPlan.sourceCount, migrationPlan.sourceCount);
            return {
                status: "success", dryRun: true, sourceCount: migrationPlan.sourceCount,
                uniqueOperationIds: migrationPlan.sourceEntries.length,
                recordsToMigrate: planned.entriesToWrite.length, recordsToComplete: planned.entriesToComplete.length, alreadyPresent: planned.alreadyPresent,
                sourceColumns: migrationPlan.sourceColumns.map(item => item.column),
                targetSheet: targetInfo.name, fallbackSheetRequired: targetInfo.usingFallback === true,
                legacyIdempotenciaPreserved: targetInfo.primaryIncompatible === true,
                incompatibleFallbackPreserved: targetInfo.incompatibleFallbackPreserved === true,
                headerAfterMigration: "VIN", reservedColumns: [44, 45],
                message: "Simulación completada. Para ejecutar la migración se requiere confirm: true."
            };
        }
        const targetSheet = getIdempotenciaSheet();
        if (targetSheet.getName() !== targetInfo.name) {
            throw new Error("La hoja destino de idempotencia cambió durante la operación; no se limpiaron las columnas de origen.");
        }
        const currentMap = readIdempotenciaOperationMap(targetSheet);
        const currentPlan = getNewIdempotenciaEntries(migrationPlan.sourceEntries, currentMap);
        if (currentPlan.entriesToWrite.length) targetSheet.getRange(targetSheet.getLastRow() + 1, 1, currentPlan.entriesToWrite.length, IDEMPOTENCIA_HEADERS.length).setValues(currentPlan.entriesToWrite);
        currentPlan.entriesToComplete.forEach(item => targetSheet.getRange(item.rowIndex, 5).setValue("completed"));
        SpreadsheetApp.flush();
        const verifiedMap = readIdempotenciaOperationMap(targetSheet);
        migrationPlan.sourceEntries.forEach(entry => {
            const saved = verifiedMap.get(entry.opId);
            if (!saved || saved.vehicleId !== String(entry.vehicleId).trim() || Number(saved.slotIndex) !== Number(entry.slotIndex) || saved.status !== "completed")
                throw Error("No se pudo verificar opId, asociación y estado completed de " + entry.opId + "; se conservaron los datos de origen.");
        });
        const lastRow = migrationPlan.lastRow;
        if (lastRow > 1) {
            migrationPlan.sourceColumns.forEach(item => cortesSheet.getRange(2, item.column, lastRow - 1, 1).clearContent());
            cortesSheet.getRange(2, 44, lastRow - 1, 2).clearContent();
        }
        cortesSheet.getRange(1, 44, 1, 2).clearContent();
        const renamed = renameVinColumnHeader(cortesSheet);
        SpreadsheetApp.flush();
        const finalHeaders = cortesSheet.getRange(1, 43, 1, 3).getValues()[0];
        if (String(finalHeaders[0] || "") !== "VIN" || String(finalHeaders[1] || "").trim() !== "" || String(finalHeaders[2] || "").trim() !== "") {
            throw new Error("La verificación final de encabezados VIN/columnas reservadas no coincide.");
        }
        if (lastRow > 1) {
            const reservedValues = cortesSheet.getRange(2, 44, lastRow - 1, 2).getValues();
            if (reservedValues.some(row => String(row[0] || "").trim() !== "" || String(row[1] || "").trim() !== "")) {
                throw new Error("Las columnas 44 y 45 no quedaron vacías después de la migración.");
            }
            if (migrationPlan.sourceColumns.some(item => item.column === 43)) {
                const vinValues = cortesSheet.getRange(2, 43, lastRow - 1, 1).getValues();
                if (vinValues.some(row => String(row[0] || "").trim() !== "")) {
                    throw new Error("La columna 43 aún contiene valores de operación después de la migración.");
                }
            }
        }
        if (logMessage) logMessage("Migración VIN", "Identificadores de operación verificados y columnas 43–45 reorganizadas.", migrationPlan.sourceCount, migrationPlan.sourceCount);
        return {
            status: "success", dryRun: false, sourceCount: migrationPlan.sourceCount,
            migratedCount: currentPlan.entriesToWrite.length, completedExisting: currentPlan.entriesToComplete.length, alreadyPresent: currentPlan.alreadyPresent,
            targetSheet: targetSheet.getName(), vinColumn: 43, vinHeader: renamed.header,
            sourceColumns: migrationPlan.sourceColumns.map(item => item.column),
            legacyIdempotenciaPreserved: targetInfo.primaryIncompatible === true,
            incompatibleFallbackPreserved: targetInfo.incompatibleFallbackPreserved === true,
            reservedColumns: [44, 45], message: "Migración ejecutada y verificada."
        };
    } finally {
        lock.releaseLock();
    }
}

function handleCheckOperation(payload) {
    const { opId } = payload || {};
    if (!opId) throw new Error("ID de operación requerido.");

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const match = findRowByOpId(sheet, opId);
    if (!match) {
        return { status: "success", exists: false, pending: false };
    }
    const expectedHash = String(payload && payload.operationHash || "").trim().toLowerCase();
    if (expectedHash && (!/^[a-f0-9]{64}$/.test(expectedHash) || match.operationHash !== expectedHash)) {
        throw new Error("El opId no corresponde al contenido de la operación recuperada.");
    }
    if (match.status !== "completed") {
        return {
            status: "success",
            exists: false,
            pending: true,
            operationStatus: match.status,
            vehicleId: match.vehicleId,
            operationHash: match.operationHash
        };
    }

    const rowObj = mapRowToObject(match.rowValues, COLS_CORTES);
    return {
        status: "success",
        exists: true,
        pending: false,
        operationStatus: "completed",
        vehicleId: rowObj.id,
        timestamp: rowObj.timestamp,
        operationHash: match.operationHash
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

// ============================================================================
// FUNCIONES DE GESTIÓN AVANZADA DE SPREADSHEET Y TERMINAL DE DRIVE
// ============================================================================

function handleCreateSheet(payload, logMessage) {
    const { sheetName, headers, idFormula } = payload;
    if (!sheetName) throw new Error("Nombre de hoja requerido.");
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) throw new Error(`La hoja '${sheetName}' ya existe en el libro.`);

    sheet = ss.insertSheet(sheetName);
    if (Array.isArray(headers) && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }

    if (idFormula && headers && headers.length > 0) {
        // Asignar plantilla de fórmula de ID a la primera columna si se especificó
        sheet.getRange(2, 1).setFormula(idFormula || '=ROW()-1');
    }

    logMessage && logMessage("Spreadsheet", `Hoja '${sheetName}' creada con exito.`);
    return { status: 'success', message: `Hoja '${sheetName}' creada correctamente.` };
}

function handleAddColumn(payload, logMessage) {
    const { sheetName, columnName } = payload;
    if (!sheetName || !columnName) throw new Error("Nombre de hoja y nombre de columna requeridos.");
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`La hoja '${sheetName}' no existe.`);

    const lastCol = sheet.getLastColumn();
    const newColIndex = lastCol + 1;
    sheet.getRange(1, newColIndex).setValue(columnName).setFontWeight("bold").setBackground("#f3f3f3");

    logMessage && logMessage("Spreadsheet", `Columna '${columnName}' agregada a '${sheetName}' en el indice ${newColIndex}.`);
    return { status: 'success', message: `Columna '${columnName}' agregada en la posicion ${newColIndex}.`, columnIndex: newColIndex };
}

function handleDriveCommand(payload, logMessage) {
    const { command, currentFolderId, args } = payload;
    const rootFolder = getCortesRootFolder();
    let activeFolder = currentFolderId ? DriveApp.getFolderById(currentFolderId) : rootFolder;

    const cmd = (command || '').toLowerCase().trim();

    if (cmd === 'dir' || cmd === 'ls') {
        const folders = [];
        const files = [];

        const subFolders = activeFolder.getFolders();
        while (subFolders.hasNext()) {
            const f = subFolders.next();
            folders.push({ id: f.getId(), name: f.getName(), type: 'folder' });
        }

        const subFiles = activeFolder.getFiles();
        while (subFiles.hasNext()) {
            const file = subFiles.next();
            files.push({ id: file.getId(), name: file.getName(), size: file.getSize(), mimeType: file.getMimeType(), type: 'file' });
        }

        return {
            status: 'success',
            currentFolder: { id: activeFolder.getId(), name: activeFolder.getName() },
            isRoot: activeFolder.getId() === rootFolder.getId(),
            folders: folders,
            files: files
        };
    } else if (cmd === 'cd') {
        const target = args ? args.trim() : '';
        if (target === '\\' || target === '/') {
            return {
                status: 'success',
                currentFolder: { id: rootFolder.getId(), name: rootFolder.getName() }
            };
        } else if (target === '..') {
            const parents = activeFolder.getParents();
            if (parents.hasNext()) {
                const parent = parents.next();
                return {
                    status: 'success',
                    currentFolder: { id: parent.getId(), name: parent.getName() }
                };
            } else {
                return { status: 'success', currentFolder: { id: rootFolder.getId(), name: rootFolder.getName() } };
            }
        } else {
            const subFolders = activeFolder.getFoldersByName(target);
            if (subFolders.hasNext()) {
                const found = subFolders.next();
                return {
                    status: 'success',
                    currentFolder: { id: found.getId(), name: found.getName() }
                };
            } else {
                throw new Error(`Carpeta '${target}' no encontrada en '${activeFolder.getName()}'.`);
            }
        }
    } else if (cmd === 'mkdir') {
        if (!args) throw new Error("Nombre de carpeta requerido para mkdir.");
        const newSub = activeFolder.createFolder(args.trim());
        return { status: 'success', message: `Carpeta '${newSub.getName()}' creada con ID: ${newSub.getId()}`, folderId: newSub.getId() };
    } else if (cmd === 'move') {
        // args: { fileId, targetFolderId }
        const { fileId, targetFolderId } = payload;
        if (!fileId || !targetFolderId) throw new Error("ID de archivo y ID de carpeta destino requeridos.");
        const file = DriveApp.getFileById(fileId);
        const targetDir = DriveApp.getFolderById(targetFolderId);
        file.moveTo(targetDir);
        return { status: 'success', message: `Archivo '${file.getName()}' movido a '${targetDir.getName()}'.` };
    } else if (cmd === 'tree') {
        function buildTree(folder, depth = 0) {
            if (depth > 2) return `${'  '.repeat(depth)}... (profundidad maxima)\n`;
            let result = `${'  '.repeat(depth)}📁 [${folder.getName()}]\n`;
            const files = folder.getFiles();
            while (files.hasNext()) {
                result += `${'  '.repeat(depth + 1)}📄 ${files.next().getName()}\n`;
            }
            const subs = folder.getFolders();
            while (subs.hasNext()) {
                result += buildTree(subs.next(), depth + 1);
            }
            return result;
        }
        const treeStr = buildTree(activeFolder);
        return { status: 'success', tree: treeStr };
    }

    throw new Error(`Comando de terminal '${command}' no reconocido.`);
}

// ============================================================================
// GESTIÓN Y RECUPERACIÓN DE IMÁGENES REEMPLAZADAS EN GOOGLE DRIVE (TAREA 2)
// ============================================================================

/**
 * Obtener o inicializar la hoja dedicada 'Imagenes_Reemplazadas'
 */
function getOrCreateReplacedImagesSheet() {
    let sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
    if (!sheet) {
        sheet = getSpreadsheet().insertSheet(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
        const headers = [
            "id_reemplazo",
            "fecha_reemplazo",
            "tipo_contenido",
            "registro_id",
            "campo",
            "archivo_drive_id",
            "nombre_archivo",
            "url_anterior",
            "sustituida_por_url",
            "referencia_texto",
            "estado"
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f0f4f8");
        sheet.setFrozenRows(1);
    }
    return sheet;
}

/**
 * Añade columnas de inventario sin alterar ni desplazar las once columnas históricas existentes.
 */
function ensureReplacedImagesInventoryColumns(sheet) {
    const baseHeaders = [
        "id_reemplazo", "fecha_reemplazo", "tipo_contenido", "registro_id", "campo",
        "archivo_drive_id", "nombre_archivo", "url_anterior", "sustituida_por_url",
        "referencia_texto", "estado"
    ];
    const actualBaseHeaders = sheet.getRange(1, 1, 1, baseHeaders.length).getDisplayValues()[0]
        .map(value => String(value || "").trim());
    if (baseHeaders.some((header, index) => actualBaseHeaders[index] !== header)) {
        throw new Error("La estructura base de la hoja «Imagenes_Reemplazadas» no coincide con el esquema esperado. No se modificó el inventario.");
    }

    const requiredHeaders = [
        "origen_registro",
        "tipo_mime",
        "ubicacion_original",
        "fecha_creacion_drive",
        "fecha_deteccion",
        "url_visualizacion",
        "ubicacion_actual",
        "ultima_auditoria_id",
        "tipo_registro",
        "estado_organizacion",
        "error_organizacion",
        "fecha_organizacion"
    ];
    const lastColumn = Math.max(sheet.getLastColumn(), baseHeaders.length);
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        .map(value => String(value || "").trim());

    requiredHeaders.forEach(header => {
        if (!headers.includes(header)) {
            const newColumn = sheet.getLastColumn() + 1;
            sheet.getRange(1, newColumn).setValue(header)
                .setFontWeight("bold").setBackground("#f0f4f8");
            headers.push(header);
        }
    });

    const lastRow = sheet.getLastRow();
    const typeColumn = headers.indexOf("tipo_registro") + 1;
    const originColumn = headers.indexOf("origen_registro") + 1;
    if (lastRow > 1 && typeColumn > 0 && originColumn > 0) {
        const typeValues = sheet.getRange(2, typeColumn, lastRow - 1, 1).getValues();
        const originValues = sheet.getRange(2, originColumn, lastRow - 1, 1).getValues();
        const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let hasChanges = false;
        for (let i = 0; i < typeValues.length; i++) {
            if (!typeValues[i][0] && idValues[i][0]) {
                typeValues[i][0] = String(originValues[i][0] || "") === "auditoria_drive"
                    ? "sin_uso_detectado"
                    : "reemplazada";
                hasChanges = true;
            }
        }
        if (hasChanges) sheet.getRange(2, typeColumn, lastRow - 1, 1).setValues(typeValues);
    }
    return headers;
}

/**
 * Registra una imagen reemplazada en la hoja dedicada
 */
function recordReplacedImage(data) {
    const driveId = extractDriveFileId(data && data.imagenAnteriorUrl);
    if (!driveId) throw new Error("La URL de la imagen anterior no contiene un ID de Google Drive válido.");

    const originalUrl = String(data.imagenAnteriorUrl || "").trim();
    const operationId = String(data && data.operationId || "").trim();
    if (operationId && !/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) {
        throw new Error("El identificador de operación del historial no es válido.");
    }

    let file = null;
    let fileName = "";
    if (!operationId) {
        file = DriveApp.getFileById(driveId);
        if (!String(file.getMimeType()).startsWith("image/")) {
            throw new Error("El archivo anterior no es una imagen válida para el historial.");
        }
        fileName = file.getName();
    }

    const completeOriginalUrl = /^https?:\/\//i.test(originalUrl)
        ? originalUrl
        : (file ? file.getUrl() : DriveApp.getFileById(driveId).getUrl());
    const sheet = getOrCreateReplacedImagesSheet();
    const inventoryHeaders = ensureReplacedImagesInventoryColumns(sheet);
    const newId = operationId ? "REP-" + operationId : "REP-" + Utilities.getUuid();
    const existing = operationId ? findReplacedImageRecordById(sheet, newId) : null;
    const newImageUrl = String(data.sustituidaPorUrl || "").trim();

    if (existing) {
        const values = existing.values;
        if (String(values[2] || "") !== String(data.tipoContenido || "vehiculo") ||
            String(values[3] || "") !== String(data.registroId || "") ||
            String(values[4] || "") !== String(data.campo || "") ||
            String(values[7] || "") !== completeOriginalUrl) {
            throw new Error("El opId del historial ya está asociado a otra imagen anterior, vehículo o campo.");
        }

        if (String(values[8] || "") === newImageUrl) {
            const status = String(values[10] || "");
            const changed = status === "cancelada" || status === "requiere_revision" || status === "restablecida";
            if (changed) {
                sheet.getRange(existing.rowIndex, 11).setValue("historica");
                SpreadsheetApp.flush();
            }
            return {
                id: newId, rowIndex: existing.rowIndex, driveId: driveId,
                created: false, changed: changed
            };
        }

        const previousTargetId = extractDriveFileId(values[8]);
        let previousTargetUnavailable = !previousTargetId;
        if (previousTargetId) {
            try {
                previousTargetUnavailable = DriveApp.getFileById(previousTargetId).isTrashed();
            } catch (targetError) {
                previousTargetUnavailable = true;
            }
        }
        if (["cancelada", "requiere_revision"].includes(String(values[10] || "")) || previousTargetUnavailable) {
            sheet.getRange(existing.rowIndex, 9).setValue(newImageUrl);
            sheet.getRange(existing.rowIndex, 10).setValue(data.nombreVehiculo || values[9] || "");
            sheet.getRange(existing.rowIndex, 11).setValue("historica");
            SpreadsheetApp.flush();
            return {
                id: newId, rowIndex: existing.rowIndex, driveId: driveId,
                created: false, changed: true
            };
        }
        throw new Error("El registro histórico del opId ya apunta a otra sustitución activa; no se duplicó ni sobrescribió.");
    }

    if (!file) {
        file = DriveApp.getFileById(driveId);
        if (!String(file.getMimeType()).startsWith("image/")) {
            throw new Error("El archivo anterior no es una imagen válida para el historial.");
        }
        fileName = file.getName();
    }
    const formattedDate = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
    const rowIndex = sheet.getLastRow() + 1;

    try {
        sheet.getRange(rowIndex, 1, 1, 11).setValues([[
            newId, formattedDate, data.tipoContenido || "vehiculo", data.registroId || "",
            data.campo || "", driveId, fileName, completeOriginalUrl,
            newImageUrl, data.nombreVehiculo || "", "historica"
        ]]);
        sheet.getRange(rowIndex, inventoryHeaders.indexOf("origen_registro") + 1).setValue("reemplazo");
        sheet.getRange(rowIndex, inventoryHeaders.indexOf("tipo_registro") + 1).setValue("reemplazada");
        SpreadsheetApp.flush();
    } catch (writeError) {
        try {
            if (String(sheet.getRange(rowIndex, 1).getValue()) === newId) {
                sheet.getRange(rowIndex, 11).setValue("requiere_revision");
                SpreadsheetApp.flush();
            }
        } catch (statusError) {}
        throw new Error("No se pudo confirmar el registro de la imagen anterior: " + writeError.message);
    }
    return { id: newId, rowIndex: rowIndex, driveId: driveId, created: true, changed: true };
}

/**
 * Handler: Consultar imágenes reemplazadas
 */

function handleGetDriveStorage(payload, logMessage) {
    const parseBytes = value => {
        if ((typeof value !== "number" && typeof value !== "string") ||
            (typeof value === "string" && value.trim() === "")) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };

    let quota = null, quotaWarning = "", driveUsedBytes = null, accountUsedBytes = null, limitBytes = null;
    let driveUsageSource = "", quotaSource = "", quotaStatus = "unavailable";

    try {
        if (typeof DriveApp.getStorageUsed === "function") {
            const used = parseBytes(DriveApp.getStorageUsed());
            if (used !== null) {
                driveUsedBytes = used;
                driveUsageSource = "DriveApp.getStorageUsed";
            }
        }
    } catch (error) {
        quotaWarning = "DriveApp no pudo consultar el uso global: " + error.message;
    }

    try {
        const response = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", {
            method: "get", headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
        });
        const code = response.getResponseCode();
        if (code < 200 || code >= 300) throw new Error("Drive API respondió HTTP " + code + ".");

        const body = JSON.parse(response.getContentText() || "{}");
        quota = body && body.storageQuota && typeof body.storageQuota === "object" && !Array.isArray(body.storageQuota)
            ? body.storageQuota : null;
        if (!quota) throw new Error("Drive API no devolvió un objeto storageQuota válido.");

        const driveUsage = parseBytes(quota.usageInDrive);
        const accountUsage = parseBytes(quota.usage);
        if (driveUsage !== null) {
            driveUsedBytes = driveUsage;
            driveUsageSource = "Google Drive API usageInDrive";
        }
        if (accountUsage !== null) accountUsedBytes = accountUsage;

        const hasLimitField = Object.prototype.hasOwnProperty.call(quota, "limit");
        if (hasLimitField) {
            const limit = parseBytes(quota.limit);
            if (limit !== null && limit > 0) {
                limitBytes = limit;
                quotaStatus = "available";
            } else {
                quotaStatus = "unavailable";
                quotaWarning = [quotaWarning, "Drive API devolvió un campo limit vacío o no válido; no se calcularán cuota restante ni porcentaje."].filter(Boolean).join(" ");
            }
        } else if (driveUsage !== null || accountUsage !== null) {
            // Drive API omite storageQuota.limit cuando la cuenta no tiene un límite aplicable.
            quotaStatus = "unlimited";
        } else {
            throw new Error("Drive API devolvió storageQuota sin valores de uso ni un límite verificable.");
        }

        quotaSource = "Google Drive API storageQuota";
    } catch (error) {
        quotaStatus = "unavailable";
        quotaWarning = [quotaWarning, "No se pudo consultar la cuota de Drive: " + error.message].filter(Boolean).join(" ");
    }

    if (driveUsedBytes === null) {
        throw new Error("No se pudo obtener el uso global de Google Drive. " + quotaWarning);
    }

    const remainingBytes = limitBytes !== null && accountUsedBytes !== null
        ? Math.max(0, limitBytes - accountUsedBytes) : null;
    const usagePercent = limitBytes !== null && accountUsedBytes !== null
        ? Math.min(100, Math.max(0, accountUsedBytes / limitBytes * 100)) : null;
    const quotaDescription = quotaStatus === "available"
        ? limitBytes + " bytes"
        : (quotaStatus === "unlimited" ? "ilimitada según Drive API" : "no disponible");

    logMessage && logMessage("Almacenamiento global de Drive",
        "Uso de Drive consultado: " + driveUsedBytes + " bytes; cuota: " + quotaDescription + ".");
    const source = [driveUsageSource, quotaSource].filter(Boolean).join(" + ");
    return {
        status: "success",
        driveUsedBytes,
        accountUsedBytes,
        limitBytes,
        remainingBytes,
        usagePercent,
        quotaStatus,
        source,
        warning: quotaWarning,
        capturedAt: new Date().toISOString()
    };
}

function handleGetReplacedImages(payload, logMessage) {
    const references = collectCortesImageReferences(false);
    if (references.unverifiableReferenceCount > 0) {
        throw new Error("No se puede confirmar qué imágenes están sin uso porque hay " + references.unverifiableReferenceCount +
            " referencias de Drive no interpretables en los campos de imagen de «Cortes». Corrige esas referencias y vuelve a consultar.");
    }
    const sheet = getOrCreateReplacedImagesSheet();
    const headers = ensureReplacedImagesInventoryColumns(sheet);
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { status: "success", data: [] };
    const columnIndex = name => headers.indexOf(name);
    const valueAt = (row, name) => { const index = columnIndex(name); return index >= 0 ? row[index] : ""; };
    const result = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row[0]) continue;
        let type;
        try { type = getReplacedImageRecordType(row, headers); } catch (classificationError) { continue; }
        const status = String(row[10] || (type === "sin_uso_detectado" ? "sin_uso_detectado" : "historica"));
        if (type === "sin_uso_detectado" && status !== "sin_uso_detectado") continue;
        if (type === "reemplazada" && !["historica", "restablecida"].includes(status)) continue;
        const driveId = extractDriveFileId(row[5]) || extractDriveFileId(row[7]);
        if (!driveId || references.references.has(driveId)) continue;
        result.push({
            id_reemplazo: row[0], fecha_reemplazo: row[1], tipo_contenido: row[2], registro_id: row[3], campo: row[4],
            archivo_drive_id: row[5], nombre_archivo: row[6], url_anterior: row[7], sustituida_por_url: row[8],
            referencia_texto: row[9], estado: status, origen_registro: valueAt(row, "origen_registro") || "reemplazo",
            tipo_registro: type, tipo_mime: valueAt(row, "tipo_mime"), ubicacion_original: valueAt(row, "ubicacion_original"),
            fecha_creacion_drive: valueAt(row, "fecha_creacion_drive"), fecha_deteccion: valueAt(row, "fecha_deteccion"),
            url_visualizacion: valueAt(row, "url_visualizacion"), ubicacion_actual: valueAt(row, "ubicacion_actual"),
            ultima_auditoria_id: valueAt(row, "ultima_auditoria_id"),
            estado_organizacion: valueAt(row, "estado_organizacion"),
            error_organizacion: valueAt(row, "error_organizacion"),
            fecha_organizacion: valueAt(row, "fecha_organizacion")
        });
    }
    logMessage && logMessage("Gestor de imágenes sin uso", `Se consultaron ${result.length} imágenes sin referencias activas en «Cortes».`);
    return { status: "success", data: result.reverse() };
}
function getReplacedImageRecordType(row, headers) {
    const typeIndex = headers.indexOf("tipo_registro");
    const originIndex = headers.indexOf("origen_registro");
    const origin = originIndex >= 0 ? String(row[originIndex] || "") : "";
    const storedType = typeIndex >= 0 ? String(row[typeIndex] || "") : "";
    const type = storedType || (origin === "auditoria_drive" ? "sin_uso_detectado" : "reemplazada");
    const contentType = String(row[2] || "");

    if (!["sin_uso_detectado", "reemplazada"].includes(type)) {
        throw new Error("La clasificación del registro de imagen no es válida.");
    }
    if (type === "sin_uso_detectado" && (origin !== "auditoria_drive" || contentType !== "inventario_sin_uso")) {
        throw new Error("La clasificación de inventario no coincide con el origen y tipo de contenido registrados.");
    }
    if (type === "reemplazada" && (origin === "auditoria_drive" || contentType === "inventario_sin_uso")) {
        throw new Error("La clasificación de reemplazo no coincide con el origen y tipo de contenido registrados.");
    }
    return type;
}

/**
 * Handler: Recuperar una imagen histórica
 */
function handleRecoverReplacedImage(payload, logMessage) {
    const idReemplazo = payload && payload.id_reemplazo;
    if (!idReemplazo) throw new Error("ID de reemplazo requerido.");

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la restauración. Intenta nuevamente."); }

    try {
        const sheetRep = getOrCreateReplacedImagesSheet();
        const inventoryHeaders = ensureReplacedImagesInventoryColumns(sheetRep);
        const rowsRep = sheetRep.getDataRange().getValues();
        let repRowIndex = -1;
        let repData = null;
        for (let r = 1; r < rowsRep.length; r++) {
            if (String(rowsRep[r][0]) === String(idReemplazo)) {
                repRowIndex = r + 1;
                repData = rowsRep[r];
                break;
            }
        }
        if (!repData) throw new Error("Registro de imagen reemplazada no encontrado.");

        const recordType = getReplacedImageRecordType(repData, inventoryHeaders);
        if (recordType !== "reemplazada") {
            throw new Error("Esta imagen no tiene una relación de reemplazo que permita restaurarla.");
        }

        const tipoContenido = String(repData[2] || "").trim().toLowerCase();
        if (tipoContenido !== "vehiculo") {
            throw new Error("Tipo de contenido no compatible. La restauración está limitada a imágenes de vehículos en Cortes.");
        }

        const registroId = repData[3];
        const campo = String(repData[4] || "").trim();
        const imageFields = new Set([
            "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
            "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
        ]);
        if (!registroId || !imageFields.has(campo) || !COLS_CORTES[campo]) {
            throw new Error("El registro histórico no identifica un vehículo y un campo de imagen admitidos.");
        }

        const urlHistorica = String(repData[7] || "").trim();
        const urlDriveId = extractDriveFileId(urlHistorica);
        const recordedDriveId = extractDriveFileId(repData[5]);
        const driveId = recordedDriveId || urlDriveId;
        if (!urlHistorica || !driveId || !urlDriveId || driveId !== urlDriveId) {
            throw new Error("El registro histórico no contiene una URL y un ID de Drive coincidentes.");
        }
        const file = DriveApp.getFileById(driveId);
        if (!String(file.getMimeType()).startsWith("image/")) throw new Error("El archivo histórico no es una imagen y no puede restaurarse.");
        const fileWasTrashed = file.isTrashed();
        getCortesRootFolder();
        if (!isFileInsideCortes(file, DRIVE_FOLDER_ID)) throw new Error("El archivo histórico no pertenece al árbol autorizado de la carpeta «Cortes».");
        const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if (!cortesSheet || cortesSheet.getLastRow() < 2) throw new Error("No se pudo localizar la hoja Cortes o no contiene vehículos.");
        const ids = cortesSheet.getRange(2, 1, cortesSheet.getLastRow() - 1, 1).getValues().flat();
        const vehicleIndex = ids.findIndex(id => String(id) === String(registroId));
        if (vehicleIndex === -1) throw new Error(`Vehículo ID '${registroId}' no encontrado en el catálogo.`);

        const actualRow = vehicleIndex + 2;
        const activeCell = cortesSheet.getRange(actualRow, COLS_CORTES[campo]);
        const currentActiveUrl = String(activeCell.getValue() || "").trim();
        if (currentActiveUrl && !extractDriveFileId(currentActiveUrl)) {
            throw new Error("La imagen activa actual no tiene un ID de Drive reconocible; no se puede intercambiar de forma segura.");
        }

        let swappedRecord = null;
        if (currentActiveUrl && currentActiveUrl !== urlHistorica) {
            swappedRecord = recordReplacedImage({
                tipoContenido: "vehiculo", registroId: registroId, campo: campo,
                imagenAnteriorUrl: currentActiveUrl, sustituidaPorUrl: urlHistorica,
                nombreVehiculo: repData[9] || ""
            });
        }

        try {
            if (fileWasTrashed) file.setTrashed(false);
            activeCell.setValue(urlHistorica);
            SpreadsheetApp.flush();
            sheetRep.getRange(repRowIndex, 11).setValue("restablecida");
            SpreadsheetApp.flush();
        } catch (operationError) {
            let rollbackFailed = false;
            let rollbackErrorMessage = "";
            try {
                if (String(activeCell.getValue()) === urlHistorica) {
                    activeCell.setValue(currentActiveUrl);
                    SpreadsheetApp.flush();
                }
            } catch (rollbackError) {
                rollbackFailed = true;
                rollbackErrorMessage = rollbackError.message;
            }

            if (fileWasTrashed && !file.isTrashed()) {
                try {
                    file.setTrashed(true);
                } catch (fileRollbackError) {
                    rollbackFailed = true;
                    rollbackErrorMessage += (rollbackErrorMessage ? "; " : "") + "No se pudo devolver el archivo a la papelera: " + fileRollbackError.message;
                }
            }
            if (swappedRecord) {
                try {
                    sheetRep.getRange(swappedRecord.rowIndex, 11).setValue(rollbackFailed ? "requiere_revision" : "cancelada");
                } catch (statusError) {}
            }
            if (rollbackFailed) {
                throw new Error(`Falló la restauración y también la reversión de la referencia activa: ${operationError.message}; ${rollbackErrorMessage}`);
            }
            throw operationError;
        }

        logMessage && logMessage("Imágenes Reemplazadas", `Imagen histórica restaurada para el vehículo '${registroId}', campo '${campo}'.`);
        return {
            status: "success",
            message: "La imagen histórica quedó activa y la versión anterior se conservó en el historial.",
            restoredUrl: urlHistorica
        };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Registra en ActividadUsuario las acciones de administración de imágenes ejecutadas por un desarrollador.
 * El registro es informativo: un fallo al escribirlo no revierte una operación ya confirmada en Drive.
 */
function recordImageAdministrationActivity(developerContext, activityType, associatedId, details) {
    try {
        if (!developerContext || !developerContext.userId) return;
        const sheet = getSpreadsheet().getSheetByName("ActividadUsuario");
        if (!sheet) throw new Error("No se encontró la hoja ActividadUsuario.");

        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const lastColumn = Math.max(sheet.getLastColumn(), 7);
        if (lastRow >= 2) {
            const formulaRange = sheet.getRange(2, 1, 1, lastColumn);
            const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastColumn);
            formulaRange.copyTo(newRowRange);
            if (lastColumn > 1) sheet.getRange(newRowNumber, 2, 1, lastColumn - 1).clearContent();
        }

        sheet.getRange(newRowNumber, 2, 1, 6).setValues([[
            new Date().toISOString(),
            developerContext.userId,
            developerContext.userName || "Usuario",
            activityType,
            associatedId || "",
            details || ""
        ]]);
        SpreadsheetApp.flush();
    } catch (error) {
        Logger.log("No se pudo registrar la acción de administración de imágenes: " + error.message);
    }
}

/**
 * Valida que un archivo o carpeta tenga una única carpeta principal dentro del árbol Cortes.
 */
function getSingleParentFolderInsideCortes(resource, rootFolderId) {
    const parents = resource.getParents();
    const validParents = [];
    while (parents.hasNext()) {
        const parent = parents.next();
        if (parent.isTrashed()) throw new Error("Operación bloqueada: la carpeta principal está en la papelera de Google Drive.");
        if (!isFolderInsideCortes(parent, rootFolderId)) {
            throw new Error("Operación bloqueada: el recurso tiene una ubicación fuera del árbol «Cortes».");
        }
        validParents.push(parent);
    }
    if (validParents.length !== 1) {
        throw new Error("Operación bloqueada: no se pudo confirmar una única carpeta principal dentro de «Cortes».");
    }
    return validParents[0];
}


/**
 * Obtiene o crea la carpeta única Cortes/Imagenes_Sin_Uso.
 * La identidad se conserva en ScriptProperties y se vuelve a validar contra el árbol autorizado.
 */
function getOrCreateUnusedImagesFolder(rootFolder) {
    const folderName = "Imagenes_Sin_Uso";
    const propertyKey = "GPSpedia_UNUSED_IMAGES_FOLDER_ID";
    const properties = PropertiesService.getScriptProperties();
    const storedId = String(properties.getProperty(propertyKey) || "").trim();

    if (storedId) {
        const storedFolder = DriveApp.getFolderById(storedId);
        if (storedFolder.isTrashed() || storedFolder.getName() !== folderName) {
            throw new Error("La carpeta de administración registrada ya no es válida. No se creó otra carpeta para evitar duplicados.");
        }
        const storedParent = getSingleParentFolderInsideCortes(storedFolder, rootFolder.getId());
        if (storedParent.getId() !== rootFolder.getId()) {
            throw new Error("La carpeta de administración registrada ya no es hija directa de «Cortes».");
        }
        return { folder: storedFolder, created: false };
    }

    const matches = rootFolder.getFoldersByName(folderName);
    let folder = null;
    while (matches.hasNext()) {
        const candidate = matches.next();
        if (candidate.isTrashed()) continue;
        if (folder) {
            throw new Error("Existen varias carpetas «Imagenes_Sin_Uso» directamente dentro de «Cortes». Debe resolverse el duplicado antes de organizar imágenes.");
        }
        folder = candidate;
    }

    let created = false;
    if (!folder) {
        folder = rootFolder.createFolder(folderName);
        created = true;
    }

    const parent = getSingleParentFolderInsideCortes(folder, rootFolder.getId());
    if (parent.getId() !== rootFolder.getId()) {
        throw new Error("La carpeta «Imagenes_Sin_Uso» no quedó ubicada directamente dentro de «Cortes».");
    }

    try {
        properties.setProperty(propertyKey, folder.getId());
    } catch (propertyError) {
        Logger.log("No se pudo persistir el ID de Imagenes_Sin_Uso: " + propertyError.message);
    }
    return { folder: folder, created: created };
}

/**
 * Envía a la papelera una imagen administrada, conservando la posibilidad de recuperación.
 */
function handleDeleteReplacedImage(payload, logMessage, developerContext) {
    const idReemplazo = payload && payload.id_reemplazo;
    if (!idReemplazo) throw new Error("ID de registro de imagen requerido.");

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la validación de uso de la imagen. Intenta nuevamente."); }

    try {
        const sheetRep = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheetRep);
        const rowsRep = sheetRep.getDataRange().getValues();
        const column = name => headers.indexOf(name);
        let repRowIndex = -1;
        let repData = null;
        for (let r = 1; r < rowsRep.length; r++) {
            if (String(rowsRep[r][0]) === String(idReemplazo)) {
                repRowIndex = r + 1;
                repData = rowsRep[r];
                break;
            }
        }
        if (!repData) throw new Error("Registro de imagen no encontrado.");

        const type = getReplacedImageRecordType(repData, headers);
        const status = String(repData[10] || "historica");
        if (type === "sin_uso_detectado" && status !== "sin_uso_detectado") {
            throw new Error("La imagen ya no está confirmada como sin uso en la última auditoría y no puede enviarse a papelera desde este registro.");
        }
        if (type === "reemplazada" && !["historica", "restablecida"].includes(status)) {
            throw new Error("El estado del registro histórico no permite enviar esta imagen a papelera.");
        }
        if (!["sin_uso_detectado", "reemplazada"].includes(type)) {
            throw new Error("La clasificación del registro no permite administrar esta imagen.");
        }

        const driveId = extractDriveFileId(repData[5]) || extractDriveFileId(repData[7]);
        if (!driveId) throw new Error("El registro no contiene un ID de Drive válido.");

        const referenceSnapshot = collectCortesImageReferences();
        const activeReferences = referenceSnapshot.references.get(driveId) || [];
        if (activeReferences.length) {
            const locations = activeReferences.slice(0, 5)
                .map(ref => ref.sheet + ", fila " + ref.row + ", columna " + ref.column)
                .join("; ");
            throw new Error("Operación bloqueada: la imagen mantiene referencias en uso en la Spreadsheet: " + locations + ".");
        }
        if (referenceSnapshot.unverifiableReferenceCount > 0) {
            throw new Error("Operación bloqueada: existen " + referenceSnapshot.unverifiableReferenceCount + " referencias de Drive que no pudieron interpretarse. No es posible confirmar que el archivo esté sin uso.");
        }

        const file = DriveApp.getFileById(driveId);
        if (file.isTrashed()) throw new Error("La imagen ya se encuentra en la papelera de Google Drive.");
        if (!String(file.getMimeType()).startsWith("image/")) {
            throw new Error("El archivo asociado al registro no es una imagen.");
        }
        const rootFolder = getCortesRootFolder();
        const sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
        const sourcePath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());

        file.setTrashed(true);
        try {
            sheetRep.getRange(repRowIndex, 11).setValue("en_papelera");
            SpreadsheetApp.flush();
        } catch (historyError) {
            try {
                file.setTrashed(false);
                sheetRep.getRange(repRowIndex, 11).setValue(status);
                SpreadsheetApp.flush();
            } catch (restoreError) {
                throw new Error("La imagen fue enviada a papelera, falló la actualización del historial y no pudo revertirse completamente: " + historyError.message + "; " + restoreError.message);
            }
            throw new Error("No se pudo actualizar el estado del registro; la operación fue revertida: " + historyError.message);
        }

        recordImageAdministrationActivity(developerContext, "admin_image_trash", idReemplazo,
            "Imagen " + file.getName() + " enviada a papelera desde " + sourcePath + "; resultado: correcto.");
        logMessage && logMessage("Inventario e historial de imágenes", "La imagen " + driveId + " fue enviada a la papelera de Google Drive.");
        return {
            status: "success",
            message: "La imagen fue enviada a la papelera de Google Drive. Esta acción no equivale a una eliminación irreversible."
        };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Devuelve las carpetas disponibles dentro del árbol autorizado Cortes.
 */
function handleGetCortesImageFolders(payload, logMessage) {
    const rootFolder = getCortesRootFolder();
    const folders = [];
    const visited = new Set();
    const stack = [{ folder: rootFolder, path: rootFolder.getName(), parentId: "" }];

    while (stack.length) {
        const current = stack.pop();
        const folderId = current.folder.getId();
        if (visited.has(folderId)) continue;
        visited.add(folderId);
        folders.push({
            id: folderId,
            name: current.folder.getName(),
            path: current.path,
            parentId: current.parentId
        });

        const children = current.folder.getFolders();
        while (children.hasNext()) {
            const child = children.next();
            if (child.isTrashed()) continue;
            getSingleParentFolderInsideCortes(child, rootFolder.getId());
            stack.push({
                folder: child,
                path: current.path + "/" + child.getName(),
                parentId: folderId
            });
        }
    }

    folders.sort((a, b) => a.path.localeCompare(b.path));
    logMessage && logMessage("Carpetas de Cortes", "Se consultaron " + folders.length + " carpetas autorizadas.");
    return { status: "success", rootFolderId: rootFolder.getId(), folders: folders };
}

/**
 * Crea una carpeta únicamente dentro del árbol Cortes.
 */
function handleCreateCortesImageFolder(payload, logMessage, developerContext) {
    const name = String(payload && payload.name || "").trim();
    const parentFolderId = String(payload && payload.parentFolderId || DRIVE_FOLDER_ID).trim();
    if (!name) throw new Error("Escribe el nombre de la carpeta.");
    if (name.length > 100 || /[\\/]/.test(name) || name === "." || name === "..") {
        throw new Error("El nombre de la carpeta no es válido.");
    }

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la creación de la carpeta. Intenta nuevamente."); }

    try {
        const rootFolder = getCortesRootFolder();
        const parentFolder = DriveApp.getFolderById(parentFolderId);
        if (parentFolder.isTrashed()) throw new Error("No se puede crear una carpeta dentro de una ubicación que está en la papelera.");
        if (parentFolder.getId() !== rootFolder.getId()) {
            getSingleParentFolderInsideCortes(parentFolder, rootFolder.getId());
        }
        const siblings = parentFolder.getFoldersByName(name);
        if (siblings.hasNext()) {
            throw new Error("Ya existe una carpeta con ese nombre en la ubicación seleccionada.");
        }
        const created = parentFolder.createFolder(name);
        getSingleParentFolderInsideCortes(created, rootFolder.getId());
        const path = getFolderPathInsideCortes(created, rootFolder.getId());
        recordImageAdministrationActivity(developerContext, "admin_image_folder_create", created.getId(),
            "Carpeta creada: " + path + "; carpeta principal: " + getFolderPathInsideCortes(parentFolder, rootFolder.getId()) + "; resultado: correcto.");
        logMessage && logMessage("Carpetas de Cortes", "Se creó la carpeta " + path + ".");
        return { status: "success", folderId: created.getId(), folderName: created.getName(), folderPath: path };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Mueve una imagen registrada a otra carpeta del árbol Cortes y actualiza su ubicación.
 */
function handleMoveReplacedImage(payload, logMessage, developerContext) {
    const idReemplazo = payload && payload.id_reemplazo;
    const targetFolderId = String(payload && payload.targetFolderId || "").trim();
    if (!idReemplazo || !targetFolderId) throw new Error("Selecciona el registro de imagen y una carpeta destino.");

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear el movimiento de la imagen. Intenta nuevamente."); }

    try {
        const sheet = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheet);
        const rows = sheet.getDataRange().getValues();
        const column = name => headers.indexOf(name);
        let rowIndex = -1;
        let row = null;
        for (let r = 1; r < rows.length; r++) {
            if (String(rows[r][0]) === String(idReemplazo)) {
                rowIndex = r + 1;
                row = rows[r];
                break;
            }
        }
        if (!row) throw new Error("Registro de imagen no encontrado.");

        const type = getReplacedImageRecordType(row, headers);
        const status = String(row[10] || "historica");
        if (type === "sin_uso_detectado" && status !== "sin_uso_detectado") {
            throw new Error("La imagen ya no está confirmada como sin uso en la última auditoría; no puede moverse desde este registro.");
        }
        if (type === "reemplazada" && !["historica", "restablecida"].includes(status)) {
            throw new Error("El estado del registro histórico no permite mover esta imagen.");
        }
        if (!["sin_uso_detectado", "reemplazada"].includes(type)) {
            throw new Error("La clasificación del registro no permite mover esta imagen.");
        }

        const driveId = extractDriveFileId(row[5]) || extractDriveFileId(row[7]);
        if (!driveId) throw new Error("El registro no contiene un ID de Drive válido.");
        const referenceSnapshot = collectCortesImageReferences();
        if (referenceSnapshot.references.has(driveId)) {
            throw new Error("Operación bloqueada: la imagen tiene referencias activas en la Spreadsheet.");
        }
        if (referenceSnapshot.unverifiableReferenceCount > 0) {
            throw new Error("Operación bloqueada: existen referencias de Drive que no pudieron interpretarse; no es posible confirmar que la imagen esté sin uso.");
        }

        const rootFolder = getCortesRootFolder();
        const file = DriveApp.getFileById(driveId);
        if (file.isTrashed()) throw new Error("La imagen está en la papelera de Google Drive.");
        if (!String(file.getMimeType()).startsWith("image/")) throw new Error("El archivo asociado al registro ya no es una imagen.");
        const sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
        const targetFolder = DriveApp.getFolderById(targetFolderId);
        if (targetFolder.isTrashed()) throw new Error("La carpeta destino está en la papelera de Google Drive.");
        if (targetFolder.getId() !== rootFolder.getId()) {
            getSingleParentFolderInsideCortes(targetFolder, rootFolder.getId());
        }

        const sourcePath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());
        const targetPath = getFolderPathInsideCortes(targetFolder, rootFolder.getId());
        const metadata = {
            original: column("ubicacion_original") + 1,
            current: column("ubicacion_actual") + 1,
            mime: column("tipo_mime") + 1,
            visual: column("url_visualizacion") + 1,
            type: column("tipo_registro") + 1,
            organization: column("estado_organizacion") + 1,
            organizationError: column("error_organizacion") + 1,
            organizationDate: column("fecha_organizacion") + 1
        };
        const previousMetadata = {
            original: row[metadata.original - 1] || "",
            current: row[metadata.current - 1] || "",
            mime: row[metadata.mime - 1] || "",
            visual: row[metadata.visual - 1] || "",
            type: row[metadata.type - 1] || type,
            organization: row[metadata.organization - 1] || "",
            organizationError: row[metadata.organizationError - 1] || "",
            organizationDate: row[metadata.organizationDate - 1] || ""
        };
        const isUnusedDestination = targetFolder.getName() === "Imagenes_Sin_Uso" &&
            getSingleParentFolderInsideCortes(targetFolder, rootFolder.getId()).getId() === rootFolder.getId();
        const writeMetadata = (currentPath) => {
            if (!previousMetadata.original) sheet.getRange(rowIndex, metadata.original).setValue(sourcePath);
            sheet.getRange(rowIndex, metadata.current).setValue(currentPath);
            if (!previousMetadata.mime) sheet.getRange(rowIndex, metadata.mime).setValue(file.getMimeType());
            if (!previousMetadata.visual) sheet.getRange(rowIndex, metadata.visual).setValue("https://lh3.googleusercontent.com/d/" + driveId);
            sheet.getRange(rowIndex, metadata.type).setValue(type);
            if (type === "sin_uso_detectado") {
                sheet.getRange(rowIndex, metadata.organization).setValue(isUnusedDestination ? "organizada" : "movida_manual");
                sheet.getRange(rowIndex, metadata.organizationError).setValue("");
                if (!previousMetadata.organizationDate) {
                    sheet.getRange(rowIndex, metadata.organizationDate).setValue(Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss"));
                }
            }
            SpreadsheetApp.flush();
        };
        const restoreMetadata = () => {
            sheet.getRange(rowIndex, metadata.original).setValue(previousMetadata.original);
            sheet.getRange(rowIndex, metadata.current).setValue(previousMetadata.current);
            sheet.getRange(rowIndex, metadata.mime).setValue(previousMetadata.mime);
            sheet.getRange(rowIndex, metadata.visual).setValue(previousMetadata.visual);
            sheet.getRange(rowIndex, metadata.type).setValue(previousMetadata.type);
            sheet.getRange(rowIndex, metadata.organization).setValue(previousMetadata.organization);
            sheet.getRange(rowIndex, metadata.organizationError).setValue(previousMetadata.organizationError);
            sheet.getRange(rowIndex, metadata.organizationDate).setValue(previousMetadata.organizationDate);
            SpreadsheetApp.flush();
        };

        if (sourceFolder.getId() === targetFolder.getId()) {
            writeMetadata(targetPath);
            return { status: "success", message: "La imagen ya se encontraba en la carpeta seleccionada.", folderPath: targetPath };
        }

        try {
            file.moveTo(targetFolder);
            const movedParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
            if (movedParent.getId() !== targetFolder.getId()) {
                throw new Error("Drive no confirmó la ubicación destino solicitada.");
            }
        } catch (moveError) {
            try {
                const currentParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                if (currentParent.getId() !== sourceFolder.getId()) file.moveTo(sourceFolder);
                const restoredParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                if (restoredParent.getId() !== sourceFolder.getId()) throw new Error("Drive no confirmó la ubicación anterior.");
            } catch (rollbackError) {
                throw new Error("Falló el movimiento y tampoco pudo confirmarse la reversión: " + moveError.message + "; " + rollbackError.message);
            }
            throw new Error("No se pudo completar el movimiento; se conservó la ubicación anterior: " + moveError.message);
        }

        try {
            writeMetadata(targetPath);
        } catch (historyError) {
            let driveRollbackError = null;
            try {
                file.moveTo(sourceFolder);
                const restoredParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                if (restoredParent.getId() !== sourceFolder.getId()) throw new Error("Drive no confirmó la ubicación anterior.");
            } catch (rollbackError) {
                driveRollbackError = rollbackError;
            }

            if (driveRollbackError) {
                try {
                    sheet.getRange(rowIndex, metadata.current).setValue(targetPath);
                    SpreadsheetApp.flush();
                } catch (syncError) {}
                throw new Error("La imagen se movió a " + targetPath + ", pero falló la actualización de Spreadsheet y tampoco pudo revertirse: " + historyError.message + "; " + driveRollbackError.message);
            }

            try {
                restoreMetadata();
            } catch (metadataRollbackError) {
                try {
                    sheet.getRange(rowIndex, metadata.current).setValue(sourcePath);
                    SpreadsheetApp.flush();
                } catch (syncError) {}
                throw new Error("El movimiento fue revertido en Drive, pero no se pudo restaurar toda la metadata de Spreadsheet: " + historyError.message + "; " + metadataRollbackError.message);
            }
            throw new Error("No se pudo actualizar la ubicación en Spreadsheet; el movimiento fue revertido: " + historyError.message);
        }

        recordImageAdministrationActivity(developerContext, "admin_image_move", idReemplazo,
            "Imagen " + file.getName() + " movida de " + sourcePath + " a " + targetPath + "; resultado: correcto.");
        logMessage && logMessage("Inventario e historial de imágenes", "La imagen " + driveId + " se movió de " + sourcePath + " a " + targetPath + ".");
        return { status: "success", message: "Imagen movida correctamente.", folderPath: targetPath };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Devuelve un enlace de descarga para una imagen administrada, sin modificar sus permisos.
 */
function handleGetReplacedImageDownloadUrl(payload, logMessage, developerContext) {
    const idReemplazo = payload && payload.id_reemplazo;
    if (!idReemplazo) throw new Error("ID de registro de imagen requerido.");
    const sheet = getOrCreateReplacedImagesSheet();
    const headers = ensureReplacedImagesInventoryColumns(sheet);
    const rows = sheet.getDataRange().getValues();
    const column = name => headers.indexOf(name);
    let row = null;
    for (let r = 1; r < rows.length; r++) {
        if (String(rows[r][0]) === String(idReemplazo)) {
            row = rows[r];
            break;
        }
    }
    if (!row) throw new Error("Registro de imagen no encontrado.");

    const type = getReplacedImageRecordType(row, headers);
    const status = String(row[10] || "historica");
    if (type === "sin_uso_detectado" && status !== "sin_uso_detectado") {
        throw new Error("La imagen ya no está confirmada como sin uso en la última auditoría.");
    }
    if (type === "reemplazada" && !["historica", "restablecida"].includes(status)) {
        throw new Error("El estado del registro histórico no permite descargar esta imagen.");
    }

    const driveId = extractDriveFileId(row[5]) || extractDriveFileId(row[7]);
    if (!driveId) throw new Error("El registro no contiene un ID de Drive válido.");
    const references = collectCortesImageReferences(false);
    if (references.unverifiableReferenceCount > 0 || references.references.has(driveId)) {
        throw new Error("La descarga está bloqueada porque no se pudo confirmar que la imagen siga sin uso en la hoja «Cortes».");
    }
    const file = DriveApp.getFileById(driveId);
    if (file.isTrashed()) throw new Error("La imagen está en la papelera de Google Drive.");
    if (!String(file.getMimeType()).startsWith("image/")) throw new Error("El archivo asociado al registro ya no es una imagen.");
    const rootFolder = getCortesRootFolder();
    getSingleParentFolderInsideCortes(file, rootFolder.getId());

    const downloadUrl = "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(driveId);
    const folderPath = getFolderPathInsideCortes(getSingleParentFolderInsideCortes(file, rootFolder.getId()), rootFolder.getId());
    recordImageAdministrationActivity(developerContext, "admin_image_download_link", idReemplazo,
        "Enlace de descarga generado para " + file.getName() + " desde " + folderPath + "; resultado: enlace preparado.");
    logMessage && logMessage("Inventario e historial de imágenes", "Se generó un enlace de descarga para " + driveId + ".");
    return { status: "success", downloadUrl: downloadUrl, fileName: file.getName() };
}

/**
 * Handler: Auditoría de imágenes en Google Drive limitada estrictamente a la carpeta "Cortes"
 */

function storeAuditDriveReferenceSnapshot(auditId, snapshot) {
    const cache = CacheService.getScriptCache();
    const cachePrefix = `gp_audit_refs_${auditId}`;
    const cacheKeys = [];
    const chunkSize = 75000;
    const maxSnapshotLength = 750000;
    try {
        const serialized = JSON.stringify(snapshot);
        if (!serialized || serialized.length > maxSnapshotLength) throw new Error("El conjunto de referencias supera la capacidad temporal disponible. No se clasificaron archivos.");
        const chunkCount = Math.ceil(serialized.length / chunkSize);
        for (let i = 0; i < chunkCount; i++) {
            const key = `${cachePrefix}_${i}`;
            cacheKeys.push(key);
            cache.put(key, serialized.slice(i * chunkSize, (i + 1) * chunkSize), 21600);
        }
        const manifestKey = `${cachePrefix}_manifest`;
        cacheKeys.push(manifestKey);
        cache.put(manifestKey, JSON.stringify({ chunkCount: chunkCount, length: serialized.length, encoding: "json" }), 21600);
        cacheKeys.forEach(key => { if (cache.get(key) === null) throw new Error("Google Apps Script no conservó todos los bloques del estado temporal."); });
    } catch (error) {
        try { if (cacheKeys.length) cache.removeAll(cacheKeys); } catch (cleanupError) { console.error("No se pudieron retirar todos los bloques temporales de auditoría:", cleanupError); }
        throw new Error("No se pudo conservar el estado temporal de la auditoría: " + error.message);
    }
}

function loadAuditDriveReferenceSnapshot(auditId) {
    const cache = CacheService.getScriptCache();
    const cachePrefix = `gp_audit_refs_${auditId}`;
    try {
        const manifestText = cache.get(`${cachePrefix}_manifest`);
        if (!manifestText) throw new Error("El manifiesto expiró o dejó de estar disponible.");
        const manifest = JSON.parse(manifestText);
        if (!Number.isInteger(manifest.chunkCount) || manifest.chunkCount < 1 || !Number.isInteger(manifest.length) || manifest.length < 1 || manifest.encoding !== "json") {
            throw new Error("El manifiesto del estado temporal está incompleto.");
        }
        let serialized = "";
        for (let i = 0; i < manifest.chunkCount; i++) {
            const chunk = cache.get(`${cachePrefix}_${i}`);
            if (chunk === null) throw new Error(`Falta el bloque temporal ${i}.`);
            serialized += chunk;
        }
        if (serialized.length !== manifest.length) throw new Error("La longitud del estado temporal no coincide con el manifiesto.");
        const snapshot = JSON.parse(serialized);
        if (!snapshot || !Array.isArray(snapshot.activeDriveIds) || !Array.isArray(snapshot.historicalDriveIds) || !Number.isFinite(Number(snapshot.unverifiableReferenceCount))) {
            throw new Error("El contenido recuperado no cumple la estructura del snapshot de referencias.");
        }
        return snapshot;
    } catch (error) {
        throw new Error("El estado temporal de la auditoría dejó de estar disponible: " + error.message + ". Inicia una auditoría nueva.");
    }
}
function clearAuditDriveReferenceSnapshot(auditId) {
    const cache = CacheService.getScriptCache();
    const cachePrefix = `gp_audit_refs_${auditId}`;
    const manifestText = cache.get(`${cachePrefix}_manifest`);
    if (!manifestText) return;

    const manifest = JSON.parse(manifestText);
    const keys = [`${cachePrefix}_manifest`];
    for (let i = 0; i < manifest.chunkCount; i++) {
        keys.push(`${cachePrefix}_${i}`);
    }
    cache.removeAll(keys);
}

/**
 * Registra de forma idempotente en Imagenes_Reemplazadas las imágenes sin uso
 * confirmadas por una auditoría completa. Cada archivo se vuelve a validar en servidor.
 */

function handleSaveUnusedImagesInventory(payload, logMessage) {
    const submittedFiles = Array.isArray(payload && payload.files) ? payload.files : [];
    const uniqueFiles = [];
    const seenIds = new Set();

    submittedFiles.forEach(item => {
        const fileId = String(item && item.fileId || "").trim();
        if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) throw new Error("El inventario contiene un ID de Drive inválido.");
        if (seenIds.has(fileId)) return;
        seenIds.add(fileId);
        const folderId = String(item.folderId || "").trim();
        if (!/^[a-zA-Z0-9_-]{20,}$/.test(folderId)) throw new Error("El inventario contiene un ID de carpeta inválido.");
        uniqueFiles.push({ fileId: fileId, folderId: folderId });
    });

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la actualización del inventario. Intenta nuevamente."); }

    try {
        const references = collectCortesImageReferences(false);
        if (references.unverifiableReferenceCount > 0) {
            throw new Error("No se actualizó el inventario porque existen referencias de Drive que no pudieron verificarse.");
        }

        const rootFolder = getCortesRootFolder();
        const sheet = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheet);
        const column = name => headers.indexOf(name) + 1;
        const rows = sheet.getDataRange().getValues();
        const existingInventoryRows = new Map();
        const historicalDriveIds = new Set();

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const origin = String(row[column("origen_registro") - 1] || "");
            const driveId = extractDriveFileId(row[5]) || extractDriveFileId(row[7]);
            if (!driveId) continue;
            if (origin === "auditoria_drive") {
                if (!existingInventoryRows.has(driveId)) existingInventoryRows.set(driveId, r + 1);
            } else {
                const status = String(row[10] || "historica");
                const recordType = String(row[column("tipo_registro") - 1] || "reemplazada");
                if (recordType === "reemplazada" && ["historica", "restablecida"].includes(status)) historicalDriveIds.add(driveId);
            }
        }

        const validatedFiles = [];
        uniqueFiles.forEach(item => {
            const fileId = item.fileId;
            if (references.references.has(fileId)) throw new Error("La imagen " + fileId + " ahora tiene referencias activas; no se registrará como imagen sin uso.");
            if (historicalDriveIds.has(fileId)) throw new Error("La imagen " + fileId + " ya pertenece al historial de reemplazos y no se registrará como imagen sin uso.");

            const file = DriveApp.getFileById(fileId);
            if (file.isTrashed()) throw new Error("La imagen " + fileId + " está en la papelera y no se registrará como inventario activo.");
            const mimeType = String(file.getMimeType() || "");
            if (!mimeType.startsWith("image/")) throw new Error("El archivo " + fileId + " ya no es una imagen.");

            const sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
            const folderPath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());
            let createdAt = "";
            try {
                const createdDate = file.getDateCreated();
                if (createdDate) createdAt = Utilities.formatDate(createdDate, "GMT-6", "yyyy-MM-dd HH:mm:ss");
            } catch (dateError) {}

            validatedFiles.push({
                fileId: fileId, fileName: file.getName(), mimeType: mimeType,
                sourceUrl: file.getUrl(), folderPath: folderPath, createdAt: createdAt
            });
        });

        const auditId = Utilities.getUuid();
        const detectedAt = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
        const currentIds = new Set(validatedFiles.map(item => item.fileId));
        let insertedCount = 0, updatedCount = 0, staleCount = 0;
        const newRows = [];
        const columnCount = headers.length;

        existingInventoryRows.forEach((rowNumber, fileId) => {
            if (currentIds.has(fileId)) return;
            const oldRow = rows[rowNumber - 1] || [];
            if (["en_papelera", "eliminada"].includes(String(oldRow[10] || ""))) return;
            sheet.getRange(rowNumber, column("estado")).setValue("no_confirmada_en_ultima_auditoria");
            sheet.getRange(rowNumber, column("ultima_auditoria_id")).setValue(auditId);
            sheet.getRange(rowNumber, column("estado_organizacion")).setValue("no_confirmada");
            sheet.getRange(rowNumber, column("error_organizacion")).setValue("El archivo no apareció como imagen sin uso en la última auditoría completa.");
            staleCount++;
        });

        validatedFiles.forEach(item => {
            const rowNumber = existingInventoryRows.get(item.fileId);
            const row = rowNumber ? (rows[rowNumber - 1] || []).slice(0, columnCount) : Array(columnCount).fill("");
            while (row.length < columnCount) row.push("");
            const setField = (name, value) => { row[column(name) - 1] = value; };

            if (!rowNumber) setField("id_reemplazo", "INV-" + item.fileId);
            setField("fecha_reemplazo", "");
            setField("tipo_contenido", "inventario_sin_uso");
            setField("tipo_registro", "sin_uso_detectado");
            setField("registro_id", "");
            setField("campo", "");
            setField("archivo_drive_id", item.fileId);
            setField("nombre_archivo", item.fileName);
            setField("url_anterior", item.sourceUrl);
            setField("sustituida_por_url", "");
            setField("referencia_texto", item.folderPath || "Cortes");
            setField("estado", "sin_uso_detectado");
            setField("origen_registro", "auditoria_drive");
            setField("tipo_mime", item.mimeType);
            const previousOriginalLocation = rowNumber ? String(row[column("ubicacion_original") - 1] || "") : "";
            const previousOrganizationDate = rowNumber ? String(row[column("fecha_organizacion") - 1] || "") : "";
            setField("ubicacion_original", previousOriginalLocation || item.folderPath || "Cortes");
            setField("fecha_creacion_drive", item.createdAt);
            setField("fecha_deteccion", detectedAt);
            setField("url_visualizacion", "https://lh3.googleusercontent.com/d/" + item.fileId);
            setField("ubicacion_actual", item.folderPath || "Cortes");
            setField("ultima_auditoria_id", auditId);
            setField("estado_organizacion", "pendiente");
            setField("error_organizacion", "");
            setField("fecha_organizacion", previousOrganizationDate);

            if (rowNumber) {
                sheet.getRange(rowNumber, 1, 1, columnCount).setValues([row]);
                updatedCount++;
            } else {
                newRows.push({ fileId: item.fileId, row: row });
                insertedCount++;
            }
        });

        if (newRows.length) {
            const firstNewRow = sheet.getLastRow() + 1;
            sheet.getRange(firstNewRow, 1, newRows.length, columnCount).setValues(newRows.map(item => item.row));
            newRows.forEach((item, index) => existingInventoryRows.set(item.fileId, firstNewRow + index));
        }
        SpreadsheetApp.flush();

        logMessage && logMessage("Inventario de imágenes", "Se registraron " + insertedCount + " imágenes nuevas, se actualizaron " +
            updatedCount + " y " + staleCount + " dejaron de estar confirmadas como imágenes sin uso.");
        return { status: "success", savedCount: validatedFiles.length, insertedCount: insertedCount,
            updatedCount: updatedCount, noLongerConfirmedCount: staleCount, auditId: auditId };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Organiza por lotes imágenes sin uso ya registradas en Imagenes_Reemplazadas.
 * Cada lote vuelve a validar referencias, identidad, MIME, papelera y pertenencia al árbol Cortes.
 */
function handleOrganizeUnusedImagesBatch(payload, logMessage, developerContext) {
    const auditId = String(payload && payload.auditId || "").trim();
    const submittedFiles = Array.isArray(payload && payload.files) ? payload.files : [];
    if (!/^[0-9a-f-]{36}$/i.test(auditId)) throw new Error("ID de auditoría inválido para organizar imágenes.");
    if (!submittedFiles.length || submittedFiles.length > 20) throw new Error("El lote de organización debe contener entre 1 y 20 imágenes.");

    const fileIds = [];
    const seenIds = new Set();
    submittedFiles.forEach(item => {
        const fileId = String(item && item.fileId || "").trim();
        if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) throw new Error("El lote contiene un ID de Drive inválido.");
        if (!seenIds.has(fileId)) { seenIds.add(fileId); fileIds.push(fileId); }
    });

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la organización de imágenes. Intenta nuevamente."); }

    try {
        const rootFolder = getCortesRootFolder();
        const sheet = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheet);
        const column = name => headers.indexOf(name) + 1;
        const rows = sheet.getDataRange().getValues();
        const inventoryRows = new Map();
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (String(row[column("origen_registro") - 1] || "") !== "auditoria_drive") continue;
            const driveId = extractDriveFileId(row[5]) || extractDriveFileId(row[7]);
            if (driveId && !inventoryRows.has(driveId)) inventoryRows.set(driveId, { rowIndex: r + 1, row: row });
        }

        const referenceSnapshot = collectCortesImageReferences(false);
        let destination = null, destinationPath = "", destinationCreationError = "";
        if (referenceSnapshot.unverifiableReferenceCount === 0) {
            try {
                const destinationResult = getOrCreateUnusedImagesFolder(rootFolder);
                destination = destinationResult.folder;
                destinationPath = getFolderPathInsideCortes(destination, rootFolder.getId());
                if (destinationResult.created) {
                    recordImageAdministrationActivity(developerContext, "admin_image_folder_create", destination.getId(),
                        "Carpeta de administración creada automáticamente: " + destinationPath + "; resultado: correcto.");
                }
            } catch (folderError) { destinationCreationError = folderError.message || String(folderError); }
        }

        let movedCount = 0, alreadyOrganizedCount = 0, failedCount = 0, blockedCount = 0;
        fileIds.forEach(fileId => {
            const record = inventoryRows.get(fileId);
            if (!record) {
                failedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", "INV-" + fileId,
                    "No se encontró el registro de inventario para la imagen " + fileId + "; resultado: fallido.");
                return;
            }

            const rowIndex = record.rowIndex, row = record.row;
            const recordId = String(row[0] || "");
            const status = String(row[10] || "");
            const type = getReplacedImageRecordType(row, headers);
            const storedAuditId = String(row[column("ultima_auditoria_id") - 1] || "");
            if (type !== "sin_uso_detectado" || status !== "sin_uso_detectado" || storedAuditId !== auditId ||
                (extractDriveFileId(row[5]) || extractDriveFileId(row[7])) !== fileId) {
                blockedCount++;
                return;
            }

            const updateOrganization = values => {
                if (values.location !== undefined) sheet.getRange(rowIndex, column("ubicacion_actual")).setValue(values.location);
                if (values.state !== undefined) sheet.getRange(rowIndex, column("estado_organizacion")).setValue(values.state);
                if (values.error !== undefined) sheet.getRange(rowIndex, column("error_organizacion")).setValue(values.error);
                if (values.date !== undefined) sheet.getRange(rowIndex, column("fecha_organizacion")).setValue(values.date);
                if (values.status !== undefined) sheet.getRange(rowIndex, column("estado")).setValue(values.status);
                SpreadsheetApp.flush();
            };

            if (referenceSnapshot.unverifiableReferenceCount > 0 || referenceSnapshot.references.has(fileId)) {
                const reason = referenceSnapshot.unverifiableReferenceCount > 0
                    ? "No se pudo confirmar la ausencia de referencias porque existen enlaces de Drive no interpretables en la Spreadsheet."
                    : "La imagen volvió a tener referencias activas en «Cortes» antes del movimiento.";
                try { updateOrganization({ state: "bloqueada", error: reason, status: "no_confirmada_en_ultima_auditoria" }); } catch (writeError) {}
                blockedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId, "Organización bloqueada para " + fileId + ": " + reason);
                return;
            }

            if (destinationCreationError || !destination) {
                const reason = destinationCreationError || "No se pudo obtener la carpeta destino.";
                try { updateOrganization({ state: "error", error: reason }); } catch (writeError) {}
                failedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId, "No se pudo crear o validar la carpeta destino para " + fileId + ": " + reason);
                return;
            }

            let file, sourceFolder, sourcePath;
            try {
                file = DriveApp.getFileById(fileId);
                if (file.isTrashed()) throw new Error("La imagen está en la papelera de Google Drive.");
                if (!String(file.getMimeType() || "").startsWith("image/")) throw new Error("El archivo ya no tiene un tipo MIME de imagen.");
                sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                sourcePath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());
            } catch (validationError) {
                try {
                    updateOrganization({ state: "bloqueada", error: validationError.message || String(validationError), status: "no_confirmada_en_ultima_auditoria" });
                } catch (writeError) {}
                blockedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId, "No se pudo validar la imagen " + fileId + ": " + (validationError.message || String(validationError)));
                return;
            }

            const organizationDate = String(row[column("fecha_organizacion") - 1] || "") ||
                Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
            if (sourceFolder.getId() === destination.getId()) {
                try {
                    updateOrganization({ location: destinationPath, state: "organizada", error: "", date: organizationDate });
                    alreadyOrganizedCount++;
                } catch (writeError) {
                    failedCount++;
                    try { updateOrganization({ location: sourcePath, state: "error", error: writeError.message || String(writeError) }); } catch (syncError) {}
                }
                return;
            }

            const previousMetadata = {
                location: String(row[column("ubicacion_actual") - 1] || sourcePath),
                state: String(row[column("estado_organizacion") - 1] || "pendiente"),
                error: String(row[column("error_organizacion") - 1] || ""),
                date: String(row[column("fecha_organizacion") - 1] || "")
            };
            let moveError = null;
            try { file.moveTo(destination); } catch (error) { moveError = error; }
            let movedParent = null;
            try { movedParent = getSingleParentFolderInsideCortes(file, rootFolder.getId()); }
            catch (parentError) { moveError = moveError || parentError; }

            if (!movedParent || movedParent.getId() !== destination.getId()) {
                let actualPath = "Ubicación no verificable dentro de Cortes";
                try {
                    const actualParents = file.getParents();
                    const actualPaths = [];
                    while (actualParents.hasNext()) {
                        const actualParent = actualParents.next();
                        if (!actualParent.isTrashed() && isFolderInsideCortes(actualParent, rootFolder.getId())) {
                            actualPaths.push(getFolderPathInsideCortes(actualParent, rootFolder.getId()));
                        }
                    }
                    if (actualPaths.length) actualPath = actualPaths.join(" | ");
                } catch (pathError) {}
                const reason = "Drive no confirmó el traslado a «Imagenes_Sin_Uso»." + (moveError ? " Detalle: " + moveError.message : "");
                try { updateOrganization({ location: actualPath, state: "error", error: reason }); } catch (writeError) {}
                failedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId, "Falló el movimiento de " + fileId + " desde " + sourcePath + "; ubicación detectada: " + actualPath + ": " + reason);
                return;
            }

            try {
                updateOrganization({ location: destinationPath, state: "organizada", error: "", date: organizationDate });
                movedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId,
                    "Imagen " + file.getName() + " movida automáticamente de " + sourcePath + " a " + destinationPath + "; resultado: correcto.");
            } catch (historyError) {
                let rollbackError = null;
                try {
                    file.moveTo(sourceFolder);
                    const restoredParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                    if (restoredParent.getId() !== sourceFolder.getId()) throw new Error("Drive no confirmó la ubicación anterior.");
                } catch (error) { rollbackError = error; }

                if (!rollbackError) {
                    try {
                        updateOrganization({
                            location: previousMetadata.location, state: "error",
                            error: "Falló el registro de la nueva ubicación; el movimiento fue revertido: " + historyError.message,
                            date: previousMetadata.date
                        });
                    } catch (restoreError) {}
                } else {
                    let actualPath = "Ubicación no verificable dentro de Cortes";
                    try {
                        const actualParents = file.getParents();
                        const actualPaths = [];
                        while (actualParents.hasNext()) {
                            const actualParent = actualParents.next();
                            if (!actualParent.isTrashed() && isFolderInsideCortes(actualParent, rootFolder.getId())) {
                                actualPaths.push(getFolderPathInsideCortes(actualParent, rootFolder.getId()));
                            }
                        }
                        if (actualPaths.length) actualPath = actualPaths.join(" | ");
                    } catch (pathError) {}
                    try {
                        updateOrganization({
                            location: actualPath, state: "error",
                            error: "Falló la actualización del inventario y no se pudo revertir el movimiento: " +
                                historyError.message + "; " + rollbackError.message
                        });
                    } catch (syncError) {}
                }
                failedCount++;
                recordImageAdministrationActivity(developerContext, "admin_image_auto_organize", recordId,
                    "La organización de " + fileId + " requirió reversión o sincronización: " + historyError.message +
                    (rollbackError ? "; reversión fallida: " + rollbackError.message : "; movimiento revertido."));
            }
        });

        logMessage && logMessage("Organización de imágenes sin uso", "Movidas: " + movedCount +
            "; ya organizadas: " + alreadyOrganizedCount + "; fallidas: " + failedCount + "; bloqueadas: " + blockedCount + ".");
        return { status: "success", auditId: auditId, folderPath: destinationPath, processedCount: fileIds.length,
            movedCount: movedCount, alreadyOrganizedCount: alreadyOrganizedCount, failedCount: failedCount, blockedCount: blockedCount };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Handler: Auditoría de imágenes en Google Drive limitada estrictamente a la carpeta "Cortes"
 */
function handleAuditDriveImagesInCortes(payload, logMessage) {
    const rootFolder = getCortesRootFolder();
    if (!rootFolder) throw new Error("No se pudo acceder a la carpeta principal 'Cortes'.");

    const cursor = payload && payload.cursor ? payload.cursor : null;
    let auditId;
    let referenceSnapshot;

    if (cursor) {
        if (!Array.isArray(cursor.stack) || !/^[0-9a-f-]{36}$/i.test(String(cursor.referenceCacheId || ""))) {
            throw new Error("Cursor de auditoría inválido.");
        }
        auditId = String(cursor.referenceCacheId);
        referenceSnapshot = loadAuditDriveReferenceSnapshot(auditId);
    } else {
        auditId = Utilities.getUuid();
        const references = collectCortesImageReferences(false);
        const historicalDriveIds = new Set();
        const historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
        if (historySheet) {
            const historyRows = historySheet.getDataRange().getValues();
            const historyHeaders = historyRows.length
                ? historyRows[0].map(value => String(value || "").trim())
                : [];
            const originIndex = historyHeaders.indexOf("origen_registro");
            for (let r = 1; r < historyRows.length; r++) {
                if (originIndex >= 0 && String(historyRows[r][originIndex] || "") === "auditoria_drive") continue;
                const status = String(historyRows[r][10] || "historica");
                const typeIndex = historyHeaders.indexOf("tipo_registro");
                const recordType = typeIndex >= 0 ? String(historyRows[r][typeIndex] || "reemplazada") : "reemplazada";
                if (recordType !== "reemplazada" || !["historica", "restablecida"].includes(status)) continue;
                const id = extractDriveFileId(historyRows[r][5]) || extractDriveFileId(historyRows[r][7]);
                if (id) historicalDriveIds.add(id);
            }
        }

        referenceSnapshot = {
            activeDriveIds: Array.from(references.references.keys()),
            historicalDriveIds: Array.from(historicalDriveIds),
            unverifiableReferenceCount: references.unverifiableReferenceCount
        };
        storeAuditDriveReferenceSnapshot(auditId, referenceSnapshot);
        logMessage && logMessage("Referencias", `Snapshot preparado: ${referenceSnapshot.activeDriveIds.length} referencias activas y ${referenceSnapshot.historicalDriveIds.length} históricas.`);
    }

    const activeDriveIds = new Set(referenceSnapshot.activeDriveIds);
    const historicalDriveIds = new Set(referenceSnapshot.historicalDriveIds);
    let stack;
    let totalAnalyzed = 0;
    let foldersVisited = 0;

    if (cursor) {
        stack = cursor.stack;
        totalAnalyzed = Math.max(0, Number(cursor.totalAnalyzed) || 0);
        foldersVisited = Math.max(0, Number(cursor.foldersVisited) || 0);
        stack.forEach(item => {
            if (!item || !item.folderId || !isFolderInsideCortes(DriveApp.getFolderById(item.folderId), DRIVE_FOLDER_ID)) {
                throw new Error("El cursor contiene una carpeta fuera del árbol autorizado «Cortes».");
            }
        });
    } else {
        stack = [{
            folderId: DRIVE_FOLDER_ID, path: rootFolder.getName(),
            fileToken: null, folderToken: null, filesDone: false, foldersDone: false
        }];
    }

    const batchFilesLimit = 25;
    const batchFoldersLimit = 20;
    let batchFiles = 0;
    let batchFolders = 0;
    const auditResults = [];

    while (stack.length && batchFiles < batchFilesLimit && batchFolders < batchFoldersLimit) {
        const current = stack[stack.length - 1];
        const folder = DriveApp.getFolderById(current.folderId);

        if (!current.filesDone) {
            // folder está dentro de Cortes: es la raíz fija o una carpeta validada en el cursor,
            // o fue obtenida directamente mediante el iterador de subcarpetas de otra carpeta validada.
            const files = current.fileToken ? DriveApp.continueFileIterator(current.fileToken) : folder.getFiles();
            while (files.hasNext() && batchFiles < batchFilesLimit) {
                const file = files.next();
                // getFiles() devuelve archivos contenidos en la carpeta ya validada; no es necesario
                // recorrer nuevamente todos los padres del archivo para cada elemento.
                let fileName = "Archivo no verificable";
                let mimeType = "";
                let size = 0;
                let lastUpdated = "";
                let classification = "No verificable";
                const fileId = file.getId();
                try {
                    fileName = file.getName();
                    mimeType = file.getMimeType();
                    size = file.getSize();
                    lastUpdated = Utilities.formatDate(file.getLastUpdated(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                    if (activeDriveIds.has(fileId)) classification = "En uso";
                    else if (historicalDriveIds.has(fileId)) classification = "Histórica";
                    else if (!String(mimeType).startsWith("image/")) classification = "No verificable";
                    else if (referenceSnapshot.unverifiableReferenceCount > 0) classification = "No verificable";
                    else classification = "Sin uso detectado";
                } catch (fileError) {
                    classification = "No verificable";
                }

                auditResults.push({
                    fileId: fileId, fileName: fileName, folderId: current.folderId, folderPath: current.path,
                    mimeType: mimeType, size: size, lastUpdated: lastUpdated,
                    classification: classification
                });
                batchFiles++;
                totalAnalyzed++;
            }

            if (files.hasNext()) {
                current.fileToken = files.getContinuationToken();
                break;
            }
            current.fileToken = null;
            current.filesDone = true;
        }

        if (current.foldersDone) {
            stack.pop();
            continue;
        }

        const subFolders = current.folderToken
            ? DriveApp.continueFolderIterator(current.folderToken)
            : folder.getFolders();
        if (subFolders.hasNext()) {
            const childFolder = subFolders.next();
            // Mantener una validación de pertenencia por cada subcarpeta descubierta.
            if (!isFolderInsideCortes(childFolder, DRIVE_FOLDER_ID)) {
                throw new Error("Se detectó una subcarpeta fuera del árbol «Cortes».");
            }
            if (subFolders.hasNext()) {
                current.folderToken = subFolders.getContinuationToken();
            } else {
                current.folderToken = null;
                current.foldersDone = true;
            }
            stack.push({
                folderId: childFolder.getId(),
                path: `${current.path}/${childFolder.getName()}`,
                fileToken: null, folderToken: null, filesDone: false, foldersDone: false
            });
            batchFolders++;
            foldersVisited++;
        } else {
            current.foldersDone = true;
            stack.pop();
        }
    }

    const complete = stack.length === 0;
    const nextCursor = complete ? null : {
        stack: stack,
        totalAnalyzed: totalAnalyzed,
        foldersVisited: foldersVisited,
        referenceCacheId: auditId
    };
    logMessage && logMessage("Auditoría Drive", `Lote analizado: ${batchFiles} archivos. Total acumulado: ${totalAnalyzed}. Estado: ${complete ? "completo" : "parcial"}.`);

    if (complete) clearAuditDriveReferenceSnapshot(auditId);

    return {
        status: "success",
        rootFolderName: rootFolder.getName(),
        rootFolderId: DRIVE_FOLDER_ID,
        batchAnalyzed: batchFiles,
        totalAnalyzed: totalAnalyzed,
        foldersVisited: foldersVisited,
        complete: complete,
        partial: !complete,
        unverifiableReferenceCount: referenceSnapshot.unverifiableReferenceCount,
        files: auditResults,
        cursor: nextCursor
    };
}
