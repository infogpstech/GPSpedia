// ============================================================================
// GPSPEDIA-FEEDBACK SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs"; // <-- ACTUALIZADO A DB V2.0
const DRIVE_FOLDER_ID = "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2";
const ROLE_REVOCATION_SHARED_PREFIX = "__role_revocation_pending__:";
let spreadsheet = null;

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

/**
 * Obtiene una hoja por su nombre, con manejo de fallos para singular/plural.
 */
function getSafeSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const altName = name.endsWith('s') ? name.slice(0, -1) : name + 's';
    sheet = ss.getSheetByName(altName);
  }
  return sheet;
}


/**
 * Verifica la sesión contra ActiveSessions y obtiene el privilegio desde Users.
 * No utiliza el rol, nombre ni ID de actor enviados como datos de autorización por el navegador.
 */
function normalizeFeedbackRole(role) {
    const normalized = Array.from(String(role || "").normalize("NFD"))
        .filter(character => { const code = character.charCodeAt(0); return code < 768 || code > 879; }).join("");
    return normalized.trim().toLowerCase();
}

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
function assertFeedbackSession(payload,allowedRoles){
 const id=String(payload&&payload.userId||"").trim(),token=String(payload&&payload.sessionToken||"");if(!id||!token.trim())throw new Error("Acceso denegado: sesión no autorizada.");
 const ss=getSpreadsheet(),sh=ss.getSheetByName("ActiveSessions"),uh=ss.getSheetByName("Users");if(!sh||!uh)throw new Error("Acceso denegado: sesión no autorizada.");
 const tokenMatches=sh.getDataRange().getValues().slice(1).filter(r=>r[2]===token);
 if(tokenMatches.length!==1||String(tokenMatches[0][0]||"").trim()!==id||getSessionExpirationStatus_(tokenMatches[0],new Date()).expired)throw new Error("Acceso denegado: sesión inválida, duplicada, cruzada o expirada.");
 const userMatches=uh.getDataRange().getValues().slice(1).filter(r=>String(r[0]||"").trim()===id);if(userMatches.length!==1)throw new Error("Acceso denegado: perfil de usuario ausente o ambiguo.");
 const u=userMatches[0];if(String(u[7]||'').startsWith(ROLE_REVOCATION_SHARED_PREFIX))throw new Error("Acceso no autorizado: existe una revocación de rol pendiente. Inicia sesión nuevamente cuando finalice.");
 const role=String(u[3]||"").trim(),username=String(u[1]||"").trim(),normalized=normalizeFeedbackRole(role),active=['desarrollador','gefe','jefe','supervisor','tecnico','tecnico_exterior'];
 if(!username||username.toLowerCase().startsWith('__deleted__:')||!active.includes(normalized))throw new Error("Acceso denegado: sesión no autorizada.");
 if(Array.isArray(allowedRoles)&&!allowedRoles.some(x=>normalizeFeedbackRole(x)===normalized))throw new Error("Acceso denegado: sesión no autorizada.");
 return{userId:id,role,userName:String(u[6]||u[1]||"Usuario")};
}

/** Identidad de aportantes de validación de año; el identificador anónimo es seudónimo, no identidad civil. */
function createAnonymousSuggestionActorKey() {
    // El identificador del navegador no acredita una persona.
    return "anon:unverified";
}

function resolveSuggestionYearActor(payload) {
    const requestedUserId = String(payload && payload.userId !== undefined ? payload.userId : "").trim();
    if (requestedUserId === "0") {
        return { userId: "0", userName: "Anónimo", userRole: "Anónimo", suggestionActorKey: createAnonymousSuggestionActorKey() };
    }
    const actor = assertFeedbackSession(payload, null);
    return { userId: actor.userId, userName: actor.userName, userRole: actor.role, suggestionActorKey: "user:" + actor.userId };
}

function ensureSuggestionActorColumn(sheet) {
    const expectedHeaders = [
        "ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta",
        "Se resolvio", "Responde", "Reporte de util", "anoSugerido"
    ];
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < expectedHeaders.length) {
        sheet.insertColumnsAfter(maxColumns, expectedHeaders.length - maxColumns);
    }
    const baseHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    expectedHeaders.forEach((expected, index) => {
        if (String(baseHeaders[index] || "").trim() !== expected) {
            throw new Error("El esquema de Feedbacks no coincide con el esperado; no se modificó la hoja.");
        }
    });
    const headerWidth = Math.max(sheet.getLastColumn(), expectedHeaders.length);
    const headers = sheet.getRange(1, 1, 1, headerWidth).getValues()[0];
    const actorPositions = [];
    headers.forEach((header, index) => {
        if (String(header || "").trim() === "suggestionActorKey") actorPositions.push(index + 1);
    });
    if (actorPositions.length > 1 || (actorPositions.length === 1 && actorPositions[0] <= expectedHeaders.length)) {
        throw new Error("La columna suggestionActorKey existe en una posición duplicada o incompatible.");
    }
    if (actorPositions.length === 1) return actorPositions[0];

    const newColumn = headerWidth + 1;
    if (sheet.getMaxColumns() < newColumn) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), newColumn - sheet.getMaxColumns());
    }
    const occupiedHeader = sheet.getRange(1, newColumn).getValue();
    if (occupiedHeader !== "" && occupiedHeader !== null) {
        throw new Error("No se puede añadir suggestionActorKey sin sobrescribir un encabezado existente.");
    }
    sheet.getRange(1, newColumn).setValue("suggestionActorKey");
    SpreadsheetApp.flush();
    return newColumn;
}

function getReportMetadataColumn(sheet) {
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < 10) return 0;
    const headerWidth = Math.min(Math.max(sheet.getLastColumn(), 9), maxColumns);
    const headers = sheet.getRange(1, 1, 1, headerWidth).getValues()[0];
    const positions = [];
    headers.forEach((header, index) => {
        if (String(header || "").trim() === "reportMetadata") positions.push(index + 1);
    });
    if (positions.length > 1 || (positions.length === 1 && positions[0] <= 9)) {
        throw new Error("La columna reportMetadata existe en una posición duplicada o incompatible.");
    }
    return positions.length ? positions[0] : 0;
}

function ensureReportMetadataColumn(sheet) {
    const expectedHeaders = [
        "ID", "Usuario", "ID_vehiculo", "Problema", "Respuesta",
        "Se resolvio", "Responde", "Reporte de util", "anoSugerido"
    ];
    const maxColumns = sheet.getMaxColumns();
    if (maxColumns < expectedHeaders.length) {
        sheet.insertColumnsAfter(maxColumns, expectedHeaders.length - maxColumns);
    }
    const baseHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    expectedHeaders.forEach((expected, index) => {
        if (String(baseHeaders[index] || "").trim() !== expected) {
            throw new Error("El esquema de Feedbacks no coincide con el esperado; no se modificó la hoja.");
        }
    });

    const existingColumn = getReportMetadataColumn(sheet);
    if (existingColumn) return existingColumn;

    const headerWidth = Math.max(sheet.getLastColumn(), expectedHeaders.length);
    const newColumn = headerWidth + 1;
    if (sheet.getMaxColumns() < newColumn) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), newColumn - sheet.getMaxColumns());
    }
    const occupiedHeader = sheet.getRange(1, newColumn).getValue();
    if (occupiedHeader !== "" && occupiedHeader !== null) {
        throw new Error("No se puede añadir reportMetadata sin sobrescribir un encabezado existente.");
    }
    sheet.getRange(1, newColumn).setValue("reportMetadata");
    SpreadsheetApp.flush();
    return newColumn;
}

function normalizeReportImageMetadata_(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    const imageFileId = String(source.imageFileId || "").trim(), imageUrl = String(source.imageUrl || "").trim();
    const imageName = String(source.imageName || "").trim(), imageMimeType = String(source.imageMimeType || "").trim().toLowerCase();
    const imageSize = Number(source.imageSize), imageSha256 = String(source.imageSha256 || "").trim().toLowerCase();
    const expectedUrl = imageFileId ? "https://drive.google.com/file/d/" + imageFileId + "/view" : "";
    if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId) || imageUrl !== expectedUrl ||
        !["image/jpeg","image/png","image/webp"].includes(imageMimeType) || !imageName || imageName.length > 120 ||
        !Number.isInteger(imageSize) || imageSize < 1 || imageSize > 3 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(imageSha256)) return null;
    return { imageFileId, imageUrl, imageName, imageMimeType, imageSize, imageSha256 };
}
function parseReportMetadata(rawValue, rowVehicleId) {
    if (typeof rawValue !== "string" || !rawValue.trim()) return null;
    try {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        const reportId = String(parsed.reportId || "").trim(), vehicleId = String(parsed.vehicleId || "").trim();
        const corteIndex = Number(parsed.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId) || !vehicleId ||
            vehicleId !== String(rowVehicleId || "").trim() || !Number.isInteger(corteIndex) ||
            corteIndex < 1 || corteIndex > 3 || typeof parsed.activaTestigoMotor !== "boolean") return null;
        const metadata = { reportId, vehicleId, corteIndex, activaTestigoMotor: parsed.activaTestigoMotor };
        const imageMetadata = normalizeReportImageMetadata_(parsed);
        if (imageMetadata) Object.assign(metadata, imageMetadata);
        return metadata;
    } catch (error) { return null; }
}

function isPositiveYearSuggestionRow(row) {
    const problem = String(row[COLS_FEEDBACKS.Problema - 1] || "");
    const answer = String(row[COLS_FEEDBACKS.Respuesta - 1] || "");
    if (problem.includes("Sugerencia de ampliar rango") ||
        problem.includes("Confirmación de funcionamiento")) return true;
    return problem.includes("Modelo sin generaciones recientes") &&
        answer.includes("confirmó que se trata de una generación más reciente");
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    FEEDBACKS: "Feedbacks",
    CONTACTANOS: "Contactanos",
    ACTIVIDAD_USUARIO: "ActividadUsuario",
    SUGERENCIAS_ANO: "Feedbacks"
};

// Mapa de columnas para la hoja "Cortes" (v2.0)
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

// Mapa de columnas para la hoja "Feedbacks" (v2.0)
const COLS_FEEDBACKS = {
    ID: 1,
    Usuario: 2,
    ID_vehiculo: 3,
    Problema: 4,
    Respuesta: 5,
    "Se resolvio": 6,
    Responde: 7,
    "Reporte de util": 8,
    anoSugerido: 9
};

const COLS_CONTACTANOS = {
    Contacto_ID: 1,
    User_ID: 2,
    Asunto: 3,
    Mensaje: 4,
    Respuesta_mensaje: 5,
    ID_usuario_responde: 6
};

const COLS_ACTIVIDAD_USUARIO = {
    id: 1,
    timestamp: 2,
    idUsuario: 3,
    nombreUsuario: 4,
    tipoActividad: 5,
    idElementoAsociado: 6,
    detalle: 7
};

// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const serviceState = {
            service: 'GPSpedia-Feedback',
            version: '1.2.1',
            status: 'available'
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Feedback-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}


function isSharedMutationAction_(action) {
    return ["recordLike","reportProblem","addProblem","addSolution","addPrevention","addVehicleToProblem","removeVehicleFromProblem","updatePysItem","updateTutorialItem","suggestCutChange","suggestYear","addTutorial","sendContactForm","replyToFeedback","markAsResolved","deleteFeedbackItem","clearActivityLogs","submitVideoForApproval","approveVideo","rejectVideo"].includes(action);
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
        return withSharedMutationLease_("FEEDBACK", action, function(token) {
            
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

const FEEDBACK_ACTION_PERMISSIONS = Object.freeze({
    recordLike: null, reportProblem: null, addProblem: null, addSolution: null, addPrevention: null,
    addVehicleToProblem: null, removeVehicleFromProblem: ["Desarrollador"], updatePysItem: ["Desarrollador"],
    updateTutorialItem: ["Desarrollador"], suggestCutChange: null, addTutorial: ["Desarrollador"],
    getFeedbackItems: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
    replyToFeedback: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
    markAsResolved: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
    deleteFeedbackItem: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
    getActivityLogs: ["Desarrollador", "Gefe", "Supervisor"], clearActivityLogs: ["Desarrollador"],
    initYouTubeUpload: null, getVideoApprovalByOperation: null, submitVideoForApproval: null,
    approveVideo: ["Desarrollador", "Gefe", "Supervisor"], rejectVideo: ["Desarrollador", "Gefe", "Supervisor"]
});
const FEEDBACK_PUBLIC_ACTIONS = new Set(["getPysData", "sendContactForm"]);
function authorizeFeedbackAction_(action, payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (action === "suggestYear") return { ...source, ...resolveSuggestionYearActor(source) };
    if (Object.prototype.hasOwnProperty.call(FEEDBACK_ACTION_PERMISSIONS, action)) {
        const actor = assertFeedbackSession(source, FEEDBACK_ACTION_PERMISSIONS[action]);
        const authorized = { ...source, userId: actor.userId, userName: actor.userName, userRole: actor.role };
        if (action === "replyToFeedback") authorized.responderName = actor.userName;
        if (action === "approveVideo") authorized.approverName = actor.userName;
        if (action === "rejectVideo") authorized.rejecterName = actor.userName;
        return authorized;
    }
    if (FEEDBACK_PUBLIC_ACTIONS.has(action)) return action === "sendContactForm" ? { ...source, userId: "N/A" } : source;
    throw new Error("Acción no declarada en la política de FEEDBACK: " + String(action || ""));
}

function doPostInternal_(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        const action = request.action;
        let payload = request.payload || {};

        payload = authorizeFeedbackAction_(action, payload);

        switch (action) {
            case 'recordLike':
                response = handleRecordLike(payload);
                break;
            case 'reportProblem':
                response = handleReportProblem(payload);
                break;
            case 'getPysData':
                response = handleGetPysData();
                break;
            case 'addProblem':
                response = handleAddProblem(payload);
                break;
            case 'addSolution':
                response = handleAddSolution(payload);
                break;
            case 'addPrevention':
                response = handleAddPrevention(payload);
                break;
            case 'addVehicleToProblem':
                response = handleAddVehicleToProblem(payload);
                break;
            case 'removeVehicleFromProblem':
                response = handleRemoveVehicleFromProblem(payload);
                break;
            case 'updatePysItem':
                response = handleUpdatePysItem(payload);
                break;
            case 'updateTutorialItem':
                response = handleUpdateTutorialItem(payload);
                break;
            case 'suggestCutChange':
                response = handleSuggestCutChange(payload);
                break;
            case 'suggestYear':
                response = handleSuggestYear(payload);
                break;
            case 'addTutorial':
                response = handleAddTutorial(payload);
                break;
            case 'sendContactForm':
                response = handleSendContactForm(payload);
                break;
            // --- INBOX ACTIONS ---
            case 'getFeedbackItems':
                response = handleGetFeedbackItems(payload);
                break;
            case 'replyToFeedback':
                response = handleReplyToFeedback(payload);
                break;
            case 'markAsResolved':
                response = handleMarkAsResolved(payload);
                break;
            case 'getActivityLogs':
                response = handleGetActivityLogs(payload);
                break;
            case 'deleteFeedbackItem':
                response = handleDeleteFeedbackItem(payload);
                break;
            case 'clearActivityLogs':
                response = handleClearActivityLogs(payload);
                break;
            case 'initYouTubeUpload':
                response = handleInitYouTubeUpload(payload);
                break;
            case 'getVideoApprovalByOperation':
                response = handleGetVideoApprovalByOperation(payload);
                break;
            case 'submitVideoForApproval':
                response = handleSubmitVideoForApproval(payload);
                break;
            case 'approveVideo':
                response = handleApproveVideo(payload);
                break;
            case 'rejectVideo':
                response = handleRejectVideo(payload);
                break;
            default:
                throw new Error(`Acción desconocida en Feedback Service: ${action}`);
        }
    } catch (error) {
        response = { status: 'error', message: error.message };
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// MANEJADORES DE ACCIONES (HANDLERS)
// ============================================================================




// ============================================================================
// SINCRONIZACIÓN DE LA CARPETA DE IMAGEN PRINCIPAL TRAS AMPLIAR AÑOS
// ============================================================================

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

function getCortesRootFolder() {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const rootId = DriveApp.getRootFolder().getId();
    if (String(folder.getId()) !== String(DRIVE_FOLDER_ID) ||
        String(folder.getName() || "").trim().toLowerCase() !== "cortes") {
        throw new Error("DRIVE_FOLDER_ID no corresponde a la carpeta «Cortes».");
    }
    const parents = folder.getParents();
    let directChild = false;
    while (parents.hasNext()) if (parents.next().getId() === rootId) directChild = true;
    if (!directChild) throw new Error("La carpeta «Cortes» no está ubicada directamente en la raíz de Drive.");
    return folder;
}

function sanitizeForFolderDisplay(text) {
    if (text === null || text === undefined) return "";
    return String(text).replace(/\s+/g, " ").replace(/__+/g, "_").trim();
}

function getFolderCanonicalName(name) {
    return String(name || "").normalize("NFD").replace(/\p{M}/gu, "")
        .toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findOrCreateSubFolder(parentFolder, desiredName) {
    if (!parentFolder) throw new Error("No se proporcionó la carpeta padre.");
    const name = sanitizeForFolderDisplay(desiredName);
    const canonical = getFolderCanonicalName(name);
    if (!canonical) throw new Error("El nombre de carpeta no es válido.");

    const matches = [];
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
        const folder = folders.next();
        if (getFolderCanonicalName(folder.getName()) === canonical) matches.push(folder);
    }

    const exactMatches = matches.filter(folder => folder.getName() === name);
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1 || matches.length > 1) {
        throw new Error("Existen varias carpetas equivalentes a «" + name + "»; no se fusionaron ni modificaron.");
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

function getVehicleYearFolderName(vehicleInfo) {
    const info = vehicleInfo || {};
    const rawDesde = String(info[COLS_CORTES.anoDesde - 1] === null || info[COLS_CORTES.anoDesde - 1] === undefined ? "" : info[COLS_CORTES.anoDesde - 1]).trim();
    const rawHasta = String(info[COLS_CORTES.anoHasta - 1] === null || info[COLS_CORTES.anoHasta - 1] === undefined ? "" : info[COLS_CORTES.anoHasta - 1]).trim();
    const inlineRange = rawDesde.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    let desde = inlineRange ? parseInt(inlineRange[1], 10) : parseInt(rawDesde, 10);
    let hasta = inlineRange ? parseInt(inlineRange[2], 10) : parseInt(rawHasta, 10);
    if (!Number.isFinite(desde)) return "Sin_Año";
    if (!Number.isFinite(hasta)) hasta = desde;
    const start = Math.min(desde, hasta);
    const end = Math.max(desde, hasta);
    return start === end ? String(start) : String(start) + "_" + String(end);
}

function findOrCreateVehicleFolder(vehicleRow) {
    const row = vehicleRow || [];
    const category = sanitizeForFolderDisplay(row[COLS_CORTES.categoria - 1] || "Sin_Categoria");
    const brand = sanitizeForFolderDisplay(row[COLS_CORTES.marca - 1] || "Sin_Marca");
    const model = sanitizeForFolderDisplay(row[COLS_CORTES.modelo - 1] || "Sin_Modelo");
    const versionOrIgnition = sanitizeForFolderDisplay(
        String(row[COLS_CORTES.versionesAplicables - 1] || "").trim() ||
        String(row[COLS_CORTES.tipoEncendido - 1] || "").trim() || "Sin_Tipo_de_Encendido"
    );
    const yearRange = sanitizeForFolderDisplay(getVehicleYearFolderName(row));

    const categoryFolder = findOrCreateSubFolder(getCortesRootFolder(), category);
    const brandFolder = findOrCreateSubFolder(categoryFolder, brand);
    const modelFolder = findOrCreateSubFolder(brandFolder, model);
    const versionFolder = findOrCreateSubFolder(modelFolder, versionOrIgnition);
    return findOrCreateSubFolder(versionFolder, yearRange);
}

function collectCortesImageReferencesForFolderSync(sheet) {
    const imageFields = [
        "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
        "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
    ];
    const imageColumns = imageFields.map(field => ({
        field: field, column: COLS_CORTES[field]
    })).filter(item => Number.isInteger(item.column) && item.column > 0);
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
            const columnIndex = item.column - 1;
            const candidates = [
                String(values[r][columnIndex] || ""),
                String((formulas[r] && formulas[r][columnIndex]) || "")
            ];
            const richText = richTextValues[r] && richTextValues[r][columnIndex];
            if (richText) {
                const link = richText.getLinkUrl();
                if (link) candidates.push(link);
                const runs = richText.getRuns ? richText.getRuns() : [];
                runs.forEach(run => { const runLink = run.getLinkUrl(); if (runLink) candidates.push(runLink); });
            }

            const cellIds = new Set();
            let hasUnverifiable = false;
            candidates.forEach(candidate => {
                if (!candidate) return;
                const ids = extractDriveFileIds(candidate);
                ids.forEach(id => cellIds.add(id));
                if (!ids.length && /drive\.google\.com\/(?:uc|thumbnail|file|open)|googleusercontent\.com/i.test(candidate)) {
                    hasUnverifiable = true;
                }
            });

            cellIds.forEach(id => {
                if (!references.has(id)) references.set(id, []);
                references.get(id).push({
                    row: r + 2, field: item.field, column: item.column
                });
            });
            if (hasUnverifiable) unverifiableReferenceCount++;
        });
    }
    return { references: references, unverifiableReferenceCount: unverifiableReferenceCount };
}

function movePrimaryVehicleImageToCanonicalFolder(sheet, rowNumber, vehicleRow) {
    const imageUrl = vehicleRow[COLS_CORTES.imagenVehiculo - 1];
    const imageIds = extractDriveFileIds(imageUrl);
    if (!imageIds.length) return { skipped: true };

    const imageId = imageIds[0];
    const referenceData = collectCortesImageReferencesForFolderSync(sheet);
    if (referenceData.unverifiableReferenceCount > 0) {
        return {
            skipped: true, warning: true,
            reason: "Existen referencias de imagen de Cortes no verificables; se protegió el archivo."
        };
    }

    const locations = referenceData.references.get(imageId) || [];
    if (!locations.length) return { skipped: true, warning: true, reason: "No se pudo confirmar la referencia de imagenVehiculo." };
    if (locations.some(location => location.field !== "imagenVehiculo")) {
        return { skipped: true, warning: true, reason: "La imagen también se utiliza en un campo de corte, apertura o alimentación." };
    }
    const primaryLocations = locations.filter(location => location.field === "imagenVehiculo")
        .sort((a, b) => a.row - b.row);
    if (primaryLocations.length && primaryLocations[0].row !== rowNumber) {
        return { skipped: true, reason: "La imagen pertenece al primer registro que la utiliza (fila " + primaryLocations[0].row + ")." };
    }

    const file = DriveApp.getFileById(imageId);
    if (file.isTrashed()) return { skipped: true, warning: true, reason: "La imagen principal está en la papelera de Drive." };
    if (!String(file.getMimeType() || "").toLowerCase().startsWith("image/")) {
        return { skipped: true, warning: true, reason: "El archivo referenciado no tiene MIME de imagen." };
    }

    const targetFolder = findOrCreateVehicleFolder(vehicleRow);
    const parents = file.getParents();
    while (parents.hasNext()) {
        if (parents.next().getId() === targetFolder.getId()) return { skipped: true };
    }

    file.moveTo(targetFolder);
    return { moved: true, skipped: false };
}

function handleSuggestYear(payload) {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
        return handleSuggestYearLocked(payload);
    } finally {
        lock.releaseLock();
    }
}

function isVerifiedSuggestionActorKey_(actorKey) {
    return /^user:[A-Za-z0-9_.-]{1,100}$/.test(String(actorKey || ""));
}

function getAppliedSuggestionActorKey_(actorKey) {
    return "applied:" + String(actorKey || "").trim();
}

function getFeedbackYearApplicationsSheet_(createIfMissing) {
    const headers = [
        "operationId", "vehicleId", "year", "previousFrom", "previousTo",
        "targetFrom", "targetTo", "voteCount", "status", "activityAttempted",
        "createdAt", "updatedAt"
    ];
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("FeedbackYearApplications");
    if (!sheet && !createIfMissing) return null;
    if (!sheet) sheet = ss.insertSheet("FeedbackYearApplications");
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema de FeedbackYearApplications no coincide con el contrato esperado.");
    }
    return sheet;
}

