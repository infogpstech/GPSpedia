import fs from 'node:fs';
import assert from 'node:assert/strict';

const design = fs.readFileSync('ESQUEMA_CONFIGURACION_CENTRAL.md', 'utf8');
const inventory = fs.readFileSync('INVENTARIO_CONFIGURACION_BACKEND.md', 'utf8');
const requiredSections = [
  '## 3. Modelo lógico y hojas',
  '### 3.1 Hoja Servicios',
  '### 3.2 Hoja ConfiguracionParametros',
  '### 3.3 Hoja ConfiguracionRecursos',
  '### 3.4 Hoja ConfiguracionControl',
  '### 3.5 Hoja ConfiguracionHistorial',
  '### 3.6 Hoja ConfiguracionEsquema',
  '## 4. Versionado, publicación e integridad',
  '## 5. Separación pública, restringida y límites reales de Google Sheets',
  '## 6. Catálogo de configuración y trazabilidad del inventario MIG-003',
  '### 6.2 Las 26 familias de ScriptProperties',
  '## 7. Validación, defaults y recuperación',
  '## 8. Caché y comportamiento ante indisponibilidad',
  '## 10. Criterios de aceptación MIG-007'
];
for (const section of requiredSections) assert.ok(design.includes(section), 'Falta sección: ' + section);

for (let family = 1; family <= 26; family++) {
  assert.match(design, new RegExp('\\|' + family + '(?:–|\\|)'), 'No se documenta trazabilidad para familia ' + family);
}
for (const token of [
  'GPSpedia_COORDINATOR_SECRET',
  'GPSpedia_CATALOG_TRAFFIC_SECRET',
  'GPSpedia_PASSWORD_RECOVERY_SECRET_V1',
  'SPREADSHEET_ID',
  'DRIVE_FOLDER_ID'
]) {
  assert.ok(inventory.includes(token), 'El inventario de origen no contiene ' + token);
}
assert.match(design, /No se almacenan API keys, contraseñas, tokens manuales, secretos compartidos/);
assert.match(design, /Google Sheets no ofrece ACL de lectura por pestaña/);
assert.match(design, /Endpoint ausente, deshabilitado, duplicado o inválido/);
assert.match(design, /rollback_of_revision/);
assert.match(design, /stale-if-error máximo 15 min/);
assert.match(design, /MIG-006/);
assert.doesNotMatch(design, /1[A-Za-z0-9_-]{30,}/, 'No deben aparecer IDs de recursos o deployments');
console.log('MIG007ConfigurationSchemaContract: ' + requiredSections.length + ' secciones, 26 familias y reglas de seguridad/versionado verificadas.');
