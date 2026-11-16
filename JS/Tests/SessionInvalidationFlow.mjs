import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const api = read("JS/Frontend/api-config.js");
const auth = read("JS/Frontend/auth.js");
const ui = read("JS/Frontend/ui.js");
const css = read("style.css");
const index = read("index.html");

assert.match(api, /confirmedRevocation/);
assert.match(api, /window\.dispatchEvent\(new CustomEvent\("gpsepedia:session-invalid"/);
assert.match(api, /code: "SESSION_INVALID"/);
assert.match(auth, /window\.addEventListener\('gpsepedia:session-invalid'/);
assert.match(auth, /String\(currentSession\.SessionToken \|\| ''\) !== rejectedToken/);

const start = auth.indexOf("function endSessionForReauthentication_");
const end = auth.indexOf("\nif (typeof window", start);
assert.ok(start >= 0 && end > start);
const helperAndHandler = auth.slice(start, end);
const stored = { ID: "U1", SessionToken: "old-token", Privilegios: "Desarrollador" };
let session = stored;
const state = { currentUser: stored };
const calls = { stopped: 0, cancelled: 0, removed: 0, notices: [] };
const storage = { removeItem(key) { assert.equal(key, "gpsepedia_session"); session = null; calls.removed++; } };
const same = (a, b) => Boolean(a && b && a.ID === b.ID && a.SessionToken === b.SessionToken);
const factory = new Function(
    "SESSION_KEY", "localStorage", "readStoredSession", "getState", "sameSession",
    "stopCatalogPolling_", "cancelCatalogLoad_", "setState", "showLoginScreen",
    "logoutGeneration_", helperAndHandler + "\nreturn handleConfirmedSessionInvalidation_;"
);
const handle = factory(
    "gpsepedia_session", storage, () => session, () => state, same,
    () => calls.stopped++, () => calls.cancelled++,
    next => Object.assign(state, next),
    message => calls.notices.push(message), 0
);
assert.equal(handle({ detail: { sessionToken: "other-token" } }), false);
assert.equal(session.SessionToken, "old-token");
assert.equal(handle({ detail: { sessionToken: "old-token" } }), true);
assert.equal(session, null);
assert.equal(state.currentUser, null);
assert.equal(calls.removed, 1);
assert.equal(calls.stopped, 1);
assert.equal(calls.cancelled, 1);
assert.deepEqual(calls.notices, ["Sesión terminada"]);
assert.equal(handle({ detail: { sessionToken: "old-token" } }), false);

assert.match(ui, /loginError\.classList\.toggle\('login-session-ended', sessionEnded\)/);
assert.match(ui, /loginError\.setAttribute\('aria-live', sessionEnded \? 'polite' : 'assertive'\)/);
assert.match(index, /id="login-error" role="alert"/);
assert.match(css, /#login-modal #login-error\.login-session-ended[\s\S]*?background: #fff7d6/);
assert.match(css, /body\.dark-mode #login-modal #login-error\.login-session-ended/);
assert.match(ui, /deactivateLegalModalFocus_\(termsModal, false\)/);
assert.match(ui, /termsModal\.style\.display = 'none'/);
console.log("SessionInvalidationFlow: 15/15 PASS");