function findPendingFeedbackYearApplication_(vehicleId) {
    const sheet = getFeedbackYearApplicationsSheet_(false);
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    const matches = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (String(row[1] || "").trim() === String(vehicleId) &&
            String(row[8] || "").trim() === "pending") {
            matches.push({ rowIndex: i + 1, row });
        }
    }
    if (matches.length > 1) {
        throw new Error("Hay varias aplicaciones de año pendientes para el mismo vehículo; requiere revisión manual.");
    }
    if (!matches.length) return null;
    const row = matches[0].row;
    const numeric = row.slice(2, 8).map(Number);
    if (!String(row[0] || "").trim() || !numeric.every(Number.isFinite) ||
        numeric[0] < 1980 || numeric[0] > 2099 ||
        numeric[1] < 1980 || numeric[1] > 2099 || numeric[2] < numeric[1] || numeric[2] > 2099 ||
        numeric[3] < 1980 || numeric[3] > 2099 || numeric[4] < numeric[3] || numeric[4] > 2099 ||
        numeric[5] < 3 || ![true, false, "TRUE", "FALSE", ""].includes(row[9])) {
        throw new Error("La aplicación pendiente de año contiene datos inválidos; requiere revisión manual.");
    }
    return { sheet, rowIndex: matches[0].rowIndex, row };
}

function completeFeedbackYearApplication_(application, context) {
    const { cortesSheet, vehicleRowIndex, feedbackSheet, actorColumn, parseCatalogYear, userId, userName } = context;
    const row = application.row;
    const previousFrom = Number(row[3]), previousTo = Number(row[4]);
    const targetFrom = Number(row[5]), targetTo = Number(row[6]);
    const year = Number(row[2]), voteCount = Number(row[7]);
    const fromChanged = previousFrom !== targetFrom;
    const toChanged = previousTo !== targetTo;
    if (fromChanged === toChanged || targetFrom !== Math.min(previousFrom, year) ||
        targetTo !== Math.max(previousTo, year)) {
        throw new Error("La aplicación pendiente no describe una ampliación válida; requiere revisión manual.");
    }

    const currentFrom = parseCatalogYear(cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.anoDesde).getValue());
    const rawCurrentTo = cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.anoHasta).getValue();
    const currentTo = String(rawCurrentTo === null || rawCurrentTo === undefined ? "" : rawCurrentTo).trim() === ""
        ? currentFrom : parseCatalogYear(rawCurrentTo);
    if (currentFrom === previousFrom && currentTo === previousTo) {
        // Un anoHasta vacío equivale a anoDesde. Si se amplía hacia atrás,
        // primero se fija el límite superior anterior para no desplazarlo al nuevo anoDesde.
        if (fromChanged && String(rawCurrentTo === null || rawCurrentTo === undefined ? "" : rawCurrentTo).trim() === "") {
            cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.anoHasta).setValue(previousTo);
            SpreadsheetApp.flush();
        }
        const targetColumn = fromChanged ? COLS_CORTES.anoDesde : COLS_CORTES.anoHasta;
        cortesSheet.getRange(vehicleRowIndex, targetColumn).setValue(fromChanged ? targetFrom : targetTo);
        SpreadsheetApp.flush();
    } else if (currentFrom !== targetFrom || currentTo !== targetTo) {
        throw new Error("El rango del catálogo cambió fuera de la aplicación pendiente; requiere revisión manual.");
    }

    const confirmedFrom = parseCatalogYear(cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.anoDesde).getValue());
    const rawConfirmedTo = cortesSheet.getRange(vehicleRowIndex, COLS_CORTES.anoHasta).getValue();
    const confirmedTo = String(rawConfirmedTo === null || rawConfirmedTo === undefined ? "" : rawConfirmedTo).trim() === ""
        ? confirmedFrom : parseCatalogYear(rawConfirmedTo);
    if (confirmedFrom !== targetFrom || confirmedTo !== targetTo) {
        throw new Error("No se pudo confirmar el rango de años aplicado; la operación permanece pendiente.");
    }

    let folderSyncWarning = false, folderSyncMessage = "";
    try {
        const updatedVehicleRow = cortesSheet.getRange(
            vehicleRowIndex, 1, 1, cortesSheet.getLastColumn()
        ).getValues()[0];
        const folderSyncResult = movePrimaryVehicleImageToCanonicalFolder(
            cortesSheet, vehicleRowIndex, updatedVehicleRow
        );
        folderSyncWarning = Boolean(folderSyncResult && folderSyncResult.warning);
        folderSyncMessage = folderSyncResult && folderSyncResult.reason ? folderSyncResult.reason : "";
    } catch (folderError) {
        folderSyncWarning = true;
        folderSyncMessage = folderError.message;
        Logger.log("No se pudo sincronizar la carpeta de imagenVehiculo tras ampliar el rango: " + folderError.message);
    }

    const ledger = application.sheet;
    const activityAttempted = row[9] === true || String(row[9]).toUpperCase() === "TRUE";
    if (!activityAttempted) {
        ledger.getRange(application.rowIndex, 10).setValue(true);
        SpreadsheetApp.flush();
        logUserActivity(userId, userName, "apply_year_suggestion", String(row[1]),
            "Rango actualizado a " + targetFrom + "-" + targetTo +
            " basado en " + voteCount + " aportantes distintos para el año " + year +
            (folderSyncWarning ? ". Advertencia de carpeta: " + folderSyncMessage : "."));
        row[9] = true;
    }

    const feedbackValues = feedbackSheet.getDataRange().getValues();
    for (let i = feedbackValues.length - 1; i >= 1; i--) {
        const feedbackRow = feedbackValues[i];
        const rowId = String(feedbackRow[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
        const rowYear = Number(feedbackRow[COLS_FEEDBACKS.anoSugerido - 1]);
        const rowActorKey = String(feedbackRow[actorColumn - 1] || "").trim();
        if (rowId === String(row[1]) && rowYear === year && rowActorKey &&
            isVerifiedSuggestionActorKey_(rowActorKey) &&
            isPositiveYearSuggestionRow(feedbackRow) && !rowActorKey.startsWith("applied:")) {
            feedbackSheet.getRange(i + 1, actorColumn).setValue(getAppliedSuggestionActorKey_(rowActorKey));
        }
    }
    SpreadsheetApp.flush();

    const verifiedRows = feedbackSheet.getDataRange().getValues();
    const remaining = verifiedRows.slice(1).some(feedbackRow => {
        const rowActorKey = String(feedbackRow[actorColumn - 1] || "").trim();
        return String(feedbackRow[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() === String(row[1]) &&
            Number(feedbackRow[COLS_FEEDBACKS.anoSugerido - 1]) === year &&
            isVerifiedSuggestionActorKey_(rowActorKey) &&
            isPositiveYearSuggestionRow(feedbackRow) && !rowActorKey.startsWith("applied:");
    });
    if (remaining) throw new Error("La ampliación quedó aplicada, pero no se pudieron marcar todos los aportes; la recuperación permanece pendiente.");

    ledger.getRange(application.rowIndex, 9).setValue("completed");
    ledger.getRange(application.rowIndex, 12).setValue(new Date().toISOString());
    SpreadsheetApp.flush();
    if (String(ledger.getRange(application.rowIndex, 9).getValue() || "").trim() !== "completed") {
        throw new Error("No se pudo confirmar el cierre de la aplicación de año; permanece pendiente.");
    }

    return {
        status: "success",
        recovered: false,
        folderSyncWarning,
        message: "¡Gracias! Con " + voteCount + " aportantes distintos, el catálogo se ha actualizado a " +
            targetFrom + "-" + targetTo + "." +
            (folderSyncWarning ? " La carpeta de la imagen principal no pudo sincronizarse automáticamente: " + folderSyncMessage : "")
    };
}

function handleSuggestYearLocked(payload) {
    const { vehicleId, newYear, response, userId, userName, suggestionActorKey } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedResponse = String(response || "").trim();
    const actorKey = String(suggestionActorKey || "").trim();

    if (!normalizedVehicleId || !userId || !userName || !actorKey) throw new Error("Faltan datos verificados para registrar la sugerencia de año.");
    const isAnonymousActor = String(userId) === "0" && actorKey === "anon:unverified";
    const isVerifiedActor = actorKey === "user:" + String(userId);
    if (!isAnonymousActor && !isVerifiedActor) throw new Error("La identidad del aportante no coincide con la sesión validada.");
    if (isAnonymousActor) enforceFeedbackRateLimit_("anonymous_year_suggestion", 30, 3600);

    const yearText = String(newYear === null || newYear === undefined ? "" : newYear).trim();
    if (!/^\d{4}$/.test(yearText)) throw new Error("El año debe contener exactamente cuatro dígitos.");
    const year = Number(yearText);
    if (year < 1980 || year > 2099) throw new Error("El año proporcionado no es válido.");

    const otherYearMatch = normalizedResponse.match(/^Otro año:\s*(\d{4})$/);
    const allowedResponses = [
        "Sí (Funciona)", "Modelo confirmado", "No funciona", "No",
        "Es más antiguo", "No útil (Viejo)"
    ];
    if (!allowedResponses.includes(normalizedResponse) && !otherYearMatch) {
        throw new Error("La respuesta de validación no es reconocida.");
    }
    if (otherYearMatch && Number(otherYearMatch[1]) !== year) {
        throw new Error("El año de la respuesta no coincide con el año enviado.");
    }

    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!cortesSheet) throw new Error("Hoja Cortes no encontrada.");
    const allCortesData = cortesSheet.getDataRange().getValues().slice(1);
    const matchingVehicleIndexes = [];
    allCortesData.forEach((row, index) => {
        if (String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) matchingVehicleIndexes.push(index);
    });
    if (matchingVehicleIndexes.length === 0) throw new Error("Vehículo no encontrado para registrar la sugerencia.");
    if (matchingVehicleIndexes.length > 1) throw new Error("El vehículo tiene un ID duplicado; no se registró la sugerencia de año.");
    const vehicleRowIndex = matchingVehicleIndexes[0];
    const vehicleRow = allCortesData[vehicleRowIndex];
    const parseCatalogYear = value => {
        const text = String(value === null || value === undefined ? "" : value).trim();
        if (!/^[0-9]{4}$/.test(text)) return NaN;
        const parsed = Number(text);
        return parsed >= 1980 && parsed <= 2099 ? parsed : NaN;
    };
    const rawAnoDesde = vehicleRow[COLS_CORTES.anoDesde - 1];
    const rawAnoHasta = vehicleRow[COLS_CORTES.anoHasta - 1];
    const anoDesde = parseCatalogYear(rawAnoDesde);
    const anoHasta = String(rawAnoHasta === null || rawAnoHasta === undefined ? "" : rawAnoHasta).trim() === "" ? anoDesde : parseCatalogYear(rawAnoHasta);
    if (!Number.isFinite(anoDesde) || !Number.isFinite(anoHasta) || anoHasta < anoDesde) {
        throw new Error("El rango de años del vehículo es inválido; no se registró la sugerencia.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.SUGERENCIAS_ANO);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const actorColumn = ensureSuggestionActorColumn(sheet);

    let problema = "Sugerencia de año: " + year;
    let respuestaText = "La información funciona para el año " + year;
    let isPositive = false;
    if (normalizedResponse === "Sí (Funciona)") {
        problema = "Confirmación de funcionamiento para año " + year;
        respuestaText = "La información funciona para el año " + year + ".";
        isPositive = true;
    } else if (otherYearMatch) {
        problema = "Sugerencia de ampliar rango al año " + year;
        respuestaText = "La información funciona para el año " + year + ".";
        isPositive = true;
    } else if (normalizedResponse === "Es más antiguo") {
        problema = "Sugerencia de ampliar rango inferior al año " + year;
        respuestaText = "El usuario indicó que corresponde a un modelo anterior.";
        isPositive = true;
    } else if (normalizedResponse === "No funciona") {
        problema = "Reporte de información no funcional";
        respuestaText = "La información no funciona para el año " + year + ". El usuario fue dirigido para agregar un nuevo corte.";
    } else if (normalizedResponse === "No") {
        problema = "Reporte de información no funcional";
        respuestaText = "El usuario indicó que la información no fue útil.";
    } else if (normalizedResponse === "Modelo confirmado") {
        problema = "Modelo sin generaciones recientes registradas";
        respuestaText = "El usuario confirmó que se trata de una generación más reciente.";
        isPositive = true;
    } else if (normalizedResponse === "No útil (Viejo)") {
        problema = "Modelo sin generaciones recientes registradas";
        respuestaText = "El usuario indicó que la información no fue útil.";
    }

    const existingData = sheet.getDataRange().getValues().slice(1);
    const matchesActorAndSuggestion = row =>
        String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() === normalizedVehicleId &&
        Number(row[COLS_FEEDBACKS.anoSugerido - 1]) === year;
    const pendingApplication = findPendingFeedbackYearApplication_(normalizedVehicleId);
    if (pendingApplication) {
        const pendingYear = Number(pendingApplication.row[2]);
        const recovered = completeFeedbackYearApplication_(pendingApplication, {
            cortesSheet,
            vehicleRowIndex: vehicleRowIndex + 2,
            feedbackSheet: sheet,
            actorColumn,
            parseCatalogYear,
            userId,
            userName
        });
        const appliedActorKey = getAppliedSuggestionActorKey_(actorKey);
        const currentActorAlreadyReported = existingData.some(row =>
            matchesActorAndSuggestion(row) &&
            [actorKey, appliedActorKey].includes(String(row[actorColumn - 1] || "").trim())
        );
        if (pendingYear !== year || !currentActorAlreadyReported) {
            const message = pendingYear !== year
                ? "Se recuperó la ampliación pendiente del año " + pendingYear +
                    ". La sugerencia para el año " + year + " no se registró; vuelve a enviarla."
                : "Se recuperó la ampliación pendiente del año " + pendingYear +
                    ". Tu respuesta para ese año no se registró; vuelve a enviarla.";
            return { ...recovered, status: "info", recovered: true, recorded: false, message };
        }
        return {
            ...recovered,
            recovered: true,
            recorded: false,
            message: "Se recuperó una ampliación pendiente. " + recovered.message
        };
    }

    const alreadyApplied = existingData.some(row =>
        matchesActorAndSuggestion(row) &&
        String(row[actorColumn - 1] || "").trim() === getAppliedSuggestionActorKey_(actorKey)
    );
    if (alreadyApplied) {
        return { status: "info", recorded: false, message: "Esta sugerencia ya fue atendida; no se registró nuevamente." };
    }
    const alreadyReported = existingData.some(row =>
        matchesActorAndSuggestion(row) &&
        String(row[actorColumn - 1] || "").trim() === actorKey
    );

    if (!alreadyReported) {
        const newRowNumber = sheet.getLastRow() + 1;
        const lastCol = Math.max(sheet.getLastColumn(), actorColumn, 9);
        if (newRowNumber > 2) {
            sheet.getRange(2, 1, 1, lastCol).copyTo(sheet.getRange(newRowNumber, 1, 1, lastCol));
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
        const values = [[userName, normalizedVehicleId, problema, respuestaText, "", "", "", year]];
        sheet.getRange(newRowNumber, 2, 1, values[0].length).setValues(values);
        sheet.getRange(newRowNumber, actorColumn).setValue(actorKey);
        SpreadsheetApp.flush();
        logUserActivity(userId, userName, "suggest_year", normalizedVehicleId,
            "Año sugerido: " + year + ". Respuesta: " + normalizedResponse);
    }

    const allData = sheet.getDataRange().getValues().slice(1);
    const voteActors = new Set();
    allData.forEach(row => {
        const rowId = String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
        const rowYear = Number(row[COLS_FEEDBACKS.anoSugerido - 1]);
        const rowActorKey = String(row[actorColumn - 1] || "").trim();
        if (rowId === normalizedVehicleId && rowYear === year &&
            isVerifiedSuggestionActorKey_(rowActorKey) && isPositiveYearSuggestionRow(row)) voteActors.add(rowActorKey);
    });
    const voteCount = voteActors.size;

    if (!isPositive) {
        return alreadyReported
            ? { status: "info", recorded: false, message: "Ya existe una respuesta de este aportante para ese vehículo y año; no se duplicó." }
            : { status: "success", message: "Respuesta registrada correctamente." };
    }
    if (alreadyReported && !voteActors.has(actorKey)) {
        return {
            status: "info",
            recorded: false,
            message: "Ya existe una respuesta de este aportante para ese vehículo y año; no se modificó ni se contó como voto positivo."
        };
    }
    if (isAnonymousActor) {
        return { status: "info", recorded: true, message: "La sugerencia anónima quedó registrada para revisión manual; no cuenta para modificar automáticamente el catálogo." };
    }
    if (voteCount < 3) {
        const prefix = alreadyReported ? "Tu aporte ya estaba registrado." : "Sugerencia registrada.";
        return { status: "success", message: prefix + " Votos de usuarios verificados: " + voteCount + "/3." };
    }

    if (year >= anoDesde && year <= anoHasta) {
        return { status: "info", recorded: true, message: "El año " + year + " ya está dentro del rango actual." };
    }

    const normalizeIdentity = value => String(value === null || value === undefined ? "" : value)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
    const marca = normalizeIdentity(vehicleRow[COLS_CORTES.marca - 1]);
    const modelo = normalizeIdentity(vehicleRow[COLS_CORTES.modelo - 1]);
    const categoria = normalizeIdentity(vehicleRow[COLS_CORTES.categoria - 1]);
    const tipoEncendido = normalizeIdentity(vehicleRow[COLS_CORTES.tipoEncendido - 1]);
    const normalizeV = value => (value || "").toString().toLowerCase()
        .replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
    const versionNormalizada = normalizeV(vehicleRow[COLS_CORTES.versionesAplicables - 1]);
    const proposedAnoDesde = Math.min(year, anoDesde);
    const proposedAnoHasta = Math.max(year, anoHasta);

    for (const row of allCortesData) {
        if (String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) continue;
        const otherMarca = normalizeIdentity(row[COLS_CORTES.marca - 1]);
        const otherModelo = normalizeIdentity(row[COLS_CORTES.modelo - 1]);
        const otherCategoria = normalizeIdentity(row[COLS_CORTES.categoria - 1]);
        const otherTipoEncendido = normalizeIdentity(row[COLS_CORTES.tipoEncendido - 1]);
        const otherVersion = normalizeV(row[COLS_CORTES.versionesAplicables - 1]);
        if (otherMarca === marca && otherModelo === modelo && otherCategoria === categoria &&
            otherTipoEncendido === tipoEncendido && otherVersion === versionNormalizada) {
            const otherAnoDesde = parseCatalogYear(row[COLS_CORTES.anoDesde - 1]);
            const rawOtherAnoHasta = row[COLS_CORTES.anoHasta - 1];
            const otherAnoHasta = String(rawOtherAnoHasta === null || rawOtherAnoHasta === undefined ? "" : rawOtherAnoHasta).trim() === "" ? otherAnoDesde : parseCatalogYear(rawOtherAnoHasta);
            if (!Number.isFinite(otherAnoDesde) || !Number.isFinite(otherAnoHasta) || otherAnoHasta < otherAnoDesde) {
                if (!alreadyReported) {
                    logUserActivity(userId, userName, "suggest_year_range_review", normalizedVehicleId,
                        "La generación coincidente con ID " + row[COLS_CORTES.id - 1] + " tiene un rango de años inválido; se requiere revisión manual.");
                }
                return { status: "warning", message: "No se pudo validar la separación entre generaciones porque otra fila coincidente tiene un rango de años inválido. Se requiere revisión manual." };
            }
            if (proposedAnoDesde <= otherAnoHasta && proposedAnoHasta >= otherAnoDesde) {
                if (!alreadyReported) {
                    logUserActivity(userId, userName, "suggest_year_collision", normalizedVehicleId,
                        "Rango propuesto " + proposedAnoDesde + "-" + proposedAnoHasta +
                        " se superpone con rango de vehículo ID " + row[COLS_CORTES.id - 1] +
                        " (" + otherAnoDesde + "-" + otherAnoHasta + ")");
                }
                return {
                    status: "warning",
                    message: "La ampliación del rango " + proposedAnoDesde + "-" + proposedAnoHasta +
                        " se superpone con otra generación registrada (" + otherAnoDesde + "-" + otherAnoHasta +
                        "). Se requiere revisión manual."
                };
            }
        }
    }

    let newAnoDesde = anoDesde, newAnoHasta = anoHasta, updated = false;
    if (year < anoDesde) { newAnoDesde = year; updated = true; }
    if (year > anoHasta) { newAnoHasta = year; updated = true; }

    if (updated) {
        const ledger = getFeedbackYearApplicationsSheet_(true);
        const operationId = "YSA-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000000000).toString(36);
        const operationRow = ledger.getLastRow() + 1;
        const createdAt = new Date().toISOString();
        ledger.getRange(operationRow, 1, 1, 12).setValues([[
            operationId, normalizedVehicleId, year, anoDesde, anoHasta,
            newAnoDesde, newAnoHasta, voteCount, "pending", false, createdAt, createdAt
        ]]);
        SpreadsheetApp.flush();
        const application = {
            sheet: ledger,
            rowIndex: operationRow,
            row: ledger.getRange(operationRow, 1, 1, 12).getValues()[0]
        };
        if (String(application.row[0] || "") !== operationId ||
            String(application.row[8] || "") !== "pending") {
            throw new Error("No se pudo confirmar el registro de recuperación de la ampliación; el catálogo no fue modificado.");
        }
        return completeFeedbackYearApplication_(application, {
            cortesSheet,
            vehicleRowIndex: vehicleRowIndex + 2,
            feedbackSheet: sheet,
            actorColumn,
            parseCatalogYear,
            userId,
            userName
        });
    }
    return { status: "info", message: "No se realizaron cambios." };
}
function logUserActivity(userId, userName, activityType, associatedId, details) {
    try {
        const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
        if (!sheet) {
            Logger.log(`CRITICAL: No se encontró la hoja de actividad de usuario: ${SHEET_NAMES.ACTIVIDAD_USUARIO}`);
            return;
        }
        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const lastCol = Math.max(sheet.getLastColumn(), 7);
        const FORMULA_ROW = 2;

        // 1. Copiar la fila con fórmulas para asegurar el ID correcto (F-XXX)
        if (lastRow >= FORMULA_ROW) {
            const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
            const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
            formulaRange.copyTo(newRowRange);
            // Preservar ID (col 1), limpiar el resto
            if (lastCol > 1) {
                sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
            }
        }

        // 2. Preparar los datos que se van a escribir, EXCLUYENDO la columna de ID.
        const dataToWrite = [
            new Date().toISOString(),
            userId,
            userName,
            activityType,
            associatedId,
            details
        ];

        // 3. Obtener el rango SOLO para las celdas de datos y escribirlos.
        // Esto deja la columna 1 (ID) intacta, conservando la fórmula heredada.
        const dataRange = sheet.getRange(newRowNumber, COLS_ACTIVIDAD_USUARIO.timestamp, 1, dataToWrite.length);
        dataRange.setValues([dataToWrite]);

    } catch (e) {
        // Log error to main log sheet if activity logging fails
        Logger.log(`CRITICAL: Fallo al registrar actividad de usuario. Error: ${e.message}`);
    }
}

function ensureFeedbackLikesSheet_() {
    const headers = ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"];
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("FeedbackLikes");
    if (!sheet) sheet = ss.insertSheet("FeedbackLikes");
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || "").trim());
    if (headers.some((header, index) => actual[index] !== header)) throw new Error("El esquema de FeedbackLikes no coincide con el contrato esperado.");
    return sheet;
}
function handleRecordLike(payload) {
    const vehicleId = String(payload && payload.vehicleId || "").trim();
    const corteIndex = Number(payload && payload.corteIndex);
    const userId = String(payload && payload.userId || "").trim();
    const userName = String(payload && payload.userName || "").trim();
    if (!vehicleId || !userId || !userName || !Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) throw new Error("Faltan datos verificados para registrar el like.");
    const actorKey = "user:" + userId;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
        const cuts = getSafeSheet(SHEET_NAMES.CORTES);
        if (!cuts) throw new Error("Hoja Cortes no encontrada.");
        const rows = cuts.getDataRange().getValues();
        const matches = [];
        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][COLS_CORTES.id - 1] || "").trim() === vehicleId) matches.push({ row: rows[i], rowIndex: i + 1 });
        }
        if (matches.length !== 1) throw new Error(matches.length ? "El vehículo tiene un ID duplicado; no se registró el like." : "No se encontró el vehículo.");
        const vehicle = matches[0];
        const typeCol = COLS_CORTES["tipoCorte" + corteIndex], utilCol = COLS_CORTES["utilCorte" + corteIndex];
        if (!typeCol || !utilCol || !String(vehicle.row[typeCol - 1] || "").trim()) throw new Error("El corte seleccionado no existe en el vehículo.");

        const ledger = ensureFeedbackLikesSheet_(), ledgerRows = ledger.getDataRange().getValues().slice(1), found = [];
        ledgerRows.forEach((row, index) => {
            if (String(row[0] || "").trim() === actorKey && String(row[1] || "").trim() === vehicleId && Number(row[2]) === corteIndex) found.push({ row, rowIndex: index + 2 });
        });
        if (found.length > 1) throw new Error("El like tiene registros duplicados en FeedbackLikes; requiere revisión.");
        const counterCell = cuts.getRange(vehicle.rowIndex, utilCol);
        const rawCountValue = counterCell.getValue();
        const currentCount = rawCountValue === "" || rawCountValue === null || rawCountValue === undefined ? 0 : Number(rawCountValue);
        if (!Number.isSafeInteger(currentCount) || currentCount < 0) throw new Error("El contador de likes del corte no es un entero válido; requiere revisión.");
        if (found.length === 1) {
            const existing = found[0], status = String(existing.row[5] || "");
            if (status === "completed") return { status: "success", alreadyLiked: true, likeCount: currentCount, message: "Este usuario ya había registrado su like." };
            if (status !== "pending") throw new Error("El registro previo del like tiene un estado desconocido.");
            const previous = Number(existing.row[3]), target = Number(existing.row[4]);
            if (!Number.isSafeInteger(previous) || previous < 0 || !Number.isSafeInteger(target) || target !== previous + 1) throw new Error("El registro pendiente del like tiene contadores inválidos.");
            if (currentCount === previous) counterCell.setValue(target);
            else if (currentCount !== target) throw new Error("El contador cambió fuera del intento pendiente; requiere reconciliación manual.");
            SpreadsheetApp.flush();
            if (Number(counterCell.getValue()) !== target) throw new Error("No se pudo confirmar el contador del like.");
            ledger.getRange(existing.rowIndex, 6).setValue("completed");
            SpreadsheetApp.flush();
            try { logUserActivity(userId, userName, "like", vehicleId, "Like en corte " + corteIndex + ". Nuevo total: " + target); } catch (logError) { console.error(logError); }
            return { status: "success", recovered: true, likeCount: target, message: "Like recuperado y confirmado." };
        }
        const target = currentCount + 1;
        ledger.appendRow([actorKey, vehicleId, corteIndex, currentCount, target, "pending", new Date().toISOString()]);
        SpreadsheetApp.flush();
        counterCell.setValue(target);
        SpreadsheetApp.flush();
        if (Number(counterCell.getValue()) !== target) throw new Error("No se pudo confirmar el contador del like.");
        ledger.getRange(ledger.getLastRow(), 6).setValue("completed");
        SpreadsheetApp.flush();
        try { logUserActivity(userId, userName, "like", vehicleId, "Like en corte " + corteIndex + ". Nuevo total: " + target); } catch (logError) { console.error(logError); }
        return { status: "success", alreadyLiked: false, likeCount: target, message: "Like registrado correctamente." };
    } finally {
        lock.releaseLock();
    }
}

