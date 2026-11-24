import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extractFunction(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const helperNames = [
    "createAdminAuditError_", "safeAdminAuditId_", "safeAdminAuditStage_",
    "getAdminAuditResourceSummary_", "getAdminAuditPartialResult_", "getAdminAuditOutcome_",
    "getAdminAuditResultCode_", "getAdminAuditSheet_", "readAdminAuditBaselineState_",
    "writeAdminAuditBaselineState_", "adminAuditRecordToRow_", "adminAuditRowToRecord_",
    "sameAdminAuditRecord_", "getAdminAuditEventMap_", "findAdminAuditEventRow_", "appendAdminAuditRecord_",
    "updateAdminAuditRecord_", "ensureAdminAuditBaseline_", "pruneAdminAuditSheetUnderLock_",
    "beginAdminAuditEvent_", "finalizeAdminAuditEvent_", "isSharedMutationAction_"
];
const helperSource = helperNames.map(extractFunction).join("\n");
const headers = [
    "recordType", "eventId", "actorId", "actorRole", "action", "resourceType",
    "sourceResourceId", "targetResourceId", "startedAt", "finishedAt", "outcome",
    "stage", "durationMs", "resultCode", "partialResultJson", "schemaVersion"
];
const constants = `
const ADMIN_AUDIT_PROPERTY_PREFIX_ = "GPSpedia_ADMIN_AUDIT_V1_";
const ADMIN_AUDIT_SHEET_NAME_ = "AdminOperationAudit";
const ADMIN_AUDIT_BASELINE_PENDING_ = "pending";
const ADMIN_AUDIT_BASELINE_VERSION_ = "admin_audit_baseline_v1";
const ADMIN_AUDIT_HEADERS_ = Object.freeze(${JSON.stringify(headers)});
const ADMIN_AUDIT_RETENTION_MS_ = 180 * 24 * 60 * 60 * 1000;
const ADMIN_AUDIT_MAX_FINALIZED_ = 300;
const ADMIN_AUDIT_MAX_PENDING_ = 20;
const ADMIN_AUDIT_MAX_RECORD_LENGTH_ = 900;
`;
function baselineRow(state) {
    const row = new Array(16).fill("");
    row[0] = "META"; row[1] = "BASELINE"; row[2] = state;
    return row;
}
function makeEvent(id, finishedAt = null, outcome = "started") {
    return {
        schemaVersion: 1, eventId: id, actorId: "1001", actorRole: "desarrollador",
        action: "driveCommand", resourceType: "drive", sourceResourceId: "file123456789",
        targetResourceId: "folder123456789",
        startedAt: new Date(finishedAt ? Date.parse(finishedAt) - 1000 : Date.now() - 1000).toISOString(),
        finishedAt, outcome, stage: finishedAt ? "Finalizacion" : "Inicio",
        durationMs: finishedAt ? 1000 : null, resultCode: finishedAt ? "SUCCESS" : "PENDING",
        partialResult: {}
    };
}
function createSheet(options = {}) {
    const rows = (options.rows || [headers]).map(row => row.slice());
    const width = headers.length;
    const pad = row => Array.from({ length: width }, (_, i) => row[i] === undefined ? "" : row[i]);
    const ensureRows = count => { while (rows.length < count) rows.push(new Array(width).fill("")); };
    const sheet = {
        rows,
        getLastRow() { return rows.length; },
        getLastColumn() { return width; },
        getDataRange() { return { getValues: () => rows.map(row => pad(row)) }; },
        getRange(row, col, rowCount = 1, colCount = 1) {
            return {
                getValues() {
                    const values = [];
                    for (let r = 0; r < rowCount; r++) {
                        const current = rows[row - 1 + r] || [];
                        values.push(Array.from({ length: colCount }, (_, c) => current[col - 1 + c] === undefined ? "" : current[col - 1 + c]));
                    }
                    return values;
                },
                getValue() { return this.getValues()[0][0]; },
                setValues(values) {
                    if (row >= 3 && options.batchFailBefore > 0) { options.batchFailBefore--; throw new Error("batch before write"); }
                    ensureRows(row - 1 + values.length);
                    values.forEach((line, r) => {
                        ensureRows(row + r);
                        for (let c = 0; c < colCount; c++) rows[row - 1 + r][col - 1 + c] = line[c] === undefined ? "" : line[c];
                    });
                    if (row >= 3 && options.batchFailAfter > 0) { options.batchFailAfter--; throw new Error("batch response lost"); }
                    return this;
                },
                setValue(value) {
                    ensureRows(row);
                    rows[row - 1][col - 1] = value;
                    return this;
                },
                clearContent() {
                    if (rows[row - 1]) for (let c = 0; c < colCount; c++) rows[row - 1][col - 1 + c] = "";
                    return this;
                }
            };
        },
        appendRow(row) {
            if (options.appendFailBefore > 0) { options.appendFailBefore--; throw new Error("append before write"); }
            rows.push(row.slice());
            if (options.appendFailAfter > 0) { options.appendFailAfter--; throw new Error("append response lost"); }
            return this;
        },
        deleteRow(rowIndex) { rows.splice(rowIndex - 1, 1); return this; },
        deleteRows(rowIndex, count) { rows.splice(rowIndex - 1, count); return this; }
    };
    return sheet;
}
function createHarness(options = {}) {
    const propertiesData = { ...(options.legacy || {}) };
    let propertyReads = 0, propertyWrites = 0, propertyDeletes = 0;
    const properties = {
        getProperties() { propertyReads++; return { ...propertiesData }; },
        getProperty(key) { return Object.prototype.hasOwnProperty.call(propertiesData, key) ? propertiesData[key] : null; },
        setProperty(key, value) { propertyWrites++; throw new Error("legacy properties are read-only"); },
        deleteProperty(key) { propertyDeletes++; throw new Error("legacy properties are read-only"); },
        get data() { return propertiesData; }
    };
    const sheet = createSheet(options);
    const lockTimeouts = [];
    let lockAcquires = 0, lockReleases = 0, uuid = 0, flushes = 0;
    const lock = {
        tryLock(timeout) {
            lockTimeouts.push(timeout);
            if (options.lockFail) return false;
            lockAcquires++;
            return true;
        },
        releaseLock() { lockReleases++; }
    };
    const LockService = { getScriptLock: () => lock };
    const PropertiesService = { getScriptProperties: () => properties };
    const Utilities = { getUuid: () => "00000000-0000-4000-8000-" + String(++uuid).padStart(12, "0") };
    const SpreadsheetApp = { flush() { flushes++; } };
    const getSpreadsheet = () => ({
        getId: () => "SPREADSHEET_TEST_ID",
        getSheetByName: name => options.noSheet || name !== "AdminOperationAudit" ? null : sheet
    });
    const getCortesRootFolderId_ = () => "CORTES_ROOT_123456789";
    const Logger = { log() {} };
    const api = new Function(
        "PropertiesService", "LockService", "Utilities", "SpreadsheetApp",
        "getSpreadsheet", "getCortesRootFolderId_", "Logger",
        constants + helperSource + `
return {
    createAdminAuditError_, safeAdminAuditId_, safeAdminAuditStage_, getAdminAuditResourceSummary_,
    getAdminAuditPartialResult_, getAdminAuditOutcome_, getAdminAuditResultCode_,
    getAdminAuditSheet_, readAdminAuditBaselineState_, adminAuditRecordToRow_,
    adminAuditRowToRecord_, sameAdminAuditRecord_, findAdminAuditEventRow_,
    appendAdminAuditRecord_, updateAdminAuditRecord_, ensureAdminAuditBaseline_,
    pruneAdminAuditSheetUnderLock_, beginAdminAuditEvent_, finalizeAdminAuditEvent_,
    isSharedMutationAction_
};`
    )(PropertiesService, LockService, Utilities, SpreadsheetApp, getSpreadsheet, getCortesRootFolderId_, Logger);
    return {
        api, sheet, properties,
        get propertyReads() { return propertyReads; },
        get propertyWrites() { return propertyWrites; },
        get propertyDeletes() { return propertyDeletes; },
        get lockTimeouts() { return lockTimeouts.slice(); },
        get lockAcquires() { return lockAcquires; },
        get lockReleases() { return lockReleases; },
        get flushes() { return flushes; }
    };
}
let passed = 0;
function check(name, run) { run(); passed++; console.log("PASS " + name); }

check("El esquema usa hoja propia y reserva fila 2 para baseline", () => {
    const h = createHarness();
    assert.equal(h.api.getAdminAuditSheet_(), h.sheet);
    assert.deepEqual(h.sheet.getRange(1, 1, 1, 16).getValues()[0], headers);
    assert.equal(h.sheet.getLastRow(), 1);
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "");
});

