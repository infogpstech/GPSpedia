// ============================================================================
// GPSPEDIA-FEEDBACK SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.3.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs"; // <-- ACTUALIZADO A DB V2.0
const DRIVE_FOLDER_ID = "1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2";
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
    return String(role || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
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
 const u=userMatches[0],role=String(u[3]||"").trim(),username=String(u[1]||"").trim(),normalized=normalizeFeedbackRole(role),active=['desarrollador','gefe','jefe','supervisor','tecnico','tecnico_exterior'];
 if(!username||username.toLowerCase().startsWith('__deleted__:')||!active.includes(normalized))throw new Error("Acceso denegado: sesión no autorizada.");
 if(Array.isArray(allowedRoles)&&!allowedRoles.some(x=>normalizeFeedbackRole(x)===normalized))throw new Error("Acceso denegado: sesión no autorizada.");
 return{userId:id,role,userName:String(u[6]||u[1]||"Usuario")};
}

/** Identidad de aportantes de validación de año; el identificador anónimo es seudónimo, no identidad civil. */
function createAnonymousSuggestionActorKey(reporterId) {
    const normalizedId = String(reporterId || "").trim();
    if (!normalizedId) return "anon:unidentified";
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(normalizedId)) {
        throw new Error("El identificador anónimo de aportante no tiene un formato válido.");
    }
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizedId, Utilities.Charset.UTF_8);
    const hash = digest.map(byte => ((Number(byte) + 256) % 256).toString(16).padStart(2, "0")).join("");
    return "anon:" + hash;
}

