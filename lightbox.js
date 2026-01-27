// lightbox.js

/**
 * Abre el lightbox de imágenes y habilita el zoom.
 * @param {string} url - URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const imgNormal = document.getElementById('lightboxImg');
    const imgCortes = document.getElementById('lightbox-img');

    // Cambiar el viewport para permitir zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes');
    }

    const activeImg = imgNormal || imgCortes;
    if (activeImg) {
        activeImg.src = url;
    }

    if (lightbox) {
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes y restablece el zoom.
 * Esta función se adjunta al objeto `window` para que sea accesible
 * desde el atributo `onclick` en el HTML, resolviendo el problema de
 * ámbito (scope) de los módulos de JavaScript.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    const imgNormal = document.getElementById('lightboxImg');
    const imgCortes = document.getElementById('lightbox-img');

    if (lightbox) {
        lightbox.classList.remove('visible');
    }

    // Restablecer el viewport para bloquear zoom y resetear el nivel de zoom del navegador
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Limpiar estilos de transform y scale para asegurar el reset visual
    [imgNormal, imgCortes].forEach(img => {
        if (img) {
            img.style.transform = '';
            img.style.scale = '';
        }
    });
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
