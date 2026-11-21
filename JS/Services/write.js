// ============================================================================
// GPSPEDIA-WRITE SERVICE (STANDARDIZED FOR DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.1

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os";
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
    IDEMPOTENCIA: "Idempotencia",
    IDEMPOTENCIA_FALLBACK: "Idempotencia_Cortes",
    USERS: "Users",
    ACTIVE_SESSIONS: "ActiveSessions"
};

// La identidad y el rol llegan desde Coordinator; WRITE no duplica los esquemas de Users/ActiveSessions.

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
 * Devuelve la posición real de la columna «vin» según el encabezado.
 * Retorna 0 cuando la hoja no dispone de esa columna.
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

function ensureTestigoColumns(sheet) {
    if (!sheet) throw new Error('No se encontró la hoja «Cortes».');
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
}


function getAuthenticatedCollaborator(payload, allowedRoles) {
 const trusted = payload && payload.__sharedSessionActor;
 if (!trusted || typeof trusted.userId !== "string" || typeof trusted.role !== "string" || !Number.isSafeInteger(trusted.epoch) || trusted.epoch < 1) throw new Error("Acceso no autorizado: falta el contexto de sesión compartido.");
 const id = trusted.userId.trim(), requested = String(payload.userId || id).trim(), role = trusted.role.trim().toLowerCase(), name = String(trusted.fullName || "").trim();
 if (!id || requested !== id || !name || ['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(role) !== true) throw new Error("Acceso no autorizado: el contexto compartido no es válido.");
 if (Array.isArray(allowedRoles) && !allowedRoles.includes(role)) throw new Error("Acceso no autorizado: tu rol no puede realizar esta operación.");
 return name;
}
// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================

const DIRECT_SERVICE_TRAFFIC_CONFIG_ = Object.freeze({
    service: "WRITE",
    bucketPrefix: "GPSpedia_WRITE_DIRECT_TRAFFIC_HOUR_V1_",
    secretProperty: "GPSpedia_WRITE_TRAFFIC_SECRET",
    actions: new Set(["checkVehicle","getSuggestion","checkVinDuplicate"])
});
const DIRECT_SERVICE_TRAFFIC_BUCKET_MS_ = 60 * 60 * 1000;
const DIRECT_SERVICE_TRAFFIC_WINDOW_MS_ = 24 * 60 * 60 * 1000;

function recordDirectServiceTraffic_(capturedAt) {
    try {
        // Telemetría best-effort: nunca adquirir el ScriptLock global del servicio.
        // Las escrituras concurrentes pueden subcontar; el contrato lo declara explícitamente.
        const properties = PropertiesService.getScriptProperties();
        const currentTime = Number(capturedAt) || Date.now();
        const bucketStart = Math.floor(currentTime / DIRECT_SERVICE_TRAFFIC_BUCKET_MS_) * DIRECT_SERVICE_TRAFFIC_BUCKET_MS_;
        if (!Number.isSafeInteger(bucketStart) || bucketStart <= 0) return false;
        const key = DIRECT_SERVICE_TRAFFIC_CONFIG_.bucketPrefix + bucketStart;
        const raw = properties.getProperty(key);
        if (!raw) {
            const firstBucket = bucketStart - DIRECT_SERVICE_TRAFFIC_WINDOW_MS_ + DIRECT_SERVICE_TRAFFIC_BUCKET_MS_;
            const all = properties.getProperties() || {};
            Object.keys(all).forEach(propertyKey => {
                if (!propertyKey.startsWith(DIRECT_SERVICE_TRAFFIC_CONFIG_.bucketPrefix)) return;
                const startAt = Number(propertyKey.slice(DIRECT_SERVICE_TRAFFIC_CONFIG_.bucketPrefix.length));
                if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > bucketStart) {
                    properties.deleteProperty(propertyKey);
                }
            });
        }
        let bucket = { version: 1, startAt: bucketStart, count: 0 };
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === 1 && parsed.startAt === bucketStart &&
                    Number.isSafeInteger(parsed.count) && parsed.count >= 0) bucket = parsed;
            } catch (error) { /* Un bucket dañado se reemplaza sin afectar la respuesta del servicio. */ }
        }
        bucket.count = Math.min(Number.MAX_SAFE_INTEGER, bucket.count + 1);
        properties.setProperty(key, JSON.stringify(bucket));
        return true;
    } catch (error) {
        return false;
    }
}


function directServiceTrafficSecretEquals_(expected, supplied) {
    expected = String(expected || "");
    supplied = String(supplied || "");
    if (expected.length < 32 || expected.length !== supplied.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index++) {
        difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
    }
    return difference === 0;
}

function readDirectServiceTraffic_(suppliedSecret, capturedAt) {
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET") ||
        properties.getProperty(DIRECT_SERVICE_TRAFFIC_CONFIG_.secretProperty) || "");
    if (!directServiceTrafficSecretEquals_(expectedSecret, suppliedSecret)) {
        return { status: "error", message: "Acceso denegado a la telemetría del servicio." };
    }
    const currentTime = Number(capturedAt) || Date.now();
    const currentBucket = Math.floor(currentTime / DIRECT_SERVICE_TRAFFIC_BUCKET_MS_) * DIRECT_SERVICE_TRAFFIC_BUCKET_MS_;
    const firstBucket = currentBucket - DIRECT_SERVICE_TRAFFIC_WINDOW_MS_ + DIRECT_SERVICE_TRAFFIC_BUCKET_MS_;
    const all = properties.getProperties() || {};
    const stored = new Map();
    Object.keys(all).forEach(key => {
        if (!key.startsWith(DIRECT_SERVICE_TRAFFIC_CONFIG_.bucketPrefix)) return;
        const startAt = Number(key.slice(DIRECT_SERVICE_TRAFFIC_CONFIG_.bucketPrefix.length));
        if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > currentBucket) return;
        let parsed;
        try { parsed = JSON.parse(all[key]); } catch (error) { parsed = null; }
        if (parsed && parsed.version === 1 && parsed.startAt === startAt &&
            Number.isSafeInteger(parsed.count) && parsed.count >= 0) stored.set(startAt, parsed.count);
    });
    const buckets = [];
    const totals = { lastHour: 0, last6Hours: 0, last24Hours: 0 };
    for (let startAt = firstBucket; startAt <= currentBucket; startAt += DIRECT_SERVICE_TRAFFIC_BUCKET_MS_) {
        const count = stored.get(startAt) || 0;
        buckets.push({ startAt, count });
        if (startAt + DIRECT_SERVICE_TRAFFIC_BUCKET_MS_ > currentTime - 60 * 60 * 1000) totals.lastHour += count;
        if (startAt + DIRECT_SERVICE_TRAFFIC_BUCKET_MS_ > currentTime - 6 * 60 * 60 * 1000) totals.last6Hours += count;
        totals.last24Hours += count;
    }
    return {
        status: "success",
        service: DIRECT_SERVICE_TRAFFIC_CONFIG_.service,
        scope: "direct_post_requests",
        source: "service_script_properties",
        accuracy: "best_effort_nonblocking",
        mayUndercount: true,
        capturedAt: currentTime,
        windowMs: DIRECT_SERVICE_TRAFFIC_WINDOW_MS_,
        bucketMs: DIRECT_SERVICE_TRAFFIC_BUCKET_MS_,
        buckets,
        totals
    };
}

function doGet(e) {
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Write',
            version: '2.3.1',
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const defaultResponse = { status: 'success', message: 'GPSpedia Write-SERVICE v2.0 is active.' };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","allocateVehicleId","freezeCortesIds"].includes(action);
}

function doPost(e) {
    let request;
    try { request = JSON.parse(e && e.postData && e.postData.contents || "{}"); }
    catch (error) { return doPostInternal_(e); }
    if (!request || typeof request !== "object") return doPostInternal_(e);
    const action = String(request.action || "");
    if (action === "__invalidateSessionActorCache") {
        const invalidation = handleSharedSessionActorCacheInvalidation_(request.payload);
        return ContentService.createTextOutput(JSON.stringify(invalidation)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "__primeSessionActorCache") {
        const priming = handleSharedSessionActorCachePriming_(request.payload);
        return ContentService.createTextOutput(JSON.stringify(priming)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "getServiceTraffic") {
        const traffic = readDirectServiceTraffic_(request.payload && request.payload.secret);
        return ContentService.createTextOutput(JSON.stringify(traffic)).setMimeType(ContentService.MimeType.TEXT);
    }
    if (DIRECT_SERVICE_TRAFFIC_CONFIG_.actions.has(action)) recordDirectServiceTraffic_();
    const payload = request.payload && typeof request.payload === "object" ? request.payload : {};
    if (!isSharedMutationAction_(action)) {
        return doPostInternal_(withSharedSessionActor_(e, null));
    }
    try {
        const actor = getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "WRITE" });
        return doPostInternal_(withSharedSessionActor_(e, actor));
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: error && error.message ? error.message : "La sesión no pudo ser confirmada."
        })).setMimeType(ContentService.MimeType.TEXT);
    }
}

function doPostInternal_(e) {
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
            case 'checkOperation':
                response = handleCheckOperation(request.payload);
                break;
            case 'addOrUpdateCut':
                response = handleAddOrUpdateCut(request.payload);
                break;
            case 'addSupplementaryInfo':
                response = handleAddSupplementaryInfo(request.payload);
                break;
            case 'checkVinDuplicate':
                response = handleCheckVinDuplicate(request.payload);
                break;
            case 'addVinToVehicle':
                response = handleAddVinToVehicle(request.payload);
                break;
            case 'allocateVehicleId':
                response = handleAllocateVehicleId(request.payload);
                break;
            case 'freezeCortesIds':
                response = handleFreezeCortesIds(request.payload);
                break;
            default:
                throw new Error(`La acción '${request.action}' es desconocida.`);
        }
    } catch (error) {
        Logger.log(`Error en Write-Service doPost: ${error.stack}`);
        response = { status: "error", code: error && error.code || "SERVICE_ERROR", message: "Ocurrió un error en el servicio.", details: { errorMessage: error.message } };
    }

    // El feed se actualiza solo después de confirmar la mutación y releer la fila final.
    try {
        const request = JSON.parse(e && e.postData && e.postData.contents || "{}");
        const action = String(request.action || "");
        const requestPayload = request.payload && typeof request.payload === "object" ? request.payload : {};
        const catalogWriters = ["addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle"];
        if (response && response.status === "success" && response.alreadyPresent !== true &&
            !String(requestPayload.__sharedMutationToken || "").trim() &&
            catalogWriters.includes(action)) {
            try {
                if (["addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle"].includes(action)) {
                    const vehicleId = action === "addOrUpdateCut"
                        ? response.vehicleId
                        : (response.vehicleId || requestPayload.vehicleId);
                    if (!vehicleId) throw new Error("La mutación WRITE no devolvió un ID de vehículo verificable.");
                    if (response.catalogResetRequired === true) {
                        publishSharedCatalogChange_("WRITE", action, { operation: "reset" });
                    } else {
                        publishCortesCatalogChange_(action, vehicleId, response.catalogVersion);
                    }
                } else {
                    // freezeCortesIds puede modificar varias filas/IDs: requiere reconciliación completa.
                    publishSharedCatalogChange_("WRITE", action, { operation: "reset" });
                }
            } catch (catalogPublishError) {
                try {
                    publishSharedCatalogChange_("WRITE", action, { operation: "reset" });
                } catch (resetPublishError) {
                    Logger.log("La mutación WRITE se confirmó, pero no se pudo publicar su cambio: " +
                        (resetPublishError && resetPublishError.message ? resetPublishError.message : "CatalogFeedError"));
                }
            }
        }
    } catch (catalogRequestError) {
        Logger.log("No se pudo identificar la acción WRITE para publicar el catálogo: " +
            (catalogRequestError && catalogRequestError.message ? catalogRequestError.message : "RequestError"));
    }

    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}


function getWriteCortesColumnMap_(sheet) {
    const columnMap = { ...COLS_CORTES };
    // El contrato del catálogo solo incluye estos campos si existen encabezados reales.
    delete columnMap.activaTestigo1;
    delete columnMap.activaTestigo2;
    delete columnMap.activaTestigo3;
    const lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) return columnMap;
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const vinMatches = [];
    headers.forEach((value, index) => {
        if (String(value || "").trim().toLowerCase() === "vin") vinMatches.push(index + 1);
    });
    if (vinMatches.length > 1) throw new Error("La hoja Cortes contiene encabezados VIN duplicados.");
    if (vinMatches.length === 1) columnMap.vin = vinMatches[0];
    ["activaTestigo1", "activaTestigo2", "activaTestigo3"].forEach(name => {
        const matches = [];
        headers.forEach((value, index) => { if (String(value || "").trim() === name) matches.push(index + 1); });
        if (matches.length > 1) throw new Error("El encabezado " + name + " está duplicado.");
        if (matches.length === 1) columnMap[name] = matches[0];
    });
    return columnMap;
}

function normalizeWriteCatalogImageId_(value) {
    if (!value || typeof value !== "string" || !value.trim()) return null;
    const trimmed = value.trim();
    const match = trimmed.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        const fileId = match[1] || match[2] || match[3];
        return fileId && fileId.length > 20 ? fileId : null;
    }
    return trimmed.length > 20 && !trimmed.includes("/") && !trimmed.includes(":") ? trimmed : null;
}

function normalizeWriteCatalogYouTubeUrl_(url) {
    if (typeof url !== "string") return null;
    const candidate = url.trim();
    const idPattern = /^[A-Za-z0-9_-]{11}$/;
    if (idPattern.test(candidate)) return "https://www.youtube.com/embed/" + candidate + "?enablejsapi=1";
    const parts = candidate.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
    if (!parts) return null;
    const authority = parts[1].toLowerCase();
    if (authority.includes("@") || authority.includes(":")) return null;
    const host = authority, path = parts[2] || "/", query = parts[3] || "";
    let videoId = "";
    if (host === "youtu.be") {
        const match = path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
        videoId = match ? match[1] : "";
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
        if (path === "/watch") {
            const ids = [];
            try {
                query.split("&").filter(Boolean).forEach(part => {
                    const pair = part.split("=");
                    const key = decodeURIComponent(pair.shift().replace(/\+/g, " "));
                    if (key === "v") ids.push(decodeURIComponent(pair.join("=").replace(/\+/g, " ")));
                });
            } catch (error) { return null; }
            if (ids.length !== 1) return null;
            videoId = ids[0];
        } else {
            const match = path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
            videoId = match ? match[1] : "";
        }
    } else return null;
    if (!idPattern.test(videoId)) return null;
    return "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1";
}

function buildCortesCatalogChange_(reference) {
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) throw new Error("No se encontró la hoja Cortes para publicar el cambio.");
    const wanted = String(reference === null || reference === undefined ? "" : reference).trim();
    if (!wanted) throw new Error("El ID del vehículo está vacío.");
    const ids = sheet.getRange(2, COLS_CORTES.id, sheet.getLastRow() - 1, 1).getValues().flat();
    const matches = [];
    ids.forEach((id, index) => { if (String(id === null || id === undefined ? "" : id).trim() === wanted) matches.push(index + 2); });
    if (matches.length !== 1) throw new Error(matches.length ? "El ID del vehículo está duplicado." : "No se encontró la fila final del vehículo.");
    const row = sheet.getRange(matches[0], 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnMap = getWriteCortesColumnMap_(sheet);
    const imageFields = new Set(["imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura",
        "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"]);
    const snapshot = {};
    Object.keys(columnMap).forEach(key => {
        const raw = row[columnMap[key] - 1];
        const value = raw === undefined || raw === "" ? null : raw;
        snapshot[key] = imageFields.has(key) ? normalizeWriteCatalogImageId_(value) : value;
    });
    if (snapshot.videoGuiaDesarmeUrl) {
        snapshot.Video = normalizeWriteCatalogYouTubeUrl_(snapshot.videoGuiaDesarmeUrl);
        delete snapshot.videoGuiaDesarmeUrl;
    }
    const cuts = [
        { index: 1, util: parseInt(snapshot.utilCorte1, 10) || 0 },
        { index: 2, util: parseInt(snapshot.utilCorte2, 10) || 0 },
        { index: 3, util: parseInt(snapshot.utilCorte3, 10) || 0 }
    ].sort((a, b) => b.util - a.util);
    const temp = {};
    for (let index = 1; index <= 3; index++) {
        temp[index] = {
            tipo: snapshot["tipoCorte" + index], ubicacion: snapshot["ubicacionCorte" + index],
            color: snapshot["colorCableCorte" + index], config: snapshot["configRelay" + index],
            img: snapshot["imgCorte" + index], util: snapshot["utilCorte" + index],
            activaTestigo: snapshot["activaTestigo" + index], colaborador: snapshot["colaboradorCorte" + index]
        };
    }
    cuts.forEach((cut, position) => {
        const target = position + 1, source = temp[cut.index];
        snapshot["tipoCorte" + target] = source.tipo;
        snapshot["ubicacionCorte" + target] = source.ubicacion;
        snapshot["colorCableCorte" + target] = source.color;
        snapshot["configRelay" + target] = source.config;
        snapshot["imgCorte" + target] = source.img;
        snapshot["utilCorte" + target] = source.util;
        snapshot["activaTestigo" + target] = source.activaTestigo;
        snapshot["colaboradorCorte" + target] = source.colaborador;
    });
    if (String(snapshot.id === null || snapshot.id === undefined ? "" : snapshot.id).trim() !== wanted) {
        throw new Error("La fila releída no conserva el ID solicitado.");
    }
    return { collection: "cortes", recordId: wanted, operation: "upsert", snapshot: snapshot };
}

function nextWriteCatalogSourceVersion_(reference) {
    const vehicleId = String(reference === null || reference === undefined ? "" : reference).trim();
    if (!/^[1-9]\d{0,14}$/.test(vehicleId)) throw new Error("No se puede versionar un cambio de catálogo sin un ID de vehículo válido.");
    // Coordinator convierte versiones repetidas u obsoletas en reset y reconstrucción.
    return Math.max(1, Date.now());
}

function publishCortesCatalogChange_(action, reference, sourceVersion) {
    const version = Number(sourceVersion);
    if (!Number.isSafeInteger(version) || version < 1) throw new Error("La mutación no devolvió una versión de catálogo verificable.");
    const change = buildCortesCatalogChange_(reference);
    change.sourceVersion = version;
    publishSharedCatalogChange_("WRITE", action, change);
}

// ============================================================================
// HANDLERS DE ACCIONES
// ============================================================================

/* TAREA 3 (4.2, 4.4, B31): REGISTRO Y ACTUALIZACIÓN DE CORTES E IDEMPOTENCIA CON REPARACIÓN */
function runWriteDriveWorkOutsideScriptLock_(lock, state, opId, operation) {
    if (!String(opId || "").trim() || !lock || typeof lock.hasLock !== "function" || !lock.hasLock()) {
        return operation();
    }
    lock.releaseLock();
    state.releasedForDrive = true;
    let result, operationError = null;
    try { result = operation(); }
    catch (error) { operationError = error; }

    let reacquired = false;
    try { reacquired = lock.tryLock(0); } catch (lockError) { reacquired = false; }
    if (!reacquired) {
        const pendingError = new Error("La carga terminó o quedó pendiente, pero otra operación está usando WRITE. Conserva el mismo opId y reintenta para completar el registro.");
        pendingError.code = "WRITE_LOCK_REACQUIRE_PENDING";
        if (operationError) pendingError.cause = operationError;
        throw pendingError;
    }
    if (operationError) throw operationError;
    return result;
}

