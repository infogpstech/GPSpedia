import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const html = readFileSync(resolve(root, "HTML/add_cortes.html"), "utf8");
const start = html.indexOf("const imageFileReadCache = new WeakMap();");
const end = html.indexOf("// Ayudas contextuales:", start);
assert.ok(start >= 0 && end > start, "No se encontró el helper FileReader de producción.");
const productionSource = html.slice(start, end).trim();
const browser = await chromium.launch({ headless: true });
const profiles = [
    { name: "desktop Chromium", options: { viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 } },
    { name: "Android Chrome emulado", options: {
        viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    } }
];
try {
    for (const profile of profiles) {
        const context = await browser.newContext(profile.options);
        const page = await context.newPage();
        await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><input id="image" type="file" accept="image/*"></body></html>');
        await page.addScriptTag({ content: `
            window.__fileReaderCalls = 0;
            const NativeFileReader = window.FileReader;
            window.FileReader = class extends NativeFileReader {
                readAsDataURL(file) { window.__fileReaderCalls += 1; return super.readAsDataURL(file); }
            };
            ${productionSource}
            window.fileToBase64 = fileToBase64;
        ` });
        await page.locator("#image").setInputFiles({
            name: "file-reader-cache-fixture.png",
            mimeType: "image/png",
            buffer: Buffer.alloc(1024 * 1024, 0x5a)
        });
        const metrics = await page.evaluate(async () => {
            const file = document.getElementById("image").files[0];
            const startedAt = performance.now();
            const first = window.fileToBase64(file);
            const second = window.fileToBase64(file);
            const samePromise = first === second;
            const [firstResult, secondResult] = await Promise.all([first, second]);
            const durationMs = performance.now() - startedAt;
            const cachedAt = performance.now();
            const third = window.fileToBase64(file);
            const sameCachedPromise = third === first;
            const thirdResult = await third;
            const cachedLookupMs = performance.now() - cachedAt;
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                viewport: { width: innerWidth, height: innerHeight },
                devicePixelRatio,
                fileSizeBytes: file.size,
                fileType: file.type,
                fileReaderCalls: window.__fileReaderCalls,
                samePromise,
                sameCachedPromise,
                sameResult: firstResult === secondResult && firstResult === thirdResult,
                dataUrlLength: firstResult.length,
                durationMs: Number(durationMs.toFixed(3)),
                cachedLookupMs: Number(cachedLookupMs.toFixed(3))
            };
        });
        assert.equal(metrics.fileReaderCalls, 1, profile.name + ": dos consumidores deben compartir una lectura.");
        assert.equal(metrics.samePromise, true, profile.name + ": las llamadas concurrentes deben recibir la misma Promise.");
        assert.equal(metrics.sameCachedPromise, true, profile.name + ": la caché debe reutilizar la Promise resuelta.");
        assert.equal(metrics.sameResult, true, profile.name + ": el contenido debe ser idéntico.");
        assert.ok(metrics.durationMs >= 0 && metrics.cachedLookupMs >= 0);
        assert.equal(metrics.viewport.width, profile.name.includes("Android") ? 412 : 1365, profile.name + ": viewport esperado.");
        console.log("PASS " + profile.name + " " + JSON.stringify(metrics));
        await context.close();
    }
} finally {
    await browser.close();
}
console.log("FileReaderBrowserRuntime: 2/2 PASS — Chromium real en escritorio y emulación móvil Android; latencias registradas.");
