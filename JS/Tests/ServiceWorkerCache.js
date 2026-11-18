import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8');
const cases = [];
const test = (name, run) => cases.push({ name, run });
test('App Shell incrementa versión e incluye la hoja de estilos corregida', async () => {
 assert.match(source, /gpsepedia-cache-v73/);
 assert.ok(source.includes("'./style.css'"));
});

const quota = () => Object.assign(new Error('Storage quota exceeded'), { name: 'QuotaExceededError' });

function makeResponse(body = 'network', status = 200, type = 'basic') {
 let bodyUsed = false;
 return {
  status, ok: status >= 200 && status < 300, type,
  async text() {
   if (bodyUsed) throw new TypeError('Response body is already used');
   bodyUsed = true;
   return body;
  },
  clone() {
   if (bodyUsed) throw new TypeError("Failed to execute 'clone' on 'Response': Response body is already used");
   return makeResponse(body, status, type);
  }
 };
}
function harness(options = {}) {
 const listeners = {}, assets = [], logs = [], cacheEntries = new Map(), fetched = [];
 let skip = 0;
 const cache = {
  async addAll(paths) {
   if (options.addAllError) throw options.addAllError;
   assets.push(...paths);
  },
  async add(path) {
   if (options.optionalError) throw options.optionalError;
   assets.push(path);
  },
  async match(request) {
   const key = typeof request === 'string' ? new URL(request, baseUrl).href : new URL(request.url, baseUrl).href;
   return cacheEntries.get(key) || null;
  },
  async put(request, response) {
   if (options.putError) throw options.putError;
   const key = typeof request === 'string' ? new URL(request, baseUrl).href : new URL(request.url, baseUrl).href;
   cacheEntries.set(key, response);
  },
  async keys() {
   return [...cacheEntries.keys()].map(url => ({ url, destination: 'image' }));
  },
  async delete(request) {
   const key = typeof request === 'string' ? new URL(request, baseUrl).href : new URL(request.url, baseUrl).href;
   return cacheEntries.delete(key);
  }
 };
 const origin = 'https://infogpstech.github.io';
 const baseUrl = origin + '/GPSpedia/';
 const cachesApi = {
  async open() { return cache; },
  async keys() { return ['gpsepedia-cache-v29', 'other-app-cache']; },
  async delete() { return true; },
  async match(request) {
   const key = typeof request === 'string' ? new URL(request, baseUrl).href : new URL(request.url, baseUrl).href;
   return cacheEntries.get(key) || null;
  }
 };
 const context = {
  self: {
   location: { origin, href: baseUrl },
   addEventListener: (name, fn) => { listeners[name] = fn; },
   skipWaiting: async () => { skip += 1; },
   clients: { claim: async () => {} }
  },
  caches: cachesApi,
  fetch: async request => {
   fetched.push(request);
   if (options.networkError) throw options.networkError;
   const value = options.responses && options.responses.length ? options.responses.shift() : makeResponse();
   return value;
  },
  URL, Promise, Boolean,
  console: {
   log() {},
   warn: (...args) => logs.push(['warn', ...args]),
   error: (...args) => logs.push(['error', ...args])
  }
 };
 vm.runInNewContext(source, context);
 return { listeners, assets, logs, fetched, cacheEntries, get skip() { return skip; } };
}
function event(request = { method: 'GET', mode: 'cors', destination: 'script', url: 'https://infogpstech.github.io/GPSpedia/JS/Frontend/main.js' }) {
 return {
  request, waits: [], response: null,
  waitUntil(promise) { this.waits.push(Promise.resolve(promise)); },
  respondWith(promise) { this.response = Promise.resolve(promise); }
 };
}