function prepareAddOrUpdateCutRequest_(payload) {
    // La identidad y las listas oficiales se preparan sin retener el ScriptLock global de WRITE.
    const collaboratorName = getAuthenticatedCollaborator(payload, payload && payload.silent === true ? ["desarrollador"] : undefined);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.CORTES);
    const relaySheet = ss.getSheetByName("Relay");
    const options = getAddCutPayloadValidationOptions_(sheet, relaySheet);
    const validatedPayload = validateAddOrUpdateCutPayload_(payload, options);
    return { collaboratorName: collaboratorName, actorId: String(payload && payload.__sharedSessionActor && payload.__sharedSessionActor.userId || ""), spreadsheet: ss, sheet: sheet, validatedPayload: validatedPayload };
}

function handleAppendExistingVehicleCut_(preparedRequest) {
    const payload = preparedRequest.validatedPayload;
    const vehicleId = String(payload.vehicleId || "").trim();
    const opId = String(payload.opId || "").trim();
    const spreadsheet = preparedRequest.spreadsheet;
    const sheet = preparedRequest.sheet;
    getVehicleContributionLedgerSheet_(spreadsheet);

    const operationHash = computeCutOperationFingerprint_(payload);
    if (normalizeIdempotenciaOperationHash_(payload.operationHash, "Aporte append-only de corte") !== operationHash) {
        throw new Error("La huella enviada no coincide con el contenido del corte.");
    }

    const snapshot = readSupplementaryVehicleSnapshot_(sheet, vehicleId);
    const vehicle = snapshot.vehicle;
    const cut = payload.cutData;
    const incomingVehicleData = Object.assign({}, payload.vehicleData || {});
    const entities = Object.keys(incomingVehicleData).length ? getExistingEntities(sheet) : null;
    if (entities) {
        if (incomingVehicleData.marca) incomingVehicleData.marca = resolveAndNormalizeEntity(incomingVehicleData.marca, entities.brands, false);
        if (incomingVehicleData.modelo) incomingVehicleData.modelo = resolveAndNormalizeEntity(incomingVehicleData.modelo, entities.models, false);
        if (incomingVehicleData.versionesAplicables) incomingVehicleData.versionesAplicables =
            resolveAndNormalizeEntity(incomingVehicleData.versionesAplicables, entities.versions, true);
    }

    const vinPrefix = cut.vin ? extractVinPrefix(cut.vin) : "";
    let acceptedVinPrefix = "";
    if (vinPrefix) {
        const vinColumnIndex = getVinColumnIndex(sheet);
        if (!vinColumnIndex) throw new Error("La hoja «Cortes» no contiene el encabezado «VIN»; no se puede guardar el identificador.");
        const existingVins = parseVinCollection(snapshot.rowValues[vinColumnIndex - 1]);
        if (!existingVins.includes(vinPrefix)) {
            const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, vehicleId);
            if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
            const pendingConflict = findVehicleContributionVinConflict_(spreadsheet, vinPrefix, vehicleId);
            if (pendingConflict) throw new Error("El VIN ya está reservado por otro aporte pendiente del vehículo " + pendingConflict.vehicleId + ".");
            const maxAllowed = countEquipmentVersions(incomingVehicleData.versionesAplicables || vehicle.versionesAplicables);
            addVinToAvailableSlot(existingVins, vinPrefix, maxAllowed);
            acceptedVinPrefix = vinPrefix;
        }
    }

    const metadata = {};
    ["categoria", "marca", "modelo", "versionesAplicables", "anoDesde", "anoHasta", "tipoEncendido"].forEach(field => {
        const current = String(vehicle[field] == null ? "" : vehicle[field]).trim();
        const incoming = String(incomingVehicleData[field] == null ? "" : incomingVehicleData[field]).trim();
        if (!current && incoming) metadata[field] = incomingVehicleData[field];
    });
    if (metadata.anoDesde) {
        const yearInput = String(metadata.anoDesde).trim();
        if (yearInput.includes("-")) {
            const parts = yearInput.split("-").map(value => Number(value.trim()));
            metadata.anoDesde = Math.min(parts[0], parts[1]);
            metadata.anoHasta = metadata.anoHasta || Math.max(parts[0], parts[1]);
        } else {
            metadata.anoDesde = Number(yearInput);
            metadata.anoHasta = metadata.anoHasta || metadata.anoDesde;
        }
    }

    const folderInfo = mergeVehicleFolderInfo(vehicle, incomingVehicleData);
    let cutImageUrl = "";
    let vehicleImageUrl = "";
    if (cut.imgCorte1 && cut.tipoCorte1 !== "No recomendado") {
        const folder = findOrCreateVehicleFolder(folderInfo);
        cutImageUrl = uploadImageToDrive(
            cut.imgCorte1,
            buildCanonicalImageBaseName(folderInfo, "imgCorte1"),
            folder,
            buildImageUploadOperationKey(opId, vehicleId, "imgCorte"),
            { shortLedgerLock: true }
        );
        if (!cutImageUrl) throw new Error("La carga de la imagen del corte no devolvió una URL válida.");
    }
    if (incomingVehicleData.imagenVehiculo && !checkFileIdValid(vehicle.imagenVehiculo)) {
        const folder = findOrCreateVehicleFolder(folderInfo);
        vehicleImageUrl = uploadImageToDrive(
            incomingVehicleData.imagenVehiculo,
            buildCanonicalImageBaseName(folderInfo, "imagenVehiculo"),
            folder,
            buildImageUploadOperationKey(opId, vehicleId, "imagenVehiculo"),
            { shortLedgerLock: true }
        );
        if (!vehicleImageUrl) throw new Error("La carga de la imagen del vehículo no devolvió una URL válida.");
    }
    if (vehicleImageUrl) metadata.imagenVehiculo = vehicleImageUrl;

    const contributionPayload = {
        tipo: String(cut.tipoCorte1 || ""),
        ubicacion: String(cut.ubicacionCorte1 || ""),
        color: String(cut.colorCableCorte1 || ""),
        configRelay: String(cut.configRelay1 || ""),
        activaTestigo: cut.activaTestigo1 === true,
        image: cutImageUrl,
        vehicleData: metadata,
        vinPrefix: acceptedVinPrefix
    };
    const event = appendVehicleContributionEvent_({
        spreadsheet,
        vehicleId,
        opId,
        kind: "cut",
        payload: contributionPayload,
        operationHash,
        actorId: preparedRequest.actorId,
        actorName: preparedRequest.collaboratorName
    });

    [cutImageUrl, vehicleImageUrl].filter(Boolean).forEach(url => {
        try {
            if (!markImageUploadLinked(url, { shortLedgerLock: true })) {
                Logger.log("El aporte quedó registrado, pero la imagen permanece pendiente de reconciliación: " + url);
            }
        } catch (ledgerError) {
            Logger.log("El aporte quedó registrado, pero no se pudo actualizar el journal de imágenes: " +
                String(ledgerError && ledgerError.message || ledgerError));
        }
    });

    // Un solo snapshot post-append alimenta la proyección de slots y la detección de VIN concurrente.
    const postAppendLedgerRows = readVehicleContributionLedgerRows_(getVehicleContributionLedgerSheet_(spreadsheet));
    const slotIndex = getVehicleContributionCutSlotIndex_(spreadsheet, snapshot, event.eventId, postAppendLedgerRows);
    const vinConflictAfterAppend = acceptedVinPrefix
        ? findVehicleContributionVinConflict_(spreadsheet, acceptedVinPrefix, vehicleId, postAppendLedgerRows)
        : null;
    const candidateReviewPending = slotIndex === null || Boolean(vinConflictAfterAppend);
    let message = slotIndex
        ? "Corte agregado exitosamente."
        : "El corte se conservó como candidato porque los espacios disponibles están ocupados.";
    if (vinConflictAfterAppend) {
        message += " El VIN quedó pendiente de revisión por una colisión concurrente.";
    }
    return {
        status: "success",
        message,
        vehicleId,
        opId,
        timestamp: Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy"),
        slotIndex,
        contributionEventId: event.eventId,
        operationHash,
        duplicate: event.duplicate === true,
        catalogResetRequired: true,
        candidateReviewPending,
        vinConflictPending: Boolean(vinConflictAfterAppend)
    };
}


function handleAddOrUpdateCut(payload) {
    const preparedRequest = prepareAddOrUpdateCutRequest_(payload);
    const validated = preparedRequest.validatedPayload;
    if (validated.vehicleId) {
        if (!validated.opId) {
            const opIdError = new Error("Las aportaciones a vehículos existentes requieren un opId estable para registrarse sin bloqueo por usuario.");
            opIdError.code = "WRITE_OP_ID_REQUIRED";
            throw opIdError;
        }
        return handleAppendExistingVehicleCut_(preparedRequest);
    }
    // Las solicitudes modernas reservan su ID append-only antes del lock físico.
    // Si hay contención, el reintento con el mismo opId recupera la misma reserva.
    if (validated.opId) {
        preparedRequest.preallocatedVehicleId = reserveCortesVehicleIdForOperation_(preparedRequest.sheet, {
            opId: validated.opId,
            operationHash: validated.operationHash || computeCutOperationFingerprint_(validated)
        });
    }
    // Solo las altas de vehículos nuevos requieren exclusión para fila física e Idempotencia.
    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    try { lockAcquired = lock.tryLock(0); } catch (lockError) { lockAcquired = false; }
    if (!lockAcquired) {
        const busyError = new Error("WRITE está ocupado con una operación breve de alta de vehículo. Conserva el mismo opId y reintenta.");
        busyError.code = "WRITE_BUSY";
        throw busyError;
    }
    const lockState = { releasedForDrive: false };
    let result;
    try {
        result = handleAddOrUpdateCutLocked(preparedRequest, lock, lockState);
    } finally {
        if (lock.hasLock()) lock.releaseLock();
    }
    // La versión del feed se asigna después de confirmar y liberar la transacción física.
    if (result && result.status === "success" && result.vehicleId) {
        try { result.catalogVersion = nextWriteCatalogSourceVersion_(result.vehicleId); }
        catch (versionError) {
            result.catalogResetRequired = true;
            Logger.log("La mutación se guardó, pero no se pudo preparar versión de catálogo: " + String(versionError && versionError.message || versionError));
        }
    }
    return result;
}


const CORTES_ID_COUNTER_PROPERTY = "GPSpedia_CORTES_LAST_ID";

/**
 * Devuelve el máximo ID ya existente o reservado.
 * La asignación siguiente se materializa en una fila append-only del ledger,
 * no mediante una lectura seguida de una escritura del contador.
 */
function getCortesVehicleIdHighWaterMark_(sheet, options) {
    options = options && typeof options === "object" ? options : {};
    if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
    const lastRow = sheet.getLastRow();
    const idColumnValues = sheet.getRange(1, COLS_CORTES.id, Math.max(1, lastRow), 1).getValues();
    if (String(idColumnValues[0] && idColumnValues[0][0] || "").trim() !== "id") {
        throw new Error("El encabezado de la primera columna de «Cortes» no es «id».");
    }

    let maxSheetId = 0;
    const seenIds = new Set();
    if (lastRow > 1) {
        const lastColumn = sheet.getLastColumn();
        const idValues = idColumnValues.slice(1);
        const idFormulas = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getFormulas();
        const candidateOffsets = [];
        for (let offset = 0; offset < idValues.length; offset++) {
            const rawId = idValues[offset][0];
            const hasId = rawId !== "" && rawId !== null && rawId !== undefined;
            if (!hasId || (idFormulas[offset] && idFormulas[offset][0])) candidateOffsets.push(offset);
        }

        const hasDataByOffset = new Map();
        let cursor = 0;
        while (cursor < candidateOffsets.length) {
            const firstOffset = candidateOffsets[cursor];
            let lastOffset = firstOffset;
            cursor++;
            while (cursor < candidateOffsets.length && candidateOffsets[cursor] === lastOffset + 1) {
                lastOffset = candidateOffsets[cursor];
                cursor++;
            }
            const rowCount = lastOffset - firstOffset + 1;
            let dataRows = [];
            if (lastColumn > 1) {
                dataRows = sheet.getRange(firstOffset + 2, 2, rowCount, lastColumn - 1).getValues();
            }
            for (let offset = firstOffset; offset <= lastOffset; offset++) {
                const rowData = dataRows[offset - firstOffset] || [];
                const hasData = rowData.some(value => value !== "" && value !== null && value !== undefined);
                hasDataByOffset.set(offset, hasData);
            }
        }

        for (let offset = 0; offset < idValues.length; offset++) {
            const rawId = idValues[offset][0];
            const hasId = rawId !== "" && rawId !== null && rawId !== undefined;
            const hasFormula = !!(idFormulas[offset] && idFormulas[offset][0]);
            const hasData = hasDataByOffset.get(offset) === true;
            if (!hasData && hasFormula) continue;
            if (!hasData && !hasId) continue;
            if (!hasId) throw new Error("La fila " + (offset + 2) + " contiene datos, pero no tiene ID.");

            const id = typeof rawId === "number" ? rawId : Number(String(rawId).trim());
            if (!Number.isSafeInteger(id) || id < 1) {
                throw new Error("El ID de la fila " + (offset + 2) + " no es un entero numérico positivo seguro.");
            }
            if (seenIds.has(id)) throw new Error("Se detectó el ID duplicado " + id + " en «Cortes»; no se asignó otro ID.");
            seenIds.add(id);
            maxSheetId = Math.max(maxSheetId, id);
        }
    }

    const properties = PropertiesService.getScriptProperties();
    const storedValue = properties.getProperty(CORTES_ID_COUNTER_PROPERTY);
    const storedId = storedValue === null ? 0 : Number(storedValue);
    if (!Number.isSafeInteger(storedId) || storedId < 0) {
        throw new Error("El contador central de IDs de Cortes contiene un valor inválido.");
    }
    let minimumReservedId = options.minimumReservedId === undefined ? 0 : Number(options.minimumReservedId);
    if (!Number.isSafeInteger(minimumReservedId) || minimumReservedId < 0) {
        throw new Error("El último ID reservado contiene un valor inválido.");
    }
    if (options.includeReservations !== false && typeof getSpreadsheet === "function") {
        const reservationSheet = options.reservationSheet ||
            getSpreadsheet().getSheetByName(CORTES_ID_RESERVATIONS_SHEET_NAME);
        if (reservationSheet) {
            minimumReservedId = Math.max(minimumReservedId, getLastCortesIdReservation_(reservationSheet));
        }
    }
    return Math.max(maxSheetId, storedId, minimumReservedId);
}

const CORTES_ID_RESERVATIONS_SHEET_NAME = "CortesIdReservations";
const CORTES_ID_RESERVATIONS_HEADERS = ["opId", "operationHash", "vehicleId", "createdAt"];

function normalizeCortesIdAllocationRequest_(payload) {
    const opId = String(payload && payload.opId !== undefined && payload.opId !== null ? payload.opId : "").trim();
    if (!opId) return null;
    if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId)) throw new Error("La asignación idempotente requiere un opId válido.");
    const operationHash = String(payload && payload.operationHash !== undefined && payload.operationHash !== null
        ? payload.operationHash : "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(operationHash)) throw new Error("La asignación idempotente requiere operationHash SHA-256 válido.");
    return { opId, operationHash };
}

function buildLegacyCortesIdAllocationRequest_() {
    const opId = "OP-ALLOC-LEGACY-" + Utilities.getUuid();
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, opId);
    const operationHash = digest.map(value => ("0" + (Number(value) & 255).toString(16)).slice(-2)).join("");
    return { opId, operationHash };
}

function getCortesIdReservationsSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CORTES_ID_RESERVATIONS_SHEET_NAME);
    if (!sheet) {
        try {
            sheet = ss.insertSheet(CORTES_ID_RESERVATIONS_SHEET_NAME);
        } catch (createError) {
            // Otra ejecución pudo crear la hoja entre getSheetByName e insertSheet.
            sheet = ss.getSheetByName(CORTES_ID_RESERVATIONS_SHEET_NAME);
            if (!sheet) throw createError;
        }
    }

    let headers = sheet.getRange(1, 1, 1, CORTES_ID_RESERVATIONS_HEADERS.length).getValues()[0] || [];
    const headerIsEmpty = CORTES_ID_RESERVATIONS_HEADERS.every((header, index) =>
        !String(headers[index] === null || headers[index] === undefined ? "" : headers[index]).trim());
    if (headerIsEmpty && sheet.getLastRow() <= 1) {
        // Inicializar el esquema es idempotente: dos ejecuciones pueden escribir
        // exactamente la misma fila de encabezados sin desplazar datos.
        sheet.getRange(1, 1, 1, CORTES_ID_RESERVATIONS_HEADERS.length).setValues([CORTES_ID_RESERVATIONS_HEADERS]);
        SpreadsheetApp.flush();
        headers = sheet.getRange(1, 1, 1, CORTES_ID_RESERVATIONS_HEADERS.length).getValues()[0] || [];
    }
    if (CORTES_ID_RESERVATIONS_HEADERS.some((header, index) => String(headers[index] || "").trim() !== header)) {
        throw new Error("La hoja de reservas de IDs tiene encabezados incompatibles; no se asignó ningún ID.");
    }
    return sheet;
}

function freezeCortesIdReservationFormulaRows_(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const range = sheet.getRange(2, 3, lastRow - 1, 1);
    const values = range.getValues();
    const formulas = range.getFormulas();
    let changed = false;
    for (let offset = 0; offset < formulas.length; offset++) {
        if (!(formulas[offset] && formulas[offset][0])) continue;
        const vehicleId = Number(values[offset] && values[offset][0]);
        if (!Number.isSafeInteger(vehicleId) || vehicleId < 1) {
            throw new Error("Una reserva de ID todavía no tiene un resultado numérico verificable; no se asignó otro ID.");
        }
        sheet.getRange(offset + 2, 3).setValue(vehicleId);
        changed = true;
    }
    if (changed) SpreadsheetApp.flush();
}

function findCortesIdReservation_(sheet, opId) {
    freezeCortesIdReservationFormulaRows_(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const matches = sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(opId).matchEntireCell(true).findAll();
    if (!matches.length) return null;
    const entries = matches.map(match => {
        const rowIndex = match.getRow();
        const row = sheet.getRange(rowIndex, 1, 1, CORTES_ID_RESERVATIONS_HEADERS.length).getValues()[0] || [];
        const operationHash = String(row[1] || "").trim().toLowerCase();
        const vehicleId = Number(row[2]);
        if (String(row[0] || "").trim() !== opId || !/^[a-f0-9]{64}$/.test(operationHash) ||
            !Number.isSafeInteger(vehicleId) || vehicleId < 1) {
            throw new Error("La reserva de ID para " + opId + " está incompleta o corrupta; no se modificó.");
        }
        return { opId, operationHash, vehicleId, rowIndex };
    }).sort((a, b) => a.rowIndex - b.rowIndex);

    const ids = new Set();
    entries.forEach(entry => {
        if (ids.has(entry.vehicleId)) {
            throw new Error("El ledger contiene el ID " + entry.vehicleId + " repetido para el opId " + opId + ".");
        }
        ids.add(entry.vehicleId);
    });
    // Si dos reintentos llegaron a anexar filas simultáneamente, la primera fila
    // física es la reserva canónica; las demás quedan consumidas y nunca se reutilizan.
    return entries[0];
}

function getLastCortesIdReservation_(sheet) {
    freezeCortesIdReservationFormulaRows_(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    const rows = sheet.getRange(2, 1, lastRow - 1, CORTES_ID_RESERVATIONS_HEADERS.length).getValues();
    const seenIds = new Set();
    let previousId = 0;
    rows.forEach((row, offset) => {
        const opId = String(row[0] || "").trim();
        const operationHash = String(row[1] || "").trim().toLowerCase();
        const vehicleId = Number(row[2]);
        if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId) || !/^[a-f0-9]{64}$/.test(operationHash) ||
            !Number.isSafeInteger(vehicleId) || vehicleId < 1) {
            throw new Error("La reserva de ID de la fila " + (offset + 2) + " está incompleta o corrupta.");
        }
        if (vehicleId <= previousId || seenIds.has(vehicleId)) {
            throw new Error("El ledger de reservas de IDs no conserva una secuencia estrictamente creciente y única.");
        }
        seenIds.add(vehicleId);
        previousId = vehicleId;
    });
    return previousId;
}

