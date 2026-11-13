import assert from "node:assert/strict";

export function runPysAccordionTitleTests({ ui, css }) {
    const results = [];
    let passed = 0, failed = 0;
    function test(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }

    test("usa exactamente el título aprobado por AUD-T-012", () => {
        assert.match(ui, /<span class="accordion-title">Problemas relacionados a este vehículo<\/span>/);
        assert.equal((ui.match(/Problemas relacionados a este vehículo/g) || []).length, 1);
    });
    test("separa el texto del acordeón de su indicador visual", () => {
        assert.match(ui, /accordion-title[^>]*>[\s\S]*?<\/span><span class="accordion-arrow">/);
    });
    test("el título anterior ya no aparece en la interfaz", () => {
        assert.doesNotMatch(ui, /Posibles problemas/);
    });
    test("el texto hereda el contraste del botón en modo claro y oscuro", () => {
        assert.match(css, /\.accordion-btn\s*\{[^}]*color:\s*#007bff;/);
        assert.match(css, /\.dark-mode \.accordion-btn\s*\{[^}]*color:\s*var\(--button-text\);/);
    });
    test("el texto puede ocupar el espacio disponible sin desplazar la flecha", () => {
        assert.match(css, /\.accordion-btn \.accordion-title\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-width:\s*0;/);
        assert.match(css, /\.accordion-btn \.accordion-arrow\s*\{[^}]*flex:\s*0 0 20px;/);
    });
    test("el título puede ajustarse en pantallas móviles", () => {
        assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*?\.accordion-btn \.accordion-title\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
