import assert from 'node:assert/strict';

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log('PASS', name);
}
async function testAsync(name, fn) {
    await fn();
    passed += 1;
    console.log('PASS', name);
}

function createIndexedDBHarness(options = {}) {
 const stores=new Map(),connections=[],transactionQueue=[];let openCount=0,transactionCount=0,activeTransaction=null,activeTransactions=0,maxActiveTransactions=0;
 const activateNext=()=>{if(activeTransaction||!transactionQueue.length)return;activeTransaction=transactionQueue.shift();queueMicrotask(()=>activeTransaction&&activeTransaction.activate());};
 const release=tx=>{if(activeTransaction!==tx)return;activeTransactions--;activeTransaction=null;activateNext();};
 const database={objectStoreNames:{contains:name=>stores.has(name)},createObjectStore(name,config={}){stores.set(name,{values:new Map(),keyPath:config.keyPath||null});return{};},close(){this.closed=true;},
 transaction(names,mode){
  transactionCount++;const behavior=options.transactions&&options.transactions[transactionCount-1]||'complete';
  let aborted=false,finished=false,activated=false,processing=false,pendingRequests=0,completionScheduled=false;const requestQueue=[],undoActions=[];let tx;
  const settle=()=>{if(finished||processing||pendingRequests)return;if(aborted){finished=true;release(tx);return;}if(requestQueue.length||completionScheduled)return;completionScheduled=true;queueMicrotask(()=>{completionScheduled=false;if(finished||aborted||processing||pendingRequests||requestQueue.length)return;finished=true;if(tx.oncomplete)tx.oncomplete();if(options.onTransactionComplete)options.onTransactionComplete({names,mode});release(tx);});};
  const processNext=()=>{if(!activated||processing||finished||aborted){settle();return;}const item=requestQueue.shift();if(!item){settle();return;}processing=true;const execute=()=>{if(aborted||finished){pendingRequests--;processing=false;settle();return;}try{item.operation();}finally{pendingRequests--;processing=false;if(aborted)settle();else processNext();}};if(item.defer&&options.deferDeletes)queueMicrotask(()=>{if(options.onDeleteQueued)options.onDeleteQueued(execute);else execute();});else queueMicrotask(execute);};
  const enqueue=(request,operation,defer=false)=>{pendingRequests++;requestQueue.push({operation,defer});processNext();return request;};
  const abortTransaction=()=>{if(aborted||finished)return;aborted=true;for(let index=undoActions.length-1;index>=0;index--)undoActions[index]();undoActions.length=0;pendingRequests-=requestQueue.length;requestQueue.length=0;if(tx.onabort)tx.onabort();settle();};
  tx={error:behavior==='quota'?new DOMException('Quota exceeded','QuotaExceededError'):null,
   objectStore(name){const record=stores.get(name);return{
    put(value,key){const request={};return enqueue(request,()=>{if(behavior==='quota'||(name==='thumbnails'&&options.quotaFailures>0)){if(options.quotaFailures>0)options.quotaFailures--;request.error=behavior==='quota'?tx.error:new DOMException('Quota exceeded','QuotaExceededError');tx.error=request.error;if(request.onerror)request.onerror();if(tx.onerror)tx.onerror();abortTransaction();return;}const resolvedKey=key===undefined?value[record.keyPath]:key;const hadPrevious=record.values.has(resolvedKey),previousValue=record.values.get(resolvedKey);undoActions.push(()=>{if(hadPrevious)record.values.set(resolvedKey,previousValue);else record.values.delete(resolvedKey);});record.values.set(resolvedKey,structuredClone(value));request.result=resolvedKey;if(request.onsuccess)request.onsuccess();if(behavior==='abort')queueMicrotask(()=>{tx.error=new DOMException('Aborted','AbortError');abortTransaction();});});},
    get(key){const request={};return enqueue(request,()=>{if(behavior==='get-error'){request.error=new DOMException('Read failed','UnknownError');tx.error=request.error;if(request.onerror)request.onerror();if(tx.onerror)tx.onerror();abortTransaction();return;}request.result=record.values.get(key);if(request.onsuccess)request.onsuccess();});},
    getAll(){const request={};return enqueue(request,()=>{request.result=[...record.values.values()];if(request.onsuccess)request.onsuccess();});},
    getAllKeys(){const request={};return enqueue(request,()=>{request.result=[...record.values.keys()];if(request.onsuccess)request.onsuccess();});},
    delete(key){const request={};return enqueue(request,()=>{const hadPrevious=record.values.has(key),previousValue=record.values.get(key);undoActions.push(()=>{if(hadPrevious)record.values.set(key,previousValue);});record.values.delete(key);request.result=undefined;if(request.onsuccess)request.onsuccess();if(behavior==='abort')queueMicrotask(()=>{tx.error=new DOMException('Aborted','AbortError');abortTransaction();});},true);}
   };},
   abort(){queueMicrotask(abortTransaction);},
   activate(){if(activated||finished)return;activated=true;activeTransactions++;maxActiveTransactions=Math.max(maxActiveTransactions,activeTransactions);if(options.onTransactionStart)options.onTransactionStart({names,mode});processNext();}
  };
  transactionQueue.push(tx);activateNext();return tx;
 }};
 const indexedDB={open(){openCount++;const request={};connections.push(database);queueMicrotask(()=>{if(options.openError){request.error=new DOMException('IndexedDB unavailable','UnknownError');if(request.onerror)request.onerror();return;}if(options.blocked){if(request.onblocked)request.onblocked();return;}if(openCount===1&&request.onupgradeneeded)request.onupgradeneeded({target:{result:database}});request.result=database;if(request.onsuccess)request.onsuccess({target:{result:database}});});return request;}};
 return{indexedDB,database,connections,stores,get openCount(){return openCount;},get maxActiveTransactions(){return maxActiveTransactions;}};
}
async function freshOffline(harness, label) {
    globalThis.indexedDB = harness.indexedDB;
    return import(`../../offline.js?indexeddb-${label}-${Date.now()}-${Math.random()}`);
}

