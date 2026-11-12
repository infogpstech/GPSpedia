import fs from "node:fs";
import assert from "node:assert/strict";

function extractRule(css, selector) {
    const escaped = selector.replaceAll(".", "\\.");
    const matches = [...css.matchAll(new RegExp(escaped + "\\s*\\{([^}]*)\\}", "g"))];
    assert(matches.length, "No se encontró la regla CSS: " + selector);
    return matches[matches.length - 1][1];
}

function extractTokens(css, selector) {
    const block = extractRule(css, selector);
    return Object.fromEntries(
        [...block.matchAll(/(--[a-z-]+)\s*:\s*([^;]+);/g)]
            .map(match => [match[1], match[2].trim()])
    );
}

function getToken(tokens, name) {
    assert(tokens[name], "Falta el token " + name);
    return tokens[name];
}

function toRgb(value) {
    const match = value.match(/^#([0-9a-f]{6})$/i);
    assert(match, "El color debe ser hexadecimal de seis dígitos: " + value);
    return [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
}

function luminance(value) {
    const [r, g, b] = toRgb(value).map(channel =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

export function runValidationBannerThemeTests({ css, main, ui }) {
    let passed = 0;
    let failed = 0;
    const results = [];
    const root = extractTokens(css, ":root");
    const dark = extractTokens(css, "body.dark-mode");
    const requiredTokens = [
        "--validation-bg", "--validation-border", "--validation-text", "--validation-muted",
        "--validation-input-bg", "--validation-input-border", "--validation-primary-bg",
        "--validation-primary-text", "--validation-secondary-bg", "--validation-secondary-text",
        "--validation-focus"
    ];
    const banner = extractRule(css, ".validation-banner");
    const primary = extractRule(css, ".validation-btn");
    const secondary = extractRule(css, ".validation-btn.secondary");
    const input = extractRule(css, ".validation-input");

    const test = (name, callback) => {
        try {
            callback();
            passed++;
            results.push({ name, status: "PASS" });
        } catch (error) {
            failed++;
            results.push({ name, status: "FAIL", error: error.message });
        }
    };

    test("declara todos los tokens semánticos en el tema claro y oscuro", () => {
        for (const token of requiredTokens) {
            getToken(root, token);
            getToken(dark, token);
        }
    });

    test("el tema oscuro redefine los tokens visuales del banner", () => {
        for (const token of requiredTokens) {
            assert.notEqual(dark[token], root[token], "El tema oscuro no redefine " + token);
        }
    });

    test("el banner usa el sistema body.dark-mode y no el atributo inexistente data-theme", () => {
        assert.match(css, /body\.dark-mode\s*\{/);
        assert.doesNotMatch(css, /\[data-theme\s*=\s*["']dark["']\]\s*\.validation-banner/);
        assert.match(main, /document\.body\.classList\.add\(['"]dark-mode['"]\)/);
        assert.match(main, /document\.body\.classList\.remove\(['"]dark-mode['"]\)/);
    });

    test("el banner utiliza fondo, borde y texto semánticos", () => {
        assert.match(banner, /background:\s*var\(--validation-bg\)/);
        assert.match(banner, /border:\s*1px solid var\(--validation-border\)/);
        assert.match(banner, /color:\s*var\(--validation-text\)/);
        assert.doesNotMatch(banner, /--text-primary/);
    });

    test("los botones principales y secundarios utilizan pares de tokens propios", () => {
        assert.match(primary, /background:\s*var\(--validation-primary-bg\)/);
        assert.match(primary, /color:\s*var\(--validation-primary-text\)/);
        assert.match(secondary, /background:\s*var\(--validation-secondary-bg\)/);
        assert.match(secondary, /color:\s*var\(--validation-secondary-text\)/);
        assert.doesNotMatch(secondary, /--text-primary/);
    });

    test("el campo de entrada y su placeholder usan tokens de tema", () => {
        assert.match(input, /background:\s*var\(--validation-input-bg\)/);
        assert.match(input, /border:\s*1px solid var\(--validation-input-border\)/);
        assert.match(input, /color:\s*var\(--validation-text\)/);
        assert.match(css, /\.validation-input::placeholder\s*\{[^}]*color:\s*var\(--validation-muted\)/);
    });

    test("los controles conservan un indicador de foco visible en ambos temas", () => {
        assert.match(css, /\.validation-btn:focus-visible[\s\S]*?outline:\s*2px solid var\(--validation-focus\)/);
        assert.match(css, /\.validation-input:focus-visible/);
    });

    test("el texto del banner alcanza contraste WCAG AA en ambos temas", () => {
        assert.ok(contrastRatio(root["--validation-text"], root["--validation-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-text"], dark["--validation-bg"]) >= 4.5);
        assert.ok(contrastRatio(root["--validation-muted"], root["--validation-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-muted"], dark["--validation-bg"]) >= 4.5);
    });

    test("los botones principales y secundarios alcanzan contraste WCAG AA", () => {
        assert.ok(contrastRatio(root["--validation-primary-text"], root["--validation-primary-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-primary-text"], dark["--validation-primary-bg"]) >= 4.5);
        assert.ok(contrastRatio(root["--validation-secondary-text"], root["--validation-secondary-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-secondary-text"], dark["--validation-secondary-bg"]) >= 4.5);
    });

    test("el texto del campo de entrada alcanza contraste WCAG AA", () => {
        assert.ok(contrastRatio(root["--validation-text"], root["--validation-input-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-text"], dark["--validation-input-bg"]) >= 4.5);
        assert.ok(contrastRatio(root["--validation-muted"], root["--validation-input-bg"]) >= 4.5);
        assert.ok(contrastRatio(dark["--validation-muted"], dark["--validation-input-bg"]) >= 4.5);
    });

    test("el módulo UI conserva las clases del banner, mensajes, botones y campo", () => {
        for (const name of ["validation-banner", "validation-message", "validation-btn", "validation-input"]) {
            assert.ok(ui.includes(name), "No se encontró la clase " + name + " en ui.js");
        }
    });

    test("no quedan referencias a --text-primary en el bloque del banner", () => {
        const start = css.indexOf("/* --- VALIDATION BANNER --- */");
        const end = css.indexOf("@keyframes slideDown", start);
        assert.ok(start >= 0 && end > start, "No se encontró el bloque completo del banner");
        assert.doesNotMatch(css.slice(start, end), /--text-primary/);
        assert.doesNotMatch(css.slice(start, end), /data-theme/);
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}

const result = runValidationBannerThemeTests({
    css: fs.readFileSync(new URL("../../style.css", import.meta.url), "utf8"),
    main: fs.readFileSync(new URL("../../main.js", import.meta.url), "utf8"),
    ui: fs.readFileSync(new URL("../../ui.js", import.meta.url), "utf8")
});
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
