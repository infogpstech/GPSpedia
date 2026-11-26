import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const targetCommit = String(process.env.TARGET_COMMIT || "").trim();
if (!/^[a-f0-9]{40}$/i.test(targetCommit)) throw new Error("TARGET_COMMIT inválido.");
if (process.env.GPSPEDIA_HEALTH_ENV !== "BETA_ISOLATED" ||
    process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS !== "I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA") {
    throw new Error("La prueba exige confirmar que CATALOG apunta exclusivamente a Beta aislada.");
}
function source(path) {
    return execFileSync("git", ["show", targetCommit + ":" + path], {
        encoding: "utf8", maxBuffer: 8 * 1024 * 1024
    });
}
const apiSource = source("JS/Frontend/api-config.js");
const catalogSource = source("JS/Services/catalog.js");
const uiSource = source("JS/Frontend/ui.js");

const endpointMatch = apiSource.match(/export const API_ENDPOINTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
if (!endpointMatch) throw new Error("No se pudo leer API_ENDPOINTS.");
const endpointLine = endpointMatch[1].split(/\r?\n/).find(line => /^\s*CATALOG:\s*"/.test(line));
const endpointValue = endpointLine && endpointLine.match(/"([^"]+)"/);
const catalogUrl = endpointValue && endpointValue[1];
if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(catalogUrl || "")) {
    throw new Error("Endpoint CATALOG inválido.");
}

const handlerStart = catalogSource.indexOf("function handleGetCatalogData(payload = {})");
const handlerEnd = catalogSource.indexOf("\nfunction handleGetDropdownData", handlerStart);
if (handlerStart < 0 || handlerEnd <= handlerStart) throw new Error("No se encontró el handler getCatalogData.");
const handler = catalogSource.slice(handlerStart, handlerEnd)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
if (/\.(?:setValue|setValues|appendRow|deleteRow|insertRow|clear|clearContents|deleteSheet|insertSheet)\s*\(|\bcache\.put\s*\(/.test(handler)) {
    throw new Error("El handler getCatalogData dejó de cumplir el contrato read-only; se canceló la prueba remota.");
}
const doPostStart = catalogSource.indexOf("function doPost(e)");
const doPostEnd = catalogSource.indexOf("\nfunction ", doPostStart + 10);
const dispatcher = catalogSource.slice(doPostStart, doPostEnd);
if (!/case 'getCatalogData':\s*result = handleGetCatalogData\(payload\)/.test(dispatcher)) {
    throw new Error("El dispatcher CATALOG ya no enruta getCatalogData al handler read-only.");
}

const parserStart = uiSource.indexOf("export function getValidatedYouTubeVideoId(");
const embedStart = uiSource.indexOf("export function getValidatedYouTubeVideoEmbedUrl(", parserStart);
const embedEnd = uiSource.indexOf("\nfunction getYouTubeEmbedUrl(", embedStart);
if (parserStart < 0 || embedStart <= parserStart || embedEnd <= embedStart) {
    throw new Error("No se encontraron los validadores YouTube de frontend.");
}
const helpersSource = uiSource.slice(parserStart, embedEnd).replace(/export function/g, "function");
const youtube = new Function("URL", helpersSource +
    "\nreturn { getValidatedYouTubeVideoId, getValidatedYouTubeVideoEmbedUrl };")(URL);

console.log("CATALOG tutorial snapshot: POST getCatalogData, validado como lectura sin escrituras.");
const response = await fetch(catalogUrl, {
    method: "POST",
    redirect: "follow",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ action: "getCatalogData", payload: {} }),
    signal: AbortSignal.timeout(20000)
});
if (!response.ok) throw new Error("CATALOG getCatalogData HTTP " + response.status + ".");
let catalog;
try { catalog = JSON.parse(await response.text()); }
catch { throw new Error("CATALOG getCatalogData no devolvió JSON válido."); }
if (!catalog || catalog.status !== "success" || !catalog.data || !Array.isArray(catalog.data.tutoriales)) {
    throw new Error("CATALOG no devolvió la colección pública tutoriales.");
}

