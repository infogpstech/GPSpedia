// GPSpedia UI Module | Version: 2.0
// Responsibilities:
// - Render UI components based on state.
// - Contain all functions that directly manipulate the DOM.
// - Use document.createElement, not HTML strings.

import { getFeedbackItems, replyToFeedback, markAsResolved, getActivityLogs, routeAction, recordLike, reportProblem } from './api-config.js';
import { getState, setState, subscribe } from './state.js';

const backSvg = '<svg style="width:20px;height:20px;margin-right:5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

// Constants for optimized image loading
export const IMG_SIZE_SMALL = 300;   // Cards and thumbnails
export const IMG_SIZE_MEDIUM = 800;  // Modal details
export const IMG_SIZE_LARGE = 1600;  // Lightbox / High Resolution

export function getImageUrl(fileId, size = 400) {
    const placeholder = "https://placehold.co/400x300/cccccc/333333?text=Sin+Imagen";

    if (!fileId || typeof fileId !== 'string' || fileId.trim() === '') {
        return placeholder;
    }

    let id = fileId.trim();

    // Si es una URL de Google Drive, extraer el ID.
    if (id.startsWith('http')) {
        if (id.includes('drive.google.com')) {
            const match = id.match(/[\/&]id=([a-zA-Z0-9_-]+)/) || id.match(/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                id = match[1];
            } else {
                // Si es una URL de Google pero no podemos extraer el ID, es mejor no mostrar nada.
                return placeholder;
            }
        } else {
            // Si es otra URL (ej. de wikimedia), la devolvemos directamente.
            return id;
        }
    }

    // Si después del procesamiento no tenemos un ID válido, devolver el placeholder.
    if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
        return placeholder;
    }

    // Optimización de resolución: duplicar tamaño para pantallas Retina si es pequeño
    const finalSize = (typeof size === 'number' && size < 600) ? size * 2 : size;
    const sizeParam = typeof finalSize === 'number' ? `w${finalSize}` : finalSize;
    return `https://drive.google.com/thumbnail?id=${id}&sz=${sizeParam}`;
}

export function getLogoUrlForMarca(marca, categoria) {
    const { catalogData } = getState();
    const { logos } = catalogData;

    if (!logos || !logos.length || !marca) {
        return null;
    }

    const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const normalizedMarca = normalize(marca);
    const normalizedCategoria = normalize(categoria);

    const potentialMatches = logos.filter(logo => {
        const normalizedLogoMarca = normalize(logo.nombreMarca);
        return normalizedLogoMarca.startsWith(normalizedMarca);
    });

    if (potentialMatches.length === 0) return null;
    if (potentialMatches.length === 1) return potentialMatches[0].urlLogo;

    let bestMatch = null;
    if (normalizedCategoria) {
        const catSynonyms = (normalizedCategoria === 'motos' || normalizedCategoria === 'motocicletas')
            ? ['motos', 'motocicletas']
            : [normalizedCategoria];

        for (const synonym of catSynonyms) {
            bestMatch = potentialMatches.find(logo => normalize(logo.nombreMarca).includes(synonym));
            if (bestMatch) break;
        }
    }

    if (!bestMatch) {
        bestMatch = potentialMatches.find(logo => normalize(logo.nombreMarca) === normalizedMarca);
    }

    if (!bestMatch) {
        bestMatch = potentialMatches.reduce((prev, current) =>
            (prev.nombreMarca.length < current.nombreMarca.length) ? prev : current
        );
    }

    return bestMatch ? bestMatch.urlLogo : (potentialMatches.length > 0 ? potentialMatches[0].urlLogo : null);
}

function crearCarrusel(titulo, items, cardGenerator) {
    const cont = document.getElementById("contenido");
    if (!items || items.length === 0 || !cont) return;

    const section = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = titulo;
    title.style.marginTop = '40px';
    section.appendChild(title);

    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'carousel-container';
    const carouselTrack = document.createElement('div');
    carouselTrack.className = 'carousel-track';

    items.forEach(item => {
        const card = cardGenerator(item);
        carouselTrack.appendChild(card);
    });
    carouselContainer.appendChild(carouselTrack);

    const getVisibleCards = () => {
        const containerWidth = carouselContainer.offsetWidth;
        const cardWidth = 140 + 20; // Ancho de la tarjeta + margen
        return Math.floor(containerWidth / cardWidth) || 1;
    };

    if (items.length > getVisibleCards()) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-btn prev';
        prevBtn.innerHTML = '&#10094;';
        carouselContainer.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-btn next';
        nextBtn.innerHTML = '&#10095;';
        carouselContainer.appendChild(nextBtn);

        const cardWidth = 140 + 20;

        const updateCarouselButtons = () => {
            const scrollLeft = carouselTrack.scrollLeft;
            const maxScrollLeft = carouselTrack.scrollWidth - carouselTrack.clientWidth;
            prevBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
            nextBtn.style.display = scrollLeft < maxScrollLeft - 1 ? 'flex' : 'none';
        };

        nextBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: cardWidth * getVisibleCards(), behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: -cardWidth * getVisibleCards(), behavior: 'smooth' });
        });

        carouselTrack.addEventListener('scroll', () => setTimeout(updateCarouselButtons, 150));
        window.addEventListener('resize', () => setTimeout(updateCarouselButtons, 150));
        setTimeout(updateCarouselButtons, 150);
    }

    section.appendChild(carouselContainer);
    cont.appendChild(section);
}

