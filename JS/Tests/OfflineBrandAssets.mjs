import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const html = read("index.html");
const main = read("JS/Frontend/main.js");
const worker = read("service-worker.js");
const icon = readFileSync(resolve(root, "Images/icon-v3-512x512.png"));

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

test("el encabezado y el Splash claro usan el logo oficial local", () => {
    assert.match(html, /class="app-logo"[^>]*src="Images\/icon-v3-512x512\.png"|src="Images\/icon-v3-512x512\.png"[^>]*class="app-logo"/);
    assert.match(html, /id="splash-screen"[\s\S]*?src="Images\/icon-v3-512x512\.png"/);
    const appLogoTag = html.match(/<img[^>]+class="app-logo"[^>]*>/)?.[0] || "";
    const splashStart = html.indexOf('<div id="splash-screen">');
    const splashEnd = html.indexOf('</div>', splashStart);
    const splashMarkup = html.slice(splashStart, splashEnd);
    assert.doesNotMatch(appLogoTag, /drive\.google\.com/);
    assert.doesNotMatch(splashMarkup, /drive\.google\.com/);
    assert.match(main, /const logoUrl = isDark \? 'Images\/Logo_TemaOscuro\.png' : 'Images\/icon-v3-512x512\.png'/);
    assert.match(main, /const splashUrl = isDark \? 'Images\/Logo_TemaOscuro\.png' : 'Images\/icon-v3-512x512\.png'/);
});

test("el modal de instalación iOS usa un logo local disponible offline", () => {
    const start = html.indexOf('<div id="ios-install-modal"');
    const end = html.indexOf("</div>", start);
    const modal = html.slice(start, end);
    assert.match(modal, /src="Images\/icon-v3-512x512\.png"/);
    assert.doesNotMatch(modal, /drive\.google\.com/);
});

test("el logo oscuro permanece asignado al Splash cuando el tema oscuro está activo", () => {
    assert.match(main, /const splashUrl = isDark \? 'Images\/Logo_TemaOscuro\.png'/);
    assert.ok(worker.includes("'./Images/Logo_TemaOscuro.png'"));
    assert.ok(worker.includes("'./JS/Frontend/activityDashboard.js'"));
});

test("el favicon apunta al PNG oficial local con canal alfa", () => {
    assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512" href="Images\/icon-v3-512x512\.png">/);
    assert.deepEqual(Array.from(icon.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(icon.toString("ascii", 12, 16), "IHDR");
    assert.ok(icon[25] === 4 || icon[25] === 6, "el PNG del favicon debe tener canal alfa y no un fondo opaco");
});

test("el Service Worker precarga el logo claro y el logo oscuro para uso offline", () => {
    const cacheName = worker.match(/const CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
    assert.ok(cacheName && /^gpsepedia-cache-v\d+$/.test(cacheName[1]),
        "el Service Worker debe usar una versión explícita y creciente de caché");
    assert.ok(worker.includes("'./Images/icon-v3-512x512.png'"));
    assert.ok(worker.includes("'./Images/Logo_TemaOscuro.png'"));
});

console.log("OfflineBrandAssets: " + passed + "/" + passed + " PASS");