check("El baseline importa eventos legacy y verifica read-back sin escribir ni borrar propiedades", () => {
    const legacyEvent = makeEvent("legacy-1");
    const h = createHarness({ legacy: { ["GPSpedia_ADMIN_AUDIT_V1_legacy-1"]: JSON.stringify(legacyEvent) } });
    const result = h.api.ensureAdminAuditBaseline_();
    assert.equal(result.status, "success");
    assert.equal(result.markers, 1);
    assert.equal(result.migrated, 1);
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "admin_audit_baseline_v1");
    assert.equal(h.sheet.getLastRow(), 3);
    assert.equal(h.api.findAdminAuditEventRow_(h.sheet, "legacy-1").record.eventId, "legacy-1");
    assert.equal(h.propertyReads, 1);
    assert.equal(h.propertyWrites, 0);
    assert.equal(h.propertyDeletes, 0);
});

check("El baseline rechaza filas sin marcador legacy en una siembra pendiente", () => {
    const orphan = makeEvent("orphan-event");
    const h = createHarness({ rows: [headers, baselineRow("pending")] });
    h.sheet.appendRow(h.api.adminAuditRecordToRow_(orphan));
    assert.throws(() => h.api.ensureAdminAuditBaseline_(), error => error.code === "ADMIN_AUDIT_BASELINE_INVALID");
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "pending");
    assert.equal(h.propertyReads, 1);
});

