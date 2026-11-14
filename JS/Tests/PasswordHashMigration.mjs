import assert from "node:assert/strict";
import { createHash, createHmac, pbkdf2Sync } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const auth=readFileSync(resolve(root,"Services/Auth.js"),"utf8");
function extract(name){
    const start=auth.indexOf("function "+name+"(");
    assert.ok(start>=0,"No se encontró "+name);
    const nextFunction=auth.indexOf("\nfunction ",start+10);
    const nextConstant=auth.indexOf("\nconst ",start+10);
    const ends=[nextFunction,nextConstant].filter(x=>x>start);
    return auth.slice(start,ends.length?Math.min(...ends):auth.length);
}
let uuidCounter=0;
const Utilities={
    Charset:{UTF_8:"UTF_8"},
    DigestAlgorithm:{SHA_256:"SHA_256"},
    getUuid:()=>("12345678-1234-4234-8234-"+String(++uuidCounter).padStart(12,"0")),
    computeDigest:(algorithm,value)=>Array.from(createHash("sha256").update(String(value),"utf8").digest()).map(b=>b>127?b-256:b),
    computeHmacSha256Signature:(value,key)=>{
        const data=Array.isArray(value)?Buffer.from(value.map(b=>b&255)):Buffer.from(String(value),"utf8");
        return Array.from(createHmac("sha256",Buffer.from(String(key),"utf8")).update(data).digest()).map(b=>b>127?b-256:b);
    }
};
const code=[
    extract("normalizePassword"),extract("digestToHex"),extract("passwordHexToBytes_"),
    extract("pbkdf2Sha256Hex_"),extract("createPasswordHash"),extract("constantTimeEquals"),
    extract("verifyStoredPassword")
].join("\n");
const api=new Function("Utilities","PASSWORD_HASH_PREFIX","LEGACY_PASSWORD_HASH_PREFIX",
    "PASSWORD_KDF_ITERATIONS","PASSWORD_KDF_MIN_ITERATIONS","PASSWORD_KDF_MAX_ITERATIONS",
    code+"\nreturn {normalizePassword,pbkdf2Sha256Hex_,createPasswordHash,verifyStoredPassword};")(
        Utilities,"pbkdf2-sha256$","sha256$",12000,1000,200000
    );
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}

