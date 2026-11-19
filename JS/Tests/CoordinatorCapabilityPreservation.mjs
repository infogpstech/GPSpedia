import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = path => readFileSync(resolve(root, path), "utf8");
const auth = read("JS/Services/Auth.js");
const coordinator = read("JS/Services/Coordinator.js");
const client = read("JS/Services/SharedMutationClient.js");
const users = read("JS/Services/users.js");
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
    assert.match(update, /revokeSharedUserSessionContexts_\(userId/);
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
    assert.match(deletion, /remainingSessions\.length/);
    assert.match(deletion, /status: 'error'/);
    assert.match(deletion, /disabled: true/);
});
check("Delete, update y revocaciones están cubiertos por leases AUTH sobre recursos de identidad", () => {
    const actionSet = extract(auth, "isSharedMutationAction_");
    const policy = extract(coordinator, "coordinatorPolicy_");
    assert.match(actionSet, /"deleteUser"/);
    assert.match(actionSet, /"updateUser"/);
    assert.match(actionSet, /"resetUserSessions"/);
    assert.match(policy, /deleteUser: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
    assert.match(policy, /updateUser: \{ write: \[\.\.\.identityWrite, "SESSION_CONTEXTS"\] \}/);
    assert.match(policy, /resetUserSessions: \{ write: \["ACTIVE_SESSIONS", "LOGS", "SESSION_CONTEXTS"\] \}/);
});
check("La invalidación remota exige confirmación de WRITE y FEEDBACK antes de revocar", () => {
    const invalidate = extract(client, "invalidateSessionActorCaches");
    const revokeOne = extract(client, "revokeSession");
    const revokeAll = extract(client, "revokeUserSessions");
    assert.match(invalidate, /send_\("invalidateSessionActorCaches", "AUTH"/);
    assert.match(invalidate, /!\["WRITE", "FEEDBACK"\]\.every/);
    assert.ok(revokeOne.indexOf("invalidateSessionActorCaches") < revokeOne.indexOf('send_("revokeSession"'));
    assert.ok(revokeAll.indexOf("invalidateSessionActorCaches") < revokeAll.indexOf('send_("revokeUserSessions"'));
    const remote = extract(coordinator, "invalidateSessionActorCaches_");
    assert.match(remote, /service !== "AUTH"/);
    assert.match(remote, /\["WRITE", "FEEDBACK"\]/);
    assert.match(remote, /fetchAll\(requests\)/);
});
check("El coordinador no sustituye los controles de permisos ni las operaciones remotas del panel ADMIN", () => {
    assert.match(admin, /function handleGetServiceTraffic_/);
    assert.match(admin, /requireSharedAuthActor_/);
    assert.match(admin, /function handleDeleteUser|deleteUser/);
    assert.match(users, /function handleCreateUser|createUser/);
});
console.log("CoordinatorCapabilityPreservation: " + passed + "/" + passed + " PASS");
