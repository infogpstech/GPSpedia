GPSpedia — ADENDA VIGENTE DE VALIDACIÓN BETA PyS
Fecha: 2026-11-21
Repositorio: infogpstech/GPSpedia
Rama: GPSpedia2.2.5_work
Fuente normativa: NORMAS_DESAROLLO.md

## PREPARACIÓN OBLIGATORIA ANTES DE CUALQUIER PRUEBA

Ejecutar desde la raíz del clon local. Esta secuencia exige el repositorio y rama autorizados, árbol limpio y sincronización fast-forward; se detiene sin descartar cambios locales.

```bash
set -euo pipefail
EXPECTED_REPO="infogpstech/GPSpedia"
EXPECTED_BRANCH="GPSpedia2.2.5_work"
ROOT="$(git rev-parse --show-toplevel)"
test "$(basename "$ROOT")" = "GPSpedia"
REMOTE_URL="$(git remote get-url origin)"
case "$REMOTE_URL" in
  "https://github.com/${EXPECTED_REPO}"|"https://github.com/${EXPECTED_REPO}.git"|"git@github.com:${EXPECTED_REPO}"|"git@github.com:${EXPECTED_REPO}.git") ;;
  *) echo "ERROR: origin no apunta a ${EXPECTED_REPO}." >&2; exit 1 ;;
esac
test "$(git branch --show-current)" = "$EXPECTED_BRANCH"
test -z "$(git status --porcelain)" || { echo "ERROR: árbol no limpio; no se descartan cambios."; exit 1; }
git fetch origin "$EXPECTED_BRANCH"
git pull --ff-only origin "$EXPECTED_BRANCH"
git status --short --branch
git rev-parse HEAD
```

Si cualquier comprobación falla, no ejecutar pruebas ni descartar cambios. Confirmar el HEAD sincronizado y conservar la rama base GPSpedia2.2.5 sin modificar.

## AUG-161 — CREACIÓN PyS Y MUTACIONES DIRECTAS SIN LEASES

**Estado: PENDIENTE DE EJECUCIÓN EN BETA AISLADA.**

### Requisitos del entorno

- Copia aislada de Apps Script FEEDBACK; si se usa CATALOG para verificar el feed, desplegar también la versión compatible aislada. Las operaciones ordinarias PyS no deben depender de Coordinator.
- Spreadsheet desechable con hojas pys, PysOperations, Cortes y __IdentifierSequenceReservations__; carpeta Drive desechable con ACL de prueba.
- Dos cuentas de prueba separadas con roles Técnico y Desarrollador; configurar las credenciales del deployment aislado fuera del repositorio.
- No utilizar endpoints, cuentas, hojas, carpetas, secretos ni datos productivos. No publicar a producción.

### A. Alta PyS, reservas e identidad first-write-wins

1. Verificar los esquemas exactos de pys (10 columnas), PysOperations (8 columnas) y __IdentifierSequenceReservations__. Una hoja incompatible debe fallar cerrada antes de crear archivos.
2. Lanzar altas simultáneas con opId diferentes. Confirmar problemId únicos, reservas secuenciales sin colisiones, una fila PyS válida por operación y referencias de imagen coherentes.
3. Lanzar dos altas simultáneas con el mismo opId y payload idéntico. Confirmar que la primera reserva física es canónica, ambos reintentos convergen al mismo problemId/fileId y no se crea una segunda fila lógica.
4. Reutilizar el mismo opId con hash/payload distinto. Confirmar rechazo del intento perdedor sin sobrescribir la reserva canónica ni eliminar un archivo que tenga referencias.
5. Inyectar respuesta perdida después de crear el archivo, después de anexar la reserva PysOperations, después del append de la fila PyS y después de flush/read-back. Reintentar el mismo payload y comprobar recuperación idempotente.
6. Forzar dos archivos para el mismo opId por carrera. El archivo no canónico solo puede enviarse a papelera después de demostrar, mediante lectura posterior, que no pertenece a la reserva canónica ni está referenciado por ninguna fila PyS; ante incertidumbre debe conservarse y marcarse para reconciliación.
7. Confirmar que las nuevas filas PysOperations se anexan con appendRow y no se mutan in-place. No esperar estados LINKED o RECOVERY_REQUIRED como transiciones de la fila del ledger: el éxito se deriva de la fila PyS canónica verificada; los casos ambiguos conservan la referencia/metadata para recuperación.
8. Verificar que los registros históricos PENDING sin imagen se conservan y no se migran automáticamente. Deben detenerse para revisión manual.
9. Intercalar reservas PyS con reservas previas y operaciones legacy; comprobar prefijo isue-, relleno de tres dígitos, detección de IDs duplicados y huecos, y que no se reutiliza un sufijo reservado.
10. Inyectar fallos de Drive/Spreadsheet en createFile, metadata, appendRow, flush y lectura de referencias. Verificar que nunca se elimina un archivo con referencia incierta y que el reintento no crea duplicados.

