import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const coordinatorSource = read("../../Services/Coordinator.js");
const feedbackSource = read("../../Services/feedback.js");
const writeSource = read("../../Services/write.js");
const adminSource = read("../../Services/admin.js");
const apiSource = read("../Frontend/api-config.js");
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
    const a = request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-1",operation:"upsert",snapshot:{id:"V-1",modelo:"A"}}});
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
    const result = request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-LARGE",operation:"upsert",snapshot:{id:"V-LARGE",description:"x".repeat(6000)}}});
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
test("rechaza consultas incrementales desde servicios distintos de FEEDBACK", () => {
    assert.throws(()=>request("getCatalogChanges","WRITE","getCatalogChanges",{cursor:0,limit:5}),/solo está habilitada para FEEDBACK/);
});
test("rechaza cursor futuro y límites fuera del contrato", () => {
    assert.equal(request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:999,limit:5}).resetRequired,true);
    assert.throws(()=>request("getCatalogChanges","FEEDBACK","getCatalogChanges",{cursor:0,limit:51}),/entre 1 y 50/);
});
test("cursor vencido activa recuperación de snapshot", () => {
    for (let i=0;i<105;i++) request("publishCatalogChange","WRITE","addOrUpdateCut",{change:{collection:"cortes",recordId:"V-"+i,operation:"delete"}});
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
test("FEEDBACK expone la lectura autenticada y el cliente enruta al servicio correcto", () => {
    assert.match(feedbackSource,/getCatalogChanges:\s*null/);
    assert.match(feedbackSource,/case 'getCatalogChanges':\s*response = handleGetCatalogChanges\(payload\)/);
    assert.match(feedbackSource,/function handleGetCatalogChanges\(payload\)[\s\S]*?assertFeedbackSession\(payload, null\)/);
    assert.match(apiSource,/'getCatalogChanges': 'FEEDBACK'/);
});
test("recordLike publica el snapshot de Cortes después de confirmar la escritura", () => {
    assert.match(feedbackSource,/case 'recordLike':\s*response = handleRecordLike\(payload\)/);
    assert.match(feedbackSource,/if \(action === "recordLike"[\s\S]*?response\.status === "success"[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", "recordLike"/);
    assert.match(feedbackSource,/mapRowToObject\(row, COLS_CORTES\)/);
    assert.match(feedbackSource,/catch \(catalogPublishError\)[\s\S]*?El like se guardó, pero no se pudo publicar/);
});
test("WRITE y FEEDBACK publican reset solo después de mutaciones confirmadas", () => {
    assert.match(writeSource,/response && response\.status === "success"[\s\S]*?catalogWriters\.includes\(String\(request\.action \|\| ""\)\)[\s\S]*?publishSharedCatalogChange_\("WRITE"/);
    assert.match(writeSource,/\["addOrUpdateCut", "addSupplementaryInfo", "addVinToVehicle", "freezeCortesIds"\]/);
    assert.match(writeSource,/!String\(requestPayload\.__sharedMutationToken \|\| ""\)\.trim\(\)/);
    assert.match(feedbackSource,/response && response\.status === "success"[\s\S]*?\["suggestYear", "addProblem", "addSolution", "addPrevention"[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", action, \{ operation: "reset" \}\)/);
    assert.match(feedbackSource,/if \(action === "recordLike"[\s\S]*?publishSharedCatalogChange_\("FEEDBACK", "recordLike"/);
    assert.match(adminSource,/catalogWriters\.includes\(catalogAction\)[\s\S]*?publishSharedCatalogChange_\("ADMIN", catalogAction, \{ operation: "reset" \}\)/);
    assert.match(adminSource,/finalizeAdminAuditEvent_\(auditEvent[\s\S]*?publishSharedCatalogChange_/);
});
console.log("CatalogChangeFeed: " + passed + "/14 PASS");
