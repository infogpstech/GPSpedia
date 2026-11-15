import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(resolve(root,"JS/Services/feedback.js"),"utf8");
function extract(name){
 const start=source.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=source.indexOf("\nfunction ",start+10);
 return source.slice(start,next<0?source.length:next);
}
function sheet(name,rows,formulas=[]){
 return {name,rows:rows.map(r=>r.slice()),formulas:formulas.map(r=>r.slice()),getName(){return this.name;},
  getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(1,...this.rows.map(r=>r.length));},
  getRange(row,col,n=1,w=1){const self=this;return{
   getValue(){return self.rows[row-1]?.[col-1]??"";},
   getValues(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.rows[row-1+i]?.[col-1+j]??""));},
   getFormulas(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.formulas[row-1+i]?.[col-1+j]??""));},
   setValues(values){values.forEach((line,i)=>line.forEach((v,j)=>{self.rows[row-1+i]??=[];self.rows[row-1+i][col-1+j]=v;}));return this;},
   setValue(value){self.rows[row-1]??=[];self.rows[row-1][col-1]=value;return this;}
  };}};
}
function harness(initial,config=null){
 const props={};let held=false,waits=0,releases=0;
 const ss={sheets:[initial],getSheetByName(name){return this.sheets.find(s=>s.name===name)||null;}};
 if(config)ss.sheets.push(config);
 const lock={hasLock:()=>held,waitLock(){held=true;waits++;},releaseLock(){held=false;releases++;}};
 const PropertiesService={getScriptProperties:()=>({getProperty:key=>props[key]??null,setProperty:(key,value)=>{props[key]=String(value);}})};
 const code=[
  'const IDENTIFIER_SEQUENCE_CONFIG_SHEET="__IdentifierSequenceConfig__";',
  'const IDENTIFIER_SEQUENCE_CONFIG_HEADERS=["sheet","column","header","prefix","padding","formula","updatedAt"];',
  extract("parseFeedbackIdFormula_"),extract("getFormulaBasedIdPattern_"),extract("getNextFormulaBasedId_")
 ].join("\n");
 const api=new Function("getSpreadsheet","LockService","PropertiesService",code)(()=>ss,{getScriptLock:()=>lock},PropertiesService);
 return {api,ss,props,stats:()=>({waits,releases,held})};
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
const formula='="U-"&TEXTO(FILA()-1,"000")';
test("Los escritores de actividad, sugerencias y contacto asignan IDs desde backend",()=>{
 for (const name of ["handleSuggestYearLocked","logUserActivity","handleSuggestCutChange","handleSendContactForm"]) {
  assert.match(extract(name),/getNextFormulaBasedId_/,name+" debe asignar el ID desde backend");
 }
 assert.match(source,/copyRowPresentationOnly_\(sheet,\s*sourceRow,\s*targetRow/);
 assert.match(source,/CopyPasteType\.PASTE_FORMAT/);
 assert.match(source,/CopyPasteType\.PASTE_DATA_VALIDATION/);
});
test("Reconoce fórmula U-001 y conserva prefijo y relleno",()=>{
 const h=harness(sheet("Users",[["ID"],["U-001"],["U-002"]],[["ID"],[formula],[formula]]));
 assert.equal(h.api.getFormulaBasedIdPattern_(h.ss.sheets[0],1).prefix,"U-");
 assert.equal(h.api.getFormulaBasedIdPattern_(h.ss.sheets[0],1).padding,3);
});
test("Asigna IDs backend secuenciales y bloqueados sin copiar fórmulas",()=>{
 const h=harness(sheet("Users",[["ID"],["U-001"],["U-002"]],[["ID"],[formula],[formula]]));
 assert.equal(h.api.getNextFormulaBasedId_(h.ss.sheets[0],1),"U-003");
 assert.equal(h.api.getNextFormulaBasedId_(h.ss.sheets[0],1),"U-004");
 assert.equal(h.props.GPSpedia_ID_SEQUENCE_Users_1_U_,"4");
 assert.deepEqual(h.stats(),{waits:2,releases:2,held:false});
});
test("Usa configuración persistida después de congelar las fórmulas",()=>{
 const config=sheet("__IdentifierSequenceConfig__",[
  ["sheet","column","header","prefix","padding","formula","updatedAt"],
  ["Users",1,"ID","U-",3,formula,"2026-11-15"]
 ]);
 const users=sheet("Users",[["ID"],["U-009"],["U-010"]],[["ID"],[""],[""]]);
 const h=harness(users,config);
 assert.equal(h.api.getNextFormulaBasedId_(users,1),"U-011");
});
test("Detiene asignación si el patrón es desconocido, inconsistente o los IDs están duplicados",()=>{
 const unknown=harness(sheet("Relay",[["ID"],["R-001"]],[["ID"],['=CONCAT("R-",ROW())']]));
 assert.throws(()=>unknown.api.getNextFormulaBasedId_(unknown.ss.sheets[0],1),/patrón secuencial compatible/);
 const mixed=harness(sheet("Users",[["ID"],["U-001"],["X-002"]],[["ID"],[formula],['="X-"&TEXTO(FILA()-1,"000")']]));
 assert.throws(()=>mixed.api.getNextFormulaBasedId_(mixed.ss.sheets[0],1),/patrones diferentes/);
 const duplicate=harness(sheet("Users",[["ID"],["U-001"],["U-001"]],[["ID"],[formula],[formula]]));
 assert.throws(()=>duplicate.api.getNextFormulaBasedId_(duplicate.ss.sheets[0],1),/ID duplicado/);
});
console.log("FeedbackFormulaIdAllocator: "+passed+"/"+passed+" PASS");
