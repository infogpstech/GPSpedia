import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const api = new Function(source + "\nreturn { initializeCatalogChangeFeedSheets_, CATALOG_FEED_STATE_HEADERS_, CATALOG_FEED_EVENT_HEADERS_ };")();

function makeSheet(name, rows = []) {
    return {
        name, rows: rows.map(row => row.slice()),
        getLastRow() { return this.rows.length; },
        getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); },
        getRange(row, column, rowCount, columnCount) {
            return {
                getDisplayValues: () => this.rows.slice(row - 1, row - 1 + rowCount)
                    .map(values => Array.from({ length: columnCount }, (_, index) => String(values[column - 1 + index] ?? ""))),
                setValues: values => values.forEach((value, index) => { this.rows[row - 1 + index] = value.slice(); })
            };
        }
    };
}
function makeHarness(existing = {}) {
    const sheets = new Map(Object.entries(existing));
    let held = false, busy = false, flushes = 0;
    const lock = {
        tryLock: () => { if (busy || held) return false; held = true; return true; },
        releaseLock: () => { held = false; }
    };
    const spreadsheet = {
        getSheetByName: name => sheets.get(name) || null,
        insertSheet(name) {
            if (sheets.has(name)) throw new Error("La hoja ya existe: " + name);
            const sheet = makeSheet(name);
            sheets.set(name, sheet);
            return sheet;
        }
    };
    return {
        sheets, spreadsheet,
        run: () => api.initializeCatalogChangeFeedSheets_({
            spreadsheet, lockService: { getScriptLock: () => lock }, flush: () => { flushes++; }
        }),
        setBusy: value => { busy = Boolean(value); },
        isHeld: () => held,
        flushes: () => flushes
    };
}
function test(name, callback) { callback(); console.log("PASS " + name); }

test("crea las dos hojas ausentes con encabezados exactos y confirma read-back", () => {
    const h = makeHarness(), result = h.run();
    assert.deepEqual(result, {
        status: "success",
        created: ["CatalogChangeState", "CatalogChangeEvents"],
        initialized: ["CatalogChangeState", "CatalogChangeEvents"],
        validated: ["CatalogChangeState", "CatalogChangeEvents"]
    });
    assert.deepEqual(h.sheets.get("CatalogChangeState").rows[0], api.CATALOG_FEED_STATE_HEADERS_);
    assert.deepEqual(h.sheets.get("CatalogChangeEvents").rows[0], api.CATALOG_FEED_EVENT_HEADERS_);
    assert.equal(h.flushes(), 1);
    assert.equal(h.isHeld(), false);
});
test("es idempotente y no reescribe hojas ya inicializadas", () => {
    const h = makeHarness();
    h.run();
    const before = Array.from(h.sheets, ([name, sheet]) => [name, sheet.rows.map(row => row.slice())]);
    const result = h.run();
    assert.deepEqual(result.created, []);
    assert.deepEqual(result.initialized, []);
    assert.deepEqual(Array.from(h.sheets, ([name, sheet]) => [name, sheet.rows]), before);
    assert.equal(h.flushes(), 1);
});
test("conserva filas de estado y eventos existentes con esquema válido", () => {
    const state = makeSheet("CatalogChangeState", [api.CATALOG_FEED_STATE_HEADERS_, [1, 4, 1, "2026-11-24T00:00:00.000Z"]]);
    const events = makeSheet("CatalogChangeEvents", [api.CATALOG_FEED_EVENT_HEADERS_, [4, "cortes", "V1", "upsert", "{}", "2026-11-24", "WRITE", "addOrUpdateCut", "request-0001", false]]);
    const h = makeHarness({ CatalogChangeState: state, CatalogChangeEvents: events });
    const stateBefore = state.rows.map(row => row.slice()), eventsBefore = events.rows.map(row => row.slice());
    const result = h.run();
    assert.deepEqual(result.created, []);
    assert.deepEqual(result.initialized, []);
    assert.deepEqual(state.rows, stateBefore);
    assert.deepEqual(events.rows, eventsBefore);
});
test("una hoja existente incompatible detiene todo antes de crear la hoja ausente", () => {
    const malformed = makeSheet("CatalogChangeState", [["wrong", "schema"]]);
    const h = makeHarness({ CatalogChangeState: malformed });
    assert.throws(() => h.run(), /no coincide con el contrato/);
    assert.equal(h.sheets.has("CatalogChangeEvents"), false);
    assert.deepEqual(malformed.rows, [["wrong", "schema"]]);
    assert.equal(h.isHeld(), false);
});
test("lock ocupado no crea ni modifica hojas", () => {
    const h = makeHarness();
    h.setBusy(true);
    assert.throws(() => h.run(), /está ocupada/);
    assert.equal(h.sheets.size, 0);
    assert.equal(h.isHeld(), false);
});
test("la inicialización es manual y no se ejecuta desde GET/POST", () => {
    assert.match(source, /function initializeCatalogChangeFeedSheets\(\)/);
    assert.doesNotMatch(source, /case ["']initializeCatalogChangeFeedSheets["']/);
    assert.doesNotMatch(source, /initializeCatalogChangeFeedSheets\(\)\s*;/);
});
console.log("CatalogChangeFeedInitialization: 6/6 PASS");
