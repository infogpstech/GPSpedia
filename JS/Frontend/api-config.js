// GPSpedia Unified API Module | Version: 2.2.5
// ============================================================================
// ÚNICA FUENTE DE VERDAD PARA LA CONFIGURACIÓN Y LÓGICA DE LA API
// ============================================================================

// 1. CONFIGURACIÓN
import { runCatalogRequestWithRetry } from './catalogRequest.js';
import { recordBrowserServiceTraffic } from './serviceTelemetry.js';
import { createCentralConfigurationCache, resolveCentralServiceEndpoint } from './centralConfigurationCache.js';
import { invalidateSessionActorCaches } from './sessionCacheInvalidation.js';

const centralConfigurationCache_ = createCentralConfigurationCache();

export const RICH_TEXT_MODE_KEY = "gpsepedia_rich_text_mode_cache";
export const RICH_TEXT_MODES = Object.freeze({ STRICT: "strict", ADVANCED: "advanced" });

function normalizeRichTextMode_(value) {
    const mode = String(value || "").trim().toLowerCase();
    return [RICH_TEXT_MODES.STRICT, RICH_TEXT_MODES.ADVANCED].includes(mode) ? mode : null;
}

export function getRichTextMode() {
    try {
        return localStorage.getItem(RICH_TEXT_MODE_KEY) === RICH_TEXT_MODES.ADVANCED
            ? RICH_TEXT_MODES.ADVANCED
            : RICH_TEXT_MODES.STRICT;
    } catch (error) {
        return RICH_TEXT_MODES.STRICT;
    }
}

function cacheRichTextMode_(mode) {
    try { localStorage.setItem(RICH_TEXT_MODE_KEY, mode); } catch (error) {}
}

function getRichTextSession_(session) {
    const source = session && typeof session === "object" ? session : {};
    const userId = String(source.userId || source.ID || source.id || "").trim();
    const sessionToken = String(source.sessionToken || source.SessionToken || "").trim();
    if (!userId || !sessionToken) throw new Error("Se requiere una sesión activa para consultar la configuración global.");
    return { userId, sessionToken };
}

export async function loadRichTextMode(session) {
    const sessionPayload = getRichTextSession_(session);
    // La lectura es idempotente: dos intentos acotados evitan dejar el arranque
    // esperando indefinidamente si FEEDBACK/Coordinator tarda en responder.
    const response = await routeActionWithRetry("getRichTextMode", sessionPayload, {
        timeoutMs: 6000,
        maxAttempts: 2,
        retryDelayMs: 250
    });
    const mode = normalizeRichTextMode_(response && response.mode);
    if (!response || response.status !== "success" || !mode) {
        throw new Error("No se recibió una configuración global de texto válida.");
    }
    cacheRichTextMode_(mode);
    return mode;
}

