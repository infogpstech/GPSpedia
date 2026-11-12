import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const navigation = readFileSync("navigation.js", "utf8");
const start = navigation.indexOf("function parseVinCollectionNavigation(rawVin) {");
const end = navigation.indexOf("/* AUG-050:", start);
if (start < 0 || end <= start) throw new Error("No se encontró el parser VIN de navegación.");
const helperSource = navigation.slice(start, end);
const parseVinCollectionNavigation = new Function(helperSource + "\nreturn parseVinCollectionNavigation;")();

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS", name);
}

test("normaliza valores separados por coma", () => {
    assert.deepEqual(parseVinCollectionNavigation(" abc123, def456 "), ["ABC123", "DEF456"]);
});
test("normaliza valores separados por slash", () => {
    assert.deepEqual(parseVinCollectionNavigation("abc123/def456"), ["ABC123", "DEF456"]);
});
test("normaliza valores separados por barra inversa", () => {
    assert.deepEqual(parseVinCollectionNavigation(String.raw`abc123\def456`), ["ABC123", "DEF456"]);
});
test("normaliza valores separados por punto y coma", () => {
    assert.deepEqual(parseVinCollectionNavigation("abc123;def456"), ["ABC123", "DEF456"]);
});
test("conserva compatibilidad con JSON canónico", () => {
    assert.deepEqual(parseVinCollectionNavigation('["abc123","","def456"]'), ["ABC123", "DEF456"]);
});
test("el módulo navigation.js conserva sintaxis válida", () => {
    const moduleSource = navigation
        .replace(/^import[\\s\\S]*?from\\s+['"][^'"]+['"];?\\s*$/gm, "")
        .replace(/\\bexport\\s+(?=(?:async\\s+)?(?:function|const|let|class))/g, "");
    assert.doesNotThrow(() => new Function(moduleSource));
});

console.log("NavigationVinCollection:", passed + "/6 PASS");