function resolveSuggestionYearActor(payload) {
    const requestedUserId = String(payload && payload.userId !== undefined ? payload.userId : "").trim();
    if (requestedUserId === "0") {
        return {
            userId: "0", userName: "Anónimo", userRole: "Anónimo",
            suggestionActorKey: createAnonymousSuggestionActorKey(payload.anonymousReporterId)
        };
    }
    const actor = assertFeedbackSession(payload, null);
    return {
        userId: actor.userId,
        userName: actor.userName,
        userRole: actor.role,
        suggestionActorKey: "user:" + actor.userId
    };
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

function parseReportMetadata(rawValue, rowVehicleId) {
    if (typeof rawValue !== "string" || !rawValue.trim()) return null;
    try {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        const reportId = String(parsed.reportId || "").trim();
        const vehicleId = String(parsed.vehicleId || "").trim();
        const corteIndex = Number(parsed.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId) ||
            !vehicleId || vehicleId !== String(rowVehicleId || "").trim() ||
            !Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3 ||
            typeof parsed.activaTestigoMotor !== "boolean") return null;
        return { reportId, vehicleId, corteIndex, activaTestigoMotor: parsed.activaTestigoMotor };
    } catch (error) {
        return null;
    }
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

function doPost(e) {
    let response;
    try {
        const request = JSON.parse(e.postData.contents);
        const action = request.action;
        let payload = request.payload || {};

        const actionPermissions = {
            getFeedbackItems: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
            replyToFeedback: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
            markAsResolved: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
            deleteFeedbackItem: ["Desarrollador", "Gefe", "Jefe", "Supervisor"],
            getActivityLogs: ["Desarrollador", "Gefe", "Supervisor"],
            clearActivityLogs: ["Desarrollador"],
            approveVideo: ["Desarrollador", "Gefe", "Supervisor"],
            rejectVideo: ["Desarrollador", "Gefe", "Supervisor"],
            removeVehicleFromProblem: ["Desarrollador"],
            updatePysItem: ["Desarrollador"],
            updateTutorialItem: ["Desarrollador"],
            initYouTubeUpload: null,
            submitVideoForApproval: null,
            addVehicleToProblem: null
        };

        if (action === "suggestYear") {
            const actor = resolveSuggestionYearActor(payload);
            payload = { ...payload, ...actor };
        } else if (Object.prototype.hasOwnProperty.call(actionPermissions, action)) {
            const actor = assertFeedbackSession(payload, actionPermissions[action]);
            payload = {
                ...payload,
                userId: actor.userId,
                userName: actor.userName,
                userRole: actor.role
            };
            if (action === "replyToFeedback") payload.responderName = actor.userName;
            if (action === "approveVideo") payload.approverName = actor.userName;
            if (action === "rejectVideo") payload.rejecterName = actor.userName;
        }

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
            case 'assignCollaborator':
                response = handleAssignCollaborator(payload);
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


function handleAssignCollaborator(payload) {
    const { vehicleId, corteIndex, userName } = payload;
    if (!vehicleId || !corteIndex || !userName) {
        throw new Error("Faltan datos para asignar colaborador.");
    }
    const sheet = getSafeSheet(SHEET_NAMES.CORTES);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();

    for (let i = 0; i < data.length; i++) {
        if (data[i][0] == vehicleId) {
            const rowIndex = i + 2;
            const colName = `colaboradorCorte${corteIndex}`;
            const col = COLS_CORTES[colName];
            if (!col) throw new Error("Índice de corte inválido.");

            sheet.getRange(rowIndex, col).setValue(userName);
            return { status: 'success', message: 'Colaborador asignado.' };
        }
    }
    throw new Error("Vehículo no encontrado.");
}


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

function handleSuggestYearLocked(payload) {
    const { vehicleId, newYear, response, userId, userName, suggestionActorKey } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedResponse = String(response || "").trim();
    const actorKey = String(suggestionActorKey || "").trim();

    if (!normalizedVehicleId || !userId || !userName || !actorKey) {
        throw new Error("Faltan datos verificados para registrar la sugerencia de año.");
    }
    if (!/^user:[A-Za-z0-9_.-]{1,100}$/.test(actorKey) &&
        !/^anon:(?:[a-f0-9]{64}|unidentified)$/.test(actorKey)) {
        throw new Error("La identidad del aportante no tiene un formato válido.");
    }

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
    const vehicleRowIndex = allCortesData.findIndex(row =>
        String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId
    );
    if (vehicleRowIndex === -1) throw new Error("Vehículo no encontrado para registrar la sugerencia.");
    const vehicleRow = allCortesData[vehicleRowIndex];

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
    const alreadyReported = existingData.some(row =>
        String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim() === normalizedVehicleId &&
        Number(row[COLS_FEEDBACKS.anoSugerido - 1]) === year &&
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
            rowActorKey && isPositiveYearSuggestionRow(row)) voteActors.add(rowActorKey);
    });
    const voteCount = voteActors.size;

    if (!isPositive) {
        return alreadyReported
            ? { status: "info", message: "Ya existe una respuesta de este aportante para ese vehículo y año; no se duplicó." }
            : { status: "success", message: "Respuesta registrada correctamente." };
    }
    if (voteCount < 3) {
        const prefix = alreadyReported ? "Tu aporte ya estaba registrado." : "Sugerencia registrada.";
        return { status: "success", message: prefix + " Votos distintos confirmados: " + voteCount + "/3." };
    }

    const anoDesde = parseInt(vehicleRow[COLS_CORTES.anoDesde - 1], 10);
    const anoHasta = parseInt(vehicleRow[COLS_CORTES.anoHasta - 1] || anoDesde, 10);
    if (year >= anoDesde && year <= anoHasta) {
        return { status: "info", message: "El año " + year + " ya está dentro del rango actual." };
    }

    const marca = String(vehicleRow[COLS_CORTES.marca - 1]).toLowerCase();
    const modelo = String(vehicleRow[COLS_CORTES.modelo - 1]).toLowerCase();
    const categoria = String(vehicleRow[COLS_CORTES.categoria - 1]).toLowerCase();
    const tipoEncendido = String(vehicleRow[COLS_CORTES.tipoEncendido - 1]).toLowerCase();
    const normalizeV = value => (value || "").toString().toLowerCase()
        .replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
    const versionNormalizada = normalizeV(vehicleRow[COLS_CORTES.versionesAplicables - 1]);

    for (const row of allCortesData) {
        if (String(row[COLS_CORTES.id - 1] || "").trim() === normalizedVehicleId) continue;
        const otherMarca = String(row[COLS_CORTES.marca - 1]).toLowerCase();
        const otherModelo = String(row[COLS_CORTES.modelo - 1]).toLowerCase();
        const otherCategoria = String(row[COLS_CORTES.categoria - 1]).toLowerCase();
        const otherTipoEncendido = String(row[COLS_CORTES.tipoEncendido - 1]).toLowerCase();
        const otherVersion = normalizeV(row[COLS_CORTES.versionesAplicables - 1]);
        if (otherMarca === marca && otherModelo === modelo && otherCategoria === categoria &&
            otherTipoEncendido === tipoEncendido && otherVersion === versionNormalizada) {
            const otherAnoDesde = parseInt(row[COLS_CORTES.anoDesde - 1], 10);
            const otherAnoHasta = parseInt(row[COLS_CORTES.anoHasta - 1] || otherAnoDesde, 10);
            if (year <= otherAnoHasta) {
                logUserActivity(userId, userName, "suggest_year_collision", normalizedVehicleId,
                    "Año " + year + " colisiona con rango de vehículo ID " + row[COLS_CORTES.id - 1]);
                return {
                    status: "warning",
                    message: "La sugerencia para el año " + year +
                        " no se puede aplicar porque el año ya está cubierto o es anterior a una generación registrada (" +
                        otherAnoDesde + "-" + otherAnoHasta + "). Se requiere revisión manual."
                };
            }
        }
    }

    let newAnoDesde = anoDesde, newAnoHasta = anoHasta, updated = false;
    if (year < anoDesde) { newAnoDesde = year; updated = true; }
    if (year > anoHasta) { newAnoHasta = year; updated = true; }

    if (updated) {
        cortesSheet.getRange(vehicleRowIndex + 2, COLS_CORTES.anoDesde).setValue(newAnoDesde);
        cortesSheet.getRange(vehicleRowIndex + 2, COLS_CORTES.anoHasta).setValue(newAnoHasta);
        let folderSyncWarning = false, folderSyncMessage = "";
        try {
            const updatedVehicleRow = cortesSheet.getRange(
                vehicleRowIndex + 2, 1, 1, cortesSheet.getLastColumn()
            ).getValues()[0];
            const folderSyncResult = movePrimaryVehicleImageToCanonicalFolder(
                cortesSheet, vehicleRowIndex + 2, updatedVehicleRow
            );
            folderSyncWarning = Boolean(folderSyncResult && folderSyncResult.warning);
            folderSyncMessage = folderSyncResult && folderSyncResult.reason ? folderSyncResult.reason : "";
        } catch (folderError) {
            folderSyncWarning = true;
            folderSyncMessage = folderError.message;
            Logger.log("No se pudo sincronizar la carpeta de imagenVehiculo tras ampliar el rango: " + folderError.message);
        }
        SpreadsheetApp.flush();
        logUserActivity(userId, userName, "apply_year_suggestion", normalizedVehicleId,
            "Rango actualizado a " + newAnoDesde + "-" + newAnoHasta +
            " basado en " + voteCount + " aportantes distintos para el año " + year +
            (folderSyncWarning ? ". Advertencia de carpeta: " + folderSyncMessage : "."));

        const feedbackSheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        if (feedbackSheet) {
            const feedbackValues = feedbackSheet.getDataRange().getValues();
            const isActuallyLowerUpdate = year < anoDesde;
            for (let i = feedbackValues.length - 1; i >= 1; i--) {
                const row = feedbackValues[i];
                const rowId = String(row[COLS_FEEDBACKS.ID_vehiculo - 1] || "").trim();
                const rowYear = Number(row[COLS_FEEDBACKS.anoSugerido - 1]);
                const rowActorKey = String(row[actorColumn - 1] || "").trim();
                const rowProblem = String(row[COLS_FEEDBACKS.Problema - 1] || "");
                const isMatchingPositive = isActuallyLowerUpdate
                    ? rowProblem.includes("Sugerencia de ampliar rango inferior")
                    : isPositiveYearSuggestionRow(row);
                if (rowId === normalizedVehicleId && rowYear === year && rowActorKey && isMatchingPositive) {
                    feedbackSheet.deleteRow(i + 1);
                }
            }
        }
        return {
            status: "success",
            folderSyncWarning,
            message: "¡Gracias! Con " + voteCount + " aportantes distintos, el catálogo se ha actualizado a " +
                newAnoDesde + "-" + newAnoHasta + "." +
                (folderSyncWarning ? " La carpeta de la imagen principal no pudo sincronizarse automáticamente: " + folderSyncMessage : "")
        };
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

function handleRecordLike(payload) {
    const { vehicleId, corteIndex, userId, userName } = payload;
    if (!vehicleId || !corteIndex || !userId || !userName) {
        throw new Error("Faltan datos para registrar el 'like' (vehicleId, corteIndex, userId, userName).");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000); // Wait up to 15 seconds for the lock

    try {
        const sheet = getSafeSheet(SHEET_NAMES.CORTES);
        const ids = sheet.getRange(2, COLS_CORTES.id, sheet.getLastRow() - 1, 1).getValues().flat();
        const rowIndex = ids.findIndex(id => id == vehicleId);

        if (rowIndex === -1) {
            throw new Error("No se encontró el vehículo con el ID proporcionado.");
        }

        const actualRow = rowIndex + 2;
        const utilColName = `utilCorte${corteIndex}`;
        const utilCol = COLS_CORTES[utilColName];

        if (!utilCol) {
            throw new Error(`Índice de corte inválido: ${corteIndex}`);
        }

        const cell = sheet.getRange(actualRow, utilCol);
        let currentValue = cell.getValue();
        if (typeof currentValue !== 'number' || isNaN(currentValue)) {
            currentValue = 0;
        }

        cell.setValue(currentValue + 1);

        logUserActivity(userId, userName, 'like', vehicleId, `Like en corte ${corteIndex}. Nuevo total: ${currentValue + 1}`);

        return { status: 'success', message: 'Like registrado correctamente.' };
    } finally {
        lock.releaseLock();
    }
}

function handleReportProblem(payload) {
    const { vehicleId, problemText, userId, userName } = payload;
    if (!vehicleId || !problemText || !userId || !userName) {
        throw new Error("Faltan datos para reportar el problema (vehicleId, problemText, userId, userName).");
    }

    const hasReportContext = payload.reportId !== undefined ||
        payload.corteIndex !== undefined || payload.activaTestigoMotor !== undefined;
    let reportContext = null;
    if (hasReportContext) {
        const reportId = String(payload.reportId || "").trim();
        const corteIndex = Number(payload.corteIndex);
        if (!/^REP-[A-Za-z0-9_-]{1,80}$/.test(reportId)) {
            throw new Error("El identificador del reporte no tiene un formato válido.");
        }
        if (!Number.isInteger(corteIndex) || corteIndex < 1 || corteIndex > 3) {
            throw new Error("El número de corte no es válido.");
        }
        if (typeof payload.activaTestigoMotor !== "boolean") {
            throw new Error("El indicador del testigo del motor debe ser booleano.");
        }
        reportContext = {
            reportId,
            vehicleId: String(vehicleId),
            corteIndex,
            activaTestigoMotor: payload.activaTestigoMotor
        };
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let generatedReportId = "";
    try {
        const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
        const metadataColumn = reportContext ? ensureReportMetadataColumn(sheet) : 0;
        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const FORMULA_ROW = 2;
        const lastCol = reportContext
            ? Math.max(sheet.getLastColumn(), metadataColumn, 8)
            : (sheet.getLastColumn() || 8);

        if (lastRow >= FORMULA_ROW) {
            const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
            const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
            formulaRange.copyTo(newRowRange);
            if (lastCol > 1) {
                sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
            }
        }

        const values = [[userName, vehicleId, problemText]];
        sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario, 1, values[0].length).setValues(values);

        if (reportContext) {
            const metadata = {
                reportId: reportContext.reportId,
                vehicleId: String(vehicleId),
                corteIndex: reportContext.corteIndex,
                activaTestigoMotor: reportContext.activaTestigoMotor
            };
            sheet.getRange(newRowNumber, metadataColumn).setValue(JSON.stringify(metadata));
        }
        SpreadsheetApp.flush();

        const idVal = sheet.getRange(newRowNumber, COLS_FEEDBACKS.ID).getValue();
        generatedReportId = reportContext ? reportContext.reportId : `REP-${idVal || Date.now()}`;
    } finally {
        lock.releaseLock();
    }

    logUserActivity(userId, userName, 'report_problem', vehicleId, problemText);
    return { status: 'success', message: 'Problema reportado.', reportId: generatedReportId };
}
function handleSendContactForm(payload) {
    const { name, email, message, userId } = payload;
    if (!name || !email || !message) {
        throw new Error("Faltan datos para enviar el formulario de contacto (name, email, message).");
    }

    const sheet = getSafeSheet(SHEET_NAMES.CONTACTANOS);
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    const FORMULA_ROW = 2;
    const lastCol = sheet.getLastColumn() || 6;

    if (lastRow >= FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        if (lastCol > 1) {
            sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
        }
    }

    const values = [[
        userId || 'N/A',
        `Contacto de ${name}`,
        `De: ${email}\n\n${message}`
    ]];
    sheet.getRange(newRowNumber, COLS_CONTACTANOS.User_ID, 1, values[0].length).setValues(values);

    SpreadsheetApp.flush();

    return { status: 'success', message: 'Formulario de contacto enviado.' };
}

// ============================================================================
// HANDLERS FOR INBOX SYSTEM
// ============================================================================

function normalizeSuggestionActivaTestigo(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized || ["no aplica", "no_aplica", "no aplica / no especificado", "no aplica/no especificado", "no especificado", "no especificada", "n/a", "na"].includes(normalized)) return null;
    if (["true", "sí", "si", "yes", "x", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
    throw new Error("El valor propuesto para activaTestigo no es válido.");
}
function normalizeSuggestionProposedValues(proposedValues) {
    if (proposedValues !== undefined && proposedValues !== null &&
        (typeof proposedValues !== "object" || Array.isArray(proposedValues))) throw new Error("Los valores propuestos deben enviarse como un objeto.");
    const source = proposedValues || {};
    const normalized = Object.assign({}, source);
    const hasCanonical = Object.prototype.hasOwnProperty.call(source, "activaTestigo");
    const hasLegacy = Object.prototype.hasOwnProperty.call(source, "activaCheckEngine");
    const canonicalValue = hasCanonical ? normalizeSuggestionActivaTestigo(source.activaTestigo) : null;
    const legacyValue = hasLegacy ? normalizeSuggestionActivaTestigo(source.activaCheckEngine) : null;
    if (hasCanonical && hasLegacy && canonicalValue !== legacyValue) throw new Error("Los campos históricos y actuales del testigo contienen valores incompatibles.");
    normalized.activaTestigo = hasCanonical ? canonicalValue : (hasLegacy ? legacyValue : null);
    delete normalized.activaCheckEngine;
    return normalized;
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
function handleSuggestCutChange(payload) {
    const { reportId, vehicleId, corteIndex, userId, userName, details, imgBase64, proposedValues } = payload || {};
    const normalizedVehicleId = String(vehicleId || "").trim();
    const normalizedCorteIndex = Number(corteIndex);
    if (!normalizedVehicleId || !userId || !userName ||
        !Number.isInteger(normalizedCorteIndex) || normalizedCorteIndex < 1 || normalizedCorteIndex > 3) {
        throw new Error("Faltan datos válidos para sugerir cambio (vehicleId, corteIndex 1–3, userId, userName).");
    }
    const normalizedProposedValues = normalizeSuggestionProposedValues(proposedValues);
    const normalizedReportId = String(reportId || "N/A");
    const normalizedDetails = String(details || "");
    const createdAt = new Date().toISOString();
    let imageUrl = "";
    if (imgBase64) {
        try {
            const folderName = "SugerenciasCortes";
            const folders = DriveApp.getFoldersByName(folderName);
            let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
            const blob = Utilities.newBlob(Utilities.base64Decode(imgBase64.replace(/^data:image\/[a-z]+;base64,/, "")), "image/jpeg", `sug_${normalizedVehicleId}_corte${normalizedCorteIndex}_${Date.now()}.jpg`);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            imageUrl = file.getUrl();
        } catch(e) {
            console.error("Error subiendo imagen de sugerencia:", e);
        }
    }
    // La sugerencia se conserva como registro independiente en Feedbacks; no modifica Cortes.
    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    const FORMULA_ROW = 2;
    const lastCol = sheet.getLastColumn() || 8;
    if (lastRow >= FORMULA_ROW) {
        const formulaRange = sheet.getRange(FORMULA_ROW, 1, 1, lastCol);
        const newRowRange = sheet.getRange(newRowNumber, 1, 1, lastCol);
        formulaRange.copyTo(newRowRange);
        if (lastCol > 1) sheet.getRange(newRowNumber, 2, 1, lastCol - 1).clearContent();
    }
    const suggestionRecord = {
        subType: "suggestion_cut", schemaVersion: 2,
        reportId: normalizedReportId, vehicleId: normalizedVehicleId, corteIndex: normalizedCorteIndex,
        userId: String(userId), userName: String(userName), createdAt,
        imageUrl: imageUrl || "", details: normalizedDetails,
        proposedValues: normalizedProposedValues, status: "pendiente_revision"
    };
    const problemDesc = JSON.stringify(suggestionRecord);
    const values = [[String(userName), normalizedVehicleId, problemDesc]];
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario, 1, values[0].length).setValues(values);
    if (COLS_FEEDBACKS['Se resolvio']) sheet.getRange(newRowNumber, COLS_FEEDBACKS['Se resolvio']).setValue(false);
    SpreadsheetApp.flush();
    logUserActivity(userId, userName, "suggest_cut_change", normalizedVehicleId, problemDesc);
    return {
        status: "success",
        message: "Sugerencia de cambio registrada correctamente como propuesta independiente.",
        reportId: normalizedReportId,
        suggestionData: suggestionRecord
    };
}

function parseModelosAsociados(rawVal) {
    if (!rawVal) return [];
    const str = String(rawVal).trim();
    if (!str) return [];
    if (str.startsWith("[") && str.endsWith("]")) {
        try {
            const arr = JSON.parse(str);
            if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
        } catch (e) {}
    }
    return str.split(/[,/\\;]+/).map(s => s.trim()).filter(Boolean);
}

function handleGetPysData() {
    const sheet = getSafeSheet("pys");
    if (!sheet) return { status: "success", data: [] };
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: "success", data: [] };

    const lastCol = Math.max(10, sheet.getLastColumn());
    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const result = data.map(row => ({
        id_problem: row[0],
        Problema: row[1],
        Descripcion: row[2],
        Se_soluciono: row[3],
        Solucion: row[4],
        Prevenir: row[5],
        Imagen: row[6],
        Video: row[7],
        Colaborador: row[8] || "",
        modelosAsociados: parseModelosAsociados(row[9] || "")
    }));
    return { status: "success", data: result };
}

/* TAREA 10 (5.4): ALMACENAMIENTO EN HOJA PYS, IDENTIFICADORES ÚNICOS ISUE-001 Y SUBIDA A DRIVE */
function handleAddProblem(payload) {
    const { titulo, descripcion, sinSolucion, solucion, prevenir, videoUrl, imgBase64, userId, userName, modelosAsociados, alcance } = payload;
    if (!titulo || !descripcion) {
        throw new Error("Titulo y descripcion son obligatorios.");
    }
    if (titulo.length > 30) throw new Error("El titulo no puede superar 30 caracteres.");
    if (descripcion.length > 700) throw new Error("La descripcion no puede superar 700 caracteres.");
    if (!sinSolucion && !solucion) throw new Error("Debe proporcionar una solucion si no marca 'Sin solucion'.");
    if (solucion && solucion.length > 700) throw new Error("La solucion no puede superar 700 caracteres.");
    if (prevenir && prevenir.length > 700) throw new Error("La prevencion no puede superar 700 caracteres.");
    if (videoUrl && !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
        throw new Error("El enlace del vídeo debe ser una URL válida de YouTube.");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
        const sheet = getSafeSheet("pys") || getSpreadsheet().insertSheet("pys");
        if (sheet.getLastRow() === 0) {
            sheet.getRange(1, 1, 1, 10).setValues([["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion", "Prevenir", "Imagen", "Video", "Colaborador", "modelos_asociados"]]);
        }

        const lastRow = sheet.getLastRow();
        const nextIdNum = lastRow > 1 ? lastRow : 1;
        const problemId = "isue-" + String(nextIdNum).padStart(3, "0");

        let imageUrl = "";
        if (imgBase64) {
            try {
                const folderName = "Problemas y Soluciones";
                const folders = DriveApp.getFoldersByName(folderName);
                let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
                const blob = Utilities.newBlob(Utilities.base64Decode(imgBase64.replace(/^data:image\/[a-z]+;base64,/, "")), "image/jpeg", `${problemId}_${Date.now()}.jpg`);
                const file = folder.createFile(blob);
                file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                imageUrl = file.getUrl();
            } catch(e) { console.error("Error guardando imagen PYS:", e); }
        }

        let modelosArr = [];
        if (alcance === 'especifico' && Array.isArray(modelosAsociados)) {
            modelosArr = Array.from(new Set(modelosAsociados.map(String).filter(Boolean)));
        }

        const newRow = [
            problemId,
            titulo,
            descripcion,
            sinSolucion ? "" : "x",
            sinSolucion ? "" : (solucion || ""),
            prevenir || "",
            imageUrl,
            videoUrl || "",
            userName || "",
            modelosArr.length > 0 ? JSON.stringify(modelosArr) : ""
        ];

        sheet.appendRow(newRow);
        SpreadsheetApp.flush();
        if (userId && userName) logUserActivity(userId, userName, "add_problem", problemId, titulo);

        return { status: "success", message: "Problema registrado correctamente.", problemId };
    } finally {
        lock.releaseLock();
    }
}

function handleAddSolution(payload) {
    const { problemId, solucion } = payload;
    if (!problemId || !solucion) throw new Error("problemId y solucion son requeridos.");
    if (solucion.length > 700) throw new Error("La solucion no puede superar 700 caracteres.");

    const sheet = getSafeSheet("pys");
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay problemas registrados.");
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = data.findIndex(id => id.toString() === problemId.toString());
    if (index === -1) throw new Error("Problema no encontrado.");

    const row = index + 2;
    sheet.getRange(row, 4).setValue("x"); // Se soluciono
    sheet.getRange(row, 5).setValue(solucion); // Solucion
    SpreadsheetApp.flush();

    return { status: "success", message: "Solucion agregada con exito." };
}

function handleAddPrevention(payload) {
    const { problemId, prevenir } = payload;
    if (!problemId || !prevenir) throw new Error("problemId y prevenir son requeridos.");
    if (prevenir.length > 700) throw new Error("La prevencion no puede superar 700 caracteres.");

    const sheet = getSafeSheet("pys");
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay problemas registrados.");
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = data.findIndex(id => id.toString() === problemId.toString());
    if (index === -1) throw new Error("Problema no encontrado.");

    const row = index + 2;
    sheet.getRange(row, 6).setValue(prevenir); // Prevenir
    SpreadsheetApp.flush();

    return { status: "success", message: "Prevencion agregada con exito." };
}

function handleAddTutorial(payload) {
    const { tema, videoUrl, descripcion, colaborador } = payload;
    if (!tema || !videoUrl) throw new Error("Tema y enlace de vídeo son obligatorios.");
    if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
        throw new Error("El enlace del vídeo debe ser una URL válida de YouTube.");
    }

    const sheet = getSafeSheet("Tutoriales") || getSpreadsheet().insertSheet("Tutoriales");
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, 5).setValues([["Tema", "Imagen", "Video", "Descripción", "Colaborador"]]);
    }

    const newRow = [
        tema,
        `https://img.youtube.com/vi/${extractYouTubeId(videoUrl)}/hqdefault.jpg`,
        videoUrl,
        descripcion || "",
        colaborador || ""
    ];

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    return { status: "success", message: "Tutorial registrado con éxito." };
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
}

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

