import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const admin = readFileSync(new URL("../../Services/admin.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const coordinator = readFileSync(new URL("../../Services/Coordinator.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const offline = readFileSync(new URL("../Frontend/offline.js", import.meta.url), "utf8");
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }
function fnSource(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró function " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    return source.slice(start, end > start ? end : source.length);
}
const names = [
    "extractDriveFileIds", "getReplacedImageRecordType", "withReplacedImagesSchemaLock_",
    "ensureReplacedImagesInventoryColumns", "getReplacedImagesReadSchema_",
    "getReplacedImageRecordIdentity_", "isKnownReplacedImageStatus_",
    "getDuplicateReplacedImageIds_", "findReplacedImageRecordById",
    "setReplacedImageHistoryStatusVerified_", "setReplacedImageTrashPreviousStatusVerified_", "restoreAdminImageActiveCell_"
];
const helperSources = Object.fromEntries(names.map(name => [name, fnSource(admin, name)]));
function createSheet(initialRows, options = {}) {
    const cells = initialRows.map(row => row.slice());
    let writes = 0;
    function ensureCell(row, col) {
        while (cells.length < row) cells.push([]);
        while (cells[row - 1].length < col) cells[row - 1].push("");
    }
    function range(row, col, numRows = 1, numCols = 1) {
        return {
            getValues() {
                return Array.from({ length: numRows }, (_, r) =>
                    Array.from({ length: numCols }, (_, c) => cells[row - 1 + r]?.[col - 1 + c] ?? ""));
            },
            getDisplayValues() {
                return this.getValues().map(values => values.map(value => String(value ?? "")));
            },
            getValue() { return cells[row - 1]?.[col - 1] ?? ""; },
            setValue(value) {
                writes++;
                if (options.failWriteAt === writes) throw new Error("simulated setValue failure");
                ensureCell(row, col); cells[row - 1][col - 1] = value; return this;
            },
            setValues(values) {
                writes++;
                if (options.failWriteAt === writes) throw new Error("simulated setValues failure");
                values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => {
                    ensureCell(row + r, col + c); cells[row - 1 + r][col - 1 + c] = value;
                }));
                return this;
            },
            setFontWeight() { return this; },
            setBackground() { return this; }
        };
    }
    return {
        cells,
        getRange: range,
        getLastRow() {
            for (let i = cells.length - 1; i >= 0; i--) {
                if (cells[i].some(value => String(value ?? "") !== "")) return i + 1;
            }
            return 0;
        },
        getLastColumn() {
            return cells.reduce((max, row) => {
                let last = 0;
                row.forEach((value, i) => { if (String(value ?? "") !== "") last = i + 1; });
                return Math.max(max, last);
            }, 0);
        },
        getDataRange() { return range(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); },
        get writeCount() { return writes; }
    };
}
const BASE_HEADERS = ["id_reemplazo","fecha_reemplazo","tipo_contenido","registro_id","campo",
    "archivo_drive_id","nombre_archivo","url_anterior","sustituida_por_url","referencia_texto","estado"];
const EXT_HEADERS = ["origen_registro","tipo_mime","ubicacion_original","fecha_creacion_drive","fecha_deteccion",
    "url_visualizacion","ubicacion_actual","ultima_auditoria_id","tipo_registro","estado_organizacion",
    "error_organizacion","fecha_organizacion","estado_previo_papelera","ultima_operacion_inventario_id",
    "resultado_inventario","detalle_resultado_inventario"];
const HEADERS = [...BASE_HEADERS, ...EXT_HEADERS];
const FILE_A = "abcdefghij1234567890";
const FILE_B = "bcdefghij12345678901";
function makeRow({id="REP-1", status="historica", type="reemplazada", fileId=FILE_A,
    originalId=fileId, visualId=fileId, origin=type === "reemplazada" ? "reemplazo" : "auditoria_drive",
    contentType=type === "reemplazada" ? "vehiculo" : "inventario_sin_uso", name="imagen.jpg"} = {}) {
    const row = Array(27).fill("");
    row[0]=id; row[1]=new Date("2026-01-01T00:00:00Z"); row[2]=contentType;
    row[3]="VEH-1"; row[4]="imagenVehiculo"; row[5]=fileId; row[6]=name;
    row[7]="https://drive.google.com/file/d/"+originalId+"/view"; row[8]="https://drive.google.com/file/d/REPLACED00000000000000/view";
    row[9]="Vehículo de prueba"; row[10]=status; row[11]=origin; row[12]="image/jpeg";
    row[16]="https://lh3.googleusercontent.com/d/"+visualId; row[19]=type; row[23]=""; row[24]=""; row[25]=""; row[26]="";
    return row;
}
function lockHarness() {
    const state={locked:false,waits:0,releases:0};
    const LockService={getScriptLock(){return {
        hasLock(){return state.locked;},
        waitLock(){state.waits++;state.locked=true;},
        releaseLock(){state.releases++;state.locked=false;}
    };}};
    return {LockService,state};
}
function buildHelpers({sheet=null, spreadsheet=null, lock=lockHarness(), flush=()=>{}}={}) {
    const SpreadsheetApp={flush};
    const getSpreadsheet=()=>spreadsheet || ({getSheetByName:()=>sheet});
    const source=names.map(name=>helperSources[name]).join("\n");
    const api=new Function("LockService","SpreadsheetApp","getSpreadsheet","SHEET_NAMES",source+
        "\nreturn {extractDriveFileIds,getReplacedImageRecordType,withReplacedImagesSchemaLock_,ensureReplacedImagesInventoryColumns,getReplacedImagesReadSchema_,getReplacedImageRecordIdentity_,isKnownReplacedImageStatus_,getDuplicateReplacedImageIds_,findReplacedImageRecordById,setReplacedImageHistoryStatusVerified_,restoreAdminImageActiveCell_};")
        (lock.LockService,SpreadsheetApp,getSpreadsheet,{IMAGENES_REEMPLAZADAS:"Imagenes_Reemplazadas"});
    return {...api,SpreadsheetApp,lock};
}

check("Las operaciones del gestor validan referencias globales y no solo Cortes",()=>{
    const names=["handleGetReplacedImages","handleRecoverReplacedImage","handleDeleteReplacedImage",
        "handleMoveReplacedImage","handleGetReplacedImageDownloadUrl","handleSaveUnusedImagesInventory",
        "handleOrganizeUnusedImagesBatch","handleAuditDriveImagesInCortesLocked_"];
    names.forEach(name=>assert.match(fnSource(admin,name),/collectActiveDriveReferences/,
        name+" debe usar el escáner global de referencias"));
    const scanner=fnSource(admin,"collectActiveDriveReferences");
    assert.match(scanner,/getSpreadsheet\(\)\.getSheets\(\)/);
    assert.match(scanner,/getDisplayValues\(\)/);
    assert.match(scanner,/getValues\(\)/);
    assert.match(scanner,/getImages\(\)/);
    assert.match(scanner,/getFormulas\(\)/);
    assert.match(scanner,/getRichTextValues\(\)/);
    assert.match(scanner,/SHEET_NAMES\.IMAGENES_REEMPLAZADAS/);
});

check("Los 16 encabezados dinámicos se migran de forma idempotente y se verifican",()=>{
    const row=["REP-LEGACY",new Date(),"vehiculo","VEH-1","imagenVehiculo",FILE_A,"old.jpg",
        "https://drive.google.com/file/d/"+FILE_A+"/view","new-url","VEH-1","historica"];
    const sheet=createSheet([BASE_HEADERS,row]);
    const lock=lockHarness(),api=buildHelpers({sheet,lock});
    const headers=api.ensureReplacedImagesInventoryColumns(sheet);
    assert.equal(headers.length,27);
    assert.deepEqual(headers.slice(11),EXT_HEADERS);
    assert.equal(sheet.cells[1][19],"reemplazada");
    assert.equal(sheet.cells[1][16],"https://lh3.googleusercontent.com/d/"+FILE_A);
    const columns=sheet.getLastColumn(),writes=sheet.writeCount;
    api.ensureReplacedImagesInventoryColumns(sheet);
    assert.equal(sheet.getLastColumn(),columns);
    assert.equal(sheet.writeCount,writes);
    assert.equal(lock.state.waits,2);
    assert.equal(lock.state.releases,2);
});

check("La migración se detiene ante encabezados duplicados sin modificar el esquema",()=>{
    const headers=[...BASE_HEADERS,"tipo_mime","tipo_mime"];
    const sheet=createSheet([headers]);
    const api=buildHelpers({sheet});
    const before=sheet.getLastColumn();
    assert.throws(()=>api.ensureReplacedImagesInventoryColumns(sheet),/duplicados/);
    assert.equal(sheet.getLastColumn(),before);
    assert.equal(sheet.writeCount,0);
});

check("El wrapper de migración respeta un ScriptLock ya adquirido",()=>{
    const lock=lockHarness(),api=buildHelpers({lock});
    lock.state.locked=true;
    assert.equal(api.withReplacedImagesSchemaLock_(()=>42),42);
    assert.equal(lock.state.waits,0);
    assert.equal(lock.state.releases,0);
});

