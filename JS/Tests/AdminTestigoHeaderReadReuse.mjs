import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
function extract(name) {
 const start=source.indexOf("function "+name+"(");
 const end=source.indexOf("\nfunction ",start+10);
 assert.ok(start>=0&&end>start,"No se encontró "+name);
 return source.slice(start,end);
}
const ensure=extract("ensureTestigoColumns");
const handlerStart=source.indexOf("function handleAddOrUpdateCut(payload, logMessage, developerContext)");
const handlerEnd=source.indexOf("\nfunction sanitizeSupplementaryRichText_",handlerStart);
assert.ok(handlerStart>=0&&handlerEnd>handlerStart,"No se encontró handleAddOrUpdateCut");
const handler=source.slice(handlerStart,handlerEnd);
let passed=0;
function test(name,fn){fn();passed++;}

test("ensureTestigoColumns realiza una sola lectura completa de encabezados",()=>{
 assert.equal((ensure.match(/getRange\(1, 1, 1, lastColumn\)/g)||[]).length,1);
 assert.ok(!ensure.includes("getVinColumnIndex(sheet)"));
});
test("la búsqueda de VIN se deriva del mismo snapshot de encabezados",()=>{
 assert.ok(ensure.includes('String(value || "").trim().toLowerCase() === "vin"'));
 assert.ok(ensure.includes("const vinColumnIndex = vinMatches.length === 1 ? vinMatches[0] : 0;"));
});
test("VIN duplicado se rechaza antes de ampliar o modificar columnas",()=>{
 const duplicate=ensure.indexOf("if (vinMatches.length > 1)");
 const insert=ensure.indexOf("sheet.insertColumnsAfter");
 const write=ensure.indexOf("sheet.getRange(1, targetColumns[index]).setValue");
 assert.ok(duplicate>=0&&insert>duplicate&&write>duplicate);
});
test("AT:AV se reutiliza desde currentHeaders sin segunda lectura de rango",()=>{
 assert.ok(ensure.includes('const targetHeaders = [45, 46, 47].map(index => String(currentHeaders[index] || ""));'));
 assert.ok(!ensure.includes("getRange(1, 46, 1, 3)"));
});
test("la ampliación/reparación de columnas testigo se conserva",()=>{
 assert.ok(ensure.includes("if (maxColumns < 48) sheet.insertColumnsAfter(maxColumns, 48 - maxColumns);"));
 assert.ok(ensure.includes("sheet.getRange(1, targetColumns[index]).setValue(headerNames[index]);"));
});
test("el helper devuelve el índice VIN calculado",()=>{
 assert.ok(ensure.includes("vinColumnIndex: vinColumnIndex"));
 assert.ok(ensure.includes("headers: currentHeaders"));
 assert.ok(ensure.includes("currentHeaders[targetColumns[index] - 1] = headerNames[index];"));
});
test("handleAddOrUpdateCut reutiliza el resultado y no vuelve a leer encabezados VIN",()=>{
 assert.ok(handler.includes("const testigoSchema = ensureTestigoColumns(sheet, true);"));
 assert.ok(handler.includes("const vinColumnIndex = testigoSchema.vinColumnIndex;"));
 assert.ok(!handler.includes("const vinColumnIndex = getVinColumnIndex(sheet);"));
 assert.ok(handler.includes("const headers = testigoSchema.headers;"));
 assert.ok(!handler.includes("sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]"));
});
console.log("AdminTestigoHeaderReadReuse: "+passed+"/"+passed+" PASS — encabezados compartidos, validación VIN, AT:AV y recuperación");
