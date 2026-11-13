// GPSpedia Unified API Module | Version: 2.2.5
// ============================================================================
// ÚNICA FUENTE DE VERDAD PARA LA CONFIGURACIÓN Y LÓGICA DE LA API
// ============================================================================

// 1. CONFIGURACIÓN
import { runCatalogRequestWithRetry } from './catalogRequest.js';
import { createServiceMetricsStore } from './serviceMetrics.js';

export const RICH_TEXT_MODE_KEY = "gpsepedia_rich_text_mode";
export const RICH_TEXT_MODES = Object.freeze({ STRICT: "strict", ADVANCED: "advanced" });

export function getRichTextMode() {
    try {
        return localStorage.getItem(RICH_TEXT_MODE_KEY) === RICH_TEXT_MODES.ADVANCED
            ? RICH_TEXT_MODES.ADVANCED
            : RICH_TEXT_MODES.STRICT;
    } catch (error) {
        return RICH_TEXT_MODES.STRICT;
    }
}

export function setRichTextMode(mode, actorRole) {
    const normalizedRole = String(actorRole || "").trim().toLowerCase();
    const normalizedMode = String(mode || "").trim().toLowerCase();
    if (normalizedRole !== "desarrollador") {
        throw new Error("Solo un Desarrollador puede cambiar el modo de texto enriquecido.");
    }
    if (![RICH_TEXT_MODES.STRICT, RICH_TEXT_MODES.ADVANCED].includes(normalizedMode)) {
        throw new Error("Modo de texto enriquecido no válido.");
    }
    try {
        localStorage.setItem(RICH_TEXT_MODE_KEY, normalizedMode);
        return normalizedMode;
    } catch (error) {
        throw new Error("No se pudo guardar la preferencia local de texto enriquecido.");
    }
}

export const API_ENDPOINTS = {
    LEGACY: "https://script.google.com/macros/s/AKfycbwpIFH1nX2BZEjAKbpq9HJpEGNlo_0LqD1CwxWsWFo5J0AJDdbfMrKpcsAV4ZFJzFWd/exec",
    AUTH:     "https://script.google.com/macros/s/AKfycby1-ncfuo3PV38ZqvTkdHv2uoD2mNkgS3WNo_2_ycBvcxocA0H5QsNiZoqSadR19P7SiQ/exec",
    CATALOG:  "https://script.google.com/macros/s/AKfycbxtqkdUfXAEmbPz7zfE4kZCie8sql4SM43kxkBw__5iGwXVyzzYsIFG5jpWkQc7-Ug9/exec",
    WRITE:    "https://script.google.com/macros/s/AKfycbwsRkcK8-q8hiOpaUNrU1e79WD2SH87MsZkfaFU3S19ayAC9ZMhxDuZUv0cx9iaW7cPlw/exec",
    USERS:    "https://script.google.com/macros/s/AKfycbxmXfeMt9lG-vlm-6-XGEhA5TWDZwFsXGVL23K20qZUCnqAhUKE_woieSbxKxb3ksvu3Q/exec",
    FEEDBACK: "https://script.google.com/macros/s/AKfycbxVBSXNh6xG4_jyIfsc19a4dmlSBwwBUTBlFoDjHiDqlYx_dIQ5NZxUduui4DO8AyXSRg/exec",
    UTILITIES: "https://script.google.com/macros/s/AKfycbzkGXk_kSm3rN7K5PM0RntiPAn7DlH78RkH66a2vuwZwU8KgwDufkOiPjXoUKzuHAgG/exec",
    ADMIN: "https://script.google.com/macros/s/AKfycbz06ln7lvl1MQocYUL0LkwvvPBrXzfoQ8QRsA68CILVls5gIBpTJD6sIG_Gn0gL9CG7-g/exec"
};

