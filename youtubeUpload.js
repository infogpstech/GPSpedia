// GPSpedia Centralized YouTube Video Upload Module | Version: 2.3.0
// ============================================================================
// Lógica unificada para la carga directa de vídeos a YouTube con aprobación previa
// ============================================================================

import { routeAction } from './api-config.js';
import { getState } from './state.js';


const YOUTUBE_PENDING_OPERATION_PREFIX = "gpsepedia_pending_youtube_op_";
const YOUTUBE_PENDING_OPERATION_TTL_MS = 24 * 60 * 60 * 1000;

function createYouTubeOperationId_() {
    const cryptoApi = typeof window !== "undefined" ? window.crypto : null;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("Este navegador no ofrece un generador seguro para identificar la operación de vídeo.");
}

function getYouTubeOperationContext_(userId, contentType, referenceId, title) {
    const key = YOUTUBE_PENDING_OPERATION_PREFIX + encodeURIComponent([
        String(userId), String(contentType), String(referenceId || "draft"), String(title || "").trim().toLowerCase()
    ].join("|"));
    let stored = null;
    try {
        const raw = sessionStorage.getItem(key);
        if (raw) stored = JSON.parse(raw);
    } catch (error) {
        throw new Error("No se pudo recuperar la operación de vídeo pendiente de esta pestaña.");
    }
    if (stored && /^[A-Za-z0-9_-]{20,80}$/.test(String(stored.opVideoId || "")) &&
        Number.isFinite(Number(stored.createdAt)) && Date.now() - Number(stored.createdAt) <= YOUTUBE_PENDING_OPERATION_TTL_MS) {
        return { opVideoId: stored.opVideoId, storageKey: key };
    }
    const opVideoId = createYouTubeOperationId_();
    try {
        sessionStorage.setItem(key, JSON.stringify({ opVideoId, createdAt: Date.now() }));
    } catch (error) {
        throw new Error("No se pudo guardar el identificador de la operación. La subida se canceló para evitar solicitudes duplicadas.");
    }
    return { opVideoId, storageKey: key };
}

function clearYouTubeOperationContext_(storageKey, opVideoId) {
    try {
        const raw = sessionStorage.getItem(storageKey);
        const stored = raw ? JSON.parse(raw) : null;
        if (stored && stored.opVideoId === opVideoId) sessionStorage.removeItem(storageKey);
    } catch (error) {
        console.warn("No se pudo limpiar el identificador de operación de vídeo; se conservará para recuperación.");
    }
}

const YOUTUBE_UPLOAD_DB_NAME = "gpsepedia-youtube-upload";
const YOUTUBE_UPLOAD_STORE_NAME = "operations";
const YOUTUBE_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

function openYouTubeUploadDb_() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error("IndexedDB no está disponible; no se puede garantizar la recuperación de la subida."));
        const request = window.indexedDB.open(YOUTUBE_UPLOAD_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(YOUTUBE_UPLOAD_STORE_NAME)) {
                db.createObjectStore(YOUTUBE_UPLOAD_STORE_NAME, { keyPath: "opVideoId" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento local seguro de la subida."));
        request.onblocked = () => reject(new Error("El almacenamiento de subidas está bloqueado por otra pestaña."));
    });
}

function watchYouTubeUploadTransaction_(db, tx, errorMessage, abortMessage, resolve, reject, readResult) {
    let settled = false;
    const finish = (error, value) => {
        if (settled) return;
        settled = true;
        try { db.close(); } catch (closeError) {}
        if (error) reject(error);
        else resolve(value);
    };
    tx.oncomplete = () => {
        try { finish(null, readResult()); }
        catch (error) { finish(error); }
    };
    tx.onerror = () => finish(new Error(errorMessage));
    tx.onabort = () => finish(new Error(abortMessage || errorMessage));
}

async function saveYouTubeUploadRecord_(record) {
    const db = await openYouTubeUploadDb_();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(YOUTUBE_UPLOAD_STORE_NAME, "readwrite");
        watchYouTubeUploadTransaction_(
            db, tx,
            "No se pudo guardar el punto de recuperación de la subida.",
            "Se canceló el guardado del punto de recuperación.",
            resolve, reject, () => true
        );
        tx.objectStore(YOUTUBE_UPLOAD_STORE_NAME).put(record);
    });
}

