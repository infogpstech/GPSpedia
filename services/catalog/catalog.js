// ============================================================================
// GPSPEDIA-CATALOG SERVICE (COMPATIBLE WITH DB V2.0)
// ============================================================================
// COMPONENT VERSION: 2.4.0

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";
const LOG_INVALID_IDS = false; // Cambiar a true para registrar IDs de imagen inválidos en la consola.
let spreadsheet = null;
let invalidImageIdsFound = []; // Almacena IDs inválidos para el modo diagnóstico.

function getSpreadsheet() {
  if (spreadsheet === null) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return spreadsheet;
}

const SHEET_NAMES = {
    CORTES: "Cortes",
    LOGOS_MARCA: "LogosMarca",
    TUTORIALES: "Tutorial",
    RELAY: "Relay"
};

// Mapas de columnas actualizados al esquema v2.0
const COLS_CORTES = {
    id: 1, categoria: 2, marca: 3, modelo: 4, versionesAplicables: 5, anoDesde: 6, anoHasta: 7, tipoEncendido: 8,
    imagenVehiculo: 9, videoGuiaDesarmeUrl: 10, contadorBusqueda: 11, tipoCorte1: 12, ubicacionCorte1: 13,
    colorCableCorte1: 14, configRelay1: 15, imgCorte1: 16, utilCorte1: 17, colaboradorCorte1: 18,
    tipoCorte2: 19, ubicacionCorte2: 20, colorCableCorte2: 21, configRelay2: 22, imgCorte2: 23,
    utilCorte2: 24, colaboradorCorte2: 25, tipoCorte3: 26, ubicacionCorte3: 27, colorCableCorte3: 28,
    configRelay3: 29, imgCorte3: 30, utilCorte3: 31, colaboradorCorte3: 32,
    apertura: 33, imgApertura: 34, cableAlimen: 35, imgCableAlimen: 36,
    timestamp: 37, notaImportante: 38
};

const COLS_LOGOS_MARCA = {
    id: 1,
    nombreMarca: 2,
    urlLogo: 3,
    fabricanteNombre: 4
};

const COLS_TUTORIALES = {
    ID: 1,
    Tema: 2,
    Imagen: 3,
    comoIdentificarlo: 4,
    dondeEncontrarlo: 5,
    Detalles: 6,
    Video: 7
};

const COLS_RELAY = {
    ID: 1,
    configuracion: 2,
    funcion: 3,
    vehiculoDondeSeUtiliza: 4,
    pin30Entrada: 5,
    pin85BobinaPositivo: 6,
    pin86bobinaNegativo: 7,
    pin87aComunCerrado: 8,
    pin87ComunmenteAbierto: 9,
    imagen: 10,
    observacion: 11
};

