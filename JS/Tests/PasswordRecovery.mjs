import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const authSource = readFileSync(resolve(root, "JS/Services/Auth.js"), "utf8");
const apiSource = readFileSync(resolve(root, "JS/Frontend/api-config.js"), "utf8");
const frontendAuthSource = readFileSync(resolve(root, "JS/Frontend/auth.js"), "utf8");
const mainSource = readFileSync(resolve(root, "JS/Frontend/main.js"), "utf8");
const htmlSource = readFileSync(resolve(root, "index.html"), "utf8");
const workerSource = readFileSync(resolve(root, "service-worker.js"), "utf8");

function extractFunction(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const nextFunction = source.indexOf("\nfunction ", start + 10);
    const nextConst = source.indexOf("\nconst ", start + 10);
    const ends = [nextFunction, nextConst].filter(value => value > start);
    return source.slice(start, ends.length ? Math.min(...ends) : source.length);
}
const constantTimeEquals = (left, right) => {
    left = String(left); right = String(right);
    if (left.length !== right.length) return false;
    let diff = 0;
    for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
    return diff === 0;
};
const managerFactory = new Function("constantTimeEquals",
    extractFunction(authSource, "createPasswordRecoveryManager_") + "\nreturn createPasswordRecoveryManager_;"
)(constantTimeEquals);

let now = 1_800_000_000_000;
let challengeCounter = 0;
let codeCounter = 0;
const cache = new Map();
const hash = value => createHash("sha256").update(String(value)).digest("hex");
function createManager(options = {}) {
    return managerFactory({
        get: key => cache.has(key) ? cache.get(key) : null,
        put: (key, value) => cache.set(key, value),
        remove: key => cache.delete(key),
        now: () => now,
        hash,
        createCode: () => options.code || (++codeCounter % 2 ? "A1B2C3D4E5F6A1B2C3D4E5F6" : "B1B2C3D4E5F6B1B2C3D4E5F6"),
        createId: () => "challenge-" + (++challengeCounter)
    });
}
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("El desafío almacena solo SHA-256 y nunca conserva el código en claro", () => {
    cache.clear();
    const manager = createManager({code:"A1B2C3D4E5F6A1B2C3D4E5F6"});
    assert.equal(manager.reserveRequest("alice", "alice@example.com", "U1"), true);
    const issued = manager.issue("U1", "alice@example.com");
    const stored = [...cache.values()].join("\n");
    assert.equal(issued.code, "A1B2C3D4E5F6A1B2C3D4E5F6");
    assert.ok(!stored.includes(issued.code));
    assert.ok(stored.includes(hash("code:" + issued.code)));
    assert.equal(issued.code.length, 24);
    assert.ok(stored.includes(hash("email:alice@example.com")));
});

test("La verificación exige simultáneamente la cuenta y el correo registrados", () => {
    cache.clear();
    const manager = createManager({code:"A1B2C3D4E5F6A1B2C3D4E5F6"});
    manager.reserveRequest("alice", "alice@example.com", "U1");
    const issued = manager.issue("U1", "alice@example.com");
    assert.equal(manager.verify("U1", "other@example.com", issued.code).valid, false);
    assert.equal(manager.verify("U2", "alice@example.com", issued.code).valid, false);
    assert.equal(manager.verify("U1", "alice@example.com", issued.code).valid, true);
});

test("El código expira y no puede verificarse después de diez minutos", () => {
    cache.clear();
    const manager = createManager({code:"A1B2C3D4E5F6A1B2C3D4E5F6"});
    manager.reserveRequest("alice", "alice@example.com", "U1");
    const issued = manager.issue("U1", "alice@example.com");
    now += 10 * 60 * 1000 + 1;
    assert.equal(manager.verify("U1", "alice@example.com", issued.code).valid, false);
});

test("Cinco códigos incorrectos bloquean el desafío", () => {
    cache.clear();
    const manager = createManager({code:"A1B2C3D4E5F6A1B2C3D4E5F6"});
    manager.reserveRequest("alice", "alice@example.com", "U1");
    const issued = manager.issue("U1", "alice@example.com");
    for (let i = 0; i < 4; i++) assert.equal(manager.verify("U1", "alice@example.com", "000000000000000000000000").locked, false);
    assert.equal(manager.verify("U1", "alice@example.com", "000000000000000000000000").locked, true);
    assert.equal(manager.verify("U1", "alice@example.com", issued.code).valid, false);
});

test("El desafío se consume una sola vez y una nueva solicitud invalida el código anterior", () => {
    cache.clear();
    const manager = createManager();
    manager.reserveRequest("alice", "alice@example.com", "U1");
    const first = manager.issue("U1", "alice@example.com");
    assert.equal(manager.verify("U1", "alice@example.com", first.code).valid, true);
    assert.equal(manager.consume("U1", first.challengeId), true);
    assert.equal(manager.verify("U1", "alice@example.com", first.code).valid, false);
    const second = manager.issue("U1", "alice@example.com");
    assert.notEqual(second.challengeId, first.challengeId);
    assert.equal(manager.verify("U1", "alice@example.com", first.code).valid, false);
});

