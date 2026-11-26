import { execFileSync } from "node:child_process";

const target = String(process.env.TARGET_COMMIT || "");
if (!/^[a-f0-9]{40}$/i.test(target)) throw Error("Commit inválido");
if (process.env.GPSPEDIA_HEALTH_ENV !== "BETA_ISOLATED" ||
    process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS !== "I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA") {
    throw Error("Gate Beta");
}

const service = String(process.env.SERVICE_KEY || "ADMIN").trim().toUpperCase();
const identities = { ADMIN: "GPSpedia-Admin", UTILITIES: "GPSpedia-Utilities" };
if (!Object.hasOwn(identities, service)) throw Error("SERVICE_KEY debe ser ADMIN o UTILITIES");

const source = execFileSync("git", ["show", target + ":JS/Frontend/api-config.js"], { encoding: "utf8" });
const endpointMatch = source.match(new RegExp("\\b" + service + "\\s*:\\s*\"([^\"]+)\""));
if (!endpointMatch) throw Error("Endpoint " + service + " ausente");
const url = endpointMatch[1];
if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw Error("Endpoint no válido: " + service);
}

const samples = [];
const errors = [];
let version = null;
for (let index = 0; index < 5; index++) {
    const started = Date.now();
    try {
        const response = await fetch(url + "?debug=true", {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
            headers: { accept: "application/json" }
        });
        if (!response.ok) throw Error("HTTP " + response.status);
        const body = await response.json();
        if (body.service !== identities[service] || body.status !== "available" ||
            typeof body.version !== "string") throw Error("Health contract inválido");
        if (version && version !== body.version) throw Error("Versión fluctuante");
        version = body.version;
        samples.push(Date.now() - started);
    } catch (error) {
        errors.push({ sample: index + 1, error: String(error && error.message || error) });
    }
}
const sorted = [...samples].sort((a, b) => a - b);
const result = {
    service,
    version,
    samplesMs: samples,
    medianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    minMs: sorted.length ? sorted[0] : null,
    maxMs: sorted.length ? sorted[sorted.length - 1] : null,
    slowSamples: samples.filter(value => value >= 2000).length,
    failedSamples: errors,
    total: 5
};
console.log(service + " repeated read-only probe — " + target);
console.log(JSON.stringify(result));
if (errors.length) process.exitCode = 1;
