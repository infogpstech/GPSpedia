import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const helperStart = source.indexOf("function getAdminRecoveryImageRepairNeeds_");
const helperEnd = source.indexOf("\n}", helperStart) + 2;
assert.ok(helperStart >= 0 && helperEnd > helperStart, "No se encontró el helper de detección de imágenes");
const helperSource = source.slice(helperStart, helperEnd);
const resolveNeeds = new Function("checkFileIdValid", helperSource + "; return getAdminRecoveryImageRepairNeeds_;")(
    value => typeof value === "string" && value.startsWith("valid:")
);
const vehicleData = { imagenVehiculo: "new-vehicle-image" };
const cutData = { imgCorte1: "new-cut-image", tipoCorte1: "Bomba" };
assert.deepEqual(resolveNeeds(vehicleData, cutData, { imagenVehiculo: "valid:vehicle", imgCorte1: "valid:cut" }, 1), { vehicle: false, cut: false });
assert.deepEqual(resolveNeeds(vehicleData, cutData, { imagenVehiculo: "", imgCorte1: "valid:cut" }, 1), { vehicle: true, cut: false });
assert.deepEqual(resolveNeeds(vehicleData, cutData, { imagenVehiculo: "valid:vehicle", imgCorte1: "" }, 1), { vehicle: false, cut: true });
assert.deepEqual(resolveNeeds(vehicleData, cutData, { imagenVehiculo: "", imgCorte1: "" }, 1), { vehicle: true, cut: true });
assert.deepEqual(resolveNeeds(vehicleData, { ...cutData, tipoCorte1: "No recomendado" }, { imagenVehiculo: "valid:vehicle", imgCorte1: "" }, 1), { vehicle: false, cut: false });
assert.deepEqual(resolveNeeds(null, null, {}, 1), { vehicle: false, cut: false });
const handlerStart = source.indexOf("function handleAddOrUpdateCut(");
const handlerEnd = source.indexOf("\nfunction ", handlerStart + 10);
const handler = source.slice(handlerStart, handlerEnd > 0 ? handlerEnd : source.length);
const guard = handler.indexOf("if (imageRepairNeeds.vehicle || imageRepairNeeds.cut)");
const driveCall = handler.indexOf("runAdminContributionDriveWorkOutsideScriptLock_(lock, opId", guard);
assert.ok(guard >= 0 && driveCall > guard);
const recoveryEnd = handler.indexOf("if (recoveredVinCollection)", guard);
const recovery = handler.slice(guard, recoveryEnd);
assert.ok(recoveryEnd > guard, "No se pudo delimitar la ruta de recuperación");
assert.equal(recovery.indexOf("runAdminContributionDriveWorkOutsideScriptLock_(lock, opId", driveCall - guard + 1), -1,
    "La ruta de recuperación debe tener una sola entrada al ciclo Drive");
assert.match(recovery, /repairedImages = runAdminContributionDriveWorkOutsideScriptLock_/);
console.log("AdminRecoveryImageRepairFastPath: 6/6 PASS");
