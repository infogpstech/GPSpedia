import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const auth = readFileSync(resolve(root, "JS/Services/Auth.js"), "utf8");
const fixture = readFileSync(resolve(root, "JS/Tests/Auth.js"), "utf8");
assert.equal(auth, fixture, "La copia aislada de AUTH debe conservar paridad exacta.");

const functionStart = auth.indexOf("let authSpreadsheet = null;");
const functionEnd = auth.indexOf("function getAuthUserActor_", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, "No se encontró el acceso activo de AUTH.");
const executable = auth.slice(functionStart, functionEnd);
assert.equal((auth.match(/\binitializeCentralConfigurationSheets\s*\(/g) || []).length, 1,
    "El inicializador solo debe estar declarado; nunca debe ejecutarse automáticamente.");
for (const forbidden of [/PropertiesService/, /UrlFetchApp/, /openById\s*\(/, /SPREADSHEET_ID/, /https?:\/\//, /LockService/]) {
    assert.equal(forbidden.test(executable), false, "El inicializador contiene un mecanismo o dato prohibido: " + forbidden);
}

const expected = {
    ConfiguracionControl: ["control_key","schema_version","active_revision","publication_state","published_at","updated_by","change_reason"],
    ConfiguracionEsquema: ["config_key","entity_type","value_type","scope_allowed","visibility_allowed","required","default_json","validation_rule","introduced_schema_version","deprecated_schema_version","replacement_key","owner_service","description"],
    Servicios: ["config_revision","service_key","endpoint_url","enabled","contract_version","min_client_version","health_action","updated_at","updated_by","change_reason"],
    ConfiguracionParametros: ["config_revision","config_key","value_json","value_type","scope","visibility","enabled","default_json","validation_rule","schema_version","updated_at","updated_by","change_reason"],
    ConfiguracionRecursos: ["config_revision","resource_key","resource_type","resource_id","scope","visibility","enabled","expected_parent_id","expected_name","updated_at","updated_by","change_reason"],
    ConfiguracionHistorial: ["history_id","config_revision","entity_type","entity_key","operation","previous_value_json","new_value_json","actor_id","changed_at","change_reason","rollback_of_revision","schema_version"]
};

class FakeSheet {
    constructor(name, rows = []) { this.name = name; this.rows = rows.map(row => row.slice()); this.writes = 0; this.frozenRows = 0; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
    getRange(row, column, rowCount, columnCount) {
        const sheet = this;
        return {
            getValues() {
                return Array.from({ length: rowCount }, (_, r) =>
                    Array.from({ length: columnCount }, (_, c) => {
                        const value = (sheet.rows[row - 1 + r] || [])[column - 1 + c];
                        return value === undefined ? "" : value;
                    }));
            },
            setValues(values) {
                values.forEach((valuesRow, r) => {
                    const targetRow = sheet.rows[row - 1 + r] || (sheet.rows[row - 1 + r] = []);
                    valuesRow.forEach((value, c) => { targetRow[column - 1 + c] = value; });
                });
                sheet.writes++;
            }
        };
    }
    setFrozenRows(value) { this.frozenRows = value; }
}
class FakeSpreadsheet {
    constructor(sheets = [], insertRaceName = "") {
        this.sheets = new Map(sheets.map(sheet => [sheet.name, sheet]));
        this.insertRaceName = insertRaceName;
    }
    getName() { return "AUTH test spreadsheet"; }
    getSheetByName(name) { return this.sheets.get(name) || null; }
    insertSheet(name) {
        if (this.sheets.has(name)) throw new Error("duplicate sheet");
        const sheet = new FakeSheet(name);
        this.sheets.set(name, sheet);
        if (name === this.insertRaceName) throw new Error("concurrent creation");
        return sheet;
    }
}
function createEnvironment(spreadsheet) {
    let flushed = 0;
    const context = { SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, flush: () => { flushed++; } } };
    vm.runInNewContext(executable, context);
    return { context, get flushed() { return flushed; } };
}
function headersFor(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}
let passed = 0;
function check(name, fn) {
    try { fn(); passed++; }
    catch (error) { console.error("FAIL " + name + ": " + (error && error.stack || error)); throw error; }
}

check("crea únicamente las seis pestañas de contrato y sus encabezados", () => {
    const spreadsheet = new FakeSpreadsheet();
    const env = createEnvironment(spreadsheet);
    const result = env.context.initializeCentralConfigurationSheets();
    assert.equal(result.status, "success");
    assert.equal(result.publicationReady, false);
    assert.deepEqual(result.createdSheets, Object.keys(expected));
    assert.deepEqual(result.initializedSheets, Object.keys(expected));
    for (const [name, headers] of Object.entries(expected)) {
        assert.deepEqual(headersFor(spreadsheet.getSheetByName(name)), headers);
        assert.equal(spreadsheet.getSheetByName(name).frozenRows, 1);
    }
    assert.equal(env.flushed, 1);
});
check("segunda ejecución es idempotente y no vuelve a escribir", () => {
    const spreadsheet = new FakeSpreadsheet();
    const env = createEnvironment(spreadsheet);
    env.context.initializeCentralConfigurationSheets();
    const writes = [...spreadsheet.sheets.values()].reduce((sum, sheet) => sum + sheet.writes, 0);
    const result = env.context.initializeCentralConfigurationSheets();
    assert.equal(result.createdSheets.length, 0);
    assert.equal(result.initializedSheets.length, 0);
    assert.deepEqual(result.preservedSheets, Object.keys(expected));
    assert.equal([...spreadsheet.sheets.values()].reduce((sum, sheet) => sum + sheet.writes, 0), writes);
});
check("preserva encabezados y datos preexistentes", () => {
    const sheets = Object.entries(expected).map(([name, headers]) => new FakeSheet(name, [headers, ["existing-row"]]));
    const spreadsheet = new FakeSpreadsheet(sheets);
    const before = JSON.stringify([...spreadsheet.sheets.entries()].map(([name, sheet]) => [name, sheet.rows]));
    const env = createEnvironment(spreadsheet);
    const result = env.context.initializeCentralConfigurationSheets();
    assert.equal(result.createdSheets.length, 0);
    assert.deepEqual(result.preservedSheets, Object.keys(expected));
    assert.equal(JSON.stringify([...spreadsheet.sheets.entries()].map(([name, sheet]) => [name, sheet.rows])), before);
    assert.equal([...spreadsheet.sheets.values()].reduce((sum, sheet) => sum + sheet.writes, 0), 0);
});
check("rechaza una pestaña existente incompatible sin sobrescribirla", () => {
    const incompatible = new FakeSheet("ConfiguracionControl", [["wrong_header"], ["keep-me"]]);
    const spreadsheet = new FakeSpreadsheet([incompatible]);
    const before = JSON.stringify(incompatible.rows);
    const env = createEnvironment(spreadsheet);
    assert.throws(() => env.context.initializeCentralConfigurationSheets(), /no cumple el esquema|Faltan:/);
    assert.equal(JSON.stringify(incompatible.rows), before);
    assert.equal(spreadsheet.sheets.size, 1);
});
check("tolera que otra ejecución cree una pestaña simultáneamente", () => {
    const spreadsheet = new FakeSpreadsheet([], "ConfiguracionControl");
    const env = createEnvironment(spreadsheet);
    const result = env.context.initializeCentralConfigurationSheets();
    assert.equal(result.status, "success");
    assert.ok(spreadsheet.getSheetByName("ConfiguracionControl"));
    assert.deepEqual(headersFor(spreadsheet.getSheetByName("ConfiguracionControl")), expected.ConfiguracionControl);
});
check("falla de forma segura si AUTH no tiene Spreadsheet activa", () => {
    const env = createEnvironment(null);
    assert.throws(() => env.context.initializeCentralConfigurationSheets(), /No hay una Spreadsheet activa vinculada/);
});
check("no publica ni inventa filas operativas", () => {
    const spreadsheet = new FakeSpreadsheet();
    const env = createEnvironment(spreadsheet);
    const result = env.context.initializeCentralConfigurationSheets();
    assert.equal(result.publicationReady, false);
    for (const sheet of spreadsheet.sheets.values()) assert.equal(sheet.getLastRow(), 1);
});

console.log("CentralConfigurationInitializer: " + passed + "/7 PASS — idempotencia, preservación, encabezados, creación concurrente, contexto AUTH y no publicación automática.");
