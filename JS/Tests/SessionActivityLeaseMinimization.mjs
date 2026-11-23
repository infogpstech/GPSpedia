import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync("JS/Services/admin.js", "utf8");
const auth = readFileSync("JS/Services/Auth.js", "utf8");
const write = readFileSync("JS/Services/write.js", "utf8");
const feedback = readFileSync("JS/Services/feedback.js", "utf8");
const coordinator = readFileSync("JS/Services/Coordinator.js", "utf8");
const ui = readFileSync("JS/Frontend/ui.js", "utf8");
const apiConfig = readFileSync("JS/Frontend/api-config.js", "utf8");

function functionBlock(source, name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction " + nextName + "(", start + 10);
    assert.ok(end > start, "No se encontró el límite de " + name);
    return source.slice(start, end);
}

const adminDoPost = functionBlock(admin, "doPost", "doPostInternal_");
const authDoPost = functionBlock(auth, "doPost", "doPostInternal_");
const writeDoPost = functionBlock(write, "doPost", "doPostInternal_");
const feedbackDoPost = functionBlock(feedback, "doPost", "doPostInternal_");
const authMutationPolicy = functionBlock(auth, "isSharedMutationAction_", "syncAuthSheetActivityFromActor_");
let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("WRITE y FEEDBACK no adquieren leases para mutaciones ordinarias", () => {
    assert.match(writeDoPost, /getCachedSharedSessionActor_/);
    assert.doesNotMatch(writeDoPost, /withSharedMutationLease_\s*\(/);
    assert.match(feedbackDoPost, /getCachedSharedSessionActor_/);
    assert.doesNotMatch(feedbackDoPost, /withSharedMutationLease_\s*\(/);
});

test("AUTH gestiona usuarios con actor cacheado y lock local; no existe lease USERS", () => {
    const cachedActions = authDoPost.indexOf('if (["acceptTerms"');
    assert.ok(cachedActions >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", cachedActions) > cachedActions);
    assert.match(auth, /function handleGetUsers\(/);
    assert.match(auth, /function handleCreateUser\(/);
    assert.match(auth, /function handleUpdateProfile\(/);
    assert.match(auth, /function withUsersMutationLock_\(/);
    assert.match(auth, /withUsersMutationLock_\(/);
    assert.doesNotMatch(authDoPost, /withSharedMutationLease_\("AUTH",\s*"(getUsers|createUser|updateProfile)"/);
    assert.doesNotMatch(coordinator, /USERS:\s*\{/);
    assert.match(apiConfig, /'getUsers': 'AUTH'/);
    assert.match(apiConfig, /'createUser': 'AUTH'/);
    assert.match(apiConfig, /'updateProfile': 'AUTH'/);
});

test("AUTH conserva solo lease de eliminación; login y acciones ordinarias usan lock/caché local", () => {
    const benchmark = authDoPost.indexOf('if (action === "benchmarkPasswordKdf")');
    const cachedActions = authDoPost.indexOf('if (["acceptTerms"');
    const lease = authDoPost.indexOf('withSharedMutationLease_("AUTH", action');
    assert.ok(benchmark >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", benchmark) > benchmark);
    assert.ok(cachedActions >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", cachedActions) > cachedActions);
    assert.ok(lease > cachedActions);
    assert.match(authMutationPolicy, /return \["deleteUser"\]/);
    assert.doesNotMatch(authMutationPolicy, /login|touchSession|acceptTerms|requestPasswordRecovery|completePasswordRecovery|changePassword|resetUserPassword|resetUserSessions|updateUser|logout|migrateLegacyPasswords/);
    assert.match(auth, /function beginLoginAttempt\(/);
    assert.match(auth, /registerFailedLoginAttempt\(/);
    assert.match(auth, /syncSharedSessionContextsForUser_\(/);
    assert.match(auth, /function handleLogout[\s\S]*?revokeSharedSessionContext_/);
    assert.match(auth, /function handleCompletePasswordRecovery[\s\S]*?revokeSharedUserSessionContexts_/);
    assert.match(auth, /function handleChangePassword[\s\S]*?revokeSharedUserSessionContexts_/);
    assert.match(auth, /function handleResetUserSessions[\s\S]*?revokeSharedUserSessionContexts_/);
});
test("ADMIN usa actor cacheado para todas las acciones y no adquiere leases", () => {
    assert.match(adminDoPost, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.match(adminDoPost, /if \(action === "getServiceTraffic"\)[\s\S]*?getCachedSharedSessionActor_/);
    assert.match(adminDoPost, /const actor = getCachedSharedSessionActor_/);
    assert.match(adminDoPost, /doPostInternal_\(withSharedSessionActor_\(e, actor\)\)/);
    assert.doesNotMatch(adminDoPost, /withSharedMutationLease_|sessionActivity|nestedToken|__sharedMutationToken|isSharedMutationAction_/);
});
test("MIG-010 coordina ADMIN/WRITE desde frontend y cada receptor valida su sesión", () => {
    assert.doesNotMatch(admin, /callWriteServiceAction|requestNextVehicleIdFromWriteService|requestCortesIdFreezeFromWriteService/);
    assert.match(apiConfig, /'addOrUpdateCut': 'WRITE'/);
    assert.match(apiConfig, /'allocateVehicleId': 'WRITE'/);
    assert.match(apiConfig, /'freezeCortesIds': 'WRITE'/);
    assert.ok(ui.includes('step("backupDatabase"'));
    assert.ok(ui.includes('step("freezeCortesIds"'));
    assert.ok(ui.includes('step("reorganizeDatabase"'));
    assert.match(writeDoPost, /getCachedSharedSessionActor_/);
    assert.ok(write.includes("function assertDeveloperForIdMaintenance(payload)"));

});

console.log("SessionActivityLeaseMinimization: " + passed + "/" + passed + " PASS");
