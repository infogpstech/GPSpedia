// GPSpedia Main Orchestration Module | Version: 2.1.6
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
import { applyRichTextFormat, applyRichTextColor, createRichTextToolbar } from './rich-text.js';
import { decodeSharedVehicleHash, resolveSharedVehicleById } from './share-utils.js';
import { getCatalogStatusView } from './catalogStatus.js';
import { createOverlayHistoryManager, selectTopmostOverlay, overlayHistoryStateKey } from './overlayHistory.js';
import { pushNavigationState, replaceNavigationState, navigationHistoryStateKey } from './navigationHistory.js';

let deferredPrompt;
let searchBlurTimeout;
let isBackGestureBlurring = false;
let sessionRevalidationInstalled_ = false;
let sessionRevalidationInFlight_ = null;
let lastSessionValidationWarningAt_ = 0;
function revalidateSessionOnResume_() {
    if (sessionRevalidationInFlight_) return sessionRevalidationInFlight_;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const currentUser = state.getState().currentUser;
    if (!currentUser || !currentUser.SessionToken || typeof auth.validateActiveSession !== 'function') return null;
    sessionRevalidationInFlight_ = auth.validateActiveSession(true)
        .then(result => {
            if (result === null && Date.now() - lastSessionValidationWarningAt_ > 60000) {
                lastSessionValidationWarningAt_ = Date.now();
                ui.showGlobalError('La verificación de sesión está pendiente por falta de conexión. No se abrirán nuevas vistas privilegiadas hasta poder confirmar la sesión.');
            }
            return result;
        })
        .catch(error => {
            console.warn('No se pudo revalidar la sesión al recuperar actividad:', error);
            if (Date.now() - lastSessionValidationWarningAt_ > 60000) {
                lastSessionValidationWarningAt_ = Date.now();
                ui.showGlobalError('La verificación de sesión está pendiente por un error de conexión. Las vistas privilegiadas permanecerán bloqueadas.');
            }
            return null;
        })
        .finally(() => { sessionRevalidationInFlight_ = null; });
    return sessionRevalidationInFlight_;
}
function installSessionRevalidation_() {
    if (sessionRevalidationInstalled_) return;
    sessionRevalidationInstalled_ = true;
    window.addEventListener('focus', revalidateSessionOnResume_);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') revalidateSessionOnResume_();
    });
    window.addEventListener('online', revalidateSessionOnResume_);
    window.setInterval(() => {
        if (document.visibilityState !== 'hidden') revalidateSessionOnResume_();
    }, 5 * 60 * 1000);
}

