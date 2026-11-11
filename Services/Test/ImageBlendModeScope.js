import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const blendRules = [...cssWithoutComments.matchAll(/([^{}]+)\{([^{}]*\bmix-blend-mode\s*:[^{}]+)\}/g)];

assert.equal(blendRules.length, 1, "Debe existir una única regla de mezcla controlada.");
assert.equal(
    blendRules[0][1].replace(/\s+/g, " ").trim(),
    ".dark-mode img.gps-transparent-asset:not(.img-vehiculo-modal)",
    "La mezcla debe limitarse a imágenes marcadas explícitamente y excluir el vehículo del modal."
);
assert.match(blendRules[0][2], /mix-blend-mode\s*:\s*lighten\s*;/);
assert.doesNotMatch(cssWithoutComments, /\.dark-mode\s+\.card:not\(\.brand-logo-item\)\s+img/);
assert.doesNotMatch(cssWithoutComments, /\.dark-mode\s+#imagenVehiculo_preview/);
assert.doesNotMatch(cssWithoutComments, /\.dark-mode\s+\.card-img-top/);
assert.doesNotMatch(cssWithoutComments, /\.dark-mode\s+\.match-card-img/);

console.log("ImageBlendModeScope: 7/7 PASS");
