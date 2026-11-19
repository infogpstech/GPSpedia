import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const services = [
    { name: "AUTH", path: "JS/Services/Auth.js", actions: ["validateSession"], end: "function doGet(e)" },
    { name: "WRITE", path: "JS/Services/write.js", actions: ["checkVehicle", "getSuggestion", "checkVinDuplicate"], end: "function doGet(e)" },
    { name: "FEEDBACK", path: "JS/Services/feedback.js", actions: ["recordLike", "reportProblem", "addProblem", "addSolution", "addPrevention", "addVehicleToProblem", "removeVehicleFromProblem", "updatePysItem", "updateTutorialItem", "suggestCutChange", "suggestYear", "addTutorial", "getFeedbackItems", "getMyProblemReports", "replyToFeedback", "markAsResolved", "deleteFeedbackItem", "getInboxRecipients", "notifyDevelopersDriveCritical", "getInboxConversations", "getInboxMessages", "createInboxConversation", "sendInboxMessage", "markInboxRead", "markInboxUnread", "deleteInboxConversation", "archiveInboxConversation", "closeInboxConversation", "getRichTextMode", "setRichTextMode", "getActivityLogs", "clearActivityLogs", "initYouTubeUpload", "getVideoApprovalByOperation", "submitVideoForApproval", "approveVideo", "rejectVideo", "getPysData", "sendContactForm", "getCatalogChanges"], end: "function doGet(e)" },
];
const base = 1_800_000_000_000;
const secret = "direct-service-secret-".padEnd(48, "x");
let passed = 0;
function test(name, run) {
    run();
    passed++;
    console.log("PASS " + name);
}
function createHarness(factory, options = {}) {
    const store = new Map();
    const calls = { tryLock: [], releases: 0, writes: 0, deletes: 0 };
    const properties = {
        getProperty: key => store.has(key) ? store.get(key) : null,
        setProperty: (key, value) => {
            calls.writes++;
            if (options.writeError) throw new Error("properties unavailable");
            store.set(String(key), String(value));
        },
        deleteProperty: key => { calls.deletes++; store.delete(key); },
        getProperties: () => Object.fromEntries(store.entries())
    };
    const lock = {
        tryLock: timeout => {
            calls.tryLock.push(timeout);
            return options.lockAvailable !== false;
        },
        releaseLock: () => { calls.releases++; }
    };
    const api = factory({ getScriptLock: () => lock }, { getScriptProperties: () => properties });
    return { ...api, store, calls, properties };
}