function findReportByReportId_(sheet, reportId, metadataColumn) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const lastColumn = Math.max(metadataColumn, COLS_FEEDBACKS.Problema);
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const matches = [];
    rows.forEach((row, index) => {
        let metadata = null;
        try {
            const parsed = JSON.parse(String(row[metadataColumn - 1] || ""));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed;
        } catch (error) {}
        if (metadata && String(metadata.reportId || "") === String(reportId)) {
            matches.push({ rowIndex: index + 2, row, metadata });
        }
    });
    if (matches.length > 1) {
        throw new Error("El identificador del reporte aparece duplicado en Feedbacks; requiere revisión.");
    }
    return matches[0] || null;
}

const REPORT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
function validateReportImageAttachment_(source) {
    if (source == null) return null;
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("El adjunto de imagen tiene un formato inválido.");
    const dataUrl = String(source.dataUrl || "").trim();
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    const mimeType = String(source.mimeType || "").trim().toLowerCase();
    if (!match || match[1].toLowerCase() !== mimeType) throw new Error("El tipo MIME o el contenido Base64 de la imagen no es válido.");
    if (match[2].length > Math.ceil(REPORT_IMAGE_MAX_BYTES / 3) * 4) throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
    let bytes;
    try { bytes = Utilities.base64Decode(match[2]); } catch (error) { throw new Error("No se pudo decodificar la imagen adjunta."); }
    if (!bytes || !bytes.length || bytes.length > REPORT_IMAGE_MAX_BYTES) throw new Error("La imagen está vacía o supera el tamaño máximo permitido de 3 MB.");
    if (Utilities.base64Encode(bytes) !== match[2]) throw new Error("La codificación Base64 de la imagen no es canónica.");
    const at = index => Number(bytes[index]) & 255;
    const signatureValid =
        (mimeType === "image/jpeg" && bytes.length >= 3 && at(0) === 255 && at(1) === 216 && at(2) === 255) ||
        (mimeType === "image/png" && bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>at(i)===v)) ||
        (mimeType === "image/webp" && bytes.length >= 12 && String.fromCharCode(at(0),at(1),at(2),at(3)) === "RIFF" && String.fromCharCode(at(8),at(9),at(10),at(11)) === "WEBP");
    if (!signatureValid) throw new Error("El contenido real del archivo no coincide con su tipo de imagen declarado.");
    const declaredSize = Number(source.size);
    if (!Number.isInteger(declaredSize) || declaredSize !== bytes.length) throw new Error("El tamaño declarado de la imagen no coincide con los bytes recibidos.");
    const name = String(source.name || "imagen").replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0,120);
    if (!name) throw new Error("El nombre del archivo de imagen no es válido.");
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    const sha256 = Array.from(digest).map(v=>(v&255).toString(16).padStart(2,"0")).join("");
    return { bytes, name, mimeType, size: bytes.length, sha256 };
}
function saveReportImageAttachment_(image, reportId) {
    const extensions = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" };
    const extension = extensions[image.mimeType];
    if (!extension) throw new Error("El formato de imagen no está permitido.");
    const baseName = image.name.replace(/\.[^.]*$/,"").replace(/[^A-Za-z0-9_-]/g,"_").slice(0,60) || "imagen";
    const fileName = String(reportId) + "_" + Date.now() + "_" + baseName + "." + extension;
    const folder = findOrCreateSubFolder(getCortesRootFolder(), "Reportes individuales");
    const file = folder.createFile(Utilities.newBlob(image.bytes,image.mimeType,fileName));
    if (!file) throw new Error("Drive no confirmó la creación de la imagen del reporte.");
    const imageFileId = String(file.getId() || "").trim();
    if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId)) {
        try { file.setTrashed(true); } catch (error) {}
        throw new Error("Drive no devolvió un identificador válido para la imagen.");
    }
    return { file, metadata: { imageFileId, imageUrl:"https://drive.google.com/file/d/"+imageFileId+"/view",
        imageName:image.name, imageMimeType:image.mimeType, imageSize:image.size, imageSha256:image.sha256 } };
}
function trashReportImageUpload_(upload) {
    if (!upload || !upload.file) return;
    try { upload.file.setTrashed(true); } catch (error) { console.error("No se pudo retirar una imagen no asociada a un reporte:",error); }
}
function handleReportProblem(payload) {
    payload = payload && typeof payload === "object" ? payload : {};
    const { vehicleId, problemText, userId, userName } = payload;
    if (!vehicleId || !userId || !userName) throw new Error("Faltan datos para reportar el problema (vehicleId, userId, userName).");
    const normalizedProblemText = normalizeFeedbackText_(problemText, "La descripción del reporte", FEEDBACK_REPORT_TEXT_MAX_LENGTH);
    const hasReportContext = payload.reportId !== undefined || payload.corteIndex !== undefined || payload.activaTestigoMotor !== undefined;
    let reportContext = null;
    if (hasReportContext) {
        const reportId=String(payload.reportId||"").trim(), corteIndex=Number(payload.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId)) throw new Error("El identificador del reporte no tiene un formato válido.");
        if (!Number.isInteger(corteIndex)||corteIndex<1||corteIndex>3) throw new Error("El número de corte no es válido.");
        if (typeof payload.activaTestigoMotor!=="boolean") throw new Error("El indicador del testigo del motor debe ser booleano.");
        reportContext={reportId,vehicleId:String(vehicleId),corteIndex,activaTestigoMotor:payload.activaTestigoMotor};
    }
    const imageAttachment=validateReportImageAttachment_(payload.imageAttachment);
    if(imageAttachment&&!reportContext) throw new Error("El adjunto requiere un identificador de reporte individual válido.");
    const lock=LockService.getScriptLock(); lock.waitLock(10000);
    let generatedReportId="",duplicateReport=false,uploadedImage=null,resolvedImageUrl="";
    let pendingSheet=null,pendingRowNumber=0,pendingMetadataColumn=0,pendingExistingMetadata=null;
    try {
        const sheet=getSafeSheet(SHEET_NAMES.FEEDBACKS); pendingSheet=sheet;
        const metadataColumn=reportContext?ensureReportMetadataColumn(sheet):0; pendingMetadataColumn=metadataColumn;
        if(reportContext) {
            const existing=findReportByReportId_(sheet,reportContext.reportId,metadataColumn);
            if(existing) {
                const sameReport=String(existing.row[COLS_FEEDBACKS.Usuario-1]||"")===String(userName)&&
                    String(existing.row[COLS_FEEDBACKS.ID_vehiculo-1]||"")===String(vehicleId)&&
                    String(existing.row[COLS_FEEDBACKS.Problema-1]||"")===normalizedProblemText&&
                    String(existing.metadata.vehicleId||"")===String(vehicleId)&&Number(existing.metadata.corteIndex)===reportContext.corteIndex&&
                    existing.metadata.activaTestigoMotor===reportContext.activaTestigoMotor&&
                    (!existing.metadata.userId||String(existing.metadata.userId)===String(userId));
                if(!sameReport) throw new Error("El identificador del reporte ya pertenece a un reporte distinto; no se creó otro registro.");
                const oldImage=normalizeReportImageMetadata_(existing.metadata);
                if(imageAttachment) {
                    if(oldImage) {
                        if(oldImage.imageSha256!==imageAttachment.sha256) throw new Error("El reporte ya tiene una imagen distinta asociada; no se reemplazó.");
                        resolvedImageUrl=oldImage.imageUrl;
                    } else {
                        uploadedImage=saveReportImageAttachment_(imageAttachment,reportContext.reportId);
                        pendingExistingMetadata={rowIndex:existing.rowIndex,column:metadataColumn,value:JSON.stringify(existing.metadata)};
                        sheet.getRange(existing.rowIndex,metadataColumn).setValue(JSON.stringify(Object.assign({},existing.metadata,uploadedImage.metadata)));
                        SpreadsheetApp.flush(); resolvedImageUrl=uploadedImage.metadata.imageUrl;
                        uploadedImage=null; pendingExistingMetadata=null;
                    }
                } else if(oldImage) resolvedImageUrl=oldImage.imageUrl;
                generatedReportId=reportContext.reportId; duplicateReport=true;
            }
        }
        if(!duplicateReport) {
            const lastRow=sheet.getLastRow(),newRowNumber=lastRow+1; pendingRowNumber=newRowNumber;
            const FORMULA_ROW=2,lastCol=reportContext?Math.max(sheet.getLastColumn(),metadataColumn,8):(sheet.getLastColumn()||8);
            if(lastRow>=FORMULA_ROW) {
                sheet.getRange(FORMULA_ROW,1,1,lastCol).copyTo(sheet.getRange(newRowNumber,1,1,lastCol));
                if(lastCol>1) sheet.getRange(newRowNumber,2,1,lastCol-1).clearContent();
            }
            if(imageAttachment) uploadedImage=saveReportImageAttachment_(imageAttachment,reportContext.reportId);
            sheet.getRange(newRowNumber,COLS_FEEDBACKS.Usuario,1,3).setValues([[userName,vehicleId,normalizedProblemText]]);
            if(reportContext) {
                const metadata={reportId:reportContext.reportId,userId:String(userId),vehicleId:String(vehicleId),
                    corteIndex:reportContext.corteIndex,activaTestigoMotor:reportContext.activaTestigoMotor};
                if(uploadedImage) Object.assign(metadata,uploadedImage.metadata);
                sheet.getRange(newRowNumber,metadataColumn).setValue(JSON.stringify(metadata));
                if(uploadedImage) resolvedImageUrl=uploadedImage.metadata.imageUrl;
            }
            SpreadsheetApp.flush();
            const idVal=sheet.getRange(newRowNumber,COLS_FEEDBACKS.ID).getValue();
            generatedReportId=reportContext?reportContext.reportId:"REP-"+(idVal||Date.now());
            uploadedImage=null;
        }
    } catch(error) {
        trashReportImageUpload_(uploadedImage);
        if(pendingSheet&&pendingExistingMetadata) {
            try { pendingSheet.getRange(pendingExistingMetadata.rowIndex,pendingExistingMetadata.column).setValue(pendingExistingMetadata.value); SpreadsheetApp.flush(); }
            catch(rollbackError) { console.error("No se pudo restaurar metadata previa del reporte:",rollbackError); }
        }
        if(pendingSheet&&pendingRowNumber) {
            try {
                pendingSheet.getRange(pendingRowNumber,COLS_FEEDBACKS.Usuario,1,3).clearContent();
                if(pendingMetadataColumn) pendingSheet.getRange(pendingRowNumber,pendingMetadataColumn).clearContent();
                SpreadsheetApp.flush();
            } catch(rollbackError) { console.error("No se pudo revertir completamente la fila del reporte:",rollbackError); }
        }
        throw error;
    } finally { lock.releaseLock(); }
    if(!duplicateReport) logUserActivity(userId,userName,"report_problem",vehicleId,normalizedProblemText);
    return {status:"success",message:duplicateReport?"El reporte ya estaba registrado; se devolvió el identificador existente.":"Problema reportado.",
        reportId:generatedReportId,alreadyReported:duplicateReport,imageAttached:Boolean(resolvedImageUrl),imageUrl:resolvedImageUrl};
}
function enforceFeedbackRateLimit_(scope, limit, windowSeconds) {
    const cache = CacheService.getScriptCache();
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = "feedback-rate:" + scope + ":" + bucket;
    const current = Number(cache.get(key) || 0);
    if (!Number.isFinite(current) || current < 0) throw new Error("El control de frecuencia no devolvió un estado válido.");
    if (current >= limit) throw new Error("Se alcanzó el límite temporal de solicitudes. Intenta nuevamente más tarde.");
    cache.put(key, String(current + 1), windowSeconds);
}
function handleSendContactForm(payload) {
    const name = String(payload && payload.name || "").trim();
    const email = String(payload && payload.email || "").trim();
    const message = String(payload && payload.message || "").trim();
    if (!name || !email || !message) throw new Error("Faltan datos para enviar el formulario de contacto.");
    if (name.length > 100 || email.length > 254 || message.length > 3000) throw new Error("El formulario de contacto supera la longitud permitida.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("La dirección de correo no tiene un formato válido.");
    enforceFeedbackRateLimit_("public_contact", 10, 3600);
    const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
    if (!sheet) throw new Error("Hoja Contactanos no encontrada.");
    const lastRow = sheet.getLastRow(), newRowNumber = lastRow + 1, lastCol = sheet.getLastColumn() || 6;
    if (lastRow >= 2) {
        sheet.getRange(2, 1, 1, lastCol).copyTo(sheet.getRange(newRowNumber, 1, 1, lastCol));
        if (lastCol > 1) sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
    }
    sheet.getRange(newRowNumber, COLS_CONTACTANOS.User_ID, 1, 3).setValues([["N/A", "Contacto de " + name, "De: " + email + "\n\n" + message]]);
    SpreadsheetApp.flush();
    return { status: "success", message: "Formulario de contacto enviado." };
}

// ============================================================================
// HANDLERS FOR INBOX SYSTEM
// ============================================================================

const FEEDBACK_REPORT_TEXT_MAX_LENGTH = 2000;
const SUGGESTION_FIELD_MAX_LENGTHS = Object.freeze({
    tipo: 80, ubicacion: 300, colorCable: 120, configRelay: 120
});

function normalizeFeedbackText_(value, label, maxLength) {
    if (typeof value !== "string") throw new Error(label + " debe enviarse como texto.");
    const normalized = value.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
    if (!normalized) throw new Error(label + " no puede estar vacío.");
    if (normalized.length > maxLength) throw new Error(label + " supera el límite de " + maxLength + " caracteres.");
    return normalized;
}

function normalizeSuggestionTextField_(value, field, maxLength) {
    if (typeof value !== "string") throw new Error("El campo propuesto " + field + " debe ser texto.");
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length > maxLength) throw new Error("El campo propuesto " + field + " supera el límite de " + maxLength + " caracteres.");
    return normalized;
}