/* TAREA 11 (12.3): ASOCIACIÓN DE VEHÍCULOS A PROBLEMAS EN HOJA PYS (COLUMNA 10) */
function handleAddVehicleToProblem(payload) {
    const { problemId, vehicleId } = payload;
    if (!problemId || !vehicleId) {
        throw new Error("Se requieren problemId y vehicleId.");
    }

    const sheet = getSafeSheet("pys");
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay problemas registrados.");

    const data = sheet.getRange(2, 1, lastRow - 1, Math.max(10, sheet.getLastColumn())).getValues();
    let rowIndex = -1;
    let currentRaw = "";

    for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(problemId)) {
            rowIndex = i + 2;
            currentRaw = data[i][9] || "";
            break;
        }
    }

    if (rowIndex === -1) throw new Error("Problema no encontrado.");

    const currentList = parseModelosAsociados(currentRaw);
    if (!currentList.includes(String(vehicleId))) {
        currentList.push(String(vehicleId));
        sheet.getRange(rowIndex, 10).setValue(JSON.stringify(currentList));
        SpreadsheetApp.flush();
    }

    return { status: 'success', message: 'Vehículo asociado al problema correctamente.', modelosAsociados: currentList };
}

/* TAREA 6: ELIMINAR RELACIÓN ENTRE PROBLEMA Y MODELO DE VEHÍCULO */
function handleRemoveVehicleFromProblem(payload) {
    const { problemId, vehicleId, userRole } = payload;
    if (!problemId || !vehicleId) {
        throw new Error("Se requieren problemId y vehicleId.");
    }

    // REVISIÓN IV: Desvinculación de problemas y vehículos restringida exclusivamente al Desarrollador
    const allowedRoles = ['Desarrollador'];
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new Error("No tienes permisos suficientes para eliminar relaciones.");
    }

    const sheet = getSafeSheet("pys");
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay problemas registrados.");

    const data = sheet.getRange(2, 1, lastRow - 1, Math.max(10, sheet.getLastColumn())).getValues();
    let rowIndex = -1;
    let currentRaw = "";

    for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(problemId)) {
            rowIndex = i + 2;
            currentRaw = data[i][9] || "";
            break;
        }
    }

    if (rowIndex === -1) throw new Error("Problema no encontrado.");

    let currentList = parseModelosAsociados(currentRaw);
    currentList = currentList.filter(id => String(id) !== String(vehicleId));

    sheet.getRange(rowIndex, 10).setValue(currentList.length > 0 ? JSON.stringify(currentList) : "");
    SpreadsheetApp.flush();

    return { status: 'success', message: 'Relación retirada con éxito.', modelosAsociados: currentList };
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
    const { title, description, contentType, referenceId, fileName, fileSize, fileType, userName, userId } = payload;
    if (!title) throw new Error("El título del vídeo es obligatorio.");

    // Generar un ID local de operación para idempotencia
    const opVideoId = 'yt_' + Utilities.getUuid().slice(0, 8);

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
        const headers = res.getAllHeaders();
        // La API de YouTube devuelve el endpoint de subida reanudable en la cabecera Location
        uploadUrl = headers['Location'] || headers['location'] || null;

        if (!uploadUrl && res.getResponseCode() >= 400) {
            Logger.log("Aviso YouTube API Init: " + res.getContentText());
        }
    } catch (e) {
        Logger.log("Aviso de inicialización OAuth YouTube: " + e.message);
    }

    // Si la sesión resumable no pudo ser provista directamente por falta de credenciales Cloud en el sandbox,
    // se entrega el opVideoId como identificador de sesión.
    return {
        status: 'success',
        opVideoId: opVideoId,
        videoId: videoId || opVideoId,
        uploadUrl: uploadUrl,
        message: uploadUrl ? 'Sesión Resumable de YouTube obtenida.' : 'Sesión de subida inicializada.'
    };
}

