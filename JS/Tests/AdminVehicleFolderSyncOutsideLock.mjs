import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extract(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, next > start ? next : source.length);
}
const handler = extract("handleUpdateVehicleField");
const append = extract("appendAdminVehicleFieldUpdate_");
assert.ok(handler.includes("appendAdminVehicleFieldUpdate_("),
    "La edición in-modal debe delegar en el registro versionado append-only");
assert.ok(!/LockService\.getScriptLock\(\)|\.tryLock\(|\.waitLock\(/.test(handler),
    "La edición de campo no debe adquirir un lock global");
assert.ok(!/DriveApp\.|movePrimaryVehicleImageToCanonicalFolder/.test(handler),
    "La edición de campo no debe ejecutar trabajo Drive dentro del handler");
assert.ok(append.includes("ledgerSheet.appendRow("),
    "La nueva versión debe anexarse al journal AportesVehiculo");
assert.ok(append.includes("folderSyncWarning"),
    "La respuesta debe advertir cuando la metadata requiere sincronización de carpeta diferida");
assert.ok(append.includes('folderMetadataFields.has(fieldName)'),
    "La advertencia debe limitarse a los campos que afectan la carpeta");
assert.ok(append.includes("expectedCurrentValue") && append.includes("expectedSourceEventId"),
    "La escritura debe conservar control optimista de versión y origen");
console.log("AdminVehicleFieldVersioningContract: 7/7 PASS — edición in-modal append-only, sin lock global ni Drive inline");
