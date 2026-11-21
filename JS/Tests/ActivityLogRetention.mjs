import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleClearActivityLogs(payload) {");
const end = source.indexOf("\n}", start);
assert.ok(start >= 0 && end > start, "No se encontró handleClearActivityLogs.");
const handlerSource = source.slice(start, end + 2);
const syntax = spawnSync(process.execPath, ["--check", new URL("../Services/feedback.js", import.meta.url).pathname], { encoding:"utf8" });
assert.equal(syntax.status, 0, "feedback.js no supera node --check: " + syntax.stderr);

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);
const NativeDate = Date;
class TestDate extends NativeDate {
    constructor(...args) { if (args.length) super(...args); else super(NOW); }
}
function createSheet(dataRows, options = {}) {
    const rows = [["id","timestamp","actor","name","type","item","detail"], ...dataRows.map((value,index)=>[
        "row-"+(index+1),value,"U","User","action","item","detail"
    ])];
    const calls = { reads:[], deleteRows:[], deleteRow:[], clear:[], flush:0 };
    const sheet = {
        getLastRow(){return rows.length;},
        getLastColumn(){return 7;},
        getRange(row,column,count,width){
            return {
                getValues(){
                    calls.reads.push({row,column,count,width});
                    return rows.slice(row-1,row-1+count).map(item=>item.slice(column-1,column-1+width));
                },
                clearContent(){
                    calls.clear.push({row,column,count,width});
                    for(let r=row-1;r<row-1+count;r++)for(let c=column-1;c<column-1+width;c++)if(rows[r])rows[r][c]="";
                    return this;
                }
            };
        },
        deleteRows: options.noDeleteRows ? undefined : function(row,count){
            calls.deleteRows.push({row,count});
            rows.splice(row-1,count);
        },
        deleteRow(row){
            calls.deleteRow.push(row);
            rows.splice(row-1,1);
        }
    };
    return {sheet,rows,calls};
}
function buildHandler(fixture) {
    return new Function(
        "getSafeSheet","SHEET_NAMES","COLS_ACTIVIDAD_USUARIO","SpreadsheetApp","Date",
        handlerSource+"\nreturn handleClearActivityLogs;"
    )(
        name=>name==="ActividadUsuario"?fixture.sheet:null,
        {ACTIVIDAD_USUARIO:"ActividadUsuario"},
        {timestamp:2},
        {flush(){fixture.calls.flush++;}},
        TestDate
    );
}
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
function oldDate(days){return new TestDate(NOW-days*24*60*60*1000);}
const recent=oldDate(2), boundary=oldDate(7), future=new TestDate(NOW+24*60*60*1000);
const fixture=createSheet([
    oldDate(10),
    oldDate(9).toISOString(),
    recent,
    boundary,
    "",
    "fecha-no-valida",
    45200,
    new TestDate(NaN),
    future,
    oldDate(8).toISOString()
]);
const handler=buildHandler(fixture);
check("La purga lee solo la columna timestamp, no toda la fila",()=>{
    const result=handler({keepLastWeek:true});
    assert.deepEqual(fixture.calls.reads[0],{row:2,column:2,count:10,width:1});
    assert.equal(fixture.calls.flush,1);
    assert.equal(result.deletedCount,3);
    assert.equal(result.unclassifiedCount,4);
    assert.equal(result.retainedUnclassifiedCount,4);
    assert.match(result.message,/Se conservaron 4 registros/);
    assert.ok(result.message.includes("no se eliminan por antigüedad inferida"));
});
check("Elimina bloques contiguos de abajo hacia arriba sin desplazar índices",()=>{
    assert.deepEqual(fixture.calls.deleteRows,[{row:11,count:1},{row:2,count:2}]);
    assert.equal(fixture.rows.length,8);
    assert.deepEqual(fixture.rows.slice(1).map(row=>row[1]),[
        recent,boundary,"","fecha-no-valida",45200,fixture.rows[6][1],future
    ]);
});
check("La fecha exactamente en el límite de siete días se conserva",()=>{
    assert.ok(fixture.rows.some(row=>row[1]===boundary));
});
check("Los valores vacíos, inválidos, numéricos y Date inválidos se conservan",()=>{
    assert.ok(fixture.rows.some(row=>row[1]===""));
    assert.ok(fixture.rows.some(row=>row[1]==="fecha-no-valida"));
    assert.ok(fixture.rows.some(row=>row[1]===45200));
    assert.ok(fixture.rows.some(row=>row[1] instanceof TestDate && !Number.isFinite(row[1].getTime())));
});
check("Las fechas futuras se conservan sin clasificarse como inválidas",()=>{
    assert.ok(fixture.rows.some(row=>row[1]===future));
    assert.equal(fixture.calls.reads.length,1);
});
check("El fallback deleteRow también elimina de abajo hacia arriba",()=>{
    const f=createSheet([oldDate(10),"reciente",oldDate(9)],{noDeleteRows:true});
    const result=buildHandler(f)({keepLastWeek:true});
    assert.equal(result.deletedCount,2);
    assert.deepEqual(f.calls.deleteRow,[4,2]);
});
check("Un historial compuesto solo por fechas inválidas no elimina filas",()=>{
    const f=createSheet(["","bad",null,45200]);
    const result=buildHandler(f)({keepLastWeek:true});
    assert.equal(result.deletedCount,0);
    assert.equal(result.unclassifiedCount,4);
    assert.equal(f.calls.deleteRows.length,0);
    assert.equal(f.rows.length,5);
});
check("El vaciado total explícito incluye registros sin fecha clasificable",()=>{
    const f=createSheet(["", "bad", oldDate(20)]);
    const result=buildHandler(f)({keepLastWeek:false});
    assert.equal(result.deletedCount,3);
    assert.equal(result.unclassifiedCount,0);
    assert.deepEqual(f.calls.clear,[{row:2,column:1,count:3,width:7}]);
    assert.equal(f.calls.deleteRows.length,0);
});
check("La hoja vacía no ejecuta lecturas ni flush",()=>{
    const f=createSheet([]);
    const result=buildHandler(f)({keepLastWeek:true});
    assert.equal(result.deletedCount,0);
    assert.equal(f.calls.reads.length,0);
    assert.equal(f.calls.flush,0);
});
check("La hoja ausente devuelve un resultado seguro",()=>{
    const api=new Function("getSafeSheet","SHEET_NAMES","COLS_ACTIVIDAD_USUARIO","SpreadsheetApp",handlerSource+"\nreturn handleClearActivityLogs;")(
        ()=>null,{ACTIVIDAD_USUARIO:"ActividadUsuario"},{timestamp:2},{flush(){throw new Error("unexpected");}}
    );
    const result=api({keepLastWeek:true});
    assert.equal(result.status,"success");
    assert.equal(result.deletedCount,0);
    assert.equal(result.unclassifiedCount,0);
});
console.log("ActivityLogRetention: "+passed+"/"+passed+" PASS");
