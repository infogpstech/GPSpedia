const LEGACY_KEY = "gpsepedia_edit_backup";
const PREFIX = LEGACY_KEY + ":v1:";
const QUARANTINE_PREFIX = LEGACY_KEY + ":quarantine:";
const cleanOwner = value => String(value || "").trim();
const cleanVehicle = value => String(value || "").trim();

function parseRecord(raw) {
    try {
        const value = JSON.parse(raw);
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch (_) {
        return null;
    }
}

function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== "object") return value;
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
        if (/token|password|credential|authorization/i.test(key)) continue;
        result[key] = sanitize(entry);
    }
    return result;
}

export function createEditBackupStore(storage, ownerId) {
    const owner = cleanOwner(ownerId);
    if (!storage || !owner || owner === "0") throw new TypeError("ownerId requerido");
    const keyFor = vehicleId => PREFIX + encodeURIComponent(owner) + ":" + encodeURIComponent(cleanVehicle(vehicleId));

    function quarantine(raw, reason) {
        let key = QUARANTINE_PREFIX + reason;
        let suffix = 0;
        while (storage.getItem(key) !== null && storage.getItem(key) !== raw) key = QUARANTINE_PREFIX + reason + ":" + (++suffix);
        if (storage.getItem(key) === null) storage.setItem(key, raw);
    }

    function migrateLegacy() {
        const raw = storage.getItem(LEGACY_KEY);
        if (raw === null) return "none";
        const legacy = parseRecord(raw);
        if (!legacy) {
            quarantine(raw, "invalid");
            storage.removeItem(LEGACY_KEY);
            return "quarantined";
        }
        const legacyOwner = cleanOwner(legacy.ownerId);
        const vehicleId = cleanVehicle(legacy.vehicleId || legacy.id);
        if (!legacyOwner || !vehicleId) {
            quarantine(raw, "owner-missing");
            storage.removeItem(LEGACY_KEY);
            return "quarantined";
        }
        const targetKey = PREFIX + encodeURIComponent(legacyOwner) + ":" + encodeURIComponent(vehicleId);
        const existingRaw = storage.getItem(targetKey);
        if (existingRaw !== null) {
            const existing = parseRecord(existingRaw);
            if (existing && existing.ownerId === legacyOwner && existing.vehicleId === vehicleId) {
                storage.removeItem(LEGACY_KEY);
                return "migrated";
            }
            quarantine(raw, "conflict");
            storage.removeItem(LEGACY_KEY);
            return "quarantined";
        }
        const backup = sanitize(legacy.backup && typeof legacy.backup === "object" ? legacy.backup : legacy);
        const record = { ownerId: legacyOwner, vehicleId, backup };
        storage.setItem(targetKey, JSON.stringify(record));
        const verified = parseRecord(storage.getItem(targetKey));
        if (!verified || verified.ownerId !== legacyOwner || verified.vehicleId !== vehicleId) {
            throw new Error("edit backup migration verification failed");
        }
        storage.removeItem(LEGACY_KEY);
        return "migrated";
    }

    function read(vehicleId) {
        const cleanId = cleanVehicle(vehicleId);
        if (!cleanId) return { status: "invalid", backup: null };
        const migration = migrateLegacy();
        const raw = storage.getItem(keyFor(cleanId));
        if (raw === null) return { status: migration, backup: null };
        const record = parseRecord(raw);
        if (!record || record.ownerId !== owner || record.vehicleId !== cleanId ||
            !record.backup || String(record.backup.id) !== cleanId) {
            quarantine(raw, "owner-mismatch");
            storage.removeItem(keyFor(cleanId));
            return { status: "quarantined", backup: null };
        }
        return { status: "ready", backup: sanitize(record.backup) };
    }

    function write(vehicleId, backup) {
        const cleanId = cleanVehicle(vehicleId);
        if (!cleanId || !backup || typeof backup !== "object" || String(backup.id) !== cleanId) {
            return { saved: false, reason: "invalid-backup" };
        }
        const record = { ownerId: owner, vehicleId: cleanId, backup: sanitize(backup) };
        const key = keyFor(cleanId);
        storage.setItem(key, JSON.stringify(record));
        const verified = parseRecord(storage.getItem(key));
        if (!verified || verified.ownerId !== owner || verified.vehicleId !== cleanId ||
            !verified.backup || String(verified.backup.id) !== cleanId) {
            return { saved: false, reason: "verification-failed" };
        }
        return { saved: true, backup: sanitize(verified.backup) };
    }

    function remove(vehicleId) {
        const cleanId = cleanVehicle(vehicleId);
        if (!cleanId) return false;
        const result = read(cleanId);
        if (!result.backup) return result.status === "none" || result.status === "migrated";
        storage.removeItem(keyFor(cleanId));
        return storage.getItem(keyFor(cleanId)) === null;
    }

    return { keyFor, read, write, remove };
}
