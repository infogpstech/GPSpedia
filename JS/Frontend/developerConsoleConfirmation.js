const affirmative = new Set(["y", "si", "s", "ok"]);
const negative = new Set(["n", "no"]);

/** true = afirmativa, false = negativa, null = respuesta ambigua/no válida. */
export function parseDeveloperConsoleConfirmation(value) {
    const normalized = String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    if (affirmative.has(normalized)) return true;
    if (negative.has(normalized)) return false;
    return null;
}