function buildCortesIdReservationFormula_(highWaterMark) {
    const base = Number(highWaterMark);
    if (!Number.isSafeInteger(base) || base < 0) throw new Error("El máximo reservado de IDs no es válido.");
    // Cada fila toma el máximo de las reservas anteriores y del máximo ya verificado.
    // ROW() hace que dos appendRow concurrentes calculen IDs distintos por orden físico.
    return "=MAX($C$1:INDEX($C:$C,ROW()-1)," + base + ")+1";
}

function reserveCortesVehicleIdForOperation_(cortesSheet, request) {
    if (!request || !/^OP-[A-Za-z0-9_-]{1,100}$/.test(String(request.opId || "")) ||
        !/^[a-f0-9]{64}$/.test(String(request.operationHash || ""))) {
        throw new Error("La reserva de ID requiere opId y operationHash SHA-256 válidos.");
    }
    const ledger = getCortesIdReservationsSheet_();
    const lastReservedId = getLastCortesIdReservation_(ledger);
    const existing = findCortesIdReservation_(ledger, request.opId);
    if (existing) {
        if (existing.operationHash !== request.operationHash) {
            throw new Error("El opId ya reservó un vehicleId con otro contenido; no se asignó un ID nuevo.");
        }
        return existing.vehicleId;
    }

    const highWaterMark = getCortesVehicleIdHighWaterMark_(cortesSheet, {
        includeReservations: false,
        minimumReservedId: lastReservedId
    });
    ledger.appendRow([
        request.opId,
        request.operationHash,
        buildCortesIdReservationFormula_(highWaterMark),
        new Date().toISOString()
    ]);
    SpreadsheetApp.flush();

    const verified = findCortesIdReservation_(ledger, request.opId);
    const verifiedHighWater = getLastCortesIdReservation_(ledger);
    if (!verified || verifiedHighWater < verified.vehicleId) {
        throw new Error("No se pudo verificar la reserva persistente del vehicleId para " + request.opId + ".");
    }
    if (verified.operationHash !== request.operationHash) {
        throw new Error("El opId ya reservó un vehicleId con otro contenido; no se asignó un ID nuevo.");
    }
    return verified.vehicleId;
}

/** Endpoint autenticado de asignación; el ledger append-only determina la secuencia sin ScriptLock. */
function handleAllocateVehicleId(payload) {
    assertDeveloperForIdMaintenance(payload);
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const request = normalizeCortesIdAllocationRequest_(payload) || buildLegacyCortesIdAllocationRequest_();
    const vehicleId = reserveCortesVehicleIdForOperation_(sheet, request);
    return { status: "success", vehicleId };
}

function assertDeveloperForIdMaintenance(payload) {
    return getAuthenticatedCollaborator(payload, ["desarrollador"]);
}

function verifyCortesIdsBackup(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    const backupId = match ? match[1] : raw;
    if (!/^[a-zA-Z0-9_-]{20,}$/.test(backupId) || backupId === SPREADSHEET_ID) {
        throw new Error("Se requiere un respaldo de Spreadsheet válido y distinto de producción.");
    }
    const file = DriveApp.getFileById(backupId);
    if (file.isTrashed() || file.getMimeType() !== MimeType.GOOGLE_SHEETS ||
        !String(file.getName() || "").startsWith("GPSpedia_DB_BACKUP_")) {
        throw new Error("El recurso indicado no es un respaldo de Spreadsheet válido.");
    }
    const rootId = DriveApp.getRootFolder().getId();
    const parents = file.getParents();
    let rootChild = false;
    while (parents.hasNext()) if (parents.next().getId() === rootId) rootChild = true;
    if (!rootChild) throw new Error("El respaldo debe estar directamente en la raíz de Drive.");
    const backup = SpreadsheetApp.openById(backupId);
    const backupCortes = backup.getSheetByName(SHEET_NAMES.CORTES);
    if (!backupCortes || backupCortes.getLastColumn() < 45) {
        throw new Error("El respaldo no contiene una hoja Cortes compatible con la estructura inventariada.");
    }
    return backupId;
}

function buildCortesIdFreezePlan(sheet) {
    if (!sheet) throw new Error("No se encontró la hoja «Cortes».");
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2) return { finalValues: [], formulasToFreeze: 0, emptyFormulaRowsToClear: 0, rowsWithData: 0, maxId: 0 };

    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const formulas = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getFormulas();
    const seenIds = new Set();
    const finalValues = [];
    let formulasToFreeze = 0, emptyFormulaRowsToClear = 0, rowsWithData = 0, maxId = 0;

    rows.forEach((row, index) => {
        const rawId = row[COLS_CORTES.id - 1];
        const hasData = row.slice(1).some(value => value !== "" && value !== null && value !== undefined);
        const hasId = rawId !== "" && rawId !== null && rawId !== undefined;
        const hasFormula = Boolean(formulas[index][0]);
        if (hasData) {
            rowsWithData++;
            if (!hasId) throw new Error(`La fila ${index + 2} contiene datos, pero no tiene ID.`);
        }
        if (hasFormula && !hasData) {
            emptyFormulaRowsToClear++;
            finalValues.push([""]);
            return;
        }
        if (hasId) {
            const id = typeof rawId === "number" ? rawId : Number(String(rawId).trim());
            if (!Number.isSafeInteger(id) || id < 1) throw new Error(`El ID de la fila ${index + 2} no es un entero numérico positivo seguro.`);
            if (seenIds.has(id)) throw new Error(`Se detectó el ID duplicado ${id}; no se modificó ninguna fórmula.`);
            seenIds.add(id);
            maxId = Math.max(maxId, id);
        }
        if (hasFormula) {
            if (!hasId) throw new Error(`La fórmula de ID de la fila ${index + 2} no devuelve un valor válido.`);
            formulasToFreeze++;
        }
        finalValues.push([rawId]);
    });
    return { finalValues, formulasToFreeze, emptyFormulaRowsToClear, rowsWithData, maxId };
}

/** Convierte fórmulas heredadas en valores sin alterar los valores calculados ni el formato de celda. */
function handleFreezeCortesIds(payload) {
    assertDeveloperForIdMaintenance(payload);
    const backupId = verifyCortesIdsBackup(payload && payload.backupId);
    const lock = LockService.getScriptLock();
    let lockAcquired = false;
    try {
        try { lockAcquired = lock.tryLock(0); } catch (lockError) { lockAcquired = false; }
        if (!lockAcquired) {
            const busyError = new Error("WRITE está ocupado con otra operación de escritura. Reintenta la estabilización de IDs en unos instantes.");
            busyError.code = "WRITE_BUSY";
            throw busyError;
        }
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        const plan = buildCortesIdFreezePlan(sheet);
        const summary = {
            backupId,
            rowsWithData: plan.rowsWithData,
            formulasToFreeze: plan.formulasToFreeze,
            emptyFormulaRowsToClear: plan.emptyFormulaRowsToClear,
            maxId: plan.maxId
        };
        if (!payload || payload.confirm !== true) {
            return { status: "success", dryRun: true, ...summary, message: "Simulación completada; no se modificó Cortes." };
        }

        const properties = PropertiesService.getScriptProperties();
        const storedValue = properties.getProperty(CORTES_ID_COUNTER_PROPERTY);
        const storedId = storedValue === null ? 0 : Number(storedValue);
        if (!Number.isSafeInteger(storedId) || storedId < 0) throw new Error("El contador central de IDs contiene un valor inválido.");
        properties.setProperty(CORTES_ID_COUNTER_PROPERTY, String(Math.max(storedId, plan.maxId)));

        if (plan.finalValues.length) {
            const idRange = sheet.getRange(2, COLS_CORTES.id, plan.finalValues.length, 1);
            idRange.setValues(plan.finalValues);
            SpreadsheetApp.flush();
            const valuesAfter = idRange.getValues();
            const formulasAfter = idRange.getFormulas();
            for (let index = 0; index < plan.finalValues.length; index++) {
                if (String(valuesAfter[index][0] ?? "") !== String(plan.finalValues[index][0] ?? "") || formulasAfter[index][0]) {
                    throw new Error(`No se pudo verificar la conversión estática del ID en la fila ${index + 2}.`);
                }
            }
        }
        return {
            status: "success",
            dryRun: false,
            ...summary,
            message: "Las fórmulas heredadas se convirtieron en valores estáticos y se conservaron los formatos de celda."
        };
    } finally {
        if (lockAcquired) lock.releaseLock();
    }
}


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

function findNextAvailableCutSlot_(rowValues, vehicleId) {
    if (!Array.isArray(rowValues)) throw new Error("No se pudo verificar la disponibilidad de los espacios de corte.");
    const reservedSlots = new Set();
    if (vehicleId) {
        const entries = readIdempotenciaEntries_(getIdempotenciaSheet(), false).entries;
        entries.forEach(entry => {
            if (entry.status === "pending" && String(entry.vehicleId) === String(vehicleId)) {
                reservedSlots.add(Number(entry.slotIndex));
            }
        });
    }
    for (let slot = 1; slot <= 3; slot++) {
        const column = COLS_CORTES['tipoCorte' + slot];
        if (!column) throw new Error("La estructura de columnas de cortes no es válida.");
        const value = rowValues[column - 1];
        if ((value === null || value === undefined || String(value).trim() === "") && !reservedSlots.has(slot)) return slot;
    }
    return null;
}

