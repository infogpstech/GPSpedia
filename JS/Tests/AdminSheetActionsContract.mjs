import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminSource = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const consumerSources = {
    ui: readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8"),
    index: readFileSync(new URL("../../index.html", import.meta.url), "utf8"),
    users: readFileSync(new URL("../../HTML/users.html", import.meta.url), "utf8"),
    addCuts: readFileSync(new URL("../../HTML/add_cortes.html", import.meta.url), "utf8")
};
function extractFunction(source, name) {
    const match = String(source).match(new RegExp("function " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}"));
    assert.ok(match, "No se encontró " + name);
    return match[0];
}
const names = [
    "validateAdminSheetName_", "validateAdminColumnName_", "validateAdminHeaders_",
    "validateAdminIdFormula_", "handleCreateSheet", "handleAddColumn"
];
const implementation = names.map(name => extractFunction(adminSource, name)).join("\n");
const api = new Function("getSpreadsheet", implementation +
    "\nreturn {validateAdminSheetName_,validateAdminColumnName_,validateAdminHeaders_,validateAdminIdFormula_,handleCreateSheet,handleAddColumn};");

function createHarness(existingName) {
    const calls = [];
    const sheet = {
        getLastColumn() { return 3; },
        getRange(...args) {
            calls.push({ method: "getRange", args });
            return {
                setValues(value) { calls.push({ method: "setValues", value }); return this; },
                setValue(value) { calls.push({ method: "setValue", value }); return this; },
                setFormula(value) { calls.push({ method: "setFormula", value }); return this; },
                setFontWeight(value) { calls.push({ method: "setFontWeight", value }); return this; },
                setBackground(value) { calls.push({ method: "setBackground", value }); return this; }
            };
        }
    };
    const ss = {
        getSheetByName(name) { calls.push({ method: "getSheetByName", name }); return name === existingName ? sheet : null; },
        insertSheet(name) { calls.push({ method: "insertSheet", name }); return sheet; }
    };
    return { calls, sheet, api: api(() => ss) };
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("Valida y normaliza nombres de hoja conforme al contrato", () => {
    const h = createHarness();
    assert.equal(h.api.validateAdminSheetName_("  Hoja interna  "), "Hoja interna");
    for (const value of ["", " ", "a/b", "a:b", "a?b", "a*b", "a[b]", "x".repeat(101), 42, null]) {
        assert.throws(() => h.api.validateAdminSheetName_(value));
    }
});
check("Valida listas de encabezados y fórmula opcional antes de crear", () => {
    const h = createHarness();
    assert.deepEqual(h.api.validateAdminHeaders_(["ID", "Marca"]), ["ID", "Marca"]);
    assert.deepEqual(h.api.validateAdminHeaders_(undefined), []);
    assert.throws(() => h.api.validateAdminHeaders_("ID,Marca"));
    assert.throws(() => h.api.validateAdminHeaders_(["ID", 2]));
    assert.throws(() => h.api.validateAdminHeaders_(["x".repeat(101)]));
    assert.equal(h.api.validateAdminIdFormula_(" =ROW()-1 "), "=ROW()-1");
    assert.equal(h.api.validateAdminIdFormula_(undefined), "");
    assert.throws(() => h.api.validateAdminIdFormula_("ROW()"));
    assert.throws(() => h.api.validateAdminIdFormula_("=" + "x".repeat(500)));
});
check("createSheet crea solo después de validar y aplica encabezados/fórmula", () => {
    const h = createHarness();
    const logs = [];
    const result = h.api.handleCreateSheet({ sheetName: " Hoja de prueba ", headers: ["ID", "Marca"], idFormula: "=ROW()-1" },
        (...args) => logs.push(args));
    assert.equal(result.status, "success");
    assert.ok(h.calls.some(x => x.method === "insertSheet" && x.name === "Hoja de prueba"));
    assert.ok(h.calls.some(x => x.method === "setValues" && x.value[0][1] === "Marca"));
    assert.ok(h.calls.some(x => x.method === "setFormula" && x.value === "=ROW()-1"));
    assert.equal(logs.length, 1);
});
check("createSheet rechaza duplicados y payloads inválidos sin insertar", () => {
    const duplicate = createHarness("Existente");
    assert.throws(() => duplicate.api.handleCreateSheet({ sheetName: "Existente" }));
    assert.equal(duplicate.calls.some(x => x.method === "insertSheet"), false);
    for (const payload of [
        { sheetName: "bad/name" },
        { sheetName: "Nueva", headers: "ID,Marca" },
        { sheetName: "Nueva", headers: ["ID", 7] },
        { sheetName: "Nueva", headers: ["ID"], idFormula: "ROW()" }
    ]) {
        const h = createHarness();
        assert.throws(() => h.api.handleCreateSheet(payload));
        assert.equal(h.calls.some(x => x.method === "insertSheet"), false);
    }
});
check("Valida nombres de columna y agrega al final de la hoja existente", () => {
    const h = createHarness("Cortes");
    assert.equal(h.api.validateAdminColumnName_(" VIN auxiliar "), "VIN auxiliar");
    assert.throws(() => h.api.validateAdminColumnName_(" "));
    assert.throws(() => h.api.validateAdminColumnName_("x".repeat(101)));
    assert.throws(() => h.api.validateAdminColumnName_(false));
    const result = h.api.handleAddColumn({ sheetName: "Cortes", columnName: " VIN auxiliar " });
    assert.equal(result.status, "success");
    assert.equal(result.columnIndex, 4);
    assert.ok(h.calls.some(x => x.method === "setValue" && x.value === "VIN auxiliar"));
});
check("addColumn rechaza hoja inexistente o payload inválido sin escribir", () => {
    const missing = createHarness(null);
    assert.throws(() => missing.api.handleAddColumn({ sheetName: "No existe", columnName: "VIN" }));
    assert.equal(missing.calls.some(x => x.method === "setValue"), false);
    for (const payload of [
        { sheetName: "Cortes", columnName: "" },
        { sheetName: "Cortes", columnName: "x".repeat(101) },
        { sheetName: "Cortes", columnName: 12 },
        { sheetName: "Cortes", columnName: "VIN\nID" }
    ]) {
        const h = createHarness("Cortes");
        assert.throws(() => h.api.handleAddColumn(payload));
        assert.equal(h.calls.some(x => x.method === "setValue"), false);
    }
});
check("Las rutas canónicas ADMIN y los handlers permanecen alineados", () => {
    const map = apiSource.match(/export const ACTION_TO_SERVICE_MAP = \{([\s\S]*?)\n\};/);
    assert.ok(map);
    for (const action of ["createSheet", "addColumn"]) assert.ok(new RegExp("['\"]" + action + "['\"]\\s*:\\s*['\"]ADMIN['\"]").test(map[1]));
    assert.ok(adminSource.includes("case 'createSheet':"));
    assert.ok(adminSource.includes("response = handleCreateSheet(payload, logMessage);"));
    assert.ok(adminSource.includes("case 'addColumn':"));
    assert.ok(adminSource.includes("response = handleAddColumn(payload, logMessage);"));
    assert.ok(adminSource.includes('"createSheet","addColumn"'));
});
check("Ambas mutaciones exigen Desarrollador y lease/auditoría antes del handler", () => {
    const dispatchStart = adminSource.indexOf("function doPostInternal_(e)");
    const dispatch = adminSource.slice(dispatchStart);
    const auth = dispatch.indexOf("assertDeveloperSession(payload)");
    const audit = dispatch.indexOf("beginAdminAuditEvent_(action, payload, developerContext, startTime)");
    const switchAt = dispatch.indexOf("switch (action)");
    assert.ok(auth >= 0 && auth < audit && audit < switchAt);
    assert.ok(adminSource.includes('withSharedMutationLease_("ADMIN", action'));
    assert.ok(adminSource.includes("function isSharedMutationAction_(action)"));
    assert.ok(adminSource.includes('"createSheet","addColumn","driveCommand"'));
});
check("No existe consumidor frontend versionado; se conservan las rutas internas/manuales", () => {
    for (const [file, source] of Object.entries(consumerSources)) {
        assert.ok(!/routeAction\s*\(\s*['"](?:createSheet|addColumn)['"]/.test(source), file + " contiene llamada directa.");
        assert.ok(!/action\s*:\s*['"](?:createSheet|addColumn)['"]/.test(source), file + " contiene payload de acción.");
    }
});
console.log("AdminSheetActionsContract: " + passed + "/" + passed + " PASS");
