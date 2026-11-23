import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("JS/Services/SharedMutationClient.js", "utf8");
const now = Date.UTC(2026, 10, 23, 12, 0, 0);
const utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: () => Array.from({ length: 32 }, (_, index) => index)
};
function makeSheet(rows) {
    return { getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }) };
}
function makeSpreadsheet(users, sessions) {
    const sheets = { Users: makeSheet(users), ActiveSessions: makeSheet(sessions) };
    return { getSheetByName: name => sheets[name] || null };
}
const headersUsers = ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken"];
const headersSessions = ["ID_Usuario","Usuario","ActiveSessions","date","Logs","lastActivityAt"];
const validUsers = [headersUsers,["U-1","tecnico1","hash","Técnico","","","Técnico Uno",""]];
const validSessions = [headersSessions,["U-1","tecnico1","opaque-session-token-0001",new Date(now-60000),"",new Date(now-30000)]];
const values = new Map();
const cache = {
    get: key => values.get(key) || null,
    put: (key, value, ttl) => { values.set(key, value); },
    remove: key => values.delete(key)
};
const api = new Function("SpreadsheetApp","CacheService","Utilities","SPREADSHEET_ID",
    source + "\nreturn { loadSharedSessionActorFromSpreadsheet_, getCachedSharedSessionActor_, cacheSharedSessionActor_, handleSharedSessionActorCacheInvalidation_ };"
)({openById:()=>makeSpreadsheet(validUsers,validSessions)},
{getScriptCache:()=>cache},utilities,"isolated-spreadsheet-id");

let reads = 0;
const deps = {
    cache, now: () => now, spreadsheetId: "isolated-spreadsheet-id",
    openSpreadsheet: id => { assert.equal(id,"isolated-spreadsheet-id"); reads++; return makeSpreadsheet(validUsers,validSessions); }
};
const actor = api.loadSharedSessionActorFromSpreadsheet_("U-1","opaque-session-token-0001",deps);
assert.equal(actor.userId,"U-1");
assert.equal(actor.role,"tecnico");
assert.equal(actor.fullName,"Técnico Uno");
assert.equal(actor.epoch,1);
assert.equal(reads,1);

const cold = api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",deps);
assert.equal(cold.role,"tecnico");
assert.equal(reads,2,"Un cache miss valida en la Spreadsheet y carga el actor local.");
const hot = api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",deps);
assert.equal(hot.userId,"U-1");
assert.equal(reads,2,"Las acciones siguientes usan la caché local sin releer Users/ActiveSessions.");

assert.throws(() => api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",{
    ...deps,cache:{get:()=>null,put(){},remove(){}},
    loadActor:()=>({userId:"U-2",role:"desarrollador",epoch:1})
}),/sesión|confirmar/i,"Un actor de otra identidad nunca se acepta.");

function expectInvalid(users,sessions,token="opaque-session-token-0001",id="U-1",pattern=/sesión|cuenta|token|fecha|expiró|rol/i) {
    assert.throws(()=>api.loadSharedSessionActorFromSpreadsheet_(id,token,{
        ...deps,openSpreadsheet:()=>makeSpreadsheet(users,sessions)
    }),pattern);
}
expectInvalid(validUsers,[headersSessions,["U-1","tecnico1","different-token-0002",new Date(now-1000),"",new Date(now-1000)]]);
expectInvalid(validUsers,[...validSessions,validSessions[1]]);
expectInvalid(validUsers,[headersSessions,["U-2","tecnico1","opaque-session-token-0001",new Date(now-1000),"",new Date(now-1000)]]);
expectInvalid([headersUsers,["U-1","__deleted__:tecnico1","hash","tecnico","","","Técnico Uno",""]],validSessions);
expectInvalid([headersUsers,["U-1","tecnico1","hash","invitado","","","Técnico Uno",""]],validSessions);
expectInvalid([headersUsers,["U-1","tecnico1","hash","tecnico","","","Técnico Uno","__role_revocation_pending__:{}"]],validSessions);
expectInvalid(validUsers,[headersSessions,["U-1","tecnico1","opaque-session-token-0001",new Date(now-100*86400000),"",new Date(now-100*86400000)]]);
expectInvalid(validUsers,[headersSessions]);

const changedRoleUsers=[headersUsers,["U-1","tecnico1","hash","supervisor","","","Técnico Uno",""]];
const changedRole=api.loadSharedSessionActorFromSpreadsheet_("U-1","opaque-session-token-0001",{
 ...deps,openSpreadsheet:()=>makeSpreadsheet(changedRoleUsers,validSessions)
});
assert.equal(changedRole.role,"supervisor","Después de invalidar la caché, el rol nuevo se toma de Users, nunca del payload.");

const removed=[];
const invalidation=api.handleSharedSessionActorCacheInvalidation_(
    {userId:"U-1",sessionTokens:["opaque-session-token-0001","opaque-session-token-0001","opaque-session-token-0002"]},
    {cache:{remove:key=>removed.push(key)},keyFor:(id,token)=>id+":"+token}
);
assert.deepEqual(invalidation,{status:"success",invalidated:2});
assert.deepEqual(removed,["U-1:opaque-session-token-0001","U-1:opaque-session-token-0002"]);
assert.equal(api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["x"]}).status,"error");

console.log("MIG013SessionActorLocalLookup: 12/12 PASS — caché fría/caliente, identidad, RBAC, revocación, expiración e invalidación local");
