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

console.log("PasswordHashMigration: "+passed+"/"+passed+" PASS");