// ============================================================================
// ROUTER PRINCIPAL (doGet y doPost)
// ============================================================================
function doGet(e) {
    if (e.parameter.debug === 'true') {
        const cache = CacheService.getScriptCache();
        const cacheKey = 'catalog_data_v2';
        const cachedData = cache.get(cacheKey);

        const serviceState = {
            service: 'GPSpedia-Catalog',
            version: '2.4.0',
            spreadsheetId: SPREADSHEET_ID,
            sheetsAccessed: [SHEET_NAMES.CORTES, SHEET_NAMES.TUTORIALES, SHEET_NAMES.RELAY, SHEET_NAMES.LOGOS_MARCA],
            cacheStatus: {
                isCached: cachedData !== null,
                cacheKey: cacheKey
            }
        };
        return ContentService.createTextOutput(JSON.stringify(serviceState, null, 2))
            .setMimeType(ContentService.MimeType.TEXT);
    }
    const defaultResponse = {
        status: 'success',
        message: 'GPSpedia Catalog-SERVICE v2.0 is active.'
    };
    return ContentService.createTextOutput(JSON.stringify(defaultResponse))
        .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  invalidImageIdsFound = []; // Resetear para cada nueva solicitud.
  const isDiagnosticMode = e.parameter.diagnostics === 'true';
  const startTime = new Date();

  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};
    let result;

    switch (action) {
      case 'getCatalogData':
        result = handleGetCatalogData();
        break;
      case 'getDropdownData':
        result = handleGetDropdownData();
        break;
      case 'getSuggestion':
        result = handleGetSuggestion(payload);
        break;
      case 'getNavigationData':
        result = handleGetNavigationData();
        break;
      default:
        throw new Error(`Acción desconocida: ${action}`);
    }

    // Si el modo diagnóstico está activado, envolver la respuesta.
    if (isDiagnosticMode) {
      const executionTime = new Date() - startTime;
      const diagnosticResult = {
        diagnostics: {
          executionTimeMs: executionTime,
          invalidImageIdsCount: invalidImageIdsFound.length,
          invalidImageIds: invalidImageIdsFound,
        },
        payload: result
      };
      return ContentService.createTextOutput(JSON.stringify(diagnosticResult))
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Respuesta estándar
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    const errorResponse = {
      status: 'error',
      message: 'Se ha producido un error en el servidor.',
      details: {
        errorMessage: error.message,
        stack: error.stack
      }
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// ============================================================================
// MANEJADORES DE ACCIONES (HANDLERS)
// ============================================================================

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Cortes): Define los campos dentro de la hoja 'Cortes'
 * que deben ser tratados como IDs de imagen. El servicio garantiza que los valores
 * en estos campos serán siempre un fileId de Google Drive válido (string) o null.
 * El frontend NUNCA recibirá una URL completa.
 */
const IMAGE_FIELDS_CORTES = new Set(['imagenVehiculo', 'imgCorte1', 'imgCorte2', 'imgCorte3', 'imgApertura', 'imgCableAlimen']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Logos): Define los campos de imagen para la hoja 'LogosMarca'.
 */
const IMAGE_FIELDS_LOGOS = new Set(['urlLogo']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Tutoriales): Define los campos de imagen para la hoja 'Tutorial'.
 */
const IMAGE_FIELDS_TUTORIALES = new Set(['Imagen']);

/**
 * @const {Set<string>}
 * @description CONTRATO DE IMÁGENES (Relay): Define los campos de imagen para la hoja 'Relay'.
 */
const IMAGE_FIELDS_RELAY = new Set(['imagen']);

/**
 * Convierte una fila de hoja de cálculo (array) en un objeto utilizando un mapa de columnas.
 * @param {Array} row - La fila de datos.
 * @param {object} colMap - El objeto que mapea nombres de clave a índices de columna (basado en 1).
 * @param {Set<string>} imageFields - Un Set con los nombres de las claves que deben ser normalizadas como IDs de imagen.
 * @returns {object|null} - El objeto mapeado o null si la fila está vacía.
 */
function mapRowToObject(row, colMap, imageFields = new Set()) {
  if (!row || row.length === 0) {
    return null;
  }
  const obj = {};
  for (const key in colMap) {
    const colIndex = colMap[key] - 1;
    let value = row[colIndex] !== undefined && row[colIndex] !== '' ? row[colIndex] : null;

    // Si el campo es un campo de imagen, normalizar y validar su valor.
    if (imageFields.has(key)) {
      value = normalizeAndValidateImageId(value);
    }

    obj[key] = value;
  }
  return obj;
}

function handleGetCatalogData() {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'catalog_data_v2';
    let cachedData = null;

    // 1. Intento de lectura de caché con manejo de errores
    try {
        cachedData = cache.get(cacheKey);
    } catch (e) {
        cachedData = null; // Asegurarse de que cachedData es null si falla
    }

    if (cachedData) {
        try {
            // 2. Intento de parseo de datos cacheados con manejo de errores
            const parsedData = JSON.parse(cachedData);
            return { status: 'success', data: parsedData, source: 'cache' };
        } catch (e) {
            // Si el parseo falla, los datos están corruptos, así que se procede a leer de la fuente.
        }
    }

    // Si no hay datos en caché (o están corruptos), procedemos a leer de la hoja de cálculo.
    const allData = {};

    // Fetch Cortes
    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    let cortesData = [];
    const categoryCounts = {};

    if (cortesSheet) {
        const data = cortesSheet.getDataRange().getValues();
        data.shift();
        cortesData = data
          .filter(row => row && row[0])
          .map(row => {
            const vehicle = mapRowToObject(row, COLS_CORTES, IMAGE_FIELDS_CORTES);
            if (!vehicle) return null;

            // Contar vehículos por categoría
            if (vehicle.categoria) {
                categoryCounts[vehicle.categoria] = (categoryCounts[vehicle.categoria] || 0) + 1;
            }

            // Normalización robusta de URL de YouTube
            if (vehicle.videoGuiaDesarmeUrl) {
                vehicle.Video = normalizeYouTubeUrl(vehicle.videoGuiaDesarmeUrl);
                delete vehicle.videoGuiaDesarmeUrl;
            }
            }

            const cortes = [
                { index: 1, util: parseInt(vehicle.utilCorte1, 10) || 0 },
                { index: 2, util: parseInt(vehicle.utilCorte2, 10) || 0 },
                { index: 3, util: parseInt(vehicle.utilCorte3, 10) || 0 }
            ].sort((a, b) => b.util - a.util);

            const orderedVehicle = { ...vehicle };
            const tempCortes = {};

            for (let i = 1; i <= 3; i++) {
                tempCortes[i] = {
                    tipo: vehicle[`tipoCorte${i}`],
                    ubicacion: vehicle[`ubicacionCorte${i}`],
                    color: vehicle[`colorCableCorte${i}`],
                    config: vehicle[`configRelay${i}`],
                    img: vehicle[`imgCorte${i}`],
                    util: vehicle[`utilCorte${i}`],
                    colaborador: vehicle[`colaboradorCorte${i}`]
                };
            }

            cortes.forEach((corte, i) => {
                const newIndex = i + 1;
                const oldIndex = corte.index;
                orderedVehicle[`tipoCorte${newIndex}`] = tempCortes[oldIndex].tipo;
                orderedVehicle[`ubicacionCorte${newIndex}`] = tempCortes[oldIndex].ubicacion;
                orderedVehicle[`colorCableCorte${newIndex}`] = tempCortes[oldIndex].color;
                orderedVehicle[`configRelay${newIndex}`] = tempCortes[oldIndex].config;
                orderedVehicle[`imgCorte${newIndex}`] = tempCortes[oldIndex].img;
                orderedVehicle[`utilCorte${newIndex}`] = tempCortes[oldIndex].util;
                orderedVehicle[`colaboradorCorte${newIndex}`] = tempCortes[oldIndex].colaborador;
            });

            return orderedVehicle;
        }).filter(Boolean);
    }
    allData.cortes = cortesData;
    allData.categoryCounts = categoryCounts;

    // Crear y añadir la lista de categorías ordenada por popularidad
    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    allData.sortedCategories = sortedCategories;

    // Fetch Logos
    const logosSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.LOGOS_MARCA);
    let logosData = [];
    if (logosSheet) {
        const data = logosSheet.getDataRange().getValues();
        data.shift();
        logosData = data.map(row => mapRowToObject(row, COLS_LOGOS_MARCA, IMAGE_FIELDS_LOGOS));
    }
    allData.logos = logosData;

    // Fetch Tutoriales
    const tutorialesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.TUTORIALES);
    let tutorialesData = [];
    if (tutorialesSheet) {
        const data = tutorialesSheet.getDataRange().getValues();
        data.shift();
        tutorialesData = data.map(row => mapRowToObject(row, COLS_TUTORIALES, IMAGE_FIELDS_TUTORIALES)).filter(Boolean);
    }
    allData.tutoriales = tutorialesData;

    // Fetch Relay
    const relaySheet = getSpreadsheet().getSheetByName(SHEET_NAMES.RELAY);
    let relayData = [];
    if (relaySheet) {
        const data = relaySheet.getDataRange().getValues();
        data.shift();
        relayData = data.map(row => mapRowToObject(row, COLS_RELAY, IMAGE_FIELDS_RELAY)).filter(Boolean);
    }
    allData.relay = relayData;

    // --- ESCRITURA EN CACHÉ DESHABILITADA ---
    // La siguiente línea se deshabilita para prevenir el error "Argumento demasiado grande".
    // El objeto `allData` excede el límite de 100 KB de CacheService.
    // Una futura estrategia de caché deberá ser más granular (ej. cachear solo metadatos).
    // try {
    //     cache.put(cacheKey, JSON.stringify(allData), 3600);
    // } catch (e) {
    // }

    return { status: 'success', data: allData, source: 'spreadsheet' };
}

