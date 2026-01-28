// lightbox.js

let originalViewportContent = null;

/**
 * Abre el lightbox de imágenes y permite el zoom.
 * @param {string} url - La URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    const viewport = document.querySelector('meta[name="viewport"]');

    // 1. Guardar el estado original del viewport si no se ha guardado aún
    if (viewport && originalViewportContent === null) {
        originalViewportContent = viewport.content;
    }

    // 2. Habilitar zoom en el viewport
    if (viewport) {
        viewport.content = "width=device-width, initial-scale=1.0, user-scalable=yes";
    }

    // 3. Cargar imagen
    if (img && url) {
        img.src = url;
        // Asegurar que la imagen no tenga transformaciones previas
        img.style.transform = '';
        img.style.scale = '';
        img.style.zoom = '1';
    }

    // 4. Mostrar lightbox
    if (lightbox) {
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes y restaura la escala visual por defecto.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    const oldViewport = document.querySelector('meta[name="viewport"]');

    // 1. Resetear el viewport MIENTRAS el lightbox sigue visible.
    // Usamos una técnica agresiva de reemplazo de elemento para forzar el reset de escala.
    if (oldViewport) {
        const resetViewport = document.createElement('meta');
        resetViewport.name = "viewport";
        resetViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

        if (oldViewport.parentNode) {
            oldViewport.parentNode.replaceChild(resetViewport, oldViewport);
        }

        // Forzar reflow para que el navegador procese el cambio inmediatamente
        document.body.offsetHeight;
    }

    // 2. Limpiar estilos residuales de la imagen
    if (img) {
        img.style.transform = '';
        img.style.scale = '';
        img.style.zoom = '1';
        if (img.style.webkitTransform !== undefined) img.style.webkitTransform = '';
    }

    // 3. Esperar a que el motor complete el zoom-out (aprox 400ms para mayor seguridad)
    setTimeout(() => {
        if (lightbox) {
            lightbox.classList.remove('visible');
        }

        // 4. Restaurar el viewport original después de ocultar el lightbox
        setTimeout(() => {
            const currentViewport = document.querySelector('meta[name="viewport"]');
            if (currentViewport && originalViewportContent !== null) {
                const restoredViewport = document.createElement('meta');
                restoredViewport.name = "viewport";
                restoredViewport.content = originalViewportContent;
                if (currentViewport.parentNode) {
                    currentViewport.parentNode.replaceChild(restoredViewport, currentViewport);
                }
            }

            // Forzar actualización de layout si existe la función global de main.js
            if (window.handleViewportChange) {
                window.handleViewportChange();
            }
        }, 150);
    }, 400);
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
