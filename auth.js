// GPSpedia Authentication Module | Version: 2.4
// Responsibilities:
// - Manage the entire user authentication lifecycle (login, logout, session validation).
// - Interact with the API module for backend communication.
// - Update the user state.

import { setState } from './state.js';
import { routeAction, fetchCatalogData, login as apiLogin, validateSession as apiValidateSession } from './api-config.js';
import { showLoginScreen, showApp, showGlobalError } from './ui.js';
import * as offline from './offline.js';

const SESSION_KEY = 'gpsepedia_session';

function handleLoginSuccess(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setState({ currentUser: user });
    showApp(user); // Muestra la UI principal inmediatamente
}

async function loadInitialData() {
    let catalogLoaded = false;

    // 1. Intentar cargar desde caché local inmediatamente (Cache-First)
    try {
        // Phase 3.3: Usar Promise.race para no bloquear indefinidamente si IndexedDB está lento
        const cachedCatalog = await Promise.race([
            offline.getCatalog(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout local")), 3000))
        ]);

        if (cachedCatalog) {
            console.log("Cargando catálogo desde caché local...");
            processCatalogData(cachedCatalog);
            catalogLoaded = true;
        }
    } catch (e) {
        console.warn("Error o timeout al leer catálogo de IndexedDB:", e);
    }

    // 2. Cargar desde la red en segundo plano
    try {
        const apiResponse = await fetchCatalogData();
        const catalogData = apiResponse.data;

        // Guardar en caché local para futuros usos (silencioso)
        offline.saveCatalog(catalogData).catch(e => console.warn("Error guardando catálogo en caché:", e));

        processCatalogData(catalogData);
        catalogLoaded = true;

    } catch (error) {
        console.warn("Fallo al cargar catálogo desde red:", error);

        // Phase 3.3/3.4: Solo mostrar error si REALMENTE no hay nada cargado ni se pudo cargar del caché tras el fallo de red
        if (!catalogLoaded) {
            try {
                const cachedCatalog = await offline.getCatalog();
                if (cachedCatalog && cachedCatalog.cortes && cachedCatalog.cortes.length > 0) {
                    processCatalogData(cachedCatalog);
                    catalogLoaded = true;
                    console.log("Catalog rehydrated from cache after network failure.");
                    return;
                }
            } catch (e) { /* silent */ }

            // Si llegamos aquí, no hay datos locales ni de red.
            showGlobalError("No se pudo cargar el catálogo. Verifica tu conexión.");

            // Aseguramos que el estado refleje un catálogo vacío para limpiar skeletons si los hubiera
            setState({
                catalogData: {
                    cortes: [],
                    tutoriales: [],
                    relay: [],
                    sortedCategories: []
                }
            });
        }
    }
}

function processCatalogData(catalogData) {
    try {
        const categoryCounts = catalogData.cortes.reduce((acc, item) => {
            if (item.categoria) {
                acc[item.categoria] = (acc[item.categoria] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

        setState({
            catalogData: {
                ...catalogData,
                sortedCategories: sortedCategories
            }
        });
    } catch (e) {
        console.error("Error procesando datos del catálogo:", e);
    }
}


export async function checkSession() {
    // Phase 3.2/3.3: Rehidratación inmediata al inicio (con protección de timeout)
    try {
        const historyPromise = offline.getSearchHistory();
        const viewedPromise = offline.getViewedItems();

        // No bloqueamos el arranque si estas operaciones fallan o tardan mucho
        Promise.all([historyPromise, viewedPromise]).then(([history, viewed]) => {
            if (history || viewed) {
                console.log("Rehidratando datos persistentes:", {
                    historyCount: history?.length || 0,
                    viewedCount: viewed?.length || 0
                });
                setState({
                    searchHistory: history || [],
                    viewedItems: viewed || []
                });
            }
        }).catch(e => console.warn("Error asíncrono cargando historial/vistos:", e));

    } catch (e) {
        console.warn("Error en el flujo de rehidratación:", e);
    }

    const LOCK_KEY = 'session_validation_lock';
    const LOCK_TIMEOUT = 5000; // 5 segundos, tiempo durante el cual una pestaña puede bloquear a otras.

    const lock = localStorage.getItem(LOCK_KEY);
    const now = Date.now();

    // Si existe un bloqueo y no ha expirado, esta pestaña no intentará validar.
    if (lock && (now - parseInt(lock, 10)) < LOCK_TIMEOUT) {
        return;
    }

    // Adquirir el bloqueo para esta pestaña.
    localStorage.setItem(LOCK_KEY, now.toString());

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) {
        showLoginScreen();
        localStorage.removeItem(LOCK_KEY); // Liberar bloqueo si no hay sesión
        return;
    }

    try {
        const user = JSON.parse(sessionData);

        // Phase 3.1: Acceso inmediato si hay sesión local (Non-blocking)
        handleLoginSuccess(user);
        loadInitialData();

        // Validar en segundo plano
        if (window.navigator && window.navigator.onLine !== false) {
            apiValidateSession(user.ID, user.SessionToken).then(result => {
                // Phase 3.3: Solo cerrar sesión si el servidor confirma EXPLICITAMENTE que es inválida.
                if (result && result.valid === false) {
                    console.warn("Sesión invalidada por el servidor.");
                    logout("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
                }
            }).catch(error => {
                console.warn("Fallo validación de sesión (API inaccesible):", error.message);
                const errorMsg = (error.message || "").toLowerCase();
                const isExpirationError = errorMsg.includes('expirada') ||
                                         errorMsg.includes('inválida') ||
                                         errorMsg.includes('expired');

                if (isExpirationError) {
                    console.error("Cerrando sesión por error de validación explícito:", errorMsg);
                    showGlobalError(`Error de sesión: ${error.message}`);
                    logout();
                }
            });
        }

    } catch (error) {
        console.error("Error crítico en checkSession:", error);
        logout();
    } finally {
        // Liberar el bloqueo para que otras pestañas puedan validar si es necesario.
        localStorage.removeItem(LOCK_KEY);
    }
}

export async function login(username, password) {
    try {
        const result = await apiLogin(username, password);
        if (result && result.user) {
            handleLoginSuccess(result.user);
            loadInitialData(); // Carga en segundo plano sin bloquear
        } else {
            throw new Error("Respuesta de login inválida.");
        }
    } catch (error) {
        showGlobalError(error.message || "Credenciales inválidas.");
    }
}

export function logout(reason = null) {
    localStorage.removeItem(SESSION_KEY);
    // localStorage.removeItem(SESSION_ID_KEY); // This key is not used in the new architecture
    showLoginScreen(reason);
}
