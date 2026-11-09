// GPSpedia Authentication Module | Version: 2.1.6
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
            const normalizedCached = normalizeCatalogData(cachedCatalog);
            processCatalogData(normalizedCached);
            catalogLoaded = true;
        }
    } catch (e) {
        console.warn("Error o timeout al leer catálogo de IndexedDB:", e);
    }

    // 2. Cargar desde la red en segundo plano
    try {
        const apiResponse = await fetchCatalogData();
        const catalogData = normalizeCatalogData(apiResponse.data);

        // Guardar en caché local para futuros usos (silencioso)
        offline.saveCatalog(catalogData).catch(e => console.warn("Error guardando catálogo en caché:", e));

        if (catalogLoaded) {
            // Sincronización silenciosa si ya se cargó desde la caché
            const { performSilentSync } = await import('./ui.js');
            performSilentSync(catalogData);
        } else {
            processCatalogData(catalogData);
        }
        catalogLoaded = true;

        // Precarga en segundo plano de Problemas y Soluciones para respuesta inmediata (0ms)
        try {
            routeAction('getPysData').then(res => {
                if (res && res.data && Array.isArray(res.data)) {
                    setState({ pysData: res.data });
                    try {
                        localStorage.setItem('gpsepedia_pys_cache', JSON.stringify(res.data));
                    } catch(e) {}
                }
            }).catch(e => console.warn("Error precargando PyS en segundo plano:", e));
        } catch(e) {}

    } catch (error) {
        console.warn("Fallo al cargar catálogo desde red:", error);

        // Phase 3.3/3.4: Solo mostrar error si REALMENTE no hay nada cargado ni se pudo cargar del caché tras el fallo de red
        if (!catalogLoaded) {
            try {
                const cachedCatalog = await offline.getCatalog();
                if (cachedCatalog && cachedCatalog.cortes && cachedCatalog.cortes.length > 0) {
                    const normalizedCached = normalizeCatalogData(cachedCatalog);
                    processCatalogData(normalizedCached);
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

        // Rehidratar inmediatamente pysData desde la caché local para 0ms de retardo
        try {
            const cachedPysRaw = localStorage.getItem('gpsepedia_pys_cache');
            if (cachedPysRaw) {
                const parsedPys = JSON.parse(cachedPysRaw);
                if (Array.isArray(parsedPys) && parsedPys.length > 0) {
                    setState({ pysData: parsedPys });
                }
            }
        } catch(e) {}

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
        // Phase 3.5: Asegurar que el splash screen se oculte incluso en error crítico
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
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
    let sessionToken = null;
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
            const user = JSON.parse(sessionData);
            if (user && typeof user.SessionToken === 'string' && user.SessionToken.length > 0) {
                sessionToken = user.SessionToken;
            }
        }
    } catch (error) {
        console.warn('No se pudo leer el token local para revocarlo:', error.message);
    }

    localStorage.removeItem(SESSION_KEY);
    showLoginScreen(reason);

    if (!sessionToken) return;

    routeAction('logout', { sessionToken })
        .then(result => {
            if (result && (result.revoked === true || result.alreadyRevoked === true)) {
                if (result.userSessionTokenMatched === true && result.userSessionTokenCleared !== true) {
                    console.warn('La sesión fue revocada, pero no se pudo limpiar Users.SessionToken.');
                    showGlobalError('La sesión fue revocada, pero no se pudo limpiar el token de referencia en Users. Requiere revisión.');
                }
                return;
            }

            console.warn('La sesión local se cerró, pero AUTH no confirmó la revocación remota.');
            showGlobalError('Cierre local completado, pero no se pudo confirmar la revocación en el servidor. La revocación queda pendiente.');
        })
        .catch(error => {
            console.warn('La sesión local se cerró; la revocación backend quedó pendiente:', error.message);
            showGlobalError('La sesión se cerró en este dispositivo, pero no se pudo confirmar su revocación en el servidor. Puede seguir activa en otros dispositivos.');
        });
}

/**
 * Normaliza y homogeneiza la información de marcas, categorías y modelos del catálogo
 * para evitar intermitencias, duplicidades e inconsistencias debido a diferencias de espaciado o capitalización.
 */
export function normalizeCatalogData(catalogData) {
    if (!catalogData || !Array.isArray(catalogData.cortes)) return catalogData;

    const brandCasingMap = new Map(); // lowercase -> original
    const modelCasingMap = new Map(); // brandLowercase|modelLowercase -> original
    const categoryCasingMap = new Map(); // lowercase -> original

    catalogData.cortes.forEach(item => {
        if (item.marca) {
            const trimmed = String(item.marca).trim();
            const lower = trimmed.toLowerCase();
            // Preferimos una capitalización que no sea puramente todo minúscula o todo mayúscula
            if (!brandCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                brandCasingMap.set(lower, trimmed);
            }
        }
        if (item.categoria) {
            const trimmed = String(item.categoria).trim();
            const lower = trimmed.toLowerCase();
            if (!categoryCasingMap.has(lower) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                categoryCasingMap.set(lower, trimmed);
            }
        }
    });

    catalogData.cortes.forEach(item => {
        if (item.marca) {
            const trimmed = String(item.marca).trim();
            const lower = trimmed.toLowerCase();
            item.marca = brandCasingMap.get(lower) || trimmed;
        }
        if (item.categoria) {
            const trimmed = String(item.categoria).trim();
            const lower = trimmed.toLowerCase();
            item.categoria = categoryCasingMap.get(lower) || trimmed;
        }

        if (item.modelo && item.marca) {
            const trimmed = String(item.modelo).trim();
            const lower = trimmed.toLowerCase();
            const key = `${item.marca.toLowerCase()}|${lower}`;
            if (!modelCasingMap.has(key) || (trimmed !== lower && trimmed !== trimmed.toUpperCase())) {
                modelCasingMap.set(key, trimmed);
            }
        }
    });

    catalogData.cortes.forEach(item => {
        if (item.modelo && item.marca) {
            const trimmed = String(item.modelo).trim();
            const lower = trimmed.toLowerCase();
            const key = `${item.marca.toLowerCase()}|${lower}`;
            item.modelo = modelCasingMap.get(key) || trimmed;
        }
    });

    return catalogData;
}
