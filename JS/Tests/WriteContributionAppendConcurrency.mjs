import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const ledgerStart = write.indexOf("const WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_");
const ledgerEnd = write.indexOf("\nfunction getImageUploadReferences_", ledgerStart);
assert.ok(ledgerStart >= 0 && ledgerEnd > ledgerStart, "No se encontró implementación del ledger append-only");
const ledgerCode = write.slice(ledgerStart, ledgerEnd);

const projectionStart = catalog.indexOf("function projectVehicleContributionEvents_(");
const projectionEnd = catalog.indexOf("\nfunction handleGetCatalogData(", projectionStart);
assert.ok(projectionStart >= 0 && projectionEnd > projectionStart, "No se encontró proyección CATALOG");
const projectionCode = catalog.slice(projectionStart, projectionEnd);

let uuid = 0;
const Utilities = { getUuid: () => "00000000-0000-4000-8000-" + String(++uuid).padStart(12, "0") };
const SpreadsheetApp = { flush() {} };
const runtime = new Function("getSpreadsheet", "Utilities", "SpreadsheetApp",
    ledgerCode + "\nreturn { append: appendVehicleContributionEvent_, candidate: getVehicleContributionCandidateStatus_ };"
)(() => { throw new Error("Se esperaba spreadsheet explícito"); }, Utilities, SpreadsheetApp);

const headers = ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
    "actorId", "actorName", "createdAt", "status", "supersedesEventId"];

function createSheet() {
    const sheet = {
        rows: [headers.slice()],
        onAppend: null,
        getLastRow() { return this.rows.length; },
        getLastColumn() { return headers.length; },
        getRange(row, column, rowCount, columnCount) {
            const self = this;
            const range = {
                getDisplayValues() {
                    return [self.rows[row - 1].slice(column - 1, column - 1 + columnCount).map(String)];
                },
                getValues() {
                    return self.rows.slice(row - 1, row - 1 + rowCount)
                        .map(values => values.slice(column - 1, column - 1 + columnCount));
                },
                createTextFinder(needle) {
                    return {
                        matchCase() { return this; },
                        matchEntireCell() { return this; },
                        findAll() {
                            const matches = [];
                            self.rows.slice(row - 1, row - 1 + rowCount).forEach((values, offset) => {
                                if (String(values[column - 1] || "") === String(needle)) {
                                    matches.push({ getRow: () => row + offset });
                                }
                            });
                            return matches;
                        }
                    };
                }
            };
            return range;
        },
        appendRow(values) {
            if (typeof this.onAppend === "function") this.onAppend(values);
            this.rows.push(values.slice());
        }
    };
    return sheet;
}

function makeRuntime(sheet) {
    const spreadsheet = { getSheetByName: name => name === "AportesVehiculo" ? sheet : null };
    const append = runtime.append;
    return Object.assign(options => append({ ...options, spreadsheet }), { candidate: (snapshot, eventId, kind) => runtime.candidate(spreadsheet, snapshot, eventId, kind) });
}
function eventRows(sheet) {
    return sheet.rows.slice(1).map((row, index) => ({
        eventId: row[0], opId: row[1], vehicleId: row[2], operationHash: row[3],
        kind: row[4], payload: JSON.parse(row[5]), actorId: row[6], actorName: row[7],
        createdAt: row[8], status: row[9], rowIndex: index + 2
    }));
}
function project(sheet, vehicles) {
    const projectEvents = new Function("normalizeAndValidateImageId",
        projectionCode + "\nreturn projectVehicleContributionEvents_;")(value => value);
    return projectEvents(vehicles, eventRows(sheet));
}
function cut(vehicleId, opId, tipo, hash) {
    return {
        vehicleId, opId, kind: "cut",
        payload: { tipo, ubicacion: "Bajo tablero", color: "Rojo", configRelay: "NC", image: "", activaTestigo: false },
        operationHash: hash.repeat(64), actorId: "USR-" + vehicleId, actorName: "Técnico"
    };
}

{
    const sheet = createSheet(), append = makeRuntime(sheet);
    let nestedResult, interleaved = false;
    const second = cut("202", "OP-B", "Bomba", "b");
    sheet.onAppend = () => {
        if (interleaved) return;
        interleaved = true;
        nestedResult = append(second);
    };
    const firstResult = append(cut("101", "OP-A", "Ignición", "a"));
    assert.equal(firstResult.status, "accepted");
    assert.equal(nestedResult.status, "accepted");
    assert.equal(sheet.rows.length, 3, "Los aportes de vehículos diferentes deben conservar ambas filas");
    const projected = project(sheet, [{ id: "101" }, { id: "202" }]);
    assert.equal(projected[0].tipoCorte1, "Ignición");
    assert.equal(projected[1].tipoCorte1, "Bomba");
}

{
    const sheet = createSheet(), append = makeRuntime(sheet);
    let nestedResult, interleaved = false;
    sheet.onAppend = () => {
        if (interleaved) return;
        interleaved = true;
        nestedResult = append(cut("101", "OP-SLOT-B", "Bomba", "b"));
    };
    const firstResult = append(cut("101", "OP-SLOT-A", "Ignición", "a"));
    assert.equal(firstResult.status, "accepted");
    assert.equal(nestedResult.status, "accepted");
    const projected = project(sheet, [{ id: "101" }])[0];
    assert.equal(projected.tipoCorte1, "Bomba", "El orden físico append define una proyección determinista");
    assert.equal(projected.tipoCorte2, "Ignición");
}

