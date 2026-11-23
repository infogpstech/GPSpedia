import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const admin = read("../Services/admin.js");
const api = read("../Frontend/api-config.js");
const coordinator = read("../Services/Coordinator.js");

assert.equal(admin.includes("publishSharedCatalogChange_"), false);
assert.equal(admin.includes("publishAdminCatalogChange_"), false);
assert.equal(admin.includes("publishAdminCortesCatalogChange_"), false);
assert.ok(admin.includes("response.catalogResetRequired = true;"));
assert.ok(admin.includes('"resolveVehicleContributionCandidate"]'));
assert.ok(api.includes("ADMIN_CATALOG_RESET_ACTIONS_"));
assert.ok(api.includes('routeActionInternal_("publishCatalogReset"'));
assert.ok(coordinator.includes("publishCatalogResetFromBrowser_"));
assert.ok(coordinator.includes('ADMIN: new Set(["addLogo"'));
assert.ok(coordinator.includes("resolveVehicleContributionCandidate"));
assert.ok(coordinator.includes('service === "ADMIN" || operation === "freezeCortesIds"'));
console.log("AdminCatalogPublicationIsolation: 11/11 PASS — ADMIN no publica entre servicios; frontend invalida el feed con sesión de desarrollador");
