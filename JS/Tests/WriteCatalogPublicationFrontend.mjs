import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const api = read("../Frontend/api-config.js");
const catalog = read("../Services/catalog.js");
const coordinator = read("../Services/Coordinator.js");
const write = read("../Services/write.js");
const admin = read("../Services/admin.js");

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("reset, delta y lectura del feed se enrutan exclusivamente a CATALOG", () => {
    assert.match(api, /'publishCatalogReset': 'CATALOG'/);
    assert.match(api, /'publishCatalogChange': 'CATALOG'/);
    assert.match(api, /'getCatalogChanges': 'CATALOG'/);
    assert.doesNotMatch(api, /COORDINATOR: \['publishCatalogReset'|COORDINATOR: \['getCatalogChanges'/);
});

test("WRITE y ADMIN notifican al frontend sin publicar desde Apps Script", () => {
    assert.match(api, /const WRITE_CATALOG_RESET_ACTIONS_/);
    assert.match(api, /const ADMIN_CATALOG_RESET_ACTIONS_/);
    assert.match(api, /service === "WRITE"[\s\S]*?WRITE_CATALOG_RESET_ACTIONS_\.has\(action\)[\s\S]*?publishCatalogResetAfterMutation_/);
    assert.match(api, /service === "ADMIN" && ADMIN_CATALOG_RESET_ACTIONS_\.has\(action\)[\s\S]*?publishCatalogResetAfterMutation_/);
    assert.match(api, /routeActionInternal_\("publishCatalogReset"/);
    assert.match(api, /userId: String\(payload && payload\.userId/);
    assert.match(api, /sessionToken: String\(payload && payload\.sessionToken/);
    assert.doesNotMatch(write, /publishSharedCatalogChange_/);
    assert.doesNotMatch(admin, /publishSharedCatalogChange_/);
});

test("CATALOG posee el feed, su GET público y sus publicaciones autenticadas", () => {
    assert.match(catalog, /function createCatalogChangeFeed_/);
    assert.match(catalog, /function publishCatalogResetForActor_/);
    assert.match(catalog, /function publishCatalogChangeForActor_/);
    assert.match(catalog, /String\(parameters\.catalogFeed \|\| ""\) === "1"/);
    assert.match(catalog, /case 'publishCatalogReset':/);
    assert.match(catalog, /case 'publishCatalogChange':/);
    assert.match(catalog, /case 'getCatalogChanges':/);
});

test("Coordinator deja de exponer publicación de reset y lectura pública del catálogo", () => {
    assert.doesNotMatch(coordinator, /publishCatalogResetFromBrowser_|getPublicCatalogChanges|catalogFeed/);
    assert.doesNotMatch(coordinator, /request\.action === "publishCatalogReset"/);
    assert.match(coordinator, /function getServiceTrafficFromBrowser_/);
});

console.log("CatalogPublicationFrontend: " + passed + "/4 PASS");
assert.equal(passed, 4);