/**
 * Registra la solicitud de aprobación de un vídeo subido a YouTube
 */
function handleSubmitVideoForApproval(payload) {
    const { title, description, contentType, referenceId, metadata, videoId, videoUrl, userName, userId } = payload;
    if (!title || !videoUrl) throw new Error("Título y URL del vídeo son obligatorios.");

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error(`Hoja ${SHEET_NAMES.FEEDBACKS} no encontrada.`);

    const newId = 'vid-' + Utilities.getUuid().slice(0, 8);
    const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");

    // Construir metadatos estructurados para el Inbox
    const videoApprovalPayload = {
        subType: 'video_approval',
        title: title,
        description: description || '',
        videoUrl: videoUrl,
        videoId: videoId,
        contentType: contentType || 'corte',
        referenceId: referenceId || null,
        metadata: metadata || {},
        status: 'pending',
        date: dateStr
    };

    const newRowNumber = sheet.getLastRow() + 1;
    // Guardar en la hoja Feedbacks aprovechando columnas estándar
    // ID: newId, Usuario: userName, ID_vehiculo: referenceId, Problema: JSON video payload, Respuesta: 'pending', Se resolvio: false
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.ID).setValue(newId);
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.Usuario).setValue(userName || 'Colaborador');
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.ID_vehiculo).setValue(referenceId || '');
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.Problema).setValue(JSON.stringify(videoApprovalPayload));
    sheet.getRange(newRowNumber, COLS_FEEDBACKS.Respuesta).setValue('pending');
    sheet.getRange(newRowNumber, COLS_FEEDBACKS['Se resolvio']).setValue(false);

    SpreadsheetApp.flush();

    return {
        status: 'success',
        id: newId,
        videoUrl: videoUrl,
        approvalStatus: 'pending',
        message: 'Vídeo enviado para aprobación interna.'
    };
}

