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
    const stores = new Map();
    const connections = [];
    let openCount = 0;
    let transactionCount = 0;
    const database = {
        objectStoreNames: { contains: name => stores.has(name) },
        createObjectStore(name, config = {}) { stores.set(name, { values: new Map(), keyPath: config.keyPath || null }); return {}; },
        close() { this.closed = true; },
        transaction(names, mode) {
            transactionCount += 1;
            const behavior = options.transactions && options.transactions[transactionCount - 1] || 'complete';
            let aborted = false, finished = false, pendingRequests = 0, completionScheduled = false;
            const tx = {
                error: behavior === 'quota' ? new DOMException('Quota exceeded', 'QuotaExceededError') : null,
                objectStore(name) {
                    const record = stores.get(name);
                    const enqueue = (request, operation, defer = false) => {
                        pendingRequests += 1;
                        const execute = () => {
                            if (aborted || finished) { pendingRequests -= 1; return; }
                            try { operation(); }
                            finally { pendingRequests -= 1; scheduleCompletion(); }
                        };
                        if (defer && options.deferDeletes) {
                            queueMicrotask(() => { if (options.onDeleteQueued) options.onDeleteQueued(execute); else execute(); });
                        } else queueMicrotask(execute);
                        return request;
                    };
                    return {
                        put(value, key) {
                            const request = {};
                            return enqueue(request, () => {
                                if (behavior === 'quota' || (name === 'thumbnails' && options.quotaFailures > 0)) {
                                    if (options.quotaFailures > 0) options.quotaFailures -= 1;
                                    request.error = behavior === 'quota' ? tx.error : new DOMException('Quota exceeded', 'QuotaExceededError');
                                    tx.error = request.error;
                                    if (request.onerror) request.onerror();
                                    if (tx.onerror) tx.onerror();
                                    aborted = true;
                                    if (tx.onabort) tx.onabort();
                                    return;
                                }
                                const resolvedKey = key === undefined ? value[record.keyPath] : key;
                                record.values.set(resolvedKey, structuredClone(value));
                                request.result = resolvedKey;
                                if (request.onsuccess) request.onsuccess();
                                if (behavior === 'abort') queueMicrotask(() => {
                                    aborted = true;
                                    tx.error = new DOMException('Aborted', 'AbortError');
                                    if (tx.onabort) tx.onabort();
                                });
                            });
                        },
                        get(key) {
                            const request = {};
                            return enqueue(request, () => { request.result = record.values.get(key); if (request.onsuccess) request.onsuccess(); });
                        },
                        getAll() {
                            const request = {};
                            return enqueue(request, () => { request.result = [...record.values.values()]; if (request.onsuccess) request.onsuccess(); });
                        },
                        getAllKeys() {
                            const request = {};
                            return enqueue(request, () => { request.result = [...record.values.keys()]; if (request.onsuccess) request.onsuccess(); });
                        },
                        delete(key) {
                            const request = {};
                            return enqueue(request, () => { record.values.delete(key); request.result = undefined; if (request.onsuccess) request.onsuccess(); }, true);
                        }
                    };
                },
                abort() { aborted = true; if (tx.onabort) queueMicrotask(() => tx.onabort()); }
            };
            function scheduleCompletion() {
                if (pendingRequests || aborted || finished || completionScheduled) return;
                completionScheduled = true;
                queueMicrotask(() => {
                    completionScheduled = false;
                    if (pendingRequests || aborted || finished) return;
                    finished = true;
                    if (tx.oncomplete) tx.oncomplete();
                });
            }
            return tx;
        }
    };
    const indexedDB = {
        open() {
            openCount += 1;
            const request = {};
            connections.push(database);
            queueMicrotask(() => {
                if (options.blocked) { if (request.onblocked) request.onblocked(); return; }
                if (openCount === 1 && request.onupgradeneeded) request.onupgradeneeded({ target: { result: database } });
                request.result = database;
                if (request.onsuccess) request.onsuccess({ target: { result: database } });
            });
            return request;
        }
    };
    return { indexedDB, database, connections, stores, get openCount() { return openCount; } };
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
    await testAsync('miniaturas separadas por tamaño y liberación de ImageBitmap',async()=>{
        const harness=createIndexedDBHarness(),api=await freshOffline(harness,'thumbnail-sizes');
        const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
        let closed=0;const widths=[];
        globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['source'])});
        globalThis.createImageBitmap=async()=>({width:1600,height:800,close(){closed++;}});
        globalThis.document={createElement(){const canvas={width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){widths.push(this.width);cb(new Blob(['thumb'],{type:'image/png'}));}};return canvas;}};
        try{
            await api.compressAndStoreThumbnail('https://images.example/vehicle.png','drive-file-123',300);
            await api.compressAndStoreThumbnail('https://images.example/vehicle.png','drive-file-123',800);
            assert.ok(await api.getThumbnail('drive-file-123',300));assert.ok(await api.getThumbnail('drive-file-123',800));
            assert.deepEqual(widths,[300,800]);assert.equal(closed,2);
            assert.equal((await api.getThumbnail('drive-file-123',1600))??null,null);
        }finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
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
                store.values.set(key,{key,fileId:`lru-${i}`,width:300,blob:new Blob([`thumb-${i}`]),cachedAt:now-1000-i,lastAccessedAt:now-1000-i});
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
            store.values.set(key,{key,fileId:'pending-'+i,width:300,blob:new Blob(['thumb-'+i]),cachedAt:now-1000-i,lastAccessedAt:now-1000-i});
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
    console.log(`\nIndexedDB transaction tests: ${passed}/15 PASS`);
}

runIndexedDBTransactionTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