export const ACTION_TO_SERVICE_MAP = {
    'login': 'AUTH', 'validateSession': 'AUTH', 'touchSession': 'AUTH', 'acceptTerms': 'AUTH', 'changePassword': 'AUTH', 'resetUserPassword': 'AUTH', 'logout': 'AUTH',
    'getNavigationData': 'CATALOG', 'getCatalogData': 'CATALOG', 'getDropdownData': 'CATALOG',
    'getSuggestion': 'WRITE', 'checkVehicle': 'WRITE', 'checkOperation': 'WRITE', 'addOrUpdateCut': 'WRITE', 'addSupplementaryInfo': 'WRITE', 'checkVinDuplicate': 'WRITE', 'addVinToVehicle': 'WRITE', 'allocateVehicleId': 'WRITE', 'freezeCortesIds': 'WRITE',
    'getUsers': 'USERS', 'createUser': 'USERS', 'updateUser': 'AUTH', 'deleteUser': 'AUTH', 'updateProfile': 'USERS', 'resetUserSessions': 'AUTH',
    'recordLike': 'FEEDBACK', 'reportProblem': 'FEEDBACK', 'sendContactForm': 'FEEDBACK', 'addTutorial': 'FEEDBACK', 'suggestYear': 'FEEDBACK', 'suggestCutChange': 'FEEDBACK', 'getPysData': 'FEEDBACK', 'addProblem': 'FEEDBACK', 'addSolution': 'FEEDBACK', 'addPrevention': 'FEEDBACK', 'addVehicleToProblem': 'FEEDBACK',
    'getFeedbackItems': 'FEEDBACK', 'replyToFeedback': 'FEEDBACK', 'markAsResolved': 'FEEDBACK', 'getActivityLogs': 'FEEDBACK', 'deleteFeedbackItem': 'FEEDBACK', 'clearActivityLogs': 'FEEDBACK', 'clearSensitiveLogs': 'AUTH',
    'getInboxRecipients': 'FEEDBACK', 'getInboxConversations': 'FEEDBACK', 'getInboxMessages': 'FEEDBACK', 'createInboxConversation': 'FEEDBACK', 'sendInboxMessage': 'FEEDBACK', 'markInboxRead': 'FEEDBACK', 'archiveInboxConversation': 'FEEDBACK',
    'initYouTubeUpload': 'FEEDBACK', 'getVideoApprovalByOperation': 'FEEDBACK', 'submitVideoForApproval': 'FEEDBACK', 'approveVideo': 'FEEDBACK', 'rejectVideo': 'FEEDBACK',
    'removeVehicleFromProblem': 'FEEDBACK', 'updatePysItem': 'FEEDBACK', 'updateTutorialItem': 'FEEDBACK',
    'migrateTimestamps': 'UTILITIES',
    'ping': 'ADMIN', 'migrateCortesOperationIds': 'ADMIN', 'reconcilePendingImageUploads': 'ADMIN',
    'backupDatabase': 'ADMIN', 'backupDrive': 'ADMIN', 'restoreDatabase': 'ADMIN', 'restoreDrive': 'ADMIN',
    'reorganizeDatabase': 'ADMIN', 'normalizeImages': 'ADMIN', 'organizePrimaryVehicleImages': 'ADMIN', 'restoreAllTrashedImages': 'ADMIN', 'addLogo': 'ADMIN', 'createSheet': 'ADMIN', 'addColumn': 'ADMIN', 'driveCommand': 'ADMIN',
    'updateVehicleField': 'ADMIN', 'uploadAdminImage': 'ADMIN', 'getAdminImageUploadStatus': 'ADMIN',
    'getReplacedImages': 'ADMIN', 'getDriveStorage': 'ADMIN', 'recoverReplacedImage': 'ADMIN', 'deleteReplacedImage': 'ADMIN', 'auditDriveImagesInCortes': 'ADMIN', 'saveUnusedImagesInventory': 'ADMIN',
    'getCortesImageFolders': 'ADMIN', 'createCortesImageFolder': 'ADMIN', 'moveReplacedImage': 'ADMIN', 'getReplacedImageDownloadUrl': 'ADMIN',
    'logFrontend': 'LEGACY'
};

/**
 * Rutas directas históricas conservadas por compatibilidad. No son el destino
 * canónico de routeAction: los clientes actuales usan ACTION_TO_SERVICE_MAP.
 * ADMIN exige sesión Desarrollador antes de despachar estas tres acciones.
 */
