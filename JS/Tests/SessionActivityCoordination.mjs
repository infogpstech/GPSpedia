import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const api=read("JS/Frontend/api-config.js"),write=read("JS/Services/write.js"),users=read("JS/Services/users.js"),admin=read("JS/Services/admin.js"),feedback=read("JS/Services/feedback.js"),auth=read("JS/Services/Auth.js"),coordinator=read("JS/Services/Coordinator.js"),client=read("JS/Services/SharedMutationClient.js"),utilities=read("JS/Services/Utilities.js");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("WRITE coordina las operaciones protegidas y actualiza actividad dentro de la sesión validada",()=>{
 assert.match(write,/function isSharedMutationAction_\(action\)\s*\{\s*return \["addOrUpdateCut","addSupplementaryInfo","addVinToVehicle","allocateVehicleId","freezeCortesIds"\]/);
 assert.match(write,/if \(action !== "checkOperation"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\);\s*try \{\s*return withSharedMutationLease_\("WRITE", "sessionActivity"/);
 assert.match(write,/touchSessionActivityIfDue_\(sh,sessionMatch\.rowIndex,sessionMatch\.row,COLS_ACTIVE_SESSIONS\.LastActivityAt\)/);
 ["handleCheckOperation","handleAddOrUpdateCutLocked","handleAddVinToVehicleLocked","assertDeveloperForIdMaintenance"].forEach(name=>{
  const i=write.indexOf("function "+name);assert.ok(i>=0,name);
  const j=write.indexOf("\nfunction ",i+10);assert.match(write.slice(i,j<0?undefined:j),/getAuthenticatedCollaborator\(/,name+" debe autenticar y tocar actividad");
 });
});
testCase("USERS coordina lecturas y mutaciones y actualiza LastActivityAt al verificar sesión",()=>{
 assert.match(users,/if \(action !== "getUsers"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\);\s*try \{\s*return withSharedMutationLease_\("USERS", "sessionActivity"/);
 assert.match(users,/function isSharedMutationAction_\(action\)\s*\{\s*return \["createUser","updateProfile"\]/);
 assert.match(users,/touchSessionActivityIfDue_\(sessionsSheet,sessionMatch\.rowIndex,sessionMatch\.row,COLS_ACTIVE_SESSIONS\.LastActivityAt\)/);
 ["handleGetUsers","handleCreateUser","handleUpdateProfile"].forEach(name=>{
  const i=users.indexOf("function "+name);assert.ok(i>=0,name);
  const j=users.indexOf("\nfunction ",i+10);assert.match(users.slice(i,j<0?undefined:j),/getVerifiedSession\(/,name+" debe validar la sesión dentro de la operación");
 });
});
testCase("ADMIN exige sesión y coordina tanto lecturas como mutaciones protegidas",()=>{
 assert.match(admin,/if \(!isSharedMutationAction_\(action\)\) \{\s*if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\);\s*const operation = isSharedReadAction_\(action\) \? action : "sessionActivity";\s*try \{\s*return withSharedMutationLease_\("ADMIN", operation/);
 assert.match(admin,/return withSharedMutationLease_\("ADMIN", action/);
 assert.match(admin,/touchSessionActivityIfDue_\(sh,sessionMatch\.rowIndex,sessionMatch\.row,6\)/);
 assert.match(admin,/const developerContext = action === 'ping' \? null : \(ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)\)/);
});
testCase("FEEDBACK coordina operaciones protegidas y deja públicas solo las rutas declaradas",()=>{
 assert.match(feedback,/return withSharedMutationLease_\("FEEDBACK", "sessionActivity"/);
 assert.match(feedback,/return withSharedMutationLease_\("FEEDBACK", action/);
 assert.match(feedback,/touchSessionActivityIfDue_\(sh,sessionMatch\.rowIndex,sessionMatch\.row,6\)/);
 assert.match(feedback,/new Set\(\["getPysData", "sendContactForm", "getCatalogChanges"\]\)/);
 assert.doesNotMatch(feedback,/getCatalogChanges:\s*null/);
 assert.match(client,/catalogFeed=1/);
 assert.match(feedback,/const actor = assertFeedbackSession\(source, FEEDBACK_ACTION_PERMISSIONS\[action\]\)/);
});
testCase("Los servicios localizan token y perfil por fila exacta y reducen escrituras de actividad",()=>{
 const specs=[[feedback,"assertFeedbackSession"],[users,"getVerifiedSession"],[admin,"getAdminSessionContext_"],[write,"getAuthenticatedCollaborator"]];
 for(const [source,name] of specs){
  const start=source.indexOf("function "+name+"(");assert.ok(start>=0,name);
  const end=source.indexOf("\nfunction ",start+10),body=source.slice(start,end<0?source.length:end);
  assert.match(body,/findUniqueRowsByExactValue_\(/,name+" no usa búsqueda directa");
  assert.equal(body.includes("getDataRange()"),false,name+" todavía recorre la hoja completa");
  assert.match(source,/function findUniqueRowsByExactValue_\(/);
  assert.match(source,/createTextFinder\(/);
  assert.match(source,/function touchSessionActivityIfDue_\(/);
  assert.match(source,/5\*60\*1000/);
 }
});
testCase("AUTH usa el actor central y no repite verificaciones de usuario/rol en cada handler",()=>{
 assert.equal(auth.includes("touchProtectedAuthRequestSession_"),false);
 const dispatchStart=auth.indexOf("function doPostInternal_(");
 const dispatchEnd=auth.indexOf("\nfunction ",dispatchStart+10);
 const dispatch=auth.slice(dispatchStart,dispatchEnd<0?auth.length:dispatchEnd);
 assert.equal(dispatch.includes("validateAndTouchSession_"),false);
 assert.equal(dispatch.includes("validateSessionReadOnly_"),false);
 assert.match(auth,/function requireSharedAuthActor_\(/);
 const handlerNames=["handleAcceptTerms","handleChangePassword","handleResetUserPassword","handleResetUserSessions","handleClearSensitiveLogs","handleDeleteUser","handleUpdateUser","handleMigrateLegacyPasswords"];
 for(const name of handlerNames){
  const start=auth.indexOf("function "+name+"(");assert.ok(start>=0,"Falta "+name);
  const end=auth.indexOf("\nfunction ",start+10),body=auth.slice(start,end<0?auth.length:end);
  assert.match(body,/requireSharedAuthActor_\(/,name+" debe consumir el actor central");
  assert.doesNotMatch(body,/findSessionRowsByTokenUnderLock_|getSessionExpirationStatus_/,name+" no debe revalidar la sesión");
 }
 const logout=auth.slice(auth.indexOf("function handleLogout("));
 assert.match(logout,/findSessionRowsByTokenUnderLock_\(sessionsSheet, sessionToken\)/);
 assert.match(logout,/sessionUserId !== requestedUserId/);
 assert.equal(logout.includes("getSessionExpirationStatus_"),false,"Logout debe poder limpiar sesiones expiradas o ya revocadas");
 assert.equal(api.includes("ensureSessionTouched_"),false);
 assert.equal(api.includes("touchSessionBeforeAction"),false);
 assert.match(auth,/const sessionOptions = payload\.sessionToken && action !== "logout"\s*\? \{ session: \{ sessionToken: payload\.sessionToken \} \}/);
});
testCase("Coordinator usa SESSION_CONTEXTS como barrera lógica y conserva las operaciones ADMIN→WRITE declaradas",()=>{
 assert.match(coordinator,/ADMIN:\s*\{\s*sessionActivity:\s*\{ read: \["SESSION_CONTEXTS"\] \}/);
 assert.match(coordinator,/migrateReplacedImagesSchema:\s*\{ read: \["USERS"\], write: \["IMAGE_INVENTORY"\] \}/);
 assert.match(coordinator,/readResources\.push\("SESSION_CONTEXTS"\)/);
 assert.match(coordinator,/writeResources\.push\("ACTIVE_SESSIONS"\)/);
 assert.equal(coordinator.includes('sharedWrite: ["ACTIVE_SESSIONS"]'),false);
 assert.match(coordinator,/login: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
 assert.match(coordinator,/logout: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
 assert.match(coordinator,/nestedActions:\s*\{ WRITE: \["allocateVehicleId"\] \}/);
 assert.match(coordinator,/nestedActions:\s*\{ WRITE: \["freezeCortesIds"\] \}/);
 assert.match(coordinator,/migrateIdentifiers:\s*\{ maintenance: true \}/);
 assert.match(coordinator,/rollbackIdentifiers:\s*\{ maintenance: true \}/);
});

testCase("El contexto central de sesión se registra al login, se revoca y se reutiliza en los servicios",()=>{
 assert.match(auth,/syncSharedSessionContextsForUser_\(/);
 assert.match(auth,/syncSharedUserSessionContexts_\(/);
 assert.match(auth,/revokeSharedUserSessionContexts_\(/);
 assert.match(auth,/revokeSharedSessionContext_\(/);
 assert.match(auth,/validateSharedSessionContext_\(userId, sessionToken\)/);
 assert.match(auth,/const sessionOptions = payload\.sessionToken && action !== "logout"/);
 assert.match(auth,/syncAuthSheetActivityFromActor_\(actor\.userId, payload\.sessionToken, actor\)/);
 assert.match(coordinator,/function registerSession_\(/);
 assert.match(coordinator,/function syncUserSessions_\(/);
 assert.match(client,/function syncSharedUserSessionContexts_\(/);
 assert.match(coordinator,/function revokeSession_\(/);
 assert.match(coordinator,/function revokeUserSessions_\(/);
 assert.match(coordinator,/function authorizeSession_\(/);
 assert.match(coordinator,/function validateSessionContext_\(/);
 assert.match(client,/options && options\.session/);
 assert.match(client,/function withSharedSessionActor_\(/);
 assert.match(client,/delete payload\.__feedbackActor/);
 for(const source of [users,write,admin,feedback]){
  assert.match(source,/sessionOptions = \{ session: \{ userId: payload\.userId, sessionToken: payload\.sessionToken \} \}/);
  assert.match(source,/withSharedSessionActor_\(e, actor\)/);
 }
 assert.match(users,/payload && payload\.__sharedSessionActor/);
 assert.match(write,/payload&&payload\.__sharedSessionActor/);
 assert.match(admin,/payload&&payload\.__sharedSessionActor/);
 assert.match(feedback,/payload&&payload\.__sharedSessionActor/);
 assert.match(utilities,/payload&&payload\.__sharedSessionActor/);
 assert.match(utilities,/withSharedMutationLease_\("UTILITIES","migrateTimestamps"/);
 assert.match(utilities,/__sharedSessionActor:actor/);
 assert.match(utilities,/sessionToken:payload&&payload\.sessionToken/);
});

console.log("SessionActivityCoordination: "+passed+"/"+passed+" PASS");
