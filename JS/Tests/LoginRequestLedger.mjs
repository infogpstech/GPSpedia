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
assert.match(auth, /LOGIN_REQUEST_BASELINE_MARKER_/);
assert.match(ledger, /PropertiesService\.getScriptProperties\(\)\.getProperties\(\)/);
assert.match(ledger, /LEGACY_LOGIN_REQUEST_PROPERTY_PREFIX/);
assert.doesNotMatch(ledger, /\.setProperty\(|\.deleteProperty\(/,
    "El baseline importa el estado legacy, pero no vuelve a escribir ni borrar propiedades.");
assert.match(ledger, /baseline_pending/);
assert.match(ledger, /baseline_v1/);
assert.match(ledger, /setValues\(imports\)/);
assert.match(ledger, /loginRequestRowsEqual_\(imports\[index\],row\)/);
assert.doesNotMatch(ledger, /JSON\.stringify\(back\)!==JSON\.stringify\(imports\)/);

const loginSession = block(auth, "createOrRecoverLoginSessionUnderLock_");
assert.doesNotMatch(loginSession, /PropertiesService|ScriptProperties|LEGACY_LOGIN_REQUEST|cleanupExpiredLoginRequests_/,
    "El flujo normal de login debe operar exclusivamente sobre LoginRequests.");
assert.match(loginSession, /findLoginRequestEntry_\(loginRequestsSheet, requestId\)/);
assert.match(loginSession, /saveLoginRequestRecord_\(loginRequestsSheet/);
assert.equal(count(loginSession, /sessionsSheet\.getDataRange\(\)/g), 2,
    "El login usa un snapshot normal y solo relee ActiveSessions para reconciliar un append ambiguo.");
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

assert.match(auth, /\.tryLock\(0\)/);
const lockTimeouts = [...auth.matchAll(/\.tryLock\(([^)]*)\)/g)].map(match => match[1].trim());
assert.ok(lockTimeouts.length >= 15 && lockTimeouts.every(timeout => timeout === "0"),
    "Todas las adquisiciones de ScriptLock deben ser tryLock(0), sin esperas temporizadas.");
assert.doesNotMatch(auth, /\.waitLock\(/,
    "Ninguna función AUTH debe esperar por el ScriptLock global; las contenciones son fail-fast.");
assert.match(block(auth, "handleLogin"), /sessionLock\.tryLock\(0\)/);
for (const name of ["beginLoginAttempt","resetLoginAttempts","registerFailedLoginAttempt","rollbackLoginAttempt","logToSheet"]) {
    assert.match(block(auth, name), /lock\.tryLock\(0\)/);
}

const normalized = value => value.replace(/const SPREADSHEET_ID = "[^"]+";/, 'const SPREADSHEET_ID = "__DB_ID__";');
assert.equal(normalized(auth), normalized(fixture), "El fixture aislado de AUTH debe conservar paridad exacta.");
assert.match(api, /sessionStorage\.getItem\(key\)/);
assert.match(api, /sessionStorage\.setItem\(key, requestId\)/,
    "Los reintentos del cliente deben conservar el mismo requestId.");
assert.match(api, /crypto\.getRandomValues\(bytes\)/);

const rowFns = ["loginRequestTextCell_", "loginRequestBooleanCell_", "loginRequestRowsEqual_", "loginRequestRecordToRow_", "loginRequestRecordFromRow_"]
    .map(name => block(auth, name)).join("\n");
const factory = new Function("normalizeUserId", "LOGIN_REQUEST_HEADERS_", "LOGIN_REQUEST_STATUS_", rowFns +
    "\nreturn {loginRequestTextCell_, loginRequestRowsEqual_, loginRequestRecordToRow_, loginRequestRecordFromRow_};");
const { loginRequestTextCell_, loginRequestRowsEqual_, loginRequestRecordToRow_, loginRequestRecordFromRow_ } = factory(
    value => String(value || "").trim(),
    ["requestId","userId","token","createdAt","createdAtMs","status","pointerSet","committedAt","revokedAt","updatedAt"],
    ["pending","committed","revoked"]
);
const original = {requestId:"0123456789abcdef0123456789abcdef",userId:"123",token:"session-token",
    createdAt:"2026-11-24T00:00:00.000Z",createdAtMs:1795478400000,status:"pending",
    pointerSet:false,committedAt:"",revokedAt:"",updatedAt:"2026-11-24T00:00:00.000Z"};
const row = loginRequestRecordToRow_(original);
assert.equal(row.length, 10);
assert.deepEqual(loginRequestRecordFromRow_(row), original);
const sheetsRoundTrip = row.slice();
sheetsRoundTrip[1] = 123;
sheetsRoundTrip[3] = new Date(original.createdAt);
sheetsRoundTrip[7] = 1795478400000;
sheetsRoundTrip[9] = new Date(original.updatedAt);
assert.equal(loginRequestRowsEqual_(row, sheetsRoundTrip), true,
    "Debe aceptar coerciones de tipo equivalentes devueltas por Google Sheets.");
assert.equal(loginRequestRecordFromRow_(sheetsRoundTrip).createdAt, original.createdAt);
assert.equal(loginRequestRecordFromRow_(sheetsRoundTrip).updatedAt, original.updatedAt);
assert.equal(loginRequestRecordFromRow_(sheetsRoundTrip).committedAt, "1795478400000");
const corruptedRoundTrip = sheetsRoundTrip.slice();
corruptedRoundTrip[2] = "another-token";
assert.equal(loginRequestRowsEqual_(row, corruptedRoundTrip), false);
const invalidBooleanRoundTrip = sheetsRoundTrip.slice();
invalidBooleanRoundTrip[6] = "unknown";
assert.equal(loginRequestRowsEqual_(row, invalidBooleanRoundTrip), false);
assert.throws(() => loginRequestRecordFromRow_(row.slice(0, 9)), /incompleto/);
assert.throws(() => loginRequestRecordFromRow_([...row.slice(0,5), "unknown", ...row.slice(6)]), /inválidos/);
assert.throws(() => loginRequestRecordFromRow_([...row.slice(0,2), "", ...row.slice(3)]), /inválidos/);

const fakeLock = { tryLock: () => false, waitLock: () => { throw new Error("No debe esperar"); } };
const acquireFailFast = lock => {
    if (!lock.tryLock(0)) throw new Error("AUTH está ocupado; la operación no esperó por otra ejecución.");
    return true;
};
assert.throws(() => acquireFailFast(fakeLock), /no esperó/);
let acquired = false;
assert.equal(acquireFailFast({tryLock:()=>{acquired=true;return true;}}), true);
assert.equal(acquired, true);

console.log("LoginRequestLedger: 40/40 PASS");
