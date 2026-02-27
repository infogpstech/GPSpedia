// GPSpedia State Management Module | Version: 2.0
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
    likedCortes: []
};

export function getState() {
    return { ...state };
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
