import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
const start=source.indexOf("function findRowByOpId(");
const end=source.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró findRowByOpId");
const code=source.slice(start,end);
assert.doesNotMatch(code,/getDataRange\(\)\.getValues\(\)/,"No debe descargar toda la hoja Cortes");
assert.match(code,/createTextFinder\(cleanOpId\)/,"Debe buscar opId en Sheets mediante TextFinder");

const normalizeOpId=(value,context)=>{
 const opId=String(value==null?"":value).trim();
 if(!/^OP-[A-Za-z0-9_-]{1,100}$/.test(opId))throw new Error(context+" opId inválido");
 return opId;
};
const normalizeVehicleId=(value,context)=>{
 const id=String(value==null?"":value).trim();
 if(!/^\d+$/.test(id))throw new Error(context+" vehicleId inválido");
 return id;
};
function makeHarness({headers,rows,entries=new Map(),forcedUniqueRowIndex=null}){
 const rangeCalls=[],finderConfig={},uniqueCalls=[];
 let dataRangeCalls=0,headerReads=0,finderCalls=0;
 const sheet={
  getLastRow:()=>rows.length+1,
  getLastColumn:()=>headers.length,
  getDataRange(){dataRangeCalls++;throw new Error("getDataRange no debe usarse");},
  getRange(...args){
   rangeCalls.push(args);
   if(args.length===4&&args[0]===1&&args[1]===1&&args[2]===1&&args[3]===headers.length){
    return{getValues(){headerReads++;return[headers];}};
   }
   if(args.length===4&&args[0]===2&&args[1]===1&&args[2]===rows.length&&args[3]===headers.length){
    return{createTextFinder(query){
     finderCalls++;
     return{
      matchCase(value){finderConfig.matchCase=value;return this;},
      matchEntireCell(value){finderConfig.matchEntireCell=value;return this;},
      useRegularExpression(value){finderConfig.useRegularExpression=value;return this;},
      matchFormulaText(value){finderConfig.matchFormulaText=value;return this;},
      findAll(){
       const found=[];
       rows.forEach((row,rowOffset)=>row.forEach((value,columnOffset)=>{
        if(String(value==null?"":value).includes(query)){
         found.push({
          getRow:()=>rowOffset+2,
          getColumn:()=>columnOffset+1,
          getValue:()=>value
         });
        }
       }));
       return found;
      }
     };
    }};
   }
   if(args.length===2&&args[1]===1){
    return{getValue:()=>rows[args[0]-2]?.[0]};
   }
   throw new Error("Rango inesperado: "+args.join(","));
  }
 };
 const findUnique=(targetSheet,vehicleId,opId)=>{
  uniqueCalls.push({vehicleId:String(vehicleId),opId});
  const matches=rows.map((row,index)=>({row,index})).filter(x=>String(x.row[0])===String(vehicleId));
  if(matches.length!==1)throw new Error("vehicleId no único");
  const rowValues=Array(37).fill("");
  rowValues[0]=String(vehicleId);
  rowValues[36]="fecha-prueba";
  return{rowIndex:forcedUniqueRowIndex||matches[0].index+2,rowValues};
 };
 const fn=new Function(
  "getIdempotenciaSheet","readIdempotenciaEntries_","getSpreadsheet","SHEET_NAMES",
  "findUniqueCortesVehicleRow_","COLS_CORTES","normalizeIdempotenciaOpId_","normalizeIdempotenciaVehicleId_",
  code+"\nreturn findRowByOpId;"
 )(
  ()=>({}),
  ()=>({byOpId:entries}),
  ()=>({getSheetByName:()=>sheet}),
  {CORTES:"Cortes"},
  findUnique,
  {id:1,timestamp:37,colaboradorCorte1:18,colaboradorCorte2:25,colaboradorCorte3:32},
  normalizeOpId,normalizeVehicleId
 );
 return{find:opId=>fn(sheet,opId),rangeCalls,finderConfig,uniqueCalls,get dataRangeCalls(){return dataRangeCalls;},get headerReads(){return headerReads;},get finderCalls(){return finderCalls;}};
}
let passed=0;
function test(name,fn){fn();passed++;}

