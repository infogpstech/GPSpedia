// GPSpedia Unified API Module | Version: 2.2.5
// ============================================================================
// ÚNICA FUENTE DE VERDAD PARA LA CONFIGURACIÓN Y LÓGICA DE LA API
// ============================================================================

// 1. CONFIGURACIÓN
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
    'login': 'AUTH', 'validateSession': 'AUTH',
    'getNavigationData': 'CATALOG', 'getCatalogData': 'CATALOG', 'getDropdownData': 'CATALOG',
    'getSuggestion': 'WRITE', 'checkVehicle': 'WRITE', 'addCorte': 'WRITE', 'checkOperation': 'WRITE', 'addOrUpdateCut': 'WRITE', 'addSupplementaryInfo': 'WRITE', 'checkVinDuplicate': 'WRITE', 'addVinToVehicle': 'WRITE',
    'getUsers': 'USERS', 'createUser': 'USERS', 'updateUser': 'USERS', 'deleteUser': 'USERS', 'changePassword': 'USERS', 'updateProfile': 'USERS', 'resetUserSessions': 'USERS',
    'recordLike': 'FEEDBACK', 'reportProblem': 'FEEDBACK', 'sendContactForm': 'FEEDBACK', 'addTutorial': 'FEEDBACK', 'suggestYear': 'FEEDBACK', 'suggestCutChange': 'FEEDBACK', 'getPysData': 'FEEDBACK', 'addProblem': 'FEEDBACK', 'addSolution': 'FEEDBACK', 'addPrevention': 'FEEDBACK', 'addVehicleToProblem': 'FEEDBACK',
    'getFeedbackItems': 'FEEDBACK', 'replyToFeedback': 'FEEDBACK', 'markAsResolved': 'FEEDBACK', 'getActivityLogs': 'FEEDBACK', 'deleteFeedbackItem': 'FEEDBACK', 'clearActivityLogs': 'FEEDBACK', 'clearSensitiveLogs': 'FEEDBACK',
    'initYouTubeUpload': 'FEEDBACK', 'submitVideoForApproval': 'FEEDBACK', 'approveVideo': 'FEEDBACK', 'rejectVideo': 'FEEDBACK',
    'removeVehicleFromProblem': 'FEEDBACK', 'updatePysItem': 'FEEDBACK', 'updateTutorialItem': 'FEEDBACK',
    'migrateYearRanges': 'UTILITIES', 'migrateTimestamps': 'UTILITIES',
    'ping': 'ADMIN', 'migrateCortesOperationIds': 'ADMIN',
    'backupDatabase': 'ADMIN', 'backupDrive': 'ADMIN', 'restoreDatabase': 'ADMIN', 'restoreDrive': 'ADMIN',
    'reorganizeDatabase': 'ADMIN', 'normalizeImages': 'ADMIN', 'restoreAllTrashedImages': 'ADMIN', 'addLogo': 'ADMIN', 'createSheet': 'ADMIN', 'addColumn': 'ADMIN', 'driveCommand': 'ADMIN',
    'updateVehicleField': 'ADMIN', 'uploadAdminImage': 'ADMIN',
    'getReplacedImages': 'ADMIN', 'getDriveStorage': 'ADMIN', 'recoverReplacedImage': 'ADMIN', 'deleteReplacedImage': 'ADMIN', 'auditDriveImagesInCortes': 'ADMIN', 'saveUnusedImagesInventory': 'ADMIN',
    'getCortesImageFolders': 'ADMIN', 'createCortesImageFolder': 'ADMIN', 'moveReplacedImage': 'ADMIN', 'getReplacedImageDownloadUrl': 'ADMIN',
    'logFrontend': 'LEGACY'
};

const SERVICE_METRIC_WINDOW_MS = 15 * 60 * 1000;
const SERVICE_METRIC_MAX_EVENTS = 600;
const serviceMetricEvents = [];
const serviceMetricListeners = new Set();
const serviceMetricSessionStartedAt = Date.now();
function recordServiceMetric(event) {
    const timestamp = Number(event.timestamp) || Date.now();
    serviceMetricEvents.push({
        service: String(event.service || "UNKNOWN"),
        action: String(event.action || "unknown"),
        timestamp,
        durationMs: Math.max(0, Number(event.durationMs) || 0),
        outcome: String(event.outcome || "unknown"),
        httpStatus: event.httpStatus === null || event.httpStatus === undefined ? null :
            Number.isFinite(Number(event.httpStatus)) ? Number(event.httpStatus) : null
    });
    const cutoff = Date.now() - SERVICE_METRIC_WINDOW_MS;
    while (serviceMetricEvents.length > SERVICE_METRIC_MAX_EVENTS ||
        (serviceMetricEvents.length && serviceMetricEvents[0].timestamp < cutoff)) serviceMetricEvents.shift();
    const snapshot = getServiceMetricsSnapshot();
    serviceMetricListeners.forEach(listener => {
        try { listener(snapshot); } catch (error) { console.error("Error notificando métricas locales:", error); }
    });
}
export function getServiceMetricsSnapshot() {
    const now = Date.now(), cutoff = now - SERVICE_METRIC_WINDOW_MS;
    while (serviceMetricEvents.length && serviceMetricEvents[0].timestamp < cutoff) serviceMetricEvents.shift();
    return { windowMs: SERVICE_METRIC_WINDOW_MS, sessionStartedAt: serviceMetricSessionStartedAt,
        capturedAt: now, events: serviceMetricEvents.map(event => ({ ...event })) };
}
export function subscribeServiceMetrics(listener) {
    if (typeof listener !== "function") return () => {};
    serviceMetricListeners.add(listener);
    return () => serviceMetricListeners.delete(listener);
}