export const SERVICE_COMPATIBILITY_ACTIONS = {
    CATALOG: ['getSuggestion'],
    ADMIN: ['checkOperation', 'addOrUpdateCut', 'addSupplementaryInfo']
};

/**
 * Acciones cuyo dispatcher pertenece a un proyecto Apps Script externo al repo.
 * logFrontend sigue siendo consumida directamente por users.html (remoteLog).
 */
export const EXTERNAL_ACTIONS = {
    logFrontend: { service: 'LEGACY', consumer: 'users.html: remoteLog', source: 'deployment externo no versionado en este repositorio' }
};

const serviceMetricsStore = createServiceMetricsStore();
function recordServiceMetric(event) {
    try { serviceMetricsStore.record(event); }
    catch (error) { console.error("No se pudo registrar la métrica local:", error); }
}
export function getServiceMetricsSnapshot() {
    return serviceMetricsStore.getSnapshot();
}
export function subscribeServiceMetrics(listener) {
    return serviceMetricsStore.subscribe(listener);
}

function createRouteActionError_(message, options = {}) {
    const source = options && typeof options === "object" ? options : {};
    const statusValue = Number(source.httpStatus);
    const httpStatus = Number.isInteger(statusValue) && statusValue >= 100 && statusValue <= 599
        ? statusValue : null;
    const error = new Error(String(message || "No se pudo completar la solicitud."));
    error.name = "RouteActionError";
    error.kind = String(source.kind || "unknown");
    error.code = String(source.code || "ROUTE_ACTION_ERROR");
    error.httpStatus = httpStatus;
    error.hasHttpResponse = httpStatus !== null;
    if (error.kind === "http" && httpStatus !== null) error.status = httpStatus;
    if (source.details !== undefined) error.details = source.details;
    if (source.cause) error.cause = source.cause;
    return error;
}

const sessionTouchState=new Map();
const SESSION_TOUCH_INTERVAL_MS=5*60*1000;
async function ensureSessionTouched_(token){
 const now=Date.now();let state=sessionTouchState.get(token);
 if(state&&state.pending)return state.pending;
 if(state&&state.lastSuccess&&now-state.lastSuccess<SESSION_TOUCH_INTERVAL_MS)return;
 if(!state)state={lastSuccess:0,pending:null};
 const pending=routeAction('touchSession',{sessionToken:token}).then(result=>{
  if(!result||result.valid!==true)throw createRouteActionError_("La sesión no es válida o ha expirado.",{kind:"application",code:"SESSION_INVALID",httpStatus:null});
  state.lastSuccess=Date.now();
  try{const raw=localStorage.getItem('gpsepedia_session');if(raw){const user=JSON.parse(raw);if(user&&user.SessionToken===token){user.SessionLastActivityAt=result.lastActivityAt||new Date().toISOString();localStorage.setItem('gpsepedia_session',JSON.stringify(user));}}}catch(e){console.warn('No se pudo actualizar la actividad local:',e.message);}
 }).finally(()=>{state.pending=null;sessionTouchState.set(token,state);});
 state.pending=pending;sessionTouchState.set(token,state);return pending;
}

