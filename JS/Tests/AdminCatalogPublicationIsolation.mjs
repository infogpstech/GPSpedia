import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const admin = read("../Services/admin.js");
const api = read("../Frontend/api-config.js");
const catalog = read("../Services/catalog.js");
const coordinator = read("../Services/Coordinator.js");

assert.equal(admin.includes("publishSharedCatalogChange_"), false);
assert.equal(admin.includes("publishAdminCatalogChange_"), false);
assert.equal(admin.includes("publishAdminCortesCatalogChange_"), false);
assert.equal(admin.includes("getSharedServiceTraffic_"), false);
assert.equal(admin.includes("handleGetServiceTraffic_"), false);
assert.doesNotMatch(admin, /GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET|removeLegacyAdminCoordinatorSettings_/);

assert.ok(api.includes("'getServiceTraffic': 'COORDINATOR'"));
assert.ok(coordinator.includes("function getServiceTrafficFromBrowser_"));
assert.ok(coordinator.includes('request.action === "getServiceTraffic"'));
assert.ok(admin.includes("response.catalogResetRequired = true;"));
assert.ok(admin.includes('"resolveVehicleContributionCandidate"]'));
assert.ok(api.includes("ADMIN_CATALOG_RESET_ACTIONS_"));
assert.ok(api.includes('routeActionInternal_("publishCatalogReset"'));
assert.ok(api.includes("'publishCatalogReset': 'CATALOG'"));
assert.ok(catalog.includes("function publishCatalogResetForActor_"));
assert.ok(catalog.includes("function handlePublishCatalogReset_"));
assert.ok(catalog.includes("case 'publishCatalogReset':"));
assert.doesNotMatch(coordinator, /publishCatalogResetFromBrowser_|getPublicCatalogChanges|catalogFeed/);
assert.ok(catalog.includes('ADMIN: new Set(["addLogo"'));
assert.ok(catalog.includes("resolveVehicleContributionCandidate"));
assert.ok(catalog.includes('service === "ADMIN"'));
assert.ok(catalog.includes("Solo Desarrollador"));
console.log("AdminCatalogPublicationIsolation: 26/26 PASS — ADMIN publica reset en CATALOG; Coordinator conserva solo tráfico");
