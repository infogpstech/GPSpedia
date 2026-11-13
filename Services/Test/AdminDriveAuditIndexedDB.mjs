import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const offlineSource = readFileSync(new URL('../../offline.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../../ui.js', import.meta.url), 'utf8');

class FakeRequest {
    constructor() { this.result = undefined; this.error = null; this.onsuccess = null; this.onerror = null; }
}
class FakeTransaction {
    constructor(database, mode, previous, release) {
        this.database = database;
        this.mode = mode;
        this.ready = previous;
        this.release = release;
        this.queue = previous;
        this.pending = 0;
        this.map = null;
        this.aborted = false;
        this.completed = false;
        this.error = null;
    }
    objectStore() {
        const tx = this;
        return {
            get(key) { return tx.request(map => map.get(key)); },
            put(entry) {
                return tx.request(map => {
                    if (tx.database.failPutKey && tx.database.failPutKey === entry.key) throw new Error('Injected put failure');
                    map.set(entry.key, JSON.parse(JSON.stringify(entry)));
                    return entry.key;
                });
            },
            delete(key) { return tx.request(map => { map.delete(key); return undefined; }); },
            getAll() { return tx.request(map => Array.from(map.values()).map(value => JSON.parse(JSON.stringify(value)))); }
        };
    }
    request(operation) {
        const request = new FakeRequest();
        this.pending++;
        this.queue = this.queue.then(async () => {
            if (this.aborted) { this.pending--; this.scheduleCompletion(); return; }
            try {
                if (!this.map) {
                    await this.ready;
                    this.map = this.mode === 'readwrite' ? new Map(this.database.data) : this.database.data;
                }
                request.result = operation(this.map);
                if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
            } catch (error) {
                request.error = error;
                this.error = error;
                if (typeof request.onerror === 'function') request.onerror({ target: request });
                this.abort(error);
            } finally {
                this.pending--;
                this.scheduleCompletion();
            }
        });
        return request;
    }
    scheduleCompletion() {
        const queued = this.queue;
        queued.then(() => {
            if (this.pending !== 0 || this.aborted || this.completed) return;
            this.completed = true;
            if (this.mode === 'readwrite' && this.map) this.database.data = this.map;
            this.release();
            queueMicrotask(() => { if (typeof this.oncomplete === 'function') this.oncomplete({ target: this }); });
        });
    }
    abort(error) {
        if (this.aborted || this.completed) return;
        this.aborted = true;
        this.error = error || new Error('Transaction aborted');
        this.release();
        queueMicrotask(() => { if (typeof this.onabort === 'function') this.onabort({ target: this }); });
    }
}
class FakeDatabase {
    constructor() {
        this.data = new Map();
        this.stores = new Set();
        this.tail = Promise.resolve();
        this.failPutKey = '';
        this.objectStoreNames = { contains: name => this.stores.has(name) };
    }
    createObjectStore(name) { this.stores.add(name); return {}; }
    transaction(_names, mode) {
        const previous = this.tail;
        let release;
        const hold = new Promise(resolve => { release = resolve; });
        this.tail = previous.then(() => hold);
        return new FakeTransaction(this, mode, previous, release);
    }
    close() {}
}
class FakeLocalStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}
function createHarness() {
    const database = new FakeDatabase();
    const localStorage = new FakeLocalStorage();
    const indexedDB = {
        open() {
            const request = new FakeRequest();
            queueMicrotask(() => {
                request.result = database;
                if (!database.stores.size && typeof request.onupgradeneeded === 'function') {
                    request.onupgradeneeded({ target: { result: database } });
                }
                if (typeof request.onsuccess === 'function') request.onsuccess({ target: { result: database } });
            });
            return request;
        }
    };
    let source = offlineSource
        .replace(/^\s*import[\s\S]*?;\s*/gm, '')
        .replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, '')
        .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/g, '');
    const api = new Function(
        'indexedDB', 'localStorage', 'thumbnailCompressionQueue',
        'getAdminImageUploadPendingKey', 'getLegacyAdminImageUploadPendingKey',
        'getQuarantinedAdminImageUploadPendingKey', 'createAdminImageUploadPendingSnapshot',
        'isAdminImageUploadPendingOwnedBy',
        source + '\nreturn { DB_VERSION, saveDriveAuditState, getDriveAuditState, clearDriveAuditState, hasPendingDriveAuditClear };'
    )(
        indexedDB, localStorage, {},
        () => 'admin-upload-pending', () => 'admin-upload-legacy',
        () => 'admin-upload-quarantine', () => ({}), () => false
    );
    return { ...api, database, localStorage };
}
const A = 'fileid000000000000000001';
const B = 'fileid000000000000000002';
const C = 'fileid000000000000000003';
const D = 'fileid000000000000000004';
function state(auditId, revision, batchIndex, batchFiles, extra = {}) {
    return {
        auditId, serverAuditId: auditId, revision, batchIndex, batchFiles,
        files: batchFiles, cursor: null, complete: false, status: 'partial',
        totalDiscovered: batchFiles.length, totalAnalyzed: batchFiles.length,
        foldersVisited: 1, pendingFolderCount: 1, batches: batchIndex === null ? 0 : batchIndex + 1,
        createdAt: extra.createdAt || Date.now(),
        inventoryConfirmedFileIds: [], ...extra
    };
}
let passed = 0;
async function check(name, fn) {
    await fn();
    passed++;
    console.log('PASS ' + name);
}
await check('Guarda cada lote como página estable y metadatos sin duplicar el arreglo completo', async () => {
    const h = createHarness(), owner = 'user-a';
    const first = await h.saveDriveAuditState(state('AUDIT-1', 0, 0, [{ fileId: A, fileName: 'A' }]), owner);
    const second = await h.saveDriveAuditState(state('AUDIT-1', first.revision, 1, [{ fileId: B, fileName: 'B' }], { totalAnalyzed: 2 }), owner);
    assert.equal(first.pageCount, 1);
    assert.equal(second.pageCount, 2);
    const meta = Array.from(h.database.data.values()).find(entry => entry.key && entry.key.startsWith('driveAudit:meta:'));
    assert.ok(meta);
    assert.equal(Object.prototype.hasOwnProperty.call(meta, 'files'), false);
    assert.equal(Array.from(h.database.data.keys()).filter(key => key.startsWith('driveAudit:page:')).length, 2);
    const restored = await h.getDriveAuditState(owner);
    assert.deepEqual(restored.files.map(file => file.fileId), [A, B]);
    assert.equal(restored.revision, 2);
});
await check('Recupera estado legado de DB_VERSION 4 sin borrar datos antes de confirmar la migración', async () => {
    const h = createHarness(), owner = 'legacy-user';
    const legacyKey = 'driveAudit:user:' + encodeURIComponent(owner);
    h.database.data.set(legacyKey, {
        key: legacyKey, ownerId: owner, files: [{ fileId: A }, { fileId: B }],
        cursor: { referenceCacheId: 'AUDIT-LEGACY', stack: [{ folderId: 'folder-00000000000000001' }] },
        inventoryConfirmedFileIds: [A], updatedAt: 1700000000000, batches: 2,
        totalAnalyzed: 2, totalDiscovered: 2, status: 'partial'
    });
    assert.equal(h.DB_VERSION, 4);
    const restored = await h.getDriveAuditState(owner);
    assert.deepEqual(restored.files.map(file => file.fileId), [A, B]);
    assert.equal(restored.auditId, 'AUDIT-LEGACY');
    assert.equal(restored.serverAuditId, 'AUDIT-LEGACY');
    assert.deepEqual(restored.inventoryConfirmedFileIds, [A]);
    assert.equal(h.database.data.has(legacyKey), false);
    const meta = Array.from(h.database.data.values()).find(entry => entry.key && entry.key.startsWith('driveAudit:meta:'));
    assert.equal(Object.prototype.hasOwnProperty.call(meta, 'files'), false);
});
await check('Un fallo durante la escritura atómica conserva intacto el registro legado', async () => {
    const h = createHarness(), owner = 'legacy-failure';
    const legacyKey = 'driveAudit:user:' + encodeURIComponent(owner);
    h.database.data.set(legacyKey, {
        key: legacyKey, ownerId: owner, files: [{ fileId: A }],
        cursor: { referenceCacheId: 'AUDIT-FAIL', stack: [] }, updatedAt: 1700000000001
    });
    h.database.failPutKey = 'driveAudit:meta:' + encodeURIComponent(owner) + ':AUDIT-FAIL';
    await assert.rejects(h.getDriveAuditState(owner), /Injected put failure/);
    assert.equal(h.database.data.has(legacyKey), true);
    assert.equal(Array.from(h.database.data.keys()).some(key => key.startsWith('driveAudit:page:')), false);
    assert.equal(Array.from(h.database.data.keys()).some(key => key.startsWith('driveAudit:latest:')), false);
});
await check('Dos pestañas con la misma revisión no pueden sobrescribir el progreso', async () => {
    const h = createHarness(), owner = 'shared-user';
    const first = await h.saveDriveAuditState(state('AUDIT-SHARED', 0, 0, [{ fileId: A }]), owner);
    const attempts = await Promise.allSettled([
        h.saveDriveAuditState(state('AUDIT-SHARED', first.revision, 1, [{ fileId: B }]), owner),
        h.saveDriveAuditState(state('AUDIT-SHARED', first.revision, 1, [{ fileId: C }]), owner)
    ]);
    assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(attempts.filter(item => item.status === 'rejected').length, 1);
    const restored = await h.getDriveAuditState(owner);
    assert.equal(restored.revision, 2);
    assert.equal(restored.files.length, 2);
    assert.ok([B, C].includes(restored.files[1].fileId));
});
await check('Auditorías distintas permanecen aisladas y el puntero respeta la fecha real de inicio', async () => {
    const h = createHarness();
    await h.saveDriveAuditState(state('AUDIT-TWO', 0, 0, [{ fileId: B }], { createdAt: 200 }), 'user-one');
    const first = await h.saveDriveAuditState(state('AUDIT-ONE', 0, 0, [{ fileId: A }], { createdAt: 100 }), 'user-one');
    await h.saveDriveAuditState(state('AUDIT-ONE', first.revision, 1, [{ fileId: C }], { createdAt: 100 }), 'user-one');
    await h.saveDriveAuditState(state('AUDIT-OTHER-USER', 0, 0, [{ fileId: D }]), 'user-two');
    assert.equal((await h.getDriveAuditState('user-one')).auditId, 'AUDIT-TWO');
    assert.deepEqual((await h.getDriveAuditState('user-one')).files.map(file => file.fileId), [B]);
    assert.deepEqual((await h.getDriveAuditState('user-one', 'AUDIT-ONE')).files.map(file => file.fileId), [A, C]);
    assert.deepEqual((await h.getDriveAuditState('user-two')).files.map(file => file.fileId), [D]);
});
await check('La limpieza elimina todas las páginas de una cuenta y conserva las de otra', async () => {
    const h = createHarness();
    await h.saveDriveAuditState(state('AUDIT-ONE', 0, 0, [{ fileId: A }]), 'user-one');
    await h.saveDriveAuditState(state('AUDIT-TWO', 0, 0, [{ fileId: B }]), 'user-two');
    assert.equal(await h.clearDriveAuditState('user-one'), true);
    assert.equal(await h.getDriveAuditState('user-one'), null);
    assert.deepEqual((await h.getDriveAuditState('user-two')).files.map(file => file.fileId), [B]);
    assert.equal(h.hasPendingDriveAuditClear('user-one'), false);
});
await check('Una página repetida se restaura sin duplicar IDs de archivo', async () => {
    const h = createHarness(), owner = 'duplicate-user';
    const first = await h.saveDriveAuditState(state('AUDIT-DUP', 0, 0, [{ fileId: A }]), owner);
    await h.saveDriveAuditState(state('AUDIT-DUP', first.revision, 1, [{ fileId: A }, { fileId: B }]), owner);
    const restored = await h.getDriveAuditState(owner);
    assert.deepEqual(restored.files.map(file => file.fileId), [A, B]);
    assert.equal(restored.uiDuplicateFileCount, 1);
});
await check('La interfaz escribe páginas nuevas y conserva revisión/identidad del auditId', async () => {
    assert.ok(uiSource.includes('batchIndex: pendingBatchIndex'));
    assert.ok(uiSource.includes('batchFiles: pendingBatchFiles'));
    assert.ok(uiSource.includes('revision: localStateRevision'));
    assert.ok(uiSource.includes('pendingBatchIndex = localPageCount'));
    assert.ok(uiSource.includes('auditId: auditId, files: unusedFiles'));
    assert.ok(uiSource.includes('localStateRevision = Math.max(0, Number(saved.revision) || localStateRevision)'));
});

