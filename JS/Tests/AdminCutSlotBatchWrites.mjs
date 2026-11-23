import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");

const columnsMatch = write.match(/const COLS_CORTES = \{([\s\S]*?)\n\};/);
assert.ok(columnsMatch, "No se encontró el mapa de columnas Cortes en WRITE.");
const columns = new Function("return ({" + columnsMatch[1] + "});")();
for (const slot of [1, 2, 3]) {
    const first = columns["tipoCorte" + slot];
    assert.equal(columns["ubicacionCorte" + slot], first + 1);
    assert.equal(columns["colorCableCorte" + slot], first + 2);
    assert.equal(columns["configRelay" + slot], first + 3);
    assert.equal(columns["imgCorte" + slot], first + 4);
}

const legacyStart = admin.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const legacyEnd = admin.indexOf("\nfunction sanitizeSupplementaryRichText_", legacyStart);
assert.ok(legacyStart >= 0 && legacyEnd > legacyStart);
const legacy = admin.slice(legacyStart, legacyEnd);
assert.match(legacy, /ACTION_MOVED_TO_WRITE/);
assert.doesNotMatch(legacy, /setValues\(|setValue\(|UrlFetchApp/,
    "La ruta ADMIN de compatibilidad no debe conservar escrituras ni coordinación.");

const writeStart = write.indexOf("function handleAddOrUpdateCut(payload)");
const writeEnd = write.indexOf("\nconst CORTES_ID_COUNTER_PROPERTY", writeStart);
assert.ok(writeStart >= 0 && writeEnd > writeStart);
const handler = write.slice(writeStart, writeEnd);
assert.ok(handler.includes("handleAppendExistingVehicleCut_(preparedRequest)"),
    "WRITE debe dirigir vehículos existentes al propietario canónico de escritura.");
assert.ok(write.includes("function handleAppendExistingVehicleCut_("));
assert.ok(write.includes("function buildCutSlotCoreValues_(cutData, imageUrl)"));
const writeUnsafeStart = write.indexOf("function handleAddOrUpdateCutLockedUnsafe_");
const writeUnsafeEnd = write.indexOf("\nfunction ", writeUnsafeStart + 10);
assert.ok(writeUnsafeStart >= 0 && writeUnsafeEnd > writeUnsafeStart);
const writeUnsafe = write.slice(writeUnsafeStart, writeUnsafeEnd);
assert.ok(writeUnsafe.includes("buildCutSlotCoreValues_(cutData, imageUrl)"));
assert.ok(writeUnsafe.includes(".setValues([slotCoreValues])"));
console.log("AdminCutSlotBatchWrites: 1/1 PASS — ADMIN legacy bloqueado; escrituras agrupadas pertenecen a WRITE");
