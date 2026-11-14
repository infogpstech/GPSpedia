// ============================================================================
// GPSPEDIA-ADMIN SERVICE (DESACOPLADO Y EXCLUSIVO PARA DESARROLLADOR/ADMIN)
// ============================================================================
// COMPONENT VERSION: 2.7.0

// Variables globales para el diagnóstico y seguimiento de errores y estado
var currentStage = "Inicialización";
var currentLote = 0;
var currentFila = 0;
var currentRecurso = "Ninguno";

const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';
let spreadsheet = null;


const WRITE_SERVICE_URL = "https://script.google.com/macros/s/AKfycbxMj8WFCMZVLXuk3N6_WCeEwNwhGAb589PJY4gc5ZjA8mrYsBN7-femz_FCH4eFj5vBDQ/exec";
const LOGOS_MARCA_ID_COUNTER_PROPERTY = "LOGOS_MARCA_ID_COUNTER";

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
 const sessionsData=sh.getDataRange().getValues();
 const tokenMatches=sessionsData.slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(item=>String(item.row[2]||"").trim()===token);
 if(tokenMatches.length!==1||String(tokenMatches[0].row[0]||"").trim()!==id||getSessionExpirationStatus_(tokenMatches[0].row,new Date()).expired)throw new Error("Acceso denegado: sesión inválida, duplicada, cruzada o expirada.");
 const sessionMatch=tokenMatches[0];
 const userMatches=uh.getDataRange().getValues().slice(1).filter(r=>String(r[0]||"").trim()===id);if(userMatches.length!==1)throw new Error("Acceso denegado: perfil de usuario ausente o ambiguo.");
 const u=userMatches[0];if(String(u[7]||"").startsWith(ROLE_REVOCATION_SHARED_PREFIX))throw new Error("Acceso no autorizado: existe una revocación de rol pendiente. Inicia sesión nuevamente cuando finalice.");
 const username=String(u[1]||"").trim();if(!username||username.startsWith("__deleted__:"))throw new Error("Acceso denegado: cuenta inactiva.");
 const rawRole=String(u[3]||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase(),role=rawRole;
 if(!Array.isArray(allowedRoles)||!allowedRoles.includes(role))throw new Error("Acceso denegado: sesión no autorizada.");
 const fullName=String(u[6]||"").trim(),displayRole=role==="desarrollador"?"Desarrollador":role==="jefe"?"Jefe":"Supervisor";
 sh.getRange(sessionMatch.rowIndex,6).setValue(new Date().toISOString());
 return{userId:id,role:displayRole,fullName,userName:fullName||username};
}
function assertDeveloperSession(payload){return getAdminSessionContext_(payload,["desarrollador"]);}
function assertModalEditSession(payload){return getAdminSessionContext_(payload,["desarrollador","jefe","supervisor"]);}
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
    let unverifiableReferenceCount = 0, cortesScanMetrics = null;

    getSpreadsheet().getSheets().forEach(sheet => {
        if (excludedSheets.has(sheet.getName())) return;
        if (sheet.getName() === SHEET_NAMES.CORTES) {
            const cortesReferences = collectCortesImageReferences(includeLocations);
            cortesScanMetrics = cortesReferences.metrics || null;
            cortesReferences.references.forEach((locations, id) => {
                if (includeLocations) {
                    if (!references.has(id)) references.set(id, []);
                    references.get(id).push.apply(references.get(id), locations);
                } else references.set(id, true);
            });
            unverifiableReferenceCount += cortesReferences.unverifiableReferenceCount;
        } else {
            const range = sheet.getDataRange();
            const values = range.getDisplayValues();
            const rawValues = range.getValues();
            const formulas = range.getFormulas();
            const richTextValues = range.getRichTextValues();

            for (let r = 0; r < values.length; r++) {
                for (let c = 0; c < values[r].length; c++) {
                    const candidates = [
                        String(values[r][c] || ""),
                        String((formulas[r] && formulas[r][c]) || "")
                    ];
                    const rawValue = rawValues[r] && rawValues[r][c];
                    let cellHasUnverifiableDriveLink = false;
                    if (rawValue && typeof rawValue === "object" && typeof rawValue.getContentUrl === "function") {
                        try {
                            const contentUrl = String(rawValue.getContentUrl() || "");
                            if (contentUrl) candidates.push(contentUrl);
                            else cellHasUnverifiableDriveLink = true;
                        } catch (imageValueError) {
                            cellHasUnverifiableDriveLink = true;
                        }
                    }
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
                        } else references.set(id, true);
                    });
                    if (cellHasUnverifiableDriveLink) unverifiableReferenceCount++;
                }
            }
        }

        if (typeof sheet.getImages === "function") {
            const overGridImages = sheet.getImages();
            overGridImages.forEach(image => {
                let imageUrl = "";
                try {
                    if (image && typeof image.getUrl === "function") imageUrl = String(image.getUrl() || "");
                    else if (image && typeof image.getSourceUrl === "function") imageUrl = String(image.getSourceUrl() || "");
                } catch (imageUrlError) {
                    imageUrl = "";
                }
                const ids = extractDriveFileIds(imageUrl);
                if (ids.length) {
                    let anchor = null;
                    try { anchor = image && typeof image.getAnchorCell === "function" ? image.getAnchorCell() : null; }
                    catch (anchorError) { anchor = null; }
                    ids.forEach(id => {
                        if (includeLocations) {
                            if (!references.has(id)) references.set(id, []);
                            references.get(id).push({
                                sheet: sheet.getName(),
                                row: anchor && typeof anchor.getRow === "function" ? anchor.getRow() : 0,
                                column: anchor && typeof anchor.getColumn === "function" ? anchor.getColumn() : 0
                            });
                        } else references.set(id, true);
                    });
                } else {
                    unverifiableReferenceCount++;
                }
            });
        }
    });

    return { references, unverifiableReferenceCount, metrics: { cortes: cortesScanMetrics } };
}
function collectCortesImageReferences(includeLocations = true) {
    const startedAt = Date.now();
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) throw new Error("No se encontró la hoja «Cortes» para verificar las referencias de imágenes.");
    const imageFields = ["imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"];
    const imageColumns = imageFields.map(field => ({ field, column: COLS_CORTES[field] }))
        .filter(item => Number.isInteger(item.column) && item.column > 0)
        .sort((a, b) => a.column - b.column);
    if (imageColumns.length !== imageFields.length ||
        new Set(imageColumns.map(item => item.column)).size !== imageFields.length) {
        throw new Error("La configuración de las ocho columnas de imagen de «Cortes» está incompleta o contiene columnas duplicadas. No se clasificaron archivos.");
    }
    const references = new Map();
    let unverifiableReferenceCount = 0;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { references, unverifiableReferenceCount,
        metrics: { rows: 0, columns: imageColumns.length, cells: 0, ranges: 0, elapsedMs: Date.now() - startedAt } };

    const groups = [];
    imageColumns.forEach(item => {
        const last = groups[groups.length - 1];
        if (last && item.column <= last.start + last.width) {
            last.width = Math.max(last.width, item.column - last.start + 1);
            last.items.push(item);
        } else groups.push({ start: item.column, width: 1, items: [item] });
    });

    const maxRowChunkSize = 500, minRowChunkSize = 50, targetChunkMs = 1500, captureBudgetMs = 12000;
    let rowChunkSize = maxRowChunkSize, rangesRead = 0, chunksRead = 0, rowsRead = 0;
    let displayReadMs = 0, rawReadMs = 0, formulaReadMs = 0, richTextReadMs = 0;
    let referenceParseMs = 0, maxChunkElapsedMs = 0, adaptiveChunkChanges = 0, smallestAdaptiveRowChunkSize = maxRowChunkSize;
    const assertCaptureBudget = () => {
        if (Date.now() - startedAt >= captureBudgetMs) {
            throw new Error("La captura de referencias de «Cortes» superó el presupuesto temporal seguro; no se guardó un snapshot parcial. Reintenta la auditoría.");
        }
    };
    groups.forEach(group => {
        for (let offset = 0; offset < lastRow - 1;) {
            assertCaptureBudget();
            const chunkRows = Math.min(rowChunkSize, lastRow - 1 - offset);
            const chunkStartedAt = Date.now();
            const range = sheet.getRange(2 + offset, group.start, chunkRows, group.width);
            let stageStartedAt = Date.now();
            const values = range.getDisplayValues();
            displayReadMs += Date.now() - stageStartedAt;
            stageStartedAt = Date.now();
            const rawValues = range.getValues();
            rawReadMs += Date.now() - stageStartedAt;
            stageStartedAt = Date.now();
            const formulas = range.getFormulas();
            formulaReadMs += Date.now() - stageStartedAt;
            stageStartedAt = Date.now();
            const richTextValues = range.getRichTextValues();
            richTextReadMs += Date.now() - stageStartedAt;
            rangesRead++; chunksRead++;
            stageStartedAt = Date.now();
            group.items.forEach(item => {
                const c = item.column - group.start;
                for (let r = 0; r < values.length; r++) {
                    const candidates = [String(values[r][c] || ""), String((formulas[r] && formulas[r][c]) || "")];
                    const rawValue = rawValues[r] && rawValues[r][c];
                    let hasUnverifiableDriveLink = false;
                    if (rawValue && typeof rawValue === "object" && typeof rawValue.getContentUrl === "function") {
                        try {
                            const contentUrl = String(rawValue.getContentUrl() || "");
                            if (contentUrl) candidates.push(contentUrl);
                            else hasUnverifiableDriveLink = true;
                        } catch (imageValueError) { hasUnverifiableDriveLink = true; }
                    }
                    const richText = richTextValues[r] && richTextValues[r][c];
                    if (richText) {
                        const wholeCellLink = richText.getLinkUrl();
                        if (wholeCellLink) candidates.push(wholeCellLink);
                        const runs = richText.getRuns ? richText.getRuns() : [];
                        runs.forEach(run => { const runLink = run.getLinkUrl(); if (runLink) candidates.push(runLink); });
                    }
                    const cellIds = new Set();
                    candidates.forEach(candidate => {
                        if (!candidate) return;
                        const ids = extractDriveFileIds(candidate);
                        ids.forEach(id => cellIds.add(id));
                        if (!ids.length && /drive\.google\.com\/(?:uc|thumbnail|file|open)|googleusercontent\.com/i.test(candidate)) hasUnverifiableDriveLink = true;
                    });
                    cellIds.forEach(id => {
                        if (includeLocations) {
                            if (!references.has(id)) references.set(id, []);
                            references.get(id).push({ sheet: SHEET_NAMES.CORTES, row: r + offset + 2, column: item.column, field: item.field });
                        } else references.set(id, true);
                    });
                    if (hasUnverifiableDriveLink) unverifiableReferenceCount++;
                }
            });
            referenceParseMs += Date.now() - stageStartedAt;
            const chunkElapsedMs = Date.now() - chunkStartedAt;
            maxChunkElapsedMs = Math.max(maxChunkElapsedMs, chunkElapsedMs);
            rowsRead = Math.max(rowsRead, offset + chunkRows);
            offset += chunkRows;
            const nextChunkSize = chunkElapsedMs > targetChunkMs
                ? Math.max(minRowChunkSize, Math.floor(rowChunkSize * targetChunkMs / chunkElapsedMs))
                : chunkElapsedMs < targetChunkMs / 2
                    ? Math.min(maxRowChunkSize, Math.max(rowChunkSize + 1, Math.floor(rowChunkSize * 1.5)))
                    : rowChunkSize;
            if (nextChunkSize !== rowChunkSize) adaptiveChunkChanges++;
            rowChunkSize = nextChunkSize;
            smallestAdaptiveRowChunkSize = Math.min(smallestAdaptiveRowChunkSize, rowChunkSize);
            assertCaptureBudget();
        }
    });

    return { references, unverifiableReferenceCount,
        metrics: { rows: rowsRead, columns: imageColumns.length,
            cells: rowsRead * imageColumns.length, ranges: rangesRead, chunks: chunksRead,
            initialRowChunkSize: maxRowChunkSize, minRowChunkSize, maxRowChunkSize,
            targetChunkMs, finalRowChunkSize: rowChunkSize, smallestAdaptiveRowChunkSize, adaptiveChunkChanges, maxChunkElapsedMs,
            displayReadMs, rawReadMs, formulaReadMs, richTextReadMs, referenceParseMs,
            captureBudgetMs, elapsedMs: Date.now() - startedAt } };
}
function isFolderInsideCortes(folder, rootFolderId, membershipCache) {
    if (!folder) return false;
    const cache = membershipCache instanceof Map ? membershipCache : new Map();
    const rootId = String(rootFolderId || ""), startId = String(folder.getId() || "");
    if (!startId || !rootId) return false;
    if (startId === rootId) { cache.set(startId, true); return true; }
    if (cache.has(startId)) return cache.get(startId) === true;

    const pending = [folder], visited = new Set(), previous = new Map();
    let index = 0, matchedId = "";
    while (index < pending.length) {
        const current = pending[index++];
        if (!current) continue;
        const currentId = String(current.getId() || "");
        if (!currentId) continue;
        if (currentId === rootId) { matchedId = currentId; break; }
        if (cache.has(currentId)) {
            if (cache.get(currentId) === true) { matchedId = currentId; break; }
            continue;
        }
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        const parents = current.getParents();
        while (parents.hasNext()) {
            const parent = parents.next();
            if (!parent) continue;
            const parentId = String(parent.getId() || "");
            if (!parentId || visited.has(parentId) || previous.has(parentId) || cache.has(parentId)) {
                if (parentId && cache.get(parentId) === true) { matchedId = parentId; break; }
                continue;
            }
            previous.set(parentId, currentId);
            pending.push(parent);
        }
        if (matchedId) break;
    }

    if (matchedId) {
        let currentId = matchedId;
        while (currentId) {
            cache.set(currentId, true);
            currentId = previous.get(currentId) || "";
        }
        return true;
    }
    visited.forEach(id => { if (!cache.has(id)) cache.set(id, false); });
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
    if (vinRaw === null || vinRaw === undefined || String(vinRaw).trim() === "") return "";
    if (typeof vinRaw !== "string") throw new Error("El VIN debe enviarse como texto.");
    const raw = vinRaw.trim();
    if (!/^[A-Za-z0-9 -]+$/.test(raw)) {
        throw new Error("El VIN contiene caracteres no permitidos; solo se admiten letras, números, espacios y guiones.");
    }
    const cleaned = raw.toUpperCase().replace(/[ -]/g, "");
    if (cleaned.length > 18) throw new Error("El VIN normalizado no puede superar 18 caracteres.");
    if (cleaned.length <= 5) throw new Error("El VIN debe contener más de cinco caracteres; los últimos cinco se reservan para el número serial.");
    if (cleaned.length < 6) throw new Error("El VIN debe contener entre 6 y 18 caracteres alfanuméricos después de normalizarse.");
    return cleaned.substring(0, cleaned.length - 5);
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
const ADMIN_SERVICE_VERSION = "2.6.1";
function doGet(e) {
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Admin',
            version: ADMIN_SERVICE_VERSION,
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Admin-SERVICE v' + ADMIN_SERVICE_VERSION + ' is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["backupDatabase","backupDrive","restoreDatabase","restoreDrive","reorganizeDatabase","normalizeImages","organizePrimaryVehicleImages","restoreAllTrashedImages","addLogo","updateVehicleField","uploadAdminImage","migrateCortesOperationIds","reconcilePendingImageUploads","addOrUpdateCut","addSupplementaryInfo","createSheet","addColumn","driveCommand","recoverReplacedImage","deleteReplacedImage","restoreReplacedImageFromTrash","permanentlyDeleteReplacedImage","markReplacedImageInUse","saveUnusedImagesInventory","createCortesImageFolder","moveReplacedImage","getReplacedImageDownloadUrl","migrateReplacedImagesSchema"].includes(action);
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
    if (!isSharedMutationAction_(action)) {
        if (action === "ping") return doPostInternal_(e);
        try {
            return withSharedMutationLease_("ADMIN", "sessionActivity", function() {
                return doPostInternal_(e);
            });
        } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "error",
                message: error && error.message ? error.message : "La operación fue rechazada por el coordinador compartido."
            })).setMimeType(ContentService.MimeType.TEXT);
        }
    }

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

const ADMIN_AUDIT_PROPERTY_PREFIX_ = "GPSpedia_ADMIN_AUDIT_V1_";
const ADMIN_AUDIT_RETENTION_MS_ = 180 * 24 * 60 * 60 * 1000;
const ADMIN_AUDIT_MAX_FINALIZED_ = 300;
const ADMIN_AUDIT_MAX_PENDING_ = 20;
const ADMIN_AUDIT_MAX_RECORD_LENGTH_ = 900;

function createAdminAuditError_(message, code, eventId) {
    const error = new Error(String(message || "No se pudo registrar la auditoría administrativa."));
    error.code = String(code || "ADMIN_AUDIT_ERROR");
    if (eventId) error.auditEventId = String(eventId);
    return error;
}

function safeAdminAuditId_(value, payload) {
    if (value === null || value === undefined || typeof value === "object") return "";
    const candidate = String(value).trim();
    if (!candidate || candidate.length > 160 || !/^[A-Za-z0-9_.:-]+$/.test(candidate)) return "";
    const source = payload && typeof payload === "object" ? payload : {};
    const secretValues = [
        source.sessionToken, source.token, source.password, source.currentPassword,
        source.newPassword, source.confirmPassword, source.sheetPassword,
        source.imageData, source.imgBase64, source.base64, source.oauthToken
    ];
    if (secretValues.some(secret => typeof secret === "string" && secret && secret === candidate)) return "";
    return candidate;
}

function safeAdminAuditStage_(value) {
    const stage = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/inicio/.test(stage)) return "Inicio";
    if (/valid/.test(stage)) return "Validacion";
    if (/respaldo|backup/.test(stage)) return "Respaldo";
    if (/restaur/.test(stage)) return "Restauracion";
    if (/migr/.test(stage)) return "Migracion";
    if (/reconc/.test(stage)) return "Reconciliacion";
    if (/normaliz/.test(stage)) return "Normalizacion";
    if (/organiz|reorganiz/.test(stage)) return "Organizacion";
    if (/finaliz/.test(stage)) return "Finalizacion";
    if (/fall|error/.test(stage)) return "Error";
    if (/imagen|drive|carpeta|archivo/.test(stage)) return "Drive";
    if (/cort/.test(stage)) return "Cortes";
    if (/proces|ejecut|lote|fila/.test(stage)) return "Procesamiento";
    return "Ejecucion";
}

function getAdminAuditResourceSummary_(action, payload, response) {
    const name = String(action || "");
    const source = payload && typeof payload === "object" ? payload : {};
    const result = response && typeof response === "object" ? response : {};
    let resourceType = "admin";
    if (/Drive|Image|Logo/i.test(name) || name === "driveCommand") resourceType = "drive";
    else if (/Database|Sheet|Column/i.test(name)) resourceType = "spreadsheet";
    else if (/Vehicle|Cut|Supplementary/i.test(name)) resourceType = "vehicle";
    else if (/Operation|Upload/i.test(name)) resourceType = "operation";

    let sourceCandidate = "";
    let targetCandidate = "";
    if (name === "backupDatabase") {
        sourceCandidate = SPREADSHEET_ID;
        targetCandidate = result.backupId || result.fileId || result.spreadsheetId;
    } else if (name === "restoreDatabase") {
        sourceCandidate = source.backupId || source.fileId;
        targetCandidate = SPREADSHEET_ID;
    } else if (name === "backupDrive") {
        sourceCandidate = DRIVE_FOLDER_ID;
        targetCandidate = result.backupFolderId || result.folderId || result.backupId;
    } else if (name === "restoreDrive") {
        sourceCandidate = source.backupId || source.fileId;
        targetCandidate = DRIVE_FOLDER_ID;
    } else if (name === "driveCommand") {
        sourceCandidate = source.fileId || source.currentFolderId;
        targetCandidate = source.targetFolderId;
    } else {
        sourceCandidate = source.sourceResourceId || source.sourceFileId || source.fileId ||
            source.backupId || source.vehicleId || source.currentFolderId || source.operationId || source.resourceId;
        targetCandidate = source.targetResourceId || source.targetFileId || source.targetFolderId ||
            source.destinationFolderId || source.folderId || result.fileId || result.folderId || result.backupId;
    }

    return {
        resourceType,
        sourceResourceId: safeAdminAuditId_(sourceCandidate, source),
        targetResourceId: safeAdminAuditId_(targetCandidate, source)
    };
}

function getAdminAuditPartialResult_(response) {
    const source = response && typeof response === "object" ? response : {};
    const summary = {};
    [
        "processed", "total", "itemErrors", "successCount", "errorCount",
        "deletedCount", "restoredCount", "movedCount", "skippedCount",
        "failedCount", "createdCount", "recoveredCount"
    ].forEach(key => {
        if (typeof source[key] === "number" && Number.isFinite(source[key])) summary[key] = source[key];
    });
    ["partial", "recovered", "alreadyProcessed", "rollbackConfirmed"].forEach(key => {
        if (typeof source[key] === "boolean") summary[key] = source[key];
    });
    return summary;
}

function getAdminAuditOutcome_(response, error) {
    if (error || (response && response.status === "error")) return "error";
    const summary = getAdminAuditPartialResult_(response);
    if (response && ["warning", "partial", "pending", "in_progress"].includes(String(response.status || ""))) return "partial";
    if (summary.partial === true || Number(summary.itemErrors || 0) > 0 ||
        Number(summary.errorCount || 0) > 0 || Number(summary.failedCount || 0) > 0) return "partial";
    return "success";
}

function getAdminAuditResultCode_(response, error, outcome) {
    const source = response && typeof response === "object" ? response : {};
    const raw = error && error.code || source.code ||
        (outcome === "success" ? "SUCCESS" : outcome === "partial" ? "PARTIAL_RESULT" : "SERVICE_ERROR");
    return safeAdminAuditId_(raw, null).slice(0, 48) || "SERVICE_ERROR";
}

function pruneAdminAuditProperties_(properties, currentTime) {
    const all = properties.getProperties();
    const entries = [];
    Object.keys(all).filter(key => key.indexOf(ADMIN_AUDIT_PROPERTY_PREFIX_) === 0).forEach(key => {
        let record;
        try { record = JSON.parse(all[key]); } catch (error) {
            throw createAdminAuditError_("El registro persistente ADMIN contiene una entrada ilegible; las operaciones sensibles permanecen detenidas.", "ADMIN_AUDIT_CORRUPT_STATE");
        }
        if (!record || typeof record !== "object" || !record.eventId) {
            throw createAdminAuditError_("El registro persistente ADMIN contiene una entrada inválida; las operaciones sensibles permanecen detenidas.", "ADMIN_AUDIT_CORRUPT_STATE");
        }
        const finishedAt = Date.parse(record.finishedAt || "");
        const finalized = Boolean(record.outcome && record.outcome !== "started" && Number.isFinite(finishedAt));
        entries.push({ key, record, finishedAt, finalized });
    });

    const pending = entries.filter(entry => !entry.finalized);
    if (pending.length >= ADMIN_AUDIT_MAX_PENDING_) {
        throw createAdminAuditError_("Hay demasiadas operaciones ADMIN sin cierre de auditoría. Se requiere revisión antes de ejecutar nuevas operaciones sensibles.", "ADMIN_AUDIT_PENDING_REVIEW_REQUIRED");
    }

    const cutoff = currentTime - ADMIN_AUDIT_RETENTION_MS_;
    const finalized = entries.filter(entry => entry.finalized);
    finalized.filter(entry => entry.finishedAt < cutoff).forEach(entry => properties.deleteProperty(entry.key));
    const retained = finalized.filter(entry => entry.finishedAt >= cutoff).sort((left, right) => left.finishedAt - right.finishedAt);
    while (retained.length > ADMIN_AUDIT_MAX_FINALIZED_) {
        const oldest = retained.shift();
        properties.deleteProperty(oldest.key);
    }
}

function beginAdminAuditEvent_(action, payload, actor, startedAt) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try {
        lock.waitLock(10000);
        locked = true;
        const properties = PropertiesService.getScriptProperties();
        const now = Date.now();
        pruneAdminAuditProperties_(properties, now);

        const actorSource = actor && typeof actor === "object" ? actor : {};
        const actorId = safeAdminAuditId_(actorSource.userId, null);
        const rawRole = String(actorSource.role || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        const role = rawRole;
        if (!actorId || !["desarrollador", "jefe"].includes(role)) {
            throw createAdminAuditError_("No se pudo acreditar el actor autenticado para el registro ADMIN.", "ADMIN_AUDIT_ACTOR_INVALID");
        }

        const eventId = String(Utilities.getUuid() || "");
        const safeAction = safeAdminAuditId_(action, null);
        if (!eventId || !safeAction) throw createAdminAuditError_("No se pudo identificar la operación ADMIN para auditoría.", "ADMIN_AUDIT_EVENT_INVALID");
        const resource = getAdminAuditResourceSummary_(safeAction, payload, null);
        const start = startedAt instanceof Date ? startedAt : new Date(startedAt || now);
        const event = {
            schemaVersion: 1,
            eventId,
            actorId,
            actorRole: role,
            action: safeAction,
            resourceType: resource.resourceType,
            sourceResourceId: resource.sourceResourceId,
            targetResourceId: resource.targetResourceId,
            startedAt: start.toISOString(),
            finishedAt: null,
            outcome: "started",
            stage: "Inicio",
            durationMs: null,
            resultCode: "PENDING",
            partialResult: {}
        };
        const serialized = JSON.stringify(event);
        if (serialized.length > ADMIN_AUDIT_MAX_RECORD_LENGTH_) {
            throw createAdminAuditError_("El registro de auditoría excede el tamaño seguro.", "ADMIN_AUDIT_RECORD_TOO_LARGE", eventId);
        }
        const key = ADMIN_AUDIT_PROPERTY_PREFIX_ + eventId;
        properties.setProperty(key, serialized);
        if (properties.getProperty(key) !== serialized) {
            throw createAdminAuditError_("No se pudo verificar la persistencia del inicio de la operación ADMIN.", "ADMIN_AUDIT_START_FAILED", eventId);
        }
        return { key, eventId };
    } catch (error) {
        if (error && error.code) throw error;
        throw createAdminAuditError_("No se pudo iniciar el registro persistente de auditoría; la operación ADMIN no fue ejecutada.", "ADMIN_AUDIT_START_FAILED");
    } finally {
        if (locked) lock.releaseLock();
    }
}

function finalizeAdminAuditEvent_(auditEvent, details) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try {
        lock.waitLock(10000);
        locked = true;
        const properties = PropertiesService.getScriptProperties();
        const reference = auditEvent && typeof auditEvent === "object" ? auditEvent : {};
        const raw = properties.getProperty(reference.key);
        if (!raw) throw createAdminAuditError_("No se encontró el registro de inicio de auditoría ADMIN.", "ADMIN_AUDIT_EVENT_MISSING", reference.eventId);
        let event;
        try { event = JSON.parse(raw); } catch (error) {
            throw createAdminAuditError_("El registro de inicio de auditoría ADMIN está dañado.", "ADMIN_AUDIT_CORRUPT_STATE", reference.eventId);
        }
        if (!event || event.eventId !== reference.eventId || event.outcome !== "started" || event.finishedAt) {
            throw createAdminAuditError_("El evento de auditoría no coincide o ya fue finalizado.", "ADMIN_AUDIT_EVENT_STATE_INVALID", reference.eventId);
        }

        const input = details && typeof details === "object" ? details : {};
        const response = input.response && typeof input.response === "object" ? input.response : null;
        const error = input.error || null;
        const outcome = ["success", "partial", "error"].includes(input.outcome)
            ? input.outcome : getAdminAuditOutcome_(response, error);
        const resource = getAdminAuditResourceSummary_(event.action, input.payload, response);
        if (!event.sourceResourceId) event.sourceResourceId = resource.sourceResourceId;
        if (!event.targetResourceId) event.targetResourceId = resource.targetResourceId;
        event.finishedAt = new Date().toISOString();
        event.outcome = outcome;
        event.stage = safeAdminAuditStage_(input.stage || event.stage);
        const duration = Number(input.durationMs);
        event.durationMs = Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null;
        event.resultCode = getAdminAuditResultCode_(response, error, outcome);
        event.partialResult = getAdminAuditPartialResult_(response);
        const serialized = JSON.stringify(event);
        if (serialized.length > ADMIN_AUDIT_MAX_RECORD_LENGTH_) {
            throw createAdminAuditError_("El resultado resumido excede el tamaño seguro del registro de auditoría.", "ADMIN_AUDIT_RECORD_TOO_LARGE", event.eventId);
        }
        properties.setProperty(reference.key, serialized);
        if (properties.getProperty(reference.key) !== serialized) {
            throw createAdminAuditError_("No se pudo verificar el cierre del registro persistente ADMIN.", "ADMIN_AUDIT_FINALIZE_FAILED", event.eventId);
        }
        pruneAdminAuditProperties_(properties, Date.now());
        return event.eventId;
    } catch (error) {
        if (error && error.code) throw error;
        throw createAdminAuditError_("No se pudo finalizar el registro persistente de auditoría ADMIN.", "ADMIN_AUDIT_FINALIZE_FAILED", auditEvent && auditEvent.eventId);
    } finally {
        if (locked) lock.releaseLock();
    }
}

function doPostInternal_(e) {
    let response;
    const logs = [];
    let auditEvent = null;
    let auditFinalizeAttempted = false;
    let auditPayload = null;
    let auditStage = "Inicio";

    function logMessage(stage, message, current = 0, total = 0, isWarning = false, isError = false) {
        auditStage = safeAdminAuditStage_(stage) || auditStage;
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
        auditPayload = payload;

        const developerContext = action === 'ping' ? null : (ADMIN_MODAL_EDIT_ACTIONS.has(action) ? assertModalEditSession(payload) : assertDeveloperSession(payload));
        if (action !== "ping" && isSharedMutationAction_(action)) {
            auditEvent = beginAdminAuditEvent_(action, payload, developerContext, startTime);
        }

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
            case 'auditIdentifiers':
                response = handleAuditIdentifiers();
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
            case 'migrateReplacedImagesSchema':
                response = handleMigrateReplacedImagesSchema(payload, logMessage);
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
            case 'restoreReplacedImageFromTrash':
                response = handleRestoreReplacedImageFromTrash(payload, logMessage, developerContext);
                break;
            case 'permanentlyDeleteReplacedImage':
                response = handlePermanentlyDeleteReplacedImage(payload, logMessage, developerContext);
                break;
            case 'markReplacedImageInUse':
                response = handleMarkReplacedImageInUse(payload, logMessage, developerContext);
                break;
            case 'auditDriveImagesInCortes':
                response = handleAuditDriveImagesInCortes(payload, logMessage, developerContext);
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

        if (auditEvent) {
            auditFinalizeAttempted = true;
            try {
                finalizeAdminAuditEvent_(auditEvent, {
                    payload: auditPayload,
                    response,
                    stage: auditStage,
                    durationMs: endTime.getTime() - startTime.getTime()
                });
                response.auditEventId = auditEvent.eventId;
            } catch (auditError) {
                throw createAdminAuditError_(
                    "La operación terminó, pero no se pudo confirmar el cierre de su registro persistente. No se reportará como éxito. Evento: " + auditEvent.eventId,
                    "ADMIN_AUDIT_FINALIZE_FAILED",
                    auditEvent.eventId
                );
            }
        }

    } catch (error) {
        logMessage("Falla Crítica", `Error: ${error.message}`, 0, 0, false, true);

        // Calcular tiempo acumulado
        const errorEndTime = new Date();
        const durationSec = ((errorEndTime - startTime) / 1000).toFixed(2);
        let auditFinalizeError = null;
        if (auditEvent && !auditFinalizeAttempted) {
            auditFinalizeAttempted = true;
            try {
                finalizeAdminAuditEvent_(auditEvent, {
                    payload: auditPayload,
                    error,
                    outcome: "error",
                    stage: auditStage,
                    durationMs: errorEndTime.getTime() - startTime.getTime()
                });
            } catch (finalizeError) {
                auditFinalizeError = finalizeError;
            }
        }
        const auditEventId = auditEvent && auditEvent.eventId || error && error.auditEventId || "";
        const responseMessage = auditFinalizeError
            ? "La operación falló y el registro persistente no pudo cerrarse. El evento de inicio permanece para revisión. Evento: " + auditEventId
            : String(error && error.message || "Error administrativo.");

        response = {
            status: "error",
            code: auditFinalizeError ? "ADMIN_AUDIT_FINALIZE_FAILED" : error && error.code || "SERVICE_ERROR",
            estado: "error",
            message: responseMessage,
            mensaje: responseMessage,
            tiempoTranscurrido: `${durationSec}s`,
            logs: logs
        };
        if (auditEventId) response.auditEventId = auditEventId;
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
    const sourceManifest = adminRestoreValidateDatabaseSchema_(ss);
    const folder = DriveApp.getRootFolder();
    const runId = adminRestoreRunId_();
    const backupName = `GPSpedia_DB_BACKUP_${runId}`;
    logMessage("Respaldo", `Copiando archivo Spreadsheet '${ss.getName()}' con el nombre '${backupName}'...`);
    const createdBackupFile = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);
    const backupId = createdBackupFile.getId();
    try {
        createdBackupFile.setDescription(JSON.stringify({
            kind: ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_, version: 2, status: "incomplete",
            createdAt: runId, sourceSpreadsheetId: ss.getId()
        }));
        const backupFile = DriveApp.getFileById(backupId);
        const backupUrl = backupFile.getUrl();
        if (backupFile.getId() !== backupId || backupId === ss.getId() || backupFile.isTrashed() ||
            backupFile.getName() !== backupName || backupFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
            !isDirectChildOfDriveRoot(backupFile) ||
            !isBackupUrlForResource(backupUrl, `https://docs.google.com/spreadsheets/d/${backupId}`)) {
            throw new Error("El recurso creado no pudo verificarse como un respaldo de Spreadsheet válido.");
        }
        const verifiedSpreadsheet = SpreadsheetApp.openById(backupId);
        const copiedManifest = adminRestoreValidateDatabaseSchema_(verifiedSpreadsheet);
        if (verifiedSpreadsheet.getId() !== backupId || !verifiedSpreadsheet.getSheetByName(SHEET_NAMES.CORTES) ||
            copiedManifest.fingerprint !== sourceManifest.fingerprint || copiedManifest.sheetCount !== sourceManifest.sheetCount) {
            throw new Error("La copia de Spreadsheet no coincide íntegramente con el origen; no se registró como respaldo válido.");
        }
        const completeManifest = {
            kind: ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_, version: 2, status: "complete",
            createdAt: runId, sourceSpreadsheetId: ss.getId(), sheetCount: copiedManifest.sheetCount,
            rowCount: copiedManifest.rowCount, cellCount: copiedManifest.cellCount,
            formulaCount: copiedManifest.formulaCount, fingerprint: copiedManifest.fingerprint
        };
        backupFile.setDescription(JSON.stringify(completeManifest));
        const persistedManifest = JSON.parse(String(backupFile.getDescription() || ""));
        if (persistedManifest.kind !== completeManifest.kind || persistedManifest.version !== 2 ||
            persistedManifest.status !== "complete" || persistedManifest.fingerprint !== copiedManifest.fingerprint ||
            persistedManifest.sheetCount !== copiedManifest.sheetCount) {
            throw new Error("No se pudo confirmar el estado completo del manifiesto DB.");
        }
        if (!developerContext || !developerContext.userId) throw new Error("No se pudo asociar el respaldo verificado con la sesión de desarrollador.");
        CacheService.getScriptCache().put(getVinMigrationBackupCacheKey(developerContext.userId), backupId, 21600);
        logMessage("Respaldo", `Recurso de respaldo de base de datos creado, comparado y verificado. ID: ${backupId}`);
        return { status: "success", backupId, backupUrl, timestamp: runId,
            message: "Respaldo de base de datos creado y verificado correctamente." };
    } catch (error) {
        try {
            createdBackupFile.setDescription(JSON.stringify({
                kind: ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_, version: 2, status: "incomplete",
                createdAt: runId, sourceSpreadsheetId: ss.getId(), error: String(error.message || error)
            }));
        } catch (stateError) {
            logMessage("Respaldo", `No se pudo marcar como incompleta la copia ${backupId}: ${stateError.message}`, 0, 0, true);
        }
        try { createdBackupFile.setTrashed(true); } catch (cleanupError) {
            logMessage("Respaldo", `No se pudo retirar la copia incompleta ${backupId}: ${cleanupError.message}`, 0, 0, true);
        }
        throw error;
    }
}

