import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const source=readFileSync(resolve(root,"JS/Services/write.js"),"utf8");
function extract(name,nextName){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"Missing "+name);
 const end=nextName?source.indexOf("\nfunction "+nextName+"(",start+10):source.indexOf("\nfunction ",start+10);
 return source.slice(start,end>start?end:source.length);
}
const driveHelper=extract("runWriteDriveWorkOutsideScriptLock_","handleAddOrUpdateCut");
const driveRunner=new Function(driveHelper+";return runWriteDriveWorkOutsideScriptLock_;")();
function fakeLock(busy=false){
 let held=true;const events=[];
 return {events,hasLock:()=>held,releaseLock(){assert.equal(held,true);held=false;events.push("release");},
  tryLock(timeout){events.push("try:"+timeout);if(busy)return false;held=true;return true;},
  waitLock(timeout){events.push("wait:"+timeout);if(busy)throw new Error("busy");held=true;return true;},isHeld:()=>held};
}
{
 const lock=fakeLock(),state={releasedForDrive:false};
 const value=driveRunner(lock,state,"OP-1",()=>{assert.equal(lock.isHeld(),false);lock.events.push("drive");return "uploaded";});
 assert.equal(value,"uploaded");assert.deepEqual(lock.events,["release","drive","try:0"]);
 assert.equal(lock.isHeld(),true);assert.equal(state.releasedForDrive,true);
}
{
 const lock=fakeLock(),state={releasedForDrive:false};
 const value=driveRunner(lock,state,"",()=>{assert.equal(lock.isHeld(),true);return "legacy";});
 assert.equal(value,"legacy");assert.deepEqual(lock.events,[]);assert.equal(state.releasedForDrive,false);
}
{
 const lock=fakeLock(true),state={releasedForDrive:false};
 assert.throws(()=>driveRunner(lock,state,"OP-2",()=>{lock.events.push("drive");return "uploaded";}),e=>e.code==="WRITE_LOCK_REACQUIRE_PENDING");
 assert.deepEqual(lock.events,["release","drive","try:0"]);assert.equal(lock.isHeld(),false);assert.equal(state.releasedForDrive,true);
}
const slotSource=extract("findNextAvailableCutSlot_","isAddCutPlainObject_");
const slotRunner=new Function("COLS_CORTES","readIdempotenciaEntries_","getIdempotenciaSheet",
 slotSource+";return findNextAvailableCutSlot_;")(
 {tipoCorte1:2,tipoCorte2:3,tipoCorte3:4},
 ()=>({entries:[
  {vehicleId:"V1",slotIndex:1,status:"pending"},
  {vehicleId:"V1",slotIndex:2,status:"completed"},
  {vehicleId:"V2",slotIndex:3,status:"pending"}
 ]}),()=>({name:"Idempotencia"}));
assert.equal(slotRunner(["V1","","",""],"V1"),2);
assert.equal(slotRunner(["V1","","",""],"V2"),1);
assert.equal(slotRunner(["V1","used","used",""],"V1"),3);
assert.equal(slotRunner(["V1","used","used","used"],"V1"),null);
const unsafe=extract("handleAddOrUpdateCutLockedUnsafe_","handleCheckVehicle");
assert.equal((unsafe.match(/uploadImageToDrive\(/g)||[]).length,5);
assert.equal((unsafe.match(/runWriteDriveWorkOutsideScriptLock_/g)||[]).length,9);
assert.doesNotMatch(unsafe,/getAuthenticatedCollaborator\(/);
assert.ok(unsafe.split("\n").filter(line=>line.includes("uploadImageToDrive(")).every(line=>line.includes("shortLedgerLock: true")));
assert.ok(unsafe.includes("findNextAvailableCutSlot_(rowValues, vehicleId)"));
const locked=extract("handleAddOrUpdateCutLocked","handleAddOrUpdateCutLockedUnsafe_");
const preflight=extract("prepareAddOrUpdateCutRequest_","handleAddOrUpdateCut");
assert.ok(preflight.includes('getAuthenticatedCollaborator(payload, payload && payload.silent === true ? ["desarrollador"] : undefined)'));
assert.doesNotMatch(locked,/getAuthenticatedCollaborator\(|validateAddOrUpdateCutPayload_/, "El lock no debe retener autenticación ni validación de payload");
const outer=extract("handleAddOrUpdateCut","handleAddOrUpdateCutLocked");
assert.ok(outer.indexOf("prepareAddOrUpdateCutRequest_(payload)")<outer.indexOf("lock.tryLock(0)"));
assert.ok(locked.includes("lockState && lockState.releasedForDrive"));
assert.ok(source.includes("if (lock.hasLock()) lock.releaseLock()"));
assert.ok(outer.includes("const lock = LockService.getScriptLock()"));
assert.ok(outer.includes("lock.tryLock(0)"));
assert.ok(outer.indexOf("reserveCortesVehicleIdForOperation_") < outer.indexOf("lock.tryLock(0)"), "La reserva moderna append-only debe ocurrir antes del lock físico.");
assert.ok(!outer.includes("waitLock("));
assert.match(outer,/handleAppendExistingVehicleCut_\(preparedRequest\)/);
assert.ok(outer.indexOf("handleAppendExistingVehicleCut_")<outer.indexOf("lock.tryLock(0)"),"Los aportes a vehículos existentes con opId deben entrar al ledger antes de cualquier lock de compatibilidad.");
assert.doesNotMatch(source,/function handleAddOrUpdateCut\(payload\)\s*\{[\s\S]{0,160}waitLock\(30000\)/);

const imageUpload = extract("uploadImageToDriveWithShortLedgerLocks_", "uploadImageToDrive");
assert.doesNotMatch(imageUpload,/withImageUploadLedgerLock_|getOrCreateImageUploadLedgerSheet_|saveImageUploadLedgerRecord_/,
 "El flujo WRITE principal de imágenes ya no debe reservar ni actualizar el ledger mutable.");
assert.ok(imageUpload.includes("getOrCreateImageUploadEventsSheet_"));
assert.ok(imageUpload.includes("appendImageUploadEventRequired_"));
const imageLink = extract("markImageUploadLinkedWithShortLedgerLock_", "markImageUploadLinked");
assert.doesNotMatch(imageLink,/withImageUploadLedgerLock_|getOrCreateImageUploadLedgerSheet_|saveImageUploadLedgerRecord_/,
 "La vinculación WRITE debe anexarse al journal sin ScriptLock.");
assert.ok(imageLink.includes("appendImageUploadEventRequired_"));
console.log("1/1 PASS — WRITE Drive fuera del ScriptLock, reserva de slots y cargas por journal");
