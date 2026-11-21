import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const startMarker = "                // 3. Completar campos faltantes con escrituras por lote.";
const endMarker = "                if (recoveredVinCollection) {";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "No se encontró el bloque de reparación de recuperación");
const block = source.slice(start, end);

const columnsMatch = source.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch, "No se encontró el mapa de columnas Cortes");
const columns = new Function("return ({" + columnsMatch[1] + "});")();
assert.equal(columns.marca, columns.categoria + 1);
assert.equal(columns.modelo, columns.categoria + 2);
assert.equal(columns.versionesAplicables, columns.categoria + 3);
assert.equal(columns.anoDesde, columns.categoria + 4);
assert.equal(columns.anoHasta, columns.categoria + 5);
assert.equal(columns.tipoEncendido, columns.categoria + 6);
for (const slot of [1, 2, 3]) {
    const first = columns["tipoCorte" + slot];
    assert.equal(columns["ubicacionCorte" + slot], first + 1);
    assert.equal(columns["colorCableCorte" + slot], first + 2);
    assert.equal(columns["configRelay" + slot], first + 3);
}
assert.match(block, /getRange\(rowIndex, COLS_CORTES\.categoria, 1, vehicleFieldValues\.length\)\s*\.setValues\(\[vehicleFieldValues\]\)/);
assert.match(block, /getRange\(rowIndex, COLS_CORTES\["tipoCorte" \+ slotIndex\], 1, cutSlotCoreValues\.length\)\s*\.setValues\(\[cutSlotCoreValues\]\)/);
assert.match(block, /if \(!rowObj\[field\.key\] && field\.value\)/);
assert.match(block, /if \(!rowObj\.anoDesde && vehicleData\.anoDesde\)/);
assert.match(block, /if \(!rowObj\.anoHasta\)/);
assert.match(block, /COLS_CORTES\[testigoKey\]\)\.setValue/);
assert.match(block, /COLS_CORTES\[`colaboradorCorte\$\{slotIndex\}`\]\)\.setValue/);
for (const field of ["categoria", "marca", "modelo", "versionesAplicables", "anoDesde", "anoHasta", "tipoEncendido",
    "tipoCorte", "ubicacionCorte", "colorCableCorte", "configRelay"]) {
    assert.equal(block.includes("COLS_CORTES." + field + ").setValue"), false,
        field + " no debe conservar una escritura individual");
}

// Ejecuta el bloque con una hoja simulada para comprobar valores y llamadas reales.
const runBlock = new Function("sheet", "rowIndex", "rowObj", "vehicleData", "cutData",
    "slotIndex", "colaboradorName", "rowValues", "COLS_CORTES", block);
function simulate(slot, existing = {}) {
    const rowValues = Array(48).fill("");
    Object.entries(columns).forEach(([key, column]) => {
        if (typeof column === "number" && Object.hasOwn(existing, key)) rowValues[column - 1] = existing[key];
    });
    const rowObj = { ...existing };
    const calls = [];
    const sheet = { getRange: (...args) => ({
        setValues: values => calls.push({ type: "setValues", range: args, values }),
        setValue: value => calls.push({ type: "setValue", range: args, value })
    }) };
    const vehicleData = {
        categoria: "Motorcycle", marca: "Yamaha", modelo: "MT-03",
        versionesAplicables: "ABS", anoDesde: "2023-2021", tipoEncendido: "Llave"
    };
    const cutData = {
        tipoCorte1: "Bomba", ubicacionCorte1: "Arnés principal",
        colorCableCorte1: "Azul", configRelay1: "87a",
        activaTestigo1: true
    };
    runBlock(sheet, 12, rowObj, vehicleData, cutData, slot, "Técnico", rowValues, columns);
    return calls;
}
const calls = simulate(2, { marca: "Honda", anoHasta: 2024, tipoCorte2: "Ignición" });
const batches = calls.filter(call => call.type === "setValues");
assert.equal(batches.length, 2, "Debe emitir como máximo un lote de vehículo y uno de corte");
assert.deepEqual(batches[0].range, [12, columns.categoria, 1, 7]);
assert.deepEqual(batches[0].values[0], ["Motorcycle", "Honda", "MT-03", "ABS", 2021, 2024, "Llave"],
    "Debe conservar marca/añoHasta existentes y normalizar el rango de años");
assert.deepEqual(batches[1].range, [12, columns.tipoCorte2, 1, 4]);
assert.deepEqual(batches[1].values[0], ["Ignición", "Arnés principal", "Azul", "87a"],
    "Debe conservar el tipo de corte existente y completar solo los campos vacíos");
assert.ok(calls.some(call => call.type === "setValue" && call.range[1] === columns.activaTestigo2 && call.value === true),
    "El testigo debe seguir escribiéndose en su columna independiente");
assert.ok(calls.some(call => call.type === "setValue" && call.range[1] === columns.colaboradorCorte2 && call.value === "Técnico"),
    "El colaborador debe seguir escribiéndose en su columna independiente");

const noChanges = simulate(1, {
    categoria: "Motorcycle", marca: "Yamaha", modelo: "MT-03", versionesAplicables: "ABS",
    anoDesde: 2021, anoHasta: 2024, tipoEncendido: "Llave",
    tipoCorte1: "Bomba", ubicacionCorte1: "Arnés principal", colorCableCorte1: "Azul",
    configRelay1: "87a", activaTestigo1: true, colaboradorCorte1: "Técnico"
});
assert.equal(noChanges.filter(call => call.type === "setValues").length, 0,
    "No debe escribir lotes cuando todos los campos ya están completos");
console.log("AdminRecoveryRepairBatchWrites: 12/12 PASS — dos lotes contiguos, valores existentes preservados y columnas separadas intactas");