export function mostrarCategorias() {
    const { catalogData } = getState();
    const { cortes, sortedCategories } = catalogData;

    if (document.getElementById("searchInput").value.trim()) return;

    const cont = document.getElementById("contenido");
    cont.innerHTML = "";

    mostrarUltimosAgregados();

    // Comentario: Se implementa el ordenamiento de categorías por población.
    const categoriasPorPoblacion = [...new Set(cortes.map(c => c.categoria).filter(Boolean))]
        .map(cat => ({
            nombre: cat,
            poblacion: cortes.filter(c => c.categoria === cat).length
        }))
        .sort((a, b) => b.poblacion - a.poblacion)
        .map(c => c.nombre);

    crearCarrusel('Búsqueda por Categoría', categoriasPorPoblacion, cat => {
        const ejemplo = cortes.find(item => item.categoria === cat && item.imagenVehiculo);
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarMarcas(cat);
        const img = document.createElement("img");
        img.src = getImageUrl(ejemplo?.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Categoría ${cat}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${cat}</div>`;
        card.appendChild(overlay);
        return card;
    });

    const marcasVehiculos = [...new Set(cortes
        .filter(item => item.categoria && !['motocicletas', 'motos'].includes(item.categoria.toLowerCase()))
        .map(item => item.marca))]
        .filter(Boolean).sort();

    // Comentario: Se corrige el título y el flujo de navegación para cumplir con el README.
    crearCarrusel('Búsqueda por Marca de Vehículos', marcasVehiculos, marca => {
        const logoUrl = getLogoUrlForMarca(marca, null);
        const card = document.createElement("div");
        card.className = "card brand-logo-item";
        // Cambio Crítico: Corregir el flujo de navegación para que vaya de Marca -> Modelos.
        card.onclick = () => mostrarModelosPorMarca(marca);
        const img = document.createElement("img");
        img.src = getImageUrl(logoUrl, IMG_SIZE_SMALL);
        img.alt = `Marca ${marca}`;
        img.loading = "lazy";
        card.appendChild(img);
        return card;
    });

    const marcasMotos = [...new Set(cortes
        .filter(item => item.categoria && ['motocicletas', 'motos'].includes(item.categoria.toLowerCase()))
        .map(item => item.marca))]
        .filter(Boolean).sort();

    // Comentario: Título ajustado para consistencia.
    crearCarrusel('Búsqueda por Marca de Motocicletas', marcasMotos, marca => {
        const logoUrl = getLogoUrlForMarca(marca, 'Motocicletas');
        const card = document.createElement("div");
        card.className = "card brand-logo-item";
        card.onclick = () => mostrarModelos('Motocicletas', marca);
        const img = document.createElement("img");
        img.src = getImageUrl(logoUrl, IMG_SIZE_SMALL);
        img.alt = `Marca ${marca}`;
        img.loading = "lazy";
        card.appendChild(img);
        return card;
    });
}

export function mostrarMarcas(categoria) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    setState({ navigationState: { level: "marcas", categoria: categoria } });
    const cont = document.getElementById("contenido");
    cont.innerHTML = `<span class="backBtn" onclick="window.navigation.irAPaginaPrincipal()">${backSvg} Volver</span><h4>Marcas de ${categoria}</h4>`;
    const itemsInCategory = cortes.filter(item => item.categoria === categoria);
    const marcas = [...new Set(itemsInCategory.map(item => item.marca))].filter(m => m).sort();

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
    grid.style.gap = "30px";

    marcas.forEach(m => {
        const logoUrl = getLogoUrlForMarca(m, categoria);
        const logoContainer = document.createElement("div");
        logoContainer.className = "card brand-logo-item";
        logoContainer.onclick = () => mostrarModelos(categoria, m);

        const img = document.createElement("img");
        img.src = getImageUrl(logoUrl, IMG_SIZE_SMALL) || 'https://placehold.co/120x80/cccccc/333333?text=Sin+Logo';
        img.alt = `Marca ${m}`;
        img.loading = "lazy";

        logoContainer.appendChild(img);
        grid.appendChild(logoContainer);
    });
    cont.appendChild(grid);
}

/**
 * Nueva función para implementar el flujo de navegación lineal: Marca -> Modelos.
 * Reemplaza la función redundante y circular mostrarCategoriasPorMarca.
 * @param {string} marca - La marca de vehículos para la cual mostrar los modelos.
 */
export function mostrarModelosPorMarca(marca) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    // Se establece el estado de navegación actual capturando el estado previo.
    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "modelosPorMarca", marca: marca, previousState } });
    const cont = document.getElementById("contenido");

    // Lógica dinámica para el botón "Volver": regresa a búsqueda si ese era el origen.
    const backAction = previousState.level === 'busqueda'
        ? 'window.ui.regresarABusqueda()'
        : 'window.navigation.irAPaginaPrincipal()';

    // Se limpia el contenido y se añade el botón de regreso dinámico.
    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Modelos de ${marca}</h4>`;

    // Se filtran los cortes para obtener todos los modelos de la marca seleccionada, excluyendo motocicletas
    const modelosFiltrados = cortes.filter(item => item.marca === marca && item.categoria && !['motocicletas', 'motos'].includes(item.categoria.toLowerCase()));

    // Se obtienen modelos únicos para no repetir tarjetas
    const modelosUnicos = [...new Map(modelosFiltrados.map(item => [item.modelo, item])).values()].sort((a,b) => a.modelo.localeCompare(b.modelo));

    const grid = document.createElement("div");
    grid.className = "grid";
    modelosUnicos.forEach(ejemplo => {
        const card = document.createElement("div");
        card.className = "card";
        // Comentario: Se utiliza la nueva función "hub" para decidir el siguiente paso.
        card.onclick = () => navegarADetallesDeModelo(ejemplo.categoria, marca, ejemplo.modelo);
        const img = document.createElement("img");
        img.src = getImageUrl(ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Modelo ${ejemplo.modelo}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${ejemplo.modelo}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

/**
 * Función "Hub" para decidir el siguiente paso en la navegación después de seleccionar un modelo.
 * Verifica si existen versiones de equipamiento para un modelo y dirige al usuario a la pantalla
 * correspondiente (selección de versión o selección de tipo de encendido).
 * @param {string} categoria - La categoría del vehículo.
 * @param {string} marca - La marca del vehículo.
 * @param {string} modelo - El modelo del vehículo.
 */
function navegarADetallesDeModelo(categoria, marca, modelo) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    // Comentario: Lógica de navegación refactorizada para omitir pantallas de selección con una sola opción.
    // 1. Obtener todos los cortes para el modelo específico.
    let vehiculosFiltrados = cortes.filter(item =>
        item.categoria === categoria &&
        item.marca === marca &&
        item.modelo === modelo
    );

    // 2. Analizar Versiones de Equipamiento.
    const versionesDeEquipamiento = [...new Set(vehiculosFiltrados.map(v => v.versionesAplicables).filter(Boolean))];

    if (versionesDeEquipamiento.length === 1) {
        // Omitir pantalla: Si hay una sola versión, se filtra el conjunto de datos y se continúa el análisis.
        vehiculosFiltrados = vehiculosFiltrados.filter(v => v.versionesAplicables === versionesDeEquipamiento[0]);
    } else if (versionesDeEquipamiento.length > 1) {
        // Detener: Si hay múltiples versiones, se muestra la pantalla de selección y termina el flujo.
        mostrarVersionesEquipamiento(categoria, marca, modelo);
        return;
    }
    // Si hay 0 versiones, se continúa con el conjunto de datos original.

    // 3. Analizar Tipos de Encendido sobre el conjunto de datos ya (potencialmente) filtrado.
    const tiposEncendido = [...new Set(vehiculosFiltrados.map(v => v.tipoEncendido).filter(Boolean))];

    if (tiposEncendido.length === 1) {
        // Omitir pantalla: Si hay un solo tipo de encendido, se filtra y se navega directamente a la pantalla de Años.
        vehiculosFiltrados = vehiculosFiltrados.filter(v => v.tipoEncendido === tiposEncendido[0]);
        mostrarVersiones(vehiculosFiltrados, categoria, marca, modelo);
        return;
    } else if (tiposEncendido.length > 1) {
        // Detener: Si hay múltiples tipos, se muestra la pantalla de selección y termina el flujo.
        const versionEquipamiento = versionesDeEquipamiento.length === 1 ? versionesDeEquipamiento[0] : null;
        mostrarTiposEncendido(categoria, marca, versionEquipamiento, modelo);
        return;
    }

    // 4. Fallback: Si no hay ni versiones ni tipos de encendido, pero sí hay datos, se muestra la pantalla de Años.
    if (vehiculosFiltrados.length > 0) {
        mostrarVersiones(vehiculosFiltrados, categoria, marca, modelo);
    } else {
        // Caso de seguridad: no debería ocurrir si se hizo clic en un modelo existente.
        showNoResultsMessage(`Datos para ${marca} ${modelo}`);
    }
}

export function mostrarModelos(categoria, marca, versionEquipamiento = null) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "modelos", categoria, marca, versionEquipamiento, previousState } });
    const cont = document.getElementById("contenido");

    // Lógica dinámica para el botón "Volver"
    let backAction;
    if (versionEquipamiento) {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}')`;
    } else if (previousState.level === 'modelosPorMarca') {
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        backAction = `window.ui.mostrarMarcas('${categoria}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Modelos de ${marca} ${versionEquipamiento || ''}</h4>`;

    let modelosFiltrados = cortes.filter(item => item.categoria === categoria && item.marca === marca);
    if (versionEquipamiento) {
        modelosFiltrados = modelosFiltrados.filter(item => item.versionesAplicables === versionEquipamiento);
    }

    const modelosUnicos = [...new Map(modelosFiltrados.map(item => [item.modelo, item])).values()].sort((a,b) => a.modelo.localeCompare(b.modelo));

    // Comentario: Se elimina la lógica de omisión de pantalla. La decisión ahora se centraliza en `navegarADetallesDeModelo`.

    const grid = document.createElement("div"); grid.className = "grid";
    modelosUnicos.forEach(ejemplo => {
        const card = document.createElement("div"); card.className = "card";
        // Comentario: Se utiliza la nueva función "hub" para decidir el siguiente paso.
        card.onclick = () => navegarADetallesDeModelo(categoria, marca, ejemplo.modelo);
        const img = document.createElement("img");
        img.src = getImageUrl(ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Modelo ${ejemplo.modelo}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div"); overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${ejemplo.modelo}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

export function mostrarTiposEncendido(categoria, marca, versionEquipamiento, modelo) {
     const { catalogData } = getState();
    const { cortes } = catalogData;
    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "tiposEncendido", categoria, marca, versionEquipamiento, modelo, previousState } });

    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica para el botón "Volver".
    // Regresa a `mostrarVersionesEquipamiento` si ese fue el paso anterior, si no, a `mostrarModelos`.
    // Se añade soporte para el flujo de navegación por marca (modelosPorMarca).
    let backAction;
    if (previousState.level === 'versionesEquipamiento') {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}', '${modelo}')`;
    } else if (previousState.level === 'modelosPorMarca') {
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        backAction = `window.ui.mostrarModelos('${categoria}', '${marca}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Tipos de Encendido para ${modelo} ${versionEquipamiento || ''}</h4>`;

    let vehiculos = cortes.filter(item =>
        item.categoria === categoria &&
        item.marca === marca &&
        item.modelo === modelo &&
        (!versionEquipamiento || item.versionesAplicables === versionEquipamiento)
    );

    const tiposEncendido = [...new Set(vehiculos.map(v => v.tipoEncendido).filter(Boolean))];

    // Comentario: Se elimina el bloque condicional `if (tiposEncendido.length === 1)` que causaba el bug.
    // Al forzar siempre la visualización de esta pantalla, se asegura que la función `mostrarVersiones`
    // reciba siempre un conjunto de datos correctamente filtrado por tipo de encendido,
    // manteniendo la consistencia del flujo de navegación.

    const grid = document.createElement("div"); grid.className = "grid";
    tiposEncendido.forEach(tipo => {
        const ejemplo = vehiculos.find(v => v.tipoEncendido === tipo);
        const card = document.createElement("div"); card.className = "card";
        card.onclick = () => mostrarVersiones(vehiculos.filter(v => v.tipoEncendido === tipo), categoria, marca, modelo);

        const img = document.createElement("img");
        img.src = getImageUrl(ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = tipo;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.innerHTML = `<div class="overlay-text-primary">${tipo}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

export function mostrarVersiones(filas, categoria, marca, modelo) {
    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "versiones", categoria, marca, modelo, previousState } });
    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica MEJORADA para el botón "Volver".
    // Determina si el paso anterior fue una búsqueda, selección de tipo de encendido o de versión de equipamiento.
    let backAction;
    if (previousState.level === 'busqueda') {
        // Si venimos de una búsqueda, el botón debe regresar a los resultados de esa búsqueda.
        backAction = `window.ui.regresarABusqueda()`;
    } else if (previousState.level === 'tiposEncendido') {
        // Comentario: Se corrige el bug que pasaba 'null' como string.
        // Se asegura que si no hay versión de equipamiento, se pase el valor literal `null`.
        const veq = previousState.versionEquipamiento ? `'${previousState.versionEquipamiento}'` : null;
        backAction = `window.ui.mostrarTiposEncendido('${categoria}', '${marca}', ${veq}, '${modelo}')`;
    } else if (previousState.level === 'versionesEquipamiento') {
        backAction = `window.ui.mostrarVersionesEquipamiento('${categoria}', '${marca}', '${modelo}')`;
    } else if (previousState.level === 'modelosPorMarca') {
        // Soporte para el flujo de navegación por marca (modelosPorMarca).
        backAction = `window.ui.mostrarModelosPorMarca('${marca}')`;
    } else {
        // Fallback seguro, regresa a la lista de modelos.
        backAction = `window.ui.mostrarModelos('${categoria}', '${marca}')`;
    }

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Años de ${modelo}</h4>`;
    const grid = document.createElement("div"); grid.className = "grid";
    filas.forEach(item => {
        const card = document.createElement("div"); card.className = "card";
        card.onclick = () => mostrarDetalleModal(item);
        const img = document.createElement("img");
        img.src = getImageUrl(item.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Corte ${item.anoDesde}`;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div"); overlay.className = "overlay";
        const yearRange = item.anoHasta ? `${item.anoDesde} - ${item.anoHasta}` : item.anoDesde;
        overlay.innerHTML = `<div style="font-weight:bold;">${yearRange || modelo}</div><div style="font-size:0.8em;">${item.tipoEncendido || ''}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

/**
 * Nueva función para reconstruir la vista de resultados de búsqueda.
 * Utiliza el `query` guardado en el estado de navegación.
 */
export function regresarABusqueda() {
    const { navigationState } = getState();
    // CORRECCIÓN DEFINITIVA: La lógica ahora inspecciona el `previousState` anidado.
    // Cuando se llama a esta función, el estado actual es 'versiones', pero el estado
    // que contiene la información de la búsqueda es el 'previousState'.
    const prevState = navigationState ? navigationState.previousState : null;

    if (prevState && prevState.level === 'busqueda' && prevState.query) {
        // Vuelve a ejecutar la función de filtrado con el término de búsqueda guardado en el estado anterior.
        window.navigation.filtrarContenido(prevState.query);
    } else {
        // Si el estado anterior no es de búsqueda, regresa a la página principal como fallback seguro.
        window.navigation.irAPaginaPrincipal();
    }
}

export function mostrarVersionesEquipamiento(categoria, marca, modelo) {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    const previousState = getState().navigationState || {};
    setState({ navigationState: { level: "versionesEquipamiento", categoria, marca, modelo, previousState } });
    const cont = document.getElementById("contenido");

    // Comentario: Lógica dinámica para el botón "Volver".
    // Se añade soporte para el flujo de navegación por marca (modelosPorMarca).
    const backAction = previousState.level === 'modelosPorMarca'
        ? `window.ui.mostrarModelosPorMarca('${marca}')`
        : `window.ui.mostrarModelos('${categoria}', '${marca}')`;

    cont.innerHTML = `<span class="backBtn" onclick="${backAction}">${backSvg} Volver</span><h4>Versiones de ${modelo}</h4>`;

    // Comentario: Se filtra por modelo específico para mostrar solo las versiones relevantes.
    const vehiculosDelModelo = cortes.filter(item => item.categoria === categoria && item.marca === marca && item.modelo === modelo);
    const versiones = [...new Set(vehiculosDelModelo.map(item => item.versionesAplicables).filter(v => v))];

    const grid = document.createElement("div");
    grid.className = "grid";

    versiones.forEach(version => {
        const vehiculosDeVersion = vehiculosDelModelo.filter(v => v.versionesAplicables === version);
        const tiposDeEncendidoEnVersion = [...new Set(vehiculosDeVersion.map(v => v.tipoEncendido).filter(Boolean))].join(' / ');

        const ejemplo = vehiculosDeVersion.find(item => item.imagenVehiculo);
        const card = document.createElement("div");
        card.className = "card";

        // Comentario CORREGIDO: Al hacer clic, se filtran los vehículos de esta versión y se avanza a la pantalla de Años.
        card.onclick = () => mostrarVersiones(vehiculosDeVersion, categoria, marca, modelo);

        const img = document.createElement("img");
        img.src = getImageUrl(ejemplo?.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `Versión ${version}`;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        // Comentario: La tarjeta ahora muestra el nombre de la versión y los tipos de encendido asociados.
        overlay.innerHTML = `<div class="overlay-text-primary">${version}</div><div class="overlay-text-secondary">${tiposDeEncendidoEnVersion}</div>`;
        card.appendChild(overlay);
        grid.appendChild(card);
    });

    cont.appendChild(grid);
}


// --- NUEVA FUNCIÓN UNIFICADA PARA RENDERIZAR RESULTADOS DE BÚSQUEDA ---
/**
 * Renderiza los resultados de una búsqueda de forma dinámica.
 * @param {object} searchData - Un objeto que contiene el tipo, la consulta y los resultados.
 * @param {string} searchData.type - El tipo de resultado ('marca' o 'modelo').
 * @param {string} searchData.query - El texto original de la búsqueda.
 * @param {Array} searchData.results - El array de resultados (strings de marcas o objetos de modelos).
 */
export function mostrarResultadosDeBusqueda({ type, query, results }) {
    const cont = document.getElementById("contenido");
    // CORRECCIÓN: Se elimina el botón "Volver" de esta vista. La página de resultados
    // es el nivel superior del flujo de búsqueda y no debe tener un botón para regresar.
    cont.innerHTML = `<h4>Resultados para: "${query}"</h4>`;

    // Caso especial: Si solo hay un resultado de modelo, se muestra directamente el modal de detalle.
    if (type === 'modelo' && results.length === 1) {
        mostrarDetalleModal(results[0]);
        return;
    }

    const grid = document.createElement("div");
    grid.className = "grid";

    if (type === 'marca') {
        // Renderizado para resultados de tipo MARCA.
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
        grid.style.gap = "30px";
        results.forEach(marca => {
            const logoUrl = getLogoUrlForMarca(marca, null);
            const card = document.createElement("div");
            card.className = "card brand-logo-item";
            // El onclick ahora usa el flujo de navegación estándar.
            card.onclick = () => mostrarModelosPorMarca(marca);

            const img = document.createElement("img");
            img.src = getImageUrl(logoUrl, IMG_SIZE_SMALL);
            img.alt = `Marca ${marca}`;
            img.loading = "lazy";
            card.appendChild(img);
            grid.appendChild(card);
        });
    } else {
        // Renderizado para resultados de tipo MODELO (y por defecto).

        // De-duplicar los resultados para mostrar solo una tarjeta por variante única (modelo + versión).
        // Esto evita mostrar una tarjeta para cada año del mismo vehículo.
        const variantesUnicas = [...new Map(results.map(item => {
            const key = `${item.marca}|${item.modelo}|${item.versionesAplicables || ''}`;
            return [key, item];
        })).values()];

        variantesUnicas.forEach(ejemplo => {
            const card = document.createElement("div");
            card.className = "card";

            // CORRECCIÓN: El onclick ahora salta directamente a la selección de AÑO para la variante elegida,
            // evitando el "retroceso" en el flujo de navegación.
            card.onclick = () => {
                const filasDeVariante = results.filter(r =>
                    r.marca === ejemplo.marca &&
                    r.modelo === ejemplo.modelo &&
                    r.versionesAplicables === ejemplo.versionesAplicables
                );
                mostrarVersiones(filasDeVariante, ejemplo.categoria, ejemplo.marca, ejemplo.modelo);
            };

            const img = document.createElement("img");
            img.src = getImageUrl(ejemplo.imagenVehiculo, IMG_SIZE_SMALL);
            img.alt = `Modelo ${ejemplo.modelo}`;
            img.loading = "lazy";
            card.appendChild(img);

            const overlay = document.createElement("div");
            overlay.className = "overlay";

            // CORRECCIÓN: El texto de la tarjeta ahora representa la variante, no un año específico,
            // para que coincida con la acción del onclick.
            const version = ejemplo.versionesAplicables || '';
            const tiposEncendido = [...new Set(results
                .filter(r => r.marca === ejemplo.marca && r.modelo === ejemplo.modelo && r.versionesAplicables === ejemplo.versionesAplicables)
                .map(r => r.tipoEncendido).filter(Boolean))].join(' / ');

            const diferenciador = version || tiposEncendido;

            overlay.innerHTML = `<div class="overlay-text-primary">${ejemplo.marca} ${ejemplo.modelo}</div><div class="overlay-text-secondary">${diferenciador}</div>`;
            card.appendChild(overlay);
            grid.appendChild(card);
        });
    }

    cont.appendChild(grid);
}

export function showNoResultsMessage(textoBusqueda) {
    document.getElementById("contenido").innerHTML = `<p style="text-align:center; padding: 20px;">No se encontraron resultados para "${textoBusqueda}".</p>`;
}

export function mostrarDetalleModal(item) {
    const { catalogData } = getState();
    const { relay: datosRelay } = catalogData;

    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px;";
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => {
        // Detener cualquier video de YouTube que se esté reproduciendo en el modal
        const iframe = cont.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        }
        document.getElementById("modalDetalle").classList.remove("visible");
    };
    closeBtn.className = "info-close-btn";
    closeBtn.style.cssText = "position: static; font-size: 1.8em; padding: 0 10px;";
    headerDiv.appendChild(closeBtn);
    cont.appendChild(headerDiv);

    // Comentario: Se ajusta el layout del encabezado para cumplir con el nuevo requisito (logo a la izquierda).
    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "border-bottom: 3px solid #007bff; padding-bottom: 8px; margin-bottom: 15px; display: flex; align-items: center; justify-content: flex-start; gap: 15px;";

    const logoUrl = getLogoUrlForMarca(item.marca, item.categoria);
    if (logoUrl) {
        const logoImg = document.createElement("img");
        logoImg.src = getImageUrl(logoUrl, IMG_SIZE_SMALL);
        logoImg.alt = `Logo ${item.marca}`;
        logoImg.className = 'brand-logo-modal';
        // El tamaño se controla ahora desde style.css para mantener la consistencia.
        titleContainer.appendChild(logoImg);
    }

    const title = document.createElement("h2");
    title.textContent = `${item.modelo}`;
    title.style.cssText = "color:#007bff; margin: 0; padding: 0; font-size: 1.8em;";
    titleContainer.appendChild(title);

    cont.appendChild(titleContainer);

    const subHeaderDiv = document.createElement('div');
    subHeaderDiv.style.marginBottom = '15px';
    const subHeaderText = document.createElement('p');
    subHeaderText.style.cssText = "margin: 0; padding: 0; color: #555; font-size: 1.1em;";
    const equipamiento = item.versionesAplicables || item.tipoEncendido || '';
    const yearRangeText = item.anoHasta ? `${item.anoDesde} - ${item.anoHasta}` : item.anoDesde;
    subHeaderText.innerHTML = `<strong>${equipamiento}</strong> | ${yearRangeText}`;
    if(item.categoria) {
         subHeaderText.innerHTML += `<br><span style="font-size: 0.9em; color: #777;">${item.categoria}</span>`;
    }
    subHeaderDiv.appendChild(subHeaderText);
    cont.appendChild(subHeaderDiv);


    if (item.imagenVehiculo) {
        const imgVehiculo = document.createElement("img");
        imgVehiculo.src = getImageUrl(item.imagenVehiculo, IMG_SIZE_MEDIUM);
        imgVehiculo.className = 'img-vehiculo-modal';
        cont.appendChild(imgVehiculo);
    }

    if (item.notaImportante) {
        const p = document.createElement("p");
        p.style.cssText = "color:#cc0000; font-weight: bold; background: #ffe0e0; padding: 10px; border-radius: 5px; border-left: 4px solid #cc0000; margin: 15px 0;";
        p.textContent = `⚠️ ${item.notaImportante}`;
        cont.appendChild(p);
    }

    const cortes = [];
    for (let i = 1; i <= 3; i++) {
        if (item[`tipoCorte${i}`]) {
            cortes.push({
                index: i,
                tipo: item[`tipoCorte${i}`],
                ubicacion: item[`ubicacionCorte${i}`],
                colorCable: item[`colorCableCorte${i}`],
                configRelay: item[`configRelay${i}`],
                img: item[`imgCorte${i}`],
                util: parseInt(item[`utilCorte${i}`] || 0),
                colaborador: item[`colaboradorCorte${i}`]
            });
        }
    }
    cortes.sort((a, b) => b.util - a.util);

    const recommendedCut = cortes.shift();
    if (recommendedCut) {
        const recommendedSection = document.createElement('div');
        const title = document.createElement('h4');
        title.innerHTML = `Corte Recomendado <span style="font-weight:normal; color:#666;">(Votos: ${recommendedCut.util})</span>`;
        recommendedSection.appendChild(title);
        // El corte recomendado se carga de inmediato (isLazy = false)
        renderCutContent(recommendedSection, recommendedCut, datosRelay, item.id, false);
        cont.appendChild(recommendedSection);
    }

    const accordionContainer = document.createElement('div');
    cont.appendChild(accordionContainer);

    const otherSections = [
        ...cortes.map((corte, idx) => ({
            isCorte: true,
            title: `Corte Alternativo ${idx + 1} (Votos: ${corte.util})`,
            data: corte
        })),
        { title: 'Apertura', content: item.apertura, img: item.imgApertura, colaborador: item.colaboradorApertura },
        { title: 'Cables de Alimentación', content: item.cableAlimen, img: item.imgCableAlimen, colaborador: item.colaboradorAlimen },
        { title: 'Vídeo Guía de Desarme', Video: item.Video }
    ];

    otherSections.forEach(sec => {
        const hasContent = sec.isCorte || sec.content || sec.img || sec.Video;
        if (hasContent && sec.title) {
            createAccordionSection(accordionContainer, sec.title, sec, false, datosRelay, item.id);
        }
    });

    document.getElementById("modalDetalle").classList.add("visible");
}

function renderCutContent(container, cutData, datosRelay, vehicleId, isLazy = false) {
    const contentP = document.createElement('p');
    contentP.innerHTML = `<strong>Ubicación:</strong> ${cutData.ubicacion || 'No especificada'}<br>
                        <strong>Color de Cable:</strong> ${cutData.colorCable || 'No especificado'}`;
    container.appendChild(contentP);

    if (cutData.img) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container-with-feedback';

        const img = document.createElement("img");
        const imgUrl = getImageUrl(cutData.img, IMG_SIZE_MEDIUM);

        if (isLazy) {
            img.dataset.src = imgUrl;
        } else {
            img.src = imgUrl;
        }

        img.className = 'img-corte image-with-container';
        img.onclick = () => {
            const highResImgUrl = getImageUrl(cutData.img, IMG_SIZE_LARGE);
            document.getElementById('lightboxImg').src = highResImgUrl;
            document.getElementById('lightbox').classList.add('visible');
        };
        imgContainer.appendChild(img);

        const feedbackOverlay = document.createElement('div');
        feedbackOverlay.className = 'feedback-overlay';

        const utilBtn = document.createElement('button');
        utilBtn.className = 'feedback-btn-overlay util-btn';
        utilBtn.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
        utilBtn.title = 'Marcar como útil';

        // Optimistic UI for recordLike
        // Check if already liked in this session
        const { likedCortes, catalogData: catData } = getState();
        const likeKey = `${vehicleId}-${cutData.index}`;
        if (likedCortes && likedCortes.includes(likeKey)) {
            utilBtn.classList.add('liked');
            utilBtn.style.backgroundColor = '#28a745';
        }

        utilBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (utilBtn.classList.contains('liked')) return;

            const { currentUser } = getState();
            if (!currentUser) {
                showGlobalError("Debes estar conectado para votar.");
                return;
            }

            // UI Optimista
            utilBtn.classList.add('liked');
            utilBtn.style.backgroundColor = '#28a745';

            recordLike(vehicleId, cutData.index, currentUser.ID, currentUser.Nombre_Usuario).then(() => {
                // Persistir en el estado local de la sesión
                const currentState = getState();
                const newLiked = [...(currentState.likedCortes || []), likeKey];

                // Actualizar contador localmente para respuesta inmediata en la UI
                const newCatalog = { ...currentState.catalogData };
                const vehicle = newCatalog.cortes.find(c => String(c.id) === String(vehicleId));
                if (vehicle) {
                    const countKey = `utilCorte${cutData.index}`;
                    vehicle[countKey] = (parseInt(vehicle[countKey]) || 0) + 1;
                }

                setState({ likedCortes: newLiked, catalogData: newCatalog });
            }).catch(err => {
                console.error("Error reporting like:", err);
                utilBtn.classList.remove('liked');
                utilBtn.style.backgroundColor = '';
                showGlobalError("No se pudo registrar tu reacción. Reintenta.");
            });
        };
        feedbackOverlay.appendChild(utilBtn);

        const reportBtn = document.createElement('button');
        reportBtn.className = 'feedback-btn-overlay report-btn';
        reportBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        reportBtn.title = 'Reportar un problema';

        // Optimistic UI for reportProblem
        reportBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const { currentUser } = getState();
            if (!currentUser) {
                showGlobalError("Debes estar conectado para reportar.");
                return;
            }

            const reason = window.prompt("Describe el problema con este corte:");
            if (reason && reason.trim()) {
                reportBtn.classList.add('btn-loading');
                reportProblem(vehicleId, reason, currentUser.ID, currentUser.Nombre_Usuario).then(() => {
                    alert("Reporte enviado. Gracias por tu ayuda.");
                }).catch(err => {
                    console.error("Error reporting problem:", err);
                    showGlobalError("Error al enviar reporte.");
                }).finally(() => {
                    reportBtn.classList.remove('btn-loading');
                });
            }
        };
        feedbackOverlay.appendChild(reportBtn);

        imgContainer.appendChild(feedbackOverlay);
        container.appendChild(imgContainer);
    }

    const relayContainer = document.createElement('p');
    const configRelay = cutData.configRelay;

    if (!configRelay || configRelay.toLowerCase() === 'sin relay') {
        relayContainer.innerHTML = `<strong>Configuración de Relay:</strong> Sin Relay`;
    } else {
        relayContainer.innerHTML = `<strong>Configuración de Relay: </strong>`;
        const relayButton = document.createElement('button');
        relayButton.textContent = configRelay;
        relayButton.className = 'btn-link';
        relayButton.onclick = () => {
            const relayInfo = datosRelay.find(r => r.configuracion === configRelay);
            if (relayInfo) {
                renderRelayInfoModal(relayInfo);
            } else {
                alert('No se encontraron detalles para esta configuración de relay.');
            }
        };
        relayContainer.appendChild(relayButton);
    }
    container.appendChild(relayContainer);

    if (cutData.colaborador) {
        const colabP = document.createElement('p');
        // Comentario: Se añade una clase para un estilo dedicado y robusto desde style.css
        colabP.className = "colaborador-info";
        colabP.innerHTML = `Aportado por: <strong>${cutData.colaborador}</strong>`;
        container.appendChild(colabP);
    }
}

function renderRelayInfoModal(relayInfo) {
    let modal = document.getElementById('relay-info-modal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'relay-info-modal';
    modal.className = 'info-modal';
    modal.style.display = 'flex';

    const content = document.createElement('div');
    content.className = 'info-modal-content';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'info-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.style.display = 'none';
    content.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = relayInfo.configuracion;
    content.appendChild(title);

    const img = document.createElement('img');
    img.src = getImageUrl(relayInfo.imagen, IMG_SIZE_MEDIUM);
    img.style.width = '100%';
    img.onclick = () => {
        const highResImgUrl = getImageUrl(relayInfo.imagen, IMG_SIZE_LARGE);
        document.getElementById('lightboxImg').src = highResImgUrl;
        document.getElementById('lightbox').classList.add('visible');
    };
    content.appendChild(img);

    modal.appendChild(content);
    document.body.appendChild(modal);
}

function setupModal(modalId, openFn) {
    return async (...args) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal no encontrado: ${modalId}`);
            return;
        }

        const closeBtn = modal.querySelector('.info-close-btn');
        if (closeBtn && !closeBtn.dataset.listenerSet) {
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
            closeBtn.dataset.listenerSet = 'true';
        }

        return await openFn(...args);
    };
}

export const openDashboard = setupModal('dashboard-modal', async () => {
    const modal = document.getElementById('dashboard-modal');
    modal.style.display = 'flex';
    const logContainer = document.getElementById('activity-logs');
    logContainer.innerHTML = '<tr><td colspan="4">Cargando actividad...</td></tr>';

    try {
        const result = await getActivityLogs();
        if (result.status === 'success') {
            logContainer.innerHTML = '';
            result.data.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.nombreUsuario}</td>
                    <td>${log.tipoActividad}</td>
                    <td>${log.detalle || ''}</td>
                `;
                logContainer.appendChild(tr);
            });
        }
    } catch (error) {
        logContainer.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar actividad</td></tr>';
    }
});

export const openInbox = setupModal('inbox-modal', async () => {
    const modal = document.getElementById('inbox-modal');
    modal.style.display = 'flex';
    const listContainer = document.getElementById('inbox-list');
    const detailContainer = document.getElementById('inbox-detail');
    listContainer.innerHTML = '<p>Cargando mensajes...</p>';
    detailContainer.innerHTML = '<p>Selecciona un item para ver los detalles.</p>';

    try {
        const result = await getFeedbackItems();

        if (result.status === 'success') {
            const data = result.data || result.messages || result.items || [];

            if (Array.isArray(data)) {
                renderInboxList(data);
            } else {
                listContainer.innerHTML = `<p style="color:red;">Error: El formato de los datos es incorrecto.</p>`;
            }
        } else {
            listContainer.innerHTML = `<p style="color:red;">Error: ${result.message || 'No se pudieron cargar los mensajes.'}</p>`;
        }
    } catch (error) {
        console.error("Error fetching feedback items:", error);
        listContainer.innerHTML = `<p style="color:red;">Error de conexión al cargar mensajes.</p>`;
    }
});

export const openDevTools = setupModal('dev-tools-modal', () => {
    document.getElementById('dev-tools-modal').style.display = 'flex';
});

export const openAboutUs = setupModal('about-us-modal', () => {
    document.getElementById('about-us-modal').style.display = 'flex';
});

export const openContact = setupModal('contact-modal', () => {
    document.getElementById('contact-modal').style.display = 'flex';
});

export const openFAQ = setupModal('faq-modal', () => {
    document.getElementById('faq-modal').style.display = 'flex';
});

function renderInboxList(items) {
    const listContainer = document.getElementById('inbox-list');
    listContainer.innerHTML = '';
    if (items.length === 0) {
        listContainer.innerHTML = '<p>No hay mensajes.</p>';
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inbox-item';
        if (item.isResolved) {
            itemDiv.classList.add('resolved');
        }
        if (item.reply) {
             itemDiv.classList.add('replied');
        }

        const iconClass = item.type === 'problem_report' ? 'fa-triangle-exclamation' : 'fa-envelope';
        const title = item.subject || `ID: ${item.id}`;
        const tipoLabel = item.type === 'problem_report' ? 'Reporte de problema' : 'Mensaje de contacto';

        itemDiv.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <div class="inbox-item-content">
                <strong class="inbox-item-title">${title}</strong>
                <p class="inbox-item-type">${tipoLabel}</p>
            </div>
        `;
        itemDiv.addEventListener('click', () => {
            document.querySelectorAll('.inbox-item.active').forEach(el => el.classList.remove('active'));
            itemDiv.classList.add('active');
            renderInboxDetail(item);
        });
        listContainer.appendChild(itemDiv);
    });
}

function renderInboxDetail(item) {
    const detailContainer = document.getElementById('inbox-detail');
    const { currentUser, catalogData } = getState();
    const userName = currentUser ? currentUser.Nombre_Usuario : 'Usuario';

    let vehicleLabel = item.vehicleId ? `ID: ${item.vehicleId}` : '';
    if (item.vehicleId && catalogData && catalogData.cortes) {
        const vehicle = catalogData.cortes.find(c => String(c.id) === String(item.vehicleId));
        if (vehicle) {
            vehicleLabel = `${vehicle.marca} ${vehicle.modelo} (${vehicle.anoDesde})`;
        }
    }

    detailContainer.innerHTML = `
        <h3 class="inbox-detail-title">${item.subject}</h3>
        <p class="inbox-detail-meta"><strong>De:</strong> ${item.user}</p>
        ${item.vehicleId ? `<p class="inbox-detail-meta"><strong>Vehículo:</strong> ${vehicleLabel}</p>` : ''}
        <div class="inbox-message-content">
            <pre>${item.content}</pre>
        </div>
        ${item.reply ? `
            <div class="inbox-reply-content">
                <strong>Respuesta de ${item.responder || 'Admin'}:</strong>
                <pre>${item.reply}</pre>
            </div>` : ''
        }
        <div class="inbox-actions">
            <textarea id="inbox-reply-textarea" placeholder="Escribe tu respuesta aquí..."></textarea>
            <button id="inbox-reply-btn">Enviar Respuesta</button>
            ${item.type === 'problem_report' && !item.isResolved ?
                `<button id="inbox-resolve-btn" class="resolve-btn">Marcar como Resuelto</button>` : ''
            }
        </div>
    `;

    const replyBtn = document.getElementById('inbox-reply-btn');
    replyBtn.addEventListener('click', async () => {
        const replyText = document.getElementById('inbox-reply-textarea').value;
        if (!replyText.trim()) {
            showGlobalError("La respuesta no puede estar vacía.");
            return;
        }
        try {
            replyBtn.classList.add('btn-loading');
            await replyToFeedback(item.id, item.type, replyText, userName);
            openInbox();
        } catch (error) {
            showGlobalError(`Error al enviar respuesta: ${error.message}`);
        } finally {
            replyBtn.classList.remove('btn-loading');
        }
    });

    const resolveBtn = document.getElementById('inbox-resolve-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', async () => {
             try {
                resolveBtn.classList.add('btn-loading');
                await markAsResolved(item.id);
                openInbox();
            } catch (error) {
                showGlobalError(`Error al resolver: ${error.message}`);
            } finally {
                resolveBtn.classList.remove('btn-loading');
            }
        });
    }
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Si ya es un ID de 11 caracteres (ej. dQw4w9WgXcQ)
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes(':')) {
        return `https://www.youtube.com/embed/${trimmed}?enablejsapi=1`;
    }

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);

    const id = (match && match[2].length === 11) ? match[2] : null;

    if (id) {
        return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
    }

    // Fallback para casos donde el ID es pasado directamente pero no cumplió la primera condición
    if (!trimmed.includes('/') && !trimmed.includes(':') && trimmed.length > 5) {
        return `https://www.youtube.com/embed/${trimmed}?enablejsapi=1`;
    }

    return null;
}

function createAccordionSection(container, title, sec, isOpen = false, datosRelay = [], vehicleId = null) {
    const btn = document.createElement("button");
    btn.className = "accordion-btn";
    btn.innerHTML = `${title} <span class="accordion-arrow">▼</span>`;

    const panel = document.createElement("div");
    panel.className = "panel-desplegable";

    if (sec.isCorte) {
        // Los cortes dentro de acordeones son diferidos (isLazy = true)
        renderCutContent(panel, sec.data, datosRelay, vehicleId, true);
    } else {
        if (sec.content) {
            const contentP = document.createElement('p');
            contentP.innerHTML = sec.content;
            panel.appendChild(contentP);
        }

        if (sec.img) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container-with-feedback';
            const img = document.createElement("img");
            img.dataset.src = getImageUrl(sec.img, IMG_SIZE_MEDIUM);
            img.className = 'img-corte image-with-container';
            img.onclick = () => {
                const highResImgUrl = getImageUrl(sec.img, IMG_SIZE_LARGE);
                document.getElementById('lightboxImg').src = highResImgUrl;
                document.getElementById('lightbox').classList.add('visible');
            };
            imgContainer.appendChild(img);
            panel.appendChild(imgContainer);
        }
    }

    if (sec.colaborador) {
        const colabDiv = document.createElement('div');
        const colabP = document.createElement('p');
        colabP.style.cssText = "font-style: italic; color: #888; margin-top: 10px; text-align: left;";
        colabP.innerHTML = `Aportado por: <strong>${sec.colaborador}</strong>`;
        colabDiv.appendChild(colabP);
        panel.appendChild(colabDiv);
    }

    if (sec.Video) {
        const videoEmbedUrl = getYouTubeEmbedUrl(sec.Video);
        if (videoEmbedUrl) {
            const videoContainer = document.createElement('div');
            const iframeId = `video-${Date.now()}`;
            videoContainer.innerHTML = `<iframe id="${iframeId}" width="100%" height="315" src="${videoEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 10px;"></iframe>`;
            panel.appendChild(videoContainer);
            btn.dataset.iframeId = iframeId;
        }
    }

    container.appendChild(btn);
    container.appendChild(panel);

    const loadAccordionImages = () => {
        const imgs = panel.querySelectorAll('img[data-src]');
        imgs.forEach(img => {
            if (!img.src) {
                img.onload = () => {
                    // Actualizar maxHeight si el panel sigue abierto
                    if (btn.classList.contains('active')) {
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                };
                img.src = img.dataset.src;
            }
        });
    };

    if (isOpen) {
        btn.classList.add("active");
        loadAccordionImages();
        panel.style.maxHeight = panel.scrollHeight + "px";
    }

    btn.addEventListener("click", function() {
        const isActive = this.classList.contains("active");

        // Cerrar todos los paneles antes de abrir el nuevo
        const allButtons = container.querySelectorAll(".accordion-btn");
        allButtons.forEach(otherBtn => {
            otherBtn.classList.remove("active");
            otherBtn.nextElementSibling.style.maxHeight = null;
        });

        // Si el botón no estaba activo, ábrelo.
        if (!isActive) {
            this.classList.add("active");
            loadAccordionImages();
            // Esperar un ciclo de renderizado para asegurar que el iframe exista
            setTimeout(() => {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }, 0);
        }
    });

    // Listener para pausar el video CUANDO la animación de cierre TERMINA
    panel.addEventListener('transitionend', () => {
        if (!panel.style.maxHeight) { // Si el panel está cerrado
            const iframeId = btn.dataset.iframeId;
            const iframe = iframeId ? document.getElementById(iframeId) : null;
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        }
    });
}

function mostrarUltimosAgregados() {
    const { catalogData } = getState();
    const { cortes } = catalogData;

    if (!cortes || cortes.length === 0) return;

    const ultimosCortes = [...cortes]
        .sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
            const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
            if (dateB - dateA !== 0) return dateB - dateA;
            return b.id - a.id;
        })
        .slice(0, 6);

    if (ultimosCortes.length === 0) return;

    crearCarrusel('Últimos Agregados', ultimosCortes, item => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.animation = 'none';
        card.style.opacity = '1';
        card.onclick = () => mostrarDetalleModal(item);

        const img = document.createElement("img");
        img.src = getImageUrl(item.imagenVehiculo, IMG_SIZE_SMALL);
        img.alt = `${item.marca} ${item.modelo}`;
        img.loading = "lazy";
        card.appendChild(img);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        const yearRange = item.anoHasta ? `${item.anoDesde} - ${item.anoHasta}` : item.anoDesde;

        const marcaDiv = document.createElement('div');
        marcaDiv.textContent = item.marca;
        overlay.appendChild(marcaDiv);

        const modeloDiv = document.createElement('div');
        modeloDiv.style.cssText = "font-size:0.8em; opacity:0.8;";
        modeloDiv.textContent = `${item.modelo} ${yearRange || ''}`;
        overlay.appendChild(modeloDiv);

        card.appendChild(overlay);
        return card;
    });
}

