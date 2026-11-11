import assert from 'node:assert/strict';
import { runCatalogRequestWithRetry } from '../../catalogRequest.js';

let passed = 0;
async function run(name, test) { await test(); passed += 1; console.log('PASS: ' + name); }

await run('success no retry', async () => { let n=0; const r=await runCatalogRequestWithRetry(async()=>{n++;return {data:[]};},{timeoutMs:50,retries:2,baseDelayMs:0}); assert.deepEqual(r,{data:[]});assert.equal(n,1); });
await run('network error retries', async () => { let n=0; const r=await runCatalogRequestWithRetry(async()=>{n++;if(n===1)throw new TypeError('Failed to fetch');return 'ok';},{timeoutMs:50,retries:2,baseDelayMs:0});assert.equal(r,'ok');assert.equal(n,2); });
await run('HTTP 503 retries', async () => { let n=0; const r=await runCatalogRequestWithRetry(async()=>{n++;if(n===1){const e=new Error('HTTP 503');e.status=503;throw e;}return 'ok';},{timeoutMs:50,retries:1,baseDelayMs:0});assert.equal(r,'ok');assert.equal(n,2); });
await run('timeout aborts request and retries', async () => { let n=0,aborted=false; const r=await runCatalogRequestWithRetry(signal=>{n++;if(n===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;const e=new Error('aborted');e.name='AbortError';reject(e);},{once:true}));return Promise.resolve('recovered');},{timeoutMs:5,retries:1,baseDelayMs:0});assert.equal(r,'recovered');assert.equal(n,2);assert.equal(aborted,true); });
await run('permanent HTTP error does not retry', async () => { let n=0; const req=async()=>{n++;const e=new Error('HTTP 400');e.status=400;throw e;}; await assert.rejects(runCatalogRequestWithRetry(req,{timeoutMs:50,retries:3,baseDelayMs:0}),e=>e.status===400);assert.equal(n,1); });
await run('external abort cancels active request', async () => { const c=new AbortController();let n=0;const p=runCatalogRequestWithRetry(signal=>{n++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e);},{once:true}));},{signal:c.signal,timeoutMs:100,retries:2,baseDelayMs:0});setTimeout(()=>c.abort(),5);await assert.rejects(p,e=>e.name==='AbortError');assert.equal(n,1); });
await run('external abort cancels retry delay', async () => { const c=new AbortController();let n=0;const p=runCatalogRequestWithRetry(async()=>{n++;throw new TypeError('network');},{signal:c.signal,timeoutMs:50,retries:2,baseDelayMs:100});setTimeout(()=>c.abort(),5);await assert.rejects(p,e=>e.name==='AbortError');assert.equal(n,1); });
console.log('CatalogRequestRetry: '+passed+'/7 PASS');