check("La consulta del esquema no crea ni modifica la hoja cuando no existe",()=>{
    let insertCalls=0;
    const spreadsheet={getSheetByName(){return null;},insertSheet(){insertCalls++;throw new Error("must not create");}};
    const api=buildHelpers({spreadsheet});
    const schema=api.getReplacedImagesReadSchema_();
    assert.equal(schema.sheet,null);
    assert.equal(schema.missingHeaders.length,16);
    assert.equal(insertCalls,0);
});

check("La identidad requiere coincidencia entre archivo_drive_id, url_anterior y url_visualizacion",()=>{
    const api=buildHelpers();
    const row=makeRow();
    assert.equal(api.getReplacedImageRecordIdentity_(row,HEADERS,true),FILE_A);
    assert.throws(()=>api.getReplacedImageRecordIdentity_(makeRow({originalId:FILE_B}),HEADERS,true),/no coinciden/);
    assert.throws(()=>api.getReplacedImageRecordIdentity_(makeRow({visualId:FILE_B}),HEADERS,true),/no coincide/);
    const noVisual=makeRow();noVisual[16]="";
    assert.throws(()=>api.getReplacedImageRecordIdentity_(noVisual,HEADERS,true),/URL de visualización/);
    assert.equal(api.getReplacedImageRecordIdentity_(noVisual,HEADERS,false),FILE_A);
});

check("El buscador de historial rechaza IDs duplicados y devuelve el ancho completo",()=>{
    const duplicateSheet=createSheet([HEADERS,makeRow({id:"DUP"}),makeRow({id:"DUP",fileId:FILE_B})]);
    const api=buildHelpers();
    assert.throws(()=>api.findReplacedImageRecordById(duplicateSheet,"DUP"),/duplicado/);
    const uniqueSheet=createSheet([HEADERS,makeRow({id:"UNIQUE"})]);
    const result=api.findReplacedImageRecordById(uniqueSheet,"UNIQUE");
    assert.equal(result.rowIndex,2);
    assert.equal(result.values.length,27);
});

check("La marca manual en uso requiere revisión, identidad y verificación del archivo",()=>{
    const source=fnSource(admin,"handleMarkReplacedImageInUse");
    assert.match(source,/requiere_revision/);
    assert.match(source,/getReplacedImageRecordIdentity_/);
    assert.match(source,/file\.isTrashed\(\)/);
    assert.match(source,/getSingleParentFolderInsideCortes/);
    assert.match(source,/setReplacedImageHistoryStatusVerified_\(sheet, existing\.rowIndex, "en_uso"\)/);
    assert.ok(admin.includes('case \'markReplacedImageInUse\':'));
    assert.ok(ui.includes("markReplacedImageInUse"));
});

check("La matriz de estados reconoce todos los estados históricos e inventarios",()=>{
    const api=buildHelpers();
    for(const status of ["historica","restablecida","en_papelera","requiere_revision","cancelada","eliminacion_pendiente","eliminada","en_uso"])
        assert.equal(api.isKnownReplacedImageStatus_("reemplazada",status),true);
    for(const status of ["sin_uso_detectado","en_papelera","no_confirmada_en_ultima_auditoria","requiere_revision","cancelada","eliminacion_pendiente","eliminada","en_uso"])
        assert.equal(api.isKnownReplacedImageStatus_("sin_uso_detectado",status),true);
    assert.equal(api.isKnownReplacedImageStatus_("reemplazada","unknown"),false);
    assert.equal(api.isKnownReplacedImageStatus_("sin_uso_detectado","historica"),false);
});

check("El cierre de estado comprueba lectura posterior y no acepta una escritura no confirmada",()=>{
    const sheet=createSheet([BASE_HEADERS,makeRow()]);
    const api=buildHelpers({sheet});
    api.setReplacedImageHistoryStatusVerified_(sheet,2,"restablecida");
    assert.equal(sheet.cells[1][10],"restablecida");
    const broken={
        getRange(){return {setValue(){},getValue(){return "historica";}};}
    };
    assert.throws(()=>api.setReplacedImageHistoryStatusVerified_(broken,2,"en_papelera"),/lectura posterior/);
});

check("La lista presenta todos los estados y separa duplicados y filas inválidas para revisión",()=>{
    const rows=[
        HEADERS,
        makeRow({id:"HIST",status:"historica",fileId:FILE_A}),
        makeRow({id:"REST",status:"restablecida",fileId:FILE_B}),
        makeRow({id:"TRASH",status:"en_papelera",fileId:"cdefghij123456789012"}),
        makeRow({id:"REVIEW",status:"requiere_revision",fileId:"defghij1234567890123"}),
        makeRow({id:"CANCEL",status:"cancelada",fileId:"efghij12345678901234"}),
        makeRow({id:"UNUSED",type:"sin_uso_detectado",status:"sin_uso_detectado",fileId:"fghij123456789012345"}),
        makeRow({id:"DUP",fileId:"ghij1234567890123456"}),
        makeRow({id:"DUP",fileId:"hij12345678901234567"}),
        makeRow({id:"MISMATCH",fileId:"ij123456789012345678",originalId:"jk123456789012345678"}),
        makeRow({id:"UNKNOWN",status:"procesando",fileId:"kl123456789012345678"}),
        makeRow({id:"",fileId:"lm123456789012345678"})
    ];
    const fakeSheet={
        getDataRange(){return {getValues(){return rows;}};},
        getRange(row,col,numRows,numCols){return {getA1Notation(){return `A${row}:Z${row+numRows-1}`;}};},
        getLastColumn(){return 26;},
        getParent(){return {getUrl(){return "https://docs.google.com/spreadsheets/d/test/edit";}};},
        getSheetId(){return 123;}
    };
    const schema={sheet:fakeSheet,headers:HEADERS,missingHeaders:[]};
    const references=new Map([[FILE_A,[{row:2,column:9},{row:4,column:10}]]]);
    const getSchema=()=>schema;
    const collect=()=>({references,unverifiableReferenceCount:0});
    const extract=new Function(helperSources.extractDriveFileIds+"\nreturn extractDriveFileIds;")();
    const getDuplicateRows=new Function("extractDriveFileIds",fnSource(admin,"getDuplicateDriveImageRows_")+"\nreturn getDuplicateDriveImageRows_;")(extract);
    const getReconciliationUrl=new Function(fnSource(admin,"getReplacedImageReconciliationUrl_")+"\nreturn getReplacedImageReconciliationUrl_;")();
    const fn=new Function("getReplacedImagesReadSchema_","collectActiveDriveReferences","getReplacedImageRecordType",
        "isKnownReplacedImageStatus_","getReplacedImageRecordIdentity_","extractDriveFileIds",
        "getDuplicateDriveImageRows_","getReplacedImageReconciliationUrl_",
        fnSource(admin,"handleGetReplacedImages")+"\nreturn handleGetReplacedImages;")
        (getSchema,collect,new Function(helperSources.getReplacedImageRecordType+"\nreturn getReplacedImageRecordType;")(),
            new Function(helperSources.isKnownReplacedImageStatus_+"\nreturn isKnownReplacedImageStatus_;")(),
            new Function("extractDriveFileIds",helperSources.getReplacedImageRecordIdentity_+"\nreturn getReplacedImageRecordIdentity_;")(extract),
            extract,getDuplicateRows,getReconciliationUrl);
    const result=fn({},()=>{});
    assert.equal(result.schemaStatus,"ready");
    assert.equal(result.referenceCheckStatus,"verified");
    assert.deepEqual(result.data.map(item=>item.estado).sort(),
        ["cancelada","en_papelera","historica","requiere_revision","restablecida","sin_uso_detectado"].sort());
    assert.equal(result.data.find(item=>item.id_reemplazo==="HIST").active_reference_count,2);
    assert.equal(result.review.length,5);
    assert.ok(result.review.every(item=>item.reason));
    assert.ok(result.review.find(item=>item.id_reemplazo==="DUP").reconciliationUrl.includes("gid=123"));
    const duplicateDriveRow=rows.find(row=>row[0]==="HIST").slice();
    duplicateDriveRow[0]="DUP-DRIVE";
    rows.push(duplicateDriveRow);
    const duplicateDriveResult=fn({},()=>{});
    const duplicateDriveReviews=duplicateDriveResult.review.filter(item=>item.driveFileId===FILE_A &&
        item.reason.includes("Drive ID duplicado") && item.reconciliationUrl);
    assert.equal(duplicateDriveReviews.length,2);
    assert.equal(duplicateDriveResult.data.some(item=>item.id_reemplazo==="HIST"),false);
});

