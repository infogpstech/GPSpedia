import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extractFunction(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.notEqual(start, -1, "No se encontró " + name);
    const open = source.indexOf("{", start);
    let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
    for (let i = open; i < source.length; i++) {
        const ch = source[i], next = source[i + 1];
        if (lineComment) { if (ch === "\n") lineComment = false; continue; }
        if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
        if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = ""; continue; }
        if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
        if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("Bloque incompleto: " + name);
}
const invalidImageIdsFound = [];
const normalizeImage = new Function("invalidImageIdsFound",
    extractFunction(catalog, "normalizeAndValidateImageId") + "; return normalizeAndValidateImageId;"
)(invalidImageIdsFound);
const project = new Function("normalizeAndValidateImageId",
    extractFunction(catalog, "projectVehicleContributionEvents_") + "; return projectVehicleContributionEvents_;"
)(normalizeImage);

const blankVehicle = id => ({
    id, tipoCorte1: null, ubicacionCorte1: null, imgCorte1: null, utilCorte1: null,
    tipoCorte2: null, ubicacionCorte2: null, imgCorte2: null, utilCorte2: null,
    tipoCorte3: null, ubicacionCorte3: null, imgCorte3: null, utilCorte3: null,
    apertura: null, imgApertura: null,
    cableAlimen: null, imgCableAlimen: null, cableAlimen2: null, imgCableAlimen2: null,
    cableAlimen3: null, imgCableAlimen3: null
});
const event = (opId, vehicleId, kind, payload, rowIndex, hashChar = "a", extra = {}) => ({
    eventId: "EV-" + opId, opId, vehicleId, kind, payload, rowIndex,
    operationHash: hashChar.repeat(64), actorName: "Técnico " + opId, status: "accepted", ...extra
});
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("dos vehículos distintos reciben aportes sin interferencia", () => {
    const a = blankVehicle("101"), b = blankVehicle("202");
    const result = project([a, b], [
        event("OP-A", "101", "cut", { tipo: "Ignición", ubicacion: "Arnés A" }, 2),
        event("OP-B", "202", "cut", { tipo: "Bomba", ubicacion: "Arnés B" }, 3, "b")
    ]);
    assert.equal(result[0].tipoCorte1, "Ignición");
    assert.equal(result[1].tipoCorte1, "Bomba");
    assert.equal(result[0].contributionSources.corte1.opId, "OP-A");
    assert.equal(result[1].contributionSources.corte1.opId, "OP-B");
});

test("dos aportes simultáneos del mismo vehículo ocupan espacios distintos por orden durable", () => {
    const result = project([blankVehicle("101")], [
        event("OP-B", "101", "cut", { tipo: "Segundo" }, 4, "b"),
        event("OP-A", "101", "cut", { tipo: "Primero" }, 3)
    ])[0];
    assert.equal(result.tipoCorte1, "Primero");
    assert.equal(result.tipoCorte2, "Segundo");
});

test("los espacios heredados ocupados se preservan y el siguiente aporte usa el primer espacio libre", () => {
    const vehicle = Object.assign(blankVehicle("101"), { tipoCorte1: "Existente", ubicacionCorte1: "Original" });
    const result = project([vehicle], [event("OP-A", "101", "cut", { tipo: "Nuevo" }, 2)])[0];
    assert.equal(result.tipoCorte1, "Existente");
    assert.equal(result.tipoCorte2, "Nuevo");
});

test("capacidad de cortes llena conserva el aporte como candidato sin sobrescribir", () => {
    const vehicle = Object.assign(blankVehicle("101"), {
        tipoCorte1: "A", tipoCorte2: "B", tipoCorte3: "C"
    });
    const result = project([vehicle], [event("OP-OVER", "101", "cut", { tipo: "D", image: "https://drive.google.com/file/d/12345678901234567890123456789012/view" }, 2)])[0];
    assert.deepEqual([result.tipoCorte1, result.tipoCorte2, result.tipoCorte3], ["A", "B", "C"]);
    assert.equal(result.contributionCandidates.length, 1);
    assert.equal(result.contributionCandidates[0].reason, "cut_capacity_full");
});