function isAddCutPlainObject_(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function validateAddCutText_(value, field, required, maxLength, preserveWhitespace) {
    if (value === undefined || value === null) value = "";
    if (typeof value !== "string") throw new Error("El campo " + field + " debe ser texto.");
    const clean = value.trim();
    if (required && !clean) throw new Error("El campo " + field + " es obligatorio.");
    if (clean.length > maxLength) throw new Error("El campo " + field + " supera el máximo de " + maxLength + " caracteres.");
    return preserveWhitespace ? value : clean;
}
function validateAddCutImage_(value, field) {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") throw new Error("La imagen " + field + " debe enviarse como texto Base64.");
    const match = value.match(/^data:(image\/(?:jpeg|png|gif|webp|bmp|avif|heic|heif));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match || !match[2] || match[2].length % 4 !== 0) throw new Error("La imagen " + field + " no tiene un formato Base64 de imagen permitido.");
    const estimatedBytes = Math.floor(match[2].length * 3 / 4) - (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
    if (estimatedBytes < 1) throw new Error("La imagen " + field + " está vacía.");
    if (estimatedBytes > 10 * 1024 * 1024) throw new Error("La imagen " + field + " supera el límite de 10 MB.");
    return value;
}
function validateAddCutYearRange_(value) {
    const raw = validateAddCutText_(value, "anoDesde", true, 11, true);
    const clean = raw.trim();
    const match = clean.match(/^(\d{4})(?:\s*-\s*(\d{4}))?$/);
    if (!match) throw new Error("El año debe ser YYYY o un rango YYYY-YYYY.");
    const start = Number(match[1]), end = match[2] ? Number(match[2]) : start;
    const maxYear = new Date().getFullYear() + 2;
    if (start < 1886 || end < 1886 || start > maxYear || end > maxYear) throw new Error("El rango de años está fuera del intervalo permitido.");
    if (start > end) throw new Error("El año inicial no puede ser mayor que el año final.");
    return raw;
}
function validateAddOrUpdateCutPayload_(payload, options) {
    options = isAddCutPlainObject_(options) ? options : {};
    if (!isAddCutPlainObject_(payload)) throw new Error("La solicitud de corte debe ser un objeto válido.");
    const allowed = (list, value, field) => {
        const values = Array.isArray(list) ? list.map(item => String(item == null ? "" : item).trim()).filter(Boolean) : [];
        if (!values.length) throw new Error("No está disponible la lista oficial para validar " + field + ".");
        const candidate = typeof value === "string" ? value.trim() : String(value == null ? "" : value);
        if (!values.includes(candidate)) throw new Error("El valor de " + field + " no pertenece a la lista oficial vigente.");
    };
    const vehicleIdRaw = payload.vehicleId === undefined || payload.vehicleId === null || payload.vehicleId === "" ? "" : String(payload.vehicleId).trim();
    let vehicleId = null;
    if (vehicleIdRaw) {
        if (!/^[1-9]\d{0,14}$/.test(vehicleIdRaw) || !Number.isSafeInteger(Number(vehicleIdRaw))) throw new Error("El ID del vehículo debe ser un entero positivo válido.");
        vehicleId = vehicleIdRaw;
    }
    if (!isAddCutPlainObject_(payload.cutData)) throw new Error("Los datos del corte son requeridos y deben tener una estructura válida.");
    const cut = payload.cutData;
    const cutKeys = new Set(["tipoCorte1","configRelay1","ubicacionCorte1","colorCableCorte1","activaTestigo1","imgCorte1","vin"]);
    Object.keys(cut).forEach(key => { if (!cutKeys.has(key)) throw new Error("El campo de corte " + key + " no está permitido."); });
    const cutData = {
        tipoCorte1: validateAddCutText_(cut.tipoCorte1, "tipoCorte1", true, 100),
        configRelay1: validateAddCutText_(cut.configRelay1, "configRelay1", false, 200),
        ubicacionCorte1: validateAddCutText_(cut.ubicacionCorte1, "ubicacionCorte1", true, 10000, true),
        colorCableCorte1: validateAddCutText_(cut.colorCableCorte1, "colorCableCorte1", false, 200, true),
        activaTestigo1: cut.activaTestigo1,
        imgCorte1: validateAddCutImage_(cut.imgCorte1, "imgCorte1"),
        vin: validateAddCutText_(cut.vin, "vin", false, 50, true)
    };
    if (typeof cutData.activaTestigo1 !== "boolean") throw new Error("El campo activaTestigo1 debe ser booleano.");
    allowed(options.tipoDeCorte, cutData.tipoCorte1, "tipoCorte1");
    const noRecommended = /^no recomendado$/i.test(cutData.tipoCorte1.trim());
    if (!noRecommended) {
        if (!cutData.configRelay1.trim()) throw new Error("La configuración Relay es obligatoria para este tipo de corte.");
        allowed(options.configRelay, cutData.configRelay1, "configRelay1");
    } else if (cutData.configRelay1.trim()) {
        allowed(options.configRelay, cutData.configRelay1, "configRelay1");
    }
    if (cutData.vin) extractVinPrefix(cutData.vin);
    let vehicleData = null;
    if (payload.vehicleData !== undefined && payload.vehicleData !== null) {
        if (!isAddCutPlainObject_(payload.vehicleData)) throw new Error("Los datos del vehículo deben tener una estructura válida.");
        const v = payload.vehicleData;
        const vehicleKeys = new Set(["categoria","marca","modelo","versionesAplicables","anoDesde","anoHasta","tipoEncendido","imagenVehiculo"]);
        Object.keys(v).forEach(key => { if (!vehicleKeys.has(key)) throw new Error("El campo de vehículo " + key + " no está permitido."); });
        vehicleData = {
            categoria: validateAddCutText_(v.categoria, "categoria", !vehicleId, 80),
            marca: validateAddCutText_(v.marca, "marca", !vehicleId, 120, true),
            modelo: validateAddCutText_(v.modelo, "modelo", !vehicleId, 120, true),
            versionesAplicables: validateAddCutText_(v.versionesAplicables, "versionesAplicables", false, 500, true),
            anoDesde: v.anoDesde === undefined || v.anoDesde === null || v.anoDesde === "" ? "" : validateAddCutYearRange_(v.anoDesde),
            anoHasta: validateAddCutText_(v.anoHasta, "anoHasta", false, 4, true),
            tipoEncendido: validateAddCutText_(v.tipoEncendido, "tipoEncendido", !vehicleId, 80),
            imagenVehiculo: validateAddCutImage_(v.imagenVehiculo, "imagenVehiculo")
        };
        if (!vehicleId) {
            if (!vehicleData.anoDesde) throw new Error("El campo anoDesde es obligatorio para un vehículo nuevo.");
            allowed(options.categoria, vehicleData.categoria, "categoria");
            allowed(options.tipoEncendido, vehicleData.tipoEncendido, "tipoEncendido");
        } else {
            if (vehicleData.categoria) allowed(options.categoria, vehicleData.categoria, "categoria");
            if (vehicleData.tipoEncendido) allowed(options.tipoEncendido, vehicleData.tipoEncendido, "tipoEncendido");
            if (vehicleData.anoDesde) validateAddCutYearRange_(vehicleData.anoDesde);
        }
        if (vehicleData.anoHasta && !/^\d{4}$/.test(vehicleData.anoHasta)) throw new Error("El campo anoHasta debe contener un año de cuatro dígitos.");
    } else if (!vehicleId) {
        throw new Error("Los datos del vehículo son obligatorios para crear un registro nuevo.");
    }
    if (payload.silent !== undefined && typeof payload.silent !== "boolean") throw new Error("El indicador silent debe ser booleano.");
    const legacyOpMatch = !payload.opId && typeof payload.colaborador === "string" ? payload.colaborador.match(/\[(OP-[a-zA-Z0-9_-]+)\]/) : null;
    const opId = payload.opId === undefined || payload.opId === null || payload.opId === "" ? (legacyOpMatch ? legacyOpMatch[1] : "") : String(payload.opId).trim();
    let operationHash = payload.operationHash === undefined || payload.operationHash === null || payload.operationHash === "" ? "" : String(payload.operationHash).trim().toLowerCase();
    if (opId && !/^OP-[A-Za-z0-9_-]{1,120}$/.test(opId)) throw new Error("El identificador opId no tiene un formato válido.");
    if (opId && operationHash && !/^[a-f0-9]{64}$/.test(operationHash)) throw new Error("Una operación con opId requiere operationHash SHA-256 válido.");
    if (opId && !operationHash) {
        operationHash = computeCutOperationFingerprint_({
            vehicleId: vehicleId,
            vehicleData: vehicleData,
            cutData: cutData,
            silent: payload.silent === true
        });
    }
    if (!opId && operationHash) throw new Error("No se acepta operationHash sin opId.");
    return {
        vehicleId: vehicleId,
        vehicleData: vehicleData,
        cutData: cutData,
        silent: payload.silent === true,
        opId: opId || undefined,
        operationHash: operationHash || undefined,
        userId: payload.userId,
        sessionToken: payload.sessionToken,
        colaborador: payload.colaborador
    };
}
function getAddCutPayloadValidationOptions_(sheet, relaySheet) {
    if (!sheet || !relaySheet) throw new Error("No están disponibles las hojas necesarias para validar las listas oficiales de WRITE.");
    const lastRow = sheet.getLastRow(), lastColumn = sheet.getLastColumn();
    const firstColumn = COLS_CORTES.categoria;
    const lastRequiredColumn = Math.min(lastColumn, Math.max(COLS_CORTES.tipoEncendido, COLS_CORTES.tipoCorte1, COLS_CORTES.tipoCorte2, COLS_CORTES.tipoCorte3));
    const readWidth = Math.max(0, lastRequiredColumn - firstColumn + 1);
    const rows = lastRow > 1 && readWidth > 0 ? sheet.getRange(2, firstColumn, lastRow - 1, readWidth).getValues() : [];
    const valueAt = (row, column) => {
        const offset = column - firstColumn;
        return offset >= 0 && offset < row.length ? row[offset] : undefined;
    };
    const unique = values => Array.from(new Set(values.map(value => String(value == null ? "" : value).trim()).filter(Boolean)));
    let categories = [];
    const rule = sheet.getRange(2, COLS_CORTES.categoria).getDataValidation();
    if (rule && typeof rule.getCriteriaValues === "function") {
        const criteria = rule.getCriteriaValues()[0];
        if (criteria && typeof criteria.getValues === "function") categories = unique(criteria.getValues().flat());
        else if (Array.isArray(criteria)) categories = unique(criteria.flat());
    }
    if (!categories.length) categories = unique(rows.map(row => valueAt(row, COLS_CORTES.categoria)));
    const tipoDeCorte = unique(rows.flatMap(row => [valueAt(row, COLS_CORTES.tipoCorte1), valueAt(row, COLS_CORTES.tipoCorte2), valueAt(row, COLS_CORTES.tipoCorte3)]));
    const tipoEncendido = unique(rows.map(row => valueAt(row, COLS_CORTES.tipoEncendido)));
    const relayLastRow = relaySheet.getLastRow();
    const relayRows = relayLastRow > 1 ? relaySheet.getRange(2, 2, relayLastRow - 1, 1).getValues() : [];
    const configRelay = unique(relayRows.map(row => row[0]));
    return { categoria: categories, tipoDeCorte: tipoDeCorte, tipoEncendido: tipoEncendido, configRelay: configRelay };
}
function handleAddOrUpdateCutLocked(preparedRequest, lock, lockState) {
    const collaboratorName = preparedRequest.collaboratorName;
    const ss = preparedRequest.spreadsheet;
    const sheet = preparedRequest.sheet;
    const validatedPayload = preparedRequest.validatedPayload;
    const vehicleId = validatedPayload.vehicleId;
    const lastRowBefore = sheet.getLastRow();
    let existingRowIndex = null, existingRowValues = null, existingRowFormulas = null;
    if (vehicleId) {
        const ids = lastRowBefore > 1 ? sheet.getRange(2, COLS_CORTES.id, lastRowBefore - 1, 1).getValues().flat() : [];
        const matches = [];
        ids.forEach((id, index) => { if (String(id == null ? "" : id).trim() === vehicleId) matches.push(index + 2); });
        if (matches.length !== 1) throw new Error(matches.length ? "El ID del vehículo aparece duplicado; no se realizó ninguna modificación." : "El ID del vehículo no fue encontrado.");
        existingRowIndex = matches[0];
        existingRowValues = sheet.getRange(existingRowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
        existingRowFormulas = sheet.getRange(existingRowIndex, 1, 1, sheet.getLastColumn()).getFormulas()[0];
    }
    const opId = validatedPayload.opId || "";
    const idempotencySheetBefore = opId ? getIdempotenciaSheet() : ss.getSheetByName(SHEET_NAMES.IDEMPOTENCIA);
    // La operación solo necesita el estado de su opId; no recorrer todo el historial bajo lock.
    const idempotencyEntriesSnapshot = opId && idempotencySheetBefore
        ? { entries: [], byOpId: new Map(), sheet: idempotencySheetBefore }
        : null;
    if (idempotencyEntriesSnapshot) {
        const currentEntry = readIdempotenciaEntryByOpId_(idempotencySheetBefore, opId);
        if (currentEntry) {
            idempotencyEntriesSnapshot.entries.push(currentEntry);
            idempotencyEntriesSnapshot.byOpId.set(opId, currentEntry);
        }
    }
    let opRowIndex = null, opRowValues = null, opLastRowBefore = idempotencySheetBefore ? idempotencySheetBefore.getLastRow() : 0;
    const opEntryBefore = idempotencyEntriesSnapshot && idempotencyEntriesSnapshot.byOpId.get(opId);
    if (opEntryBefore) {
        opRowIndex = opEntryBefore.rowIndex;
        opRowValues = idempotencySheetBefore.getRange(opRowIndex, 1, 1, IDEMPOTENCIA_HEADERS.length).getValues()[0];
    }
    try {
        return handleAddOrUpdateCutLockedUnsafe_(validatedPayload, lock, lockState, collaboratorName, idempotencyEntriesSnapshot, {
            rowIndex: existingRowIndex,
            rowValues: existingRowValues
        }, preparedRequest.preallocatedVehicleId);
    } catch (error) {
        if ((lockState && lockState.releasedForDrive) || (lock && !lock.hasLock())) {
            // Tras una carga fuera del lock puede haber otras escrituras válidas en la misma fila.
            // Se conserva el opId pending para que el siguiente intento complete solo los campos faltantes.
            throw error;
        }
        const rollbackErrors = [];
        try {
            if (existingRowIndex && existingRowValues) {
                sheet.getRange(existingRowIndex, 1, 1, existingRowValues.length).setValues([existingRowValues]);
                existingRowFormulas.forEach((formula, index) => { if (formula) sheet.getRange(existingRowIndex, index + 1).setFormula(formula); });
                SpreadsheetApp.flush();
            } else if (sheet.getLastRow() === lastRowBefore + 1) {
                sheet.deleteRow(lastRowBefore + 1);
                SpreadsheetApp.flush();
            }
        } catch (rollbackError) { rollbackErrors.push("Cortes: " + String(rollbackError.message || rollbackError)); }
        try {
            const idempotencySheet = idempotencySheetBefore;
            if (idempotencySheet && opId) {
                if (opRowIndex && opRowValues) {
                    idempotencySheet.getRange(opRowIndex, 1, 1, opRowValues.length).setValues([opRowValues]);
                } else {
                    const last = idempotencySheet.getLastRow();
                    if (last > opLastRowBefore && String(idempotencySheet.getRange(last, 1).getValue() || "").trim() === opId) idempotencySheet.deleteRow(last);
                }
                SpreadsheetApp.flush();
            }
        } catch (rollbackError) { rollbackErrors.push("Idempotencia: " + String(rollbackError.message || rollbackError)); }
        if (rollbackErrors.length) {
            throw new Error("La operación falló: " + String(error && error.message || error) +
                ". La reversión no pudo confirmarse completamente (" + rollbackErrors.join("; ") +
                "). No reintentes con otro opId; conserva el identificador original para recuperación.");
        }
        throw error;
    }
}

function buildCutSlotCoreValues_(cutData, imageUrl) {
    return [
        cutData.tipoCorte1,
        cutData.ubicacionCorte1,
        cutData.colorCableCorte1,
        cutData.configRelay1,
        imageUrl || ""
    ];
}

function getPreparedExistingVehicleRow_(sheet, vehicleId, snapshot) {
    if (!sheet || !snapshot || !Number.isInteger(snapshot.rowIndex) || snapshot.rowIndex < 2 ||
        !Array.isArray(snapshot.rowValues)) {
        throw new Error("No se recibió una fila de vehículo previamente localizada.");
    }
    const lastColumn = sheet.getLastColumn();
    const rowValues = snapshot.rowValues.length === lastColumn
        ? snapshot.rowValues.slice()
        : sheet.getRange(snapshot.rowIndex, 1, 1, lastColumn).getValues()[0];
    if (String(rowValues[COLS_CORTES.id - 1] == null ? "" : rowValues[COLS_CORTES.id - 1]).trim() !== String(vehicleId).trim()) {
        throw new Error("El vehículo cambió después de su localización; no se realizó ninguna modificación.");
    }
    return { rowIndex: snapshot.rowIndex, rowValues: rowValues };
}

function handleAddOrUpdateCutLockedUnsafe_(payload, lock, lockState, collaboratorName, idempotencyEntriesSnapshot, existingVehicleSnapshot, preallocatedVehicleId) {
    payload = payload && typeof payload === 'object' ? payload : {};
    const { vehicleData, cutData, vehicleId } = payload;
    if (!cutData) {
        throw new Error("Los datos del corte son requeridos.");
    }

    const colaboradorName = String(collaboratorName || "").trim();
    let opId = payload.opId || null;
    // Compatibilidad con operaciones antiguas: solo se extrae el opId del campo heredado.
    // El nombre de colaborador enviado por el cliente nunca se utiliza como identidad.
    if (!opId && typeof payload.colaborador === 'string') {
        const opMatch = payload.colaborador.match(/\[(OP-[a-zA-Z0-9_-]+)\]/);
        if (opMatch) opId = opMatch[1];
    }
    const operationHash = opId ? computeCutOperationFingerprint_(payload) : null;
    if (opId && normalizeIdempotenciaOperationHash_(payload.operationHash, "Solicitud addOrUpdateCut") !== operationHash) {
        throw new Error("La huella enviada no coincide con el contenido de la operación.");
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    ensureTestigoColumns(sheet);
    const vinColumnIndex = getVinColumnIndex(sheet);
    const vinPrefix = cutData.vin ? extractVinPrefix(cutData.vin) : "";
    if (cutData.vin && !vinColumnIndex) {
        throw new Error("La hoja «Cortes» no contiene el encabezado «VIN»; no se puede guardar el identificador sin alterar otras columnas.");
    }

    if (opId) {
        const match = findRowByOpId(sheet, opId, idempotencyEntriesSnapshot);
        if (match) {
            if (!match.operationHash || match.operationHash !== operationHash) {
                throw new Error("El opId ya existe, pero su contenido no coincide o pertenece a un registro legado sin huella verificable.");
            }
            const storedVehicleId = normalizeIdempotenciaVehicleId_(match.vehicleId || match.rowValues[COLS_CORTES.id - 1], "Reintento addOrUpdateCut");
            if (vehicleId && storedVehicleId !== normalizeIdempotenciaVehicleId_(vehicleId, "Reintento addOrUpdateCut")) {
                throw new Error("El opId ya está vinculado a otro vehículo; no se modificó.");
            }
            const rowIndex = match.rowIndex;
            const rowValues = match.rowValues;
            const rowObj = mapRowToObject(rowValues, COLS_CORTES);
            let recoveredVinCollection = null;
            if (vinPrefix) {
                const existing = parseVinCollection(rowValues[vinColumnIndex - 1]);
                if (!existing.includes(vinPrefix)) {
                    const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, rowObj.id);
                    if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
                    const maxAllowed = countEquipmentVersions((vehicleData && vehicleData.versionesAplicables) || rowObj.versionesAplicables);
                    recoveredVinCollection = addVinToAvailableSlot(existing, vinPrefix, maxAllowed).collection;
                }
            }
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
                    const filename = buildCanonicalImageBaseName(rowObj, "imagenVehiculo", "_repaired");
                    const newUrl = runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => {
                        const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
                        return uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imagenVehiculo"), { shortLedgerLock: true });
                    });
                    sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).setValue(newUrl);
                }
            }

            // 2. Check and repair cut image if it was registered but is invalid/corrupted/trashed
            if (cutData && cutData.imgCorte1 && cutData.tipoCorte1 !== 'No recomendado') {
                const currentCorteImg = rowObj[`imgCorte${slotIndex}`];
                if (!checkFileIdValid(currentCorteImg)) {
                    const filename = buildCanonicalImageBaseName(rowObj, "imgCorte" + slotIndex, "_repaired");
                    const newCorteImgUrl = runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => {
                        const folder = findOrCreateVehicleFolder(mergeVehicleFolderInfo(rowObj, vehicleData));
                        return uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, rowObj.id, "imgCorte" + slotIndex), { shortLedgerLock: true });
                    });
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
                sheet.getRange(rowIndex, vinColumnIndex).setValue(JSON.stringify(recoveredVinCollection));
            }
            if (match.timestamp && (match.status === "pending" || !rowObj.timestamp)) {
                sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(match.timestamp);
            }
            SpreadsheetApp.flush();
            runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES.imagenVehiculo).getValue(), { shortLedgerLock: true }));
            runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + slotIndex]).getValue(), { shortLedgerLock: true }));
            if (opId && rowObj.id) {
                recordOpId(opId, rowObj.id, slotIndex, match.timestamp || rowObj.timestamp, "completed", operationHash, idempotencyEntriesSnapshot);
            }
            return {
                status: 'success',
                message: 'La operación ya fue completada (recuperada, reparada y completada).',
                vehicleId: rowObj.id, timestamp: match.timestamp || rowObj.timestamp,
                slotIndex: slotIndex, operationHash: operationHash
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
    let savedSlotIndex = 1;

    if (vinPrefix && !vehicleId) {
        const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, null);
        if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
    }

    if (vehicleId) { // --- Lógica para vehículo EXISTENTE ---
        const existingVehicleRow = getPreparedExistingVehicleRow_(sheet, vehicleId, existingVehicleSnapshot);
        rowIndex = existingVehicleRow.rowIndex;
        const rowValues = existingVehicleRow.rowValues;
        const vehicleInfo = mapRowToObject(rowValues, COLS_CORTES);
        let updatedVinCollection = null;
        if (vinPrefix) {
            const existingVinCollection = parseVinCollection(rowValues[vinColumnIndex - 1]);
            if (!existingVinCollection.includes(vinPrefix)) {
                const duplicate = checkVinDuplicateInSheet(sheet, vinPrefix, vehicleId);
                if (duplicate) throw new Error("VIN ya está registrado para: " + duplicate.modelName);
                const maxAllowed = countEquipmentVersions((vehicleData && vehicleData.versionesAplicables) || vehicleInfo.versionesAplicables);
                updatedVinCollection = addVinToAvailableSlot(existingVinCollection, vinPrefix, maxAllowed).collection;
            }
        }

        const cutSlotIndex = findNextAvailableCutSlot_(rowValues, vehicleId);
        if (cutSlotIndex === null) throw new Error("No hay espacios disponibles para más cortes.");
        savedSlotIndex = cutSlotIndex;

        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "pending", operationHash, idempotencyEntriesSnapshot);

        let imageUrl = '';
        if (cutData.imgCorte1) {
            const filename = buildCanonicalImageBaseName(vehicleInfo, "imgCorte" + cutSlotIndex);
            imageUrl = runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => {
                const folder = findOrCreateVehicleFolder(vehicleInfo);
                return uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, vehicleId, "imgCorte" + cutSlotIndex), { shortLedgerLock: true });
            });
        }

        const slotCoreValues = buildCutSlotCoreValues_(cutData, imageUrl);
        sheet.getRange(rowIndex, COLS_CORTES[`tipoCorte${cutSlotIndex}`], 1, slotCoreValues.length).setValues([slotCoreValues]);
        sheet.getRange(rowIndex, COLS_CORTES[`activaTestigo${cutSlotIndex}`]).setValue(cutData.activaTestigo1 === true);
        sheet.getRange(rowIndex, COLS_CORTES[`colaboradorCorte${cutSlotIndex}`]).setValue(colaboradorName);
        if (updatedVinCollection) {
            sheet.getRange(rowIndex, vinColumnIndex).setValue(JSON.stringify(updatedVinCollection));
        }
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);
        SpreadsheetApp.flush();
        runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => markImageUploadLinked(sheet.getRange(rowIndex, COLS_CORTES["imgCorte" + cutSlotIndex]).getValue(), { shortLedgerLock: true }));
        if (opId) recordOpId(opId, vehicleId, cutSlotIndex, formattedDate, "completed", operationHash, idempotencyEntriesSnapshot);

        newId = vehicleId;

    } else { // --- Lógica para vehículo NUEVO (CORREGIDO PARA PRESERVAR FÓRMULA DE ID) ---
        if (!vehicleData) throw new Error("Los datos del vehículo son requeridos para un nuevo registro.");

        var entities = getExistingEntities(sheet);
        vehicleData.marca = resolveAndNormalizeEntity(vehicleData.marca, entities.brands, false);
        vehicleData.modelo = resolveAndNormalizeEntity(vehicleData.modelo, entities.models, false);
        vehicleData.versionesAplicables = resolveAndNormalizeEntity(vehicleData.versionesAplicables, entities.versions, true);

        if (Number.isSafeInteger(preallocatedVehicleId) && preallocatedVehicleId > 0) {
            newId = preallocatedVehicleId;
        } else {
            const reservationRequest = {
                opId: opId || ("OP-WRITE-LEGACY-" + Utilities.getUuid()),
                operationHash: operationHash || computeCutOperationFingerprint_(payload)
            };
            // Compatibilidad legacy: reservar bajo el lock porque el cliente no envía opId estable.
            newId = reserveCortesVehicleIdForOperation_(sheet, reservationRequest);
        }

        const lastRow = sheet.getLastRow();
        rowIndex = lastRow + 1;
        const lastColumn = sheet.getLastColumn();

        // Copiar únicamente formato/validaciones; el ID lo asigna el backend.
        const previousRowRange = sheet.getRange(lastRow, 1, 1, lastColumn);
        const newRowRange = sheet.getRange(rowIndex, 1, 1, lastColumn);
        previousRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        previousRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);

        // Limpiar los datos heredados; no se copian fórmulas de la fila anterior.
        const dataRange = sheet.getRange(rowIndex, 2, 1, lastColumn - 1);
        dataRange.clearContent();
        sheet.getRange(rowIndex, COLS_CORTES.id).clearContent();
        SpreadsheetApp.flush();

        // El ID ya está reservado de forma append-only y no se reutiliza si falla la fila.
        sheet.getRange(rowIndex, COLS_CORTES.id).setValue(newId);
        SpreadsheetApp.flush();
        if (Number(sheet.getRange(rowIndex, COLS_CORTES.id).getValue()) !== newId) {
            removeEmptyPendingCutRow(sheet, rowIndex, lastColumn);
            throw new Error("No se pudo verificar el ID estático del nuevo vehículo; no se guardó el corte.");
        }
        if (opId) {
            try {
                recordOpId(opId, newId, 1, formattedDate, "pending", operationHash, idempotencyEntriesSnapshot);
            } catch (error) {
                try {
                    const persistedOperation = findRowByOpId(sheet, opId, idempotencyEntriesSnapshot);
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

        // Drive se procesa fuera del ScriptLock; el ID y el opId ya quedaron reservados.
        const preparedImages = runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => {
            const folderInfo = Object.assign({}, vehicleData, { anoDesde: anoDesde, anoHasta: anoHasta });
            const folder = findOrCreateVehicleFolder(folderInfo);
            let vehicleImage = '';
            let cutImage = '';
            if (vehicleData.imagenVehiculo) {
                const filename = buildCanonicalImageBaseName(folderInfo, "imagenVehiculo");
                vehicleImage = uploadImageToDrive(vehicleData.imagenVehiculo, filename, folder, buildImageUploadOperationKey(opId, newId, "imagenVehiculo"), { shortLedgerLock: true });
            }
            if (cutData.imgCorte1) {
                const filename = buildCanonicalImageBaseName(folderInfo, "imgCorte1");
                cutImage = uploadImageToDrive(cutData.imgCorte1, filename, folder, buildImageUploadOperationKey(opId, newId, "imgCorte1"), { shortLedgerLock: true });
            }
            return { vehicleImage: vehicleImage, cutImage: cutImage };
        });
        const vehiculoImageUrl = preparedImages.vehicleImage;
        const corteImageUrl = preparedImages.cutImage;

        // 4. Escribir los datos base y el primer corte en un lote; los campos separados se actualizan individualmente.
        // La fila nueva fue limpiada antes de la carga; las columnas 2–16 se escriben en un solo lote.
        const rowCoreValues = [
            vehicleData.categoria || '',
            vehicleData.marca,
            vehicleData.modelo,
            vehicleData.versionesAplicables || '',
            anoDesde,
            anoHasta,
            vehicleData.tipoEncendido,
            vehiculoImageUrl,
            '',
            '',
            ...buildCutSlotCoreValues_(cutData, corteImageUrl)
        ];
        sheet.getRange(rowIndex, COLS_CORTES.categoria, 1, rowCoreValues.length).setValues([rowCoreValues]);
        sheet.getRange(rowIndex, COLS_CORTES.colaboradorCorte1).setValue(colaboradorName);
        sheet.getRange(rowIndex, COLS_CORTES.timestamp).setValue(formattedDate);
        sheet.getRange(rowIndex, COLS_CORTES.activaTestigo1).setValue(cutData.activaTestigo1 === true);
        SpreadsheetApp.flush();
        runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => markImageUploadLinked(vehiculoImageUrl, { shortLedgerLock: true }));
        runWriteDriveWorkOutsideScriptLock_(lock, lockState, opId, () => markImageUploadLinked(corteImageUrl, { shortLedgerLock: true }));
        if (opId) recordOpId(opId, newId, 1, formattedDate, "completed", operationHash, idempotencyEntriesSnapshot);
    }

    return { status: 'success', message: `Corte agregado exitosamente.`, vehicleId: newId, timestamp: formattedDate, slotIndex: savedSlotIndex, operationHash: operationHash };
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


