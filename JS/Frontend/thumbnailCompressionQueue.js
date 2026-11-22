/**
 * Limita el trabajo simultáneo de compresión de miniaturas dentro de una instancia
 * JavaScript (pestaña). Las tareas se ordenan por prioridad descendente y FIFO
 * dentro de la misma prioridad. Las llamadas sin opciones conservan FIFO histórico.
 */
export function createConcurrencyLimiter(limit = 2, options = {}) {
    const maxConcurrent = Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 2;
    let active = 0;
    let nextSequence = 0;
    const pending = [];
    const activeKeys = new Set();
    const pendingPriorityOverrides = new Map();
    const clock = options && typeof options.now === "function" ? options.now
        : () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());
    const metrics = new Map();
    function readClock() {
        const value = Number(clock());
        return Number.isFinite(value) ? value : Date.now();
    }
    function metricFor(priority) {
        const key = String(priority);
        if (!metrics.has(key)) metrics.set(key, {
            priority, enqueued: 0, started: 0, completed: 0, failed: 0,
            promoted: 0, active: 0, queued: 0,
            totalWaitMs: 0, maxWaitMs: 0, totalRunMs: 0, maxRunMs: 0
        });
        return metrics.get(key);
    }

    function sortPending() {
        pending.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    }

    function drain() {
        while (active < maxConcurrent && pending.length) {
            const job = pending.shift();
            const oldMetric = metricFor(job.priority);
            oldMetric.queued = Math.max(0, oldMetric.queued - 1);
            const startedAt = readClock();
            const waitMs = Math.max(0, startedAt - job.queuedAt);
            const metric = metricFor(job.priority);
            metric.started += 1;
            metric.active += 1;
            metric.totalWaitMs += waitMs;
            metric.maxWaitMs = Math.max(metric.maxWaitMs, waitMs);
            active += 1;
            if (job.key) activeKeys.add(job.key);
            const finish = (success, value) => {
                const runMs = Math.max(0, readClock() - startedAt);
                active -= 1;
                metric.active = Math.max(0, metric.active - 1);
                if (job.key) activeKeys.delete(job.key);
                metric.totalRunMs += runMs;
                metric.maxRunMs = Math.max(metric.maxRunMs, runMs);
                if (success) { metric.completed += 1; job.resolve(value); }
                else { metric.failed += 1; job.reject(value); }
                drain();
            };
            Promise.resolve().then(job.task)
                .then(value => finish(true, value), error => finish(false, error));
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
            const metric = metricFor(priority);
            metric.enqueued += 1;
            metric.queued += 1;
            pending.push({ task, resolve, reject, priority, sequence: nextSequence++, key, queuedAt: readClock() });
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
                const oldMetric = metricFor(job.priority);
                oldMetric.queued = Math.max(0, oldMetric.queued - 1);
                job.priority = nextPriority;
                const newMetric = metricFor(nextPriority);
                newMetric.queued += 1;
                newMetric.promoted += 1;
                sortPending();
            }
            return true;
        }
        pendingPriorityOverrides.set(normalizedKey, nextPriority);
        return true;
    }

    function clearPromotion(key) {
        const normalizedKey = String(key === undefined || key === null ? "" : key);
        if (!normalizedKey) return false;
        return pendingPriorityOverrides.delete(normalizedKey);
    }

    function getStats() {
        return { limit: maxConcurrent, active, queued: pending.length };
    }

    function getPriorityStats() {
        const priorities = {};
        metrics.forEach((metric, key) => {
            priorities[key] = {
                active: metric.active, queued: metric.queued,
                enqueued: metric.enqueued, started: metric.started,
                completed: metric.completed, failed: metric.failed,
                promoted: metric.promoted
            };
        });
        return { active, queued: pending.length, priorities };
    }

    function getMetrics() {
        const priorities = {};
        metrics.forEach((metric, key) => { priorities[key] = { ...metric }; });
        return { limit: maxConcurrent, active, queued: pending.length, priorities };
    }

    return { run, promote, clearPromotion, getStats, getPriorityStats, getMetrics };
}

export const MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS = 2;
export const thumbnailCompressionQueue = createConcurrencyLimiter(MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS);
