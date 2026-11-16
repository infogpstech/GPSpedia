import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");
const apiConfig = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

function createRuntime() {
    const calls = [];
    const trustedActor = {
        userId: "USR-42", role: "Tecnico", epoch: 8, fullName: "Nombre verificado"
    };
    const withLease = (service, operation, callback, options) => {
        calls.push({ service, operation, options });
        return callback("coordinator-token", trustedActor);
    };
    const withActor = (event, actor) => {
        const request = JSON.parse(event.postData.contents);
        const payload = { ...(request.payload || {}) };
        delete payload.__sharedSessionActor;
        delete payload.__feedbackActor;
        if (actor) payload.__sharedSessionActor = actor;
        request.payload = payload;
        return { postData: { contents: JSON.stringify(request) } };
    };
    const contentService = {
        MimeType: { TEXT: "text/plain" },
        createTextOutput(content) {
            return { content, setMimeType() { return this; } };
        }
    };
    const api = new Function("withSharedMutationLease_", "withSharedSessionActor_", "ContentService", `
        const captured = [];
        ${feedback}
        function handleSuggestYear(payload) {
            captured.push(payload);
            return { status: "success" };
        }
        function getSpreadsheet() {
            throw new Error("Revalidación local inesperada de Users/ActiveSessions.");
        }
        return { doPost, captured, FEEDBACK_ACTION_PERMISSIONS };
    `)(withLease, withActor, contentService);
    return { ...api, calls };
}

function post(runtime, payload) {
    const output = runtime.doPost({
        postData: { contents: JSON.stringify({ action: "suggestYear", payload }) }
    });
    return JSON.parse(output.content);
}

const authenticated = createRuntime();
const authResult = post(authenticated, {
    userId: "USR-42", sessionToken: "valid-session",
    userName: "Nombre falsificado", userRole: "Desarrollador", vehicleId: "VEH-1", year: 2025
});
assert.equal(authResult.status, "success");
assert.deepEqual(authenticated.calls.map(call => [call.service, call.operation]), [["FEEDBACK", "suggestYear"]]);
assert.equal(authenticated.captured.length, 1);
assert.equal(authenticated.captured[0].userId, "USR-42");
assert.equal(authenticated.captured[0].userName, "Nombre verificado");
assert.equal(authenticated.captured[0].userRole, "Tecnico");
assert.equal(authenticated.captured[0].suggestionActorKey, "user:USR-42");
assert.equal(authenticated.FEEDBACK_ACTION_PERMISSIONS.suggestYear, null);

const anonymous = createRuntime();
const anonymousResult = post(anonymous, {
    userId: "0", userName: "Falso", userRole: "Desarrollador", vehicleId: "VEH-2", year: 2025
});
assert.equal(anonymousResult.status, "success");
assert.equal(anonymous.calls.length, 0, "La sugerencia anónima no debe exigir sesión ni lease.");
assert.equal(anonymous.captured.length, 1);
assert.equal(anonymous.captured[0].userId, "0");
assert.equal(anonymous.captured[0].userName, "Anónimo");
assert.equal(anonymous.captured[0].userRole, "Anónimo");
assert.equal(anonymous.captured[0].suggestionActorKey, "anon:unverified");

assert.match(apiConfig, /['"]suggestYear['"]\s*:\s*['"]FEEDBACK['"]/);
const feedbackPolicy = coordinator.match(/FEEDBACK:\s*\{([\s\S]*?)\n        \},/)?.[1] || "";
assert.match(feedbackPolicy, /sessionActivity:\s*\{\s*read:\s*feedbackRead\s*\}/);
console.log("SuggestYearCoordinatorSession: 2/2 PASS");
