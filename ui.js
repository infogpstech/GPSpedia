import { vinDifferentialEngine, vinSignatureStore, getClassificationKey, ensureVinSignatures } from './VinDifferentialEngine.js';
// GPSpedia UI Module | Version: 2.1.6
// Responsibilities:
// - Render UI components based on state.
// - Contain all functions that directly manipulate the DOM.
// - Use document.createElement, not HTML strings.

import { getFeedbackItems, sendContactForm, addTutorial, replyToFeedback, markAsResolved, deleteFeedbackItem, clearActivityLogs, clearSensitiveLogs, checkAllServicesHealth, getServiceMetricsSnapshot, subscribeServiceMetrics, getActivityLogs, routeAction, recordLike, reportProblem, suggestYear, suggestCutChange, approveVideo, rejectVideo } from './api-config.js';
import { getState, setState, subscribe } from './state.js';
import * as offline from './offline.js';
import { createEditBackupStore, getEditBackupFieldsToRestore } from './editBackupStore.js';
import { isAdminImageUploadStatusConfirmedCancelled } from './adminImageUploadIsolation.js';
import { confirmValidationBeforeCache } from './validationSubmission.js';
import { applyConfirmedLikeState } from './likeState.js';
import { openYouTubeUploadModal } from './youtubeUpload.js';
import { shouldAutoOpenVehicleDetail } from './search-utils.js';
import { thumbnailObjectUrls } from './imageObjectUrlCache.js';
import { loadPysData } from './pys-data.js';
import { createRichTextToolbar, sanitizeHtmlContent } from './rich-text.js';
export { createRichTextToolbar, sanitizeHtmlContent };

function mountRichTextToolbars(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('[data-rich-target]').forEach(container => {
        const targetId = container.getAttribute('data-rich-target');
        if (!targetId || container.dataset.richMounted === 'true') return;
        container.appendChild(createRichTextToolbar(targetId));
        container.dataset.richMounted = 'true';
    });
}

const backSvg = '<svg style="width:20px;height:20px;margin-right:5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';


export function cleanColaboradorName(name) {
    if (!name || typeof name !== 'string') return name || '';
    return name.replace(/\s*\[OP-[a-zA-Z0-9_-]+\]/gi, '').trim();
}

export function isNoRecomendadoValue(val) {
    if (!val) return false;
    const clean = val.toLowerCase()
                     .normalize("NFD")
                     .replace(/[\u0300-\u036f]/g, "")
                     .replace(/[-_]/g, ' ')
                     .trim();
    return clean === 'no recomendado';
}

// Constants for optimized image loading
export const IMG_SIZE_SMALL = 300;   // Cards and thumbnails
export const IMG_SIZE_MEDIUM = 800;  // Modal details
export const IMG_SIZE_LARGE = 1600;  // Lightbox / High Resolution
const TERMS_CURRENT_VERSION = '2026-07';

// Variables de control para el Modo Edición In-Modal
let inEditMode = false;
let isDriveAuditRunning = false;
let originalItemBackup = null;
let originalItemBackupOwnerId = null;
let originalItemBackupVehicleId = null;
let editedItemBuffer = null;
let dropdownOptions = null;
const ADMIN_IMAGE_UPLOAD_FIELDS = [
    "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3",
    "imgApertura", "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3"
];
const ADMIN_MODAL_EDIT_FIELDS = new Set([
    "categoria", "modelo", "versionesAplicables", "tipoEncendido", "anoDesde", "anoHasta",
    "vin", "notaImportante", "apertura", "cableAlimen", "cableAlimen2", "cableAlimen3",
    "imagenVehiculo", "imgCorte1", "imgCorte2", "imgCorte3", "imgApertura",
    "imgCableAlimen", "imgCableAlimen2", "imgCableAlimen3",
    ...[1, 2, 3].flatMap(index => [
        "tipoCorte" + index, "configRelay" + index,
        "ubicacionCorte" + index, "colorCableCorte" + index
    ])
]);
const pendingAdminImageUploads = new Map();
const pendingAdminImageUploadsLoaded = new Set();

// Pila de navegación entre modales para prevención de bucles y restauración de contexto
const modalNavStack = [];
window.modalNavStack = modalNavStack;

export function clearModalNavStack() {
    modalNavStack.length = 0;
}

window.inEditMode = false;

async function precargarDropdownOptions() {
    if (dropdownOptions) return dropdownOptions;
    try {
        const res = await routeAction('getDropdownData');
        if (res && res.dropdowns) {
            dropdownOptions = res.dropdowns;
        }
    } catch (e) {
        console.error("Error precargando dropdowns para edición:", e);
    }
    return dropdownOptions;
}

export function showSavingIndicator(status, message = "") {
    const indicator = document.getElementById("modal-saving-indicator");
    if (!indicator) return;

    indicator.innerHTML = "";
    indicator.style.opacity = "1";

    if (status === "saving") {
        indicator.style.color = "var(--accent-color, #007bff)";
        indicator.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${message || 'Guardando...'}</span>`;
    } else if (status === "processing") {
        indicator.style.color = "var(--accent-color, #007bff)";
        indicator.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>${message || 'Procesando...'}</span>`;
    } else if (status === "success") {
        indicator.style.color = "#28a745";
        indicator.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message || 'Guardado correctamente'}</span>`;
        setTimeout(() => {
            if (indicator.innerHTML.includes("fa-circle-check")) {
                indicator.style.opacity = "0";
            }
        }, 2000);
    } else if (status === "warning") {
        indicator.style.color = "#b7791f";
        indicator.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${message || 'Guardado con advertencia'}</span>`;
        setTimeout(() => {
            if (indicator.innerHTML.includes("fa-triangle-exclamation")) {
                indicator.style.opacity = "0";
            }
        }, 4000);
    } else if (status === "error") {
        indicator.style.color = "#dc3545";
        indicator.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message || 'Error al guardar'}</span>`;
        setTimeout(() => {
            if (indicator.innerHTML.includes("fa-circle-exclamation")) {
                indicator.style.opacity = "0";
            }
        }, 3000);
    } else {
        indicator.style.opacity = "0";
    }
}

function getCurrentEditOwnerContext_() {
    const context = getUiSessionContext_();
    const role = String(context && context.role || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    return context && ["desarrollador", "gefe"].includes(role) ? context : null;
}

function getEditBackupStore_(ownerId) {
    return createEditBackupStore(localStorage, ownerId);
}

function clearInMemoryEditBackup_() {
    originalItemBackup = null;
    originalItemBackupOwnerId = null;
    originalItemBackupVehicleId = null;
    editedItemBuffer = null;
}

async function saveFieldSilently(vehicleId, fieldName, value) {
    showSavingIndicator("saving", "Guardando...");
    try {
        const result = await routeAction("updateVehicleField", { vehicleId, fieldName, value, ...getDeveloperSessionPayload() });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message || "El servicio no confirmó la restauración del campo.");
        }
        if (result.folderSyncWarning) showSavingIndicator("warning", "Guardado; revisa la organización de la imagen principal");
        else showSavingIndicator("success", "Guardado correctamente");
        return true;
    } catch (error) {
        console.error("Error guardando silenciosamente el campo " + fieldName + ":", error);
        showSavingIndicator("error", "Error al guardar");
        return false;
    }
}

function commitAdminImageReplacementBaseline_(vehicleId, fieldName, imageUrl, expectedSession = null) {
    const cleanVehicleId = String(vehicleId);
    const session = getCurrentEditOwnerContext_();
    if (expectedSession && !isCurrentUiSessionContext_(expectedSession)) return false;
    if (!inEditMode && !originalItemBackup && !editedItemBuffer) return true;
    if (!session || !originalItemBackup ||
        originalItemBackupOwnerId !== session.userId ||
        originalItemBackupVehicleId !== cleanVehicleId ||
        String(originalItemBackup.id) !== cleanVehicleId) return false;

    originalItemBackup[fieldName] = String(imageUrl || "");
    try {
        const saved = getEditBackupStore_(session.userId).write(cleanVehicleId, originalItemBackup);
        if (!saved.saved) return false;
    } catch (error) {
        console.warn("No se pudo actualizar la base de descarte local.", error && error.name || "StorageError");
        return false;
    }

    if (editedItemBuffer && String(editedItemBuffer.id) === cleanVehicleId) {
        editedItemBuffer[fieldName] = String(imageUrl || "");
    }
    return true;
}

async function removePendingAdminImageUploadConfirmed_(operation, expectedSession) {
    const key = getAdminImageUploadPendingKey(operation.ownerId, operation.vehicleId, operation.fieldName);
    if (!expectedSession || !isCurrentUiSessionContext_(expectedSession) ||
        String(operation.ownerId || "") !== String(expectedSession.userId || "")) return false;
    const removed = await offline.removeAdminImageUploadPendingOperation(operation.vehicleId, operation.fieldName, operation.id, operation.ownerId);
    if (!isCurrentUiSessionContext_(expectedSession)) return false;
    if (removed === true) { pendingAdminImageUploads.delete(key); return true; }
    const latest = await offline.getAdminImageUploadPendingOperation(operation.vehicleId, operation.fieldName, operation.ownerId);
    if (!isCurrentUiSessionContext_(expectedSession)) return false;
    if (!latest || latest.available !== true) return false;
    if (latest.operation) { pendingAdminImageUploads.set(key, latest.operation); return false; }
    pendingAdminImageUploads.delete(key); return true;
}

async function resolvePendingAdminImageOperationsBeforeDiscard_(vehicleId) {
    const editSession = getCurrentEditOwnerContext_();
    if (!editSession || !editSession.userId) throw new Error("No se pudo verificar el propietario de los reemplazos pendientes.");
    const ownerId = String(editSession.userId), cleanVehicleId = String(vehicleId);
    const ownerVehicleKey = getAdminImageUploadOwnerVehicleKey(ownerId, cleanVehicleId);
    if (!isCurrentUiSessionContext_(editSession)) throw new Error("La sesión cambió antes de reconciliar los reemplazos pendientes.");
    if (!pendingAdminImageUploadsLoaded.has(ownerVehicleKey)) {
        const loaded = await loadPendingAdminImageUploads(cleanVehicleId, ownerId);
        if (!isCurrentUiSessionContext_(editSession)) throw new Error("La sesión cambió durante la lectura de reemplazos pendientes.");
        if (!loaded) throw new Error("No se pudo consultar IndexedDB; no se descartaron cambios para evitar perder el estado de un reemplazo.");
    }
    const operations = Array.from(pendingAdminImageUploads.entries())
        .filter(([key, operation]) => key.startsWith(ownerVehicleKey + "::") && String(operation.ownerId || "") === ownerId)
        .map(([, operation]) => operation);
    for (const operation of operations) {
        const status = await routeAction("getAdminImageUploadStatus", {
            ...getDeveloperSessionPayload(),
            vehicleId: operation.vehicleId,
            fieldName: operation.fieldName,
            opId: operation.id
        });
        if (!isCurrentUiSessionContext_(editSession)) {
            throw new Error("La sesión cambió durante la consulta del reemplazo. La operación local se conserva para reconciliarla con la cuenta propietaria.");
        }
        if (!status || status.status !== "success") {
            throw new Error("No se pudo consultar el estado del reemplazo " + operation.id + "; no se descartaron cambios.");
        }

        const operationStatus = String(status.operationStatus || "not_found");
        const currentUrl = String(status.currentImageUrl || "");
        if (operationStatus === "linked") {
            if (currentUrl === String(status.newImageUrl || "") && status.fileIntegrity !== "valid") {
                throw new Error("El reemplazo está vinculado, pero el archivo no superó la verificación de integridad. Requiere revisión antes de descartar.");
            }
            const imageTarget = { src: "", removeAttribute: () => {} };
            await submitAdminImageUploadOperation(operation, imageTarget, editSession);
            if (!isCurrentUiSessionContext_(editSession)) {
                throw new Error("La sesión cambió durante la reconciliación del reemplazo. No se continuó con otra cuenta.");
            }
            const key = getAdminImageUploadPendingKey(operation.ownerId, operation.vehicleId, operation.fieldName);
            if (pendingAdminImageUploads.has(key)) {
                throw new Error("El reemplazo está confirmado, pero no se pudo limpiar su operación local. No se completó el descarte.");
            }
            continue;
        }

        if (operationStatus === "not_found") {
            throw new Error("El servidor todavía no registra este intento. Una solicitud anterior podría seguir en curso; se conserva el archivo local y no se completó el descarte. Reintenta la reconciliación más tarde.");
        }

        if (isAdminImageUploadStatusConfirmedCancelled(operationStatus)) {
            if (!commitAdminImageReplacementBaseline_(cleanVehicleId, operation.fieldName, currentUrl, editSession)) {
                throw new Error("No se pudo guardar la referencia activa confirmada antes de limpiar el intento local.");
            }
            const removed = await removePendingAdminImageUploadConfirmed_(operation, editSession);
            if (!removed) throw new Error("No se pudo confirmar la limpieza del intento local; no se completó el descarte.");
            continue;
        }

        throw new Error(
            operationStatus === "requires_review"
                ? "Existe un reemplazo marcado para revisión. Resuélvelo antes de descartar los demás cambios."
                : "Existe un reemplazo todavía pendiente en el servidor. No se declaró cancelado ni se descartaron cambios."
        );
    }
}

async function exitModalEditMode(saveChanges, vehicleId, skipReopen = false) {
    const editSession = getCurrentEditOwnerContext_();
    if (!editSession) {
        showSavingIndicator("error", "La sesión de edición no está disponible. Inicia sesión nuevamente.");
        return false;
    }
    if (!vehicleId) vehicleId = editedItemBuffer?.id || originalItemBackup?.id || originalItemBackupVehicleId;
    const cleanVehicleId = String(vehicleId || "");
    if (!cleanVehicleId) return false;

    if (originalItemBackup && (
        originalItemBackupOwnerId !== editSession.userId ||
        originalItemBackupVehicleId !== cleanVehicleId ||
        String(originalItemBackup.id) !== cleanVehicleId
    )) {
        showSavingIndicator("error", "La copia de edición pertenece a otra sesión o vehículo. No se restauraron datos.");
        return false;
    }

    if (!originalItemBackup) {
        try {
            const stored = getEditBackupStore_(editSession.userId).read(cleanVehicleId);
            if (stored.status === "quarantined") {
                showSavingIndicator("warning", "Se aisló una copia de edición antigua sin propietario verificable; no se restauró.");
                return false;
            }
            if (stored.backup) {
                originalItemBackup = stored.backup;
                originalItemBackupOwnerId = editSession.userId;
                originalItemBackupVehicleId = cleanVehicleId;
            }
        } catch (error) {
            showSavingIndicator("error", "No se pudo verificar la copia local de edición.");
            return false;
        }
    }

    if (!saveChanges && originalItemBackup) {
        try {
            if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
            await resolvePendingAdminImageOperationsBeforeDiscard_(cleanVehicleId);
            if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");

            const backupSnapshot = JSON.parse(JSON.stringify(originalItemBackup));
            let currentEditItem = editedItemBuffer && String(editedItemBuffer.id) === cleanVehicleId
                ? editedItemBuffer
                : null;
            if (!currentEditItem) {
                const currentResponse = await routeAction("getCatalogData");
                if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
                if (!currentResponse || !currentResponse.data || !Array.isArray(currentResponse.data.cortes)) {
                    throw new Error("No se pudo leer el catálogo para identificar los campos pendientes de restauración.");
                }
                currentEditItem = currentResponse.data.cortes.find(item => String(item.id) === cleanVehicleId) || null;
                if (!currentEditItem) throw new Error("El vehículo ya no aparece en el catálogo; no se inició la restauración.");
            }
            const fieldsToRestore = getEditBackupFieldsToRestore(
                backupSnapshot, currentEditItem, ADMIN_MODAL_EDIT_FIELDS
            );
            for (const field of fieldsToRestore) {
                if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
                const restored = await saveFieldSilently(cleanVehicleId, field, backupSnapshot[field]);
                if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
                if (!restored) throw new Error("FIELD_RESTORE_FAILED");
            }

            if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
            const response = await routeAction("getCatalogData");
            if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
            if (!response || !response.data || !Array.isArray(response.data.cortes)) {
                throw new Error("No se pudo leer el catálogo para verificar la restauración.");
            }
            const updatedItem = response.data.cortes.find(item => String(item.id) === cleanVehicleId);
            if (!updatedItem) throw new Error("El vehículo ya no aparece en el catálogo; no se confirmó el descarte.");

            const mismatches = fieldsToRestore.filter(field =>
                JSON.stringify(updatedItem[field]) !== JSON.stringify(backupSnapshot[field])
            );
            if (mismatches.length) {
                editedItemBuffer = { ...updatedItem };
                throw new Error("No se confirmó por lectura posterior la restauración de: " + mismatches.join(", ") + ". Puedes reintentar el descarte.");
            }

            setState({ catalogData: response.data });
            inEditMode = false;
            window.inEditMode = false;
            try { getEditBackupStore_(editSession.userId).remove(cleanVehicleId); }
            catch (error) { showSavingIndicator("warning", "Cambios restaurados, pero no se pudo limpiar la copia local."); }
            clearInMemoryEditBackup_();
            showSavingIndicator("success", "Cambios descartados; los reemplazos de imagen ya confirmados se conservaron.");

            if (!skipReopen) mostrarDetalleModal(updatedItem);
            else document.getElementById("modalDetalle").classList.remove("visible");
        } catch (error) {
            console.warn("No se pudo completar el descarte verificado.", error && error.message === "EDIT_SESSION_CHANGED" ? "EDIT_SESSION_CHANGED" : error && error.name || "DiscardError");
            showSavingIndicator("error", error && error.message === "EDIT_SESSION_CHANGED"
                ? "La sesión cambió durante el descarte. No se continuó con la cuenta nueva."
                : error && error.message || "No se pudo verificar el descarte.");
            return false;
        }
    } else {
        if (!isCurrentUiSessionContext_(editSession)) return false;
        inEditMode = false;
        window.inEditMode = false;
        try { getEditBackupStore_(editSession.userId).remove(cleanVehicleId); }
        catch (error) { console.warn("No se pudo limpiar la copia local de edición.", error && error.name || "StorageError"); }
        clearInMemoryEditBackup_();

        if (!skipReopen) {
            routeAction("getCatalogData").then(response => {
                if (!isCurrentUiSessionContext_(editSession)) return;
                if (response && response.data) {
                    setState({ catalogData: response.data });
                    const updatedItem = response.data.cortes.find(item => String(item.id) === cleanVehicleId);
                    if (updatedItem) mostrarDetalleModal(updatedItem);
                }
            }).catch(error => console.warn("No se pudo actualizar el catálogo al cerrar la edición.", error && error.name || "CatalogError"));
        } else {
            document.getElementById("modalDetalle").classList.remove("visible");
            routeAction("getCatalogData").then(response => {
                if (isCurrentUiSessionContext_(editSession) && response && response.data) setState({ catalogData: response.data });
            }).catch(error => console.warn("No se pudo actualizar el catálogo al cerrar la edición.", error && error.name || "CatalogError"));
        }
    }
    return true;
}

function getAdminImageUploadOwnerVehicleKey(ownerId, vehicleId) {
    return encodeURIComponent(String(ownerId)) + "::" + encodeURIComponent(String(vehicleId));
}
function getAdminImageUploadPendingKey(ownerId, vehicleId, fieldName) {
    return getAdminImageUploadOwnerVehicleKey(ownerId, vehicleId) + "::" + String(fieldName);
}
async function loadPendingAdminImageUploads(vehicleId, ownerId) {
    const cleanVehicleId = String(vehicleId), cleanOwnerId = String(ownerId || "");
    const sessionContext = getCurrentEditOwnerContext_();
    if (!cleanOwnerId || !sessionContext || String(sessionContext.userId || "") !== cleanOwnerId ||
        !isCurrentUiSessionContext_(sessionContext)) return false;
    const ownerVehicleKey = getAdminImageUploadOwnerVehicleKey(cleanOwnerId, cleanVehicleId);
    ADMIN_IMAGE_UPLOAD_FIELDS.forEach(fieldName => pendingAdminImageUploads.delete(getAdminImageUploadPendingKey(cleanOwnerId, cleanVehicleId, fieldName)));
    pendingAdminImageUploadsLoaded.delete(ownerVehicleKey);
    const results = await Promise.all(ADMIN_IMAGE_UPLOAD_FIELDS.map(fieldName =>
        offline.getAdminImageUploadPendingOperation(cleanVehicleId, fieldName, cleanOwnerId)
    ));
    if (!isCurrentUiSessionContext_(sessionContext)) return false;
    if (results.some(result => !result || result.available !== true)) return false;
    results.forEach((result, index) => {
        if (result.operation && String(result.operation.ownerId || "") === cleanOwnerId) {
            pendingAdminImageUploads.set(getAdminImageUploadPendingKey(cleanOwnerId, cleanVehicleId, ADMIN_IMAGE_UPLOAD_FIELDS[index]), result.operation);
        }
    });
    pendingAdminImageUploadsLoaded.add(ownerVehicleKey);
    return true;
}

function createAdminImageUploadOperationId() {
    const cryptoApi = window.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
        const bytes = new Uint8Array(24);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("El navegador no dispone de un generador seguro para identificar el reemplazo.");
}

function readAdminImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo seleccionado."));
        reader.readAsDataURL(file);
    });
}

async function submitAdminImageUploadOperation(operation, imgElement, expectedSession = null) {
    const editSession = expectedSession || getCurrentEditOwnerContext_();
    if (!editSession || !isCurrentUiSessionContext_(editSession) || !operation ||
        String(operation.ownerId || "") !== String(editSession.userId || "")) {
        throw new Error("El reemplazo pendiente pertenece a otra cuenta o no tiene un propietario verificable.");
    }
    const response = await routeAction("uploadAdminImage", {
        ...getDeveloperSessionPayload(),
        vehicleId: operation.vehicleId,
        fileData: operation.fileData,
        filename: operation.filename,
        mimeType: operation.mimeType,
        fieldName: operation.fieldName,
        opId: operation.id
    });
    if (!isCurrentUiSessionContext_(editSession)) {
        throw new Error("La sesión cambió durante el reemplazo. El intento permanece guardado para reconciliarlo al volver a iniciar sesión.");
    }
    if (!response || response.status !== "success" || !response.imageUrl) {
        throw new Error("El servicio no confirmó el reemplazo de imagen.");
    }

    const key = getAdminImageUploadPendingKey(operation.ownerId, operation.vehicleId, operation.fieldName);
    const currentImageUrl = response.superseded
        ? String(response.currentImageUrl || "")
        : String(response.imageUrl);
    if (currentImageUrl) imgElement.src = currentImageUrl;
    else imgElement.removeAttribute("src");

    const baselinePersisted = commitAdminImageReplacementBaseline_(
        operation.vehicleId, operation.fieldName, currentImageUrl, editSession
    );
    if (!baselinePersisted) {
        pendingAdminImageUploads.set(key, operation);
        showSavingIndicator("warning", "El servidor confirmó la imagen, pero no se pudo guardar la nueva base local. El intento se conserva para reconciliarlo antes de descartar.");
        return;
    }

    const removed = await offline.removeAdminImageUploadPendingOperation(
        operation.vehicleId, operation.fieldName, operation.id, operation.ownerId
    );
    if (!isCurrentUiSessionContext_(editSession)) {
        throw new Error("La sesión cambió durante la limpieza local. El resultado se reconciliará al volver a iniciar sesión.");
    }
    let cleanupConfirmed = removed === true;
    if (!cleanupConfirmed) {
        const latest = await offline.getAdminImageUploadPendingOperation(
            operation.vehicleId, operation.fieldName, operation.ownerId
        );
        if (!isCurrentUiSessionContext_(editSession)) {
            throw new Error("La sesión cambió durante la verificación de limpieza. No se modificó el estado en memoria.");
        }
        if (latest && latest.available === true) {
            if (latest.operation) pendingAdminImageUploads.set(key, latest.operation);
            else {
                pendingAdminImageUploads.delete(key);
                cleanupConfirmed = true;
            }
        } else {
            pendingAdminImageUploads.set(key, operation);
        }
    } else {
        pendingAdminImageUploads.delete(key);
    }

    if (response.superseded) {
        showSavingIndicator("warning", "El intento se completó, pero el campo cambió después. Se conservó la referencia actual.");
    } else if (!cleanupConfirmed) {
        showSavingIndicator("warning", "Imagen guardada; el intento local sigue pendiente de limpieza. Reintentar no duplicará la operación.");
    } else {
        showSavingIndicator("success", "Imagen guardada");
    }
}
function convertImageToEditable(imgElement, vehicleId, fieldName) {
    imgElement.style.cursor = "pointer";
    imgElement.style.border = "2px dashed #007bff";
    imgElement.title = "Haga clic para reemplazar esta imagen";
    let uploadInProgress = false;

    imgElement.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cleanVehicleId = String(vehicleId);
        const editSession = getCurrentEditOwnerContext_();
        if (!editSession || !editSession.userId) {
            showSavingIndicator("error", "No se pudo verificar la cuenta propietaria del reemplazo.");
            return;
        }
        const ownerId = String(editSession.userId);
        const ownerVehicleKey = getAdminImageUploadOwnerVehicleKey(ownerId, cleanVehicleId);
        const pendingKey = getAdminImageUploadPendingKey(ownerId, cleanVehicleId, fieldName);
        if (uploadInProgress) return;
        if (!pendingAdminImageUploadsLoaded.has(ownerVehicleKey)) {
            showSavingIndicator("error", "No se pudo verificar el estado local del reemplazo. Vuelve a activar el modo de edición.");
            return;
        }

        const previousSrc = imgElement.src;
        const pendingOperation = pendingAdminImageUploads.get(pendingKey);
        if (pendingOperation) {
            const shouldRetry = window.confirm(
                "Existe un reemplazo pendiente para esta imagen. ¿Deseas reintentar el mismo intento guardado? No se iniciará una sustitución nueva hasta resolverlo."
            );
            if (!shouldRetry) return;

            uploadInProgress = true;
            imgElement.src = pendingOperation.fileData;
            showSavingIndicator("processing", "Recuperando reemplazo pendiente...");
            try {
                await submitAdminImageUploadOperation(pendingOperation, imgElement, editSession);
            } catch (error) {
                if (isCurrentUiSessionContext_(editSession)) {
                    imgElement.src = previousSrc;
                    console.error("No se pudo recuperar el reemplazo pendiente:", error && error.name || "UploadError");
                    showSavingIndicator("error", "No se pudo confirmar. El intento original quedó guardado; vuelve a hacer clic para reintentar.");
                }
            } finally {
                uploadInProgress = false;
            }
            return;
        }

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            uploadInProgress = true;
            try {
                const fileData = await readAdminImageAsDataUrl(file);
                if (!isCurrentUiSessionContext_(editSession) || String(editSession.userId || "") !== ownerId) {
                    throw new Error("La sesión cambió durante la lectura del archivo. No se inició el reemplazo.");
                }
                const operation = {
                    id: createAdminImageUploadOperationId(),
                    ownerId: ownerId,
                    vehicleId: cleanVehicleId,
                    fieldName: fieldName,
                    fileData: fileData,
                    filename: file.name || (fieldName + "_" + Date.now() + ".png"),
                    mimeType: file.type || "image/png",
                    createdAt: Date.now()
                };
                const saved = await offline.saveAdminImageUploadPendingOperation(operation);
                if (!isCurrentUiSessionContext_(editSession)) {
                    throw new Error("La sesión cambió mientras se guardaba el reemplazo. El snapshot durable se conserva para reconciliarlo con su cuenta propietaria.");
                }
                if (!saved || saved.saved !== true) {
                    if (saved && saved.operation) pendingAdminImageUploads.set(pendingKey, saved.operation);
                    if (saved && saved.conflict) {
                        throw new Error("Ya existe otro reemplazo pendiente para este campo. Reintenta primero la operación original.");
                    }
                    throw new Error("No se pudo guardar el intento en IndexedDB. La imagen no se envió al servidor.");
                }

                pendingAdminImageUploads.set(pendingKey, operation);
                imgElement.src = fileData;
                showSavingIndicator("processing", "Subiendo imagen...");
                await submitAdminImageUploadOperation(operation, imgElement, editSession);
            } catch (error) {
                if (isCurrentUiSessionContext_(editSession)) {
                    imgElement.src = previousSrc;
                    console.error("Error al subir imagen editada:", error && error.name || "UploadError");
                    showSavingIndicator("error", error && error.message
                        ? error.message
                        : "No se pudo confirmar. El intento pendiente se conserva para reintentar.");
                }
            } finally {
                uploadInProgress = false;
            }
        };
        fileInput.click();
    };
}

/**
 * Helper para normalizar versiones (ej. "SR / TRD" -> "sr trd")
 * Se utiliza para agrupar generaciones y validar colisiones.
 */
const normalizeVersion = (v) => (v || "").toString().toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');

/* FUNCIONES DE RELACIÓN VIN - VERSIONES DE EQUIPAMIENTO */
export function parseEquipmentVersions(rawStr) {
    if (!rawStr) return [];
    // Normalizar separadores admitidos: comas ",", diagonales "/" y diagonales inversas "\" sin duplicados
    const parts = String(rawStr).split(/[,/\\\\]+/);
    const seen = new Set();
    const result = [];
    for (const p of parts) {
        const clean = p.trim();
        if (clean && !seen.has(clean.toUpperCase())) {
            seen.add(clean.toUpperCase());
            result.push(clean);
        }
    }
    return result;
}

export function normalizeVinCollectionValue(value, context) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") throw new Error((context || "VIN") + ": cada elemento debe ser texto.");
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized.startsWith("OP-") || normalized.startsWith("OP_") || normalized.includes("IDOPERACION")) return "";
    if (!/^[A-Z0-9]{1,18}$/.test(normalized)) throw new Error((context || "VIN") + ": identificador inválido «" + normalized + "».");
    return normalized;
}
export function normalizeVinCollectionArray(values, context) {
    if (!Array.isArray(values)) throw new Error((context || "VIN") + ": se esperaba una colección.");
    if (values.length > 3) throw new Error((context || "VIN") + ": máximo tres posiciones.");
    const normalized = values.map(value => normalizeVinCollectionValue(value, context));
    const seen = new Set();
    normalized.forEach(value => {
        if (!value) return;
        if (seen.has(value)) throw new Error((context || "VIN") + ": identificador duplicado «" + value + "».");
        seen.add(value);
    });
    return normalized;
}
export function parseVinCollection(rawVin) {
    if (rawVin === null || rawVin === undefined || rawVin === "") return [];
    if (Array.isArray(rawVin)) return normalizeVinCollectionArray(rawVin, "Colección VIN");
    const text = String(rawVin).trim();
    if (!text) return [];
    if (text.startsWith("[") || text.endsWith("]")) {
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (error) { throw new Error("La colección VIN contiene JSON mal formado; no se interpretó como texto heredado."); }
        if (!Array.isArray(parsed)) throw new Error("El formato JSON de VIN debe ser un array.");
        return normalizeVinCollectionArray(parsed, "Colección VIN JSON");
    }
    const values = text.split(/[,/\\;])
        .map(value => normalizeVinCollectionValue(value, "Colección VIN heredada"));
    if (values.length > 3) throw new Error("La colección VIN heredada supera el máximo de tres identificadores.");
    return normalizeVinCollectionArray(values, "Colección VIN heredada");
}
export function serializeVinCollection(vinArray) {
    const normalized = normalizeVinCollectionArray(vinArray, "Serialización VIN");
    return normalized.some(Boolean) ? JSON.stringify(normalized) : "";
}

export function mapVersionsWithVins(versionesStr, vinRaw) {
    const versions = parseEquipmentVersions(versionesStr);
    const rawVins = parseVinCollection(vinRaw);

    // Regla de negocio: Si el modelo solo tiene una versión de equipamiento (o ninguna),
    // no debe mostrar ningún número VIN distintivo en el modal.
    // Solo si el modelo tiene más de 1 versión de equipamiento, se extraen 4 dígitos consecutivos distintivos.
    if (versions.length <= 1) {
        if (versions.length === 1) {
            return [{ version: versions[0], vin: null }];
        }
        return [];
    }

    // Formatear cada VIN ignorando los últimos 5 dígitos y extrayendo los 4 dígitos distintivos
    const cleanedVins = rawVins.map(v => {
        if (!v) return "";
        let s = String(v).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (s.startsWith("OP")) return "";
        // Los prefijos guardados por WRITE/ADMIN ya excluyen el serial (máximo 13 caracteres).
        // Solo se recortan los últimos cinco caracteres de VIN completos heredados.
        if (s.length > 13) {
            s = s.substring(0, s.length - 5);
        }
        return s;
    });

    // Detectar el índice donde difieren las versiones de equipamiento
    const nonNullVins = cleanedVins.filter(Boolean);
    let diffIdx = -1;
    if (nonNullVins.length >= 2) {
        const minLen = Math.min(...nonNullVins.map(v => v.length));
        for (let i = 0; i < minLen; i++) {
            const setAtI = new Set(nonNullVins.map(v => v[i]));
            if (setAtI.size > 1) {
                diffIdx = i;
                break;
            }
        }
    }

    const clean4DigitVins = cleanedVins.map(s => {
        if (!s) return null;
        if (s.length <= 4) return s;
        if (diffIdx !== -1) {
            const start = Math.max(0, Math.min(diffIdx, s.length - 4));
            return s.substring(start, start + 4);
        }
        return s.slice(-4);
    });

    // Cada versión se relaciona individualmente con su correspondiente VIN si existe
    return versions.map((version, index) => {
        return {
            version,
            vin: clean4DigitVins[index] || null
        };
    });
}

/**
 * Establece una imagen optimizada intentando cargarla desde el caché de IndexedDB.
 * @param {HTMLImageElement} imgElement - El elemento img a actualizar.
 * @param {string} fileId - El ID o URL de la imagen.
 * @param {number} size - El tamaño solicitado para la imagen.
 */
export async function setOptimizedImage(imgElement, fileId, size = IMG_SIZE_SMALL) {
    const requestToken = thumbnailObjectUrls.begin(imgElement);
    if (!fileId) {
        imgElement.src = getImageUrl(null);
        return;
    }

    // Si la imagen falla al cargar, podría estar en la papelera o eliminada de Drive.
    // Detectamos la falla y habilitamos/mostramos automáticamente el botón de restauración de papelera.
    const originalOnError = imgElement.onerror;
    imgElement.onerror = (e) => {
        const restoreBtn = document.getElementById('btn-admin-restore-trash');
        if (restoreBtn) {
            restoreBtn.style.display = 'block';
        }
        if (typeof originalOnError === 'function') {
            originalOnError(e);
        }
    };

    const cleanId = typeof fileId === 'string' ? fileId.trim() : fileId;
    const normalizedSize = Math.max(100, Math.min(1600, Math.round(Number(size) || IMG_SIZE_SMALL)));
    const cacheKey = `${cleanId}::w${normalizedSize}`;

    try {
        const cachedBlob = await Promise.race([
            offline.getThumbnail(cleanId, normalizedSize),
            new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 800))
        ]).catch(() => null);

        if (!thumbnailObjectUrls.isCurrent(imgElement, requestToken)) return;
        if (cachedBlob && thumbnailObjectUrls.attach(cacheKey, cachedBlob, imgElement, requestToken)) return;
    } catch (e) {
        /* Continuar a red si falla la lectura local. */
    }

    if (!thumbnailObjectUrls.isCurrent(imgElement, requestToken)) return;
    const remoteUrl = getImageUrl(cleanId, normalizedSize);
    imgElement.src = remoteUrl;

    if (cleanId && typeof cleanId === "string" && !cleanId.startsWith("blob:") && !cleanId.includes("placehold.co")) {
        // La compresión solo persiste la miniatura; no crea ObjectURL sin un elemento consumidor.
        offline.compressAndStoreThumbnail(remoteUrl, cleanId, normalizedSize).catch(() => {});
    }
}

export function getImageUrl(fileId, size = 400) {
    // Si ya es una URL de Blob o Data URL (base64/svg), devolverla directamente.
    if (fileId && typeof fileId === 'string' && (fileId.startsWith('blob:') || fileId.startsWith('data:'))) {
        return fileId;
    }

    const placeholder = "https://placehold.co/400x300/cccccc/333333?text=Sin+Imagen";

    if (!fileId || typeof fileId !== 'string' || fileId.trim() === '') {
        return placeholder;
    }

    let id = fileId.trim();

    // Si es una URL de Google Drive, extraer el ID.
    if (id.startsWith('http')) {
        if (id.includes('drive.google.com')) {
            const match = id.match(/[\/&]id=([a-zA-Z0-9_-]+)/) || id.match(/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                id = match[1];
            } else {
                // Si es una URL de Google pero no podemos extraer el ID, es mejor no mostrar nada.
                return placeholder;
            }
        } else {
            // Si es otra URL (ej. de wikimedia), la devolvemos directamente.
            return id;
        }
    }

    // Si después del procesamiento no tenemos un ID válido, devolver el placeholder.
    if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
        return placeholder;
    }

    /* TAREA 6 (B33): VISUALIZACIÓN DE MINIATURAS PNG TRANSPARENTES */
    // Evitar parámetros de miniaturas (=w / =s) de Google que convierten PNGs transparentes a JPEG con fondo negro
    return `https://lh3.googleusercontent.com/d/${id}`;
}

export function getLogoUrlForMarca(marca, categoria) {
    const { catalogData } = getState();
    const { logos } = catalogData;

    if (!logos || !logos.length || !marca) {
        return null;
    }

    const normalize = (str) => str ? String(str).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const normalizedMarca = normalize(marca);
    const normalizedCategoria = normalize(categoria);

    const potentialMatches = logos.filter(logo => {
        const normalizedLogoMarca = normalize(logo.nombreMarca);
        return normalizedLogoMarca.startsWith(normalizedMarca);
    });

    if (potentialMatches.length === 0) return null;
    if (potentialMatches.length === 1) return potentialMatches[0].urlLogo;

    let bestMatch = null;
    if (normalizedCategoria) {
        const catSynonyms = (normalizedCategoria === 'motos' || normalizedCategoria === 'motocicletas')
            ? ['motos', 'motocicletas']
            : [normalizedCategoria];

        for (const synonym of catSynonyms) {
            bestMatch = potentialMatches.find(logo => normalize(logo.nombreMarca).includes(synonym));
            if (bestMatch) break;
        }
    }

    if (!bestMatch) {
        bestMatch = potentialMatches.find(logo => normalize(logo.nombreMarca) === normalizedMarca);
    }

    if (!bestMatch) {
        bestMatch = potentialMatches.reduce((prev, current) =>
            (prev.nombreMarca.length < current.nombreMarca.length) ? prev : current
        );
    }

    return bestMatch ? bestMatch.urlLogo : (potentialMatches.length > 0 ? potentialMatches[0].urlLogo : null);
}

function crearCarrusel(titulo, items, cardGenerator) {
    const cont = document.getElementById("contenido");
    if (!items || items.length === 0 || !cont) return;

    const section = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = titulo;
    title.style.marginTop = '40px';
    section.appendChild(title);

    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'carousel-container';
    const carouselTrack = document.createElement('div');
    carouselTrack.className = 'carousel-track';

    items.forEach(item => {
        const card = cardGenerator(item);
        carouselTrack.appendChild(card);
    });
    carouselContainer.appendChild(carouselTrack);

    const getVisibleCards = () => {
        const containerWidth = carouselContainer.offsetWidth;
        const cardWidth = 140 + 20; // Ancho de la tarjeta + margen
        return Math.floor(containerWidth / cardWidth) || 1;
    };

    if (items.length > getVisibleCards()) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-btn prev';
        prevBtn.innerHTML = '&#10094;';
        carouselContainer.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-btn next';
        nextBtn.innerHTML = '&#10095;';
        carouselContainer.appendChild(nextBtn);

        const cardWidth = 140 + 20;

        const updateCarouselButtons = () => {
            const scrollLeft = carouselTrack.scrollLeft;
            const maxScrollLeft = carouselTrack.scrollWidth - carouselTrack.clientWidth;
            prevBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
            nextBtn.style.display = scrollLeft < maxScrollLeft - 1 ? 'flex' : 'none';
        };

        nextBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: cardWidth * getVisibleCards(), behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: -cardWidth * getVisibleCards(), behavior: 'smooth' });
        });

        carouselTrack.addEventListener('scroll', () => setTimeout(updateCarouselButtons, 150));
        window.addEventListener('resize', () => setTimeout(updateCarouselButtons, 150));
        setTimeout(updateCarouselButtons, 150);
    }

    section.appendChild(carouselContainer);
    cont.appendChild(section);
}

export function mostrarCategorias() {
    const { catalogData, searchHistory, viewedItems } = getState();
    const { cortes, sortedCategories } = catalogData;

    if (document.getElementById("searchInput").value.trim()) return;

    const cont = document.getElementById("contenido");
    cont.innerHTML = "";

    // 1. Mostrar Historial de Búsqueda (si existe)
    if (searchHistory && searchHistory.length > 0) {
        const historySection = document.createElement('div');
        historySection.className = 'search-history-section';
        historySection.innerHTML = '<h4 style="margin-top:20px;">Búsquedas Recientes</h4>';
        const historyContainer = document.createElement('div');
        historyContainer.className = 'search-history-container';

        searchHistory.forEach(item => {
            const tag = document.createElement('span');
            tag.className = 'search-tag';
            tag.textContent = item.term;
            tag.onclick = () => {
                const input = document.getElementById('searchInput');
                input.value = item.term;
                // Forzar visualización de botón X y filtrado
                input.parentElement.classList.add('has-text');
                window.navigation.filtrarContenido(item.term);
            };
            historyContainer.appendChild(tag);
        });
        historySection.appendChild(historyContainer);
        cont.appendChild(historySection);
    }

    // 2. Mostrar Vistos Recientemente
    if (viewedItems && viewedItems.length > 0) {
        const viewedCortes = viewedItems.map(v => v.data);
        crearCarrusel('Vistos Recientemente', viewedCortes, item => {
            return crearCardVehiculo(item, true); // true para no mostrar badge en esta sección
        });
    }

    mostrarUltimosAgregados();

    // Comentario: Se implementa el ordenamiento de categorías por población.
    const categoriasPorPoblacion = [...new Set(cortes.map(c => String(c.categoria)).filter(Boolean))]
        .map(cat => ({
            nombre: cat,
            poblacion: cortes.filter(c => String(c.categoria) === cat).length
        }))
        .sort((a, b) => b.poblacion - a.poblacion)
        .map(c => c.nombre);

    crearCarrusel('Categorías Populares', categoriasPorPoblacion, cat => {
        const ejemplo = cortes.find(item => item.categoria === cat && item.imagenVehiculo);
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarMarcas(cat);
        const img = document.createElement("img");
        setOptimizedImage(img, ejemplo?.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Categoría ${cat}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${cat}</div>`;
        card.appendChild(overlay);
        return card;
    });

    const marcasVehiculos = [...new Set(cortes
        .filter(item => item.categoria && !['motocicletas', 'motos'].includes(String(item.categoria).toLowerCase()))
        .map(item => item.marca))]
        .filter(Boolean).sort();

    // Comentario: Se corrige el título y el flujo de navegación para cumplir con el README.
    crearCarrusel('Búsqueda por Marca de Vehículos', marcasVehiculos, marca => {
        const logoUrl = getLogoUrlForMarca(marca, null);
        const card = document.createElement("div");
        card.className = "card brand-logo-item";
        // Cambio Crítico: Corregir el flujo de navegación para que vaya de Marca -> Modelos.
        card.onclick = () => mostrarModelosPorMarca(marca);
        const img = document.createElement("img");
        setOptimizedImage(img, logoUrl, IMG_SIZE_SMALL);
        img.alt = `Marca ${marca}`;
        img.loading = "lazy";
        card.appendChild(img);
        return card;
    });

    const marcasMotos = [...new Set(cortes
        .filter(item => item.categoria && ['motocicletas', 'motos'].includes(String(item.categoria).toLowerCase()))
        .map(item => item.marca))]
        .filter(Boolean).sort();

    // Comentario: Título ajustado para consistencia.
    crearCarrusel('Búsqueda por Marca de Motocicletas', marcasMotos, marca => {
        const logoUrl = getLogoUrlForMarca(marca, 'Motocicletas');
        const card = document.createElement("div");
        card.className = "card brand-logo-item";
        card.onclick = () => mostrarModelos('Motocicletas', marca);
        const img = document.createElement("img");
        setOptimizedImage(img, logoUrl, IMG_SIZE_SMALL);
        img.alt = `Marca ${marca}`;
        img.loading = "lazy";
        card.appendChild(img);
        return card;
    });
}

export function mostrarMarcas(categoria) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    setState({ navigationState: { level: "marcas", categoria: categoria, origin: "categoria" } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "marcas")) {
        window.history.pushState({ level: "marcas", categoria: categoria, origin: "categoria" }, '', window.location.pathname + window.location.search);
    }
    const cont = document.getElementById("contenido");
    cont.innerHTML = `<span class="backBtn" onclick="window.navigation.irAPaginaPrincipal()">${backSvg} Volver</span><h4>Marcas de ${categoria}</h4>`;
    const itemsInCategory = cortes.filter(item => item.categoria === categoria);
    const marcas = [...new Set(itemsInCategory.map(item => item.marca))].filter(m => m).sort();

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
    grid.style.gap = "30px";

    marcas.forEach(m => {
        const logoUrl = getLogoUrlForMarca(m, categoria);
        const logoContainer = document.createElement("div");
        logoContainer.className = "card brand-logo-item";
        logoContainer.onclick = () => mostrarModelos(categoria, m);

        const img = document.createElement("img");
        setOptimizedImage(img, logoUrl, IMG_SIZE_SMALL); // 'https://placehold.co/120x80/cccccc/333333?text=Sin+Logo';
        img.alt = `Marca ${m}`;
        img.loading = "lazy";

        logoContainer.appendChild(img);
        grid.appendChild(logoContainer);
    });
    cont.appendChild(grid);
}

/**
 * Nueva función para implementar el flujo de navegación lineal: Marca -> Modelos.
 * Reemplaza la función redundante y circular mostrarCategoriasPorMarca.
 * @param {string} marca - La marca de vehículos para la cual mostrar los modelos.
 */
export function mostrarModelosPorMarca(marca) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    // Se establece el estado de navegación actual capturando el estado previo.
    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "modelosPorMarca", marca: marca, origin: "marca", previousState } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "modelosPorMarca")) {
        window.history.pushState({ level: "modelosPorMarca", marca: marca, origin: "marca" }, '', window.location.pathname + window.location.search);
    }
    const cont = document.getElementById("contenido");

    // Lógica dinámica para el botón "Volver": regresa a búsqueda si ese era el origen.
    const backAction = previousState.level === 'busqueda'
        ? 'window.ui.regresarABusqueda()'
        : 'window.navigation.irAPaginaPrincipal()';

    // Se limpia el contenido y se añade el botón de regreso dinámico.
    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Modelos de ${marca}</h4>`;

    // Se filtran los cortes para obtener todos los modelos de la marca seleccionada, excluyendo motocicletas
    const modelosFiltrados = cortes.filter(item => item.marca === marca && item.categoria && !['motocicletas', 'motos'].includes(String(item.categoria).toLowerCase()));

    // De-duplicación inteligente: Considera modelo y categoría para no ocultar variantes (ej. Yaris Sedan vs Hatchback)
    const variantesUnicas = [...new Map(modelosFiltrados.map(item => {
        const key = `${item.modelo}|${item.categoria}`;
        return [key, item];
    })).values()].sort((a,b) => String(a.modelo).localeCompare(String(b.modelo)));

    const grid = document.createElement("div");
    grid.className = "grid";
    variantesUnicas.forEach(ejemplo => {
        const card = document.createElement("div");
        card.className = "card";
        // Al hacer clic, pasamos la categoría para asegurar que el filtrado posterior sea preciso
        card.onclick = () => navegarADetallesDeModelo(ejemplo.categoria, marca, ejemplo.modelo);
        const img = document.createElement("img");
        setOptimizedImage(img, ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Modelo ${ejemplo.modelo}`;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        // Si hay múltiples categorías para el mismo nombre de modelo, mostramos la categoría para diferenciar
        const tieneDuplicados = variantesUnicas.filter(v => v.modelo === ejemplo.modelo).length > 1;
        const textoDiferenciador = tieneDuplicados ? `<div class="overlay-text-secondary">${ejemplo.categoria}</div>` : '';

        overlay.innerHTML = `<div class="overlay-text-primary">${ejemplo.modelo}</div>${textoDiferenciador}`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

/**
 * Función "Hub" para decidir el siguiente paso en la navegación después de seleccionar un modelo.
 * Verifica si existen versiones de equipamiento para un modelo y dirige al usuario a la pantalla
 * correspondiente (selección de versión o selección de tipo de encendido).
 * @param {string} categoria - La categoría del vehículo.
 * @param {string} marca - La marca del vehículo.
 * @param {string} modelo - El modelo del vehículo.
 */
function navegarADetallesDeModelo(categoria, marca, modelo) {
    const { catalogData, navigationState } = getState();
    const { cortes } = catalogData;
    const origin = (navigationState && navigationState.origin) || "categoria";

    // Comentario: Lógica de navegación refactorizada para omitir pantallas de selección con una sola opción.
    // 1. Obtener todos los cortes para el modelo específico.
    let vehiculosFiltrados = cortes.filter(item =>
        item.categoria === categoria &&
        item.marca === marca &&
        item.modelo === modelo
    );

    // 2. Analizar Versiones de Equipamiento.
    const versionesDeEquipamiento = [...new Set(vehiculosFiltrados.map(v => v.versionesAplicables).filter(Boolean))];

    if (versionesDeEquipamiento.length === 1) {
        // Omitir pantalla: Si hay una sola versión, se filtra el conjunto de datos y se continúa el análisis.
        vehiculosFiltrados = vehiculosFiltrados.filter(v => v.versionesAplicables === versionesDeEquipamiento[0]);
    } else if (versionesDeEquipamiento.length > 1) {
        // Detener: Si hay múltiples versiones, se muestra la pantalla de selección y termina el flujo.
        mostrarVersionesEquipamiento(categoria, marca, modelo);
        return;
    }
    // Si hay 0 versiones, se continúa con el conjunto de datos original.

    // 3. Analizar Tipos de Encendido sobre el conjunto de datos ya (potencialmente) filtrado.
    const tiposEncendido = [...new Set(vehiculosFiltrados.map(v => v.tipoEncendido).filter(Boolean))];

    if (tiposEncendido.length === 1) {
        // Omitir pantalla: Si hay un solo tipo de encendido, se filtra y se navega directamente a la pantalla de Años.
        vehiculosFiltrados = vehiculosFiltrados.filter(v => v.tipoEncendido === tiposEncendido[0]);
        mostrarVersiones(vehiculosFiltrados, categoria, marca, modelo);
        return;
    } else if (tiposEncendido.length > 1) {
        // Detener: Si hay múltiples tipos, se muestra la pantalla de selección y termina el flujo.
        const versionEquipamiento = versionesDeEquipamiento.length === 1 ? versionesDeEquipamiento[0] : null;
        mostrarTiposEncendido(categoria, marca, versionEquipamiento, modelo);
        return;
    }

    // 4. Fallback: Si no hay ni versiones ni tipos de encendido, pero sí hay datos, se muestra la pantalla de Años.
    if (vehiculosFiltrados.length > 0) {
        mostrarVersiones(vehiculosFiltrados, categoria, marca, modelo);
    } else {
        // Caso de seguridad: no debería ocurrir si se hizo clic en un modelo existente.
        showNoResultsMessage(`Datos para ${marca} ${modelo}`);
    }
}

export function mostrarModelos(categoria, marca, versionEquipamiento = null) {
    const { catalogData, navigationState } = getState();
    const { cortes } = catalogData;

    const previousState = navigationState || {};
    const origin = previousState.origin || "categoria";
    setState({ navigationState: { level: "modelos", categoria, marca, versionEquipamiento, origin, previousState } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "modelos")) {
        window.history.pushState({ level: "modelos", categoria, marca, versionEquipamiento, origin }, '', window.location.pathname + window.location.search);
    }
    const cont = document.getElementById("contenido");

    // Lógica dinámica para el botón "Volver"
    let backAction;
    if (versionEquipamiento) {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}')`;
    } else if (origin === 'marca' || previousState.level === 'modelosPorMarca') {
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        backAction = `window.ui.mostrarMarcas('${categoria}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Modelos de ${marca} ${versionEquipamiento || ''}</h4>`;

    let modelosFiltrados = cortes.filter(item => item.categoria === categoria && item.marca === marca);
    if (versionEquipamiento) {
        modelosFiltrados = modelosFiltrados.filter(item => item.versionesAplicables === versionEquipamiento);
    }

    // De-duplicación inteligente también aquí
    const variantesUnicas = [...new Map(modelosFiltrados.map(item => {
        const key = `${item.modelo}|${item.categoria}`;
        return [key, item];
    })).values()].sort((a,b) => String(a.modelo).localeCompare(String(b.modelo)));

    const grid = document.createElement("div"); grid.className = "grid";
    variantesUnicas.forEach(ejemplo => {
        const card = document.createElement("div"); card.className = "card";
        card.onclick = () => navegarADetallesDeModelo(ejemplo.categoria, marca, ejemplo.modelo);
        const img = document.createElement("img");
        setOptimizedImage(img, ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Modelo ${ejemplo.modelo}`;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div"); overlay.className = "overlay";
        const tieneDuplicados = variantesUnicas.filter(v => v.modelo === ejemplo.modelo).length > 1;
        const textoDiferenciador = tieneDuplicados ? `<div class="overlay-text-secondary">${ejemplo.categoria}</div>` : '';

        overlay.innerHTML = `<div class="overlay-text-primary">${ejemplo.modelo}</div>${textoDiferenciador}`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

export function mostrarTiposEncendido(categoria, marca, versionEquipamiento, modelo) {
     const { catalogData, navigationState } = getState();
    const { cortes } = catalogData;
    const previousState = navigationState || {};
    const origin = previousState.origin || "categoria";
    setState({ navigationState: { level: "tiposEncendido", categoria, marca, versionEquipamiento, modelo, origin, previousState } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "tiposEncendido")) {
        window.history.pushState({ level: "tiposEncendido", categoria, marca, versionEquipamiento, modelo, origin }, '', window.location.pathname + window.location.search);
    }

    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica para el botón "Volver".
    // Regresa a `mostrarVersionesEquipamiento` si ese fue el paso anterior, si no, a `mostrarModelos`.
    // Se añade soporte para el flujo de navegación por marca (modelosPorMarca).
    let backAction;
    if (previousState.level === 'versionesEquipamiento') {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}', '${modelo}')`;
    } else if (origin === 'marca' || previousState.level === 'modelosPorMarca') {
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        backAction = `window.ui.mostrarModelos('${categoria}', '${marca}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Tipos de Encendido para ${modelo} ${versionEquipamiento || ''}</h4>`;

    let vehiculos = cortes.filter(item =>
        item.categoria === categoria &&
        item.marca === marca &&
        item.modelo === modelo &&
        (!versionEquipamiento || item.versionesAplicables === versionEquipamiento)
    );

    const tiposEncendido = [...new Set(vehiculos.map(v => v.tipoEncendido).filter(Boolean))];

    // Comentario: Se elimina el bloque condicional `if (tiposEncendido.length === 1)` que causaba el bug.
    // Al forzar siempre la visualización de esta pantalla, se asegura que la función `mostrarVersiones`
    // reciba siempre un conjunto de datos correctamente filtrado por tipo de encendido,
    // manteniendo la consistencia del flujo de navegación.

    const grid = document.createElement("div"); grid.className = "grid";
    tiposEncendido.forEach(tipo => {
        const ejemplo = vehiculos.find(v => v.tipoEncendido === tipo);
        const card = document.createElement("div"); card.className = "card";
        card.onclick = () => mostrarVersiones(vehiculos.filter(v => v.tipoEncendido === tipo), categoria, marca, modelo);

        const img = document.createElement("img");
        setOptimizedImage(img, ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = tipo;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${tipo}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

export function mostrarVersiones(filas, categoria, marca, modelo) {
    const { navigationState } = getState();
    const previousState = navigationState || {};
    const origin = previousState.origin || "categoria";
    setState({ navigationState: { level: "versiones", categoria, marca, modelo, origin, previousState } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "versiones")) {
        window.history.pushState({ level: "versiones", categoria, marca, modelo, origin }, '', window.location.pathname + window.location.search);
    }
    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica MEJORADA para el botón "Volver".
    // Determina si el paso anterior fue una búsqueda, selección de tipo de encendido o de versión de equipamiento.
    let backAction;
    if (previousState.level === 'busqueda' || previousState.level === 'busqueda_focused') {
        // Si venimos de una búsqueda, el botón debe regresar a los resultados de esa búsqueda.
        backAction = `window.ui.regresarABusqueda()`;
    } else if (previousState.level === 'tiposEncendido') {
        // Comentario: Se corrige el bug que pasaba 'null' como string.
        // Se asegura que si no hay versión de equipamiento, se pase el valor literal `null`.
        const veq = previousState.versionEquipamiento ? `'${previousState.versionEquipamiento}'` : null;
        backAction = `window.ui.mostrarTiposEncendido('${categoria}', '${marca}', ${veq}, '${modelo}')`;
    } else if (previousState.level === 'versionesEquipamiento') {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}', '${modelo}')`;
    } else if (origin === 'marca' || previousState.level === 'modelosPorMarca') {
        // Soporte para el flujo de navegación por marca (modelosPorMarca).
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        // Fallback seguro, regresa a la lista de modelos.
        backAction = `window.ui.mostrarModelos('${categoria}', '${marca}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Años de ${modelo}</h4>`;
    const grid = document.createElement("div"); grid.className = "grid";
    filas.forEach(item => {
        const card = crearCardVehiculo(item);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

/**
 * Nueva función para reconstruir la vista de resultados de búsqueda.
 * Utiliza el `query` guardado en el estado de navegación.
 */
export function regresarABusqueda() {
    const { navigationState } = getState();
    // CORRECCIÓN DEFINITIVA: La lógica ahora inspecciona el `previousState` anidado.
    // Cuando se llama a esta función, el estado actual es 'versiones', pero el estado
    // que contiene la información de la búsqueda es el 'previousState'.
    const prevState = navigationState ? navigationState.previousState : null;

    if (prevState && (prevState.level === 'busqueda' || prevState.level === 'busqueda_focused') && prevState.query) {
        // Vuelve a ejecutar la función de filtrado con el término de búsqueda guardado en el estado anterior.
        window.navigation.filtrarContenido(prevState.query);
    } else {
        // Si el estado anterior no es de búsqueda, regresa a la página principal como fallback seguro.
        window.navigation.irAPaginaPrincipal();
    }
}

/* TAREA 7 (B18): CONTEXTO 'ORIGIN' MARCA/CATEGORÍA Y RETORNO LIMPIO SIN BUCLES */
export function mostrarVersionesEquipamiento(categoria, marca, modelo) {
    const { catalogData, navigationState } = getState();
    const { cortes } = catalogData;

    const previousState = navigationState || {};
    const origin = previousState.origin || "categoria";
    setState({ navigationState: { level: "versionesEquipamiento", categoria, marca, modelo, origin, previousState } });
    if (window.history && window.history.pushState && (!window.history.state || window.history.state.level !== "versionesEquipamiento")) {
        window.history.pushState({ level: "versionesEquipamiento", categoria, marca, modelo, origin }, '', window.location.pathname + window.location.search);
    }
    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica para el botón "Volver".
    // Se añade soporte para el flujo de navegación por marca (modelosPorMarca).
    const backAction = origin === 'marca' || previousState.level === 'modelosPorMarca'
        ? `window.ui.mostrarModelosPorMarca('${marca}')`
        : `window.ui.mostrarModelos('${categoria}', '${marca}')`;

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Versiones de ${modelo}</h4>`;

    // Comentario: Se filtra por modelo específico para mostrar solo las versiones relevantes.
    const vehiculosDelModelo = cortes.filter(item => item.categoria === categoria && item.marca === marca && item.modelo === modelo);
    const versiones = [...new Set(vehiculosDelModelo.map(item => item.versionesAplicables).filter(v => v))];

    const grid = document.createElement("div");
    grid.className = "grid";

    versiones.forEach(version => {
        const vehiculosDeVersion = vehiculosDelModelo.filter(v => v.versionesAplicables === version);
        const tiposDeEncendidoEnVersion = [...new Set(vehiculosDeVersion.map(v => v.tipoEncendido).filter(Boolean))].join(' / ');

        const ejemplo = vehiculosDeVersion.find(item => item.imagenVehiculo);
        const card = document.createElement("div");
        card.className = "card";

        // Comentario CORREGIDO: Al hacer clic, se filtran los vehículos de esta versión y se avanza a la pantalla de Años.
        card.onclick = () => mostrarVersiones(vehiculosDeVersion, categoria, marca, modelo);

        const img = document.createElement("img");
        setOptimizedImage(img, ejemplo?.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Versión ${version}`;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        // Comentario: La tarjeta ahora muestra el nombre de la versión y los tipos de encendido asociados.
        overlay.innerHTML = `<div class="overlay-text-primary">${version}</div><div class="overlay-text-secondary">${tiposDeEncendidoEnVersion}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });

    cont.appendChild(grid);
}


/**
 * Determina si un vehículo es elegible para la validación colaborativa de años.
 * @param {object} item - El objeto de datos del vehículo actual.
 * @returns {Promise<boolean>} - Verdadero si es elegible.
 */
async function checkValidationEligibility(item) {
    const currentYear = new Date().getFullYear();
    const { catalogData, currentUser } = getState();
    const { cortes } = catalogData;
    const ownerId = String(currentUser && (currentUser.ID || currentUser.id) || '').trim();
    const cachedResponse = ownerId && ownerId !== '0' ? await offline.getValidationResponse(item.id, ownerId) : null;
    if (cachedResponse) return { eligible: false };

    const normalizedItemVersion = normalizeVersion(item.versionesAplicables);

    // 2. Identificar todos los registros del mismo modelo/marca/categoría/encendido
    // Se incluye versionesAplicables normalizado en el agrupamiento para mayor robustez
    const sameModelGenerations = cortes.filter(c =>
        String(c.marca).toLowerCase() === String(item.marca).toLowerCase() &&
        String(c.modelo).toLowerCase() === String(item.modelo).toLowerCase() &&
        String(c.categoria).toLowerCase() === String(item.categoria).toLowerCase() &&
        String(c.tipoEncendido).toLowerCase() === String(item.tipoEncendido).toLowerCase() &&
        normalizeVersion(c.versionesAplicables) === normalizedItemVersion
    );

    // 3. Condición: El vehículo debe pertenecer a la generación más reciente registrada.
    // Si existe una generación posterior registrada para el mismo vehículo (mismo modelo/marca/categoría/encendido/versión), la notificación no deberá mostrarse.
    const hasPosteriorGeneration = sameModelGenerations.some(c => {
        const yearC = parseInt(c.anoDesde) || 0;
        const yearItem = parseInt(item.anoDesde) || 0;
        return yearC > yearItem;
    });

    if (hasPosteriorGeneration) return { eligible: false };

    // 5. Condición: El rango de años debe finalizar antes del año actual.
    const anoHasta = item.anoHasta ? parseInt(item.anoHasta) : (parseInt(item.anoDesde) || 0);
    if (anoHasta >= currentYear) return { eligible: false };

    // Identificar si es un "modelo muy antiguo" (ej. > 10 años de antigüedad)
    const isOldModel = anoHasta < (currentYear - 10);

    return { eligible: true, isOldModel };
}

/**
 * Muestra el banner de validación colaborativa en el modal de detalles.
 * @param {object} item - El vehículo actual.
 * @param {boolean} isOldModel - Si sigue el flujo de modelos antiguos.
 */
function showValidationBanner(item, isOldModel) {
    const detailContainer = document.getElementById('detalleCompleto');
    if (!detailContainer) return;

    // Phase 2.1.5: Prevenir duplicados - Verificar si el banner ya existe antes de crearlo
    if (document.getElementById('validation-banner')) {
        return;
    }

    // Buscar la ubicación: Debajo de la imagen del vehículo o después del subheader
    const imgVehiculo = detailContainer.querySelector('.img-vehiculo-modal');
    const anchor = imgVehiculo || detailContainer.querySelector('div[style*="margin-bottom: 5px"]');

    const banner = document.createElement('div');
    banner.className = 'validation-banner';
    banner.id = 'validation-banner';

    const currentYear = new Date().getFullYear();
    const { currentUser } = getState();
    const ownerId = String(currentUser && (currentUser.ID || currentUser.id) || '').trim();
    const isRegisteredUser = Boolean(ownerId && ownerId !== "0");
    const suggestionActorPayload = isRegisteredUser
        ? { userId: ownerId, sessionToken: String(currentUser.SessionToken || "") }
        : { userId: "0" };

    const renderStep = (content) => {
        banner.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'validation-content';
        wrapper.appendChild(content);
        banner.appendChild(wrapper);
    };

    let registrationInProgress = false;
    const closeBanner = () => {
        banner.style.maxHeight = '0';
        banner.style.margin = '0';
        banner.style.padding = '0';
        banner.style.opacity = '0';
        banner.style.border = 'none';
        setTimeout(() => banner.remove(), 400);
    };
    const registerAndClose = async (response, suggestedYear = null) => {
        if (registrationInProgress) return;
        registrationInProgress = true;
        const pending = document.createElement('div');
        pending.className = 'validation-message';
        pending.textContent = 'Registrando tu aporte...';
        renderStep(pending);
        try {
            const submission = await confirmValidationBeforeCache(
                () => suggestYear(item.id, suggestedYear || currentYear, response, suggestionActorPayload),
                () => offline.saveValidationResponse(item.id, response, ownerId)
            );
            if (!submission.recorded) {
                registrationInProgress = false;
                const content = document.createDocumentFragment();
                const message = document.createElement('div');
                message.className = 'validation-message';
                message.textContent = submission.response.message || 'El servidor no registró esta respuesta.';
                content.appendChild(message);
                const actions = document.createElement('div');
                actions.className = 'validation-actions';
                const retryButton = document.createElement('button');
                retryButton.className = 'validation-btn';
                retryButton.textContent = 'Reintentar';
                retryButton.onclick = () => registerAndClose(response, suggestedYear);
                const closeButton = document.createElement('button');
                closeButton.className = 'validation-btn secondary';
                closeButton.textContent = 'Cerrar';
                closeButton.onclick = closeBanner;
                actions.appendChild(retryButton);
                actions.appendChild(closeButton);
                content.appendChild(actions);
                renderStep(content);
                return;
            }
            const thanks = document.createElement('div');
            thanks.className = 'validation-message';
            thanks.textContent = submission.cacheSaved === false
                ? 'Tu aporte fue registrado, pero no se pudo guardar la validación en este dispositivo.'
                : (submission.response.message || 'Gracias por tu aporte.');
            renderStep(thanks);
            setTimeout(closeBanner, submission.cacheSaved === false ? 3000 : 1500);
        } catch (error) {
            console.error('No se pudo confirmar la validación con el servidor:', error);
            registrationInProgress = false;
            const content = document.createDocumentFragment();
            const message = document.createElement('div');
            message.className = 'validation-message';
            message.textContent = 'No se pudo confirmar el registro. Tu respuesta no se guardó localmente; puedes reintentar.';
            content.appendChild(message);
            const actions = document.createElement('div');
            actions.className = 'validation-actions';
            const retryButton = document.createElement('button');
            retryButton.className = 'validation-btn';
            retryButton.textContent = 'Reintentar';
            retryButton.onclick = () => registerAndClose(response, suggestedYear);
            const closeButton = document.createElement('button');
            closeButton.className = 'validation-btn secondary';
            closeButton.textContent = 'Cerrar';
            closeButton.onclick = closeBanner;
            actions.appendChild(retryButton);
            actions.appendChild(closeButton);
            content.appendChild(actions);
            renderStep(content);
        }
    };

    const showStep1 = () => {
        const msg = document.createElement('div');
        msg.className = 'validation-message';
        msg.textContent = isOldModel
            ? '¿Estás trabajando una versión más reciente de este vehículo?'
            : 'Este vehículo corresponde a un año anterior. ¿Estás trabajando un modelo más reciente?';

        const actions = document.createElement('div');
        actions.className = 'validation-actions';

        const btnSi = document.createElement('button');
        btnSi.className = 'validation-btn';
        btnSi.textContent = 'Sí';
        btnSi.onclick = () => isOldModel ? showStep2Old() : showStep2();

        const btnNo = document.createElement('button');
        btnNo.className = 'validation-btn secondary';
        btnNo.textContent = 'No';
        btnNo.onclick = () => registerAndClose('No');

        actions.appendChild(btnSi);

        const btnAntiguo = document.createElement('button');
        btnAntiguo.className = 'validation-btn secondary';
        btnAntiguo.textContent = 'Es más antiguo';
        btnAntiguo.onclick = () => showStepInput(true);
        actions.appendChild(btnAntiguo);

        actions.appendChild(btnNo);

        const content = document.createDocumentFragment();
        content.appendChild(msg);
        content.appendChild(actions);
        renderStep(content);
    };

    // FLUJO REGULAR
    const showStep2 = () => {
        const msg = document.createElement('div');
        msg.className = 'validation-message';
        msg.textContent = `¿Este corte funciona correctamente para el modelo del año ${currentYear}?`;

        const actions = document.createElement('div');
        actions.className = 'validation-actions';

        const btnOk = document.createElement('button');
        btnOk.className = 'validation-btn';
        btnOk.textContent = '✅';
        btnOk.onclick = () => registerAndClose('Sí (Funciona)', currentYear);

        const btnFail = document.createElement('button');
        btnFail.className = 'validation-btn secondary';
        btnFail.textContent = '❌';
        btnFail.onclick = () => {
            // No registrar todavía, esperar a showStep3Fail
            showStep3Fail();
        };

        const btnOther = document.createElement('button');
        btnOther.className = 'validation-btn secondary';
        btnOther.textContent = 'Otro año';
        btnOther.onclick = () => showStepInput();

        actions.appendChild(btnOk);
        actions.appendChild(btnFail);
        actions.appendChild(btnOther);

        const content = document.createDocumentFragment();
        content.appendChild(msg);
        content.appendChild(actions);
        renderStep(content);
    };

    const showStep3Fail = (isFromOld = false) => {
        const msg = document.createElement('div');
        msg.className = 'validation-message';
        msg.innerHTML = `Muchas gracias por confirmarlo.<br>Recuerda que puedes agregar el nuevo corte de este modelo <a href="add_cortes.html" style="color: var(--accent-color); font-weight: bold;">aquí</a>.`;

        const actions = document.createElement('div');
        actions.className = 'validation-actions';
        const btnAceptar = document.createElement('button');
        btnAceptar.className = 'validation-btn';
        btnAceptar.textContent = 'Aceptar';
        btnAceptar.onclick = () => {
            if (isFromOld) {
                registerAndClose('No útil (Viejo)');
            } else {
                registerAndClose('No funciona', currentYear);
            }
        };
        actions.appendChild(btnAceptar);

        const content = document.createDocumentFragment();
        content.appendChild(msg);
        content.appendChild(actions);
        renderStep(content);
    };

    const showStepInput = (isFromAntiguo = false) => {
        const msg = document.createElement('div');
        msg.className = 'validation-message';
        msg.textContent = isFromAntiguo
            ? '¿Para qué año es este vehículo más antiguo?'
            : '¿Para qué año funciona correctamente este corte?';

        const inputGroup = document.createElement('div');
        inputGroup.className = 'validation-input-group';

        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.className = 'validation-input';
        input.placeholder = 'Ingrese el año';
        input.maxLength = 4;
        input.addEventListener('input', () => {
            input.style.borderColor = '';
        });

        const btnSend = document.createElement('button');
        btnSend.className = 'validation-btn';
        btnSend.textContent = 'Enviar';
        btnSend.onclick = () => {
            const rawValue = input.value.trim();
            if (!/^\d{4}$/.test(rawValue)) {
                input.style.borderColor = 'red';
                return;
            }

            const yearVal = parseInt(rawValue, 10);
            if (isNaN(yearVal) || yearVal < 1980 || yearVal > (currentYear + 2)) {
                input.style.borderColor = 'red';
                return;
            }

            // Validar colisión con otras generaciones registradas
            const { catalogData } = getState();
            const normalizedItemVersion = normalizeVersion(item.versionesAplicables);
            const collision = catalogData.cortes.find(c =>
                String(c.marca).toLowerCase() === String(item.marca).toLowerCase() &&
                String(c.modelo).toLowerCase() === String(item.modelo).toLowerCase() &&
                String(c.categoria).toLowerCase() === String(item.categoria).toLowerCase() &&
                String(c.tipoEncendido).toLowerCase() === String(item.tipoEncendido).toLowerCase() &&
                normalizeVersion(c.versionesAplicables) === normalizedItemVersion &&
                yearVal >= (parseInt(c.anoDesde) || 0) &&
                yearVal <= (parseInt(c.anoHasta) || parseInt(c.anoDesde) || 0)
            );

            if (collision && String(collision.id) !== String(item.id)) {
                input.style.borderColor = 'red';
                if (!banner.querySelector('.validation-error')) {
                    const err = document.createElement('div');
                    err.className = 'validation-error';
                    err.style.cssText = "color: #dc3545; font-size: 0.8em; margin-top: 5px;";
                    err.textContent = `El año ${yearVal} ya está registrado.`;
                    inputGroup.after(err);
                    setTimeout(() => err.remove(), 3000);
                }
                return;
            }

            if (isFromAntiguo) {
                registerAndClose('Es más antiguo', yearVal);
            } else {
                registerAndClose(`Otro año: ${yearVal}`, yearVal);
            }
        };

        inputGroup.appendChild(input);
        inputGroup.appendChild(btnSend);

        const content = document.createDocumentFragment();
        content.appendChild(msg);
        content.appendChild(inputGroup);
        renderStep(content);
    };

    // FLUJO ANTIGUO
    const showStep2Old = () => {
        const msg = document.createElement('div');
        msg.className = 'validation-message';
        msg.textContent = '¿Esta información te fue útil?';

        const actions = document.createElement('div');
        actions.className = 'validation-actions';

        const btnSi = document.createElement('button');
        btnSi.className = 'validation-btn';
        btnSi.textContent = 'Sí';
        btnSi.onclick = async () => {
            if (btnSi.disabled) return;
            btnSi.disabled = true;
            msg.textContent = 'Registrando confirmación...';
            try {
                const submission = await confirmValidationBeforeCache(
                    () => suggestYear(item.id, currentYear, 'Modelo confirmado', suggestionActorPayload)
                );
                if (!submission.recorded) {
                    msg.textContent = submission.response.message || 'La confirmación no se registró. Puedes intentarlo nuevamente.';
                    btnSi.disabled = false;
                    return;
                }
                showStepInput();
            } catch (error) {
                console.error('No se pudo confirmar el modelo con el servidor:', error);
                msg.textContent = 'No se pudo confirmar el registro. Comprueba la conexión e inténtalo nuevamente.';
                btnSi.disabled = false;
            }
        };

        const btnNo = document.createElement('button');
        btnNo.className = 'validation-btn secondary';
        btnNo.textContent = 'No';
        btnNo.onclick = () => {
            // Mostrar mensaje para agregar nuevo corte antes de cerrar y registrar
            showStep3Fail(true);
        };

        actions.appendChild(btnSi);
        actions.appendChild(btnNo);

        const content = document.createDocumentFragment();
        content.appendChild(msg);
        content.appendChild(actions);
        renderStep(content);
    };

    showStep1();

    if (anchor) {
        anchor.after(banner);
    } else {
        detailContainer.appendChild(banner);
    }
}

/**
 * Renderiza los resultados de una búsqueda de forma dinámica.
 * @param {object} searchData - Un objeto que contiene el tipo, la consulta y los resultados.
 * @param {string} searchData.type - El tipo de resultado ('marca' o 'modelo').
 * @param {string} searchData.query - El texto original de la búsqueda.
 * @param {Array} searchData.results - El array de resultados (strings de marcas o objetos de modelos).
 */
/* TAREA 7 (B06): DISTINCIÓN ENTRE BÚSQUEDA ACTIVA Y RESTAURACIÓN DEL HISTORIAL CON AUTO-OPEN */
// --- NUEVA FUNCIÓN UNIFICADA PARA RENDERIZAR RESULTADOS DE BÚSQUEDA ---
export function mostrarResultadosDeBusqueda({ type, query, results }, autoOpen = true) {
    const cont = document.getElementById("contenido");
    // CORRECCIÓN: Se elimina el botón "Volver" de esta vista. La página de resultados
    // es el nivel superior del flujo de búsqueda y no debe tener un botón para regresar.
    cont.innerHTML = `<h4>Resultados para: "${query}"</h4>`;

    const hasAmbiguousVinChoices = Array.isArray(results) && results.some(item => item && item._vinAmbiguousChoice);
    if (hasAmbiguousVinChoices) {
        const notice = document.createElement("p");
        notice.className = "vin-ambiguity-notice";
        notice.style.cssText = "margin: 8px 0 14px; padding: 10px 12px; border-left: 3px solid #d69e2e; background: rgba(214,158,46,0.10); border-radius: 4px;";
        notice.textContent = "El VIN coincide con varias configuraciones. Selecciona la versión o generación correspondiente para continuar.";
        cont.appendChild(notice);
    }
    const grid = document.createElement("div");
    grid.className = "grid";

    if (type === 'marca') {
        // Renderizado para resultados de tipo MARCA.
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
        grid.style.gap = "30px";
        const marcas = [...new Set(results.map(result => typeof result === 'string' ? result : result.marca).filter(Boolean))];
        marcas.forEach(marca => {
            const logoUrl = getLogoUrlForMarca(marca, null);
            const card = document.createElement("div");
            card.className = "card brand-logo-item";
            // El onclick ahora usa el flujo de navegación estándar.
            card.onclick = () => mostrarModelosPorMarca(marca);

            const img = document.createElement("img");
            setOptimizedImage(img, logoUrl, IMG_SIZE_SMALL);
            img.alt = `Marca ${marca}`;
            img.loading = "lazy";
            card.appendChild(img);
            grid.appendChild(card);
        });
    } else {
        // Cada registro conserva su identidad y su destino de sección; no se colapsan
        // Tutoriales/Relay/PyS por títulos o configuraciones que pueden repetirse.
        results.forEach(item => {
            const card = crearCardVehiculo(item, false, results);
            grid.appendChild(card);
        });
    }

    cont.appendChild(grid);

    // Solo una coincidencia de Corte puede abrir automáticamente el detalle de vehículo.
    if (autoOpen && !hasAmbiguousVinChoices && type === 'modelo' && shouldAutoOpenVehicleDetail(results)) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.blur();

        setTimeout(() => {
            mostrarDetalleModal(results[0]);
        }, 150);
    }
}

export function showNoResultsMessage(textoBusqueda) {
    document.getElementById("contenido").innerHTML = `<p style="text-align:center; padding: 20px;">No se encontraron resultados para "${textoBusqueda}".</p>`;
}

// Normaliza el indicador técnico sin convertir «No aplica / no especificado» en false.
function normalizeActivaTestigoValue(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized || ["no aplica", "no_aplica", "no aplica / no especificado", "no aplica/no especificado", "no especificado", "no especificada", "n/a", "na"].includes(normalized)) return null;
    if (["true", "sí", "si", "yes", "x", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
    return null;
}
function getActivaTestigoValue(item, index) {
    const rawValue = item[`activaTestigo${index}`];
    const hasExplicitValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "";
    if (hasExplicitValue) return normalizeActivaTestigoValue(rawValue);
    const legacyUtilityMarker = String(item[`utilCorte${index}`] || "").trim().toLowerCase() === "x";
    const legacyTypeMarker = String(item[`tipoCorte${index}`] || "").toLowerCase().includes("testigo");
    return legacyUtilityMarker || legacyTypeMarker ? true : null;
}

// Helper utilitario para crear párrafos de detalle compartidos en modales (Hoisted)
function createDetailParagraph(label, text) {
    if (text) {
        const p = document.createElement('div');
        p.style.margin = "1em 0";
        p.innerHTML = `<strong>${label}:</strong> ${sanitizeHtmlContent(text)}`;
        return p;
    }
    return null;
}

export function mostrarDetalleModal(item, isNavigation = false, navOptions = {}) {
    const { catalogData, currentUser } = getState();
    const activeItem = (catalogData && catalogData.cortes)
        ? catalogData.cortes.find(c => String(c.id) === String(item.id)) || item
        : item;
    const ownerId = String(currentUser && (currentUser.ID || currentUser.id) || '').trim();
    if (ownerId && ownerId !== '0') {
        offline.saveViewedItem(activeItem, ownerId).then(() => {
            const activeUser = getState().currentUser;
            if (String(activeUser && (activeUser.ID || activeUser.id) || '').trim() !== ownerId) return;
            offline.getViewedItems(ownerId).then(viewed => {
                const latestUser = getState().currentUser;
                if (String(latestUser && (latestUser.ID || latestUser.id) || '').trim() === ownerId) setState({ viewedItems: viewed });
            });
        });
    }

    const { relay: datosRelay } = catalogData;

    const modalDetalle = document.getElementById("modalDetalle");
    if (modalDetalle) {
        modalDetalle.dataset.modalType = 'corte';
    }

    // Gestión contextual de pila de navegación anti-bucle
    if (navOptions && navOptions.fromOriginModal) {
        modalNavStack.push({
            type: navOptions.fromOriginModal.type,
            item: navOptions.fromOriginModal.item,
            navOptions: navOptions.fromOriginModal.navOptions || {}
        });
    } else if (!isNavigation && (!navOptions || !navOptions.originModal)) {
        // Apertura independiente desde catálogo o buscador: limpiar pila previa
        modalNavStack.length = 0;
    }

    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    // Tarea 1.6: Corrección y compactación de la cabecera del modal de detalle
    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: flex-end; align-items: center; margin-bottom: 4px; gap: 8px;";

    // Indicador visual de guardado/comunicación para modo edición
    const savingIndicator = document.createElement("div");
    savingIndicator.id = "modal-saving-indicator";
    savingIndicator.style.cssText = "margin-right: auto; font-size: 0.85em; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: opacity 0.3s; opacity: 0; color: #007bffd0;";
    headerDiv.appendChild(savingIndicator);

    // Botón Compartir
    const shareBtn = document.createElement("button");
    shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
    shareBtn.className = "share-modal-btn";
    shareBtn.title = "Compartir este vehículo";
    /* TAREA 8 (B10, B11, B23): COMPARTIR MODELO Y REDIRECCIONAMIENTO PRECISO CON DEEP LINKING */
    shareBtn.onclick = () => {
        const queryParts = [
            activeItem.marca,
            activeItem.modelo,
            activeItem.versionesAplicables,
            activeItem.tipoEncendido,
            activeItem.anoDesde
        ].filter(part => part && String(part).trim() !== "");

        const shareQuery = queryParts.join(' ');

        const shareData = {
            title: `GPSpedia - ${activeItem.marca} ${activeItem.modelo}`,
            text: `Mira la información técnica del ${activeItem.marca} ${activeItem.modelo} (${activeItem.anoDesde}) en GPSpedia.`,
            url: window.location.origin + window.location.pathname + `#search=${encodeURIComponent(shareQuery)}`
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            // Fallback: copiar al portapapeles
            navigator.clipboard.writeText(shareData.url).then(() => {
                alert("Enlace copiado al portapapeles");
            }).catch(err => {
                console.error("Error al copiar enlace:", err);
            });
        }
    };
    headerDiv.appendChild(shareBtn);

    // Botón Imprimir Ficha Técnica
    const printBtn = document.createElement("button");
    printBtn.innerHTML = '<i class="fa-solid fa-print"></i>';
    printBtn.className = "share-modal-btn";
    printBtn.title = "Imprimir / Exportar Ficha Técnica";
    printBtn.onclick = () => exportVehiclePrintSheet(activeItem);
    headerDiv.appendChild(printBtn);

    const userRole = getUiSessionContext_()?.role || null;

    if (userRole === 'desarrollador') {
        if (inEditMode) {
            // Botón Restablecer (↩️)
            const resetBtn = document.createElement("button");
            resetBtn.innerHTML = '↩️';
            resetBtn.className = "share-modal-btn";
            resetBtn.title = "Descartar cambios";
            resetBtn.style.fontSize = "1.2em";
            resetBtn.onclick = () => exitModalEditMode(false, activeItem.id);
            headerDiv.appendChild(resetBtn);

            // Botón Guardar (✅)
            const saveBtn = document.createElement("button");
            saveBtn.innerHTML = '✅';
            saveBtn.className = "share-modal-btn";
            saveBtn.title = "Guardar cambios y finalizar";
            saveBtn.style.fontSize = "1.2em";
            saveBtn.onclick = () => exitModalEditMode(true, activeItem.id);
            headerDiv.appendChild(saveBtn);
        } else {
            // Botón de lápiz de Edición
            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            editBtn.className = "share-modal-btn";
            editBtn.title = "Activar modo edición";
            editBtn.onclick = async () => {
                const editSession = getCurrentEditOwnerContext_();
                if (!editSession) {
                    showSavingIndicator("error", "No se pudo verificar una cuenta autorizada para iniciar la edición.");
                    return;
                }
                const cleanVehicleId = String(activeItem.id);
                const backup = JSON.parse(JSON.stringify(activeItem));
                let store;
                let stored;
                try {
                    store = getEditBackupStore_(editSession.userId);
                    const previous = store.read(cleanVehicleId);
                    if (previous.status === "ready" && previous.backup) {
                        stored = { saved: true, backup: previous.backup };
                    } else {
                        stored = store.write(cleanVehicleId, backup);
                    }
                } catch (error) {
                    showSavingIndicator("error", "No se pudo guardar o recuperar la copia local de seguridad. No se inició la edición.");
                    return;
                }
                if (!stored.saved) {
                    showSavingIndicator("error", "No se pudo verificar la copia local de seguridad. No se inició la edición.");
                    return;
                }

                originalItemBackup = stored.backup;
                originalItemBackupOwnerId = editSession.userId;
                originalItemBackupVehicleId = cleanVehicleId;
                editedItemBuffer = { ...activeItem };
                inEditMode = true;
                window.inEditMode = true;

                await precargarDropdownOptions();
                if (!isCurrentUiSessionContext_(editSession)) {
                    inEditMode = false; window.inEditMode = false; clearInMemoryEditBackup_();
                    return;
                }
                const pendingImagesLoaded = await loadPendingAdminImageUploads(cleanVehicleId, editSession.userId);
                if (!isCurrentUiSessionContext_(editSession)) {
                    inEditMode = false; window.inEditMode = false; clearInMemoryEditBackup_();
                    return;
                }
                if (!pendingImagesLoaded) {
                    showSavingIndicator("warning", "No se pudo consultar IndexedDB; los reemplazos de imagen quedarán bloqueados hasta verificar su estado.");
                }
                mostrarDetalleModal(editedItemBuffer);
            };
            headerDiv.appendChild(editBtn);
        }
    }

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => {
        if (inEditMode) {
            exitModalEditMode(false, activeItem.id);
        }

        // Detener cualquier video de YouTube que se esté reproduciendo en el modal
        const iframe = cont.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        }

        // Comprobar si hay un modal previo en la pila para retorno contextual
        if (modalNavStack.length > 0) {
            const prevContext = modalNavStack.pop();
            if (prevContext && prevContext.type === 'pys') {
                openPysDetailModal(prevContext.item, prevContext.navOptions || {});
                return;
            }
        }

        // Restaurar foco a la barra de búsqueda al cerrar manualmente
        const searchInput = document.getElementById('searchInput');
        const isSearchActive = document.body.classList.contains('search-active');

        if (window.history && window.history.state && window.history.state.modalOpen) {
            window.history.back();
        } else {
            document.getElementById("modalDetalle").classList.remove("visible");
            modalNavStack.length = 0;
            // Si el historial no maneja el cierre, forzamos la restauración del foco aquí
            if (isSearchActive && searchInput) {
                setTimeout(() => searchInput.focus(), 300);
            }
        }
    };
    closeBtn.className = "info-close-btn";
    closeBtn.style.cssText = "position: static; font-size: 1.8em; padding: 0 4px;";
    headerDiv.appendChild(closeBtn);
    cont.appendChild(headerDiv);

    // Comentario: Se ajusta el layout del encabezado para cumplir con el nuevo requisito (logo a la izquierda).
    // Se añade 'flex-wrap: wrap' para evitar scroll horizontal en móviles con logos anchos.
    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "border-bottom: 2px solid #007bff; padding-bottom: 6px; margin-bottom: 10px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; flex-wrap: wrap;";

    const logoUrl = getLogoUrlForMarca(activeItem.marca, activeItem.categoria);
    if (logoUrl) {
        const logoImg = document.createElement("img");
        setOptimizedImage(logoImg, logoUrl, IMG_SIZE_SMALL);
        logoImg.alt = `Logo ${activeItem.marca}`;
        logoImg.className = 'brand-logo-modal';
        logoImg.style.cursor = 'pointer';
        logoImg.onclick = () => {
            document.getElementById("modalDetalle").classList.remove("visible");
            setState({ navigationState: { level: "modelosPorMarca", marca: activeItem.marca, origin: "marca", previousState: {} } });
            if (window.history && window.history.replaceState) {
                window.history.replaceState({ level: "modelosPorMarca", marca: activeItem.marca, origin: "marca" }, '', window.location.pathname + window.location.search);
            }
            mostrarModelosPorMarca(activeItem.marca);
        };
        // El tamaño se controla ahora desde style.css para mantener la consistencia.
        titleContainer.appendChild(logoImg);
    }

    const title = document.createElement("h2");
    if (inEditMode) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = activeItem.modelo;
        input.style.cssText = "font-size: 1.1em; width: 100%; border: 1px solid #007bff; border-radius: 4px; padding: 5px; background: var(--bg-color); color: var(--text-color);";
        input.onblur = async () => {
            if (input.value.trim() && input.value.trim() !== editedItemBuffer.modelo) {
                editedItemBuffer.modelo = input.value.trim();
                await saveFieldSilently(activeItem.id, 'modelo', input.value.trim());
            }
        };
        titleContainer.appendChild(input);
    } else {
        title.textContent = `${activeItem.modelo}`;
        title.style.cssText = "color: var(--accent-color); margin: 0; padding: 0; font-size: 1.8em;";
        titleContainer.appendChild(title);
    }

    cont.appendChild(titleContainer);

    const subHeaderDiv = document.createElement('div');
    subHeaderDiv.style.marginBottom = '5px';
    const subHeaderText = document.createElement('p');
    subHeaderText.style.cssText = "margin: 0; padding: 0; color: var(--text-medium); font-size: 1.1em;";

    /* TAREA: NAVEGACIÓN ENTRE GENERACIONES BASADA EN CONTINUIDAD DE VERSIONES DE EQUIPAMIENTO */
    const allCortes = (catalogData && catalogData.cortes) ? catalogData.cortes : [];

    const activeItemVersions = parseEquipmentVersions(activeItem.versionesAplicables).map(v => v.toLowerCase());

    const generations = allCortes.filter(c => {
        if (String(c.marca).toLowerCase() !== String(activeItem.marca).toLowerCase() ||
            String(c.modelo).toLowerCase() !== String(activeItem.modelo).toLowerCase() ||
            String(c.categoria).toLowerCase() !== String(activeItem.categoria).toLowerCase()) {
            return false;
        }

        // Si tienen tipos de encendido diferentes, no pertenecen a la misma línea
        if (activeItem.tipoEncendido && c.tipoEncendido &&
            String(c.tipoEncendido).toLowerCase() !== String(activeItem.tipoEncendido).toLowerCase()) {
            return false;
        }

        // Continuidad de versiones de equipamiento:
        // Si alguno no tiene versiones especificadas, se considera continuo
        const cVersions = parseEquipmentVersions(c.versionesAplicables).map(v => v.toLowerCase());
        if (activeItemVersions.length === 0 || cVersions.length === 0) {
            return true;
        }

        // Si ambos tienen versiones, debe existir al menos una versión en común
        return activeItemVersions.some(av => cVersions.includes(av));
    }).sort((a, b) => (parseInt(a.anoDesde) || 0) - (parseInt(b.anoDesde) || 0));

    const currentIndex = generations.findIndex(g => String(g.id) === String(activeItem.id));

    if (inEditMode) {
        // En modo edición mostramos controles de input
        const editHeaderWrapper = document.createElement('div');
        editHeaderWrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;";

        // 1. Versión de Equipamiento
        const versLabel = document.createElement('label');
        versLabel.textContent = "Versiones aplicables:";
        versLabel.style.fontSize = "0.85em";
        const versInput = document.createElement('input');
        versInput.type = "text";
        versInput.value = activeItem.versionesAplicables || "";
        versInput.placeholder = "Equipamiento / Versiones";
        versInput.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        versInput.onblur = async () => {
            if (versInput.value.trim() !== editedItemBuffer.versionesAplicables) {
                editedItemBuffer.versionesAplicables = versInput.value.trim();
                await saveFieldSilently(activeItem.id, 'versionesAplicables', versInput.value.trim());
            }
        };

        // 2. Tipo de Encendido
        const encLabel = document.createElement('label');
        encLabel.textContent = "Tipo de Encendido:";
        encLabel.style.fontSize = "0.85em";
        const encSelect = document.createElement('select');
        encSelect.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        if (dropdownOptions && dropdownOptions.tipoDeEncendido) {
            dropdownOptions.tipoDeEncendido.forEach(itemOpt => {
                const opt = document.createElement('option');
                opt.value = itemOpt;
                opt.textContent = itemOpt;
                if (itemOpt === activeItem.tipoEncendido) opt.selected = true;
                encSelect.appendChild(opt);
            });
        }
        encSelect.onchange = async () => {
            editedItemBuffer.tipoEncendido = encSelect.value;
            await saveFieldSilently(activeItem.id, 'tipoEncendido', encSelect.value);
        };

        // 3. Rango de Años
        const yearLabel = document.createElement('label');
        yearLabel.textContent = "Rango de Años (Desde - Hasta):";
        yearLabel.style.fontSize = "0.85em";
        const yearsWrapper = document.createElement('div');
        yearsWrapper.style.cssText = "display: flex; gap: 5px; align-items: center;";
        const inputDesde = document.createElement('input');
        inputDesde.type = "number";
        inputDesde.value = activeItem.anoDesde;
        inputDesde.style.cssText = "width: 70px; padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        inputDesde.onblur = async () => {
            const val = parseInt(inputDesde.value, 10);
            if (val >= 1980 && val <= 2027 && val !== editedItemBuffer.anoDesde) {
                editedItemBuffer.anoDesde = val;
                await saveFieldSilently(activeItem.id, 'anoDesde', val);
            }
        };

        const dash = document.createTextNode(" - ");

        const inputHasta = document.createElement('input');
        inputHasta.type = "number";
        inputHasta.value = activeItem.anoHasta || activeItem.anoDesde;
        inputHasta.style.cssText = "width: 70px; padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        inputHasta.onblur = async () => {
            const val = parseInt(inputHasta.value, 10);
            if (val >= 1980 && val <= 2027 && val !== editedItemBuffer.anoHasta) {
                editedItemBuffer.anoHasta = val;
                await saveFieldSilently(activeItem.id, 'anoHasta', val);
            }
        };
        yearsWrapper.appendChild(inputDesde);
        yearsWrapper.appendChild(dash);
        yearsWrapper.appendChild(inputHasta);

        // 4. Categoría
        const catLabel = document.createElement('label');
        catLabel.textContent = "Categoría:";
        catLabel.style.fontSize = "0.85em";
        const catSelect = document.createElement('select');
        catSelect.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        if (dropdownOptions && dropdownOptions.categoria) {
            dropdownOptions.categoria.forEach(itemOpt => {
                const opt = document.createElement('option');
                opt.value = itemOpt;
                opt.textContent = itemOpt;
                if (itemOpt === activeItem.categoria) opt.selected = true;
                catSelect.appendChild(opt);
            });
        }
        catSelect.onchange = async () => {
            editedItemBuffer.categoria = catSelect.value;
            await saveFieldSilently(activeItem.id, 'categoria', catSelect.value);
        };

        // 5. VIN / Chasis
        const vinLabel = document.createElement('label');
        vinLabel.textContent = "Colección de VINs / Chasis:";
        vinLabel.style.fontSize = "0.85em";
        const vinInput = document.createElement('input');
        vinInput.type = "text";
        vinInput.value = activeItem.vin || "";
        vinInput.placeholder = 'ej. ["1HGCM82633A", "2HGCM82633B"]';
        vinInput.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        vinInput.onblur = async () => {
            const nextValue = vinInput.value.trim();
            if (nextValue !== String(editedItemBuffer.vin || "").trim()) {
                const saved = await saveFieldSilently(activeItem.id, 'vin', nextValue);
                if (saved) editedItemBuffer.vin = nextValue;
                else vinInput.value = editedItemBuffer.vin || "";
            }
        };

        editHeaderWrapper.appendChild(versLabel);
        editHeaderWrapper.appendChild(versInput);
        editHeaderWrapper.appendChild(encLabel);
        editHeaderWrapper.appendChild(encSelect);
        editHeaderWrapper.appendChild(yearLabel);
        editHeaderWrapper.appendChild(yearsWrapper);
        editHeaderWrapper.appendChild(catLabel);
        editHeaderWrapper.appendChild(catSelect);
        editHeaderWrapper.appendChild(vinLabel);
        editHeaderWrapper.appendChild(vinInput);

        subHeaderText.appendChild(editHeaderWrapper);
    } else {
        const yearRangeText = activeItem.anoHasta ? `${activeItem.anoDesde} – ${activeItem.anoHasta}` : activeItem.anoDesde;
        const yearRangeContainer = document.createElement('span');
        yearRangeContainer.style.cssText = "display: inline-flex; align-items: center; gap: 8px;";

        if (generations.length > 1) {
            if (currentIndex > 0) {
                const leftArrow = document.createElement('span');
                leftArrow.innerHTML = '&lt;';
                leftArrow.style.cssText = "cursor: pointer; font-weight: bold; padding: 0 5px; color: var(--accent-color); user-select: none;";
                leftArrow.onclick = () => {
                    mostrarDetalleModal(generations[currentIndex - 1], true);
                };
                yearRangeContainer.appendChild(leftArrow);
            }

            const yearTextSpan = document.createElement('span');
            yearTextSpan.textContent = yearRangeText;
            yearRangeContainer.appendChild(yearTextSpan);

            if (currentIndex < generations.length - 1 && currentIndex !== -1) {
                const rightArrow = document.createElement('span');
                rightArrow.innerHTML = '&gt;';
                rightArrow.style.cssText = "cursor: pointer; font-weight: bold; padding: 0 5px; color: var(--accent-color); user-select: none;";
                rightArrow.onclick = () => {
                    mostrarDetalleModal(generations[currentIndex + 1], true);
                };
                yearRangeContainer.appendChild(rightArrow);
            }
        } else {
            const yearTextSpan = document.createElement('span');
            yearTextSpan.textContent = yearRangeText;
            yearRangeContainer.appendChild(yearTextSpan);
        }

        /* TAREA: PRESENTACIÓN VISUAL DE VERSIONES Y DÍGITOS DE CHASIS CON SEPARADOR "/" */
        const mappedVersions = mapVersionsWithVins(activeItem.versionesAplicables, activeItem.vin);
        let equipamientoHtml = '';

        if (mappedVersions.length > 0) {
            equipamientoHtml = mappedVersions.map(mv => {
                if (mv.version && mv.vin) {
                    return `${mv.version} <span class="chassis-digits" style="font-size: 0.82em; font-weight: normal; opacity: 0.85;">(${mv.vin})</span>`;
                } else if (mv.version) {
                    return mv.version;
                } else if (mv.vin) {
                    return `<span class="chassis-digits" style="font-size: 0.82em; font-weight: normal; opacity: 0.85;">(${mv.vin})</span>`;
                }
                return '';
            }).filter(Boolean).join(' / ');
        } else {
            equipamientoHtml = activeItem.tipoEncendido || '';
        }

        subHeaderText.innerHTML = `<strong>${equipamientoHtml}</strong> | `;
        subHeaderText.appendChild(yearRangeContainer);

        if(activeItem.categoria) {
             subHeaderText.appendChild(document.createElement("br"));
             const catSpan = document.createElement("span");
             catSpan.className = "category-nav-link";
             catSpan.style.cssText = "font-size: 0.9em; color: #777; cursor: pointer; text-decoration: underline;";
             catSpan.textContent = activeItem.categoria;
             catSpan.onclick = () => {
                 document.getElementById("modalDetalle").classList.remove("visible");
                 setState({ navigationState: { level: "modelos", categoria: activeItem.categoria, marca: activeItem.marca, origin: "categoria", previousState: {} } });
                 if (window.history && window.history.replaceState) {
                     window.history.replaceState({ level: "modelos", categoria: activeItem.categoria, marca: activeItem.marca, origin: "categoria" }, '', window.location.pathname + window.location.search);
                 }
                 mostrarModelos(activeItem.categoria, activeItem.marca);
             };
             subHeaderText.appendChild(catSpan);
        }
    }
    subHeaderDiv.appendChild(subHeaderText);
    cont.appendChild(subHeaderDiv);

    /* AUG-050: mostrar la firma diferencial correspondiente a cada versión aplicable */
    const itemVersions = parseEquipmentVersions(activeItem ? activeItem.versionesAplicables : '');
    if (activeItem && activeItem.vin && itemVersions.length > 0) {
        try {
            const catalogData = getState().catalogData;
            if (catalogData && catalogData.cortes) {
                ensureVinSignatures(catalogData.cortes, vinDifferentialEngine, vinSignatureStore);
            }
            const signatures = itemVersions.map(version => ({
                version,
                signature: vinDifferentialEngine.signatures.get(getClassificationKey(activeItem, version, 5))
            })).filter(entry => entry.signature &&
                entry.signature.status !== 'insuficiente' &&
                Array.isArray(entry.signature.positions) &&
                entry.signature.positions.length > 0);

            if (signatures.length > 0) {
                const sigBox = document.createElement('div');
                sigBox.className = 'vin-signature-badge';
                sigBox.style.cssText = 'margin: 6px 0 10px 0; padding: 6px 12px; background: rgba(0, 123, 255, 0.08); border-left: 3px solid #007bff; border-radius: 4px; font-size: 0.82em; display: flex; flex-direction: column; gap: 6px;';

                signatures.forEach(({ version, signature }) => {
                    const sigEntry = document.createElement('div');
                    sigEntry.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
                    const sigTitle = document.createElement('span');
                    sigTitle.style.cssText = 'font-weight: bold; color: var(--text-color);';
                    sigTitle.textContent = `Firma diferencial VIN — ${version || 'Versión no especificada'}: ${signature.signatureString} (${signature.readableFormat})`;
                    const sigMeta = document.createElement('span');
                    sigMeta.style.cssText = 'color: #666; font-size: 0.88em;';
                    sigMeta.textContent = `Caracteres mínimos: ${signature.charactersNeeded} | Certeza: ${signature.confidence}% (${signature.status === 'validada' ? 'Identificación validada' : 'Firma calculada'})`;
                    sigEntry.append(sigTitle, sigMeta);
                    sigBox.appendChild(sigEntry);
                });
                cont.appendChild(sigBox);
            }
        } catch (e) {
            console.error('Error visualizando firmas diferenciales:', e);
        }
    }

    if (inEditMode || activeItem.imagenVehiculo) {
        const imgVehiculo = document.createElement("img");
        setOptimizedImage(imgVehiculo, activeItem.imagenVehiculo || null, IMG_SIZE_MEDIUM);
        imgVehiculo.className = 'img-vehiculo-modal';
        if (inEditMode) {
            convertImageToEditable(imgVehiculo, activeItem.id, 'imagenVehiculo');
        }
        cont.appendChild(imgVehiculo);
    }

    if (inEditMode) {
        const notaLabel = document.createElement('label');
        notaLabel.textContent = "Nota Importante / Descripción:";
        notaLabel.style.cssText = "display: block; font-weight: bold; margin-top: 10px; font-size: 0.85em;";
        const notaInput = document.createElement("textarea");
        notaInput.id = `edit-note-${activeItem.id}`;
        notaInput.rows = 2;
        notaInput.value = activeItem.notaImportante || "";
        notaInput.style.cssText = "width: 100%; padding: 6px; border: 1px solid #007bff; border-radius: 4px; background: var(--bg-color); color: var(--text-color); margin-bottom: 10px; box-sizing: border-box;";
        notaInput.onblur = async () => {
            if (notaInput.value.trim() !== editedItemBuffer.notaImportante) {
                editedItemBuffer.notaImportante = notaInput.value.trim();
                await saveFieldSilently(activeItem.id, 'notaImportante', notaInput.value.trim());
            }
        };
        cont.appendChild(notaLabel);
        cont.appendChild(createRichTextToolbar(notaInput.id));
        cont.appendChild(notaInput);
    } else if (activeItem.notaImportante) {
        const p = document.createElement("div");
        p.style.cssText = "color:#cc0000; font-weight: bold; background: #ffe0e0; padding: 10px; border-radius: 5px; border-left: 4px solid #cc0000; margin: 5px 0;";
        p.innerHTML = `⚠️ ${sanitizeHtmlContent(activeItem.notaImportante)}`;
        cont.appendChild(p);
    }

    const cortes = [];
    for (let i = 1; i <= 3; i++) {
        if (activeItem[`tipoCorte${i}`]) {
            cortes.push({
                index: i,
                tipo: activeItem[`tipoCorte${i}`],
                ubicacion: activeItem[`ubicacionCorte${i}`],
                colorCable: activeItem[`colorCableCorte${i}`],
                configRelay: activeItem[`configRelay${i}`],
                img: activeItem[`imgCorte${i}`],
                util: parseInt(activeItem[`utilCorte${i}`] || 0),
                activaTestigo: getActivaTestigoValue(activeItem, i),
                colaborador: activeItem[`colaboradorCorte${i}`]
            });
        }
    }
    cortes.sort((a, b) => b.util - a.util);

    const recommendedCut = cortes.shift();
    if (recommendedCut) {
        const recommendedSection = document.createElement('div');
        const title = document.createElement('h4');
        if (isNoRecomendadoValue(recommendedCut.tipo)) {
            title.innerHTML = `Tipo de Corte`;
        } else {
            title.innerHTML = `Corte Recomendado <span style="font-weight:normal; color: var(--text-medium);">(Votos: ${recommendedCut.util})</span>`;
        }
        recommendedSection.appendChild(title);
        // El corte recomendado se carga de inmediato (isLazy = false)
        renderCutContent(recommendedSection, recommendedCut, datosRelay, activeItem.id, false, recommendedCut.index);
        cont.appendChild(recommendedSection);
    }

    const accordionContainer = document.createElement('div');
    cont.appendChild(accordionContainer);

    const otherSections = [
        ...cortes.map((corte, idx) => ({
            isCorte: true,
            corteIndex: corte.index || (idx + 2),
            title: `Corte Alternativo ${idx + 1} (Votos: ${corte.util})`,
            data: corte
        })),
        { title: 'Apertura', content: activeItem.apertura, img: activeItem.imgApertura, colaborador: activeItem.colaboradorApertura },
        {
            title: 'Cables de Alimentación',
            isCarousel: true,
            cables: [
                { label: 'Cable 1', content: activeItem.cableAlimen, img: activeItem.imgCableAlimen },
                { label: 'Cable 2', content: activeItem.cableAlimen2, img: activeItem.imgCableAlimen2 },
                { label: 'Cable 3', content: activeItem.cableAlimen3, img: activeItem.imgCableAlimen3 }
            ].filter(c => c.content || c.img),
            content: activeItem.cableAlimen,
            img: activeItem.imgCableAlimen,
            colaborador: activeItem.colaboradorAlimen
        },
        { title: 'Vídeo Guía de Desarme', Video: activeItem.Video }
    ];

    otherSections.forEach(sec => {
        const isSupplementary = sec.title === 'Apertura' || sec.title === 'Cables de Alimentación';
        const hasContent = sec.isCorte || sec.content || sec.img || sec.Video || (sec.isCarousel && sec.cables && sec.cables.length > 0) || (inEditMode && isSupplementary);
        if (hasContent && sec.title) {
            createAccordionSection(accordionContainer, sec.title, sec, false, datosRelay, activeItem.id);
        }
    });

    /* TAREA: VERIFICACIÓN Y CORRECCIÓN DEL ACORDEÓN «POSIBLES PROBLEMAS» EN EL MODAL DE DETALLE DE CORTES */
    renderPosiblesProblemasAccordion(accordionContainer, activeItem, navOptions);

    if (!window.inEditMode) {
        // TAREA 1.5 / 1.8: RECUPERACIÓN, AJUSTE Y REEJECUCIÓN DEL BOTÓN (+) EN EL MODAL DE DETALLE DEL VEHÍCULO
        const plusBtn = document.createElement("button");
        plusBtn.className = "btn-expand-plus";
        plusBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        plusBtn.title = "Ampliar información del modelo";
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            openExpandMenuModal(item);
        };
        cont.appendChild(plusBtn);
    }

    modalDetalle.dataset.modalType = 'corte';
    modalDetalle.classList.add("visible");
    if (!isNavigation && window.history && window.history.pushState) {
        window.history.pushState({ modalOpen: true }, '');
    }
}

/**
 * Realiza una sincronización silenciosa (Silent Background Synchronization)
 * comparando los datos nuevos con los existentes y actualizando únicamente
 * los elementos modificados en el DOM sin recargar la interfaz ni perder el estado.
 */
export async function performSilentSync(newCatalogData) {
    try {
        if (!offline.isCompleteCatalogSnapshot(newCatalogData)) {
            throw new Error('La sincronización recibió una instantánea incompleta o con IDs de Corte inválidos.');
        }
        const { catalogData: oldCatalogData } = getState();
        if (!offline.isCompleteCatalogSnapshot(oldCatalogData)) {
            // Si el estado previo no cumple el contrato, sustituirlo por la instantánea completa.
            updateFullState(newCatalogData);
            return;
        }

        // Comparación completa: Cortes por ID persistente y las demás colecciones por contenido.
        // No se sintetizan claves por Tema/configuración: esas propiedades pueden repetirse.
        const snapshotDiff = offline.compareCatalogSnapshots(oldCatalogData, newCatalogData);
        const updatedCortesList = [
            ...snapshotDiff.cortes.added.map(change => ({ type: 'added', item: change.item })),
            ...snapshotDiff.cortes.modified.map(change => ({ type: 'modified', oldItem: change.oldItem, newItem: change.newItem })),
            ...snapshotDiff.cortes.removed.map(change => ({ type: 'removed', id: change.id }))
        ];
        if (!snapshotDiff.hasChanges) {
            console.log("Sincronización silenciosa: No se detectaron cambios.");
            return;
        }

        console.log(`Sincronización silenciosa: Detectados ${updatedCortesList.length} cambios.`);

        // 3. Procesar las modificaciones en el DOM de forma 100% silenciosa
        for (const change of updatedCortesList) {
            if (change.type === 'modified') {
                await updateCardInPlace(change.newItem);
                updateOpenModalIfActive(change.newItem);
            } else if (change.type === 'added') {
                // Insertar de manera fluida utilizando el carrusel de agregados recientemente si corresponde
                await insertNewVehicleFluently(change.item);
            } else if (change.type === 'removed') {
                removeVehicleSilently(change.id);
            }
        }

        // 4. Actualizar el estado global con los nuevos datos consolidados
        updateFullState(newCatalogData, { logosChanged: snapshotDiff.collections.logos });

    } catch (e) {
        console.error("Error en performSilentSync:", e);
    }
}

function updateFullState(catalogData, options = {}) {
    try {
        // Normalizar los datos del catálogo antes de actualizar el estado global
        if (catalogData && Array.isArray(catalogData.cortes)) {
            const brandCasingMap = new Map();
            const modelCasingMap = new Map();
            const categoryCasingMap = new Map();

            catalogData.cortes.forEach(item => {
                if (item.marca) {
                    const trimmed = String(item.marca).trim();
                    const lower = trimmed.toLowerCase();
                    if (!brandCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                        brandCasingMap.set(lower, trimmed);
                    }
                }
                if (item.categoria) {
                    const trimmed = String(item.categoria).trim();
                    const lower = trimmed.toLowerCase();
                    if (!categoryCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                        categoryCasingMap.set(lower, trimmed);
                    }
                }
            });

            catalogData.cortes.forEach(item => {
                if (item.marca) {
                    const trimmed = String(item.marca).trim();
                    const lower = trimmed.toLowerCase();
                    item.marca = brandCasingMap.get(lower) || trimmed;
                }
                if (item.categoria) {
                    const trimmed = String(item.categoria).trim();
                    const lower = trimmed.toLowerCase();
                    item.categoria = categoryCasingMap.get(lower) || trimmed;
                }

                if (item.modelo && item.marca) {
                    const trimmed = String(item.modelo).trim();
                    const lower = trimmed.toLowerCase();
                    const key = `${item.marca.toLowerCase()}|${lower}`;
                    if (!modelCasingMap.has(key) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                        modelCasingMap.set(key, trimmed);
                    }
                }
            });

            catalogData.cortes.forEach(item => {
                if (item.modelo && item.marca) {
                    const trimmed = String(item.modelo).trim();
                    const lower = trimmed.toLowerCase();
                    const key = `${item.marca.toLowerCase()}|${lower}`;
                    item.modelo = modelCasingMap.get(key) || trimmed;
                }
            });
        }

        const categoryCounts = catalogData.cortes.reduce((acc, item) => {
            if (item.categoria) {
                acc[item.categoria] = (acc[item.categoria] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

        setState({
            catalogData: {
                ...catalogData,
                sortedCategories: sortedCategories
            }
        });

        // Refrescar vistas de tutoriales o relay si están activas
        const tutContainer = document.getElementById("contenido-tutoriales");
        if (tutContainer && tutContainer.style.display !== "none") {
            mostrarTutorialesGrid();
        }
        const relayContainer = document.getElementById("contenido-relay");
        if (relayContainer && relayContainer.style.display !== "none") {
            mostrarRelayGrid();
        }
        if (options.logosChanged === true) {
            const currentState = getState();
            const searchInput = document.getElementById('searchInput');
            if (currentState.navigationState && currentState.navigationState.level === 'categorias' && searchInput && !searchInput.value.trim()) {
                mostrarCategorias();
            }
        }
    } catch (e) {
        console.error("Error actualizando estado global tras sincronización:", e);
    }
}

/**
 * Sustituye de manera silenciosa una tarjeta en el catálogo sin parpadeos ni reconstrucciones completas.
 */
async function updateCardInPlace(newItem) {
    const cards = document.querySelectorAll(`.card[data-vehicle-id="${newItem.id}"]`);
    if (cards.length === 0) return;

    // Pre-cargar la imagen en segundo plano para evitar parpadeos
    if (newItem.imagenVehiculo) {
        await preloadImageSilently(newItem.imagenVehiculo);
    }

    cards.forEach(card => {
        // Encontrar la imagen
        const img = card.querySelector('img');
        if (img && newItem.imagenVehiculo) {
            setOptimizedImage(img, newItem.imagenVehiculo, IMG_SIZE_SMALL);
        }

        // Encontrar el texto o sobrecapa y actualizarlo
        const overlay = card.querySelector('.overlay');
        if (overlay) {
            const hasResultsForVariant = card.onclick && card.onclick.toString().includes('resultsForVariant');
            if (hasResultsForVariant) {
                const version = newItem.versionesAplicables || '';
                overlay.innerHTML = `<div class="overlay-text-primary">${newItem.marca} ${newItem.modelo}</div><div class="overlay-text-secondary">${newItem.categoria} | ${version}</div>`;
            } else {
                const yearRange = newItem.anoHasta ? `${newItem.anoDesde} - ${newItem.anoHasta}` : newItem.anoDesde;
                overlay.innerHTML = `<div class="overlay-text-primary">${newItem.marca} ${newItem.modelo}</div><div class="overlay-text-secondary">${yearRange} | ${newItem.tipoEncendido || ''}</div>`;
            }
        }
    });
}

/**
 * Actualiza el modal abierto actualmente si coincide con el vehículo sincronizado.
 */
function updateOpenModalIfActive(newItem) {
    const modalDetalle = document.getElementById('modalDetalle');
    if (!modalDetalle || !modalDetalle.classList.contains('visible')) return;

    // Podemos verificar si el detalle abierto corresponde al ID modificado.
    // Una manera limpia es volver a almacenar el item modificado en el historial de vistos sin alterar la visualización actual,
    // y dejar que la siguiente apertura muestre la nueva versión.
    // Sin embargo, para cumplir 100% que la siguiente apertura muestre automáticamente la versión actualizada y el caché esté listo:
    const currentUser = getState().currentUser;
    const ownerId = String(currentUser && (currentUser.ID || currentUser.id) || '').trim();
    if (ownerId && ownerId !== '0') offline.saveViewedItem(newItem, ownerId).catch(err => console.warn("Error guardando item visto actualizado:", err));
}

/**
 * Pre-carga una imagen en segundo plano y resuelve la promesa cuando está completamente disponible.
 */
function preloadImageSilently(fileId) {
    return new Promise((resolve) => {
        if (!fileId) return resolve();
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = getImageUrl(fileId, IMG_SIZE_MEDIUM);
    });
}

/**
 * Remueve un vehículo del DOM de forma silenciosa.
 */
function removeVehicleSilently(id) {
    const cards = document.querySelectorAll(`.card[data-vehicle-id="${id}"]`);
    cards.forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => card.remove(), 300);
    });
}

/**
 * Incorpora un nuevo vehículo fluido utilizando la transición del carrusel o del grid de manera consistente.
 */
async function insertNewVehicleFluently(item) {
    const cont = document.getElementById("contenido");
    if (!cont) return;

    // Pre-cargar imagen de vehículo nuevo
    if (item.imagenVehiculo) {
        await preloadImageSilently(item.imagenVehiculo);
    }

    const currentNav = getState().navigationState || {};
    const isMainLevel = currentNav.level === 'categorias';

    if (isMainLevel) {
        // 2. Insertar en el carrusel de "Últimos Agregados"
        const tracks = document.querySelectorAll('.carousel-track');
        let ultimosAgregadosTrack = null;

        tracks.forEach(track => {
            const titleSibling = track.parentElement.previousElementSibling;
            if (titleSibling && titleSibling.textContent.includes('Últimos Agregados')) {
                ultimosAgregadosTrack = track;
            }
        });

        if (ultimosAgregadosTrack) {
            const newCard = crearCardVehiculo(item);
            newCard.style.opacity = '0';
            newCard.style.transform = 'scale(0.8) translateX(50px)';
            newCard.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

            // Insertar al inicio de la lista de agregados recientemente
            ultimosAgregadosTrack.insertBefore(newCard, ultimosAgregadosTrack.firstChild);

            // Disparar animación fluida
            requestAnimationFrame(() => {
                setTimeout(() => {
                    newCard.style.opacity = '1';
                    newCard.style.transform = 'scale(1) translateX(0)';
                }, 50);
            });
        }
    } else {
        // Insertar en la vista de cuadrícula si la navegación actual coincide con el elemento recién insertado
        const activeGrid = document.querySelector('#contenido .grid');
        if (activeGrid) {
            let isRelevant = false;
            if (currentNav.level === 'modelosPorMarca' && currentNav.marca === item.marca) {
                isRelevant = true;
            } else if (currentNav.level === 'modelos' && currentNav.categoria === item.categoria && currentNav.marca === item.marca) {
                isRelevant = true;
            } else if (currentNav.level === 'versiones' && currentNav.categoria === item.categoria && currentNav.marca === item.marca && currentNav.modelo === item.modelo) {
                isRelevant = true;
            } else if (currentNav.level === 'versionesEquipamiento' && currentNav.categoria === item.categoria && currentNav.marca === item.marca && currentNav.modelo === item.modelo) {
                isRelevant = true;
            } else if (currentNav.level === 'tiposEncendido' && currentNav.categoria === item.categoria && currentNav.marca === item.marca && currentNav.modelo === item.modelo) {
                isRelevant = true;
            }

            if (isRelevant) {
                const newCard = crearCardVehiculo(item);
                newCard.style.opacity = '0';
                newCard.style.transform = 'scale(0.8)';
                newCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                activeGrid.appendChild(newCard);
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        newCard.style.opacity = '1';
                        newCard.style.transform = 'scale(1)';
                    }, 50);
                });
            }
        }
    }
}

/* TAREA 3.1 & TAREA 9.3: VERIFICACIÓN Y CORRECCIÓN DEL CARRUSEL «POSIBLES PROBLEMAS» CON ORIGEN CONTEXTUAL */
function createPysCard(item, originModal = null, vehicleToUnlink = null, onUnlinkSuccess = null) {
    const cardWrapper = document.createElement("div");
    cardWrapper.style.cssText = "position: relative; display: inline-block;";

    const resolvedOrigin = originModal || (vehicleToUnlink ? 'vehicle' : 'pys');

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-problem-id", item.id_problem || item.id || "");
    card.style.animation = "none";
    card.style.opacity = "1";
    card.onclick = () => openPysDetailModal(item, {
        originModal: resolvedOrigin,
        fromOriginModal: vehicleToUnlink ? {
            type: 'vehicle',
            item: vehicleToUnlink,
            navOptions: {}
        } : null
    });

    const img = document.createElement("img");
    img.className = "card-img-top";
    img.alt = item.Problema || "Problema técnico";
    img.loading = "lazy";
    setOptimizedImage(img, item.Imagen || "", IMG_SIZE_SMALL);
    card.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const statusText = item.Se_soluciono === "x" ? "Solucionado" : "Sin solución";
    const statusColor = item.Se_soluciono === "x" ? "#28a745" : "#dc3545";
    overlay.innerHTML = `
        <div class="overlay-text-primary" style="font-size: 0.85rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.Problema || "Problema"}</div>
        <div class="overlay-text-secondary" style="font-size: 0.75rem; color: ${statusColor}; font-weight: bold;">${statusText}</div>
    `;
    card.appendChild(overlay);
    cardWrapper.appendChild(card);

    const sessionData = localStorage.getItem('gpsepedia_session');
    const userRole = getUiSessionContext_()?.role || null;
    // REVISIÓN IV: Desvinculación de problemas y vehículos restringida exclusivamente al desarrollador
    const canEdit = userRole === 'desarrollador';

    if (canEdit && vehicleToUnlink) {
        const removeBtn = document.createElement("button");
        removeBtn.title = "Eliminar relación con este problema";
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText = "position: absolute; top: 4px; right: 4px; background: rgba(220, 53, 69, 0.9); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3);";
        removeBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm(`¿Deseas desvincular el problema "${item.Problema}" de este vehículo?`)) return;
            removeBtn.disabled = true;
            try {
                const res = await routeAction('removeVehicleFromProblem', {
                    problemId: item.id_problem || item.id,
                    vehicleId: vehicleToUnlink.id,
                    ...getSessionPayload_(),
                    userRole
                });
                if (res && res.status === 'success') {
                    cardWrapper.remove();
                    mostrarNotificacion("Problema desvinculado del vehículo.", "success");
                    if (typeof onUnlinkSuccess === 'function') onUnlinkSuccess();
                }
            } catch(err) {
                showGlobalError("Error al retirar relación: " + err.message);
                removeBtn.disabled = false;
            }
        };
        cardWrapper.appendChild(removeBtn);
    }

    return cardWrapper;
}

export function renderPosiblesProblemasAccordion(container, activeItem, navOptions = {}) {
    if (!container || !activeItem || !activeItem.id) return;
    // Tarea 9.3: Prevención de ciclos - si el modal de vehículo se abrió desde PyS, no mostrar acordeón de problemas
    if (navOptions && navOptions.originModal === 'pys') {
        return;
    }
    const vehicleIdStr = String(activeItem.id);

    // Contenedor dinámico del acordeón para poder actualizarlo si se descargan datos nuevos
    let wrapper = container.querySelector("#posibles-problemas-wrapper");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "posibles-problemas-wrapper";
        container.appendChild(wrapper);
    }

    const updateAccordion = (rawPysData) => {
        wrapper.innerHTML = "";
        const allPys = Array.isArray(rawPysData) ? rawPysData : [];
        // Filtrar estrictamente por el identificador del modelo y de-duplicar por ID de problema
        const seenIds = new Set();
        const relatedProblems = [];

        allPys.forEach(p => {
            if (!p || !Array.isArray(p.modelosAsociados)) return;
            const matches = p.modelosAsociados.some(mId => String(mId) === vehicleIdStr);
            if (matches) {
                const pId = p.id_problem || p.id || p.Problema;
                if (!seenIds.has(pId)) {
                    seenIds.add(pId);
                    relatedProblems.push(p);
                }
            }
        });

        // REQUISITO: Si no existen problemas relacionados, no mostrar el acordeón vacío
        if (relatedProblems.length === 0) {
            return;
        }

        // Crear el botón acordeón con el título exacto requerido: «Posibles problemas»
        const btn = document.createElement("button");
        btn.className = "accordion-btn";
        btn.innerHTML = `Posibles problemas <span class="accordion-arrow">▼</span>`;

        const panel = document.createElement("div");
        panel.className = "panel-desplegable";

        const contentWrapper = document.createElement("div");
        contentWrapper.style.padding = "15px 10px";

        if (relatedProblems.length === 1) {
            // REQUISITO: Si existe un solo problema, mostrar su tarjeta y la tarjeta para agregar/vincular problema
            const singleCardContainer = document.createElement("div");
            singleCardContainer.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap;";
            const singleCard = createPysCard(relatedProblems[0], 'vehicle', activeItem, () => {
                // Si se eliminó el único problema, refrescar acordeón
                renderPosiblesProblemasAccordion(container, activeItem, navOptions);
            });
            singleCardContainer.appendChild(singleCard);

            // Tarjeta para agregar o vincular problema sin borde discontinuo
            const addPysCard = document.createElement("div");
            addPysCard.className = "card card-create-pys-assoc";
            addPysCard.style.cssText = "width: 140px; height: 120px; padding: 10px; margin: 0;";
            addPysCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 8px;"></i> <span style="font-size: 0.85rem; font-weight: 600; text-align: center;">Agregar Problema</span>`;
            addPysCard.onclick = () => openAssociateExistingProblemModal(activeItem);
            singleCardContainer.appendChild(addPysCard);

            contentWrapper.appendChild(singleCardContainer);
        } else {
            // REQUISITO: Si existen varios problemas, mostrarlos mediante un carrusel navegable
            const carouselContainer = document.createElement("div");
            carouselContainer.className = "carousel-container";
            const carouselTrack = document.createElement("div");
            carouselTrack.className = "carousel-track";

            relatedProblems.forEach(p => {
                const card = createPysCard(p, 'vehicle', activeItem, () => {
                    renderPosiblesProblemasAccordion(container, activeItem, navOptions);
                });
                carouselTrack.appendChild(card);
            });

            // Tarjeta al final del carrusel para agregar o vincular problema
            const addPysCard = document.createElement("div");
            addPysCard.className = "card card-create-pys-assoc";
            addPysCard.style.cssText = "flex: 0 0 140px; height: 120px; padding: 10px; margin-right: 20px;";
            addPysCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 8px;"></i> <span style="font-size: 0.85rem; font-weight: 600; text-align: center;">Agregar Problema</span>`;
            addPysCard.onclick = () => openAssociateExistingProblemModal(activeItem);
            carouselTrack.appendChild(addPysCard);

            carouselContainer.appendChild(carouselTrack);

            const prevBtn = document.createElement("button");
            prevBtn.className = "carousel-btn prev";
            prevBtn.innerHTML = "&#10094;";
            carouselContainer.appendChild(prevBtn);

            const nextBtn = document.createElement("button");
            nextBtn.className = "carousel-btn next";
            nextBtn.innerHTML = "&#10095;";
            carouselContainer.appendChild(nextBtn);

            const cardWidth = 140 + 20;
            const getVisibleCards = () => {
                const containerWidth = carouselContainer.offsetWidth || 300;
                return Math.floor(containerWidth / cardWidth) || 1;
            };

            const updateCarouselButtons = () => {
                const scrollLeft = carouselTrack.scrollLeft;
                const maxScrollLeft = carouselTrack.scrollWidth - carouselTrack.clientWidth;
                prevBtn.style.display = scrollLeft > 2 ? "flex" : "none";
                nextBtn.style.display = scrollLeft < maxScrollLeft - 2 ? "flex" : "none";
            };

            nextBtn.addEventListener("click", () => {
                carouselTrack.scrollBy({ left: cardWidth * getVisibleCards(), behavior: "smooth" });
            });

            prevBtn.addEventListener("click", () => {
                carouselTrack.scrollBy({ left: -cardWidth * getVisibleCards(), behavior: "smooth" });
            });

            carouselTrack.addEventListener("scroll", () => setTimeout(updateCarouselButtons, 100));
            window.addEventListener("resize", () => setTimeout(updateCarouselButtons, 100));
            setTimeout(updateCarouselButtons, 200);

            contentWrapper.appendChild(carouselContainer);
        }

        panel.appendChild(contentWrapper);

        btn.onclick = () => {
            const isActive = btn.classList.contains("active");

            // Cerrar coordinadamente todos los demás acordeones del modal
            const allModalButtons = container.querySelectorAll(".accordion-btn");
            allModalButtons.forEach(otherBtn => {
                otherBtn.classList.remove("active");
                const otherArrow = otherBtn.querySelector(".accordion-arrow");
                if (otherArrow) otherArrow.textContent = "▼";
                const otherPanel = otherBtn.nextElementSibling;
                if (otherPanel && otherPanel.classList.contains("panel-desplegable")) {
                    otherPanel.style.maxHeight = null;
                }
            });

            if (!isActive) {
                btn.classList.add("active");
                const arrow = btn.querySelector(".accordion-arrow");
                if (arrow) arrow.textContent = "▲";
                panel.style.maxHeight = panel.scrollHeight + "px";

                if (relatedProblems.length > 1) {
                    const track = panel.querySelector(".carousel-track");
                    const prev = panel.querySelector(".carousel-btn.prev");
                    const next = panel.querySelector(".carousel-btn.next");
                    if (track && prev && next) {
                        const scrollLeft = track.scrollLeft;
                        const maxScrollLeft = track.scrollWidth - track.clientWidth;
                        prev.style.display = scrollLeft > 2 ? "flex" : "none";
                        next.style.display = scrollLeft < maxScrollLeft - 2 ? "flex" : "none";
                    }
                }
            }
        };

        wrapper.appendChild(btn);
        wrapper.appendChild(panel);
    };

    // 1. Evaluar si ya existen datos en caché en el estado
    const cachedPys = getState().pysData;
    if (Array.isArray(cachedPys) && cachedPys.length > 0) {
        updateAccordion(cachedPys);
    }

    // 2. Actualizar en segundo plano usando la misma promesa compartida que búsqueda y autenticación.
    loadPysData({ refresh: true }).then(updateAccordion).catch(err => {
        console.warn("No se pudo sincronizar pysData en detalle de vehículo:", err);
    });
}


function renderCutContent(container, cutData, datosRelay, vehicleId, isLazy = false, index = 0) {
    if (inEditMode) {
        const idx = cutData.index;
        const editCutsWrapper = document.createElement('div');
        editCutsWrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; padding: 10px; border: 1px solid #007bffd0; border-radius: 6px; background: rgba(0, 123, 255, 0.03);";

        // 1. Tipo de Corte
        const typeLabel = document.createElement('label');
        typeLabel.textContent = `Tipo de Corte ${idx}:`;
        typeLabel.style.fontSize = "0.85em";
        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        if (dropdownOptions && dropdownOptions.tipoDeCorte) {
            dropdownOptions.tipoDeCorte.forEach(optVal => {
                const opt = document.createElement('option');
                opt.value = optVal;
                opt.textContent = optVal;
                if (optVal === cutData.tipo) opt.selected = true;
                typeSelect.appendChild(opt);
            });
        }
        typeSelect.onchange = async () => {
            editedItemBuffer[`tipoCorte${idx}`] = typeSelect.value;
            await saveFieldSilently(vehicleId, `tipoCorte${idx}`, typeSelect.value);
        };

        // 2. Configuración de Relay
        const configLabel = document.createElement('label');
        configLabel.textContent = `Configuración de Relay ${idx}:`;
        configLabel.style.fontSize = "0.85em";
        const configSelect = document.createElement('select');
        configSelect.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px;";
        if (dropdownOptions && dropdownOptions.configRelay) {
            dropdownOptions.configRelay.forEach(optVal => {
                const opt = document.createElement('option');
                opt.value = optVal;
                opt.textContent = optVal;
                if (optVal === cutData.configRelay) opt.selected = true;
                configSelect.appendChild(opt);
            });
        }
        configSelect.onchange = async () => {
            editedItemBuffer[`configRelay${idx}`] = configSelect.value;
            await saveFieldSilently(vehicleId, `configRelay${idx}`, configSelect.value);
        };

        // 3. Ubicación del Corte
        const locLabel = document.createElement('label');
        locLabel.textContent = `Ubicación del Corte ${idx}:`;
        locLabel.style.fontSize = "0.85em";
        const locInput = document.createElement('textarea');
        locInput.id = `edit-cut-location-${vehicleId}-${idx}`;
        locInput.rows = 2;
        locInput.value = cutData.ubicacion || "";
        locInput.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px; background: var(--bg-color); color: var(--text-color); box-sizing: border-box; width: 100%;";
        locInput.onblur = async () => {
            if (locInput.value.trim() !== editedItemBuffer[`ubicacionCorte${idx}`]) {
                editedItemBuffer[`ubicacionCorte${idx}`] = locInput.value.trim();
                await saveFieldSilently(vehicleId, `ubicacionCorte${idx}`, locInput.value.trim());
            }
        };

        // 4. Color de Cable
        const colorLabel = document.createElement('label');
        colorLabel.textContent = `Color de Cable ${idx}:`;
        colorLabel.style.fontSize = "0.85em";
        const colorInput = document.createElement('input');
        colorInput.type = "text";
        colorInput.value = cutData.colorCable || "";
        colorInput.style.cssText = "padding: 4px; border: 1px solid #007bff; border-radius: 4px; background: var(--bg-color); color: var(--text-color); box-sizing: border-box; width: 100%;";
        colorInput.onblur = async () => {
            if (colorInput.value.trim() !== editedItemBuffer[`colorCableCorte${idx}`]) {
                editedItemBuffer[`colorCableCorte${idx}`] = colorInput.value.trim();
                await saveFieldSilently(vehicleId, `colorCableCorte${idx}`, colorInput.value.trim());
            }
        };

        editCutsWrapper.appendChild(typeLabel);
        editCutsWrapper.appendChild(typeSelect);
        editCutsWrapper.appendChild(configLabel);
        editCutsWrapper.appendChild(configSelect);
        editCutsWrapper.appendChild(locLabel);
        editCutsWrapper.appendChild(createRichTextToolbar(locInput.id));
        editCutsWrapper.appendChild(locInput);
        editCutsWrapper.appendChild(colorLabel);
        editCutsWrapper.appendChild(colorInput);

        container.appendChild(editCutsWrapper);
    } else {
        const contentP = document.createElement('div');
        if (isNoRecomendadoValue(cutData.tipo)) {
            contentP.innerHTML = `<strong>Tipo de Corte:</strong> No recomendado`;
        } else {
            contentP.innerHTML = `<strong>Tipo de Corte:</strong> ${sanitizeHtmlContent(cutData.tipo || 'No especificado')}<br>
                                <strong>Ubicación:</strong> ${sanitizeHtmlContent(cutData.ubicacion || 'No especificada')}<br>
                                <strong>Color de Cable:</strong> ${sanitizeHtmlContent(cutData.colorCable || 'No especificado')}`;
        }
        container.appendChild(contentP);
    }

    if (cutData.activaTestigo && !inEditMode) {
        const testigoNotice = document.createElement('p');
        testigoNotice.style.cssText = "color:#b45309; font-weight:bold; background:rgba(245,158,11,0.10); padding:8px; border-left:3px solid #d97706; border-radius:4px; margin:6px 0;";
        testigoNotice.textContent = "⚠️ Este corte activa el testigo de motor";
        container.appendChild(testigoNotice);
    }

    if (inEditMode || (cutData.img && !isNoRecomendadoValue(cutData.tipo))) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container-with-feedback';

        const img = document.createElement("img");

        if (isLazy) {
            img.dataset.src = getImageUrl(cutData.img, IMG_SIZE_MEDIUM);
        } else {
            // Phase Collaborative Update: Trigger validation banner after primary cut image loads
            // Attachment happens before setOptimizedImage to ensure we catch the onload event.
            const { catalogData } = getState();
            const currentItem = catalogData.cortes.find(c => String(c.id) === String(vehicleId));
            if (currentItem && !inEditMode) {
                img.onload = async () => {
                    const { eligible, isOldModel } = await checkValidationEligibility(currentItem);
                    if (eligible) {
                        showValidationBanner(currentItem, isOldModel);
                    }
                };
            }
            setOptimizedImage(img, cutData.img || null, IMG_SIZE_MEDIUM);
        }

        img.className = 'img-corte image-with-container';
        if (inEditMode) {
            convertImageToEditable(img, vehicleId, `imgCorte${cutData.index}`);
        } else {
            img.onclick = () => {
                const highResImgUrl = getImageUrl(cutData.img, IMG_SIZE_LARGE);
                window.abrirLightbox(highResImgUrl, 'lightboxImg');
            };
        }
        imgContainer.appendChild(img);

        if (!window.inEditMode) {
            const feedbackOverlay = document.createElement('div');
            feedbackOverlay.className = 'feedback-overlay';

        const utilBtn = document.createElement('button');
        utilBtn.className = 'feedback-btn-overlay util-btn';
        utilBtn.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
        utilBtn.title = 'Marcar como útil';

        // Optimistic UI for recordLike
        // Check if already liked in this session
        const { likedCortes, catalogData: catData } = getState();
        const likeKey = `${vehicleId}-${cutData.index}`;
        if (likedCortes && likedCortes.includes(likeKey)) {
            utilBtn.classList.add('liked');
            utilBtn.style.backgroundColor = '#28a745';
        }

        utilBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (utilBtn.classList.contains('liked')) return;

            const { currentUser } = getState();
            if (!currentUser) {
                showGlobalError("Debes estar conectado para votar.");
                return;
            }

            // UI Optimista
            utilBtn.classList.add('liked');
            utilBtn.style.backgroundColor = '#28a745';

            recordLike(vehicleId, cutData.index, getSessionPayload_()).then(response => {
                // Sincronizar con el contador confirmado por el servidor; no incrementar localmente.
                const currentState = getState();
                setState(applyConfirmedLikeState(currentState, vehicleId, cutData.index, response));
            }).catch(err => {
                console.error("Error reporting like:", err);
                utilBtn.classList.remove('liked');
                utilBtn.style.backgroundColor = '';
                showGlobalError("No se pudo registrar tu reacción. Reintenta.");
            });
        };
        feedbackOverlay.appendChild(utilBtn);

        // Tarea 2.1: Botón de reporte individual en cada corte
        const corteNum = cutData.index || index || 1;
        const reportBtn = document.createElement('button');
        reportBtn.className = 'feedback-btn-overlay report-btn';
        reportBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        reportBtn.title = `Reportar error en Corte #${corteNum}`;

        reportBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const { currentUser } = getState();
            if (!currentUser) {
                showGlobalError("Debes estar conectado para reportar.");
                return;
            }

            openReportCutModal(vehicleId, corteNum, cutData);
        };
        feedbackOverlay.appendChild(reportBtn);

        imgContainer.appendChild(feedbackOverlay);
        }
        container.appendChild(imgContainer);
    }

    if (inEditMode || !isNoRecomendadoValue(cutData.tipo)) {
        const relayContainer = document.createElement('p');
        const configRelay = cutData.configRelay;

        if (!configRelay || String(configRelay).toLowerCase() === 'sin relay') {
            relayContainer.innerHTML = `<strong>Configuración de Relay:</strong> Sin Relay`;
        } else {
            relayContainer.innerHTML = `<strong>Configuración de Relay: </strong>`;
            const relayButton = document.createElement('button');
            relayButton.textContent = configRelay;
            relayButton.className = 'btn-link';
            relayButton.onclick = () => {
                if (inEditMode) return; // Bloquear en modo edición In-Modal
                const relayInfo = datosRelay.find(r => r.configuracion === configRelay);
                if (relayInfo) {
                    renderRelayInfoModal(relayInfo);
                } else {
                    alert('No se encontraron detalles para esta configuración de relay.');
                }
            };
            relayContainer.appendChild(relayButton);
        }
        container.appendChild(relayContainer);

        if (cutData.colaborador && !inEditMode) {
            const colabP = document.createElement('p');
            // Comentario: Se añade una clase para un estilo dedicado y robusto desde style.css
            colabP.className = "colaborador-info";
            colabP.innerHTML = `Aportado por: <strong>${cleanColaboradorName(cutData.colaborador)}</strong>`;
            container.appendChild(colabP);
        }
    }
}

function renderRelayInfoModal(relayInfo) {
    let modal = document.getElementById('relay-info-modal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'relay-info-modal';
    modal.className = 'info-modal';
    modal.style.display = 'flex';

    const content = document.createElement('div');
    content.className = 'info-modal-content';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'info-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => {
        if (window.history && window.history.state && window.history.state.modalOpen) {
            window.history.back();
        } else {
            modal.style.display = 'none';
        }
    };
    content.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = relayInfo.configuracion;
    content.appendChild(title);

    const img = document.createElement('img');
    setOptimizedImage(img, relayInfo.imagen, IMG_SIZE_MEDIUM);
    img.style.width = '100%';
    img.onclick = () => {
        const highResImgUrl = getImageUrl(relayInfo.imagen, IMG_SIZE_LARGE);
        window.abrirLightbox(highResImgUrl, 'lightboxImg');
    };
    content.appendChild(img);

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    if (window.history && window.history.pushState) {
        window.history.pushState({ modalOpen: true }, '');
    }
}

let inboxCacheData = null;
let inboxViewGeneration_ = 0;
let inboxDetailGeneration_ = 0;

function normalizeUiRole_(role) {
    return String(role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function getUiSessionContext_(user = getState().currentUser) {
    if (!user) return null;
    const userId = String(user.ID || '').trim();
    const sessionToken = String(user.SessionToken || '').trim();
    if (!userId || !sessionToken) return null;
    return { userId, sessionToken, role: normalizeUiRole_(user.Privilegios) };
}

function isCurrentUiSessionContext_(expected) {
    if (!expected) return false;
    const current = getUiSessionContext_();
    return Boolean(current &&
        current.userId === expected.userId &&
        current.sessionToken === expected.sessionToken &&
        current.role === expected.role);
}

async function ensureUiSessionRole_(allowedRoles) {
    const expected = getUiSessionContext_();
    if (!expected || !Array.isArray(allowedRoles) || !allowedRoles.includes(expected.role)) return null;
    const authApi = typeof window !== 'undefined' ? window.auth : null;
    if (!authApi || typeof authApi.validateActiveSession !== 'function') {
        showGlobalError('No se pudo verificar la sesión actual. Inicia sesión nuevamente.');
        return null;
    }
    let valid = false;
    try {
        valid = await authApi.validateActiveSession(true);
    } catch (error) {
        console.warn('No se pudo revalidar la sesión antes de abrir una vista privilegiada:', error);
        showGlobalError('No se pudo verificar la sesión con el servidor. La vista protegida permanecerá cerrada.');
        return null;
    }
    if (valid !== true) {
        if (valid === null) showGlobalError('No se pudo verificar la sesión con el servidor. La vista protegida permanecerá cerrada.');
        return null;
    }
    const current = getUiSessionContext_();
    if (!current || !isCurrentUiSessionContext_(expected) || !allowedRoles.includes(current.role)) return null;
    return current;
}

function getSessionPayload_() {
    const context = getUiSessionContext_();
    if (!context) throw new Error('No hay una sesión activa válida.');
    return { userId: context.userId, sessionToken: context.sessionToken };
}

let lastShownAppContextKey = null;
let lastShownAppContext = null;
let pendingDriveAuditClear_ = Promise.resolve(true);
const pendingDriveAuditClearOwners_ = new Set();

function processPendingDriveAuditClears_() {
    if (pendingDriveAuditClearOwners_.size === 0) return Promise.resolve(true);
    pendingDriveAuditClear_ = pendingDriveAuditClear_.catch(() => false).then(async () => {
        while (pendingDriveAuditClearOwners_.size > 0) {
            const ownerId = pendingDriveAuditClearOwners_.values().next().value;
            const result = await offline.clearDriveAuditState(ownerId);
            if (result !== true) throw new Error('IndexedDB no confirmó la limpieza del estado de auditoría.');
            pendingDriveAuditClearOwners_.delete(ownerId);
        }
        return true;
    }).catch(error => {
        console.warn('No se pudo limpiar el estado de auditoría local de una cuenta anterior:', error.message);
        return false;
    });
    return pendingDriveAuditClear_;
}
let adminPanelGeneration_ = 0;
let replacedImagesModalGeneration_ = 0;
let auditDriveModalGeneration_ = 0;
let replacedImagesLightboxKeyHandler_ = null;
let privilegedModalTemplates_ = null;
const PRIVILEGED_MODAL_IDS_ = ['dev-tools-modal', 'replaced-images-modal', 'inbox-modal', 'dashboard-modal', 'audit-drive-modal'];

function capturePrivilegedModalTemplates_() {
    if (privilegedModalTemplates_) return;
    privilegedModalTemplates_ = new Map();
    PRIVILEGED_MODAL_IDS_.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) privilegedModalTemplates_.set(id, modal.cloneNode(true));
    });
}

function restorePrivilegedModalTemplates_() {
    capturePrivilegedModalTemplates_();
    PRIVILEGED_MODAL_IDS_.forEach(id => {
        const current = document.getElementById(id);
        const template = privilegedModalTemplates_.get(id);
        if (!current || !template || !current.parentNode) return;
        const replacement = template.cloneNode(true);
        replacement.style.display = 'none';
        replacement.querySelectorAll('[data-listener-set]').forEach(element => element.removeAttribute('data-listener-set'));
        current.replaceWith(replacement);
    });
}

function closeReplacedImagesLightbox_() {
    if (replacedImagesLightboxKeyHandler_) {
        document.removeEventListener('keydown', replacedImagesLightboxKeyHandler_);
        replacedImagesLightboxKeyHandler_ = null;
    }
    const lightbox = document.getElementById('replaced-image-lightbox');
    if (lightbox) lightbox.style.display = 'none';
    const image = document.getElementById('replaced-image-lightbox-image');
    if (image) image.src = '';
    const title = document.getElementById('replaced-image-lightbox-title');
    if (title) title.textContent = '';
}

function resetRoleScopedViews_() {
    inboxViewGeneration_ += 1;
    inboxDetailGeneration_ += 1;
    const inboxModal = document.getElementById('inbox-modal');
    const dashboardModal = document.getElementById('dashboard-modal');
    const inboxList = document.getElementById('inbox-list');
    const inboxDetail = document.getElementById('inbox-detail');
    const activityLogs = document.getElementById('activity-logs');

    if (inboxModal) inboxModal.style.display = 'none';
    if (dashboardModal) dashboardModal.style.display = 'none';
    if (inboxList) inboxList.innerHTML = '';
    if (inboxDetail) inboxDetail.innerHTML = '';
    if (activityLogs) activityLogs.innerHTML = '';
    inboxCacheData = null;
}

function resetSessionUi_() {
    inEditMode = false;
    window.inEditMode = false;
    clearInMemoryEditBackup_();
    pendingAdminImageUploads.clear();
    pendingAdminImageUploadsLoaded.clear();
    capturePrivilegedModalTemplates_();
    const previousContext = lastShownAppContext;
    if (previousContext && previousContext.userId && typeof offline.clearDriveAuditState === 'function') {
        pendingDriveAuditClearOwners_.add(String(previousContext.userId));
        processPendingDriveAuditClears_();
    }
    lastShownAppContext = null;
    isDriveAuditRunning = false;
    adminPanelGeneration_ += 1;
    replacedImagesModalGeneration_ += 1;
    auditDriveModalGeneration_ += 1;
    if (typeof window.adminServiceMetricsUnsubscribe === 'function') {
        try { window.adminServiceMetricsUnsubscribe(); } catch (error) {}
    }
    window.adminServiceMetricsUnsubscribe = null;
    window.adminListenersAttached = false;
    window.triggerAdminPanelPing = null;
    closeReplacedImagesLightbox_();
    resetRoleScopedViews_();
    closeSideMenu(true);

    document.querySelectorAll('.info-modal').forEach(modal => {
        modal.style.display = 'none';
    });

    const termsModal = document.getElementById('terms-modal');
    if (termsModal) termsModal.style.display = 'none';

    const detailModal = document.getElementById('modalDetalle');
    if (detailModal) {
        detailModal.classList.remove('visible');
        detailModal.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                }
            } catch (error) {}
            iframe.src = '';
            iframe.remove();
        });
    }
    const detailContent = document.getElementById('detalleCompleto');
    if (detailContent) detailContent.replaceChildren();

    if (typeof window.cerrarLightbox === 'function') window.cerrarLightbox(true);
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('visible');

    const replacedImageLightbox = document.getElementById('replaced-image-lightbox');
    if (replacedImageLightbox) replacedImageLightbox.style.display = 'none';
    const lightboxImage = document.getElementById('lightboxImg');
    if (lightboxImage) lightboxImage.src = '';
    const replacedImage = document.getElementById('replaced-image-lightbox-image');
    if (replacedImage) replacedImage.src = '';
    const replacedImageTitle = document.getElementById('replaced-image-lightbox-title');
    if (replacedImageTitle) replacedImageTitle.textContent = '';

    const roleAccessIds = ['dev-tools-btn', 'inbox-btn', 'dashboard-btn', 'logout-button'];
    roleAccessIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });

    const menuUsername = document.getElementById('menu-username');
    if (menuUsername) menuUsername.textContent = '';
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) welcomeMessage.style.display = 'none';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        const searchContainer = searchInput.closest('.search-container');
        if (searchContainer) searchContainer.classList.remove('has-text');
        if (searchInput.parentElement) searchInput.parentElement.classList.remove('has-text');
    }
    document.body.classList.remove('search-active');

    if (Array.isArray(window.modalNavStack)) window.modalNavStack.length = 0;

    const transientAdminIds = [
        'dev-console-log', 'dev-terminal-input', 'backup-resource-input',
        'logo-brand-name-input', 'replaced-images-list-container',
        'audit-drive-results-container', 'audit-drive-summary',
        'replaced-images-folder-status', 'selected-logo-file-name',
        'vin-migration-status', 'vin-recalculate-status', 'vin-diagnostic-status',
        'service-health-detail', 'service-traffic-chart', 'debug-log'
    ];
    transientAdminIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        if (element.tagName === 'INPUT') element.value = '';
        else element.replaceChildren();
    });
    const logoFileInput = document.getElementById('logo-file-input');
    if (logoFileInput) logoFileInput.value = '';

    const debugConsole = document.getElementById('debug-console');
    if (debugConsole) debugConsole.style.display = 'none';
    const devProgress = document.getElementById('dev-progress-container');
    if (devProgress) devProgress.style.display = 'none';

    restorePrivilegedModalTemplates_();
    lastShownAppContextKey = null;
}

function setupModal(modalId, openFn) {
    return async (...args) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal no encontrado: ${modalId}`);
            return;
        }

        const closeBtn = modal.querySelector('.info-close-btn');
        if (closeBtn && !closeBtn.dataset.listenerSet) {
            closeBtn.addEventListener('click', () => {
                const termsModal = document.getElementById('terms-modal');
                const isTermsModalActive = termsModal && termsModal.style.display === 'flex';

                if (!isTermsModalActive && window.history && window.history.state && window.history.state.modalOpen) {
                    window.history.back();
                } else {
                    modal.style.display = 'none';
                }
            });
            closeBtn.dataset.listenerSet = 'true';
        }

        if (window.history && window.history.pushState) {
            window.history.pushState({ modalOpen: true }, '');
        }

        return await openFn(...args);
    };
}

const openDashboardModal_ = setupModal('dashboard-modal', async () => {
    const requestContext = getUiSessionContext_();
    if (!requestContext) return;

    const modal = document.getElementById('dashboard-modal');
    modal.style.display = 'flex';
    const logContainer = document.getElementById('activity-logs');
    logContainer.innerHTML = '<tr><td colspan="4">Cargando actividad...</td></tr>';

    try {
        const result = await getActivityLogs(getSessionPayload_());
        if (!isCurrentUiSessionContext_(requestContext)) return;
        if (result.status === 'success') {
            logContainer.innerHTML = '';
            result.data.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.nombreUsuario}</td>
                    <td>${log.tipoActividad}</td>
                    <td>${log.detalle || ''}</td>
                `;
                logContainer.appendChild(tr);
            });
        }
    } catch (error) {
        if (!isCurrentUiSessionContext_(requestContext)) return;
        logContainer.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar actividad</td></tr>';
    }
});

export async function openDashboard() {
    const context = await ensureUiSessionRole_(['desarrollador', 'gefe', 'supervisor']);
    if (!context) return;
    return openDashboardModal_();
}

const openInboxModal_ = setupModal('inbox-modal', async () => {
    const requestContext = getUiSessionContext_();
    if (!requestContext) return;
    const generation = ++inboxViewGeneration_;
    inboxDetailGeneration_ += 1;
    const isCurrentInboxRequest = () => generation === inboxViewGeneration_ && isCurrentUiSessionContext_(requestContext);

    const modal = document.getElementById('inbox-modal');
    modal.style.display = 'flex';
    const listContainer = document.getElementById('inbox-list');
    const detailContainer = document.getElementById('inbox-detail');
    listContainer.innerHTML = '<p>Cargando mensajes...</p>';
    detailContainer.innerHTML = '<p>Selecciona un item para ver los detalles.</p>';

    try {
        const result = await getFeedbackItems(getSessionPayload_());
        if (!isCurrentInboxRequest()) return;

        if (result.status === 'success') {
            const data = result.data || result.messages || result.items || [];

            if (Array.isArray(data)) {
                renderInboxList(data);
            } else {
                listContainer.innerHTML = `<p style="color:red;">Error: El formato de los datos es incorrecto.</p>`;
            }
        } else {
            listContainer.innerHTML = `<p style="color:red;">Error: ${result.message || 'No se pudieron cargar los mensajes.'}</p>`;
        }
    } catch (error) {
        if (!isCurrentInboxRequest()) return;
        console.error("Error fetching feedback items:", error);
        listContainer.innerHTML = `<p style="color:red;">Error de conexión al cargar mensajes.</p>`;
    }
});

export async function openInbox() {
    const context = await ensureUiSessionRole_(['desarrollador', 'gefe', 'jefe', 'supervisor']);
    if (!context) return;
    return openInboxModal_();
}

/* TAREA 1.2: RECUPERACIÓN DE LAS FUNCIONES DEL PANEL DE DESARROLLADOR */
const openDevToolsModal_ = setupModal('dev-tools-modal', () => {
    document.getElementById('dev-tools-modal').style.display = 'flex';
    initAdminPanelListeners();
    if (window.triggerAdminPanelPing) {
        window.triggerAdminPanelPing();
    }
});

export async function openDevTools(...args) {
    const sessionContext = await ensureUiSessionRole_(['desarrollador']);
    if (!sessionContext) return;
    return openDevToolsModal_(...args);
}

function initAdminPanelListeners() {
    const panelSessionContext_ = getUiSessionContext_();
    const panelGeneration_ = adminPanelGeneration_;
    const isAdminPanelCurrent_ = () => Boolean(panelSessionContext_ &&
        panelGeneration_ === adminPanelGeneration_ &&
        isCurrentUiSessionContext_(panelSessionContext_));
    const consoleLog = document.getElementById('dev-console-log');
    if (!consoleLog) return; // Evitar inicializaciones duplicadas si no está en el DOM

    // Helper para formatear tiempo MM:SS
    function formatTimeMMSS(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Helper para logs
    function log(msg, isWarning = false, isError = false) {
        if (!isAdminPanelCurrent_()) return;
        const time = new Date().toLocaleTimeString();
        const p = document.createElement('div');
        p.style.marginBottom = "4px";
        if (isWarning) {
            p.style.color = "#ffcc00";
            p.className = "log-warning";
        } else if (isError) {
            p.style.color = "#ff3333";
            p.className = "log-error";
        } else {
            p.className = "log-info";
        }
        p.textContent = `[${time}] ${msg}`;
        consoleLog.appendChild(p);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    let verifiedDatabaseBackupId = null;
    let vinMigrationPreview = null;
    let vinMigrationPreviewBackupId = null;
    let vinMigrationRunning = false;

    // Prevenir re-registro de listeners
    if (window.adminListenersAttached) {
        return;
    }
    window.adminListenersAttached = true;

    let serviceHealthResults = {}, selectedServiceKey = null, isHealthScanRunning = false;
    function formatServiceCheckTime(value) {
        if (!value) return "No disponible";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "No disponible" : date.toLocaleTimeString();
    }
    function createServiceMetric(label, value) {
        const item = document.createElement("div");
        item.className = "dev-service-metric";
        const caption = document.createElement("span");
        caption.className = "dev-service-metric-label";
        caption.textContent = label;
        const content = document.createElement("strong");
        content.className = "dev-service-metric-value";
        content.textContent = value;
        item.append(caption, content);
        return item;
    }
    function renderServiceCards() {
        const grid = document.getElementById("services-health-grid");
        if (!grid) return;
        grid.replaceChildren();
        const keys = Object.keys(serviceHealthResults);
        if (!keys.length) {
            const empty = document.createElement("p");
            empty.className = "dev-empty-state";
            empty.textContent = "No hay resultados de diagnóstico disponibles. Ejecuta un escaneo.";
            grid.appendChild(empty);
            return;
        }
        keys.forEach(key => {
            const item = serviceHealthResults[key];
            const card = document.createElement("button");
            card.type = "button";
            card.className = "dev-service-card";
            if (selectedServiceKey === key) card.classList.add("is-selected");
            card.setAttribute("aria-pressed", selectedServiceKey === key ? "true" : "false");
            const top = document.createElement("span");
            top.className = "dev-service-card-top";
            const name = document.createElement("strong");
            name.textContent = item.metadata?.service || key;
            const status = document.createElement("span");
            status.className = `dev-service-status is-${item.status}`;
            status.textContent = item.status === "online" ? "En línea" : item.status === "error" ? "Con error" : "Sin respuesta";
            top.append(name, status);
            const bottom = document.createElement("span");
            bottom.className = "dev-service-card-bottom";
            const latency = document.createElement("span");
            latency.textContent = Number.isFinite(item.latency) ? `${Math.round(item.latency)} ms` : "Latencia no disponible";
            const version = document.createElement("span");
            version.textContent = item.metadata?.version ? `v${item.metadata.version}` : "Versión no reportada";
            bottom.append(latency, version);
            card.append(top, bottom);
            card.addEventListener("click", () => { selectedServiceKey = key; renderServiceDashboard(); });
            grid.appendChild(card);
        });
    }
    function renderServiceDetail() {
        const detail = document.getElementById("service-health-detail");
        if (!detail) return;
        detail.replaceChildren();
        const item = serviceHealthResults[selectedServiceKey];
        if (!selectedServiceKey || !item) {
            const empty = document.createElement("p");
            empty.className = "dev-empty-state";
            empty.textContent = "Selecciona una tarjeta para consultar sus parámetros.";
            detail.appendChild(empty);
            return;
        }
        const events = getServiceMetricsSnapshot().events.filter(event => event.service === selectedServiceKey);
        const successful = events.filter(event => event.outcome === "success").length;
        const failed = events.length - successful;
        const average = events.length ? Math.round(events.reduce((sum, event) => sum + event.durationMs, 0) / events.length) : null;
        const lastEvent = events.length ? events[events.length - 1] : null;
        const metadata = item.metadata || {};
        const heading = document.createElement("div");
        heading.className = "dev-service-detail-heading";
        const title = document.createElement("h4");
        title.textContent = metadata.service || selectedServiceKey;
        const state = document.createElement("span");
        state.className = `dev-service-status is-${item.status}`;
        state.textContent = item.status === "online" ? "En línea" : item.status === "error" ? "Con error" : "Sin respuesta";
        heading.append(title, state);
        detail.appendChild(heading);
        const metrics = document.createElement("div");
        metrics.className = "dev-service-metrics";
        metrics.append(
            createServiceMetric("Versión reportada", metadata.version || "No disponible"),
            createServiceMetric("Última comprobación", formatServiceCheckTime(item.checkedAt)),
            createServiceMetric("Latencia del diagnóstico", Number.isFinite(item.latency) ? `${Math.round(item.latency)} ms` : "No disponible"),
            createServiceMetric("Solicitudes API observadas (15 min)", String(events.length)),
            createServiceMetric("Solicitudes correctas", String(successful)),
            createServiceMetric("Solicitudes con error", String(failed)),
            createServiceMetric("Tiempo medio observado", average === null ? "No disponible" : `${average} ms`)
        );
        detail.appendChild(metrics);
        const note = document.createElement("p");
        note.className = "dev-service-note";
        note.textContent = "Las solicitudes, acciones y tiempos se miden desde esta sesión del navegador. El servicio no expone un contador global verificable de ejecuciones internas de Apps Script.";
        detail.appendChild(note);
        const dependencies = document.createElement("div");
        dependencies.className = "dev-service-dependencies";
        const depTitle = document.createElement("strong");
        depTitle.textContent = "Información reportada por el backend";
        dependencies.appendChild(depTitle);
        const depItems = [];
        if (Array.isArray(metadata.sheetsAccessed) && metadata.sheetsAccessed.length) depItems.push(`Hojas declaradas: ${metadata.sheetsAccessed.join(", ")}`);
        if (metadata.cacheStatus && typeof metadata.cacheStatus.isCached === "boolean") depItems.push(`Caché: ${metadata.cacheStatus.isCached ? "con datos" : "sin datos"}`);
        if (metadata.reportedStatus) depItems.push(`Estado reportado: ${metadata.reportedStatus}`);
        if (!depItems.length) depItems.push("El endpoint no expone parámetros adicionales de diagnóstico.");
        depItems.forEach(value => { const p = document.createElement("p"); p.textContent = value; dependencies.appendChild(p); });
        detail.appendChild(dependencies);
        const actionsTitle = document.createElement("strong");
        actionsTitle.className = "dev-service-actions-heading";
        actionsTitle.textContent = "Acciones API observadas en esta sesión";
        detail.appendChild(actionsTitle);
        if (!events.length) {
            const empty = document.createElement("p");
            empty.className = "dev-empty-state";
            empty.textContent = "Todavía no se han observado solicitudes API para este servicio en esta sesión.";
            detail.appendChild(empty);
        } else {
            const list = document.createElement("ul");
            list.className = "dev-service-events";
            events.slice(-8).reverse().forEach(event => {
                const row = document.createElement("li");
                const action = document.createElement("strong");
                action.textContent = event.action;
                const info = document.createElement("span");
                info.textContent = `${formatServiceCheckTime(event.timestamp)} · ${Math.round(event.durationMs)} ms · ${event.outcome}`;
                row.append(action, info);
                list.appendChild(row);
            });
            detail.appendChild(list);
        }
        if (lastEvent) {
            const last = document.createElement("p");
            last.className = "dev-service-note";
            last.textContent = `Última acción observada: ${lastEvent.action}.`;
            detail.appendChild(last);
        }
    }
    function renderServiceTrafficChart() {
        const container = document.getElementById("service-traffic-chart");
        if (!container) return;
        container.replaceChildren();
        const snapshot = getServiceMetricsSnapshot();
        if (!snapshot.events.length) {
            const empty = document.createElement("p");
            empty.className = "dev-empty-state";
            empty.textContent = "Aún no se han observado solicitudes API en esta sesión.";
            container.appendChild(empty);
            return;
        }
        const bucketCount = 15, bucketSize = 60000;
        const currentMinute = Math.floor(Date.now() / bucketSize) * bucketSize;
        const firstMinute = currentMinute - (bucketCount - 1) * bucketSize;
        const keys = [...new Set([...Object.keys(serviceHealthResults), ...snapshot.events.map(event => event.service)])];
        const series = keys.map(service => ({ service, counts: Array(bucketCount).fill(0) }));
        snapshot.events.forEach(event => {
            const index = Math.floor((event.timestamp - firstMinute) / bucketSize);
            if (index >= 0 && index < bucketCount) {
                const target = series.find(item => item.service === event.service);
                if (target) target.counts[index]++;
            }
        });
        const maxValue = Math.max(1, ...series.flatMap(item => item.counts));
        const width = 920, height = 270, left = 48, right = 18, top = 18, bottom = 42;
        const plotWidth = width - left - right, plotHeight = height - top - bottom;
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("class", "dev-service-traffic-svg");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Solicitudes API por minuto observadas desde este navegador durante los últimos quince minutos.");
        [0, Math.ceil(maxValue / 2), maxValue].filter((v, i, arr) => arr.indexOf(v) === i).forEach(value => {
            const y = top + plotHeight - (value / maxValue) * plotHeight;
            const line = document.createElementNS(ns, "line");
            line.setAttribute("x1", left); line.setAttribute("x2", width - right);
            line.setAttribute("y1", y); line.setAttribute("y2", y);
            line.setAttribute("class", "dev-service-traffic-gridline");
            svg.appendChild(line);
            const label = document.createElementNS(ns, "text");
            label.setAttribute("x", left - 10); label.setAttribute("y", y + 4);
            label.setAttribute("text-anchor", "end"); label.setAttribute("class", "dev-service-traffic-axis");
            label.textContent = String(value); svg.appendChild(label);
        });
        [0, 3, 6, 9, 12, 14].forEach(index => {
            const x = left + (index / (bucketCount - 1)) * plotWidth;
            const label = document.createElementNS(ns, "text");
            label.setAttribute("x", x); label.setAttribute("y", height - 12);
            label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "dev-service-traffic-axis");
            label.textContent = new Date(firstMinute + index * bucketSize).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            svg.appendChild(label);
        });
        series.forEach((item, index) => {
            const points = item.counts.map((count, bucket) => {
                const x = left + (bucket / (bucketCount - 1)) * plotWidth;
                const y = top + plotHeight - (count / maxValue) * plotHeight;
                return `${x},${y}`;
            }).join(" ");
            const line = document.createElementNS(ns, "polyline");
            line.setAttribute("points", points);
            line.setAttribute("class", `dev-service-traffic-line dev-service-color-${index % 8}`);
            svg.appendChild(line);
        });
        container.appendChild(svg);
        const legend = document.createElement("div");
        legend.className = "dev-service-traffic-legend";
        series.forEach((item, index) => {
            const entry = document.createElement("span");
            entry.className = `dev-service-traffic-legend-item dev-service-color-${index % 8}`;
            entry.textContent = item.service;
            legend.appendChild(entry);
        });
        container.appendChild(legend);
    }
    function renderServiceDashboard() {
        if (!isAdminPanelCurrent_()) return;
        renderServiceCards();
        renderServiceDetail();
        renderServiceTrafficChart();
    }
    async function runServicesHealthScan() {
        if (isHealthScanRunning) return;
        isHealthScanRunning = true;
        const grid = document.getElementById("services-health-grid");
        const button = document.getElementById("btn-check-services-health");
        if (button) button.disabled = true;
        if (grid) grid.innerHTML = '<span class="dev-empty-state">Escaneando servicios (máximo 8 segundos por servicio)...</span>';
        log("[SALUD] Ejecutando diagnóstico independiente de cada servicio...");
        try {
            serviceHealthResults = await checkAllServicesHealth();
            if (!isAdminPanelCurrent_()) return;
            if (!selectedServiceKey || !serviceHealthResults[selectedServiceKey]) selectedServiceKey = Object.keys(serviceHealthResults)[0] || null;
            renderServiceDashboard();
            log("[SALUD] Diagnóstico de servicios completado.");
        } catch (e) {
            log(`[SALUD ERROR] Fallo al escanear servicios: ${e.message}`, false, true);
            if (grid) grid.innerHTML = '<span class="dev-empty-state">No fue posible completar el diagnóstico.</span>';
        } finally {
            isHealthScanRunning = false;
            if (button) button.disabled = false;
        }
    }
    const scanBtn = document.getElementById("btn-check-services-health");
    if (scanBtn) scanBtn.onclick = () => runServicesHealthScan();
    if (!window.adminServiceMetricsUnsubscribe) {
        window.adminServiceMetricsUnsubscribe = subscribeServiceMetrics(() => {
            if (!isAdminPanelCurrent_()) return;
            renderServiceTrafficChart();
            if (selectedServiceKey) renderServiceDetail();
        });
    }

    // Conectividad automática e inicio
    window.triggerAdminPanelPing = async function() {
        if (!isAdminPanelCurrent_()) return;
        consoleLog.innerHTML = ''; // Limpiar consola al abrir
        log("Sistema administrativo iniciado correctamente.");
        log("Comprobando disponibilidad del microservicio...");

        const pingStartTime = Date.now();
        try {
            const res = await routeAction('ping');
            if (!isAdminPanelCurrent_()) return;
            const latency = Date.now() - pingStartTime;
            if (res && res.status === 'success') {
                log("Microservicio activo.");
                log("Comunicación establecida.");
                log(`Tiempo de respuesta: ${latency} ms.`);
            } else {
                log("No fue posible establecer comunicación con el microservicio.", false, true);
            }
        } catch (error) {
            log("No fue posible establecer comunicación con el microservicio.", false, true);
        }
        runServicesHealthScan();
        log("Esperando operaciones...");
    };

    // Helper para progreso
    function setProgress(percent) {
        if (!isAdminPanelCurrent_()) return;
        const container = document.getElementById('dev-progress-container');
        const bar = document.getElementById('dev-progress-bar');
        const text = document.getElementById('dev-progress-text');
        if (container && bar && text) {
            container.style.display = 'block';
            bar.style.width = `${percent}%`;
            text.textContent = `${percent}%`;
            if (percent >= 100) {
                setTimeout(() => { container.style.display = 'none'; }, 2000);
            }
        }
    }

    // Reproducir logs progresivamente para emular tiempo real
    async function playLogs(logs) {
        if (!logs || logs.length === 0) return;
        for (const item of logs) {
            if (!isAdminPanelCurrent_()) return;
            log(item.message, item.isWarning, item.isError);
            if (item.percentage !== undefined) {
                setProgress(item.percentage);
            }
            await new Promise(resolve => setTimeout(resolve, 80)); // Pausa para animación fluida
        }
    }

    // Función genérica para disparar tareas con soporte para lotes automáticos, ETA y estadísticas en tiempo real
    async function runAction(action, payload = {}) {
        const isBatch = action === 'normalizeImages' || action === 'organizePrimaryVehicleImages';
        const startTime = Date.now();

        let lastResource = "N/A";
        let lastFila = "N/A";

        if (!isBatch) {
            log(`Enviando comando administrativo '${action}' al servidor...`);
            setProgress(5);
            try {
                const res = await routeAction(action, { ...payload, ...getDeveloperSessionPayload() });
                if (!isAdminPanelCurrent_()) return null;
                setProgress(50);
                if (res.status === 'success') {
                    if (res.logs) {
                        await playLogs(res.logs);
                    }
                    setProgress(100);
                    log(`[SISTEMA] Acción '${action}' finalizada con éxito.`);
                    return res;
                } else {
                    setProgress(0);
                    log(`[ERROR] Acción fallida: ${res.message}`, false, true);
                    if (res.logs) await playLogs(res.logs);
                }
            } catch (error) {
                setProgress(0);
                const elapsedMs = Date.now() - startTime;
                const elapsedSec = (elapsedMs / 1000).toFixed(1);
                const detailedErrorMsg = `
========================================
🚨 ERROR DETECTADO

Operación:
${action}

Etapa:
Ejecución de acción individual

Recurso:
N/A

Fila:
N/A

Lote:
N/A

Función:
routeAction

Código HTTP:
500

Mensaje:
${error.message || 'Error de conexión / Servidor no disponible'}

Excepción:
${error.stack || error.toString()}

Tiempo transcurrido:
${elapsedSec}s
========================================
`;
                log(detailedErrorMsg, false, true);
            }
            return;
        }

        // --- PROCESAMIENTO SECUENCIAL POR LOTES ---
        log(`[LOTE] Iniciando procesamiento por lotes para '${action}'...`);
        const limit = 10;
        let finished = false;
        let processId = "P-" + Date.now();
        let loopCount = 0;
        let errorCount = 0;

        // Variables acumuladoras de estadísticas
        let totalCarpetasVerificadas = 0;
        let totalCarpetasCreadas = 0;
        let totalCarpetasRenombradas = 0;
        let totalCarpetasEliminadas = 0;
        let totalImagenesMovidas = 0;
        let totalImagenesRenombradas = 0;
        let totalImagenesOmitidas = 0;
        let totalErroresArchivo = 0;

        while (!finished) {
            if (!isAdminPanelCurrent_()) return null;
            loopCount++;
            log(`[LOTE] Ejecutando lote ${loopCount}...`);
            try {
                const res = await routeAction(action, { limit, reset: payload.reset, processId, ...getDeveloperSessionPayload() });
                if (!isAdminPanelCurrent_()) return null;
                if (res.status === 'warning') {
                    errorCount++;
                    log(`[ADVERTENCIA] ${res.message || 'La operación se detuvo por una condición de seguridad.'}`, false, true);
                    if (res.logs) await playLogs(res.logs);
                    finished = true;
                    setProgress(0);
                } else if (res.status === 'success') {
                    if (res.logs) {
                        await playLogs(res.logs);
                    }

                    const nextIndex = res.nextIndex;
                    const totalVehicles = res.totalVehicles;
                    const percentage = totalVehicles > 0 ? Math.round((nextIndex / totalVehicles) * 100) : 100;

                    setProgress(percentage);

                    // Calcular tiempos y estadísticas
                    const elapsedMs = Date.now() - startTime;
                    const elapsedSec = (elapsedMs / 1000).toFixed(1);
                    let etaStr = "Calculando...";
                    if (nextIndex > 0 && nextIndex < totalVehicles) {
                        const msPerItem = elapsedMs / nextIndex;
                        const remainingItems = totalVehicles - nextIndex;
                        const etaMs = msPerItem * remainingItems;
                        const etaSec = Math.round(etaMs / 1000);
                        etaStr = `${etaSec}s`;
                    } else if (nextIndex >= totalVehicles) {
                        etaStr = "0s";
                    }

                    log(`[ESTADO] Lote ${loopCount} completado. Registro actual: ${nextIndex}/${totalVehicles} (${percentage}%).`);
                    log(`[TIEMPO] Transcurrido: ${elapsedSec}s | Restante estimado: ${etaStr}`);

                    // Acumular estadísticas devueltas por el servidor
                    if (res.foldersChecked !== undefined) totalCarpetasVerificadas += res.foldersChecked;
                    if (res.foldersCreated !== undefined) totalCarpetasCreadas += res.foldersCreated;
                    if (res.foldersRenamed !== undefined) totalCarpetasRenombradas += res.foldersRenamed;
                    if (res.foldersDeleted !== undefined) totalCarpetasEliminadas += res.foldersDeleted;
                    if (res.movedFiles !== undefined) totalImagenesMovidas += res.movedFiles;
                    if (res.imagesRenamed !== undefined) totalImagenesRenombradas += res.imagesRenamed;
                    if (res.skippedFiles !== undefined) totalImagenesOmitidas += res.skippedFiles;
                    if (res.itemErrors !== undefined) totalErroresArchivo += res.itemErrors;

                    // Extraer último archivo y carpeta procesada de los registros recibidos
                    let lastFile = "Ninguno";
                    let lastFolder = "Ninguna";
                    if (res.logs && res.logs.length > 0) {
                        for (let k = res.logs.length - 1; k >= 0; k--) {
                            const msg = res.logs[k].message;
                            const fileMatch = msg.match(/'([^']+)'/);
                            if (fileMatch) {
                                lastFile = fileMatch[1];
                            }
                            const folderMatch = msg.match(/(carpeta|subcarpeta)\s+'([^']+)'/i);
                            if (folderMatch) {
                                lastFolder = folderMatch[2];
                            } else {
                                const genFolderMatch = msg.match(/carpeta\s+([^:\s]+)/i);
                                if (genFolderMatch && lastFolder === "Ninguna") lastFolder = genFolderMatch[1];
                            }
                        }
                    }

                    lastResource = lastFile !== "Ninguno" ? lastFile : (lastFolder !== "Ninguna" ? lastFolder : "N/A");
                    lastFila = res.ultimaFilaProcesada || (res.filaInicial + res.processedCount - 1);

                    // Registro continuo detallado
                    log(`
--------------------------------------------------
[PROGRESO CONTINUO]
Carpeta actual: ${lastFolder}
Archivo actual: ${lastFile}
Fila actual: ${lastFila}
Lote actual: ${loopCount}
Porcentaje: ${percentage}%
Tiempo transcurrido: ${elapsedSec}s
Cantidad procesada en lote: ${res.processedCount} (Total acumulado: ${nextIndex}/${totalVehicles})
--------------------------------------------------
`);

                    if (res.processedCount === 0 || nextIndex >= totalVehicles || res.estado === 'completado') {
                        finished = true;
                        setProgress(100);
                        const totalTimeStr = formatTimeMMSS(Date.now() - startTime);
                        log(`
==================================================
${totalErroresArchivo > 0 ? "Proceso finalizado con advertencias ⚠️" : "Proceso finalizado con éxito 🎉"}

Carpetas verificadas:
${totalCarpetasVerificadas}

Carpetas creadas:
${totalCarpetasCreadas}

Carpetas renombradas:
${totalCarpetasRenombradas}

Carpetas eliminadas:
${totalCarpetasEliminadas}

Imágenes movidas:
${totalImagenesMovidas}

Imágenes renombradas:
${totalImagenesRenombradas}

Imágenes omitidas:
${totalImagenesOmitidas}

Errores por archivo:
${totalErroresArchivo}

Errores de lote:
${errorCount}

Tiempo total:
${totalTimeStr}
==================================================
`);
                    }

                    // Asegurar que subsiguientes llamadas continúen sin volver a resetear
                    payload.reset = false;
                } else {
                    errorCount++;
                    log(`[ERROR] Lote ${loopCount} falló: ${res.message}`, false, true);
                    if (res.logs) await playLogs(res.logs);

                    if (errorCount > 3) {
                        log(`[INTERRUPCIÓN] Demasiados errores consecutivos. Operación interrumpida.`, false, true);
                        finished = true;
                    }
                }
            } catch (error) {
                errorCount++;
                const elapsedMs = Date.now() - startTime;
                const elapsedSec = (elapsedMs / 1000).toFixed(1);

                // Registro detallado de errores y excepciones
                const detailedErrorMsg = `
========================================
🚨 ERROR DETECTADO

Operación:
${action === 'normalizeImages' ? 'Normalización de imágenes' : action === 'organizePrimaryVehicleImages' ? 'Organización de imágenes principales' : action}

Etapa:
Procesamiento de imágenes

Recurso:
${lastResource || 'N/A'}

Fila:
${lastFila || 'N/A'}

Lote:
${loopCount}

Función:
routeAction

Código HTTP:
${error.message.includes('500') ? '500' : '500'}

Mensaje:
${error.message || 'Error de comunicación con el servidor'}

Excepción:
${error.stack || error.toString()}

Tiempo transcurrido:
${elapsedSec}s
========================================
`;
                log(detailedErrorMsg, false, true);

                log(`[INTERRUPCIÓN] Conexión interrumpida o fallo de tiempo de ejecución. El progreso se ha guardado en el servidor. Podrás reanudar desde el registro actual en la próxima ejecución.`, true, false);
                finished = true;
            }

            if (!finished) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    // --- NAVEGACIÓN Y COMANDOS DE TERMINAL DRIVE (cd, dir, tree, mkdir, move) ---
    let currentTerminalFolderId = null;
    let commandHistory = [];
    let commandHistoryIndex = -1;

    async function executeTerminalCommand(inputCmd) {
        if (!inputCmd || !inputCmd.trim()) return;
        const rawCmd = inputCmd.trim();
        commandHistory.push(rawCmd);
        commandHistoryIndex = commandHistory.length;

        log(`> ${rawCmd}`);

        const parts = rawCmd.split(/\s+/);
        let cmd = parts[0].toLowerCase();
        let args = parts.slice(1).join(' ');

        // Soportar cd /d D:\ o cd \ o cd ..
        if (cmd === 'cd' && (args.startsWith('/d') || args.startsWith('/D'))) {
            args = args.replace(/^\/[dD]\s*/, '');
        }

        try {
            const res = await routeAction('driveCommand', {
                command: cmd,
                args: args,
                currentFolderId: currentTerminalFolderId,
                ...getDeveloperSessionPayload()
            });
            if (!isAdminPanelCurrent_()) return;

            if (res && res.status === 'success') {
                if (res.currentFolder) {
                    currentTerminalFolderId = res.currentFolder.id;
                    log(`Ruta actual: [${res.currentFolder.name}] (${res.currentFolder.id})`);
                }
                if (res.tree) {
                    log(`\n${res.tree}`);
                }
                if (res.folders || res.files) {
                    if (res.folders.length === 0 && res.files.length === 0) {
                        log("(Carpeta vacía)");
                    }
                    res.folders.forEach(f => {
                        log(`📁 [${f.name}]  (Escribe 'cd ${f.name}' para entrar)`);
                    });
                    res.files.forEach(f => {
                        log(`📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
                    });
                }
                if (res.message) {
                    log(`[DRIVE] ${res.message}`);
                }
            } else {
                log(`[ERROR TERMINAL] ${res ? res.message : 'Error al ejecutar comando.'}`, false, true);
            }
        } catch (err) {
            log(`[ERROR TERMINAL] ${err.message}`, false, true);
        }
    }

    const termInput = document.getElementById('dev-terminal-input');
    const termSendBtn = document.getElementById('btn-terminal-send');

    if (termInput) {
        termInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const val = termInput.value;
                termInput.value = '';
                await executeTerminalCommand(val);
            } else if (e.key === 'ArrowUp') {
                if (commandHistory.length > 0 && commandHistoryIndex > 0) {
                    commandHistoryIndex--;
                    termInput.value = commandHistory[commandHistoryIndex];
                }
            } else if (e.key === 'ArrowDown') {
                if (commandHistoryIndex < commandHistory.length - 1) {
                    commandHistoryIndex++;
                    termInput.value = commandHistory[commandHistoryIndex];
                } else {
                    commandHistoryIndex = commandHistory.length;
                    termInput.value = '';
                }
            }
        });
    }

    if (termSendBtn) {
        termSendBtn.onclick = async () => {
            if (termInput && termInput.value) {
                const val = termInput.value;
                termInput.value = '';
                await executeTerminalCommand(val);
            }
        };
    }

    // Botón Copiar Registro de errores y advertencias críticas
    const btnCopyLog = document.getElementById('btn-copy-console-log');
    if (btnCopyLog) {
        btnCopyLog.onclick = () => {
            const divs = consoleLog.querySelectorAll('div');
            const filteredTexts = [];
            divs.forEach(div => {
                const text = div.textContent || div.innerText;
                const isErr = div.classList.contains('log-error') || div.classList.contains('log-warning');
                const hasPatterns = /🚨|error|advertencia|falla|excepción|exception|stack|trace|fallo/i.test(text);
                const isExcluded = /sistema administrativo iniciado|comprobando disponibilidad|microservicio activo|comunicación establecida|tiempo de respuesta/i.test(text);
                if ((isErr || hasPatterns) && !isExcluded) {
                    filteredTexts.push(text);
                }
            });

            if (filteredTexts.length === 0) {
                alert("No se encontraron errores ni advertencias críticas para copiar.");
                return;
            }

            const rawText = filteredTexts.join('\n');
            navigator.clipboard.writeText(rawText).then(() => {
                log("[SISTEMA] Registro filtrado de errores copiado al portapapeles.");
            }).catch(err => {
                alert("No se pudo copiar el registro: " + err);
            });
        };
    }

    // Respaldos y restauración: un único campo compartido para entrada y salida de enlaces.
    const backupResourceInput = document.getElementById('backup-resource-input');
    const backupResourceHint = document.getElementById('backup-resource-hint');

    function setBackupResourceHint(message, isError = false) {
        if (backupResourceHint) {
            backupResourceHint.textContent = message;
            backupResourceHint.dataset.state = isError ? 'error' : 'info';
        }
    }

    function setBackupButtonBusy(button, busy) {
        if (!button) return;
        button.disabled = busy;
        button.setAttribute('aria-busy', String(busy));
    }

    function isVerifiedBackupResponse(response, resourceType) {
        const backupId = String(response && response.backupId || '').trim();
        const backupUrl = String(response && response.backupUrl || '').trim();
        if (!backupId || !backupUrl) return false;
        const expectedPrefix = resourceType === 'spreadsheet'
            ? `https://docs.google.com/spreadsheets/d/${backupId}`
            : `https://drive.google.com/drive/folders/${backupId}`;
        return backupUrl === expectedPrefix || backupUrl.startsWith(expectedPrefix + '/') || backupUrl.startsWith(expectedPrefix + '?');
    }

    async function createBackup(action, resourceType, button) {
        const description = resourceType === 'spreadsheet'
            ? 'Creando y verificando el respaldo de la Spreadsheet...'
            : 'Creando y verificando el respaldo de la carpeta de Drive...';
        setBackupResourceHint(description);
        setBackupButtonBusy(button, true);
        try {
            const response = await runAction(action);
            if (!isAdminPanelCurrent_()) return;
            if (!response) {
                setBackupResourceHint('No se confirmó la creación del respaldo. Consulta la consola para revisar el resultado.', true);
                return;
            }
            if (!isVerifiedBackupResponse(response, resourceType)) {
                log('[ERROR] ADMIN no devolvió un enlace completo verificable para el recurso de respaldo.', false, true);
                setBackupResourceHint('El servidor no confirmó la identidad y el enlace completo del respaldo. No se mostrará como válido.', true);
                return;
            }
            backupResourceInput.value = response.backupUrl;
            verifiedDatabaseBackupId = resourceType === 'spreadsheet' ? String(response.backupId) : null;
            vinMigrationPreview = null;
            vinMigrationPreviewBackupId = null;
            updateVinMigrationControls();
            setBackupResourceHint(resourceType === 'spreadsheet'
                ? 'Respaldo de Spreadsheet verificado. El enlace completo quedó disponible en este campo.'
                : 'Respaldo de Drive verificado. El enlace completo quedó disponible en este campo.');
        } finally {
            setBackupButtonBusy(button, false);
        }
    }

    document.getElementById('btn-admin-backup-db').onclick = async (event) => {
        await createBackup('backupDatabase', 'spreadsheet', event.currentTarget);
    };

    document.getElementById('btn-admin-backup-drive').onclick = async (event) => {
        await createBackup('backupDrive', 'drive', event.currentTarget);
    };

    function normalizeSpreadsheetBackupId(value) {
        const input = String(value || '').trim();
        if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
        const match = input.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/);
        return match ? match[1] : '';
    }

    function normalizeDriveBackupId(value) {
        const input = String(value || '').trim();
        if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
        const match = input.match(/(?:\/folders\/|[?&]id=)([a-zA-Z0-9_-]{20,})/);
        return match ? match[1] : '';
    }

    async function restoreBackup(action, resourceType, button) {
        const inputValue = backupResourceInput ? backupResourceInput.value.trim() : '';
        const backupId = resourceType === 'spreadsheet'
            ? normalizeSpreadsheetBackupId(inputValue)
            : normalizeDriveBackupId(inputValue);
        if (!backupId) {
            const expected = resourceType === 'spreadsheet'
                ? 'Introduce un ID o enlace válido de Google Sheets.'
                : 'Introduce un ID o enlace válido de una carpeta de Google Drive.';
            log(`[ADVERTENCIA] ${expected}`, true);
            setBackupResourceHint(expected, true);
            return;
        }

        const confirmation = resourceType === 'spreadsheet'
            ? '¿Estás seguro de que deseas RESTAURAR la base de datos completa? Esto sobreescribirá la información actual de producción.'
            : '¿Estás seguro de que deseas RESTAURAR toda la estructura de Drive? Esto limpiará y sobreescribirá las imágenes actuales en producción.';
        if (!confirm(confirmation)) return;

        setBackupResourceHint(resourceType === 'spreadsheet'
            ? 'Validando el respaldo de Spreadsheet antes de restaurar...'
            : 'Validando el respaldo de Drive antes de restaurar...');
        setBackupButtonBusy(button, true);
        try {
            const response = await runAction(action, { backupId });
            if (!isAdminPanelCurrent_()) return;
            if (response && response.status === 'success') {
                setBackupResourceHint(resourceType === 'spreadsheet'
                    ? 'La restauración de Spreadsheet finalizó. El enlace utilizado se conserva en el campo.'
                    : 'La restauración de Drive finalizó. El enlace utilizado se conserva en el campo.');
            } else {
                setBackupResourceHint('La restauración no fue confirmada. Consulta la consola antes de volver a intentarlo.', true);
            }
        } finally {
            setBackupButtonBusy(button, false);
        }
    }

    document.getElementById('btn-admin-restore-db').onclick = async (event) => {
        setBackupResourceHint('Para restaurar la base de datos, introduce el enlace completo de una Spreadsheet de respaldo.');
        await restoreBackup('restoreDatabase', 'spreadsheet', event.currentTarget);
    };

    document.getElementById('btn-admin-restore-drive').onclick = async (event) => {
        setBackupResourceHint('Para restaurar Drive, introduce el enlace completo de una carpeta de respaldo.');
        await restoreBackup('restoreDrive', 'drive', event.currentTarget);
    };

    const copyBackupResourceLinkButton = document.getElementById('btn-copy-backup-resource-link');
    if (copyBackupResourceLinkButton) {
        copyBackupResourceLinkButton.onclick = async () => {
            const link = backupResourceInput ? backupResourceInput.value.trim() : '';
            if (!link) {
                log('[ADVERTENCIA] No hay ningún enlace para copiar.', true);
                return;
            }
            try {
                await navigator.clipboard.writeText(link);
                log('[SISTEMA] Enlace del respaldo copiado al portapapeles.');
            } catch (error) {
                log(`[ERROR] No se pudo copiar el enlace: ${error.message}`, false, true);
            }
        };
    }

    const openBackupResourceLinkButton = document.getElementById('btn-open-backup-resource-link');
    if (openBackupResourceLinkButton) {
        openBackupResourceLinkButton.onclick = () => {
            const link = backupResourceInput ? backupResourceInput.value.trim() : '';
            const isSpreadsheetLink = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]{20,}/.test(link);
            const isDriveFolderLink = /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]{20,}/.test(link);
            if (!isSpreadsheetLink && !isDriveFolderLink) {
                log('[ADVERTENCIA] Introduce un enlace completo y válido de Spreadsheet o carpeta de Drive.', true);
                return;
            }
            window.open(link, '_blank', 'noopener,noreferrer');
        };
    };

    // Migración de identificadores heredados y habilitación de la columna física VIN.
    const previewVinMigrationButton = document.getElementById('btn-admin-preview-vin-migration');
    const confirmVinMigrationButton = document.getElementById('btn-admin-confirm-vin-migration');
    const vinMigrationStatus = document.getElementById('vin-migration-status');

    function updateVinMigrationControls() {
        const currentBackupId = normalizeSpreadsheetBackupId(backupResourceInput ? backupResourceInput.value : '');
        const backupVerified = Boolean(verifiedDatabaseBackupId && currentBackupId === verifiedDatabaseBackupId);
        if (previewVinMigrationButton) previewVinMigrationButton.disabled = !backupVerified || vinMigrationRunning;
        if (confirmVinMigrationButton) {
            confirmVinMigrationButton.disabled = !backupVerified ||
                !vinMigrationPreview ||
                vinMigrationPreviewBackupId !== verifiedDatabaseBackupId ||
                vinMigrationRunning;
        }
    }

    if (backupResourceInput) {
        backupResourceInput.addEventListener('input', () => {
            verifiedDatabaseBackupId = null;
            vinMigrationPreview = null;
            vinMigrationPreviewBackupId = null;
            if (vinMigrationStatus) {
                vinMigrationStatus.textContent = 'El enlace cambió. Genera un nuevo respaldo de Spreadsheet para habilitar la migración.';
            }
            updateVinMigrationControls();
        });
    }

    if (previewVinMigrationButton) {
        previewVinMigrationButton.onclick = async () => {
            if (vinMigrationRunning) return;
            const currentBackupId = normalizeSpreadsheetBackupId(backupResourceInput ? backupResourceInput.value : '');
            if (!verifiedDatabaseBackupId || currentBackupId !== verifiedDatabaseBackupId) {
                if (vinMigrationStatus) vinMigrationStatus.textContent = 'No hay un respaldo de Spreadsheet verificado en esta sesión.';
                updateVinMigrationControls();
                return;
            }

            vinMigrationRunning = true;
            vinMigrationPreview = null;
            vinMigrationPreviewBackupId = null;
            updateVinMigrationControls();
            if (vinMigrationStatus) vinMigrationStatus.textContent = 'Ejecutando simulación. No se modificarán hojas ni encabezados.';
            try {
                const result = await runAction('migrateCortesOperationIds', { backupId: verifiedDatabaseBackupId });
                if (!result || result.status !== 'success' || result.dryRun !== true) {
                    if (vinMigrationStatus) vinMigrationStatus.textContent = 'La simulación no fue confirmada. Consulta la consola y vuelve a intentarlo.';
                    return;
                }

                vinMigrationPreview = result;
                vinMigrationPreviewBackupId = verifiedDatabaseBackupId;
                const sourceText = Array.isArray(result.sourceColumns) && result.sourceColumns.length
                    ? result.sourceColumns.join(', ')
                    : 'ninguna';
                const summary = 'Simulación completada. Valores heredados detectados: ' + result.sourceCount +
                    '; identificadores únicos: ' + result.uniqueOperationIds +
                    '; nuevos registros por trasladar: ' + result.recordsToMigrate +
                    '; ya presentes: ' + result.alreadyPresent +
                    '; columnas de origen: ' + sourceText +
                    '; hoja de destino: ' + result.targetSheet + '.';
                if (vinMigrationStatus) {
                    vinMigrationStatus.textContent = summary +
                        (result.sourceCount === 0
                            ? ' No se detectaron identificadores heredados; la confirmación preparará la hoja de idempotencia y el encabezado VIN.'
                            : ' La confirmación trasladará los identificadores y verificará sus asociaciones antes de limpiar las columnas de origen.');
                }
                log('[VIN MIGRATION] ' + summary);
            } catch (error) {
                vinMigrationPreview = null;
                vinMigrationPreviewBackupId = null;
                if (vinMigrationStatus) vinMigrationStatus.textContent = 'Error en la simulación: ' + (error.message || String(error));
                log('[VIN MIGRATION] Error en la simulación: ' + (error.message || String(error)), false, true);
            } finally {
                vinMigrationRunning = false;
                updateVinMigrationControls();
            }
        };
    }

    if (confirmVinMigrationButton) {
        confirmVinMigrationButton.onclick = async () => {
            if (vinMigrationRunning || !vinMigrationPreview) return;
            const currentBackupId = normalizeSpreadsheetBackupId(backupResourceInput ? backupResourceInput.value : '');
            if (!verifiedDatabaseBackupId ||
                currentBackupId !== verifiedDatabaseBackupId ||
                vinMigrationPreviewBackupId !== verifiedDatabaseBackupId) {
                if (vinMigrationStatus) vinMigrationStatus.textContent = 'El respaldo verificado o la simulación ya no corresponden. Genera el respaldo y simula nuevamente.';
                vinMigrationPreview = null;
                vinMigrationPreviewBackupId = null;
                updateVinMigrationControls();
                return;
            }

            const plan = vinMigrationPreview;
            const confirmation = 'Se ejecutará la migración VIN sobre la Spreadsheet asociada al respaldo verificado.\n\n' +
                'Hoja de destino: ' + plan.targetSheet + '\n' +
                'Valores heredados detectados: ' + plan.sourceCount + '\n' +
                'Registros nuevos por trasladar: ' + plan.recordsToMigrate + '\n' +
                'Ya presentes: ' + plan.alreadyPresent + '\n' +
                'Columna 43: VIN; columnas 44 y 45: reservadas y vacías.\n\n' +
                'El servidor volverá a validar el estado actual y verificará el destino antes de limpiar el origen. ¿Deseas continuar?';
            if (!confirm(confirmation)) return;

            vinMigrationRunning = true;
            updateVinMigrationControls();
            if (vinMigrationStatus) vinMigrationStatus.textContent = 'Ejecutando migración confirmada. No cierres el panel hasta recibir el resultado.';
            try {
                const result = await runAction('migrateCortesOperationIds', { confirm: true, backupId: verifiedDatabaseBackupId });
                if (!result || result.status !== 'success' || result.dryRun !== false) {
                    if (vinMigrationStatus) vinMigrationStatus.textContent = 'La migración no fue confirmada como completada. Consulta la consola y realiza una nueva simulación antes de reintentar.';
                    vinMigrationPreview = null;
                    vinMigrationPreviewBackupId = null;
                    return;
                }

                const summary = 'Migración confirmada. Registros trasladados: ' + result.migratedCount +
                    '; ya presentes: ' + result.alreadyPresent +
                    '; hoja utilizada: ' + result.targetSheet +
                    '; encabezado VIN: columna ' + result.vinColumn +
                    '; columnas reservadas: ' + result.reservedColumns.join(', ') + '.';
                if (vinMigrationStatus) vinMigrationStatus.textContent = summary;
                log('[VIN MIGRATION] ' + summary);
                vinMigrationPreview = null;
                vinMigrationPreviewBackupId = null;
            } catch (error) {
                vinMigrationPreview = null;
                vinMigrationPreviewBackupId = null;
                if (vinMigrationStatus) vinMigrationStatus.textContent = 'Error durante la migración: ' + (error.message || String(error));
                log('[VIN MIGRATION] Error durante la migración: ' + (error.message || String(error)), false, true);
            } finally {
                vinMigrationRunning = false;
                updateVinMigrationControls();
            }
        };
    }

    updateVinMigrationControls();

    // 5. Mantenimiento y Organización
    // Ejecutar las acciones VIN seleccionadas mediante un único handler.
    const runVinActionsBtn = document.getElementById('btn-admin-run-vin-actions');
    if (runVinActionsBtn) {
        const recalculateVinCheckbox = document.getElementById('recalculate-vin-signatures-checkbox');
        const diagnoseVinCheckbox = document.getElementById('diagnose-vin-signatures-checkbox');
        const vinActionsProgress = document.getElementById('vin-actions-progress');
        const recalculateVinStatus = document.getElementById('vin-recalculate-status');
        const diagnoseVinStatus = document.getElementById('vin-diagnostic-status');

        const setVinStatus = (element, message) => {
            if (element) element.textContent = message;
        };
        const yieldVinUi = () => new Promise(resolve => window.requestAnimationFrame(resolve));

        runVinActionsBtn.onclick = async () => {
            if (runVinActionsBtn.disabled) return;

            const recalculateSelected = Boolean(recalculateVinCheckbox && recalculateVinCheckbox.checked);
            const diagnoseSelected = Boolean(diagnoseVinCheckbox && diagnoseVinCheckbox.checked);

            if (!recalculateSelected && !diagnoseSelected) {
                const message = 'Selecciona al menos una operación de firmas VIN.';
                setVinStatus(vinActionsProgress, message);
                log('[VIN ENGINE] ' + message, true);
                return;
            }

            const controls = [recalculateVinCheckbox, diagnoseVinCheckbox].filter(Boolean);
            runVinActionsBtn.disabled = true;
            controls.forEach(control => { control.disabled = true; });

            setVinStatus(vinActionsProgress, 'Preparando las operaciones seleccionadas...');
            setVinStatus(recalculateVinStatus, recalculateSelected ? 'En espera.' : 'No seleccionada en esta ejecución.');
            setVinStatus(diagnoseVinStatus, diagnoseSelected ? 'En espera.' : 'No seleccionada en esta ejecución.');

            let recalculateFailed = false;
            try {
                if (recalculateSelected) {
                    try {
                        setVinStatus(recalculateVinStatus, 'En curso: validando los datos del catálogo.');
                        setVinStatus(vinActionsProgress, 'Recalculando firmas VIN...');
                        log('[VIN ENGINE] Iniciando recálculo de firmas diferenciales.');
                        await yieldVinUi();

                        const catalogData = getState().catalogData;
                        if (!catalogData || !Array.isArray(catalogData.cortes)) {
                            throw new Error('No hay registros vehiculares válidos en memoria para recalcular las firmas.');
                        }

                        const stats = vinDifferentialEngine.calculateSignatures(catalogData.cortes);
                        setVinStatus(recalculateVinStatus, 'Cálculo completado. Guardando las firmas en el almacenamiento local...');
                        setVinStatus(vinActionsProgress, 'Cálculo terminado; guardando resultados...');
                        await yieldVinUi();

                        const persisted = vinSignatureStore.saveSignatures(vinDifferentialEngine);
                        const summary = 'VIN analizados: ' + stats.totalVinsAnalyzed +
                            '; clasificaciones: ' + stats.totalClassesAnalyzed +
                            '; firmas generadas: ' + stats.signaturesGenerated +
                            '; validadas: ' + stats.validatedCount +
                            '; pendientes: ' + stats.pendingCount +
                            '; insuficientes: ' + stats.insufficientCount +
                            '; conflictos: ' + stats.conflictsCount + '.';

                        if (persisted) {
                            setVinStatus(recalculateVinStatus, 'Completado. ' + summary + ' Persistencia local confirmada.');
                            log('[VIN ENGINE] Recálculo completado. ' + summary + ' Firmas guardadas en almacenamiento local.');
                        } else {
                            setVinStatus(recalculateVinStatus, 'Cálculo completado, pero falló la persistencia local. ' + summary);
                            log('[VIN ENGINE] El cálculo terminó, pero saveSignatures() no confirmó la persistencia. ' + summary, true);
                        }
                    } catch (error) {
                        recalculateFailed = true;
                        setVinStatus(recalculateVinStatus, 'Error: ' + (error && error.message ? error.message : String(error)));
                        log('[VIN ENGINE] Error al recalcular firmas: ' + (error && error.message ? error.message : String(error)), false, true);
                    }
                }

                if (diagnoseSelected) {
                    try {
                        const diagnosticContext = recalculateFailed ? ' El recálculo anterior falló; se inspeccionará el estado actual del mapa en memoria.' : '';
                        setVinStatus(diagnoseVinStatus, 'En curso: inspeccionando las firmas disponibles en memoria.' + diagnosticContext);
                        setVinStatus(vinActionsProgress, 'Ejecutando diagnóstico de firmas VIN...');
                        log('[VIN ENGINE] Iniciando diagnóstico de las firmas disponibles en memoria.' + diagnosticContext, recalculateFailed);
                        await yieldVinUi();

                        const signatures = Array.from(vinDifferentialEngine.signatures.values());
                        const statusCounts = signatures.reduce((counts, signature) => {
                            const status = signature && signature.status ? signature.status : 'sin_estado';
                            counts[status] = (counts[status] || 0) + 1;
                            return counts;
                        }, {});
                        const count = signatures.length;
                        const summary = 'Firmas en memoria: ' + count +
                            '; validadas: ' + (statusCounts.validada || 0) +
                            '; calculadas: ' + (statusCounts.calculada || 0) +
                            '; pendientes de revisión: ' + (statusCounts.pendiente_revision || 0) +
                            '; insuficientes: ' + (statusCounts.insuficiente || 0) +
                            '; sin estado: ' + (statusCounts.sin_estado || 0) + '.';

                        log('[VIN ENGINE] ' + summary);
                        signatures.slice(0, 10).forEach((signature, index) => {
                            log('[FIRMA #' + (index + 1) + '] ' + signature.marca + ' ' + signature.modelo +
                                ' (' + (signature.rangoAnos || 'Rango no disponible') + ') [' +
                                (signature.version || 'Gral') + ']: ' + (signature.signatureString || 'N/A') +
                                ' - Estado: ' + (signature.status || 'sin_estado') +
                                ' - Certeza: ' + (signature.confidence ?? 'N/D') + '%');
                        });

                        const displayed = Math.min(count, 10);
                        setVinStatus(diagnoseVinStatus, 'Completado. ' + summary + ' Se muestran ' + displayed + ' de ' + count + ' firmas.' + (recalculateFailed ? ' El resultado corresponde al estado en memoria después del error de recálculo.' : ''));
                        if (count === 0) {
                            log('[VIN ENGINE] No hay firmas disponibles en memoria para diagnosticar.', true);
                        }
                    } catch (error) {
                        setVinStatus(diagnoseVinStatus, 'Error: ' + (error && error.message ? error.message : String(error)));
                        log('[VIN ENGINE] Error durante el diagnóstico: ' + (error && error.message ? error.message : String(error)), false, true);
                    }
                }

                const recalculateResult = recalculateVinStatus ? recalculateVinStatus.textContent : 'No seleccionada.';
                const diagnoseResult = diagnoseVinStatus ? diagnoseVinStatus.textContent : 'No seleccionada.';
                setVinStatus(vinActionsProgress, 'Operaciones finalizadas. Recalcular: ' + recalculateResult + ' Diagnóstico: ' + diagnoseResult);
            } finally {
                runVinActionsBtn.disabled = false;
                controls.forEach(control => { control.disabled = false; });
            }
        };
    }

    document.getElementById('btn-admin-reorganize-db').onclick = async () => {
        if (confirm("¿Deseas reorganizar y ordenar la base de datos alfabéticamente por Marca? Se generará automáticamente un respaldo preventivo.")) {
            await runAction('reorganizeDatabase');
        }
    };
    document.getElementById('btn-admin-normalize-images').onclick = async () => {
        const continueSaved = confirm("¿Deseas CONTINUAR desde el último punto de progreso guardado?\n\n- Presiona 'Aceptar' para continuar donde terminó.\n- Presiona 'Cancelar' para iniciar desde el principio (Fila 1).");
        await runAction('normalizeImages', { reset: !continueSaved });
    };
    const organizePrimaryImagesButton = document.getElementById('btn-admin-organize-primary-images');
    if (organizePrimaryImagesButton) {
        organizePrimaryImagesButton.onclick = async () => {
            const continueSaved = confirm("¿Deseas CONTINUAR desde el último punto de progreso guardado?\n\n- Presiona 'Aceptar' para continuar donde terminó.\n- Presiona 'Cancelar' para iniciar desde el principio.");
            if (!confirm("Esta operación moverá exclusivamente archivos referenciados por imagenVehiculo. No renombrará archivos, no duplicará imágenes, no modificará URL ni celdas de Spreadsheet y omitirá imágenes compartidas con otros campos. ¿Deseas continuar?")) return;
            await runAction('organizePrimaryVehicleImages', { reset: !continueSaved });
        };
    }
    document.getElementById('btn-admin-restore-trash').onclick = async () => {
        if (confirm("¿Deseas INICIAR el saneamiento y recuperación exhaustiva de imágenes en la papelera?\n\nEsta operación analizará todas las hojas del Spreadsheet, identificará enlaces rotos de Drive y restaurará de la papelera cualquier imagen eliminada. Puede tomar unos minutos.")) {
            await runAction('restoreAllTrashedImages');
        }
    };

    // Vaciar Caché Local de Cliente (IndexedDB/Storage)
    const clearCacheBtn = document.getElementById('btn-admin-clear-client-cache');
    if (clearCacheBtn) {
        clearCacheBtn.onclick = async () => {
            if (confirm("¿Deseas VACIAR la caché local de IndexedDB y localStorage del navegador?\n\nEsto forzará a la aplicación a descargar datos e imágenes frescas desde los microservicios.")) {
                try {
                    log("[SISTEMA] Vaciando IndexedDB y caché local...");
                    if (window.indexedDB) {
                        try {
                            window.indexedDB.deleteDatabase('GPSpedia_DB');
                        } catch (e) {}
                    }
                    localStorage.removeItem('gpsepedia_catalog_cache');
                    localStorage.removeItem('gpsepedia_pending_operation');
                    log("[EXITO] Caché local eliminada correctamente. Recargando la aplicación...");
                    mostrarNotificacion("Caché local vaciada. Recargando...", "success");
                    setTimeout(() => window.location.reload(), 1200);
                } catch (e) {
                    log(`[ERROR] Fallo al vaciar caché local: ${e.message}`, false, true);
                }
            }
        };
    }

    // Ejecutar únicamente las limpiezas seleccionadas, manteniendo separados sus servicios.
    const clearSelectedLogsBtn = document.getElementById('btn-admin-clear-selected-logs');
    if (clearSelectedLogsBtn) {
        clearSelectedLogsBtn.onclick = async () => {
            const clearActivityCheckbox = document.getElementById('clear-activity-logs-checkbox');
            const clearSensitiveCheckbox = document.getElementById('clear-sensitive-logs-checkbox');
            const retentionSelect = document.getElementById('clear-logs-option-select');
            const statusElement = document.getElementById('clear-selected-logs-status');
            const clearActivitySelected = Boolean(clearActivityCheckbox && clearActivityCheckbox.checked);
            const clearSensitiveSelected = Boolean(clearSensitiveCheckbox && clearSensitiveCheckbox.checked);

            if (!clearActivitySelected && !clearSensitiveSelected) {
                const message = "Selecciona al menos una fuente para ejecutar la limpieza.";
                if (statusElement) statusElement.textContent = message;
                log(`[ADVERTENCIA] ${message}`, true);
                mostrarNotificacion(message, 'warning');
                return;
            }

            const keepLastWeek = retentionSelect ? retentionSelect.value === 'week' : true;
            const confirmationDetails = [];
            if (clearActivitySelected) {
                confirmationDetails.push(keepLastWeek
                    ? "• Actividad de usuarios: eliminar únicamente registros con más de 7 días y conservar los últimos 7 días y los encabezados."
                    : "• Actividad de usuarios: limpiar todos los registros de ActividadUsuario y conservar los encabezados.");
            }
            if (clearSensitiveSelected) {
                confirmationDetails.push("• Registro de Logs: eliminar únicamente las filas que coincidan con los patrones de datos confidenciales definidos; conservar encabezados y demás registros.");
            }

            const confirmation = "Se ejecutarán exclusivamente estas operaciones:\n\n" +
                confirmationDetails.join("\n") +
                "\n\nCada fuente se procesará por separado. ¿Deseas continuar?";
            if (!confirm(confirmation)) return;

            const controls = [clearActivityCheckbox, clearSensitiveCheckbox, retentionSelect].filter(Boolean);
            clearSelectedLogsBtn.disabled = true;
            controls.forEach(control => { control.disabled = true; });

            const outcomes = [];
            try {
                if (clearActivitySelected) {
                    try {
                        const result = await clearActivityLogs(keepLastWeek, getDeveloperSessionPayload());
                        if (!isAdminPanelCurrent_()) return;
                        if (result && result.status && result.status !== 'success') {
                            throw new Error(result.message || "La operación no terminó correctamente.");
                        }
                        const message = result && result.message ? result.message : "Operación finalizada.";
                        outcomes.push({ label: "Actividad de usuarios", success: true, message });
                        log(`[EXITO] Actividad de usuarios: ${message}`);
                    } catch (error) {
                        if (!isAdminPanelCurrent_()) return;
                        outcomes.push({ label: "Actividad de usuarios", success: false, message: error.message });
                        log(`[EXCEPCION] Error al limpiar ActividadUsuario: ${error.message}`, false, true);
                    }
                }

                if (clearSensitiveSelected) {
                    try {
                        const result = await clearSensitiveLogs(getDeveloperSessionPayload());
                        if (!isAdminPanelCurrent_()) return;
                        if (result && result.status && result.status !== 'success') {
                            throw new Error(result.message || "La operación no terminó correctamente.");
                        }
                        const message = result && result.message ? result.message : "Operación finalizada.";
                        outcomes.push({ label: "Registro de Logs", success: true, message });
                        log(`[EXITO] Registro de Logs: ${message}`);
                    } catch (error) {
                        if (!isAdminPanelCurrent_()) return;
                        outcomes.push({ label: "Registro de Logs", success: false, message: error.message });
                        log(`[EXCEPCION] Error al limpiar Logs: ${error.message}`, false, true);
                    }
                }

                if (!isAdminPanelCurrent_()) return;
                const succeeded = outcomes.filter(item => item.success).length;
                const failed = outcomes.length - succeeded;
                const summary = outcomes.map(item =>
                    `${item.success ? "Correcto" : "Error"} — ${item.label}: ${item.message}`
                ).join(" | ");
                if (statusElement) statusElement.textContent = summary;
                const notificationType = failed === 0 ? 'success' : (succeeded > 0 ? 'warning' : 'error');
                mostrarNotificacion(summary, notificationType);
            } finally {
                clearSelectedLogsBtn.disabled = false;
                controls.forEach(control => { control.disabled = false; });
            }
        };
    }

    // Botón Agregar corte silencioso
    const silentCutBtn = document.getElementById('btn-admin-add-silent-cut');
    if (silentCutBtn) {
        silentCutBtn.onclick = () => {
            window.location.href = 'add_cortes.html?silent=true';
        };
    }

    // 6. Selección de archivo para Logotipo
    const fileInput = document.getElementById('logo-file-input');
    const fileSpan = document.getElementById('selected-logo-file-name');
    let selectedLogoBase64 = null;
    let selectedLogoFilename = null;

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            selectedLogoFilename = file.name;
            fileSpan.textContent = `Seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedLogoBase64 = e.target.result.split(',')[1]; // Solo la parte de datos base64
            };
            reader.readAsDataURL(file);
        } else {
            selectedLogoBase64 = null;
            selectedLogoFilename = null;
            fileSpan.textContent = "Ningún archivo seleccionado. Formatos soportados: PNG, SVG, WEBP";
        }
    };

    // 7. Registrar Logotipo
    document.getElementById('btn-admin-register-logo').onclick = async () => {
        const brandName = document.getElementById('logo-brand-name-input').value.trim();
        if (!brandName || !selectedLogoBase64) {
            log("[ADVERTENCIA] Por favor completa el nombre del fabricante y selecciona un archivo de imagen.", true);
            return;
        }
        const file = fileInput.files[0];
        const res = await runAction('addLogo', {
            nombreMarca: brandName,
            fileData: selectedLogoBase64,
            filename: selectedLogoFilename,
            mimeType: file.type || "image/png"
        });
        if (res && res.status === 'success') {
            document.getElementById('logo-brand-name-input').value = "";
            fileInput.value = "";
            fileSpan.textContent = "Ningún archivo seleccionado. Formatos soportados: PNG, SVG, WEBP";
            selectedLogoBase64 = null;
            selectedLogoFilename = null;
        }
    };

    // 8. TAREA 2: Repositorio Histórico de Imágenes Reemplazadas y Auditoría de Google Drive
    const viewReplacedBtn = document.getElementById('btn-admin-view-replaced-images');
    if (viewReplacedBtn) {
        viewReplacedBtn.onclick = () => openReplacedImagesModal();
    }

    const auditDriveBtn = document.getElementById('btn-admin-audit-drive-images');
    if (auditDriveBtn) auditDriveBtn.onclick = () => openAuditDriveModal();

    const driveStorageRefreshBtn = document.getElementById('btn-admin-refresh-drive-storage');
    const driveStorageStatus = document.getElementById('drive-storage-monitor-status');
    const driveStorageUsed = document.getElementById('drive-storage-used');
    const driveStorageAccountUsed = document.getElementById('drive-storage-account-used');
    const driveStorageLimit = document.getElementById('drive-storage-limit');
    const driveStorageRemaining = document.getElementById('drive-storage-remaining');
    const driveStoragePercent = document.getElementById('drive-storage-percent');
    const formatStorageBytes = (value) => {
        if (value === null || value === undefined || value === '') return 'No disponible';
        const bytes = Number(value);
        if (!Number.isFinite(bytes) || bytes < 0) return 'No disponible';
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return (bytes / Math.pow(1024, index)).toFixed(index >= 3 ? 2 : 1) + ' ' + units[index];
    };
    const refreshDriveStorage = async () => {
        if (driveStorageRefreshBtn) driveStorageRefreshBtn.disabled = true;
        if (driveStorageStatus) driveStorageStatus.textContent = 'Consultando el almacenamiento global de Google Drive...';
        try {
            const response = await routeAction('getDriveStorage', getDeveloperSessionPayload());
            if (!isAdminPanelCurrent_()) return;
            if (!response || response.status !== 'success') throw new Error(response && response.message ? response.message : 'Respuesta no válida del monitor.');
            if (driveStorageUsed) driveStorageUsed.textContent = formatStorageBytes(response.driveUsedBytes);
            if (driveStorageAccountUsed) driveStorageAccountUsed.textContent = formatStorageBytes(response.accountUsedBytes);
            if (driveStorageLimit) driveStorageLimit.textContent = response.quotaStatus === 'available'
                ? formatStorageBytes(response.limitBytes)
                : (response.quotaStatus === 'unlimited'
                    ? 'Ilimitada'
                    : (response.quotaStatus === 'unlimited_or_not_reported'
                        ? 'Sin límite reportado (posible cuota ilimitada)'
                        : 'No disponible'));
            if (driveStorageRemaining) driveStorageRemaining.textContent = formatStorageBytes(response.remainingBytes);
            if (driveStoragePercent) driveStoragePercent.textContent =
                response.usagePercent !== null && response.usagePercent !== undefined && Number.isFinite(Number(response.usagePercent))
                    ? Number(response.usagePercent).toFixed(2) + '%' : 'No disponible';
            if (driveStorageStatus) driveStorageStatus.textContent = 'Actualizado: ' +
                new Date(response.capturedAt || Date.now()).toLocaleString() + '. Fuente: ' +
                (response.source || 'Google Drive') + '.' + (response.warning ? ' ' + response.warning : '');
        } catch (error) {
            if (driveStorageStatus) driveStorageStatus.textContent = 'No se pudo consultar el almacenamiento global: ' + error.message;
        } finally {
            if (driveStorageRefreshBtn) driveStorageRefreshBtn.disabled = false;
        }
    };
    if (driveStorageRefreshBtn) driveStorageRefreshBtn.onclick = refreshDriveStorage;
    refreshDriveStorage();
}

function getDeveloperSessionPayload() {
    const currentUser = getState().currentUser;
    if (!currentUser || !currentUser.ID || !currentUser.SessionToken) {
        throw new Error("No se encontró una sesión autenticada válida. Vuelve a iniciar sesión.");
    }
    return {
        userId: currentUser.ID,
        sessionToken: currentUser.SessionToken
    };
}

/**
 * TAREA 2: Modal de Gestión y Consulta del Inventario e Historial de Imágenes
 */
export async function openReplacedImagesModal() {
    const requestContext = await ensureUiSessionRole_(['desarrollador']);
    if (!requestContext) return;
    const generation = ++replacedImagesModalGeneration_;
    const isCurrentRequest = () => generation === replacedImagesModalGeneration_ && isCurrentUiSessionContext_(requestContext);
    const modal = document.getElementById('replaced-images-modal');
    if (!modal || !isCurrentRequest()) return;
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('close-replaced-images-modal');
    const listContainer = document.getElementById('replaced-images-list-container');
    const filterInput = document.getElementById('filter-replaced-images-input');
    const refreshBtn = document.getElementById('btn-refresh-replaced-images');
    const listViewBtn = document.getElementById('btn-replaced-view-list');
    const gridViewBtn = document.getElementById('btn-replaced-view-grid');
    const folderSelect = document.getElementById('replaced-images-target-folder');
    const newFolderInput = document.getElementById('replaced-images-new-folder-name');
    const createFolderBtn = document.getElementById('btn-create-replaced-images-folder');
    const folderStatus = document.getElementById('replaced-images-folder-status');
    const lightbox = document.getElementById('replaced-image-lightbox');
    const lightboxContent = document.getElementById('replaced-image-lightbox-content');
    const lightboxImage = document.getElementById('replaced-image-lightbox-image');
    const lightboxTitle = document.getElementById('replaced-image-lightbox-title');
    const lightboxClose = document.getElementById('replaced-image-lightbox-close');

    let cachedReplaced = [];
    let currentView = await offline.getReplacedImagesView();
    if (!isCurrentRequest()) return;
    currentView = currentView === 'list' ? 'list' : 'grid';
    let folders = [];

    const closeLightbox = () => closeReplacedImagesLightbox_();

    const openLightbox = (rep) => {
        if (!isCurrentRequest() || !lightbox || !lightboxImage) return;
        closeLightbox();
        lightboxImage.src = getImageUrl(rep.url_visualizacion || rep.url_anterior || rep.archivo_drive_id, IMG_SIZE_LARGE);
        lightboxImage.alt = rep.nombre_archivo || 'Imagen de Google Drive';
        lightboxImage.onerror = () => {
            lightboxImage.onerror = null;
            lightboxImage.src = 'https://placehold.co/800x600/cccccc/333333?text=Vista+no+disponible';
        };
        lightboxImage.classList.remove('is-zoomed');
        if (lightboxTitle) lightboxTitle.textContent = rep.nombre_archivo || 'Vista ampliada';
        lightbox.style.display = 'flex';
        replacedImagesLightboxKeyHandler_ = (event) => {
            if (event.key === 'Escape') closeLightbox();
        };
        document.addEventListener('keydown', replacedImagesLightboxKeyHandler_);
    };

    if (lightbox) lightbox.onclick = closeLightbox;
    if (lightboxContent) lightboxContent.onclick = (event) => event.stopPropagation();
    if (lightboxImage) lightboxImage.onclick = () => lightboxImage.classList.toggle('is-zoomed');
    if (lightboxClose) lightboxClose.onclick = closeLightbox;

    const loadFolders = async (preferredFolderId = '') => {
        if (!folderSelect) return;
        try {
            const response = await routeAction('getCortesImageFolders', getDeveloperSessionPayload());
            if (!isCurrentRequest()) return;
            folders = Array.isArray(response.folders) ? response.folders : [];
            const previousSelection = preferredFolderId || folderSelect.value;
            folderSelect.innerHTML = '';
            folders.forEach((folder) => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = folder.path;
                folderSelect.appendChild(option);
            });
            const selectionExists = folders.some((folder) => folder.id === previousSelection);
            folderSelect.value = selectionExists ? previousSelection : response.rootFolderId;
            if (folderStatus) folderStatus.textContent = folders.length + ' carpetas disponibles dentro de Cortes.';
        } catch (error) {
            if (!isCurrentRequest()) return;
            if (folderStatus) folderStatus.textContent = 'No se pudieron consultar las carpetas: ' + error.message;
        }
    };

    const loadData = async () => {
        if (listContainer) {
            listContainer.innerHTML = '<div class="replaced-images-empty"><i class="fa-solid fa-spinner fa-spin"></i> Consultando inventario e historial en Spreadsheet...</div>';
        }
        try {
            const response = await routeAction('getReplacedImages', getDeveloperSessionPayload());
            if (!isCurrentRequest()) return;
            cachedReplaced = response && Array.isArray(response.data)
                ? response.data.filter((item) => {
                    const type = item.tipo_registro || (item.origen_registro === 'auditoria_drive' ? 'sin_uso_detectado' : 'reemplazada');
                    const status = String(item.estado || (type === 'sin_uso_detectado' ? 'sin_uso_detectado' : 'historica'));
                    return type === 'sin_uso_detectado'
                        ? status === 'sin_uso_detectado'
                        : type === 'reemplazada' && ['historica', 'restablecida'].includes(status);
                })
                : [];
            renderList(filterInput ? filterInput.value : '');
        } catch (error) {
            if (!isCurrentRequest()) return;
            if (listContainer) listContainer.textContent = 'Error al cargar el inventario e historial: ' + error.message;
        }
    };

    const createActionButton = (icon, label, className, handler, title) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn ' + className + ' replaced-image-action';
        button.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i><span>' + label + '</span>';
        button.title = title || label;
        button.onclick = handler;
        return button;
    };

    const runButtonAction = async (button, busyLabel, operation) => {
        if (!isCurrentRequest()) return;
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>' + busyLabel + '</span>';
        try {
            await operation();
            if (!isCurrentRequest()) return;
        } catch (error) {
            if (isCurrentRequest()) alert(error.message || String(error));
        } finally {
            if (button.isConnected && isCurrentRequest()) {
                button.disabled = false;
                button.innerHTML = original;
            }
        }
    };

    const renderList = (filterText = '') => {
        if (!isCurrentRequest() || !listContainer) return;
        listContainer.innerHTML = '';
        listContainer.className = 'replaced-images-list view-' + currentView;
        const query = String(filterText || '').toLowerCase().trim();
        const filtered = cachedReplaced.filter((item) => {
            if (!query) return true;
            return [
                item.nombre_archivo, item.referencia_texto, item.campo, item.archivo_drive_id,
                item.registro_id, item.ubicacion_actual, item.ubicacion_original, item.origen_registro,
                item.estado_organizacion, item.error_organizacion
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });

        if (!filtered.length) {
            listContainer.innerHTML = '<div class="replaced-images-empty">No hay imágenes sin uso confirmadas en el inventario.</div>';
            return;
        }

        filtered.forEach((rep) => {
            const type = rep.tipo_registro || (rep.origen_registro === 'auditoria_drive' ? 'sin_uso_detectado' : 'reemplazada');
            const isUnused = type === 'sin_uso_detectado';
            const status = String(rep.estado || (isUnused ? 'sin_uso_detectado' : 'historica'));
            const statusLabel = isUnused
                ? (status === 'sin_uso_detectado' ? 'Sin uso detectado' : status.replace(/_/g, ' '))
                : (status === 'historica' ? 'Reemplazada' : status.replace(/_/g, ' '));
            const canManage = isUnused
                ? status === 'sin_uso_detectado'
                : ['historica', 'restablecida'].includes(status);
            const card = document.createElement('article');
            card.className = 'replaced-image-card' + (currentView === 'list' ? ' replaced-image-card-list' : '');

            if (currentView === 'grid') {
                const previewButton = document.createElement('button');
                previewButton.type = 'button';
                previewButton.className = 'replaced-image-preview';
                previewButton.title = 'Ver imagen ampliada';
                previewButton.setAttribute('aria-label', 'Ver ' + (rep.nombre_archivo || 'imagen') + ' en tamaño ampliado');
                const image = document.createElement('img');
                image.src = getImageUrl(rep.url_visualizacion || rep.url_anterior || rep.archivo_drive_id, IMG_SIZE_MEDIUM);
                image.alt = rep.nombre_archivo || 'Imagen de Drive';
                image.loading = 'lazy';
                image.onerror = () => {
                    image.onerror = null;
                    image.src = 'https://placehold.co/400x300/cccccc/333333?text=Vista+no+disponible';
                };
                previewButton.appendChild(image);
                previewButton.onclick = () => openLightbox(rep);
                card.appendChild(previewButton);
            } else {
                const fileIcon = document.createElement('button');
                fileIcon.type = 'button';
                fileIcon.className = 'replaced-image-list-icon';
                fileIcon.title = 'Ver imagen ampliada';
                fileIcon.setAttribute('aria-label', 'Ver ' + (rep.nombre_archivo || 'imagen') + ' en tamaño ampliado');
                fileIcon.innerHTML = '<i class="fa-solid fa-file-image" aria-hidden="true"></i>';
                fileIcon.onclick = () => openLightbox(rep);
                card.appendChild(fileIcon);
            }

            const info = document.createElement('div');
            info.className = 'replaced-image-info';
            const title = document.createElement('strong');
            title.className = 'replaced-image-name';
            title.textContent = rep.nombre_archivo || (isUnused ? 'Imagen sin uso detectado' : (rep.referencia_texto || 'Imagen reemplazada'));
            const typeLabel = document.createElement('span');
            typeLabel.className = 'replaced-image-type ' + (isUnused ? 'is-unused' : 'is-replaced');
            typeLabel.textContent = isUnused ? 'Sin uso detectado' : 'Reemplazada';
            const details = document.createElement('span');
            details.className = 'replaced-image-details';
            details.textContent = 'ID Drive: ' + (rep.archivo_drive_id || 'No disponible') +
                (rep.tipo_mime ? ' · ' + rep.tipo_mime : '') +
                (rep.campo ? ' · Campo: ' + rep.campo : '');
            const location = document.createElement('span');
            location.className = 'replaced-image-details';
            location.textContent = 'Ubicación: ' + (rep.ubicacion_actual || rep.ubicacion_original || 'No disponible');
            const dateDetails = document.createElement('span');
            dateDetails.className = 'replaced-image-details';
            dateDetails.textContent = (isUnused
                ? 'Detectada: ' + (rep.fecha_deteccion || 'Fecha no disponible') + ' · Creada: ' + (rep.fecha_creacion_drive || 'Fecha no disponible')
                : 'Reemplazada: ' + (rep.fecha_reemplazo || 'Fecha no disponible') + (rep.referencia_texto ? ' · Referencia: ' + rep.referencia_texto : ''));
            const statusText = document.createElement('span');
            statusText.className = 'replaced-image-status';
            statusText.textContent = 'Estado: ' + statusLabel;
            const organizationDetails = document.createElement('span');
            organizationDetails.className = 'replaced-image-details';
            const organizationStatus = String(rep.estado_organizacion || '');
            const organizationError = String(rep.error_organizacion || '');
            const organizationLabels = {
                organizada: 'Organizada en Imagenes_Sin_Uso',
                movida_manual: 'Movida manualmente',
                pendiente: 'Pendiente de organización',
                error: 'Error de organización',
                bloqueada: 'Organización bloqueada',
                no_confirmada: 'No confirmada'
            };
            organizationDetails.textContent = 'Organización: ' +
                (organizationLabels[organizationStatus] || organizationStatus || 'No registrada') +
                (organizationError ? ' · ' + organizationError : '');
            if (organizationError) statusText.title = organizationError;
            if (currentView === 'list') {
                info.append(title, statusText);
            } else {
                info.append(title, typeLabel, details, location, dateDetails, statusText);
                if (isUnused) info.append(organizationDetails);
            }
            card.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'replaced-image-actions';

            const downloadButton = createActionButton('fa-download', 'Descargar', 'btn-secondary', async () => {
                await runButtonAction(downloadButton, 'Preparando...', async () => {
                    const response = await routeAction('getReplacedImageDownloadUrl', {
                        ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo
                    });
                    if (!isCurrentRequest()) return;
                    const anchor = document.createElement('a');
                    anchor.href = response.downloadUrl;
                    anchor.rel = 'noopener noreferrer';
                    anchor.download = response.fileName || rep.nombre_archivo || '';
                    document.body.appendChild(anchor);
                    anchor.click();
                    anchor.remove();
                    mostrarNotificacion('Se abrió la descarga de ' + (response.fileName || rep.nombre_archivo || 'la imagen') + '.', 'success');
                });
            });
            downloadButton.disabled = !(isUnused ? status === 'sin_uso_detectado' : ['historica', 'restablecida'].includes(status));
            actions.appendChild(downloadButton);

            const moveButton = createActionButton('fa-folder-open', 'Mover', 'btn-secondary', async () => {
                if (!folderSelect || !folderSelect.value) {
                    alert('No hay una carpeta destino seleccionada.');
                    return;
                }
                const selectedOption = folderSelect.options[folderSelect.selectedIndex];
                const targetName = selectedOption ? selectedOption.textContent : 'la carpeta seleccionada';
                if (!confirm('¿Mover "' + (rep.nombre_archivo || 'esta imagen') + '" a "' + targetName + '"?')) return;
                await runButtonAction(moveButton, 'Moviendo...', async () => {
                    const response = await routeAction('moveReplacedImage', {
                        ...getDeveloperSessionPayload(),
                        id_reemplazo: rep.id_reemplazo,
                        targetFolderId: folderSelect.value
                    });
                    if (!isCurrentRequest()) return;
                    mostrarNotificacion(response.message || 'Imagen movida correctamente.', 'success');
                    await loadData();
                });
            });
            moveButton.disabled = !canManage;
            actions.appendChild(moveButton);

            if (!isUnused && status !== 'cancelada') {
                const recoverButton = createActionButton('fa-clock-rotate-left', 'Restaurar', 'btn-primary', async () => {
                    if (!confirm('¿Restaurar esta imagen al campo ' + (rep.campo || 'registrado') + '? La imagen actualmente activa pasará al historial.')) return;
                    await runButtonAction(recoverButton, 'Restaurando...', async () => {
                        const response = await routeAction('recoverReplacedImage', {
                            ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo
                        });
                        if (!isCurrentRequest()) return;
                        mostrarNotificacion(response.message || 'Imagen histórica restablecida.', 'success');
                        await loadData();
                    });
                });
                actions.appendChild(recoverButton);
            }

            const deleteButton = createActionButton('fa-trash', 'Enviar a papelera', 'btn-danger', async () => {
                const description = isUnused
                    ? '¿Enviar esta imagen sin uso a la papelera de Google Drive?'
                    : '¿Enviar esta imagen reemplazada a la papelera de Google Drive? La restauración histórica dejará de estar disponible mientras permanezca allí.';
                if (!confirm(description + ' El servidor volverá a validar las referencias y la ubicación.')) return;
                await runButtonAction(deleteButton, 'Enviando...', async () => {
                    const response = await routeAction('deleteReplacedImage', {
                        ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo
                    });
                    if (!isCurrentRequest()) return;
                    mostrarNotificacion(response.message || 'Imagen enviada a papelera.', 'success');
                    await loadData();
                });
            });
            deleteButton.disabled = !canManage;
            actions.appendChild(deleteButton);

            card.appendChild(actions);
            listContainer.appendChild(card);
        });
    };

    const setView = async (view) => {
        currentView = view;
        if (listViewBtn) listViewBtn.setAttribute('aria-pressed', String(view === 'list'));
        if (gridViewBtn) gridViewBtn.setAttribute('aria-pressed', String(view === 'grid'));
        await offline.saveReplacedImagesView(view);
        if (!isCurrentRequest()) return;
        renderList(filterInput ? filterInput.value : '');
    };

    if (closeBtn) closeBtn.onclick = () => {
        replacedImagesModalGeneration_ += 1;
        cachedReplaced = [];
        folders = [];
        closeLightbox();
        if (listContainer) listContainer.replaceChildren();
        modal.style.display = 'none';
    };
    if (filterInput) filterInput.oninput = () => renderList(filterInput.value);
    if (refreshBtn) refreshBtn.onclick = () => { loadData(); loadFolders(); };
    if (listViewBtn) listViewBtn.onclick = () => setView('list');
    if (gridViewBtn) gridViewBtn.onclick = () => setView('grid');

    if (createFolderBtn) createFolderBtn.onclick = async () => {
        const name = newFolderInput ? newFolderInput.value.trim() : '';
        if (!name) {
            alert('Escribe el nombre de la nueva carpeta.');
            return;
        }
        await runButtonAction(createFolderBtn, 'Creando...', async () => {
            const response = await routeAction('createCortesImageFolder', {
                ...getDeveloperSessionPayload(),
                name: name,
                parentFolderId: folderSelect ? folderSelect.value : ''
            });
            if (!isCurrentRequest()) return;
            if (newFolderInput) newFolderInput.value = '';
            await loadFolders(response.folderId);
            if (!isCurrentRequest()) return;
            mostrarNotificacion('Carpeta creada: ' + response.folderPath, 'success');
        });
    };

    if (lightbox) lightbox.style.display = 'none';
    await setView(currentView);
    await loadFolders();
    await loadData();
}

/**
 * TAREA 2: Modal de Auditoría de Imágenes en Google Drive (Árbol 'Cortes')
 */
export async function openAuditDriveModal() {
    const requestContext = await ensureUiSessionRole_(['desarrollador']);
    if (!requestContext) return;
    const cleared = await processPendingDriveAuditClears_();
    if (cleared !== true) {
        showGlobalError('No se pudo limpiar el estado de auditoría anterior. El historial no se abrirá para evitar mezclar cuentas.');
        return;
    }
    if (typeof offline.hasPendingDriveAuditClear === 'function' &&
        offline.hasPendingDriveAuditClear(requestContext.userId)) {
        const ownerCleared = await offline.clearDriveAuditState(requestContext.userId);
        if (ownerCleared !== true) {
            showGlobalError('La limpieza pendiente de esta cuenta no pudo completarse. El historial permanecerá bloqueado.');
            return;
        }
    }
    if (!isCurrentUiSessionContext_(requestContext)) return;
    const generation = ++auditDriveModalGeneration_;
    const panelGeneration = adminPanelGeneration_;
    const isCurrentRequest = () => generation === auditDriveModalGeneration_ &&
        panelGeneration === adminPanelGeneration_ && isCurrentUiSessionContext_(requestContext);
    const modal = document.getElementById('audit-drive-modal');
    if (!modal || !isCurrentRequest()) return;
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('close-audit-drive-modal');
    const summaryEl = document.getElementById('audit-drive-summary');
    const container = document.getElementById('audit-drive-results-container');
    const auditButton = document.getElementById('btn-admin-audit-drive-images');
    const startButton = document.getElementById('btn-audit-drive-start');
    const resumeButton = document.getElementById('btn-audit-drive-resume');
    if (!summaryEl || !container) return;
    if (closeBtn) closeBtn.onclick = () => {
        auditDriveModalGeneration_ += 1;
        modal.style.display = 'none';
    };

    summaryEl.innerHTML = `
        <div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--border-color); display:flex; gap:15px; flex-wrap:wrap;">
            <span>📁 <strong>Carpeta raíz:</strong> <span id="audit-root-name">Cortes</span> (<code id="audit-root-id"></code>)</span>
            <span>📊 <strong>Total analizados:</strong> <span id="audit-total-count">0</span></span>
            <span>📂 <strong>Carpetas recorridas:</strong> <span id="audit-folder-count">0</span></span>
            <span>🔁 <strong>Lotes recibidos:</strong> <span id="audit-batch-count">0</span></span>
            <span>⏳ <strong>Carpetas en pila de continuación:</strong> <span id="audit-pending-folder-count">0</span></span>
            <span style="color:#28a745;">✅ <strong>En uso:</strong> <span id="audit-in-use-count">0</span></span>
            <span style="color:#007bff;">🕒 <strong>Históricas:</strong> <span id="audit-historical-count">0</span></span>
            <span style="color:#ffc107;">⚠️ <strong>Sin uso:</strong> <span id="audit-unused-count">0</span></span>
            <span style="color:#dc3545;">❓ <strong>No verificables:</strong> <span id="audit-unverified-count">0</span></span>
            <span><strong>Referencias no interpretables:</strong> <span id="audit-unknown-references">0</span></span>
            <span id="audit-status" style="font-weight:600;">Recuperando el estado local...</span>
        </div>
    `;

    const auditStatusEl = document.getElementById('audit-status');
    const auditTotalEl = document.getElementById('audit-total-count');
    const auditRootNameEl = document.getElementById('audit-root-name');
    const auditRootIdEl = document.getElementById('audit-root-id');
    const auditFolderCountEl = document.getElementById('audit-folder-count');
    const auditBatchCountEl = document.getElementById('audit-batch-count');
    const auditPendingFolderCountEl = document.getElementById('audit-pending-folder-count');
    const allFiles = [];
    let cursor = null;
    let complete = false;
    let totalAnalyzed = 0;
    let foldersVisited = 0;
    let batches = 0;
    let lastBatchAnalyzed = 0;
    let unverifiableReferences = 0;
    let rootFolderName = 'Cortes';
    let rootFolderId = '';
    let resumeUnavailable = false;
    let inventoryStatus = '';
    let inventoryMessage = '';
    let savedState = null;
    let isRunning = false;

    const appendFiles = (files) => {
        if (!isCurrentRequest()) return;
        files.filter(file => file.classification === 'Histórica' || file.classification === 'Sin uso detectado')
            .forEach(file => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px; border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem; background:var(--card-bg);";
            const info = document.createElement('div');
            info.style.cssText = "min-width:0; flex:1;";
            const name = document.createElement('div');
            name.style.cssText = "font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
            name.textContent = file.fileName || 'Archivo sin nombre';
            const details = document.createElement('div');
            details.style.cssText = "font-size:0.75rem; color:var(--text-disabled);";
            details.textContent = (file.folderPath || '') + ' | ' +
                ((Number(file.size) || 0) / 1024).toFixed(1) + ' KB | ' +
                (file.lastUpdated || 'Fecha no disponible');
            info.appendChild(name);
            info.appendChild(details);
            const badge = document.createElement('span');
            badge.style.cssText = "padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem; white-space:nowrap;";
            const badgeColors = {
                'En uso': '#28a745',
                'Histórica': '#007bff',
                'Sin uso detectado': '#e0a800',
                'No verificable': '#dc3545'
            };
            badge.style.backgroundColor = badgeColors[file.classification] || '#6c757d';
            badge.style.color = '#fff';
            badge.textContent = file.classification || 'No verificable';
            row.appendChild(info);
            row.appendChild(badge);
            container.appendChild(row);
        });
    };

    const updateSummary = (statusText) => {
        if (!isCurrentRequest()) return;
        const counts = {
            inUse: allFiles.filter(file => file.classification === 'En uso').length,
            historical: allFiles.filter(file => file.classification === 'Histórica').length,
            unused: allFiles.filter(file => file.classification === 'Sin uso detectado').length,
            unverified: allFiles.filter(file => file.classification === 'No verificable').length
        };
        if (auditTotalEl) auditTotalEl.textContent = String(totalAnalyzed);
        if (auditFolderCountEl) auditFolderCountEl.textContent = String(foldersVisited);
        if (auditBatchCountEl) auditBatchCountEl.textContent = String(batches);
        if (auditPendingFolderCountEl) {
            auditPendingFolderCountEl.textContent = String(cursor && Array.isArray(cursor.stack) ? cursor.stack.length : 0);
        }
        if (auditRootNameEl) auditRootNameEl.textContent = rootFolderName;
        if (auditRootIdEl) auditRootIdEl.textContent = rootFolderId;
        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = String(value);
        };
        setText('audit-in-use-count', counts.inUse);
        setText('audit-historical-count', counts.historical);
        setText('audit-unused-count', counts.unused);
        setText('audit-unverified-count', counts.unverified);
        setText('audit-unknown-references', unverifiableReferences);
        if (auditStatusEl) auditStatusEl.textContent = statusText || '';
    };

    const persistState = async (status, extra = {}) => {
        if (!isCurrentRequest()) throw new Error('La sesión cambió; se detuvo la persistencia de la auditoría.');
        const state = {
            files: allFiles,
            cursor: cursor,
            complete: complete,
            status: status,
            totalAnalyzed: totalAnalyzed,
            foldersVisited: foldersVisited,
            batches: batches,
            lastBatchAnalyzed: lastBatchAnalyzed,
            unverifiableReferences: unverifiableReferences,
            rootFolderName: rootFolderName,
            rootFolderId: rootFolderId,
            resumeUnavailable: resumeUnavailable,
            inventoryStatus: inventoryStatus,
            inventoryMessage: inventoryMessage,
            lastError: ''
        };
        Object.assign(state, extra);
        const saved = await offline.saveDriveAuditState(state, requestContext.userId);
        if (!isCurrentRequest()) {
            await offline.clearDriveAuditState(requestContext.userId);
            throw new Error('La sesión cambió; se eliminó el estado de auditoría de la cuenta anterior.');
        }
        if (!saved) throw new Error('IndexedDB no confirmó la persistencia del progreso de auditoría.');
    };

    const saveUnusedInventory = async (alreadyRunning = false) => {
        if (!isCurrentRequest() || inventoryStatus === 'saved') return;
        if (isDriveAuditRunning && !alreadyRunning) return;

        const ownsRun = !alreadyRunning;
        if (ownsRun) {
            isRunning = true;
            isDriveAuditRunning = true;
            updateControls();
        }

        inventoryStatus = 'pending';
        inventoryMessage = 'Auditoría completa. Registrando las imágenes sin uso en la Spreadsheet...';
        let localPersistenceWarning = '';
        try {
            await persistState('complete');
            if (!isCurrentRequest()) return;
        } catch (storageError) {
            if (!isCurrentRequest()) return;
            localPersistenceWarning = ' No se pudo guardar localmente el estado previo al registro: ' + storageError.message;
        }

        const unusedFiles = allFiles
            .filter(file => file.classification === 'Sin uso detectado')
            .map(file => ({ fileId: file.fileId, folderId: file.folderId }));

        try {
            const inventoryResult = await routeAction('saveUnusedImagesInventory', {
                ...getDeveloperSessionPayload(),
                files: unusedFiles
            });
            if (!isCurrentRequest()) return;
            if (!inventoryResult || inventoryResult.status !== 'success' || !inventoryResult.auditId) {
                throw new Error(inventoryResult && inventoryResult.message
                    ? inventoryResult.message
                    : 'El servicio no confirmó la actualización del inventario.');
            }

            let movedCount = 0;
            let alreadyOrganizedCount = 0;
            let failedCount = 0;
            let blockedCount = 0;
            const organizationBatchSize = 20;

            for (let offset = 0; offset < unusedFiles.length; offset += organizationBatchSize) {
                const batch = unusedFiles.slice(offset, offset + organizationBatchSize)
                    .map(file => ({ fileId: file.fileId }));
                const organizationResult = await routeAction('saveUnusedImagesInventory', {
                    ...getDeveloperSessionPayload(),
                    mode: 'organize',
                    auditId: inventoryResult.auditId,
                    files: batch
                });
                if (!isCurrentRequest()) return;
                if (!organizationResult || organizationResult.status !== 'success') {
                    throw new Error(organizationResult && organizationResult.message
                        ? organizationResult.message
                        : 'ADMIN no confirmó el lote de organización ' + (Math.floor(offset / organizationBatchSize) + 1) + '.');
                }
                movedCount += Math.max(0, Number(organizationResult.movedCount) || 0);
                alreadyOrganizedCount += Math.max(0, Number(organizationResult.alreadyOrganizedCount) || 0);
                failedCount += Math.max(0, Number(organizationResult.failedCount) || 0);
                blockedCount += Math.max(0, Number(organizationResult.blockedCount) || 0);
                inventoryMessage = 'Inventario registrado. Organización: ' + movedCount + ' movidas, ' +
                    alreadyOrganizedCount + ' ya organizadas, ' + failedCount + ' fallidas y ' + blockedCount + ' bloqueadas.';
                await persistState('complete');
            if (!isCurrentRequest()) return;
            }

            inventoryStatus = 'saved';
            inventoryMessage = 'Auditoría COMPLETA. ' + inventoryResult.savedCount +
                ' imágenes sin uso registradas; ' + movedCount + ' trasladadas a Imagenes_Sin_Uso, ' +
                alreadyOrganizedCount + ' ya estaban allí, ' + failedCount + ' con error y ' +
                blockedCount + ' bloqueadas. Revisa el detalle de organización en el inventario.';
        } catch (inventoryError) {
            if (!isCurrentRequest()) return;
            inventoryStatus = 'error';
            inventoryMessage = 'Auditoría COMPLETA, pero el registro u organización del inventario quedó parcial: ' +
                inventoryError.message + '. Puedes volver a ejecutar la actualización; los movimientos confirmados no se repetirán.';
        }

        try {
            await persistState('complete');
            if (!isCurrentRequest()) return;
        } catch (storageError) {
            localPersistenceWarning += ' No se pudo confirmar el guardado local del resultado de inventario: ' +
                storageError.message;
        }
        updateSummary(inventoryMessage + localPersistenceWarning);

        if (ownsRun && isCurrentRequest()) {
            isRunning = false;
            isDriveAuditRunning = false;
            updateControls();
        }
    };

    const updateControls = () => {
        if (!isCurrentRequest()) return;
        const hasResumableCursor = !complete && !!cursor && !resumeUnavailable;
        if (startButton) startButton.disabled = isRunning || isDriveAuditRunning;
        if (resumeButton) {
            resumeButton.hidden = !hasResumableCursor;
            resumeButton.disabled = isRunning || isDriveAuditRunning || !hasResumableCursor;
        }
        if (auditButton) auditButton.disabled = isRunning || isDriveAuditRunning;
    };

    const restoreState = (state) => {
        if (!isCurrentRequest()) return;
        allFiles.length = 0;
        if (Array.isArray(state.files)) allFiles.push(...state.files);
        cursor = state.cursor || null;
        complete = state.complete === true;
        totalAnalyzed = Math.max(0, Number(state.totalAnalyzed) || allFiles.length);
        foldersVisited = Math.max(0, Number(state.foldersVisited) || 0);
        batches = Math.max(0, Number(state.batches) || 0);
        lastBatchAnalyzed = Math.max(0, Number(state.lastBatchAnalyzed) || 0);
        unverifiableReferences = Math.max(0, Number(state.unverifiableReferences) || 0);
        rootFolderName = state.rootFolderName || 'Cortes';
        rootFolderId = state.rootFolderId || '';
        resumeUnavailable = state.resumeUnavailable === true;
        inventoryStatus = state.inventoryStatus || '';
        inventoryMessage = state.inventoryMessage || '';
        savedState = state;
        container.innerHTML = '';
        appendFiles(allFiles);
        const previousError = state.lastError ? ' Último error: ' + state.lastError : '';
        updateSummary(
            complete
                ? (inventoryMessage || 'Auditoría completa recuperada desde el almacenamiento local.')
                : (resumeUnavailable
                    ? 'Se conservaron los resultados parciales, pero el cursor ya no está disponible. Inicia una auditoría nueva para completar el recorrido.' + previousError
                    : (cursor
                        ? 'Auditoría parcial recuperada. Puedes continuar desde el cursor guardado.' + previousError
                        : 'Hay resultados parciales guardados, pero no existe un cursor para continuarlos. Inicia una auditoría nueva.' + previousError))
        );
    };

    const runAudit = async (resume) => {
        if (!isCurrentRequest() || isRunning || isDriveAuditRunning) return;
        isRunning = true;
        isDriveAuditRunning = true;
        updateControls();

        try {
            if (resume) {
                if (!cursor || resumeUnavailable) throw new Error('No existe un cursor disponible para reanudar la auditoría.');
                complete = false;
            } else {
                allFiles.length = 0;
                container.innerHTML = '';
                cursor = null;
                complete = false;
                totalAnalyzed = 0;
                foldersVisited = 0;
                batches = 0;
                lastBatchAnalyzed = 0;
                unverifiableReferences = 0;
                rootFolderName = 'Cortes';
                rootFolderId = '';
                resumeUnavailable = false;
                inventoryStatus = '';
                inventoryMessage = '';
                savedState = null;
                updateSummary('Preparando una auditoría nueva...');
                await persistState('running');
                if (!isCurrentRequest()) return;
            }

            const seenCursorSignatures = new Set();
            if (cursor) seenCursorSignatures.add(JSON.stringify(cursor));

            while (!complete && isCurrentRequest()) {
                const previousTotal = totalAnalyzed;
                const previousFolders = foldersVisited;
                const response = await routeAction('auditDriveImagesInCortes', {
                    ...getDeveloperSessionPayload(),
                    cursor: cursor
                });
                if (!isCurrentRequest()) return;

                if (!response || response.status !== 'success' || !Array.isArray(response.files)) {
                    throw new Error(response && response.message ? response.message : 'Respuesta inválida del servicio de auditoría.');
                }

                const batchSize = response.files.length;
                const expectedTotal = allFiles.length + batchSize;
                const reportedBatch = Number(response.batchAnalyzed);
                const reportedTotal = Number(response.totalAnalyzed);
                if (!Number.isInteger(reportedBatch) || reportedBatch !== batchSize) {
                    throw new Error('El contador batchAnalyzed no coincide con la cantidad de archivos recibidos o no es válido.');
                }
                if (!Number.isInteger(reportedTotal) || reportedTotal !== expectedTotal) {
                    throw new Error('El total acumulado informado por ADMIN (' + response.totalAnalyzed +
                        ') no coincide con los resultados recibidos (' + expectedTotal + ').');
                }
                if (typeof response.complete !== 'boolean') {
                    throw new Error('ADMIN no devolvió un indicador booleano válido de finalización de la auditoría.');
                }

                allFiles.push(...response.files);
                batches++;
                lastBatchAnalyzed = batchSize;
                totalAnalyzed = reportedTotal;
                foldersVisited = Math.max(0, Number(response.foldersVisited) || 0);
                unverifiableReferences = Math.max(unverifiableReferences, Number(response.unverifiableReferenceCount) || 0);
                if (response.rootFolderName) rootFolderName = response.rootFolderName;
                if (response.rootFolderId) rootFolderId = response.rootFolderId;
                complete = response.complete === true;
                cursor = response.cursor || null;

                if (complete && cursor) {
                    throw new Error('ADMIN marcó la auditoría como completa, pero también devolvió un cursor pendiente.');
                }
                if (!complete && !cursor) {
                    throw new Error('El servicio devolvió un resultado parcial sin cursor de continuación.');
                }
                if (!complete) {
                    const signature = JSON.stringify(cursor);
                    if (seenCursorSignatures.has(signature) &&
                        totalAnalyzed === previousTotal && foldersVisited <= previousFolders) {
                        throw new Error('El cursor de Drive se repitió sin aumentar los archivos analizados ni las carpetas recorridas.');
                    }
                    seenCursorSignatures.add(signature);
                }

                appendFiles(response.files);
                updateSummary(complete
                    ? 'Recorrido del árbol finalizado. Verificando el inventario...'
                    : 'Auditoría en progreso: ' + totalAnalyzed + ' archivos analizados; lote actual: ' + batchSize + '.');

                await persistState(complete ? 'complete' : 'running');
                if (!isCurrentRequest()) return;
            }

            if (!allFiles.some(file => file.classification === 'Histórica' || file.classification === 'Sin uso detectado')) {
                container.textContent = 'No se encontraron imágenes sin uso confirmadas en el árbol «Cortes».';
            }
            await saveUnusedInventory(true);
        } catch (error) {
            if (!isCurrentRequest()) return;
            const errorMessage = error && error.message ? error.message : String(error);
            const cursorExpired = !complete &&
                /estado temporal.*(expir|disponible)|falta un bloque|estado temporal.*incompleto|inicia una auditoría nueva/i.test(errorMessage);
            resumeUnavailable = cursorExpired;
            let statusMessage = complete
                ? 'AUDITORÍA COMPLETA: se conservaron ' + allFiles.length +
                    ' resultados, pero ocurrió un error al guardar el estado local. Detalle: ' + errorMessage
                : (cursorExpired
                    ? 'AUDITORÍA PARCIAL: el cursor temporal de ADMIN expiró o dejó de estar disponible. Se conservaron los resultados locales; inicia una auditoría nueva para completar el árbol. Detalle: ' + errorMessage
                    : 'AUDITORÍA PARCIAL: se conservaron ' + allFiles.length + ' resultados. ' +
                        (cursor ? 'Puedes intentar continuar con el cursor guardado. ' : 'No hay cursor de continuación disponible. ') +
                        'Detalle: ' + errorMessage);
            try {
                await persistState(complete ? 'complete' : 'partial', { lastError: errorMessage });
            } catch (persistenceError) {
                statusMessage += ' Además, no se pudo guardar el último estado local: ' + persistenceError.message;
            }
            updateSummary(statusMessage);
        } finally {
            if (isCurrentRequest()) {
                isRunning = false;
                isDriveAuditRunning = false;
                updateControls();
            }
        }
    };

    if (startButton) startButton.onclick = () => runAudit(false);
    if (resumeButton) resumeButton.onclick = () => runAudit(true);

    try {
        savedState = await offline.getDriveAuditState(requestContext.userId);
        if (!isCurrentRequest()) return;
    } catch (storageError) {
        savedState = null;
    }

    if (!isCurrentRequest()) return;
    if (savedState) {
        restoreState(savedState);
        updateControls();
        if (isDriveAuditRunning) {
            updateSummary('La auditoría continúa ejecutándose en esta sesión; no inicies otra solicitud.');
        } else if (complete && inventoryStatus !== 'saved') {
            await saveUnusedInventory(false);
            if (!isCurrentRequest()) return;
        }
    } else {
        if (!isCurrentRequest()) return;
        container.innerHTML = '';
        updateSummary('No existe un inventario local guardado. Iniciando auditoría nueva...');
        await runAudit(false);
    }
}

export const openAboutUs = setupModal('about-us-modal', () => {
    document.getElementById('about-us-modal').style.display = 'flex';
});

export const openChangeLog = setupModal('changelog-modal', () => {
    document.getElementById('changelog-modal').style.display = 'flex';
});

export const openContact = setupModal('contact-modal', () => {
    document.getElementById('contact-modal').style.display = 'flex';
});

export const openFAQ = setupModal('faq-modal', () => {
    document.getElementById('faq-modal').style.display = 'flex';
});

export const openTermsAgreement = setupModal('terms-agreement-modal', () => {
    document.getElementById('terms-agreement-modal').style.display = 'flex';
});

export function renderInboxList(items) {
    const listContainer = document.getElementById('inbox-list');
    if (!listContainer) return;
    const context = getUiSessionContext_();
    const generation = inboxViewGeneration_;
    const isCurrentInboxView = () => Boolean(context &&
        generation === inboxViewGeneration_ &&
        isCurrentUiSessionContext_(context) &&
        ['desarrollador', 'gefe', 'jefe', 'supervisor'].includes(context.role));
    if (!isCurrentInboxView()) {
        listContainer.replaceChildren();
        const detail = document.getElementById('inbox-detail');
        if (detail) detail.replaceChildren();
        return;
    }
    listContainer.innerHTML = '';
    if (items.length === 0) {
        listContainer.innerHTML = '<p>No hay mensajes.</p>';
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inbox-item';
        if (item.isResolved) {
            itemDiv.classList.add('resolved');
        }
        if (item.reply) {
             itemDiv.classList.add('replied');
        }

        let iconClass = 'fa-envelope';
        let tipoLabel = 'Mensaje de contacto';
        if (item.suggestionData) {
            iconClass = 'fa-pen-to-square';
            tipoLabel = 'Sugerencia de cambio';
        } else if (item.type === 'problem_report') {
            iconClass = 'fa-triangle-exclamation';
            tipoLabel = 'Reporte de problema';
        } else if (item.type === 'video_approval') {
            iconClass = 'fa-brands fa-youtube';
            const statusText = item.approvalStatus === 'approved' ? 'Aprobado' : (item.approvalStatus === 'rejected' ? 'Rechazado' : 'Pendiente de aprobación');
            tipoLabel = `Vídeo: ${statusText}`;
        }
        const title = item.subject || `ID: ${item.id}`;

        itemDiv.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <div class="inbox-item-content">
                <strong class="inbox-item-title">${title}</strong>
                <p class="inbox-item-type">${tipoLabel}</p>
            </div>
        `;
        itemDiv.addEventListener('click', () => {
            if (!isCurrentInboxView()) return;
            document.querySelectorAll('.inbox-item.active').forEach(el => el.classList.remove('active'));
            itemDiv.classList.add('active');
            renderInboxDetail(item);
        });
        listContainer.appendChild(itemDiv);
    });
}


/* TAREA 1.7: BARRA DE ENRIQUECIMIENTO DE TEXTO COMPLETA PARA EL EDITOR DEL INBOX */
export function createInboxRichTextToolbar(targetId) {
    const toolbar = createRichTextToolbar(targetId);
    toolbar.classList.add("inbox-rich-toolbar");
    toolbar.style.marginBottom = "8px";
    toolbar.style.padding = "6px 8px";
    toolbar.style.border = "1px solid var(--border-color, #ccc)";
    toolbar.style.borderRadius = "6px";
    return toolbar;
}

export function renderInboxDetail(item) {
    const detailContainer = document.getElementById('inbox-detail');
    const context = getUiSessionContext_();
    const viewGeneration = inboxViewGeneration_;
    const detailGeneration = ++inboxDetailGeneration_;
    const isCurrentInboxDetail = () => Boolean(context &&
        viewGeneration === inboxViewGeneration_ &&
        detailGeneration === inboxDetailGeneration_ &&
        isCurrentUiSessionContext_(context) &&
        ['desarrollador', 'gefe', 'jefe', 'supervisor'].includes(context.role));
    if (!detailContainer) return;
    if (!isCurrentInboxDetail()) {
        detailContainer.replaceChildren();
        return;
    }
    const { currentUser, catalogData } = getState();
    const userName = currentUser ? (currentUser.Nombre_Completo || currentUser.Nombre_Usuario) : 'Usuario';

    let vehicleLabel = item.vehicleId ? `ID: ${item.vehicleId}` : '';
    if (item.vehicleId && catalogData && catalogData.cortes) {
        const vehicle = catalogData.cortes.find(c => String(c.id) === String(item.vehicleId));
        if (vehicle) {
            vehicleLabel = `${vehicle.marca} ${vehicle.modelo} (${vehicle.anoDesde})`;
        }
    }

    const isVideoItem = item.type === 'video_approval';
    const userRole = currentUser ? String(currentUser.Privilegios || '').trim() : '';
    const canApprove = ['desarrollador', 'gefe', 'supervisor'].includes(normalizeUiRole_(userRole));
    const reportMetadata = item.type === 'problem_report' && item.reportMetadata ? item.reportMetadata : null;
    const reportMetadataHtml = reportMetadata ? `
        <div style="margin:0 0 12px 0; padding:10px; background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #ddd); border-radius:6px;">
            <p style="margin:0 0 4px 0;"><strong>Identificador del reporte:</strong> ${sanitizeHtmlContent(String(reportMetadata.reportId || ''))}</p>
            <p style="margin:0 0 4px 0;"><strong>Corte reportado:</strong> #${Number(reportMetadata.corteIndex)}</p>
            <p style="margin:0;"><strong>Testigo del motor:</strong> ${reportMetadata.activaTestigoMotor === true ? 'El técnico confirma que este corte activa el testigo del motor.' : 'No confirmado en este reporte.'}</p>
        </div>
    ` : '';

    const suggestionData = item.type === 'problem_report' && item.suggestionData ? item.suggestionData : null;
    const proposedValues = suggestionData && suggestionData.proposedValues ? suggestionData.proposedValues : {};
    const proposedTestigoValue = proposedValues.activaTestigo;
    const proposedTestigoLabel = proposedTestigoValue === true
        ? 'Sí: el corte activa el testigo del motor.'
        : (proposedTestigoValue === false ? 'No: el corte no activa el testigo del motor.' : 'No aplica / no especificado.');
    const suggestionImageUrl = suggestionData && /^https:\/\/drive\.google\.com\//i.test(String(suggestionData.imageUrl || ""))
        ? sanitizeHtmlContent(String(suggestionData.imageUrl)) : "";
    const suggestionMetadataHtml = suggestionData ? `
        <div style="margin:0 0 12px 0; padding:10px; background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #ddd); border-radius:6px;">
            <strong>Revisión de sugerencia de corte</strong>
            <p style="margin:6px 0 4px 0;"><strong>Reporte relacionado:</strong> ${sanitizeHtmlContent(String(suggestionData.reportId || 'No especificado'))}</p>
            <p style="margin:0 0 4px 0;"><strong>Corte:</strong> #${Number(suggestionData.corteIndex)}</p>
            <p style="margin:0 0 4px 0;"><strong>Tipo propuesto:</strong> ${sanitizeHtmlContent(String(proposedValues.tipo || 'No especificado'))}</p>
            <p style="margin:0 0 4px 0;"><strong>Ubicación propuesta:</strong> ${sanitizeHtmlContent(String(proposedValues.ubicacion || 'No especificada'))}</p>
            <p style="margin:0 0 4px 0;"><strong>Color de cable propuesto:</strong> ${sanitizeHtmlContent(String(proposedValues.colorCable || 'No especificado'))}</p>
            <p style="margin:0 0 4px 0;"><strong>Configuración de relay propuesta:</strong> ${sanitizeHtmlContent(String(proposedValues.configRelay || 'No especificada'))}</p>
            <p style="margin:0 0 4px 0;"><strong>Testigo del motor propuesto:</strong> ${proposedTestigoLabel}</p>
            <p style="margin:0 0 4px 0;"><strong>Estado:</strong> ${sanitizeHtmlContent(String(suggestionData.status || 'pendiente_revision'))}</p>
            ${suggestionImageUrl ? `<p style="margin:0;"><strong>Imagen:</strong> <a href="${suggestionImageUrl}" target="_blank" rel="noopener noreferrer">Ver imagen de referencia</a></p>` : ''}
        </div>
    ` : '';

    detailContainer.innerHTML = `
        <h3 class="inbox-detail-title">${item.subject}</h3>
        <p class="inbox-detail-meta"><strong>De:</strong> ${item.user}</p>
        ${item.vehicleId ? `<p class="inbox-detail-meta"><strong>Vehículo:</strong> ${vehicleLabel}</p>` : ''}
        ${reportMetadataHtml}
        ${suggestionMetadataHtml}
        ${isVideoItem && item.videoUrl ? `
            <div style="margin-bottom:12px; padding:10px; background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #ddd); border-radius:6px;">
                <p style="margin:0 0 6px 0;"><strong>Enlace de YouTube:</strong> <a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer" style="color:#007bff; text-decoration:underline;"><i class="fa-brands fa-youtube" style="color:#ff0000;"></i> Ver vídeo en YouTube</a></p>
                <p style="margin:0 0 4px 0; font-size:0.85rem;"><strong>Estado de Aprobación:</strong> <span class="badge" style="background:${item.approvalStatus === 'approved' ? '#28a745' : (item.approvalStatus === 'rejected' ? '#dc3545' : '#ffc107')}; color:#fff; padding:2px 8px; border-radius:4px;">${item.approvalStatus || 'pending'}</span></p>
                ${item.contentType ? `<p style="margin:0; font-size:0.85rem;"><strong>Tipo de Contenido:</strong> ${item.contentType}</p>` : ''}
            </div>
        ` : ''}
        <div class="inbox-message-content" style="background:var(--card-bg, #fdfdfd); padding:10px; border-radius:6px; border:1px solid var(--border-color, #eee); margin-bottom:12px;">
            <div>${sanitizeHtmlContent(item.content)}</div>
        </div>
        ${item.reply ? `
            <div class="inbox-reply-content" style="background:var(--card-bg, #fdfdfd); padding:10px; border-radius:6px; border:1px solid var(--border-color, #eee); margin-bottom:12px;">
                <strong>Respuesta de ${item.responder || 'Admin'}:</strong>
                <div style="margin-top:6px;">${sanitizeHtmlContent(item.reply)}</div>
            </div>` : ''
        }
        ${isVideoItem ? `
            <div class="inbox-actions" style="margin-top:12px;">
                ${item.approvalStatus === 'pending' && canApprove ? `
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                        <button id="inbox-approve-video-btn" class="btn btn-primary" style="flex: 1; background-color:#28a745; border-color:#28a745;">
                            <i class="fa-solid fa-check"></i> Aprobar Vídeo
                        </button>
                        <button id="inbox-reject-video-btn" class="btn btn-danger" style="flex: 1; background-color:#dc3545; border-color:#dc3545;">
                            <i class="fa-solid fa-xmark"></i> Rechazar Vídeo
                        </button>
                    </div>
                ` : ''}
                <div style="display:flex; justify-content:flex-end;">
                    <button id="inbox-delete-btn" class="btn btn-danger" style="background-color: #dc3545; color: white;"><i class="fa-solid fa-trash"></i> Borrar Mensaje</button>
                </div>
            </div>
        ` : `
            <div class="inbox-actions">
                <div id="inbox-toolbar-container"></div>
                <textarea id="inbox-reply-textarea" placeholder="Escribe tu respuesta aquí..."></textarea>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                    <button id="inbox-reply-btn" class="btn btn-primary" style="flex: 1;">Enviar Respuesta</button>
                    ${item.type === 'problem_report' && !item.isResolved ?
                        `<button id="inbox-resolve-btn" class="resolve-btn btn btn-secondary">Marcar como Resuelto</button>` : ''
                    }
                    <button id="inbox-delete-btn" class="btn btn-danger" style="background-color: #dc3545; color: white;"><i class="fa-solid fa-trash"></i> Borrar Mensaje</button>
                </div>
            </div>
        `}
    `;

    // Listeners para aprobación/rechazo de vídeos
    const approveVideoBtn = document.getElementById('inbox-approve-video-btn');
    if (approveVideoBtn) {
        approveVideoBtn.addEventListener('click', async () => {
            if (confirm("¿Confirmas la aprobación y publicación de este vídeo en GPSpedia?")) {
                try {
                    approveVideoBtn.disabled = true;
                    approveVideoBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aprobando...`;
                    await approveVideo(item.id, userName, userRole, getSessionPayload_());
                    if (!isCurrentInboxDetail()) return;
                    inboxCacheData = null;
                    mostrarNotificacion("Vídeo aprobado con éxito.", "success");
                    openInbox();
                } catch (err) {
                    if (!isCurrentInboxDetail()) return;
                    showGlobalError(`Error al aprobar vídeo: ${err.message}`);
                    approveVideoBtn.disabled = false;
                    approveVideoBtn.innerHTML = `<i class="fa-solid fa-check"></i> Aprobar Vídeo`;
                }
            }
        });
    }

    const rejectVideoBtn = document.getElementById('inbox-reject-video-btn');
    if (rejectVideoBtn) {
        rejectVideoBtn.addEventListener('click', async () => {
            const reason = prompt("Indica el motivo de rechazo del vídeo:", "No cumple los requisitos técnicos");
            if (reason !== null) {
                try {
                    rejectVideoBtn.disabled = true;
                    rejectVideoBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rechazando...`;
                    await rejectVideo(item.id, userName, reason, userRole, getSessionPayload_());
                    if (!isCurrentInboxDetail()) return;
                    inboxCacheData = null;
                    mostrarNotificacion("Vídeo rechazado.", "info");
                    openInbox();
                } catch (err) {
                    if (!isCurrentInboxDetail()) return;
                    showGlobalError(`Error al rechazar vídeo: ${err.message}`);
                    rejectVideoBtn.disabled = false;
                    rejectVideoBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Rechazar Vídeo`;
                }
            }
        });
    }


    const toolbarContainer = document.getElementById('inbox-toolbar-container');
    if (toolbarContainer) {
        toolbarContainer.appendChild(createInboxRichTextToolbar('inbox-reply-textarea'));
    }

    const replyBtn = document.getElementById('inbox-reply-btn');
    if (replyBtn) {
        replyBtn.addEventListener('click', async () => {
            const replyText = document.getElementById('inbox-reply-textarea').value;
            if (!replyText.trim()) {
                showGlobalError("La respuesta no puede estar vacía.");
                return;
            }
            try {
                replyBtn.classList.add('btn-loading');
                await replyToFeedback(item.id, item.type, replyText, userName, getSessionPayload_());
                if (!isCurrentInboxDetail()) return;
                openInbox();
            } catch (error) {
                if (!isCurrentInboxDetail()) return;
                showGlobalError(`Error al enviar respuesta: ${error.message}`);
            } finally {
                replyBtn.classList.remove('btn-loading');
            }
        });
    }

    const resolveBtn = document.getElementById('inbox-resolve-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', async () => {
             try {
                resolveBtn.classList.add('btn-loading');
                await markAsResolved(item.id, getSessionPayload_());
                if (!isCurrentInboxDetail()) return;
                inboxCacheData = null;
                openInbox();
            } catch (error) {
                if (!isCurrentInboxDetail()) return;
                showGlobalError(`Error al resolver: ${error.message}`);
            } finally {
                resolveBtn.classList.remove('btn-loading');
            }
        });
    }

    const deleteBtn = document.getElementById('inbox-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm("¿Estás seguro de que deseas eliminar permanentemente este mensaje del Inbox?")) {
                try {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...`;
                    await deleteFeedbackItem(item.id, item.type, getSessionPayload_());
                    if (!isCurrentInboxDetail()) return;
                    inboxCacheData = null;
                    mostrarNotificacion("Mensaje eliminado con éxito", "success");
                    openInbox();
                } catch (error) {
                    if (!isCurrentInboxDetail()) return;
                    showGlobalError(`Error al eliminar mensaje: ${error.message}`);
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Borrar Mensaje`;
                }
            }
        });
    }
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Si ya es un ID de 11 caracteres (ej. dQw4w9WgXcQ)
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes(':')) {
        return `https://www.youtube.com/embed/${trimmed}?enablejsapi=1`;
    }

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);

    const id = (match && match[2].length === 11) ? match[2] : null;

    if (id) {
        return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
    }

    // Fallback para casos donde el ID es pasado directamente pero no cumplió la primera condición
    if (!trimmed.includes('/') && !trimmed.includes(':') && trimmed.length > 5) {
        return `https://www.youtube.com/embed/${trimmed}?enablejsapi=1`;
    }

    return null;
}

export function createAccordionSection(container, title, sec, isOpen = false, datosRelay = [], vehicleId = null) {
    const btn = document.createElement("button");
    btn.className = "accordion-btn";
    btn.innerHTML = `${title} <span class="accordion-arrow">▼</span>`;

    const panel = document.createElement("div");
    panel.className = "panel-desplegable";

    if (sec.isCorte) {
        // Los cortes dentro de acordeones son diferidos (isLazy = true)
        const cIndex = sec.corteIndex || (sec.data && sec.data.index) || 2;
        renderCutContent(panel, sec.data, datosRelay, vehicleId, true, cIndex);
    } else if (inEditMode && (title === 'Apertura' || title === 'Cables de Alimentación')) {
        if (title === 'Apertura') {
            const fieldName = 'apertura';
            const imgFieldName = 'imgApertura';
            const currentValue = editedItemBuffer.apertura;
            const currentImg = editedItemBuffer.imgApertura;

            const label = document.createElement('label');
            label.textContent = `Detalle de ${title}:`;
            label.style.cssText = "display: block; font-weight: bold; margin-bottom: 5px; font-size: 0.85em;";
            const aperturaTargetId = `edit-apertura-${vehicleId}`;
            const textarea = document.createElement('textarea');
            textarea.id = aperturaTargetId;
            textarea.rows = 3;
            textarea.value = currentValue || "";
            textarea.style.cssText = "width: 100%; padding: 6px; border: 1px solid #007bff; border-radius: 4px; background: var(--bg-color); color: var(--text-color); box-sizing: border-box;";
            textarea.onblur = async () => {
                if (textarea.value.trim() !== editedItemBuffer[fieldName]) {
                    editedItemBuffer[fieldName] = textarea.value.trim();
                    await saveFieldSilently(vehicleId, fieldName, textarea.value.trim());
                }
            };
            panel.appendChild(label);
            panel.appendChild(createRichTextToolbar(aperturaTargetId));
            panel.appendChild(textarea);

            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container-with-feedback';
            imgContainer.style.marginTop = "10px";
            const img = document.createElement("img");
            setOptimizedImage(img, currentImg || null, IMG_SIZE_MEDIUM);
            img.className = 'img-corte image-with-container';
            convertImageToEditable(img, vehicleId, imgFieldName);
            imgContainer.appendChild(img);
            panel.appendChild(imgContainer);
        } else {
            // Cables de Alimentación: Mostrar las 3 posiciones
            const cableFields = [
                { label: 'Cable de Alimentación 1', textKey: 'cableAlimen', imgKey: 'imgCableAlimen' },
                { label: 'Cable de Alimentación 2', textKey: 'cableAlimen2', imgKey: 'imgCableAlimen2' },
                { label: 'Cable de Alimentación 3', textKey: 'cableAlimen3', imgKey: 'imgCableAlimen3' }
            ];

            cableFields.forEach(field => {
                const fieldLabel = document.createElement('label');
                fieldLabel.textContent = `${field.label}:`;
                fieldLabel.style.cssText = "display: block; font-weight: bold; margin-top: 15px; margin-bottom: 5px; font-size: 0.85em;";

                const cableTargetId = `edit-cable-${field.textKey}-${vehicleId}`;
                const textarea = document.createElement('textarea');
                textarea.id = cableTargetId;
                textarea.rows = 2;
                textarea.value = editedItemBuffer[field.textKey] || "";
                textarea.style.cssText = "width: 100%; padding: 6px; border: 1px solid #007bff; border-radius: 4px; background: var(--bg-color); color: var(--text-color); box-sizing: border-box;";
                textarea.onblur = async () => {
                    if (textarea.value.trim() !== editedItemBuffer[field.textKey]) {
                        editedItemBuffer[field.textKey] = textarea.value.trim();
                        await saveFieldSilently(vehicleId, field.textKey, textarea.value.trim());
                    }
                };
                panel.appendChild(fieldLabel);
                panel.appendChild(createRichTextToolbar(cableTargetId));
                panel.appendChild(textarea);

                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-container-with-feedback';
                imgContainer.style.marginTop = "5px";
                imgContainer.style.marginBottom = "10px";
                const img = document.createElement("img");
                setOptimizedImage(img, editedItemBuffer[field.imgKey] || null, IMG_SIZE_MEDIUM);
                img.className = 'img-corte image-with-container';
                convertImageToEditable(img, vehicleId, field.imgKey);
                imgContainer.appendChild(img);
                panel.appendChild(imgContainer);
            });
        }
    } else if (sec.isCarousel && sec.cables && sec.cables.length > 1) {
        // Renderizar un carrusel responsivo para múltiples cables de alimentación
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'cable-carousel-container';
        carouselContainer.style.cssText = "position: relative; width: 100%; min-height: 100px;";

        const slideText = document.createElement('p');
        slideText.className = 'cable-carousel-text';
        slideText.style.cssText = "margin-bottom: 10px; font-weight: 500;";

        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container-with-feedback';
        const slideImg = document.createElement('img');
        slideImg.className = 'img-corte image-with-container';
        imgContainer.appendChild(slideImg);

        carouselContainer.appendChild(slideText);
        carouselContainer.appendChild(imgContainer);

        let currentSlideIndex = 0;
        const totalSlides = sec.cables.length;

        function updateSlide(index) {
            currentSlideIndex = (index + totalSlides) % totalSlides;
            const activeCable = sec.cables[currentSlideIndex];
            slideText.innerHTML = `<strong>${activeCable.label}:</strong> ${activeCable.content || "Sin descripción"}`;

            if (activeCable.img) {
                slideImg.style.display = 'block';
                const fileId = activeCable.img.includes('id=') ? activeCable.img.split('id=')[1].split('&')[0] : activeCable.img;
                setOptimizedImage(slideImg, fileId, IMG_SIZE_MEDIUM);
                slideImg.onclick = () => {
                    const validCableImages = sec.cables.filter(c => c.img).map(c => ({
                        img: c.img,
                        url: getImageUrl(c.img, IMG_SIZE_LARGE),
                        label: c.label,
                        content: c.content
                    }));
                    const initialIndex = validCableImages.findIndex(c => c.img === activeCable.img);
                    const highResImgUrl = getImageUrl(activeCable.img, IMG_SIZE_LARGE);

                    window.abrirLightbox(highResImgUrl, 'lightboxImg', {
                        cables: validCableImages,
                        currentIndex: initialIndex >= 0 ? initialIndex : 0,
                        onSlideChange: (newIndex) => {
                            const targetCable = validCableImages[newIndex];
                            if (targetCable) {
                                const targetSlideIndex = sec.cables.findIndex(c => c.img === targetCable.img);
                                if (targetSlideIndex >= 0) {
                                    updateSlide(targetSlideIndex);
                                }
                            }
                        }
                    });
                };
            } else {
                slideImg.style.display = 'none';
            }
        }

        function adjustPanelHeight() {
            if (btn.classList.contains('active')) {
                setTimeout(() => {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }, 50);
            }
        }

        // Botones de navegación para escritorio
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'cable-carousel-btn prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            updateSlide(currentSlideIndex - 1);
            adjustPanelHeight();
        };

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'cable-carousel-btn next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            updateSlide(currentSlideIndex + 1);
            adjustPanelHeight();
        };

        carouselContainer.appendChild(prevBtn);
        carouselContainer.appendChild(nextBtn);
        panel.appendChild(carouselContainer);

        // Soporte de gestos táctiles (swipe) para móvil y PWA
        let touchStartX = 0;
        let touchEndX = 0;

        carouselContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const threshold = 50;
            if (touchEndX < touchStartX - threshold) {
                updateSlide(currentSlideIndex + 1);
                adjustPanelHeight();
            } else if (touchEndX > touchStartX + threshold) {
                updateSlide(currentSlideIndex - 1);
                adjustPanelHeight();
            }
        }, { passive: true });

        updateSlide(0);
    } else {
        const activeContent = (sec.isCarousel && sec.cables && sec.cables.length === 1) ? sec.cables[0].content : sec.content;
        const activeImg = (sec.isCarousel && sec.cables && sec.cables.length === 1) ? sec.cables[0].img : sec.img;

        if (activeContent) {
            const contentP = document.createElement('p');
            contentP.innerHTML = activeContent;
            panel.appendChild(contentP);
        }

        if (activeImg) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container-with-feedback';
            const img = document.createElement("img");
            img.dataset.src = getImageUrl(activeImg, IMG_SIZE_MEDIUM);
            img.className = 'img-corte image-with-container';
            img.onclick = () => {
                const highResImgUrl = getImageUrl(activeImg, IMG_SIZE_LARGE);
                const validCableImages = (sec.isCarousel && sec.cables) ? sec.cables.filter(c => c.img).map(c => ({
                    img: c.img,
                    url: getImageUrl(c.img, IMG_SIZE_LARGE),
                    label: c.label,
                    content: c.content
                })) : null;

                const context = (validCableImages && validCableImages.length > 0) ? {
                    cables: validCableImages,
                    currentIndex: 0
                } : null;

                window.abrirLightbox(highResImgUrl, 'lightboxImg', context);
            };
            imgContainer.appendChild(img);
            panel.appendChild(imgContainer);
        }
    }

    if (sec.colaborador && !inEditMode) {
        const colabDiv = document.createElement('div');
        const colabP = document.createElement('p');
        colabP.style.cssText = "font-style: italic; color: var(--text-disabled); margin-top: 10px; text-align: left;";
        colabP.innerHTML = `Aportado por: <strong>${cleanColaboradorName(sec.colaborador)}</strong>`;
        colabDiv.appendChild(colabP);
        panel.appendChild(colabDiv);
    }

    if (sec.Video) {
        const videoEmbedUrl = getYouTubeEmbedUrl(sec.Video);
        if (videoEmbedUrl) {
            const videoContainer = document.createElement('div');
            const iframeId = `video-${Date.now()}`;
            videoContainer.innerHTML = `<iframe id="${iframeId}" width="100%" height="315" src="${videoEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 10px;"></iframe>`;
            panel.appendChild(videoContainer);
            btn.dataset.iframeId = iframeId;
        }
    }

    container.appendChild(btn);
    container.appendChild(panel);

    const loadAccordionImages = () => {
        const imgs = panel.querySelectorAll('img[data-src]');
        imgs.forEach(img => {
            if (!img.src) {
                img.onload = () => {
                    // Actualizar maxHeight si el panel sigue abierto
                    if (btn.classList.contains('active')) {
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                };
                // Phase 3: Usar setOptimizedImage para cargar desde caché o Drive
                const fileId = img.dataset.src.includes('id=') ? img.dataset.src.split('id=')[1].split('&')[0] : img.dataset.src;
                setOptimizedImage(img, fileId, IMG_SIZE_MEDIUM);
            }
        });
    };

    if (isOpen) {
        btn.classList.add("active");
        loadAccordionImages();
        panel.style.maxHeight = panel.scrollHeight + "px";
    }

    btn.addEventListener("click", function() {
        const isActive = this.classList.contains("active");

        // Cerrar todos los paneles antes de abrir el nuevo
        const allButtons = container.querySelectorAll(".accordion-btn");
        allButtons.forEach(otherBtn => {
            otherBtn.classList.remove("active");
            const otherArrow = otherBtn.querySelector(".accordion-arrow");
            if (otherArrow) otherArrow.textContent = "▼";
            const otherPanel = otherBtn.nextElementSibling;
            if (otherPanel && otherPanel.classList.contains("panel-desplegable")) {
                otherPanel.style.maxHeight = null;
            }
        });

        // Si el botón no estaba activo, ábrelo.
        if (!isActive) {
            this.classList.add("active");
            loadAccordionImages();
            // Esperar un ciclo de renderizado para asegurar que el iframe exista
            setTimeout(() => {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }, 0);
        }
    });

    // Listener para pausar el video CUANDO la animación de cierre TERMINA
    panel.addEventListener('transitionend', () => {
        if (!panel.style.maxHeight) { // Si el panel está cerrado
            const iframeId = btn.dataset.iframeId;
            const iframe = iframeId ? document.getElementById(iframeId) : null;
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        }
    });
}

function mostrarUltimosAgregados() {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    if (!cortes || cortes.length === 0) return;

    const ultimosCortes = [...cortes]
        .sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
            const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
            if (dateB - dateA !== 0) return dateB - dateA;
            return b.id - a.id;
        })
        .slice(0, 6);

    if (ultimosCortes.length === 0) return;

    crearCarrusel('Últimos Agregados', ultimosCortes, item => {
        return crearCardVehiculo(item);
    });
}

/**
 * Función unificada para crear tarjetas de vehículos con soporte para caché local y badge de "Visto".
 */
function crearCardVehiculo(item, hideBadge = false, resultsForVariant = null) {
    const { viewedItems } = getState();
    const isViewed = !hideBadge && viewedItems.some(v => String(v.id) === String(item.id));

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute('data-vehicle-id', item.id || '');
    if (item._vinClassKey) card.setAttribute('data-vin-class-key', item._vinClassKey);
    card.style.animation = 'none';
    card.style.opacity = '1';

    // Badge de tipo de sección si es un resultado multi-sección
    if (item._sectionType && item._sectionType !== 'corte') {
        const typeBadge = document.createElement('div');
        typeBadge.className = 'viewed-badge';
        typeBadge.style.cssText = 'background: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; position: absolute; top: 8px; left: 8px; z-index: 2;';
        typeBadge.innerText = item._sectionType.toUpperCase();
        card.appendChild(typeBadge);
    } else if (isViewed) {
        const badge = document.createElement('div');
        badge.className = 'viewed-badge';
        badge.innerHTML = '<i class="fa-solid fa-eye"></i> Visto';
        card.appendChild(badge);
    }

    // Configurar OnClick según la sección
    if (item._sectionType === 'relay') {
        card.onclick = () => mostrarDetalleRelayModal(item);
    } else if (item._sectionType === 'tutorial') {
        card.onclick = () => mostrarDetalleTutorialModal(item);
    } else if (item._sectionType === 'pys') {
        card.onclick = () => openPysDetailModal(item);
    } else if (resultsForVariant) {
        card.onclick = () => {
            const selectedVersion = item._identifiedVersion || item.versionesAplicables;
            const filasDeVariante = resultsForVariant.filter(r =>
                r.marca === item.marca &&
                r.modelo === item.modelo &&
                (r._identifiedVersion || r.versionesAplicables) === selectedVersion
            );
            mostrarVersiones(filasDeVariante, item.categoria, item.marca, item.modelo);
        };
    } else if (item.anoDesde && !resultsForVariant) {
        card.onclick = () => {
            if (hideBadge) {
                if (window.location.hash.startsWith('#search=')) {
                    history.replaceState({ level: 'categorias' }, '', window.location.pathname + window.location.search);
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.parentElement.classList.remove('has-text');
                        searchInput.blur();
                    }
                    document.body.classList.remove('search-active');
                }
            }
            mostrarDetalleModal(item);
        };
    }

    const img = document.createElement("img");
    img.className = 'card-img-top';
    img.alt = `${item.marca || ''} ${item.modelo || ''}`;
    img.loading = "lazy";

    setOptimizedImage(img, item.Imagen || item.imagenVehiculo || item.imagen, IMG_SIZE_SMALL);
    card.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    if (item._sectionType && item._sectionType !== 'corte') {
        const sectionLabels = { relay: 'Relay', tutorial: 'Tutorial', pys: 'Problema' };
        const primary = document.createElement('div');
        primary.className = 'overlay-text-primary';
        primary.textContent = sectionLabels[item._sectionType] || 'Resultado';
        const secondary = document.createElement('div');
        secondary.className = 'overlay-text-secondary';
        secondary.textContent = item.modelo || item.configuracion || item.Tema || item.Problema || '';
        overlay.append(primary, secondary);
    } else if (resultsForVariant) {
        const version = item._identifiedVersion || item.versionesAplicables || '';
        const tiposEncendido = [...new Set(resultsForVariant
            .filter(r => r.marca === item.marca && r.modelo === item.modelo && r.categoria === item.categoria && r.versionesAplicables === item.versionesAplicables)
            .map(r => r.tipoEncendido).filter(Boolean))].join(' / ');

        overlay.innerHTML = `<div class="overlay-text-primary">${item.marca} ${item.modelo}</div><div class="overlay-text-secondary">${item.categoria} | ${version || tiposEncendido}</div>`;
    } else {
        const yearRange = item.anoHasta ? `${item.anoDesde} - ${item.anoHasta}` : item.anoDesde;
        overlay.innerHTML = `<div class="overlay-text-primary">${item.marca} ${item.modelo}</div><div class="overlay-text-secondary">${yearRange} | ${item.tipoEncendido || ''}</div>`;
    }

    card.appendChild(overlay);
    return card;
}

export function showLoginScreen(reason = null) {
    resetSessionUi_();
    setState({
        currentUser: null,
        navigationState: { level: 'categorias', categoria: null, marca: null, modelo: null },
        uiState: { isModalOpen: false, isSearchActive: false },
        likedCortes: []
    });

    document.getElementById('splash-screen').style.display = 'none';
    document.querySelector('.container').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';

    const loginError = document.getElementById('login-error');
    if (reason) {
        loginError.textContent = reason;
        loginError.style.display = 'block';
    } else {
        loginError.style.display = 'none';
    }

    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}


function renderTermsGate_(user) {
    const container = document.querySelector('.container'), footer = document.querySelector('.footer');
    const modal = document.getElementById('terms-modal'), button = document.getElementById('btn-accept-terms');
    const errorMessage = document.getElementById('terms-error');
    const keepBlocked = message => {
        if (container) container.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (modal) modal.style.display = 'flex';
        if (button) button.disabled = true;
        if (errorMessage) errorMessage.textContent = message;
        showGlobalError(message); return false;
    };
    if (!container || !footer || !modal || !button) return keepBlocked('No se pudo cargar el aviso obligatorio de términos. El catálogo permanecerá bloqueado.');
    if (modal.dataset.termsVersion !== TERMS_CURRENT_VERSION) return keepBlocked('La versión del aviso y la versión de términos del sistema no coinciden. Actualiza la página; el catálogo permanece bloqueado.');
    const acceptance = user && user.TermsAcceptance, acceptedAt = acceptance && Date.parse(acceptance.acceptedAt);
    const accepted = Boolean(acceptance && acceptance.status === 'accepted' &&
        acceptance.version === TERMS_CURRENT_VERSION && Number.isFinite(acceptedAt));
    if (accepted) {
        modal.style.display = 'none'; button.disabled = false;
        if (errorMessage) errorMessage.textContent = '';
        container.style.display = 'block'; footer.style.display = 'flex'; return true;
    }
    container.style.display = 'none'; footer.style.display = 'none'; modal.style.display = 'flex';
    button.disabled = false;
    button.onclick = async () => {
        button.disabled = true; if (errorMessage) errorMessage.textContent = '';
        try {
            const userId = String(user && (user.ID || user.id) || '').trim(), sessionToken = user && user.SessionToken;
            if (!userId || typeof sessionToken !== 'string' || !sessionToken) throw new Error('No se pudo identificar la sesión activa. Inicia sesión nuevamente.');
            const result = await routeAction('acceptTerms', { userId, sessionToken, version: TERMS_CURRENT_VERSION });
            const confirmed = result && result.termsAcceptance;
            if (!result || result.status !== 'success' || result.accepted !== true ||
                !confirmed || confirmed.status !== 'accepted' || confirmed.version !== TERMS_CURRENT_VERSION ||
                !Number.isFinite(Date.parse(confirmed.acceptedAt))) {
                throw new Error('El servidor no confirmó el registro de aceptación. El catálogo permanece bloqueado.');
            }
            const stored = JSON.parse(localStorage.getItem('gpsepedia_session') || 'null');
            if (!stored || String(stored.ID || stored.id || '') !== userId || stored.SessionToken !== sessionToken) {
                throw new Error('La sesión local cambió durante la aceptación. Inicia sesión nuevamente.');
            }
            stored.TermsAcceptance = confirmed;
            localStorage.setItem('gpsepedia_session', JSON.stringify(stored));
            user.TermsAcceptance = confirmed; setState({ currentUser: user });
            modal.style.display = 'none'; container.style.display = 'block'; footer.style.display = 'flex';
        } catch (error) {
            const message = error && error.message ? error.message : 'No se pudo registrar la aceptación.';
            if (errorMessage) errorMessage.textContent = message;
            showGlobalError(message); button.disabled = false;
        }
    };
    return false;
}

export function showApp(user) {
    const appContext = getUiSessionContext_(user);
    const appContextKey = appContext
        ? `${appContext.userId}|${appContext.sessionToken}|${appContext.role}`
        : '';
    if (lastShownAppContextKey !== appContextKey) {
        resetSessionUi_();
        lastShownAppContextKey = appContextKey;
        lastShownAppContext = appContext;
    }

    const splash = document.getElementById('splash-screen');
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
    }, 500);

    document.getElementById('login-modal').style.display = 'none';

    // AUTH confirma la aceptación individual; localStorage solo conserva una copia de sesión.
    if (!renderTermsGate_(user)) return;

    if (user && (user.Nombre_Completo || user.Nombre_Usuario)) {
        document.getElementById('menu-username').textContent = user.Nombre_Completo || user.Nombre_Usuario;

        // Mostrar mensaje de bienvenida en el nuevo header si existe
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
            welcomeMsg.textContent = `Hola, ${user.Nombre_Completo || user.Nombre_Usuario}`;
            welcomeMsg.style.display = 'block';
        }
    }

    const devToolsBtn = document.getElementById('dev-tools-btn');
    const userRole = normalizeUiRole_(user && user.Privilegios);
    if (devToolsBtn) {
        devToolsBtn.style.display = userRole === 'desarrollador' ? 'flex' : 'none';
    }

    const inboxBtn = document.getElementById('inbox-btn');
    if (inboxBtn) {
        inboxBtn.style.display = ['desarrollador', 'gefe', 'jefe', 'supervisor'].includes(userRole) ? 'flex' : 'none';
    }

    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.style.display = ['desarrollador', 'gefe', 'supervisor'].includes(userRole) ? 'flex' : 'none';
    }

    // Protección de renderizado: No mostrar el catálogo si los datos no están listos.
    const { catalogData } = getState();
    if (catalogData && Array.isArray(catalogData.cortes) && catalogData.cortes.length > 0) {
        mostrarCategorias();
    } else {
        // Mostrar estado de carga si los datos aún no están listos
        const cont = document.getElementById("contenido");
        if (cont) {
            cont.innerHTML = `
                <div class="loading-data-container" style="text-align: center; padding: 50px 20px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 15px;"></i>
                    <p>Cargando catálogo...</p>
                </div>
            `;
        }
    }
}

// Variable local para rastrear el estado previo de los carruseles de actividad y evitar bucles
let lastHistoryCount = 0;
let lastViewedCount = 0;

// Suscribirse a cambios de estado para renderizar el catálogo cuando los datos lleguen
subscribe((state) => {
    const splash = document.getElementById('splash-screen');
    // Consideramos que la app es visible si el splash no está presente o su opacidad es 0
    const isAppVisible = !splash || splash.style.display === 'none' || splash.style.opacity === '0';

    if (isAppVisible && state.catalogData && Array.isArray(state.catalogData.cortes) && state.catalogData.cortes.length > 0) {
        const cont = document.getElementById("contenido");
        const isMainLevel = state.navigationState.level === 'categorias';

        if (!isMainLevel || !cont) return;

        // Detectar si el historial o los vistos han cambiado para forzar refresco del catálogo
        const historyChanged = (state.searchHistory?.length || 0) !== lastHistoryCount;
        const viewedChanged = (state.viewedItems?.length || 0) !== lastViewedCount;

        if (historyChanged || viewedChanged) {
            lastHistoryCount = state.searchHistory?.length || 0;
            lastViewedCount = state.viewedItems?.length || 0;
            mostrarCategorias();
            return;
        }

        // Solo renderizar si el contenedor tiene el mensaje de carga o está vacío o contiene errores previos
        if (cont.querySelector('.loading-data-container') || cont.innerHTML.trim() === "" || cont.querySelector('.error-message')) {
             mostrarCategorias();
        }
    }
});

export function showGlobalError(message) {
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 7000);
}

/* TAREA 1: Alias y función unificada de notificación para Inbox y operaciones del sistema */
export function mostrarNotificacion(message, type = 'info') {
    return showGlobalNotification(message, type);
}

export function showGlobalNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    if (type === 'success') {
        toast.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
    } else {
        toast.style.backgroundColor = '#007bff';
    }
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

export function openSideMenu() {
    const { currentUser } = getState();
    if (currentUser && (currentUser.Nombre_Completo || currentUser.Nombre_Usuario)) {
        document.getElementById('menu-username').textContent = currentUser.Nombre_Completo || currentUser.Nombre_Usuario;
    }
    document.getElementById('side-menu').classList.add('open');
    document.getElementById('menu-overlay').classList.add('open');

    if (window.history && window.history.pushState) {
        window.history.pushState({ sideMenuOpen: true }, '');
    }
}

export function closeSideMenu(isFromPopState = false) {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');

    if (!isFromPopState && window.history && window.history.state && window.history.state.sideMenuOpen) {
        window.history.back();
    }
}

export function mostrarSeccion(sectionName, isFromPopState = false) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const sectionId = sectionName === 'cortes' ? 'contenido' : `contenido-${sectionName}`;
    const sectionElement = document.getElementById(sectionId);
    const buttonElement = document.getElementById(`btn-${sectionName}`);

    if (sectionElement) sectionElement.style.display = 'block';
    if (buttonElement) buttonElement.classList.add('active');

    // Registrar en el historial si no viene de un popstate
    if (!isFromPopState && window.history && window.history.pushState) {
        const hash = sectionName === 'cortes' ? '' : `#${sectionName}`;
        window.history.pushState({ section: sectionName }, '', window.location.pathname + window.location.search + hash);
    }

    switch (sectionName) {
        case 'cortes':
            mostrarCategorias();
            break;
        case 'tutoriales':
            mostrarTutorialesGrid();
            break;
        case 'relay':
            mostrarRelayGrid();
            break;
        case 'pys':
            renderPysSection();
            break;
    }
}

/* TAREA 4: Renderizado robusto e independiente de tarjetas de Tutoriales y Relay */
function mostrarTutorialesGrid() {
    const { catalogData } = getState();
    const tutoriales = (catalogData && catalogData.tutoriales) ? catalogData.tutoriales : [];
    const cont = document.getElementById('contenido-tutoriales');
    if (!cont) return;
    cont.innerHTML = '<h4>Tutoriales</h4>';

    const grid = document.createElement('div');
    grid.className = 'grid';

    // First card: Add Tutorial Card (+)
    const createCard = document.createElement('div');
    createCard.className = 'card card-create-tutorial';
    createCard.innerHTML = `
        <i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 6px;"></i>
        <span style="font-size: 0.95rem;">Agregar Tutorial</span>
    `;
    createCard.onclick = () => openAddTutorialModal();
    grid.appendChild(createCard);

    tutoriales.forEach((item, index) => {
        if (!item) return;
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarDetalleTutorialModal(item);
        const img = document.createElement("img");
        setOptimizedImage(img, item.Imagen || '', IMG_SIZE_SMALL);
        img.alt = item.Tema || `Tutorial ${index + 1}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.textContent = item.Tema || `Tutorial ${index + 1}`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

function mostrarRelayGrid() {
    const { catalogData } = getState();
    const relay = (catalogData && catalogData.relay) ? catalogData.relay : [];
    const cont = document.getElementById('contenido-relay');
    if (!cont) return;
    cont.innerHTML = '<h4>Configuraciones de Relay</h4>';

    const grid = document.createElement('div');
    grid.className = 'grid';
    relay.forEach((item, index) => {
        if (!item) return;
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarDetalleRelayModal(item);
        const img = document.createElement("img");
        setOptimizedImage(img, item.imagen || '', IMG_SIZE_SMALL);
        img.alt = item.configuracion || item.funcion || `Configuración Relay ${index + 1}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.textContent = item.configuracion || item.funcion || `Configuración ${index + 1}`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

export function mostrarDetalleTutorialModal(item, inEditModeTutorial = false) {
    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const sessionData = localStorage.getItem('gpsepedia_session');
    const userRole = getUiSessionContext_()?.role || null;
    const isDeveloper = userRole === 'desarrollador';

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";

    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1;";

    const title = document.createElement("h2");
    title.textContent = item.Tema;
    title.style.color = "#007bff";
    title.style.margin = "0";
    titleContainer.appendChild(title);
    headerDiv.appendChild(titleContainer);

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";

    if (isDeveloper) {
        if (inEditModeTutorial) {
            // Botón Descartar (↩️)
            const resetBtn = document.createElement("button");
            resetBtn.innerHTML = '↩️';
            resetBtn.className = "share-modal-btn";
            resetBtn.title = "Descartar cambios";
            resetBtn.style.fontSize = "1.2em";
            resetBtn.onclick = () => mostrarDetalleTutorialModal(item, false);
            controlsContainer.appendChild(resetBtn);

            // Botón Guardar (✅)
            const saveBtn = document.createElement("button");
            saveBtn.innerHTML = '✅';
            saveBtn.className = "share-modal-btn";
            saveBtn.title = "Guardar cambios";
            saveBtn.style.fontSize = "1.2em";
            saveBtn.id = "btn-save-tutorial-edit";
            controlsContainer.appendChild(saveBtn);
        } else {
            // Botón de lápiz de Edición
            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            editBtn.className = "share-modal-btn";
            editBtn.title = "Activar modo edición";
            editBtn.onclick = () => mostrarDetalleTutorialModal(item, true);
            controlsContainer.appendChild(editBtn);
        }
    }

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar";
    closeBtn.onclick = () => {
        if (window.history && window.history.state && window.history.state.modalOpen) {
            window.history.back();
        } else {
            document.getElementById("modalDetalle").classList.remove("visible");
        }
    };
    closeBtn.className = "backBtn";
    closeBtn.style.cssText = "color:white; background:#dc3545; border:none; margin:0;";
    controlsContainer.appendChild(closeBtn);
    headerDiv.appendChild(controlsContainer);
    cont.appendChild(headerDiv);

    if (inEditModeTutorial) {
        // Formulario in-modal de edición de tutorial
        const form = document.createElement("div");
        form.style.cssText = "display: flex; flex-direction: column; gap: 12px; margin-top: 10px;";

        const temaLabel = document.createElement("label");
        temaLabel.style.fontWeight = "bold";
        temaLabel.textContent = "Tema / Título (máx 30 caracteres):";
        const temaInput = document.createElement("input");
        temaInput.type = "text";
        temaInput.maxLength = 30;
        temaInput.value = item.Tema || "";
        temaInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const videoLabel = document.createElement("label");
        videoLabel.style.fontWeight = "bold";
        videoLabel.textContent = "Enlace de Vídeo de YouTube:";
        const videoInput = document.createElement("input");
        videoInput.type = "url";
        videoInput.value = item.Video || "";
        videoInput.readOnly = true;
        videoInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const descLabel = document.createElement("label");
        descLabel.style.fontWeight = "bold";
        descLabel.textContent = "Descripción / Detalles (máx 700 caracteres):";
        const descInput = document.createElement("textarea");
        descInput.id = "edit-tutorial-desc-textarea";
        descInput.maxLength = 700;
        descInput.rows = 4;
        descInput.value = item.Detalles || item.Descripcion || "";
        descInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        form.appendChild(temaLabel);
        form.appendChild(temaInput);
        form.appendChild(videoLabel);
        form.appendChild(videoInput);
        const uploadTutorialVideoBtn = document.createElement("button");
        uploadTutorialVideoBtn.type = "button";
        uploadTutorialVideoBtn.className = "btn btn-primary";
        uploadTutorialVideoBtn.textContent = item.Video ? "El tutorial ya tiene un vídeo" : "Solicitar subida de vídeo";
        uploadTutorialVideoBtn.disabled = Boolean(item.Video);
        uploadTutorialVideoBtn.onclick = () => openYouTubeUploadModal({
            initialTitle: item.Tema || "Tutorial técnico",
            initialDescription: item.Detalles || item.Descripcion || "",
            contentType: "tutorial",
            referenceId: item.Tema,
            metadata: { tema: item.Tema },
            onSuccess: async () => {
                const fresh = await routeAction("getCatalogData");
                if (fresh && fresh.data) setState({ catalogData: fresh.data });
            }
        });
        form.appendChild(uploadTutorialVideoBtn);
        form.appendChild(descLabel);
        form.appendChild(createRichTextToolbar("edit-tutorial-desc-textarea"));
        form.appendChild(descInput);
        cont.appendChild(form);

        const saveBtn = controlsContainer.querySelector("#btn-save-tutorial-edit");
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const newTema = temaInput.value.trim();
                const newVideo = videoInput.value.trim();
                const newDesc = descInput.value.trim();
                if (!newTema) {
                    mostrarNotificacion("El tema no puede estar vacío.", "error");
                    return;
                }
                saveBtn.disabled = true;
                showSavingIndicator("saving", "Guardando cambios...");
                try {
                    const res = await routeAction('updateTutorialItem', {
                        originalTema: item.Tema,
                        tema: newTema,
                        videoUrl: newVideo,
                        descripcion: newDesc,
                        ...getSessionPayload_(),
                        userRole
                    });
                    if (res && res.status === 'success') {
                        item.Tema = newTema;
                        item.Video = newVideo;
                        item.Detalles = newDesc;
                        item.Descripcion = newDesc;
                        showSavingIndicator("success", "Tutorial guardado");
                        mostrarNotificacion("Tutorial actualizado con éxito.", "success");
                        mostrarDetalleTutorialModal(item, false);
                    } else {
                        throw new Error((res && res.message) || "Error al actualizar");
                    }
                } catch (err) {
                    console.error("Error guardando tutorial:", err);
                    showSavingIndicator("error", "Error al guardar");
                    mostrarNotificacion(err.message || "Error al guardar el tutorial", "error");
                    saveBtn.disabled = false;
                }
            };
        }
    } else {
        // Visualización normal del tutorial
        if (item.Video) {
            const videoContainer = document.createElement('div');
            const videoEmbedUrl = getYouTubeEmbedUrl(item.Video) || item.Video.replace("watch?v=", "embed/");
            videoContainer.innerHTML = `<iframe width="100%" height="315" src="${videoEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>`;
            cont.appendChild(videoContainer);
        }

        const details = [
            createDetailParagraph('Cómo Identificarlo', item.comoIdentificarlo),
            createDetailParagraph('Dónde Encontrarlo', item.dondeEncontrarlo),
            createDetailParagraph('Detalles', item.Detalles || item.Descripcion)
        ];

        details.forEach(detail => {
            if (detail) cont.appendChild(detail);
        });
    }

    const modalDetalle = document.getElementById("modalDetalle");
    modalDetalle.dataset.modalType = 'tutorial';
    modalDetalle.classList.add("visible");
    if (!inEditModeTutorial && window.history && window.history.pushState) {
        window.history.pushState({ modalOpen: true }, '');
    }
}

function mostrarDetalleRelayModal(item) {
    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
    const title = document.createElement("h2");
    title.textContent = item.configuracion;
    title.style.color = "#007bff";
    headerDiv.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar";
    closeBtn.onclick = () => {
        if (window.history && window.history.state && window.history.state.modalOpen) {
            window.history.back();
        } else {
            document.getElementById("modalDetalle").classList.remove("visible");
        }
    };
    closeBtn.className = "backBtn";
    closeBtn.style.cssText = "color:white; background:#dc3545; border:none; margin:0;";
    headerDiv.appendChild(closeBtn);
    cont.appendChild(headerDiv);

    // Comentario: Se refactoriza para usar appendChild y evitar `innerHTML +=` que es propenso a errores.
    if (item.imagen) {
        const img = document.createElement("img");
        setOptimizedImage(img, item.imagen, IMG_SIZE_MEDIUM);
        img.style.width = "100%";
        img.style.borderRadius = "8px";
        img.onclick = () => {
            const highResImgUrl = getImageUrl(item.imagen, IMG_SIZE_LARGE);
            window.abrirLightbox(highResImgUrl, 'lightboxImg');
        };
        cont.appendChild(img);
    }

    const details = [
        createDetailParagraph('Función', item.funcion),
        createDetailParagraph('Vehículos Comunes', item.vehiculoDondeSeUtiliza),
        createDetailParagraph('Observación', item.observacion)
    ];

    details.forEach(detail => {
        if (detail) cont.appendChild(detail);
    });

    const modalDetalle = document.getElementById("modalDetalle");
    modalDetalle.dataset.modalType = 'relay';
    modalDetalle.classList.add("visible");
    if (window.history && window.history.pushState) {
        window.history.pushState({ modalOpen: true }, '');
    }
}


/* TAREA 9 (2.1): BOTÓN DE REPORTE INDIVIDUAL EN CADA CORTE Y MODAL DE REPORTE */
export function openReportCutModal(vehicleId, corteNum, currentCutData) {
    const existing = document.getElementById("report-cut-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "report-cut-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2500";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";
    const reportId = `REP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-triangle-exclamation" style="color: #dc3545;"></i> Reportar Problema en Corte #${corteNum}</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">
            Corte seleccionado: <strong>${currentCutData.tipo || 'Sin tipo definido'}</strong>
        </p>

        <form id="report-cut-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label>Descripción del Error Detectado *</label>
                <textarea id="rep-error" rows="3" placeholder="Describe claramente el problema o fallo detectado..." required></textarea>
            </div>
            <div class="form-group">
                <label for="rep-testigo-motor" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="rep-testigo-motor">
                    Este corte activa el testigo del motor
                </label>
            </div>
            <div class="form-group">
                <label>Información Incorrecta o Incompleta</label>
                <textarea id="rep-incorrecto" rows="2" placeholder="Indica qué datos específicos considera erróneos o incompletos..."></textarea>
            </div>
            <div class="form-group">
                <label>Imagen de Referencia (Opcional)</label>
                <input type="file" id="rep-img-file" accept="image/*">
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">Enviar Reporte</button>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector(".info-close-btn");
    closeBtn.onclick = () => modal.remove();

    const form = content.querySelector("#report-cut-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const { currentUser } = getState();
        if (!currentUser) {
            showGlobalError("Debes estar conectado para reportar.");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.classList.add("btn-loading");

        const errorDesc = content.querySelector("#rep-error").value.trim();
        const incorrectInfo = content.querySelector("#rep-incorrecto").value.trim();
        let fullProblemText = `[Corte #${corteNum}] ${errorDesc}`;
        if (incorrectInfo) {
            fullProblemText += ` | Info incorrecta: ${incorrectInfo}`;
        }

        const fileInput = content.querySelector("#rep-img-file");
        if (fileInput.files && fileInput.files[0]) {
            fullProblemText += ` [Imagen de referencia adjunta: ${fileInput.files[0].name}]`;
        }

        try {
            const activaTestigoMotor = content.querySelector("#rep-testigo-motor").checked;
            const res = await reportProblem(
                vehicleId,
                fullProblemText,
                {
                    reportId,
                    corteIndex: Number(corteNum),
                    activaTestigoMotor
                },
                getSessionPayload_()
            );

            const confirmedReportId = res && res.reportId ? res.reportId : reportId;
            modal.remove();

            // Modal de confirmación con opción accesible de «Sugerir cambio»
            showReportSuccessModal(vehicleId, corteNum, currentCutData, confirmedReportId);
        } catch (err) {
            console.error("Error al enviar reporte de corte:", err);
            showGlobalError("Error al enviar el reporte. Por favor inténtalo de nuevo.");
            submitBtn.disabled = false;
            submitBtn.classList.remove("btn-loading");
        }
    };
}

// Modal de confirmación accesible posterior al reporte con opción «Sugerir cambio»
function showReportSuccessModal(vehicleId, corteNum, currentCutData, reportId) {
    const existing = document.getElementById("report-success-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "report-success-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2500";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "450px";
    content.style.textAlign = "center";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <div style="font-size: 2.5rem; color: #28a745; margin-bottom: 10px;">
            <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 style="margin: 0 0 10px 0;">¡Reporte Enviado con Éxito!</h3>
        <p style="font-size: 0.9em; color: var(--text-color); margin-bottom: 15px;">
            Tu reporte para el Corte #${corteNum} ha sido registrado bajo el identificador <strong>${reportId}</strong>.
        </p>
        <p style="font-size: 0.9em; color: var(--text-color); margin-bottom: 20px;">
            ¿Deseas proponer una sugerencia de cambio técnica para este corte ahora mismo?
        </p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="btn-suggest-change-action" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-pen-to-square"></i> Sugerir cambio
            </button>
            <button id="btn-close-report-success" class="btn btn-secondary">
                Cerrar
            </button>
        </div>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const close = () => modal.remove();
    content.querySelector(".info-close-btn").onclick = close;
    content.querySelector("#btn-close-report-success").onclick = close;

    content.querySelector("#btn-suggest-change-action").onclick = () => {
        modal.remove();
        openSuggestCutModal(vehicleId, corteNum, currentCutData, reportId);
    };
}

/* TAREA 9 (2.2): MODAL DE SUGERENCIA DE CAMBIOS VINCULADA AL CORTE Y ACCESO SEGURO */
export function openSuggestCutModal(vehicleId, corteNum, currentCutData = {}, reportId = "") {
    const existing = document.getElementById("suggest-cut-modal");
    if (existing) existing.remove();

    // Asegurar número de corte numérico válido
    const validCorteNum = corteNum || currentCutData.index || 1;
    const reportRef = reportId || `REP-${Date.now()}`;

    const modal = document.createElement("div");
    modal.id = "suggest-cut-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2500";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "520px";

    // Obtención segura de opciones de menú desplegable para evitar ReferenceError
    const safeDropdowns = (typeof dropdownOptions !== "undefined" && dropdownOptions)
        || (typeof window !== "undefined" && window.dropdownOptions)
        || (typeof getState === "function" && getState() && getState().dropdownOptions)
        || null;

    // Opciones para tipo de corte
    const defaultTipos = ["Bomba de combustible", "Ignición", "Marcha / Arranque", "Fusible Principal", "Sensor CKP / CMP", "No recomendado"];
    const tiposCorteOptions = (safeDropdowns && safeDropdowns.tipoDeCorte && safeDropdowns.tipoDeCorte.length > 0)
        ? safeDropdowns.tipoDeCorte
        : defaultTipos;

    const tipoOptionsHtml = tiposCorteOptions.map(opt => {
        const isSel = (currentCutData.tipo && currentCutData.tipo.toLowerCase() === opt.toLowerCase()) ? "selected" : "";
        return `<option value="${opt}" ${isSel}>${opt}</option>`;
    }).join("");

    // Opciones para configuración de relay
    const defaultRelays = ["Sin relay", "Relay 5 pines (Normalmente Cerrado)", "Relay 5 pines (Normalmente Abierto)", "Relay 4 pines"];
    const relayOptions = (safeDropdowns && safeDropdowns.configRelay && safeDropdowns.configRelay.length > 0)
        ? safeDropdowns.configRelay
        : defaultRelays;

    const relayOptionsHtml = relayOptions.map(opt => {
        const isSel = (currentCutData.configRelay && currentCutData.configRelay.toLowerCase() === opt.toLowerCase()) ? "selected" : "";
        return `<option value="${opt}" ${isSel}>${opt}</option>`;
    }).join("");

    // El estado actual procede del mismo contrato normalizado que utiliza el detalle del corte.
    const currentTestigoValue = normalizeActivaTestigoValue(currentCutData.activaTestigo);

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-pen-to-square"></i> Sugerir Cambio - Corte #${validCorteNum}</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;">
            Vinculado al Reporte: <strong>${reportRef}</strong> | Vehículo: <strong>${vehicleId}</strong>
        </p>

        <form id="suggest-cut-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label for="sug-tipo">Tipo de Corte</label>
                <select id="sug-tipo" class="dev-input" style="padding: 6px;">
                    <option value="">-- Conservar / Seleccionar Tipo --</option>
                    ${tipoOptionsHtml}
                </select>
            </div>
            <div class="form-group">
                <label for="sug-relay">Configuración de Relay</label>
                <select id="sug-relay" class="dev-input" style="padding: 6px;">
                    <option value="">-- Conservar / Seleccionar Relay --</option>
                    ${relayOptionsHtml}
                </select>
            </div>
            <div class="form-group">
                <label for="sug-ubicacion">Ubicación / Detalles Técnicos del Corte</label>
                <input type="text" id="sug-ubicacion" value="${currentCutData.ubicacion || ""}" placeholder="Ej. Bajo el asiento trasero, ramal principal izquierdo">
            </div>
            <div class="form-group">
                <label for="sug-color">Color de Cable</label>
                <input type="text" id="sug-color" value="${currentCutData.colorCable || ""}" placeholder="Ej. Azul / Blanco, Verde grueso">
            </div>
            <div class="form-group">
                <label for="sug-check-engine">¿El corte activa el testigo de motor (Check Engine)?</label>
                <select id="sug-check-engine" class="dev-input" style="padding: 6px;">
                    <option value="unspecified" ${currentTestigoValue === null ? 'selected' : ''}>No aplica / No especificado</option>
                    <option value="true" ${currentTestigoValue === true ? 'selected' : ''}>Sí, activa testigo</option>
                    <option value="false" ${currentTestigoValue === false ? 'selected' : ''}>No activa testigo</option>
                </select>
            </div>
            <div class="form-group">
                <label for="sug-img-file">Imagen de Referencia del Corte (Opcional)</label>
                <input type="file" id="sug-img-file" accept="image/*">
            </div>
            <div class="form-group">
                <label for="sug-detalles">Explicación y Justificación del Cambio *</label>
                <div class="rich-editor-toolbar" data-rich-target="sug-detalles"></div>
                <textarea id="sug-detalles" rows="3" placeholder="Explica claramente por qué propones este cambio en el corte..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:8px;">Enviar Sugerencia</button>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector(".info-close-btn");
    closeBtn.onclick = () => modal.remove();

    const form = content.querySelector("#suggest-cut-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const { currentUser } = getState();
        if (!currentUser) {
            showGlobalError("Debes estar conectado para sugerir un cambio.");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.classList.add("btn-loading");
        submitBtn.innerText = "Enviando...";

        const fileInput = content.querySelector("#sug-img-file");
        let imgBase64 = "";

        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            imgBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (re) => resolve(re.target.result);
                reader.readAsDataURL(file);
            });
        }

        const proposedValues = {
            tipo: content.querySelector("#sug-tipo").value.trim() || currentCutData.tipo || "",
            ubicacion: content.querySelector("#sug-ubicacion").value.trim(),
            colorCable: content.querySelector("#sug-color").value.trim(),
            configRelay: content.querySelector("#sug-relay").value.trim() || currentCutData.configRelay || "",
            activaTestigo: content.querySelector("#sug-check-engine").value === "true" ? true :
                (content.querySelector("#sug-check-engine").value === "false" ? false : null)
        };

        const payload = {
            reportId: reportRef,
            vehicleId,
            corteIndex: validCorteNum,
            ...getSessionPayload_(),
            details: content.querySelector("#sug-detalles").value.trim(),
            imgBase64,
            proposedValues
        };

        try {
            await suggestCutChange(payload);
            modal.remove();
            showGlobalNotification("Sugerencia enviada correctamente. Será revisada por un administrador.", "success");
        } catch (err) {
            console.error("Error al enviar sugerencia:", err);
            showGlobalError("Error al guardar la sugerencia: " + err.message);
            submitBtn.disabled = false;
            submitBtn.classList.remove("btn-loading");
            submitBtn.innerText = "Enviar Sugerencia";
        }
    };
}


/* TAREA 5 (3.1): MENÚ DINÁMICO DE AMPLIACIÓN EN EL MODAL DE DETALLE Y CÁLCULO DE ESPACIOS */
export function openExpandMenuModal(item) {
    // Tarea 3.1: Botón "+" y menú dinámico de ampliación en el modal de detalle
    const existing = document.getElementById("expand-menu-modal");
    if (existing) existing.remove();

    // Calculate available slots
    let cutsCount = 0;
    if (item.tipoCorte1) cutsCount++;
    if (item.tipoCorte2) cutsCount++;
    if (item.tipoCorte3) cutsCount++;
    const cutsAvailable = 3 - cutsCount;

    let feedsCount = 0;
    if (item.cableAlimen) feedsCount++;
    if (item.cableAlimen2) feedsCount++;
    if (item.cableAlimen3) feedsCount++;
    const feedsAvailable = 3 - feedsCount;

    // Lógica para determinar la cantidad de versiones y la disponibilidad del botón "Agregar VIN"
    function countEquipmentVersionsFrontend(versionesStr) {
        if (!versionesStr) return 1;
        const str = String(versionesStr).trim();
        if (!str) return 1;
        const parts = str.split(/[,/\\;]+/).map(p => p.trim()).filter(Boolean);
        const count = parts.length;
        if (count <= 1) return 1;
        if (count === 2) return 2;
        return 3;
    }

    const maxVinAllowed = countEquipmentVersionsFrontend(item.versionesAplicables);
    const registeredVins = parseVinCollection(item.vin);
    // Permitir agregar VIN si aún hay cupo o para asociar una nueva versión de equipamiento (hasta un tope de 3)
    const canAddVin = registeredVins.length < maxVinAllowed || registeredVins.length < 3;

    const modal = document.createElement("div");
    modal.id = "expand-menu-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2100";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "400px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-circle-plus"></i> Ampliar Información</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">${item.marca} ${item.modelo} (${item.anoDesde}-${item.anoHasta})</p>

        <div style="display:flex; flex-direction:column; gap:8px;">
            ${cutsAvailable > 0 ? `<button id="btn-exp-cut" class="btn btn-secondary btn-expand-option"><i class="fa-solid fa-car-on"></i> Nuevo corte (${cutsAvailable} disponibles)</button>` : ""}
            ${!item.apertura ? `<button id="btn-exp-apertura" class="btn btn-secondary btn-expand-option"><i class="fa-solid fa-door-open"></i> Apertura de puertas</button>` : ""}
            ${feedsAvailable > 0 ? `<button id="btn-exp-feed" class="btn btn-secondary btn-expand-option"><i class="fa-solid fa-plug"></i> Cable de alimentación (${feedsAvailable} disponibles)</button>` : ""}
            ${!item.videoGuiaDesarmeUrl ? `<button id="btn-exp-video" class="btn btn-secondary btn-expand-option"><i class="fa-brands fa-youtube"></i> Agregar enlace de vídeo</button>` : ""}
            ${canAddVin ? `<button id="btn-exp-vin" class="btn btn-secondary btn-expand-option"><i class="fa-solid fa-barcode"></i> Agregar VIN (${maxVinAllowed - registeredVins.length} disponible${maxVinAllowed - registeredVins.length > 1 ? 's' : ''})</button>` : ""}
            <button id="btn-exp-pys" class="btn btn-secondary btn-expand-option"><i class="fa-solid fa-triangle-exclamation"></i> Agregar problema relacionado</button>
        </div>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const cutBtn = content.querySelector("#btn-exp-cut");
    if (cutBtn) cutBtn.onclick = () => { modal.remove(); openAddCutForModelModal(item); };

    const apBtn = content.querySelector("#btn-exp-apertura");
    if (apBtn) apBtn.onclick = () => { modal.remove(); openAddAperturaModal(item); };

    const feedBtn = content.querySelector("#btn-exp-feed");
    if (feedBtn) feedBtn.onclick = () => { modal.remove(); openAddFeedModal(item); };

    const videoBtn = content.querySelector("#btn-exp-video");
    if (videoBtn) {
        if (String(item.videoGuiaDesarmeUrl || item.Video || "").trim()) {
            videoBtn.disabled = true;
            videoBtn.textContent = "Vídeo ya asociado";
        } else {
            videoBtn.onclick = () => { modal.remove(); openAddVideoModal(item); };
        }
    }

    const vinBtn = content.querySelector("#btn-exp-vin");
    if (vinBtn) vinBtn.onclick = () => { modal.remove(); openAddVinModal(item); };

    const pysBtn = content.querySelector("#btn-exp-pys");
    if (pysBtn) pysBtn.onclick = () => { modal.remove(); openAssociateExistingProblemModal(item); };
}

/* TAREA 4 (11.4, 11.5, 11.6): AMPLIACIÓN DE DETALLES CON VIN Y GESTIÓN SEGÚN EQUIPAMIENTO / RECTIFICACIÓN SELECTOR TRIM LEVEL */
export function openAddVinModal(item) {
    const existing = document.getElementById("add-vin-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-vin-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "450px";

    // Verificar si el modelo tiene versiones de equipamiento registradas
    const versions = parseEquipmentVersions(item.versionesAplicables);

    let trimLevelSectionHtml = "";
    if (versions.length > 0) {
        const optionsHtml = versions.map(v => `<option value="${v}">${v}</option>`).join("");
        trimLevelSectionHtml = `
            <div class="form-group">
                <label for="modal-vin-trim">Versión de Equipamiento (Trim Level)</label>
                <select id="modal-vin-trim" required style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border-color, #ccc); background:var(--modal-bg, #fff); color:var(--text-color, #333);">
                    <option value="" selected disabled>Seleccionar Trim Level</option>
                    ${optionsHtml}
                    <option value="__NEW_TRIM__">+ Crear nueva versión de equipamiento...</option>
                </select>
            </div>
            <div class="form-group" id="grp-new-trim" style="display:none;">
                <label for="modal-new-trim-input">Nombre de la Nueva Versión</label>
                <input type="text" id="modal-new-trim-input" placeholder="Ej: Platinum, SR5, High Country" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border-color, #ccc);">
            </div>
        `;
    } else {
        // Si el modelo no tiene ninguna versión registrada
        trimLevelSectionHtml = `
            <div class="form-group" id="grp-new-trim">
                <label for="modal-new-trim-input">Versión de Equipamiento (Trim Level)</label>
                <input type="text" id="modal-new-trim-input" required placeholder="Ej: Base, Standard, Full" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border-color, #ccc);">
            </div>
        `;
    }

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-barcode"></i> Agregar VIN / Chasis</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">${item.marca} ${item.modelo} (${item.anoDesde}-${item.anoHasta})</p>

        <form id="add-vin-form" style="display:flex; flex-direction:column; gap:12px;">
            ${trimLevelSectionHtml}
            <div class="form-group">
                <label for="modal-vin-input">Número de Chasis / VIN</label>
                <input type="text" id="modal-vin-input" placeholder="Ingresa el VIN completo del vehículo" maxlength="18" required style="text-transform: uppercase; width:100%; padding:8px;">
                <div id="modal-vin-warning" style="display: none; color: #dc3545; font-size: 0.85em; margin-top: 5px; font-weight: bold;"></div>
            </div>
            <div class="modal-btn-compact-container">
                <button type="submit" id="btn-save-vin" class="btn btn-primary btn-modal-action-compact"><i class="fa-solid fa-save"></i> Guardar VIN</button>
            </div>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const form = content.querySelector("#add-vin-form");
    const vinInput = content.querySelector("#modal-vin-input");
    const warningEl = content.querySelector("#modal-vin-warning");
    const trimSelect = form.querySelector("#modal-vin-trim");
    const grpNewTrim = form.querySelector("#grp-new-trim");
    const newTrimInput = form.querySelector("#modal-new-trim-input");

    if (trimSelect && grpNewTrim && newTrimInput) {
        trimSelect.addEventListener("change", () => {
            if (trimSelect.value === "__NEW_TRIM__") {
                grpNewTrim.style.display = "block";
                newTrimInput.required = true;
                newTrimInput.focus();
            } else {
                grpNewTrim.style.display = "none";
                newTrimInput.required = false;
                newTrimInput.value = "";
            }
        });
    }

    const getVinInputError = value => {
        const normalized = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!normalized) return "Ingresa un VIN válido.";
        if (normalized.length <= 5) return "El VIN debe contener más de cinco caracteres; los últimos cinco se reservan para el número serial.";
        if (normalized.length > 18) return "El VIN normalizado no puede superar 18 caracteres.";
        return "";
    };
    vinInput.addEventListener('blur', async () => {
        const vinVal = vinInput.value.trim();
        if (!vinVal) { warningEl.style.display = 'none'; return; }
        const validationError = getVinInputError(vinVal);
        if (validationError) { warningEl.textContent = validationError; warningEl.style.display = 'block'; return; }
        try {
            const res = await routeAction('checkVinDuplicate', { vin: vinVal, currentVehicleId: item.id });
            if (!res || !["success", "duplicate"].includes(res.status)) throw new Error(res && res.message || "No se pudo validar el VIN.");
            if (res.duplicate) {
                warningEl.style.display = 'block';
                warningEl.innerHTML = `VIN ya está registrado para: <button type="button" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.85em; margin-left: 5px;" onclick="document.getElementById('add-vin-modal')?.remove(); window.location.href='index.html#search=${encodeURIComponent(res.modelName)}'"><strong>${res.modelName}</strong></button>`;
            } else {
                warningEl.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al validar VIN:', err);
        }
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const vinVal = vinInput.value.trim();
        const validationError = getVinInputError(vinVal);
        if (validationError) { warningEl.textContent = validationError; warningEl.style.display = "block"; vinInput.focus(); return; }

        let selectedTrim = null;
        let isNewTrim = false;

        if (trimSelect) {
            if (!trimSelect.value || trimSelect.value === "") {
                alert("Por favor selecciona una versión de equipamiento (Trim Level).");
                trimSelect.focus();
                return;
            }
            if (trimSelect.value === "__NEW_TRIM__") {
                const customTrim = newTrimInput ? newTrimInput.value.trim() : "";
                if (!customTrim) {
                    alert("Por favor ingresa el nombre de la nueva versión de equipamiento.");
                    if (newTrimInput) newTrimInput.focus();
                    return;
                }
                selectedTrim = customTrim;
                isNewTrim = true;
            } else {
                selectedTrim = trimSelect.value.trim();
            }
        } else if (newTrimInput) {
            const customTrim = newTrimInput.value.trim();
            if (!customTrim) {
                alert("Por favor ingresa la versión de equipamiento.");
                newTrimInput.focus();
                return;
            }
            selectedTrim = customTrim;
            isNewTrim = true;
        }

        const { currentUser } = getState();
        if (!currentUser || !currentUser.ID || !currentUser.SessionToken) {
            warningEl.textContent = "Debes iniciar sesión nuevamente para registrar un VIN.";
            warningEl.style.display = "block";
            return;
        }
        const btn = form.querySelector("#btn-save-vin");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

        try {
            const res = await routeAction('addVinToVehicle', {
                vehicleId: item.id,
                vin: vinVal,
                trimLevel: selectedTrim,
                isNewTrim: isNewTrim,
                userId: currentUser.ID,
                sessionToken: currentUser.SessionToken
            });
            if (res.status === 'success') {
                if (res.vinCollection) {
                    item.vin = serializeVinCollection(res.vinCollection);
                } else if (res.vinPrefix) {
                    item.vin = serializeVinCollection([res.vinPrefix]);
                }
                if (res.versionesAplicables) {
                    item.versionesAplicables = res.versionesAplicables;
                } else if (isNewTrim && selectedTrim) {
                    const currentVersions = parseEquipmentVersions(item.versionesAplicables);
                    if (!currentVersions.some(v => v.toLowerCase() === selectedTrim.toLowerCase())) {
                        currentVersions.push(selectedTrim);
                        item.versionesAplicables = currentVersions.join(" / ");
                    }
                }
                modal.remove();
                mostrarNotificacion('VIN registrado correctamente', 'success');
                // Recalcular y sincronizar automáticamente las firmas de VIN (Sección 10)
                try {
                    const catalogData = getState().catalogData;
                    if (catalogData && catalogData.cortes) {
                        const target = catalogData.cortes.find(c => String(c.id) === String(item.id));
                        if (target) {
                            target.vin = item.vin;
                            target.versionesAplicables = item.versionesAplicables;
                        }
                        vinDifferentialEngine.calculateSignatures(catalogData.cortes);
                        vinSignatureStore.saveSignatures(vinDifferentialEngine);
                    }
                } catch(e) {
                    console.error('Error recalculando firmas de VIN tras registro:', e);
                }
                mostrarDetalleModal(item, true);
            } else {
                warningEl.style.display = 'block';
                if (res.modelName) {
                    warningEl.innerHTML = `VIN ya está registrado para: <button type="button" class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.85em; margin-left: 5px;" onclick="document.getElementById('add-vin-modal')?.remove(); window.location.href='index.html#search=${encodeURIComponent(res.modelName)}'"><strong>${res.modelName}</strong></button>`;
                } else {
                    warningEl.textContent = res.message || 'Error al guardar el VIN.';
                }
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-save"></i> Guardar VIN`;
            }
        } catch (err) {
            console.error('Error guardando VIN:', err);
            mostrarNotificacion('Error de comunicación con el servidor', 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-save"></i> Guardar VIN`;
        }
    };
}

/* TAREA 1.1: CONFIGURACIÓN DE RELAY EN EL FORMULARIO DE AGREGAR CORTE DEL BOTÓN «+» / TAREA 5 (3.2): AGREGAR UN NUEVO CORTE DESDE EL MODAL DE DETALLE */
export function openAddCutForModelModal(item) {
    const vehicleId = String(item && item.id !== undefined && item.id !== null ? item.id : "").trim();
    if (!vehicleId) {
        showGlobalError("No se pudo identificar el vehículo para agregar el corte.");
        return;
    }

    const existing = document.getElementById("add-cut-for-model-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-cut-for-model-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-plus-circle"></i> Agregar Nuevo Corte</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">Modelo: ${item.marca} ${item.modelo}</p>
        <div id="add-cut-pending-notice" role="status" style="display:none; padding:10px; border-radius:8px; background:var(--surface-secondary, rgba(0,123,255,0.08)); font-size:0.9em;"></div>

        <form id="add-cut-model-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label>Tipo de Corte</label>
                <select id="add-cut-tipo" required>
                    <option value="" selected disabled>Seleccione una opción</option>
                    <option value="Bomba de combustible">Bomba de combustible</option>
                    <option value="Ignición">Ignición</option>
                    <option value="Botón de encendido">Botón de encendido</option>
                    <option value="No recomendado">No recomendado</option>
                </select>
            </div>
            <div class="form-group">
                <label>Configuración Relay</label>
                <select id="add-cut-relay" required>
                    <option value="" selected disabled>Seleccione una opción</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ubicación y Detalles del Corte</label>
                <div class="rich-editor-toolbar" data-rich-target="add-cut-detalles"></div>
                <textarea id="add-cut-detalles" rows="3" placeholder="Detalles de ubicación y conexión..." required></textarea>
            </div>
            <div class="form-group">
                <label>Color del Cable</label>
                <input type="text" id="add-cut-color" placeholder="Ej. Verde / Negro">
            </div>
            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:4px 0;">
                <label for="add-cut-testigo" style="margin:0; cursor:pointer;">Este corte activa el testigo del motor</label>
                <input type="checkbox" id="add-cut-testigo" style="width:18px; height:18px; cursor:pointer; margin:0; flex-shrink:0;">
            </div>
            <div class="form-group">
                <label>Subir Imagen del Corte</label>
                <input type="file" id="add-cut-img-file" accept="image/*">
            </div>
            <div class="modal-btn-compact-container">
                <button type="submit" class="btn btn-primary btn-modal-action-compact" disabled><i class="fa-solid fa-plus-circle"></i> Comprobando operación...</button>
            </div>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const tipoSelect = content.querySelector("#add-cut-tipo");
    const relaySelect = content.querySelector("#add-cut-relay");
    const detailsInput = content.querySelector("#add-cut-detalles");
    const colorInput = content.querySelector("#add-cut-color");
    const testigoInput = content.querySelector("#add-cut-testigo");
    const fileInput = content.querySelector("#add-cut-img-file");
    const pendingNotice = content.querySelector("#add-cut-pending-notice");
    const form = content.querySelector("#add-cut-model-form");
    const submitBtn = form.querySelector('button[type="submit"]');
    const editableControls = [tipoSelect, relaySelect, detailsInput, colorInput, testigoInput, fileInput];

    let pendingOperation = null;
    let pendingOperationLoadFailed = false;
    let submitInProgress = false;

    const showPendingNotice = (message) => {
        pendingNotice.textContent = message;
        pendingNotice.style.display = "block";
    };

    const lockFormForPendingOperation = () => {
        editableControls.forEach(control => { control.disabled = true; });
        submitBtn.disabled = false;
        submitBtn.innerText = "Reintentar guardado pendiente";
    };

    const isValidPendingOperation = (operation) => {
        const cutData = operation && operation.cutData;
        return Boolean(
            operation &&
            /^OP-[a-zA-Z0-9_-]+$/.test(String(operation.id || "")) &&
            String(operation.vehicleId) === vehicleId &&
            String(operation.userId || "").trim() !== "" &&
            ["processing", "failed", "completed"].includes(String(operation.status || "")) &&
            cutData && typeof cutData === "object" &&
            typeof cutData.tipoCorte1 === "string" &&
            typeof cutData.configRelay1 === "string" &&
            typeof cutData.ubicacionCorte1 === "string" &&
            typeof cutData.colorCableCorte1 === "string" &&
            typeof cutData.activaTestigo1 === "boolean" &&
            typeof cutData.imgCorte1 === "string"
        );
    };

    const applyPendingOperation = (operation) => {
        if (!isValidPendingOperation(operation)) return false;
        const { currentUser } = getState();
        if (!currentUser || !currentUser.ID || String(operation.userId) !== String(currentUser.ID)) return false;
        pendingOperation = operation;
        const savedCut = operation.cutData;

        tipoSelect.value = savedCut.tipoCorte1 || "";
        const savedRelay = String(savedCut.configRelay1 || "");
        if (savedRelay && !Array.from(relaySelect.options).some(option => option.value === savedRelay)) {
            const option = document.createElement("option");
            option.value = savedRelay;
            option.textContent = savedRelay;
            relaySelect.appendChild(option);
        }
        relaySelect.value = savedRelay;
        detailsInput.value = savedCut.ubicacionCorte1 || "";
        colorInput.value = savedCut.colorCableCorte1 || "";
        testigoInput.checked = savedCut.activaTestigo1 === true;
        syncNoRecomendadoState();
        lockFormForPendingOperation();
        showPendingNotice("Existe un agregado pendiente para este vehículo. Se conservaron los datos originales, incluida la imagen. El reintento utilizará la misma clave para evitar duplicados; los campos permanecen bloqueados para no alterar una operación que pudo haberse completado.");
        return true;
    };

    const populateRelayOptions = (options) => {
        relaySelect.innerHTML = '<option value="" selected disabled>Seleccione una opción</option>';
        const list = Array.isArray(options) && options.length > 0
            ? options
            : ["Corte a ignición", "5 pines NC", "5 pines NA", "Sin relay"];

        list.forEach(opt => {
            const el = document.createElement("option");
            el.value = opt;
            el.textContent = opt;
            relaySelect.appendChild(el);
        });
        if (!relaySelect.value) relaySelect.value = "";
    };

    function syncNoRecomendadoState() {
        const isNoRec = isNoRecomendadoValue(tipoSelect.value);
        if (isNoRec) {
            relaySelect.disabled = true;
            relaySelect.required = false;
            relaySelect.value = "";
        } else {
            relaySelect.disabled = Boolean(pendingOperation);
            relaySelect.required = !pendingOperation;
        }
    }

    tipoSelect.onchange = syncNoRecomendadoState;

    const relayOptionsPromise = (async () => {
        try {
            const dropdowns = await precargarDropdownOptions();
            if (dropdowns && dropdowns.configRelay) {
                populateRelayOptions(dropdowns.configRelay);
            } else {
                populateRelayOptions([]);
            }
        } catch (error) {
            console.error("Error cargando opciones de relay para modal:", error);
            populateRelayOptions([]);
        }
        syncNoRecomendadoState();
    })();

    async function restorePendingOperation() {
        const { currentUser } = getState();
        const ownerId = String(currentUser && currentUser.ID || "").trim();
        if (!ownerId) {
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("No se pudo identificar la cuenta activa. No se habilitó un nuevo envío.");
            return;
        }
        const stored = await offline.getAddCutPendingOperation(vehicleId, ownerId);
        if (!stored || stored.available !== true) {
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("No se pudo consultar el almacenamiento local de operaciones pendientes. No se habilitó un nuevo envío para evitar duplicados. Recarga la aplicación e inténtalo nuevamente.");
            return;
        }

        if (!stored.operation) {
            pendingNotice.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.innerText = "Agregar Corte";
            return;
        }

        const operation = stored.operation;
        if (!applyPendingOperation(operation)) {
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("Se encontró un registro pendiente con datos incompletos o incompatibles. Se bloqueó un nuevo agregado para evitar duplicaciones. Requiere revisión antes de continuar.");
        }
    }

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    (async () => {
        try {
            await relayOptionsPromise;
            await restorePendingOperation();
        } catch (error) {
            console.error("No se pudo recuperar la operación pendiente del modal:", error);
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("No se pudo comprobar si existe una operación anterior. No se habilitó un nuevo envío para evitar duplicados.");
        }
    })();

    form.onsubmit = async (e) => {
        e.preventDefault();
        if (submitInProgress) return;
        if (pendingOperationLoadFailed) {
            showGlobalError("No se pudo verificar el estado local de las operaciones pendientes. No se envió el corte.");
            return;
        }

        const { currentUser } = getState();
        if (!currentUser) { showGlobalError("Debes estar conectado."); return; }
        if (!currentUser.ID || !currentUser.SessionToken) {
            showGlobalError("Tu sesión ha expirado. Inicia sesión nuevamente.");
            return;
        }

        submitInProgress = true;
        submitBtn.disabled = true;
        submitBtn.innerText = pendingOperation ? "Reintentando..." : "Guardando...";
        let persistedForAttempt = Boolean(pendingOperation);

        try {
            if (!pendingOperation) {
                const file = fileInput.files && fileInput.files[0];
                let imgBase64 = "";
                if (file) {
                    imgBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target.result);
                        reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen seleccionada."));
                        reader.readAsDataURL(file);
                    });
                }

                const cutData = {
                    tipoCorte1: tipoSelect.value,
                    configRelay1: relaySelect.value,
                    ubicacionCorte1: detailsInput.value,
                    colorCableCorte1: colorInput.value,
                    activaTestigo1: testigoInput.checked,
                    imgCorte1: imgBase64
                };
                const operation = {
                    id: "OP-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
                    vehicleId,
                    userId: String(currentUser.ID),
                    cutData,
                    status: "processing",
                    createdAt: new Date().toISOString()
                };

                const saveResult = await offline.saveAddCutPendingOperation(operation);
                if (!saveResult || saveResult.saved !== true) {
                    if (saveResult && saveResult.conflict && saveResult.operation) {
                        if (applyPendingOperation(saveResult.operation)) {
                            showGlobalError("Ya existe una operación pendiente para este vehículo. Se restauraron sus datos; reintenta esa misma operación.");
                        } else {
                            pendingOperationLoadFailed = true;
                            submitBtn.disabled = true;
                            showPendingNotice("Existe otra operación pendiente para este vehículo, pero no se pudo recuperar su contenido. No se enviará un nuevo corte.");
                        }
                        return;
                    }
                    throw new Error("No se pudo guardar la operación pendiente en el almacenamiento local. No se envió el corte para evitar duplicaciones.");
                }

                pendingOperation = operation;
                persistedForAttempt = true;
                lockFormForPendingOperation();
                showPendingNotice("Operación guardada localmente. Se está enviando al servidor con una clave única de recuperación.");
            }

            const latestUser = getState().currentUser;
            const latestUserId = String(latestUser && latestUser.ID || "").trim();
            if (!latestUserId || latestUserId !== String(pendingOperation.userId || "").trim() ||
                !latestUser.SessionToken) {
                throw new Error("La cuenta o sesión cambió. Inicia sesión con la cuenta propietaria para reintentar la operación pendiente.");
            }
            const result = await routeAction("addOrUpdateCut", {
                userId: latestUser.ID,
                sessionToken: latestUser.SessionToken,
                vehicleId: item.id,
                cutData: pendingOperation.cutData,
                opId: pendingOperation.id
            });

            if (!result || result.status !== "success" || String(result.vehicleId) !== vehicleId) {
                throw new Error("El servicio no confirmó el agregado del corte para el vehículo esperado.");
            }

            const completedOpId = pendingOperation.id;
            const removed = await offline.removeAddCutPendingOperation(vehicleId, pendingOperation.userId, completedOpId);
            if (removed !== true) {
                console.warn("El corte fue confirmado, pero no se pudo retirar el registro local. Un reintento conservará el mismo opId.", completedOpId);
            }

            pendingOperation = null;
            alert("Corte agregado con éxito.");
            modal.remove();

            try {
                const catalogResult = await routeAction("getCatalogData");
                if (catalogResult && catalogResult.data) setState({ catalogData: catalogResult.data });
            } catch (refreshError) {
                console.error("El corte se guardó, pero no se pudo actualizar el catálogo:", refreshError);
                showGlobalError("El corte se guardó correctamente, pero no se pudo actualizar el catálogo. Vuelve a cargar la información.");
            }
        } catch (error) {
            console.error("Error agregando corte:", error);
            if (pendingOperation && persistedForAttempt) {
                pendingOperation.status = "failed";
                pendingOperation.lastError = String(error && error.message ? error.message : error);
                const saveResult = await offline.saveAddCutPendingOperation(pendingOperation);
                if (saveResult && saveResult.conflict && saveResult.operation) {
                    applyPendingOperation(saveResult.operation);
                } else {
                    lockFormForPendingOperation();
                    showPendingNotice("No se pudo confirmar la respuesta del servidor. La operación original permanece guardada; reintenta con el mismo opId y los mismos datos para evitar duplicados.");
                }
            } else {
                submitBtn.disabled = false;
                submitBtn.innerText = "Agregar Corte";
            }
            showGlobalError("No se pudo confirmar el agregado del corte: " + String(error && error.message ? error.message : error));
        } finally {
            submitInProgress = false;
            if (pendingOperation && !pendingOperationLoadFailed) submitBtn.disabled = false;
        }
    };
}

/* TAREA 5 (3.3): AGREGAR APERTURA DESDE EL MODAL DE DETALLE */
export function openAddAperturaModal(item) {
    const existing = document.getElementById("add-apertura-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-apertura-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-door-open"></i> Agregar Apertura de Puertas</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">${item.marca} ${item.modelo}</p>

        <form id="add-apertura-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label>Detalles de la Apertura</label>
                <div class="rich-editor-toolbar" data-rich-target="add-apertura-detalles"></div>
                <textarea id="add-apertura-detalles" rows="3" placeholder="Ubicación y color de cables de apertura..." required></textarea>
            </div>
            <div class="form-group">
                <label>Subir Imagen</label>
                <input type="file" id="add-apertura-img-file" accept="image/*">
            </div>
            <div class="modal-btn-compact-container">
                <button type="submit" class="btn btn-primary btn-modal-action-compact"><i class="fa-solid fa-door-open"></i> Agregar Apertura</button>
            </div>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const form = content.querySelector("#add-apertura-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";

        const fileInput = content.querySelector("#add-apertura-img-file");
        let imgBase64 = "";
        if (fileInput.files && fileInput.files[0]) {
            imgBase64 = await new Promise((res) => {
                const r = new FileReader();
                r.onload = (re) => res(re.target.result);
                r.readAsDataURL(fileInput.files[0]);
            });
        }

        try {
            await routeAction("addSupplementaryInfo", {
                ...getDeveloperSessionPayload(),
                vehicleId: item.id,
                apertura: content.querySelector("#add-apertura-detalles").value,
                imgApertura: imgBase64
            });
            alert("Apertura agregada con éxito.");
            modal.remove();
            const catRes = await routeAction("getCatalogData");
            if (catRes && catRes.data) setState({ catalogData: catRes.data });
        } catch (err) {
            console.error(err);
            showGlobalError("Error: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Agregar Apertura";
        }
    };
}

/* TAREA 5 (3.4): AGREGAR CABLE DE ALIMENTACIÓN DESDE EL MODAL DE DETALLE */
export function openAddFeedModal(item) {
    const existing = document.getElementById("add-feed-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-feed-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-plug"></i> Agregar Cable de Alimentación</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;">${item.marca} ${item.modelo}</p>

        <form id="add-feed-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label>Detalles de la Alimentación</label>
                <div class="rich-editor-toolbar" data-rich-target="add-feed-detalles"></div>
                <textarea id="add-feed-detalles" rows="3" placeholder="Detalles del cable positivo y tierra..." required></textarea>
            </div>
            <div class="form-group">
                <label>Subir Imagen</label>
                <input type="file" id="add-feed-img-file" accept="image/*">
            </div>
            <div class="modal-btn-compact-container">
                <button type="submit" class="btn btn-primary btn-modal-action-compact"><i class="fa-solid fa-plug"></i> Agregar Alimentación</button>
            </div>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const form = content.querySelector("#add-feed-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";

        const fileInput = content.querySelector("#add-feed-img-file");
        let imgBase64 = "";
        if (fileInput.files && fileInput.files[0]) {
            imgBase64 = await new Promise((res) => {
                const r = new FileReader();
                r.onload = (re) => res(re.target.result);
                r.readAsDataURL(fileInput.files[0]);
            });
        }

        const payload = { vehicleId: item.id };
        const details = content.querySelector("#add-feed-detalles").value;

        if (!item.cableAlimen) {
            payload.cableAlimen = details;
            payload.imgCableAlimen = imgBase64;
        } else if (!item.cableAlimen2) {
            payload.cableAlimen2 = details;
            payload.imgCableAlimen2 = imgBase64;
        } else if (!item.cableAlimen3) {
            payload.cableAlimen3 = details;
            payload.imgCableAlimen3 = imgBase64;
        }

        try {
            await routeAction("addSupplementaryInfo", { ...payload, ...getDeveloperSessionPayload() });
            alert("Cable de alimentación agregado con éxito.");
            modal.remove();
            const catRes = await routeAction("getCatalogData");
            if (catRes && catRes.data) setState({ catalogData: catRes.data });
        } catch (err) {
            console.error(err);
            showGlobalError("Error: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Agregar Alimentación";
        }
    };
}

/* TAREA 5 (3.5) & TAREA 8.3: AGREGAR ENLACE O SUBIR VÍDEO GUÍA DE DESARME DESDE EL MODAL DE DETALLE */
export function buildVehicleVideoMetadata(item) {
    const marca = item.marca || '';
    const modelo = item.modelo || '';
    const anoDesde = item.anoDesde || '';
    const anoHasta = item.anoHasta || '';
    const rangoAnos = anoHasta && String(anoHasta) !== String(anoDesde) ? `${anoDesde} - ${anoHasta}` : `${anoDesde}`;

    const rawVersions = item.versionesAplicables ? String(item.versionesAplicables).split(/[\/,\\]/).map(s => s.trim()).filter(Boolean) : [];
    const hasSingleVersion = rawVersions.length === 1;
    const singleVersion = hasSingleVersion ? rawVersions[0] : '';

    // Requisito 5.1: Título: Marca - Modelo [Versión si es única] [Rango Años]
    let titleParts = [marca, '-', modelo];
    if (hasSingleVersion && singleVersion) {
        titleParts.push(singleVersion);
    }
    if (rangoAnos.trim()) {
        titleParts.push(rangoAnos.trim());
    }
    const generatedTitle = titleParts.filter(Boolean).join(' ').replace(/\s+-\s+/, ' - ');

    // Requisito 5.2: Descripción: "En este video veremos cómo se trabaja..."
    let generatedDesc = '';
    if (hasSingleVersion && singleVersion) {
        generatedDesc = `En este video veremos cómo se trabaja ${modelo} ${singleVersion} ${rangoAnos}`.trim();
    } else {
        const encendido = item.tipoEncendido ? `${item.tipoEncendido}` : '';
        generatedDesc = `En este video veremos cómo se trabaja ${modelo} ${encendido} ${rangoAnos}`.replace(/\s+/g, ' ').trim();
        if (rawVersions.length > 1) {
            generatedDesc += `\nVersiones aplicables: ${rawVersions.join(' / ')}`;
        }
    }

    return {
        title: generatedTitle,
        description: generatedDesc
    };
}

export function openAddVideoModal(item) {
    const existing = document.getElementById("add-video-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-video-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";
    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-brands fa-youtube" style="color:#ff0000;"></i> Vídeo Guía de Desarme</h2>
        <p id="vehicle-video-context" style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;"></p>
        <p style="font-size:0.9em; margin-bottom:14px;">Los vídeos se suben como no listados y solo se muestran en la ficha después de aprobarse.</p>
        <button type="button" id="btn-open-yt-upload" class="btn btn-primary" style="width:100%; background-color:#ff0000; border-color:#ff0000;">
            <i class="fa-solid fa-cloud-arrow-up"></i> Subir vídeo a YouTube
        </button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);
    content.querySelector("#vehicle-video-context").textContent = [item.marca, item.modelo].filter(Boolean).join(" ");
    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const uploadButton = content.querySelector("#btn-open-yt-upload");
    const existingVideo = String(item.videoGuiaDesarmeUrl || item.Video || "").trim();
    if (existingVideo) {
        uploadButton.disabled = true;
        uploadButton.textContent = "Este contenido ya tiene un vídeo asociado";
    }
    uploadButton.onclick = () => {
        const meta = buildVehicleVideoMetadata(item);
        modal.remove();
        openYouTubeUploadModal({
            initialTitle: meta.title,
            initialDescription: meta.description,
            contentType: "corte",
            referenceId: item.id,
            metadata: {
                marca: item.marca,
                modelo: item.modelo,
                versionesAplicables: item.versionesAplicables,
                anoDesde: item.anoDesde,
                anoHasta: item.anoHasta,
                tipoEncendido: item.tipoEncendido
            },
            onSuccess: async () => {
                const fresh = await routeAction("getCatalogData");
                if (fresh && fresh.data) setState({ catalogData: fresh.data });
            }
        });
    };
}

/* TAREA 1.4: CORRECCIÓN DE LAS DEMORAS DE CARGA EN LA SECCIÓN PROBLEMAS Y SOLUCIONES */
export async function renderPysSection() {
    const cont = document.getElementById("contenido-pys");
    if (!cont) return;

    const renderGridWithItems = (rawItems) => {
        cont.innerHTML = "<h4>Problemas y Soluciones</h4>";
        const grid = document.createElement("div");
        grid.className = "grid";

        // Tarea 1.7: Corrección de las tarjetas para agregar tutoriales y problemas
        /* TAREA 10 (5.2): TARJETAS DE PYS Y TARJETA DE CREACIÓN (+) EN PRIMERA POSICIÓN */
        // First card: Creation Card (+)
        const createCard = document.createElement("div");
        createCard.className = "card card-create-pys";
        createCard.innerHTML = `
            <i class="fa-solid fa-plus" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
            <span>Agregar Problema</span>
        `;
        createCard.onclick = () => openAddProblemModal();
        grid.appendChild(createCard);

        const items = [...(rawItems || [])];
        items.reverse(); // Most recent first

        items.forEach(item => {
            const card = createPysCard(item, 'pys');
            grid.appendChild(card);
        });

        cont.appendChild(grid);
    };

    // TAREA 1.4: Retirar la animación de carga de la sección «Problemas / Soluciones»
    // Se presenta la sección inmediatamente con su estructura y tarjeta de creación (+) igual que Tutoriales y Relay
    let cachedData = getState().pysData;
    if ((!cachedData || cachedData.length === 0)) {
        try {
            const rawStored = localStorage.getItem('gpsepedia_pys_cache');
            if (rawStored) {
                const parsed = JSON.parse(rawStored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    cachedData = parsed;
                    setState({ pysData: parsed });
                }
            }
        } catch(e) {}
    }
    const hasCache = Array.isArray(cachedData) && cachedData.length > 0;
    renderGridWithItems(hasCache ? cachedData : []);

    // Sincronización en segundo plano con el backend
    try {
        const freshItems = await loadPysData({ refresh: true });

        // Si no había caché o si los datos cambiaron, renderizar con datos frescos
        const cacheHash = JSON.stringify(cachedData || []);
        const freshHash = JSON.stringify(freshItems || []);
        if (!hasCache || cacheHash !== freshHash) {
            renderGridWithItems(freshItems);
        }
    } catch(err) {
        console.error("Error cargando PYS:", err);
        if (!hasCache) {
            cont.innerHTML = `
                <h4>Problemas y Soluciones</h4>
                <div style="text-align: center; padding: 30px; color: #dc3545;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No se pudo cargar la sección de problemas y soluciones. Verifique su conexión.</p>
                </div>
            `;
        }
    }
}

/* TAREA 1.3 / TAREA 10 (5.3): FORMULARIO DE REGISTRO DE PROBLEMAS Y SOLUCIONES CON VALIDACIONES */
export function openAddProblemModal(preAssociatedVehicle = null) {
    const existing = document.getElementById("add-pys-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-pys-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2300";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "550px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-triangle-exclamation"></i> Registrar Problema</h2>

        <form id="add-pys-form" style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
            <!-- TAREA 11 (12.1): ALCANCE EN FORMULARIO DE PROBLEMAS (GENERAL VS ESPECÍFICO) -->
            <div class="form-group">
                <label>Alcance del Problema</label>
                <select id="pys-alcance" class="dev-input" style="padding: 6px;">
                    <option value="general" selected>General (Aplica a todos los vehículos)</option>
                    <option value="especifico">Modelo específico</option>
                </select>
            </div>

            <div id="pys-models-section" style="display: none; border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.02);">
                <label>Buscar Vehículos Relacionados</label>
                <input type="text" id="pys-search-vehicle" placeholder="Buscar por Marca o Modelo..." class="dev-input" style="width: 100%; padding: 6px; margin-top: 4px;">
                <div id="pys-vehicle-search-results" style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; margin-top: 6px;"></div>
                <div id="pys-selected-models-list" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;"></div>
            </div>

            <div class="form-group">
                <label>Título del Problema (Máx 30 caracteres)</label>
                <input type="text" id="pys-titulo" maxlength="30" required placeholder="Ej. Falla relay pump">
            </div>
            <div class="form-group">
                <label>Imagen del Problema</label>
                <input type="file" id="pys-img-file" accept="image/*" required>
            </div>
            <div class="form-group">
                <label>Detalle del Problema (Máx 700 caracteres)</label>
                <div class="rich-editor-toolbar" data-rich-target="pys-detalle"></div>
                <textarea id="pys-detalle" maxlength="700" rows="4" required placeholder="Describe el problema..."></textarea>
            </div>
            <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="pys-sin-solucion" style="width:auto;">
                <label for="pys-sin-solucion" style="margin:0;">Sin solución aún</label>
            </div>
            <div class="form-group" id="grp-solucion">
                <label>Solución (Máx 700 caracteres)</label>
                <div class="rich-editor-toolbar" data-rich-target="pys-solucion"></div>
                <textarea id="pys-solucion" maxlength="700" rows="4" placeholder="Explica la solución..."></textarea>
            </div>
            <div class="form-group">
                <label>Cómo Prevenir (Opcional, Máx 700 caracteres)</label>
                <textarea id="pys-prevenir" maxlength="700" rows="3" placeholder="Recomendación preventiva..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top:10px;">Agregar</button>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const alcanceSelect = content.querySelector("#pys-alcance");
    const modelsSection = content.querySelector("#pys-models-section");
    const searchVehicleInput = content.querySelector("#pys-search-vehicle");
    const searchVehicleResults = content.querySelector("#pys-vehicle-search-results");
    const selectedModelsContainer = content.querySelector("#pys-selected-models-list");

    const selectedVehicleIds = new Set();

    alcanceSelect.onchange = () => {
        modelsSection.style.display = alcanceSelect.value === 'especifico' ? 'block' : 'none';
    };

    function renderProvisionalSelectedModels() {
        selectedModelsContainer.innerHTML = '';
        const { catalogData } = getState();
        const cortes = (catalogData && catalogData.cortes) ? catalogData.cortes : [];

        selectedVehicleIds.forEach(vId => {
            const v = cortes.find(c => String(c.id) === String(vId));
            if (!v) return;
            const tag = document.createElement("div");
            tag.style.cssText = "display: inline-flex; align-items: center; gap: 6px; background: var(--accent-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;";
            tag.innerHTML = `<span>${v.marca} ${v.modelo} (${v.anoDesde})</span> <i class="fa-solid fa-xmark" style="cursor: pointer;"></i>`;
            tag.querySelector("i").onclick = () => {
                selectedVehicleIds.delete(vId);
                renderProvisionalSelectedModels();
            };
            selectedModelsContainer.appendChild(tag);
        });
    }

    // Tarea 9.2 (Requisito 2.5): Pre-asociar vehículo si se invoca desde el modal de un modelo y renderizar su badge
    if (preAssociatedVehicle && preAssociatedVehicle.id) {
        alcanceSelect.value = 'especifico';
        modelsSection.style.display = 'block';
        selectedVehicleIds.add(String(preAssociatedVehicle.id));
        renderProvisionalSelectedModels();
    }

    searchVehicleInput.oninput = () => {
        const query = searchVehicleInput.value.toLowerCase().trim();
        searchVehicleResults.innerHTML = '';
        if (!query) return;

        const { catalogData } = getState();
        const cortes = (catalogData && catalogData.cortes) ? catalogData.cortes : [];
        // Tarea 9.1: Excluir vehículos que ya están seleccionados
        const matches = cortes.filter(c => {
            if (selectedVehicleIds.has(String(c.id))) return false;
            return `${c.marca} ${c.modelo} ${c.versionesAplicables || ''}`.toLowerCase().includes(query);
        }).slice(0, 8);

        matches.forEach(v => {
            const itemDiv = document.createElement("div");
            itemDiv.style.cssText = "padding: 6px; border-bottom: 1px solid var(--border-color); cursor: pointer; font-size: 0.85em; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;";

            // Requisito 1: [Imagen del vehículo] [Versión de equipamiento o tipo de encendido] [Rango de años]
            const versionOrIgnition = (v.versionesAplicables && v.versionesAplicables.trim()) ? v.versionesAplicables.trim() : (v.tipoEncendido || '-');
            const yearRange = (v.anoHasta && String(v.anoHasta) !== String(v.anoDesde)) ? `${v.anoDesde} - ${v.anoHasta}` : `${v.anoDesde}`;

            itemDiv.innerHTML = `
                <img src="${getImageUrl(v.imagenVehiculo, IMG_SIZE_SMALL)}" style="width:36px; height:36px; min-width:36px; max-width:36px; margin:0; object-fit:cover; border-radius:4px; flex-shrink:0;">
                <span style="flex:1; margin:0; line-height:1.2; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    <strong>${v.marca} ${v.modelo}</strong>
                    <span style="color:var(--text-disabled); font-size:0.9em;">|</span>
                    <span style="color:var(--accent-color); font-weight:600;">${versionOrIgnition}</span>
                    <span style="color:var(--text-disabled); font-size:0.9em;">|</span>
                    <span>${yearRange}</span>
                </span>
            `;
            itemDiv.onclick = () => {
                searchVehicleResults.innerHTML = '';
                searchVehicleInput.value = '';
                openConfirmVehicleForPysModal(v, (confirmedVehicle) => {
                    selectedVehicleIds.add(String(confirmedVehicle.id));
                    renderProvisionalSelectedModels();
                });
            };
            searchVehicleResults.appendChild(itemDiv);
        });
    };

    const chkSinSolucion = content.querySelector("#pys-sin-solucion");
    const txtSolucion = content.querySelector("#pys-solucion");
    chkSinSolucion.onchange = () => {
        txtSolucion.disabled = chkSinSolucion.checked;
        if (chkSinSolucion.checked) txtSolucion.value = "";
    };

    const form = content.querySelector("#add-pys-form");
    form.onsubmit = async (e) => {
        e.preventDefault()

        const { currentUser } = getState();
        if (!currentUser) { showGlobalError("Debes estar conectado."); return; }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";

        const fileInput = content.querySelector("#pys-img-file");
        let imgBase64 = "";
        if (fileInput.files && fileInput.files[0]) {
            imgBase64 = await new Promise(res => {
                const r = new FileReader();
                r.onload = re => res(re.target.result);
                r.readAsDataURL(fileInput.files[0]);
            });
        }

        const payload = {
            titulo: content.querySelector("#pys-titulo").value.trim(),
            descripcion: content.querySelector("#pys-detalle").value.trim(),
            sinSolucion: chkSinSolucion.checked,
            solucion: txtSolucion.value.trim(),
            prevenir: content.querySelector("#pys-prevenir").value.trim(),
            videoUrl: "",
            ...getSessionPayload_(),
            alcance: alcanceSelect.value,
            modelosAsociados: Array.from(selectedVehicleIds),
            imgBase64,
        };

        try {
            const created = await routeAction("addProblem", payload);
            if (!created || created.status !== "success" || !created.problemId) throw new Error("El servidor no confirmó el ID del problema creado.");
            modal.remove();
            renderPysSection();
            if (confirm("El problema se registró sin vídeo. ¿Deseas subir ahora un vídeo para enviarlo a aprobación?")) {
                openYouTubeUploadModal({
                    initialTitle: payload.titulo,
                    initialDescription: payload.descripcion,
                    contentType: "pys",
                    referenceId: created.problemId,
                    metadata: { alcance: payload.alcance, modelosAsociados: payload.modelosAsociados },
                    onSuccess: async () => {
                        await loadPysData({ refresh: true });
                    }
                });
            }
            if (preAssociatedVehicle && preAssociatedVehicle.id) {
                const panel = document.getElementById("detalleCompleto");
                if (panel) renderPosiblesProblemasAccordion(panel, preAssociatedVehicle);
            }
        } catch(err) {
            console.error(err);
            showGlobalError("Error al registrar problema: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Agregar";
        }
    };
}

export function openSearchVehicleForPysAssociationModal(problemId, onAssociated, alreadyAssociatedIds = []) {
    const existing = document.getElementById("pys-add-vehicle-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "pys-add-vehicle-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2400";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "520px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-car"></i> Asociar Modelos de Vehículos</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;">
            Busca y selecciona uno o más vehículos para relacionarlos con este problema.
        </p>

        <!-- Modelos provisionalmente seleccionados -->
        <div id="assoc-selected-models-container" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; min-height: 28px;"></div>

        <div style="margin-top: 6px;">
            <input type="text" id="assoc-search-input" placeholder="Buscar por Marca, Modelo o Versión..." class="dev-input" style="width: 100%; padding: 8px; box-sizing: border-box;">
            <div id="assoc-search-results" style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; margin-top: 10px;"></div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
            <button id="btn-close-assoc" class="btn btn-secondary">Cancelar</button>
            <button id="btn-save-assoc" class="btn btn-primary" disabled><i class="fa-solid fa-link"></i> Vincular Seleccionados</button>
        </div>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    content.querySelector(".info-close-btn").onclick = closeModal;
    content.querySelector("#btn-close-assoc").onclick = closeModal;

    const input = content.querySelector("#assoc-search-input");
    const resultsContainer = content.querySelector("#assoc-search-results");
    const selectedContainer = content.querySelector("#assoc-selected-models-container");
    const saveBtn = content.querySelector("#btn-save-assoc");

    const alreadySet = new Set((alreadyAssociatedIds || []).map(String));
    const newlySelectedIds = new Set();

    function renderSelectedChips() {
        selectedContainer.innerHTML = '';
        const { catalogData } = getState();
        const cortes = (catalogData && catalogData.cortes) ? catalogData.cortes : [];

        newlySelectedIds.forEach(vId => {
            const v = cortes.find(c => String(c.id) === String(vId));
            if (!v) return;
            const tag = document.createElement("div");
            tag.style.cssText = "display: inline-flex; align-items: center; gap: 6px; background: var(--accent-color, #007bff); color: white; padding: 4px 10px; border-radius: 14px; font-size: 0.82em; font-weight: 500;";
            const yearStr = v.anoHasta ? `${v.anoDesde}-${v.anoHasta}` : `${v.anoDesde}`;
            tag.innerHTML = `<span>${v.marca} ${v.modelo} (${yearStr})</span> <i class="fa-solid fa-xmark" style="cursor: pointer; padding: 2px;"></i>`;
            tag.querySelector("i").onclick = () => {
                newlySelectedIds.delete(String(vId));
                renderSelectedChips();
            };
            selectedContainer.appendChild(tag);
        });

        saveBtn.disabled = newlySelectedIds.size === 0;
        saveBtn.innerText = newlySelectedIds.size > 0 ? `Vincular (${newlySelectedIds.size})` : "Vincular Seleccionados";
    }

    // Asegurar que el catálogo esté disponible para búsqueda
    const ensureCatalogData = async () => {
        const { catalogData } = getState();
        if (!catalogData || !Array.isArray(catalogData.cortes) || catalogData.cortes.length === 0) {
            try {
                const res = await routeAction('getCatalogData');
                if (res && res.data) setState({ catalogData: res.data });
            } catch (err) {
                console.warn("Error cargando catálogo para asociación:", err);
            }
        }
    };
    ensureCatalogData();

    input.oninput = () => {
        const query = input.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        if (!query) return;

        const { catalogData } = getState();
        const cortes = (catalogData && catalogData.cortes) ? catalogData.cortes : [];

        // Excluir vehículos ya asociados previamente y los que ya estén seleccionados en esta tanda
        const matches = cortes.filter(c => {
            const cId = String(c.id);
            if (alreadySet.has(cId) || newlySelectedIds.has(cId)) return false;
            return `${c.marca} ${c.modelo} ${c.versionesAplicables || ''} ${c.tipoEncendido || ''}`.toLowerCase().includes(query);
        }).slice(0, 10);

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-disabled); font-size: 0.85em; text-align: center;">No se encontraron vehículos disponibles.</div>';
            return;
        }

        matches.forEach(v => {
            const itemDiv = document.createElement("div");
            itemDiv.style.cssText = "padding: 6px 8px; border-bottom: 1px solid var(--border-color); cursor: pointer; font-size: 0.85em; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; border-radius: 4px; transition: background 0.15s ease;";
            itemDiv.onmouseenter = () => itemDiv.style.background = "rgba(0, 123, 255, 0.08)";
            itemDiv.onmouseleave = () => itemDiv.style.background = "transparent";

            const versionOrIgnition = (v.versionesAplicables && v.versionesAplicables.trim()) ? v.versionesAplicables.trim() : (v.tipoEncendido || '-');
            const yearRange = (v.anoHasta && String(v.anoHasta) !== String(v.anoDesde)) ? `${v.anoDesde} - ${v.anoHasta}` : `${v.anoDesde}`;

            itemDiv.innerHTML = `
                <img src="${getImageUrl(v.imagenVehiculo, IMG_SIZE_SMALL)}" style="width:36px; height:36px; min-width:36px; max-width:36px; margin:0; object-fit:cover; border-radius:4px; flex-shrink:0;">
                <span style="flex:1; margin:0; line-height:1.2; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    <strong>${v.marca} ${v.modelo}</strong>
                    <span style="color:var(--text-disabled); font-size:0.9em;">|</span>
                    <span style="color:var(--accent-color, #007bff); font-weight:600;">${versionOrIgnition}</span>
                    <span style="color:var(--text-disabled); font-size:0.9em;">|</span>
                    <span>${yearRange}</span>
                </span>
                <i class="fa-solid fa-plus-circle" style="color: var(--accent-color, #007bff); font-size: 1.1rem;"></i>
            `;

            itemDiv.onclick = () => {
                // Abrir confirmación previa (idéntico al flujo de creación de problemas)
                openConfirmVehicleForPysModal(v, (confirmedVehicle) => {
                    newlySelectedIds.add(String(confirmedVehicle.id));
                    input.value = '';
                    resultsContainer.innerHTML = '';
                    renderSelectedChips();
                });
            };
            resultsContainer.appendChild(itemDiv);
        });
    };

    saveBtn.onclick = async () => {
        if (newlySelectedIds.size === 0) return;
        saveBtn.disabled = true;
        saveBtn.innerText = "Guardando...";

        try {
            let lastUpdatedList = [...alreadyAssociatedIds];
            for (const vId of newlySelectedIds) {
                const res = await routeAction('addVehicleToProblem', { ...getSessionPayload_(), problemId, vehicleId: vId });
                if (res && res.status === 'success' && res.modelosAsociados) {
                    lastUpdatedList = res.modelosAsociados;
                } else {
                    if (!lastUpdatedList.includes(String(vId))) lastUpdatedList.push(String(vId));
                }
            }
            mostrarNotificacion("Modelos vinculados correctamente al problema.", "success");
            closeModal();
            if (typeof onAssociated === 'function') {
                onAssociated(lastUpdatedList);
            }
        } catch (err) {
            console.error("Error al vincular modelos:", err);
            showGlobalError("Error al vincular modelos: " + err.message);
            saveBtn.disabled = false;
            saveBtn.innerText = "Vincular Seleccionados";
        }
    };
}

/* TAREA 11 (12.2): MODAL EXCLUSIVO DE CONFIRMACIÓN Y VISTA PREVIA DE VEHÍCULO PARA PYS */
export function openConfirmVehicleForPysModal(vehicle, onConfirm) {
    const existing = document.getElementById("confirm-vehicle-pys-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "confirm-vehicle-pys-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2400";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "420px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2>Confirmar Vehículo</h2>
        <div style="display:flex; flex-direction:column; align-items:stretch; gap:10px; margin-top:10px; width:100%;">
            <div style="width:100%; overflow:hidden; border-radius:8px; max-height:200px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.03);">
                <img src="${getImageUrl(vehicle.imagenVehiculo, IMG_SIZE_MEDIUM)}" style="width:100%; max-height:200px; margin:0; object-fit:cover; border-radius:8px; display:block;">
            </div>
            <div style="width:100%; font-size:0.9rem;">
                <p style="margin:4px 0;"><strong>Marca:</strong> ${vehicle.marca}</p>
                <p style="margin:4px 0;"><strong>Modelo:</strong> ${vehicle.modelo}</p>
                <p style="margin:4px 0;"><strong>Versión:</strong> ${vehicle.versionesAplicables || 'Todas'}</p>
                <p style="margin:4px 0;"><strong>Años:</strong> ${vehicle.anoDesde}${vehicle.anoHasta ? '-' + vehicle.anoHasta : ''}</p>
                <p style="margin:4px 0;"><strong>Encendido:</strong> ${vehicle.tipoEncendido || '-'}</p>
            </div>
            <div style="display:flex; gap:10px; width:100%; margin-top:10px;">
                <button id="btn-cancel-pys-veh" class="btn btn-secondary" style="flex:1;">Regresar</button>
                <button id="btn-accept-pys-veh" class="btn btn-primary" style="flex:1;">Aceptar</button>
            </div>
        </div>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    content.querySelector(".info-close-btn").onclick = closeModal;
    content.querySelector("#btn-cancel-pys-veh").onclick = closeModal;

    content.querySelector("#btn-accept-pys-veh").onclick = () => {
        closeModal();
        if (typeof onConfirm === 'function') onConfirm(vehicle);
    };
}

/* TAREA 10 (5.5): MODAL DE DETALLE DE PROBLEMAS Y SOLUCIONES, AGREGAR SOLUCIÓN Y PREVENCIÓN */
export function openPysDetailModal(item, navOptions = {}, inEditModePys = false) {
    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const modalDetalle = document.getElementById("modalDetalle");
    if (modalDetalle) {
        modalDetalle.dataset.modalType = 'pys';
        modalDetalle.classList.add("visible");
    }

    // Gestión contextual de pila de navegación anti-bucle
    if (navOptions && navOptions.fromOriginModal) {
        modalNavStack.push({
            type: navOptions.fromOriginModal.type,
            item: navOptions.fromOriginModal.item,
            navOptions: navOptions.fromOriginModal.navOptions || {}
        });
    } else if (!inEditModePys && (!navOptions || !navOptions.originModal)) {
        // Apertura independiente: limpiar pila previa
        modalNavStack.length = 0;
    }

    const sessionData = localStorage.getItem('gpsepedia_session');
    const userRole = getUiSessionContext_()?.role || null;
    const isDeveloper = userRole === 'desarrollador';

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;";

    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1;";

    const title = document.createElement("h2");
    title.innerText = item.Problema;
    title.style.cssText = "margin: 0; font-size: 1.5rem; font-weight: bold; color: var(--text-color, #222);";
    titleContainer.appendChild(title);
    headerDiv.appendChild(titleContainer);

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";

    if (isDeveloper) {
        if (inEditModePys) {
            // Botón Descartar (↩️)
            const resetBtn = document.createElement("button");
            resetBtn.innerHTML = '↩️';
            resetBtn.className = "share-modal-btn";
            resetBtn.title = "Descartar cambios";
            resetBtn.style.fontSize = "1.2em";
            resetBtn.onclick = () => openPysDetailModal(item, navOptions, false);
            controlsContainer.appendChild(resetBtn);

            // Botón Guardar (✅)
            const saveBtn = document.createElement("button");
            saveBtn.innerHTML = '✅';
            saveBtn.className = "share-modal-btn";
            saveBtn.title = "Guardar cambios";
            saveBtn.style.fontSize = "1.2em";
            saveBtn.id = "btn-save-pys-edit";
            controlsContainer.appendChild(saveBtn);
        } else {
            // Botón de lápiz de Edición
            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            editBtn.className = "share-modal-btn";
            editBtn.title = "Activar modo edición";
            editBtn.onclick = () => openPysDetailModal(item, navOptions, true);
            controlsContainer.appendChild(editBtn);
        }
    }

    const closePysModal = () => {
        // Detener reproducción y limpiar reproductor de video de PyS al cerrar
        const iframes = cont.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                }
            } catch (e) {}
            iframe.src = "";
            iframe.remove();
        });

        // Comprobar si hay un modal previo en la pila para retorno contextual
        if (modalNavStack.length > 0) {
            const prevContext = modalNavStack.pop();
            if (prevContext && prevContext.type === 'vehicle') {
                mostrarDetalleModal(prevContext.item, false, prevContext.navOptions || {});
                return;
            }
        }

        if (window.history && window.history.state && window.history.state.modalOpen) {
            window.history.back();
        } else {
            document.getElementById("modalDetalle").classList.remove("visible");
            modalNavStack.length = 0;
        }
    };

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.className = "info-close-btn";
    closeBtn.style.cssText = "position: static; font-size: 1.8em; padding: 0 4px;";
    closeBtn.onclick = closePysModal;
    controlsContainer.appendChild(closeBtn);

    headerDiv.appendChild(controlsContainer);
    cont.appendChild(headerDiv);

    if (inEditModePys) {
        // Formulario in-modal de edición de Problemas y Soluciones
        const form = document.createElement("div");
        form.style.cssText = "display: flex; flex-direction: column; gap: 12px; margin-top: 10px;";

        const titleLabel = document.createElement("label");
        titleLabel.style.fontWeight = "bold";
        titleLabel.textContent = "Título del Problema (máx 30 caracteres):";
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.maxLength = 30;
        titleInput.value = item.Problema || "";
        titleInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const descLabel = document.createElement("label");
        descLabel.style.fontWeight = "bold";
        descLabel.textContent = "Descripción (máx 700 caracteres):";
        const descInput = document.createElement("textarea");
        descInput.id = "edit-pys-desc-textarea";
        descInput.maxLength = 700;
        descInput.rows = 4;
        descInput.value = item.Descripcion || "";
        descInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const solLabel = document.createElement("label");
        solLabel.style.fontWeight = "bold";
        solLabel.textContent = "Solución (máx 700 caracteres):";
        const solInput = document.createElement("textarea");
        solInput.id = "edit-pys-sol-textarea";
        solInput.maxLength = 700;
        solInput.rows = 4;
        solInput.value = item.Solucion || "";
        solInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const prevLabel = document.createElement("label");
        prevLabel.style.fontWeight = "bold";
        prevLabel.textContent = "Cómo evitarlo / Prevención (máx 700 caracteres):";
        const prevInput = document.createElement("textarea");
        prevInput.id = "edit-pys-prev-textarea";
        prevInput.maxLength = 700;
        prevInput.rows = 3;
        prevInput.value = item.Prevenir || "";
        prevInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const videoLabel = document.createElement("label");
        videoLabel.style.fontWeight = "bold";
        videoLabel.textContent = "Enlace de Vídeo de YouTube:";
        const videoInput = document.createElement("input");
        videoInput.type = "url";
        videoInput.value = item.Video || "";
        videoInput.readOnly = true;
        videoInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        form.appendChild(titleLabel);
        form.appendChild(titleInput);

        form.appendChild(descLabel);
        form.appendChild(createRichTextToolbar("edit-pys-desc-textarea"));
        form.appendChild(descInput);

        form.appendChild(solLabel);
        form.appendChild(createRichTextToolbar("edit-pys-sol-textarea"));
        form.appendChild(solInput);

        form.appendChild(prevLabel);
        form.appendChild(createRichTextToolbar("edit-pys-prev-textarea"));
        form.appendChild(prevInput);

        form.appendChild(videoLabel);
        form.appendChild(videoInput);
        const uploadPysVideoBtn = document.createElement("button");
        uploadPysVideoBtn.type = "button";
        uploadPysVideoBtn.className = "btn btn-primary";
        uploadPysVideoBtn.textContent = item.Video ? "El problema ya tiene un vídeo" : "Solicitar subida de vídeo";
        uploadPysVideoBtn.disabled = Boolean(item.Video);
        uploadPysVideoBtn.onclick = () => openYouTubeUploadModal({
            initialTitle: item.Problema || "Problema técnico",
            initialDescription: item.Descripcion || item.Solucion || "",
            contentType: "pys",
            referenceId: item.id_problem || item.id,
            metadata: { problemId: item.id_problem || item.id },
            onSuccess: async () => {
                await loadPysData({ refresh: true });
            }
        });
        form.appendChild(uploadPysVideoBtn);
        cont.appendChild(form);

        const saveBtn = controlsContainer.querySelector("#btn-save-pys-edit");
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const newTitle = titleInput.value.trim();
                const newDesc = descInput.value.trim();
                const newSol = solInput.value.trim();
                const newPrev = prevInput.value.trim();
                const newVideo = videoInput.value.trim();

                if (!newTitle) {
                    mostrarNotificacion("El título no puede estar vacío.", "error");
                    return;
                }
                saveBtn.disabled = true;
                showSavingIndicator("saving", "Guardando cambios...");
                try {
                    const res = await routeAction('updatePysItem', {
                        problemId: item.id_problem || item.id,
                        titulo: newTitle,
                        descripcion: newDesc,
                        solucion: newSol,
                        prevenir: newPrev,
                        videoUrl: newVideo,
                        ...getSessionPayload_(),
                        userRole
                    });
                    if (res && res.status === 'success') {
                        item.Problema = newTitle;
                        item.Descripcion = newDesc;
                        item.Solucion = newSol;
                        item.Prevenir = newPrev;
                        item.Video = newVideo;
                        item.Se_soluciono = newSol ? "x" : "";
                        showSavingIndicator("success", "Problema guardado");
                        mostrarNotificacion("Problema actualizado con éxito.", "success");
                        openPysDetailModal(item, navOptions, false);
                    } else {
                        throw new Error((res && res.message) || "Error al actualizar");
                    }
                } catch (err) {
                    console.error("Error guardando problema:", err);
                    showSavingIndicator("error", "Error al guardar");
                    mostrarNotificacion(err.message || "Error al guardar el problema", "error");
                    saveBtn.disabled = false;
                }
            };
        }
        return;
    }

    // 2. Imagen del problema (inmediatamente después del título)
    if (item.Imagen) {
        const img = document.createElement("img");
        img.className = 'img-vehiculo-modal img-pys-modal';
        setOptimizedImage(img, item.Imagen, IMG_SIZE_MEDIUM);
        cont.appendChild(img);
    }

    // Función auxiliar para renderizar encabezados estilizados con azul institucional
    const createPysSectionBlock = (sectionTitle, textContent) => {
        if (!textContent || !String(textContent).trim()) return null;
        const block = document.createElement("div");
        block.style.cssText = "margin-top: 14px;";

        const secHeader = document.createElement("div");
        secHeader.style.cssText = "font-size: 0.95rem; font-weight: bold; color: #007bff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #007bff; padding-bottom: 4px; margin-bottom: 8px;";
        secHeader.textContent = sectionTitle;
        block.appendChild(secHeader);

        const secContent = document.createElement("div");
        secContent.style.cssText = "font-size: 0.95rem; line-height: 1.5; color: var(--text-color, #333);";
        secContent.innerHTML = sanitizeHtmlContent(textContent);
        block.appendChild(secContent);

        return block;
    };

    // 3. Descripción del problema
    const descBlock = createPysSectionBlock("Descripción", item.Descripcion);
    if (descBlock) cont.appendChild(descBlock);

    // 4. Solución del problema
    const solBlock = createPysSectionBlock("Solución", item.Solucion);
    if (solBlock) cont.appendChild(solBlock);

    // 5. Cómo evitarlo (Prevención)
    const prevBlock = createPysSectionBlock("Cómo evitarlo", item.Prevenir);
    if (prevBlock) cont.appendChild(prevBlock);

    // 6. Video del problema (al final del contenido)
    if (item.Video) {
        const videoEmbedUrl = getYouTubeEmbedUrl(item.Video) || (item.Video.includes("embed/") ? item.Video : null);
        const videoBlock = document.createElement("div");
        videoBlock.style.cssText = "margin-top: 16px;";

        const videoHeader = document.createElement("div");
        videoHeader.style.cssText = "font-size: 0.95rem; font-weight: bold; color: #007bff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #007bff; padding-bottom: 4px; margin-bottom: 8px;";
        videoHeader.textContent = "Video Guía";
        videoBlock.appendChild(videoHeader);

        if (videoEmbedUrl) {
            const videoContainer = document.createElement('div');
            videoContainer.style.margin = "8px 0 12px 0";
            videoContainer.innerHTML = `<iframe width="100%" height="280" src="${videoEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; border: none; display: block; max-width: 100%;"></iframe>`;
            videoBlock.appendChild(videoContainer);
        } else {
            const vid = document.createElement("p");
            vid.style.margin = "6px 0";
            vid.innerHTML = '<a href="' + item.Video + '" target="_blank" rel="noopener noreferrer" style="color:#007bff; font-weight:600; text-decoration:underline;">Ver guía en YouTube</a>';
            videoBlock.appendChild(vid);
        }
        cont.appendChild(videoBlock);
    }

    /* TAREA 11 (12.4): CARRUSEL DE MODELOS EN DETALLE DE PROBLEMAS Y SOLUCIONES */
    // Carrusel de Modelos de Vehículos Relacionados
    // Tarea 9.3 (Requisito 8.2): Si el modal del problema se abrió desde un vehículo, ocultar en ese contexto el carrusel de modelos para evitar ciclos
    const isFromVehicle = navOptions && navOptions.originModal === 'vehicle';
    if (!isFromVehicle) {
        const carouselSection = document.createElement("div");
        carouselSection.id = "pys-models-carousel-section";
        carouselSection.style.cssText = "margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;";
        carouselSection.innerHTML = `<h4 style="margin: 0 0 10px 0; font-size: 1rem;"><i class="fa-solid fa-car"></i> Vehículos Relacionados:</h4>`;

        const track = document.createElement("div");
        track.className = "pys-models-track";
        track.style.cssText = "display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;";

        const renderTrackVehicles = (cortesList) => {
            track.innerHTML = "";
            const cortes = Array.isArray(cortesList) ? cortesList : [];
            let modelosAsociadosIds = [];
            if (Array.isArray(item.modelosAsociados)) {
                modelosAsociadosIds = item.modelosAsociados;
            } else if (typeof item.modelosAsociados === 'string' && item.modelosAsociados.trim()) {
                const rawModelos = item.modelosAsociados.trim();
                try {
                    const parsedModelos = JSON.parse(rawModelos);
                    if (Array.isArray(parsedModelos)) modelosAsociadosIds = parsedModelos;
                } catch (e) {}
                if (modelosAsociadosIds.length === 0) {
                    modelosAsociadosIds = rawModelos.split(/[,\/\\;]+/).map(id => id.trim()).filter(Boolean);
                }
            }
            const canEditPys = userRole === 'desarrollador';

            modelosAsociadosIds.forEach(vId => {
                const v = cortes.find(c => String(c.id) === String(vId));
                if (!v) return;

                const cardWrapper = document.createElement("div");
                cardWrapper.style.cssText = "position: relative; display: inline-block; flex-shrink: 0;";

                const card = crearCardVehiculo(v, true);
                card.onclick = () => mostrarDetalleModal(v, false, {
                    originModal: 'pys',
                    fromOriginModal: {
                        type: 'pys',
                        item: item,
                        navOptions: navOptions || {}
                    }
                });
                cardWrapper.appendChild(card);

                if (canEditPys) {
                    const removeBtn = document.createElement("button");
                    removeBtn.title = "Eliminar relación con este modelo";
                    removeBtn.innerHTML = "&times;";
                    removeBtn.style.cssText = "position: absolute; top: 4px; right: 4px; background: rgba(220, 53, 69, 0.9); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3);";
                    removeBtn.onclick = async (e) => {
                        e.stopPropagation();
                        if (!confirm(`¿Deseas desvincular el modelo "${v.marca} ${v.modelo}" de este problema?`)) return;
                        removeBtn.disabled = true;
                        try {
                            const res = await routeAction('removeVehicleFromProblem', {
                                problemId: item.id_problem,
                                vehicleId: v.id,
                                ...getSessionPayload_(),
                                userRole
                            });
                            if (res && res.status === 'success') {
                                item.modelosAsociados = res.modelosAsociados || item.modelosAsociados.filter(id => String(id) !== String(v.id));
                                cardWrapper.remove();
                                mostrarNotificacion("Relación retirada correctamente.", "success");
                            }
                        } catch(err) {
                            showGlobalError("Error al retirar relación: " + err.message);
                            removeBtn.disabled = false;
                        }
                    };
                    cardWrapper.appendChild(removeBtn);
                }

                track.appendChild(cardWrapper);
            });

            // Tarjeta «+ Agregar» al final del carrusel disponible para todos los usuarios (Estandarización visual sin bordes discontinuos)
            const addCard = document.createElement("div");
            addCard.className = "card card-create-vehicle-assoc";
            addCard.style.cssText = "flex: 0 0 140px; height: 120px; padding: 10px; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: var(--card-bg, #fff); flex-shrink: 0;";
            addCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--accent-color, #007bff);"></i> <span style="font-size: 0.85rem; font-weight: 600; text-align: center;">Agregar Modelo</span>`;
            addCard.onclick = () => {
                openSearchVehicleForPysAssociationModal(item.id_problem, (updatedList) => {
                    item.modelosAsociados = updatedList;
                    openPysDetailModal(item, navOptions);
                }, item.modelosAsociados || []);
            };
            track.appendChild(addCard);
        };

        const { catalogData } = getState();
        const currentCortes = (catalogData && Array.isArray(catalogData.cortes) && catalogData.cortes.length > 0) ? catalogData.cortes : [];
        renderTrackVehicles(currentCortes);

        // Si los cortes no están precargados en el estado, consultar en segundo plano y repoblar reactivamente
        if (currentCortes.length === 0) {
            routeAction('getCatalogData').then(catRes => {
                if (catRes && catRes.data && Array.isArray(catRes.data.cortes)) {
                    setState({ catalogData: catRes.data });
                    renderTrackVehicles(catRes.data.cortes);
                }
            }).catch(e => console.warn("Error precargando cortes para carrusel PyS:", e));
        }

        carouselSection.appendChild(track);
        cont.appendChild(carouselSection);
    }

    if (item.Colaborador) {
        const colDiv = document.createElement("div");
        colDiv.style.cssText = "margin-top: 15px; font-size: 0.85rem; color: var(--text-disabled); text-align: right;";
        colDiv.innerHTML = "Registrado por: <strong>" + cleanColaboradorName(item.Colaborador) + "</strong>";
        cont.appendChild(colDiv);
    }

    if (item.Se_soluciono !== 'x') {
        const addSolBtn = document.createElement("button");
        addSolBtn.className = "btn btn-secondary";
        addSolBtn.innerText = "+ Agregar Solución";
        addSolBtn.onclick = () => {
            const solText = window.prompt("Introduce la solución a este problema (máx 700 caracteres):");
            if (solText && solText.trim()) {
                routeAction("addSolution", { ...getSessionPayload_(), problemId: item.id_problem, solucion: solText.trim() }).then(() => {
                    alert("Solución agregada con éxito.");
                    document.getElementById("modalDetalle").classList.remove("visible");
                    renderPysSection();
                }).catch(e => showGlobalError("Error: " + e.message));
            }
        };
        cont.appendChild(addSolBtn);
    }

    if (!item.Prevenir) {
        const addPrevBtn = document.createElement("button");
        addPrevBtn.className = "btn btn-secondary";
        addPrevBtn.style.marginLeft = "10px";
        addPrevBtn.innerText = "+ Agregar Prevención";
        addPrevBtn.onclick = () => {
            const prevText = window.prompt("Introduce recomendación preventiva (máx 100 caracteres):");
            if (prevText && prevText.trim()) {
                routeAction("addPrevention", { ...getSessionPayload_(), problemId: item.id_problem, prevenir: prevText.trim() }).then(() => {
                    alert("Prevención agregada con éxito.");
                    document.getElementById("modalDetalle").classList.remove("visible");
                    renderPysSection();
                }).catch(e => showGlobalError("Error: " + e.message));
            }
        };
        cont.appendChild(addPrevBtn);
    }

    if (modalDetalle) {
        modalDetalle.dataset.modalType = 'pys';
        modalDetalle.classList.add("visible");
    }
    if (window.history && window.history.pushState) {
        window.history.pushState({ modalOpen: true }, '');
    }
}


/* TAREA 12 (6.1): TARJETA DE CREACIÓN Y FORMULARIO DE TUTORIALES */
export function openAddTutorialModal() {
    const existing = document.getElementById("add-tutorial-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-tutorial-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2300";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "500px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-book-open"></i> Agregar Nuevo Tutorial</h2>

        <form id="add-tutorial-form" style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
            <div class="form-group">
                <label>Tema / Título (Máx 30 caracteres)</label>
                <input type="text" id="tut-tema" maxlength="30" required placeholder="Ej. Desarme de consola frontal">
            </div>
            <div class="form-group">
                <label>Descripción / Detalles (Máx 700 caracteres)</label>
                <div class="rich-editor-toolbar" data-rich-target="tut-desc"></div>
                <textarea id="tut-desc" maxlength="700" rows="4" placeholder="Detalles del tutorial..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">Agregar Tutorial</button>
        </form>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector(".info-close-btn").onclick = () => modal.remove();

    const form = content.querySelector("#add-tutorial-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const { currentUser } = getState();
        if (!currentUser) { showGlobalError("Debes estar conectado."); return; }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";

        const payload = {
            tema: content.querySelector("#tut-tema").value.trim(),
            videoUrl: "",
            descripcion: content.querySelector("#tut-desc").value.trim(),
            ...getSessionPayload_(),
            colaborador: currentUser.Nombre_Completo || currentUser.Nombre_Usuario
        };

        try {
            const created = await addTutorial(payload);
            if (!created || created.status !== "success" || !created.referenceId) throw new Error("El servidor no confirmó el destino del tutorial.");
            modal.remove();
            const res = await routeAction("getCatalogData");
            if (res && res.data) setState({ catalogData: res.data });
            openYouTubeUploadModal({
                initialTitle: payload.tema,
                initialDescription: payload.descripcion,
                contentType: "tutorial",
                referenceId: created.referenceId,
                metadata: { tema: payload.tema },
                onSuccess: async () => {
                    const fresh = await routeAction("getCatalogData");
                    if (fresh && fresh.data) setState({ catalogData: fresh.data });
                }
            });
        } catch(err) {
            console.error(err);
            showGlobalError("Error al registrar tutorial: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Agregar Tutorial";
        }
    };
}

window.applyRichFormat = function(targetId, format) {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    if (!selected) return;
    const formatted = `<b>${selected}</b>`;
    textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
};

window.applyRichColor = function(targetId, color) {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    if (!selected) return;
    const formatted = `<span style="color:${color}">${selected}</span>`;
    textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
};

/* BLOQUE 7: AJUSTAR DISTRIBUCIÓN, DISEÑO Y CONTENIDO DE LA FICHA TÉCNICA PARA IMPRESIÓN Y EXPORTACIÓN A PDF */
export function exportVehiclePrintSheet(item) {
    if (!item) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor permite la apertura de ventanas emergentes para imprimir la ficha técnica.");
        return;
    }

    const title = `${item.marca || ''} ${item.modelo || ''} (${item.anoDesde || ''}${item.anoHasta ? ' - ' + item.anoHasta : ''})`;

    // 1. Recopilar los cortes conservando sus datos originales y el criterio de prioridad de la vista de detalle.
    const cuts = [];
    for (let i = 1; i <= 3; i++) {
        if (item[`tipoCorte${i}`] || item[`ubicacionCorte${i}`] || item[`imgCorte${i}`]) {
            cuts.push({
                num: i,
                tipo: item[`tipoCorte${i}`],
                ub: item[`ubicacionCorte${i}`],
                color: item[`colorCableCorte${i}`],
                relay: item[`configRelay${i}`],
                img: item[`imgCorte${i}`],
                util: parseInt(item[`utilCorte${i}`] || 0),
                activaTestigo: getActivaTestigoValue(item, i)
            });
        }
    }

    // El detalle existente ordena los cortes por votos y toma el primero como recomendado.
    // Si ese primer corte está marcado explícitamente como "No recomendado", se conserva el orden técnico original.
    const rankedCuts = cuts.filter(c => c.tipo).sort((a, b) => b.util - a.util);
    const rankedFirstCut = rankedCuts[0] || null;
    const recommendedCut = rankedFirstCut && !isNoRecomendadoValue(rankedFirstCut.tipo) ? rankedFirstCut : null;
    const cutsForPrint = recommendedCut
        ? [recommendedCut, ...cuts.filter(c => c !== recommendedCut)]
        : cuts;

    // 2. Cables de alimentación
    const feeds = [];
    if (item.cableAlimen || item.imgCableAlimen) {
        feeds.push({ title: 'Alimentación Principal', desc: item.cableAlimen, img: item.imgCableAlimen });
    }
    if (item.cableAlimen2 || item.imgCableAlimen2) {
        feeds.push({ title: 'Alimentación Secundaria', desc: item.cableAlimen2, img: item.imgCableAlimen2 });
    }
    if (item.cableAlimen3 || item.imgCableAlimen3) {
        feeds.push({ title: 'Alimentación Auxiliar', desc: item.cableAlimen3, img: item.imgCableAlimen3 });
    }

    // 5. HTML de imagen principal del vehículo
    const vehiculoImgHtml = item.imagenVehiculo ? `
        <div class="vehicle-main-img"><img src="${getImageUrl(item.imagenVehiculo, IMG_SIZE_LARGE)}" alt="${title}" /></div>
    ` : '';

    // 6. Apertura de puertas
    const aperturaItem = (item.apertura || item.imgApertura) ? {
        title: 'Apertura de Puertas / Seguros',
        desc: item.apertura || 'Instrucciones registradas',
        img: item.imgApertura,
        kind: 'apertura'
    } : null;

    // 7. Preparar tarjetas técnicas como unidades indivisibles para permitir su reorganización visual.
    const techItems = [];
    cutsForPrint.forEach(c => {
        techItems.push({
            kind: 'cut',
            num: c.num,
            title: `Corte #${c.num}: ${c.tipo || 'Sin tipo especificado'}`,
            infoHtml: `<div><strong>Ubicación:</strong> ${sanitizeHtmlContent(c.ub || 'No especificada')}</div>
                       <div><strong>Color de Cable:</strong> ${sanitizeHtmlContent(c.color || 'No especificado')}</div>
                       <div><strong>Relay:</strong> ${sanitizeHtmlContent(c.relay || 'Sin Relay')}</div>`,
            img: c.img,
            alt: `Corte #${c.num}`,
            extraHtml: c.activaTestigo ? `
                <div class="testigo-aviso">
                    <i class="fa-solid fa-triangle-exclamation"></i> Este corte activa el testigo de motor
                </div>` : '',
            isRecommended: c === recommendedCut
        });
    });
    feeds.forEach(f => {
        techItems.push({
            kind: 'feed',
            title: f.title,
            infoHtml: `<div>${sanitizeHtmlContent(f.desc || 'Conexión estándar')}</div>`,
            img: f.img,
            alt: f.title,
            extraHtml: '',
            isRecommended: false
        });
    });
    if (aperturaItem) {
        techItems.push({
            kind: aperturaItem.kind,
            title: aperturaItem.title,
            infoHtml: `<div>${sanitizeHtmlContent(aperturaItem.desc)}</div>`,
            img: aperturaItem.img,
            alt: aperturaItem.title,
            extraHtml: '',
            isRecommended: false
        });
    }

    const techItemsHtml = techItems.map((entry, index) => {
        const safeImg = entry.img ? getImageUrl(entry.img, IMG_SIZE_LARGE) : '';
        return `
        <div class="tech-item-card ${safeImg ? 'has-image' : 'text-only'}"
             data-tech-kind="${entry.kind}"
             data-priority-cut="${entry.kind === 'cut' && (entry.isRecommended || (!recommendedCut && entry.num === 1)) ? 'true' : 'false'}"
             data-recommended-cut="${entry.isRecommended ? 'true' : 'false'}"
             data-original-order="${index}">
            <div class="tech-item-header">
                ${entry.isRecommended ? '<span class="recommended-cut-label">Corte recomendado</span>' : ''}
                ${entry.title}
            </div>
            <div class="tech-item-body">
                <div class="tech-item-info">${entry.infoHtml}${entry.extraHtml || ''} </div>
                ${safeImg ? `
                <div class="tech-item-img-wrapper">
                    <img src="${safeImg}" alt="${entry.alt}" class="tech-detail-img" />
                </div>` : ''}
            </div>
        </div>
        `;
    }).join('');

    // 7. Notas técnicas importantes
    const notasHtml = item.notaImportante ? `
        <tr class="meta-note-row">
            <td colspan="4">
                <div class="tech-notes"><strong>Nota técnica importante:</strong> ${sanitizeHtmlContent(item.notaImportante)}</div>
            </td>
        </tr>
    ` : '';

    // 8. Código QR exclusivo para vídeo guía de desarme (Requisito 6)
    // Prohibido mostrar la URL como texto visible, solo el QR.
    const rawVideoUrl = item.Video || item.videoGuiaDesarmeUrl;
    let qrHtml = '';
    if (rawVideoUrl && typeof rawVideoUrl === 'string' && rawVideoUrl.trim()) {
        const directVideoUrl = rawVideoUrl.trim();
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=${encodeURIComponent(directVideoUrl)}`;
        qrHtml = `
            <div class="qr-video-box">
                <img src="${qrApiUrl}" alt="Código QR Vídeo Guía" class="qr-code-img" />
                <span class="qr-label">Vídeo Guía de Desarme</span>
            </div>
        `;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Ficha Técnica GPSpedia - ${title}</title>
            <style>
                @page {
                    size: 216mm 279mm portrait;
                    margin: 5mm;
                }
                * { box-sizing: border-box; }
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    margin: 0;
                    padding: 0;
                    color: #1a1a1a;
                    font-size: 11px;
                    line-height: 1.25;
                    background: #fff;
                }
                ul[data-gp-marker] { list-style: none; padding-left: 1.5em; }
                ul[data-gp-marker] > li { position: relative; }
                ul[data-gp-marker] > li::before { position: absolute; left: -1.25em; }
                ul[data-gp-marker="hyphen"] > li::before { content: "-"; }
                ul[data-gp-marker="arrow"] > li::before { content: "→"; }
                ul[data-gp-marker="check"] > li::before { content: "✓"; }
                ul[data-gp-marker="bullet"] > li::before { content: "•"; }
                .sheet-page-wrapper {
                    height: auto;
                    min-height: 269mm;
                    max-height: none;
                    display: flex;
                    flex-direction: column;
                    break-after: page;
                    page-break-after: always;
                    overflow: visible;
                }
                .sheet-page-wrapper:last-child {
                    break-after: auto;
                    page-break-after: auto;
                }
                .sheet-content-main {
                    flex: 1 1 auto;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    gap: 6px;
                }
                .no-print-bar {
                    background: #007bff;
                    color: white;
                    padding: 8px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 4px;
                    margin-bottom: 12px;
                }
                /* Encabezado: Logo a la derecha de GPSpedia, y exclusivamente "Ficha técnica" (Requisitos 3.1 y 3.2) */
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 6px;
                    margin-bottom: 10px;
                }
                .header-brand-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .header-logo-title {
                    font-size: 22px;
                    font-weight: bold;
                    color: #007bff;
                    letter-spacing: 0.5px;
                }
                .header-project-logo {
                    width: 28px;
                    height: 28px;
                    object-fit: contain;
                }
                .header-doc-type {
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #555;
                    text-transform: capitalize;
                }
                .vehicle-title {
                    font-size: 17px;
                    font-weight: bold;
                    margin: 0;
                    color: #222;
                    text-align: right;
                }
                /* Grid superior: Información del vehículo y QR si existe */
                .top-grid {
                    display: grid;
                    grid-template-columns: ${item.imagenVehiculo ? '150px 1fr' : '1fr'}${qrHtml ? ' auto' : ''};
                    gap: 10px;
                    align-items: stretch;
                    margin-bottom: 10px;
                }
                .vehicle-main-img img {
                    width: 100%;
                    max-height: 105px;
                    object-fit: cover;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                }
                .meta-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                    line-height: 1.15;
                }
                .meta-table td {
                    padding: 1.5px 5px;
                    border: 1px solid #e0e0e0;
                    vertical-align: middle;
                }
                .meta-table td.label {
                    font-weight: bold;
                    background: #f7f9fa;
                    width: 18%;
                    color: #444;
                }
                .qr-video-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: #fafafa;
                }
                .qr-code-img {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                }
                .qr-label {
                    font-size: 9px;
                    font-weight: bold;
                    color: #555;
                    margin-top: 4px;
                    text-align: center;
                }
                /* Secciones verticales fluidas (Requisito 1.1) */
                .section-header {
                    font-size: 11.5px;
                    font-weight: bold;
                    color: #007bff;
                    text-transform: uppercase;
                    border-bottom: 1.5px solid #007bff;
                    margin: 5px 0 4px 0;
                    padding-bottom: 2px;
                }
                .tech-grid {
                    display: grid;
                    grid-template-columns: repeat(2, max-content);
                    grid-auto-rows: max-content;
                    align-items: start;
                    justify-content: start;
                    gap: 4px;
                    min-width: 0;
                }
                .adaptive-tech-grid.layout-single,
                .adaptive-tech-grid.layout-pair-portrait,
                .adaptive-tech-grid.layout-pair-landscape,
                .adaptive-tech-grid.layout-triple-portrait,
                .adaptive-tech-grid.layout-mosaic {
                    grid-template-columns: repeat(2, max-content);
                    justify-content: start;
                    align-items: start;
                    grid-auto-rows: max-content;
                    gap: 4px;
                }
                .adaptive-tech-grid > .tech-item-card.text-only {
                    grid-column: 1 / -1;
                }
                .sheet-page-wrapper .tech-detail-img {
                    max-height: 520px;
                }
                .adaptive-image-row,
                .adaptive-image-mosaic {
                    display: grid;
                    align-items: stretch;
                    gap: 8px;
                    min-width: 0;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                .adaptive-image-row {
                    grid-template-columns: minmax(0, 1fr);
                }
                .adaptive-single-image-row {
                    width: 50%;
                    max-width: 50%;
                    margin-left: auto;
                    margin-right: auto;
                }
                .adaptive-compact-image-row {
                    width: 80%;
                    max-width: 80%;
                    margin-left: auto;
                    margin-right: auto;
                }
                .tech-item-card {
                    min-width: 0;
                    width: fit-content;
                    max-width: 100%;
                    border: 1px solid #dcdcdc;
                    border-radius: 3px;
                    background: #fafafa;
                    padding: 3px 4px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    justify-self: start;
                    align-self: start;
                }
                .tech-item-card.has-image {
                    padding: 3px 4px;
                }
                .recommended-cut-label {
                    display: inline-block;
                    margin-right: 6px;
                    padding: 2px 5px;
                    border-radius: 3px;
                    background: #e7f1ff;
                    color: #0056b3;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                }
                .tech-item-card.has-image,
                .tech-item-card.text-only {
                    padding: 3px 4px;
                }
                .tech-item-header {
                    font-weight: bold;
                    color: #0056b3;
                    font-size: 11.5px;
                    margin-bottom: 2px;
                    border-bottom: 1px dashed #e0e0e0;
                    padding-bottom: 1px;
                }
                .tech-item-body {
                    display: grid;
                    grid-template-columns: max-content;
                    grid-auto-rows: max-content;
                    align-items: start;
                    justify-items: start;
                    gap: 3px;
                    min-width: 0;
                }
                .tech-item-info {
                    flex: 1 1 auto;
                    max-width: 100%;
                    width: 100%;
                    min-width: 0;
                    overflow-wrap: break-word;
                    word-break: break-word;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                }
                .tech-item-info p {
                    margin: 1px 0;
                    font-size: 10.5px;
                    line-height: 1.2;
                }
                .tech-item-img-wrapper {
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-start;
                    min-width: 0;
                    width: fit-content;
                    max-width: 100%;
                    max-height: none;
                    margin: 0;
                }
                .tech-detail-img {
                    display: block;
                    width: auto;
                    height: auto;
                    max-width: 100%;
                    max-height: 520px;
                    object-fit: contain;
                    object-position: center;
                    border-radius: 2px;
                    border: 1px solid #ccc;
                    margin: 0;
                }
                .adaptive-tech-grid > .tech-item-card.text-only {
                    width: 100%;
                }
                body[data-print-layout="horizontal"] .adaptive-tech-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    justify-content: stretch;
                    gap: 4px;
                }
                body[data-print-layout="horizontal"] .adaptive-tech-grid > .tech-item-card {
                    width: 100%;
                    max-width: 100%;
                }
                body[data-print-layout="horizontal"] .tech-item-body {
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
                    align-items: start;
                    column-gap: 4px;
                }
                body[data-print-layout="horizontal"] .tech-item-info {
                    width: auto;
                    max-width: none;
                }
                body[data-print-layout="horizontal"] .tech-item-img-wrapper {
                    width: 100%;
                    max-width: 100%;
                    align-self: center;
                }
                body[data-print-layout="vertical"] .adaptive-tech-grid,
                body[data-print-layout="image-focus"] .adaptive-tech-grid {
                    grid-template-columns: max-content;
                    justify-content: start;
                    gap: 4px;
                }
                body[data-print-layout="vertical"] .tech-item-body,
                body[data-print-layout="image-focus"] .tech-item-body {
                    grid-template-columns: minmax(0, 1fr);
                    align-items: stretch;
                }
                body[data-print-layout="vertical"] .tech-item-card,
                body[data-print-layout="image-focus"] .tech-item-card {
                    width: fit-content;
                    max-width: 100%;
                }
                body[data-print-layout="vertical"] .tech-item-info,
                body[data-print-layout="image-focus"] .tech-item-info {
                    width: 100%;
                    max-width: 100%;
                }
                body[data-print-layout="vertical"] .tech-item-img-wrapper,
                body[data-print-layout="image-focus"] .tech-item-img-wrapper {
                    width: 100%;
                    max-width: 100%;
                    max-height: none;
                    justify-content: center;
                }
                body[data-print-layout="image-focus"] .tech-detail-img {
                    max-height: 620px;
                }
                .adaptive-tech-grid.layout-single { grid-template-columns: max-content; }
                .adaptive-tech-grid.layout-single > .tech-item-card { width: fit-content; max-width: 100%; }
                .adaptive-tech-grid.layout-single .tech-item-img-wrapper { width: fit-content; max-width: 100%; margin: 0 auto; }
                body[data-print-layout="image-focus"] .adaptive-tech-grid.layout-single .tech-item-img-wrapper { width: fit-content; max-width: 100%; }
                .adaptive-tech-grid.layout-pair-portrait { grid-template-columns: repeat(2, max-content); align-items: start; }
                .adaptive-tech-grid.layout-pair-landscape { grid-template-columns: max-content; align-items: start; }
                .adaptive-tech-grid.layout-triple-portrait { grid-template-columns: repeat(3, max-content); align-items: start; gap: 3px; }
                .adaptive-tech-grid.layout-mosaic { grid-template-columns: repeat(2, max-content); align-items: start; }
                body[data-print-layout="image-focus"] .adaptive-tech-grid .tech-detail-img { max-height: 620px; }

                /* Límites finales para que cada grupo permanezca dentro del área imprimible. */
                .sheet-page-wrapper .adaptive-tech-grid {
                    width: 100%;
                    max-width: 100%;
                    grid-template-columns: minmax(0, 1fr);
                    justify-content: stretch;
                }
                .sheet-page-wrapper .adaptive-tech-grid.layout-single {
                    grid-template-columns: minmax(0, 1fr);
                }
                .sheet-page-wrapper .adaptive-tech-grid.layout-pair-portrait,
                .sheet-page-wrapper .adaptive-tech-grid.layout-mosaic {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .sheet-page-wrapper .adaptive-tech-grid.layout-pair-landscape {
                    grid-template-columns: minmax(0, 1fr);
                }
                .sheet-page-wrapper .adaptive-tech-grid.layout-triple-portrait {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                .sheet-page-wrapper .adaptive-tech-grid > .tech-item-card,
                .sheet-page-wrapper .adaptive-tech-grid > .tech-item-card.text-only {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                    justify-self: stretch;
                    align-self: stretch;
                }
                .sheet-page-wrapper .tech-item-body {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                    grid-template-columns: minmax(0, 1fr);
                    justify-items: stretch;
                }
                body[data-print-layout="horizontal"] .sheet-page-wrapper .tech-item-body {
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
                    justify-items: stretch;
                }
                .sheet-page-wrapper .tech-item-img-wrapper {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                    justify-content: center;
                }
                /* La altura máxima se calcula por página en arrangeTechnicalCards(), según el espacio restante. */
                .sheet-page-wrapper .tech-detail-img {
                    display: block;
                    width: auto;
                    height: auto;
                    max-width: 100%;
                    max-height: 520px;
                    object-fit: contain;
                }
                .meta-note-row > td {
                    padding: 4px 6px;
                    border-top: 1px solid #ffeeba;
                }
                .meta-note-row .tech-notes {
                    margin: 0;
                    padding: 4px 6px;
                    border: 0;
                    border-radius: 0;
                    font-size: 11px;
                    line-height: 1.25;
                }
                .top-grid { align-items: start; }
                .vehicle-main-img img { height: auto; max-height: 105px; object-fit: contain; }
                .qr-video-box { min-width: 0; align-self: start; }
                .qr-code-img { width: 80px; max-width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: contain; }
                /* Aviso de testigo al pie del corte (Requisito 4.1) */
                .testigo-aviso {
                    margin-top: 6px;
                    font-size: 11px;
                    font-weight: bold;
                    color: #b78103;
                    background: #fff8e1;
                    padding: 6px 12px;
                    border-radius: 4px;
                    border: 1px solid #ffe082;
                    display: inline-block;
                }
                .tech-notes {
                    background: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeeba;
                    padding: 10px 14px;
                    border-radius: 6px;
                    margin-top: 14px;
                    font-size: 11.5px;
                    page-break-inside: avoid;
                }
                .footer-bar {
                    flex: 0 0 auto;
                    min-height: 48px;
                    margin-top: auto;
                    font-size: 10px;
                    color: #777;
                    border-top: 1px solid #e0e0e0;
                    padding-top: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    text-align: center;
                }
                .footer-bar > span {
                    flex: 1 1 0;
                    min-width: 0;
                }
                .print-tracklink-logo {
                    display: block;
                    flex: 0 0 auto;
                    height: 45px;
                    width: auto;
                    max-width: 90px;
                    object-fit: contain;
                    object-position: center;
                }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                    #print-pages { display: block; }
                    .sheet-page-wrapper {
                        height: auto;
                        min-height: 269mm;
                        max-height: none;
                        break-after: page;
                        page-break-after: always;
                        overflow: visible;
                    }
                    .sheet-page-wrapper:last-child {
                        break-after: auto;
                        page-break-after: auto;
                    }
                    .tech-item-card { break-inside: avoid; page-break-inside: avoid; }
                    .adaptive-tech-grid { break-inside: auto; }
                }
                @media screen and (max-width: 600px) {
                    .top-grid {
                        grid-template-columns: minmax(0, 1fr);
                    }
                    /* Los modos del selector prevalecen también en la vista previa móvil. */
                }
            </style>
        </head>
        <body data-print-layout="auto">
            <div class="no-print-bar no-print">
                <span><strong>Ficha Técnica</strong> - Vista previa para consulta e impresión</span>
                <label for="print-layout-mode" style="font-size: 11px; font-weight: 600;">Distribución:</label>
                <select id="print-layout-mode" aria-label="Distribución de imágenes"  style="max-width: 180px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; background: white; color: #222;">
                    <option value="auto">Automática</option>
                    <option value="horizontal">Imagen a la derecha</option>
                    <option value="vertical">Imagen debajo del texto</option>
                    <option value="image-focus">Imagen ampliada</option>
                </select>
                <button onclick="window.print()" style="padding: 6px 14px; background: white; color: #007bff; border: none; font-weight: bold; border-radius: 4px; cursor: pointer;">
                    Imprimir / Guardar PDF
                </button>
            </div>

            <div id="print-pages">
            <div class="sheet-page-wrapper" data-image-count="0">
                <div class="sheet-content-main">
                    <div class="header-container">
                        <div class="header-brand-wrap">
                            <span class="header-logo-title">GPSpedia</span>
                            <img src="icon-v3-512x512.png" alt="GPSpedia Logo" class="header-project-logo" />
                            <span class="header-doc-type">| Ficha técnica</span>
                        </div>
                        <div class="vehicle-title">${title}</div>
                    </div>

                    <div class="top-grid">
                        ${vehiculoImgHtml}
                        <table class="meta-table">
                            <tr>
                                <td class="label">Marca:</td><td>${item.marca || '-'}</td>
                                <td class="label">Modelo:</td><td>${item.modelo || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">Categoría:</td><td>${item.categoria || '-'}</td>
                                <td class="label">Años:</td><td>${item.anoDesde || ''} - ${item.anoHasta || 'Presente'}</td>
                            </tr>
                            <tr>
                                <td class="label">Encendido:</td><td>${item.tipoEncendido || '-'}</td>
                                <td class="label">Versiones:</td><td>${item.versionesAplicables || 'Todas'}</td>
                            </tr>
                            ${item.vin ? `<tr><td class="label">VIN / Chasis:</td><td colspan="3">${(function(){
                                try {
                                    const parsed = JSON.parse(item.vin);
                                    if (Array.isArray(parsed)) return parsed.join(' / ');
                                } catch(e){}
                                return item.vin;
                            })()}</td></tr>` : ''}
                            ${notasHtml}
                        </table>
                        ${qrHtml}
                    </div>

                    <div>
                        <div class="section-header">Información Técnica e Imágenes</div>
                        <div class="tech-grid adaptive-tech-grid" id="adaptive-tech-grid">
                            ${techItemsHtml || '<div class="tech-item-card text-only"><div class="tech-item-header">Puntos de Corte de Motor</div><p>No hay información técnica registrada para este modelo.</p></div>'}
                        </div>
                    </div>
                </div>

                <div class="footer-bar">
                    <span>Generado desde GPSpedia &copy; ${new Date().getFullYear()}</span>
                    <img src="tracklink_logo.png" alt="Logo de TRACKLINK" class="print-tracklink-logo" />
                    <span>Ficha técnica de consulta técnica especializada</span>
                </div>
            </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();

    // Distribución y paginación explícita: hasta cuatro imágenes técnicas (2 columnas × 2 filas) por hoja.
    const printDocument = printWindow.document;
    const printPages = printDocument.getElementById('print-pages');
    const firstPageTemplate = printPages && printPages.querySelector('.sheet-page-wrapper');
    const adaptiveGrid = firstPageTemplate && firstPageTemplate.querySelector('#adaptive-tech-grid');
    if (printPages && firstPageTemplate && adaptiveGrid) {
        const allTechnicalCards = Array.from(adaptiveGrid.querySelectorAll('.tech-item-card'));
        const headerTemplate = firstPageTemplate.querySelector('.header-container');
        const metadataTemplate = firstPageTemplate.querySelector('.top-grid');
        const sectionHeaderTemplate = firstPageTemplate.querySelector('.section-header');
        const footerTemplate = firstPageTemplate.querySelector('.footer-bar');

        const getImage = card => card.querySelector('.tech-detail-img');
        const getDimensions = card => {
            const img = getImage(card);
            const width = img && img.naturalWidth > 0 ? img.naturalWidth : 0;
            const height = img && img.naturalHeight > 0 ? img.naturalHeight : 0;
            return {
                width,
                height,
                aspect: width > 0 && height > 0 ? width / height : 1.33,
                resolution: width * height
            };
        };
        const originalOrder = card => Number(card.dataset.originalOrder || 0);

        const getAspect = card => {
            const dimensions = getDimensions(card);
            return dimensions.width > 0 && dimensions.height > 0 ? dimensions.aspect : 1;
        };

        const choosePageGroups = cards => {
            const groups = [];
            let cursor = 0;
            while (cursor < cards.length) {
                const remaining = cards.length - cursor;
                const a = getAspect(cards[cursor]);
                const b = remaining > 1 ? getAspect(cards[cursor + 1]) : 0;
                const c = remaining > 2 ? getAspect(cards[cursor + 2]) : 0;
                // Dos imágenes por página como regla segura; tres solo si las tres son verticales.
                let count = Math.min(2, remaining);
                if (remaining >= 3 && a < 0.82 && b < 0.82 && c < 0.82) count = 3;
                groups.push(cards.slice(cursor, cursor + count));
                cursor += count;
            }
            return groups.length ? groups : [[]];
        };

        const applyPageTemplate = (grid, pageCards) => {
            grid.classList.remove('layout-single', 'layout-pair-portrait', 'layout-pair-landscape', 'layout-triple-portrait', 'layout-mosaic');
            const aspects = pageCards.map(getAspect);
            if (pageCards.length <= 1) grid.classList.add('layout-single');
            else if (pageCards.length === 2 && aspects.every(aspect => aspect > 1.25)) grid.classList.add('layout-pair-landscape');
            else if (pageCards.length === 2 && aspects.every(aspect => aspect < 0.9)) grid.classList.add('layout-pair-portrait');
            else if (pageCards.length === 3 && aspects.every(aspect => aspect < 0.9)) grid.classList.add('layout-triple-portrait');
            else grid.classList.add('layout-mosaic');
            pageCards.forEach((card, index) => {
                card.style.gridColumn = ''; card.style.gridRow = ''; card.style.width = ''; card.style.maxWidth = '';
                card.style.marginLeft = ''; card.style.marginRight = '';
                if (grid.classList.contains('layout-mosaic') && pageCards.length === 3 && index === 2) {
                    card.style.gridColumn = '1 / -1';
                    if (aspects[index] > 1.25) { card.style.width = '80%'; card.style.maxWidth = '80%'; card.style.marginLeft = 'auto'; card.style.marginRight = 'auto'; }
                }
            });
        };

        const arrangeTechnicalCards = () => {
            const orderedCards = [...allTechnicalCards].sort((a, b) => originalOrder(a) - originalOrder(b));
            const priorityCard = orderedCards.find(card => card.dataset.priorityCut === 'true') || null;
            const orderedTechnicalCards = priorityCard ? [priorityCard, ...orderedCards.filter(card => card !== priorityCard)] : orderedCards;
            const imageCards = orderedTechnicalCards.filter(card => getImage(card));
            const textCards = orderedTechnicalCards.filter(card => !getImage(card));
            const pageGroups = choosePageGroups(imageCards);

            const createPage = (pageIndex, pageCards, pageCount) => {
                const page = printDocument.createElement('div');
                page.className = 'sheet-page-wrapper';
                page.dataset.imageCount = String(pageCards.length);
                const main = printDocument.createElement('div');
                main.className = 'sheet-content-main';
                if (headerTemplate) main.appendChild(headerTemplate.cloneNode(true));
                if (pageIndex === 0 && metadataTemplate) {
                    main.appendChild(metadataTemplate.cloneNode(true));
                }
                if (sectionHeaderTemplate) main.appendChild(sectionHeaderTemplate.cloneNode(true));
                const grid = printDocument.createElement('div');
                grid.className = 'tech-grid adaptive-tech-grid';
                applyPageTemplate(grid, pageCards);
                pageCards.forEach(card => grid.appendChild(card));
                if (pageIndex === pageCount - 1) textCards.forEach(card => {
                    card.style.gridColumn = '1 / -1'; card.style.width = '100%'; card.style.maxWidth = '100%'; grid.appendChild(card);
                });
                main.appendChild(grid);

                page.appendChild(main);
                if (footerTemplate) page.appendChild(footerTemplate.cloneNode(true));
                return page;
            };
            const pages = pageGroups.map((pageCards, pageIndex) => createPage(pageIndex, pageCards, pageGroups.length));
            printPages.replaceChildren(...pages);

            // Dimensionar imágenes con el espacio vertical que queda en cada página.
            // Se colapsan temporalmente para medir encabezado, metadatos, textos, tarjetas y pie;
            // después se reparte el espacio libre entre las filas de imágenes de esa página.
            const fitImagesToAvailablePageSpace = pageElements => {
                pageElements.forEach(page => {
                    const pageCards = Array.from(page.querySelectorAll('.tech-item-card.has-image'));
                    const images = pageCards.map(getImage).filter(Boolean);
                    if (!images.length) return;

                    images.forEach(img => { img.style.maxHeight = '0px'; });

                    const pageHeight = page.getBoundingClientRect().height || page.clientHeight;
                    const main = page.querySelector('.sheet-content-main');
                    const footer = page.querySelector('.footer-bar');
                    const mainChildren = main ? Array.from(main.children) : [];
                    const mainStyle = main && printDocument.defaultView
                        ? printDocument.defaultView.getComputedStyle(main)
                        : null;
                    const mainGap = mainStyle
                        ? (parseFloat(mainStyle.rowGap || mainStyle.gap || '0') || 0)
                        : 6;
                    const mainContentHeight = mainChildren.reduce(
                        (total, child) => total + child.getBoundingClientRect().height,
                        0
                    ) + Math.max(0, mainChildren.length - 1) * mainGap;
                    const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
                    const availableHeight = Math.max(0, pageHeight - footerHeight - mainContentHeight);

                    const rowTops = [];
                    pageCards.forEach(card => {
                        const top = card.getBoundingClientRect().top;
                        if (!rowTops.some(rowTop => Math.abs(rowTop - top) <= 2)) rowTops.push(top);
                    });

                    const rowCount = Math.max(1, rowTops.length);
                    const modeMaxHeight = printDocument.body.dataset.printLayout === 'image-focus' ? 620 : 520;
                    const rowMaxHeight = Math.max(80, Math.min(modeMaxHeight, (availableHeight / rowCount) - 4));
                    images.forEach(img => { img.style.maxHeight = `${rowMaxHeight}px`; });
                });
            };

            fitImagesToAvailablePageSpace(pages);

            orderedTechnicalCards.forEach(card => {
                const dimensions = getDimensions(card);
                card.dataset.naturalWidth = String(dimensions.width);
                card.dataset.naturalHeight = String(dimensions.height);
                card.dataset.imageAspectRatio = String(dimensions.aspect);
                card.dataset.imageResolution = String(dimensions.resolution);
            });
        };

        const layoutSelector = printDocument.getElementById('print-layout-mode');
        if (layoutSelector) layoutSelector.addEventListener('change', () => {
            printDocument.body.dataset.printLayout = layoutSelector.value;
            arrangeTechnicalCards();
        });

        const printImages = allTechnicalCards.map(getImage).filter(Boolean);
        Promise.all(printImages.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        })).then(arrangeTechnicalCards);
        printWindow.addEventListener('beforeprint', arrangeTechnicalCards);
    }
}

export async function loadAndRenderInbox() {
    const requestContext = await ensureUiSessionRole_(['desarrollador', 'gefe', 'jefe', 'supervisor']);
    if (!requestContext) return;
    const generation = ++inboxViewGeneration_;
    inboxDetailGeneration_ += 1;
    const isCurrentInboxRequest = () => generation === inboxViewGeneration_ && isCurrentUiSessionContext_(requestContext);

    const listContainer = document.getElementById('inbox-list');
    if (!listContainer) return;

    if (inboxCacheData) {
        renderInboxList(inboxCacheData);
    } else {
        listContainer.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Cargando bandeja...</p>';
    }

    try {
        const res = await getFeedbackItems(getDeveloperSessionPayload());
        if (!isCurrentInboxRequest()) return;
        if (res && res.data) {
            inboxCacheData = res.data;
            renderInboxList(inboxCacheData);
        }
    } catch(err) {
        if (!isCurrentInboxRequest()) return;
        console.error("Error cargando inbox:", err);
        if (!inboxCacheData) {
            listContainer.innerHTML = '<p class="text-danger">Error de conexión al cargar bandeja.</p>';
        }
    }
}

/* TAREA 9.2: MODAL PARA ASOCIAR PROBLEMAS EXISTENTES O NUEVOS DESDE EL VEHÍCULO */
export async function openAssociateExistingProblemModal(vehicle) {
    const existing = document.getElementById("assoc-existing-pys-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "assoc-existing-pys-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2200";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "550px";

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-triangle-exclamation"></i> Agregar Problema Relacionado</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;">${vehicle.marca} ${vehicle.modelo} (${vehicle.anoDesde})</p>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
            <input type="text" id="search-existing-pys-input" placeholder="Buscar" class="dev-input" style="flex:1; padding:8px; box-sizing:border-box;">
            <button type="button" id="btn-create-new-pys-for-vehicle" class="btn btn-primary" style="white-space:nowrap; font-size:0.85rem;">
                <i class="fa-solid fa-plus"></i> Agregar problema
            </button>
        </div>

        <div id="existing-pys-results-container" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
            <div style="text-align:center; padding:15px; color:var(--text-disabled);"><i class="fa-solid fa-spinner fa-spin"></i> Cargando problemas...</div>
        </div>
    `;

    mountRichTextToolbars(content);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    content.querySelector(".info-close-btn").onclick = closeModal;

    // Botón para agregar un problema nuevo pre-asociado
    content.querySelector("#btn-create-new-pys-for-vehicle").onclick = () => {
        closeModal();
        openAddProblemModal(vehicle);
    };

    // Obtener problemas de la sección PyS
    let allPys = [];
    try {
        allPys = await loadPysData({ refresh: true });
    } catch (e) {
        console.error("Error al obtener datos PyS:", e);
    }

    const resultsContainer = content.querySelector("#existing-pys-results-container");
    const searchInput = content.querySelector("#search-existing-pys-input");

    const renderProblemsList = (query = "") => {
        resultsContainer.innerHTML = "";
        const vehicleIdStr = String(vehicle.id);

        // Condiciones obligatorias de disponibilidad (Requisito 2.3):
        // 1. Mostrar únicamente problemas que tengan al menos un modelo de vehículo relacionado (modelosAsociados.length > 0).
        // 2. Excluir problemas generales (modelosAsociados vacíos).
        // 3. Excluir problemas que ya estén relacionados con el modelo actual.
        const filtered = allPys.filter(p => {
            if (!p || !Array.isArray(p.modelosAsociados) || p.modelosAsociados.length === 0) {
                return false; // Excluir generales
            }
            if (p.modelosAsociados.some(mId => String(mId) === vehicleIdStr)) {
                return false; // Ya está asociado al vehículo actual
            }
            if (query) {
                const q = query.toLowerCase();
                const titulo = (p.Problema || "").toLowerCase();
                const desc = (p.Descripcion || "").toLowerCase();
                return titulo.includes(q) || desc.includes(q);
            }
            return true;
        });

        if (filtered.length === 0) {
            resultsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-disabled); font-size:0.9em;">No hay problemas disponibles para asociar a este vehículo.</div>`;
            return;
        }

        filtered.forEach(p => {
            const itemRow = document.createElement("div");
            itemRow.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg, #fff);";

            const leftDiv = document.createElement("div");
            leftDiv.style.cssText = "display:flex; align-items:center; gap:10px; flex:1; min-width:0;";

            const img = document.createElement("img");
            img.src = getImageUrl(p.Imagen, IMG_SIZE_SMALL);
            img.style.cssText = "width:42px; height:42px; object-fit:cover; border-radius:4px; flex-shrink:0;";
            leftDiv.appendChild(img);

            const textDiv = document.createElement("div");
            textDiv.style.cssText = "display:flex; flex-direction:column; min-width:0; flex:1;";
            textDiv.innerHTML = `
                <strong style="font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.Problema}</strong>
                <span style="font-size:0.75rem; color:${p.Se_soluciono === 'x' ? '#28a745' : '#dc3545'}; font-weight:600;">${p.Se_soluciono === 'x' ? 'Solucionado' : 'Sin solución'}</span>
            `;
            leftDiv.appendChild(textDiv);

            const addBtn = document.createElement("button");
            addBtn.className = "btn btn-primary btn-sm";
            addBtn.style.cssText = "padding:6px 14px; font-size:0.85rem; flex-shrink:0;";
            addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Agregar`;

            addBtn.onclick = async () => {
                addBtn.disabled = true;
                addBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
                try {
                    const res = await routeAction("addVehicleToProblem", {
                        ...getSessionPayload_(),
                        problemId: p.id_problem,
                        vehicleId: vehicle.id
                    });
                    if (res && res.status === "success") {
                        mostrarNotificacion("Problema vinculado con éxito.", "success");
                        closeModal();
                        // Actualizar inmediatamente el modal de detalle del vehículo
                        const panel = document.getElementById("detalleCompleto");
                        if (panel) {
                            renderPosiblesProblemasAccordion(panel, vehicle);
                        }
                    }
                } catch (err) {
                    showGlobalError("Error al asociar problema: " + err.message);
                    addBtn.disabled = false;
                    addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Agregar`;
                }
            };

            itemRow.appendChild(leftDiv);
            itemRow.appendChild(addBtn);
            resultsContainer.appendChild(itemRow);
        });
    };

    renderProblemsList();
    searchInput.oninput = () => renderProblemsList(searchInput.value.trim());
}
