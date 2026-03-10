// GPSpedia Main Orchestration Module | Version: 2.0
// Responsibilities:
// - Import all feature modules.
// - Initialize the application and set up global event listeners.
// - Expose modules to the global window object for HTML compatibility.

// Importar la función `routeAction` desde el módulo de API unificado.
import { routeAction } from './api-config.js';
import * as auth from './auth.js';
import * as state from './state.js';
import * as ui from './ui.js';
import * as navigation from './navigation.js';
import './lightbox.js';

let deferredPrompt;
let searchBlurTimeout;

/**
 * Main function to initialize the application.
 */
async function initializeApp() {

    // 1. Expose modules to the global scope for inline event handlers in HTML
    window.routeAction = routeAction; // Exponer la función central de API
    window.auth = auth;
    window.state = state;
    window.ui = ui;
    window.navigation = navigation;

    // 2. Setup primary event listeners
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        btn.classList.add('btn-loading');
        auth.login(username, password).finally(() => {
            btn.classList.remove('btn-loading');
        });
    });

    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    searchInput.addEventListener('input', () => {
        navigation.filtrarContenido(searchInput.value);
        // Toggle de la clase has-text para mostrar/ocultar el botón X
        searchInput.parentElement.classList.toggle('has-text', searchInput.value.length > 0);
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.parentElement.classList.remove('has-text');
            navigation.filtrarContenido('');
            searchInput.focus();
        });
    }

    // --- LÓGICA DE ANIMACIÓN DE LA BARRA DE BÚSQUEDA ---
    // Estabilización de la clase 'search-active' para evitar saltos visuales al limpiar búsqueda.
    searchInput.addEventListener('focus', () => {
        if (searchBlurTimeout) clearTimeout(searchBlurTimeout);
        document.body.classList.add('search-active');
    });

    searchInput.addEventListener('blur', () => {
        // Se utiliza un timeout para evitar el cierre inmediato al hacer clic en el botón de limpiar (X)
        searchBlurTimeout = setTimeout(() => {
            document.body.classList.remove('search-active');
        }, 250);
    });

    // --- LÓGICA DINÁMICA DE VIEWPORT PARA MÓVIL ---
    /**
     * Ajusta la altura de la aplicación basándose en el visualViewport.
     * Esto es crítico para dispositivos móviles donde el teclado virtual
     * reduce el área visible de la pantalla.
     */
    const handleViewportChange = () => {
        if (!window.visualViewport) return;

        // Si el lightbox está abierto, no recalculamos el layout de la app
        if (isLightboxVisible() && Math.abs(window.visualViewport.scale - 1) > 0.01) {
            return;
        }

        const viewport = window.visualViewport;
        const height = viewport.height;

        // Establece la variable CSS --app-height en el elemento raíz.
        // Se utiliza para definir la altura de html, body y .container.
        document.documentElement.style.setProperty('--app-height', `${height}px`);

        // Heurística para detectar si el teclado está abierto.
        if (height < window.innerHeight * 0.85) {
            document.body.classList.add('keyboard-open');
        } else {
            document.body.classList.remove('keyboard-open');
        }
    };

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
        window.visualViewport.addEventListener('scroll', handleViewportChange);
        handleViewportChange(); // Ejecución inicial
    }

    // Exponer handleViewportChange globalmente para lightbox.js
    window.handleViewportChange = handleViewportChange;

    // --- LÓGICA DE NAVEGACIÓN (BOTÓN ATRÁS / GESTOS) ---
    window.addEventListener('popstate', (event) => {
        // 1. Cerrar Side Menu si está abierto
        const sideMenu = document.getElementById('side-menu');
        if (sideMenu && sideMenu.classList.contains('open')) {
            ui.closeSideMenu(true);
            return;
        }

        // 2. Cerrar Lightbox si está abierto
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('visible')) {
            window.cerrarLightbox(true); // Pasar true para evitar bucle de back()
            return;
        }

        // 3. Cerrar Modales de Información (About, Contact, FAQ, etc.)
        const infoModals = document.querySelectorAll('.info-modal');
        let overlayClosed = false;
        infoModals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
                overlayClosed = true;
            }
        });
        if (overlayClosed) return;

        // 4. Cerrar Modal de Detalles
        const modalDetalle = document.getElementById('modalDetalle');
        if (modalDetalle && modalDetalle.classList.contains('visible')) {
            // Detener videos al cerrar via back button
            const iframe = modalDetalle.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
            }
            modalDetalle.classList.remove('visible');
            return;
        }
    });

    // Hamburger menu listeners
    document.getElementById('hamburger-btn').addEventListener('click', ui.openSideMenu);
    document.getElementById('menu-overlay').addEventListener('click', ui.closeSideMenu);

    // Navigation links in side menu - Unified Handlers
    // Restauración de funciones para Cortes, Tutoriales y Relay
    ['cortes', 'tutoriales', 'relay'].forEach(section => {
        const btn = document.getElementById(`menu-${section}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                ui.mostrarSeccion(section);
                ui.closeSideMenu();
            });
        }
    });

    // Dark Mode Toggle Logic with Logo Swap and Persistence
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const appLogo = document.querySelector('.app-logo');
    const lightLogo = "https://drive.google.com/thumbnail?id=1NxBx-W_gWmcq3fA9zog6Dpe-WXpH_2e8&sz=2048";
    const darkLogo = "Logo_TemaOscuro.png";

    // --- LÓGICA DE ACORDEÓN PARA FAQ ---
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');

            // Cerrar otros
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    if (darkModeToggle) {
        // Carga inicial de preferencia desde localStorage
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
            if (appLogo) appLogo.src = darkLogo;
        }

        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
                if (appLogo) appLogo.src = darkLogo;
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
                if (appLogo) appLogo.src = lightLogo;
            }
        });
    }

    // --- LÓGICA DE GESTO PULL-TO-REFRESH (Restaurada) ---
    const container = document.querySelector('.container');
    let touchStartY = 0;

    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop === 0) {
            touchStartY = e.touches[0].pageY;
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].pageY;
        const distance = touchEndY - touchStartY;
        // Si el usuario desliza más de 150px hacia abajo estando en el tope
        if (container.scrollTop === 0 && distance > 150) {
            window.location.reload();
        }
    }, { passive: true });
    document.getElementById('side-menu-logout-button').addEventListener('click', () => {
        ui.closeSideMenu();
        auth.logout();
    });

    // General section buttons
    document.querySelectorAll('.section-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.id.replace('btn-', '');
            ui.mostrarSeccion(section);
        });
    });

    // Inbox button listener
    const inboxBtn = document.getElementById('inbox-btn');
    if (inboxBtn) {
        inboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ui.openInbox();
            ui.closeSideMenu();
        });
    }

    // Footer links listeners
    document.getElementById('footer-about-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        ui.openAboutUs();
    });
    document.getElementById('footer-contact-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        ui.openContact();
    });
    document.getElementById('footer-faq-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        ui.openFAQ();
    });

    // Dashboard button listener - Restauración de funcionalidad
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ui.openDashboard();
            ui.closeSideMenu();
        });
    }

    // Dev Tools button listener
    const devToolsBtn = document.getElementById('dev-tools-btn');
    if (devToolsBtn) {
        devToolsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ui.openDevTools();
            ui.closeSideMenu();
        });
    }


    // 3. PWA installation prompt handler
    const installButton = document.getElementById('install-button');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton) {
            installButton.style.display = 'block';
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        });
    }

    // Contact form logic
    document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;
        const userId = state.getState().currentUser?.ID;

        const formData = { name, email, message, userId };

        try {
            submitBtn.classList.add('btn-loading');

            const result = await routeAction('sendContactForm', formData);

            alert('¡Gracias! Tu mensaje ha sido enviado correctamente.');
            e.target.reset();
            document.getElementById('contact-modal').style.display = 'none';
        } catch (error) {
            ui.showGlobalError(`Hubo un error al enviar el mensaje: ${error.message}`);
        } finally {
            submitBtn.classList.remove('btn-loading');
        }
    });


    // 4. Register the service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
        });
    }

    // --- LÓGICA DE SEGURIDAD Y BLOQUEO DE INTERACCIONES ---
    // Bloqueo de menú contextual (click derecho)
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Bloqueo de atajos de teclado para inspección y ver código fuente
    document.addEventListener('keydown', (e) => {
        // Bloquear F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Bloquear Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        // Bloquear Ctrl+U (Ver código fuente)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    });

    // Bloqueo de Zoom manual (Teclado y Rueda del ratón)
    // EXCEPCIÓN: Se permite zoom si el lightbox está visible.
    function isLightboxVisible() {
        const lightbox = document.getElementById('lightbox');
        return lightbox && lightbox.classList.contains('visible');
    }

    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey && !isLightboxVisible()) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !isLightboxVisible()) {
            // Teclas +, -, y 0 (para reset)
            if ([61, 107, 173, 109, 187, 189, 48, 96].includes(e.keyCode)) {
                e.preventDefault();
            }
        }
    });

    // Bloqueo de Zoom por gestos (Touch)
    // EXCEPCIÓN: Se permite zoom si el lightbox está visible.
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1 && !isLightboxVisible()) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1 && !isLightboxVisible()) {
            e.preventDefault();
        }
    }, { passive: false });

    // 5. Start the application by checking the user's session
    await auth.checkSession();
}

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
