import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../Services/Auth.js", import.meta.url), "utf8");
const fixture = readFileSync(new URL("./Auth.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
function block(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next < 0 ? source.length : next);
}
function count(source, pattern) { return [...source.matchAll(pattern)].length; }

const ledger = block(auth, "ensureLoginRequestsSheet_");
assert.match(ledger, /LOGIN_REQUESTS_BASELINE_MARKER_/);
assert.match(ledger, /PropertiesService\.getScriptProperties\(\)\.getProperties\(\)/);
assert.match(ledger, /LEGACY_LOGIN_REQUEST_PROPERTY_PREFIX/);
assert.doesNotMatch(ledger, /\.setProperty\(|\.deleteProperty\(/,
    "El baseline importa el estado legacy, pero no vuelve a escribir ni borrar propiedades.");
assert.match(ledger, /baseline_pending/);
assert.match(ledger, /baseline_v1/);
assert.match(ledger, /setValues\(imports\)/);
assert.match(ledger, /JSON\.stringify\(back\)!==JSON\.stringify\(imports\)/);

const loginSession = block(auth, "createOrRecoverLoginSessionUnderLock_");
assert.doesNotMatch(loginSession, /PropertiesService|ScriptProperties|LEGACY_LOGIN_REQUEST|cleanupExpiredLoginRequests_/,
    "El flujo normal de login debe operar exclusivamente sobre LoginRequests.");
assert.match(loginSession, /findLoginRequestEntry_\(loginRequestsSheet, requestId\)/);
assert.match(loginSession, /saveLoginRequestRecord_\(loginRequestsSheet/);
assert.equal(count(loginSession, /sessionsSheet\.getDataRange\(\)/g), 1,
    "El login usa un solo snapshot de ActiveSessions en el camino normal.");
assert.match(loginSession, /LOGIN_REQUEST_TTL_MS/);
const cleanup = block(auth, "cleanupExpiredLoginRequestsBounded_");
assert.match(cleanup, /start\+24/);
assert.doesNotMatch(cleanup, /getDataRange\(\)/, "La limpieza debe ser acotada y no escanear el ledger completo.");
assert.match(cleanup, /deleteRow\(rowIndex\)/);
assert.match(loginSession, /cleanupExpiredLoginRequestsBounded_\(loginRequestsSheet/);
assert.match(loginSession, /record\.status === 'pending'/);
assert.match(loginSession, /record\.status === 'committed'/);

for (const name of ["revokePendingLoginRequestsForUserUnderLock_", "revokeLoginRequestForTokenUnderLock_"]) {
    const source = block(auth, name);
    assert.doesNotMatch(source, /PropertiesService|ScriptProperties/);
    assert.match(source, /ensureLoginRequestsSheet_/);
    assert.match(source, /saveLoginRequestRecord_/);
}

const lockHelper = block(auth, "acquireAuthScriptLock_");
assert.match(lockHelper, /lock\.tryLock\(0\)/);
assert.doesNotMatch(auth, /\.waitLock\(/,
    "Ninguna función AUTH debe esperar por el ScriptLock global; las contenciones son fail-fast.");
assert.ok(count(auth, /acquireAuthScriptLock_\(/g) >= 15);
assert.match(block(auth, "handleLogin"), /acquireAuthScriptLock_\(sessionLock/);
assert.match(block(auth, "beginLoginAttempt"), /acquireAuthScriptLock_\(lock/);
assert.match(block(auth, "resetLoginAttempts"), /acquireAuthScriptLock_\(lock/);
assert.match(block(auth, "registerFailedLoginAttempt"), /acquireAuthScriptLock_\(lock/);
assert.match(block(auth, "rollbackLoginAttempt"), /acquireAuthScriptLock_\(lock/);

const normalized = value => value.replace(/const SPREADSHEET_ID = "[^"]+";/, 'const SPREADSHEET_ID = "__DB_ID__";');
assert.equal(normalized(auth), normalized(fixture), "El fixture aislado de AUTH debe conservar paridad exacta.");
assert.match(api, /sessionStorage\.getItem\(key\)/);
assert.match(api, /sessionStorage\.setItem\(key, requestId\)/,
    "Los reintentos del cliente deben conservar el mismo requestId.");
assert.match(api, /crypto\.getRandomValues\(bytes\)/);

const rowFns = block(auth, "loginRequestRecordToRow_") + "\n" + block(auth, "loginRequestRecordFromRow_");
const factory = new Function("normalizeUserId", "LOGIN_REQUEST_HEADERS_", "LOGIN_REQUEST_STATUS_", rowFns +
    "\nreturn {loginRequestRecordToRow_, loginRequestRecordFromRow_};");
const { loginRequestRecordToRow_, loginRequestRecordFromRow_ } = factory(
    value => String(value || "").trim(),
    ["requestId","userId","token","createdAt","createdAtMs","status","pointerSet","committedAt","revokedAt","updatedAt"],
    ["pending","committed","revoked"]
);
const original = {requestId:"0123456789abcdef0123456789abcdef",userId:"USR-0001",token:"session-token",
    createdAt:"2026-11-24T00:00:00.000Z",createdAtMs:1795478400000,status:"pending",
    pointerSet:false,committedAt:"",revokedAt:"",updatedAt:"2026-11-24T00:00:00.000Z"};
const row = loginRequestRecordToRow_(original);
assert.equal(row.length, 10);
assert.deepEqual(loginRequestRecordFromRow_(row), original);
assert.throws(() => loginRequestRecordFromRow_(row.slice(0, 9)), /incompleto/);
assert.throws(() => loginRequestRecordFromRow_([...row.slice(0,5), "unknown", ...row.slice(6)]), /inválidos/);
assert.throws(() => loginRequestRecordFromRow_([...row.slice(0,2), "", ...row.slice(3)]), /inválidos/);

const fakeLock = { tryLock: () => false, waitLock: () => { throw new Error("No debe esperar"); } };
const acquireFactory = new Function("lock", "operationLabel", block(auth, "acquireAuthScriptLock_") +
    "\nreturn acquireAuthScriptLock_(lock, operationLabel);");
assert.throws(() => acquireFactory(fakeLock, "prueba"), /no esperó/);
let released = false;
const acquired = acquireFactory({tryLock:()=>{released=true;return true;}}, "prueba");
assert.equal(acquired, true);
assert.equal(released, true);

console.log("LoginRequestLedger: PASS");
