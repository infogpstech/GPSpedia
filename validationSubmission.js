export async function confirmValidationBeforeCache(sendRequest, saveLocalCache) {
    if (typeof sendRequest !== "function") throw new TypeError("Se requiere una función para enviar la validación al servidor.");
    const response = await sendRequest();
    if (!response || !["success", "info", "warning"].includes(response.status)) throw new Error("El servidor no confirmó el registro de la validación.");
    const recorded = response.recorded === true || (response.recorded !== false && response.status !== "info");
    let cacheSaved = null;
    if (recorded && typeof saveLocalCache === "function") {
        try { await saveLocalCache(); cacheSaved = true; } catch (error) { cacheSaved = false; }
    }
    return { response, recorded, cacheSaved };
}
