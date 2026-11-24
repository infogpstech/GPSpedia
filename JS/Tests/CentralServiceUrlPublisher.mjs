import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../Services/", import.meta.url);
const auth = readFileSync(new URL("Auth.js", root), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const start = auth.indexOf("var AUTH_CENTRAL_SERVICE_KEYS_");
const end = auth.indexOf("function getAuthUserActor_", start);
assert.ok(start >= 0 && end > start, "No se encontró el publicador AUTH de endpoints.");
const publisherSource = auth.slice(start, end);

const keys = ["AUTH", "CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"];
const editableKeys = ["CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"];
const headers = {
    ConfiguracionControl: ["control_key","schema_version","active_revision","publication_state","published_at","updated_by","change_reason"],
    Servicios: ["config_revision","service_key","endpoint_url","enabled","contract_version","min_client_version","health_action","updated_at","updated_by","change_reason"],
    ConfiguracionEsquema: ["config_key","entity_type","value_type","scope_allowed","visibility_allowed","required","default_json","validation_rule","introduced_schema_version","deprecated_schema_version","replacement_key","owner_service","description"],
    ConfiguracionParametros: ["config_revision","config_key","value_json","value_type","scope","visibility","enabled","default_json","validation_rule","schema_version","updated_at","updated_by","change_reason"],
    ConfiguracionRecursos: ["config_revision","resource_key","resource_type","resource_id","scope","visibility","enabled","expected_parent_id","expected_name","updated_at","updated_by","change_reason"],
    ConfiguracionHistorial: ["history_id","config_revision","entity_type","entity_key","operation","previous_value_json","new_value_json","actor_id","changed_at","change_reason","rollback_of_revision","schema_version"]
};

class FakeSheet {
    constructor(name, rows) { this.name=name; this.rows=rows.map(row=>row.slice()); this.parent=null; this.failWrite=false; }
    getName(){ return this.name; }
    getParent(){ return this.parent; }
    getLastRow(){ return this.rows.length; }
    getDataRange(){ return { getValues:()=>this.rows.map(row=>row.slice()) }; }
    getRange(row,col,numRows,numCols){
        const sheet=this;
        return {
            getValues(){
                return Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>{
                    const value=(sheet.rows[row-1+r]||[])[col-1+c];
                    return value===undefined ? "" : value;
                }));
            },
            setValues(values){
                if(sheet.failWrite) throw new Error("WRITE_FAILED");
                values.forEach((valuesRow,r)=>{
                    const target=sheet.rows[row-1+r]||(sheet.rows[row-1+r]=[]);
                    valuesRow.forEach((value,c)=>{target[col-1+c]=value;});
                });
            },
            setValue(value){
                if(sheet.failWrite) throw new Error("WRITE_FAILED");
                const target=sheet.rows[row-1]||(sheet.rows[row-1]=[]);
                target[col-1]=value;
            }
        };
    }
    deleteRow(row){ this.rows.splice(row-1,1); }
}
class FakeSpreadsheet {
    constructor(){
        this.sheets={};
        for(const [name,columns] of Object.entries(headers)) this.sheets[name]=new FakeSheet(name,[columns]);
        Object.values(this.sheets).forEach(sheet=>sheet.parent=this);
    }
    getSheetByName(name){ return this.sheets[name]||null; }
    getName(){ return "AUTH central test"; }
}
let fixture, lockBusy=false, releases=0, cacheRemovals=0;
function createContext(){
    fixture=new FakeSpreadsheet(); lockBusy=false; releases=0; cacheRemovals=0;
    const context={
        getAuthUsersSpreadsheet_:()=>fixture,
        initializeCentralConfigurationSheets:()=>({status:"success"}),
        LockService:{getScriptLock:()=>({tryLock:()=>!lockBusy,releaseLock:()=>{releases++;}})},
        SpreadsheetApp:{flush:()=>{}},
        CacheService:{getScriptCache:()=>({removeAll:()=>{cacheRemovals++;}})},
        Utilities:{getUuid:()=>"uuid-manual-000000000000"},
        Session:{getEffectiveUser:()=>({getEmail:()=>"operator@example.test"})},
        Date,JSON,Number,String,Object,Array,RegExp,Error,Math
    };
    context.readCentralConfigurationSnapshot_=()=>{
        const control=fixture.sheets.ConfiguracionControl.rows[1];
        if(!control||control[3]!=="READY") throw new Error("CONFIGURATION_NOT_READY");
        const revision=Number(control[2]);
        const serviceRows=fixture.sheets.Servicios.rows.slice(1).filter(row=>Number(row[0])===revision);
        if(serviceRows.length!==6) throw new Error("INVALID_SERVICE_COUNT");
        const services={};
        serviceRows.forEach(row=>{services[row[1]]={endpointUrl:row[2],contractVersion:row[4]};});
        const parameterRows=fixture.sheets.ConfiguracionParametros.rows.slice(1).filter(row=>Number(row[0])===revision);
        if(!fixture.sheets.ConfiguracionEsquema.rows.some(row=>row[0]==="rich_text_mode")) throw new Error("MISSING_SCHEMA");
        if(!parameterRows.some(row=>row[1]==="rich_text_mode")) throw new Error("MISSING_PARAMETER");
        return {revision,schemaVersion:1,services,parameters:{rich_text_mode:"strict"},resources:{}};
    };
    vm.runInNewContext(publisherSource,context,{filename:"AuthCentralServiceUrlPublisher.js"});
    return context;
}
function validUrls(suffix="A"){
    return Object.fromEntries(keys.map(key=>[key,"https://script.google.com/macros/s/DEPLOYMENT_"+key+"_"+suffix+"/exec"]));
}
let passed=0;
function check(name,fn){ fn(); passed++; console.log("PASS "+name); }

