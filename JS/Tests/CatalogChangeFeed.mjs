import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalogSource = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const runtimeFactory = new Function(
    catalogSource + "\nreturn { createCatalogChangeFeed_, publishCatalogResetForActor_, publishCatalogChangeForActor_, resolveCanonicalCatalogChange_, buildCatalogPysSnapshot_ };"
);
const runtime = runtimeFactory();

function createSheet(headers) {
    const rows = [headers.slice()];
    return {
        _rows: rows,
        getLastRow: () => rows.length,
        getLastColumn: () => headers.length,
        getRange(row, column, rowCount, columnCount) {
            return {
                getValues: () => rows.slice(row - 1, row - 1 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount)),
                getDisplayValues: () => rows.slice(row - 1, row - 1 + rowCount)
                    .map(values => values.slice(column - 1, column - 1 + columnCount).map(value => String(value ?? ""))),
                setValues(values) {
                    values.forEach((value, index) => { rows[row - 1 + index] = value.slice(); });
                }
            };
        },
        appendRow(row) { rows.push(row.slice()); },
        deleteRows(start, count) { rows.splice(start - 1, count); }
    };
}

function createHarness(maxEvents = 100) {
    const stateSheet = createSheet(runtime.CATALOG_FEED_STATE_HEADERS_);
    const eventsSheet = createSheet(runtime.CATALOG_FEED_EVENT_HEADERS_);
    const spreadsheet = { getSheetByName: name => ({
        CatalogChangeState: stateSheet, CatalogChangeEvents: eventsSheet
    })[name] || null };
    let busy = false;
    let held = false;
    const lock = {
        tryLock: () => {
            if (busy || held) return false;
            held = true;
            return true;
        },
        releaseLock: () => { held = false; }
    };
    const feed = runtime.createCatalogChangeFeed_({
        spreadsheet,
        lockService: { getScriptLock: () => lock },
        now: () => 1700000000000,
        maxEvents
    });
    return {
        feed, stateSheet, eventsSheet, spreadsheet,
        setBusy: value => { busy = Boolean(value); },
        isHeld: () => held
    };
}

let passed = 0;
function test(name, callback) {
    callback();
    passed++;
    console.log("PASS " + name);
}

const developer = { role: "desarrollador" };
const jefe = { role: "jefe" };
const basePayload = {
    userId: "USR-1",
    sessionToken: "session-token-that-is-not-persisted",
    service: "WRITE",
    operation: "addOrUpdateCut",
    requestId: "catalog-request-0001"
};

test("publica un reset con revisión monotónica y cursor", () => {
    const h = createHarness();
    const result = runtime.publishCatalogResetForActor_(basePayload, jefe, h.feed);
    const page = h.feed.getChanges({ cursor: 0, limit: 10 });
    assert.equal(result.revision, 1);
    assert.equal(page.status, "success");
    assert.equal(page.resetRequired, true);
    assert.equal(page.changes.length, 1);
    assert.equal(page.changes[0].operation, "reset");
    assert.equal(page.nextCursor, 1);
    assert.equal(page.hasMore, false);
});

test("publica un delta reconstruido por CATALOG, no por el navegador", () => {
    const h = createHarness();
    const payload = {
        ...basePayload, service: "FEEDBACK", operation: "recordLike",
        requestId: "catalog-delta-0001",
        change: { collection: "cortes", recordId: "42", operation: "upsert" }
    };
    const result = runtime.publishCatalogChangeForActor_(payload, jefe, h.feed, change => ({
        collection: "cortes", recordId: change.recordId, operation: "upsert",
        snapshot: { id: change.recordId, utilCorte1: 7 }
    }));
    const event = h.feed.getChanges({ cursor: 0, limit: 10 }).changes[0];
    assert.equal(result.revision, 1);
    assert.equal(event.collection, "cortes");
    assert.equal(event.snapshot.utilCorte1, 7);
    assert.equal(event.resetRequired, false);
});

test("rechaza snapshots enviados desde el navegador", () => {
    const h = createHarness();
    const payload = {
        ...basePayload, service: "FEEDBACK", operation: "recordLike",
        requestId: "catalog-delta-0002",
        change: { collection: "cortes", recordId: "42", operation: "upsert", snapshot: { id: "42", fake: true } }
    };
    assert.throws(() => runtime.publishCatalogChangeForActor_(payload, jefe, h.feed, () => ({})), /snapshots/);
    assert.equal(h.feed.getChanges({ cursor: 0, limit: 10 }).currentRevision, 0);
});