await check('La escritura de página y metadatos es atómica ante un fallo intermedio', async () => {
    const h = createHarness(), owner = 'atomic-save';
    const metaKey = 'driveAudit:meta:' + encodeURIComponent(owner) + ':AUDIT-ATOMIC';
    h.database.failPutKey = metaKey;
    await assert.rejects(h.saveDriveAuditState(state('AUDIT-ATOMIC', 0, 0, [{ fileId: A }]), owner), /Injected put failure/);
    h.database.failPutKey = '';
    assert.equal(h.database.data.has(metaKey), false);
    assert.equal(Array.from(h.database.data.keys()).some(key => key.startsWith('driveAudit:page:' + encodeURIComponent(owner))), false);
    assert.equal(h.database.data.has('driveAudit:latest:' + encodeURIComponent(owner)), false);
});
await check('Un lote repetido idéntico es idempotente y no duplica páginas', async () => {
    const h = createHarness(), owner = 'retry-user';
    const first = await h.saveDriveAuditState(state('AUDIT-RETRY', 0, 0, [{ fileId: A }]), owner);
    const retry = await h.saveDriveAuditState(state('AUDIT-RETRY', first.revision, 0, [{ fileId: A }]), owner);
    assert.equal(retry.pageCount, 1);
    assert.equal(retry.revision, 2);
    assert.equal(Array.from(h.database.data.keys()).filter(key => key.startsWith('driveAudit:page:' + encodeURIComponent(owner))).length, 1);
    assert.deepEqual((await h.getDriveAuditState(owner)).files.map(file => file.fileId), [A]);
});
await check('Una página ausente invalida la reanudación sin marcar el escaneo como completo', async () => {
    const h = createHarness(), owner = 'missing-page';
    const first = await h.saveDriveAuditState(state('AUDIT-MISSING', 0, 0, [{ fileId: A }]), owner);
    const second = await h.saveDriveAuditState(state('AUDIT-MISSING', first.revision, 1, [{ fileId: B }]), owner);
    h.database.data.delete('driveAudit:page:' + encodeURIComponent(owner) + ':AUDIT-MISSING:1');
    const restored = await h.getDriveAuditState(owner);
    assert.equal(restored.resumeUnavailable, true);
    assert.equal(restored.cursor, null);
    assert.equal(restored.complete, false);
    assert.deepEqual(restored.files.map(file => file.fileId), [A]);
    assert.equal(second.pageCount, 2);
});

console.log('AdminDriveAuditIndexedDB: ' + passed + '/' + passed + ' PASS');