function handleBackupDrive(payload, logMessage) {
    let backupFolder = null, manifestFile = null, state = null;
    try {
        const requestedBackupId = extractBackupFolderId(payload && payload.backupId);
        if (requestedBackupId) {
            backupFolder = DriveApp.getFolderById(requestedBackupId);
            if (backupFolder.getId() !== requestedBackupId || backupFolder.isTrashed() ||
                !String(backupFolder.getName() || "").startsWith("GPSpedia_Drive_BACKUP_") ||
                !isDirectChildOfDriveRoot(backupFolder)) {
                throw new Error("La carpeta indicada no es un respaldo reanudable de Drive dentro de la ubicación autorizada.");
            }
            const loaded = adminRestoreReadDriveBackupState_(backupFolder);
            manifestFile = loaded.file;
            state = loaded.state;
            state.folderCopyIds = state.folderCopyIds || {};
            state.folderCopyIds[state.sourceRootId] = backupFolder.getId();
            if (state.status === "complete") {
                const completedManifest = adminRestoreDriveManifest_(backupFolder);
                adminRestoreVerifyDriveBackupState_(state, backupFolder, completedManifest);
                adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "complete");
                return {
                    status: "success", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                    timestamp: state.createdAt, folderCount: state.sourceFolderCount,
                    fileCount: state.sourceFileCount, totalBytes: state.sourceTotalBytes,
                    message: "El respaldo de Drive ya estaba completo y fue verificado."
                };
            }
            if (state.status !== "copying") throw new Error("El respaldo no está en un estado reanudable; no se modificó.");
            if (state.sourceRootId !== DRIVE_FOLDER_ID) {
                state.status = "incomplete";
                state.lastError = "La carpeta de origen configurada no coincide con el manifiesto.";
                adminRestoreWriteDriveBackupState_(manifestFile, state);
                adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "incomplete");
                return { status: "error", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                    resumable: false, message: state.lastError + " Debe generarse un respaldo nuevo." };
            }
        } else {
            logMessage("Respaldo Drive", "Generando inventario verificable antes de iniciar la copia por lotes...");
            const sourceRoot = getCortesRootFolder();
            const sourceManifest = adminRestoreDriveManifest_(sourceRoot);
            const runId = adminRestoreRunId_();
            const backupFolderName = "GPSpedia_Drive_BACKUP_" + runId;
            backupFolder = DriveApp.getRootFolder().createFolder(backupFolderName);
            backupFolder.setDescription(JSON.stringify({
                kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2, status: "incomplete",
                createdAt: runId, sourceRootId: sourceRoot.getId()
            }));
            const folders = sourceManifest.entries.filter(entry => entry.type === "folder")
                .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path))
                .map(entry => ({
                    type: "folder", sourceId: entry.id, parentSourceId: entry.parentId, name: entry.name, path: entry.path,
                    mimeType: entry.mimeType, size: entry.size, sourceDescription: entry.description,
                    sourceLastUpdated: entry.lastUpdated, copyId: null, parentCopyId: null
                }));
            const files = sourceManifest.entries.filter(entry => entry.type === "file")
                .sort((a, b) => a.path.localeCompare(b.path))
                .map(entry => ({
                    type: "file", sourceId: entry.id, parentSourceId: entry.parentId, name: entry.name, path: entry.path,
                    mimeType: entry.mimeType, size: entry.size, sourceDescription: entry.description,
                    sourceLastUpdated: entry.lastUpdated, copyId: null, parentCopyId: null
                }));
            state = {
                kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2, status: "copying",
                runId, createdAt: runId, backupFolderId: backupFolder.getId(), manifestFileId: "",
                sourceRootId: sourceRoot.getId(), sourceRootName: sourceRoot.getName(),
                sourceFingerprint: sourceManifest.fingerprint,
                sourceIdentityFingerprint: sourceManifest.identityFingerprint,
                sourceFolderCount: sourceManifest.folderCount, sourceFileCount: sourceManifest.fileCount,
                sourceTotalBytes: sourceManifest.totalBytes, folders, files, folderCopyIds: {},
                nextFolderIndex: 0, nextFileIndex: 0, batchSize: ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_
            };
            manifestFile = backupFolder.createFile(ADMIN_RESTORE_DRIVE_MANIFEST_FILE_NAME_, JSON.stringify(state), "application/json");
            manifestFile.setDescription(ADMIN_RESTORE_DRIVE_MANIFEST_FILE_MARKER_);
            state.manifestFileId = manifestFile.getId();
            state.folderCopyIds[state.sourceRootId] = backupFolder.getId();
            adminRestoreWriteDriveBackupState_(manifestFile, state);
            adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "in_progress");
        }

        const sourceRoot = DriveApp.getFolderById(state.sourceRootId);
        if (sourceRoot.getId() !== DRIVE_FOLDER_ID || sourceRoot.getName() !== state.sourceRootName) {
            const integrityError = new Error("La carpeta de origen ya no coincide con la captura inicial.");
            integrityError.nonResumable = true;
            throw integrityError;
        }
        const batchSize = Math.max(1, Math.min(ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_, Number(state.batchSize) || ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_));
        let processedThisBatch = 0;
        while (state.nextFolderIndex < state.folders.length && processedThisBatch < batchSize) {
            const entry = state.folders[state.nextFolderIndex];
            const copy = adminRestoreCopyDriveFolderEntry_(entry, state, backupFolder);
            entry.copyId = copy.getId();
            state.folderCopyIds[entry.sourceId] = copy.getId();
            state.nextFolderIndex++;
            adminRestoreWriteDriveBackupState_(manifestFile, state);
            processedThisBatch++;
        }
        while (state.nextFolderIndex >= state.folders.length &&
            state.nextFileIndex < state.files.length && processedThisBatch < batchSize) {
            const entry = state.files[state.nextFileIndex];
            const copy = adminRestoreCopyDriveFileEntry_(entry, state, backupFolder);
            entry.copyId = copy.getId();
            state.nextFileIndex++;
            adminRestoreWriteDriveBackupState_(manifestFile, state);
            processedThisBatch++;
        }

        const processed = state.nextFolderIndex + state.nextFileIndex;
        const total = state.folders.length + state.files.length;
        if (processed < total) {
            adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "in_progress");
            logMessage("Respaldo Drive", `Lote verificado: ${processed}/${total} recursos. El respaldo permanece incompleto y puede reanudarse.`);
            return {
                status: "in_progress", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                timestamp: state.createdAt, processed, total, resumable: true,
                message: "Respaldo en progreso. Continúe con el mismo ID para procesar el siguiente lote."
            };
        }

        const currentSourceManifest = adminRestoreDriveManifest_(sourceRoot);
        if (currentSourceManifest.identityFingerprint !== state.sourceIdentityFingerprint ||
            !adminRestoreManifestsEqual_({
                folderCount: state.sourceFolderCount, fileCount: state.sourceFileCount,
                totalBytes: state.sourceTotalBytes, fingerprint: state.sourceFingerprint
            }, currentSourceManifest)) {
            state.status = "incomplete";
            state.lastError = "El origen cambió durante la copia; el contenedor no se puede registrar como respaldo completo.";
            adminRestoreWriteDriveBackupState_(manifestFile, state);
            adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "incomplete");
            return { status: "error", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                resumable: false, processed, total, message: state.lastError };
        }

        const copiedManifest = adminRestoreDriveManifest_(backupFolder);
        if (!adminRestoreManifestsEqual_({
            folderCount: state.sourceFolderCount, fileCount: state.sourceFileCount,
            totalBytes: state.sourceTotalBytes, fingerprint: state.sourceFingerprint
        }, copiedManifest)) {
            state.status = "incomplete";
            state.lastError = "La copia no coincide con el inventario inicial; el contenedor permanece incompleto.";
            adminRestoreWriteDriveBackupState_(manifestFile, state);
            adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "incomplete");
            return { status: "error", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                resumable: false, processed, total, message: state.lastError };
        }
        adminRestoreVerifyDriveBackupState_(state, backupFolder, copiedManifest);
        state.status = "complete";
        state.completedAt = new Date().toISOString();
        state.lastError = "";
        adminRestoreWriteDriveBackupState_(manifestFile, state);
        adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "complete");
        const finalState = adminRestoreReadDriveBackupState_(backupFolder).state;
        const finalManifest = adminRestoreDriveManifest_(backupFolder);
        adminRestoreVerifyDriveBackupState_(finalState, backupFolder, finalManifest);
        logMessage("Respaldo Drive", `Copia completa y verificada: ${finalManifest.folderCount} carpetas y ${finalManifest.fileCount} archivos.`);
        return {
            status: "success", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
            timestamp: state.createdAt, folderCount: finalManifest.folderCount,
            fileCount: finalManifest.fileCount, totalBytes: finalManifest.totalBytes,
            message: "Respaldo de Drive creado por lotes, reanudable y verificado correctamente."
        };
    } catch (error) {
        if (backupFolder && state && manifestFile) {
            state.lastError = String(error && error.message || error);
            if (error && error.nonResumable) state.status = "incomplete";
            try {
                adminRestoreWriteDriveBackupState_(manifestFile, state);
                adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, state.status === "incomplete" ? "incomplete" : "in_progress");
            } catch (persistError) {
                state.status = "incomplete";
                try { adminRestoreSetDriveBackupFolderStatus_(backupFolder, state, "incomplete"); } catch (statusError) {}
            }
            return {
                status: "error", backupId: backupFolder.getId(), backupUrl: backupFolder.getUrl(),
                resumable: state.status === "copying", message: state.lastError +
                    (state.status === "copying" ? " Puede reanudarse con el mismo ID." : " Genere un respaldo nuevo.")
            };
        }
        if (backupFolder) {
            try {
                backupFolder.setDescription(JSON.stringify({
                    kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2, status: "incomplete",
                    createdAt: adminRestoreRunId_(), error: String(error && error.message || error)
                }));
            } catch (statusError) {}
        }
        throw error;
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

// BEGIN ADMIN RESTORE RECOVERY
const ADMIN_RESTORE_REQUIRED_SCHEMA_ = {
    "Cortes": ["id","categoria","marca","modelo","versionesAplicables","anoDesde","anoHasta","tipoEncendido","imagenVehiculo","videoGuiaDesarmeUrl","contadorBusqueda","tipoCorte1","ubicacionCorte1","colorCableCorte1","configRelay1","imgCorte1","utilCorte1","colaboradorCorte1","tipoCorte2","ubicacionCorte2","colorCableCorte2","configRelay2","imgCorte2","utilCorte2","colaboradorCorte2","tipoCorte3","ubicacionCorte3","colorCableCorte3","configRelay3","imgCorte3","utilCorte3","colaboradorCorte3","apertura","imgApertura","cableAlimen","imgCableAlimen","timestamp","notaImportante","cableAlimen2","imgCableAlimen2","cableAlimen3","imgCableAlimen3"],
    "LogosMarca": ["id","nombreMarca","urlLogo"],
    "pys": ["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"],
    "AdminState": ["Action","LastIndex","Total","Percentage","Date","ProcessId"],
    "Tutorial": ["ID","Tema","Imagen","comoIdentificarlo","dondeEncontrarlo","Detalles","Video","Colaborador"],
    "Relay": ["ID","configuracion","funcion","vehiculoDondeSeUtiliza","pin30Entrada","pin85BobinaPositivo","pin86bobinaNegativo","pin87aComunCerrado","pin87ComunmenteAbierto","imagen","observacion"],
    "ActiveSessions": ["ID_Usuario","Usuario","ActiveSessions","date","Logs","LastActivityAt"],
    "Feedbacks": ["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"],
    "Contactanos": ["Contacto_ID","User_ID","Asunto","Mensaje","Respuesta_mensaje","ID_usuario_responde"],
    "Logs": ["Timestamp","Level","Message","Data"],
    "ActividadUsuario": ["id","timestamp","idUsuario","nombreUsuario","tipoActividad","idElementoAsociado","detalle"],
    "Users": ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
    "Imagenes_Reemplazadas": ["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"]
};
const ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_ = "GPSpediaDriveBackup";
const ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_ = "GPSpediaDatabaseBackup";
const ADMIN_RESTORE_DRIVE_MANIFEST_FILE_NAME_ = "__GPSpedia_DRIVE_BACKUP_MANIFEST__.json";
const ADMIN_RESTORE_DRIVE_MANIFEST_FILE_MARKER_ = "GPSpediaDriveBackupManifest";
const ADMIN_RESTORE_DRIVE_COPY_TAG_KIND_ = "GPSpediaDriveBackupItem";
const ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_ = 40;

function adminRestoreRunId_() {
    return Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss") + "_" +
        String(Utilities.getUuid()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}
function adminRestoreHash_(value) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ""));
    return bytes.map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
}
function adminRestoreNormalizeCell_(value) {
    if (value === null || value === undefined || value === "") return "";
    if (value instanceof Date) return { date: value.toISOString() };
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    return value;
}
function adminRestoreSheetManifest_(sheet) {
    const lastRow = sheet.getLastRow(), lastColumn = sheet.getLastColumn();
    const chunks = [];
    let nonEmptyRows = 0, nonEmptyCells = 0, formulaCount = 0;
    for (let startRow = 1; startRow <= lastRow && lastColumn > 0; startRow += 200) {
        const rowCount = Math.min(200, lastRow - startRow + 1);
        const range = sheet.getRange(startRow, 1, rowCount, lastColumn);
        const values = range.getValues(), formulas = range.getFormulas();
        const normalizedRows = values.map((row, rowIndex) => {
            let rowHasContent = false;
            const normalized = row.map((value, columnIndex) => {
                const formula = formulas[rowIndex][columnIndex];
                if (formula) {
                    formulaCount++; nonEmptyCells++; rowHasContent = true;
                    return ["formula", formula];
                }
                const cell = adminRestoreNormalizeCell_(value);
                if (cell !== "") { nonEmptyCells++; rowHasContent = true; }
                return ["value", cell];
            });
            if (rowHasContent) nonEmptyRows++;
            return normalized;
        });
        chunks.push(adminRestoreHash_(JSON.stringify(normalizedRows)));
    }
    return { lastRow, lastColumn, nonEmptyRows, nonEmptyCells, formulaCount,
        fingerprint: adminRestoreHash_(chunks.join("|")) };
}
function adminRestoreSpreadsheetManifest_(spreadsheet) {
    const entries = spreadsheet.getSheets().map(sheet => ({
        name: sheet.getName(), stats: adminRestoreSheetManifest_(sheet)
    })).sort((a, b) => a.name.localeCompare(b.name));
    const totals = entries.reduce((result, entry) => {
        result.rowCount += entry.stats.nonEmptyRows;
        result.cellCount += entry.stats.nonEmptyCells;
        result.formulaCount += entry.stats.formulaCount;
        return result;
    }, { rowCount: 0, cellCount: 0, formulaCount: 0 });
    return { sheetCount: entries.length, rowCount: totals.rowCount, cellCount: totals.cellCount,
        formulaCount: totals.formulaCount,
        fingerprint: adminRestoreHash_(entries.map(entry => entry.name + ":" + entry.stats.fingerprint).join("|")),
        entries };
}
function adminRestoreDriveManifestFileId_(folder) {
    try {
        const description = JSON.parse(String(folder.getDescription() || ""));
        return description.kind === ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_
            ? String(description.manifestFileId || "") : "";
    } catch (error) { return ""; }
}
function adminRestoreIsDriveManifestFile_(file, folder) {
    const manifestId = adminRestoreDriveManifestFileId_(folder);
    if (manifestId && String(file.getId()) === manifestId) return true;
    return String(file.getName() || "") === ADMIN_RESTORE_DRIVE_MANIFEST_FILE_NAME_ &&
        String(file.getDescription() || "") === ADMIN_RESTORE_DRIVE_MANIFEST_FILE_MARKER_;
}
function adminRestoreDriveTimestamp_(resource) {
    try {
        const updated = resource.getLastUpdated();
        return updated && typeof updated.getTime === "function" ? updated.getTime() : 0;
    } catch (error) { return 0; }
}
function adminRestoreDriveManifest_(folder) {
    const entries = [];
    let folderCount = 0, fileCount = 0, totalBytes = 0;
    const visit = (current, prefix, depth) => {
        if (depth > 100) throw new Error("La estructura de Drive supera la profundidad permitida para una restauración segura.");
        const folders = current.getFolders();
        while (folders.hasNext()) {
            const child = folders.next();
            if (child.isTrashed()) throw new Error("El respaldo contiene una subcarpeta en la papelera.");
            const path = prefix ? prefix + "/" + child.getName() : child.getName();
            folderCount++;
            if (folderCount + fileCount > 50000) throw new Error("El respaldo supera el límite de recursos verificables por operación.");
            entries.push({
                type: "folder", id: String(child.getId()), parentId: String(current.getId()),
                name: String(child.getName()), path, mimeType: "application/vnd.google-apps.folder",
                size: 0, lastUpdated: adminRestoreDriveTimestamp_(child),
                description: String(child.getDescription() || "")
            });
            visit(child, path, depth + 1);
        }
        const files = current.getFiles();
        while (files.hasNext()) {
            const file = files.next();
            if (adminRestoreIsDriveManifestFile_(file, current)) continue;
            if (file.isTrashed()) throw new Error("El respaldo contiene un archivo en la papelera.");
            const path = prefix ? prefix + "/" + file.getName() : file.getName();
            const size = Number(file.getSize()) || 0;
            fileCount++; totalBytes += size;
            if (folderCount + fileCount > 50000) throw new Error("El respaldo supera el límite de recursos verificables por operación.");
            entries.push({
                type: "file", id: String(file.getId()), parentId: String(current.getId()),
                name: String(file.getName()), path, mimeType: String(file.getMimeType()),
                size, lastUpdated: adminRestoreDriveTimestamp_(file),
                description: String(file.getDescription() || "")
            });
        }
    };
    visit(folder, "", 0);
    entries.sort((a, b) => a.path.localeCompare(b.path) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
    const structural = entries.map(entry => JSON.stringify(entry.type === "folder"
        ? ["D", entry.path] : ["F", entry.path, entry.mimeType, entry.size])).join("\n");
    const identity = entries.map(entry => JSON.stringify([
        entry.type, entry.id, entry.parentId, entry.path, entry.mimeType, entry.size,
        entry.lastUpdated, entry.description
    ])).join("\n");
    return {
        folderCount, fileCount, totalBytes,
        fingerprint: adminRestoreHash_(structural),
        identityFingerprint: adminRestoreHash_(identity),
        entries
    };
}
function adminRestoreReadDriveBackupState_(folder) {
    let description;
    try { description = JSON.parse(String(folder.getDescription() || "")); }
    catch (error) { throw new Error("El respaldo Drive no tiene un estado/manifiesto verificable."); }
    if (description.kind !== ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_ || description.version !== 2 ||
        description.backupFolderId !== folder.getId() || !["in_progress", "complete"].includes(description.status) || !description.manifestFileId) {
        throw new Error("El contenedor Drive no tiene estado completo o reanudable; no se permite restaurarlo.");
    }
    const file = DriveApp.getFileById(String(description.manifestFileId));
    if (!file || file.isTrashed() || file.getName() !== ADMIN_RESTORE_DRIVE_MANIFEST_FILE_NAME_ ||
        file.getMimeType() !== "application/json" || String(file.getDescription() || "") !== ADMIN_RESTORE_DRIVE_MANIFEST_FILE_MARKER_ ||
        !adminRestoreHasParent_(file, folder.getId())) {
        throw new Error("El archivo de manifiesto Drive falta, está alterado o no pertenece al contenedor.");
    }
    let state;
    try { state = JSON.parse(file.getBlob().getDataAsString()); }
    catch (error) { throw new Error("El archivo de manifiesto Drive está dañado; no se inició la operación."); }
    if (!state || state.kind !== ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_ || state.version !== 2 ||
        state.backupFolderId !== folder.getId() || state.manifestFileId !== file.getId() ||
        !Array.isArray(state.folders) || !Array.isArray(state.files) ||
        !["copying", "complete"].includes(state.status)) {
        throw new Error("El estado interno del manifiesto Drive no coincide con el contenedor.");
    }
    if (description.status === "complete" && state.status !== "complete") {
        throw new Error("El contenedor declara estar completo, pero su manifiesto interno no lo confirma.");
    }
    if (description.status === "in_progress" && state.status !== "copying" && state.status !== "complete") {
        throw new Error("El manifiesto Drive no está en un estado reanudable.");
    }
    return { description, file, state };
}
function adminRestoreWriteDriveBackupState_(file, state) {
    file.setContent(JSON.stringify(state));
    const persisted = JSON.parse(file.getBlob().getDataAsString());
    if (!persisted || persisted.runId !== state.runId || persisted.status !== state.status ||
        persisted.nextFolderIndex !== state.nextFolderIndex || persisted.nextFileIndex !== state.nextFileIndex ||
        persisted.manifestFileId !== state.manifestFileId) {
        throw new Error("No se pudo verificar el avance persistido del manifiesto Drive.");
    }
}
function adminRestoreSetDriveBackupFolderStatus_(folder, state, status) {
    const description = {
        kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2, status,
        createdAt: state.createdAt, backupFolderId: folder.getId(),
        sourceRootId: state.sourceRootId, manifestFileId: state.manifestFileId,
        folderCount: state.sourceFolderCount, fileCount: state.sourceFileCount,
        totalBytes: state.sourceTotalBytes, fingerprint: state.sourceFingerprint
    };
    folder.setDescription(JSON.stringify(description));
    const persisted = JSON.parse(String(folder.getDescription() || ""));
    if (persisted.kind !== description.kind || persisted.version !== 2 ||
        persisted.status !== status || persisted.manifestFileId !== state.manifestFileId ||
        persisted.backupFolderId !== folder.getId()) {
        throw new Error("No se pudo verificar el estado " + status + " del contenedor Drive.");
    }
}
function adminRestoreDriveIntegrityError_(message) {
    const error = new Error(message);
    error.nonResumable = true;
    return error;
}
function adminRestoreVerifyDriveSourceEntry_(entry) {
    let resource;
    try {
        resource = entry.type === "folder"
            ? DriveApp.getFolderById(entry.sourceId)
            : DriveApp.getFileById(entry.sourceId);
    } catch (error) {
        throw adminRestoreDriveIntegrityError_("El recurso de origen dejó de estar disponible: " + entry.path);
    }
    if (!resource || resource.isTrashed() || String(resource.getName()) !== entry.name ||
        !adminRestoreHasParent_(resource, entry.parentSourceId) ||
        String(resource.getDescription() || "") !== String(entry.sourceDescription || "")) {
        throw adminRestoreDriveIntegrityError_("El recurso de origen cambió desde el inventario: " + entry.path);
    }
    if (entry.type === "file" &&
        (String(resource.getMimeType()) !== entry.mimeType || Number(resource.getSize()) !== Number(entry.size) ||
            (entry.sourceLastUpdated && adminRestoreDriveTimestamp_(resource) !== Number(entry.sourceLastUpdated)))) {
        throw adminRestoreDriveIntegrityError_("El archivo de origen cambió desde el inventario: " + entry.path);
    }
    return resource;
}
function adminRestoreFindTaggedDriveCopy_(parent, entry, state, type) {
    const iterator = type === "folder" ? parent.getFoldersByName(entry.name) : parent.getFilesByName(entry.name);
    let found = null;
    while (iterator.hasNext()) {
        const candidate = iterator.next();
        let tag;
        try { tag = JSON.parse(String(candidate.getDescription() || "")); }
        catch (error) { continue; }
        if (tag.kind === ADMIN_RESTORE_DRIVE_COPY_TAG_KIND_ && tag.runId === state.runId &&
            tag.sourceId === entry.sourceId && tag.path === entry.path && tag.type === type) {
            if (found) throw adminRestoreDriveIntegrityError_("Se detectaron copias duplicadas para " + entry.path + ".");
            found = candidate;
        }
    }
    return found;
}
function adminRestoreCopyDriveFolderEntry_(entry, state, backupFolder) {
    adminRestoreVerifyDriveSourceEntry_(entry);
    const parentCopyId = entry.parentSourceId === state.sourceRootId
        ? backupFolder.getId() : String((state.folderCopyIds || {})[entry.parentSourceId] || "");
    if (!parentCopyId) throw adminRestoreDriveIntegrityError_("Falta la carpeta padre de destino para " + entry.path + ".");
    entry.parentCopyId = parentCopyId;
    const parent = DriveApp.getFolderById(parentCopyId);
    let copy = adminRestoreFindTaggedDriveCopy_(parent, entry, state, "folder");
    if (!copy) {
        copy = parent.createFolder(entry.name);
        try {
            copy.setDescription(JSON.stringify({
                kind: ADMIN_RESTORE_DRIVE_COPY_TAG_KIND_, runId: state.runId,
                sourceId: entry.sourceId, path: entry.path, type: "folder"
            }));
        } catch (error) {
            throw adminRestoreDriveIntegrityError_("No se pudo etiquetar la carpeta copiada " + entry.path + ".");
        }
    }
    if (!copy || copy.isTrashed() || copy.getName() !== entry.name ||
        !adminRestoreHasParent_(copy, parentCopyId)) {
        throw adminRestoreDriveIntegrityError_("La carpeta copiada no pudo verificarse: " + entry.path);
    }
    return copy;
}
function adminRestoreCopyDriveFileEntry_(entry, state, backupFolder) {
    const source = adminRestoreVerifyDriveSourceEntry_(entry);
    const parentCopyId = entry.parentSourceId === state.sourceRootId
        ? backupFolder.getId() : String((state.folderCopyIds || {})[entry.parentSourceId] || "");
    if (!parentCopyId) throw adminRestoreDriveIntegrityError_("Falta la carpeta padre de destino para " + entry.path + ".");
    entry.parentCopyId = parentCopyId;
    const parent = DriveApp.getFolderById(parentCopyId);
    let copy = adminRestoreFindTaggedDriveCopy_(parent, entry, state, "file");
    if (!copy) {
        copy = source.makeCopy(entry.name, parent);
        try {
            copy.setDescription(JSON.stringify({
                kind: ADMIN_RESTORE_DRIVE_COPY_TAG_KIND_, runId: state.runId,
                sourceId: entry.sourceId, path: entry.path, type: "file"
            }));
        } catch (error) {
            throw adminRestoreDriveIntegrityError_("No se pudo etiquetar el archivo copiado " + entry.path + ".");
        }
    }
    if (!copy || copy.isTrashed() || copy.getName() !== entry.name ||
        copy.getMimeType() !== entry.mimeType || Number(copy.getSize()) !== Number(entry.size) ||
        !adminRestoreHasParent_(copy, parentCopyId)) {
        throw adminRestoreDriveIntegrityError_("El archivo copiado no pudo verificarse: " + entry.path);
    }
    return copy;
}
function adminRestoreVerifyDriveBackupState_(state, backupFolder, actualManifest) {
    if (!state || state.status !== "complete" && state.status !== "copying") {
        throw adminRestoreDriveIntegrityError_("El estado del manifiesto no permite verificar el respaldo.");
    }
    if (state.sourceFolderCount !== actualManifest.folderCount ||
        state.sourceFileCount !== actualManifest.fileCount ||
        state.sourceTotalBytes !== actualManifest.totalBytes ||
        state.sourceFingerprint !== actualManifest.fingerprint) {
        throw adminRestoreDriveIntegrityError_("El inventario real no coincide con el manifiesto del respaldo Drive.");
    }
    const actualById = new Map(actualManifest.entries.map(entry => [String(entry.id), entry]));
    const expectedEntries = (state.folders || []).concat(state.files || []);
    if (expectedEntries.length !== actualManifest.entries.length) {
        throw adminRestoreDriveIntegrityError_("El manifiesto no contiene una relación individual de todos los recursos Drive.");
    }
    expectedEntries.forEach(entry => {
        if (!entry.copyId || !entry.parentCopyId) throw adminRestoreDriveIntegrityError_("Falta el ID de copia o de carpeta padre para " + entry.path + ".");
        const actual = actualById.get(String(entry.copyId));
        if (!actual || actual.type !== entry.type ||
            actual.path !== entry.path || actual.name !== entry.name ||
            String(actual.parentId) !== String(entry.parentCopyId) ||
            actual.mimeType !== entry.mimeType || Number(actual.size) !== Number(entry.size)) {
            throw adminRestoreDriveIntegrityError_("La relación ID/ruta/MIME/tamaño del recurso no coincide: " + entry.path);
        }
    });
    return true;
}
function adminRestoreCreateCompletedDriveManifest_(folder, manifest, runId, sourceRootId) {
    const state = {
        kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2, status: "complete",
        runId, createdAt: runId, backupFolderId: folder.getId(), manifestFileId: "",
        sourceRootId, sourceRootName: "", sourceFingerprint: manifest.fingerprint,
        sourceIdentityFingerprint: manifest.identityFingerprint,
        sourceFolderCount: manifest.folderCount, sourceFileCount: manifest.fileCount,
        sourceTotalBytes: manifest.totalBytes, nextFolderIndex: manifest.folderCount,
        nextFileIndex: manifest.fileCount, batchSize: ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_,
        folderCopyIds: {}, folders: [], files: []
    };
    state.folderCopyIds[sourceRootId] = folder.getId();
    manifest.entries.forEach(entry => {
        const parentCopyId = String(entry.parentId) === String(sourceRootId) ? folder.getId() : String(entry.parentId);
        const item = {
            type: entry.type, sourceId: entry.id, copyId: entry.id, parentSourceId: entry.parentId,
            parentCopyId, name: entry.name, path: entry.path, mimeType: entry.mimeType,
            size: entry.size, sourceDescription: entry.description,
            sourceLastUpdated: entry.lastUpdated
        };
        if (entry.type === "folder") {
            state.folders.push(item);
            state.folderCopyIds[entry.id] = entry.id;
        } else {
            state.files.push(item);
        }
    });
    const manifestFile = folder.createFile(ADMIN_RESTORE_DRIVE_MANIFEST_FILE_NAME_, JSON.stringify(state), "application/json");
    state.manifestFileId = manifestFile.getId();
    manifestFile.setDescription(ADMIN_RESTORE_DRIVE_MANIFEST_FILE_MARKER_);
    folder.setDescription(JSON.stringify({ kind: ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_, version: 2,
        status: "in_progress", backupFolderId: folder.getId(), manifestFileId: state.manifestFileId }));
    adminRestoreWriteDriveBackupState_(manifestFile, state);
    adminRestoreSetDriveBackupFolderStatus_(folder, state, "complete");
    const loaded = adminRestoreReadDriveBackupState_(folder);
    adminRestoreVerifyDriveBackupState_(loaded.state, folder, adminRestoreDriveManifest_(folder));
    return loaded.state;
}
function adminRestoreManifestsEqual_(left, right) {
    return Boolean(left && right && left.folderCount === right.folderCount &&
        left.fileCount === right.fileCount && left.totalBytes === right.totalBytes &&
        left.fingerprint === right.fingerprint);
}
function adminRestoreValidateDatabaseSchema_(spreadsheet) {
    const sheets = spreadsheet.getSheets();
    const names = new Set(sheets.map(sheet => sheet.getName()));
    Object.keys(ADMIN_RESTORE_REQUIRED_SCHEMA_).forEach(name => {
        if (!names.has(name)) throw new Error("El respaldo está incompleto: falta la hoja obligatoria «" + name + "».");
        const sheet = spreadsheet.getSheetByName(name), expected = ADMIN_RESTORE_REQUIRED_SCHEMA_[name];
        const expectedHeaders = name === "Tutorial" && sheet.getLastColumn() === 7 ? expected.slice(0, 7) : expected;
        if (sheet.getLastRow() < 1 || sheet.getLastColumn() < expectedHeaders.length) {
            throw new Error("El respaldo tiene una estructura incompleta en la hoja «" + name + "».");
        }
        const actual = sheet.getRange(1, 1, 1, expectedHeaders.length).getDisplayValues()[0];
        expectedHeaders.forEach((header, index) => {
            if (String(actual[index] || "").trim() !== header) {
                throw new Error("Esquema incompatible en «" + name + "», columna " + (index + 1) + ": se esperaba «" + header + "».");
            }
        });
    });
    sheets.forEach(sheet => {
        const name = String(sheet.getName() || "");
        if (!name || name.indexOf("__GP_RESTORE_") === 0 || name === "TEMP_RESTORE_HOLDER") {
            throw new Error("El respaldo contiene un nombre de hoja reservado o no válido.");
        }
    });
    return adminRestoreSpreadsheetManifest_(spreadsheet);
}
function adminRestoreCreateDatabaseRollback_(targetSpreadsheet, runId) {
    const sourceManifest = adminRestoreSpreadsheetManifest_(targetSpreadsheet);
    const sourceFile = DriveApp.getFileById(SPREADSHEET_ID);
    const rollbackName = "GPSpedia_DB_BACKUP_RESTORE_ROLLBACK_" + runId;
    const rollbackFile = sourceFile.makeCopy(rollbackName, DriveApp.getRootFolder());
    try {
        const copiedFile = DriveApp.getFileById(rollbackFile.getId());
        const copiedSpreadsheet = SpreadsheetApp.openById(rollbackFile.getId());
        const copiedManifest = adminRestoreSpreadsheetManifest_(copiedSpreadsheet);
        if (copiedFile.isTrashed() || copiedFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
            copiedFile.getName() !== rollbackName || !isDirectChildOfDriveRoot(copiedFile) ||
            sourceManifest.fingerprint !== copiedManifest.fingerprint || sourceManifest.sheetCount !== copiedManifest.sheetCount) {
            throw new Error("No se pudo verificar el respaldo preventivo del estado actual de la base de datos.");
        }
        const completeManifest = {
            kind: ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_, version: 2, status: "complete",
            createdAt: runId, sourceSpreadsheetId: SPREADSHEET_ID,
            sheetCount: copiedManifest.sheetCount, rowCount: copiedManifest.rowCount,
            cellCount: copiedManifest.cellCount, formulaCount: copiedManifest.formulaCount,
            fingerprint: copiedManifest.fingerprint
        };
        copiedFile.setDescription(JSON.stringify(completeManifest));
        const persisted = JSON.parse(String(copiedFile.getDescription() || ""));
        if (persisted.status !== "complete" || persisted.version !== 2 ||
            persisted.fingerprint !== copiedManifest.fingerprint) {
            throw new Error("No se pudo verificar el manifiesto completo del rollback DB.");
        }
        return { file: copiedFile, id: copiedFile.getId(), url: copiedFile.getUrl(), manifest: copiedManifest };
    } catch (error) {
        try { rollbackFile.setDescription(JSON.stringify({ kind: ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_, version: 2, status: "incomplete", error: String(error.message || error) })); } catch (stateError) {}
        try { rollbackFile.setTrashed(true); } catch (cleanupError) {}
        throw error;
    }
}
function adminRestoreSwapDatabaseSheets_(spreadsheet, originalSheets, stageEntries, runId) {
    const backupNames = new Set(stageEntries.map(entry => entry.name));
    const originalEntries = originalSheets.map((sheet, index) => ({
        sheet, name: sheet.getName(), temporaryName: "__GP_RESTORE_OLD_" + runId + "_" + index,
        renamed: false
    }));
    const promotedEntries = [];
    try {
        originalEntries.forEach(entry => {
            if (!backupNames.has(entry.name)) return;
            entry.sheet.setName(entry.temporaryName);
            entry.renamed = true;
        });
        stageEntries.forEach(entry => {
            entry.stage.setName(entry.name);
            entry.promoted = true;
            promotedEntries.push(entry);
        });
        SpreadsheetApp.flush();
        stageEntries.forEach(entry => {
            const restored = spreadsheet.getSheetByName(entry.name);
            if (!restored || adminRestoreSheetManifest_(restored).fingerprint !== entry.fingerprint) {
                throw new Error("La hoja restaurada «" + entry.name + "» no coincide con el respaldo después del intercambio.");
            }
        });
    } catch (error) {
        const rollbackErrors = [];
        promotedEntries.slice().reverse().forEach(entry => {
            try { entry.stage.setName("__GP_RESTORE_STAGE_" + runId + "_" + stageEntries.indexOf(entry)); }
            catch (renameError) { rollbackErrors.push(entry.name + " (retirar staging): " + String(renameError.message || renameError)); }
        });
        originalEntries.slice().reverse().forEach(entry => {
            if (!entry.renamed) return;
            try { entry.sheet.setName(entry.name); }
            catch (renameError) { rollbackErrors.push(entry.name + " (recuperar original): " + String(renameError.message || renameError)); }
        });
        try { SpreadsheetApp.flush(); }
        catch (flushError) { rollbackErrors.push("flush: " + String(flushError.message || flushError)); }
        if (rollbackErrors.length) {
            throw new Error("Falló el intercambio de hojas y la reversión de nombres no pudo verificarse. Conserva las hojas __GP_RESTORE_* y el respaldo recuperable. " +
                rollbackErrors.join(" | ") + ". Motivo original: " + String(error.message || error));
        }
        throw new Error("Intercambio de hojas abortado; los nombres originales fueron restaurados. Motivo: " + String(error.message || error));
    }

    const extras = originalEntries.filter(entry => !backupNames.has(entry.name)).map(entry => entry.name);
    const cleanupErrors = [];
    originalEntries.filter(entry => entry.renamed).forEach(entry => {
        try {
            if (spreadsheet.getSheets().length <= 1) throw new Error("No se puede eliminar la última hoja.");
            spreadsheet.deleteSheet(entry.sheet);
        } catch (error) { cleanupErrors.push(entry.name + ": " + String(error.message || error)); }
    });
    return { preservedExtraSheets: extras, cleanupErrors };
}
function adminRestoreDeleteTemporarySheets_(spreadsheet, sheets) {
    const errors = [];
    (sheets || []).forEach(sheet => {
        if (!sheet) return;
        try {
            const current = spreadsheet.getSheetByName(sheet.getName());
            if (!current) return;
            if (spreadsheet.getSheets().length <= 1) throw new Error("No se puede eliminar la última hoja.");
            spreadsheet.deleteSheet(current);
        } catch (error) { errors.push(String(sheet.getName()) + ": " + String(error.message || error)); }
    });
    return errors;
}
function adminRestoreHasParent_(resource, parentId) {
    const parents = resource.getParents();
    while (parents.hasNext()) if (String(parents.next().getId()) === String(parentId)) return true;
    return false;
}
function adminRestoreMoveFolderContents_(source, destination) {
    const fileIterator = source.getFiles(), files = [];
    while (fileIterator.hasNext()) {
        const file = fileIterator.next();
        if (adminRestoreIsDriveManifestFile_(file, source)) continue;
        files.push(file);
    }
    files.forEach(file => {
        if (!adminRestoreHasParent_(file, destination.getId())) destination.addFile(file);
        if (adminRestoreHasParent_(file, source.getId())) source.removeFile(file);
        if (!adminRestoreHasParent_(file, destination.getId()) || adminRestoreHasParent_(file, source.getId())) {
            throw new Error("No se pudo mover de forma verificable el archivo «" + file.getName() + "».");
        }
    });
    const folderIterator = source.getFolders(), folders = [];
    while (folderIterator.hasNext()) folders.push(folderIterator.next());
    folders.forEach(folder => {
        if (!adminRestoreHasParent_(folder, destination.getId())) destination.addFolder(folder);
        if (adminRestoreHasParent_(folder, source.getId())) source.removeFolder(folder);
        if (!adminRestoreHasParent_(folder, destination.getId()) || adminRestoreHasParent_(folder, source.getId())) {
            throw new Error("No se pudo mover de forma verificable la carpeta «" + folder.getName() + "».");
        }
    });
}
function adminRestoreCopyFolderRecursively_(source, target, storedManifest) {
    const files = source.getFiles();
    while (files.hasNext()) {
        const file = files.next();
        if (adminRestoreIsDriveManifestFile_(file, source)) continue;
        const copy = file.makeCopy(file.getName(), target);
        if (!copy || copy.getName() !== file.getName() || copy.getMimeType() !== file.getMimeType() ||
            Number(copy.getSize()) !== Number(file.getSize()) || copy.isTrashed()) {
            throw new Error("No se pudo verificar la copia del archivo «" + file.getName() + "».");
        }
        const manifestEntry = storedManifest && (storedManifest.files || []).find(entry => String(entry.copyId) === String(file.getId()));
        if (manifestEntry) {
            copy.setDescription(String(manifestEntry.sourceDescription || ""));
            if (String(copy.getDescription() || "") !== String(manifestEntry.sourceDescription || "")) {
                throw new Error("No se pudo restaurar la descripción original del archivo «" + file.getName() + "».");
            }
        }
    }
    const folders = source.getFolders();
    while (folders.hasNext()) {
        const child = folders.next();
        const targetChild = target.createFolder(child.getName());
        const manifestEntry = storedManifest && (storedManifest.folders || []).find(entry => String(entry.copyId) === String(child.getId()));
        if (manifestEntry) {
            targetChild.setDescription(String(manifestEntry.sourceDescription || ""));
            if (String(targetChild.getDescription() || "") !== String(manifestEntry.sourceDescription || "")) {
                throw new Error("No se pudo restaurar la descripción original de la carpeta «" + child.getName() + "».");
            }
        }
        adminRestoreCopyFolderRecursively_(child, targetChild, storedManifest);
    }
}
// END ADMIN RESTORE RECOVERY

/**
 * Restaurar la base de datos completa a partir de un ID de copia
 */
function handleRestoreDatabase(payload, logMessage) {
    const backupId = extractDriveFileId(payload && payload.backupId);
    if (!backupId) throw new Error("ID o enlace de respaldo de Google Sheets no válido o no proporcionado.");
    if (backupId === SPREADSHEET_ID) throw new Error("El Spreadsheet productivo no puede utilizarse como origen de su propia restauración.");
    const backupFile = DriveApp.getFileById(backupId);
    if (backupFile.getId() !== backupId || backupFile.isTrashed() ||
        backupFile.getMimeType() !== "application/vnd.google-apps.spreadsheet" ||
        !String(backupFile.getName() || "").startsWith("GPSpedia_DB_BACKUP_") ||
        !isDirectChildOfDriveRoot(backupFile)) {
        throw new Error("El recurso indicado no es un respaldo de Spreadsheet válido dentro de la ubicación autorizada.");
    }
    const backupSS = SpreadsheetApp.openById(backupId);
    if (backupSS.getId() !== backupId) throw new Error("No se pudo verificar la identidad de la Spreadsheet de respaldo.");
    const backupManifest = adminRestoreValidateDatabaseSchema_(backupSS);
    const rawManifest = String(backupFile.getDescription() || "").trim();
    if (!rawManifest) throw new Error("El respaldo DB no tiene manifiesto de estado completo; los respaldos históricos deben generarse nuevamente.");
    let storedManifest;
    try { storedManifest = JSON.parse(rawManifest); }
    catch (error) { throw new Error("El manifiesto del respaldo DB está dañado; no se inició la restauración."); }
    if (storedManifest.kind !== ADMIN_RESTORE_DB_MANIFEST_DESCRIPTION_ || storedManifest.version !== 2 ||
        storedManifest.status !== "complete" || storedManifest.sheetCount !== backupManifest.sheetCount ||
        storedManifest.rowCount !== backupManifest.rowCount || storedManifest.cellCount !== backupManifest.cellCount ||
        storedManifest.formulaCount !== backupManifest.formulaCount ||
        storedManifest.fingerprint !== backupManifest.fingerprint) {
        throw new Error("El respaldo DB no tiene estado completo o su manifiesto no coincide con el contenido; no se inició la restauración.");
    }

    const targetSS = SpreadsheetApp.openById(SPREADSHEET_ID);
    const runId = adminRestoreRunId_();
    logMessage("Restauración DB", "Respaldo validado. Creando staging y copia recuperable del estado actual antes de modificar hojas...");
    const rollbackBackup = adminRestoreCreateDatabaseRollback_(targetSS, runId);
    const originalSheets = targetSS.getSheets().slice();
    const stageEntries = [];
    try {
        backupSS.getSheets().forEach((sourceSheet, index) => {
            const stage = sourceSheet.copyTo(targetSS);
            const temporaryName = "__GP_RESTORE_STAGE_" + runId + "_" + index;
            const entry = { source: sourceSheet, stage, name: sourceSheet.getName(), temporaryName,
                fingerprint: adminRestoreSheetManifest_(sourceSheet).fingerprint };
            stageEntries.push(entry);
            stage.setName(temporaryName);
            if (adminRestoreSheetManifest_(stage).fingerprint !== entry.fingerprint) {
                throw new Error("La hoja «" + entry.name + "» no superó la verificación de staging.");
            }
        });
        SpreadsheetApp.flush();
        const swapResult = adminRestoreSwapDatabaseSheets_(targetSS, originalSheets, stageEntries, runId);
        logMessage("Restauración DB", "Restauración verificada mediante intercambio de hojas completas. Las hojas adicionales no incluidas en el respaldo se conservaron.");
        if (swapResult.preservedExtraSheets.length) {
            logMessage("Restauración DB", "Hojas adicionales conservadas: " + swapResult.preservedExtraSheets.join(", "), 0, 0, true);
        }
        if (swapResult.cleanupErrors.length) {
            logMessage("Restauración DB", "Limpieza de snapshots pendiente: " + swapResult.cleanupErrors.join(" | "), 0, 0, true);
        }
        return {
            status: "success",
            message: "La base de datos se restauró y verificó. El estado anterior quedó conservado en un respaldo recuperable.",
            restoredSheetCount: stageEntries.length,
            preservedExtraSheets: swapResult.preservedExtraSheets,
            rollbackBackupId: rollbackBackup.id,
            rollbackBackupUrl: rollbackBackup.url,
            cleanupPending: swapResult.cleanupErrors.length > 0,
            cleanupErrors: swapResult.cleanupErrors
        };
    } catch (error) {
        const message = String(error.message || error);
        if (message.indexOf("reversión de nombres no pudo verificarse") >= 0) {
            throw new Error("La restauración DB falló y la reversión no pudo verificarse. No elimines hojas __GP_RESTORE_* ni el respaldo recuperable " +
                rollbackBackup.id + ". Motivo: " + message);
        }
        const cleanupErrors = adminRestoreDeleteTemporarySheets_(targetSS,
            stageEntries.map(entry => entry.stage).filter(Boolean));
        throw new Error("La restauración DB no se aplicó o fue revertida; conserva el respaldo recuperable " + rollbackBackup.id +
            ". " + (cleanupErrors.length ? "Limpieza temporal pendiente: " + cleanupErrors.join(" | ") + ". " : "") +
            "Motivo: " + message);
    }
}

function handleRestoreDrive(payload, logMessage) {
    const backupId = extractBackupFolderId(payload && payload.backupId);
    if (!backupId) throw new Error("ID o enlace de carpeta de respaldo de Drive no válido o no proporcionado.");
    if (backupId === DRIVE_FOLDER_ID) throw new Error("La carpeta productiva no puede utilizarse como origen de su propia restauración.");
    const backupFolder = DriveApp.getFolderById(backupId);
    if (backupFolder.getId() !== backupId || backupFolder.isTrashed() ||
        !String(backupFolder.getName() || "").startsWith("GPSpedia_Drive_BACKUP_") ||
        !isDirectChildOfDriveRoot(backupFolder)) {
        throw new Error("La carpeta indicada no es un respaldo de Drive válido dentro de la ubicación autorizada.");
    }
    const targetFolder = getCortesRootFolder();
    if (backupFolder.getId() === targetFolder.getId()) throw new Error("La carpeta de respaldo debe ser distinta de la carpeta productiva.");
    const loadedBackupState = adminRestoreReadDriveBackupState_(backupFolder);
    const storedManifest = loadedBackupState.state;
    if (storedManifest.status !== "complete") {
        throw new Error("El contenedor Drive no está marcado como completo; no se inició la restauración.");
    }
    const backupManifest = adminRestoreDriveManifest_(backupFolder);
    adminRestoreVerifyDriveBackupState_(storedManifest, backupFolder, backupManifest);

    const runId = adminRestoreRunId_(), rootFolder = DriveApp.getRootFolder();
    const originalManifest = adminRestoreDriveManifest_(targetFolder);
    const stagingFolder = rootFolder.createFolder("GPSpedia_Drive_RESTORE_STAGING_" + runId);
    let rollbackFolder = null, originalMovedCompletely = false;
    try {
        logMessage("Restauración Drive", "Copiando el respaldo a una carpeta temporal y verificando todos sus recursos...");
        adminRestoreCopyFolderRecursively_(backupFolder, stagingFolder, storedManifest);
        if (!adminRestoreManifestsEqual_(backupManifest, adminRestoreDriveManifest_(stagingFolder))) {
            throw new Error("El staging de Drive no coincide con el respaldo; la carpeta productiva permanece intacta.");
        }
        rollbackFolder = rootFolder.createFolder("GPSpedia_Drive_RESTORE_ROLLBACK_STAGING_" + runId);
        logMessage("Restauración Drive", "Moviendo el contenido actual a recuperación sin eliminar archivos ni cambiar sus identificadores...");
        adminRestoreMoveFolderContents_(targetFolder, rollbackFolder);
        if (!adminRestoreManifestsEqual_(originalManifest, adminRestoreDriveManifest_(rollbackFolder))) {
            throw new Error("El contenido original no pudo trasladarse íntegramente al área de recuperación.");
        }
        rollbackFolder.setName("GPSpedia_Drive_BACKUP_RESTORE_ROLLBACK_" + runId);
        const verifiedRollbackManifest = adminRestoreDriveManifest_(rollbackFolder);
        adminRestoreCreateCompletedDriveManifest_(rollbackFolder, verifiedRollbackManifest, runId, targetFolder.getId());
        originalMovedCompletely = true;

        logMessage("Restauración Drive", "Intercambiando el contenido validado con la carpeta productiva...");
        adminRestoreMoveFolderContents_(stagingFolder, targetFolder);
        const restoredManifest = adminRestoreDriveManifest_(targetFolder);
        if (!adminRestoreManifestsEqual_(backupManifest, restoredManifest)) {
            throw new Error("La verificación posterior al intercambio detectó diferencias en Drive.");
        }
        let cleanupPending = false;
        try { stagingFolder.setTrashed(true); }
        catch (cleanupError) {
            cleanupPending = true;
            logMessage("Restauración Drive", "No se pudo retirar la carpeta temporal vacía: " + cleanupError.message, 0, 0, true);
        }
        logMessage("Restauración Drive", "Restauración verificada. El contenido anterior se conserva como respaldo recuperable.");
        return {
            status: "success",
            message: "Los recursos de Drive se restauraron y verificaron; el estado anterior quedó conservado como respaldo recuperable.",
            backupId,
            rollbackBackupId: rollbackFolder.getId(),
            rollbackBackupUrl: rollbackFolder.getUrl(),
            folderCount: restoredManifest.folderCount,
            fileCount: restoredManifest.fileCount,
            totalBytes: restoredManifest.totalBytes,
            cleanupPending
        };
    } catch (error) {
        const rollbackErrors = [];
        if (originalMovedCompletely && rollbackFolder) {
            try { rollbackFolder.setName("GPSpedia_Drive_RESTORE_RECOVERY_" + runId); }
            catch (renameError) { rollbackErrors.push("rename recovery: " + String(renameError.message || renameError)); }
            try { adminRestoreMoveFolderContents_(targetFolder, stagingFolder); }
            catch (moveNewError) { rollbackErrors.push("retirar contenido nuevo: " + String(moveNewError.message || moveNewError)); }
        }
        if (rollbackFolder) {
            try { adminRestoreMoveFolderContents_(rollbackFolder, targetFolder); }
            catch (restoreOldError) { rollbackErrors.push("restaurar contenido anterior: " + String(restoreOldError.message || restoreOldError)); }
        }
        try {
            if (!adminRestoreManifestsEqual_(originalManifest, adminRestoreDriveManifest_(targetFolder))) {
                rollbackErrors.push("el inventario final no coincide con el estado anterior");
            }
        } catch (verifyError) { rollbackErrors.push("verificación: " + String(verifyError.message || verifyError)); }

        if (rollbackErrors.length) {
            throw new Error("La restauración Drive falló y la reversión automática no pudo verificarse. Conserva las carpetas de recuperación; no las elimines. stagingId=" +
                stagingFolder.getId() + "; rollbackId=" + (rollbackFolder ? rollbackFolder.getId() : "no creado") +
                ". Detalles: " + rollbackErrors.join(" | ") + ". Motivo original: " + String(error.message || error));
        }
        try { stagingFolder.setTrashed(true); } catch (cleanupError) {}
        if (rollbackFolder) { try { rollbackFolder.setTrashed(true); } catch (cleanupError) {} }
        throw new Error("La restauración Drive no se aplicó; el contenido original fue restaurado y verificado. Motivo: " + String(error.message || error));
    }
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
function auditIdentifierColumn_(sheet, spec) {
    if (!sheet) return { sheet: spec.sheet, exists: false, formatKnown: spec.formatKnown !== false };
    const lastRow = sheet.getLastRow(), lastColumn = Math.max(sheet.getLastColumn(), spec.column);
    const result = {
        sheet: spec.sheet, exists: true, formatKnown: spec.formatKnown !== false,
        expectedFormat: spec.expectedFormat || "Identificador único no vacío",
        recordsWithId: 0, missingIdCount: 0, malformedIdCount: 0,
        duplicateIdCount: 0, formulaCount: 0, unresolvedFormulaCount: 0, sampleIds: [],
        missingIdRows: [], malformedIds: [], duplicateIds: [], formulaRows: []
    };
    if (lastRow < 2) return result;
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const formulas = sheet.getRange(2, spec.column, lastRow - 1, 1).getFormulas();
    const seen = new Map();
    const addDetail = (list, item) => { if (list.length < 100) list.push(item); };
    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const raw = row[spec.column - 1];
        const id = String(raw === null || raw === undefined ? "" : raw).trim();
        const formula = String(formulas[index] && formulas[index][0] || "");
        const hasRowData = row.some(value => value !== "" && value !== null && value !== undefined);
        if (!hasRowData && !formula) return;
        if (formula) {
            result.formulaCount++;
            addDetail(result.formulaRows, rowNumber);
        }
        if (!id) {
            if (formula) result.unresolvedFormulaCount++;
            else {
                result.missingIdCount++;
                addDetail(result.missingIdRows, rowNumber);
            }
            return;
        }
        result.recordsWithId++;
        if (spec.includeSamples && result.sampleIds.length < 20) result.sampleIds.push({ row: rowNumber, id });
        let key = id.toLowerCase(), valid = true;
        if (spec.kind === "user") valid = /^USR-\d{4,}$/i.test(id);
        else if (spec.kind === "vehicle" || spec.kind === "logo") {
            const numeric = Number(id);
            valid = Number.isSafeInteger(numeric) && numeric > 0;
            if (valid) key = String(numeric);
        } else if (spec.kind === "tutorial") valid = /^tut-[a-z0-9_-]{1,80}$/i.test(id);
        else if (spec.kind === "problem") {
            const match = /^isue-(\d+)$/i.exec(id), numeric = match ? Number(match[1]) : NaN;
            valid = Number.isSafeInteger(numeric) && numeric > 0;
            if (valid) key = String(numeric);
        }
        if (!valid) {
            result.malformedIdCount++;
            addDetail(result.malformedIds, { row: rowNumber, id });
        }
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(rowNumber);
    });
    for (const [id, rowNumbers] of seen.entries()) {
        if (rowNumbers.length > 1) {
            result.duplicateIdCount++;
            addDetail(result.duplicateIds, { id, rows: rowNumbers.slice(0, 100) });
        }
    }
    result.detailsTruncated = result.missingIdCount > result.missingIdRows.length ||
        result.malformedIdCount > result.malformedIds.length ||
        result.duplicateIdCount > result.duplicateIds.length ||
        result.formulaCount > result.formulaRows.length;
    return result;
}

