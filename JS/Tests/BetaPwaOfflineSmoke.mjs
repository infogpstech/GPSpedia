import { chromium } from "playwright";

const target = process.env.BETA_PAGES_URL || "https://infogpstech.github.io/GPSpedia/";
const base = new URL(target);
if (base.protocol !== "https:" || base.hostname !== "infogpstech.github.io" ||
    base.pathname !== "/GPSpedia/") {
    throw new Error("BETA_PAGES_URL no coincide con el Pages Beta autorizado.");
}

const manifestUrl = new URL("manifest.json", base);
const manifestResponse = await fetch(manifestUrl, { signal: AbortSignal.timeout(15000) });
if (!manifestResponse.ok) throw new Error("manifest.json no responde HTTP 200.");
const manifest = await manifestResponse.json();
if (!manifest || manifest.display !== "standalone" || !manifest.name ||
    !manifest.short_name || !manifest.start_url || !Array.isArray(manifest.icons)) {
    throw new Error("Manifest PWA incompleto.");
}
const startUrl = new URL(manifest.start_url, manifestUrl);
const scopeUrl = new URL(manifest.scope || "./", manifestUrl);
if (startUrl.origin !== base.origin || scopeUrl.origin !== base.origin ||
    !startUrl.pathname.startsWith(scopeUrl.pathname)) {
    throw new Error("start_url no pertenece al scope declarado del manifest.");
}
const iconResults = [];
for (const expected of [192, 512]) {
    const icon = manifest.icons.find(item => String(item.sizes || "").split(/\s+/).includes(expected + "x" + expected));
    if (!icon) throw new Error("Falta icono PWA " + expected + "x" + expected + ".");
    const iconUrl = new URL(icon.src, manifestUrl);
    const iconResponse = await fetch(iconUrl, { signal: AbortSignal.timeout(15000) });
    if (!iconResponse.ok) throw new Error("Icono PWA " + expected + " no responde HTTP 200.");
    const bytes = Buffer.from(await iconResponse.arrayBuffer());
    if (bytes.length < 24 || bytes.toString("hex", 0, 4) !== "89504e47" ||
        bytes.readUInt32BE(16) !== expected || bytes.readUInt32BE(20) !== expected) {
        throw new Error("Dimensiones o formato PNG incorrectos para icono " + expected + ".");
    }
    iconResults.push({ size: expected, status: iconResponse.status, bytes: bytes.length });
}

const serviceWorkerUrl = new URL("service-worker.js", base);
const serviceWorkerResponse = await fetch(serviceWorkerUrl, { signal: AbortSignal.timeout(15000) });
if (!serviceWorkerResponse.ok) throw new Error("service-worker.js no responde HTTP 200.");
const serviceWorkerSource = await serviceWorkerResponse.text();
const coreBlock = serviceWorkerSource.match(/const CORE_ASSETS=\[([\s\S]*?)\];/);
if (!coreBlock) throw new Error("No se encontró CORE_ASSETS en service-worker.js.");
const coreAssetList = [...coreBlock[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
const coreAssets = new Set(coreAssetList);
const optionalBlock = serviceWorkerSource.match(/const OPTIONAL_ASSETS=\[([\s\S]*?)\];/);
const optionalAssets = optionalBlock
    ? [...optionalBlock[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1])
    : [];
async function checkStaticAsset(asset) {
    try {
        const response = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(12000) });
        return { asset, status: response.status, ok: response.ok };
    } catch (error) {
        return { asset, status: null, ok: false, error: String(error && error.message || error) };
    }
}
const coreAssetResults = await Promise.all(coreAssetList.map(checkStaticAsset));
const optionalAssetResults = await Promise.all(optionalAssets.map(checkStaticAsset));
const missingCoreAssets = coreAssetResults.filter(result => !result.ok);
const moduleQueue = ["./JS/Frontend/main.js"];
const visitedModules = new Set();
while (moduleQueue.length) {
    const modulePath = moduleQueue.shift();
    if (visitedModules.has(modulePath)) continue;
    visitedModules.add(modulePath);
    const moduleUrl = new URL(modulePath, base);
    const moduleResponse = await fetch(moduleUrl, { signal: AbortSignal.timeout(15000) });
    if (!moduleResponse.ok) throw new Error("Módulo frontend no disponible: " + modulePath);
    const moduleSource = await moduleResponse.text();
    const specifiers = [...moduleSource.matchAll(/(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+)['"]([^'"]+)['"]/g)]
        .map(match => match[1])
        .filter(specifier => specifier.startsWith("./") && (specifier.endsWith(".js") || specifier.endsWith(".mjs")));
    for (const specifier of specifiers) {
        const resolved = new URL(specifier, moduleUrl);
        if (resolved.origin !== base.origin || !resolved.pathname.startsWith(base.pathname)) continue;
        const relative = "./" + resolved.pathname.slice(base.pathname.length);
        if (!visitedModules.has(relative)) moduleQueue.push(relative);
    }
}
const missingPrecacheModules = [...visitedModules].filter(modulePath => !coreAssets.has(modulePath));