async function getYouTubeUploadRecord_(opVideoId) {
    const db = await openYouTubeUploadDb_();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(YOUTUBE_UPLOAD_STORE_NAME, "readonly");
        let result = null;
        const request = tx.objectStore(YOUTUBE_UPLOAD_STORE_NAME).get(String(opVideoId));
        request.onsuccess = () => { result = request.result || null; };
        watchYouTubeUploadTransaction_(
            db, tx,
            "No se pudo leer la recuperación de la subida.",
            null, resolve, reject, () => result
        );
    });
}

async function findPendingYouTubeUploadRecord_(userId, contentType, referenceId) {
    const db = await openYouTubeUploadDb_();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(YOUTUBE_UPLOAD_STORE_NAME, "readonly");
        let result = null;
        let lookupError = null;
        const request = tx.objectStore(YOUTUBE_UPLOAD_STORE_NAME).getAll();
        request.onsuccess = () => {
            const matches = (request.result || []).filter(record =>
                String(record.userId || "") === String(userId) &&
                String(record.contentType || "") === String(contentType) &&
                String(record.referenceId || "") === String(referenceId) &&
                ["new", "uploading", "paused", "interrupted", "uploaded"].includes(String(record.status || ""))
            );
            if (matches.length > 1) lookupError = new Error("Hay varias subidas pendientes para este contenido; requiere revisión antes de continuar.");
            else result = matches[0] || null;
        };
        watchYouTubeUploadTransaction_(
            db, tx,
            "No se pudieron consultar las subidas pendientes.",
            null, resolve, reject, () => {
                if (lookupError) throw lookupError;
                return result;
            }
        );
    });
}

async function deleteYouTubeUploadRecord_(opVideoId) {
    const db = await openYouTubeUploadDb_();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(YOUTUBE_UPLOAD_STORE_NAME, "readwrite");
        watchYouTubeUploadTransaction_(
            db, tx,
            "No se pudo limpiar la recuperación de la subida completada.",
            null, resolve, reject, () => true
        );
        tx.objectStore(YOUTUBE_UPLOAD_STORE_NAME).delete(String(opVideoId));
    });
}

function hasCompletedYouTubeUpload_(record) {
    if (!record) return false;
    const videoId = String(record.videoId || "");
    const fileSize = Number(record.fileSize);
    const bytesUploaded = Number(record.bytesUploaded);
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) &&
        Number.isFinite(fileSize) && fileSize > 0 &&
        Number.isFinite(bytesUploaded) && bytesUploaded >= fileSize;
}

function parseYouTubeUploadRange_(rangeHeader) {
    const match = String(rangeHeader || "").match(/bytes=0-(\d+)/i);
    return match ? Number(match[1]) + 1 : 0;
}

function parseYouTubeUploadResponse_(xhr) {
    let response = null;
    try { response = JSON.parse(xhr.responseText || ""); } catch (error) {}
    if (!response || typeof response.id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(response.id)) {
        const error = new Error("YouTube no devolvió un ID real de vídeo en la respuesta final.");
        error.code = "YOUTUBE_INVALID_FINAL_RESPONSE";
        throw error;
    }
    return response.id;
}

function queryYouTubeUploadOffset_(record, setActiveXhr) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (setActiveXhr) setActiveXhr(xhr);
        xhr.open("PUT", record.uploadUrl, true);
        xhr.setRequestHeader("Content-Range", "bytes */" + record.fileSize);
        xhr.setRequestHeader("Content-Type", record.fileType || "application/octet-stream");
        xhr.onload = () => {
            if (xhr.status === 308) return resolve({ completed: false, offset: parseYouTubeUploadRange_(xhr.getResponseHeader("Range")) });
            if (xhr.status === 200 || xhr.status === 201) {
                try { return resolve({ completed: true, videoId: parseYouTubeUploadResponse_(xhr) }); }
                catch (error) { return reject(error); }
            }
            if (xhr.status === 404 || xhr.status === 410) {
                const error = new Error("La sesión reanudable de YouTube expiró.");
                error.code = "YOUTUBE_SESSION_EXPIRED";
                return reject(error);
            }
            reject(new Error("YouTube no pudo consultar el progreso de la sesión (HTTP " + xhr.status + ")."));
        };
        xhr.onerror = () => reject(new Error("No se pudo consultar el progreso de la sesión reanudable."));
        xhr.onabort = () => reject(new Error("Consulta de progreso cancelada."));
        xhr.send(null);
    });
}

