// ============================================================================
// GPSPEDIA-CATALOG SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.4.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os";
const LOG_INVALID_IDS = false; // Cambiar a true para registrar IDs de imagen inválidos en la consola.
let spreadsheet = null;
let invalidImageIdsFound = []; // Almacena IDs inválidos para el modo diagnóstico.

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

// Mapas de columnas actualizados al esquema v2.0
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

function getCortesColumnMap(sheet) {
    const columnMap = { ...COLS_CORTES };
    const lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) return columnMap;
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const vinIndex = headers.findIndex(value => String(value || "").trim().toLowerCase() === "vin");
    if (vinIndex >= 0) columnMap.vin = vinIndex + 1;
    ['activaTestigo1', 'activaTestigo2', 'activaTestigo3'].forEach(headerName => {
        const headerIndex = headers.findIndex(value => String(value || '').trim() === headerName);
        if (headerIndex !== -1) columnMap[headerName] = headerIndex + 1;
    });
    return columnMap;
}

const COLS_LOGOS_MARCA = {
    id: 1,
    nombreMarca: 2,
    urlLogo: 3
};

const COLS_TUTORIALES = {
    ID: 1,
    Tema: 2,
    Imagen: 3,
    comoIdentificarlo: 4,
    dondeEncontrarlo: 5,
    Detalles: 6,
    Video: 7,
    Colaborador: 8
};

const COLS_RELAY = {
    ID: 1,
    configuracion: 2,
    funcion: 3,
    vehiculoDondeSeUtiliza: 4,
    pin30Entrada: 5,
    pin85BobinaPositivo: 6,
    pin86bobinaNegativo: 7,
    pin87aComunCerrado: 8,
    pin87ComunmenteAbierto: 9,
    imagen: 10,
    observacion: 11
};

const CATALOG_TRAFFIC_BUCKET_PREFIX_ = "GPSpedia_CATALOG_TRAFFIC_HOUR_V1_";
const CATALOG_TRAFFIC_BUCKET_MS_ = 60 * 60 * 1000;
const CATALOG_TRAFFIC_WINDOW_MS_ = 24 * 60 * 60 * 1000;
const CATALOG_TRAFFIC_SECRET_PROPERTY_ = "GPSpedia_CATALOG_TRAFFIC_SECRET";
const CATALOG_TRAFFIC_ACTIONS_ = new Set([
    "getCatalogData", "getDropdownData", "getSuggestion", "getNavigationData",
    "getVehicleProjection", "getContributionCandidates"
]);