### B. Solución y prevención — escrituras directas FEEDBACK

1. Abrir el mismo PyS desde dos sesiones y enviar soluciones diferentes casi simultáneamente. Confirmar que ambas solicitudes se procesan sin espera de lease ni viaje a Coordinator; registrar el valor final leído y cualquier sobrescritura observada.
2. Repetir con prevención desde dos usuarios.
3. Repetir el mismo contenido y operación para comprobar idempotencia sin escritura/actividad duplicada.
4. Simular timeout o pérdida de respuesta tras persistencia y repetir la operación. El resultado debe reflejar el valor realmente guardado.
5. Probar estados históricos incoherentes entre Se soluciono y Solucion; detenerse sin corregir ni sobrescribir silenciosamente.
6. Confirmar que addSolution y addPrevention se ejecutan directamente, sin llamadas a Coordinator, leases, ScriptLock ni UserLock. La autorización se limita al actor de sesión y su capacidad.

### C. Relaciones PyS↔Cortes — escritura directa y lectura funcional de CORTES

1. Probar altas con problemId/vehicleId ausentes, malformados, inexistentes y duplicados. No debe cambiar pys.
2. Probar asociación preasignada durante creación PyS con ID válido, inexistente y duplicado en Cortes. El ID inválido debe rechazarse antes de crear/leer PysOperations o reservar recursos.
3. Probar JSON y formatos heredados de modelos asociados; confirmar normalización, deduplicación y preservación de relaciones ajenas.
4. Lanzar dos altas simultáneas del mismo vínculo, altas de vehículos distintos, alta/baja intercaladas y dos bajas concurrentes. El read-back debe coincidir con el estado final persistido y los reintentos no deben duplicar asociaciones.
5. Confirmar que addVehicleToProblem/removeVehicleFromProblem no llaman a Coordinator ni adquieren leases. CORTES se consulta únicamente para comprobar que el vehículo existe de forma inequívoca; la escritura de la relación ocurre directamente en pys.
6. Intentar desvincular como Técnico y como Desarrollador; solo Desarrollador debe tener éxito, independientemente del rol falsificable enviado por el cliente.
7. Inyectar fallos de lectura/escritura de Spreadsheet, flush y pérdida de respuesta. Confirmar que el error no se presenta como éxito y que el reintento vuelve a leer el estado persistido. No se prueba fallo/expiración de Coordinator porque estas acciones ya no dependen de él.

### D. Concurrencia entre proyectos y no interferencia

1. Ejecutar simultáneamente desde dos deployments FEEDBACK aislados. Repetir altas PyS, soluciones, prevenciones y relaciones sobre recursos iguales y distintos; las mutaciones ordinarias no deben invocar Coordinator.
2. Confirmar que no hay espera/contención de leases ni viajes a Coordinator. Registrar el resultado real de operaciones simultáneas sobre el mismo campo o colección, incluyendo posibles sobrescrituras, sin introducir serialización artificial.
3. Probar reintento tras respuesta perdida y reconciliación después de fallo parcial de Spreadsheet/Drive. No aplicar pruebas de expiración de lease a estas cuatro operaciones.
4. Registrar timestamps, IDs sintéticos, operación, servicio, recurso, resultado, valores antes/después y evidencia de Drive. No incluir secretos, tokens ni datos personales.

