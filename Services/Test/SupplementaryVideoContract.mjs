import { readFileSync } from "node:fs";
const source=readFileSync("Services/Test/SupplementaryVideoContract.js","utf8");
const run=new Function(source+"\nreturn runSupplementaryVideoContractTests;")();
const result=await run({
 write:readFileSync("Services/write.js","utf8"),admin:readFileSync("Services/admin.js","utf8"),
 catalog:readFileSync("Services/catalog.js","utf8"),feedback:readFileSync("Services/feedback.js","utf8"),
 ui:readFileSync("ui.js","utf8"),addCortes:readFileSync("add_cortes.html","utf8")
});
const total=result.passed+result.failed;
console.log("SupplementaryVideoContract: "+result.passed+"/"+total+" PASS");
if(result.failed){for(const item of result.results.filter(x=>x.status==="FAIL"))console.error("FAIL",item.name,item.message);process.exitCode=1;}