// 2. LÓGICA DE RUTEO CENTRAL
export async function routeAction(action, payload = {}, serviceOverride = null, requestOptions = {}) {
    const service = serviceOverride || ACTION_TO_SERVICE_MAP[action];
    if (!service) throw new Error(`Acción no definida: ${action}`);
    const targetUrl = API_ENDPOINTS[service];
    if (!targetUrl) throw new Error(`Servicio no configurado: ${service}`);
    const requestStartedAt = Date.now();
    let outcome = "network_error", httpStatus = null;
    try {
        const token=payload&&typeof payload==='object'&&typeof payload.sessionToken==='string'?payload.sessionToken:'';
        if(token&&!['login','validateSession','touchSession','logout'].includes(action)) {
            try {
                await ensureSessionTouched_(token);
            } catch (sessionError) {
                const sessionKind = String(sessionError && sessionError.kind || "");
                outcome = sessionKind === "http" ? "http_error" :
                    sessionKind === "application" ? "api_error" :
                    sessionKind === "invalid_response" ? "invalid_response" : "network_error";
                httpStatus = sessionError && sessionError.httpStatus !== undefined ? sessionError.httpStatus : null;
                throw sessionError;
            }
        }
        let response;
        try {
            response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action, payload }),
                redirect: 'follow',
                signal: requestOptions && requestOptions.signal ? requestOptions.signal : undefined
            });
        } catch (fetchError) {
            const aborted = Boolean(requestOptions && requestOptions.signal && requestOptions.signal.aborted) ||
                Boolean(fetchError && fetchError.name === "AbortError");
            outcome = "network_error";
            throw createRouteActionError_(
                aborted ? "La solicitud fue cancelada o agotó el tiempo de espera." :
                    "No se recibió respuesta del servidor: " + String(fetchError && fetchError.message || "fallo de conexión."),
                { kind: aborted ? "abort" : "network", code: aborted ? "REQUEST_ABORTED" : "NETWORK_ERROR", httpStatus: null, cause: fetchError }
            );
        }
        const receivedStatus = Number(response && response.status);
        httpStatus = Number.isInteger(receivedStatus) && receivedStatus >= 100 && receivedStatus <= 599
            ? receivedStatus : null;
        if (!response || httpStatus === null) {
            outcome = "network_error";
            throw createRouteActionError_("No se recibió una respuesta HTTP válida del servidor.", {
                kind: "network", code: "NO_HTTP_RESPONSE", httpStatus: null
            });
        }
        if (!response.ok) {
            outcome = "http_error";
            const statusText = String(response.statusText || "").trim();
            throw createRouteActionError_(
                "Error HTTP " + httpStatus + (statusText ? ": " + statusText : "."),
                { kind: "http", code: "HTTP_ERROR", httpStatus }
            );
        }
        let text;
        try {
            text = await response.text();
        } catch (readError) {
            outcome = "invalid_response";
            throw createRouteActionError_("No se pudo leer el cuerpo de la respuesta del servidor.", {
                kind: "invalid_response", code: "RESPONSE_READ_ERROR", httpStatus, cause: readError
            });
        }
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            outcome = "invalid_response";
            throw createRouteActionError_("La respuesta del servidor no tiene un formato JSON válido.", {
                kind: "invalid_response", code: "INVALID_JSON", httpStatus, cause: parseError
            });
        }
        if (!result || typeof result !== "object" || Array.isArray(result)) {
            outcome = "invalid_response";
            throw createRouteActionError_("La respuesta del servidor no contiene un objeto válido.", {
                kind: "invalid_response", code: "INVALID_RESPONSE", httpStatus
            });
        }
        if (result.status === 'error') {
            outcome = "api_error";
            const detailMessage = typeof result.details === "string" ? result.details :
                result.details && typeof result.details.errorMessage === "string" ? result.details.errorMessage : "";
            const errorMessage = [String(result.message || "El servicio rechazó la operación."), detailMessage]
                .filter(Boolean).join(": ");
            throw createRouteActionError_(errorMessage, {
                kind: "application", code: String(result.code || "API_ERROR"), httpStatus, details: result.details
            });
        }
        outcome = "success";
        return result;
    } finally {
        try {
            recordServiceMetric({ service, action, timestamp: requestStartedAt,
                durationMs: Date.now() - requestStartedAt, outcome, httpStatus });
        } catch (metricError) { console.error("No se pudo registrar la métrica local:", metricError); }
    }
}

// 3. FUNCIONES DE CONVENIENCIA (HELPERS)
function createLoginRequestId_() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + '_' + Math.random().toString(36).slice(2);
}

function loginRequestStorageKey_(username) {
    return 'gpsepedia_pending_login_' + encodeURIComponent(String(username || '').trim().toLowerCase());
}