test("El límite de tres solicitudes por hora se aplica a username, correo y cuenta", () => {
    cache.clear();
    const manager = createManager();
    for (let i = 0; i < 3; i++) assert.equal(manager.reserveRequest("alice", "alice@example.com", "U1"), true);
    assert.equal(manager.reserveRequest("alice", "alice@example.com", "U1"), false);
    assert.equal(manager.reserveRequest("other-user", "alice@example.com", "U2"), false);
    now += 60 * 60 * 1000 + 1;
    assert.equal(manager.reserveRequest("alice", "alice@example.com", "U1"), true);
});

function makeHandlerHarness(options = {}) {
    cache.clear();
    const users = [
        ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
        ["U1","alice","old-hash","tecnico","","alice@example.com","Alice","old-session",""]
    ];
    const sessions = [["ID_Usuario","Usuario","ActiveSessions","date","Logs","LastActivityAt","SessionTermsAcceptance"]];
    const sent = [], logs = [], revocations = [], lockEvents = [];
    const usersSheet = {
        getDataRange: () => ({ getValues: () => users.map(row => row.slice()) }),
        getRange(row, column, rowCount = 1, columnCount = 1) {
            return {
                getValues: () => Array.from({length:rowCount},(_,r)=>users[row-1+r].slice(column-1,column-1+columnCount)),
                getValue: () => users[row-1][column-1],
                setValue: value => { users[row-1][column-1] = value; },
                clearContent: () => { users[row-1][column-1] = ""; }
            };
        }
    };
    const sessionsSheet = { getDataRange: () => ({ getValues: () => sessions.map(row=>row.slice()) }) };
    const spreadsheet = { getSheetByName: name => name === "Users" ? usersSheet : name === "ActiveSessions" ? sessionsSheet : null };
    const manager = createManager({code:"A1B2C3D4E5F6A1B2C3D4E5F6"});
    const lock = { tryLock(){lockEvents.push("try");return true;}, releaseLock(){lockEvents.push("release");} };
    const properties = { deleteProperty(){} };
    const requestSource = extractFunction(authSource, "handleRequestPasswordRecovery");
    const completeSource = extractFunction(authSource, "handleCompletePasswordRecovery");
    const handlers = new Function(
        "SpreadsheetApp","getAuthUsersSpreadsheet_","SHEET_NAMES","COLS_USERS","LockService",
        "getPasswordRecoveryManager_","isActiveAuthUserRecord","normalizeUserId","MailApp","logToSheet",
        "normalizePassword","createPasswordHash","revokeSharedUserSessionContexts_","getActiveSessionTokensForUserUnderLock_","revokeAllUserSessionsUnderLock_",
        "writePasswordHashAndVerifyUnderLock_","clearUserSessionPointerUnderLock_","deleteRevokedSessionRowsUnderLock_",
        "hasPendingRoleRevocation_","migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_","roleRevocationPropertyKey_","PropertiesService",
        requestSource + "\n" + completeSource + "\nreturn {handleRequestPasswordRecovery,handleCompletePasswordRecovery};"
    )(
        {getActiveSpreadsheet:()=>spreadsheet,flush(){}}, ()=>spreadsheet,
        {USERS:"Users",ACTIVE_SESSIONS:"ActiveSessions"},
        {ID:1,Nombre_Usuario:2,Password:3,Privilegios:4,Correo_Electronico:6,SessionToken:8,TermsAcceptance:9},
        {getScriptLock:()=>lock}, ()=>manager,
        row=>Boolean(row && String(row[1]||"").trim() && ["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"].includes(String(row[3]||"").toLowerCase())),
        value=>String(value||"").trim(),
        {sendEmail:message=>{if(options.mailFailure)throw new Error("mail unavailable");sent.push(message);}},
        (...args)=>{lockEvents.push("log");logs.push(args);}, value=>String(value||"").trim(),
        password=>"pbkdf2-sha256$12000$"+"a".repeat(32)+"$"+hash(password),
        userId=>revocations.push(userId), ()=>["old-session"],
        (sheet,userId,beforeClear)=>{beforeClear(["old-session"]);return{rows:[{rowIndex:2,token:"old-session"}],tokens:["old-session"],revokedSessions:1,pendingRows:[],pendingLoginRequests:false};},
        (sheet,rowIndex,passwordHash)=>{users[rowIndex-1][2]=passwordHash;},
        (sheet,rowIndex)=>{users[rowIndex-1][7]="";return{pending:false,error:null};},
        ()=>({cleanupPending:false,cleanupError:null}),()=>false,
        ()=>false, ()=>({status:"success"}), userId=>"role_revocation_pending_"+userId, {getScriptProperties:()=>properties}
    );
    return { handlers, users, sent, logs, revocations, manager, lockEvents };
}

test("La solicitud responde igual para una cuenta existente y otra inexistente", () => {
    const h = makeHandlerHarness();
    const valid = h.handlers.handleRequestPasswordRecovery({username:"alice",email:"alice@example.com"});
    const unknown = h.handlers.handleRequestPasswordRecovery({username:"missing",email:"missing@example.com"});
    assert.deepEqual(valid, unknown);
    assert.equal(valid.status, "success");
    assert.equal(h.sent.length, 1);
    assert.match(h.sent[0].body, /Código de recuperación:/);
});

