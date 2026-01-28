// lightbox.js

/**
 * Abre el lightbox de imágenes.
 * @param {string} url - URL de la imagen a mostrar.
 */
function abrirLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const imgNormal = document.getElementById('lightboxImg');
    const imgCortes = document.getElementById('lightbox-img');

    // Habilitar zoom permitiendo escalado en el viewport
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
 * Cierra el lightbox de imágenes y restablece el zoom de forma robusta.
 * Sigue el flujo: 1. Reset zoom -> 2. Esperar frame -> 3. Cerrar.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Restaurar zoom a su valor por defecto (viewport + estilos)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // Establecemos escalas fijas y prohibimos zoom para forzar el reset visual a 1.0
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Limpieza explícita de estilos de transformación en las imágenes
    const imgs = lightbox.querySelectorAll('img');
    imgs.forEach(img => {
        img.style.transform = '';
        img.style.scale = '';
    });

    // 2. Esperar un breve lapso (frame) para que el navegador procese el cambio de viewport
    // mientras el lightbox sigue 'visible' (evitando que los listeners de main.js bloqueen el proceso)
    setTimeout(() => {
        // 3. Cerrar el lightbox
        lightbox.classList.remove('visible');
    }, 50);
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
