// GPSpedia Main Orchestration Module | Version: 2.4.2
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
let isBackGestureBlurring = false;

/**
 * Main function to initialize the application.
 */
async function initializeApp() {

    // Inicializar el estado de historial si es null para evitar cierres abruptos
    if (!window.history.state) {
        window.history.replaceState({ level: 'categorias' }, '', window.location.href);
    }

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

        // Sincronizar historial con el estado enfocado
        const currentQuery = searchInput.value;
        const currentState = window.history.state || {};
        const isSearch = currentState.level === 'busqueda' || currentState.level === 'busqueda_focused' || window.location.hash.startsWith('#search=');
        const newUrl = window.location.pathname + window.location.search + `#search=${encodeURIComponent(currentQuery)}`;

        // Actualizar el estado global con el nivel enfocado para que filtrarContenido detecte la búsqueda activa correctamente
        window.state.setState({ navigationState: { level: "busqueda_focused", query: currentQuery } });

        if (isSearch) {
            history.replaceState({ level: "busqueda_focused", query: currentQuery }, '', newUrl);
        } else {
            history.pushState({ level: "busqueda_focused", query: currentQuery }, '', newUrl);
        }
    });

    searchInput.addEventListener('blur', () => {
        if (isBackGestureBlurring) return;
        // Sincronizar historial con el estado desenfocado
        const currentQuery = searchInput.value;
        const currentState = window.history.state || {};
        if (currentState.level === 'busqueda_focused') {
            const newUrl = window.location.pathname + window.location.search + `#search=${encodeURIComponent(currentQuery)}`;
            history.replaceState({ level: "busqueda", query: currentQuery }, '', newUrl);
        }

        // Se utiliza un timeout para evitar el cierre inmediato al hacer clic en el botón de limpiar (X)
        searchBlurTimeout = setTimeout(() => {
            const modalDetalle = document.getElementById('modalDetalle');
            const isModalVisible = modalDetalle && modalDetalle.classList.contains('visible');

            // No quitar la clase 'search-active' si el modal está visible para mantener la animación del header
            if (!isModalVisible) {
                document.body.classList.remove('search-active');
            }
        }, 250);
    });

    // --- LÓGICA DINÁMICA DE VIEWPORT PARA MÓVIL ---
    /**
     * Ajusta la altura de la aplicación basándose en el visualViewport.
     * Esto es crítico para dispositivos móviles donde el teclado virtual
     * reduce el área visible de la pantalla.
     */
    let viewportTicking = false;
    const handleViewportChange = () => {
        if (!window.visualViewport || viewportTicking) return;

        viewportTicking = true;
        requestAnimationFrame(() => {
            // Si el lightbox está abierto y hay zoom activo, no recalculamos el layout de la app
            if (isLightboxVisible() && Math.abs(window.visualViewport.scale - 1) > 0.01) {
                viewportTicking = false;
                return;
            }

            const viewport = window.visualViewport;
            const height = viewport.height;

            // Establece la variable CSS --app-height en el elemento raíz.
            document.documentElement.style.setProperty('--app-height', `${height}px`);

            // Heurística para detectar si el teclado está abierto.
            if (height < window.innerHeight * 0.85) {
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
            }
            viewportTicking = false;
        });
    };

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
        window.visualViewport.addEventListener('scroll', handleViewportChange, { passive: true });
        handleViewportChange(); // Ejecución inicial
    }

    // --- LÓGICA DE ESTADO DE CONEXIÓN ---
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        const updateStatus = () => {
            const isOnline = navigator.onLine;
            connectionStatus.className = isOnline ? 'online' : 'offline';
            connectionStatus.title = isOnline ? 'Conectado' : 'Trabajando Offline';
        };
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus(); // Estado inicial
    }

    // Exponer handleViewportChange globalmente para lightbox.js
    window.handleViewportChange = handleViewportChange;

    // --- LÓGICA DE NAVEGACIÓN (BOTÓN ATRÁS / GESTOS) ---
    window.addEventListener('popstate', (event) => {
        const state = event.state || {};
        const searchInput = document.getElementById('searchInput');

        // Tarea 1: Si el teclado virtual está visible (el input de búsqueda tiene el foco),
        // o si el estado de navegación actual indica que estábamos en una búsqueda activa,
        // el primer retroceso debe retirar el foco, ocultar el teclado e iniciar la animación inversa simultáneamente
        // en una única transición visual sin desfase ni retardo, conservando el estado de resultados.
        const currentNavState = window.state.getState().navigationState || {};
        if (searchInput && (document.activeElement === searchInput || currentNavState.level === 'busqueda_focused')) {
            const currentQuery = searchInput.value;

            // Cancelar cualquier timeout activo para desenfocar y ocultar el teclado
            if (searchBlurTimeout) clearTimeout(searchBlurTimeout);

            // Activar flag para ignorar el delay en el listener de blur
            isBackGestureBlurring = true;

            // Ocultar la barra activa e iniciar la animación inversa simultáneamente
            document.body.classList.remove('search-active');

            // Retirar foco inmediatamente
            searchInput.blur();

            isBackGestureBlurring = false;

            // Evitar que el historial se desplace hacia atrás recuperando la posición actual
            // mediante la re-inserción del estado de búsqueda activo desenfocado.
            if (currentQuery) {
                const newUrl = window.location.pathname + window.location.search + `#search=${encodeURIComponent(currentQuery)}`;
                history.pushState({ level: "busqueda", query: currentQuery }, '', newUrl);
                // Sincronizar también el estado de navegación global
                window.state.setState({ navigationState: { level: "busqueda", query: currentQuery } });
            } else {
                navigation.irAPaginaPrincipal(true);
            }
            return;
        }

        // Phase 2.4.11: PRIORIDAD DE CIERRE DE COMPONENTES UI (OVERLAYS)
        // Se reordena el listener para asegurar que cualquier modal u overlay se cierre
        // antes de intentar restaurar estados de búsqueda o secciones.

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

            // Restaurar foco a la barra de búsqueda si estamos en modo búsqueda
            const isSearchActive = document.body.classList.contains('search-active');
            if (isSearchActive && searchInput) {
                // Timeout para asegurar que la transición del modal no interfiera
                setTimeout(() => searchInput.focus(), 300);
            }
            return;
        }

        // PRIORIDAD SECUNDARIA: GESTIÓN DE ESTADOS DE CONTENIDO
        const isSearchActive = document.body.classList.contains('search-active');

        // Manejo de niveles de navegación (Cortes / Categorías)
        if (state.level) {
            // Rehidratar origin en el estado global para conservar el contexto
            const origin = state.origin || "categoria";
            const currentState = window.state.getState().navigationState || {};
            window.state.setState({ navigationState: { ...currentState, origin } });

            switch (state.level) {
                case 'marcas':
                    ui.mostrarMarcas(state.categoria);
                    break;
                case 'modelosPorMarca':
                    ui.mostrarModelosPorMarca(state.marca);
                    break;
                case 'modelos':
                    ui.mostrarModelos(state.categoria, state.marca, state.versionEquipamiento);
                    break;
                case 'tiposEncendido':
                    ui.mostrarTiposEncendido(state.categoria, state.marca, state.versionEquipamiento, state.modelo);
                    break;
                case 'versiones':
                    // Reconstruir la lista de versiones para este modelo
                    const { catalogData } = window.state.getState();
                    const filter = catalogData.cortes.filter(c =>
                        c.marca === state.marca &&
                        c.modelo === state.modelo &&
                        c.categoria === state.categoria &&
                        (!state.versionEquipamiento || c.versionesAplicables === state.versionEquipamiento)
                    );
                    ui.mostrarVersiones(filter, state.categoria, state.marca, state.modelo);
                    break;
                case 'versionesEquipamiento':
                    ui.mostrarVersionesEquipamiento(state.categoria, state.marca, state.modelo);
                    break;
                case 'busqueda_focused':
                case 'busqueda':
                    if (searchInput) {
                        searchInput.value = state.query;
                        searchInput.parentElement.classList.add('has-text');
                    }
                    if (state.level === 'busqueda_focused') {
                        document.body.classList.add('search-active');
                        // Forzar el enfoque para re-abrir el teclado virtual de inmediato
                        setTimeout(() => searchInput.focus(), 300);
                    } else {
                        document.body.classList.remove('search-active');
                        searchInput.blur();
                    }
                    // Phase 2.4.10: Se indica que es una restauración (true) para evitar la reapertura automática de modales.
                    navigation.filtrarContenido(state.query, true);
                    break;
                default:
                    navigation.irAPaginaPrincipal(true);
            }
            return;
        }

        // Si regresamos a un estado que no tiene información de búsqueda ni de nivel, limpiar buscador
        if (!state.query) {
            // Si estábamos en búsqueda y ahora no, restaurar catálogo
            const currentNavState = window.state.getState().navigationState;
            if (currentNavState && (currentNavState.level === 'busqueda' || currentNavState.level !== 'categorias')) {
                navigation.irAPaginaPrincipal(true);
            } else {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.blur();
                    searchInput.parentElement.classList.remove('has-text');
                }
                document.body.classList.remove('search-active');
            }
        }

        // 5. Manejo de secciones (si el estado indica una sección específica)
        if (state.section) {
            ui.mostrarSeccion(state.section, true);
        } else if (window.location.hash === '' || window.location.hash === '#') {
            // Si no hay hash y no hay componentes abiertos, asegurar volver a principal
            navigation.irAPaginaPrincipal(true);
        }
    });

    // Hamburger menu listeners
    document.getElementById('hamburger-btn').addEventListener('click', ui.openSideMenu);
    document.getElementById('menu-overlay').addEventListener('click', ui.closeSideMenu);

    // Click on logo to go home
    document.querySelectorAll('.app-logo').forEach(logo => {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            navigation.irAPaginaPrincipal();
        });
    });

    // Navigation links in side menu - Unified Handlers
    // Restauración de funciones para Cortes, Tutoriales y Relay
    ['cortes', 'tutoriales', 'relay'].forEach(section => {
        const btn = document.getElementById(`menu-${section}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (section === 'cortes') {
                    navigation.irAPaginaPrincipal();
                } else {
                    ui.mostrarSeccion(section);
                }
                ui.closeSideMenu();
            });
        }
    });

    // Dark Mode Toggle Logic with Logo Swap and Persistence
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    const updateLogos = (isDark) => {
        const logoUrl = isDark ? 'Logo_TemaOscuro.png' : 'https://drive.google.com/thumbnail?id=1NxBx-W_gWmcq3fA9zog6Dpe-WXpH_2e8&sz=2048';
        const splashUrl = isDark ? 'Logo_TemaOscuro.png' : 'https://drive.google.com/thumbnail?id=1NxBx-W_gWmcq3fA9zog6Dpe-WXpH_2e8&sz=512';
        const loginUrl = isDark ? 'Logo_TemaOscuro.png' : 'icon-v3-512x512.png';

        document.querySelectorAll('.app-logo').forEach(img => img.src = logoUrl);
        const splashImg = document.querySelector('#splash-screen img');
        if (splashImg) splashImg.src = splashUrl;
        const loginImg = document.querySelector('#login-modal img');
        if (loginImg) loginImg.src = loginUrl;
    };

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
            updateLogos(true);
        }

        darkModeToggle.addEventListener('change', () => {
            const isDark = darkModeToggle.checked;
            if (isDark) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
            updateLogos(isDark);
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
            if (section === 'cortes') {
                navigation.irAPaginaPrincipal();
            } else {
                ui.mostrarSeccion(section);
            }
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

    // Footer links listeners (Global and Login Modal)
    const openAbout = (e) => { e.preventDefault(); ui.openAboutUs(); };
    const openContact = (e) => { e.preventDefault(); ui.openContact(); };
    const openFAQ = (e) => { e.preventDefault(); ui.openFAQ(); };

    document.getElementById('footer-about-link')?.addEventListener('click', openAbout);
    document.getElementById('login-about-link')?.addEventListener('click', openAbout);

    document.getElementById('footer-contact-link')?.addEventListener('click', openContact);
    document.getElementById('login-contact-link')?.addEventListener('click', openContact);

    document.getElementById('footer-faq-link')?.addEventListener('click', openFAQ);
    document.getElementById('login-faq-link')?.addEventListener('click', openFAQ);

    // --- LÓGICA DE VISIBILIDAD DINÁMICA DEL FOOTER ---
    // El footer solo debe aparecer al llegar al final del catálogo (cuando el centinela es visible).
    const footer = document.querySelector('.footer');
    const sentinel = document.getElementById('footer-sentinel');
    if (footer && sentinel) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    footer.classList.add('visible');
                } else {
                    footer.classList.remove('visible');
                }
            });
        }, {
            threshold: 0.1
        });

        observer.observe(sentinel);
    }

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
        return !!(lightbox && lightbox.classList.contains('visible'));
    }

    window.isLightboxVisible = isLightboxVisible; // Exponer para otros módulos si es necesario

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
    // Se asegura que todo esté inicializado antes de validar la sesión
    setTimeout(async () => {
        await auth.checkSession();

        // --- LÓGICA DE DEEP LINKING PARA BÚSQUEDA ---
        const hash = window.location.hash;
        if (hash.startsWith('#search=')) {
            const query = decodeURIComponent(hash.substring(8));
            if (query) {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = query;
                    searchInput.parentElement.classList.add('has-text');
                }

                // Esperar a que el catálogo esté cargado en el estado antes de filtrar
                const checkDataAndSearch = () => {
                    const { catalogData } = state.getState();
                    if (catalogData && catalogData.cortes && catalogData.cortes.length > 0) {
                        navigation.filtrarContenido(query);
                    } else {
                        setTimeout(checkDataAndSearch, 100);
                    }
                };
                checkDataAndSearch();
            }
        }
    }, 0);
}

// Start the application once the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
