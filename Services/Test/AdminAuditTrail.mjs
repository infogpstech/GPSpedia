import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const source = readFileSync(new URL("../admin.js", import.meta.url), "utf8");
function extractFunction(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\n}", start);
    assert.ok(end > start, "No se pudo delimitar " + name);
    return source.slice(start, end + 2);
}
const helperNames = [
    "createAdminAuditError_", "safeAdminAuditId_", "safeAdminAuditStage_",
    "getAdminAuditResourceSummary_", "getAdminAuditPartialResult_", "getAdminAuditOutcome_",
    "getAdminAuditResultCode_", "pruneAdminAuditProperties_", "beginAdminAuditEvent_",
    "finalizeAdminAuditEvent_", "isSharedMutationAction_"
];
const helperSource = helperNames.map(extractFunction).join("\n");
const constants = `
const ADMIN_AUDIT_PROPERTY_PREFIX_ = "GPSpedia_ADMIN_AUDIT_V1_";
const ADMIN_AUDIT_RETENTION_MS_ = 180 * 24 * 60 * 60 * 1000;
const ADMIN_AUDIT_MAX_FINALIZED_ = 300;
const ADMIN_AUDIT_MAX_PENDING_ = 20;
const ADMIN_AUDIT_MAX_RECORD_LENGTH_ = 900;
`;
const syntax = spawnSync(process.execPath, ["--check", new URL("../admin.js", import.meta.url).pathname], { encoding:"utf8" });
assert.equal(syntax.status,0,"admin.js no supera node --check: "+syntax.stderr);

