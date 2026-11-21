import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../Services/write.js",import.meta.url),"utf8");
function extract(name){
 const start=source.indexOf("function "+name+"(");assert.ok(start>=0,"No se encontró "+name);
 const end=source.indexOf("\nfunction ",start+10);return source.slice(start,end<0?source.length:end);
}
const helper=extract("shouldLoadExistingEntitiesForCut_");
const handler=extract("handleAppendExistingVehicleCut_");
assert.match(handler,/shouldLoadExistingEntitiesForCut_\(incomingVehicleData\) \? getExistingEntities\(sheet\) : null/);
assert.match(handler,/if \(entities\) \{/);
const shouldLoad=new Function(helper+"\nreturn shouldLoadExistingEntitiesForCut_;")();
const cases=[
 [{imagenVehiculo:"data:image/png;base64,AA==",categoria:"SUV",anoDesde:"2020"},false],
 [{},false],
 [{marca:"Toyota"},true],
 [{modelo:"Hilux"},true],
 [{versionesAplicables:"2020-2024"},true],
 [{marca:"   "},true]
];
for(const [input,expected] of cases) assert.equal(shouldLoad(input),expected,JSON.stringify(input));
console.log("WriteEntityCatalogDemand: 8/8 PASS — solo consulta catálogo cuando hay marca/modelo/versiones entrantes");
