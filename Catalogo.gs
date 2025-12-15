const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DATA_SHEET_NAME = "Cortes";

// Función principal que se ejecuta cuando se hace una petición GET a la URL de la Web App
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet || DATA_SHEET_NAME; // Lee el parámetro 'sheet', default a "Cortes"
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: `Sheet named '${sheetName}' not found` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    // Si se solicitan los usuarios, devolvemos los datos en el formato que espera la lógica de login antigua
    // para minimizar los cambios en el frontend.
    if (sheetName === "Users") {
      return ContentService
        .createTextOutput(JSON.stringify({ values: data })) // Se empaqueta para simular la respuesta de la API de Sheets
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Para cualquier otra hoja (Cortes, Tutorial, etc.), procesamos a JSON con camelCase
    const headers = data.shift().map(toCamelCase);

    const json = data.map((row, index) => {
      const rowData = {};
      headers.forEach((header, i) => {
        if (header) { // Ignorar columnas sin cabecera
          rowData[header] = safeToString(row[i]);
        }
      });
      rowData['rowIndex'] = index + 2;
      return rowData;
    });

    return ContentService
      .createTextOutput(JSON.stringify(json))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Loguear el error para depuración en Apps Script
    console.error(error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Convierte un string a formato camelCase.
 * Ejemplo: "Año (generacion)" se convierte en "anioGeneracion"
 * @param {string} str El string a convertir.
 * @returns {string} El string en camelCase.
 */
function toCamelCase(str) {
  if (!str) return '';
  // Normaliza el string para separar caracteres base de los diacríticos (acentos, ñ, etc.)
  // y luego elimina los diacríticos.
  const sinAcentos = str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return sinAcentos
    .toLowerCase()
    // Convierte "palabra (otra)" a "palabraOtra" y maneja otros símbolos
    .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
    // Asegura que la primera letra sea minúscula
    .replace(/^\w/, c => c.toLowerCase());
}

/**
 * Convierte un valor a string de forma segura, devolviendo un string vacío si es nulo o indefinido.
 * @param {*} value El valor a convertir.
 * @returns {string} El valor como string o un string vacío.
 */
function safeToString(value) {
  return (value === null || value === undefined) ? "" : value.toString();
}