function sendYouTubeUploadChunk_(record, start, endExclusive, onProgress, setActiveXhr, isCancelled) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (setActiveXhr) setActiveXhr(xhr);
        xhr.open("PUT", record.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", record.fileType || "application/octet-stream");
        xhr.setRequestHeader("Content-Range", "bytes " + start + "-" + (endExclusive - 1) + "/" + record.fileSize);
        xhr.upload.onprogress = event => {
            if (isCancelled && isCancelled()) {
                xhr.abort();
                return;
            }
            if (event.lengthComputable && onProgress) onProgress(start + event.loaded, record.fileSize);
        };
        xhr.onload = () => {
            if (xhr.status === 308) return resolve({ completed: false, offset: parseYouTubeUploadRange_(xhr.getResponseHeader("Range")) });
            if (xhr.status === 200 || xhr.status === 201) {
                try { return resolve({ completed: true, videoId: parseYouTubeUploadResponse_(xhr) }); }
                catch (error) { return reject(error); }
            }
            const error = new Error("Error al transferir a YouTube (HTTP " + xhr.status + ").");
            if (xhr.status === 404 || xhr.status === 410) error.code = "YOUTUBE_SESSION_EXPIRED";
            reject(error);
        };
        xhr.onerror = () => reject(new Error("Fallo de conexión durante la transferencia de un bloque a YouTube."));
        xhr.onabort = () => reject(new Error("Bloque de subida cancelado."));
        xhr.send(record.file.slice(start, endExclusive));
    });
}

async function uploadYouTubeFileResumable_(record, onProgress, setActiveXhr, isCancelled, onCheckpoint) {
    let offset = Math.max(0, Number(record.bytesUploaded) || 0);
    let retries = 0;
    if (record.status !== "new" || offset > 0) {
        const status = await queryYouTubeUploadOffset_(record, setActiveXhr);
        if (status.completed) return status.videoId;
        offset = status.offset;
        record.bytesUploaded = offset;
        if (onCheckpoint) await onCheckpoint(record);
    }
    while (offset < record.fileSize) {
        if (isCancelled && isCancelled()) throw new Error("Carga pausada por el usuario; el progreso quedó guardado.");
        const endExclusive = Math.min(offset + YOUTUBE_UPLOAD_CHUNK_SIZE, record.fileSize);
        try {
            const result = await sendYouTubeUploadChunk_(record, offset, endExclusive, onProgress, setActiveXhr, isCancelled);
            if (result.completed) return result.videoId;
            if (result.offset <= offset) {
                retries++;
                if (retries > 3) throw new Error("YouTube no confirmó avance del bloque después de varios intentos.");
                const status = await queryYouTubeUploadOffset_(record, setActiveXhr);
                if (status.completed) return status.videoId;
                offset = status.offset;
            } else {
                offset = result.offset;
                retries = 0;
            }
            record.bytesUploaded = offset;
            record.status = "uploading";
            if (onCheckpoint) await onCheckpoint(record);
            if (onProgress) onProgress(offset, record.fileSize);
        } catch (error) {
            if (isCancelled && isCancelled()) throw error;
            if (error && (error.code === "YOUTUBE_SESSION_EXPIRED" || error.code === "YOUTUBE_INVALID_FINAL_RESPONSE")) throw error;
            retries++;
            if (retries > 4) throw error;
            const status = await queryYouTubeUploadOffset_(record, setActiveXhr);
            if (status.completed) return status.videoId;
            offset = status.offset;
            record.bytesUploaded = offset;
            record.status = "interrupted";
            if (onCheckpoint) await onCheckpoint(record);
        }
    }
    const finalStatus = await queryYouTubeUploadOffset_(record, setActiveXhr);
    if (finalStatus.completed) return finalStatus.videoId;
    throw new Error("YouTube recibió todos los bytes, pero todavía no confirmó el ID final del vídeo.");
}


/**
 * Abre el modal unificado de subida directa de vídeos a YouTube.
 *
 * @param {Object} options
 * @param {string} options.initialTitle - Propuesta inicial editable para el título.
 * @param {string} options.initialDescription - Propuesta inicial editable para el detalle/descripción.
 * @param {string} options.contentType - 'corte' | 'tutorial' | 'pys'
 * @param {string|number} [options.referenceId] - ID de referencia del modelo, tutorial o problema.
 * @param {Object} [options.metadata] - Metadatos adicionales (marca, modelo, versión, etc.).
 * @param {Function} [options.onSuccess] - Callback invocado tras enviar a aprobación con éxito.
 */
let youtubeUploadOverlaySequence = 0;