function installCatalogStatusBanner_() {
    let banner = document.getElementById('catalog-status-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'catalog-status-banner';
        banner.className = 'catalog-status-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        const message = document.createElement('span');
        message.id = 'catalog-status-message';
        const retryButton = document.createElement('button');
        retryButton.id = 'catalog-status-retry';
        retryButton.className = 'btn btn-secondary btn-compact';
        retryButton.type = 'button';
        retryButton.textContent = 'Reintentar';
        retryButton.hidden = true;
        banner.append(message, retryButton);
        const appContainer = document.querySelector('.container');
        document.body.insertBefore(banner, appContainer || null);
    }
    const message = banner.querySelector('#catalog-status-message');
    const retryButton = banner.querySelector('#catalog-status-retry');
    if (!message || !retryButton || banner.dataset.bound === 'true') return;
    banner.dataset.bound = 'true';

    let retryInProgress = false;
    const render = currentState => {
        const view = getCatalogStatusView(currentState.catalogLoadStatus);
        banner.hidden = !view.visible;
        banner.dataset.status = view.status;
        message.textContent = view.message;
        retryButton.hidden = !view.retryable;
        retryButton.disabled = retryInProgress || currentState.catalogLoadStatus === 'loading';
    };
    retryButton.addEventListener('click', async () => {
        if (retryInProgress) return;
        retryInProgress = true;
        retryButton.disabled = true;
        retryButton.textContent = 'Reintentando...';
        try {
            const started = await auth.retryCatalogLoad();
            if (!started) ui.showGlobalError('No se pudo iniciar la actualización. Verifica que tu sesión siga activa.');
        } catch (error) {
            console.warn('No se pudo reintentar la carga del catálogo:', error);
            ui.showGlobalError('No se pudo reintentar la carga del catálogo. Vuelve a intentarlo.');
        } finally {
            retryInProgress = false;
            retryButton.textContent = 'Reintentar';
            render(state.getState());
        }
    });
    state.subscribe(render);
    render(state.getState());
}

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
    installCatalogStatusBanner_();
    const contactToolbar = document.getElementById('contact-message-toolbar');
    if (contactToolbar && contactToolbar.dataset.richMounted !== 'true') {
        contactToolbar.appendChild(createRichTextToolbar('contact-message'));
        contactToolbar.dataset.richMounted = 'true';
    }

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

    const updateSearchHasText = (hasText) => {
        searchInput.parentElement.classList.toggle('has-text', hasText);
        const container = searchInput.closest('.search-container');
        if (container) container.classList.toggle('has-text', hasText);
    };

    searchInput.addEventListener('input', () => {
        navigation.filtrarContenido(searchInput.value);
        // Toggle de la clase has-text para mostrar/ocultar el botón X
        updateSearchHasText(searchInput.value.length > 0);
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateSearchHasText(false);
            navigation.filtrarContenido('');
            searchInput.focus();
        });
    }

    // --- LÓGICA DE ANIMACIÓN DE LA BARRA DE BÚSQUEDA ---
    // Estabilización de la clase 'search-active' para evitar saltos visuales al limpiar búsqueda.
    searchInput.addEventListener('focus', () => {
        if (searchBlurTimeout) clearTimeout(searchBlurTimeout);
        document.body.classList.add('search-active');

        const currentQuery = searchInput.value;
        const currentState = window.history.state || {};
        const currentNavigationState = window.state.getState().navigationState || null;
        const previousNavigationState = currentNavigationState &&
            ['busqueda', 'busqueda_focused'].includes(currentNavigationState.level) &&
            currentNavigationState.previousState
            ? currentNavigationState.previousState
            : currentNavigationState;
        const focusedState = {
            level: "busqueda_focused",
            query: currentQuery,
            previousState: previousNavigationState
        };

        window.state.setState({ navigationState: focusedState });

        if (currentState.level === 'busqueda' || currentState.level === 'busqueda_focused') {
            replaceNavigationState(focusedState, { previousNavigationState });
        } else {
            pushNavigationState(focusedState, { previousNavigationState });
        }
    });

    searchInput.addEventListener('blur', () => {
        if (isBackGestureBlurring) return;
        // Sincronizar historial con el estado desenfocado
        const currentQuery = searchInput.value;
        const currentState = window.history.state || {};
        if (currentState.level === 'busqueda_focused') {
            const currentNavigationState = window.state.getState().navigationState || {};
            const searchState = {
                level: "busqueda",
                query: currentQuery,
                previousState: currentNavigationState.previousState || null
            };
            replaceNavigationState(searchState, { previousNavigationState: currentNavigationState.previousState });
            window.state.setState({ navigationState: searchState });
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

    /* TAREA 8 (B10, B12): ESTADO DE CONEXIÓN E INDICADOR DE RED */
    // --- LÓGICA DE ESTADO DE CONEXIÓN ---
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        const connectionStatusLabel = connectionStatus.querySelector('#connection-status-label');
        const updateStatus = () => {
            const isOnline = navigator.onLine !== false;
            const message = isOnline
                ? 'El navegador indica que hay conexión de red; esto no confirma que los servicios de GPSpedia estén disponibles.'
                : 'El navegador indica que no hay conexión de red; algunos datos guardados pueden seguir disponibles.';
            connectionStatus.classList.toggle('online', isOnline);
            connectionStatus.classList.toggle('offline', !isOnline);
            connectionStatus.title = message;
            if (connectionStatusLabel) connectionStatusLabel.textContent = message;
        };
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus(); // Estado inicial
    }

    // Exponer handleViewportChange globalmente para lightbox.js
    window.handleViewportChange = handleViewportChange;

    // Registro único de overlays .info-modal y coordinación con el historial del navegador.
    const overlayElements = new Map();
    let overlaySequence = 0;
    const overlayHistory = createOverlayHistoryManager(window.history);
    window.overlayHistory = overlayHistory;

    function isOverlayVisible_(element) {
        if (!element || !element.isConnected) return false;
        if (element.classList.contains('visible')) return true;
        return element.style.display !== 'none' && window.getComputedStyle(element).display !== 'none';
    }

    function registerVisibleOverlays_() {
        const visible = Array.from(document.querySelectorAll('.info-modal'))
            .filter(element => element.id !== 'youtube-upload-modal' && isOverlayVisible_(element));
        const visibleSet = new Set(visible);
        const stale = Array.from(overlayElements.entries()).filter(([, element]) => !visibleSet.has(element));
        const trackedElements = new Set(overlayElements.values());
        const fresh = visible.filter(element => !trackedElements.has(element));

        // Un overlay que reemplaza al superior ocupa su misma entrada, sin añadir un nivel de Atrás.
        const currentStack = overlayHistory.getStack();
        if (stale.length === 1 && fresh.length === 1 && currentStack[currentStack.length - 1] === stale[0][0]) {
            const [oldId] = stale[0];
            const element = fresh[0];
            const id = element.dataset.gpOverlayHistoryId || 'info-modal-' + (++overlaySequence);
            const closeOverlay = typeof element.__gpOverlayClose === 'function'
                ? element.__gpOverlayClose
                : () => {
                    element.style.display = 'none';
                    element.classList.remove('visible');
                };
            overlayElements.delete(oldId);
            element.dataset.gpOverlayHistoryId = id;
            overlayElements.set(id, element);
            overlayHistory.replaceTop(id, closeOverlay);
            return;
        }

        stale.forEach(([id]) => {
            overlayElements.delete(id);
            if (overlayHistory.has(id)) overlayHistory.close(id);
        });
        fresh.forEach(element => {
            const id = element.dataset.gpOverlayHistoryId || 'info-modal-' + (++overlaySequence);
            element.dataset.gpOverlayHistoryId = id;
            overlayElements.set(id, element);
            if (!overlayHistory.has(id)) {
                const closeOverlay = typeof element.__gpOverlayClose === 'function'
                    ? element.__gpOverlayClose
                    : () => {
                        element.style.display = 'none';
                        element.classList.remove('visible');
                    };
                overlayHistory.register(id, closeOverlay);
            }
        });
    }

    function getTopmostVisibleOverlay_(state) {
        const candidates = [];
        const add = (element, kind, close, order = 0) => {
            if (!element) return;
            const style = window.getComputedStyle(element);
            const zIndex = Number.parseInt(style.zIndex, 10);
            candidates.push({
                element, kind, close,
                zIndex: Number.isFinite(zIndex) ? zIndex : 0,
                order,
                domOrder: Array.from(document.querySelectorAll('body *')).indexOf(element)
            });
        };

        const stack = overlayHistory.getStack();
        const stackOrder = new Map(stack.map((id, index) => [id, index]));
        const sideMenu = document.getElementById('side-menu');
        if (sideMenu && sideMenu.classList.contains('open')) {
            add(sideMenu, 'side-menu', () => overlayHistory.handlePopState(state),
                stackOrder.has('side-menu') ? stackOrder.get('side-menu') : 0);
        }

        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('visible')) {
            add(lightbox, 'lightbox', () => window.cerrarLightbox(true));
        }

        const termsModal = document.getElementById('terms-modal');
        if (termsModal && termsModal.style.display === 'flex') {
            add(termsModal, 'terms', () => window.history.pushState(state, ''));
        }

        Array.from(document.querySelectorAll('.info-modal')).forEach(element => {
            if (!isOverlayVisible_(element)) return;
            const id = element.dataset.gpOverlayHistoryId;
            const order = stackOrder.has(id) ? stackOrder.get(id) : stack.length;
            add(element, 'info-modal', () => {
                if (id && stackOrder.has(id)) overlayHistory.handlePopState(state);
                else {
                    element.style.display = 'none';
                    element.classList.remove('visible');
                }
            }, order);
        });

        const detail = document.getElementById('modalDetalle');
        if (detail && detail.classList.contains('visible')) {
            add(detail, 'detail', null);
        }

        return selectTopmostOverlay(candidates);
    }

    function isManagedOverlayVisible_(id) {
        if (id === 'side-menu') {
            const menu = document.getElementById('side-menu');
            return Boolean(menu && menu.classList.contains('open'));
        }
        if (id === 'replaced-images-lightbox') {
            const lightbox = document.getElementById('replaced-image-lightbox');
            return Boolean(lightbox && lightbox.style.display !== 'none' &&
                window.getComputedStyle(lightbox).display !== 'none');
        }
        return isOverlayVisible_(overlayElements.get(id));
    }

    const overlayObserver = new MutationObserver(registerVisibleOverlays_);
    overlayObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    registerVisibleOverlays_();

    /* TAREA 7 (B05, B07): CIERRE DETERMINISTA DE OVERLAYS Y NAVEGACIÓN POR GESTOS EN POPSTATE */
    // --- LÓGICA DE NAVEGACIÓN (BOTÓN ATRÁS / GESTOS) ---
    window.addEventListener('popstate', (event) => {
        const state = event.state || {};
        const overlayStack = overlayHistory.getStack();
        const targetOverlayIds = Array.isArray(state[overlayHistoryStateKey])
            ? state[overlayHistoryStateKey] : [];
        const topOverlayId = overlayStack[overlayStack.length - 1];
        if (topOverlayId && !targetOverlayIds.includes(topOverlayId) && !isManagedOverlayVisible_(topOverlayId)) {
            overlayHistory.handlePopState(state);
            return;
        }
        const topOverlay = getTopmostVisibleOverlay_(state);
        if (topOverlay && topOverlay.kind !== 'detail') {
            topOverlay.close();
            return;
        }
        // Si un cierre directo ya ocultó/retiró el elemento antes del popstate,
        // reconciliar igualmente la entrada superior omitida por el estado destino.
        if (!topOverlay) {
            const overlayStack = overlayHistory.getStack();
            const targetOverlayIds = Array.isArray(state[overlayHistoryStateKey])
                ? state[overlayHistoryStateKey] : [];
            const topOverlayId = overlayStack[overlayStack.length - 1];
            if (topOverlayId && !targetOverlayIds.includes(topOverlayId)) {
                overlayHistory.handlePopState(state);
                return;
            }
        }
        const searchInput = document.getElementById('searchInput');

        // El detalle solo se procesa cuando es la capa visual superior.
        const modalDetalle = document.getElementById('modalDetalle');
        if (topOverlay && topOverlay.kind === 'detail' && modalDetalle && modalDetalle.classList.contains('visible')) {
            // Detener y limpiar videos antes de cerrar o restaurar modal previo
            if (modalDetalle.dataset.modalType === 'pys') {
                const iframes = modalDetalle.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                    try {
                        if (iframe.contentWindow) {
                            iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                        }
                    } catch(e) {}
                    iframe.src = "";
                    iframe.remove();
                });
            } else {
                const iframe = modalDetalle.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                }
            }

            if(window.inEditMode){
                const vehicleId=modalDetalle.dataset.vehicleId||null;
                Promise.resolve(ui.exitModalEditMode(false,vehicleId,true)).then(discarded=>{
                    if(!discarded)return;
                    if(!ui.restoreModalNavigationContext()){modalDetalle.classList.remove('visible');ui.clearModalNavStack();}
                });
                return;
            }
            if(ui.restoreModalNavigationContext())return;
            modalDetalle.classList.remove('visible');ui.clearModalNavStack();

            // Restaurar foco a la barra de búsqueda si estamos en modo búsqueda
            const isSearchActive = document.body.classList.contains('search-active');
            if (isSearchActive && searchInput) {
                // Timeout para asegurar que la transición del modal no interfiera
                setTimeout(() => searchInput.focus(), 300);
            }
            return;
        }

        // Tarea 1: Si el teclado virtual está visible (el input de búsqueda tiene el foco),
        // o si el estado de navegación actual indica que estábamos en una búsqueda activa,
        // el primer retroceso debe retirar el foco, ocultar el teclado e iniciar la animación inversa simultáneamente
        // en una única transición visual sin desfase ni retardo, conservando el estado de resultados.
        // NOTA: Solo se intercepta si NO hay un modal visible para evitar interferir con el cierre de overlays.
        const isModalVisible = modalDetalle && modalDetalle.classList.contains('visible');
        const currentNavState = window.state.getState().navigationState || {};
        if (!isModalVisible && searchInput &&
            (document.activeElement === searchInput || currentNavState.level === 'busqueda_focused')) {
            const currentQuery = searchInput.value || currentNavState.query || '';

            if (searchBlurTimeout) clearTimeout(searchBlurTimeout);
            isBackGestureBlurring = true;
            document.body.classList.remove('search-active');
            searchInput.blur();
            isBackGestureBlurring = false;

            if (currentQuery) {
                const searchState = {
                    level: "busqueda",
                    query: currentQuery,
                    previousState: currentNavState.previousState || null
                };
                // Si el destino nativo ya es la búsqueda, reconciliar esa entrada.
                // Si el gesto llegó al nivel anterior, crear una sola entrada de búsqueda
                // desenfocada para cancelar únicamente el cierre del teclado.
                if (state.level === 'busqueda' && state.query === currentQuery) {
                    replaceNavigationState(searchState, { previousNavigationState: currentNavState.previousState });
                } else {
                    pushNavigationState(searchState, { previousNavigationState: currentNavState.previousState });
                }
                window.state.setState({ navigationState: searchState });
                return;
            }
            // Una búsqueda vacía no debe bloquear el retroceso al nivel anterior;
            // se continúa con la restauración del estado recibido en popstate.
        }

        // PRIORIDAD SECUNDARIA: GESTIÓN DE ESTADOS DE CONTENIDO
        const isSearchActive = document.body.classList.contains('search-active');

        // Manejo de niveles de navegación (Cortes / Categorías)
        if (state.level) {
            // Rehidratar el estado completo y su antecesor para que los botones internos
            // y el historial nativo compartan el mismo contexto de navegación.
            const { [navigationHistoryStateKey]: previousNavigationState, ...restoredState } = state;
            const origin = restoredState.origin || "categoria";
            window.state.setState({
                navigationState: {
                    ...restoredState,
                    origin,
                    previousState: previousNavigationState || null
                }
            });

            // Limpieza de búsqueda al salir del nivel de búsqueda hacia un nivel no-búsqueda de catálogo
            const isSearchLevel = state.level === 'busqueda' || state.level === 'busqueda_focused';
            if (!isSearchLevel) {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.parentElement.classList.remove('has-text');
                    searchInput.blur();
                }
                document.body.classList.remove('search-active');
            }

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
                        (!state.versionEquipamiento || c.versionesAplicables === state.versionEquipamiento) &&
                        (!state.tipoEncendido || c.tipoEncendido === state.tipoEncendido)
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
                    // Phase 2.1.5: Se indica que es una restauración (true) para evitar la reapertura automática de modales.
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

    /* TAREA 12 (B04): CONTROL DEL CICLO DE VIDA DEL REPRODUCTOR DE YOUTUBE MEDIANTE MUTATIONOBSERVER */
    // --- MUTATION OBSERVER PARA GESTIÓN DE REPRODUCCIÓN EN MODAL DE TUTORIALES ---
    const modalDetalle = document.getElementById('modalDetalle');
    if (modalDetalle) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isVisible = modalDetalle.classList.contains('visible');
                    if (!isVisible) {
                        // El modal se ha cerrado
                        if (modalDetalle.dataset.modalType === 'tutorial') {
                            const iframe = modalDetalle.querySelector('iframe');
                            if (iframe) {
                                iframe.src = 'about:blank';
                                iframe.remove();
                            }
                        }
                    }
                }
            });
        });
        observer.observe(modalDetalle, { attributes: true, attributeFilter: ['class'] });
    }

    // Hamburger menu listeners
    document.getElementById('hamburger-btn').addEventListener('click', ui.openSideMenu);
    document.getElementById('menu-overlay').addEventListener('click', () => ui.closeSideMenu());

    // Click on logo to go home
    document.querySelectorAll('.app-logo').forEach(logo => {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            navigation.irAPaginaPrincipal();
        });
    });

    // Navigation links in side menu - Unified Handlers
    // Restauración de funciones para Cortes, Tutoriales y Relay
    ['cortes', 'tutoriales', 'relay', 'pys'].forEach(section => {
        const btn = document.getElementById(`menu-${section}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                ui.closeSideMenuAndRun(() => {
                    if (section === 'cortes') navigation.irAPaginaPrincipal();
                    else ui.mostrarSeccion(section);
                });
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

        // Soporte dinámico para el logo del modal de términos y condiciones (aviso inicial)
        const termsImg = document.querySelector('.terms-logo');
        if (termsImg) {
            termsImg.src = isDark ? 'Logo_TemaOscuro.png' : 'icon-v3-512x512.png';
        }

        // Soporte dinámico para el logo de GPSpedia en el modal de Términos y Condiciones completo
        const termsAgreementImg = document.querySelector('.terms-agreement-logo.gpsepedia-logo');
        if (termsAgreementImg) {
            termsAgreementImg.src = isDark ? 'Logo_TemaOscuro.png' : 'icon-v3-512x512.png';
        }
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
        ui.closeSideMenuAndRun(() => auth.logout());
    });

    const changelogLink = document.getElementById('side-menu-changelog-link');
    if (changelogLink) {
        changelogLink.addEventListener('click', (e) => {
            e.preventDefault();
            ui.closeSideMenuAndRun(() => ui.openChangeLog());
        });
    }

    // General section buttons
    document.querySelectorAll('.section-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.id.replace('btn-', '');
            ui.closeSideMenuAndRun(() => {
                if (section === 'cortes') navigation.irAPaginaPrincipal();
                else ui.mostrarSeccion(section);
            });
        });
    });

    // Inbox button listener
    const inboxBtn = document.getElementById('inbox-btn');
    if (inboxBtn) {
        inboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ui.closeSideMenuAndRun(() => ui.openInbox());
        });
    }

    // Footer links listeners (Global and Login Modal)
    const openAbout = (e) => { e.preventDefault(); ui.openAboutUs(); };
    const openContact = (e) => { e.preventDefault(); ui.openContact(); };
    const openFAQ = (e) => { e.preventDefault(); ui.openFAQ(); };
    const openTerms = (e) => { e.preventDefault(); ui.openTermsAgreement(); };

    document.getElementById('footer-about-link')?.addEventListener('click', openAbout);
    document.getElementById('login-about-link')?.addEventListener('click', openAbout);

    document.getElementById('footer-contact-link')?.addEventListener('click', openContact);
    document.getElementById('login-contact-link')?.addEventListener('click', openContact);

    document.getElementById('footer-faq-link')?.addEventListener('click', openFAQ);
    document.getElementById('login-faq-link')?.addEventListener('click', openFAQ);

    document.getElementById('footer-terms-link')?.addEventListener('click', openTerms);
    document.getElementById('terms-link-in-modal')?.addEventListener('click', openTerms);
    document.getElementById('login-terms-link')?.addEventListener('click', openTerms);

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
            ui.closeSideMenuAndRun(() => ui.openDashboard());
        });
    }

    // Dev Tools button listener
    const devToolsBtn = document.getElementById('dev-tools-btn');
    if (devToolsBtn) {
        devToolsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const focusReturnTarget = document.getElementById('hamburger-btn') || devToolsBtn;
            ui.closeSideMenuAndRun(() => ui.openDevTools({ returnFocus: focusReturnTarget }));
        });
    }


    // 3. PWA installation prompt handler
    const installButton = document.getElementById('install-button');

    const isIOSDevice = () => {
        const userAgent = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
        const isIOSUserAgent = /iPad|iPhone|iPod/i.test(userAgent);
        // iPadOS puede identificarse como Macintosh cuando Safari solicita el sitio de escritorio.
        const isIPadOSDesktop = platform === 'MacIntel' && maxTouchPoints > 1;
        return !window.MSStream && (isIOSUserAgent || isIPadOSDesktop);
    };

    const isPWAInstalled = () => {
        const isStandalone = (typeof window.matchMedia === 'function' &&
            window.matchMedia('(display-mode: standalone)').matches) ||
            window.navigator.standalone === true;
        if (isStandalone) return true;

        // Safari en iOS no expone beforeinstallprompt ni un evento de instalación fiable.
        // No usar flags persistentes de otros navegadores para ocultar las instrucciones manuales.
        if (isIOSDevice()) return false;

        return localStorage.getItem('pwa_installed') === 'true' ||
            sessionStorage.getItem('pwa_installed_session') === 'true';
    };

    const checkPWAInstallStatus = () => {
        if (!installButton) return;

        if (isPWAInstalled()) {
            installButton.style.display = 'none';
            // Save state to prevent displaying again in the same session
            sessionStorage.setItem('pwa_installed_session', 'true');
            return;
        }

        // For iOS browsers (Safari, Chrome, Edge, etc.): show button if not standalone/installed
        if (isIOSDevice()) {
            installButton.style.display = 'block';
        }
    };

    // Initial check
    checkPWAInstallStatus();

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton && !isPWAInstalled()) {
            installButton.style.display = 'block';
        }
    });

    window.addEventListener('appinstalled', (e) => {
        deferredPrompt = null;
        localStorage.setItem('pwa_installed', 'true');
        sessionStorage.setItem('pwa_installed_session', 'true');
        if (installButton) {
            installButton.style.display = 'none';
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                try {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        localStorage.setItem('pwa_installed', 'true');
                        sessionStorage.setItem('pwa_installed_session', 'true');
                        installButton.style.display = 'none';
                    }
                    deferredPrompt = null;
                } catch (err) {
                    console.error('Error triggering PWA install:', err);
                }
            } else if (isIOSDevice() && !isPWAInstalled()) {
                const iosModal = document.getElementById('ios-install-modal');
                if (iosModal) {
                    iosModal.style.display = 'flex';
                }
            }
        });
    }

    // iOS Install Modal Close Handlers
    const iosInstallModal = document.getElementById('ios-install-modal');
    const iosInstallClose = document.getElementById('ios-install-close');
    const iosInstallBtnOk = document.getElementById('ios-install-btn-ok');

    const closeIosModal = () => {
        if (iosInstallModal) {
            iosInstallModal.style.display = 'none';
        }
    };

    if (iosInstallClose) {
        iosInstallClose.addEventListener('click', closeIosModal);
    }
    if (iosInstallBtnOk) {
        iosInstallBtnOk.addEventListener('click', closeIosModal);
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
            const contactModal = document.getElementById('contact-modal');
            const contactOverlayId = contactModal && contactModal.dataset.gpOverlayHistoryId;
            const historyManager = window.overlayHistory;
            if (contactOverlayId && historyManager && historyManager.has(contactOverlayId)) {
                historyManager.close(contactOverlayId);
            } else if (contactModal) {
                contactModal.style.display = 'none';
            }
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

    // El navegador conserva menú contextual, inspección y zoom nativos; la seguridad se aplica en backend.

    // 5. Start the application by checking the user's session
    // Se asegura que todo esté inicializado antes de validar la sesión
    setTimeout(async () => {
        await auth.checkSession();
        installSessionRevalidation_();

        // --- DEEP LINKING: IDENTIDAD ESTABLE CON COMPATIBILIDAD HISTÓRICA ---
        const sharedLink = decodeSharedVehicleHash(window.location.hash);
        if (sharedLink) {
            const query = sharedLink.query || '';
            const searchInput = document.getElementById('searchInput');
            if (searchInput && query) {
                searchInput.value = query;
                searchInput.parentElement?.classList.add('has-text');
            }

            const openSharedTarget = () => {
                const latestState = state.getState();
                const vehicle = sharedLink.vehicleId
                    ? resolveSharedVehicleById(latestState.catalogData, sharedLink.vehicleId)
                    : null;

                if (vehicle) {
                    if (query) navigation.filtrarContenido(query, true);
                    ui.mostrarDetalleModal(vehicle);
                    return;
                }

                if (query) {
                    if (sharedLink.vehicleId) {
                        ui.showGlobalError('No se encontró el vehículo del enlace. Se mostrarán los resultados de búsqueda disponibles.');
                    }
                    navigation.filtrarContenido(query);
                    return;
                }

                ui.showGlobalError('No se encontró el vehículo indicado en el enlace compartido.');
            };

            // Si aún no hay sesión, el listener espera al login. La carga del catálogo
            // notifica estados terminales mediante state.js; no se usa polling.
            let waitStarted = false;
            let stopWaitingForLogin = () => {};
            const waitForCatalogRecovery = () => {
                let stopRecoveryWait = () => {};
                const applyAfterRecovery = latestState => {
                    if (!latestState.currentUser || latestState.catalogLoadStatus === 'idle') {
                        stopRecoveryWait();
                        return;
                    }
                    if (latestState.catalogLoadStatus === 'ready' || latestState.catalogLoadStatus === 'stale') {
                        stopRecoveryWait();
                        openSharedTarget();
                    }
                };
                stopRecoveryWait = state.subscribe(applyAfterRecovery);
                applyAfterRecovery(state.getState());
            };
            const beginCatalogWait = currentState => {
                if (waitStarted || !currentState.currentUser) return;
                waitStarted = true;
                stopWaitingForLogin();
                state.waitForCatalogReadiness(27000).then(result => {
                    if (result.status === 'ready' || result.status === 'stale') {
                        openSharedTarget();
                        return;
                    }
                    if (result.status === 'timeout') {
                        ui.showGlobalError('La carga del catálogo está tardando demasiado. Comprueba tu conexión; el enlace se abrirá cuando los datos estén disponibles.');
                        waitForCatalogRecovery();
                        return;
                    }
                    ui.showGlobalError('No se pudo cargar el catálogo para abrir el enlace. Puedes reintentar cuando el catálogo esté disponible.');
                    waitForCatalogRecovery();
                }).catch(error => {
                    console.warn('No se pudo esperar la carga del catálogo para el enlace compartido:', error);
                    ui.showGlobalError('No se pudo preparar el enlace compartido. Comprueba tu conexión e inténtalo nuevamente.');
                    waitForCatalogRecovery();
                });
            };
            stopWaitingForLogin = state.subscribe(beginCatalogWait);
            beginCatalogWait(state.getState());
        }
    }, 0);
}

// Funciones comunes de formato enriquecido para todos los formularios.
window.applyRichFormat = applyRichTextFormat;
window.applyRichColor = applyRichTextColor;

// Start the application once the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
