import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
function block(name){const a=source.indexOf("function "+name+"(");assert.ok(a>=0,"No se encontró "+name);const b=source.indexOf("\nfunction ",a+10);return source.slice(a,b<0?source.length:b);}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("el ledger tiene esquema fijo y versionado",()=>{
 assert.match(source,/LOGO_ID_RESERVATIONS_SHEET_NAME_ = "LogoIdReservations"/);
 assert.match(source,/\["recordType", "reservationId", "logoId", "createdAt", "schemaVersion"\]/);
 assert.match(source,/LOGO_ID_RESERVATION_BASELINE_VERSION_ = "logo_id_counter_baseline_v1"/);
});
test("la hoja debe existir y el encabezado se valida sin crearla",()=>{
 const fn=block("getLogoIdReservationsSheet_");
 assert.match(fn,/getSheetByName\(LOGO_ID_RESERVATIONS_SHEET_NAME_\)/);
 assert.match(fn,/if \(!sheet\)/);
 assert.doesNotMatch(fn,/insertSheet|appendRow/);
 assert.match(fn,/LOGO_ID_RESERVATIONS_HEADERS_/);
});
test("el baseline es reanudable y verifica read-back",()=>{
 const fn=block("ensureLogoIdReservationBaselineUnderLock_");
 assert.match(fn,/LOGO_ID_RESERVATION_BASELINE_PENDING_/);
 assert.match(fn,/LOGO_ID_RESERVATION_BASELINE_VERSION_/);
 assert.match(fn,/PropertiesService\.getScriptProperties\(\)\.getProperty/);
 assert.match(fn,/inspectLogoIdHighWater_\(logoSheet\)/);
 assert.match(fn,/Math\.max\(legacyHighWater, sheetState\.maxId\)/);
 assert.match(fn,/metaRange\.getValues\(\)/);
 assert.doesNotMatch(fn,/\.setProperty\(|\.deleteProperty\(/);
});
test("el flujo ordinario no accede directamente a PropertiesService",()=>{
 assert.doesNotMatch(block("getNextLogoIdLocked_"),/PropertiesService/);
 assert.doesNotMatch(block("handleAddLogo"),/PropertiesService/);
});
test("las reservas tienen identidad, read-back y high-water monotónico",()=>{
 const fn=block("getNextLogoIdLocked_");
 assert.match(fn,/readLatestLogoIdReservation_\(ledgerSheet\)/);
 assert.match(fn,/Math\.max\(logoState\.maxId, baseline\.highWater, ledgerState\.maxId\) \+ 1/);
 assert.match(fn,/Utilities\.getUuid\(\)/);
 assert.match(fn,/reservationId/);
 assert.match(fn,/String\(persisted\[1\] \|\| ""\) !== reservationId/);
 assert.match(fn,/metaRange\.setValue\(nextId\)/);
});
test("el lector del ledger rechaza filas dañadas y duplicadas",()=>{
 const fn=block("readLogoIdReservationLedger_");
 assert.match(fn,/recordType !== "RESERVATION"/);
 assert.match(fn,/ids\.has\(id\) \|\| reservationIds\.has\(reservationId\)/);
});
test("el flujo ordinario lee solo la última reserva y no recorre todo el ledger",()=>{
 const fn=block("readLatestLogoIdReservation_");
 assert.match(fn,/getLastRow\(\)/);
 assert.match(fn,/getRange\(lastRow, 1, 1/);
 assert.doesNotMatch(fn,/getRange\(3, 1, lastRow - 2/);
});
test("el escaneo de LogosMarca se realiza antes del lock y se reconcilia si cambia la hoja",()=>{
 const fn=block("handleAddLogo");
 assert.ok(fn.indexOf("inspectLogoIdHighWater_(sheet)")<fn.indexOf("lock.tryLock(0)"));
 assert.match(fn,/getNextLogoIdLocked_\(sheet, logoIdSnapshot\)/);
});
test("ninguna operación Drive permanece dentro de la sección crítica de asignación",()=>{
 const fn=block("handleAddLogo"),start=fn.indexOf("let newRow"),end=fn.indexOf("} finally {",start);
 assert.ok(start>=0&&end>start);
 assert.doesNotMatch(fn.slice(start,end),/DriveApp|createFile\(|findOrCreateSubFolder\(|getCortesRootFolder\(|file\.setDescription|file\.setTrashed|markRecovery\(|trashUnlinkedFile\(|logMessage\(/);
 assert.ok(fn.indexOf('file.setDescription("GPSpedia LogosMarca — LINKED')>end);
});
test("ADMIN no espera por locks ni usa esperas temporizadas",()=>{
 assert.doesNotMatch(source,/\.waitLock\(/);
 const timeouts=[...source.matchAll(/\.tryLock\(([^)]*)\)/g)].map(m=>m[1].trim());
 assert.ok(timeouts.length>0&&timeouts.every(value=>value==="0"));
});
console.log("LogoIdReservationLedger: "+passed+"/"+passed+" PASS");