export function showLoginScreen(reason = null) {
    document.getElementById('splash-screen').style.display = 'none';
    document.querySelector('.container').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';

    const loginError = document.getElementById('login-error');
    if (reason) {
        loginError.textContent = reason;
        loginError.style.display = 'block';
    } else {
        loginError.style.display = 'none';
    }

    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

export function showApp(user) {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
    }, 500);

    document.getElementById('login-modal').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';

    if (user && user.Nombre_Usuario) {
        document.getElementById('menu-username').textContent = user.Nombre_Usuario;

        // Mostrar mensaje de bienvenida en el nuevo header si existe
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
            welcomeMsg.textContent = `Hola, ${user.Nombre_Usuario}`;
            welcomeMsg.style.display = 'block';
        }
    }

    const devToolsBtn = document.getElementById('dev-tools-btn');
    const userRole = user ? user.Privilegios : '';
    if (devToolsBtn && userRole === 'Desarrollador') {
        devToolsBtn.style.display = 'flex';
    }

    const inboxBtn = document.getElementById('inbox-btn');
    if (inboxBtn && ['Desarrollador', 'Gefe', 'Supervisor'].includes(userRole)) {
        inboxBtn.style.display = 'flex';
    }

    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn && ['Desarrollador', 'Gefe', 'Supervisor'].includes(userRole)) {
        dashboardBtn.style.display = 'flex';
    }

    // Protección de renderizado: No mostrar el catálogo si los datos no están listos.
    const { catalogData } = getState();
    if (catalogData && Array.isArray(catalogData.cortes) && catalogData.cortes.length > 0) {
        mostrarCategorias();
    } else {
        // Mostrar estado de carga si los datos aún no están listos
        const cont = document.getElementById("contenido");
        if (cont) {
            cont.innerHTML = `
                <div class="loading-data-container" style="text-align: center; padding: 50px 20px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 15px;"></i>
                    <p>Cargando catálogo...</p>
                </div>
            `;
        }
    }
}

