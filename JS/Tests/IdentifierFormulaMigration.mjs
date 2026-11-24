import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"JS/Services/admin.js"),"utf8");
const write=fs.readFileSync(resolve(root,"JS/Services/write.js"),"utf8");
function extract(name){
 const start=admin.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=admin.indexOf("\nfunction ",start+10);
 return admin.slice(start,next<0?admin.length:next);
}
function makeSheet(name,rows,formulas=[]){
 const sheet={name,rows:rows.map(r=>r.slice()),formulas:formulas.map(r=>r.slice()),hidden:false,
  getName(){return this.name;},setName(v){this.name=v;return this;},hideSheet(){this.hidden=true;return this;},isSheetHidden(){return this.hidden;},
  getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(1,...this.rows.map(r=>r.length));},
  getRange(row,col,n=1,w=1){const self=this;return{
   getValues(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.rows[row-1+i]?.[col-1+j]??""));},
   getFormulas(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.formulas[row-1+i]?.[col-1+j]??""));},
   getValue(){return self.rows[row-1]?.[col-1]??"";},getFormula(){return self.formulas[row-1]?.[col-1]??"";},
   setValue(v){while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<col)self.rows[row-1].push("");self.rows[row-1][col-1]=v;while(self.formulas.length<row)self.formulas.push([]);while(self.formulas[row-1].length<col)self.formulas[row-1].push("");self.formulas[row-1][col-1]="";return this;},
   setValues(matrix){matrix.forEach((line,i)=>line.forEach((v,j)=>{const rr=row+i,cc=col+j;while(self.rows.length<rr)self.rows.push([]);while(self.rows[rr-1].length<cc)self.rows[rr-1].push("");self.rows[rr-1][cc-1]=v;while(self.formulas.length<rr)self.formulas.push([]);while(self.formulas[rr-1].length<cc)self.formulas[rr-1].push("");self.formulas[rr-1][cc-1]="";}));return this;},
   setFormula(v){this.setValue(self.rows[row-1]?.[col-1]??"");self.formulas[row-1][col-1]=v;return this;},
   clearContent(){return this.setValue("");}
  };},
  copyTo(ss){const copy=makeSheet("Copy",this.rows,this.formulas);ss.sheets.push(copy);return copy;}
 };
 return sheet;
}
function makeHarness(){
 const users=makeSheet("Users",[["ID","Nombre"],["U-001","Ana"],["U-002","Luis"],["U-002","Duplicado"]],[
  ["ID","Nombre"],['="U-"&TEXTO(FILA()-1,"000")'," "],['="U-"&TEXTO(FILA()-1,"000")'," "],[""," "]
 ]);
 const vehicles=makeSheet("Cortes",[["ID","Marca"],[1,"Yamaha"]],[["ID","Marca"],["=FILA()-1",""]]);
 const ignored=makeSheet("Catalogo",[["Nombre","Valor"],["x","y"]],[["Nombre","Valor"],["=ROW()",""]]);
 const ss={sheets:[users,vehicles,ignored],getSheets(){return this.sheets;},getSheetByName(n){return this.sheets.find(s=>s.name===n)||null;},
  insertSheet(n){const sh=makeSheet(n,[[]]);this.sheets.push(sh);return sh;}};
 const Utilities={DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF-8"},getUuid:()=>"12345678-1234-4234-8234-123456789012",computeDigest(_a,v){return Array.from(createHash("sha256").update(String(v),"utf8").digest()).map(b=>b>127?b-256:b);}};
 const LockService={getScriptLock:()=>({tryLock(timeout){assert.equal(timeout,0);return true;},hasLock(){return true;},releaseLock(){}})};
 const properties={};
 const PropertiesService={getScriptProperties:()=>({getProperty:key=>properties[key]??null,setProperty:(key,value)=>{properties[key]=String(value);}})};
 const SpreadsheetApp={flush(){}};
 const code=[
  extract("identifierMigrationCanonical_"),extract("identifierMigrationDigest_"),extract("identifierMigrationSheetDigest_"),
  extract("auditAllFormulaIdentifierColumns_"),extract("parseIdentifierSequenceFormula_"),
  extract("isIdentifierFormulaPatternSupported_"),extract("persistIdentifierSequenceConfigs_"),extract("buildIdentifierFormulaFreezePlan_"),
  extract("ensureIdentifierFormulaFreezeManifest_"),extract("findIdentifierFormulaFreezeManifest_"),
  extract("handleFreezeIdentifierFormulas_"),extract("getAdminFormulaBasedIdPattern_"),
  "return {audit:auditAllFormulaIdentifierColumns_,plan:buildIdentifierFormulaFreezePlan_,migrate:handleFreezeIdentifierFormulas_,pattern:getAdminFormulaBasedIdPattern_};",
 ].join("\n");
 const api=new Function("getSpreadsheet","Utilities","LockService","SpreadsheetApp","PropertiesService","verifyVinMigrationBackup",code)(()=>ss,Utilities,LockService,SpreadsheetApp,PropertiesService,()=>({backupId:"verified-test-backup"}));
 return {ss,users,vehicles,api};
}
let passed=0;function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("Audita columnas ID en hojas múltiples y conserva fórmula/valor en muestras",()=>{
 const h=makeHarness(),r=h.api.audit(h.ss);
 assert.equal(r.formulaColumnCount,2);assert.equal(r.formulaCount,3);
 const user=r.formulaColumns.find(x=>x.sheet==="Users");
 assert.equal(user.samples[0].id,"U-001");assert.equal(user.samples[0].formula,'="U-"&TEXTO(FILA()-1,"000")');
 assert.equal(r.formulaColumns.some(x=>x.sheet==="Catalogo"),false);
});
test("La simulación de migración no escribe ni crea snapshots/manifiestos",()=>{
 const h=makeHarness(),before=h.ss.sheets.length;
 const r=h.api.migrate({dryRun:true,batchSize:1});
 assert.equal(r.status,"success");assert.equal(r.dryRun,true);
 assert.equal(r.formulaCount,2);assert.equal(r.patternRecognizedCount,2);assert.equal(r.patternUnsupportedCount,0);
 assert.equal(r.skipped.duplicate,1);
 assert.equal(h.ss.sheets.length,before);assert.equal(h.users.formulas[1][0],'="U-"&TEXTO(FILA()-1,"000")');
});
test("Congela valores exactos por lotes, reanuda y conserva snapshots/manifiesto",()=>{
 const h=makeHarness(),dry=h.api.migrate({dryRun:true,batchSize:1});
 const payload={dryRun:false,confirm:true,migrationId:dry.migrationId,digest:dry.digest,batchSize:1};
 const first=h.api.migrate(payload);
 assert.equal(first.migrated,1);assert.equal(first.remaining,1);assert.equal(first.sequenceConfig.configured,1);assert.equal(first.sequenceConfig.numericOnly,1);assert.equal(first.sequenceConfig.unsupported,0);
 assert.equal(h.users.rows[1][0],"U-001");assert.equal(h.users.formulas[1][0],"");
 const second=h.api.migrate(payload);
 assert.equal(second.migrated,1);assert.equal(second.remaining,0);assert.equal(second.complete,true);assert.equal(h.vehicles.rows[1][0],1);
 assert.equal(h.vehicles.formulas[1][0],"");
 assert.ok(h.ss.getSheetByName("__IdentifierFormulaFreezeManifest__"));
 const config=h.ss.getSheetByName("__IdentifierSequenceConfig__");
 assert.ok(config);assert.equal(config.rows.length,2);
 assert.ok(h.ss.sheets.some(s=>s.name.startsWith("__IDF_")&&s.hidden));
});
test("Los escritores ADMIN y WRITE no copian fórmulas al crear registros",()=>{
 const activity=extract("recordImageAdministrationActivity");
 assert.match(activity,/getAdminFormulaBasedIdPattern_\(sheet,\s*1\)/);
 assert.match(activity,/sheet\.appendRow\(\[/);
 assert.doesNotMatch(activity,/copyTo\(newRowRange\)/);
 assert.match(admin,/function copyAdminRowPresentationOnly_\(sheet,\s*sourceRow,\s*targetRow,\s*lastColumn\)/);
 assert.match(admin,/copyAdminRowPresentationOnly_\(sheet,\s*lastRow,\s*newRow,\s*lastColumn\)/);
 assert.doesNotMatch(write,/previousRowRange\.copyTo\(newRowRange\);/);
 assert.match(write,/previousRowRange\.copyTo\(newRowRange,\s*SpreadsheetApp\.CopyPasteType\.PASTE_FORMAT/);
});
test("el helper de actividad detecta el patrón ID sin reservar una secuencia",()=>{
 const h=makeHarness();
 const pattern=h.api.pattern(h.users,1);
 assert.equal(pattern.prefix,"U-");assert.equal(pattern.padding,3);
 assert.equal(pattern.formula,"=\"U-\"&TEXTO(FILA()-1,\"000\")");
});
test("No congela fórmulas ID cuyo patrón no puede migrarse a un generador backend seguro",()=>{
 const h=makeHarness();
 const relay=makeSheet("Relay",[["ID","Nombre"],["R-001","Relay A"]],[["ID","Nombre"],['=CONCAT("R-",ROW())',""]]);
 h.ss.sheets.push(relay);
 const r=h.api.migrate({dryRun:true});
 assert.equal(r.formulaCount,2);
 assert.equal(r.skipped.unsupportedPattern,1);
 assert.equal(r.samples.some(item=>item.sheet==="Relay"),false);
});
test("Rechaza una simulación obsoleta antes de crear snapshots o escribir",()=>{
 const h=makeHarness(),dry=h.api.migrate({dryRun:true});
 h.users.rows[1][1]="Dato cambiado";
 assert.throws(()=>h.api.migrate({dryRun:false,confirm:true,migrationId:dry.migrationId,digest:dry.digest}),/cambió desde la simulación/);
 assert.match(h.users.formulas[1][0],/TEXTO/);
});
console.log("IdentifierFormulaMigration: "+passed+"/"+passed+" PASS");