{
    const sheet = createSheet(), append = makeRuntime(sheet);
    let nestedResult, interleaved = false;
    const same = cut("101", "OP-SAME-RACE", "Bomba", "c");
    sheet.onAppend = () => {
        if (interleaved) return;
        interleaved = true;
        nestedResult = append(same);
    };
    const firstResult = append(same);
    assert.equal(nestedResult.duplicate, false);
    assert.equal(firstResult.duplicate, true);
    assert.equal(firstResult.eventId, nestedResult.eventId, "Ambas solicitudes deben devolver el evento canónico");
    assert.equal(sheet.rows.length, 3, "El ledger puede contener duplicados físicos; la proyección debe deduplicar lógicamente");
    const projected = project(sheet, [{ id: "101" }])[0];
    assert.equal(projected.tipoCorte1, "Bomba");
    assert.equal(projected.tipoCorte2 || "", "", "El mismo opId no debe consumir dos slots");
}

{
    const sheet = createSheet(), append = makeRuntime(sheet);
    let nestedResult, interleaved = false;
    const first = cut("101", "OP-CONFLICT-RACE", "Bomba", "d");
    const second = cut("101", "OP-CONFLICT-RACE", "Ignición", "e");
    sheet.onAppend = () => {
        if (interleaved) return;
        interleaved = true;
        nestedResult = append(second);
    };
    let outerConflict = null;
    try { append(first); } catch (error) { outerConflict = error; }
    assert.equal(outerConflict && outerConflict.code, "CONTRIBUTION_OP_ID_CONFLICT");
    assert.equal(nestedResult.status, "accepted");
    assert.equal(sheet.rows.length, 3, "No se elimina ninguno de los aportes en conflicto");
    const projected = project(sheet, [{ id: "101" }])[0];
    assert.equal(projected.tipoCorte1 || "", "", "Un opId conflictivo no debe proyectar un valor arbitrario");
    assert.equal(projected.contributionCandidates.length, 2, "Ambos contenidos deben permanecer visibles como candidatos de conflicto");
    assert.equal(projected.contributionConflictCount, 2);
}

{
    const sheet = createSheet(), append = makeRuntime(sheet);
    const first = append({
        vehicleId: "101", opId: "OP-OPEN-1", kind: "opening",
        payload: { text: "IGN", image: "" }, operationHash: "1".repeat(64)
    });
    const second = append({
        vehicleId: "101", opId: "OP-OPEN-2", kind: "opening",
        payload: { text: "ACC", image: "" }, operationHash: "2".repeat(64)
    });
    const snapshot = { vehicle: { id: "101", apertura: "", imgApertura: "" }, rowValues: [] };
    assert.equal(append.candidate(snapshot, first.eventId, "opening"), false);
    assert.equal(append.candidate(snapshot, second.eventId, "opening"), true,
        "La segunda apertura debe quedar como candidata sin sobrescribir la primera");
}

{
    const sheet = createSheet(), append = makeRuntime(sheet), events = [];
    for (let index = 0; index < 4; index++) {
        events.push(append({
            vehicleId: "101", opId: "OP-FEED-" + index, kind: "feed",
            payload: { text: "12V-" + index, image: "" }, operationHash: String(index + 3).repeat(64)
        }));
    }
    const snapshot = { vehicle: { id: "101", cableAlimen: "", imgCableAlimen: "", cableAlimen2: "", imgCableAlimen2: "", cableAlimen3: "", imgCableAlimen3: "" }, rowValues: [] };
    assert.equal(append.candidate(snapshot, events[0].eventId, "feed"), false);
    assert.equal(append.candidate(snapshot, events[1].eventId, "feed"), false);
    assert.equal(append.candidate(snapshot, events[2].eventId, "feed"), false);
    assert.equal(append.candidate(snapshot, events[3].eventId, "feed"), true,
        "La cuarta alimentación debe quedar como candidata cuando los tres slots están ocupados");
}


{
    const sheet = createSheet(), append = makeRuntime(sheet);
    let nestedResult, interleaved = false;
    const first = cut("101", "OP-VIN-RACE-A", "Ignición", "a");
    const second = cut("202", "OP-VIN-RACE-B", "Bomba", "b");
    first.payload.vinPrefix = "SAMEVIN";
    second.payload.vinPrefix = "SAMEVIN";
    sheet.onAppend = () => {
        if (interleaved) return;
        interleaved = true;
        nestedResult = append(second);
    };
    const firstResult = append(first);
    assert.equal(firstResult.status, "accepted");
    assert.equal(nestedResult.status, "accepted");
    const projected = project(sheet, [{ id: "101", vin: "" }, { id: "202", vin: "" }]);
    assert.equal(projected[0].tipoCorte1 || "", "");
    assert.equal(projected[1].tipoCorte1 || "", "");
    assert.equal(projected[0].contributionCandidates[0].reason, "vin_conflict");
    assert.equal(projected[1].contributionCandidates[0].reason, "vin_conflict");
}
console.log("WriteContributionAppendConcurrency: 7/7 PASS — intercalado, idempotencia, conflictos, VIN concurrente y capacidad");