test("el requestId hace idempotente una publicación repetida", () => {
    const h = createHarness();
    const payload = { ...basePayload, requestId: "catalog-request-0002" };
    const first = runtime.publishCatalogResetForActor_(payload, jefe, h.feed);
    const second = runtime.publishCatalogResetForActor_(payload, jefe, h.feed);
    assert.equal(first.revision, second.revision);
    assert.equal(second.duplicate, true);
    assert.equal(h.feed.getChanges({ cursor: 0, limit: 10 }).changes.length, 1);
});

test("rechaza servicios, operaciones y colecciones no autorizadas", () => {
    const h = createHarness();
    assert.throws(() => runtime.publishCatalogResetForActor_({ ...basePayload, service: "OTHER" }, jefe, h.feed));
    assert.throws(() => runtime.publishCatalogResetForActor_({ ...basePayload, operation: "deleteEverything" }, jefe, h.feed));
    assert.throws(() => runtime.publishCatalogChangeForActor_({
        ...basePayload, service: "FEEDBACK", operation: "recordLike", requestId: "catalog-invalid-0001",
        change: { collection: "logos", recordId: "42", operation: "upsert" }
    }, jefe, h.feed, () => ({})));
});

test("requiere rol Desarrollador para operaciones ADMIN", () => {
    const h = createHarness();
    const payload = { ...basePayload, service: "ADMIN", operation: "addLogo", requestId: "catalog-admin-0001" };
    assert.throws(() => runtime.publishCatalogResetForActor_(payload, jefe, h.feed), /Desarrollador/);
    const result = runtime.publishCatalogResetForActor_(payload, developer, h.feed);
    assert.equal(result.status, "success");
});

test("requiere Desarrollador para congelar IDs y editar PyS/tutoriales", () => {
    const h = createHarness();
    assert.throws(() => runtime.publishCatalogResetForActor_({
        ...basePayload, service: "WRITE", operation: "freezeCortesIds", requestId: "catalog-freeze-0001"
    }, jefe, h.feed), /Desarrollador/);
    assert.throws(() => runtime.publishCatalogChangeForActor_({
        ...basePayload, service: "FEEDBACK", operation: "updatePysItem", requestId: "catalog-pys-edit-0001",
        change: { collection: "pys", recordId: "isue-1", operation: "upsert" }
    }, jefe, h.feed, () => ({})), /Desarrollador/);
});

test("rechaza sesión incompleta y requestId malformado", () => {
    const h = createHarness();
    assert.throws(() => runtime.publishCatalogResetForActor_({
        ...basePayload, userId: "", requestId: "catalog-invalid-0002"
    }, jefe, h.feed));
    assert.throws(() => runtime.publishCatalogResetForActor_({
        ...basePayload, requestId: "x"
    }, jefe, h.feed));
});

test("página el feed sin saltar revisiones", () => {
    const h = createHarness();
    for (let i = 1; i <= 3; i++) runtime.publishCatalogResetForActor_({
        ...basePayload, requestId: "catalog-page-" + String(i).padStart(4, "0")
    }, jefe, h.feed);
    const first = h.feed.getChanges({ cursor: 0, limit: 2 });
    const second = h.feed.getChanges({ cursor: first.nextCursor, limit: 2 });
    assert.deepEqual(first.changes.map(event => event.revision), [1, 2]);
    assert.equal(first.hasMore, true);
    assert.deepEqual(second.changes.map(event => event.revision), [3]);
    assert.equal(second.hasMore, false);
});

test("un cursor futuro solicita reconstrucción de snapshot", () => {
    const h = createHarness();
    runtime.publishCatalogResetForActor_(basePayload, jefe, h.feed);
    const page = h.feed.getChanges({ cursor: 99, limit: 10 });
    assert.equal(page.resetRequired, true);
    assert.deepEqual(page.changes, []);
    assert.equal(page.nextCursor, 1);
});

test("la retención acotada detecta cursores obsoletos", () => {
    const h = createHarness(2);
    for (let i = 1; i <= 3; i++) runtime.publishCatalogResetForActor_({
        ...basePayload, requestId: "catalog-retain-" + String(i).padStart(4, "0")
    }, jefe, h.feed);
    const page = h.feed.getChanges({ cursor: 0, limit: 50 });
    assert.equal(page.resetRequired, true);
    assert.equal(page.minRevision, 2);
    assert.equal(page.nextCursor, 3);
    assert.equal(h.eventsSheet.getLastRow() - 1, 2);
});

