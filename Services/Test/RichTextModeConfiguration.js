import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiConfig = readFileSync("api-config.js", "utf8");
const richText = readFileSync("rich-text.js", "utf8");
const ui = readFileSync("ui.js", "utf8");
const html = readFileSync("index.html", "utf8");

function extract(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    assert.ok(i >= 0 && j > i, `No se encontró el bloque: ${start}`);
    return source.slice(i, j);
}

function createConfig(storage) {
    const source = extract(apiConfig, "export const RICH_TEXT_MODE_KEY", "export const API_ENDPOINTS")
        .replace(/^export /gm, "");
    return new Function("localStorage", source + "\nreturn { getRichTextMode, setRichTextMode, RICH_TEXT_MODE_KEY, RICH_TEXT_MODES };")(storage);
}

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        values,
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); }
    };
}

const results = [];
let passed = 0;
let failed = 0;
function test(name, callback) {
    try {
        callback();
        passed++;
        results.push({ name, status: "PASS" });
    } catch (error) {
        failed++;
        results.push({ name, status: "FAIL", message: String(error.message || error) });
    }
}

test("el valor ausente selecciona modo estricto por defecto", () => {
    const config = createConfig(createStorage());
    assert.equal(config.getRichTextMode(), "strict");
});

test("un valor almacenado inválido vuelve de forma segura al modo estricto", () => {
    const config = createConfig(createStorage({ gpsepedia_rich_text_mode: "unsafe" }));
    assert.equal(config.getRichTextMode(), "strict");
});

test("el modo avanzado válido persiste en localStorage", () => {
    const storage = createStorage();
    const config = createConfig(storage);
    assert.equal(config.setRichTextMode("advanced", "Desarrollador"), "advanced");
    assert.equal(storage.getItem("gpsepedia_rich_text_mode"), "advanced");
    assert.equal(config.getRichTextMode(), "advanced");
});

test("solo el rol Desarrollador puede modificar la preferencia", () => {
    const config = createConfig(createStorage());
    assert.throws(() => config.setRichTextMode("advanced", "Técnico"), /Solo un Desarrollador/);
    assert.throws(() => config.setRichTextMode("advanced", ""), /Solo un Desarrollador/);
});

test("se rechazan modos no admitidos sin sobrescribir la preferencia", () => {
    const storage = createStorage({ gpsepedia_rich_text_mode: "advanced" });
    const config = createConfig(storage);
    assert.throws(() => config.setRichTextMode("unrestricted", "desarrollador"), /Modo.*no válido/);
    assert.equal(storage.getItem("gpsepedia_rich_text_mode"), "advanced");
});

test("los errores de almacenamiento mantienen estricto como fallback y rechazan escrituras", () => {
    const unavailable = {
        getItem() { throw new Error("storage unavailable"); },
        setItem() { throw new Error("storage unavailable"); }
    };
    const config = createConfig(unavailable);
    assert.equal(config.getRichTextMode(), "strict");
    assert.throws(() => config.setRichTextMode("advanced", "desarrollador"), /No se pudo guardar/);
});

test("el sanitizador estricto permite únicamente formato esencial", () => {
    assert.match(richText, /new Set\(\["B", "STRONG", "SPAN", "BR"\]\)/);
    assert.match(richText, /mode === "advanced"\s*\?\s*new Set/);
    assert.match(richText, /mode === "advanced" && property === "font-size"/);
    assert.match(richText, /mode === "advanced" && property === "font-family"/);
});

test("el modo avanzado conserva etiquetas y estilos permitidos", () => {
    assert.match(richText, /"P", "DIV", "I", "EM", "U", "S", "STRIKE", "OL", "UL", "LI", "A", "IMG", "SMALL", "MARK", "FONT"/);
    assert.match(richText, /mode === "advanced" && property === "text-align"/);
});

test("la barra estricta muestra negrita y color; la avanzada añade controles", () => {
    const toolbar = extract(richText, "export function createRichTextToolbar(targetId)", "export function refreshRichTextToolbars");
    assert.match(toolbar, /makeButton\("B", "Negrita"/);
    assert.match(toolbar, /colorPicker\.type = "color"/);
    assert.match(toolbar, /if \(isAdvanced\)\s*\{[\s\S]*makeButton\("I"/);
    assert.match(toolbar, /markerSelect\.innerHTML/);
    assert.match(toolbar, /makeButton\("• Lista"/);
});

test("el modo estricto impide aplicar formatos avanzados y la tecla Enter en listas", () => {
    assert.match(richText, /getRichTextMode\(\) !== "advanced" && format !== "bold"/);
    assert.match(richText, /if \(getRichTextMode\(\) !== "advanced"\) return;/);
    assert.match(richText, /function refreshRichTextToolbars/);
});

test("el panel de Desarrollador permite cambiar y refrescar barras abiertas", () => {
    assert.match(html, /id="rich-text-mode-select"/);
    assert.match(html, /value="strict"/);
    assert.match(html, /value="advanced"/);
    assert.match(ui, /setRichTextMode\(select\.value, context && context\.role\)/);
    assert.match(ui, /refreshRichTextToolbars\(\)/);
    assert.match(ui, /initializeRichTextModeControl_\(\)/);
});

test("los saltos naturales y registros de texto plano siguen siendo compatibles", () => {
    assert.match(richText, /normalizeTextNewlines/);
    assert.match(richText, /createElement\("br"\)/);
    assert.match(richText, /new Set\(\["B", "STRONG", "SPAN", "BR"\]\)/);
});

console.log(JSON.stringify({ suite: "RichTextModeConfiguration", status: failed ? "FAIL" : "PASS", passed, failed, results }, null, 2));
if (failed) process.exitCode = 1;