test('todos los recursos esenciales del precache existen en el repositorio', async () => {
 const match = source.match(/const CORE_ASSETS=(\[[^\]]*\]);/);
 assert.ok(match, 'CORE_ASSETS debe estar declarado');
 const assets = JSON.parse(match[1].replaceAll("'", '"'));
 const missing = assets.filter(asset => !fs.existsSync(new URL('../../' + asset.replace(/^\.\//, ''), import.meta.url)));
 assert.deepEqual(missing, [], 'el precache no debe apuntar a archivos inexistentes');
});
test('precache conserva el App Shell, las páginas auxiliares y el grafo JS', async () => {
 const h = harness(), e = event();
 h.listeners.install(e);
 await Promise.all(e.waits);
 for (const path of [
  './index.html', './HTML/add_cortes.html', './HTML/users.html',
  './JS/Frontend/main.js', './JS/Frontend/auth.js', './JS/Frontend/offline.js',
  './JS/Frontend/activityDashboard.js',
  './JS/Frontend/VinDifferentialEngine.js', './JS/Frontend/catalogRequest.js',
  './style.css', './button-system.css'
 ]) assert.ok(h.assets.includes(path), path);
 assert.match(source, /gpsepedia-cache-v73/);
 assert.ok(h.assets.includes('./Images/icon-v3-512x512.png'));
 assert.ok(h.assets.includes('./Images/Logo_TemaOscuro.png'));
 assert.equal(h.skip, 1);
});
test('cuota de recursos opcionales no impide instalar el App Shell', async () => {
 const h = harness({ optionalError: quota() }), e = event();
 h.listeners.install(e); await Promise.all(e.waits);
 assert.ok(h.assets.includes('./JS/Frontend/main.js'));
 assert.equal(h.skip, 1);
 assert.ok(h.logs.some(item => item[0] === 'warn'));
});
test('fallo de precarga esencial conserva el Service Worker anterior', async () => {
 const h = harness({ addAllError: quota() }), e = event();
 h.listeners.install(e);
 await assert.rejects(Promise.all(e.waits), /Storage quota exceeded/);
 assert.equal(h.skip, 0);
 assert.ok(h.logs.some(item => item[0] === 'error'));
});
test('navegación devuelve inmediatamente el documento cacheado y actualiza en segundo plano', async () => {
 const cached = makeResponse('cached page');
 const fresh = makeResponse('fresh page');
 const h = harness({ responses: [fresh] });
 h.cacheEntries.set('https://infogpstech.github.io/GPSpedia/HTML/users.html', cached);
 const e = event({
  method: 'GET', mode: 'navigate', destination: 'document',
  url: 'https://infogpstech.github.io/GPSpedia/HTML/users.html'
 });
 h.listeners.fetch(e);
 const shown = await e.response;
 assert.equal(await shown.text(), 'cached page');
 await Promise.all(e.waits);
 const updated = await h.cacheEntries.get(e.request.url).text();
 assert.equal(updated, 'fresh page');
 assert.equal(h.fetched.length, 1);
});
test('la respuesta original y la copia de caché tienen cuerpos independientes', async () => {
 const network = makeResponse('fresh JS');
 const h = harness({ responses: [network] });
 const e = event();
 h.listeners.fetch(e);
 const shown = await e.response;
 assert.equal(await shown.text(), 'fresh JS');
 await Promise.all(e.waits);
 const cached = h.cacheEntries.get(e.request.url);
 assert.ok(cached);
 assert.equal(await cached.text(), 'fresh JS');
});
test('recursos estáticos por extensión se cachean también en fetch y CDN', async () => {
 const localUrl = 'https://infogpstech.github.io/GPSpedia/data/catalog.json';
 const local = harness(), localEvent = event({
  method: 'GET', mode: 'cors', destination: '', url: localUrl
 });
 local.listeners.fetch(localEvent);
 assert.ok(localEvent.response, 'el JSON local debe pasar la política de caché');
 await localEvent.response;
 await Promise.all(localEvent.waits);
 assert.ok(local.cacheEntries.has(localUrl), 'el JSON local debe quedar cacheado');

 const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-solid-900.woff2';
 const cdn = harness(), cdnEvent = event({
  method: 'GET', mode: 'cors', destination: 'font', url: cdnUrl
 });
 cdn.listeners.fetch(cdnEvent);
 assert.ok(cdnEvent.response, 'la fuente estática del CDN permitido debe pasar la política');
 await cdnEvent.response;
 await Promise.all(cdnEvent.waits);
 assert.ok(cdn.cacheEntries.has(cdnUrl), 'la fuente del CDN debe quedar cacheada');
});

test('una petición al microservicio externo no se intercepta ni almacena', async () => {
 const h = harness(), e = event({
  method: 'GET', mode: 'cors', destination: '',
  url: 'https://script.google.com/macros/s/deployment/exec?catalogFeed=1'
 });
 h.listeners.fetch(e);
 assert.equal(e.response, null);
 assert.equal(e.waits.length, 0);
 assert.equal(h.fetched.length, 0);
});
test('fallo de red en navegación usa el App Shell cacheado', async () => {
 const h = harness({ networkError: new TypeError('offline') });
 h.cacheEntries.set('https://infogpstech.github.io/GPSpedia/index.html', makeResponse('app shell'));
 const e = event({
  method: 'GET', mode: 'navigate', destination: 'document',
  url: 'https://infogpstech.github.io/GPSpedia/HTML/add_cortes.html'
 });
 h.listeners.fetch(e);
 const response = await e.response;
 assert.equal(await response.text(), 'app shell');
 await Promise.all(e.waits);
});
test('CacheStorage agotado no bloquea la respuesta del recurso', async () => {
 const h = harness({ putError: quota() }), e = event();
 h.listeners.fetch(e);
 const response = await e.response;
 assert.equal(await response.text(), 'network');
 await Promise.all(e.waits);
 assert.ok(h.logs.some(item => item[0] === 'warn'));
});
test('peticiones que no son GET no se interceptan', async () => {
 const h = harness(), e = event({ method: 'POST', mode: 'cors', destination: '', url: 'https://example.com/api' });
 h.listeners.fetch(e);
 assert.equal(e.response, null);
 assert.equal(e.waits.length, 0);
});
let passed = 0;
for (const item of cases) {
 await item.run();
 passed += 1;
 console.log('PASS: ' + item.name);
}
console.log('ServiceWorkerCache: ' + passed + '/' + cases.length + ' PASS');
