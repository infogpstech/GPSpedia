import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const apiSource = read("JS/Frontend/api-config.js");
const ui = read("JS/Frontend/ui.js");
const auth = read("JS/Frontend/auth.js");
const html = read("index.html");
const feedback = read("JS/Services/feedback.js");
const admin = read("JS/Services/admin.js");
const reader = read("JS/Services/CentralConfigurationReader.js");
function extract(source, start, end) {
    const i = source.indexOf(start), j = source.indexOf(end, i + start.length);
    assert.ok(i >= 0 && j > i, "No se encontró el bloque: " + start);
    return source.slice(i, j);
}
function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { values, getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); } };
}
const apiBlock = extract(apiSource, "export const RICH_TEXT_MODE_KEY", "const CENTRAL_CONFIGURATION_BOOTSTRAP_URL").replace(/^export /gm, "");
function createApi(storage, handler, retryHandler = async (action, payload, options) => handler(action, payload, options)) {
    return new Function("localStorage", "routeAction", "routeActionWithRetry", apiBlock +
        "\nreturn { RICH_TEXT_MODE_KEY, RICH_TEXT_MODE_CACHE_META_KEY, RICH_TEXT_MODE_CACHE_TTL_MS, RICH_TEXT_MODES, getRichTextMode, loadRichTextMode, setRichTextMode };")(storage, handler, retryHandler);
}
let passed=0;
function testCase(name,fn){const result=fn();if(result&&typeof result.then==="function")throw new Error("Usa await fuera de testCase");passed++;console.log("PASS "+name);}
async function asyncCase(name,fn){await fn();passed++;console.log("PASS "+name);}

testCase("sin caché central válida se aplica modo estricto",()=>{
 const api=createApi(createStorage(),async()=>{throw new Error("No debe consultar");});
 assert.equal(api.getRichTextMode(),"strict");
});
await asyncCase("carga el modo global y almacena revisión con TTL",async()=>{
 let call=null,retryOptions=null;const storage=createStorage();
 const api=createApi(storage,async()=>null,async(action,payload,options)=>{call={action,payload};retryOptions=options;return{status:"success",mode:"advanced",revision:12};});
 await assert.rejects(()=>api.loadRichTextMode({userId:"u1"}),/sesión activa/);
 assert.equal(await api.loadRichTextMode({userId:"u1",sessionToken:"t1"}),"advanced");
 assert.deepEqual(call,{action:"getRichTextMode",payload:{userId:"u1",sessionToken:"t1"}});
 assert.deepEqual(retryOptions,{timeoutMs:6000,maxAttempts:2,retryDelayMs:250});
 assert.equal(api.getRichTextMode(),"advanced");
 const meta=JSON.parse(storage.getItem(api.RICH_TEXT_MODE_CACHE_META_KEY));
 assert.equal(meta.revision,12);assert.ok(meta.fetchedAt>0);
});
testCase("la caché antigua sin revisión no puede ser fuente de verdad",()=>{
 const api=createApi(createStorage({gpsepedia_rich_text_mode_cache:"advanced"}),async()=>null);
 assert.equal(api.getRichTextMode(),"strict");
});
testCase("la caché vencida o inválida vuelve a estricto",()=>{
 const stale=createStorage({gpsepedia_rich_text_mode_cache:"advanced",gpsepedia_rich_text_mode_cache_meta:JSON.stringify({revision:2,fetchedAt:1})});
 const api=createApi(stale,async()=>null);assert.equal(api.getRichTextMode(),"strict");
 const invalid=createStorage({gpsepedia_rich_text_mode_cache:"unsafe",gpsepedia_rich_text_mode_cache_meta:JSON.stringify({revision:2,fetchedAt:Date.now()})});
 assert.equal(createApi(invalid,async()=>null).getRichTextMode(),"strict");
});
await asyncCase("una respuesta inválida no reemplaza la última caché todavía vigente",async()=>{
 const storage=createStorage({gpsepedia_rich_text_mode_cache:"advanced",gpsepedia_rich_text_mode_cache_meta:JSON.stringify({revision:7,fetchedAt:Date.now()})});
 const api=createApi(storage,async()=>({status:"success",mode:"unsafe",revision:8}));
 await assert.rejects(()=>api.loadRichTextMode({userId:"u1",sessionToken:"t1"}),/configuración global/);
 assert.equal(api.getRichTextMode(),"advanced");
});
await asyncCase("solo Developer publica en ADMIN y luego solicita invalidación FEEDBACK",async()=>{
 const calls=[];const api=createApi(createStorage(),async(action,payload)=>{calls.push({action,payload});if(action==="setRichTextMode")return{status:"success",mode:payload.mode,revision:13};return{status:"success"};});
 await assert.rejects(()=>api.setRichTextMode("advanced","Técnico",{userId:"u1",sessionToken:"t1"}),/Solo un Desarrollador/);
 assert.equal(calls.length,0);
 assert.equal(await api.setRichTextMode("advanced","Desarrollador",{userId:"d1",sessionToken:"td"}),"advanced");
 assert.equal(calls.length,2);assert.equal(calls[0].action,"setRichTextMode");assert.equal(calls[1].action,"invalidateRichTextModeCache");
 assert.equal(calls[0].payload.userId,"d1");assert.equal(calls[0].payload.mode,"advanced");assert.match(calls[0].payload.requestId,/^[A-Za-z0-9_-]{16,100}$/);
 assert.equal(api.getRichTextMode(),"advanced");
});
testCase("FEEDBACK lee configuración central y no conserva propiedad local",()=>{
 assert.match(feedback,/getPublicCentralConfiguration_\(\)/);
 assert.doesNotMatch(feedback,/GPSpedia_RICH_TEXT_MODE_V1|RICH_TEXT_MODE_PROPERTY_/);
 assert.match(reader,/GP_CONFIG_PARAMETER_RULES_\s*=\s*\{[\s\S]*?rich_text_mode/);
});
testCase("ADMIN publica con RBAC Developer, lock, revisión e historial",()=>{
 assert.match(admin,/case 'setRichTextMode':[\s\S]*?handleSetRichTextModeCentral_\(payload, developerContext\)/);
 assert.match(admin,/function handleSetRichTextModeCentral_/);
 assert.match(admin,/LockService\.getScriptLock\(\)/);
 assert.match(admin,/ConfiguracionHistorial/);
 assert.match(admin,/readCentralConfigurationSnapshot_\(\)/);
});
testCase("la aplicación carga la preferencia central al iniciar sesión y refresca barras",()=>{
 assert.match(auth,/loadRichTextModePreference\(user\)/);
 assert.match(ui,/export async function loadRichTextModePreference/);
 assert.match(ui,/await loadRichTextMode\(context\)/);
 assert.match(ui,/refreshRichTextToolbars\(\)/);
 assert.match(html,/Formato de texto/);
 assert.doesNotMatch(html,/preferencia se guarda en este navegador/);
});
testCase("el frontend enruta lectura, publicación e invalidación al servicio correcto",()=>{
 assert.match(apiSource,/'getRichTextMode': 'FEEDBACK'/);
 assert.match(apiSource,/'setRichTextMode': 'ADMIN'/);
 assert.match(apiSource,/'invalidateRichTextModeCache': 'FEEDBACK'/);
});
console.log("RichTextGlobalPreference: "+passed+"/"+passed+" PASS");
