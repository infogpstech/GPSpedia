import fs from 'node:fs';
import assert from 'node:assert/strict';

const frontend = fs.readFileSync('JS/Frontend/auth.js', 'utf8');
const ui = fs.readFileSync('JS/Frontend/ui.js', 'utf8');
const backend = fs.readFileSync('JS/Services/Auth.js', 'utf8');
const fixture = fs.readFileSync('JS/Tests/Auth.js', 'utf8');

const generic = 'Error en el inicio de sesión, intente otra vez';
const invalid = 'contraseña o usuario incorrecto';

assert.ok(frontend.includes("console.error('[AUTH] Fallo durante el inicio de sesión:', error)'),
  'Los detalles técnicos del login deben registrarse en la consola.');
assert.ok(frontend.includes(generic), 'Debe existir el mensaje genérico de error de sesión.');
assert.ok(frontend.includes(invalid), 'Las credenciales incorrectas deben usar exactamente el mensaje permitido.');
assert.ok(!frontend.includes('Contraseña o usuario incorrecto'),
  'No debe quedar una variante de texto distinta a la solicitada.');
assert.match(frontend, /showGlobalError\(message\)/, 'La interfaz debe mostrar el mensaje saneado, no error.message.');
assert.ok(frontend.includes("console.error('[AUTH] No se confirmó la limpieza de caché de sesión en los servicios:', services)"),
  'Los servicios cuya caché no se limpió deben quedar solo en consola.');
assert.ok(frontend.includes("showGlobalError('Error en el inicio de sesión, intente otra vez')"),
  'Los fallos de invalidación de sesión deben mostrar solo el mensaje genérico.');
assert.ok(frontend.includes("console.error('[AUTH] El perfil de sesión local contiene un rol no válido:', normalizedRole)"),
  'El detalle del rol inválido debe conservarse en consola.');
assert.ok(frontend.includes("showLoginScreen('Error en el inicio de sesión, intente otra vez')"),
  'Las rutas de sesión local deben usar el mensaje genérico.');
assert.ok(ui.includes("const safeReason = reason === 'Sesión terminada'") &&
  ui.includes("reason ? 'Error en el inicio de sesión, intente otra vez' : null") &&
  ui.includes('loginError.textContent = safeReason'),
  'showLoginScreen debe aplicar una lista permitida y nunca renderizar directamente la razón recibida.');
assert.ok(!ui.includes('loginError.textContent = reason'),
  'La interfaz no debe insertar motivos técnicos sin sanear.');
assert.match(backend, /code: invalidCredentials \\? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED'/,
  'AUTH debe clasificar credenciales incorrectas sin exponer el detalle en la UI.');
assert.match(fixture, /code: invalidCredentials \\? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED'/,
  'El fixture AUTH debe conservar paridad con el servicio.');
console.log('AuthErrorPrivacy: 13/13 PASS');