### E. Pruebas visuales PyS

- Ejecutar también los recorridos UX existentes de AUG-088/AUG-089/AUG-091: contexto anti-ciclo, pila modal, restauración de scroll/acordeones/carruseles y título del acordeón en escritorio, Android y PWA.
- Mantener como casos separados las pruebas de almacenamiento AUG-083, esquema/idempotencia AUG-084 y relaciones AUG-090/AUG-128; cuando sus instrucciones históricas contradigan el protocolo actual, prevalece esta adenda.

## ACTUALIZACIÓN DE EXPECTATIVAS HISTÓRICAS

Esta adenda complementa los segmentos históricos sin reescribirlos:

- AUG-084: sustituye la expectativa de que ScriptLock serializa altas y de que PysOperations se transiciona a LINKED/RECOVERY_REQUIRED. El ledger nuevo es append-only; la fila PyS verificada determina el éxito.
- AUG-086: sustituye la expectativa de ScriptLock/lease local o compartida por ejecución directa de addSolution/addPrevention, sin Coordinator.
- AUG-090 y AUG-128: sustituyen la expectativa de ScriptLock o lease compartida; add/remove relaciones se escriben directamente y consultan CORTES solo para validación funcional.
- AUG-083: conserva los casos de MIME, ACL, Drive, referencias y recuperación; ejecutar con el manejo actual de metadata y conservación conservadora de archivos.
- AUG-159/AUG-160: siguen siendo obligatorias para aportes vehiculares ADMIN y cargas ADMIN/ImageUploadEvents. Esta adenda no las sustituye.
- Safe Apply: continúa pendiente de preview real autorizado, ACL, manifiesto y rollback verificados. No mover, renombrar, sobrescribir ni borrar archivos productivos.

## EVIDENCIA ESPERADA Y CIERRE

Guardar evidencia sintética por operación y archivo, capturas de UI y registros de ejecución. No registrar secretos ni datos personales. Una prueba se marca PASS solo después de verificar respuestas, filas, reservas, referencias, ACL y archivos reales en el entorno aislado.

No desplegar Apps Script a producción ni modificar datos productivos.


## Protocolos complementarios — vídeos, tutoriales e Inbox sin leases

### Vídeos — envío, aprobación y rechazo directos

- submitVideoForApproval, approveVideo y rejectVideo se ejecutan directamente en FEEDBACK; no llaman a Coordinator, no adquieren leases y no usan ScriptLock local.
- La autorización sigue dependiendo del actor de sesión y de los roles permitidos por el backend; el rol declarado por el cliente no es autoridad.
- La fuente de decisión continúa siendo VideoApprovalEvents append-only. En Beta, comprobar opVideoId, idempotencia, rechazo de decisiones opuestas, materialización en Feedbacks y publicación/retirada exacta del destino.
- En pruebas concurrentes, no medir contención ni expiración de leases; registrar el resultado real del append/read-back y cualquier respuesta perdida o fallo parcial de Spreadsheet/Drive/YouTube.

### Tutoriales — alta y edición directas

- addTutorial y updateTutorialItem usan journals append-only para claims de título, renombrados y ediciones D:F; no deben reservar TUTORIAL en Coordinator.
- En Beta, comprobar unicidad de título, identidad estable/legacy, expectedHash, preservación de Imagen/Video/Colaborador y recuperación tras append parcial. No exigir lease ni bloqueo Coordinator.

### Inbox — operaciones directas

- Las lecturas y mutaciones Inbox no adquieren ScriptLock ni llaman a Coordinator. Mantienen autenticación de sesión, participantes, RBAC, idempotencia y auditoría.
- En Beta, verificar creación, envío, paginación, lectura/no leído, archivo, cierre y ocultación por participante; comprobar historial, contadores y auditoría en Spreadsheet aislado. Registrar resultados de escrituras simultáneas sin exigir serialización artificial.