const browser = await chromium.launch({ headless: true });
const nonGetRequests = [];
const pageErrors = [];
const failedRequests = [];
const consoleErrors = [];
let blockedAppsScriptGets = 0;
try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        serviceWorkers: "allow"
    });
    await context.route("**/*", route => {
        const request = route.request();
        const requestUrl = new URL(request.url());
        if (request.method() !== "GET") return route.abort();
        if (requestUrl.hostname === "script.google.com" ||
            requestUrl.hostname === "script.googleusercontent.com") {
            blockedAppsScriptGets++;
            return route.abort();
        }
        return route.continue();
    });
    const page = await context.newPage();
    page.on("request", request => {
        if (request.method() !== "GET") nonGetRequests.push(request.method());
    });
    page.on("pageerror", error => pageErrors.push(String(error && error.message || error)));
    page.on("requestfailed", request => failedRequests.push({
        path: new URL(request.url()).pathname,
        error: request.failure() && request.failure().errorText
    }));
    page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });

    const onlineResponse = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!onlineResponse || onlineResponse.status() !== 200) throw new Error("Pages no carga online.");
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
    const registration = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return {
            scope: reg.scope,
            activeScript: reg.active && reg.active.scriptURL,
            controller: Boolean(navigator.serviceWorker.controller)
        };
    });
    if (!registration.controller || !registration.activeScript ||
        !registration.activeScript.endsWith("/service-worker.js")) {
        throw new Error("Service Worker no quedó activo/controlando la página.");
    }

    await context.setOffline(true);
    let offlineResponse = null;
    let offlineReloadError = null;
    try {
        offlineResponse = await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (error) {
        offlineReloadError = String(error && error.message || error);
    }
    let offlineLoginVisible = false;
    let offlineWaitError = null;
    try {
        await page.waitForFunction(() => {
            const modal = document.getElementById("login-modal");
            return modal && getComputedStyle(modal).display === "flex";
        }, null, { timeout: 15000 });
        offlineLoginVisible = true;
    } catch (error) {
        offlineWaitError = String(error && error.message || error);
    }
    const offlineState = await page.evaluate(async () => {
        const modal = document.getElementById("login-modal");
        const names = await caches.keys();
        const cachedPaths = [];
        for (const name of names) {
            const cache = await caches.open(name);
            for (const request of await cache.keys()) {
                cachedPaths.push(new URL(request.url).pathname);
            }
        }
        return {
            online: navigator.onLine,
            title: document.title,
            loginVisible: Boolean(modal && getComputedStyle(modal).display === "flex"),
            serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
            cachedPaths
        };
    });
    const coldFailedRequests = [...failedRequests];
    const coldConsoleErrors = [...consoleErrors];
    const coldPageErrors = [...pageErrors];
    const coldDiagnostics = {
        offlineReloadError,
        offlineWaitError,
        offlineState,
        failedRequests: coldFailedRequests,
        consoleErrors: coldConsoleErrors,
        pageErrors: coldPageErrors
    };

    await context.setOffline(false);
    let warmOnlineLoginVisible = false;
    let warmOnlineReloadError = null;
    try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForFunction(() => {
            const modal = document.getElementById("login-modal");
            return modal && getComputedStyle(modal).display === "flex";
        }, null, { timeout: 15000 });
        warmOnlineLoginVisible = true;
    } catch (error) {
        warmOnlineReloadError = String(error && error.message || error);
    }
    const warmCachePaths = await page.evaluate(async () => {
        const paths = [];
        for (const name of await caches.keys()) {
            const cache = await caches.open(name);
            for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
        }
        return paths;
    });
    const warmMissingPrecacheModules = missingPrecacheModules.filter(modulePath =>
        !warmCachePaths.includes(new URL(modulePath, base).pathname));

    await context.setOffline(true);
    let warmOfflineResponse = null;
    let warmOfflineReloadError = null;
    try {
        warmOfflineResponse = await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (error) {
        warmOfflineReloadError = String(error && error.message || error);
    }
    let warmOfflineLoginVisible = false;
    let warmOfflineWaitError = null;
    try {
        await page.waitForFunction(() => {
            const modal = document.getElementById("login-modal");
            return modal && getComputedStyle(modal).display === "flex";
        }, null, { timeout: 15000 });
        warmOfflineLoginVisible = true;
    } catch (error) {
        warmOfflineWaitError = String(error && error.message || error);
    }
    const warmOfflineState = await page.evaluate(() => ({
        online: navigator.onLine,
        title: document.title,
        loginVisible: Boolean(document.getElementById("login-modal") &&
            getComputedStyle(document.getElementById("login-modal")).display === "flex"),
        serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)
    }));
    const warmDiagnostics = {
        warmOnlineLoginVisible,
        warmOnlineReloadError,
        warmMissingPrecacheModules,
        warmOfflineReloadError,
        warmOfflineWaitError,
        warmOfflineLoginVisible,
        warmOfflineState,
        failedRequests: failedRequests.slice(coldFailedRequests.length),
        consoleErrors: consoleErrors.slice(coldConsoleErrors.length),
        pageErrors: pageErrors.slice(coldPageErrors.length),
        nonGetRequests
    };
    console.log("Beta PWA cold/warm offline diagnostics");
    console.log(JSON.stringify({
        missingPrecacheModules,
        missingCoreAssets,
        optionalAssetResults,
        coldDiagnostics,
        warmDiagnostics
    }));
    if (missingPrecacheModules.length || missingCoreAssets.length || offlineReloadError ||
        !offlineLoginVisible || offlineState.online || !offlineState.loginVisible ||
        !offlineState.title.includes("GPSpedia") || nonGetRequests.length || pageErrors.length) {
        throw new Error("La navegación offline en primera carga no conservó la pantalla de login; revisar diagnósticos cold/warm.");
    }

    console.log("Beta PWA manifest and offline navigation — PASS");
    console.log(JSON.stringify({
        manifest: {
            display: manifest.display,
            startUrl: startUrl.pathname,
            scope: scopeUrl.pathname,
            icons: iconResults
        },
        serviceWorker: registration,
        coreAssetsChecked: coreAssetResults.length,
        optionalAssetsChecked: optionalAssetResults.length,
        missingCoreAssets,
        onlineHttpStatus: onlineResponse.status(),
        offlineHttpStatus: offlineResponse ? offlineResponse.status() : null,
        offlineLoginVisible: offlineState.loginVisible,
        warmOnlineLoginVisible,
        warmOfflineHttpStatus: warmOfflineResponse ? warmOfflineResponse.status() : null,
        warmOfflineLoginVisible,
        warmMissingPrecacheModules,
        blockedAppsScriptGets,
        nonGetRequests: nonGetRequests.length,
        pageErrors: pageErrors.length,
        credentialsSubmitted: false,
        backendWritesAllowed: false
    }));
    await context.setOffline(false);
    await context.close();
} finally {
    await browser.close();
}
