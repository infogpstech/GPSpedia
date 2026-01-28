// lightbox.js

/**
 * Abre el lightbox con la imagen proporcionada.
 * Centraliza la lógica para index.html y add_cortes.html.
 * @param {string} url - URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    if (lightbox && img) {
        img.src = url;
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes y restaura la escala visual del navegador.
 * Emplea la técnica de 'Meta Tag Reinsertion' para forzar el reset del zoom.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    // 1. Reset de escala visual mediante Meta Tag Reinsertion
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const originalContent = viewport.content;
        // Forzamos escala 1.0 y bloqueamos zoom temporalmente para obligar al navegador a recalcular
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

        // Forzar reflow del DOM
        document.body.offsetHeight;

        // Restaurar el viewport original tras un breve retardo para permitir la transición visual
        setTimeout(() => {
            viewport.content = originalContent;
            // Invocar el recálculo de layout global si está disponible
            if (typeof window.handleViewportChange === 'function') {
                window.handleViewportChange();
            }
        }, 400);
    }

    // 2. Limpieza agresiva de estilos en la imagen para evitar persistencia de zoom/transform
    const img = lightbox.querySelector('img');
    if (img) {
        img.style.transform = '';
        img.style.zoom = '';
        img.style.webkitTransform = '';
    }

    // 3. Ocultar el contenedor del lightbox
    lightbox.classList.remove('visible');
}

// Hacemos las funciones globalmente accesibles para compatibilidad con handlers inline
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