function recordCatalogTraffic_(capturedAt) {
    let lock = null;
    let lockAcquired = false;
    try {
        lock = LockService.getScriptLock();
        // No esperar por el lock: si hay contención se omite la métrica y la lectura continúa.
        lockAcquired = lock.tryLock(0);
        if (!lockAcquired) return false;
        const properties = PropertiesService.getScriptProperties();
        const currentTime = Number(capturedAt) || Date.now();
        const bucketStart = Math.floor(currentTime / CATALOG_TRAFFIC_BUCKET_MS_) * CATALOG_TRAFFIC_BUCKET_MS_;
        if (!Number.isSafeInteger(bucketStart) || bucketStart <= 0) return false;
        const key = CATALOG_TRAFFIC_BUCKET_PREFIX_ + bucketStart;
        const raw = properties.getProperty(key);

        // La limpieza se ejecuta solo al crear el primer bucket de una nueva hora.
        if (!raw) {
            const firstBucket = bucketStart - CATALOG_TRAFFIC_WINDOW_MS_ + CATALOG_TRAFFIC_BUCKET_MS_;
            const all = properties.getProperties() || {};
            Object.keys(all).forEach(propertyKey => {
                if (!propertyKey.startsWith(CATALOG_TRAFFIC_BUCKET_PREFIX_)) return;
                const startAt = Number(propertyKey.slice(CATALOG_TRAFFIC_BUCKET_PREFIX_.length));
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
            } catch (error) { /* Un bucket dañado se reemplaza sin afectar la respuesta CATALOG. */ }
        }
        bucket.count = Math.min(Number.MAX_SAFE_INTEGER, bucket.count + 1);
        properties.setProperty(key, JSON.stringify(bucket));
        return true;
    } catch (error) {
        return false;
    } finally {
        // Apps Script solo permite liberar un lock adquirido por esta ejecución.
        if (lock && lockAcquired) {
            try { lock.releaseLock(); } catch (releaseError) {}
        }
    }
}

function catalogTrafficSecretEquals_(expected, supplied) {
    expected = String(expected || "");
    supplied = String(supplied || "");
    if (expected.length < 32 || expected.length !== supplied.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index++) {
        difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
    }
    return difference === 0;
}

function readCatalogTraffic_(suppliedSecret, capturedAt) {
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = String(properties.getProperty("GPSpedia_COORDINATOR_SECRET") ||
        properties.getProperty(CATALOG_TRAFFIC_SECRET_PROPERTY_) || "");
    if (!catalogTrafficSecretEquals_(expectedSecret, suppliedSecret)) {
        return { status: "error", message: "Acceso denegado a la telemetría CATALOG." };
    }

    const currentTime = Number(capturedAt) || Date.now();
    const currentBucket = Math.floor(currentTime / CATALOG_TRAFFIC_BUCKET_MS_) * CATALOG_TRAFFIC_BUCKET_MS_;
    const firstBucket = currentBucket - CATALOG_TRAFFIC_WINDOW_MS_ + CATALOG_TRAFFIC_BUCKET_MS_;
    const all = properties.getProperties() || {};
    const stored = new Map();
    Object.keys(all).forEach(key => {
        if (!key.startsWith(CATALOG_TRAFFIC_BUCKET_PREFIX_)) return;
        const startAt = Number(key.slice(CATALOG_TRAFFIC_BUCKET_PREFIX_.length));
        if (!Number.isSafeInteger(startAt) || startAt < firstBucket || startAt > currentBucket) return;
        let parsed;
        try { parsed = JSON.parse(all[key]); } catch (error) { parsed = null; }
        if (parsed && parsed.version === 1 && parsed.startAt === startAt &&
            Number.isSafeInteger(parsed.count) && parsed.count >= 0) stored.set(startAt, parsed.count);
    });

    const buckets = [];
    const totals = { lastHour: 0, last6Hours: 0, last24Hours: 0 };
    for (let startAt = firstBucket; startAt <= currentBucket; startAt += CATALOG_TRAFFIC_BUCKET_MS_) {
        const count = stored.get(startAt) || 0;
        buckets.push({ startAt, count });
        if (startAt + CATALOG_TRAFFIC_BUCKET_MS_ > currentTime - 60 * 60 * 1000) totals.lastHour += count;
        if (startAt + CATALOG_TRAFFIC_BUCKET_MS_ > currentTime - 6 * 60 * 60 * 1000) totals.last6Hours += count;
        totals.last24Hours += count;
    }
    return {
        status: "success",
        service: "CATALOG",
        scope: "catalog_post_requests",
        source: "catalog_script_properties",
        accuracy: "best_effort_nonblocking",
        mayUndercount: true,
        capturedAt: currentTime,
        windowMs: CATALOG_TRAFFIC_WINDOW_MS_,
        bucketMs: CATALOG_TRAFFIC_BUCKET_MS_,
        buckets,
        totals
    };
}

// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================
function doGet(e) {
    if (e && e.parameter && e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Catalog',
            version: '2.4.0',
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState))
            .setMimeType(ContentService.MimeType.JSON);
    }
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Catalog-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  invalidImageIdsFound = []; // Resetear para cada nueva solicitud.
  const isDiagnosticMode = e.parameter.diagnostics === 'true';
  const startTime = new Date();

  try {
    const request = JSON.parse(e.postData.contents);
    const action = String(request.action || "");
    const payload = request.payload || {};

    // Endpoint interno ADMIN->CATALOG: no se registra a sí mismo y requiere secreto servidor-a-servidor.
    if (action === "getServiceTraffic") {
      const traffic = readCatalogTraffic_(payload.secret);
      return ContentService.createTextOutput(JSON.stringify(traffic))
        .setMimeType(ContentService.MimeType.TEXT);
    }
    if (CATALOG_TRAFFIC_ACTIONS_.has(action)) recordCatalogTraffic_();

    let result;
    switch (action) {
      case 'getCatalogData':
        result = handleGetCatalogData(payload);
        break;
      case 'getDropdownData':
        result = handleGetDropdownData();
        break;
      // Compatibilidad para llamadas directas históricas; routeAction usa WRITE.
      case 'getSuggestion':
        result = handleGetSuggestion(payload);
        break;
      case 'getNavigationData':
        result = handleGetNavigationData();
        break;
      case 'getVehicleProjection':
        result = handleGetVehicleProjection_(payload);
        break;
      case 'getContributionCandidates':
        result = handleGetContributionCandidates_(payload);
        break;
      default:
        throw new Error(`Acción desconocida: ${action}`);
    }

    // Si el modo diagnóstico está activado, envolver la respuesta.
    if (isDiagnosticMode) {
      const executionTime = new Date() - startTime;
      const diagnosticResult = {
        diagnostics: {
          executionTimeMs: executionTime,
          invalidImageIdsCount: invalidImageIdsFound.length,
          invalidImageIds: invalidImageIdsFound,
        },
        payload: result
      };
      return ContentService.createTextOutput(JSON.stringify(diagnosticResult))
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Respuesta estándar
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    const errorResponse = {
      status: 'error',
      message: 'Se ha producido un error en el servidor.',
      details: {
        errorMessage: error.message,
        stack: error.stack
      }
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// ============================================================================
// MANEJADORES DE ACCIONES (HANDLERS)
// ============================================================================

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Cortes): Define los campos dentro de la hoja 'Cortes'
 * que deben ser tratados como IDs de imagen. El servicio garantiza que los valores
 * en estos campos serán siempre un fileId de Google Drive válido (string) o null.
 * El frontend NUNCA recibirá una URL completa.
 */
const IMAGE_FIELDS_CORTES = new Set(['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen', 'imgCableAlimen2', 'imgCableAlimen3']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Logos): Define los campos de imagen para la hoja 'LogosMarca'.
 */
const IMAGE_FIELDS_LOGOS = new Set(['urlLogo']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Tutoriales): Define los campos de imagen para la hoja 'Tutorial'.
 */
const IMAGE_FIELDS_TUTORIALES = new Set(['Imagen']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Relay): Define los campos de imagen para la hoja 'Relay'.
 */
const IMAGE_FIELDS_RELAY = new Set(['imagen']);

/**
 * Convierte una fila de hoja de cálculo (array) en un objeto utilizando un mapa de columnas.
 * @param {Array} row - La fila de datos.
 * @param {object} colMap - El objeto que mapea nombres de clave a índices de columna (basado en 1).
 * @param {Set<string>} imageFields - Un Set con los nombres de las claves que deben ser normalizadas como IDs de imagen.
 * @returns {object|null} - El objeto mapeado o null si la fila está vacía.
 */
function mapRowToObject(row, colMap, imageFields = new Set()) {
  if (!row || row.length === 0) {
    return null;
  }
  const obj = {};
  for (const key in colMap) {
    const colIndex = colMap[key] - 1;
    let value = row[colIndex] !== undefined && row[colIndex] !== '' ? row[colIndex] : null;

    // Si el campo es un campo de imagen, normalizar y validar su valor.
    if (imageFields.has(key)) {
      value = normalizeAndValidateImageId(value);
    }

    obj[key] = value;
  }
  return obj;
}


const VEHICLE_CONTRIBUTIONS_SHEET_NAME_ = "AportesVehiculo";
const VEHICLE_CONTRIBUTIONS_HEADERS_ = Object.freeze([
    "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
    "actorId", "actorName", "createdAt", "status", "supersedesEventId"
]);

function readVehicleContributionEvents_(spreadsheetRef) {
    const ss = spreadsheetRef || getSpreadsheet();
    const sheet = ss.getSheetByName(VEHICLE_CONTRIBUTIONS_SHEET_NAME_);
    if (!sheet) return [];
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < VEHICLE_CONTRIBUTIONS_HEADERS_.length) {
        throw new Error("La hoja «AportesVehiculo» existe, pero su esquema está incompleto. No se proyectaron aportes.");
    }
    const headers = sheet.getRange(1, 1, 1, VEHICLE_CONTRIBUTIONS_HEADERS_.length)
        .getDisplayValues()[0].map(value => String(value || "").trim());
    if (VEHICLE_CONTRIBUTIONS_HEADERS_.some((header, index) => headers[index] !== header)) {
        throw new Error("La hoja «AportesVehiculo» no coincide con el esquema versionado. No se proyectaron aportes.");
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, 1, lastRow - 1, VEHICLE_CONTRIBUTIONS_HEADERS_.length).getValues()
        .map((row, offset) => {
            const context = "AportesVehiculo fila " + (offset + 2);
            const eventId = String(row[0] || "").trim();
            const opId = String(row[1] || "").trim();
            const vehicleId = String(row[2] || "").trim();
            const operationHash = String(row[3] || "").trim().toLowerCase();
            const kind = String(row[4] || "").trim().toLowerCase();
            const payloadJson = String(row[5] || "");
            const actorId = String(row[6] || "").trim();
            const actorName = String(row[7] || "").trim();
            const createdAt = String(row[8] || "").trim();
            const status = String(row[9] || "").trim().toLowerCase();
            const supersedesEventId = String(row[10] || "").trim();
            const validContributionKind = ["cut", "opening", "feed", "vehicle"].includes(kind) ||
                (kind === "vehicle_update" && Boolean(actorId) &&
                    (opId.startsWith("OP-ADMIN-") || opId.startsWith("OP-WRITE-VIN-") ||
                        (opId.startsWith("OP-YEAR-") && actorId === "SYSTEM:FEEDBACK_YEAR")));
            if (!eventId || !/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId) || !vehicleId ||
                !/^[a-f0-9]{64}$/.test(operationHash) || !validContributionKind ||
                !createdAt || Number.isNaN(Date.parse(createdAt)) ||
                !["accepted", "review", "retracted"].includes(status)) {
                throw new Error(context + ": identidad, hash, tipo, fecha o estado inválido. No se proyectó el ledger.");
            }
            let payload;
            try { payload = JSON.parse(payloadJson); } catch (error) {
                throw new Error(context + ": payloadJson no es JSON válido. No se proyectó el ledger.");
            }
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                throw new Error(context + ": payloadJson debe contener un objeto. No se proyectó el ledger.");
            }
            return {
                eventId, opId, vehicleId, operationHash, kind, payload,
                actorId, actorName, createdAt, status, supersedesEventId, rowIndex: offset + 2
            };
        });
}

