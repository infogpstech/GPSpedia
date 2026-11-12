/* Contrato local del sistema compartido de botones GPSpedia. */
export function runButtonSystemIntegrityTests({ css, index, users, cortes, ui }) {
    const results = [];
    let passed = 0, failed = 0;
    const test = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const pages = { index, users, cortes };

    test("las tres páginas cargan una sola vez el sistema compartido", () => {
        Object.entries(pages).forEach(([name, source]) => {
            const links = source.match(/<link[^>]+href=["']button-system\.css["'][^>]*>/gi) || [];
            assert(links.length === 1, name + " debe cargar button-system.css exactamente una vez.");
        });
    });
    test("el contrato base limita estilos a elementos con .btn y mantiene target táctil", () => {
        assert(/\.btn\s*\{[\s\S]*?min-height:\s*40px/.test(css), "Falta el target táctil base de 40px.");
        assert(/\.btn\s*\{[\s\S]*?display:\s*inline-flex/.test(css), "Falta el layout base del botón.");
        assert(!/(^|[,\s])(input|select)([,\s.#:{]|$)/m.test(css), "El sistema no debe modificar inputs ni selects.");
    });
    test("existen variantes semánticas, de icono y compactas", () => {
        ["btn-primary","btn-secondary","btn-danger","btn-warning","btn-icon","btn-compact","btn-sm","btn-block"].forEach(name =>
            assert(css.includes("." + name), "Falta la clase ." + name));
        assert(/\.btn-compact,\s*\.btn-sm\s*\{[\s\S]*?min-height:\s*40px/.test(css), "Los botones compactos deben conservar 40px.");
    });
    test("los estados hover, active, focus-visible, disabled y loading están definidos", () => {
        [":hover",":active",":focus-visible",":disabled","[aria-disabled=\"true\"]",".btn-loading","[aria-busy=\"true\"]"].forEach(state =>
            assert(css.includes(state), "Falta el estado " + state));
    });
    test("el tema oscuro reemplaza los tokens de color y foco", () => {
        assert(/body\.dark-mode\s*\{[\s\S]*?--btn-primary-bg/.test(css), "Faltan tokens de botones para modo oscuro.");
        assert(css.includes("--btn-focus-ring"), "Falta el token de foco.");
    });
    test("los botones estáticos de usuarios y alta de vehículos usan el contrato", () => {
        for (const [name, source] of [["users",users],["add_cortes",cortes]]) {
            const buttons = [...source.matchAll(/<button\b([^>]*)>/gi)];
            const missing = buttons.filter(match => !/class\s*=\s*["'][^"']*\bbtn\b/i.test(match[1]));
            assert(missing.length === 0, name + " contiene botones sin .btn: " + missing.length);
        }
    });
    test("los controles especiales de index están delimitados como excepciones", () => {
        const buttons = [...index.matchAll(/<button\b([^>]*)>/gi)];
        const missing = buttons.filter(match => !/class\s*=\s*["'][^"']*\bbtn\b/i.test(match[1]));
        const ids = missing.map(match => (match[1].match(/id=["']([^"']+)/i) || [])[1]).sort();
        assert(JSON.stringify(ids) === JSON.stringify(["clear-search-btn","debug-clear","debug-close","hamburger-btn","replaced-image-lightbox-close"].sort()),
            "Cambió el inventario de excepciones especializadas de index.html: " + ids.join(", "));
    });
    test("los controles dinámicos especializados conservan sus clases propias", () => {
        ["carousel-btn","validation-btn","share-modal-btn","info-close-btn","btn-expand-plus","accordion-btn",
         "feedback-btn-overlay","btn-link","cable-carousel-btn","backBtn","btn-primary","btn-secondary"].forEach(name =>
            assert(ui.includes('className = "' + name + '"') || ui.includes("className = '" + name + "'") ||
                ui.includes('className = "' + name + " ") || ui.includes("className = '" + name + " "),
                "No se encontró el control especializado " + name));
    });
    test("la regla de carga mantiene el indicador centrado y respeta movimiento reducido", () => {
        assert(/\.btn-loading::after[\s\S]*?animation:\s*spin-button/.test(css), "Falta el indicador de carga.");
        assert(css.includes("prefers-reduced-motion: reduce"), "Falta prefers-reduced-motion.");
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}