check("primera publicación crea una revisión completa y sus metadatos derivados",()=>{
    const context=createContext(), urls=validUrls();
    const result=context.publishAuthCentralServiceUrls_(urls,{userId:"dev-1",role:"desarrollador"},"bootstrap inicial","request-initial-000001");
    assert.equal(result.status,"success");
    assert.equal(result.revision,1);
    assert.equal(result.changedServices.length,6);
    assert.equal(fixture.sheets.Servicios.rows.filter(row=>Number(row[0])===1).length,6);
    assert.equal(fixture.sheets.ConfiguracionParametros.rows.filter(row=>Number(row[0])===1).length,1);
    assert.equal(fixture.sheets.ConfiguracionEsquema.rows.length,2);
    assert.equal(fixture.sheets.ConfiguracionRecursos.rows.length,1);
    assert.equal(fixture.sheets.ConfiguracionHistorial.rows.length,7);
    assert.equal(fixture.sheets.Servicios.rows.filter(row=>row[0]===""&&keys.includes(row[1])).length,6);
    assert.equal(fixture.sheets.Servicios.rows.find(row=>row[1]==="AUTH"&&Number(row[0])===1)[4],"2.2.5");
    assert.equal(fixture.sheets.Servicios.rows.find(row=>row[1]==="FEEDBACK"&&Number(row[0])===1)[4],"1.2.2");
    assert.equal(releases,1);
    assert.equal(cacheRemovals,1);
});

check("actualiza únicamente URL y metadatos de auditoría, conserva contrato y parámetros",()=>{
    const context=createContext(), first=validUrls();
    context.publishAuthCentralServiceUrls_(first,{userId:"dev-1"},"initial","request-update-000001");
    const changed={...first,CATALOG:"https://script.google.com/macros/s/DEPLOYMENT_CATALOG_B/exec"};
    const result=context.publishAuthCentralServiceUrls_(changed,{userId:"dev-2"},"URL CATALOG renovada","request-update-000002");
    assert.equal(result.revision,2);
    assert.deepEqual(Array.from(result.changedServices),["CATALOG"]);
    const row=fixture.sheets.Servicios.rows.find(item=>Number(item[0])===2&&item[1]==="CATALOG");
    assert.equal(row[2],changed.CATALOG);
    assert.equal(row[4],"2.4.0");
    assert.equal(fixture.sheets.ConfiguracionParametros.rows.filter(item=>Number(item[0])===2).length,1);
    assert.equal(fixture.sheets.ConfiguracionHistorial.rows.length,8);
    assert.equal(fixture.sheets.Servicios.rows.find(item=>item[0]===""&&item[1]==="CATALOG")[2],changed.CATALOG);
});