function handleGetDropdownData() {
    try {
        const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
        if (!sheet) {
            throw new Error(`Sheet "${SHEET_NAMES.CORTES}" not found.`);
        }

        // Obtener la regla de validación de la columna "Categoría"
        const categoriaRule = sheet.getRange(2, COLS_CORTES.categoria).getDataValidation();
        let categorias = [];
        if (categoriaRule) {
            const criteriaValues = categoriaRule.getCriteriaValues()[0];
            // Comprobar si criteriaValues es un objeto Range (tiene getValues) o un array.
            if (criteriaValues && typeof criteriaValues.getValues === 'function') {
                // Es un Range, obtener los valores.
                categorias = criteriaValues.getValues().flat().filter(String).sort();
            } else if (criteriaValues && Array.isArray(criteriaValues)) {
                // Es un array, usarlo directamente.
                categorias = criteriaValues.flat().filter(String).sort();
            }
        }

        const data = sheet.getDataRange().getValues();
        data.shift(); // Remove headers

        // Helper function to get unique, sorted values from a column index
        const getUniqueSortedValues = (colIndex) => {
            const values = new Set();
            data.forEach(row => {
                if (row[colIndex] && row[colIndex].toString().trim()) {
                    values.add(row[colIndex].toString().trim());
                }
            });
            return Array.from(values).sort((a, b) => a.localeCompare(b));
        };

        const marcas = getUniqueSortedValues(COLS_CORTES.marca - 1);
        const tiposCorte = getUniqueSortedValues(COLS_CORTES.tipoCorte1 -1);
        const tiposEncendido = getUniqueSortedValues(COLS_CORTES.tipoEncendido - 1);
        const configRelay = getUniqueSortedValues(COLS_CORTES.configRelay1 -1);


        const dropdownData = {
            categoria: categorias,
            marca: marcas,
            tipoDeCorte: tiposCorte,
            tipoDeEncendido: tiposEncendido,
            configRelay: configRelay
        };

        return { status: 'success', dropdowns: dropdownData };

    } catch (error) {
        return {
            status: 'error',
            message: 'Failed to get dropdown data.',
            details: { errorMessage: error.message }
        };
    }
}

