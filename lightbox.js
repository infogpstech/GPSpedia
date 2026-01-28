// lightbox.js

/**
 * Abre el lightbox de imágenes.
 * La habilitación del zoom se maneja de forma reactiva vía MutationObserver.
 * @param {string} url - URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const imgNormal = document.getElementById('lightboxImg');
    const imgCortes = document.getElementById('lightbox-img');

    const activeImg = imgNormal || imgCortes;
    if (activeImg) {
        activeImg.src = url;
    }

    if (lightbox) {
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes.
 * El restablecimiento del zoom se maneja de forma reactiva vía MutationObserver.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('visible');
    }
}

/**
 * Inicializa el observador reactivo para el lightbox.
 * Detecta cambios en la visibilidad y gestiona dinámicamente el viewport y el reset de estilos.
 */
function initLightboxObserver() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const isVisible = lightbox.classList.contains('visible');
                const viewport = document.querySelector('meta[name="viewport"]');

                if (!isVisible) {
                    // --- RESET DE ZOOM (REACTIVO) ---
                    if (viewport) {
                        // Forzamos el reset del nivel de zoom restableciendo el viewport
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                    }

                    // Limpieza explícita de estilos de zoom/transformación en las imágenes
                    const imgs = lightbox.querySelectorAll('img');
                    imgs.forEach(img => {
                        img.style.transform = '';
                        img.style.scale = '';
                    });
                } else {
                    // --- HABILITACIÓN DE ZOOM ---
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes');
                    }
                }
            }
        });
    });

    observer.observe(lightbox, { attributes: true });
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;

// Inicialización del observador al cargar el script
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initLightboxObserver();
} else {
    document.addEventListener('DOMContentLoaded', initLightboxObserver);
}
