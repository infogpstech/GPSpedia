import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const auth = readFileSync(resolve(root, "JS/Frontend/auth.js"), "utf8");
const offline = readFileSync(resolve(root, "JS/Frontend/offline.js"), "utf8");

const detailStart = ui.indexOf("export function mostrarDetalleModal(");
const detailEnd = ui.indexOf("\n    const { relay: datosRelay }", detailStart);
const detail = ui.slice(detailStart, detailEnd);
assert.match(detail, /setState\(\{ viewedItems: nextViewed \}\)/);
assert.match(detail, /offline\.saveViewedItem\(activeItem, ownerId\)\.catch/);
assert.doesNotMatch(detail, /offline\.getViewedItems/);

const loadStart = auth.indexOf("function loadUserLocalActivity(user)");
const loadEnd = auth.indexOf("\nfunction handleSessionStorageChange", loadStart);
const load = auth.slice(loadStart, loadEnd);
assert.match(load, /offline\.getSearchHistory\(ownerId\)\.then/);
assert.match(load, /offline\.getViewedItemsResult\(ownerId\)\.then/);
assert.ok(load.indexOf("offline.getSearchHistory(ownerId)") >= 0);
assert.ok(load.indexOf("loadViewedItems(0)") >= 0);
const loginStart = auth.indexOf("function handleLoginSuccess(user");
const loginEnd = auth.indexOf("\\nexport async function loadInitialData", loginStart);
const login = auth.slice(loginStart, loginEnd);
assert.ok(login.indexOf("loadUserLocalActivity(user)") >= 0);
assert.ok(login.indexOf("loadUserLocalActivity(user)") < login.indexOf("showApp(user)"),
    "El historial local debe comenzar antes de iniciar la carga de los demás carruseles.");

assert.match(load, /result\.available !== true/);
assert.match(load, /retryDelays = \[1500, 5000, 15000\]/);
assert.match(load, /isOwnerCurrent\(\)/);
assert.doesNotMatch(load, /Promise\.all/);

