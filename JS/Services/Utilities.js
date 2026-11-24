// GPSPEDIA UTILITIES — protected and recoverable migrations
// VERSION: 1.5.0 | OUTPUT: Hoja 1 (columna A)
// AUTH owns the session record; UTILITIES loads and caches the actor from Users/ActiveSessions locally.
// Mutations are serialized by the local ScriptLock; session actors are loaded and cached locally.
function getUtilitiesSpreadsheet_() {
 const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
 if (!spreadsheet) throw new Error("No hay una Spreadsheet activa vinculada al proyecto UTILITIES.");
 return spreadsheet;
}
const SHEET_NAMES={SOURCE:"Cortes",TARGET:"Hoja 1",STAGING:"__utilities_timestamps_staging__",BACKUP:"__utilities_timestamps_backup__"};
const SOURCE_COLS={imagenVehiculo:9};
function doGet(){return ContentService.createTextOutput(JSON.stringify({status:"available",service:"GPSpedia-Utilities",version:"1.5.0"})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
 let response;
 try{
  const raw=e&&e.postData&&typeof e.postData.contents==="string"?e.postData.contents:"{}";
  const body=JSON.parse(raw);
  if(body&&body.action==="__invalidateSessionActorCache"){
   response=handleSharedSessionActorCacheInvalidation_(body.payload);
   return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
  if(!body||body.action!=="migrateTimestamps")throw new Error("Acción no soportada.");
  const payload=body.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload:{};
  response=migrateTimestamps(payload);
 }catch(error){response={status:"error",message:"No se pudo ejecutar la migración de utilidades.",details:String(error&&error.message?error.message:error)};}
 return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
function assertUtilitiesDeveloperSession_(payload, _spreadsheet) {
 const trusted = payload && payload.__sharedSessionActor;
 if (!trusted || typeof trusted.userId !== "string" || typeof trusted.role !== "string" || !Number.isSafeInteger(trusted.epoch) || trusted.epoch < 1) throw new Error("Acceso denegado: falta el contexto de sesión compartido.");
 const userId = trusted.userId.trim(), requested = String(payload.userId || userId).trim();
 if (!userId || requested !== userId || trusted.role.trim().toLowerCase() !== "desarrollador") throw new Error("Acceso denegado: acción reservada a Desarrollador.");
 return {userId,role:"Desarrollador",epoch:trusted.epoch};
}
function migrateTimestamps(payload){
 const spreadsheet=getUtilitiesSpreadsheet_();
 const actor=getCachedSharedSessionActor_(payload&&payload.userId,payload&&payload.sessionToken,{service:"UTILITIES",loadSpreadsheet:()=>spreadsheet});
 const trustedPayload=Object.assign({},payload||{},{__sharedSessionActor:actor});
 return migrateTimestampsSafe_(trustedPayload,spreadsheet);
}
function migrateTimestampsSafe_(payload,spreadsheetOverride){
 const lock=LockService.getScriptLock();let acquired=false;
 try{
  if (!lock.tryLock(0)) throw new Error('UTILITIES está ocupado con otra migración; reintenta sin esperar.'); acquired=true;
  const ss=spreadsheetOverride||getUtilitiesSpreadsheet_();assertUtilitiesDeveloperSession_(payload,ss);
  recoverUtilitiesInterruptedMigration_(ss);
  const source=ss.getSheetByName(SHEET_NAMES.SOURCE);if(!source)throw new Error("Hoja 'Cortes' no existe.");
  const last=source.getLastRow(),sourceValues=last<2?[]:source.getRange(2,SOURCE_COLS.imagenVehiculo,last-1,1).getValues();
  if(!Array.isArray(sourceValues))throw new Error("No se pudo crear la instantánea de Cortes.");
  const sourceSnapshot=sourceValues.map((row,index)=>{if(!Array.isArray(row)||row.length!==1)throw new Error("Instantánea de Cortes inválida en la fila "+(index+2)+".");return row[0];});
  const target=ss.getSheetByName(SHEET_NAMES.TARGET),targetSnapshot=target?target.getDataRange().getValues().map(row=>row.slice()):null;
  if(target&&(!Array.isArray(targetSnapshot)||!targetSnapshot.length))throw new Error("No se pudo validar la instantánea de Hoja 1.");
  const output=sourceSnapshot.map(url=>[resolveTimestamp_(url)]);
  return replaceUtilitiesTargetSafely_(ss,output,targetSnapshot);
 }finally{if(acquired)lock.releaseLock();}
}
function replaceUtilitiesTargetSafely_(ss,output,targetSnapshot){
 const target=ss.getSheetByName(SHEET_NAMES.TARGET);
 if(Boolean(target)!==Array.isArray(targetSnapshot))throw new Error("El destino cambió después de tomar la instantánea; se cancela la migración.");
 let staging;
 try{
  staging=target?target.copyTo(ss).setName(SHEET_NAMES.STAGING):ss.insertSheet(SHEET_NAMES.STAGING);
  staging.clearContents();ensureUtilitiesSheetRows_(staging,output.length+1);
  staging.getRange(1,1).setValue("timestamp");if(output.length)staging.getRange(2,1,output.length,1).setValues(output);
  const expected=[["timestamp"],...output];
  if(!sameUtilitiesColumn_(staging.getRange(1,1,expected.length,1).getValues(),expected))throw new Error("La verificación de staging no coincide con el resultado calculado.");
 }catch(error){
  const leftover=ss.getSheetByName(SHEET_NAMES.STAGING);
  if(leftover&&!ss.getSheetByName(SHEET_NAMES.BACKUP)){try{ss.deleteSheet(leftover);}catch(cleanupError){}}
  throw error;
 }
 const original=ss.getSheetByName(SHEET_NAMES.TARGET);
 try{
  if(original){original.setName(SHEET_NAMES.BACKUP);if(!sameUtilitiesMatrix_(original.getDataRange().getValues(),targetSnapshot))throw new Error("La copia de recuperación no coincide con la instantánea del destino.");}
  staging.setName(SHEET_NAMES.TARGET);
  const promoted=ss.getSheetByName(SHEET_NAMES.TARGET),expected=[["timestamp"],...output];
  if(!sameUtilitiesColumn_(promoted.getRange(1,1,expected.length,1).getValues(),expected))throw new Error("La verificación posterior al reemplazo falló.");
 }catch(error){
  let rollbackError=null;
  try{
   const promoted=ss.getSheetByName(SHEET_NAMES.TARGET);if(promoted&&promoted!==original)ss.deleteSheet(promoted);
   const backup=ss.getSheetByName(SHEET_NAMES.BACKUP);if(backup&&!ss.getSheetByName(SHEET_NAMES.TARGET))backup.setName(SHEET_NAMES.TARGET);
   const leftover=ss.getSheetByName(SHEET_NAMES.STAGING);if(leftover)ss.deleteSheet(leftover);
  }catch(restoreError){rollbackError=restoreError;}
  if(rollbackError)throw new Error("Falló la migración y también la restauración; se conservaron hojas de recuperación. Causa: "+String(error.message||error)+"; restauración: "+String(rollbackError.message||rollbackError));
  throw new Error("La migración no se confirmó; se restauró la hoja anterior. Causa: "+String(error.message||error));
 }
 let backupRetained=false;const backup=ss.getSheetByName(SHEET_NAMES.BACKUP);
 if(backup){try{ss.deleteSheet(backup);}catch(cleanupError){backupRetained=true;}}
 return{status:"success",rowsProcessed:output.length,message:output.length?"Migración verificada y aplicada.":"Origen vacío: se aplicó únicamente el encabezado.",backupRetained};
}
function recoverUtilitiesInterruptedMigration_(ss){
 const target=ss.getSheetByName(SHEET_NAMES.TARGET),staging=ss.getSheetByName(SHEET_NAMES.STAGING),backup=ss.getSheetByName(SHEET_NAMES.BACKUP);
 if(backup&&target)throw new Error("Hay una hoja de respaldo y una hoja destino simultáneas. Se requiere reconciliación manual.");
 if(backup&&!target){backup.setName(SHEET_NAMES.TARGET);if(staging)ss.deleteSheet(staging);return;}
 if(staging)ss.deleteSheet(staging);
}
function ensureUtilitiesSheetRows_(sheet,required){const current=sheet.getMaxRows();if(current<required)sheet.insertRowsAfter(current,required-current);}
function sameUtilitiesMatrix_(actual,expected){
 if(!Array.isArray(actual)||!Array.isArray(expected)||actual.length!==expected.length)return false;
 for(let i=0;i<expected.length;i++){if(!Array.isArray(actual[i])||!Array.isArray(expected[i])||actual[i].length!==expected[i].length)return false;for(let j=0;j<expected[i].length;j++){const a=actual[i][j],b=expected[i][j];if(a instanceof Date||b instanceof Date){if(!(a instanceof Date)||!(b instanceof Date)||a.getTime()!==b.getTime())return false;}else if(typeof a!==typeof b||a!==b)return false;}}
 return true;
}
function sameUtilitiesColumn_(actual,expected){
 if(!Array.isArray(actual)||actual.length!==expected.length)return false;
 for(let i=0;i<expected.length;i++){const a=actual[i][0]==null?"":actual[i][0],b=expected[i][0]==null?"":expected[i][0];if(String(a)!==String(b))return false;}
 return true;
}
function resolveTimestamp_(url){
 if(!url)return"SIN_URL";if(typeof url!=="string")return"ERROR_ID";const id=extractDriveIdSafe_(url);if(!id)return"ERROR_ID";
 try{return Utilities.formatDate(DriveApp.getFileById(id).getDateCreated(),Session.getScriptTimeZone(),"dd/MM/yyyy");}catch(error){return"SIN_ACCESO";}
}
function extractDriveIdSafe_(url){try{const m=url.match(/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);return m?(m[1]||m[2]||m[3]):null;}catch(error){return null;}}
