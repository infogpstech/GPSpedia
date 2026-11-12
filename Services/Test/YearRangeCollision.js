import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync("Services/feedback.js", "utf8");
const ui = readFileSync("ui.js", "utf8");
const helperMatch = feedback.match(/function yearRangesOverlapInclusive_\([\s\S]*?\n\}/);
assert.ok(helperMatch, "El backend debe declarar el comparador inclusivo");
const overlaps = new Function(helperMatch[0] + "\nreturn yearRangesOverlapInclusive_;")();

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS", name);
}

test("detecta superposición parcial", () => {
    assert.equal(overlaps(2018, 2022, 2020, 2024), true);
});
test("detecta contención completa en ambos sentidos", () => {
    assert.equal(overlaps(2018, 2028, 2020, 2024), true);
    assert.equal(overlaps(2020, 2024, 2018, 2028), true);
});
test("considera colisión el contacto en el límite inicial", () => {
    assert.equal(overlaps(2018, 2022, 2022, 2026), true);
});
test("considera colisión el contacto en el límite final", () => {
    assert.equal(overlaps(2022, 2026, 2018, 2022), true);
});
test("no rechaza un hueco entre generaciones", () => {
    assert.equal(overlaps(2018, 2020, 2021, 2024), false);
});
test("no rechaza un rango propuesto anterior a otra generación", () => {
    assert.equal(overlaps(2008, 2012, 2015, 2020), false);
});
test("no rechaza un rango propuesto posterior a otra generación", () => {
    assert.equal(overlaps(2025, 2028, 2018, 2024), false);
});
test("rechaza rangos invertidos como no verificables", () => {
    assert.equal(overlaps(2024, 2020, 2018, 2022), false);
});
test("rechaza extremos no numéricos como no verificables", () => {
    assert.equal(overlaps("20xx", 2024, 2018, 2022), false);
});
test("el handler backend aplica el comparador a los dos extremos de ambos rangos", () => {
    assert.ok(feedback.includes("yearRangesOverlapInclusive_(proposedAnoDesde, proposedAnoHasta, otherAnoDesde, otherAnoHasta)"));
});
test("la UI mantiene la comprobación de ambos límites para el año puntual", () => {
    assert.ok(/yearVal\s*>=\s*\(parseInt\(c\.anoDesde\)\s*\|\|\s*0\)[\s\S]*?yearVal\s*<=\s*\(parseInt\(c\.anoHasta\)\s*\|\|\s*parseInt\(c\.anoDesde\)\s*\|\|\s*0\)/.test(ui));
});
test("la UI confirma el registro backend antes de guardar la respuesta local", () => {
    assert.ok(ui.includes("await confirmValidationBeforeCache("));
    assert.ok(ui.includes("() => suggestYear("));
});

console.log("YearRangeCollision:", passed, "/ 12");