function auditTutorialApprovalReferences_(tutorialSheet, feedbackSheet) {
    if (!tutorialSheet) return { status: "incomplete", reason: "missing_tutorial_sheet", approvalRecords: 0 };
    const tutorialLastRow = tutorialSheet.getLastRow();
    const tutorialRows = tutorialLastRow > 1
        ? tutorialSheet.getRange(2, 1, tutorialLastRow - 1, 1).getValues()
        : [];
    const idCounts = new Map();
    tutorialRows.forEach(row => {
        const id = String(row[0] === null || row[0] === undefined ? "" : row[0]).trim().toLowerCase();
        if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
    const result = {
        status: "success", readOnly: true, tutorialRecords: tutorialRows.length,
        approvalRecords: 0, matchedReferences: 0, missingReferenceIds: 0,
        orphanReferences: 0, ambiguousReferences: 0, rowReferenceMismatches: 0,
        metadataReferenceMismatches: 0, malformedApprovalRecords: 0,
        details: [], detailsTruncated: false
    };
    if (!feedbackSheet) {
        result.status = "incomplete";
        result.reason = "missing_feedbacks_sheet";
        return result;
    }
    const feedbackLastRow = feedbackSheet.getLastRow();
    const rows = feedbackLastRow > 1
        ? feedbackSheet.getRange(2, 1, feedbackLastRow - 1, Math.max(4, feedbackSheet.getLastColumn())).getValues()
        : [];
    const addDetail = detail => {
        if (result.details.length < 100) result.details.push(detail);
        else result.detailsTruncated = true;
    };
    rows.forEach((row, index) => {
        const raw = String(row[3] === null || row[3] === undefined ? "" : row[3]);
        if (!raw) return;
        let record;
        try { record = JSON.parse(raw); }
        catch (error) {
            if (/video_approval/i.test(raw)) {
                result.malformedApprovalRecords++;
                addDetail({ feedbackRow: index + 2, issue: "malformed_video_approval_json" });
            }
            return;
        }
        if (!record || record.subType !== "video_approval" || String(record.contentType || "") !== "tutorial") return;
        result.approvalRecords++;
        const referenceId = String(record.referenceId || "").trim();
        const rowReferenceId = String(row[2] === null || row[2] === undefined ? "" : row[2]).trim();
        const metadataReferenceId = String(record.metadata && record.metadata.tutorialId || "").trim();
        if (!referenceId) {
            result.missingReferenceIds++;
            addDetail({ feedbackRow: index + 2, issue: "missing_reference_id" });
            return;
        }
        if (rowReferenceId !== referenceId) {
            result.rowReferenceMismatches++;
            addDetail({ feedbackRow: index + 2, issue: "row_reference_mismatch", rowReferenceId, referenceId });
        }
        if (metadataReferenceId && metadataReferenceId.toLowerCase() !== referenceId.toLowerCase()) {
            result.metadataReferenceMismatches++;
            addDetail({ feedbackRow: index + 2, issue: "metadata_reference_mismatch", metadataReferenceId, referenceId });
        }
        const count = idCounts.get(referenceId.toLowerCase()) || 0;
        if (count === 1) result.matchedReferences++;
        else if (count === 0) {
            result.orphanReferences++;
            addDetail({ feedbackRow: index + 2, issue: "orphan_reference", referenceId });
        } else {
            result.ambiguousReferences++;
            addDetail({ feedbackRow: index + 2, issue: "ambiguous_reference", referenceId, matches: count });
        }
    });
    return result;
}

function auditUserIdReferences_(ss) {
    const usersSheet = ss && ss.getSheetByName("Users");
    if (!usersSheet) return { status: "incomplete", reason: "missing_users_sheet" };
    const userLastRow = usersSheet.getLastRow();
    const userRows = userLastRow > 1 ? usersSheet.getRange(2, 1, userLastRow - 1, 1).getValues() : [];
    const userCounts = new Map();
    userRows.forEach(row => {
        const id = String(row[0] === null || row[0] === undefined ? "" : row[0]).trim().toUpperCase();
        if (id) userCounts.set(id, (userCounts.get(id) || 0) + 1);
    });
    const result = {
        status: "success", readOnly: true, userRecords: userRows.length,
        duplicateUserIds: Array.from(userCounts.values()).filter(count => count > 1).length,
        referencesScanned: 0, matchedReferences: 0, orphanReferences: 0,
        ambiguousReferences: 0, sentinelReferencesSkipped: 0,
        malformedMetadataRecords: 0, sourcesScanned: [], details: [], detailsTruncated: false
    };
    const addDetail = detail => {
        if (result.details.length < 100) result.details.push(detail);
        else result.detailsTruncated = true;
    };
    const checkReference = (value, sheetName, rowNumber, fieldName) => {
        const id = String(value === null || value === undefined ? "" : value).trim();
        if (!id) return;
        if (id === "0" || /^N\/A$/i.test(id) || /^anon:/i.test(id)) {
            result.sentinelReferencesSkipped++;
            return;
        }
        result.referencesScanned++;
        const count = userCounts.get(id.toUpperCase()) || 0;
        if (count === 1) result.matchedReferences++;
        else if (count === 0) {
            result.orphanReferences++;
            addDetail({ sheet: sheetName, row: rowNumber, field: fieldName, issue: "orphan_user_reference", userId: id });
        } else {
            result.ambiguousReferences++;
            addDetail({ sheet: sheetName, row: rowNumber, field: fieldName, issue: "ambiguous_user_reference", userId: id, matches: count });
        }
    };
    const scanColumn = (sheetName, column, fieldName, transform) => {
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet || sheet.getLastRow() < 2) return;
        const values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
        result.sourcesScanned.push(sheetName + "." + fieldName);
        values.forEach((row, index) => checkReference(transform ? transform(row[0]) : row[0], sheetName, index + 2, fieldName));
    };
    scanColumn("ActiveSessions", 1, "ID_Usuario");
    scanColumn("ActividadUsuario", 3, "idUsuario");
    scanColumn("Contactanos", 2, "User_ID");
    scanColumn("Contactanos", 6, "ID_usuario_responde");
    scanColumn("InboxAuditLog", 3, "actorId");
    scanColumn("FeedbackLikes", 1, "actorKey", value => {
        const key = String(value || "").trim();
        return key.startsWith("user:") ? key.slice(5) : "";
    });
    const feedbackSheet = ss.getSheetByName("Feedbacks");
    if (feedbackSheet && feedbackSheet.getLastRow() > 1) {
        result.sourcesScanned.push("Feedbacks.metadata");
        const rows = feedbackSheet.getRange(2, 4, feedbackSheet.getLastRow() - 1, 1).getValues();
        const scanObject = (value, rowNumber, path) => {
            if (!value || typeof value !== "object") return;
            if (Array.isArray(value)) {
                value.forEach((item, index) => scanObject(item, rowNumber, path + "[" + index + "]"));
                return;
            }
            Object.keys(value).forEach(key => {
                const nextPath = path ? path + "." + key : key;
                if (key === "userId" || key === "createdByUserId") {
                    checkReference(value[key], "Feedbacks", rowNumber, nextPath);
                } else if (value[key] && typeof value[key] === "object") {
                    scanObject(value[key], rowNumber, nextPath);
                }
            });
        };
        rows.forEach((row, index) => {
            const raw = String(row[0] === null || row[0] === undefined ? "" : row[0]).trim();
            if (!raw) return;
            try { scanObject(JSON.parse(raw), index + 2, ""); }
            catch (error) {
                if (/"(?:userId|createdByUserId)"\s*:/.test(raw)) result.malformedMetadataRecords++;
            }
        });
    }
    return result;
}

function handleAuditIdentifiers() {
    const ss = getSpreadsheet();
    const specs = [
        { sheet: "Users", column: 1, kind: "user", expectedFormat: "USR-0001 o superior" },
        { sheet: "Cortes", column: 1, kind: "vehicle", expectedFormat: "Entero positivo" },
        { sheet: "Tutorial", column: 1, kind: "tutorial", expectedFormat: "tut-<operationId>; los IDs vacíos históricos se reportan aparte" },
        { sheet: "Relay", column: 1, kind: "relay", formatKnown: false, includeSamples: true, expectedFormat: "Formato pendiente de confirmar con el esquema/datos actuales" },
        { sheet: "pys", column: 1, kind: "problem", expectedFormat: "isue-<sufijo numérico positivo>" },
        { sheet: "LogosMarca", column: 1, kind: "logo", expectedFormat: "Entero positivo; se inspeccionan fórmulas históricas" }
    ];
    const sheets = specs.map(spec => auditIdentifierColumn_(ss.getSheetByName(spec.sheet), spec));
    const tutorialReferences = auditTutorialApprovalReferences_(
        ss.getSheetByName("Tutorial"), ss.getSheetByName("Feedbacks")
    );
    const userReferences = auditUserIdReferences_(ss);
    return {
        status: "success", readOnly: true, generatedAt: new Date().toISOString(),
        tutorialReferences, userReferences,
        summary: {
            sheetsFound: sheets.filter(item => item.exists).length,
            duplicateIdCount: sheets.reduce((sum, item) => sum + item.duplicateIdCount, 0),
            malformedIdCount: sheets.reduce((sum, item) => sum + item.malformedIdCount, 0),
            missingIdCount: sheets.reduce((sum, item) => sum + item.missingIdCount, 0),
            formulaCount: sheets.reduce((sum, item) => sum + item.formulaCount, 0)
        },
        sheets
    };
}

function getNextLogoIdLocked_(sheet) {
    if (!sheet) throw new Error("No se encontró la hoja LogosMarca.");
    if (String(sheet.getRange(1, 1).getValue() || "").trim().toLowerCase() !== "id") {
        throw new Error("El encabezado de la primera columna de LogosMarca no es ID.");
    }
    let maxId = 0;
    const seen = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const lastColumn = Math.max(sheet.getLastColumn(), 4);
        const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
        const formulas = sheet.getRange(2, 1, lastRow - 1, 1).getFormulas();
        rows.forEach((row, index) => {
            const rawId = row[0];
            const idText = String(rawId === null || rawId === undefined ? "" : rawId).trim();
            const hasData = row.slice(1).some(value => value !== "" && value !== null && value !== undefined);
            const hasFormula = Boolean(formulas[index] && formulas[index][0]);
            if (!hasData && !idText) return;
            if (!idText) throw new Error("La fila " + (index + 2) + " de LogosMarca contiene datos pero no tiene ID.");
            const id = Number(idText);
            if (!Number.isSafeInteger(id) || id < 1) throw new Error("El ID de LogosMarca en la fila " + (index + 2) + " no es un entero positivo.");
            if (seen.has(id)) throw new Error("Se detectó un ID duplicado en LogosMarca; no se asignó otro identificador.");
            seen.add(id);
            maxId = Math.max(maxId, id);
            // Las fórmulas históricas se leen como valores y no se copian al registro nuevo.
            void hasFormula;
        });
    }
    const properties = PropertiesService.getScriptProperties();
    const storedValue = properties.getProperty(LOGOS_MARCA_ID_COUNTER_PROPERTY);
    const storedId = storedValue === null ? 0 : Number(storedValue);
    if (!Number.isSafeInteger(storedId) || storedId < 0) throw new Error("El contador central de IDs de LogosMarca contiene un valor inválido.");
    const nextId = Math.max(maxId, storedId) + 1;
    if (!Number.isSafeInteger(nextId) || nextId < 1) throw new Error("Se alcanzó el límite seguro de IDs de LogosMarca.");
    properties.setProperty(LOGOS_MARCA_ID_COUNTER_PROPERTY, String(nextId));
    return nextId;
}

/**
 * Registro de logotipos con ID numérico asignado por el backend, sin fórmulas de fila.
 */
function handleAddLogo(payload, logMessage) {
    const { nombreMarca, fileData, filename, mimeType } = payload;
    if (!nombreMarca || !fileData || !filename || !mimeType) throw new Error("Datos de logotipo incompletos.");
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.LOGOS_MARCA);
    if (!sheet) throw new Error("No se encontró la hoja LogosMarca.");

    logMessage("Registro Logo", `Iniciando registro de logotipo para la marca: ${nombreMarca}`);
    const rootFolder = getCortesRootFolder();
    const logosFolder = getOrCreateSubFolder(rootFolder, "Logos");
    logMessage("Registro Logo", `Subiendo logotipo '${filename}' de tipo '${mimeType}'...`);
    const decodedData = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);
    const file = logosFolder.createFile(blob);
    const logoUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

    const markRecovery = reason => {
        try { if (file && typeof file.setDescription === "function") file.setDescription("GPSpedia LogosMarca — RECOVERY_REQUIRED\nimageUrl=" + logoUrl + "\nreason=" + String(reason || "No se pudo confirmar la vinculación.").slice(0, 300)); }
        catch (metadataError) { console.error("No se pudo marcar un logotipo para recuperación:", metadataError); }
    };
    const trashUnlinkedFile = () => {
        if (!file || typeof file.setTrashed !== "function") throw new Error("Drive no permite retirar el archivo sin vincular.");
        file.setTrashed(true);
        if (typeof file.isTrashed === "function" && file.isTrashed() !== true) throw new Error("Drive no confirmó que el archivo sin vincular quedara en papelera.");
    };

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) {
        try { trashUnlinkedFile(); }
        catch (cleanupError) { markRecovery(cleanupError.message); }
        throw new Error("No se pudo bloquear la asignación de IDs de LogosMarca. Intente nuevamente.");
    }
    let newRow = null, newId = null, lastColumn = 4, rowPrepared = false;
    try {
        const lastRow = sheet.getLastRow();
        newRow = lastRow + 1;
        lastColumn = Math.max(sheet.getLastColumn(), 4);
        newId = getNextLogoIdLocked_(sheet);
        rowPrepared = true;
        if (lastRow > 1) {
            sheet.getRange(lastRow, 1, 1, lastColumn).copyTo(sheet.getRange(newRow, 1, 1, lastColumn));
            sheet.getRange(newRow, 2, 1, lastColumn - 1).clearContent();
        }
        sheet.getRange(newRow, 1).setValue(newId);
        sheet.getRange(newRow, 2).setValue(nombreMarca);
        sheet.getRange(newRow, 3).setValue(logoUrl);
        sheet.getRange(newRow, 4).setValue(nombreMarca);
        SpreadsheetApp.flush();
        const generatedId = sheet.getRange(newRow, 1).getValue();
        const generatedFormula = sheet.getRange(newRow, 1).getFormula();
        if (Number(generatedId) !== newId || generatedFormula) {
            throw new Error("No se pudo confirmar el ID numérico permanente del logotipo.");
        }
        try { if (typeof file.setDescription === "function") file.setDescription("GPSpedia LogosMarca — LINKED\nlogoId=" + newId); }
        catch (metadataError) { console.warn("No se pudo actualizar metadata del logotipo vinculado:", metadataError); }
        logMessage("Registro Logo", `Registro completado. ID de logotipo asignado: ${generatedId}`);
        return {
            status: "success", logoId: generatedId, logoUrl,
            message: "Logotipo registrado exitosamente en la base de datos conservando su formato y transparencia."
        };
    } catch (error) {
        let matches;
        try {
            const last = sheet.getLastRow();
            const width = Math.max(sheet.getLastColumn(), 4);
            const rows = last > 1 ? sheet.getRange(2, 1, last - 1, width).getValues() : [];
            matches = rows.map((row, index) => ({ row, rowIndex: index + 2 }))
                .filter(item => String(item.row[2] || "").trim() === logoUrl);
        } catch (readError) {
            markRecovery("No se pudo verificar la fila después del error: " + String(readError && readError.message || readError));
            throw new Error(String(error && error.message || error) + " El estado del vínculo no pudo verificarse; el archivo se conservó para recuperación.");
        }
        if (matches.length === 1) {
            const row = matches[0].row;
            const recoveredId = Number(row[0]);
            if (Number.isSafeInteger(recoveredId) && recoveredId > 0 &&
                String(row[1] || "").trim() === String(nombreMarca).trim() &&
                String(row[3] || "").trim() === String(nombreMarca).trim()) {
                try { if (typeof file.setDescription === "function") file.setDescription("GPSpedia LogosMarca — LINKED\nlogoId=" + recoveredId); } catch (metadataError) {}
                return {
                    status: "success", logoId: recoveredId, logoUrl, recovered: true,
                    message: "Logotipo registrado y verificado después de una respuesta parcial."
                };
            }
            markRecovery("La fila enlazada no coincide con los metadatos esperados.");
            throw new Error("El logotipo quedó asociado a una fila que requiere revisión; el archivo se conservó.");
        }
        if (matches.length > 1) {
            markRecovery("La URL aparece en varias filas; se requiere reconciliación.");
            throw new Error("La URL del logotipo aparece en varias filas; el archivo se conservó para reconciliación.");
        }
        let rowCleanupError = null;
        if (rowPrepared && newRow && newRow <= sheet.getLastRow()) {
            try {
                sheet.getRange(newRow, 1, 1, lastColumn).clearContent();
                SpreadsheetApp.flush();
                const cleared = sheet.getRange(newRow, 1, 1, lastColumn).getValues()[0];
                if (cleared.some(value => value !== "" && value !== null && value !== undefined)) {
                    throw new Error("La fila parcial de LogosMarca no quedó vacía tras la compensación.");
                }
            } catch (cleanupError) { rowCleanupError = cleanupError; }
        }
        try { trashUnlinkedFile(); }
        catch (cleanupError) {
            markRecovery(cleanupError.message + (rowCleanupError ? "; rowCleanup=" + rowCleanupError.message : ""));
            throw new Error(String(error && error.message || error) + " El archivo no vinculado quedó marcado para recuperación manual.");
        }
        if (rowCleanupError) {
            markRecovery("La imagen se retiró, pero la fila parcial requiere limpieza: " + rowCleanupError.message);
            throw new Error(String(error && error.message || error) + " La fila parcial requiere revisión manual.");
        }
        throw error;
    } finally {
        lock.releaseLock();
    }
}

