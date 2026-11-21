import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleSuggestYearLocked(");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleSuggestYearLocked");
const handler = source.slice(start, end);
const appendAt = handler.indexOf("ledger.appendRow(applicationValues)");
const readbackAt = handler.indexOf("const applicationLastRow", appendAt);
const validationAt = handler.indexOf('savedApplications.length !== 1', readbackAt);
assert.ok(appendAt >= 0 && readbackAt > appendAt && validationAt > readbackAt,
    "La verificación debe ejecutarse después del append y antes de completar la aplicación.");
const readback = handler.slice(readbackAt, validationAt);
assert.match(readback, /ledger\.getRange\(2, 1, applicationLastRow - 1, 1\)/);
assert.match(readback, /createTextFinder\(operationId\)\.matchCase\(true\)\.matchEntireCell\(true\)\.findAll\(\)/);
assert.match(readback, /match\.getRow\(\)/);
assert.match(readback, /ledger\.getRange\(match\.getRow\(\), 1, 1, 16\)\.getValues\(\)\[0\]/);
assert.doesNotMatch(readback, /getDataRange\(\)/,
    "El read-back posterior al append no debe descargar todo FeedbackYearApplications.");
assert.match(handler.slice(validationAt, validationAt + 300), /savedApplications\.length !== 1/);
assert.match(handler.slice(validationAt, validationAt + 500), /savedApplications\[0\]\.row\[8\]/,
    "Se conserva la validación de unicidad y estado pending.");

console.log("FeedbackYearApplicationReadbackBounded: 8/8 PASS");