check("El baseline es idempotente y después de completarse no vuelve a leer ScriptProperties", () => {
    const legacyEvent = makeEvent("legacy-2", new Date().toISOString(), "success");
    const h = createHarness({ legacy: { ["GPSpedia_ADMIN_AUDIT_V1_legacy-2"]: JSON.stringify(legacyEvent) } });
    h.api.ensureAdminAuditBaseline_();
    const rows = h.sheet.getLastRow();
    const second = h.api.ensureAdminAuditBaseline_();
    assert.equal(second.alreadyComplete, true);
    assert.equal(h.sheet.getLastRow(), rows);
    assert.equal(h.propertyReads, 1);
    assert.equal(h.propertyWrites, 0);
    assert.equal(h.propertyDeletes, 0);
});

check("Un baseline interrumpido se reanuda desde pending sin duplicar eventos", () => {
    const legacyEvent = makeEvent("legacy-retry");
    const h = createHarness({
        legacy: { ["GPSpedia_ADMIN_AUDIT_V1_legacy-retry"]: JSON.stringify(legacyEvent) },
        batchFailBefore: 1
    });
    let baselineError = null;
    assert.throws(() => h.api.ensureAdminAuditBaseline_(), error => { baselineError = error; return true; });
    assert.equal(baselineError.code, "ADMIN_AUDIT_BASELINE_WRITE_FAILED");
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "pending");
    h.api.ensureAdminAuditBaseline_();
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "admin_audit_baseline_v1");
    assert.equal(h.sheet.getLastRow(), 3);
    assert.equal(h.propertyReads, 2);
});

check("Una escritura batch legacy ambigua se reconcilia por eventId y no duplica filas", () => {
    const legacyEvent = makeEvent("legacy-ambiguous");
    const h = createHarness({
        legacy: { ["GPSpedia_ADMIN_AUDIT_V1_legacy-ambiguous"]: JSON.stringify(legacyEvent) },
        batchFailAfter: 1
    });
    const result = h.api.ensureAdminAuditBaseline_();
    assert.equal(result.migrated, 1);
    assert.equal(h.sheet.getLastRow(), 3);
    assert.equal(h.api.findAdminAuditEventRow_(h.sheet, "legacy-ambiguous").record.outcome, "started");
});

check("El baseline solo importa campos permitidos y no copia secretos legacy al ledger", () => {
    const legacyEvent = makeEvent("legacy-sanitized");
    legacyEvent.sourceResourceId = "https://drive.google.com/file/d/SECRET_RESOURCE";
    legacyEvent.partialResult = { processed: 3, sessionToken: "SECRET_SESSION", password: "SECRET_PASSWORD", message: "PRIVATE_TEXT" };
    const h = createHarness({ legacy: { ["GPSpedia_ADMIN_AUDIT_V1_legacy-sanitized"]: JSON.stringify(legacyEvent) } });
    h.api.ensureAdminAuditBaseline_();
    const record = h.api.findAdminAuditEventRow_(h.sheet, "legacy-sanitized").record;
    assert.equal(record.sourceResourceId, "");
    assert.deepEqual(record.partialResult, { processed: 3 });
    assert.doesNotMatch(JSON.stringify(record), /SECRET_RESOURCE|SECRET_SESSION|SECRET_PASSWORD|PRIVATE_TEXT/);
});

