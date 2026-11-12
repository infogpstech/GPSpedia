export function runCutSuggestionReportLinkTests({feedback}) {
 const vm = require("node:vm");
 const results=[]; let passed=0,failed=0;
 const test=(name,fn)=>{try{fn();passed++;results.push({name,status:"PASS"});}catch(error){failed++;results.push({name,status:"FAIL",message:String(error.message||error)});}};
 const extract=(a,b)=>{const i=feedback.indexOf(a),j=feedback.indexOf(b,i+a.length);if(i<0||j<0)throw Error("No se encontró "+a);return feedback.slice(i,j);};
 const sandbox={COLS_FEEDBACKS:{ID_vehiculo:3,Problema:4},COLS_CORTES:{id:1,tipoCorte1:12,ubicacionCorte1:13,tipoCorte2:19,ubicacionCorte2:20,tipoCorte3:26,ubicacionCorte3:27},SHEET_NAMES:{FEEDBACKS:"Feedbacks",CORTES:"Cortes"}};
 vm.createContext(sandbox);
 const definitions=[
  extract("function getReportMetadataColumn","function ensureReportMetadataColumn"),
  extract("function findReportByReportId_","const REPORT_IMAGE_MAX_BYTES"),
  extract("function validateCutSuggestionReportContext_","function handleSuggestCutChange")
 ].join("\n");
 vm.runInContext(definitions+"\nthis.validate=validateCutSuggestionReportContext_;",sandbox);
 const make=(opts={})=>{
  const reportId=opts.reportId===undefined?"REP-ABC123":opts.reportId;
  const vehicleId=opts.vehicleId===undefined?"VEH-1":opts.vehicleId;
  const corteIndex=opts.corteIndex===undefined?1:opts.corteIndex;
  const metadata=opts.metadata===undefined?{reportId,vehicleId,corteIndex,activaTestigoMotor:false}:opts.metadata;
  const reportRows=opts.reports===undefined?[[1,"Técnico",vehicleId,"problema", "",false,"","", "",metadata?JSON.stringify(metadata):""]]:opts.reports;
  const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","reportMetadata"];
  const feedbackSheet={
   getMaxColumns:()=>opts.metadataColumn===false?9:12,getLastColumn:()=>opts.metadataColumn===false?9:10,getLastRow:()=>reportRows.length+1,
   getRange:(row,col,nr,nc)=>({getValues:()=>row===1?[headers.slice(0,nc)]:reportRows.map(r=>r.slice(0,nc))})
  };
  const cutRow=Array(42).fill("");
  cutRow[0]=opts.catalogVehicleId===undefined?vehicleId:opts.catalogVehicleId;
  if(opts.slot!==false){cutRow[11]="Corte por ignición";cutRow[12]="Columna de dirección";}
  const cutRows=[Array(42).fill("header"),...(opts.cutRows||[cutRow])];
  const cutsSheet={getDataRange:()=>({getValues:()=>cutRows})};
  sandbox.getSafeSheet=name=>name==="Feedbacks"?feedbackSheet:name==="Cortes"?cutsSheet:null;
  return {reportId,vehicleId,corteIndex};
 };
 test("acepta reporte real vinculado al vehículo y corte del catálogo",()=>{const p=make();const r=sandbox.validate(p.reportId,p.vehicleId,p.corteIndex);assert(r.reportId===p.reportId&&r.vehicleId===p.vehicleId&&r.corteIndex===1);});
 test("rechaza ID ausente o sintético",()=>{const p=make();for(const id of ["","N/A","REP-fabricado"])assert.throws(()=>sandbox.validate(id,p.vehicleId,p.corteIndex));});
 test("rechaza reporte inexistente",()=>{const p=make({reports:[]});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/No existe/);});
 test("rechaza reportId duplicado",()=>{const p=make();const row=[1,"Técnico","VEH-1","otro","","","","","",JSON.stringify({reportId:p.reportId,vehicleId:"VEH-1",corteIndex:1,activaTestigoMotor:false})];const q=make({reports:[...([1,"Técnico","VEH-1","problema","","","","","",JSON.stringify({reportId:p.reportId,vehicleId:"VEH-1",corteIndex:1,activaTestigoMotor:false})]),row]});assert.throws(()=>sandbox.validate(q.reportId,q.vehicleId,q.corteIndex),/duplicado/);});
 test("rechaza vehículo cruzado en metadata",()=>{const p=make({metadata:{reportId:"REP-ABC123",vehicleId:"VEH-2",corteIndex:1,activaTestigoMotor:false}});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/no corresponde/);});
 test("rechaza vehículo distinto en fila del reporte",()=>{const p=make({reports:[[1,"Técnico","VEH-2","problema","","","","","",JSON.stringify({reportId:"REP-ABC123",vehicleId:"VEH-1",corteIndex:1,activaTestigoMotor:false})]]});assert.throws(()=>sandbox.validate(p.reportId,"VEH-1",1),/no corresponde/);});
 test("rechaza corte distinto al reportado",()=>{const p=make();assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,2),/no corresponde/);});
 test("rechaza slot vacío",()=>{const p=make({slot:false});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/no está ocupado/);});
 test("rechaza registro histórico sin metadata",()=>{const p=make({metadataColumn:false});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/no tiene metadata/);});
 test("rechaza vehículo inexistente y duplicado",()=>{let p=make({catalogVehicleId:"VEH-2"});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/no existe/);p=make({cutRows:[(()=>{const x=Array(42).fill("");x[0]="VEH-1";x[11]="Tipo";x[12]="Ubicación";return x;})(),(()=>{const x=Array(42).fill("");x[0]="VEH-1";x[11]="Tipo";x[12]="Ubicación";return x;})()]});assert.throws(()=>sandbox.validate(p.reportId,p.vehicleId,p.corteIndex),/duplicado/);});
 return {status:failed?"FAIL":"PASS",passed,failed,results};
}
const assert=require("node:assert/strict");
const fs=require("node:fs");
const result=runCutSuggestionReportLinkTests({feedback:fs.readFileSync("Services/feedback.js","utf8")});
console.log(JSON.stringify(result,null,2));
if(result.status!=="PASS")process.exitCode=1;
