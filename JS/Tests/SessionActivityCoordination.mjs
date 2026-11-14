import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const api=read("JS/Frontend/api-config.js"),write=read("Services/write.js"),users=read("Services/users.js"),admin=read("Services/admin.js"),feedback=read("Services/feedback.js"),auth=read("Services/Auth.js"),coordinator=read("Services/Coordinator.js");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("WRITE coordina las operaciones protegidas y actualiza actividad dentro de la sesión validada",()=>{
 assert.match(write,/function isSharedMutationAction_\(action\)\s*\{\s*return \["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","allocateVehicleId","freezeCortesIds"\]/);
 assert.match(write,/if \(action !== "checkOperation"\) return doPostInternal_\(e\);\s*try \{\s*return withSharedMutationLease_\("WRITE", "sessionActivity"/);
 assert.match(write,/sh\.getRange\(sessionMatch\.rowIndex,COLS_ACTIVE_SESSIONS\.LastActivityAt\)\.setValue\(new Date\(\)\.toISOString\(\)\)/);
 ["handleCheckOperation","handleAddOrUpdateCutLocked","handleAddVinToVehicleLocked","assertDeveloperForIdMaintenance"].forEach(name=>{
  const i=write.indexOf("function "+name);assert.ok(i>=0,name);
  const j=write.indexOf("\nfunction ",i+10);assert.match(write.slice(i,j<0?undefined:j),/getAuthenticatedCollaborator\(/,name+" debe autenticar y tocar actividad");
 });
});
testCase("USERS coordina lecturas y mutaciones y actualiza LastActivityAt al verificar sesión",()=>{
 assert.match(users,/if \(action !== "getUsers"\) return doPostInternal_\(e\);\s*try \{\s*return withSharedMutationLease_\("USERS", "sessionActivity"/);
 assert.match(users,/function isSharedMutationAction_\(action\)\s*\{\s*return \["createUser","updateProfile"\]/);
 assert.match(users,/sessionsSheet\.getRange\(sessionMatch\.rowIndex,COLS_ACTIVE_SESSIONS\.LastActivityAt\)\.setValue\(new Date\(\)\.toISOString\(\)\)/);
 ["handleGetUsers","handleCreateUser","handleUpdateProfile"].forEach(name=>{
  const i=users.indexOf("function "+name);assert.ok(i>=0,name);
  const j=users.indexOf("\nfunction ",i+10);assert.match(users.slice(i,j<0?undefined:j),/getVerifiedSession\(/,name+" debe validar la sesión dentro de la operación");
 });
});
testCase("ADMIN exige sesión y coordina tanto lecturas como mutaciones protegidas",()=>{
 assert.match(admin,/if \(!isSharedMutationAction_\(action\)\) \{\s*if \(action === "ping"\) return doPostInternal_\(e\);\s*try \{\s*return withSharedMutationLease_\("ADMIN", "sessionActivity"/);
 assert.match(admin,/return withSharedMutationLease_\("ADMIN", action/);
 assert.match(admin,/sh\.getRange\(sessionMatch\.rowIndex,6\)\.setValue\(new Date\(\)\.toISOString\(\)\)/);
 assert.match(admin,/const developerContext = action === 'ping' \? null : \(ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)\)/);
});
testCase("FEEDBACK coordina operaciones protegidas y deja públicas solo las rutas declaradas",()=>{
 assert.match(feedback,/return withSharedMutationLease_\("FEEDBACK", "sessionActivity"/);
 assert.match(feedback,/return withSharedMutationLease_\("FEEDBACK", action/);
 assert.match(feedback,/sh\.getRange\(sessionMatch\.rowIndex,6\)\.setValue\(new Date\(\)\.toISOString\(\)\)/);
 assert.match(feedback,/new Set\(\["getPysData", "sendContactForm"\]\)/);
 assert.match(feedback,/const actor = assertFeedbackSession\(source, FEEDBACK_ACTION_PERMISSIONS\[action\]\)/);
});
testCase("AUTH actualiza actividad en la misma petición protegida y el frontend ya no ejecuta preflight",()=>{
 assert.match(auth,/touchProtectedAuthRequestSession_\(request\.action, request\.payload \|\| \{\}\)/);
 assert.match(auth,/const result = validateAndTouchSession_\(token\)/);
 assert.match(auth,/sessionsSheet\.getRange\(session\.rowIndex, COLS_ACTIVE_SESSIONS\.LastActivityAt\)\.setValue\(lastActivityAt\)/);
 assert.equal(api.includes("ensureSessionTouched_"),false);
 assert.equal(api.includes("touchSessionBeforeAction"),false);
});
testCase("Coordinator reserva ActiveSessions y permite solo las dos operaciones ADMIN→WRITE declaradas",()=>{
 assert.match(coordinator,/ADMIN:\s*\{\s*sessionActivity:\s*\{ write: \["ACTIVE_SESSIONS"\] \}/);
 assert.match(coordinator,/nestedActions:\s*\{ WRITE: \["allocateVehicleId"\] \}/);
 assert.match(coordinator,/nestedActions:\s*\{ WRITE: \["freezeCortesIds"\] \}/);
 assert.match(coordinator,/migrateIdentifiers:\s*\{ maintenance: true \}/);
 assert.match(coordinator,/rollbackIdentifiers:\s*\{ maintenance: true \}/);
});
console.log("SessionActivityCoordination: "+passed+"/"+passed+" PASS");
