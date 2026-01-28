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
    }

    // 4. Mostrar lightbox
    if (lightbox) {
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes y restaura la escala visual por defecto.
 * Esta función se adjunta al objeto `window` para que sea accesible
 * desde el atributo `onclick` en el HTML.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    const viewport = document.querySelector('meta[name="viewport"]');

    // 1. Resetear el viewport MIENTRAS el lightbox sigue visible.
    // Usamos la técnica de "Meta Tag Reinsertion" para forzar al navegador
    // a aplicar el reset de escala visual (snap to 1.0).
    if (viewport) {
        const originalParent = viewport.parentNode;
        viewport.remove();
        // Forzamos el reset mediante maximum-scale=1.0
        viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
        originalParent.appendChild(viewport);
    }

    // 2. Limpiar estilos residuales de la imagen para evitar desbordamientos
    if (img) {
        img.style.transform = '';
        img.style.scale = '';
    }

    // 3. Esperar a que el motor de renderizado complete el zoom-out (aprox 300ms)
    // antes de ocultar el contenedor y reactivar los bloqueos globales.
    setTimeout(() => {
        if (lightbox) {
            lightbox.classList.remove('visible');
        }

        // 4. Restaurar el viewport EXACTO que tenía la página antes de abrir el lightbox.
        // Se hace después de ocultar para evitar que el usuario vea el salto visual
        // y para respetar las restricciones de zoom-blocking fuera del lightbox.
        setTimeout(() => {
            if (viewport && originalViewportContent !== null) {
                viewport.content = originalViewportContent;
            }
        }, 100);
    }, 300);
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