export async function login(username, password) {
    const key = loginRequestStorageKey_(username);
    let requestId = '';
    try { requestId = sessionStorage.getItem(key) || ''; } catch (error) {}
    if (!requestId) {
        requestId = createLoginRequestId_();
        try { sessionStorage.setItem(key, requestId); } catch (error) {}
    }
    try {
        const result = await routeAction('login', { username, password, requestId });
        return { ...result, loginRequestId: requestId };
    } catch (error) {
        if (String(error && error.message || '').includes('LOGIN_REQUEST_ALREADY_REVOKED')) {
            try { sessionStorage.removeItem(key); } catch (storageError) {}
        }
        throw error;
    }
}

export function completeLoginRequest(username, requestId) {
    if (!requestId) return;
    const key = loginRequestStorageKey_(username);
    try {
        if (sessionStorage.getItem(key) === requestId) sessionStorage.removeItem(key);
    } catch (error) {}
}

export async function validateSession(userId, sessionToken, signal = null) {
    return await routeAction('validateSession', { userId, sessionToken }, null, signal ? { signal } : {});
}

export async function fetchCatalogData(options = {}) {
    return runCatalogRequestWithRetry(signal => routeAction('getCatalogData', {}, null, { signal }), options);
}

export async function getFeedbackItems(sessionPayload = {}, pageOptions = {}) {
    const pagination = pageOptions && typeof pageOptions === 'object' ? pageOptions : {};
    return await routeAction('getFeedbackItems', { ...sessionPayload, cursor: pagination.cursor, pageSize: pagination.pageSize });
}

export async function getInboxRecipients(sessionPayload = {}) {
    return await routeAction('getInboxRecipients', { ...sessionPayload });
}
export async function getInboxConversations(sessionPayload = {}, options = {}) {
    const source = options && typeof options === 'object' ? options : {};
    return await routeAction('getInboxConversations', { ...sessionPayload, cursor: source.cursor, pageSize: source.pageSize, folder: source.folder, query: source.query });
}
export async function getInboxMessages(conversationId, sessionPayload = {}, options = {}) {
    const source = options && typeof options === 'object' ? options : {};
    return await routeAction('getInboxMessages', { ...sessionPayload, conversationId, cursor: source.cursor, pageSize: source.pageSize });
}
export async function createInboxConversation(payload = {}) {
    return await routeAction('createInboxConversation', payload);
}
export async function sendInboxMessage(payload = {}) {
    return await routeAction('sendInboxMessage', payload);
}
export async function markInboxRead(conversationId, throughMessageId, sessionPayload = {}) {
    return await routeAction('markInboxRead', { ...sessionPayload, conversationId, throughMessageId });
}
export async function archiveInboxConversation(conversationId, archived, sessionPayload = {}) {
    return await routeAction('archiveInboxConversation', { ...sessionPayload, conversationId, archived });
}

export async function replyToFeedback(itemId, itemType, replyText, responderName, sessionPayload = {}) {
    return await routeAction('replyToFeedback', { itemId, itemType, replyText, responderName, ...sessionPayload });
}

export async function markAsResolved(itemId, sessionPayload = {}) {
    return await routeAction('markAsResolved', { itemId, ...sessionPayload });
}

export async function deleteFeedbackItem(id, type, sessionPayload = {}) {
    return await routeAction('deleteFeedbackItem', { id, type, ...sessionPayload });
}

export async function clearActivityLogs(keepLastWeek = false, sessionPayload = {}) {
    return await routeAction('clearActivityLogs', { keepLastWeek, ...sessionPayload });
}

export async function clearSensitiveLogs(sessionPayload = {}) {
    return await routeAction('clearSensitiveLogs', sessionPayload);
}

export async function getActivityLogs(sessionPayload = {}) {
    return await routeAction('getActivityLogs', sessionPayload);
}

export async function recordLike(vehicleId, corteIndex, sessionPayload = {}) {
    return await routeAction("recordLike", { ...sessionPayload, vehicleId, corteIndex });
}

