import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const services = [
    { name: "AUTH", path: "JS/Services/Auth.js", actor: 'getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "AUTH" })' },
    { name: "WRITE", path: "JS/Services/write.js", actor: 'getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "WRITE" })' },
    { name: "FEEDBACK", path: "JS/Services/feedback.js", actor: 'getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "FEEDBACK" })' }
];
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

for (const service of services) {
    const source = readFileSync(resolve(root, service.path), "utf8");
    const start = source.indexOf("function doPost(e)");
    const end = source.indexOf("\nfunction ", start + 15);
    const router = source.slice(start, end > start ? end : source.length);
    test(service.name + " no escribe contadores directos ni expone endpoint de métricas", () => {
        assert.doesNotMatch(source, /DIRECT_SERVICE_TRAFFIC_CONFIG_|recordDirectServiceTraffic_|readDirectServiceTraffic_/);
        assert.doesNotMatch(router, /getServiceTraffic|recordDirectServiceTraffic_/);
    });
    test(service.name + " conserva el flujo funcional del router", () => {
        if (service.name === "AUTH") assert.match(router, /clearSensitiveLogs/);
        if (service.name === "WRITE") assert.match(router, /isSharedMutationAction_\(action\)/);
        if (service.name === "FEEDBACK") {
            assert.match(router, /FEEDBACK_PUBLIC_ACTIONS/);
            assert.match(router, /anonymousSuggestion/);
        }
    });
}
const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
const feedbackRouter = feedback.slice(feedback.indexOf("function doPost(e)"), feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_"));
assert.doesNotMatch(feedbackRouter, /recordDirectServiceTraffic_/);
assert.match(feedback, /const FEEDBACK_PUBLIC_ACTIONS = new Set/);
console.log("DirectServiceTrafficTelemetry: " + passed + "/6 PASS");
