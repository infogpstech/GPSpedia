import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const main = readFileSync(resolve(root, "JS/Frontend/main.js"), "utf8");
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("initializeApp solo se ejecuta una vez según DOMContentLoaded", () => {
    assert.equal((main.match(/async function initializeApp\(/g) || []).length, 1);
    assert.match(main, /if \(document\.readyState === 'loading'\) \{\s*document\.addEventListener\('DOMContentLoaded', initializeApp\);\s*\} else \{\s*initializeApp\(\);\s*\}/);
    assert.doesNotMatch(main, /window\.initializeApp|export\s+(?:async\s+)?function initializeApp/);
});

test("banner de estado registra un solo handler y una sola suscripción", () => {
    const start = main.indexOf("function installCatalogStatusBanner_()");
    const end = main.indexOf("async function initializeApp()", start);
    const block = main.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(block, /banner\.dataset\.bound === 'true'/);
    assert.match(block, /banner\.dataset\.bound = 'true'/);
    assert.match(block, /retryButton\.addEventListener\('click'/);
    assert.match(block, /state\.subscribe\(render\)/);
    assert.ok(block.indexOf("banner.dataset.bound = 'true'") < block.indexOf("retryButton.addEventListener"));
});

test("sincronización periódica Inbox reemplaza el timer anterior", () => {
    const start = ui.indexOf("function startInboxSync_()");
    const end = ui.indexOf("\nfunction ", start + 10);
    const block = ui.slice(start, end);
    assert.match(block, /stopInboxSync_\(\)/);
    assert.match(block, /window\.setInterval/);
    assert.match(ui, /function stopInboxSync_\(\)[\s\S]*?clearInterval\(inboxConversationSyncTimer_\)/);
});

test("listeners globales de conectividad Inbox se registran una sola vez", () => {
    assert.match(ui, /if \(!inboxConnectivityBound_\) \{[\s\S]*?window\.addEventListener\("online"/);
    assert.match(ui, /document\.addEventListener\("visibilitychange"/);
    assert.match(ui, /inboxConnectivityBound_ = true/);
});

test("refresh global ADMIN y ayuda contextual protegen su inicialización", () => {
    assert.match(ui, /if \(!window\.adminGlobalServiceTrafficRefreshInterval\)/);
    assert.match(ui, /function ensureContextualHelpGlobalListeners_\(\)[\s\S]*?if \(gpContextHelpGlobalListenersInstalled_\) return/);
    assert.match(ui, /gpContextHelpGlobalListenersInstalled_ = true/);
});

test("reintento de aceptación de términos instala un solo listener online", () => {
    assert.match(ui, /function ensureTermsAcceptanceOnlineRetry_\(\)[\s\S]*?if \(termsAcceptanceOnlineRetryBound_ \|\|/);
    assert.match(ui, /termsAcceptanceOnlineRetryBound_ = true/);
});

test("carruseles comparten un único listener resize global", () => {
    assert.equal((ui.match(/window\.addEventListener\("resize", scheduleCarouselButtonsResize_/g) || []).length, 1);
});

test("menús de imágenes retiradas eliminan listeners al cerrar", () => {
    assert.match(ui, /removeEventListener\("click", closeMenusHandler\)/);
    assert.match(ui, /removeEventListener\("keydown", closeMenusKeyHandler\)/);
});

test("modales informativos liberan listeners viewport y window al cerrar", () => {
    assert.match(ui, /viewport\?\.removeEventListener\("resize", updateViewportLayout\)/);
    assert.match(ui, /viewport\?\.removeEventListener\("scroll", updateViewportLayout\)/);
    assert.match(ui, /window\.removeEventListener\("resize", updateViewportLayout\)/);
});

test("ciclo de foco de términos elimina keydown y MutationObserver", () => {
    assert.match(ui, /document\.removeEventListener\('keydown', handleKeydown, true\)/);
    assert.match(ui, /if \(observer\) observer\.disconnect\(\)/);
});

test("observer de overlays del App Shell se instala una vez en initializeApp", () => {
    assert.equal((main.match(/new MutationObserver\(registerVisibleOverlays_\)/g) || []).length, 1);
    assert.match(main, /overlayObserver\.observe\(document\.body/);
});

console.log("UIInitializationLifecycle: " + passed + "/" + passed + " PASS");