export async function setRichTextMode(mode, actorRole, session) {
    const normalizedRole = String(actorRole || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const normalizedMode = normalizeRichTextMode_(mode);
    if (normalizedRole !== "desarrollador") {
        throw new Error("Solo un Desarrollador puede cambiar el modo de texto enriquecido.");
    }
    if (!normalizedMode) throw new Error("Modo de texto enriquecido no válido.");
    const sessionPayload = getRichTextSession_(session);
    const response = await routeAction("setRichTextMode", { ...sessionPayload, mode: normalizedMode });
    const confirmedMode = normalizeRichTextMode_(response && response.mode);
    if (!response || response.status !== "success" || confirmedMode !== normalizedMode) {
        throw new Error("El servidor no confirmó el cambio de formato global.");
    }
    cacheRichTextMode_(confirmedMode);
    return confirmedMode;
}

// Único localizador de arranque para consultar AUTH; nunca es fallback de otras rutas.
const CENTRAL_CONFIGURATION_BOOTSTRAP_URL = "https://script.google.com/macros/s/AKfycbxoSybH_LsnqfBXCcE-5f9DM5rxEh8IFVPUMb2KF_j8yYl68hxEvF034ogADXEdrXUG/exec";
export const CENTRAL_SERVICE_KEYS = Object.freeze([
    "AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN", "COORDINATOR"
]);

export const ACTION_TO_SERVICE_MAP = {
    'getPublicConfiguration': 'AUTH', 'login': 'AUTH', 'requestPasswordRecovery': 'AUTH', 'completePasswordRecovery': 'AUTH', 'validateSession': 'AUTH', 'touchSession': 'AUTH', 'acceptTerms': 'AUTH', 'changePassword': 'AUTH', 'resetUserPassword': 'AUTH', 'logout': 'AUTH', 'migrateLegacyPasswords': 'AUTH', 'benchmarkPasswordKdf': 'AUTH',
    'getNavigationData': 'CATALOG', 'getCatalogData': 'CATALOG', 'getDropdownData': 'CATALOG', 'getVehicleProjection': 'CATALOG', 'getContributionCandidates': 'CATALOG',
    'getSuggestion': 'WRITE', 'checkVehicle': 'WRITE', 'checkOperation': 'WRITE', 'addOrUpdateCut': 'WRITE', 'addSupplementaryInfo': 'WRITE', 'checkVinDuplicate': 'WRITE', 'addVinToVehicle': 'WRITE', 'allocateVehicleId': 'WRITE', 'freezeCortesIds': 'WRITE',
    'publishCatalogReset': 'CATALOG', 'publishCatalogChange': 'CATALOG',
    'getCatalogChanges': 'CATALOG',
    'getUsers': 'AUTH', 'createUser': 'AUTH', 'updateUser': 'AUTH', 'deleteUser': 'AUTH', 'updateProfile': 'AUTH', 'resetUserSessions': 'AUTH',
    'recordLike': 'FEEDBACK', 'recordVehicleView': 'FEEDBACK', 'reportProblem': 'FEEDBACK', 'sendContactForm': 'FEEDBACK', 'addTutorial': 'FEEDBACK', 'suggestYear': 'FEEDBACK', 'suggestCutChange': 'FEEDBACK', 'getPysData': 'FEEDBACK', 'addProblem': 'FEEDBACK', 'addSolution': 'FEEDBACK', 'addPrevention': 'FEEDBACK', 'addVehicleToProblem': 'FEEDBACK',
    'getFeedbackItems': 'FEEDBACK', 'getMyProblemReports': 'FEEDBACK', 'replyToFeedback': 'FEEDBACK', 'markAsResolved': 'FEEDBACK', 'getActivityLogs': 'FEEDBACK', 'deleteFeedbackItem': 'FEEDBACK', 'clearActivityLogs': 'FEEDBACK', 'clearSensitiveLogs': 'AUTH',
    'getInboxRecipients': 'FEEDBACK', 'notifyDevelopersDriveCritical': 'FEEDBACK', 'getInboxConversations': 'FEEDBACK', 'getInboxMessages': 'FEEDBACK', 'createInboxConversation': 'FEEDBACK', 'sendInboxMessage': 'FEEDBACK', 'markInboxRead': 'FEEDBACK', 'markInboxUnread': 'FEEDBACK', 'deleteInboxConversation': 'FEEDBACK', 'archiveInboxConversation': 'FEEDBACK', 'closeInboxConversation': 'FEEDBACK',
    'initYouTubeUpload': 'FEEDBACK', 'getVideoApprovalByOperation': 'FEEDBACK', 'submitVideoForApproval': 'FEEDBACK', 'approveVideo': 'FEEDBACK', 'rejectVideo': 'FEEDBACK',
    'removeVehicleFromProblem': 'FEEDBACK', 'updatePysItem': 'FEEDBACK', 'updateTutorialItem': 'FEEDBACK',
    'migrateTimestamps': 'UTILITIES', 'getRichTextMode': 'FEEDBACK', 'setRichTextMode': 'FEEDBACK',
    'ping': 'ADMIN', 'migrateCortesOperationIds': 'ADMIN', 'migrateVehicleContributionsSchema': 'ADMIN', 'getVehicleContributionCandidates': 'CATALOG', 'resolveVehicleContributionCandidate': 'ADMIN', 'migrateIdentifiers': 'ADMIN', 'rollbackIdentifiers': 'ADMIN', 'reconcilePendingImageUploads': 'ADMIN',
    'backupDatabase': 'ADMIN', 'backupDrive': 'ADMIN', 'restoreDatabase': 'ADMIN', 'restoreDrive': 'ADMIN',
    'reorganizeDatabase': 'ADMIN', 'normalizeImages': 'ADMIN', 'organizePrimaryVehicleImages': 'ADMIN', 'restoreAllTrashedImages': 'ADMIN', 'addLogo': 'ADMIN', 'auditIdentifiers': 'ADMIN', 'freezeIdentifierFormulas': 'ADMIN', 'createSheet': 'ADMIN', 'addColumn': 'ADMIN', 'driveCommand': 'ADMIN',
    'updateVehicleField': 'ADMIN', 'uploadAdminImage': 'ADMIN', 'getAdminImageUploadStatus': 'ADMIN',
    'getReplacedImages': 'ADMIN',
    'previewCortesImageReconciliation': 'ADMIN', 'previewCortesImageOrganizer': 'ADMIN', 'getCortesImageOrganizerOperations': 'ADMIN', 'applyCortesImageOrganizer': 'ADMIN', 'rollbackCortesImageOrganizer': 'ADMIN', 'applyCortesImageReconciliation': 'ADMIN', 'migrateReplacedImagesSchema': 'ADMIN', 'getDriveStorage': 'ADMIN', 'recoverReplacedImage': 'ADMIN', 'deleteReplacedImage': 'ADMIN', 'restoreReplacedImageFromTrash': 'ADMIN', 'permanentlyDeleteReplacedImage': 'ADMIN', 'markReplacedImageInUse': 'ADMIN', 'auditDriveImagesInCortes': 'ADMIN', 'saveUnusedImagesInventory': 'ADMIN',
    'getServiceTraffic': 'COORDINATOR', 'getCortesImageFolders': 'ADMIN', 'createCortesImageFolder': 'ADMIN', 'moveReplacedImage': 'ADMIN', 'getReplacedImageDownloadUrl': 'ADMIN',
};

const WRITE_CATALOG_RESET_ACTIONS_ = new Set([
    "addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle", "freezeCortesIds"
]);
const ADMIN_CATALOG_RESET_ACTIONS_ = new Set([
    "addLogo", "updateVehicleField", "uploadAdminImage", "recoverReplacedImage",
    "normalizeImages", "applyCortesImageReconciliation", "restoreDatabase", "reorganizeDatabase",
    "migrateIdentifiers", "rollbackIdentifiers", "resolveVehicleContributionCandidate"
]);


/**
 * Rutas directas históricas conservadas por compatibilidad. Las operaciones
 * de cortes se procesan en WRITE y ya no se aceptan en el router ADMIN.
 */
export const SERVICE_COMPATIBILITY_ACTIONS = {
    CATALOG: ['getSuggestion'],
    // MIG-023: compatibilidad temporal; el frontend ya publica/consulta el feed en CATALOG.
    COORDINATOR: ['publishCatalogReset', 'getCatalogChanges'],
    ADMIN: []
};

/** No hay acciones externas o servicios heredados habilitados. */
export const EXTERNAL_ACTIONS = {
};

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

async function getConfiguredServiceEndpoint_(service) {
    const snapshot = await loadCentralConfiguration();
    return resolveCentralServiceEndpoint(snapshot, service);
}

// 2. LÓGICA DE RUTEO CENTRAL
async function routeActionInternal_(action, payload = {}, serviceOverride = null, requestOptions = {}) {
    const service = serviceOverride || ACTION_TO_SERVICE_MAP[action];
    if (!service) throw new Error(`Acción no definida: ${action}`);
    const targetUrl = await getConfiguredServiceEndpoint_(service);
    let httpStatus = null;
    let response;
    const requestBody = JSON.stringify({ action, payload });
    const measureBytes = value => {
        const text = String(value == null ? "" : value);
        try {
            if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
        } catch (error) {}
        try { return unescape(encodeURIComponent(text)).length; } catch (error) { return null; }
    };
    if (typeof requestOptions.onTrafficMetrics === "function") {
        requestOptions.onTrafficMetrics({ requestBytes: measureBytes(requestBody), responseBytes: null });
    }
    try {
            response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: requestBody,
                redirect: 'follow',
                signal: requestOptions && requestOptions.signal ? requestOptions.signal : undefined
            });
        } catch (fetchError) {
            const aborted = Boolean(requestOptions && requestOptions.signal && requestOptions.signal.aborted) ||
                Boolean(fetchError && fetchError.name === "AbortError");
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
            throw createRouteActionError_("No se recibió una respuesta HTTP válida del servidor.", {
                kind: "network", code: "NO_HTTP_RESPONSE", httpStatus: null
            });
        }
        if (!response.ok) {
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
            throw createRouteActionError_("No se pudo leer el cuerpo de la respuesta del servidor.", {
                kind: "invalid_response", code: "RESPONSE_READ_ERROR", httpStatus, cause: readError
            });
        }
        let result;
        if (typeof requestOptions.onTrafficMetrics === "function") {
            requestOptions.onTrafficMetrics({ requestBytes: measureBytes(requestBody), responseBytes: measureBytes(text) });
        }
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            throw createRouteActionError_("La respuesta del servidor no tiene un formato JSON válido.", {
                kind: "invalid_response", code: "INVALID_JSON", httpStatus, cause: parseError
            });
        }
        if (!result || typeof result !== "object" || Array.isArray(result)) {
            throw createRouteActionError_("La respuesta del servidor no contiene un objeto válido.", {
                kind: "invalid_response", code: "INVALID_RESPONSE", httpStatus
            });
        }
        if (service === "ADMIN" && ADMIN_CATALOG_RESET_ACTIONS_.has(action) &&
            result.status === "success" && result.catalogResetRequired === true && result.dryRun !== true) {
            const publication = await publishCatalogResetAfterMutation_("ADMIN", action, payload, result);
            if (publication && publication.catalogSyncPending) result.catalogSyncPending = true;
        }
        if (service === "FEEDBACK" && result.status === "success" &&
            result.catalogChange && typeof result.catalogChange === "object") {
            return await publishCatalogChangeAfterMutation_("FEEDBACK", action, payload, result);
        }
        if (service === "FEEDBACK" && result.status === "success" &&
            result.catalogResetRequired === true && result.dryRun !== true) {
            return await publishCatalogResetAfterMutation_("FEEDBACK", action, payload, result);
        }
        if (result.status === 'error') {
            const detailMessage = typeof result.details === "string" ? result.details :
                result.details && typeof result.details.errorMessage === "string" ? result.details.errorMessage : "";
            const errorMessage = [String(result.message || "El servicio rechazó la operación."), detailMessage]
                .filter(Boolean).join(": ");
            const normalizedError = errorMessage.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const confirmedRevocation = /sesion/.test(normalizedError) &&
                /(revocad[ao]|no existe o no es unica)/.test(normalizedError);
            if (confirmedRevocation) {
                const sessionToken = String(payload && (
                    payload.sessionToken || payload.SessionToken ||
                    payload.context && (payload.context.sessionToken || payload.context.SessionToken) ||
                    payload.session && (payload.session.sessionToken || payload.session.SessionToken)
                ) || "").trim();
                if (sessionToken && typeof window !== "undefined" &&
                    typeof CustomEvent === "function" && typeof window.dispatchEvent === "function") {
                    window.dispatchEvent(new CustomEvent("gpsepedia:session-invalid", {
                        detail: { sessionToken }
                    }));
                }
                const responseDetails = result.sessionCacheKeys || result.sessionCacheInvalidationPending
                    ? { details: result.details, sessionCacheKeys: result.sessionCacheKeys || null,
                        sessionCacheInvalidationPending: Boolean(result.sessionCacheInvalidationPending) }
                    : result.details;
                throw createRouteActionError_("Sesión terminada", {
                    kind: "session", code: "SESSION_INVALID", httpStatus, details: responseDetails
                });
            }
            const responseDetails = result.sessionCacheKeys || result.sessionCacheInvalidationPending
                ? { details: result.details, sessionCacheKeys: result.sessionCacheKeys || null,
                    sessionCacheInvalidationPending: Boolean(result.sessionCacheInvalidationPending) }
                : result.details;
            throw createRouteActionError_(errorMessage, {
                kind: "application", code: String(result.code || "API_ERROR"), httpStatus, details: responseDetails
            });
        }
        if (service === "FEEDBACK" && result.status === "success" &&
            result.catalogResetRequired === true && result.dryRun !== true) {
            return await publishCatalogResetAfterMutation_("FEEDBACK", action, payload, result);
        }
        if (service === "WRITE" && WRITE_CATALOG_RESET_ACTIONS_.has(action) &&
            result.status === "success" && result.alreadyPresent !== true && result.dryRun !== true) {
            return await publishCatalogResetAfterMutation_("WRITE", action, payload, result);
        }
        return result;
}


