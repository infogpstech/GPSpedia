// lightbox.js

/**
 * Abre el lightbox con la imagen proporcionada.
 * Centraliza la lógica para index.html y add_cortes.html.
 * @param {string} url - URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const img = document.querySelector('#lightbox img');
    if (lightbox && img) {
        img.src = url;
        lightbox.classList.add('visible');

        // Asegurar que el viewport permita zoom mientras está abierto
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && !viewport.content.includes('user-scalable=yes')) {
            // Guardamos el contenido original si no está guardado
            if (!viewport.dataset.originalContent) {
                viewport.dataset.originalContent = viewport.content;
            }
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes';
        }
    }
}

/**
 * Cierra el lightbox de imágenes de forma controlada y restaura la escala visual.
 * Emplea una actualización directa del meta tag viewport para forzar el reset del zoom nativo.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Limpieza inmediata de estilos de la imagen para evitar interferencias
    const img = lightbox.querySelector('img');
    if (img) {
        img.style.transform = '';
        img.style.webkitTransform = '';
        img.style.zoom = '';
    }

    // 2. Reset de escala visual mediante Meta Tag Update
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const originalContent = viewport.dataset.originalContent || 'width=device-width, initial-scale=1.0';

        // Forzamos escala 1.0 bloqueando zoom temporalmente
        // El navegador ajustará la escala visual para cumplir con maximum-scale=1.0
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

        // 3. Ocultar el lightbox tras un breve retraso para permitir el procesamiento del cambio
        // Se aumenta a 100ms para mayor estabilidad frente a 50ms previos
        setTimeout(() => {
            lightbox.classList.remove('visible');
        }, 100);

        // 4. Restauración diferida del estado original (500ms)
        setTimeout(() => {
            viewport.content = originalContent;

            // Invocación de recálculo de layout global (Zoom-Agnostic)
            if (typeof window.handleViewportChange === 'function') {
                window.handleViewportChange();
            }
        }, 500);
    } else {
        // Fallback si no hay meta viewport
        lightbox.classList.remove('visible');
    }
}

// Exponer funciones al ámbito global
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
