import fs from 'node:fs';
import assert from 'node:assert/strict';

const frontend = fs.readFileSync('JS/Frontend/auth.js', 'utf8');
const backend = fs.readFileSync('JS/Services/Auth.js', 'utf8');
const fixture = fs.readFileSync('JS/Tests/Auth.js', 'utf8');

const generic = 'Error en el inicio de sesión, intente otra vez';
const invalid = 'Contraseña o usuario incorrecto';

assert.ok(frontend.includes("console.error('[AUTH] Fallo durante el inicio de sesión:', error)"),
  'Los detalles técnicos del login deben registrarse en la consola.');
assert.ok(frontend.includes(generic), 'Debe existir el mensaje genérico de error de sesión.');
assert.ok(frontend.includes(invalid), 'Las credenciales incorrectas deben usar el mensaje específico permitido.');
assert.match(frontend, /showGlobalError\(message\)/, 'La interfaz debe mostrar el mensaje saneado, no error.message.');
assert.match(frontend, /showLoginScreen\(reason \? 'Error en el inicio de sesión, intente otra vez' : undefined\)/,
  'Los motivos técnicos de cierre no deben mostrarse al usuario.');
assert.match(backend, /code: invalidCredentials \? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED'/,
  'AUTH debe clasificar credenciales incorrectas sin exponer el detalle en la UI.');
assert.match(fixture, /code: invalidCredentials \? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED'/,
  'El fixture AUTH debe conservar paridad con el servicio.');
console.log('AuthErrorPrivacy: 7/7 PASS');
