import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>fs.readFileSync(resolve(root,path),"utf8");
const api=read("JS/Frontend/api-config.js"),write=read("JS/Services/write.js"),users=read("JS/Services/users.js"),admin=read("JS/Services/admin.js"),feedback=read("JS/Services/feedback.js"),auth=read("JS/Services/Auth.js"),coordinator=read("JS/Services/Coordinator.js"),client=read("JS/Services/SharedMutationClient.js"),utilities=read("JS/Services/Utilities.js");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("WRITE consulta checkOperation sin lease y usa actor cacheado para mutaciones",()=>{
 assert.match(write,/if \(!isSharedMutationAction_\(action\)\) \{[\s\S]*?doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
 assert.match(write,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "WRITE" \}\)/);
 assert.doesNotMatch(write,/withSharedMutationLease_\("WRITE", action/);
 assert.doesNotMatch(write,/touchSessionActivityIfDue_|getSessionExpirationStatus_/);
 const preflightStart=write.indexOf("function prepareAddOrUpdateCutRequest_"),preflightEnd=write.indexOf("\nfunction handleAddOrUpdateCut(payload)",preflightStart);
 assert.ok(preflightStart>=0&&preflightEnd>preflightStart,"Falta el preflight autenticado de addOrUpdateCut");
 assert.match(write.slice(preflightStart,preflightEnd),/getAuthenticatedCollaborator\(/,"addOrUpdateCut debe consumir el actor central antes del lock");
 const lockedStart=write.indexOf("function handleAddOrUpdateCutLocked("),lockedEnd=write.indexOf("\nfunction handleAddOrUpdateCutLockedUnsafe_",lockedStart);
 assert.doesNotMatch(write.slice(lockedStart,lockedEnd),/getAuthenticatedCollaborator\(/,"La persistencia no debe retener la validación de actor bajo el lock");
 ["handleAddVinToVehicleLocked","assertDeveloperForIdMaintenance"].forEach(name=>{
  const i=write.indexOf("function "+name);assert.ok(i>=0,name);
  const j=write.indexOf("\nfunction ",i+10);assert.match(write.slice(i,j<0?undefined:j),/getAuthenticatedCollaborator\(/,name+" debe consumir el actor central");
 });
 assert.doesNotMatch(write.slice(write.indexOf("function handleCheckOperation"),write.indexOf("\nfunction ",write.indexOf("function handleCheckOperation")+10)),/getAuthenticatedCollaborator\(/);
});

testCase("USERS usa actor cacheado para perfil y conserva lease solo para createUser",()=>{
 assert.match(users,/if \(!\["getUsers", "updateProfile"\]\.includes\(action\)\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
 assert.match(users,/function isSharedMutationAction_\(action\)\s*\{\s*return \["createUser"\]/);
 assert.match(users,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "USERS" \}\)/);
 assert.match(users,/withSharedMutationLease_\("USERS", action/);
 assert.doesNotMatch(users,/touchSessionActivityIfDue_|getSessionExpirationStatus_/);
 ["handleGetUsers","handleCreateUser","handleUpdateProfile"].forEach(name=>{
  const i=users.indexOf("function "+name);assert.ok(i>=0,name);
  const j=users.indexOf("\nfunction ",i+10);assert.match(users.slice(i,j<0?undefined:j),/getVerifiedSession\(/,name+" debe consumir el actor central");
 });
});

testCase("ADMIN exige actor central cacheado y no coordina acciones ordinarias",()=>{
 const start=admin.indexOf("function doPost(e)"),end=admin.indexOf("\nfunction doPostInternal_",start),router=admin.slice(start,end);
 assert.ok(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "ADMIN" })'));
 assert.doesNotMatch(router,/withSharedMutationLease_|sessionActivity|nestedToken|__sharedMutationToken/);
 const auditStart=admin.indexOf("function handleAuditDriveImagesInCortes("),auditEnd=admin.indexOf("function handleAuditDriveImagesInCortesCore_",auditStart);
 assert.ok(auditStart>=0&&auditEnd>auditStart);
 assert.match(admin.slice(auditStart,auditEnd),/withSharedMutationLease_\("ADMIN", "auditDriveImagesInCortes"/);
const adminLeaseOperations = [...admin.matchAll(/withSharedMutationLease_\("ADMIN", "([^"]+)"/g)].map(match => match[1]).sort();
 const expectedAdminLeaseOperations = ["auditDriveImagesInCortes", "createCortesImageFolder", "saveUnusedImagesInventory"].sort();
 assert.deepEqual(adminLeaseOperations, expectedAdminLeaseOperations,
  "ADMIN conserva leases para auditoría, creación de carpeta e inventario");
 const activityStart=admin.indexOf("function recordImageAdministrationActivity("),activityEnd=admin.indexOf(String.fromCharCode(10)+"function ",activityStart+10);
 const activity=admin.slice(activityStart,activityEnd);
 assert.match(activity,/sheet\.appendRow\(\[/);
 assert.doesNotMatch(activity,/withSharedMutationLease_|recordAdminImageActivity/);
 assert.doesNotMatch(admin,/touchSessionActivityIfDue_|getSessionExpirationStatus_/);
 assert.match(admin,/const developerContext = action === 'ping' \? null : \(ADMIN_MODAL_EDIT_ACTIONS\.has\(action\) \? assertModalEditSession\(payload\) : assertDeveloperSession\(payload\)\)/);
});

testCase("FEEDBACK usa actor cacheado sin leases por acción y conserva sus rutas públicas",()=>{
 const start=feedback.indexOf("function doPost(e)"),end=feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_",start),router=feedback.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(router.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "FEEDBACK" })'));
 assert.doesNotMatch(router,/withSharedMutationLease_/);
 assert.match(router,/DIRECT_SERVICE_TRAFFIC_CONFIG_\.actions\.has\(action\)/);
 assert.doesNotMatch(feedback,/touchSessionActivityIfDue_|getSessionExpirationStatus_/);
 assert.match(feedback,/new Set\(\["getPysData", "sendContactForm", "getCatalogChanges"\]\)/);
 assert.doesNotMatch(feedback,/getCatalogChanges:\s*null/);
 assert.match(client,/catalogFeed=1/);
 assert.match(feedback,/const actor = assertFeedbackSession\(source, FEEDBACK_ACTION_PERMISSIONS\[action\]\)/);
});

testCase("Los servicios protegidos exigen el actor central y no revalidan Users/ActiveSessions",()=>{
 const specs=[[admin,"getAdminSessionContext_"],[feedback,"assertFeedbackSession"],[write,"getAuthenticatedCollaborator"],[utilities,"assertUtilitiesDeveloperSession_"]];
 for(const [source,name] of specs){
  const start=source.indexOf("function "+name+"(");assert.ok(start>=0,name);
  const next=name==="getAdminSessionContext_"?source.indexOf("/** Consume el actor autenticado por Coordinator",start):name==="getAuthenticatedCollaborator"?source.indexOf("\n// ===",start):source.indexOf("\nfunction ",start+10),body=source.slice(start,next<0?source.length:next);
  assert.match(body,/__sharedSessionActor/,name+" debe exigir actor central");
  assert.doesNotMatch(body,/getSpreadsheet|ActiveSessions|Users|findUniqueRowsByExactValue_|getSessionExpirationStatus_|touchSessionActivityIfDue_/,name+" conserva revalidación local por hojas");
 }
 const start=users.indexOf("function getVerifiedSession("),next=users.indexOf("\nfunction ",start+10),userBody=users.slice(start,next<0?users.length:next);
 const body=userBody.slice(userBody.indexOf("{")+1);
 assert.match(body,/__sharedSessionActor/);
 assert.match(body,/if \(requireUserRow === true\)/);
 assert.doesNotMatch(body,/ActiveSessions|getSessionExpirationStatus_|touchSessionActivityIfDue_|sessionToken/);
 assert.match(coordinator,/function authorizeSession_\(userId, token, currentTime\)/);
 assert.match(coordinator,/readAuthContext_\(userId\)/);
 assert.match(coordinator,/context\.revokedBefore/);
 assert.match(coordinator,/absoluteExpiry|idleExpiry/);
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
  if(name==="handleClearSensitiveLogs") assert.match(body,/payload && payload\.__sharedSessionActor/);
  else assert.match(body,/requireSharedAuthActor_\(/,name+" debe consumir el actor central");
  if(name==="handleMigrateLegacyPasswords") assert.doesNotMatch(body,/getSessionExpirationStatus_|assertRequesterRoleRevocationClear_/);
  else assert.doesNotMatch(body,/findSessionRowsByTokenUnderLock_|getSessionExpirationStatus_/,name+" no debe revalidar la sesión");
 }
 const logout=auth.slice(auth.indexOf("function handleLogout("));
 assert.match(logout,/findSessionRowsByTokenUnderLock_\(sessionsSheet, sessionToken\)/);
 assert.match(logout,/sessionUserId !== requestedUserId/);
 assert.equal(logout.includes("getSessionExpirationStatus_"),false,"Logout debe poder limpiar sesiones expiradas o ya revocadas");
 assert.equal(api.includes("ensureSessionTouched_"),false);
 assert.equal(api.includes("touchSessionBeforeAction"),false);
 assert.match(auth,/const sessionOptions = payload\.sessionToken && action !== "logout"\s*\? \{ session: \{ sessionToken: payload\.sessionToken \} \}/);
 const authRouter=auth.slice(auth.indexOf("function doPost(e)"),auth.indexOf("function doPostInternal_(e)"));
 assert.ok(authRouter.includes('if (action === "clearSensitiveLogs")') && authRouter.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH" })'));
 assert.doesNotMatch(authRouter,/withSharedMutationLease_\("AUTH", "clearSensitiveLogs"/);
});
testCase("Coordinator conserva metadatos de recursos ADMIN sin sesiones ni subleases por acción",()=>{
 const policyStart=coordinator.indexOf("function coordinatorPolicy_");
 const start=coordinator.indexOf("ADMIN: {",policyStart),end=coordinator.indexOf("FEEDBACK: {",start);
 const adminPolicy=coordinator.slice(start,end);
 assert.match(adminPolicy,/getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);
 assert.doesNotMatch(adminPolicy,/sessionActivity|nestedActions/);
 assert.match(coordinator,/readResources\.push\("SESSION_CONTEXTS"\)/);
 assert.match(coordinator,/writeResources\.push\("ACTIVE_SESSIONS"\)/);
 assert.equal(coordinator.includes('sharedWrite: ["ACTIVE_SESSIONS"]'),false);
 assert.match(coordinator,/login: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
 assert.match(coordinator,/logout: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
});

testCase("El contexto central de sesión se registra al login, se revoca y se reutiliza en los servicios",()=>{
 assert.match(auth,/syncSharedSessionContextsForUser_\(/);
 assert.match(auth,/syncSharedUserSessionContexts_\(/);
 assert.match(auth,/revokeSharedUserSessionContexts_\(/);
 assert.match(auth,/revokeSharedSessionContext_\(/);
 assert.match(auth,/validateSharedSessionContext_\(userId, sessionToken\)/);
 assert.match(auth,/const sessionOptions = payload\.sessionToken && action !== "logout"/);
 assert.match(auth,/syncAuthSheetActivityFromActor_\(userId, sessionToken, sharedContext\.actor\)/);
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
 assert.match(users,/sessionOptions = \{ session: \{ sessionToken: payload\.sessionToken \} \}/);
 assert.match(users,/withSharedSessionActor_\(e, actor\)/);
 assert.match(admin,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "ADMIN" \}\)/);
 assert.match(admin,/withSharedSessionActor_\(e, actor\)/);
 assert.match(feedback,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
 assert.match(feedback,/withSharedSessionActor_\(e, actor\)/);
 assert.match(write,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "WRITE" \}\)/);
 assert.match(write,/withSharedSessionActor_\(e, actor\)/);
 assert.match(users,/payload && payload\.__sharedSessionActor/);
 assert.match(write,/__sharedSessionActor/);
 assert.match(admin,/__sharedSessionActor/);
 assert.match(feedback,/__sharedSessionActor/);
 assert.match(utilities,/__sharedSessionActor/);
 assert.match(utilities,/withSharedMutationLease_\("UTILITIES","migrateTimestamps"/);
 assert.match(utilities,/__sharedSessionActor:actor/);
 assert.match(utilities,/sessionToken:payload&&payload\.sessionToken/);
});



testCase("AUTH aplica límites por rol y revoca la sesión más antigua sin bloquear el nuevo login",()=>{
 assert.match(auth,/const SESSION_LIMITS = \{\s*'desarrollador': Infinity,\s*'jefe': 5,\s*'supervisor': 3,\s*'tecnico': 1,\s*'tecnico_exterior': 1\s*\}/);
 assert.match(auth,/\.sort\(\(a, b\) => a\.createdAt - b\.createdAt \|\| a\.rowIndex - b\.rowIndex\)/);
 assert.match(auth,/getOldestSessionsToRevoke_\(activeRows, token, sessionLimit\)/);
 assert.match(auth,/activeRows\.filter\(row => row\.token !== currentToken\)/);
 assert.doesNotMatch(auth,/rows\.length > 5/);
 assert.doesNotMatch(auth,/LOGIN_LIMIT_EXCEEDED|SESSION_LIMIT_EXCEEDED/);

 assert.ok(auth.indexOf("candidates.forEach(row => revokeSharedSessionContext_(userId, row.token))") <
     auth.indexOf("sessionsSheet.getRange(row.rowIndex, COLS_ACTIVE_SESSIONS.ActiveSessions).clearContent()", auth.indexOf("function createOrRecoverLoginSessionUnderLock_")),
     "Las cachés y el contexto central deben revocarse antes de eliminar la sesión antigua.");
});

testCase("Coordinator no limita por cinco y almacena sesiones en bloques recuperables",()=>{
 assert.doesNotMatch(coordinator,/context\.sessions\.length > 5|context\.sessions\.length >= 5|inputSessions\.length > 5/);
 assert.match(coordinator,/function authSessionChunkPrefix_\(userId, generation\)/);
 assert.match(coordinator,/function saveAuthContext_\(context\)/);
 assert.match(coordinator,/SHARED_AUTH_SESSION_CHUNK_LENGTH_/);
 assert.match(coordinator,/context\.sessionChunkCount/);
});


testCase("La selección de sesiones excedentes respeta los límites y siempre conserva el login nuevo",()=>{
 const start=auth.indexOf("function getOldestSessionsToRevoke_(");
 const end=auth.indexOf("\n}",start)+2;
 assert.ok(start>=0&&end>start,"Debe existir el selector puro de sesiones antiguas.");
 const select=vm.runInNewContext("("+auth.slice(start,end)+")");
 for(const [role,limit] of [["tecnico",1],["tecnico_exterior",1],["supervisor",3],["jefe",5]]){
  const rows=Array.from({length:limit+2},(_,index)=>({
   token:index===limit+1?"current-login":"old-"+index,
   rowIndex:300-index,
   createdAt:1700000000000+index*1000
  }));
  const selected=select(rows,"current-login",limit);
  assert.deepEqual(Array.from(selected,row=>row.token),["old-0","old-1"],role+" debe expulsar solo el exceso más antiguo.");
 }
 const developerRows=Array.from({length:100},(_,index)=>({
  token:"developer-"+index,rowIndex:100-index,createdAt:1700000000000+index
 }));
 assert.equal(select(developerRows,"developer-99",Infinity).length,0,
  "Desarrollador no debe expulsar sesiones por cantidad.");
});

console.log("SessionActivityCoordination: "+passed+"/"+passed+" PASS");