function createProperties(seed={},options={}) {
    const data={...seed};let writes=0;
    return {
        data,
        getProperties(){return {...data};},
        getProperty(key){return Object.prototype.hasOwnProperty.call(data,key)?data[key]:null;},
        setProperty(key,value){
            writes++;
            if(options.failAllWrites || options.failOnWrite===writes)throw new Error("property write failed");
            data[key]=String(value);return this;
        },
        deleteProperty(key){delete data[key];return this;},
        get writeCount(){return writes;}
    };
}
function createHarness(options={}) {
    const properties=createProperties(options.seed||{},options);
    let uuid=0,lockAcquires=0,lockReleases=0;
    const LockService={getScriptLock(){return {
        waitLock(ms){lockAcquires++;if(options.lockFail)throw new Error("lock timeout");},
        releaseLock(){lockReleases++;}
    };}};
    const PropertiesService={getScriptProperties(){return properties;}};
    const Utilities={getUuid(){uuid++;return "00000000-0000-4000-8000-"+String(uuid).padStart(12,"0");}};
    const api=new Function(
        "PropertiesService","LockService","Utilities","SPREADSHEET_ID","DRIVE_FOLDER_ID",
        constants+helperSource+"\nreturn {createAdminAuditError_,safeAdminAuditId_,safeAdminAuditStage_,getAdminAuditResourceSummary_,getAdminAuditPartialResult_,getAdminAuditOutcome_,getAdminAuditResultCode_,pruneAdminAuditProperties_,beginAdminAuditEvent_,finalizeAdminAuditEvent_,isSharedMutationAction_};"
    )(PropertiesService,LockService,Utilities,"spreadsheet_test_id_123456789","drive_root_test_id_123456789");
    return {api,properties,get lockAcquires(){return lockAcquires;},get lockReleases(){return lockReleases;}};
}
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
function seedEvent(id,finishedAt,outcome="success"){
    return ["GPSpedia_ADMIN_AUDIT_V1_"+id,JSON.stringify({
        schemaVersion:1,eventId:id,actorId:"1001",actorRole:"desarrollador",action:"driveCommand",
        resourceType:"drive",sourceResourceId:"file123456789",targetResourceId:"folder123456789",
        startedAt:new Date(Date.parse(finishedAt)-1000).toISOString(),finishedAt,outcome,
        stage:"Finalización",durationMs:1000,resultCode:"SUCCESS",partialResult:{}
    })];
}
const h=createHarness();
const payload={
    fileId:"driveFile_123456789",targetFolderId:"targetFolder_123456789",
    sessionToken:"SESSION_SECRET",password:"PASSWORD_SECRET",
    imageData:"data:image/png;base64,BASE64_SECRET",imgBase64:"BASE64_SECRET",
    message:"Do not persist this payload text"
};
const started=h.api.beginAdminAuditEvent_("driveCommand",payload,{userId:"user-42",role:"Desarrollador"},new Date());
check("Persiste y verifica el evento STARTED antes de ejecutar la acción",()=>{
    const record=JSON.parse(h.properties.getProperty(started.key));
    assert.equal(record.eventId,started.eventId);
    assert.equal(record.outcome,"started");
    assert.ok(record.startedAt);
    assert.equal(record.finishedAt,null);
    assert.equal(record.actorId,"user-42");
    assert.equal(record.actorRole,"desarrollador");
    assert.equal(record.sourceResourceId,"driveFile_123456789");
    assert.equal(record.targetResourceId,"targetFolder_123456789");
    assert.equal(h.lockAcquires,h.lockReleases);
});
check("No persiste tokens, contraseñas, Base64, mensajes ni payloads",()=>{
    const raw=h.properties.getProperty(started.key);
    for(const secret of ["SESSION_SECRET","PASSWORD_SECRET","BASE64_SECRET","Do not persist","imageData","sessionToken","password"])assert.ok(!raw.includes(secret));
    assert.ok(raw.length<=900);
});
check("Finaliza con resultado, etapa, duración y resumen parcial permitido",()=>{
    const response={status:"warning",code:"PARTIAL_RESULT",processed:8,total:10,itemErrors:2,successCount:6,message:"sensitive text",details:{token:"not stored"}};
    h.api.finalizeAdminAuditEvent_(started,{payload,response,stage:"Reorganización de imágenes",durationMs:1250});
    const record=JSON.parse(h.properties.getProperty(started.key));
    assert.equal(record.outcome,"partial");
    assert.equal(record.resultCode,"PARTIAL_RESULT");
    assert.equal(record.stage,"Organizacion");
    assert.equal(record.durationMs,1250);
    assert.deepEqual(record.partialResult,{processed:8,total:10,itemErrors:2,successCount:6});
    assert.ok(record.finishedAt);
    assert.ok(!JSON.stringify(record).includes("sensitive text"));
    assert.ok(!JSON.stringify(record).includes("not stored"));
});
check("Clasifica errores y resultados parciales sin almacenar mensajes",()=>{
    assert.equal(h.api.getAdminAuditOutcome_({status:"error"},null),"error");
    assert.equal(h.api.getAdminAuditOutcome_({status:"warning"},null),"partial");
    assert.equal(h.api.getAdminAuditOutcome_({status:"success",failedCount:1},null),"partial");
    assert.equal(h.api.getAdminAuditOutcome_({status:"success"},new Error("private")),"error");
    assert.equal(h.api.getAdminAuditResultCode_(null,{code:"HTTP_403",message:"private"},"error"),"HTTP_403");
});
check("Sanitiza IDs y etapas y excluye credenciales",()=>{
    assert.equal(h.api.safeAdminAuditId_("SESSION_SECRET",payload),"");
    assert.equal(h.api.safeAdminAuditId_("file_id-123",payload),"file_id-123");
    assert.equal(h.api.safeAdminAuditId_("https://drive.google.com/file/d/x",payload),"");
    assert.equal(h.api.safeAdminAuditStage_("Etapa\nprivada\u0000"),"Ejecucion");
    assert.equal(h.api.safeAdminAuditStage_("Reorganización de imágenes para vehículo ABC123"),"Organizacion");
});
check("Acepta actor autenticado Desarrollador o Gefe y rechaza actor inválido",()=>{
    const second=h.api.beginAdminAuditEvent_("updateVehicleField",{vehicleId:23},{userId:"user-43",role:"Gefe"},new Date());
    assert.ok(second.eventId);
    assert.throws(()=>h.api.beginAdminAuditEvent_("updateVehicleField",{}, {userId:"user-44",role:"Tecnico"},new Date()),error=>error.code==="ADMIN_AUDIT_ACTOR_INVALID");
});
check("La retención elimina eventos finalizados mayores a 180 días",()=>{
    const old=seedEvent("old",new Date(Date.now()-181*24*60*60*1000).toISOString());
    const recent=seedEvent("recent",new Date(Date.now()-2*24*60*60*1000).toISOString());
    const f=createHarness({seed:Object.fromEntries([old,recent])});
    f.api.pruneAdminAuditProperties_(f.properties,Date.now());
    assert.equal(f.properties.getProperty(old[0]),null);
    assert.ok(f.properties.getProperty(recent[0]));
});
check("El límite de 300 eventos finalizados conserva los más recientes",()=>{
    const seed={};
    for(let i=0;i<301;i++){
        const entry=seedEvent("event-"+String(i).padStart(3,"0"),new Date(Date.now()-(300-i)*1000).toISOString());
        seed[entry[0]]=entry[1];
    }
    const f=createHarness({seed});
    f.api.pruneAdminAuditProperties_(f.properties,Date.now());
    assert.equal(Object.keys(f.properties.data).length,300);
    assert.equal(f.properties.getProperty("GPSpedia_ADMIN_AUDIT_V1_event-000"),null);
    assert.ok(f.properties.getProperty("GPSpedia_ADMIN_AUDIT_V1_event-300"));
});
check("Los eventos STARTED no se purgan y 20 pendientes bloquean nuevas operaciones",()=>{
    const seed={};
    for(let i=0;i<20;i++)seed["GPSpedia_ADMIN_AUDIT_V1_pending-"+i]=JSON.stringify({eventId:"pending-"+i,outcome:"started",finishedAt:null});
    const f=createHarness({seed});
    assert.throws(()=>f.api.beginAdminAuditEvent_("driveCommand",{}, {userId:"user-1",role:"Desarrollador"},new Date()),
        error=>error.code==="ADMIN_AUDIT_PENDING_REVIEW_REQUIRED");
    assert.equal(Object.keys(f.properties.data).length,20);
});
check("Un fallo al guardar el inicio impide continuar",()=>{
    const f=createHarness({failAllWrites:true});
    let actionExecuted=false;
    assert.throws(()=>{const event=f.api.beginAdminAuditEvent_("driveCommand",{}, {userId:"user-1",role:"Desarrollador"},new Date());actionExecuted=true;return event;},
        error=>error.code==="ADMIN_AUDIT_START_FAILED");
    assert.equal(actionExecuted,false);
});
check("Un fallo al cerrar deja el evento STARTED sin afirmar éxito",()=>{
    const f=createHarness({failOnWrite:2});
    const event=f.api.beginAdminAuditEvent_("driveCommand",{}, {userId:"user-1",role:"Desarrollador"},new Date());
    assert.throws(()=>f.api.finalizeAdminAuditEvent_(event,{response:{status:"success"},payload:{},stage:"Fin",durationMs:50}),
        error=>error.code==="ADMIN_AUDIT_FINALIZE_FAILED");
    const record=JSON.parse(f.properties.getProperty(event.key));
    assert.equal(record.outcome,"started");
    assert.equal(record.finishedAt,null);
});
check("La lista de acciones auditadas coincide con mutaciones ADMIN sensibles",()=>{
    assert.equal(h.api.isSharedMutationAction_("driveCommand"),true);
    assert.equal(h.api.isSharedMutationAction_("backupDatabase"),true);
    assert.equal(h.api.isSharedMutationAction_("deleteReplacedImage"),true);
    assert.equal(h.api.isSharedMutationAction_("ping"),false);
    assert.equal(h.api.isSharedMutationAction_("getAdminImageUploadStatus"),false);
});
check("doPostInternal_ autentica, persiste STARTED antes del switch y finaliza antes de responder",()=>{
    const body=extractFunction("doPostInternal_");
    const auth=body.indexOf("assertDeveloperSession(payload)");
    const begin=body.indexOf("beginAdminAuditEvent_(action, payload, developerContext, startTime)");
    const dispatch=body.indexOf("switch (action)");
    const finish=body.indexOf("finalizeAdminAuditEvent_(auditEvent",dispatch);
    const catchStart=body.indexOf("} catch (error)",dispatch);
    const catchFinish=body.indexOf("finalizeAdminAuditEvent_(auditEvent",catchStart);
    const response=body.indexOf("ContentService.createTextOutput");
    assert.ok(auth>=0&&auth<begin&&begin<dispatch);
    assert.ok(finish>dispatch&&catchStart>finish&&catchFinish>catchStart&&response>catchFinish);
    assert.ok(body.includes("ADMIN_AUDIT_FINALIZE_FAILED"));
    assert.ok(body.includes("isSharedMutationAction_(action)"));
});
console.log("AdminAuditTrail: "+passed+"/"+passed+" PASS");
