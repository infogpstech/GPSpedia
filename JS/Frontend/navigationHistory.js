const PREVIOUS_NAVIGATION_KEY = '__gpPreviousNavigation';
const NAVIGATION_FIELDS = [
    'level', 'query', 'categoria', 'marca', 'modelo',
    'versionEquipamiento', 'tipoEncendido', 'origin', 'section'
];

export function pickNavigationState(state) {
    if (!state || typeof state !== 'object' || (!state.level && !state.section)) return null;
    const picked = {};
    NAVIGATION_FIELDS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(state, key) && state[key] !== undefined) {
            picked[key] = state[key];
        }
    });
    return picked;
}

export function sameNavigationState(left, right) {
    const a = pickNavigationState(left);
    const b = pickNavigationState(right);
    if (!a || !b) return false;
    return NAVIGATION_FIELDS.every(key => {
        const hasA = Object.prototype.hasOwnProperty.call(a, key);
        const hasB = Object.prototype.hasOwnProperty.call(b, key);
        const valueA = hasA ? a[key] : undefined;
        const valueB = hasB ? b[key] : undefined;
        // Una dimensión opcional sin selección equivale tanto si se omite como si vale null.
        if (valueA == null && valueB == null) return true;
        return hasA === hasB && valueA === valueB;
    });
}

function resolveHistory(historyObject) {
    if (historyObject) return historyObject;
    if (typeof window !== 'undefined' && window.history) return window.history;
    throw new Error('History API no disponible');
}

function resolveLocation(locationObject) {
    if (locationObject) return locationObject;
    if (typeof window !== 'undefined' && window.location) return window.location;
    return { pathname: '/', search: '', hash: '' };
}

function buildNavigationUrl(state, locationObject) {
    const location = resolveLocation(locationObject);
    const base = (location.pathname || '/') + (location.search || '');
    if ((state.level === 'busqueda' || state.level === 'busqueda_focused') && state.query) {
        return base + '#search=' + encodeURIComponent(state.query);
    }
    if (state.section) return base + (state.section === 'cortes' ? '' : '#' + state.section);
    return base;
}

export function pushNavigationState(nextState, options = {}) {
    const historyObject = resolveHistory(options.historyObject);
    const locationObject = resolveLocation(options.locationObject);
    const normalizedNext = pickNavigationState(nextState);
    if (!normalizedNext) throw new Error('Estado de navegación inválido');

    const currentState = historyObject.state || {};
    const currentNavigation = pickNavigationState(currentState);
    const storedPrevious = pickNavigationState(currentState[PREVIOUS_NAVIGATION_KEY]);
    const fallbackPrevious = pickNavigationState(options.previousNavigationState);
    const previousNavigation = currentNavigation || fallbackPrevious || storedPrevious || null;
    const entry = {
        ...normalizedNext,
        [PREVIOUS_NAVIGATION_KEY]: sameNavigationState(currentNavigation, normalizedNext)
            ? (storedPrevious || fallbackPrevious)
            : previousNavigation
    };
    const url = buildNavigationUrl(normalizedNext, locationObject);

    if (sameNavigationState(currentNavigation, normalizedNext)) {
        historyObject.replaceState(entry, '', url);
        return 'replace';
    }
    historyObject.pushState(entry, '', url);
    return 'push';
}

export function replaceNavigationState(nextState, options = {}) {
    const historyObject = resolveHistory(options.historyObject);
    const locationObject = resolveLocation(options.locationObject);
    const normalizedNext = pickNavigationState(nextState);
    if (!normalizedNext) throw new Error('Estado de navegación inválido');
    const currentState = historyObject.state || {};
    const previousNavigation = pickNavigationState(currentState[PREVIOUS_NAVIGATION_KEY]) ||
        pickNavigationState(options.previousNavigationState);
    historyObject.replaceState({
        ...normalizedNext,
        [PREVIOUS_NAVIGATION_KEY]: previousNavigation
    }, '', buildNavigationUrl(normalizedNext, locationObject));
    return 'replace';
}

export function navigateBackToState(targetState, options = {}) {
    const historyObject = resolveHistory(options.historyObject);
    const locationObject = resolveLocation(options.locationObject);
    const target = pickNavigationState(targetState);
    if (!target) throw new Error('Destino de navegación inválido');

    const currentState = historyObject.state || {};
    const currentNavigation = pickNavigationState(currentState);
    if (sameNavigationState(currentNavigation, target)) return 'current';

    const previousNavigation = pickNavigationState(currentState[PREVIOUS_NAVIGATION_KEY]);
    if (sameNavigationState(previousNavigation, target)) {
        historyObject.back();
        return 'back';
    }

    // El destino puede traer su propio antecesor. Debe prevalecer sobre la
    // metadata de la vista actual, que puede pertenecer a una ruta obsoleta.
    const targetPreviousNavigation = pickNavigationState(targetState.previousState);
    const fallbackPrevious = targetPreviousNavigation || previousNavigation ||
        pickNavigationState(options.previousNavigationState);
    historyObject.replaceState({
        ...target,
        [PREVIOUS_NAVIGATION_KEY]: fallbackPrevious
    }, '', buildNavigationUrl(target, locationObject));
    if (typeof options.renderFallback === 'function') {
        options.renderFallback({
            ...target,
            previousState: fallbackPrevious
        });
    }
    return 'replace';
}

export const navigationHistoryStateKey = PREVIOUS_NAVIGATION_KEY;
