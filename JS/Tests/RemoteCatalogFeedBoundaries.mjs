import { execFileSync } from "node:child_process";
const targetCommit=String(process.env.TARGET_COMMIT||"").trim();
if(!/^[a-f0-9]{40}$/i.test(targetCommit))throw new Error("TARGET_COMMIT inválido");
const source=execFileSync("git",["show",targetCommit+":JS/Frontend/api-config.js"],{encoding:"utf8",maxBuffer:4*1024*1024});
if(process.env.GPSPEDIA_HEALTH_ENV!=="BETA_ISOLATED"||process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS!=="I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA")throw new Error("Gate Beta no confirmado");
const match=source.match(/export const API_ENDPOINTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
if(!match)throw new Error("No se pudo leer API_ENDPOINTS");
const endpoints={};for(const line of match[1].split(/\r?\n/)){const m=line.match(/^\s*([A-Z]+):\s*"([^"]+)"\s*,?\s*$/);if(m)endpoints[m[1]]=m[2];}
const url=endpoints.CATALOG;if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url||""))throw new Error("Endpoint CATALOG inválido");
async function probe(params){const started=Date.now();const response=await fetch(url+"?catalogFeed=1&"+new URLSearchParams(params),{method:"GET",redirect:"follow",signal:AbortSignal.timeout(8000),headers:{accept:"application/json"}});if(!response.ok)throw Error("CATALOG feed HTTP "+response.status);let data;try{data=JSON.parse(await response.text())}catch{throw Error("Feed CATALOG no JSON");}return {elapsedMs:Date.now()-started,data};}
function validSuccess(data,limit){if(!data||data.status!=="success"||!Array.isArray(data.changes)||typeof data.resetRequired!=="boolean"||typeof data.hasMore!=="boolean"||!Number.isSafeInteger(Number(data.currentRevision))||!Number.isSafeInteger(Number(data.minRevision))||!Number.isSafeInteger(Number(data.nextCursor))||data.changes.length>limit)throw Error("Respuesta CATALOG inesperada en probe de cursor");}
const tail=await probe({cursor:"5",limit:"1"});validSuccess(tail.data,1);
const future=await probe({cursor:"999999",limit:"1"});validSuccess(future.data,1);if(future.data.resetRequired!==true||future.data.changes.length!==0||future.data.nextCursor!==future.data.currentRevision)throw Error("Cursor futuro no solicitó reset conforme al contrato");
const negative=await probe({cursor:"-1",limit:"1"});if(negative.data.status!=="error")throw Error("Cursor negativo no fue rechazado");
const malformed=await probe({cursor:"abc",limit:"1"});if(malformed.data.status!=="error")throw Error("Cursor malformado no fue rechazado");
const limits=[];for(const value of ["0","51"]){const r=await probe({cursor:"5",limit:value});if(r.data.status!=="error")throw Error("Límite inválido "+value+" no fue rechazado");limits.push({limit:value,rejected:true,elapsedMs:r.elapsedMs});}
console.log("CATALOG feed cursor boundary Beta read-only — "+targetCommit);
console.log(JSON.stringify({tail:{resetRequired:tail.data.resetRequired,hasMore:tail.data.hasMore,changeCount:tail.data.changes.length,elapsedMs:tail.elapsedMs},futureCursor:{resetRequired:future.data.resetRequired,changeCount:future.data.changes.length,nextCursor:future.data.nextCursor,currentRevision:future.data.currentRevision,elapsedMs:future.elapsedMs},negativeCursorRejected:true,malformedCursorRejected:true,limits,limitInvalidRejected:true}));