export async function reportProblem(vehicleId, problemDescription, reportContext = {}, sessionPayload = {}, imageAttachment = null) {
    const context = reportContext && typeof reportContext === "object" ? reportContext : {};
    return await routeAction("reportProblem", {
        ...sessionPayload, vehicleId, problemText: problemDescription,
        reportId: context.reportId, corteIndex: context.corteIndex,
        activaTestigoMotor: context.activaTestigoMotor,
        imageAttachment: imageAttachment || null
    });
}

export async function suggestYear(vehicleId, newYear, responseText, actorPayload = {}) {
    const actor = actorPayload && typeof actorPayload === "object" ? {
        userId: actorPayload.userId,
        sessionToken: actorPayload.sessionToken,
    } : {};
    return await routeAction("suggestYear", { ...actor, vehicleId, newYear, response: responseText });
}

export async function sendContactForm(formData) {
    return await routeAction('sendContactForm', formData);
}

export async function suggestCutChange(data, sessionPayload = {}) {
    const actor = sessionPayload && typeof sessionPayload === "object" ? {
        userId: sessionPayload.userId,
        sessionToken: sessionPayload.sessionToken
    } : {};
    const suggestion = data && typeof data === "object" ? data : {};
    return await routeAction("suggestCutChange", { ...suggestion, ...actor });
}

export async function addTutorial(data) {
    return await routeAction("addTutorial", data);
}

export const SERVICE_HEALTH_CONTRACTS = Object.freeze({
    AUTH: "GPSpedia-Auth",
    CATALOG: "GPSpedia-Catalog",
    WRITE: "GPSpedia-Write",
    USERS: "GPSpedia-Users",
    FEEDBACK: "GPSpedia-Feedback",
    UTILITIES: "GPSpedia-Utilities",
    ADMIN: "GPSpedia-Admin",
    LEGACY: null
});
export const SERVICE_HEALTH_TIMEOUT_MS = 8000;
export const SERVICE_HEALTH_SLOW_THRESHOLD_MS = 2000;
export const SERVICE_HEALTH_STALE_AFTER_MS = 5 * 60 * 1000;
const serviceHealthLastKnown = new Map();

