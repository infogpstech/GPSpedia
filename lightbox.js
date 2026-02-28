// lightbox.js | Version: 2.1
// Responsibilities:
// - Manage the application's lightbox for image zooming.
// - Handle viewport meta tags to allow/restrict zoom dynamically.
// - Integrate with the History API for back-button support.

/**
 * Abre el lightbox con la imagen especificada.
 * @param {string} url - La URL de la imagen a mostrar.
 * @param {string} imgId - (Opcional) El ID del elemento <img> dentro del lightbox.
 */
function abrirLightbox(url, imgId = 'lightboxImg') {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById(imgId) || document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    const viewport = document.querySelector('meta[name="viewport"]');

    if (!lightbox || !lightboxImg) return;

    lightboxImg.src = url;

    // Permitir zoom al abrir el lightbox
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }

    lightbox.classList.add('visible');

    // Integración con History API
    if (window.history && window.history.pushState) {
        window.history.pushState({ lightboxOpen: true }, '');
    }
}

/**
 * Cierra el lightbox de imágenes y restaura el zoom.
 */
function cerrarLightbox(isFromPopState = false) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox ? (lightbox.querySelector('img') || document.getElementById('lightboxImg') || document.getElementById('lightbox-img')) : null;
    const viewport = document.querySelector('meta[name="viewport"]');

    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Forzar restauración de escala visual 1.0
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // 2. Limpiar estilos agresivamente para evitar que el zoom persista en la imagen
    if (lightboxImg) {
        lightboxImg.style.transform = '';
        lightboxImg.style.zoom = '';
        lightboxImg.style.webkitTransform = '';
    }

    // 3. Secuencia de cierre temporizada para permitir que el navegador re-escale
    setTimeout(() => {
        lightbox.classList.remove('visible');
    }, 100);

    // 4. Restauración final y actualización de layout
    setTimeout(() => {
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
        if (typeof window.handleViewportChange === 'function') {
            window.handleViewportChange();
        }
    }, 500);

    // Si cerramos manualmente (no desde popstate), quitamos el estado del historial
    if (!isFromPopState && window.history && window.history.state && window.history.state.lightboxOpen) {
        window.history.back();
    }
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
