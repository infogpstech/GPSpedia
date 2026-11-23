import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../Services/", import.meta.url);
const adminSource = readFileSync(new URL("admin.js", root), "utf8");
const feedbackSource = readFileSync(new URL("feedback.js", root), "utf8");
const apiSource = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
function extract(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const next = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, next > start ? next : source.length);
}
assert.doesNotMatch(feedbackSource, /RICH_TEXT_MODE_PROPERTY_|GPSpedia_RICH_TEXT_MODE_V1/,
    "FEEDBACK no debe conservar la propiedad local de rich_text_mode");
assert.match(feedbackSource, /getPublicCentralConfiguration_\(\)/,
    "La lectura FEEDBACK debe proceder de la configuración central");
assert.match(apiSource, /'setRichTextMode': 'ADMIN'/,
    "La publicación debe enrutarse a ADMIN");
assert.match(apiSource, /'invalidateRichTextModeCache': 'FEEDBACK'/,
    "La invalidación debe coordinarse desde frontend hacia FEEDBACK");

const helperSource = extract(adminSource, "readCentralConfigurationPublishTable_") + "\n" +
    extract(adminSource, "appendCentralConfigurationPublishRows_") + "\n" +
    extract(adminSource, "handleSetRichTextModeCentral_");
class FakeSheet {
    constructor(name, rows) { this.name=name; this.rows=rows.map(row=>row.slice()); this.failWrite=false; }
    getName(){return this.name;}
    getDataRange(){return {getValues:()=>this.rows.map(row=>row.slice())};}
    getLastRow(){return this.rows.length;}
    getRange(row,col,numRows,numCols){
        return {
            setValues: values => {
                if(this.failWrite) throw new Error("WRITE_FAILED");
                for(let r=0;r<numRows;r++) this.rows[row-1+r]=values[r].slice();
            },
            getValues: () => this.rows.slice(row-1,row-1+numRows).map(r=>r.slice(col-1,col-1+numCols))
        };
    }
}
const controlHeaders=["control_key","schema_version","active_revision","publication_state","published_at","updated_by","change_reason"];
const serviceHeaders=["config_revision","service_key","endpoint_url","enabled","contract_version","min_client_version","health_action","updated_at","updated_by","change_reason"];
const parameterHeaders=["config_revision","config_key","value_json","value_type","scope","visibility","enabled","default_json","validation_rule","schema_version","updated_at","updated_by","change_reason"];
const resourceHeaders=["config_revision","resource_key","resource_type","resource_id","scope","visibility","enabled","expected_parent_id","expected_name","updated_at","updated_by","change_reason"];
const schemaHeaders=["config_key","entity_type","value_type","scope_allowed","visibility_allowed","required","default_json","validation_rule","introduced_schema_version","deprecated_schema_version","replacement_key","owner_service","description"];
const historyHeaders=["history_id","config_revision","entity_type","entity_key","operation","previous_value_json","new_value_json","actor_id","changed_at","change_reason","rollback_of_revision","schema_version"];
function makeFixture(){
 const sheets={
  ConfiguracionControl:new FakeSheet("ConfiguracionControl",[controlHeaders,["CONFIGURATION_ACTIVE",1,1,"READY","2026-11-23T00:00:00.000Z","seed","initial"]]),
  Servicios:new FakeSheet("Servicios",[serviceHeaders,...["AUTH","CATALOG","WRITE","FEEDBACK","UTILITIES","ADMIN"].map(k=>[1,k,"https://script.google.com/macros/s/FAKE_"+k+"_123456/exec",true,"2.2.5","2.2.5","health",new Date(0),"seed","initial"])]),
  ConfiguracionParametros:new FakeSheet("ConfiguracionParametros",[parameterHeaders,[1,"rich_text_mode",JSON.stringify("strict"),"enum","global","public",true,JSON.stringify("strict"),"enum:strict|advanced",1,new Date(0),"seed","initial"]]),
  ConfiguracionRecursos:new FakeSheet("ConfiguracionRecursos",[resourceHeaders,[1,"cortes_root_folder_id","drive_folder","FAKE_FOLDER_ID_12345","service:ADMIN","backend",true,"","Cortes",new Date(0),"seed","initial"]]),
  ConfiguracionEsquema:new FakeSheet("ConfiguracionEsquema",[schemaHeaders,["rich_text_mode","parameter","enum","global","public",false,JSON.stringify("strict"),"enum:strict|advanced",1,"","","FEEDBACK","Global rich text mode"]]),
  ConfiguracionHistorial:new FakeSheet("ConfiguracionHistorial",[historyHeaders])
 };
 const spreadsheet={getSheetByName:name=>sheets[name]||null};
 return {sheets,spreadsheet};
}
let activeFixture=null, lockBusy=false, lockReleases=0;
const context={
 getSpreadsheet:()=>activeFixture.spreadsheet,
 readCentralConfigurationSnapshot_:()=>{
  const control=activeFixture.sheets.ConfiguracionControl.rows[1];
  const revision=Number(control[2]);
  const params=activeFixture.sheets.ConfiguracionParametros.rows.slice(1).filter(r=>Number(r[0])===revision);
  const services=activeFixture.sheets.Servicios.rows.slice(1).filter(r=>Number(r[0])===revision);
  if(control[3]!=="READY"||services.length!==6) throw new Error("INVALID_SNAPSHOT");
  const mode=params.find(r=>r[1]==="rich_text_mode");
  return {revision,schemaVersion:1,parameters:{rich_text_mode:mode?JSON.parse(mode[2]):"strict"}};
 },
 LockService:{getScriptLock:()=>({tryLock:()=>!lockBusy,releaseLock:()=>{lockReleases++;}})},
 SpreadsheetApp:{flush:()=>{}},
 CacheService:{getScriptCache:()=>({removeAll:()=>{}})},
 Date,JSON,Number,String,Object,Array,RegExp,Error,Math
};
vm.runInNewContext(helperSource + "\nthis.publish=handleSetRichTextModeCentral_;", context);
const publish=context.publish;
const developer={userId:"dev-123",role:"Desarrollador"};
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
function reset(){activeFixture=makeFixture();lockBusy=false;lockReleases=0;}
check("Publica nueva revisión completa, conserva servicios/recursos y registra historial",()=>{
 reset();
 const result=publish({mode:"advanced",requestId:"request-000000000001"},developer);
 assert.equal(result.status,"success");assert.equal(result.mode,"advanced");assert.equal(result.revision,2);
 assert.equal(activeFixture.sheets.ConfiguracionControl.rows[1][2],2);
 assert.equal(activeFixture.sheets.ConfiguracionParametros.rows.filter(r=>Number(r[0])===2)[0][2],JSON.stringify("advanced"));
 assert.equal(activeFixture.sheets.Servicios.rows.filter(r=>Number(r[0])===2).length,6);
 assert.equal(activeFixture.sheets.ConfiguracionRecursos.rows.filter(r=>Number(r[0])===2).length,1);
 assert.equal(activeFixture.sheets.ConfiguracionHistorial.rows.length,2);
 assert.equal(lockReleases,1);
});
check("Reintento con el mismo requestId es idempotente",()=>{
 reset();
 publish({mode:"advanced",requestId:"request-000000000002"},developer);
 const count=activeFixture.sheets.ConfiguracionParametros.rows.length;
 const result=publish({mode:"advanced",requestId:"request-000000000002"},developer);
 assert.equal(result.idempotent,true);
 assert.equal(activeFixture.sheets.ConfiguracionParametros.rows.length,count);
 assert.equal(activeFixture.sheets.ConfiguracionHistorial.rows.length,2);
});
check("No publica una revisión si el modo ya está activo",()=>{
 reset();
 const result=publish({mode:"strict",requestId:"request-000000000003"},developer);
 assert.equal(result.unchanged,true);
 assert.equal(activeFixture.sheets.ConfiguracionControl.rows[1][2],1);
 assert.equal(activeFixture.sheets.ConfiguracionHistorial.rows.length,1);
});
check("Rechaza actor distinto de Desarrollador y valores inválidos",()=>{
 reset();
 assert.throws(()=>publish({mode:"advanced",requestId:"request-000000000004"},{userId:"tech",role:"Técnico"}),/Acceso denegado/);
 assert.throws(()=>publish({mode:"unsafe",requestId:"request-000000000005"},developer),/no válido/);
 assert.equal(activeFixture.sheets.ConfiguracionControl.rows[1][2],1);
});
check("Falla cerrado si el lock de publicación está ocupado",()=>{
 reset();lockBusy=true;
 assert.throws(()=>publish({mode:"advanced",requestId:"request-000000000006"},developer),/está siendo modificada/);
 assert.equal(activeFixture.sheets.ConfiguracionControl.rows[1][2],1);
});
check("No cambia la revisión activa si falla una escritura de tabla",()=>{
 reset();activeFixture.sheets.ConfiguracionParametros.failWrite=true;
 assert.throws(()=>publish({mode:"advanced",requestId:"request-000000000007"},developer),/WRITE_FAILED/);
 assert.equal(activeFixture.sheets.ConfiguracionControl.rows[1][2],1);
});
console.log("CentralConfigurationPublisherContract: "+passed+"/6 PASS");
