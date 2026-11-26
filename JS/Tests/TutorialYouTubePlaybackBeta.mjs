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

console.log("CATALOG tutorial snapshot: POST getCatalogData read-only; forceRefresh=true para evitar caché heredada.");
const response = await fetch(catalogUrl, {
    method: "POST",
    redirect: "follow",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ action: "getCatalogData", payload: { forceRefresh: true } }),
    signal: AbortSignal.timeout(30000)
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
    } catch { return "id"; }
}
const videos = catalog.data.tutoriales.map(item => {
    const raw = String(item && item.Video || "").trim();
    const videoId = youtube.getValidatedYouTubeVideoId(raw);
    return raw && videoId ? { raw, videoId, kind: classify(raw) } : null;
}).filter(Boolean);
const uniqueVideos = Array.from(new Map(videos.map(video => [video.videoId, video])).values()).slice(0, 3);
console.log("Tutoriales publicados: " + catalog.data.tutoriales.length +
    "; URLs YouTube válidas: " + videos.length +
    "; IDs únicos inspeccionados: " + uniqueVideos.length +
    "; formatos fuente: " + Array.from(new Set(videos.map(video => video.kind))).join(", "));

if (!uniqueVideos.length) {
    console.log("NO_TEST_DATA: CATALOG no contiene tutoriales con URLs YouTube válidas; playback real queda pendiente.");
    process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const viewports = [
    { name: "desktop", width: 1366, height: 768, isMobile: false },
    { name: "mobile", width: 390, height: 844, isMobile: true }
];

async function inspectPlayer(page) {
    return page.evaluate(() => {
        const player = document.getElementById("movie_player");
        let state = null, hasVideoData = false;
        try {
            if (player && typeof player.getPlayerState === "function") state = player.getPlayerState();
            if (player && typeof player.getVideoData === "function") {
                const data = player.getVideoData();
                hasVideoData = Boolean(data && data.video_id);
            }
        } catch (error) {}
        const errorNode = document.querySelector(".ytp-error-content-wrap, .ytp-error");
        const video = document.querySelector("video");
        return {
            state,
            hasVideoData,
            errorText: errorNode ? String(errorNode.innerText || "").trim().slice(0, 180) : "",
            videoReadyState: video ? video.readyState : null,
            videoPaused: video ? video.paused : null,
            videoErrorCode: video && video.error ? video.error.code : null
        };
    });
}

async function tryPlayback(video, viewport, attempt) {
    const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        locale: "en-US"
    });
    try {
        const page = await context.newPage();
        page.setDefaultNavigationTimeout(30000);
        await page.setExtraHTTPHeaders({ Referer: "https://infogpstech.github.io/GPSpedia/" });
        const embedUrl = new URL(youtube.getValidatedYouTubeVideoEmbedUrl(video.raw));
        embedUrl.searchParams.set("origin", "https://infogpstech.github.io");
        embedUrl.searchParams.set("playsinline", "1");
        const response = await page.goto(embedUrl.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
        if (!response || response.status() >= 400) throw new Error("HTTP del reproductor no válido.");
        await page.waitForFunction(() => {
            const player = document.getElementById("movie_player");
            return player && typeof player.getPlayerState === "function" &&
                typeof player.playVideo === "function";
        }, null, { timeout: 15000 });

        const playButton = page.locator(".ytp-large-play-button");
        if (await playButton.isVisible().catch(() => false)) {
            await playButton.click({ timeout: 3000 }).catch(() => {});
        } else {
            await page.locator("#movie_player").click({ timeout: 3000 }).catch(() => {});
        }
        await page.evaluate(() => {
            const player = document.getElementById("movie_player");
            if (player && typeof player.mute === "function") player.mute();
            if (player && typeof player.playVideo === "function") player.playVideo();
        });
        try {
            await page.waitForFunction(() => {
                const player = document.getElementById("movie_player");
                return player && player.getPlayerState() === 1;
            }, null, { timeout: 12000 });
        } catch (error) {
            const diagnostics = await inspectPlayer(page);
            console.log("DIAGNOSTIC playback attempt " + attempt + " " + viewport.name + ": " +
                JSON.stringify(diagnostics));
            return false;
        }
        await page.waitForTimeout(1000);
        const playing = await page.evaluate(() => {
            const player = document.getElementById("movie_player");
            return Boolean(player && player.getPlayerState() === 1);
        });
        if (!playing) {
            console.log("DIAGNOSTIC playback attempt " + attempt + " " + viewport.name + ": " +
                JSON.stringify(await inspectPlayer(page)));
            return false;
        }
        await page.evaluate(() => document.getElementById("movie_player").pauseVideo());
        console.log("PASS YouTube playback attempt " + attempt + " " + video.kind +
            " " + viewport.name + " (" + viewport.width + "x" + viewport.height + ")");
        return true;
    } catch (error) {
        const message = String(error && error.message || error).split("\n")[0].slice(0, 180);
        console.log("DIAGNOSTIC navigation/player attempt " + attempt + " " + viewport.name + ": " + message);
        return false;
    } finally {
        await context.close();
    }
}

let successfulVideo = null;
try {
    for (let index = 0; index < uniqueVideos.length; index++) {
        const video = uniqueVideos[index];
        const attempt = index + 1;
        const desktopPass = await tryPlayback(video, viewports[0], attempt);
        if (!desktopPass) continue;
        const mobilePass = await tryPlayback(video, viewports[1], attempt);
        if (mobilePass) {
            successfulVideo = video;
            break;
        }
    }
} finally {
    await browser.close();
}
if (!successfulVideo) {
    console.error("Resultado YouTube playback: 0 videos confirmados en escritorio y móvil; revisar diagnóstico del reproductor/embebido.");
    process.exitCode = 1;
} else {
    const id = successfulVideo.videoId;
    const variants = [
        "https://www.youtube.com/watch?v=" + id,
        "https://youtu.be/" + id,
        "https://www.youtube.com/shorts/" + id
    ];
    const normalized = variants.map(value => youtube.getValidatedYouTubeVideoEmbedUrl(value));
    if (normalized.some(value => value !== normalized[0] || !value)) {
        throw new Error("Las variantes watch/short/shorts no convergen al mismo embed.");
    }
    console.log("PASS reproducción real en desktop y móvil; watch/short/shorts convergen al mismo embed canónico.");
}