function normalizeSuggestionActivaTestigo(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized || ["no aplica", "no_aplica", "no aplica / no especificado", "no aplica/no especificado", "no especificado", "no especificada", "n/a", "na"].includes(normalized)) return null;
    if (["true", "sí", "si", "yes", "x", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
    throw new Error("El valor histórico del testigo no es válido.");
}

function normalizeSuggestionActivaTestigoInput_(value) {
    if (value === true || value === false || value === null) return value;
    throw new Error("El valor propuesto para activaTestigo debe ser true, false o null.");
}

function normalizeSuggestionProposedValues(proposedValues) {
    if (proposedValues !== undefined && proposedValues !== null &&
        (typeof proposedValues !== "object" || Array.isArray(proposedValues))) {
        throw new Error("Los valores propuestos deben enviarse como un objeto.");
    }
    const source = proposedValues || {};
    const allowed = ["tipo", "ubicacion", "colorCable", "configRelay", "activaTestigo"];
    Object.keys(source).forEach(key => {
        if (!allowed.includes(key)) throw new Error("El campo propuesto " + key + " no está permitido.");
    });
    const normalized = {};
    Object.keys(SUGGESTION_FIELD_MAX_LENGTHS).forEach(field => {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            normalized[field] = normalizeSuggestionTextField_(source[field], field, SUGGESTION_FIELD_MAX_LENGTHS[field]);
        }
    });
    if (Object.prototype.hasOwnProperty.call(source, "activaTestigo")) {
        normalized.activaTestigo = normalizeSuggestionActivaTestigoInput_(source.activaTestigo);
    }
    return normalized;
}

function assertMeaningfulSuggestionChanges_(proposedValues, currentValues) {
    const proposed = proposedValues || {};
    const current = currentValues || {};
    const changed = Object.keys(proposed).some(key => {
        if (key === "activaTestigo") return proposed[key] !== current[key];
        return String(proposed[key] == null ? "" : proposed[key]).trim().toLowerCase() !==
            String(current[key] == null ? "" : current[key]).trim().toLowerCase();
    });
    if (!changed) throw new Error("La propuesta no modifica ningún campo del corte. Cambia al menos un valor antes de enviarla.");
    return true;
}
function normalizeStoredSuggestionProposedValues(proposedValues) {
    const source = proposedValues && typeof proposedValues === "object" && !Array.isArray(proposedValues) ? proposedValues : {};
    const normalized = Object.assign({}, source);
    try {
        if (Object.prototype.hasOwnProperty.call(source, "activaTestigo")) normalized.activaTestigo = normalizeSuggestionActivaTestigo(source.activaTestigo);
        else if (Object.prototype.hasOwnProperty.call(source, "activaCheckEngine")) normalized.activaTestigo = normalizeSuggestionActivaTestigo(source.activaCheckEngine);
        else normalized.activaTestigo = null;
    } catch (error) { normalized.activaTestigo = null; }
    delete normalized.activaCheckEngine;
    return normalized;
}
function parseCutSuggestionRecord(rawContent, vehicleId, userName) {
    const content = String(rawContent || "");
    if (!content) return null;
    if (content.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.subType === "suggestion_cut") {
                const parsedVehicleId = String(parsed.vehicleId || vehicleId || "");
                const parsedCorteIndex = Number(parsed.corteIndex);
                if (parsedVehicleId !== String(vehicleId || "") || !Number.isInteger(parsedCorteIndex) || parsedCorteIndex < 1 || parsedCorteIndex > 3) return null;
                return {
                    subType: "suggestion_cut", reportId: String(parsed.reportId || "N/A"),
                    vehicleId: parsedVehicleId, corteIndex: parsedCorteIndex,
                    userId: String(parsed.userId || ""), userName: String(parsed.userName || userName || ""),
                    createdAt: String(parsed.createdAt || ""), imageUrl: String(parsed.imageUrl || ""),
                    details: String(parsed.details || ""),
                    proposedValues: normalizeStoredSuggestionProposedValues(parsed.proposedValues),
                    status: String(parsed.status || "pendiente_revision")
                };
            }
        } catch (error) {}
    }
    if (!content.startsWith("[SUGERENCIA CORTE #")) return null;
    const headerMatch = content.match(/^\[SUGERENCIA CORTE #(\d+)\]\s+\(Reporte Origen: ([^)]+)\)\s+\(Fecha: ([^)]+)\)\s*/);
    const proposedMarker = " | Propuestos: ";
    const proposedMarkerIndex = content.lastIndexOf(proposedMarker);
    if (!headerMatch || proposedMarkerIndex < 0) return null;
    const corteIndex = Number(headerMatch[1]);
    if (!Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) return null;
    const imageMarker = " | Img:";
    const imageMarkerIndex = content.lastIndexOf(imageMarker);
    const proposedEnd = imageMarkerIndex > proposedMarkerIndex ? imageMarkerIndex : content.length;
    let legacyProposedValues;
    try { legacyProposedValues = JSON.parse(content.slice(proposedMarkerIndex + proposedMarker.length, proposedEnd).trim()); }
    catch (error) { return null; }
    if (!legacyProposedValues || typeof legacyProposedValues !== "object" || Array.isArray(legacyProposedValues)) return null;
    return {
        subType: "suggestion_cut", reportId: String(headerMatch[2] || "N/A"),
        vehicleId: String(vehicleId || ""), corteIndex, userId: "", userName: String(userName || ""),
        createdAt: String(headerMatch[3] || ""),
        imageUrl: imageMarkerIndex > proposedMarkerIndex ? content.slice(imageMarkerIndex + imageMarker.length).trim() : "",
        details: content.slice(headerMatch[0].length, proposedMarkerIndex).trim(),
        proposedValues: normalizeStoredSuggestionProposedValues(legacyProposedValues),
        status: "pendiente_revision"
    };
}
function handleGetFeedbackItems(payload) {
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const contactSheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
    const reportMetadataColumn = feedbackSheet ? getReportMetadataColumn(feedbackSheet) : 0;

    const feedbackData = (!feedbackSheet) ? [] : feedbackSheet.getDataRange().getValues().slice(1).map(row => {
        const rawContent = row[COLS_FEEDBACKS.Problema - 1];
        const rowVehicleId = row[COLS_FEEDBACKS.ID_vehiculo - 1];
        const rowUserName = row[COLS_FEEDBACKS.Usuario - 1];
        const reportMetadata = reportMetadataColumn
            ? parseReportMetadata(row[reportMetadataColumn - 1], rowVehicleId)
            : null;
        let videoMeta = null;
        if (typeof rawContent === 'string' && rawContent.trim().startsWith('{')) {
            try { videoMeta = JSON.parse(rawContent); } catch (e) {}
        }
        const isVideoApproval = videoMeta && videoMeta.subType === 'video_approval';
        if (isVideoApproval) {
            return {
                type: 'video_approval', id: row[COLS_FEEDBACKS.ID - 1],
                subject: `[Aprobación de Vídeo] ${videoMeta.title}`,
                content: videoMeta.description || 'Sin descripción',
                videoUrl: videoMeta.videoUrl, videoId: videoMeta.videoId, contentType: videoMeta.contentType,
                user: rowUserName, vehicleId: rowVehicleId,
                approvalStatus: videoMeta.status || 'pending', videoMeta,
                reply: row[COLS_FEEDBACKS.Respuesta - 1],
                isResolved: row[COLS_FEEDBACKS['Se resolvio'] - 1] === true,
                responder: row[COLS_FEEDBACKS.Responde - 1]
            };
        }
        const suggestionData = parseCutSuggestionRecord(rawContent, rowVehicleId, rowUserName);
        const isResolved = row[COLS_FEEDBACKS['Se resolvio'] - 1] === true;
        if (suggestionData) suggestionData.status = isResolved ? "resuelta" : "pendiente_revision";
        return {
            type: 'problem_report', id: row[COLS_FEEDBACKS.ID - 1],
            subject: suggestionData ? `Sugerencia de cambio — Corte #${suggestionData.corteIndex}` : `Reporte en Vehículo #${rowVehicleId}`,
            content: suggestionData ? (suggestionData.details || 'Sugerencia de cambio de corte.') : rawContent,
            user: rowUserName, vehicleId: rowVehicleId, reportMetadata, suggestionData,
            reply: row[COLS_FEEDBACKS.Respuesta - 1], isResolved,
            responder: row[COLS_FEEDBACKS.Responde - 1]
        };
    });

    const contactData = (!contactSheet) ? [] : contactSheet.getDataRange().getValues().slice(1).map(row => ({
        type: 'contact_form',
        id: row[COLS_CONTACTANOS.Contacto_ID - 1],
        subject: row[COLS_CONTACTANOS.Asunto - 1],
        content: row[COLS_CONTACTANOS.Mensaje - 1],
        user: 'Formulario de Contacto',
        vehicleId: null,
        reply: row[COLS_CONTACTANOS.Respuesta_mensaje - 1],
        isResolved: null,
        responder: row[COLS_CONTACTANOS.ID_usuario_responde - 1]
    }));

    const unifiedData = [...feedbackData, ...contactData];
    return { status: 'success', data: unifiedData };
}

function handleReplyToFeedback(payload) {
    const { itemId, itemType, replyText, responderName } = payload;
    if (!itemId || !itemType || !replyText || !responderName) {
        throw new Error("Datos insuficientes para enviar la respuesta.");
    }

    if (itemType === 'problem_report') {
        const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        const ids = sheet.getRange(2, COLS_FEEDBACKS.ID, sheet.getLastRow() -1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == itemId);
        if (rowIndex !== -1) {
            sheet.getRange(rowIndex + 2, COLS_FEEDBACKS.Respuesta).setValue(replyText);
            sheet.getRange(rowIndex + 2, COLS_FEEDBACKS.Responde).setValue(responderName);
        } else {
            throw new Error("No se encontró el reporte de problema.");
        }
    } else if (itemType === 'contact_form') {
        const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
        const ids = sheet.getRange(2, COLS_CONTACTANOS.Contacto_ID, sheet.getLastRow() - 1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == itemId);
        if (rowIndex !== -1) {
            sheet.getRange(rowIndex + 2, COLS_CONTACTANOS.Respuesta_mensaje).setValue(replyText);
            sheet.getRange(rowIndex + 2, COLS_CONTACTANOS.ID_usuario_responde).setValue(responderName);
        } else {
            throw new Error("No se encontró el mensaje de contacto.");
        }
    }

    return { status: 'success', message: 'Respuesta enviada.' };
}

function handleMarkAsResolved(payload) {
    const { itemId } = payload;
    if (!itemId) throw new Error("ID del item es requerido.");

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const ids = sheet.getRange(2, COLS_FEEDBACKS.ID, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.findIndex(id => id == itemId);

    if (rowIndex !== -1) {
        sheet.getRange(rowIndex + 2, COLS_FEEDBACKS['Se resolvio']).setValue(true);
    } else {
        throw new Error("No se encontró el reporte de problema para marcar como resuelto.");
    }

    return { status: 'success', message: 'Reporte marcado como resuelto.' };
}

function handleGetActivityLogs(payload) {
    const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
    if (!sheet) return { status: 'success', data: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    data.shift(); // Remove headers

    // Reverse and take last 100 logs
    const logs = data.map(row => ({
        id: row[COLS_ACTIVIDAD_USUARIO.id - 1],
        timestamp: row[COLS_ACTIVIDAD_USUARIO.timestamp - 1],
        idUsuario: row[COLS_ACTIVIDAD_USUARIO.idUsuario - 1],
        nombreUsuario: row[COLS_ACTIVIDAD_USUARIO.nombreUsuario - 1],
        tipoActividad: row[COLS_ACTIVIDAD_USUARIO.tipoActividad - 1],
        idElementoAsociado: row[COLS_ACTIVIDAD_USUARIO.idElementoAsociado - 1],
        detalle: row[COLS_ACTIVIDAD_USUARIO.detalle - 1]
    })).reverse().slice(0, 100);

    return { status: 'success', data: logs };
}


/* TAREA 9 (2.3): ALMACENAMIENTO Y GESTIÓN INDEPENDIENTE DE SUGERENCIAS EN FEEDBACKS */
function buildCutSuggestionRequestFingerprint_(request) {
    const source = JSON.stringify({
        reportId: String(request.reportId || ""),
        vehicleId: String(request.vehicleId || ""),
        corteIndex: Number(request.corteIndex),
        userId: String(request.userId || ""),
        details: String(request.details || ""),
        proposedValues: request.proposedValues || {},
        imageSha256: String(request.imageSha256 || "")
    });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source);
    return Array.from(digest).map(value => (value & 255).toString(16).padStart(2, "0")).join("");
}

// Solo para reconocer registros creados antes de AUG-080; no se usa en operaciones nuevas.
function buildLegacyCutSuggestionRequestFingerprint_(details, proposedValues, imageDataUrl) {
    const source = JSON.stringify({
        details: String(details || ""),
        proposedValues: proposedValues || {},
        image: String(imageDataUrl || "")
    });
    let hashA = 2166136261, hashB = 2246822519;
    for (let i = 0; i < source.length; i++) {
        const code = source.charCodeAt(i);
        hashA = Math.imul(hashA ^ code, 16777619) >>> 0;
        hashB = Math.imul(hashB ^ (code + i), 3266489917) >>> 0;
    }
    return source.length + ":" + hashA.toString(16) + ":" + hashB.toString(16);
}

function findCutSuggestionByOperation_(sheet, operationId) {
    const id = String(operationId || "").trim();
    if (!sheet || !id || sheet.getLastRow() < 2) return null;
    const rows = sheet.getDataRange().getValues();
    const matches = [];
    rows.slice(1).forEach((row, index) => {
        const raw = String(row[COLS_FEEDBACKS.Problema - 1] || "");
        if (!raw) return;
        let record;
        try { record = JSON.parse(raw); }
        catch (error) {
            if (raw.includes('"suggestionOperationId":"' + id + '"')) {
                throw new Error("La operación de sugerencia existe en un registro incompleto; requiere revisión antes de reintentar.");
            }
            return;
        }
        if (record && record.subType === "suggestion_cut" &&
            String(record.suggestionOperationId || "") === id) {
            matches.push({ rowNumber: index + 2, record: record });
        }
    });
    if (matches.length > 1) throw new Error("El identificador de operación aparece duplicado en Feedbacks; requiere revisión.");
    return matches.length ? matches[0] : null;
}

function buildCutSuggestionReplayResponse_(existing, reportId) {
    return {
        status: "success",
        message: "La sugerencia ya estaba registrada; se devolvió el registro existente.",
        reportId: reportId,
        alreadySuggested: true,
        alreadyProcessed: true,
        suggestionOperationId: String(existing.record.suggestionOperationId || ""),
        imageAttached: Boolean(existing.record.imageUrl),
        imageUrl: String(existing.record.imageUrl || ""),
        suggestionData: existing.record
    };
}

function findCutSuggestionByRequest_(sheet, reportId, vehicleId, corteIndex, userId) {
    if (!sheet || sheet.getLastRow() < 2 || reportId === "N/A") return null;
    const rows = sheet.getDataRange().getValues();
    const matches = [];
    rows.slice(1).forEach((row, index) => {
        const raw = String(row[COLS_FEEDBACKS.Problema - 1] || "");
        if (!raw.trim().startsWith("{")) return;
        let record;
        try { record = JSON.parse(raw); } catch (error) { return; }
        if (!record || record.subType !== "suggestion_cut") return;
        if (String(record.reportId || "N/A") === reportId &&
            String(record.vehicleId || "").trim() === vehicleId &&
            Number(record.corteIndex) === corteIndex &&
            String(record.userId || "") === userId) {
            matches.push({ rowNumber: index + 2, record: record });
        }
    });
    if (matches.length > 1) throw new Error("La sugerencia asociada al reporte ya aparece duplicada; se conserva el estado para revisión.");
    return matches.length ? matches[0] : null;
}


function validateCutSuggestionReportContext_(reportId, vehicleId, corteIndex) {
    const normalizedReportId = String(reportId || "").trim();
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedCorteIndex = Number(corteIndex);
    if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(normalizedReportId)) {
        throw new Error("Se requiere el identificador real del reporte individual.");
    }
    if (!normalizedVehicleId || !Number.isInteger(normalizedCorteIndex) ||
        normalizedCorteIndex < 1 || normalizedCorteIndex > 3) {
        throw new Error("El vehículo o el número de corte no son válidos.");
    }

    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada.");
    const metadataColumn = getReportMetadataColumn(feedbackSheet);
    if (!metadataColumn) throw new Error("El reporte no tiene metadata verificable; no se aceptan sugerencias sin asociación real.");
    const report = findReportByReportId_(feedbackSheet, normalizedReportId, metadataColumn);
    if (!report) throw new Error("No existe un reporte individual único con ese identificador.");
    const metadata = report.metadata || {};
    const rowVehicleId = String(report.row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
    if (String(metadata.reportId || "").trim() !== normalizedReportId ||
        String(metadata.vehicleId || "").trim() !== normalizedVehicleId ||
        rowVehicleId !== normalizedVehicleId ||
        Number(metadata.corteIndex) !== normalizedCorteIndex) {
        throw new Error("El reporte no corresponde al mismo vehículo y corte indicado en la sugerencia.");
    }

    const cutsSheet = getSafeSheet(SHEET_NAMES.CORTES);
    if (!cutsSheet) throw new Error("Hoja Cortes no encontrada.");
    const rows = cutsSheet.getDataRange().getValues();
    const vehicles = [];
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) {
            vehicles.push({ row: rows[i], rowIndex: i + 1 });
        }
    }
    if (vehicles.length !== 1) {
        throw new Error(vehicles.length ? "El vehículo tiene un ID duplicado en el catálogo." : "El vehículo no existe en el catálogo.");
    }
    const vehicle = vehicles[0].row;
    const typeColumn = COLS_CORTES["tipoCorte" + normalizedCorteIndex];
    const locationColumn = COLS_CORTES["ubicacionCorte" + normalizedCorteIndex];
    if (!typeColumn || !locationColumn ||
        !String(vehicle[typeColumn - 1] || "").trim() ||
        !String(vehicle[locationColumn - 1] || "").trim()) {
        throw new Error("El corte indicado no está ocupado e identificado en el catálogo del vehículo.");
    }
    const currentValues = {
        tipo: String(vehicle[typeColumn - 1] || "").trim(),
        ubicacion: String(vehicle[locationColumn - 1] || "").trim(),
        colorCable: String(vehicle[COLS_CORTES["colorCableCorte" + normalizedCorteIndex] - 1] || "").trim(),
        configRelay: String(vehicle[COLS_CORTES["configRelay" + normalizedCorteIndex] - 1] || "").trim(),
        activaTestigo: typeof metadata.activaTestigoMotor === "boolean" ? metadata.activaTestigoMotor : null
    };
    return { reportId: normalizedReportId, vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex, currentValues };
}

