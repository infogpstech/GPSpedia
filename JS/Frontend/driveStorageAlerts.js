export const DRIVE_STORAGE_CRITICAL_THRESHOLD = 80;

export function getDriveStorageCriticalState(response) {
    if (!response || response.status !== "success" || response.quotaStatus !== "available") {
        return { critical: false, usagePercent: null };
    }
    const usagePercent = Number(response.usagePercent);
    if (!Number.isFinite(usagePercent) || usagePercent < 0) {
        return { critical: false, usagePercent: null };
    }
    return {
        critical: usagePercent >= DRIVE_STORAGE_CRITICAL_THRESHOLD,
        usagePercent
    };
}

export function createDriveStorageAlertKey(dateValue, recipientId) {
    const date = String(dateValue || "").replace(/[^0-9]/g, "").slice(0, 8);
    const recipient = String(recipientId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
    if (date.length !== 8 || !recipient) throw new Error("La clave de alerta Drive no es válida.");
    return "drive80_" + date + "_" + recipient;
}
