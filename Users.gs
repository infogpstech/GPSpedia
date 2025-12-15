const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const USERS_SHEET_NAME = "Users";

/**
 * Función principal que se ejecuta cuando se hace una petición GET a la URL de la Web App de Usuarios.
 * Su único propósito es devolver la lista completa de usuarios para la autenticación en el frontend.
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "Users sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    // Devolvemos los datos en el formato que espera la lógica de login en index.html,
    // simulando la respuesta de la API de Google Sheets.
    const response = { values: data };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en doGet (Users.gs): " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función principal para peticiones POST, manejará la creación, modificación y eliminación de usuarios.
 * Se implementará en pasos posteriores.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // Esqueleto para las futuras acciones
    switch (action) {
      case 'createUser':
        // Lógica para crear un nuevo usuario (se implementará más adelante)
        return createJsonResponse({ status: 'success', message: 'Acción createUser recibida.' });
      case 'updateUser':
        // Lógica para actualizar un usuario existente (se implementará más adelante)
        return createJsonResponse({ status: 'success', message: 'Acción updateUser recibida.' });
      case 'deleteUser':
        // Lógica para eliminar un usuario (se implementará más adelante)
        return createJsonResponse({ status: 'success', message: 'Acción deleteUser recibida.' });
      case 'changePassword':
         // Lógica para cambiar la contraseña de un usuario (se implementará más adelante)
        return createJsonResponse({ status: 'success', message: 'Acción changePassword recibida.' });
      default:
        return createJsonResponse({ status: 'error', message: 'Acción no válida.' });
    }

  } catch (error) {
    console.error("Error en doPost (Users.gs): " + error.toString());
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Función de ayuda para crear una respuesta JSON estandarizada.
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
