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
assert.match(html, /async function generateSyntheticCorpus\(\)/);
assert.match(html, /sintetico-diagrama-electrico\.png/);
assert.match(html, /sintetico-guia-desarme-vertical\.png/);
assert.match(html, /sintetico-textura-zona-oscura\.png/);
assert.match(html, /sintetico-transparencia-parcial\.png/);
assert.match(html, /sintetico-imagen-pequena\.png/);
assert.match(html, /new File\(\[blob\], name, \{ type: "image\/png"/);
assert.match(html, /function setSamples\(files, sourceLabel\)/);
assert.match(html, /const files = selectedFiles\.slice\(\)/);
assert.match(html, /Math\.min\(1, width \/ bitmap\.width\)/);
assert.match(html, /canvas\.toBlob\(resolve, "image\/png"\)/);
assert.match(html, /createConcurrencyLimiter\(2\)/);
assert.match(html, /queue\.promote\(visibleKey, 10\)/);
assert.match(html, /sample\.index === visibleIndex && width === 800/);
assert.match(html, /enqueueVariant\(visibleSample, 800\)/);
assert.match(html, /priority: 0/);
assert.match(html, /crypto\.subtle\.digest\("SHA-256"/);
assert.match(html, /URL\.createObjectURL\(blob\)/);
assert.match(html, /URL\.revokeObjectURL\(url\)/);
assert.match(html, /Math\.min\(128, canvas\.width\)/,
    "la comprobación de alfa usa una muestra acotada y no reserva otro buffer completo");
assert.match(html, /estimatedCanvasBytes/);
assert.match(html, /variant\.blob\.type/);
assert.match(html, /sha256\(variant\.blob\)/);
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
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(script, "el harness debe tener un módulo ejecutable");
const generatorSource = script[1].slice(
    script[1].indexOf("function canvasToFile"),
    script[1].indexOf("function detectSignature")
);
assert.ok(generatorSource.includes("async function generateSyntheticCorpus"));
const fakeContext = new Proxy({}, {
    get(_target, key) {
        if (key === "createLinearGradient") return () => ({ addColorStop() {} });
        return () => {};
    }
});
const fakeDocument = {
    createElement(tag) {
        assert.equal(tag, "canvas");
        return {
            width: 0, height: 0,
            getContext() { return fakeContext; },
            toBlob(callback) { callback(new Blob(["synthetic-png"], { type: "image/png" })); }
        };
    }
};
const generateSyntheticCorpus = new Function("document", "File",
    generatorSource + "\\nreturn generateSyntheticCorpus;"
)(fakeDocument, File);
const syntheticFiles = await generateSyntheticCorpus();
assert.equal(syntheticFiles.length, 5);
assert.deepEqual(syntheticFiles.map(file => file.name), [
    "sintetico-diagrama-electrico.png",
    "sintetico-guia-desarme-vertical.png",
    "sintetico-textura-zona-oscura.png",
    "sintetico-transparencia-parcial.png",
    "sintetico-imagen-pequena.png"
]);
assert.ok(syntheticFiles.every(file => file.type === "image/png"));
assert.ok(syntheticFiles.every(file => file.size > 0));
assert.equal(new Set(syntheticFiles.map(file => file.name)).size, 5);
assert.ok(syntheticFiles.every(file => file.lastModified === 0));
const exifSource = script[1].match(/async function readJpegExifOrientation\(file\) \{[\s\S]*?\n\}/);
assert.ok(exifSource, "debe poder inspeccionarse el lector EXIF");
const readExif = new Function(exifSource[0] + "; return readJpegExifOrientation;")();
function jpegWithOrientation(littleEndian, orientation) {
    const bytes = new Uint8Array(40);
    bytes.set([255, 216, 255, 225, 0, 34, 69, 120, 105, 102, 0, 0], 0);
    bytes.set(littleEndian ? [73, 73] : [77, 77], 12);
    bytes[38] = 255; bytes[39] = 217;
    const view = new DataView(bytes.buffer);
    view.setUint16(14, 42, littleEndian);
    view.setUint32(16, 8, littleEndian);
    view.setUint16(20, 1, littleEndian);
    view.setUint16(22, 0x0112, littleEndian);
    view.setUint16(24, 3, littleEndian);
    view.setUint32(26, 1, littleEndian);
    view.setUint16(30, orientation, littleEndian);
    return bytes;
}
const fileFromBytes = bytes => ({ type: "image/jpeg", slice: () => ({ arrayBuffer: async () => bytes.buffer }) });
assert.equal(await readExif(fileFromBytes(jpegWithOrientation(true, 6))), "6");
assert.equal(await readExif(fileFromBytes(jpegWithOrientation(false, 8))), "8");
assert.equal(await readExif({ type: "image/png" }), "no JPEG");
console.log("ThumbnailQualityBenchmarkContract: 46/46 PASS — corpus sintético local, sin red ni persistencia");