function prepareAdminVinCollectionEdit_(sheet, rowValues, vehicleId, rawValue) {
    if (typeof rawValue !== "string" && !Array.isArray(rawValue)) throw new Error("La colección VIN debe enviarse como texto o arreglo.");
    const collection = parseVinCollectionForAdmin(rawValue);
    const existing = parseVinCollectionForAdmin(rowValues[getVinColumnIndex(sheet) - 1]);
    const versionParts = String(rowValues[COLS_CORTES.versionesAplicables - 1] || "").split(/[,/\\;]+/).map(value => value.trim()).filter(Boolean);
    if (versionParts.length > 3) throw new Error("El vehículo contiene más de tres versiones; revisa su configuración antes de editar la colección VIN.");
    const maxAllowed = Math.max(1, versionParts.length);
    if (collection.slice(maxAllowed).some(Boolean)) throw new Error("La colección VIN contiene identificadores fuera de las posiciones permitidas por las versiones registradas.");
    for (let index = 0; index < 3; index++) {
        const previous = existing[index] || "", next = collection[index] || "";
        if (previous && next !== previous) throw new Error("No se permite reemplazar, eliminar ni mover un VIN ya asociado a una versión. Solo pueden completarse posiciones vacías.");
        if (!previous && next) {
            const duplicate = findVinDuplicateForAdmin(sheet, next, vehicleId);
            if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
        }
    }
    return serializeVinCollection(collection);
}
function handleUpdateVehicleVinCollection_(vehicleId, rawValue, logMessage, expectedCurrentValue, enforceExpectedCurrentValue) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (error) { throw new Error("No se pudo obtener el bloqueo para editar la colección VIN. Intenta nuevamente."); }
    try {
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        const vinColumnIndex = getVinColumnIndex(sheet);
        if (!vinColumnIndex) throw new Error("La hoja «Cortes» no contiene un encabezado VIN único.");
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) throw new Error("No se encontraron vehículos registrados.");
        const actualRow = findUniqueAdminVehicleRow_(sheet, String(vehicleId == null ? "" : vehicleId).trim());
        const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
        const serialized = prepareAdminVinCollectionEdit_(sheet, rowValues, vehicleId, rawValue);
        const previousValue = sheet.getRange(actualRow, vinColumnIndex).getValue();
        if (enforceExpectedCurrentValue === true) assertAdminModalExpectedValue_(previousValue, expectedCurrentValue, "vin");
        let attempted = false;
        try {
            attempted = true;
            sheet.getRange(actualRow, vinColumnIndex).setValue(serialized);
            SpreadsheetApp.flush();
            const persisted = parseVinCollectionForAdmin(sheet.getRange(actualRow, vinColumnIndex).getValue());
            if (JSON.stringify(persisted) !== JSON.stringify(parseVinCollectionForAdmin(serialized))) throw new Error("La colección VIN no coincide con el valor solicitado después de guardar.");
        } catch (writeError) {
            if (attempted) {
                try {
                    sheet.getRange(actualRow, vinColumnIndex).setValue(previousValue);
                    SpreadsheetApp.flush();
                    if (String(sheet.getRange(actualRow, vinColumnIndex).getValue() || "") !== String(previousValue || "")) throw new Error("La reversión no pudo verificarse.");
                } catch (rollbackError) { throw new Error("Falló la escritura de VIN y también la reversión: " + writeError.message + "; " + rollbackError.message); }
            }
            throw writeError;
        }
        logMessage("Edición In-Modal", "Colección VIN actualizada y verificada para el vehículo ID: " + vehicleId + ".");
        return { status: "success", normalizedValue: serialized, message: "La colección VIN fue guardada y verificada correctamente." };
    } finally { lock.releaseLock(); }
}

function getAdminModalDomainValues_(sheet, fieldName) {
    const lastRow = sheet.getLastRow();
    const readColumn = column => lastRow > 1
        ? sheet.getRange(2, column, lastRow - 1, 1).getValues().flat()
            .map(value => String(value == null ? "" : value).trim()).filter(Boolean)
        : [];
    if (fieldName === "categoria") return readColumn(COLS_CORTES.categoria);
    if (fieldName === "tipoEncendido") return readColumn(COLS_CORTES.tipoEncendido);
    if (/^tipoCorte[1-3]$/.test(fieldName)) {
        return [COLS_CORTES.tipoCorte1, COLS_CORTES.tipoCorte2, COLS_CORTES.tipoCorte3]
            .flatMap(readColumn);
    }
    if (/^configRelay[1-3]$/.test(fieldName)) {
        const relaySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.RELAY);
        if (!relaySheet || relaySheet.getLastRow() < 2 || relaySheet.getLastColumn() < 2) {
            throw new Error("No se pudo comprobar el dominio de configuraciones Relay; no se realizó ninguna escritura.");
        }
        return relaySheet.getRange(2, 2, relaySheet.getLastRow() - 1, 1).getValues().flat()
            .map(value => String(value == null ? "" : value).trim()).filter(Boolean);
    }
    return [];
}

function validateAdminModalFieldValue_(sheet, fieldName, rawValue, rowValues) {
    if (fieldName === "vin") throw new Error("La colección VIN debe validarse mediante su flujo especializado.");
    const value = rawValue === undefined || rawValue === null ? "" : rawValue;
    const richFields = new Set(["apertura", "cableAlimen", "cableAlimen2", "cableAlimen3", "notaImportante"]);
    const imageFields = new Set(["imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"]);
    const maxLengths = {
        categoria: 80, modelo: 120, versionesAplicables: 300, tipoEncendido: 100,
        notaImportante: 5000, apertura: 5000, cableAlimen: 5000, cableAlimen2: 5000, cableAlimen3: 5000,
        ubicacionCorte1: 1000, ubicacionCorte2: 1000, ubicacionCorte3: 1000,
        colorCableCorte1: 200, colorCableCorte2: 200, colorCableCorte3: 200,
        tipoCorte1: 100, tipoCorte2: 100, tipoCorte3: 100,
        configRelay1: 200, configRelay2: 200, configRelay3: 200
    };
    if (fieldName === "anoDesde" || fieldName === "anoHasta") {
        const numeric = typeof value === "number" ? value : (typeof value === "string" && /^\d{4}$/.test(value.trim()) ? Number(value.trim()) : NaN);
        if (!Number.isInteger(numeric) || numeric < 1980 || numeric > 2027) {
            throw new Error("El año debe ser un número entero entre 1980 y 2027.");
        }
        const otherField = fieldName === "anoDesde" ? "anoHasta" : "anoDesde";
        const otherColumn = COLS_CORTES[otherField];
        const otherRaw = rowValues[otherColumn - 1];
        if (otherRaw !== "" && otherRaw !== null && otherRaw !== undefined && Number.isFinite(Number(otherRaw))) {
            if (fieldName === "anoDesde" && numeric > Number(otherRaw)) throw new Error("El año inicial no puede ser posterior al año final.");
            if (fieldName === "anoHasta" && numeric < Number(otherRaw)) throw new Error("El año final no puede ser anterior al año inicial.");
        }
        return numeric;
    }
    if (typeof value !== "string") throw new Error("El campo '" + fieldName + "' debe enviarse como texto.");
    const clean = value.trim();
    const maxLength = maxLengths[fieldName];
    if (maxLength && clean.length > maxLength) throw new Error("El campo '" + fieldName + "' supera el máximo de " + maxLength + " caracteres.");
    if ((fieldName === "categoria" || fieldName === "modelo") && !clean) throw new Error("El campo '" + fieldName + "' es obligatorio.");
    if (["categoria", "tipoEncendido"].includes(fieldName) || /^(tipoCorte|configRelay)[1-3]$/.test(fieldName)) {
        if (clean) {
            const domain = getAdminModalDomainValues_(sheet, fieldName);
            if (!domain.some(item => item.toLowerCase() === clean.toLowerCase())) {
                throw new Error("El valor de '" + fieldName + "' no pertenece a las opciones registradas.");
            }
        }
    }
    if (imageFields.has(fieldName)) {
        if (clean && extractDriveFileIds(clean).length !== 1) throw new Error("El campo '" + fieldName + "' debe contener una única referencia válida de Google Drive.");
        return clean;
    }
    if (richFields.has(fieldName)) return sanitizeSupplementaryRichText_(clean);
    return clean;
}

function findUniqueAdminVehicleRow_(sheet, vehicleId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No se encontraron vehículos registrados.");
    const ids = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues().flat();
    const matches = [];
    ids.forEach((id, index) => {
        if (String(id == null ? "" : id).trim() === vehicleId) matches.push(index + 2);
    });
    if (matches.length === 0) throw new Error("No se encontró el vehículo con ID '" + vehicleId + "' en la base de datos.");
    if (matches.length !== 1) throw new Error("El ID '" + vehicleId + "' está duplicado en Cortes; se detuvo la edición para evitar modificar una fila ambigua.");
    return matches[0];
}

/**
 * Actualizar de manera silenciosa un campo permitido del modal administrativo.
 * El ID y los campos calculados quedan fuera de la allowlist y nunca se escriben.
 */
function handleUpdateVehicleField(payload, logMessage) {
    const { vehicleId, fieldName, value, enforceExpectedCurrentValue, expectedCurrentValue } = payload || {};
    const cleanVehicleId = String(vehicleId == null ? "" : vehicleId).trim();
    if (!cleanVehicleId || !fieldName || typeof fieldName !== "string") throw new Error("Parámetros de edición de campo incompletos.");
    if (!isAdminModalEditField_(fieldName) || fieldName === "id" || fieldName === "timestamp" || fieldName === "contadorBusqueda") {
        throw new Error("El campo '" + fieldName + "' no forma parte de la edición permitida del modal de detalle.");
    }
    if (fieldName === "vin") return handleUpdateVehicleVinCollection_(cleanVehicleId, value, logMessage, expectedCurrentValue, enforceExpectedCurrentValue === true);
    if (!Object.prototype.hasOwnProperty.call(COLS_CORTES, fieldName) || COLS_CORTES[fieldName] <= COLS_CORTES.id) {
        throw new Error("El campo '" + fieldName + "' no corresponde a una columna editable del catálogo.");
    }

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (error) { throw new Error("No se pudo obtener el bloqueo para editar el vehículo. Intenta nuevamente."); }
    try {
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
        const actualRow = findUniqueAdminVehicleRow_(sheet, cleanVehicleId);
        const rowValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
        const colIndex = COLS_CORTES[fieldName];
        const valueToStore = validateAdminModalFieldValue_(sheet, fieldName, value, rowValues);
        const target = sheet.getRange(actualRow, colIndex);
        const previousValue = target.getValue();
        if (enforceExpectedCurrentValue === true) assertAdminModalExpectedValue_(previousValue, expectedCurrentValue, fieldName);
        try {
            target.setValue(valueToStore);
            SpreadsheetApp.flush();
            const persisted = target.getValue();
            if (String(persisted == null ? "" : persisted) !== String(valueToStore == null ? "" : valueToStore)) {
                throw new Error("El valor guardado no coincide con el valor validado.");
            }
        } catch (writeError) {
            try {
                target.setValue(previousValue);
                SpreadsheetApp.flush();
                if (String(target.getValue() == null ? "" : target.getValue()) !== String(previousValue == null ? "" : previousValue)) {
                    throw new Error("No se pudo verificar la restauración del valor anterior.");
                }
            } catch (rollbackError) {
                throw new Error("Falló la edición y también su reversión: " + writeError.message + "; " + rollbackError.message);
            }
            throw writeError;
        }

        logMessage("Edición In-Modal", "Actualizando campo '" + fieldName + "' para el vehículo ID: " + cleanVehicleId + "...");
        let folderSyncWarning = false;
        const folderMetadataFields = new Set(["categoria", "marca", "modelo", "versionesAplicables", "tipoEncendido", "anoDesde", "anoHasta"]);
        if (folderMetadataFields.has(fieldName)) {
            try {
                const updatedValues = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
                const syncResult = movePrimaryVehicleImageToCanonicalFolder(sheet, actualRow, mapRowToObject(updatedValues, COLS_CORTES), null, logMessage);
                folderSyncWarning = Boolean(syncResult && syncResult.warning);
                if (folderSyncWarning && syncResult.reason) logMessage("Edición In-Modal", "El metadato se guardó, pero la imagen principal no se movió: " + syncResult.reason, 0, 0, true);
            } catch (syncError) {
                folderSyncWarning = true;
                logMessage("Edición In-Modal", "El campo se guardó, pero no se pudo sincronizar la carpeta de imagenVehiculo: " + syncError.message, 0, 0, true, true);
            }
        }
        logMessage("Edición In-Modal", "Campo '" + fieldName + "' actualizado y verificado para el vehículo ID: " + cleanVehicleId + ".");
        return {
            status: "success",
            folderSyncWarning: folderSyncWarning,
            message: "El campo '" + fieldName + "' fue guardado y verificado en el registro de la fila " + actualRow + "."
        };
    } finally {
        lock.releaseLock();
    }
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
    return { rowIndex: rowIndex, values: sheet.getRange(rowIndex, 1, 1, Math.max(sheet.getLastColumn(), 11)).getValues()[0] };
}

function assertAdminModalExpectedValue_(actualValue, expectedValue, fieldName) {
    const actual = fieldName === "vin" ? JSON.stringify(parseVinCollectionForAdmin(actualValue)) : String(actualValue == null ? "" : actualValue);
    const expected = fieldName === "vin" ? JSON.stringify(parseVinCollectionForAdmin(expectedValue)) : String(expectedValue == null ? "" : expectedValue);
    if (actual !== expected) {
        throw new Error("El campo cambió desde la última lectura del catálogo; no se sobrescribió una modificación concurrente.");
    }
    return true;
}

function restoreAdminImageActiveCell_(activeCell, originalUrl) {
    if (!activeCell || typeof activeCell.setValue !== "function" || typeof activeCell.getValue !== "function") {
        throw new Error("No se pudo verificar la celda de imagen durante la compensación.");
    }
    const expected = String(originalUrl || "").trim();
    activeCell.setValue(expected);
    SpreadsheetApp.flush();
    const actual = String(activeCell.getValue() || "").trim();
    if (actual !== expected) throw new Error("La referencia anterior no se confirmó por lectura posterior.");
    return true;
}

function updateAdminImageReplacementHistoryStatus_(historySheet, rowIndex, status) {
    if (!historySheet || !rowIndex || !["cancelada", "requiere_revision"].includes(status)) {
        throw new Error("No se pudo identificar el registro histórico que debe compensarse.");
    }
    const target = historySheet.getRange(rowIndex, 11);
    target.setValue(status);
    SpreadsheetApp.flush();
    const actual = String(target.getValue() || "").trim();
    if (actual !== status) throw new Error("El estado del historial no se confirmó por lectura posterior.");
    return true;
}

function markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl, reason, logMessage, file, contentHash) {
    let detail = String(reason || "La operación requiere revisión manual.");
    if (operationSheet && operationRecord) {
        try {
            operationRecord.values[9] = "requires_review";
            operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
            saveAdminImageUploadOperation(operationSheet, operationRecord);
        } catch (ledgerError) {
            detail += " No se pudo confirmar requires_review en el ledger: " + ledgerError.message + ".";
        }
    }
    if (originalUrl) {
        try {
            const historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
            const existingHistory = historySheet && findReplacedImageRecordById(historySheet, "REP-" + operationId);
            if (existingHistory) updateAdminImageReplacementHistoryStatus_(historySheet, existingHistory.rowIndex, "requiere_revision");
        } catch (historyError) {
            detail += " No se pudo confirmar requires_review en el historial: " + historyError.message + ".";
        }
    }
    if (file && contentHash) {
        try { updateAdminImageUploadFileState_(file, operationId, contentHash, "requires_review", false); }
        catch (fileError) { detail += " No se pudo marcar el archivo Drive para revisión: " + fileError.message + "."; }
    }
    if (typeof logMessage === "function") logMessage("Edición In-Modal", detail, 0, 0, true, true);
    return { status: "error", operationStatus: "requires_review", imageUrl: "", currentImageUrl: "",
        message: detail };
}

