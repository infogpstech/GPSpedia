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
const columnsMatch = admin.match(/const COLS_CORTES = (\{[\s\S]*?\n\});/);
assert.ok(columnsMatch, "No se encontró COLS_CORTES");
const COLS_CORTES = new Function("return (" + columnsMatch[1] + ");")();
const extractDriveFileIds = new Function(extractFunction("extractDriveFileIds") + "\nreturn extractDriveFileIds;")();
const dependencies = [
    "normalizeOrganizerSegment_",
    "normalizeOrganizerFilePart_",
    "mapCorteTypeToFunctionCode_",
    "getCorteFunctionSuffix_",
    "buildCanonicalLogoDestination_",
    "buildCortesImageOrganizerTargets_"
].map(extractFunction).join("\n");
const buildTargets = new Function("COLS_CORTES", "extractDriveFileIds",
    dependencies + "\nreturn buildCortesImageOrganizerTargets_;")(COLS_CORTES, extractDriveFileIds);

const fileId = n => "drive_file_id_" + String(n).padStart(16, "0");
const url = n => "https://drive.google.com/uc?export=view&id=" + fileId(n);
const blank = () => Array(48).fill("");
function vehicle(id = "V-001", overrides = {}) {
    const row = blank();
    const set = (key, value) => { row[COLS_CORTES[key] - 1] = value; };
    set("id", id);
    set("categoria", "Camionetas");
    set("marca", "Toyota");
    set("modelo", "Hilux");
    set("versionesAplicables", "Doble Cabina");
    set("anoDesde", "2020");
    set("anoHasta", "2022");
    set("tipoEncendido", "Llave");
    set("imagenVehiculo", url(1));
    set("imgApertura", url(2));
    set("imgCableAlimen", url(3));
    set("imgCableAlimen2", url(4));
    set("imgCableAlimen3", url(5));
    set("tipoCorte1", "Ignición");
    set("imgCorte1", url(6));
    set("tipoCorte2", "Bomba de combustible");
    set("imgCorte2", url(7));
    set("tipoCorte3", "Botón de encendido");
    set("imgCorte3", url(8));
    Object.entries(overrides).forEach(([key, value]) => set(key, value));
    return row;
}
function build(rows, formulas = rows.map(() => blank()), logos = [blank()], logoFormulas = logos.map(() => blank())) {
    return buildTargets(rows, formulas, logos, logoFormulas);
}
function caseOf(name, fn) {
    fn();
    console.log("PASS " + name);
}

caseOf("genera destinos para los ocho campos de Cortes y el logo", () => {
    const logoRows = [blank(), ["", "Toyota", url(9)]];
    const result = build([blank(), vehicle()], [blank(), blank()], logoRows, [blank(), blank()]);
    assert.equal(result.writePerformed, false);
    assert.equal(result.summary.targetCount, 9);
    assert.equal(result.summary.candidateCount, 9, JSON.stringify(result.targets.map(item => ({ sheetName: item.sheetName, field: item.field, status: item.status, reasons: item.reasons }))));
    assert.equal(result.summary.blockedCount, 0);
    const cut1 = result.targets.find(item => item.field === "imgCorte1");
    const cut2 = result.targets.find(item => item.field === "imgCorte2");
    const cut3 = result.targets.find(item => item.field === "imgCorte3");
    assert.equal(cut1.functionCode, "ign1");
    assert.equal(cut2.functionCode, "bomba1");
    assert.equal(cut3.functionCode, "btn1");
    assert.equal(cut1.targetFolderPath, "Cortes/Camionetas/Toyota/Hilux/Doble_Cabina/2020-2022");
    assert.equal(cut1.targetBaseName, "Hilux_Doble_Cabina_2020_2022_ign1");
    const logo = result.targets.find(item => item.sheetName === "LogosMarca");
    assert.equal(logo.targetFolderPath, "Cortes/Camionetas/Toyota");
    assert.equal(logo.targetBaseName, "Toyota_logo".toLowerCase());
});
caseOf("bloquea versiones ambiguas y años inválidos", () => {
    const ambiguous = build([blank(), vehicle("V-001", { versionesAplicables: "Doble/Regular" })]);
    assert.ok(ambiguous.targets.some(item => item.reasons.includes("multiple_versions_or_ignitions_require_review")));
    const invalidYear = build([blank(), vehicle("V-002", { anoHasta: "20XX" })]);
    assert.ok(invalidYear.targets.some(item => item.reasons.includes("missing_or_invalid_year_range")));
});
caseOf("bloquea fórmulas en celdas de imagen", () => {
    const rows = [blank(), vehicle()];
    const formulas = [blank(), blank()];
    formulas[1][COLS_CORTES.imgCorte1 - 1] = "=IMAGE(\"https://example.invalid\")";
    const result = build(rows, formulas);
    const target = result.targets.find(item => item.field === "imgCorte1");
    assert.equal(target.status, "blocked");
    assert.ok(target.reasons.includes("formula_in_image_cell"));
});
caseOf("bloquea identificadores de vehículo duplicados", () => {
    const result = build([blank(), vehicle("V-DUP"), vehicle("V-DUP")]);
    assert.ok(result.targets.filter(item => item.sheetName === "Cortes").every(item =>
        item.status === "blocked" && item.reasons.includes("duplicate_vehicle_id")));
});
caseOf("bloquea un mismo archivo referenciado desde varias celdas", () => {
    const result = build([blank(), vehicle("V-001", { imgCorte2: url(6) })]);
    const shared = result.targets.filter(item => item.fileId === fileId(6));
    assert.equal(shared.length, 2);
    assert.ok(shared.every(item => item.status === "blocked" &&
        item.reasons.includes("shared_drive_file_id_requires_review")));
});
caseOf("bloquea tipos de corte no reconocidos sin inventar nomenclatura", () => {
    const result = build([blank(), vehicle("V-001", { tipoCorte1: "Auxiliar desconocido" })]);
    const target = result.targets.find(item => item.field === "imgCorte1");
    assert.equal(target.status, "blocked");
    assert.ok(target.reasons.includes("unrecognized_cut_type:tipoCorte1"));
    assert.equal(target.targetBaseName, "");
});
caseOf("bloquea logos cuando la marca aparece en varias categorías", () => {
    const logos = [blank(), ["", "Toyota", url(9)]];
    const result = build([blank(), vehicle("V-001"), vehicle("V-002", { categoria: "Automóviles" })],
        [blank(), blank(), blank()], logos, [blank(), blank()]);
    const logo = result.targets.find(item => item.sheetName === "LogosMarca");
    assert.equal(logo.status, "blocked");
    assert.ok(logo.reasons.includes("brand_has_multiple_categories"));
});
caseOf("bloquea filas duplicadas de logo para la misma marca", () => {
    const logos = [blank(), ["", "Toyota", url(9)], ["", "Toyota", url(10)]];
    const result = build([blank(), vehicle()], [blank(), blank(), blank()], logos, [blank(), blank(), blank()]);
    const logoTargets = result.targets.filter(item => item.sheetName === "LogosMarca");
    assert.equal(logoTargets.length, 2);
    assert.ok(logoTargets.every(item => item.status === "blocked" &&
        item.reasons.includes("duplicate_logo_brand_row")));
});
console.log("CortesImageOrganizerTargets: 8/8 PASS");