### Sustitución de expectativas históricas

- AUG-155: las pruebas interproyecto siguen aplicando a servicios/operaciones que aún tengan una coordinación explícita vigente; excluir approveVideo/rejectVideo/submitVideoForApproval, addTutorial/updateTutorialItem y operaciones Inbox de las expectativas de lease Coordinator.
- Los segmentos históricos que exigen Coordinator para TUTORIAL o Inbox quedan sustituidos por este protocolo. No modificar sus archivos históricos; aplicar esta adenda al ejecutar Beta.


- Actualización adicional de Tutoriales: la ruta legacy de handleUpdateTutorialItem también se ejecuta sin ScriptLock; mantiene la lectura dirigida, validación de unicidad de título, read-back y preservación de campos. En Beta verificar ediciones sobre filas históricas/IDs no canónicos y documentar resultados concurrentes sin exigir bloqueo.


- Actualización de publicación CATALOG FEEDBACK: el snapshot se construye sin ScriptLock y sourceVersion usa Date.now(). Si ejecuciones concurrentes generan una versión repetida/obsoleta, Coordinator convierte ese evento en reset y reconstrucción; Beta debe comprobar que el catálogo converge al snapshot actual, incluyendo dos mutaciones dentro del mismo milisegundo y fallo del endpoint Coordinator.


## AUG-162 — RESERVA NUMÉRICA WRITE APPEND-ONLY SIN SCRIPTLOCK

**Estado: PENDIENTE DE EJECUCIÓN EN BETA AISLADA.** La regresión local no sustituye la validación de fórmulas y concurrencia real en Google Sheets.

### Entorno aislado

- Dos deployments independientes de WRITE/ADMIN que compartan únicamente un Spreadsheet desechable con las hojas Cortes, CortesIdReservations e Idempotencia.
- Dos cuentas de prueba con roles Técnico y Desarrollador; carpeta Drive desechable si se ejecuta el flujo completo de alta.
- No utilizar hojas, cuentas, deployments, carpetas, secretos ni datos productivos.

### A. Secuencia, concurrencia y first-write-wins

1. Comprobar que el endpoint allocateVehicleId autentica al actor y exige el rol Desarrollador vigente antes de acceder al Spreadsheet. Confirmar que el endpoint no invoca LockService.
2. Con IDs existentes y el contador histórico como línea base, lanzar reservas simultáneas desde dos ejecuciones independientes con opId y operationHash distintos. Confirmar IDs enteros, únicos y estrictamente crecientes.
3. Verificar en Google Sheets que la fórmula append-only basada en ROW()/INDEX() se evalúa correctamente, que SpreadsheetApp.flush() permite leer el resultado y que la celda se congela como valor numérico antes de responder.
4. Lanzar simultáneamente el mismo opId y la misma huella. Ambas respuestas deben converger al ID de la primera fila física canónica. Si la carrera anexó una segunda reserva, su ID queda consumido y no puede reutilizarse; no debe crearse una segunda fila lógica de vehículo.
5. Reutilizar simultáneamente un opId con huellas distintas. La primera reserva física prevalece; el intento contradictorio debe rechazarse. Después, una operación con otro opId debe poder reservar normalmente y el ledger debe seguir siendo monotónico.
6. Simular pérdida de respuesta después de appendRow, flush y read-back. El reintento con el mismo opId/huella debe recuperar el ID persistido sin duplicar una reserva lógica.
7. Probar solicitudes legacy sin opId. Cada llamada debe obtener un ID único; una respuesta perdida puede dejar un hueco consumido, pero nunca una colisión.
8. Lanzar dos inicializaciones simultáneas de CortesIdReservations. La hoja debe quedar con una sola fila de encabezados exactos; no se deben sobrescribir filas ni crear esquemas parciales.
9. Corromper deliberadamente una copia aislada del ledger con IDs repetidos, desordenados, opId inválido o hash inválido. La asignación debe fallar cerrada antes de anexar otra reserva. Repetir con IDs duplicados o filas incompletas en Cortes.
10. Verificar que altas nuevas de WRITE y preasignaciones ADMIN usan el mismo ledger. La operación física de alta conserva su sección crítica fail-fast para fila, VIN, Idempotencia y compensación; el trabajo Drive debe ejecutarse fuera de ese lock.

