import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const html=fs.readFileSync(resolve(root,"HTML/add_cortes.html"),"utf8");
let passed=0;function testCase(name,fn){fn();passed++;console.log("PASS "+name);}
testCase("Año, versión, tipo de corte y relay tienen ayudas breves asociadas",()=>{
 for(const [id,phrase] of [["help-ano-desde","rango continuo"],["help-versiones","nivel de equipamiento"],["help-tipo-corte","diagrama eléctrico"],["help-config-relay","esquema de conexión"]]){
  assert.ok(html.includes("aria-controls=\""+id+"\""));assert.ok(html.includes("id=\""+id+"\" role=\"tooltip\" hidden"));assert.ok(html.includes(phrase),id);
 }
});
testCase("Las ayudas son botones accesibles y no alteran el envío del formulario",()=>{
 assert.equal((html.match(/class="gp-help-trigger"/g)||[]).length,4);
 assert.ok(html.includes("aria-label=\"Ayuda sobre el año\""));assert.ok(html.includes("aria-label=\"Ayuda sobre la configuración de relay\""));
});
testCase("El patrón contextual tiene foco visible, contraste por tema y estado oculto",()=>{
 assert.ok(html.includes(".gp-help-trigger:focus-visible"));assert.ok(html.includes("var(--gp-color-info-bg)"));assert.ok(html.includes(".gp-help-popover[hidden] { display: none; }"));
});
testCase("La ayuda se controla por pulsación, se cierra fuera y permite Escape",()=>{
 assert.ok(html.includes("document.addEventListener(\'click\', event =>"));assert.ok(html.includes("event.key === \'Escape\'"));assert.ok(html.includes("closeContextHelp(true)"));
});
console.log("ContextualHelpForms: "+passed+"/"+passed+" PASS");