import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
const match = feedback.match(/^function handleClearActivityLogs\(payload\) \{[\s\S]*?^\}/m);
assert.ok(match, "No se encontró handleClearActivityLogs.");

function createHarness(initialRows, available = true) {
    const rows = initialRows.map(row => row.slice());
    let flushCount = 0;
    const sheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => Math.max(1, ...rows.map(row => row.length)),
        getRange(row, column, rowCount, columnCount) {
            return {
                getValues() {
                    return rows.slice(row - 1, row - 1 + rowCount)
                        .map(line => line.slice(column - 1, column - 1 + columnCount));
                },
                clearContent() {
                    for (let r = row - 1; r < row - 1 + rowCount; r++) {
                        for (let col = column - 1; col < column - 1 + columnCount; col++) {
                            if (rows[r]) rows[r][col] = "";
                        }
                    }
                }
            };
        },
        deleteRows(start, count) { rows.splice(start - 1, count); },
        deleteRow(index) { rows.splice(index - 1, 1); }
    };
    const handler = new Function(
        "getSafeSheet", "SHEET_NAMES", "COLS_ACTIVIDAD_USUARIO", "SpreadsheetApp",
        match[0] + "\nreturn handleClearActivityLogs;"
    )(
        () => available ? sheet : null,
        { ACTIVIDAD_USUARIO: "ActividadUsuario" },
        { timestamp: 2 },
        { flush() { flushCount++; } }
    );
    return { handler, rows, stats: () => ({ flushCount }) };
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("La ausencia de hoja se distingue de una limpieza efectiva", () => {
    const h = createHarness([["ID", "Timestamp"]], false);
    const result = h.handler({ keepLastWeek: true });
    assert.equal(result.status, "success");
    assert.equal(result.deletedCount, 0);
    assert.match(result.message, /no se encontró la hoja/i);
    assert.equal(h.stats().flushCount, 0);
});
check("Una hoja que solo contiene encabezados informa que no había registros", () => {
    const h = createHarness([["ID", "Timestamp"]]);
    const result = h.handler({ keepLastWeek: true });
    assert.equal(result.deletedCount, 0);
    assert.match(result.message, /no hay registros de actividad/i);
});
check("La retención de siete días elimina solo registros antiguos y conserva fechas no clasificables", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const h = createHarness([
        ["ID", "Timestamp"],
        ["OLD", oldDate],
        ["RECENT", recentDate],
        ["UNKNOWN", "fecha-inválida"]
    ]);
    const result = h.handler({ keepLastWeek: true });
    assert.equal(result.deletedCount, 1);
    assert.equal(result.unclassifiedCount, 1);
    assert.match(result.message, /Se eliminaron 1 registros/);
    assert.match(result.message, /Se conservaron 1 registros con fecha vacía o no válida/);
    assert.deepEqual(h.rows.map(row => row[0]), ["ID", "RECENT", "UNKNOWN"]);
    assert.equal(h.stats().flushCount, 1);
});
check("Si no hay registros antiguos, el mensaje no afirma que se eliminó cero registros", () => {
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const h = createHarness([["ID", "Timestamp"], ["RECENT", recentDate]]);
    const result = h.handler({ keepLastWeek: true });
    assert.equal(result.deletedCount, 0);
    assert.match(result.message, /no se encontraron registros con más de 7 días/i);
    assert.doesNotMatch(result.message, /Se eliminaron 0/);
});
check("La opción de eliminar todos conserva encabezados e informa el total real", () => {
    const h = createHarness([["ID", "Timestamp"], ["A", new Date()], ["B", "fecha-inválida"]]);
    const result = h.handler({ keepLastWeek: false });
    assert.equal(result.deletedCount, 2);
    assert.match(result.message, /Todos los registros de actividad han sido eliminados/);
    assert.deepEqual(h.rows, [["ID", "Timestamp"], ["", ""], ["", ""]]);
    assert.equal(h.stats().flushCount, 1);
});
console.log("ActivityLogsClearFeedback: " + passed + "/" + passed + " PASS");
