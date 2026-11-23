import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("JS/Services/SharedSessionActor.js", "utf8");
const auth = fs.readFileSync("JS/Services/Auth.js", "utf8");
const write = fs.readFileSync("JS/Services/write.js", "utf8");
const feedback = fs.readFileSync("JS/Services/feedback.js", "utf8");
const admin = fs.readFileSync("JS/Services/admin.js", "utf8");
const catalog = fs.readFileSync("JS/Services/catalog.js", "utf8");
const utilitiesSource = fs.readFileSync("JS/Services/Utilities.js", "utf8");
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
const cacheTtls = [];
const cache = {
    get: key => values.get(key) || null,
    put: (key, value, ttl) => { cacheTtls.push(ttl); values.set(key, value); },
    remove: key => values.delete(key)
};
const api = new Function("SpreadsheetApp","CacheService","Utilities","SPREADSHEET_ID",
    source + "\nreturn { loadSharedSessionActorFromSpreadsheet_, getCachedSharedSessionActor_, cacheSharedSessionActor_, handleSharedSessionActorCacheInvalidation_, getSharedSessionActorCacheKey_ };"
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
assert.equal(cacheTtls.at(-1),21600,"La caché tiene un TTL máximo explícito de seis horas.");
assert.match(api.getSharedSessionActorCacheKey_("U-1","opaque-session-token-0001"),/^GPSpedia_SHARED_SESSION_ACTOR_V1_[a-f0-9]{64}$/);
assert.doesNotMatch(api.getSharedSessionActorCacheKey_("U-1","opaque-session-token-0001"),/opaque-session-token/);

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
api.cacheSharedSessionActor_("U-1","opaque-session-token-0001",{userId:"U-1",role:"tecnico",fullName:"Técnico Uno",epoch:1},deps);
api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]},{cache});
const changedRole=api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",{
 ...deps,openSpreadsheet:()=>makeSpreadsheet(changedRoleUsers,validSessions)
});
assert.equal(changedRole.role,"supervisor","Tras invalidar la caché, el rol nuevo se toma de Users, nunca del payload.");

api.cacheSharedSessionActor_("U-1","opaque-session-token-0001",{userId:"U-1",role:"supervisor",fullName:"Técnico Uno",epoch:1},deps);
api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]},{cache});
const deletedUsers=[headersUsers,["U-1","__deleted__:tecnico1","hash","supervisor","","","Técnico Uno",""]];
assert.throws(()=>api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",{
 ...deps,openSpreadsheet:()=>makeSpreadsheet(deletedUsers,validSessions)
}),/desactivada|rol válido|cuenta/i,"Una cuenta eliminada no recupera actor tras invalidar la caché.");

api.cacheSharedSessionActor_("U-1","opaque-session-token-0001",{userId:"U-1",role:"tecnico",fullName:"Técnico Uno",epoch:1},deps);
api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]},{cache});
assert.throws(()=>api.getCachedSharedSessionActor_("U-1","opaque-session-token-0001",{
 ...deps,openSpreadsheet:()=>makeSpreadsheet(validUsers,[headersSessions])
}),/revocada|no existe/i,"Un token revocado no recupera actor tras invalidar la caché.");

const removed=[];
const invalidation=api.handleSharedSessionActorCacheInvalidation_(
    {userId:"U-1",sessionTokens:["opaque-session-token-0001","opaque-session-token-0001","opaque-session-token-0002"]},
    {cache:{remove:key=>removed.push(key)},keyFor:(id,token)=>id+":"+token}
);
assert.deepEqual(invalidation,{status:"success",invalidated:2});
assert.deepEqual(removed,["U-1:opaque-session-token-0001","U-1:opaque-session-token-0002"]);
assert.equal(api.handleSharedSessionActorCacheInvalidation_({userId:"U-1",sessionTokens:["x"]}).status,"error");

