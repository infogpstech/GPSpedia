import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const admin=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
const start=admin.indexOf('const ADMIN_LOCAL_GUARD_PROPERTY_PREFIX_ = "GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_";');
const end=admin.indexOf("\nfunction handleCreateCortesImageFolder(",start);
assert.ok(start>=0&&end>start,"No se encontró la guarda ADMIN");
const source=admin.slice(start,end);
const headers=["scopeHash","requestId","expiresAt","updatedAt","schemaVersion"];
class Sheet{
 constructor(){this.rows=[headers.slice()];}
 getLastRow(){let n=this.rows.length;while(n>0&&this.rows[n-1].every(v=>v===""||v===null))n--;return n;}
 getRange(row,col,count,width){const self=this;return{
  getValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>((self.rows[row-1+i]||[])[col-1+j])??""));},
  setValues(data){data.forEach((r,i)=>{const n=row-1+i;while(self.rows.length<=n)self.rows.push([]);self.rows[n]=self.rows[n].slice();r.forEach((v,j)=>{self.rows[n][col-1+j]=v;});});}
 };}
 deleteRow(n){this.rows.splice(n-1,1);}
}
function harness(options={}){
 const sheet=new Sheet(),values=new Map(Object.entries(options.legacy||{}));
 let now=1000,id=0,held=false,busy=false,cleanupBusy=false,reads=0,writes=0,deletes=0;
 const properties={getProperties(){reads++;return Object.fromEntries(values);},getProperty(k){return values.get(k)||null;},setProperty(k,v){writes++;values.set(k,v);},deleteProperty(k){deletes++;values.delete(k);}};
 const lockService={getScriptLock(){return{
  tryLock(ms){assert.equal(ms,0,"No se permite esperar por el lock");if((cleanupBusy&&id>0)||busy||held)return false;held=true;return true;},
  hasLock(){return held;},releaseLock(){assert.equal(held,true,"No liberar lock ajeno");held=false;}
 };}};
 const hashScope=value=>{let n=7;for(const ch of String(value))n=(Math.imul(n,31)+ch.charCodeAt(0))>>>0;return n.toString(16).padStart(64,"0");};
 const factory=new Function("PropertiesService","LockService","Utilities","SpreadsheetApp",
  source+"\nreturn withAdminLocalOperationGuard_;"
 )({getScriptProperties:()=>properties},lockService,{}, {flush(){}});
 return{
  sheet,values,properties,lockService,run(scope,callback,ttl=30){return factory(scope,callback,ttl,{sheet,properties,lockService,now:()=>now,uuid:()=>"request-"+(++id),hashScope});},
  setNow(v){now=v;},setBusy(v){busy=v;},setCleanupBusy(v){cleanupBusy=v;},
  get lockHeld(){return held;},get reads(){return reads;},get writes(){return writes;},get deletes(){return deletes;}
 };
}
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("baseline importa solo reservas vigentes y conserva intactas las propiedades legacy",()=>{
 const hash="a".repeat(64),expired="b".repeat(64);
 const h=harness({legacy:{
  ["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_"+hash]:JSON.stringify({requestId:"legacy-active",expiresAt:9000}),
  ["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_"+expired]:JSON.stringify({requestId:"legacy-expired",expiresAt:500})
 }});
 h.run("drive-audit:A1",()=>{});
 assert.equal(h.sheet.getLastRow(),3);
 assert.equal(h.sheet.rows[2][0],hash);
 assert.equal(h.values.size,2);
 assert.equal(h.writes,0);
 assert.equal(h.deletes,0);
 const reads=h.reads;
 h.run("drive-audit:A2",()=>{});
 assert.equal(h.reads,reads,"No releer propiedades después del baseline");
});
test("reserva el recurso y libera ScriptLock antes del trabajo prolongado",()=>{
 const h=harness();
 const result=h.run("drive-audit:A1",()=>{
  assert.equal(h.lockHeld,false,"El callback nunca debe ejecutarse bajo ScriptLock");
  assert.equal(h.sheet.getLastRow(),3,"La reserva debe persistir mientras trabaja Drive");
  return 42;
 },1000);
 assert.equal(result,42);
 assert.equal(h.lockHeld,false);
 assert.equal(h.sheet.getLastRow(),2,"La reserva se libera al terminar");
 assert.equal(h.sheet.rows[1][2], "admin_local_guard_baseline_v1");
});
test("rechaza la misma operación y permite una operación distinta anidada",()=>{
 const h=harness();
 const result=h.run("drive-audit:A1",()=>{
  assert.throws(()=>h.run("drive-audit:A1",()=>"duplicado"),/ya está en curso/);
  assert.equal(h.lockHeld,false);
  return h.run("drive-audit:B2",()=>{assert.equal(h.lockHeld,false);return 2;});
 });
 assert.equal(result,2);
 assert.equal(h.sheet.getLastRow(),2);
});
test("libera la reserva cuando el callback falla y permite reintento",()=>{
 const h=harness();
 assert.throws(()=>h.run("drive-inventory:U1",()=>{throw new Error("fallo Drive");}),/fallo Drive/);
 assert.equal(h.sheet.getLastRow(),2);
 assert.equal(h.run("drive-inventory:U1",()=>"reintento"),"reintento");
});
test("si cleanup no consigue lock conserva la reserva solo hasta TTL",()=>{
 const h=harness();
 const result=h.run("create-folder:modelo",()=>{h.setCleanupBusy(true);return "ok";},30);
 assert.equal(result,"ok");
 assert.equal(h.sheet.getLastRow(),3);
 h.setCleanupBusy(false);
 h.setNow(32001);
 assert.equal(h.run("create-folder:modelo",()=>"recuperado"),"recuperado");
 assert.equal(h.sheet.getLastRow(),2);
});
test("contención del lock de reserva falla rápido y no ejecuta callback",()=>{
 const h=harness();h.run("warmup",()=>{});
 let called=false;h.setBusy(true);
 assert.throws(()=>h.run("drive-audit:A1",()=>{called=true;}),error=>error&&error.code==="ADMIN_LOCAL_GUARD_BUSY");
 assert.equal(called,false);assert.equal(h.lockHeld,false);
});
test("baseline pending se reanuda sin duplicar una reserva ya importada",()=>{
 const hash="c".repeat(64),h=harness({legacy:{["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_"+hash]:JSON.stringify({requestId:"legacy",expiresAt:9000})}});
 h.sheet.getRange(2,1,1,5).setValues([["META","BASELINE","pending","",""]]);
 h.sheet.getRange(3,1,1,5).setValues([[hash,"legacy",9000,0,1]]);
 h.run("other-scope",()=>{});
 assert.equal(h.sheet.getLastRow(),3);
 assert.equal(h.sheet.rows[1][2],"admin_local_guard_baseline_v1");
});
test("rechaza JSON legacy corrupto y deja baseline pendiente",()=>{
 const hash="d".repeat(64),h=harness({legacy:{["GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_"+hash]:"{bad json"}});
 assert.throws(()=>h.run("drive-audit:A1",()=>{}),/corrupta/i);
 assert.equal(h.sheet.rows[1][2],"pending");
 assert.equal(h.writes,0);assert.equal(h.deletes,0);
});
test("limita TTL a 420 segundos",()=>{
 const h=harness();
 h.run("drive-audit:A1",()=>{});
 h.setNow(5000);
 const result=h.run("drive-audit:A2",()=>{assert.equal(h.sheet.rows[2][2],425000);return true;},9999);
 assert.equal(result,true);
});
test("rechaza nuevas reservas al alcanzar 500 guardas activas sin tocar las existentes",()=>{
 const h=harness();h.run("warmup",()=>{});
 const rows=Array.from({length:500},(_,i)=>[i.toString(16).padStart(64,"0"),"active-"+i,900000,1000,1]);
 h.sheet.getRange(3,1,rows.length,5).setValues(rows);
 let called=false;
 assert.throws(()=>h.run("new-scope",()=>{called=true;}),/capacidad segura/i);
 assert.equal(called,false);
 assert.equal(h.sheet.getLastRow(),502);
});
test("el bloque no usa espera temporizada ni escribe/elimina propiedades legacy",()=>{
 assert.equal(/waitLock|tryLock\s*\(\s*[1-9]/.test(source),false);
 assert.equal(/\.setProperty\s*\(|\.deleteProperty\s*\(/.test(source),false);
});
console.log("AdminLocalOperationGuard: "+passed+"/"+passed+" PASS");
assert.equal(passed,11);