check("El lector rechaza campos no canónicos o resúmenes con datos no permitidos", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const row = h.api.adminAuditRecordToRow_(makeEvent("tampered"));
    row[14] = JSON.stringify({ processed: 1, sessionToken: "SECRET_SESSION" });
    h.sheet.appendRow(row);
    assert.throws(() => h.api.findAdminAuditEventRow_(h.sheet, "tampered"), error => error.code === "ADMIN_AUDIT_CORRUPT_STATE");
});

check("El baseline rechaza JSON legacy corrupto y deja el marcador pending", () => {
    const h = createHarness({ legacy: { "GPSpedia_ADMIN_AUDIT_V1_bad": "{broken" } });
    assert.throws(() => h.api.ensureAdminAuditBaseline_(), error => error.code === "ADMIN_AUDIT_CORRUPT_STATE");
    assert.equal(h.api.readAdminAuditBaselineState_(h.sheet), "pending");
    assert.equal(h.propertyWrites, 0);
    assert.equal(h.propertyDeletes, 0);
});

check("La contención del baseline falla inmediatamente con tryLock(0)", () => {
    const h = createHarness({ lockFail: true });
    assert.throws(() => h.api.ensureAdminAuditBaseline_(), error => error.code === "ADMIN_AUDIT_BUSY");
    assert.deepEqual(h.lockTimeouts, [0]);
    assert.equal(h.propertyReads, 0);
    assert.equal(h.lockReleases, 0);
});

check("La hoja ausente o con encabezados incorrectos no se crea ni se altera automáticamente", () => {
    const missing = createHarness({ noSheet: true });
    assert.throws(() => missing.api.getAdminAuditSheet_(), error => error.code === "ADMIN_AUDIT_SCHEMA_UNAVAILABLE");
    const invalid = createHarness();
    invalid.sheet.rows[0][1] = "wrong";
    assert.throws(() => invalid.api.getAdminAuditSheet_(), error => error.code === "ADMIN_AUDIT_SCHEMA_INVALID");
    assert.equal(invalid.sheet.getLastRow(), 1);
});

check("El inicio escribe evento mínimo y saneado; el flujo normal no vuelve a leer propiedades legacy", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const payload = {
        fileId: "driveFile_123456789", targetFolderId: "targetFolder_123456789",
        sessionToken: "SESSION_SECRET", password: "PASSWORD_SECRET",
        imageData: "data:image/png;base64,BASE64_SECRET", imgBase64: "BASE64_SECRET",
        message: "Do not persist this payload text"
    };
    const event = h.api.beginAdminAuditEvent_("driveCommand", payload, { userId: "user-42", role: "Desarrollador" }, new Date());
    const found = h.api.findAdminAuditEventRow_(h.sheet, event.eventId);
    const record = found.record;
    assert.equal(event.action, "driveCommand");
    assert.equal(record.eventId, event.eventId);
    assert.equal(record.outcome, "started");
    assert.equal(record.finishedAt, null);
    assert.equal(record.actorId, "user-42");
    assert.equal(record.actorRole, "desarrollador");
    assert.equal(record.sourceResourceId, "driveFile_123456789");
    assert.equal(record.targetResourceId, "targetFolder_123456789");
    const raw = JSON.stringify(record);
    for (const secret of ["SESSION_SECRET", "PASSWORD_SECRET", "BASE64_SECRET", "Do not persist", "imageData", "sessionToken", "password"]) {
        assert.ok(!raw.includes(secret), secret);
    }
    assert.equal(h.propertyReads, 0);
    assert.equal(h.propertyWrites, 0);
    assert.equal(h.propertyDeletes, 0);
    assert.deepEqual(h.lockTimeouts, [0]);
    assert.equal(h.lockAcquires, h.lockReleases);
});

check("Finaliza con resultado, etapa, duración y resumen parcial permitido", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const event = h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date());
    h.api.finalizeAdminAuditEvent_(event, {
        payload: {}, response: { status: "warning", code: "PARTIAL_RESULT", processed: 8, total: 10, itemErrors: 2, successCount: 6, message: "sensitive text", details: { token: "not stored" } },
        stage: "Reorganización de imágenes", durationMs: 1250
    });
    const record = h.api.findAdminAuditEventRow_(h.sheet, event.eventId).record;
    assert.equal(record.outcome, "partial");
    assert.equal(record.resultCode, "PARTIAL_RESULT");
    assert.equal(record.stage, "Organizacion");
    assert.equal(record.durationMs, 1250);
    assert.deepEqual(record.partialResult, { processed: 8, total: 10, itemErrors: 2, successCount: 6 });
    assert.ok(record.finishedAt);
    assert.ok(!JSON.stringify(record).includes("sensitive text"));
    assert.ok(!JSON.stringify(record).includes("not stored"));
});

