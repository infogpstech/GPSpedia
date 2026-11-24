import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extractFunction(name) {
    const start = admin.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = admin.indexOf("\nfunction ", start + 10);
    const end = next >= 0 ? next : admin.length;
    const block = admin.slice(start, end);
    const close = block.lastIndexOf("\n}");
    assert.ok(close >= 0, "No se encontró el cierre de " + name);
    return block.slice(0, close + 2);
}
const classify = new Function(extractFunction("classifyCortesImageOrganizerOperationState_") +
    "\nreturn classifyCortesImageOrganizerOperationState_;")();
const decideReservation = new Function(extractFunction("decideCortesOrganizerLedgerReservation_") +
    "\nreturn decideCortesOrganizerLedgerReservation_;")();
const withLedgerLock = new Function("LockService", extractFunction("withCortesOrganizerLedgerLock_") +
    "\nreturn withCortesOrganizerLedgerLock_;");

const execute = new Function(extractFunction("classifyCortesImageOrganizerOperationState_") + "\n" +
    extractFunction("decideCortesOrganizerLedgerReservation_") + "\n" +
    extractFunction("executeCortesImageOrganizerManifest_") +
    "\nreturn executeCortesImageOrganizerManifest_;")();
const rollback = new Function(extractFunction("classifyCortesImageOrganizerOperationState_") + "\n" +
    extractFunction("decideCortesOrganizerLedgerReservation_") + "\n" +
    extractFunction("rollbackCortesImageOrganizerOperations_") +
    "\nreturn rollbackCortesImageOrganizerOperations_;")();

const fileId = "drive_file_id_0000000000000001";
const operation = {
    operationId: "a".repeat(64) + ":" + fileId,
    manifestDigest: "a".repeat(64), auditId: "12345678-1234-4234-8234-123456789abc",
    fileId, currentName: "old.jpg", currentFolderPath: "Cortes/Entrada",
    targetName: "Hilux_2020_ign1.jpg", targetFolderPath: "Cortes/Toyota/Hilux"
};
function fixture(options = {}) {
    const localFileId = options.fileId || fileId;
    const state = { fileId:localFileId, fileName: "old.jpg", folderPath: "Cortes/Entrada", mimeType: "image/jpeg", trashed: false };
    const ledger = new Map();
    const events = [];
    const adapters = {
        loadLedger: id => ledger.get(id) || null,
        saveLedger: record => {
            if (options.failSaveOnce && record.status === options.failSaveStatus) {
                options.failSaveOnce = false;
                const error = new Error("ledger write contention");
                error.code = "ORGANIZER_LEDGER_BUSY";
                throw error;
            }
            ledger.set(record.operationId, structuredClone(record));
            events.push("ledger:" + record.status);
        },
        reserveLedger: (record, allowedStatuses) => {
            if (options.failReserve) {
                const error = new Error("ledger contention");
                error.code = "ORGANIZER_LEDGER_BUSY";
                throw error;
            }
            const current = ledger.get(record.operationId) || null;
            const decision = decideReservation(record, current, allowedStatuses);
            if (!decision.reserved) return decision;
            ledger.set(record.operationId, structuredClone(record));
            events.push("ledger:" + record.status);
            return Object.assign({}, decision, { record: structuredClone(record) });
        },
        inspectFile: () => structuredClone(state),
        resolveFolder: path => ({ folder: { path }, chain: [{ path }] }),
        verifyAcl: () => { if (options.failAcl) throw new Error("acl denied"); },
        assertNoNameConflict: () => {},
        moveAndRename: (_id, folder, name) => {
            state.folderPath = folder.path;
            state.fileName = name;
            events.push("move:" + folder.path + ":" + name);
            if (options.failAfterMove) throw new Error("simulated response loss after Drive mutation");
            if (options.failBeforeMove) throw new Error("simulated Drive failure");
        }
    };
    return { state, ledger, events, adapters, options };
}
const run = (name, fn) => { fn(); console.log("PASS " + name); };