assert.match(auth, /previousOwnerId && previousOwnerId !== nextOwnerId[\s\S]*?searchHistory: \[\], viewedItems: \[\]/);
assert.match(offline, /const DB_VERSION = 5/);
assert.match(offline, /createIndex\('ownerId', 'ownerId'/);
assert.match(offline, /store\.index\('ownerId'\)\.getAll\(owner\)/);
assert.match(offline, /if \(all === null\) return \{ available: false, items: \[\] \}/);
assert.match(offline, /pruneViewedItems_\(owner, records\)/);
assert.match(ui, /viewedSignature/);
assert.match(ui, /lastViewedSignature/);
assert.match(ui, /function renderRecentlyViewedCarousel\(\)/);
assert.match(ui, /dataset\.recentlyViewedAnchor/);
assert.match(ui, /section\.dataset\.carouselKind = String\(options\.kind\)/);
assert.match(ui, /kind: "recently-viewed"/);
const viewedUpdateBranch = ui.slice(ui.indexOf("if (viewedChanged)"), ui.indexOf("// Solo renderizar si el contenedor"));
assert.match(viewedUpdateBranch, /renderRecentlyViewedCarousel\(\)/);
assert.doesNotMatch(viewedUpdateBranch, /mostrarCategorias\(\)/);



const cacheStoresStart = offline.indexOf("const REBUILDABLE_CLIENT_CACHE_STORES");
const cacheStoresEnd = offline.indexOf("]);", cacheStoresStart) + 3;
const cacheStores = offline.slice(cacheStoresStart, cacheStoresEnd);
// La limpieza manual de caché vacía todos los datos reconstruibles del dispositivo,
// incluidos los vistos locales de cualquier propietario, pero no toca la actividad remota.
assert.match(cacheStores, /viewedItems/);
assert.match(offline, /clearRebuildableClientCache\(ownerId = null\)/);
assert.match(offline, /transaction\.objectStore\(name\)\.clear\(\)/);
assert.match(ui, /offline\.clearRebuildableClientCache\(\)/);
assert.match(ui, /if \(indexedDbResult\.viewedItemsCleared\) setState\(\{ viewedItems: \[\] \}\)/);
assert.doesNotMatch(ui.slice(ui.indexOf("const clearCacheBtn"), ui.indexOf("const storageResults")), /recordVehicleView|routeAction|getActivityLogs/);
assert.match(detail, /recordVehicleView\(String\(activeItem\.id\), \{[\s\S]*?utilCorte1:[\s\S]*?utilCorte2:[\s\S]*?utilCorte3:[\s\S]*?\}, getSessionPayload_\(\)\)\.catch/);
assert.doesNotMatch(detail, /await\s+recordVehicleView/);
assert.doesNotMatch(load, /recordVehicleView|routeAction|getActivityLogs/);


function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}
function makeHydrationHarness({ historyPromise = Promise.resolve([]), viewedResults = [], ownerCurrent = true } = {}) {
    const calls = { history: 0, viewed: 0 };
    const states = [];
    const timers = [];
    let activeUser = { ID: "OWNER-1" };
    const offlineMock = {
        getSearchHistory(ownerId) { calls.history++; assert.equal(ownerId, "OWNER-1"); return historyPromise; },
        getViewedItemsResult(ownerId) {
            calls.viewed++; assert.equal(ownerId, "OWNER-1");
            const next = viewedResults.shift();
            return typeof next === "function" ? next() : Promise.resolve(next);
        }
    };
    const load = new Function("setState", "getState", "isCurrentSession", "offline", "setTimeout", "console",
        load + "\\nreturn loadUserLocalActivity;")(
        value => states.push(value),
        () => ({ currentUser: activeUser }),
        () => ownerCurrent,
        offlineMock,
        (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
        { warn() {} }
    );
    return { load, calls, states, timers, setActiveUser(user) { activeUser = user; } };
}
{
    const history = deferred(), viewed = deferred();
    const harness = makeHydrationHarness({ historyPromise: history.promise, viewedResults: [viewed.promise] });
    harness.load({ ID: "OWNER-1" });
    assert.deepEqual(harness.calls, { history: 1, viewed: 1 }, "Las dos lecturas deben comenzar en paralelo y sin duplicarse");
    assert.deepEqual(harness.states[0], { searchHistory: [], viewedItems: [] });
    viewed.resolve({ available: true, items: [{ id: "VEH-1", data: { id: "VEH-1" } }] });
    await Promise.resolve(); await Promise.resolve();
    assert.ok(harness.states.some(value => Array.isArray(value.viewedItems) && value.viewedItems[0]?.id === "VEH-1"),
        "El carrusel debe hidratarse sin esperar a que termine el historial de búsqueda");
    assert.equal(harness.calls.history, 1);
    assert.equal(harness.calls.viewed, 1);
}
{
    const viewed = deferred();
    const harness = makeHydrationHarness({ viewedResults: [viewed.promise] });
    harness.load({ ID: "OWNER-1" });
    harness.setActiveUser({ ID: "OWNER-2" });
    viewed.resolve({ available: true, items: [{ id: "OTHER-OWNER" }] });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(harness.states.some(value => Array.isArray(value.viewedItems) && value.viewedItems.length), false,
        "Una respuesta tardía no debe hidratar el historial de otra cuenta");
}
{
    const harness = makeHydrationHarness({ viewedResults: [
        { available: false, items: [] },
        { available: true, items: [{ id: "RECOVERED", data: { id: "RECOVERED" } }] }
    ] });
    harness.load({ ID: "OWNER-1" });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(harness.timers.length, 1);
    assert.equal(harness.timers[0].delay, 1500);
    harness.timers[0].callback();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(harness.calls.history, 1, "La recuperación no debe volver a consultar historial de búsqueda");
    assert.equal(harness.calls.viewed, 2, "Solo se repite la lectura local que no estuvo disponible");
    assert.ok(harness.states.some(value => Array.isArray(value.viewedItems) && value.viewedItems[0]?.id === "RECOVERED"));
}
console.log("RecentlyViewedHydrationParallel: 3/3 PASS — paralelismo, IndexedDB no disponible, cambio de propietario y ausencia de lecturas duplicadas");

console.log("1/1 PASS — RecentlyViewedCarousel contract");
