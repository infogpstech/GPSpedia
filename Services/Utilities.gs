// ============================================================================
// GPSPEDIA UTILITIES — ORDER SAFE & ERROR PROOF
// ============================================================================
// VERSION: 1.3.0
// OUTPUT: Hoja 1 (columna A)
// AUTH: NONE
// ============================================================================


// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const SPREADSHEET_ID = "1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";

const SHEET_NAMES = {
  SOURCE: "Cortes",
  TARGET: "Hoja 1"
};

const SOURCE_COLS = {
  imagenVehiculo: 9 // Columna I
};


// ============================================================================
// ROUTER
// ============================================================================
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Utilities v1.3.0 activo — orden seguro"
  })).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let response;

  try {
    const body = JSON.parse(e.postData?.contents || "{}");
    if (body.action !== "migrateTimestamps") {
      throw new Error("Acción no soportada");
    }

    response = migrateTimestampsSafe();

  } catch (err) {
    response = {
      status: "error",
      message: "Error en el servicio de utilidades.",
      details: String(err)
    };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.TEXT);
}


// ============================================================================
// CORE — SAFE MIGRATION
// ============================================================================
function migrateTimestampsSafe() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const source = ss.getSheetByName(SHEET_NAMES.SOURCE);
  if (!source) {
    throw new Error("Hoja 'Cortes' no existe");
  }

  const target = getOrCreateTargetSheet(ss);

  const lastRow = source.getLastRow();
  if (lastRow < 2) {
    resetTarget(target);
    return { status: "success", message: "Sin datos para procesar." };
  }

  const urls = source
    .getRange(2, SOURCE_COLS.imagenVehiculo, lastRow - 1, 1)
    .getValues();

  resetTarget(target);

  const output = new Array(urls.length);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i][0];
    output[i] = [resolveTimestamp(url)];
  }

  target.getRange(2, 1, output.length, 1).setValues(output);

  return {
    status: "success",
    message: `Procesadas ${output.length} filas en orden exacto`
  };
}


// ============================================================================
// RESOLVERS (NO THROW)
// ============================================================================
function resolveTimestamp(url) {
  if (!url) return "SIN_URL";
  if (typeof url !== "string") return "ERROR_ID";

  const fileId = extractDriveIdSafe(url);
  if (!fileId) return "ERROR_ID";

  try {
    const file = DriveApp.getFileById(fileId);
    const date = file.getDateCreated();

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );

  } catch (e) {
    return "SIN_ACCESO";
  }
}


// ============================================================================
// HELPERS
// ============================================================================
function extractDriveIdSafe(url) {
  try {
    const match = url.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
    return match ? (match[1] || match[2] || match[3]) : null;
  } catch {
    return null;
  }
}

function resetTarget(sheet) {
  sheet.clearContents();
  sheet.getRange("A1").setValue("timestamp");
}

function getOrCreateTargetSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.TARGET);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.TARGET);
  }
  return sheet;
}
