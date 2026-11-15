import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const auth = readFileSync(resolve(root, "JS/Services/Auth.js"), "utf8");
const declaration = "function handleClearSensitiveLogs(payload)";
const start = auth.indexOf(declaration);
assert.ok(start >= 0, "No se encontró handleClearSensitiveLogs.");
const match = auth.slice(start).match(/^function handleClearSensitiveLogs\(payload\) \{[\s\S]*?^\}/m);
assert.ok(match, "No se pudo extraer handleClearSensitiveLogs.");

function createHarness() {
    const rows = [
        ["Level", "Message", "Details", "Timestamp"],
        ["INFO", "Arranque normal", "sin credenciales", new Date("2026-11-15T10:00:00Z")],
        ["SECRET", "credencial sensible", "debe purgarse", new Date("2026-11-15T10:01:00Z")],
        ["WARN", "Evento operativo", "debe conservarse", new Date("2026-11-15T10:02:00Z")]
    ];
    const requestedSheets = [];
    const logsSheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => 4,
        getRange(row, column, rowCount, columnCount) {
            return {
                getValues() {
                    return rows.slice(row - 1, row - 1 + rowCount)
                        .map(line => line.slice(column - 1, column - 1 + columnCount));
                }
            };
        },
        deleteRow(rowNumber) { rows.splice(rowNumber - 1, 1); }
    };
    let lockAcquired = 0, lockReleased = 0, flushCount = 0;
    const logEntries = [];
    const handler = new Function(
        "normalizeUserId", "normalizeRoleName", "LockService", "SpreadsheetApp",
        "SHEET_NAMES", "SPREADSHEET_ID", "Utilities", "isSensitiveLogRecord_", "logToSheet",
        match[0] + "\nreturn handleClearSensitiveLogs;"
    )(
        value => String(value || "").trim(),
        value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(),
        { getScriptLock: () => ({
            waitLock() { lockAcquired++; },
            releaseLock() { lockReleased++; }
        }) },
        {
            openById: () => ({
                getSheetByName(name) {
                    requestedSheets.push(name);
                    return name === "Logs" ? logsSheet : null;
                }
            }),
            flush() { flushCount++; }
        },
        { LOGS: "Logs" },
        "SPREADSHEET_TEST",
        { formatDate: () => "2026-11-15 10:00:00" },
        row => String(row && row[0] || "") === "SECRET",
        (level, message, metadata) => logEntries.push({ level, message, metadata })
    );
    return {
        handler, rows, requestedSheets, logEntries,
        stats: () => ({ lockAcquired, lockReleased, flushCount })
    };
}

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

test("la purga usa el actor confiable de Coordinator y elimina solo filas sensibles", () => {
    const h = createHarness();
    const result = h.handler({
        userId: "DEV-1",
        sessionToken: "token-ya-validado-por-coordinator",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    });
    assert.equal(result.status, "success");
    assert.equal(result.scannedCount, 3);
    assert.equal(result.deletedCount, 1);
    assert.equal(h.rows.length, 3);
    assert.equal(h.rows[1][1], "Arranque normal");
    assert.equal(h.rows[2][1], "Evento operativo");
    assert.deepEqual(h.requestedSheets, ["Logs"]);
    assert.deepEqual(h.stats(), { lockAcquired: 1, lockReleased: 1, flushCount: 1 });
    assert.equal(h.logEntries.at(-1).level, "INFO");
});

test("rechaza rol no Desarrollador aunque el cliente envíe un userId válido", () => {
    const h = createHarness();
    assert.throws(() => h.handler({
        userId: "USER-2",
        sessionToken: "token",
        __sharedSessionActor: { userId: "USER-2", role: "Tecnico", epoch: 3 }
    }), /reservada a una sesión Desarrollador/);
    assert.equal(h.requestedSheets.length, 0);
    assert.deepEqual(h.stats(), { lockAcquired: 0, lockReleased: 0, flushCount: 0 });
});

test("rechaza identidad cruzada y actor sin epoch confiable", () => {
    const h = createHarness();
    assert.throws(() => h.handler({
        userId: "DEV-IMPOSTOR",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 7 }
    }), /reservada a una sesión Desarrollador/);
    assert.throws(() => h.handler({
        userId: "DEV-1",
        __sharedSessionActor: { userId: "DEV-1", role: "Desarrollador", epoch: 0 }
    }), /reservada a una sesión Desarrollador/);
});

test("AUTH no relee ActiveSessions para sincronizar cada acción", () => {
    const begin = auth.indexOf("function doPost(e)");
    const end = auth.indexOf("function doPostInternal_(e)", begin);
    assert.ok(begin >= 0 && end > begin);
    const dispatcher = auth.slice(begin, end);
    assert.match(dispatcher, /withSharedMutationLease_\("AUTH", action/);
    assert.match(dispatcher, /withSharedSessionActor_\(e, actor\)/);
    assert.doesNotMatch(dispatcher, /syncAuthSheetActivityFromActor_/);
    assert.match(auth, /function handleClearSensitiveLogs\(payload\)[\s\S]*?payload\.__sharedSessionActor/);
});

console.log("SensitiveLogsTrustedActor: " + passed + "/" + passed + " PASS");
