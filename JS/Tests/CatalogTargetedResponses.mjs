import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const vehicleStart = catalog.indexOf("function handleGetVehicleProjection_(payload = {})");
const vehicleEnd = catalog.indexOf("\nfunction handleGetContributionCandidates_", vehicleStart);
const candidatesStart = vehicleEnd;
const candidatesEnd = catalog.indexOf("\nfunction handleGetNavigationData", candidatesStart);
assert.ok(vehicleStart >= 0 && vehicleEnd > vehicleStart && candidatesEnd > candidatesStart);
const vehicleHandler = catalog.slice(vehicleStart, vehicleEnd);
const candidatesHandler = catalog.slice(candidatesStart, candidatesEnd);

const snapshot = { status: "success", source: "spreadsheet", data: { cortes: [
    { id: "3", marca: "Nissan", modelo: "Frontier", imgCorte1: "IMG", contributionSources: { imgCorte1: { eventId: "EV-3" } }, contributionCandidates: [] },
    { id: "9", marca: "Honda", modelo: "CR-V", contributionCandidates: [
        { eventId: "EV-C", opId: "OP-C", kind: "opening", reason: "opening_already_filled", payload: { text: "Apertura" } }
    ]},
    { id: "22", marca: "Toyota", modelo: "Hilux", contributionCandidates: [
        { eventId: "EV-B", opId: "OP-B", kind: "cut", reason: "vin_conflict", payload: { vinPrefix: "X" } }
    ]}
]}};
let calls = 0;
const getVehicle = new Function("readCatalogVehicleProjection_", vehicleHandler + "\nreturn handleGetVehicleProjection_;")(
    vehicleId => { calls++; return snapshot.data.cortes.find(vehicle => vehicle.id === vehicleId); }
);
const one = getVehicle({ vehicleId: "3" });
assert.equal(one.vehicle.id, "3");
assert.equal(one.vehicle.contributionSources.imgCorte1.eventId, "EV-3");
assert.equal(calls, 1);
assert.throws(() => getVehicle({ vehicleId: "../3" }), /ID de vehículo válido/);
assert.throws(() => getVehicle({ vehicleId: "99" }), /no existe/);
const duplicateSnapshot = { status: "success", source: "spreadsheet", data: { cortes: [...snapshot.data.cortes, { ...snapshot.data.cortes[0] }] } };
const duplicateHandler = new Function("readCatalogVehicleProjection_", vehicleHandler + "\nreturn handleGetVehicleProjection_;")(
    () => { throw new Error("El ID del vehículo aparece duplicado en CATALOG; no se devolvió una proyección ambigua."); }
);
assert.throws(() => duplicateHandler({ vehicleId: "3" }), /duplicado/);

