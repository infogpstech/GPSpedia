import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinatorSource = read("../Services/Coordinator.js");
const feedbackSource = read("../Services/feedback.js");
const writeSource = read("../Services/write.js");
const adminSource = read("../Services/admin.js");
const apiSource = read("../Frontend/api-config.js");
const clientSource = read("../Services/SharedMutationClient.js");
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }
const propertiesStore = {};
const properties = {
    getProperty: key => Object.prototype.hasOwnProperty.call(propertiesStore, key) ? propertiesStore[key] : null,
    setProperty: (key, value) => { propertiesStore[key] = String(value); },
    deleteProperty: key => { delete propertiesStore[key]; },
    getProperties: () => ({ ...propertiesStore })
};
const lock = { tryLock: () => true, releaseLock: () => {} };
const lockService = { getScriptLock: () => lock };
let clock = 1700000000000, sequence = 0;
const uuid = () => "00000000-0000-4000-8000-" + String(++sequence).padStart(12, "0");
for (const service of ["ADMIN","WRITE","FEEDBACK","AUTH","USERS","UTILITIES"]) {
    properties.setProperty("GPSpedia_COORDINATOR_SECRET_" + service, service.repeat(40));
}
const factory = new Function("properties","lockService","now","uuid","sleep",
    coordinatorSource + "\nreturn createSharedMutationCoordinator_;");
