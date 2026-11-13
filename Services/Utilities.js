// GPSPEDIA UTILITIES — protected and recoverable migrations
// VERSION: 1.5.0 | OUTPUT: Hoja 1 (columna A)
// AUTH: active developer session verified from Users/ActiveSessions.
// Mutations acquire a shared lease before the local ScriptLock; see COORDINATOR_SETUP.md.
const SPREADSHEET_ID="1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs";
const SHEET_NAMES={SOURCE:"Cortes",TARGET:"Hoja 1",STAGING:"__utilities_timestamps_staging__",BACKUP:"__utilities_timestamps_backup__"};
const SOURCE_COLS={imagenVehiculo:9},ROLE_REVOCATION_SHARED_PREFIX="__role_revocation_pending__:";
function doGet(){return ContentService.createTextOutput(JSON.stringify({status:"success",service:"UTILITIES",version:"1.5.0"})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
 let response;
 try{
  const raw=e&&e.postData&&typeof e.postData.contents==="string"?e.postData.contents:"{}";
  const body=JSON.parse(raw);
  if(!body||body.action!=="migrateTimestamps")throw new Error("Acción no soportada.");
  const payload=body.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload:{};
  response=migrateTimestamps(payload);
 }catch(error){response={status:"error",message:"No se pudo ejecutar la migración de utilidades.",details:String(error&&error.message?error.message:error)};}
 return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
function assertUtilitiesDeveloperSession_(payload,ss){
 const userId=String(payload&&payload.userId||"").trim(),token=String(payload&&payload.sessionToken||"").trim();
 if(!userId||!token)throw new Error("Acceso denegado: se requiere una sesión activa de Desarrollador.");
 const sh=ss.getSheetByName("ActiveSessions"),uh=ss.getSheetByName("Users");
 if(!sh||!uh)throw new Error("Acceso denegado: no se pudo verificar la sesión.");
 const sessions=sh.getDataRange().getValues().slice(1).filter(r=>String(r[2]||"").trim()===token);
 if(sessions.length!==1||String(sessions[0][0]||"").trim()!==userId||getUtilitiesSessionExpiration_(sessions[0],new Date()).expired)throw new Error("Acceso denegado: sesión inválida, duplicada, cruzada o expirada.");
 const users=uh.getDataRange().getValues().slice(1).filter(r=>String(r[0]||"").trim()===userId);
 if(users.length!==1)throw new Error("Acceso denegado: perfil ausente o ambiguo.");
 const u=users[0],username=String(u[1]||"").trim();
 if(!username||username.startsWith("__deleted__:"))throw new Error("Acceso denegado: cuenta inactiva.");
 if(String(u[7]||"").startsWith(ROLE_REVOCATION_SHARED_PREFIX))throw new Error("Acceso denegado: existe una revocación de rol pendiente.");
 const role=String(u[3]||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
 if(role!=="desarrollador")throw new Error("Acceso denegado: acción reservada a Desarrollador.");
 return{userId,role:"Desarrollador"};
}
function getUtilitiesSessionExpiration_(row,now){
 const parse=v=>{if(v==null||String(v).trim()==="")return null;const d=v instanceof Date?new Date(v.getTime()):new Date(v);return Number.isNaN(d.getTime())?null:d;};
 const add=(date,n)=>{const d=new Date(date.getTime()),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;};
 const created=parse(row&&row[3]),activity=parse(row&&(row[5]||row[3]));
 if(!created||!activity)return{expired:true};
 if(now>=add(created,3)||now>=add(activity,1))return{expired:true};
 return{expired:false};
}
function migrateTimestamps(payload){
 return withSharedMutationLease_("UTILITIES","migrateTimestamps",function(){return migrateTimestampsSafe_(payload);});
}
function migrateTimestampsSafe_(payload){
 const lock=LockService.getScriptLock();let acquired=false;
 try{
  lock.waitLock(30000);acquired=true;
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);assertUtilitiesDeveloperSession_(payload,ss);
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
