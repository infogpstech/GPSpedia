import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyOptimisticUsefulState, applyConfirmedUsefulState, resolveUsefulDisplayCutIndex } from "../Frontend/likeState.js";

const catalogSource=readFileSync(new URL("../Services/catalog.js",import.meta.url),"utf8");
const uiSource=readFileSync(new URL("../Frontend/ui.js",import.meta.url),"utf8");
const start=catalogSource.indexOf("function mapCatalogVehicleRowForProjection_(");
const end=catalogSource.indexOf("\nfunction ",start+10);
assert.ok(start>=0&&end>start,"No se encontró la proyección de vehículo.");
const projectionSource=catalogSource.slice(start,end);
const project=new Function("mapRowToObject","IMAGE_FIELDS_CORTES","normalizeYouTubeUrl",
  projectionSource+"\nreturn mapCatalogVehicleRowForProjection_;")(
  row=>({...row}),{},value=>value);
const raw={id:"V-105",categoria:"Motocicleta",marca:"Yamaha",modelo:"MTN155",
  tipoCorte1:"Bomba",utilCorte1:0,tipoCorte2:"Ignición",utilCorte2:5,
  tipoCorte3:"Arranque",utilCorte3:1};
const vehicle=project(raw,{},new Map(),{});
assert.equal(vehicle.tipoCorte1,"Ignición");
assert.equal(vehicle.sourceCorteIndex1,2);
assert.equal(vehicle.sourceCorteIndex2,3);
assert.equal(vehicle.sourceCorteIndex3,1);
let state={likedCortes:[],catalogData:{cortes:[vehicle]}};
state=applyOptimisticUsefulState(state,"V-105",2,true);
assert.equal(state.catalogData.cortes[0].utilCorte1,6);
assert.equal(state.catalogData.cortes[0].utilCorte2,1);
assert.equal(resolveUsefulDisplayCutIndex(state.catalogData.cortes[0],2),1);
state=applyConfirmedUsefulState(state,"V-105",2,{isUseful:true,usefulCount:6,corteIndex:2});
assert.equal(state.catalogData.cortes[0].utilCorte1,6);
state=applyOptimisticUsefulState(state,"V-105",2,false);
assert.equal(state.catalogData.cortes[0].utilCorte1,5);
assert.ok(uiSource.includes('index: Number(activeItem["sourceCorteIndex" + i]) || i'));
assert.ok(uiSource.includes("resolveUsefulDisplayCutIndex(vehicle,c)"));
console.log("UsefulOriginalCutIndex: 4/4 PASS");
