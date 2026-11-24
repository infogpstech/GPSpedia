import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const auth = readFileSync(resolve(root, "JS/Services/Auth.js"), "utf8");
const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
const apiConfig = readFileSync(resolve(root, "JS/Frontend/api-config.js"), "utf8");
const declaration = "function handleClearSensitiveLogs(payload)";
const start = auth.indexOf(declaration);
assert.ok(start >= 0, "No se encontró handleClearSensitiveLogs.");
const match = auth.slice(start).match(/^function handleClearSensitiveLogs\(payload\) \{[\s\S]*?^\}/m);
assert.ok(match, "No se pudo extraer handleClearSensitiveLogs.");

function createHarness() {
    const rows = [
        ["Level", "Message", "Details", "Timestamp"],
        ["INFO", "Arranque normal", "sin credenciales", new Date("2026-11-15T10:00:00Z")],
        ["SECRET", "credencial sensible", "debe purgarse", new Date("2026-11-15T10:01:00Z")],
        ["WARN", "Evento operativo", "debe conservarse", new Date("2026-11-15T10:02:00Z")]
    ];
    const requestedSheets = [];
    const logsSheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => 4,
        getRange(row, column, rowCount, columnCount) {
            return {
                getValues() {
                    return rows.slice(row - 1, row - 1 + rowCount)
                        .map(line => line.slice(column - 1, column - 1 + columnCount));
                }
            };
        },
        deleteRow(rowNumber) { rows.splice(rowNumber - 1, 1); }
    };
    let lockAcquired = 0, lockReleased = 0, flushCount = 0;
    const logEntries = [];
    const spreadsheet = { getSheetByName(name) {
        requestedSheets.push(name);
        return name === "Logs" ? logsSheet : null;
    }};
    const handler = new Function(
        "normalizeUserId", "normalizeRoleName", "LockService", "SpreadsheetApp", "getAuthUsersSpreadsheet_",
        "SHEET_NAMES", "Utilities", "isSensitiveLogRecord_", "logToSheet",
        match[0] + "\nreturn handleClearSensitiveLogs;"
    )(
        value => String(value || "").trim(),
        value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(),
        { getScriptLock: () => ({
            tryLock() { lockAcquired++; return true; },
            releaseLock() { lockReleased++; }
        }) },
        {
            getActiveSpreadsheet: () => spreadsheet,
            flush() { flushCount++; }
        },
        () => spreadsheet,
        { LOGS: "Logs" },
        { formatDate: () => "2026-11-15 10:00:00" },
        row => String(row && row[0] || "") === "SECRET",
        (level, message, metadata) => logEntries.push({ level, message, metadata })
    );
    return {
        handler, rows, requestedSheets, logEntries,
        stats: () => ({ lockAcquired, lockReleased, flushCount })
    };
}

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("la purga usa el actor local cacheado y elimina solo filas sensibles", () => {
    const h = createHarness();
    const result = h.handler({
        userId: "DEV-1",
        sessionToken: "token-ya-validado-por-coordinator",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    });
    assert.equal(result.status, "success");
    assert.equal(result.scannedCount, 3);
    assert.equal(result.deletedCount, 1);
    assert.equal(h.rows.length, 3);
    assert.equal(h.rows[1][1], "Arranque normal");
    assert.equal(h.rows[2][1], "Evento operativo");
    assert.deepEqual(h.requestedSheets, ["Logs"]);
    assert.deepEqual(h.stats(), { lockAcquired: 1, lockReleased: 1, flushCount: 1 });
    assert.equal(h.logEntries.at(-1).level, "INFO");
});

test("rechaza rol no Desarrollador aunque el cliente envíe un userId válido", () => {
    const h = createHarness();
    assert.throws(() => h.handler({
        userId: "USER-2",
        sessionToken: "token",
        __sharedSessionActor: { userId: "USER-2", role: "Tecnico", epoch: 3 }
    }), /reservada a una sesión Desarrollador/);
    assert.equal(h.requestedSheets.length, 0);
    assert.deepEqual(h.stats(), { lockAcquired: 0, lockReleased: 0, flushCount: 0 });
});

test("rechaza identidad cruzada y actor sin epoch confiable", () => {
    const h = createHarness();
    assert.throws(() => h.handler({
        userId: "DEV-IMPOSTOR",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    }), /reservada a una sesión Desarrollador/);
    assert.throws(() => h.handler({
        userId: "DEV-1",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 0 }
    }), /reservada a una sesión Desarrollador/);
});

test("AUTH no relee ActiveSessions para sincronizar cada acción", () => {
    const begin = auth.indexOf("function doPost(e)");
    const end = auth.indexOf("function doPostInternal_(e)", begin);
    assert.ok(begin >= 0 && end > begin);
    const dispatcher = auth.slice(begin, end);
    assert.match(dispatcher, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "AUTH", loadSpreadsheet: getAuthUsersSpreadsheet_ \}\)/);
    assert.doesNotMatch(dispatcher, /withSharedMutationLease_/);
    assert.match(dispatcher, /withSharedSessionActor_\(e, actor\)/);
    assert.doesNotMatch(dispatcher, /syncAuthSheetActivityFromActor_/);
    assert.match(auth, /function handleClearSensitiveLogs\(payload\)[\s\S]*?payload\.__sharedSessionActor/);
});

