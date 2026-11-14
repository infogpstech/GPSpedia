import assert from "node:assert/strict";
import { createObjectUrlRegistry } from "../../imageObjectUrlCache.js";

function createUrlApi() {
    let nextId = 0;
    const created = [];
    const revoked = [];
    return {
        created,
        revoked,
        createObjectURL(blob) {
            const url = `blob:test/${++nextId}`;
            created.push({ url, blob });
            return url;
        },
        revokeObjectURL(url) {
            revoked.push(url);
        }
    };
}

function createObserverHarness() {
    let callback;
    return {
        MutationObserverCtor: class {
            constructor(fn) { callback = fn; }
            observe() {}
            disconnect() {}
        },
        remove(node) {
            callback([{ removedNodes: [node] }]);
        }
    };
}

function test(name, fn) {
    fn();
    console.log(`PASS ${name}`);
}

const urlApi = createUrlApi();
const observerHarness = createObserverHarness();
const registry = createObjectUrlRegistry({
    urlApi,
    MutationObserverCtor: observerHarness.MutationObserverCtor,
    observationRoot: {}
});

test("comparte una URL entre elementos y no la revoca mientras exista un consumidor", () => {
    const first = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const second = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const tokenA = registry.begin(first);
    const tokenB = registry.begin(second);
    const urlA = registry.attach("same-key", { id: "shared", size: 1024 }, first, tokenA);
    const urlB = registry.attach("same-key", { id: "shared" }, second, tokenB);
    assert.equal(urlA, urlB);
    assert.equal(urlApi.created.length, 1);
    registry.release(first);
    assert.deepEqual(urlApi.revoked, []);
    registry.release(second);
    assert.deepEqual(urlApi.revoked, [urlA]);
});

test("reemplazar la imagen libera la referencia anterior", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const revokedBefore = urlApi.revoked.length;
    const firstToken = registry.begin(img);
    const firstUrl = registry.attach("first", { size: 1024 }, img, firstToken);
    const secondToken = registry.begin(img);
    assert.equal(urlApi.revoked.length, revokedBefore + 1);
    assert.equal(urlApi.revoked.at(-1), firstUrl);
    const secondUrl = registry.attach("second", { size: 1024 }, img, secondToken);
    assert.notEqual(firstUrl, secondUrl);
    assert.equal(img.src, secondUrl);
    registry.release(img);
    assert.equal(urlApi.revoked.at(-1), secondUrl);
});

test("ignora respuestas asíncronas obsoletas", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const staleToken = registry.begin(img);
    const currentToken = registry.begin(img);
    assert.equal(registry.attach("stale", { size: 1024 }, img, staleToken), null);
    assert.ok(registry.attach("current", { size: 1024 }, img, currentToken));
    assert.equal(urlApi.created.some(item => item.url === img.src), true);
    registry.release(img);
});

test("revoca URL al retirar del DOM el último elemento consumidor", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const token = registry.begin(img);
    const url = registry.attach("removed", { size: 1024 }, img, token);
    img.isConnected = false;
    observerHarness.remove(img);
    assert.equal(urlApi.revoked.at(-1), url);
});

test("no revoca una URL compartida cuando solo se retira uno de sus consumidores", () => {
    const first = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const second = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const tokenA = registry.begin(first);
    const tokenB = registry.begin(second);
    const url = registry.attach("shared-removal", { size: 1024 }, first, tokenA);
    registry.attach("shared-removal", { size: 1024 }, second, tokenB);
    first.isConnected = false;
    observerHarness.remove(first);
    assert.notEqual(urlApi.revoked.at(-1), url);
    registry.release(second);
    assert.equal(urlApi.revoked.at(-1), url);
});

test("dispose revoca todas las URL registradas", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const token = registry.begin(img);
    const url = registry.attach("dispose", { size: 1024 }, img, token);
    registry.dispose();
    assert.equal(urlApi.revoked.at(-1), url);
});

test("no crea URL para imágenes que todavía no están conectadas al DOM", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: false, src: "" };
    const token = registry.begin(img);
    const createdBefore = urlApi.created.length;
    assert.equal(registry.attach("detached", {}, img, token), null);
    assert.equal(urlApi.created.length, createdBefore);
});


test("rechaza una miniatura que excede el presupuesto sin crear ObjectURL", () => {
 const a=createUrlApi(), r=createObjectUrlRegistry({urlApi:a,maxBytes:10}), img={nodeType:1,tagName:"IMG",isConnected:true,src:""}, token=r.begin(img);
 assert.equal(r.attach("big",{size:11},img,token),null); assert.equal(a.created.length,0);
 assert.deepEqual(r.getStats(),{entries:0,retainedBytes:0,maxBytes:10});
});
test("comparte una miniatura sin contabilizar dos veces sus bytes", () => {
 const a=createUrlApi(), r=createObjectUrlRegistry({urlApi:a,maxBytes:10}), x={nodeType:1,tagName:"IMG",isConnected:true,src:""}, y={nodeType:1,tagName:"IMG",isConnected:true,src:""}, tx=r.begin(x), ty=r.begin(y);
 const u=r.attach("shared",{size:8},x,tx); assert.equal(r.attach("shared",{size:8},y,ty),u);
 assert.equal(r.getStats().retainedBytes,8); r.release(x); assert.equal(r.getStats().retainedBytes,8); r.release(y); assert.equal(r.getStats().retainedBytes,0);
});
test("libera presupuesto al revocar el último consumidor", () => {
 const a=createUrlApi(), r=createObjectUrlRegistry({urlApi:a,maxBytes:10}), x={nodeType:1,tagName:"IMG",isConnected:true,src:""}, y={nodeType:1,tagName:"IMG",isConnected:true,src:""}, tx=r.begin(x), ty=r.begin(y);
 assert.ok(r.attach("x",{size:8},x,tx)); assert.equal(r.attach("y",{size:8},y,ty),null); r.release(x);
 assert.ok(r.attach("y",{size:8},y,ty)); assert.equal(r.getStats().retainedBytes,8); r.dispose(); assert.equal(r.getStats().retainedBytes,0);
});

console.log("\nImage ObjectURL lifecycle tests: 10/10 PASS");
