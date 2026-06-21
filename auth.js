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
    let catalogLoaded = false;

    // 1. Intentar cargar desde caché local inmediatamente (Cache-First)
    try {
        const cachedCatalog = await offline.getCatalog();
        if (cachedCatalog) {
            console.log("Cargando catálogo desde caché local...");
            processCatalogData(cachedCatalog);
            catalogLoaded = true;
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
        catalogLoaded = true;

    } catch (error) {
        console.warn("Fallo al cargar catálogo desde red:", error);

        if (!catalogLoaded) {
            const cachedCatalog = await offline.getCatalog();
            if (!cachedCatalog) {
                showGlobalError("No se pudo cargar el catálogo. Verifica tu conexión.");
                setState({
                    catalogData: {
                        cortes: [],
                        tutoriales: [],
                        relay: [],
                        sortedCategories: []
                    }
                });
            } else {
                // Si no se había cargado antes (por alguna razón), cargarlo ahora
                showGlobalError("Trabajando en modo local/caché.");
                processCatalogData(cachedCatalog);
            }
        }
        // Si ya se cargó el catálogo (desde el caché en el paso 1), fallamos silenciosamente en la red
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
    // Phase 3.2: Rehidratación inmediata al inicio
    try {
        const history = await offline.getSearchHistory();
        const viewed = await offline.getViewedItems();
        console.log("Rehidratando datos persistentes:", { historyCount: history.length, viewedCount: viewed.length });
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

        // Phase 3.1: Acceso inmediato si hay sesión local (Non-blocking)
        handleLoginSuccess(user);
        loadInitialData();

        // Validar en segundo plano
        apiValidateSession(user.ID, user.SessionToken).then(result => {
            if (!result || !result.valid) {
                logout("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
            }
        }).catch(error => {
            console.warn("Fallo validación de sesión (API inaccesible):", error.message);
            // Phase 3.2: Suprimir mensajes de error de red durante el arranque si ya estamos en modo local
            const isExpirationError = error.message && (
                error.message.includes('expirada') ||
                error.message.includes('inválida') ||
                error.message.includes('expired')
            );
            if (isExpirationError) {
                showGlobalError(`Error de sesión: ${error.message}`);
                logout();
            }
            // Si es un error de red (TypeError: Failed to fetch), simplemente continuamos en modo local silenciosamente
        });

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
