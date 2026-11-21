import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getThumbnailCacheKey } from '../Frontend/offline.js';

const uiSource = await readFile(new URL('../Frontend/ui.js', import.meta.url), 'utf8');
const offlineSource = await readFile(new URL('../Frontend/offline.js', import.meta.url), 'utf8');
const start = uiSource.indexOf('export function getImageUrl(');
const end = uiSource.indexOf('\nexport function getLogoUrlForMarca', start);
assert.ok(start >= 0 && end > start, 'getImageUrl debe existir en ui.js');
const getImageUrl = new Function(uiSource.slice(start, end).replace('export function', 'function') + '; return getImageUrl;')();

const variants = [
    { name: 'pequeña', width: 300 },
    { name: 'media', width: 800 },
    { name: 'grande', width: 1600 }
];
const fileId = 'drive-file-123';

for (const variant of variants) {
    assert.equal(
        getImageUrl(fileId, variant.width),
        `https://lh3.googleusercontent.com/d/${fileId}`,
        `la variante ${variant.name} debe conservar la URL fuente original`
    );
}
assert.equal(getImageUrl('https://drive.google.com/file/d/drive-file-123/view', 800),
    'https://lh3.googleusercontent.com/d/drive-file-123');
assert.equal(getImageUrl('https://images.example/photo.jpg', 300), 'https://images.example/photo.jpg');
assert.equal(getImageUrl('blob:https://app.example/id', 1600), 'blob:https://app.example/id');
assert.equal(getImageUrl('data:image/png;base64,AAAA', 800), 'data:image/png;base64,AAAA');
assert.ok(!/=[ws]\d+/i.test(getImageUrl(fileId, 300)), 'no usar transformaciones CDN que puedan perder transparencia');

assert.equal(getThumbnailCacheKey(fileId, 300), 'drive-file-123::w300');
assert.equal(getThumbnailCacheKey('https://drive.google.com/file/d/drive-file-123/view', 800), 'drive-file-123::w800');
assert.equal(getThumbnailCacheKey('https://lh3.googleusercontent.com/d/drive-file-123', 1600), 'drive-file-123::w1600');
assert.equal(getThumbnailCacheKey(fileId, 300) === getThumbnailCacheKey(fileId, 800), false);
assert.equal(getThumbnailCacheKey(fileId, 800) === getThumbnailCacheKey(fileId, 1600), false);
assert.equal(getThumbnailCacheKey('', 300), null);

assert.match(uiSource, /offline\.getThumbnailCacheKey\(cleanId, normalizedSize\)/);
const optimizedStart = uiSource.indexOf('async function setOptimizedImage(');
const optimizedEnd = uiSource.indexOf('\n}', optimizedStart);
assert.ok(optimizedStart >= 0 && optimizedEnd > optimizedStart, 'setOptimizedImage debe existir en el módulo frontend activo');
const optimizedImage = uiSource.slice(optimizedStart, optimizedEnd);
assert.match(optimizedImage, /setSource\(remoteUrl\)/, 'la imagen original se muestra sin esperar IndexedDB');
assert.match(optimizedImage, /offline\.getThumbnail\(cleanId, normalizedSize\)/, 'la caché local se consulta en paralelo');
assert.match(optimizedImage, /imgElement\.crossOrigin = 'anonymous'/, 'solicita CORS antes de cargar para reutilizar los bytes de la imagen');
assert.match(optimizedImage, /imgElement\.removeAttribute\('crossorigin'\)/, 'mantiene fallback visual cuando el servidor no permite CORS');
assert.match(optimizedImage, /offline\.compressAndStoreThumbnailFromImage\(imgElement, cleanId, normalizedSize\)/, 'genera miniatura desde la imagen ya descargada');
assert.doesNotMatch(optimizedImage, /offline\.compressAndStoreThumbnail\(remoteUrl/, 'no inicia un segundo fetch en el ciclo visible');
assert.match(offlineSource, /createImageBitmap\(imageElement\)/, 'la persistencia usa los bytes de la imagen existente');
assert.match(optimizedImage, /gp-image-loading/);
assert.match(optimizedImage, /IMAGE_FALLBACK_DATA_URL/);
assert.match(optimizedImage, /thumbnailObjectUrls\.attach\(cacheKey, blob, imgElement, requestToken\)/);
assert.match(uiSource, /getImageUrl\([^\n]*IMG_SIZE_LARGE\)/, 'el Lightbox debe solicitar la fuente grande');
assert.match(offlineSource, /Math\.min\(1,width\/bitmap\.width\)/, 'no ampliar imágenes pequeñas');
assert.match(offlineSource, /canvas\.toBlob\(blob=>\{[\s\S]*?\},\"image\/png\"\)/, 'persistir variantes PNG con canal alfa');
assert.match(offlineSource, /entry\.fileId===expected\.fileId&&Number\(entry\.width\)===expected\.width/);
assert.match(offlineSource, /Un registro histórico indexado solo por ID no declara la resolución/);

console.log('ImageResolutionVariants: 10/10 PASS — fuentes, tamaños, PNG y primera visualización');
