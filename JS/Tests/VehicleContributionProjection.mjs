import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../Services/catalog.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
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

const reader = new Function("VEHICLE_CONTRIBUTIONS_SHEET_NAME_", "VEHICLE_CONTRIBUTIONS_HEADERS_", "getSpreadsheet",
    extractFunction(catalog, "readVehicleContributionEvents_") + "; return readVehicleContributionEvents_;"
)("AportesVehiculo", ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
    "actorId", "actorName", "createdAt", "status", "supersedesEventId"], () => null);
function ledgerSheet(rows) {
    const headers = ["eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"];
    return {
        getLastRow: () => rows.length + 1,
        getLastColumn: () => headers.length,
        getRange(row, col, count, width) {
            if (row === 1) return { getDisplayValues: () => [headers.slice(col - 1, col - 1 + width)] };
            return { getValues: () => rows.slice(row - 2, row - 2 + count).map(line => line.slice(col - 1, col - 1 + width)) };
        }
    };
}
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

test("el lector acepta evento VIN compuesto WRITE autenticado",()=>{
 const row=["EV-WRITE-VIN-1","OP-WRITE-VIN-1234567890","301","c".repeat(64),"vehicle_update",
  JSON.stringify({fieldName:"vin_registration",expectedCurrentValue:{versionesAplicables:"Base",vin:[]},value:{versionesAplicables:"Base / Sport",vin:["ABC"]}}),
  "USR-301","Técnico","2026-11-20T12:00:00.000Z","accepted",""];
 assert.equal(reader({getSheetByName:()=>ledgerSheet([row])})[0].payload.fieldName,"vin_registration");
 const forged=row.slice();forged[6]="";assert.throws(()=>reader({getSheetByName:()=>ledgerSheet([forged])}),/identidad, hash, tipo, fecha o estado inválido/);
});
test("el proyector aplica eventos OP-YEAR solo desde el actor interno de FEEDBACK", () => {
    const vehicle = Object.assign(blankVehicle("101"), { anoDesde: 2018, anoHasta: 2020 });
    const update = event("OP-YEAR-YSA-12345678901234567890123456789012-anoDesde", "101", "vehicle_update",
        { fieldName: "anoDesde", value: 2017, expectedCurrentValue: 2018 }, 2, "a",
        { actorId: "SYSTEM:FEEDBACK_YEAR" });
    const result = project([vehicle], [update])[0];
    assert.equal(result.anoDesde, 2017);
    assert.equal(result.anoHasta, 2020);
    assert.equal(result.contributionSources.anoDesde.eventId, update.eventId);
    const forged = { ...update, opId: "OP-YEAR-FORGED", actorId: "USR-1" };
    assert.throws(() => project([vehicle], [forged]), /evento de aporte inválido/);
});

test("el lector admite vehicle_update ADMIN autenticado y valida su identidad", () => {
    const row = ["EV-ADMIN-1", "OP-ADMIN-FIELD-1234567890", "101", "a".repeat(64), "vehicle_update",
        JSON.stringify({ fieldName: "anoDesde", value: 2019, expectedCurrentValue: 2018 }),
        "DEV-1", "Administrador", "2026-11-20T12:00:00.000Z", "accepted", ""];
    const events = reader({ getSheetByName: () => ledgerSheet([row]) });
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "vehicle_update");
    assert.equal(events[0].payload.fieldName, "anoDesde");
    assert.equal(events[0].actorId, "DEV-1");
    const yearRow = ["EV-YEAR-1", "OP-YEAR-YSA-12345678901234567890123456789012-anoDesde", "101",
        "b".repeat(64), "vehicle_update",
        JSON.stringify({ fieldName: "anoDesde", value: 2017, expectedCurrentValue: 2018 }),
        "SYSTEM:FEEDBACK_YEAR", "Sistema", "2026-11-20T12:00:01.000Z", "accepted", ""];
    assert.equal(reader({ getSheetByName: () => ledgerSheet([yearRow]) })[0].opId, yearRow[1]);
    assert.throws(() => reader({ getSheetByName: () => ledgerSheet([[...yearRow.slice(0, 6), "USR-1", ...yearRow.slice(7)]]) }),
        /identidad, hash, tipo, fecha o estado inválido/);
    assert.throws(() => reader({ getSheetByName: () => ledgerSheet([[...row.slice(0, 6), "", "", ...row.slice(8)]]) }),
        /identidad, hash, tipo, fecha o estado inválido/);
    assert.throws(() => reader({ getSheetByName: () => ledgerSheet([[...row.slice(0, 1), "OP-YEAR-1234567890", ...row.slice(2)]]) }),
        /identidad, hash, tipo, fecha o estado inválido/);
});

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