run("persiste processing antes de mover y confirma el resultado", () => {
    const f = fixture();
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.status, "success");
    assert.equal(result.results[0].status, "applied");
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
    assert.ok(f.events.indexOf("ledger:processing") < f.events.findIndex(x => x.startsWith("move:")));
    assert.equal(f.state.folderPath, operation.targetFolderPath);
    assert.equal(f.state.fileName, operation.targetName);
});
run("reintento reconoce el archivo aplicado sin repetir el movimiento", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    const moves = f.events.filter(x => x.startsWith("move:")).length;
    const retry = execute([operation], "developer-1", f.adapters);
    assert.equal(retry.results[0].status, "already_applied");
    assert.equal(f.events.filter(x => x.startsWith("move:")).length, moves);
});
run("no acepta un archivo ya situado en destino sin evidencia durable de Safe Apply", () => {
    const f = fixture();
    f.state.folderPath = operation.targetFolderPath;
    f.state.fileName = operation.targetName;
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "blocked");
    assert.equal(f.ledger.has(operation.operationId), false);
});
run("rechaza una operación durable perteneciente a otro desarrollador", () => {
    const f = fixture();
    f.ledger.set(operation.operationId, { operationId: operation.operationId, ownerId: "other", status: "complete" });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "blocked");
    assert.equal(f.state.folderPath, "Cortes/Entrada");
});
run("un fallo de ACL evita el movimiento y registra rollback", () => {
    const f = fixture({ failAcl: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "rolled_back");
    assert.equal(f.state.folderPath, "Cortes/Entrada");
    assert.equal(f.ledger.get(operation.operationId).status, "rolled_back");
});
run("recupera respuesta perdida después de que Drive aplicó el movimiento", () => {
    const f = fixture({ failAfterMove: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "applied");
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
});
run("ejecuta rollback y lo hace idempotente", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    const reverted = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(reverted.status, "success");
    assert.equal(reverted.results[0].status, "rolled_back");
    assert.equal(f.state.folderPath, operation.currentFolderPath);
    const retry = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(retry.results[0].status, "already_rolled_back");
});
run("no revierte si el archivo cambió después de aplicar", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    f.state.fileName = "manual-change.jpg";
    const result = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "needs_review");
    assert.equal(f.state.fileName, "manual-change.jpg");
});
run("no inicia un segundo apply mientras existe una reserva activa", () => {
    const f = fixture();
    f.ledger.set(operation.operationId, {
        operationId: operation.operationId, fileId, ownerId: "developer-1",
        manifestDigest: operation.manifestDigest, status: "processing", attempts: 1
    });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "in_progress");
    assert.equal(f.events.some(event => event.startsWith("move:")), false);
});
run("una sola solicitud obtiene la reserva atómica de una operación", () => {
    const f = fixture();
    const reservationRecord = {
        operationId: operation.operationId, fileId, ownerId: "developer-1",
        manifestDigest: operation.manifestDigest, status: "processing", attempts: 1
    };
    const first = f.adapters.reserveLedger(reservationRecord, ["absent"]);
    const second = f.adapters.reserveLedger(reservationRecord, ["absent"]);
    assert.equal(first.reserved, true);
    assert.equal(second.reserved, false);
    assert.equal(second.current.status, "processing");
    const execution = execute([operation], "developer-1", f.adapters);
    assert.equal(execution.results[0].status, "in_progress");
    assert.equal(f.events.filter(event => event.startsWith("move:")).length, 0);
});
run("no inicia un segundo rollback mientras existe una reserva activa", () => {
    const f = fixture();
    f.state.folderPath = operation.targetFolderPath;
    f.state.fileName = operation.targetName;
    f.ledger.set(operation.operationId, {
        operationId: operation.operationId, fileId, ownerId: "developer-1",
        manifestDigest: operation.manifestDigest, status: "rollback_processing",
        sourceFolderPath: operation.currentFolderPath, sourceName: operation.currentName,
        targetFolderPath: operation.targetFolderPath, targetName: operation.targetName
    });
    const result = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "in_progress");
    assert.equal(f.ledger.get(operation.operationId).status, "rollback_processing");
    assert.equal(f.state.folderPath, operation.targetFolderPath);
});
run("la contención del ledger no se interpreta como fallo Drive ni marca rollback falso", () => {
    const f = fixture({ failReserve: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "retry");
    assert.equal(f.ledger.has(operation.operationId), false);
    assert.equal(f.events.some(event => event.startsWith("move:")), false);
});
run("la contención durante rollback conserva el estado completo y no revierte", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    const before = structuredClone(f.ledger.get(operation.operationId));
    f.options.failReserve = true;
    const result = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "retry");
    assert.equal(f.ledger.get(operation.operationId).status, before.status);
    assert.equal(f.state.folderPath, operation.targetFolderPath);
});
run("reconcilia el movimiento aplicado si el guardado final del ledger sufre contención", () => {
    const f = fixture({ failSaveStatus: "complete", failSaveOnce: true });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "applied");
    assert.equal(f.state.folderPath, operation.targetFolderPath);
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
    assert.equal(f.events.filter(event => event.startsWith("move:")).length, 1);
});
run("reconcilia el rollback si el guardado final sufre contención", () => {
    const f = fixture();
    execute([operation], "developer-1", f.adapters);
    f.options.failSaveStatus = "rolled_back";
    f.options.failSaveOnce = true;
    const result = rollback([operation.operationId], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "rolled_back");
    assert.equal(f.state.folderPath, operation.currentFolderPath);
    assert.equal(f.ledger.get(operation.operationId).status, "rolled_back");
});
run("el lock del ledger libera siempre y falla con estado retryable", () => {
    let held = false, releases = 0;
    const lock = {
        tryLock: timeout => { assert.equal(timeout, 0); if (held) return false; held = true; return true; },
        hasLock: () => held,
        releaseLock: () => { assert.equal(held, true); held = false; releases++; }
    };
    const helper = withLedgerLock({ getScriptLock: () => lock });
    assert.equal(helper(() => held), true);
    assert.equal(held, false);
    assert.equal(releases, 1);
    const busy = {
        tryLock: timeout => { assert.equal(timeout, 0); return false; },
        hasLock: () => false,
        releaseLock: () => { throw new Error("No debía liberar un lock ajeno"); }
    };
    assert.throws(() => withLedgerLock({ getScriptLock: () => busy })(() => 1),
        error => error && error.code === "ORGANIZER_LEDGER_BUSY");
});
run("dos Safe Apply de archivos distintos se ejecutan sin mantener un lock global durante Drive", () => {
    let lockHeld = false;
    const first = fixture(), second = fixture({fileId:"drive_file_id_0000000000000002"});
    const secondOperation = Object.assign({}, operation, {
        operationId:"b".repeat(64)+":drive_file_id_0000000000000002",
        fileId:"drive_file_id_0000000000000002",
        targetName:"Ranger_2022_ign1.jpg"
    });
    function wrapLedger(adapters) {
        const reserve = adapters.reserveLedger, save = adapters.saveLedger;
        adapters.reserveLedger = (...args) => {
            assert.equal(lockHeld, false, "No se debe entrar a otra operación con el lock retenido");
            lockHeld = true;
            try { return reserve(...args); } finally { lockHeld = false; }
        };
        adapters.saveLedger = (...args) => {
            assert.equal(lockHeld, false);
            lockHeld = true;
            try { return save(...args); } finally { lockHeld = false; }
        };
    }
    wrapLedger(first.adapters); wrapLedger(second.adapters);
    const firstMove = first.adapters.moveAndRename;
    first.adapters.moveAndRename = (...args) => {
        assert.equal(lockHeld, false, "El lock del ledger debe estar libre durante Drive");
        const nested = execute([secondOperation], "developer-1", second.adapters);
        assert.equal(nested.results[0].status, "applied", "La operación independiente debe avanzar");
        return firstMove(...args);
    };
    const result = execute([operation], "developer-1", first.adapters);
    assert.equal(result.results[0].status, "applied");
    assert.equal(second.ledger.get(secondOperation.operationId).status, "complete");
});
run("contención durante lectura del baseline devuelve retry y no ejecuta Drive", () => {
    const f = fixture();
    f.adapters.loadLedger = () => {
        const error = new Error("baseline ocupado");
        error.code = "ORGANIZER_LEDGER_BUSY";
        throw error;
    };
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "retry");
    assert.equal(f.events.some(event => event.startsWith("move:")), false);
});
run("reconcilia processing si Drive ya aplicó el destino antes de perderse la respuesta", () => {
    const f = fixture();
    f.state.folderPath = operation.targetFolderPath;
    f.state.fileName = operation.targetName;
    f.ledger.set(operation.operationId, {
        operationId:operation.operationId, ownerId:"developer-1", fileId,
        manifestDigest:operation.manifestDigest, status:"processing", attempts:1
    });
    const result = execute([operation], "developer-1", f.adapters);
    assert.equal(result.results[0].status, "already_applied");
    assert.equal(f.ledger.get(operation.operationId).status, "complete");
    assert.equal(f.events.some(event => event.startsWith("move:")), false);
});
run("rechaza IDs duplicados o inválidos en rollback", () => {
    const f = fixture();
    assert.throws(() => rollback([operation.operationId, operation.operationId], "developer-1", f.adapters), /inválidos o repetidos/i);
    assert.throws(() => rollback(["bad"], "developer-1", f.adapters), /inválidos o repetidos/i);
});
console.log("CortesImageOrganizerExecutor: 20/20 PASS");