/**
 * Aprueba una solicitud de vídeo y lo asocia al elemento correspondiente en GPSpedia
 */
function handleApproveVideo(payload) {
    const { itemId, approverName, userRole } = payload;
    if (!itemId) throw new Error("ID de la solicitud requerido.");

    // Validación estricta de permisos de rol (Desarrollador, Gefe, Supervisor)
    const allowedRoles = ['Desarrollador', 'Gefe', 'Supervisor'];
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new Error("No tienes permisos suficientes para aprobar vídeos.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja no encontrada.");

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let videoData = null;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][COLS_FEEDBACKS.ID - 1]) === String(itemId)) {
            rowIndex = i + 1;
            try {
                videoData = JSON.parse(data[i][COLS_FEEDBACKS.Problema - 1]);
            } catch (e) {
                videoData = null;
            }
            break;
        }
    }

    if (rowIndex === -1 || !videoData) {
        throw new Error("Solicitud de vídeo no encontrada.");
    }

    // Actualizar estado en Feedbacks
    videoData.status = 'approved';
    videoData.approvedBy = approverName || 'Supervisor';
    videoData.approvalDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");

    sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema).setValue(JSON.stringify(videoData));
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Respuesta).setValue('approved');
    sheet.getRange(rowIndex, COLS_FEEDBACKS['Se resolvio']).setValue(true);
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Responde).setValue(approverName || 'Supervisor');

    // Asociar el vídeo aprobado a la entidad correspondiente si es corte de vehículo
    if (videoData.contentType === 'corte' && videoData.referenceId) {
        const cortesSheet = getSafeSheet(SHEET_NAMES.CORTES);
        if (cortesSheet) {
            const cortesData = cortesSheet.getDataRange().getValues();
            for (let j = 1; j < cortesData.length; j++) {
                if (String(cortesData[j][COLS_CORTES.id - 1]) === String(videoData.referenceId)) {
                    cortesSheet.getRange(j + 1, COLS_CORTES.videoGuiaDesarmeUrl).setValue(videoData.videoUrl);
                    break;
                }
            }
        }
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Vídeo aprobado y publicado en GPSpedia.', videoUrl: videoData.videoUrl };
}