test("aporte de corte completa metadatos faltantes y agrega VIN al vehículo correcto", () => {
    const vehicle = Object.assign(blankVehicle("101"), {
        marca: "Toyota", modelo: null, versionesAplicables: "Base / Limited", vin: '["TOYOTA"]'
    });
    const result = project([vehicle], [
        event("OP-CUT-META", "101", "cut", {
            tipo: "Ignición", vehicleData: { marca: "Nissan", modelo: "Frontier", anoDesde: 2024 },
            vinPrefix: "HONDAX"
        }, 2)
    ])[0];
    assert.equal(result.marca, "Toyota", "No debe reemplazar metadatos existentes");
    assert.equal(result.modelo, "Frontier");
    assert.equal(result.anoDesde, 2024);
    assert.deepEqual(JSON.parse(result.vin), ["TOYOTA", "HONDAX"]);
    assert.equal(result.contributionSources.vin.opId, "OP-CUT-META");
});

test("VIN concurrente repetido en vehículos distintos queda en revisión para ambos", () => {
    const result = project([blankVehicle("101"), blankVehicle("202")], [
        event("OP-VIN-A", "101", "cut", { tipo: "Ignición", vinPrefix: "SHARED" }, 2),
        event("OP-VIN-B", "202", "cut", { tipo: "Bomba", vinPrefix: "SHARED" }, 3, "b")
    ]);
    assert.equal(result[0].tipoCorte1, null);
    assert.equal(result[1].tipoCorte1, null);
    assert.equal(result[0].contributionCandidates[0].reason, "vin_conflict");
    assert.equal(result[1].contributionCandidates[0].reason, "vin_conflict");
});

test("VIN ya registrado en otro vehículo impide proyectar solo el aporte conflictivo", () => {
    const a = Object.assign(blankVehicle("101"), { vin: '["EXISTING"]' });
    const b = blankVehicle("202");
    const result = project([a, b], [
        event("OP-VIN-OLD", "202", "cut", { tipo: "Ignición", vinPrefix: "EXISTING" }, 2)
    ]);
    assert.equal(result[1].tipoCorte1, null);
    assert.equal(result[1].contributionCandidates[0].reason, "vin_conflict");
});

