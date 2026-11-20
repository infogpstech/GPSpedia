import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const columnsMatch = source.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch, "No se encontró el mapa de columnas Cortes");
const columns = new Function("return ({" + columnsMatch[1] + "});")();
assert.equal(columns.marca, columns.categoria + 1);
assert.equal(columns.modelo, columns.categoria + 2);
assert.equal(columns.versionesAplicables, columns.categoria + 3);
assert.equal(columns.anoDesde, columns.categoria + 4);
assert.equal(columns.anoHasta, columns.categoria + 5);
assert.equal(columns.tipoEncendido, columns.categoria + 6);
assert.equal(columns.imagenVehiculo, columns.categoria + 7);
assert.equal(columns.ubicacionCorte1, columns.tipoCorte1 + 1);
assert.equal(columns.colorCableCorte1, columns.tipoCorte1 + 2);
assert.equal(columns.configRelay1, columns.tipoCorte1 + 3);
assert.equal(columns.imgCorte1, columns.tipoCorte1 + 4);

const start = source.indexOf("// 4. Guardar los campos contiguos del vehículo y del primer corte en dos lotes.");
const end = source.indexOf("        SpreadsheetApp.flush();", start);
assert.ok(start >= 0 && end > start, "No se encontró el bloque final de escrituras del vehículo nuevo");
const block = source.slice(start, end);
assert.match(block, /getRange\(rowIndex, COLS_CORTES\.categoria, 1, newVehicleValues\.length\)\s*\.setValues\(\[newVehicleValues\]\)/);
assert.match(block, /getRange\(rowIndex, COLS_CORTES\.tipoCorte1, 1, newCutSlotValues\.length\)\s*\.setValues\(\[newCutSlotValues\]\)/);
assert.match(block, /COLS_CORTES\.timestamp\)\.setValue\(formattedDate\)/);
assert.match(block, /COLS_CORTES\.activaTestigo1\)\.setValue\(cutData\.activaTestigo1 === true\)/);
assert.match(block, /COLS_CORTES\.colaboradorCorte1\)\.setValue\(colaboradorName\)/);
for (const field of ["categoria","marca","modelo","versionesAplicables","anoDesde","anoHasta","tipoEncendido","imagenVehiculo",
    "tipoCorte1","ubicacionCorte1","colorCableCorte1","configRelay1","imgCorte1"]) {
    assert.equal(block.includes("COLS_CORTES." + field + ").setValue"), false,
        field + " no debe conservar escritura individual");
}

const execute = new Function("sheet","rowIndex","newVehicleData","anoDesde","anoHasta","vehiculoImageUrl",
    "formattedDate","COLS_CORTES","cutData","corteImageUrl","colaboradorName",block);
const calls = [];
const sheet = { getRange: (...range) => ({
    setValues: values => calls.push({type:"setValues",range,values}),
    setValue: value => calls.push({type:"setValue",range,value})
}) };
const newVehicleData = {
    categoria:"Motorcycle",marca:"Yamaha",modelo:"MT-03",versionesAplicables:"ABS",tipoEncendido:"Llave"
};
const cutData = {
    tipoCorte1:"Bomba",ubicacionCorte1:"Arnés principal",colorCableCorte1:"Azul",
    configRelay1:"87a",activaTestigo1:true
};
execute(sheet,12,newVehicleData,2021,2024,"https://drive.test/vehicle","19/11/2026",
    columns,cutData,"https://drive.test/cut","Técnico");

assert.equal(calls.length,5,"Debe reducir las 16 escrituras a dos lotes y tres escrituras separadas");
assert.deepEqual(calls[0].range,[12,columns.categoria,1,8]);
assert.deepEqual(calls[0].values,[["Motorcycle","Yamaha","MT-03","ABS",2021,2024,"Llave","https://drive.test/vehicle"]]);
assert.deepEqual(calls[1],{type:"setValue",range:[12,columns.timestamp],value:"19/11/2026"});
assert.deepEqual(calls[2].range,[12,columns.tipoCorte1,1,5]);
assert.deepEqual(calls[2].values,[["Bomba","Arnés principal","Azul","87a","https://drive.test/cut"]]);
assert.deepEqual(calls[3],{type:"setValue",range:[12,columns.activaTestigo1],value:true});
assert.deepEqual(calls[4],{type:"setValue",range:[12,columns.colaboradorCorte1],value:"Técnico"});

const handlerStart = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const handlerEnd = source.indexOf("\nfunction sanitizeSupplementaryRichText_",handlerStart);
const handler = source.slice(handlerStart,handlerEnd);
const newBranch = handler.slice(handler.indexOf("} else { // --- Lógica para vehículo NUEVO"));
assert.ok(newBranch.indexOf("recordOpId(opId, newId, 1, formattedDate, \"pending\"") <
    newBranch.indexOf("runAdminContributionDriveWorkOutsideScriptLock_"),"La reserva pending debe preceder a Drive");
assert.ok(newBranch.indexOf("Number(sheet.getRange(rowIndex, COLS_CORTES.id).getValue())") <
    newBranch.indexOf("runAdminContributionDriveWorkOutsideScriptLock_"),"Debe conservarse la lectura de confirmación del ID antes de Drive");
assert.ok(newBranch.indexOf("recordOpId(opId, newId, 1, formattedDate, \"completed\"") >
    newBranch.indexOf("SpreadsheetApp.flush()"),"La operación solo debe completarse después de escribir y hacer flush");
console.log("AdminNewVehicleBatchWrites: 13/13 PASS — 2 lotes contiguos y 3 escrituras separadas; reserva, ID y Drive preservados");
