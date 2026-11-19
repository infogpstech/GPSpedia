import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const handlerStart = source.indexOf("function handleAddOrUpdateCut(");
const handlerEnd = source.indexOf("\nfunction ", handlerStart + 10);
const handler = source.slice(handlerStart, handlerEnd > 0 ? handlerEnd : source.length);
const recoveryStart = handler.indexOf("const imageRepairNeeds");
const recoveryEnd = handler.indexOf("if (recoveredVinCollection)", recoveryStart);
assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart, "No se encontró el bloque de recuperación");
const recovery = handler.slice(recoveryStart, recoveryEnd);
assert.match(recovery, /verified\.rowValues\[COLS_CORTES\.imagenVehiculo - 1\]\s*=\s*images\.vehicleImageUrl/);
assert.match(recovery, /verified\.rowValues\[COLS_CORTES\[`imgCorte\$\{slotIndex\}`\] - 1\]\s*=\s*images\.cutImageUrl/);
assert.match(recovery, /rowValues\[COLS_CORTES\.imagenVehiculo - 1\],\s*rowValues\[COLS_CORTES\["imgCorte" \+ slotIndex\] - 1\]/);
assert.doesNotMatch(recovery, /getRange\(rowIndex, COLS_CORTES\.imagenVehiculo\)\.getValue\(\)/);
assert.doesNotMatch(recovery, /getRange\(rowIndex, COLS_CORTES\["imgCorte" \+ slotIndex\]\)\.getValue\(\)/);

const columnsMatch = source.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch, "No se encontró COLS_CORTES");
const columns = new Function("return ({" + columnsMatch[1] + "});")();
const callbackStart = recovery.indexOf("function(images) {");
const callbackEnd = recovery.indexOf("}, operationHash);", callbackStart);
assert.ok(callbackStart >= 0 && callbackEnd > callbackStart, "No se encontró callback de revalidación");
const callbackSource = recovery.slice(callbackStart, callbackEnd + 1);
const callback = new Function("mapRowToObject", "COLS_CORTES", "checkFileIdValid", "sheet",
    "return (" + callbackSource + ");")(
    (values) => ({ imagenVehiculo: values[columns.imagenVehiculo - 1], imgCorte1: values[columns.imgCorte1 - 1] }),
    columns,
    value => typeof value === "string" && value.startsWith("valid:"),
    { getRange: (row, col) => ({ setValue: value => writes.push({ row, col, value }) }) }
);
const writes = [];
const rowValues = Array(48).fill("");
rowValues[columns.imagenVehiculo - 1] = "valid:existing-vehicle";
rowValues[columns.imgCorte1 - 1] = "";
const verified = { rowIndex: 9, rowValues };
const result = callback({ vehicleImageUrl: "new-vehicle-url", cutImageUrl: "new-cut-url" });
assert.equal(result, verified);
assert.equal(rowValues[columns.imagenVehiculo - 1], "valid:existing-vehicle", "Debe preservar la URL válida existente");
assert.equal(rowValues[columns.imgCorte1 - 1], "new-cut-url", "Debe actualizar el snapshot con la URL escrita");
assert.deepEqual(writes, [{ row: 9, col: columns.imgCorte1, value: "new-cut-url" }],
    "Solo debe escribir la imagen faltante y reflejarla en memoria");
console.log("AdminRecoveryImageSnapshotReuse: 7/7 PASS — elimina dos getValue y reutiliza rowValues actualizado");
