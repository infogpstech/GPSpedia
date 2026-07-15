// GPSpedia Navigation Module | Version: 2.2
// Responsibilities:
// - Manage the application's view state and navigation flow.
// - Handle user navigation actions (e.g., selecting a category or brand).
// - Update the navigation state and trigger UI rendering calls.
// - Handle search functionality.

import { getState, setState } from './state.js';
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

export function getDatosFiltrados() {
    return datosFiltrados;
}

// Función refactorizada v2 para buscar, clasificar y mostrar resultados.
export function filtrarContenido(textoBusqueda, isRestoring = false) {
    const { catalogData } = getState();
    const { cortes } = catalogData;
    const busqueda = textoBusqueda.toLowerCase().trim();

    if (!busqueda) {
        datosFiltrados = [];
        irAPaginaPrincipal();
        return;
    }

    // --- LÓGICA DE FILTRADO MEJORADA ---
    const yearSearchMatch = busqueda.match(/\b\d{4}\b/);
    let yearSearchTerm = yearSearchMatch ? parseInt(yearSearchMatch[0], 10) : null;

    // Limitar detección de años a rangos válidos (1900-2100)
    if (yearSearchTerm && (yearSearchTerm < 1900 || yearSearchTerm > 2100)) {
        yearSearchTerm = null;
    }

    // Las palabras de búsqueda se derivan de la consulta completa para no excluir números de modelo (ej. 1500)
    const palabrasBusqueda = busqueda.split(' ').filter(p => p);

    datosFiltrados = cortes.filter(item => {
        // 1. Verificación del año (si se especificó uno).
        if (yearSearchTerm) {
            const anoDesde = parseInt(item.anoDesde, 10);
            const anoHasta = item.anoHasta ? parseInt(item.anoHasta, 10) : anoDesde;
            if (yearSearchTerm < anoDesde || yearSearchTerm > anoHasta) {
                return false; // El año no está en el rango, se descarta el item.
            }
        }
        // 2. Verificación del texto (si hay términos de búsqueda de texto).
        if (busqueda) {
            const itemTexto = `${String(item.marca)} ${String(item.modelo)} ${String(item.versionesAplicables || '')} ${String(item.tipoEncendido || '')} ${String(item.categoria || '')} ${String(item.anoDesde || '')} ${String(item.anoHasta || '')}`.toLowerCase();
            return palabrasBusqueda.every(palabra => {
                // Si la palabra es exactamente el año detectado, ya se verificó con el rango.
                if (yearSearchTerm && palabra === String(yearSearchTerm)) return true;
                return itemTexto.includes(palabra);
            });
        }
        // 3. Si solo se buscó un año y pasó la verificación, se incluye.
        return !!yearSearchTerm;
    });

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

    // Phase 2.4.9: Gestión inteligente del historial de búsqueda con estados nativos.
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
