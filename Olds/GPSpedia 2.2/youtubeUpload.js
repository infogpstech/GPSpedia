// GPSpedia Centralized YouTube Video Upload Module | Version: 2.3.0
// ============================================================================
// Lógica unificada para la carga directa de vídeos a YouTube con aprobación previa
// ============================================================================

import { routeAction } from './api-config.js';
import { getState } from './state.js';

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
export function openYouTubeUploadModal(options = {}) {
    const {
        initialTitle = '',
        initialDescription = '',
        contentType = 'corte',
        referenceId = null,
        metadata = {},
        onSuccess = null
    } = options;

    const existing = document.getElementById('youtube-upload-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'youtube-upload-modal';
    modal.className = 'info-modal visible';
    modal.style.zIndex = '2500';

    const content = document.createElement('div');
    content.className = 'info-modal-content';
    content.style.maxWidth = '550px';

    content.innerHTML = `
        <span class="info-close-btn" id="yt-modal-close-btn">&times;</span>
        <h2 style="display:flex; align-items:center; gap:8px;">
            <i class="fa-brands fa-youtube" style="color:#ff0000;"></i> Subir Vídeo a YouTube
        </h2>
        <p style="font-size:0.85em; color:var(--text-disabled); margin-bottom:12px;">
            El vídeo se subirá como «No listado» y requerirá aprobación previa antes de publicarse en GPSpedia.
        </p>

        <form id="yt-upload-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
                <label for="yt-video-file" style="font-weight:600;">Seleccionar Archivo de Vídeo <span style="color:#dc3545;">*</span></label>
                <input type="file" id="yt-video-file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*" required style="padding:6px;">
                <small id="yt-file-info" style="font-size:0.75rem; color:var(--text-disabled); margin-top:2px;">Formatos recomendados: MP4, WebM, MOV.</small>
            </div>

            <div class="form-group">
                <label for="yt-video-title" style="font-weight:600;">Título del Vídeo <span style="color:#dc3545;">*</span></label>
                <input type="text" id="yt-video-title" maxlength="100" required value="${initialTitle.replace(/"/g, '&quot;')}" placeholder="Título descriptivo...">
            </div>

            <div class="form-group">
                <label for="yt-video-desc" style="font-weight:600;">Detalle / Descripción</label>
                <textarea id="yt-video-desc" rows="4" maxlength="5000" placeholder="Descripción del contenido...">${initialDescription}</textarea>
            </div>

            <!-- Parámetros fijos obligatorios no editables -->
            <div style="background:var(--card-bg, #f8f9fa); border:1px solid var(--border-color, #e9ecef); border-radius:6px; padding:10px; font-size:0.8rem; color:var(--text-disabled);">
                <strong><i class="fa-solid fa-lock"></i> Configuración de Publicación (Fija):</strong>
                <ul style="margin:4px 0 0 18px; padding:0; list-style-type:disc;">
                    <li>Visibilidad: <strong>No listado</strong></li>
                    <li>Audiencia: <strong>No es contenido para niños</strong></li>
                    <li>Promoción pagada / IA sintética: <strong>No</strong></li>
                    <li>Remixes / Etiquetas: <strong>Deshabilitados</strong></li>
                </ul>
            </div>

            <!-- Zona de Progreso y Advertencia ineludible (Oculta inicialmente) -->
            <div id="yt-upload-progress-container" style="display:none; flex-direction:column; gap:8px; margin-top:6px; border-top:1px dashed var(--border-color, #ddd); padding-top:10px;">
                <div style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; border-radius:6px; padding:10px; font-size:0.85rem; font-weight:600; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Por favor, no abandone este diálogo mientras carga el vídeo.
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

    const closeBtn = content.querySelector('#yt-modal-close-btn');
    const cancelBtn = content.querySelector('#yt-cancel-btn');
    const form = content.querySelector('#yt-upload-form');
    const fileInput = content.querySelector('#yt-video-file');
    const titleInput = content.querySelector('#yt-video-title');
    const descInput = content.querySelector('#yt-video-desc');
    const submitBtn = content.querySelector('#yt-submit-btn');

    const progressContainer = content.querySelector('#yt-upload-progress-container');
    const progressBar = content.querySelector('#yt-progress-bar');
    const progressPercent = content.querySelector('#yt-progress-percent');
    const progressStatus = content.querySelector('#yt-progress-status');

    let isUploading = false;
    let uploadCancelled = false;
    let activeXhr = null;

    const closeModal = () => {
        if (isUploading) {
            if (!confirm("Hay una carga de vídeo activa. ¿Deseas cancelarla?")) {
                return;
            }
            uploadCancelled = true;
            if (activeXhr) activeXhr.abort();
        }
        modal.remove();
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();

        if (isUploading) return; // Prevención de cargas duplicadas

        const file = fileInput.files[0];
        if (!file) {
            alert("Por favor selecciona un archivo de vídeo.");
            return;
        }

        const title = titleInput.value.trim();
        if (!title) {
            alert("Por favor ingresa un título para el vídeo.");
            return;
        }

        const description = descInput.value.trim();

        // Bloquear controles durante la operación
        isUploading = true;
        uploadCancelled = false;
        fileInput.disabled = true;
        titleInput.disabled = true;
        descInput.disabled = true;
        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
        closeBtn.style.display = 'none'; // Deshabilitar cierre accidental
        progressContainer.style.display = 'flex';

        const { currentUser } = getState();
        const userName = currentUser ? (currentUser.Nombre_Completo || currentUser.Nombre_Usuario) : 'Usuario';
        const userId = currentUser ? currentUser.id : null;

        try {
            // FASE 1: Inicialización de la sesión de subida / Registro de operación
            progressStatus.innerText = "Inicializando sesión con YouTube...";
            progressBar.style.width = "5%";
            progressPercent.innerText = "5%";

            // Llamada al microservicio para orquestar la subida
            const initRes = await routeAction('initYouTubeUpload', {
                title,
                description,
                contentType,
                referenceId,
                metadata,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                userName,
                userId
            });

            if (uploadCancelled) return;

            // FASE 2: Transferencia de bytes (Direct Resumable Upload o Simulación controlada por API)
            // Si el backend entrega una upload_url de YouTube Resumable Upload:
            const uploadUrl = initRes && initRes.uploadUrl ? initRes.uploadUrl : null;
            let finalVideoId = initRes && initRes.videoId ? initRes.videoId : null;

            if (!uploadUrl) {
                throw new Error("No se pudo establecer la sesión directa con YouTube Data API v3. Verifica la configuración de OAuth 2.0 en Google Cloud Console.");
            }

            progressStatus.innerText = "Transfiriendo archivo a YouTube...";
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                activeXhr = xhr;
                xhr.open("PUT", uploadUrl, true);
                xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

                xhr.upload.onprogress = (ev) => {
                    if (uploadCancelled) {
                        xhr.abort();
                        return reject(new Error("Carga cancelada por el usuario."));
                    }
                    if (ev.lengthComputable) {
                        const percent = Math.round((ev.loaded / ev.total) * 90) + 5; // 5% a 95%
                        progressBar.style.width = `${percent}%`;
                        progressPercent.innerText = `${percent}%`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const resp = JSON.parse(xhr.responseText);
                            finalVideoId = resp.id || finalVideoId;
                            resolve(resp);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        reject(new Error(`Error al transferir a YouTube (HTTP ${xhr.status})`));
                    }
                };

                xhr.onerror = () => reject(new Error("Fallo de conexión durante la subida a YouTube."));
                xhr.onabort = () => reject(new Error("Carga cancelada."));
                xhr.send(file);
            });

            if (uploadCancelled) return;

            // FASE 3: Notificación y creación de solicitud de aprobación en Inbox
            progressStatus.innerText = "Verificando en YouTube y enviando a aprobación...";
            progressBar.style.width = "98%";
            progressPercent.innerText = "98%";

            const submitRes = await routeAction('submitVideoForApproval', {
                title,
                description,
                contentType,
                referenceId,
                metadata,
                videoId: finalVideoId || ('yt_' + Date.now()),
                videoUrl: finalVideoId ? `https://www.youtube.com/watch?v=${finalVideoId}` : `https://youtu.be/pending_${Date.now()}`,
                userName,
                userId
            });

            progressBar.style.width = "100%";
            progressPercent.innerText = "100%";
            progressStatus.innerText = "¡Vídeo subido con éxito!";

            alert("Vídeo subido exitosamente a YouTube (No listado).\n\nSe ha creado una solicitud de aprobación en el Inbox. El vídeo aparecerá en GPSpedia una vez sea aprobado por el equipo de supervisión.");

            modal.remove();

            if (typeof onSuccess === 'function') {
                onSuccess({
                    title,
                    description,
                    videoUrl: submitRes.videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
                    status: 'pending'
                });
            }

        } catch (err) {
            console.error("Error en subida de vídeo:", err);
            if (!uploadCancelled) {
                alert("Error durante la subida del vídeo: " + err.message);
                // Restaurar controles si hubo error no cancelado
                isUploading = false;
                fileInput.disabled = false;
                titleInput.disabled = false;
                descInput.disabled = false;
                submitBtn.disabled = false;
                submitBtn.style.display = 'block';
                closeBtn.style.display = 'block';
                progressContainer.style.display = 'none';
            }
        }
    };
}