check("Clasifica errores y resultados parciales sin almacenar mensajes", () => {
    const h = createHarness();
    assert.equal(h.api.getAdminAuditOutcome_({ status: "error" }, null), "error");
    assert.equal(h.api.getAdminAuditOutcome_({ status: "warning" }, null), "partial");
    assert.equal(h.api.getAdminAuditOutcome_({ status: "success", failedCount: 1 }, null), "partial");
    assert.equal(h.api.getAdminAuditOutcome_({ status: "success" }, new Error("private")), "error");
    assert.equal(h.api.getAdminAuditResultCode_(null, { code: "HTTP_403", message: "private" }, "error"), "HTTP_403");
});

check("Sanitiza IDs y etapas y excluye credenciales", () => {
    const h = createHarness();
    const payload = { sessionToken: "SESSION_SECRET", password: "PASSWORD_SECRET" };
    assert.equal(h.api.safeAdminAuditId_("SESSION_SECRET", payload), "");
    assert.equal(h.api.safeAdminAuditId_("file_id-123", payload), "file_id-123");
    assert.equal(h.api.safeAdminAuditId_("https://drive.google.com/file/d/x", payload), "");
    assert.equal(h.api.safeAdminAuditStage_("Etapa\nprivada\u0000"), "Ejecucion");
    assert.equal(h.api.safeAdminAuditStage_("Reorganización de imágenes para vehículo ABC123"), "Organizacion");
});

check("Acepta actor autenticado Desarrollador o Jefe y rechaza actor inválido", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const second = h.api.beginAdminAuditEvent_("updateVehicleField", { vehicleId: 23 }, { userId: "user-43", role: "Jefe" }, new Date());
    assert.ok(second.eventId);
    assert.equal(h.api.findAdminAuditEventRow_(h.sheet, second.eventId).record.actorRole, "jefe");
    assert.throws(() => h.api.beginAdminAuditEvent_("updateVehicleField", {}, { userId: "user-44", role: "Tecnico" }, new Date()),
        error => error.code === "ADMIN_AUDIT_ACTOR_INVALID");
});

check("La retención elimina finalizados mayores a 180 días", () => {
    const old = makeEvent("old", new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(), "success");
    const recent = makeEvent("recent", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), "success");
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    h.sheet.appendRow(h.api.adminAuditRecordToRow_(old));
    h.sheet.appendRow(h.api.adminAuditRecordToRow_(recent));
    h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date());
    assert.equal(h.api.findAdminAuditEventRow_(h.sheet, "old"), null);
    assert.ok(h.api.findAdminAuditEventRow_(h.sheet, "recent"));
});

check("El límite de 300 finalizados conserva los más recientes", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    for (let i = 0; i < 301; i++) {
        const finishedAt = new Date(Date.now() - (301 - i) * 1000).toISOString();
        h.sheet.appendRow(h.api.adminAuditRecordToRow_(makeEvent("event-" + String(i).padStart(3, "0"), finishedAt, "success")));
    }
    h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date());
    assert.equal(h.sheet.rows.filter(row => row[0] === "EVENT" && row[10] !== "started").length, 300);
    assert.equal(h.api.findAdminAuditEventRow_(h.sheet, "event-000"), null);
    assert.ok(h.api.findAdminAuditEventRow_(h.sheet, "event-300"));
});

check("Los eventos STARTED no se purgan y 20 pendientes rechazan solo el registro nuevo", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    for (let i = 0; i < 20; i++) h.sheet.appendRow(h.api.adminAuditRecordToRow_(makeEvent("pending-" + i)));
    assert.throws(() => h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date()),
        error => error.code === "ADMIN_AUDIT_PENDING_REVIEW_REQUIRED");
    assert.equal(h.sheet.rows.filter(row => row[0] === "EVENT").length, 20);
});

check("El inicio de auditoría no espera si el lock ya está ocupado", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")], lockFail: true });
    assert.throws(() => h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date()),
        error => error.code === "ADMIN_AUDIT_BUSY");
    assert.deepEqual(h.lockTimeouts, [0]);
    assert.equal(h.sheet.getLastRow(), 2);
});