function updateAdminImageUploadFileState_(file, operationId, contentHash, state, trashAfter) {
    if (!file || !["linked", "cancelled", "requires_review"].includes(state) || (trashAfter === true && state !== "cancelled")) {
        throw new Error("No se pudo identificar el archivo Drive de la compensación.");
    }
    const expectedDescription = buildAdminImageUploadDescription(operationId, contentHash, state);
    file.setDescription(expectedDescription);
    if (String(file.getDescription() || "") !== expectedDescription) {
        throw new Error("El estado del archivo Drive no se confirmó por lectura posterior.");
    }
    if (trashAfter === true) {
        file.setTrashed(true);
        if (file.isTrashed() !== true) throw new Error("El archivo Drive no confirmó su traslado a papelera.");
    }
    return true;
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
    let operationContentHash = "";

    try {
        logMessage("Edición In-Modal", "Procesando el intento " + operationId + " para el campo '" + fieldName + "' del vehículo ID: " + vehicleId + "...");

        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if (!sheet || sheet.getLastRow() < 2) throw new Error("No hay registros disponibles en la hoja Cortes.");
        const actualRow = findUniqueAdminVehicleRow_(sheet, String(vehicleId).trim());
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
        operationContentHash = contentHash;
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
            if (status === "cancelled" || status === "requires_review") {
                return {
                    status: "error", operationStatus: status, imageUrl: newImageUrl, currentImageUrl: currentUrl,
                    message: status === "cancelled"
                        ? "El intento ya fue cancelado y es terminal. Inicia un reemplazo nuevo si deseas volver a cargar la imagen."
                        : "El intento requiere revisión manual; no se reactivó ni se modificó su archivo."
                };
            }
            if (status === "linked") {
                if (!newImageUrl) throw new Error("La operación figura vinculada, pero no contiene una URL nueva verificable.");
                const latestLinkedUrl = String(activeCell.getValue() || "").trim();
                if (latestLinkedUrl === newImageUrl) {
                    const linkedFileId = String(values[5] || extractDriveFileId(newImageUrl) || "");
                    if (!linkedFileId) throw new Error("La operación figura vinculada, pero no contiene un ID de archivo verificable.");
                    try { newFile = DriveApp.getFileById(linkedFileId); }
                    catch (fileLookupError) {
                        return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                            "El archivo de una operación vinculada ya no está disponible en Drive. No se modificó la referencia activa.",
                            logMessage, null, contentHash);
                    }
                    if (newFile.isTrashed()) {
                        return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                            "El archivo de una operación ya vinculada fue enviado a papelera posteriormente. No se reactivó automáticamente ni se modificó la referencia activa.",
                            logMessage, newFile, contentHash);
                    }
                    try { verifyAdminImageUploadFile(newFile, actualMimeType, contentHash); }
                    catch (integrityError) {
                        return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                            "El archivo de una operación vinculada no superó la verificación de integridad. No se modificó la referencia activa: " + integrityError.message,
                            logMessage, newFile, contentHash);
                    }
                    if (originalUrl) {
                        try {
                            historyRecord = recordReplacedImage({
                                tipoContenido: "vehiculo", registroId: vehicleId, campo: fieldName,
                                imagenAnteriorUrl: originalUrl, sustituidaPorUrl: newImageUrl,
                                nombreVehiculo: String(rowValues[COLS_CORTES.marca - 1] || "") + " " +
                                    String(rowValues[COLS_CORTES.modelo - 1] || "") + " (" +
                                    String(rowValues[COLS_CORTES.anoDesde - 1] || "") + ")",
                                operationId: operationId
                            });
                        } catch (historyError) {
                            return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                                "No se pudo recuperar el registro histórico de una operación ya vinculada. No se modificó la referencia activa: " + historyError.message,
                                logMessage, newFile, contentHash);
                        }
                    }
                    try { updateAdminImageUploadFileState_(newFile, operationId, contentHash, "linked", false); }
                    catch (descriptionError) {
                        return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                            "No se pudo verificar el estado del archivo de una operación ya vinculada: " + descriptionError.message,
                            logMessage, newFile, contentHash);
                    }
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
            return markAdminImageUploadRequiresReview_(operationSheet, operationRecord, operationId, originalUrl,
                "El archivo asociado al intento está en papelera. No se reactivó automáticamente; requiere revisión manual.",
                logMessage, newFile, contentHash);
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
        updateAdminImageUploadFileState_(newFile, operationId, contentHash, "linked", false);

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
        let historySheet = null;
        let historyRowIndex = null;

        if (activeCell && newImageUrl) {
            try {
                const currentValue = String(activeCell.getValue() || "").trim();
                if ((currentValue === newImageUrl || currentValue === previousNewImageUrl) &&
                    currentValue !== originalUrl) {
                    restoreAdminImageActiveCell_(activeCell, originalUrl);
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

        try {
            if (historyRecord) {
                historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
                if (!historySheet) throw new Error("No se encontró la hoja de historial.");
                historyRowIndex = historyRecord.rowIndex;
            } else if (operationRecord && originalUrl) {
                historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
                if (!historySheet) throw new Error("No se encontró la hoja de historial.");
                const existingHistory = findReplacedImageRecordById(historySheet, "REP-" + operationId);
                if (existingHistory) historyRowIndex = existingHistory.rowIndex;
            }
        } catch (historyLookupError) {
            rollbackFailed = true;
            rollbackMessage += " No se pudo localizar el registro histórico para compensarlo: " + historyLookupError.message + ".";
        }

        if (historySheet && historyRowIndex) {
            try {
                updateAdminImageReplacementHistoryStatus_(
                    historySheet, historyRowIndex,
                    rollbackFailed || operationConflict ? "requiere_revision" : "cancelada"
                );
            } catch (historyError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo actualizar y verificar el estado del registro histórico: " + historyError.message + ".";
            }
        }

        if (newFile && operationContentHash) {
            try {
                updateAdminImageUploadFileState_(
                    newFile, operationId, operationContentHash,
                    rollbackFailed || operationConflict ? "requires_review" : "cancelled",
                    fileCreatedThisAttempt && !rollbackFailed && !operationConflict
                );
            } catch (fileError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo verificar el estado compensatorio del archivo Drive: " + fileError.message + ".";
                try { updateAdminImageUploadFileState_(newFile, operationId, operationContentHash, "requires_review", false); }
                catch (reviewFileError) { rollbackMessage += " Tampoco se pudo marcar el archivo para revisión: " + reviewFileError.message + "."; }
            }
        }

        if (rollbackFailed && historySheet && historyRowIndex) {
            try { updateAdminImageReplacementHistoryStatus_(historySheet, historyRowIndex, "requiere_revision"); }
            catch (historyReviewError) { rollbackMessage += " No se pudo confirmar requires_review en el historial: " + historyReviewError.message + "."; }
        }

        if (operationSheet && operationRecord) {
            const finalStatus = rollbackFailed || operationConflict ? "requires_review" : "cancelled";
            try {
                operationRecord.values[9] = finalStatus;
                operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                saveAdminImageUploadOperation(operationSheet, operationRecord);
            } catch (ledgerError) {
                rollbackFailed = true;
                rollbackMessage += " No se pudo actualizar/verificar el ledger de la operación: " + ledgerError.message + ".";
                try {
                    operationRecord.values[9] = "requires_review";
                    operationRecord.values[11] = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                    saveAdminImageUploadOperation(operationSheet, operationRecord);
                } catch (reviewLedgerError) {
                    rollbackMessage += " Tampoco se pudo confirmar requires_review en el ledger: " + reviewLedgerError.message + ".";
                }
                if (historySheet && historyRowIndex) {
                    try { updateAdminImageReplacementHistoryStatus_(historySheet, historyRowIndex, "requiere_revision"); }
                    catch (historyReviewError) { rollbackMessage += " No se pudo alinear el historial con requires_review: " + historyReviewError.message + "."; }
                }
                if (newFile && operationContentHash) {
                    try { updateAdminImageUploadFileState_(newFile, operationId, operationContentHash, "requires_review", false); }
                    catch (fileReviewError) { rollbackMessage += " No se pudo alinear el archivo Drive con requires_review: " + fileReviewError.message + "."; }
                }
            }
        }

        logMessage("Edición In-Modal", "Reemplazo " + operationId + " no confirmado. Motivo: " + error.message + rollbackMessage, 0, 0, true, true);
        throw new Error("No se completó el reemplazo; se intentó compensar y verificar todos los recursos. " + error.message + rollbackMessage);
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

function findNextAvailableCutSlot_(rowValues) {
    if (!Array.isArray(rowValues)) throw new Error("No se pudo verificar la disponibilidad de los espacios de corte.");
    for (let slot = 1; slot <= 3; slot++) {
        const column = COLS_CORTES['tipoCorte' + slot];
        if (!column) throw new Error("La estructura de columnas de cortes no es válida.");
        const value = rowValues[column - 1];
        if (value === null || value === undefined || String(value).trim() === "") return slot;
    }
    return null;
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
                    vehicleId: rowObj.id, timestamp: match.timestamp || rowObj.timestamp,
                    slotIndex: slotIndex, operationHash: operationHash
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
        let savedSlotIndex = 1;

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

        const cutSlotIndex = findNextAvailableCutSlot_(rowValues);
        if (cutSlotIndex === null) throw new Error("No hay espacios disponibles para más cortes.");
        savedSlotIndex = cutSlotIndex;

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
    return { status: 'success', message: `Corte administrativo agregado de forma silenciosa.`, vehicleId: newId, timestamp: formattedDate, slotIndex: savedSlotIndex, operationHash: operationHash };
    } finally {
        lock.releaseLock();
    }
}


function sanitizeSupplementaryRichText_(value) {
 if(value===null||value===undefined)return "";
 const input=String(value).replace(/\r\n?/g,"\n"),allowed=new Set(["b","strong","span","br","p","div","i","em","u","s","strike","ol","ul","li","a","img","small","mark","font"]),voids=new Set(["br","img"]);
 const dropped=new Set(["script","style","iframe","object","embed","svg","math","template","form","textarea","select","option","button","input","meta","link","base","video","audio","source","canvas","applet","noscript"]),voidDropped=new Set(["input","meta","link","base","source","embed"]);
 const markers=new Set(["hyphen","arrow","check","bullet"]),fonts=new Set(["Arial, sans-serif","'Segoe UI', Roboto, sans-serif","'Courier New', monospace","Georgia, serif"]),sizes=new Set(["0.85em","1em","1.2em","1.5em"]),colors=new Set(["red","blue","green","black","white","orange","yellow","gray","grey","purple","teal","navy"]);
 const textSafe=s=>String(s).replace(/&(?!(?:#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);)/gi,"&amp;").replace(/</g,"&lt;").replace(/\n/g,"<br>"),attrSafe=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const urlSafe=(v,img)=>{const u=String(v||"").trim();if(!u||/\s|[\u0000-\u001f\u007f]/.test(u))return "";if(/^https?:\/\/[^"'<>]+$/i.test(u))return u;if(!img&&/^(?:mailto|tel):[^"'<>]+$/i.test(u))return u;return "";};
 const styleSafe=s=>{const out=[],color=v=>/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([0-9.,%\s]+\)$/i.test(v)||colors.has(v.toLowerCase());String(s||"").split(";").forEach(d=>{const i=d.indexOf(":");if(i<0)return;const p=d.slice(0,i).trim().toLowerCase(),v=d.slice(i+1).trim();if(!v||/(?:url\s*\(|expression|javascript:|@import|behavior|binding)/i.test(v))return;if(p==="color"&&color(v))out.push("color:"+v);else if(p==="font-size"&&sizes.has(v))out.push("font-size:"+v);else if(p==="font-family"&&fonts.has(v))out.push("font-family:"+v);else if(p==="float"&&/^(left|right|none)$/i.test(v))out.push("float:"+v);else if(["height","width","margin-left"].includes(p)&&/^(auto|\d{1,3}px|\d{1,3}%|\d{1,2}(?:\.\d+)?em)$/i.test(v))out.push(p+":"+v);else if(p==="text-align"&&/^(left|right|center|justify)$/i.test(v))out.push("text-align:"+v);});return out.join(";");};
 const attrs=(tag,raw)=>{const out=[],re=/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;let m,blank=false;while((m=re.exec(raw||""))!==null){const n=String(m[1]||"").toLowerCase(),v=m[2]!==undefined?m[2]:m[3]!==undefined?m[3]:m[4]!==undefined?m[4]:"";if(!n||n.startsWith("on")||["srcdoc","formaction","xlink:href","srcset","xmlns"].includes(n))continue;if(n==="style"){const s=styleSafe(v);if(s)out.push('style="'+attrSafe(s)+'"');continue;}if(tag==="a"&&n==="href"){const u=urlSafe(v,false);if(u)out.push('href="'+attrSafe(u)+'"');continue;}if(tag==="a"&&n==="target"&&v==="_blank"){blank=true;out.push('target="_blank"');continue;}if(tag==="a"&&n==="title"){out.push('title="'+attrSafe(v)+'"');continue;}if(tag==="img"&&n==="src"){const u=urlSafe(v,true);if(u)out.push('src="'+attrSafe(u)+'"');continue;}if(tag==="img"&&n==="alt"){out.push('alt="'+attrSafe(v)+'"');continue;}if(tag==="img"&&["width","height"].includes(n)&&/^\d{1,4}$/.test(v)){out.push(n+'="'+v+'"');continue;}if(tag==="ul"&&n==="data-gp-marker"&&markers.has(v)){out.push('data-gp-marker="'+v+'"');continue;}if(tag==="ol"&&n==="start"&&/^\d{1,4}$/.test(v)){out.push('start="'+v+'"');continue;}if(tag==="font"&&n==="color"&&(/^#[0-9a-f]{3,8}$/i.test(v)||colors.has(v.toLowerCase()))){out.push('color="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="face"&&fonts.has(v)){out.push('face="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="size"&&/^[1-7]$/.test(v))out.push('size="'+v+'"');}if(tag==="a"&&blank)out.push('rel="noopener noreferrer"');return out.length?" "+out.join(" "):"";};
 let out="",cursor=0;const stack=[],suppressed=[],tokenRe=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|</gi;let m;
 while((m=tokenRe.exec(input))!==null){if(!suppressed.length)out+=textSafe(input.slice(cursor,m.index));const token=m[0];cursor=tokenRe.lastIndex;if(token.startsWith("<!--")||/^<!/i.test(token))continue;if(token==="<"){if(!suppressed.length)out+="&lt;";continue;}const t=token.match(/^<\s*(\/?)\s*([a-z][a-z0-9-]*)\b([\s\S]*?)>$/i);if(!t){if(!suppressed.length)out+=textSafe(token);continue;}const close=t[1]==="/",tag=t[2].toLowerCase();if(suppressed.length){if(close){const i=suppressed.lastIndexOf(tag);if(i>=0)suppressed.length=i;}else if(dropped.has(tag)&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(dropped.has(tag)){if(!close&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(close){if(!allowed.has(tag)||voids.has(tag))continue;const i=stack.lastIndexOf(tag);if(i<0)continue;for(let j=stack.length-1;j>=i;j--)out+="</"+stack[j]+">";stack.length=i;continue;}if(!allowed.has(tag))continue;out+="<"+tag+attrs(tag,t[3])+">";if(!voids.has(tag))stack.push(tag);}
 if(!suppressed.length)out+=textSafe(input.slice(cursor));for(let i=stack.length-1;i>=0;i--)out+="</"+stack[i]+">";return out;
}

function createSupplementaryInfoError_(code,message){const e=new Error(message);e.code=code;return e;}
function hasSupplementaryValue_(v){return typeof v==="string"&&v.trim()!=="";}
function assertSupplementaryInfoPayloadKeys_(payload){
 const allowed=new Set(["vehicleId","userId","sessionToken","__sharedMutationToken","timestamp","opId","apertura","cableAlimen","cableAlimen2","cableAlimen3","notaImportante","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"]);
 const videoFields=new Set(["video","videoUrl","Video","videoGuiaUrl","videoGuiaDesarmeUrl","field","fieldName"]);
 const keys=Object.keys(payload||{}),videoField=keys.find(key=>videoFields.has(key));
 if(videoField)throw createSupplementaryInfoError_("SUPPLEMENTARY_VIDEO_APPROVAL_REQUIRED","El vídeo no se puede guardar mediante addSupplementaryInfo ni con un enlace directo. Utiliza el flujo de aprobación de YouTube.");
 const unexpected=keys.filter(key=>!allowed.has(key));
 if(unexpected.length)throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","Campo(s) no permitido(s) en información suplementaria: "+unexpected.join(", ")+".");
}
function buildSupplementaryInfoPlan_(payload,current){
 payload=payload&&typeof payload==="object"?Object.assign({},payload):{};current=current&&typeof current==="object"?current:{};
 assertSupplementaryInfoPayloadKeys_(payload);
 ["apertura","cableAlimen","cableAlimen2","cableAlimen3","notaImportante","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"].forEach(k=>{const v=payload[k];if(v!==undefined&&v!==null&&typeof v!=="string")throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","El campo "+k+" debe contener texto válido.");});
 ["apertura","cableAlimen","cableAlimen2","cableAlimen3","notaImportante"].forEach(k=>{if(payload[k]!==undefined&&payload[k]!==null){if(payload[k].length>5000)throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","El campo "+k+" no puede exceder 5000 caracteres.");payload[k]=sanitizeSupplementaryRichText_(payload[k]);}});
 const aperture=hasSupplementaryValue_(payload.apertura)||hasSupplementaryValue_(payload.imgApertura),note=hasSupplementaryValue_(payload.notaImportante);
 const pairs=[{text:payload.cableAlimen,image:payload.imgCableAlimen},{text:payload.cableAlimen2,image:payload.imgCableAlimen2},{text:payload.cableAlimen3,image:payload.imgCableAlimen3}].filter(x=>hasSupplementaryValue_(x.text)||hasSupplementaryValue_(x.image));
 if(!aperture&&!note&&!pairs.length)throw createSupplementaryInfoError_("SUPPLEMENTARY_EMPTY_PAYLOAD","No se recibió información suplementaria válida para guardar.");
 if(pairs.length>1)throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","La solicitud debe agregar un solo cable de alimentación por operación.");
 if(aperture&&(hasSupplementaryValue_(current.apertura)||hasSupplementaryValue_(current.imgApertura)))throw createSupplementaryInfoError_("SUPPLEMENTARY_CONFLICT","La apertura ya contiene texto o imagen. No se sobrescribió la información existente.");
 const updates={};let slotIndex=null;
 if(aperture){if(hasSupplementaryValue_(payload.apertura))updates.apertura=payload.apertura;if(hasSupplementaryValue_(payload.imgApertura))updates.imgApertura=payload.imgApertura;}
 if(pairs.length){const slot=[1,2,3].find(i=>{const n=i===1?"":String(i);return !hasSupplementaryValue_(current["cableAlimen"+n])&&!hasSupplementaryValue_(current["imgCableAlimen"+n]);});if(!slot)throw createSupplementaryInfoError_("SUPPLEMENTARY_CONFLICT","Los tres espacios de alimentación están ocupados. No se modificó el registro.");slotIndex=slot;const n=slot===1?"":String(slot);if(hasSupplementaryValue_(pairs[0].text))updates["cableAlimen"+n]=pairs[0].text;if(hasSupplementaryValue_(pairs[0].image))updates["imgCableAlimen"+n]=pairs[0].image;}
 if(note)updates.notaImportante=payload.notaImportante;return {updates,slotIndex,apertureRequested:aperture};
}
function persistSupplementaryInfoValues_(sheet,row,original,updated){
 const range=sheet.getRange(row,COLS_CORTES.apertura,1,10);
 try{range.setValues([updated]);SpreadsheetApp.flush();const saved=range.getValues()[0];if(!updated.every((v,i)=>String(saved[i]==null?"":saved[i])===String(v==null?"":v)))throw Error("La lectura posterior no coincide.");return true;}
 catch(e){let rollback="";try{range.setValues([original]);SpreadsheetApp.flush();}catch(r){rollback=" La reversión automática también falló: "+String(r&&r.message||r);}throw createSupplementaryInfoError_("SUPPLEMENTARY_PERSISTENCE_FAILED","No se pudo confirmar la escritura de la información suplementaria."+rollback);}
}
function handleAddSupplementaryInfo(payload, logMessage){
 
 const lock=LockService.getScriptLock();try{lock.waitLock(30000);}catch(e){throw createSupplementaryInfoError_("SUPPLEMENTARY_LOCK_FAILED","No se pudo bloquear el registro de información suplementaria. Intente nuevamente.");}
 try{return handleAddSupplementaryInfoLocked(payload, logMessage);}finally{lock.releaseLock();}
}
function handleAddSupplementaryInfoLocked(payload, logMessage){
 
 if(!payload||typeof payload!=="object"||!String(payload.vehicleId||"").trim())throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_VEHICLE_ID","El ID del vehículo es requerido para agregar información suplementaria.");
 logMessage("Registro Administrativo","Procesando addSupplementaryInfo administrativo para ID: "+payload.vehicleId+"...");
 const sheet=getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
 if(!sheet||sheet.getLastRow()<2)throw createSupplementaryInfoError_("VEHICLE_NOT_FOUND","El vehículo indicado no existe en el registro.");
 if(sheet.getLastColumn()<COLS_CORTES.imgCableAlimen3)throw createSupplementaryInfoError_("SUPPLEMENTARY_SCHEMA_INVALID","La hoja Cortes no contiene todas las columnas de información suplementaria.");
 const ids=sheet.getRange(2,COLS_CORTES.id,sheet.getLastRow()-1,1).getValues().flat(),matches=[];
 ids.forEach((id,i)=>{if(String(id==null?"":id).trim()===String(payload.vehicleId).trim())matches.push(i+2);});
 if(!matches.length)throw createSupplementaryInfoError_("VEHICLE_NOT_FOUND","El vehículo indicado no existe en el registro.");
 if(matches.length>1)throw createSupplementaryInfoError_("VEHICLE_ID_AMBIGUOUS","El ID del vehículo aparece más de una vez. No se realizó ninguna modificación.");
 const row=matches[0],rowValues=sheet.getRange(row,1,1,sheet.getLastColumn()).getValues()[0],vehicle=mapRowToObject(rowValues,COLS_CORTES);
 const plan=buildSupplementaryInfoPlan_(payload,vehicle),original=rowValues.slice(COLS_CORTES.apertura-1,COLS_CORTES.imgCableAlimen3),updated=original.slice(),index=field=>COLS_CORTES[field]-COLS_CORTES.apertura;
 Object.keys(plan.updates).forEach(field=>{if(field.indexOf("img")!==0)updated[index(field)]=plan.updates[field];});
 const imageFields=["imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"],images=imageFields.filter(field=>hasSupplementaryValue_(plan.updates[field]));
 try{
  const folder=images.length?findOrCreateVehicleFolder(vehicle):null;
  images.forEach(field=>{const url=uploadImageToDrive(plan.updates[field],buildCanonicalImageBaseName(vehicle,field),folder,buildImageUploadOperationKey(payload.opId,payload.vehicleId,field));if(!url)throw Error("La carga de imagen no devolvió una URL válida.");updated[index(field)]=url;});
  const ti=index("timestamp");if(!hasSupplementaryValue_(String(updated[ti]||""))){let date=new Date();date.setDate(date.getDate()-365);updated[ti]=hasSupplementaryValue_(payload.timestamp)?payload.timestamp:Utilities.formatDate(date,"GMT-6","dd/MM/yyyy");}
  persistSupplementaryInfoValues_(sheet,row,original,updated);
 }catch(e){if(e&&e.code)throw e;throw createSupplementaryInfoError_("SUPPLEMENTARY_PERSISTENCE_FAILED","No se pudo guardar la información suplementaria: "+String(e&&e.message||e));}
 images.forEach(field=>{try{markImageUploadLinked(updated[index(field)]);}catch(e){logMessage("Advertencia","La imagen se guardó, pero no se confirmó su vínculo en el ledger: "+String(e&&e.message||e),0,0,true,false);}});
 logMessage("Registro Administrativo","Información suplementaria administrativa agregada con éxito.");
 return {status:"success",message:"Información suplementaria administrativa agregada de forma silenciosa.",vehicleId:String(payload.vehicleId),slotIndex:plan.slotIndex,apertureSaved:plan.apertureRequested};
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

function validateAdminSheetName_(value) {
    if (typeof value !== "string") throw new Error("El nombre de hoja debe ser texto.");
    const name = value.trim();
    if (!name || name.length > 100 || /[:\\\/?*\[\]\u0000-\u001f\u007f]/.test(name)) {
        throw new Error("El nombre de hoja debe tener entre 1 y 100 caracteres y no contener caracteres reservados.");
    }
    return name;
}

function validateAdminColumnName_(value) {
    if (typeof value !== "string") throw new Error("El nombre de columna debe ser texto.");
    const name = value.trim();
    if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
        throw new Error("El nombre de columna debe tener entre 1 y 100 caracteres y no contener caracteres de control.");
    }
    return name;
}

function validateAdminHeaders_(value) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new Error("Los encabezados deben enviarse como una lista de textos.");
    return value.map((header, index) => {
        if (typeof header !== "string" || header.length > 100 || /[\u0000-\u001f\u007f]/.test(header)) {
            throw new Error("El encabezado en la posición " + (index + 1) + " debe ser texto de hasta 100 caracteres sin controles.");
        }
        return header;
    });
}

function validateAdminIdFormula_(value) {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") throw new Error("La fórmula de ID debe ser texto.");
    const formula = value.trim();
    if (!formula.startsWith("=") || formula.length > 500 || /[\u0000-\u001f\u007f]/.test(formula)) {
        throw new Error("La fórmula de ID debe ser una expresión de hasta 500 caracteres iniciada con '='.");
    }
    return formula;
}

function handleCreateSheet(payload, logMessage) {
    const source = payload && typeof payload === "object" ? payload : {};
    const sheetName = validateAdminSheetName_(source.sheetName);
    const headers = validateAdminHeaders_(source.headers);
    const idFormula = validateAdminIdFormula_(source.idFormula);
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) throw new Error(`La hoja '${sheetName}' ya existe en el libro.`);

    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }

    if (idFormula && headers.length > 0) {
        sheet.getRange(2, 1).setFormula(idFormula);
    }

    logMessage && logMessage("Spreadsheet", `Hoja '${sheetName}' creada con exito.`);
    return { status: 'success', message: `Hoja '${sheetName}' creada correctamente.` };
}

function handleAddColumn(payload, logMessage) {
    const source = payload && typeof payload === "object" ? payload : {};
    const sheetName = validateAdminSheetName_(source.sheetName);
    const columnName = validateAdminColumnName_(source.columnName);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`La hoja '${sheetName}' no existe.`);

    const lastCol = sheet.getLastColumn();
    const newColIndex = lastCol + 1;
    sheet.getRange(1, newColIndex).setValue(columnName).setFontWeight("bold").setBackground("#f3f3f3");

    logMessage && logMessage("Spreadsheet", `Columna '${columnName}' agregada a '${sheetName}' en el indice ${newColIndex}.`);
    return { status: 'success', message: `Columna '${columnName}' agregada en la posicion ${newColIndex}.`, columnIndex: newColIndex };
}

function getDriveParentFolders_(resource) {
    try {
        const parents = resource && resource.getParents();
        if (!parents || typeof parents.hasNext !== "function" || typeof parents.next !== "function") return null;
        const result = [];
        while (parents.hasNext()) result.push(parents.next());
        return result;
    } catch (error) {
        return null;
    }
}

function isDriveFolderWithinCortes_(folder, rootFolderId, visitedIds = []) {
    if (!folder || !rootFolderId) return false;
    let folderId;
    try { folderId = String(folder.getId() || ""); } catch (error) { return false; }
    if (!folderId) return false;
    if (folderId === String(rootFolderId)) return true;
    if (visitedIds.includes(folderId)) return false;

    const parents = getDriveParentFolders_(folder);
    if (!parents || parents.length === 0) return false;
    const nextVisited = visitedIds.concat(folderId);
    return parents.every(parent => isDriveFolderWithinCortes_(parent, rootFolderId, nextVisited));
}

function isDriveFileWithinCortes_(file, rootFolderId) {
    const parents = getDriveParentFolders_(file);
    return Boolean(parents && parents.length > 0 &&
        parents.every(parent => isDriveFolderWithinCortes_(parent, rootFolderId)));
}

function getValidatedCortesTerminalFolder_(folderId, rootFolder) {
    let folder;
    try {
        folder = folderId ? DriveApp.getFolderById(folderId) : rootFolder;
    } catch (error) {
        throw new Error("La carpeta solicitada no existe o no está disponible dentro de Cortes.");
    }
    if (!isDriveFolderWithinCortes_(folder, rootFolder.getId())) {
        throw new Error("Acceso denegado: la terminal Drive solo permite operar dentro del árbol Cortes.");
    }
    return folder;
}

function getCortesTerminalChildFolders_(folder, rootFolderId) {
    const result = [];
    const iterator = folder.getFolders();
    while (iterator.hasNext()) {
        const child = iterator.next();
        if (isDriveFolderWithinCortes_(child, rootFolderId)) result.push(child);
    }
    return result;
}

function getCortesTerminalFiles_(folder, rootFolderId) {
    const result = [];
    const iterator = folder.getFiles();
    while (iterator.hasNext()) {
        const file = iterator.next();
        if (isDriveFileWithinCortes_(file, rootFolderId)) result.push(file);
    }
    return result;
}

function hasDirectDriveParent_(resource, parentId) {
    const parents = getDriveParentFolders_(resource);
    return Boolean(parents && parents.some(parent => String(parent.getId()) === String(parentId)));
}

function handleDriveCommand(payload, logMessage) {
    const input = payload && typeof payload === "object" ? payload : {};
    const { command, currentFolderId, args } = input;
    const rootFolder = getCortesRootFolder();
    const rootFolderId = String(rootFolder.getId());
    const cmd = String(command || "").toLowerCase().trim();
    const cdTarget = String(args || "").trim();
    if (cmd === "cd" && (cdTarget === "\\" || cdTarget === "/")) {
        return { status: "success", currentFolder: { id: rootFolderId, name: rootFolder.getName() }, isRoot: true };
    }
    const activeFolder = getValidatedCortesTerminalFolder_(currentFolderId, rootFolder);

    if (cmd === "dir" || cmd === "ls") {
        const folders = getCortesTerminalChildFolders_(activeFolder, rootFolderId).map(folder => ({
            id: folder.getId(), name: folder.getName(), type: "folder"
        }));
        const files = getCortesTerminalFiles_(activeFolder, rootFolderId).map(file => ({
            id: file.getId(), name: file.getName(), size: file.getSize(),
            mimeType: file.getMimeType(), type: "file"
        }));
        return {
            status: "success",
            currentFolder: { id: activeFolder.getId(), name: activeFolder.getName() },
            isRoot: String(activeFolder.getId()) === rootFolderId,
            folders,
            files
        };
    }

    if (cmd === "cd") {
        const target = cdTarget;
        if (target === "..") {
            if (String(activeFolder.getId()) === rootFolderId) {
                return { status: "success", currentFolder: { id: rootFolderId, name: rootFolder.getName() }, isRoot: true };
            }
            const parents = getDriveParentFolders_(activeFolder);
            if (!parents || parents.length !== 1 ||
                !isDriveFolderWithinCortes_(parents[0], rootFolderId)) {
                throw new Error("No se puede determinar de forma única la carpeta padre dentro de Cortes.");
            }
            return {
                status: "success",
                currentFolder: { id: parents[0].getId(), name: parents[0].getName() },
                isRoot: String(parents[0].getId()) === rootFolderId
            };
        }

        const matches = [];
        const iterator = activeFolder.getFoldersByName(target);
        while (iterator.hasNext()) matches.push(iterator.next());
        if (matches.length !== 1) {
            if (matches.length > 1) throw new Error("Hay varias carpetas con ese nombre; utiliza una ruta inequívoca.");
            throw new Error("Carpeta '" + target + "' no encontrada en '" + activeFolder.getName() + "'.");
        }
        const found = matches[0];
        if (!isDriveFolderWithinCortes_(found, rootFolderId) ||
            !hasDirectDriveParent_(found, activeFolder.getId())) {
            throw new Error("Acceso denegado: la carpeta seleccionada no pertenece a la ruta actual dentro de Cortes.");
        }
        return {
            status: "success",
            currentFolder: { id: found.getId(), name: found.getName() },
            isRoot: String(found.getId()) === rootFolderId
        };
    }

    if (cmd === "mkdir") {
        const folderName = String(args || "").trim();
        if (!folderName) throw new Error("Nombre de carpeta requerido para mkdir.");
        if (!isDriveFolderWithinCortes_(activeFolder, rootFolderId)) {
            throw new Error("La carpeta actual dejó de pertenecer al árbol Cortes; no se creó la carpeta solicitada.");
        }
        const newSub = activeFolder.createFolder(folderName);
        if (!isDriveFolderWithinCortes_(newSub, rootFolderId) ||
            !hasDirectDriveParent_(newSub, activeFolder.getId())) {
            throw new Error("La carpeta creada no pudo verificarse dentro de la carpeta actual de Cortes.");
        }
        logMessage && logMessage("Drive", "Carpeta creada dentro del árbol Cortes: " + newSub.getName());
        return {
            status: "success",
            message: "Carpeta '" + newSub.getName() + "' creada con ID: " + newSub.getId(),
            folderId: newSub.getId()
        };
    }

    if (cmd === "move") {
        const fileId = String(input.fileId || "").trim();
        const targetFolderId = String(input.targetFolderId || "").trim();
        if (!fileId || !targetFolderId) throw new Error("ID de archivo y ID de carpeta destino requeridos.");

        let file, targetDir;
        try {
            file = DriveApp.getFileById(fileId);
            targetDir = DriveApp.getFolderById(targetFolderId);
        } catch (error) {
            throw new Error("El archivo o la carpeta destino no existe o no está disponible.");
        }
        if (!isDriveFileWithinCortes_(file, rootFolderId)) {
            throw new Error("Acceso denegado: el archivo de origen no pertenece al árbol Cortes.");
        }
        if (!isDriveFolderWithinCortes_(targetDir, rootFolderId)) {
            throw new Error("Acceso denegado: la carpeta destino no pertenece al árbol Cortes.");
        }

        // Revalidar justo antes de la escritura para reducir la ventana ante cambios externos en Drive.
        if (!isDriveFileWithinCortes_(file, rootFolderId) ||
            !isDriveFolderWithinCortes_(targetDir, rootFolderId)) {
            throw new Error("La ubicación del archivo o del destino cambió durante la validación; no se realizó el movimiento.");
        }
        file.moveTo(targetDir);
        if (!isDriveFileWithinCortes_(file, rootFolderId) ||
            !hasDirectDriveParent_(file, targetDir.getId())) {
            throw new Error("El movimiento se ejecutó, pero no pudo verificarse su ubicación final dentro de Cortes. Revisa el archivo antes de reintentar.");
        }
        return { status: "success", message: "Archivo '" + file.getName() + "' movido a '" + targetDir.getName() + "'." };
    }

    if (cmd === "tree") {
        const visited = new Set();
        function buildTree(folder, depth = 0) {
            const folderId = String(folder.getId());
            if (visited.has(folderId)) return "";
            visited.add(folderId);
            if (depth > 2) return "  ".repeat(depth) + "... (profundidad maxima)\n";
            let result = "  ".repeat(depth) + "📁 [" + folder.getName() + "]\n";
            getCortesTerminalFiles_(folder, rootFolderId).forEach(file => {
                result += "  ".repeat(depth + 1) + "📄 " + file.getName() + "\n";
            });
            getCortesTerminalChildFolders_(folder, rootFolderId).forEach(child => {
                result += buildTree(child, depth + 1);
            });
            return result;
        }
        return { status: "success", tree: buildTree(activeFolder) };
    }

    throw new Error("Comando de terminal '" + String(command || "") + "' no reconocido.");
}

// ============================================================================
// GESTIÓN Y RECUPERACIÓN DE IMÁGENES REEMPLAZADAS EN GOOGLE DRIVE (TAREA 2)
// ============================================================================

/**
 * Obtener o inicializar la hoja dedicada 'Imagenes_Reemplazadas'
 */
function withReplacedImagesSchemaLock_(callback) {
    const lock = LockService.getScriptLock();
    const alreadyLocked = typeof lock.hasLock === "function" && lock.hasLock();
    let acquired = false;
    try { if (!alreadyLocked) { lock.waitLock(30000); acquired = true; } return callback(); }
    finally { if (acquired) lock.releaseLock(); }
}
function getOrCreateReplacedImagesSheet() {
    return withReplacedImagesSchemaLock_(function() {
        let sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
        if (!sheet) {
            sheet = getSpreadsheet().insertSheet(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
            const headers = ["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo",
                "archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f0f4f8");
            sheet.setFrozenRows(1);
            SpreadsheetApp.flush();
            const persisted = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0].map(value => String(value || "").trim());
            if (headers.some((header, index) => persisted[index] !== header)) throw new Error("No se pudo verificar la creación de la estructura base del historial de imágenes.");
        }
        return sheet;
    });
}

/**
 * Añade columnas de inventario sin alterar ni desplazar las once columnas históricas existentes.
 */
function ensureReplacedImagesInventoryColumns(sheet) {
    return withReplacedImagesSchemaLock_(function() {
        const baseHeaders = ["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"];
        const actualBaseHeaders = sheet.getRange(1,1,1,baseHeaders.length).getDisplayValues()[0].map(value=>String(value||"").trim());
        if (baseHeaders.some((header,index)=>actualBaseHeaders[index]!==header)) throw new Error("La estructura base de «Imagenes_Reemplazadas» no coincide con el esquema esperado. No se modificó el inventario.");
        const requiredHeaders = ["origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"];
        let headers = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),baseHeaders.length)).getDisplayValues()[0].map(value=>String(value||"").trim());
        const duplicateRequiredHeaders=requiredHeaders.filter(header=>headers.filter(value=>value===header).length>1);
        if(duplicateRequiredHeaders.length)throw new Error("Hay encabezados dinámicos duplicados; se detuvo la migración: "+duplicateRequiredHeaders.join(", "));
        requiredHeaders.forEach(header=>{
            const matches=headers.filter(value=>value===header).length;
            if(matches>1) throw new Error("El encabezado «"+header+"» está duplicado; se detuvo la migración.");
            if(matches===0){const col=sheet.getLastColumn()+1;sheet.getRange(1,col).setValue(header).setFontWeight("bold").setBackground("#f0f4f8");headers.push(header);}
        });
        const lastRow=sheet.getLastRow();
        if(lastRow>1){
            const typeCol=headers.indexOf("tipo_registro")+1, originCol=headers.indexOf("origen_registro")+1, visualCol=headers.indexOf("url_visualizacion")+1;
            const typeValues=sheet.getRange(2,typeCol,lastRow-1,1).getValues();
            const originValues=sheet.getRange(2,originCol,lastRow-1,1).getValues();
            const visualValues=sheet.getRange(2,visualCol,lastRow-1,1).getValues();
            const idValues=sheet.getRange(2,1,lastRow-1,1).getValues();
            const contentValues=sheet.getRange(2,3,lastRow-1,1).getValues();
            const driveValues=sheet.getRange(2,6,lastRow-1,1).getValues();
            const originalValues=sheet.getRange(2,8,lastRow-1,1).getValues();
            let typeChanged=false,visualChanged=false;
            for(let i=0;i<typeValues.length;i++){
                const hasId=String(idValues[i][0]||"").trim()!=="";
                const origin=String(originValues[i][0]||"").trim();
                const contentType=String(contentValues[i][0]||"").trim();
                if(!typeValues[i][0]&&hasId){
                    if(origin==="auditoria_drive"&&contentType==="inventario_sin_uso"){typeValues[i][0]="sin_uso_detectado";typeChanged=true;}
                    else if(origin!=="auditoria_drive"&&contentType!=="inventario_sin_uso"){typeValues[i][0]="reemplazada";typeChanged=true;}
                }
                if(!String(visualValues[i][0]||"").trim()){
                    const a=extractDriveFileIds(driveValues[i][0]),b=extractDriveFileIds(originalValues[i][0]);
                    if(a.length===1&&b.length===1&&a[0]===b[0]){visualValues[i][0]="https://lh3.googleusercontent.com/d/"+a[0];visualChanged=true;}
                }
            }
            if(typeChanged)sheet.getRange(2,typeCol,lastRow-1,1).setValues(typeValues);
            if(visualChanged)sheet.getRange(2,visualCol,lastRow-1,1).setValues(visualValues);
        }
        SpreadsheetApp.flush();
        const persisted=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(value=>String(value||"").trim());
        requiredHeaders.forEach(header=>{if(persisted.filter(value=>value===header).length!==1)throw new Error("No se pudo verificar la migración del encabezado «"+header+"».");});
        return persisted;
    });
}
function getReplacedImagesReadSchema_(){
    const sheet=getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
    const requiredHeaders=["origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"];
    if(!sheet)return {sheet:null,headers:[],missingHeaders:requiredHeaders};
    const baseHeaders=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"];
    const headers=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),baseHeaders.length)).getDisplayValues()[0].map(value=>String(value||"").trim());
    if(baseHeaders.some((header,index)=>headers[index]!==header))throw new Error("La estructura base de «Imagenes_Reemplazadas» no coincide con el esquema esperado.");
    const duplicates=headers.filter((header,index)=>header&&headers.indexOf(header)!==index);
    if(duplicates.length)throw new Error("Hay encabezados duplicados en «Imagenes_Reemplazadas»: "+[...new Set(duplicates)].join(", "));
    return {sheet,headers,missingHeaders:requiredHeaders.filter(header=>!headers.includes(header))};
}
function getReplacedImageRecordIdentity_(row,headers,requireVisualUrl){
    const storedIds=extractDriveFileIds(row&&row[5]),originalIds=extractDriveFileIds(row&&row[7]);
    if(storedIds.length!==1||originalIds.length!==1||storedIds[0]!==originalIds[0])throw new Error("Los IDs de archivo_drive_id y url_anterior están ausentes, duplicados o no coinciden.");
    const visualIndex=headers.indexOf("url_visualizacion"),visualUrl=visualIndex>=0?String(row[visualIndex]||"").trim():"";
    if(requireVisualUrl&&!visualUrl)throw new Error("El registro no contiene URL de visualización; requiere revisión.");
    if(visualUrl){const ids=extractDriveFileIds(visualUrl);if(ids.length!==1||ids[0]!==storedIds[0])throw new Error("El ID de url_visualizacion no coincide con archivo_drive_id y url_anterior.");}
    return storedIds[0];
}
function isKnownReplacedImageStatus_(type,status){
    const allowed=type==="reemplazada"?["historica","restablecida","en_papelera","requiere_revision","cancelada","en_uso","eliminacion_pendiente","eliminada"]:
        ["sin_uso_detectado","en_papelera","no_confirmada_en_ultima_auditoria","requiere_revision","cancelada","eliminacion_pendiente","eliminada","en_uso"];
    return allowed.includes(status);
}
function getDuplicateReplacedImageIds_(rows){
    const counts=new Map();
    (Array.isArray(rows)?rows.slice(1):[]).forEach(row=>{const id=String(row&&row[0]||"").trim();if(id)counts.set(id,(counts.get(id)||0)+1);});
    return new Set([...counts.entries()].filter(entry=>entry[1]>1).map(entry=>entry[0]));
}
function setReplacedImageHistoryStatusVerified_(sheet,rowIndex,status){
    if(!sheet||!Number.isInteger(rowIndex)||rowIndex<2||!["historica","restablecida","en_papelera","requiere_revision","cancelada","sin_uso_detectado","no_confirmada_en_ultima_auditoria","eliminacion_pendiente","eliminada","en_uso"].includes(status))throw new Error("No se pudo identificar una transición válida del historial de imágenes.");
    const cell=sheet.getRange(rowIndex,11);cell.setValue(status);SpreadsheetApp.flush();
    if(String(cell.getValue()||"").trim()!==status)throw new Error("El estado del historial no se confirmó por lectura posterior.");
    return true;
}

function setReplacedImageTrashPreviousStatusVerified_(sheet,rowIndex,headers,status){
    const column=Array.isArray(headers)?headers.indexOf("estado_previo_papelera")+1:0;
    if(!sheet||!Number.isInteger(rowIndex)||rowIndex<2||column<1||
        !["historica","restablecida","requiere_revision","sin_uso_detectado","no_confirmada_en_ultima_auditoria"].includes(status)){
        throw new Error("No se pudo identificar el estado previo a papelera.");
    }
    const cell=sheet.getRange(rowIndex,column);
    cell.setValue(status);SpreadsheetApp.flush();
    if(String(cell.getValue()||"").trim()!==status)throw new Error("El estado previo a papelera no se confirmó por lectura posterior.");
    return true;
}

function handleMigrateReplacedImagesSchema(payload,logMessage){
    const lock=LockService.getScriptLock();
    try{lock.waitLock(30000);}catch(error){throw new Error("No se pudo bloquear la migración del historial de imágenes.");}
    try{
        const sheet=getOrCreateReplacedImagesSheet(),headers=ensureReplacedImagesInventoryColumns(sheet);
        const result={status:"success",migrated:true,columnCount:headers.length,rowCount:Math.max(0,sheet.getLastRow()-1),headers};
        logMessage&&logMessage("Esquema del historial","Se verificaron y migraron de forma idempotente los encabezados del historial de imágenes.");
        return result;
    }finally{lock.releaseLock();}
}


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
        const existingStatus = String(values[10] || "historica").trim();
        getReplacedImageRecordIdentity_(values, inventoryHeaders, true);
        if (!isKnownReplacedImageStatus_("reemplazada", existingStatus) || existingStatus === "requiere_revision" || existingStatus === "en_papelera") {
            throw new Error("El registro histórico está en estado " + existingStatus + " y no puede reutilizarse automáticamente.");
        }
        if (String(values[2] || "") !== String(data.tipoContenido || "vehiculo") ||
            String(values[3] || "") !== String(data.registroId || "") ||
            String(values[4] || "") !== String(data.campo || "") ||
            String(values[7] || "") !== completeOriginalUrl) {
            throw new Error("El opId del historial ya está asociado a otra imagen anterior, vehículo o campo.");
        }

        if (String(values[8] || "") === newImageUrl) {
            const changed = existingStatus === "cancelada";
            if (changed) setReplacedImageHistoryStatusVerified_(sheet, existing.rowIndex, "historica");
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
        if (existingStatus === "cancelada" || previousTargetUnavailable) {
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
        sheet.getRange(rowIndex, inventoryHeaders.indexOf("url_visualizacion") + 1).setValue("https://lh3.googleusercontent.com/d/" + driveId);
        sheet.getRange(rowIndex, inventoryHeaders.indexOf("tipo_mime") + 1).setValue(file.getMimeType());
        SpreadsheetApp.flush();
        const persisted = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
        getReplacedImageRecordIdentity_(persisted, inventoryHeaders, true);
        if (String(persisted[0] || "") !== newId || String(persisted[10] || "") !== "historica") throw new Error("No se confirmó la identidad y el estado del nuevo registro histórico.");
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
    const schema = getReplacedImagesReadSchema_();
    if (!schema.sheet) return { status: "success", data: [], review: [], schemaStatus: "not_initialized", missingHeaders: schema.missingHeaders, referenceCheckStatus: "unavailable", duplicateDriveIdCount: 0 };
    const headers = schema.headers, rows = schema.sheet.getDataRange().getValues();
    const columnIndex = name => headers.indexOf(name), valueAt = (row, name) => { const index = columnIndex(name); return index >= 0 ? row[index] : ""; };
    let referenceSnapshot = null, referenceCheckStatus = "unavailable";
    try { referenceSnapshot = collectActiveDriveReferences(true); referenceCheckStatus = referenceSnapshot.unverifiableReferenceCount > 0 ? "unverifiable" : "verified"; }
    catch (error) { referenceCheckStatus = "unavailable"; }
    const idCounts = new Map(), idRows = new Map();
    for (let r = 1; r < rows.length; r++) {
        const id = String(rows[r][0] || "").trim(); if (!id) continue;
        idCounts.set(id, (idCounts.get(id) || 0) + 1);
        if (!idRows.has(id)) idRows.set(id, []);
        idRows.get(id).push(r + 1);
    }
    const duplicateDriveGroups = getDuplicateDriveImageRows_(rows);
    const duplicateDriveRows = new Map(duplicateDriveGroups.map(group => [group.fileId, group.rowNumbers]));
    const data = [], review = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r]; if (!row.some(value => String(value == null ? "" : value).trim() !== "")) continue;
        const id = String(row[0] || "").trim();
        const rawIds = new Set([].concat(extractDriveFileIds(row[5]), extractDriveFileIds(row[7])));
        const rawDriveId = rawIds.size === 1 ? Array.from(rawIds)[0] : "";
        const reviewEntry = { rowNumber: r + 1, id_reemplazo: id || "Sin ID", nombre_archivo: String(row[6] || "").slice(0, 180),
            estado: String(row[10] || "Sin estado"), driveFileId: rawDriveId, reason: "" };
        let type = "", status = "", driveId = "";
        try {
            if (!id) throw new Error("Fila con datos pero sin id_reemplazo.");
            if (idCounts.get(id) !== 1) throw new Error("id_reemplazo duplicado; no se habilitan acciones para ninguna fila coincidente.");
            type = getReplacedImageRecordType(row, headers);
            status = String(row[10] || (type === "sin_uso_detectado" ? "sin_uso_detectado" : "historica")).trim();
            if (!isKnownReplacedImageStatus_(type, status)) throw new Error("Estado histórico desconocido o incompatible con el tipo de registro.");
            driveId = getReplacedImageRecordIdentity_(row, headers, schema.missingHeaders.length === 0);
            if (duplicateDriveRows.has(driveId)) throw new Error("Drive ID duplicado en las filas " + duplicateDriveRows.get(driveId).join(", ") + "; se bloquearon las acciones y se requiere reconciliación manual.");
        } catch (error) {
            reviewEntry.reason = String(error && error.message || "Registro inválido.");
            const duplicateRowsForDriveId = duplicateDriveGroups
                .filter(group => group.rowNumbers.includes(r + 1))
                .flatMap(group => group.rowNumbers);
            const duplicateRowsForRecordId = id && idRows.get(id) && idRows.get(id).length > 1 ? idRows.get(id) : [];
            const rowsToReconcile = Array.from(new Set([...duplicateRowsForDriveId, ...duplicateRowsForRecordId])).sort((a,b)=>a-b);
            if (rowsToReconcile.length > 1) reviewEntry.duplicateRowNumbers = rowsToReconcile;
            reviewEntry.reconciliationUrl = getReplacedImageReconciliationUrl_(schema.sheet, rowsToReconcile.length ? rowsToReconcile : [r + 1]);
            review.push(reviewEntry); continue;
        }
        const activeReferences = referenceSnapshot && referenceSnapshot.references.get(driveId);
        data.push({ id_reemplazo: id, fecha_reemplazo: row[1], tipo_contenido: row[2], registro_id: row[3], campo: row[4],
            archivo_drive_id: row[5], nombre_archivo: row[6], url_anterior: row[7], sustituida_por_url: row[8], referencia_texto: row[9],
            estado: status, origen_registro: valueAt(row, "origen_registro") || "reemplazo", tipo_registro: type,
            tipo_mime: valueAt(row, "tipo_mime"), ubicacion_original: valueAt(row, "ubicacion_original"),
            fecha_creacion_drive: valueAt(row, "fecha_creacion_drive"), fecha_deteccion: valueAt(row, "fecha_deteccion"),
            url_visualizacion: valueAt(row, "url_visualizacion"), ubicacion_actual: valueAt(row, "ubicacion_actual"),
            ultima_auditoria_id: valueAt(row, "ultima_auditoria_id"), estado_previo_papelera: valueAt(row, "estado_previo_papelera"),
            estado_organizacion: valueAt(row, "estado_organizacion"), error_organizacion: valueAt(row, "error_organizacion"),
            fecha_organizacion: valueAt(row, "fecha_organizacion"), reference_check_status: referenceCheckStatus,
            active_reference_count: Array.isArray(activeReferences) ? activeReferences.length : activeReferences ? 1 : 0 });
    }
    const warnings = [];
    if (schema.missingHeaders.length) warnings.push("El esquema requiere migración coordinada: " + schema.missingHeaders.join(", "));
    if (referenceCheckStatus !== "verified") warnings.push("No se pudo confirmar completamente el estado de referencias activas en todas las hojas del Spreadsheet.");
    if (duplicateDriveGroups.length) warnings.push("Se detectaron " + duplicateDriveGroups.length + " IDs de Drive duplicados. Las filas afectadas no habilitan acciones; usa el enlace de reconciliación para revisar la hoja.");
    logMessage && logMessage("Historial e inventario de imágenes", "Se consultaron " + data.length + " registros válidos y se enviaron " + review.length + " filas a revisión; " + duplicateDriveGroups.length + " grupos de Drive duplicados.");
    return { status: "success", data: data.reverse(), review, schemaStatus: schema.missingHeaders.length ? "migration_required" : "ready",
        missingHeaders: schema.missingHeaders, referenceCheckStatus, warnings, duplicateDriveIdCount: duplicateDriveGroups.length };
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
    const idReemplazo=String(payload&&payload.id_reemplazo||"").trim();
    if(!idReemplazo)throw new Error("ID de reemplazo requerido.");
    const lock=LockService.getScriptLock();
    try{lock.waitLock(30000);}catch(e){throw new Error("No se pudo bloquear la restauración. Intenta nuevamente.");}
    try{
        const sheetRep=getOrCreateReplacedImagesSheet(),inventoryHeaders=ensureReplacedImagesInventoryColumns(sheetRep);
        const existing=findReplacedImageRecordById(sheetRep,idReemplazo);
        if(!existing)throw new Error("Registro de imagen reemplazada no encontrado.");
        const repRowIndex=existing.rowIndex,repData=existing.values,recordType=getReplacedImageRecordType(repData,inventoryHeaders);
        if(recordType!=="reemplazada")throw new Error("Esta imagen no tiene una relación de reemplazo que permita restaurarla.");
        const previousHistoryStatus=String(repData[10]||"historica").trim();
        if(!["historica","restablecida"].includes(previousHistoryStatus))throw new Error("El estado «"+previousHistoryStatus+"» no permite restaurar automáticamente. Requiere una revisión o acción específica.");
        const tipoContenido=String(repData[2]||"").trim().toLowerCase();
        if(tipoContenido!=="vehiculo")throw new Error("Tipo de contenido no compatible. La restauración está limitada a imágenes de vehículos en Cortes.");
        const registroId=String(repData[3]||"").trim(),campo=String(repData[4]||"").trim();
        const imageFields=new Set(["imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"]);
        if(!registroId||!imageFields.has(campo)||!COLS_CORTES[campo])throw new Error("El registro histórico no identifica un vehículo y un campo de imagen admitidos.");
        const driveId=getReplacedImageRecordIdentity_(repData,inventoryHeaders,true),urlHistorica=String(repData[7]||"").trim();
        const file=DriveApp.getFileById(driveId);
        if(!String(file.getMimeType()||"").startsWith("image/"))throw new Error("El archivo histórico no es una imagen y no puede restaurarse.");
        if(file.isTrashed())throw new Error("El archivo está en papelera pero el historial no está en estado en_papelera. Requiere revisión; no se restaurará automáticamente.");
        const rootFolder=getCortesRootFolder();
        if(!isFileInsideCortes(file,rootFolder.getId()))throw new Error("El archivo histórico no pertenece al árbol autorizado de la carpeta «Cortes».");
        const cortesSheet=getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if(!cortesSheet||cortesSheet.getLastRow()<2)throw new Error("No se pudo localizar la hoja Cortes o no contiene vehículos.");
        const ids=cortesSheet.getRange(2,1,cortesSheet.getLastRow()-1,1).getValues().flat(),vehicleMatches=[];
        ids.forEach((id,index)=>{if(String(id).trim()===registroId)vehicleMatches.push(index+2);});
        if(vehicleMatches.length!==1)throw new Error(vehicleMatches.length?"El ID del vehículo está duplicado en Cortes; no se restauró ninguna fila.":"Vehículo ID '"+registroId+"' no encontrado en el catálogo.");
        const actualRow=vehicleMatches[0],activeCell=cortesSheet.getRange(actualRow,COLS_CORTES[campo]),currentActiveUrl=String(activeCell.getValue()||"").trim();
        if(currentActiveUrl&&extractDriveFileIds(currentActiveUrl).length!==1)throw new Error("La imagen activa actual no contiene un único ID de Drive reconocible.");
        const referenceSnapshot=collectActiveDriveReferences(true);
        if(referenceSnapshot.unverifiableReferenceCount>0)throw new Error("No se puede restaurar mientras existan referencias de Drive no interpretables en el Spreadsheet.");
        const conflicts=referenceSnapshot.references.get(driveId)||[];
        if(conflicts.some(reference=>reference.sheet!==SHEET_NAMES.CORTES||reference.row!==actualRow||reference.column!==COLS_CORTES[campo]))throw new Error("La imagen histórica ya está referenciada en otra ubicación de Cortes; no se duplicará su asociación.");
        if(currentActiveUrl===urlHistorica&&previousHistoryStatus==="restablecida")return {status:"success",message:"La imagen ya estaba activa y el historial confirma el estado restablecida.",restoredUrl:urlHistorica,unchanged:true};
        let swappedRecord=null;
        if(currentActiveUrl&&currentActiveUrl!==urlHistorica)swappedRecord=recordReplacedImage({tipoContenido:"vehiculo",registroId,campo,imagenAnteriorUrl:currentActiveUrl,sustituidaPorUrl:urlHistorica,nombreVehiculo:repData[9]||""});
        try{
            activeCell.setValue(urlHistorica);SpreadsheetApp.flush();
            if(String(activeCell.getValue()||"").trim()!==urlHistorica)throw new Error("La referencia activa no se confirmó por lectura posterior.");
            setReplacedImageHistoryStatusVerified_(sheetRep,repRowIndex,"restablecida");
        }catch(operationError){
            let rollbackFailed=false,rollbackErrorMessage="";
            try{restoreAdminImageActiveCell_(activeCell,currentActiveUrl);}catch(error){rollbackFailed=true;rollbackErrorMessage=error.message||String(error);}
            try{setReplacedImageHistoryStatusVerified_(sheetRep,repRowIndex,rollbackFailed?"requiere_revision":previousHistoryStatus);}
            catch(error){rollbackFailed=true;rollbackErrorMessage+=(rollbackErrorMessage?"; ":"")+"No se pudo restaurar/verificar el estado histórico: "+(error.message||String(error));try{setReplacedImageHistoryStatusVerified_(sheetRep,repRowIndex,"requiere_revision");}catch(reviewError){}}
            if(swappedRecord){try{updateAdminImageReplacementHistoryStatus_(sheetRep,swappedRecord.rowIndex,rollbackFailed?"requiere_revision":"cancelada");}catch(error){rollbackFailed=true;rollbackErrorMessage+=(rollbackErrorMessage?"; ":"")+"No se pudo cerrar el registro de compensación: "+(error.message||String(error));}}
            if(rollbackFailed)throw new Error("Falló la restauración y su compensación no pudo confirmarse completamente: "+(operationError.message||String(operationError))+"; "+rollbackErrorMessage);
            throw operationError;
        }
        logMessage&&logMessage("Imágenes Reemplazadas","Imagen histórica restaurada para el vehículo '"+registroId+"', campo '"+campo+"'.");
        return {status:"success",message:"La imagen histórica quedó activa y la versión anterior se conservó en el historial.",restoredUrl:urlHistorica};
    }finally{lock.releaseLock();}
}
function recordImageAdministrationActivity(developerContext, activityType, associatedId, details) {
    try {
        if (!developerContext || !developerContext.userId) return false;
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
        return true;
    } catch (error) {
        Logger.log("No se pudo registrar la acción de administración de imágenes: " + error.message);
        return false;
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
function handleDeleteReplacedImage(payload,logMessage,developerContext){
    const idReemplazo=String(payload&&payload.id_reemplazo||"").trim();if(!idReemplazo)throw new Error("ID de registro de imagen requerido.");
    const lock=LockService.getScriptLock();try{lock.waitLock(30000);}catch(e){throw new Error("No se pudo bloquear la validación de uso de la imagen. Intenta nuevamente.");}
    try{
        const sheetRep=getOrCreateReplacedImagesSheet(),headers=ensureReplacedImagesInventoryColumns(sheetRep);
        const existing=findReplacedImageRecordById(sheetRep,idReemplazo);if(!existing)throw new Error("Registro de imagen no encontrado.");
        const rowIndex=existing.rowIndex,row=existing.values,type=getReplacedImageRecordType(row,headers);
        const status=String(row[10]||(type==="sin_uso_detectado"?"sin_uso_detectado":"historica"));
        const driveId=getReplacedImageRecordIdentity_(row,headers,true);
        if(status==="en_papelera"){
            const alreadyTrashed=DriveApp.getFileById(driveId);
            if(alreadyTrashed.isTrashed()&&String(alreadyTrashed.getMimeType()||"").startsWith("image/"))return {status:"success",message:"La imagen ya estaba en papelera.",unchanged:true};
            throw new Error("El historial indica en_papelera, pero Drive no confirma ese estado; requiere revisión.");
        }
        const allowed=type==="sin_uso_detectado"?["sin_uso_detectado","requiere_revision"]:["historica","restablecida","requiere_revision"];
        if(!isKnownReplacedImageStatus_(type,status)||!allowed.includes(status))throw new Error("El estado del registro no permite enviar esta imagen a papelera.");
        const references=collectActiveDriveReferences(),active=references.references.get(driveId)||[];
        if(active.length)throw new Error("Operación bloqueada: la imagen mantiene referencias activas en una o más hojas del Spreadsheet.");
        if(references.unverifiableReferenceCount>0)throw new Error("Operación bloqueada: existen referencias de Drive no interpretables en el Spreadsheet.");
        const file=DriveApp.getFileById(driveId);if(file.isTrashed())throw new Error("La imagen ya se encuentra en la papelera de Google Drive.");
        if(!String(file.getMimeType()||"").startsWith("image/"))throw new Error("El archivo asociado al registro no es una imagen.");
        const root=getCortesRootFolder(),source=getSingleParentFolderInsideCortes(file,root.getId()),sourcePath=getFolderPathInsideCortes(source,root.getId());
        setReplacedImageTrashPreviousStatusVerified_(sheetRep,rowIndex,headers,status);
        try{
            file.setTrashed(true);
            if(file.isTrashed()!==true)throw new Error("Drive no confirmó el traslado del archivo a papelera.");
            setReplacedImageHistoryStatusVerified_(sheetRep,rowIndex,"en_papelera");
        }catch(operationError){
            let rollbackError=null;
            try{
                if(file.isTrashed()){file.setTrashed(false);if(file.isTrashed()!==false)throw new Error("Drive no confirmó la restauración del archivo.");}
                setReplacedImageHistoryStatusVerified_(sheetRep,rowIndex,status);
            }catch(error){
                rollbackError=error;
                try{setReplacedImageHistoryStatusVerified_(sheetRep,rowIndex,"requiere_revision");}catch(reviewError){}
            }
            if(rollbackError)throw new Error("Falló el traslado a papelera y no se confirmó la compensación: "+operationError.message+"; "+rollbackError.message);
            throw new Error("No se pudo completar el traslado a papelera; la operación fue revertida: "+operationError.message);
        }
        recordImageAdministrationActivity(developerContext,"admin_image_trash",idReemplazo,"Imagen "+file.getName()+" enviada a papelera desde "+sourcePath+"; estado previo: "+status+"; resultado: correcto.");
        logMessage&&logMessage("Inventario e historial de imágenes","La imagen "+driveId+" fue enviada a la papelera de Google Drive.");
        return {status:"success",message:"La imagen fue enviada a la papelera de Google Drive. Esta acción no equivale a una eliminación irreversible."};
    }finally{lock.releaseLock();}
}
function handleRestoreReplacedImageFromTrash(payload,logMessage,developerContext){
    const id=String(payload&&payload.id_reemplazo||"").trim();if(!id)throw new Error("ID de registro de imagen requerido.");
    const lock=LockService.getScriptLock();try{lock.waitLock(30000);}catch(error){throw new Error("No se pudo bloquear la restauración desde papelera. Intenta nuevamente.");}
    try{
        const sheet=getOrCreateReplacedImagesSheet(),headers=ensureReplacedImagesInventoryColumns(sheet);
        const existing=findReplacedImageRecordById(sheet,id);if(!existing)throw new Error("Registro de imagen no encontrado.");
        const row=existing.values,type=getReplacedImageRecordType(row,headers),status=String(row[10]||"");
        const driveId=getReplacedImageRecordIdentity_(row,headers,true),previousIndex=headers.indexOf("estado_previo_papelera");
        const fallback=type==="sin_uso_detectado"?"sin_uso_detectado":"historica";
        const previous=String(previousIndex>=0?row[previousIndex]||"": "").trim()||fallback;
        const allowed=type==="sin_uso_detectado"?["sin_uso_detectado","requiere_revision","no_confirmada_en_ultima_auditoria"]:["historica","restablecida","requiere_revision"];
        if(!allowed.includes(previous))throw new Error("El estado previo a papelera no es válido para este tipo de registro; requiere revisión.");
        const file=DriveApp.getFileById(driveId);
        if(status===previous&&!file.isTrashed()&&String(file.getMimeType()||"").startsWith("image/"))return {status:"success",message:"La imagen ya estaba restaurada desde papelera.",unchanged:true};
        if(!["en_papelera","requiere_revision"].includes(status))throw new Error("Solo se pueden restaurar desde Drive registros en_papelera o requiere_revision.");
        if(!file.isTrashed())throw new Error("Drive indica que el archivo no está en papelera; se requiere reconciliar el historial.");
        if(!String(file.getMimeType()||"").startsWith("image/"))throw new Error("El archivo asociado al registro ya no es una imagen.");
        const root=getCortesRootFolder(),parent=getSingleParentFolderInsideCortes(file,root.getId()),path=getFolderPathInsideCortes(parent,root.getId());
        file.setTrashed(false);
        try{
            if(file.isTrashed()!==false)throw new Error("Drive no confirmó la restauración del archivo.");
            setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,previous);
        }catch(operationError){
            let rollbackError=null;
            try{file.setTrashed(true);if(file.isTrashed()!==true)throw new Error("Drive no confirmó el retorno a papelera.");setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"en_papelera");}
            catch(error){rollbackError=error;try{setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"requiere_revision");}catch(reviewError){}}
            if(rollbackError)throw new Error("Falló la actualización del historial y no se confirmó la compensación: "+operationError.message+"; "+rollbackError.message);
            throw new Error("No se pudo actualizar el historial; el archivo fue devuelto a papelera: "+operationError.message);
        }
        recordImageAdministrationActivity(developerContext,"admin_image_restore_from_trash",id,"Imagen "+file.getName()+" restaurada desde papelera a "+path+"; estado anterior recuperado: "+previous+".");
        logMessage&&logMessage("Inventario e historial de imágenes","La imagen "+driveId+" fue restaurada desde papelera.");
        return {status:"success",message:"La imagen fue restaurada desde la papelera de Google Drive. No se modificó ninguna referencia del Spreadsheet."};
    }finally{lock.releaseLock();}
}

function requestAdminDriveFile_(fileId,method){
    const query=method==="get"?"?supportsAllDrives=true&fields=id,name,mimeType,trashed,parents":"?supportsAllDrives=true";
    const url="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId)+query;
    const response=UrlFetchApp.fetch(url,{method,headers:{Authorization:"Bearer "+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
    const code=response.getResponseCode();let body={};
    if(code>=200&&code<300){try{body=JSON.parse(response.getContentText()||"{}");}catch(error){throw new Error("Drive API devolvió una respuesta JSON inválida.");}}
    return {code,body};
}

function handlePermanentlyDeleteReplacedImage(payload,logMessage,developerContext){
    const id=String(payload&&payload.id_reemplazo||"").trim();if(!id)throw new Error("ID de registro de imagen requerido.");
    const lock=LockService.getScriptLock();try{lock.waitLock(30000);}catch(error){throw new Error("No se pudo bloquear la eliminación definitiva. Intenta nuevamente.");}
    try{
        const sheet=getOrCreateReplacedImagesSheet(),headers=ensureReplacedImagesInventoryColumns(sheet);
        const existing=findReplacedImageRecordById(sheet,id);if(!existing)throw new Error("Registro de imagen no encontrado.");
        const row=existing.values,type=getReplacedImageRecordType(row,headers),status=String(row[10]||"");
        const driveId=getReplacedImageRecordIdentity_(row,headers,true);
        if(status==="eliminada")return {status:"success",message:"La imagen ya estaba eliminada definitivamente.",unchanged:true};
        if(!["en_papelera","eliminacion_pendiente","requiere_revision"].includes(status))throw new Error("La eliminación definitiva requiere un registro en papelera o requiere_revision.");
        const references=collectActiveDriveReferences(),active=references.references.get(driveId)||[];
        if(active.length)throw new Error("Eliminación bloqueada: la imagen tiene referencias activas en el Spreadsheet.");
        if(references.unverifiableReferenceCount>0)throw new Error("Eliminación bloqueada: existen referencias de Drive no interpretables en el Spreadsheet.");
        const current=requestAdminDriveFile_(driveId,"get");
        if(current.code===404){
            setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"eliminada");
            recordImageAdministrationActivity(developerContext,"admin_image_permanent_delete",id,"Drive confirmó que la imagen ya no existe; se reconcilió el historial como eliminada.");
            return {status:"success",message:"La imagen ya no existe en Drive y el historial quedó reconciliado como eliminada.",reconciled:true};
        }
        if(current.code<200||current.code>=300)throw new Error("No se pudo verificar el archivo en Drive API (HTTP "+current.code+").");
        if(!String(current.body.mimeType||"").startsWith("image/"))throw new Error("El archivo asociado al registro no es una imagen.");
        if(current.body.trashed!==true)throw new Error("El archivo ya no está en papelera; se bloqueó la eliminación definitiva.");
        const file=DriveApp.getFileById(driveId);
        if(!file.isTrashed())throw new Error("DriveApp no confirma que el archivo esté en papelera.");
        const root=getCortesRootFolder();getSingleParentFolderInsideCortes(file,root.getId());
        if(status!=="eliminacion_pendiente")setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"eliminacion_pendiente");
        const deletion=requestAdminDriveFile_(driveId,"delete");
        if(deletion.code!==404&&(deletion.code<200||deletion.code>=300)){
            try{setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,status);}
            catch(statusError){try{setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"requiere_revision");}catch(reviewError){}}
            throw new Error("Drive API no confirmó la eliminación definitiva (HTTP "+deletion.code+").");
        }
        const verification=requestAdminDriveFile_(driveId,"get");
        if(verification.code!==404)throw new Error("La eliminación fue solicitada, pero Drive no confirmó la ausencia del archivo. El registro queda eliminacion_pendiente para reconciliación.");
        setReplacedImageHistoryStatusVerified_(sheet,existing.rowIndex,"eliminada");
        recordImageAdministrationActivity(developerContext,"admin_image_permanent_delete",id,"Imagen "+driveId+" eliminada definitivamente y ausencia confirmada por Drive API.");
        logMessage&&logMessage("Inventario e historial de imágenes","La imagen "+driveId+" fue eliminada definitivamente.");
        return {status:"success",message:"La imagen fue eliminada definitivamente de Google Drive y la ausencia del archivo fue verificada."};
    }finally{lock.releaseLock();}
}

function handleMarkReplacedImageInUse(payload, logMessage, developerContext) {
    const id = String(payload && payload.id_reemplazo || "").trim();
    if (!id) throw new Error("ID de registro de imagen requerido.");
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (error) { throw new Error("No se pudo bloquear la protección de la imagen. Intenta nuevamente."); }
    try {
        const sheet = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheet);
        const existing = findReplacedImageRecordById(sheet, id);
        if (!existing) throw new Error("Registro de imagen no encontrado.");
        const row = existing.values, type = getReplacedImageRecordType(row, headers);
        if (String(row[10] || "") !== "requiere_revision") throw new Error("Solo se pueden marcar en uso los registros que requieren revisión.");
        const driveId = getReplacedImageRecordIdentity_(row, headers, true);
        const file = DriveApp.getFileById(driveId);
        if (file.isTrashed()) throw new Error("La imagen está en papelera. Restáurala antes de marcarla en uso.");
        if (!String(file.getMimeType() || "").startsWith("image/")) throw new Error("El archivo asociado ya no es una imagen.");
        const root = getCortesRootFolder();
        getSingleParentFolderInsideCortes(file, root.getId());
        setReplacedImageHistoryStatusVerified_(sheet, existing.rowIndex, "en_uso");
        recordImageAdministrationActivity(developerContext, "admin_image_mark_in_use", id,
            "Imagen " + file.getName() + " marcada manualmente en uso; se excluye de organización y eliminación automáticas.");
        logMessage && logMessage("Protección de imágenes", "La imagen quedó marcada en uso y protegida frente a la organización automática.");
        return { status: "success", message: "La imagen quedó marcada en uso y protegida frente a la organización automática." };
    } finally { lock.releaseLock(); }
}

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
        const existing = findReplacedImageRecordById(sheet, String(idReemplazo).trim());
        if (!existing) throw new Error("Registro de imagen no encontrado.");
        const rowIndex = existing.rowIndex;
        const row = existing.values;
        const column = name => headers.indexOf(name);
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

        const driveId = getReplacedImageRecordIdentity_(row, headers, true);
        if (!driveId) throw new Error("El registro no contiene un ID de Drive válido.");
        const referenceSnapshot = collectActiveDriveReferences();
        if (referenceSnapshot.references.has(driveId)) {
            throw new Error("Operación bloqueada: la imagen tiene referencias activas en una o más hojas del Spreadsheet.");
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
function handleGetReplacedImageDownloadUrl(payload,logMessage,developerContext){
    const idReemplazo=String(payload&&payload.id_reemplazo||"").trim();if(!idReemplazo)throw new Error("ID de registro de imagen requerido.");
    const schema=getReplacedImagesReadSchema_();if(!schema.sheet)throw new Error("El historial de imágenes no está inicializado.");
    if(schema.missingHeaders.length)throw new Error("El esquema del historial requiere migración coordinada antes de descargar archivos.");
    const existing=findReplacedImageRecordById(schema.sheet,idReemplazo);if(!existing)throw new Error("Registro de imagen no encontrado.");
    const row=existing.values,type=getReplacedImageRecordType(row,schema.headers),status=String(row[10]||(type==="sin_uso_detectado"?"sin_uso_detectado":"historica"));
    if(!isKnownReplacedImageStatus_(type,status)||(type==="sin_uso_detectado"&&status!=="sin_uso_detectado")||(type==="reemplazada"&&!["historica","restablecida"].includes(status)))throw new Error("El estado del registro no permite descargar esta imagen.");
    const driveId=getReplacedImageRecordIdentity_(row,schema.headers,true),references=collectActiveDriveReferences(false);
    if(references.unverifiableReferenceCount>0||references.references.has(driveId))throw new Error("La descarga está bloqueada porque no se pudo confirmar que la imagen siga sin uso en el Spreadsheet.");
    const file=DriveApp.getFileById(driveId);if(file.isTrashed())throw new Error("La imagen está en la papelera de Google Drive.");
    if(!String(file.getMimeType()||"").startsWith("image/"))throw new Error("El archivo asociado al registro ya no es una imagen.");
    const root=getCortesRootFolder(),parent=getSingleParentFolderInsideCortes(file,root.getId());
    const downloadUrl="https://drive.google.com/uc?export=download&id="+encodeURIComponent(driveId),folderPath=getFolderPathInsideCortes(parent,root.getId());
    recordImageAdministrationActivity(developerContext,"admin_image_download_link",idReemplazo,"Enlace de descarga generado para "+file.getName()+" desde "+folderPath+"; resultado: enlace preparado.");
    logMessage&&logMessage("Inventario e historial de imágenes","Se generó un enlace de descarga para "+driveId+".");
    return {status:"success",downloadUrl,fileName:file.getName()};
}

function getDriveAuditReferenceSnapshotConfig_() {
    return { maxLength: 750000, chunkSize: 75000, ttlSeconds: 21600,
        mimeType: "application/json; charset=utf-8", encoding: "utf-8", schemaVersion: 2 };
}
function cleanupExpiredDriveAuditServerStates_() {
    const properties = PropertiesService.getScriptProperties();
    const all = properties.getProperties();
    const now = Date.now();
    Object.keys(all).forEach(key => {
        if (!key.startsWith("GPSpedia_DRIVE_AUDIT_STATE_")) return;
        try {
            const state = JSON.parse(all[key]);
            const age = now - Number(state && state.updatedAt);
            if (!Number.isFinite(age) || age > 21600000 || age < -60000) {
                clearExpiredDriveAuditCacheState_(state);
                properties.deleteProperty(key);
            }
        } catch (error) { properties.deleteProperty(key); }
    });
}
function clearExpiredDriveAuditCacheState_(state) {
    if (!state || !/^[0-9a-f-]{36}$/i.test(String(state.auditId || ""))) return;
    const cache = CacheService.getScriptCache(), keys = [];
    const pageCount = Number(state.pageCount);
    if (Number.isInteger(pageCount) && pageCount > 0 && pageCount <= 10000) {
        for (let i = 0; i < pageCount; i++) keys.push(getDriveAuditPageResultCacheKey_(state.auditId, i));
    }
    if (state.lastResponseCacheKey) keys.push(String(state.lastResponseCacheKey));
    for (let i = 0; i < 10; i++) keys.push("gp_audit_refs_" + state.auditId + "_" + i);
    keys.push("gp_audit_refs_" + state.auditId + "_manifest");
    for (let i = 0; i < keys.length; i += 100) cache.removeAll(keys.slice(i, i + 100));
    const owner = String(state.ownerId || "").trim();
    if (owner) {
        const latestKey = "GPSpedia_DRIVE_AUDIT_LATEST_" + hashDriveAuditValue_(owner).slice(0, 32);
        const properties = PropertiesService.getScriptProperties();
        if (properties.getProperty(latestKey) === state.auditId) properties.deleteProperty(latestKey);
    }
}
function getDriveAuditServerStateKey_(auditId) {
    const id = String(auditId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("ID de auditoría inválido.");
    return "GPSpedia_DRIVE_AUDIT_STATE_" + id;
}
function hashDriveAuditValue_(value) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
    return bytes.map(byte => ("0" + ((byte + 256) % 256).toString(16)).slice(-2)).join("");
}
function getDriveAuditCursorFingerprint_(cursor) {
    if (!cursor || !Array.isArray(cursor.stack) || !cursor.stack.length ||
        !/^[0-9a-f-]{36}$/i.test(String(cursor.referenceCacheId || ""))) {
        throw new Error("Cursor de auditoría inválido o incompleto.");
    }
    return hashDriveAuditValue_(JSON.stringify({
        stack: cursor.stack, referenceCacheId: String(cursor.referenceCacheId),
        scanVersion: String(cursor.scanVersion || "")
    }));
}
function normalizeDriveAuditFileIds_(files) {
    if (!Array.isArray(files)) throw new Error("La lista de imágenes de auditoría no es válida.");
    const ids = new Set();
    files.forEach(item => {
        const id = String(item && typeof item === "object" ? item.fileId || "" : item || "").trim();
        if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) throw new Error("La auditoría contiene un ID de Drive inválido.");
        ids.add(id);
    });
    return Array.from(ids).sort();
}
function hashDriveAuditFileIds_(files) {
    return hashDriveAuditValue_(JSON.stringify(normalizeDriveAuditFileIds_(files)));
}
function saveDriveAuditServerState_(state) {
    if (!state || !state.auditId || !state.ownerId) throw new Error("No se puede guardar un estado de auditoría sin identidad.");
    const stored = Object.assign({}, state, { updatedAt: Date.now() });
    const serialized = JSON.stringify(stored);
    if (serialized.length > 8000) throw new Error("El estado de auditoría supera el límite seguro de persistencia.");
    const properties = PropertiesService.getScriptProperties();
    const key = getDriveAuditServerStateKey_(stored.auditId);
    properties.setProperty(key, serialized);
    if (properties.getProperty(key) !== serialized) throw new Error("No se pudo verificar la persistencia del estado de auditoría.");
    return stored;
}
function loadDriveAuditServerState_(auditId) {
    const raw = PropertiesService.getScriptProperties().getProperty(getDriveAuditServerStateKey_(auditId));
    if (!raw) throw new Error("No existe un estado de auditoría vigente en el servidor. Inicia una auditoría nueva.");
    let state;
    try { state = JSON.parse(raw); } catch (error) { throw new Error("El estado de auditoría del servidor está corrupto."); }
    const age = Date.now() - Number(state && state.updatedAt);
    if (!state || state.auditId !== String(auditId) || !state.ownerId ||
        !Number.isFinite(age) || age < -60000 || age > 21600000) {
        throw new Error("El estado de auditoría expiró o no cumple su identidad. Inicia una auditoría nueva.");
    }
    return state;
}
function getDriveAuditPageResultCacheKey_(auditId, pageIndex) {
    return "gp_audit_unused_" + String(auditId) + "_" + String(pageIndex);
}
function getDriveAuditResponseCacheKey_(auditId, fingerprint) {
    return "gp_audit_response_" + String(auditId) + "_" + String(fingerprint);
}
function getDriveAuditSeenPageCacheKey_(auditId, pageIndex) {
    return getDriveAuditPageResultCacheKey_(auditId, pageIndex);
}
function storeDriveAuditSeenPage_(auditId, pageIndex, fileIds, folderIds) {
    const cache = CacheService.getScriptCache(), key = getDriveAuditSeenPageCacheKey_(auditId, pageIndex);
    const raw = cache.get(key);
    let unused = [];
    if (raw !== null) {
        let previous;
        try { previous = JSON.parse(raw); }
        catch (error) { throw new Error("La página de resultados no se pudo combinar con sus IDs procesados."); }
        if (Array.isArray(previous)) unused = previous;
        else if (previous && typeof previous === "object" && Array.isArray(previous.unused) &&
            Array.isArray(previous.files) && Array.isArray(previous.folders)) unused = previous.unused;
        else throw new Error("La página de resultados contiene una estructura incompleta; no se sobrescribió.");
    }
    const payload = { unused: normalizeDriveAuditFileIds_(unused),
        files: normalizeDriveAuditFileIds_(fileIds), folders: normalizeDriveAuditFileIds_(folderIds) };
    const serialized = JSON.stringify(payload);
    cache.put(key, serialized, 21600);
    if (cache.get(key) !== serialized) throw new Error("No se pudo verificar la página combinada de resultados e IDs procesados.");
}
function loadDriveAuditSeenIds_(auditId, pageCount) {
    if (!Number.isInteger(pageCount) || pageCount < 0) throw new Error("Cantidad de páginas de deduplicación inválida.");
    const cache = CacheService.getScriptCache(), files = new Set(), folders = new Set();
    for (let page = 0; page < pageCount; page++) {
        const key = getDriveAuditSeenPageCacheKey_(auditId, page), raw = cache.get(key);
        if (raw === null) throw new Error("Falta una página de IDs procesados; inicia una auditoría nueva para evitar duplicados.");
        let values;
        try { values = JSON.parse(raw); } catch (error) { throw new Error("Una página de IDs procesados está corrupta."); }
        if (!values || typeof values !== "object" || !Array.isArray(values.files) || !Array.isArray(values.folders) || !Array.isArray(values.unused)) throw new Error("Una página de IDs procesados tiene una estructura inválida.");
        normalizeDriveAuditFileIds_(values.files).forEach(id => files.add(id));
        normalizeDriveAuditFileIds_(values.folders).forEach(id => folders.add(id));
        normalizeDriveAuditFileIds_(values.unused);
        cache.put(key, raw, getDriveAuditReferenceSnapshotConfig_().ttlSeconds);
        if (cache.get(key) !== raw) throw new Error("No se pudo renovar la retención de una página de auditoría.");
    }
    return { fileIds: Array.from(files).sort(), folderIds: Array.from(folders).sort() };
}
function getDuplicateDriveImageRows_(rows) {
    const groups = new Map();
    (Array.isArray(rows) ? rows.slice(1) : []).forEach((row, index) => {
        const ids = new Set([].concat(extractDriveFileIds(row && row[5]), extractDriveFileIds(row && row[7])));
        ids.forEach(fileId => {
            if (!groups.has(fileId)) groups.set(fileId, new Set());
            groups.get(fileId).add(index + 2);
        });
    });
    return Array.from(groups.entries())
        .filter(entry => entry[1].size > 1)
        .map(entry => ({ fileId: entry[0], rowNumbers: Array.from(entry[1]).sort((a,b)=>a-b) }));
}
function getReplacedImageReconciliationUrl_(sheet, rowNumbers) {
    if (!sheet || !Array.isArray(rowNumbers) || !rowNumbers.length) return "";
    const validRows = rowNumbers.filter(row => Number.isInteger(row) && row >= 2);
    if (!validRows.length) return "";
    const first = Math.min.apply(null, validRows), last = Math.max.apply(null, validRows);
    const range = sheet.getRange(first, 1, last - first + 1, sheet.getLastColumn()).getA1Notation();
    return sheet.getParent().getUrl() + "#gid=" + sheet.getSheetId() + "&range=" + encodeURIComponent(range);
}
function buildVerifiedDriveVisualizationUrl_(fileId) {
    const id = String(fileId || "").trim();
    if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) throw new Error("ID de Drive inválido para la miniatura.");
    const url = "https://lh3.googleusercontent.com/d/" + id;
    const match = url.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})$/);
    if (!match || match[1] !== id) throw new Error("La URL de visualización no coincide con el ID de Drive.");
    return url;
}
function storeDriveAuditPageResults_(auditId, pageIndex, unusedFileIds) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error("Índice de página de auditoría inválido.");
    const serialized = JSON.stringify(normalizeDriveAuditFileIds_(unusedFileIds));
    const cache = CacheService.getScriptCache();
    const key = getDriveAuditPageResultCacheKey_(auditId, pageIndex);
    cache.put(key, serialized, 21600);
    if (cache.get(key) !== serialized) throw new Error("No se pudo verificar la persistencia de los resultados parciales de auditoría.");
}
function loadDriveAuditUnusedFileIds_(auditId, pageCount) {
    if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("La auditoría no contiene páginas verificables.");
    const cache = CacheService.getScriptCache();
    const ids = new Set();
    for (let page = 0; page < pageCount; page++) {
        const raw = cache.get(getDriveAuditPageResultCacheKey_(auditId, page));
        if (raw === null) throw new Error("Falta una página de resultados de auditoría; no se puede confirmar el inventario.");
        let values;
        try { values = JSON.parse(raw); } catch (error) { throw new Error("Una página de resultados de auditoría está corrupta."); }
        const unusedIds = Array.isArray(values) ? values : values && Array.isArray(values.unused) ? values.unused : null;
        if (!unusedIds) throw new Error("Una página de resultados de auditoría no tiene una estructura válida.");
        normalizeDriveAuditFileIds_(unusedIds).forEach(id => ids.add(id));
    }
    return Array.from(ids).sort();
}
function getLatestDriveAuditIdForUser_(ownerId) {
    const owner = String(ownerId || "").trim();
    if (!owner) throw new Error("No se pudo identificar la sesión Desarrollador de la auditoría.");
    const key = "GPSpedia_DRIVE_AUDIT_LATEST_" + hashDriveAuditValue_(owner).slice(0, 32);
    const auditId = String(PropertiesService.getScriptProperties().getProperty(key) || "").trim();
    if (!auditId) throw new Error("No existe una auditoría completa reciente para esta sesión. Ejecuta una auditoría nueva.");
    return auditId;
}
function validateCompletedDriveAudit_(auditId, ownerId, files) {
    const state = loadDriveAuditServerState_(auditId);
    if (state.ownerId !== String(ownerId || "").trim()) throw new Error("La auditoría pertenece a otra sesión Desarrollador.");
    if (state.status !== "complete" || !Number.isFinite(Number(state.completedAt))) {
        throw new Error("ADMIN no ha confirmado que la auditoría esté completa. No se modificó el inventario.");
    }
    if (Date.now() - Number(state.completedAt) > 21600000) throw new Error("La confirmación de auditoría expiró. Ejecuta una auditoría nueva.");
    const submittedIds = normalizeDriveAuditFileIds_(files);
    if (submittedIds.length !== Number(state.expectedUnusedCount) ||
        hashDriveAuditFileIds_(submittedIds) !== String(state.expectedUnusedDigest || "")) {
        throw new Error("La lista de imágenes no coincide con los resultados completos emitidos por ADMIN. No se modificó el inventario.");
    }
    return state;
}


