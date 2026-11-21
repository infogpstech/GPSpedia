import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function findFeedbackRowById_(");
const end = source.indexOf("\nfunction findReportByReportId_(", start);
assert.ok(start >= 0 && end > start);
const code = source.slice(start, end);
const findRow = new Function("COLS_FEEDBACKS", code + "\nreturn findFeedbackRowById_;")({ ID: 1 });
function sheet(rows) {
 return { getLastRow:()=>rows.length+1, getLastColumn:()=>4, getRange(row,col,count=1,width=1) {
  return { getValue:()=>rows[row-2]?.[col-1]??"", getValues:()=>[rows[row-2]?.slice(0,width)??[]],
   createTextFinder(q){return {matchCase(){return this;},matchEntireCell(){return this;},findAll(){return rows.flatMap((r,i)=>String(r[0]??"")===String(q)?[{getRow:()=>i+2}]:[]);}};}
  };
 }};
}
let passed=0;const test=(n,fn)=>{fn();passed++;};
test("encuentra la fila propia por ID aunque otra escritura ocupe el índice anticipado",()=>{
 const result=findRow(sheet([["FB-1","A"],["FB-3","C"],["FB-2","B"]]),"FB-2",3);
 assert.equal(result.rowIndex,4);assert.deepEqual(result.row.slice(0,2),["FB-2","B"]);
});
test("rechaza IDs físicos duplicados",()=>{
 assert.throws(()=>findRow(sheet([["FB-1"],["FB-1"]]),"FB-1",1),/ID físico reservado aparece duplicado/);
});
test("ambos handlers verifican la fila por ID reservado",()=>{
 for(const [name,next] of [["handleReportProblem","enforceFeedbackRateLimit_"],["handleSuggestCutChange","parseModelosAsociados"]]){
  const a=source.indexOf("function "+name+"("),b=source.indexOf("\nfunction "+next+"(",a),body=source.slice(a,b);
  assert.ok(body.includes("findFeedbackRowById_(sheet, reservedId, lastCol)"),name);
 }
});
console.log("FeedbackAppendRowIdentity: "+passed+"/"+passed+" PASS");
