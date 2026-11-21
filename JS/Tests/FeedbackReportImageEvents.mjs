import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/feedback.js",import.meta.url),"utf8");
function extract(name,next){const a=source.indexOf("function "+name+"("),b=source.indexOf("\nfunction "+next+"(",a);assert.ok(a>=0&&b>a,name);return source.slice(a,b);}
const lookupCode=extract("findFeedbackReportImageEventByReportId_","isFeedbackReportImageFileReferenced_");
function makeSheet(rows){
 const sheet={
  getLastRow:()=>rows.length+1,
  getRange(row,col,count=1,width=1){
   return {
    getValue:()=>rows[row-2]?.[col-1]??"",
    getValues:()=>[rows[row-2]?.slice(0,width)??[]],
    createTextFinder(query){return{matchCase(){return this;},matchEntireCell(){return this;},findAll(){
     return rows.flatMap((r,i)=>String(r[col-1]??"")===String(query)?[{getRow:()=>i+2}]:[]);
    }};}
   };
  }
 };
 return sheet;
}
function lookup(sheet){
 return new Function("getSpreadsheet","FEEDBACK_REPORT_IMAGE_EVENTS_SHEET","FEEDBACK_REPORT_IMAGE_EVENT_HEADERS",
  lookupCode+"\nreturn findFeedbackReportImageEventByReportId_;")(
   ()=>({getSheetByName:()=>sheet}),"FeedbackReportImageEvents",
   ["eventId","reportId","userId","imageFileId","imageUrl","imageName","imageMimeType","imageSize","imageSha256","createdAt"]
  );
}
let passed=0;const test=(n,fn)=>{fn();passed++;};
test("proyecta el primer evento de imagen cuando reportId y hash coinciden",()=>{
 const rows=[
  ["RIMG-1","REP-1","U1","FILE-A","url-a","a.png","image/png",100,"sha-1","t1"],
  ["RIMG-1","REP-1","U1","FILE-B","url-b","a.png","image/png",100,"sha-1","t2"]
 ];
 const result=lookup(makeSheet(rows))("REP-1");
 assert.equal(result.rowNumber,2);assert.equal(result.metadata.imageFileId,"FILE-A");assert.equal(result.duplicateCount,1);
});
test("rechaza eventos de imagen distintos para el mismo reporte",()=>{
 const rows=[
  ["RIMG-1","REP-1","U1","FILE-A","url-a","a.png","image/png",100,"sha-1","t1"],
  ["RIMG-2","REP-1","U1","FILE-B","url-b","b.png","image/png",200,"sha-2","t2"]
 ];
 assert.throws(()=>lookup(makeSheet(rows))("REP-1"),/eventos de imagen contradictorios/);
});
test("la vinculación de imágenes usa appendRow y no modifica reportMetadata in-place",()=>{
 const append=extract("appendFeedbackReportImageEvent_","appendReportImageEventMarker");
 assert.match(append,/sheet\.appendRow\(row\)/);
 assert.match(append,/findFeedbackReportImageEventByReportId_\(id\)/);
 assert.match(append,/imageSha256/);
 assert.doesNotMatch(source.slice(source.indexOf("function handleReportProblem("),source.indexOf("\nfunction enforceFeedbackRateLimit_")),
  /pendingExistingMetadata|reportMetadataColumn\)\.setValue/);
});
console.log("FeedbackReportImageEvents: "+passed+"/"+passed+" PASS");