async function publishCatalogResetAfterMutation_(service, action, payload, result) {
    const fallbackPayloadId = payload && (payload.vehicleId || payload.fieldName)
        ? [payload.vehicleId, payload.fieldName, payload.expectedSourceEventId,
            JSON.stringify(payload.expectedCurrentValue), JSON.stringify(payload.value)].filter(Boolean).join("_")
        : "";
    const sourceId = String(payload && (
        payload.opId || payload.requestId || payload.backupId || payload.migrationId ||
        payload.eventId || payload.operationId || payload.reconciliationId || payload.planId ||
        payload.expectedSourceEventId
    ) || fallbackPayloadId || result && (
        result.opId || result.operationId || result.catalogVersion || result.vehicleId ||
        result.logoId || result.backupId || result.migrationId
    ) || Date.now()).trim();
    const safeId = sourceId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) || String(Date.now());
    const requestId = ("catalog-" + service + "-" + action + "-" + safeId).slice(0, 128);
    try {
        const publication = await routeActionInternal_("publishCatalogReset", {
            userId: String(payload && payload.userId || "").trim(),
            sessionToken: String(payload && payload.sessionToken || ""),
            service: service,
            operation: action,
            requestId
        });
        if (!publication || publication.status !== "success") {
            throw new Error("CATALOG no confirmó la actualización del feed.");
        }
        return result;
    } catch (error) {
        const pending = Object.assign({}, result, { catalogSyncPending: true });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" &&
            typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("gpsepedia:catalog-refresh-pending", {
                detail: { service: service, action: action, reason: "catalog-publication" }
            }));
        }
        return pending;
    }
}



