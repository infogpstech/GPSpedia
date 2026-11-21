import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../HTML/add_cortes.html", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");

function functionBody(source, name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction " + nextName + "(", start + 10);
    return source.slice(start, end >= 0 ? end : source.length);
}
const aperture = functionBody(ui, "openAddAperturaModal", "openAddFeedModal");
const feed = functionBody(ui, "openAddFeedModal", "buildVehicleVideoMetadata");
assert.match(aperture, /const operationId = createSuggestionOperationId_\(\)/);
assert.match(aperture, /opId:\s*operationId/);
assert.match(feed, /const operationId = createSuggestionOperationId_\(\)/);
assert.match(feed, /opId:\s*operationId/);
assert.ok(aperture.indexOf("const operationId =") < aperture.indexOf("form.onsubmit"));
assert.ok(feed.indexOf("const operationId =") < feed.indexOf("form.onsubmit"));
assert.match(html, /vehicleId:\s*state\.selectedVehicleId,\s*opId:\s*state\.opId/);
assert.match(write, /buildImageUploadOperationKey\(payload\.opId,\s*payload\.vehicleId,\s*field\)/);
assert.match(write, /buildImageUploadOperationKey\(payload\.opId,\s*payload\.vehicleId,\s*field\)/);
assert.match(write, /function buildImageUploadOperationKey\(opId, vehicleId, fieldName\)/);
console.log("SupplementaryImageOperationIdContract: 8/8 PASS");
