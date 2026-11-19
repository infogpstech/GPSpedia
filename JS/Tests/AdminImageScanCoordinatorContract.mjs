import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");

function extractFunction(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    const end = next >= 0 ? next : source.length;
    const block = source.slice(start, end);
    const close = block.lastIndexOf("\n}");
    assert.ok(close >= 0, "No se encontró el cierre de " + name);
    return block.slice(0, close + 2);
}
const mutation = new Function(extractFunction(admin, "isSharedMutationAction_") +
    "\nreturn isSharedMutationAction_;")();
const policy = new Function(coordinator + "\nreturn coordinatorPolicy_;")();

for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders",
    "auditIdentifiers", "getAdminImageUploadStatus", "previewCortesImageReconciliation",
    "previewCortesImageOrganizer"]) {
    assert.equal(mutation(action), false, action + " es una lectura/preview y no debe auditarse como mutación.");
}
assert.equal(mutation("auditDriveImagesInCortes"), true,
    "El escáner conserva auditoría administrativa porque persiste estado.");
assert.equal(mutation("migrateReplacedImagesSchema"), true);
assert.equal(mutation("backupDatabase"), true);
assert.equal(mutation("createSheet"), true);

const router = admin.slice(admin.indexOf("function doPost(e)"), admin.indexOf("const ADMIN_AUDIT_PROPERTY_PREFIX_"));
assert.ok(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "ADMIN" })'));
assert.ok(!router.includes("withSharedMutationLease_"),
    "Ninguna lectura o mutación ADMIN debe adquirir leases por acción.");
assert.ok(!admin.includes("withSharedMutationLease_"));
assert.ok(admin.includes("function assertDeveloperSession(payload)"));
assert.ok(admin.includes("function assertModalEditSession(payload)"));
const internal = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.ok(internal.includes("assertDeveloperSession(payload)"),
    "Las operaciones ADMIN conservan autorización de Desarrollador.");
assert.ok(internal.includes("beginAdminAuditEvent_(action, payload, developerContext, startTime)"),
    "Las mutaciones ADMIN conservan auditoría persistente.");
assert.ok(internal.includes("if (action !== \"ping\" && isSharedMutationAction_(action))"));

const policyStart = coordinator.indexOf("function coordinatorPolicy_");
const adminStart = coordinator.indexOf("ADMIN: {", policyStart);
const adminEnd = coordinator.indexOf("FEEDBACK: {", adminStart);
const adminPolicy = coordinator.slice(adminStart, adminEnd);
assert.match(adminPolicy, /getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);
assert.doesNotMatch(adminPolicy, /sessionActivity|nestedActions|backupDatabase|auditDriveImagesInCortes|migrateIdentifiers/);
assert.equal(policy("ADMIN", "getServiceTraffic").readResources.includes("SERVICE_TRAFFIC"), true);
for (const action of ["backupDatabase", "auditDriveImagesInCortes", "getReplacedImages", "previewCortesImageOrganizer"]) {
    assert.equal(policy("ADMIN", action), null,
        action + " no debe conservar una política de lease en Coordinator.");
}

assert.match(ui, /routeActionWithRetry\('auditDriveImagesInCortes'[\s\S]*?timeoutMs:\s*cursor\s*\?\s*45000\s*:\s*120000/);
const historyHandler = extractFunction(admin, "handleGetReplacedImages");
assert.match(historyHandler, /collectActiveDriveReferences\(false\)/);
assert.match(historyHandler, /active_reference_count:\s*Array\.isArray\(activeReferences\)\s*\?\s*activeReferences\.length\s*:\s*activeReferences\s*\?\s*1\s*:\s*0/);
assert.match(ui, /routeActionWithRetry\(['"]getReplacedImages['"][\s\S]*?timeoutMs:\s*120000,\s*maxAttempts:\s*2/);

console.log("AdminImageScanCoordinatorContract: 1/1 PASS — lecturas y mutaciones sin leases; RBAC y auditoría ADMIN preservados");
