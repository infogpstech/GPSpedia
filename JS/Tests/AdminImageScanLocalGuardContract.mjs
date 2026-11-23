import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
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

for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders",
    "auditIdentifiers", "getAdminImageUploadStatus", "previewCortesImageReconciliation",
    "previewCortesImageOrganizer"]) {
    assert.equal(mutation(action), false, action + " es lectura/preview y no debe auditarse como mutación.");
}
assert.equal(mutation("auditDriveImagesInCortes"), true, "El escáner conserva auditoría administrativa porque persiste estado.");
assert.equal(mutation("migrateReplacedImagesSchema"), true);
assert.equal(mutation("backupDatabase"), true);
assert.equal(mutation("createSheet"), true);

const router = admin.slice(admin.indexOf("function doPost(e)"), admin.indexOf("const ADMIN_AUDIT_PROPERTY_PREFIX_"));
assert.ok(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "ADMIN" })'));
assert.doesNotMatch(router, /withSharedMutationLease_/);
const auditHandler = extractFunction(admin, "handleAuditDriveImagesInCortes");
assert.match(auditHandler, /withAdminLocalOperationGuard_\("drive-audit:"/,
    "El escáner reserva solo su propio auditId en el guard local.");
const guard = extractFunction(admin, "withAdminLocalOperationGuard_");
assert.match(guard, /lockService\.getScriptLock\(\)/);
assert.match(guard, /tryLock\(0\)/);
assert.match(guard, /PropertiesService\.getScriptProperties\(\)/);
assert.doesNotMatch(guard, /UrlFetchApp|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|withSharedMutationLease_/);
assert.match(admin, /drive-inventory:/);
assert.match(admin, /create-cortes-image-folder:/);
assert.doesNotMatch(admin, /withSharedMutationLease_/);

assert.ok(admin.includes("function assertDeveloperSession(payload)"));
assert.ok(admin.includes("function assertModalEditSession(payload)"));
const internal = admin.slice(admin.indexOf("function doPostInternal_(e)"));
assert.ok(internal.includes("assertDeveloperSession(payload)"));
assert.ok(internal.includes("beginAdminAuditEvent_(action, payload, developerContext, startTime)"));
assert.ok(internal.includes("if (action !== \"ping\" && isSharedMutationAction_(action))"));

assert.equal(existsSync(new URL("../Services/Coordinator.js", import.meta.url)), false,
    "Coordinator ya debe estar retirado después de MIG-025.");
assert.doesNotMatch(ui, /COORDINATOR|getServiceTraffic|globalServiceTraffic/);

assert.match(ui, /routeActionWithRetry\('auditDriveImagesInCortes'[\s\S]*?timeoutMs:\s*cursor\s*\?\s*45000\s*:\s*120000/);
assert.match(ui, /routeActionWithRetry\(['"]getReplacedImages['"][\s\S]*?timeoutMs:\s*120000,\s*maxAttempts:\s*2/);
console.log("AdminImageScanLocalGuardContract: 1/1 PASS — guardas locales, RBAC/auditoría y metadatos preservados");
