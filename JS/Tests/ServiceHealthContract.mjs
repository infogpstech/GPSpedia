import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const apiSource = read("JS/Frontend/api-config.js");
const uiSource = read("JS/Frontend/ui.js");
const backendSources = {
    AUTH: read("Services/Auth.js"),
    CATALOG: read("Services/catalog.js"),
    WRITE: read("Services/write.js"),
    USERS: read("Services/users.js"),
    FEEDBACK: read("Services/feedback.js"),
    UTILITIES: read("Services/Utilities.js"),
    ADMIN: read("Services/admin.js")
};
const contractsMatch = apiSource.match(/export const SERVICE_HEALTH_CONTRACTS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(contractsMatch, "No se encontró SERVICE_HEALTH_CONTRACTS.");
const contracts = new Function("return (" + contractsMatch[1] + ");")();
const functionMatch = apiSource.match(/export async function checkAllServicesHealth\([\s\S]*?\n\}/);
assert.ok(functionMatch, "No se encontró checkAllServicesHealth.");
const functionSource = functionMatch[0].replace("export async function", "async function");
function buildChecker(endpoints, lastKnown = new Map()) {
    return new Function(
        "API_ENDPOINTS", "SERVICE_HEALTH_CONTRACTS", "SERVICE_HEALTH_TIMEOUT_MS",
        "SERVICE_HEALTH_SLOW_THRESHOLD_MS", "SERVICE_HEALTH_STALE_AFTER_MS",
        "serviceHealthLastKnown", "AbortController", "fetch", "setTimeout", "clearTimeout", "Date",
        functionSource + "\nreturn checkAllServicesHealth;"
    )(
        endpoints, contracts, 8000, 2000, 300000, lastKnown,
        AbortController, globalThis.fetch, setTimeout, clearTimeout, Date
    );
}
function response(status, body, ok = status >= 200 && status < 300) {
    return { status, ok, text: async () => typeof body === "string" ? body : JSON.stringify(body) };
}
async function scanOne(key, result, options = {}) {
    const checker = buildChecker({ [key]: "https://health.invalid/exec" }, options.lastKnown || new Map());
    const fetchImpl = typeof result === "function" ? result : async () => result;
    const values = await checker(Object.assign({ fetchImpl }, options));
    return values[key];
}
let passed = 0;
async function check(name, fn) {
    await fn();
    passed++;
    console.log("PASS " + name);
}

await check("Contrato válido exige identidad y estado y clasifica online", async () => {
    const item = await scanOne("AUTH", response(200, { service: "GPSpedia-Auth", version: "2.2.5", status: "available" }));
    assert.equal(item.status, "online");
    assert.equal(item.metadata.service, "GPSpedia-Auth");
    assert.equal(item.metadata.version, "2.2.5");
    assert.equal(item.httpStatus, 200);
    assert.equal(item.error, null);
});
await check("Latencia superior al umbral configurable se clasifica slow", async () => {
    const times = [100, 2300];
    const item = await scanOne("AUTH", response(200, { service: "GPSpedia-Auth", status: "available" }), {
        slowThresholdMs: 1000, now: () => times.shift() ?? 2300
    });
    assert.equal(item.status, "slow");
    assert.equal(item.latency, 2200);
});
await check("HTTP 4xx es error y HTTP 5xx es no disponible con código real", async () => {
    const notFound = await scanOne("ADMIN", response(404, "", false));
    const serverError = await scanOne("ADMIN", response(503, "", false));
    assert.equal(notFound.status, "error");
    assert.equal(notFound.httpStatus, 404);
    assert.equal(notFound.error, "El endpoint respondió HTTP 404.");
    assert.equal(serverError.status, "unavailable");
    assert.equal(serverError.httpStatus, 503);
});
await check("Falla de red y timeout no se confunden con éxito", async () => {
    const network = await scanOne("AUTH", async () => { throw new TypeError("network down"); });
    assert.equal(network.status, "unavailable");
    assert.equal(network.errorCode, "NETWORK_ERROR");
    const timeout = await scanOne("AUTH", (url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
            const error = new Error("aborted"); error.name = "AbortError"; reject(error);
        });
    }), { timeoutMs: 5 });
    assert.equal(timeout.status, "unavailable");
    assert.equal(timeout.errorCode, "TIMEOUT");
});
await check("Error al leer el cuerpo conserva el código HTTP sin clasificar online", async () => {
    const item = await scanOne("AUTH", async () => ({
        status: 200, ok: true, text: async () => { throw new Error("stream interrupted"); }
    }));
    assert.equal(item.status, "error");
    assert.equal(item.httpStatus, 200);
    assert.equal(item.errorCode, "RESPONSE_READ_ERROR");
});
await check("JSON vacío, HTML, inválido, primitivo o array quedan unknown", async () => {
    for (const body of ["", "<html>offline</html>", "{bad", "null", "[]", "1", '"ok"']) {
        const item = await scanOne("AUTH", response(200, body));
        assert.equal(item.status, "unknown", String(body));
        assert.equal(item.httpStatus, 200);
    }
});
await check("Identidad incorrecta, estado ausente y versión inválida quedan unknown", async () => {
    const wrong = await scanOne("AUTH", response(200, { service: "GPSpedia-Users", status: "available" }));
    const missing = await scanOne("AUTH", response(200, { service: "GPSpedia-Auth" }));
    const badVersion = await scanOne("AUTH", response(200, { service: "GPSpedia-Auth", status: "available", version: {} }));
    assert.equal(wrong.status, "unknown");
    assert.equal(missing.status, "unknown");
    assert.equal(badVersion.status, "unknown");
});
await check("HTTP 200 con estado backend error/degraded no se marca online", async () => {
    const failed = await scanOne("FEEDBACK", response(200, { service: "GPSpedia-Feedback", status: "error" }));
    const degraded = await scanOne("FEEDBACK", response(200, { service: "GPSpedia-Feedback", status: "degraded" }));
    const offline = await scanOne("FEEDBACK", response(200, { service: "GPSpedia-Feedback", status: "offline" }));
    assert.equal(failed.status, "error");
    assert.equal(degraded.status, "error");
    assert.equal(offline.status, "unavailable");
});
await check("LEGACY permanece unknown y no consulta un deployment sin identidad verificable", async () => {
    assert.equal(contracts.LEGACY, null);
    let requested = false;
    const item = await scanOne("LEGACY", async () => {
        requested = true;
        return response(200, { service: "Legacy", status: "available", version: "1.0" });
    });
    assert.equal(item.status, "unknown");
    assert.equal(item.errorCode, "HEALTH_IDENTITY_UNVERIFIED");
    assert.equal(requested, false);
});
await check("Un servicio sin contrato configurado queda unknown sin consultar un endpoint", async () => {
    const checker = buildChecker({ UNVERIFIED: "https://unverified.invalid/exec" });
    let requested = false;
    const result = await checker({ fetchImpl: async () => { requested = true; return response(200, {}); } });
    assert.equal(result.UNVERIFIED.status, "unknown");
    assert.equal(result.UNVERIFIED.errorCode, "HEALTH_CONTRACT_UNDEFINED");
    assert.equal(requested, false);
});
await check("Resultado anterior válido pasa a stale tras superar el TTL y fallar la consulta", async () => {
    const lastKnown = new Map();
    let clock = 1000;
    const checker = buildChecker({ AUTH: "https://health.invalid/exec" }, lastKnown);
    const success = await checker({ fetchImpl: async () => response(200, { service: "GPSpedia-Auth", status: "available", version: "2.2.5" }), now: () => clock });
    assert.equal(success.AUTH.status, "online");
    clock = 10000;
    const stale = await checker({ fetchImpl: async () => { throw new TypeError("network down"); }, now: () => clock, staleAfterMs: 5000 });
    assert.equal(stale.AUTH.status, "stale");
    assert.equal(stale.AUTH.lastKnownStatus, "online");
    assert.equal(stale.AUTH.lastSuccessfulAt, new Date(1000).toISOString());
});
await check("Un fallo de un servicio no bloquea la comprobación de los demás", async () => {
    const checker = buildChecker({ AUTH: "https://auth.invalid", CATALOG: "https://catalog.invalid" });
    const result = await checker({ fetchImpl: async url => {
        if (url.includes("auth.invalid")) throw new TypeError("offline");
        return response(200, { service: "GPSpedia-Catalog", status: "available", version: "2.4.0" });
    }});
    assert.equal(result.AUTH.status, "unavailable");
    assert.equal(result.CATALOG.status, "online");
});
await check("El resultado no expone IDs, nombres de hojas, cache keys ni estructura interna", async () => {
    const item = await scanOne("CATALOG", response(200, {
        service: "GPSpedia-Catalog", status: "available", version: "2.4.0",
        spreadsheetId: "private-sheet-id", sheetsAccessed: ["Cortes"], cacheKey: "catalog_data_v2"
    }));
    assert.deepEqual(item.metadata, { service: "GPSpedia-Catalog", version: "2.4.0", reportedStatus: "available" });
    assert.ok(!JSON.stringify(item).includes("private-sheet-id"));
    assert.ok(!JSON.stringify(item).includes("catalog_data_v2"));
    assert.ok(!JSON.stringify(item).includes("Cortes"));
});
await check("El ping ADMIN tiene timeout y el escaneo inicia independientemente", async () => {
    const start = uiSource.indexOf("window.triggerAdminPanelPing = async function()");
    const end = uiSource.indexOf("// Helper para progreso", start);
    const ping = uiSource.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.ok(ping.indexOf("const scanPromise = runServicesHealthScan();") < ping.indexOf("const pingPromise"));
    assert.ok(ping.includes("setTimeout(() => controller.abort(), 5000)"));
    assert.ok(ping.includes("routeAction('ping', {}, null, { signal: controller.signal })"));
    assert.ok(ping.includes("Promise.allSettled([scanPromise, pingPromise])"));
});
await check("El panel presenta los seis estados y no muestra metadatos internos", async () => {
    for (const status of ["online", "slow", "unavailable", "error", "unknown", "stale"]) {
        assert.ok(uiSource.includes(status + ':'));
    }
    const start = uiSource.indexOf("function renderServiceDetail()");
    const end = uiSource.indexOf("function renderServiceTrafficChart()", start);
    const detail = uiSource.slice(start, end);
    assert.ok(!detail.includes("sheetsAccessed"));
    assert.ok(!detail.includes("cacheStatus"));
    assert.ok(detail.includes("item.httpStatus"));
    assert.ok(detail.includes("item.error"));
    assert.equal((uiSource.match(/getServiceHealthStatusLabel_\(item.status\)/g) || []).length, 2);
});
await check("Los doGet versionados exponen identidad/estado y no metadatos internos", async () => {
    const expected = {
        AUTH: "GPSpedia-Auth", CATALOG: "GPSpedia-Catalog", WRITE: "GPSpedia-Write",
        USERS: "GPSpedia-Users", FEEDBACK: "GPSpedia-Feedback",
        UTILITIES: "GPSpedia-Utilities", ADMIN: "GPSpedia-Admin"
    };
    for (const [key, identity] of Object.entries(expected)) {
        const source = backendSources[key];
        assert.ok(source.includes("service: '" + identity + "'") || source.includes('service:"' + identity + '"'), key + " no declara identidad.");
        assert.ok(source.includes("status: 'available'") || source.includes('status:"available"'), key + " no declara available.");
        assert.ok(source.includes("version:"), key + " no declara versión.");
        assert.ok(source.includes("ContentService.MimeType.JSON"), key + " no responde JSON.");
        const start = source.indexOf("function doGet");
        const end = source.indexOf("\nfunction ", start + 10);
        const debugBlock = source.slice(start, end > start ? end : source.length);
        for (const secret of ["spreadsheetId", "driveFolderId", "sheetsAccessed", "cacheKey", "stack", "token", "password"]) {
            assert.ok(!debugBlock.includes(secret), key + " expone " + secret);
        }
    }

});
console.log("ServiceHealthContract: " + passed + "/" + passed + " PASS");
