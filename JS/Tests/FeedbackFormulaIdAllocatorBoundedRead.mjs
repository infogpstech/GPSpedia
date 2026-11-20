import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function getNextFormulaBasedId_(sheet, idColumn) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró getNextFormulaBasedId_");
const helper = source.slice(start, end);

function createHarness(ids, { lastColumn = 6, stored = null, blankRows = {}, alreadyHeld = false } = {}) {
    const calls = { ranges: [], lastColumnReads: 0, tryLock: [], releases: 0 };
    const properties = new Map();
    if (stored !== null) properties.set("GPSpedia_ID_SEQUENCE_Contactanos_1_CON_", String(stored));
    const lock = {
        hasLock: () => alreadyHeld,
        tryLock: timeout => { calls.tryLock.push(timeout); return true; },
        releaseLock: () => { calls.releases++; }
    };
    const sheet = {
        getName: () => "Contactanos",
        getLastRow: () => ids.length + 1,
        getLastColumn: () => { calls.lastColumnReads++; return lastColumn; },
        getRange: (...args) => {
            calls.ranges.push(args);
            const [row, column, height, width] = args;
            if (row === 2 && column === 1 && width === 1) {
                return { getValues: () => ids.map(value => [value]) };
            }
            if (column === 1 && width === lastColumn) {
                return { getValues: () => Array.from({ length: height }, (_, index) =>
                    blankRows[row + index] || Array(lastColumn).fill("")
                ) };
            }
            throw new Error("Rango inesperado: " + JSON.stringify(args));
        }
    };
    const fn = new Function("LockService", "acquireFeedbackScriptLock_", "getFormulaBasedIdPattern_", "PropertiesService",
        helper + "\nreturn getNextFormulaBasedId_;")(
        { getScriptLock: () => lock },
        candidate => { if (!candidate.tryLock(0)) throw new Error("FEEDBACK_BUSY"); },
        () => ({ prefix: "CON-", padding: 4 }),
        { getScriptProperties: () => ({
            getProperty: key => properties.has(key) ? properties.get(key) : null,
            setProperty: (key, value) => properties.set(key, String(value))
        }) }
    );
    return { run: () => fn(sheet, 1), calls, properties };
}
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("hoja poblada lee solo la columna ID y no consulta el ancho completo", () => {
    const h = createHarness(["CON-0001", "CON-0002", "CON-0003"]);
    assert.equal(h.run(), "CON-0004");
    assert.deepEqual(h.calls.ranges, [[2, 1, 3, 1]]);
    assert.equal(h.calls.lastColumnReads, 0);
    assert.equal(h.calls.tryLock[0], 0);
    assert.equal(h.calls.releases, 1);
});

test("fila vacía sin ID se valida en memoria mediante un rango acotado", () => {
    const h = createHarness(["CON-0001", "", "CON-0003"]);
    assert.equal(h.run(), "CON-0004");
    assert.deepEqual(h.calls.ranges, [[2, 1, 3, 1], [3, 1, 1, 6]]);
    assert.equal(h.calls.lastColumnReads, 1);
});

test("fila con datos y sin ID sigue bloqueando la asignación", () => {
    const row = Array(6).fill(""); row[2] = "dato sin ID";
    const h = createHarness(["CON-0001", "", "CON-0003"], { blankRows: { 3: row } });
    assert.throws(() => h.run(), /fila 3.*contiene datos, pero no tiene ID/);
});

test("filas vacías dispersas se leen por grupos contiguos", () => {
    const h = createHarness(["CON-0001", "", "CON-0003", "", "CON-0005"]);
    assert.equal(h.run(), "CON-0006");
    assert.deepEqual(h.calls.ranges, [[2, 1, 5, 1], [3, 1, 1, 6], [5, 1, 1, 6]]);
});

test("conserva detección de duplicados y sufijos inválidos", () => {
    assert.throws(() => createHarness(["CON-0001", "CON-0001"]).run(), /ID duplicado/);
    assert.throws(() => createHarness(["CON-X001"]).run(), /sufijo numérico/);
});

test("reconcilia contador backend y respeta lock ya adquirido por el caller", () => {
    const h = createHarness(["CON-0001", "CON-0002"], { stored: 8, alreadyHeld: true });
    assert.equal(h.run(), "CON-0009");
    assert.equal(h.calls.tryLock.length, 0);
    assert.equal(h.calls.releases, 0);
    assert.equal(h.properties.get("GPSpedia_ID_SEQUENCE_Contactanos_1_CON_"), "9");
});

console.log("FeedbackFormulaIdAllocatorBoundedRead: " + passed + "/" + passed + " PASS");