function buildRecover({status="historica",duplicate=false,trashed=false,mime="image/jpeg",failStatus=false,failRollback=false,conflicts=[]}={}) {
    const historySheet=createSheet([HEADERS,makeRow({id:"REP-RECOVER",status})]);
    const lock=lockHarness();
    let driveCalls=0;
    const file={getMimeType:()=>mime,isTrashed:()=>trashed};
    const active={value:"",writes:0,getValue(){return this.value;},setValue(value){this.writes++;this.value=value;}};
    const cuts={getLastRow:()=>2,getRange(row,col,nr,nc){
        if(row===2&&col===1)return {getValues:()=>[["VEH-1"]]};
        if(row===2&&col===9)return active;
        throw new Error("unexpected Cortes range "+row+","+col);
    }};
    const spreadsheet={getSheetByName:()=>cuts};
    const extract=new Function(helperSources.extractDriveFileIds+"\nreturn extractDriveFileIds;")();
    const getType=new Function(helperSources.getReplacedImageRecordType+"\nreturn getReplacedImageRecordType;")();
    const getIdentity=new Function("extractDriveFileIds",helperSources.getReplacedImageRecordIdentity_+"\nreturn getReplacedImageRecordIdentity_;")(extract);
    const find=new Function(helperSources.findReplacedImageRecordById+"\nreturn findReplacedImageRecordById;")();
    const setStatus=new Function("SpreadsheetApp",helperSources.setReplacedImageHistoryStatusVerified_+"\nreturn setReplacedImageHistoryStatusVerified_;")({flush(){}});
    let failedStatus=false;
    const wrappedStatus=(sheet,row,statusValue)=>{
        if(failStatus&&!failedStatus&&statusValue==="restablecida"){failedStatus=true;throw new Error("simulated history flush failure");}
        return setStatus(sheet,row,statusValue);
    };
    const restore=new Function("SpreadsheetApp",helperSources.restoreAdminImageActiveCell_+"\nreturn restoreAdminImageActiveCell_;")({flush(){}});
    const restoreCell=(cell,url)=>{if(failRollback)throw new Error("simulated cell rollback failure");return restore(cell,url);};
    const api=new Function(
        "LockService","getOrCreateReplacedImagesSheet","ensureReplacedImagesInventoryColumns","findReplacedImageRecordById",
        "getReplacedImageRecordType","getReplacedImageRecordIdentity_","DriveApp","COLS_CORTES","getCortesRootFolder",
        "isFileInsideCortes","getSpreadsheet","SHEET_NAMES","collectActiveDriveReferences","recordReplacedImage",
        "SpreadsheetApp","setReplacedImageHistoryStatusVerified_","restoreAdminImageActiveCell_",
        "updateAdminImageReplacementHistoryStatus_","extractDriveFileIds",
        fnSource(admin,"handleRecoverReplacedImage")+"\nreturn handleRecoverReplacedImage;"
    )(lock.LockService,()=>historySheet,()=>HEADERS,find,getType,getIdentity,
        {getFileById(id){driveCalls++;return file;}},{imagenVehiculo:9},()=>({getId:()=>"ROOT"}),
        ()=>true,()=>spreadsheet,{CORTES:"Cortes"},()=>({unverifiableReferenceCount:0,references:new Map(conflicts)}),
        ()=>{throw new Error("unexpected swap record");},{flush(){}},wrappedStatus,restoreCell,()=>{},extract);
    return {run:()=>api({id_reemplazo:"REP-RECOVER"},()=>{}),historySheet,active,file,lock,driveCalls:()=>driveCalls};
}

check("La restauración rechaza en_papelera, requiere_revision y cancelada antes de tocar Drive",()=>{
    for(const status of ["en_papelera","requiere_revision","cancelada"]){
        const h=buildRecover({status});
        assert.throws(()=>h.run(),/no permite restaurar automáticamente/);
        assert.equal(h.driveCalls(),0);
        assert.equal(h.active.writes,0);
    }
});

check("La restauración rechaza un archivo en papelera o un MIME que no sea imagen",()=>{
    const trashed=buildRecover({trashed:true});
    assert.throws(()=>trashed.run(),/está en papelera/);
    assert.equal(trashed.active.writes,0);
    const nonImage=buildRecover({mime:"application/pdf"});
    assert.throws(()=>nonImage.run(),/no es una imagen/);
    assert.equal(nonImage.active.writes,0);
});

check("La restauración revierte la celda y conserva el estado anterior si falla el cierre histórico",()=>{
    const h=buildRecover({failStatus:true});
    assert.throws(()=>h.run(),/simulated history flush failure/);
    assert.equal(h.active.value,"");
    assert.equal(h.historySheet.cells[1][10],"historica");
});

check("Si falla la compensación de la celda, el historial queda marcado requiere_revision",()=>{
    const h=buildRecover({failStatus:true,failRollback:true});
    assert.throws(()=>h.run(),/compensación no pudo confirmarse/);
    assert.equal(h.historySheet.cells[1][10],"requiere_revision");
});

function buildDelete({status="historica",failStatus=false,failDriveRollback=false}={}) {
    const historySheet=createSheet([HEADERS,makeRow({id:"REP-DELETE",status})]);
    const lock=lockHarness();let driveCalls=0,failed=false;
    const file={trashed:false,getMimeType:()=>"image/jpeg",isTrashed(){return this.trashed;},
        setTrashed(value){if(!value&&failDriveRollback)throw new Error("drive rollback failed");this.trashed=value;},getName:()=>"image.jpg"};
    const extract=new Function(helperSources.extractDriveFileIds+"\nreturn extractDriveFileIds;")();
    const getType=new Function(helperSources.getReplacedImageRecordType+"\nreturn getReplacedImageRecordType;")();
    const getIdentity=new Function("extractDriveFileIds",helperSources.getReplacedImageRecordIdentity_+"\nreturn getReplacedImageRecordIdentity_;")(extract);
    const find=new Function(helperSources.findReplacedImageRecordById+"\nreturn findReplacedImageRecordById;")();
    const setStatus=new Function("SpreadsheetApp",helperSources.setReplacedImageHistoryStatusVerified_+"\nreturn setReplacedImageHistoryStatusVerified_;")({flush(){}});
    const wrappedStatus=(sheet,row,statusValue)=>{
        if(failStatus&&!failed&&statusValue==="en_papelera"){failed=true;throw new Error("simulated status write failure");}
        return setStatus(sheet,row,statusValue);
    };
    const setPrevious=new Function("SpreadsheetApp",helperSources.setReplacedImageTrashPreviousStatusVerified_+"\nreturn setReplacedImageTrashPreviousStatusVerified_;")({flush(){}});
    const api=new Function(
        "LockService","getOrCreateReplacedImagesSheet","ensureReplacedImagesInventoryColumns","findReplacedImageRecordById",
        "getReplacedImageRecordType","isKnownReplacedImageStatus_","getReplacedImageRecordIdentity_","collectActiveDriveReferences",
        "setReplacedImageTrashPreviousStatusVerified_","DriveApp","getCortesRootFolder","getSingleParentFolderInsideCortes","getFolderPathInsideCortes",
        "setReplacedImageHistoryStatusVerified_","recordImageAdministrationActivity","logMessage",
        fnSource(admin,"handleDeleteReplacedImage")+"\nreturn handleDeleteReplacedImage;"
    )(lock.LockService,()=>historySheet,()=>HEADERS,find,getType,
        new Function(helperSources.isKnownReplacedImageStatus_+"\nreturn isKnownReplacedImageStatus_;")(),
        getIdentity,()=>({references:new Map(),unverifiableReferenceCount:0}),setPrevious,
        {getFileById(){driveCalls++;return file;}},()=>({getId:()=>"ROOT"}),()=>({}),()=>"Cortes/Original",
        wrappedStatus,()=>{},()=>{});
    return {run:()=>api({id_reemplazo:"REP-DELETE"},()=>{}),historySheet,file,driveCalls:()=>driveCalls};
}

check("La eliminación revierte Drive si el cambio de estado no se confirma",()=>{
    const h=buildDelete({failStatus:true});
    assert.throws(()=>h.run(),/operación fue revertida/);
    assert.equal(h.file.trashed,false);
    assert.equal(h.historySheet.cells[1][10],"historica");
});

check("Si Drive no puede compensar una eliminación, el registro queda requiere_revision",()=>{
    const h=buildDelete({failStatus:true,failDriveRollback:true});
    assert.throws(()=>h.run(),/no se confirmó la compensación/);
    assert.equal(h.file.trashed,true);
    assert.equal(h.historySheet.cells[1][10],"requiere_revision");
});

check("Las acciones mutantes usan búsqueda única e identidad; la descarga no migra al leer",()=>{
    const move=fnSource(admin,"handleMoveReplacedImage");
    const del=fnSource(admin,"handleDeleteReplacedImage");
    const download=fnSource(admin,"handleGetReplacedImageDownloadUrl");
    const record=fnSource(admin,"recordReplacedImage");
    assert.ok(move.includes("findReplacedImageRecordById")&&move.includes("getReplacedImageRecordIdentity_"));
    assert.ok(del.includes("findReplacedImageRecordById")&&del.includes("getReplacedImageRecordIdentity_"));
    assert.ok(download.includes("findReplacedImageRecordById")&&download.includes("getReplacedImageRecordIdentity_"));
    assert.ok(!download.includes("getOrCreateReplacedImagesSheet")&&!download.includes("ensureReplacedImagesInventoryColumns"));
    assert.ok(record.includes("findReplacedImageRecordById")&&record.includes("getReplacedImageRecordIdentity_"));
    assert.ok(fnSource(admin,"handleSaveUnusedImagesInventory").includes("getDuplicateReplacedImageIds_"));
    assert.ok(fnSource(admin,"handleOrganizeUnusedImagesBatch").includes("getDuplicateReplacedImageIds_"));
});