check("cada revisión contiene una instantánea única y las lecturas usan solo active_revision",()=>{
    const context=createContext(), first=validUrls("OLD");
    context.publishAuthCentralServiceUrls_(first,{userId:"dev-1"},"initial","request-active-000001");
    const changed={...first,CATALOG:validUrls("NEW").CATALOG};
    const published=context.publishAuthCentralServiceUrls_(changed,{userId:"dev-2"},"update catalog","request-active-000002");
    assert.deepEqual(Array.from(published.changedServices),["CATALOG"]);
    const activeRows=fixture.sheets.Servicios.rows.slice(1).filter(row=>Number(row[0])===2);
    assert.equal(activeRows.length,6);
    assert.equal(new Set(activeRows.map(row=>row[1])).size,6);
    const draft=fixture.sheets.Servicios.rows.find(row=>row[0]===""&&row[1]==="CATALOG");
    draft[2]="https://script.google.com/macros/s/STALE_DRAFT/exec";
    const activeMap=context.getAuthCentralServiceUrlMap_(fixture,false);
    assert.equal(activeMap.CATALOG,changed.CATALOG);
    assert.equal(activeMap.WRITE,first.WRITE);
    const snapshot=context.readCentralConfigurationSnapshot_();
    assert.equal(snapshot.revision,2);
    assert.equal(snapshot.services.CATALOG.contractVersion,"2.4.0");
    assert.equal(snapshot.services.FEEDBACK.contractVersion,"1.2.2");
    const duplicate=activeRows[0].slice();
    fixture.sheets.Servicios.rows.push(duplicate);
    assert.throws(()=>context.getAuthCentralServiceUrlMap_(fixture,false),/servicio duplicado/);
});

check("no crea revisión cuando las URL ya coinciden",()=>{
    const context=createContext(), urls=validUrls();
    context.publishAuthCentralServiceUrls_(urls,{userId:"dev-1"},"initial","request-noop-000001");
    const historyCount=fixture.sheets.ConfiguracionHistorial.rows.length;
    const replay=context.publishAuthCentralServiceUrls_(urls,{userId:"dev-1"},"initial","request-noop-000001");
    assert.equal(replay.idempotent,true);
    assert.deepEqual(Array.from(replay.changedServices),keys);
    const result=context.publishAuthCentralServiceUrls_(urls,{userId:"dev-2"},"no change","request-noop-000002");
    assert.equal(result.unchanged,true);
    assert.deepEqual(Array.from(result.changedServices),[]);
    assert.equal(result.revision,1);
    assert.equal(fixture.sheets.ConfiguracionHistorial.rows.length,historyCount);
});

check("rechaza URL inválida y endpoints duplicados antes de publicar",()=>{
    const context=createContext(), urls=validUrls();
    assert.throws(()=>context.publishAuthCentralServiceUrls_({...urls,AUTH:"http://invalid.example/exec"},{userId:"dev"},"invalid","request-invalid-000001"),/formato de deployment/);
    const duplicate={...urls,CATALOG:urls.AUTH};
    assert.throws(()=>context.publishAuthCentralServiceUrls_(duplicate,{userId:"dev"},"duplicate","request-invalid-000002"),/compartir la misma URL/);
    assert.equal(fixture.sheets.ConfiguracionControl.rows.length,1);
});

check("falla cerrado si otro proceso mantiene el lock",()=>{
    const context=createContext(); lockBusy=true;
    assert.throws(()=>context.publishAuthCentralServiceUrls_(validUrls(),{userId:"dev"},"busy","request-busy-000001"),/está siendo modificada/);
    assert.equal(fixture.sheets.ConfiguracionControl.rows.length,1);
    assert.equal(releases,0);
});

