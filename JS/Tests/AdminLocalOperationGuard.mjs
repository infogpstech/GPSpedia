import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function withAdminLocalOperationGuard_(scope, callback, ttlSeconds, dependencies) {");
const end = admin.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró withAdminLocalOperationGuard_.");
const helperSource = admin.slice(start, end);
const withAdminLocalOperationGuard_ = new Function(helperSource + "\nreturn withAdminLocalOperationGuard_;")();

const store = Object.create(null);
let lockHeld = false;
let uuidCounter = 0;
let now = 1700000000000;
const properties = {
    getProperty: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setProperty: (key, value) => { store[key] = String(value); },
    deleteProperty: key => { delete store[key]; }
};
const lockService = {
    getScriptLock: () => ({
        tryLock: () => {
            if (lockHeld) return false;
            lockHeld = true;
            return true;
        },
        releaseLock: () => { lockHeld = false; }
    })
};
const dependencies = {
    properties,
    lockService,
    uuid: () => "local-operation-" + (++uuidCounter),
    now: () => now,
    hashScope: value => "HASH_" + value
};

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("la guarda usa un marcador local y ejecuta el callback sin retener ScriptLock", () => {
    const result = withAdminLocalOperationGuard_("audit:a-1", () => {
        assert.equal(lockHeld, false);
        assert.ok(Object.keys(store).some(key => key === "GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_HASH_audit:a-1"));
        return "completed";
    }, 120, dependencies);
    assert.equal(result, "completed");
    assert.equal(lockHeld, false);
    assert.equal(Object.keys(store).length, 0);
});

test("bloquea una segunda ejecución del mismo recurso", () => {
    withAdminLocalOperationGuard_("audit:a-2", () => {
        assert.throws(() => withAdminLocalOperationGuard_("audit:a-2", () => true, 120, dependencies), /ya está en curso/);
    }, 120, dependencies);
    assert.equal(Object.keys(store).length, 0);
});

test("permite operaciones simultáneas sobre recursos diferentes", () => {
    const result = withAdminLocalOperationGuard_("audit:a-3", () =>
        withAdminLocalOperationGuard_("audit:a-4", () => "independent", 120, dependencies), 120, dependencies);
    assert.equal(result, "independent");
    assert.equal(Object.keys(store).length, 0);
});

test("limpia el marcador cuando el callback falla", () => {
    assert.throws(() => withAdminLocalOperationGuard_("inventory:a-1", () => {
        throw new Error("simulated failure");
    }, 120, dependencies), /simulated failure/);
    assert.equal(Object.keys(store).length, 0);
    assert.equal(lockHeld, false);
});

test("reemplaza marcadores expirados y limita TTL a 420 segundos", () => {
    store["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_HASH_inventory:a-2"] = JSON.stringify({
        requestId: "expired", expiresAt: now - 1
    });
    withAdminLocalOperationGuard_("inventory:a-2", () => {
        const marker = JSON.parse(store["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_HASH_inventory:a-2"]);
        assert.equal(marker.expiresAt, now + 420000);
        assert.notEqual(marker.requestId, "expired");
    }, 9999, dependencies);
    assert.equal(Object.keys(store).length, 0);
});

test("falla cerrado si no puede reservar el lock local corto", () => {
    const busyLockService = { getScriptLock: () => ({ tryLock: () => false, releaseLock: () => {} }) };
    assert.throws(() => withAdminLocalOperationGuard_("folder:a", () => true, 120,
        { ...dependencies, lockService: busyLockService }), /está ocupado/);
});

test("las tres operaciones ADMIN usan guardas locales por recurso", () => {
    assert.doesNotMatch(admin, /withSharedMutationLease_/);
    assert.match(admin, /drive-inventory:/);
    assert.match(admin, /create-cortes-image-folder:/);
    assert.match(admin, /drive-audit:/);
    assert.match(admin, /withAdminLocalOperationGuard_\("drive-audit:"/);
});

test("la guarda no realiza llamadas remotas ni lee URLs o secretos", () => {
    assert.doesNotMatch(helperSource, /UrlFetchApp|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|SharedMutation/);
    assert.match(helperSource, /PropertiesService\.getScriptProperties/);
    assert.match(helperSource, /lockService\.getScriptLock/);
});

console.log("AdminLocalOperationGuard: " + passed + "/8 PASS");
assert.equal(passed, 8);