// 2. LÓGICA DE RUTEO CENTRAL
export async function routeAction(action, payload = {}, serviceOverride = null) {
    const service = serviceOverride || ACTION_TO_SERVICE_MAP[action];
    if (!service) throw new Error(`Acción no definida: ${action}`);
    let targetUrl = API_ENDPOINTS[service];
    if (!targetUrl) targetUrl = API_ENDPOINTS.LEGACY;
    const requestStartedAt = Date.now();
    let outcome = "network_error", httpStatus = null;
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, payload }),
            redirect: 'follow'
        });
        httpStatus = response.status;
        if (!response.ok) {
            outcome = "http_error";
            throw new Error(`Error de red: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        let result;
        try { result = JSON.parse(text); }
        catch (e) {
            outcome = "invalid_response";
            throw new Error("La respuesta del servidor no tiene un formato válido.");
        }
        if (!result || typeof result !== "object") {
            outcome = "invalid_response";
            throw new Error("La respuesta del servidor no contiene un objeto válido.");
        }
        if (result.status === 'error') {
            outcome = "api_error";
            const errorMessage = result.details ? `${result.message}: ${result.details.errorMessage}` : result.message;
            throw new Error(errorMessage);
        }
        outcome = "success";
        return result;
    } finally {
        try {
            recordServiceMetric({ service, action, timestamp: Date.now(),
                durationMs: Date.now() - requestStartedAt, outcome, httpStatus });
        } catch (metricError) { console.error("No se pudo registrar la métrica local:", metricError); }
    }
}

// 3. FUNCIONES DE CONVENIENCIA (HELPERS)
export async function login(username, password) {
    return await routeAction('login', { username, password });
}

export async function validateSession(userId, sessionToken) {
    return await routeAction('validateSession', { userId, sessionToken });
}

export async function fetchCatalogData() {
    return await routeAction('getCatalogData');
}

export async function getFeedbackItems(sessionPayload = {}) {
    return await routeAction('getFeedbackItems', sessionPayload);
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

export async function recordLike(vehicleId, corteIndex, userId, userName) {
    return await routeAction('recordLike', { vehicleId, corteIndex, userId, userName });
}

export async function reportProblem(vehicleId, problemDescription, userId, userName) {
    return await routeAction('reportProblem', { vehicleId, problemText: problemDescription, userId, userName });
}

export async function suggestYear(vehicleId, newYear, responseText, userId, userName) {
    return await routeAction('suggestYear', { vehicleId, newYear, response: responseText, userId, userName });
}

export async function sendContactForm(formData) {
    return await routeAction('sendContactForm', formData);
}

export async function suggestCutChange(data) {
    return await routeAction("suggestCutChange", data);
}

export async function addTutorial(data) {
    return await routeAction("addTutorial", data);
}

export async function checkAllServicesHealth() {
    const services = Object.keys(API_ENDPOINTS), results = {}, timeoutMs = 8000;
    await Promise.all(services.map(async srvKey => {
        const url = API_ENDPOINTS[srvKey], start = Date.now();
        let controller = null, timeoutId = null;
        try {
            if (typeof AbortController !== "function") throw new Error("El navegador no admite AbortController para limitar el tiempo de espera.");
            controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(`${url}?debug=true`, { method: "GET", redirect: "follow", signal: controller.signal });
            let debugData = null;
            try { debugData = JSON.parse(await res.text()); } catch (parseError) { debugData = null; }
            const reportedStatus = debugData && typeof debugData.status === "string" ? debugData.status : null;
            const reportedFailure = ["error", "offline", "unavailable", "failed"].includes(String(reportedStatus || "").toLowerCase());
            const metadata = debugData && typeof debugData === "object" ? {
                service: typeof debugData.service === "string" ? debugData.service : null,
                version: typeof debugData.version === "string" ? debugData.version : null,
                reportedStatus,
                sheetsAccessed: Array.isArray(debugData.sheetsAccessed) ? debugData.sheetsAccessed.filter(v => typeof v === "string") : [],
                cacheStatus: debugData.cacheStatus && typeof debugData.cacheStatus.isCached === "boolean"
                    ? { isCached: debugData.cacheStatus.isCached } : null
            } : null;
            results[srvKey] = {
                status: res.ok && !reportedFailure ? "online" : "error",
                latency: Date.now() - start, code: res.status, checkedAt: new Date().toISOString(),
                metadata,
                metadataAvailable: Boolean(metadata && (metadata.service || metadata.version || metadata.reportedStatus || metadata.sheetsAccessed.length || metadata.cacheStatus)),
                error: !res.ok ? `HTTP ${res.status}` : null
            };
        } catch (err) {
            results[srvKey] = {
                status: "offline", latency: Date.now() - start, checkedAt: new Date().toISOString(),
                metadata: null, metadataAvailable: false,
                error: controller && controller.signal.aborted ? `Tiempo de espera agotado (${timeoutMs} ms).` : err.message
            };
        } finally {
            if (timeoutId !== null) clearTimeout(timeoutId);
        }
    }));
    return results;
}

export async function approveVideo(itemId, approverName, userRole, sessionPayload = {}) {
    return await routeAction("approveVideo", { itemId, approverName, userRole, ...sessionPayload });
}

export async function rejectVideo(itemId, rejecterName, reason, userRole, sessionPayload = {}) {
    return await routeAction("rejectVideo", { itemId, rejecterName, reason, userRole, ...sessionPayload });
}
