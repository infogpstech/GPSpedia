import assert from "node:assert/strict";
import {applyConfirmedUsefulState,applyOptimisticUsefulState,applyConfirmedLikeState} from "../Frontend/likeState.js";
let passed=0;function test(n,f){f();passed++;console.log("PASS "+n);}function fixture(n=4){return{likedCortes:[],catalogData:{cortes:[{id:"VEH-1",utilCorte1:n},{id:"VEH-2",utilCorte1:9}]}};}
test("marca útil y actualiza contador",()=>{const x=applyOptimisticUsefulState(fixture(4),"VEH-1",1,true);assert.equal(x.catalogData.cortes[0].utilCorte1,5);assert.deepEqual(x.likedCortes,["VEH-1|1"]);});
test("retira útil y descuenta contador",()=>{const s=fixture(5);s.likedCortes=["VEH-1|1"];const x=applyOptimisticUsefulState(s,"VEH-1",1,false);assert.equal(x.catalogData.cortes[0].utilCorte1,4);assert.deepEqual(x.likedCortes,[]);});
test("sincroniza contador confirmado",()=>{const s=applyOptimisticUsefulState(fixture(4),"VEH-1",1,true),x=applyConfirmedUsefulState(s,"VEH-1",1,{isUseful:true,usefulCount:7});assert.equal(x.catalogData.cortes[0].utilCorte1,7);});
test("respuesta antigua preserva intención posterior",()=>{const on=applyOptimisticUsefulState(fixture(4),"VEH-1",1,true),off=applyOptimisticUsefulState(on,"VEH-1",1,false),x=applyConfirmedUsefulState(off,"VEH-1",1,{isUseful:true,usefulCount:5});assert.equal(x.catalogData.cortes[0].utilCorte1,4);assert.deepEqual(x.likedCortes,[]);});
test("replay idempotente no incrementa",()=>{const s=fixture(5);s.likedCortes=["VEH-1|1"];const x=applyConfirmedUsefulState(s,"VEH-1",1,{isUseful:true,changed:false,usefulCount:5});assert.equal(x.catalogData.cortes[0].utilCorte1,5);});
test("wrapper legacy conserva estado útil",()=>{const x=applyConfirmedLikeState(fixture(4),"VEH-1",1,{likeCount:5});assert.equal(x.catalogData.cortes[0].utilCorte1,5);assert.deepEqual(x.likedCortes,["VEH-1|1"]);});
test("solo cambia vehículo solicitado",()=>{const x=applyOptimisticUsefulState(fixture(4),"VEH-1",1,true);assert.equal(x.catalogData.cortes[1].utilCorte1,9);});
console.log(`Useful client counter synchronization: ${passed}/7 PASS`);
