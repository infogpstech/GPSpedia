/**
 * Renderiza el historial de actividad como texto plano.
 * Los valores almacenados se consideran datos no confiables, incluidos registros históricos.
 */
export function renderActivityLogs(container, logs, doc = container && container.ownerDocument) {
    if (!container || typeof container.replaceChildren !== "function" || !doc || typeof doc.createElement !== "function") {
        throw new TypeError("Se requiere un contenedor DOM y un documento válido.");
    }
    container.replaceChildren();
    const entries = Array.isArray(logs) ? logs : [];
    const toPlainText = value => value === null || value === undefined || !["string", "number", "boolean"].includes(typeof value) ? "" : String(value);
    entries.forEach(log => {
        const entry = log && typeof log === "object" ? log : {};
        const timestamp = new Date(entry.timestamp);
        const timestampText = Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleString();
        const row = doc.createElement("tr");
        const values = [timestampText, toPlainText(entry.nombreUsuario), toPlainText(entry.tipoActividad), toPlainText(entry.detalle)];
        values.forEach(value => { const cell = doc.createElement("td"); cell.textContent = value; row.appendChild(cell); });
        container.appendChild(row);
    });
    return container;
}

/**
 * Convierte etiquetas/separadores de colaboradores a nombres seguros y comparables.
 * Se usa solo en presentación: el backend y los datos almacenados no se modifican.
 */
export function normalizeContributionRows(contributions) {
    const entries = Array.isArray(contributions) ? contributions : [];
    const grouped = new Map();
    const toCount = value => {
        const count = Number(value);
        return Number.isFinite(count) && count > 0 ? count : 0;
    };
    const parseNames = value => {
        let source = value == null ? "" : String(value);
        source = source
            .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s*\[OP-[A-Za-z0-9_-]+\]/gi, " ");
        return source.split(/[\r\n]+/).map(name => name
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, "")
            .trim()).filter(Boolean);
    };
    const normalizeKey = value => value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es")
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    const displayName = value => value.toLocaleLowerCase("es")
        .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix, letter) => prefix + letter.toLocaleUpperCase("es"));
    entries.forEach(entry => {
        if (!entry || typeof entry !== "object") return;
        const names = Array.from(new Set(parseNames(entry.nombreUsuario).map(name => {
            const key = normalizeKey(name);
            return key ? { key, name: displayName(name) } : null;
        }).filter(Boolean).map(item => JSON.stringify(item)))).map(value => JSON.parse(value));
        const cuts = toCount(entry.cortesAportados);
        const vehicles = toCount(entry.vehiculosConAportes);
        names.forEach(({ key, name }) => {
            const current = grouped.get(key);
            if (current) {
                current.cortesAportados += cuts;
                // El servicio entrega conteos agregados, no IDs de vehículos; usar el
                // máximo evita sumar dos veces vehículos posiblemente repetidos entre alias.
                current.vehiculosConAportes = Math.max(current.vehiculosConAportes, vehicles);
            } else {
                grouped.set(key, { nombreUsuario: name, cortesAportados: cuts, vehiculosConAportes: vehicles });
            }
        });
    });
    return Array.from(grouped.values()).sort((a, b) =>
        b.cortesAportados - a.cortesAportados || a.nombreUsuario.localeCompare(b.nombreUsuario, "es"));
}

/** Renderiza el resumen de cortes aportados por usuario como texto plano. */
export function renderActivityContributions(container, contributions, doc = container && container.ownerDocument) {
    if (!container || typeof container.replaceChildren !== "function" || !doc || typeof doc.createElement !== "function") {
        throw new TypeError("Se requiere un contenedor DOM y un documento válido.");
    }
    container.replaceChildren();
    const entries = normalizeContributionRows(contributions);
    entries.forEach(entry => {
        const row = doc.createElement("tr");
        [entry.nombreUsuario, entry.cortesAportados, entry.vehiculosConAportes].forEach(value => {
            const cell = doc.createElement("td");
            cell.textContent = value == null ? "" : String(value);
            row.appendChild(cell);
        });
        container.appendChild(row);
    });
    if (!entries.length) {
        const row = doc.createElement("tr"), cell = doc.createElement("td");
        cell.colSpan = 3; cell.textContent = "Todavía no hay cortes atribuidos a usuarios.";
        row.appendChild(cell); container.appendChild(row);
    }
    return container;
}
