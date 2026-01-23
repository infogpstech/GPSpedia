// lightbox.js

/**
 * Cierra el lightbox de imágenes.
 * Esta función se adjunta al objeto `window` para que sea accesible
 * desde el atributo `onclick` en el HTML, resolviendo el problema de
 * ámbito (scope) de los módulos de JavaScript.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('visible');
    }
}

// Hacemos la función globalmente accesible
window.cerrarLightbox = cerrarLightbox;
