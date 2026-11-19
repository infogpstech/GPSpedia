import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = nextName
        ? source.indexOf("\nfunction " + nextName + "(", start + 10)
        : source.indexOf("\nfunction ", start + 10);
    assert.ok(end > start, "No se encontró el límite de " + name);
    return source.slice(start, end);
}

const helperCode = extract("getPreparedExistingVehicleRow_", "handleAddOrUpdateCutLockedUnsafe_");
const resolveRow = new Function("COLS_CORTES", helperCode + "\nreturn getPreparedExistingVehicleRow_;")({ id: 1 });
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("reutiliza la fila ya localizada sin volver a leer Sheets", () => {
    const values = ["42", "Toyota", "Hilux"];
    let reads = 0;
    const sheet = {
        getLastColumn: () => values.length,
        getRange() { reads++; throw new Error("No debe releer la fila."); }
    };
    const result = resolveRow(sheet, "42", { rowIndex: 8, rowValues: values });
    assert.deepEqual(result, { rowIndex: 8, rowValues: values });
    assert.equal(reads, 0);
});

test("refresca solo la fila cuando cambió el ancho del esquema", () => {
    const refreshed = ["42", "Toyota", "Hilux", "2020-2024"];
    const calls = [];
    const sheet = {
        getLastColumn: () => refreshed.length,
        getRange(...args) {
            calls.push(args);
            return { getValues: () => [refreshed] };
        }
    };
    const result = resolveRow(sheet, "42", { rowIndex: 8, rowValues: ["42", "Toyota", "Hilux"] });
    assert.deepEqual(result, { rowIndex: 8, rowValues: refreshed });
    assert.deepEqual(calls, [[8, 1, 1, 4]]);
});

test("rechaza una instantánea cuya identidad de vehículo no coincide", () => {
    const sheet = { getLastColumn: () => 2, getRange() { throw new Error("Lectura inesperada."); } };
    assert.throws(
        () => resolveRow(sheet, "42", { rowIndex: 8, rowValues: ["43", "Toyota"] }),
        /El vehículo cambió/
    );
});

test("el handler transmite la fila localizada y la ruta existente consume esa instantánea", () => {
    const locked = extract("handleAddOrUpdateCutLocked", "buildCutSlotCoreValues_");
    const unsafe = extract("handleAddOrUpdateCutLockedUnsafe_", "handleCheckVehicle");
    assert.match(locked, /rowIndex: existingRowIndex,[\\s\\S]*rowValues: existingRowValues/);
    assert.match(locked, /idempotencyEntriesSnapshot, \\{/);
    assert.match(unsafe, /getPreparedExistingVehicleRow_\\(sheet, vehicleId, existingVehicleSnapshot\\)/);
    assert.doesNotMatch(unsafe, /getRange\\(2, 1, sheet\\.getLastRow\\(\\), 1\\)/);
});

console.log("WriteCutExistingVehicleSnapshotReuse: " + passed + "/" + passed + " PASS — se elimina la segunda búsqueda de ID y la segunda lectura de fila");