test("un evento ausente o corrupto solicita reconstrucción", () => {
    const missing = createHarness();
    runtime.publishCatalogResetForActor_(basePayload, jefe, missing.feed);
    missing.eventsSheet.deleteRows(2, 1);
    assert.equal(missing.feed.getChanges({ cursor: 0, limit: 10 }).resetRequired, true);

    const corrupt = createHarness();
    runtime.publishCatalogResetForActor_(basePayload, jefe, corrupt.feed);
    corrupt.eventsSheet.getRange(2, 5, 1, 1).setValues([["{invalid"]]);
    assert.equal(corrupt.feed.getChanges({ cursor: 0, limit: 10 }).resetRequired, true);
});

test("un lock ocupado falla cerrado sin escribir eventos", () => {
    const h = createHarness();
    h.setBusy(true);
    assert.throws(() => runtime.publishCatalogResetForActor_(basePayload, jefe, h.feed), /ocupado/);
    assert.equal(h.eventsSheet.getLastRow(), 1);
    assert.equal(h.isHeld(), false);
});

test("CATALOG reconstruye el snapshot PyS desde su hoja canónica", () => {
    const headers = ["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion", "Prevenir", "Imagen", "Video", "Colaborador", "modelos_asociados"];
    const row = ["isue-12", "Falla", "Descripción", true, "Solución", "Prevención", "FILEID1234567890", "https://youtu.be/abc123", "Técnico", '["L200","Hilux"]'];
    const sheet = {
        getLastColumn: () => 10,
        getLastRow: () => 2,
        getRange: (r, c, nr, nc) => ({
            getDisplayValues: () => r === 1 ? [headers] : [row],
            getValues: () => r === 1 ? [headers] : [row]
        })
    };
    const spreadsheet = { getSheetByName: name => name === "pys" ? sheet : null };
    const buildRuntime = new Function("SpreadsheetApp", catalogSource +
        "\nreturn { buildCatalogPysSnapshot_, resolveCanonicalCatalogChange_ };");
    const canonical = buildRuntime({ openById: () => spreadsheet });
    const snapshot = canonical.buildCatalogPysSnapshot_("isue-12");
    assert.equal(snapshot.id_problem, "isue-12");
    assert.equal(snapshot.Imagen, "https://drive.google.com/file/d/FILEID1234567890/view");
    assert.deepEqual(snapshot.modelosAsociados, ["L200", "Hilux"]);
    const resolved = canonical.resolveCanonicalCatalogChange_({ collection: "pys", recordId: "isue-12", operation: "upsert" });
    assert.equal(resolved.snapshot.id_problem, "isue-12");
});

test("el evento no persiste usuario ni token de sesión", () => {
    const h = createHarness();
    runtime.publishCatalogResetForActor_(basePayload, jefe, h.feed);
    const headers = h.eventsSheet.getRange(1, 1, 1, 10).getDisplayValues()[0];
    const eventRow = h.eventsSheet.getRange(2, 1, 1, 10).getValues()[0];
    assert.equal(headers.includes("userId"), false);
    assert.equal(headers.includes("sessionToken"), false);
    assert.equal(JSON.stringify(eventRow).includes("session-token-that-is-not-persisted"), false);
    assert.equal(eventRow[6], "WRITE");
    assert.equal(eventRow[8], basePayload.requestId);
});

test("requiere ambas hojas y sus encabezados versionados", () => {
    assert.throws(() => runtime.createCatalogChangeFeed_({
        spreadsheet: { getSheetByName: () => null },
        lockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
    }), /Falta la hoja requerida/);
    assert.throws(() => runtime.createCatalogChangeFeed_({
        spreadsheet: { getSheetByName: name => createSheet(name === "CatalogChangeState" ? ["incorrecto"] : runtime.CATALOG_FEED_EVENT_HEADERS_) },
        lockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
    }), /no coincide con el contrato/);
});

test("CATALOG no usa ScriptProperties para persistir el feed", () => {
    assert.equal(catalogSource.includes("PropertiesService.getScriptProperties"), false);
    assert.doesNotMatch(catalogSource, /GPSpedia_CATALOG_CHANGE_(?:REVISION|EVENT_)/);
});

test("valida cursor y límite", () => {
    const h = createHarness();
    assert.throws(() => h.feed.getChanges({ cursor: -1, limit: 10 }));
    assert.throws(() => h.feed.getChanges({ cursor: 0, limit: 0 }));
    assert.throws(() => h.feed.getChanges({ cursor: 0, limit: 51 }));
});

console.log("CatalogChangeFeed: " + passed + "/18 PASS");
assert.equal(passed, 18);