function normalizeSuggestionImageAttachment_(imageAttachment, legacyImgBase64) {
    if (imageAttachment != null && legacyImgBase64) throw new Error("Envía la imagen de sugerencia en un solo campo.");
    let source = imageAttachment;
    if (source == null && legacyImgBase64) {
        const dataUrl = String(legacyImgBase64).trim();
        const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
        if (!match) throw new Error("La imagen de sugerencia tiene un formato no permitido.");
        const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
        if (encoded.length > Math.ceil(REPORT_IMAGE_MAX_BYTES / 3) * 4) {
            throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
        }
        let bytes;
        try { bytes = Utilities.base64Decode(encoded); }
        catch (error) { throw new Error("No se pudo decodificar la imagen de sugerencia."); }
        source = { dataUrl, mimeType: match[1].toLowerCase(), size: bytes.length, name: "sugerencia" };
    }
    return source == null ? null : validateReportImageAttachment_(source);
}
function saveSuggestionImageAttachment_(image, vehicleId, corteIndex) {
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[image.mimeType];
    if (!extension) throw new Error("El formato de imagen de sugerencia no está permitido.");
    const baseName = image.name.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "sugerencia";
    const fileName = "sug_" + String(vehicleId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) +
        "_corte" + String(corteIndex) + "_" + Date.now() + "_" + baseName + "." + extension;
    const folder = findOrCreateSubFolder(getCortesRootFolder(), "SugerenciasCortes");
    let file = null;
    try {
        file = folder.createFile(Utilities.newBlob(image.bytes, image.mimeType, fileName));
        if (!file) throw new Error("Drive no confirmó la creación de la imagen de sugerencia.");
        if (typeof file.getSharingAccess !== "function") throw new Error("No se pudo verificar el acceso heredado de la imagen de sugerencia.");
        const access = file.getSharingAccess();
        const publicAccess = [DriveApp.Access.ANYONE, DriveApp.Access.ANYONE_WITH_LINK].filter(value => value !== undefined && value !== null);
        if (!access || publicAccess.includes(access)) throw new Error("La carpeta de sugerencias permite acceso público; se rechazó la carga.");
        const imageFileId = String(file.getId() || "").trim();
        if (!/^[A-Za-z0-9_-]{10,}$/.test(imageFileId)) throw new Error("Drive no devolvió un identificador válido para la imagen de sugerencia.");
        return { file, metadata: {
            imageFileId, imageUrl: "https://drive.google.com/file/d/" + imageFileId + "/view",
            imageName: image.name, imageMimeType: image.mimeType, imageSize: image.size, imageSha256: image.sha256
        }};
    } catch (error) {
        if (file) {
            try { file.setTrashed(true); }
            catch (cleanupError) { console.error("No se pudo retirar una imagen de sugerencia sin acceso verificable:", cleanupError); }
        }
        throw error;
    }
}
function handleSuggestCutChange(payload) {
    const { reportId, vehicleId, corteIndex, userId, userName, details, imgBase64, imageAttachment, proposedValues, suggestionOperationId } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedCorteIndex = Number(corteIndex);
    if (!normalizedVehicleId || !userId || !userName || !Number.isInteger(normalizedCorteIndex) ||
        normalizedCorteIndex < 1 || normalizedCorteIndex > 3) {
        throw new Error("Faltan datos válidos para sugerir cambio (vehicleId, corteIndex 1–3, userId, userName).");
    }
    const normalizedOperationId = String(suggestionOperationId || "").trim();
    if (normalizedOperationId && !/^[A-Za-z0-9_-]{20,80}$/.test(normalizedOperationId)) {
        throw new Error("Identificador de operación de sugerencia inválido.");
    }
    const normalizedProposedValues = normalizeSuggestionProposedValues(proposedValues);
    const normalizedDetails = normalizeFeedbackText_(details, "La justificación de la sugerencia", FEEDBACK_REPORT_TEXT_MAX_LENGTH);
    const reportContext = validateCutSuggestionReportContext_(reportId, normalizedVehicleId, normalizedCorteIndex);
    assertMeaningfulSuggestionChanges_(normalizedProposedValues, reportContext.currentValues);
    const normalizedImage = normalizeSuggestionImageAttachment_(imageAttachment, imgBase64);
    const normalizedReportId = reportContext.reportId;
    const normalizedUserId = String(userId);
    const legacyImageDataUrl = normalizedImage
        ? String(imageAttachment != null ? imageAttachment.dataUrl || "" : imgBase64 || "") : "";
    const requestFingerprint = buildCutSuggestionRequestFingerprint_({
        reportId: normalizedReportId, vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex,
        userId: normalizedUserId, details: normalizedDetails, proposedValues: normalizedProposedValues,
        imageSha256: normalizedImage ? normalizedImage.sha256 : ""
    });
    const legacyRequestFingerprint = buildLegacyCutSuggestionRequestFingerprint_(
        normalizedDetails, normalizedProposedValues, legacyImageDataUrl
    );
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let uploadedImage = null, pendingSheet = null, pendingRowNumber = 0, rowCommitted = false, result = null;
    try {
        const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
        pendingSheet = sheet;
        const existingByOperation = normalizedOperationId
            ? findCutSuggestionByOperation_(sheet, normalizedOperationId) : null;
        if (existingByOperation) {
            const record = existingByOperation.record;
            const sameOperation = String(record.reportId || "") === normalizedReportId &&
                String(record.vehicleId || "").trim() === normalizedVehicleId &&
                Number(record.corteIndex) === normalizedCorteIndex &&
                String(record.userId || "") === normalizedUserId &&
                String(record.requestFingerprint || "") === requestFingerprint;
            if (!sameOperation) throw new Error("El identificador de operación ya pertenece a una solicitud distinta; no se creó otra sugerencia.");
            return buildCutSuggestionReplayResponse_(existingByOperation, normalizedReportId);
        }
        // Compatibilidad con clientes anteriores y formularios reabiertos después de perder la respuesta.
        const existingByRequest = findCutSuggestionByRequest_(sheet, normalizedReportId, normalizedVehicleId, normalizedCorteIndex, normalizedUserId);
        if (existingByRequest) {
            const storedFingerprint = String(existingByRequest.record.requestFingerprint || "");
            if (storedFingerprint !== requestFingerprint && storedFingerprint !== legacyRequestFingerprint) {
                throw new Error("El reporte ya tiene una sugerencia con datos distintos; no se creó otra sugerencia.");
            }
            return buildCutSuggestionReplayResponse_(existingByRequest, normalizedReportId);
        }
        const createdAt = new Date().toISOString();
        const lastRow = sheet.getLastRow(), newRowNumber = lastRow + 1;
        pendingRowNumber = newRowNumber;
        const FORMULA_ROW = 2, lastCol = sheet.getLastColumn() || 8;
        if (lastRow >= FORMULA_ROW) {
            sheet.getRange(FORMULA_ROW, 1, 1, lastCol).copyTo(sheet.getRange(newRowNumber, 1, 1, lastCol));
            if (lastCol > 1) sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
        if (normalizedImage) uploadedImage = saveSuggestionImageAttachment_(normalizedImage, normalizedVehicleId, normalizedCorteIndex);
        const imageMetadata = uploadedImage ? uploadedImage.metadata : null;
        const suggestionRecord = {
            subType: "suggestion_cut", schemaVersion: 3,
            suggestionOperationId: normalizedOperationId || "",
            reportId: normalizedReportId,
            vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex, userId: normalizedUserId,
            userName: String(userName), createdAt, imageUrl: imageMetadata ? imageMetadata.imageUrl : "",
            imageFileId: imageMetadata ? imageMetadata.imageFileId : "", imageName: imageMetadata ? imageMetadata.imageName : "",
            imageMimeType: imageMetadata ? imageMetadata.imageMimeType : "", imageSize: imageMetadata ? imageMetadata.imageSize : 0,
            imageSha256: imageMetadata ? imageMetadata.imageSha256 : "", details: normalizedDetails,
            proposedValues: normalizedProposedValues, requestFingerprint, status: "pendiente_revision"
        };
        const problemDesc = JSON.stringify(suggestionRecord);
        sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario, 1, 3).setValues([[String(userName), normalizedVehicleId, problemDesc]]);
        if (COLS_FEEDBACKS["Se resolvio"]) sheet.getRange(newRowNumber, COLS_FEEDBACKS["Se resolvio"]).setValue(false);
        SpreadsheetApp.flush();
        const storedProblem = sheet.getRange(newRowNumber, COLS_FEEDBACKS.Problema).getValue();
        if (String(storedProblem || "") !== problemDesc) throw new Error("No se pudo confirmar la escritura de la sugerencia; la imagen no quedará asociada.");
        rowCommitted = true;
        result = {
            status: "success", message: "Sugerencia de cambio registrada correctamente como propuesta independiente.",
            reportId: normalizedReportId, suggestionOperationId: normalizedOperationId,
            imageAttached: Boolean(imageMetadata),
            imageUrl: imageMetadata ? imageMetadata.imageUrl : "", suggestionData: suggestionRecord
        };
        uploadedImage = null;
    } catch (error) {
        let rollbackConfirmed = false;
        if (!rowCommitted && pendingSheet && pendingRowNumber) {
            try {
                const pendingRange = pendingSheet.getRange(pendingRowNumber, COLS_FEEDBACKS.Usuario, 1, 3);
                pendingRange.clearContent();
                if (COLS_FEEDBACKS["Se resolvio"]) pendingSheet.getRange(pendingRowNumber, COLS_FEEDBACKS["Se resolvio"]).clearContent();
                SpreadsheetApp.flush();
                const cleared = pendingRange.getValues()[0].every(value => value === "" || value === null);
                const statusCleared = !COLS_FEEDBACKS["Se resolvio"] ||
                    pendingSheet.getRange(pendingRowNumber, COLS_FEEDBACKS["Se resolvio"]).getValue() === "";
                rollbackConfirmed = cleared && statusCleared;
                if (!rollbackConfirmed) console.error("La reversión de la fila de sugerencia no pudo confirmarse; se conserva la imagen para evitar romper una referencia persistida.");
            } catch (rollbackError) {
                console.error("No se pudo confirmar la reversión de la fila de sugerencia:", rollbackError);
            }
        }
        if (!rowCommitted && uploadedImage && rollbackConfirmed) trashReportImageUpload_(uploadedImage);
        else if (!rowCommitted && uploadedImage && !rollbackConfirmed) {
            console.error("La imagen de sugerencia se conserva para reconciliación porque el estado de la fila no pudo verificarse.");
        }
        throw error;
    } finally { lock.releaseLock(); }
    logUserActivity(userId, userName, "suggest_cut_change", normalizedVehicleId, JSON.stringify(result.suggestionData));
    return result;
}

function parseModelosAsociados(rawVal) {
    if (rawVal === null || rawVal === undefined) return [];
    if (Array.isArray(rawVal)) return normalizeModelosAsociadosList_(rawVal);
    if (typeof rawVal !== "string" && typeof rawVal !== "number") {
        throw new Error("modelos_asociados tiene un formato incompatible.");
    }
    const str = String(rawVal).trim();
    if (!str) return [];
    if (str.startsWith("[") || str.endsWith("]")) {
        let parsed;
        try {
            parsed = JSON.parse(str);
        } catch (error) {
            throw new Error("modelos_asociados contiene una lista JSON inválida.");
        }
        if (!Array.isArray(parsed)) throw new Error("modelos_asociados debe contener una lista JSON.");
        return normalizeModelosAsociadosList_(parsed);
    }
    return normalizeModelosAsociadosList_(str.split(/[,/\\;]+/));
}

function normalizeModelosAsociadosList_(values) {
    if (!Array.isArray(values)) throw new Error("modelos_asociados debe ser una lista.");
    const normalized = [];
    const seen = new Set();
    values.forEach(value => {
        if (value === null || value === undefined) return;
        if (typeof value !== "string" && typeof value !== "number") {
            throw new Error("modelos_asociados contiene un identificador inválido.");
        }
        const id = String(value).trim();
        if (!id) return;
        if (id.length > 100 || /[,/\\;\[\]"'\u0000-\u001F\u007F]/.test(id)) {
            throw new Error("modelos_asociados contiene un identificador con formato inválido.");
        }
        if (!seen.has(id)) {
            seen.add(id);
            normalized.push(id);
        }
    });
    return normalized;
}

const PYS_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const PYS_IMAGE_EXTENSIONS = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
});

function validatePysImageDataUrl_(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("La imagen del problema es obligatoria y debe enviarse como Data URL.");
    const match = value.trim().match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match) throw new Error("La imagen debe ser JPEG, PNG o WebP codificada en Base64.");
    const mimeType = match[1].toLowerCase();
    const base64 = match[2];
    if (!Object.prototype.hasOwnProperty.call(PYS_IMAGE_EXTENSIONS, mimeType)) {
        throw new Error("El formato de imagen no está permitido.");
    }
    if (base64.length > Math.ceil(PYS_IMAGE_MAX_BYTES / 3) * 4) {
        throw new Error("La imagen supera el tamaño máximo permitido de 3 MB.");
    }

    let bytes;
    try {
        bytes = Utilities.base64Decode(base64);
    } catch (error) {
        throw new Error("No se pudo decodificar la imagen del problema.");
    }
    if (!bytes || !bytes.length || bytes.length > PYS_IMAGE_MAX_BYTES) {
        throw new Error("La imagen está vacía o supera el tamaño máximo permitido de 3 MB.");
    }
    if (Utilities.base64Encode(bytes) !== base64) {
        throw new Error("La codificación Base64 de la imagen no es válida o canónica.");
    }

    const byteAt = index => Number(bytes[index]) & 255;
    const signatureValid =
        (mimeType === "image/jpeg" && bytes.length >= 3 &&
            byteAt(0) === 0xff && byteAt(1) === 0xd8 && byteAt(2) === 0xff) ||
        (mimeType === "image/png" && bytes.length >= 8 &&
            [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => byteAt(index) === value)) ||
        (mimeType === "image/webp" && bytes.length >= 12 &&
            String.fromCharCode(byteAt(0), byteAt(1), byteAt(2), byteAt(3)) === "RIFF" &&
            String.fromCharCode(byteAt(8), byteAt(9), byteAt(10), byteAt(11)) === "WEBP");
    if (!signatureValid) {
        throw new Error("La firma binaria de la imagen no coincide con el tipo MIME declarado.");
    }

    return { bytes, mimeType, extension: PYS_IMAGE_EXTENSIONS[mimeType], sizeBytes: bytes.length };
}

function getPysImagesFolder_() {
    const rootFolder = getCortesRootFolder();
    const folder = findOrCreateSubFolder(rootFolder, "Problemas y Soluciones");
    if (!folder || String(folder.getId()) === String(rootFolder.getId()) ||
        getFolderCanonicalName(folder.getName()) !== getFolderCanonicalName("Problemas y Soluciones")) {
        throw new Error("No se pudo verificar la carpeta PyS dentro de la raíz autorizada de GPSpedia.");
    }

    const parents = folder.getParents();
    let isDirectChild = false;
    while (parents.hasNext()) {
        if (String(parents.next().getId()) === String(rootFolder.getId())) isDirectChild = true;
    }
    if (!isDirectChild) throw new Error("La carpeta PyS no pertenece directamente a la raíz autorizada de GPSpedia.");
    return { folder, rootFolder };
}

function assertPysImageFolderPermissions_(file, folder) {
    if (!file || !folder || typeof file.getSharingAccess !== "function" ||
        typeof folder.getSharingAccess !== "function" ||
        typeof file.getSharingPermission !== "function" ||
        typeof folder.getSharingPermission !== "function") {
        throw new Error("No se pudieron verificar los permisos heredados de la carpeta PyS.");
    }
    const folderAccess = String(folder.getSharingAccess());
    const fileAccess = String(file.getSharingAccess());
    const folderPermission = String(folder.getSharingPermission());
    const filePermission = String(file.getSharingPermission());
    if (fileAccess !== folderAccess || filePermission !== folderPermission) {
        throw new Error("El archivo PyS no conserva la política de acceso heredada de su carpeta.");
    }
}

function normalizePysImageReference_(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let id = "";

    if (/^[A-Za-z0-9_-]{10,110}$/.test(raw)) {
        id = raw;
    } else {
        let match = raw.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,110})(?:\/view)?(?:[?#].*)?$/i);
        if (!match) match = raw.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,110})(?:&[^#]*)?(?:#.*)?$/i);
        if (!match) match = raw.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,110})(?:=[^\s]*)?$/i);
        if (match) id = match[1];
        else if (/drive\.google\.com|googleusercontent\.com/i.test(raw)) return "";
        else if (/^https:\/\//i.test(raw)) return raw; // Compatibilidad con referencias HTTPS históricas ajenas a Drive.
        else return "";
    }

    return id ? "https://drive.google.com/file/d/" + id + "/view" : "";
}

function findPysImageReferences_(sheet, imageFileId, imageUrl) {
    if (!sheet) throw new Error("No se pudo comprobar la hoja PyS para recuperar la imagen.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(7, sheet.getLastColumn())).getDisplayValues();
    const matches = [];
    values.forEach((row, index) => {
        const storedUrl = String(row[6] || "").trim();
        const normalizedUrl = normalizePysImageReference_(storedUrl);
        const storedIds = extractDriveFileIds(storedUrl);
        if ((imageUrl && normalizedUrl === imageUrl) || (imageFileId && storedIds.includes(String(imageFileId)))) {
            matches.push({ rowNumber: index + 2, problemId: String(row[0] || "").trim(), imageUrl: storedUrl });
        }
    });
    return matches;
}

function markPysImageForRecovery_(file, problemId, imageFileId, reason) {
    if (!file) return;
    const description = [
        "GPSpedia PyS — RECOVERY_REQUIRED",
        "problemId=" + String(problemId || ""),
        "fileId=" + String(imageFileId || ""),
        "reason=" + String(reason || "No se pudo confirmar la vinculación ni la compensación.").slice(0, 500),
        "updatedAt=" + new Date().toISOString()
    ].join("\n");
    try { file.setDescription(description); }
    catch (error) { console.error("No se pudo registrar metadata de recuperación para la imagen PyS:", error); }
}


const PYS_HEADERS=Object.freeze(["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"]);
const PYS_OPERATIONS_HEADERS=Object.freeze(["opId","payloadHash","problemId","status","imageFileId","imageUrl","createdAt","updatedAt"]);
const PYS_OPERATION_STATES=Object.freeze(["PENDING","UPLOAD_PENDING","LINKED","RECOVERY_REQUIRED"]);
function validatePysHeaders_(sheet,expected,label){if(sheet.getLastColumn()>expected.length)throw new Error("El esquema de "+label+" contiene columnas adicionales; no se modificó la hoja.");const a=sheet.getRange(1,1,1,expected.length).getDisplayValues()[0];if(expected.some((v,i)=>String(a[i]==null?"":a[i])!==v))throw new Error("Los encabezados/orden de "+label+" no coinciden con el esquema autorizado; no se modificó la hoja.");}
function validatePysRecords_(sheet){const last=sheet.getLastRow(),seen=Object.create(null);let max=0;if(last<2)return{maxSuffix:0,ids:seen};sheet.getRange(2,1,last-1,10).getValues().forEach((r,i)=>{if(!r.some(v=>v!==""&&v!==null&&v!==undefined))return;const id=String(r[0]==null?"":r[0]).trim(),m=id.match(/^isue-(\d+)$/i);if(!m)throw new Error("La fila "+(i+2)+" de pys contiene un ID vacío o malformado; no se creó el problema.");const n=Number(m[1]),k=String(n);if(!Number.isSafeInteger(n)||n<1)throw new Error("La fila "+(i+2)+" de pys contiene un sufijo de ID inválido.");if(seen[k])throw new Error("La hoja pys contiene IDs duplicados; no se creó el problema.");seen[k]=true;max=Math.max(max,n);});return{maxSuffix:max,ids:seen};}
function getPysSheet_(createIfMissing){let sheet=getSafeSheet("pys");if(!sheet){if(!createIfMissing)return null;sheet=getSpreadsheet().insertSheet("pys");}if(sheet.getLastRow()===0&&sheet.getLastColumn()===0){if(!createIfMissing)return sheet;sheet.getRange(1,1,1,10).setValues([PYS_HEADERS.slice()]);SpreadsheetApp.flush();}validatePysHeaders_(sheet,PYS_HEADERS,"pys");validatePysRecords_(sheet);return sheet;}
function readPysOperations_(sheet){const last=sheet.getLastRow();if(last<2)return[];const so=Object.create(null),si=Object.create(null);return sheet.getRange(2,1,last-1,8).getValues().map((r,i)=>{if(!r.some(v=>v!==""&&v!==null&&v!==undefined))return null;const opId=String(r[0]||"").trim(),hash=String(r[1]||"").trim().toLowerCase(),problemId=String(r[2]||"").trim(),status=String(r[3]||"").trim(),imageFileId=String(r[4]||"").trim(),imageUrl=String(r[5]||"").trim(),match=problemId.match(/^isue-(\d+)$/i),suffix=match?Number(match[1]):NaN,problemKey=String(suffix);if(!/^[A-Za-z0-9_-]{20,80}$/.test(opId)||!/^[a-f0-9]{64}$/.test(hash)||!match||!Number.isSafeInteger(suffix)||suffix<1||!PYS_OPERATION_STATES.includes(status))throw new Error("La hoja PysOperations contiene una fila incompatible; no se modificó.");if((status==="PENDING"&&(imageFileId||imageUrl))||(["UPLOAD_PENDING","LINKED"].includes(status)&&(!/^[A-Za-z0-9_-]{10,110}$/.test(imageFileId)||imageUrl!=="https://drive.google.com/file/d/"+imageFileId+"/view"))||(Boolean(imageFileId)!==Boolean(imageUrl)))throw new Error("La hoja PysOperations contiene referencias de imagen incompatibles con su estado.");if(so[opId]||si[problemKey])throw new Error("La hoja PysOperations contiene identificadores duplicados; no se modificó.");so[opId]=true;si[problemKey]=true;return{rowNumber:i+2,opId,payloadHash:hash,problemId,status,imageFileId,imageUrl,createdAt:String(r[6]||""),updatedAt:String(r[7]||"")};}).filter(Boolean);}
function getPysOperationsSheet_(){let sheet=getSafeSheet("PysOperations");if(!sheet)sheet=getSpreadsheet().insertSheet("PysOperations");if(sheet.getLastRow()===0&&sheet.getLastColumn()===0){sheet.getRange(1,1,1,8).setValues([PYS_OPERATIONS_HEADERS.slice()]);SpreadsheetApp.flush();}validatePysHeaders_(sheet,PYS_OPERATIONS_HEADERS,"PysOperations");readPysOperations_(sheet);return sheet;}
function writePysOperation_(sheet,rowNumber,r){const values=[[r.opId,r.payloadHash,r.problemId,r.status,r.imageFileId||"",r.imageUrl||"",r.createdAt,r.updatedAt]],target=rowNumber||(sheet.getLastRow()+1);sheet.getRange(target,1,1,8).setValues(values);SpreadsheetApp.flush();const stored=sheet.getRange(target,1,1,8).getValues()[0];if(values[0].some((v,i)=>String(v==null?"":v)!==String(stored[i]==null?"":stored[i])))throw new Error("No se pudo confirmar el registro de idempotencia PyS.");return Object.assign({},r,{rowNumber:target});}
function findPysRowsById_(sheet,id){const last=sheet.getLastRow();if(last<2)return[];const target=String(id||"").trim().toLowerCase();return sheet.getRange(2,1,last-1,10).getValues().map((row,i)=>({rowNumber:i+2,row})).filter(x=>String(x.row[0]||"").trim().toLowerCase()===target);}
function getPysNextId_(sheet,ops){let max=validatePysRecords_(sheet).maxSuffix;ops.forEach(o=>{const m=o.problemId.match(/^isue-(\d+)$/i),n=m?Number(m[1]):NaN;if(!Number.isSafeInteger(n)||n<1)throw new Error("La hoja PysOperations contiene un problemId inválido.");max=Math.max(max,n);});if(max>=Number.MAX_SAFE_INTEGER)throw new Error("Se agotó la secuencia segura de identificadores PyS.");return"isue-"+String(max+1).padStart(3,"0");}
function getPysSha256_(v){return Array.from(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,v)).map(b=>(b&255).toString(16).padStart(2,"0")).join("");}
function buildPysPayloadHash_(p,image,models){return getPysSha256_(JSON.stringify({titulo:p.titulo,descripcion:p.descripcion,sinSolucion:Boolean(p.sinSolucion),solucion:p.solucion,prevenir:p.prevenir,userId:String(p.userId).trim(),userName:String(p.userName).trim(),alcance:p.alcance==="especifico"?"especifico":"general",modelosAsociados:models,imageMimeType:image.mimeType,imageSha256:getPysSha256_(image.bytes)}));}
function buildPysExpectedRow_(id,p,url,models){return[id,p.titulo,p.descripcion,p.sinSolucion?"":"x",p.sinSolucion?"":p.solucion,p.prevenir,url,"",p.userName,models.length?JSON.stringify(models):""];}
function pysRowMatchesPayload_(row,expected){return expected.every((v,i)=>String(row[i]==null?"":row[i])===String(v));}
function verifyPendingPysImageFile_(r,image,folder){const file=DriveApp.getFileById(r.imageFileId);if(!file||(typeof file.isTrashed==="function"&&file.isTrashed()===true)||String(file.getMimeType())!==image.mimeType||Number(file.getSize())!==image.sizeBytes||r.imageUrl!=="https://drive.google.com/file/d/"+r.imageFileId+"/view")throw new Error("La imagen pendiente de la operación PyS no coincide con el contenido recibido; requiere revisión.");const d=String(file.getDescription()||"");if(!d.includes("problemId="+r.problemId)||!d.includes("fileId="+r.imageFileId))throw new Error("Los metadatos de la imagen pendiente PyS no permiten confirmar su asociación.");const parents=file.getParents();let direct=false;while(parents.hasNext())if(String(parents.next().getId())===String(folder.getId()))direct=true;if(!direct)throw new Error("La imagen pendiente no pertenece a la carpeta PyS autorizada.");assertPysImageFolderPermissions_(file,folder);return file;}
function handleGetPysData(){const sheet=getPysSheet_(false);if(!sheet||sheet.getLastRow()<2)return{status:"success",data:[]};const rows=sheet.getRange(2,1,sheet.getLastRow()-1,10).getValues();return{status:"success",data:rows.filter(r=>r.some(v=>v!==""&&v!==null&&v!==undefined)).map(r=>({id_problem:r[0],Problema:r[1],Descripcion:r[2],Se_soluciono:r[3],Solucion:r[4],Prevenir:r[5],Imagen:normalizePysImageReference_(r[6]),Video:r[7],Colaborador:r[8]||"",modelosAsociados:parseModelosAsociados(r[9]||"")}))};}

