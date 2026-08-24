// lightbox.js | Version: 2.1.6
// Responsibilities:
// - Manage the application's lightbox for image zooming.
// - Support navigation between multiple power cable images.
// - Handle viewport meta tags to allow/restrict zoom dynamically.
// - Integrate with the History API for back-button support.

let currentLightboxContext = null; // { cables: [{ url, label, content, ... }], currentIndex: number, onSlideChange: function }
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isMultiTouch = false;
let isZoomedOnStart = false;
let ignoreNextClick = false;
let lightboxInitialized = false;

/**
 * Determina el estado real de zoom en el lightbox.
 * Retorna true si la escala del visualViewport o la imagen es superior a la escala predeterminada.
 */
function isLightboxZoomed() {
    if (window.visualViewport && window.visualViewport.scale > 1.02) {
        return true;
    }
    const lightboxImg = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    if (lightboxImg && lightboxImg.style && lightboxImg.style.transform) {
        const match = lightboxImg.style.transform.match(/scale\(([^)]+)\)/);
        if (match) {
            const scaleVal = parseFloat(match[1]);
            if (!isNaN(scaleVal) && scaleVal > 1.02) return true;
        }
    }
    return false;
}

/**
 * Actualiza la visibilidad de los botones de navegación de acuerdo al contexto activo.
 */
function actualizarBotonesLightbox() {
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    if (!prevBtn || !nextBtn) return;

    if (!currentLightboxContext || !currentLightboxContext.cables || currentLightboxContext.cables.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }
}

/**
 * Navega hacia la imagen anterior (-1) o siguiente (+1) en el lightbox.
 */
function navegarLightbox(direction) {
    if (!currentLightboxContext || !currentLightboxContext.cables || currentLightboxContext.cables.length <= 1) {
        return;
    }
    const cables = currentLightboxContext.cables;
    const total = cables.length;
    let newIndex = (currentLightboxContext.currentIndex + direction) % total;
    if (newIndex < 0) newIndex += total;

    currentLightboxContext.currentIndex = newIndex;
    const activeCable = cables[newIndex];

    const lightboxImg = document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    if (lightboxImg && activeCable && activeCable.url) {
        lightboxImg.src = "";
        lightboxImg.src = activeCable.url;
    }

    if (typeof currentLightboxContext.onSlideChange === 'function') {
        currentLightboxContext.onSlideChange(newIndex);
    }

    actualizarBotonesLightbox();
}

/**
 * Inicializa los listeners de eventos para el lightbox (clics, botones y gestos táctiles).
 */
function initLightboxEvents() {
    if (lightboxInitialized) return;
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    lightboxInitialized = true;

    // Cierre al hacer clic en el backdrop o imagen (siempre que no provenga de un gesto o botón)
    lightbox.addEventListener('click', (e) => {
        if (ignoreNextClick) {
            e.stopPropagation();
            e.preventDefault();
            ignoreNextClick = false;
            return;
        }
        if (e.target.closest('.lightbox-nav-btn')) {
            return;
        }
        cerrarLightbox();
    });

    // Botones de navegación para escritorio
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            navegarLightbox(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            navegarLightbox(1);
        });
    }

    // Gestos táctiles (swipe) para móvil y PWA
    lightbox.addEventListener('touchstart', (e) => {
        if (!currentLightboxContext || !currentLightboxContext.cables || currentLightboxContext.cables.length <= 1) {
            return;
        }
        if (e.touches.length > 1) {
            isMultiTouch = true;
            return;
        }
        isMultiTouch = false;
        isZoomedOnStart = isLightboxZoomed();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
    }, { passive: true });

    lightbox.addEventListener('touchmove', (e) => {
        if (!currentLightboxContext || !currentLightboxContext.cables || currentLightboxContext.cables.length <= 1) {
            return;
        }
        if (e.touches.length > 1) {
            isMultiTouch = true;
            return;
        }
        if (e.touches.length === 1) {
            touchEndX = e.touches[0].clientX;
            touchEndY = e.touches[0].clientY;
        }
    }, { passive: true });

    lightbox.addEventListener('touchend', () => {
        if (!currentLightboxContext || !currentLightboxContext.cables || currentLightboxContext.cables.length <= 1) {
            return;
        }
        // REQUISITO CRÍTICO: Si la imagen está ampliada o se usó gesto multitáctil, NO cambiar de imagen.
        if (isMultiTouch || isZoomedOnStart || isLightboxZoomed()) {
            isMultiTouch = false;
            return;
        }

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const threshold = 50;

        if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            ignoreNextClick = true;
            setTimeout(() => { ignoreNextClick = false; }, 400);

            if (deltaX < -threshold) {
                navegarLightbox(1);
            } else if (deltaX > threshold) {
                navegarLightbox(-1);
            }
        }
    }, { passive: true });
}

/**
 * Abre el lightbox con la imagen especificada y el contexto de navegación opcional.
 * @param {string} url - La URL de la imagen a mostrar.
 * @param {string} imgId - (Opcional) El ID del elemento <img> dentro del lightbox.
 * @param {Object} context - (Opcional) Datos del carrusel { cables: [...], currentIndex: number, onSlideChange: fn }.
 */
function abrirLightbox(url, imgId = 'lightboxImg', context = null) {
    if (window.inEditMode) return;
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById(imgId) || document.getElementById('lightboxImg') || document.getElementById('lightbox-img');
    const viewport = document.querySelector('meta[name="viewport"]');

    if (!lightbox || !lightboxImg) return;

    initLightboxEvents();

    if (context && context.cables && context.cables.length > 0) {
        currentLightboxContext = context;
    } else {
        currentLightboxContext = null;
    }

    actualizarBotonesLightbox();

    // Limpiar la imagen anterior para evitar que sea visible mientras carga la nueva
    lightboxImg.src = "";
    lightboxImg.src = url;

    // Permitir zoom al abrir el lightbox
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }

    lightbox.classList.add('visible');

    // Integración con History API
    if (window.history && window.history.pushState) {
        window.history.pushState({ lightboxOpen: true }, '');
    }
}

/**
 * Cierra el lightbox de imágenes y restaura el zoom.
 */
function cerrarLightbox(isFromPopState = false) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox ? (lightbox.querySelector('img') || document.getElementById('lightboxImg') || document.getElementById('lightbox-img')) : null;
    const viewport = document.querySelector('meta[name="viewport"]');

    if (!lightbox || !lightbox.classList.contains('visible')) return;

    currentLightboxContext = null;
    actualizarBotonesLightbox();

    // 1. Forzar restauración de escala visual 1.0
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // 2. Limpiar estilos agresivamente para evitar que el zoom persista en la imagen
    if (lightboxImg) {
        lightboxImg.style.transform = '';
        lightboxImg.style.zoom = '';
        lightboxImg.style.webkitTransform = '';
    }

    // 3. Secuencia de cierre temporizada para permitir que el navegador re-escale
    setTimeout(() => {
        lightbox.classList.remove('visible');
    }, 100);

    // 4. Restauración final y actualización de layout
    setTimeout(() => {
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
        if (typeof window.handleViewportChange === 'function') {
            window.handleViewportChange();
        }
    }, 500);

    // Si cerramos manualmente (no desde popstate), quitamos el estado del historial
    if (!isFromPopState && window.history && window.history.state && window.history.state.lightboxOpen) {
        window.history.back();
    }
}

// Hacemos las funciones globalmente accesibles
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
window.navegarLightbox = navegarLightbox;
window.isLightboxZoomed = isLightboxZoomed;
