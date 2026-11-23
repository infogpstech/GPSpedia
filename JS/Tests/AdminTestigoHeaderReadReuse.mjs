import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
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
 const write=ensure.indexOf("sheet.getRange(1, targetColumns[0], 1, headerNames.length).setValues([headerNames])");
 assert.ok(duplicate>=0&&insert>duplicate&&write>duplicate);
});
test("AT:AV se reutiliza desde currentHeaders sin segunda lectura de encabezados",()=>{
 assert.ok(ensure.includes('const targetHeaders = [45, 46, 47].map(index => String(currentHeaders[index] || ""));'));
 assert.ok(!ensure.includes("getRange(1, 1, 1, lastColumn)", ensure.indexOf("const targetHeaders")));
});
test("las columnas sin encabezado se validan con una lectura contigua compartida",()=>{
 assert.ok(ensure.includes("const missingHeaderIndexes = [];"));
 assert.ok(ensure.includes("if (missingHeaderIndexes.length) {"));
 assert.ok(ensure.includes("const missingColumnsData = sheet.getRange(2, targetColumns[firstMissingIndex], lastRow - 1,"));
 assert.ok(ensure.includes("const offset = index - firstMissingIndex;"));
 assert.equal((ensure.match(/getRange\(2, targetColumns\[index\], lastRow - 1, 1\)/g)||[]).length,0);
});
test("la ampliación/reparación de columnas testigo se conserva",()=>{
 assert.ok(ensure.includes("if (maxColumns < 48) sheet.insertColumnsAfter(maxColumns, 48 - maxColumns);"));
 assert.ok(ensure.includes("const headersNeedWrite = headerNames.some((name, index) =>"));
 assert.ok(ensure.includes("if (headersNeedWrite) {"));
 assert.ok(ensure.includes("sheet.getRange(1, targetColumns[0], 1, headerNames.length).setValues([headerNames]);"));
 assert.equal((ensure.match(/setValues\(\[headerNames\]\)/g)||[]).length,1);
 assert.equal((ensure.match(/targetColumns\[index\]\)\.setValue\(/g)||[]).length,0);
});
test("el helper devuelve el índice VIN calculado",()=>{
 assert.ok(ensure.includes("vinColumnIndex: vinColumnIndex"));
 assert.ok(ensure.includes("headers: currentHeaders"));
 assert.ok(ensure.includes("currentHeaders[targetColumns[index] - 1] = headerNames[index];"));
});
test("WRITE valida encabezados testigo y VIN antes de la mutación",()=>{
 assert.ok(handler.includes("ensureTestigoColumns(sheet);"));
 assert.ok(handler.includes("const vinColumnIndex = getVinColumnIndex(sheet);"));
 assert.ok(handler.indexOf("ensureTestigoColumns(sheet);") < handler.indexOf("getVinColumnIndex(sheet);"));
 assert.ok(handler.includes("const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];"));
});
console.log("AdminTestigoHeaderReadReuse: "+passed+"/"+passed+" PASS — encabezados compartidos, validación VIN, AT:AV y recuperación");
