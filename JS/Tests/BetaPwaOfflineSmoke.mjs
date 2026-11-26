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

const browser = await chromium.launch({ headless: true });
const nonGetRequests = [];
const pageErrors = [];
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
    const offlineResponse = await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForFunction(() => {
        const modal = document.getElementById("login-modal");
        return modal && getComputedStyle(modal).display === "flex";
    }, null, { timeout: 15000 });
    const offlineState = await page.evaluate(() => ({
        online: navigator.onLine,
        title: document.title,
        loginVisible: getComputedStyle(document.getElementById("login-modal")).display === "flex"
    }));
    if (offlineState.online || !offlineState.loginVisible ||
        !offlineState.title.includes("GPSpedia")) {
        throw new Error("La navegación offline no conservó la pantalla de login.");
    }
    if (nonGetRequests.length || pageErrors.length) {
        throw new Error("El smoke PWA produjo solicitudes no-GET o errores JavaScript.");
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
        onlineHttpStatus: onlineResponse.status(),
        offlineHttpStatus: offlineResponse ? offlineResponse.status() : null,
        offlineLoginVisible: offlineState.loginVisible,
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
