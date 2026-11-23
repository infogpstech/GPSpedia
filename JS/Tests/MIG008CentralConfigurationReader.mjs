import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(resolve(root, "JS/Services/CentralConfigurationReader.js"), "utf8");
const auth = readFileSync(resolve(root, "JS/Services/Auth.js"), "utf8");
for (const pattern of [/PropertiesService/, /UrlFetchApp/, /openById\s*\(/, /SPREADSHEET_ID/, /API_ENDPOINTS/, /COORDINATOR_SECRET|API_KEY|PASSWORD|TOKEN/i, /https?:\/\//]) {
    assert.equal(pattern.test(source), false, "El lector contiene configuración local, URL o credencial prohibida: " + pattern);
}
assert.match(auth, /action === "getPublicConfiguration"[\s\S]*?getPublicCentralConfiguration_\(\)/);
assert.match(auth, /getPublicConfiguration/);
assert.doesNotMatch(source, /UrlFetchApp\.fetch|UrlFetchApp\.fetchAll|PropertiesService/);

const serviceKeys = ["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"];
const serviceHeaders = ["config_revision","service_key","endpoint_url","enabled","contract_version","min_client_version","health_action","updated_at","updated_by","change_reason"];
const parameterHeaders = ["config_revision","config_key","value_json","value_type","scope","visibility","enabled","default_json","validation_rule","schema_version","updated_at","updated_by","change_reason"];
const resourceHeaders = ["config_revision","resource_key","resource_type","resource_id","scope","visibility","enabled","expected_parent_id","expected_name","updated_at","updated_by","change_reason"];
const controlHeaders = ["control_key","schema_version","active_revision","publication_state","published_at","updated_by","change_reason"];
const schemaHeaders = ["config_key","entity_type","value_type","scope_allowed","visibility_allowed","required","default_json","validation_rule","introduced_schema_version","deprecated_schema_version","replacement_key","owner_service","description"];

function makeDatabase() {
    const rows = {};
    rows.Servicios = [serviceHeaders, ...serviceKeys.map((key, index) => [4,key,"https://script.google.com/macros/s/FAKE_DEPLOYMENT_"+key+"_123456789/exec",true,"2.2.5","2.2.5","ping",new Date(0),"operator","initial"]), [4,"USERS","https://script.google.com/macros/s/LEGACY_USERS_123456789/exec",false,"2.4.2","2.2.5","ping",new Date(0),"operator","retired"]];
    rows.ConfiguracionParametros = [parameterHeaders, [4,"rich_text_mode",'"advanced"',"enum","global","public",true,'"strict"',"enum:strict|advanced",1,new Date(0),"operator","initial"]];
    rows.ConfiguracionRecursos = [resourceHeaders, [4,"admin.unused_images_folder_id","drive_folder","FAKE_FOLDER_ID_12345","service:ADMIN","backend",true,"","Imagenes_Sin_Uso",new Date(0),"operator","initial"]];
    rows.ConfiguracionControl = [controlHeaders, ["CONFIGURATION_ACTIVE",1,4,"READY",new Date(0),"operator","initial"]];
    rows.ConfiguracionEsquema = [schemaHeaders,
        ["rich_text_mode","parameter","enum","global","public",false,'"strict"',"enum:strict|advanced",1,"","","FEEDBACK","Modo de texto enriquecido"],
        ["admin.unused_images_folder_id","resource","drive_folder","service:ADMIN","backend",false,"null","drive_folder_id",1,"","","ADMIN","Carpeta de imágenes sin uso"]
    ];
    const calls = {reads:0};
    const database = {
        getSheetByName(name) {
            if (!rows[name]) return null;
            return {getDataRange() { calls.reads++; return {getValues() { return rows[name].map(row => row.slice()); }}; }};
        }
    };
    return {database, rows, calls};
}

let clock = 1000000;
class TestDate extends Date {
    static now() { return clock; }
}
function createEnvironment(active) {
    const values = new Map();
    const cache = {
        get(key) { const item=values.get(key); if(!item||item.expiresAt<=clock){values.delete(key);return null;} return item.value; },
        put(key,value,ttl) { values.set(key,{value,expiresAt:clock+ttl*1000}); },
        remove(key) { values.delete(key); }
    };
    const context = {
        SpreadsheetApp: {getActiveSpreadsheet() { return active.current; }},
        CacheService: {getScriptCache() { return cache; }},
        Date: TestDate, JSON, Number, String, Object, Array, RegExp, Error, Math
    };
    vm.runInNewContext(source, context, {filename:"CentralConfigurationReader.js"});
    return {context, cache};
}
function expectCode(fn, code) {
    let error;
    try { fn(); } catch (caught) { error=caught; }
    assert.ok(error, "Se esperaba un error " + code);
    assert.equal(error.code, code);
}

{
    const active={current:null}, env=createEnvironment(active);
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"NO_ACTIVE_SPREADSHEET");
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    const result=env.context.getPublicCentralConfiguration_();
    assert.equal(result.status,"success");
    assert.equal(result.routingAvailable,true);
    assert.equal(Object.keys(result.services).length,6);
    assert.equal(Object.prototype.hasOwnProperty.call(result.services,"USERS"),false);
    assert.equal(result.services.AUTH.endpointUrl.includes("FAKE_DEPLOYMENT_AUTH"),true);
    assert.deepEqual(JSON.parse(JSON.stringify(result.parameters)),{rich_text_mode:"advanced"});
    assert.equal(Object.prototype.hasOwnProperty.call(result,"resources"),false);
}
{
    const fixture=makeDatabase();
    fixture.rows.Servicios.push([4,"COORDINATOR","https://script.google.com/macros/s/FAKE_COORDINATOR_123456789/exec",true,"2.2.5","2.2.5","catalogFeed",new Date(0),"operator","initial"]);
    const active={current:fixture.database}, env=createEnvironment(active);
    const result=env.context.getPublicCentralConfiguration_();
    assert.equal(result.services.COORDINATOR.enabled,true);
    assert.match(result.services.COORDINATOR.endpointUrl,/FAKE_COORDINATOR/);
    assert.equal(Object.keys(result.services).length,7);
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    const result=env.context.getCentralConfigurationForService_("ADMIN");
    assert.equal(result.status,"success");
    assert.equal(Object.prototype.hasOwnProperty.call(result,"services"),false);
    assert.equal(result.resources["admin.unused_images_folder_id"].resourceId,"FAKE_FOLDER_ID_12345");
    assert.equal(result.parameters.rich_text_mode,undefined);
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    env.context.getPublicCentralConfiguration_();
    const firstReads=fixture.calls.reads;
    active.current=null;
    clock+=60*1000;
    const cached=env.context.getPublicCentralConfiguration_();
    assert.equal(cached.routingAvailable,true);
    assert.equal(fixture.calls.reads,firstReads);
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    env.context.getPublicCentralConfiguration_();
    active.current=null;
    clock+=6*60*1000;
    const stale=env.context.getPublicCentralConfiguration_();
    assert.equal(stale.stale,true);
    assert.equal(stale.routingAvailable,false);
    assert.equal(stale.services,null);
    assert.equal(stale.parameters.rich_text_mode,"advanced");
    clock+=10*60*1000;
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"NO_ACTIVE_SPREADSHEET");
}
{
    const fixture=makeDatabase();
    fixture.rows.Servicios[1][2]="http://invalid.example/exec";
    const active={current:fixture.database}, env=createEnvironment(active);
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"CONFIGURATION_SERVICE_INVALID");
}
{
    const fixture=makeDatabase();
    const sheet=fixture.database.getSheetByName("ConfiguracionControl");
    let count=0;
    sheet.getDataRange=()=>({getValues(){count++;return [controlHeaders,["CONFIGURATION_ACTIVE",1,count===1?4:5,"READY",new Date(0),"operator","change"]];}});
    fixture.database.getSheetByName=(name)=>name==="ConfiguracionControl"?sheet:makeDatabase().database.getSheetByName(name);
    const active={current:fixture.database}, env=createEnvironment(active);
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"CONFIGURATION_REVISION_CHANGED");
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    fixture.rows.ConfiguracionParametros[1][2]='"invalid"';
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"CONFIGURATION_PARAMETER_VALUE_INVALID");
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    fixture.rows.Servicios[2][2]=fixture.rows.Servicios[1][2];
    expectCode(()=>env.context.getPublicCentralConfiguration_(),"CONFIGURATION_SERVICE_INVALID");
}
{
    const fixture=makeDatabase(), active={current:fixture.database}, env=createEnvironment(active);
    fixture.rows.ConfiguracionParametros.splice(1);
    const result=env.context.getPublicCentralConfiguration_();
    assert.equal(result.parameters.rich_text_mode,"strict");
}
console.log("MIG008CentralConfigurationReader: 10/10 PASS — acceso sin bootstrap local, proyección pública/backend, caché, stale-if-error, validación, defaults y fail-closed.");
