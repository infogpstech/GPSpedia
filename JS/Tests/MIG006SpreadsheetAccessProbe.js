function mig006ActiveSpreadsheet_() {
  try { return SpreadsheetApp.getActiveSpreadsheet() || null; }
  catch (error) { return null; }
}
function mig006Json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function mig006Ui_() {
  var html = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' +
    '<h2>GPSpedia — MIG-006</h2>' +
    '<p>Esta prueba escribe únicamente en la hoja reservada __MIG006_ACCESS_PROBE__ de una Spreadsheet desechable.</p>' +
    '<form method="post"><input type="hidden" name="action" value="write-probe">' +
    '<input type="hidden" name="confirmDisposable" value="true">' +
    '<button type="submit">Ejecutar escritura de prueba</button></form></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('GPSpedia MIG-006');
}
function doGet(e) {
  if (e && e.parameter && e.parameter.probeUi === '1') return mig006Ui_();
  var spreadsheet = mig006ActiveSpreadsheet_();
  if (!spreadsheet) return mig006Json_({ok:false,code:'NO_ACTIVE_SPREADSHEET',message:'La ejecución Web App no recibió un contenedor activo.'});
  var sheet = spreadsheet.getSheetByName('__MIG006_ACCESS_PROBE__');
  var marker = sheet ? String(sheet.getRange(1,1,1,2).getValues()[0][0] || '') : '';
  return mig006Json_({ok:true,code:'ACTIVE_SPREADSHEET_AVAILABLE',probeSheetExists:Boolean(sheet),writeMarkerDetected:marker==='MIG006_WRITE_OK'});
}
function doPost(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (params.action !== 'write-probe' || params.confirmDisposable !== 'true')
    return mig006Json_({ok:false,code:'CONFIRMATION_REQUIRED',message:'La escritura requiere confirmación explícita de una Spreadsheet desechable.'});
  var spreadsheet = mig006ActiveSpreadsheet_();
  if (!spreadsheet) return mig006Json_({ok:false,code:'NO_ACTIVE_SPREADSHEET',message:'La ejecución Web App no recibió un contenedor activo.'});
  try {
    var sheet = spreadsheet.getSheetByName('__MIG006_ACCESS_PROBE__');
    if (!sheet) sheet = spreadsheet.insertSheet('__MIG006_ACCESS_PROBE__');
    sheet.getRange(1,1,1,2).setValues([['MIG006_WRITE_OK',new Date().toISOString()]]);
    SpreadsheetApp.flush();
    return mig006Json_({ok:true,code:'WRITE_OK',marker:'MIG006_WRITE_OK'});
  } catch (error) { return mig006Json_({ok:false,code:'WRITE_FAILED'}); }
}