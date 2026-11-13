import fs from "node:fs";
import assert from "node:assert/strict";
const schema=fs.readFileSync("Spreadsheet/GPSpedia_DB_columnas.md","utf8");
const feedback=fs.readFileSync("Services/feedback.js","utf8");
const section=schema.slice(schema.indexOf("### Hoja `Feedbacks`"),schema.indexOf("### Hoja `Contactanos`"));
const ensure=feedback.slice(feedback.indexOf("function ensureSuggestionActorColumn("),feedback.indexOf("\nfunction getReportMetadataColumn("));
const results=[];function test(name,fn){fn();results.push(name);}
test("nueve columnas base y orden",()=>{const h=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"];let p=-1;for(const x of h){const n=section.indexOf("`"+x+"`");assert.ok(n>p,x);p=n;}});
test("encabezado y ubicación dinámica",()=>{assert.ok(section.includes("`suggestionActorKey`"));assert.ok(section.includes("headerWidth + 1"));assert.match(ensure,/const newColumn = headerWidth \+ 1/);});
test("actor autenticado derivado de sesión",()=>{assert.ok(section.includes("`user:<ID>`"));assert.match(feedback,/assertFeedbackSession\(payload, null\)/);assert.match(feedback,/"user:" \+ actor\.userId/);});
test("actor anónimo no verificable",()=>{assert.ok(section.includes("`anon:unverified`"));assert.ok(feedback.includes('return "anon:unverified"'));});
test("marca applied: documentada",()=>{assert.ok(section.includes("`applied:<clave-original>`"));assert.match(feedback,/"applied:" \+ String\(actorKey/);});
test("idempotencia y rechazo de encabezados incompatibles",()=>{assert.ok(section.includes("reutiliza su posición"));assert.match(ensure,/actorPositions\.length > 1/);assert.match(ensure,/actorPositions\[0\] <= expectedHeaders\.length/);assert.ok(ensure.includes("if (actorPositions.length === 1) return actorPositions[0]"));});
test("compatibilidad histórica sin atribución artificial",()=>{assert.ok(section.includes("No se asigna retrospectivamente una identidad"));assert.ok(section.includes("no representan votos autenticados"));});
test("respaldo y restauración",()=>{assert.ok(section.includes("deben incluir la fila 1 y todas las columnas utilizadas"));assert.ok(section.includes("respaldo histórico de nueve columnas"));assert.ok(section.includes("no reconstruirá ni inventará claves"));});
console.log("SuggestionActorSchemaDocumentation: "+results.length+"/8 PASS");
