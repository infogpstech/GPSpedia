# Tareas de validación Beta — GPSpedia

Fecha de consolidación: 2026-11-15  
Rama: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`

Este registro reúne los hallazgos informados durante las pruebas Beta. La implementación local, las pruebas automatizadas y la validación en el deployment/navegador Beta se consideran estados distintos. Ninguna tarea se marca como validada en campo sin evidencia del entorno Beta.

## A. Inicio de sesión, catálogo e IndexedDB

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-001 | Timeout al leer catálogo local; IndexedDB bloqueada o inicialización expirada; fallos al guardar catálogo, historial de búsqueda y elementos vistos. | **Corrección local aplicada** en `offline.js`: `onblocked` ya no rechaza la apertura viva; se conserva una sola solicitud y cada consumidor tiene timeout acotado. Pruebas de recuperación actualizadas. Pendiente reproducir en Android/PWA Beta, con varias pestañas y almacenamiento existente. |
| BETA-002 | Feed de catálogo rechazado por Coordinator con «Servicio no autorizado para el coordinador compartido»; la traza Beta apunta a `routeAction/getCatalogChanges`. | En la revisión actual, FEEDBACK/Coordinator disponen de ruta GET pública de solo lectura; la traza compartida no coincide con ese flujo. Verificar URL y deployment efectivo de FEEDBACK/Coordinator, versión cliente y Service Worker. Aceptación: GET de feed responde con cursor válido sin usar canal de mutación; escrituras continúan autenticadas. |
| BETA-003 | El cliente Beta emite `Timeout local`, texto que no coincide con el `auth.js` actual revisado. | Verificar recursos servidos, caché y versión real de Service Worker. Aceptación: cliente carga los recursos de la rama y no conserva JS obsoleto. No borrar datos locales ni ejecutar `deleteDatabase` como solución. |
| BETA-004 | Persistencia local no debe impedir que el catálogo remoto se muestre. | Mantener degradación tolerante: catálogo remoto visible si IndexedDB no está disponible; reintento de persistencia sin bloquear el login ni crear aperturas duplicadas. Validar en Beta. |

## B. Funciones exclusivas de Desarrollador y permisos

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-010 | No permite borrar logs. | Auditoría de la rama: rutas ADMIN/AUTH y matriz de capacidades identificadas como exclusivas de Desarrollador. Revisar contrato frontend→router→Coordinator→handler y probar en Beta. Aceptación: Desarrollador puede borrar con confirmación; otros roles reciben rechazo; no se borran logs ajenos a la operación solicitada. |
| BETA-011 | No permite ejecutar auditoría de carpeta/Drive. | Auditar permisos de lectura frente a operaciones destructivas; mantener mínimo privilegio. Probar lectura, auditoría y mutación por separado en Beta. |
| BETA-012 | No permite consultar imágenes históricas/reemplazadas. | Auditar dispatcher, lease, política del Coordinator y lectura de referencias. Aceptación: consulta histórica disponible al Desarrollador y operaciones de cambio protegidas por separado. |
| BETA-013 | Funciones ADMIN demasiado lentas o bloqueadas al coincidir solicitudes. | Revisar leases y concurrencia; lecturas compatibles no deben bloquearse innecesariamente, pero escrituras sobre recursos compartidos deben seguir serializadas. Medir carga simultánea de auditoría e historial. |
| BETA-014 | Auditoría general de todas las acciones exclusivas de Desarrollador. | Verificar cada función en matriz, frontend, router, Coordinator y handler; evitar depender únicamente de ocultar botones. Añadir pruebas positivas y negativas por rol. |

## C. Estandarización global de interfaz

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-020 | Botones de cierre de modales inconsistentes; algunos con estilo, semitransparentes o texto «Cerrar». | Unificar con el patrón visual del modal Desarrollador: mismo icono, tamaño, posición, foco, hover y accesibilidad en todos los modales. |
| BETA-021 | Botones, campos y selectores no comparten estándar visual. | Definir tokens/componentes globales y aplicarlos a toda la plataforma. Estados normal, hover, focus, disabled, error y loading consistentes. |
| BETA-022 | Botones demasiado anchos o que ocupan toda la fila sin necesidad. | Ancho automático/estándar según función; usar iconografía donde sea clara; conservar etiquetas accesibles y no forzar ancho completo salvo formularios que lo requieran. |
| BETA-023 | Formato de campos descriptivos se aplica solo al navegador Desarrollador. | La preferencia seleccionada debe ser global y uniforme. Solo Desarrollador puede modificar la configuración; usuarios no desarrolladores solo consumen el formato vigente. |
| BETA-024 | Descripciones extensas visibles permanentemente. | Ocultar explicaciones no solicitadas detrás de un icono de información con tooltip/burbuja accesible. Mantener etiquetas breves y claras. |
| BETA-025 | Títulos largos y explicativos. | Simplificar títulos sin perder identificación de la función; por ejemplo, «Monitor de Almacenamiento» o «Monitor de GDrive». |
| BETA-026 | Modal de detalle del corte poco compacto y saturado. | Reorganizar jerarquía y distribución; crear pestañas adicionales solo si mejoran el agrupamiento y reducen saturación. Validar en móvil y escritorio. |

## D. Panel Desarrollador y consola

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-030 | Pestañas del desarrollador verticales; deben ser barra horizontal de herramientas. | El checkpoint reporta barra horizontal de iconos y expansión de la pestaña activa ya implementada; verificar visualmente en Beta y corregir discrepancias. |
| BETA-031 | Título debe expandirse con animación al seleccionar una pestaña. | La implementación local reporta animación y respeto a `prefers-reduced-motion`; validar en dispositivos Beta. |
| BETA-032 | Consola debe estar arriba, recibir todos los mensajes de las funciones y ocupar 50% de la altura del modal. | El checkpoint reporta consola superior al 50%; centralizar mensajes de éxito, error, progreso y confirmación en la consola, sin toast/banners paralelos de esas funciones. |
| BETA-033 | Confirmaciones mediante consola: pregunta y entrada de respuesta. | Implementar prompt de consola con respuestas afirmativas/negativas (`y/n`, `si/no`, `s/n`, `ok` y equivalentes), normalización y rechazo de entradas ambiguas. No ejecutar si no hay confirmación válida. |
| BETA-034 | Mensajes coloridos externos al ejecutar borrado, auditoría u organización de imágenes. | Retirar mensajes duplicados de la UI y dirigir todos los resultados al registro de consola. Mantener estados accesibles y no ocultar errores. |
| BETA-035 | Detalles de funciones y explicaciones no solicitadas ocupan demasiado espacio. | Texto secundario detrás de botón «i»; títulos y etiquetas compactos; información completa disponible al usuario cuando la solicite. |

## E. Google Drive, servicios y telemetría

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-040 | Almacenamiento de Drive debe alertar al alcanzar umbral crítico (ej. 80%). | El checkpoint reporta umbral 80%, porcentaje rojo y alerta Inbox/Consola para Desarrollador ya implementados. Validar con datos Beta y evitar alertas duplicadas; definir control de repetición. |
| BETA-041 | Porcentaje de uso de Drive debe mostrarse rojo al alcanzar umbral crítico. | Implementación local reportada; verificar umbral, accesibilidad y estados bajo/igual/sobre 80% en Beta. |
| BETA-042 | Eliminar servicio Legacy de registros y lista de servicios. | El checkpoint reporta que ya no figura en `SERVICE_HEALTH_CONTRACTS`; auditar inventario completo, UI, registros y referencias residuales antes de marcar terminado. No borrar datos históricos sin autorización. |
| BETA-043 | El tráfico de cada servicio debe representar todas las plataformas, no solo el navegador local. | Pendiente de diseño e implementación. Agregar telemetría centralizada por servicio/plataforma con ventanas temporales, deduplicación y agregación backend; distinguir tráfico global de actividad local. No sumar contadores locales como si fueran globales. |

## F. Sesión y autorización

| ID | Hallazgo / requerimiento | Estado y criterio de aceptación |
|---|---|---|
| BETA-050 | Evitar revalidar usuario y privilegios en cada acción; resolver identidad/rol al iniciar sesión y mantener sesión. | Código actual usa actor/contexto central y evita nuevas consultas a Users/ActiveSessions en cada handler. El Coordinator sigue comprobando token, expiración, epoch y revocación al adquirir operaciones. No retirar esta barrera sin sustituto seguro. Evaluar sesión persistente y autorización eficiente, conservando logout, revocación y cambios de privilegios efectivos. |
| BETA-051 | No realizar validaciones de acción duplicadas en frontend y múltiples servicios. | Auditar viajes de red y verificaciones redundantes; una autorización central por operación protegida con actor confiable, sin preflight adicional. El RBAC backend por acción permanece obligatorio. |
| BETA-052 | Sesión debe mantenerse al navegar, abrir modales y recuperar conexión. | Validar restauración, reconexión, múltiples pestañas, logout y revocación en Beta. No usar estado local como autorización. |

## Orden de ejecución

1. Confirmar BETA-001/002/003 en deployment y navegador Beta, ya que los errores impiden confiar en el resto de pruebas.
2. Completar BETA-010 a BETA-014: funciones Developer, matriz, dispatcher y concurrencia.
3. Implementar BETA-020 a BETA-026 como sistema global de componentes, no como estilos aislados por modal.
4. Completar BETA-032 a BETA-035 con consola como salida única de las operaciones del panel.
5. Validar BETA-040 a BETA-042 y diseñar BETA-043 con agregación backend real.
6. Completar pruebas de sesión BETA-050 a BETA-052 sin eliminar revocación ni RBAC.

## Límites de validación

- Las pruebas Node.js y GitHub Actions no sustituyen pruebas en navegador, Android/PWA ni despliegues Apps Script.
- No ejecutar despliegues productivos, modificar ScriptProperties, secretos, hojas, permisos ni datos de Drive sin autorización documentada.
- Mantener la rama base protegida sin cambios.


## Auditoría estática adicional — BETA-010 a BETA-014 y BETA-050/051 (2026-11-16)

Esta revisión confirma contratos y rutas del código versionado; **no sustituye** la prueba HTTP ni la medición en el deployment Beta.

- **BETA-010 — borrado de logs:** `clearActivityLogs` pasa por FEEDBACK con permiso Desarrollador; `clearSensitiveLogs` pasa por AUTH y consume el actor central con rol Desarrollador. Los handlers no deben aceptar un rol enviado por el navegador.
- **BETA-011 — auditoría de carpeta/Drive:** `auditDriveImagesInCortes` está declarada como mutación ADMIN con política propia y escritura limitada a `IMAGE_AUDIT_STATE`; mantiene control Desarrollador.
- **BETA-012 — imágenes históricas:** `getReplacedImages` usa lectura ADMIN dedicada y reserva recursos de referencia; no concede permisos de recuperación, movimiento ni eliminación.
- **BETA-013 — concurrencia:** `getReplacedImages`, `getDriveStorage` y `getCortesImageFolders` tienen leases de lectura específicas. El escáner conserva lease propia para su estado reanudable. El contrato `AdminImageScanCoordinatorContract.mjs` comprueba aislamiento de políticas y rutas. Sigue pendiente medir latencia/contención con solicitudes concurrentes en Beta.
- **BETA-014 — matriz general:** `ActionDispatchContract.js` comprueba mapa, endpoint, dispatcher y handler; `VehicleModalRolePolicy.mjs`, `AdminImageScanCoordinatorContract.mjs` y contratos ADMIN verifican restricciones de rol. La aceptación final requiere llamadas HTTP positivas/negativas en Beta.
- **BETA-050/051 — sesión y revalidación:** FEEDBACK, ADMIN, WRITE y USERS entregan actor confiable del Coordinator a los handlers protegidos. Los handlers reutilizan ese actor; no consultan de nuevo Users/ActiveSessions cuando el contexto central está presente. AUTH/Coordinator conserva expiración, epoch, revocación y cambio de rol. No se debe retirar esa barrera central ni el RBAC por acción.

**Evidencia local:** CI run `43786801781` SUCCESS — 108 suites / 1,664 pruebas / 0 fallos; `ActionDispatchContract` 12/12 y `AdminImageScanCoordinatorContract` PASS. GitHub Pages run `43786801161` SUCCESS.

**Estado:** auditoría estática local revisada; BETA-010 a BETA-014 y BETA-050/051 no se cierran hasta comprobar deployment, roles reales, datos aislados y concurrencia en Beta.