function projectVehicleContributionEvents_(vehicles, sourceEvents) {
    if (!Array.isArray(vehicles)) throw new Error("La proyección requiere una lista de vehículos.");
    const events=Array.isArray(sourceEvents)?sourceEvents.slice().sort((a,b)=>Number(a.rowIndex)-Number(b.rowIndex)):[];
    const byEventId=new Map();events.forEach(e=>{const id=String(e&&e.eventId||"");if(id&&!byEventId.has(id))byEventId.set(id,e);});
    const resolutionsByTarget=new Map();
    events.forEach(e=>{
        const targetId=String(e&&e.supersedesEventId||"").trim();
        if(!targetId||!["accepted","retracted"].includes(String(e.status||"").toLowerCase())||!String(e.actorId||"").trim()||!String(e.opId||"").startsWith("OP-ADMIN-"))return;
        const target=byEventId.get(targetId);
        if(!target||target.eventId===e.eventId||target.vehicleId!==e.vehicleId||target.kind!==e.kind||e.kind==="vehicle_update")return;
        if(!resolutionsByTarget.has(targetId))resolutionsByTarget.set(targetId,[]);resolutionsByTarget.get(targetId).push(e);
    });
    const supersededEventIds=new Set(),conflictingResolutionTargets=new Set();
    resolutionsByTarget.forEach((items,id)=>{if(items.length===1)supersededEventIds.add(id);else conflictingResolutionTargets.add(id);});
    const effectiveEvents=events.filter(e=>{const targetId=String(e&&e.supersedesEventId||"");return !supersededEventIds.has(String(e&&e.eventId||""))&&!conflictingResolutionTargets.has(targetId)&&!(e&&targetId&&String(e.status||"").toLowerCase()==="retracted");});
    const resolvedFieldCandidateIds=new Set();
    events.forEach(e=>{
        if(e.kind!=="vehicle_update"||String(e.status||"").toLowerCase()!=="retracted"||
            !String(e.actorId||"").trim()||!String(e.opId||"").startsWith("OP-ADMIN-"))return;
        const candidateId=String(e.payload&&e.payload.resolvesCandidateEventId||"").trim();
        const candidate=byEventId.get(candidateId);
        if(candidate&&candidate.kind==="vehicle_update"&&candidate.vehicleId===e.vehicleId)resolvedFieldCandidateIds.add(candidateId);
    });
    const byVehicle = new Map();
    const byOpId = new Map();
    const conflictedOpIds = new Set();
    const vinOwners = new Map();
    const readVinPrefixes = raw => {
        if (raw === null || raw === undefined || raw === "") return [];
        let values;
        if (Array.isArray(raw)) values = raw;
        else {
            const text = String(raw).trim();
            if (!text) return [];
            if (text.startsWith("[") || text.endsWith("]")) {
                let parsed;
                try { parsed = JSON.parse(text); } catch (error) {
                    throw new Error("La colección VIN del catálogo contiene JSON inválido; se canceló la proyección.");
                }
                if (!Array.isArray(parsed)) throw new Error("La colección VIN del catálogo debe ser un array.");
                values = parsed;
            } else values = text.split(/[,/\\\\;]+/);
        }
        return values.map(value => String(value || "").trim().toUpperCase()).filter(Boolean);
    };
    const registerVinOwner = (prefix, vehicleId) => {
        const key = String(prefix || "").trim().toUpperCase();
        const owner = String(vehicleId || "").trim();
        if (!key || !owner) return;
        if (!vinOwners.has(key)) vinOwners.set(key, new Set());
        vinOwners.get(key).add(owner);
    };
    vehicles.forEach(vehicle => {
        if (!vehicle || vehicle.id === null || vehicle.id === undefined) return;
        readVinPrefixes(vehicle.vin).forEach(prefix => registerVinOwner(prefix, vehicle.id));
    });
    const eventVinPrefixes = event => {
        if(event&&event.kind==="vehicle_update"&&event.payload&&event.payload.fieldName==="vin")
            return readVinPrefixes(event.payload.value);
        if(event&&event.kind==="vehicle_update"&&event.payload&&event.payload.fieldName==="vin_registration"&&event.payload.value&&typeof event.payload.value==="object")
            return readVinPrefixes(event.payload.value.vin);
        const prefix=String(event&&event.payload&&event.payload.vinPrefix||"").trim().toUpperCase();
        return prefix?[prefix]:[];
    };
    effectiveEvents.forEach(event => {
        if(event&&event.kind==="vehicle_update"&&String(event.status||"").toLowerCase()!=="accepted")return;
        eventVinPrefixes(event).forEach(prefix=>registerVinOwner(prefix,event.vehicleId));
    });
    const conflictedVinEventIds = new Set();
    effectiveEvents.forEach(event => {
        if(event&&event.kind==="vehicle_update"&&String(event.status||"").toLowerCase()!=="accepted")return;
        if(eventVinPrefixes(event).some(prefix=>(vinOwners.get(prefix)||new Set()).size>1))
            conflictedVinEventIds.add(String(event.eventId||""));
    });

    effectiveEvents.forEach(event => {
        if (!event || !String(event.vehicleId || "").trim() ||
            !/^OP-[A-Za-z0-9_-]{1,100}$/.test(String(event.opId || "")) ||
            !/^[a-f0-9]{64}$/i.test(String(event.operationHash || "")) ||
            !["cut", "opening", "feed", "vehicle", "vehicle_update"].includes(String(event.kind || "")) ||
            (event.kind==="vehicle_update"&&(!String(event.actorId||"").trim()||
                !(String(event.opId||"").startsWith("OP-ADMIN-") || String(event.opId||"").startsWith("OP-WRITE-VIN-") ||
                    (String(event.opId||"").startsWith("OP-YEAR-")&&String(event.actorId||"")==="SYSTEM:FEEDBACK_YEAR")))) ||
            !event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
            throw new Error("El ledger contiene un evento de aporte inválido; se canceló la proyección completa.");
        }
        const previous = byOpId.get(event.opId);
        if (previous) {
            if (previous.operationHash !== event.operationHash ||
                previous.vehicleId !== event.vehicleId || previous.kind !== event.kind ||
                JSON.stringify(previous.payload) !== JSON.stringify(event.payload)) {
                conflictedOpIds.add(event.opId);
            }
            return;
        }
        byOpId.set(event.opId, event);
    });

    byOpId.forEach(event => {
        if (conflictedOpIds.has(event.opId)) return;
        if (!byVehicle.has(event.vehicleId)) byVehicle.set(event.vehicleId, []);
        byVehicle.get(event.vehicleId).push(event);
    });

    return vehicles.map(sourceVehicle => {
        if (!sourceVehicle || sourceVehicle.id === null || sourceVehicle.id === undefined) return sourceVehicle;
        const vehicle = Object.assign({}, sourceVehicle);
        const vehicleId = String(vehicle.id).trim();
        const candidates = [];
        const sources = {};
        const vehicleEvents=byVehicle.get(vehicleId)||[];
        events.filter(e=>conflictingResolutionTargets.has(String(e.eventId||""))&&String(e.vehicleId)===vehicleId).forEach(e=>candidates.push({eventId:e.eventId,opId:e.opId,kind:e.kind,reason:"resolution_conflict",payload:e.payload}));
        events.filter(event => conflictedOpIds.has(event.opId) && String(event.vehicleId) === vehicleId)
            .forEach(event => candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "opId_conflict", payload: event.payload }));

        vehicleEvents.forEach(event => {
            if (event.status !== "accepted") {
                if (event.status === "review") candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "requires_review", payload: event.payload });
                return;
            }
            const payload = event.payload;
            if (event.kind === "cut") {
                if (conflictedVinEventIds.has(String(event.eventId || ""))) {
                    candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "vin_conflict", payload });
                    return;
                }
                const slot = [1, 2, 3].find(index =>
                    !String(vehicle["tipoCorte" + index] || "").trim() &&
                    !String(vehicle["ubicacionCorte" + index] || "").trim() &&
                    !String(vehicle["imgCorte" + index] || "").trim()
                );
                if (!slot) {
                    candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "cut_capacity_full", payload });
                    return;
                }
                vehicle["tipoCorte" + slot] = payload.tipo || "";
                vehicle["ubicacionCorte" + slot] = payload.ubicacion || "";
                vehicle["colorCableCorte" + slot] = payload.color || "";
                vehicle["configRelay" + slot] = payload.configRelay || "";
                vehicle["imgCorte" + slot] = payload.image ? normalizeAndValidateImageId(String(payload.image)) : null;
                vehicle["utilCorte" + slot] = 0;
                vehicle["activaTestigo" + slot] = payload.activaTestigo === true;
                vehicle["colaboradorCorte" + slot] = event.actorName || "";
                const cutSource={eventId:event.eventId,opId:event.opId,operationHash:event.operationHash};
                sources["corte"+slot]=cutSource;
                ["tipoCorte","ubicacionCorte","colorCableCorte","configRelay","imgCorte","activaTestigo","colaboradorCorte"].forEach(prefix=>{sources[prefix+slot]=cutSource;});
                const metadata = payload.vehicleData && typeof payload.vehicleData === "object" ? payload.vehicleData : {};
                ["categoria", "marca", "modelo", "versionesAplicables", "anoDesde", "anoHasta", "tipoEncendido", "imagenVehiculo"].forEach(field => {
                    if (metadata[field] === undefined || metadata[field] === null || String(metadata[field]).trim() === "" || String(vehicle[field] || "").trim()) return;
                    vehicle[field] = field === "imagenVehiculo"
                        ? normalizeAndValidateImageId(String(metadata[field])) : metadata[field];
                    sources[field] = { eventId: event.eventId, opId: event.opId, operationHash: event.operationHash };
                });
                const vinPrefix = String(payload.vinPrefix || "").trim().toUpperCase();
                if (vinPrefix) {
                    const existingVins = readVinPrefixes(vehicle.vin);
                    if (!existingVins.includes(vinPrefix)) {
                        const versionParts = String(vehicle.versionesAplicables || "").split(/[,/\\\\;]+/).map(value => value.trim()).filter(Boolean);
                        const maxAllowed = Math.max(1, Math.min(3, versionParts.length || 1));
                        if (existingVins.length >= maxAllowed) {
                            candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "vin_capacity_full", payload });
                            return;
                        }
                        existingVins.push(vinPrefix);
                        vehicle.vin = JSON.stringify(existingVins);
                        sources.vin = { eventId: event.eventId, opId: event.opId, operationHash: event.operationHash };
                    }
                }
            } else if (event.kind === "opening") {
                if (String(vehicle.apertura || "").trim() || String(vehicle.imgApertura || "").trim()) {
                    candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "opening_already_filled", payload });
                    return;
                }
                vehicle.apertura = payload.text || "";
                vehicle.imgApertura = payload.image ? normalizeAndValidateImageId(String(payload.image)) : null;
                const openingSource={eventId:event.eventId,opId:event.opId,operationHash:event.operationHash};
                sources.apertura=openingSource;sources.imgApertura=openingSource;
            } else if (event.kind === "feed") {
                const slot = [1, 2, 3].find(index => {
                    const suffix = index === 1 ? "" : String(index);
                    return !String(vehicle["cableAlimen" + suffix] || "").trim() &&
                        !String(vehicle["imgCableAlimen" + suffix] || "").trim();
                });
                if (!slot) {
                    candidates.push({ eventId: event.eventId, opId: event.opId, kind: event.kind, reason: "feed_capacity_full", payload });
                    return;
                }
                const suffix = slot === 1 ? "" : String(slot);
                vehicle["cableAlimen" + suffix] = payload.text || "";
                vehicle["imgCableAlimen" + suffix] = payload.image ? normalizeAndValidateImageId(String(payload.image)) : null;
                const feedSource={eventId:event.eventId,opId:event.opId,operationHash:event.operationHash};
                sources["feed"+slot]=feedSource;
                sources["cableAlimen"+suffix]=feedSource;
                sources["imgCableAlimen"+suffix]=feedSource;
            } else if (event.kind === "vehicle") {
                const allowed = ["categoria", "marca", "modelo", "versionesAplicables", "anoDesde", "anoHasta", "tipoEncendido", "imagenVehiculo"];
                allowed.forEach(field => {
                    if (payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === "") return;
                    if (String(vehicle[field] || "").trim()) return;
                    vehicle[field] = field === "imagenVehiculo"
                        ? normalizeAndValidateImageId(String(payload[field])) : payload[field];
                    sources[field] = { eventId: event.eventId, opId: event.opId, operationHash: event.operationHash };
                });
            } else if (event.kind === "vehicle_update") {
                const field=String(payload.fieldName||"");
                const allowed=new Set(["categoria","modelo","versionesAplicables","tipoEncendido","anoDesde","anoHasta","notaImportante","apertura",
                    "cableAlimen","cableAlimen2","cableAlimen3","imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura",
                    "imgCableAlimen","imgCableAlimen2","imgCableAlimen3","tipoCorte1","tipoCorte2","tipoCorte3",
                    "ubicacionCorte1","ubicacionCorte2","ubicacionCorte3","colorCableCorte1","colorCableCorte2","colorCableCorte3",
                    "configRelay1","configRelay2","configRelay3","vin","vin_registration"]);
                if(!allowed.has(field)||!Object.prototype.hasOwnProperty.call(payload,"expectedCurrentValue")||
                    !Object.prototype.hasOwnProperty.call(payload,"value"))
                    throw new Error("El ledger contiene una actualización de campo inválida; se canceló la proyección completa.");
                const imageField=["imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"].includes(field);
                const vinField=field==="vin";
                const compositeVinField=field==="vin_registration";
                if(compositeVinField){
                    const expected=payload.expectedCurrentValue,next=payload.value;
                    if(!expected||typeof expected!=="object"||Array.isArray(expected)||!next||typeof next!=="object"||Array.isArray(next)||
                        typeof expected.versionesAplicables!=="string"||typeof next.versionesAplicables!=="string"||
                        !Object.prototype.hasOwnProperty.call(expected,"vin")||!Object.prototype.hasOwnProperty.call(next,"vin"))
                        throw new Error("El ledger contiene un registro VIN compuesto inválido; se canceló la proyección completa.");
                    const currentVersions=String(vehicle.versionesAplicables||"").trim();
                    const expectedVersions=String(expected.versionesAplicables||"").trim();
                    const currentVin=JSON.stringify(readVinPrefixes(vehicle.vin));
                    const expectedVin=JSON.stringify(readVinPrefixes(expected.vin));
                    if(currentVersions!==expectedVersions||currentVin!==expectedVin){
                        candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"field_conflict",
                            payload:Object.assign({},payload,{currentValue:{versionesAplicables:vehicle.versionesAplicables,vin:vehicle.vin}})});return;
                    }
                    const prefixes=readVinPrefixes(next.vin);
                    const parts=String(next.versionesAplicables||"").split(/[,/\\;]+/).map(value=>value.trim()).filter(Boolean);
                    const maxAllowed=Math.max(1,Math.min(3,parts.length||1));
                    if(conflictedVinEventIds.has(String(event.eventId||""))){
                        candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"vin_conflict",payload});return;
                    }
                    if(prefixes.length>maxAllowed){
                        candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"vin_capacity_full",payload});return;
                    }
                    vehicle.versionesAplicables=next.versionesAplicables;vehicle.vin=JSON.stringify(prefixes);
                    const source={eventId:event.eventId,opId:event.opId,operationHash:event.operationHash};
                    sources.versionesAplicables=source;sources.vin=source;
                }else{
                    const currentValue=vehicle[field]===undefined||vehicle[field]===null?"":String(vehicle[field]);
                    const expectedValue=payload.expectedCurrentValue===undefined||payload.expectedCurrentValue===null?"":String(payload.expectedCurrentValue);
                    const currentSource=sources[field];
                    const expectedSourceId=String(event.supersedesEventId||"").trim();
                    const comparableCurrent=vinField?JSON.stringify(readVinPrefixes(vehicle.vin)):
                        (imageField&&currentValue?normalizeAndValidateImageId(currentValue):currentValue);
                    const comparableExpected=vinField?JSON.stringify(readVinPrefixes(payload.expectedCurrentValue)):
                        (imageField&&expectedValue?normalizeAndValidateImageId(expectedValue):expectedValue);
                    if(comparableCurrent!==comparableExpected||(expectedSourceId&&(!currentSource||String(currentSource.eventId)!==expectedSourceId))){
                        const candidatePayload=Object.assign({},payload,{currentValue:vehicle[field],currentSourceEventId:currentSource&&currentSource.eventId||""});
                        candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"field_conflict",payload:candidatePayload});return;
                    }
                    if(vinField){
                        const prefixes=readVinPrefixes(payload.value);
                        const versionParts=String(vehicle.versionesAplicables||"").split(/[,/\\;]+/).map(value=>value.trim()).filter(Boolean);
                        const maxAllowed=Math.max(1,Math.min(3,versionParts.length||1));
                        if(conflictedVinEventIds.has(String(event.eventId||""))){
                            const candidatePayload=Object.assign({},payload,{currentValue:vehicle.vin,currentSourceEventId:currentSource&&currentSource.eventId||""});
                            candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"vin_conflict",payload:candidatePayload});return;
                        }
                        if(prefixes.length>maxAllowed){
                            const candidatePayload=Object.assign({},payload,{currentValue:vehicle.vin,currentSourceEventId:currentSource&&currentSource.eventId||""});
                            candidates.push({eventId:event.eventId,opId:event.opId,kind:event.kind,reason:"vin_capacity_full",payload:candidatePayload});return;
                        }
                        vehicle.vin=JSON.stringify(prefixes);
                    }else{
                        const nextValue=imageField?(payload.value?normalizeAndValidateImageId(String(payload.value)):null):
                            (field==="anoDesde"||field==="anoHasta"?Number(payload.value):payload.value);
                        vehicle[field]=nextValue;
                    }
                    sources[field]={eventId:event.eventId,opId:event.opId,operationHash:event.operationHash};
                }

                const resolvedCandidate=String(payload.resolvesCandidateEventId||"").trim();
                if(resolvedCandidate)resolvedFieldCandidateIds.add(resolvedCandidate);
            }
        });
        vehicle.contributionCandidates = candidates.filter(candidate=>!resolvedFieldCandidateIds.has(String(candidate.eventId||"")));
        vehicle.contributionSources = sources;
        vehicle.contributionConflictCount = candidates.filter(item => item.reason === "opId_conflict").length;
        return vehicle;
    });
}

