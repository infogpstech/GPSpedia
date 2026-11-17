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

async function probe(service) {
    const url = endpoints[service] + "?debug=true";
    const started = performance.now();
    try {
        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
            headers: { accept: "application/json" }
        });
        const latencyMs = Math.round(performance.now() - started);
        const bodyText = await response.text();
        if (!response.ok) throw new Error("HTTP " + response.status);
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
        return { service, status: "PASS", version: body.version, latencyMs };
    } catch (error) {
        return { service, status: "FAIL", error: String(error && error.message || error) };
    }
}

console.log("GPSpedia remote service health — target " + targetCommit);
console.log("Solo GET ?debug=true; sin POST, credenciales, escrituras ni cambios remotos.");
const results = await Promise.all(keys.map(probe));
for (const result of results) {
    if (result.status === "PASS") {
        console.log("PASS " + result.service + " v" + result.version + " — " + result.latencyMs + " ms");
    } else {
        console.error("FAIL " + result.service + " — " + result.error);
    }
}
const passed = results.filter(item => item.status === "PASS").length;
console.log("Resultado: " + passed + "/" + results.length + " servicios disponibles.");
if (passed !== results.length) process.exitCode = 1;
