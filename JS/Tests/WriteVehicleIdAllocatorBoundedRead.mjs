import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function getCortesVehicleIdHighWaterMark_(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró getCortesVehicleIdHighWaterMark_");
const code = source.slice(start, end);
assert.doesNotMatch(code, /getDataRange\(/, "El asignador no debe descargar la tabla completa");

function makeAllocator({ ids, formulas = [], rowDataByRow = {}, lastColumn = 4, storedValue = null }) {
    const calls = [], properties = { value: storedValue, sets: [] };
    const sheet = {
        getLastRow: () => ids.length + 1,
        getLastColumn: () => lastColumn,
        getRange(...args) {
            calls.push(args);
            if (args.length === 4 && args[0] === 1 && args[1] === 1 && args[2] === ids.length + 1 && args[3] === 1) {
                return { getValues: () => [["id"], ...ids.map(value => [value])] };
            }
            if (args.length === 4 && args[0] === 2 && args[1] === 1 && args[2] === ids.length && args[3] === 1) {
                return { getFormulas: () => ids.map((value, index) => [formulas[index] || ""]) };
            }
            if (args.length === 4 && args[1] === 2 && args[3] === lastColumn - 1) {
                const firstRow = args[0], count = args[2], width = args[3];
                return { getValues: () => Array.from({ length: count }, (_, offset) => {
                    const row = rowDataByRow[firstRow + offset] || [];
                    return Array.from({ length: width }, (_, column) => row[column] === undefined ? "" : row[column]);
                }) };
            }
            throw new Error("Rango inesperado: " + args.join(","));
        }
    };
    const props = { getProperty: () => properties.value };
    const fn = new Function("COLS_CORTES", "CORTES_ID_COUNTER_PROPERTY", "PropertiesService",
        code + "\nreturn getCortesVehicleIdHighWaterMark_;")(
        { id: 1 }, "CORTES_ID_COUNTER", { getScriptProperties: () => props }
    );
    return { run: () => fn(sheet, { includeReservations: false }), calls, properties, lastColumn };
}

let passed = 0;
function test(name, fn) { fn(); passed++; }

test("filas con ID literal solo leen la columna ID", () => {
    const h = makeAllocator({ ids: [1, 2, 3], formulas: ["", "", ""], lastColumn: 49 });
    assert.equal(h.run(), 3);
    assert.deepEqual(h.calls, [[1, 1, 4, 1], [2, 1, 3, 1]]);
    assert.deepEqual(h.properties.sets, []);
});
test("fila con datos y sin ID se rechaza leyendo solo esa fila", () => {
    const h = makeAllocator({ ids: [1, "", 3], formulas: ["", "", ""], lastColumn: 4, rowDataByRow: { 3: ["Toyota", "Hilux", ""] } });
    assert.throws(() => h.run(), /La fila 3 contiene datos, pero no tiene ID/);
    assert.deepEqual(h.calls, [[1, 1, 4, 1], [2, 1, 3, 1], [3, 2, 1, 3]]);
});
test("fila vacía sin ID se ignora", () => {
    const h = makeAllocator({ ids: [1, "", 3], formulas: ["", "", ""], lastColumn: 3, rowDataByRow: { 3: ["", ""] } });
    assert.equal(h.run(), 3);
});
test("fila con fórmula ID y sin otros datos se ignora", () => {
    const h = makeAllocator({ ids: [1, "", 3], formulas: ["", "=ARRAYFORMULA(...)", ""], lastColumn: 3, rowDataByRow: { 3: ["", ""] } });
    assert.equal(h.run(), 3);
});
test("fila con fórmula ID y datos valida el ID calculado", () => {
    const h = makeAllocator({ ids: [1, 2, 3], formulas: ["", "=FORMULA()", ""], lastColumn: 3, rowDataByRow: { 3: ["Toyota", "Hilux"] } });
    assert.equal(h.run(), 3);
    assert.ok(h.calls.some(args => args[0] === 3 && args[1] === 2 && args[2] === 1 && args[3] === 2));
});
test("IDs numéricos equivalentes se detectan como duplicados", () => {
    const h = makeAllocator({ ids: ["01", 1], formulas: ["", ""], lastColumn: 1 });
    assert.throws(() => h.run(), /ID duplicado 1/);
});
test("ID decimal se rechaza", () => {
    const h = makeAllocator({ ids: ["1.5"], formulas: [""], lastColumn: 1 });
    assert.throws(() => h.run(), /entero numérico positivo seguro/);
});
test("el high-water normal ignora la propiedad legacy después de migrar al ledger", () => {
    const h = makeAllocator({ ids: [1, 2, 3], formulas: ["", "", ""], lastColumn: 1, storedValue: "20" });
    assert.equal(h.run(), 3);
    assert.deepEqual(h.properties.sets, []);
});
test("un valor legacy inválido no afecta el asignador normal ya migrado", () => {
    const h = makeAllocator({ ids: [1], formulas: [""], lastColumn: 1, storedValue: "NaN" });
    assert.equal(h.run(), 1);
    assert.equal(h.properties.sets.length, 0);
});
test("candidatos contiguos se leen en un solo bloque", () => {
    const h = makeAllocator({ ids: [1, "", "", 4], formulas: ["", "", "", ""], lastColumn: 3, rowDataByRow: { 3: ["", ""], 4: ["", ""] } });
    assert.equal(h.run(), 4);
    assert.ok(h.calls.some(args => args.join(",") === "3,2,2,2"));
    assert.equal(h.calls.filter(args => args.length === 4 && args[1] === 2).length, 1);
});
test("columnas solo ID no generan rangos de ancho cero", () => {
    const h = makeAllocator({ ids: [1, "", 2], formulas: ["", "", ""], lastColumn: 1 });
    assert.equal(h.run(), 2);
    assert.ok(!h.calls.some(args => args.length === 4 && args[1] === 2));
});
console.log("WriteVehicleIdAllocatorBoundedRead: " + passed + "/" + passed + " PASS — validación acotada de IDs y máximo histórico sin mutar contador");
