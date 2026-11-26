import { execFileSync } from "node:child_process";
const target=String(process.env.TARGET_COMMIT||"");
if(!/^[a-f0-9]{40}$/i.test(target))throw Error("Commit inválido");
if(process.env.GPSPEDIA_HEALTH_ENV!=="BETA_ISOLATED"||process.env.GPSPEDIA_CONFIRM_BETA_ENDPOINTS!=="I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA")throw Error("Gate Beta");
const source=execFileSync("git",["show",target+":JS/Frontend/api-config.js"],{encoding:"utf8"});
const m=source.match(/ADMIN:\s*"([^"]+)"/);if(!m)throw Error("Endpoint ADMIN ausente");
const url=m[1];if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error("Endpoint no válido");
const times=[];let version=null;
for(let i=0;i<5;i++){const t=Date.now();const res=await fetch(url+"?debug=true",{method:"GET",redirect:"follow",signal:AbortSignal.timeout(8000),headers:{accept:"application/json"}});const elapsed=Date.now()-t;if(!res.ok)throw Error("HTTP "+res.status);const data=await res.json();if(data.service!=="GPSpedia-Admin"||data.status!=="available"||typeof data.version!=="string")throw Error("Health contract inválido");if(version&&version!==data.version)throw Error("Versión fluctuante");version=data.version;times.push(elapsed);}
const sorted=[...times].sort((a,b)=>a-b);console.log("ADMIN repeated read-only probe — "+target);console.log(JSON.stringify({service:"ADMIN",version,samplesMs:times,medianMs:sorted[2],minMs:sorted[0],maxMs:sorted[4],slowSamples:times.filter(x=>x>=2000).length,total:5}));
