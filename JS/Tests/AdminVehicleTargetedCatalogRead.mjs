import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function getAdminProjectedVehicleFieldSnapshot_(vehicleId, fieldName)");
const end = admin.indexOf("\nfunction handleGetAdminImageUploadStatus", start);
assert.ok(start >= 0 && end > start);
const source = admin.slice(start, end);
const calls = [];
const helper = new Function("UrlFetchApp", "CATALOG_SERVICE_URL", source + "\nreturn getAdminProjectedVehicleFieldSnapshot_;")(
    { fetch(url, options) { calls.push(JSON.parse(options.payload)); return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ status: "success", vehicle: {
            id: "42", imgCorte1: "FILE-NEW",
            contributionSources: { imgCorte1: { eventId: "EV-42" } },
            contributionCandidates: [{ eventId: "EV-C", reason: "field_conflict" }]
        }})
    }; }},
    "https://catalog.test/exec"
);
const result = helper("42", "imgCorte1");
assert.equal(result.value, "FILE-NEW");
assert.equal(result.eventId, "EV-42");
assert.equal(result.candidates.length, 1);
assert.equal(calls.length, 1);
assert.equal(calls[0].action, "getVehicleProjection");
assert.equal(calls[0].payload.vehicleId, "42");
assert.throws(() => {
    const broken = new Function("UrlFetchApp", "CATALOG_SERVICE_URL", source + "\nreturn getAdminProjectedVehicleFieldSnapshot_;")(
        { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ status: "success", vehicle: { id: "7" } }) }) },
        "https://catalog.test/exec"
    );
    broken("42", "imgCorte1");
}, /No se pudo recuperar/);
console.log("AdminVehicleTargetedCatalogRead: 2/2 PASS");