const createCoordinator = factory(properties,lockService,()=>clock,uuid,ms=>{clock+=ms;});
const coordinator = createCoordinator({properties,lockService,now:()=>clock,uuid,sleep:ms=>{clock+=ms;}});
function request(action, service, operation, extra = {}, secret = service.repeat(40)) {
    return coordinator.handleRequest({ action, payload: { service, operation, secret, ...extra } });
}
test("publica revisiones monotónicas entre servicios", () => {
    const a = request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-1",operation:"upsert",snapshot:{id:"V-1",modelo:"A"},sourceVersion:1}});
    const b = request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"cortes",recordId:"V-1",operation:"upsert",snapshot:{id:"V-1",utilCorte1:2}}});
    assert.equal(a.revision,1); assert.equal(b.revision,2);
});
test("página por cursor y límite conserva orden", () => {
    const first = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:0,limit:1});
    assert.equal(first.status,"success"); assert.equal(first.changes.length,1);
    assert.equal(first.changes[0].revision,1); assert.equal(first.nextCursor,1); assert.equal(first.hasMore,true);
    const second = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:first.nextCursor,limit:1});
    assert.equal(second.changes.length,1); assert.equal(second.changes[0].revision,2); assert.equal(second.hasMore,false);
});
test("rechaza publicar una acción no autorizada para el servicio", () => {
    assert.throws(()=>request("publishCatalogChange","WRITE","unknownAction",{change:{collection:"cortes",recordId:"1",operation:"delete"}}),/no puede publicar/);
});
test("rechaza colecciones, IDs y snapshots inválidos", () => {
    assert.throws(()=>request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"secrets",recordId:"1",operation:"delete"}}),/colección/);
    assert.throws(()=>request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"",operation:"delete"}}),/ID del registro/);
    assert.throws(()=>request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"1",operation:"upsert",snapshot:[]}}),/snapshot/);
});
test("evento grande se convierte en reset seguro", () => {
    const result = request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-LARGE",operation:"upsert",snapshot:{id:"V-LARGE",description:"x".repeat(6000)},sourceVersion:2}});
    assert.equal(result.resetRequired,true);
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:2,limit:5});
    assert.equal(page.changes[0].operation,"reset"); assert.equal(page.resetRequired,true);
});
test("reset explícito se publica como evento global", () => {
    const result = request("publishCatalogChange","ADMIN","restoreDatabase",{change:{operation:"reset"}});
    assert.equal(result.resetRequired,false);
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:3,limit:5});
    assert.equal(page.changes[0].collection,"*"); assert.equal(page.changes[0].operation,"reset");
});
test("rechaza consultas POST internas del feed desde servicios distintos de FEEDBACK", () => {
    assert.throws(()=>request("getCatalogChanges","WRITE","getCatalogChanges",{cursor:0,limit:5}),/no está habilitada para este origen/);
});
test("rechaza cursor futuro y límites fuera del contrato", () => {
    assert.equal(request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:999,limit:5}).resetRequired,true);
    assert.throws(()=>request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:0,limit:51}),/entre 1 y 50/);
});
test("cursor vencido activa recuperación de snapshot", () => {
    for (let i=0;i<105;i++) request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-"+i,operation:"delete",sourceVersion:i+3}});
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:0,limit:50});
    assert.equal(page.resetRequired,true); assert.equal(page.changes.length,0);
    assert.ok(page.minRevision>1);
});
test("huecos o eventos corruptos obligan a reiniciar el cursor", () => {
    const revisions = Object.keys(propertiesStore).filter(k=>k.startsWith("GPSpedia_CATALOG_CHANGE_EVENT_")).map(k=>Number(k.slice("GPSpedia_CATALOG_CHANGE_EVENT_".length))).sort((a,b)=>a-b);
    const missing = revisions[1];
    properties.deleteProperty("GPSpedia_CATALOG_CHANGE_EVENT_"+missing);
    const cursor = missing - 1;
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor,limit:10});
    assert.equal(page.resetRequired,true);
});
test("se autentica cada solicitud y no permite leer el feed con secreto incorrecto", () => {
    assert.throws(()=>request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:0,limit:5},"bad"),/no autorizado/);
});
test("el feed público no exige actor ni secreto interno de FEEDBACK", () => {
    assert.doesNotMatch(feedbackSource,/getCatalogChanges:\s*null/);
    assert.match(feedbackSource,/const FEEDBACK_PUBLIC_ACTIONS = new Set\(\[[^\]]*getCatalogChanges/);
    assert.match(feedbackSource,/case 'getCatalogChanges':\s*response = handleGetCatalogChanges\(payload\)/);
    assert.doesNotMatch(feedbackSource,/function handleGetCatalogChanges\(payload\)[\s\S]*?getFeedbackActor_\(payload, null\)/);
    assert.match(clientSource,/catalogFeed=1/);
    assert.match(coordinatorSource,/function doGet\(e\)/);
    assert.match(apiSource,/'getCatalogChanges': 'FEEDBACK'/);
});
test("ADMIN agrupa los cambios de catálogo y el cliente agrega requestId para reintentos", () => {
    assert.match(adminSource,/for \(let offset = 0; offset < changes\.length; offset \+= 50\)[\s\S]*?publishSharedCatalogChanges_/);
    assert.match(clientSource,/action === "publishCatalogChanges"[\s\S]*?uuid\(\)/);
    assert.match(clientSource,/function publishCatalogChanges\(service, operation, changes\)/);
    assert.match(coordinatorSource,/function publishCatalogChanges_\(service, operation, payload\)/);
    assert.match(coordinatorSource,/sourceRequestId/);
    assert.match(coordinatorSource,/recoveredPartial/);
});
test("el navegador consume el feed público por GET y evita el POST autenticado", () => {
    const feedClient = apiSource.slice(apiSource.indexOf("export async function getCatalogChanges"));
    assert.ok(feedClient.includes('method: "GET"'));
    assert.ok(feedClient.includes("catalogFeed=1"));
    assert.ok(feedbackSource.includes('if (String(parameters.catalogFeed || "") === "1")'));
    assert.ok(feedbackSource.includes("getSharedCatalogChanges_(cursor, limit)"));
});
test("la lectura pública preserva cursor y límites sin autenticar servicio", () => {
    const headPage = coordinator.getPublicCatalogChanges({cursor:Number.MAX_SAFE_INTEGER,limit:1});
    assert.equal(headPage.status,"success");
    assert.equal(headPage.resetRequired,true);
    request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"PUBLIC-READ-1",operation:"delete",sourceVersion:108}});
    const page = coordinator.getPublicCatalogChanges({cursor:headPage.currentRevision,limit:1});
    assert.equal(page.status,"success");
    assert.equal(page.changes.length,1);
    assert.equal(page.changes[0].recordId,"PUBLIC-READ-1");
    assert.equal(page.nextCursor,headPage.currentRevision+1);
    assert.throws(()=>coordinator.getPublicCatalogChanges({cursor:-1,limit:5}),/cursor/);
    assert.throws(()=>coordinator.getPublicCatalogChanges({cursor:0,limit:51}),/entre 1 y 50/);
});
test("SharedMutationClient usa GET y funciona sin GPSpedia_COORDINATOR_SECRET", () => {
    const clientFactory = new Function("dependencies",clientSource+"\nreturn createSharedMutationClient_(dependencies);");
    const client = clientFactory({
        properties: { getProperty: key => key === "GPSpedia_COORDINATOR_URL" ? "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec" : null },
        uuid,
        logger: () => {},
        fetch: (url,options) => {
            assert.equal(options.method,"get");
            const parsed = new URL(url);
            assert.equal(parsed.searchParams.get("catalogFeed"),"1");
            const data = coordinator.getPublicCatalogChanges({cursor:parsed.searchParams.get("cursor"),limit:parsed.searchParams.get("limit")});
            return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(data)};
        }
    });
    const headPage = coordinator.getPublicCatalogChanges({cursor:Number.MAX_SAFE_INTEGER,limit:1});
    request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"PUBLIC-CLIENT-1",operation:"delete",sourceVersion:109}});
    const page = client.getCatalogChanges(headPage.currentRevision,1);
    assert.equal(page.status,"success");
    assert.equal(page.changes.length,1);
    assert.equal(page.changes[0].recordId,"PUBLIC-CLIENT-1");
});
test("recordLike publica un snapshot completo y ordenado de Cortes sin helpers externos", () => {
    assert.match(feedbackSource,/case 'recordLike':\s*response = handleRecordLike\(payload\)/);
    assert.match(feedbackSource,/if \(action === "recordLike"[\s\S]*?response\.status === "success"[\s\S]*?publishFeedbackCortesCatalogChange_\("recordLike", changedVehicleId\)/);
    assert.ok(feedbackSource.includes("function buildFeedbackCortesCatalogChange_(reference)"));
    assert.ok(feedbackSource.includes("function getFeedbackCortesColumnMap_(sheet)"));
    assert.ok(feedbackSource.includes("normalizeFeedbackCatalogImageId_"));
    assert.ok(feedbackSource.includes("normalizeFeedbackCatalogYouTubeUrl_"));
    assert.ok(!feedbackSource.includes("mapRowToObject(row, COLS_CORTES)"));
    assert.match(feedbackSource,/function publishFeedbackCortesCatalogChange_\(action, reference\)[\s\S]*?getScriptLock\(\)[\s\S]*?acquireFeedbackScriptLock_\(lock\)[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", action, change\)/);
    assert.match(feedbackSource,/catch \(lockError\)[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", action, \{ operation: "reset" \}\)/);
});
test("altas y ediciones de Tutoriales publican upsert exacto tras verificar fila e ID", () => {
    assert.match(feedbackSource,/function buildTutorialCatalogChange_\(reference\)[\s\S]*?findTutorialRow_\(sheet, reference, true\)[\s\S]*?collection: "tutoriales"[\s\S]*?operation: "upsert"/);
    assert.match(feedbackSource,/if \(action === "addTutorial" \|\| action === "updateTutorialItem"\)[\s\S]*?publishTutorialCatalogChange_\(action, tutorialId\)/);
    assert.match(feedbackSource,/function publishTutorialCatalogChange_\(action, reference\)[\s\S]*?getScriptLock\(\)[\s\S]*?acquireFeedbackScriptLock_\(lock\)[\s\S]*?buildTutorialCatalogChange_\(reference\)[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", action, change\)[\s\S]*?finally[\s\S]*?releaseLock\(\)/);
    assert.match(feedbackSource,/catch \(lockError\)[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", action, \{ operation: "reset" \}\)/);
    assert.match(feedbackSource,/if \(!\/\^tut-/);
    assert.match(feedbackSource,/publishSharedCatalogChange_\("FEEDBACK", action, \{ operation: "reset" \}\)/);
});
test("alta ADMIN de Logo publica upsert exacto tras verificar la fila persistida", () => {
    assert.match(adminSource,/function buildLogoCatalogChange_\(logoId, logoUrl, brandName\)[\s\S]*?matches\.length !== 1[\s\S]*?collection: "logos"[\s\S]*?operation: "upsert"/);
    assert.match(adminSource,/catalogAction === "addLogo"[\s\S]*?buildLogoCatalogChange_\(response\.logoId, response\.logoUrl, payload && payload\.nombreMarca\)[\s\S]*?publishSharedCatalogChange_\("ADMIN", catalogAction, change\)/);
    assert.match(adminSource,/publishSharedCatalogChange_\("ADMIN", catalogAction, \{ operation: "reset" \}\)/);
});
test("WRITE publica upsert exacto de Cortes tras releer fila y conserva reset para migración masiva", () => {
    assert.ok(writeSource.includes("function buildCortesCatalogChange_(reference)"));
    assert.ok(writeSource.includes("function publishCortesCatalogChange_(action, reference, sourceVersion)"));
    assert.ok(writeSource.includes('collection: "cortes", recordId: wanted, operation: "upsert"'));
    assert.ok(writeSource.includes('["addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle"].includes(action)'));
    assert.ok(writeSource.includes('publishCortesCatalogChange_(action, vehicleId, response.catalogVersion)'));
    assert.ok(writeSource.includes('publishSharedCatalogChange_("WRITE", action, { operation: "reset" })'));
    assert.ok(writeSource.includes("nextWriteCatalogVersionLocked_"));
    const publisherStart = writeSource.indexOf("function publishCortesCatalogChange_");
    const publisherEnd = writeSource.indexOf("\nfunction runWriteDriveWorkOutsideScriptLock_", publisherStart);
    const publisher = writeSource.slice(publisherStart, publisherEnd);
    assert.ok(publisherEnd > publisherStart);
    assert.doesNotMatch(publisher, /LockService|getScriptLock|waitLock|tryLock/);
});
test("normalizeImages publica solo filas reescritas y usa reset ante respuestas parciales/error", () => {
    assert.ok(adminSource.includes("const changedVehicleIds = new Set()"));
    assert.ok(adminSource.includes("changedVehicleIds.add(changedVehicleId)"));
    assert.ok(adminSource.includes("changedVehicleIds: Array.from(changedVehicleIds)"));
    assert.ok(adminSource.includes("changedRowsWithoutId: changedRowsWithoutId"));
    assert.ok(adminSource.includes("response.changedRowsWithoutId === true"));
    assert.ok(adminSource.includes("publishAdminCortesCatalogChanges_(catalogAction, changedVehicleIds)"));
    assert.ok(adminSource.includes('response.status === "error"'));
});
test("reconciliación confirmada publica un upsert por vehículo único y reserva reset para fallos", () => {
    assert.ok(adminSource.includes('appliedVehicleIds: Array.from(new Set(manifest.map(item => String(item.vehicleId || "").trim()).filter(Boolean)))'));
    assert.ok(adminSource.includes("function publishAdminCortesCatalogChanges_(action, references)"));
    assert.ok(adminSource.includes("publishAdminCortesCatalogChanges_(catalogAction, vehicleIds)"));
    assert.ok(adminSource.includes("const changes = ids.map(id => buildAdminCortesCatalogChange_(id))"));
    assert.ok(adminSource.includes('publishSharedCatalogChanges_("ADMIN", action, changes.slice(offset, offset + 50))'));
    assert.ok(!adminSource.includes('changes.forEach(change => publishSharedCatalogChange_("ADMIN", action, change))'));
    assert.ok(adminSource.includes('publishSharedCatalogChange_("ADMIN", action, { operation: "reset" })'));
});
test("operaciones ADMIN Drive/ledger-only no publican resets; operaciones que reescriben filas conservan reset", () => {
    const start = adminSource.indexOf("const catalogWriters =");
    const end = adminSource.indexOf("];", start) + 2;
    const writers = adminSource.slice(start, end);
    assert.ok(!writers.includes('"organizePrimaryVehicleImages"'));
    assert.ok(!writers.includes('"reconcilePendingImageUploads"'));
    assert.ok(!writers.includes('"restoreAllTrashedImages"'));
    assert.ok(writers.includes('"normalizeImages"'));
    assert.ok(writers.includes('"applyCortesImageReconciliation"'));
    assert.ok(writers.includes('"restoreDatabase"'));
});
test("recuperación de imagen publica delta solo si cambia la fila; operaciones Drive-only no resetean catálogo", () => {
    assert.ok(adminSource.includes("catalogChanged:currentActiveUrl!==urlHistorica"));
    assert.ok(adminSource.includes("response.catalogChanged === true"));
    const start = adminSource.indexOf("const catalogWriters =");
    const end = adminSource.indexOf("];", start) + 2;
    const writers = adminSource.slice(start, end);
    assert.ok(writers.includes('"recoverReplacedImage"'));
    assert.ok(!writers.includes('"deleteReplacedImage"'));
    assert.ok(!writers.includes('"restoreReplacedImageFromTrash"'));
    assert.ok(!writers.includes('"moveReplacedImage"'));
});
test("freezeCortesIds no publica catálogo porque conserva los valores y solo congela fórmulas", () => {
    const start = writeSource.indexOf("const catalogWriters =");
    const end = writeSource.indexOf("];", start) + 2;
    const writers = writeSource.slice(start, end);
    assert.ok(!writers.includes('"freezeCortesIds"'));
    assert.ok(writeSource.includes("formulasAfter[index][0]"));
    assert.ok(writeSource.includes("String(valuesAfter[index][0] ?? \"\") !== String(plan.finalValues[index][0] ?? \"\")"));
});
test("ADMIN ediciones In-Modal publican upsert exacto de Cortes y mantenimiento masivo conserva reset", () => {
    assert.ok(adminSource.includes("function buildAdminCortesCatalogChange_(reference)"));
    assert.ok(adminSource.includes("function publishAdminCortesCatalogChange_(action, reference)"));
    assert.ok(adminSource.includes('["updateVehicleField", "uploadAdminImage"].includes(catalogAction)'));
    assert.ok(adminSource.includes("publishAdminCortesCatalogChange_(catalogAction, vehicleId)"));
    assert.ok(adminSource.includes("findUniqueAdminVehicleRow_"));
    assert.ok(adminSource.includes('publishSharedCatalogChange_("ADMIN", catalogAction, { operation: "reset" })'));
});
test("approveVideo/rejectVideo publican upsert del destino único y conservan reset si no se verifica", () => {
    assert.ok(feedbackSource.includes("contentType: videoData.contentType"));
    assert.ok(feedbackSource.includes("referenceId: videoData.referenceId"));
    assert.ok(feedbackSource.includes("contentType: savedPayload.contentType"));
    assert.ok(feedbackSource.includes('targetType !== contentType'));
    assert.ok(feedbackSource.includes('publishFeedbackCortesCatalogChange_(action, referenceId)'));
    assert.ok(feedbackSource.includes('publishPysCatalogChange_(action, referenceId)'));
    assert.ok(feedbackSource.includes('publishTutorialCatalogChange_(action, referenceId)'));
    assert.ok(feedbackSource.includes('publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" })'));
    assert.ok(!feedbackSource.includes('"addTutorial", "approveVideo", "rejectVideo"].includes(action)'));
});
test("suggestYear publica Cortes solo cuando se aplica o recupera una ampliación confirmada", () => {
    assert.ok(feedbackSource.includes('action === "suggestYear" && response &&'));
    assert.ok(feedbackSource.includes('(response.recovered === false || response.recovered === true)'));
    assert.ok(feedbackSource.includes('publishFeedbackCortesCatalogChange_(action, vehicleId)'));
    assert.ok(!feedbackSource.includes('["suggestYear", "addProblem", "addSolution"'));
    assert.ok(coordinatorSource.includes('"suggestYear"'));
});
test("mutaciones PyS publican upsert exacto tras verificar ID y fila bajo lock", () => {
    assert.ok(coordinatorSource.includes('const CATALOG_CHANGE_COLLECTIONS_ = new Set(["cortes", "pys"'));
    assert.ok(feedbackSource.includes("function buildPysCatalogChange_(reference)"));
    assert.ok(feedbackSource.includes('collection: "pys", recordId: id, operation: "upsert"'));
    assert.ok(feedbackSource.includes("function publishPysCatalogChange_(action, reference)"));
    assert.ok(feedbackSource.includes('publishPysCatalogChange_(action, problemId)'));
});
test("WRITE y FEEDBACK publican deltas exactos y conservan reset para operaciones masivas", () => {
    assert.match(writeSource,/response && response\.status === "success"[\s\S]*?catalogWriters\.includes\(action\)[\s\S]*?publishCortesCatalogChange_\(action, vehicleId, response\.catalogVersion\)/);
    assert.match(writeSource,/\["addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle"\]/);
    assert.ok(writeSource.includes('publishSharedCatalogChange_("WRITE", action, { operation: "reset" })'));
    assert.match(writeSource,/!String\(requestPayload\.__sharedMutationToken \|\| ""\)\.trim\(\)/);
    assert.ok(feedbackSource.includes("publishPysCatalogChange_(action, problemId)"));
    assert.ok(feedbackSource.includes("publishTutorialCatalogChange_(action, tutorialId)"));
    assert.ok(feedbackSource.includes('publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" })'));
    assert.ok(feedbackSource.includes('publishFeedbackCortesCatalogChange_("recordLike", changedVehicleId)'));
    assert.match(adminSource,/catalogWriters\.includes\(catalogAction\)[\s\S]*?publishSharedCatalogChange_\("ADMIN", catalogAction, \{ operation: "reset" \}\)/);
    assert.match(adminSource,/finalizeAdminAuditEvent_\(auditEvent[\s\S]*?publishSharedCatalogChange_/);
});
console.log("CatalogChangeFeed: " + passed + "/" + passed + " PASS");