export function openYouTubeUploadModal(options = {}) {
    const {
        initialTitle = "",
        initialDescription = "",
        contentType = "corte",
        referenceId = null,
        metadata = {},
        onSuccess = null
    } = options;

    const existing = document.getElementById("youtube-upload-modal");
    let replaceExistingOverlayId = null;
    if (existing) {
        const existingOverlayId = existing.__youtubeUploadOverlayId;
        const existingClose = existing.__youtubeUploadClose;
        const existingIsUploading = typeof existing.__youtubeUploadIsUploading === "function"
            && existing.__youtubeUploadIsUploading();
        const existingHistory = window.overlayHistory;
        const existingStack = existingHistory && typeof existingHistory.getStack === "function"
            ? existingHistory.getStack()
            : [];
        const existingIsRegistered = Boolean(existingOverlayId && existingStack.includes(existingOverlayId));

        // No sustituir una transferencia activa: conserva su XHR y su punto de recuperación.
        if (existingIsUploading) return existing;

        // Un overlay hijo debe cerrarse antes; no retirar un modal que no está en la cima.
        if (existingIsRegistered && existingStack[existingStack.length - 1] !== existingOverlayId) {
            return existing;
        }
        if (typeof existingClose !== "function" || existingClose() === false) {
            return existing;
        }
        if (existingIsRegistered) replaceExistingOverlayId = existingOverlayId;
    }

    const modal = document.createElement("div");
    modal.id = "youtube-upload-modal";
    modal.className = "info-modal visible";
    modal.style.zIndex = "2500";

    const content = document.createElement("div");
    content.className = "info-modal-content";
    content.style.maxWidth = "550px";
    content.innerHTML = `
        <span class="info-close-btn" id="yt-modal-close-btn">&times;</span>
        <h2 style="display:flex; align-items:center; gap:8px;"><i class="fa-brands fa-youtube" style="color:#ff0000;"></i> Subir Vídeo a YouTube</h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;">El vídeo se subirá como «No listado» y requerirá aprobación previa antes de publicarse en GPSpedia.</p>
        <form id="yt-upload-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label for="yt-video-file" style="font-weight:600;">Seleccionar Archivo de Vídeo <span style="color:#dc3545;">*</span></label>
                <input type="file" id="yt-video-file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*" required style="padding:6px;">
                <small id="yt-file-info" style="font-size:0.75rem; color:var(--text-disabled); margin-top:2px;">Formatos recomendados: MP4, WebM, MOV.</small>
                <div id="yt-resume-note" style="display:none; margin-top:8px; padding:9px; border-radius:6px; background:#e8f5e9; color:#216b36; font-size:0.82rem;"></div>
                <button type="button" id="yt-discard-upload-btn" class="btn btn-secondary" style="display:none; margin-top:6px;">Descartar sesión incompleta</button>
            </div>
            <div class="form-group">
                <label for="yt-video-title" style="font-weight:600;">Título del Vídeo <span style="color:#dc3545;">*</span></label>
                <input type="text" id="yt-video-title" maxlength="100" required placeholder="Título descriptivo...">
            </div>
            <div class="form-group">
                <label for="yt-video-desc" style="font-weight:600;">Detalle / Descripción</label>
                <textarea id="yt-video-desc" rows="4" maxlength="5000" placeholder="Descripción del contenido..."></textarea>
            </div>
            <div style="background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #e9ecef); border-radius:6px; padding:10px; font-size:0.8rem; color:var(--text-disabled);">
                <strong><i class="fa-solid fa-lock"></i> Configuración de Publicación (Fija):</strong>
                <ul style="margin:4px 0 0 18px; padding:0; list-style-type:disc;">
                    <li>Visibilidad: <strong>No listado</strong></li>
                    <li>Audiencia: <strong>No es contenido para niños</strong></li>
                    <li>Promoción pagada / IA sintética: <strong>No</strong></li>
                    <li>Remixes / Etiquetas: <strong>Deshabilitados</strong></li>
                </ul>
            </div>
            <div id="yt-upload-progress-container" style="display:none; flex-direction:column; gap:8px; margin-top:6px; border-top:1px dashed var(--border-color, #ddd); padding-top:10px;">
                <div style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; border-radius:6px; padding:10px; font-size:0.85rem; font-weight:600; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Si cierras el diálogo, podrás reanudar la transferencia desde el progreso guardado.
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600;">
                    <span id="yt-progress-status">Subiendo archivo a YouTube...</span>
                    <span id="yt-progress-percent">0%</span>
                </div>
                <div style="width:100%; height:12px; background:var(--border-color, #e9ecef); border-radius:6px; overflow:hidden;">
                    <div id="yt-progress-bar" style="width:0%; height:100%; background:#ff0000; transition:width 0.2s ease;"></div>
                </div>
            </div>
            <div class="modal-btn-compact-container" style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
                <button type="button" id="yt-cancel-btn" class="btn btn-secondary btn-modal-action-compact">Cancelar</button>
                <button type="submit" id="yt-submit-btn" class="btn btn-primary btn-modal-action-compact" style="background-color:#ff0000; border-color:#ff0000;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Iniciar Subida
                </button>
            </div>
        </form>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = content.querySelector("#yt-modal-close-btn");
    const cancelBtn = content.querySelector("#yt-cancel-btn");
    const form = content.querySelector("#yt-upload-form");
    const fileInput = content.querySelector("#yt-video-file");
    const fileInfo = content.querySelector("#yt-file-info");
    const titleInput = content.querySelector("#yt-video-title");
    const descInput = content.querySelector("#yt-video-desc");
    const submitBtn = content.querySelector("#yt-submit-btn");
    const discardBtn = content.querySelector("#yt-discard-upload-btn");
    const resumeNote = content.querySelector("#yt-resume-note");
    const progressContainer = content.querySelector("#yt-upload-progress-container");
    const progressBar = content.querySelector("#yt-progress-bar");
    const progressPercent = content.querySelector("#yt-progress-percent");
    const progressStatus = content.querySelector("#yt-progress-status");

    titleInput.value = String(initialTitle || "").slice(0, 100);
    descInput.value = String(initialDescription || "").slice(0, 5000);

    let isUploading = false;
    let uploadCancelled = false;
    let activeXhr = null;
    let recoveredUploadRecord = null;
    let recoveryLookupError = null;
    const currentUser = getState().currentUser;
    const initialUserId = String(currentUser && currentUser.ID || "").trim();
    const recoveryLookupPromise = initialUserId
        ? findPendingYouTubeUploadRecord_(initialUserId, contentType, referenceId)
            .then(record => {
                recoveredUploadRecord = record;
                if (!record) return null;
                fileInput.disabled = true;
                fileInput.required = false;
                titleInput.disabled = true;
                descInput.disabled = true;
                titleInput.value = String(record.title || initialTitle || "").slice(0, 100);
                descInput.value = String(record.description || initialDescription || "").slice(0, 5000);
                fileInfo.textContent = "Archivo recuperable: " + String(record.fileName || "vídeo guardado") + " (" + Number(record.fileSize || 0) + " bytes).";
                resumeNote.textContent = record.status === "uploaded"
                    ? "La transferencia ya terminó. Al continuar se enviará o recuperará la solicitud de aprobación sin volver a subir el archivo."
                    : "Se encontró una transferencia interrumpida. Puedes continuar desde el último bloque confirmado por YouTube.";
                resumeNote.style.display = "block";
                submitBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Reanudar subida';
                discardBtn.style.display = record.status === "uploaded" ? "none" : "inline-flex";
                return record;
            })
            .catch(error => {
                recoveryLookupError = error;
                console.error("No se pudo revisar la recuperación local de YouTube:", error);
                return null;
            })
        : Promise.resolve(null);

    const overlayHistory = window.overlayHistory;
    const overlayHistoryId = "youtube-upload-" + Date.now() + "-" + (++youtubeUploadOverlaySequence);
    let closeWithoutPrompt = false;

    const closeModal = () => {
        if (isUploading && !closeWithoutPrompt) {
            if (!confirm("Hay una carga de vídeo activa. ¿Deseas pausarla y conservar el progreso?")) return false;
            uploadCancelled = true;
            if (activeXhr) activeXhr.abort();
        }
        modal.remove();
        return true;
    };

    // Se registra explícitamente: main.js excluye este modal del observador genérico
    // para que el cierre pueda confirmar la pausa y abortar el XHR de forma segura.
    // El callback queda asociado al nodo para que una apertura posterior pueda
    // cerrar/reemplazar esta instancia sin dejar una entrada huérfana en el historial.
    modal.__youtubeUploadOverlayId = overlayHistoryId;
    modal.__youtubeUploadClose = closeModal;
    modal.__youtubeUploadIsUploading = () => isUploading;

    if (overlayHistory && typeof overlayHistory.register === "function") {
        const currentStack = overlayHistory.getStack();
        if (replaceExistingOverlayId && currentStack[currentStack.length - 1] === replaceExistingOverlayId) {
            overlayHistory.replaceTop(overlayHistoryId, closeModal);
        } else {
            overlayHistory.register(overlayHistoryId, closeModal);
        }
    }

    const requestOverlayClose = () => {
        if (overlayHistory && typeof overlayHistory.close === "function" &&
            overlayHistory.getStack().includes(overlayHistoryId)) {
            overlayHistory.close(overlayHistoryId);
            return;
        }
        closeModal();
    };

    const closeAfterUpload = () => {
        closeWithoutPrompt = true;
        requestOverlayClose();
    };

    closeBtn.onclick = requestOverlayClose;
    cancelBtn.onclick = requestOverlayClose;

    discardBtn.onclick = async () => {
        if (!recoveredUploadRecord || recoveredUploadRecord.status === "uploaded") return;
        if (!confirm("Se descartará la sesión local de subida. Los bytes ya recibidos por YouTube no se eliminarán automáticamente.")) return;
        try {
            await deleteYouTubeUploadRecord_(recoveredUploadRecord.opVideoId);
            clearYouTubeOperationContext_(recoveredUploadRecord.storageKey, recoveredUploadRecord.opVideoId);
            recoveredUploadRecord = null;
            fileInput.disabled = false;
            fileInput.required = true;
            titleInput.disabled = false;
            descInput.disabled = false;
            fileInput.value = "";
            titleInput.value = String(initialTitle || "").slice(0, 100);
            descInput.value = String(initialDescription || "").slice(0, 5000);
            fileInfo.textContent = "Formatos recomendados: MP4, WebM, MOV.";
            resumeNote.style.display = "none";
            discardBtn.style.display = "none";
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Iniciar Subida';
        } catch (error) {
            alert("No se pudo descartar la sesión: " + error.message);
        }
    };

    form.onsubmit = async event => {
        event.preventDefault();
        if (isUploading) return;
        try { await recoveryLookupPromise; }
        catch (error) { recoveryLookupError = error; }
        if (recoveryLookupError) {
            alert("No se pudo comprobar el estado de recuperación. La subida se detuvo para evitar duplicados: " + recoveryLookupError.message);
            return;
        }

        const file = recoveredUploadRecord ? recoveredUploadRecord.file : (fileInput.files && fileInput.files[0]);
        const recoveredAlreadyUploaded = hasCompletedYouTubeUpload_(recoveredUploadRecord);
        if (!file && !recoveredAlreadyUploaded) {
            alert("Por favor selecciona un archivo de vídeo.");
            return;
        }
        const title = String(recoveredUploadRecord ? recoveredUploadRecord.title : titleInput.value).trim();
        const description = String(recoveredUploadRecord ? recoveredUploadRecord.description : descInput.value).trim();
        if (!title) { alert("Por favor ingresa un título para el vídeo."); return; }
        if (file && !Number(file.size || 0)) { alert("El archivo de vídeo está vacío o no se puede leer."); return; }

        isUploading = true;
        uploadCancelled = false;
        fileInput.disabled = true;
        titleInput.disabled = true;
        descInput.disabled = true;
        submitBtn.disabled = true;
        discardBtn.disabled = true;
        submitBtn.style.display = "none";
        progressContainer.style.display = "flex";

        const userSnapshot = getState().currentUser;
        const userId = String(userSnapshot && userSnapshot.ID || "").trim();
        const sessionToken = String(userSnapshot && userSnapshot.SessionToken || "").trim();
        let operationContext = null;
        let uploadRecord = recoveredUploadRecord;

        try {
            if (!userId || !sessionToken) throw new Error("Debes iniciar sesión nuevamente antes de subir un vídeo.");
            const validation = await routeAction("validateSession", { userId, sessionToken });
            if (!validation || validation.valid !== true) throw new Error("La sesión no es válida o ha expirado. Inicia sesión nuevamente.");
            const latestUser = getState().currentUser;
            if (!latestUser || String(latestUser.ID || "").trim() !== userId || latestUser.SessionToken !== sessionToken) {
                throw new Error("La sesión cambió durante la preparación de la subida. Vuelve a intentarlo.");
            }
            if (uploadCancelled) throw new Error("La subida fue pausada por el usuario.");

            if (uploadRecord) {
                if (String(uploadRecord.userId) !== userId || String(uploadRecord.referenceId) !== String(referenceId) ||
                    String(uploadRecord.contentType) !== String(contentType) ||
                    (!uploadRecord.file && !recoveredAlreadyUploaded)) {
                    throw new Error("La sesión recuperada no coincide con el usuario o destino actual.");
                }
                operationContext = { opVideoId: uploadRecord.opVideoId, storageKey: uploadRecord.storageKey };
            } else {
                operationContext = getYouTubeOperationContext_(userId, contentType, referenceId, title);
            }
            let opVideoId = operationContext.opVideoId;

            const previousOperation = await routeAction("getVideoApprovalByOperation", { opVideoId, userId, sessionToken });
            if (uploadCancelled) throw new Error("La subida fue pausada por el usuario.");
            if (previousOperation && previousOperation.found) {
                if (previousOperation.approvalStatus === "pending") {
                    if (uploadRecord) await deleteYouTubeUploadRecord_(opVideoId);
                    clearYouTubeOperationContext_(operationContext.storageKey, opVideoId);
                    isUploading = false;
                    closeAfterUpload();
                    if (typeof onSuccess === "function") onSuccess({
                        videoUrl: previousOperation.videoUrl, opVideoId, status: "pending", alreadySubmitted: true
                    });
                    return;
                }
                if (previousOperation.approvalStatus === "approved") {
                    if (uploadRecord) await deleteYouTubeUploadRecord_(opVideoId);
                    clearYouTubeOperationContext_(operationContext.storageKey, opVideoId);
                    isUploading = false;
                    closeAfterUpload();
                    alert("Esta operación ya fue aprobada. No se inició una segunda subida.");
                    return;
                }
                if (previousOperation.approvalStatus === "rejected") {
                    if (uploadRecord) await deleteYouTubeUploadRecord_(opVideoId);
                    clearYouTubeOperationContext_(operationContext.storageKey, opVideoId);
                    recoveredUploadRecord = null;
                    throw new Error("La solicitud anterior fue rechazada. Selecciona un archivo nuevo para crear otra operación.");
                }
                throw new Error("La operación anterior está en un estado que requiere revisión; no se iniciará otra subida.");
            }

            if (!uploadRecord) {
                progressStatus.textContent = "Inicializando sesión reanudable con YouTube...";
                const initRes = await routeAction("initYouTubeUpload", {
                    title, description, contentType, referenceId, metadata,
                    fileName: file.name, fileSize: file.size, fileType: file.type || "video/mp4",
                    opVideoId, userId, sessionToken
                });
                if (uploadCancelled) throw new Error("La subida fue pausada por el usuario.");
                if (!initRes || initRes.status !== "success" || initRes.opVideoId !== opVideoId || !initRes.uploadUrl) {
                    throw new Error((initRes && initRes.message) || "No se pudo establecer una sesión reanudable con YouTube.");
                }
                uploadRecord = {
                    opVideoId, storageKey: operationContext.storageKey,
                    userId, contentType, referenceId: String(referenceId),
                    title, description, metadata: metadata || {},
                    file, fileName: file.name || "video", fileSize: file.size,
                    fileType: file.type || "video/mp4", uploadUrl: initRes.uploadUrl,
                    bytesUploaded: 0, status: "new", createdAt: Date.now(), updatedAt: Date.now()
                };
                await saveYouTubeUploadRecord_(uploadRecord);
                recoveredUploadRecord = uploadRecord;
            }

            let finalVideoId = String(uploadRecord.videoId || "");
            if (!/^[A-Za-z0-9_-]{11}$/.test(finalVideoId)) {
                progressStatus.textContent = "Transfiriendo y verificando bloques...";
                try {
                    finalVideoId = await uploadYouTubeFileResumable_(
                        uploadRecord,
                        (sent, total) => {
                            const percent = Math.min(95, 5 + Math.round((sent / total) * 90));
                            progressBar.style.width = percent + "%";
                            progressPercent.textContent = percent + "%";
                        },
                        xhr => { activeXhr = xhr; },
                        () => uploadCancelled,
                        async record => {
                            record.updatedAt = Date.now();
                            await saveYouTubeUploadRecord_(record);
                        }
                    );
                } catch (uploadError) {
                    if (uploadError && uploadError.code === "YOUTUBE_SESSION_EXPIRED") {
                        progressStatus.textContent = "Renovando sesión de YouTube...";
                        const initRes = await routeAction("initYouTubeUpload", {
                            title: uploadRecord.title, description: uploadRecord.description,
                            contentType, referenceId, metadata: uploadRecord.metadata,
                            fileName: uploadRecord.fileName, fileSize: uploadRecord.fileSize,
                            fileType: uploadRecord.fileType, opVideoId, userId, sessionToken
                        });
                        if (!initRes || initRes.status !== "success" || !initRes.uploadUrl || initRes.opVideoId !== opVideoId) throw new Error("La sesión de YouTube expiró y no pudo renovarse.");
                        uploadRecord.uploadUrl = initRes.uploadUrl;
                        uploadRecord.bytesUploaded = 0;
                        uploadRecord.status = "new";
                        await saveYouTubeUploadRecord_(uploadRecord);
                        finalVideoId = await uploadYouTubeFileResumable_(
                            uploadRecord,
                            (sent, total) => {
                                const percent = Math.min(95, 5 + Math.round((sent / total) * 90));
                                progressBar.style.width = percent + "%";
                                progressPercent.textContent = percent + "%";
                            },
                            xhr => { activeXhr = xhr; },
                            () => uploadCancelled,
                            async record => { record.updatedAt = Date.now(); await saveYouTubeUploadRecord_(record); }
                        );
                    } else {
                        throw uploadError;
                    }
                }
            }

            if (!finalVideoId || !/^[A-Za-z0-9_-]{11}$/.test(finalVideoId)) throw new Error("YouTube no confirmó un ID real de vídeo.");
            uploadRecord.videoId = finalVideoId;
            uploadRecord.bytesUploaded = uploadRecord.fileSize;
            uploadRecord.status = "uploaded";
            uploadRecord.updatedAt = Date.now();
            await saveYouTubeUploadRecord_(uploadRecord);

            progressStatus.textContent = "Enviando solicitud de aprobación...";
            progressBar.style.width = "98%";
            progressPercent.textContent = "98%";
            const videoUrl = "https://www.youtube.com/watch?v=" + finalVideoId;
            if (uploadCancelled) throw new Error("La subida fue pausada antes de enviar la aprobación.");
            const submitRes = await routeAction("submitVideoForApproval", {
                opVideoId, title: uploadRecord.title, description: uploadRecord.description,
                contentType, referenceId, metadata: uploadRecord.metadata,
                videoId: finalVideoId, videoUrl, userId, sessionToken
            });
            if (!submitRes || submitRes.status !== "success" || submitRes.videoUrl !== videoUrl || submitRes.opVideoId !== opVideoId) {
                throw new Error("El servidor no confirmó la solicitud. El archivo y su ID quedaron guardados para reintentar sin volver a subirlo.");
            }
            if (uploadCancelled) throw new Error("La solicitud pudo haberse enviado; el identificador se conserva para recuperar su estado.");

            try { await deleteYouTubeUploadRecord_(opVideoId); }
            catch (cleanupError) { console.warn("La solicitud fue guardada, pero el registro local no se pudo limpiar:", cleanupError); }
            clearYouTubeOperationContext_(operationContext.storageKey, opVideoId);
            recoveredUploadRecord = null;
            progressBar.style.width = "100%";
            progressPercent.textContent = "100%";
            progressStatus.textContent = "Vídeo enviado a aprobación.";
            isUploading = false;
            closeAfterUpload();
            alert("Vídeo transferido a YouTube como no listado. Se creó la solicitud de aprobación; aparecerá en GPSpedia únicamente después de aprobarse.");
            if (typeof onSuccess === "function") onSuccess({
                title: uploadRecord.title, description: uploadRecord.description,
                videoUrl, opVideoId, status: "pending"
            });
        } catch (error) {
            console.error("Error en subida de vídeo:", error);
            if (uploadRecord) {
                uploadRecord.status = uploadCancelled ? "paused" : "interrupted";
                uploadRecord.updatedAt = Date.now();
                try { await saveYouTubeUploadRecord_(uploadRecord); recoveredUploadRecord = uploadRecord; }
                catch (saveError) { console.error("No se pudo guardar el último punto de recuperación:", saveError); }
            }
            isUploading = false;
            if (!uploadCancelled) {
                alert("Error durante la subida del vídeo: " + error.message);
                fileInput.disabled = Boolean(recoveredUploadRecord);
                fileInput.required = !recoveredUploadRecord;
                titleInput.disabled = Boolean(recoveredUploadRecord);
                descInput.disabled = Boolean(recoveredUploadRecord);
                submitBtn.disabled = false;
                submitBtn.style.display = "block";
                submitBtn.innerHTML = recoveredUploadRecord
                    ? '<i class="fa-solid fa-rotate"></i> Reanudar subida'
                    : '<i class="fa-solid fa-cloud-arrow-up"></i> Iniciar Subida';
                closeBtn.style.display = "block";
                discardBtn.disabled = false;
                discardBtn.style.display = recoveredUploadRecord && recoveredUploadRecord.status !== "uploaded" ? "inline-flex" : "none";
                progressContainer.style.display = "none";
                if (recoveredUploadRecord) {
                    resumeNote.textContent = "La transferencia se conservó en este dispositivo. Puedes reanudarla sin volver a seleccionar el archivo.";
                    resumeNote.style.display = "block";
                }
            }
        } finally {
            activeXhr = null;
        }
    };
}

