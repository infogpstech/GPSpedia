import { vinDifferentialEngine, vinSignatureStore, getClassificationKey, ensureVinSignatures } from './VinDifferentialEngine.js';
import { createPrintableQrDataUrl } from './printQr.js';
// GPSpedia UI Module | Version: 2.1.6
// Responsibilities:
// - Render UI components based on state.
// - Contain all functions that directly manipulate the DOM.
// - Use document.createElement, not HTML strings.

import { getFeedbackItems, getInboxRecipients, getInboxConversations, getInboxMessages, createInboxConversation, sendInboxMessage, markInboxRead, archiveInboxConversation, sendContactForm, addTutorial, replyToFeedback, markAsResolved, deleteFeedbackItem, clearActivityLogs, clearSensitiveLogs, checkAllServicesHealth, bucketServiceMetrics, getServiceMetricsSnapshot, subscribeServiceMetrics, getActivityLogs, routeAction, recordLike, reportProblem, suggestYear, suggestCutChange, approveVideo, rejectVideo, getRichTextMode, setRichTextMode, routeActionWithRetry } from './api-config.js';
import { getState, setState, subscribe } from './state.js';
import * as offline from './offline.js';
import { createEditBackupStore, getEditBackupFieldsToRestore } from './editBackupStore.js';
import { isAdminImageUploadStatusConfirmedCancelled } from './adminImageUploadIsolation.js';
import { confirmValidationBeforeCache } from './validationSubmission.js';
import { startValidationBannerForModal } from './validationBannerLifecycle.js';
import { applyConfirmedLikeState } from './likeState.js';
import { openYouTubeUploadModal } from './youtubeUpload.js';
import { shouldAutoOpenVehicleDetail } from './search-utils.js';
import { buildVehicleShareUrl, shareVehicleLink } from './share-utils.js';
import { pushNavigationState, replaceNavigationState, navigateBackToState, pickNavigationState, navigationHistoryStateKey } from './navigationHistory.js';
import { thumbnailObjectUrls } from './imageObjectUrlCache.js';
import { createInboxPageCache } from './inboxPageCache.js';
import { loadPysData, getCachedPysData, getPysDataFreshness, invalidatePysDataCache } from './pys-data.js';
import { captureModalViewState, restoreModalViewState, shouldRecordModalTransition, pushModalNavigationContext, popModalNavigationContext } from './modalNavigation.js';
import { createRichTextToolbar, sanitizeHtmlContent, refreshRichTextToolbars } from './rich-text.js';
import { renderActivityLogs } from './activityDashboard.js';

async function clearServiceWorkerRuntimeCache_(windowRef, timeoutMs = 5000) {
    if (!windowRef || !windowRef.navigator || !windowRef.navigator.serviceWorker) {
        return { status: "unavailable", message: "No hay un Service Worker disponible para limpiar las respuestas temporales." };
    }
    const serviceWorkerContainer = windowRef.navigator.serviceWorker;
    let registration = null;
    try {
        if (typeof serviceWorkerContainer.getRegistration === "function") {
            registration = await serviceWorkerContainer.getRegistration();
        }
    } catch (error) {
        return { status: "error", message: error && error.message ? error.message : "No se pudo consultar el Service Worker." };
    }
    const worker = serviceWorkerContainer.controller || registration && registration.active;
    if (!worker || typeof worker.postMessage !== "function" || typeof windowRef.MessageChannel !== "function") {
        return { status: "unavailable", message: "No hay un Service Worker activo que confirme la limpieza de Cache Storage." };
    }

    const safeTimeoutMs = Math.min(15000, Math.max(1000, Number(timeoutMs) || 5000));
    return new Promise(resolve => {
        let settled = false, timeoutId = null, channel = null;
        const finish = result => {
            if (settled) return;
            settled = true;
            if (timeoutId !== null) {
                try { windowRef.clearTimeout(timeoutId); } catch (error) {}
            }
            try { if (channel && channel.port1) channel.port1.close(); } catch (error) {}
            try { if (channel && channel.port2) channel.port2.close(); } catch (error) {}
            resolve(result);
        };
        try {
            channel = new windowRef.MessageChannel();
            channel.port1.onmessage = event => {
                const result = event && event.data;
                if (!result || result.status !== "success" || !Number.isInteger(Number(result.removedCount))) {
                    finish({ status: "error", message: "El Service Worker devolvió una confirmación de limpieza inválida." });
                    return;
                }
                finish({ status: "success", removedCount: Number(result.removedCount), preservedCount: Math.max(0, Number(result.preservedCount) || 0) });
            };
            channel.port1.onmessageerror = () => finish({ status: "error", message: "No se pudo leer la confirmación de Cache Storage." });
            timeoutId = windowRef.setTimeout(() => finish({
                status: "timeout", message: "El Service Worker no confirmó la limpieza de Cache Storage dentro del tiempo permitido."
            }), safeTimeoutMs);
            worker.postMessage({ type: "GPSEPEDIA_CLEAR_RUNTIME_CACHE" }, [channel.port2]);
        } catch (error) {
            finish({ status: "error", message: error && error.message ? error.message : "No se pudo solicitar la limpieza de Cache Storage." });
        }
    });
}
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

function renderNavigationBackButton(container, targetState) {
    const button = document.createElement('span');
    button.className = 'backBtn';
    button.innerHTML = `${backSvg} Volver`;
    button.addEventListener('click', () => volverAEstado(targetState));
    container.prepend(button);
}

function renderNavigationTarget_(targetState) {
    const state = targetState || { level: 'categorias' };
    setState({ navigationState: state });
    const searchInput = document.getElementById('searchInput');
    if (state.level === 'busqueda' || state.level === 'busqueda_focused') {
        if (searchInput) {
            searchInput.value = state.query || '';
            if (searchInput.parentElement) searchInput.parentElement.classList.toggle('has-text', Boolean(state.query));
        }
        document.body.classList.toggle('search-active', state.level === 'busqueda_focused');
        if (window.navigation && window.navigation.filtrarContenido) window.navigation.filtrarContenido(state.query || '', true);
        return;
    }
    switch (state.level) {
        case 'marcas': mostrarMarcas(state.categoria); break;
        case 'modelosPorMarca': mostrarModelosPorMarca(state.marca); break;
        case 'modelos': mostrarModelos(state.categoria, state.marca, state.versionEquipamiento || null); break;
        case 'tiposEncendido': mostrarTiposEncendido(state.categoria, state.marca, state.versionEquipamiento || null, state.modelo); break;
        case 'versiones': {
            const cortes = (getState().catalogData || {}).cortes || [];
            const filas = cortes.filter(item => item.categoria === state.categoria &&
                item.marca === state.marca && item.modelo === state.modelo &&
                (!state.versionEquipamiento || item.versionesAplicables === state.versionEquipamiento) &&
                (!state.tipoEncendido || item.tipoEncendido === state.tipoEncendido));
            mostrarVersiones(filas, state.categoria, state.marca, state.modelo);
            break;
        }
        case 'versionesEquipamiento': mostrarVersionesEquipamiento(state.categoria, state.marca, state.modelo); break;
        case undefined:
            if (state.section) mostrarSeccion(state.section, true);
            else if (window.navigation && window.navigation.irAPaginaPrincipal) window.navigation.irAPaginaPrincipal(true);
            break;
        case 'categorias':
        default:
            if (window.navigation && window.navigation.irAPaginaPrincipal) window.navigation.irAPaginaPrincipal(true);
    }
}

export function volverAEstado(targetState) {
    const target = targetState && targetState.level ? targetState : { level: 'categorias' };
    return navigateBackToState(target, {
        previousNavigationState: getState().navigationState,
        renderFallback: renderNavigationTarget_
    });
}


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

// Variantes PNG locales; el tamaño es el ancho máximo, nunca una ampliación.
export const IMAGE_VARIANTS = Object.freeze({ SMALL: 300, MEDIUM: 800, LARGE: 1600 });
export const IMG_SIZE_SMALL = IMAGE_VARIANTS.SMALL;
export const IMG_SIZE_MEDIUM = IMAGE_VARIANTS.MEDIUM;
export const IMG_SIZE_LARGE = IMAGE_VARIANTS.LARGE;
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

export function clearModalNavStack(){modalNavStack.length=0;}
let pendingModalViewRestore_=null;
function registerModalNavigationTransition_(targetType,currentType,modalWasVisible,navOptions={}){
 if(navOptions._restoreFromStack)return;
 const origin=navOptions.fromOriginModal;
 if(shouldRecordModalTransition(targetType,currentType,modalWasVisible,navOptions)){
  pendingModalViewRestore_=null;
  pushModalNavigationContext(modalNavStack,origin,captureModalViewState(document.getElementById("modalDetalle")));
  return;
 }
 if((!modalWasVisible||(currentType&&currentType!==targetType))&&!navOptions.originModal){modalNavStack.length=0;pendingModalViewRestore_=null;}
}
function applyPendingModalViewRestore_(){
 if(!pendingModalViewRestore_)return false;
 const result=restoreModalViewState(document.getElementById("modalDetalle"),pendingModalViewRestore_);
 const pendingAccordion=pendingModalViewRestore_.accordion&&!result.accordionRestored?pendingModalViewRestore_.accordion:null;
 const pendingTracks=result.pendingHorizontalScrolls||[];
 pendingModalViewRestore_=pendingAccordion||pendingTracks.length?{accordion:pendingAccordion,horizontalScrolls:pendingTracks}:null;
 return true;
}
function stopModalDetailMedia_(){
 const cont=document.getElementById("detalleCompleto");if(!cont)return;
 cont.querySelectorAll("iframe").forEach(iframe=>{try{if(iframe.contentWindow)iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}','*');}catch(error){}iframe.src="";iframe.remove();});
}
export function restoreModalNavigationContext(){
 const context=popModalNavigationContext(modalNavStack);
 if(!context)return false;
 stopModalDetailMedia_();pendingModalViewRestore_=context.viewState||null;
 const restoreOptions={...(context.navOptions||{}),_restoreFromStack:true};
 if(context.type==="vehicle")mostrarDetalleModal(context.item,true,restoreOptions);else openPysDetailModal(context.item,restoreOptions);
 return true;
}
function closeModalToPreviousContext_(){
 if(window.history&&window.history.state&&window.history.state.modalOpen){window.history.back();return true;}
 return restoreModalNavigationContext();
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
    return context && ["desarrollador", "jefe", "supervisor"].includes(role) ? context : null;
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

async function saveFieldSilently(vehicleId, fieldName, value, expectedCurrentValue) {
    showSavingIndicator("saving", "Guardando...");
    try {
        const result = await routeAction("updateVehicleField", {
            vehicleId, fieldName, value, enforceExpectedCurrentValue: true, expectedCurrentValue,
            ...getDeveloperSessionPayload()
        });
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

export async function exitModalEditMode(saveChanges, vehicleId, skipReopen = false, navOptions = {}) {
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
            const currentResponse = await routeAction("getCatalogData");
            if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
            if (!currentResponse || !currentResponse.data || !Array.isArray(currentResponse.data.cortes)) {
                throw new Error("No se pudo leer el catálogo para identificar los campos pendientes de restauración.");
            }
            const currentEditItem = currentResponse.data.cortes.find(item => String(item.id) === cleanVehicleId) || null;
            if (!currentEditItem) throw new Error("El vehículo ya no aparece en el catálogo; no se inició la restauración.");
            const fieldsToRestore = getEditBackupFieldsToRestore(
                backupSnapshot, currentEditItem, ADMIN_MODAL_EDIT_FIELDS
            );
            for (const field of fieldsToRestore) {
                if (!isCurrentUiSessionContext_(editSession)) throw new Error("EDIT_SESSION_CHANGED");
                const restored = await saveFieldSilently(cleanVehicleId, field, backupSnapshot[field], currentEditItem[field]);
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

            if (!skipReopen) mostrarDetalleModal(updatedItem, true, navOptions);
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
                    if (updatedItem) mostrarDetalleModal(updatedItem, true, navOptions);
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
    const values = text.split(/[,\/\\;]/)
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

    // Normalizar VIN completos heredados y extraer los cuatro caracteres distintivos.
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
const IMAGE_FALLBACK_DATA_URL = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eef0f2"/><path d="M150 170l35-38 28 29 22-23 40 48H125z" fill="#c2c8ce"/><circle cx="175" cy="100" r="17" fill="#c2c8ce"/><text x="200" y="225" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#68717a">Imagen no disponible</text></svg>'
);

export async function setOptimizedImage(imgElement, fileId, size = IMG_SIZE_SMALL) {
    const requestToken = thumbnailObjectUrls.begin(imgElement);
    const previousHandlers = imgElement.__gpImageHandlers;
    if (previousHandlers) {
        imgElement.removeEventListener('load', previousHandlers.load);
        imgElement.removeEventListener('error', previousHandlers.error);
    }
    imgElement.classList.add('gp-image-loading');
    imgElement.classList.remove('gp-image-loaded', 'gp-image-unavailable', 'gp-image-fallback');
    imgElement.dataset.gpImageState = 'loading';
    imgElement.setAttribute('aria-busy', 'true');
    imgElement.removeAttribute('src');

    const isCurrent = () => thumbnailObjectUrls.isCurrent(imgElement, requestToken);
    const setSource = (source, fallback = false) => {
        if (!isCurrent()) return false;
        imgElement.classList.toggle('gp-image-fallback', fallback);
        imgElement.src = source;
        return true;
    };
    let imageLoaded = false;
    const markLoaded = () => {
        if (!isCurrent()) return;
        imageLoaded = true;
        imgElement.classList.remove('gp-image-loading', 'gp-image-unavailable');
        const isFallback = imgElement.src === IMAGE_FALLBACK_DATA_URL;
        imgElement.classList.toggle('gp-image-fallback', isFallback);
        imgElement.classList.add('gp-image-loaded');
        imgElement.dataset.gpImageState = isFallback ? 'fallback' : 'loaded';
        imgElement.setAttribute('aria-busy', 'false');
    };
    const markFailed = event => {
        if (!isCurrent()) return;
        const restoreBtn = document.getElementById('btn-admin-restore-trash');
        if (restoreBtn) restoreBtn.style.display = 'block';
        imgElement.classList.remove('gp-image-loading', 'gp-image-loaded');
        imgElement.classList.add('gp-image-unavailable');
        imgElement.dataset.gpImageState = 'unavailable';
        imgElement.setAttribute('aria-busy', 'false');
        console.warn('No se pudo cargar una imagen del catálogo.');
        if (typeof imgElement.onerror === 'function') {
            try { imgElement.onerror.call(imgElement, event); } catch (error) {}
        }
        setSource(IMAGE_FALLBACK_DATA_URL, true);
    };
    imgElement.addEventListener('load', markLoaded);
    imgElement.addEventListener('error', markFailed);
    imgElement.__gpImageHandlers = { load: markLoaded, error: markFailed };

    if (!fileId) {
        setSource(IMAGE_FALLBACK_DATA_URL, true);
        return;
    }

    const cleanId = typeof fileId === 'string' ? fileId.trim() : fileId;
    const normalizedSize = Math.max(100, Math.min(1600, Math.round(Number(size) || IMG_SIZE_SMALL)));
    const cacheKey = offline.getThumbnailCacheKey(cleanId, normalizedSize);
    if (typeof cleanId === 'string' && /^(?:blob:|data:)/i.test(cleanId)) {
        setSource(cleanId);
        return;
    }

    // Iniciar la imagen original de inmediato; la consulta IndexedDB ocurre en paralelo.
    const remoteUrl = getImageUrl(cleanId, normalizedSize);
    setSource(remoteUrl);
    const cachedBlob = await Promise.race([
        offline.getThumbnail(cleanId, normalizedSize),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 800))
    ]).catch(() => null);
    if (!isCurrent()) return;
    if (cachedBlob && !imageLoaded && thumbnailObjectUrls.attach(cacheKey, cachedBlob, imgElement, requestToken)) return;

    if (!cachedBlob && cleanId && typeof cleanId === 'string' && !cleanId.startsWith('blob:') &&
        !cleanId.startsWith('data:') && !cleanId.includes('placehold.co')) {
        offline.compressAndStoreThumbnail(remoteUrl, cleanId, normalizedSize).then(blob => {
            if (blob && !imageLoaded && isCurrent()) {
                thumbnailObjectUrls.attach(cacheKey, blob, imgElement, requestToken);
            }
        }).catch(() => {});
    }
}

/**
 * Devuelve la fuente original sin transformaciones CDN. Drive conserva
 * https://lh3.googleusercontent.com/d/{fileId} para todos los tamaños: =w/=s
 * pueden convertir PNG transparentes y perder el canal alfa.
 * Las variantes 300/800/1600 px se generan localmente como PNG. size se mantiene
 * por compatibilidad con los llamadores existentes.
 */
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
    const { catalogData, navigationState: currentNavigationState } = getState();
    const { cortes } = catalogData;
    const previousState = currentNavigationState && currentNavigationState.level === 'marcas' &&
        currentNavigationState.categoria === categoria
        ? (currentNavigationState.previousState || {})
        : (currentNavigationState || {});
    const nextState = { level: "marcas", categoria, origin: "categoria", previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState || { level: 'categorias' } });
    const cont = document.getElementById("contenido");
    cont.innerHTML = `<h4>Marcas de ${categoria}</h4>`;
    const backTarget = previousState && (['categorias', 'busqueda', 'busqueda_focused'].includes(previousState.level) || previousState.section === 'cortes')
        ? previousState
        : { level: 'categorias' };
    renderNavigationBackButton(cont, backTarget);
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
    const currentNavigationState = getState().navigationState || {};
    const previousState = currentNavigationState.level === 'modelosPorMarca' && currentNavigationState.marca === marca
        ? (currentNavigationState.previousState || {})
        : currentNavigationState;
    const nextState = { level: "modelosPorMarca", marca, origin: "marca", previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState });
    const cont = document.getElementById("contenido");
    const backTarget = previousState && (
        ['categorias', 'busqueda', 'busqueda_focused'].includes(previousState.level) ||
        previousState.section === 'cortes'
    ) ? previousState : { level: 'categorias' };
    cont.innerHTML = `<h4>Modelos de ${marca}</h4>`;
    renderNavigationBackButton(cont, backTarget);

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
    const currentNavigationState = navigationState || {};
    const isSameView = currentNavigationState.level === 'modelos' &&
        currentNavigationState.categoria === categoria && currentNavigationState.marca === marca &&
        (currentNavigationState.versionEquipamiento || null) === (versionEquipamiento || null);
    const previousState = isSameView ? (currentNavigationState.previousState || {}) : currentNavigationState;
    const origin = previousState.origin || currentNavigationState.origin || "categoria";
    const nextState = { level: "modelos", categoria, marca, versionEquipamiento, origin, previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState });
    const cont = document.getElementById("contenido");
    let backTarget;
    if (['busqueda', 'busqueda_focused', 'versionesEquipamiento', 'modelosPorMarca', 'marcas'].includes(previousState.level) || previousState.section === 'cortes') backTarget = previousState;
    else if (versionEquipamiento) backTarget = { level: 'versionesEquipamiento', categoria, marca, modelo: previousState.modelo };
    else backTarget = { level: 'marcas', categoria, origin: 'categoria' };
    cont.innerHTML = `<h4>Modelos de ${marca} ${versionEquipamiento || ''}</h4>`;
    renderNavigationBackButton(cont, backTarget);

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
    const currentNavigationState = navigationState || {};
    const isSameView = currentNavigationState.level === 'tiposEncendido' &&
        currentNavigationState.categoria === categoria && currentNavigationState.marca === marca &&
        currentNavigationState.modelo === modelo &&
        (currentNavigationState.versionEquipamiento || null) === (versionEquipamiento || null);
    const previousState = isSameView ? (currentNavigationState.previousState || {}) : currentNavigationState;
    const origin = previousState.origin || currentNavigationState.origin || "categoria";
    const nextState = { level: "tiposEncendido", categoria, marca, versionEquipamiento, modelo, origin, previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState });
    const cont = document.getElementById("contenido");
    let backTarget;
    if (['busqueda', 'busqueda_focused', 'versionesEquipamiento', 'modelosPorMarca', 'modelos'].includes(previousState.level) || previousState.section === 'cortes') backTarget = previousState;
    else backTarget = { level: 'modelos', categoria, marca, origin };
    cont.innerHTML = `<h4>Tipos de Encendido para ${modelo} ${versionEquipamiento || ''}</h4>`;
    renderNavigationBackButton(cont, backTarget);

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
    const currentNavigationState = navigationState || {};
    const isSameView = currentNavigationState.level === 'versiones' &&
        currentNavigationState.categoria === categoria && currentNavigationState.marca === marca &&
        currentNavigationState.modelo === modelo;
    const previousState = isSameView ? (currentNavigationState.previousState || {}) : currentNavigationState;
    const origin = previousState.origin || currentNavigationState.origin || "categoria";
    const versionValues = [...new Set((Array.isArray(filas) ? filas : []).map(item => item && item.versionesAplicables).filter(Boolean))];
    const ignitionValues = [...new Set((Array.isArray(filas) ? filas : []).map(item => item && item.tipoEncendido).filter(Boolean))];
    const versionEquipamiento = versionValues.length === 1 ? versionValues[0] : (previousState.versionEquipamiento || null);
    const tipoEncendido = ignitionValues.length === 1 ? ignitionValues[0] : (previousState.tipoEncendido || null);
    const nextState = { level: "versiones", categoria, marca, modelo, origin, versionEquipamiento, tipoEncendido, previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState });
    const cont = document.getElementById("contenido");
    let backTarget;
    if (['busqueda', 'busqueda_focused', 'tiposEncendido', 'versionesEquipamiento', 'modelosPorMarca', 'modelos'].includes(previousState.level) || previousState.section === 'cortes') backTarget = previousState;
    else backTarget = { level: 'modelos', categoria, marca, origin };
    cont.innerHTML = `<h4>Años de ${modelo}</h4>`;
    renderNavigationBackButton(cont, backTarget);
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
    const previousState = navigationState ? navigationState.previousState : null;
    const target = previousState && ['busqueda', 'busqueda_focused'].includes(previousState.level)
        ? previousState
        : { level: 'categorias' };
    return volverAEstado(target);
}

