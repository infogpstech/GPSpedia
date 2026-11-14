import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync("main.js", "utf8");
const html = readFileSync("index.html", "utf8");
const css = readFileSync("style.css", "utf8");
const ui = readFileSync("ui.js", "utf8");
const navigation = readFileSync("navigation.js", "utf8");

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

test("main.js no conserva referencias a controles de filtros rápidos retirados", () => {
    for (const token of ["toggleFiltersBtn", "filtersBar", "catalog-filters-bar", "btn-toggle-filters"]) {
        assert.equal(main.includes(token), false, token);
    }
});

test("HTML y CSS no conservan controles ni selectores de filtros rápidos", () => {
    for (const token of ['id="catalog-filters-bar"', 'id="btn-toggle-filters"', "quick-filter", "filters-bar"]) {
        assert.equal(html.includes(token), false, token);
        assert.equal(css.includes(token), false, token);
        assert.equal(ui.includes(token), false, token);
    }
});

test("se conserva la búsqueda directa y el botón para limpiar", () => {
    assert.match(main, /searchInput\.addEventListener\('input'/);
    assert.match(main, /navigation\.filtrarContenido\(searchInput\.value\)/);
    assert.match(main, /clearSearchBtn\.addEventListener\('click'/);
    assert.match(main, /navigation\.filtrarContenido\(''\)/);
});

test("focus y blur conservan la sincronización de navegación sin controles obsoletos", () => {
    assert.match(main, /searchInput\.addEventListener\('focus'/);
    assert.match(main, /searchInput\.addEventListener\('blur'/);
    assert.match(main, /document\.body\.classList\.remove\('search-active'\)/);
    assert.doesNotMatch(main, /toggleFiltersBtn|filtersBar/);
});

function createBlurHandler({ value = "", historyState = { level: "categorias" }, modalVisible = false } = {}) {
    const start = main.indexOf("searchInput.addEventListener('blur', () => {");
    const bodyStart = main.indexOf("{", start) + 1;
    const end = main.indexOf("\n    });", bodyStart);
    assert.ok(start >= 0 && bodyStart > start && end > bodyStart, "No se encontró el handler blur.");
    const body = main.slice(bodyStart, end);
    const searchInput = { value };
    const removedClasses = [];
    const documentStub = {
        body: { classList: { remove(name) { removedClasses.push(name); } } },
        getElementById(id) { return id === "modalDetalle" && modalVisible ? { classList: { contains: () => true } } : null; }
    };
    const windowStub = {
        history: { state: historyState },
        state: { getState: () => ({ navigationState: { previousState: null } }), setState() {} }
    };
    const handler = new Function(
        "isBackGestureBlurring", "searchInput", "window", "document", "setState", "replaceNavigationState", "setTimeout",
        "return function handleSearchBlur() {" + body + "\n};"
    )(false, searchInput, windowStub, documentStub, () => {}, () => {}, callback => { callback(); return 1; });
    return { handler, removedClasses };
}

test("blur con consulta vacía no lanza ReferenceError y limpia la animación", () => {
    const h = createBlurHandler({ value: "" });
    assert.doesNotThrow(() => h.handler());
    assert.deepEqual(h.removedClasses, ["search-active"]);
});

test("blur con consulta activa conserva el estado y no toca filtros inexistentes", () => {
    const h = createBlurHandler({ value: "Toyota", historyState: { level: "busqueda_focused" } });
    assert.doesNotThrow(() => h.handler());
    assert.deepEqual(h.removedClasses, ["search-active"]);
});

test("blur con modal visible conserva la clase de búsqueda", () => {
    const h = createBlurHandler({ value: "", modalVisible: true });
    assert.doesNotThrow(() => h.handler());
    assert.deepEqual(h.removedClasses, []);
});

test("la navegación conserva su flujo de filtrado de búsqueda", () => {
    assert.match(navigation, /mostrarResultadosDeBusqueda\(\{ type: resultType, query: textoBusqueda/);
});

console.log("SearchFilterCleanup:", passed + "/8 PASS");
