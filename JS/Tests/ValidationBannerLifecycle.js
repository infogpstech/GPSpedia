import assert from "node:assert/strict";
import { startValidationBannerForModal } from "../../validationBannerLifecycle.js";
let passed = 0;
async function test(name, callback) { await callback(); passed++; console.log("PASS " + name); }
function setup(vehicleId = "vehicle-1") {
    const detailContainer = { isConnected: true };
    globalThis.document = { getElementById: id => id === "detalleCompleto" ? detailContainer : null };
    return { modalElement: { dataset: { modalType: "corte", vehicleId }, classList: { contains: value => value === "visible" } }, detailContainer };
}
await test("inicia aunque no exista imagen principal ni imagen de corte", async () => {
    const { modalElement, detailContainer } = setup(); let checked = 0, shown = 0;
    const result = await startValidationBannerForModal({ item: { id: "vehicle-1" }, modalElement, detailContainer, checkEligibility: async () => { checked++; return { eligible: true }; }, showBanner: () => { shown++; } });
    assert.equal(result, true); assert.equal(checked, 1); assert.equal(shown, 1);
});
await test("no depende de imágenes ausentes, rotas, lazy o cargadas", async () => {
    for (const state of ["ausente", "rota", "lazy", "cargada"]) {
        const { modalElement, detailContainer } = setup(); let shown = 0;
        await startValidationBannerForModal({ item: { id: "vehicle-1", imageState: state }, modalElement, detailContainer, checkEligibility: async () => ({ eligible: true }), showBanner: () => { shown++; } });
        assert.equal(shown, 1, state);
    }
});
await test("varios cortes en el mismo modal no duplican la solicitud ni el banner", async () => {
    const { modalElement, detailContainer } = setup(); let checked = 0, shown = 0;
    const options = { item: { id: "vehicle-1" }, modalElement, detailContainer, checkEligibility: async () => { checked++; return { eligible: true }; }, showBanner: () => { shown++; } };
    const results = await Promise.all([startValidationBannerForModal(options), startValidationBannerForModal(options), startValidationBannerForModal(options)]);
    assert.equal(checked, 1); assert.equal(shown, 1); assert.equal(results.filter(Boolean).length, 1);
});
await test("descarta resultado tardío tras navegar a otro vehículo", async () => {
    const { modalElement, detailContainer } = setup(); let resolveEligibility, shown = 0;
    const pending = startValidationBannerForModal({ item: { id: "vehicle-1" }, modalElement, detailContainer, checkEligibility: () => new Promise(resolve => { resolveEligibility = resolve; }), showBanner: () => { shown++; } });
    modalElement.dataset.vehicleId = "vehicle-2"; resolveEligibility({ eligible: true });
    assert.equal(await pending, false); assert.equal(shown, 0);
});
await test("descarta resultado tardío si el modal se cerró", async () => {
    const { modalElement, detailContainer } = setup(); let resolveEligibility, shown = 0;
    const pending = startValidationBannerForModal({ item: { id: "vehicle-1" }, modalElement, detailContainer, checkEligibility: () => new Promise(resolve => { resolveEligibility = resolve; }), showBanner: () => { shown++; } });
    modalElement.classList.contains = () => false; resolveEligibility({ eligible: true });
    assert.equal(await pending, false); assert.equal(shown, 0);
});
await test("no muestra banner para un vehículo no elegible", async () => {
    const { modalElement, detailContainer } = setup(); let shown = 0;
    const result = await startValidationBannerForModal({ item: { id: "vehicle-1" }, modalElement, detailContainer, checkEligibility: async () => ({ eligible: false }), showBanner: () => { shown++; } });
    assert.equal(result, false); assert.equal(shown, 0);
});
console.log("Validation banner lifecycle: " + passed + "/6 PASS");
