import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
const auth = read("JS/Services/Auth.js");
const coordinator = read("JS/Services/Coordinator.js");
const sessionActor = read("JS/Services/SharedSessionActor.js");
const sessionInvalidation = read("JS/Frontend/sessionCacheInvalidation.js");
const admin = read("JS/Services/admin.js");

function extract(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const nextFunction = source.indexOf("\nfunction ", start + 10);
    const end = nextFunction > start ? nextFunction : source.length;
    return source.slice(start, end);
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("Las restricciones de cuenta y cambios de rol permanecen en AUTH con RBAC jerárquico", () => {
    const update = extract(auth, "handleUpdateUser");
    assert.match(update, /requireSharedAuthActor_\(payload, \["desarrollador", "jefe", "supervisor"\]/);
    assert.match(update, /const canUpdate =/);
    assert.match(update, /const allowedRoles =/);
    assert.match(update, /countActiveDevelopers_\(users\) <= 1/);
    assert.match(update, /reconcileRoleRevocationUnderLock_\(usersSheet, sessionsSheet, userId, targetRows\[0\]\.rowIndex\)/);
    const reconcile = extract(auth, "reconcileRoleRevocationUnderLock_");
    assert.match(reconcile, /revokeAllUserSessionsUnderLock_\(sessionsSheet,userId,[\s\S]*?tokens=>revokeSharedUserSessionContexts_\(userId,tokens\)/);
    assert.match(auth, /"updateUser"/);
});
check("El cierre de cuenta exige permisos, impide autoeliminación y protege al último Desarrollador", () => {
    const deletion = extract(auth, "handleDeleteUser");
    assert.match(deletion, /requireSharedAuthActor_\(payload, \["desarrollador", "jefe", "supervisor"\]/);
    assert.match(deletion, /requesterUserId === userId/);
    assert.match(deletion, /countActiveDevelopers_\(usersData\.slice\(1\)\) <= 1/);
    assert.match(deletion, /alreadyDeleted && requesterRole !== 'desarrollador'/);
});
check("La cuenta se desactiva solo después de invalidar sesiones y login pendientes", () => {
    const deletion = extract(auth, "handleDeleteUser");
    const pending = deletion.indexOf("revokePendingLoginRequestsForUserUnderLock_");
    const remote = deletion.indexOf("revokeSharedUserSessionContexts_");
    const tombstone = deletion.indexOf("const tombstone = '__deleted__:'");
    const sessionRows = deletion.indexOf("sessionsSheet.deleteRow");
    assert.ok(pending >= 0 && remote > pending && tombstone > remote && sessionRows > tombstone);
    assert.match(deletion, /hasRemainingSessions/);
    assert.match(deletion, /remainingIds = remainingLastRow >= 2/);
    assert.match(deletion, /status: 'error'/);
    assert.match(deletion, /disabled: true/);
});
check("AUTH conserva RBAC y revocación local sin cliente SharedMutation", () => {
    const actionSet = extract(auth, "isSharedMutationAction_");
    const update = extract(auth, "handleUpdateUser");
    const reset = extract(auth, "handleResetUserSessions");
    const logout = extract(auth, "handleLogout");
    assert.match(actionSet, /return \["deleteUser"\]/);
    assert.doesNotMatch(actionSet, /updateUser|resetUserSessions|logout|changePassword|resetUserPassword/);
    assert.match(update, /reconcileRoleRevocationUnderLock_\(usersSheet, sessionsSheet, userId, targetRows\[0\]\.rowIndex\)/);
    assert.match(reset, /revokeSharedUserSessionContexts_\(targetUserId/);
    assert.match(logout, /revokeSharedSessionContext_\(requestedUserId, sessionToken\)/);
    assert.doesNotMatch(auth, /createSharedMutationClient_|withSharedMutationLease_|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/);
});
check("La invalidación de cachés se coordina desde el navegador hacia cada servicio", () => {
    assert.match(sessionInvalidation, /SESSION_CACHE_SERVICES = Object\.freeze\(/);
    assert.match(sessionInvalidation, /"AUTH", "WRITE", "CATALOG", "FEEDBACK", "ADMIN", "UTILITIES"/);
    assert.match(sessionInvalidation, /retry\("__invalidateSessionActorCache", payload/);
    assert.doesNotMatch(sessionInvalidation, /COORDINATOR|UrlFetchApp|GPSpedia_COORDINATOR_SECRET|sessionToken/);
    assert.match(sessionActor, /function invalidateLocalSharedSessionActorCaches_/);
    assert.match(sessionActor, /cache\.remove\(keyFor\(id, token\)\)/);
    assert.doesNotMatch(sessionActor, /createSharedMutationClient_|UrlFetchApp|GPSpedia_COORDINATOR_URL|GPSpedia_COORDINATOR_SECRET/);
    assert.doesNotMatch(coordinator, /function invalidateSessionActorCaches_|function primeSessionActorCaches_/);
});
check("La telemetría transitoria de Coordinator sigue restringida a Desarrollador", () => {
    const traffic = extract(coordinator, "getServiceTrafficFromBrowser_");
    assert.match(traffic, /authorizeSession_\(userId, sessionToken, now\(\)\)/);
    assert.match(traffic, /role !== "desarrollador"/);
    assert.match(auth, /function handleCreateUser/);
});
console.log("CoordinatorCapabilityPreservation: " + passed + "/" + passed + " PASS");
