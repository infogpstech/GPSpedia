import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
const start=source.indexOf("function logUserActivity(userId, userName, activityType, associatedId, details) {");
const end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró logUserActivity");
const fn=source.slice(start,end);
assert.match(fn,/getFormulaBasedIdPattern_\(sheet, COLS_ACTIVIDAD_USUARIO\.id\)/);
assert.match(fn,/sheet\.appendRow\(row\)/);
assert.match(fn,/pattern\.formula/);
assert.match(fn,/ACT-"\s*\+\s*Utilities\.getUuid\(\)/);
assert.doesNotMatch(fn,/getNextFormulaBasedId_|LockService|tryLock|waitLock|newRowNumber|copyRowPresentationOnly_|setValue\(/);
assert.ok(fn.indexOf("sheet.appendRow(row)")<fn.indexOf("SpreadsheetApp.flush()"));

function runLogger({patternError=null,pattern={formula:'="ACT-"&TEXT(ROW()-1,"000")'},initialRows=1}={}){
 const rows=Array.from({length:initialRows},(_,i)=>i===0?["id","timestamp","idUsuario","nombreUsuario","tipoActividad","idElementoAsociado","detalle"]:["ACT-OLD","2026-01-01T00:00:00Z","U0","Old","like","V0","old"]);
 const sheet={getName:()=>"ActividadUsuario",getLastRow:()=>rows.length,getRange:()=>({getValue:()=>"id"}),appendRow(row){rows.push(row.slice());}};
 let uuid=0,logged=[];
 const logger=new Function("getSafeSheet","SHEET_NAMES","COLS_ACTIVIDAD_USUARIO","getFormulaBasedIdPattern_","Utilities","SpreadsheetApp","Logger",fn+"\nreturn logUserActivity;")(
  ()=>sheet,{ACTIVIDAD_USUARIO:"ActividadUsuario"},{id:1},()=>{if(patternError)throw new Error(patternError);return pattern,
  {getUuid:()=>"uuid-"+(++uuid)},{flush(){}},{log:value=>logged.push(String(value))}
 );
 logger("U1","Tech","view_vehicle","V1","details");
 return{rows,logged};
}
const empty=runLogger({patternError:"No existe una fórmula ni configuración previa para generar IDs en ActividadUsuario.",initialRows:1});
assert.equal(empty.rows.length,2,"Debe registrar el primer evento en una hoja vacía.");
assert.equal(empty.rows[1][0],"ACT-uuid-1","El primer evento debe recibir un ID estático único.");
assert.equal(empty.rows[1][4],"view_vehicle");
assert.equal(empty.logged.length,0);
const legacy=runLogger({patternError:"No se ha confirmado el patrón backend de ID para ActividadUsuario.",initialRows:2});
assert.equal(legacy.rows.length,3,"Debe continuar registrando cuando la hoja solo contiene IDs estáticos.");
assert.equal(legacy.rows[2][0],"ACT-uuid-1");
const formula=runLogger();
assert.equal(formula.rows[1][0],'="ACT-"&TEXT(ROW()-1,"000")',"Debe conservar el patrón secuencial cuando ya existe.");
const invalid=runLogger({patternError:"La fórmula ID de ActividadUsuario no tiene un patrón secuencial compatible; se requiere revisión."});
assert.equal(invalid.rows.length,1,"Un patrón incompatible debe fallar cerrado.");
assert.equal(invalid.logged.length,1,"El fallo debe quedar registrado en Logger.");
console.log("ActivityLogAppendAtomic: 10/10 PASS — appendRow, fórmula histórica y UUID de arranque sin patrón");
