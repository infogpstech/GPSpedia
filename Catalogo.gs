// Definición de constantes para IDs y nombres de hojas.
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DATA_SHEET_NAME_CORTES = "Cortes";
const DATA_SHEET_NAME_TUTORIAL = "Tutorial";
const DATA_SHEET_NAME_RELAY = "Configuración del Relay";

/**
 * Función de utilidad para convertir texto de cabecera a formato camelCase.
 * Ejemplo: "Año (generacion)" se convierte en "anioGeneracion".
 * Maneja acentos, diacríticos y caracteres especiales.
 * @param {string} text El texto de la cabecera a convertir.
 * @returns {string} El texto convertido a camelCase.
 */
function toCamelCase(text) {
  if (!text) return '';
  // Normaliza el texto para eliminar acentos y diacríticos.
  const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Reemplaza caracteres no alfanuméricos (excepto espacios) por nada y luego convierte a camelCase.
  return normalizedText
    .replace(/[^\w\s]/g, '') // Elimina puntuación y caracteres especiales
    .replace(/\s+(.)/g, (match, chr) => chr.toUpperCase()) // Convierte "palabra uno" a "palabraUno"
    .replace(/\s/g, '') // Elimina espacios restantes
    .replace(/^(.)/, (match, chr) => chr.toLowerCase()); // Asegura que la primera letra sea minúscula
}


/**
 * Obtiene los datos de una hoja de cálculo específica y los convierte a un array de objetos JSON.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss La instancia de la hoja de cálculo.
 * @param {string} sheetName El nombre de la hoja de la que se obtendrán los datos.
 * @returns {Array<Object>} Un array de objetos, donde cada objeto representa una fila.
 */
function getDataAsJson(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    console.error("No se encontró la hoja: " + sheetName);
    return []; // Devuelve un array vacío si la hoja no existe
  }
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return []; // No hay datos para procesar (solo cabecera o vacía)
  }

  const headers = values[0].map(toCamelCase); // Convierte todas las cabeceras a camelCase
  const data = [];

  for (let i = 1; i < values.length; i++) {
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) { // Solo añade la propiedad si la cabecera no está vacía
        rowObject[headers[j]] = values[i][j];
      }
    }
    data.push(rowObject);
  }
  return data;
}

/**
 * Función principal que se ejecuta cuando se hace una petición GET a la URL de la Web App.
 * Determina qué datos devolver basándose en el parámetro 'sheet' en la URL.
 * @param {Object} e El objeto de evento de la petición GET.
 * @returns {GoogleAppsScript.Content.TextOutput} La respuesta JSON.
 */
function doGet(e) {
  try {
    const requestedSheet = e.parameter.sheet;
    let data;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Selecciona qué datos obtener según el parámetro de la URL.
    // Si no se especifica, por defecto devuelve "Cortes".
    switch (requestedSheet) {
      case DATA_SHEET_NAME_TUTORIAL:
        data = getDataAsJson(ss, DATA_SHEET_NAME_TUTORIAL);
        break;
      case DATA_SHEET_NAME_RELAY:
        data = getDataAsJson(ss, DATA_SHEET_NAME_RELAY);
        break;
      case DATA_SHEET_NAME_CORTES:
      default:
        data = getDataAsJson(ss, DATA_SHEET_NAME_CORTES);
        break;
    }

    // Crea y devuelve la respuesta en formato JSON.
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Manejo de errores: registra el error y devuelve una respuesta de error.
    console.error("Error en doGet (Catalogo.gs): " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Ha ocurrido un error en el servidor: " + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