/**
 * Rechaza una solicitud de vídeo
 */
function handleRejectVideo(payload) {
    const { itemId, rejecterName, reason, userRole } = payload;
    if (!itemId) throw new Error("ID de la solicitud requerido.");

    const allowedRoles = ['Desarrollador', 'Gefe', 'Supervisor'];
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new Error("No tienes permisos suficientes para rechazar vídeos.");
    }

    const sheet = getSafeSheet(SHEET_NAMES.FEEDBACKS);
    if (!sheet) throw new Error("Hoja no encontrada.");

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let videoData = null;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][COLS_FEEDBACKS.ID - 1]) === String(itemId)) {
            rowIndex = i + 1;
            try {
                videoData = JSON.parse(data[i][COLS_FEEDBACKS.Problema - 1]);
            } catch (e) {
                videoData = null;
            }
            break;
        }
    }

    if (rowIndex === -1 || !videoData) {
        throw new Error("Solicitud de vídeo no encontrada.");
    }

    videoData.status = 'rejected';
    videoData.rejectedBy = rejecterName || 'Supervisor';
    videoData.rejectReason = reason || 'Rechazado por el supervisor';
    videoData.rejectionDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-5", "yyyy-MM-dd HH:mm:ss");

    sheet.getRange(rowIndex, COLS_FEEDBACKS.Problema).setValue(JSON.stringify(videoData));
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Respuesta).setValue('rejected: ' + (reason || 'Rechazado'));
    sheet.getRange(rowIndex, COLS_FEEDBACKS['Se resolvio']).setValue(true);
    sheet.getRange(rowIndex, COLS_FEEDBACKS.Responde).setValue(rejecterName || 'Supervisor');

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Vídeo rechazado.', statusState: 'rejected' };
}