test("coincidencia directa en columna idOperacion",()=>{
 const h=makeHarness({headers:["id","marca","modelo","idOperacion","VIN","colaboradorCorte1"],rows:[["42","Toyota","Hilux","OP-abc","","Técnico"]]});
 const result=h.find("OP-abc");
 assert.equal(result.rowIndex,2);assert.equal(result.colIndex,4);assert.equal(result.vehicleId,"42");
 assert.equal(result.fromIdempotenciaSheet,false);assert.equal(result.timestamp,"fecha-prueba");
 assert.deepEqual(h.finderConfig,{matchCase:true,matchEntireCell:false,useRegularExpression:false,matchFormulaText:false});
 assert.equal(h.headerReads,1);assert.equal(h.finderCalls,1);assert.equal(h.dataRangeCalls,0);
});
test("coincidencia directa en VIN legacy",()=>{
 const h=makeHarness({headers:["id","marca","VIN","colaboradorCorte1"],rows:[["42","Toyota","OP-abc","Técnico"]]});
 const result=h.find("OP-abc");
 assert.equal(result.colIndex,3);assert.equal(result.vehicleId,"42");
});
test("coincidencia etiquetada en campo colaborador",()=>{
 const h=makeHarness({headers:["id","marca","modelo","colaboradorCorte1"],rows:[["42","Toyota","Hilux","Técnico [OP-abc]"]]});
 const result=h.find("OP-abc");
 assert.equal(result.colIndex,4);assert.equal(result.vehicleId,"42");
});
test("rechaza opId directo duplicado en columnas de operación",()=>{
 const h=makeHarness({headers:["id","idOperacion","id_operacion"],rows:[["42","OP-abc","OP-abc"]]});
 assert.throws(()=>h.find("OP-abc"),/varias columnas de operación/);
 assert.equal(h.uniqueCalls.length,0);
});
test("rechaza etiquetas legacy ambiguas",()=>{
 const h=makeHarness({headers:["id","colaboradorCorte1","colaboradorCorte2"],rows:[["42","Técnico [OP-abc]","Supervisor [OP-abc]"]]});
 assert.throws(()=>h.find("OP-abc"),/varias celdas de Cortes/);
});
test("ignora texto que solo contiene el opId sin etiqueta",()=>{
 const h=makeHarness({headers:["id","nota"],rows:[["42","nota OP-abc no etiquetada"]]});
 assert.equal(h.find("OP-abc"),null);
});
test("retorna null cuando no existe coincidencia",()=>{
 const h=makeHarness({headers:["id","marca","VIN"],rows:[["42","Toyota","ABC123"]]});
 assert.equal(h.find("OP-abc"),null);
});
test("rechaza coincidencia cuya fila no corresponde al único vehicleId",()=>{
 const h=makeHarness({headers:["id","idOperacion"],rows:[["42","OP-abc"],["43",""]] ,forcedUniqueRowIndex:3});
 assert.throws(()=>h.find("OP-abc"),/no coincide con la única fila/);
});
test("la ruta Idempotencia evita la búsqueda legacy",()=>{
 const entries=new Map([["OP-abc",{vehicleId:"42",slotIndex:2,timestamp:"fecha",status:"pending",operationHash:"hash"}]]);
 const h=makeHarness({headers:["id","idOperacion"],rows:[["42","OP-abc"]],entries});
 const result=h.find("OP-abc");
 assert.equal(result.fromIdempotenciaSheet,true);assert.equal(result.colIndex,25);assert.equal(result.status,"pending");
 assert.equal(h.finderCalls,0);assert.equal(h.headerReads,0);assert.equal(h.dataRangeCalls,0);
 assert.deepEqual(h.uniqueCalls,[{vehicleId:"42",opId:"OP-abc"}]);
});
console.log("WriteOpIdLegacyLookup: "+passed+"/"+passed+" PASS — TextFinder server-side, coincidencias legacy, ambigüedad e idempotencia");
