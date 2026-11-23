import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinatorSource = read("../Services/Coordinator.js");
const feedbackSource = read("../Services/feedback.js");
const writeSource = read("../Services/write.js");
const adminSource = read("../Services/admin.js");
const apiSource = read("../Frontend/api-config.js");
const clientSource = read("../Services/SharedMutationClient.js");
const centralConfigSource = read("../Frontend/centralConfigurationCache.js");
const telemetrySource = read("../Frontend/serviceTelemetry.js");
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }
const propertiesStore = {};
let catalogPropertyGetCount = 0;
const properties = {
    getProperty: key => {
        if (key === "GPSpedia_CATALOG_CHANGE_REVISION" || String(key).startsWith("GPSpedia_CATALOG_CHANGE_EVENT_")) catalogPropertyGetCount++;
        return Object.prototype.hasOwnProperty.call(propertiesStore, key) ? propertiesStore[key] : null;
    },
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
test("el navegador consulta directamente el feed público de Coordinator desde el registro central", () => {
    assert.doesNotMatch(feedbackSource,/catalogFeed=1|getSharedCatalogChanges_\(/);
    assert.doesNotMatch(feedbackSource,/isFeedbackCoordinatorConfigured_|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/);
    assert.match(apiSource,/getConfiguredServiceEndpoint_\("COORDINATOR"\)/);
    assert.match(apiSource,/service: "COORDINATOR"[\s\S]*?action: "getCatalogChanges"/);
    assert.doesNotMatch(apiSource,/'getCatalogChanges': 'FEEDBACK'/);
    assert.match(coordinatorSource,/function doGet\(e\)/);
    assert.match(centralConfigSource,/OPTIONAL_SERVICES = \["COORDINATOR"\]/);
    assert.match(telemetrySource,/"COORDINATOR"/);
});
test("ADMIN agrupa los cambios de catálogo y el cliente agrega requestId para reintentos", () => {
    assert.match(adminSource,/for \(let offset = 0; offset < versionedChanges\.length; offset \+= 50\)[\s\S]*?publishSharedCatalogChanges_/);
    assert.match(clientSource,/action === "publishCatalogChanges"[\s\S]*?uuid\(\)/);
    assert.match(clientSource,/function publishCatalogChanges\(service, operation, changes\)/);
    assert.match(coordinatorSource,/function publishCatalogChanges_\(service, operation, payload\)/);
    assert.match(coordinatorSource,/sourceRequestId/);
    assert.match(coordinatorSource,/recoveredPartial/);
});
test("publicación idempotente y lectura incremental usan snapshot sin getProperty por evento", () => {
    catalogPropertyGetCount = 0;
    const payload = { requestId:"CATALOG-SNAPSHOT-0001", change:{collection:"relay",recordId:"RELAY-1",operation:"delete"} };
    const first = request("publishCatalogChange","ADMIN","restoreDatabase",payload);
    assert.equal(first.status,"success");
    const retry = request("publishCatalogChange","ADMIN","restoreDatabase",payload);
    assert.equal(retry.duplicate,true);
    assert.equal(retry.revision,first.revision);
    assert.equal(catalogPropertyGetCount,0,
        "El preflight idempotente debe buscar requestId en el snapshot de propiedades, no consultar cada evento por separado.");
    catalogPropertyGetCount = 0;
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:first.revision-1,limit:5});
    assert.equal(page.changes.length,1);
    assert.equal(page.changes[0].revision,first.revision);
    assert.equal(catalogPropertyGetCount,0,
        "La página incremental debe leer los eventos desde el snapshot, no con getProperty por revisión.");
});
test("el navegador consume el feed público por GET directo a Coordinator", () => {
    const feedClient = apiSource.slice(apiSource.indexOf("export async function getCatalogChanges"));
    assert.ok(feedClient.includes('method: "GET"'));
    assert.ok(feedClient.includes("catalogFeed=1"));
    assert.ok(feedClient.includes('getConfiguredServiceEndpoint_("COORDINATOR")'));
    assert.ok(!feedbackSource.includes('if (String(parameters.catalogFeed || "") === "1")'));
    assert.ok(!feedbackSource.includes("getSharedCatalogChanges_(cursor, limit)"));
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
test("recordLike invalida CATALOG desde ledger append-only sin lock de versión", () => {
    assert.match(feedbackSource,/case 'recordLike':\s*response = handleRecordLike\(payload\)/);
    assert.match(feedbackSource,/if \(action === "recordLike"[\s\S]*?response\.status === "success"[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", "recordLike", \{ operation: "reset" \}\)/);
    assert.ok(feedbackSource.includes("function buildFeedbackCortesCatalogChange_(reference)"));
    assert.ok(feedbackSource.includes("function getFeedbackCortesColumnMap_(sheet)"));
    assert.ok(feedbackSource.includes("normalizeFeedbackCatalogImageId_"));
    assert.ok(feedbackSource.includes("normalizeFeedbackCatalogYouTubeUrl_"));
    assert.ok(!feedbackSource.includes("mapRowToObject(row, COLS_CORTES)"));
    const publisherStart=feedbackSource.indexOf("function publishFeedbackCatalogChange_");
    const publisherEnd=feedbackSource.indexOf("\nfunction publishFeedbackCortesCatalogChange_",publisherStart);
    const publisher=feedbackSource.slice(publisherStart,publisherEnd);
    assert.match(publisher,/sourceVersion:\s*Math\.max\(1, Date\.now\(\)\)/);
    assert.doesNotMatch(publisher,/LockService|PropertiesService|acquireFeedbackScriptLock_|tryLock|waitLock|releaseLock/);
    assert.match(feedbackSource,/function publishFeedbackCortesCatalogChange_\(action, reference\)[\s\S]*?publishFeedbackCatalogChange_\(action, \(\) => buildFeedbackCortesCatalogChange_\(reference\)\)/);
});
test("altas y ediciones de Tutoriales publican upsert exacto tras verificar fila e ID", () => {
    assert.match(feedbackSource,/function buildTutorialCatalogChange_\(reference\)[\s\S]*?findTutorialRow_\(sheet, reference, true\)[\s\S]*?collection: "tutoriales"[\s\S]*?operation: "upsert"/);
    assert.match(feedbackSource,/if \(action === "addTutorial" \|\| action === "updateTutorialItem"\)[\s\S]*?publishTutorialCatalogChange_\(action, tutorialId\)/);
    assert.match(feedbackSource,/function publishTutorialCatalogChange_\(action, reference\)[\s\S]*?publishFeedbackCatalogChange_\(action, \(\) => buildTutorialCatalogChange_\(reference\)\)/);
    assert.match(feedbackSource,/if \(!\/\^tut-/);
    assert.match(feedbackSource,/publishSharedCatalogChange_\("FEEDBACK", action, \{ operation: "reset" \}\)/);
});
test("alta ADMIN de Logo publica upsert exacto tras verificar la fila persistida", () => {
    assert.match(adminSource,/function buildLogoCatalogChange_\(logoId, logoUrl, brandName\)[\s\S]*?matches\.length !== 1[\s\S]*?collection: "logos"[\s\S]*?operation: "upsert"/);
    assert.match(adminSource,/catalogAction === "addLogo"[\s\S]*?buildLogoCatalogChange_\(response\.logoId, response\.logoUrl, payload && payload\.nombreMarca\)[\s\S]*?publishSharedCatalogChange_\("ADMIN", catalogAction, change\)/);
    assert.match(adminSource,/publishSharedCatalogChange_\("ADMIN", catalogAction, \{ operation: "reset" \}\)/);
});
test("WRITE delega la publicación del catálogo al frontend y elimina la llamada interservicio", () => {
    assert.equal(writeSource.includes("publishSharedCatalogChange_"), false);
    assert.equal(writeSource.includes("publishCortesCatalogChange_"), false);
    assert.equal(writeSource.includes('properties.getProperty("GPSpedia_COORDINATOR_SECRET")'), false);
    assert.ok(apiSource.includes("'publishCatalogReset': 'COORDINATOR'"));
    assert.match(apiSource,/WRITE_CATALOG_RESET_ACTIONS_/);
    assert.match(apiSource,/publishCatalogResetAfterMutation_/);
    assert.match(apiSource,/routeActionInternal_\("publishCatalogReset"/);
    assert.match(coordinatorSource,/function publishCatalogResetFromBrowser_/);
    assert.match(coordinatorSource,/request\.action === "publishCatalogReset"/);
    assert.match(coordinatorSource,/publishCatalogChange_\(service, operation/);
    assert.match(coordinatorSource,/change:\s*\{\s*operation:\s*"reset"\s*\}/);
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
    assert.ok(adminSource.includes('publishSharedCatalogChanges_("ADMIN", action, versionedChanges.slice(offset, offset + 50))'));
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
test("approveVideo/rejectVideo no orquestan Coordinator desde FEEDBACK; CATALOG se refresca en frontend", () => {
    assert.ok(feedbackSource.includes("contentType: videoData.contentType"));
    assert.ok(feedbackSource.includes("referenceId: videoData.referenceId"));
    assert.ok(feedbackSource.includes("contentType: savedPayload.contentType"));
    assert.ok(feedbackSource.includes("function handleApproveVideo(payload)"));
    assert.ok(!feedbackSource.includes('publishFeedbackCortesCatalogChange_(action, referenceId)'));
    assert.ok(!feedbackSource.includes('publishPysCatalogChange_(action, referenceId)'));
    assert.ok(!feedbackSource.includes('publishTutorialCatalogChange_(action, referenceId)'));
    assert.ok(apiSource.includes("refreshCatalogAfterVideoApproval_"));
    assert.ok(apiSource.includes('routeAction("getCatalogData", { forceRefresh: true })'));
});
test("suggestYear publica Cortes solo cuando se aplica o recupera una ampliación confirmada", () => {
    assert.ok(feedbackSource.includes('action === "suggestYear" && response &&'));
    assert.ok(feedbackSource.includes('(response.recovered === false || response.recovered === true)'));
    assert.ok(feedbackSource.includes('publishFeedbackCortesCatalogChange_(action, vehicleId)'));
    assert.ok(!feedbackSource.includes('["suggestYear", "addProblem", "addSolution"'));
    assert.ok(coordinatorSource.includes('"suggestYear"'));
});
test("mutaciones PyS publican upsert exacto sin leases por acción", () => {
    assert.ok(coordinatorSource.includes('const CATALOG_CHANGE_COLLECTIONS_ = new Set(["cortes", "pys"'));
    assert.ok(feedbackSource.includes("function buildPysCatalogChange_(reference)"));
    assert.ok(feedbackSource.includes('collection: "pys", recordId: id, operation: "upsert"'));
    assert.ok(feedbackSource.includes("function publishPysCatalogChange_(action, reference)"));
    assert.ok(feedbackSource.includes('publishPysCatalogChange_(action, problemId)'));
    assert.ok(!feedbackSource.includes("function withPysMutationLease_"));
    for (const action of ["addSolution","addPrevention","addVehicleToProblem","removeVehicleFromProblem"]) {
        assert.ok(!feedbackSource.includes('withPysMutationLease_(() =>'));
        assert.ok(coordinatorSource.includes(action));
    }
});
test("WRITE coordina reset desde frontend y FEEDBACK/ADMIN conservan su publicación", () => {
    assert.equal(writeSource.includes("publishSharedCatalogChange_"), false);
    assert.equal(writeSource.includes("publishCortesCatalogChange_"), false);
    assert.ok(apiSource.includes("'publishCatalogReset': 'COORDINATOR'"));
    assert.ok(apiSource.includes("WRITE_CATALOG_RESET_ACTIONS_"));
    assert.ok(apiSource.includes("publishCatalogResetAfterMutation_"));
    assert.ok(coordinatorSource.includes("publishCatalogResetFromBrowser_"));
    assert.ok(feedbackSource.includes("publishPysCatalogChange_(action, problemId)"));
    assert.ok(feedbackSource.includes("publishTutorialCatalogChange_(action, tutorialId)"));
    assert.ok(feedbackSource.includes('publishSharedCatalogChange_("FEEDBACK", action, { operation: "reset" })'));
    assert.ok(feedbackSource.includes('publishSharedCatalogChange_("FEEDBACK", "recordLike", { operation: "reset" })'));
    assert.ok(feedbackSource.includes("function buildFeedbackCortesCatalogChange_(reference)"));
    assert.match(adminSource,/catalogWriters\.includes\(catalogAction\)[\s\S]*?publishSharedCatalogChange_\("ADMIN", catalogAction, \{ operation: "reset" \}\)/);
    assert.match(adminSource,/finalizeAdminAuditEvent_\(auditEvent[\s\S]*?publishSharedCatalogChange_/);
});
test("FEEDBACK usa versiones de origen para evitar snapshots fuera de orden", () => {
    const first = request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"cortes",recordId:"V-FEEDBACK",operation:"upsert",snapshot:{id:"V-FEEDBACK",utilCorte1:1},sourceVersion:1}});
    const latest = request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"cortes",recordId:"V-FEEDBACK",operation:"upsert",snapshot:{id:"V-FEEDBACK",utilCorte1:3},sourceVersion:3}});
    const stale = request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"cortes",recordId:"V-FEEDBACK",operation:"upsert",snapshot:{id:"V-FEEDBACK",utilCorte1:2},sourceVersion:2}});
    assert.equal(first.resetRequired,false);
    assert.equal(latest.resetRequired,false);
    assert.equal(stale.resetRequired,true);
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:stale.revision-1,limit:1});
    assert.equal(page.changes[0].operation,"reset");
    assert.equal(page.changes[0].staleSourceVersion,true);
});
test("FEEDBACK legacy sin sourceVersion se convierte en reset y no publica snapshot potencialmente atrasado", () => {
    const head = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:Number.MAX_SAFE_INTEGER,limit:1});
    const result = request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"pys",recordId:"isue-legacy",operation:"upsert",snapshot:{id_problem:"isue-legacy"}}});
    assert.equal(result.resetRequired,true);
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:head.currentRevision,limit:1});
    assert.equal(page.changes[0].operation,"reset");
    assert.equal(page.changes[0].collection,"*");
});
test("sourceVersion FEEDBACK solo se acepta para Cortes, PyS y Tutorial", () => {
    assert.throws(()=>request("publishCatalogChange","FEEDBACK","recordLike",{change:{collection:"logos",recordId:"L-1",operation:"delete",sourceVersion:1}}),/versión de origen/);
});
test("ADMIN usa versiones de origen para Cortes y convierte snapshots legacy en reset", () => {
    const first = request("publishCatalogChange","ADMIN","updateVehicleField",{change:{collection:"cortes",recordId:"V-ADMIN",operation:"upsert",snapshot:{id:"V-ADMIN",marca:"A"},sourceVersion:1}});
    const latest = request("publishCatalogChange","ADMIN","updateVehicleField",{change:{collection:"cortes",recordId:"V-ADMIN",operation:"upsert",snapshot:{id:"V-ADMIN",marca:"C"},sourceVersion:3}});
    const stale = request("publishCatalogChange","ADMIN","updateVehicleField",{change:{collection:"cortes",recordId:"V-ADMIN",operation:"upsert",snapshot:{id:"V-ADMIN",marca:"B"},sourceVersion:2}});
    assert.equal(first.resetRequired,false);
    assert.equal(latest.resetRequired,false);
    assert.equal(stale.resetRequired,true);
    const page = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:stale.revision-1,limit:1});
    assert.equal(page.changes[0].operation,"reset");
    assert.equal(page.changes[0].staleSourceVersion,true);

    const head = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:Number.MAX_SAFE_INTEGER,limit:1});
    const legacy = request("publishCatalogChange","ADMIN","updateVehicleField",{change:{collection:"cortes",recordId:"V-LEGACY",operation:"delete"}});
    assert.equal(legacy.resetRequired,true);
    const legacyPage = request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:head.currentRevision,limit:1});
    assert.equal(legacyPage.changes[0].operation,"reset");
});
test("sourceVersion ADMIN solo se acepta para la colección Cortes", () => {
    assert.throws(()=>request("publishCatalogChange","ADMIN","addLogo",{change:{collection:"logos",recordId:"L-1",operation:"upsert",snapshot:{id:"L-1"},sourceVersion:1}}),/versión de origen/);
});
test("WRITE publica reset desde navegador con sesión y sin secreto compartido", () => {
    const userId = "USER-WRITE-BROWSER";
    const token = "SESSION-WRITE-BROWSER-123456789";
    const key = "GPSpedia_AUTH_CONTEXT_V1_" + encodeURIComponent(userId);
    properties.setProperty(key, JSON.stringify({
        schemaVersion: 1, userId, epoch: 1, revokedBefore: 0,
        sessions: [{ token, role: "tecnico", fullName: "Técnico", createdAt: clock - 1000, lastActivityAt: clock }]
    }));
    properties.deleteProperty("GPSpedia_COORDINATOR_SECRET_WRITE");
    const payload = {
        userId, sessionToken: token, service: "WRITE", operation: "addOrUpdateCut",
        requestId: "write-addOrUpdateCut-OP-12345678"
    };
    const first = coordinator.publishCatalogResetFromBrowser(payload);
    assert.equal(first.status, "success");
    assert.equal(first.resetRequired, false);
    const retry = coordinator.publishCatalogResetFromBrowser(payload);
    assert.equal(retry.duplicate, true);
    assert.equal(retry.revision, first.revision);
    const page = coordinator.getPublicCatalogChanges({ cursor: first.revision - 1, limit: 1 });
    assert.equal(page.changes.length, 1);
    assert.equal(page.changes[0].operation, "reset");
    assert.equal(page.changes[0].collection, "*");
    assert.throws(() => coordinator.publishCatalogResetFromBrowser({
        ...payload, operation: "unknownAction", requestId: "write-unknown-OP-12345678"
    }), /no está autorizada/);
    assert.throws(() => coordinator.publishCatalogResetFromBrowser({
        ...payload, operation: "freezeCortesIds", requestId: "write-freeze-OP-12345678"
    }), /Solo Desarrollador/);
});
console.log("CatalogChangeFeed: " + passed + "/" + passed + " PASS");
