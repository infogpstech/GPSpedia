import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

const extract = (source,start,end) => {
    const i=source.indexOf(start), j=source.indexOf(end,i+start.length);
    if(i<0||j<0)throw new Error("No se encontró el bloque "+start);
    return source.slice(i,j);
};
const HEADERS=["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"];
const OPS_HEADERS=["opId","payloadHash","problemId","status","imageFileId","imageUrl","createdAt","updatedAt"];
const OP_A="operation-pys-000000000000000001";
const OP_B="operation-pys-000000000000000002";
const PNG=Buffer.from([137,80,78,71,13,10,26,10,1,2,3,4]);
const PNG_ALT=Buffer.from([137,80,78,71,13,10,26,10,9,8,7,6]);
const dataUrl=(bytes=PNG)=>"data:image/png;base64,"+bytes.toString("base64");
const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};

function makeSheet(rows,name,state,options){
    return {
        getLastRow(){
            if(name==="pys"&&options.failReferenceScan&&state.fileCreated)throw new Error("Spreadsheet read failed");
            for(let i=rows.length-1;i>=0;i--)if(rows[i]&&rows[i].some(v=>v!==""&&v!==null&&v!==undefined))return i+1;
            return 0;
        },
        getLastColumn(){
            let max=0;for(const row of rows)if(row)for(let i=row.length-1;i>=0;i--)if(row[i]!==""&&row[i]!==null&&row[i]!==undefined){max=Math.max(max,i+1);break;}
            return max;
        },
        getRange(row,col,numRows=1,numCols=1){
            return {
                setValues(values){for(let r=0;r<values.length;r++){const target=rows[row-1+r]||(rows[row-1+r]=[]);for(let c=0;c<values[r].length;c++)target[col-1+c]=values[r][c];}},
                clearContent(){for(let r=0;r<numRows;r++){const target=rows[row-1+r]||(rows[row-1+r]=[]);for(let c=0;c<numCols;c++)target[col-1+c]="";}},
                getValues(){
                    if(name==="pys"&&options.failReferenceScan&&state.fileCreated&&row>=2&&numCols>1)throw new Error("Spreadsheet read failed");
                    return Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>((rows[row-1+r]||[])[col-1+c]??"")));
                },
                getDisplayValues(){
                    if(name==="pys"&&options.failReferenceScan&&state.fileCreated&&row>=2&&numCols>1)throw new Error("Spreadsheet read failed");
                    return Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>{const v=((rows[row-1+r]||[])[col-1+c]??"");return v==null?"":String(v);}));
                }
            };
        },
        getDataRange(){
            const lastRow=this.getLastRow(),lastCol=this.getLastColumn();
            return this.getRange(1,1,Math.max(1,lastRow),Math.max(1,lastCol));
        },
        appendRow(row){
            if(name==="pys"&&options.failAppendOnce&&!state.appendFailed){state.appendFailed=true;throw new Error("Spreadsheet append failed");}
            rows.push(row.slice());
        }
    };
}

