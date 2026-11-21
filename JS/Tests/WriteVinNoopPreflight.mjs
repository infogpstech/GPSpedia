import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : undefined);
}
const helperCode = extract("findExistingVinRegistrationNoop_");
const wrapperCode = extract("handleAddVinToVehicle");
const columns = { id: 1, versionesAplicables: 5 };
function makeHarness({ row = ["10", "", "", "", "Base / Full", "", "", "", "", "ABC123456"], lockAvailable = true, duplicateIds = false, authFails = false } = {}) {
    let lockCalls = 0, lockedCalls = 0, authCalls = 0, versionCalls = 0, reads = [];
    const sheet = {
        getLastRow: () => 2,
        getLastColumn: () => 10,
        getRange(...args) {
            reads.push(args);
            return { getValues: () => {
                if (args[1] === columns.id && args[3] === 1) return duplicateIds ? [[row[0]], [row[0]]] : [[row[0]]];
                return [row.slice(args[1] - 1, args[1] - 1 + (args[3] || 1))];
            }};
        }
    };
    const lock = { tryLock() { lockCalls++; return lockAvailable; }, releaseLock() {} };
    const deps = {
        extractVinPrefix: value => String(value).trim().toUpperCase().replace(/[ -]/g, "").slice(0, -5),
        getSpreadsheet: () => ({ getSheetByName: () => sheet }),
        SHEET_NAMES: { CORTES: "Cortes" }, COLS_CORTES: columns,
        getVinColumnIndex: () => 10,
        parseEquipmentVersions: value => String(value || "").split("/").map(v => v.trim()).filter(Boolean),
        parseVinCollection: value => value ? JSON.parse(value) : [],
        getAuthenticatedCollaborator() { authCalls++; if (authFails) throw new Error("unauthorized"); return "Ana"; },
        LockService: { getScriptLock: () => lock },
        handleAddVinToVehicleLocked(payload) { lockedCalls++; authCalls++; if (authFails) throw new Error("unauthorized"); return { status: "success", vehicleId: "10" }; },
        nextWriteCatalogVersionLocked_() { versionCalls++; return 4; },
        Logger: { log() {} }
    };
    const helper = new Function(...Object.keys(deps), helperCode + "\nreturn findExistingVinRegistrationNoop_;")(...Object.values(deps));
    const wrapper = new Function(...Object.keys(deps), helperCode + "\n" + wrapperCode + "\nreturn handleAddVinToVehicle;")(...Object.values(deps));
    return { helper, wrapper, stats: () => ({ lockCalls, lockedCalls, authCalls, versionCalls, reads }) };
}
assert.match(source, /response && response\.status === "success" && response\.alreadyPresent !== true/, "Un replay sin cambios no debe invalidar CATALOG");
assert.match(source, /fieldName: "vin_registration"/, "La mutación debe usar un evento VIN compuesto");
assert.doesNotMatch(source.slice(source.indexOf("function handleAddVinToVehicle(payload) {")), /LockService\.getScriptLock|setValue\(/, "La mutación no debe usar ScriptLock ni escribir Cortes directamente");
assert.match(source, /fieldName: "vin_registration"/, "La mutación debe usar un evento VIN compuesto");
assert.doesNotMatch(source.slice(source.indexOf("function handleAddVinToVehicle(payload) {")), /LockService\.getScriptLock|setValue\(/, "La mutación no debe usar ScriptLock ni escribir Cortes directamente");
let passed = 0;
function test(name, fn) { fn(); passed++; }

test("reintento exacto de VIN devuelve el registro sin lock ni nueva versión de catálogo", () => {
    const h = makeHarness({ row: ["10", "", "", "", "Base / Full", "", "", "", "", "[\"ABC\",\"XYZ\"]"] });
    const result = h.wrapper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Base", isNewTrim: false });
    assert.equal(result.status, "success");
    assert.equal(result.alreadyPresent, true);
    assert.deepEqual(result.vinCollection, ["ABC", "XYZ"]);
    assert.deepEqual({ ...h.stats(), reads: undefined }, { lockCalls: 0, lockedCalls: 0, authCalls: 1, versionCalls: 0, reads: undefined });
});
test("VIN existente en otra versión no se considera replay idéntico", () => {
    const h = makeHarness({ row: ["10", "", "", "", "Base / Full", "", "", "", "", "[\"\",\"ABC\"]"] });
    assert.equal(h.helper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Base" }), null);
    assert.equal(h.wrapper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Base" }).status, "success");
    assert.equal(h.stats().lockCalls, 0);
    assert.equal(h.stats().lockedCalls, 1);
    assert.equal(h.stats().versionCalls, 0);
});
test("una versión nueva se registra sin lock global", () => {
    const h = makeHarness({ row: ["10", "", "", "", "Base", "", "", "", "", "[\"ABC\"]"] });
    assert.equal(h.helper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Sport", isNewTrim: true }), null);
    h.wrapper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Sport", isNewTrim: true });
    assert.equal(h.stats().lockCalls, 0);
});
test("un ID ambiguo no permite responder desde preflight", () => {
    const h = makeHarness({ duplicateIds: true, row: ["10", "", "", "", "Base", "", "", "", "", '["ABC"]'] });
    assert.equal(h.helper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Base" }), null);
    h.wrapper({ vehicleId: "10", vin: "ABC12345", trimLevel: "Base" });
    assert.equal(h.stats().lockCalls, 0);
});
test("si falla la autenticación, no se anexa ningún evento", () => {
    const h = makeHarness({ authFails: true });
    assert.equal(h.wrapper({ vehicleId: "10", vin: "NEW12345", trimLevel: "Base" }).status, "error");
    assert.equal(h.stats().lockCalls, 0);
    assert.equal(h.stats().lockedCalls, 0);
    assert.equal(h.stats().authCalls, 1);
});
console.log("WriteVinNoopPreflight: " + passed + "/" + passed + " PASS — replay idéntico fuera del lock; mutaciones append-only sin lock global");
