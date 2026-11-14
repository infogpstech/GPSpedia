import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
let source=fs.readFileSync(resolve(root,"JS/Frontend/clientInteractionPolicy.js"),"utf8");
source=source.replace("export function installClientInteractionGuards","function installClientInteractionGuards")
 .replace(/if\(typeof document!=='undefined'\)installClientInteractionGuards\(document\);?/,"");
const install=new Function(source+"\nreturn installClientInteractionGuards;")();
const listeners={};
const documentRef={addEventListener:(name,callback)=>{(listeners[name]||(listeners[name]=[])).push(callback);}};
function target(type){
 return {nodeType:1,parentElement:null,closest(selector){
  if(type==="editable"&&selector.includes("input"))return this;
  if(type==="image"&&selector.includes("img"))return this;
  if(type==="picture"&&selector.includes("picture"))return this;
  if(type==="media-attribute"&&selector.includes("data-protect-media"))return this;
  return null;
 }};
}
function dispatch(name,type){
 let prevented=false;
 const event={target:target(type),preventDefault(){prevented=true;}};
 (listeners[name]||[]).forEach(fn=>fn(event));
 return prevented;
}
const checks=[];
function test(name,fn){fn();checks.push(name);console.log("PASS "+name);}
test("Instala los listeners una sola vez por documento",()=>{
 assert.equal(install(documentRef),true);assert.equal(install(documentRef),false);
 for(const name of ["contextmenu","copy","cut","selectstart","dragstart"])assert.equal(listeners[name].length,1);
});
test("Bloquea menú contextual y copia/corte sobre imágenes",()=>{
 for(const action of ["contextmenu","copy","cut"])assert.equal(dispatch(action,"image"),true,action);
});
test("Bloquea selección y arrastre de imágenes y medios marcados",()=>{
 assert.equal(dispatch("selectstart","image"),true);
 assert.equal(dispatch("dragstart","image"),true);
 assert.equal(dispatch("contextmenu","picture"),true);
 assert.equal(dispatch("copy","media-attribute"),true);
});
test("No bloquea selección, copia ni menú contextual del texto normal",()=>{
 for(const action of ["contextmenu","copy","cut","selectstart","dragstart"])assert.equal(dispatch(action,"text"),false,action);
});
test("No bloquea controles editables aunque estén dentro de zonas de medios",()=>{
 for(const action of ["contextmenu","copy","cut","selectstart"])assert.equal(dispatch(action,"editable"),false,action);
});
console.log("ClientInteractionPolicy: "+checks.length+"/"+checks.length+" PASS");
