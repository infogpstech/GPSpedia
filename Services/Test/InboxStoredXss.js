function runInboxStoredXssTests(sources) {
    const ui = String(sources.ui || "");
    const results = [];
    let passed = 0;
    let failed = 0;
    const assert = (condition, message) => { if (!condition) throw new Error(message || "Aserción fallida"); };
    const run = (name, test) => {
        try { test(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const extract = name => {
        const start = ui.indexOf("export function " + name + "(");
        assert(start >= 0, "No se encontró " + name);
        const candidates = ["\nexport function ", "\nfunction "]
            .map(marker => ui.indexOf(marker, start + 10)).filter(index => index >= 0);
        const end = candidates.length ? Math.min(...candidates) : ui.length;
        return ui.slice(start, end).trim();
    };
    const functions = {
        list: extract("renderInboxList"),
        detail: extract("renderInboxDetail"),
        report: extract("openReportCutModal"),
        suggest: extract("openSuggestCutModal"),
        success: (() => { const start = ui.indexOf("function showReportSuccessModal("); const end = ui.indexOf("\nexport function openSuggestCutModal", start); assert(start >= 0 && end > start); return ui.slice(start, end).trim(); })()
    };
    const parseFunction = source => new Function("return (" + source.replace(/^export\s+/, "") + ");")();

    Object.entries(functions).forEach(([name, source]) => {
        run(name + " tiene sintaxis JavaScript válida", () => assert(typeof parseFunction(source) === "function"));
    });

    run("Inbox lista no usa innerHTML", () => {
        assert(!/innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/.test(functions.list));
        assert(/title\.textContent\s*=\s*String\(item\.subject/.test(functions.list));
        assert(/appendChild\(itemDiv\)/.test(functions.list));
    });
    run("Inbox lista muestra subject e ID como texto", () => {
        assert(/item\.subject\s*\|\|\s*`ID: \$\{item\.id/.test(functions.list));
        assert(/title\.textContent/.test(functions.list));
    });
    run("Inbox detalle usa sanitizador solo para contenido enriquecido", () => {
        assert(/messageBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(item\.content/.test(functions.detail));
        assert(/replyBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(item\.reply/.test(functions.detail));
    });
    run("Inbox detalle no interpola campos externos en HTML", () => {
        assert(!/innerHTML\s*=\s*`[^;]*\$\{\s*(?:item|reportMetadata|suggestionData|proposedValues|vehicleLabel)/s.test(functions.detail));
        ["item.subject", "item.user", "item.vehicleId", "reportMetadata.reportId", "suggestionData.reportId",
         "proposedValues.tipo", "proposedValues.ubicacion", "item.responder", "item.contentType"].forEach(field => {
            assert(!new RegExp("innerHTML\\s*=\\s*`[^;]*\\$\\{\\s*" + field.replace(".", "\\.") + "(?![A-Za-z0-9_])", "s").test(functions.detail), field + " interpolado en HTML");
        });
    });
    run("Inbox detalle asigna datos visibles mediante textContent/nodos", () => {
        ["item.subject", "item.user", "reportMetadata.reportId", "suggestionData.reportId",
         "proposedValues.tipo", "proposedValues.ubicacion", "item.contentType"].forEach(field => {
            assert(functions.detail.includes(field), "Falta uso de " + field);
        });
        assert(/element\.textContent\s*=\s*String\(text\)/.test(functions.detail));
        assert(/document\.createTextNode/.test(functions.detail));
    });
    run("Inbox detalle limita URL de YouTube a HTTPS y hosts permitidos", () => {
        assert(/parsedVideoUrl\.protocol\s*===\s*'https:'/.test(functions.detail));
        assert(/youtube\.com.*youtu\.be/.test(functions.detail));
        assert(/videoLink\.rel\s*=\s*'noopener noreferrer'/.test(functions.detail));
    });
    run("Inbox detalle limita imagen a host Drive y fija rel seguro", () => {
        assert(/\^https:\\\/\\\/drive\\\.google\\\.com\\\//i.test(functions.detail));
        assert(/imageLink\.rel\s*=\s*'noopener noreferrer'/.test(functions.detail));
    });
    run("confirmación de reporte usa plantilla estática y reportId como texto", () => {
        assert(typeof parseFunction(functions.success) === "function");
        const start = functions.success.indexOf("content.innerHTML = `");
        const end = functions.success.indexOf("`; ", start);
        const template = functions.success.slice(start, functions.success.indexOf("`;", start) + 1);
        assert(start >= 0 && template.length > 0);
        assert(!template.includes("${"));
        assert(functions.success.includes('identity.querySelector("strong").textContent = String(reportId || "")'));
    });
    run("modal de reporte usa plantilla estática", () => {
        const template = functions.report.match(/content\.innerHTML\s*=\s*`([\s\S]*?)`;/);
        assert(template, "No se encontró plantilla del reporte");
        assert(!/\$\{/.test(template[1]), "Plantilla contiene interpolación");
        assert(/currentCutData\.tipo/.test(functions.report) && /summary\.querySelector\('strong'\)\.textContent/.test(functions.report));
        assert(/String\(corteNum\)/.test(functions.report));
    });
    run("modal de sugerencia usa plantilla estática", () => {
        const template = functions.suggest.match(/content\.innerHTML\s*=\s*`([\s\S]*?)`;/);
        assert(template, "No se encontró plantilla de sugerencia");
        assert(!/\$\{/.test(template[1]), "Plantilla contiene interpolación");
        assert(/reportStrong\.textContent\s*=\s*String\(reportRef\)/.test(functions.suggest));
        assert(/vehicleStrong\.textContent\s*=\s*String\(vehicleId\)/.test(functions.suggest));
    });
    run("dropdownOptions se crea con option.value y option.textContent", () => {
        assert(/option\.value\s*=\s*value/.test(functions.suggest));
        assert(/option\.textContent\s*=\s*value/.test(functions.suggest));
        assert(/select\.appendChild\(option\)/.test(functions.suggest));
        assert(!/\$\{(?:tipoOptionsHtml|relayOptionsHtml)/.test(functions.suggest));
    });
    run("currentCutData llena valores de formulario mediante value", () => {
        assert(/#sug-ubicacion"\)\.value\s*=\s*String\(currentCutData\.ubicacion/.test(functions.suggest));
        assert(/#sug-color"\)\.value\s*=\s*String\(currentCutData\.colorCable/.test(functions.suggest));
    });
    run("los cuatro componentes no interpolan datos externos en plantillas HTML", () => {
        const payloadFields = ["item.subject", "item.user", "item.vehicleId", "vehicleId", "reportRef",
            "reportId", "currentCutData.tipo", "currentCutData.ubicacion", "currentCutData.colorCable",
            "optionValue", "reportMetadata.reportId", "proposedValues.tipo"];
        [functions.list, functions.detail, functions.report, functions.suggest].forEach(source => {
            const assignments = [...source.matchAll(/(?:innerHTML|outerHTML)\s*=\s*`([\s\S]*?)`/g)];
            assignments.forEach(match => payloadFields.forEach(field => {
                assert(!match[1].includes("${" + field), "Interpolación peligrosa: " + field);
            }));
        });
    });

    const payloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)><circle /></svg>',
        '<div onclick="alert(1)" onmouseover="alert(2)">x</div>',
        '" autofocus onfocus="alert(1)',
        "'><iframe srcdoc='<script>alert(1)</script>'></iframe>",
        '<a href="javascript:alert(1)">abrir</a>'
    ];
    run("matriz de payloads almacenados no tiene sinks de interpolación", () => {
        assert(payloads.length >= 7);
        const source = Object.values(functions).join("\n");
        payloads.forEach(payload => {
            assert(!source.includes("${" + payload), "Payload interpolado directamente");
        });
        assert(/textContent/.test(functions.list) && /textContent/.test(functions.detail));
        assert(/option\.textContent/.test(functions.suggest));
    });
    run("el texto enriquecido conserva la frontera del sanitizador", () => {
        assert(functions.detail.split("innerHTML = sanitizeHtmlContent").length - 1 === 2);
    });

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