function writeDriveInventoryRowVerified_(sheet, rowNumber, row, headers, fileId, auditId, operationId, expectedStatus, expectedResult, expectedOrganizationState, expectedLocation) {
    const operationColumn = headers.indexOf("ultima_operacion_inventario_id") + 1;
    const auditColumn = headers.indexOf("ultima_auditoria_id") + 1;
    const resultColumn = headers.indexOf("resultado_inventario") + 1;
    const detailColumn = headers.indexOf("detalle_resultado_inventario") + 1;
    const organizationColumn = headers.indexOf("estado_organizacion") + 1;
    const locationColumn = headers.indexOf("ubicacion_actual") + 1;
    const organizationErrorColumn = headers.indexOf("error_organizacion") + 1;
    if ([operationColumn, auditColumn, resultColumn, detailColumn, organizationColumn, locationColumn].some(column => column < 1)) {
        throw new Error("Faltan columnas para verificar la operación de inventario.");
    }
    const readBack = () => sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const matches = persisted => String(persisted[0] || "") === String(row[0] || "") &&
        extractDriveFileId(persisted[5]) === fileId &&
        String(persisted[auditColumn - 1] || "") === auditId &&
        String(persisted[operationColumn - 1] || "") === operationId &&
        String(persisted[resultColumn - 1] || "") === expectedResult &&
        String(persisted[10] || "") === expectedStatus &&
        (expectedOrganizationState === undefined || String(persisted[organizationColumn - 1] || "") === String(expectedOrganizationState)) &&
        (expectedLocation === undefined || String(persisted[locationColumn - 1] || "") === String(expectedLocation));
    const writeAndVerify = () => {
        sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
        SpreadsheetApp.flush();
        const persisted = readBack();
        if (!matches(persisted)) throw new Error("La lectura posterior no coincide con la escritura solicitada.");
        return persisted;
    };
    try { return writeAndVerify(); }
    catch (firstError) {
        try {
            const persisted = readBack();
            if (matches(persisted)) return persisted;
        } catch (readError) {}
        try { return writeAndVerify(); }
        catch (retryError) {
            let reviewError = "";
            try {
                const current = readBack();
                if (extractDriveFileId(current[5]) === fileId) {
                    current[10] = "requiere_revision";
                    current[organizationColumn - 1] = "requiere_revision";
                    current[resultColumn - 1] = "error";
                    current[detailColumn - 1] = "La escritura parcial no pudo reconciliarse: " +
                        String(retryError.message || retryError).slice(0, 500);
                    if (organizationErrorColumn > 0) current[organizationErrorColumn - 1] = "Escritura parcial no reconciliada; requiere revisión manual.";
                    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
                    SpreadsheetApp.flush();
                    const reviewed = readBack();
                    if (String(reviewed[10] || "") !== "requiere_revision" ||
                        String(reviewed[resultColumn - 1] || "") !== "error") {
                        throw new Error("No se pudo confirmar el estado requiere_revision.");
                    }
                }
            } catch (error) { reviewError = error.message || String(error); }
            throw new Error("La escritura del inventario no pudo confirmarse; el archivo no será organizado. " +
                (retryError.message || String(retryError)) + (reviewError ? "; revisión: " + reviewError : ""));
        }
    }
}

