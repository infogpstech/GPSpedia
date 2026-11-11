import { vinDifferentialEngine, vinSignatureStore, ensureVinSignatures, mapVinMatchesToRecords } from './VinDifferentialEngine.js';
// GPSpedia Navigation Module | Version: 2.1.6
// Responsibilities:
// - Manage the application's view state and navigation flow.
// - Handle user navigation actions (e.g., selecting a category or brand).
// - Update the navigation state and trigger UI rendering calls.
// - Handle search functionality.

import { getState, setState } from './state.js';
import { loadPysData, subscribePysDataLoaded } from './pys-data.js';
import {
    buildGlobalSearchResults,
    classifySearchResults,
    normalizeSearchText
} from './search-utils.js';
import {
    mostrarCategorias,
    mostrarResultadosDeBusqueda, // Se importa la nueva función unificada de renderizado.
    showNoResultsMessage,
    mostrarSeccion
} from './ui.js';
import * as offline from './offline.js';

let datosFiltrados = [];
let searchDebounceTimer = null;
function getCurrentOwnerId() {
    const user = getState().currentUser;
    return String(user && (user.ID || user.id) || '').trim();
}

// Una única notificación vuelve a ejecutar la consulta vigente cuando cualquier consumidor
// termina la petición compartida de PyS (precarga, búsqueda o modal).
subscribePysDataLoaded(() => {
    if (typeof window === 'undefined' || !window.location.hash.startsWith('#search=')) return;
    const navigationState = getState().navigationState || {};
    if (!['busqueda', 'busqueda_focused'].includes(navigationState.level)) return;
    const searchInput = document.getElementById('searchInput');
    const activeQuery = searchInput ? searchInput.value : navigationState.query || '';
    if (normalizeSearchText(activeQuery)) filtrarContenido(activeQuery, true);
});

export function irAPaginaPrincipal(isFromPopState = false) {
    // Se limpia el campo de búsqueda al regresar a la página principal.
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        // Phase 3.1: Asegurar que se oculta el botón de limpiar (X)
        if (searchInput.parentElement) {
            searchInput.parentElement.classList.remove('has-text');
        }
        // Quitar el foco para que se oculte el historial y se desactive el modo búsqueda
        searchInput.blur();
    }

    // Asegurar que se elimina la clase de búsqueda del body inmediatamente para disparar la animación inversa
    document.body.classList.remove('search-active');

    setState({ navigationState: { level: 'categorias', categoria: null, marca: null, modelo: null } });

    // Limpiar el hash de búsqueda al volver a la principal
    if (window.location.hash.startsWith('#search=')) {
        history.replaceState({ level: 'categorias' }, '', window.location.pathname + window.location.search);
    }

    // Phase 3.1: Asegurar que se muestra la sección de cortes (catálogo)
    // Esto resuelve el problema de que el botón no funcionaba desde Tutoriales o Relay.
    mostrarSeccion('cortes', isFromPopState);
}

