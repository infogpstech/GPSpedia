import { readFileSync } from "node:fs";
import { runYouTubeUploadXssIntegrityTests } from "./YouTubeUploadXssIntegrity.js";
const result=runYouTubeUploadXssIntegrityTests({
 upload:readFileSync("youtubeUpload.js","utf8"),ui:readFileSync("ui.js","utf8"),
 cortes:readFileSync("add_cortes.html","utf8")
});
const total=result.passed+result.failed;
console.log("YouTubeUploadXssIntegrity: "+result.passed+"/"+total+" PASS");
if(result.failed){for(const item of result.results.filter(x=>x.status==="FAIL"))console.error("FAIL",item.name,item.message);process.exitCode=1;}