const sessionEntryPoints = [
    ["AUTH", auth, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken/],
    ["WRITE", write, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken/],
    ["FEEDBACK", feedback, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken/],
    ["ADMIN", admin, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken/],
    ["UTILITIES", utilitiesSource, /getCachedSharedSessionActor_\(payload&&payload\.userId,payload&&payload\.sessionToken/]
];
for (const [name, service, actorLookup] of sessionEntryPoints) {
    assert.match(service, actorLookup, name + " debe resolver el actor localmente.");
    assert.doesNotMatch(service, /client\.(?:registerSession|syncUserSessions|validateSessionContext|revokeSession|revokeUserSessions)/,
        name + " no debe delegar la sesión a Coordinator.");
}
assert.match(catalog, /function getCatalogSessionActor_/);
assert.match(catalog, /function loadCatalogSessionActor_/);
assert.doesNotMatch(catalog, /GPSpedia_COORDINATOR_SECRET|withSharedMutationLease_/);

// CATALOG mantiene su caché aislada porque su proyecto no incluye el helper común.
let catalogUsers = [headersUsers,["U-1","tecnico1","hash","Técnico","","","Técnico Uno",""]];
let catalogSessions = [headersSessions,["U-1","tecnico1","opaque-session-token-0001",new Date(now-60000),"",new Date(now-30000)]];
let catalogReads = 0;
const catalogValues = new Map(), catalogTtls = [];
const catalogCache = {
    get: key => catalogValues.get(key) || null,
    put: (key,value,ttl) => { catalogTtls.push(ttl); catalogValues.set(key,value); },
    remove: key => catalogValues.delete(key)
};
const catalogSpreadsheet = {
    getSheetByName: name => {
        const rows = name === "Users" ? catalogUsers : name === "ActiveSessions" ? catalogSessions : null;
        return rows ? {getDataRange:()=>({getValues:()=>{catalogReads++;return rows.map(row=>row.slice());}})} : null;
    }
};
const catalogApi = new Function("SpreadsheetApp","CacheService","Utilities",
    catalog + "\nreturn {getCatalogSessionActor_,loadCatalogSessionActor_,invalidateCatalogSessionActorCache_};"
)({openById:()=>catalogSpreadsheet},{getScriptCache:()=>catalogCache},utilities);
const catalogCold = catalogApi.getCatalogSessionActor_("U-1","opaque-session-token-0001");
assert.equal(catalogCold.role,"tecnico");
const catalogColdReads = catalogReads;
const catalogHot = catalogApi.getCatalogSessionActor_("U-1","opaque-session-token-0001");
assert.equal(catalogHot.userId,"U-1");
assert.equal(catalogReads,catalogColdReads,"CATALOG reutiliza su caché local en accesos calientes.");
assert.equal(catalogTtls.at(-1),21600,"CATALOG aplica el TTL local de seis horas.");
catalogUsers = [headersUsers,["U-1","tecnico1","hash","supervisor","","","Técnico Uno",""]];
catalogApi.invalidateCatalogSessionActorCache_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]});
assert.equal(catalogApi.getCatalogSessionActor_("U-1","opaque-session-token-0001").role,"supervisor");
catalogSessions = [headersSessions];
catalogApi.invalidateCatalogSessionActorCache_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]});
assert.throws(()=>catalogApi.getCatalogSessionActor_("U-1","opaque-session-token-0001"),/sesión|registro único/i);
catalogSessions = [headersSessions,["U-1","tecnico1","opaque-session-token-0001",new Date(now-100*86400000),"",new Date(now-100*86400000)]];
catalogApi.invalidateCatalogSessionActorCache_({userId:"U-1",sessionTokens:["opaque-session-token-0001"]});
assert.throws(()=>catalogApi.getCatalogSessionActor_("U-1","opaque-session-token-0001"),/expiró/i);
assert.match(auth, /const token = record \? record\.token : Utilities\.getUuid\(\)/,
    "La sesión debe usar un token opaco generado en servidor.");
assert.match(auth, /LOGIN_MAX_ATTEMPTS = 5/);
assert.match(auth, /LOGIN_LOCKOUT_SECONDS = 15 \* 60/);
assert.match(auth, /function createPasswordHash\(/);
assert.match(auth, /function verifyStoredPassword\(/);
console.log("MIG013SessionActorLocalLookup: 21/21 PASS — caché fría/caliente, TTL, token opaco, identidad, RBAC, expiración, usuario eliminado, token revocado e invalidación local");
