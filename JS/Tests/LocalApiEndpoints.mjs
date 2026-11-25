import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../../", import.meta.url);
const api = readFileSync(new URL("JS/Frontend/api-config.js", root), "utf8");
const expected = {
AUTH:"https://script.google.com/macros/s/AKfycbxRq_zdWqp6khThDkl4S3Z_nT6VibHDHNBaoQAXHal7hMHJ46N9IZel7CRk7w974kqFvw/exec",
CATALOG:"https://script.google.com/macros/s/AKfycbwKrIEtWAwuQc-eYHHfl4B6bpLP3ej00ejCN-dF-OBBLI-VNikj8E9kmbNIb7hUeG43/exec",
WRITE:"https://script.google.com/macros/s/AKfycbx3niOqzZiDxRCkohemVWyrkDBktIYkGyqTecR25xd_VeP_BK-VGNOMbFA_ZSXhU7FtBA/exec",
FEEDBACK:"https://script.google.com/macros/s/AKfycbz1DXpVjeCuuT_aXn7fEO5iFbIZI9wwAZh2ENlKPLWWAYXiyZOEKSPLa7QASfBl83vQ/exec",
UTILITIES:"https://script.google.com/macros/s/AKfycbzUc402Sju0_ZU7PQST1Kma-qrgJs2v10Pi6hA62rWZZvsCefD6Mr6PCo5GEDA0dGRk/exec",
ADMIN:"https://script.google.com/macros/s/AKfycbz4MhX-UuhUU6aBgHRs8esb6GDc--DsE37P6SglkgKFC1WG1G2pjd-oIjYKSrBonMVfug/exec"
};
const block = api.match(/export const API_ENDPOINTS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(block, "API_ENDPOINTS debe existir como mapa único e inmutable.");
const actual = new Function("return (" + block[1] + ");")();
assert.deepEqual(actual, expected, "Las seis URLs deben coincidir con los valores confirmados por el usuario.");
assert.deepEqual(Object.keys(actual).sort(), ["ADMIN","AUTH","CATALOG","FEEDBACK","UTILITIES","WRITE"]);
const resolverMatch = api.match(/function resolveApiEndpoint_\([\s\S]*?\n\}/);
assert.ok(resolverMatch, "Falta el resolvedor local.");
const resolver = new Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_", resolverMatch[0] + "\nreturn resolveApiEndpoint_;")(
    actual, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
);
for (const [key, value] of Object.entries(expected)) assert.equal(resolver(key), value);
assert.throws(() => resolver("UNKNOWN"), /sin endpoint local/);
assert.throws(() => resolver(""), /sin endpoint local/);
const invalid = { ...actual, AUTH: "http://script.google.com/macros/s/invalid/exec" };
const invalidResolver = new Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_", resolverMatch[0] + "\nreturn resolveApiEndpoint_;")(
    invalid, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
);
assert.throws(() => invalidResolver("AUTH"), /no cumple el formato HTTPS/);
const duplicate = { ...actual, ADMIN: actual.AUTH };
const duplicateResolver = new Function("API_ENDPOINTS","API_ENDPOINT_PATTERN_", resolverMatch[0] + "\nreturn resolveApiEndpoint_;")(
    duplicate, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/
);
assert.throws(() => duplicateResolver("ADMIN"), /IDs de deployment vacíos o duplicados/);
const routeHelper = api.match(/async function getConfiguredServiceEndpoint_\(service\) \{[\s\S]*?\n\}/);
assert.ok(routeHelper && /return resolveApiEndpoint_\(service\)/.test(routeHelper[0]));
const routeStart = api.indexOf("async function routeActionInternal_");
const routeEnd = api.indexOf("export async function routeAction(", routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart);
assert.doesNotMatch(api.slice(routeStart, routeEnd), /loadCentralConfiguration|CENTRAL_CONFIGURATION_BOOTSTRAP_URL|resolveCentralServiceEndpoint/);
const healthStart = api.indexOf("export async function checkAllServicesHealth");
const healthEnd = api.indexOf("export async function checkServiceHealth", healthStart);
assert.ok(healthStart >= 0 && healthEnd > healthStart);
assert.match(api.slice(healthStart, healthEnd), /resolveApiEndpoint_\(serviceKey\)/);
assert.doesNotMatch(api.slice(healthStart, healthEnd), /loadCentralConfiguration|resolveCentralServiceEndpoint/);
const map = api.match(/export const ACTION_TO_SERVICE_MAP = \{([\s\S]*?)\n\};/);
assert.ok(map);
for (const [, service] of map[1].matchAll(/:\s*['"]([A-Z]+)['"]/g)) assert.ok(Object.hasOwn(actual, service), "Acción apunta a servicio sin endpoint: " + service);
console.log("LocalApiEndpoints: 10/10 PASS — valores, seis claves, IDs únicos, HTTPS, errores fail-closed, router y health locales.");
