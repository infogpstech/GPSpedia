# NORMAS DE DESAROLLO — GPSpedia

**Fuente normativa única del repositorio.** Estas normas sustituyen los procedimientos y anexos normativos anteriores. Todo agente o colaborador debe leer este archivo antes de modificar código, documentación operativa o registrar cambios. Los demás documentos pueden contener requisitos de tareas o evidencia histórica, pero no crear reglas de desarrollo independientes.

## 1. Principios

- Proteger la integridad del código y los datos tiene prioridad sobre la velocidad.
- Aplicar controles proporcionales al riesgo y al alcance; no repetir verificaciones que ya tienen evidencia vigente.
- No modificar elementos ajenos al objetivo solicitado.
- No afirmar pruebas, revisiones, despliegues o resultados que no se hayan ejecutado y comprobado.
- Mantener trazabilidad suficiente para entender qué cambió, por qué, cómo se validó y cómo continuar si algo falla.

## 2. Inicio de una tarea

1. Leer este archivo una vez al iniciar la tarea o sesión de trabajo.
2. Confirmar repositorio, rama autorizada y HEAD actual. Para este flujo: repositorio `infogpstech/GPSpedia`, rama de trabajo `GPSpedia2.2.5_work`, rama base `GPSpedia2.2.5`.
3. Consultar el checkpoint más reciente solo para conocer trabajo incompleto, bloqueos y siguiente acción. No releer todo el historial ni reconstruir tareas ya cerradas si el estado actual es verificable.
4. Leer los requisitos de la tarea y únicamente los archivos, contratos y antecedentes necesarios para ejecutarla.
5. Delimitar el resultado esperado, archivos probablemente afectados y validaciones necesarias.

Si la tarea es una continuación, retomar el estado real desde el checkpoint y Git. No iniciar una tarea nueva mientras exista trabajo anterior incompleto o un bloqueo que sea dependencia directa.

## 3. Análisis previo y alcance

Antes de editar, inspeccionar el código o documento afectado y las dependencias que puedan cambiar su comportamiento: llamadores, consumidores, contratos, permisos, datos, concurrencia y manejo de errores, según corresponda.

- La revisión debe ser suficientemente profunda para comprender el cambio, pero no exige leer línea por línea archivos o módulos sin relación con el alcance.
- No modificar durante el análisis diagnóstico.
- Ampliar el alcance únicamente cuando una dependencia real lo requiera; explicar el motivo.
- Registrar hallazgos ajenos al alcance como tareas separadas. No introducir correcciones oportunistas.
- En zonas críticas (autenticación, autorización, sesiones, escrituras, sincronización, idempotencia, recuperación o datos) elevar el nivel de análisis y pruebas.

## 4. Implementación

- Realizar el cambio mínimo que satisfaga los requisitos.
- Mantener compatibilidad con contratos, permisos, formatos de datos y comportamientos existentes, salvo que el requerimiento autorice cambiarlos.
- No eliminar ni reemplazar código por inferencia. Confirmar referencias y consumidores antes de retirar una función o archivo.
- No guardar secretos, credenciales ni datos productivos en el repositorio.
- No modificar deployments, endpoints, configuraciones o datos productivos sin autorización expresa.
- No crear archivos de respaldo dentro del repositorio. Cuando una comparación lo requiera, usar el estado Git previo o una copia temporal fuera del repositorio y eliminarla al terminar.

## 5. Validación y revisión

Seleccionar verificaciones según el impacto real del cambio. Como mínimo:

- Revisar el diff completo y confirmar que cada modificación pertenece al alcance.
- Ejecutar comprobación sintáctica en todos los archivos de código modificados.
- Ejecutar pruebas unitarias, de lógica, contrato, integración aislada o regresión que sean pertinentes y estén disponibles.
- Revisar dependencias, seguridad, permisos, concurrencia, errores y efectos colaterales cuando el cambio pueda afectarlos.
- Para cambios visuales, validar los estados y tamaños afectados cuando exista entorno disponible.
- Para cambios documentales, comprobar estructura, enlaces, referencias y preservación del contenido histórico.

Una prueba no disponible debe declararse como no ejecutada, indicando el motivo y el entorno que haría falta. La validación local puede cerrar una tarea si satisface sus criterios reproducibles; las pruebas que dependan de deployments o infraestructura se registran como validación diferida, no como ejecutadas.

La revisión de código debe concentrarse en el diff y sus efectos. Si aparece una observación, corregirla y repetir las pruebas afectadas. No reiniciar toda la auditoría por una corrección localizada, salvo que la corrección cambie sustancialmente el diseño, el alcance o las dependencias.

## 6. Bloqueos y decisiones

Detener la parte afectada del trabajo cuando ocurra cualquiera de estas condiciones:

- repositorio, rama o HEAD no coinciden con lo autorizado o no pueden verificarse;
- falta un requisito, archivo, permiso o dato indispensable;
- hay cambios concurrentes o conflictos cuyo origen no está claro;
- una prueba crítica falla o existe riesgo de corrupción, pérdida de datos, exposición o bypass de seguridad;
- una operación parcial deja el estado del repositorio o del sistema incierto.

