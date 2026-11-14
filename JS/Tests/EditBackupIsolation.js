import assert from "node:assert/strict";
import { createEditBackupStore, getEditBackupFieldsToRestore } from "../../editBackupStore.js";

class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}

let passed = 0;
function test(name, callback) { callback(); passed += 1; console.log("PASS", name); }

test("dos cuentas conservan copias independientes del mismo vehículo", () => {
    const storage = new MemoryStorage();
    const a = createEditBackupStore(storage, "USR-A");
    const b = createEditBackupStore(storage, "USR-B");
    a.write("V-1", { id: "V-1", marca: "A" });
    b.write("V-1", { id: "V-1", marca: "B" });
    assert.equal(a.read("V-1").backup.marca, "A");
    assert.equal(b.read("V-1").backup.marca, "B");
});

test("una cuenta mantiene vehículos separados", () => {
    const storage = new MemoryStorage();
    const store = createEditBackupStore(storage, "USR-A");
    store.write("V-1", { id: "V-1", marca: "A" });
    store.write("V-2", { id: "V-2", marca: "B" });
    assert.equal(store.read("V-1").backup.marca, "A");
    assert.equal(store.read("V-2").backup.marca, "B");
});

test("rechaza identidad de vehículo incongruente", () => {
    const store = createEditBackupStore(new MemoryStorage(), "USR-A");
    assert.equal(store.write("V-1", { id: "V-2" }).reason, "invalid-backup");
});

test("registros legados sin propietario quedan en cuarentena", () => {
    const storage = new MemoryStorage();
    storage.setItem("gpsepedia_edit_backup", JSON.stringify({ id: "V-1", marca: "legacy" }));
    const a = createEditBackupStore(storage, "USR-A");
    const b = createEditBackupStore(storage, "USR-B");
    assert.equal(a.read("V-1").backup, null);
    assert.equal(b.read("V-1").backup, null);
    assert.ok([...storage.values.keys()].some(key => key.includes("quarantine:owner-missing")));
});

test("registro legado con propietario explícito migra a su clave", () => {
    const storage = new MemoryStorage();
    storage.setItem("gpsepedia_edit_backup", JSON.stringify({ ownerId: "USR-A", vehicleId: "V-1", backup: { id: "V-1", marca: "A" } }));
    const a = createEditBackupStore(storage, "USR-A");
    assert.equal(a.read("V-1").backup.marca, "A");
    assert.equal(storage.getItem("gpsepedia_edit_backup"), null);
});

test("eliminar una copia no afecta otros vehículos ni propietarios", () => {
    const storage = new MemoryStorage();
    const a = createEditBackupStore(storage, "USR-A");
    const b = createEditBackupStore(storage, "USR-B");
    a.write("V-1", { id: "V-1" }); a.write("V-2", { id: "V-2" }); b.write("V-1", { id: "V-1" });
    assert.equal(a.remove("V-1"), true);
    assert.equal(a.read("V-1").backup, null);
    assert.equal(a.read("V-2").backup.id, "V-2");
    assert.equal(b.read("V-1").backup.id, "V-1");
});

test("no persiste tokens ni credenciales anidados", () => {
    const storage = new MemoryStorage();
    const store = createEditBackupStore(storage, "USR-A");
    store.write("V-1", { id: "V-1", SessionToken: "secret", nested: { accessToken: "secret", password: "secret", keep: true } });
    const raw = storage.getItem(store.keyFor("V-1"));
    assert.equal(/token|password|credential|authorization/i.test(raw), false);
    assert.equal(store.read("V-1").backup.nested.keep, true);
});

test("una copia de edición antigua permanece recuperable hasta el descarte explícito", () => {
    const storage = new MemoryStorage();
    const store = createEditBackupStore(storage, "USR-A");
    store.write("V-OLD", { id: "V-OLD", marca: "Toyota", createdAt: 1 });
    assert.equal(store.read("V-OLD").backup.marca, "Toyota");
    assert.equal(store.remove("V-OLD"), true);
    assert.equal(store.read("V-OLD").backup, null);
});

test("el descarte restaura solo campos editables y excluye metadatos de la ficha", () => {
    const snapshot = {
        id: "V-1", marca: "Toyota", modelo: "Corolla", vin: "VIN-OLD",
        imgCorte1: "https://old-image", contadorBusqueda: 10, timestamp: "old"
    };
    const current = {
        id: "V-2", marca: "Honda", modelo: "Civic", vin: "VIN-NEW",
        imgCorte1: "https://new-image", contadorBusqueda: 99, timestamp: "new"
    };
    const allowed = new Set(["modelo", "vin", "imgCorte1"]);
    assert.deepEqual(
        getEditBackupFieldsToRestore(snapshot, current, allowed).sort(),
        ["imgCorte1", "modelo", "vin"]
    );
});

test("la comparación usa la ficha vigente recuperada tras una edición interrumpida", () => {
    const snapshot = { id: "V-1", modelo: "Corolla", marca: "Toyota", categoria: "Sedan" };
    const latestCatalogItem = { id: "V-1", modelo: "Civic", marca: "Honda", categoria: "Sedan" };
    const allowed = new Set(["modelo", "categoria"]);
    assert.deepEqual(
        getEditBackupFieldsToRestore(snapshot, latestCatalogItem, allowed),
        ["modelo"]
    );
});

test("no inicia restauración si falta una referencia actual verificable", () => {
    assert.throws(
        () => getEditBackupFieldsToRestore({ id: "V-1", modelo: "Corolla" }, null, new Set(["modelo"])),
        /snapshot, ficha actual y whitelist/
    );
});

test("no intenta restaurar campos del snapshot que no pertenecen al modal", () => {
    const snapshot = { id: "V-1", marca: "Toyota", modelo: "Corolla", videoGuiaDesarmeUrl: "url" };
    const current = { id: "V-2", marca: "Honda", modelo: "Civic", videoGuiaDesarmeUrl: "other" };
    assert.deepEqual(
        getEditBackupFieldsToRestore(snapshot, current, new Set(["modelo"])),
        ["modelo"]
    );
});

console.log("Edit backup isolation: " + passed + "/12 PASS");