async function publishCatalogChangeAfterMutation_(service, action, payload, result) {
    const change = result && result.catalogChange;
    if (!change || typeof change !== "object" || !change.collection || !change.recordId || !change.operation) {
        return Object.assign({}, result, { catalogSyncPending: true });
    }
    const sourceId = String(payload && (
        payload.opId || payload.requestId || payload.problemId || payload.tutorialId ||
        payload.referenceId || payload.vehicleId || payload.operationId
    ) || change.recordId || Date.now()).trim();
    const safeId = sourceId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) || String(Date.now());
    const requestId = ("catalog-" + service + "-" + action + "-" + safeId).slice(0, 128);
    try {
        const publication = await routeActionInternal_("publishCatalogChange", {
            userId: String(payload && payload.userId || "").trim(),
            sessionToken: String(payload && payload.sessionToken || ""),
            service,
            operation: action,
            requestId,
            change: {
                collection: String(change.collection),
                recordId: String(change.recordId),
                operation: String(change.operation)
            }
        });
        if (!publication || publication.status !== "success") throw new Error("CATALOG no confirmó el delta canónico.");
        return result;
    } catch (error) {
        const pending = Object.assign({}, result, { catalogSyncPending: true });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" &&
            typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("gpsepedia:catalog-refresh-pending", {
                detail: { service, action, reason: "catalog-delta-publication" }
            }));
        }
        return pending;
    }
}


