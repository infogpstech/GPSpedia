import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const source = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const helperNames = [
    "getDriveParentFolders_", "isDriveFolderWithinCortes_", "isDriveFileWithinCortes_",
    "getValidatedCortesTerminalFolder_", "getCortesTerminalChildFolders_",
    "getCortesTerminalFiles_", "hasDirectDriveParent_"
];
function extractFunction(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\n}", start);
    assert.ok(end > start, "No se pudo delimitar " + name);
    return source.slice(start, end + 2);
}
const helperSource = helperNames.map(extractFunction).join("\n");
const handlerSource = extractFunction("handleDriveCommand");
const syntax = spawnSync(process.execPath, ["--check", new URL("../Services/admin.js", import.meta.url).pathname], { encoding:"utf8" });
assert.equal(syntax.status, 0, "admin.js no supera node --check: " + syntax.stderr);

function iterator(items) {
    let index = 0;
    return { hasNext: () => index < items.length, next: () => items[index++] };
}
function createDriveFixture() {
    const folders = new Map(), files = new Map();
    let nextId = 1, moveCount = 0, createCount = 0;
    const driveRoot = makeFolder("drive-root", "My Drive", []);
    const root = makeFolder("cortes-root", "Cortes", [driveRoot]);
    const nested = makeFolder("nested", "Marca", [root]);
    const leaf = makeFolder("leaf", "Modelo", [nested]);
    const outside = makeFolder("outside", "Privado", [driveRoot]);
    const outsideNested = makeFolder("outside-nested", "Externo", [outside]);
    const shared = makeFolder("shared", "Compartida", [nested, outside]);
    const multiInside = makeFolder("multi-inside", "Multi interna", [root, nested]);
    const raceFolder = makeFolder("race-folder", "Cambio concurrente", [root]);
    root.children = root.children.filter(child => child !== raceFolder);
    let raceParentReads = 0;
    raceFolder.getParents = () => iterator([++raceParentReads === 1 ? root : outside]);
    const fileIn = makeFile("file-in", "corte.jpg", [leaf]);
    const fileOut = makeFile("file-out", "privado.jpg", [outside]);
    const fileShared = makeFile("file-shared", "compartido.jpg", [leaf, outside]);
    function makeFolder(id, name, parents) {
        const folder = {
            id, name, parents: parents.slice(), children: [], contents: [],
            getId(){return this.id;}, getName(){return this.name;},
            getParents(){return iterator(this.parents);},
            getFolders(){return iterator(this.children.slice());},
            getFiles(){return iterator(this.contents.slice());},
            getFoldersByName(value){return iterator(this.children.filter(x=>x.name===value));},
            createFolder(value){
                createCount++;
                const created=makeFolder("created-"+nextId++,value,[this]);
                this.children.push(created);
                return created;
            }
        };
        folders.set(id,folder);
        parents.forEach(parent=>parent.children.push(folder));
        return folder;
    }
    function makeFile(id,name,parents) {
        const file = {
            id,name,parents:parents.slice(),
            getId(){return this.id;},getName(){return this.name;},
            getParents(){return iterator(this.parents);},
            getSize(){return 1024;},getMimeType(){return "image/jpeg";},
            moveTo(target){
                moveCount++;
                this.parents.forEach(parent=>parent.contents=parent.contents.filter(x=>x!==this));
                this.parents=[target];
                if(!target.contents.includes(this))target.contents.push(this);
                return this;
            }
        };
        files.set(id,file);
        parents.forEach(parent=>parent.contents.push(file));
        return file;
    }
    const DriveApp = {
        getFolderById(id){if(!folders.has(String(id)))throw new Error("folder not found");return folders.get(String(id));},
        getFileById(id){if(!files.has(String(id)))throw new Error("file not found");return files.get(String(id));}
    };
    const getCortesRootFolder=()=>root;
    const handler=new Function("DriveApp","getCortesRootFolder",helperSource+"\n"+handlerSource+"\nreturn handleDriveCommand;")(DriveApp,getCortesRootFolder);
    return {handler,folders,files,root,nested,leaf,outside,outsideNested,shared,multiInside,raceFolder,fileIn,fileOut,fileShared,
        get moveCount(){return moveCount;},get createCount(){return createCount;}};
}
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
function rejects(fn,part){assert.throws(fn,error=>String(error.message).includes(part));}
const f=createDriveFixture();
check("Lista Cortes y muestra solo carpetas/archivos del árbol autorizado",()=>{
    const result=f.handler({command:"dir"},null);
    assert.equal(result.status,"success");
    assert.equal(result.currentFolder.id,"cortes-root");
    assert.ok(result.folders.some(x=>x.id==="nested"));
    assert.ok(!result.folders.some(x=>x.id==="shared"));
    assert.ok(result.files.every(x=>x.id!=="file-shared"));
});
check("Lista una subcarpeta válida",()=>{
    const result=f.handler({command:"ls",currentFolderId:"nested"},null);
    assert.equal(result.currentFolder.id,"nested");
    assert.ok(result.folders.some(x=>x.id==="leaf"));
});
check("Rechaza currentFolderId de una carpeta externa",()=>{
    rejects(()=>f.handler({command:"dir",currentFolderId:"outside"},null),"solo permite operar dentro del árbol Cortes");
});
check("Rechaza una carpeta cuyo ancestro también es externo",()=>{
    rejects(()=>f.handler({command:"dir",currentFolderId:"shared"},null),"solo permite operar dentro del árbol Cortes");
});
check("cd .. en la raíz Cortes permanece en Cortes",()=>{
    const result=f.handler({command:"cd",args:".."},null);
    assert.equal(result.currentFolder.id,"cortes-root");
    assert.equal(result.isRoot,true);
});
check("cd / permite regresar a Cortes aunque el ID anterior sea externo",()=>{
    const result=f.handler({command:"cd",args:"/",currentFolderId:"outside"},null);
    assert.equal(result.currentFolder.id,"cortes-root");
});

