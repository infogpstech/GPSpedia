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
    const urlA = registry.attach("same-key", { id: "shared" }, first, tokenA);
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
    const firstUrl = registry.attach("first", {}, img, firstToken);
    const secondToken = registry.begin(img);
    assert.equal(urlApi.revoked.length, revokedBefore + 1);
    assert.equal(urlApi.revoked.at(-1), firstUrl);
    const secondUrl = registry.attach("second", {}, img, secondToken);
    assert.notEqual(firstUrl, secondUrl);
    assert.equal(img.src, secondUrl);
    registry.release(img);
    assert.equal(urlApi.revoked.at(-1), secondUrl);
});

test("ignora respuestas asíncronas obsoletas", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const staleToken = registry.begin(img);
    const currentToken = registry.begin(img);
    assert.equal(registry.attach("stale", {}, img, staleToken), null);
    assert.ok(registry.attach("current", {}, img, currentToken));
    assert.equal(urlApi.created.some(item => item.url === img.src), true);
    registry.release(img);
});

test("revoca URL al retirar del DOM el último elemento consumidor", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const token = registry.begin(img);
    const url = registry.attach("removed", {}, img, token);
    img.isConnected = false;
    observerHarness.remove(img);
    assert.equal(urlApi.revoked.at(-1), url);
});

test("no revoca una URL compartida cuando solo se retira uno de sus consumidores", () => {
    const first = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const second = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const tokenA = registry.begin(first);
    const tokenB = registry.begin(second);
    const url = registry.attach("shared-removal", {}, first, tokenA);
    registry.attach("shared-removal", {}, second, tokenB);
    first.isConnected = false;
    observerHarness.remove(first);
    assert.notEqual(urlApi.revoked.at(-1), url);
    registry.release(second);
    assert.equal(urlApi.revoked.at(-1), url);
});

test("dispose revoca todas las URL registradas", () => {
    const img = { nodeType: 1, tagName: "IMG", isConnected: true, src: "" };
    const token = registry.begin(img);
    const url = registry.attach("dispose", {}, img, token);
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

console.log("\nImage ObjectURL lifecycle tests: 7/7 PASS");
