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
function makeSheet(rows,formulas=[]){
    let writes=0;
    return {
        getLastRow:()=>rows.length,
        getLastColumn:()=>Math.max(0,...rows.map(row=>row.length)),
        getRange:(row,col,numRows=1,numCols=1)=>({
            getValues:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>rows[row-1+r]?.[col-1+c]??"")),
            getFormulas:()=>Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>formulas[row-1+r]?.[col-1+c]??"")),
            setValue:()=>{writes++;throw new Error("La auditoría no debe escribir.");},
            setValues:()=>{writes++;throw new Error("La auditoría no debe escribir.");}
        }),
        get writes(){return writes;}
    };
}
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
const auditColumn=new Function(extract("auditIdentifierColumn_")+"\nreturn auditIdentifierColumn_;")();
test("Detecta IDs de usuario duplicados, malformados y ausentes",()=>{
    const sheet=makeSheet([["ID","Nombre"],["USR-0001","A"],["usr-0001","B"],["bad-id","C"],["","D"]]);
    const r=auditColumn(sheet,{sheet:"Users",column:1,kind:"user",expectedFormat:"USR-0001 o superior"});
    assert.equal(r.duplicateIdCount,1);assert.equal(r.malformedIdCount,1);assert.equal(r.missingIdCount,1);
    assert.deepEqual(r.duplicateIds[0].rows,[2,3]);assert.deepEqual(r.missingIdRows,[5]);
});
test("Normaliza IDs numéricos para detectar duplicados de vehículos",()=>{
    const sheet=makeSheet([["id","marca"],[1,"A"],["001","B"],["bad","C"],["","D"]]);
    const r=auditColumn(sheet,{sheet:"Cortes",column:1,kind:"vehicle"});
    assert.equal(r.duplicateIdCount,1);assert.equal(r.malformedIdCount,1);assert.equal(r.missingIdCount,1);
    assert.equal(r.duplicateIds[0].id,"1");
});
test("Conserva compatibilidad con IDs tut- históricos y reporta vacíos",()=>{
    const sheet=makeSheet([["ID","Tema"],["tut-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","A"],["tut-legacy","B"],["","C"],["TUT-LEGACY","D"]]);
    const r=auditColumn(sheet,{sheet:"Tutorial",column:1,kind:"tutorial"});
    assert.equal(r.duplicateIdCount,1);assert.equal(r.malformedIdCount,0);assert.equal(r.missingIdCount,1);
});
test("Audita Relay sin imponer un formato que no está definido",()=>{
    const sheet=makeSheet([["ID","config"],["R-1","A"],["r-1","B"],["","C"]]);
    const r=auditColumn(sheet,{sheet:"Relay",column:1,kind:"relay",formatKnown:false,includeSamples:true});
    assert.equal(r.formatKnown,false);assert.equal(r.duplicateIdCount,1);assert.equal(r.malformedIdCount,0);assert.equal(r.missingIdCount,1);assert.deepEqual(r.sampleIds,[{row:2,id:"R-1"},{row:3,id:"r-1"}]);
});
test("Detecta fórmulas ID y fórmulas sin valor sin modificarlas",()=>{
    const sheet=makeSheet([["ID","marca"],[1,"A"],["",""],[1,"B"]],[["ID"],["=ROW()-1"],["=ROW()-1"],[""]]);
    const r=auditColumn(sheet,{sheet:"LogosMarca",column:1,kind:"logo"});
    assert.equal(r.formulaCount,2);assert.equal(r.unresolvedFormulaCount,1);assert.equal(r.duplicateIdCount,1);
    assert.equal(sheet.writes,0);
});
test("La acción agregada es de solo lectura y devuelve un resumen de todas las hojas",()=>{
    const sheets={
        Users:makeSheet([["ID","Nombre"],["USR-0001","A"]]),
        Cortes:makeSheet([["id"],[1]]),
        Tutorial:makeSheet([["ID","Tema"],["tut-legacy","A"]]),
        Relay:makeSheet([["ID"],["R-1"]]),
        pys:makeSheet([["id_problem"],["isue-001"]]),
        LogosMarca:makeSheet([["id"],[1]],[["id"],["=ROW()-1"]])
    };
    const getSpreadsheet=()=>({getSheetByName:name=>sheets[name]||null});
    const run=new Function("getSpreadsheet",extract("auditIdentifierColumn_")+"\n"+extract("auditTutorialApprovalReferences_")+"\n"+extract("auditUserIdReferences_")+"\n"+extract("handleAuditIdentifiers")+"\nreturn handleAuditIdentifiers;")(getSpreadsheet);
    const result=run();
    assert.equal(result.status,"success");assert.equal(result.readOnly,true);assert.equal(result.sheets.length,6);assert.equal(result.summary.sheetsFound,6);
    assert.equal(Object.values(sheets).reduce((n,s)=>n+s.writes,0),0);
});
test("La ruta ADMIN despacha auditIdentifiers",()=>{
    assert.match(admin,/case 'auditIdentifiers':\s*response = handleAuditIdentifiers\(\);/);
    const api=fs.readFileSync(resolve(root,"JS/Frontend/api-config.js"),"utf8");
    assert.match(api,/'auditIdentifiers': 'ADMIN'/);
});
console.log("IdentifierAudit: "+passed+"/"+passed+" PASS");
