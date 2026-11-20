import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleFreezeCortesIds(payload) {");
const end = source.indexOf("\nfunction fingerprintValue_", start);
assert.ok(start >= 0 && end > start, "No se encontró handleFreezeCortesIds");
const handler = source.slice(start, end);
assert.ok(handler.indexOf("assertDeveloperForIdMaintenance(payload)") < handler.indexOf("verifyCortesIdsBackup(payload"));
assert.ok(handler.indexOf("verifyCortesIdsBackup(payload") < handler.indexOf("LockService.getScriptLock()"),
    "La validación Drive del respaldo debe ejecutarse antes de adquirir ScriptLock");
assert.match(handler, /lock\.tryLock\(0\)/);
assert.match(handler, /busyError\.code = "WRITE_BUSY"/);

function createHarness({ lockAvailable = true, authError = null, backupError = null } = {}) {
    const events = [];
    let lockHeld = false;
    const lock = {
        tryLock(timeout) {
            events.push("lock");
            assert.equal(timeout, 0);
            if (!lockAvailable) return false;
            lockHeld = true;
            return true;
        },
        releaseLock() { events.push("release"); lockHeld = false; }
    };
    const sheet = { name: "Cortes" };
    const fn = new Function("LockService", "assertDeveloperForIdMaintenance", "verifyCortesIdsBackup",
        "SHEET_NAMES", "getSpreadsheet", "buildCortesIdFreezePlan",
        handler + "\nreturn handleFreezeCortesIds;")(
        { getScriptLock: () => lock },
        payload => { events.push("auth"); assert.equal(lockHeld, false); if (authError) throw authError; },
        backupId => { events.push("backup"); assert.equal(lockHeld, false); if (backupError) throw backupError; return backupId; },
        { CORTES: "Cortes" },
        () => ({ getSheetByName: name => { events.push("sheet"); assert.equal(lockHeld, true); return sheet; } }),
        currentSheet => {
            events.push("plan");
            assert.equal(lockHeld, true);
            assert.equal(currentSheet, sheet);
            return { finalValues: [], rowsWithData: 1, formulasToFreeze: 0, emptyFormulaRowsToClear: 0, maxId: 8 };
        }
    );
    return { run: payload => fn(payload), events, isLocked: () => lockHeld };
}
let passed = 0;
function test(name, run) { run(); passed++; console.log("PASS " + name); }

test("autorización y respaldo se verifican antes del lock; dry-run lee Cortes bajo lock", () => {
    const h = createHarness();
    const result = h.run({ backupId: "backup-123", confirm: false });
    assert.equal(result.status, "success");
    assert.equal(result.dryRun, true);
    assert.deepEqual(h.events, ["auth", "backup", "lock", "sheet", "plan", "release"]);
    assert.equal(h.isLocked(), false);
});

test("si WRITE está ocupado falla rápido sin retener ni esperar por el lock", () => {
    const h = createHarness({ lockAvailable: false });
    assert.throws(() => h.run({ backupId: "backup-123", confirm: false }), error => error.code === "WRITE_BUSY");
    assert.deepEqual(h.events, ["auth", "backup", "lock"]);
    assert.equal(h.isLocked(), false);
});

test("un actor no autorizado no consulta Drive ni intenta adquirir el lock", () => {
    const h = createHarness({ authError: new Error("unauthorized") });
    assert.throws(() => h.run({ backupId: "backup-123" }), /unauthorized/);
    assert.deepEqual(h.events, ["auth"]);
});

test("un respaldo inválido falla antes del lock", () => {
    const h = createHarness({ backupError: new Error("invalid backup") });
    assert.throws(() => h.run({ backupId: "bad" }), /invalid backup/);
    assert.deepEqual(h.events, ["auth", "backup"]);
});

test("el plan y el commit de IDs siguen dentro de la sección crítica", () => {
    assert.ok(handler.indexOf("buildCortesIdFreezePlan(sheet)") > handler.indexOf("lock.tryLock(0)"));
    assert.ok(handler.indexOf("idRange.setValues(plan.finalValues)") > handler.indexOf("lock.tryLock(0)"));
    assert.ok(handler.includes("if (lockAcquired) lock.releaseLock()"));
});

console.log("WriteFreezeCortesIdsBackupOutsideLock: " + passed + "/" + passed + " PASS");
