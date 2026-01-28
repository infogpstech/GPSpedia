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
            viewport.dataset.originalContent = viewport.content;
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes';
        }
    }
}

/**
 * Cierra el lightbox de imágenes de forma controlada y restaura la escala visual.
 * Emplea una secuencia asíncrona para garantizar que el navegador resetee el zoom.
 */
async function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Limpieza de estilos de la imagen
    const img = lightbox.querySelector('img');
    if (img) {
        img.style.transform = '';
        img.style.webkitTransform = '';
    }

    // 2. Reset de escala visual mediante Meta Tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // Forzamos escala 1.0 y bloqueamos el zoom momentáneamente
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

        // Centramos el viewport
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        // 3. Esperar a que el motor de renderizado complete el zoom-out nativo
        // Sin este retardo, la ocultación del DOM (visible -> hidden) ocurre antes
        // de que el navegador procese el reset de escala.
        await new Promise(resolve => setTimeout(resolve, 400));

        // 4. Restaurar el meta tag original o el guardado
        viewport.content = viewport.dataset.originalContent || 'width=device-width, initial-scale=1.0';
    }

    // 5. Ocultar finalmente el contenedor
    lightbox.classList.remove('visible');

    // 6. Invocación de recálculo de layout global
    if (typeof window.handleViewportChange === 'function') {
        window.handleViewportChange();
    }
}

// Exponer funciones al ámbito global para compatibilidad con handlers inline
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
