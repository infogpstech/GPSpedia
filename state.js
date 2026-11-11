// GPSpedia State Management Module | Version: 2.1.6
// Responsibilities:
// - Act as the single source of truth for all application data.
// - Provide getter and setter functions to manage state mutations.

let state = {
    currentUser: null,
    catalogData: {
        cortes: [],
        tutoriales: [],
        relay: [],
        logos: [],
        sortedCategories: []
    },
    catalogLoadStatus: 'idle',
    catalogLoadError: null,
    navigationState: {
        level: 'categorias',
        categoria: null,
        marca: null,
        modelo: null
    },
    uiState: {
        isModalOpen: false,
        isSearchActive: false
    },
    likedCortes: [],
    searchHistory: [],
    viewedItems: []
};

export function getState() {
    return { ...state };
}

/** Espera estados terminales de catálogo mediante suscripción, sin polling. */
export function waitForCatalogReadiness(timeoutMs = 15000) {
    const requestedTimeout = Number(timeoutMs);
    const waitMs = Number.isFinite(requestedTimeout) ? Math.max(1, Math.min(requestedTimeout, 30000)) : 15000;
    return new Promise(resolve => {
        let settled = false;
        let timer = null;
        let unsubscribe = () => {};
        const finish = result => {
            if (settled) return;
            settled = true;
            if (timer !== null) clearTimeout(timer);
            unsubscribe();
            resolve(result);
        };
        const inspect = current => {
            const status = current && current.catalogLoadStatus || 'idle';
            if (status === 'ready' || status === 'stale') {
                const catalogData = current.catalogData;
                if (catalogData && Array.isArray(catalogData.cortes)) finish({ status, catalogData });
                else finish({ status: 'error', error: 'La carga terminó sin una colección válida de Cortes.' });
            } else if (status === 'error') {
                finish({ status: 'error', error: current.catalogLoadError || 'No se pudo cargar el catálogo.' });
            }
        };
        unsubscribe = subscribe(inspect);
        timer = setTimeout(() => finish({ status: 'timeout' }), waitMs);
        inspect(state);
    });
}

let listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

export function setState(newState) {
    state = { ...state, ...newState };
    listeners.forEach(listener => listener(state));
}