/* TAREA 7 (B18): CONTEXTO 'ORIGIN' MARCA/CATEGORÍA Y RETORNO LIMPIO SIN BUCLES */
export function mostrarVersionesEquipamiento(categoria, marca, modelo) {
    const { catalogData, navigationState } = getState();
    const { cortes } = catalogData;
    const currentNavigationState = navigationState || {};
    const isSameView = currentNavigationState.level === 'versionesEquipamiento' &&
        currentNavigationState.categoria === categoria && currentNavigationState.marca === marca &&
        currentNavigationState.modelo === modelo;
    const previousState = isSameView ? (currentNavigationState.previousState || {}) : currentNavigationState;
    const origin = previousState.origin || currentNavigationState.origin || "categoria";
    const nextState = { level: "versionesEquipamiento", categoria, marca, modelo, origin, previousState };
    setState({ navigationState: nextState });
    pushNavigationState(nextState, { previousNavigationState: previousState });
    const cont = document.getElementById("contenido");
    const backTarget = previousState &&
        (['busqueda', 'busqueda_focused', 'modelosPorMarca', 'modelos'].includes(previousState.level) || previousState.section === 'cortes')
        ? previousState
        : { level: 'modelos', categoria, marca, origin };
    cont.innerHTML = `<h4>Versiones de ${modelo}</h4>`;
    renderNavigationBackButton(cont, backTarget);

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
    const heading = document.createElement("h4");
    heading.textContent = `Resultados para: "${String(query ?? "")}"`;
    cont.textContent = "";
    cont.appendChild(heading);

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
    const cont = document.getElementById("contenido");
    if (!cont) return;
    const message = document.createElement("p");
    message.style.cssText = "text-align:center; padding: 20px;";
    message.textContent = `No se encontraron resultados para "${String(textoBusqueda ?? "")}".`;
    cont.textContent = "";
    cont.appendChild(message);
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

    const modalDetalle=document.getElementById("modalDetalle");
    const modalWasVisible=Boolean(modalDetalle&&modalDetalle.classList.contains("visible"));
    const currentModalType=modalDetalle&&modalDetalle.dataset.modalType;
    const sameModalViewState=modalWasVisible&&currentModalType==='corte'?captureModalViewState(modalDetalle):null;
    registerModalNavigationTransition_('corte',currentModalType,modalWasVisible,navOptions);
    if (modalDetalle) { modalDetalle.dataset.modalType = 'corte'; modalDetalle.dataset.vehicleId = String(activeItem.id); delete modalDetalle.dataset.validationBannerRequestedVehicleId; }

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
    /* AUG-072: enlace con identidad estable y fallback controlado */
    shareBtn.onclick = async () => {
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
            url: buildVehicleShareUrl(window.location.href, activeItem.id, shareQuery)
        };

        shareBtn.disabled = true;
        try {
            let result;
            try {
                result = await shareVehicleLink(shareData, navigator);
            } catch (error) {
                result = { status: 'failed', error };
            }

            headerDiv.querySelector('.share-manual-link-container')?.remove();
            if (result.status === 'shared') {
                mostrarNotificacion('Enlace compartido correctamente.', 'success');
            } else if (result.status === 'cancelled') {
                // AbortError es una cancelación explícita: no copiar automáticamente.
                mostrarNotificacion('Compartir cancelado.', 'info');
            } else if (result.status === 'copied') {
                mostrarNotificacion('Enlace copiado al portapapeles.', 'success');
            } else {
                mostrarNotificacion('No se pudo compartir ni copiar el enlace. Puedes copiarlo manualmente.', 'error');
                const fallbackContainer = document.createElement('div');
                fallbackContainer.className = 'share-manual-link-container';
                fallbackContainer.style.cssText = 'display:flex;flex-direction:column;gap:5px;flex-basis:100%;min-width:0;';
                const fallbackLabel = document.createElement('label');
                fallbackLabel.textContent = 'Enlace para copiar manualmente:';
                fallbackLabel.htmlFor = 'share-manual-link';
                const fallbackInput = document.createElement('input');
                fallbackInput.id = 'share-manual-link';
                fallbackInput.className = 'share-manual-link';
                fallbackInput.type = 'text';
                fallbackInput.readOnly = true;
                fallbackInput.value = shareData.url;
                fallbackInput.setAttribute('aria-label', 'Enlace compartido para copiar manualmente');
                fallbackInput.style.cssText = 'width:100%;min-width:0;padding:7px;border:1px solid var(--border-color);border-radius:5px;';
                fallbackContainer.append(fallbackLabel, fallbackInput);
                headerDiv.appendChild(fallbackContainer);
                fallbackInput.focus();
                fallbackInput.select();
            }
        } finally {
            shareBtn.disabled = false;
        }
    };
    headerDiv.appendChild(shareBtn);

    const userRole = normalizeUiRole_(getUiSessionContext_()?.role || "");
    const canPrintOrEditVehicle = ["desarrollador", "jefe", "supervisor"].includes(userRole);

    // Imprimir ficha técnica: Supervisor, Jefe y Desarrollador.
    if (canPrintOrEditVehicle) {
        const printBtn = document.createElement("button");
        printBtn.innerHTML = '<i class="fa-solid fa-print"></i>';
        printBtn.className = "share-modal-btn";
        printBtn.title = "Imprimir / Exportar Ficha Técnica";
        printBtn.onclick = () => exportVehiclePrintSheet(activeItem);
        headerDiv.appendChild(printBtn);
    }

    if (canPrintOrEditVehicle) {
        if (inEditMode) {
            // Botón Restablecer (↩️)
            const resetBtn = document.createElement("button");
            resetBtn.innerHTML = '↩️';
            resetBtn.className = "share-modal-btn";
            resetBtn.title = "Descartar cambios";
            resetBtn.style.fontSize = "1.2em";
            resetBtn.onclick = () => exitModalEditMode(false, activeItem.id, false, navOptions);
            headerDiv.appendChild(resetBtn);

            // Botón Guardar (✅)
            const saveBtn = document.createElement("button");
            saveBtn.innerHTML = '✅';
            saveBtn.className = "share-modal-btn";
            saveBtn.title = "Guardar cambios y finalizar";
            saveBtn.style.fontSize = "1.2em";
            saveBtn.onclick = () => exitModalEditMode(true, activeItem.id, false, navOptions);
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
                mostrarDetalleModal(editedItemBuffer, true, navOptions);
            };
            headerDiv.appendChild(editBtn);
        }
    }

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick=async()=>{
        if(inEditMode){const discarded=await exitModalEditMode(false,activeItem.id,false,navOptions);if(!discarded)return;}
        stopModalDetailMedia_();
        if(modalNavStack.length>0){closeModalToPreviousContext_();return;}
        const searchInput=document.getElementById('searchInput'),isSearchActive=document.body.classList.contains('search-active');
        if(window.history&&window.history.state&&window.history.state.modalOpen)window.history.back();
        else{document.getElementById("modalDetalle").classList.remove("visible");modalNavStack.length=0;if(isSearchActive&&searchInput)setTimeout(()=>searchInput.focus(),300);}
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
            const previousNavigationState = getState().navigationState || { level: 'categorias' };
            const targetState = {
                level: "modelosPorMarca",
                marca: activeItem.marca,
                origin: "marca",
                previousState: previousNavigationState
            };
            setState({ navigationState: targetState });
            replaceNavigationState(targetState, { previousNavigationState });
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
                 const previousNavigationState = getState().navigationState || { level: 'categorias' };
                 const targetState = {
                     level: "modelos",
                     categoria: activeItem.categoria,
                     marca: activeItem.marca,
                     origin: "categoria",
                     versionEquipamiento: null,
                     previousState: previousNavigationState
                 };
                 setState({ navigationState: targetState });
                 replaceNavigationState(targetState, { previousNavigationState });
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

    // AUG-110: la elegibilidad pertenece al ciclo del modal, no a la carga de imágenes/cortes.
    if (!inEditMode && modalDetalle) {
        startValidationBannerForModal({
            item: activeItem,
            modalElement: modalDetalle,
            detailContainer: cont,
            checkEligibility: checkValidationEligibility,
            showBanner: showValidationBanner
        }).catch(error => console.warn("No se pudo iniciar la validación comunitaria:", error));
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
    if(sameModalViewState)requestAnimationFrame(()=>restoreModalViewState(modalDetalle,sameModalViewState));
    applyPendingModalViewRestore_();
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
            return updateFullState(newCatalogData);
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
            return true;
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
        return true;

    } catch (e) {
        console.error("Error en performSilentSync:", e);
        throw e;
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
        return true;
    } catch (e) {
        console.error("Error actualizando estado global tras sincronización:", e);
        throw e;
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
function createPysCard(item, originModal = null, vehicleToUnlink = null, onUnlinkSuccess = null, navigationOptions = {}) {
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
            navOptions: navigationOptions || {}
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
    const title = document.createElement("div");
    title.className = "overlay-text-primary";
    title.style.cssText = "font-size: 0.85rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    title.textContent = item.Problema || "Problema";

    const status = document.createElement("div");
    status.className = "overlay-text-secondary";
    status.style.cssText = `font-size: 0.75rem; color: ${statusColor}; font-weight: bold;`;
    status.textContent = statusText;
    overlay.append(title, status);
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
        const freshness = getPysDataFreshness();
        if (freshness.hasCache && freshness.stale) {
            const staleNotice = document.createElement("p");
            staleNotice.className = "pys-stale-notice";
            staleNotice.textContent = "Los datos PyS guardados podrían estar desactualizados.";
            staleNotice.style.cssText = "font-size:0.78rem;color:var(--text-disabled);margin:4px 0 8px;";
            wrapper.appendChild(staleNotice);
        }

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
            applyPendingModalViewRestore_();
            return;
        }

        // Crear el acordeón con el título aprobado en la especificación de PyS.
        const btn = document.createElement("button");
        btn.className = "accordion-btn";
        btn.innerHTML = `<span class="accordion-title">Problemas relacionados a este vehículo</span><span class="accordion-arrow">▼</span>`;

        const panel = document.createElement("div");
        panel.className = "panel-desplegable";

        const contentWrapper = document.createElement("div");
        contentWrapper.style.padding = "15px 10px";

        if (relatedProblems.length === 1) {
            // REQUISITO: Si existe un solo problema, mostrar su tarjeta y la tarjeta para agregar/vincular problema
            const singleCardContainer = document.createElement("div");
            singleCardContainer.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap;";
            const singleCard = createPysCard(relatedProblems[0], 'vehicle', activeItem, () => {
                renderPosiblesProblemasAccordion(container, activeItem, navOptions);
            }, navOptions);
            singleCardContainer.appendChild(singleCard);

            // Tarjeta para agregar o vincular problema sin borde discontinuo
            const addPysCard = document.createElement("div");
            addPysCard.className = "card card-create-pys-assoc";
            addPysCard.style.cssText = "width: 140px; height: 120px; padding: 10px; margin: 0;";
            addPysCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 8px;"></i> <span style="font-size: 0.85rem; font-weight: 600; text-align: center;">Agregar Problema</span>`;
            addPysCard.onclick = () => openAssociateExistingProblemModal(activeItem, navOptions);
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
                }, navOptions);
                carouselTrack.appendChild(card);
            });

            // Tarjeta al final del carrusel para agregar o vincular problema
            const addPysCard = document.createElement("div");
            addPysCard.className = "card card-create-pys-assoc";
            addPysCard.style.cssText = "flex: 0 0 140px; height: 120px; padding: 10px; margin-right: 20px;";
            addPysCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 8px;"></i> <span style="font-size: 0.85rem; font-weight: 600; text-align: center;">Agregar Problema</span>`;
            addPysCard.onclick = () => openAssociateExistingProblemModal(activeItem, navOptions);
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
            pendingModalViewRestore_ = null;
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
        applyPendingModalViewRestore_();
    };

    // 1. Evaluar si ya existen datos en caché en el estado
    const cachedPys = getCachedPysData();
    if (Array.isArray(cachedPys) && cachedPys.length > 0) {
        updateAccordion(cachedPys);
    }

    // 2. Actualizar en segundo plano usando la misma promesa compartida que búsqueda y autenticación.
    loadPysData().then(updateAccordion).catch(err => {
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
            // La validación comunitaria se inicia desde el ciclo del modal (AUG-110).
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
        const overlayId = modal.dataset.gpOverlayHistoryId;
        if (overlayId && window.overlayHistory && typeof window.overlayHistory.close === 'function') {
            window.overlayHistory.close(overlayId);
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

}

let inboxViewGeneration_ = 0;
let inboxDetailGeneration_ = 0;
let inboxPageCursorStack_ = [null];
let inboxPageIndex_ = 0;
const INBOX_PAGE_SIZE_ = 40;
const inboxPageCache_ = createInboxPageCache({ ttlMs: 60000, maxEntries: 80 });

function normalizeUiRole_(role) {
    const normalized = String(role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return normalized;
}

function canApproveInboxVideo_(role) {
    return ['desarrollador', 'jefe', 'supervisor'].includes(normalizeUiRole_(role));
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

let uiRoleValidationInFlight_ = null;

async function ensureUiSessionRole_(allowedRoles) {
    const expected = getUiSessionContext_();
    if (!expected || !Array.isArray(allowedRoles) || !allowedRoles.includes(expected.role)) return null;
    const authApi = typeof window !== 'undefined' ? window.auth : null;
    if (!authApi || typeof authApi.validateActiveSession !== 'function') {
        logDeveloperDiagnostic_('El cliente AUTH no está disponible; la interfaz usa el rol local y el servidor mantiene la autorización de cada operación.', 'warning');
        return expected;
    }
    // La apertura visual no espera la red. AUTH valida en segundo plano y cada acción protegida
    // continúa requiriendo autorización del servicio correspondiente.
    const validationKey = expected.userId + '\u0000' + expected.sessionToken;
    let pending = uiRoleValidationInFlight_;
    if (!pending || pending.key !== validationKey) {
        const promise = Promise.resolve().then(() => authApi.validateActiveSession(false));
        pending = { key: validationKey, promise };
        uiRoleValidationInFlight_ = pending;
        promise.then(
            valid => {
                if (valid === null) logDeveloperDiagnostic_('AUTH está temporalmente indisponible; las operaciones protegidas seguirán validándose en el servidor.', 'warning');
                if (uiRoleValidationInFlight_ === pending) uiRoleValidationInFlight_ = null;
            },
            error => {
                console.debug('No se pudo completar la validación de AUTH en segundo plano:', error && error.message ? error.message : error);
                logDeveloperDiagnostic_('La validación de AUTH se pospuso por una incidencia de conexión.', 'warning');
                if (uiRoleValidationInFlight_ === pending) uiRoleValidationInFlight_ = null;
            }
        );
    }
    const current = getUiSessionContext_();
    return current && isCurrentUiSessionContext_(expected) && allowedRoles.includes(current.role) ? current : null;
}

function getSessionPayload_() {
    const context = getUiSessionContext_();
    if (!context) throw new Error('No hay una sesión activa válida.');
    return { userId: context.userId, sessionToken: context.sessionToken };
}

function invalidateInboxCache_(context = getUiSessionContext_()) {
    return inboxPageCache_.invalidate(context);
}

let lastInboxCacheScope_ = inboxPageCache_.getScopeKey(getUiSessionContext_());
subscribe(() => {
    const nextScope = inboxPageCache_.getScopeKey(getUiSessionContext_());
    if (nextScope !== lastInboxCacheScope_) {
        inboxPageCache_.clear();
        lastInboxCacheScope_ = nextScope;
        inboxPageCursorStack_ = [null];
        inboxPageIndex_ = 0;
        inboxViewGeneration_ += 1;
        inboxDetailGeneration_ += 1;
    }
});

function renderInboxPagination_(page, context, generation) {
    const listContainer = document.getElementById('inbox-list');
    if (!listContainer || !page || generation !== inboxViewGeneration_ || !isCurrentUiSessionContext_(context)) return;
    const navigation = document.createElement('div');
    navigation.className = 'inbox-pagination';
    navigation.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 4px;';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.id = 'inbox-page-previous';
    previous.className = 'btn btn-secondary';
    previous.textContent = 'Anterior';
    previous.disabled = inboxPageIndex_ <= 0;
    previous.addEventListener('click', () => {
        if (generation !== inboxViewGeneration_ || !isCurrentUiSessionContext_(context) || inboxPageIndex_ <= 0) return;
        inboxPageIndex_ -= 1;
        loadAndRenderInbox({ context, cursor: inboxPageCursorStack_[inboxPageIndex_] });
    });
    const label = document.createElement('span');
    label.textContent = 'Página ' + String(inboxPageIndex_ + 1) + (Number.isFinite(page.total) ? ' · ' + String(page.total) + ' registros' : '');
    label.setAttribute('aria-live', 'polite');
    const next = document.createElement('button');
    next.type = 'button';
    next.id = 'inbox-page-next';
    next.className = 'btn btn-primary';
    next.textContent = 'Siguiente';
    next.disabled = page.hasMore !== true || !page.nextCursor;
    next.addEventListener('click', () => {
        if (generation !== inboxViewGeneration_ || !isCurrentUiSessionContext_(context) || !page.nextCursor) return;
        inboxPageCursorStack_[inboxPageIndex_ + 1] = page.nextCursor;
        inboxPageIndex_ += 1;
        loadAndRenderInbox({ context, cursor: page.nextCursor });
    });
    navigation.append(previous, label, next);
    listContainer.appendChild(navigation);
}


let lastShownAppContextKey = null;
let lastShownAppContext = null;
let pendingDriveAuditClear_ = Promise.resolve(true);
const pendingDriveAuditClearOwners_ = new Set();

function processPendingDriveAuditClears_(currentOwnerId = '') {
    const ownerIdToRecover = String(currentOwnerId || '').trim();
    if (ownerIdToRecover && offline.hasPendingDriveAuditClear(ownerIdToRecover)) {
        pendingDriveAuditClearOwners_.add(ownerIdToRecover);
    }
    if (pendingDriveAuditClearOwners_.size === 0) return Promise.resolve(true);
    pendingDriveAuditClear_ = pendingDriveAuditClear_.catch(() => false).then(async () => {
        while (pendingDriveAuditClearOwners_.size > 0) {
            const ownerId = pendingDriveAuditClearOwners_.values().next().value;
            const result = await offline.clearDriveAuditState(ownerId, true);
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

const REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_ = 'replaced-images-lightbox';

function closeReplacedImagesLightbox_(fromHistory = false) {
    const historyManager = window.overlayHistory;
    if (!fromHistory && historyManager &&
        historyManager.getStack().includes(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_)) {
        historyManager.close(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_);
        return;
    }
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
    stopInboxSync_();
    clearInboxDraftsForUser_(lastShownAppContext && lastShownAppContext.userId);
    const inboxModal = document.getElementById('inbox-modal');
    const dashboardModal = document.getElementById('dashboard-modal');
    const inboxList = document.getElementById('inbox-list');
    const inboxDetail = document.getElementById('inbox-detail');
    const activityLogs = document.getElementById('activity-logs');
    if (inboxModal) {
        inboxModal.style.display = 'none';
        inboxModal.setAttribute('aria-hidden', 'true');
        deactivateLegalModalFocus_(inboxModal, false);
    }
    document.body.classList.remove('inbox-open');
    if (dashboardModal) dashboardModal.style.display = 'none';
    if (inboxList) inboxList.innerHTML = '';
    if (inboxDetail) inboxDetail.innerHTML = '';
    ['inbox-conversation-list','inbox-conversation-detail','inbox-conversation-status'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.replaceChildren();
    });
    if (activityLogs) activityLogs.innerHTML = '';
    invalidateInboxCache_();
}

function resetSessionUi_() {
    developerDiagnosticQueue_.length = 0;
    window.gpsepediaDeveloperLog = null;
    window.__gpsepediaAuthCoordinatorWarningLogged = false;
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
    if (window.adminServiceMetricsRefreshInterval) {
        clearInterval(window.adminServiceMetricsRefreshInterval);
        window.adminServiceMetricsRefreshInterval = null;
    }
    window.adminListenersAttached = false;
    window.triggerAdminPanelPing = null;
    closeReplacedImagesLightbox_(true);
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
        'service-health-detail', 'service-traffic-chart'
    ];
    transientAdminIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        if (element.tagName === 'INPUT') element.value = '';
        else element.replaceChildren();
    });
    const logoFileInput = document.getElementById('logo-file-input');
    if (logoFileInput) logoFileInput.value = '';

    const devProgress = document.getElementById('dev-progress-container');
    if (devProgress) devProgress.style.display = 'none';

    restorePrivilegedModalTemplates_();
    lastShownAppContextKey = null;
}

const legalModalFocusCleanups_ = new WeakMap();

function getLegalModalFocusableElements_(modal) {
    return Array.from(modal.querySelectorAll(
        'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true' &&
        typeof element.focus === 'function' && element.getClientRects().length > 0);
}

function deactivateLegalModalFocus_(modal, restoreFocus = true) {
    if (!modal) return;
    const cleanup = legalModalFocusCleanups_.get(modal);
    if (cleanup) cleanup(restoreFocus);
}

function isTopmostManagedModal_(modal) {
    const visibleModals = Array.from(document.querySelectorAll('.info-modal, .terms-overlay')).filter(element => {
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        return (style ? style.display !== 'none' : element.style.display !== 'none') &&
            element.getClientRects().length > 0;
    });
    if (!visibleModals.includes(modal)) return false;
    const zIndex = element => {
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        const value = style ? style.zIndex : element.style.zIndex;
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    let topmost = visibleModals[0];
    visibleModals.slice(1).forEach(element => {
        if (zIndex(element) >= zIndex(topmost)) topmost = element;
    });
    return topmost === modal;
}

function activateLegalModalFocus_(modal, options = {}) {
    if (!modal || legalModalFocusCleanups_.has(modal)) return;
    const requestedReturnFocus = options.returnFocus;
    const previousFocus = requestedReturnFocus && requestedReturnFocus.isConnected ? requestedReturnFocus : document.activeElement;
    const initialFocus = options.initialFocus || null;
    const allowEscape = options.allowEscape === true;
    const close = typeof options.close === 'function' ? options.close : () => { modal.style.display = 'none'; };
    const parentNotice = modal.id === 'terms-agreement-modal' ? document.getElementById('terms-modal') : null;
    const previousNoticeAriaHidden = parentNotice ? parentNotice.getAttribute('aria-hidden') : null;
    if (parentNotice && parentNotice.style.display === 'flex') parentNotice.setAttribute('aria-hidden', 'true');
    let observer = null, cleaned = false;

    const cleanup = (restoreFocus = true) => {
        if (cleaned) return;
        cleaned = true;
        document.removeEventListener('keydown', handleKeydown, true);
        if (observer) observer.disconnect();
        legalModalFocusCleanups_.delete(modal);
        if (parentNotice) {
            if (previousNoticeAriaHidden === null) parentNotice.removeAttribute('aria-hidden');
            else parentNotice.setAttribute('aria-hidden', previousNoticeAriaHidden);
        }
        if (restoreFocus && previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
    };

    const handleKeydown = event => {
        if (modal.style.display === 'none' || !modal.isConnected) {
            cleanup(true);
            return;
        }
        if (!isTopmostManagedModal_(modal)) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            if (allowEscape) close();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = getLegalModalFocusableElements_(modal);
        if (!focusable.length) {
            event.preventDefault();
            if (initialFocus && typeof initialFocus.focus === 'function') initialFocus.focus();
            return;
        }
        const first = focusable[0], last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const initialIsFocusable = focusable.includes(initialFocus);
        const initialHeading = active === initialFocus && !initialIsFocusable;
        if (event.shiftKey && (active === first || initialHeading || !modal.contains(active))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (active === last || initialHeading || !modal.contains(active))) {
            event.preventDefault();
            first.focus();
        }
    };

    document.addEventListener('keydown', handleKeydown, true);
    if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
            if (modal.style.display === 'none' || !modal.isConnected) cleanup(true);
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    legalModalFocusCleanups_.set(modal, cleanup);
    const target = initialFocus || getLegalModalFocusableElements_(modal)[0];
    if (target && typeof target.focus === 'function') target.focus();
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
                const overlayId = modal.dataset.gpOverlayHistoryId;
                const historyManager = window.overlayHistory;
                if (overlayId && historyManager && historyManager.has(overlayId)) {
                    historyManager.close(overlayId);
                } else if (typeof modal.__gpOverlayClose === 'function') {
                    modal.__gpOverlayClose();
                } else {
                    modal.style.display = 'none';
                }
            });
            closeBtn.dataset.listenerSet = 'true';
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
            renderActivityLogs(logContainer, result.data);
        }
    } catch (error) {
        if (!isCurrentUiSessionContext_(requestContext)) return;
        logContainer.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar actividad</td></tr>';
    }
});

export async function openDashboard() {
    const context = await ensureUiSessionRole_(['desarrollador', 'jefe', 'supervisor']);
    if (!context) return;
    return openDashboardModal_();
}

const openInboxModal_ = setupModal('inbox-modal', async (options = {}) => {
    const context = getUiSessionContext_();
    if (!context) return;
    const modal = document.getElementById('inbox-modal');
    modal.__gpOverlayClose = closeInboxModal_;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('inbox-open');
    bindInboxControls_();
    const requestsTab = document.getElementById('inbox-requests-tab');
    if (requestsTab) requestsTab.hidden = !inboxCanSeeRequests_(context.role);
    const newMessageButton = document.getElementById('inbox-new-message');
    const consultButton = document.getElementById('inbox-consult-developer');
    if (newMessageButton) newMessageButton.hidden = context.role !== 'desarrollador';
    if (consultButton) consultButton.hidden = context.role === 'desarrollador';
    if (modal.dataset.inboxBackdropBound !== 'true') {
        modal.addEventListener('click', event => { if (event.target === modal) closeInboxModal_(); });
        modal.dataset.inboxBackdropBound = 'true';
    }
    activateLegalModalFocus_(modal, {
        initialFocus: modal.querySelector('#inbox-conversation-search'),
        returnFocus: options.returnFocus, allowEscape: true, close: closeInboxModal_
    });
    await setInboxView_('conversations', { reset: true });
    startInboxSync_();
});

export async function openInbox() {
    const returnFocus = document.activeElement;
    const context = await ensureUiSessionRole_(['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior']);
    if (!context) return;
    return openInboxModal_({ returnFocus });
}



// AUG-152 — Centro de conversaciones y notificaciones privadas.
let inboxConversationFolder_ = "received";
let inboxConversationQuery_ = "";
let inboxConversationCategory_ = "all";
let inboxConversationPageStack_ = [0];
let inboxConversationPageIndex_ = 0;
let inboxConversationItems_ = [];
let inboxConversationCounts_ = {};
let inboxConversationNextCursor_ = null;
let inboxConversationHasMore_ = false;
let inboxConversationSelectedId_ = "";
let inboxConversationSelected_ = null;
let inboxConversationMessages_ = [];
let inboxConversationMessagesCursor_ = null;
let inboxConversationMessagesHasMore_ = false;
let inboxConversationGeneration_ = 0;
let inboxConversationDetailGeneration_ = 0;
let inboxConversationSyncTimer_ = null;
let inboxConversationSyncBusy_ = false;
let inboxConversationCurrentView_ = "conversations";
let inboxConnectivityBound_ = false;
const INBOX_CONVERSATION_PAGE_SIZE_ = 20;
const INBOX_MESSAGE_PAGE_SIZE_ = 50;
const INBOX_SYNC_INTERVAL_MS_ = 60000;

function inboxCanSeeRequests_(role) {
    return ["desarrollador", "jefe", "supervisor"].includes(normalizeUiRole_(role));
}
function inboxSessionPayload_() { return getUiSessionContext_() || {}; }
function inboxNewIdempotencyKey_() {
    try {
        if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID().replace(/-/g, "_");
    } catch (_) {}
    return "inbox_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
}
function inboxDraftKey_(userId, kind) {
    return "gpsepedia-inbox-draft:" + String(userId || "unknown") + ":" + String(kind || "new");
}
function inboxReadDraft_(kind) {
    const context = getUiSessionContext_();
    if (!context || typeof sessionStorage === "undefined") return {};
    try {
        const parsed = JSON.parse(sessionStorage.getItem(inboxDraftKey_(context.userId, kind)) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) { return {}; }
}
function inboxSaveDraft_(kind, draft) {
    const context = getUiSessionContext_();
    if (!context || typeof sessionStorage === "undefined") return;
    try { sessionStorage.setItem(inboxDraftKey_(context.userId, kind), JSON.stringify(draft || {})); } catch (_) {}
}
function inboxClearDraft_(kind) {
    const context = getUiSessionContext_();
    if (!context || typeof sessionStorage === "undefined") return;
    try { sessionStorage.removeItem(inboxDraftKey_(context.userId, kind)); } catch (_) {}
}
function clearInboxDraftsForUser_(userId) {
    if (!userId || typeof sessionStorage === "undefined") return;
    const prefix = inboxDraftKey_(userId, "");
    try {
        const keys = [];
        for (let index = 0; index < sessionStorage.length; index++) {
            const key = sessionStorage.key(index);
            if (key && key.startsWith(prefix)) keys.push(key);
        }
        keys.forEach(key => sessionStorage.removeItem(key));
    } catch (_) {}
}
function inboxSetStatus_(message, isError) {
    const status = document.getElementById("inbox-conversation-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.classList.toggle("is-error", Boolean(isError));
    status.classList.toggle("is-success", Boolean(message) && !isError);
}
function inboxFormatDate_(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
function inboxCreateNode_(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}
function inboxUpdateUnreadBadge_(counts) {
    const badge = document.getElementById("inbox-notification-count");
    if (!badge) return;
    const unread = Math.max(0, Number(counts && counts.unread) || 0);
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread <= 0;
    badge.setAttribute("aria-label", unread + " conversaciones sin leer");
}
function bindInboxControls_() {
    const viewTabs = document.getElementById("inbox-view-tabs");
    if (viewTabs && viewTabs.dataset.bound !== "true") {
        viewTabs.addEventListener("click", event => {
            const button = event.target.closest("[data-inbox-view]");
            if (button && !button.disabled) setInboxView_(button.dataset.inboxView);
        });
        viewTabs.dataset.bound = "true";
    }
    const folderNav = document.getElementById("inbox-folder-nav");
    if (folderNav && folderNav.dataset.bound !== "true") {
        folderNav.addEventListener("click", event => {
            const button = event.target.closest("[data-inbox-folder]");
            if (!button) return;
            inboxConversationFolder_ = button.dataset.inboxFolder || "received";
            inboxConversationSelectedId_ = "";
            inboxConversationSelected_ = null;
            inboxConversationPageStack_ = [0];
            inboxConversationPageIndex_ = 0;
            inboxConversationMessages_ = [];
            document.getElementById("inbox-modal-content")?.classList.remove("is-detail-open");
            folderNav.querySelectorAll("[data-inbox-folder]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
            loadInboxConversations_({ reset: true });
        });
        folderNav.dataset.bound = "true";
    }
    const searchForm = document.getElementById("inbox-conversation-search-form");
    if (searchForm && searchForm.dataset.bound !== "true") {
        searchForm.addEventListener("submit", event => {
            event.preventDefault();
            const input = document.getElementById("inbox-conversation-search");
            inboxConversationQuery_ = String(input && input.value || "").trim().slice(0, 80);
            inboxConversationPageStack_ = [0];
            inboxConversationPageIndex_ = 0;
            loadInboxConversations_({ reset: true });
        });
        searchForm.dataset.bound = "true";
    }
    const categoryFilter = document.getElementById("inbox-category-filter");
    if (categoryFilter && categoryFilter.dataset.bound !== "true") {
        categoryFilter.addEventListener("change", () => {
            const nextCategory = String(categoryFilter.value || "all").trim().toLowerCase();
            inboxConversationCategory_ = ["all", "general", "soporte", "acceso", "contenido", "instalacion", "otro"].includes(nextCategory)
                ? nextCategory : "all";
            inboxConversationPageStack_ = [0];
            inboxConversationPageIndex_ = 0;
            inboxConversationSelectedId_ = "";
            inboxConversationSelected_ = null;
            inboxConversationMessages_ = [];
            document.getElementById("inbox-modal-content")?.classList.remove("is-detail-open");
            loadInboxConversations_({ reset: true });
        });
        categoryFilter.dataset.bound = "true";
    }
    const refresh = document.getElementById("inbox-conversation-refresh");
    if (refresh && refresh.dataset.bound !== "true") {
        refresh.addEventListener("click", refreshInboxConversations_);
        refresh.dataset.bound = "true";
    }
    const newMessage = document.getElementById("inbox-new-message");
    if (newMessage && newMessage.dataset.bound !== "true") {
        newMessage.addEventListener("click", openInboxNewConversationForm_);
        newMessage.dataset.bound = "true";
    }
    const consult = document.getElementById("inbox-consult-developer");
    if (consult && consult.dataset.bound !== "true") {
        consult.addEventListener("click", openInboxNewConversationForm_);
        consult.dataset.bound = "true";
    }
    const previous = document.getElementById("inbox-conversation-previous");
    if (previous && previous.dataset.bound !== "true") {
        previous.addEventListener("click", () => {
            if (inboxConversationPageIndex_ <= 0) return;
            inboxConversationPageIndex_ -= 1;
            loadInboxConversations_({ preserveScroll: true });
        });
        previous.dataset.bound = "true";
    }
    const next = document.getElementById("inbox-conversation-next");
    if (next && next.dataset.bound !== "true") {
        next.addEventListener("click", () => {
            if (!inboxConversationHasMore_ || inboxConversationNextCursor_ === null) return;
            inboxConversationPageStack_ = inboxConversationPageStack_.slice(0, inboxConversationPageIndex_ + 1);
            inboxConversationPageStack_.push(Number(inboxConversationNextCursor));
            inboxConversationPageIndex_ += 1;
            loadInboxConversations_();
        });
        next.dataset.bound = "true";
    }
    if (!inboxConnectivityBound_) {
        window.addEventListener("online", () => {
            if (document.getElementById("inbox-modal")?.style.display !== "none") refreshInboxConversations_();
        });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && document.getElementById("inbox-modal")?.style.display !== "none") refreshInboxConversations_();
        });
        inboxConnectivityBound_ = true;
    }
}
async function setInboxView_(view, options = {}) {
    const context = getUiSessionContext_();
    const nextView = view === "requests" && inboxCanSeeRequests_(context && context.role) ? "requests" : "conversations";
    inboxConversationCurrentView_ = nextView;
    const conversations = document.getElementById("inbox-conversations-view");
    const requests = document.getElementById("inbox-requests-view");
    const tabs = document.getElementById("inbox-view-tabs");
    if (conversations) { conversations.hidden = nextView !== "conversations"; conversations.setAttribute("aria-hidden", String(nextView !== "conversations")); }
    if (requests) { requests.hidden = nextView !== "requests"; requests.setAttribute("aria-hidden", String(nextView !== "requests")); }
    if (tabs) tabs.querySelectorAll("[data-inbox-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.inboxView === nextView)));
    if (nextView === "requests") {
        stopInboxSync_();
        if (context) await loadAndRenderInbox({ context, reset: Boolean(options.reset) });
    } else {
        await loadInboxConversations_({ reset: Boolean(options.reset) });
        startInboxSync_();
    }
}
async function loadInboxConversations_(options = {}) {
    const context = getUiSessionContext_();
    if (!context || inboxConversationCurrentView_ !== "conversations") return;
    const list = document.getElementById("inbox-conversation-list");
    if (!list) return;
    if (options.reset) { inboxConversationPageStack_ = [0]; inboxConversationPageIndex_ = 0; }
    const cursor = inboxConversationPageStack_[inboxConversationPageIndex_] || 0;
    const generation = ++inboxConversationGeneration_;
    const previousScroll = list.scrollTop;
    if (!options.preserveScroll || !inboxConversationItems_.length) list.replaceChildren(inboxCreateNode_("p", "inbox-state-message", "Cargando conversaciones…"));
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        inboxSetStatus_("Sin conexión. Los borradores se conservarán en esta sesión.", true);
        return;
    }
    try {
        const response = await getInboxConversations(context, { cursor, pageSize: INBOX_CONVERSATION_PAGE_SIZE_, folder: inboxConversationFolder_, category: inboxConversationCategory_, query: inboxConversationQuery_ });
        if (generation !== inboxConversationGeneration_ || !isCurrentUiSessionContext_(context)) return;
        if (!response || response.status !== "success") throw new Error(response && response.message || "No se pudo cargar Inbox.");
        inboxConversationItems_ = Array.isArray(response.data) ? response.data : [];
        inboxConversationCounts_ = response.counts || {};
        inboxConversationNextCursor_ = response.nextCursor === undefined ? null : response.nextCursor;
        inboxConversationHasMore_ = response.hasMore === true;
        inboxUpdateUnreadBadge_(inboxConversationCounts_);
        renderInboxConversationList_();
        renderInboxConversationPagination_();
        list.scrollTop = options.preserveScroll ? previousScroll : 0;
        if (inboxConversationSelectedId_) {
            const refreshed = inboxConversationItems_.find(item => item.conversationId === inboxConversationSelectedId_);
            if (refreshed) inboxConversationSelected_ = refreshed;
        }
        inboxSetStatus_("", false);
    } catch (error) {
        if (generation !== inboxConversationGeneration_) return;
        inboxSetStatus_(error && error.message ? error.message : "No se pudo cargar Inbox.", true);
        if (!inboxConversationItems_.length) list.replaceChildren(inboxCreateNode_("p", "inbox-state-message is-error", "No se pudieron cargar las conversaciones."));
    }
}
function renderInboxConversationList_() {
    const list = document.getElementById("inbox-conversation-list");
    if (!list) return;
    list.replaceChildren();
    if (!inboxConversationItems_.length) {
        list.appendChild(inboxCreateNode_("p", "inbox-state-message", inboxConversationQuery_ ? "No hay conversaciones que coincidan con la búsqueda." : "No hay conversaciones en esta carpeta."));
        return;
    }
    inboxConversationItems_.forEach(item => {
        const button = inboxCreateNode_("button", "inbox-conversation-item");
        button.type = "button";
        button.dataset.conversationId = item.conversationId;
        button.setAttribute("aria-pressed", String(item.conversationId === inboxConversationSelectedId_));
        const names = Array.isArray(item.otherParticipants) ? item.otherParticipants.map(user => user && user.name).filter(Boolean).join(", ") : "";
        button.append(
            inboxCreateNode_("strong", "inbox-conversation-item-title", names || "Conversación"),
            inboxCreateNode_("span", "inbox-conversation-item-subject", item.subject || "Sin asunto"),
            inboxCreateNode_("span", "inbox-conversation-item-preview", item.lastMessagePreview || "Sin mensajes"),
            inboxCreateNode_("span", "inbox-conversation-item-meta", [item.category || "general", inboxFormatDate_(item.lastMessageAt || item.updatedAt)].filter(Boolean).join(" · "))
        );
        if (Number(item.unreadCount) > 0) button.appendChild(inboxCreateNode_("span", "inbox-conversation-unread", String(item.unreadCount)));
        button.addEventListener("click", () => selectInboxConversation_(item));
        list.appendChild(button);
    });
}
function renderInboxConversationPagination_() {
    const previous = document.getElementById("inbox-conversation-previous");
    const next = document.getElementById("inbox-conversation-next");
    const label = document.getElementById("inbox-conversation-page-label");
    if (previous) previous.disabled = inboxConversationPageIndex_ <= 0;
    if (next) next.disabled = !inboxConversationHasMore_;
    if (label) label.textContent = "Página " + (inboxConversationPageIndex_ + 1);
}
async function selectInboxConversation_(item) {
    inboxConversationSelectedId_ = String(item.conversationId || "");
    inboxConversationSelected_ = item;
    inboxConversationMessages_ = [];
    inboxConversationMessagesCursor_ = null;
    inboxConversationMessagesHasMore_ = false;
    document.getElementById("inbox-modal-content")?.classList.add("is-detail-open");
    renderInboxConversationDetail_();
    await loadInboxMessages_(inboxConversationSelectedId_, { reset: true, markRead: true });
}
async function loadInboxMessages_(conversationId, options = {}) {
    const context = getUiSessionContext_();
    if (!context || !conversationId) return;
    const generation = ++inboxConversationDetailGeneration_;
    const detail = document.getElementById("inbox-conversation-detail");
    const before = detail && detail.querySelector(".inbox-thread-messages");
    const previousScroll = before ? before.scrollTop : 0;
    const previousHeight = before ? before.scrollHeight : 0;
    const wasAtBottom = before ? before.scrollHeight - before.scrollTop - before.clientHeight < 48 : true;
    if (!options.older && !options.preserveScroll) renderInboxConversationDetail_({ loading: true });
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        inboxSetStatus_("Sin conexión. El borrador del mensaje se conserva.", true);
        return;
    }
    try {
        const cursor = options.older ? inboxConversationMessagesCursor_ : 0;
        const response = await getInboxMessages(conversationId, context, { cursor, pageSize: INBOX_MESSAGE_PAGE_SIZE_ });
        if (generation !== inboxConversationDetailGeneration_ || !isCurrentUiSessionContext_(context) || inboxConversationSelectedId_ !== conversationId) return;
        if (!response || response.status !== "success") throw new Error(response && response.message || "No se pudo cargar el historial.");
        const incoming = Array.isArray(response.data) ? response.data : [];
        if (options.older) inboxConversationMessages_ = incoming.concat(inboxConversationMessages_);
        else if (options.preserveScroll && inboxConversationMessages_.length) {
            const byId = new Map(inboxConversationMessages_.map(message => [message.messageId, message]));
            incoming.forEach(message => byId.set(message.messageId, message));
            inboxConversationMessages_ = Array.from(byId.values()).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else inboxConversationMessages_ = incoming;
        inboxConversationMessagesCursor_ = response.nextCursor === undefined ? null : response.nextCursor;
        inboxConversationMessagesHasMore_ = response.hasMore === true;
        renderInboxConversationDetail_();
        const messageList = document.getElementById("inbox-conversation-messages");
        if (messageList) {
            if (options.older) messageList.scrollTop = previousScroll + Math.max(0, messageList.scrollHeight - previousHeight);
            else if (options.preserveScroll && !wasAtBottom) messageList.scrollTop = previousScroll;
            else messageList.scrollTop = messageList.scrollHeight;
        }
        if (options.markRead !== false && inboxConversationMessages_.length) {
            const latest = inboxConversationMessages_[inboxConversationMessages_.length - 1];
            await markInboxRead(conversationId, latest.messageId, context);
            if (generation === inboxConversationDetailGeneration_) await loadInboxConversations_({ preserveScroll: true });
        }
        inboxSetStatus_("", false);
    } catch (error) {
        if (generation !== inboxConversationDetailGeneration_) return;
        inboxSetStatus_(error && error.message ? error.message : "No se pudo cargar el historial.", true);
        if (!inboxConversationMessages_.length) renderInboxConversationDetail_({ error: true });
    }
}
function renderInboxConversationDetail_(options = {}) {
    const detail = document.getElementById("inbox-conversation-detail");
    if (!detail) return;
    detail.replaceChildren();
    if (!inboxConversationSelected_ && !options.loading) {
        detail.appendChild(inboxCreateNode_("p", "inbox-state-message", "Selecciona una conversación para consultar sus mensajes."));
        return;
    }
    if (options.loading) { detail.appendChild(inboxCreateNode_("p", "inbox-state-message", "Cargando conversación…")); return; }
    if (options.error) { detail.appendChild(inboxCreateNode_("p", "inbox-state-message is-error", "No se pudo cargar esta conversación.")); return; }
    const item = inboxConversationSelected_;
    const header = inboxCreateNode_("header", "inbox-thread-header");
    const back = inboxCreateNode_("button", "inbox-mobile-back", "Volver a conversaciones");
    back.type = "button";
    back.addEventListener("click", () => {
        document.getElementById("inbox-modal-content")?.classList.remove("is-detail-open");
        const target = Array.from(document.getElementById("inbox-conversation-list")?.querySelectorAll("[data-conversation-id]") || [])
            .find(element => element.dataset.conversationId === item.conversationId);
        if (target) target.focus();
    });
    const titleBlock = inboxCreateNode_("div", "inbox-thread-title-block");
    titleBlock.append(
        inboxCreateNode_("h3", "", item.subject || "Conversación"),
        inboxCreateNode_("p", "inbox-thread-participants", (item.otherParticipants || []).map(user => user && user.name).filter(Boolean).join(", ") || "Participante"),
        inboxCreateNode_("span", "inbox-thread-category", item.category || "general")
    );
    const archive = inboxCreateNode_("button", "inbox-thread-archive", item.archived ? "Restaurar" : "Archivar");
    archive.type = "button";
    archive.addEventListener("click", () => toggleInboxConversationArchive_(item));
    header.append(back, titleBlock, archive);
    detail.appendChild(header);
    const messages = inboxCreateNode_("div", "inbox-thread-messages");
    messages.id = "inbox-conversation-messages";
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-live", "polite");
    messages.setAttribute("aria-relevant", "additions text");
    if (inboxConversationMessagesHasMore_) {
        const older = inboxCreateNode_("button", "inbox-load-older", "Cargar mensajes anteriores");
        older.type = "button";
        older.addEventListener("click", () => loadInboxMessages_(item.conversationId, { older: true, markRead: false }));
        messages.appendChild(older);
    }
    if (!inboxConversationMessages_.length) messages.appendChild(inboxCreateNode_("p", "inbox-state-message", "Todavía no hay mensajes."));
    inboxConversationMessages_.forEach(message => {
        const own = message.authorId === (getUiSessionContext_() || {}).userId;
        const bubble = inboxCreateNode_("article", "inbox-message-bubble" + (own ? " is-own" : ""));
        bubble.append(
            inboxCreateNode_("div", "inbox-message-meta", String(message.authorName || "Usuario") + " · " + inboxFormatDate_(message.createdAt)),
            inboxCreateNode_("p", "inbox-message-body", message.body || "")
        );
        messages.appendChild(bubble);
    });
    detail.appendChild(messages);
    if (item.status === "open") renderInboxReplyForm_(detail, item);
    else detail.appendChild(inboxCreateNode_("p", "inbox-state-message", "Esta conversación está cerrada."));
}
function renderInboxReplyForm_(detail, item) {
    const context = getUiSessionContext_(), draftKind = "reply:" + item.conversationId, draft = inboxReadDraft_(draftKind);
    const form = inboxCreateNode_("form", "inbox-composer");
    const label = inboxCreateNode_("label", "", "Escribe un mensaje");
    label.htmlFor = "inbox-reply-body";
    const textarea = inboxCreateNode_("textarea", "inbox-message-input");
    textarea.id = "inbox-reply-body"; textarea.rows = 3; textarea.maxLength = 5000; textarea.required = true;
    textarea.value = String(draft.body || "");
    const status = inboxCreateNode_("p", "inbox-form-status");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const send = inboxCreateNode_("button", "inbox-primary-button", "Enviar mensaje");
    send.type = "submit";
    form.append(label, textarea, status, send);
    textarea.addEventListener("input", () => {
        const current = inboxReadDraft_(draftKind), body = textarea.value;
        if (current.lastAttemptBody && current.lastAttemptBody !== body) current.idempotencyKey = "";
        inboxSaveDraft_(draftKind, { ...current, body });
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const body = textarea.value.trim();
        if (!body) { status.textContent = "Escribe un mensaje antes de enviarlo."; return; }
        if (typeof navigator !== "undefined" && navigator.onLine === false) { status.textContent = "Sin conexión. El borrador quedó guardado."; return; }
        const current = inboxReadDraft_(draftKind), idempotencyKey = current.idempotencyKey || inboxNewIdempotencyKey_();
        inboxSaveDraft_(draftKind, { ...current, body, idempotencyKey, lastAttemptBody: body });
        send.disabled = true; status.textContent = "Enviando…";
        try {
            const result = await sendInboxMessage({ ...(context || {}), conversationId: item.conversationId, body, idempotencyKey });
            if (!result || result.status !== "success") throw new Error(result && result.message || "No se pudo enviar el mensaje.");
            inboxClearDraft_(draftKind);
            status.textContent = "Mensaje enviado.";
            await loadInboxMessages_(item.conversationId, { reset: true, markRead: true });
            await loadInboxConversations_({ preserveScroll: true });
        } catch (error) {
            status.textContent = error && error.message ? error.message : "No se pudo enviar. El borrador se conservó.";
            inboxSetStatus_(status.textContent, true);
        } finally { send.disabled = false; }
    });
    detail.appendChild(form);
}
async function openInboxNewConversationForm_() {
    const context = getUiSessionContext_();
    if (!context) return;
    const isDeveloper = context.role === "desarrollador", mode = isDeveloper ? "direct" : "consult";
    const draftKind = "new:" + mode, detail = document.getElementById("inbox-conversation-detail");
    if (!detail) return;
    inboxConversationSelectedId_ = ""; inboxConversationSelected_ = null; inboxConversationMessages_ = [];
    document.getElementById("inbox-modal-content")?.classList.add("is-detail-open");
    detail.replaceChildren();
    const status = inboxCreateNode_("p", "inbox-form-status", "Cargando destinatarios…");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    detail.appendChild(inboxCreateNode_("h3", "inbox-new-title", isDeveloper ? "Nuevo mensaje" : "Consultar al desarrollador"));
    detail.appendChild(status);
    let recipients = [];
    try {
        const response = await getInboxRecipients(context);
        if (!response || response.status !== "success") throw new Error(response && response.message || "No se pudieron cargar los destinatarios.");
        recipients = Array.isArray(response.recipients) ? response.recipients : [];
    } catch (error) {
        status.textContent = error && error.message ? error.message : "No se pudieron cargar los destinatarios.";
        inboxSetStatus_(status.textContent, true); return;
    }
    if (!recipients.length) {
        status.textContent = isDeveloper ? "No hay usuarios activos disponibles." : "No hay una cuenta Desarrollador disponible.";
        inboxSetStatus_(status.textContent, true); return;
    }
    detail.replaceChildren();
    const heading = inboxCreateNode_("h3", "inbox-new-title", isDeveloper ? "Nuevo mensaje" : "Consultar al desarrollador");
    const form = inboxCreateNode_("form", "inbox-new-conversation-form");
    const addField = (labelText, id, control) => {
        const label = inboxCreateNode_("label", "", labelText); label.htmlFor = id;
        control.id = id; control.classList.add("inbox-form-control");
        form.append(label, control); return control;
    };
    const recipient = addField("Destinatario", "inbox-new-recipient", document.createElement("select"));
    recipient.required = true;
    recipients.forEach(user => {
        const option = inboxCreateNode_("option", "", user.name + " · " + user.role);
        option.value = user.id; recipient.appendChild(option);
    });
    const draft = inboxReadDraft_(draftKind);
    if (draft.recipientId && recipients.some(user => user.id === draft.recipientId)) recipient.value = draft.recipientId;
    const templateLabel = inboxCreateNode_("label", "", "Plantilla editable");
    templateLabel.htmlFor = "inbox-welcome-template";
    const template = document.createElement("select"); template.id = "inbox-welcome-template"; template.className = "inbox-form-control";
    const templates = [
        { id: "", label: "Sin plantilla", subject: "", body: "" },
        { id: "welcome-general", label: "Bienvenida general", subject: "Bienvenido a GPSpedia", body: "Hola. Te damos la bienvenida a GPSpedia. Este canal está disponible para consultas y comunicación directa. Puedes responder a este mensaje cuando lo necesites." },
        { id: "welcome-technician", label: "Bienvenida para técnicos", subject: "Bienvenido al equipo técnico de GPSpedia", body: "Hola. Te damos la bienvenida. Utiliza este canal para compartir consultas técnicas, comunicar incidencias y dar seguimiento a los temas relacionados con GPSpedia." }
    ];
    templates.forEach(item => { const option = inboxCreateNode_("option", "", item.label); option.value = item.id; template.appendChild(option); });
    if (!isDeveloper) { templateLabel.hidden = true; template.hidden = true; }
    const subject = addField("Asunto", "inbox-new-subject", document.createElement("input"));
    subject.type = "text"; subject.maxLength = 150; subject.required = true;
    subject.value = String(draft.subject || (isDeveloper ? "" : "Consulta al desarrollador"));
    const category = addField("Categoría", "inbox-new-category", document.createElement("select"));
    ["general","soporte","acceso","contenido","instalacion","otro"].forEach(value => {
        const option = inboxCreateNode_("option", "", value.charAt(0).toUpperCase() + value.slice(1)); option.value = value; category.appendChild(option);
    });
    category.value = String(draft.category || "general");
    const body = addField("Mensaje", "inbox-new-body", document.createElement("textarea"));
    body.rows = 6; body.maxLength = 5000; body.required = true; body.classList.add("inbox-message-input");
    body.value = String(draft.body || "");
    if (draft.templateId) template.value = draft.templateId;
    if (isDeveloper) {
        const subjectLabel = form.querySelector('label[for="inbox-new-subject"]');
        if (subjectLabel) {
            form.insertBefore(templateLabel, subjectLabel);
            form.insertBefore(template, subjectLabel);
        }
    }
    const formStatus = inboxCreateNode_("p", "inbox-form-status");
    formStatus.setAttribute("role", "status"); formStatus.setAttribute("aria-live", "polite");
    const send = inboxCreateNode_("button", "inbox-primary-button", isDeveloper ? "Enviar mensaje" : "Enviar consulta");
    send.type = "submit"; form.append(formStatus, send); detail.append(heading, form);
    const persist = () => {
        const current = inboxReadDraft_(draftKind), fingerprint = [recipient.value,subject.value,category.value,body.value].join("|");
        if (current.lastAttemptFingerprint && current.lastAttemptFingerprint !== fingerprint) current.idempotencyKey = "";
        inboxSaveDraft_(draftKind, { ...current, recipientId: recipient.value, subject: subject.value, category: category.value, body: body.value, templateId: template.value });
    };
    [recipient,subject,category,body].forEach(element => { element.addEventListener("input", persist); element.addEventListener("change", persist); });
    template.addEventListener("change", () => {
        const selected = templates.find(item => item.id === template.value);
        if (selected && selected.id) { subject.value = selected.subject; body.value = selected.body; category.value = "general"; }
        persist();
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const recipientId = recipient.value, subjectValue = subject.value.trim(), bodyValue = body.value.trim();
        if (!recipientId || !subjectValue || !bodyValue) { formStatus.textContent = "Completa destinatario, asunto y mensaje."; return; }
        if (typeof navigator !== "undefined" && navigator.onLine === false) { formStatus.textContent = "Sin conexión. El borrador quedó guardado."; return; }
        const current = inboxReadDraft_(draftKind), fingerprint = [recipientId,subjectValue,category.value,bodyValue].join("|");
        const idempotencyKey = current.idempotencyKey || inboxNewIdempotencyKey_();
        inboxSaveDraft_(draftKind, { ...current, recipientId, subject: subjectValue, category: category.value, body: bodyValue, idempotencyKey, lastAttemptFingerprint: fingerprint });
        send.disabled = true; formStatus.textContent = "Enviando…";
        try {
            const result = await createInboxConversation({ ...(context || {}), recipientId, subject: subjectValue, category: category.value, body: bodyValue, idempotencyKey });
            if (!result || result.status !== "success" || !result.conversationId) throw new Error(result && result.message || "No se pudo crear la conversación.");
            inboxClearDraft_(draftKind); inboxConversationFolder_ = "sent"; inboxConversationPageStack_ = [0]; inboxConversationPageIndex_ = 0;
            document.getElementById("inbox-folder-nav")?.querySelectorAll("[data-inbox-folder]").forEach(button =>
                button.setAttribute("aria-pressed", String(button.dataset.inboxFolder === "sent")));
            await loadInboxConversations_({ reset: true });
            const created = inboxConversationItems_.find(item => item.conversationId === result.conversationId) || {
                conversationId: result.conversationId, subject: subjectValue, category: category.value,
                otherParticipants: recipients.filter(user => user.id === recipientId).map(user => ({ id: user.id, name: user.name, role: user.role })),
                unreadCount: 0, archived: false, status: "open"
            };
            await selectInboxConversation_(created);
            inboxSetStatus_("Mensaje enviado.", false);
        } catch (error) {
            formStatus.textContent = error && error.message ? error.message : "No se pudo enviar. El borrador se conservó.";
            inboxSetStatus_(formStatus.textContent, true);
        } finally { send.disabled = false; }
    });
}
async function toggleInboxConversationArchive_(item) {
    const context = getUiSessionContext_();
    if (!context || !item) return;
    try {
        const response = await archiveInboxConversation(item.conversationId, !item.archived, context);
        if (!response || response.status !== "success") throw new Error(response && response.message || "No se pudo actualizar el archivo.");
        inboxConversationSelected_ = { ...item, archived: !item.archived };
        await loadInboxConversations_({ reset: true, preserveScroll: true });
        const shouldClearSelection = (inboxConversationFolder_ !== "archived" && inboxConversationSelected_.archived) ||
            (inboxConversationFolder_ === "archived" && !inboxConversationSelected_.archived);
        if (shouldClearSelection) {
            inboxConversationSelectedId_ = ""; inboxConversationSelected_ = null; inboxConversationMessages_ = [];
            document.getElementById("inbox-modal-content")?.classList.remove("is-detail-open");
            renderInboxConversationDetail_();
        } else renderInboxConversationDetail_();
        inboxSetStatus_(item.archived ? "Conversación restaurada." : "Conversación archivada.", false);
    } catch (error) { inboxSetStatus_(error && error.message ? error.message : "No se pudo actualizar el archivo.", true); }
}
async function refreshInboxConversations_() {
    if (inboxConversationSyncBusy_ || inboxConversationCurrentView_ !== "conversations") return;
    inboxConversationSyncBusy_ = true;
    try {
        await loadInboxConversations_({ preserveScroll: true });
        if (inboxConversationSelectedId_) await loadInboxMessages_(inboxConversationSelectedId_, { preserveScroll: true, markRead: true });
    } finally { inboxConversationSyncBusy_ = false; }
}
function startInboxSync_() {
    stopInboxSync_();
    inboxConversationSyncTimer_ = window.setInterval(() => {
        const modal = document.getElementById("inbox-modal");
        if (!modal || modal.style.display === "none" || document.visibilityState === "hidden" ||
            (typeof navigator !== "undefined" && navigator.onLine === false)) return;
        refreshInboxConversations_();
    }, INBOX_SYNC_INTERVAL_MS_);
}
function stopInboxSync_() {
    if (inboxConversationSyncTimer_ !== null) {
        window.clearInterval(inboxConversationSyncTimer_);
        inboxConversationSyncTimer_ = null;
    }
    inboxConversationSyncBusy_ = false;
}
function closeInboxModal_() {
    const modal = document.getElementById("inbox-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("inbox-open");
    stopInboxSync_();
    deactivateLegalModalFocus_(modal, true);
}

function initializeRichTextModeControl_() {
    const select = document.getElementById("rich-text-mode-select");
    const status = document.getElementById("rich-text-mode-status");
    if (!select) return;

    select.value = getRichTextMode();
    if (select.dataset.richModeBound !== "true") {
        select.addEventListener("change", () => {
            const context = getUiSessionContext_();
            try {
                const mode = setRichTextMode(select.value, context && context.role);
                refreshRichTextToolbars();
                if (status) {
                    status.textContent = mode === "advanced"
                        ? "Modo avanzado guardado en este navegador. Las barras abiertas se actualizaron."
                        : "Modo estricto guardado en este navegador. Las barras abiertas se actualizaron.";
                }
            } catch (error) {
                select.value = getRichTextMode();
                if (status) status.textContent = error.message || "No se pudo cambiar el modo.";
            }
        });
        select.dataset.richModeBound = "true";
    }

    if (status) {
        status.textContent = select.value === "advanced"
            ? "Modo avanzado activo en este navegador."
            : "Modo estricto activo (predeterminado).";
    }
}

/* TAREA 1.2: RECUPERACIÓN DE LAS FUNCIONES DEL PANEL DE DESARROLLADOR */
const openDevToolsModal_ = setupModal('dev-tools-modal', (options = {}) => {
    const modal = document.getElementById('dev-tools-modal');
    modal.__gpOverlayClose = () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        deactivateLegalModalFocus_(modal, true);
    };
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    activateLegalModalFocus_(modal, {
        initialFocus: modal.querySelector('#dev-tools-title'),
        returnFocus: options.returnFocus,
        allowEscape: true,
        close: () => {
            const overlayId = modal.dataset.gpOverlayHistoryId;
            const historyManager = window.overlayHistory;
            if (overlayId && historyManager && historyManager.has(overlayId)) historyManager.close(overlayId);
            else modal.style.display = 'none';
        }
    });
    initializeRichTextModeControl_();
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

    window.gpsepediaDeveloperLog = (message, level = 'info') => {
        log(message, level === 'warning', level === 'error');
    };
    developerDiagnosticQueue_.splice(0).forEach(entry => {
        window.gpsepediaDeveloperLog(entry.message, entry.level);
    });

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
    function getServiceHealthStatusLabel_(status) {
        const labels = {
            online: "En línea",
            slow: "Lento",
            unavailable: "No disponible",
            error: "Con error",
            unknown: "Desconocido",
            stale: "Desactualizado"
        };
        return labels[status] || "Desconocido";
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
            status.textContent = getServiceHealthStatusLabel_(item.status);
            top.append(name, status);
            const bottom = document.createElement("span");
            bottom.className = "dev-service-card-bottom";
            const latency = document.createElement("span");
            latency.textContent = Number.isFinite(item.latency) ? `${Math.round(item.latency)} ms` : "Latencia no disponible";
            const version = document.createElement("span");
            version.textContent = item.metadata?.version ? `v${item.metadata.version}` : "Versión no reportada";
            if (key === "AUTH" && item.metadata?.coordinatorConfigured === false) {
                version.textContent += " · Coordinador pendiente";
                if (!window.__gpsepediaAuthCoordinatorWarningLogged && typeof window.gpsepediaDeveloperLog === "function") {
                    window.__gpsepediaAuthCoordinatorWarningLogged = true;
                    window.gpsepediaDeveloperLog("AUTH: configura GPSpedia_COORDINATOR_URL y GPSpedia_COORDINATOR_SECRET en ScriptProperties.", "warning");
                }
            }
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
        const metricSnapshot = getServiceMetricsSnapshot();
        const events = metricSnapshot.events.filter(event => event.service === selectedServiceKey);
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
        state.textContent = getServiceHealthStatusLabel_(item.status);
        heading.append(title, state);
        detail.appendChild(heading);
        const metrics = document.createElement("div");
        metrics.className = "dev-service-metrics";
        metrics.append(
            createServiceMetric("Versión reportada", metadata.version || "No disponible"),
            ...(selectedServiceKey === "AUTH" ? [createServiceMetric("Coordinador compartido",
                metadata.coordinatorConfigured === true ? "Configurado" :
                    metadata.coordinatorConfigured === false ? "Sin configurar" : "No verificado")] : []),
            createServiceMetric("Código HTTP", item.httpStatus === null || item.httpStatus === undefined ? "No disponible" : String(item.httpStatus)),
            createServiceMetric("Última comprobación", formatServiceCheckTime(item.checkedAt)),
            createServiceMetric("Última respuesta válida", formatServiceCheckTime(item.lastSuccessfulAt)),
            createServiceMetric("Latencia del diagnóstico", Number.isFinite(item.latency) ? `${Math.round(item.latency)} ms` : "No disponible"),
            createServiceMetric("Solicitudes iniciadas (15 min)", String(events.length)),
            createServiceMetric("Solicitudes correctas", String(successful)),
            createServiceMetric("Solicitudes con error", String(failed)),
            createServiceMetric("Tiempo medio observado", average === null ? "No disponible" : `${average} ms`)
        );
        detail.appendChild(metrics);
        const note = document.createElement("p");
        note.className = "dev-service-note";
        note.textContent = "El estado confirma la respuesta del endpoint y su contrato de identidad; no demuestra por sí solo que las dependencias internas de Google Sheets o Drive estén disponibles. La telemetría agrupa solicitudes por hora de inicio y corresponde únicamente a esta sesión." + (metricSnapshot.truncated ? " La muestra de eventos está truncada por el límite de retención." : "");
        detail.appendChild(note);
        const dependencies = document.createElement("div");
        dependencies.className = "dev-service-dependencies";
        const depTitle = document.createElement("strong");
        depTitle.textContent = "Resultado de la comprobación";
        dependencies.appendChild(depTitle);
        const depItems = [
            "Estado del contrato: " + (metadata.reportedStatus || "No verificado"),
            "Código de diagnóstico: " + (item.errorCode || "Ninguno"),
            "Detalle: " + (item.error || "La identidad y el estado del servicio fueron verificados.")
        ];
        if (item.lastKnownStatus) depItems.push("Último estado válido: " + getServiceHealthStatusLabel_(item.lastKnownStatus));
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
        const keys = Object.keys(serviceHealthResults);
        const bucketed = bucketServiceMetrics(snapshot, keys);
        const { bucketCount, bucketSize, startAt, series } = bucketed;
        const maxValue = Math.max(1, ...series.flatMap(item => item.counts));
        const width = 920, height = 270, left = 48, right = 18, top = 18, bottom = 42;
        const plotWidth = width - left - right, plotHeight = height - top - bottom;
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("class", "dev-service-traffic-svg");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Solicitudes iniciadas por minuto desde este navegador en una ventana móvil exacta de quince minutos.");
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
            label.textContent = new Date(startAt + index * bucketSize).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        const note = document.createElement("p");
        note.className = "dev-service-note";
        note.textContent = snapshot.truncated
            ? `Muestra truncada: se alcanzó el límite de ${snapshot.eventLimit} eventos dentro de la ventana. Los conteos son parciales.`
            : "Serie agrupada por inicio de solicitud; ventana móvil exacta de quince minutos.";
        container.appendChild(note);
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
            if (!isAdminPanelCurrent_() || !isServiceDiagnosticsVisible_()) return;
            renderServiceTrafficChart();
            if (selectedServiceKey) renderServiceDetail();
        });
    }
    function isServiceDiagnosticsVisible_() {
        const container = document.getElementById("service-traffic-chart");
        if (!container || !container.isConnected) return false;
        try {
            let current = container;
            while (current && current.nodeType === 1) {
                const style = window.getComputedStyle(current);
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
                current = current.parentElement;
            }
            return container.getClientRects().length > 0;
        } catch (error) {
            return false;
        }
    }
    if (!window.adminServiceMetricsRefreshInterval) {
        window.adminServiceMetricsRefreshInterval = window.setInterval(() => {
            if (!isAdminPanelCurrent_() || !isServiceDiagnosticsVisible_()) return;
            renderServiceTrafficChart();
            if (selectedServiceKey) renderServiceDetail();
        }, 15000);
    }

    // Conectividad automática e inicio
    window.triggerAdminPanelPing = async function() {
        if (!isAdminPanelCurrent_()) return;
        consoleLog.innerHTML = ''; // Limpiar consola al abrir
        log("Sistema administrativo iniciado correctamente.");
        log("Comprobando disponibilidad del microservicio ADMIN y del resto de servicios...");

        const scanPromise = runServicesHealthScan();
        const pingPromise = (async () => {
            const pingStartTime = Date.now();
            let timeoutId = null;
            try {
                if (typeof AbortController !== "function") throw new Error("AbortController no está disponible.");
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 5000);
                const res = await routeAction('ping', {}, null, { signal: controller.signal });
                if (!isAdminPanelCurrent_()) return;
                const latency = Date.now() - pingStartTime;
                if (res && res.status === 'success') {
                    log("Microservicio ADMIN activo.");
                    log("Comunicación establecida.");
                    log(`Tiempo de respuesta: ${latency} ms.`);
                } else {
                    log("El ping ADMIN no devolvió una confirmación válida.", false, true);
                }
            } catch (error) {
                if (isAdminPanelCurrent_()) {
                    log("El ping ADMIN falló o agotó su tiempo de espera; el escaneo de servicios continúa de forma independiente.", false, true);
                }
            } finally {
                if (timeoutId !== null) clearTimeout(timeoutId);
            }
        })();

        log("Esperando operaciones...");
        await Promise.allSettled([scanPromise, pingPromise]);
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

    function describeAdminActionError_(error) {
        const source = error && typeof error === "object" ? error : {};
        const kind = String(source.kind || "unknown");
        const statusValue = Number(source.httpStatus);
        const httpStatus = Number.isInteger(statusValue) && statusValue >= 100 && statusValue <= 599
            ? statusValue : null;
        const labels = {
            http: "Error HTTP",
            network: "Fallo de red",
            abort: "Solicitud cancelada o tiempo de espera agotado",
            invalid_response: "Respuesta inválida",
            application: "Error de aplicación"
        };
        return {
            kind,
            typeLabel: labels[kind] || "Error no clasificado",
            httpCode: httpStatus === null ? "No disponible (sin respuesta HTTP)" : String(httpStatus),
            code: String(source.code || "N/A"),
            message: String(source.message || "No se pudo completar la operación.")
        };
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
                } else if (action === 'backupDrive' &&
                    (res.status === 'in_progress' || (res.status === 'error' && res.resumable === true))) {
                    if (res.logs) await playLogs(res.logs);
                    setProgress(0);
                    log(res.status === 'in_progress'
                        ? `[ESTADO] ${res.message || 'El respaldo de Drive continúa por lotes.'}`
                        : `[ADVERTENCIA] ${res.message || 'El respaldo de Drive puede reanudarse con el mismo ID.'}`,
                        false, res.status === 'error');
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
                const errorInfo = describeAdminActionError_(error);
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

Tipo de error:
${errorInfo.typeLabel}

Código HTTP:
${errorInfo.httpCode}

Código:
${errorInfo.code}

Mensaje:
${errorInfo.message}

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
                const errorInfo = describeAdminActionError_(error);
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

Tipo de error:
${errorInfo.typeLabel}

Código HTTP:
${errorInfo.httpCode}

Código:
${errorInfo.code}

Mensaje:
${errorInfo.message}

Excepción:
${error.stack || error.toString()}

Tiempo transcurrido:
${elapsedSec}s
========================================
`;
                log(detailedErrorMsg, false, true);

                const recoveryMessage = errorInfo.kind === "network" || errorInfo.kind === "abort"
                    ? "No se recibió una respuesta HTTP. Verifica el estado del proceso antes de reintentar."
                    : errorInfo.kind === "http"
                        ? "El servidor respondió con un error HTTP. Verifica el estado del proceso antes de reintentar."
                        : errorInfo.kind === "invalid_response"
                            ? "El servidor respondió, pero el cuerpo no pudo validarse. Verifica el estado del proceso antes de reintentar."
                            : errorInfo.kind === "application"
                                ? "El servidor rechazó la operación. Corrige la causa antes de reintentar."
                                : "No se pudo clasificar el error; no hay un status HTTP verificado. Verifica el estado del proceso antes de reintentar.";
                log(`[INTERRUPCIÓN] ${recoveryMessage}`, true, false);
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

    async function createBackup(action, resourceType, button, resumeBackupId) {
        const driveBackupButton = document.getElementById('btn-admin-backup-drive');
        const resumeDriveBackupButton = document.getElementById('btn-admin-resume-drive-backup');
        const description = resourceType === 'spreadsheet'
            ? 'Creando y verificando el respaldo de la Spreadsheet...'
            : (resumeBackupId ? 'Reanudando el respaldo de Drive...' : 'Creando el respaldo de Drive por lotes...');
        let canResumeDriveBackup = false;
        setBackupResourceHint(description);
        setBackupButtonBusy(button, true);
        if (resourceType === 'drive') {
            if (driveBackupButton && driveBackupButton !== button) driveBackupButton.disabled = true;
            if (resumeDriveBackupButton && resumeDriveBackupButton !== button) resumeDriveBackupButton.disabled = true;
        }
        try {
            let response = await runAction(action, resumeBackupId ? { backupId: resumeBackupId } : undefined);
            let batches = 0;
            while (resourceType === 'drive' && response && response.status === 'in_progress' &&
                response.backupId && batches < 10) {
                if (!isAdminPanelCurrent_()) return;
                if (backupResourceInput && response.backupUrl) backupResourceInput.value = response.backupUrl;
                canResumeDriveBackup = true;
                setBackupResourceHint(`Respaldo de Drive en progreso: ${response.processed || 0}/${response.total || 0} recursos. Continuando por lotes...`);
                response = await runAction(action, { backupId: response.backupId });
                batches++;
            }
            if (!isAdminPanelCurrent_()) return;
            if (resourceType === 'drive' && response && response.status === 'in_progress' && response.backupId) {
                if (backupResourceInput && response.backupUrl) backupResourceInput.value = response.backupUrl;
                canResumeDriveBackup = true;
                setBackupResourceHint(`Lote completado: ${response.processed || 0}/${response.total || 0}. Usa "Continuar respaldo de Drive" para reanudar con el mismo contenedor.`);
                return;
            }
            if (resourceType === 'drive' && response && response.status === 'error' && response.resumable && response.backupId) {
                if (backupResourceInput && response.backupUrl) backupResourceInput.value = response.backupUrl;
                canResumeDriveBackup = true;
                setBackupResourceHint((response.message || 'El respaldo quedó incompleto.') + ' Puedes reanudarlo con el mismo enlace.', true);
                return;
            }
            if (!response || response.status !== 'success' || !isVerifiedBackupResponse(response, resourceType)) {
                log('[ERROR] ADMIN no devolvió un respaldo completo y verificable.', false, true);
                setBackupResourceHint(response && response.message
                    ? response.message
                    : 'El servidor no confirmó el estado completo, la identidad y el enlace del respaldo.', true);
                return;
            }
            if (backupResourceInput) backupResourceInput.value = response.backupUrl;
            canResumeDriveBackup = false;
            verifiedDatabaseBackupId = resourceType === 'spreadsheet' ? String(response.backupId) : null;
            vinMigrationPreview = null;
            vinMigrationPreviewBackupId = null;
            updateVinMigrationControls();
            setBackupResourceHint(resourceType === 'spreadsheet'
                ? 'Respaldo de Spreadsheet verificado. El enlace completo quedó disponible en este campo.'
                : 'Respaldo de Drive completo y verificado. El enlace quedó disponible en este campo.');
        } finally {
            setBackupButtonBusy(button, false);
            if (resourceType === 'drive') {
                if (driveBackupButton) driveBackupButton.disabled = false;
                if (resumeDriveBackupButton) resumeDriveBackupButton.disabled = !canResumeDriveBackup;
            }
        }
    }

    document.getElementById('btn-admin-backup-db').onclick = async (event) => {
        await createBackup('backupDatabase', 'spreadsheet', event.currentTarget);
    };

    document.getElementById('btn-admin-backup-drive').onclick = async (event) => {
        await createBackup('backupDrive', 'drive', event.currentTarget);
    };

    const resumeDriveBackupButton = document.getElementById('btn-admin-resume-drive-backup');
    if (resumeDriveBackupButton) {
        resumeDriveBackupButton.disabled = true;
        resumeDriveBackupButton.onclick = async (event) => {
            const backupId = normalizeDriveBackupId(backupResourceInput && backupResourceInput.value);
            if (!backupId) {
                setBackupResourceHint('Introduce el enlace o ID del contenedor de respaldo Drive que deseas continuar.', true);
                return;
            }
            await createBackup('backupDrive', 'drive', event.currentTarget, backupId);
        };
    }
    if (backupResourceInput && resumeDriveBackupButton) {
        backupResourceInput.addEventListener('input', () => {
            resumeDriveBackupButton.disabled = !normalizeDriveBackupId(backupResourceInput.value);
        });
    }

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

    // Limpiar únicamente cachés reconstruibles del cliente; conservar operaciones recuperables.
    const clearCacheBtn = document.getElementById('btn-admin-clear-client-cache');
    if (clearCacheBtn) {
        clearCacheBtn.onclick = async () => {
            if (!confirm("¿Deseas limpiar los datos locales reconstruibles?\n\nSe eliminarán catálogo, historial, vehículos vistos, miniaturas, validaciones, caché PyS y respuestas temporales de red. Se conservarán sesión, preferencias, borradores y operaciones pendientes o inciertas, copias de edición, auditorías administrativas y recursos esenciales para uso offline.")) return;

            clearCacheBtn.disabled = true;
            try {
                log("[SISTEMA] Limpiando datos reconstruibles; las operaciones recuperables se conservarán.");
                const indexedDbResult = await offline.clearRebuildableClientCache();
                const indexedDbSucceeded = indexedDbResult && indexedDbResult.status === "success";
                if (indexedDbSucceeded) {
                    log("[EXITO] IndexedDB: almacenes reconstruibles limpiados (" + indexedDbResult.stores.join(", ") + "). adminLocalState conservado.");
                } else {
                    log("[ERROR] IndexedDB: " + String(indexedDbResult && indexedDbResult.message || "No se confirmó la limpieza."), false, true);
                }

                const storageResults = [];
                [
                    "gpsepedia_catalog_cache",
                    "gpsepedia_pys_cache",
                    "gpsepedia_pys_cache_updated_at"
                ].forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        storageResults.push({ key, success: true });
                        log("[EXITO] localStorage: caché " + key + " eliminada.");
                    } catch (error) {
                        const message = error && error.message ? error.message : String(error);
                        storageResults.push({ key, success: false, message });
                        log("[ERROR] localStorage: no se pudo eliminar " + key + ": " + message, false, true);
                    }
                });

                const storageSucceeded = storageResults.every(result => result.success);
                const cacheStorageResult = await clearServiceWorkerRuntimeCache_(window);
                if (cacheStorageResult.status === "success") {
                    log("[EXITO] Cache Storage: " + cacheStorageResult.removedCount + " respuestas temporales eliminadas; " +
                        cacheStorageResult.preservedCount + " recursos esenciales conservados.");
                } else {
                    log("[ADVERTENCIA] Cache Storage: " + cacheStorageResult.message, true);
                }

                if (indexedDbSucceeded && storageSucceeded && cacheStorageResult.status === "success") {
                    thumbnailObjectUrls.dispose();
                    const message = "Cachés reconstruibles limpiadas. Sesión, preferencias y operaciones pendientes conservadas. Recargando...";
                    log("[EXITO] " + message);
                    mostrarNotificacion(message, "success");
                    setTimeout(() => window.location.reload(), 1200);
                    return;
                }

                const storageSummary = storageResults.map(result =>
                    result.success ? result.key + ": eliminada" : result.key + ": error (" + result.message + ")"
                ).join("; ");
                const message = "Limpieza incompleta. IndexedDB: " + (indexedDbResult && indexedDbResult.status || "error") +
                    "; localStorage: " + storageSummary + "; Cache Storage: " + cacheStorageResult.status +
                    ". No se recargó la aplicación. Las operaciones pendientes se conservaron.";
                log("[ADVERTENCIA] " + message, true);
                mostrarNotificacion(message, "warning");
            } catch (error) {
                const message = error && error.message ? error.message : String(error);
                log("[ERROR] Fallo durante la limpieza de cachés reconstruibles: " + message, false, true);
                mostrarNotificacion("No se completó la limpieza. " + message, "error");
            } finally {
                clearCacheBtn.disabled = false;
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
function getReplacedImageCapabilities_(rep, schemaReady, referenceCheckStatus, role) {
    const type = rep.tipo_registro || (rep.origen_registro === "auditoria_drive" ? "sin_uso_detectado" : "reemplazada");
    const isUnused = type === "sin_uso_detectado";
    const status = String(rep.estado || (isUnused ? "sin_uso_detectado" : "historica"));
    const referenceSafe = schemaReady && referenceCheckStatus === "verified" && Number(rep.active_reference_count || 0) === 0;
    const canManage = referenceSafe && (isUnused ? status === "sin_uso_detectado" : ["historica", "restablecida"].includes(status));
    const canTrash = referenceSafe && (canManage || status === "requiere_revision");
    const canRestoreFromTrash = schemaReady && ["en_papelera", "requiere_revision"].includes(status);
    const canPermanentlyDelete = referenceSafe && ["en_papelera", "eliminacion_pendiente", "requiere_revision"].includes(status);
    const canRecover = !isUnused && ["historica", "restablecida"].includes(status) && canManage;
    const canDownload = String(role || "").trim().toLowerCase() === "desarrollador" && referenceSafe && (isUnused ? status === "sin_uso_detectado" : ["historica", "restablecida"].includes(status));
    const canMarkInUse = status === "requiere_revision" && schemaReady && referenceCheckStatus === "verified";
    return { type, isUnused, status, referenceSafe, canManage, canMove: canManage, canTrash, canRestoreFromTrash, canPermanentlyDelete, canRecover, canDownload, canMarkInUse };
}

export async function openReplacedImagesModal() {
    const requestContext = await ensureUiSessionRole_(['desarrollador']);
    if (!requestContext) return;
    const generation = ++replacedImagesModalGeneration_;
    const isCurrentRequest = () => generation === replacedImagesModalGeneration_ && isCurrentUiSessionContext_(requestContext);
    const modal = document.getElementById('replaced-images-modal');
    if (!modal || !isCurrentRequest()) return;
    let cachedReplaced = [];
    let cachedReview = [];
    let schemaReady = false;
    let schemaStatus = "not_initialized";
    let referenceCheckStatus = "unavailable";
    let schemaWarnings = [];
    let folders = [];
    const selectedIds = new Set();
    let visibleItems = [];
    let closeMenusHandler = null;
    let closeMenusKeyHandler = null;
    const replacedOverlayId = 'ui-modal:replaced-images-modal';
    modal.dataset.gpOverlayHistoryId = replacedOverlayId;
    modal.__gpOverlayClose = () => {
        replacedImagesModalGeneration_ += 1;
        closeReplacedImagesLightbox_(true);
        cachedReplaced = [];
        cachedReview = [];
        schemaReady = false;
        schemaStatus = "not_initialized";
        referenceCheckStatus = "unavailable";
        schemaWarnings = [];
        folders = [];
        selectedIds.clear();
        visibleItems = [];
        if (closeMenusHandler) document.removeEventListener("click", closeMenusHandler);
        if (closeMenusKeyHandler) document.removeEventListener("keydown", closeMenusKeyHandler);
        closeMenusHandler = null;
        closeMenusKeyHandler = null;
        const list = document.getElementById('replaced-images-list-container');
        if (list) list.replaceChildren();
        modal.style.display = 'none';
    };
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
    const selectAllCheckbox = document.getElementById("replaced-images-select-all");
    const selectionCount = document.getElementById("replaced-images-selection-count");
    const bulkMoveButton = document.getElementById("btn-replaced-bulk-move");
    const bulkRestoreButton = document.getElementById("btn-replaced-bulk-restore");
    const bulkTrashButton = document.getElementById("btn-replaced-bulk-trash");
    const clearSelectionButton = document.getElementById("btn-replaced-clear-selection");
    const lightbox = document.getElementById('replaced-image-lightbox');
    const lightboxContent = document.getElementById('replaced-image-lightbox-content');
    const lightboxImage = document.getElementById('replaced-image-lightbox-image');
    const lightboxTitle = document.getElementById('replaced-image-lightbox-title');
    const lightboxClose = document.getElementById('replaced-image-lightbox-close');

    let currentView = await offline.getReplacedImagesView();
    if (!isCurrentRequest()) return;
    currentView = currentView === 'list' ? 'list' : 'grid';

    const closeLightbox = () => closeReplacedImagesLightbox_();

    const openLightbox = (rep) => {
        if (!isCurrentRequest() || !lightbox || !lightboxImage) return;
        const historyManager = window.overlayHistory;
        if (historyManager &&
            !historyManager.getStack().includes(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_)) {
            historyManager.register(REPLACED_IMAGES_LIGHTBOX_HISTORY_ID_, () => {
                closeReplacedImagesLightbox_(true);
            });
        }
        closeMenus();
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
            cachedReplaced = response && Array.isArray(response.data) ? response.data : [];
            const currentIds = new Set(cachedReplaced.map(item => String(item.id_reemplazo || "")));
            selectedIds.forEach(id => { if (!currentIds.has(id)) selectedIds.delete(id); });
            cachedReview = response && Array.isArray(response.review) ? response.review : [];
            schemaStatus = String(response && response.schemaStatus || "not_initialized");
            schemaReady = schemaStatus === "ready";
            referenceCheckStatus = String(response && response.referenceCheckStatus || "unavailable");
            schemaWarnings = response && Array.isArray(response.warnings) ? response.warnings : [];
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

    const getSelectedItems = () => visibleItems.filter(item => selectedIds.has(String(item.id_reemplazo || "")));
    const updateSelectionToolbar = () => {
        const selected = getSelectedItems();
        const capabilities = selected.map(item => getReplacedImageCapabilities_(item, schemaReady, referenceCheckStatus, getUiSessionContext_()?.role));
        const allCanMove = selected.length > 0 && capabilities.every(item => item.canMove);
        const allCanTrash = selected.length > 0 && capabilities.every(item => item.canTrash);
        const allCanRestoreFromTrash = selected.length > 0 && capabilities.every(item => item.canRestoreFromTrash);
        const allCanRecover = selected.length > 0 && capabilities.every(item => item.canRecover);
        const allVisibleSelected = visibleItems.length > 0 && visibleItems.every(item => selectedIds.has(String(item.id_reemplazo || "")));
        const someVisibleSelected = visibleItems.some(item => selectedIds.has(String(item.id_reemplazo || "")));
        if (selectionCount) selectionCount.textContent = selected.length + (selected.length === 1 ? " seleccionada" : " seleccionadas");
        if (selectAllCheckbox) { selectAllCheckbox.checked = allVisibleSelected; selectAllCheckbox.indeterminate = someVisibleSelected && !allVisibleSelected; selectAllCheckbox.disabled = visibleItems.length === 0; }
        if (bulkMoveButton) { bulkMoveButton.hidden = !allCanMove; bulkMoveButton.disabled = !folderSelect || !folderSelect.value; }
        if (bulkTrashButton) { bulkTrashButton.hidden = !allCanTrash; bulkTrashButton.disabled = false; }
        if (bulkRestoreButton) { bulkRestoreButton.hidden = !(allCanRestoreFromTrash || allCanRecover); bulkRestoreButton.disabled = false; }
        if (clearSelectionButton) clearSelectionButton.hidden = selected.length === 0;
    };

    const closeMenus = (restoreFocus = false) => {
        if (!listContainer) return;
        let focusTarget = null;
        listContainer.querySelectorAll(".replaced-image-menu").forEach(menu => {
            const panel = menu.querySelector(".replaced-image-menu-panel");
            const trigger = menu.querySelector(".replaced-image-menu-trigger");
            if (panel && !panel.hidden) { panel.hidden = true; if (trigger) trigger.setAttribute("aria-expanded", "false"); focusTarget = trigger || focusTarget; }
        });
        if (restoreFocus && focusTarget) focusTarget.focus();
    };
    closeMenusHandler = event => { const target = event.target; if (!(target instanceof Element) || !target.closest(".replaced-image-menu")) closeMenus(); };
    closeMenusKeyHandler = event => { if (event.key === "Escape") closeMenus(true); };
    document.addEventListener("click", closeMenusHandler);
    document.addEventListener("keydown", closeMenusKeyHandler);

    const runBulkOperation = async (button, busyLabel, items, confirmation, operation) => {
        if (!items.length || !isCurrentRequest() || !confirm(confirmation)) return;
        const original = button.innerHTML, failures = []; let succeeded = 0;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>' + busyLabel + '</span>';
        try {
            for (let index = 0; index < items.length; index++) {
                if (!isCurrentRequest()) return;
                if (selectionCount) selectionCount.textContent = "Procesando " + (index + 1) + " de " + items.length + "...";
                const item = items[index];
                try { await operation(item); succeeded++; }
                catch (error) { failures.push({ id: String(item.id_reemplazo || ""), name: item.nombre_archivo || "Imagen", message: String(error && error.message || error) }); }
            }
            if (!isCurrentRequest()) return;
            selectedIds.clear(); failures.forEach(item => selectedIds.add(item.id));
            await loadData();
            if (!isCurrentRequest()) return;
            if (failures.length) { mostrarNotificacion(succeeded + " procesadas; " + failures.length + " requieren revisión.", "warning"); if (selectionCount) selectionCount.title = failures.map(item => item.name + ": " + item.message).join("\n"); }
            else { if (selectionCount) selectionCount.removeAttribute("title"); mostrarNotificacion(succeeded + " imágenes procesadas correctamente.", "success"); }
        } finally { if (button.isConnected && isCurrentRequest()) { button.disabled = false; button.innerHTML = original; updateSelectionToolbar(); } }
    };

    const renderList = (filterText = "") => {
        if (!isCurrentRequest() || !listContainer) return;
        listContainer.innerHTML = ""; listContainer.className = "replaced-images-list view-" + currentView;
        if (!schemaReady || referenceCheckStatus !== "verified") {
            const warning = document.createElement("div"); warning.className = "replaced-images-empty";
            warning.textContent = schemaWarnings.length ? schemaWarnings.join(" ") : "No se pudo verificar el esquema o las referencias. Las acciones permanecen deshabilitadas.";
            listContainer.appendChild(warning);
            if (schemaStatus === "migration_required" || schemaStatus === "not_initialized") {
                const migrateButton = document.createElement("button"); migrateButton.type = "button"; migrateButton.className = "btn btn-primary replaced-images-schema-migrate";
                migrateButton.textContent = schemaStatus === "not_initialized" ? "Inicializar historial" : "Migrar esquema";
                migrateButton.onclick = async () => {
                    if (!isCurrentRequest()) return; migrateButton.disabled = true; migrateButton.textContent = "Verificando esquema...";
                    try { await routeAction("migrateReplacedImagesSchema", getDeveloperSessionPayload()); if (!isCurrentRequest()) return; mostrarNotificacion("El esquema del historial fue verificado.", "success"); await loadData(); }
                    catch (error) { if (isCurrentRequest()) alert(error.message || String(error)); }
                    finally { if (migrateButton.isConnected && isCurrentRequest()) { migrateButton.disabled = false; migrateButton.textContent = schemaStatus === "not_initialized" ? "Inicializar historial" : "Migrar esquema"; } }
                }; listContainer.appendChild(migrateButton);
            }
        }
        const query = String(filterText || "").toLowerCase().trim();
        const filtered = cachedReplaced.filter(item => !query || [item.nombre_archivo, item.referencia_texto, item.campo, item.archivo_drive_id, item.registro_id, item.ubicacion_actual, item.ubicacion_original, item.origen_registro, item.estado, item.estado_organizacion, item.error_organizacion].some(value => String(value || "").toLowerCase().includes(query)));
        visibleItems = filtered;
        const visibleIds = new Set(filtered.map(item => String(item.id_reemplazo || "")));
        selectedIds.forEach(id => { if (!visibleIds.has(id)) selectedIds.delete(id); });
        if (!filtered.length) { const empty = document.createElement("div"); empty.className = "replaced-images-empty"; empty.textContent = "No hay registros válidos que coincidan con el filtro."; listContainer.appendChild(empty); }
        filtered.forEach((rep, index) => {
            const capabilities = getReplacedImageCapabilities_(rep, schemaReady, referenceCheckStatus, getUiSessionContext_()?.role);
            const { isUnused, status } = capabilities;
            const statusLabel = isUnused ? (status === "sin_uso_detectado" ? "Sin uso detectado" : status.replace(/_/g, " ")) : (status === "historica" ? "Reemplazada" : status.replace(/_/g, " "));
            const card = document.createElement("article"); card.className = "replaced-image-card" + (currentView === "list" ? " replaced-image-card-list" : "") + (selectedIds.has(String(rep.id_reemplazo || "")) ? " is-selected" : "");
            const cardToolbar = document.createElement("div"); cardToolbar.className = "replaced-image-card-toolbar";
            const selectLabel = document.createElement("label"); selectLabel.className = "replaced-image-select"; selectLabel.title = "Seleccionar " + (rep.nombre_archivo || "imagen");
            const selectCheckbox = document.createElement("input"); selectCheckbox.type = "checkbox"; selectCheckbox.checked = selectedIds.has(String(rep.id_reemplazo || "")); selectCheckbox.setAttribute("aria-label", "Seleccionar " + (rep.nombre_archivo || "imagen"));
            selectCheckbox.onchange = () => { const id = String(rep.id_reemplazo || ""); if (selectCheckbox.checked) selectedIds.add(id); else selectedIds.delete(id); card.classList.toggle("is-selected", selectCheckbox.checked); updateSelectionToolbar(); };
            selectLabel.appendChild(selectCheckbox); cardToolbar.appendChild(selectLabel);
            const menuWrapper = document.createElement("div"); menuWrapper.className = "replaced-image-menu";
            const menuButton = document.createElement("button"); menuButton.type = "button"; menuButton.className = "replaced-image-menu-trigger"; menuButton.innerHTML = '<i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>';
            menuButton.title = "Más acciones"; menuButton.setAttribute("aria-label", "Más acciones para " + (rep.nombre_archivo || "imagen")); menuButton.setAttribute("aria-haspopup", "menu"); menuButton.setAttribute("aria-expanded", "false");
            const menuPanel = document.createElement("div"); menuPanel.className = "replaced-image-menu-panel"; menuPanel.id = "replaced-image-menu-" + index; menuPanel.hidden = true;
            menuPanel.setAttribute("role", "menu"); menuPanel.setAttribute("aria-label", "Acciones para " + (rep.nombre_archivo || "imagen")); menuButton.setAttribute("aria-controls", menuPanel.id);
            menuButton.onclick = event => { event.stopPropagation(); const shouldOpen = menuPanel.hidden; closeMenus(); if (shouldOpen) { menuPanel.hidden = false; menuButton.setAttribute("aria-expanded", "true"); const firstAction = menuPanel.querySelector("button"); if (firstAction) firstAction.focus(); } };
            menuWrapper.append(menuButton, menuPanel); cardToolbar.appendChild(menuWrapper);
            const addMenuAction = (icon, label, busyLabel, handler, danger = false) => {
                const button = document.createElement("button"); button.type = "button"; button.className = "replaced-image-menu-item" + (danger ? " is-danger" : ""); button.setAttribute("role", "menuitem");
                const iconNode = document.createElement("i"); iconNode.className = "fa-solid " + icon; iconNode.setAttribute("aria-hidden", "true");
                const textNode = document.createElement("span"); textNode.textContent = label; button.append(iconNode, textNode);
                button.onclick = event => { event.stopPropagation(); closeMenus(); void runButtonAction(button, busyLabel, handler); }; menuPanel.appendChild(button);
            };
            if (capabilities.canDownload) addMenuAction("fa-download", "Descargar", "Preparando...", async () => {
                const response = await routeAction("getReplacedImageDownloadUrl", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return;
                const anchor = document.createElement("a"); anchor.href = response.downloadUrl; anchor.rel = "noopener noreferrer"; anchor.download = response.fileName || rep.nombre_archivo || ""; document.body.appendChild(anchor); anchor.click(); anchor.remove(); mostrarNotificacion("Se abrió la descarga de " + (response.fileName || rep.nombre_archivo || "la imagen") + ".", "success");
            });
            if (capabilities.canMove) addMenuAction("fa-folder-open", "Mover", "Moviendo...", async () => {
                if (!folderSelect || !folderSelect.value) { alert("No hay una carpeta destino seleccionada."); return; }
                const option = folderSelect.options[folderSelect.selectedIndex], targetName = option ? option.textContent : "la carpeta seleccionada";
                if (!confirm("¿Mover \"" + (rep.nombre_archivo || "esta imagen") + "\" a \"" + targetName + "\"?")) return;
                const response = await routeAction("moveReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo, targetFolderId: folderSelect.value }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Imagen movida correctamente.", "success"); await loadData();
            });
            if (capabilities.canRecover) addMenuAction("fa-clock-rotate-left", "Restaurar al campo", "Restaurando...", async () => {
                if (!confirm("¿Restaurar esta imagen al campo " + (rep.campo || "registrado") + "? La imagen actualmente activa pasará al historial.")) return;
                const response = await routeAction("recoverReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Imagen histórica restablecida.", "success"); await loadData();
            });
            if (capabilities.canRestoreFromTrash) addMenuAction("fa-trash-arrow-up", "Restaurar de papelera", "Restaurando...", async () => {
                if (!confirm("¿Restaurar este archivo en Google Drive? No volverá a asociarse automáticamente a un campo del Spreadsheet.")) return;
                const response = await routeAction("restoreReplacedImageFromTrash", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Archivo restaurado desde papelera.", "success"); await loadData();
            });
            if (capabilities.canTrash) addMenuAction("fa-trash", "Enviar a papelera", "Enviando...", async () => {
                const description = isUnused ? "¿Enviar esta imagen sin uso a la papelera de Google Drive?" : "¿Enviar esta imagen reemplazada a la papelera? La restauración histórica quedará suspendida mientras esté allí.";
                if (!confirm(description + " El servidor volverá a validar las referencias y la ubicación.")) return;
                const response = await routeAction("deleteReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Imagen enviada a papelera.", "success"); await loadData();
            }, true);
            if (capabilities.canPermanentlyDelete) addMenuAction("fa-trash-can", status === "eliminacion_pendiente" ? "Verificar eliminación" : "Eliminar definitivamente", "Eliminando...", async () => {
                const warning = status === "eliminacion_pendiente" ? "¿Verificar y finalizar la eliminación definitiva de este archivo?" : "Esta acción es irreversible. ¿Eliminar definitivamente el archivo de Google Drive?";
                if (!confirm(warning + " El servidor volverá a comprobar que no existan referencias activas.")) return;
                const response = await routeAction("permanentlyDeleteReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Eliminación definitiva verificada.", "success"); await loadData();
            }, true);
            if (capabilities.canMarkInUse) addMenuAction("fa-shield-halved", "Marcar en uso", "Protegiendo...", async () => {
                if (!confirm("¿Marcar esta imagen como en uso? Quedará protegida frente a la organización automática y las acciones de eliminación.")) return;
                const response = await routeAction("markReplacedImageInUse", { ...getDeveloperSessionPayload(), id_reemplazo: rep.id_reemplazo }); if (!isCurrentRequest()) return; mostrarNotificacion(response.message || "Imagen marcada en uso.", "success"); await loadData();
            });
            menuButton.disabled = menuPanel.childElementCount === 0; if (menuButton.disabled) menuButton.title = "Sin acciones disponibles"; card.appendChild(cardToolbar);
            const previewButton = document.createElement("button"); previewButton.type = "button"; previewButton.className = currentView === "grid" ? "replaced-image-preview" : "replaced-image-list-thumb";
            previewButton.title = "Ver imagen ampliada"; previewButton.setAttribute("aria-label", "Ver " + (rep.nombre_archivo || "imagen") + " en tamaño ampliado");
            const image = document.createElement("img"); image.src = getImageUrl(rep.url_visualizacion || rep.url_anterior || rep.archivo_drive_id, currentView === "grid" ? IMG_SIZE_MEDIUM : IMG_SIZE_SMALL);
            image.alt = rep.nombre_archivo || "Imagen de Drive"; image.loading = "lazy"; image.decoding = "async"; image.onerror = () => { image.onerror = null; image.src = "https://placehold.co/400x300/cccccc/333333?text=Vista+no+disponible"; };
            previewButton.appendChild(image); previewButton.onclick = () => openLightbox(rep); card.appendChild(previewButton);
            const info = document.createElement("div"); info.className = "replaced-image-info";
            const title = document.createElement("strong"); title.className = "replaced-image-name"; title.textContent = rep.nombre_archivo || (isUnused ? "Imagen sin uso detectado" : (rep.referencia_texto || "Imagen reemplazada"));
            const typeLabel = document.createElement("span"); typeLabel.className = "replaced-image-type " + (isUnused ? "is-unused" : "is-replaced"); typeLabel.textContent = isUnused ? "Sin uso detectado" : "Reemplazada";
            const details = document.createElement("span"); details.className = "replaced-image-details"; details.textContent = (rep.tipo_mime || "Imagen") + " · ID: " + (rep.archivo_drive_id || "No disponible") + (rep.campo ? " · Campo: " + rep.campo : "");
            const location = document.createElement("span"); location.className = "replaced-image-details"; location.textContent = "Ubicación: " + (rep.ubicacion_actual || rep.ubicacion_original || "No disponible");
            const dateDetails = document.createElement("span"); dateDetails.className = "replaced-image-details"; dateDetails.textContent = (isUnused ? "Detectada: " + (rep.fecha_deteccion || "Fecha no disponible") : "Reemplazada: " + (rep.fecha_reemplazo || "Fecha no disponible"));
            const statusText = document.createElement("span"); statusText.className = "replaced-image-status"; statusText.textContent = "Estado: " + statusLabel;
            const organizationDetails = document.createElement("span"); organizationDetails.className = "replaced-image-details";
            const organizationStatus = String(rep.estado_organizacion || ""), organizationError = String(rep.error_organizacion || "");
            const organizationLabels = { organizada: "Organizada en Imagenes_Sin_Uso", movida_manual: "Movida manualmente", pendiente: "Pendiente de organización", error: "Error de organización", bloqueada: "Organización bloqueada", no_confirmada: "No confirmada" };
            organizationDetails.textContent = "Organización: " + (organizationLabels[organizationStatus] || organizationStatus || "No registrada") + (organizationError ? " · " + organizationError : ""); if (organizationError) statusText.title = organizationError;
            if (currentView === "list") info.append(title, typeLabel, location, dateDetails, statusText); else info.append(title, typeLabel, details, location, dateDetails, statusText);
            if (isUnused && (currentView === "grid" || organizationError)) info.append(organizationDetails);
            card.appendChild(info); listContainer.appendChild(card);
        });
        if (cachedReview.length) {
            const reviewSection = document.createElement("section"); reviewSection.className = "replaced-images-review";
            const heading = document.createElement("h4"); heading.textContent = "Registros que requieren revisión (" + cachedReview.length + ")"; reviewSection.appendChild(heading);
            cachedReview.forEach(item => {
                const row = document.createElement("article"); row.className = "replaced-image-card replaced-image-review-card";
                const info = document.createElement("div"); info.className = "replaced-image-info";
                const title = document.createElement("strong"); title.textContent = item.nombre_archivo || ("Fila " + item.rowNumber);
                const identifier = document.createElement("span"); identifier.className = "replaced-image-details"; identifier.textContent = "Fila " + item.rowNumber + " · ID: " + (item.id_reemplazo || "Sin ID") + " · Estado: " + (item.estado || "Sin estado");
                const reason = document.createElement("span"); reason.className = "replaced-image-status"; reason.textContent = "Motivo: " + (item.reason || "Registro no verificable."); info.append(title, identifier, reason);
                if (item.reconciliationUrl) { const reconcileButton = document.createElement("button"); reconcileButton.type = "button"; reconcileButton.className = "btn btn-secondary"; reconcileButton.textContent = "Abrir filas para reconciliación manual"; reconcileButton.onclick = () => window.open(item.reconciliationUrl, "_blank", "noopener"); info.appendChild(reconcileButton); }
                row.appendChild(info); reviewSection.appendChild(row);
            }); listContainer.appendChild(reviewSection);
        }
        updateSelectionToolbar();
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
        const historyManager = window.overlayHistory;
        if (historyManager && historyManager.has(replacedOverlayId)) historyManager.close(replacedOverlayId);
        else {
            if (closeMenusHandler) document.removeEventListener("click", closeMenusHandler);
            if (closeMenusKeyHandler) document.removeEventListener("keydown", closeMenusKeyHandler);
            selectedIds.clear();
            visibleItems = [];
            replacedImagesModalGeneration_ += 1;
            closeReplacedImagesLightbox_(true);
            cachedReplaced = [];
            cachedReview = [];
            schemaReady = false;
            schemaStatus = "not_initialized";
            referenceCheckStatus = "unavailable";
            schemaWarnings = [];
            folders = [];
            if (listContainer) listContainer.replaceChildren();
            modal.style.display = 'none';
        }
    };
    if (filterInput) filterInput.oninput = () => { selectedIds.clear(); renderList(filterInput.value); };
    if (refreshBtn) refreshBtn.onclick = () => { loadData(); loadFolders(); };
    if (listViewBtn) listViewBtn.onclick = () => setView('list');
    if (gridViewBtn) gridViewBtn.onclick = () => setView('grid');
    if (selectAllCheckbox) selectAllCheckbox.onchange = () => { visibleItems.forEach(item => { const id = String(item.id_reemplazo || ""); if (selectAllCheckbox.checked) selectedIds.add(id); else selectedIds.delete(id); }); renderList(filterInput ? filterInput.value : ""); };
    if (clearSelectionButton) clearSelectionButton.onclick = () => { selectedIds.clear(); renderList(filterInput ? filterInput.value : ""); };
    if (folderSelect) folderSelect.onchange = updateSelectionToolbar;
    if (bulkMoveButton) bulkMoveButton.onclick = () => { const items = getSelectedItems(); if (!folderSelect || !folderSelect.value) { alert("Selecciona una carpeta destino."); return; } const option = folderSelect.options[folderSelect.selectedIndex], targetName = option ? option.textContent : "la carpeta seleccionada"; void runBulkOperation(bulkMoveButton, "Moviendo...", items, "¿Mover " + items.length + " imágenes a " + targetName + "? El servidor validará cada archivo por separado.", async item => { await routeAction("moveReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: item.id_reemplazo, targetFolderId: folderSelect.value }); }); };
    if (bulkTrashButton) bulkTrashButton.onclick = () => { const items = getSelectedItems(); void runBulkOperation(bulkTrashButton, "Enviando...", items, "¿Enviar " + items.length + " imágenes a la papelera de Google Drive? Cada archivo se volverá a validar antes del movimiento.", async item => { await routeAction("deleteReplacedImage", { ...getDeveloperSessionPayload(), id_reemplazo: item.id_reemplazo }); }); };
    if (bulkRestoreButton) bulkRestoreButton.onclick = () => { const items = getSelectedItems(); const allFromTrash = items.length > 0 && items.every(item => getReplacedImageCapabilities_(item, schemaReady, referenceCheckStatus, getUiSessionContext_()?.role).canRestoreFromTrash); const confirmation = allFromTrash ? "¿Restaurar " + items.length + " archivos desde la papelera de Drive? No se asociarán automáticamente a campos del Spreadsheet." : "¿Restaurar " + items.length + " imágenes históricas en sus campos? Las imágenes actualmente activas pasarán al historial."; void runBulkOperation(bulkRestoreButton, "Restaurando...", items, confirmation, async item => { const capabilities = getReplacedImageCapabilities_(item, schemaReady, referenceCheckStatus, getUiSessionContext_()?.role); const action = capabilities.canRestoreFromTrash ? "restoreReplacedImageFromTrash" : "recoverReplacedImage"; await routeAction(action, { ...getDeveloperSessionPayload(), id_reemplazo: item.id_reemplazo }); }); };

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
    const cleared = await processPendingDriveAuditClears_(requestContext.userId);
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
    const auditOverlayId = 'ui-modal:audit-drive-modal';
    modal.dataset.gpOverlayHistoryId = auditOverlayId;
    modal.__gpOverlayClose = () => {
        auditDriveModalGeneration_ += 1;
        modal.style.display = 'none';
    };
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('close-audit-drive-modal');
    const summaryEl = document.getElementById('audit-drive-summary');
    const container = document.getElementById('audit-drive-results-container');
    const auditButton = document.getElementById('btn-admin-audit-drive-images');
    const startButton = document.getElementById('btn-audit-drive-start');
    const resumeButton = document.getElementById('btn-audit-drive-resume');
    const organizeButton = document.getElementById('btn-audit-drive-organize');
    const saveInventoryButton = document.getElementById('btn-audit-drive-save-inventory');
    const reconcileButton = document.getElementById('btn-audit-drive-reconcile');
    const reconciliationPanel = document.getElementById('audit-drive-reconciliation-panel');
    const reconciliationStatus = document.getElementById('audit-drive-reconciliation-status');
    const reconciliationCounts = document.getElementById('audit-drive-reconciliation-counts');
    const reconciliationResults = document.getElementById('audit-drive-reconciliation-results');
    if (!summaryEl || !container) return;
    if (closeBtn) closeBtn.onclick = () => {
        const historyManager = window.overlayHistory;
        if (historyManager && historyManager.has(auditOverlayId)) historyManager.close(auditOverlayId);
        else { auditDriveModalGeneration_ += 1; modal.style.display = 'none'; }
    };

    summaryEl.innerHTML = `
        <div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--border-color); display:flex; gap:15px; flex-wrap:wrap;">
            <span>📁 <strong>Carpeta raíz:</strong> <span id="audit-root-name">Cortes</span> (<code id="audit-root-id"></code>)</span>
            <span>🔎 <strong>Archivos descubiertos:</strong> <span id="audit-discovered-count">0</span></span>
            <span>📊 <strong>Archivos analizados:</strong> <span id="audit-total-count">0</span></span>
            <span>📂 <strong>Carpetas descubiertas (incluye raíz):</strong> <span id="audit-folder-count">1</span></span>
            <span>🔁 <strong>Lotes recibidos:</strong> <span id="audit-batch-count">0</span></span>
            <span>⏳ <strong>Carpetas en pila pendiente:</strong> <span id="audit-pending-folder-count">0</span></span>
            <span>⚠️ <strong>Errores:</strong> <span id="audit-error-count">0</span></span>
            <span>♻️ <strong>Archivos duplicados omitidos:</strong> <span id="audit-duplicate-file-count">0</span></span>
            <span>📁 <strong>Carpetas duplicadas omitidas:</strong> <span id="audit-duplicate-folder-count">0</span></span>
            <span><strong>Último escaneo:</strong> <span id="audit-last-scan-at">No disponible</span></span>
            <span><strong>Versión ADMIN:</strong> <span id="audit-service-version">No disponible</span></span>
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
    const seenFileIds = new Set();
    const renderedFileIds = new Set();
    let cursor = null;
    let complete = false;
    let totalDiscovered = 0;
    let totalAnalyzed = 0;
    let foldersVisited = 1;
    let pendingFolderCount = 1;
    let errorCount = 0;
    let duplicateFileCount = 0;
    let duplicateFolderCount = 0;
    let uiDuplicateFileCount = 0;
    let lastScanAt = 0;
    let serviceVersion = '';
    let batches = 0;
    let lastBatchAnalyzed = 0;
    let unverifiableReferences = 0;
    let rootFolderName = 'Cortes';
    let rootFolderId = '';
    let resumeUnavailable = false;
    let inventoryStatus = '';
    let inventoryMessage = '';
    let inventoryAuditId = '';
    let inventoryOperationId = '';
    let inventoryConfirmedFileIds = [];
    let auditId = '';
    let auditStartedAt = 0;
    let localStateRevision = 0;
    let localPageCount = 0;
    let pendingBatchIndex = null;
    let pendingBatchFiles = [];
    let savedState = null;
    let isRunning = false;
    let isReconciling = false;

    const appendFiles = (files) => {
        if (!isCurrentRequest()) return;
        files.forEach(file => {
            const fileId = String(file && file.fileId || '').trim();
            if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId) || renderedFileIds.has(fileId)) return;
            renderedFileIds.add(fileId);
            if (file.classification !== 'Histórica' && file.classification !== 'Sin uso detectado') return;
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px; border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem; background:var(--card-bg);";
            if (String(file.mimeType || '').startsWith('image/')) {
                const preview = document.createElement('img');
                preview.style.cssText = "width:58px; height:58px; flex:0 0 58px; object-fit:contain; border-radius:4px; background:var(--surface-bg);";
                preview.loading = 'lazy';
                preview.alt = 'Vista previa de ' + (file.fileName || 'imagen');
                preview.dataset.drivePreviewVerification = 'pending';
                preview.onload = () => {
                    preview.dataset.drivePreviewVerification = 'loaded';
                    preview.title = 'Miniatura cargada en la sesión autorizada actual';
                };
                preview.onerror = () => {
                    preview.dataset.drivePreviewVerification = 'unavailable';
                    preview.onerror = null;
                    preview.src = 'https://placehold.co/120x120/cccccc/333333?text=Sin+vista';
                    preview.title = 'No se pudo cargar la miniatura con la sesión actual';
                };
                preview.src = getImageUrl(file.fileId, 120);
                row.appendChild(preview);
            }
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
        if (auditPendingFolderCountEl) auditPendingFolderCountEl.textContent = String(pendingFolderCount);
        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = String(value);
        };
        setText('audit-discovered-count', totalDiscovered);
        setText('audit-error-count', errorCount);
        setText('audit-duplicate-file-count', duplicateFileCount + uiDuplicateFileCount);
        setText('audit-duplicate-folder-count', duplicateFolderCount);
        setText('audit-last-scan-at', lastScanAt ? new Date(lastScanAt).toLocaleString() : 'No disponible');
        setText('audit-service-version', serviceVersion || 'No disponible');
        if (auditRootNameEl) auditRootNameEl.textContent = rootFolderName;
        if (auditRootIdEl) auditRootIdEl.textContent = rootFolderId;
        setText('audit-in-use-count', counts.inUse);
        setText('audit-historical-count', counts.historical);
        setText('audit-unused-count', counts.unused);
        setText('audit-unverified-count', counts.unverified);
        setText('audit-unknown-references', unverifiableReferences);
        if (auditStatusEl) auditStatusEl.textContent = statusText || '';
    };

    const persistState = async (status, extra = {}) => {
        if (!isCurrentRequest()) throw new Error('La sesión cambió; se detuvo la persistencia de la auditoría.');
        if (!auditId) return null;
        const state = {
            auditId: auditId,
            serverAuditId: auditId,
            createdAt: auditStartedAt,
            revision: localStateRevision,
            batchIndex: pendingBatchIndex,
            batchFiles: pendingBatchFiles,
            files: allFiles,
            cursor: cursor,
            complete: complete,
            status: status,
            totalDiscovered: totalDiscovered,
            totalAnalyzed: totalAnalyzed,
            foldersVisited: foldersVisited,
            pendingFolderCount: pendingFolderCount,
            errorCount: errorCount,
            duplicateFileCount: duplicateFileCount,
            duplicateFolderCount: duplicateFolderCount,
            uiDuplicateFileCount: uiDuplicateFileCount,
            lastScanAt: lastScanAt,
            serviceVersion: serviceVersion,
            batches: batches,
            lastBatchAnalyzed: lastBatchAnalyzed,
            unverifiableReferences: unverifiableReferences,
            rootFolderName: rootFolderName,
            rootFolderId: rootFolderId,
            resumeUnavailable: resumeUnavailable,
            inventoryStatus: inventoryStatus,
            inventoryMessage: inventoryMessage,
            inventoryAuditId: inventoryAuditId,
            inventoryOperationId: inventoryOperationId,
            inventoryConfirmedFileIds: inventoryConfirmedFileIds,
            lastError: ''
        };
        Object.assign(state, extra);
        const saved = await offline.saveDriveAuditState(state, requestContext.userId);
        if (!isCurrentRequest()) {
            await offline.clearDriveAuditState(requestContext.userId);
            throw new Error('La sesión cambió; se eliminó el estado de auditoría de la cuenta anterior.');
        }
        if (!saved) throw new Error('IndexedDB no confirmó la persistencia del progreso de auditoría.');
        localStateRevision = Math.max(0, Number(saved.revision) || localStateRevision);
        localPageCount = Math.max(0, Number(saved.pageCount) || localPageCount);
        if (pendingBatchIndex !== null) {
            pendingBatchIndex = null;
            pendingBatchFiles = [];
        }
        savedState = Object.assign({}, state, { revision: localStateRevision, auditId: auditId });
    };


    const saveUnusedInventory = async () => {
        if (!isCurrentRequest() || inventoryStatus === 'saved' || inventoryStatus === 'organized') return;
        if (isRunning || isDriveAuditRunning) return;
        const unusedFiles = allFiles.filter(file => file.classification === 'Sin uso detectado')
            .map(file => ({ fileId: file.fileId, folderId: file.folderId }));
        if (!unusedFiles.length) {
            inventoryStatus = 'saved';
            inventoryConfirmedFileIds = [];
            inventoryMessage = 'Auditoría completa. No hay imágenes sin uso para registrar; no se escribió en Spreadsheet.';
            try { await persistState('complete'); }
            catch (error) { inventoryMessage += ' No se pudo guardar el estado local: ' + String(error && error.message || error); }
            updateSummary(inventoryMessage);
            updateControls();
            return;
        }
        if (typeof window.confirm !== 'function' || !window.confirm(
            '¿Registrar ' + unusedFiles.length + ' imágenes sin uso en la hoja «Imagenes_Reemplazadas» de Spreadsheet? Esta acción escribe un inventario, pero no mueve archivos ni cambia URLs o permisos.'
        )) return;

        isRunning = true;
        isDriveAuditRunning = true;
        updateControls();
        inventoryStatus = 'pending';
        inventoryMessage = 'Registrando el inventario en Spreadsheet. No se moverán archivos.';
        let localPersistenceWarning = '';
        try {
            try {
                await persistState('complete');
                if (!isCurrentRequest()) return;
            } catch (storageError) {
                if (!isCurrentRequest()) return;
                localPersistenceWarning = ' No se pudo guardar localmente el estado previo al registro: ' + storageError.message;
            }

            if (!auditId) {
                inventoryStatus = 'error';
                inventoryMessage = 'No existe un auditId de ADMIN verificable para registrar el inventario. No se escribió en Spreadsheet.';
                updateSummary(inventoryMessage);
                return;
            }

            try {
                const inventoryResult = await routeAction('saveUnusedImagesInventory', {
                    ...getDeveloperSessionPayload(), auditId: auditId, files: unusedFiles
                });
                if (!isCurrentRequest()) return;
                if (!inventoryResult || inventoryResult.status !== 'success' || !inventoryResult.auditId ||
                    !inventoryResult.inventoryOperationId) {
                    throw new Error(inventoryResult && inventoryResult.message
                        ? inventoryResult.message : 'ADMIN no confirmó la operación de inventario.');
                }
                if (String(inventoryResult.auditId) !== auditId) {
                    throw new Error('ADMIN devolvió un inventario asociado a otra auditoría.');
                }
                inventoryAuditId = String(inventoryResult.auditId);
                inventoryOperationId = String(inventoryResult.inventoryOperationId);
                if (!Array.isArray(inventoryResult.results)) {
                    throw new Error('ADMIN no devolvió resultados individuales verificables; no se habilitará la organización.');
                }
                const submittedIds = new Set(unusedFiles.map(item => String(item.fileId || '')).filter(id => /^[a-zA-Z0-9_-]{20,}$/.test(id)));
                const resultsBySubmittedId = new Map();
                inventoryResult.results.forEach(item => {
                    if (!item || !submittedIds.has(String(item.fileId || ''))) return;
                    const fileId = String(item.fileId);
                    if (resultsBySubmittedId.has(fileId)) {
                        throw new Error('ADMIN devolvió resultados duplicados para una imagen; revisa el inventario antes de organizar.');
                    }
                    if (!['confirmado', 'bloqueado', 'error'].includes(String(item.status || ''))) {
                        throw new Error('ADMIN devolvió un estado de inventario no reconocido para una imagen.');
                    }
                    resultsBySubmittedId.set(fileId, String(item.status));
                });
                if (resultsBySubmittedId.size !== submittedIds.size) {
                    throw new Error('ADMIN no devolvió un resultado individual para cada imagen enviada; no se habilitará la organización.');
                }
                inventoryConfirmedFileIds = Array.from(submittedIds).filter(fileId => resultsBySubmittedId.get(fileId) === 'confirmado');
                inventoryStatus = 'saved';
                const blockedCount = Math.max(0, Number(inventoryResult.blockedCount) || 0);
                const errorCount = Math.max(0, Number(inventoryResult.errorCount) || 0);
                inventoryMessage = 'Inventario registrado. ' + (Number(inventoryResult.savedCount) || 0) +
                    ' imágenes guardadas y ' + inventoryConfirmedFileIds.length +
                    ' confirmadas para organización explícita. ' + blockedCount + ' bloqueadas y ' +
                    errorCount + ' con error. No se movió ningún archivo.';
            } catch (inventoryError) {
                if (!isCurrentRequest()) return;
                inventoryStatus = 'error';
                inventoryMessage = 'El inventario no pudo confirmarse: ' + inventoryError.message +
                    '. No se movió ningún archivo; puedes revisar el resultado y reintentar explícitamente.';
            }

            try {
                await persistState('complete');
                if (!isCurrentRequest()) return;
            } catch (storageError) {
                localPersistenceWarning += ' No se pudo confirmar el guardado local del resultado de inventario: ' +
                    storageError.message;
            }
            updateSummary(inventoryMessage + localPersistenceWarning);
        } finally {
            isRunning = false;
            isDriveAuditRunning = false;
            if (isCurrentRequest()) updateControls();
        }
    };

    const organizeUnusedImages = async () => {
        if (!isCurrentRequest() || !complete || inventoryStatus !== 'saved' ||
            !inventoryAuditId || !inventoryOperationId || !inventoryConfirmedFileIds.length ||
            isRunning || isDriveAuditRunning) return;
        const fileIds = Array.from(new Set(inventoryConfirmedFileIds));
        if (typeof window.confirm !== 'function' || !window.confirm(
            '¿Deseas mover ' + fileIds.length + ' imágenes confirmadas a «Imagenes_Sin_Uso»? ' +
            'Esta acción mueve archivos de Google Drive, pero no los elimina. Las ubicaciones marcadas como manuales se conservarán.'
        )) return;

        isRunning = true; isDriveAuditRunning = true; updateControls();
        let movedCount = 0, alreadyOrganizedCount = 0, manualPreservedCount = 0;
        let failedCount = 0, blockedCount = 0, loggingErrorCount = 0;
        const batchSize = 20;
        try {
            for (let offset = 0; offset < fileIds.length; offset += batchSize) {
                const batch = fileIds.slice(offset, offset + batchSize).map(fileId => ({ fileId: fileId }));
                const result = await routeAction('saveUnusedImagesInventory', {
                    ...getDeveloperSessionPayload(), mode: 'organize', confirmed: true,
                    auditId: inventoryAuditId, inventoryOperationId: inventoryOperationId, files: batch
                });
                if (!isCurrentRequest()) return;
                if (!result || result.status !== 'success') {
                    throw new Error(result && result.message ? result.message : 'ADMIN no confirmó el lote de movimiento.');
                }
                movedCount += Math.max(0, Number(result.movedCount) || 0);
                alreadyOrganizedCount += Math.max(0, Number(result.alreadyOrganizedCount) || 0);
                manualPreservedCount += Math.max(0, Number(result.manualPreservedCount) || 0);
                failedCount += Math.max(0, Number(result.failedCount) || 0);
                blockedCount += Math.max(0, Number(result.blockedCount) || 0);
                loggingErrorCount += Math.max(0, Number(result.loggingErrorCount) || 0);
                inventoryMessage = 'Organización explícita en progreso: ' + movedCount + ' movidas, ' +
                    alreadyOrganizedCount + ' ya organizadas, ' + manualPreservedCount +
                    ' ubicaciones manuales conservadas, ' + failedCount + ' fallidas y ' + blockedCount + ' bloqueadas.';
                await persistState('complete');
            }
            const completed = movedCount + alreadyOrganizedCount + manualPreservedCount === fileIds.length &&
                failedCount === 0 && blockedCount === 0 && loggingErrorCount === 0;
            inventoryStatus = completed ? 'organized' : 'saved';
            inventoryMessage = 'Organización explícita ' + (completed ? 'completada' : 'parcial') + ': ' +
                movedCount + ' movidas, ' + alreadyOrganizedCount + ' ya organizadas, ' +
                manualPreservedCount + ' ubicaciones manuales conservadas, ' + failedCount +
                ' fallidas, ' + blockedCount + ' bloqueadas y ' + loggingErrorCount + ' errores de registro.';
        } catch (organizationError) {
            if (!isCurrentRequest()) return;
            inventoryStatus = 'saved';
            inventoryMessage = 'La organización se detuvo sin repetir movimientos confirmados: ' +
                organizationError.message + '. Puedes revisar el inventario y volver a intentar los elementos elegibles.';
        } finally {
            if (isCurrentRequest()) {
                try { await persistState('complete'); }
                catch (storageError) { inventoryMessage += ' No se pudo guardar localmente el resultado: ' + storageError.message; }
                updateSummary(inventoryMessage);
            }
            isRunning = false;
            isDriveAuditRunning = false;
            if (isCurrentRequest()) updateControls();
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
        const canSaveInventory = complete && inventoryStatus !== 'saved' && inventoryStatus !== 'organized' &&
            allFiles.some(file => file.classification === 'Sin uso detectado');
        if (saveInventoryButton) {
            saveInventoryButton.hidden = !canSaveInventory;
            saveInventoryButton.disabled = isRunning || isDriveAuditRunning || !canSaveInventory;
        }
        const canOrganize = complete && inventoryStatus === 'saved' &&
            !!inventoryAuditId && !!inventoryOperationId && inventoryConfirmedFileIds.length > 0;
        if (organizeButton) {
            organizeButton.hidden = !canOrganize;
            organizeButton.disabled = isRunning || isDriveAuditRunning || !canOrganize;
        }
        if (reconcileButton) {
            reconcileButton.hidden = !complete;
            reconcileButton.disabled = isRunning || isDriveAuditRunning || isReconciling || !complete;
        }
    };

    const restoreState = (state) => {
        if (!isCurrentRequest()) return;
        allFiles.length = 0;
        seenFileIds.clear();
        renderedFileIds.clear();
        uiDuplicateFileCount = 0;
        if (Array.isArray(state.files)) state.files.forEach(file => {
            const fileId = String(file && file.fileId || '').trim();
            if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId) || seenFileIds.has(fileId)) {
                if (fileId) uiDuplicateFileCount++;
                return;
            }
            seenFileIds.add(fileId);
            allFiles.push(file);
        });
        cursor = state.cursor || null;
        complete = state.complete === true;
        totalDiscovered = Math.max(0, Number(state.totalDiscovered) || allFiles.length);
        totalAnalyzed = Math.max(0, Number(state.totalAnalyzed) || allFiles.length);
        foldersVisited = Math.max(1, Number(state.foldersVisited) || 1);
        pendingFolderCount = Math.max(0, Number(state.pendingFolderCount) || (cursor && Array.isArray(cursor.stack) ? cursor.stack.length : 0));
        errorCount = Math.max(0, Number(state.errorCount) || 0);
        duplicateFileCount = Math.max(0, Number(state.duplicateFileCount) || 0);
        duplicateFolderCount = Math.max(0, Number(state.duplicateFolderCount) || 0);
        lastScanAt = Math.max(0, Number(state.lastScanAt) || 0);
        serviceVersion = String(state.serviceVersion || '');
        batches = Math.max(0, Number(state.batches) || 0);
        lastBatchAnalyzed = Math.max(0, Number(state.lastBatchAnalyzed) || 0);
        unverifiableReferences = Math.max(0, Number(state.unverifiableReferences) || 0);
        rootFolderName = state.rootFolderName || 'Cortes';
        rootFolderId = state.rootFolderId || '';
        resumeUnavailable = state.resumeUnavailable === true;
        inventoryStatus = state.inventoryStatus || '';
        inventoryMessage = state.inventoryMessage || '';
        inventoryAuditId = String(state.inventoryAuditId || '');
        inventoryOperationId = String(state.inventoryOperationId || '');
        auditId = String(state.serverAuditId || (state.cursor && state.cursor.referenceCacheId) || state.inventoryAuditId || '');
        auditStartedAt = Math.max(0, Number(state.createdAt) || Number(state.lastScanAt) || Date.now());
        localStateRevision = Math.max(0, Number(state.revision) || 0);
        localPageCount = Math.max(0, Number(state.pageCount) || 0);
        pendingBatchIndex = null;
        pendingBatchFiles = [];
        inventoryConfirmedFileIds = Array.isArray(state.inventoryConfirmedFileIds)
            ? Array.from(new Set(state.inventoryConfirmedFileIds.map(id => String(id || '')).filter(id => /^[a-zA-Z0-9_-]{20,}$/.test(id))))
            : [];
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
                seenFileIds.clear();
                renderedFileIds.clear();
                container.innerHTML = '';
                cursor = null;
                complete = false;
                totalDiscovered = 0;
                totalAnalyzed = 0;
                foldersVisited = 1;
                pendingFolderCount = 1;
                errorCount = 0;
                duplicateFileCount = 0;
                duplicateFolderCount = 0;
                uiDuplicateFileCount = 0;
                lastScanAt = 0;
                serviceVersion = '';
                batches = 0;
                lastBatchAnalyzed = 0;
                unverifiableReferences = 0;
                rootFolderName = 'Cortes';
                rootFolderId = '';
                resumeUnavailable = false;
                inventoryStatus = '';
                inventoryMessage = '';
                inventoryAuditId = '';
                inventoryOperationId = '';
                inventoryConfirmedFileIds = [];
                auditId = '';
                auditStartedAt = Date.now();
                localStateRevision = 0;
                localPageCount = 0;
                pendingBatchIndex = null;
                pendingBatchFiles = [];
                savedState = null;
                updateSummary('Preparando una auditoría nueva...');
            }

            const getCursorPositionSignature = value => JSON.stringify({
                stack: value.stack, referenceCacheId: value.referenceCacheId, scanVersion: value.scanVersion
            });
            const seenCursorSignatures = new Set();
            if (cursor) seenCursorSignatures.add(getCursorPositionSignature(cursor));

            while (!complete && isCurrentRequest()) {
                const previousTotal = totalAnalyzed;
                const previousFolders = foldersVisited;
                const requestCursor = cursor ? JSON.parse(JSON.stringify(cursor)) : null;
                const requestPayload = { ...getDeveloperSessionPayload(), cursor: requestCursor };
                const response = await routeActionWithRetry('auditDriveImagesInCortes', requestPayload, {
                    timeoutMs: 45000, maxAttempts: cursor ? 3 : 1, retryDelayMs: 500,
                    shouldContinue: isCurrentRequest
                });
                if (!isCurrentRequest()) return;

                if (!response || response.status !== 'success' || !Array.isArray(response.files)) {
                    throw new Error(response && response.message ? response.message : 'Respuesta inválida del servicio de auditoría.');
                }
                const responseAuditId = String(response.auditId || '').trim();
                if (!/^[0-9a-f-]{36}$/i.test(responseAuditId) ||
                    (auditId && auditId !== responseAuditId) ||
                    (cursor && cursor.referenceCacheId && String(cursor.referenceCacheId) !== responseAuditId)) {
                    throw new Error('ADMIN devolvió un auditId inválido o distinto al de la auditoría reanudada.');
                }
                auditId = responseAuditId;

                const responseBatchIds = new Set();
                const uniqueResponseFiles = [];
                let duplicateFilesInResponse = 0;
                response.files.forEach(file => {
                    const fileId = String(file && file.fileId || '').trim();
                    if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) throw new Error('ADMIN devolvió un archivo sin un ID de Drive verificable.');
                    if (seenFileIds.has(fileId) || responseBatchIds.has(fileId)) { duplicateFilesInResponse++; return; }
                    responseBatchIds.add(fileId);
                    uniqueResponseFiles.push(file);
                });
                const batchSize = uniqueResponseFiles.length;
                const expectedTotal = allFiles.length + batchSize;
                const reportedBatch = Number(response.batchAnalyzed);
                const reportedTotal = Number(response.totalAnalyzed);
                const reportedDiscovered = Number(response.totalDiscovered);
                if (!Number.isInteger(reportedBatch) || reportedBatch !== batchSize) throw new Error('El contador batchAnalyzed no coincide con los archivos únicos recibidos.');
                if (!Number.isInteger(reportedTotal) || reportedTotal !== expectedTotal ||
                    !Number.isInteger(reportedDiscovered) || reportedDiscovered !== expectedTotal) {
                    throw new Error('Los totales acumulados de ADMIN no coinciden con los IDs únicos recibidos (' + expectedTotal + ').');
                }
                if (response.serverCompletionVerified !== response.complete ||
                    String(response.serviceVersion || '') !== '2.6.1' ||
                    !Number.isFinite(Number(response.serverTimestamp)) ||
                    !Number.isInteger(Number(response.pendingFolderCount)) ||
                    Number(response.pendingFolderCount) !== (response.cursor && Array.isArray(response.cursor.stack) ? response.cursor.stack.length : 0)) {
                    throw new Error('ADMIN devolvió metadatos de finalización, versión o progreso incompletos.');
                }
                if (typeof response.complete !== 'boolean') {
                    throw new Error('ADMIN no devolvió un indicador booleano válido de finalización de la auditoría.');
                }

                uniqueResponseFiles.forEach(file => seenFileIds.add(String(file.fileId)));
                allFiles.push(...uniqueResponseFiles);
                batches++;
                pendingBatchIndex = localPageCount;
                pendingBatchFiles = uniqueResponseFiles.slice();
                lastBatchAnalyzed = batchSize;
                totalDiscovered = reportedDiscovered;
                totalAnalyzed = reportedTotal;
                foldersVisited = Math.max(1, Number(response.foldersVisited) || 1);
                pendingFolderCount = Number(response.pendingFolderCount);
                errorCount = Math.max(0, Number(response.errorCount) || 0);
                duplicateFileCount = Math.max(0, Number(response.duplicateFileCount) || 0);
                duplicateFolderCount = Math.max(0, Number(response.duplicateFolderCount) || 0);
                uiDuplicateFileCount += duplicateFilesInResponse;
                lastScanAt = Number(response.serverTimestamp);
                serviceVersion = String(response.serviceVersion);
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
                    const signature = getCursorPositionSignature(cursor);
                    if (seenCursorSignatures.has(signature) &&
                        totalAnalyzed === previousTotal && foldersVisited <= previousFolders) {
                        throw new Error('El cursor de Drive se repitió sin aumentar los archivos analizados ni las carpetas recorridas.');
                    }
                    seenCursorSignatures.add(signature);
                }

                appendFiles(uniqueResponseFiles);
                updateSummary(complete
                    ? 'Recorrido del árbol finalizado. Verificando el inventario...'
                    : 'Auditoría en progreso: ' + totalAnalyzed + ' archivos analizados; lote actual: ' + batchSize + '.');

                await persistState(complete ? 'complete' : 'running');
                if (!isCurrentRequest()) return;
            }

            if (!allFiles.some(file => file.classification === 'Histórica' || file.classification === 'Sin uso detectado')) {
                container.textContent = 'No se encontraron imágenes sin uso confirmadas en el árbol «Cortes».';
            }
            const hasUnusedImages = allFiles.some(file => file.classification === 'Sin uso detectado');
            inventoryStatus = hasUnusedImages ? 'not_saved' : 'saved';
            inventoryMessage = hasUnusedImages
                ? 'Auditoría completa. El inventario no se ha escrito en Spreadsheet. Usa «Registrar inventario» solo si deseas guardar estas imágenes.'
                : 'Auditoría completa. No se encontraron imágenes sin uso; no se escribió inventario en Spreadsheet.';
            await persistState('complete');
            if (!isCurrentRequest()) return;
            updateSummary(inventoryMessage);
        } catch (error) {
            if (!isCurrentRequest()) return;
            const errorMessage = error && error.message ? error.message : String(error);
            const cursorExpired = !complete &&
                /estado temporal.*(expir|disponible)|falta un bloque|estado temporal.*incompleto|otra versión del servicio|inicia una auditoría nueva|respuesta de este lote expiró/i.test(errorMessage);
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
            isRunning = false;
            isDriveAuditRunning = false;
            if (isCurrentRequest()) updateControls();
        }
    };

    if (startButton) startButton.onclick = () => runAudit(false);
    if (resumeButton) resumeButton.onclick = () => runAudit(true);

    const renderCortesReconciliationReport_ = report => {
        if (!reconciliationPanel || !reconciliationCounts || !reconciliationResults) return;
        reconciliationPanel.hidden = false;
        reconciliationCounts.replaceChildren();
        reconciliationResults.replaceChildren();
        const labels = {
            matched: "Coincidencia exacta", already_linked: "Ya vinculada", historical: "Ya registrada en historial", orphaned: "Sin correspondencia",
            ambiguous: "Ambigua", occupied: "Destino ocupado", referenced_elsewhere: "Referenciada en otra ubicación",
            access_restricted: "Acceso no público", unverifiable: "No verificable", invalid: "Archivo inválido"
        };
        Object.keys(labels).forEach(key => {
            const count = Number(report.counts && report.counts[key]) || 0;
            if (!count) return;
            const chip = document.createElement("span");
            chip.className = "audit-reconciliation-count";
            chip.textContent = labels[key] + ": " + count;
            reconciliationCounts.appendChild(chip);
        });
        const rows = [];
        (report.results || []).forEach(item => rows.push(item));
        (report.invalidFiles || []).forEach(item => rows.push({ ...item, status: "invalid" }));
        const visibleRows = rows.slice(0, 500);
        visibleRows.forEach(item => {
            const row = document.createElement("article");
            row.className = "audit-reconciliation-row status-" + String(item.status || "invalid").replace(/[^a-z_]/g, "");
            const title = document.createElement("strong");
            title.textContent = String(item.fileName || item.fileId || "Archivo sin nombre");
            const detail = document.createElement("span");
            const target = item.target;
            detail.textContent = target
                ? "Vehículo " + target.vehicleId + " · Fila " + target.row + " · Campo " + target.field
                : (item.locations && item.locations.length ? item.locations.map(location => location.sheet + " · fila " + location.row + " · columna " + location.column).join("; ") : "");
            const status = document.createElement("span");
            status.className = "audit-reconciliation-status-label";
            status.textContent = labels[item.status] || String(item.status || "Sin estado");
            row.append(title, status);
            if (detail.textContent) row.appendChild(detail);
            if (item.reason) {
                const reason = document.createElement("span");
                reason.textContent = String(item.reason);
                row.appendChild(reason);
            }
            if (item.proposedUrl) {
                const url = document.createElement("code");
                url.textContent = "URL propuesta: " + item.proposedUrl;
                row.appendChild(url);
            }
            reconciliationResults.appendChild(row);
        });
        if (rows.length > visibleRows.length) {
            const note = document.createElement("p");
            note.textContent = "Se muestran " + visibleRows.length + " de " + rows.length + " resultados. El reporte completo permanece en memoria durante esta sesión.";
            reconciliationResults.appendChild(note);
        }
        if (report.rowIssues && report.rowIssues.length) {
            const issues = document.createElement("p");
            issues.textContent = "Filas que requieren revisión: " + report.rowIssues.length + ". No se generaron destinos para esas filas.";
            reconciliationResults.appendChild(issues);
        }
    };

    const runCortesReconciliation = async () => {
        if (!isCurrentRequest() || !complete || isReconciling || isRunning || isDriveAuditRunning) return;
        const imageFiles = allFiles.filter(file => String(file.mimeType || "").toLowerCase().startsWith("image/"));
        if (!imageFiles.length) {
            if (reconciliationPanel) reconciliationPanel.hidden = false;
            if (reconciliationStatus) reconciliationStatus.textContent = "La auditoría no encontró archivos de imagen para conciliar.";
            return;
        }
        isReconciling = true;
        isRunning = true;
        isDriveAuditRunning = true;
        if (reconciliationPanel) reconciliationPanel.hidden = false;
        if (reconciliationResults) reconciliationResults.replaceChildren();
        if (reconciliationCounts) reconciliationCounts.replaceChildren();
        if (reconciliationStatus) reconciliationStatus.textContent = "Preparando simulación de " + imageFiles.length + " imágenes…";
        updateControls();
        const aggregate = {
            results: [], invalidFiles: [], rowIssues: [], counts: {
                matched: 0, already_linked: 0, orphaned: 0, ambiguous: 0, occupied: 0,
                referenced_elsewhere: 0, historical: 0, access_restricted: 0, unverifiable: 0, invalid: 0
            }
        };
        let sourceDigest = "", referenceCheckStatus = "";
        try {
            const batchSize = 25;
            const totalBatches = Math.ceil(imageFiles.length / batchSize);
            for (let offset = 0, batchIndex = 0; offset < imageFiles.length; offset += batchSize, batchIndex++) {
                if (!isCurrentRequest()) return;
                const batch = imageFiles.slice(offset, offset + batchSize).map(file => ({
                    fileId: String(file.fileId || ""), fileName: String(file.fileName || "")
                }));
                const response = await routeActionWithRetry("previewCortesImageReconciliation", {
                    ...getDeveloperSessionPayload(), files: batch
                }, {
                    timeoutMs: 45000, maxAttempts: 3, retryDelayMs: 500,
                    shouldContinue: isCurrentRequest
                });
                if (!isCurrentRequest()) return;
                if (!response || response.writePerformed !== false ||
                    !/^[a-f0-9]{64}$/i.test(String(response.manifestDigest || "")) ||
                    !Array.isArray(response.results) || !Array.isArray(response.invalidFiles)) {
                    throw new Error("ADMIN devolvió un reporte de conciliación incompleto o no verificable.");
                }
                if (sourceDigest && sourceDigest !== response.manifestDigest) {
                    throw new Error("Los datos de Cortes o sus referencias cambiaron durante la simulación. No se combinaron lotes; vuelve a ejecutar la auditoría.");
                }
                sourceDigest = response.manifestDigest;
                if (referenceCheckStatus && referenceCheckStatus !== response.referenceCheckStatus) {
                    throw new Error("El estado de verificación de referencias cambió entre lotes.");
                }
                referenceCheckStatus = String(response.referenceCheckStatus || "unavailable");
                aggregate.results.push(...response.results);
                aggregate.invalidFiles.push(...response.invalidFiles);
                if (!batchIndex) aggregate.rowIssues = Array.isArray(response.rowIssues) ? response.rowIssues : [];
                Object.keys(aggregate.counts).forEach(key => {
                    aggregate.counts[key] += Number(response.counts && response.counts[key]) || 0;
                });
                if (reconciliationStatus) reconciliationStatus.textContent =
                    "Simulando lote " + (batchIndex + 1) + " de " + totalBatches + " · " +
                    Math.min(offset + batch.length, imageFiles.length) + " de " + imageFiles.length + " imágenes. Sin escrituras.";
            }
            // Un nombre canónico duplicado puede caer en lotes distintos; nunca se elige uno automáticamente.
            const canonicalGroups = new Map();
            aggregate.results.forEach(item => {
                const key = String(item.fileName || "").replace(/\.[^.]+$/, "").trim().toLowerCase();
                if (!key) return;
                if (!canonicalGroups.has(key)) canonicalGroups.set(key, []);
                canonicalGroups.get(key).push(item);
            });
            canonicalGroups.forEach(group => {
                if (group.length < 2) return;
                group.forEach(item => {
                    item.status = "ambiguous";
                    item.target = null;
                    delete item.proposedUrl;
                    item.reason = "Hay varios archivos con el mismo nombre canónico en el árbol Drive; no se seleccionó ninguno automáticamente.";
                });
            });
            Object.keys(aggregate.counts).forEach(key => { aggregate.counts[key] = 0; });
            aggregate.results.forEach(item => {
                const status = String(item.status || "");
                if (Object.prototype.hasOwnProperty.call(aggregate.counts, status)) aggregate.counts[status]++;
            });
            aggregate.counts.invalid = aggregate.invalidFiles.length;
            aggregate.manifestDigest = sourceDigest;
            aggregate.referenceCheckStatus = referenceCheckStatus;
            renderCortesReconciliationReport_(aggregate);
            if (reconciliationStatus) reconciliationStatus.textContent =
                "Simulación terminada. " + aggregate.counts.matched + " coincidencias exactas propuestas; referencias: " + referenceCheckStatus + ". No se modificó Spreadsheet, Drive ni permisos."
        } catch (error) {
            if (!isCurrentRequest()) return;
            if (reconciliationStatus) reconciliationStatus.textContent =
                "La simulación se detuvo sin realizar escrituras: " + String(error && error.message || error);
        } finally {
            // La sesión o el modal pueden cambiar mientras la petición está pendiente.
            // El flag global debe liberarse aunque la vista ya no sea la actual.
            isReconciling = false;
            isRunning = false;
            isDriveAuditRunning = false;
            if (isCurrentRequest()) updateControls();
        }
    };

    if (saveInventoryButton) saveInventoryButton.onclick = () => saveUnusedInventory();
    if (organizeButton) organizeButton.onclick = () => organizeUnusedImages();
    if (reconcileButton) reconcileButton.onclick = () => runCortesReconciliation();

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
        } else if (complete && inventoryStatus !== 'saved' && inventoryStatus !== 'organized') {
            const pendingCount = allFiles.filter(file => file.classification === 'Sin uso detectado').length;
            updateSummary(pendingCount
                ? 'Auditoría completa recuperada. ' + pendingCount + ' imágenes están pendientes de registro explícito; no se ha escrito en Spreadsheet.'
                : 'Auditoría completa recuperada. No hay imágenes sin uso para registrar.');
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
    const modal = document.getElementById('terms-agreement-modal');
    const termsNotice = document.getElementById('terms-modal');
    // El acuerdo abierto desde el aviso es una capa hija y debe quedar visualmente encima.
    modal.style.zIndex = termsNotice && termsNotice.style.display === 'flex' ? '3200' : '';
    modal.style.display = 'flex';
    activateLegalModalFocus_(modal, {
        initialFocus: modal.querySelector('#terms-agreement-title'),
        allowEscape: true,
        close: () => {
            const overlayId = modal.dataset.gpOverlayHistoryId;
            const historyManager = window.overlayHistory;
            if (overlayId && historyManager && historyManager.has(overlayId)) historyManager.close(overlayId);
            else modal.style.display = 'none';
        }
    });
});

