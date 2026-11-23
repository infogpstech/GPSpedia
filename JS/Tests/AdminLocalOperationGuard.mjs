import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function withAdminLocalOperationGuard_(");
assert.ok(start >= 0, "No se encontró la guarda local ADMIN.");
const end = admin.indexOf("\nfunction ", start + 10);
const source = admin.slice(start, end > start ? end : admin.length);
const guard = new Function(source + "\nreturn withAdminLocalOperationGuard_;")();

function harness() {
    const values = new Map();
    let now = 1000, id = 0, lockHeld = false, busy = false, cleanupBusy = false;
    const properties = {
        getProperty(key) { return values.has(key) ? values.get(key) : null; },
        setProperty(key, value) { values.set(key, value); },
        deleteProperty(key) { values.delete(key); }
    };
    const lockService = {
        getScriptLock() {
            return {
                tryLock(waitMs) {
                    if (waitMs === 1000 && cleanupBusy) return false;
                    if (busy || lockHeld) return false;
                    lockHeld = true;
                    return true;
                },
                releaseLock() {
                    assert.equal(lockHeld, true, "No se debe liberar un lock que no se adquirió.");
                    lockHeld = false;
                }
            };
        }
    };
    return {
        values, properties,
        run(scope, callback, ttlSeconds = 30) {
            return guard(scope, callback, ttlSeconds, {
                properties, lockService, now: () => now,
                uuid: () => "request-" + (++id),
                hashScope: value => value
            });
        },
        setNow(value) { now = value; },
        setBusy(value) { busy = value; },
        setCleanupBusy(value) { cleanupBusy = value; },
        get lockHeld() { return lockHeld; }
    };
}

let passed = 0;
function test(name, callback) { callback(); passed++; console.log("PASS " + name); }

test("reserva el recurso y libera ScriptLock antes del trabajo prolongado", () => {
    const h = harness();
    const result = h.run("drive-audit:A1", () => {
        assert.equal(h.lockHeld, false, "El callback no debe ejecutarse bajo ScriptLock.");
        assert.equal(h.values.size, 1, "El marcador debe persistir durante el trabajo.");
        return 42;
    });
    assert.equal(result, 42);
    assert.equal(h.lockHeld, false);
    assert.equal(h.values.size, 0, "La reserva se limpia después del trabajo.");
});

test("rechaza en paralelo la misma operación sin bloquear recursos distintos", () => {
    const h = harness();
    const result = h.run("drive-audit:A1", () => {
        assert.throws(() => h.run("drive-audit:A1", () => "duplicado"), /ya está en curso/);
        return h.run("drive-audit:B2", () => 2);
    });
    assert.equal(result, 2);
    assert.equal(h.values.size, 0);
});

test("libera la reserva aunque el callback termine con error", () => {
    const h = harness();
    assert.throws(() => h.run("drive-inventory:U1", () => { throw new Error("fallo de operación"); }), /fallo de operación/);
    assert.equal(h.values.size, 0);
    assert.equal(h.run("drive-inventory:U1", () => "reintento"), "reintento");
});

test("un marcador cuyo cleanup no obtiene lock expira y puede recuperarse", () => {
    const h = harness();
    h.setCleanupBusy(true);
    assert.equal(h.run("create-folder:modelo", () => "ok"), "ok");
    assert.equal(h.values.size, 1, "El marcador queda temporalmente hasta su TTL.");
    h.setCleanupBusy(false);
    h.setNow(32001);
    assert.equal(h.run("create-folder:modelo", () => "recuperado"), "recuperado");
    assert.equal(h.values.size, 0);
});

test("falla rápido si el lock de reserva está ocupado y no ejecuta el callback", () => {
    const h = harness();
    let called = false;
    h.setBusy(true);
    assert.throws(() => h.run("drive-audit:A1", () => { called = true; }), /registro local.*ocupado/);
    assert.equal(called, false);
    assert.equal(h.values.size, 0);
    assert.equal(h.lockHeld, false);
});

test("rechaza alcance vacío o callback inválido", () => {
    const h = harness();
    assert.throws(() => h.run("", () => 1), /alcance y una función válidos/);
    assert.throws(() => h.run("scope", null), /alcance y una función válidos/);
});

console.log("AdminLocalOperationGuard: " + passed + "/6 PASS");
assert.equal(passed, 6);
