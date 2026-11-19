import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function extract(name,nextName){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const end=nextName?source.indexOf("\nfunction "+nextName+"(",start+10):source.indexOf("\nfunction ",start+10);
 assert.ok(end>start,"No se encontró el límite de "+name);
 return source.slice(start,end);
}
const columnsMatch=source.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch,"No se encontró el mapa de columnas Cortes");
const columns=new Function("return ({"+columnsMatch[1]+"});")();
for(const slot of [1,2,3]){
 const first=columns["tipoCorte"+slot];
 assert.equal(columns["ubicacionCorte"+slot],first+1);
 assert.equal(columns["colorCableCorte"+slot],first+2);
 assert.equal(columns["configRelay"+slot],first+3);
 assert.equal(columns["imgCorte"+slot],first+4);
}
const helper=extract("buildCutSlotCoreValues_","handleAddOrUpdateCutLockedUnsafe_");
const build=new Function(helper+"\nreturn buildCutSlotCoreValues_;")();
assert.deepEqual(build({tipoCorte1:"Ignición",ubicacionCorte1:"Bajo asiento",colorCableCorte1:"Azul",configRelay1:"NC"},"cut-image"),
 ["Ignición","Bajo asiento","Azul","NC","cut-image"]);
assert.deepEqual(build({tipoCorte1:"Bomba",ubicacionCorte1:"Arnés",colorCableCorte1:"Rojo",configRelay1:""},""),
 ["Bomba","Arnés","Rojo","",""]);
const unsafeStart=source.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const unsafeEnd=source.indexOf("\nfunction ",unsafeStart+10);
const unsafe=source.slice(unsafeStart,unsafeEnd);
const existingStart=unsafe.indexOf("if (vehicleId) { // --- Lógica para vehículo EXISTENTE");
const existingEnd=unsafe.indexOf("} else { // --- Lógica para vehículo NUEVO",existingStart);
assert.ok(existingStart>=0&&existingEnd>existingStart,"No se encontraron las ramas de vehículo existente/nuevo");
const existing=unsafe.slice(existingStart,existingEnd);
assert.match(existing,/const slotCoreValues = buildCutSlotCoreValues_\(cutData, imageUrl\)/);
assert.match(existing,/getRange\(rowIndex,\s*COLS_CORTES\[`tipoCorte\$\{cutSlotIndex\}`\],\s*1,\s*slotCoreValues\.length\)\.setValues\(\[slotCoreValues\]\)/);
assert.match(existing,/COLS_CORTES\[`activaTestigo\$\{cutSlotIndex\}`\]/);
assert.match(existing,/COLS_CORTES\[`colaboradorCorte\$\{cutSlotIndex\}`\]/);
assert.doesNotMatch(existing,/getRange\(rowIndex,\s*COLS_CORTES\[`tipoCorte\$\{cutSlotIndex\}`\]\)\.setValue/);
const newBranch=unsafe.slice(existingEnd);
const rowArray=newBranch.match(/const rowCoreValues = \[([\s\S]*?)\n\s*\];/);
assert.ok(rowArray,"No se encontró el lote de campos para vehículo nuevo");
const buildRow=new Function("vehicleData","anoDesde","anoHasta","vehiculoImageUrl","cutData","corteImageUrl","buildCutSlotCoreValues_","return ["+rowArray[1]+"];");
const row=buildRow(
 {categoria:"Camioneta",marca:"Toyota",modelo:"Hilux",versionesAplicables:"2.8",tipoEncendido:"Llave"},
 2024,2025,"vehicle-image",
 {tipoCorte1:"Ignición",ubicacionCorte1:"Bajo asiento",colorCableCorte1:"Azul",configRelay1:"NC"},"cut-image",build
);
assert.equal(row.length,15,"El lote debe cubrir exactamente las columnas 2–16");
assert.deepEqual(row.slice(8,10),["",""],"No debe alterar video ni contador previamente limpiados");
assert.deepEqual(row.slice(10),["Ignición","Bajo asiento","Azul","NC","cut-image"]);
assert.match(newBranch,/getRange\(rowIndex,\s*COLS_CORTES\.categoria,\s*1,\s*rowCoreValues\.length\)\.setValues\(\[rowCoreValues\]\)/);
assert.match(newBranch,/COLS_CORTES\.colaboradorCorte1/);
assert.match(newBranch,/COLS_CORTES\.timestamp/);
assert.match(newBranch,/COLS_CORTES\.activaTestigo1/);
const vinReservation=newBranch.indexOf("sheet.getRange(rowIndex, vinColumnIndex).setValue(serializeVinCollection([vinPrefix]));");
const opReservation=newBranch.indexOf('recordOpId(opId, newId, 1, formattedDate, "pending", operationHash);');
const driveStart=newBranch.indexOf("runWriteDriveWorkOutsideScriptLock_");
assert.ok(vinReservation>=0&&opReservation>=0&&driveStart>vinReservation&&driveStart>opReservation,
 "VIN y opId deben reservarse antes de liberar el lock para Drive");
console.log("WriteCutSlotBatchWrites: 1/1 PASS — escrituras por lote en cortes existentes y vehículos nuevos; reservas conservadas");
