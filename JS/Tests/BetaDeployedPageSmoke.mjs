import { chromium } from "playwright";

const target = process.env.BETA_PAGES_URL || "https://infogpstech.github.io/GPSpedia/";
const parsed = new URL(target);
if (parsed.protocol !== "https:" || parsed.hostname !== "infogpstech.github.io" ||
    parsed.pathname !== "/GPSpedia/") {
    throw new Error("BETA_PAGES_URL no coincide con el Pages Beta autorizado.");
}

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const nonGetRequests = [];
let blockedAppsScriptGets = 0;
try {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        serviceWorkers: "block"
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(String(error && error.message || error)));
    page.on("request", request => {
        if (request.method() !== "GET") nonGetRequests.push(request.method());
    });
    await page.route("**/*", route => {
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

    const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response || response.status() !== 200) {
        throw new Error("Pages Beta no respondió HTTP 200.");
    }
    await page.waitForFunction(() => {
        const modal = document.getElementById("login-modal");
        return modal && getComputedStyle(modal).display === "flex";
    }, null, { timeout: 20000 });

    await page.locator("#forgot-password-link").click();
    await page.waitForFunction(() => {
        const panel = document.getElementById("password-recovery-panel");
        const requestForm = document.getElementById("password-recovery-request-form");
        return panel && !panel.hidden && requestForm && !requestForm.hidden;
    }, null, { timeout: 5000 });
    const viewports = [
        { width: 1366, height: 768 },
        { width: 390, height: 844 },
        { width: 360, height: 800 },
        { width: 320, height: 700 }
    ];
    const recoveryLayouts = [];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        const layout = await page.evaluate(() => {
            const panel = document.getElementById("password-recovery-panel");
            const form = document.getElementById("password-recovery-request-form");
            const username = document.getElementById("password-recovery-username");
            const email = document.getElementById("password-recovery-email");
            const submit = form.querySelector("button[type='submit']");
            const panelRect = panel.getBoundingClientRect();
            const formRect = form.getBoundingClientRect();
            return {
                panelVisible: !panel.hidden && Boolean(panel.offsetWidth && panel.offsetHeight),
                formVisible: !form.hidden && Boolean(form.offsetWidth && form.offsetHeight),
                usernameVisible: Boolean(username.offsetWidth && username.offsetHeight),
                emailVisible: Boolean(email.offsetWidth && email.offsetHeight),
                submitVisible: Boolean(submit && submit.offsetWidth && submit.offsetHeight),
                completionFormHidden: document.getElementById("password-recovery-complete-form").hidden,
                panelWithinViewport: panelRect.left >= -1 && panelRect.right <= innerWidth + 1,
                formWithinViewport: formRect.left >= -1 && formRect.right <= innerWidth + 1,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: innerWidth
            };
        });
        if (!layout.panelVisible || !layout.formVisible || !layout.usernameVisible ||
            !layout.emailVisible || !layout.submitVisible || !layout.completionFormHidden ||
            !layout.panelWithinViewport || !layout.formWithinViewport ||
            layout.documentWidth > layout.viewportWidth + 1) {
            throw new Error("La pantalla de recuperación no cumple el layout en " + viewport.width + "x" + viewport.height + ".");
        }
        recoveryLayouts.push({ width: viewport.width, height: viewport.height, documentWidth: layout.documentWidth });
    }

    await page.locator("#password-recovery-back").click();
    await page.waitForFunction(() => {
        const form = document.getElementById("login-form");
        const panel = document.getElementById("password-recovery-panel");
        return form && !form.hidden && panel && panel.hidden;
    }, null, { timeout: 5000 });

    const layouts = [];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        const layout = await page.evaluate(() => {
            const modal = document.getElementById("login-modal");
            const form = document.getElementById("login-form");
            const username = document.getElementById("username");
            const password = document.getElementById("password");
            const rect = modal.getBoundingClientRect();
            const formRect = form.getBoundingClientRect();
            return {
                title: document.title,
                modalVisible: getComputedStyle(modal).display !== "none",
                formVisible: Boolean(form.offsetWidth && form.offsetHeight),
                usernameVisible: Boolean(username.offsetWidth && username.offsetHeight),
                passwordVisible: Boolean(password.offsetWidth && password.offsetHeight),
                modalWithinViewport: rect.left >= -1 && rect.right <= innerWidth + 1,
                formWithinViewport: formRect.left >= -1 && formRect.right <= innerWidth + 1,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: innerWidth
            };
        });
        if (!layout.title.includes("GPSpedia") || !layout.modalVisible ||
            !layout.formVisible || !layout.usernameVisible || !layout.passwordVisible ||
            !layout.modalWithinViewport || !layout.formWithinViewport ||
            layout.documentWidth > layout.viewportWidth + 1) {
            throw new Error("La pantalla de login no cumple el layout en " + viewport.width + "x" + viewport.height + ".");
        }
        layouts.push({ width: viewport.width, height: viewport.height, documentWidth: layout.documentWidth });
    }

    if (pageErrors.length) throw new Error("La página produjo errores JavaScript: " + pageErrors.join(" | "));
    if (nonGetRequests.length) throw new Error("Se intentó emitir una solicitud no GET; fue bloqueada.");
    console.log("Beta deployed Pages login smoke — PASS");
    console.log(JSON.stringify({
        httpStatus: response.status(),
        title: await page.title(),
        viewports: layouts,
        blockedAppsScriptGets,
        nonGetRequests: nonGetRequests.length,
        pageErrors: pageErrors.length,
        passwordRecoveryUi: recoveryLayouts,
        recoveryRequestSubmitted: false,
        credentialsSubmitted: false,
        backendWritesAllowed: false
    }));
} finally {
    await browser.close();
}
