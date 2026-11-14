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