export function renderInboxList(items) {
    const listContainer = document.getElementById('inbox-list');
    if (!listContainer) return;
    const context = getUiSessionContext_();
    const generation = inboxViewGeneration_;
    const isCurrentInboxView = () => Boolean(context &&
        generation === inboxViewGeneration_ &&
        isCurrentUiSessionContext_(context) &&
        ['desarrollador', 'jefe', 'supervisor'].includes(context.role));
    if (!isCurrentInboxView()) {
        listContainer.replaceChildren();
        const detail = document.getElementById('inbox-detail');
        if (detail) detail.replaceChildren();
        return;
    }

    listContainer.replaceChildren();
    if (!items.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No hay mensajes.';
        listContainer.appendChild(emptyMessage);
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inbox-item';
        if (item.isResolved) itemDiv.classList.add('resolved');
        if (item.reply) itemDiv.classList.add('replied');

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
            const statusText = item.approvalStatus === 'approved' ? 'Aprobado' :
                (item.approvalStatus === 'rejected' ? 'Rechazado' : 'Pendiente de aprobación');
            tipoLabel = `Vídeo: ${statusText}`;
        }

        const icon = document.createElement('i');
        icon.className = `fa-solid ${iconClass}`;
        const itemContent = document.createElement('div');
        itemContent.className = 'inbox-item-content';
        const title = document.createElement('strong');
        title.className = 'inbox-item-title';
        title.textContent = String(item.subject || `ID: ${item.id || ''}`);
        const type = document.createElement('p');
        type.className = 'inbox-item-type';
        type.textContent = tipoLabel;
        itemContent.append(title, type);
        itemDiv.append(icon, itemContent);

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
        ['desarrollador', 'jefe', 'supervisor'].includes(context.role));
    if (!detailContainer) return;
    if (!isCurrentInboxDetail()) {
        detailContainer.replaceChildren();
        return;
    }

    const { currentUser, catalogData } = getState();
    const userName = currentUser ? (currentUser.Nombre_Completo || currentUser.Nombre_Usuario) : 'Usuario';
    let vehicleLabel = item.vehicleId ? `ID: ${String(item.vehicleId)}` : '';
    if (item.vehicleId && catalogData && catalogData.cortes) {
        const vehicle = catalogData.cortes.find(c => String(c.id) === String(item.vehicleId));
        if (vehicle) vehicleLabel = `${vehicle.marca} ${vehicle.modelo} (${vehicle.anoDesde})`;
    }

    const isVideoItem = item.type === 'video_approval';
    const userRole = context.role;
    const canApprove = canApproveInboxVideo_(userRole);
    const reportMetadata = item.type === 'problem_report' && item.reportMetadata ? item.reportMetadata : null;
    const suggestionData = item.type === 'problem_report' && item.suggestionData ? item.suggestionData : null;
    const proposedValues = suggestionData && suggestionData.proposedValues ? suggestionData.proposedValues : {};
    const proposedTestigoLabel = proposedValues.activaTestigo === true
        ? 'Sí: el corte activa el testigo del motor.'
        : (proposedValues.activaTestigo === false ? 'No: el corte no activa el testigo del motor.' : 'No aplica / no especificado.');

    const makeElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = String(text);
        return element;
    };
    const appendLabeledValue = (parent, label, value, style) => {
        const paragraph = makeElement('p');
        if (style) paragraph.style.cssText = style;
        const strong = makeElement('strong', '', label + ': ');
        paragraph.append(strong, document.createTextNode(String(value)));
        parent.appendChild(paragraph);
        return paragraph;
    };
    const makePanel = (margin) => {
        const panel = makeElement('div');
        panel.style.cssText = `margin:${margin}; padding:10px; background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #ddd); border-radius:6px;`;
        return panel;
    };
    const makeIcon = (className) => makeElement('i', className);

    detailContainer.replaceChildren();

    const heading = makeElement('h3', 'inbox-detail-title', item.subject || '');
    const sender = makeElement('p', 'inbox-detail-meta');
    sender.append(makeElement('strong', '', 'De: '), document.createTextNode(String(item.user || '')));
    detailContainer.append(heading, sender);

    if (item.vehicleId) {
        const vehicle = makeElement('p', 'inbox-detail-meta');
        vehicle.append(makeElement('strong', '', 'Vehículo: '), document.createTextNode(vehicleLabel));
        detailContainer.appendChild(vehicle);
    }

    if (reportMetadata) {
        const panel = makePanel('0 0 12px 0');
        appendLabeledValue(panel, 'Identificador del reporte', reportMetadata.reportId || '');
        appendLabeledValue(panel, 'Corte reportado', '#' + String(Number(reportMetadata.corteIndex)), 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Testigo del motor',
            reportMetadata.activaTestigoMotor === true
                ? 'El técnico confirma que este corte activa el testigo del motor.'
                : 'No confirmado en este reporte.', 'margin:0;');
        const imageFileId = String(reportMetadata.imageFileId || '');
        const imageUrl = String(reportMetadata.imageUrl || '');
        const expectedImageUrl = imageFileId ? 'https://drive.google.com/file/d/' + imageFileId + '/view' : '';
        if (/^[A-Za-z0-9_-]{10,}$/.test(imageFileId) && imageUrl === expectedImageUrl) {
            const imageParagraph = makeElement('p');
            imageParagraph.style.margin = '6px 0 0 0';
            const imageLink = makeElement('a', '', 'Ver imagen adjunta');
            imageLink.href = imageUrl; imageLink.target = '_blank'; imageLink.rel = 'noopener noreferrer';
            imageParagraph.append(makeElement('strong', '', 'Evidencia: '), imageLink);
            if (reportMetadata.imageName) imageParagraph.append(document.createTextNode(' (' + String(reportMetadata.imageName) + ')'));
            panel.appendChild(imageParagraph);
        }
        detailContainer.appendChild(panel);
    }

    if (suggestionData) {
        const panel = makePanel('0 0 12px 0');
        panel.appendChild(makeElement('strong', '', 'Revisión de sugerencia de corte'));
        appendLabeledValue(panel, 'Reporte relacionado', suggestionData.reportId || 'No especificado', 'margin:6px 0 4px 0;');
        appendLabeledValue(panel, 'Corte', '#' + String(Number(suggestionData.corteIndex)), 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Tipo propuesto', proposedValues.tipo || 'No especificado', 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Ubicación propuesta', proposedValues.ubicacion || 'No especificada', 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Color de cable propuesto', proposedValues.colorCable || 'No especificado', 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Configuración de relay propuesta', proposedValues.configRelay || 'No especificada', 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Testigo del motor propuesto', proposedTestigoLabel, 'margin:0 0 4px 0;');
        appendLabeledValue(panel, 'Estado', suggestionData.status || 'pendiente_revision', 'margin:0 0 4px 0;');

        const imageUrl = String(suggestionData.imageUrl || '');
        if (/^https:\/\/drive\.google\.com\//i.test(imageUrl)) {
            const imageParagraph = makeElement('p');
            imageParagraph.style.margin = '0';
            const imageLink = makeElement('a', '', 'Ver imagen de referencia');
            imageLink.href = imageUrl;
            imageLink.target = '_blank';
            imageLink.rel = 'noopener noreferrer';
            imageParagraph.append(makeElement('strong', '', 'Imagen: '), imageLink);
            panel.appendChild(imageParagraph);
        }
        detailContainer.appendChild(panel);
    }

    if (isVideoItem && item.videoUrl) {
        const rawVideoUrl = String(item.videoUrl);
        let safeVideoUrl = '';
        try {
            const parsedVideoUrl = new URL(rawVideoUrl);
            if (parsedVideoUrl.protocol === 'https:' &&
                ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(parsedVideoUrl.hostname.toLowerCase())) {
                safeVideoUrl = parsedVideoUrl.href;
            }
        } catch (_) {}
        const panel = makePanel('0 0 12px 0');
        const videoParagraph = makeElement('p');
        videoParagraph.style.margin = '0 0 6px 0';
        videoParagraph.append(makeElement('strong', '', 'Enlace de YouTube: '));
        if (safeVideoUrl) {
            const videoLink = makeElement('a', '', 'Ver vídeo en YouTube');
            videoLink.href = safeVideoUrl;
            videoLink.target = '_blank';
            videoLink.rel = 'noopener noreferrer';
            videoLink.style.cssText = 'color:#007bff; text-decoration:underline;';
            videoParagraph.appendChild(videoLink);
        } else {
            videoParagraph.appendChild(document.createTextNode('Enlace no válido'));
        }
        panel.appendChild(videoParagraph);

        const statusParagraph = makeElement('p');
        statusParagraph.style.cssText = 'margin:0 0 4px 0; font-size:0.85rem;';
        const statusBadge = makeElement('span', 'badge', item.approvalStatus || 'pending');
        const statusColors = { approved: '#28a745', rejected: '#dc3545', pending: '#ffc107' };
        statusBadge.style.cssText = `background:${statusColors[item.approvalStatus] || statusColors.pending}; color:#fff; padding:2px 8px; border-radius:4px;`;
        statusParagraph.append(makeElement('strong', '', 'Estado de Aprobación: '), statusBadge);
        panel.appendChild(statusParagraph);
        if (item.contentType) {
            const contentType = makeElement('p');
            contentType.style.cssText = 'margin:0; font-size:0.85rem;';
            contentType.append(makeElement('strong', '', 'Tipo de Contenido: '), document.createTextNode(String(item.contentType)));
            panel.appendChild(contentType);
        }
        detailContainer.appendChild(panel);
    }

    const messagePanel = makeElement('div', 'inbox-message-content');
    messagePanel.style.cssText = 'background:var(--card-bg, #fdfdfd); padding:10px; border-radius:6px; border:1px solid var(--border-color, #eee); margin-bottom:12px;';
    const messageBody = makeElement('div');
    messageBody.textContent = String(item.content || '');
    messagePanel.appendChild(messageBody);
    detailContainer.appendChild(messagePanel);

    if (item.reply) {
        const replyPanel = makeElement('div', 'inbox-reply-content');
        replyPanel.style.cssText = 'background:var(--card-bg, #fdfdfd); padding:10px; border-radius:6px; border:1px solid var(--border-color, #eee); margin-bottom:12px;';
        replyPanel.append(makeElement('strong', '', 'Respuesta de ' + String(item.responder || 'Admin') + ':'));
        const replyBody = makeElement('div');
        replyBody.style.marginTop = '6px';
        replyBody.innerHTML = sanitizeHtmlContent(String(item.reply));
        replyPanel.appendChild(replyBody);
        detailContainer.appendChild(replyPanel);
    }

    if (isVideoItem) {
        const actions = makeElement('div', 'inbox-actions');
        actions.style.marginTop = '12px';
        if (item.approvalStatus === 'pending' && canApprove) {
            const approvalRow = makeElement('div');
            approvalRow.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;';
            const approveButton = makeElement('button', 'btn btn-primary');
            approveButton.id = 'inbox-approve-video-btn';
            approveButton.style.cssText = 'flex:1; background-color:#28a745; border-color:#28a745;';
            approveButton.append(makeIcon('fa-solid fa-check'), document.createTextNode(' Aprobar Vídeo'));
            const rejectButton = makeElement('button', 'btn btn-danger');
            rejectButton.id = 'inbox-reject-video-btn';
            rejectButton.style.cssText = 'flex:1; background-color:#dc3545; border-color:#dc3545;';
            rejectButton.append(makeIcon('fa-solid fa-xmark'), document.createTextNode(' Rechazar Vídeo'));
            approvalRow.append(approveButton, rejectButton);
            actions.appendChild(approvalRow);
        }
        const deleteRow = makeElement('div');
        deleteRow.style.cssText = 'display:flex; justify-content:flex-end;';
        const deleteButton = makeElement('button', 'btn btn-danger');
        deleteButton.id = 'inbox-delete-btn';
        deleteButton.style.cssText = 'background-color:#dc3545; color:white;';
        deleteButton.append(makeIcon('fa-solid fa-trash'), document.createTextNode(' Borrar Mensaje'));
        deleteRow.appendChild(deleteButton);
        actions.appendChild(deleteRow);
        detailContainer.appendChild(actions);
    } else {
        const actions = makeElement('div', 'inbox-actions');
        const toolbar = makeElement('div');
        toolbar.id = 'inbox-toolbar-container';
        const replyTextarea = makeElement('textarea');
        replyTextarea.id = 'inbox-reply-textarea';
        replyTextarea.placeholder = 'Escribe tu respuesta aquí...';
        const buttonRow = makeElement('div');
        buttonRow.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;';
        const replyButton = makeElement('button', 'btn btn-primary');
        replyButton.id = 'inbox-reply-btn';
        replyButton.style.flex = '1';
        replyButton.textContent = 'Enviar Respuesta';
        buttonRow.appendChild(replyButton);
        if (item.type === 'problem_report' && !item.isResolved) {
            const resolveButton = makeElement('button', 'resolve-btn btn btn-secondary');
            resolveButton.id = 'inbox-resolve-btn';
            resolveButton.textContent = 'Marcar como Resuelto';
            buttonRow.appendChild(resolveButton);
        }
        const deleteButton = makeElement('button', 'btn btn-danger');
        deleteButton.id = 'inbox-delete-btn';
        deleteButton.style.cssText = 'background-color:#dc3545; color:white;';
        deleteButton.append(makeIcon('fa-solid fa-trash'), document.createTextNode(' Borrar Mensaje'));
        buttonRow.appendChild(deleteButton);
        actions.append(toolbar, replyTextarea, buttonRow);
        detailContainer.appendChild(actions);
    }

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
                    invalidateInboxCache_(context);
                    mostrarNotificacion("Vídeo aprobado con éxito.", "success");
                    await syncApprovedVehicleVideoDetail_(item.videoMeta, {
                        notifyRefreshFailure: message => {
                            if (isCurrentInboxDetail()) mostrarNotificacion(message, "warning");
                        }
                    });
                    loadAndRenderInbox({ context, reset: true });
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
                    invalidateInboxCache_(context);
                    mostrarNotificacion("Vídeo rechazado.", "info");
                    loadAndRenderInbox({ context, reset: true });
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
                invalidateInboxCache_(context);
                if (!isCurrentInboxDetail()) return;
                loadAndRenderInbox({ context, reset: true });
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
                invalidateInboxCache_(context);
                loadAndRenderInbox({ context, reset: true });
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
                    invalidateInboxCache_(context);
                    mostrarNotificacion("Mensaje eliminado con éxito", "success");
                    loadAndRenderInbox({ context, reset: true });
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

export function getValidatedYouTubeVideoId(value) {
    if (typeof value !== "string") return null;
    const candidate = value.trim();
    if (!candidate) return null;

    // Se admiten IDs puros solo con el formato exacto de YouTube.
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) return candidate;

    let parsed;
    try {
        parsed = new URL(candidate);
    } catch (error) {
        return null;
    }

    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;
    const host = parsed.hostname.toLowerCase();
    const idPattern = "[A-Za-z0-9_-]{11}";
    let match = null;

    if (host === "youtu.be") {
        match = parsed.pathname.match(new RegExp("^/(" + idPattern + ")/?$"));
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
        if (parsed.pathname === "/watch") {
            const ids = parsed.searchParams.getAll("v");
            if (ids.length === 1 && new RegExp("^" + idPattern + "$").test(ids[0])) {
                return ids[0];
            }
            return null;
        }
        match = parsed.pathname.match(new RegExp("^/(?:embed|shorts|live)/(" + idPattern + ")/?$"));
    } else {
        return null;
    }

    return match ? match[1] : null;
}

