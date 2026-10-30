// GPSpedia Navigation Module | Version: 2.1.6
// Responsibilities:
// - Manage the application's view state and navigation flow.
// - Handle user navigation actions (e.g., selecting a category or brand).
// - Update the navigation state and trigger UI rendering calls.
// - Handle search functionality.

import { getState, setState } from './state.js';
import { routeAction } from './api-config.js';
import {
    mostrarCategorias,
    mostrarResultadosDeBusqueda, // Se importa la nueva función unificada de renderizado.
    showNoResultsMessage,
    mostrarSeccion
} from './ui.js';
import * as offline from './offline.js';

let datosFiltrados = [];
let searchDebounceTimer = null;

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
    const { cortes } = catalogData;
    const busqueda = textoBusqueda.toLowerCase().trim();

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

    // --- LÓGICA DE DETECCIÓN Y BÚSQUEDA POR VIN ---
    const cleanVinSearch = busqueda.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let isVinQuery = false;
    let targetVinPrefix = "";
    if (cleanVinSearch.length >= 6 && cleanVinSearch.length <= 18) {
        // Excluir los últimos 5 caracteres
        targetVinPrefix = cleanVinSearch.length > 5 ? cleanVinSearch.substring(0, cleanVinSearch.length - 5) : "";
        if (targetVinPrefix) {
            const vinMatchExists = cortes.some(c => {
                const vins = parseVinCollectionNavigation(c.vin);
                return vins.includes(targetVinPrefix);
            });
            if (vinMatchExists) {
                isVinQuery = true;
            }
        }
    }

    // --- LÓGICA DE FILTRADO Y SELECTORES DE FILTROS RÁPIDOS ---
    const catSelect = document.getElementById('filter-category-select');
    const yearSelect = document.getElementById('filter-year-select');

    const selectedCategory = catSelect ? catSelect.value.toLowerCase().trim() : '';
    const selectedYearStr = yearSelect ? yearSelect.value.trim() : '';
    const selectedYearNum = selectedYearStr ? parseInt(selectedYearStr, 10) : null;

    const yearSearchMatch = busqueda.match(/\b\d{4}\b/);
    let yearSearchTerm = yearSearchMatch ? parseInt(yearSearchMatch[0], 10) : selectedYearNum;

    if (yearSearchTerm && (yearSearchTerm < 1900 || yearSearchTerm > 2100)) {
        yearSearchTerm = null;
    }

    const palabrasBusqueda = busqueda.split(' ').filter(p => p);

    // --- LÓGICA DE BÚSQUEDA GLOBAL MULTI-SECCIÓN ---
    const { relay = [], tutoriales = [] } = catalogData || {};
    let pysItems = [];
    try {
        const pysState = getState().pysData;
        if (pysState) {
            pysItems = pysState;
        } else {
            routeAction('getPysData').then(res => {
                if (res && res.data) setState({ pysData: res.data });
            }).catch(() => {});
        }
    } catch(e) {}

    const stripHtml = (str) => String(str || '').replace(/<[^>]*>/g, ' ').toLowerCase();

    // 1. Search in Cortes
    const cortesMatches = cortes.filter(item => {
        if (selectedCategory) {
            const cat = (item.categoria || '').toLowerCase().trim();
            if (!cat.includes(selectedCategory) && !selectedCategory.includes(cat)) return false;
        }
        if (isVinQuery) {
            const vins = parseVinCollectionNavigation(item.vin);
            return vins.includes(targetVinPrefix);
        }
        if (yearSearchTerm) {
            const anoDesde = parseInt(item.anoDesde, 10);
            const anoHasta = item.anoHasta ? parseInt(item.anoHasta, 10) : anoDesde;
            if (yearSearchTerm < anoDesde || yearSearchTerm > anoHasta) return false;
        }
        if (busqueda) {
            const itemTexto = stripHtml(`${item.marca} ${item.modelo} ${item.versionesAplicables || ''} ${item.tipoEncendido || ''} ${item.categoria || ''} ${item.anoDesde || ''} ${item.anoHasta || ''} ${item.tipoCorte1 || ''} ${item.ubicacionCorte1 || ''} ${item.colorCableCorte1 || ''} ${item.vin || ''}`);
            return palabrasBusqueda.every(palabra => {
                if (yearSearchTerm && palabra === String(yearSearchTerm)) return true;
                return itemTexto.includes(palabra);
            });
        }
        return true;
    }).map(i => ({ ...i, _sectionType: 'corte' }));

    let relayMatches = [];
    let tutorialMatches = [];
    let pysMatches = [];

    // Evaluate multi-section matches only when an active text query is present
    if (busqueda && palabrasBusqueda.length > 0) {
        relayMatches = relay.filter(item => {
            const t = stripHtml(`${item.nombre || ''} ${item.tipo || ''} ${item.descripcion || ''} ${item.funcion || ''} ${item.observacion || ''}`);
            return palabrasBusqueda.every(p => t.includes(p));
        }).map(i => ({ ...i, _sectionType: 'relay', marca: i.nombre || 'Relay', modelo: i.tipo || 'Configuración' }));

        tutorialMatches = tutoriales.filter(item => {
            const t = stripHtml(`${item.Tema || ''} ${item.Descripcion || ''}`);
            return palabrasBusqueda.every(p => t.includes(p));
        }).map(i => ({ ...i, _sectionType: 'tutorial', marca: 'Tutorial', modelo: item.Tema }));

        pysMatches = pysItems.filter(item => {
            const t = stripHtml(`${item.Problema || ''} ${item.Descripcion || ''} ${item.Solucion || ''} ${item.Prevenir || ''}`);
            return palabrasBusqueda.every(p => t.includes(p));
        }).map(i => ({ ...i, _sectionType: 'pys', marca: 'Problema', modelo: item.Problema }));
    }

    // Combine global search results
    datosFiltrados = [...cortesMatches, ...relayMatches, ...tutorialMatches, ...pysMatches];

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

    if (!isRestoring) {
        if (wasAlreadySearching) {
            history.replaceState({ level: "busqueda_focused", query: textoBusqueda }, '', newUrl);
        } else {
            history.pushState({ level: "busqueda_focused", query: textoBusqueda }, '', newUrl);
        }
    }

    // --- LÓGICA DE CLASIFICACIÓN MEJORADA (BASADA EN RESULTADOS) ---
    const uniqueMarcasEnResultados = [...new Set(datosFiltrados.map(item => item.marca))];

    // Se considera una búsqueda de marca si solo hay una marca en los resultados
    // y el término de búsqueda coincide con el nombre de esa marca.
    const exactModelMatch = datosFiltrados.some(item => String(item.modelo).toLowerCase() === busqueda);

    if (!exactModelMatch && uniqueMarcasEnResultados.length === 1 && uniqueMarcasEnResultados[0].toLowerCase().includes(busqueda)) {
        mostrarResultadosDeBusqueda({ type: 'marca', query: textoBusqueda, results: uniqueMarcasEnResultados }, !isRestoring);
    } else {
        // En todos los demás casos (modelo, año, mixto), se muestran tarjetas de modelo.
        // Se elimina la de-duplicación para mostrar todas las versiones.
        mostrarResultadosDeBusqueda({ type: 'modelo', query: textoBusqueda, results: datosFiltrados }, !isRestoring);
    }
}