const PYS_TITLE_MAX_LENGTH=15;
const PYS_DESCRIPTION_MAX_LENGTH=200;
const PYS_SOLUTION_MAX_LENGTH=700;
function normalizePysField_(value,label,maxLength,required,richText){
    if(typeof value!=="string")throw new Error(label+" debe ser texto.");
    const normalized=value.replace(/\u00a0/g," ").replace(/[ \t\f\v]+/g," ").trim();
    const visible=richText?normalized.replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;|&#xA0;/gi," ").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCharCode(parseInt(hex||dec,hex?16:10))).trim():normalized;
    if(required&&!visible)throw new Error(label+" es obligatorio y no puede estar vacío.");
    if(normalized.length>maxLength)throw new Error(label+" no puede superar "+maxLength+" caracteres.");
    return normalized;
}
function getPysYouTubeVideoId_(value){
    if(typeof value!=="string")return "";
    const candidate=value.trim();if(!candidate)return "";
    const parts=candidate.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
    if(!parts)return "";
    const authority=parts[1].toLowerCase();
    if(authority.includes("@")||authority.includes(":"))return "";
    const host=authority,path=parts[2]||"/",query=parts[3]||"",idPattern=/^[A-Za-z0-9_-]{11}$/;
    if(host==="youtu.be"){const m=path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);return m&&idPattern.test(m[1])?m[1]:"";}
    if(!["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host))return "";
    if(path==="/watch"){
        const ids=[];
        try{query.split("&").filter(Boolean).forEach(part=>{const pair=part.split("="),key=decodeURIComponent(pair.shift().replace(/\+/g," "));if(key==="v")ids.push(decodeURIComponent(pair.join("=").replace(/\+/g," ")));});}
        catch(error){return "";}
        return ids.length===1&&idPattern.test(ids[0])?ids[0]:"";
    }
    const match=path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
    return match&&idPattern.test(match[1])?match[1]:"";
}
function getCanonicalPysYouTubeUrl_(value){const id=getPysYouTubeVideoId_(value);return id?"https://www.youtube.com/watch?v="+id:"";}

function handleAddProblem(source) {
 source=source||{};const opId=String(source.opId||"").trim();if(!/^[A-Za-z0-9_-]{20,80}$/.test(opId))throw new Error("El identificador de operación PyS es obligatorio y debe ser válido.");const titulo=normalizePysField_(source.titulo,"El título",PYS_TITLE_MAX_LENGTH,true,false),descripcion=normalizePysField_(source.descripcion,"La descripción",PYS_DESCRIPTION_MAX_LENGTH,true,true),sinSolucion=source.sinSolucion;if(typeof sinSolucion!=="boolean")throw new Error("El indicador «Sin solución» debe ser booleano.");const solucion=normalizePysField_(source.solucion===undefined&&sinSolucion?"":source.solucion,"La solución",PYS_SOLUTION_MAX_LENGTH,!sinSolucion,true),prevenir=normalizePysField_(source.prevenir===undefined?"":source.prevenir,"La prevención",PYS_SOLUTION_MAX_LENGTH,false,true),userId=String(source.userId||"").trim(),userName=String(source.userName||"").trim(),videoUrl=source.videoUrl===undefined?"":source.videoUrl;if(typeof videoUrl!=="string")throw new Error("La URL de YouTube debe ser texto.");if(videoUrl.trim()){if(!getPysYouTubeVideoId_(videoUrl))throw new Error("La URL de YouTube no tiene un host, ruta o ID permitido.");throw new Error("El vídeo debe cargarse mediante el flujo de aprobación de YouTube; no se aceptan enlaces directos.");}if(!userId||!userName)throw new Error("La sesión verificada no proporcionó un colaborador válido.");const image=validatePysImageDataUrl_(source.imgBase64),requestedModels=source.alcance==="especifico"&&Array.isArray(source.modelosAsociados)?parseModelosAsociados(source.modelosAsociados):[];let models=requestedModels;const p={titulo,descripcion,sinSolucion,solucion,prevenir,userId,userName,alcance:source.alcance,modelosAsociados:[]};const lock=LockService.getScriptLock();lock.waitLock(15000);let sheet=null,opsSheet=null,op=null,file=null,url="",fileId="",problemId="";
try{models=requestedModels.map(findUniqueCortesVehicleForPys_);p.modelosAsociados=models;const hash=buildPysPayloadHash_(p,image,models);sheet=getPysSheet_(true);validatePysRecords_(sheet);opsSheet=getPysOperationsSheet_();const ops=readPysOperations_(opsSheet);op=ops.find(x=>x.opId===opId)||null;if(op){if(op.payloadHash!==hash)throw new Error("El identificador de operación ya pertenece a otro contenido PyS; no se creó otro problema.");if(op.status==="RECOVERY_REQUIRED")throw new Error("La operación PyS requiere recuperación manual; no se creó otro problema.");problemId=op.problemId;const existing=findPysRowsById_(sheet,problemId);if(existing.length>1)throw new Error("El ID del problema aparece más de una vez; se detuvo la recuperación.");if(existing.length===1){const storedUrl=normalizePysImageReference_(existing[0].row[6]),expected=buildPysExpectedRow_(problemId,p,storedUrl,models);if(!storedUrl||!pysRowMatchesPayload_(existing[0].row,expected))throw new Error("El registro PyS existente no coincide con la operación; requiere revisión.");if(op.status!=="LINKED")op=writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"LINKED",imageUrl:storedUrl,updatedAt:new Date().toISOString()}));return{status:"success",message:"Problema registrado correctamente.",problemId,recovered:true};}if(op.status==="LINKED")throw new Error("La operación PyS figura vinculada, pero no existe su registro; requiere revisión.");fileId=op.imageFileId;url=op.imageUrl;}else{problemId=getPysNextId_(sheet,ops);op=writePysOperation_(opsSheet,0,{opId,payloadHash:hash,problemId,status:"PENDING",imageFileId:"",imageUrl:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});}
const folder=getPysImagesFolder_().folder;if(fileId){if(op.status!=="UPLOAD_PENDING")throw new Error("La operación PyS contiene una referencia de imagen inesperada; requiere revisión.");try{file=verifyPendingPysImageFile_(op,image,folder);}catch(e){try{writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"RECOVERY_REQUIRED",updatedAt:new Date().toISOString()}));}catch(ledgerError){}throw e;}}else{if(op.status!=="PENDING")throw new Error("El estado de la operación PyS no permite reintentar automáticamente.");file=folder.createFile(Utilities.newBlob(image.bytes,image.mimeType,problemId+"_"+Date.now()+"."+image.extension));if(!file)throw new Error("Drive no confirmó la creación de la imagen.");fileId=String(file.getId()||"").trim();if(!/^[A-Za-z0-9_-]{10,110}$/.test(fileId))throw new Error("Drive no devolvió un identificador válido para la imagen.");url="https://drive.google.com/file/d/"+fileId+"/view";file.setDescription(["GPSpedia PyS — UPLOAD_PENDING","problemId="+problemId,"fileId="+fileId,"mimeType="+image.mimeType,"sizeBytes="+image.sizeBytes].join("\n"));assertPysImageFolderPermissions_(file,folder);op=writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"UPLOAD_PENDING",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));}
const expected=buildPysExpectedRow_(problemId,p,url,models);sheet.appendRow(expected);SpreadsheetApp.flush();const stored=findPysRowsById_(sheet,problemId);if(stored.length!==1||!pysRowMatchesPayload_(stored[0].row,expected))throw new Error("No se pudo confirmar una única fila PyS con los datos enviados.");op=writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"LINKED",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));try{file.setDescription(["GPSpedia PyS — LINKED","problemId="+problemId,"fileId="+fileId,"mimeType="+image.mimeType,"sizeBytes="+image.sizeBytes].join("\n"));}catch(metadataError){console.warn("No se pudo actualizar el estado auxiliar de la imagen PyS:",metadataError);}try{logUserActivity(userId,userName,"add_problem",problemId,titulo);}catch(logError){console.error("No se pudo registrar la actividad de alta PyS:",logError);}return{status:"success",message:"Problema registrado correctamente.",problemId};
}catch(error){if(file&&sheet&&op&&problemId){let refs;try{refs=findPysImageReferences_(sheet,fileId,url);}catch(readError){markPysImageForRecovery_(file,problemId,fileId,"No se pudo comprobar la hoja PyS después del fallo: "+String(readError&&readError.message||readError));try{writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"RECOVERY_REQUIRED",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));}catch(ledgerError){}throw new Error("No se pudo verificar si la imagen quedó vinculada; se conserva para recuperación manual. Detalle: "+String(error&&error.message||error));}const own=findPysRowsById_(sheet,problemId);if(own.length===1&&pysRowMatchesPayload_(own[0].row,buildPysExpectedRow_(problemId,p,url,models))){try{writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"LINKED",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));try{file.setDescription(["GPSpedia PyS — LINKED","problemId="+problemId,"fileId="+fileId,"mimeType="+image.mimeType,"sizeBytes="+image.sizeBytes,"recoveredAfterPartialFailure=true"].join("\n"));}catch(e){}return{status:"success",message:"Problema registrado y verificado tras una respuesta parcial.",problemId,recovered:true};}catch(e){markPysImageForRecovery_(file,problemId,fileId,"La fila quedó vinculada, pero no se confirmó el ledger.");throw new Error("La fila PyS quedó vinculada, pero su operación requiere reconciliación; no se eliminó la imagen.");}}if(refs.length>0||own.length>0){markPysImageForRecovery_(file,problemId,fileId,"La imagen o el ID aparecen asociados a una fila distinta o ambigua; no se eliminó.");try{writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"RECOVERY_REQUIRED",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));}catch(e){}throw new Error("La imagen está referenciada por un registro PyS distinto o ambiguo; se conservó para evitar pérdida de datos.");}try{file.setTrashed(true);SpreadsheetApp.flush();if(typeof file.isTrashed==="function"&&file.isTrashed()!==true)throw new Error("Drive no confirmó que la imagen no vinculada quedara en papelera.");writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"PENDING",imageFileId:"",imageUrl:"",updatedAt:new Date().toISOString()}));}catch(e){markPysImageForRecovery_(file,problemId,fileId,"Falló la compensación automática: "+String(e&&e.message||e));try{writePysOperation_(opsSheet,op.rowNumber,Object.assign({},op,{status:"RECOVERY_REQUIRED",imageFileId:fileId,imageUrl:url,updatedAt:new Date().toISOString()}));}catch(ledgerError){}throw new Error("La imagen se creó, pero no pudo vincularse ni compensarse; quedó marcada para recuperación manual.");}}throw error;}finally{lock.releaseLock();}
}


function withPysMutationLock_(callback) {
    const lock = LockService.getScriptLock();
    const alreadyHeld = typeof lock.hasLock === "function" && lock.hasLock();
    let acquired = false;
    try {
        if (!alreadyHeld) { lock.waitLock(15000); acquired = true; }
        return callback();
    } finally {
        if (acquired) lock.releaseLock();
    }
}
function buildPysConflictResponse_(message) { return { status: "conflict", code: "PYS_CONFLICT", message }; }
function findPysMutationRow_(sheet, problemId) {
    const lastRow=sheet.getLastRow();
    if(lastRow<2)throw new Error("No hay problemas registrados.");
    const ids=sheet.getRange(2,1,lastRow-1,1).getValues().flat();
    const matches=ids.map((id,index)=>({id,index})).filter(item=>String(item.id)===String(problemId));
    if(matches.length!==1)throw new Error(matches.length?"El problema tiene un ID duplicado.":"Problema no encontrado.");
    return matches[0].index+2;
}
function handleAddSolution(payload) {
    const {problemId,solucion,userId,userName}=payload||{};
    const normalizedSolution=normalizePysField_(solucion,"La solución",PYS_SOLUTION_MAX_LENGTH,true,true);
    if(!problemId||!userId||!userName)throw new Error("problemId, solución y sesión verificada son requeridos.");
    let shouldLog=false;
    const result=withPysMutationLock_(()=>{
        const sheet=getPysSheet_(false);
        if(!sheet)throw new Error("Hoja pys no encontrada.");
        const row=findPysMutationRow_(sheet,problemId),current=sheet.getRange(row,4,1,2).getValues()[0];
        const marker=String(current[0]==null?"":current[0]).trim();
        const storedSolution=current[1]==null||current[1]===""?"":normalizePysField_(current[1],"La solución registrada",PYS_SOLUTION_MAX_LENGTH,false,true);
        const hasMarker=marker!=="",hasSolution=storedSolution!=="";
        if(hasMarker!==hasSolution)throw new Error("El registro PyS tiene un estado inconsistente entre «Se solucionó» y «Solución»; requiere revisión.");
        if(hasSolution){
            if(storedSolution===normalizedSolution)return{status:"success",recovered:true,message:"La misma solución ya estaba registrada; se confirmó el resultado anterior."};
            return buildPysConflictResponse_("Conflicto: otro colaborador ya registró una solución diferente. Actualiza los datos antes de continuar.");
        }
        sheet.getRange(row,4,1,2).setValues([["x",normalizedSolution]]);
        SpreadsheetApp.flush();
        const saved=sheet.getRange(row,4,1,2).getValues()[0];
        if(String(saved[0]==null?"":saved[0]).trim()!=="x"||String(saved[1]==null?"":saved[1])!==normalizedSolution)throw new Error("No se pudo confirmar la solución PyS. Puedes reintentar el mismo contenido.");
        shouldLog=true;
        return{status:"success",message:"Solución agregada con éxito."};
    });
    if(shouldLog){try{logUserActivity(userId,userName,"add_solution",problemId,"Se agregó una solución.");}catch(logError){console.error("No se pudo registrar la actividad de solución:",logError);}}
    return result;
}
function handleAddPrevention(payload) {
    const {problemId,prevenir,userId,userName}=payload||{};
    const normalizedPrevention=normalizePysField_(prevenir,"La prevención",PYS_SOLUTION_MAX_LENGTH,true,true);
    if(!problemId||!userId||!userName)throw new Error("problemId, prevención y sesión verificada son requeridos.");
    let shouldLog=false;
    const result=withPysMutationLock_(()=>{
        const sheet=getPysSheet_(false);
        if(!sheet)throw new Error("Hoja pys no encontrada.");
        const row=findPysMutationRow_(sheet,problemId),current=sheet.getRange(row,6).getValue();
        const storedPrevention=current==null||current===""?"":normalizePysField_(current,"La prevención registrada",PYS_SOLUTION_MAX_LENGTH,false,true);
        if(storedPrevention){
            if(storedPrevention===normalizedPrevention)return{status:"success",recovered:true,message:"La misma prevención ya estaba registrada; se confirmó el resultado anterior."};
            return buildPysConflictResponse_("Conflicto: otro colaborador ya registró una prevención diferente. Actualiza los datos antes de continuar.");
        }
        sheet.getRange(row,6).setValue(normalizedPrevention);
        SpreadsheetApp.flush();
        const saved=sheet.getRange(row,6).getValue();
        if(String(saved==null?"":saved)!==normalizedPrevention)throw new Error("No se pudo confirmar la prevención PyS. Puedes reintentar el mismo contenido.");
        shouldLog=true;
        return{status:"success",message:"Prevención agregada con éxito."};
    });
    if(shouldLog){try{logUserActivity(userId,userName,"add_prevention",problemId,"Se agregó una prevención.");}catch(logError){console.error("No se pudo registrar la actividad de prevención:",logError);}}
    return result;
}

const TUTORIAL_HEADERS = Object.freeze([
    "ID", "Tema", "Imagen", "comoIdentificarlo", "dondeEncontrarlo", "Detalles", "Video", "Colaborador"
]);

function getTutorialSheet_(createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tutorial");
    if (!sheet && createIfMissing) sheet = ss.insertSheet("Tutorial");
    if (!sheet) return null;

    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, TUTORIAL_HEADERS.length).setValues([TUTORIAL_HEADERS.slice()]);
        SpreadsheetApp.flush();
        return sheet;
    }

    const width = Math.max(TUTORIAL_HEADERS.length, sheet.getLastColumn());
    const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
        .map(value => String(value || "").trim());
    if (TUTORIAL_HEADERS.slice(0, 7).some((header, index) => headers[index] !== header)) {
        throw new Error("El esquema A:G de la hoja Tutorial no coincide; no se modificaron registros.");
    }
    if (!headers[7]) {
        const lastRow = sheet.getLastRow();
        const existingExtensionData = lastRow > 1
            ? sheet.getRange(2, 8, lastRow - 1, 1).getDisplayValues().flat()
            : [];
        if (existingExtensionData.some(value => String(value || "").trim())) {
            throw new Error("La columna H contiene datos históricos sin encabezado; no se reinterpretaron como Colaborador.");
        }
        sheet.getRange(1, 8).setValue("Colaborador");
        SpreadsheetApp.flush();
    } else if (headers[7] !== "Colaborador") {
        throw new Error("La columna H de Tutorial debe estar vacía o llamarse Colaborador; no se modificó la hoja.");
    }
    return sheet;
}

function normalizeTutorialTitle_(value) {
    const normalized = Array.from(String(value || "").normalize("NFD"))
        .filter(character => { const code = character.charCodeAt(0); return code < 768 || code > 879; }).join("");
    return normalized.trim().replace(new RegExp(String.fromCharCode(92) + "s+", "g"), " ").toLowerCase();
}

function normalizeTutorialField_(value, label, maxLength, required) {
    const text = String(value === null || value === undefined ? "" : value).trim();
    if (required && !text) throw new Error(label + " es obligatorio.");
    if (text.length > maxLength) throw new Error(label + " no puede exceder " + maxLength + " caracteres.");
    return text;
}

function findTutorialRow_(sheet, reference, preferId) {
    const key = String(reference || "").trim();
    if (!key) throw new Error("Se requiere un ID o tema válido para identificar el tutorial.");
    const data = sheet.getDataRange().getValues();
    const find = (column, value) => data.slice(1).reduce((matches, row, index) => {
        if (String(row[column] || "").trim() === value) matches.push({ rowIndex: index + 2, row });
        return matches;
    }, []);
    const byId = find(0, key);
    if (byId.length > 1) throw new Error("El ID del tutorial aparece más de una vez; no se modificó.");
    if (byId.length === 1) return byId[0];
    if (preferId && /^tut-[A-Za-z0-9_-]{20,80}$/.test(key)) {
        throw new Error("Tutorial no encontrado.");
    }
    if (preferId) {
        const byTitle = find(1, key);
        if (byTitle.length > 1) throw new Error("El tema del tutorial aparece más de una vez; no se modificó.");
        if (byTitle.length === 1) return byTitle[0];
    }
    throw new Error("Tutorial no encontrado.");
}

