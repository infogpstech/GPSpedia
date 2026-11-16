import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");

function extractFunction(source, name) {
    const match = source.match(new RegExp("function " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}"));
    assert.ok(match, "No se encontró " + name);
    return match[0];
}
const mutation = new Function(extractFunction(admin, "isSharedMutationAction_") +
    "\nreturn isSharedMutationAction_;")();
const read = new Function(extractFunction(admin, "isSharedReadAction_") +
    "\nreturn isSharedReadAction_;")();
const policy = new Function(coordinator + "\nreturn coordinatorPolicy_;")();

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
assert.match(ui, /routeActionWithRetry\('auditDriveImagesInCortes'[\s\S]*?timeoutMs:\s*cursor\s*\?\s*45000\s*:\s*120000/,
    "La captura inicial de referencias necesita hasta 120 s; las páginas con cursor conservan timeout y reintentos acotados.");

const inventory = policy("ADMIN", "getReplacedImages");
for (const resource of ["USERS", "CORTES", "DRIVE", "IMAGE_INVENTORY", "RELAY"]) {
    assert.ok(inventory.readResources.includes(resource), "Inventario debe reservar lectura de " + resource);
}
assert.ok(inventory.readResources.includes("SESSION_CONTEXTS"));
assert.ok(!inventory.writeResources.includes("ACTIVE_SESSIONS"),
    "Inventario no debe escribir LastActivityAt en cada lectura.");
const scan = policy("ADMIN", "auditDriveImagesInCortes");
for (const resource of ["CORTES", "DRIVE", "IMAGE_INVENTORY", "RELAY"]) {
    assert.ok(scan.readResources.includes(resource), "Escáner debe reservar lectura de " + resource);
}
assert.ok(scan.readResources.includes("SESSION_CONTEXTS"));
assert.ok(!scan.writeResources.includes("ACTIVE_SESSIONS"));
assert.ok(scan.writeResources.includes("IMAGE_AUDIT_STATE"),
    "El estado del escáner debe serializarse sin bloquear las lecturas del inventario.");
const migration = policy("ADMIN", "migrateReplacedImagesSchema");
assert.deepEqual(migration.readResources, ["USERS", "SESSION_CONTEXTS"]);
assert.deepEqual(migration.writeResources, ["IMAGE_INVENTORY"]);
assert.ok(!migration.writeResources.includes("ACTIVE_SESSIONS"),
    "La inicialización no debe modificar la actividad de sesión.");
assert.equal(migration.maintenance, false);

// Toda mutación declarada por ADMIN debe tener una política explícita.
// Evita que el router adquiera una lease cuyo par servicio/operación no exista.
const adminMutationList = extractFunction(admin, "isSharedMutationAction_");
const mutationNames = [...adminMutationList.matchAll(/"([^"]+)"/g)].map(match => match[1]);
for (const action of mutationNames) {
    const entry = policy("ADMIN", action);
    assert.ok(entry, "Falta política explícita para ADMIN/" + action);
}
assert.equal(policy("ADMIN", "markReplacedImageInUse").writeResources.includes("IMAGE_INVENTORY"), true);
assert.equal(policy("ADMIN", "applyCortesImageReconciliation").writeResources.includes("CORTES"), true);
assert.equal(policy("ADMIN", "freezeIdentifierFormulas").maintenance, true);

// Toda lectura ADMIN que solicita lease dedicada debe tener una política.
for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders", "auditIdentifiers", "checkOperation", "getAdminImageUploadStatus", "previewCortesImageReconciliation"]) {
    assert.equal(read(action), true, action + " debe usar una lease de lectura.");
    assert.ok(policy("ADMIN", action), "Falta política explícita para ADMIN/" + action);
}
const identifierAudit = policy("ADMIN", "auditIdentifiers");
for (const resource of ["USERS", "CORTES", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"]) {
    assert.ok(identifierAudit.readResources.includes(resource),
        "La auditoría de IDs debe reservar lectura de " + resource);
}
assert.deepEqual(identifierAudit.writeResources, [],
    "La auditoría de identificadores es estrictamente de solo lectura.");

const operationRead = policy("ADMIN", "checkOperation");
assert.ok(operationRead.readResources.includes("CORTES"));
assert.ok(operationRead.readResources.includes("IDEMPOTENCIA"));
const uploadStatus = policy("ADMIN", "getAdminImageUploadStatus");
assert.ok(uploadStatus.readResources.includes("CORTES"));
assert.ok(uploadStatus.readResources.includes("DRIVE"));
assert.ok(uploadStatus.writeResources.includes("IMAGE_UPLOAD_LEDGER"),
    "La consulta puede inicializar el ledger de imágenes y debe reservar su escritura.");
const reconciliationPreview = policy("ADMIN", "previewCortesImageReconciliation");
for (const resource of ["CORTES", "DRIVE", "IMAGE_INVENTORY", "IMAGE_AUDIT_STATE", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY"]) {
    assert.ok(reconciliationPreview.readResources.includes(resource),
        "La vista previa debe reservar lectura de " + resource);
}


// Toda mutación declarada por FEEDBACK debe tener política explícita en Coordinator.
const feedbackMutationList = extractFunction(feedback, "isSharedMutationAction_");
const feedbackMutationNames = [...feedbackMutationList.matchAll(/"([^"]+)"/g)].map(match => match[1]);
for (const action of feedbackMutationNames) {
    assert.ok(policy("FEEDBACK", action), "Falta política explícita para FEEDBACK/" + action);
}
const driveAlert = policy("FEEDBACK", "notifyDevelopersDriveCritical");
assert.ok(driveAlert.readResources.includes("USERS"),
    "La alerta de Drive consulta los destinatarios en USERS.");
assert.ok(driveAlert.writeResources.includes("FEEDBACK"),
    "La alerta de Drive crea conversaciones y mensajes en FEEDBACK.");

const feedbackRouterHarness = new Function(
    extractFunction(feedback, "isSharedMutationAction_") + "\n" +
    extractFunction(feedback, "doPost") + "\n" +
    `
    const calls = [];
    function withSharedMutationLease_(service, operation, callback) {
        calls.push({ service, operation });
        return callback("coordinated-token", { userId: "developer", role: "Desarrollador" });
    }
    function withSharedSessionActor_(event, actor) { return event; }
    function doPostInternal_(event) { return JSON.parse(event.postData.contents); }
    const ContentService = { createTextOutput: value => ({ value, setMimeType() { return this; } }), MimeType: { TEXT: "text/plain" } };
    return {
        calls,
        send(action) {
            calls.length = 0;
            const event = { postData: { contents: JSON.stringify({ action, payload: { sessionToken: "test-session" } }) } };
            return { result: doPost(event), calls: calls.slice() };
        }
    };
    `
)();
const driveAlertRoute = feedbackRouterHarness.send("notifyDevelopersDriveCritical");
assert.equal(driveAlertRoute.calls.length, 1);
assert.equal(driveAlertRoute.calls[0].service, "FEEDBACK");
assert.equal(driveAlertRoute.calls[0].operation, "notifyDevelopersDriveCritical");



const routerHarness = new Function(
    extractFunction(admin, "isSharedMutationAction_") + "\n" +
    extractFunction(admin, "isSharedReadAction_") + "\n" +
    extractFunction(admin, "doPost") + "\n" +
    `
    const calls = [];
    function withSharedMutationLease_(service, operation, callback) {
        calls.push({ service, operation });
        return callback("coordinated-token", { userId: "test-user", role: "Desarrollador", epoch: 1 });
    }
    function withSharedSessionActor_(event, actor) { return event; }
    function doPostInternal_(event) { return JSON.parse(event.postData.contents); }
    const ContentService = { createTextOutput: value => ({ value, setMimeType() { return this; } }), MimeType: { TEXT: "text/plain" } };
    return {
        calls,
        send(action) {
            calls.length = 0;
            const event = { postData: { contents: JSON.stringify({ action, payload: { userId: "test-user" } }) } };
            return { result: doPost(event), calls: calls.slice() };
        }
    };
    `
)();
for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders", "auditIdentifiers"]) {
    const routed = routerHarness.send(action);
    assert.equal(routed.calls.length, 1);
    assert.equal(routed.calls[0].service, "ADMIN");
    assert.equal(routed.calls[0].operation, action,
        action + " debe adquirir su lease específica y no ADMIN/sessionActivity.");
}
for (const action of ["auditDriveImagesInCortes", "migrateReplacedImagesSchema"]) {
    const routed = routerHarness.send(action);
    assert.equal(routed.calls.length, 1);
    assert.equal(routed.calls[0].operation, action);
    assert.equal(routed.result.payload.__sharedMutationToken, "coordinated-token");
}
const fallback = routerHarness.send("unknownAdminAction");
assert.equal(fallback.calls[0].operation, "sessionActivity",
    "Las acciones heredadas deben conservar la protección de sesión por defecto.");
const ping = routerHarness.send("ping");
assert.equal(ping.calls.length, 0, "ping no debe reservar una lease de escritura.");


const adminCaseNames = [...admin.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(match => match[1]);
for (const action of adminCaseNames) {
    assert.ok(action === "ping" || mutation(action) || read(action),
        "La acción ADMIN/" + action + " no está clasificada en el dispatcher compartido.");
}
console.log("AdminImageScanCoordinatorContract: 1/1 PASS");