/**
 * Registra métricas efímeras del navegador actual sin persistir ni transmitir datos.
 * Cada intento HTTP se contabiliza; los reintentos quedan visibles como intentos separados.
 */
function notifySessionCacheInvalidationPending_(outcome, userId) {
    if (typeof window === "undefined" || typeof CustomEvent !== "function" ||
        typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("gpsepedia:session-cache-cleanup-pending", {
        detail: {
            userId: String(userId || ""),
            failedServices: outcome && Array.isArray(outcome.failedServices) ? outcome.failedServices : [],
            maxCacheTtlSeconds: 21600
        }
    }));
}

function sessionCacheKeysFromError_(error) {
    const details = error && error.details;
    return details && typeof details === "object" ? details.sessionCacheKeys : null;
}

async function refreshCatalogAfterVideoApproval_(action, result) {
    if (action !== "approveVideo" || !result || result.status !== "success") return result;
    if (String(result.contentType || "").trim().toLowerCase() === "pys") {
        const change = result.catalogChange;
        if (!change || change.collection !== "pys" || change.operation !== "upsert" ||
            String(change.recordId || "").trim() !== String(result.referenceId || "").trim() ||
            !change.snapshot || typeof change.snapshot !== "object") {
            return Object.assign({}, result, { catalogRefreshPending: true,
                message: "El vídeo fue aprobado, pero no se pudo preparar la actualización de PyS." });
        }
        const pysResult = Object.assign({}, result, { pysCatalogChange: change, catalogRefreshStatus: "success" });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" &&
            typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("gpsepedia:pys-catalog-change", { detail: { change } }));
        }
        return pysResult;
    }
    let finalResult = result;
    try {
        const catalogRefresh = await routeAction("getCatalogData", { forceRefresh: true });
        if (!catalogRefresh || catalogRefresh.status !== "success") {
            throw new Error("CATALOG no confirmó la actualización de su caché.");
        }
        finalResult = Object.assign({}, finalResult, { catalogRefreshStatus: "success", catalogRefreshData: catalogRefresh.data });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" &&
            typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("gpsepedia:catalog-refresh-completed", {
                detail: { action: "approveVideo", data: catalogRefresh.data }
            }));
        }
    } catch (catalogRefreshError) {
        finalResult = Object.assign({}, finalResult, {
            catalogRefreshPending: true,
            message: [String(finalResult.message || "El vídeo fue aprobado."),
                "El catálogo no pudo actualizarse automáticamente; vuelve a consultarlo para cargar los cambios."]
                .filter(Boolean).join(" ")
        });
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" &&
            typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("gpsepedia:catalog-refresh-pending", {
                detail: { action: "approveVideo" }
            }));
        }
    }
    return finalResult;
}

