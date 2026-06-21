// GPSpedia Authentication Module | Version: 2.2
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
    // 1. Intentar cargar desde caché local inmediatamente (Cache-First)
    try {
        const cachedCatalog = await offline.getCatalog();
        if (cachedCatalog) {
            console.log("Cargando catálogo desde caché local...");
            processCatalogData(cachedCatalog);
        }
    } catch (e) {
        console.warn("Error al leer catálogo de IndexedDB:", e);
    }

    // 2. Cargar desde la red en segundo plano
    try {
        const apiResponse = await fetchCatalogData();
        const catalogData = apiResponse.data;

        // Guardar en caché local para futuros usos
        await offline.saveCatalog(catalogData);

        processCatalogData(catalogData);

    } catch (error) {
        const cachedCatalog = await offline.getCatalog();
        if (!cachedCatalog) {
            showGlobalError("Error al cargar los datos del catálogo. La funcionalidad puede ser limitada.");
            setState({
                catalogData: {
                    cortes: [],
                    tutoriales: [],
                    relay: [],
                    sortedCategories: []
                }
            });
        } else {
            showGlobalError("Trabajando en modo local/caché.");
            // Phase 2: Incondicionalmente procesar la caché si falla la red
            processCatalogData(cachedCatalog);
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
    // Cargar historial y vistos desde IndexedDB
    try {
        const [history, viewed] = await Promise.all([
            offline.getSearchHistory(),
            offline.getViewedItems()
        ]);
        setState({ searchHistory: history, viewedItems: viewed });
    } catch (e) {
        console.warn("Error cargando historial/vistos:", e);
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
        const result = await apiValidateSession(user.ID, user.SessionToken);

        if (result && result.valid) {
            handleLoginSuccess(user);
            loadInitialData(); // Carga en segundo plano sin bloquear
        } else {
            logout("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        }
    } catch (error) {
        // Mejorar la robustez ante fallos de red intermitentes
        console.error("Error validando sesión:", error);

        // Cualquier error que no sea una expiración explícita se trata como fallo de red/acceso para permitir modo offline
        const isExpirationError = error.message && (
            error.message.includes('expirada') ||
            error.message.includes('inválida') ||
            error.message.includes('expired')
        );

        if (!isExpirationError) {
            showGlobalError("Trabajando en modo local/caché.");
            // Restaurar sesión desde localStorage sin validar (fallback robusto)
            try {
                const user = JSON.parse(sessionData);
                handleLoginSuccess(user);
                loadInitialData();
            } catch (e) {
                logout();
            }
        } else {
            showGlobalError(`Error de sesión: ${error.message}`);
            logout();
        }
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
