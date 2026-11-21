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

## AUG-161 — CREACIÓN PyS Y MUTACIONES BAJO LEASE COMPARTIDA

**Estado: PENDIENTE DE EJECUCIÓN EN BETA AISLADA.**

### Requisitos del entorno

- Copias aisladas de Apps Script FEEDBACK y Coordinator 1.4.5; si se usa CATALOG para verificar el feed, desplegar también la versión compatible aislada.
- Spreadsheet desechable con hojas pys, PysOperations, Cortes y __IdentifierSequenceReservations__; carpeta Drive desechable con ACL de prueba.
- Dos cuentas de prueba separadas con roles Técnico y Desarrollador. Las dos ejecuciones FEEDBACK deben compartir el mismo Coordinator aislado y sus secretos de servicio configurados fuera del repositorio.
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

### B. Solución y prevención — leases FEEDBACK

1. Abrir el mismo PyS desde dos sesiones y enviar soluciones diferentes casi simultáneamente. Debe prevalecer un único valor; la segunda operación recibe conflicto explícito y no sobrescribe la primera.
2. Repetir con prevención desde dos usuarios.
3. Repetir el mismo contenido y operación para comprobar idempotencia sin escritura/actividad duplicada.
4. Simular timeout o pérdida de respuesta tras persistencia y repetir la operación. El resultado debe reflejar el valor realmente guardado.
5. Probar estados históricos incoherentes entre Se soluciono y Solucion; detenerse sin corregir ni sobrescribir silenciosamente.
6. Confirmar que las acciones usan leases compartidas FEEDBACK con nombres addSolution y addPrevention; no existe fallback a ScriptLock local ni UserLock.

### C. Relaciones PyS↔Cortes — leases FEEDBACK con lectura CORTES

1. Probar altas con problemId/vehicleId ausentes, malformados, inexistentes y duplicados. No debe cambiar pys.
2. Probar asociación preasignada durante creación PyS con ID válido, inexistente y duplicado en Cortes. El ID inválido debe rechazarse antes de crear/leer PysOperations o reservar recursos.
3. Probar JSON y formatos heredados de modelos asociados; confirmar normalización, deduplicación y preservación de relaciones ajenas.
4. Lanzar dos altas simultáneas del mismo vínculo, altas de vehículos distintos, alta/baja intercaladas y dos bajas concurrentes. El read-back debe coincidir con el estado final persistido y los reintentos no deben duplicar asociaciones.
5. Confirmar que Coordinator reserva FEEDBACK para escritura y CORTES para lectura durante addVehicleToProblem/removeVehicleFromProblem. Solución y prevención escriben FEEDBACK.
6. Intentar desvincular como Técnico y como Desarrollador; solo Desarrollador debe tener éxito, independientemente del rol falsificable enviado por el cliente.
7. Forzar timeout, fallo de lease, fallo de flush y pérdida de respuesta. La operación debe fallar cerrada si Coordinator no está disponible; no debe ejecutarse una mutación sin lease ni fallback local.

### D. Concurrencia entre proyectos y no interferencia

1. Ejecutar simultáneamente desde dos deployments FEEDBACK conectados al mismo Coordinator. Repetir altas PyS, soluciones, prevenciones y relaciones sobre recursos iguales y distintos.
2. Medir espera/contención de leases; comprobar que operaciones sobre recursos distintos no se bloquean indebidamente y que operaciones sobre el mismo recurso conservan consistencia.
3. Probar expiración/recuperación de lease, reintento tras respuesta perdida y reconciliación después de fallo parcial.
4. Registrar timestamps, IDs sintéticos, operación, servicio, recurso, resultado, valores antes/después y evidencia de Drive. No incluir secretos, tokens ni datos personales.

### E. Pruebas visuales PyS

- Ejecutar también los recorridos UX existentes de AUG-088/AUG-089/AUG-091: contexto anti-ciclo, pila modal, restauración de scroll/acordeones/carruseles y título del acordeón en escritorio, Android y PWA.
- Mantener como casos separados las pruebas de almacenamiento AUG-083, esquema/idempotencia AUG-084 y relaciones AUG-090/AUG-128; cuando sus instrucciones históricas contradigan el protocolo actual, prevalece esta adenda.

## ACTUALIZACIÓN DE EXPECTATIVAS HISTÓRICAS

Esta adenda complementa los segmentos históricos sin reescribirlos:

- AUG-084: sustituye la expectativa de que ScriptLock serializa altas y de que PysOperations se transiciona a LINKED/RECOVERY_REQUIRED. El ledger nuevo es append-only; la fila PyS verificada determina el éxito.
- AUG-086: sustituye la expectativa de ScriptLock local por leases compartidas FEEDBACK para addSolution/addPrevention.
- AUG-090 y AUG-128: sustituyen la expectativa de ScriptLock local por leases compartidas; add/remove relaciones leen CORTES bajo la lease FEEDBACK.
- AUG-083: conserva los casos de MIME, ACL, Drive, referencias y recuperación; ejecutar con el manejo actual de metadata y conservación conservadora de archivos.
- AUG-159/AUG-160: siguen siendo obligatorias para aportes vehiculares ADMIN y cargas ADMIN/ImageUploadEvents. Esta adenda no las sustituye.
- Safe Apply: continúa pendiente de preview real autorizado, ACL, manifiesto y rollback verificados. No mover, renombrar, sobrescribir ni borrar archivos productivos.

## EVIDENCIA ESPERADA Y CIERRE

Guardar evidencia sintética por operación y archivo, capturas de UI y registros de ejecución. No registrar secretos ni datos personales. Una prueba se marca PASS solo después de verificar respuestas, filas, reservas, referencias, ACL y archivos reales en el entorno aislado.

No desplegar Apps Script a producción ni modificar datos productivos.