function buildHarness(feedback,ui,options={}){
    const state={pysRows:(options.pysRows||[]).map(r=>r.slice()),opsRows:(options.opsRows||[]).map(r=>r.slice()),pysSheet:null,opsSheet:null,files:{},createdFiles:0,fileCreated:false,flushCount:0,lockWaits:0,lockReleases:0,trashed:0,folder:null};
    if(options.pysRows)state.pysSheet=makeSheet(state.pysRows,"pys",state,options);
    if(options.opsRows)state.opsSheet=makeSheet(state.opsRows,"PysOperations",state,options);
    const driveRoot={getId:()=>"drive-root"};
    const cortes={getId:()=>"root-cortes",getName:()=>"Cortes",getParents:()=>iterator([driveRoot]),getSharingAccess:()=>"PRIVATE",getSharingPermission:()=>"VIEW"};
    const pysFolder={
        getId:()=>"pys-folder-id-000000000000",getName:()=>"Problemas y Soluciones",getParents:()=>iterator([cortes]),
        getSharingAccess:()=>"PRIVATE",getSharingPermission:()=>"VIEW",
        createFile(blob){
            state.createdFiles++;state.fileCreated=true;
            const id="FILEID000000000000"+String(state.createdFiles).padStart(4,"0");
            const file={id,blob,description:"",trashed:false,
                getId(){return id;},getMimeType(){return blob.mimeType;},getSize(){return blob.bytes.length;},
                getDescription(){return this.description;},setDescription(v){this.description=v;},
                getSharingAccess(){return "PRIVATE";},getSharingPermission(){return "VIEW";},
                getParents(){return iterator([pysFolder]);},isTrashed(){return this.trashed;},
                setTrashed(v){if(options.failTrash)throw new Error("Drive trash failed");this.trashed=Boolean(v);if(v)state.trashed++;}};
            state.files[id]=file;return file;
        }
    };
    state.folder=pysFolder;
    const context={
        console,Date,JSON,Math,Number,String,Object,Array,RegExp,Error,Set,Map,
        Utilities:{
            base64Decode:v=>Array.from(Buffer.from(v,"base64")),
            base64Encode:v=>Buffer.from(v).toString("base64"),
            newBlob:(bytes,mimeType,name)=>({bytes:Array.from(bytes),mimeType,name}),
            DigestAlgorithm:{SHA_256:"SHA_256"},
            computeDigest:(algorithm,value)=>Array.from(crypto.createHash("sha256").update(Buffer.isBuffer(value)?value:Array.isArray(value)?Buffer.from(value):String(value)).digest())
        },
        DriveApp:{getFileById:id=>state.files[id]||null},
        LockService:{getScriptLock:()=>({waitLock:()=>{state.lockWaits++;},releaseLock:()=>{state.lockReleases++;}})},
        SpreadsheetApp:{flush:()=>{state.flushCount++;if(options.failFlushAt===state.flushCount)throw new Error("Spreadsheet flush failed");}},
        getSafeSheet:name=>name==="pys"?state.pysSheet:name==="PysOperations"?state.opsSheet:null,
        getSpreadsheet:()=>({insertSheet:name=>{
            if(name==="pys"){state.pysRows=[];state.pysSheet=makeSheet(state.pysRows,"pys",state,options);return state.pysSheet;}
            state.opsRows=[];state.opsSheet=makeSheet(state.opsRows,"PysOperations",state,options);return state.opsSheet;
        }}),
        getCortesRootFolder:()=>cortes,
        findOrCreateSubFolder:()=>pysFolder,
        getFolderCanonicalName:value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(),
        extractDriveFileIds:value=>{const m=String(value||"").match(/\/d\/([A-Za-z0-9_-]{10,110})/);return m?[m[1]]:[];},
        logUserActivity:()=>{}
    };
    const parser=extract(feedback,"function parseModelosAsociados(rawVal) {","function handleAddSolution(payload) {");
    vm.runInNewContext(parser+"\nthis.api={add:handleAddProblem,read:handleGetPysData};",context);
    const validPayload=(opId=OP_A,overrides={})=>Object.assign({
        opId,titulo:"Falla eléctrica",descripcion:"Detalle del problema",sinSolucion:true,solucion:"",
        prevenir:"Revisar conexiones",videoUrl:"",userId:"user-1",userName:"Técnico",
        alcance:"general",modelosAsociados:[],imgBase64:dataUrl()
    },overrides);
    return {api:context.api,state,validPayload,ui};
}

