/**
 * Limita el trabajo simultáneo de compresión de miniaturas dentro de una instancia
 * JavaScript (pestaña). Las tareas se ordenan por prioridad descendente y FIFO
 * dentro de la misma prioridad. Las llamadas sin opciones conservan FIFO histórico.
 */
export function createConcurrencyLimiter(limit = 2) {
    const maxConcurrent = Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 2;
    let active = 0;
    let nextSequence = 0;
    const pending = [];
    const activeKeys = new Set();
    const pendingPriorityOverrides = new Map();

    function sortPending() {
        pending.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    }

    function drain() {
        while (active < maxConcurrent && pending.length) {
            const job = pending.shift();
            active += 1;
            if (job.key) activeKeys.add(job.key);
            Promise.resolve()
                .then(job.task)
                .then(
                    value => {
                        active -= 1;
                        if (job.key) activeKeys.delete(job.key);
                        job.resolve(value);
                        drain();
                    },
                    error => {
                        active -= 1;
                        if (job.key) activeKeys.delete(job.key);
                        job.reject(error);
                        drain();
                    }
                );
        }
    }

    function run(task, options = {}) {
        if (typeof task !== "function") {
            return Promise.reject(new TypeError("La tarea de compresión debe ser una función."));
        }
        const key = options && options.key !== undefined && options.key !== null
            ? String(options.key) : "";
        let priority = Number.isFinite(Number(options && options.priority))
            ? Number(options.priority) : 0;
        if (key && pendingPriorityOverrides.has(key)) {
            priority = Math.max(priority, pendingPriorityOverrides.get(key));
            pendingPriorityOverrides.delete(key);
        }
        return new Promise((resolve, reject) => {
            pending.push({ task, resolve, reject, priority, sequence: nextSequence++, key });
            sortPending();
            drain();
        });
    }

    function promote(key, priority = 1) {
        const normalizedKey = String(key === undefined || key === null ? "" : key);
        const nextPriority = Number(priority);
        if (!normalizedKey || !Number.isFinite(nextPriority) || activeKeys.has(normalizedKey)) return false;
        const job = pending.find(entry => entry.key === normalizedKey);
        if (job) {
            if (nextPriority > job.priority) {
                job.priority = nextPriority;
                sortPending();
            }
            return true;
        }
        pendingPriorityOverrides.set(normalizedKey, nextPriority);
        return true;
    }

    function getStats() {
        return { limit: maxConcurrent, active, queued: pending.length };
    }

    function getPriorityStats() {
        const priorities = {};
        pending.forEach(job => {
            const key = String(job.priority);
            priorities[key] = (priorities[key] || 0) + 1;
        });
        return { active, queued: pending.length, priorities };
    }

    return { run, promote, getStats, getPriorityStats };
}

export const MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS = 2;
export const thumbnailCompressionQueue = createConcurrencyLimiter(MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS);
