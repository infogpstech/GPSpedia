import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../Services/admin.js', import.meta.url), 'utf8');
const start = source.indexOf('function handleAuditDriveImagesInCortesCore_(');
assert.ok(start >= 0, 'No se encontró el escáner principal de auditoría Drive.');
const end = source.indexOf('\nfunction ', start + 10);
const scanner = source.slice(start, end > start ? end : source.length);
const pushStart = scanner.indexOf('auditResults.push({');
assert.ok(pushStart >= 0, 'No se encontró la construcción del resultado de auditoría.');
const objectStart = pushStart + 'auditResults.push('.length;
const objectEnd = scanner.indexOf('});', objectStart);
assert.ok(objectEnd > objectStart, 'No se pudo extraer el resultado de auditoría.');
const objectLiteral = scanner.slice(objectStart, objectEnd + 1);
assert.ok(!objectLiteral.includes('item && item.referenceLocations'),
    'El resultado no debe leer item fuera de un callback: causaba ReferenceError.');
const buildResult = new Function('fileId','fileName','classification','current','mimeType','fileFormat','referenceLocations','size','lastUpdated',
    'return (' + objectLiteral + ');');
const current = { folderId: 'folder-12345678901234567890', path: 'Cortes/Marca/Modelo' };
const location = { sheet: 'Cortes', row: 8, column: 16, field: 'imgCorte1',
    vehicleId: 'V-105', category: 'Motocicleta', brand: 'Yamaha', model: 'MTN155' };
const result = buildResult('file-12345678901234567890', 'photo.jpg', 'Sin uso detectado', current, 'image/jpeg', 'jpg',
    [location], 1024, '2026-11-25 10:00:00');
assert.deepEqual(result.referenceLocations, [{
    sheet: 'Cortes', row: 8, column: 16, field: 'imgCorte1',
    vehicleId: 'V-105', category: 'Motocicleta', brand: 'Yamaha', model: 'MTN155'
}]);
assert.equal(result.classification, 'Sin uso detectado');
assert.equal(result.fileId, 'file-12345678901234567890');
const withoutLocations = buildResult('file-22345678901234567890', 'other.png', 'Sin uso detectado', current, 'image/png', 'png', [], 2048, '');
assert.deepEqual(withoutLocations.referenceLocations, []);
console.log('AdminDriveAuditItemReference: 3/3 PASS');