function handleAddTutorial(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const title = normalizeTutorialField_(source.tema, "El tema del tutorial", 30, true);
    const comoIdentificarlo = normalizeTutorialField_(source.comoIdentificarlo, "Cómo identificarlo", 700, false);
    const dondeEncontrarlo = normalizeTutorialField_(source.dondeEncontrarlo, "Dónde encontrarlo", 700, false);
    const detalles = normalizeTutorialField_(source.detalles !== undefined ? source.detalles : source.descripcion,
        "Los detalles", 700, false);
    const collaborator = normalizeTutorialField_(source.userName, "El colaborador verificado", 120, true);
    const operationId = String(source.operationId || "").trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) {
        throw new Error("Identificador de operación de tutorial inválido.");
    }
    if (String(source.videoUrl || "").trim()) {
        throw new Error("El vídeo debe cargarse mediante el flujo de aprobación de YouTube; no se aceptan enlaces directos.");
    }

    const tutorialId = "tut-" + operationId;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
        const sheet = getTutorialSheet_(true);
        const existingId = sheet.getDataRange().getValues().slice(1)
            .map((row, index) => ({ rowIndex: index + 2, row }))
            .filter(item => String(item.row[0] || "").trim() === tutorialId);
        if (existingId.length > 1) throw new Error("El ID del tutorial aparece más de una vez; requiere revisión.");
        if (existingId.length === 1) {
            const row = existingId[0].row;
            const same = String(row[1] || "").trim() === title &&
                String(row[3] || "").trim() === comoIdentificarlo &&
                String(row[4] || "").trim() === dondeEncontrarlo &&
                String(row[5] || "").trim() === detalles &&
                String(row[7] || "").trim() === collaborator;
            if (!same) throw new Error("El identificador de operación ya pertenece a otro tutorial.");
            return { status: "success", referenceId: tutorialId, alreadyCreated: true,
                message: "El tutorial ya existía; se devolvió el registro original." };
        }

        const titleKey = normalizeTutorialTitle_(title);
        const duplicate = sheet.getDataRange().getValues().slice(1)
            .some(row => normalizeTutorialTitle_(row[1]) === titleKey);
        if (duplicate) throw new Error("Ya existe un tutorial con ese tema; utiliza la edición del registro existente.");

        const newRow = [tutorialId, title, "", comoIdentificarlo, dondeEncontrarlo, detalles, "", collaborator];
        sheet.appendRow(newRow);
        try {
            SpreadsheetApp.flush();
        } catch (flushError) {
            const recovered = findTutorialRow_(sheet, tutorialId, false);
            if (recovered && TUTORIAL_HEADERS.every((header, index) =>
                String(recovered.row[index] || "").trim() === String(newRow[index] || "").trim())) {
                return { status: "success", referenceId: tutorialId, recovered: true,
                    message: "Tutorial registrado y verificado después de una respuesta de guardado incierta." };
            }
            throw flushError;
        }

        const saved = findTutorialRow_(sheet, tutorialId, false);
        if (TUTORIAL_HEADERS.some((header, index) =>
            String(saved.row[index] || "").trim() !== String(newRow[index] || "").trim())) {
            throw new Error("La fila guardada del tutorial no coincide con los datos enviados.");
        }
        return { status: "success", referenceId: tutorialId,
            message: "Tutorial registrado. El vídeo debe enviarse a aprobación antes de publicarse." };
    } finally {
        lock.releaseLock();
    }
}

function extractYouTubeId(url) { return getPysYouTubeVideoId_(url); }

function handleDeleteFeedbackItem(payload) {
    const { id, type } = payload;
    if (!id || !type) {
        throw new Error("Se requieren ID y Tipo de mensaje para eliminar.");
    }

    if (type === 'problem_report') {
        const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        if (!sheet) throw new Error("No se encontró la hoja de Feedbacks.");
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][COLS_FEEDBACKS.ID - 1]) === String(id)) {
                sheet.deleteRow(i + 1);
                SpreadsheetApp.flush();
                return { status: 'success', message: 'Reporte de problema eliminado correctamente.' };
            }
        }
        throw new Error("No se encontró el reporte especificado.");
    } else if (type === 'contact_form') {
        const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
        if (!sheet) throw new Error("No se encontró la hoja de Contactanos.");
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][COLS_CONTACTANOS.Contacto_ID - 1]) === String(id)) {
                sheet.deleteRow(i + 1);
                SpreadsheetApp.flush();
                return { status: 'success', message: 'Mensaje de contacto eliminado correctamente.' };
            }
        }
        throw new Error("No se encontró el mensaje de contacto especificado.");
    } else {
        throw new Error("Tipo de mensaje desconocido.");
    }
}

function normalizePysAssociationId_(value, fieldName) {
    const normalized = normalizeModelosAsociadosList_([value])[0] || "";
    if (!normalized) throw new Error("Se requiere un " + fieldName + " válido.");
    return normalized;
}

function normalizePysProblemId_(value) {
    const problemId = normalizePysAssociationId_(value, "problemId");
    const match = problemId.match(/^isue-(\d+)$/i);
    if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) {
        throw new Error("problemId tiene un formato inválido.");
    }
    return problemId.toLowerCase();
}

function findUniqueCortesVehicleForPys_(value) {
    const requestedId = normalizePysAssociationId_(value, "vehicleId");
    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    if (!sheet) throw new Error("Hoja Cortes no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay vehículos registrados en Cortes.");

    const idHeader = String(sheet.getRange(1, COLS_CORTES.id).getDisplayValues()[0][0] || "").trim().toLowerCase();
    if (idHeader !== "id") throw new Error("El encabezado ID de Cortes no coincide; no se modificó la relación.");

    const matches = sheet.getRange(2, COLS_CORTES.id, lastRow - 1, 1).getValues()
        .map((row, index) => ({ id: String(row[0] === null || row[0] === undefined ? "" : row[0]).trim(), rowNumber: index + 2 }))
        .filter(entry => entry.id === requestedId);
    if (matches.length !== 1) {
        throw new Error("vehicleId debe corresponder a exactamente un registro de Cortes.");
    }
    return matches[0].id;
}

function persistModelosAsociados_(sheet, rowNumber, values) {
    const normalized = normalizeModelosAsociadosList_(values);
    const serialized = normalized.length ? JSON.stringify(normalized) : "";
    const cell = sheet.getRange(rowNumber, 10);
    const currentValue = cell.getValue();
    const currentSerialized = currentValue === null || currentValue === undefined ? "" : String(currentValue);
    if (currentSerialized !== serialized) {
        cell.setValue(serialized);
        SpreadsheetApp.flush();
    }

    const persisted = parseModelosAsociados(cell.getValue());
    if (JSON.stringify(persisted) !== JSON.stringify(normalized)) {
        throw new Error("No se pudo confirmar la colección de vehículos persistida en pys.");
    }
    return persisted;
}

/* TAREA 11 (12.3): ASOCIACIÓN DE VEHÍCULOS A PROBLEMAS EN HOJA PYS (COLUMNA 10) */
function handleAddVehicleToProblem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    return withPysMutationLock_(() => {
        const problemId = normalizePysProblemId_(source.problemId);
        const vehicleId = findUniqueCortesVehicleForPys_(source.vehicleId);
        const sheet = getPysSheet_(false);
        if (!sheet) throw new Error("Hoja pys no encontrada.");

        const matches = findPysRowsById_(sheet, problemId);
        if (matches.length !== 1) {
            throw new Error(matches.length ? "El problema tiene un ID ambiguo." : "Problema no encontrado.");
        }
        const currentList = parseModelosAsociados(matches[0].row[9]);
        if (!currentList.includes(vehicleId)) currentList.push(vehicleId);
        const persisted = persistModelosAsociados_(sheet, matches[0].rowNumber, currentList);
        return { status: "success", message: "Vehículo asociado al problema correctamente.", modelosAsociados: persisted };
    });
}

/* TAREA 6: ELIMINAR RELACIÓN ENTRE PROBLEMA Y MODELO DE VEHÍCULO */
function handleRemoveVehicleFromProblem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    if (normalizeFeedbackRole(source.userRole) !== "desarrollador") {
        throw new Error("No tienes permisos suficientes para eliminar relaciones.");
    }

    return withPysMutationLock_(() => {
        const problemId = normalizePysProblemId_(source.problemId);
        const vehicleId = findUniqueCortesVehicleForPys_(source.vehicleId);
        const sheet = getPysSheet_(false);
        if (!sheet) throw new Error("Hoja pys no encontrada.");

        const matches = findPysRowsById_(sheet, problemId);
        if (matches.length !== 1) {
            throw new Error(matches.length ? "El problema tiene un ID ambiguo." : "Problema no encontrado.");
        }
        const currentList = parseModelosAsociados(matches[0].row[9]);
        const nextList = currentList.filter(id => id !== vehicleId);
        const persisted = persistModelosAsociados_(sheet, matches[0].rowNumber, nextList);
        return { status: "success", message: "Relación retirada con éxito.", modelosAsociados: persisted };
    });
}

function handleClearActivityLogs(payload) {
    const keepLastWeek = payload && payload.keepLastWeek === true;
    const sheet = getSafeSheet(SHEET_NAMES.ACTIVIDAD_USUARIO);
    if (!sheet) {
        return { status: 'success', message: 'Hoja de actividad no encontrada, nada que limpiar.', deletedCount: 0 };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return { status: 'success', message: 'No hay registros de actividad para eliminar.', deletedCount: 0 };
    }

    if (!keepLastWeek) {
        // Borrar todos los registros excepto el encabezado
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Todos los registros de actividad han sido eliminados.', deletedCount: lastRow - 1 };
    } else {
        // Borrar registros con antigüedad mayor a 7 días
        const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        const now = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        // Recorrer de abajo hacia arriba para poder borrar filas sin desfasar índices
        for (let i = data.length - 1; i >= 0; i--) {
            const rawTimestamp = data[i][COLS_ACTIVIDAD_USUARIO.timestamp - 1];
            let entryTime = 0;
            if (rawTimestamp instanceof Date) {
                entryTime = rawTimestamp.getTime();
            } else if (rawTimestamp) {
                entryTime = new Date(rawTimestamp).getTime();
            }

            if (entryTime > 0 && (now - entryTime) > sevenDaysMs) {
                sheet.deleteRow(i + 2);
                deletedCount++;
            }
        }
        SpreadsheetApp.flush();
        return { status: 'success', message: `Se eliminaron ${deletedCount} registros con antigüedad mayor a una semana.`, deletedCount };
    }
}


// La purga de Logs se ejecuta exclusivamente en AUTH, junto con logToSheet().
// ============================================================================
// TAREA 8.1 & 8.2: SUBIDA DIRECTA DE VÍDEOS A YOUTUBE Y APROBACIÓN PREVIA
// ============================================================================

/**
 * Inicializa la sesión de subida de vídeo a YouTube (Resumable Upload)
 */
function handleInitYouTubeUpload(payload) {
    const { title, description, contentType, referenceId, fileName, fileSize, fileType, opVideoId } = payload;
    if (!title) throw new Error("El título del vídeo es obligatorio.");
    if (!['corte', 'pys', 'tutorial'].includes(String(contentType || ''))) throw new Error("Tipo de contenido no válido para la subida.");
    if (!String(referenceId || '').trim()) throw new Error("Debes guardar primero el contenido para asociar el vídeo a un destino válido.");
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(opVideoId || ''))) throw new Error("Identificador de operación de vídeo inválido.");
    const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!feedbackSheet) throw new Error("Hoja Feedbacks no encontrada; no se iniciará una subida sin poder registrar la aprobación.");
    const pendingForTarget = findPendingVideoApprovalForTarget_(feedbackSheet, contentType, referenceId);
    if (pendingForTarget) throw new Error("Ya existe una solicitud de vídeo pendiente para este contenido; no se iniciará otra subida.");
    const destination = getVideoApprovalTarget_({ contentType, referenceId });
    if (!destination.record) throw new Error("El registro de destino no existe; guarda el contenido antes de subir el vídeo.");
    const existingDestinationVideo = String(destination.sheet.getRange(destination.record.rowIndex, destination.videoColumn).getValue() || "").trim();
    if (existingDestinationVideo) throw new Error("El contenido ya tiene un vídeo asociado; no se iniciará una segunda subida.");

    // Configuración permanente y obligatoria de publicación de YouTube:
    const metadata = {
        snippet: {
            title: title,
            description: description || '',
            tags: [], // Etiquetas: Ninguna
            categoryId: '28' // Ciencia y Tecnología / Categoría predeterminada estándar
        },
        status: {
            privacyStatus: 'unlisted', // Visibilidad: No listado
            selfDeclaredMadeForKids: false, // Audiencia: No es contenido para niños
            embeddable: true,
            publicStatsViewable: false
        }
    };

    let uploadUrl = null;
    let videoId = null;

    try {
        // En entorno Google Apps Script con token OAuth de la cuenta administradora:
        const token = ScriptApp.getOAuthToken();
        const youtubeEndpoint = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

        const options = {
            method: 'post',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'Authorization': 'Bearer ' + token,
                'X-Upload-Content-Type': fileType || 'video/mp4',
                'X-Upload-Content-Length': String(fileSize || 0)
            },
            payload: JSON.stringify(metadata),
            muteHttpExceptions: true
        };

        const res = UrlFetchApp.fetch(youtubeEndpoint, options);
        const responseCode = Number(res.getResponseCode());
        const headers = res.getAllHeaders();
        // Solo se acepta una sesión creada por el endpoint oficial de YouTube.
        uploadUrl = headers['Location'] || headers['location'] || null;
        if (responseCode < 200 || responseCode >= 300) {
            throw new Error("YouTube rechazó la inicialización de la sesión (HTTP " + responseCode + ").");
        }
        if (!uploadUrl || !/^https:\/\/www\.googleapis\.com\/upload\/youtube\/v3\/videos\?upload_id=/.test(String(uploadUrl))) {
            uploadUrl = null;
            throw new Error("YouTube no devolvió una URL de sesión reanudable válida.");
        }
    } catch (e) {
        uploadUrl = null;
        Logger.log("Aviso de inicialización OAuth YouTube: " + e.message);
    }

    // Sin URL oficial de sesión no se autoriza la transferencia; opVideoId nunca sustituye videoId.
    return {
        status: uploadUrl ? 'success' : 'error',
        opVideoId: String(opVideoId),
        uploadUrl: uploadUrl,
        message: uploadUrl ? 'Sesión Resumable de YouTube obtenida.' : 'YouTube no devolvió una URL de sesión reanudable; no se inició la transferencia.'
    };
}

/**
 * Registra la solicitud de aprobación de un vídeo subido a YouTube
 */
