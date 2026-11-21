import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleCheckOperation(payload)");
const end = source.indexOf("\n// ============================================================================", start);
assert.ok(start >= 0 && end > start, "No se encontró handleCheckOperation");
const handler = source.slice(start, end);

function makeHandler(events, options = {}) {
    const spreadsheet = {
        getSheetByName(name) {
            if (name === "Cortes") return { name: "Cortes" };
            if (name === "AportesVehiculo") return events.length ? { name: "AportesVehiculo" } : null;
            return null;
        }
    };
    return new Function(
        "getSpreadsheet", "SHEET_NAMES", "findRowByOpId", "WRITE_VEHICLE_CONTRIBUTIONS_SHEET_NAME_",
        "findVehicleContributionEventsByOpId_", "readSupplementaryVehicleSnapshot_",
        "getVehicleContributionCutSlotIndex_", "getVehicleContributionCandidateStatus_", "findVehicleContributionVinConflict_", "checkVinDuplicateInSheet", "Utilities",
        handler + "\nreturn handleCheckOperation;"
    )(
        () => spreadsheet, { CORTES: "Cortes" }, () => null, "AportesVehiculo",
        () => events,
        () => ({ vehicle: options.vehicle || { id: "101" }, rowValues: [] }),
        () => options.slotIndex === undefined ? 1 : options.slotIndex,
        () => options.candidateStatus === true,
        () => options.vinConflict === true ? { vehicleId: "202" } : null,
        () => options.baseVinConflict === true ? { vehicleId: "202" } : null,
        { formatDate: () => "20/11/2026" }
    );
}
function event({ eventId = "EV-1", opId = "OP-1", vehicleId = "101", hash = "a".repeat(64),
    kind = "cut", payload = { tipo: "Bomba" }, status = "accepted", rowIndex = 2 } = {}) {
    return { rowIndex, values: [eventId, opId, vehicleId, hash, kind, JSON.stringify(payload),
        "USR-1", "Técnico", "2026-11-20T12:00:00.000Z", status, ""] };
}

{
    const fn = makeHandler([event()]);
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.exists, true);
    assert.equal(result.source, "AportesVehiculo");
    assert.equal(result.vehicleId, "101");
    assert.equal(result.operationHash, "a".repeat(64));
    assert.equal(result.slotIndex, 1);
    assert.equal(result.candidateReviewPending, false);
}
{
    const fn = makeHandler([event()], { slotIndex: null });
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.exists, true);
    assert.equal(result.candidateReviewPending, true, "Un corte sin slot debe recuperarse como candidato");
}
{
    const fn = makeHandler([event()]);
    assert.throws(() => fn({ opId: "OP-1", operationHash: "b".repeat(64) }),
        /no corresponde a la huella del aporte recuperado/);
}
{
    const fn = makeHandler([event(), event({ eventId: "EV-2", hash: "b".repeat(64), payload: { tipo: "Ignición" }, rowIndex: 3 })]);
    assert.throws(() => fn({ opId: "OP-1" }), error => error.code === "CONTRIBUTION_OP_ID_CONFLICT");
}
{
    const fn = makeHandler([event({ kind: "opening", payload: { text: "IGN", image: "" } })], { candidateStatus: true });
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.contributionKind, "opening");
    assert.equal(result.candidateReviewPending, true, "La apertura concurrente desplazada debe conservarse como candidata");
}
{
    const fn = makeHandler([event({ kind: "feed", payload: { text: "12V", image: "" } })], { candidateStatus: true });
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.contributionKind, "feed");
    assert.equal(result.candidateReviewPending, true, "La alimentación desplazada debe conservarse como candidata");
}
{
    const fn = makeHandler([event({ payload: { tipo: "Bomba", vinPrefix: "SHARED" } })], { vinConflict: true });
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.vinConflictPending, true);
    assert.equal(result.candidateReviewPending, true, "La recuperación debe exponer como candidato el VIN que entró en conflicto después de la primera respuesta");
}
{
    const fn = makeHandler([event({ payload: { tipo: "Bomba", vinPrefix: "EXISTING" } })], { baseVinConflict: true });
    const result = fn({ opId: "OP-1", operationHash: "a".repeat(64) });
    assert.equal(result.vinConflictPending, true);
    assert.equal(result.candidateReviewPending, true, "La recuperación debe comprobar VIN materializados en otros vehículos");
}
{
    const fn = makeHandler([]);
    const result = fn({ opId: "OP-MISSING" });
    assert.equal(result.exists, false);
    assert.equal(result.pending, false);
}
console.log("WriteContributionRecovery: 9/9 PASS — checkOperation reconoce eventos, candidatos y conflictos VIN tardíos");