export function getValidatedYouTubeVideoEmbedUrl(value) {
    const videoId = getValidatedYouTubeVideoId(value);
    return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : null;
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
            slideText.textContent = "";
            const slideLabel = document.createElement('strong');
            slideLabel.textContent = String(activeCable.label || "Cable");
            slideText.appendChild(slideLabel);
            slideText.appendChild(document.createTextNode(": "));
            const slideContent = document.createElement('span');
            slideContent.innerHTML = sanitizeHtmlContent(activeCable.content || "Sin descripción");
            slideText.appendChild(slideContent);

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

        // Soporte de gestos táctiles: solo se acepta un desplazamiento horizontal dominante.
        function createCableCarouselTouchHandlers(onSwipe, threshold = 50) {
            let touchStart = null;
            const interactiveSelector = 'button, a, input, textarea, select, option, label, [role="button"], [contenteditable="true"]';

            function resetTouch() {
                touchStart = null;
            }

            return {
                touchstart(event) {
                    resetTouch();
                    if (!event || !event.touches || event.touches.length !== 1 ||
                        !event.changedTouches || event.changedTouches.length !== 1) return;

                    const target = event.target;
                    if (target && typeof target.closest === 'function' && target.closest(interactiveSelector)) return;

                    const touch = event.changedTouches[0];
                    if (!Number.isFinite(touch.clientX) || !Number.isFinite(touch.clientY)) return;
                    touchStart = { x: touch.clientX, y: touch.clientY };
                },
                touchend(event) {
                    const start = touchStart;
                    resetTouch();
                    if (!start || !event || !event.touches || event.touches.length !== 0 ||
                        !event.changedTouches || event.changedTouches.length !== 1) return;

                    const touch = event.changedTouches[0];
                    if (!Number.isFinite(touch.clientX) || !Number.isFinite(touch.clientY)) return;

                    const deltaX = touch.clientX - start.x;
                    const deltaY = touch.clientY - start.y;
                    if (Math.abs(deltaX) <= threshold || Math.abs(deltaX) <= Math.abs(deltaY)) return;

                    onSwipe(deltaX < 0 ? 1 : -1);
                },
                touchcancel: resetTouch
            };
        }

        const cableTouchHandlers = createCableCarouselTouchHandlers((direction) => {
            updateSlide(currentSlideIndex + direction);
            adjustPanelHeight();
        });

        carouselContainer.addEventListener('touchstart', cableTouchHandlers.touchstart, { passive: true });
        carouselContainer.addEventListener('touchend', cableTouchHandlers.touchend, { passive: true });
        carouselContainer.addEventListener('touchcancel', cableTouchHandlers.touchcancel, { passive: true });

        updateSlide(0);
    } else {
        const activeContent = (sec.isCarousel && sec.cables && sec.cables.length === 1) ? sec.cables[0].content : sec.content;
        const activeImg = (sec.isCarousel && sec.cables && sec.cables.length === 1) ? sec.cables[0].img : sec.img;

        if (activeContent) {
            const contentP = document.createElement('p');
            contentP.innerHTML = sanitizeHtmlContent(activeContent);
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
        pendingModalViewRestore_ = null;
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
        if (modal) {
            modal.style.display = 'flex';
            activateLegalModalFocus_(modal, {
                initialFocus: modal.querySelector('#terms-modal-title'),
                allowEscape: false
            });
        }
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
        modal.style.display = 'none'; deactivateLegalModalFocus_(modal); button.disabled = false;
        if (errorMessage) errorMessage.textContent = '';
        container.style.display = 'block'; footer.style.display = 'flex'; return true;
    }
    container.style.display = 'none'; footer.style.display = 'none'; modal.style.display = 'flex';
    button.disabled = false;
    activateLegalModalFocus_(modal, { initialFocus: button, allowEscape: false });
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
            modal.style.display = 'none'; deactivateLegalModalFocus_(modal); container.style.display = 'block'; footer.style.display = 'flex';
            if (typeof window.auth?.loadInitialData === 'function') window.auth.loadInitialData();
        } catch (error) {
            const message = error && error.message ? error.message : 'No se pudo registrar la aceptación.';
            if (errorMessage) errorMessage.textContent = message.length > 110 ? 'No se pudo registrar la aceptación.' : message;
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

    const displayName = String(user && (user.Nombre_Completo || user.Nombre_Usuario || user.username || user.ID || user.id) || 'Usuario').trim();
    const menuUsername = document.getElementById('menu-username');
    if (menuUsername) menuUsername.textContent = displayName;
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) { welcomeMsg.textContent = `Hola, ${displayName || 'Usuario'}`; welcomeMsg.style.display = 'block'; }

    const devToolsBtn = document.getElementById('dev-tools-btn');
    const userRole = normalizeUiRole_(user && user.Privilegios);
    if (devToolsBtn) {
        devToolsBtn.style.display = userRole === 'desarrollador' ? 'flex' : 'none';
    }

    const inboxBtn = document.getElementById('inbox-btn');
    if (inboxBtn) {
        inboxBtn.style.display = ['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'].includes(userRole) ? 'flex' : 'none';
    }

    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.style.display = ['desarrollador', 'jefe', 'supervisor'].includes(userRole) ? 'flex' : 'none';
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
    return true;
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