// Suscribirse a cambios de estado para renderizar el catálogo cuando los datos lleguen
subscribe((state) => {
    const splash = document.getElementById('splash-screen');
    const isAppVisible = splash && splash.style.display === 'none';

    if (isAppVisible && state.catalogData && Array.isArray(state.catalogData.cortes) && state.catalogData.cortes.length > 0) {
        const cont = document.getElementById("contenido");
        // Solo renderizar si el contenedor tiene el mensaje de carga o está vacío
        if (cont && (cont.querySelector('.loading-data-container') || cont.innerHTML === "")) {
             mostrarCategorias();
        }
    }
});

export function showGlobalError(message) {
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 7000);
}

export function openSideMenu() {
    const { currentUser } = getState();
    if (currentUser && currentUser.Nombre_Usuario) {
        document.getElementById('menu-username').textContent = currentUser.Nombre_Usuario;
    }
    document.getElementById('side-menu').classList.add('open');
    document.getElementById('menu-overlay').classList.add('open');
}

export function closeSideMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}

export function mostrarSeccion(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const sectionId = sectionName === 'cortes' ? 'contenido' : `contenido-${sectionName}`;
    const sectionElement = document.getElementById(sectionId);
    const buttonElement = document.getElementById(`btn-${sectionName}`);

    if (sectionElement) sectionElement.style.display = 'block';
    if (buttonElement) buttonElement.classList.add('active');

    switch (sectionName) {
        case 'cortes':
            mostrarCategorias();
            break;
        case 'tutoriales':
            mostrarTutorialesGrid();
            break;
        case 'relay':
            mostrarRelayGrid();
            break;
    }
}