/* REVISIÓN IV: EDICIÓN IN-MODAL PARA DESARROLLADORES EN PROBLEMAS Y SOLUCIONES */
function handleUpdatePysItem(payload) {
    const { problemId, titulo, descripcion, solucion, prevenir, videoUrl, userRole } = payload;
    if (!problemId) throw new Error("problemId es obligatorio.");

    const allowedRoles = ['Desarrollador'];
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new Error("No tienes permisos de Desarrollador para editar este problema.");
    }

    if (titulo && titulo.length > 30) throw new Error("El título no puede exceder 30 caracteres.");
    if (descripcion && descripcion.length > 700) throw new Error("La descripción no puede exceder 700 caracteres.");
    if (solucion && solucion.length > 700) throw new Error("La solución no puede exceder 700 caracteres.");
    if (prevenir && prevenir.length > 700) throw new Error("La prevención no puede exceder 700 caracteres.");

    const sheet = getSafeSheet("pys");
    if (!sheet) throw new Error("Hoja pys no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay problemas registrados.");

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = ids.findIndex(id => String(id) === String(problemId));
    if (index === -1) throw new Error("Problema no encontrado.");

    const rowIndex = index + 2;
    if (titulo !== undefined) sheet.getRange(rowIndex, 2).setValue(titulo);
    if (descripcion !== undefined) sheet.getRange(rowIndex, 3).setValue(descripcion);
    if (solucion !== undefined) {
        sheet.getRange(rowIndex, 5).setValue(solucion);
        sheet.getRange(rowIndex, 4).setValue(solucion ? "x" : "");
    }
    if (prevenir !== undefined) sheet.getRange(rowIndex, 6).setValue(prevenir);
    if (videoUrl !== undefined) sheet.getRange(rowIndex, 8).setValue(videoUrl);

    SpreadsheetApp.flush();
    return {
        status: "success",
        message: "Problema actualizado exitosamente in-modal.",
        updated: { problemId, titulo, descripcion, solucion, prevenir, videoUrl }
    };
}