test("VIN respeta la capacidad de versiones y conserva el corte como candidato VIN", () => {
    const vehicle = Object.assign(blankVehicle("101"), {
        versionesAplicables: "Base", vin: '["FIRST"]'
    });
    const result = project([vehicle], [
        event("OP-VIN-FULL", "101", "cut", { tipo: "Ignición", vinPrefix: "SECOND" }, 2)
    ])[0];
    assert.equal(result.tipoCorte1, "Ignición");
    assert.deepEqual(JSON.parse(result.vin), ["FIRST"]);
    assert.ok(result.contributionCandidates.some(item => item.reason === "vin_capacity_full"));
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



test("resolución ADMIN válida sustituye el evento original sin mutar el historial",()=>{
 const original=event("OP-REVIEW-CUT","101","cut",{tipo:"Dato incorrecto"},2,"a",{status:"review"});
 const resolution=event("OP-ADMIN-REQUEST1234567890","101","cut",{tipo:"Dato corregido"},3,"b",{eventId:"EV-ADMIN-RESOLUTION",actorId:"DEV-1",supersedesEventId:original.eventId,status:"accepted"});
 const result=project([blankVehicle("101")],[original,resolution])[0];
 assert.equal(result.tipoCorte1,"Dato corregido");assert.equal(result.contributionSources.corte1.eventId,"EV-ADMIN-RESOLUTION");
 assert.equal(result.contributionCandidates.length,0);assert.equal(original.status,"review");assert.equal(original.payload.tipo,"Dato incorrecto");
});
test("resolución ADMIN de descarte retira el aporte sin borrar el evento original",()=>{
 const original=event("OP-REVIEW-FEED","101","feed",{text:"Dato no válido"},2,"a",{status:"review"});
 const resolution=event("OP-ADMIN-REQUEST1234567891","101","feed",{text:"Dato no válido"},3,"b",{eventId:"EV-ADMIN-DISCARD",actorId:"DEV-1",supersedesEventId:original.eventId,status:"retracted"});
 const result=project([blankVehicle("101")],[original,resolution])[0];
 assert.equal(result.cableAlimen,null);assert.equal(result.contributionCandidates.length,0);assert.equal(original.status,"review");
});
test("una corrección posterior puede sustituir otra resolución sin romper la cadena",()=>{
 const original=event("OP-CHAIN-ORIGINAL","101","feed",{text:"Pendiente"},2,"a",{status:"review"});
 const first=event("OP-ADMIN-CHAIN-REQUEST0001","101","feed",{text:"Primera corrección"},3,"b",{eventId:"EV-ADMIN-CHAIN-1",actorId:"DEV-1",supersedesEventId:original.eventId,status:"accepted"});
 const second=event("OP-ADMIN-CHAIN-REQUEST0002","101","feed",{text:"Corrección final"},4,"c",{eventId:"EV-ADMIN-CHAIN-2",actorId:"DEV-1",supersedesEventId:first.eventId,status:"accepted"});
 const result=project([blankVehicle("101")],[original,first,second])[0];
 assert.equal(result.cableAlimen,"Corrección final");assert.equal(result.contributionSources.feed1.eventId,"EV-ADMIN-CHAIN-2");
 assert.equal(result.contributionCandidates.length,0);assert.equal(original.status,"review");
});
test("resoluciones múltiples concurrentes no sustituyen silenciosamente el evento",()=>{
 const original=event("OP-REVIEW-OPEN","101","opening",{text:"Pendiente"},2,"a",{status:"review"});
 const one=event("OP-ADMIN-REQUEST1234567892","101","opening",{text:"Aceptar A"},3,"b",{eventId:"EV-ADMIN-A",actorId:"DEV-1",supersedesEventId:original.eventId,status:"accepted"});
 const two=event("OP-ADMIN-REQUEST1234567893","101","opening",{text:"Aceptar B"},4,"c",{eventId:"EV-ADMIN-B",actorId:"DEV-2",supersedesEventId:original.eventId,status:"accepted"});
 const result=project([blankVehicle("101")],[original,one,two])[0];
 assert.equal(result.apertura,null);assert.ok(result.contributionCandidates.some(item=>item.reason==="resolution_conflict"));
});

test("edición versionada de un campo materializado aplica solo si coincide la versión esperada",()=>{
 const vehicle=blankVehicle("101");vehicle.modelo="Corolla";
 const update=event("OP-ADMIN-FIELD-MODEL-1","101","vehicle_update",{fieldName:"modelo",value:"Corolla X",expectedCurrentValue:"Corolla"},2,"a",{actorId:"DEV-1"});
 const result=project([vehicle],[update])[0];
 assert.equal(result.modelo,"Corolla X");assert.equal(result.contributionSources.modelo.eventId,update.eventId);
});
test("dos ediciones concurrentes del mismo campo producen un conflicto localizado",()=>{
 const vehicle=blankVehicle("101");vehicle.modelo="Corolla";
 const first=event("OP-ADMIN-FIELD-MODEL-2","101","vehicle_update",{fieldName:"modelo",value:"Corolla X",expectedCurrentValue:"Corolla"},2,"a",{actorId:"DEV-1"});
 const second=event("OP-ADMIN-FIELD-MODEL-3","101","vehicle_update",{fieldName:"modelo",value:"Corolla Y",expectedCurrentValue:"Corolla"},3,"a",{actorId:"DEV-1",actorId:"DEV-2"});
 const result=project([vehicle],[first,second])[0];
 assert.equal(result.modelo,"Corolla X");assert.ok(result.contributionCandidates.some(item=>item.eventId===second.eventId&&item.reason==="field_conflict"));
});
test("ediciones concurrentes de campos distintos del mismo vehículo se conservan",()=>{
 const vehicle=blankVehicle("101");vehicle.modelo="Corolla";vehicle.anoDesde=2018;
 const model=event("OP-ADMIN-FIELD-MODEL-4","101","vehicle_update",{fieldName:"modelo",value:"Corolla X",expectedCurrentValue:"Corolla"},2,"a",{actorId:"DEV-1"});
 const year=event("OP-ADMIN-FIELD-YEAR-1","101","vehicle_update",{fieldName:"anoDesde",value:2019,expectedCurrentValue:2018},3,"a",{actorId:"DEV-1",actorId:"DEV-2"});
 const result=project([vehicle],[model,year])[0];
 assert.equal(result.modelo,"Corolla X");assert.equal(result.anoDesde,2019);assert.equal(result.contributionCandidates.length,0);
});
test("edición versionada puede sustituir el valor procedente de un evento previo",()=>{
 const vehicle=blankVehicle("101");
 const source=event("OP-VEHICLE-MODEL-1","101","vehicle",{modelo:"Corolla"},2,"a",{actorId:"DEV-1"});
 const update=event("OP-ADMIN-FIELD-MODEL-5","101","vehicle_update",{fieldName:"modelo",value:"Corolla X",expectedCurrentValue:"Corolla"},3,"a",{actorId:"DEV-1",supersedesEventId:source.eventId});
 const result=project([vehicle],[source,update])[0];
 assert.equal(result.modelo,"Corolla X");assert.equal(result.contributionSources.modelo.eventId,update.eventId);
});


test("VIN versionado aplica cuando no colisiona con otro vehículo",()=>{
 const vehicle=blankVehicle("201");vehicle.vin="[]";vehicle.versionesAplicables="Base";
 const update=event("OP-ADMIN-FIELD-VIN-1","201","vehicle_update",{fieldName:"vin",value:'["A"]',expectedCurrentValue:"[]"},2,"a",{actorId:"DEV-1"});
 const result=project([vehicle],[update])[0];
 assert.equal(result.vin,'["A"]');assert.equal(result.contributionSources.vin.eventId,update.eventId);
});
test("VIN versionado de vehículos distintos detecta colisión sin aplicar ninguno",()=>{
 const one=blankVehicle("201"),two=blankVehicle("202");one.vin="[]";two.vin="[]";
 const first=event("OP-ADMIN-FIELD-VIN-2","201","vehicle_update",{fieldName:"vin",value:'["A"]',expectedCurrentValue:"[]"},2,"a",{actorId:"DEV-1"});
 const second=event("OP-ADMIN-FIELD-VIN-3","202","vehicle_update",{fieldName:"vin",value:'["A"]',expectedCurrentValue:"[]"},3,"b",{actorId:"DEV-2"});
 const results=project([one,two],[first,second]);
 assert.ok(results[0].contributionCandidates.some(x=>x.eventId===first.eventId&&x.reason==="vin_conflict"));
 assert.ok(results[1].contributionCandidates.some(x=>x.eventId===second.eventId&&x.reason==="vin_conflict"));
 assert.equal(results[0].vin,"[]");assert.equal(results[1].vin,"[]");
});

test("VIN compuesto aplica versión y colección con la misma fuente",()=>{
 const vehicle=blankVehicle("301");vehicle.versionesAplicables="Base";vehicle.vin="[]";
 const update=event("OP-WRITE-VIN-1234567890","301","vehicle_update",{
  fieldName:"vin_registration",expectedCurrentValue:{versionesAplicables:"Base",vin:[]},
  value:{versionesAplicables:"Base / Sport",vin:["ABC"]}
 },2,"a",{actorId:"USR-301"});
 const result=project([vehicle],[update])[0];
 assert.equal(result.versionesAplicables,"Base / Sport");assert.deepEqual(JSON.parse(result.vin),["ABC"]);
 assert.equal(result.contributionSources.versionesAplicables.eventId,update.eventId);
 assert.equal(result.contributionSources.vin.eventId,update.eventId);
});
test("VIN compuesto concurrente deja el segundo evento como candidato sin aplicar parcialmente",()=>{
 const vehicle=blankVehicle("302");vehicle.versionesAplicables="Base";vehicle.vin="[]";
 const make=(trim,vin,row)=>event("OP-WRITE-VIN-"+row,"302","vehicle_update",{
  fieldName:"vin_registration",expectedCurrentValue:{versionesAplicables:"Base",vin:[]},
  value:{versionesAplicables:trim,vin:[vin]}
 },row,String(row%9),{actorId:"USR-302"});
 const result=project([vehicle],[make("Base / Sport","ONE",2),make("Base / Limited","TWO",3)])[0];
 assert.equal(result.versionesAplicables,"Base / Sport");assert.deepEqual(JSON.parse(result.vin),["ONE"]);
 assert.ok(result.contributionCandidates.some(item=>item.reason==="field_conflict"));
});
test("VIN compuesto entre vehículos detecta colisión sin proyectar parcial",()=>{
 const one=blankVehicle("303"),two=blankVehicle("304");one.versionesAplicables="Base";two.versionesAplicables="Base";one.vin="[]";two.vin="[]";
 const make=(id,row)=>event("OP-WRITE-VIN-"+id,id,"vehicle_update",{
  fieldName:"vin_registration",expectedCurrentValue:{versionesAplicables:"Base",vin:[]},
  value:{versionesAplicables:"Base / Sport",vin:["SHARED"]}
 },row,"a",{actorId:"USR-"+id});
 const result=project([one,two],[make("303",2),make("304",3)]);
 for(const vehicle of result){assert.equal(vehicle.versionesAplicables,"Base");assert.deepEqual(JSON.parse(vehicle.vin),[]);
  assert.ok(vehicle.contributionCandidates.some(item=>item.reason==="vin_conflict"));}
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
    assert.match(admin, /case 'migrateVehicleContributionsSchema':[\s\S]{0,160}handleMigrateVehicleContributionsSchema/);
    assert.match(admin, /function handleMigrateVehicleContributionsSchema\(/);
});


function buildAppendRuntime(options = {}) {
    const headers = [
        "eventId", "opId", "vehicleId", "operationHash", "kind", "payloadJson",
        "actorId", "actorName", "createdAt", "status", "supersedesEventId"
    ];
    const rows = options.missing ? [] : [headers.slice()];
    let uuid = 0, flushes = 0;
    const sheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => options.badSchema ? 3 : 11,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            return {
                getDisplayValues() {
                    return Array.from({ length: rowCount }, (_, offset) =>
                        (rows[row - 1 + offset] || []).slice(column - 1, column - 1 + columnCount).map(value => String(value ?? ""))
                    );
                },
                getValues() {
                    return Array.from({ length: rowCount }, (_, offset) =>
                        (rows[row - 1 + offset] || []).slice(column - 1, column - 1 + columnCount)
                    );
                },
                createTextFinder(value) {
                    return {
                        matchCase() { return this; },
                        matchEntireCell() { return this; },
                        findAll() {
                            const found = [];
                            for (let offset = 0; offset < rowCount; offset++) {
                                const candidateRow = row + offset;
                                if (String((rows[candidateRow - 1] || [])[column - 1] ?? "") === String(value)) {
                                    found.push({ getRow: () => candidateRow });
                                }
                            }
                            return found;
                        }
                    };
                }
            };
        },
        appendRow(row) { rows.push(row.slice()); }
    };
    const spreadsheet = { getSheetByName: name => name === "AportesVehiculo" && !options.missing ? sheet : null };
    const utilities = {
        DigestAlgorithm: { SHA_256: "SHA-256" },
        Charset: { UTF_8: "UTF-8" },
        computeDigest: () => Array(32).fill(1),
        getUuid: () => "test-uuid-" + (++uuid)
    };
    const source = [
        extractFunction(write, "getVehicleContributionLedgerSheet_"),
        extractFunction(write, "findVehicleContributionEventsByOpId_"),
        extractFunction(write, "computeVehicleContributionHash_"),
        extractFunction(write, "appendVehicleContributionEvent_")
    ].join("\n");
    const append = new Function(
        "getSpreadsheet", "Utilities", "SpreadsheetApp",
        "WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_", "WRITE_VEHICLE_CONTRIBUTIONS_HEADERS_",
        source + ";return appendVehicleContributionEvent_;"
    )(() => spreadsheet, utilities, { flush() { flushes++; } }, "AportesVehiculo", headers);
    return { append, rows, state: () => ({ flushes }) , spreadsheet };
}

test("append de aporte registra evento durable con esquema versionado", () => {
    const runtime = buildAppendRuntime();
    const result = runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-ONE",
        kind: "opening", payload: { text: "Apertura", image: "" }, operationHash: "a".repeat(64),
        actorId: "USR-1", actorName: "Técnico"
    });
    assert.equal(result.status, "accepted");
    assert.equal(result.duplicate, false);
    assert.equal(runtime.rows.length, 2);
    assert.equal(runtime.rows[1][1], "OP-ONE");
    assert.equal(runtime.rows[1][2], "101");
    assert.equal(JSON.parse(runtime.rows[1][5]).text, "Apertura");
});

