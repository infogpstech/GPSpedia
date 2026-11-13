import { readFileSync } from "node:fs";
const source=readFileSync("youtubeUpload.js","utf8"),tests=readFileSync("Services/Test/YouTubeUploadClient.js","utf8");
function extractFunction(name){
 const marker="function "+name+"(",start=source.indexOf(marker);
 if(start<0)throw new Error("No se encontró "+name);
 const declarationStart=source.slice(0,start).endsWith("async ")?start-6:start,open=source.indexOf("{",start);
 let depth=0;for(let i=open;i<source.length;i++){if(source[i]==="{")depth++;if(source[i]==="}"&&--depth===0)return source.slice(declarationStart,i+1);}
 throw new Error("Función sin cerrar: "+name);
}
function extractConstant(name){
 const start=source.indexOf("const "+name+" =");if(start<0)throw new Error("No se encontró "+name);
 const end=source.indexOf(";",start);if(end<0)throw new Error("Constante sin terminar: "+name);return source.slice(start,end+1);
}
const constants=["YOUTUBE_PENDING_OPERATION_PREFIX","YOUTUBE_PENDING_OPERATION_TTL_MS","YOUTUBE_UPLOAD_DB_NAME","YOUTUBE_UPLOAD_STORE_NAME","YOUTUBE_UPLOAD_CHUNK_SIZE"].map(extractConstant).join("\n");
const declarations=[
 "createYouTubeOperationId_","getYouTubeOperationContext_","clearYouTubeOperationContext_",
 "openYouTubeUploadDb_","watchYouTubeUploadTransaction_","saveYouTubeUploadRecord_","getYouTubeUploadRecord_",
 "findPendingYouTubeUploadRecord_","deleteYouTubeUploadRecord_","parseYouTubeUploadRange_",
 "parseYouTubeUploadResponse_","queryYouTubeUploadOffset_","sendYouTubeUploadChunk_","uploadYouTubeFileResumable_"
].map(extractFunction).join("\n");
const run=new Function("window","sessionStorage","XMLHttpRequest",constants+"\n"+declarations+"\n"+tests+"\nreturn runYouTubeUploadClientTests();");
const result=await run({}, {}, undefined),total=result.passed+result.failed;
console.log("YouTubeUploadClient: "+result.passed+"/"+total+" PASS");
if(result.failed){for(const item of result.results.filter(x=>x.status==="FAIL"))console.error("FAIL",item.name,item.message);process.exitCode=1;}