const developerDiagnosticQueue_ = [];

function logDeveloperDiagnostic_(message, level = 'warning') {
    const entry = { message: String(message || ''), level: ['error', 'warning'].includes(level) ? level : 'info' };
    if (typeof window !== 'undefined' && typeof window.gpsepediaDeveloperLog === 'function') {
        window.gpsepediaDeveloperLog(entry.message, entry.level);
        return;
    }
    developerDiagnosticQueue_.push(entry);
    if (developerDiagnosticQueue_.length > 80) developerDiagnosticQueue_.shift();
}

export function showGlobalError(message) {
    const original = String(message || 'No se pudo completar la operación.');
    const concise = original.length > 110
        ? /AUTH|sesión|conexión|servidor/i.test(original)
            ? 'Conexión temporalmente no disponible.'
            : 'No se pudo completar la operación.'
        : original;
    if (original.length > 110) {
        console.warn('[GPSpedia] ' + original);
        logDeveloperDiagnostic_(original, 'warning');
    }
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = concise;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

/* TAREA 1: Alias y función unificada de notificación para Inbox y operaciones del sistema */
export function mostrarNotificacion(message, type = 'info') {
    return showGlobalNotification(message, type);
}

export function showGlobalNotification(message, type = 'info') {
    const original = String(message || 'No se pudo completar la operación.');
    const concise = original.length > 110 ? 'Operación completada con observaciones.' : original;
    if (original.length > 110) {
        console.warn('[GPSpedia] ' + original);
        logDeveloperDiagnostic_(original, type === 'error' ? 'error' : 'warning');
    }
    const toast = document.getElementById('notification-toast');
    if (!toast) {
        alert(concise);
        return;
    }
    toast.textContent = concise;
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

const SIDE_MENU_HISTORY_ID_ = 'side-menu';

export function openSideMenu() {
    const { currentUser } = getState();
    const menu = document.getElementById('side-menu');
    if (!menu) return;
    if (currentUser && (currentUser.Nombre_Completo || currentUser.Nombre_Usuario)) {
        document.getElementById('menu-username').textContent = currentUser.Nombre_Completo || currentUser.Nombre_Usuario;
    }
    if (menu.classList.contains('open')) return;
    menu.classList.add('open');
    document.getElementById('menu-overlay').classList.add('open');
    const historyManager = window.overlayHistory;
    if (historyManager && typeof historyManager.register === 'function') {
        if (!historyManager.has(SIDE_MENU_HISTORY_ID_)) {
            historyManager.register(SIDE_MENU_HISTORY_ID_, () => closeSideMenu(true));
        }
    } else if (window.history && window.history.pushState) {
        window.history.pushState({ sideMenuOpen: true }, '');
    }
}

export function closeSideMenu(isFromPopState = false) {
    const menu = document.getElementById('side-menu');
    const historyManager = window.overlayHistory;
    if (!isFromPopState && historyManager && historyManager.has(SIDE_MENU_HISTORY_ID_)) {
        historyManager.close(SIDE_MENU_HISTORY_ID_);
        return;
    }
    if (menu) menu.classList.remove('open');
    document.getElementById('menu-overlay')?.classList.remove('open');
    if (!isFromPopState && (!historyManager || !historyManager.has(SIDE_MENU_HISTORY_ID_)) &&
        window.history && window.history.state && window.history.state.sideMenuOpen) window.history.back();
}

export function closeSideMenuAndRun(callback) {
    const historyManager = window.overlayHistory;
    const menu = document.getElementById('side-menu');
    const runCallback = () => Promise.resolve()
        .then(() => typeof callback === 'function' ? callback() : undefined)
        .catch(error => {
            console.error('Error al navegar desde el menú:', error);
            showGlobalError('No se pudo abrir la vista seleccionada. Intenta nuevamente.');
        });
    if (!menu || !menu.classList.contains('open') || !historyManager || !historyManager.has(SIDE_MENU_HISTORY_ID_)) {
        closeSideMenu(true);
        return runCallback();
    }
    return new Promise(resolve => {
        let settled = false;
        let fallbackTimer = null;
        const finish = () => {
            if (settled) return;
            settled = true;
            if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
            window.removeEventListener('popstate', onPopState);
            if (historyManager.has(SIDE_MENU_HISTORY_ID_)) {
                historyManager.handlePopState({ __gpOverlayStack: [] });
                if (window.history && typeof window.history.replaceState === 'function') {
                    const currentHistoryState = window.history.state && typeof window.history.state === 'object'
                        ? window.history.state
                        : {};
                    window.history.replaceState({
                        ...currentHistoryState,
                        __gpOverlayStack: historyManager.getStack()
                    }, '');
                }
            }
            if (menu && menu.classList.contains('open')) closeSideMenu(true);
            runCallback().then(resolve);
        };
        const onPopState = () => { if (!historyManager.has(SIDE_MENU_HISTORY_ID_)) finish(); };
        window.addEventListener('popstate', onPopState);
        fallbackTimer = window.setTimeout(finish, 500);
        if (!historyManager.close(SIDE_MENU_HISTORY_ID_)) finish();
    });
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

    // Mantener el estado de la sección en memoria y en History API. Si el usuario
    // cambia de sección desde una vista profunda, el botón «Volver» debe regresar
    // a la sección real y no a un estado de catálogo que ya quedó atrás.
    const historyStateBefore = window.history && window.history.state || {};
    const previousNavigationState = pickNavigationState(historyStateBefore) ||
        pickNavigationState(getState().navigationState);
    if (!isFromPopState && window.history && window.history.pushState) {
        pushNavigationState({ section: sectionName }, { previousNavigationState });
    }
    const activeHistoryState = window.history && window.history.state || {};
    const parentNavigationState = pickNavigationState(activeHistoryState[navigationHistoryStateKey]) ||
        previousNavigationState;
    setState({ navigationState: { section: sectionName, previousState: parentNavigationState || null } });

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

    // El alta de tutoriales está reservada a usuarios Desarrollador.
    if (getUiSessionContext_()?.role === "desarrollador") {
        const createCard = document.createElement("div");
        createCard.className = "card card-create-tutorial";
        createCard.innerHTML = `
            <i class="fa-solid fa-plus" style="font-size:2rem; margin-bottom:6px;"></i>
            <span style="font-size:0.95rem;">Agregar Tutorial</span>
        `;
        createCard.onclick = () => openAddTutorialModal();
        grid.appendChild(createCard);
    }

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

    const userRole = getUiSessionContext_()?.role || null;
    const isDeveloper = userRole === "desarrollador";
    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;";
    const title = document.createElement("h2");
    title.textContent = item.Tema || "Tutorial";
    title.style.cssText = "color:#007bff; margin:0; flex:1;";
    headerDiv.appendChild(title);

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = "display:flex; align-items:center; gap:8px;";
    if (isDeveloper) {
        if (inEditModeTutorial) {
            const resetBtn = document.createElement("button");
            resetBtn.textContent = "↩️";
            resetBtn.className = "share-modal-btn";
            resetBtn.title = "Descartar cambios";
            resetBtn.onclick = () => mostrarDetalleTutorialModal(item, false);
            controlsContainer.appendChild(resetBtn);

            const saveBtn = document.createElement("button");
            saveBtn.textContent = "✅";
            saveBtn.className = "share-modal-btn";
            saveBtn.title = "Guardar cambios";
            saveBtn.id = "btn-save-tutorial-edit";
            controlsContainer.appendChild(saveBtn);
        } else {
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
    closeBtn.className = "backBtn";
    closeBtn.style.cssText = "color:white; background:#dc3545; border:none; margin:0;";
    closeBtn.onclick = () => {
        if (window.history && window.history.state && window.history.state.modalOpen) window.history.back();
        else document.getElementById("modalDetalle").classList.remove("visible");
    };
    controlsContainer.appendChild(closeBtn);
    headerDiv.appendChild(controlsContainer);
    cont.appendChild(headerDiv);

    if (inEditModeTutorial) {
        const form = document.createElement("div");
        form.style.cssText = "display:flex; flex-direction:column; gap:10px; margin-top:10px;";
        const addField = (labelText, value, options = {}) => {
            const label = document.createElement("label");
            label.style.fontWeight = "bold";
            label.textContent = labelText;
            const field = options.multiline ? document.createElement("textarea") : document.createElement("input");
            if (!options.multiline) field.type = "text";
            field.maxLength = options.maxLength || 700;
            if (options.multiline) field.rows = 3;
            field.value = value || "";
            field.style.cssText = "padding:8px; border:1px solid var(--border-color, #007bff); border-radius:4px; width:100%; box-sizing:border-box;";
            form.append(label, field);
            return field;
        };
        const temaInput = addField("Tema / Título (máx. 30 caracteres)", item.Tema, { maxLength: 30 });
        const identificarInput = addField("Cómo identificarlo", item.comoIdentificarlo, { multiline: true });
        const encontrarInput = addField("Dónde encontrarlo", item.dondeEncontrarlo, { multiline: true });
        const detallesInput = addField("Detalles", item.Detalles || item.Descripcion, { multiline: true });
        detallesInput.id = "edit-tutorial-details-textarea";
        const detailsToolbar = createRichTextToolbar("edit-tutorial-details-textarea");
        form.insertBefore(detailsToolbar, detallesInput);

        const videoLabel = document.createElement("label");
        videoLabel.style.fontWeight = "bold";
        videoLabel.textContent = "Vídeo de YouTube (solo mediante aprobación)";
        const videoInput = document.createElement("input");
        videoInput.type = "url";
        videoInput.value = item.Video || "";
        videoInput.readOnly = true;
        videoInput.style.cssText = "padding:8px; border:1px solid var(--border-color, #007bff); border-radius:4px; width:100%; box-sizing:border-box;";
        form.append(videoLabel, videoInput);

        const uploadVideoBtn = document.createElement("button");
        uploadVideoBtn.type = "button";
        uploadVideoBtn.className = "btn btn-primary";
        uploadVideoBtn.textContent = item.Video ? "El tutorial ya tiene un vídeo" : "Solicitar subida de vídeo";
        uploadVideoBtn.disabled = Boolean(item.Video);
        uploadVideoBtn.onclick = () => openYouTubeUploadModal({
            initialTitle: item.Tema || "Tutorial técnico",
            initialDescription: item.Detalles || item.Descripcion || "",
            contentType: "tutorial",
            referenceId: item.ID || item.Tema,
            metadata: { tutorialId: item.ID || "", tema: item.Tema || "" },
            onSuccess: async () => {
                const fresh = await routeAction("getCatalogData");
                if (fresh && fresh.data) setState({ catalogData: fresh.data });
            }
        });
        form.appendChild(uploadVideoBtn);
        cont.appendChild(form);

        const saveBtn = controlsContainer.querySelector("#btn-save-tutorial-edit");
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const newTema = temaInput.value.trim();
                const newComo = identificarInput.value.trim();
                const newDonde = encontrarInput.value.trim();
                const newDetalles = detallesInput.value.trim();
                if (!newTema) { mostrarNotificacion("El tema no puede estar vacío.", "error"); return; }
                if (newTema.length > 30 || newComo.length > 700 || newDonde.length > 700 || newDetalles.length > 700) {
                    mostrarNotificacion("Revisa los límites de caracteres de los campos.", "error");
                    return;
                }
                saveBtn.disabled = true;
                showSavingIndicator("saving", "Guardando cambios...");
                try {
                    const res = await routeAction("updateTutorialItem", {
                        tutorialId: item.ID || "",
                        originalTema: item.Tema || "",
                        tema: newTema,
                        comoIdentificarlo: newComo,
                        dondeEncontrarlo: newDonde,
                        detalles: newDetalles,
                        ...getSessionPayload_()
                    });
                    if (!res || res.status !== "success") throw new Error((res && res.message) || "Error al actualizar");
                    item.Tema = newTema;
                    item.comoIdentificarlo = newComo;
                    item.dondeEncontrarlo = newDonde;
                    item.Detalles = newDetalles;
                    item.Descripcion = newDetalles;
                    showSavingIndicator("success", "Tutorial guardado");
                    mostrarNotificacion("Tutorial actualizado con éxito.", "success");
                    mostrarDetalleTutorialModal(item, false);
                } catch (err) {
                    console.error("Error guardando tutorial:", err);
                    showSavingIndicator("error", "Error al guardar");
                    mostrarNotificacion(err.message || "Error al guardar el tutorial", "error");
                    saveBtn.disabled = false;
                }
            };
        }
    } else {
        if (item.Imagen) {
            const image = document.createElement("img");
            image.alt = item.Tema || "Imagen del tutorial";
            image.loading = "lazy";
            image.style.cssText = "display:block; width:100%; max-height:320px; object-fit:contain; border-radius:8px; margin-bottom:12px;";
            setOptimizedImage(image, item.Imagen, IMG_SIZE_LARGE);
            cont.appendChild(image);
        }
        if (item.Video) {
            const videoContainer = document.createElement("div");
            const videoEmbedUrl = getYouTubeEmbedUrl(item.Video) || item.Video.replace("watch?v=", "embed/");
            videoContainer.innerHTML = `<iframe width="100%" height="315" src="${videoEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:8px;"></iframe>`;
            cont.appendChild(videoContainer);
        }

        [
            createDetailParagraph("Cómo Identificarlo", item.comoIdentificarlo),
            createDetailParagraph("Dónde Encontrarlo", item.dondeEncontrarlo),
            createDetailParagraph("Detalles", item.Detalles || item.Descripcion)
        ].forEach(detail => { if (detail) cont.appendChild(detail); });

        if (item.Colaborador) {
            const collaborator = createDetailParagraph("Colaborador", item.Colaborador);
            if (collaborator) cont.appendChild(collaborator);
        }
    }

    const modalDetalle = document.getElementById("modalDetalle");
    modalDetalle.dataset.modalType = "tutorial";
    modalDetalle.classList.add("visible");
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
        <h2 id="report-cut-heading"><i class="fa-solid fa-triangle-exclamation" style="color:#dc3545;"></i></h2>
        <p id="report-cut-summary" style="font-size:0.85em; color:var(--text-disabled); margin-bottom:15px;"></p>
        <form id="report-cut-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label>Descripción del Error Detectado *</label>
                <textarea id="rep-error" rows="3" maxlength="1500" placeholder="Describe claramente el problema o fallo detectado..." required></textarea>
            </div>
            <div class="form-group">
                <label for="rep-testigo-motor" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="rep-testigo-motor">
                    Este corte activa el testigo del motor
                </label>
            </div>
            <div class="form-group">
                <label>Información Incorrecta o Incompleta</label>
                <textarea id="rep-incorrecto" rows="2" maxlength="400" placeholder="Indica qué datos específicos considera erróneos o incompletos..."></textarea>
            </div>
            <div class="form-group">
                <label>Imagen de Referencia (Opcional)</label>
                <input type="file" id="rep-img-file" accept="image/jpeg,image/png,image/webp">
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">Enviar Reporte</button>
        </form>
    `;

    const heading = content.querySelector("#report-cut-heading");
    heading.appendChild(document.createTextNode(` Reportar Problema en Corte #${String(corteNum)}`));
    const summary = content.querySelector("#report-cut-summary");
    summary.append(
        document.createTextNode('Corte seleccionado: '),
        document.createElement('strong')
    );
    summary.querySelector('strong').textContent = String(currentCutData && currentCutData.tipo || 'Sin tipo definido');

    attachContextualHelp_(content, "tut-tema", "Usa un título breve que identifique el procedimiento o componente tratado.");
    attachContextualHelp_(content, "tut-como-identificarlo", "Describe señales visibles o características que permitan reconocer el componente antes de intervenir.");
    attachContextualHelp_(content, "tut-donde-encontrarlo", "Indica la ubicación dentro del vehículo y referencias de acceso que ayuden a encontrarlo.");
    attachContextualHelp_(content, "tut-desc", "Resume el procedimiento, las precauciones y los puntos que requieren atención.");
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

        const errorDesc = content.querySelector("#rep-error").value.trim();
        const incorrectInfo = content.querySelector("#rep-incorrecto").value.trim();
        if (!errorDesc) {
            showGlobalError("Describe el problema antes de enviar el reporte.");
            return;
        }
        let fullProblemText = `[Corte #${corteNum}] ${errorDesc}`;
        if (incorrectInfo) fullProblemText += ` | Info incorrecta: ${incorrectInfo}`;
        if (fullProblemText.length > 2000) {
            showGlobalError("La descripción completa del reporte no puede superar 2000 caracteres.");
            return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.classList.add("btn-loading");

        const fileInput = content.querySelector("#rep-img-file");
        try {
            let imageAttachment = null;
            const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            if (selectedFile) {
                const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
                const maxImageBytes = 3 * 1024 * 1024;
                const mimeType = String(selectedFile.type || "").toLowerCase();
                if (!allowedMimeTypes.includes(mimeType)) throw new Error("Formato no permitido. Utiliza JPG, PNG o WebP.");
                if (!Number.isFinite(selectedFile.size) || selectedFile.size < 1 || selectedFile.size > maxImageBytes) throw new Error("La imagen debe pesar como máximo 3 MB.");
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => typeof reader.result === "string" && reader.result.startsWith("data:")
                        ? resolve(reader.result) : reject(new Error("No se pudo leer el contenido de la imagen."));
                    reader.onerror = () => reject(new Error("Ocurrió un error al leer la imagen seleccionada."));
                    reader.onabort = () => reject(new Error("La lectura de la imagen fue cancelada."));
                    try { reader.readAsDataURL(selectedFile); } catch (error) { reject(error); }
                });
                imageAttachment = { dataUrl, name: String(selectedFile.name || "imagen"), mimeType, size: selectedFile.size };
            }
            const activaTestigoMotor = content.querySelector("#rep-testigo-motor").checked;
            const res = await reportProblem(vehicleId, fullProblemText,
                { reportId, corteIndex: Number(corteNum), activaTestigoMotor }, getSessionPayload_(), imageAttachment);
            if (!res || res.status !== "success") throw new Error(res && res.message || "El servidor no confirmó el reporte.");
            if (imageAttachment && (res.imageAttached !== true || !res.imageUrl))
                throw new Error("El servidor no confirmó que la imagen quedara guardada; el reporte no se marcará como exitoso.");
            const confirmedReportId = res.reportId || reportId;
            modal.remove();
            showReportSuccessModal(vehicleId, corteNum, currentCutData, confirmedReportId, activaTestigoMotor);
        } catch (err) {
            console.error("Error al enviar reporte de corte:", err);
            showGlobalError("No se pudo enviar el reporte: " + String(err && err.message || "inténtalo de nuevo."));
            submitBtn.disabled = false;
            submitBtn.classList.remove("btn-loading");
        }
    };
}