### B. Columnas Testigo y recuperación

1. Ejecutar ensureTestigoColumns en la ruta de alta y confirmar que mantiene AT:AV, no adquiere un lock anidado y conserva encabezados/datos preexistentes.
2. Inyectar fallos después de reservar el ID y antes/después de crear la fila. El ID reservado no debe revertirse ni reutilizarse; el reintento con el mismo opId debe recuperar la reserva.
3. Verificar que el contador GPSpedia_CORTES_LAST_ID se trata como límite histórico de compatibilidad y no como contador mutable de asignación. La secuencia nueva debe quedar respaldada por CortesIdReservations.
4. Registrar IDs, opIds sintéticos, huellas, filas antes/después, fórmulas/valores, timestamps y resultado. No guardar tokens, datos personales ni secretos.

**Criterio PASS:** unicidad real entre ejecuciones/proyectos, convergencia idempotente, ledger íntegro y fórmulas convertidas a valores numéricos verificados. Una simulación local o CI no basta para cerrar AUG-162.


## AUG-163 — USERS: PERFIL SIN SCRIPTLOCK, TELEMETRÍA BEST-EFFORT Y ALTA FAIL-FAST

**Estado: PENDIENTE DE EJECUCIÓN EN BETA AISLADA.** No se deben usar cuentas ni datos productivos.

### A. Actualización de perfil

1. En una cuenta de prueba, actualizar únicamente Nombre_Completo y confirmar read-back del valor persistido.
2. Simular dos ediciones concurrentes del mismo perfil. Debe prevalecer la última escritura; una ejecución cuyo read-back ya fue reemplazado puede informar conflicto, pero nunca debe restaurar un snapshot antiguo sobre la edición posterior.
3. Simular fallo de flush después de setValue. Si el read-back confirma el valor solicitado, la operación puede considerarse persistida; si no coincide, debe fallar sin rollback destructivo.
4. Confirmar que updateProfile no adquiere ScriptLock local y que conserva la lease compartida USERS/AUTH para coordinar cambios de rol, revocación o eliminación.

### B. Creación de cuenta

1. Lanzar dos altas con el mismo nombre de usuario desde ejecuciones independientes. Confirmar que nunca se crean dos cuentas con el mismo username ni IDs repetidos.
2. Mantener ocupado el ScriptLock local y ejecutar createUser. Debe fallar rápido con mensaje de servidor ocupado, sin waitLock, sin escribir filas ni liberar un lock no adquirido.
3. Liberar el lock y reintentar. Debe crearse una sola cuenta con ID único, contraseña PBKDF2 y rol autorizado.
4. Confirmar que sesión y jerarquía de rol se validan antes de entrar en la sección crítica y que el hash de contraseña se calcula fuera del lock.

### C. Telemetría directa

1. Ejecutar getUsers concurrentemente y confirmar que recordUsersDirectTraffic_ no invoca LockService ni cambia la respuesta de lectura.
2. Simular dos incrementos simultáneos sobre el mismo bucket. Se permite subconteo porque la métrica es best-effort; no se permite usarla como rate limit, autorización o control de acceso.
3. Simular cuota/fallo de PropertiesService. La telemetría puede omitirse, pero getUsers debe seguir respondiendo normalmente.
4. Verificar secreto Coordinator, fallback legacy, endpoint getServiceTraffic y exactitud declarada accuracy=best_effort_nonblocking / mayUndercount=true.

**Criterio PASS:** sin ScriptLock en perfil ni telemetría, sin pérdida por rollback de ediciones concurrentes, alta de cuentas fail-fast con unicidad conservada y telemetría nunca usada como control de seguridad.
