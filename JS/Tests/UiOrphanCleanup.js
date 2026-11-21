function runUiOrphanCleanupTests({index, ui, main}) {
    const results = [];
    const check = (name, condition, message) => results.push({name, status: condition ? 'PASS' : 'FAIL', message: condition ? '' : message});
    const legacyIds = ['debug-console', 'debug-header', 'debug-clear', 'debug-close', 'debug-log', 'debug-resize-handle'];
    check('markup de consola legacy retirado', legacyIds.every(id => !index.includes(id)), 'index.html conserva uno o más IDs legacy.');
    check('referencias JS a consola legacy retiradas', !ui.includes("getElementById('debug-console')") && !ui.includes("'debug-log'") && !ui.includes('"debug-log"'), 'ui.js conserva referencias a debug-console/debug-log.');
    check('panel administrativo activo preservado', index.includes('id="dev-console-log"') && ui.includes("getElementById('dev-console-log')"), 'dev-console-log debe seguir disponible y conectado.');
    check('clearModalNavStack conserva contrato y consumidor', ui.includes('export function clearModalNavStack') && main.includes('ui.clearModalNavStack()'), 'clearModalNavStack debe permanecer exportada y consumida por main.js.');
    check('loadAndRenderInbox conserva contrato público', ui.includes('export async function loadAndRenderInbox') && main.includes('window.ui = ui'), 'loadAndRenderInbox debe permanecer como export UI expuesto.');
    const inboxCalls = (ui.match(/loadAndRenderInbox\s*\(/g) || []).length;
    check('loadAndRenderInbox conserva flujo interno', inboxCalls >= 8 && ui.includes('export async function openInbox()'), 'Se esperaba conservar la carga del Inbox y sus llamadas internas.');
    const passed = results.filter(x => x.status === 'PASS').length;
    return {passed, failed: results.length - passed, total: results.length, results};
}