function readFeedbackLikeEventCounts_(spreadsheetRef) {
    const spreadsheet = spreadsheetRef || getSpreadsheet();
    const sheet = spreadsheet.getSheetByName("FeedbackLikes");
    const counts = new Map();
    if (!sheet || sheet.getLastRow() < 2) return counts;
    const expected = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
    const headers = sheet.getRange(1, 1, 1, 7).getValues()[0].map(value => String(value || "").trim());
    if (expected.some((header, index) => headers[index] !== header)) throw new Error("El esquema de FeedbackLikes no coincide con el contrato de eventos.");
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    rows.forEach(row => {
        if (String(row[5] || "") !== "event") return;
        const actorKey = String(row[0] || "").trim(), vehicleId = String(row[1] || "").trim(), corteIndex = Number(row[2]);
        if (!/^user:[A-Za-z0-9._@-]{1,200}$/.test(actorKey) || !/^[1-9]\d{0,14}$/.test(vehicleId) ||
            !Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) throw new Error("FeedbackLikes contiene un evento de like inválido.");
        const key = vehicleId + "|" + corteIndex;
        if (!counts.has(key)) counts.set(key, new Set());
        counts.get(key).add(actorKey);
    });
    const result = new Map();
    counts.forEach((actors, key) => result.set(key, actors.size));
    return result;
}