test("apertura y alimentación se proyectan en el primer espacio disponible", () => {
    const result = project([blankVehicle("101")], [
        event("OP-OPEN", "101", "opening", { text: "Apertura", image: "https://drive.google.com/file/d/12345678901234567890123456789012/view" }, 2),
        event("OP-FEED", "101", "feed", { text: "Alimentación principal" }, 3, "b")
    ])[0];
    assert.equal(result.apertura, "Apertura");
    assert.equal(result.cableAlimen, "Alimentación principal");
    assert.equal(result.contributionSources.apertura.opId, "OP-OPEN");
    assert.equal(result.contributionSources.feed1.opId, "OP-FEED");
});

test("apertura ya ocupada no se sobrescribe y queda como candidata", () => {
    const vehicle = Object.assign(blankVehicle("101"), { apertura: "Apertura original" });
    const result = project([vehicle], [event("OP-OPEN", "101", "opening", { text: "Apertura nueva" }, 2)])[0];
    assert.equal(result.apertura, "Apertura original");
    assert.equal(result.contributionCandidates[0].reason, "opening_already_filled");
});

test("alimentaciones llenas preservan el aporte excedente como candidato", () => {
    const vehicle = Object.assign(blankVehicle("101"), {
        cableAlimen: "A", cableAlimen2: "B", cableAlimen3: "C"
    });
    const result = project([vehicle], [event("OP-FEED", "101", "feed", { text: "D" }, 2)])[0];
    assert.deepEqual([result.cableAlimen, result.cableAlimen2, result.cableAlimen3], ["A", "B", "C"]);
    assert.equal(result.contributionCandidates[0].reason, "feed_capacity_full");
});

test("reintentos físicos con el mismo opId y hash se proyectan una sola vez", () => {
    const result = project([blankVehicle("101")], [
        event("OP-SAME", "101", "cut", { tipo: "Ignición" }, 2),
        event("OP-SAME", "101", "cut", { tipo: "Ignición" }, 3)
    ])[0];
    assert.equal(result.tipoCorte1, "Ignición");
    assert.equal(result.tipoCorte2, null);
});

test("mismo opId con hashes diferentes se pone en conflicto y no se proyecta", () => {
    const result = project([blankVehicle("101")], [
        event("OP-CONFLICT", "101", "cut", { tipo: "Ignición" }, 2),
        event("OP-CONFLICT", "101", "cut", { tipo: "Bomba" }, 3, "b")
    ])[0];
    assert.equal(result.tipoCorte1, null);
    assert.equal(result.contributionConflictCount, 2);
    assert.equal(result.contributionCandidates.length, 2);
    assert.ok(result.contributionCandidates.every(item => item.reason === "opId_conflict"));
});

test("eventos en revisión no se aplican y se conservan como candidatos", () => {
    const result = project([blankVehicle("101")], [
        event("OP-REVIEW", "101", "feed", { text: "Pendiente" }, 2, "a", { status: "review" })
    ])[0];
    assert.equal(result.cableAlimen, null);
    assert.equal(result.contributionCandidates[0].reason, "requires_review");
});

test("aporte de datos del vehículo completa campos vacíos sin reemplazar datos existentes", () => {
    const vehicle = Object.assign(blankVehicle("101"), { marca: "Toyota", modelo: null });
    const result = project([vehicle], [
        event("OP-MODEL", "101", "vehicle", { marca: "Nissan", modelo: "Frontier", anoDesde: "2024" }, 2)
    ])[0];
    assert.equal(result.marca, "Toyota");
    assert.equal(result.modelo, "Frontier");
    assert.equal(result.anoDesde, "2024");
    assert.equal(result.contributionSources.modelo.opId, "OP-MODEL");
});