check("La acción de migración coordina el lock, ejecuta el esquema y devuelve un resultado verificable",()=>{
    const source=fnSource(admin,"handleMigrateReplacedImagesSchema");
    let locked=false,waits=0,releases=0,creates=0,migrations=0;
    const lock={waitLock(){waits++;locked=true;},releaseLock(){releases++;locked=false;}};
    const handler=new Function("LockService","getOrCreateReplacedImagesSheet","ensureReplacedImagesInventoryColumns",source+"\nreturn handleMigrateReplacedImagesSchema;")(
        {getScriptLock:()=>lock},()=>{creates++;return {getLastRow:()=>4};},()=>{migrations++;return HEADERS;});
    const result=handler({},()=>{});
    assert.equal(result.status,"success");
    assert.equal(result.migrated,true);
    assert.equal(result.rowCount,3);
    assert.equal(result.columnCount,27);
    assert.equal(creates,1);
    assert.equal(migrations,1);
    assert.equal(waits,1);
    assert.equal(releases,1);
    assert.equal(locked,false);
});

check("La migración explícita queda protegida por lease y despachada por ADMIN",()=>{
    const source=readFileSync(new URL("../Services/admin.js",import.meta.url),"utf8");
    assert.ok(source.includes('"migrateReplacedImagesSchema"].includes(action)'));
    assert.ok(source.includes("case 'migrateReplacedImagesSchema':"));
    assert.ok(source.includes("function handleMigrateReplacedImagesSchema"));
    const uiSource=ui;
    assert.ok(uiSource.includes('routeAction("migrateReplacedImagesSchema"'));
    assert.ok(uiSource.includes("Migrar esquema"));
});


check("La captura de Cortes lee solo los ocho campos de imagen y conserva fórmula, rich text e imágenes de celda",()=>{
    const fields=["imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"];
    const columns={imagenVehiculo:2,imgCorte1:3,imgCorte2:6,imgCorte3:7,imgApertura:10,imgCableAlimen:12,imgCableAlimen2:13,imgCableAlimen3:18};
    const FILE_C="cdefghij123456789012",FILE_D="defghij1234567890123",FILE_E="efghij12345678901234";
    const display={2:["https://drive.google.com/file/d/"+FILE_A+"/view",""],3:["",""],6:["",""],7:["",""],10:["",""],12:["https://drive.google.com/file/d/bad-id/view",""],13:["",""],18:["",""]};
    const formulas={6:['=IMAGE("https://drive.google.com/uc?id='+FILE_B+'")',""]};
    const rich={7:[{getLinkUrl:()=>"https://drive.google.com/file/d/"+FILE_C+"/view",getRuns:()=>[]},""],
        10:[{getLinkUrl:()=>"",getRuns:()=>[{getLinkUrl:()=>"https://drive.google.com/file/d/"+FILE_D+"/view"}]},""]};
    const raw={13:[{getContentUrl:()=>"https://drive.google.com/file/d/"+FILE_E+"/view"},""]};
    const calls=[];
    const sheet={
        getLastRow:()=>3,
        getLastColumn(){throw new Error("No debe materializar el ancho completo de Cortes.");},
        getRange(row,col,numRows,numCols){
            calls.push({row,col,numRows,numCols});
            const at=(source,r,c)=>source[col+c]&&source[col+c][r]!==undefined?source[col+c][r]:"";
            return {
                getDisplayValues:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>at(display,r,c))),
                getValues:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>at(raw,r,c))),
                getFormulas:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>at(formulas,r,c))),
                getRichTextValues:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>at(rich,r,c)))
            };
        }
    };
    const source=fnSource(admin,"extractDriveFileIds")+"\n"+fnSource(admin,"collectCortesImageReferences");
    const scan=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES",source+"\nreturn collectCortesImageReferences;")(
        ()=>({getSheetByName:()=>sheet}),{CORTES:"Cortes"},columns);
    const result=scan(true);
    for(const id of [FILE_A,FILE_B,FILE_C,FILE_D,FILE_E])assert.ok(result.references.has(id),"Falta referencia "+id);
    assert.equal(result.unverifiableReferenceCount,1);
    assert.equal(result.metrics.columns,8);
    assert.equal(result.metrics.cells,16);
    assert.equal(result.metrics.ranges,5);
    assert.equal(calls.reduce((sum,item)=>sum+item.numCols,0),8);
    assert.ok(calls.every(item=>item.row===2&&item.numRows===2&&item.col>0));
    assert.equal(result.references.get(FILE_C)[0].row,2);
    assert.equal(result.references.get(FILE_C)[0].column,7);
    const incompleteColumns=Object.assign({},columns);delete incompleteColumns.imgCableAlimen3;
    const invalidScan=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES",source+"\nreturn collectCortesImageReferences;")(
        ()=>({getSheetByName:()=>sheet}),{CORTES:"Cortes"},incompleteColumns);
    assert.throws(()=>invalidScan(false),/ocho columnas/);
});
check("La captura de Cortes limita memoria por bloques y conserva filas posteriores al primer bloque",()=>{
    const columns={imagenVehiculo:9,imgCorte1:16,imgCorte2:23,imgCorte3:30,imgApertura:34,imgCableAlimen:36,imgCableAlimen2:40,imgCableAlimen3:42};
    const calls=[], targetId=FILE_A;
    const sheet={
        getLastRow:()=>502,
        getRange(row,col,numRows,numCols){
            calls.push({row,col,numRows,numCols});
            const make=(kind)=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>{
                if(kind==="display"&&row+r===502&&col+c===9)return "https://drive.google.com/file/d/"+targetId+"/view";
                return "";
            }));
            return {getDisplayValues:()=>make("display"),getValues:()=>make("raw"),
                getFormulas:()=>make("formula"),getRichTextValues:()=>make("rich")};
        }
    };
    const source=fnSource(admin,"extractDriveFileIds")+"\n"+fnSource(admin,"collectCortesImageReferences");
    const scan=new Function("getSpreadsheet","SHEET_NAMES","COLS_CORTES",source+"\nreturn collectCortesImageReferences;")(
        ()=>({getSheetByName:()=>sheet}),{CORTES:"Cortes"},columns);
    const result=scan(true);
    assert.ok(result.references.has(targetId));
    assert.equal(result.references.get(targetId)[0].row,502);
    assert.equal(result.metrics.rows,501);
    assert.equal(result.metrics.cells,4008);
    assert.equal(result.metrics.initialRowChunkSize,500);
    assert.equal(result.metrics.minRowChunkSize,50);
    assert.equal(result.metrics.maxRowChunkSize,500);
    assert.equal(result.metrics.finalRowChunkSize,500);
    assert.equal(result.metrics.captureBudgetMs,12000);
    assert.equal(result.metrics.targetChunkMs,1500);
    assert.equal(result.metrics.chunks,16);
    assert.equal(calls.length,16);
    assert.ok(calls.every(item=>item.numRows<=500));
    for(const metric of ["displayReadMs","rawReadMs","formulaReadMs","richTextReadMs","referenceParseMs","maxChunkElapsedMs","adaptiveChunkChanges"]) {
        assert.ok(Number.isFinite(result.metrics[metric]),"Métrica ausente o inválida: "+metric);
    }
    assert.equal(Math.max(...calls.map(item=>item.row+item.numRows-1)),502);
});
check("La captura reduce automáticamente el lote tras un bloque lento sin omitir filas",()=>{
    const columns={imagenVehiculo:9,imgCorte1:10,imgCorte2:11,imgCorte3:12,imgApertura:13,imgCableAlimen:14,imgCableAlimen2:15,imgCableAlimen3:16};
    let clock=0,readCalls=0;
    class FakeDate { static now(){ return clock; } }
    const sheet={
        getLastRow:()=>502,
        getRange(row,col,numRows,numCols){
            return {
                getDisplayValues(){ clock+=readCalls++<4?500:50; return Array.from({length:numRows},()=>Array(numCols).fill("")); },
                getValues(){ clock+=readCalls++<4?500:50; return Array.from({length:numRows},()=>Array(numCols).fill("")); },
                getFormulas(){ clock+=readCalls++<4?500:50; return Array.from({length:numRows},()=>Array(numCols).fill("")); },
                getRichTextValues(){ clock+=readCalls++<4?500:50; return Array.from({length:numRows},()=>Array(numCols).fill("")); }
            };
        }
    };
    const source=fnSource(admin,"extractDriveFileIds")+"\n"+fnSource(admin,"collectCortesImageReferences");
    const scan=new Function("Date","getSpreadsheet","SHEET_NAMES","COLS_CORTES",source+"\nreturn collectCortesImageReferences;")(
        FakeDate,()=>({getSheetByName:()=>sheet}),{CORTES:"Cortes"},columns);
    const result=scan(false);
    assert.equal(result.metrics.rows,501);
    assert.equal(result.metrics.chunks,2);
    assert.equal(result.metrics.adaptiveChunkChanges,2);
    assert.equal(result.metrics.maxChunkElapsedMs,2000);
    assert.equal(result.metrics.smallestAdaptiveRowChunkSize,375);
    assert.equal(result.metrics.finalRowChunkSize,500);
});
check("La captura detiene un lote que excede el presupuesto y nunca devuelve un snapshot parcial",()=>{
    const columns={imagenVehiculo:9,imgCorte1:10,imgCorte2:11,imgCorte3:12,imgApertura:13,imgCableAlimen:14,imgCableAlimen2:15,imgCableAlimen3:16};
    let clock=0,readCalls=0;
    class FakeDate { static now(){ return clock; } }
    const sheet={
        getLastRow:()=>502,
        getRange(_row,_col,numRows,numCols){
            const values=()=>Array.from({length:numRows},()=>Array(numCols).fill(""));
            const slow=()=>{clock+=4000;return values();};
            return {getDisplayValues:slow,getValues:slow,getFormulas:slow,getRichTextValues:slow};
        }
    };
    const source=fnSource(admin,"extractDriveFileIds")+"\n"+fnSource(admin,"collectCortesImageReferences");
    const scan=new Function("Date","getSpreadsheet","SHEET_NAMES","COLS_CORTES",source+"\nreturn collectCortesImageReferences;")(
        FakeDate,()=>({getSheetByName:()=>sheet}),{CORTES:"Cortes"},columns);
    assert.throws(()=>scan(false),/presupuesto temporal seguro/);
});
check("El escáner global delega Cortes a los ocho campos y mantiene imágenes superpuestas y otras hojas",()=>{
    const scanner=fnSource(admin,"collectActiveDriveReferences");
    assert.ok(scanner.includes("collectCortesImageReferences(includeLocations)"));
    assert.ok(scanner.includes("sheet.getDataRange()"));
    assert.ok(scanner.includes("sheet.getImages()"));
    assert.ok(scanner.includes("rawValue.getContentUrl"));
    assert.ok(scanner.includes("richText.getRuns"));
    assert.ok(scanner.includes("metrics: { cortes: cortesScanMetrics }"));
});
check("La pertenencia a Cortes memoiza ancestros por petición sin marcar como válidas ramas externas",()=>{
    const makeFolder=(id,parents=[])=>{let calls=0;return{id,getId:()=>id,getParents(){calls++;let i=0;return{hasNext:()=>i<parents.length,next:()=>parents[i++]};},get calls(){return calls;}};};
    const root=makeFolder("root-folder"),inside=makeFolder("inside-folder",[root]),leaf=makeFolder("leaf-folder",[inside]);
    const outsideRoot=makeFolder("outside-root"),outside=makeFolder("outside-folder",[outsideRoot]);
    const mixed=makeFolder("mixed-folder",[outside,inside]),cache=new Map();
    const fn=new Function("Map",fnSource(admin,"isFolderInsideCortes")+"\nreturn isFolderInsideCortes;")(Map);
    assert.equal(fn(leaf,"root-folder",cache),true);
    const before=inside.calls;
    assert.equal(fn(inside,"root-folder",cache),true);
    assert.equal(inside.calls,before);
    assert.equal(fn(mixed,"root-folder",cache),true);
    assert.notEqual(cache.get("outside-folder"),true);
    assert.equal(fn(outside,"root-folder",cache),false);
    assert.equal(cache.get("outside-folder"),false);
});
check("Cada petición de auditoría conserva un presupuesto temporal y expone métricas de etapa/tamaño",()=>{
    const audit=fnSource(admin,"handleAuditDriveImagesInCortesLocked_");
    assert.ok(audit.includes("const batchBudgetMs = 18000"));
    assert.ok(audit.includes("Date.now() - batchStartedAt < batchBudgetMs"));
    for(const metric of ["referenceCaptureMs","historyCaptureMs","snapshotLoadMs","snapshotPersistMs",
        "cursorValidationMs","deduplicationLoadMs","driveTraversalMs","cachePersistenceMs",
        "activeReferenceCount","snapshotBytes","responseBytes","folderMembershipCacheEntries","cortesCellsRead","cortesReadRanges"]) {
        assert.ok(audit.includes(metric),"Falta métrica "+metric);
    }
});