function tutorialEditFieldsHash_(values) {
    const payload = JSON.stringify((values || []).map(value => String(value || "")));
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
    return digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
}

function projectTutorialCatalogRows_(records, editEventRows) {
    const canonicalRows = [], byId = new Map(), eventsByTutorial = new Map(), operations = new Map();
    (editEventRows || []).forEach((event, index) => {
        const operationId = String(event[0] || "").trim(), payloadHash = String(event[1] || "").trim().toLowerCase();
        const tutorialId = String(event[2] || "").trim(), expectedHash = String(event[3] || "").trim().toLowerCase();
        let snapshot = null;
        try { snapshot = JSON.parse(String(event[4] || "")); } catch (error) {}
        if (!/^tutorial-edit-[a-f0-9]{64}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(payloadHash) ||
            !/^(?:tut-[A-Za-z0-9_-]{20,80}|legacy-[a-f0-9]{64})$/i.test(tutorialId) || !/^[a-f0-9]{64}$/.test(expectedHash) ||
            !Array.isArray(snapshot) || snapshot.length !== 3 || snapshot.some(value => typeof value !== "string")) {
            throw new Error("TutorialEditEvents contiene una fila incompatible; no se pudo proyectar el catálogo.");
        }
        if (operations.has(operationId)) {
            if (operations.get(operationId) !== payloadHash && typeof console !== "undefined" && console.warn) console.warn("TutorialEditEvents: operationId contradictorio ignorado", operationId);
            return;
        }
        operations.set(operationId, payloadHash);
        if (!eventsByTutorial.has(tutorialId)) eventsByTutorial.set(tutorialId, []);
        eventsByTutorial.get(tutorialId).push({ rowNumber: index + 2, operationId, expectedHash, snapshot });
    });
    (records || []).forEach(sourceRow => {
        if (!sourceRow || !sourceRow.some(value => value !== "" && value !== null && value !== undefined)) return;
        const row = sourceRow.slice(), id = String(row[0] || "").trim();
        const identity = id || tutorialLegacyIdentity_(row[1]);
        if (id && byId.has(id)) return;
        if (id) byId.set(id, row);
        const events = eventsByTutorial.get(identity) || [];
        let current = [row[3], row[4], row[5]].map(value => String(value || ""));
        events.forEach(event => {
            if (event.expectedHash === tutorialEditFieldsHash_(current)) current = event.snapshot.slice();
            else if (!event.snapshot.every((value, index) => value === current[index])) {
                // El expectedHash ya no coincide: el evento quedó obsoleto y no pisa la versión vigente.
            }
        });
        row[3] = current[0]; row[4] = current[1]; row[5] = current[2];
        canonicalRows.push(row);
    });
    return canonicalRows;
}

function projectTutorialCatalogTitles_(records, renameEventRows) {
    const events = new Map(), operations = new Map();
    (renameEventRows || []).forEach(event => {
        const operationId = String(event[0] || "").trim(), payloadHash = String(event[1] || "").trim().toLowerCase();
        const tutorialId = String(event[2] || "").trim(), expectedTitleKey = String(event[3] || "").trim();
        const title = String(event[4] || "").trim();
        if (!/^tutorial-rename-[a-f0-9]{64}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(payloadHash) ||
            !/^(?:tut-[A-Za-z0-9_-]{1,80}|legacy-[a-f0-9]{64})$/i.test(tutorialId) ||
            !expectedTitleKey || !title || title.length > 30 ||
            tutorialRenamePayloadHash_(tutorialId, expectedTitleKey, title) !== payloadHash ||
            operationId !== "tutorial-rename-" + payloadHash) {
            throw new Error("TutorialRenameEvents contiene una fila incompatible o un hash alterado; no se pudo proyectar el catálogo.");
        }
        if (operations.has(operationId) && operations.get(operationId) !== payloadHash) {
            throw new Error("TutorialRenameEvents contiene un operationId contradictorio; requiere revisión.");
        }
        if (operations.has(operationId)) return;
        operations.set(operationId, payloadHash);
        if (!events.has(tutorialId)) events.set(tutorialId, []);
        events.get(tutorialId).push({ expectedTitleKey, title });
    });
    return (records || []).map(sourceRow => {
        const row = sourceRow.slice(), id = String(row[0] || "").trim();
        const identity = id || tutorialLegacyIdentity_(row[1]);
        let currentTitle = String(row[1] || "");
        (events.get(identity) || []).forEach(event => {
            if (event.expectedTitleKey === normalizeTutorialCatalogTitle_(currentTitle)) currentTitle = event.title;
        });
        row[1] = currentTitle;
        return row;
    });
}
function tutorialRenamePayloadHash_(tutorialId, expectedTitleKey, title) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([tutorialId, expectedTitleKey, title]));
    return digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
}
function normalizeTutorialCatalogTitle_(value) {
    const normalized = Array.from(String(value || "").normalize("NFD"))
        .filter(character => { const code = character.charCodeAt(0); return code < 768 || code > 879; }).join("");
    return normalized.trim().replace(/\s+/g, " ").toLowerCase();
}
function tutorialLegacyIdentity_(title) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizeTutorialCatalogTitle_(title));
    const hash = digest.map(byte => ((byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))).join("");
    return "legacy-" + hash;
}


function dedupeTutorialCatalogRows_(records) {
    const byId = new Map(), output = [];
    (records || []).forEach(record => {
        if (!record) return;
        const id = String(record.ID || "").trim();
        if (!id) { output.push(record); return; }
        if (!byId.has(id)) { byId.set(id, record); output.push(record); return; }
        // La primera fila física es la versión canónica; reintentos posteriores quedan proyectados fuera del catálogo.
        const canonical = byId.get(id);
        if (JSON.stringify(canonical) !== JSON.stringify(record)) {
            if (typeof console !== "undefined" && console.warn) console.warn("Tutorial duplicado ignorado por first-write-wins:", id);
        }
    });
    return output;
}


