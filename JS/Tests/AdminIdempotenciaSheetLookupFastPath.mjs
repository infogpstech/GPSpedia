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
test("ADMIN devuelve la hoja primaria completa sin reinicializar el ledger",()=>{
 const primary={name:"primary"},h=makeLookup({primary,states:{primary:{compatible:true,missingIndexes:[]}}});
 assert.equal(h.run(),primary);
 assert.ok(!h.events.includes("initialize:primary"));
});
test("ADMIN repara encabezados faltantes de la hoja primaria",()=>{
 const primary={name:"primary"},h=makeLookup({primary,states:{primary:{compatible:true,missingIndexes:[5]}}});
 assert.equal(h.run(),primary);
 assert.ok(h.events.includes("initialize:primary"));
});
test("ADMIN devuelve fallback completo sin reinicializarlo",()=>{
 const fallback={name:"fallback"},h=makeLookup({fallback,states:{fallback:{compatible:true,missingIndexes:[]}}});
 assert.equal(h.run(),fallback);
 assert.ok(!h.events.includes("initialize:fallback"));
});
test("ADMIN repara encabezados faltantes en fallback",()=>{
 const fallback={name:"fallback"},h=makeLookup({fallback,states:{fallback:{compatible:true,missingIndexes:[5]}}});
 assert.equal(h.run(),fallback);
 assert.ok(h.events.includes("initialize:fallback"));
});
test("ADMIN detiene estado inseguro de hoja primaria sin cambiar a fallback",()=>{
 const primary={name:"primary"},fallback={name:"fallback"},h=makeLookup({
  primary,fallback,states:{primary:{compatible:false,reason:"missing_header_with_data"}},unsafeReasons:["missing_header_with_data"]
 });
 assert.throws(()=>h.run(),/datos bajo un encabezado vacío/);
 assert.ok(!h.events.includes("initialize:primary")&&!h.events.includes("initialize:fallback"));
});
test("ADMIN crea e inicializa la hoja cuando no existe ninguna",()=>{
 const h=makeLookup();
 assert.equal(h.run(),h.created);
 assert.ok(h.events.includes("create:Idempotencia"));
 assert.ok(h.events.includes("initialize:new-sheet"));
});
console.log("AdminIdempotenciaSheetLookupFastPath: "+passed+"/"+passed+" PASS");