export async function routeAction(action, payload = {}, serviceOverride = null, requestOptions = {}) {
    const service = serviceOverride || ACTION_TO_SERVICE_MAP[action] || "";
    const startedAt = Date.now();
    const trafficMetrics = { requestBytes: null, responseBytes: null };
    const internalOptions = Object.assign({}, requestOptions, {
        onTrafficMetrics: metrics => Object.assign(trafficMetrics, metrics || {})
    });
    try {
        const result = await routeActionInternal_(action, payload, serviceOverride, internalOptions);
        let finalResult = result;
        if (result && (result.sessionCacheKeys || result.sessionCacheInvalidationPending)) {
            const cacheKeys = result.sessionCacheKeys;
            const invalidation = cacheKeys
                ? await invalidateSessionActorCaches({ sessionCacheKeys: cacheKeys, routeAction, routeActionWithRetry })
                : { status: "partial", failedServices: ["AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"] };
            finalResult = Object.assign({}, result);
            delete finalResult.sessionCacheKeys;
            delete finalResult.sessionCacheInvalidationPending;
            finalResult.sessionCacheInvalidation = invalidation;
            if (invalidation.status !== "success") {
                finalResult.cleanupPending = true;
                notifySessionCacheInvalidationPending_(invalidation, cacheKeys && cacheKeys.userId);
            }
        }
        finalResult = await refreshCatalogAfterVideoApproval_(action, finalResult);
        try {
            recordBrowserServiceTraffic({
                service, action, timestamp: Date.now(), durationMs: Date.now() - startedAt,
                outcome: "success", requestBytes: trafficMetrics.requestBytes, responseBytes: trafficMetrics.responseBytes
            });
        } catch (telemetryError) {}
        return finalResult;
    } catch (error) {
        const cacheKeys = sessionCacheKeysFromError_(error);
        if (cacheKeys || (error && error.details && error.details.sessionCacheInvalidationPending)) {
            const invalidation = cacheKeys
                ? await invalidateSessionActorCaches({ sessionCacheKeys: cacheKeys, routeAction, routeActionWithRetry })
                : { status: "partial", failedServices: ["AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"] };
            error.sessionCacheInvalidation = invalidation;
            error.cleanupPending = invalidation.status !== "success";
            if (error.cleanupPending) notifySessionCacheInvalidationPending_(invalidation, cacheKeys && cacheKeys.userId);
        }
        try {
            recordBrowserServiceTraffic({
                service, action, timestamp: Date.now(), durationMs: Date.now() - startedAt,
                outcome: "error", httpStatus: error && error.httpStatus,
                requestBytes: trafficMetrics.requestBytes, responseBytes: trafficMetrics.responseBytes
            });
        } catch (telemetryError) {}
        throw error;
    }
}