export async function checkAllServicesHealth(options = {}) {
    const settings = options && typeof options === "object" ? options : {};
    const timeoutMs = Number.isFinite(settings.timeoutMs) && settings.timeoutMs > 0
        ? Math.min(30000, Math.round(settings.timeoutMs)) : SERVICE_HEALTH_TIMEOUT_MS;
    const slowThresholdMs = Number.isFinite(settings.slowThresholdMs) && settings.slowThresholdMs >= 0
        ? settings.slowThresholdMs : SERVICE_HEALTH_SLOW_THRESHOLD_MS;
    const staleAfterMs = Number.isFinite(settings.staleAfterMs) && settings.staleAfterMs >= 0
        ? settings.staleAfterMs : SERVICE_HEALTH_STALE_AFTER_MS;
    const fetchImpl = typeof settings.fetchImpl === "function" ? settings.fetchImpl : (typeof fetch === "function" ? fetch : null);
    const now = typeof settings.now === "function" ? settings.now : Date.now;
    const lastKnown = settings.lastKnown instanceof Map ? settings.lastKnown : serviceHealthLastKnown;
    const results = {};

    function makeResult(status, startTime, checkedAtMs, details = {}) {
        return Object.assign({
            status,
            latency: Math.max(0, checkedAtMs - startTime),
            code: null,
            errorCode: null,
            checkedAt: new Date(checkedAtMs).toISOString(),
            lastSuccessfulAt: null,
            lastKnownStatus: null,
            metadata: null,
            error: null
        }, details);
    }

    function applyStaleFallback(serviceKey, result, checkedAtMs) {
        if (!["error", "unavailable", "unknown"].includes(result.status)) return result;
        const previous = lastKnown.get(serviceKey);
        if (!previous || checkedAtMs - previous.checkedAtMs < staleAfterMs) return result;
        result.status = "stale";
        result.metadata = previous.metadata;
        result.lastSuccessfulAt = previous.checkedAt;
        result.lastKnownStatus = previous.status;
        return result;
    }

    await Promise.all(Object.keys(API_ENDPOINTS).map(async serviceKey => {
        const startTime = now();
        const expectedIdentity = Object.prototype.hasOwnProperty.call(SERVICE_HEALTH_CONTRACTS, serviceKey)
            ? SERVICE_HEALTH_CONTRACTS[serviceKey] : undefined;
        let controller = null;
        let timeoutId = null;
        let result;

        try {
            if (expectedIdentity === undefined || expectedIdentity === null) {
                result = makeResult("unknown", startTime, now(), {
                    errorCode: expectedIdentity === null ? "HEALTH_IDENTITY_UNVERIFIED" : "HEALTH_CONTRACT_UNDEFINED",
                    error: expectedIdentity === null
                        ? "El deployment LEGACY es externo y no tiene una identidad verificable desde este repositorio; no se consulta."
                        : "No existe un contrato de identidad configurado para este servicio; no se consulta."
                });
            } else if (typeof fetchImpl !== "function") {
                const checkedAtMs = now();
                result = makeResult("error", startTime, checkedAtMs, {
                    errorCode: "FETCH_UNAVAILABLE",
                    error: "La API de red no está disponible en este navegador."
                });
            } else if (typeof AbortController !== "function") {
                const checkedAtMs = now();
                result = makeResult("error", startTime, checkedAtMs, {
                    errorCode: "ABORT_CONTROLLER_UNAVAILABLE",
                    error: "No se puede limitar el tiempo de espera de esta comprobación."
                });
            } else {
                controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                const response = await fetchImpl(API_ENDPOINTS[serviceKey] + "?debug=true", {
                    method: "GET",
                    redirect: "follow",
                    signal: controller.signal
                });
                const httpStatus = response && Number.isInteger(response.status) ? response.status : null;
                let checkedAtMs = now();
                let latency = Math.max(0, checkedAtMs - startTime);

                if (!response || typeof response.text !== "function") {
                    result = makeResult("unknown", startTime, checkedAtMs, {
                        latency,
                        httpStatus,
                        errorCode: "INVALID_HTTP_RESPONSE",
                        error: "El endpoint no devolvió una respuesta HTTP reconocible."
                    });
                } else if (response.ok !== true) {
                    const unavailable = httpStatus !== null && httpStatus >= 500;
                    result = makeResult(unavailable ? "unavailable" : "error", startTime, checkedAtMs, {
                        latency,
                        httpStatus,
                        errorCode: httpStatus === null ? "HTTP_ERROR" : "HTTP_" + httpStatus,
                        error: httpStatus === null ? "La respuesta HTTP no contiene un código verificable." : "El endpoint respondió HTTP " + httpStatus + "."
                    });
                } else {
                    let body;
                    try {
                        body = await response.text();
                        checkedAtMs = now();
                        latency = Math.max(0, checkedAtMs - startTime);
                    } catch (readError) {
                        checkedAtMs = now();
                        latency = Math.max(0, checkedAtMs - startTime);
                        const timedOut = Boolean(controller && controller.signal.aborted);
                        result = makeResult(timedOut ? "unavailable" : "error", startTime, checkedAtMs, {
                            latency,
                            httpStatus,
                            errorCode: timedOut ? "TIMEOUT" : "RESPONSE_READ_ERROR",
                            error: timedOut ? "Tiempo de espera agotado (" + timeoutMs + " ms)." : "No se pudo leer el cuerpo de la respuesta HTTP."
                        });
                    }

                    if (!result) {
                        let data;
                        try {
                            data = JSON.parse(body);
                        } catch (parseError) {
                            data = null;
                        }

                        if (!data || typeof data !== "object" || Array.isArray(data)) {
                            result = makeResult("unknown", startTime, checkedAtMs, {
                                latency,
                                httpStatus,
                                errorCode: "INVALID_HEALTH_JSON",
                                error: "La respuesta está vacía, no es JSON válido o no contiene un objeto de estado."
                            });
                        } else if (data.service !== expectedIdentity) {
                            result = makeResult("unknown", startTime, checkedAtMs, {
                                latency,
                                httpStatus,
                                errorCode: "SERVICE_IDENTITY_MISMATCH",
                                error: "La identidad reportada no coincide con el servicio esperado."
                            });
                        } else if (typeof data.status !== "string") {
                            result = makeResult("unknown", startTime, checkedAtMs, {
                                latency,
                                httpStatus,
                                errorCode: "HEALTH_STATUS_MISSING",
                                error: "El contrato no contiene un estado reconocible."
                            });
                        } else {
                            const reportedStatus = data.status.trim().toLowerCase();
                            let version = null;
                            if (data.version !== undefined && data.version !== null) {
                                if (typeof data.version !== "string" || !/^[A-Za-z0-9._+-]{1,40}$/.test(data.version.trim())) {
                                    result = makeResult("unknown", startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        errorCode: "HEALTH_VERSION_INVALID",
                                        error: "La versión reportada no cumple el contrato."
                                    });
                                } else {
                                    version = data.version.trim();
                                }
                            }

                            if (!result) {
                                const metadata = {
                                    service: expectedIdentity,
                                    version,
                                    reportedStatus
                                };
                                if (reportedStatus === "available" || reportedStatus === "online") {
                                    const status = latency >= slowThresholdMs ? "slow" : "online";
                                    result = makeResult(status, startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        metadata
                                    });
                                    lastKnown.set(serviceKey, {
                                        status,
                                        metadata,
                                        checkedAtMs,
                                        checkedAt: result.checkedAt
                                    });
                                    result.lastSuccessfulAt = result.checkedAt;
                                } else if (reportedStatus === "unavailable" || reportedStatus === "offline") {
                                    result = makeResult("unavailable", startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        metadata,
                                        errorCode: "BACKEND_UNAVAILABLE",
                                        error: "El servicio reportó que no está disponible."
                                    });
                                } else if (reportedStatus === "error" || reportedStatus === "failed" || reportedStatus === "degraded") {
                                    result = makeResult("error", startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        metadata,
                                        errorCode: "BACKEND_ERROR",
                                        error: "El servicio reportó un estado de error."
                                    });
                                } else if (reportedStatus === "stale") {
                                    result = makeResult("stale", startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        metadata,
                                        errorCode: "BACKEND_STALE",
                                        error: "El servicio reportó información desactualizada."
                                    });
                                } else {
                                    result = makeResult("unknown", startTime, checkedAtMs, {
                                        latency,
                                        httpStatus,
                                        metadata,
                                        errorCode: "HEALTH_STATUS_UNKNOWN",
                                        error: "El servicio reportó un estado no reconocido."
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            const checkedAtMs = now();
            const timedOut = Boolean(controller && controller.signal.aborted);
            const networkFailure = timedOut || (error && (error.name === "TypeError" || error.name === "AbortError"));
            result = makeResult(networkFailure ? "unavailable" : "error", startTime, checkedAtMs, {
                errorCode: timedOut ? "TIMEOUT" : networkFailure ? "NETWORK_ERROR" : "HEALTH_CHECK_ERROR",
                error: timedOut ? "Tiempo de espera agotado (" + timeoutMs + " ms)." :
                    networkFailure ? "No se recibió una respuesta de red del servicio." :
                        "No se pudo completar la comprobación de salud."
            });
        } finally {
            if (timeoutId !== null) clearTimeout(timeoutId);
        }

        const checkedAtMs = Date.parse(result.checkedAt);
        results[serviceKey] = applyStaleFallback(serviceKey, result, Number.isFinite(checkedAtMs) ? checkedAtMs : now());
    }));

    return results;
}
export async function approveVideo(itemId, approverName, userRole, sessionPayload = {}) {
    // El rol y el nombre del aprobador se derivan en FEEDBACK desde la sesión validada.
    return await routeAction("approveVideo", { itemId, ...sessionPayload });
}

export async function rejectVideo(itemId, rejecterName, reason, userRole, sessionPayload = {}) {
    // El rol y el nombre del revisor se derivan en FEEDBACK desde la sesión validada.
    return await routeAction("rejectVideo", { itemId, reason, ...sessionPayload });
}
