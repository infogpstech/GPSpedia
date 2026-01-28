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
        lightbox.style.opacity = ''; // Asegurar que el estilo inline no interfiera con la apertura
        lightbox.classList.add('visible');
    }
}

/**
 * Cierra el lightbox de imágenes y restablece el zoom de forma robusta.
 * El reset visual ocurre MIENTRAS el lightbox sigue visible (permitido por JS).
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Iniciamos el desvanecimiento visual inmediato (usando estilo inline)
    lightbox.style.opacity = '0';

    // 2. Restaurar zoom a su valor por defecto (viewport + estilos)
    // Se ejecuta mientras .visible sigue presente para que los listeners de main.js permitan el snap.
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // Forzamos el reset visual del navegador a escala 1.0
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Reset de transformaciones en las imágenes para una salida fluida
    const imgs = lightbox.querySelectorAll('img');
    imgs.forEach(img => {
        img.style.transform = 'scale(0.95)';
    });

    // 3. Delay para que el navegador procese el reset visual (zoom 1.0)
    // antes de que el lightbox se oculte por completo y los bloqueos de zoom se reactiven.
    setTimeout(() => {
        // 4. Cerrar el lightbox oficialmente
        lightbox.classList.remove('visible');
        lightbox.style.opacity = ''; // Limpiar el estilo inline tras cerrar

        // 5. Restaurar el meta tag original según la página actual
        const isAddCortes = window.location.pathname.includes('add_cortes.html');
        if (viewport) {
            if (isAddCortes) {
                // add_cortes.html bloquea zoom por defecto en su HTML
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            } else {
                // index.html permite zoom por defecto (pero main.js lo bloquea condicionalmente)
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
            }
        }

        // Limpiar estilos inline de imágenes
        imgs.forEach(img => {
            img.style.transform = '';
        });
    }, 250); // Delay sincronizado con la transición CSS (0.3s)
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