function findVideoApprovalByOperation_(sheet, opVideoId) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const rows = sheet.getRange(2, 1, lastRow - 1, Math.max(COLS_FEEDBACKS.Problema, sheet.getLastColumn())).getValues();
    const matches = [];
    rows.forEach((row, index) => {
        let data = null;
        try { data = JSON.parse(String(row[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
        if (data && data.subType === "video_approval" && String(data.opVideoId || "") === String(opVideoId)) {
            matches.push({ rowIndex: index + 2, row: row, data: data });
        }
    });
    if (matches.length > 1) throw new Error("El identificador de operación ya está duplicado en Feedbacks; requiere revisión.");
    return matches[0] || null;
}

function findPendingVideoApprovalForTarget_(sheet, contentType, referenceId) {
    const targetType = String(contentType || "");
    const targetId = String(referenceId || "").trim();
    if (!targetType || !targetId) throw new Error("Se requiere tipo e ID de destino para consultar solicitudes pendientes.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const rows = sheet.getRange(2, 1, lastRow - 1, Math.max(COLS_FEEDBACKS.Problema, sheet.getLastColumn())).getValues();
    const matches = [];
    rows.forEach((row, index) => {
        let data = null;
        try { data = JSON.parse(String(row[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
        if (data && data.subType === "video_approval" && data.status === "pending" &&
            String(data.contentType || "") === targetType && String(data.referenceId || "") === targetId) {
            matches.push({ rowIndex: index + 2, row: row, data: data });
        }
    });
    if (matches.length > 1) throw new Error("El destino ya tiene varias solicitudes de vídeo pendientes; requiere revisión.");
    return matches[0] || null;
}

function handleGetVideoApprovalByOperation(payload) {
    const { opVideoId, userId } = payload || {};
    const operationId = String(opVideoId || "").trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) throw new Error("Identificador de operación de vídeo inválido.");
    if (!String(userId || "").trim()) throw new Error("La sesión no proporcionó una identidad válida.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const record = findVideoApprovalByOperation_(sheet, operationId);
    if (!record) return { status: "success", found: false, opVideoId: operationId };
    if (String(record.data.createdByUserId || "") !== String(userId)) {
        throw new Error("La operación de vídeo no pertenece al usuario autenticado.");
    }
    return {
        status: "success",
        found: true,
        id: String(record.row[COLS_FEEDBACKS.ID - 1] || ""),
        opVideoId: operationId,
        approvalStatus: String(record.data.status || ""),
        contentType: String(record.data.contentType || ""),
        referenceId: String(record.data.referenceId || ""),
        videoUrl: String(record.data.videoUrl || "")
    };
}

function handleSubmitVideoForApproval(payload) {
    const { title, description, contentType, referenceId, metadata, videoId, videoUrl, userName, userId, opVideoId } = payload || {};
    const operationId = String(opVideoId || "").trim();
    const actualVideoId = String(videoId || "").trim();
    const validatedVideoId = getPysYouTubeVideoId_(videoUrl);
    const canonicalUrl = /^[A-Za-z0-9_-]{11}$/.test(actualVideoId) && validatedVideoId === actualVideoId
        ? "https://www.youtube.com/watch?v=" + actualVideoId : "";
    if (!title || !String(title).trim()) throw new Error("El título del vídeo es obligatorio.");
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(operationId)) throw new Error("Identificador de operación de vídeo inválido.");
    if (!["corte", "pys", "tutorial"].includes(String(contentType || ""))) throw new Error("Tipo de contenido no válido para aprobación.");
    if (!String(referenceId || "").trim()) throw new Error("La solicitud no tiene un destino guardado para asociar el vídeo.");
    if (!canonicalUrl || String(videoUrl || "").trim() !== canonicalUrl) throw new Error("YouTube no confirmó un ID real o la URL no coincide con el vídeo.");
    if (!String(userId || "").trim()) throw new Error("La sesión no proporcionó una identidad válida.");

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const existing = findVideoApprovalByOperation_(sheet, operationId);
    if (existing) {
        const data = existing.data;
        const sameOperation = String(data.createdByUserId || "") === String(userId) &&
            String(data.contentType || "") === String(contentType) &&
            String(data.referenceId || "") === String(referenceId || "") &&
            String(data.videoId || "") === actualVideoId &&
            String(data.videoUrl || "") === canonicalUrl &&
            String(data.title || "") === String(title).trim() &&
            String(data.description || "") === String(description || "");
        if (!sameOperation) throw new Error("El identificador de operación ya pertenece a una solicitud distinta; no se creó otra solicitud.");
        return {
            status: "success", id: String(existing.row[COLS_FEEDBACKS.ID - 1] || ""),
            opVideoId: operationId, videoUrl: canonicalUrl,
            approvalStatus: String(data.status || "pending"),
            message: "La solicitud de aprobación ya existía; se devolvió el registro original."
        };
    }

    const pendingForTarget = findPendingVideoApprovalForTarget_(sheet, contentType, referenceId);
    if (pendingForTarget) {
        throw new Error("Ya existe una solicitud de vídeo pendiente para este contenido. Revisa la bandeja de aprobación antes de enviar otra.");
    }
    const destination = getVideoApprovalTarget_({ contentType, referenceId });
    if (!destination.record) throw new Error("El registro de destino ya no existe; no se creó la solicitud.");
    const currentDestinationVideo = String(destination.sheet.getRange(destination.record.rowIndex, destination.videoColumn).getValue() || "").trim();
    if (currentDestinationVideo) throw new Error("El destino ya tiene un vídeo asociado; no se creó una solicitud duplicada.");

    const newId = "vid-" + Utilities.getUuid().slice(0, 8);
    const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");
    const videoApprovalPayload = {
        subType: "video_approval",
        opVideoId: operationId,
        createdByUserId: String(userId),
        title: String(title).trim(),
        description: String(description || ""),
        videoUrl: canonicalUrl,
        videoId: actualVideoId,
        contentType: String(contentType),
        referenceId: referenceId === undefined || referenceId === null || referenceId === "" ? null : String(referenceId),
        metadata: metadata && typeof metadata === "object" ? metadata : {},
        status: "pending",
        date: dateStr
    };
    const newRowNumber = sheet.getLastRow() + 1;
    const newRow = [
        newId, String(userName || "Colaborador"), referenceId || "",
        JSON.stringify(videoApprovalPayload), "pending", false, "", "", ""
    ];
    sheet.getRange(newRowNumber, 1, 1, COLS_FEEDBACKS.anoSugerido).setValues([newRow]);
    SpreadsheetApp.flush();

    const saved = findVideoApprovalByOperation_(sheet, operationId);
    if (!saved || String(saved.row[COLS_FEEDBACKS.ID - 1] || "") !== newId) {
        throw new Error("No se pudo verificar la persistencia de la solicitud de aprobación. Reintenta con el mismo identificador de operación.");
    }
    return {
        status: "success", id: newId, opVideoId: operationId,
        videoUrl: canonicalUrl, approvalStatus: "pending",
        message: "Vídeo enviado para aprobación interna."
    };
}

/**
 * Aprueba una solicitud de vídeo y lo asocia al elemento correspondiente en GPSpedia
 */
function findPendingVideoApproval_(sheet, itemId, options) {
    const requestId = String(itemId || "").trim();
    if (!requestId) throw new Error("ID de la solicitud requerido.");
    const rows = sheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < rows.length; index++) {
        if (String(rows[index][COLS_FEEDBACKS.ID - 1] || "").trim() === requestId) {
            matches.push({ rowIndex: index + 1, row: rows[index] });
        }
    }
    if (matches.length !== 1) {
        throw new Error(matches.length > 1
            ? "El ID de solicitud aparece más de una vez; requiere revisión."
            : "Solicitud de vídeo no encontrada.");
    }
    let videoData = null;
    try { videoData = JSON.parse(String(matches[0].row[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!videoData || typeof videoData !== "object" || Array.isArray(videoData)) {
        throw new Error("El contenido de la solicitud no es un JSON de vídeo válido.");
    }
    if (videoData.subType !== "video_approval") {
        throw new Error("El registro no corresponde a una solicitud de aprobación de vídeo.");
    }
    const allowApprovedRetry = options && options.allowApprovedRetry === true;
    const isPending = videoData.status === "pending";
    const isApprovedRetry = allowApprovedRetry && videoData.status === "approved";
    if (!isPending && !isApprovedRetry) {
        throw new Error("La solicitud ya no está pendiente; no se permiten transiciones repetidas.");
    }
    const videoId = String(videoData.videoId || "").trim();
    const canonicalUrl = /^[A-Za-z0-9_-]{11}$/.test(videoId)
        ? "https://www.youtube.com/watch?v=" + videoId : "";
    if (!canonicalUrl || String(videoData.videoUrl || "").trim() !== canonicalUrl) {
        throw new Error("La solicitud contiene un ID o enlace de YouTube inconsistente.");
    }
    if (!["corte", "pys", "tutorial"].includes(String(videoData.contentType || ""))) {
        throw new Error("La solicitud contiene un tipo de contenido desconocido.");
    }
    const referenceId = String(videoData.referenceId || "").trim();
    if (!referenceId) throw new Error("La solicitud no tiene un destino guardado para asociar el vídeo.");
    if (String(matches[0].row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() !== referenceId) {
        throw new Error("El destino de la fila no coincide con el destino declarado en la solicitud de vídeo.");
    }
    if (!String(videoData.title || "").trim()) throw new Error("La solicitud no contiene un título válido.");
    if (!String(videoData.createdByUserId || "").trim()) throw new Error("La solicitud no identifica al usuario que envió el vídeo.");
    if (videoData.opVideoId && !/^[A-Za-z0-9_-]{20,80}$/.test(String(videoData.opVideoId))) {
        throw new Error("La solicitud contiene un identificador de operación inválido.");
    }

    const row = matches[0].row;
    const rowStatus = String(row[COLS_FEEDBACKS.Respuesta - 1] || "").trim();
    const rawResolved = row[COLS_FEEDBACKS["Se resolvio"] - 1];
    const rowResolved = rawResolved === true || String(rawResolved || "").trim().toLowerCase() === "true";
    if (isPending && (rowStatus !== "pending" || rowResolved)) {
        throw new Error("El estado de la fila no coincide con una solicitud de vídeo pendiente.");
    }
    if (isApprovedRetry && (rowStatus !== "approved" || !rowResolved ||
        String(row[COLS_FEEDBACKS.Responde - 1] || "").trim() !== String(videoData.approvedBy || "").trim())) {
        throw new Error("El estado de la fila no coincide con una aprobación de vídeo confirmada.");
    }
    return { rowIndex: matches[0].rowIndex, row: row, videoData: videoData };
}


function findUniqueVideoTargetRow_(sheet, id, idColumn, label) {
    if (!sheet) throw new Error("No se encontró el destino " + label + " de la solicitud.");
    const data = sheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < data.length; index++) {
        if (String(data[index][idColumn - 1] || "").trim() === String(id).trim()) {
            matches.push({ rowIndex: index + 1, row: data[index] });
        }
    }
    if (matches.length !== 1) {
        throw new Error(matches.length > 1
            ? "El destino " + label + " aparece más de una vez; no se modificó."
            : "No se encontró el destino " + label + " de la solicitud.");
    }
    return matches[0];
}

function getVideoApprovalTarget_(videoData) {
    const referenceId = String(videoData.referenceId || "").trim();
    if (!referenceId) throw new Error("La solicitud no tiene un destino válido.");
    if (videoData.contentType === "corte") {
        const sheet = getSafeSheet(SHEET_NAMES.CORTES);
        if (!sheet) throw new Error("Hoja Cortes no encontrada.");
        const width = Math.max(COLS_CORTES.videoGuiaDesarmeUrl, sheet.getLastColumn());
        const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
        if (String(headers[COLS_CORTES.id - 1] || "").trim() !== "id" ||
            String(headers[COLS_CORTES.videoGuiaDesarmeUrl - 1] || "").trim() !== "videoGuiaDesarmeUrl") {
            throw new Error("El esquema de Cortes no permite identificar con seguridad el campo del vídeo.");
        }
        return { type: "corte", sheet, record: findUniqueVideoTargetRow_(sheet, referenceId, COLS_CORTES.id, "Cortes"), videoColumn: COLS_CORTES.videoGuiaDesarmeUrl };
    }
    if (videoData.contentType === "pys") {
        const sheet = getPysSheet_(false);
        if (!sheet) throw new Error("Hoja pys no encontrada.");
        const headers = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getDisplayValues()[0];
        if (String(headers[0] || "").trim() !== "id_problem" || String(headers[7] || "").trim() !== "Video") {
            throw new Error("El esquema de pys no coincide con las columnas id_problem/Video esperadas.");
        }
        return { type: "pys", sheet, record: findUniqueVideoTargetRow_(sheet, referenceId, 1, "PyS"), videoColumn: 8 };
    }
    if (videoData.contentType === "tutorial") {
        const sheet = getTutorialSheet_(false);
        if (!sheet) throw new Error("Hoja Tutorial no encontrada.");
        return { type: "tutorial", sheet, record: findTutorialRow_(sheet, referenceId, true), videoColumn: 7, imageColumn: 3 };
    }
    throw new Error("Tipo de destino de vídeo no reconocido.");
}

function publishApprovedVideo_(videoData) {
    const target = getVideoApprovalTarget_(videoData);
    if (!target.record) throw new Error("El registro de destino ya no existe; no se publicó el vídeo.");
    const url = String(videoData.videoUrl || "").trim();
    const current = String(target.record.row[target.videoColumn - 1] || "").trim();
    if (current && current !== url) throw new Error("El destino ya contiene otro vídeo; no se sobrescribió.");
    let expectedImage = null;
    if (target.type === "tutorial") {
        const imageColumn = target.imageColumn;
        const currentImage = String(target.record.row[imageColumn - 1] || "").trim();
        if (!currentImage) {
            expectedImage = "https://img.youtube.com/vi/" + String(videoData.videoId) + "/hqdefault.jpg";
            target.sheet.getRange(target.record.rowIndex, imageColumn).setValue(expectedImage);
        }
    }
    // La URL del vídeo es el punto de publicación: se escribe después de preparar la miniatura.
    if (current !== url) target.sheet.getRange(target.record.rowIndex, target.videoColumn).setValue(url);
    SpreadsheetApp.flush();
    const savedVideo = String(target.sheet.getRange(target.record.rowIndex, target.videoColumn).getValue() || "").trim();
    if (savedVideo !== url) throw new Error("La escritura del vídeo no pudo verificarse en el destino.");
    if (expectedImage !== null) {
        const savedImage = String(target.sheet.getRange(target.record.rowIndex, target.imageColumn).getValue() || "").trim();
        if (savedImage !== expectedImage) throw new Error("La miniatura del tutorial no pudo verificarse; la publicación requiere revisión.");
    }
    return { targetType: target.type, rowIndex: target.record.rowIndex };
}

function removeRejectedVideoFromDestination_(videoData) {
    const target = getVideoApprovalTarget_(videoData);
    if (!target.record) throw new Error("El registro de destino ya no existe; no se pudo verificar el rechazo.");
    const url = String(videoData.videoUrl || "").trim();
    const current = String(target.record.row[target.videoColumn - 1] || "").trim();
    if (current === url) target.sheet.getRange(target.record.rowIndex, target.videoColumn).setValue("");
    if (target.type === "tutorial") {
        const imageColumn = target.imageColumn;
        const thumbnail = "https://img.youtube.com/vi/" + String(videoData.videoId) + "/hqdefault.jpg";
        const currentImage = String(target.record.row[imageColumn - 1] || "").trim();
        if (currentImage === thumbnail) target.sheet.getRange(target.record.rowIndex, imageColumn).setValue("");
    }
    SpreadsheetApp.flush();
    const savedVideo = String(target.sheet.getRange(target.record.rowIndex, target.videoColumn).getValue() || "").trim();
    if (savedVideo === url) throw new Error("El enlace rechazado continúa visible en el destino.");
    return { targetType: target.type, rowIndex: target.record.rowIndex };
}

function handleApproveVideo(payload) {
    const { itemId, userName, userRole } = payload || {};
    const allowedRoles = ["Desarrollador", "Gefe", "Supervisor"];
    if (!userRole || !allowedRoles.includes(userRole)) throw new Error("No tienes permisos suficientes para aprobar vídeos.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const approvalRecord = findPendingVideoApproval_(sheet, itemId, { allowApprovedRetry: true });
    const rowIndex = approvalRecord.rowIndex;
    const videoData = approvalRecord.videoData;

    if (videoData.status === "approved") {
        const responseState = String(approvalRecord.row[COLS_FEEDBACKS.Respuesta - 1] || "").trim();
        const responder = String(approvalRecord.row[COLS_FEEDBACKS.Responde - 1] || "").trim();
        const resolved = approvalRecord.row[COLS_FEEDBACKS["Se resolvio"] - 1] === true;
        if (responseState !== "approved" || !resolved ||
            !String(videoData.approvedBy || "").trim() ||
            !String(videoData.approvalDate || "").trim() ||
            responder !== String(videoData.approvedBy).trim()) {
            throw new Error("La solicitud figura aprobada, pero su registro de aprobación está incompleto; requiere revisión.");
        }
        const target = getVideoApprovalTarget_(videoData);
        const publishedUrl = String(target.record.row[target.videoColumn - 1] || "").trim();
        if (publishedUrl !== String(videoData.videoUrl || "").trim()) {
            throw new Error("La solicitud figura aprobada, pero el destino no conserva el mismo vídeo; requiere revisión.");
        }
        return {
            status: "success",
            alreadyApproved: true,
            message: "La solicitud ya estaba aprobada y el vídeo continúa publicado en el destino.",
            videoUrl: videoData.videoUrl,
            targetType: target.type
        };
    }

    // Publicar primero en el destino y verificar; si el registro de aprobación falla,
    // el reintento encuentra la misma URL y completa el estado sin duplicar ni sobrescribir.
    const targetResult = publishApprovedVideo_(videoData);
    const actorName = String(userName || "Supervisor");
    videoData.status = "approved";
    videoData.approvedBy = actorName;
    videoData.approvalDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema, 1, 4).setValues([[
        JSON.stringify(videoData), "approved", true, actorName
    ]]);
    SpreadsheetApp.flush();

    const saved = sheet.getRange(rowIndex, 1, 1, COLS_FEEDBACKS.Responde).getValues()[0];
    let savedPayload = null;
    try { savedPayload = JSON.parse(String(saved[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!savedPayload || savedPayload.status !== "approved" ||
        String(saved[COLS_FEEDBACKS.Respuesta - 1] || "") !== "approved" ||
        saved[COLS_FEEDBACKS["Se resolvio"] - 1] !== true) {
        throw new Error("El destino fue actualizado, pero no se pudo confirmar el estado de aprobación. Reintenta la misma solicitud.");
    }
    return {
        status: "success",
        message: "Vídeo aprobado y publicado en GPSpedia.",
        videoUrl: videoData.videoUrl,
        targetType: targetResult.targetType
    };
}

/**
 * Rechaza una solicitud de vídeo y elimina únicamente el enlace pendiente exacto si ya estuviera publicado.
 */
function handleRejectVideo(payload) {
    const { itemId, userName, reason, userRole } = payload || {};
    const allowedRoles = ["Desarrollador", "Gefe", "Supervisor"];
    if (!userRole || !allowedRoles.includes(userRole)) throw new Error("No tienes permisos suficientes para rechazar vídeos.");
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja Feedbacks no encontrada.");
    const approvalRecord = findPendingVideoApproval_(sheet, itemId);
    const rowIndex = approvalRecord.rowIndex;
    const videoData = approvalRecord.videoData;

    const targetResult = removeRejectedVideoFromDestination_(videoData);
    const actorName = String(userName || "Supervisor");
    const rejectionReason = String(reason || "Rechazado por el supervisor").trim().slice(0, 500);
    videoData.status = "rejected";
    videoData.rejectedBy = actorName;
    videoData.rejectReason = rejectionReason;
    videoData.rejectionDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema, 1, 4).setValues([[
        JSON.stringify(videoData), "rejected: " + rejectionReason, true, actorName
    ]]);
    SpreadsheetApp.flush();

    const saved = sheet.getRange(rowIndex, 1, 1, COLS_FEEDBACKS.Responde).getValues()[0];
    let savedPayload = null;
    try { savedPayload = JSON.parse(String(saved[COLS_FEEDBACKS.Problema - 1] || "")); } catch (error) {}
    if (!savedPayload || savedPayload.status !== "rejected" ||
        !String(saved[COLS_FEEDBACKS.Respuesta - 1] || "").startsWith("rejected:") ||
        saved[COLS_FEEDBACKS["Se resolvio"] - 1] !== true) {
        throw new Error("El enlace pendiente se retiró del destino, pero no se pudo confirmar el rechazo. Reintenta la misma solicitud.");
    }
    return { status: "success", message: "Vídeo rechazado.", statusState: "rejected", targetType: targetResult.targetType };
}

/* REVISIÓN IV: EDICIÓN IN-MODAL PARA DESARROLLADORES EN PROBLEMAS Y SOLUCIONES */
function handleUpdatePysItem(payload) {
    payload=payload&&typeof payload==="object"?payload:{};
    const { problemId, titulo, descripcion, solucion, prevenir, videoUrl, userRole } = payload;
    if (!problemId) throw new Error("problemId es obligatorio.");
    if (userRole !== "Desarrollador") throw new Error("No tienes permisos de Desarrollador para editar este problema.");
    const updates={};
    if (Object.prototype.hasOwnProperty.call(payload,"titulo")) updates.titulo=normalizePysField_(titulo,"El título",PYS_TITLE_MAX_LENGTH,true,false);
    if (Object.prototype.hasOwnProperty.call(payload,"descripcion")) updates.descripcion=normalizePysField_(descripcion,"La descripción",PYS_DESCRIPTION_MAX_LENGTH,true,true);
    if (Object.prototype.hasOwnProperty.call(payload,"solucion")) updates.solucion=normalizePysField_(solucion,"La solución",PYS_SOLUTION_MAX_LENGTH,false,true);
    if (Object.prototype.hasOwnProperty.call(payload,"prevenir")) updates.prevenir=normalizePysField_(prevenir,"La prevención",PYS_SOLUTION_MAX_LENGTH,false,true);
    if (videoUrl !== undefined && typeof videoUrl !== "string") throw new Error("La URL de YouTube debe ser texto.");
    const sheet=getPysSheet_(false);
    if(!sheet)throw new Error("Hoja pys no encontrada.");
    const lastRow=sheet.getLastRow();
    if(lastRow<2)throw new Error("No hay problemas registrados.");
    const ids=sheet.getRange(2,1,lastRow-1,1).getValues().flat(),matches=[];
    ids.forEach((id,index)=>{if(String(id)===String(problemId))matches.push(index+2);});
    if(matches.length!==1)throw new Error(matches.length>1?"El ID del problema está duplicado; no se modificó.":"Problema no encontrado.");
    const rowIndex=matches[0],currentVideo=String(sheet.getRange(rowIndex,8).getValue()||"").trim();
    if(videoUrl!==undefined){
        const requested=videoUrl.trim(),currentCanonical=currentVideo?getCanonicalPysYouTubeUrl_(currentVideo):"";
        if(requested&&!getPysYouTubeVideoId_(requested))throw new Error("La URL de YouTube no tiene un host, ruta o ID permitido.");
        if(currentVideo&&!currentCanonical)throw new Error("El vídeo existente de PyS no tiene una URL válida; requiere revisión.");
        if(requested!==currentVideo)throw new Error("El vídeo de PyS solo puede cambiarse mediante una solicitud de aprobación de YouTube.");
    }
    if(Object.prototype.hasOwnProperty.call(updates,"titulo"))sheet.getRange(rowIndex,2).setValue(updates.titulo);
    if(Object.prototype.hasOwnProperty.call(updates,"descripcion"))sheet.getRange(rowIndex,3).setValue(updates.descripcion);
    if(Object.prototype.hasOwnProperty.call(updates,"solucion")){sheet.getRange(rowIndex,5).setValue(updates.solucion);sheet.getRange(rowIndex,4).setValue(updates.solucion?"x":"");}
    if(Object.prototype.hasOwnProperty.call(updates,"prevenir"))sheet.getRange(rowIndex,6).setValue(updates.prevenir);
    SpreadsheetApp.flush();
    return {status:"success",message:"Problema actualizado exitosamente in-modal.",updated:{problemId,...updates,videoUrl:videoUrl===undefined?currentVideo:videoUrl.trim()}};
}

/* La autorización Desarrollador se valida en authorizeFeedbackAction_ antes de llegar aquí. */
function handleUpdateTutorialItem(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const reference = String(source.tutorialId || source.originalTema || "").trim();
    if (!reference) throw new Error("Se requiere el ID del tutorial a editar.");
    if (source.videoUrl !== undefined && String(source.videoUrl || "").trim()) {
        const sheet = getTutorialSheet_(false);
        const target = sheet ? findTutorialRow_(sheet, reference, true) : null;
        const currentVideo = target ? String(target.row[6] || "").trim() : "";
        if (String(source.videoUrl || "").trim() !== currentVideo) {
            throw new Error("El vídeo del tutorial solo puede cambiarse mediante una solicitud de aprobación de YouTube.");
        }
    }

    const updates = {};
    if (source.tema !== undefined) updates.tema = normalizeTutorialField_(source.tema, "El tema del tutorial", 30, true);
    if (source.comoIdentificarlo !== undefined) updates.comoIdentificarlo = normalizeTutorialField_(source.comoIdentificarlo, "Cómo identificarlo", 700, false);
    if (source.dondeEncontrarlo !== undefined) updates.dondeEncontrarlo = normalizeTutorialField_(source.dondeEncontrarlo, "Dónde encontrarlo", 700, false);
    if (source.detalles !== undefined || source.descripcion !== undefined) {
        updates.detalles = normalizeTutorialField_(source.detalles !== undefined ? source.detalles : source.descripcion,
            "Los detalles", 700, false);
    }
    if (!Object.keys(updates).length) throw new Error("No se recibieron campos editables del tutorial.");

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
        const sheet = getTutorialSheet_(false);
        if (!sheet) throw new Error("Hoja Tutorial no encontrada.");
        const target = findTutorialRow_(sheet, reference, true);
        const titleKey = normalizeTutorialTitle_(updates.tema !== undefined ? updates.tema : target.row[1]);
        if (updates.tema !== undefined && titleKey !== normalizeTutorialTitle_(target.row[1])) {
            const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
            const currentTitle = String(target.row[1] || "").trim();
            const hasPendingVideo = feedbackSheet && (
                findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", reference) ||
                (currentTitle && currentTitle !== reference &&
                    findPendingVideoApprovalForTarget_(feedbackSheet, "tutorial", currentTitle))
            );
            if (hasPendingVideo) {
                throw new Error("No se puede cambiar el tema mientras exista una solicitud de vídeo pendiente para este tutorial.");
            }
        }
        if (updates.tema !== undefined) {
            const rows = sheet.getDataRange().getValues().slice(1);
            const duplicate = rows.some((row, index) => index + 2 !== target.rowIndex &&
                normalizeTutorialTitle_(row[1]) === titleKey);
            if (duplicate) throw new Error("Ya existe otro tutorial con ese tema; no se modificó el registro.");
        }

        const nextFields = [
            updates.tema !== undefined ? updates.tema : String(target.row[1] || ""),
            String(target.row[2] || ""),
            updates.comoIdentificarlo !== undefined ? updates.comoIdentificarlo : String(target.row[3] || ""),
            updates.dondeEncontrarlo !== undefined ? updates.dondeEncontrarlo : String(target.row[4] || ""),
            updates.detalles !== undefined ? updates.detalles : String(target.row[5] || "")
        ];
        const currentFields = target.row.slice(1, 6).map(value => String(value || ""));
        const changed = nextFields.some((value, index) => value !== currentFields[index]);
        if (changed) sheet.getRange(target.rowIndex, 2, 1, 5).setValues([nextFields]);
        try {
            SpreadsheetApp.flush();
        } catch (flushError) {
            const recovered = sheet.getRange(target.rowIndex, 2, 1, 5).getValues()[0]
                .map(value => String(value || ""));
            if (!nextFields.every((value, index) => value === recovered[index])) throw flushError;
            return {
                status: "success", recovered: true,
                message: "Tutorial actualizado y verificado después de una respuesta de guardado incierta.",
                updated: { tutorialId: String(target.row[0] || "").trim(), tema: nextFields[0],
                    comoIdentificarlo: nextFields[2], dondeEncontrarlo: nextFields[3], detalles: nextFields[4] }
            };
        }
        const saved = sheet.getRange(target.rowIndex, 2, 1, 5).getValues()[0]
            .map(value => String(value || ""));
        if (!nextFields.every((value, index) => value === saved[index])) {
            throw new Error("La fila del tutorial no coincide con los cambios solicitados.");
        }

        return {
            status: "success",
            message: "Tutorial actualizado exitosamente.",
            updated: { tutorialId: String(target.row[0] || "").trim(), tema: nextFields[0],
                comoIdentificarlo: nextFields[2], dondeEncontrarlo: nextFields[3], detalles: nextFields[4] }
        };
    } finally {
        lock.releaseLock();
    }
}