test("proyección no muta la fila original del catálogo", () => {
    const vehicle = blankVehicle("101");
    project([vehicle], [event("OP-COPY", "101", "cut", { tipo: "Ignición" }, 2)]);
    assert.equal(vehicle.tipoCorte1, null);
});

test("evento inválido cancela la proyección completa", () => {
    assert.throws(() => project([blankVehicle("101")], [
        { opId: "invalid", vehicleId: "101", operationHash: "bad", kind: "cut", payload: {}, rowIndex: 2 }
    ]), /ledger contiene un evento de aporte inválido/);
});


function buildMigrationRuntime(initialHeaders = null) {
    const headers = initialHeaders ? initialHeaders.slice() : [];
    let rowCount = initialHeaders ? 1 : 0;
    let frozenRows = 0;
    let flushes = 0;
    const sheet = {
        getLastRow: () => rowCount,
        getLastColumn: () => headers.length,
        getRange(row, column, rows, columns) {
            return {
                setValues(values) {
                    values[0].forEach((value, index) => { headers[column - 1 + index] = value; });
                    rowCount = Math.max(rowCount, row);
                    return this;
                },
                getDisplayValues() {
                    return [headers.slice(column - 1, column - 1 + columns)];
                },
                setFontWeight() { return this; },
                setBackground() { return this; }
            };
        },
        setFrozenRows(value) { frozenRows = value; }
    };
    let exists = Boolean(initialHeaders);
    const spreadsheet = {
        getSheetByName(name) { assert.equal(name, "AportesVehiculo"); return exists ? sheet : null; },
        insertSheet(name) { assert.equal(name, "AportesVehiculo"); exists = true; return sheet; }
    };
    const lockWrapper = callback => callback();
    const migration = new Function(
        "withReplacedImagesSchemaLock_", "getSpreadsheet", "SpreadsheetApp",
        "ADMIN_VEHICLE_CONTRIBUTIONS_SHEET_NAME_", "ADMIN_VEHICLE_CONTRIBUTIONS_HEADERS_",
        extractFunction(admin, "handleMigrateVehicleContributionsSchema") + ";return handleMigrateVehicleContributionsSchema;"
    )(lockWrapper, () => spreadsheet, { flush() { flushes++; } }, "AportesVehiculo", [
        "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"
    ]);
    return { migration, headers, sheet, state: () => ({ rowCount, frozenRows, flushes }) };
}

test("la migración explícita crea el esquema versionado AportesVehiculo", () => {
    const runtime = buildMigrationRuntime();
    const result = runtime.migration({}, () => {});
    assert.equal(result.status, "success");
    assert.equal(result.created, true);
    assert.equal(result.rowCount, 0);
    assert.equal(runtime.state().frozenRows, 1);
    assert.deepEqual(runtime.headers, [
        "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"
    ]);
});

test("la migración de AportesVehiculo es idempotente y no recrea la hoja", () => {
    const headers = [
        "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"
    ];
    const runtime = buildMigrationRuntime(headers);
    const result = runtime.migration({}, () => {});
    assert.equal(result.status, "success");
    assert.equal(result.created, false);
    assert.deepEqual(runtime.headers, headers);
});

test("la migración rechaza encabezados incompatibles sin sobrescribirlos", () => {
    const headers = ["eventId", "opId", "vehiculo_incorrecto"];
    const runtime = buildMigrationRuntime(headers);
    assert.throws(() => runtime.migration({}, () => {}), /encabezados no coinciden/);
    assert.deepEqual(runtime.headers, headers);
});

test("ADMIN expone la migración solo como acción explícita de esquema", () => {
    assert.match(admin, /"migrateVehicleContributionsSchema"/);
    assert.match(admin, /case 'migrateVehicleContributionsSchema':[\\s\\S]{0,160}handleMigrateVehicleContributionsSchema/);
    assert.match(admin, /function handleMigrateVehicleContributionsSchema\(/);
});

console.log(passed + "/" + passed + " PASS");