check("El cierre de auditoría tampoco espera y conserva el evento STARTED ante contención", () => {
    const record = makeEvent("pending-finalize");
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    h.sheet.appendRow(h.api.adminAuditRecordToRow_(record));
    h.api.finalizeAdminAuditEvent_({ eventId: record.eventId, action: record.action }, { response: { status: "success" }, durationMs: 20 });
    const completed = h.api.findAdminAuditEventRow_(h.sheet, record.eventId).record;
    assert.equal(completed.outcome, "success");
    const busy = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1"), h.api.adminAuditRecordToRow_(makeEvent("busy-finalize"))], lockFail: true });
    assert.throws(() => busy.api.finalizeAdminAuditEvent_({ eventId: "busy-finalize", action: "driveCommand" }, { response: { status: "success" } }),
        error => error.code === "ADMIN_AUDIT_BUSY");
    assert.equal(busy.api.findAdminAuditEventRow_(busy.sheet, "busy-finalize").record.outcome, "started");
    assert.deepEqual(busy.lockTimeouts, [0]);
});

check("No hay waitLock; baseline, inicio y cierre solo usan tryLock(0)", () => {
    assert.doesNotMatch(helperSource, /waitLock\(/);
    assert.match(extractFunction("ensureAdminAuditBaseline_"), /tryLock\(0\)/);
    assert.match(extractFunction("beginAdminAuditEvent_"), /tryLock\(0\)/);
    assert.match(extractFunction("finalizeAdminAuditEvent_"), /tryLock\(0\)/);
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const event = h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date());
    h.api.finalizeAdminAuditEvent_(event, { response: { status: "success" }, durationMs: 10 });
    assert.ok(h.lockTimeouts.every(value => value === 0));
    assert.equal(h.lockAcquires, h.lockReleases);
});

check("PropertiesService solo se consulta durante el baseline legacy y nunca se escribe", () => {
    const baseline = extractFunction("ensureAdminAuditBaseline_");
    assert.match(baseline, /getProperties\(\)/);
    assert.doesNotMatch(baseline, /setProperty\(|deleteProperty\(/);
    for (const name of ["beginAdminAuditEvent_", "finalizeAdminAuditEvent_", "pruneAdminAuditSheetUnderLock_"]) {
        assert.doesNotMatch(extractFunction(name), /PropertiesService|ScriptProperties/);
    }
    assert.doesNotMatch(helperSource, /\.setProperty\(|\.deleteProperty\(/);
});

check("El router trata el inicio y cierre de auditoría como best-effort", () => {
    const body = extractFunction("doPostInternal_");
    assert.match(body, /try\s*\{\s*auditEvent = beginAdminAuditEvent_\([\s\S]*?catch\s*\(auditError\)/);
    assert.match(body, /la operación continúa sin bloquearse/);
    assert.match(body, /La operación se completó, pero el cierre de auditoría quedó pendiente de revisión/);
});

check("El ping de salud no depende de auditoría ni adquiere locks", () => {
    const body = extractFunction("doPostInternal_");
    assert.match(body, /if \(action !== "ping" && isSharedMutationAction_\(action\)\)/);
    assert.doesNotMatch(body, /LockService\.getScriptLock|waitLock\(|tryLock\(/);
    assert.equal(createHarness().api.isSharedMutationAction_("ping"), false);
});

check("Rechaza la doble finalización de un mismo evento", () => {
    const h = createHarness({ rows: [headers, baselineRow("admin_audit_baseline_v1")] });
    const event = h.api.beginAdminAuditEvent_("driveCommand", {}, { userId: "user-1", role: "Desarrollador" }, new Date());
    h.api.finalizeAdminAuditEvent_(event, { response: { status: "success" }, durationMs: 50 });
    assert.throws(() => h.api.finalizeAdminAuditEvent_(event, { response: { status: "success" }, durationMs: 60 }),
        error => error.code === "ADMIN_AUDIT_EVENT_STATE_INVALID");
});

check("La lista de acciones auditadas conserva las mutaciones ADMIN sensibles", () => {
    const api = createHarness().api;
    assert.equal(api.isSharedMutationAction_("driveCommand"), true);
    assert.equal(api.isSharedMutationAction_("backupDatabase"), true);
    assert.equal(api.isSharedMutationAction_("deleteReplacedImage"), true);
    assert.equal(api.isSharedMutationAction_("ping"), false);
    assert.equal(api.isSharedMutationAction_("getAdminImageUploadStatus"), false);
});

console.log("AdminAuditTrail: " + passed + "/" + passed + " PASS");
