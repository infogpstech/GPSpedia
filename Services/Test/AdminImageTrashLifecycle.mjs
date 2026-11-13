import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin=readFileSync(new URL("../admin.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../../ui.js",import.meta.url),"utf8");
const apiConfig=readFileSync(new URL("../../api-config.js",import.meta.url),"utf8");
const coordinator=readFileSync(new URL("../Coordinator.js",import.meta.url),"utf8");
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
function fnSource(source,name){
    const start=source.indexOf("function "+name+"(");
    assert.ok(start>=0,"No se encontró "+name);
    const end=source.indexOf("\nfunction ",start+10);
    return source.slice(start,end>start?end:source.length);
}
const BASE=["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo","archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"];
const EXT=["origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion","url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion","error_organizacion","fecha_organizacion","estado_previo_papelera"];
const HEADERS=[...BASE,...EXT];
const FILE_ID="abcdefghij1234567890";
function makeRow({id="IMG-1",type="reemplazada",status="requiere_revision",previous="requiere_revision",fileId=FILE_ID,originalId=fileId,visualId=fileId,mime="image/jpeg"}={}){
    const row=Array(24).fill("");
    row[0]=id;row[1]=new Date("2026-01-01T00:00:00Z");row[2]=type==="reemplazada"?"vehiculo":"inventario_sin_uso";
    row[3]="VEH-1";row[4]="imagenVehiculo";row[5]=fileId;row[6]="image.jpg";
    row[7]="https://drive.google.com/file/d/"+originalId+"/view";
    row[8]="https://drive.google.com/file/d/REPLACED00000000000000/view";
    row[9]="Vehículo de prueba";row[10]=status;row[11]=type==="reemplazada"?"reemplazo":"auditoria_drive";
    row[12]=mime;row[16]="https://lh3.googleusercontent.com/d/"+visualId;row[19]=type;row[23]=previous;
    return row;
}
function createSheet(rows){
    const cells=rows.map(row=>row.slice());
    function range(r,c,nr=1,nc=1){return{
        getValues(){return Array.from({length:nr},(_,y)=>Array.from({length:nc},(_,x)=>cells[r-1+y]?.[c-1+x]??""));},
        getDisplayValues(){return this.getValues().map(row=>row.map(value=>String(value??"")));},
        getValue(){return cells[r-1]?.[c-1]??"";},
        setValue(value){while(cells.length<r)cells.push([]);while(cells[r-1].length<c)cells[r-1].push("");cells[r-1][c-1]=value;return this;}
    };}
    return{cells,getRange:range,getLastRow(){return cells.length;},getLastColumn(){return HEADERS.length;}};
}
function lockHarness({fail=false}={}){
    const state={waits:0,releases:0,locked:false};
    return{state,LockService:{getScriptLock(){return{waitLock(){state.waits++;if(fail)throw new Error("lock busy");state.locked=true;},releaseLock(){state.releases++;state.locked=false;}};}}};
}
const extract=new Function(fnSource(admin,"extractDriveFileIds")+"\nreturn extractDriveFileIds;")();
const getType=new Function(fnSource(admin,"getReplacedImageRecordType")+"\nreturn getReplacedImageRecordType;")();
const getIdentity=new Function("extractDriveFileIds",fnSource(admin,"getReplacedImageRecordIdentity_")+"\nreturn getReplacedImageRecordIdentity_;")(extract);
const knownStatus=new Function(fnSource(admin,"isKnownReplacedImageStatus_")+"\nreturn isKnownReplacedImageStatus_;")();
const find=new Function(fnSource(admin,"findReplacedImageRecordById")+"\nreturn findReplacedImageRecordById;")();
const setStatusSource=fnSource(admin,"setReplacedImageHistoryStatusVerified_");
const setPreviousSource=fnSource(admin,"setReplacedImageTrashPreviousStatusVerified_");
function makeBase({status="requiere_revision",type="reemplazada",previous="requiere_revision",trashed=false,mime="image/jpeg",references=new Map(),unverifiable=0,failStatus=null,failRestoreToTrash=false,failUntrashRollback=false,failTrash=false,lockFail=false}={}){
    const sheet=createSheet([HEADERS,makeRow({status,type,previous,mime})]);
    const lock=lockHarness({fail:lockFail});
    const file={trashed,mime,name:"image.jpg",getMimeType(){return this.mime;},isTrashed(){return this.trashed;},getName(){return this.name;},
        setTrashed(value){if(value===true&&failRestoreToTrash)throw new Error("rollback trash failed");if(value===false&&failUntrashRollback)throw new Error("rollback untrash failed");if(value===true&&failTrash)throw new Error("trash failed");this.trashed=value;}};
    const flush=()=>{};
    const setStatus=new Function("SpreadsheetApp",setStatusSource+"\nreturn setReplacedImageHistoryStatusVerified_;")({flush});
    let failOnce=failStatus;
    const wrappedStatus=(target,row,value)=>{
        if(failOnce===value){failOnce=null;throw new Error("simulated status write failure: "+value);}
        return setStatus(target,row,value);
    };
    const setPrevious=new Function("SpreadsheetApp",setPreviousSource+"\nreturn setReplacedImageTrashPreviousStatusVerified_;")({flush});
    const refs=()=>({references,unverifiableReferenceCount:unverifiable});
    const root={getId:()=>"ROOT"};
    const parent={getId:()=>"PARENT"};
    const deps={
        LockService:lock.LockService,getOrCreateReplacedImagesSheet:()=>sheet,ensureReplacedImagesInventoryColumns:()=>HEADERS,
        findReplacedImageRecordById:find,getReplacedImageRecordType:getType,isKnownReplacedImageStatus_:knownStatus,
        getReplacedImageRecordIdentity_:getIdentity,collectActiveDriveReferences:refs,
        setReplacedImageTrashPreviousStatusVerified_:setPrevious,DriveApp:{getFileById(){return file;}},
        getCortesRootFolder:()=>root,getSingleParentFolderInsideCortes:()=>parent,getFolderPathInsideCortes:()=>"Cortes/Original",
        setReplacedImageHistoryStatusVerified_:wrappedStatus,recordImageAdministrationActivity(){},logMessage(){}
    };
    return{sheet,file,lock,refs,deps};
}
function runDelete(base,id="IMG-1"){
    const handler=new Function(...Object.keys(base.deps),fnSource(admin,"handleDeleteReplacedImage")+"\nreturn handleDeleteReplacedImage;")(...Object.values(base.deps));
    return handler({id_reemplazo:id},()=>{},{actor:"developer"});
}
function runRestore(base,id="IMG-1"){
    const handler=new Function(...Object.keys(base.deps),fnSource(admin,"handleRestoreReplacedImageFromTrash")+"\nreturn handleRestoreReplacedImageFromTrash;")(...Object.values(base.deps));
    return handler({id_reemplazo:id},()=>{},{actor:"developer"});
}
function permanentDeps(base,queue){
    let calls=0;
    const request=(id,method)=>{calls++;const next=queue.shift();if(!next)throw new Error("unexpected Drive API "+method);return next;};
    return{...base.deps,requestAdminDriveFile_:request,get requestCalls(){return calls;}};
}
function runPermanent(base,queue,id="IMG-1"){
    const deps=permanentDeps(base,queue);
    const handler=new Function(...Object.keys(deps),fnSource(admin,"handlePermanentlyDeleteReplacedImage")+"\nreturn handlePermanentlyDeleteReplacedImage;")(...Object.values(deps));
    return{result:handler({id_reemplazo:id},()=>{},{actor:"developer"}),deps};
}
const ok=(body={})=>({code:200,body:{id:FILE_ID,mimeType:"image/jpeg",trashed:true,...body}});
const gone=()=>({code:404,body:{}});
const noContent=()=>({code:204,body:{}});