// Función refactorizada v2 para buscar, clasificar y mostrar resultados.
// TAREA ADICIONAL: EXTENDER LA BÚSQUEDA PARA INCLUIR TODAS LAS SECCIONES DE GPSPEDIA
export function filtrarContenido(textoBusqueda, isRestoring = false) {
    const { catalogData } = getState();
    const cortes = Array.isArray(catalogData && catalogData.cortes) ? catalogData.cortes : [];
    const busqueda = normalizeSearchText(textoBusqueda);

    if (!busqueda) {
        datosFiltrados = [];
        if (isRestoring) {
            irAPaginaPrincipal(true);
        } else {
            // Mostrar categorías en el contenedor principal sin salir de la vista de búsqueda
            mostrarCategorias();

            // Mantener el estado de búsqueda activo con query vacía
            const isFocused = document.activeElement === document.getElementById('searchInput');
            const level = isFocused ? "busqueda_focused" : "busqueda";

            setState({ navigationState: { level, query: "" } });

            const newUrl = window.location.pathname + window.location.search;
            history.replaceState({ level, query: "" }, '', newUrl);
        }
        return;
    }

    // Helper para interpretar colecciones de VIN
    function parseVinCollectionNavigation(rawVin) {
        if (!rawVin) return [];
        const str = String(rawVin).trim();
        if (!str) return [];
        if (str.startsWith("[") && str.endsWith("]")) {
            try {
                const arr = JSON.parse(str);
                if (Array.isArray(arr)) {
                    return arr.map(v => String(v).trim().toUpperCase()).filter(Boolean);
                }
            } catch (e) {}
        }
        return str.split(/[,/\\;]+/).map(v => String(v).trim().toUpperCase()).filter(Boolean);
    }

    /* AUG-050: búsqueda VIN por classKey, con ambigüedad explícita */
    const cleanVinSearch = busqueda.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let isVinQuery = false;
    let matchedVehicleById = null;
    let vinChoiceItems = [];
    let vinMappingFailed = false;
    if (cleanVinSearch.length >= 5 && cleanVinSearch.length <= 25) {
        const directVinMatch = cortes.find(c => {
            const vins = parseVinCollectionNavigation(c.vin);
            return vins.some(v => v === cleanVinSearch || cleanVinSearch.startsWith(v) || v.startsWith(cleanVinSearch));
        });
        if (directVinMatch) { isVinQuery = true; matchedVehicleById = directVinMatch.id; }
        try {
            ensureVinSignatures(cortes, vinDifferentialEngine, vinSignatureStore);
            const diffMatch = vinDifferentialEngine.queryVehicle({ vin: cleanVinSearch });
            if (diffMatch && diffMatch.identificationType === "ambigua" && Array.isArray(diffMatch.matches)) {
                vinChoiceItems = mapVinMatchesToRecords(diffMatch.matches, cortes)
                    .map(item => ({ ...item, _sectionType: "corte", _vinAmbiguousChoice: true }));
                isVinQuery = true;
                matchedVehicleById = null;
                if (!vinChoiceItems.length) vinMappingFailed = true;
            } else if (diffMatch && diffMatch.identificationType === "completa" && diffMatch.match) {
                vinChoiceItems = mapVinMatchesToRecords([diffMatch.match], cortes)
                    .map(item => ({ ...item, _sectionType: "corte", _vinAmbiguousChoice: false }));
                if (vinChoiceItems.length) { isVinQuery = true; matchedVehicleById = vinChoiceItems[0].id; }
            }
        } catch (e) { console.error('Error en búsqueda de motor diferencial:', e); }
    }

    // --- BÚSQUEDA GLOBAL MULTI-SECCIÓN ---
    const { relay = [], tutoriales = [] } = catalogData || {};
    const pysState = getState().pysData;
    const pysItems = Array.isArray(pysState) ? pysState : [];
    if (!Array.isArray(pysState)) {
        loadPysData().catch(error => console.warn('No se pudo cargar PyS para la búsqueda global:', error));
    }

    datosFiltrados = buildGlobalSearchResults({ query: busqueda, cortes, relay, tutoriales, pys: pysItems });
    if (vinMappingFailed) datosFiltrados = [];
    if (vinChoiceItems.length > 0) {
        const ids = new Set(vinChoiceItems.map(item => String(item.id)));
        datosFiltrados = [...vinChoiceItems, ...datosFiltrados.filter(item => item._sectionType !== 'corte' || !ids.has(String(item.id)))];
    } else if (isVinQuery && matchedVehicleById && !datosFiltrados.some(item =>
        item._sectionType === 'corte' && String(item.id) === String(matchedVehicleById))) {
        const matchedVehicle = cortes.find(item => String(item.id) === String(matchedVehicleById));
        if (matchedVehicle) datosFiltrados.unshift({ ...matchedVehicle, _sectionType: 'corte', _searchPriority: -1 });
    }

    if (datosFiltrados.length === 0) {
        showNoResultsMessage(textoBusqueda);
        setState({ navigationState: { level: "busqueda" } });
        return;
    }

    // Guardar el historial únicamente para la cuenta que inició esta búsqueda.
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const searchOwnerId = getCurrentOwnerId();
    searchDebounceTimer = setTimeout(() => {
        if (!searchOwnerId || searchOwnerId === '0' || getCurrentOwnerId() !== searchOwnerId) return;
        if (textoBusqueda.trim().length >= 3) {
            offline.saveSearch(textoBusqueda, searchOwnerId).then(() => {
                if (getCurrentOwnerId() !== searchOwnerId) return;
                offline.getSearchHistory(searchOwnerId).then(history => {
                    if (getCurrentOwnerId() === searchOwnerId) setState({ searchHistory: history });
                });
            });
        }
    }, 1500);

    // Phase 2.1.5: Gestión inteligente del historial de búsqueda con estados nativos.
    const historyState = window.history.state || {};
    const wasAlreadySearching = historyState.level === "busqueda" || historyState.level === "busqueda_focused";

    // Se guarda el término de búsqueda en el estado para permitir la navegación hacia atrás.
    setState({ navigationState: { level: "busqueda_focused", query: textoBusqueda } });

    // Actualizar el hash para Deep Linking ANTES de renderizar resultados.
    const newUrl = window.location.pathname + window.location.search + `#search=${encodeURIComponent(textoBusqueda)}`;

    /* TAREA 7 (B08, B27): REPLACESTATE EN BÚSQUEDA PARA EVITAR COLISIONES CON AUTO-APERTURA */
    if (!isRestoring) {
        if (wasAlreadySearching) {
            history.replaceState({ level: "busqueda_focused", query: textoBusqueda }, '', newUrl);
        } else {
            history.pushState({ level: "busqueda_focused", query: textoBusqueda }, '', newUrl);
        }
    }

    const resultType = vinChoiceItems.length ? 'modelo' : classifySearchResults(datosFiltrados, busqueda);
    const renderResults = resultType === 'marca'
        ? [...new Set(datosFiltrados.map(item => item.marca).filter(Boolean))]
        : datosFiltrados;
    mostrarResultadosDeBusqueda({ type: resultType, query: textoBusqueda, results: renderResults }, !isRestoring);
}
