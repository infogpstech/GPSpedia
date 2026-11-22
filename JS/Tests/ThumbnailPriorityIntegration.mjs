import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const offline = readFileSync(resolve(root, "JS/Frontend/offline.js"), "utf8");
const queue = readFileSync(resolve(root, "JS/Frontend/thumbnailCompressionQueue.js"), "utf8");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");

function extract(source, pattern, label) {
    const match = source.match(pattern);
    assert.ok(match, "No se encontró " + label);
    return match[0];
}
const prefetch = extract(offline, /async function compressAndStoreThumbnailOnce_\([\s\S]*?\n\}/, "compresión de precarga");
const visible = extract(offline, /export async function compressAndStoreThumbnailFromImage\([\s\S]*?\n\}/, "compresión desde imagen visible");
const cache = extract(offline, /export async function cacheItemImages\([\s\S]*?\n\}/, "precarga de ficha");

assert.match(offline, /const THUMBNAIL_QUEUE_PRIORITY_PREFETCH = 0/);
assert.match(offline, /const THUMBNAIL_QUEUE_PRIORITY_VISIBLE = 10/);
assert.match(cache, /compressAndStoreThumbnail\(field,field,300\)/,
    "la precarga conserva variante 300 px");
assert.match(prefetch, /fetch\(fetchUrl,\{mode:"cors"\}\)/,
    "la ruta de precarga debe usar la descarga CORS propia");
assert.match(prefetch, /priority: THUMBNAIL_QUEUE_PRIORITY_PREFETCH/,
    "la precarga debe entrar con prioridad baja");
assert.match(visible, /createImageBitmap\(imageElement\)/,
    "la ruta visible debe reutilizar el elemento ya descargado");
assert.match(visible, /priority: THUMBNAIL_QUEUE_PRIORITY_VISIBLE/,
    "la compresión visible debe tener prioridad alta");
assert.match(visible, /thumbnailCompressionQueue\.promote\(cacheKey, THUMBNAIL_QUEUE_PRIORITY_VISIBLE\)/,
    "la solicitud visible debe promover una precarga pendiente de la misma variante");
assert.doesNotMatch(visible, /\bfetch\s*\(/,
    "la compresión visible no debe iniciar una segunda solicitud de red");

const visibleLoader = ui.slice(ui.indexOf("const cachedBlobPromise = Promise.race(["), ui.indexOf("export function getImageUrl"));
assert.ok(visibleLoader.length > 0, "debe existir la ruta de carga de imagen visible");
assert.ok(visibleLoader.indexOf("setSource(remoteUrl)") < visibleLoader.indexOf("offline.compressAndStoreThumbnailFromImage"),
    "la imagen original se muestra antes de persistir la miniatura");
assert.match(visibleLoader, /persistLoadedThumbnail = \(\) =>/);
assert.match(visibleLoader, /!imageLoaded \|\| !isCurrent\(\) \|\| !imgElement\.naturalWidth/,
    "la persistencia visible espera una imagen cargada y una solicitud vigente");
assert.match(visibleLoader, /imgElement\.crossOrigin = 'anonymous'/,
    "la ruta intenta CORS antes de la descarga visible");

assert.match(queue, /pending\.sort\(\(a, b\) => b\.priority - a\.priority \|\| a\.sequence - b\.sequence\)/,
    "la cola ordena prioridad descendente y FIFO por prioridad");
assert.match(queue, /activeKeys\.has\(normalizedKey\)\) return false/,
    "la promoción no interrumpe una tarea ya activa");
assert.match(queue, /job\.priority = nextPriority/);
console.log("ThumbnailPriorityIntegration: 15/15 PASS — visible sobre precarga, single-flight y sin segundo fetch");