function validateAuditDriveReferenceSnapshot_(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
        !Array.isArray(snapshot.activeDriveIds) || !Array.isArray(snapshot.historicalDriveIds) ||
        !Number.isSafeInteger(Number(snapshot.unverifiableReferenceCount)) || Number(snapshot.unverifiableReferenceCount) < 0) {
        throw new Error("El contenido no cumple la estructura del snapshot de referencias.");
    }
    normalizeDriveAuditFileIds_(snapshot.activeDriveIds);
    normalizeDriveAuditFileIds_(snapshot.historicalDriveIds);
    if (snapshot.protectedDriveIds !== undefined) {
        if (!Array.isArray(snapshot.protectedDriveIds)) throw new Error("La lista de referencias protegidas no es válida.");
        normalizeDriveAuditFileIds_(snapshot.protectedDriveIds);
    }
    return true;
}
function removeAuditDriveReferenceSnapshotCache_(auditId) {
    const cache = CacheService.getScriptCache(), prefix = "gp_audit_refs_" + String(auditId);
    const keys = [];
    for (let i = 0; i < 10; i++) keys.push(prefix + "_" + i);
    keys.push(prefix + "_manifest");
    cache.removeAll(keys);
}
function storeAuditDriveReferenceSnapshot(auditId, snapshot, options) {
    const cache = CacheService.getScriptCache(), config = getDriveAuditReferenceSnapshotConfig_();
    const cachePrefix = "gp_audit_refs_" + String(auditId), manifestKey = cachePrefix + "_manifest", cacheKeys = [];
    let writeStarted = false;
    try {
        if (!/^[0-9a-f-]{36}$/i.test(String(auditId || ""))) throw new Error("ID de auditoría inválido.");
        if (cache.get(manifestKey) !== null) throw new Error("Ya existe un snapshot para esta auditoría; no se sobrescribió.");
        validateAuditDriveReferenceSnapshot_(snapshot);
        const serialized = JSON.stringify(snapshot);
        const byteLength = Utilities.newBlob(serialized, config.mimeType).getBytes().length;
        if (!serialized || serialized.length > config.maxLength || byteLength > config.maxLength) {
            throw new Error("El conjunto de referencias supera la capacidad temporal de 750,000 caracteres/bytes. No se clasificaron archivos.");
        }
        const chunkCount = Math.ceil(serialized.length / config.chunkSize);
        if (chunkCount < 1 || chunkCount > 10) throw new Error("La cantidad de bloques supera la capacidad temporal admitida.");
        const chunkHashes = [];
        writeStarted = true;
        for (let i = 0; i < chunkCount; i++) {
            const key = cachePrefix + "_" + i, chunk = serialized.slice(i * config.chunkSize, (i + 1) * config.chunkSize);
            const chunkBytes = Utilities.newBlob(chunk, config.mimeType).getBytes().length;
            if (!chunk || chunk.length > config.chunkSize || chunkBytes > config.chunkSize) throw new Error("El bloque temporal " + i + " supera el tamaño seguro de 75,000 bytes.");
            cache.put(key, chunk, config.ttlSeconds);
            if (cache.get(key) !== chunk) throw new Error("Google Apps Script no conservó íntegro el bloque temporal " + i + ".");
            cacheKeys.push(key);
            chunkHashes.push(hashDriveAuditValue_(chunk));
        }
        const now = Date.now(), createdAt = Number(options && options.createdAt) || now;
        const manifest = { schemaVersion: config.schemaVersion, chunkCount, length: serialized.length, byteLength,
            chunkSize: config.chunkSize, encoding: config.encoding, mimeType: config.mimeType,
            sha256: hashDriveAuditValue_(serialized), chunkHashes, createdAt, updatedAt: now, ttlSeconds: config.ttlSeconds };
        const manifestText = JSON.stringify(manifest);
        cache.put(manifestKey, manifestText, config.ttlSeconds);
        cacheKeys.push(manifestKey);
        if (cache.get(manifestKey) !== manifestText) throw new Error("No se pudo verificar el manifiesto temporal de auditoría.");
        for (let i = 0; i < chunkCount; i++) {
            const expectedChunk = serialized.slice(i * config.chunkSize, (i + 1) * config.chunkSize);
            if (cache.get(cachePrefix + "_" + i) !== expectedChunk) {
                throw new Error("Una página temporal fue desalojada al confirmar el manifiesto; el snapshot no quedó completo.");
            }
        }
        return manifest;
    } catch (error) {
        try { if (writeStarted) removeAuditDriveReferenceSnapshotCache_(auditId); }
        catch (cleanupError) { console.error("No se pudieron retirar todos los bloques temporales de auditoría:", cleanupError); }
        throw new Error("No se pudo conservar el estado temporal de la auditoría: " + error.message);
    }
}
function loadAuditDriveReferenceSnapshot(auditId) {
    const cache = CacheService.getScriptCache(), config = getDriveAuditReferenceSnapshotConfig_();
    const cachePrefix = "gp_audit_refs_" + String(auditId);
    try {
        if (!/^[0-9a-f-]{36}$/i.test(String(auditId || ""))) throw new Error("ID de auditoría inválido.");
        const manifestText = cache.get(cachePrefix + "_manifest");
        if (!manifestText) throw new Error("El manifiesto expiró o dejó de estar disponible.");
        const manifest = JSON.parse(manifestText), now = Date.now();
        const legacy = !!manifest && !manifest.schemaVersion && manifest.encoding === "json";
        const chunkSize = legacy ? config.chunkSize : Number(manifest && manifest.chunkSize);
        if (legacy) {
            if (!Number.isInteger(manifest.chunkCount) || manifest.chunkCount < 1 || manifest.chunkCount > 10 ||
                !Number.isInteger(manifest.length) || manifest.length < 1 || manifest.length > config.maxLength) {
                throw new Error("El manifiesto legado está incompleto o supera la capacidad admitida.");
            }
        } else {
            const age = now - Number(manifest && manifest.updatedAt);
            if (!manifest || manifest.schemaVersion !== config.schemaVersion ||
                !Number.isInteger(manifest.chunkCount) || manifest.chunkCount < 1 || manifest.chunkCount > 10 ||
                !Number.isInteger(manifest.length) || manifest.length < 1 || manifest.length > config.maxLength ||
                !Number.isInteger(manifest.byteLength) || manifest.byteLength < 1 || manifest.byteLength > config.maxLength ||
                manifest.chunkSize !== config.chunkSize || manifest.encoding !== config.encoding ||
                manifest.mimeType !== config.mimeType || manifest.ttlSeconds !== config.ttlSeconds ||
                !Array.isArray(manifest.chunkHashes) || manifest.chunkHashes.length !== manifest.chunkCount ||
                !/^[a-f0-9]{64}$/i.test(String(manifest.sha256 || "")) ||
                !Number.isFinite(age) || age < -60000 || age > config.ttlSeconds * 1000 ||
                !Number.isFinite(Number(manifest.createdAt)) || Number(manifest.createdAt) > now + 60000) {
                throw new Error("El manifiesto está incompleto, alterado o expiró.");
            }
        }
        if (!Number.isInteger(chunkSize) || chunkSize !== config.chunkSize ||
            Math.ceil(manifest.length / chunkSize) !== manifest.chunkCount) {
            throw new Error("La cantidad de bloques no coincide con la longitud declarada.");
        }
        let serialized = "", actualBytes = 0;
        for (let i = 0; i < manifest.chunkCount; i++) {
            const chunk = cache.get(cachePrefix + "_" + i);
            if (chunk === null || typeof chunk !== "string") throw new Error("Falta el bloque temporal " + i + ".");
            const expectedLength = Math.min(chunkSize, manifest.length - i * chunkSize);
            const chunkBytes = Utilities.newBlob(chunk, config.mimeType).getBytes().length;
            if (chunk.length !== expectedLength || chunkBytes > chunkSize ||
                (!legacy && hashDriveAuditValue_(chunk) !== manifest.chunkHashes[i])) {
                throw new Error("El bloque temporal " + i + " no coincide con su tamaño o firma.");
            }
            serialized += chunk;
            actualBytes += chunkBytes;
        }
        if (serialized.length !== manifest.length || actualBytes < 1 || actualBytes > config.maxLength ||
            (!legacy && (actualBytes !== manifest.byteLength || hashDriveAuditValue_(serialized) !== manifest.sha256))) {
            throw new Error("La longitud o la firma SHA-256 del snapshot no coincide con el manifiesto.");
        }
        const snapshot = JSON.parse(serialized);
        validateAuditDriveReferenceSnapshot_(snapshot);
        return snapshot;
    } catch (error) {
        try { removeAuditDriveReferenceSnapshotCache_(auditId); } catch (cleanupError) {}
        throw new Error("El estado temporal de la auditoría dejó de estar disponible: " + error.message + ". Inicia una auditoría nueva.");
    }
}
function refreshAuditDriveReferenceSnapshot_(auditId, snapshot) {
    const cache = CacheService.getScriptCache(), config = getDriveAuditReferenceSnapshotConfig_();
    const prefix = "gp_audit_refs_" + String(auditId), manifestKey = prefix + "_manifest";
    const previousManifestText = cache.get(manifestKey);
    if (!previousManifestText) throw new Error("El manifiesto expiró; inicia una auditoría nueva.");
    let manifest;
    try { manifest = JSON.parse(previousManifestText); }
    catch (error) { throw new Error("El manifiesto está corrupto; inicia una auditoría nueva."); }
    const legacy = !!manifest && !manifest.schemaVersion && manifest.encoding === "json";
    const chunkSize = legacy ? config.chunkSize : Number(manifest && manifest.chunkSize);
    const chunkCount = Number(manifest && manifest.chunkCount), length = Number(manifest && manifest.length);
    const serialized = JSON.stringify(snapshot);
    const byteLength = Utilities.newBlob(serialized, config.mimeType).getBytes().length;
    validateAuditDriveReferenceSnapshot_(snapshot);
    if (!Number.isInteger(chunkSize) || chunkSize !== config.chunkSize ||
        !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 10 ||
        !Number.isInteger(length) || length !== serialized.length || byteLength > config.maxLength ||
        Math.ceil(length / chunkSize) !== chunkCount) {
        throw new Error("El snapshot no coincide con el contenido o la capacidad guardada.");
    }
    if (!legacy && (manifest.schemaVersion !== config.schemaVersion ||
        manifest.byteLength !== byteLength || manifest.encoding !== config.encoding ||
        manifest.mimeType !== config.mimeType || manifest.ttlSeconds !== config.ttlSeconds ||
        hashDriveAuditValue_(serialized) !== manifest.sha256 ||
        !Array.isArray(manifest.chunkHashes) || manifest.chunkHashes.length !== chunkCount)) {
        throw new Error("La integridad del manifiesto no permite renovar el snapshot.");
    }
    const chunks = [];
    for (let i = 0; i < chunkCount; i++) {
        const expectedChunk = serialized.slice(i * chunkSize, (i + 1) * chunkSize);
        const cachedChunk = cache.get(prefix + "_" + i);
        if (cachedChunk !== expectedChunk || (!legacy && hashDriveAuditValue_(cachedChunk) !== manifest.chunkHashes[i])) {
            throw new Error("El bloque temporal " + i + " cambió antes de renovar su TTL.");
        }
        chunks.push(cachedChunk);
    }
    const now = Date.now();
    const renewedManifest = {
        schemaVersion: config.schemaVersion, chunkCount, length, byteLength, chunkSize,
        encoding: config.encoding, mimeType: config.mimeType,
        sha256: hashDriveAuditValue_(serialized),
        chunkHashes: chunks.map(chunk => hashDriveAuditValue_(chunk)),
        createdAt: Number(manifest.createdAt) || now, updatedAt: now, ttlSeconds: config.ttlSeconds
    };
    let manifestChanged = false;
    try {
        for (let i = 0; i < chunks.length; i++) {
            const key = prefix + "_" + i;
            cache.put(key, chunks[i], config.ttlSeconds);
            if (cache.get(key) !== chunks[i]) throw new Error("No se pudo renovar el bloque temporal " + i + ".");
        }
        if (cache.get(manifestKey) !== previousManifestText) throw new Error("El manifiesto cambió durante la renovación.");
        const renewedText = JSON.stringify(renewedManifest);
        cache.put(manifestKey, renewedText, config.ttlSeconds);
        if (cache.get(manifestKey) !== renewedText) throw new Error("No se pudo renovar el TTL del manifiesto.");
        manifestChanged = true;
        for (let i = 0; i < chunks.length; i++) {
            if (cache.get(prefix + "_" + i) !== chunks[i]) throw new Error("Una página expiró durante la renovación del snapshot.");
        }
        return renewedManifest;
    } catch (error) {
        try {
            if (manifestChanged || cache.get(manifestKey) !== previousManifestText) {
                cache.put(manifestKey, previousManifestText, config.ttlSeconds);
                if (cache.get(manifestKey) !== previousManifestText) throw new Error("No se pudo restaurar el manifiesto anterior.");
            }
        } catch (restoreError) {
            throw new Error((error.message || String(error)) + "; no se pudo restaurar el manifiesto anterior: " + restoreError.message);
        }
        throw error;
    }
}
function clearAuditDriveReferenceSnapshot(auditId) {
    removeAuditDriveReferenceSnapshotCache_(auditId);
}

/**
 * Registra de forma idempotente en Imagenes_Reemplazadas las imágenes sin uso
 * confirmadas por una auditoría completa. Cada archivo se vuelve a validar en servidor.
 */


function handleSaveUnusedImagesInventory(payload, logMessage, developerContext) {
    if (payload && payload.mode === "organize") {
        return handleOrganizeUnusedImagesBatch(payload, logMessage, developerContext);
    }
    const ownerId = String(developerContext && developerContext.userId || "").trim();
    if (!ownerId) throw new Error("El inventario requiere una sesión Desarrollador verificada.");
    const submittedFiles = Array.isArray(payload && payload.files) ? payload.files : [];
    const uniqueIds = normalizeDriveAuditFileIds_(submittedFiles);
    const uniqueFiles = uniqueIds.map(fileId => ({ fileId: fileId }));
    const auditId = String(payload && payload.auditId || getLatestDriveAuditIdForUser_(ownerId)).trim();

    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (e) { throw new Error("No se pudo bloquear la actualización del inventario. Intenta nuevamente."); }

    try {
        const auditState = validateCompletedDriveAudit_(auditId, ownerId, uniqueFiles);
        const submissionDigest = hashDriveAuditFileIds_(uniqueFiles);
        if (auditState.inventorySubmissionDigest && auditState.inventorySubmissionDigest !== submissionDigest) {
            throw new Error("La operación de inventario ya está vinculada a otra lista de archivos.");
        }
        if (!auditState.inventoryOperationId) {
            auditState.inventoryOperationId = Utilities.getUuid();
            auditState.inventorySubmissionDigest = submissionDigest;
            auditState.inventoryStatus = "processing";
            auditState.inventoryStartedAt = Date.now();
            saveDriveAuditServerState_(auditState);
        }
        const inventoryOperationId = auditState.inventoryOperationId;
        if (auditState.inventoryStatus === "complete" && auditState.inventorySummary) {
            return Object.assign({ status: "success", alreadyProcessed: true, auditId: auditId,
                inventoryOperationId: inventoryOperationId }, auditState.inventorySummary);
        }
        auditState.inventoryStatus = "processing";
        saveDriveAuditServerState_(auditState);

        let references = null, referenceScanError = "";
        try { references = collectActiveDriveReferences(false); }
        catch (error) { referenceScanError = error.message || String(error); }

        const rootFolder = getCortesRootFolder();
        const sheet = getOrCreateReplacedImagesSheet();
        const headers = ensureReplacedImagesInventoryColumns(sheet);
        const column = name => {
            const index = headers.indexOf(name);
            if (index < 0) throw new Error("Falta la columna requerida del inventario: " + name);
            return index + 1;
        };
        const rows = sheet.getDataRange().getValues();
        const duplicateRecordIds = getDuplicateReplacedImageIds_(rows);
        const inventoryRowsByDriveId = new Map();
        const historicalDriveIds = new Set();
        const manuallyProtectedDriveIds = new Set();
        const duplicateDriveIds = new Set();
        const ambiguousDriveIds = new Set();
        let historyIntegrityUncertain = false;

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row.some(value => String(value == null ? "" : value).trim() !== "")) continue;
            const recordId = String(row[0] || "").trim();
            const rawIds = new Set([].concat(extractDriveFileIds(row[5]), extractDriveFileIds(row[7])));
            if (!recordId) {
                historyIntegrityUncertain = true;
                rawIds.forEach(id => ambiguousDriveIds.add(id));
            }
            let driveId = "";
            try { driveId = getReplacedImageRecordIdentity_(row, headers, true); }
            catch (identityError) {
                historyIntegrityUncertain = true;
                rawIds.forEach(id => ambiguousDriveIds.add(id));
                continue;
            }
            const recordType = getReplacedImageRecordType(row, headers);
            const status = String(row[10] || (recordType === "sin_uso_detectado" ? "sin_uso_detectado" : "historica"));
            if (!isKnownReplacedImageStatus_(recordType, status)) {
                historyIntegrityUncertain = true;
                if (driveId) ambiguousDriveIds.add(driveId);
            }
            if (status === "en_uso") manuallyProtectedDriveIds.add(driveId);
            if (["requiere_revision", "eliminacion_pendiente", "en_papelera"].includes(status) && driveId) historicalDriveIds.add(driveId);
            if (duplicateRecordIds.has(recordId) && driveId) duplicateDriveIds.add(driveId);
            const origin = String(row[column("origen_registro") - 1] || "");
            if (origin === "auditoria_drive") {
                if (!inventoryRowsByDriveId.has(driveId)) inventoryRowsByDriveId.set(driveId, []);
                inventoryRowsByDriveId.get(driveId).push({ rowNumber: r + 1, row: row });
            } else if (recordType === "reemplazada" && status !== "eliminada") {
                historicalDriveIds.add(driveId);
            }
        }
        inventoryRowsByDriveId.forEach((records, fileId) => {
            if (records.length > 1) duplicateDriveIds.add(fileId);
        });

        let insertedCount = 0, updatedCount = 0, staleCount = 0;
        let confirmedCount = 0, blockedCount = 0, errorCount = 0, loggingErrorCount = 0;
        const results = [];
        const currentIds = new Set(uniqueIds);
        const recordOutcome = (fileId, status, message) => {
            results.push({ fileId: fileId, status: status, message: String(message || "") });
            if (status !== "confirmado") {
                const logged = recordImageAdministrationActivity(developerContext, "admin_image_inventory_result",
                    fileId, "Operación " + inventoryOperationId + "; auditoría " + auditId +
                    "; resultado " + status + "; " + String(message || ""));
                if (logged === false) loggingErrorCount++;
            }
        };

        uniqueFiles.forEach(item => {
            const fileId = item.fileId;
            try {
                if (auditState.unverifiableReferenceCount > 0) throw Object.assign(new Error("La auditoría detectó referencias no interpretables; el archivo no puede confirmarse como sin uso."), { inventoryStatus: "blocked" });
                if (referenceScanError) throw Object.assign(new Error("No se pudo revalidar el Spreadsheet: " + referenceScanError), { inventoryStatus: "blocked" });
                if (references.unverifiableReferenceCount > 0) throw Object.assign(new Error("Existen referencias de Drive que no pudieron verificarse en el Spreadsheet."), { inventoryStatus: "blocked" });
                if (references.references.has(fileId)) throw Object.assign(new Error("La imagen ahora tiene referencias activas."), { inventoryStatus: "blocked" });
                if (manuallyProtectedDriveIds.has(fileId)) throw Object.assign(new Error("La imagen está protegida porque el Desarrollador la marcó como en uso."), { inventoryStatus: "blocked" });
                if (historicalDriveIds.has(fileId)) throw Object.assign(new Error("La imagen pertenece a un historial de reemplazo no resuelto."), { inventoryStatus: "blocked" });
                if (duplicateDriveIds.has(fileId) || ambiguousDriveIds.has(fileId)) throw Object.assign(new Error("Hay registros duplicados o ambiguos para este ID de Drive; requiere revisión manual."), { inventoryStatus: "blocked" });

                const existingRecords = inventoryRowsByDriveId.get(fileId) || [];
                if (existingRecords.length > 1) throw Object.assign(new Error("Existen varias filas de inventario para el mismo archivo Drive."), { inventoryStatus: "blocked" });
                const existing = existingRecords[0] || null;
                const rowNumber = existing ? existing.rowNumber : 0;
                const previousRow = existing ? existing.row : [];
                const previousStatus = String(previousRow[10] || "");
                if (existing && !["sin_uso_detectado", "no_confirmada_en_ultima_auditoria"].includes(previousStatus)) {
                    throw Object.assign(new Error("El registro tiene un estado protegido o no elegible: " + previousStatus), { inventoryStatus: "blocked" });
                }
                if (existing &&
                    String(previousRow[column("ultima_operacion_inventario_id") - 1] || "") === inventoryOperationId &&
                    String(previousRow[column("resultado_inventario") - 1] || "") === "confirmado") {
                    confirmedCount++;
                    recordOutcome(fileId, "confirmado", "El resultado ya estaba confirmado para esta operación.");
                    return;
                }

                const file = DriveApp.getFileById(fileId);
                if (file.isTrashed()) throw Object.assign(new Error("El archivo está en la papelera de Google Drive."), { inventoryStatus: "blocked" });
                const mimeType = String(file.getMimeType() || "");
                if (!mimeType.startsWith("image/")) throw Object.assign(new Error("El archivo ya no es una imagen."), { inventoryStatus: "blocked" });
                const sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                const folderPath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());
                let createdAt = "";
                try {
                    const createdDate = file.getDateCreated();
                    if (createdDate) createdAt = Utilities.formatDate(createdDate, "GMT-6", "yyyy-MM-dd HH:mm:ss");
                } catch (dateError) {}

                const row = existing ? previousRow.slice(0, headers.length) : Array(headers.length).fill("");
                while (row.length < headers.length) row.push("");
                const setField = (name, value) => { row[column(name) - 1] = value; };
                if (!rowNumber) setField("id_reemplazo", "INV-" + fileId);
                setField("fecha_reemplazo", "");
                setField("tipo_contenido", "inventario_sin_uso");
                setField("tipo_registro", "sin_uso_detectado");
                setField("registro_id", "");
                setField("campo", "");
                setField("archivo_drive_id", fileId);
                setField("nombre_archivo", file.getName());
                setField("url_anterior", file.getUrl());
                setField("sustituida_por_url", "");
                setField("referencia_texto", folderPath || "Cortes");
                setField("estado", "sin_uso_detectado");
                setField("origen_registro", "auditoria_drive");
                setField("tipo_mime", mimeType);
                const previousOrganizationState = String(row[column("estado_organizacion") - 1] || "");
                const previousManualLocation = String(row[column("ubicacion_actual") - 1] || "");
                setField("ubicacion_original", String(row[column("ubicacion_original") - 1] || folderPath || "Cortes"));
                setField("fecha_creacion_drive", createdAt);
                setField("fecha_deteccion", Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss"));
                setField("url_visualizacion", buildVerifiedDriveVisualizationUrl_(fileId));
                setField("ubicacion_actual", previousOrganizationState === "movida_manual" && previousManualLocation
                    ? previousManualLocation : (folderPath || "Cortes"));
                setField("ultima_auditoria_id", auditId);
                setField("estado_organizacion", !previousOrganizationState || previousOrganizationState === "no_confirmada" ? "pendiente" : previousOrganizationState);
                setField("error_organizacion", "");
                setField("ultima_operacion_inventario_id", inventoryOperationId);
                setField("resultado_inventario", "confirmado");
                setField("detalle_resultado_inventario", previousOrganizationState === "movida_manual"
                    ? "Ubicación manual conservada: " + (previousManualLocation || folderPath || "No disponible") +
                        (previousManualLocation && previousManualLocation !== folderPath ? "; ubicación observada en Drive: " + folderPath : "")
                    : "");

                const targetRow = rowNumber || sheet.getLastRow() + 1;
                const persisted = writeDriveInventoryRowVerified_(sheet, targetRow, row, headers, fileId,
                    auditId, inventoryOperationId, "sin_uso_detectado", "confirmado");
                if (rowNumber) updatedCount++; else insertedCount++;
                inventoryRowsByDriveId.set(fileId, [{ rowNumber: targetRow, row: persisted }]);
                confirmedCount++;
                recordOutcome(fileId, "confirmado", "Imagen validada y registrada en el inventario.");
            } catch (error) {
                const status = error && error.inventoryStatus === "blocked" ? "bloqueado" : "error";
                if (status === "bloqueado") blockedCount++; else errorCount++;
                recordOutcome(fileId, status, error.message || String(error));
            }
        });

        if (auditState.unverifiableReferenceCount === 0 && !referenceScanError &&
            references && references.unverifiableReferenceCount === 0 && !historyIntegrityUncertain) {
            inventoryRowsByDriveId.forEach((records, fileId) => {
                if (currentIds.has(fileId) || records.length !== 1 || duplicateDriveIds.has(fileId) || ambiguousDriveIds.has(fileId)) return;
                const record = records[0];
                const row = record.row;
                if (String(row[10] || "") !== "sin_uso_detectado" ||
                    String(row[column("estado_organizacion") - 1] || "") === "movida_manual") return;
                try {
                    const staleRow = row.slice(0, headers.length);
                    staleRow[column("estado") - 1] = "no_confirmada_en_ultima_auditoria";
                    staleRow[column("ultima_auditoria_id") - 1] = auditId;
                    staleRow[column("ultima_operacion_inventario_id") - 1] = inventoryOperationId;
                    staleRow[column("resultado_inventario") - 1] = "no_confirmada";
                    staleRow[column("detalle_resultado_inventario") - 1] = "No apareció como imagen sin uso en la auditoría completa.";
                    staleRow[column("estado_organizacion") - 1] = "no_confirmada";
                    staleRow[column("error_organizacion") - 1] = "El archivo no apareció como imagen sin uso en la última auditoría completa.";
                    writeDriveInventoryRowVerified_(sheet, record.rowNumber, staleRow, headers, fileId,
                        auditId, inventoryOperationId, "no_confirmada_en_ultima_auditoria", "no_confirmada");
                    staleCount++;
                    results.push({ fileId: fileId, status: "no_confirmada", message: "No apareció como imagen sin uso en la auditoría completa." });
                } catch (error) {
                    errorCount++;
                    recordOutcome(fileId, "error", error.message || String(error));
                }
            });
        }

        const summary = {
            savedCount: confirmedCount, insertedCount: insertedCount, updatedCount: updatedCount,
            noLongerConfirmedCount: staleCount, blockedCount: blockedCount, errorCount: errorCount,
            loggingErrorCount: loggingErrorCount,
            staleUpdateSkipped: historyIntegrityUncertain || auditState.unverifiableReferenceCount > 0 ||
                !!referenceScanError || !!(references && references.unverifiableReferenceCount > 0),
            partial: blockedCount > 0 || errorCount > 0 || loggingErrorCount > 0 ||
                historyIntegrityUncertain || auditState.unverifiableReferenceCount > 0 ||
                !!referenceScanError || !!(references && references.unverifiableReferenceCount > 0)
        };
        auditState.inventoryStatus = summary.partial ? "partial" : "complete";
        auditState.inventorySummary = summary;
        auditState.inventoryCompletedAt = Date.now();
        saveDriveAuditServerState_(auditState);
        logMessage && logMessage("Inventario de imágenes",
            "Operación " + inventoryOperationId + ": " + confirmedCount + " confirmadas, " +
            blockedCount + " bloqueadas, " + errorCount + " con error y " + staleCount + " no confirmadas.");
        return Object.assign({ status: "success", auditId: auditId, inventoryOperationId: inventoryOperationId,
            results: results }, summary);
    } finally {
        lock.releaseLock();
    }
}



