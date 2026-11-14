import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const admin=fs.readFileSync(resolve(root,"Services/admin.js"),"utf8");
function extract(name){
 const start=admin.indexOf("function "+name+"(");
 assert.ok(start>=0,"No se encontró "+name);
 const next=admin.indexOf("\nfunction ",start+10);
 return admin.slice(start,next<0?admin.length:next);
}
function makeSheet(name,rows,formulas=[]){
 let hidden=false;
 const sheet={
  name,rows:rows.map(r=>r.slice()),formulas:formulas.map(r=>r.slice()),
  getName(){return this.name;},setName(v){this.name=v;return this;},hideSheet(){hidden=true;return this;},isSheetHidden(){return hidden;},
  getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(1,...this.rows.map(r=>r.length));},
  getDataRange(){return this.getRange(1,1,this.getLastRow(),this.getLastColumn());},
  getRange(row,col,n=1,w=1){const self=this;return{
   getValues(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.rows[row-1+i]?.[col-1+j]??""));},
   getFormulas(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.formulas[row-1+i]?.[col-1+j]??""));},
   getValue(){return self.rows[row-1]?.[col-1]??"";},getFormula(){return self.formulas[row-1]?.[col-1]??"";},
   setValue(v){while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<col)self.rows[row-1].push("");self.rows[row-1][col-1]=v;while(self.formulas.length<row)self.formulas.push([]);while(self.formulas[row-1].length<col)self.formulas[row-1].push("");self.formulas[row-1][col-1]="";return this;},
   setFormula(v){this.setValue(self.rows[row-1]?.[col-1]??"");self.formulas[row-1][col-1]=v;return this;},
   clearContent(){return this.setValue("");},
   setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>{while(self.rows.length<row+i)self.rows.push([]);while(self.rows[row-1+i].length<col+j)self.rows[row-1+i].push("");self.rows[row-1+i][col-1+j]=v;while(self.formulas.length<row+i)self.formulas.push([]);while(self.formulas[row-1+i].length<col+j)self.formulas[row-1+i].push("");self.formulas[row-1+i][col-1+j]="";}));return this;}
  };},
  copyTo(ss){const copy=makeSheet("Copy",this.rows,this.formulas);ss.sheets.push(copy);return copy;}
 };
 return sheet;
}
function makeSpreadsheet(initial){
 const ss={sheets:Object.values(initial),getSheetByName(name){return this.sheets.find(s=>s.name===name)||null;},insertSheet(name){const s=makeSheet(name,[[]]);this.sheets.push(s);return s;}};
 return ss;
}
function makeUtilities(){
 return {DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF-8"},computeDigest(_alg,value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}const out=[];for(let i=0;i<32;i++)out.push((h>>>((i%4)*8))&255);return out;}};
}
function makeHarness(initial){
 const ss=makeSpreadsheet(initial);
 const fn=new Function("getSpreadsheet","Utilities","SpreadsheetApp","Date",
  "const IDENTIFIER_MIGRATION_MANIFEST_SHEET_ = \"__IdentifierMigrationManifest__\";\nconst IDENTIFIER_MIGRATION_MANIFEST_HEADERS_ = [\"migrationId\",\"manifestDigest\",\"entryIndex\",\"entryJson\",\"status\",\"batch\",\"createdAt\",\"updatedAt\",\"lastError\"];\nconst IDENTIFIER_MIGRATION_ENTITIES_ = Object.freeze({\n users:{sheet:\"Users\",idColumn:1,headers:[\"id\"],kind:\"user\",numeric:false},\n vehicle:{sheet:\"Cortes\",idColumn:1,headers:[\"id\"],kind:\"vehicle\",numeric:true},\n tutorial:{sheet:\"Tutorial\",idColumn:1,headers:[\"id\"],kind:\"tutorial\",numeric:false},\n problem:{sheet:\"pys\",idColumn:1,headers:[\"id_problem\"],kind:\"problem\",numeric:false},\n logo:{sheet:\"LogosMarca\",idColumn:1,headers:[\"id\"],kind:\"logo\",numeric:true}\n});\n"+"\n"+
  extract("identifierMigrationCanonical_")+extract("identifierMigrationDigest_")+extract("identifierMigrationNormalizeId_")+
  extract("identifierMigrationValidId_")+extract("identifierMigrationReadRow_")+extract("identifierMigrationRowDigest_")+
  extract("identifierMigrationSheetDigest_")+extract("identifierMigrationUniqueKey_")+extract("identifierMigrationIdCount_")+
  extract("identifierMigrationBuildPlan_")+extract("identifierMigrationEnsureSnapshot_")+extract("identifierMigrationEnsureManifestSheet_")+
  extract("identifierMigrationFindManifest_")+extract("identifierMigrationWriteManifestStatus_")+extract("identifierMigrationReadEntry_")+
  extract("handleMigrateIdentifiers_")+extract("handleRollbackIdentifiers_")+
  "return {migrate:handleMigrateIdentifiers_,rollback:handleRollbackIdentifiers_};"
 )( ()=>ss,makeUtilities(),{flush(){}},Date);
 return {ss,fn};
}
const makeBase=()=>({
 Users:makeSheet("Users",[["ID","Username","Name"],["USR-0001","alpha","Alpha"],["","beta","Beta"]]),
 Cortes:makeSheet("Cortes",[["id","marca","modelo"],[1,"Toyota","Yaris"]]),
 Tutorial:makeSheet("Tutorial",[["ID","tema"],["tut-op1","Tema"]]),
 pys:makeSheet("pys",[["id_problem","problema"],["isue-001","Problema"]]),
 LogosMarca:makeSheet("LogosMarca",[["id","nombreMarca"],[1,"Toyota"]])
});
const change={migrationId:"idm-test-0001",changes:[{entity:"users",mode:"fill_missing",row:3,keyColumn:2,keyValue:"beta",oldId:"",newId:"USR-0002"}],dryRun:true};
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("dry-run genera digest y no crea manifiesto ni snapshot",()=>{
 const h=makeHarness(makeBase()),before=h.ss.sheets.length;
 const result=h.fn.migrate(change);
 assert.equal(result.status,"success");assert.equal(result.dryRun,true);assert.match(result.manifestDigest,/^[a-f0-9]{64}$/);
 assert.equal(h.ss.sheets.length,before);assert.equal(h.ss.getSheetByName("Users").rows[2][0],"");
});
testCase("rechaza Relay y formatos de ID desconocidos",()=>{
 const h=makeHarness(makeBase());
 assert.throws(()=>h.fn.migrate({...change,changes:[{...change.changes[0],entity:"relay"}]}),/Relay permanece/);
 assert.throws(()=>h.fn.migrate({...change,changes:[{...change.changes[0],newId:"bad"}]}),/formato vigente/);
});
testCase("rechaza claves no únicas y cambios de IDs válidos",()=>{
 const data=makeBase();data.Users.rows.push(["","beta","Otro"]);
 const h=makeHarness(data);
 assert.throws(()=>h.fn.migrate(change),/clave estable no identifica exactamente/);
 const h2=makeHarness(makeBase());
 assert.throws(()=>h2.fn.migrate({...change,changes:[{entity:"users",mode:"fill_missing",row:2,keyColumn:2,keyValue:"alpha",oldId:"USR-0001",newId:"USR-0002"}]}),/celda ID realmente vacía/);
});
testCase("aplica snapshot y primer lote verificando cada fila",()=>{
 const h=makeHarness(makeBase());
 const dry=h.fn.migrate(change);
 const result=h.fn.migrate({...change,dryRun:false,confirm:true,manifestDigest:dry.manifestDigest,batchSize:5});
 assert.equal(result.status,"success");assert.equal(result.verified,1);
 assert.equal(h.ss.getSheetByName("Users").rows[2][0],"USR-0002");
 assert.ok(h.ss.getSheetByName("__IDM_idm-test-0001_users"));
 assert.ok(h.ss.getSheetByName("__IdentifierMigrationManifest__"));
});
testCase("reanudar una migración verificada es idempotente",()=>{
 const h=makeHarness(makeBase()),dry=h.fn.migrate(change),payload={...change,dryRun:false,confirm:true,manifestDigest:dry.manifestDigest};
 const first=h.fn.migrate(payload),second=h.fn.migrate(payload);
 assert.equal(first.verified,1);assert.equal(second.verified,1);assert.equal(second.remaining,0);
 assert.equal(h.ss.getSheetByName("Users").rows[2][0],"USR-0002");
});
testCase("rollback restaura valor original y conserva manifiesto/snapshot",()=>{
 const h=makeHarness(makeBase()),dry=h.fn.migrate(change);
 h.fn.migrate({...change,dryRun:false,confirm:true,manifestDigest:dry.manifestDigest});
 const result=h.fn.rollback({migrationId:change.migrationId,manifestDigest:dry.manifestDigest,dryRun:false,confirm:true});
 assert.equal(result.status,"success");assert.equal(result.rolledBack,1);
 assert.equal(h.ss.getSheetByName("Users").rows[2][0],"");
 assert.ok(h.ss.getSheetByName("__IdentifierMigrationManifest__"));
 assert.ok(h.ss.getSheetByName("__IDM_idm-test-0001_users"));
});
testCase("rollback se detiene ante cambios posteriores ajenos",()=>{
 const h=makeHarness(makeBase()),dry=h.fn.migrate(change);
 h.fn.migrate({...change,dryRun:false,confirm:true,manifestDigest:dry.manifestDigest});
 h.ss.getSheetByName("Users").rows[2][2]="Modificado externamente";
 assert.throws(()=>h.fn.rollback({migrationId:change.migrationId,manifestDigest:dry.manifestDigest,dryRun:false,confirm:true}),/cambió después/);
});
testCase("congela fórmula sin renumerar y puede restaurarla",()=>{
 const data=makeBase();data.Users.rows[1][0]="USR-0001";data.Users.formulas=[["ID"],["=ROW()-1"]];
 const h=makeHarness(data);
 const proposal={migrationId:"idm-formula-01",changes:[{entity:"users",mode:"freeze_formula",row:2,keyColumn:2,keyValue:"alpha",oldId:"USR-0001",newId:"USR-0001"}],dryRun:true};
 const dry=h.fn.migrate(proposal);
 h.fn.migrate({...proposal,dryRun:false,confirm:true,manifestDigest:dry.manifestDigest});
 assert.equal(h.ss.getSheetByName("Users").formulas[1][0],"");
 h.fn.rollback({migrationId:proposal.migrationId,manifestDigest:dry.manifestDigest,dryRun:false,confirm:true});
 assert.equal(h.ss.getSheetByName("Users").formulas[1][0],"=ROW()-1");
});
console.log("IdentifierMigration: "+passed+"/"+passed+" PASS");
