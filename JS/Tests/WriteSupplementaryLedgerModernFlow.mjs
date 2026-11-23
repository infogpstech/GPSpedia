import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const start = source.indexOf("function handleAddSupplementaryInfo(payload)");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleAddSupplementaryInfo");
const handlerSource = source.slice(start, end);

function runCase({ opening, note }) {
    const ledger = { name: "AportesVehiculo" };
    const captured = { append: null, readLedger: null, candidateLedger: null, readCount: 0 };
    const spreadsheet = { getSheetByName: name => {
        assert.equal(name, "Cortes");
        return { name: "Cortes" };
    } };
    const plan = {
        apertureRequested: opening,
        slotIndex: null,
        updates: { apertura: opening ? "Apertura" : "", notaImportante: note ? "Nota importante" : "" }
    };
    const handler = new Function(
        "getAuthenticatedCollaborator", "SUPPLEMENTARY_INFO_ALLOWED_ROLES_", "createSupplementaryInfoError_",
        "getSpreadsheet", "SHEET_NAMES", "readSupplementaryVehicleSnapshot_", "buildSupplementaryInfoPlan_",
        "getVehicleContributionLedgerSheet_", "hasSupplementaryValue_", "prepareSupplementaryImageUploads_",
        "appendVehicleContributionEvent_", "handleAddSupplementaryInfoLocked", "readVehicleContributionLedgerRows_",
        "getVehicleContributionCandidateStatus_", "getVehicleContributionFeedSlotIndex_", "markImageUploadLinked",
        handlerSource + "\nreturn handleAddSupplementaryInfo;"
    )(
        () => "Tester", [], (code, message) => Object.assign(new Error(message), { code }),
        () => spreadsheet, { CORTES: "Cortes" },
        () => ({ vehicle: { id: "101" }, rowValues: [] }), () => plan,
        () => ledger,
        value => value !== null && value !== undefined && String(value).trim() !== "",
        payload => ({ payload, uploadedUrls: [] }),
        options => {
            captured.append = options;
            return { eventId: "EV-OPENING-123", opId: options.opId, operationHash: "a".repeat(64),
                createdAt: "2026-11-23T12:00:00.000Z", duplicate: false };
        },
        () => ({ status: "success" }),
        sheet => {
            captured.readCount++;
            captured.readLedger = sheet;
            assert.equal(sheet, ledger, "La lectura posterior debe reutilizar el ledger ya validado.");
            return [];
        },
        (ss, snapshot, eventId, kind, validatedLedger, rows) => {
            captured.candidateLedger = validatedLedger;
            assert.equal(validatedLedger, ledger);
            assert.deepEqual(rows, []);
            return false;
        },
        () => null,
        () => true
    );
    const payload = {
        vehicleId: "101", opId: "OP-REQUEST-123",
        contributionOpIds: opening ? { opening: "OP-OPENING-123" } : {}
    };
    const result = handler(payload);
    assert.equal(result.status, "success");
    assert.equal(result.apertureSaved, opening);
    assert.equal(result.noteSaved, note);
    assert.equal(result.contributionEvents.length, opening ? 1 : 0);
    assert.equal(captured.readCount, opening ? 1 : 0);
    if (opening) {
        assert.equal(captured.append.ledgerSheet, ledger);
        assert.equal(captured.append.opId, "OP-OPENING-123");
        assert.equal(captured.readLedger, ledger);
        assert.equal(captured.candidateLedger, ledger);
    } else {
        assert.equal(captured.append, null);
        assert.equal(captured.readLedger, null);
    }
}

runCase({ opening: true, note: false });
runCase({ opening: false, note: true });
console.log("WriteSupplementaryLedgerModernFlow: 2/2 PASS — aportes y notas reutilizan el ledger sin referencias fuera de ámbito");
