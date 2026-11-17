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
const writeDoPost = functionBlock(write, "doPost", "doGet");
const feedbackDoPost = functionBlock(feedback, "doPost", "doGet");
const adminReadPolicy = functionBlock(admin, "isSharedReadAction_", "doPost");
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

test("USERS getUsers reutiliza actor cacheado y no registra actividad por lectura", () => {
    const branch = usersDoPost.indexOf('if (action !== "getUsers")');
    const lease = usersDoPost.indexOf('withSharedMutationLease_("USERS", "sessionActivity"');
    assert.ok(branch >= 0 && usersDoPost.indexOf("getCachedSharedSessionActor_", branch) > branch);
    assert.equal(lease, -1);
    assert.doesNotMatch(usersCoordinatorPolicy, /sessionActivity/);
    assert.match(usersMutationPolicy, /createUser.*updateProfile/);
    assert.match(usersDoPost, /withSharedMutationLease_\("USERS", action/);
});

test("AUTH benchmark usa actor cacheado; las mutaciones de sesión conservan coordinación", () => {
    const benchmark = authDoPost.indexOf('if (action === "benchmarkPasswordKdf")');
    const lease = authDoPost.indexOf('withSharedMutationLease_("AUTH", action');
    assert.ok(benchmark >= 0 && authDoPost.indexOf("getCachedSharedSessionActor_", benchmark) > benchmark);
    assert.ok(lease > benchmark);
    assert.doesNotMatch(authDoPost, /isSharedReadAction_/);
    assert.match(authMutationPolicy, /login.*touchSession.*deleteUser.*updateUser.*logout/);
});

test("ADMIN telemetría no adquiere una lease redundante; lecturas de recursos sí la conservan", () => {
    const traffic = adminDoPost.indexOf('if (action === "getServiceTraffic")');
    const lease = adminDoPost.indexOf('withSharedMutationLease_("ADMIN", operation');
    assert.ok(traffic >= 0 && adminDoPost.indexOf("getCachedSharedSessionActor_", traffic) > traffic);
    assert.ok(lease > traffic);
    assert.equal(adminReadPolicy.includes('"getServiceTraffic"'), false);
    assert.match(adminReadPolicy, /getReplacedImages.*getDriveStorage/);
});

console.log("SessionActivityLeaseMinimization: " + passed + "/" + passed + " PASS");
