import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const auth=read("JS/Services/Auth.js"),shared=read("JS/Services/SharedMutationClient.js");
const write=read("JS/Services/write.js"),admin=read("JS/Services/admin.js");
const feedback=read("JS/Services/feedback.js"),catalog=read("JS/Services/catalog.js");
const utilities=read("JS/Services/Utilities.js");
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("AUTH registra el actor local tras login sin sincronizarlo con Coordinator",()=>{
 const sync=auth.slice(auth.indexOf("function syncSharedSessionContextsForUser_"),auth.indexOf("\nfunction handleLogin",auth.indexOf("function syncSharedSessionContextsForUser_")));
 assert.match(sync,/cacheSharedSessionActor_/);assert.doesNotMatch(sync,/syncSharedUserSessionContexts_|UrlFetchApp|Coordinator/);
 assert.match(auth,/function handleValidateSession\(payload\) \{[\s\S]*?validateSessionReadOnly_\(sessionToken, userId\)/);
 assert.doesNotMatch(auth,/validateSharedSessionContext_|syncSharedUserSessionContexts_|withSharedMutationLease_\("AUTH"/);
});
test("AUTH conserva hash, bloqueo temporal y validación autoritativa de ActiveSessions",()=>{
 assert.match(auth,/function createPasswordHash\(/);assert.match(auth,/function verifyStoredPassword\(/);
 assert.match(auth,/function beginLoginAttempt\(/);assert.match(auth,/function registerFailedLoginAttempt\(/);
 assert.match(auth,/function validateSessionReadOnly_\(/);assert.match(auth,/matches\.length !== 1/);
});
test("Todos los servicios protegidos resuelven actor desde la fuente compartida en cache miss",()=>{
 for(const [name,source] of [["AUTH",auth],["WRITE",write],["ADMIN",admin],["FEEDBACK",feedback],["UTILITIES",utilities]]){
  assert.match(source,/getCachedSharedSessionActor_/,"Falta caché de actor en "+name);
 }
 assert.match(shared,/function loadSharedSessionActorFromSpreadsheet_/);
 assert.match(shared,/getSheetByName\("Users"\)/);assert.match(shared,/getSheetByName\("ActiveSessions"\)/);
 assert.match(shared,/function getCachedSharedSessionActor_/);
});
test("CATALOG valida desde Spreadsheet en cache miss y reutiliza caché local",()=>{
 assert.match(catalog,/function loadCatalogSessionActor_/);assert.match(catalog,/function getCatalogSessionActor_/);
 assert.match(catalog,/CATALOG_SESSION_ACTOR_CACHE_TTL_SECONDS_ = 21600/);
 assert.match(catalog,/function invalidateCatalogSessionActorCache_/);
 assert.match(catalog,/now\.getTime\(\)>=addCatalogCalendarMonthsUTC_\(createdAt,3\)/);
});
test("El actor procede de Users/ActiveSessions, no del rol enviado por el navegador",()=>{
 assert.match(shared,/const userRows = usersSheet\.getDataRange\(\)\.getValues\(\)\.slice\(1\)/);
 assert.match(shared,/const role = String\(user\[3\]/);
 assert.match(shared,/pendingMarker\.startsWith\("__role_revocation_pending__:"\)/);
 assert.match(shared,/now >= addMonths\(createdAt, 3\) \|\| now >= addMonths\(lastActivityAt, 1\)/);
 assert.doesNotMatch(shared,/source\.role|payload\.role/);
});
test("La invalidación local no requiere secreto compartido",()=>{
 const invalidation=shared.slice(shared.indexOf("function handleSharedSessionActorCacheInvalidation_"),shared.indexOf("function handleSharedSessionActorCachePriming_"));
 assert.doesNotMatch(invalidation,/GPSpedia_COORDINATOR_SECRET|secret|properties|getProperty/);
 for(const [name,source] of [["AUTH",auth],["WRITE",write],["ADMIN",admin],["FEEDBACK",feedback],["UTILITIES",utilities],["CATALOG",catalog]]){
  assert.match(source,/__invalidateSessionActorCache/,"Falta endpoint local de invalidación en "+name);
 }
});
test("Las mutaciones AUTH revocan sus cachés locales antes de limpiar tokens",()=>{
 assert.match(auth,/function revokeSharedSessionContext_\(userId, sessionToken\) \{\s*return invalidateLocalSharedSessionActorCaches_/);
 assert.match(auth,/function revokeSharedUserSessionContexts_\(userId, sessionTokens\) \{\s*return invalidateLocalSharedSessionActorCaches_/);
 const revoke=auth.slice(auth.indexOf("function revokeAllUserSessionsUnderLock_"),auth.indexOf("\nfunction ",auth.indexOf("function revokeAllUserSessionsUnderLock_")+10));
 assert.ok(revoke.indexOf("beforeClear(tokens)")<revoke.indexOf("tokenRange.setValues(nextValues)"));
});
test("No existen llamadas de sesión desde SharedMutationClient a Coordinator",()=>{
 assert.doesNotMatch(shared,/function registerSession\(|function syncUserSessions\(|function revokeSession\(|function revokeUserSessions\(|function validateSessionContext\(/);
 assert.doesNotMatch(shared,/client\.syncUserSessions|client\.validateSessionContext|client\.revokeSession/);
});
test("UTILITIES conserva la comprobación local de capacidad Desarrollador",()=>{
 assert.match(utilities,/function migrateTimestamps\(payload\)[\s\S]*?getCachedSharedSessionActor_/);
 assert.match(utilities,/trusted\.role\.trim\(\)\.toLowerCase\(\)!=="desarrollador"/);
 assert.doesNotMatch(utilities,/withSharedMutationLease_\("UTILITIES"/);
});
console.log("SessionActivityCoordination: "+passed+"/"+passed+" PASS — sesiones sin Coordinator ni secretos compartidos");