export async function routeActionWithRetry(action, payload = {}, options = {}) {
    const settings = options && typeof options === "object" ? options : {};
    const request = typeof settings.routeAction === "function" ? settings.routeAction : routeAction;
    const Controller = settings.AbortController ||
        (typeof AbortController === "function" ? AbortController : null);
    if (typeof request !== "function") throw new Error("La función de solicitud no está disponible.");
    if (typeof Controller !== "function") throw new Error("AbortController no está disponible; no se puede limitar el tiempo de espera.");
    const timeoutMs = Math.min(120000, Math.max(1000, Number(settings.timeoutMs) || 45000));
    const maxAttempts = Math.min(3, Math.max(1, Math.floor(Number(settings.maxAttempts) || 3)));
    const retryDelayMs = Math.min(5000, Math.max(0, Number(settings.retryDelayMs) || 500));
    const schedule = typeof settings.setTimeout === "function" ? settings.setTimeout : setTimeout;
    const cancel = typeof settings.clearTimeout === "function" ? settings.clearTimeout : clearTimeout;
    const wait = typeof settings.wait === "function"
        ? settings.wait
        : delay => new Promise(resolve => schedule(resolve, delay));
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : () => true;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new Controller();
        let timeoutId = null;
        try {
            timeoutId = schedule(() => controller.abort(), timeoutMs);
            return await request(action, payload, null, { signal: controller.signal });
        } catch (error) {
            const kind = String(error && error.kind || "");
            const status = Number(error && error.httpStatus);
            const retryable = kind === "abort" || kind === "network" ||
                (kind === "http" && ([408, 425, 429].includes(status) || status >= 500));
            if (!retryable || attempt >= maxAttempts || !shouldContinue()) throw error;
            await wait(retryDelayMs * attempt);
            if (!shouldContinue()) throw error;
        } finally {
            if (timeoutId !== null) {
                try { cancel(timeoutId); } catch (timerError) {}
            }
        }
    }
    throw new Error("La solicitud de auditoría terminó sin respuesta.");
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
    return await routeAction('getInboxConversations', { ...sessionPayload, cursor: source.cursor, pageSize: source.pageSize, folder: source.folder, query: source.query, category: source.category });
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
export async function markInboxUnread(conversationId, sessionPayload = {}) {
    return await routeAction('markInboxUnread', { ...sessionPayload, conversationId });
}
export async function deleteInboxConversation(conversationId, sessionPayload = {}) {
    return await routeAction('deleteInboxConversation', { ...sessionPayload, conversationId });
}
export async function archiveInboxConversation(conversationId, archived, sessionPayload = {}) {
    return await routeAction('archiveInboxConversation', { ...sessionPayload, conversationId, archived });
}
export async function closeInboxConversation(conversationId, sessionPayload = {}) {
    return await routeAction('closeInboxConversation', { ...sessionPayload, conversationId });
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

export async function recordVehicleView(vehicleId, utilityCounters = {}, sessionPayload = {}) {
    const normalizedVehicleId = String(vehicleId === null || vehicleId === undefined ? "" : vehicleId).trim();
    if (!normalizedVehicleId) return { status: "ignored" };
    const source = utilityCounters && typeof utilityCounters === "object" ? utilityCounters : {};
    const payload = {};
    ["utilCorte1", "utilCorte2", "utilCorte3"].forEach(field => {
        const value = source[field];
        if (value !== undefined && value !== null && String(value).trim() !== "") payload[field] = value;
    });
    return await routeAction("recordVehicleView", { ...sessionPayload, vehicleId: normalizedVehicleId, ...payload });
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
    FEEDBACK: "GPSpedia-Feedback",
    UTILITIES: "GPSpedia-Utilities",
    ADMIN: "GPSpedia-Admin",
    COORDINATOR: "GPSpedia-SharedMutationCoordinator",
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

    const requestedServiceKeys = Array.isArray(settings.serviceKeys)
        ? new Set(settings.serviceKeys.filter(key => typeof key === "string")) : null;
    const serviceKeys = CENTRAL_SERVICE_KEYS.filter(serviceKey =>
        !requestedServiceKeys || requestedServiceKeys.has(serviceKey));
    let routingSnapshot = null;
    try { routingSnapshot = await loadCentralConfiguration(); } catch (configurationError) {}
    await Promise.all(serviceKeys.map(async serviceKey => {
        const startTime = now();
        const expectedIdentity = Object.prototype.hasOwnProperty.call(SERVICE_HEALTH_CONTRACTS, serviceKey)
            ? SERVICE_HEALTH_CONTRACTS[serviceKey] : undefined;
        let controller = null;
        let timeoutId = null;
        let result;
        let serviceEndpoint = null;
        try { serviceEndpoint = resolveCentralServiceEndpoint(routingSnapshot, serviceKey); } catch (configurationError) {}

        try {
            if (expectedIdentity === undefined || expectedIdentity === null) {
                result = makeResult("unknown", startTime, now(), {
                    errorCode: expectedIdentity === null ? "HEALTH_IDENTITY_UNVERIFIED" : "HEALTH_CONTRACT_UNDEFINED",
                    error: "No existe un contrato de identidad configurado para este servicio; no se consulta."
                });
            } else if (!serviceEndpoint) {
                const checkedAtMs = now();
                result = makeResult("unavailable", startTime, checkedAtMs, {
                    errorCode: "CENTRAL_CONFIGURATION_UNAVAILABLE",
                    error: "No hay un endpoint central vigente y habilitado para este servicio."
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
                const response = await fetchImpl(serviceEndpoint + "?debug=true", {
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
                                if ((serviceKey === "AUTH" || serviceKey === "FEEDBACK") &&
                                    typeof data.coordinatorConfigured === "boolean") {
                                    metadata.coordinatorConfigured = data.coordinatorConfigured;
                                }
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
export async function checkServiceHealth(serviceKey, options = {}) {
    const key = String(serviceKey || "").trim().toUpperCase();
    if (!CENTRAL_SERVICE_KEYS.includes(key)) return null;
    const results = await checkAllServicesHealth({
        ...(options && typeof options === "object" ? options : {}),
        serviceKeys: [key]
    });
    return results[key] || null;
}

export async function approveVideo(itemId, approverName, userRole, sessionPayload = {}) {
    // El rol y el nombre del aprobador se derivan en FEEDBACK desde la sesión validada.
    return await routeAction("approveVideo", { itemId, ...sessionPayload });
}

export async function rejectVideo(itemId, rejecterName, reason, userRole, sessionPayload = {}) {
    // El rol y el nombre del revisor se derivan en FEEDBACK desde la sesión validada.
    return await routeAction("rejectVideo", { itemId, reason, ...sessionPayload });
}


export async function getCatalogChanges(cursor = 0, limit = 50, sessionPayload = {}, options = {}) {
    const normalizedCursor = Number(cursor), normalizedLimit = Number(limit);
    if (!Number.isSafeInteger(normalizedCursor) || normalizedCursor < 0) throw new TypeError("El cursor del catálogo no es válido.");
    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 50) throw new TypeError("El límite del feed debe estar entre 1 y 50.");
    let outcome = "network_error", httpStatus = null;
    const startedAt = Date.now();
    const query = "?catalogFeed=1&cursor=" + encodeURIComponent(normalizedCursor) + "&limit=" + encodeURIComponent(normalizedLimit);
    try {
        let response;
        try {
            const feedbackEndpoint = await getConfiguredServiceEndpoint_("CATALOG");
            response = await runCatalogRequestWithRetry(async signal => {
                const current = await fetch(feedbackEndpoint + query, {
                    method: "GET", redirect: "follow", signal
                });
                const status = Number(current && current.status);
                if (!current || !Number.isInteger(status) || status < 100 || status > 599) {
                    const error = new Error("El feed no devolvió una respuesta HTTP válida.");
                    error.retryable = true;
                    throw error;
                }
                if (!current.ok) {
                    const error = new Error("El feed del catálogo respondió HTTP " + status + ".");
                    error.status = status;
                    throw error;
                }
                return current;
            }, {
                signal: options && options.signal ? options.signal : undefined,
                timeoutMs: 5000,
                retries: 2,
                baseDelayMs: 200
            });
        } catch (error) {
            const aborted = Boolean(options && options.signal && options.signal.aborted) ||
                Boolean(error && error.name === "AbortError");
            httpStatus = Number.isInteger(Number(error && error.status)) ? Number(error.status) : null;
            outcome = aborted ? "abort" : httpStatus !== null ? "http_error" : "network_error";
            if (aborted) {
                throw createRouteActionError_("La consulta del catálogo fue cancelada o agotó el tiempo de espera.", {
                    kind: "abort", code: "REQUEST_ABORTED", cause: error
                });
            }
            if (httpStatus !== null) {
                throw createRouteActionError_("El feed del catálogo respondió HTTP " + httpStatus + ".", {
                    kind: "http", code: "CATALOG_FEED_HTTP_ERROR", httpStatus, cause: error
                });
            }
            throw createRouteActionError_("No se recibió respuesta del feed público del catálogo.", {
                kind: "network", code: "CATALOG_FEED_NETWORK_ERROR", cause: error
            });
        }
        httpStatus = Number(response && response.status);
        if (!response || !Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599) {
            throw createRouteActionError_("El feed no devolvió una respuesta HTTP válida.", {
                kind: "network", code: "CATALOG_FEED_NO_HTTP_RESPONSE"
            });
        }
        let body;
        try { body = await response.text(); } catch (error) { throw createRouteActionError_("No se pudo leer la respuesta del feed del catálogo.", { kind: "invalid_response", code: "CATALOG_FEED_READ_ERROR", httpStatus, cause: error }); }
        let result;
        try { result = JSON.parse(body); } catch (error) { throw createRouteActionError_("El feed del catálogo no devolvió JSON válido.", { kind: "invalid_response", code: "CATALOG_FEED_INVALID_JSON", httpStatus, cause: error }); }
        if (!result || typeof result !== "object" || Array.isArray(result) || result.status !== "success") throw createRouteActionError_(result && typeof result.message === "string" ? result.message : "El feed público del catálogo no está disponible.", { kind: "application", code: "CATALOG_FEED_REJECTED", httpStatus });
        outcome = "success";
        return result;
    } finally {
        try {
            recordBrowserServiceTraffic({
                service: "CATALOG",
                action: "getCatalogChanges",
                timestamp: Date.now(),
                durationMs: Date.now() - startedAt,
                outcome: outcome === "success" ? "success" : "error",
                httpStatus
            });
        } catch (telemetryError) {}
    }
}

// El bootstrap consulta AUTH para obtener el registro central; no enruta otras acciones.
async function fetchCentralConfigurationBootstrap_() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let response;
    try {
        response = await fetch(CENTRAL_CONFIGURATION_BOOTSTRAP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "getPublicConfiguration", payload: {} }),
            redirect: "follow",
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
    if (!response || !response.ok) {
        const status = Number(response && response.status);
        const error = new Error("No se pudo consultar la configuración central de servicios.");
        error.kind = "http";
        error.httpStatus = Number.isInteger(status) ? status : null;
        throw error;
    }
    const body = await response.text();
    let result;
    try { result = JSON.parse(body); }
    catch (error) { throw new Error("AUTH devolvió una configuración central con formato inválido."); }
    if (!result || typeof result !== "object" || Array.isArray(result) || result.status !== "success") {
        throw new Error("AUTH no confirmó una configuración central válida.");
    }
    return result;
}

export async function loadCentralConfiguration(options = {}) {
    return centralConfigurationCache_.load(fetchCentralConfigurationBootstrap_, options);
}

export async function refreshCentralConfiguration() {
    return loadCentralConfiguration({ force: true });
}

export function invalidateCentralConfigurationCache() {
    centralConfigurationCache_.invalidate();
}

