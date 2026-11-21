import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const auth = read("JS/Services/Auth.js");
const feedback = read("JS/Services/feedback.js");
const admin = read("JS/Services/admin.js");
const coordinator = read("JS/Services/Coordinator.js");
const api = read("JS/Frontend/api-config.js");
const ui = read("JS/Frontend/ui.js");

const limits = auth.match(/const SESSION_LIMITS = \{[\s\S]*?\};/);
assert.ok(limits, "Debe existir una política central de sesiones.");
assert.match(limits[0], /'desarrollador': Infinity/);
assert.match(auth, /getOldestSessionsToRevoke_\(activeRows, token, sessionLimit\)/);

for (const action of ["getInboxRecipients", "getInboxConversations", "getInboxMessages"]) {
    assert.match(feedback, new RegExp(action + ": null"));
}
assert.match(feedback, /getActivityLogs: \["Desarrollador", "Jefe", "Supervisor"\]/);
assert.match(feedback, /getRichTextMode: null/);
assert.match(api, /'getActivityLogs': 'FEEDBACK'/);
assert.match(api, /'getRichTextMode': 'FEEDBACK'/);
assert.match(api, /'getServiceTraffic': 'ADMIN'/);
assert.match(admin, /function assertDeveloperSession\(payload\)/);
assert.match(admin, /function handleGetServiceTraffic_\(/);
assert.match(coordinator, /getRichTextMode: \{ read: feedbackRead \}/);
assert.match(coordinator, /getServiceTraffic: \{ read: \["SERVICE_TRAFFIC"\] \}/);

assert.match(ui, /function getUiSessionContext_\(user = getState\(\)\.currentUser\)/);
assert.match(ui, /role: normalizeUiRole_\(user\.Privilegios\)/);
assert.match(ui, /function ensureUiSessionRole_\(allowedRoles\)/);
assert.match(ui, /routeActionWithRetry\("getServiceTraffic", getSessionPayload_\(\)/);
const guardStart = ui.indexOf("function ensureUiSessionRole_");
const guardEnd = ui.indexOf("function getSessionPayload_", guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart);
assert.doesNotMatch(ui.slice(guardStart, guardEnd), /validateActiveSession|routeAction\(/);
console.log("DeveloperPrivilegeRouting: 20/20 PASS");
