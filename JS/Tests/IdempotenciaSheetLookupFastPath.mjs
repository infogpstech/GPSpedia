import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=source.indexOf("function findOrCreateIdempotenciaSheet(");
const end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró findOrCreateIdempotenciaSheet");
const code=source.slice(start,end);
function makeLookup({primary=null,fallback=null,states={},unsafeReasons=[]}={}){
 const events=[],created={name:"new-sheet"};
 const ss={getSheetByName(name){events.push("get:"+name);return name==="Idempotencia"?primary:fallback;}};
 const fn=new Function("getSpreadsheet","SHEET_NAMES","getIdempotenciaHeaderState","isUnsafeIdempotenciaHeaderState_","initializeIdempotenciaSheet","createIdempotenciaSheetIfMissing",code+"\nreturn findOrCreateIdempotenciaSheet;")(
  ()=>ss,{IDEMPOTENCIA:"Idempotencia",IDEMPOTENCIA_FALLBACK:"Idempotencia_Cortes"},
  sheet=>{events.push("state:"+sheet.name);return states[sheet.name];},
  state=>unsafeReasons.includes(state.reason),
  sheet=>{events.push("initialize:"+sheet.name);return sheet;},
  (spreadsheet,name)=>{events.push("create:"+name);return created;}
 );
 return{run:()=>fn(),events,created};
}
let passed=0;function test(name,fn){fn();passed++;}
test("hoja primaria compatible y completa se devuelve sin inicializar",()=>{
 const primary={name:"primary"},h=makeLookup({primary,states:{primary:{compatible:true,missingIndexes:[]}}});
 assert.equal(h.run(),primary);
 assert.ok(!h.events.includes("initialize:primary"));
});
test("hoja primaria compatible con encabezado faltante sí se repara",()=>{
 const primary={name:"primary"},h=makeLookup({primary,states:{primary:{compatible:true,missingIndexes:[5]}}});
 assert.equal(h.run(),primary);
 assert.ok(h.events.includes("initialize:primary"));
});
test("fallback compatible y completo se devuelve sin inicializar",()=>{
 const fallback={name:"fallback"},h=makeLookup({fallback,states:{fallback:{compatible:true,missingIndexes:[]}}});
 assert.equal(h.run(),fallback);
 assert.ok(!h.events.includes("initialize:fallback"));
});
test("fallback con encabezado faltante se repara",()=>{
 const fallback={name:"fallback"},h=makeLookup({fallback,states:{fallback:{compatible:true,missingIndexes:[5]}}});
 assert.equal(h.run(),fallback);
 assert.ok(h.events.includes("initialize:fallback"));
});
test("estado inseguro de hoja primaria detiene la operación sin cambiar a fallback",()=>{
 const primary={name:"primary"},fallback={name:"fallback"},h=makeLookup({
  primary,fallback,states:{primary:{compatible:false,reason:"missing_header_with_data"}},unsafeReasons:["missing_header_with_data"]
 });
 assert.throws(()=>h.run(),/datos bajo un encabezado vacío/);
 assert.ok(!h.events.includes("initialize:primary")&&!h.events.includes("initialize:fallback"));
});
test("hoja inexistente se crea e inicializa",()=>{
 const h=makeLookup();
 assert.equal(h.run(),h.created);
 assert.ok(h.events.includes("create:Idempotencia"));
 assert.ok(h.events.includes("initialize:new-sheet"));
});
console.log("IdempotenciaSheetLookupFastPath: "+passed+"/"+passed+" PASS — hojas completas sin validación integral repetida");
