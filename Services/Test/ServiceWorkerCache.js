import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../service-worker.js',import.meta.url),'utf8');
const cases=[];
const test=(name,run)=>cases.push({name,run});
const quota=()=>Object.assign(new Error('Storage quota exceeded'),{name:'QuotaExceededError'});
function harness({addAllError=null,optionalError=null,putError=null,networkError=null}={}){
 const listeners={},assets=[],logs=[];let skip=0;
 const cache={async addAll(a){if(addAllError)throw addAllError;assets.push(...a);},async add(a){if(optionalError)throw optionalError;assets.push(a);},async put(){if(putError)throw putError;}};
 const context={self:{addEventListener:(n,fn)=>listeners[n]=fn,skipWaiting:async()=>skip++,clients:{claim:async()=>{}}},
 caches:{open:async()=>cache,keys:async()=>['gpsepedia-cache-v14','other-app-cache'],delete:async()=>true,match:async()=>({offline:true})},
 fetch:async()=>{if(networkError)throw networkError;return{status:200,clone:()=>({})};},
 console:{log(){},warn:(...a)=>logs.push(['warn',...a]),error:(...a)=>logs.push(['error',...a])},Promise,Boolean};
 vm.runInNewContext(source,context);
 return{listeners,assets,logs,get skip(){return skip;}};
}
function event(request={method:'GET',mode:'cors',url:'/main.js'}){return{request,waits:[],response:null,waitUntil(p){this.waits.push(Promise.resolve(p));},respondWith(p){this.response=Promise.resolve(p);}};}
test('precache incluye el grafo transitivo y VinDifferentialEngine',async()=>{
 const h=harness(),e=event();h.listeners.install(e);await Promise.all(e.waits);
 for(const p of ['./main.js','./VinDifferentialEngine.js','./share-utils.js','./catalogStatus.js','./catalogRequest.js','./pys-data.js','./validationSubmission.js','./likeState.js','./youtubeUpload.js','./imageObjectUrlCache.js','./thumbnailCompressionQueue.js'])assert.ok(h.assets.includes(p),p);
 assert.match(source,/gpsepedia-cache-v16/);
 assert.equal(h.skip,1);
});
test('cuota opcional no impide instalar App Shell',async()=>{
 const h=harness({optionalError:quota()}),e=event();h.listeners.install(e);await Promise.all(e.waits);
 assert.ok(h.assets.includes('./main.js'));assert.equal(h.skip,1);assert.ok(h.logs.some(x=>x[0]==='warn'));
});
test('cuota esencial aborta instalación incompleta',async()=>{
 const h=harness({addAllError:quota()}),e=event();h.listeners.install(e);
 await assert.rejects(Promise.all(e.waits),/Storage quota exceeded/);assert.equal(h.skip,0);assert.ok(h.logs.some(x=>x[0]==='error'));
});
test('cache.put usa waitUntil y cuota no rompe respuesta',async()=>{
 const h=harness({putError:quota()}),e=event();h.listeners.fetch(e);const r=await e.response;await Promise.all(e.waits);
 assert.equal(r.status,200);assert.equal(e.waits.length,1);assert.ok(h.logs.some(x=>x[0]==='warn'));
});
test('navegación offline usa documento cacheado',async()=>{
 const h=harness({networkError:new TypeError('offline')}),e=event({method:'GET',mode:'navigate',url:'/deep-link'});h.listeners.fetch(e);
 assert.deepEqual(await e.response,{offline:true});await Promise.all(e.waits);
});
test('peticiones no GET no se interceptan',async()=>{
 const h=harness(),e=event({method:'POST',mode:'cors',url:'/api'});h.listeners.fetch(e);assert.equal(e.waits.length,0);assert.equal(e.response,null);
});
let passed=0;for(const item of cases){await item.run();passed++;console.log('PASS: '+item.name);}
console.log('ServiceWorkerCache: '+passed+'/'+cases.length+' PASS');
