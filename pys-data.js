import { routeAction } from './api-config.js';
import { getState, setState } from './state.js';
import { createSharedPromise } from './search-utils.js';

const pysDataLoadedListeners = new Set();

export function subscribePysDataLoaded(listener) {
    if (typeof listener !== 'function') throw new TypeError('El listener de PyS debe ser una función.');
    pysDataLoadedListeners.add(listener);
    return () => pysDataLoadedListeners.delete(listener);
}

const fetchPysData = createSharedPromise(async () => {
    const response = await routeAction('getPysData');
    if (!response || !Array.isArray(response.data)) {
        throw new Error('getPysData no devolvió una colección válida.');
    }
    setState({ pysData: response.data });
    try {
        localStorage.setItem('gpsepedia_pys_cache', JSON.stringify(response.data));
    } catch (error) {
        // La caché local es opcional; el resultado remoto permanece disponible en memoria.
    }
    pysDataLoadedListeners.forEach(listener => {
        try { listener(response.data); }
        catch (error) { console.warn('Error notificando la actualización de PyS:', error); }
    });
    return response.data;
});

/**
 * Comparte una única petición getPysData entre búsqueda, autenticación y vistas de detalle.
 * refresh=true solicita actualización, pero reutiliza cualquier petición que ya esté en curso.
 */
export function loadPysData({ refresh = false } = {}) {
    const cached = getState().pysData;
    if (!refresh && Array.isArray(cached)) return Promise.resolve(cached);
    return fetchPysData();
}
