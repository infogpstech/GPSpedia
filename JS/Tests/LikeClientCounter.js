import assert from "node:assert/strict";
import { applyConfirmedLikeState } from "../../likeState.js";
let passed = 0;
function test(name, callback) { callback(); passed++; console.log("PASS " + name); }
function fixture(count = 4) {
    return { likedCortes: [], catalogData: { cortes: [{ id: "VEH-1", utilCorte1: count }, { id: "VEH-2", utilCorte1: 9 }] } };
}
test("usa el contador confirmado en un like nuevo", () => {
    const next = applyConfirmedLikeState(fixture(4), "VEH-1", 1, { status: "success", alreadyLiked: false, likeCount: 5 });
    assert.equal(next.catalogData.cortes[0].utilCorte1, 5); assert.deepEqual(next.likedCortes, ["VEH-1-1"]);
});
test("un reintento idempotente no vuelve a incrementar el contador", () => {
    const next = applyConfirmedLikeState(fixture(5), "VEH-1", 1, { status: "success", alreadyLiked: true, likeCount: 5 });
    assert.equal(next.catalogData.cortes[0].utilCorte1, 5);
});
test("una recuperación pendiente sincroniza el valor final del servidor", () => {
    const next = applyConfirmedLikeState(fixture(4), "VEH-1", 1, { status: "success", recovered: true, likeCount: 5 });
    assert.equal(next.catalogData.cortes[0].utilCorte1, 5);
});
test("no duplica la marca local de un like ya registrado", () => {
    const state = fixture(5); state.likedCortes = ["VEH-1-1"];
    const next = applyConfirmedLikeState(state, "VEH-1", 1, { status: "success", alreadyLiked: true, likeCount: 5 });
    assert.deepEqual(next.likedCortes, ["VEH-1-1"]);
});
test("no modifica el contador si la respuesta no contiene un entero válido", () => {
    const next = applyConfirmedLikeState(fixture(4), "VEH-1", 1, { status: "success", alreadyLiked: true });
    assert.equal(next.catalogData.cortes[0].utilCorte1, 4);
});
test("actualiza solo el vehículo y corte solicitados", () => {
    const next = applyConfirmedLikeState(fixture(4), "VEH-1", 1, { status: "success", likeCount: 5 });
    assert.equal(next.catalogData.cortes[1].utilCorte1, 9);
});
console.log(`Like client counter synchronization: ${passed}/6 PASS`);
