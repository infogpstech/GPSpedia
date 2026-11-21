import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddLogo(payload, logMessage)");
const end = source.indexOf("\nfunction prepareAdminVinCollectionEdit_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleAddLogo");
const handler = source.slice(start, end);

let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("la carga Drive termina antes de adquirir el lock de asignación", () => {
    assert.ok(handler.indexOf("brandFolder.createFile(blob)") < handler.indexOf("lock.tryLock(0)"));
});

test("la asignación usa adquisición fail-fast sin esperas", () => {
    assert.match(handler, /lock\.tryLock\(0\)/);
    assert.doesNotMatch(handler, /waitLock\(/);
    assert.match(handler, /busyError\.code = "ADMIN_BUSY"/);
});

test("si el lock está ocupado se retira el archivo no vinculado o se marca para recuperación", () => {
    const busy = handler.slice(handler.indexOf("if (!lockAcquired)"), handler.indexOf("let newRow", handler.indexOf("if (!lockAcquired)")));
    assert.ok(busy.includes("trashUnlinkedFile()"));
    assert.ok(busy.includes("markRecovery(cleanupError.message)"));
    assert.ok(busy.includes("ADMIN_BUSY"));
});

test("la secuencia y la fila se escriben bajo lock y se libera solo si fue adquirido", () => {
    assert.ok(handler.indexOf("lock.tryLock(0)") < handler.indexOf("getNextLogoIdLocked_(sheet)"));
    assert.match(handler, /finally\s*\{\s*if \(lockAcquired && lock\.hasLock\(\)\) lock\.releaseLock\(\);\s*\}/);
});

console.log("AdminLogoWriteLockNonBlocking: " + passed + "/" + passed + " PASS");
