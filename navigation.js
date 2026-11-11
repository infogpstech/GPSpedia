import { vinDifferentialEngine } from './VinDifferentialEngine.js';
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

    /* TAREA 4.1: INTEGRACIÓN CON LA BARRA DE BÚSQUEDA GLOBAL POR VIN Y DIFERENCIACIÓN DE VERSIONES */
    // --- LÓGICA DE DETECCIÓN Y BÚSQUEDA POR VIN ---
    const cleanVinSearch = busqueda.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let isVinQuery = false;
    let targetVinPrefix = "";
    let identifiedExactVersion = null;
    let matchedVehicleById = null;

    if (cleanVinSearch.length >= 5 && cleanVinSearch.length <= 25) {
        // 1. Comprobación directa con VIN completo o prefijo sin serial
        const vinExactMatch = cortes.find(c => {
            const vins = parseVinCollectionNavigation(c.vin);
            return vins.some(v => v === cleanVinSearch || cleanVinSearch.startsWith(v) || v.startsWith(cleanVinSearch));
        });

        if (vinExactMatch) {
            isVinQuery = true;
            matchedVehicleById = vinExactMatch.id;
        }

        // 2. Si no hubo coincidencia directa exacta, o para modelos con múltiples versiones, consultar el motor diferencial
        try {
            if (vinDifferentialEngine.signatures.size === 0 && cortes) {
                vinDifferentialEngine.calculateSignatures(cortes);
            }
            const diffMatch = vinDifferentialEngine.queryVehicle({ vin: cleanVinSearch });
            if (diffMatch && diffMatch.match && (diffMatch.identificationType === 'completa' || diffMatch.identificationType === 'parcial')) {
                const matchedVehicle = cortes.find(c =>
                    c.marca.toUpperCase() === diffMatch.match.marca.toUpperCase() &&
                    c.modelo.toUpperCase() === diffMatch.match.modelo.toUpperCase()
                );
                if (matchedVehicle) {
                    isVinQuery = true;
                    matchedVehicleById = matchedVehicle.id;
                    identifiedExactVersion = diffMatch.match.version;
                }
            }
        } catch (e) {
            console.error('Error en búsqueda de motor diferencial:', e);
        }
    }

    // --- BÚSQUEDA GLOBAL MULTI-SECCIÓN ---
    const { relay = [], tutoriales = [] } = catalogData || {};
    const pysState = getState().pysData;
    const pysItems = Array.isArray(pysState) ? pysState : [];
    if (!Array.isArray(pysState)) {
        loadPysData().catch(error => console.warn('No se pudo cargar PyS para la búsqueda global:', error));
    }

    // El motor diferencial de VIN puede reconocer prefijos que no aparecen literalmente en el registro.
    const searchableCuts = cortes.map(item => {
        if (isVinQuery && matchedVehicleById && String(item.id) === String(matchedVehicleById) && identifiedExactVersion) {
            return { ...item, _identifiedVersion: identifiedExactVersion };
        }
        return item;
    });
    datosFiltrados = buildGlobalSearchResults({
        query: busqueda,
        cortes: searchableCuts,
        relay,
        tutoriales,
        pys: pysItems
    });

    if (isVinQuery && matchedVehicleById && !datosFiltrados.some(item =>
        item._sectionType === 'corte' && String(item.id) === String(matchedVehicleById))) {
        const matchedVehicle = searchableCuts.find(item => String(item.id) === String(matchedVehicleById));
        if (matchedVehicle) datosFiltrados.unshift({ ...matchedVehicle, _sectionType: 'corte', _searchPriority: -1 });
    }

    if (datosFiltrados.length === 0) {
        showNoResultsMessage(textoBusqueda);
        setState({ navigationState: { level: "busqueda" } });
        return;
    }

    // Guardar en historial de búsqueda (offline) con Debounce de Phase 2
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        if (textoBusqueda.trim().length >= 3) {
            offline.saveSearch(textoBusqueda).then(() => {
                offline.getSearchHistory().then(history => setState({ searchHistory: history }));
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

    const resultType = classifySearchResults(datosFiltrados, busqueda);
    const renderResults = resultType === 'marca'
        ? [...new Set(datosFiltrados.map(item => item.marca).filter(Boolean))]
        : datosFiltrados;
    mostrarResultadosDeBusqueda({ type: resultType, query: textoBusqueda, results: renderResults }, !isRestoring);
}
