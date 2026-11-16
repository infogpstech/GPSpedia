import fs from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => fs.readFileSync(resolve(ROOT, path), "utf8");
function extract(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i);return s.slice(i,j);}
function harness(src,initial){
 const vp={content:initial,getAttribute(n){return n==="content"?this.content:null;},setAttribute(n,v){if(n==="content")this.content=v;}};
 const cl=new Set(),img={src:"",style:{}},box={classList:{contains:n=>cl.has(n),add:n=>cl.add(n),remove:n=>cl.delete(n)},querySelector:()=>img},timers=[];
 const win={inEditMode:false,history:{state:{},pushState(){},back(){}},handleViewportChange(){}};
 const doc={querySelector:s=>s==='meta[name="viewport"]'?vp:null,getElementById:id=>id==="lightbox"?box:(id==="lightboxImg"||id==="lightbox-img"?img:null)};
 const functions = extract(src,"function abrirLightbox(","/**\n * Cierra el lightbox")
  + extract(src,"function cerrarLightbox(","// Hacemos las funciones globalmente accesibles");
 const f=new Function("window","document","setTimeout","initLightboxEvents","actualizarBotonesLightbox",
  "let previousViewportContent=null; let currentLightboxContext=null; "+functions+";return {abrirLightbox,cerrarLightbox};");
 return {api:f(win,doc,fn=>timers.push(fn),()=>{},()=>{}),vp,timers};
}
export function runBrowserZoomAccessibilityTests({index,users,add,lightbox}){
 const names=[],t=(n,f)=>{f();names.push(n);};
 t("viewport restringe zoom nativo de navegación en las tres páginas",()=>{
  for(const page of [index,users,add]) {
   const m=page.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
   assert.ok(m,"Falta meta viewport");
   assert.match(m[0],/width=device-width/);
   assert.match(m[0],/initial-scale=1/);
   assert.match(m[0],/maximum-scale=1\.0/);
   assert.match(m[0],/user-scalable=no/);
  }
 });
 t("no cancela zoom por rueda ni por gestos fuera del lightbox",()=>{
  assert.doesNotMatch(add,/addEventListener\(\s*['"]wheel['"][\s\S]{0,500}?preventDefault/);
  assert.doesNotMatch(add,/addEventListener\(\s*['"]touch(?:start|move)['"][\s\S]{0,400}?preventDefault/);
 });
 t("no cancela zoom por atajos de teclado",()=>assert.doesNotMatch(add,/\[61,\s*107,\s*173,\s*109,\s*187,\s*189,\s*48,\s*96\]/));
 t("reflujo de una columna",()=>assert.match(add,/@media\s*\(max-width:\s*600px\)[\s\S]*?\.form-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/));
 t("grid permite encogimiento",()=>assert.match(add,/\.form-grid\s*>\s*\*\s*\{\s*min-width:\s*0/));
 t("acciones envuelven texto y botones",()=>{assert.match(add,/\.btn-container\s*\{\s*flex-wrap:\s*wrap/);assert.match(add,/\.btn-container\s*>\s*button\s*\{[^}]*min-width:\s*0[^}]*white-space:\s*normal/);});
 t("el lightbox principal está presente y permite zoom temporal",()=>{
  assert.match(index,/id="lightboxImg"/); assert.match(add,/id="lightbox-img"/);
  assert.match(add,/window\.abrirLightbox\(/);
  assert.match(lightbox,/previousViewportContent\s*=\s*viewport\.getAttribute\(['"]content['"]\)/);
  assert.match(lightbox,/maximum-scale=5\.0, user-scalable=yes/);
 });
 t("Lightbox restaura el viewport original al cerrar",()=>{
  assert.match(lightbox,/const restoreViewportContent = previousViewportContent \|\|/);
  assert.equal((lightbox.match(/setAttribute\('content', restoreViewportContent\)/g)||[]).length,2);
 });
 t("ciclo Lightbox conserva viewport permisivo previo",()=>{
  const initial="width=device-width, initial-scale=1.0",h=harness(lightbox,initial);
  h.api.abrirLightbox("x"); assert.match(h.vp.content,/maximum-scale=5\.0, user-scalable=yes/);
  h.api.cerrarLightbox(); h.timers.forEach(fn=>fn()); assert.equal(h.vp.content,initial);
 });
 t("ciclo Lightbox restaura viewport restringido previo",()=>{
  const initial="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",h=harness(lightbox,initial);
  h.api.abrirLightbox("x"); h.api.cerrarLightbox(); h.timers.forEach(fn=>fn()); assert.equal(h.vp.content,initial);
 });
 t("cierre conserva limpieza de imagen y callback",()=>{
  assert.match(lightbox,/lightboxImg\.style\.transform = ''/);
  assert.match(lightbox,/lightboxImg\.style\.zoom = ''/);
  assert.match(lightbox,/handleViewportChange/);
 });
 t("cierre temporal e historial conservados",()=>{
  assert.match(lightbox,/lightbox\.classList\.remove\('visible'\)/);
  assert.match(lightbox,/window\.history\.back\(\)/);
 });
 return {status:"PASS",checks:names.length,cases:names};
}
const result=runBrowserZoomAccessibilityTests({index:read("index.html"),users:read("HTML/users.html"),add:read("HTML/add_cortes.html"),lightbox:read("JS/Frontend/lightbox.js")});
console.log(result.checks+"/"+result.checks+" PASS");
