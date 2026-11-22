import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
function blockFrom(startToken, endToken) {
    const start = source.indexOf(startToken);
    assert.ok(start >= 0, "No se encontró " + startToken);
    const end = source.indexOf(endToken, start + startToken.length);
    assert.ok(end > start, "No se encontró el final de " + startToken);
    return source.slice(start, end);
}

const carousel = blockFrom("function crearCarrusel(", "\nfunction ");
const pysCarousel = blockFrom("function renderPosiblesProblemasAccordion(", "\nfunction ");
assert.doesNotMatch(carousel, /window\.addEventListener\s*\(\s*['"]resize['"]/,
    "crearCarrusel no debe registrar listeners globales por instancia.");
assert.doesNotMatch(pysCarousel, /window\.addEventListener\s*\(\s*['"]resize['"]/,
    "El carrusel PyS no debe registrar listeners globales por render.");
assert.equal([...source.matchAll(/window\.addEventListener\s*\(\s*["']resize["']/g)].length, 1,
    "ui.js debe mantener un único listener global de resize.");
assert.match(source, /function updateAllCarouselButtons_\(\)[\s\S]*?querySelectorAll\(["']\.carousel-container["']\)/);
assert.match(source, /function scheduleCarouselButtonsResize_\(\)[\s\S]*?clearTimeout\(carouselResizeTimer_\)[\s\S]*?updateAllCarouselButtons_\(\)/);
console.log("CarouselResizeListenerLifecycle: 5/5 PASS — listener resize único y sin retención por carrusel");