function mostrarTutorialesGrid() {
    const { catalogData } = getState();
    const { tutoriales } = catalogData;
    const cont = document.getElementById('contenido-tutoriales');
    cont.innerHTML = '<h4>Tutoriales</h4>';

    const grid = document.createElement('div');
    grid.className = 'grid';
    tutoriales.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarDetalleTutorialModal(item);
        const img = document.createElement("img");
        img.src = getImageUrl(item.Imagen, IMG_SIZE_SMALL);
        img.alt = item.Tema;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.textContent = item.Tema;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

function mostrarRelayGrid() {
    const { catalogData } = getState();
    const { relay } = catalogData;
    const cont = document.getElementById('contenido-relay');
    cont.innerHTML = '<h4>Configuraciones de Relay</h4>';

    const grid = document.createElement('div');
    grid.className = 'grid';
    relay.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => mostrarDetalleRelayModal(item);
        const img = document.createElement("img");
        img.src = getImageUrl(item.imagen, IMG_SIZE_SMALL);
        img.alt = item.configuracion;
        img.loading = "lazy";
        card.appendChild(img);
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.textContent = item.configuracion;
        card.appendChild(overlay);
        grid.appendChild(card);
    });
    cont.appendChild(grid);
}

function mostrarDetalleTutorialModal(item) {
    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
    const title = document.createElement("h2");
    title.textContent = item.Tema;
    title.style.color = "#007bff";
    headerDiv.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar";
    closeBtn.onclick = () => document.getElementById("modalDetalle").classList.remove("visible");
    closeBtn.className = "backBtn";
    closeBtn.style.cssText = "color:white; background:#dc3545; border:none; margin:0;";
    headerDiv.appendChild(closeBtn);
    cont.appendChild(headerDiv);

    // Comentario: Se refactoriza para usar appendChild y evitar `innerHTML +=` que es propenso a errores.
    if (item.Video) {
        const videoContainer = document.createElement('div');
        const videoUrl = item.Video.replace("watch?v=", "embed/");
        videoContainer.innerHTML = `<iframe width="100%" height="315" src="${videoUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>`;
        cont.appendChild(videoContainer);
    }

    const createDetailParagraph = (label, text) => {
        if (text) {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${label}:</strong> ${text}`;
            return p;
        }
        return null;
    };

    const details = [
        createDetailParagraph('Cómo Identificarlo', item.comoIdentificarlo),
        createDetailParagraph('Dónde Encontrarlo', item.dondeEncontrarlo),
        createDetailParagraph('Detalles', item.Detalles)
    ];

    details.forEach(detail => {
        if (detail) cont.appendChild(detail);
    });

    document.getElementById("modalDetalle").classList.add("visible");
}

function mostrarDetalleRelayModal(item) {
    const cont = document.getElementById("detalleCompleto");
    cont.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
    const title = document.createElement("h2");
    title.textContent = item.configuracion;
    title.style.color = "#007bff";
    headerDiv.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar";
    closeBtn.onclick = () => document.getElementById("modalDetalle").classList.remove("visible");
    closeBtn.className = "backBtn";
    closeBtn.style.cssText = "color:white; background:#dc3545; border:none; margin:0;";
    headerDiv.appendChild(closeBtn);
    cont.appendChild(headerDiv);

    // Comentario: Se refactoriza para usar appendChild y evitar `innerHTML +=` que es propenso a errores.
    if (item.imagen) {
        const img = document.createElement("img");
        img.src = getImageUrl(item.imagen, IMG_SIZE_MEDIUM);
        img.style.width = "100%";
        img.style.borderRadius = "8px";
        img.onclick = () => {
            const highResImgUrl = getImageUrl(item.imagen, IMG_SIZE_LARGE);
            document.getElementById('lightboxImg').src = highResImgUrl;
            document.getElementById('lightbox').classList.add('visible');
        };
        cont.appendChild(img);
    }

    const createDetailParagraph = (label, text) => {
        if (text) {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${label}:</strong> ${text}`;
            return p;
        }
        return null;
    };

    const details = [
        createDetailParagraph('Función', item.funcion),
        createDetailParagraph('Vehículos Comunes', item.vehiculoDondeSeUtiliza),
        createDetailParagraph('Observación', item.observacion)
    ];

    details.forEach(detail => {
        if (detail) cont.appendChild(detail);
    });

    document.getElementById("modalDetalle").classList.add("visible");
}
