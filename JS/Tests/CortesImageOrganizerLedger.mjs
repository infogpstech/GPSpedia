import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extractFunction(name) {
    const start = admin.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = admin.indexOf("\nfunction ", start + 10);
    const end = next >= 0 ? next : admin.length;
    const block = admin.slice(start, end);
    const close = block.lastIndexOf("\n}");
    assert.ok(close >= 0, "No se encontró el cierre de " + name);
    return block.slice(0, close + 2);
}
const prefix = "GPSpedia_CORTES_ORGANIZER_OP_V1_";
const prune = new Function(
    "const CORTES_ORGANIZER_LEDGER_PREFIX_ = " + JSON.stringify(prefix) + ";" +
    "const CORTES_ORGANIZER_LEDGER_MAX_TERMINAL_ = 200;" +
    "const CORTES_ORGANIZER_LEDGER_MAX_TOTAL_ = 250;" +
    "const CORTES_ORGANIZER_LEDGER_RETENTION_MS_ = 180 * 24 * 60 * 60 * 1000;" +
    extractFunction("pruneCortesOrganizerOperationLedger_") +
    "\nreturn pruneCortesOrganizerOperationLedger_;"
)();
const list = new Function(
    "const CORTES_ORGANIZER_LEDGER_PREFIX_ = " + JSON.stringify(prefix) + ";" +
    extractFunction("getCortesOrganizerOperationLedgerPage_") +
    "\nreturn getCortesOrganizerOperationLedgerPage_;"
)();
function propertyStore(entries) {
    const values = new Map(Object.entries(entries || {}));
    return {
        getProperties: () => Object.fromEntries(values),
        getProperty: key => values.get(key) || null,
        setProperty: (key, value) => values.set(key, value),
        deleteProperty: key => values.delete(key),
        keys: () => Array.from(values.keys())
    };
}
const run = (name, fn) => { fn(); console.log("PASS " + name); };
const now = 1800000000000;
run("retira registros terminales vencidos y conserva processing/needs_review", () => {
    const store = propertyStore({
        [prefix + "old"]: JSON.stringify({ operationId: "old", status: "complete", updatedAt: now - 181 * 86400000 }),
        [prefix + "pending"]: JSON.stringify({ operationId: "pending", status: "processing", updatedAt: now - 300 * 86400000 }),
        [prefix + "review"]: JSON.stringify({ operationId: "review", status: "needs_review", updatedAt: now - 300 * 86400000 })
    });
    const result = prune(store, now);
    assert.equal(result.removed, 1);
    assert.equal(store.getProperty(prefix + "old"), null);
    assert.ok(store.getProperty(prefix + "pending"));
    assert.ok(store.getProperty(prefix + "review"));
});
run("limita terminales conservando las operaciones recientes y las no terminales", () => {
    const entries = {};
    for (let i = 0; i < 205; i++) {
        entries[prefix + "terminal-" + i] = JSON.stringify({
            operationId: "terminal-" + i, status: i % 2 ? "complete" : "rolled_back", updatedAt: now - i
        });
    }
    entries[prefix + "active"] = JSON.stringify({ operationId: "active", status: "processing", updatedAt: now - 999 });
    const store = propertyStore(entries);
    const result = prune(store, now);
    const remaining = Object.keys(store.getProperties()).filter(key => key.startsWith(prefix));
    assert.equal(remaining.length, 201);
    assert.ok(store.getProperty(prefix + "active"));
    assert.equal(result.removed, 5);
});
run("bloquea nuevos registros si el ledger está saturado de estados no terminales", () => {
    const entries = {};
    for (let i = 0; i < 251; i++) {
        entries[prefix + "active-" + i] = JSON.stringify({ operationId: "active-" + i, status: "processing", updatedAt: now });
    }
    assert.throws(() => prune(propertyStore(entries), now), /capacidad segura/i);
});
run("historial filtra por propietario, ordena por fecha y pagina", () => {
    const store = propertyStore({
        [prefix + "a"]: JSON.stringify({ operationId: "a", ownerId: "dev-a", fileId: "file_a", status: "complete", updatedAt: 10 }),
        [prefix + "b"]: JSON.stringify({ operationId: "b", ownerId: "dev-a", fileId: "file_b", status: "rolled_back", updatedAt: 30 }),
        [prefix + "c"]: JSON.stringify({ operationId: "c", ownerId: "dev-b", fileId: "file_c", status: "complete", updatedAt: 50 })
    });
    const page = list(store, "dev-a", 0, 1);
    assert.equal(page.total, 2);
    assert.equal(page.operations[0].operationId, "b");
    assert.equal(page.nextOffset, 1);
    const next = list(store, "dev-a", 1, 1);
    assert.equal(next.operations[0].operationId, "a");
    assert.equal(next.nextOffset, null);
    assert.equal(Object.prototype.hasOwnProperty.call(page.operations[0], "ownerId"), false);
});
run("historial no expone campos sensibles y limita el tamaño de página", () => {
    const store = propertyStore({
        [prefix + "a"]: JSON.stringify({
            operationId: "a", ownerId: "dev-a", fileId: "file_a", status: "complete", updatedAt: 10,
            sessionToken: "must-not-leak", password: "must-not-leak", targetName: "image.jpg"
        })
    });
    const page = list(store, "dev-a", -1, 500);
    assert.equal(page.offset, 0);
    assert.equal(page.limit, 50);
    assert.equal(page.operations.length, 1);
    assert.equal(JSON.stringify(page).includes("must-not-leak"), false);
});
console.log("CortesImageOrganizerLedger: 5/5 PASS");