for (const service of services) {
    const source = readFileSync(resolve(root, service.path), "utf8");
    const start = source.indexOf("const DIRECT_SERVICE_TRAFFIC_CONFIG_");
    const end = source.indexOf(service.end, start);
    assert.ok(start >= 0 && end > start, service.name + " helper block not found");
    const factorySource = source.slice(start, end);
    const factory = new Function("LockService", "PropertiesService",
        factorySource + "\nreturn { recordDirectServiceTraffic_, readDirectServiceTraffic_, DIRECT_SERVICE_TRAFFIC_CONFIG_ };"
    );
    const expectedSecretProperty = "GPSpedia_" + service.name + "_TRAFFIC_SECRET";

    test(service.name + " registra solo las rutas directas auditadas", () => {
        const h = createHarness(factory);
        assert.equal(h.DIRECT_SERVICE_TRAFFIC_CONFIG_.service, service.name);
        assert.deepEqual([...h.DIRECT_SERVICE_TRAFFIC_CONFIG_.actions], service.actions);
        assert.equal(h.DIRECT_SERVICE_TRAFFIC_CONFIG_.secretProperty, expectedSecretProperty);
    });

    test(service.name + " registra en bucket horario y devuelve totales 1/6/24 h", () => {
        const h = createHarness(factory);
        h.store.set(expectedSecretProperty, secret);
        assert.equal(h.recordDirectServiceTraffic_(base), true);
        assert.deepEqual(h.calls.tryLock, [0]);
        assert.equal(h.calls.releases, 1);
        const result = h.readDirectServiceTraffic_(secret, base);
        assert.equal(result.status, "success");
        assert.equal(result.service, service.name);
        assert.equal(result.scope, "direct_post_requests");
        assert.equal(result.totals.lastHour, 1);
        assert.equal(result.totals.last6Hours, 1);
        assert.equal(result.totals.last24Hours, 1);
        assert.equal(JSON.stringify(result).includes(secret), false);
    });

    test(service.name + " acepta el secreto Coordinator y mantiene fallback legacy", () => {
        const h = createHarness(factory);
        h.store.set("GPSpedia_COORDINATOR_SECRET", secret);
        assert.equal(h.readDirectServiceTraffic_(secret, base).status, "success");
        h.store.delete("GPSpedia_COORDINATOR_SECRET");
        h.store.set(expectedSecretProperty, secret);
        assert.equal(h.readDirectServiceTraffic_(secret, base).status, "success");
        h.store.set("GPSpedia_COORDINATOR_SECRET", "wrong-coordinator-secret".padEnd(48, "x"));
        assert.equal(h.readDirectServiceTraffic_(secret, base).status, "error",
            "Un secreto Coordinator presente pero incorrecto no debe caer al secreto legacy.");
    });

    test(service.name + " omite telemetría cuando el lock está ocupado sin liberar ni escribir", () => {
        const h = createHarness(factory, { lockAvailable: false });
        assert.equal(h.recordDirectServiceTraffic_(base), false);
        assert.deepEqual(h.calls.tryLock, [0]);
        assert.equal(h.calls.releases, 0);
        assert.equal(h.calls.writes, 0);
        assert.equal(h.store.size, 0);
    });

    test(service.name + " falla de forma best-effort si PropertiesService no puede escribir", () => {
        const h = createHarness(factory, { writeError: true });
        assert.equal(h.recordDirectServiceTraffic_(base), false);
        assert.equal(h.calls.releases, 1);
    });

    test(service.name + " rechaza secreto ausente o incorrecto", () => {
        const h = createHarness(factory);
        h.store.set(expectedSecretProperty, secret);
        assert.equal(h.readDirectServiceTraffic_("", base).status, "error");
        assert.equal(h.readDirectServiceTraffic_("wrong-secret".padEnd(48, "x"), base).status, "error");
    });

    test(service.name + " expone endpoint interno y cuenta solo la ruta directa configurada", () => {
        const doPostStart = source.indexOf("function doPost(e)");
        const doPostEnd = source.indexOf("\nfunction ", doPostStart + 15);
        const doPost = source.slice(doPostStart, doPostEnd > doPostStart ? doPostEnd : source.length);
        assert.ok(doPost.includes('action === "getServiceTraffic"'));
        assert.ok(doPost.includes("recordDirectServiceTraffic_()"));
        assert.ok(doPost.includes("DIRECT_SERVICE_TRAFFIC_CONFIG_.actions.has"));
    });
}

const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
const routerStart = feedback.indexOf("function doPost(e)");
const routerEnd = feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_", routerStart);
const router = feedback.slice(routerStart, routerEnd);
assert.ok(routerStart >= 0 && routerEnd > routerStart);
assert.match(router,/if \(DIRECT_SERVICE_TRAFFIC_CONFIG_\.actions\.has\(action\)\) recordDirectServiceTraffic_\(\)/);
assert.equal((router.match(/recordDirectServiceTraffic_\(/g)||[]).length,1,"Cada acción FEEDBACK se cuenta una sola vez.");
assert.match(router,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
assert.doesNotMatch(router,/withSharedMutationLease_/);
assert.match(router,/anonymousSuggestion/);
assert.match(feedback,/const FEEDBACK_PUBLIC_ACTIONS = new Set\(\["getPysData", "sendContactForm", "getCatalogChanges"\]\)/);
assert.ok(services.find(item => item.name === "FEEDBACK").actions.includes("suggestYear"),
    "FEEDBACK debe contar tanto sugerencias autenticadas como anónimas.");

console.log("DirectServiceTrafficTelemetry: " + passed + "/" + passed + " PASS");