check("El esquema conserva un campo específico para el estado anterior a papelera",()=>{
    assert.equal(HEADERS.length,24);
    const sheet=createSheet([HEADERS,makeRow()]);
    const setPrevious=new Function("SpreadsheetApp",setPreviousSource+"\nreturn setReplacedImageTrashPreviousStatusVerified_;")({flush(){}});
    setPrevious(sheet,2,HEADERS,"requiere_revision");
    assert.equal(sheet.cells[1][23],"requiere_revision");
    assert.throws(()=>setPrevious(sheet,2,BASE,"historica"),/estado previo/);
});
check("La acción permite enviar a papelera registros reemplazados en revisión y conserva su estado previo",()=>{
    const b=makeBase({status:"requiere_revision"});
    const result=runDelete(b);
    assert.equal(result.status,"success");
    assert.equal(b.file.trashed,true);
    assert.equal(b.sheet.cells[1][10],"en_papelera");
    assert.equal(b.sheet.cells[1][23],"requiere_revision");
    assert.equal(b.lock.state.releases,1);
});
check("La acción permite enviar a papelera inventario sin uso en revisión",()=>{
    const b=makeBase({type:"sin_uso_detectado",status:"requiere_revision",previous:"requiere_revision"});
    assert.equal(runDelete(b).status,"success");
    assert.equal(b.sheet.cells[1][10],"en_papelera");
    assert.equal(b.sheet.cells[1][23],"requiere_revision");
});
check("La papelera bloquea referencias activas y referencias globales no interpretables",()=>{
    const active=new Map([[FILE_ID,[{sheet:"pys",row:2,column:7}] ]]);
    const a=makeBase({references:active});
    assert.throws(()=>runDelete(a),/referencias activas/);
    assert.equal(a.file.trashed,false);
    const unknown=makeBase({unverifiable:1});
    assert.throws(()=>runDelete(unknown),/no interpretables/);
    assert.equal(unknown.file.trashed,false);
});
check("La papelera rechaza identidad inconsistente y archivos que no sean imágenes",()=>{
    const mismatch=makeBase();
    mismatch.sheet.cells[1][7]="https://drive.google.com/file/d/xxxxxxxxxxxxxxxxxxxx/view";
    assert.throws(()=>runDelete(mismatch),/no coinciden/);
    assert.equal(mismatch.file.trashed,false);
    const nonImage=makeBase({mime:"application/pdf"});
    assert.throws(()=>runDelete(nonImage),/no es una imagen/);
    assert.equal(nonImage.file.trashed,false);
});
check("La papelera rechaza el estado en_uso y no modifica Drive",()=>{
    const b=makeBase({status:"en_uso"});
    assert.throws(()=>runDelete(b),/no permite enviar/);
    assert.equal(b.file.trashed,false);
});
check("La papelera revierte el archivo si falla la confirmación del historial",()=>{
    const b=makeBase({status:"historica",previous:"historica",failStatus:"en_papelera"});
    assert.throws(()=>runDelete(b),/operación fue revertida/);
    assert.equal(b.file.trashed,false);
    assert.equal(b.sheet.cells[1][10],"historica");
});
check("La papelera deja requiere_revision si no puede compensar el traslado",()=>{
    const b=makeBase({status:"historica",previous:"historica",failStatus:"en_papelera",failUntrashRollback:true});
    assert.throws(()=>runDelete(b),/no se confirmó la compensación/);
    assert.equal(b.file.trashed,true);
    assert.equal(b.sheet.cells[1][10],"requiere_revision");
});
check("Reintentar una papelera ya confirmada es idempotente",()=>{
    const b=makeBase({status:"en_papelera",previous:"requiere_revision",trashed:true});
    const result=runDelete(b);
    assert.equal(result.unchanged,true);
    assert.equal(b.file.trashed,true);
});
check("Restaurar desde papelera recupera el estado anterior y no cambia celdas activas",()=>{
    const b=makeBase({status:"en_papelera",previous:"requiere_revision",trashed:true});
    const result=runRestore(b);
    assert.equal(result.status,"success");
    assert.equal(b.file.trashed,false);
    assert.equal(b.sheet.cells[1][10],"requiere_revision");
    assert.equal(b.sheet.cells[1][23],"requiere_revision");
});
check("Restaurar desde papelera conserva el estado histórico restablecida",()=>{
    const b=makeBase({status:"en_papelera",previous:"restablecida",trashed:true});
    assert.equal(runRestore(b).status,"success");
    assert.equal(b.sheet.cells[1][10],"restablecida");
});
check("La restauración rechaza un estado previo incompatible y un archivo que no está en papelera",()=>{
    const invalid=makeBase({status:"en_papelera",previous:"en_uso",trashed:true});
    assert.throws(()=>runRestore(invalid),/estado previo/);
    const notTrashed=makeBase({status:"en_papelera",previous:"historica",trashed:false});
    assert.throws(()=>runRestore(notTrashed),/no está en papelera/);
});
check("Restaurar desde papelera repara un archivo referenciado sin reescribir celdas",()=>{
    const references=new Map([[FILE_ID,[{sheet:"pys",row:4,column:7}]]]);
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true,references});
    assert.equal(runRestore(b).status,"success");
    assert.equal(b.file.trashed,false);
    assert.equal(b.sheet.cells[1][10],"historica");
});
check("La restauración compensa si no puede confirmar el estado histórico",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true,failStatus:"historica"});
    assert.throws(()=>runRestore(b),/archivo fue devuelto a papelera/);
    assert.equal(b.file.trashed,true);
    assert.equal(b.sheet.cells[1][10],"en_papelera");
});
check("La restauración marca requiere_revision si falla también la compensación",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true,failStatus:"historica",failRestoreToTrash:true});
    assert.throws(()=>runRestore(b),/compensación/);
    assert.equal(b.sheet.cells[1][10],"requiere_revision");
});
check("Reintentar una restauración ya confirmada es idempotente",()=>{
    const b=makeBase({status:"historica",previous:"historica",trashed:false});
    assert.equal(runRestore(b).unchanged,true);
});
check("La eliminación definitiva requiere estado en papelera, imagen válida y ausencia de referencias",()=>{
    const notTrash=makeBase({status:"historica",previous:"historica",trashed:false});
    assert.throws(()=>runPermanent(notTrash,[ok(),noContent(),gone()]),/requiere que la imagen esté en papelera/);
    const active=makeBase({status:"en_papelera",previous:"historica",trashed:true,references:new Map([[FILE_ID,[{sheet:"Relay",row:4,column:10}]]])});
    assert.throws(()=>runPermanent(active,[ok(),noContent(),gone()]),/referencias activas/);
    assert.equal(active.sheet.cells[1][10],"en_papelera");
});
check("La eliminación definitiva bloquea referencias no interpretables y archivos que no sean imágenes",()=>{
    const unknown=makeBase({status:"en_papelera",previous:"historica",trashed:true,unverifiable:1});
    assert.throws(()=>runPermanent(unknown,[ok(),noContent(),gone()]),/no interpretables/);
    const nonImage=makeBase({status:"en_papelera",previous:"historica",trashed:true});
    assert.throws(()=>runPermanent(nonImage,[{code:200,body:{mimeType:"application/pdf",trashed:true}}]),/no es una imagen/);
    assert.equal(nonImage.sheet.cells[1][10],"en_papelera");
});
check("La eliminación definitiva rechaza un archivo que Drive ya no marca en papelera",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:false});
    assert.throws(()=>runPermanent(b,[ok({trashed:false})]),/ya no está en papelera/);
    assert.equal(b.sheet.cells[1][10],"en_papelera");
});
check("La eliminación definitiva ejecuta GET, DELETE y GET de verificación antes de cerrar historial",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true});
    const {result,deps}=runPermanent(b,[ok(),noContent(),gone()]);
    assert.equal(result.status,"success");
    assert.equal(deps.requestCalls,3);
    assert.equal(b.sheet.cells[1][10],"eliminada");
});
check("Una respuesta de permisos Drive API no provoca eliminación",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true});
    assert.throws(()=>runPermanent(b,[{code:403,body:{}}]),/HTTP 403/);
    assert.equal(b.sheet.cells[1][10],"en_papelera");
});
check("Si Drive no confirma la ausencia, el registro queda eliminacion_pendiente",()=>{
    const b=makeBase({status:"en_papelera",previous:"historica",trashed:true});
    assert.throws(()=>runPermanent(b,[ok(),noContent(),ok()]),/eliminacion_pendiente/);
    assert.equal(b.sheet.cells[1][10],"eliminacion_pendiente");
});
check("El reintento reconcilia una eliminación pendiente cuando Drive confirma 404",()=>{
    const b=makeBase({status:"eliminacion_pendiente",previous:"historica",trashed:true});
    const {result,deps}=runPermanent(b,[gone()]);
    assert.equal(result.reconciled,true);
    assert.equal(deps.requestCalls,1);
    assert.equal(b.sheet.cells[1][10],"eliminada");
});
check("Una eliminación ya finalizada admite reintento idempotente sin llamar Drive",()=>{
    const b=makeBase({status:"eliminada",previous:"historica",trashed:true});
    const {result,deps}=runPermanent(b,[]);
    assert.equal(result.unchanged,true);
    assert.equal(deps.requestCalls,0);
});
check("El bloqueo concurrente detiene la papelera antes de tocar Drive",()=>{
    const b=makeBase({status:"requiere_revision",lockFail:true});
    assert.throws(()=>runDelete(b),/No se pudo bloquear/);
    assert.equal(b.file.trashed,false);
});
check("Las rutas ADMIN y lease compartida incluyen las dos acciones nuevas",()=>{
    assert.match(apiConfig,/'restoreReplacedImageFromTrash': 'ADMIN'/);
    assert.match(apiConfig,/'permanentlyDeleteReplacedImage': 'ADMIN'/);
    assert.match(admin,/\"restoreReplacedImageFromTrash\",\"permanentlyDeleteReplacedImage\"/);
    assert.match(admin,/case 'restoreReplacedImageFromTrash':/);
    assert.match(admin,/case 'permanentlyDeleteReplacedImage':/);
});
check("La interfaz del desarrollador ofrece enviar a papelera, restaurar y eliminar definitivamente",()=>{
    assert.match(ui,/status === 'requiere_revision'/);
    assert.match(ui,/restoreReplacedImageFromTrash/);
    assert.match(ui,/permanentlyDeleteReplacedImage/);
    assert.match(ui,/Eliminar definitivamente/);
    assert.match(ui,/canTrash/);
    assert.match(ui,/canRestoreFromTrash/);
});
check("La lease de recursos declara Drive, inventario y actividad para las nuevas mutaciones",()=>{
    assert.match(coordinator,/restoreReplacedImageFromTrash: \{ read: identityRead, write: \["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"\] \}/);
    assert.match(coordinator,/permanentlyDeleteReplacedImage: \{ read: identityRead, write: \["DRIVE", "IMAGE_INVENTORY", "ACTIVITY"\] \}/);
});
check("El helper Drive API envía GET/DELETE con supportsAllDrives y token OAuth",()=>{
    const source=fnSource(admin,"requestAdminDriveFile_");
    let captured=null;
    const helper=new Function("UrlFetchApp","ScriptApp",source+"\nreturn requestAdminDriveFile_;")(
        {fetch(url,options){captured={url,options};return{getResponseCode:()=>200,getContentText:()=>JSON.stringify({id:FILE_ID,mimeType:"image/jpeg",trashed:true})};}},
        {getOAuthToken:()=>"test-oauth-token"});
    const response=helper(FILE_ID,"get");
    assert.equal(response.code,200);
    assert.match(captured.url,/fields=id,name,mimeType,trashed,parents/);
    assert.equal(captured.options.headers.Authorization,"Bearer test-oauth-token");
    assert.equal(helper(FILE_ID,"delete").code,200);
    assert.match(captured.url,/supportsAllDrives=true$/);
    assert.equal(captured.options.method,"delete");
});
check("La llamada a Drive API usa token OAuth y no expone credenciales en parámetros",()=>{
    const source=fnSource(admin,"requestAdminDriveFile_");
    assert.match(source,/ScriptApp\.getOAuthToken\(\)/);
    assert.match(source,/Authorization:\s*"Bearer "/);
    assert.match(source,/muteHttpExceptions:\s*true/);
    assert.match(source,/fields=id,name,mimeType,trashed,parents/);
});
check("Los estados de eliminación pendiente y finalizada son reconocidos por el historial",()=>{
    assert.equal(knownStatus("reemplazada","eliminacion_pendiente"),true);
    assert.equal(knownStatus("sin_uso_detectado","eliminacion_pendiente"),true);
    assert.equal(knownStatus("reemplazada","eliminada"),true);
});

console.log("AdminImageTrashLifecycle: "+passed+"/"+passed+" PASS");