function showReportSuccessModal(vehicleId, corteNum, currentCutData, reportId, reportActivaTestigo = undefined) {
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
        <div style="font-size:2.5rem; color:#28a745; margin-bottom:10px;">
            <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 style="margin:0 0 10px 0;">¡Reporte Enviado con Éxito!</h3>
        <p id="report-success-identity" style="font-size:0.9em; color:var(--text-color); margin-bottom:15px;"></p>
        <p style="font-size:0.9em; color:var(--text-color); margin-bottom:20px;">
            ¿Deseas proponer una sugerencia de cambio técnica para este corte ahora mismo?
        </p>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button id="btn-suggest-change-action" class="btn btn-primary" style="display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-pen-to-square"></i> Sugerir cambio
            </button>
            <button id="btn-close-report-success" class="btn btn-secondary">Cerrar</button>
        </div>
    `;

    mountRichTextToolbars(content);

    const identity = content.querySelector("#report-success-identity");
    identity.append(
        document.createTextNode(`Tu reporte para el Corte #${String(corteNum)} ha sido registrado bajo el identificador `),
        document.createElement("strong")
    );
    identity.querySelector("strong").textContent = String(reportId || "");

    modal.appendChild(content);
    document.body.appendChild(modal);

    const close = () => modal.remove();
    content.querySelector(".info-close-btn").onclick = close;
    content.querySelector("#btn-close-report-success").onclick = close;
    content.querySelector("#btn-suggest-change-action").onclick = () => {
        modal.remove();
        openSuggestCutModal(vehicleId, corteNum, currentCutData, reportId, reportActivaTestigo);
    };
}

