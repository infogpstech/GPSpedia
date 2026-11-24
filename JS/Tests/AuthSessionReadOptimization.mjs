import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../Services/Auth.js", import.meta.url), "utf8");
function block(name) {
    const start = auth.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = auth.indexOf("\nfunction ", start + 1);
    return auth.slice(start, next < 0 ? auth.length : next);
}
function count(text, expression) { return [...text.matchAll(expression)].length; }

const login = block("handleLogin");
assert.equal(count(login, /\.getDataRange\(\)/g), 1,
    "Login debe hacer una sola lectura completa de Users; las verificaciones posteriores usan la fila objetivo.");
assert.match(login, /getRange\(currentUserRowIndex, 1, 1, COLS_USERS\.TermsAcceptance\)/);
assert.match(login, /reconcileRoleRevocationUnderLock_\(userSheet, activeSessionsSheet, userId, currentUserRowIndex\)/);
assert.match(login, /getRange\(currentUserRowIndex, 1, 1, COLS_USERS\.TermsAcceptance\)/g);

const loginSession = block("createOrRecoverLoginSessionUnderLock_");
assert.equal(count(loginSession, /sessionsSheet\.getDataRange\(\)/g), 2,
    "La creación normal usa un snapshot; la segunda lectura solo reconcilia un append ambiguo.");
assert.match(loginSession, /let sessionData = sessionsSheet\.getDataRange\(\)\.getValues\(\)/);
assert.match(loginSession, /findSessionRowsByTokenInData_\(sessionData, token\)/);
assert.match(loginSession, /sessionData\.push\(appendedRow\)/);
assert.match(loginSession, /getRange\(currentTokenRowIndex, 1, 1, readWidth\)/);
assert.equal(count(loginSession, /findSessionRowsByTokenUnderLock_\(/g), 2,
    "El escaneo completo por token queda reservado a fallos de borrado/verificación.");

const recoveryRequest = block("handleRequestPasswordRecovery");
assert.equal(count(recoveryRequest, /\.getDataRange\(\)/g), 1);
assert.equal(count(recoveryRequest, /\.getRange\(/g), 1,
    "La verificación bajo lock debe leer solo la fila objetivo, no repetir el rango completo.");
assert.ok(recoveryRequest.indexOf("usersSheet.getDataRange()") < recoveryRequest.indexOf("acquireAuthScriptLock_(lock"));
assert.ok(recoveryRequest.indexOf("acquireAuthScriptLock_(lock") < recoveryRequest.indexOf("usersSheet.getRange(matches[0].rowIndex"));
assert.match(recoveryRequest, /const currentRow=usersSheet\.getRange\(matches\[0\]\.rowIndex/);

const deleteUser = block("handleDeleteUser");
assert.equal(count(deleteUser, /\.getDataRange\(\)/g), 1,
    "Eliminación debe leer Users una vez y ActiveSessions solo en las columnas necesarias.");
assert.match(deleteUser, /getRange\(2, 1, sessionsLastRow - 1, sessionWidth\)/);
assert.match(deleteUser, /const tokenCounts = new Map\(\)/);
assert.match(deleteUser, /targetSessionTokens\.push\(token\)/);
assert.match(deleteUser, /revokeSharedUserSessionContexts_\(userId, targetSessionTokens\)/);
assert.doesNotMatch(deleteUser, /getActiveSessionTokensForUserUnderLock_/);
assert.match(deleteUser, /getRange\(2, COLS_ACTIVE_SESSIONS\.ID_Usuario, remainingLastRow - 1, 1\)/,
    "La verificación posterior solo debe leer la columna ID_Usuario.");

for (const name of ["handleCompletePasswordRecovery", "handleChangePassword", "handleResetUserPassword", "handleResetUserSessions"]) {
    const source = block(name);
    assert.doesNotMatch(source, /getActiveSessionTokensForUserUnderLock_/,
        name + " no debe escanear ActiveSessions antes de que revokeAll vuelva a leerla.");
    assert.match(source, /revokeAllUserSessionsUnderLock_\([\s\S]*?revokeSharedUserSessionContexts_/,
        name + " debe invalidar cachés usando los tokens del mismo snapshot de revocación.");
}

const updateUser = block("handleUpdateUser");
assert.doesNotMatch(updateUser, /getActiveSessionTokensForUserUnderLock_/);
assert.match(updateUser, /reconcileRoleRevocationUnderLock_\(usersSheet, sessionsSheet, userId, targetRows\[0\]\.rowIndex\)/);

const revokeAll = block("revokeAllUserSessionsUnderLock_");
const callbackAt = revokeAll.indexOf("beforeClear(tokens)");
const clearAt = revokeAll.indexOf("tokenRange.setValues(nextValues)");
assert.ok(callbackAt >= 0 && clearAt > callbackAt,
    "La invalidación de la caché local debe completarse antes de limpiar tokens locales.");
assert.match(revokeAll, /return \{ rows, tokens, revokedSessions, pendingRows/);

const reconcile = block("reconcileRoleRevocationUnderLock_");
assert.match(reconcile, /readTargetRows=\(\)=>Number\.isInteger\(knownRowIndex\)/);
assert.equal(count(reconcile, /\.getDataRange\(\)/g), 1,
    "La reconciliación con fila conocida debe evitar la segunda lectura completa de Users.");
assert.match(reconcile, /revokeAllUserSessionsUnderLock_\(sessionsSheet,userId,[\s\S]*?revokeSharedUserSessionContexts_/);
assert.doesNotMatch(auth, /function getActiveSessionTokensForUserUnderLock_\(/,
    "El helper de escaneo duplicado debe permanecer eliminado.");

console.log("AuthSessionReadOptimization: 9/9 PASS — menos lecturas completas y una sola revocación por operación");
