import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const targetCommit = String(process.env.TARGET_COMMIT || "").trim();
if (!/^[a-f0-9]{40}$/i.test(targetCommit)) {
    throw new Error("TARGET_COMMIT debe ser un SHA completo.");
}

const source = execFileSync("git", ["show", targetCommit + ":JS/Frontend/api-config.js"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
});

function parseObject(name) {
    const match = source.match(new RegExp("export const " + name + " = (?:Object\\.freeze\\()?\\{([\\s\\S]*?)\\n\\}\\)?;"));
    if (!match) throw new Error("No se encontró " + name + " en el commit objetivo.");
    const values = {};
    for (const line of match[1].split(/\r?\n/)) {
            const item = line.match(/^\s*([A-Z]+):\s*"([^"]+)"\s*,?\s*$/);
        if (item) values[item[1]] = item[2];
    }
    return values;
}

const endpoints = parseObject("API_ENDPOINTS");
const identities = parseObject("SERVICE_HEALTH_CONTRACTS");
const keys = Object.keys(identities).sort();
if (keys.length !== 7 || keys.join(",") !== Object.keys(endpoints).sort().join(",")) {
    throw new Error("Inventario inválido. Endpoints=[" + Object.keys(endpoints).sort().join(",") + "]; contratos=[" + keys.join(",") + "].");
}

const forbidden = /secret|token|password|spreadsheet.?id|drive.?folder.?id|sheets.?accessed|cache.?key|stack|exception/i;
function inspectForSensitiveFields(value, path = "response") {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
        if (forbidden.test(key)) throw new Error("El diagnóstico expuso un campo no permitido: " + path + "." + key);
        inspectForSensitiveFields(child, path + "." + key);
    }
}

function isTransientProbeError_(error) {
    const message = String(error && error.message || error || "");
    const name = String(error && error.name || "");
    return name === "TimeoutError" || name === "AbortError" ||
        /timed? ?out|timeout|fetch failed|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up/i.test(message);
}

async function probe(service) {
    const url = endpoints[service] + "?debug=true";
    const startedTotal = performance.now();
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        const started = performance.now();
        try {
            const response = await fetch(url, {
                method: "GET",
                redirect: "follow",
                signal: AbortSignal.timeout(12000),
                headers: { accept: "application/json" }
            });
            const latencyMs = Math.round(performance.now() - started);
            if (!response.ok) {
                const httpError = new Error("HTTP " + response.status);
                if (response.status === 429 || response.status >= 500) {
                    lastError = httpError;
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, attempt * 750));
                        continue;
                    }
                }
                throw httpError;
            }
            const bodyText = await response.text();
            let body;
            try { body = JSON.parse(bodyText); }
            catch { throw new Error("Respuesta no JSON (HTTP " + response.status + ")"); }
            if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("La respuesta no es un objeto JSON.");
            inspectForSensitiveFields(body);
            if (body.service !== identities[service]) throw new Error("Identidad incorrecta: " + String(body.service));
            if (!["available", "online"].includes(String(body.status || "").toLowerCase())) {
                throw new Error("Estado backend no disponible: " + String(body.status));
            }
            if (typeof body.version !== "string" || !body.version.trim()) throw new Error("Falta la versión del servicio.");
            if (["AUTH", "FEEDBACK"].includes(service) &&
                body.coordinatorConfigured !== undefined &&
                typeof body.coordinatorConfigured !== "boolean") {
                throw new Error("coordinatorConfigured no es booleano.");
            }
            return {
                service, status: "PASS", version: body.version, latencyMs,
                attempts: attempt, totalMs: Math.round(performance.now() - startedTotal)
            };
        } catch (error) {
            lastError = error;
            if (!isTransientProbeError_(error) || attempt === 3) break;
            await new Promise(resolve => setTimeout(resolve, attempt * 750));
        }
    }
    return {
        service, status: "FAIL",
        error: String(lastError && lastError.message || lastError),
        attempts: 3, totalMs: Math.round(performance.now() - startedTotal)
    };
}

async function runBoundedProbes_(services, concurrency = 2) {
    const results = new Array(services.length);
    let nextIndex = 0;
    async function worker() {
        while (true) {
            const index = nextIndex++;
            if (index >= services.length) return;
            results[index] = await probe(services[index]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, services.length) }, worker));
    return results;
}

console.log("GPSpedia remote service health — target " + targetCommit);
console.log("Solo GET ?debug=true; sin POST, credenciales, escrituras ni cambios remotos.");
const results = await runBoundedProbes_(keys, 2);
for (const result of results) {
    if (result.status === "PASS") {
        console.log("PASS " + result.service + " v" + result.version + " — " + result.latencyMs + " ms (intento " + result.attempts + "/3; total " + result.totalMs + " ms)");
    } else {
        console.error("FAIL " + result.service + " — " + result.error + " (3 intentos; total " + result.totalMs + " ms)");
    }
}
const passed = results.filter(item => item.status === "PASS").length;
console.log("Resultado: " + passed + "/" + results.length + " servicios disponibles.");
if (passed !== results.length) process.exitCode = 1;