function classify(raw) {
    try {
        const url = new URL(raw);
        const host = url.hostname.toLowerCase();
        if (host === "youtu.be") return "short";
        if (url.pathname.startsWith("/shorts/")) return "shorts";
        if (url.pathname === "/watch") return "watch";
        return "other";
    } catch {
        return "id";
    }
}
const videos = catalog.data.tutoriales.map(item => {
    const raw = String(item && item.Video || "").trim();
    const videoId = youtube.getValidatedYouTubeVideoId(raw);
    return raw && videoId ? { raw, videoId, kind: classify(raw) } : null;
}).filter(Boolean);
const selected = new Map();
for (const kind of ["watch", "short", "shorts"]) {
    const item = videos.find(video => video.kind === kind);
    if (item) selected.set(kind, item);
}
console.log("Tutoriales publicados: " + catalog.data.tutoriales.length +
    "; vídeos YouTube válidos: " + videos.length +
    "; formatos disponibles: " + Array.from(selected.keys()).join(", "));

if (!selected.size) {
    console.log("NO_TEST_DATA: CATALOG no contiene tutoriales con URLs YouTube válidas; playback real queda pendiente.");
    process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const viewports = [
    { name: "desktop", width: 1366, height: 768 },
    { name: "mobile", width: 390, height: 844 }
];
try {
    for (const [kind, item] of selected) {
        const embedUrl = new URL(youtube.getValidatedYouTubeVideoEmbedUrl(item.raw));
        embedUrl.searchParams.set("origin", "https://infogpstech.github.io");
        embedUrl.searchParams.set("playsinline", "1");
        for (const viewport of viewports) {
            const context = await browser.newContext({
                viewport: { width: viewport.width, height: viewport.height },
                deviceScaleFactor: 1,
                isMobile: viewport.name === "mobile",
                hasTouch: viewport.name === "mobile",
                locale: "en-US"
            });
            try {
                const page = await context.newPage();
                page.setDefaultNavigationTimeout(45000);
                await page.goto(embedUrl.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
                await page.waitForFunction(() => {
                    const player = document.getElementById("movie_player");
                    return player && typeof player.getPlayerState === "function" &&
                        typeof player.playVideo === "function";
                }, null, { timeout: 25000 });
                await page.evaluate(() => {
                    const player = document.getElementById("movie_player");
                    player.mute();
                    player.playVideo();
                });
                try {
                    await page.waitForFunction(() => {
                        const player = document.getElementById("movie_player");
                        return player && player.getPlayerState() === 1;
                    }, null, { timeout: 18000 });
                } catch (firstError) {
                    const playButton = page.locator(".ytp-large-play-button");
                    if (await playButton.isVisible().catch(() => false)) {
                        await playButton.click({ timeout: 5000 });
                    }
                    await page.waitForFunction(() => {
                        const player = document.getElementById("movie_player");
                        return player && player.getPlayerState() === 1;
                    }, null, { timeout: 15000 });
                }
                await page.waitForTimeout(1200);
                const playing = await page.evaluate(() => {
                    const player = document.getElementById("movie_player");
                    return Boolean(player && player.getPlayerState() === 1);
                });
                if (!playing) throw new Error("El reproductor no confirmó estado playing.");
                await page.evaluate(() => document.getElementById("movie_player").pauseVideo());
                console.log("PASS YouTube playback " + kind + " " + viewport.name +
                    " (" + viewport.width + "x" + viewport.height + ")");
            } catch (error) {
                const message = String(error && error.message || error).split("\n")[0].slice(0, 220);
                failures.push({ kind, viewport: viewport.name, message });
                console.error("FAIL YouTube playback " + kind + " " + viewport.name + ": " + message);
            } finally {
                await context.close();
            }
        }
    }
} finally {
    await browser.close();
}
if (failures.length) {
    console.error("Resultado YouTube playback: " + (selected.size * viewports.length - failures.length) +
        "/" + (selected.size * viewports.length) + " PASS; " + failures.length + " fallos.");
    process.exitCode = 1;
} else {
    console.log("Resultado YouTube playback: " + (selected.size * viewports.length) +
        "/" + (selected.size * viewports.length) + " PASS.");
}
