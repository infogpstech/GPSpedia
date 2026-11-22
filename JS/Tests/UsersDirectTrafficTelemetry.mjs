import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const users = readFileSync(resolve(root, "JS/Services/users.js"), "utf8");
const start = users.indexOf("function doPost(e)");
const end = users.indexOf("\nfunction doPostInternal_", start);
const router = users.slice(start, end);
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("USERS no conserva contador ni endpoint directo de telemetría", () => {
    assert.doesNotMatch(users, /USERS_DIRECT_TRAFFIC_PREFIX_|recordUsersDirectTraffic_|readUsersDirectTraffic_|USERS_TRAFFIC_SECRET_PROPERTY_/);
    assert.doesNotMatch(router, /getServiceTraffic|recordUsersDirectTraffic_/);
});

test("getUsers conserva la validación de actor local sin contador PropertiesService", () => {
    assert.match(router, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "USERS" \}\)/);
    assert.match(router, /if \(!isSharedMutationAction_\(action\)\)/);
    assert.match(router, /\["getUsers", "updateProfile"\]/);
});

console.log("UsersDirectTrafficTelemetry: " + passed + "/2 PASS");