function handleOrganizeUnusedImagesBatch(payload, logMessage, developerContext) {
    const auditId = String(payload && payload.auditId || "").trim();
    const submittedFiles = Array.isArray(payload && payload.files) ? payload.files : [];
    if (!/^[0-9a-f-]{36}$/i.test(auditId)) throw new Error("ID de auditoría inválido para organizar imágenes.");
    if (!payload || payload.confirmed !== true) throw new Error("El movimiento requiere una confirmación explícita del Desarrollador.");
    const ownerId = String(developerContext && developerContext.userId || "").trim();
    const auditState = loadDriveAuditServerState_(auditId);
    if (!ownerId || auditState.ownerId !== ownerId || auditState.status !== "complete" ||
        !auditState.inventoryOperationId || !["partial", "complete"].includes(String(auditState.inventoryStatus || ""))) {
        throw new Error("La organización requiere una auditoría completa y una operación de inventario confirmada por ADMIN.");
    }
    const inventoryOperationId = String(auditState.inventoryOperationId);
    if (String(payload.inventoryOperationId || "") !== inventoryOperationId) {
        throw new Error("La operación de inventario no coincide con la confirmación emitida por ADMIN.");
    }
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
        const column = name => {
            const index = headers.indexOf(name);
            if (index < 0) throw new Error("Falta la columna requerida para organizar imágenes: " + name);
            return index + 1;
        };
        let destination = null, destinationPath = "";
        let movedCount = 0, alreadyOrganizedCount = 0, manualPreservedCount = 0;
        let failedCount = 0, blockedCount = 0, loggingErrorCount = 0;

        const logOutcome = (action, associatedId, details) => {
            const logged = recordImageAdministrationActivity(developerContext, action, associatedId, details);
            if (logged === false) loggingErrorCount++;
            return logged !== false;
        };
        const actualCortesPath = file => {
            try {
                const parents = file.getParents();
                const paths = [];
                while (parents.hasNext()) {
                    const parent = parents.next();
                    if (!parent.isTrashed() && isFolderInsideCortes(parent, rootFolder.getId())) {
                        paths.push(getFolderPathInsideCortes(parent, rootFolder.getId()));
                    }
                }
                return paths.length ? paths.join(" | ") : "Ubicación no verificable dentro de Cortes";
            } catch (error) { return "Ubicación no verificable dentro de Cortes"; }
        };

        fileIds.forEach(fileId => {
            let record = null, file = null, sourceFolder = null, sourcePath = "";
            let rowIndex = 0, recordId = "", row = [];
            try {
                const currentRows = sheet.getDataRange().getValues();
                const duplicateIds = getDuplicateReplacedImageIds_(currentRows);
                const inventoryMatches = [];
                let historyConflict = "", ambiguousIdentity = false;

                for (let r = 1; r < currentRows.length; r++) {
                    const candidateRow = currentRows[r];
                    if (!candidateRow.some(value => String(value == null ? "" : value).trim() !== "")) continue;
                    const rawIds = new Set([].concat(extractDriveFileIds(candidateRow[5]), extractDriveFileIds(candidateRow[7])));
                    let identity = "";
                    try { identity = getReplacedImageRecordIdentity_(candidateRow, headers, true); }
                    catch (identityError) {
                        if (rawIds.has(fileId)) ambiguousIdentity = true;
                        continue;
                    }
                    if (identity !== fileId) {
                        if (!identity && rawIds.has(fileId)) ambiguousIdentity = true;
                        continue;
                    }
                    const candidateOrigin = String(candidateRow[column("origen_registro") - 1] || "");
                    const candidateStatus = String(candidateRow[10] || "historica");
                    const candidateType = getReplacedImageRecordType(candidateRow, headers);
                    if (candidateOrigin === "auditoria_drive") {
                        inventoryMatches.push({ rowNumber: r + 1, row: candidateRow });
                    } else if (candidateStatus !== "eliminada" &&
                        (!isKnownReplacedImageStatus_(candidateType, candidateStatus) ||
                         candidateStatus === "en_uso" || candidateStatus === "requiere_revision" ||
                         candidateStatus === "eliminacion_pendiente" || candidateStatus === "en_papelera" ||
                         candidateType === "reemplazada")) {
                        historyConflict = "Existe un registro histórico no resuelto para este archivo.";
                    }
                }

                if (ambiguousIdentity) throw Object.assign(new Error("Existe una identidad ambigua que coincide con el ID de Drive; requiere revisión manual."), { blocked: true });
                if (historyConflict) throw Object.assign(new Error(historyConflict), { blocked: true });
                if (inventoryMatches.length !== 1) {
                    throw Object.assign(new Error(inventoryMatches.length
                        ? "Existen varias filas de inventario para el mismo ID de Drive."
                        : "No existe una única fila de inventario verificable para esta imagen."), { blocked: true });
                }
                record = inventoryMatches[0];
                rowIndex = record.rowNumber;
                row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
                recordId = String(row[0] || "").trim();
                if (!recordId || duplicateIds.has(recordId)) throw Object.assign(new Error("El registro tiene un ID duplicado o vacío."), { blocked: true });
                if (extractDriveFileId(row[5]) !== fileId) throw Object.assign(new Error("La identidad del archivo cambió antes de organizarlo."), { blocked: true });

                const status = String(row[10] || "");
                const type = getReplacedImageRecordType(row, headers);
                const storedAuditId = String(row[column("ultima_auditoria_id") - 1] || "");
                const storedOperationId = String(row[column("ultima_operacion_inventario_id") - 1] || "");
                const inventoryResult = String(row[column("resultado_inventario") - 1] || "");
                if (!isKnownReplacedImageStatus_(type, status) || type !== "sin_uso_detectado" ||
                    status !== "sin_uso_detectado" || storedAuditId !== auditId ||
                    storedOperationId !== inventoryOperationId || inventoryResult !== "confirmado") {
                    throw Object.assign(new Error("El estado del inventario cambió o ya no está confirmado para esta operación."), { blocked: true });
                }

                file = DriveApp.getFileById(fileId);
                if (file.isTrashed()) throw Object.assign(new Error("La imagen está en la papelera de Google Drive."), { blocked: true });
                if (!String(file.getMimeType() || "").startsWith("image/")) throw Object.assign(new Error("El archivo ya no tiene un tipo MIME de imagen."), { blocked: true });
                sourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                sourcePath = getFolderPathInsideCortes(sourceFolder, rootFolder.getId());

                const organizationState = String(row[column("estado_organizacion") - 1] || "");
                const storedLocation = String(row[column("ubicacion_actual") - 1] || "");
                if (organizationState === "movida_manual") {
                    manualPreservedCount++;
                    logOutcome("admin_image_manual_location_preserved", recordId,
                        "No se movió " + fileId + "; se conservó la ubicación manual " + (storedLocation || "no especificada") +
                        (storedLocation && storedLocation !== sourcePath ? "; ubicación observada en Drive: " + sourcePath : ""));
                    return;
                }
                if (storedLocation && storedLocation !== sourcePath) {
                    const detail = "La ubicación cambió desde el último inventario. Se conserva la ubicación observada en Drive como movimiento manual: " + sourcePath;
                    writeOrganization({ location: sourcePath, state: "movida_manual", error: "",
                        date: String(row[column("fecha_organizacion") - 1] || ""),
                        status: "sin_uso_detectado", inventoryResult: "confirmado", inventoryDetail: detail });
                    manualPreservedCount++;
                    logOutcome("admin_image_manual_location_preserved", recordId, detail);
                    return;
                }

                if (!destination) {
                    const destinationResult = getOrCreateUnusedImagesFolder(rootFolder);
                    destination = destinationResult.folder;
                    destinationPath = getFolderPathInsideCortes(destination, rootFolder.getId());
                    if (destinationResult.created && !logOutcome("admin_image_folder_create", destination.getId(),
                        "Carpeta creada por solicitud explícita del Desarrollador: " + destinationPath + ".")) {
                        throw new Error("La carpeta destino se creó, pero no se pudo confirmar el registro durable; no se movieron imágenes.");
                    }
                }

                if (organizationState === "organizada" && sourceFolder.getId() !== destination.getId()) {
                    const detail = "La ubicación observada difiere del destino de organización anterior. Se conserva como ubicación manual: " + sourcePath;
                    writeOrganization({ location: sourcePath, state: "movida_manual", error: "", date: String(row[column("fecha_organizacion") - 1] || ""),
                        status: "sin_uso_detectado", inventoryResult: "confirmado", inventoryDetail: detail });
                    manualPreservedCount++;
                    logOutcome("admin_image_manual_location_preserved", recordId, detail);
                    return;
                }

                if (sourceFolder.getId() === destination.getId()) {
                    writeOrganization({ location: destinationPath, state: "organizada", error: "",
                        date: String(row[column("fecha_organizacion") - 1] || Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss")),
                        status: "sin_uso_detectado", inventoryResult: "confirmado", inventoryDetail: "" });
                    alreadyOrganizedCount++;
                    if (!logOutcome("admin_image_organize_explicit", recordId,
                        "La imagen ya estaba en la carpeta destino; no se repitió el movimiento.")) loggingErrorCount++;
                    return;
                }

                const references = collectActiveDriveReferences(false);
                if (references.unverifiableReferenceCount > 0 || references.references.has(fileId)) {
                    const reason = references.unverifiableReferenceCount > 0
                        ? "Existen referencias de Drive no interpretables; el movimiento queda bloqueado."
                        : "La imagen volvió a tener referencias activas antes del movimiento.";
                    writeOrganization({ state: "bloqueada", error: reason, status: "no_confirmada_en_ultima_auditoria",
                        inventoryResult: "bloqueado", inventoryDetail: reason });
                    blockedCount++;
                    logOutcome("admin_image_organize_blocked", recordId, "Movimiento bloqueado para " + fileId + ": " + reason);
                    return;
                }

                const organizationDate = String(row[column("fecha_organizacion") - 1] || "") ||
                    Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                const previousMetadata = {
                    location: String(row[column("ubicacion_actual") - 1] || sourcePath),
                    state: String(row[column("estado_organizacion") - 1] || "pendiente"),
                    error: String(row[column("error_organizacion") - 1] || ""),
                    date: String(row[column("fecha_organizacion") - 1] || ""),
                    status: String(row[10] || "sin_uso_detectado"),
                    result: String(row[column("resultado_inventario") - 1] || "confirmado"),
                    detail: String(row[column("detalle_resultado_inventario") - 1] || "")
                };
                const latestRowsBeforeMove = sheet.getDataRange().getValues();
                const latestInventoryMatches = [];
                let latestIdentityAmbiguous = false;
                let latestHistoryConflict = false;
                for (let r = 1; r < latestRowsBeforeMove.length; r++) {
                    const candidate = latestRowsBeforeMove[r];
                    if (!candidate.some(value => String(value == null ? "" : value).trim() !== "")) continue;
                    const candidateRawIds = new Set([].concat(extractDriveFileIds(candidate[5]), extractDriveFileIds(candidate[7])));
                    let candidateIdentity = "";
                    try { candidateIdentity = getReplacedImageRecordIdentity_(candidate, headers, true); }
                    catch (identityError) {
                        if (candidateRawIds.has(fileId)) latestIdentityAmbiguous = true;
                        continue;
                    }
                    if (candidateIdentity !== fileId) {
                        if (!candidateIdentity && candidateRawIds.has(fileId)) latestIdentityAmbiguous = true;
                        continue;
                    }
                    if (String(candidate[column("origen_registro") - 1] || "") === "auditoria_drive") {
                        latestInventoryMatches.push(candidate);
                    } else {
                        const candidateStatus = String(candidate[10] || "historica");
                        const candidateType = getReplacedImageRecordType(candidate, headers);
                        if (candidateStatus !== "eliminada" &&
                            (candidateStatus === "en_uso" || candidateStatus === "requiere_revision" ||
                             candidateStatus === "eliminacion_pendiente" || candidateStatus === "en_papelera" ||
                             candidateType === "reemplazada")) latestHistoryConflict = true;
                    }
                }
                if (latestIdentityAmbiguous || latestHistoryConflict || latestInventoryMatches.length !== 1) {
                    throw Object.assign(new Error("La identidad, el historial o la unicidad del inventario cambió antes del movimiento; se requiere revisión."), { blocked: true });
                }
                const latestInventoryRow = latestInventoryMatches[0];
                if (String(latestInventoryRow[0] || "").trim() !== recordId ||
                    String(latestInventoryRow[10] || "") !== "sin_uso_detectado" ||
                    String(latestInventoryRow[column("ultima_auditoria_id") - 1] || "") !== auditId ||
                    String(latestInventoryRow[column("ultima_operacion_inventario_id") - 1] || "") !== inventoryOperationId ||
                    String(latestInventoryRow[column("resultado_inventario") - 1] || "") !== "confirmado" ||
                    String(latestInventoryRow[column("estado_organizacion") - 1] || "") !== organizationState ||
                    String(latestInventoryRow[column("ubicacion_actual") - 1] || "") !== storedLocation) {
                    throw Object.assign(new Error("El estado o la ubicación del inventario cambió antes del movimiento; se requiere una nueva revisión."), { blocked: true });
                }
                const latestSourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                if (latestSourceFolder.getId() !== sourceFolder.getId()) {
                    throw Object.assign(new Error("La ubicación de Drive cambió durante la preparación; se conserva la ubicación actual y se bloquea el movimiento."), { blocked: true });
                }
                const latestReferences = collectActiveDriveReferences(false);
                if (latestReferences.unverifiableReferenceCount > 0 || latestReferences.references.has(fileId)) {
                    throw Object.assign(new Error("Las referencias activas cambiaron o no pudieron verificarse inmediatamente antes del movimiento."), { blocked: true });
                }

                let moveError = null;
                try { file.moveTo(destination); } catch (error) { moveError = error; }
                let movedParent = null;
                try { movedParent = getSingleParentFolderInsideCortes(file, rootFolder.getId()); }
                catch (parentError) { moveError = moveError || parentError; }

                if (!movedParent || movedParent.getId() !== destination.getId()) {
                    let rollbackError = null;
                    try {
                        let currentParent = null;
                        try { currentParent = getSingleParentFolderInsideCortes(file, rootFolder.getId()); } catch (parentError) {}
                        if (!currentParent || currentParent.getId() !== sourceFolder.getId()) file.moveTo(sourceFolder);
                        const restoredParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                        if (restoredParent.getId() !== sourceFolder.getId()) throw new Error("Drive no confirmó la ubicación anterior.");
                    } catch (error) { rollbackError = error; }
                    const reason = "Drive no confirmó el traslado a «Imagenes_Sin_Uso»." +
                        (moveError ? " Detalle: " + moveError.message : "");
                    if (!rollbackError) {
                        writeOrganization({ location: previousMetadata.location, state: "error",
                            error: reason + " El movimiento fue revertido.", date: previousMetadata.date,
                            status: "sin_uso_detectado", inventoryResult: "confirmado", inventoryDetail: "" });
                    } else {
                        writeOrganization({ location: actualCortesPath(file), state: "requiere_revision",
                            error: reason + "; la reversión falló: " + rollbackError.message,
                            status: "requiere_revision", inventoryResult: "error",
                            inventoryDetail: "Movimiento y reversión requieren revisión manual." });
                    }
                    failedCount++;
                    logOutcome("admin_image_organize_explicit", recordId, "Movimiento fallido de " + fileId + ": " +
                        reason + (rollbackError ? "; reversión fallida: " + rollbackError.message : "; movimiento revertido."));
                    return;
                }

                try {
                    writeOrganization({ location: destinationPath, state: "organizada", error: "",
                        date: organizationDate, status: "sin_uso_detectado", inventoryResult: "confirmado", inventoryDetail: "" });
                    if (!logOutcome("admin_image_organize_explicit", recordId,
                        "Imagen " + file.getName() + " movida explícitamente de " + sourcePath + " a " + destinationPath + "; resultado: correcto.")) {
                        throw new Error("No se pudo confirmar el registro durable del movimiento.");
                    }
                    movedCount++;
                } catch (historyError) {
                    let rollbackError = null;
                    try {
                        let currentParent = null;
                        try { currentParent = getSingleParentFolderInsideCortes(file, rootFolder.getId()); } catch (parentError) {}
                        if (!currentParent || currentParent.getId() !== sourceFolder.getId()) file.moveTo(sourceFolder);
                        const restoredParent = getSingleParentFolderInsideCortes(file, rootFolder.getId());
                        if (restoredParent.getId() !== sourceFolder.getId()) throw new Error("Drive no confirmó la ubicación anterior.");
                    } catch (error) { rollbackError = error; }

                    if (!rollbackError) {
                        writeOrganization({ location: previousMetadata.location, state: "error",
                            error: "Falló el registro del movimiento; el archivo fue revertido: " + historyError.message,
                            date: previousMetadata.date, status: "sin_uso_detectado",
                            inventoryResult: "confirmado", inventoryDetail: "" });
                    } else {
                        writeOrganization({ location: actualCortesPath(file), state: "requiere_revision",
                            error: "Falló el registro y la reversión: " + historyError.message + "; " + rollbackError.message,
                            status: "requiere_revision", inventoryResult: "error",
                            inventoryDetail: "No se pudo confirmar el movimiento ni su reversión." });
                    }
                    failedCount++;
                    logOutcome("admin_image_organize_explicit", recordId, "La organización de " + fileId +
                        " requirió reversión: " + historyError.message +
                        (rollbackError ? "; reversión fallida: " + rollbackError.message : "; movimiento revertido."));
                }
            } catch (error) {
                if (error && error.blocked) blockedCount++; else failedCount++;
                logOutcome(error && error.blocked ? "admin_image_organize_blocked" : "admin_image_organize_explicit",
                    recordId || "INV-" + fileId, "No se organizó " + fileId + ": " + (error.message || String(error)));
            }

            function writeOrganization(values) {
                const current = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
                if (String(current[0] || "") !== recordId || extractDriveFileId(current[5]) !== fileId ||
                    String(current[column("ultima_auditoria_id") - 1] || "") !== auditId ||
                    String(current[column("ultima_operacion_inventario_id") - 1] || "") !== inventoryOperationId ||
                    String(current[column("resultado_inventario") - 1] || "") !== "confirmado") {
                    throw Object.assign(new Error("La fila del inventario cambió durante la preparación del movimiento."), { blocked: true });
                }
                const updated = current.slice(0, headers.length);
                while (updated.length < headers.length) updated.push("");
                const setField = (name, value) => { updated[column(name) - 1] = value; };
                if (values.location !== undefined) setField("ubicacion_actual", values.location);
                if (values.state !== undefined) setField("estado_organizacion", values.state);
                if (values.error !== undefined) setField("error_organizacion", values.error);
                if (values.date !== undefined) setField("fecha_organizacion", values.date);
                if (values.status !== undefined) setField("estado", values.status);
                if (values.inventoryResult !== undefined) setField("resultado_inventario", values.inventoryResult);
                if (values.inventoryDetail !== undefined) setField("detalle_resultado_inventario", values.inventoryDetail);
                return writeDriveInventoryRowVerified_(sheet, rowIndex, updated, headers, fileId, auditId,
                    inventoryOperationId, String(updated[10] || ""), String(updated[column("resultado_inventario") - 1] || ""),
                    String(updated[column("estado_organizacion") - 1] || ""), String(updated[column("ubicacion_actual") - 1] || ""));
            }
        });

        logMessage && logMessage("Organización explícita de imágenes sin uso", "Movidas: " + movedCount +
            "; ya organizadas: " + alreadyOrganizedCount + "; ubicaciones manuales conservadas: " +
            manualPreservedCount + "; fallidas: " + failedCount + "; bloqueadas: " + blockedCount +
            "; errores de registro: " + loggingErrorCount + ".");
        return { status: "success", auditId: auditId, inventoryOperationId: inventoryOperationId,
            folderPath: destinationPath, processedCount: fileIds.length, movedCount: movedCount,
            alreadyOrganizedCount: alreadyOrganizedCount, manualPreservedCount: manualPreservedCount,
            failedCount: failedCount, blockedCount: blockedCount, loggingErrorCount: loggingErrorCount };
    } finally {
        lock.releaseLock();
    }
}


function handleAuditDriveImagesInCortes(payload, logMessage, developerContext) {
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); }
    catch (lockError) { throw new Error("No se pudo bloquear la actualización del estado de auditoría. Intenta nuevamente."); }
    try { return handleAuditDriveImagesInCortesLocked_(payload, logMessage, developerContext); }
    finally { lock.releaseLock(); }
}
function handleAuditDriveImagesInCortesLocked_(payload, logMessage, developerContext) {
    const requestStartedAt = Date.now();
    const ownerId = String(developerContext && developerContext.userId || "").trim();
    if (!ownerId) throw new Error("La auditoría requiere una sesión Desarrollador verificada.");
    const rootValidationStartedAt = Date.now();
    const rootFolder = getCortesRootFolder();
    const rootValidationMs = Date.now() - rootValidationStartedAt;
    if (!rootFolder) throw new Error("No se pudo acceder a la carpeta principal 'Cortes'.");
    const folderMembershipCache = new Map();
    const folderObjectCache = new Map([[String(DRIVE_FOLDER_ID), rootFolder]]);
    const getAuditFolderById = folderId => {
        const id = String(folderId || "").trim();
        if (!id) throw new Error("El cursor contiene una carpeta sin ID.");
        if (!folderObjectCache.has(id)) folderObjectCache.set(id, DriveApp.getFolderById(id));
        return folderObjectCache.get(id);
    };
    folderMembershipCache.set(String(DRIVE_FOLDER_ID), true);
    const cursor = payload && payload.cursor ? payload.cursor : null;
    let auditId, state, referenceSnapshot, stack, totalDiscovered, totalAnalyzed, foldersVisited;
    let errorCount, duplicateFileCount, duplicateFolderCount, pageIndex, inputFingerprint;
    let referenceCaptureMs = 0, historyCaptureMs = 0, snapshotLoadMs = 0, snapshotPersistMs = 0;
    let cursorValidationMs = 0, snapshotManifest = null, cortesScanMetrics = null;
    if (cursor) {
        auditId = String(cursor.referenceCacheId || "").trim();
        state = loadDriveAuditServerState_(auditId);
        if (state.ownerId !== ownerId) throw new Error("El cursor pertenece a otra sesión Desarrollador.");
        if (state.scanVersion !== ADMIN_SERVICE_VERSION || String(cursor.scanVersion || "") !== ADMIN_SERVICE_VERSION) throw new Error("La auditoría fue creada con otra versión del servicio; inicia una auditoría nueva para aplicar la deduplicación global.");
        inputFingerprint = getDriveAuditCursorFingerprint_(cursor);
        if (state.lastRequestFingerprint === inputFingerprint && state.lastResponseCacheKey) {
            if (Number(cursor.totalAnalyzed) !== Number(state.lastRequestTotalAnalyzed) ||
                Number(cursor.foldersVisited) !== Number(state.lastRequestFoldersVisited)) {
                throw new Error("La posición del cursor se repitió con contadores alterados; no se aceptó progreso ficticio.");
            }
            const cachedResponse = CacheService.getScriptCache().get(state.lastResponseCacheKey);
            if (cachedResponse !== null) { try { return JSON.parse(cachedResponse); } catch (cacheError) { throw new Error("La respuesta reanudable de auditoría está corrupta. Inicia una auditoría nueva."); } }
            throw new Error("La respuesta de este lote expiró; inicia una auditoría nueva para evitar duplicar resultados.");
        }
        if (state.status !== "running" || state.expectedCursorFingerprint !== inputFingerprint) throw new Error("El cursor no coincide con la última continuación emitida por ADMIN. No se aceptó el lote.");
        if (!Array.isArray(cursor.stack) || cursor.stack.length === 0 || Number(cursor.totalAnalyzed) !== Number(state.totalAnalyzed) || Number(cursor.foldersVisited) !== Number(state.foldersVisited)) throw new Error("El cursor está incompleto o sus contadores no coinciden con el estado del servidor.");
        const snapshotLoadStartedAt = Date.now();
        referenceSnapshot = loadAuditDriveReferenceSnapshot(auditId);
        refreshAuditDriveReferenceSnapshot_(auditId, referenceSnapshot);
        snapshotLoadMs = Date.now() - snapshotLoadStartedAt;
        const cursorValidationStartedAt = Date.now();
        cursor.stack.forEach(item => {
            if (!item || !item.folderId ||
                !isFolderInsideCortes(getAuditFolderById(item.folderId), DRIVE_FOLDER_ID, folderMembershipCache)) {
                throw new Error("El cursor contiene una carpeta fuera del árbol autorizado «Cortes».");
            }
        });
        cursorValidationMs = Date.now() - cursorValidationStartedAt;
        stack = cursor.stack;
        totalDiscovered = Number(state.totalDiscovered) || 0; totalAnalyzed = Number(state.totalAnalyzed) || 0;
        foldersVisited = Number(state.foldersVisited) || 1; errorCount = Number(state.errorCount) || 0;
        duplicateFileCount = Number(state.duplicateFileCount) || 0; duplicateFolderCount = Number(state.duplicateFolderCount) || 0;
        pageIndex = Number(state.pageCount) || 0;
    } else {
        cleanupExpiredDriveAuditServerStates_();
        auditId = Utilities.getUuid(); inputFingerprint = "START";
        state = { auditId, ownerId, status: "running", scanVersion: ADMIN_SERVICE_VERSION, createdAt: Date.now(),
            pageCount: 0, totalDiscovered: 0, totalAnalyzed: 0, foldersVisited: 1, errorCount: 0, duplicateFileCount: 0, duplicateFolderCount: 0 };
        const referenceCaptureStartedAt = Date.now();
        const references = collectActiveDriveReferences(false);
        referenceCaptureMs = Date.now() - referenceCaptureStartedAt;
        cortesScanMetrics = references.metrics && references.metrics.cortes || null;
        state.cortesRowsRead = Number(cortesScanMetrics && cortesScanMetrics.rows) || 0;
        state.cortesColumnsRead = Number(cortesScanMetrics && cortesScanMetrics.columns) || 0;
        state.cortesCellsRead = Number(cortesScanMetrics && cortesScanMetrics.cells) || 0;
        state.cortesReadRanges = Number(cortesScanMetrics && cortesScanMetrics.ranges) || 0;
        state.cortesReadMs = Number(cortesScanMetrics && cortesScanMetrics.elapsedMs) || 0;
        const historyCaptureStartedAt = Date.now();
        const historicalDriveIds = new Set(), protectedDriveIds = new Set();
        const historySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.IMAGENES_REEMPLAZADAS);
        if (historySheet) {
            const historyRows = historySheet.getDataRange().getValues();
            const historyHeaders = historyRows.length ? historyRows[0].map(value => String(value || "").trim()) : [];
            const originIndex = historyHeaders.indexOf("origen_registro"), typeIndex = historyHeaders.indexOf("tipo_registro");
            for (let r = 1; r < historyRows.length; r++) {
                const row = historyRows[r], origin = originIndex >= 0 ? String(row[originIndex] || "") : "";
                const status = String(row[10] || "historica"), recordType = typeIndex >= 0 ? String(row[typeIndex] || "reemplazada") : "reemplazada";
                if (status === "eliminada") continue;
                new Set([].concat(extractDriveFileIds(row[5]), extractDriveFileIds(row[7]))).forEach(id => {
                    if (status === "en_uso") protectedDriveIds.add(id);
                    else if (status === "requiere_revision" || status === "eliminacion_pendiente" || status === "en_papelera" || (origin !== "auditoria_drive" && recordType === "reemplazada")) historicalDriveIds.add(id);
                });
            }
        }
        historyCaptureMs = Date.now() - historyCaptureStartedAt;
        referenceSnapshot = { activeDriveIds: Array.from(references.references.keys()), historicalDriveIds: Array.from(historicalDriveIds),
            protectedDriveIds: Array.from(protectedDriveIds), unverifiableReferenceCount: references.unverifiableReferenceCount };
        const snapshotPersistStartedAt = Date.now();
        snapshotManifest = storeAuditDriveReferenceSnapshot(auditId, referenceSnapshot);
        snapshotPersistMs = Date.now() - snapshotPersistStartedAt;
        state.unverifiableReferenceCount = references.unverifiableReferenceCount;
        state.activeReferenceCount = referenceSnapshot.activeDriveIds.length;
        state.historicalReferenceCount = referenceSnapshot.historicalDriveIds.length;
        state.protectedReferenceCount = referenceSnapshot.protectedDriveIds.length;
        state.snapshotCharacters = snapshotManifest.length;
        state.snapshotBytes = snapshotManifest.byteLength;
        state.snapshotChunks = snapshotManifest.chunkCount;
        saveDriveAuditServerState_(state);
        stack = [{ folderId: DRIVE_FOLDER_ID, path: rootFolder.getName(), fileToken: null, folderToken: null, filesDone: false, foldersDone: false }];
        totalDiscovered = 0; totalAnalyzed = 0; foldersVisited = 1; errorCount = 0; duplicateFileCount = 0; duplicateFolderCount = 0; pageIndex = 0;
        logMessage && logMessage("Referencias", `Snapshot preparado: ${referenceSnapshot.activeDriveIds.length} referencias activas y ${referenceSnapshot.historicalDriveIds.length} históricas.`);
    }
    const deduplicationLoadStartedAt = Date.now();
    const processed = loadDriveAuditSeenIds_(auditId, pageIndex), seenFileIds = new Set(processed.fileIds), seenFolderIds = new Set(processed.folderIds);
    const deduplicationLoadMs = Date.now() - deduplicationLoadStartedAt;
    const pageFileIds = [], pageFolderIds = [];
    if (!cursor && !seenFolderIds.has(DRIVE_FOLDER_ID)) { seenFolderIds.add(DRIVE_FOLDER_ID); pageFolderIds.push(DRIVE_FOLDER_ID); }
    const activeDriveIds = new Set(referenceSnapshot.activeDriveIds), historicalDriveIds = new Set(referenceSnapshot.historicalDriveIds), protectedDriveIds = new Set(referenceSnapshot.protectedDriveIds || []);
    let batchFiles = 0, batchFolders = 0, batchFileEntries = 0, batchFolderEntries = 0;
    const auditResults = [], batchFilesLimit = 25, batchFoldersLimit = 20, batchFileEntriesLimit = 50, batchFolderEntriesLimit = 40;
    const batchBudgetMs = 18000, batchStartedAt = Date.now();
    while (stack.length && batchFiles < batchFilesLimit && batchFolders < batchFoldersLimit &&
        batchFileEntries < batchFileEntriesLimit && batchFolderEntries < batchFolderEntriesLimit &&
        Date.now() - batchStartedAt < batchBudgetMs) {
        const current = stack[stack.length - 1], folder = getAuditFolderById(current.folderId);
        if (!current.filesDone) {
            const files = current.fileToken ? DriveApp.continueFileIterator(current.fileToken) : folder.getFiles();
            while (files.hasNext() && batchFiles < batchFilesLimit && batchFileEntries < batchFileEntriesLimit &&
                Date.now() - batchStartedAt < batchBudgetMs) {
                const file = files.next(); batchFileEntries++;
                let fileId = ""; try { fileId = String(file.getId() || "").trim(); } catch (idError) { errorCount++; continue; }
                if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) { errorCount++; continue; }
                if (seenFileIds.has(fileId)) { duplicateFileCount++; continue; }
                seenFileIds.add(fileId); pageFileIds.push(fileId); totalDiscovered++;
                let fileName = "Archivo no verificable", mimeType = "", size = 0, lastUpdated = "", classification = "No verificable";
                try {
                    fileName = file.getName(); mimeType = file.getMimeType(); size = file.getSize();
                    lastUpdated = Utilities.formatDate(file.getLastUpdated(), "GMT-6", "yyyy-MM-dd HH:mm:ss");
                    if (activeDriveIds.has(fileId) || protectedDriveIds.has(fileId)) classification = "En uso";
                    else if (historicalDriveIds.has(fileId)) classification = "Histórica";
                    else if (!String(mimeType).startsWith("image/")) classification = "No verificable";
                    else if (referenceSnapshot.unverifiableReferenceCount > 0) classification = "No verificable";
                    else classification = "Sin uso detectado";
                } catch (fileError) { classification = "No verificable"; errorCount++; }
                auditResults.push({ fileId, fileName, folderId: current.folderId, folderPath: current.path, mimeType, size, lastUpdated, classification });
                batchFiles++; totalAnalyzed++;
            }
            if (files.hasNext()) { current.fileToken = files.getContinuationToken(); break; }
            current.fileToken = null; current.filesDone = true;
        }
        if (current.foldersDone) { stack.pop(); continue; }
        const subFolders = current.folderToken ? DriveApp.continueFolderIterator(current.folderToken) : folder.getFolders();
        let pushedChild = false;
        while (subFolders.hasNext() && batchFolderEntries < batchFolderEntriesLimit && batchFolders < batchFoldersLimit &&
            Date.now() - batchStartedAt < batchBudgetMs) {
            const childFolder = subFolders.next(); batchFolderEntries++;
            const childFolderId = String(childFolder.getId() || "").trim();
            current.folderToken = subFolders.hasNext() ? subFolders.getContinuationToken() : null;
            if (!current.folderToken) current.foldersDone = true;
            if (!/^[a-zA-Z0-9_-]{20,}$/.test(childFolderId)) { errorCount++; continue; }
            if (seenFolderIds.has(childFolderId)) { duplicateFolderCount++; continue; }
            if (!folderObjectCache.has(childFolderId)) folderObjectCache.set(childFolderId, childFolder);
            if (!isFolderInsideCortes(childFolder, DRIVE_FOLDER_ID, folderMembershipCache)) {
                throw new Error("Se detectó una subcarpeta fuera del árbol «Cortes».");
            }
            seenFolderIds.add(childFolderId); pageFolderIds.push(childFolderId);
            stack.push({ folderId: childFolderId, path: `${current.path}/${childFolder.getName()}`, fileToken: null, folderToken: null, filesDone: false, foldersDone: false });
            batchFolders++; foldersVisited++; pushedChild = true; break;
        }
        if (pushedChild) continue;
        if (subFolders.hasNext()) { current.folderToken = subFolders.getContinuationToken(); current.foldersDone = false; break; }
        current.folderToken = null; current.foldersDone = true; stack.pop();
    }
    const driveTraversalMs = Date.now() - batchStartedAt;
    const budgetExhausted = stack.length > 0 && driveTraversalMs >= batchBudgetMs;
    const complete = stack.length === 0;
    const nextCursor = complete ? null : { stack, totalAnalyzed, foldersVisited, referenceCacheId: auditId, scanVersion: ADMIN_SERVICE_VERSION };
    const cachePersistenceStartedAt = Date.now();
    storeDriveAuditPageResults_(auditId, pageIndex, auditResults.filter(item => item.classification === "Sin uso detectado").map(item => item.fileId));
    storeDriveAuditSeenPage_(auditId, pageIndex, pageFileIds, pageFolderIds);
    const cachePersistenceMs = Date.now() - cachePersistenceStartedAt;
    const nextPageCount = pageIndex + 1, serverTimestamp = Date.now();
    const metrics = {
        rootValidationMs, referenceCaptureMs, historyCaptureMs, snapshotLoadMs, snapshotPersistMs,
        cursorValidationMs, deduplicationLoadMs, driveTraversalMs, cachePersistenceMs,
        totalMs: Date.now() - requestStartedAt, batchBudgetMs, budgetExhausted,
        batchFiles, batchFolders, batchFileEntries, batchFolderEntries, stackDepth: stack.length,
        folderMembershipCacheEntries: folderMembershipCache.size, folderObjectCacheEntries: folderObjectCache.size,
        activeReferenceCount: Number(state.activeReferenceCount) || referenceSnapshot.activeDriveIds.length,
        cortesRowsRead: Number(state.cortesRowsRead) || 0, cortesColumnsRead: Number(state.cortesColumnsRead) || 0,
        cortesCellsRead: Number(state.cortesCellsRead) || 0, cortesReadRanges: Number(state.cortesReadRanges) || 0,
        cortesReadMs: Number(state.cortesReadMs) || 0,
        historicalReferenceCount: Number(state.historicalReferenceCount) || referenceSnapshot.historicalDriveIds.length,
        protectedReferenceCount: Number(state.protectedReferenceCount) || (referenceSnapshot.protectedDriveIds || []).length,
        snapshotCharacters: Number(state.snapshotCharacters) || 0, snapshotBytes: Number(state.snapshotBytes) || 0,
        snapshotChunks: Number(state.snapshotChunks) || 0,
        cursorBytes: nextCursor ? Utilities.newBlob(JSON.stringify(nextCursor), "application/json; charset=utf-8").getBytes().length : 0
    };
    const response = { status: "success", auditId, serverCompletionVerified: complete, serviceVersion: ADMIN_SERVICE_VERSION, serverTimestamp,
        rootFolderName: rootFolder.getName(), rootFolderId: DRIVE_FOLDER_ID, batchAnalyzed: batchFiles, totalDiscovered, totalAnalyzed,
        foldersVisited, pendingFolderCount: stack.length, errorCount, duplicateFileCount, duplicateFolderCount,
        complete, partial: !complete, unverifiableReferenceCount: referenceSnapshot.unverifiableReferenceCount,
        metrics, files: auditResults, cursor: nextCursor };
    const responseCacheKey = getDriveAuditResponseCacheKey_(auditId, inputFingerprint);
    let responseJson = JSON.stringify(response);
    metrics.responseCharacters = responseJson.length;
    metrics.responseBytes = Utilities.newBlob(responseJson, "application/json; charset=utf-8").getBytes().length;
    responseJson = JSON.stringify(response);
    CacheService.getScriptCache().put(responseCacheKey, responseJson, 21600);
    if (CacheService.getScriptCache().get(responseCacheKey) !== responseJson) throw new Error("No se pudo conservar la respuesta reanudable del lote de auditoría.");
    state.pageCount = nextPageCount; state.totalDiscovered = totalDiscovered; state.totalAnalyzed = totalAnalyzed; state.foldersVisited = foldersVisited;
    state.errorCount = errorCount; state.duplicateFileCount = duplicateFileCount; state.duplicateFolderCount = duplicateFolderCount;
    state.lastBatchMetrics = metrics;
    const previousResponseCacheKey = state.lastResponseCacheKey;
    state.unverifiableReferenceCount = referenceSnapshot.unverifiableReferenceCount;
    state.lastRequestFingerprint = inputFingerprint;
    state.lastRequestTotalAnalyzed = cursor ? Number(cursor.totalAnalyzed) : 0;
    state.lastRequestFoldersVisited = cursor ? Number(cursor.foldersVisited) : 1;
    state.lastResponseCacheKey = responseCacheKey;
    if (complete) {
        const allUnusedIds = loadDriveAuditUnusedFileIds_(auditId, nextPageCount);
        state.status = "complete"; state.completedAt = Date.now(); state.expectedUnusedCount = allUnusedIds.length;
        state.expectedUnusedDigest = hashDriveAuditFileIds_(allUnusedIds); state.expectedCursorFingerprint = "";
        const latestKey = "GPSpedia_DRIVE_AUDIT_LATEST_" + hashDriveAuditValue_(ownerId).slice(0, 32), properties = PropertiesService.getScriptProperties();
        properties.setProperty(latestKey, auditId);
        if (properties.getProperty(latestKey) !== auditId) throw new Error("No se pudo verificar la referencia a la última auditoría completa.");
    } else { state.status = "running"; state.expectedCursorFingerprint = getDriveAuditCursorFingerprint_(nextCursor); }
    saveDriveAuditServerState_(state);
    if (previousResponseCacheKey && previousResponseCacheKey !== responseCacheKey) {
        try { CacheService.getScriptCache().remove(previousResponseCacheKey); }
        catch (cleanupError) { /* La respuesta vigente ya está confirmada; la entrada anterior expira por TTL. */ }
    }
    if (complete) clearAuditDriveReferenceSnapshot(auditId);
    logMessage && logMessage("Auditoría Drive", `Lote analizado: ${batchFiles} archivos únicos. Total acumulado: ${totalAnalyzed}. Duplicados omitidos: ${duplicateFileCount + duplicateFolderCount}. Estado: ${complete ? "completo" : "parcial"}.`);
    logMessage && logMessage("Rendimiento auditoría", JSON.stringify(metrics));
    return response;
}