/* TAREA 9 (2.2): MODAL DE SUGERENCIA DE CAMBIOS VINCULADA AL CORTE Y ACCESO SEGURO */
function createSuggestionOperationId_() {
    const cryptoApi = window.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
        const bytes = new Uint8Array(24);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("El navegador no dispone de un generador seguro para identificar la sugerencia.");
}

function attachContextualHelp_(root, fieldId, message) {
    if (!root || !fieldId) return;
    const label = root.querySelector('label[for="' + fieldId + '"]');
    const field = root.querySelector('#' + fieldId);
    if (!label || !field || label.parentElement.classList.contains('gp-help-label-row')) return;
    const row = document.createElement('div'); row.className = 'gp-help-label-row';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'gp-context-help-trigger';
    button.setAttribute('aria-label', 'Ayuda sobre ' + label.textContent.trim()); button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'context-help-' + fieldId); button.title = 'Ayuda';
    button.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';
    const panel = document.createElement('span'); panel.className = 'gp-context-help-panel'; panel.id = 'context-help-' + fieldId;
    panel.setAttribute('role', 'tooltip'); panel.hidden = true; panel.textContent = message;
    label.parentNode.insertBefore(row, label); row.append(label, button); label.parentNode.insertBefore(panel, field);
    if (root.dataset.gpContextHelpReady === 'true') return;
    root.dataset.gpContextHelpReady = 'true';
    root.addEventListener('click', event => {
        const trigger = event.target instanceof Element ? event.target.closest('.gp-context-help-trigger') : null;
        if (trigger) {
            const target = root.querySelector('#' + trigger.getAttribute('aria-controls'));
            const shouldOpen = target && target.hidden;
            root.querySelectorAll('.gp-context-help-panel').forEach(item => { item.hidden = true; });
            root.querySelectorAll('.gp-context-help-trigger').forEach(item => item.setAttribute('aria-expanded', 'false'));
            if (shouldOpen) { target.hidden = false; trigger.setAttribute('aria-expanded', 'true'); }
        } else if (!(event.target instanceof Element) || !event.target.closest('.gp-context-help-panel')) {
            root.querySelectorAll('.gp-context-help-panel').forEach(item => { item.hidden = true; });
            root.querySelectorAll('.gp-context-help-trigger').forEach(item => item.setAttribute('aria-expanded', 'false'));
        }
    });
    root.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const active = root.querySelector('.gp-context-help-trigger[aria-expanded="true"]');
        if (!active) return;
        root.querySelectorAll('.gp-context-help-panel').forEach(item => { item.hidden = true; });
        root.querySelectorAll('.gp-context-help-trigger').forEach(item => item.setAttribute('aria-expanded', 'false'));
        active.focus();
    });
}
export function openSuggestCutModal(vehicleId, corteNum, currentCutData = {}, reportId = "", reportActivaTestigo = undefined) {
    const existing = document.getElementById("suggest-cut-modal");
    if (existing) existing.remove();

    const validCorteNum = corteNum || currentCutData.index || 1;
    const reportRef = reportId || `REP-${Date.now()}`;
    const modal = document.createElement("div");
    modal.id = "suggest-cut-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2500";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "520px";

    const safeDropdowns = (typeof dropdownOptions !== "undefined" && dropdownOptions)
        || (typeof window !== "undefined" && window.dropdownOptions)
        || (typeof getState === "function" && getState() && getState().dropdownOptions)
        || null;
    const defaultTipos = ["Bomba de combustible", "Ignición", "Marcha / Arranque", "Fusible Principal", "Sensor CKP / CMP", "No recomendado"];
    const tiposCorteOptions = (safeDropdowns && safeDropdowns.tipoDeCorte && safeDropdowns.tipoDeCorte.length > 0)
        ? safeDropdowns.tipoDeCorte : defaultTipos;
    const defaultRelays = ["Sin relay", "Relay 5 pines (Normalmente Cerrado)", "Relay 5 pines (Normalmente Abierto)", "Relay 4 pines"];
    const relayOptions = (safeDropdowns && safeDropdowns.configRelay && safeDropdowns.configRelay.length > 0)
        ? safeDropdowns.configRelay : defaultRelays;
    const currentTestigoValue = typeof reportActivaTestigo === "boolean"
        ? reportActivaTestigo : normalizeActivaTestigoValue(currentCutData.activaTestigo);

    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2 id="suggest-cut-heading"><i class="fa-solid fa-pen-to-square"></i></h2>
        <p id="suggest-cut-summary" style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;"></p>
        <form id="suggest-cut-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label for="sug-tipo">Tipo de Corte</label>
                <select id="sug-tipo" class="dev-input" style="padding:6px;">
                    <option value="">-- Conservar / Seleccionar Tipo --</option>
                </select>
            </div>
            <div class="form-group">
                <label for="sug-relay">Configuración de Relay</label>
                <select id="sug-relay" class="dev-input" style="padding:6px;">
                    <option value="">-- Conservar / Seleccionar Relay --</option>
                </select>
            </div>
            <div class="form-group">
                <label for="sug-ubicacion">Ubicación / Detalles Técnicos del Corte</label>
                <input type="text" id="sug-ubicacion" maxlength="300" placeholder="Ej. Bajo el asiento trasero, ramal principal izquierdo">
            </div>
            <div class="form-group">
                <label for="sug-color">Color de Cable</label>
                <input type="text" id="sug-color" maxlength="120" placeholder="Ej. Azul / Blanco, Verde grueso">
            </div>
            <div class="form-group">
                <label for="sug-check-engine">¿El corte activa el testigo de motor (Check Engine)?</label>
                <select id="sug-check-engine" class="dev-input" style="padding:6px;">
                    <option value="unspecified">No aplica / No especificado</option>
                    <option value="true">Sí, activa testigo</option>
                    <option value="false">No activa testigo</option>
                </select>
            </div>
            <div class="form-group">
                <label for="sug-img-file">Imagen de Referencia del Corte (Opcional)</label>
                <input type="file" id="sug-img-file" accept="image/jpeg,image/png,image/webp">
            </div>
            <div class="form-group">
                <label for="sug-detalles">Explicación y Justificación del Cambio *</label>
                <div class="rich-editor-toolbar" data-rich-target="sug-detalles"></div>
                <textarea id="sug-detalles" rows="3" maxlength="2000" placeholder="Explica claramente por qué propones este cambio en el corte..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:8px;">Enviar Sugerencia</button>
        </form>
    `;

    attachContextualHelp_(content, "sug-tipo", "Selecciona el circuito o método de corte documentado. Confirma el punto y su función en el diagrama eléctrico del vehículo.");
    attachContextualHelp_(content, "sug-relay", "Elige el esquema de conexión realmente utilizado. Verifica que coincida con el tipo de señal y el circuito; no lo determines solo por el color de los cables.");
    attachContextualHelp_(content, "sug-ubicacion", "Describe el punto físico donde se realizó la conexión, usando referencias que permitan localizarlo durante una revisión.");
    attachContextualHelp_(content, "sug-color", "Indica los colores observados y, si ayuda a distinguirlos, el grosor o la franja del conductor.");
    attachContextualHelp_(content, "sug-check-engine", "Indica si la interrupción del circuito provoca que se encienda el testigo Check Engine.");
    attachContextualHelp_(content, "sug-detalles", "Explica qué dato debe cambiar, por qué es incorrecto el actual y qué evidencia respalda la corrección.");

    const heading = content.querySelector("#suggest-cut-heading");
    heading.appendChild(document.createTextNode(` Sugerir Cambio - Corte #${String(validCorteNum)}`));
    const summary = content.querySelector("#suggest-cut-summary");
    const reportStrong = document.createElement('strong');
    reportStrong.textContent = String(reportRef);
    const vehicleStrong = document.createElement('strong');
    vehicleStrong.textContent = String(vehicleId);
    summary.append(
        document.createTextNode('Vinculado al Reporte: '), reportStrong,
        document.createTextNode(' | Vehículo: '), vehicleStrong
    );

    const appendOptions = (select, options, currentValue) => {
        const normalizedCurrent = String(currentValue || '').toLowerCase();
        options.forEach(optionValue => {
            const option = document.createElement('option');
            const value = String(optionValue == null ? '' : optionValue);
            option.value = value;
            option.textContent = value;
            if (normalizedCurrent && value.toLowerCase() === normalizedCurrent) option.selected = true;
            select.appendChild(option);
        });
    };
    appendOptions(content.querySelector("#sug-tipo"), tiposCorteOptions, currentCutData.tipo);
    appendOptions(content.querySelector("#sug-relay"), relayOptions, currentCutData.configRelay);
    content.querySelector("#sug-ubicacion").value = String(currentCutData.ubicacion || '');
    content.querySelector("#sug-color").value = String(currentCutData.colorCable || '');
    content.querySelector("#sug-check-engine").value = currentTestigoValue === null ? 'unspecified' : String(currentTestigoValue);

    mountRichTextToolbars(content);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector(".info-close-btn");
    closeBtn.onclick = () => modal.remove();

    const form = content.querySelector("#suggest-cut-form");
    let lastSuggestionSubmissionSignature = "";
    let suggestionOperationId = "";
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
        try {
            let imageAttachment = null;
            const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            if (selectedFile) {
                const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
                const maxImageBytes = 3 * 1024 * 1024;
                const mimeType = String(selectedFile.type || "").toLowerCase();
                if (!allowedMimeTypes.includes(mimeType)) throw new Error("Formato no permitido. Utiliza JPG, PNG o WebP.");
                if (!Number.isFinite(selectedFile.size) || selectedFile.size < 1 || selectedFile.size > maxImageBytes) {
                    throw new Error("La imagen debe pesar como máximo 3 MB.");
                }
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => typeof reader.result === "string" && reader.result.startsWith("data:")
                        ? resolve(reader.result) : reject(new Error("No se pudo leer el contenido de la imagen."));
                    reader.onerror = () => reject(new Error("Ocurrió un error al leer la imagen seleccionada."));
                    reader.onabort = () => reject(new Error("La lectura de la imagen fue cancelada."));
                    try { reader.readAsDataURL(selectedFile); } catch (error) { reject(error); }
                });
                imageAttachment = { dataUrl, name: String(selectedFile.name || "imagen"), mimeType, size: selectedFile.size };
            }
            const normalizedDetails = content.querySelector("#sug-detalles").value.trim();
            if (!normalizedDetails) throw new Error("Explica y justifica el cambio antes de enviar la sugerencia.");
            if (normalizedDetails.length > 2000) throw new Error("La justificación no puede superar 2000 caracteres.");
            const proposedValues = {
                tipo: content.querySelector("#sug-tipo").value.trim() || currentCutData.tipo || "",
                ubicacion: content.querySelector("#sug-ubicacion").value.trim(),
                colorCable: content.querySelector("#sug-color").value.trim(),
                configRelay: content.querySelector("#sug-relay").value.trim() || currentCutData.configRelay || "",
                activaTestigo: content.querySelector("#sug-check-engine").value === "true" ? true :
                    (content.querySelector("#sug-check-engine").value === "false" ? false : null)
            };
            const payload = {
                reportId: reportRef, vehicleId, corteIndex: validCorteNum,
                details: normalizedDetails, imageAttachment, proposedValues
            };
            const submissionSignature = JSON.stringify({
                reportId: payload.reportId, vehicleId: payload.vehicleId, corteIndex: payload.corteIndex,
                details: payload.details, image: imageAttachment ? imageAttachment.dataUrl : "",
                proposedValues: payload.proposedValues
            });
            if (!suggestionOperationId || submissionSignature !== lastSuggestionSubmissionSignature) {
                suggestionOperationId = createSuggestionOperationId_();
                lastSuggestionSubmissionSignature = submissionSignature;
            }
            payload.suggestionOperationId = suggestionOperationId;
            const response = await suggestCutChange(payload, getSessionPayload_());
            if (!response || response.status !== "success") throw new Error(response && response.message || "El servidor no confirmó la sugerencia.");
            if (imageAttachment && (response.imageAttached !== true || !response.imageUrl)) {
                throw new Error("El servidor no confirmó que la imagen quedara guardada; la sugerencia no se marcará como exitosa.");
            }
            modal.remove();
            showGlobalNotification("Sugerencia enviada correctamente. Será revisada por un administrador.", "success");
        } catch (err) {
            console.error("Error al guardar la sugerencia:", err);
            showGlobalError("No se pudo enviar la sugerencia: " + String(err && err.message || "inténtalo de nuevo."));
            submitBtn.disabled = false;
            submitBtn.classList.remove("btn-loading");
            submitBtn.innerText = "Enviar Sugerencia";
        }
    };
}

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
            ${!String(item.videoGuiaDesarmeUrl || item.Video || "").trim() ? `<button id="btn-exp-video" class="btn btn-secondary btn-expand-option"><i class="fa-brands fa-youtube"></i> Agregar vídeo guía</button>` : ""}
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
export function normalizeCutDropdownResponse_(response) {
    if (!response || response.status !== "success" || !response.dropdowns || typeof response.dropdowns !== "object") throw new Error("El servicio no devolvió las listas oficiales de cortes.");
    const normalizeList = value => Array.isArray(value) ? Array.from(new Set(value.map(item => String(item == null ? "" : item).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)) : [];
    const tipoDeCorte = normalizeList(response.dropdowns.tipoDeCorte), configRelay = normalizeList(response.dropdowns.configRelay);
    if (!tipoDeCorte.length) throw new Error("La lista oficial de tipos de corte está vacía o no disponible.");
    if (!configRelay.length) throw new Error("La lista oficial de configuraciones relay está vacía o no disponible.");
    return { tipoDeCorte, configRelay };
}
function isCutDropdownValueAllowed_(value, options) {
    return typeof value === "string" && value.trim() !== "" && Array.isArray(options) && options.includes(value);
}

function openAddCutForModelModal(item) {
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
                <select id="add-cut-tipo" required disabled>
                    <option value="" selected disabled>Cargando opciones oficiales...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Configuración Relay</label>
                <select id="add-cut-relay" required disabled>
                    <option value="" selected disabled>Cargando opciones oficiales...</option>
                </select>
                <button type="button" id="add-cut-retry-dropdowns" class="btn btn-secondary" style="display:none;">Reintentar carga de listas</button>
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
    const retryDropdownsBtn = content.querySelector("#add-cut-retry-dropdowns");
    const form = content.querySelector("#add-cut-model-form");
    const submitBtn = form.querySelector('button[type="submit"]');
    const editableControls = [tipoSelect, relaySelect, detailsInput, colorInput, testigoInput, fileInput];

    let pendingOperation = null;
    let pendingOperationLoadFailed = false;
    let pendingOperationCheckComplete = false;
    let cutDropdownsReady = false;
    let cutDropdownOptions = { tipoDeCorte: [], configRelay: [] };
    let submitInProgress = false;

    const showPendingNotice = (message) => {
        pendingNotice.textContent = message;
        pendingNotice.style.display = "block";
    };

    const lockFormForPendingOperation = () => {
        editableControls.forEach(control => { control.disabled = true; });
        submitBtn.disabled = !cutDropdownsReady || pendingOperationLoadFailed;
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

        const savedType = String(savedCut.tipoCorte1 || "");
        const savedRelay = String(savedCut.configRelay1 || "");
        tipoSelect.value = isCutDropdownValueAllowed_(savedType, cutDropdownOptions.tipoDeCorte) ? savedType : "";
        relaySelect.value = isCutDropdownValueAllowed_(savedRelay, cutDropdownOptions.configRelay) ? savedRelay : "";
        detailsInput.value = savedCut.ubicacionCorte1 || "";
        colorInput.value = savedCut.colorCableCorte1 || "";
        testigoInput.checked = savedCut.activaTestigo1 === true;
        syncNoRecomendadoState();
        lockFormForPendingOperation();
        const staleSelections = [
            savedType && !isCutDropdownValueAllowed_(savedType, cutDropdownOptions.tipoDeCorte) ? "tipo de corte" : "",
            savedRelay && !isCutDropdownValueAllowed_(savedRelay, cutDropdownOptions.configRelay) ? "configuración relay" : ""
        ].filter(Boolean);
        showPendingNotice("Existe un agregado pendiente para este vehículo. Se conservaron los datos originales, incluida la imagen. El reintento utilizará la misma clave para evitar duplicados; los campos permanecen bloqueados." +
            (staleSelections.length ? " La lista vigente ya no contiene el " + staleSelections.join(" ni la ") + "; el reintento conserva el valor original sin ofrecerlo como opción nueva." : ""));
        return true;
    };

    const populateSelectOptions = (select, options, placeholder) => {
        select.innerHTML = "";
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = placeholder;
        emptyOption.disabled = true;
        emptyOption.selected = true;
        select.appendChild(emptyOption);
        options.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        select.value = "";
    };

    function syncNoRecomendadoState() {
        const isNoRec = isNoRecomendadoValue(tipoSelect.value);
        relaySelect.disabled = Boolean(pendingOperation) || !cutDropdownsReady || isNoRec;
        relaySelect.required = cutDropdownsReady && !pendingOperation && !isNoRec;
        if (isNoRec) relaySelect.value = "";
    }

    tipoSelect.onchange = syncNoRecomendadoState;

    const loadCutDropdownOptions = async () => {
        retryDropdownsBtn.style.display = "none";
        tipoSelect.disabled = true;
        relaySelect.disabled = true;
        submitBtn.disabled = true;
        try {
            const response = await routeAction("getDropdownData");
            cutDropdownOptions = normalizeCutDropdownResponse_(response);
            populateSelectOptions(tipoSelect, cutDropdownOptions.tipoDeCorte, "Seleccione un tipo de corte");
            populateSelectOptions(relaySelect, cutDropdownOptions.configRelay, "Seleccione una configuración relay");
            cutDropdownsReady = true;
            tipoSelect.disabled = Boolean(pendingOperation);
            syncNoRecomendadoState();
            if (pendingOperation) applyPendingOperation(pendingOperation);
            else pendingNotice.style.display = "none";
            submitBtn.disabled = !pendingOperationCheckComplete || !cutDropdownsReady || pendingOperationLoadFailed;
            return true;
        } catch (error) {
            cutDropdownsReady = false;
            cutDropdownOptions = { tipoDeCorte: [], configRelay: [] };
            tipoSelect.innerHTML = '<option value="" selected disabled>Opciones no disponibles</option>';
            relaySelect.innerHTML = '<option value="" selected disabled>Opciones no disponibles</option>';
            tipoSelect.disabled = true;
            relaySelect.disabled = true;
            retryDropdownsBtn.style.display = "inline-block";
            showPendingNotice("No se pudieron cargar las listas oficiales desde Google Sheets. No se permitirá enviar un corte con opciones incompletas. Comprueba la conexión y reintenta la carga.");
            console.error("Error cargando listas oficiales para modal de corte:", error);
            return false;
        }
    };

    retryDropdownsBtn.onclick = () => { loadCutDropdownOptions(); };
    const relayOptionsPromise = loadCutDropdownOptions();

    async function restorePendingOperation() {
        const { currentUser } = getState();
        const ownerId = String(currentUser && currentUser.ID || "").trim();
        if (!ownerId) {
            pendingOperationCheckComplete = true;
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("No se pudo identificar la cuenta activa. No se habilitó un nuevo envío.");
            return;
        }
        const stored = await offline.getAddCutPendingOperation(vehicleId, ownerId);
        if (!stored || stored.available !== true) {
            pendingOperationCheckComplete = true;
            pendingOperationLoadFailed = true;
            editableControls.forEach(control => { control.disabled = true; });
            submitBtn.disabled = true;
            showPendingNotice("No se pudo consultar el almacenamiento local de operaciones pendientes. No se habilitó un nuevo envío para evitar duplicados. Recarga la aplicación e inténtalo nuevamente.");
            return;
        }

        if (!stored.operation) {
            pendingNotice.style.display = "none";
            pendingOperationCheckComplete = true;
            submitBtn.disabled = !cutDropdownsReady || pendingOperationLoadFailed;
            submitBtn.innerText = "Agregar Corte";
            return;
        }

        const operation = stored.operation;
        pendingOperationCheckComplete = true;
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
            pendingOperationCheckComplete = true;
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
        if (!cutDropdownsReady) {
            showPendingNotice("Las listas oficiales no están disponibles. Reintenta su carga antes de enviar el corte.");
            return;
        }
        if (!pendingOperation) {
            if (!isCutDropdownValueAllowed_(tipoSelect.value, cutDropdownOptions.tipoDeCorte)) {
                showGlobalError("Selecciona un tipo de corte incluido en la lista oficial vigente.");
                return;
            }
            if (!isNoRecomendadoValue(tipoSelect.value) &&
                !isCutDropdownValueAllowed_(relaySelect.value, cutDropdownOptions.configRelay)) {
                showGlobalError("Selecciona una configuración relay incluida en la lista oficial vigente.");
                return;
            }
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
            await completeVehicleExpansionSave_(result, item.id, "Corte agregado con éxito.", modal);
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


async function refreshVehicleDetailAfterExpansion_(vehicleId, dependencies = {}) {
 const cleanVehicleId=String(vehicleId==null?"":vehicleId).trim();
 if(!cleanVehicleId)throw new Error("No se recibió un ID de vehículo válido para sincronizar el detalle.");
 const fetchCatalog=dependencies.fetchCatalog||(()=>routeAction("getCatalogData",{forceRefresh:true}));
 const updateCatalog=dependencies.updateCatalog||(data=>setState({catalogData:data}));
 const renderDetail=dependencies.renderDetail||(vehicle=>mostrarDetalleModal(vehicle,true));
 const response=await fetchCatalog();
 if(!response||response.status!=="success"||!response.data||!Array.isArray(response.data.cortes))throw new Error("La lectura del catálogo no devolvió una respuesta completa y válida.");
 const matches=response.data.cortes.filter(vehicle=>String(vehicle&&vehicle.id)===cleanVehicleId);
 if(matches.length!==1)throw new Error(matches.length?"El ID del vehículo aparece más de una vez en el catálogo; no se reconstruyó el detalle.":"El vehículo actualizado no aparece en la lectura vigente del catálogo.");
 const updatedItem=matches[0];updateCatalog(response.data);renderDetail(updatedItem);return updatedItem;
}
async function completeVehicleExpansionSave_(writeResult,vehicleId,successMessage,modal,dependencies={}) {
 const cleanVehicleId=String(vehicleId==null?"":vehicleId).trim();
 if(!cleanVehicleId||!writeResult||writeResult.status!=="success"||String(writeResult.vehicleId==null?"":writeResult.vehicleId).trim()!==cleanVehicleId)throw new Error("El servidor no confirmó el guardado de la información para el vehículo solicitado.");
 if(!modal||typeof modal.remove!=="function")throw new Error("No se pudo cerrar el formulario después de confirmar el guardado.");
 const notifySuccess=dependencies.notifySuccess||(message=>alert(message));
 const notifyRefreshFailure=dependencies.notifyRefreshFailure||(message=>showGlobalError(message));
 modal.remove();notifySuccess(successMessage);
 try{const updatedItem=await refreshVehicleDetailAfterExpansion_(cleanVehicleId,dependencies);return {writeConfirmed:true,refreshed:true,vehicleId:cleanVehicleId,updatedItem};}
 catch(refreshError){notifyRefreshFailure("La información se guardó correctamente, pero no se pudo sincronizar el detalle del vehículo. Vuelve a cargar el catálogo para ver los cambios.");return {writeConfirmed:true,refreshed:false,vehicleId:cleanVehicleId};}
}
async function syncApprovedVehicleVideoDetail_(videoMeta, dependencies = {}) {
 const approvedVideo=videoMeta&&typeof videoMeta==="object"?videoMeta:{};
 const referenceId=String(approvedVideo.referenceId||"").trim();
 if(approvedVideo.contentType!=="corte"||!referenceId)return {applicable:false,refreshed:false};
 const getDetailModal=dependencies.getDetailModal||(()=>document.getElementById("modalDetalle"));
 const renderDetail=dependencies.renderDetail||(vehicle=>mostrarDetalleModal(vehicle,true));
 const notifyRefreshFailure=dependencies.notifyRefreshFailure||(message=>mostrarNotificacion(message,"warning"));
 const detailModal=getDetailModal();
 const shouldReopen=Boolean(detailModal&&detailModal.classList.contains("visible")&&detailModal.dataset.modalType==="corte"&&String(detailModal.dataset.vehicleId||"")===referenceId);
 try{
  await refreshVehicleDetailAfterExpansion_(referenceId,{fetchCatalog:dependencies.fetchCatalog,updateCatalog:dependencies.updateCatalog,renderDetail:updatedItem=>{if(shouldReopen)renderDetail(updatedItem);}});
  return {applicable:true,refreshed:true,detailReopened:shouldReopen};
 }catch(error){
  notifyRefreshFailure("El vídeo fue aprobado, pero no se pudo sincronizar el catálogo del vehículo. Vuelve a cargar la información.");
  return {applicable:true,refreshed:false,detailReopened:false};
 }
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
            const writeResult = await routeAction("addSupplementaryInfo", {
                ...getDeveloperSessionPayload(),
                vehicleId: item.id,
                apertura: content.querySelector("#add-apertura-detalles").value,
                imgApertura: imgBase64
            });
            await completeVehicleExpansionSave_(writeResult, item.id, "Apertura agregada con éxito.", modal);
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

        // El servidor asigna el primer par texto/imagen libre usando el registro vigente.
        const payload = { vehicleId: item.id, cableAlimen: content.querySelector("#add-feed-detalles").value, imgCableAlimen: imgBase64 };

        try {
            const writeResult = await routeAction("addSupplementaryInfo", { ...payload, ...getDeveloperSessionPayload() });
            await completeVehicleExpansionSave_(writeResult, item.id, "Cable de alimentación agregado con éxito.", modal);
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
        const freshness = getPysDataFreshness();
        if (freshness.hasCache && freshness.stale) {
            const staleNotice = document.createElement("p");
            staleNotice.className = "pys-stale-notice";
            staleNotice.textContent = freshness.error
                ? "Sin conexión con el servidor. Se muestran datos guardados que podrían estar desactualizados."
                : "Se muestran datos guardados mientras se actualizan; podrían estar desactualizados.";
            staleNotice.style.cssText = "font-size:0.82rem;color:var(--text-disabled);margin:4px 0 10px;";
            cont.appendChild(staleNotice);
        }
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
    const cachedData = getCachedPysData();
    const hasCache = Array.isArray(cachedData);
    const freshnessBeforeLoad = getPysDataFreshness();
    renderGridWithItems(hasCache ? cachedData : []);

    // Usa datos recientes si están dentro del TTL y comparte cualquier solicitud en curso.
    try {
        const freshItems = await loadPysData();
        const cacheHash = JSON.stringify(cachedData || []);
        const freshHash = JSON.stringify(freshItems || []);
        const freshnessAfterLoad = getPysDataFreshness();
        if (!hasCache || cacheHash !== freshHash || freshnessBeforeLoad.stale !== freshnessAfterLoad.stale || freshnessBeforeLoad.error !== freshnessAfterLoad.error) {
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
export function openAddProblemModal(preAssociatedVehicle = null, navOptions = {}) {
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
                <label>Título del Problema (Máx 15 caracteres)</label>
                <input type="text" id="pys-titulo" maxlength="15" required placeholder="Ej. Falla relay pump">
            </div>
            <div class="form-group">
                <label>Imagen del Problema</label>
                <input type="file" id="pys-img-file" accept="image/jpeg,image/png,image/webp" required>
            </div>
            <div class="form-group">
                <label>Detalle del Problema (Máx 200 caracteres)</label>
                <div class="rich-editor-toolbar" data-rich-target="pys-detalle"></div>
                <textarea id="pys-detalle" maxlength="200" rows="4" required placeholder="Describe el problema..."></textarea>
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
    let pendingPysOperationId = "";
    let pendingPysOperationSignature = "";
    form.onsubmit = async (e) => {
        e.preventDefault();

        const { currentUser } = getState();
        if (!currentUser) {
            showGlobalError("Debes estar conectado.");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const fileInput = content.querySelector("#pys-img-file");
        const selectedFile = fileInput.files && fileInput.files[0];
        submitBtn.disabled = true;
        submitBtn.textContent = "Guardando...";

        let completed = false;
        try {
            if (!selectedFile) throw new Error("Debes seleccionar una imagen para el problema.");
            const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
            if (!allowedMimeTypes.includes(String(selectedFile.type || "").toLowerCase())) {
                throw new Error("La imagen debe estar en formato JPEG, PNG o WebP.");
            }
            if (!Number.isFinite(selectedFile.size) || selectedFile.size < 1 || selectedFile.size > 3 * 1024 * 1024) {
                throw new Error("La imagen debe tener un tamaño máximo de 3 MB.");
            }

            const imgBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = event => {
                    const result = event && event.target ? event.target.result : null;
                    if (typeof result !== "string" ||
                        !result.startsWith("data:" + selectedFile.type.toLowerCase() + ";base64,")) {
                        reject(new Error("La lectura no devolvió una imagen válida del tipo seleccionado."));
                        return;
                    }
                    resolve(result);
                };
                reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen seleccionada."));
                reader.onabort = () => reject(new Error("La lectura de la imagen fue cancelada. Selecciona el archivo nuevamente."));
                try {
                    reader.readAsDataURL(selectedFile);
                } catch (error) {
                    reject(error);
                }
            });

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
                imgBase64
            };

            const operationSignaturePayload = Object.fromEntries(
                Object.entries(payload).filter(([key]) => !/token/i.test(key))
            );
            const operationSignature = JSON.stringify(operationSignaturePayload);
            if (!pendingPysOperationId || pendingPysOperationSignature !== operationSignature) {
                if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
                    throw new Error("Este navegador no permite generar un identificador seguro para el registro. Actualiza el navegador e inténtalo nuevamente.");
                }
                const randomBytes = new Uint8Array(16);
                window.crypto.getRandomValues(randomBytes);
                pendingPysOperationId = Array.from(randomBytes, byte => byte.toString(16).padStart(2, "0")).join("");
                pendingPysOperationSignature = operationSignature;
            }
            payload.opId = pendingPysOperationId;

            const created = await routeAction("addProblem", payload);
            if (!created || created.status !== "success" || !created.problemId) {
                throw new Error("El servidor no confirmó el ID del problema ni la vinculación de su imagen.");
            }

            completed = true;
            invalidatePysDataCache();
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
                        invalidatePysDataCache();
                        await loadPysData();
                    }
                });
            }
            if (preAssociatedVehicle && preAssociatedVehicle.id) {
                const panel = document.getElementById("detalleCompleto");
                if (panel) renderPosiblesProblemasAccordion(panel, preAssociatedVehicle, navOptions);
            }
        } catch (err) {
            console.error(err);
            showGlobalError("Error al registrar problema: " + err.message);
        } finally {
            if (!completed) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Agregar";
            }
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
export function openPysDetailModal(item,navOptions={},inEditModePys=false){
    const modalDetalle=document.getElementById("modalDetalle");
    const modalWasVisible=Boolean(modalDetalle&&modalDetalle.classList.contains("visible"));
    const currentModalType=modalDetalle&&modalDetalle.dataset.modalType;
    const sameModalViewState=modalWasVisible&&currentModalType==='pys'?captureModalViewState(modalDetalle):null;
    registerModalNavigationTransition_('pys',currentModalType,modalWasVisible,navOptions);
    const cont=document.getElementById("detalleCompleto");cont.innerHTML="";
    if(modalDetalle){modalDetalle.dataset.modalType='pys';modalDetalle.classList.add("visible");}

    const sessionData = localStorage.getItem('gpsepedia_session');
    const userRole = getUiSessionContext_()?.role || null;
    const isDeveloper = userRole === 'desarrollador';

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;";

    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1;";

    const title = document.createElement("h2");
    title.textContent = item.Problema || "Problema técnico";
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

        if(modalNavStack.length>0){closeModalToPreviousContext_();return;}
        if(window.history&&window.history.state&&window.history.state.modalOpen)window.history.back();
        else{document.getElementById("modalDetalle").classList.remove("visible");modalNavStack.length=0;}
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
        titleLabel.textContent = "Título del Problema (máx 15 caracteres):";
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.maxLength = 15;
        titleInput.value = item.Problema || "";
        titleInput.style.cssText = "padding: 6px; border: 1px solid #007bff; border-radius: 4px; width: 100%; box-sizing: border-box;";

        const descLabel = document.createElement("label");
        descLabel.style.fontWeight = "bold";
        descLabel.textContent = "Descripción (máx 200 caracteres):";
        const descInput = document.createElement("textarea");
        descInput.id = "edit-pys-desc-textarea";
        descInput.maxLength = 200;
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
                invalidatePysDataCache();
                        await loadPysData();
            }
        });
        form.appendChild(uploadPysVideoBtn);
        cont.appendChild(form);

        const saveBtn = controlsContainer.querySelector("#btn-save-pys-edit");
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const newTitle = titleInput.value.trim();
                if (!newTitle || newTitle.length > 15) { mostrarNotificacion("El título debe contener entre 1 y 15 caracteres.", "error"); return; }
                const newDesc = descInput.value.trim();
                const newSol = solInput.value.trim();
                if (newSol.length > 700) { mostrarNotificacion("La solución no puede superar 700 caracteres.", "error"); return; }
                const newPrev = prevInput.value.trim();
                if (newPrev.length > 700) { mostrarNotificacion("La prevención no puede superar 700 caracteres.", "error"); return; }
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
                                            });
                    if (res && res.status === 'success') {
                        invalidatePysDataCache();
                        await loadPysData();
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
        const videoEmbedUrl = getValidatedYouTubeVideoEmbedUrl(item.Video);
        const videoBlock = document.createElement("div");
        videoBlock.style.cssText = "margin-top: 16px;";

        const videoHeader = document.createElement("div");
        videoHeader.style.cssText = "font-size: 0.95rem; font-weight: bold; color: #007bff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #007bff; padding-bottom: 4px; margin-bottom: 8px;";
        videoHeader.textContent = "Video Guía";
        videoBlock.appendChild(videoHeader);

        if (videoEmbedUrl) {
            const videoContainer = document.createElement("div");
            videoContainer.style.margin = "8px 0 12px 0";
            const iframe = document.createElement("iframe");
            iframe.width = "100%";
            iframe.height = "280";
            iframe.src = videoEmbedUrl;
            iframe.title = "Video guía de Problemas y Soluciones";
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
            iframe.setAttribute("allowfullscreen", "");
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            iframe.style.cssText = "border-radius: 8px; border: none; display: block; max-width: 100%;";
            videoContainer.appendChild(iframe);
            videoBlock.appendChild(videoContainer);
        } else {
            const vid = document.createElement("p");
            vid.style.margin = "6px 0";
            vid.textContent = "El enlace del video no es válido y no se mostrará.";
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
            const uniqueModelosAsociados = new Set();
            modelosAsociadosIds = modelosAsociadosIds.reduce((normalized, value) => {
                if (value === null || value === undefined) return normalized;
                const id = String(value).trim();
                if (id && !uniqueModelosAsociados.has(id)) {
                    uniqueModelosAsociados.add(id);
                    normalized.push(id);
                }
                return normalized;
            }, []);
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
        const label = document.createTextNode("Registrado por: ");
        const collaborator = document.createElement("strong");
        collaborator.textContent = cleanColaboradorName(item.Colaborador);
        colDiv.append(label, collaborator);
        cont.appendChild(colDiv);
    }

    if (item.Se_soluciono !== 'x') {
        const addSolBtn = document.createElement("button");
        addSolBtn.className = "btn btn-secondary";
        addSolBtn.innerText = "+ Agregar Solución";
        addSolBtn.onclick = () => {
            const solText = window.prompt("Introduce la solución a este problema (máx 700 caracteres):");
            if (solText && solText.trim()) {
                routeAction("addSolution", { ...getSessionPayload_(), problemId: item.id_problem, solucion: solText.trim() }).then(async result => {
                    if (result && result.status === "conflict") {
                        showGlobalError(result.message || "Otro colaborador ya registró una solución diferente.");
                        document.getElementById("modalDetalle").classList.remove("visible");
                        invalidatePysDataCache();
                        await loadPysData();
                        renderPysSection();
                        return;
                    }
                    if (!result || result.status !== "success") throw new Error("El servidor no confirmó la solución.");
                    alert(result.recovered ? "La solución ya estaba registrada; no se duplicó." : "Solución agregada con éxito.");
                    document.getElementById("modalDetalle").classList.remove("visible");
                    invalidatePysDataCache();
                        await loadPysData();
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
            const prevText = window.prompt("Introduce recomendación preventiva (máx 700 caracteres):");
            if (prevText && prevText.trim()) {
                routeAction("addPrevention", { ...getSessionPayload_(), problemId: item.id_problem, prevenir: prevText.trim() }).then(async result => {
                    if (result && result.status === "conflict") {
                        showGlobalError(result.message || "Otro colaborador ya registró una prevención diferente.");
                        document.getElementById("modalDetalle").classList.remove("visible");
                        invalidatePysDataCache();
                        await loadPysData();
                        renderPysSection();
                        return;
                    }
                    if (!result || result.status !== "success") throw new Error("El servidor no confirmó la prevención.");
                    alert(result.recovered ? "La prevención ya estaba registrada; no se duplicó." : "Prevención agregada con éxito.");
                    document.getElementById("modalDetalle").classList.remove("visible");
                    invalidatePysDataCache();
                        await loadPysData();
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
    if(sameModalViewState)requestAnimationFrame(()=>restoreModalViewState(modalDetalle,sameModalViewState));
    applyPendingModalViewRestore_();
}


/* TAREA 12 (6.1): TARJETA DE CREACIÓN Y FORMULARIO DE TUTORIALES */
export function openAddTutorialModal() {
    if (getUiSessionContext_()?.role !== "desarrollador") {
        showGlobalError("Solo un usuario Desarrollador puede registrar tutoriales.");
        return;
    }
    const existing = document.getElementById("add-tutorial-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "add-tutorial-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2300";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "560px";
    content.innerHTML = `
        <span class="info-close-btn">&times;</span>
        <h2><i class="fa-solid fa-book-open"></i> Agregar Nuevo Tutorial</h2>
        <form id="add-tutorial-form" style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
            <div class="form-group">
                <label for="tut-tema">Tema / Título (máx. 30 caracteres)</label>
                <input type="text" id="tut-tema" maxlength="30" required placeholder="Ej. Desarme de consola frontal">
            </div>
            <div class="form-group">
                <label for="tut-como-identificarlo">Cómo identificarlo</label>
                <textarea id="tut-como-identificarlo" maxlength="700" rows="3" placeholder="Describe cómo reconocer el elemento..."></textarea>
            </div>
            <div class="form-group">
                <label for="tut-donde-encontrarlo">Dónde encontrarlo</label>
                <textarea id="tut-donde-encontrarlo" maxlength="700" rows="3" placeholder="Indica su ubicación..."></textarea>
            </div>
            <div class="form-group">
                <label for="tut-desc">Detalles (máx. 700 caracteres)</label>
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
    form.onsubmit = async event => {
        event.preventDefault();
        if (getUiSessionContext_()?.role !== "desarrollador") {
            showGlobalError("La sesión ya no tiene permisos para registrar tutoriales.");
            return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        const tema = content.querySelector("#tut-tema").value.trim();
        const comoIdentificarlo = content.querySelector("#tut-como-identificarlo").value.trim();
        const dondeEncontrarlo = content.querySelector("#tut-donde-encontrarlo").value.trim();
        const detalles = content.querySelector("#tut-desc").value.trim();
        if (!tema || tema.length > 30 || comoIdentificarlo.length > 700 ||
            dondeEncontrarlo.length > 700 || detalles.length > 700) {
            showGlobalError("Revisa el tema y los límites de caracteres de los campos.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";
        try {
            const operationId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(value => value.toString(16).padStart(2, "0")).join("");
            const payload = {
                operationId, tema, comoIdentificarlo, dondeEncontrarlo, detalles,
                videoUrl: "", ...getSessionPayload_()
            };
            const created = await addTutorial(payload);
            if (!created || created.status !== "success" || !created.referenceId) {
                throw new Error("El servidor no confirmó el destino del tutorial.");
            }
            modal.remove();
            const res = await routeAction("getCatalogData");
            if (res && res.data) setState({ catalogData: res.data });
            openYouTubeUploadModal({
                initialTitle: tema,
                initialDescription: detalles,
                contentType: "tutorial",
                referenceId: created.referenceId,
                metadata: { tutorialId: created.referenceId, tema },
                onSuccess: async () => {
                    const fresh = await routeAction("getCatalogData");
                    if (fresh && fresh.data) setState({ catalogData: fresh.data });
                }
            });
        } catch (err) {
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
        <div class="vehicle-main-img"><img src="${getImageUrl(item.imagenVehiculo, IMG_SIZE_LARGE)}" alt="${title}" data-print-resource="optional" /><span class="print-image-fallback" hidden></span></div>
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
            testigoHtml: c.activaTestigo === true ? `
                <div class="testigo-indicator">
                    <svg class="testigo-engine-icon" viewBox="0 0 64 48" role="img" aria-label="Indicador Check Engine" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 18h8l5-7h15l6 7h6v6h5v13H10V24h2z" fill="none" stroke="#b78103" stroke-width="3" stroke-linejoin="round"/>
                        <path d="M25 11V6h12v5M18 24v13M29 24v13M40 24v13M52 29h5" fill="none" stroke="#b78103" stroke-width="3" stroke-linecap="round"/>
                        <path d="M14 18v-5h6" fill="none" stroke="#b78103" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    <div class="testigo-aviso">Este corte activa el testigo de motor (Check Engine)</div>
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
            testigoHtml: '',
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
            testigoHtml: '',
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
                <div class="tech-item-info">${entry.infoHtml}</div>
                ${safeImg ? `
                <div class="tech-item-img-wrapper">
                    <img src="${safeImg}" alt="${entry.alt}" class="tech-detail-img" data-print-resource="optional" /><span class="print-image-fallback" hidden></span>
                </div>` : ''}
                ${entry.testigoHtml || ''}
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

    // 8. QR local para el vídeo guía: no se transmite el enlace a servicios de terceros.
    const rawVideoUrl = item.Video || item.videoGuiaDesarmeUrl;
    let qrHtml = '';
    if (rawVideoUrl && typeof rawVideoUrl === 'string' && rawVideoUrl.trim()) {
        const qrDataUrl = createPrintableQrDataUrl(rawVideoUrl);
        qrHtml = qrDataUrl
            ? `
                <div class="qr-video-box">
                    <img src="${qrDataUrl}" alt="Código QR Vídeo Guía" class="qr-code-img" data-print-resource="optional" /><span class="print-image-fallback" hidden></span>
                    <span class="qr-label">Vídeo Guía de Desarme</span>
                </div>
            `
            : `
                <div class="qr-video-box">
                    <span class="qr-unavailable">QR no disponible: enlace de YouTube no válido</span>
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
                    size: letter portrait;
                    margin: 10mm;
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
                    height: 259.4mm;
                    min-height: 259.4mm;
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
                .qr-unavailable { max-width: 90px; padding: 8px; color: #7a4b00; font-size: 9px; font-weight: bold; text-align: center; border: 1px dashed #c99a35; border-radius: 3px; }
                .qr-label {
                    font-size: 9px;
                    font-weight: bold;
                    color: #555;
                    margin-top: 4px;
                    text-align: center;
                }
                .print-image-fallback:not([hidden]) {
                    display: block;
                    padding: 6px 8px;
                    border: 1px dashed #b0b0b0;
                    border-radius: 3px;
                    color: #666;
                    background: #f7f7f7;
                    font-size: 10px;
                    text-align: center;
                }
                #print-resource-status { font-size: 10px; color: #fff; margin: 0 8px; }
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

                /* Los modos explícitos prevalecen sobre los límites adaptativos del wrapper.
                   Automática conserva las clases layout-single/pair/triple/mosaic calculadas.
                   Horizontal: texto e imagen lado a lado. Vertical: texto y luego imagen.
                   Imagen ampliada: una tarjeta por fila y mayor altura disponible. */
                body[data-print-layout="vertical"] .sheet-page-wrapper .adaptive-tech-grid {
                    grid-template-columns: minmax(0, 1fr);
                    justify-content: stretch;
                }
                body[data-print-layout="vertical"] .sheet-page-wrapper .tech-item-body {
                    grid-template-columns: minmax(0, 1fr);
                    grid-auto-flow: row;
                }
                body[data-print-layout="image-focus"] .sheet-page-wrapper .adaptive-tech-grid {
                    grid-template-columns: minmax(0, 1fr);
                    justify-content: stretch;
                }
                body[data-print-layout="image-focus"] .sheet-page-wrapper .tech-item-body {
                    grid-template-columns: minmax(0, 1fr);
                    grid-auto-flow: row;
                }
                body[data-print-layout="image-focus"] .sheet-page-wrapper .tech-detail-img {
                    max-height: 620px;
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
                /* Indicador Check Engine vectorial, autónomo y sin dependencia de Font Awesome. */
                .testigo-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    max-width: 100%;
                    margin-top: 4px;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                .testigo-engine-icon {
                    display: block;
                    flex: 0 0 42px;
                    width: 42px;
                    height: auto;
                    aspect-ratio: 4 / 3;
                    object-fit: contain;
                }
                /* El aviso se renderiza después de la imagen técnica y conserva el mismo orden en pantalla/PDF. */
                .testigo-aviso {
                    margin: 0;
                    min-width: 0;
                    font-size: 11px;
                    font-weight: bold;
                    line-height: 1.25;
                    color: #8a6200;
                    background: #fff8e1;
                    padding: 6px 10px;
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
                        height: 259.4mm;
                        min-height: 259.4mm;
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
                <span id="print-resource-status" role="status" aria-live="polite">Preparando recursos para impresión…</span>
                <button id="print-action" type="button" disabled style="padding: 6px 14px; background: white; color: #007bff; border: none; font-weight: bold; border-radius: 4px; cursor: pointer;">
                    Imprimir / Guardar PDF
                </button>
            </div>

            <div id="print-pages">
            <div class="sheet-page-wrapper" data-image-count="0">
                <div class="sheet-content-main">
                    <div class="header-container">
                        <div class="header-brand-wrap">
                            <span class="header-logo-title">GPSpedia</span>
                            <img src="Images/icon-v3-512x512.png" alt="GPSpedia Logo" class="header-project-logo" data-print-resource="optional" />
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
                    <img src="Images/tracklink_logo.png" alt="Logo de TRACKLINK" class="print-tracklink-logo" data-print-resource="optional" />
                    <span>Ficha técnica de consulta técnica especializada</span>
                </div>
            </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();

    // Distribución técnica por medición de altura real; cada tarjeta se mantiene completa y en orden.
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

        const getImage = card => {
            const image = card.querySelector('.tech-detail-img');
            return image && image.dataset.printResourceStatus === 'loaded' ? image : null;
        };
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

        // Paginación por altura real: las tarjetas permanecen completas y en secuencia técnica.
        const applyPageTemplate = (grid, pageCards) => {
            grid.classList.remove('layout-single', 'layout-pair-portrait', 'layout-pair-landscape', 'layout-triple-portrait', 'layout-mosaic');
            const aspects = pageCards.map(getAspect);
            if (pageCards.length <= 1) grid.classList.add('layout-single');
            else if (pageCards.length === 2 && aspects.every(aspect => aspect > 1.25)) grid.classList.add('layout-pair-landscape');
            else if (pageCards.length === 2 && aspects.every(aspect => aspect < 0.9)) grid.classList.add('layout-pair-portrait');
            else if (pageCards.length === 3 && aspects.every(aspect => aspect < 0.9)) grid.classList.add('layout-triple-portrait');
            else grid.classList.add('layout-mosaic');
            pageCards.forEach((card, index) => {
                card.style.gridColumn = '';
                card.style.gridRow = '';
                card.style.width = '';
                card.style.maxWidth = '';
                card.style.marginLeft = '';
                card.style.marginRight = '';
                if (grid.classList.contains('layout-mosaic') && pageCards.length === 3 && index === 2) {
                    card.style.gridColumn = '1 / -1';
                    if (aspects[index] > 1.25) {
                        card.style.width = '80%';
                        card.style.maxWidth = '80%';
                        card.style.marginLeft = 'auto';
                        card.style.marginRight = 'auto';
                    }
                }
            });
        };

        const fitImagesToAvailablePageSpace = page => {
            const main = page.querySelector('.sheet-content-main');
            if (!main) return;
            const cards = Array.from(page.querySelectorAll('.tech-item-card'));
            const images = cards.map(getImage).filter(Boolean);
            if (!images.length) return;

            images.forEach(img => { img.style.maxHeight = '0px'; });
            const mainChildren = Array.from(main.children);
            const mainStyle = printDocument.defaultView
                ? printDocument.defaultView.getComputedStyle(main)
                : null;
            const mainGap = mainStyle
                ? (parseFloat(mainStyle.rowGap || mainStyle.gap || '0') || 0)
                : 6;
            const contentHeight = mainChildren.reduce(
                (total, child) => total + child.getBoundingClientRect().height,
                0
            ) + Math.max(0, mainChildren.length - 1) * mainGap;
            const availableHeight = Math.max(0, main.clientHeight - contentHeight);

            const rowTops = [];
            cards.forEach(card => {
                const top = card.getBoundingClientRect().top;
                if (!rowTops.some(rowTop => Math.abs(rowTop - top) <= 2)) rowTops.push(top);
            });
            const rowCount = Math.max(1, rowTops.length);
            const modeMaxHeight = printDocument.body.dataset.printLayout === 'image-focus' ? 620 : 520;
            const measuredImageHeight = Math.min(modeMaxHeight, (availableHeight / rowCount) - 4);
            const rowMaxHeight = measuredImageHeight > 0 ? measuredImageHeight : modeMaxHeight;
            images.forEach(img => { img.style.maxHeight = rowMaxHeight + 'px'; });
        };

        const pageOverflows = page => {
            const main = page.querySelector('.sheet-content-main');
            if (!main) return false;
            return main.scrollHeight > main.clientHeight + 1 || main.scrollWidth > main.clientWidth + 1;
        };

        const createPage = pageIndex => {
            const page = printDocument.createElement('div');
            page.className = 'sheet-page-wrapper';
            page.dataset.pageIndex = String(pageIndex);
            page.dataset.imageCount = '0';
            const main = printDocument.createElement('div');
            main.className = 'sheet-content-main';
            if (headerTemplate) main.appendChild(headerTemplate.cloneNode(true));
            if (pageIndex === 0 && metadataTemplate) main.appendChild(metadataTemplate.cloneNode(true));
            if (sectionHeaderTemplate) main.appendChild(sectionHeaderTemplate.cloneNode(true));
            const grid = printDocument.createElement('div');
            grid.className = 'tech-grid adaptive-tech-grid layout-single';
            main.appendChild(grid);
            page.appendChild(main);
            if (footerTemplate) page.appendChild(footerTemplate.cloneNode(true));
            printPages.appendChild(page);
            return { page, grid, cards: [] };
        };

        const arrangeTechnicalCards = () => {
            const orderedCards = [...allTechnicalCards].sort((a, b) => originalOrder(a) - originalOrder(b));
            const priorityCard = orderedCards.find(card => card.dataset.priorityCut === 'true') || null;
            const orderedTechnicalCards = priorityCard && orderedCards[0] !== priorityCard
                ? [priorityCard, ...orderedCards.filter(card => card !== priorityCard)]
                : orderedCards;

            printPages.replaceChildren();
            const pages = [];
            let current = createPage(0);
            pages.push(current);

            const appendCard = (pageState, card) => {
                pageState.cards.push(card);
                pageState.grid.appendChild(card);
                applyPageTemplate(pageState.grid, pageState.cards);
                pageState.page.dataset.imageCount = String(pageState.cards.filter(item => Boolean(getImage(item))).length);
                fitImagesToAvailablePageSpace(pageState.page);
            };

            orderedTechnicalCards.forEach(card => {
                appendCard(current, card);
                if (pageOverflows(current.page) && current.cards.length > 1) {
                    current.grid.removeChild(card);
                    current.cards.pop();
                    applyPageTemplate(current.grid, current.cards);
                    current.page.dataset.imageCount = String(current.cards.filter(item => Boolean(getImage(item))).length);
                    fitImagesToAvailablePageSpace(current.page);
                    if (pageOverflows(current.page) && current.cards.length === 1) {
                        current.page.dataset.contentOverflow = 'true';
                    }

                    current = createPage(pages.length);
                    pages.push(current);
                    appendCard(current, card);
                }
                if (current.cards.length === 1 && pageOverflows(current.page)) {
                    current.page.dataset.contentOverflow = 'true';
                }
            });

            pages.forEach(pageState => {
                fitImagesToAvailablePageSpace(pageState.page);
                if (pageOverflows(pageState.page) && pageState.cards.length === 1) {
                    pageState.page.dataset.contentOverflow = 'true';
                }
                pageState.cards.forEach(card => {
                    const dimensions = getDimensions(card);
                    card.dataset.naturalWidth = String(dimensions.width);
                    card.dataset.naturalHeight = String(dimensions.height);
                    card.dataset.imageAspectRatio = String(dimensions.aspect);
                    card.dataset.imageResolution = String(dimensions.resolution);
                });
            });
        };

        const layoutSelector = printDocument.getElementById('print-layout-mode');
        if (layoutSelector) layoutSelector.addEventListener('change', () => {
            printDocument.body.dataset.printLayout = layoutSelector.value;
            if (printResourcesReady) arrangeTechnicalCards();
        });

        const resourceStatus = printDocument.getElementById('print-resource-status');
        const printButton = printDocument.getElementById('print-action');
        let printResourcesReady = false;
        let printResourcesPromise = null;

        const showResourceFallback = img => {
            img.hidden = true;
            if (img.classList.contains('header-project-logo')) return;
            const parent = img.parentElement;
            if (!parent) return;
            let fallback = parent.querySelector(':scope > .print-image-fallback');
            if (!fallback) {
                fallback = printDocument.createElement('span');
                fallback.className = 'print-image-fallback';
                parent.appendChild(fallback);
            }
            fallback.textContent = img.alt ? img.alt + ' no disponible' : 'Imagen no disponible';
            fallback.hidden = false;
        };

        const waitForImage = img => new Promise(resolve => {
            let settled = false;
            let loadTimer = null;
            const finish = async status => {
                if (settled) return;
                settled = true;
                if (loadTimer !== null) clearTimeout(loadTimer);
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                if (status === 'loaded' && typeof img.decode === 'function') {
                    const decoded = await Promise.race([
                        img.decode().then(() => true, () => false),
                        new Promise(done => setTimeout(() => done(false), 2000))
                    ]);
                    if (!decoded && img.naturalWidth <= 0) status = 'error';
                    else if (!decoded) status = 'decode-timeout';
                }
                img.dataset.printResourceStatus = status;
                if (status !== 'loaded') showResourceFallback(img);
                resolve(status);
            };
            const onLoad = () => finish('loaded');
            const onError = () => finish('error');
            if (img.complete) {
                finish(img.naturalWidth > 0 ? 'loaded' : 'error');
                return;
            }
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            loadTimer = setTimeout(() => finish('timeout'), 8000);
        });

        const preparePrintResources = () => {
            if (printResourcesPromise) return printResourcesPromise;
            printResourcesPromise = (async () => {
                resourceStatus.textContent = 'Cargando y decodificando imágenes…';
                const initialImages = Array.from(printDocument.querySelectorAll('img[data-print-resource]'));
                const initialResults = await Promise.all(initialImages.map(waitForImage));
                arrangeTechnicalCards();
                // La paginación clona encabezado y pie; esperar también esos nodos nuevos antes de habilitar imprimir.
                const allImagesAfterPagination = Array.from(printDocument.querySelectorAll('img[data-print-resource]'));
                const cloneResults = await Promise.all(allImagesAfterPagination.map(waitForImage));
                const results = [...initialResults, ...cloneResults];
                const unavailable = results.filter(status => status !== 'loaded').length;
                printResourcesReady = true;
                printDocument.body.dataset.printReady = 'true';
                resourceStatus.textContent = unavailable
                    ? unavailable + ' recurso(s) no disponible(s); se muestran marcadores de respaldo.'
                    : 'Recursos listos para imprimir.';
                printButton.disabled = false;
            })().catch(error => {
                resourceStatus.textContent = 'No se pudo preparar la ficha para imprimir. Recarga la vista previa.';
                printDocument.body.dataset.printReady = 'false';
                return false;
            });
            return printResourcesPromise;
        };

        printButton.addEventListener('click', () => {
            if (printResourcesReady) printWindow.print();
        });
        printWindow.addEventListener('beforeprint', () => {
            if (!printResourcesReady) {
                resourceStatus.textContent = 'La ficha aún prepara imágenes; espera a que indique que está lista.';
                return;
            }
            arrangeTechnicalCards();
        });
        preparePrintResources();
    }
}

export async function loadAndRenderInbox(options = {}) {
    const suppliedContext = options && options.context;
    const requestContext = suppliedContext || await ensureUiSessionRole_(['desarrollador', 'jefe', 'supervisor']);
    if (!requestContext || !isCurrentUiSessionContext_(requestContext)) return;
    if (options.reset === true) {
        inboxPageCursorStack_ = [null];
        inboxPageIndex_ = 0;
    }
    const cursor = options.cursor === undefined ? inboxPageCursorStack_[inboxPageIndex_] : options.cursor;
    const generation = ++inboxViewGeneration_;
    inboxDetailGeneration_ += 1;
    const isCurrentInboxRequest = () => generation === inboxViewGeneration_ && isCurrentUiSessionContext_(requestContext);
    const listContainer = document.getElementById('inbox-list');
    if (!listContainer) return;

    const cached = inboxPageCache_.get(requestContext, cursor, { pageSize: INBOX_PAGE_SIZE_, allowStale: true });
    if (cached) {
        renderInboxList(cached.value.data);
        renderInboxPagination_(cached.value, requestContext, generation);
        if (!cached.stale) return;
    } else {
        listContainer.replaceChildren();
        const loading = document.createElement('p');
        loading.textContent = 'Cargando bandeja...';
        listContainer.appendChild(loading);
    }

    try {
        const result = await getFeedbackItems(getSessionPayload_(), { cursor, pageSize: INBOX_PAGE_SIZE_ });
        if (!isCurrentInboxRequest()) return;
        if (!result || result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error(result && result.message ? result.message : 'El servidor devolvió una página de Inbox inválida.');
        }
        inboxPageCache_.set(requestContext, cursor, result, INBOX_PAGE_SIZE_);
        renderInboxList(result.data);
        renderInboxPagination_(result, requestContext, generation);
    } catch (error) {
        if (!isCurrentInboxRequest()) return;
        console.error('Error cargando Inbox:', error);
        if (!cached) {
            listContainer.replaceChildren();
            const failure = document.createElement('p');
            failure.className = 'text-danger';
            failure.textContent = 'No se pudo cargar la bandeja. Comprueba la conexión e inténtalo nuevamente.';
            listContainer.appendChild(failure);
        } else {
            const warning = document.createElement('p');
            warning.className = 'text-warning';
            warning.textContent = 'Sin conexión: se muestran datos guardados temporalmente de esta misma sesión.';
            listContainer.appendChild(warning);
        }
    }
}

/* TAREA 9.2: MODAL PARA ASOCIAR PROBLEMAS EXISTENTES O NUEVOS DESDE EL VEHÍCULO */
export async function openAssociateExistingProblemModal(vehicle, navOptions = {}) {
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
        openAddProblemModal(vehicle, navOptions);
    };

    // Obtener problemas de la sección PyS
    let allPys = [];
    try {
        allPys = await loadPysData();
    } catch (e) {
        console.error("Error al obtener datos PyS:", e);
    }

    const resultsContainer = content.querySelector("#existing-pys-results-container");
    const searchInput = content.querySelector("#search-existing-pys-input");

    const renderProblemsList = (query = "") => {
        resultsContainer.innerHTML = "";
        const freshness = getPysDataFreshness();
        if (freshness.hasCache && freshness.stale) {
            const staleNotice = document.createElement("p");
            staleNotice.className = "pys-stale-notice";
            staleNotice.textContent = "Los datos guardados podrían estar desactualizados.";
            resultsContainer.appendChild(staleNotice);
        }
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
            const empty = document.createElement("div");
            empty.style.cssText = "text-align:center;padding:20px;color:var(--text-disabled);font-size:0.9em;";
            empty.textContent = "No hay problemas disponibles para asociar a este vehículo.";
            resultsContainer.appendChild(empty);
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
                        invalidatePysDataCache();
                        await loadPysData();
                        closeModal();
                        // Actualizar inmediatamente el modal de detalle del vehículo
                        const panel = document.getElementById("detalleCompleto");
                        if (panel) {
                            renderPosiblesProblemasAccordion(panel, vehicle, navOptions);
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
