import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const start = write.indexOf("function findOrCreateSupplementaryVehicleFolder_(vehicle)");
const end = write.indexOf("\nfunction prepareSupplementaryImageUploads_", start);
assert.ok(start >= 0 && end > start, "No se encontró helper de carpeta suplementaria");
const helper = write.slice(start, end);
assert.match(helper, /return findOrCreateVehicleFolder\(vehicle\)/);
assert.doesNotMatch(helper, /withSharedMutationLease_|LockService|getScriptLock|waitLock|tryLock/);
assert.doesNotMatch(coordinator, /ensureSupplementaryVehicleFolder/);
console.log("WriteSupplementaryFolderNoLease: 4/4 PASS — creación de carpetas sin lease ni espera del Coordinator");