function extractTopLevelFunction(source, name) {
    const match = source.match(new RegExp("^function " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?^\\}", "m"));
    assert.ok(match, "No se encontró " + name);
    return match[0];
}
function createDispatchHarness(source, service, extraBindings = {}) {
    const mutation = service === "FEEDBACK" ? "" : extractTopLevelFunction(source, "isSharedMutationAction_");
    const post = extractTopLevelFunction(source, "doPost");
    const calls = [], actorLookups = [];
    const actor = { userId:"DEV-1", role:"desarrollador", fullName:"Ana", epoch:7 };
    const bindings = {
        withSharedMutationLease_(requestedService, operation, callback, options) {
            calls.push({ service:requestedService, operation, sessionToken:options && options.session && options.session.sessionToken });
            return callback("coordinator-token", actor);
        },
        getAuthUsersSpreadsheet_() { return {}; },
        migrateLegacyRoleRevocationMarkersToSharedState_() { return { status:"success" }; },
        getCachedSharedSessionActor_(userId, sessionToken) {
            actorLookups.push({ userId, sessionToken });
            if (userId !== actor.userId || sessionToken !== "trusted-session") throw new Error("Sesión inválida.");
            return actor;
        },
        withSharedSessionActor_(event, trustedActor) {
            const request = JSON.parse(event.postData.contents);
            request.payload.__sharedSessionActor = trustedActor;
            event.postData.contents = JSON.stringify(request);
            return event;
        },
        doPostInternal_(event) { return JSON.parse(event.postData.contents).payload; },
        ContentService: { createTextOutput: value => ({ value, setMimeType() { return this; } }), MimeType:{TEXT:"text/plain"} },
        DIRECT_SERVICE_TRAFFIC_CONFIG_: { actions: new Set() },
        readDirectServiceTraffic_: () => ({ status: "unavailable" }),
        recordDirectServiceTraffic_: () => false,
        ...extraBindings
    };
    const names = Object.keys(bindings);
    const values = Object.values(bindings);
    const dispatcher = new Function(...names, mutation + String.fromCharCode(10) + post +
        String.fromCharCode(10) + "return doPost;")(...values);
    return { calls, actorLookups, send(action) {
        calls.length = 0;
        const event = { postData:{contents:JSON.stringify({action,payload:{userId:"DEV-1",sessionToken:"trusted-session"}})} };
        return dispatcher(event);
    }};
}
test("la limpieza de Logs usa actor cacheado y RBAC Desarrollador sin lease", () => {
    assert.match(apiConfig, /['"]clearSensitiveLogs['"]\s*:\s*['"]AUTH['"]/);
    const harness = createDispatchHarness(auth,"AUTH");
    const payload = harness.send("clearSensitiveLogs");
    assert.deepEqual(harness.calls,[]);
    assert.deepEqual(harness.actorLookups,[{userId:"DEV-1",sessionToken:"trusted-session"}]);
    assert.equal(payload.__sharedSessionActor.userId,"DEV-1");
    assert.equal(payload.__sharedSessionActor.epoch,7);
    assert.match(auth, /function handleClearSensitiveLogs\(payload\)[\s\S]*actorRole !== "desarrollador"/);
});
test("la limpieza de ActividadUsuario usa actor cacheado y RBAC Desarrollador sin lease", () => {
    assert.match(apiConfig, /['"]clearActivityLogs['"]\s*:\s*['"]FEEDBACK['"]/);
    const harness = createDispatchHarness(feedback,"FEEDBACK",{
        FEEDBACK_ACTION_PERMISSIONS:{clearActivityLogs:["Desarrollador"]},
        FEEDBACK_PUBLIC_ACTIONS:new Set()
    });
    const payload = harness.send("clearActivityLogs");
    assert.deepEqual(harness.calls,[]);
    assert.deepEqual(harness.actorLookups,[{userId:"DEV-1",sessionToken:"trusted-session"}]);
    assert.equal(payload.__sharedSessionActor.userId,"DEV-1");
    assert.equal(payload.__sharedSessionActor.epoch,7);
    assert.match(feedback,/clearActivityLogs:\s*\["Desarrollador"\]/);
    assert.match(feedback,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
    assert.doesNotMatch(feedback.slice(feedback.indexOf("function doPost(e)"),feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_")),/withSharedMutationLease_/);
});
test("distingue una hoja sin registros de una revisión sin datos confidenciales", () => {
    const noMatches = createHarness();
    noMatches.rows.splice(2, 1);
    const unchanged = noMatches.handler({
        userId: "DEV-1",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    });
    assert.equal(unchanged.status, "success");
    assert.equal(unchanged.scannedCount, 2);
    assert.equal(unchanged.deletedCount, 0);
    assert.match(unchanged.message, /no se encontraron datos confidenciales/i);

    const empty = createHarness();
    empty.rows.splice(1);
    const noRows = empty.handler({
        userId: "DEV-1",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    });
    assert.equal(noRows.scannedCount, 0);
    assert.equal(noRows.deletedCount, 0);
    assert.match(noRows.message, /no hay registros/i);
});
console.log("SensitiveLogsTrustedActor: " + passed + "/" + passed + " PASS");