/**
 * Obtiene los datos mínimos necesarios para la navegación y la carga inicial.
 * Devuelve los conteos de categorías, las categorías ordenadas, la lista de marcas y los logos.
 * Esta acción es LIGERA y está diseñada para ser la primera llamada que hace el frontend.
 */
function handleGetNavigationData() {
    const responseData = {};
    const cortesSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    const logosSheet = getSpreadsheet().getSheetByName(SHEET_NAMES.LOGOS_MARCA);

    // 1. Contar vehículos por categoría y obtener lista de marcas únicas
    const categoryCounts = {};
    const marcas = new Set();
    if (cortesSheet) {
        const data = cortesSheet.getDataRange().getValues();
        data.shift(); // Quitar encabezados
        data.forEach(row => {
            if (row && row[0]) {
                const categoria = row[COLS_CORTES.categoria - 1];
                const marca = row[COLS_CORTES.marca - 1];
                if (categoria) {
                    categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;
                }
                if (marca) {
                    marcas.add(marca);
                }
            }
        });
    }
    responseData.categoryCounts = categoryCounts;
    responseData.marcas = Array.from(marcas).sort();

    // 2. Crear y añadir la lista de categorías ordenada por popularidad
    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    responseData.sortedCategories = sortedCategories;

    // 3. Fetch de todos los logos (respetando el contrato de imágenes)
    let logosData = [];
    if (logosSheet) {
        const data = logosSheet.getDataRange().getValues();
        data.shift();
        logosData = data.map(row => mapRowToObject(row, COLS_LOGOS_MARCA, IMAGE_FIELDS_LOGOS));
    }
    responseData.logos = logosData;

    return { status: 'success', data: responseData, source: 'spreadsheet' };
}


