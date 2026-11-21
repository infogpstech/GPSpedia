import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const offline = readFileSync(resolve(root, 'JS/Frontend/offline.js'), 'utf8');
const performOp = offline.slice(offline.indexOf('async function performOp('), offline.indexOf('\n}', offline.indexOf('async function performOp(')) + 2);
const save = offline.slice(offline.indexOf('export async function saveValidationResponse('), offline.indexOf('\n}', offline.indexOf('export async function saveValidationResponse(')) + 2);
const read = offline.slice(offline.indexOf('export async function getValidationResponse('), offline.indexOf('\n}', offline.indexOf('export async function getValidationResponse(')) + 2);
assert.match(performOp, /timeoutMs:\s*options\s*&&\s*options\.timeoutMs/);
assert.match(save, /silent:\s*true,\s*timeoutMs:\s*2500/);
assert.match(read, /silent:\s*true,\s*timeoutMs:\s*2500/);
assert.match(read, /performOp\('validationCache',\s*'readonly'/);
console.log('OptionalValidationCache: 4/4 PASS');
