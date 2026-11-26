import { execFileSync } from "node:child_process";

const target = String(process.env.TARGET_COMMIT || "").trim();
if (!/^[a-f0-9]{40}$/i.test(target)) throw new Error("TARGET_COMMIT inválido.");
if (process.env.GPSPEDIA_HEALTH_ENV !== "BETA_ISOLATED" ||
    process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS !== "I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA") {
    throw new Error("Gate Beta no confirmado.");
}
const source = execFileSync("git", ["show", target + ":JS/Frontend/api-config.js"], { encoding: "utf8" });
const match = source.match(/CATALOG:\s*"([^"]+)"/);
if (!match) throw new Error("Endpoint CATALOG ausente.");
const url = match[1];
if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error("Endpoint CATALOG inválido.");
}

async function readPage(cursor, limit) {
    const started = Date.now();
    const response = await fetch(url + "?catalogFeed=1&" + new URLSearchParams({
        cursor: String(cursor), limit: String(limit)
    }), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" }
    });
    if (!response.ok) throw new Error("CATALOG feed HTTP " + response.status);
    let data;
    try { data = await response.json(); }
    catch { throw new Error("CATALOG feed devolvió JSON inválido."); }
    if (!data || data.status !== "success" || !Array.isArray(data.changes) ||
        typeof data.resetRequired !== "boolean" || typeof data.hasMore !== "boolean") {
        throw new Error("Contrato estructural CATALOG inválido.");
    }
    for (const key of ["currentRevision", "minRevision", "nextCursor"]) {
        if (!Number.isSafeInteger(Number(data[key])) || Number(data[key]) < 0) {
            throw new Error("Campo numérico inválido: " + key);
        }
    }
    if (data.changes.length > limit) throw new Error("Feed excede el límite solicitado.");
    for (const change of data.changes) {
        if (!change || typeof change !== "object" ||
            !Number.isSafeInteger(Number(change.revision)) ||
            !["reset", "upsert", "delete"].includes(change.operation)) {
            throw new Error("Evento CATALOG inválido.");
        }
    }
    return { data, elapsedMs: Date.now() - started };
}

const maxPages = 100;
const seen = new Set();
const pageTimes = [];
let cursor = 0;
let pages = 0;
let eventCount = 0;
let resetEventCount = 0;
let maxObservedRevision = 0;
let minObservedRevision = null;
let resetPages = 0;
let concurrentRevisionChange = false;
let finalCursor = 0;

while (pages < maxPages) {
    const { data, elapsedMs } = await readPage(cursor, 1);
    pages++;
    pageTimes.push(elapsedMs);
    const currentRevision = Number(data.currentRevision);
    const minRevision = Number(data.minRevision);
    const nextCursor = Number(data.nextCursor);
    if (currentRevision < maxObservedRevision) throw new Error("currentRevision retrocedió.");
    if (maxObservedRevision && currentRevision !== maxObservedRevision) concurrentRevisionChange = true;
    if (minObservedRevision !== null && minRevision !== minObservedRevision) concurrentRevisionChange = true;
    maxObservedRevision = currentRevision;
    minObservedRevision = minRevision;

    if (data.changes.length === 0) {
        if (data.hasMore) throw new Error("Página vacía no puede declarar hasMore.");
        if (data.resetRequired) {
            resetPages++;
            if (nextCursor !== currentRevision) throw new Error("Reset vacío no avanza al cursor actual.");
        } else if (nextCursor !== cursor) {
            throw new Error("Página vacía sin reset modificó el cursor.");
        }
    } else {
        let expectedRevision = cursor + 1;
        for (const change of data.changes) {
            const revision = Number(change.revision);
            if (revision !== expectedRevision) throw new Error("Secuencia de revisiones no contigua.");
            if (revision > currentRevision) throw new Error("Evento supera currentRevision.");
            if (seen.has(revision)) throw new Error("Evento duplicado entre páginas.");
            seen.add(revision);
            expectedRevision++;
        }
        const lastRevision = Number(data.changes[data.changes.length - 1].revision);
        if (nextCursor !== lastRevision) throw new Error("nextCursor no coincide con el último evento.");
        if (data.hasMore && nextCursor <= cursor) throw new Error("Cursor no avanza con hasMore.");
        if (!data.hasMore && nextCursor !== currentRevision) throw new Error("Feed terminó antes de currentRevision.");
        eventCount += data.changes.length;
        resetEventCount += data.changes.filter(change =>
            change.operation === "reset" || change.resetRequired === true
        ).length;
    }

    finalCursor = nextCursor;
    if (!data.hasMore) break;
    cursor = nextCursor;
}
if (pages >= maxPages && cursor < maxObservedRevision) {
    throw new Error("La paginación excedió el máximo de páginas permitido.");
}
console.log("CATALOG feed sequential pagination Beta read-only — " + target);
console.log(JSON.stringify({
    pages,
    eventCount,
    resetEventCount,
    resetPages,
    initialCursor: 0,
    finalCursor,
    currentRevision: maxObservedRevision,
    minRevision: minObservedRevision,
    concurrentRevisionChange,
    pageTimesMs: pageTimes
}));