check("La interfaz muestra estados históricos y filas inválidas en una sección de revisión",()=>{
    assert.ok(ui.includes("cachedReview"));
    assert.ok(ui.includes("replaced-images-review"));
    assert.ok(ui.includes("Registros que requieren revisión"));
    assert.ok(ui.includes("['historica', 'restablecida'].includes(status)"));
    assert.ok(ui.includes("referenceSafe"));
    assert.ok(ui.includes("schemaWarnings"));
});


const auditHelperNames = [
    "cleanupExpiredDriveAuditServerStates_", "getDriveAuditServerStateKey_", "hashDriveAuditValue_", "getDriveAuditCursorFingerprint_",
    "normalizeDriveAuditFileIds_", "hashDriveAuditFileIds_", "saveDriveAuditServerState_",
    "loadDriveAuditServerState_", "getDriveAuditPageResultCacheKey_", "getDriveAuditResponseCacheKey_",
    "getDriveAuditSeenPageCacheKey_", "storeDriveAuditSeenPage_", "loadDriveAuditSeenIds_",
    "getDuplicateDriveImageRows_", "getReplacedImageReconciliationUrl_", "buildVerifiedDriveVisualizationUrl_",
    "storeDriveAuditPageResults_", "loadDriveAuditUnusedFileIds_", "getLatestDriveAuditIdForUser_",
    "validateCompletedDriveAudit_", "getDriveAuditReferenceSnapshotConfig_", "validateAuditDriveReferenceSnapshot_",
    "removeAuditDriveReferenceSnapshotCache_", "storeAuditDriveReferenceSnapshot", "loadAuditDriveReferenceSnapshot",
    "refreshAuditDriveReferenceSnapshot_", "clearAuditDriveReferenceSnapshot", "clearExpiredDriveAuditCacheState_"
];
const auditHelperSource = auditHelperNames.map(name => fnSource(admin, name)).join("\n");
function auditHarness() {
    const properties = new Map(), cache = new Map();
    const PropertiesService = { getScriptProperties: () => ({
        getProperty: key => properties.has(key) ? properties.get(key) : null,
        getProperties: () => Object.fromEntries(properties),
        setProperty: (key, value) => { properties.set(key, String(value)); },
        deleteProperty: key => properties.delete(key)
    }) };
    const cacheTtl = new Map();
    let failPutKey = "", evictPageOnManifest = false;
    const CacheService = { getScriptCache: () => ({
        get: key => cache.has(key) ? cache.get(key) : null,
        put: (key, value, ttl) => {
            if (failPutKey === key) throw new Error("simulated cache write failure");
            cache.set(key, String(value));
            if (ttl !== undefined) cacheTtl.set(key, ttl);
            if (evictPageOnManifest && key.endsWith("_manifest")) {
                cache.delete(key.replace("_manifest", "_0"));
                evictPageOnManifest = false;
            }
        },
        remove: key => cache.delete(key),
        removeAll: keys => keys.forEach(key => cache.delete(key))
    }) };
    const Utilities = {
        DigestAlgorithm: { SHA_256: "SHA-256" }, Charset: { UTF_8: "utf8" },
        computeDigest: (_algorithm, value) => Array.from(createHash("sha256").update(String(value), "utf8").digest()),
        newBlob: value => ({ getBytes: () => Array.from(Buffer.from(String(value), "utf8")) })
    };
    const extractDriveFileIds = value => {
        const text = String(value || "").trim();
        const matches = [];
        if (text.includes("/d/")) {
            const candidate = text.split("/d/")[1].split(/[/?#&]/)[0];
            if (/^[a-zA-Z0-9_-]{20,}$/.test(candidate)) matches.push(candidate);
        }
        const idMatch = text.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
        if (idMatch) matches.push(idMatch[1]);
        if (matches.length) return Array.from(new Set(matches));
        return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? [text] : [];
    };
    const api = new Function("PropertiesService","CacheService","Utilities","extractDriveFileIds",auditHelperSource+
        "\nreturn {cleanupExpiredDriveAuditServerStates_,clearExpiredDriveAuditCacheState_,getDriveAuditServerStateKey_,getDriveAuditPageResultCacheKey_,hashDriveAuditValue_,getDriveAuditCursorFingerprint_,normalizeDriveAuditFileIds_,hashDriveAuditFileIds_,saveDriveAuditServerState_,loadDriveAuditServerState_,getDriveAuditSeenPageCacheKey_,storeDriveAuditSeenPage_,loadDriveAuditSeenIds_,getDuplicateDriveImageRows_,getReplacedImageReconciliationUrl_,buildVerifiedDriveVisualizationUrl_,storeDriveAuditPageResults_,loadDriveAuditUnusedFileIds_,getLatestDriveAuditIdForUser_,validateCompletedDriveAudit_,getDriveAuditReferenceSnapshotConfig_,validateAuditDriveReferenceSnapshot_,removeAuditDriveReferenceSnapshotCache_,storeAuditDriveReferenceSnapshot,loadAuditDriveReferenceSnapshot,refreshAuditDriveReferenceSnapshot_,clearAuditDriveReferenceSnapshot};")(
            PropertiesService,CacheService,Utilities,extractDriveFileIds);
    return { ...api, properties, cache, cacheTtl,
        setFailPutKey: key => { failPutKey = String(key || ""); },
        setEvictPageOnManifest: value => { evictPageOnManifest = value === true; } };
}
const AUDIT_ID = "123e4567-e89b-42d3-a456-426614174000";
const AUDIT_OWNER = "USR-DEVELOPER-1";


function makeReferenceSnapshot(count = 2) {
    const ids = Array.from({ length: count }, (_, i) => "drive-file-id-" + String(i).padStart(12, "0"));
    return { activeDriveIds: ids, historicalDriveIds: [], protectedDriveIds: [],
        unverifiableReferenceCount: 0 };
}
check("El snapshot de referencias usa manifiesto versionado, MIME JSON, límites por bloque y SHA-256",()=>{
    const h=auditHarness(), config=h.getDriveAuditReferenceSnapshotConfig_(), snapshot=makeReferenceSnapshot(2500);
    const manifest=h.storeAuditDriveReferenceSnapshot(AUDIT_ID,snapshot);
    assert.equal(manifest.schemaVersion,2);
    assert.equal(manifest.mimeType,"application/json; charset=utf-8");
    assert.equal(manifest.encoding,"utf-8");
    assert.equal(manifest.ttlSeconds,21600);
    assert.ok(manifest.byteLength<=config.maxLength);
    assert.ok(manifest.chunkCount<=10);
    assert.equal(manifest.chunkHashes.length,manifest.chunkCount);
    assert.match(manifest.sha256,/^[a-f0-9]{64}$/);
    for(let i=0;i<manifest.chunkCount;i++){
        const key="gp_audit_refs_"+AUDIT_ID+"_"+i;
        assert.ok(Buffer.byteLength(h.cache.get(key),"utf8")<=config.chunkSize);
        assert.equal(h.cacheTtl.get(key),config.ttlSeconds);
    }
    assert.deepEqual(h.loadAuditDriveReferenceSnapshot(AUDIT_ID),snapshot);
});
check("La escritura vuelve a verificar todos los bloques después de publicar el manifiesto",()=>{
    const h=auditHarness();
    h.setEvictPageOnManifest(true);
    assert.throws(()=>h.storeAuditDriveReferenceSnapshot(AUDIT_ID,makeReferenceSnapshot()),/desalojada|completo/);
    assert.equal([...h.cache.keys()].some(key=>key.startsWith("gp_audit_refs_"+AUDIT_ID)),false);
});
check("Un snapshot que excede la capacidad se rechaza sin conservar bloques parciales",()=>{
    const h=auditHarness(), snapshot=makeReferenceSnapshot(40000);
    assert.throws(()=>h.storeAuditDriveReferenceSnapshot(AUDIT_ID,snapshot),/750,000/);
    assert.equal([...h.cache.keys()].some(key=>key.startsWith("gp_audit_refs_"+AUDIT_ID)),false);
});
check("Una alteración de bloque o manifiesto bloquea la reanudación y limpia el snapshot",()=>{
    const h=auditHarness();h.storeAuditDriveReferenceSnapshot(AUDIT_ID,makeReferenceSnapshot());
    const key="gp_audit_refs_"+AUDIT_ID+"_0";
    h.cache.set(key,h.cache.get(key)+"x");
    assert.throws(()=>h.loadAuditDriveReferenceSnapshot(AUDIT_ID),/firma|longitud|tamaño/);
    assert.equal([...h.cache.keys()].some(item=>item.startsWith("gp_audit_refs_"+AUDIT_ID)),false);
    h.storeAuditDriveReferenceSnapshot(AUDIT_ID,makeReferenceSnapshot());
    const manifestKey="gp_audit_refs_"+AUDIT_ID+"_manifest", manifest=JSON.parse(h.cache.get(manifestKey));
    manifest.sha256="0".repeat(64);h.cache.set(manifestKey,JSON.stringify(manifest));
    assert.throws(()=>h.loadAuditDriveReferenceSnapshot(AUDIT_ID),/manifiesto|firma/);
});
check("La renovación cercana al TTL conserva la fecha original y extiende la retención",()=>{
    const h=auditHarness(), originalNow=Date.now;let now=1800000000000;Date.now=()=>now;
    try{
        const snapshot=makeReferenceSnapshot(3), first=h.storeAuditDriveReferenceSnapshot(AUDIT_ID,snapshot);
        const createdAt=first.createdAt;
        now+=21599000;
        assert.deepEqual(h.loadAuditDriveReferenceSnapshot(AUDIT_ID),snapshot);
        const refreshed=h.refreshAuditDriveReferenceSnapshot_(AUDIT_ID,snapshot);
        assert.equal(refreshed.createdAt,createdAt);
        assert.equal(refreshed.updatedAt,now);
        assert.ok(refreshed.updatedAt>first.updatedAt);
        assert.equal(h.cacheTtl.get("gp_audit_refs_"+AUDIT_ID+"_0"),21600);
        assert.equal(h.cacheTtl.get("gp_audit_refs_"+AUDIT_ID+"_manifest"),21600);
        const pageKey=h.getDriveAuditSeenPageCacheKey_(AUDIT_ID,0);
        h.storeDriveAuditPageResults_(AUDIT_ID,0,[FILE_A]);
        h.storeDriveAuditSeenPage_(AUDIT_ID,0,[FILE_A],[FILE_A]);
        now+=1000;
        h.loadDriveAuditSeenIds_(AUDIT_ID,1);
        assert.equal(h.cacheTtl.get(pageKey),21600);
    }finally{Date.now=originalNow;}
});
check("Una falla al renovar TTL conserva el snapshot anterior íntegro y reintentable",()=>{
    const h=auditHarness(), snapshot=makeReferenceSnapshot(3);
    h.storeAuditDriveReferenceSnapshot(AUDIT_ID,snapshot);
    const manifestKey="gp_audit_refs_"+AUDIT_ID+"_manifest", pageKey="gp_audit_refs_"+AUDIT_ID+"_0";
    const previousManifest=h.cache.get(manifestKey), previousPage=h.cache.get(pageKey);
    h.setFailPutKey(pageKey);
    assert.throws(()=>h.refreshAuditDriveReferenceSnapshot_(AUDIT_ID,snapshot),/simulated cache write failure/);
    h.setFailPutKey("");
    assert.equal(h.cache.get(manifestKey),previousManifest);
    assert.equal(h.cache.get(pageKey),previousPage);
    assert.deepEqual(h.loadAuditDriveReferenceSnapshot(AUDIT_ID),snapshot);
});
check("Un snapshot legado JSON se valida y migra al manifiesto íntegro versión 2",()=>{
    const h=auditHarness(), snapshot=makeReferenceSnapshot(2);
    const prefix="gp_audit_refs_"+AUDIT_ID, serialized=JSON.stringify(snapshot);
    h.cache.set(prefix+"_0",serialized);
    h.cache.set(prefix+"_manifest",JSON.stringify({chunkCount:1,length:serialized.length,encoding:"json"}));
    assert.deepEqual(h.loadAuditDriveReferenceSnapshot(AUDIT_ID),snapshot);
    const refreshed=h.refreshAuditDriveReferenceSnapshot_(AUDIT_ID,snapshot);
    const manifest=JSON.parse(h.cache.get(prefix+"_manifest"));
    assert.equal(refreshed.schemaVersion,2);
    assert.equal(manifest.schemaVersion,2);
    assert.equal(manifest.chunkHashes.length,1);
    assert.equal(manifest.sha256.length,64);
});
check("Un snapshot pausado más de seis horas expira y no devuelve contenido parcial",()=>{
    const h=auditHarness(), originalNow=Date.now;let now=1800000000000;Date.now=()=>now;
    try{
        h.storeAuditDriveReferenceSnapshot(AUDIT_ID,makeReferenceSnapshot());
        now+=21600001;
        assert.throws(()=>h.loadAuditDriveReferenceSnapshot(AUDIT_ID),/expiró/);
        assert.equal([...h.cache.keys()].some(key=>key.startsWith("gp_audit_refs_"+AUDIT_ID)),false);
    }finally{Date.now=originalNow;}
});
check("La limpieza elimina bloques huérfanos incluso si falta el manifiesto",()=>{
    const h=auditHarness(),prefix="gp_audit_refs_"+AUDIT_ID;
    h.cache.set(prefix+"_0","orphan");h.cache.set(prefix+"_manifest","{");
    h.clearAuditDriveReferenceSnapshot(AUDIT_ID);
    assert.equal([...h.cache.keys()].some(key=>key.startsWith(prefix)),false);
});

check("La limpieza de estados expirados elimina también páginas, respuestas y snapshots temporales",()=>{
    const h=auditHarness(), key=h.getDriveAuditServerStateKey_(AUDIT_ID);
    h.saveDriveAuditServerState_({auditId:AUDIT_ID,ownerId:AUDIT_OWNER,status:"running",pageCount:1,lastResponseCacheKey:"audit-response"});
    const pageKey=h.getDriveAuditPageResultCacheKey_(AUDIT_ID,0);
    h.cache.set(pageKey,"page");h.cache.set("audit-response","response");
    h.storeAuditDriveReferenceSnapshot(AUDIT_ID,makeReferenceSnapshot());
    const latestKey="GPSpedia_DRIVE_AUDIT_LATEST_"+h.hashDriveAuditValue_(AUDIT_OWNER).slice(0,32);
    h.properties.set(latestKey,AUDIT_ID);
    const expired=JSON.parse(h.properties.get(key));
    expired.updatedAt=Date.now()-21600001;
    h.properties.set(key,JSON.stringify(expired));
    h.cleanupExpiredDriveAuditServerStates_();
    assert.equal(h.properties.has(key),false);
    assert.equal(h.properties.has(latestKey),false);
    assert.equal(h.cache.has(pageKey),false);
    assert.equal(h.cache.has("audit-response"),false);
    assert.equal([...h.cache.keys()].some(item=>item.startsWith("gp_audit_refs_"+AUDIT_ID)),false);
});
check("El cursor de auditoría se firma por contenido y rechaza una pila vacía o alterada",()=>{
    const h=auditHarness();
    const cursor={stack:[{folderId:"folder-id-0000000000000001",fileToken:"token-a",filesDone:false}],
        totalAnalyzed:25,foldersVisited:2,referenceCacheId:AUDIT_ID,scanVersion:"2.6.1"};
    const fingerprint=h.getDriveAuditCursorFingerprint_(cursor);
    assert.match(fingerprint,/^[a-f0-9]{64}$/);
    const repeatedPosition={...cursor,totalAnalyzed:26,foldersVisited:99};
    assert.equal(fingerprint,h.getDriveAuditCursorFingerprint_(repeatedPosition));
    const auditSource=fnSource(admin,"handleAuditDriveImagesInCortesLocked_");
    assert.ok(auditSource.includes("state.lastRequestFingerprint === inputFingerprint"));
    assert.ok(auditSource.includes("state.lastRequestTotalAnalyzed"));
    assert.ok(auditSource.includes("contadores alterados"));
    assert.ok(auditSource.includes("return JSON.parse(cachedResponse)"));
    assert.notEqual(fingerprint,h.getDriveAuditCursorFingerprint_({...cursor,stack:[{folderId:"folder-id-0000000000000002",fileToken:"token-b",filesDone:false}]}));
    assert.notEqual(fingerprint,h.getDriveAuditCursorFingerprint_({...cursor,scanVersion:"2.6.2"}));
    assert.throws(()=>h.getDriveAuditCursorFingerprint_({...cursor,stack:[]}),/Cursor de auditoría inválido/);
});
check("El estado de auditoría se conserva en servidor y queda vinculado a su propietario",()=>{
    const h=auditHarness();
    h.saveDriveAuditServerState_({auditId:AUDIT_ID,ownerId:AUDIT_OWNER,status:"running",pageCount:1});
    assert.equal(h.loadDriveAuditServerState_(AUDIT_ID).ownerId,AUDIT_OWNER);
    const key=h.getDriveAuditServerStateKey_(AUDIT_ID);
    const state=JSON.parse(h.properties.get(key));
    state.updatedAt=Date.now()-21600001;
    h.properties.set(key,JSON.stringify(state));
    assert.throws(()=>h.loadDriveAuditServerState_(AUDIT_ID),/expiró/);
});
check("El marcador completo exige todas las páginas y coincide con la lista exacta de archivos",()=>{
    const h=auditHarness(), ids=[FILE_A,FILE_B].sort();
    h.storeDriveAuditPageResults_(AUDIT_ID,0,[FILE_A]);
    h.storeDriveAuditPageResults_(AUDIT_ID,1,[FILE_B,FILE_A]);
    assert.deepEqual(h.loadDriveAuditUnusedFileIds_(AUDIT_ID,2),ids);
    const digest=h.hashDriveAuditFileIds_(ids);
    h.saveDriveAuditServerState_({auditId:AUDIT_ID,ownerId:AUDIT_OWNER,status:"complete",
        completedAt:Date.now(),expectedUnusedCount:2,expectedUnusedDigest:digest});
    assert.equal(h.validateCompletedDriveAudit_(AUDIT_ID,AUDIT_OWNER,[{fileId:FILE_A},{fileId:FILE_B}]).auditId,AUDIT_ID);
    assert.throws(()=>h.validateCompletedDriveAudit_(AUDIT_ID,"USR-OTHER",[FILE_A,FILE_B]),/otra sesión/);
    assert.throws(()=>h.validateCompletedDriveAudit_(AUDIT_ID,AUDIT_OWNER,[FILE_A]),/no coincide/);
});
check("La deduplicación global del servidor conserva IDs únicos entre páginas y falla si falta una página",()=>{
    const h=auditHarness();
    h.storeDriveAuditSeenPage_(AUDIT_ID,0,[FILE_A,FILE_A],[FILE_A]);
    h.storeDriveAuditSeenPage_(AUDIT_ID,1,[FILE_B,FILE_A],[FILE_B,FILE_A]);
    assert.deepEqual(h.loadDriveAuditSeenIds_(AUDIT_ID,2),{
        fileIds:[FILE_A,FILE_B].sort(),folderIds:[FILE_A,FILE_B].sort()
    });
    assert.equal(h.getDriveAuditSeenPageCacheKey_(AUDIT_ID,0),h.getDriveAuditPageResultCacheKey_(AUDIT_ID,0));
    assert.equal(h.cache.size,2);
    assert.throws(()=>h.loadDriveAuditSeenIds_(AUDIT_ID,3),/Falta una página/);
});
check("Una página de caché incompleta no sobrescribe los IDs del inventario",()=>{
    const h=auditHarness(), key=h.getDriveAuditSeenPageCacheKey_(AUDIT_ID,0);
    const raw=JSON.stringify({files:[FILE_A],folders:[FILE_B]});
    h.cache.set(key,raw);
    assert.throws(()=>h.storeDriveAuditSeenPage_(AUDIT_ID,0,[FILE_A],[FILE_B]),/estructura incompleta/);
    assert.equal(h.cache.get(key),raw);
});
check("Los duplicados de Drive en Spreadsheet se separan y ofrecen enlace de reconciliación manual",()=>{
    const h=auditHarness();
    const rows=[["id"],["ROW-A","","","","",FILE_A,"",FILE_A],["ROW-B","","","","",FILE_A,"",FILE_A],["ROW-C","","","","",FILE_B,"",FILE_B]];
    assert.deepEqual(h.getDuplicateDriveImageRows_(rows),[{fileId:FILE_A,rowNumbers:[2,3]}]);
    const sheet={getRange:(r,c,n,w)=>({getA1Notation:()=>`A${r}:Z${r+n-1}`}),getLastColumn:()=>26,
        getParent:()=>({getUrl:()=>"https://docs.google.com/spreadsheets/d/test/edit"}),getSheetId:()=>123};
    assert.match(h.getReplacedImageReconciliationUrl_(sheet,[2,3]),/gid=123&range=A2%3AZ3/);
});
check("Las filas con IDs discordantes también se detectan y permiten reconciliación",()=>{
    const h=auditHarness();
    const mixedRows=[["id"],
        ["ROW-A","","","","",FILE_A,"","https://drive.google.com/file/d/"+FILE_B+"/view"],
        ["ROW-B","","","","",FILE_A,"","https://drive.google.com/file/d/"+FILE_A+"/view"]];
    assert.deepEqual(h.getDuplicateDriveImageRows_(mixedRows),[{fileId:FILE_A,rowNumbers:[2,3]}]);
    const readHandler=fnSource(admin,"handleGetReplacedImages");
    assert.ok(readHandler.includes("rowsToReconcile.length ? rowsToReconcile : [r + 1]"));
    assert.ok(readHandler.includes("getReplacedImageReconciliationUrl_(schema.sheet"));
});
check("La URL de miniatura se construye desde un ID válido y no cambia el identificador",()=>{
    const url=new Function(fnSource(admin,"buildVerifiedDriveVisualizationUrl_")+"\nreturn buildVerifiedDriveVisualizationUrl_;")();
    assert.equal(url(FILE_A),"https://lh3.googleusercontent.com/d/"+FILE_A);
    assert.throws(()=>url("bad-id"),/ID de Drive inválido/);
});
check("Una auditoría parcial o una página perdida no puede autorizar el inventario",()=>{
    const h=auditHarness();
    h.saveDriveAuditServerState_({auditId:AUDIT_ID,ownerId:AUDIT_OWNER,status:"running",completedAt:Date.now()});
    assert.throws(()=>h.validateCompletedDriveAudit_(AUDIT_ID,AUDIT_OWNER,[]),/no ha confirmado/);
    assert.throws(()=>h.loadDriveAuditUnusedFileIds_(AUDIT_ID,1),/Falta una página/);
});
check("El inventario y la organización usan la misma auditoría y operación verificadas",()=>{
    const audit=fnSource(admin,"handleAuditDriveImagesInCortesLocked_");
    const save=fnSource(admin,"handleSaveUnusedImagesInventory");
    const organize=fnSource(admin,"handleOrganizeUnusedImagesBatch");
    assert.ok(audit.includes("expectedCursorFingerprint"));
    assert.ok(audit.includes("lastRequestFingerprint"));
    assert.ok(audit.includes("serverCompletionVerified"));
    assert.ok(audit.includes("storeDriveAuditSeenPage_"));
    assert.ok(audit.includes("loadDriveAuditSeenIds_"));
    assert.ok(audit.includes("totalDiscovered"));
    assert.ok(audit.includes("duplicateFolderCount"));
    assert.ok(audit.includes("foldersVisited = 1"));
    assert.ok(audit.includes("previousResponseCacheKey"));
    assert.ok(audit.includes("refreshAuditDriveReferenceSnapshot_(auditId, referenceSnapshot)"));
    assert.ok(audit.includes("loadDriveAuditSeenIds_(auditId, pageIndex)"));
    assert.ok(audit.includes("getScriptCache().remove(previousResponseCacheKey)"));
    const saveIndex=audit.lastIndexOf("saveDriveAuditServerState_(state)");
    const removeIndex=audit.indexOf("CacheService.getScriptCache().remove(previousResponseCacheKey)");
    const tryIndex=audit.lastIndexOf("try {",removeIndex);
    const catchIndex=audit.indexOf("catch (cleanupError)",removeIndex);
    assert.ok(saveIndex>=0&&removeIndex>saveIndex&&tryIndex>saveIndex&&catchIndex>removeIndex);

    assert.ok(save.includes("validateCompletedDriveAudit_"));
    assert.ok(save.includes("ultima_operacion_inventario_id"));
    assert.ok(save.includes("resultado_inventario"));
    assert.ok(save.includes("results.push"));
    assert.ok(save.includes("getDuplicateReplacedImageIds_"));
    assert.ok(organize.includes("storedOperationId !== inventoryOperationId"));
    assert.ok(organize.includes('inventoryResult !== "confirmado"'));
});

check("Las escrituras parciales se reintentan y las no reconciliables quedan requiere_revision",()=>{
    const writeSource=fnSource(admin,"writeDriveInventoryRowVerified_");
    const extractId=value=>{
        const text=String(value||"").trim();
        const match=text.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/);
        return match?match[1]:(/^[a-zA-Z0-9_-]{20,}$/.test(text)?text:"");
    };
    function mockSheet(mode){
        const cells=[HEADERS.slice()];
        let writes=0;
        const ensure=(r,c)=>{while(cells.length<r)cells.push([]);while(cells[r-1].length<c)cells[r-1].push("");};
        return {cells,get writes(){return writes;},getRange(row,col,numRows=1,numCols=1){
            return {
                getValues(){return Array.from({length:numRows},(_,ri)=>Array.from({length:numCols},(_,ci)=>cells[row-1+ri]?.[col-1+ci]??""));},
                setValues(values){
                    writes++;
                    if(mode==="retry"&&writes===1)throw new Error("transient write");
                    if(mode==="review"&&writes===1){
                        values[0].slice(0,6).forEach((v,ci)=>{ensure(row,col+ci);cells[row-1][col-1+ci]=v;});
                        throw new Error("partial write");
                    }
                    if(mode==="review"&&writes===2)throw new Error("retry write");
                    values.forEach((valuesRow,ri)=>valuesRow.forEach((v,ci)=>{ensure(row+ri,col+ci);cells[row-1+ri][col-1+ci]=v;}));
                    return this;
                }
            };
        }};
    }
    const row=makeRow({id:"INV-"+FILE_A,status:"sin_uso_detectado",type:"sin_uso_detectado",fileId:FILE_A,origin:"auditoria_drive"});
    row[18]="AUDIT-1";row[24]="OP-1";row[25]="confirmado";
    const factory=sheet=>new Function("SpreadsheetApp","extractDriveFileId",writeSource+"\nreturn writeDriveInventoryRowVerified_;")(
        {flush(){}},extractId);
    const retrySheet=mockSheet("retry");
    const retryWriter=factory(retrySheet);
    const persisted=retryWriter(retrySheet,2,row,HEADERS,FILE_A,"AUDIT-1","OP-1","sin_uso_detectado","confirmado");
    assert.equal(retrySheet.writes,2);
    assert.equal(persisted[25],"confirmado");

    const reviewSheet=mockSheet("review");
    const reviewWriter=factory(reviewSheet);
    assert.throws(()=>reviewWriter(reviewSheet,2,row,HEADERS,FILE_A,"AUDIT-1","OP-1","sin_uso_detectado","confirmado"),/no pudo confirmarse/);
    assert.equal(reviewSheet.cells[1][10],"requiere_revision");
    assert.equal(reviewSheet.cells[1][25],"error");
});

check("El esquema del inventario conserva las columnas nuevas de trazabilidad de forma idempotente",()=>{
    const ensure=fnSource(admin,"ensureReplacedImagesInventoryColumns");
    const readSchema=fnSource(admin,"getReplacedImagesReadSchema_");
    for(const field of ["ultima_operacion_inventario_id","resultado_inventario","detalle_resultado_inventario"]){
        assert.ok(ensure.includes(field));
        assert.ok(readSchema.includes(field));
    }
});


check("El escaneo y el guardado del inventario no mueven archivos automáticamente",()=>{
    const saveStart=ui.indexOf("const saveUnusedInventory");
    const organizeStart=ui.indexOf("const organizeUnusedImages",saveStart);
    assert.ok(saveStart>=0&&organizeStart>saveStart);
    const saveBlock=ui.slice(saveStart,organizeStart);
    assert.equal(saveBlock.includes("mode: 'organize'"),false);
    assert.equal(saveBlock.includes("handleOrganizeUnusedImagesBatch"),false);
    assert.ok(saveBlock.includes("Array.isArray(inventoryResult.results)"));
    assert.ok(saveBlock.includes("resultsBySubmittedId.size !== submittedIds.size"));
    assert.equal(saveBlock.includes(": unusedFiles.map(item => String(item.fileId || ''))"),false);
    const explicitBlock=ui.slice(organizeStart,ui.indexOf("const updateControls",organizeStart));
    assert.ok(explicitBlock.includes("window.confirm("));
    assert.ok(explicitBlock.includes("mode: 'organize'"));
    assert.ok(explicitBlock.includes("confirmed: true"));
    assert.ok(explicitBlock.includes("inventoryOperationId"));
    assert.ok(html.includes('id="btn-audit-drive-organize"'));
    assert.ok(ui.includes("seenFileIds.has(fileId)"));
    assert.ok(ui.includes("renderedFileIds.has(fileId)"));
    assert.ok(ui.includes("getCursorPositionSignature"));
    assert.ok(ui.includes("audit-service-version"));
    assert.ok(ui.includes("Miniatura cargada en la sesión autorizada actual"));
    assert.ok(html.includes("La lista detallada muestra únicamente imágenes"));
    assert.ok(ui.includes("reconciliationUrl"));
});
check("ADMIN exige confirmación y correlación de operación antes de mover imágenes",()=>{
    const save=fnSource(admin,"handleSaveUnusedImagesInventory");
    const organize=fnSource(admin,"handleOrganizeUnusedImagesBatch");
    assert.ok(save.includes('payload.mode === "organize"'));
    assert.ok(organize.includes("payload.confirmed !== true"));
    assert.ok(organize.includes("payload.inventoryOperationId"));
    assert.ok(organize.includes("inventoryOperationId"));
    assert.ok(organize.includes("file.moveTo(destination)"));
    assert.ok(organize.includes("writeDriveInventoryRowVerified_"));
});
check("La organización revalida referencias e historial por archivo y protege ubicaciones manuales",()=>{
    const organize=fnSource(admin,"handleOrganizeUnusedImagesBatch");
    const save=fnSource(admin,"handleSaveUnusedImagesInventory");
    assert.ok(organize.includes("const currentRows = sheet.getDataRange().getValues()"));
    assert.ok(organize.includes("const references = collectActiveDriveReferences(false)"));
    assert.ok(organize.includes("const latestRowsBeforeMove = sheet.getDataRange().getValues()"));
    assert.ok(organize.includes("latestIdentityAmbiguous || latestHistoryConflict || latestInventoryMatches.length !== 1"));
    assert.ok(organize.includes("const latestSourceFolder = getSingleParentFolderInsideCortes(file, rootFolder.getId())"));
    assert.ok(organize.includes("const latestReferences = collectActiveDriveReferences(false)"));
    assert.ok(organize.includes('organizationState === "movida_manual"'));
    assert.ok(organize.includes('organizationState === "organizada"'));
    assert.ok(organize.includes("storedLocation && storedLocation !== sourcePath"));
    assert.ok(organize.includes("!isKnownReplacedImageStatus_(candidateType, candidateStatus)"));
    assert.ok(organize.includes("rollbackError"));
    assert.ok(save.includes('previousOrganizationState === "movida_manual" && previousManualLocation'));
    assert.ok(save.includes('String(row[column("estado_organizacion") - 1] || "") === "movida_manual"'));
    assert.ok(coordinator.includes('saveUnusedImagesInventory: { read: [...identityRead, "CORTES"]'));
});


check("El estado local conserva auditId, inventoryOperationId y los IDs confirmados al reabrir el modal",()=>{
    const start=offline.indexOf("export async function saveDriveAuditState");
    const end=offline.indexOf("\nexport async function getDriveAuditState",start);
    assert.ok(start>=0&&end>start);
    const saveBlock=offline.slice(start,end);
    assert.ok(saveBlock.includes("const confirmedIds = normalizeDriveAuditLocalIds(state.inventoryConfirmedFileIds)"));
    assert.ok(saveBlock.includes("store.put({ key: confirmedKey, ownerId, auditId, ids: confirmedIds"));
    const metaStart=offline.indexOf("function buildDriveAuditMetaEntry(");
    const metaEnd=offline.indexOf("\nfunction ",metaStart+10);
    assert.ok(metaStart>=0&&metaEnd>metaStart);
    const metaBlock=offline.slice(metaStart,metaEnd);
    for(const field of ["inventoryAuditId: String(state.inventoryAuditId || '')","inventoryOperationId: String(state.inventoryOperationId || '')",
        "totalDiscovered: Math.max","lastScanAt: Math.max","serviceVersion: String","duplicateFolderCount: Math.max"]) {
        assert.ok(metaBlock.includes(field));
    }
    const idsStart=offline.indexOf("function normalizeDriveAuditLocalIds(");
    const idsEnd=offline.indexOf("\nfunction ",idsStart+10);
    assert.ok(idsStart>=0&&idsEnd>idsStart&&offline.slice(idsStart,idsEnd).includes("Array.from(new Set("));
});

console.log("AdminReplacedImagesIntegrity: "+passed+"/"+passed+" PASS");