function mapCatalogVehicleRowForProjection_(row, columnMap, feedbackLikeEventCounts, categoryCounts) {
    const vehicle = mapRowToObject(row, columnMap, IMAGE_FIELDS_CORTES);
    if (!vehicle) return null;
    for (let index = 1; index <= 3; index++) {
        const eventCount = feedbackLikeEventCounts.get(String(vehicle.id || "").trim() + "|" + index) || 0;
        if (eventCount) vehicle["utilCorte" + index] = (parseInt(vehicle["utilCorte" + index], 10) || 0) + eventCount;
    }
    if (vehicle.categoria) categoryCounts[vehicle.categoria] = (categoryCounts[vehicle.categoria] || 0) + 1;
    if (vehicle.videoGuiaDesarmeUrl) {
        vehicle.Video = normalizeYouTubeUrl(vehicle.videoGuiaDesarmeUrl);
        delete vehicle.videoGuiaDesarmeUrl;
    }
    const cortes = [
        { index: 1, util: parseInt(vehicle.utilCorte1, 10) || 0 },
        { index: 2, util: parseInt(vehicle.utilCorte2, 10) || 0 },
        { index: 3, util: parseInt(vehicle.utilCorte3, 10) || 0 }
    ].sort((a, b) => b.util - a.util);
    const orderedVehicle = { ...vehicle };
    const tempCortes = {};
    for (let i = 1; i <= 3; i++) {
        tempCortes[i] = {
            tipo: vehicle["tipoCorte" + i], ubicacion: vehicle["ubicacionCorte" + i],
            color: vehicle["colorCableCorte" + i], config: vehicle["configRelay" + i],
            img: vehicle["imgCorte" + i], util: vehicle["utilCorte" + i],
            activaTestigo: vehicle["activaTestigo" + i], colaborador: vehicle["colaboradorCorte" + i]
        };
    }
    cortes.forEach((corte, i) => {
        const newIndex = i + 1, oldIndex = corte.index;
        orderedVehicle["tipoCorte" + newIndex] = tempCortes[oldIndex].tipo;
        orderedVehicle["ubicacionCorte" + newIndex] = tempCortes[oldIndex].ubicacion;
        orderedVehicle["colorCableCorte" + newIndex] = tempCortes[oldIndex].color;
        orderedVehicle["configRelay" + newIndex] = tempCortes[oldIndex].config;
        orderedVehicle["imgCorte" + newIndex] = tempCortes[oldIndex].img;
        orderedVehicle["utilCorte" + newIndex] = tempCortes[oldIndex].util;
        orderedVehicle["activaTestigo" + newIndex] = tempCortes[oldIndex].activaTestigo;
        orderedVehicle["colaboradorCorte" + newIndex] = tempCortes[oldIndex].colaborador;
    });
    return orderedVehicle;
}

function readCatalogContributionProjectionVehicles_(spreadsheetRef, includeSourceEvents = false) {
    const spreadsheet = spreadsheetRef || getSpreadsheet();
    const cortesSheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    const categoryCounts = {};
    const feedbackLikeEventCounts = readFeedbackLikeEventCounts_(spreadsheet);
    let vehicles = [];
    if (cortesSheet) {
        const columnMap = getCortesColumnMap(cortesSheet);
        const data = cortesSheet.getDataRange().getValues();
        data.shift();
        vehicles = data.filter(row => row && row[0])
            .map(row => mapCatalogVehicleRowForProjection_(row, columnMap, feedbackLikeEventCounts, categoryCounts))
            .filter(Boolean);
    }
    const sourceEvents = readVehicleContributionEvents_(spreadsheet);
    const projectedVehicles = projectVehicleContributionEvents_(vehicles, sourceEvents);
    return includeSourceEvents === true
        ? { vehicles: projectedVehicles, sourceEvents }
        : projectedVehicles;
}

function handleGetCatalogData(payload = {}) {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'catalog_data_v2';
    const forceRefresh = Boolean(payload && payload.forceRefresh === true);
    let cachedData = null;

    // La sincronización posterior a una escritura confirmada omite cualquier caché heredada.
    if (!forceRefresh) {
        try {
            cachedData = cache.get(cacheKey);
        } catch (e) {
            cachedData = null;
        }
    }

    if (cachedData) {
        try {
            // 2. Intento de parseo de datos cacheados con manejo de errores
            const parsedData = JSON.parse(cachedData);
            return { status: 'success', data: parsedData, source: 'cache' };
        } catch (e) {
            // Si el parseo falla, los datos están corruptos, así que se procede a leer de la fuente.
        }
    }

    // Si no hay datos en caché (o están corruptos), procedemos a leer de la hoja de cálculo.
    const allData = {};

    // Fetch Cortes
    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    let cortesData = [];
    const categoryCounts = {};
    const feedbackLikeEventCounts = readFeedbackLikeEventCounts_(getSpreadsheet());

    if (cortesSheet) {
        const cortesColumnMap = getCortesColumnMap(cortesSheet);
        const data = cortesSheet.getDataRange().getValues();
        data.shift();
        cortesData = data
          .filter(row => row && row[0])
          .map(row => mapCatalogVehicleRowForProjection_(row, cortesColumnMap, feedbackLikeEventCounts, categoryCounts))
          .filter(Boolean);
    }
    // Los aportes append-only se proyectan sobre el contrato heredado de la ficha.
    // La hoja ausente es compatible durante la migración gradual; un esquema presente pero inválido falla de forma segura.
    cortesData = projectVehicleContributionEvents_(cortesData, readVehicleContributionEvents_(getSpreadsheet()));
    allData.cortes = cortesData;
    allData.categoryCounts = categoryCounts;

    // Crear y añadir la lista de categorías ordenada por popularidad
    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    allData.sortedCategories = sortedCategories;

    // Fetch Logos
    const logosSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.LOGOS_MARCA);
    let logosData = [];
    if (logosSheet) {
        const data = logosSheet.getDataRange().getValues();
        data.shift();
        logosData = data.map(row => mapRowToObject(row, COLS_LOGOS_MARCA, IMAGE_FIELDS_LOGOS));
    }
    allData.logos = logosData;

    // Fetch Tutoriales
    const tutorialesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.TUTORIALES);
    let tutorialesData = [];
    if (tutorialesSheet) {
        const data = tutorialesSheet.getDataRange().getValues();
        const editEventsSheet = getSpreadsheet().getSheetByName("TutorialEditEvents");
        const renameEventsSheet = getSpreadsheet().getSheetByName("TutorialRenameEvents");
        let editEventRows = [], renameEventRows = [];
        if (editEventsSheet) {
            const editData = editEventsSheet.getDataRange().getValues();
            const expectedHeaders = ["operationId", "payloadHash", "tutorialId", "expectedHash", "snapshotJson", "createdAt"];
            if (!editData.length || expectedHeaders.some((header, index) => String(editData[0][index] || "").trim() !== header)) {
                throw new Error("El esquema de TutorialEditEvents no coincide; no se pudo proyectar el catálogo.");
            }
            editEventRows = editData.slice(1);
        }
        if (renameEventsSheet) {
            const renameData = renameEventsSheet.getDataRange().getValues();
            const expectedRenameHeaders = ["operationId", "payloadHash", "tutorialId", "expectedTitleKey", "title", "createdAt"];
            if (!renameData.length || expectedRenameHeaders.some((header, index) => String(renameData[0][index] || "").trim() !== header)) {
                throw new Error("El esquema de TutorialRenameEvents no coincide; no se pudo proyectar el catálogo.");
            }
            renameEventRows = renameData.slice(1);
        }
        const projectedEditRows = projectTutorialCatalogRows_(data.slice(1), editEventRows);
        const projectedTitleRows = projectTutorialCatalogTitles_(projectedEditRows, renameEventRows);
        tutorialesData = dedupeTutorialCatalogRows_(projectedTitleRows
            .map(row => mapRowToObject(row, COLS_TUTORIALES, IMAGE_FIELDS_TUTORIALES)).filter(Boolean));
    }
    allData.tutoriales = tutorialesData;

    // Fetch Relay
    const relaySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.RELAY);
    let relayData = [];
    if (relaySheet) {
        const data = relaySheet.getDataRange().getValues();
        data.shift();
        relayData = data.map(row => mapRowToObject(row, COLS_RELAY, IMAGE_FIELDS_RELAY)).filter(Boolean);
    }
    allData.relay = relayData;

    // --- ESCRITURA EN CACHÉ DESHABILITADA ---
    // La siguiente línea se deshabilita para prevenir el error "Argumento demasiado grande".
    // El objeto `allData` excede el límite de 100 KB de CacheService.
    // Una futura estrategia de caché deberá ser más granular (ej. cachear solo metadatos).
    // try {
    //     cache.put(cacheKey, JSON.stringify(allData), 3600);
    // } catch (e) {
    // }

    return { status: 'success', data: allData, source: 'spreadsheet' };
}