check("cd .. desde una subcarpeta vuelve al padre dentro de Cortes",()=>{
    const result=f.handler({command:"cd",args:"..",currentFolderId:"leaf"},null);
    assert.equal(result.currentFolder.id,"nested");
});
check("cd .. rechaza padres múltiples aunque uno esté dentro de Cortes",()=>{
    rejects(()=>f.handler({command:"cd",args:"..",currentFolderId:"shared"},null),"solo permite operar dentro del árbol Cortes");
});
check("cd .. rechaza padres múltiples aun cuando todos estén dentro de Cortes",()=>{
    rejects(()=>f.handler({command:"cd",args:"..",currentFolderId:"multi-inside"},null),"carpeta padre dentro de Cortes");
});
check("cd entra únicamente a una subcarpeta directa y válida",()=>{
    const result=f.handler({command:"cd",args:"Marca"},null);
    assert.equal(result.currentFolder.id,"nested");
});
check("cd rechaza nombres de subcarpeta ambiguos",()=>{
    const duplicate=makeExtraFolder(f,"cortes-root","Marca");
    rejects(()=>f.handler({command:"cd",args:"Marca"},null),"varias carpetas");
});
check("mkdir crea una carpeta dentro de la ubicación activa validada",()=>{
    const before=f.createCount;
    const result=f.handler({command:"mkdir",args:"Nueva",currentFolderId:"nested"},null);
    assert.equal(result.status,"success");
    assert.equal(f.createCount,before+1);
    assert.equal(f.folders.get(result.folderId).parents[0].id,"nested");
});
check("mkdir no ejecuta si la ubicación activa está fuera de Cortes",()=>{
    const before=f.createCount;
    rejects(()=>f.handler({command:"mkdir",args:"No",currentFolderId:"outside"},null),"solo permite operar dentro del árbol Cortes");
    assert.equal(f.createCount,before);
});
check("mkdir revalida la carpeta ante un cambio externo antes de escribir",()=>{
    const before=f.createCount;
    rejects(()=>f.handler({command:"mkdir",args:"No",currentFolderId:"race-folder"},null),"dejó de pertenecer al árbol Cortes");
    assert.equal(f.createCount,before);
});
check("move permite un archivo y destino dentro del árbol Cortes",()=>{
    const result=f.handler({command:"move",fileId:"file-in",targetFolderId:"nested"},null);
    assert.equal(result.status,"success");
    assert.equal(f.moveCount,1);
    assert.equal(f.fileIn.parents[0].id,"nested");
});
check("move rechaza archivos de origen externos sin moverlos",()=>{
    const before=f.moveCount;
    rejects(()=>f.handler({command:"move",fileId:"file-out",targetFolderId:"nested"},null),"archivo de origen");
    assert.equal(f.moveCount,before);
});
check("move rechaza destinos externos sin mover el archivo",()=>{
    const before=f.moveCount;
    rejects(()=>f.handler({command:"move",fileId:"file-in",targetFolderId:"outside"},null),"carpeta destino");
    assert.equal(f.moveCount,before);
});
check("move rechaza archivos con una ubicación externa adicional",()=>{
    const before=f.moveCount;
    rejects(()=>f.handler({command:"move",fileId:"file-shared",targetFolderId:"nested"},null),"archivo de origen");
    assert.equal(f.moveCount,before);
});
check("move rechaza destinos con ancestros externos",()=>{
    const before=f.moveCount;
    rejects(()=>f.handler({command:"move",fileId:"file-in",targetFolderId:"shared"},null),"carpeta destino");
    assert.equal(f.moveCount,before);
});
check("tree no recorre carpetas con ancestros externos",()=>{
    const result=f.handler({command:"tree"},null);
    assert.ok(result.tree.includes("Cortes"));
    assert.ok(result.tree.includes("Marca"));
    assert.ok(!result.tree.includes("Compartida"));
    assert.ok(!result.tree.includes("Privado"));
});
console.log("DriveTerminalScope: "+passed+"/"+passed+" PASS");

function makeExtraFolder(fixture,parentId,name) {
    const parent=fixture.folders.get(parentId);
    const id="duplicate-"+name;
    const folder={
        id,name,parents:[parent],children:[],contents:[],
        getId(){return this.id;},getName(){return this.name;},
        getParents(){return iterator(this.parents);},
        getFolders(){return iterator(this.children.slice());},
        getFiles(){return iterator(this.contents.slice());},
        getFoldersByName(value){return iterator(this.children.filter(x=>x.name===value));},
        createFolder(){throw new Error("not expected");}
    };
    fixture.folders.set(id,folder);parent.children.push(folder);
    return folder;
}