Al bloquearse:
1. No improvisar, ocultar el fallo ni continuar sobre supuestos.
2. Conservar intactos los cambios y evidencias existentes.
3. Determinar qué se completó, qué falló y qué permanece sin verificar.
4. Registrar el bloqueo en el checkpoint cuando afecte la continuidad; incluir causa, impacto, estado actual y acción concreta para reanudar.
5. Informar al usuario qué decisión, acceso o condición falta.

Los hallazgos críticos de seguridad o integridad no se posponen sin autorización expresa. Una dependencia no crítica puede diferirse si se documentan el motivo, el riesgo y la tarea relacionada.

## 7. Recuperación ante errores o interrupciones

- Antes de recuperar, consultar el HEAD, el estado/diff disponible y el último commit verificable. No asumir que una operación fallida no produjo cambios.
- Preservar cambios válidos no publicados. No borrar trabajo para volver a un estado limpio sin identificar primero qué se perdería.
- Si una edición quedó parcial, comparar con el estado previo y completar o revertir únicamente el fragmento afectado.
- Si falla una escritura o publicación, consultar el estado remoto antes de reintentar para evitar duplicados.
- Si la referencia cambió durante la publicación, volver a leer el HEAD y reconciliar el diff. No forzar la actualización ni sustituir el SHA esperado para hacerla pasar.
- No usar force push, reescribir commits publicados ni modificar la rama base como método de recuperación.
- Si no es posible recuperar con certeza, detenerse y entregar un informe del estado; no encadenar intentos especulativos.

## 8. Registros y continuidad

Los registros conservan evidencia e historial; no son manuales de procedimiento.

- **Auditoría.txt:** registrar hallazgos técnicos nuevos cuando existan, con ubicación, evidencia, impacto, severidad y criterio de corrección. No auditar informes de auditoría ni reabrir hallazgos cerrados sin evidencia nueva.
- **ChangesLogs.txt:** describir objetivamente los cambios efectivamente realizados y los archivos afectados. No afirmar validaciones dentro del changelog si no son parte del registro factual.
- **Tareas.txt y registros de backlog:** mantener requisitos, dependencias y estados. No duplicar aquí las normas generales.
- **checkpoint.md:** actualizar al iniciar/cerrar una tarea cuando aporte continuidad, y siempre que exista interrupción, bloqueo, cambio de alcance o traspaso. No es obligatorio crear un checkpoint por cada microacción ni usarlo como diario de cada fase.
- **Registros históricos:** no borrar ni reescribir evidencia anterior. Las rectificaciones se agregan como adendas vinculadas. Las partes archivadas en `Olds/Documentacion_Legacy/` son inmutables.
- **Rotación:** cuando un registro acumulativo se aproxime al límite de 180,000 caracteres Unicode, preparar su rotación sin pérdida, verificar reconstrucción exacta y actualizar el manifiesto. No realizar conteos y auditorías documentales repetitivas en cada operación cuando el archivo esté lejos del límite.

Solo registrar un hallazgo si existe evidencia. Si no hay hallazgos, no inventarlos para justificar actividad. Mantener los registros breves y específicos.

## 9. Commits y ramas

- Trabajar en `GPSpedia2.2.5_work`; no escribir ni fusionar en `GPSpedia2.2.5` sin autorización expresa.
- Agrupar los cambios de una misma tarea lógica en un solo commit siempre que la herramienta de publicación lo permita. No crear commits intermedios por archivo o por etapa.
- Si la integración disponible solo permite guardar un archivo por operación y cada operación genera su propio commit, se permite publicar los archivos de forma secuencial; verificar el resultado de cada operación y no reescribir el historial para simular una agrupación.
- Antes de publicar, verificar HEAD y rama; crear el commit sobre el HEAD confirmado y actualizar únicamente la rama autorizada mediante una operación condicionada al SHA esperado.
- No forzar actualizaciones ni reescribir historial. Si el SHA esperado no coincide, detenerse, consultar el estado y reconciliar.
- Después de publicar, verificar SHA, padre, archivos incluidos y HEAD remoto. Confirmar que la rama base permanece intacta.
- No marcar la tarea como completada hasta que las verificaciones aplicables y la publicación hayan sido comprobadas.

## 10. Criterios de cierre

Una tarea puede cerrarse cuando:
1. el resultado solicitado está implementado;
2. el diff no contiene cambios ajenos;
3. las verificaciones aplicables se ejecutaron y aprobaron;
4. las limitaciones y validaciones diferidas están identificadas;
5. los registros necesarios describen fielmente el resultado;
6. el commit y la rama de trabajo se verificaron.

Usar estados claros: **PENDIENTE**, **EN PROGRESO**, **BLOQUEADA**, **COMPLETADA** o **COMPLETADA CON VALIDACIÓN DIFERIDA**. No confundir ausencia de deployment con fallo de validación local.

---

**Regla esencial:** analizar lo que puede verse afectado, validar lo que puede fallar, preservar lo que ya funciona y detenerse cuando no exista certeza suficiente.