function sanitizeSupplementaryRichText_(value) {
 if(value===null||value===undefined)return "";
 const input=String(value).replace(/\r\n?/g,"\n"),allowed=new Set(["b","strong","span","br","p","div","i","em","u","s","strike","ol","ul","li","a","img","small","mark","font"]),voids=new Set(["br","img"]);
 const dropped=new Set(["script","style","iframe","object","embed","svg","math","template","form","textarea","select","option","button","input","meta","link","base","video","audio","source","canvas","applet","noscript"]),voidDropped=new Set(["input","meta","link","base","source","embed"]);
 const markers=new Set(["hyphen","arrow","check","bullet"]),fonts=new Set(["Arial, sans-serif","'Segoe UI', Roboto, sans-serif","'Courier New', monospace","Georgia, serif"]),sizes=new Set(["0.85em","1em","1.2em","1.5em"]),colors=new Set(["red","blue","green","black","white","orange","yellow","gray","grey","purple","teal","navy"]);
 const textSafe=s=>String(s).replace(/&(?!(?:#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);)/gi,"&amp;").replace(/</g,"&lt;").replace(/\n/g,"<br>"),attrSafe=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const urlSafe=(v,img)=>{const u=String(v||"").trim();if(!u||/\s|[\u0000-\u001f\u007f]/.test(u))return "";if(/^https?:\/\/[^"'<>]+$/i.test(u))return u;if(!img&&/^(?:mailto|tel):[^"'<>]+$/i.test(u))return u;return "";};
 const styleSafe=s=>{const out=[],color=v=>/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([0-9.,%\s]+\)$/i.test(v)||colors.has(v.toLowerCase());String(s||"").split(";").forEach(d=>{const i=d.indexOf(":");if(i<0)return;const p=d.slice(0,i).trim().toLowerCase(),v=d.slice(i+1).trim();if(!v||/(?:url\s*\(|expression|javascript:|@import|behavior|binding)/i.test(v))return;if(p==="color"&&color(v))out.push("color:"+v);else if(p==="font-size"&&sizes.has(v))out.push("font-size:"+v);else if(p==="font-family"&&fonts.has(v))out.push("font-family:"+v);else if(p==="float"&&/^(left|right|none)$/i.test(v))out.push("float:"+v);else if(["height","width","margin-left"].includes(p)&&/^(auto|\d{1,3}px|\d{1,3}%|\d{1,2}(?:\.\d+)?em)$/i.test(v))out.push(p+":"+v);else if(p==="text-align"&&/^(left|right|center|justify)$/i.test(v))out.push("text-align:"+v);});return out.join(";");};
 const attrs=(tag,raw)=>{const out=[],re=/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;let m,blank=false;while((m=re.exec(raw||""))!==null){const n=String(m[1]||"").toLowerCase(),v=m[2]!==undefined?m[2]:m[3]!==undefined?m[3]:m[4]!==undefined?m[4]:"";if(!n||n.startsWith("on")||["srcdoc","formaction","xlink:href","srcset","xmlns"].includes(n))continue;if(n==="style"){const s=styleSafe(v);if(s)out.push('style="'+attrSafe(s)+'"');continue;}if(tag==="a"&&n==="href"){const u=urlSafe(v,false);if(u)out.push('href="'+attrSafe(u)+'"');continue;}if(tag==="a"&&n==="target"&&v==="_blank"){blank=true;out.push('target="_blank"');continue;}if(tag==="a"&&n==="title"){out.push('title="'+attrSafe(v)+'"');continue;}if(tag==="img"&&n==="src"){const u=urlSafe(v,true);if(u)out.push('src="'+attrSafe(u)+'"');continue;}if(tag==="img"&&n==="alt"){out.push('alt="'+attrSafe(v)+'"');continue;}if(tag==="img"&&["width","height"].includes(n)&&/^\d{1,4}$/.test(v)){out.push(n+'="'+v+'"');continue;}if(tag==="ul"&&n==="data-gp-marker"&&markers.has(v)){out.push('data-gp-marker="'+v+'"');continue;}if(tag==="ol"&&n==="start"&&/^\d{1,4}$/.test(v)){out.push('start="'+v+'"');continue;}if(tag==="font"&&n==="color"&&(/^#[0-9a-f]{3,8}$/i.test(v)||colors.has(v.toLowerCase()))){out.push('color="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="face"&&fonts.has(v)){out.push('face="'+attrSafe(v)+'"');continue;}if(tag==="font"&&n==="size"&&/^[1-7]$/.test(v))out.push('size="'+v+'"');}if(tag==="a"&&blank)out.push('rel="noopener noreferrer"');return out.length?" "+out.join(" "):"";};
 let out="",cursor=0;const stack=[],suppressed=[],tokenRe=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|</gi;let m;
 while((m=tokenRe.exec(input))!==null){if(!suppressed.length)out+=textSafe(input.slice(cursor,m.index));const token=m[0];cursor=tokenRe.lastIndex;if(token.startsWith("<!--")||/^<!/i.test(token))continue;if(token==="<"){if(!suppressed.length)out+="&lt;";continue;}const t=token.match(/^<\s*(\/?)\s*([a-z][a-z0-9-]*)\b([\s\S]*?)>$/i);if(!t){if(!suppressed.length)out+=textSafe(token);continue;}const close=t[1]==="/",tag=t[2].toLowerCase();if(suppressed.length){if(close){const i=suppressed.lastIndexOf(tag);if(i>=0)suppressed.length=i;}else if(dropped.has(tag)&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(dropped.has(tag)){if(!close&&!voidDropped.has(tag))suppressed.push(tag);continue;}if(close){if(!allowed.has(tag)||voids.has(tag))continue;const i=stack.lastIndexOf(tag);if(i<0)continue;for(let j=stack.length-1;j>=i;j--)out+="</"+stack[j]+">";stack.length=i;continue;}if(!allowed.has(tag))continue;out+="<"+tag+attrs(tag,t[3])+">";if(!voids.has(tag))stack.push(tag);}
 if(!suppressed.length)out+=textSafe(input.slice(cursor));for(let i=stack.length-1;i>=0;i--)out+="</"+stack[i]+">";return out;
}

function createSupplementaryInfoError_(code,message){const e=new Error(message);e.code=code;return e;}
function hasSupplementaryValue_(v){return typeof v==="string"&&v.trim()!=="";}
function hasSupplementaryRichTextContent_(value){const visible=String(value||"").replace(/<br\s*\/?>/gi," ").replace(/<img\b[^>]*>/gi," imagen ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;|&#xA0;/gi," ").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCharCode(parseInt(hex||dec,hex?16:10))).trim();return visible!=="";}
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
 ["apertura","cableAlimen","cableAlimen2","cableAlimen3","notaImportante"].forEach(k=>{if(payload[k]!==undefined&&payload[k]!==null){if(payload[k].length>5000)throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","El campo "+k+" no puede exceder 5000 caracteres.");payload[k]=sanitizeSupplementaryRichText_(payload[k]);if(payload[k]&&!hasSupplementaryRichTextContent_(payload[k]))throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD","El campo "+k+" debe incluir contenido visible.");}});
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
 const firstColumn=COLS_CORTES.apertura;
 const changes=[];
 updated.forEach((value,index)=>{
  const before=original[index];
  if(String(before==null?"":before)!==String(value==null?"":value))changes.push({column:firstColumn+index,value});
 });
 try{
  changes.forEach(change=>sheet.getRange(row,change.column).setValue(change.value));
  SpreadsheetApp.flush();
  changes.forEach(change=>{
   const saved=sheet.getRange(row,change.column).getValue();
   if(String(saved==null?"":saved)!==String(change.value==null?"":change.value))throw Error("La lectura posterior de la columna "+change.column+" no coincide.");
  });
  return true;
 }catch(e){
  // No restaurar una instantánea de diez columnas: podría borrar aportes escritos
  // por otra solicitud mientras esta operación estaba en curso.
  throw createSupplementaryInfoError_("SUPPLEMENTARY_PERSISTENCE_FAILED","No se pudo confirmar uno o más campos suplementarios. No se revirtieron otros campos para preservar aportes concurrentes. Conserva el mismo opId para revisar o reintentar la operación.");
 }
}
const SUPPLEMENTARY_INFO_ALLOWED_ROLES_ = Object.freeze(["desarrollador", "jefe", "supervisor", "tecnico", "tecnico_exterior"]);
function readSupplementaryVehicleSnapshot_(sheet, vehicleId) {
    if (!sheet || sheet.getLastRow() < 2) throw createSupplementaryInfoError_("VEHICLE_NOT_FOUND", "El vehículo indicado no existe en el registro.");
    if (sheet.getLastColumn() < COLS_CORTES.imgCableAlimen3) throw createSupplementaryInfoError_("SUPPLEMENTARY_SCHEMA_INVALID", "La hoja Cortes no contiene todas las columnas de información suplementaria.");
    const ids = sheet.getRange(2, COLS_CORTES.id, sheet.getLastRow() - 1, 1).getValues().flat();
    const matches = [];
    ids.forEach((id, index) => { if (String(id == null ? "" : id).trim() === String(vehicleId).trim()) matches.push(index + 2); });
    if (!matches.length) throw createSupplementaryInfoError_("VEHICLE_NOT_FOUND", "El vehículo indicado no existe en el registro.");
    if (matches.length > 1) throw createSupplementaryInfoError_("VEHICLE_ID_AMBIGUOUS", "El ID del vehículo aparece más de una vez. No se realizó ninguna modificación.");
    const rowIndex = matches[0];
    const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    return { rowIndex, rowValues, vehicle: mapRowToObject(rowValues, COLS_CORTES) };
}

function findOrCreateSupplementaryVehicleFolder_(vehicle) {
    return findOrCreateVehicleFolder(vehicle);
}
function prepareSupplementaryImageUploads_(payload, vehicle, plan) {
    const preparedPayload = Object.assign({}, payload);
    const uploadedUrls = [];
    const imageFields = Object.keys(plan.updates).filter(field => field.indexOf("img") === 0 && hasSupplementaryValue_(plan.updates[field]));
    if (!imageFields.length) return { payload: preparedPayload, uploadedUrls };

    const folder = findOrCreateSupplementaryVehicleFolder_(vehicle);
    if (hasSupplementaryValue_(plan.updates.imgApertura)) {
        const field = "imgApertura";
        const url = uploadImageToDrive(plan.updates[field], buildCanonicalImageBaseName(vehicle, field), folder,
            buildImageUploadOperationKey(payload.opId, payload.vehicleId, field), { shortLedgerLock: true });
        if (!url) throw createSupplementaryInfoError_("SUPPLEMENTARY_IMAGE_UPLOAD_FAILED", "La carga de la imagen de apertura no devolvió una URL válida.");
        preparedPayload.imgApertura = url;
        uploadedUrls.push(url);
    }

    const cableImageField = imageFields.find(field => field.indexOf("imgCableAlimen") === 0);
    if (cableImageField) {
        const cableTextField = ["cableAlimen", "cableAlimen2", "cableAlimen3"].find(field => hasSupplementaryValue_(plan.updates[field]));
        const cableText = cableTextField ? plan.updates[cableTextField] : "";
        const field = "imgCableAlimen";
        const url = uploadImageToDrive(plan.updates[cableImageField], buildCanonicalImageBaseName(vehicle, field), folder,
            buildImageUploadOperationKey(payload.opId, payload.vehicleId, field), { shortLedgerLock: true });
        if (!url) throw createSupplementaryInfoError_("SUPPLEMENTARY_IMAGE_UPLOAD_FAILED", "La carga de la imagen de alimentación no devolvió una URL válida.");
        ["cableAlimen", "cableAlimen2", "cableAlimen3", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"].forEach(key => delete preparedPayload[key]);
        if (hasSupplementaryValue_(cableText)) preparedPayload.cableAlimen = cableText;
        preparedPayload.imgCableAlimen = url;
        uploadedUrls.push(url);
    }
    return { payload: preparedPayload, uploadedUrls };
}

function handleAddSupplementaryInfo(payload) {
    const actorName = getAuthenticatedCollaborator(payload, SUPPLEMENTARY_INFO_ALLOWED_ROLES_);
    if (!payload || typeof payload !== "object" || !String(payload.vehicleId || "").trim()) {
        throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_VEHICLE_ID", "El ID del vehículo es requerido para agregar información suplementaria.");
    }

    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    const snapshot = readSupplementaryVehicleSnapshot_(sheet, payload.vehicleId);
    const normalizedPlan = buildSupplementaryInfoPlan_(payload, {});
    const isOpening = normalizedPlan.apertureRequested === true;
    const hasFeed = normalizedPlan.slotIndex !== null;
    const hasLedgerContribution = isOpening || hasFeed;

    // Los flujos del modal (+) usan opId y se registran como eventos append-only.
    // Los payloads antiguos de nota sin opId conservan la ruta de compatibilidad.
    if (hasLedgerContribution && String(payload.opId || "").trim()) {
        getVehicleContributionLedgerSheet_(spreadsheet);
        if (isOpening && hasFeed) {
            throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD", "Apertura y alimentación deben registrarse como operaciones independientes.");
        }
        if (hasSupplementaryValue_(normalizedPlan.updates.notaImportante)) {
            throw createSupplementaryInfoError_("SUPPLEMENTARY_INVALID_PAYLOAD", "La nota importante debe guardarse por separado de la apertura o alimentación.");
        }

        let preparedPayload = Object.assign({}, payload);
        let uploadedUrls = [];
        const hasImages = ["imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"]
            .some(field => hasSupplementaryValue_(payload[field]));
        if (hasImages) {
            const prepared = prepareSupplementaryImageUploads_(preparedPayload, snapshot.vehicle, normalizedPlan);
            preparedPayload = prepared.payload;
            uploadedUrls = prepared.uploadedUrls;
        }

        const kind = isOpening ? "opening" : "feed";
        const contributionPayload = isOpening
            ? { text: String(normalizedPlan.updates.apertura || ""), image: String(preparedPayload.imgApertura || "") }
            : { text: String(preparedPayload.cableAlimen || ""), image: String(preparedPayload.imgCableAlimen || "") };
        const event = appendVehicleContributionEvent_({
            spreadsheet,
            vehicleId: payload.vehicleId,
            opId: payload.opId,
            kind,
            payload: contributionPayload,
            actorId: payload.__sharedSessionActor && payload.__sharedSessionActor.userId || "",
            actorName
        });

        uploadedUrls.forEach(url => {
            try {
                if (!markImageUploadLinked(url, { shortLedgerLock: true })) {
                    Logger.log("El aporte quedó registrado, pero la carga permanece pendiente de reconciliación: " + String(url));
                }
            } catch (ledgerError) {
                Logger.log("El aporte quedó registrado, pero no se pudo actualizar ImageUploadLedger: " + String(ledgerError && ledgerError.message || ledgerError));
            }
        });

        return {
            status: "success",
            message: isOpening ? "Aporte de apertura registrado." : "Aporte de alimentación registrado.",
            vehicleId: String(payload.vehicleId),
            opId: String(payload.opId),
            contributionEventId: event.eventId,
            operationHash: event.operationHash,
            duplicate: event.duplicate === true,
            catalogResetRequired: true,
            candidateReviewPending: getVehicleContributionCandidateStatus_(spreadsheet, snapshot, event.eventId, kind)
        };
    }

    // Compatibilidad temporal para solicitudes heredadas de nota o sin opId.
    let preparedPayload = Object.assign({}, payload);
    let uploadedUrls = [];
    const hasImages = ["imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"]
        .some(field => hasSupplementaryValue_(payload[field]));
    if (hasImages) {
        const preflightPlan = buildSupplementaryInfoPlan_(preparedPayload, snapshot.vehicle);
        const prepared = prepareSupplementaryImageUploads_(preparedPayload, snapshot.vehicle, preflightPlan);
        preparedPayload = prepared.payload;
        uploadedUrls = prepared.uploadedUrls;
    }

    const result = handleAddSupplementaryInfoLocked(preparedPayload, actorName, sheet);
    if (result && result.status === "success") {
        uploadedUrls.forEach(url => {
            try {
                if (!markImageUploadLinked(url, { shortLedgerLock: true })) {
                    Logger.log("La información suplementaria se guardó, pero la carga permanece pendiente de reconciliación: " + String(url));
                }
            } catch (ledgerError) {
                Logger.log("La información suplementaria se guardó, pero no se pudo actualizar ImageUploadLedger: " + String(ledgerError && ledgerError.message || ledgerError));
            }
        });
        try { result.catalogVersion = nextWriteCatalogSourceVersion_(payload.vehicleId); }
        catch (versionError) {
            result.catalogResetRequired = true;
            Logger.log("La información suplementaria se guardó, pero no se pudo reservar versión de catálogo: " + String(versionError && versionError.message || versionError));
        }
    }
    return result;
}
function handleAddSupplementaryInfoLocked(payload, actorName, sheet) {
    const snapshot = readSupplementaryVehicleSnapshot_(sheet, payload.vehicleId);
    const plan = buildSupplementaryInfoPlan_(payload, snapshot.vehicle);
    const original = snapshot.rowValues.slice(COLS_CORTES.apertura - 1, COLS_CORTES.imgCableAlimen3);
    const updated = original.slice();
    const index = field => COLS_CORTES[field] - COLS_CORTES.apertura;
    Object.keys(plan.updates).forEach(field => { updated[index(field)] = plan.updates[field]; });
    const timestampIndex = index("timestamp");
    if (!hasSupplementaryValue_(String(updated[timestampIndex] || ""))) {
        const date = new Date();
        updated[timestampIndex] = hasSupplementaryValue_(payload.timestamp) ? payload.timestamp : Utilities.formatDate(date, "GMT-6", "dd/MM/yyyy");
    }
    try { persistSupplementaryInfoValues_(sheet, snapshot.rowIndex, original, updated); }
    catch (error) {
        if (error && error.code) throw error;
        throw createSupplementaryInfoError_("SUPPLEMENTARY_PERSISTENCE_FAILED", "No se pudo guardar la información suplementaria: " + String(error && error.message || error));
    }
    Logger.log("Información suplementaria guardada por " + actorName + " para el vehículo " + String(payload.vehicleId) + ".");
    return { status: "success", message: "Información suplementaria agregada exitosamente.", vehicleId: String(payload.vehicleId),
        slotIndex: plan.slotIndex, apertureSaved: plan.apertureRequested };
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


function sanitizeForNomenclature(text) {
    if (text === null || text === undefined) return "";
    return String(text).toLowerCase()
        .replace(/[\/,]/g, "_")
        .replace(/[^a-z0-9_.-]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_+|_+$/g, "");
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

function getCortesRootFolder() {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    if (String(folder.getId()) !== String(DRIVE_FOLDER_ID) || String(folder.getName() || "").trim().toLowerCase() !== "cortes") {
        throw new Error("DRIVE_FOLDER_ID no corresponde a la carpeta «Cortes».");
    }
    const driveRootId = DriveApp.getRootFolder().getId();
    const parents = folder.getParents();
    let isDirectChild = false;
    while (parents.hasNext()) if (parents.next().getId() === driveRootId) isDirectChild = true;
    if (!isDirectChild) throw new Error("La carpeta «Cortes» no está ubicada directamente en la raíz de Drive.");
    return folder;
}
function sanitizeForFolderDisplay(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/\s+/g, ' ').replace(/__+/g, '_').trim();
}

function getFolderCanonicalName(name) {
    return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
    const inlineRange = rawDesde.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
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

// Compatibilidad para consumidores heredados que solo proporcionen un año.
function getOrCreateFolder(categoria, marca, modelo, anio) {
    return findOrCreateVehicleFolder({
        categoria: categoria, marca: marca, modelo: modelo,
        anoDesde: anio, anoHasta: anio
    });
}

function getOrCreateSubFolder(parentFolder, name) {
    return findOrCreateSubFolder(parentFolder, name);
}

const IMAGE_UPLOAD_EVENTS_SHEET_NAME_ = "ImageUploadEvents";
const IMAGE_UPLOAD_EVENTS_HEADERS_ = [
    "eventId", "token", "operationKey", "folderId", "mimeType", "sizeBytes",
    "contentHash", "fileId", "fileUrl", "state", "referencesJson", "fileName",
    "createdAt", "lastError"
];

/**
 * Diario append-only para transiciones de cargas. No reemplaza todavía el ledger
 * heredado: permite migrar y probar la proyección sin mutar registros productivos.
 */
function getOrCreateImageUploadEventsSheet_(spreadsheet) {
    const ss = spreadsheet || getSpreadsheet();
    let sheet = ss.getSheetByName(IMAGE_UPLOAD_EVENTS_SHEET_NAME_);
    if (!sheet) sheet = ss.insertSheet(IMAGE_UPLOAD_EVENTS_SHEET_NAME_);
    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, IMAGE_UPLOAD_EVENTS_HEADERS_.length).setValues([IMAGE_UPLOAD_EVENTS_HEADERS_]);
        sheet.setFrozenRows(1);
        SpreadsheetApp.flush();
    }
    if (sheet.getLastColumn() < IMAGE_UPLOAD_EVENTS_HEADERS_.length) {
        throw new Error("ImageUploadEvents tiene una estructura incompleta.");
    }
    const headers = sheet.getRange(1, 1, 1, IMAGE_UPLOAD_EVENTS_HEADERS_.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (IMAGE_UPLOAD_EVENTS_HEADERS_.some((header, index) => headers[index] !== header)) {
        throw new Error("La estructura de ImageUploadEvents no coincide con el contrato esperado.");
    }
    return sheet;
}

function appendImageUploadEvent_(sheet, event) {
    if (!sheet || !event || typeof event !== "object") throw new Error("Evento de carga inválido.");
    const token = String(event.token || "").trim();
    const operationKey = String(event.operationKey || "").trim();
    const folderId = String(event.folderId || "").trim();
    const mimeType = String(event.mimeType || "").trim().toLowerCase();
    const sizeBytes = Number(event.sizeBytes);
    const contentHash = String(event.contentHash || "").trim().toLowerCase();
    const state = String(event.state || "pending").trim().toLowerCase();
    if (!token || !operationKey || !folderId || !mimeType.startsWith("image/") ||
        !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || !/^[a-f0-9]{64}$/.test(contentHash) ||
        !["reserved", "pending", "linked", "file_missing", "requires_review", "error"].includes(state)) {
        throw new Error("El evento de carga no cumple el contrato de integridad.");
    }
    const row = [
        "IE-" + String(Utilities.getUuid()).replace(/-/g, ""),
        token, operationKey, folderId, mimeType, sizeBytes, contentHash,
        String(event.fileId || ""), String(event.fileUrl || ""), state,
        String(event.referencesJson || "[]"), String(event.fileName || ""),
        String(event.createdAt || new Date().toISOString()), String(event.lastError || "").slice(0, 500)
    ];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    const matches = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), 1)
        .createTextFinder(row[0]).matchCase(true).matchEntireCell(true).findAll();
    if (matches.length !== 1) {
        const error = new Error("No se pudo confirmar el evento append-only de ImageUploadEvents.");
        error.code = "IMAGE_UPLOAD_EVENT_UNCONFIRMED";
        throw error;
    }
    return { eventId: row[0], rowIndex: matches[0].getRow(), values: row };
}

function readImageUploadEventsByToken_(sheet, token) {
    const cleanToken = String(token || "").trim();
    if (!cleanToken || !sheet || sheet.getLastRow() < 2) return [];
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, IMAGE_UPLOAD_EVENTS_HEADERS_.length).getValues();
    return rows.map((values, index) => ({ rowIndex: index + 2, values }))
        .filter(entry => String(entry.values[1] || "").trim() === cleanToken);
}

/**
 * Proyección determinista: los eventos no se sobrescriben. Si el mismo token
 * termina asociado a varios fileId o metadatos incompatibles, no elige ganador.
 */
function projectImageUploadEvents_(events) {
    const entries = Array.isArray(events) ? events : [];
    if (!entries.length) return null;
    const first = entries[0].values || entries[0];
    const identity = [1, 2, 3, 4, 5, 6].map(index => String(first[index] == null ? "" : first[index]));
    const fileIds = new Set();
    const references = new Map();
    let requiresReview = false, lastError = "", latestState = "pending", latestReferencesJson = "[]";
    entries.forEach(entry => {
        const values = entry.values || entry;
        const candidateIdentity = [1, 2, 3, 4, 5, 6].map(index => String(values[index] == null ? "" : values[index]));
        if (candidateIdentity.some((value, index) => value !== identity[index])) requiresReview = true;
        const fileId = String(values[7] || "").trim();
        if (fileId) fileIds.add(fileId);
        const state = String(values[9] || "pending").toLowerCase();
        if (["reserved", "pending", "linked", "file_missing", "requires_review", "error"].includes(state)) latestState = state;
        if (String(values[10] || "").trim() && String(values[10]) !== "[]") latestReferencesJson = String(values[10]);
        if (String(values[13] || "").trim()) lastError = String(values[13]);
    });
    if (fileIds.size > 1) requiresReview = true;
    const state = requiresReview ? "requires_review" : latestState;
    return {
        token: identity[0], operationKey: identity[1], folderId: identity[2],
        mimeType: identity[3], sizeBytes: Number(identity[4]), contentHash: identity[5],
        fileId: fileIds.size === 1 ? Array.from(fileIds)[0] : "",
        state, eventCount: entries.length, fileIds: Array.from(fileIds),
        referencesJson: latestReferencesJson,
        lastError
    };
}

function appendImageUploadEventTransition_(expected, state, fileId, references, fileName, lastError) {
    if (!expected || !expected.token || !expected.operationKey) return false;
    try {
        const sheet = getOrCreateImageUploadEventsSheet_(getSpreadsheet());
        appendImageUploadEvent_(sheet, {
            token: expected.token,
            operationKey: expected.operationKey,
            folderId: expected.folderId,
            mimeType: expected.mimeType,
            sizeBytes: expected.sizeBytes,
            contentHash: expected.contentHash,
            fileId: fileId || "",
            fileUrl: fileId ? "https://drive.google.com/uc?export=view&id=" + fileId : "",
            state: state,
            referencesJson: JSON.stringify(Array.isArray(references) ? references : []),
            fileName: fileName || "",
            lastError: lastError || ""
        });
        return true;
    } catch (error) {
        // Durante la migración ImageUploadLedger sigue siendo la fuente compatible
        // con ADMIN; un fallo del journal secundario no revierte una carga válida.
        Logger.log("No se pudo anexar la transición de ImageUploadEvents (" + state + "): " +
            String(error && error.message || error));
        return false;
    }
}


function findImageUploadEventsByOperationKey_(sheet, operationKey) {
    const key = String(operationKey || "").trim();
    const lastRow = sheet && sheet.getLastRow ? sheet.getLastRow() : 0;
    if (!key || lastRow < 2) return [];
    const matches = sheet.getRange(2, 3, lastRow - 1, 1)
        .createTextFinder(key).matchCase(true).matchEntireCell(true).findAll();
    return matches.map(match => {
        const rowIndex = match.getRow();
        return {
            rowIndex,
            values: sheet.getRange(rowIndex, 1, 1, IMAGE_UPLOAD_EVENTS_HEADERS_.length).getValues()[0]
        };
    });
}

function appendImageUploadEventRequired_(sheet, expected, state, fileId, references, fileName, lastError) {
    return appendImageUploadEvent_(sheet, {
        token: expected.token, operationKey: expected.operationKey, folderId: expected.folderId,
        mimeType: expected.mimeType, sizeBytes: expected.sizeBytes, contentHash: expected.contentHash,
        fileId: fileId || "",
        fileUrl: fileId ? "https://drive.google.com/uc?export=view&id=" + fileId : "",
        state, referencesJson: JSON.stringify(Array.isArray(references) ? references : []),
        fileName: fileName || "", lastError: lastError || ""
    });
}

const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

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

const WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_ = "AportesVehiculo";
const WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_ = Object.freeze([
    "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
    "actorId", "actorName", "createdAt", "status", "supersedesEventId"
]);

function readVehicleContributionLedgerRows_(sheet) {
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (lastRow < 2) return [];
    return sheet.getRange(2, 1, lastRow - 1, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues();
}

function getVehicleContributionCutSlotIndex_(spreadsheet, vehicleSnapshot, targetEventId, rowsSnapshot) {
    const ledger = getVehicleContributionLedgerSheet_(spreadsheet);
    if (Array.isArray(rowsSnapshot) ? !rowsSnapshot.length : ledger.getLastRow() < 2) return null;
    const vehicleId = String(vehicleSnapshot && vehicleSnapshot.vehicle && vehicleSnapshot.vehicle.id || "").trim();
    if (!vehicleId) return null;
    const baseRow = vehicleSnapshot.rowValues || [];
    const occupied = [1, 2, 3].map(slot => [
        COLS_CORTES["tipoCorte" + slot],
        COLS_CORTES["ubicacionCorte" + slot],
        COLS_CORTES["imgCorte" + slot]
    ].some(column => String(baseRow[column - 1] || "").trim()));
    const rows = Array.isArray(rowsSnapshot) ? rowsSnapshot : readVehicleContributionLedgerRows_(ledger);
    const byOpId = new Map();
    const conflicts = new Set();
    rows.forEach((row, offset) => {
        const opId = String(row[1] || "");
        if (!opId) return;
        const entry = {
            eventId: String(row[0] || ""),
            opId,
            vehicleId: String(row[2] || ""),
            operationHash: String(row[3] || "").toLowerCase(),
            kind: String(row[4] || ""),
            status: String(row[9] || ""),
            payloadJson: String(row[5] || ""),
            rowIndex: offset + 2
        };
        const previous = byOpId.get(opId);
        if (previous && (previous.vehicleId !== entry.vehicleId ||
            previous.operationHash !== entry.operationHash || previous.kind !== entry.kind ||
            previous.payloadJson !== entry.payloadJson)) {
            conflicts.add(opId);
        } else if (!previous) {
            byOpId.set(opId, entry);
        }
    });
    let targetSlot = null;
    Array.from(byOpId.values()).sort((a, b) => a.rowIndex - b.rowIndex).forEach(entry => {
        if (conflicts.has(entry.opId) || entry.vehicleId !== vehicleId ||
            entry.kind !== "cut" || entry.status !== "accepted") return;
        const slot = occupied.findIndex(value => value === false);
        if (slot < 0) return;
        occupied[slot] = true;
        if (entry.eventId === String(targetEventId)) targetSlot = slot + 1;
    });
    return targetSlot;
}

function getVehicleContributionCandidateStatus_(spreadsheet, vehicleSnapshot, targetEventId, kind) {
    const ledger = getVehicleContributionLedgerSheet_(spreadsheet);
    const lastRow = ledger.getLastRow();
    if (lastRow < 2) return true;
    const vehicleId = String(vehicleSnapshot && vehicleSnapshot.vehicle && vehicleSnapshot.vehicle.id || "").trim();
    if (!vehicleId) return true;
    const vehicle = vehicleSnapshot.vehicle || {};
    let openingOccupied = Boolean(String(vehicle.apertura || "").trim() || String(vehicle.imgApertura || "").trim());
    const feedOccupied = [
        Boolean(String(vehicle.cableAlimen || "").trim() || String(vehicle.imgCableAlimen || "").trim()),
        Boolean(String(vehicle.cableAlimen2 || "").trim() || String(vehicle.imgCableAlimen2 || "").trim()),
        Boolean(String(vehicle.cableAlimen3 || "").trim() || String(vehicle.imgCableAlimen3 || "").trim())
    ];
    const rows = ledger.getRange(2, 1, lastRow - 1, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues();
    const byOpId = new Map();
    const conflicts = new Set();
    rows.forEach((row, offset) => {
        const opId = String(row[1] || "");
        if (!opId) return;
        const entry = {
            eventId: String(row[0] || ""),
            opId,
            vehicleId: String(row[2] || ""),
            operationHash: String(row[3] || "").toLowerCase(),
            kind: String(row[4] || "").toLowerCase(),
            payloadJson: String(row[5] || ""),
            status: String(row[9] || "").toLowerCase(),
            rowIndex: offset + 2
        };
        const previous = byOpId.get(opId);
        if (previous && (previous.vehicleId !== entry.vehicleId ||
            previous.operationHash !== entry.operationHash || previous.kind !== entry.kind ||
            previous.payloadJson !== entry.payloadJson)) {
            conflicts.add(opId);
        } else if (!previous) {
            byOpId.set(opId, entry);
        }
    });
    const events = Array.from(byOpId.values()).sort((a, b) => a.rowIndex - b.rowIndex);
    for (const entry of events) {
        if (conflicts.has(entry.opId) || entry.vehicleId !== vehicleId ||
            entry.kind !== String(kind || "").toLowerCase() || entry.status !== "accepted") continue;
        if (entry.kind === "opening") {
            if (openingOccupied) {
                if (entry.eventId === String(targetEventId)) return true;
            } else {
                openingOccupied = true;
                if (entry.eventId === String(targetEventId)) return false;
            }
        } else if (entry.kind === "feed") {
            const slot = feedOccupied.findIndex(value => value === false);
            if (slot < 0) {
                if (entry.eventId === String(targetEventId)) return true;
            } else {
                feedOccupied[slot] = true;
                if (entry.eventId === String(targetEventId)) return false;
            }
        }
    }
    return true;
}

function getVehicleContributionLedgerSheet_(spreadsheetRef) {
    const spreadsheet = spreadsheetRef || getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_);
    if (!sheet) {
        const error = new Error("El ledger AportesVehiculo no está preparado. Un Desarrollador debe ejecutar migrateVehicleContributionsSchema antes de habilitar los nuevos aportes.");
        error.code = "CONTRIBUTION_LEDGER_NOT_READY";
        throw error;
    }
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length) {
        throw new Error("La hoja AportesVehiculo no contiene el esquema versionado completo.");
    }
    const headers = sheet.getRange(1, 1, 1, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.some((header, index) => headers[index] !== header)) {
        throw new Error("La hoja AportesVehiculo no coincide con el esquema versionado.");
    }
    return sheet;
}

function findVehicleContributionEventsByOpId_(sheet, opId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const matches = sheet.getRange(2, 2, lastRow - 1, 1)
        .createTextFinder(String(opId)).matchCase(true).matchEntireCell(true).findAll();
    return matches.map(match => ({
        rowIndex: match.getRow(),
        values: sheet.getRange(match.getRow(), 1, 1, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues()[0]
    }));
}

function computeVehicleContributionHash_(vehicleId, kind, payload) {
    const canonical = JSON.stringify({
        vehicleId: String(vehicleId),
        kind: String(kind),
        payload: payload
    });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8);
    return digest.map(value => ("0" + ((value + 256) % 256).toString(16)).slice(-2)).join("");
}

function findVehicleContributionVinConflict_(spreadsheetRef, vinPrefix, currentVehicleId, rowsSnapshot) {
    const prefix = String(vinPrefix || "").trim().toUpperCase();
    if (!prefix) return null;
    const sheet = getVehicleContributionLedgerSheet_(spreadsheetRef);
    if (Array.isArray(rowsSnapshot) ? !rowsSnapshot.length : sheet.getLastRow() < 2) return null;
    const rows = Array.isArray(rowsSnapshot) ? rowsSnapshot : readVehicleContributionLedgerRows_(sheet);
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const vehicleId = String(row[2] || "").trim();
        if (!vehicleId || vehicleId === String(currentVehicleId || "").trim()) continue;
        let payload = null;
        try { payload = JSON.parse(String(row[5] || "{}")); } catch (error) { payload = null; }
        if (payload && String(payload.vinPrefix || "").trim().toUpperCase() === prefix) {
            return {
                vehicleId,
                opId: String(row[1] || ""),
                eventId: String(row[0] || ""),
                rowIndex: index + 2
            };
        }
    }
    return null;
}

function appendVehicleContributionEvent_(options) {
    options = options && typeof options === "object" ? options : {};
    const vehicleId = String(options.vehicleId || "").trim();
    const opId = String(options.opId || "").trim();
    const kind = String(options.kind || "").trim().toLowerCase();
    const payload = options.payload;
    if (!/^[1-9]\d{0,14}$/.test(vehicleId)) throw new Error("El aporte requiere un vehicleId válido.");
    if (!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId)) throw new Error("El aporte requiere un opId válido.");
    if (!["cut", "opening", "feed", "vehicle", "vehicle_update"].includes(kind)) throw new Error("El tipo de aporte no está permitido.");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("El payload del aporte debe ser un objeto.");
    const payloadJson = JSON.stringify(payload);
    if (!payloadJson || payloadJson.length > 45000) throw new Error("El payload del aporte excede el tamaño permitido.");
    const operationHash = String(options.operationHash || computeVehicleContributionHash_(vehicleId, kind, payload)).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(operationHash)) throw new Error("La huella del aporte debe ser SHA-256.");
    const sheet = getVehicleContributionLedgerSheet_(options.spreadsheet);
    const existing = findVehicleContributionEventsByOpId_(sheet, opId);
    for (const entry of existing) {
        const values = entry.values;
        if (String(values[2] || "") !== vehicleId || String(values[3] || "").toLowerCase() !== operationHash ||
            String(values[4] || "").toLowerCase() !== kind || String(values[5] || "") !== payloadJson) {
            const conflict = new Error("El opId ya está asociado a otro vehículo, tipo o contenido. El aporte quedó en conflicto y no se confirmó.");
            conflict.code = "CONTRIBUTION_OP_ID_CONFLICT";
            throw conflict;
        }
    }
    if (existing.length) {
        return {
            eventId: String(existing[0].values[0] || ""),
            opId, vehicleId, kind, operationHash,
            rowIndex: existing[0].rowIndex,
            createdAt: String(existing[0].values[8] || ""),
            status: String(existing[0].values[9] || "accepted"),
            duplicate: true
        };
    }

    const eventId = "EV-" + String(Utilities.getUuid()).replace(/-/g, "");
    const createdAt = new Date().toISOString();
    const row = [
        eventId, opId, vehicleId, operationHash, kind, payloadJson,
        String(options.actorId || ""), String(options.actorName || ""),
        createdAt, String(options.status || "accepted"), String(options.supersedesEventId || "")
    ];
    sheet.appendRow(row);
    SpreadsheetApp.flush();

    const eventMatches = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), 1)
        .createTextFinder(eventId).matchCase(true).matchEntireCell(true).findAll();
    if (!eventMatches.length) {
        const pending = new Error("No se pudo confirmar por lectura el evento append-only. Conserva el mismo opId para reintentar.");
        pending.code = "CONTRIBUTION_APPEND_UNCONFIRMED";
        throw pending;
    }
    const rowIndex = eventMatches[0].getRow();
    const saved = sheet.getRange(rowIndex, 1, 1, WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues()[0];
    if (String(saved[1]) !== opId || String(saved[2]) !== vehicleId ||
        String(saved[3]).toLowerCase() !== operationHash || String(saved[4]).toLowerCase() !== kind ||
        String(saved[5]) !== payloadJson) {
        const mismatch = new Error("El evento append-only no coincide con el contenido enviado; requiere revisión.");
        mismatch.code = "CONTRIBUTION_APPEND_MISMATCH";
        throw mismatch;
    }

    const concurrent = findVehicleContributionEventsByOpId_(sheet, opId);
    if (concurrent.some(entry => String(entry.values[2] || "") !== vehicleId ||
        String(entry.values[3] || "").toLowerCase() !== operationHash ||
        String(entry.values[4] || "").toLowerCase() !== kind ||
        String(entry.values[5] || "") !== payloadJson)) {
        const conflict = new Error("Se detectó el mismo opId con contenido distinto durante el append. Los eventos se conservan para revisión y no deben proyectarse.");
        conflict.code = "CONTRIBUTION_OP_ID_CONFLICT";
        throw conflict;
    }
    const canonical = concurrent.slice().sort((a, b) => a.rowIndex - b.rowIndex)[0];
    return {
        eventId: canonical ? String(canonical.values[0] || "") : eventId,
        opId, vehicleId, kind, operationHash,
        rowIndex: canonical ? canonical.rowIndex : rowIndex,
        createdAt: canonical ? String(canonical.values[8] || createdAt) : createdAt,
        status: canonical ? String(canonical.values[9] || "accepted") : String(options.status || "accepted"),
        duplicate: Boolean(canonical && String(canonical.values[0] || "") !== eventId)
    };
}

function getImageUploadReferences_(fileId) {
    const spreadsheet = getSpreadsheet();
    const references = [];
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    if (sheet && sheet.getLastRow() >= 2) {
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
    }

    const contributions = spreadsheet.getSheetByName(WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_);
    if (contributions && contributions.getLastRow() >= 2 &&
        contributions.getLastColumn() >= WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length) {
        const rows = contributions.getRange(2, 1, contributions.getLastRow() - 1,
            WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues();
        rows.forEach((row, offset) => {
            let payload = null;
            try { payload = JSON.parse(String(row[5] || "{}")); } catch (error) { payload = null; }
            if (!payload || typeof payload !== "object") return;
            const vehicleImage = payload.vehicleData && typeof payload.vehicleData === "object"
                ? String(payload.vehicleData.imagenVehiculo || "") : "";
            const image = String(payload.image || payload.imagenVehiculo || vehicleImage || "").trim();
            if (getImageUploadFileId_(image) !== fileId) return;
            references.push({
                sheet: WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_,
                row: offset + 2,
                field: String(row[4] || "contribution") + ".image",
                url: image
            });
        });
    }
    return references;
}
function markImageUploadLinkedWithShortLedgerLock_(imageUrl) {
    const fileId = getImageUploadFileId_(imageUrl);
    if (!fileId) return false;
    try {
        const file = DriveApp.getFileById(fileId);
        const metadata = parseImageUploadDescription_(file.getDescription());
        if (!metadata || metadata.v !== "2" || !metadata.token || !metadata.operationKey ||
            !metadata.folderId || !metadata.mimeType || !metadata.contentHash || !metadata.sizeBytes) return false;
        const expected = {
            token: String(metadata.token), operationKey: String(metadata.operationKey),
            folderId: String(metadata.folderId), mimeType: String(metadata.mimeType),
            sizeBytes: Number(metadata.sizeBytes), contentHash: String(metadata.contentHash)
        };
        const folder = DriveApp.getFolderById(expected.folderId);
        verifyImageUploadFile_(file, folder, expected);
        const references = getImageUploadReferences_(fileId);
        if (!references.length) return false;

        const eventsSheet = getOrCreateImageUploadEventsSheet_(getSpreadsheet());
        let events = readImageUploadEventsByToken_(eventsSheet, expected.token);
        let projection = projectImageUploadEvents_(events);
        if (projection && (projection.state === "requires_review" ||
            projection.operationKey !== expected.operationKey || projection.folderId !== expected.folderId ||
            projection.mimeType !== expected.mimeType || projection.sizeBytes !== expected.sizeBytes ||
            projection.contentHash !== expected.contentHash ||
            (projection.fileId && projection.fileId !== fileId))) {
            throw new Error("El token de imagen está en conflicto; no se marcó como vinculado.");
        }
        if (!events.length || !events.some(entry => String(entry.values[7] || "").trim() === fileId)) {
            appendImageUploadEventRequired_(eventsSheet, expected, "pending", fileId, [], String(metadata.name || file.getName()), "");
            events = readImageUploadEventsByToken_(eventsSheet, expected.token);
            projection = projectImageUploadEvents_(events);
        }
        if (!projection || projection.state === "requires_review" || projection.fileId !== fileId) {
            throw new Error("El journal no confirmó un archivo único para vincular.");
        }
        if (!events.some(entry => String(entry.values[7] || "").trim() === fileId &&
            String(entry.values[9] || "").toLowerCase() === "linked")) {
            appendImageUploadEventRequired_(eventsSheet, expected, "linked", fileId, references,
                String(metadata.name || file.getName()), "");
        }

        const latest = projectImageUploadEvents_(readImageUploadEventsByToken_(eventsSheet, expected.token));
        if (!latest || latest.state === "requires_review" || latest.fileId !== fileId || latest.state !== "linked") {
            throw new Error("No se pudo confirmar la vinculación en ImageUploadEvents.");
        }
        try {
            const originalName = String(metadata.name || file.getName());
            if (originalName && file.getName() !== originalName) file.setName(originalName);
            const linkedDescription = buildImageUploadDescription_({ ...expected, fileName: originalName }, "linked", JSON.stringify(references));
            file.setDescription(linkedDescription);
            if (String(file.getDescription() || "") !== linkedDescription) {
                Logger.log("ImageUploadEvents quedó linked, pero Drive no confirmó la descripción final para " + fileId + ".");
            }
        } catch (descriptionError) {
            Logger.log("ImageUploadEvents quedó linked; no se pudo actualizar la descripción Drive: " + descriptionError.message);
        }
        return true;
    } catch (error) {
        Logger.log("No se pudo reconciliar la carga de imagen " + fileId + ": " + String(error && error.message || error));
        return false;
    }
}

function markImageUploadLinked(imageUrl, options) {
    return markImageUploadLinkedWithShortLedgerLock_(imageUrl);
}

function uploadImageToDriveWithShortLedgerLocks_(imageData, filename, folder, operationKey) {
    if (!imageData) return "";
    if (!folder || typeof folder.getId !== "function") throw new Error("No se encontró una carpeta válida para guardar la imagen.");
    let blob, mimeType = "";
    if (/^https?:\/\//i.test(String(imageData))) {
        const response = UrlFetchApp.fetch(String(imageData), { muteHttpExceptions: true });
        const status = response.getResponseCode();
        if (status < 200 || status >= 300) throw new Error("No se pudo descargar la imagen de origen. HTTP " + status + ".");
        blob = response.getBlob();
        mimeType = String(blob.getContentType() || "").split(";")[0].trim().toLowerCase();
    } else if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
        const parts = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i);
        if (!parts) throw new Error("Los datos Base64 de la imagen tienen un formato inválido.");
        mimeType = String(parts[1] || "").toLowerCase();
        const decoded = Utilities.base64Decode(parts[2]);
        if (!decoded || !decoded.length) throw new Error("La imagen recibida está vacía.");
        blob = Utilities.newBlob(decoded, mimeType);
    } else {
        throw new Error("El formato de imagen recibido no es compatible.");
    }

    const bytes = blob.getBytes();
    if (!bytes || !bytes.length) throw new Error("La imagen recibida está vacía.");
    if (!mimeType.startsWith("image/")) throw new Error("El MIME recibido no corresponde a una imagen.");
    if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) throw new Error("La imagen supera el límite de 10 MB por archivo.");

    const contentHash = calculateImageUploadContentHash_(bytes);
    let stableOperationKey = String(operationKey || "").trim();
    if (!stableOperationKey) stableOperationKey = "legacy|" + folder.getId() + "|" + String(filename || "") + "|" + contentHash;
    else if (stableOperationKey.startsWith("legacy|")) stableOperationKey += "|" + contentHash;
    const extension = getExtensionFromMimeType(mimeType);
    const originalFilename = String(filename || "imagen") + extension;
    const token = buildImageUploadToken(stableOperationKey, blob, folder, mimeType);
    const temporaryFilename = "__GPSpediaUpload_" + token + extension;
    const expected = {
        token, operationKey: stableOperationKey, folderId: String(folder.getId()),
        mimeType, sizeBytes: bytes.length, contentHash
    };

    const eventsSheet = getOrCreateImageUploadEventsSheet_(getSpreadsheet());
    if (!stableOperationKey.startsWith("legacy|")) {
        const operationEvents = findImageUploadEventsByOperationKey_(eventsSheet, stableOperationKey);
        if (operationEvents.some(entry => String(entry.values[1] || "").trim() !== token)) {
            throw new Error("El opId/campo ya está asociado a otro contenido en ImageUploadEvents.");
        }
    }

    let events = readImageUploadEventsByToken_(eventsSheet, token);
    let projection = projectImageUploadEvents_(events);
    if (projection && (projection.state === "requires_review" ||
        projection.operationKey !== expected.operationKey || projection.folderId !== expected.folderId ||
        projection.mimeType !== expected.mimeType || projection.sizeBytes !== expected.sizeBytes ||
        projection.contentHash !== expected.contentHash)) {
        throw new Error("La operación de imagen está en requires_review; no se reutilizó ningún archivo.");
    }
    if (!events.length) {
        appendImageUploadEventRequired_(eventsSheet, expected, "reserved", "", [], originalFilename, "");
        events = readImageUploadEventsByToken_(eventsSheet, token);
        projection = projectImageUploadEvents_(events);
    }

    let file = null;
    if (projection && projection.fileId) {
        try { file = DriveApp.getFileById(projection.fileId); }
        catch (lookupError) { file = null; }
        if (!file) {
            file = findExistingImageUpload(folder, temporaryFilename, expected, token);
            if (!file) {
                appendImageUploadEventRequired_(eventsSheet, expected, "file_missing", projection.fileId, [],
                    originalFilename, "El archivo registrado no está disponible en Drive.");
                throw new Error("El archivo de esta operación no está disponible; se conservó el evento para reconciliación.");
            }
        } else {
            verifyImageUploadFile_(file, folder, expected);
        }
    } else {
        file = findExistingImageUpload(folder, temporaryFilename, expected, token);
        if (!file) {
            blob.setName(temporaryFilename);
            file = folder.createFile(blob);
        }
    }

    verifyImageUploadFile_(file, folder, expected);
    const fileId = String(file.getId());
    const url = "https://drive.google.com/uc?export=view&id=" + fileId;
    const latestName = String(originalFilename || file.getName());
    const descriptionState = projection && projection.state === "linked" ? "linked" : "pending";
    const description = buildImageUploadDescription_({
        operationKey: stableOperationKey, token, folderId: expected.folderId,
        mimeType, sizeBytes: bytes.length, contentHash, fileName: latestName
    }, descriptionState, projection && projection.state === "linked" ? projection.referencesJson : "[]");
    file.setDescription(description);
    if (String(file.getDescription() || "") !== description) {
        throw new Error("Drive no confirmó por lectura posterior los metadatos de la carga.");
    }

    events = readImageUploadEventsByToken_(eventsSheet, token);
    projection = projectImageUploadEvents_(events);
    if (projection && projection.state === "requires_review") {
        throw new Error("Se detectó una carga concurrente con más de un archivo; la operación quedó para revisión.");
    }
    const alreadyRecorded = events.some(entry => String(entry.values[7] || "").trim() === fileId);
    if (!alreadyRecorded || (projection && !["pending", "linked"].includes(projection.state))) {
        appendImageUploadEventRequired_(eventsSheet, expected, "pending", fileId, [], latestName, "");
    }
    const confirmed = projectImageUploadEvents_(readImageUploadEventsByToken_(eventsSheet, token));
    if (!confirmed || confirmed.state === "requires_review" || confirmed.fileId !== fileId) {
        throw new Error("El journal no confirmó un archivo único; la carga quedó para revisión.");
    }
    return url;
}

function uploadImageToDrive(imageData, filename, folder, operationKey, options) {
    return uploadImageToDriveWithShortLedgerLocks_(imageData, filename, folder, operationKey);
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

function readIdempotenciaEntryByOpId_(sheet, opId) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!sheet || !cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Verificación de operación");
    const state = getIdempotenciaHeaderState(sheet);
    if (!state.compatible || state.missingIndexes.length) {
        throw new Error("La hoja Idempotencia dejó de ser compatible durante la operación; no se modificó.");
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const finder = sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(cleanOpId);
    finder.matchCase(true);
    finder.matchEntireCell(false);
    finder.useRegularExpression(false);
    if (typeof finder.matchFormulaText === "function") finder.matchFormulaText(false);
    const matches = (finder.findAll() || []).filter(range =>
        String(range.getValue() || "").trim() === cleanOpId
    );
    if (matches.length > 1) {
        throw new Error("opId duplicado " + cleanOpId + " en Idempotencia; no se modificó.");
    }
    if (!matches.length) return null;
    const rowIndex = matches[0].getRow();
    const availableColumns = Math.min(IDEMPOTENCIA_HEADERS.length, Math.max(0, Number(sheet.getMaxColumns()) || 0));
    if (availableColumns < IDEMPOTENCIA_HEADERS.length) {
        throw new Error("La fila del opId " + cleanOpId + " no contiene las seis columnas esperadas.");
    }
    const sourceRow = sheet.getRange(rowIndex, 1, 1, availableColumns).getValues()[0];
    const row = sourceRow.concat(Array(Math.max(0, IDEMPOTENCIA_HEADERS.length - sourceRow.length)).fill(""));
    const entry = normalizeIdempotenciaEntry_(row, rowIndex);
    if (!entry || entry.opId !== cleanOpId) {
        throw new Error("No se pudo validar la fila del opId " + cleanOpId + ".");
    }
    return entry;
}

function updateIdempotenciaEntriesSnapshot_(snapshot, entry) {
    if (!snapshot || !entry) return;
    if (!Array.isArray(snapshot.entries)) snapshot.entries = [];
    if (!(snapshot.byOpId instanceof Map)) snapshot.byOpId = new Map();
    const index = snapshot.entries.findIndex(item => item.opId === entry.opId);
    if (index >= 0) snapshot.entries[index] = entry;
    else snapshot.entries.push(entry);
    snapshot.byOpId.set(entry.opId, entry);
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
        if (state.compatible) return state.missingIndexes.length ? initializeIdempotenciaSheet(primary) : primary;
    }

    if (fallback) {
        const state = getIdempotenciaHeaderState(fallback);
        if (isUnsafeIdempotenciaHeaderState_(state)) {
            throw new Error("La hoja Idempotencia_Cortes tiene datos bajo un encabezado vacío o incompleto; se detuvo sin modificarla.");
        }
        if (!state.compatible) {
            throw new Error("La hoja Idempotencia_Cortes existe, pero su estructura no es compatible; requiere revisión manual.");
        }
        return state.missingIndexes.length ? initializeIdempotenciaSheet(fallback) : fallback;
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

function recordOpId(opId, vehicleId, slotIndex, timestamp, status, operationHash, entriesSnapshot) {
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
    const sheet = entriesSnapshot && entriesSnapshot.sheet ? entriesSnapshot.sheet : getIdempotenciaSheet();
    const ledgerSnapshot = entriesSnapshot || readIdempotenciaEntries_(sheet, false);
    let existing = ledgerSnapshot.byOpId.get(cleanOpId);

    if (entriesSnapshot) {
        const current = readIdempotenciaEntryByOpId_(sheet, cleanOpId);
        if (!!existing !== !!current) {
            throw new Error("El ledger Idempotencia cambió durante la operación para el opId " + cleanOpId + "; reintenta con el mismo identificador.");
        }
        if (existing && current) {
            if (existing.rowIndex !== current.rowIndex || existing.vehicleId !== current.vehicleId ||
                existing.slotIndex !== current.slotIndex || existing.operationHash !== current.operationHash) {
                throw new Error("La asociación del opId " + cleanOpId + " cambió durante la operación; no se modificó.");
            }
            existing = current;
        }
    }

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

        const verified = entriesSnapshot
            ? readIdempotenciaEntryByOpId_(sheet, cleanOpId)
            : readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
        if (!verified || verified.vehicleId !== cleanVehicleId ||
            verified.slotIndex !== cleanSlotIndex || verified.status !== finalStatus || verified.operationHash !== cleanOperationHash) {
            throw new Error("No se pudo verificar la actualización del opId " + cleanOpId + ".");
        }
        if (entriesSnapshot) updateIdempotenciaEntriesSnapshot_(entriesSnapshot, verified);
        return verified;
    }

    sheet.appendRow([cleanOpId, cleanVehicleId, cleanSlotIndex, cleanTimestamp, targetStatus, cleanOperationHash]);
    SpreadsheetApp.flush();
    const verified = entriesSnapshot
        ? readIdempotenciaEntryByOpId_(sheet, cleanOpId)
        : readIdempotenciaEntries_(sheet, false).byOpId.get(cleanOpId);
    if (!verified || verified.vehicleId !== cleanVehicleId ||
        verified.slotIndex !== cleanSlotIndex || verified.status !== targetStatus || verified.operationHash !== cleanOperationHash) {
        throw new Error("No se pudo verificar el registro del opId " + cleanOpId + ".");
    }
    if (entriesSnapshot) updateIdempotenciaEntriesSnapshot_(entriesSnapshot, verified);
    return verified;
}
function findUniqueCortesVehicleRow_(cortesSheet, vehicleId, opId) {
    if (!cortesSheet) throw new Error("No se encontró la hoja Cortes para recuperar el opId " + opId + ".");
    const cleanVehicleId = normalizeIdempotenciaVehicleId_(vehicleId, "Recuperación " + opId);
    const lastRow = cortesSheet.getLastRow();
    const idRows = lastRow > 1
        ? cortesSheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues()
        : [];
    const matches = [];
    for (let offset = 0; offset < idRows.length; offset++) {
        const rawId = idRows[offset][0];
        if (isBlankIdempotenciaValue_(rawId)) continue;
        const rowIndex = offset + 2;
        if (normalizeIdempotenciaVehicleId_(rawId, "Cortes fila " + rowIndex) === cleanVehicleId) {
            matches.push(rowIndex);
        }
    }
    if (matches.length !== 1) {
        throw new Error("No se puede recuperar el opId " + opId + ": vehicleId " + cleanVehicleId +
            " aparece en " + matches.length + " filas de Cortes; se requiere exactamente una. No se modificó.");
    }
    const rowIndex = matches[0];
    const rowValues = cortesSheet.getRange(rowIndex, 1, 1, cortesSheet.getLastColumn()).getValues()[0];
    return { rowIndex: rowIndex, rowValues: rowValues };
}

function findRowByOpId(sheet, opId, entriesSnapshot) {
    const cleanOpId = String(opId === null || opId === undefined ? "" : opId).trim();
    if (!cleanOpId) return null;
    normalizeIdempotenciaOpId_(cleanOpId, "Recuperación de operación");

    const entry = entriesSnapshot
        ? entriesSnapshot.byOpId.get(cleanOpId)
        : readIdempotenciaEntries_(getIdempotenciaSheet(), false).byOpId.get(cleanOpId);
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

    const lastRow = cortesSheet.getLastRow();
    const lastColumn = cortesSheet.getLastColumn();
    if (lastRow <= 1 || lastColumn < 1) return null;
    const headers = cortesSheet.getRange(1, 1, 1, lastColumn).getValues()[0] || [];

    // TextFinder ejecuta la búsqueda en Sheets y devuelve solo celdas coincidentes;
    // evita transferir y recorrer todas las celdas de la hoja en memoria.
    const searchRange = cortesSheet.getRange(2, 1, lastRow - 1, lastColumn);
    const finder = searchRange.createTextFinder(cleanOpId);
    finder.matchCase(true);
    finder.matchEntireCell(false);
    finder.useRegularExpression(false);
    if (typeof finder.matchFormulaText === "function") finder.matchFormulaText(false);
    const foundRanges = finder.findAll() || [];

    const directMatches = [];
    const taggedMatches = [];
    foundRanges.forEach(range => {
        const rowIndex = range.getRow();
        if (rowIndex < 2) return;
        const colIndex = range.getColumn();
        const value = range.getValue();
        const normalizedHeader = String(headers[colIndex - 1] || "").trim().toLowerCase();
        const isOperationColumn = normalizedHeader.includes("idoperacion") ||
            normalizedHeader.includes("id_operacion") ||
            (normalizedHeader === "vin" && /^OP-[A-Za-z0-9_-]{1,100}$/.test(String(value || "").trim()));

        if (String(value || "").trim() === cleanOpId && isOperationColumn) {
            directMatches.push({ rowIndex: rowIndex, colIndex: colIndex });
        }
        if (typeof value === "string" &&
            (value === cleanOpId || value.includes("[" + cleanOpId + "]"))) {
            taggedMatches.push({ rowIndex: rowIndex, colIndex: colIndex });
        }
    });

    let match = null;
    if (directMatches.length > 1) {
        throw new Error("El opId heredado " + cleanOpId +
            " aparece en varias columnas de operación de Cortes; no se eligió ni limpió ninguna coincidencia.");
    }
    if (directMatches.length === 1) {
        match = directMatches[0];
    } else {
        if (taggedMatches.length > 1) {
            throw new Error("El opId heredado " + cleanOpId +
                " aparece en varias celdas de Cortes; no se eligió ni limpió ninguna coincidencia.");
        }
        if (taggedMatches.length === 1) match = taggedMatches[0];
    }

    if (!match) return null;
    const vehicleId = cortesSheet.getRange(match.rowIndex, COLS_CORTES.id).getValue();
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
function handleCheckOperation(payload) {
    const { opId } = payload || {};
    if (!opId) throw new Error("ID de operación requerido.");

    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    const match = findRowByOpId(sheet, opId);
    const expectedHash = String(payload && payload.operationHash || "").trim().toLowerCase();

    if (match) {
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
            operationHash: match.operationHash,
            source: "Idempotencia"
        };
    }

    const contributionSheet = spreadsheet.getSheetByName("AportesVehiculo");
    if (contributionSheet) {
        const events = findVehicleContributionEventsByOpId_(contributionSheet, opId)
            .sort((a, b) => a.rowIndex - b.rowIndex);
        if (events.length) {
            const canonical = events[0];
            const values = canonical.values;
            const eventVehicleId = String(values[2] || "");
            const eventHash = String(values[3] || "").toLowerCase();
            const eventKind = String(values[4] || "").toLowerCase();
            const eventPayloadJson = String(values[5] || "");
            const conflict = events.some(entry =>
                String(entry.values[2] || "") !== eventVehicleId ||
                String(entry.values[3] || "").toLowerCase() !== eventHash ||
                String(entry.values[4] || "").toLowerCase() !== eventKind ||
                String(entry.values[5] || "") !== eventPayloadJson
            );
            if (conflict) {
                const error = new Error("El opId aparece con contenidos incompatibles en AportesVehiculo; ambos aportes permanecen para revisión.");
                error.code = "CONTRIBUTION_OP_ID_CONFLICT";
                throw error;
            }
            if (expectedHash && (!/^[a-f0-9]{64}$/.test(expectedHash) || eventHash !== expectedHash)) {
                throw new Error("El opId no corresponde a la huella del aporte recuperado.");
            }

            const postAppendLedgerRows = readVehicleContributionLedgerRows_(contributionSheet);
            const createdAt = String(values[8] || "");
            const timestamp = createdAt && !Number.isNaN(Date.parse(createdAt))
                ? Utilities.formatDate(new Date(createdAt), "GMT-6", "dd/MM/yyyy")
                : "";
            const status = String(values[9] || "accepted").toLowerCase();
            let candidateReviewPending = status !== "accepted";
            let vinConflictPending = false;
            let slotIndex = null;
            if (status === "accepted" && ["cut", "opening", "feed"].includes(eventKind)) {
                const snapshot = readSupplementaryVehicleSnapshot_(sheet, eventVehicleId);
                if (eventKind === "cut") {
                    slotIndex = getVehicleContributionCutSlotIndex_(spreadsheet, snapshot, String(values[0] || ""), postAppendLedgerRows);
                    let eventPayload = {};
                    try { eventPayload = JSON.parse(eventPayloadJson || "{}"); } catch (parseError) { eventPayload = {}; }
                    const vinPrefix = String(eventPayload.vinPrefix || "").trim().toUpperCase();
                    if (vinPrefix) {
                        const existingVinDuplicate = checkVinDuplicateInSheet(sheet, vinPrefix, eventVehicleId);
                        const concurrentVinDuplicate = findVehicleContributionVinConflict_(spreadsheet, vinPrefix, eventVehicleId, postAppendLedgerRows);
                        vinConflictPending = Boolean(existingVinDuplicate || concurrentVinDuplicate);
                    }
                    candidateReviewPending = slotIndex === null || vinConflictPending;
                } else {
                    candidateReviewPending = getVehicleContributionCandidateStatus_(
                        spreadsheet, snapshot, String(values[0] || ""), eventKind
                    );
                }
            }
            return {
                status: "success",
                exists: true,
                pending: false,
                operationStatus: "completed",
                vehicleId: eventVehicleId,
                timestamp,
                operationHash: eventHash,
                contributionEventId: String(values[0] || ""),
                contributionKind: eventKind,
                slotIndex,
                candidateReviewPending,
                vinConflictPending,
                duplicate: events.length > 1,
                source: "AportesVehiculo"
            };
        }
    }

    return { status: "success", exists: false, pending: false };
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
  var firstEntityColumn = COLS_CORTES.marca;
  var entityColumnCount = COLS_CORTES.versionesAplicables - firstEntityColumn + 1;
  var data = sheet.getRange(2, firstEntityColumn, lastRow - 1, entityColumnCount).getValues();
  var brands = [];
  var models = [];
  var versions = [];
  var brandSet = new Set();
  var modelSet = new Set();
  var versionSet = new Set();
  var brandOffset = COLS_CORTES.marca - firstEntityColumn;
  var modelOffset = COLS_CORTES.modelo - firstEntityColumn;
  var versionOffset = COLS_CORTES.versionesAplicables - firstEntityColumn;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var brandVal = String(row[brandOffset] || "").trim();
    var modelVal = String(row[modelOffset] || "").trim();
    var versionVal = String(row[versionOffset] || "").trim();

    if (brandVal && !brandSet.has(brandVal)) {
      brandSet.add(brandVal);
      brands.push(brandVal);
    }
    if (modelVal && !modelSet.has(modelVal)) {
      modelSet.add(modelVal);
      models.push(modelVal);
    }
    if (versionVal && !versionSet.has(versionVal)) {
      versionSet.add(versionVal);
      versions.push(versionVal);
    }
  }

  return { brands: brands, models: models, versions: versions };
}

// ============================================================================
// LÓGICA Y HANDLERS DE VIN (Vehicle Identification Number)
// ============================================================================

function parseEquipmentVersions(rawStr) {
  if (!rawStr) return [];
  return String(rawStr).split(/[,\/\\;]+/).map(v => v.trim()).filter(Boolean);
}

function countEquipmentVersions(versionesStr) {
  if (!versionesStr) return 1;
  const str = String(versionesStr).trim();
  if (!str) return 1;
  const parts = str.split(/[,\/\\;]+/).map(p => p.trim()).filter(Boolean);
  const count = parts.length;
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3; // Máximo 3
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
    const values = text.split(/[,\/\\;]+/)
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

/* TAREA 4 (11.1, 11.2, 11.7, B34): EXCLUSIÓN DE ÚLTIMOS 5 CARACTERES Y PROCESAMIENTO DE VIN */
function extractVinPrefix(vinStr) {
    if (vinStr === null || vinStr === undefined || String(vinStr).trim() === "") return "";
    if (typeof vinStr !== "string") throw new Error("El VIN debe enviarse como texto.");
    const raw = vinStr.trim();
    if (!/^[A-Za-z0-9 -]+$/.test(raw)) {
        throw new Error("El VIN contiene caracteres no permitidos; solo se admiten letras, números, espacios y guiones.");
    }
    const cleaned = raw.toUpperCase().replace(/[ -]/g, "");
    if (cleaned.length > 18) throw new Error("El VIN normalizado no puede superar 18 caracteres.");
    if (cleaned.length <= 5) throw new Error("El VIN debe contener más de cinco caracteres; los últimos cinco se reservan para el número serial.");
    if (cleaned.length < 6) throw new Error("El VIN debe contener entre 6 y 18 caracteres alfanuméricos después de normalizarse.");
    return cleaned.substring(0, cleaned.length - 5);
}

function checkVinDuplicateInSheet(sheet, vinPrefix, currentVehicleId) {
  if (!vinPrefix) return null;
  const vinColumnIndex = getVinColumnIndex(sheet);
  if (!vinColumnIndex) {
    throw new Error("La hoja «Cortes» no contiene una columna «vin»; no es posible validar duplicados.");
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowId = row[COLS_CORTES.id - 1];
    if (currentVehicleId && String(rowId) === String(currentVehicleId)) continue;

    const rowVinRaw = row[vinColumnIndex - 1];
    const vinList = parseVinCollection(rowVinRaw);
    if (vinList.includes(vinPrefix)) {
      const marca = row[COLS_CORTES.marca - 1] || "";
      const modelo = row[COLS_CORTES.modelo - 1] || "";
      const anoDesde = row[COLS_CORTES.anoDesde - 1] || "";
      const anoHasta = row[COLS_CORTES.anoHasta - 1] || "";
      const modelName = `${marca} ${modelo} (${anoDesde}${anoHasta ? '-' + anoHasta : ''})`.trim();
      return {
        vehicleId: rowId,
        modelName: modelName,
        vinPrefix: vinPrefix
      };
    }
  }
  return null;
}

function handleCheckVinDuplicate(payload) {
  const { vin, currentVehicleId } = payload || {};
  const prefix = extractVinPrefix(vin);
  if (!prefix) {
    return { status: 'success', duplicate: false };
  }
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
  const match = checkVinDuplicateInSheet(sheet, prefix, currentVehicleId);
  if (match) {
    return {
      status: 'duplicate',
      duplicate: true,
      vehicleId: match.vehicleId,
      modelName: match.modelName,
      vinPrefix: match.vinPrefix
    };
  }
  return { status: 'success', duplicate: false, vinPrefix: prefix };
}

function findExistingVinRegistrationNoop_(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (source.isNewTrim === true) return null;
    const vehicleId = String(source.vehicleId || "").trim();
    const prefix = extractVinPrefix(source.vin);
    const trimLevel = String(source.trimLevel || "").trim();
    if (!vehicleId || !prefix || !trimLevel) return null;
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet || sheet.getLastRow() < 2) return null;
    const vinColumnIndex = getVinColumnIndex(sheet);
    if (!vinColumnIndex) return null;
    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues().flat();
    const matches = [];
    ids.forEach((id, index) => {
        if (String(id == null ? "" : id).trim() === vehicleId) matches.push(index + 2);
    });
    // Una fila ambigua debe continuar por la ruta protegida, nunca producir un falso replay.
    if (matches.length !== 1) return null;
    const row = sheet.getRange(matches[0], 1, 1, sheet.getLastColumn()).getValues()[0];
    const versionsText = String(row[COLS_CORTES.versionesAplicables - 1] || "").trim();
    const versions = parseEquipmentVersions(versionsText);
    if (versions.length > 3) return null;
    const targetIndex = versions.findIndex(value => value.toLowerCase() === trimLevel.toLowerCase());
    if (targetIndex < 0 || targetIndex > 2) return null;
    const collection = parseVinCollection(row[vinColumnIndex - 1]);
    if (collection[targetIndex] !== prefix) return null;
    return {
        status: "success", alreadyPresent: true, vehicleId,
        message: "El VIN ya está registrado para esta versión de equipamiento.",
        vinPrefix: prefix, vinCollection: collection, versionesAplicables: versionsText
    };
}

function handleAddVinToVehicle(payload) {
    try {
        const collaboratorName = getAuthenticatedCollaborator(payload || {});
        const replay = findExistingVinRegistrationNoop_(payload || {});
        if (replay) return replay;
        return handleAddVinToVehicleLocked(payload || {}, collaboratorName);
    } catch (error) {
        return { status: "error", code: error && error.code || "SERVICE_ERROR",
            message: error && error.message ? error.message : "No se pudo registrar el VIN." };
    }
}

function handleAddVinToVehicleLocked(payload, collaboratorName) {
    if (collaboratorName === undefined) collaboratorName = getAuthenticatedCollaborator(payload || {});
    const vehicleId = String(payload.vehicleId || "").trim();
    const prefix = extractVinPrefix(payload.vin);
    const actorId = String(payload && payload.__sharedSessionActor && payload.__sharedSessionActor.userId || "").trim();
    if (!actorId) return { status: "error", code: "VIN_ACTOR_REQUIRED", message: "No se pudo identificar al colaborador autenticado." };
    if (!vehicleId || !prefix) return { status: "error", message: "ID de vehículo y VIN son requeridos." };
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const vinColumnIndex = getVinColumnIndex(sheet);
    if (!vinColumnIndex) return { status: "error", message: "La hoja «Cortes» no contiene una columna «VIN»." };
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: "error", message: "No se encontraron vehículos registrados." };
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const matches = [];
    for (let i = 0; i < data.length; i++) {
        if (String(data[i][COLS_CORTES.id - 1] == null ? "" : data[i][COLS_CORTES.id - 1]).trim() === vehicleId) matches.push(i);
    }
    if (matches.length !== 1) return { status: "error", message: matches.length ? "El ID del vehículo está duplicado." : "Vehículo no encontrado." };
    const row = data[matches[0]];
    const currentVersionsStr = String(row[COLS_CORTES.versionesAplicables - 1] || "").trim();
    const versions = parseEquipmentVersions(currentVersionsStr);
    if (versions.length > 3) return { status: "error", message: "El vehículo contiene más de tres versiones de equipamiento; se requiere revisar su configuración antes de agregar VIN." };
    const trim = String(payload.trimLevel || "").trim();
    if (!trim) return { status: "error", message: "Selecciona una versión de equipamiento para asociar el VIN." };
    const nextVersions = versions.slice();
    const existingTrimIndex = versions.findIndex(value => value.toLowerCase() === trim.toLowerCase());
    let targetIndex = -1;
    if (payload.isNewTrim === true) {
        if (existingTrimIndex >= 0) return { status: "error", message: "La versión de equipamiento ya existe. Selecciona la versión registrada en lugar de crearla nuevamente." };
        if (versions.length >= 3) return { status: "error", message: "Este vehículo ya alcanzó el máximo de tres versiones de equipamiento." };
        nextVersions.push(trim); targetIndex = nextVersions.length - 1;
    } else {
        if (existingTrimIndex < 0) return { status: "error", message: "La versión seleccionada ya no existe en el registro del vehículo. Actualiza el catálogo e inténtalo nuevamente." };
        targetIndex = existingTrimIndex;
    }
    const maxAllowed = Math.max(1, nextVersions.length);
    if (targetIndex < 0 || targetIndex >= maxAllowed || targetIndex > 2) return { status: "error", message: "La versión seleccionada no corresponde a una posición VIN válida." };
    const existingCollection = parseVinCollection(row[vinColumnIndex - 1]);
    const sameIndex = existingCollection.findIndex(value => value === prefix);
    const modelName = [row[COLS_CORTES.marca - 1] || "", row[COLS_CORTES.modelo - 1] || ""].join(" ").trim() +
        " (" + String(row[COLS_CORTES.anoDesde - 1] || "") + (row[COLS_CORTES.anoHasta - 1] ? "-" + row[COLS_CORTES.anoHasta - 1] : "") + ")";
    if (sameIndex >= 0) {
        if (sameIndex === targetIndex) return { status: "success", alreadyPresent: true,
            message: "El VIN ya está registrado para esta versión de equipamiento.", vehicleId,
            vinPrefix: prefix, vinCollection: existingCollection, versionesAplicables: currentVersionsStr };
        return { status: "duplicate", message: "El VIN ya está registrado en otra versión de este mismo vehículo.",
            vehicleId, modelName, vinPrefix: prefix, vinCollection: existingCollection };
    }
    const duplicate = checkVinDuplicateInSheet(sheet, prefix, vehicleId);
    if (duplicate) return { status: "duplicate", message: "El VIN ya está registrado para: " + duplicate.modelName,
        vehicleId: duplicate.vehicleId, modelName: duplicate.modelName, vinPrefix: prefix };
    const update = addVinToAvailableSlot(existingCollection, prefix, maxAllowed, targetIndex);
    if (update.alreadyPresent) return { status: "success", alreadyPresent: true,
        message: "El VIN ya está registrado para esta versión de equipamiento.", vehicleId,
        vinPrefix: prefix, vinCollection: update.collection, versionesAplicables: currentVersionsStr };
    const updatedVersionsStr = nextVersions.join(" / ");
    const eventPayload = {
        fieldName: "vin_registration",
        expectedCurrentValue: { versionesAplicables: currentVersionsStr, vin: existingCollection },
        value: { versionesAplicables: updatedVersionsStr, vin: update.collection }
    };
    const operationHash = computeVehicleContributionHash_(vehicleId, "vehicle_update", eventPayload);
    const opId = "OP-WRITE-VIN-" + operationHash.slice(0, 40);
    const event = appendVehicleContributionEvent_({
        spreadsheet: getSpreadsheet(), vehicleId, opId, kind: "vehicle_update",
        payload: eventPayload, operationHash, actorId, actorName: collaboratorName
    });
    return { status: "success", message: "VIN registrado correctamente.", vehicleId, opId,
        vinPrefix: prefix, vinCollection: update.collection, versionesAplicables: updatedVersionsStr,
        contributionEventId: event.eventId, duplicate: event.duplicate === true, catalogResetRequired: true };
}