test("Un correo distinto al registrado no puede completar la recuperación", () => {
    const h = makeHandlerHarness();
    h.handlers.handleRequestPasswordRecovery({username:"alice",email:"alice@example.com"});
    const code = h.sent[0].body.match(/Código de recuperación:\s*([A-F0-9]{24})/)[1];
    const result = h.handlers.handleCompletePasswordRecovery({
        username:"alice",email:"attacker@example.com",code,newPassword:"NewPassword2026"
    });
    assert.equal(result.status, "error");
    assert.equal(h.users[1][2], "old-hash");
    assert.equal(h.revocations.length, 0);
});

test("La finalización actualiza el hash, revoca sesiones y consume el código", () => {
    const h = makeHandlerHarness();
    h.handlers.handleRequestPasswordRecovery({username:"alice",email:"alice@example.com"});
    const code = h.sent[0].body.match(/Código de recuperación:\s*([A-F0-9]{24})/)[1];
    h.lockEvents.length = 0;
    const result = h.handlers.handleCompletePasswordRecovery({
        username:"alice",email:"alice@example.com",code,newPassword:"NewPassword2026"
    });
    assert.equal(result.status, "success");
    assert.deepEqual(h.lockEvents, ["try", "release", "log"], "El logging debe ocurrir después de liberar ScriptLock.");
    assert.match(h.users[1][2], /^pbkdf2-sha256\$/);
    assert.notEqual(h.users[1][2], "NewPassword2026");
    assert.equal(h.users[1][7], "");
    assert.deepEqual(h.revocations, ["U1"]);
    const replay = h.handlers.handleCompletePasswordRecovery({
        username:"alice",email:"alice@example.com",code,newPassword:"AnotherPassword2026"
    });
    assert.equal(replay.status, "error");
    assert.equal(h.revocations.length, 1);
    const logText = JSON.stringify(h.logs);
    assert.ok(!logText.includes(code));
    assert.ok(!logText.includes("NewPassword2026"));
    assert.ok(!logText.includes("alice@example.com"));
});

test("Si MailApp falla, el código preparado se invalida y no puede consumirse", () => {
    const h = makeHandlerHarness({mailFailure:true});
    const response = h.handlers.handleRequestPasswordRecovery({username:"alice",email:"alice@example.com"});
    assert.equal(response.status, "success");
    assert.equal(h.manager.verify("U1","alice@example.com","A1B2C3D4E5F6A1B2C3D4E5F6").valid, false);
});

const recoveryManagerSource = extractFunction(authSource, "getPasswordRecoveryManager_");
assert.doesNotMatch(recoveryManagerSource, /PropertiesService|GPSpedia_PASSWORD_RECOVERY_SECRET_V1|computeHmacSha256Signature/);
assert.match(recoveryManagerSource, /Utilities\.DigestAlgorithm\.SHA_256/);
assert.match(recoveryManagerSource, /slice\(0,24\)/);
assert.match(extractFunction(authSource, "createPasswordRecoveryManager_"), /\^\[A-F0-9\]\{24\}\$/);
const authMutationPolicy = authSource.match(/function isSharedMutationAction_\(action\) \{([\s\S]*?)\n\}/);
assert.ok(authMutationPolicy);
assert.doesNotMatch(authMutationPolicy[1], /requestPasswordRecovery|completePasswordRecovery/);
assert.match(authSource, /function handleRequestPasswordRecovery[\s\S]*?LockService\.getScriptLock\(\)/);
assert.match(authSource, /function handleCompletePasswordRecovery[\s\S]*?revokeSharedUserSessionContexts_/);
assert.ok(authSource.includes("case 'requestPasswordRecovery':"));
assert.ok(authSource.includes("case 'completePasswordRecovery':"));
assert.doesNotMatch(apiSource, /COORDINATOR|getServiceTraffic/);
assert.ok(apiSource.includes("'requestPasswordRecovery': 'AUTH'"));
assert.ok(apiSource.includes("'completePasswordRecovery': 'AUTH'"));
const loginBoundary = frontendAuthSource.indexOf("\nexport async function login(");
const recoveryExports = frontendAuthSource.indexOf("export async function requestPasswordRecovery(");
assert.ok(loginBoundary >= 0 && recoveryExports > loginBoundary, "Los exports de recuperación deben quedar fuera del bloque de extracción de checkSession.");

assert.ok(mainSource.includes("passwordRecoveryRequestForm.addEventListener('submit'"));
assert.ok(mainSource.includes("passwordRecoveryCompleteForm.addEventListener('submit'"));
assert.ok(htmlSource.includes('id="password-recovery-request-form"'));
assert.ok(htmlSource.includes('id="password-recovery-complete-form"') && htmlSource.includes('pattern="[A-Fa-f0-9]{24}"'));
assert.match(workerSource, /gpsepedia-cache-v[0-9]+/);

console.log("PasswordRecovery: " + passed + "/" + passed + " PASS");