check("el flujo manual desde Apps Script prepara solo service_key y endpoint_url y no pide sesión GPSpedia",()=>{
    const context=createContext();
    const prepared=context.prepareCentralConfigurationServiceUrlInput();
    assert.equal(prepared.status,"success");
    assert.deepEqual(Array.from(prepared.serviceKeys),keys);
    for(const row of fixture.sheets.Servicios.rows.slice(1)){
        assert.equal(row[0],"");
        assert.ok(keys.includes(row[1]));
        assert.equal(row[2],"");
    }
    const urls=validUrls("MANUAL");
    const positions=Object.fromEntries(headers.Servicios.map((key,index)=>[key,index]));
    fixture.sheets.Servicios.rows.slice(1).forEach(row=>{row[positions.endpoint_url]=urls[row[positions.service_key]];});
    const result=context.publishCentralConfigurationFromServiceUrlDraft();
    assert.equal(result.status,"success");
    assert.equal(result.revision,1);
    assert.equal(fixture.sheets.ConfiguracionControl.rows[1][5],"operator@example.test");
});

check("AUTH exige sesión para consultar y actualizar endpoints y el frontend usa el bootstrap",()=>{
    assert.match(auth,/getCentralServiceUrls[\s\S]{0,120}updateCentralServiceUrls/);
    assert.match(auth,/case 'getCentralServiceUrls':[\s\S]*?handleGetCentralServiceUrls_/);
    assert.match(auth,/case 'updateCentralServiceUrls':[\s\S]*?handleUpdateCentralServiceUrls_/);
    assert.match(auth,/getAuthUserActor_\(payload, \["desarrollador"\], "actualizar los endpoints centrales"\)/);
    assert.match(api,/callCentralAuthBootstrapAction_\("updateCentralServiceUrls"/);
    assert.match(api,/CENTRAL_CONFIGURATION_BOOTSTRAP_URL/);
    assert.match(ui,/initializeCentralServiceUrlsControl_\(\)/);
    const panelStart=ui.indexOf("function initializeCentralServiceUrlsControl_");
    const panelEnd=ui.indexOf("/* TAREA 1.2:",panelStart);
    const panel=ui.slice(panelStart,panelEnd);
    assert.match(panel,/configurationRefreshPending/);
    assert.match(panel,/changedByClient = keys\.filter/);
    assert.match(panel,/result\.changedServices\) \? result\.changedServices : changedByClient/);
    assert.match(panel,/console\.warn/);
    assert.match(panel,/appendConsoleStatus\("ERROR: no se pudo publicar/);
    assert.match(panel,/No se pudieron guardar los cambios/);
    for(const key of editableKeys) assert.match(html,new RegExp('central-service-url-'+key.toLowerCase()));
    assert.doesNotMatch(html,/id="central-service-url-auth"/);
    assert.match(html,/AUTH no se modifica aquí|AUTH se administra directamente en el frontend/);
    assert.match(ui,/const keys = \["CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"\]/);
    assert.match(api,/CENTRAL_EDITABLE_SERVICE_KEYS_ = Object\.freeze\(\["CATALOG", "WRITE", "FEEDBACK", "UTILITIES", "ADMIN"\]\)/);
    assert.match(api,/únicamente las cinco URL editables/);
    const getHandler=auth.slice(auth.indexOf("function handleGetCentralServiceUrls_"),auth.indexOf("function publishCentralConfigurationFromServiceUrlDraft"));
    assert.match(getHandler,/var complete = \{ AUTH: current\.AUTH \}/);
    assert.match(getHandler,/getAuthCentralServiceUrlMap_\(spreadsheet, false\)/);
    assert.match(getHandler,/Object\.keys\(submitted\)\.sort\(\)\.join\(","\) !== editableKeys\.slice\(\)\.sort\(\)\.join\(","\)/);
    assert.match(getHandler,/AUTH se administra directamente en el frontend/);
    assert.match(html,/btn-save-central-service-urls/);
});

assert.doesNotMatch(publisherSource,/PropertiesService|UrlFetchApp|https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/,
    "AUTH no debe guardar URLs de servicios ni usar secretos o llamadas interservicio.");
console.log("CentralServiceUrlPublisher: "+passed+"/8 PASS");
