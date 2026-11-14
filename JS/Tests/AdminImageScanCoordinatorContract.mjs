import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../../Services/Coordinator.js", import.meta.url), "utf8");

function extractFunction(source, name) {
    const match = source.match(new RegExp("function " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}"));
    assert.ok(match, "No se encontró " + name);
    return match[0];
}
const mutation = new Function(extractFunction(admin, "isSharedMutationAction_") +
    "\\nreturn isSharedMutationAction_;")();
const read = new Function(extractFunction(admin, "isSharedReadAction_") +
    "\\nreturn isSharedReadAction_;")();
const policy = new Function(coordinator + "\\nreturn coordinatorPolicy_;")();

for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders"]) {
    assert.equal(read(action), true, action + " debe usar una lease de lectura específica.");
    assert.equal(mutation(action), false, action + " no debe generar auditoría de mutación.");
}
assert.equal(mutation("auditDriveImagesInCortes"), true,
    "El escáner debe mantener auditoría administrativa y lease específica.");
assert.equal(read("auditDriveImagesInCortes"), false);
assert.equal(mutation("migrateReplacedImagesSchema"), true);

const router = admin.slice(admin.indexOf("function doPost(e)"), admin.indexOf("const ADMIN_AUDIT_PROPERTY_PREFIX_"));
assert.ok(router.includes("const operation = isSharedReadAction_(action) ? action : \"sessionActivity\""),
    "El router debe elegir la lease dedicada para las lecturas.");
assert.ok(router.includes('withSharedMutationLease_("ADMIN", operation'),
    "Las consultas deben pasar por el coordinador.");
const internal = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.ok(internal.includes("assertDeveloperSession(payload)"),
    "Las lecturas y mutaciones ADMIN deben conservar autorización de Desarrollador.");

const inventory = policy("ADMIN", "getReplacedImages");
for (const resource of ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY"]) {
    assert.ok(inventory.readResources.includes(resource), "Inventario debe reservar lectura de " + resource);
}
assert.ok(inventory.sharedWriteResources.includes("ACTIVE_SESSIONS"),
    "Inventario debe actualizar actividad de forma cooperativa.");
const scan = policy("ADMIN", "auditDriveImagesInCortes");
for (const resource of ["CORTES", "DRIVE", "IMAGE_INVENTORY"]) {
    assert.ok(scan.readResources.includes(resource), "Escáner debe reservar lectura de " + resource);
}
assert.ok(scan.sharedWriteResources.includes("ACTIVE_SESSIONS"));
assert.ok(scan.writeResources.includes("IMAGE_AUDIT_STATE"),
    "El estado del escáner debe serializarse sin bloquear las lecturas del inventario.");
const migration = policy("ADMIN", "migrateReplacedImagesSchema");
assert.deepEqual(migration.readResources, ["USERS"]);
assert.deepEqual(migration.writeResources, ["IMAGE_INVENTORY"]);
assert.ok(migration.sharedWriteResources.includes("ACTIVE_SESSIONS"),
    "La inicialización debe mantener la escritura de actividad protegida.");
assert.equal(migration.maintenance, false);

console.log("AdminImageScanCoordinatorContract: PASS");
