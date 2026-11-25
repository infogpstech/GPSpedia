import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function buildCortesImageModelAssociationSuggestions_(");
assert.ok(start >= 0, "No se encontró el constructor de sugerencias por modelo");
const next = admin.indexOf("\nfunction ", start + 10);
const source = admin.slice(start, next >= 0 ? next : admin.length);
const columnsMatch = admin.match(/const COLS_CORTES = (\{[\s\S]*?\n\});/);
assert.ok(columnsMatch, "No se encontró COLS_CORTES");
const columns = new Function("return (" + columnsMatch[1] + ");")();
const build = new Function("columns", "aliases", source + "\nreturn (metadata, rows, refs, history) => " +
    "buildCortesImageModelAssociationSuggestions_(metadata, rows, refs, history, aliases, columns);")(
    columns, [{ category: "Camionetas", brand: "Mitsubishi", model: "L200", aliases: ["Triton"] }]
);
const fileId = n => "drive_file_id_" + String(n).padStart(16, "0");
const row = (category, brand, model) => {
    const values = Array(48).fill("");
    values[0] = "V-100"; values[1] = category; values[2] = brand; values[3] = model;
    return values;
};
const metadata = (id, fileName, folderPath) => ({
    fileId: fileId(id), fileName, folderPath, mimeType: "image/jpeg"
});
const run = (name, fn) => { fn(); console.log("PASS " + name); };

run("sugiere modelo por segmento exacto de carpeta y agrega contexto de marca", () => {
    const result = build([metadata(1, "front.jpg", "Cortes/Camionetas/Toyota/Hilux/2020-2022")],
        [["id"], row("Camionetas", "Toyota", "Hilux")], new Map(), new Set());
    assert.equal(result.summary.suggested, 1);
    assert.equal(result.suggestions[0].status, "suggested");
    assert.equal(result.suggestions[0].candidates[0].model, "Hilux");
    assert.ok(result.suggestions[0].candidates[0].signals.includes("folder_model_exact"));
    assert.equal(Object.prototype.hasOwnProperty.call(result.suggestions[0], "vehicleId"), false);
});
run("sugiere modelo por nombre de archivo sin asignar un campo de Cortes", () => {
    const result = build([metadata(2, "Hilux_diagrama_cableado.jpg", "Cortes/Pendientes")],
        [["id"], row("Camionetas", "Toyota", "Hilux")], new Map(), new Set());
    assert.equal(result.suggestions[0].status, "suggested");
    assert.equal(result.suggestions[0].candidates[0].model, "Hilux");
    assert.ok(result.suggestions[0].candidates[0].signals.includes("filename_model_exact"));
});
run("reconoce únicamente alias explícitos", () => {
    const result = build([metadata(3, "Triton_apertura.jpg", "Cortes/Pendientes")],
        [["id"], row("Camionetas", "Mitsubishi", "L200")], new Map(), new Set());
    assert.equal(result.suggestions[0].status, "suggested");
    assert.ok(result.suggestions[0].candidates[0].signals.includes("filename_alias"));
    assert.equal(result.suggestions[0].candidates[0].model, "L200");
});
run("marca como ambigua la coincidencia de un mismo modelo en marcas distintas", () => {
    const result = build([metadata(4, "Ranger_frontal.jpg", "Cortes/Modelos/Ranger")],
        [["id"], row("Camionetas", "Ford", "Ranger"), row("Camionetas", "Mazda", "Ranger")],
        new Map(), new Set());
    assert.equal(result.suggestions[0].status, "ambiguous");
    assert.equal(result.suggestions[0].candidates.length, 2);
});
run("reconoce variación de orden de tokens solo como alias orientativo", () => {
    const result = build([metadata(5, "Cruiser_Land_diagrama.jpg", "Cortes/Pendientes")],
        [["id"], row("Camionetas", "Toyota", "Land Cruiser")], new Map(), new Set());
    assert.equal(result.suggestions[0].status, "suggested");
    assert.ok(result.suggestions[0].candidates[0].signals.includes("filename_model_token_alias"));
    assert.equal(result.suggestions[0].confidence, "low");
});
run("excluye archivos ya referenciados y archivos del historial reemplazado", () => {
    const result = build([metadata(6, "Hilux.jpg", "Cortes/Pendientes"), metadata(7, "Hilux_old.jpg", "Cortes/Pendientes")],
        [["id"], row("Camionetas", "Toyota", "Hilux")],
        new Map([[fileId(6), [{ sheet: "Cortes", row: 2, column: 9 }]]]), new Set([fileId(7)]));
    assert.equal(result.summary.total, 0);
    assert.equal(result.suggestions.length, 0);
});
run("omite coincidencias débiles y tipos de archivo que no son imágenes", () => {
    const result = build([metadata(8, "manual.pdf", "Cortes/Pendientes"),
        { ...metadata(9, "unrelated.jpg", "Cortes/Pendientes"), mimeType: "application/pdf" }],
        [["id"], row("Camionetas", "Toyota", "Hilux")], new Map(), new Set());
    assert.equal(result.summary.total, 0);
});
run("limita la lista visible sin perder el total ni el digest", () => {
    const files = Array.from({ length: 305 }, (_, index) => metadata(100 + index, "Hilux_" + index + ".jpg", "Cortes/Pendientes"));
    const result = build(files, [["id"], row("Camionetas", "Toyota", "Hilux")], new Map(), new Set());
    assert.equal(result.summary.total, 305);
    assert.equal(result.suggestions.length, 300);
    assert.equal(result.summary.truncated, true);
    assert.equal(result.digestEntries.length, 305);
});
console.log("CortesImageModelAssociationSuggestions: 8/8 PASS");
