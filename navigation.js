// GPSpedia Navigation Module | Version: 2.0
// Responsibilities:
// - Manage the application's view state and navigation flow.
// - Handle user navigation actions (e.g., selecting a category or brand).
// - Update the navigation state and trigger UI rendering calls.
// - Handle search functionality.

import { getState, setState } from './state.js';
import {
    mostrarCategorias,
    mostrarResultadosDeBusqueda, // Se importa la nueva función unificada de renderizado.
    showNoResultsMessage
} from './ui.js';

let datosFiltrados = [];

export function irAPaginaPrincipal() {
    // Se limpia el campo de búsqueda al regresar a la página principal.
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    setState({ navigationState: { level: 'categorias', categoria: null, marca: null, modelo: null } });
    mostrarCategorias();
}

export function getDatosFiltrados() {
    return datosFiltrados;
}

// Función refactorizada v2 para buscar, clasificar y mostrar resultados.
export function filtrarContenido(textoBusqueda) {
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

    const nonYearBusqueda = yearSearchTerm ? busqueda.replace(yearSearchMatch[0], '').trim() : busqueda;
    const palabrasBusqueda = nonYearBusqueda.split(' ').filter(p => p);

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
        if (nonYearBusqueda) {
            const itemTexto = `${item.marca} ${item.modelo} ${item.versionesAplicables}`.toLowerCase();
            return palabrasBusqueda.every(palabra => itemTexto.includes(palabra));
        }
        // 3. Si solo se buscó un año y pasó la verificación, se incluye.
        return !!yearSearchTerm;
    });

    if (datosFiltrados.length === 0) {
        showNoResultsMessage(textoBusqueda);
        setState({ navigationState: { level: "busqueda" } });
        return;
    }

    // --- LÓGICA DE CLASIFICACIÓN MEJORADA (BASADA EN RESULTADOS) ---
    const uniqueMarcasEnResultados = [...new Set(datosFiltrados.map(item => item.marca))];

    // Se considera una búsqueda de marca si solo hay una marca en los resultados
    // y el término de búsqueda coincide con el nombre de esa marca.
    const exactModelMatch = datosFiltrados.some(item => String(item.modelo).toLowerCase() === busqueda);

    if (!exactModelMatch && uniqueMarcasEnResultados.length === 1 && String(uniqueMarcasEnResultados[0]).toLowerCase().includes(busqueda)) {
        mostrarResultadosDeBusqueda({ type: 'marca', query: textoBusqueda, results: uniqueMarcasEnResultados });
    } else {
        // En todos los demás casos (modelo, año, mixto), se muestran tarjetas de modelo.
        // Se elimina la de-duplicación para mostrar todas las versiones.
        mostrarResultadosDeBusqueda({ type: 'modelo', query: textoBusqueda, results: datosFiltrados });
    }

    // Se guarda el término de búsqueda en el estado para permitir la navegación hacia atrás.
    setState({ navigationState: { level: "busqueda", query: textoBusqueda } });
}