test("append acepta IDs numéricos válidos y rechaza IDs no numéricos", () => {
    const runtime = buildAppendRuntime();
    assert.throws(() => runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "ABC", opId: "OP-BAD",
        kind: "feed", payload: { text: "12V" }, operationHash: "a".repeat(64)
    }), /vehicleId válido/);
    assert.throws(() => runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "10A", opId: "OP-BAD2",
        kind: "feed", payload: { text: "12V" }, operationHash: "a".repeat(64)
    }), /vehicleId válido/);
    const valid = runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "123456789012345", opId: "OP-VALID",
        kind: "feed", payload: { text: "12V" }, operationHash: "b".repeat(64)
    });
    assert.equal(valid.vehicleId, "123456789012345");
});

test("mismo opId y misma huella recupera el evento sin duplicar fila", () => {
    const runtime = buildAppendRuntime();
    const options = {
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-SAME",
        kind: "feed", payload: { text: "12V", image: "" }, operationHash: "b".repeat(64)
    };
    const first = runtime.append(options);
    const retry = runtime.append(options);
    assert.equal(first.eventId, retry.eventId);
    assert.equal(retry.duplicate, true);
    assert.equal(runtime.rows.length, 2);
});

test("mismo opId con huella distinta se rechaza", () => {
    const runtime = buildAppendRuntime();
    runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-CONFLICT",
        kind: "feed", payload: { text: "12V", image: "" }, operationHash: "c".repeat(64)
    });
    assert.throws(() => runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-CONFLICT",
        kind: "feed", payload: { text: "IGN", image: "" }, operationHash: "d".repeat(64)
    }), error => error.code === "CONTRIBUTION_OP_ID_CONFLICT");
});

test("aportes de vehículos diferentes se anexan sin compartir reserva global", () => {
    const runtime = buildAppendRuntime();
    const a = runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-A",
        kind: "cut", payload: { tipo: "Ignición" }, operationHash: "e".repeat(64)
    });
    const b = runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "202", opId: "OP-B",
        kind: "cut", payload: { tipo: "Bomba" }, operationHash: "f".repeat(64)
    });
    assert.equal(a.vehicleId, "101");
    assert.equal(b.vehicleId, "202");
    assert.equal(runtime.rows.length, 3);
});

test("append falla cerrado si el esquema no fue migrado", () => {
    const runtime = buildAppendRuntime({ missing: true });
    assert.throws(() => runtime.append({
        spreadsheet: runtime.spreadsheet, vehicleId: "101", opId: "OP-NO-SCHEMA",
        kind: "feed", payload: { text: "12V" }, operationHash: "a".repeat(64)
    }), error => error.code === "CONTRIBUTION_LEDGER_NOT_READY");
});

console.log(passed + "/" + passed + " PASS");
