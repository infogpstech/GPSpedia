# Auditoría P2 — inicialización y renderizado UI
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`

## Alcance
Revisión estática de `JS/Frontend/main.js` y `JS/Frontend/ui.js`, centrada en puntos de inicialización, handlers globales, timers, observers y recursos temporales que puedan acumularse al reabrir paneles o renderizar contenido.

## Hallazgos y contratos
- `initializeApp` tiene un único punto de entrada: `DOMContentLoaded` cuando el DOM sigue cargando o llamada directa cuando ya está listo. No se exporta ni se invoca desde re-renderizados.
- El banner de estado del catálogo usa `dataset.bound` antes de registrar su handler y su suscripción de estado.
- Inbox reemplaza el timer de sincronización anterior antes de iniciar otro. Los listeners de conectividad se instalan una sola vez mediante `inboxConnectivityBound_`.
- El refresco global de ADMIN usa un guard de intervalo y verifica que el panel esté visible.
- Ayuda contextual y reintento online de aceptación de términos usan flags de instalación única.
- Carruseles comparten un solo listener global de `resize`.
- Menús de imágenes retiradas liberan `click` y `keydown` al cerrar.
- Modales informativos liberan listeners de `resize`/`scroll`; el ciclo de foco legal elimina `keydown` y desconecta su `MutationObserver`.
- El observer global de overlays se crea una sola vez en el App Shell y permanece durante la vida de la aplicación por diseño.

## Evidencia automatizada
Se añadió `JS/Tests/UIInitializationLifecycle.mjs` al runner. El contrato verifica estos guards y ciclos de limpieza mediante inspección estática del código.

## Limitaciones
No se ejecutó un navegador real ni se midieron DOM, memoria, CPU, red o re-render. La validación dinámica en Android/PWA/escritorio sigue pendiente de Beta aislada.

## Resultado
Auditoría estática COMPLETADA sin defecto reproducible que requiera corrección productiva. Contrato añadido; CI del HEAD actual pendiente.