test("PBKDF2-HMAC-SHA256 coincide con el vector de referencia Node.js",()=>{
    const actual=api.pbkdf2Sha256Hex_("password","73616c74",1000);
    const expected=pbkdf2Sync("password",Buffer.from("salt"),1000,32,"sha256").toString("hex");
    assert.equal(actual,expected);
});
test("El formato almacena versión, coste, salt aleatorio y digest",()=>{
    const first=api.createPasswordHash("Password Seguro 2026");
    const second=api.createPasswordHash("Password Seguro 2026");
    assert.match(first,/^pbkdf2-sha256\$12000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.match(second,/^pbkdf2-sha256\$12000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.notEqual(first.split("$")[2],second.split("$")[2]);
    assert.ok(!first.includes("Password Seguro 2026"));
});
test("Verifica contraseña PBKDF2 correcta e incorrecta",()=>{
    const stored=api.createPasswordHash("Clave Segura 2026");
    assert.equal(api.verifyStoredPassword(stored,"Clave Segura 2026").matches,true);
    assert.equal(api.verifyStoredPassword(stored,"Clave Incorrecta").matches,false);
});
test("Rechaza digest manipulado, salt inválido y coste fuera de límites",()=>{
    const stored=api.createPasswordHash("Clave Segura 2026"),parts=stored.split("$");
    parts[3]="0".repeat(64);
    assert.equal(api.verifyStoredPassword(parts.join("$"),"Clave Segura 2026").matches,false);
    assert.equal(api.verifyStoredPassword("pbkdf2-sha256$999999999$"+"a".repeat(32)+"$"+"b".repeat(64),"x").matches,false);
    assert.equal(api.verifyStoredPassword("pbkdf2-sha256$12000$invalid$"+"b".repeat(64),"x").matches,false);
});
test("Verifica hashes SHA-256 históricos y los marca para rehash oportunista",()=>{
    const salt="00112233445566778899aabbccddeeff";
    const digest=createHash("sha256").update(salt+":LegacyPass2026","utf8").digest("hex");
    const result=api.verifyStoredPassword("sha256$"+salt+"$"+digest,"LegacyPass2026");
    assert.equal(result.matches,true);assert.equal(result.needsRehash,true);
});
test("Verifica contraseñas plaintext legacy sin exponerlas y marca migración",()=>{
    const result=api.verifyStoredPassword("LegacyPlainPass","LegacyPlainPass");
    assert.equal(result.matches,true);assert.equal(result.legacy,true);assert.equal(result.needsRehash,true);
    assert.equal(api.verifyStoredPassword("LegacyPlainPass","wrong").matches,false);
});
test("Requiere rehash cuando el coste almacenado es inferior al actual",()=>{
    const salt="00112233445566778899aabbccddeeff";
    const digest=pbkdf2Sync("OlderPass2026",Buffer.from(salt,"hex"),1000,32,"sha256").toString("hex");
    const result=api.verifyStoredPassword("pbkdf2-sha256$1000$"+salt+"$"+digest,"OlderPass2026");
    assert.equal(result.matches,true);assert.equal(result.needsRehash,true);
});
test("Conserva el límite mínimo de contraseña y permite compatibilidad legacy",()=>{
    assert.throws(()=>api.createPasswordHash("short"));
    assert.match(api.createPasswordHash("short",false),/^pbkdf2-sha256\$/);
});
test("El login rehashea credenciales antiguas tras validar la contraseña",()=>{
    assert.ok(auth.includes("if (currentPasswordCheck.needsRehash)"));
    assert.ok(auth.includes("setValue(createPasswordHash(normalizedPassword, false))"));
});
test("Incluye benchmark de coste para calibración en Apps Script sin datos productivos",()=>{
    assert.ok(auth.includes("function benchmarkPasswordKdf_()"));
    assert.ok(auth.includes("GPSpedia-KDF-benchmark-only"));
});


function migrationHarness(actorRole="Desarrollador"){
    const users=[
        ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo","Nombre_Completo","SessionToken","TermsAcceptance"],
        ["U1","dev","pbkdf2-sha256$12000$"+"a".repeat(32)+"$"+"b".repeat(64),"Desarrollador","","","Developer","", ""],
        ["U2","tech1","PlainLegacyA","Tecnico","","","Tech One","", ""],
        ["U3","inactive","InactiveLegacy","","","","Inactive","", ""],
        ["U4","tech2","sha256$00112233445566778899aabbccddeeff$"+"a".repeat(64),"Tecnico","","","Tech Two","", ""],
        ["U5","tech3","PlainLegacyB","Supervisor","","","Tech Three","", ""],
        ["U6","tech4","pbkdf2-sha256$12000$"+"b".repeat(32)+"$"+"c".repeat(64),"Tecnico","","","Tech Four","", ""]
    ];
    const sessions=[
        ["ID","Usuario","Token","date","Logs","LastActivityAt"],
        ["U1","dev","token-1",new Date(),"",new Date("2026-11-10T00:00:00Z")]
    ];
    let hashCounter=0,waits=0,releases=0;
    function sheet(rows){
        return {
            getDataRange:()=>({getValues:()=>rows.map(row=>row.slice())}),
            getRange:(row,col)=>({
                setValue:value=>{rows[row-1][col-1]=value;},
                getValue:()=>rows[row-1][col-1]
            }),
            _rows:rows
        };
    }
    const usersSheet=sheet(users),sessionsSheet=sheet(sessions);
    const ss={getSheetByName:name=>name==="Users"?usersSheet:name==="ActiveSessions"?sessionsSheet:null};
    const deps={
        normalizeUserId:v=>String(v??"").trim(),
        normalizeRoleName:v=>String(v||"").trim().toLowerCase(),
        isActiveAuthUserRecord:row=>Boolean(row&&String(row[1]||"").trim()&&!String(row[1]||"").startsWith("__deleted__:")&&["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"].includes(String(row[3]||"").trim().toLowerCase())),
        findSessionRowsByTokenUnderLock_:(sh,token)=>sh.getDataRange().getValues().slice(1).map((row,index)=>({row,rowIndex:index+2})).filter(item=>item.row[2]===token),
        getSessionExpirationStatus_:()=>({expired:false}),
        assertRequesterRoleRevocationClear_:()=>{},
        ensureActiveSessionsActivityColumn_:()=>{},
        createPasswordHash:()=>{hashCounter++;return "pbkdf2-sha256$12000$"+String(hashCounter).padStart(32,"0")+"$"+"d".repeat(64);},
        LockService:{getScriptLock:()=>({waitLock:()=>{waits++;},releaseLock:()=>{releases++;}})},
        SpreadsheetApp:{openById:()=>ss,flush:()=>{}},
        SPREADSHEET_ID:"ISOLATED",
        SHEET_NAMES:{USERS:"Users",ACTIVE_SESSIONS:"ActiveSessions"},
        COLS_USERS:{ID:1,Nombre_Usuario:2,Password:3,Privilegios:4},
        COLS_ACTIVE_SESSIONS:{ID_Usuario:1,ActiveSessions:3,LastActivityAt:6},
        PASSWORD_HASH_PREFIX:"pbkdf2-sha256$",
        LEGACY_PASSWORD_HASH_PREFIX:"sha256$"
    };
    users[1][3]=actorRole;
    const fn=new Function(...Object.keys(deps),extract("handleMigrateLegacyPasswords")+"\nreturn handleMigrateLegacyPasswords;")(...Object.values(deps));
    return {run:payload=>fn(payload),users,sessions,stats:()=>({hashCounter,waits,releases})};
}
test("La migración batch usa dry-run por defecto y no escribe contraseñas",()=>{
    const h=migrationHarness(),before=h.users.map(r=>r.slice()),r=h.run({userId:"U1",sessionToken:"token-1",batchSize:1});
    assert.equal(r.status,"success");assert.equal(r.dryRun,true);assert.equal(r.eligiblePlaintext,2);assert.equal(r.wouldMigrate,1);
    assert.equal(r.legacyHashedPendingLogin,1);assert.equal(r.alreadyCurrent,2);assert.deepEqual(h.users,before);
    assert.ok(!JSON.stringify(r).includes("PlainLegacyA")&&!JSON.stringify(r).includes("PlainLegacyB"));
});
test("El dry-run identifica IDs activos duplicados y bloquea la escritura",()=>{
    const h=migrationHarness();
    h.users[2][0]="U5";
    const dry=h.run({userId:"U1",sessionToken:"token-1",batchSize:1});
    assert.equal(dry.dryRun,true);
    assert.equal(dry.ambiguousActiveAccounts,2);
    assert.throws(()=>h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true,batchSize:1}),/ID vacío o duplicado/);
    assert.equal(h.stats().hashCounter,0);
    assert.equal(h.users[2][2],"PlainLegacyA");
});
test("El dry-run identifica IDs activos vacíos y bloquea la escritura",()=>{
    const h=migrationHarness();
    h.users[2][0]="";
    const dry=h.run({userId:"U1",sessionToken:"token-1",batchSize:1});
    assert.equal(dry.ambiguousActiveAccounts,1);
    assert.throws(()=>h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true,batchSize:1}),/ID vacío o duplicado/);
    assert.equal(h.stats().hashCounter,0);
    assert.equal(h.users[2][2],"PlainLegacyA");
});
test("La migración exige confirmación explícita para escribir",()=>{
    const h=migrationHarness();assert.throws(()=>h.run({userId:"U1",sessionToken:"token-1",dryRun:false}));
    assert.equal(h.stats().hashCounter,0);
});
test("La migración procesa lotes reanudables e idempotentes",()=>{
    const h=migrationHarness();
    const first=h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true,batchSize:1});
    assert.equal(first.migrated,1);assert.equal(first.remainingPlaintext,1);assert.equal(first.complete,false);
    const second=h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true,batchSize:1});
    assert.equal(second.migrated,1);assert.equal(second.remainingPlaintext,0);assert.equal(second.complete,true);
    const third=h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true,batchSize:1});
    assert.equal(third.migrated,0);assert.equal(third.complete,true);assert.equal(h.stats().hashCounter,2);
    assert.match(h.users[2][2],/^pbkdf2-sha256\$/);assert.match(h.users[5][2],/^pbkdf2-sha256\$/);
    assert.equal(typeof h.sessions[1][5],"string");
    assert.equal(h.stats().waits,h.stats().releases);
});
test("La migración rechaza roles distintos de Desarrollador",()=>{
    const h=migrationHarness("Supervisor");
    assert.throws(()=>h.run({userId:"U1",sessionToken:"token-1",dryRun:false,confirm:true}));
    assert.equal(h.stats().hashCounter,0);
});

console.log("PasswordHashMigration: "+passed+"/"+passed+" PASS");
