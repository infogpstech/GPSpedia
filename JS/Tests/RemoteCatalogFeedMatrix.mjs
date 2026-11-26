import { execFileSync } from "node:child_process";
const target=String(process.env.TARGET_COMMIT||"").trim();
if(!/^[a-f0-9]{40}$/i.test(target))throw Error("Commit inválido");
if(process.env.GPSPEDIA_HEALTH_ENV!=="BETA_ISOLATED"||process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS!=="I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA")throw Error("Gate Beta");
const source=execFileSync("git",["show",target+":JS/Frontend/api-config.js"],{encoding:"utf8"});
const m=source.match(/CATALOG:\s*"([^"]+)"/);if(!m)throw Error("Endpoint CATALOG ausente");
const url=m[1];if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error("Endpoint inválido");
async function get(cursor,limit){const t=Date.now();const res=await fetch(url+"?catalogFeed=1&"+new URLSearchParams({cursor:String(cursor),limit:String(limit)}),{method:"GET",redirect:"follow",signal:AbortSignal.timeout(8000),headers:{accept:"application/json"}});if(!res.ok)throw Error("HTTP "+res.status);let d;try{d=await res.json()}catch{throw Error("JSON inválido")}if(!d||d.status!=="success"||!Array.isArray(d.changes)||typeof d.resetRequired!=="boolean"||typeof d.hasMore!=="boolean"||!Number.isSafeInteger(Number(d.currentRevision))||!Number.isSafeInteger(Number(d.minRevision))||!Number.isSafeInteger(Number(d.nextCursor)))throw Error("Contrato feed incorrecto");if(d.changes.length>limit)throw Error("Feed excede límite");return {elapsedMs:Date.now()-t,currentRevision:Number(d.currentRevision),minRevision:Number(d.minRevision),nextCursor:Number(d.nextCursor),resetRequired:d.resetRequired,hasMore:d.hasMore,count:d.changes.length};}
const initial=await get(0,5);const current=initial.currentRevision;const min=initial.minRevision;
const checks=[];
for(const [cursor,limit,label] of [[current,5,"current"],[Math.max(0,min-1),5,"retention-edge"],[Math.floor((min+current)/2),5,"mid-range"],[current,1,"small-limit"],[current,5,"repeat"]])checks.push({label,cursor,...await get(cursor,limit)});
for(const result of checks){if(result.nextCursor>result.currentRevision)throw Error("nextCursor excede currentRevision");if(result.cursor<result.minRevision&&result.resetRequired!==true)throw Error("Cursor anterior a minRevision no solicita reset");if(result.resetRequired&&result.count!==0)throw Error("Reset solicitado con eventos en respuesta");}
const a=checks[0],b=checks[4];
if(a.currentRevision===b.currentRevision&&a.minRevision===b.minRevision&&a.resetRequired===b.resetRequired&&a.nextCursor===b.nextCursor&&a.count!==b.count)throw Error("Resultados repetidos contradictorios bajo revisiones estables");
const concurrentRevisionChange=checks.some(r=>r.currentRevision!==current||r.minRevision!==min);
console.log("CATALOG feed read-only matrix "+target);console.log(JSON.stringify({initial,checks,concurrentRevisionChange}));
