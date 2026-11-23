import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const apiConfig = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");

function createRuntime() {
    const calls = [];
    const trustedActor = {
        userId: "USR-42", role: "Tecnico", epoch: 8, fullName: "Nombre verificado"
    };
    const actorLookups = [];
    const getCachedActor = (userId, sessionToken) => {
        actorLookups.push({ userId, sessionToken });
        if (sessionToken !== "valid-session" || userId !== "USR-42") throw new Error("Sesión inválida.");
        return trustedActor;
    };
    let trafficWrites = 0;
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
    const properties = { getProperty: () => null, getProperties: () => ({}), setProperty: () => { trafficWrites++; }, deleteProperty: () => {} };
    const lock = { tryLock: () => true, releaseLock() {} };
    const api = new Function("getCachedSharedSessionActor_", "withSharedSessionActor_", "LockService", "PropertiesService", "ContentService", `
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
    `)(getCachedActor, withActor, {getScriptLock:()=>lock}, {getScriptProperties:()=>properties}, contentService);
    return { ...api, calls: actorLookups, get trafficWrites() { return trafficWrites; } };
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
assert.deepEqual(authenticated.calls.map(call => [call.userId, call.sessionToken]), [["USR-42", "valid-session"]]);
assert.equal(authenticated.trafficWrites,0,"La ruta autenticada no debe persistir contadores de telemetría.");
assert.doesNotMatch(feedback.slice(feedback.indexOf("function doPost(e)"),feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_")),/withSharedMutationLease_/);
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
assert.equal(anonymous.trafficWrites,0,"La ruta anónima no debe persistir contadores de telemetría.");
assert.equal(anonymous.captured.length, 1);
assert.equal(anonymous.captured[0].userId, "0");
assert.equal(anonymous.captured[0].userName, "Anónimo");
assert.equal(anonymous.captured[0].userRole, "Anónimo");
assert.equal(anonymous.captured[0].suggestionActorKey, "anon:unverified");

assert.match(apiConfig, /['"]suggestYear['"]\s*:\s*['"]FEEDBACK['"]/);
assert.match(feedback,/getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "FEEDBACK" \}\)/);
assert.doesNotMatch(feedback.slice(feedback.indexOf("function doPost(e)"),feedback.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_")),/withSharedMutationLease_/);
console.log("SuggestYearCoordinatorSession: 2/2 PASS");
