import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync("JS/Services/admin.js", "utf8");
const auth = readFileSync("JS/Services/Auth.js", "utf8");
const users = readFileSync("JS/Services/users.js", "utf8");
const write = readFileSync("JS/Services/write.js", "utf8");
const feedback = readFileSync("JS/Services/feedback.js", "utf8");
const coordinator = readFileSync("JS/Services/Coordinator.js", "utf8");

function functionBlock(source, name, nextName) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction " + nextName + "(", start + 10);
    assert.ok(end > start, "No se encontró el límite de " + name);
    return source.slice(start, end);
}

const adminDoPost = functionBlock(admin, "doPost", "doPostInternal_");
const usersDoPost = functionBlock(users, "doPost", "doPostInternal_");
const authDoPost = functionBlock(auth, "doPost", "doPostInternal_");
const writeDoPost = functionBlock(write, "doPost", "doPostInternal_");
const feedbackDoPost = functionBlock(feedback, "doPost", "doPostInternal_");
const authMutationPolicy = functionBlock(auth, "isSharedMutationAction_", "syncAuthSheetActivityFromActor_");
const usersMutationPolicy = functionBlock(users, "isSharedMutationAction_", "doPost");
const usersCoordinatorPolicy = coordinator.slice(
    coordinator.indexOf("USERS:"),
    coordinator.indexOf("UTILITIES:", coordinator.indexOf("USERS:"))
);

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

test("USERS getUsers/updateProfile reutilizan actor cacheado; solo createUser conserva lease", () => {
    const branch = usersDoPost.indexOf('if (!["getUsers", "updateProfile"].includes(action))');
    const lease = usersDoPost.indexOf('withSharedMutationLease_("USERS", "sessionActivity"');
    assert.ok(branch >= 0 && usersDoPost.indexOf("getCachedSharedSessionActor_", branch) > branch);
    assert.equal(lease, -1);
    assert.doesNotMatch(usersCoordinatorPolicy, /sessionActivity/);
    assert.match(usersMutationPolicy, /createUser/);
    assert.doesNotMatch(usersMutationPolicy, /updateProfile/);
    assert.match(usersDoPost, /withSharedMutationLease_\("USERS", action/);
    assert.doesNotMatch(usersDoPost, /withSharedMutationLease_\("USERS",\s*["']updateProfile/);
});

test("AUTH reutiliza actor cacheado para acceptTerms y elimina leases de touchSession/acceptTerms", () => {
    const benchmark = authDoPost.indexOf('if (action === "benchmarkPasswordKdf")');
    const terms = authDoPost.indexOf('if (action === "acceptTerms")');
    const lease = authDoPost.indexOf('withSharedMutationLease_("AUTH", action');
    assert.ok(benchmark >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", benchmark) > benchmark);
    assert.ok(terms >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", terms) > terms);
    assert.ok(lease > benchmark);
    assert.doesNotMatch(authDoPost, /withSharedMutationLease_\("AUTH",\s*"acceptTerms"/);
    assert.doesNotMatch(authDoPost, /isSharedReadAction_/);
    assert.doesNotMatch(authMutationPolicy, /touchSession|acceptTerms/);
    assert.match(authMutationPolicy, /login.*deleteUser.*updateUser.*logout/);
    assert.match(auth, /cacheSharedSessionActor_\(normalizedId, currentSessionToken/);
});

test("ADMIN usa actor cacheado para todas las acciones y no adquiere leases", () => {
    assert.match(adminDoPost, /if \(action === "ping"\) return doPostInternal_\(withSharedSessionActor_\(e, null\)\)/);
    assert.match(adminDoPost, /if \(action === "getServiceTraffic"\)[\s\S]*?getCachedSharedSessionActor_/);
    assert.match(adminDoPost, /const actor = getCachedSharedSessionActor_/);
    assert.match(adminDoPost, /doPostInternal_\(withSharedSessionActor_\(e, actor\)\)/);
    assert.doesNotMatch(adminDoPost, /withSharedMutationLease_|sessionActivity|nestedToken|__sharedMutationToken|isSharedMutationAction_/);
});
test("ADMIN→WRITE conserva autenticación de actor sin token compartido", () => {
    assert.match(admin, /function callWriteServiceAction\(action, payload\)/);
    assert.doesNotMatch(admin, /callWriteServiceAction\([\s\S]{0,500}__sharedMutationToken/);
    assert.match(writeDoPost, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "WRITE" \}\)/);
    assert.match(admin, /requestNextVehicleIdFromWriteService\(payload,/);
    assert.match(admin, /requestCortesIdFreezeFromWriteService\(payload, backupInfo\.backupId\)/);
});

console.log("SessionActivityLeaseMinimization: " + passed + "/" + passed + " PASS");