function handleGetDropdownData() {
    try {
        const spreadsheet = getSpreadsheet();
        const cortesSheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
        const relaySheet = spreadsheet.getSheetByName(SHEET_NAMES.RELAY);
        if (!cortesSheet) throw new Error(`Sheet "${SHEET_NAMES.CORTES}" not found.`);
        if (!relaySheet) throw new Error(`Sheet "${SHEET_NAMES.RELAY}" not found.`);
        const categoryRule = cortesSheet.getRange(2, COLS_CORTES.categoria).getDataValidation();
        let categorias = [];
        if (categoryRule) {
            const criteriaValues = categoryRule.getCriteriaValues()[0];
            if (criteriaValues && typeof criteriaValues.getValues === "function") categorias = criteriaValues.getValues().flat().map(v=>String(v==null?"":v).trim()).filter(Boolean);
            else if (Array.isArray(criteriaValues)) categorias = criteriaValues.flat().map(v=>String(v==null?"":v).trim()).filter(Boolean);
        }
        const uniqueSorted = values => Array.from(new Set(values
            .map(value => String(value == null ? "" : value).trim())
            .filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        const cortesColumns = [COLS_CORTES.marca, COLS_CORTES.tipoCorte1, COLS_CORTES.tipoCorte2,
            COLS_CORTES.tipoCorte3, COLS_CORTES.tipoEncendido];
        const firstCortesColumn = Math.min(...cortesColumns), lastCortesColumn = Math.max(...cortesColumns);
        const cortesLastRow = Number(cortesSheet.getLastRow()) || 0;
        const cortesRows = cortesLastRow >= 2
            ? cortesSheet.getRange(2, firstCortesColumn, cortesLastRow - 1, lastCortesColumn - firstCortesColumn + 1).getValues()
            : [];
        const valuesForCortesColumn = column => cortesRows.map(row => row[column - firstCortesColumn]);
        const marcas = valuesForCortesColumn(COLS_CORTES.marca);
        const tiposCorte = [
            ...valuesForCortesColumn(COLS_CORTES.tipoCorte1),
            ...valuesForCortesColumn(COLS_CORTES.tipoCorte2),
            ...valuesForCortesColumn(COLS_CORTES.tipoCorte3)
        ];
        const tiposEncendido = valuesForCortesColumn(COLS_CORTES.tipoEncendido);
        const relayLastRow = Number(relaySheet.getLastRow()) || 0;
        const configuracionesRelay = relayLastRow >= 2
            ? relaySheet.getRange(2, COLS_RELAY.configuracion, relayLastRow - 1, 1).getValues().map(row => row[0])
            : [];
        return {status:"success",dropdowns:{
            categoria:categorias,
            marca:uniqueSorted(marcas),
            tipoDeCorte:uniqueSorted(tiposCorte),
            tipoDeEncendido:uniqueSorted(tiposEncendido),
            configRelay:uniqueSorted(configuracionesRelay)
        }};
    } catch (error) {
        return {status:"error",message:"Failed to get dropdown data.",details:{errorMessage:error&&error.message?error.message:String(error)}};
    }
}

/**
 * Obtiene los datos mínimos necesarios para la navegación y la carga inicial.
 * Devuelve los conteos de categorías, las categorías ordenadas, la lista de marcas y los logos.
 * Esta acción es LIGERA y está diseñada para ser la primera llamada que hace el frontend.
 */

/**
 * Respuestas dirigidas para consumidores internos. Se conserva la proyección
 * completa como fuente de verdad, pero se evita transferir el snapshot entero
 * cuando ADMIN necesita un solo vehículo o solo candidatos.
 */

function readCatalogVehicleProjection_(vehicleId, spreadsheetRef) {
    const requestedId = String(vehicleId || "").trim();
    if (!/^[1-9]\d{0,14}$/.test(requestedId)) {
        throw new Error("Se requiere un ID de vehículo válido para consultar la proyección dirigida.");
    }
    const spreadsheet = spreadsheetRef || getSpreadsheet();
    const cortesSheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    const lastRow = cortesSheet ? Number(cortesSheet.getLastRow()) || 0 : 0;
    const lastColumn = cortesSheet ? Number(cortesSheet.getLastColumn()) || 0 : 0;
    if (!cortesSheet || lastRow < 2 || lastColumn < 1) {
        throw new Error("El vehículo solicitado no existe en la proyección vigente de CATALOG.");
    }
    const columnMap = getCortesColumnMap(cortesSheet);
    const idColumn = Number(columnMap.id) || COLS_CORTES.id;
    const vinColumn = Number(columnMap.vin) || 0;
    const rowCount = lastRow - 1;
    const ids = cortesSheet.getRange(2, idColumn, rowCount, 1).getValues();
    const matches = [];
    ids.forEach((row, index) => {
        if (String(row && row[0] || "").trim() === requestedId) matches.push(index);
    });
    if (matches.length > 1) {
        throw new Error("El ID del vehículo aparece duplicado en CATALOG; no se devolvió una proyección ambigua.");
    }
    if (matches.length !== 1) {
        throw new Error("El vehículo solicitado no existe en la proyección vigente de CATALOG.");
    }
    const targetIndex = matches[0];
    const targetRow = targetIndex + 2;
    const vinRows = vinColumn > 0 && vinColumn <= lastColumn
        ? cortesSheet.getRange(2, vinColumn, rowCount, 1).getValues()
        : [];
    const fullRow = cortesSheet.getRange(targetRow, 1, 1, lastColumn).getValues()[0];
    const feedbackLikeEventCounts = readFeedbackLikeEventCounts_(spreadsheet);
    const targetVehicle = mapCatalogVehicleRowForProjection_(fullRow, columnMap, feedbackLikeEventCounts, {});
    if (!targetVehicle) throw new Error("No se pudo leer la fila vigente del vehículo solicitado.");
    const vehicles = ids.map((row, index) => {
        const id = String(row && row[0] || "").trim();
        if (!id) return null;
        if (index === targetIndex) return targetVehicle;
        return { id, vin: vinRows[index] ? vinRows[index][0] : null };
    }).filter(Boolean);
    const projected = projectVehicleContributionEvents_(vehicles, readVehicleContributionEvents_(spreadsheet));
    const targetMatches = projected.filter(vehicle => vehicle && String(vehicle.id || "").trim() === requestedId);
    if (targetMatches.length !== 1) {
        throw new Error(targetMatches.length
            ? "El ID del vehículo aparece duplicado en CATALOG; no se devolvió una proyección ambigua."
            : "El vehículo solicitado no existe en la proyección vigente de CATALOG.");
    }
    return targetMatches[0];
}

function handleGetVehicleProjection_(payload = {}) {
    const vehicleId = String(payload && payload.vehicleId || "").trim();
    if (!/^[1-9]\d{0,14}$/.test(vehicleId)) {
        throw new Error("Se requiere un ID de vehículo válido para consultar la proyección dirigida.");
    }
    const vehicle = readCatalogVehicleProjection_(vehicleId);
    if (!vehicle || String(vehicle.id || "").trim() !== vehicleId) {
        throw new Error("El vehículo solicitado no existe en la proyección vigente de CATALOG.");
    }
    const matches = [vehicle];
    if (matches.length !== 1) {
        throw new Error(matches.length
            ? "El ID del vehículo aparece duplicado en CATALOG; no se devolvió una proyección ambigua."
            : "El vehículo solicitado no existe en la proyección vigente de CATALOG.");
    }
    return { status: "success", vehicle: matches[0], source: "spreadsheet", readOnly: true };
}

function handleGetContributionCandidates_(payload = {}) {
    const requestedLimit = Number(payload && payload.limit);
    const limit = Number.isSafeInteger(requestedLimit) ? Math.max(1, Math.min(500, requestedLimit)) : 200;
    const requestedImageInventoryEvents = payload && payload.includeImageInventoryEvents === true;
    let includeImageInventoryEvents = false;
    if (requestedImageInventoryEvents) {
        const properties = PropertiesService.getScriptProperties();
        const expectedSecret = String(properties.getProperty(CATALOG_TRAFFIC_SECRET_PROPERTY_) || "");
        if (!catalogTrafficSecretEquals_(expectedSecret, payload.secret)) {
            throw new Error("Acceso denegado a los metadatos internos del inventario de imágenes.");
        }
        includeImageInventoryEvents = true;
    }
    const projection = readCatalogContributionProjectionVehicles_(undefined, includeImageInventoryEvents);
    const projectedVehicles = includeImageInventoryEvents ? projection && projection.vehicles : projection;
    const sourceEvents = includeImageInventoryEvents && projection ? projection.sourceEvents : null;
    if (!Array.isArray(projectedVehicles) || (includeImageInventoryEvents && !Array.isArray(sourceEvents))) {
        throw new Error("CATALOG no pudo construir la proyección vigente de candidatos.");
    }
    const candidates = [];
    const imageInventoryCandidates = [];
    projectedVehicles.forEach(vehicle => {
        if (!vehicle || !Array.isArray(vehicle.contributionCandidates)) return;
        vehicle.contributionCandidates.forEach(candidate => {
            if (!candidate || !String(candidate.eventId || "").trim()) return;
            const normalized = {
                eventId: String(candidate.eventId),
                opId: String(candidate.opId || ""),
                vehicleId: String(vehicle.id || ""),
                vehicleLabel: [vehicle.marca, vehicle.modelo].filter(Boolean).join(" ").trim(),
                kind: String(candidate.kind || ""),
                reason: String(candidate.reason || "requires_review"),
                payload: candidate.payload && typeof candidate.payload === "object"
                    ? JSON.parse(JSON.stringify(candidate.payload)) : {},
                status: "pending_review"
            };
            candidates.push(normalized);
            if (includeImageInventoryEvents && ["cut", "opening", "feed"].includes(normalized.kind) &&
                String(normalized.payload.image || "").trim()) {
                imageInventoryCandidates.push({
                    eventId: normalized.eventId, vehicleId: normalized.vehicleId,
                    vehicleLabel: normalized.vehicleLabel
                });
            }
        });
    });
    candidates.sort((a, b) =>
        a.vehicleId.localeCompare(b.vehicleId, undefined, { numeric: true }) ||
        a.eventId.localeCompare(b.eventId)
    );
    const response = {
        status: "success",
        candidates: candidates.slice(0, limit),
        total: candidates.length,
        limit,
        truncated: candidates.length > limit,
        source: "CATALOG",
        readOnly: true
    };
    if (includeImageInventoryEvents) {
        const imageSourceEvents = sourceEvents.filter(event =>
            event && !String(event.supersedesEventId || "").trim() &&
            ["cut", "opening", "feed"].includes(String(event.kind || "")) &&
            event.payload && String(event.payload.image || "").trim()
        );
        const imageSourceIds = new Set(imageSourceEvents.map(event => String(event.eventId || "")));
        const imageResolutionEvents = sourceEvents.filter(event =>
            event && imageSourceIds.has(String(event.supersedesEventId || "")) &&
            ["cut", "opening", "feed"].includes(String(event.kind || "")) &&
            ["accepted", "retracted"].includes(String(event.status || "").toLowerCase())
        );
        response.imageInventoryCandidates = imageInventoryCandidates;
        response.imageInventoryEvents = imageSourceEvents.concat(imageResolutionEvents).map(event => ({
            eventId: String(event.eventId || ""), opId: String(event.opId || ""),
            vehicleId: String(event.vehicleId || ""), operationHash: String(event.operationHash || ""),
            kind: String(event.kind || ""), payload: event.payload && typeof event.payload === "object"
                ? JSON.parse(JSON.stringify(event.payload)) : {},
            createdAt: String(event.createdAt || ""), status: String(event.status || ""),
            supersedesEventId: String(event.supersedesEventId || "")
        }));
    }
    return response;
}

function handleGetNavigationData() {
    const responseData = {};
    const spreadsheet = getSpreadsheet();
    const cortesSheet = spreadsheet.getSheetByName(SHEET_NAMES.CORTES);
    const logosSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOGOS_MARCA);

    // La navegación solo necesita ID, categoría y marca; no leer todas las columnas de Cortes.
    const categoryCounts = {};
    const marcas = new Set();
    const cortesLastRow = cortesSheet ? Number(cortesSheet.getLastRow()) || 0 : 0;
    if (cortesLastRow >= 2) {
        const firstColumn = COLS_CORTES.id;
        const lastColumn = Math.max(COLS_CORTES.categoria, COLS_CORTES.marca);
        const rows = cortesSheet.getRange(2, firstColumn, cortesLastRow - 1, lastColumn - firstColumn + 1).getValues();
        rows.forEach(row => {
            if (!row || !row[0]) return;
            const categoria = row[COLS_CORTES.categoria - firstColumn];
            const marca = row[COLS_CORTES.marca - firstColumn];
            if (categoria) categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;
            if (marca) marcas.add(marca);
        });
    }
    responseData.categoryCounts = categoryCounts;
    responseData.marcas = Array.from(marcas).sort();

    // 2. Crear y añadir la lista de categorías ordenada por popularidad.
    responseData.sortedCategories = Object.keys(categoryCounts)
        .sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    // Los logos solo requieren las tres columnas declaradas en COLS_LOGOS_MARCA.
    let logosData = [];
    const logosLastRow = logosSheet ? Number(logosSheet.getLastRow()) || 0 : 0;
    if (logosLastRow >= 2) {
        const firstColumn = COLS_LOGOS_MARCA.id;
        const lastColumn = Math.max(COLS_LOGOS_MARCA.id, COLS_LOGOS_MARCA.nombreMarca, COLS_LOGOS_MARCA.urlLogo);
        const rows = logosSheet.getRange(2, firstColumn, logosLastRow - 1, lastColumn - firstColumn + 1).getValues();
        logosData = rows.map(row => mapRowToObject(row, COLS_LOGOS_MARCA, IMAGE_FIELDS_LOGOS));
    }
    responseData.logos = logosData;

    return { status: 'success', data: responseData, source: 'spreadsheet' };
}


// ============================================================================
// MANEJADOR DE SUGERENCIAS (PARA "QUIZÁS QUISISTE DECIR...")
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
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Normaliza y valida un valor que se espera sea un ID de imagen de Google Drive.
 * Esta función es el GOBERNADOR del contrato de imágenes.
 * - Puede manejar un fileId limpio o una URL completa de Drive, extrayendo el ID.
 * - Devuelve null si el valor es inválido, está vacío o no es un string.
 * - Si LOG_INVALID_IDS es true, registra los valores inválidos en la consola de Apps Script.
 * - Agrega los valores inválidos a la lista `invalidImageIdsFound` para el modo diagnóstico.
 * @param {string} value - El valor original de la celda de la hoja de cálculo.
 * @returns {string|null} - El fileId limpio y validado, o null si es inválido.
 */
function normalizeAndValidateImageId(value) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    const originalValue = value;
    const trimmedValue = value.trim();

    // Expresión regular para extraer el ID de varias URLs de Google Drive.
    const idMatch = trimmedValue.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);

    if (idMatch) {
        const fileId = idMatch[1] || idMatch[2] || idMatch[3];
        if (fileId && fileId.length > 20) {
            return fileId; // ID extraído de URL es válido.
        }
    } else if (trimmedValue.length > 20 && !trimmedValue.includes('/') && !trimmedValue.includes(':')) {
        // Si no es una URL pero parece un ID, se asume que es un fileId limpio.
        return trimmedValue;
    }

    // Si no se pudo normalizar o validar, se considera inválido.
    invalidImageIdsFound.push(originalValue);

    return null;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,          // deletion
                matrix[j - 1][i] + 1,          // insertion
                matrix[j - 1][i - 1] + cost    // substitution
            );
        }
    }

    return matrix[b.length][a.length];
}


/**
 * Normaliza cualquier formato de URL de YouTube a un formato de embed estable.
 * Soporta URLs cortas, de búsqueda, de canal y IDs directos.
 */
function normalizeYouTubeUrl(url) {
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

