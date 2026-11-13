import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const apiConfig = readFileSync(new URL("api-config.js", root), "utf8");
const uiSource = readFileSync(new URL("ui.js", root), "utf8");

function functionSource(source, declaration, nextMarker) {
    const start = source.indexOf(declaration);
    if (start < 0) throw new Error("No se encontró " + declaration);
    const end = source.indexOf(nextMarker, start + declaration.length);
    if (end < 0) throw new Error("No se encontró el límite de " + declaration);
    return source.slice(start, end).replace(/^export\s+/, "");
}

const helperSource = functionSource(
    apiConfig,
    "export async function routeActionWithRetry(",
    "\n\n// 3. FUNCIONES DE CONVENIENCIA"
);
const controllers = [];
class FakeAbortController {
    constructor() {
        this.signal = { aborted: false };
        controllers.push(this);
    }
    abort() { this.signal.aborted = true; }
}
function createRunner(routeAction, options = {}) {
    const execute = new Function("routeAction", "AbortController", "setTimeout", "clearTimeout",
        helperSource + "\nreturn routeActionWithRetry;")(
        routeAction, FakeAbortController,
        options.setTimeout || ((callback, delay) => ({ callback, delay })),
        options.clearTimeout || (() => {})
    );
    return (action, payload, settings = {}) => execute(action, payload, Object.assign({}, options, settings));
}
function routeError(kind, httpStatus = null) {
    const error = new Error("simulated " + kind);
    error.kind = kind;
    error.httpStatus = httpStatus;
    return error;
}
function makePayload() {
    return { userId: "developer-1", sessionToken: "session-token",
        cursor: { referenceCacheId: "123e4567-e89b-42d3-a456-426614174000",
            totalAnalyzed: 25, foldersVisited: 3, stack: [{ folderId: "folder-1", fileToken: "opaque-token" }] } };
}

async function run() {
    let passed = 0;
    async function check(name, fn) {
        try { await fn(); passed++; console.log("PASS " + name); }
        catch (error) { console.error("FAIL " + name + ": " + error.message); throw error; }
    }

    await check("Un fallo de red reintenta exactamente el mismo cursor y payload", async () => {
        controllers.length = 0;
        const payload = makePayload(), calls = [], waits = [], scheduled = [];
        const request = async (action, body, service, requestOptions) => {
            calls.push({ action, body: JSON.parse(JSON.stringify(body)), service, signal: requestOptions.signal });
            if (calls.length === 1) throw routeError("network");
            return { status: "success", totalAnalyzed: 26 };
        };
        const runner = createRunner(request, {
            setTimeout: (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; },
            wait: async delay => { waits.push(delay); },
            shouldContinue: () => true
        });
        const result = await runner("auditDriveImagesInCortes", payload, {
            timeoutMs: 12345, maxAttempts: 3, retryDelayMs: 200
        });
        assert.equal(result.totalAnalyzed, 26);
        assert.equal(calls.length, 2);
        assert.deepEqual(calls[0].body, payload);
        assert.deepEqual(calls[1].body, payload);
        assert.equal(calls[0].action, "auditDriveImagesInCortes");
        assert.equal(calls[0].service, null);
        assert.notEqual(calls[0].signal, calls[1].signal);
        assert.equal(scheduled[0].delay, 12345);
        assert.deepEqual(waits, [200]);
    });

    await check("Un HTTP 503 es reintentable y HTTP 400 no lo es", async () => {
        let calls = 0;
        const runner = createRunner(async () => {
            calls++;
            if (calls === 1) throw routeError("http", 503);
            return { status: "success" };
        });
        assert.equal((await runner("auditDriveImagesInCortes", makePayload(), { wait: async () => {} })).status, "success");
        assert.equal(calls, 2);
        calls = 0;
        const nonRetryable = createRunner(async () => { calls++; throw routeError("http", 400); });
        await assert.rejects(() => nonRetryable("auditDriveImagesInCortes", makePayload(), { wait: async () => {} }), /simulated http/);
        assert.equal(calls, 1);
    });

    await check("Los errores de aplicación no se reintentan", async () => {
        let calls = 0;
        const runner = createRunner(async () => { calls++; throw routeError("application"); });
        await assert.rejects(() => runner("auditDriveImagesInCortes", makePayload(), { wait: async () => {} }), /simulated application/);
        assert.equal(calls, 1);
    });

    await check("El agotamiento limita a tres intentos sin cambiar el cursor", async () => {
        const payload = makePayload(), bodies = [], waits = [];
        const runner = createRunner(async (_action, body) => {
            bodies.push(JSON.parse(JSON.stringify(body)));
            throw routeError("network");
        });
        await assert.rejects(() => runner("auditDriveImagesInCortes", payload, {
            maxAttempts: 9, retryDelayMs: 100, wait: async delay => waits.push(delay)
        }), /simulated network/);
        assert.equal(bodies.length, 3);
        bodies.forEach(body => assert.deepEqual(body, payload));
        assert.deepEqual(waits, [100, 200]);
    });

    await check("La cancelación de la vista detiene los reintentos pendientes", async () => {
        let calls = 0, waits = 0, current = true;
        const runner = createRunner(async () => { calls++; throw routeError("network"); });
        await assert.rejects(() => runner("auditDriveImagesInCortes", makePayload(), {
            shouldContinue: () => current,
            wait: async () => { waits++; current = false; }
        }), /simulated network/);
        assert.equal(calls, 1);
        assert.equal(waits, 1);
    });

    await check("Un timeout aborta la petición y el reintento usa un controlador nuevo", async () => {
        controllers.length = 0;
        let schedules = 0, calls = 0;
        const runner = createRunner(async (_action, _body, _service, requestOptions) => {
            calls++;
            if (calls === 1) {
                assert.equal(requestOptions.signal.aborted, true);
                throw routeError("abort");
            }
            assert.equal(requestOptions.signal.aborted, false);
            return { status: "success" };
        }, {
            setTimeout: callback => { schedules++; if (schedules === 1) callback(); return schedules; },
            wait: async () => {}
        });
        assert.equal((await runner("auditDriveImagesInCortes", makePayload(), { wait: async () => {} })).status, "success");
        assert.equal(calls, 2);
        assert.equal(controllers.length, 2);
    });

    assert.ok(uiSource.includes("routeActionWithRetry('auditDriveImagesInCortes'"));
    assert.ok(uiSource.includes("const requestCursor = cursor ? JSON.parse(JSON.stringify(cursor)) : null"));
    assert.ok(uiSource.includes("timeoutMs: 45000, maxAttempts: 3"));
    assert.ok(uiSource.includes("shouldContinue: isCurrentRequest"));
    assert.ok(uiSource.includes("respuesta de este lote expiró"));
    passed++;
    console.log("PASS AdminDriveAuditClientRetry: " + passed + "/6 PASS");
}
await run();