// ============================================================================
// MANEJADOR DE SUGERENCIAS (PARA "QUIZÁS QUISISTE DECIR...")
// ============================================================================
function handleGetSuggestion(payload) {
    const { term, field } = payload;
    if (!term || !field) {
        throw new Error("El término y el campo son requeridos para obtener una sugerencia.");
    }

    let columnIndex;
    if (field.toLowerCase() === 'marca') {
        columnIndex = COLS_CORTES.marca - 1;
    } else if (field.toLowerCase() === 'modelo') {
        columnIndex = COLS_CORTES.modelo - 1;
    } else {
        throw new Error(`El campo '${field}' no es válido para sugerencias.`);
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CORTES);
    if (!sheet) return { status: 'success', suggestion: null };

    const data = sheet.getDataRange().getValues();
    data.shift();

    const uniqueValues = Array.from(new Set(data.map(row => row[columnIndex]).filter(String)));

    let bestMatch = null;
    let minDistance = Infinity;
    const searchTerm = term.toLowerCase();

    for (const value of uniqueValues) {
        const valueLower = value.toLowerCase();
        if (valueLower === searchTerm) {
            // Es una coincidencia exacta, no se necesita sugerencia.
            return { status: 'success', suggestion: null };
        }

        const distance = levenshteinDistance(searchTerm, valueLower);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = value;
        }
    }

    // Umbral: solo sugerir si la distancia es razonablemente pequeña (ej. <= 3)
    // y el término no es un substring de la sugerencia (ej. "Chev" y "Chevrolet")
    if (minDistance <= 3 && bestMatch.toLowerCase().indexOf(searchTerm) === -1) {
        return { status: 'success', suggestion: bestMatch };
    }

    return { status: 'success', suggestion: null };
}


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Normaliza y valida un valor que se espera sea un ID de imagen de Google Drive.
 * Esta función es el GOBERNADOR del contrato de imágenes.
 * - Puede manejar un fileId limpio o una URL completa de Drive, extrayendo el ID.
 * - Devuelve null si el valor es inválido, está vacío o no es un string.
 * - Si LOG_INVALID_IDS es true, registra los valores inválidos en la consola de Apps Script.
 * - Agrega los valores inválidos a la lista `invalidImageIdsFound` para el modo diagnóstico.
 * @param {string} value - El valor original de la celda de la hoja de cálculo.
 * @returns {string|null} - El fileId limpio y validado, o null si es inválido.
 */
function normalizeAndValidateImageId(value) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    const originalValue = value;
    const trimmedValue = value.trim();

    // Expresión regular para extraer el ID de varias URLs de Google Drive.
    const idMatch = trimmedValue.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);

    if (idMatch) {
        const fileId = idMatch[1] || idMatch[2] || idMatch[3];
        if (fileId && fileId.length > 20) {
            return fileId; // ID extraído de URL es válido.
        }
    } else if (trimmedValue.length > 20 && !trimmedValue.includes('/') && !trimmedValue.includes(':')) {
        // Si no es una URL pero parece un ID, se asume que es un fileId limpio.
        return trimmedValue;
    }

    // Si no se pudo normalizar o validar, se considera inválido.
    invalidImageIdsFound.push(originalValue);

    return null;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,          // deletion
                matrix[j - 1][i] + 1,          // insertion
                matrix[j - 1][i - 1] + cost    // substitution
            );
        }
    }

    return matrix[b.length][a.length];
}


/**
 * Normaliza cualquier formato de URL de YouTube a un formato de embed estable.
 * Soporta URLs cortas, de búsqueda, de canal y IDs directos.
 */
function normalizeYouTubeUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Si ya es un ID de 11 caracteres (ej. dQw4w9WgXcQ)
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes(':')) {
        return `https://www.youtube.com/embed/${trimmed}?enablejsapi=1`;
    }

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);

    const id = (match && match[2].length === 11) ? match[2] : trimmed;

    // Si al final no parece un ID válido, devolver null o intentar usarlo como ID
    if (id.length !== 11) return null;

    return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
}

function isYearInRangeV2(inputYear, anoDesde, anoHasta) {
    if (isNaN(inputYear)) return false;
    const desde = anoDesde ? parseInt(anoDesde, 10) : inputYear;
    const hasta = anoHasta ? parseInt(anoHasta, 10) : desde; // Si no hay 'hasta', el rango es solo un año.
    return inputYear >= desde && inputYear <= hasta;
}
