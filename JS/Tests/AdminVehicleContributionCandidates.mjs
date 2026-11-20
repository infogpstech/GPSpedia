import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const start = admin.indexOf("function handleGetVehicleContributionCandidates_(payload)");
const end = admin.indexOf("\nfunction handleMigrateVehicleContributionsSchema", start);
assert.ok(start >= 0 && end > start, "No se encontró el handler de candidatos ADMIN");
const handler = admin.slice(start, end);
function run(response, payload = {}) {
    const calls = [];
    const fetch = { fetch(url, options) {
        calls.push({ url, options });
        return { getResponseCode: () => response.http || 200, getContentText: () => JSON.stringify(response.body) };
    }};
    const fn = new Function("UrlFetchApp", "CATALOG_SERVICE_URL", handler + "\nreturn handleGetVehicleContributionCandidates_;")(fetch, "https://catalog.test/exec");
    return { result: fn(payload), calls };
}
const catalog = { status: "success", data: { cortes: [
    { id: "22", marca: "Toyota", modelo: "Hilux", contributionCandidates: [
        { eventId: "EV-B", opId: "OP-B", kind: "cut", reason: "vin_conflict", payload: { tipo: "Ignición", vinPrefix: "X" } }
    ]},
    { id: "3", marca: "Nissan", modelo: "Frontier", contributionCandidates: [
        { eventId: "EV-A", opId: "OP-A", kind: "feed", reason: "feed_capacity_full", payload: { text: "12V", image: "FILE_ID" } }
    ]},
    { id: "9", contributionCandidates: [] }
]}};
{
 const {result,calls}=run({body:catalog});
 assert.equal(result.status,"success"); assert.equal(result.total,2); assert.equal(result.candidates.length,2);
 assert.equal(result.candidates[0].vehicleId,"3"); assert.equal(result.candidates[0].reason,"feed_capacity_full");
 assert.equal(result.candidates[1].reason,"vin_conflict"); assert.equal(result.readOnly,true);
 assert.equal(calls.length,1); assert.equal(JSON.parse(calls[0].options.payload).payload.forceRefresh,true);
}
{
 const {result}=run({body:catalog},{limit:1});
 assert.equal(result.total,2); assert.equal(result.candidates.length,1); assert.equal(result.truncated,true);
}
assert.throws(()=>run({http:503,body:catalog}),/No se pudo obtener la proyección vigente/);
assert.throws(()=>run({body:{status:"error",data:{}}}),/No se pudo obtener la proyección vigente/);
assert.throws(()=>run({body:{status:"success",data:{cortes:{}}}}),/No se pudo obtener la proyección vigente/);
assert.ok(admin.includes("case 'getVehicleContributionCandidates':"),"La acción debe estar registrada en el router ADMIN");
console.log("AdminVehicleContributionCandidates: 6/6 PASS — proyección actual, límites, orden, errores y router");

const adminUi = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const imagePreviewStart = adminUi.indexOf("const candidateImageUrl=");
const imagePreviewEnd = adminUi.indexOf("const editor=document.createElement(\"textarea\")", imagePreviewStart);
assert.ok(imagePreviewStart >= 0 && imagePreviewEnd > imagePreviewStart, "La tarjeta ADMIN debe inspeccionar imágenes del candidato antes de mostrar el editor");
const imagePreview = adminUi.slice(imagePreviewStart, imagePreviewEnd);
assert.match(imagePreview, /candidatePayload\.image/);
assert.match(imagePreview, /candidatePayload\.fieldName/);
assert.ok(imagePreview.includes("https://drive.google.com/file/d/"), "La vista previa solo acepta la URL canónica de Drive");
assert.match(imagePreview, /image\.src=candidateImageUrl/);
assert.match(imagePreview, /imageLink\.target="_blank"/);
assert.match(imagePreview, /imageLink\.rel="noopener noreferrer"/);
assert.match(imagePreview, /image\.referrerPolicy="no-referrer"/);
assert.match(adminUi, /if\(imagePreview\)card\.appendChild\(imagePreview\)/);
console.log("AdminVehicleContributionCandidateImagePreview: 8/8 PASS — candidatos conservan vista previa y enlace seguro de imagen");

