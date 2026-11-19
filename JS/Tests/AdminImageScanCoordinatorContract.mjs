import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const sharedClient = readFileSync(new URL("../Services/SharedMutationClient.js", import.meta.url), "utf8");
const apiConfig = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

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
assert.equal(mutation("backupDatabase"), true, "El respaldo debe pasar por la lease de mutación ADMIN.");
assert.equal(policy("ADMIN", "backupDatabase").maintenance, true,
    "La creación de respaldo debe reservar mantenimiento exclusivo.");

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

const historyHandler = extractFunction(admin, "handleGetReplacedImages");
assert.match(historyHandler, /collectActiveDriveReferences\(false\)/,
    "El historial solo necesita saber si hay referencias activas; no debe materializar ubicaciones completas.");
assert.match(historyHandler, /active_reference_count:\s*Array\.isArray\(activeReferences\)\s*\?\s*activeReferences\.length\s*:\s*activeReferences\s*\?\s*1\s*:\s*0/,
    "Una referencia activa booleana debe seguir bloqueando acciones destructivas.");
assert.match(ui, /routeActionWithRetry\(['"]getReplacedImages['"][\s\S]*?timeoutMs:\s*120000,\s*maxAttempts:\s*2/,
    "La lectura del historial debe tener timeout acotado y reintento seguro de solo lectura.");
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
assert.equal(policy("ADMIN", "applyCortesImageReconciliation").readResources.includes("DRIVE"), true,
    "La aplicación debe reservar lectura de ACL y archivos Drive.");
assert.equal(policy("ADMIN", "freezeIdentifierFormulas").maintenance, true);

// Toda lectura ADMIN que solicita lease dedicada debe tener una política.
for (const action of ["getReplacedImages", "getDriveStorage", "getCortesImageFolders", "auditIdentifiers", "getAdminImageUploadStatus", "previewCortesImageReconciliation"]) {
    assert.equal(read(action), true, action + " debe usar una lease de lectura.");
    assert.ok(policy("ADMIN", action), "Falta política explícita para ADMIN/" + action);
}
const serviceTrafficRouter = admin.slice(admin.indexOf("function doPost(e)"), admin.indexOf("const ADMIN_AUDIT_PROPERTY_PREFIX_"));
assert.match(serviceTrafficRouter, /if \(action === "getServiceTraffic"\)[\s\S]*?getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken\)/);
const serviceTraffic = policy("ADMIN", "getServiceTraffic");
assert.ok(serviceTraffic.readResources.includes("SERVICE_TRAFFIC"),
    "La consulta agregada conserva su lectura específica de telemetría en Coordinator.");
assert.deepEqual(serviceTraffic.writeResources, []);
assert.equal(read("getServiceTraffic"), false, "ADMIN valida con actor cacheado y no adquiere una lease adicional.");
assert.equal(mutation("getServiceTraffic"), false);

const batchPublisher = extractFunction(admin, "publishAdminCortesCatalogChanges_");
assert.match(batchPublisher, /publishSharedCatalogChanges_\("ADMIN", action, changes\.slice\(offset, offset \+ 50\)\)/);
assert.doesNotMatch(batchPublisher, /changes\.forEach\(change => publishSharedCatalogChange_/);
assert.match(sharedClient, /function publishCatalogChanges\(service, operation, changes\)/);
assert.match(sharedClient, /action === "publishCatalogChanges"[\s\S]*?uuid\(\)/);
assert.match(sharedClient, /function publishSharedCatalogChanges_\(service, operation, changes\)/);
assert.match(coordinator, /if \(action === "publishCatalogChanges"\) return publishCatalogChanges_\(service, operation, payload\)/);
assert.match(coordinator, /changes\.length > 50/);


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


// FEEDBACK ya no reserva recursos Coordinator por cada acción: el rol se consume del actor cacheado.
const feedbackPermissionsStart = feedback.indexOf("const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(");
const feedbackPermissionsEnd = feedback.indexOf("});", feedbackPermissionsStart) + 3;
const feedbackPermissions = feedback.slice(feedbackPermissionsStart, feedbackPermissionsEnd);
assert.ok(feedbackPermissions.includes('notifyDevelopersDriveCritical: ["Desarrollador"]'));
const feedbackRouter = feedback.slice(feedback.indexOf("function doPost(e)"), feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_"));
assert.ok(feedbackRouter.includes("getCachedSharedSessionActor_(payload.userId, payload.sessionToken)"));
assert.ok(!feedbackRouter.includes("withSharedMutationLease_"));
assert.ok(feedback.includes('actions: new Set(["recordLike","reportProblem"'));

const feedbackRouterHarness = new Function(
    extractFunction(feedback, "doPost") + "\n" +
    `
    const actorCalls = [];
    function getCachedSharedSessionActor_(userId, sessionToken) {
        actorCalls.push({userId, sessionToken});
        return {userId, role:"desarrollador", fullName:"Ana", epoch:1};
    }
    function withSharedSessionActor_(event, actor) {
        const request = JSON.parse(event.postData.contents);
        request.payload.__sharedSessionActor = actor;
        event.postData.contents = JSON.stringify(request);
        return event;
    }
    function doPostInternal_(event) { return JSON.parse(event.postData.contents); }
    const FEEDBACK_ACTION_PERMISSIONS = {notifyDevelopersDriveCritical:["Desarrollador"]};
    const FEEDBACK_PUBLIC_ACTIONS = new Set();
    const DIRECT_SERVICE_TRAFFIC_CONFIG_ = {actions:new Set(["notifyDevelopersDriveCritical"])};
    function readDirectServiceTraffic_() { return {status:"unavailable"}; }
    function recordDirectServiceTraffic_() { return false; }
    const ContentService = {createTextOutput:value=>({value,setMimeType(){return this;}}),MimeType:{TEXT:"text/plain"}};
    return {
        actorCalls,
        send(action) {
            actorCalls.length=0;
            const event={postData:{contents:JSON.stringify({action,payload:{userId:"developer",sessionToken:"test-session"}})}};
            return {result:doPost(event),actorCalls:actorCalls.slice()};
        }
    };
    `
)();
const driveAlertRoute = feedbackRouterHarness.send("notifyDevelopersDriveCritical");
assert.deepEqual(driveAlertRoute.actorCalls,[{userId:"developer",sessionToken:"test-session"}]);



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
for (const action of ["auditDriveImagesInCortes", "migrateReplacedImagesSchema", "backupDatabase"]) {
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


assert.match(admin,/function verifyImageReconciliationBackup_\(/);
assert.match(admin,/function classifyCortesImageAcl_\(/);
assert.match(admin,/function findMissingCortesDriveReferences_\(/);
const adminCaseNames = [...admin.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(match => match[1]);
for (const action of adminCaseNames) {
    assert.ok(action === "ping" || action === "getServiceTraffic" || mutation(action) || read(action),
        "La acción ADMIN/" + action + " no está clasificada en el dispatcher compartido.");
}

assert.ok(admin.includes("const visitedFolderPaths = new Map()"),
    "Cada página debe recopilar las rutas de carpetas realmente visitadas.");
assert.ok(admin.includes("visitedFolderPaths.set(String(current.folderId), String(current.path || rootFolder.getName()))"),
    "La consola debe recibir la ruta de cada carpeta procesada.");
assert.ok(admin.includes("foldersVisitedPaths: Array.from(visitedFolderPaths.values())"),
    "La respuesta de ADMIN debe exponer las rutas recorridas para su salida en consola.");

const colsMatch = admin.match(/const COLS_CORTES = (\{[\s\S]*?\n\});/);
assert.ok(colsMatch, "Debe existir el mapa real de columnas de Cortes.");
const actualCortesCols = new Function("return (" + colsMatch[1] + ");")();
const organizerBuilder = new Function(
    "COLS_CORTES",
    [
        extractFunction(admin, "extractDriveFileIds"),
        extractFunction(admin, "normalizeOrganizerSegment_"),
        extractFunction(admin, "normalizeOrganizerFilePart_"),
        extractFunction(admin, "mapCorteTypeToFunctionCode_"),
        extractFunction(admin, "buildCortesImageOrganizerTargets_")
    ].join(String.fromCharCode(10)) + String.fromCharCode(10) + "return buildCortesImageOrganizerTargets_;"
)(actualCortesCols);
const organizerColumnCount = Math.max(...Object.values(actualCortesCols));
const setOrganizerCell = (row, key, value) => { row[actualCortesCols[key] - 1] = value; };
const makeOrganizerRow = () => {
    const row = Array(organizerColumnCount).fill("");
    setOrganizerCell(row,"id","C-1"); setOrganizerCell(row,"categoria","Camión pesado");
    setOrganizerCell(row,"marca","Toyota"); setOrganizerCell(row,"modelo","Hilux");
    setOrganizerCell(row,"versionesAplicables","SRV"); setOrganizerCell(row,"anoDesde",2020);
    setOrganizerCell(row,"anoHasta",2025); setOrganizerCell(row,"tipoEncendido","Llave");
    setOrganizerCell(row,"imagenVehiculo","https://drive.google.com/file/d/AAAAAAAAAAAAAAAAAAAAAA/view");
    setOrganizerCell(row,"tipoCorte1","Ignición"); setOrganizerCell(row,"imgCorte1","https://drive.google.com/file/d/BBBBBBBBBBBBBBBBBBBBBB/view");
    setOrganizerCell(row,"tipoCorte2","Bomba"); setOrganizerCell(row,"imgCorte2","https://drive.google.com/file/d/CCCCCCCCCCCCCCCCCCCCCC/view");
    setOrganizerCell(row,"tipoCorte3","Botón"); setOrganizerCell(row,"imgCorte3","https://drive.google.com/file/d/DDDDDDDDDDDDDDDDDDDDDD/view");
    setOrganizerCell(row,"imgApertura","https://drive.google.com/file/d/EEEEEEEEEEEEEEEEEEEEEE/view");
    setOrganizerCell(row,"imgCableAlimen","https://drive.google.com/file/d/FFFFFFFFFFFFFFFFFFFFFF/view");
    setOrganizerCell(row,"imgCableAlimen2","https://drive.google.com/file/d/GGGGGGGGGGGGGGGGGGGGGG/view");
    setOrganizerCell(row,"imgCableAlimen3","https://drive.google.com/file/d/HHHHHHHHHHHHHHHHHHHHHH/view");
    return row;
};
const organizerFixture = organizerBuilder(
    [Array(organizerColumnCount).fill("header"), makeOrganizerRow()],
    [Array(organizerColumnCount).fill(""), Array(organizerColumnCount).fill("")],
    [["id","marca","urlLogo"],["L-1","Toyota","https://drive.google.com/file/d/IIIIIIIIIIIIIIIIIIIIII/view"]],
    [["id","marca","urlLogo"],["","",""]]
);
assert.equal(organizerFixture.writePerformed, false);
assert.equal(organizerFixture.summary.candidateCount, 9);
assert.equal(organizerFixture.summary.blockedCount, 0);
const mainTarget = organizerFixture.targets.find(target => target.field === "imagenVehiculo");
assert.equal(mainTarget.targetFolderPath, "Cortes/Camion_pesado/Toyota/Hilux/SRV/2020-2025");
assert.equal(mainTarget.targetBaseName, "Hilux_SRV_2020_2025_imagenVehiculo");
assert.equal(organizerFixture.targets.find(target => target.field === "imgCorte1").targetBaseName, "Hilux_SRV_2020_2025_ign1");
assert.equal(organizerFixture.targets.find(target => target.field === "imgCorte2").targetBaseName, "Hilux_SRV_2020_2025_bomba1");
assert.equal(organizerFixture.targets.find(target => target.field === "imgCorte3").targetBaseName, "Hilux_SRV_2020_2025_btn");
const logoTarget = organizerFixture.targets.find(target => target.sheetName === "LogosMarca");
assert.equal(logoTarget.targetFolderPath, "Cortes/Camion_pesado/Toyota");
assert.equal(logoTarget.targetBaseName, "toyota_logo");
const unknownCutRow = makeOrganizerRow(); setOrganizerCell(unknownCutRow,"tipoCorte1","Corte especial no catalogado");
const unknownPlan = organizerBuilder([Array(organizerColumnCount).fill("header"), unknownCutRow], [], [], []);
assert.equal(unknownPlan.targets.find(target => target.field === "imgCorte1").status, "blocked");
const missingYearRow = makeOrganizerRow(); setOrganizerCell(missingYearRow,"anoHasta","");
const missingPlan = organizerBuilder([Array(organizerColumnCount).fill("header"), missingYearRow], [], [], []);
assert.ok(missingPlan.targets.filter(target => target.sheetName === "Cortes").every(target => target.status === "blocked"));
const formulaMatrix = [Array(organizerColumnCount).fill(""), Array(organizerColumnCount).fill("")];
formulaMatrix[1][actualCortesCols.imagenVehiculo - 1] = "=IMAGE(url)";
const formulaPlan = organizerBuilder([Array(organizerColumnCount).fill("header"), makeOrganizerRow()], formulaMatrix, [], []);
assert.ok(formulaPlan.targets.find(target => target.field === "imagenVehiculo").reasons.includes("formula_in_image_cell"));
const duplicateFileRow = makeOrganizerRow();
setOrganizerCell(duplicateFileRow,"imagenVehiculo","https://drive.google.com/file/d/AAAAAAAAAAAAAAAAAAAAAA/view");
setOrganizerCell(duplicateFileRow,"imgCorte1","https://drive.google.com/file/d/AAAAAAAAAAAAAAAAAAAAAA/view");
const duplicateFilePlan = organizerBuilder([Array(organizerColumnCount).fill("header"), duplicateFileRow], [], [], []);
assert.ok(duplicateFilePlan.targets.find(target => target.field === "imagenVehiculo").reasons.includes("shared_drive_file_id_requires_review"));
const ambiguousRows = [Array(organizerColumnCount).fill("header"), makeOrganizerRow(), makeOrganizerRow()];
setOrganizerCell(ambiguousRows[2],"id","C-2"); setOrganizerCell(ambiguousRows[2],"categoria","Autobus");
const ambiguousPlan = organizerBuilder(ambiguousRows, [], [["h","marca","urlLogo"],["l","Toyota","https://drive.google.com/file/d/IIIIIIIIIIIIIIIIIIIIII/view"]], []);
assert.ok(ambiguousPlan.targets.find(target => target.sheetName === "LogosMarca").reasons.includes("brand_has_multiple_categories"));
const builderSource = extractFunction(admin, "buildCortesImageOrganizerTargets_");
assert.ok(!["DriveApp","SpreadsheetApp","setName","moveTo","setTrashed","setValue","appendRow"].some(token => builderSource.includes(token)),
    "El constructor puro no debe ejecutar operaciones de Drive ni Spreadsheet.");

assert.match(apiConfig, /previewCortesImageOrganizer.*ADMIN/);
assert.match(coordinator, /previewCortesImageOrganizer: \{ read: \[\.\.\.identityRead, "CORTES", "DRIVE", "IMAGE_INVENTORY", "IMAGE_AUDIT_STATE", "TUTORIAL", "FEEDBACK", "LOGOS", "RELAY" \] \}/);
assert.match(admin, /previewCortesImageOrganizer/);
assert.match(admin, /case 'previewCortesImageOrganizer'/);
assert.match(admin, /function inspectCortesOrganizerTargetFolderReadOnly_/);
assert.match(admin, /function handlePreviewCortesImageOrganizer_/);
assert.match(admin, /folderPath: item\.folderPath/);
assert.match(admin, /file_moved_since_drive_audit/);
assert.match(admin, /active_reference_location_mismatch/);
assert.match(admin, /loadDriveAuditSeenIds_\(auditId, Number\(auditState\.pageCount\), false\)/);
assert.match(admin, /loadDriveAuditFileMetadata_\(auditId, Number\(auditState\.pageCount\), false\)/);
const organizerPreviewSource = extractFunction(admin, "handlePreviewCortesImageOrganizer_");
assert.ok(!["setName","moveTo","setTrashed","setValue","appendRow","createFolder","setSharing"].some(token => organizerPreviewSource.includes(token)),
    "El endpoint dry-run no debe modificar Drive ni Spreadsheet.");
assert.match(organizerPreviewSource, /writePerformed: false, canApply: false/);

console.log("AdminImageScanCoordinatorContract: 1/1 PASS");
