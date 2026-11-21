import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = source.indexOf("function ensureTestigoColumns(sheet)");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró ensureTestigoColumns");
const helper = source.slice(start, end);
assert.doesNotMatch(helper, /LockService|waitLock|tryLock|releaseLock|lockAcquired|lockAlreadyHeld/,
    "El helper no debe adquirir ni liberar locks internos");
assert.match(helper, /const targetColumns = \[46, 47, 48\]/);
assert.match(helper, /const headerNames = \["activaTestigo1", "activaTestigo2", "activaTestigo3"\]/);
assert.match(helper, /sheet\.getRange\(1, targetColumns\[0\], 1, headerNames\.length\)\.setValues\(\[headerNames\]\)/);

const callerStart = source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const callerEnd = source.indexOf("\nfunction sanitizeSupplementaryRichText_", callerStart);
assert.ok(callerStart >= 0 && callerEnd > callerStart, "No se encontró el alta administrativa");
const caller = source.slice(callerStart, callerEnd);
const lock = caller.indexOf("lock.tryLock(0)");
const ensure = caller.indexOf("ensureTestigoColumns(sheet)");
assert.ok(lock >= 0 && ensure > lock, "La preparación de Testigo debe ejecutarse dentro de la sección crítica ya adquirida por el alta");
assert.ok(!caller.includes("ensureTestigoColumns(sheet, true)"), "No debe existir el parámetro de lock heredado");
console.log("AdminTestigoColumnsNoInternalLock: 1/1 PASS");
