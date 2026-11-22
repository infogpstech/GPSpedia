import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(root, "JS/Tests/ThumbnailQualityBenchmark.html"), "utf8");
const offline = readFileSync(resolve(root, "JS/Frontend/offline.js"), "utf8");
const queue = readFileSync(resolve(root, "JS/Frontend/thumbnailCompressionQueue.js"), "utf8");

assert.match(html, /createConcurrencyLimiter \} from "\.\.\/Frontend\/thumbnailCompressionQueue\.js"/);
assert.match(html, /const WIDTHS = \[300, 800, 1600\]/);
assert.match(html, /Math\.min\(1, width \/ bitmap\.width\)/);
assert.match(html, /canvas\.toBlob\(resolve, "image\/png"\)/);
assert.match(html, /createConcurrencyLimiter\(2\)/);
assert.match(html, /queue\.promote\(visibleKey, 10\)/);
assert.match(html, /priority: 0/);
assert.match(html, /crypto\.subtle\.digest\("SHA-256"/);
assert.match(html, /URL\.createObjectURL\(blob\)/);
assert.match(html, /URL\.revokeObjectURL\(url\)/);
assert.match(html, /Math\.min\(128, canvas\.width\)/,
    "la comprobación de alfa usa una muestra acotada y no reserva otro buffer completo");
assert.match(html, /estimatedCanvasBytes/);
assert.match(html, /readJpegExifOrientation\(file\)/);
assert.match(html, /file\.slice\(0, 262144\)/);
assert.match(html, /python -m http\.server 8000/);
assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|indexedDB|localStorage|sendBeacon|FormData/,
    "el harness no debe enviar ni persistir archivos");
assert.match(offline, /const THUMBNAIL_QUEUE_PRIORITY_PREFETCH = 0/);
assert.match(offline, /const THUMBNAIL_QUEUE_PRIORITY_VISIBLE = 10/);
assert.match(offline, /Math\.min\(1, width \/ bitmap\.width\)/);
assert.match(offline, /"image\/png"/);
assert.match(queue, /export function createConcurrencyLimiter\(limit = 2/);
console.log("ThumbnailQualityBenchmarkContract: 20/20 PASS — local, sin red ni persistencia");
