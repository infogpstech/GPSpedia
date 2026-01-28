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
        lightbox.style.pointerEvents = '';
        lightbox.classList.add('visible');
    }
}

/**
 * Función auxiliar para forzar la actualización del viewport del navegador.
 */
function updateViewportMeta(content) {
    let meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
        meta.setAttribute('content', content);
        // Algunos navegadores requieren re-insertar el tag para notar el cambio de zoom
        const parent = meta.parentNode;
        const next = meta.nextSibling;
        parent.removeChild(meta);
        if (next) parent.insertBefore(meta, next);
        else parent.appendChild(meta);
    }
}

/**
 * Cierra el lightbox de imágenes y restablece el zoom de forma robusta.
 * El reset visual ocurre MIENTRAS el lightbox sigue visible.
 */
function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('visible')) return;

    // 1. Iniciamos el desvanecimiento visual inmediato
    lightbox.style.opacity = '0';
    lightbox.style.pointerEvents = 'none';

    // 2. Restaurar zoom a su valor por defecto (viewport + estilos)
    // Se ejecuta mientras .visible sigue presente para que los listeners de main.js permitan el snap.
    updateViewportMeta('width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no');

    // Reset de transformaciones en las imágenes
    const imgs = lightbox.querySelectorAll('img');
    imgs.forEach(img => {
        img.style.transform = 'scale(0.95)';
    });

    // 3. Delay para que el navegador procese el reset visual (zoom 1.0)
    // antes de que el lightbox se oculte por completo y los bloqueos de zoom se reactiven.
    setTimeout(() => {
        // 4. Cerrar el lightbox oficialmente
        lightbox.classList.remove('visible');
        lightbox.style.opacity = '';
        lightbox.style.pointerEvents = '';

        // 5. Restaurar el meta tag original según la página actual
        const isAddCortes = window.location.pathname.includes('add_cortes.html');
        const originalContent = isAddCortes ?
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' :
            'width=device-width, initial-scale=1.0';

        updateViewportMeta(originalContent);

        // Limpiar estilos inline de imágenes
        imgs.forEach(img => {
            img.style.transform = '';
        });
    }, 300); // Delay optimizado para snap del navegador
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
