import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function extract(name){
 const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const end=source.indexOf("\nfunction ",start+10);return source.slice(start,end<0?source.length:end);
}
const append=extract("appendVehicleContributionEvent_");
const slot=extract("getVehicleContributionCutSlotIndex_");
const candidate=extract("getVehicleContributionCandidateStatus_");
const existingCut=extract("handleAppendExistingVehicleCut_");
const supplementary=extract("handleAddSupplementaryInfo");
assert.match(append,/options\.ledgerSheet \|\| getVehicleContributionLedgerSheet_\(options\.spreadsheet\)/);
assert.match(slot,/validatedLedgerSheet \|\| getVehicleContributionLedgerSheet_\(spreadsheet\)/);
assert.match(candidate,/validatedLedgerSheet \|\| getVehicleContributionLedgerSheet_\(spreadsheet\)/);
assert.match(existingCut,/const contributionLedgerSheet = getVehicleContributionLedgerSheet_\(spreadsheet\)/);
assert.match(existingCut,/ledgerSheet: appendLedgerSheet/);
assert.match(existingCut,/readVehicleContributionLedgerRows_\(appendLedgerSheet\)/);
assert.ok(existingCut.indexOf("uploadImageToDrive") < existingCut.indexOf("const appendLedgerSheet"),
 "Debe revalidar el esquema después de terminar Drive y antes del append.");
assert.ok(existingCut.indexOf("const appendLedgerSheet") < existingCut.indexOf("appendVehicleContributionEvent_"));
assert.ok(supplementary.indexOf("prepareSupplementaryImageUploads_") < supplementary.indexOf("const appendLedgerSheet"));
assert.ok(supplementary.indexOf("const appendLedgerSheet") < supplementary.indexOf("appendVehicleContributionEvent_"));
assert.match(supplementary,/ledgerSheet: appendLedgerSheet/);
assert.match(supplementary,/kind, appendLedgerSheet\)/);

let getterCalls=0;
const ledger={getLastRow:()=>1};
const helpers=new Function("WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_","getVehicleContributionLedgerSheet_",
 slot+"\n"+candidate+"\nreturn {getVehicleContributionCutSlotIndex_,getVehicleContributionCandidateStatus_};")(
 ["eventId","opId","vehicleId","operationHash","kind","payloadJson","actorId","actorName","createdAt","status","supersedesEventId"],
 ()=>{getterCalls++;throw new Error("No debe volver a validar el ledger");}
);
assert.equal(helpers.getVehicleContributionCutSlotIndex_({}, {vehicle:{id:"42"},rowValues:[]}, "EV-1", [], ledger),null);
assert.equal(helpers.getVehicleContributionCandidateStatus_({}, {vehicle:{id:"42"}}, "EV-1", "opening", ledger),true);
assert.equal(getterCalls,0);
console.log("WriteContributionLedgerReuse: 15/15 PASS — reutiliza el ledger validado y evita validaciones de encabezado repetidas");