export function runPysCreationIntegrityTests({feedback,ui}){
    const results=[];let passed=0,failed=0;
    const test=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(error){failed++;results.push({name,status:"FAIL",message:String(error.message||error)});}};
    test("genera IDs desde el máximo sufijo y tolera filas vacías intermedias",()=>{
        const rows=[HEADERS,["isue-001","A","D","","S","","","","U",""],Array(10).fill(""),["isue-005","B","D","","S","","","","U",""]];
        const h=buildHarness(feedback,ui,{pysRows:rows});const r=h.api.add(h.validPayload());
        assert.equal(r.problemId,"isue-006");
    });
    test("rechaza IDs duplicados aunque tengan distinta capitalización o relleno",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[HEADERS,["isue-001","A"],["ISUE-1","B"]]});
        assert.throws(()=>h.api.add(h.validPayload()),/IDs duplicados/);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza IDs malformados",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[HEADERS,["isue-abc","A"]]});
        assert.throws(()=>h.api.add(h.validPayload()),/ID vacío o malformado/);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza filas con datos pero sin ID",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[HEADERS,["","Falla","Detalle"]]});
        assert.throws(()=>h.api.add(h.validPayload()),/ID vacío o malformado/);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza encabezados fuera de orden sin sobrescribir",()=>{
        const wrong=HEADERS.slice();[wrong[0],wrong[1]]=[wrong[1],wrong[0]];
        const h=buildHarness(feedback,ui,{pysRows:[wrong]});
        assert.throws(()=>h.api.add(h.validPayload()),/encabezados\/orden/);assert.deepEqual(h.state.pysRows,[wrong]);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza columnas adicionales",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[HEADERS.concat("extra")]});
        assert.throws(()=>h.api.add(h.validPayload()),/columnas adicionales/);assert.equal(h.state.createdFiles,0);
    });
    test("inicializa una hoja completamente vacía con el esquema exacto",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[]});h.api.add(h.validPayload());
        assert.deepEqual(h.state.pysRows[0],HEADERS);assert.deepEqual(h.state.opsRows[0],OPS_HEADERS);
    });
    test("reintento idéntico devuelve el mismo ID sin crear otra fila ni imagen",()=>{
        const h=buildHarness(feedback,ui);const first=h.api.add(h.validPayload());const second=h.api.add(h.validPayload());
        assert.equal(first.problemId,second.problemId);assert.equal(h.state.pysRows.length,2);assert.equal(h.state.createdFiles,1);
    });
    test("rechaza reutilizar opId con contenido textual distinto",()=>{
        const h=buildHarness(feedback,ui);h.api.add(h.validPayload());
        assert.throws(()=>h.api.add(h.validPayload(OP_A,{titulo:"Otro problema"})),/otro contenido/);
        assert.equal(h.state.pysRows.length,2);assert.equal(h.state.createdFiles,1);
    });
    test("rechaza reutilizar opId con imagen distinta",()=>{
        const h=buildHarness(feedback,ui);h.api.add(h.validPayload());
        assert.throws(()=>h.api.add(h.validPayload(OP_A,{imgBase64:dataUrl(PNG_ALT)})),/otro contenido/);
        assert.equal(h.state.pysRows.length,2);
    });
    test("una operación diferente recibe el siguiente ID",()=>{
        const h=buildHarness(feedback,ui);const a=h.api.add(h.validPayload(OP_A));const b=h.api.add(h.validPayload(OP_B,{titulo:"Otra falla"}));
        assert.equal(a.problemId,"isue-001");assert.equal(b.problemId,"isue-002");
    });
    test("un append fallido compensa el archivo y permite reintentar con el mismo ID",()=>{
        const h=buildHarness(feedback,ui,{failAppendOnce:true});
        assert.throws(()=>h.api.add(h.validPayload()),/append failed/);
        assert.equal(Object.values(h.state.files)[0].trashed,true);
        const retry=h.api.add(h.validPayload());assert.equal(retry.problemId,"isue-001");assert.equal(h.state.pysRows.length,2);
    });
    test("recupera una fila persistida si se pierde la confirmación del flush",()=>{
        const h=buildHarness(feedback,ui,{failFlushAt:5});const r=h.api.add(h.validPayload());
        assert.equal(r.status,"success");assert.equal(r.recovered,true);assert.equal(h.state.pysRows.length,2);
        assert.equal(h.state.opsRows[1][3],"LINKED");
    });
    test("valida el esquema de PysOperations antes de crear archivos",()=>{
        const h=buildHarness(feedback,ui,{opsRows:[["opId","incorrecto"]]});
        assert.throws(()=>h.api.add(h.validPayload()),/PysOperations/);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza opId duplicados en PysOperations",()=>{
        const hash="a".repeat(64),row=[OP_A,hash,"isue-001","PENDING","","","now","now"];
        const h=buildHarness(feedback,ui,{opsRows:[OPS_HEADERS,row,row]});
        assert.throws(()=>h.api.add(h.validPayload()),/identificadores duplicados/);assert.equal(h.state.createdFiles,0);
    });
    test("rechaza problemId duplicado en PysOperations",()=>{
        const hash="a".repeat(64),a=[OP_A,hash,"isue-001","PENDING","","","now","now"],b=[OP_B,hash,"isue-001","PENDING","","","now","now"];
        const h=buildHarness(feedback,ui,{opsRows:[OPS_HEADERS,a,b]});
        assert.throws(()=>h.api.add(h.validPayload()),/identificadores duplicados/);assert.equal(h.state.createdFiles,0);
    });
    test("no recrea un registro cuando el ledger dice LINKED pero la fila no existe",()=>{
        const hash="a".repeat(64),row=[OP_A,hash,"isue-001","LINKED","fileid000000000000000000","https://drive.google.com/file/d/fileid000000000000000000/view","now","now"];
        const h=buildHarness(feedback,ui,{opsRows:[OPS_HEADERS,row]});
        assert.throws(()=>h.api.add(h.validPayload()),/figura vinculada/);assert.equal(h.state.createdFiles,0);
    });
    test("reutiliza una imagen UPLOAD_PENDING después de una interrupción",()=>{
        const h=buildHarness(feedback,ui);const first=h.api.add(h.validPayload());
        const op=h.state.opsRows[1];op[3]="UPLOAD_PENDING";h.state.pysRows.splice(1,1);
        const replay=h.api.add(h.validPayload());
        assert.equal(replay.problemId,first.problemId);assert.equal(h.state.createdFiles,1);assert.equal(h.state.pysRows.length,2);
    });
    test("bloquea operaciones marcadas RECOVERY_REQUIRED",()=>{
        const h=buildHarness(feedback,ui,{failAppendOnce:true,failTrash:true});
        assert.throws(()=>h.api.add(h.validPayload()),/recuperación manual/);
        assert.equal(h.state.opsRows[1][3],"RECOVERY_REQUIRED");
        assert.throws(()=>h.api.add(h.validPayload()),/recuperación manual/);
    });
    test("getPysData valida el esquema antes de leer",()=>{
        const wrong=HEADERS.slice();wrong[2]="Descripcion";
        const h=buildHarness(feedback,ui,{pysRows:[wrong]});
        assert.throws(()=>h.api.read(),/encabezados\/orden/);
    });
    test("getPysData rechaza IDs duplicados",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[HEADERS,["isue-001","A"],["isue-1","B"]]});
        assert.throws(()=>h.api.read(),/IDs duplicados/);
    });
    test("rechaza altas sin opId",()=>{
        const h=buildHarness(feedback,ui);
        assert.throws(()=>h.api.add(h.validPayload("")));
        assert.equal(h.state.createdFiles,0);
    });
    test("libera el lock después de un fallo de validación de esquema",()=>{
        const h=buildHarness(feedback,ui,{pysRows:[["incorrecto"]]});
        assert.throws(()=>h.api.add(h.validPayload()));assert.equal(h.state.lockWaits,1);assert.equal(h.state.lockReleases,1);
    });
    test("el formulario genera una clave aleatoria estable y la adjunta al payload",()=>{
        assert.match(ui,/pendingPysOperationId/);assert.match(ui,/pendingPysOperationSignature !== operationSignature/);
        assert.match(ui,/window\.crypto\.getRandomValues/);assert.match(ui,/payload\.opId = pendingPysOperationId/);
    });
    return {status:failed?"FAIL":"PASS",passed,failed,results};
}

const feedback=fs.readFileSync("Services/feedback.js","utf8");
const ui=fs.readFileSync("ui.js","utf8");
const result=runPysCreationIntegrityTests({feedback,ui});
console.log(JSON.stringify(result,null,2));
if(result.status!=="PASS")process.exitCode=1;
