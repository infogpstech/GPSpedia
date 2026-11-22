import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const start = source.indexOf("const refreshTutorialCatalog = async () => {");
assert.ok(start >= 0, "No se encontró refreshTutorialCatalog");
const end = source.indexOf("\n    const createOperationId", start);
assert.ok(end > start, "No se encontró el cierre de refreshTutorialCatalog");
const block = source.slice(start, end);
const deltaAt = block.indexOf("authApi.loadInitialData(true, { silent: true })");
const fallbackAt = block.indexOf('routeAction("getCatalogData")');
assert.ok(deltaAt >= 0, "La actualización debe intentar primero el feed incremental");
assert.ok(fallbackAt > deltaAt, "El snapshot completo solo debe ejecutarse después del intento incremental");
assert.match(block, /offline\.isCompleteCatalogSnapshot\(currentCatalog\)/);
assert.match(block, /offline\.isCompleteCatalogSnapshot\(fresh\.data\)/);
assert.match(block, /isCurrentRefresh\(\)/);
assert.match(block, /catalogBeforeFallback[\s\S]*?getState\(\)\.catalogData !== catalogBeforeFallback/);
assert.ok(block.indexOf("if (!isCurrentRefresh()) return null;") < deltaAt);
console.log("TutorialCatalogRefreshDeltaFirst: 6/6 PASS — delta primero, snapshot completo como fallback y guardia de sesión");
