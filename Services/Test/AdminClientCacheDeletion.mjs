import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uiSource = readFileSync(new URL("../../ui.js", import.meta.url), "utf8");
const helperMatch = uiSource.match(/function deleteIndexedDatabase_\(windowRef, databaseName\) \{[\s\S]*?\n\}/);
assert.ok(helperMatch, "No se encontró deleteIndexedDatabase_.");
const deleteIndexedDatabase_ = new Function(helperMatch[0] + "\nreturn deleteIndexedDatabase_;")();

let passed = 0;
async function check(name, fn) {
    await fn();
    passed++;
    console.log("PASS " + name);
}
function deferredRequest() {
    return { request: { error: null }, trigger(type, error) {
        if (error) this.request.error = error;
        const handler = this.request["on" + type];
        if (typeof handler === "function") handler({ type, target: this.request });
    }};
}

await check("Espera onsuccess antes de confirmar la eliminación", async () => {
    const deferred = deferredRequest();
    const promise = deleteIndexedDatabase_({ indexedDB: { deleteDatabase(name) {
        assert.equal(name, "GPSpedia_DB");
        return deferred.request;
    }}}, "GPSpedia_DB");
    let settled = false;
    promise.then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(settled, false);
    deferred.trigger("success");
    assert.deepEqual(await promise, { status: "success", message: "Base de datos eliminada." });
});
await check("Distingue onerror y conserva el mensaje del navegador", async () => {
    const deferred = deferredRequest();
    const promise = deleteIndexedDatabase_({ indexedDB: { deleteDatabase: () => deferred.request } }, "GPSpedia_DB");
    deferred.trigger("error", { message: "Quota/permission failure" });
    assert.deepEqual(await promise, { status: "error", message: "Quota/permission failure" });
});
await check("onblocked informa bloqueo sin anunciar éxito ni esperar indefinidamente", async () => {
    const deferred = deferredRequest();
    const promise = deleteIndexedDatabase_({ indexedDB: { deleteDatabase: () => deferred.request } }, "GPSpedia_DB");
    deferred.trigger("blocked");
    assert.deepEqual(await promise, {
        status: "blocked",
        message: "La eliminación está bloqueada por conexiones abiertas a IndexedDB."
    });
    deferred.trigger("success");
});
await check("La indisponibilidad de IndexedDB se informa explícitamente", async () => {
    assert.equal((await deleteIndexedDatabase_(null, "GPSpedia_DB")).status, "unavailable");
    assert.equal((await deleteIndexedDatabase_({}, "GPSpedia_DB")).status, "unavailable");
});
await check("Captura excepciones al acceder a la API o iniciar deleteDatabase", async () => {
    const inaccessible = {};
    Object.defineProperty(inaccessible, "indexedDB", { get() { throw new Error("SecurityError"); } });
    assert.deepEqual(await deleteIndexedDatabase_(inaccessible, "GPSpedia_DB"), { status: "error", message: "SecurityError" });
    assert.deepEqual(await deleteIndexedDatabase_({ indexedDB: { deleteDatabase() { throw new Error("InvalidStateError"); } } }, "GPSpedia_DB"),
        { status: "error", message: "InvalidStateError" });
});
await check("El handler espera IndexedDB, informa localStorage por separado y solo recarga tras éxito total", async () => {
    const start = uiSource.indexOf("// Vaciar Caché Local de Cliente (IndexedDB/Storage)");
    const end = uiSource.indexOf("// Ejecutar únicamente las limpiezas seleccionadas", start);
    assert.ok(start >= 0 && end > start);
    const handler = uiSource.slice(start, end);
    assert.ok(handler.includes("await deleteIndexedDatabase_(window, 'GPSpedia_DB')"));
    assert.ok(handler.includes("localStorage.removeItem(key)"));
    assert.ok(handler.includes("storageResults.push({ key, success: true })"));
    assert.ok(handler.includes('indexedDbResult.status === "success" && storageSucceeded'));
    assert.ok(handler.indexOf("indexedDbResult.status === \"success\" && storageSucceeded") < handler.indexOf("window.location.reload()"));
    assert.ok(handler.includes('indexedDbResult.status !== "success"'));
    assert.ok(handler.includes("No se recargó la aplicación."));
    assert.ok(handler.includes("finally {\n                clearCacheBtn.disabled = false;"));
});
console.log("AdminClientCacheDeletion: " + passed + "/" + passed + " PASS");