async function runIndexedDBTransactionTests() {
    const successHarness = createIndexedDBHarness();
    const offline = await freshOffline(successHarness, 'success');
    const snapshot = {
        cortes: [{ id: 'C-1', marca: 'Toyota' }],
        tutoriales: [],
        relay: [],
        logos: []
    };

    await testAsync('saveCatalog solo resuelve después del commit de la transacción', async () => {
        await offline.saveCatalog(snapshot);
        const stored = await offline.getCatalog();
        assert.deepEqual(stored, snapshot);
    });

    test('la conexión se cierra ante onversionchange y permite reabrir', async () => {
        const first = await offline.initDB();
        assert.equal(typeof first.onversionchange, 'function');
        first.onversionchange();
        assert.equal(first.closed, true);
        const reopened = await offline.initDB();
        assert.ok(reopened);
        assert.equal(successHarness.openCount, 2);
    });

    const abortHarness = createIndexedDBHarness({ transactions: ['abort'] });
    const abortOffline = await freshOffline(abortHarness, 'abort');
    await testAsync('un request exitoso seguido de transaction.onabort no se confirma', async () => {
        await assert.rejects(abortOffline.saveCatalog(snapshot), /IndexedDB|transacción|transaction/i);
    });

    const quotaHarness = createIndexedDBHarness({ transactions: ['quota'] });
    const quotaOffline = await freshOffline(quotaHarness, 'quota');
    await testAsync('un error de cuota rechaza la escritura y no se presenta como guardada', async () => {
        await assert.rejects(quotaOffline.saveCatalog(snapshot), /IndexedDB|transacción|transaction/i);
    });

    const blockedHarness = createIndexedDBHarness({ blocked: true });
    const blockedOffline = await freshOffline(blockedHarness, 'blocked');
    await testAsync('onblocked falla de forma explícita y no deja la apertura pendiente', async () => {
        await assert.rejects(blockedOffline.initDB(), /bloqueada/);
    });

    const scopedHarness = createIndexedDBHarness();
    const scopedOffline = await freshOffline(scopedHarness, 'account-scope');
    await testAsync('historial aislado por cuenta y consultas potencialmente VIN excluidas', async () => {
        await scopedOffline.saveSearch('Lancer', 'user-a');
        await scopedOffline.saveSearch('Civic', 'user-b');
        assert.equal(await scopedOffline.saveSearch('1HGCM82633A004352', 'user-a'), null);
        assert.deepEqual((await scopedOffline.getSearchHistory('user-a')).map(entry => entry.term), ['lancer']);
        assert.deepEqual((await scopedOffline.getSearchHistory('user-b')).map(entry => entry.term), ['civic']);
        assert.equal(await scopedOffline.saveSearch('Corolla', ''), null);
        assert.deepEqual(await scopedOffline.getSearchHistory(''), []);
    });
    await testAsync('vistos aislados entre cuentas', async () => {
        await scopedOffline.saveViewedItem({ id: 'V-1', marca: 'Toyota' }, 'user-a');
        await scopedOffline.saveViewedItem({ id: 'V-1', marca: 'Honda' }, 'user-b');
        const viewedA = await scopedOffline.getViewedItems('user-a'), viewedB = await scopedOffline.getViewedItems('user-b');
        assert.equal(viewedA.length, 1); assert.equal(viewedA[0].id, 'V-1'); assert.equal(viewedA[0].data.marca, 'Toyota');
        assert.equal(viewedB.length, 1); assert.equal(viewedB[0].data.marca, 'Honda');
        assert.deepEqual(await scopedOffline.getViewedItems(''), []);
    });
    await testAsync('validationCache aislado por cuenta', async () => {
        await scopedOffline.saveValidationResponse('V-2', 'correct', 'user-a');
        assert.ok(await scopedOffline.getValidationResponse('V-2', 'user-a'));
        assert.equal(await scopedOffline.getValidationResponse('V-2', 'user-b'), null);
        assert.equal(await scopedOffline.saveValidationResponse('V-2', 'incorrect', ''), null);
    });
    await testAsync('variantes pequeña/media/grande aisladas en orden inverso y sin ampliar',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-resolution-variants');
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        let closed=0,fetches=0;const dimensions=[],types=[];
        globalThis.fetch=async()=>{fetches++;return{ok:true,blob:async()=>new Blob(['source'],{type:'image/jpeg'})};};
        globalThis.createImageBitmap=async()=>({width:1200,height:600,close(){closed++;}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb,type){dimensions.push([this.width,this.height]);types.push(type);cb(new Blob(['png-'+this.width],{type}));}};}};
        try{
            assert.equal(await api.getThumbnail('drive-file-123',300),null);
            await api.compressAndStoreThumbnail('https://images.example/vehicle.jpg','drive-file-123',1600);
            await api.compressAndStoreThumbnail('https://images.example/vehicle.jpg','drive-file-123',800);
            await api.compressAndStoreThumbnail('https://images.example/vehicle.jpg','drive-file-123',300);
            const large=await api.getThumbnail('drive-file-123',1600),medium=await api.getThumbnail('drive-file-123',800),small=await api.getThumbnail('drive-file-123',300);
            assert.ok(large&&medium&&small);
            assert.deepEqual(dimensions,[[1200,600],[800,400],[300,150]]);
            assert.deepEqual(types,['image/png','image/png','image/png']);
            assert.ok(large.size>0&&medium.size>0&&small.size>0);
            assert.equal(closed,3);assert.equal(fetches,3);
            assert.equal(await api.getThumbnail('drive-file-123',400),null);
            assert.equal((await api.getThumbnail('drive-file-123',800)).type,'image/png');
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('rechaza caché heredada y metadatos de variante incompatibles',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-incompatible-variants');
        await api.initDB();
        const store=harness.stores.get('thumbnails'),now=Date.now();
        store.values.set('legacy-file-123',{blob:new Blob(['legacy']),cachedAt:now,width:400});
        store.values.set('wrong-file-123::w800',{key:'wrong-file-123::w800',fileId:'wrong-file-123',width:300,blob:new Blob(['wrong-width']),cachedAt:now,lastAccessedAt:now});
        store.values.set('wrong-id-123::w800',{key:'wrong-id-123::w800',fileId:'another-id',width:800,blob:new Blob(['wrong-id']),cachedAt:now,lastAccessedAt:now});
        assert.equal(await api.getThumbnail('legacy-file-123',800),null);
        assert.equal(await api.getThumbnail('wrong-file-123',800),null);
        assert.equal(await api.getThumbnail('wrong-id-123',800),null);
        assert.equal(store.values.has('legacy-file-123'),false);
        assert.equal(store.values.has('wrong-file-123::w800'),false);
        assert.equal(store.values.has('wrong-id-123::w800'),false);
    });
    await testAsync('miniaturas caducadas por TTL se eliminan y pueden regenerarse',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-ttl');
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            await api.compressAndStoreThumbnail('https://images.example/ttl.png','ttl-file-123',300);
            const store=harness.stores.get('thumbnails'),key='ttl-file-123::w300',entry=store.values.get(key);
            assert.ok(entry&&entry.cachedAt);
            entry.cachedAt=Date.now()-(31*24*60*60*1000);store.values.set(key,entry);
            assert.equal(await api.getThumbnail('ttl-file-123',300),null);
            assert.equal(store.values.has(key),false);
            await api.compressAndStoreThumbnail('https://images.example/ttl.png','ttl-file-123',300);
            assert.ok(await api.getThumbnail('ttl-file-123',300));
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('la cuota agotada elimina miniaturas LRU y reintenta sin afectar otros datos',async()=>{
        const harness=createIndexedDBHarness({quotaFailures:1}),api=await freshOffline(harness,'thumbnail-quota-recovery');
        await api.saveCatalog(snapshot);
        await api.initDB();
        const store=harness.stores.get('thumbnails'),now=Date.now();
        for(let i=0;i<4;i++){
            const key='quota-'+String(i).padStart(3,'0')+'::w300';
            store.values.set(key,{key,fileId:'quota-'+i,width:300,blob:new Blob(['thumb-'+i]),cachedAt:now-1000-i,lastAccessedAt:now-1000-i});
        }
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            const result=await api.compressAndStoreThumbnail('https://images.example/quota.png','quota-new-entry',300);
            assert.ok(result,'la miniatura debe guardarse después de liberar cuota');
            assert.equal(store.values.has('quota-003::w300'),false,'debe eliminar primero la variante menos reciente');
            assert.equal(store.values.has('quota-new-entry::w300'),true);
            assert.deepEqual(await api.getCatalog(),snapshot,'la recuperación no debe modificar otros almacenes');
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('la recuperación de cuota también libera miniaturas heredadas',async()=>{
        const harness=createIndexedDBHarness({quotaFailures:1}),api=await freshOffline(harness,'thumbnail-quota-legacy');
        await api.initDB();
        const store=harness.stores.get('thumbnails');
        store.values.set('legacy-file-a',new Blob(['legacy-a']));
        store.values.set('legacy-file-b',new Blob(['legacy-b']));
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            const result=await api.compressAndStoreThumbnail('https://images.example/quota-legacy.png','quota-legacy-new',300);
            assert.ok(result);
            assert.equal(store.values.has('legacy-file-a'),false,'debe liberar primero una clave heredada cuando no hay variantes LRU modernas');
            assert.equal(store.values.has('quota-legacy-new::w300'),true);
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('si la cuota sigue agotada después de liberar miniaturas, omite el caché sin afectar el catálogo',async()=>{
        const harness=createIndexedDBHarness({quotaFailures:10}),api=await freshOffline(harness,'thumbnail-quota-exhausted');
        await api.saveCatalog(snapshot);
        await api.initDB();
        const store=harness.stores.get('thumbnails');
        store.values.set('legacy-file-only',new Blob(['legacy']));
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            const result=await api.compressAndStoreThumbnail('https://images.example/quota-full.png','quota-full-new',300);
            assert.equal(result,null,'no debe fallar la carga visual si la caché no puede persistirse');
            assert.equal(store.values.size,0,'debe agotar primero las miniaturas descartables');
            assert.deepEqual(await api.getCatalog(),snapshot,'el catálogo debe permanecer intacto');
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('LRU actualiza recencia y expulsa la variante menos utilizada al superar el límite',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-lru');
        await api.initDB();
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            const store=harness.stores.get('thumbnails'),now=Date.now();
            for(let i=0;i<200;i++){
                const key=`lru-${String(i).padStart(3,'0')}::w300`;
                store.values.set(key,{key,fileId:`lru-${String(i).padStart(3,'0')}`,width:300,blob:new Blob([`thumb-${i}`]),cachedAt:now-1000-i,lastAccessedAt:now-1000-i});
            }
            assert.ok(await api.getThumbnail('lru-000',300));
            await api.compressAndStoreThumbnail('https://images.example/lru.png','lru-new-entry',300);
            assert.equal(store.values.has('lru-000::w300'),true,'la variante consultada recientemente debe conservarse');
            assert.equal(store.values.has('lru-199::w300'),false,'la variante más antigua no consultada debe expulsarse');
            assert.equal(store.values.has('lru-new-entry::w300'),true,'la variante recién creada debe conservarse');
            assert.equal([...store.values.values()].filter(entry=>entry&&entry.key&&entry.blob).length,200);
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
    });
    await testAsync('la evicción LRU espera a que todas las solicitudes delete completen',async()=>{
        let releaseDelete;
        let notifyDeleteQueued;
        const deleteQueued=new Promise(resolve=>{notifyDeleteQueued=resolve;});
        const harness=createIndexedDBHarness({deferDeletes:true,onDeleteQueued:release=>notifyDeleteQueued(release)});
        const api=await freshOffline(harness,'thumbnail-lru-pending-delete');
        await api.initDB();
        const store=harness.stores.get('thumbnails'),now=Date.now();
        for(let i=0;i<200;i++){
            const key='pending-'+String(i).padStart(3,'0')+'::w300';
            store.values.set(key,{key,fileId:'pending-'+String(i).padStart(3,'0'),width:300,blob:new Blob(['thumb-'+i]),cachedAt:now-1000-i,lastAccessedAt:now-1000-i});
        }
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:640,height:480,close(){}});
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            let settled=false;
            const saving=api.compressAndStoreThumbnail('https://images.example/pending.png','pending-new-entry',300).then(value=>{settled=true;return value;});
            releaseDelete=await deleteQueued;
            await Promise.resolve();
            assert.equal(settled,false,'la operación no debe resolver antes de completar delete');
            releaseDelete();
            assert.ok(await saving);
            assert.equal(settled,true);
            assert.equal([...store.values.values()].filter(entry=>entry&&entry.key&&entry.blob).length,200);
            assert.equal(store.values.has('pending-199::w300'),false);
        }finally{
            if(releaseDelete)releaseDelete();
            globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;
        }
    });
    await testAsync('la compresión de miniaturas mantiene como máximo dos trabajos activos',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-concurrency');
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        let active=0,maxActive=0,started=0,closed=0;
        const releases=[],waiters=[];
        const waitForStarted=target=>started>=target?Promise.resolve():new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(`Timeout esperando ${target} compresiones iniciadas.`)),2000);waiters.push({target,resolve:()=>{clearTimeout(timeout);resolve();}});});
        const notifyStarted=()=>{
            for(let index=waiters.length-1;index>=0;index--){
                if(started>=waiters[index].target){waiters[index].resolve();waiters.splice(index,1);}
            }
        };
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>{
            active+=1;started+=1;maxActive=Math.max(maxActive,active);notifyStarted();
            await new Promise(resolve=>releases.push(resolve));
            active-=1;
            return{width:640,height:480,close(){closed++;}};
        };
        globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb(new Blob(['thumb'],{type:'image/png'}));}};}};
        try{
            const jobs=Array.from({length:5},(_,index)=>
                api.compressAndStoreThumbnail(`https://images.example/concurrency-${index}.png`,`concurrency-${index}`,300));
            for(const target of [2,4,5]){
                await waitForStarted(target);
                releases.splice(0).forEach(release=>release());
            }
            const results=await Promise.all(jobs);
            assert.equal(results.length,5);
            assert.ok(results.every(Boolean),'las miniaturas deben completar su persistencia');
            assert.equal(maxActive,2,'no deben existir más de dos ImageBitmap activos simultáneamente');
            assert.equal(closed,5,'cada ImageBitmap debe cerrarse al finalizar su compresión');
        }finally{
            releases.splice(0).forEach(release=>release());
            globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;
        }
    });
    await testAsync('addCutPending aísla operaciones del mismo vehículo por cuenta', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-owner-isolation');
        const make=(userId,id)=>({id,vehicleId:'VEH-OWNER-1',userId,sessionToken:'DO-NOT-PERSIST',SessionToken:'DO-NOT-PERSIST-EITHER',cutData:{tipoCorte1:'Ignición'},status:'processing'});
        assert.equal((await api.saveAddCutPendingOperation(make('USER-A','OP-A'))).saved,true);
        assert.equal((await api.saveAddCutPendingOperation(make('USER-B','OP-B'))).saved,true);
        assert.equal((await api.getAddCutPendingOperation('VEH-OWNER-1','USER-A')).operation.id,'OP-A');
        assert.equal((await api.getAddCutPendingOperation('VEH-OWNER-1','USER-B')).operation.id,'OP-B');
        const storedA = (await api.getAddCutPendingOperation('VEH-OWNER-1','USER-A')).operation;
        assert.equal(Object.prototype.hasOwnProperty.call(storedA,'sessionToken'),false);
        assert.equal(Object.prototype.hasOwnProperty.call(storedA,'SessionToken'),false);
    });
    await testAsync('addCutPending conserva conflicto dentro de la misma cuenta', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-owner-conflict');
        const base={vehicleId:'VEH-OWNER-2',userId:'USER-A',cutData:{tipoCorte1:'Ignición'},status:'failed'};
        assert.equal((await api.saveAddCutPendingOperation({...base,id:'OP-ORIGINAL'})).saved,true);
        const conflict=await api.saveAddCutPendingOperation({...base,id:'OP-NEW'});
        assert.equal(conflict.conflict,true);assert.equal(conflict.operation.id,'OP-ORIGINAL');
        assert.equal((await api.getAddCutPendingOperation('VEH-OWNER-2','USER-A')).operation.id,'OP-ORIGINAL');
    });
    await testAsync('addCutPending migra el registro legado al propietario original', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-legacy-owner');await api.initDB();
        const store=h.stores.get('adminLocalState'),op={id:'OP-LEGACY-A',vehicleId:'VEH-LEGACY',userId:'USER-A',cutData:{tipoCorte1:'Bomba'},status:'failed'};
        store.values.set('addCutPending:VEH-LEGACY',{key:'addCutPending:VEH-LEGACY',operation:op});
        const restored=await api.getAddCutPendingOperation('VEH-LEGACY','USER-A');
        assert.equal(restored.operation.id,'OP-LEGACY-A');assert.equal(store.values.has('addCutPending:VEH-LEGACY'),false);
        assert.equal(store.values.has('addCutPending:USER-A:VEH-LEGACY'),true);
    });
    await testAsync('addCutPending de otra cuenta no bloquea y conserva el owner legado', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-legacy-other-owner');await api.initDB();
        const store=h.stores.get('adminLocalState'),op={id:'OP-LEGACY-A',vehicleId:'VEH-LEGACY-2',userId:'USER-A',cutData:{tipoCorte1:'Bomba'},status:'failed'};
        store.values.set('addCutPending:VEH-LEGACY-2',{key:'addCutPending:VEH-LEGACY-2',operation:op});
        assert.equal((await api.getAddCutPendingOperation('VEH-LEGACY-2','USER-B')).operation,null);
        assert.equal((await api.getAddCutPendingOperation('VEH-LEGACY-2','USER-A')).operation.id,'OP-LEGACY-A');
    });
    await testAsync('addCutPending elimina solo el opId de la cuenta propietaria', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-owner-remove');
        const make=userId=>({id:'OP-'+userId,vehicleId:'VEH-OWNER-3',userId,cutData:{tipoCorte1:'Ignición'},status:'failed'});
        await api.saveAddCutPendingOperation(make('USER-A'));await api.saveAddCutPendingOperation(make('USER-B'));
        assert.equal(await api.removeAddCutPendingOperation('VEH-OWNER-3','USER-A','OP-USER-A'),true);
        assert.equal((await api.getAddCutPendingOperation('VEH-OWNER-3','USER-A')).operation,null);
        assert.equal((await api.getAddCutPendingOperation('VEH-OWNER-3','USER-B')).operation.id,'OP-USER-B');
    });

    await testAsync('addCutPending conserva snapshots antiguos hasta confirmación y limpieza por propietario/opId', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'addcut-retention');
        await api.initDB();
        const store=h.stores.get('adminLocalState');
        const key='addCutPending:'+encodeURIComponent('USER-A')+':'+encodeURIComponent('VEH-OLD');
        store.values.set(key,{key,updatedAt:1,operation:{id:'OP-OLD',vehicleId:'VEH-OLD',userId:'USER-A',cutData:{tipoCorte1:'Ignición'},status:'failed'}});
        assert.equal((await api.getAddCutPendingOperation('VEH-OLD','USER-A')).operation.id,'OP-OLD');
        assert.equal(await api.removeAddCutPendingOperation('VEH-OLD','USER-B','OP-OLD'),false);
        assert.equal((await api.getAddCutPendingOperation('VEH-OLD','USER-A')).operation.id,'OP-OLD');
        assert.equal(await api.removeAddCutPendingOperation('VEH-OLD','USER-A','OP-OLD'),true);
    });

    await testAsync('adminImageUploadPending persiste y recupera el snapshot completo sin credenciales', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-durable-snapshot');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-1',fieldName:'imgCorte1',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100,
            SessionToken:'DO-NOT-PERSIST',credential:'DO-NOT-PERSIST',extra:'DO-NOT-PERSIST'};
        const saved=await api.saveAdminImageUploadPendingOperation(operation);
        assert.equal(saved.saved,true);
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-1','imgCorte1','USER-A');
        assert.equal(restored.available,true);
        assert.deepEqual(restored.operation,{id:operation.id,ownerId:'USER-A',vehicleId:'VEH-ADMIN-1',fieldName:'imgCorte1',
            fileData:operation.fileData,filename:operation.filename,mimeType:operation.mimeType,createdAt:100});
        const key='adminImageUploadPending:USER-A:VEH-ADMIN-1:imgCorte1';
        const stored=h.stores.get('adminLocalState').values.get(key).operation;
        assert.equal(Object.prototype.hasOwnProperty.call(stored,'SessionToken'),false);
        assert.equal(Object.prototype.hasOwnProperty.call(stored,'credential'),false);
    });
    await testAsync('adminImageUploadPending conserva el snapshot tras recrear el módulo (recarga)', async () => {
        const h=createIndexedDBHarness(),firstApi=await freshOffline(h,'admin-image-before-reload');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-RELOAD',fieldName:'imgCorte2',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        assert.equal((await firstApi.saveAdminImageUploadPendingOperation(operation)).saved,true);
        const reloadedApi=await freshOffline(h,'admin-image-after-reload');
        const restored=await reloadedApi.getAdminImageUploadPendingOperation('VEH-ADMIN-RELOAD','imgCorte2','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation.id,operation.id);
        assert.equal(restored.operation.ownerId,'USER-A');
        assert.equal(restored.operation.fileData,operation.fileData);
        assert.equal((await reloadedApi.getAdminImageUploadPendingOperation('VEH-ADMIN-RELOAD','imgCorte2','USER-B')).operation,null);
    });
    await testAsync('adminImageUploadPending aísla el mismo vehículo y campo entre propietarios', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-owner-isolation');
        const make=(ownerId,id)=>({id,ownerId,vehicleId:'VEH-ADMIN-2',fieldName:'imgCorte2',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100});
        assert.equal((await api.saveAdminImageUploadPendingOperation(make('USER-A','1234567890abcdef12345678'))).saved,true);
        assert.equal((await api.saveAdminImageUploadPendingOperation(make('USER-B','abcdef123456789012345678'))).saved,true);
        assert.equal((await api.getAdminImageUploadPendingOperation('VEH-ADMIN-2','imgCorte2','USER-A')).operation.ownerId,'USER-A');
        assert.equal((await api.getAdminImageUploadPendingOperation('VEH-ADMIN-2','imgCorte2','USER-B')).operation.ownerId,'USER-B');
    });
    await testAsync('adminImageUploadPending conserva el intento original ante un opId conflictivo del mismo propietario', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-conflict');
        const base={ownerId:'USER-A',vehicleId:'VEH-ADMIN-3',fieldName:'imgCorte3',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        assert.equal((await api.saveAdminImageUploadPendingOperation({...base,id:'1234567890abcdef12345678'})).saved,true);
        const conflict=await api.saveAdminImageUploadPendingOperation({...base,id:'abcdef123456789012345678',fileData:'data:image/png;base64,Qg=='});
        assert.equal(conflict.saved,false);
        assert.equal(conflict.conflict,true);
        const current=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-3','imgCorte3','USER-A');
        assert.equal(current.operation.id,'1234567890abcdef12345678');
        assert.equal(current.operation.fileData,'data:image/png;base64,AA==');
    });
    await testAsync('adminImageUploadPending elimina solo el opId exacto de su propietario', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-owner-remove');
        const make=(ownerId,id)=>({id,ownerId,vehicleId:'VEH-ADMIN-4',fieldName:'imgApertura',
            fileData:'data:image/png;base64,AA==',filename:'apertura.png',mimeType:'image/png',createdAt:100});
        const idA='1234567890abcdef12345678',idB='abcdef123456789012345678';
        await api.saveAdminImageUploadPendingOperation(make('USER-A',idA));
        await api.saveAdminImageUploadPendingOperation(make('USER-B',idB));
        assert.equal(await api.removeAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura',idA,'USER-B'),false);
        assert.equal(await api.removeAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura','wrong-op','USER-A'),false);
        assert.equal((await api.getAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura','USER-A')).operation.id,idA);
        assert.equal(await api.removeAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura',idA,'USER-A'),true);
        assert.equal((await api.getAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura','USER-A')).operation,null);
        assert.equal((await api.getAdminImageUploadPendingOperation('VEH-ADMIN-4','imgApertura','USER-B')).operation.id,idB);
    });
    await testAsync('adminImageUploadPending no confirma una escritura cuya transacción se aborta', async () => {
        const h=createIndexedDBHarness({transactions:['abort']}),api=await freshOffline(h,'admin-image-aborted-write');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-5',fieldName:'imgCorte1',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        const result=await api.saveAdminImageUploadPendingOperation(operation);
        assert.equal(result.saved,false);
        assert.equal(result.error,true);
    });

    await testAsync('adminImageUploadPending no confirma la escritura cuando IndexedDB agota la cuota', async () => {
        const h=createIndexedDBHarness({transactions:['quota']}),api=await freshOffline(h,'admin-image-quota-failure');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-9',fieldName:'imgCorte1',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        const result=await api.saveAdminImageUploadPendingOperation(operation);
        assert.equal(result.saved,false,'una escritura sin cuota disponible no debe confirmarse');
        assert.equal(result.error,true,'el fallo de almacenamiento debe comunicarse explícitamente');
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-9','imgCorte1','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation,null,'no debe quedar un snapshot parcial tras el fallo de cuota');
    });
    await testAsync('adminImageUploadPending acepta escrituras simultáneas idempotentes del mismo snapshot', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-concurrent-idempotent');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-6',fieldName:'imgCorte1',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        const results=await Promise.all([
            api.saveAdminImageUploadPendingOperation(operation),
            api.saveAdminImageUploadPendingOperation({...operation})
        ]);
        assert.equal(results.length,2);
        assert.ok(results.every(result=>result.saved===true),'ambos reintentos idénticos deben resolverse como guardados');
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-6','imgCorte1','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation.id,operation.id);
        assert.equal(restored.operation.fileData,operation.fileData);
    });

    await testAsync('adminImageUploadPending serializa escrituras simultáneas conflictivas y conserva la primera', async () => {
        const h=createIndexedDBHarness(),api=await freshOffline(h,'admin-image-concurrent-conflict');
        const base={ownerId:'USER-A',vehicleId:'VEH-ADMIN-7',fieldName:'imgCorte2',filename:'corte.png',mimeType:'image/png',createdAt:100};
        const results=await Promise.all([
            api.saveAdminImageUploadPendingOperation({...base,id:'1234567890abcdef12345678',fileData:'data:image/png;base64,AA=='}),
            api.saveAdminImageUploadPendingOperation({...base,id:'abcdef123456789012345678',fileData:'data:image/png;base64,Qg=='})
        ]);
        assert.equal(results.filter(result=>result.saved===true).length,1);
        assert.equal(results.filter(result=>result.conflict===true).length,1);
        assert.equal(h.maxActiveTransactions,1,'las transacciones con almacén compartido deben ejecutarse de forma serial');
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-7','imgCorte2','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation.id,'1234567890abcdef12345678');
        assert.equal(restored.operation.fileData,'data:image/png;base64,AA==');
    });


    await testAsync('adminImageUploadPending conserva el snapshot cuando aborta la eliminación confirmada', async () => {
        const h=createIndexedDBHarness({transactions:['complete','abort']}),api=await freshOffline(h,'admin-image-aborted-delete');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-8',fieldName:'imgCorte3',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        assert.equal((await api.saveAdminImageUploadPendingOperation(operation)).saved,true);
        assert.equal(await api.removeAdminImageUploadPendingOperation('VEH-ADMIN-8','imgCorte3',operation.id,'USER-A'),null,
            'un abort debe comunicarse como resultado incierto, no como eliminación confirmada');
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-8','imgCorte3','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation.id,operation.id);
        assert.equal(restored.operation.fileData,operation.fileData);
    });

    await testAsync('adminImageUploadPending informa lectura no disponible y conserva el snapshot original', async () => {
        const h=createIndexedDBHarness({transactions:['complete','get-error','complete']}),api=await freshOffline(h,'admin-image-read-failure');
        const operation={id:'1234567890abcdef12345678',ownerId:'USER-A',vehicleId:'VEH-ADMIN-READ-ERROR',fieldName:'imgCorte1',
            fileData:'data:image/png;base64,AA==',filename:'corte.png',mimeType:'image/png',createdAt:100};
        assert.equal((await api.saveAdminImageUploadPendingOperation(operation)).saved,true);
        const failedRead=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-READ-ERROR','imgCorte1','USER-A');
        assert.deepEqual(failedRead,{available:false,operation:null},'un fallo de request.get no debe confundirse con una lectura vacía');
        const restored=await api.getAdminImageUploadPendingOperation('VEH-ADMIN-READ-ERROR','imgCorte1','USER-A');
        assert.equal(restored.available,true);
        assert.equal(restored.operation.id,operation.id,'el snapshot debe seguir disponible después del fallo de lectura');
        assert.equal(restored.operation.fileData,operation.fileData,'el fallo no debe alterar la Data URL persistida');
    });


    const cutOperationBase = {
        id: 'OP-1731330000000-0123456789ABCDEF0123456789ABCDEF',
        ownerId: 'USER-CUT-A', operationType: 'addOrUpdateCut', operationHash: 'a'.repeat(64),
        stage: 2, vehicleId: null,
        requestData: { vehicleId: null, vehicleData: { marca: 'Toyota', modelo: 'Hilux' }, cutData: { tipoCorte1: 'Ignición' }, silent: false },
        status: 'processing', formData: { tipoCorte1: 'Ignición' }, files: { imagenVehiculo: 'data:image/png;base64,AA==' }
    };
    await testAsync('AddCutOperationPending persiste y verifica snapshot durable para vehículo nuevo', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-durable-new');
        const saved = await api.saveAddCutOperationPendingOperation({ ...cutOperationBase, SessionToken: 'must-not-persist', nested: { password: 'secret', keep: true } });
        assert.equal(saved.saved, true);
        const read = await api.getAddCutOperationPendingOperation('USER-CUT-A');
        assert.equal(read.available, true);
        assert.equal(read.operation.id, cutOperationBase.id);
        assert.equal(read.operation.vehicleId, null);
        assert.equal(read.operation.operationHash, cutOperationBase.operationHash);
        assert.equal(read.operation.nested.keep, true);
        assert.equal(JSON.stringify(read.operation).includes('must-not-persist'), false);
        assert.equal(JSON.stringify(read.operation).includes('secret'), false);
    });
    await testAsync('AddCutOperationPending aísla snapshots por propietario', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-owner-isolation');
        const a = { ...cutOperationBase, ownerId: 'USER-A' }, b = { ...cutOperationBase, ownerId: 'USER-B', id: 'OP-1731330000001-0123456789ABCDEF0123456789ABCDEF', operationHash: 'b'.repeat(64) };
        assert.equal((await api.saveAddCutOperationPendingOperation(a)).saved, true);
        assert.equal((await api.saveAddCutOperationPendingOperation(b)).saved, true);
        assert.equal((await api.getAddCutOperationPendingOperation('USER-A')).operation.id, a.id);
        assert.equal((await api.getAddCutOperationPendingOperation('USER-B')).operation.id, b.id);
    });
    await testAsync('AddCutOperationPending rechaza otro opId o huella sin sobrescribir el snapshot original', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-conflict');
        assert.equal((await api.saveAddCutOperationPendingOperation(cutOperationBase)).saved, true);
        const conflict = await api.saveAddCutOperationPendingOperation({ ...cutOperationBase, id: 'OP-1731330000002-0123456789ABCDEF0123456789ABCDEF', operationHash: 'c'.repeat(64) });
        assert.equal(conflict.saved, false); assert.equal(conflict.conflict, true);
        const mismatch = await api.saveAddCutOperationPendingOperation({ ...cutOperationBase, operationHash: 'd'.repeat(64) });
        assert.equal(mismatch.saved, false); assert.equal(mismatch.conflict, true);
        assert.equal((await api.getAddCutOperationPendingOperation('USER-CUT-A')).operation.id, cutOperationBase.id);
    });
    await testAsync('AddCutOperationPending rechaza snapshot corrupto sin reutilizarlo', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-corrupt');
        await api.initDB();
        const key = 'addCutOperation:' + encodeURIComponent('USER-CUT-A');
        h.stores.get('adminLocalState').values.set(key, { key, operation: { ...cutOperationBase, status: 'completed', operationHash: 'invalid' } });
        const read = await api.getAddCutOperationPendingOperation('USER-CUT-A');
        assert.equal(read.available, false); assert.equal(read.invalid, true); assert.equal(read.operation, null);
    });
    await testAsync('AddCutOperationPending no confirma cuota agotada ni transacción abortada', async () => {
        const quota = await freshOffline(createIndexedDBHarness({ transactions: ['quota'] }), 'add-cut-quota');
        const quotaResult = await quota.saveAddCutOperationPendingOperation(cutOperationBase);
        assert.equal(quotaResult.saved, false);
        const abort = await freshOffline(createIndexedDBHarness({ transactions: ['abort'] }), 'add-cut-abort');
        const abortResult = await abort.saveAddCutOperationPendingOperation(cutOperationBase);
        assert.equal(abortResult.saved, false);
    });
    await testAsync('AddCutOperationPending solo elimina el opId y huella exactos y conserva snapshot si aborta', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-remove-exact');
        assert.equal((await api.saveAddCutOperationPendingOperation(cutOperationBase)).saved, true);
        assert.equal((await api.removeAddCutOperationPendingOperation('USER-CUT-A', cutOperationBase.id, 'f'.repeat(64))).removed, false);
        assert.equal((await api.getAddCutOperationPendingOperation('USER-CUT-A')).operation.id, cutOperationBase.id);
        const abortApi = await freshOffline(createIndexedDBHarness({ transactions: ['complete', 'abort'] }), 'add-cut-remove-abort');
        assert.equal((await abortApi.saveAddCutOperationPendingOperation(cutOperationBase)).saved, true);
        const uncertain = await abortApi.removeAddCutOperationPendingOperation('USER-CUT-A', cutOperationBase.id, cutOperationBase.operationHash);
        assert.equal(uncertain.removed, false);
        assert.equal((await abortApi.getAddCutOperationPendingOperation('USER-CUT-A')).operation.id, cutOperationBase.id);
    });
    await testAsync('AddCutOperationPending elimina el snapshot solo tras verificar el borrado', async () => {
        const api = await freshOffline(createIndexedDBHarness(), 'add-cut-remove-verified');
        assert.equal((await api.saveAddCutOperationPendingOperation(cutOperationBase)).saved, true);
        assert.equal((await api.removeAddCutOperationPendingOperation('USER-CUT-A', cutOperationBase.id, cutOperationBase.operationHash)).removed, true);
        const read = await api.getAddCutOperationPendingOperation('USER-CUT-A');
        assert.equal(read.available, true); assert.equal(read.operation, null);
    });
    await testAsync('AddCutOperationPending no permite degradar un snapshot completed', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-completed-terminal');
        const completed = { ...cutOperationBase, status: 'completed' };
        assert.equal((await api.saveAddCutOperationPendingOperation(completed)).saved, true);
        const downgrade = await api.saveAddCutOperationPendingOperation({ ...completed, status: 'failed' });
        assert.equal(downgrade.saved, false);
        assert.equal(downgrade.conflict, true);
        assert.equal((await api.getAddCutOperationPendingOperation(completed.ownerId)).operation.status, 'completed');
    });
    await testAsync('AddCutOperationPending falla cerrado cuando IndexedDB está bloqueado/no disponible', async () => {
        const api = await freshOffline(createIndexedDBHarness({ openError: true }), 'add-cut-storage-blocked');
        const read = await api.getAddCutOperationPendingOperation(cutOperationBase.ownerId);
        assert.equal(read.available, false);
        const saved = await api.saveAddCutOperationPendingOperation(cutOperationBase);
        assert.equal(saved.saved, false);
    });
    await testAsync('AddCutOperationPending serializa reintentos concurrentes del mismo snapshot', async () => {
        const h = createIndexedDBHarness(), api = await freshOffline(h, 'add-cut-concurrent');
        const results = await Promise.all([
            api.saveAddCutOperationPendingOperation(cutOperationBase),
            api.saveAddCutOperationPendingOperation({ ...cutOperationBase })
        ]);
        assert.ok(results.every(result => result.saved === true));
        assert.equal(h.maxActiveTransactions, 1);
        assert.equal((await api.getAddCutOperationPendingOperation('USER-CUT-A')).operation.id, cutOperationBase.id);
    });

    console.log(`\\nIndexedDB transaction tests: ${passed}/44 PASS`);
}

runIndexedDBTransactionTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