/* REVISIÓN IV: EDICIÓN IN-MODAL PARA DESARROLLADORES EN TUTORIALES */
function handleUpdateTutorialItem(payload) {
    const { originalTema, tema, descripcion, videoUrl, userRole } = payload;
    if (!originalTema && !tema) throw new Error("Se requiere el tema del tutorial a editar.");

    const allowedRoles = ['Desarrollador'];
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw new Error("No tienes permisos de Desarrollador para editar este tutorial.");
    }

    if (tema && tema.length > 30) throw new Error("El tema no puede exceder 30 caracteres.");
    if (descripcion && descripcion.length > 700) throw new Error("La descripción no puede exceder 700 caracteres.");

    const sheet = getSafeSheet("Tutoriales") || getSafeSheet("Tutorial");
    if (!sheet) throw new Error("Hoja de tutoriales no encontrada.");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No hay tutoriales registrados.");

    const searchKey = originalTema || tema;
    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(5, sheet.getLastColumn())).getValues();
    let rowIndex = -1;

    for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(searchKey) || String(values[i][1]) === String(searchKey)) {
            rowIndex = i + 2;
            break;
        }
    }

    if (rowIndex === -1) throw new Error("Tutorial no encontrado.");

    if (tema !== undefined) sheet.getRange(rowIndex, 1).setValue(tema);
    if (videoUrl !== undefined) {
        sheet.getRange(rowIndex, 3).setValue(videoUrl);
        const ytid = extractYouTubeId(videoUrl);
        if (ytid) {
            sheet.getRange(rowIndex, 2).setValue(`https://img.youtube.com/vi/${ytid}/hqdefault.jpg`);
        }
    }
    if (descripcion !== undefined) sheet.getRange(rowIndex, 4).setValue(descripcion);

    SpreadsheetApp.flush();
    return {
        status: "success",
        message: "Tutorial actualizado exitosamente in-modal.",
        updated: { tema: tema || originalTema, descripcion, videoUrl }
    };
}
