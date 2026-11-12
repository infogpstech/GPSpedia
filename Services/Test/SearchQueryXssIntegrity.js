import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("ui.js", "utf8");
const navigation = readFileSync("navigation.js", "utf8");
const main = readFileSync("main.js", "utf8");
const share = readFileSync("share-utils.js", "utf8");
const search = readFileSync("search-utils.js", "utf8");

function extract(source, start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i + start.length);
    assert.ok(i >= 0 && j > i, `No se encontró el bloque: ${start}`);
    return source.slice(i, j);
}

function createNode(tagName) {
    let text = "";
    const node = {
        tagName: String(tagName).toUpperCase(),
        children: [],
        style: {},
        innerHTMLWrites: 0,
        appendChild(child) { this.children.push(child); return child; },
        set textContent(value) { text = String(value ?? ""); this.children = []; },
        get textContent() { return text + this.children.map(child => child.textContent || "").join(""); },
        set innerHTML(value) { this.innerHTMLWrites++; this.html = String(value); },
        get innerHTML() { return this.html || ""; }
    };
    return node;
}

const resultsFnSource = extract(ui, "export function mostrarResultadosDeBusqueda(", "export function showNoResultsMessage(")
    .replace(/\\bexport\\s+(?=function)/, "");
const noResultsFnSource = extract(ui, "export function showNoResultsMessage(", "// Normaliza el indicador técnico");
const createRenderers = () => {
    const container = createNode("div");
    const documentStub = {
        getElementById(id) { return id === "contenido" ? container : null; },
        createElement(tag) { return createNode(tag); }
    };
    const renderResults = new Function(
        "document", "getLogoUrlForMarca", "setOptimizedImage", "mostrarModelosPorMarca",
        "crearCardVehiculo", "shouldAutoOpenVehicleDetail", "mostrarDetalleModal",
        resultsFnSource + "\nreturn mostrarResultadosDeBusqueda;"
    )(documentStub, () => "", () => {}, () => {}, () => createNode("div"), () => false, () => {});
    const renderEmpty = new Function("document", noResultsFnSource + "\nreturn showNoResultsMessage;")(documentStub);
    return { container, renderResults, renderEmpty };
};

function createDecodeHelpers() {
    const decodeSearchSource = extract(search, "export function decodeSearchHash(", "/** Crea una única promesa");
    const decodeSearchHash = new Function(decodeSearchSource.replace(/^export /, "") + "\nreturn decodeSearchHash;")();
    const decodeSharedSource = extract(share, "export function decodeSharedVehicleHash(", "/**\n * Solo resuelve registros");
    const decodeSharedVehicleHash = new Function("decodeSearchHash", "URLSearchParams",
        decodeSharedSource.replace(/^export /, "") + "\nreturn decodeSharedVehicleHash;"
    )(decodeSearchHash, URLSearchParamsMock);
    return { decodeSearchHash, decodeSharedVehicleHash };
}

class URLSearchParamsMock {
    constructor(value) {
        this.values = new Map();
        String(value || "").split("&").forEach(part => {
            if (!part) return;
            const index = part.indexOf("=");
            const key = decodeURIComponent((index < 0 ? part : part.slice(0, index)).replace(/\\+/g, " "));
            const raw = index < 0 ? "" : part.slice(index + 1);
            const item = decodeURIComponent(raw.replace(/\\+/g, " "));
            const list = this.values.get(key) || [];
            list.push(item);
            this.values.set(key, list);
        });
    }
    getAll(key) { return this.values.get(key) || []; }
}

const results = [];
let passed = 0;
let failed = 0;
function test(name, callback) {
    try { callback(); passed++; results.push({ name, status: "PASS" }); }
    catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
}

test("el encabezado representa la consulta como texto literal", () => {
    const payload = '<img src=x onerror=alert(1)>"><svg/onload=alert(2)>';
    const h = createRenderers();
    h.renderResults({ type: "modelo", query: payload, results: [] }, false);
    assert.equal(h.container.children[0].tagName, "H4");
    assert.equal(h.container.children[0].textContent, `Resultados para: "${payload}"`);
    assert.equal(h.container.innerHTMLWrites, 0);
    assert.equal(h.container.children[0].children.length, 0);
});

test("el estado sin resultados representa payloads hostiles como texto", () => {
    const payloads = [
        '<script>alert(1)</script>',
        '" onmouseover="alert(1)',
        '<svg><foreignObject onload=alert(1)></foreignObject></svg>',
        'A&B <tag> "comillas" áéíóú ñ 😀'
    ];
    payloads.forEach(payload => {
        const h = createRenderers();
        h.renderEmpty(payload);
        assert.equal(h.container.children[0].tagName, "P");
        assert.equal(h.container.children[0].textContent, `No se encontraron resultados para "${payload}".`);
        assert.equal(h.container.innerHTMLWrites, 0);
    });
});

test("las funciones de renderizado no interpolan query/textoBusqueda en innerHTML", () => {
    assert.doesNotMatch(resultsFnSource, /innerHTML\s*=.*query/);
    assert.doesNotMatch(noResultsFnSource, /innerHTML\s*=.*textoBusqueda/);
    assert.match(resultsFnSource, /heading\.textContent\s*=/);
    assert.match(noResultsFnSource, /message\.textContent\s*=/);
});

test("los deep links codificados conservan la consulta sin interpretarla como HTML", () => {
    const { decodeSearchHash, decodeSharedVehicleHash } = createDecodeHelpers();
    const payload = '<img src=x onerror=alert(1)> & "texto"';
    assert.equal(decodeSearchHash("#search=" + encodeURIComponent(payload)), payload);
    assert.equal(decodeSharedVehicleHash("#search=" + encodeURIComponent(payload)).query, payload);
    assert.equal(decodeSharedVehicleHash("#vehicle=VEH-1&search=" + encodeURIComponent(payload)).query, payload);
});

test("main.js restaura el deep link en el value del input y navega con la consulta", () => {
    assert.match(main, /searchInput\.value\s*=\s*query/);
    assert.match(main, /navigation\.filtrarContenido\(query/);
    assert.doesNotMatch(main, /innerHTML\s*=.*query/);
});

test("navigation.js pasa la consulta original al renderer sin crear HTML", () => {
    assert.match(navigation, /mostrarResultadosDeBusqueda\(\{ type: resultType, query: textoBusqueda/);
    assert.doesNotMatch(navigation, /innerHTML\s*=.*(?:busqueda|textoBusqueda)/i);
});

test("el módulo UI conserva sintaxis válida tras retirar imports y exports", () => {
    const moduleSource = ui
        .replace(/^import[\s\S]*?;\s*/gm, "")
        .replace(/^export\s*\{[^}]*\};?\s*$/gm, "")
        .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class))/g, "");
    assert.doesNotThrow(() => new Function(moduleSource));
});

console.log(JSON.stringify({ suite: "SearchQueryXssIntegrity", status: failed ? "FAIL" : "PASS", passed, failed, results }, null, 2));
if (failed) process.exitCode = 1;
