import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
assert.equal(admin.includes("getAdminProjectedVehicleFieldSnapshot_"),false);
assert.equal(admin.includes("CATALOG_SERVICE_URL"),false);
assert.ok(ui.includes("verifyAdminVehicleFieldUpdateProjectionFrontend_"));
assert.ok(ui.includes('routeAction("getVehicleProjection"'));
const start=ui.indexOf("function normalizeAdminFieldProjectionValueClient_"),end=ui.indexOf("async function saveFieldSilently",start);
assert.ok(start>=0&&end>start);
const helpers=ui.slice(start,end);
async function run(vehicle,eventId,proposed){
 const verify=new Function("routeAction","getDeveloperSessionPayload",helpers+";return verifyAdminVehicleFieldUpdateProjectionFrontend_;")(async()=>({status:"success",vehicle}),()=>({userId:"DEV-1",sessionToken:"SESSION-1"}));
 return verify("42","modelo",proposed,eventId);
}
const applied=await run({id:"42",modelo:"Corolla X",contributionSources:{modelo:{eventId:"EV-1"}},contributionCandidates:[]},"EV-1","Corolla X");
assert.equal(applied.projectionVerification,"applied");assert.equal(applied.candidateReviewPending,false);
const candidate=await run({id:"42",modelo:"Corolla",contributionSources:{modelo:{eventId:"EV-OLD"}},contributionCandidates:[{eventId:"EV-1",reason:"field_conflict"}]},"EV-1","Corolla X");
assert.equal(candidate.projectionVerification,"candidate");assert.equal(candidate.candidateReviewPending,true);
const superseded=await run({id:"42",modelo:"Corolla X",contributionSources:{modelo:{eventId:"EV-2"}},contributionCandidates:[]},"EV-1","Corolla X");
assert.equal(superseded.projectionVerification,"superseded");assert.equal(superseded.superseded,true);
console.log("AdminVehicleTargetedCatalogRead: 3/3 PASS — proyección CATALOG coordinada desde frontend");
