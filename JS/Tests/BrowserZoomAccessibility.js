import fs from "node:fs";
import assert from "node:assert/strict";
function extract(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i);return s.slice(i,j);}
function harness(src,initial){
 const vp={content:initial,getAttribute(n){return n==="content"?this.content:null;},setAttribute(n,v){if(n==="content")this.content=v;}},cl=new Set(),img={src:"",style:{}},box={classList:{contains:n=>cl.has(n),add:n=>cl.add(n),remove:n=>cl.delete(n)},querySelector:()=>img},timers=[];
 const win={inEditMode:false,history:{state:{},pushState(){},back(){}},handleViewportChange(){}},doc={querySelector:s=>s==='meta[name="viewport"]'?vp:null,getElementById:id=>id==="lightbox"?box:(id==="lightboxImg"||id==="lightbox-img"?img:null)};
 const f=new Function("window","document","setTimeout","initLightboxEvents","actualizarBotonesLightbox",extract(src,"function abrirLightbox(","/**\n * Cierra el lightbox")+extract(src,"function cerrarLightbox(","// Hacemos las funciones globalmente accesibles")+";return {abrirLightbox,cerrarLightbox};");
 return {api:f(win,doc,fn=>timers.push(fn),()=>{},()=>{}),vp,timers};
}
export function runBrowserZoomAccessibilityTests({add,lightbox}){
 const names=[],t=(n,f)=>{f();names.push(n);};
 t("viewport no restringe escala",()=>{const m=add.match(/<meta[^>]+name=["']viewport["'][^>]*>/gi)||[];assert.equal(m.length,1);assert.match(m[0],/width=device-width/);assert.match(m[0],/initial-scale=1/);assert.doesNotMatch(m[0],/maximum-scale|user-scalable/i);});
 t("no cancela zoom por rueda",()=>assert.doesNotMatch(add,/addEventListener\(\s*['"]wheel['"][\s\S]{0,500}?preventDefault/));
 t("no cancela zoom por atajos de teclado",()=>assert.doesNotMatch(add,/\[61,\s*107,\s*173,\s*109,\s*187,\s*189,\s*48,\s*96\]/));
 t("no cancela zoom multitáctil",()=>{assert.doesNotMatch(add,/addEventListener\(\s*['"]touch(?:start|move)['"][\s\S]{0,300}?touches\.length\s*>\s*1[\s\S]{0,200}?preventDefault/);assert.doesNotMatch(add,/isLightboxVisible/);});
 t("reflujo de una columna",()=>assert.match(add,/@media\s*\(max-width:\s*600px\)[\s\S]*?\.form-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/));
 t("grid permite encogimiento",()=>assert.match(add,/\.form-grid\s*>\s*\*\s*\{\s*min-width:\s*0/));
 t("acciones envuelven texto y botones",()=>{assert.match(add,/\.btn-container\s*\{\s*flex-wrap:\s*wrap/);assert.match(add,/\.btn-container\s*>\s*button\s*\{[^}]*min-width:\s*0[^}]*white-space:\s*normal/);});
 t("Lightbox guarda viewport original",()=>{assert.match(lightbox,/previousViewportContent\s*=\s*viewport\.getAttribute\(['"]content['"]\)/);assert.match(lightbox,/maximum-scale=5\.0, user-scalable=yes/);});
 t("Lightbox restaura el viewport original",()=>{assert.match(lightbox,/const restoreViewportContent = previousViewportContent \|\|/);assert.equal((lightbox.match(/setAttribute\('content', restoreViewportContent\)/g)||[]).length,2);assert.doesNotMatch(lightbox,/maximum-scale=1\.0, user-scalable=no/);});
 t("ciclo Lightbox restaura viewport permisivo",()=>{const h=harness(lightbox,"width=device-width, initial-scale=1.0");h.api.abrirLightbox("x");assert.match(h.vp.content,/maximum-scale=5\.0, user-scalable=yes/);h.api.cerrarLightbox();assert.equal(h.vp.content,"width=device-width, initial-scale=1.0");h.timers.forEach(f=>f());assert.equal(h.vp.content,"width=device-width, initial-scale=1.0");});
 t("ciclo Lightbox conserva viewport restringido ajeno",()=>{const v="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",h=harness(lightbox,v);h.api.abrirLightbox("x");h.api.cerrarLightbox();h.timers.forEach(f=>f());assert.equal(h.vp.content,v);});
 t("cierre conserva limpieza de imagen y callback",()=>{assert.match(lightbox,/lightboxImg\.style\.transform = ''/);assert.match(lightbox,/lightboxImg\.style\.zoom = ''/);assert.match(lightbox,/handleViewportChange/);});
 t("cierre temporal e historial conservados",()=>{assert.match(lightbox,/lightbox\.classList\.remove\('visible'\)/);assert.match(lightbox,/window\.history\.back\(\)/);});
 return {status:"PASS",checks:names.length,cases:names};
}
const result=runBrowserZoomAccessibilityTests({add:fs.readFileSync("add_cortes.html","utf8"),lightbox:fs.readFileSync("lightbox.js","utf8")});
console.log(JSON.stringify(result,null,2));