const getCandidates = new Function("readCatalogContributionProjectionVehicles_", candidatesHandler + "\nreturn handleGetContributionCandidates_;")(
    () => { calls++; return snapshot.data.cortes; }
);
const limited = getCandidates({ limit: 1 });
assert.equal(limited.total, 2);
assert.equal(limited.candidates.length, 1);
assert.equal(limited.candidates[0].vehicleId, "9");
assert.equal(limited.candidates[0].vehicleLabel, "Honda CR-V");
assert.equal(limited.truncated, true);
assert.equal(limited.readOnly, true);
assert.deepEqual(Object.keys(limited).sort(), ["candidates", "limit", "readOnly", "source", "status", "total", "truncated"].sort());
const inventoryVehicles = [{
    id: "3", marca: "Nissan", modelo: "Frontier",
    contributionCandidates: [{ eventId: "EV-IMG", opId: "OP-IMG", kind: "cut", reason: "requires_review",
        payload: { image: "https://drive.google.com/file/d/FILE1234567890/view" } }]
}];
const inventorySourceEvents = [
    { eventId: "EV-IMG", opId: "OP-IMG", vehicleId: "3", operationHash: "a".repeat(64), kind: "cut",
      payload: { image: "https://drive.google.com/file/d/FILE1234567890/view" },
      createdAt: "2026-11-21T00:00:00.000Z", status: "review", supersedesEventId: "" },
    { eventId: "EV-RES", opId: "OP-RES", vehicleId: "3", operationHash: "b".repeat(64), kind: "cut",
      payload: { image: "https://drive.google.com/file/d/FILE1234567890/view" },
      createdAt: "2026-11-21T00:01:00.000Z", status: "accepted", supersedesEventId: "EV-IMG" },
    { eventId: "EV-NOIMAGE", opId: "OP-NOIMAGE", vehicleId: "3", operationHash: "c".repeat(64), kind: "feed",
      payload: { text: "12V" }, createdAt: "2026-11-21T00:02:00.000Z", status: "review", supersedesEventId: "" }
];
const inventoryResponse = new Function("readCatalogContributionProjectionVehicles_", candidatesHandler + "\nreturn handleGetContributionCandidates_;")(
    (spreadsheetRef, includeSourceEvents) => includeSourceEvents
        ? { vehicles: inventoryVehicles, sourceEvents: inventorySourceEvents }
        : inventoryVehicles
);
const inventoryPayload = inventoryResponse({ limit: 500, includeImageInventoryEvents: true });
assert.equal(inventoryPayload.imageInventoryCandidates.length, 1);
assert.equal(inventoryPayload.imageInventoryCandidates[0].eventId, "EV-IMG");
assert.deepEqual(inventoryPayload.imageInventoryEvents.map(event => event.eventId), ["EV-IMG", "EV-RES"]);
assert.equal(inventoryPayload.imageInventoryEvents[1].supersedesEventId, "EV-IMG");

const all = getCandidates({ limit: 500 });
assert.equal(all.total, 2);
assert.equal(all.candidates.length, 2);
const clamped = getCandidates({ limit: 0 });
assert.equal(clamped.limit, 1);
assert.equal(clamped.candidates.length, 1);
assert.equal(clamped.truncated, true);
assert.ok(vehicleHandler.includes("readCatalogVehicleProjection_(vehicleId)"));
assert.ok(!vehicleHandler.includes("handleGetCatalogData"), "la proyección dirigida no debe cargar hojas ajenas a la proyección vehicular");
assert.ok(!vehicleHandler.includes("handleGetCatalogData"), "la proyección dirigida no debe cargar hojas ajenas a la proyección vehicular");
assert.ok(candidatesHandler.includes("readCatalogContributionProjectionVehicles_()"));
assert.ok(!candidatesHandler.includes("handleGetCatalogData"), "la lista de candidatos no debe cargar logos, tutoriales ni relay");
assert.ok(catalog.includes("function readCatalogContributionProjectionVehicles_(spreadsheetRef)"));
assert.ok(catalog.includes('"getVehicleProjection", "getContributionCandidates"'));
assert.match(catalog, /case 'getVehicleProjection'/);
assert.match(catalog, /case 'getContributionCandidates'/);

const adminProjectionStart = admin.indexOf("function getAdminProjectedVehicleFieldSnapshot_(vehicleId, fieldName)");
const adminProjectionEnd = admin.indexOf("\nfunction handleGetAdminImageUploadStatus", adminProjectionStart);
assert.ok(adminProjectionStart >= 0 && adminProjectionEnd > adminProjectionStart);
const adminProjection = admin.slice(adminProjectionStart, adminProjectionEnd);
const fetchCalls = [];
const helper = new Function("UrlFetchApp", "CATALOG_SERVICE_URL", adminProjection + "\nreturn getAdminProjectedVehicleFieldSnapshot_;")(
    { fetch(url, options) { fetchCalls.push(JSON.parse(options.payload)); return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ status: "success", vehicle: snapshot.data.cortes[0] })
    }; }},
    "https://catalog.test/exec"
);
const projected = helper("3", "imgCorte1");
assert.equal(projected.eventId, "EV-3");
assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0].action, "getVehicleProjection");
assert.equal(fetchCalls[0].payload.vehicleId, "3");
console.log("CatalogTargetedResponses: 3/3 PASS — proyección individual, candidatos mínimos y consumidor ADMIN");
