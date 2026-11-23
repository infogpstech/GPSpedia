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

Una prueba no disponible debe declararse como no ejecutada, indicando el motivo y el entorno que haría falta.

**Preparación obligatoria de pruebas Beta:** toda lista o bloque de pruebas destinado a Beta debe comenzar, antes de cualquier prueba, con comandos copiables para comprobar que el árbol de trabajo está limpio, obtener los cambios remotos y sincronizar la rama autorizada mediante fast-forward (`fetch` + `pull --ff-only`). Los comandos deben identificar explícitamente el repositorio/rama esperados, detenerse si existen cambios locales sin guardar y mostrar el HEAD final. Nunca usar `reset --hard`, `clean`, `force` ni comandos que descarten cambios del usuario para sincronizar. Esta secuencia debe mantenerse al principio de la lista de pruebas Beta.

**Criterio obligatorio de finalización local:** una tarea se considera **COMPLETADA** cuando las validaciones locales pertinentes se ejecutan y aprueban. Estas incluyen, según el alcance, sintaxis/parsing, pruebas unitarias y de lógica, contratos, virtualización o simulación de dependencias, pruebas de regresión y anti-regresión, seguridad estática y revisión del diff. Deben cubrirse los riesgos relevantes del cambio con pruebas reproducibles en el entorno local disponible.

**Validaciones diferidas a Beta:** ninguna tarea debe quedar bloqueada ni permanecer abierta únicamente porque requiera validación de integración con navegador real, despliegues o servicios externos, proyectos Apps Script, hojas Spreadsheet aisladas, credenciales/OAuth, YouTube API real, infraestructura de terceros o pruebas de campo. Estas validaciones se registran explícitamente como pendientes para la versión Beta y se ejecutan en el entorno Beta de campo real. No se deben simular ni presentar como realizadas. Solo un defecto reproducible en las pruebas locales, un riesgo crítico verificable o una dependencia local indispensable puede impedir el cierre de la tarea.

La revisión de código debe concentrarse en el diff y sus efectos. Si aparece una observación, corregirla y repetir las pruebas afectadas. No reiniciar toda la auditoría por una corrección localizada, salvo que la corrección cambie sustancialmente el diseño, el alcance o las dependencias.

## 6. Bloqueos y decisiones

Detener la parte afectada del trabajo cuando ocurra cualquiera de estas condiciones:

- repositorio o rama no coinciden con lo autorizado, o existe evidencia de divergencia/conflicto real. La imposibilidad inicial de consultar/verificar el SHA mediante una herramienta o endpoint NO constituye por sí sola un bloqueo: se debe resolver usando métodos alternativos y continuar el trabajo;
- falta un requisito, archivo, permiso o dato indispensable;
- hay cambios concurrentes o conflictos cuyo origen no está claro;
- una prueba crítica falla o existe riesgo de corrupción, pérdida de datos, exposición o bypass de seguridad;
- una operación parcial deja el estado del repositorio o del sistema incierto.

Al bloquearse:
1. No improvisar, ocultar el fallo ni continuar sobre supuestos. Antes de declarar un bloqueo, agotar las vías razonables para resolverlo y continuar con las partes independientes.
2. Conservar intactos los cambios y evidencias existentes.
3. Determinar qué se completó, qué falló y qué permanece sin verificar.
4. Registrar el bloqueo en el checkpoint cuando afecte la continuidad; incluir causa, impacto, estado actual y acción concreta para reanudar.
5. Informar al usuario qué decisión, acceso o condición falta.

Los hallazgos críticos de seguridad o integridad no se posponen sin autorización expresa. Una dependencia no crítica puede diferirse si se documentan el motivo, el riesgo y la tarea relacionada.

## 7. Recuperación ante errores o interrupciones

- Antes de recuperar, consultar el HEAD, el estado/diff disponible y el último commit verificable. Si una herramienta no permite leer el SHA, resolverlo mediante otra vía disponible (por ejemplo, consulta de refs, comparación de commits, historial reciente, lectura de commit/ref o clon/fetch autorizado); no asumir que una operación fallida no produjo cambios.
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
- **Purga documental autorizada:** una eliminación de registros históricos solo puede realizarse por instrucción expresa del usuario; debe quedar anotada en el checkpoint, limitarse a los archivos solicitados y no alcanzar código fuente ni suites automatizadas.
- **Rotación:** cuando un registro acumulativo se aproxime al límite de 180,000 caracteres Unicode, preparar su rotación sin pérdida, verificar reconstrucción exacta y actualizar el manifiesto. No realizar conteos y auditorías documentales repetitivas en cada operación cuando el archivo esté lejos del límite.

Solo registrar un hallazgo si existe evidencia. Si no hay hallazgos, no inventarlos para justificar actividad. Mantener los registros breves y específicos.

## 9. Commits y ramas

- Trabajar en `GPSpedia2.2.5_work`; no escribir ni fusionar en `GPSpedia2.2.5` sin autorización expresa.
- Agrupar los cambios de una misma tarea lógica en un solo commit siempre que la herramienta de publicación lo permita. No crear commits intermedios por archivo o por etapa.
- Si la integración disponible solo permite guardar un archivo por operación y cada operación genera su propio commit, se permite publicar los archivos de forma secuencial; verificar el resultado de cada operación y no reescribir el historial para simular una agrupación.
- Antes de publicar, verificar HEAD y rama; crear el commit sobre el HEAD confirmado y actualizar únicamente la rama autorizada mediante una operación condicionada al SHA esperado. Si falla la consulta inicial del SHA, cambiar de método y resolver la referencia; no abandonar la tarea por esa limitación de herramienta. Si tras agotar las vías disponibles el SHA sigue sin poder confirmarse, continuar análisis, auditoría, preparación y pruebas que no impliquen escritura/publicación, dejando explícitamente pendiente solo la publicación segura; nunca inventar un SHA ni publicar sobre una referencia supuesta.
- No forzar actualizaciones ni reescribir historial. Si el SHA esperado no coincide, detenerse, consultar el estado y reconciliar.
- Después de publicar, verificar SHA, padre, archivos incluidos y HEAD remoto. Confirmar que la rama base permanece intacta.
- No marcar la tarea como completada hasta que las verificaciones aplicables y la publicación hayan sido comprobadas.

## 10. Criterios de cierre

Una tarea puede cerrarse cuando:
1. el resultado solicitado está implementado;
2. el diff no contiene cambios ajenos;
3. las validaciones locales pertinentes (sintaxis, lógica, virtualización/simulación, regresión y anti-regresión, contratos y demás pruebas reproducibles aplicables) se ejecutaron y aprobaron;
4. las validaciones que requieren navegador real, despliegues, Apps Script/Spreadsheet aislados, OAuth, APIs externas o infraestructura de terceros están identificadas como pendientes de Beta, sin bloquear el cierre local;
5. los registros necesarios describen fielmente el resultado y distinguen las pruebas locales aprobadas de las validaciones Beta aún no ejecutadas;
6. el commit y la rama de trabajo se verificaron.

Usar estados claros: **PENDIENTE**, **EN PROGRESO**, **BLOQUEADA**, **COMPLETADA** o **COMPLETADA CON VALIDACIÓN DIFERIDA**. Una tarea con todas sus pruebas locales aprobadas se marca **COMPLETADA CON VALIDACIÓN DIFERIDA** cuando queden verificaciones reservadas para Beta. No usar **BLOQUEADA** por la sola ausencia de un deployment, credencial o servicio externo.

---

**Regla esencial:** analizar lo que puede verse afectado, validar lo que puede fallar, preservar lo que ya funciona y detenerse cuando no exista certeza suficiente.


## 11. Cierre del ciclo de mejoras y verificación integral

Las tareas de mejora e implementación ya identificadas en el backlog vigente tienen prioridad sobre la incorporación de nuevas solicitudes de desarrollo.

- Completar primero las tareas actuales y sus dependencias. No agregar nuevas tareas de funcionalidades, mejoras o refactorizaciones mientras queden tareas vigentes sin resolver, salvo que exista una necesidad crítica de seguridad, integridad de datos, continuidad operativa o un defecto que impida completar el trabajo actual.
- Los defectos nuevos descubiertos durante la implementación o las pruebas deben documentarse con evidencia. Si bloquean una tarea o representan un riesgo crítico, atenderlos antes de continuar; si no son críticos ni bloquean el alcance, registrarlos para priorización posterior sin interrumpir automáticamente el backlog vigente.
- Al terminar el conjunto de tareas actuales de mejoras e implementaciones, realizar una fase de verificación técnica integral antes de proponer o incorporar nuevas mejoras. Esta fase no sustituye ni repite las auditorías funcionales ya realizadas que dieron origen al backlog; verifica la calidad de las implementaciones y la estabilidad del conjunto.
- La verificación integral debe incluir, según la arquitectura y las herramientas disponibles:
  1. ejecución de las pruebas automatizadas existentes y de las pruebas adicionales necesarias para cubrir requisitos y riesgos reales;
  2. comprobaciones de sintaxis, parsing, referencias, dependencias y compatibilidad con los entornos de ejecución;
  3. pruebas de integración entre servicios, contratos y funciones consumidoras para detectar contradicciones y regresiones;
  4. análisis y pruebas de concurrencia, condiciones de carrera, escrituras simultáneas, bloqueos, idempotencia y consistencia de datos donde corresponda;
  5. comparación de cambios contra sus versiones anteriores y revisión del diff completo para detectar eliminaciones, modificaciones o desplazamientos de líneas ajenos a cada tarea;
  6. pruebas de regresión y anti-regresión sobre funcionalidades previamente auditadas y comportamientos que deban preservarse.
- Usar Node.js, CLI, herramientas estáticas y entornos locales cuando sean compatibles con el proyecto. Cuando sea útil y esté autorizado, incorporar o ejecutar GitHub Actions para automatizar las verificaciones. No introducir dependencias, workflows o cambios de infraestructura sin comprobar que son compatibles con el proyecto y que aportan valor.
- Separar claramente los resultados: pruebas realmente ejecutadas y aprobadas, análisis estáticos realizados, pruebas fallidas y validaciones que requieren Apps Script, Google Sheets, credenciales, servicios externos o entorno Beta. Nunca presentar una inspección de código como una prueba de ejecución.
- Corregir los defectos reproducibles encontrados y volver a ejecutar las pruebas afectadas. Los hallazgos no críticos fuera del alcance deben quedar documentados y priorizados, sin convertir la fase de verificación en una vía para incorporar indefinidamente nuevas funcionalidades.
- Una vez resueltas las tareas vigentes y aprobada la verificación integral, se podrá abrir una nueva etapa de planificación y aceptar nuevas tareas, sustentadas en necesidades o evidencia nuevas.

## 12. Requisitos expresos del usuario: contraseñas y servicios Apps Script

Estos requisitos delimitan el alcance de las siguientes iteraciones y prevalecen sobre propuestas técnicas anteriores que los contradigan:

### 12.1 Contraseñas e inicio de sesión
- Las contraseñas deben almacenarse como hashes; nunca en texto plano.
- El inicio de sesión debe mantenerse ágil y rápido. No añadir pasos interactivos, desafíos, verificaciones adicionales ni viajes de red que no sean indispensables para autenticar y autorizar correctamente.
- No aumentar el coste computacional del hash ni introducir mecanismos de autenticación más complejos por iniciativa propia. Cualquier cambio del algoritmo, parámetros o flujo debe demostrar una necesidad real y respetar el objetivo de baja latencia.
- Mantener una protección razonable frente a recuperación por diccionario mediante un esquema de hash con salt; no interpretar «basta que sean hasheadas» como autorización para almacenar contraseñas en texto plano, usar un hash sin salt o debilitar la seguridad deliberadamente.
- Unificar los servicios AUTH y USERS en un formato compatible, sin hacer más lento el login. Antes de cambiar el formato existente, revisar compatibilidad y migración; no ejecutar migraciones sobre datos reales sin autorización.

### 12.2 Servicios Apps Script y pruebas de despliegue
- Está permitido modificar, corregir, reorganizar y preparar en la rama de trabajo los archivos fuente de Apps Script y sus contratos, como parte de las tareas autorizadas.
- Está permitido ejecutar pruebas locales, unitarias, de contrato, simulaciones y regresiones automatizadas que no requieran publicar ni alterar proyectos Apps Script desplegados.
- No confundir la modificación del código fuente con un despliegue o una validación del servicio remoto.
- Las pruebas que necesiten un deployment actualizado, invocaciones de servicios Apps Script desplegados, credenciales/propiedades del proyecto, hojas o datos del entorno Beta deben quedar registradas como **PENDIENTES DE DESPLIEGUE / VALIDACIÓN BETA** hasta que se realice ese despliegue y se autorice el entorno de prueba.
- No omitir, simular ni marcar como aprobadas esas pruebas remotas antes de ejecutarlas. Registrar los requisitos previos, procedimiento y evidencia esperada para la siguiente iteración.
- Esta reserva de pruebas no impide completar ahora el código fuente y las pruebas locales independientes del deployment.



## 13. Requisitos expresos de Beta: disponibilidad inmediata, rendimiento y sesión por rol

Estos requisitos son obligatorios para las correcciones de rendimiento y experiencia reportadas en las pruebas Beta.

### 13.1 Catálogo cache-first y arranque sin parpadeos
- Si existe una instantánea local completa y válida en IndexedDB/caché, mostrarla inmediatamente y conservarla visible durante toda la sincronización.
- No mostrar spinner, banner, texto de «cargando catálogo» ni vaciar/ocultar el contenido cuando exista una caché válida. Las actualizaciones de cursor/deltas deben ejecutarse en segundo plano y ser silenciosas.
- No solicitar una instantánea completa al servidor en cada inicio. Con caché válida y cursor vigente, solicitar únicamente deltas; recurrir al snapshot completo solo si no existe caché utilizable, el cursor exige reset o la reconciliación demuestra que hace falta.
- La primera sesión en un dispositivo sin caché puede mostrar estado de carga mientras descarga la instantánea inicial. Después debe persistirla localmente para siguientes inicios.
- La indisponibilidad de IndexedDB no debe impedir mostrar datos ya cargados en memoria ni bloquear la interfaz. No borrar, recrear ni limpiar bases/almacenes para ocultar errores; preservar los almacenes administrativos y operaciones recuperables.
- Las operaciones de almacenamiento opcional (miniaturas, historial local y vistos) no deben bloquear el catálogo ni las acciones independientes.

### 13.2 Inbox, modales y operaciones de uso frecuente
- Inbox debe presentar conversaciones y mensajes disponibles sin bloquear la interfaz durante una actualización. Conservar los datos existentes mientras se refrescan y utilizar caché temporal aislada por usuario y sesión cuando sea seguro.
- El detalle del corte debe abrirse y permitir edición sin viajes de red redundantes ni esperas por recursos no relacionados. Priorizar la información del catálogo local; enviar solo los campos modificados y mantener las protecciones de concurrencia.
- Borrado de logs, auditoría de carpetas e imágenes históricas deben estar accesibles a los roles autorizados por la matriz RBAC vigente. Una limitación de interfaz no debe contradecir el permiso backend ni viceversa. Las operaciones destructivas conservan sus restricciones más estrictas.
- Los errores de un servicio (Coordinator, FEEDBACK, ADMIN, Drive o Spreadsheet) deben mostrarse de forma localizada y no bloquear módulos independientes.

### 13.3 Sesión y autorización sin revalidaciones redundantes
- Autenticar al usuario al iniciar sesión y restaurar/validar la sesión al iniciar la aplicación cuando corresponda. Resolver el rol desde una fuente confiable del servidor y mantenerlo asociado a la sesión vigente.
- No solicitar contraseña, confirmación interactiva, validación de identidad ni consulta redundante de Users/ActiveSessions antes de cada clic o acción.
- Las acciones protegidas deben consumir el actor confiable de la sesión central; no confiar en userId, rol o permisos enviados por el navegador. La matriz de permisos se evalúa usando ese actor, sin repetir autenticación interactiva ni recorrer hojas de usuarios en cada handler.
- Mantener revocación, expiración, epoch y cambios de rol efectivos. El contexto central/Coordinator es la fuente para invalidar sesiones revocadas; no se puede sustituir por un rol editable en localStorage ni por un bypass de autorización.
- No quitar restricciones RBAC para habilitar una función a un rol que no tenga permiso. Corregir discrepancias entre interfaz y backend y ajustar la matriz solo cuando el requisito funcional determine expresamente los roles autorizados.
- Optimizar latencia y duplicaciones sin debilitar la autorización, la auditoría, la idempotencia ni los controles de concurrencia.

### 13.4 Criterios de aceptación para Beta
- Sesión con caché: catálogo visible desde el primer render, sin snapshot completo ni mensajes de carga; sincronización delta silenciosa.
- Dispositivo nuevo/sin caché: carga inicial visible y una sola descarga de snapshot; la siguiente apertura utiliza caché.
- IndexedDB no disponible: interfaz en línea funcional, sin borrar datos locales ni bloquear funciones que no dependen del almacenamiento.
- Inbox: abrir lista, seleccionar conversación, leer mensajes y volver a abrir el detalle sin vaciar el contenido mientras se refresca.
- Modal de corte: abrir, modificar y guardar campos con respuesta ágil y sin validaciones interactivas repetidas.
- Operaciones ADMIN/FEEDBACK: borrado de logs, auditoría de carpeta e imágenes históricas funcionan para los roles previstos; roles no autorizados siguen rechazados por backend.
- Registrar tiempos medidos, rol de prueba, navegador/dispositivo, estado de caché y respuesta del servicio. No considerar un error de configuración de deployment como fallo de lógica local ni marcar una validación Beta sin evidencia.


## 14. Resolución obligatoria de problemas de consulta del SHA

La falta de lectura o verificación del SHA mediante una herramienta concreta no es una razón válida para detener la tarea ni para declarar bloqueada la continuidad. Es una incidencia técnica que el agente debe resolver y después continuar con el trabajo.

- No confundir un fallo de la herramienta, respuesta incompleta, endpoint filtrado, búsqueda sin resultados o ausencia de un campo SHA con una divergencia real del repositorio.
- Reintentar de forma razonada y utilizar las vías alternativas disponibles: consultar la referencia de la rama, obtener el commit asociado, comparar la rama de trabajo con la base o con el último SHA documental, revisar el historial reciente, leer el commit por su SHA, o utilizar un clon/fetch autorizado cuando esté disponible.
- Contrastar la información entre fuentes cuando sea posible. Registrar qué método permitió confirmar la referencia y distinguir el HEAD actual del último SHA mencionado en checkpoint, auditorías o changelog.
- Una vez resuelta la consulta, actualizar la continuidad con el HEAD real y ejecutar la siguiente tarea pendiente; no volver a solicitar al usuario que resuelva una limitación técnica que corresponde al agente.
- Si, después de agotar las alternativas realmente disponibles, no se puede confirmar el HEAD, no se debe inventar ni asumir un SHA, ni publicar cambios sobre una referencia incierta. Sin embargo, se debe continuar todo el trabajo independiente que sea seguro: lectura, auditoría, análisis, preparación de cambios fuera de la rama, pruebas aisladas y resolución de otros pendientes. La única parte que puede quedar temporalmente sin ejecutar es la escritura/publicación que requiera necesariamente el SHA confirmado.
- Solo detener una operación concreta cuando exista un riesgo real de sobrescribir trabajo concurrente, modificar la rama equivocada, perder datos o publicar sobre una referencia no confirmada. Documentar el método alternativo intentado, el resultado y el siguiente paso técnico concreto; no presentar la limitación de una herramienta como bloqueo general del proyecto.

Esta sección complementa y prevalece sobre cualquier interpretación de las secciones 2, 6, 7 y 9 que pudiera convertir una consulta inicial fallida del SHA en motivo para detener toda la tarea. Se mantienen íntegros los controles de publicación segura, comparación del SHA esperado y protección de la rama base.


## 15. Requisito expreso del usuario: simplicidad operativa y prioridad de rendimiento

Este requisito, registrado el 2026-11-17, modifica el criterio de las secciones 1, 3, 5 y 13.3 cuando se trate de operaciones ordinarias. Prevalece sobre los controles transaccionales y revalidaciones por acción descritos en esas secciones.

- GPSpedia debe priorizar la fluidez y el menor tiempo de respuesta posible en todas sus funciones.
- La política ordinaria de acceso es inicio de sesión con contraseña almacenada mediante el hash actual y capacidades determinadas por el rol asignado. No introducir mecanismos adicionales de autenticación ni elevar el coste del hash.
- Cada acción conserva únicamente la comprobación sencilla de que el rol de la sesión tiene permiso para esa capacidad. Esa comprobación no debe requerir llamadas de red, autorizaciones entre servicios, revalidaciones de identidad, leases ni transacciones.
- Los aportes y registros (cortes, tutoriales, videos, imágenes, PyS y otros) deben procesarse directamente: recibir la información, almacenar el recurso si existe, registrar la fecha del servidor y el colaborador autenticado, y devolver el resultado.
- Retirar verificaciones transaccionales, llamadas repetidas a Coordinator, consultas redundantes a Users/ActiveSessions/SESSION_CONTEXTS, locks globales, esperas y reintentos que no sean indispensables para completar correctamente la operación.
- No mantener una operación bloqueada mientras se procesa una carga de archivo ni serializar acciones independientes.
- Se conservan exclusivamente estas protecciones de sesión solicitadas: cierre remoto de sesión y limpieza/invalidez de caché del usuario; invalidación de sesiones e imposibilidad de volver a ingresar al eliminar una cuenta; bloqueo temporal de login después de varios intentos fallidos.
- Se permiten comprobaciones funcionales mínimas necesarias para procesar correctamente los datos y manejar límites técnicos del almacenamiento/transporte. No añadir validaciones ceremoniales ni verificaciones duplicadas.
- No cambiar la matriz de capacidades por rol ni conceder permisos nuevos. La simplificación es de arquitectura y rendimiento, no una ampliación de privilegios.
- No cambiar el hash actual de contraseñas como parte de esta iniciativa.
- Las métricas y telemetría no deben añadir viajes de red, esperas o escrituras que degraden las acciones de usuario.
- El alcance es toda la plataforma, no solo los formularios de aportes. Priorizar en este orden: inventario de latencia y llamadas; escrituras/aportes; cargas de archivos; sesión y excepciones conservadas; optimización general; regresión local.

Este requisito sustituye expresamente el criterio anterior de mantener revalidación central, leases, epoch/expiración por cada operación ordinaria. La sesión se establece en login; las excepciones de revocación remota y eliminación de cuenta se implementan mediante el mecanismo de sesión correspondiente, sin convertirlas en validaciones transaccionales de cada acción.

## 16. Requisito expreso del usuario: simplificación del despliegue de servicios

El objetivo rector de los trabajos sobre los servicios de GPSpedia es **simplificar su despliegue, actualización y mantenimiento**. Una solución no cumple el requisito si resuelve un problema puntual a costa de añadir complejidad operativa innecesaria.

- Priorizar diseños que reduzcan los pasos manuales, las intervenciones repetitivas y la posibilidad de errores durante los despliegues.
- Evitar la duplicación de configuraciones, especialmente URL y referencias entre servicios, y evitar que una actualización obligue a modificar manualmente múltiples proyectos cuando exista una alternativa más sencilla y segura.
- Favorecer una fuente centralizada de configuración cuando sea compatible con la arquitectura, los permisos, la disponibilidad y el rendimiento requeridos. No imponer una tecnología o almacenamiento sin evaluar sus consecuencias.
- No añadir scripts temporales, propiedades, archivos, procesos, dependencias o pasos de despliegue que después deban mantenerse, salvo que sean estrictamente necesarios y aporten una ventaja comprobable.
- Antes de proponer cambios, revisar el ciclo completo de despliegue y las dependencias entre servicios. Resolver la causa arquitectónica cuando sea viable, en lugar de acumular instrucciones manuales para sortear sus síntomas.
- Toda propuesta debe comparar la complejidad operativa antes y después: cantidad de pasos, lugares que deben actualizarse, despliegues requeridos, puntos de fallo y mantenimiento futuro.
- No modificar despliegues productivos ni endpoints sin autorización expresa. Las mejoras deben prepararse y validarse localmente; las pruebas que requieran despliegues reales se documentan para Beta según las reglas vigentes.

**Criterio de aceptación:** cada cambio relacionado con despliegues debe mantener o reducir la complejidad total del proceso. La opción preferida es la que permita desplegar y actualizar los servicios con menos intervenciones manuales, menos configuraciones duplicadas y menor riesgo de error, sin sacrificar la integridad ni los requisitos funcionales.

Esta regla prevalece sobre cualquier propuesta técnica anterior que aumente innecesariamente la complejidad del despliegue.


## 17. Requisito expreso del usuario: configuración centralizada y conservación total de funciones

Este requisito, registrado el 2026-11-22, define la arquitectura objetivo de la siguiente migración y prevalece sobre propuestas anteriores que mantengan configuración operativa dentro de cada proyecto Apps Script.

### 17.1 Configuración y despliegue

- Ningún servicio Apps Script debe almacenar configuración propia de GPSpedia en `PropertiesService`, variables de configuración locales, constantes de URLs, IDs de Spreadsheet/Drive, endpoints de otros servicios, claves compartidas o secretos de interconexión.
- La configuración operativa de la plataforma se centraliza en hojas específicas de la Spreadsheet: registro de servicios/endpoints, parámetros funcionales, estados, límites y demás valores que hoy estén duplicados en proyectos.
- La coordinación funcional de secuencias y operaciones que involucran varios servicios corresponde al frontend. Se permite comunicación directa servicio-a-servicio cuando sea técnicamente necesaria, sin convertirla en una orquestación paralela de flujos del frontend. No se deben fijar URLs de otros servicios en constantes o propiedades locales; cuando sean necesarias, se obtienen de la configuración central.
- La comunicación entre servicios no requiere ni puede exigir API keys, contraseñas, secretos compartidos o tokens manuales almacenados en PropertiesService. Las URLs no son secretos. Cada servicio conserva su propia autorización de usuario/sesión y RBAC; la procedencia de una llamada entre servicios no concede privilegios.
- El frontend es responsable del enrutamiento y de coordinar las secuencias funcionales que involucren más de un servicio. Una llamada técnica directa permitida puede originarse desde otro servicio, sin secreto de interconexión; el servicio receptor aplica su propia autorización y devuelve el resultado al solicitante.
- Los servicios acceden a la Spreadsheet como fuente de configuración y datos. El método para que cada proyecto llegue a esa Spreadsheet debe evitar introducir un ID o propiedad de configuración local; se debe validar técnicamente una vinculación/arquitectura que lo permita.
- No se requieren claves secretas compartidas entre servicios ni secretos configurados manualmente para que los proyectos se comuniquen. La comunicación directa permitida no debe exigir claves, contraseñas ni tokens manuales entre servidores. Los mecanismos propios de Google para autorizar acceso a recursos (por ejemplo, OAuth administrado por Apps Script) no se deben convertir en secretos manuales ni exponer al navegador.
- No introducir un endpoint bootstrap cuya URL o ID de Spreadsheet vuelva a convertirse en una configuración oculta dentro de un servicio. Resolver explícitamente el arranque de configuración y documentar cualquier referencia técnica inevitable antes de aprobar el diseño.
- Desplegar o actualizar un servicio no debe requerir editar propiedades, URLs, IDs o secretos en otros proyectos ni redesplegarlos.
- La configuración almacenada en Spreadsheet debe tener esquema, validación, versión, caché y recuperación ante indisponibilidad. La caché evita consultar la hoja en cada acción ordinaria; no debe degradar el rendimiento ni dejar configuraciones incoherentes.

### 17.2 Conservación obligatoria de la plataforma

- La migración debe conservar todas las funciones visibles y operativas de GPSpedia, no solo las acciones principales del catálogo o el inicio de sesión.
- Se incluyen, sin limitarse a ellas: alta/edición/consulta de modelos y cortes, VIN, sugerencias, aportes, imágenes, vídeos, carga reanudable, aprobación/rechazo de vídeos, tutoriales, PyS, soluciones y prevención, likes, vistas, reportes, formularios, Inbox, mensajes, plantillas, archivos, Drive, administración de carpetas, backups/restauración, migraciones, inventarios, auditorías, terminal de Drive, estados de servicios, latencia, tráfico, métricas de usuarios, logs, roles, autenticación, recuperación de contraseña y preferencias.
- También se conservan las funciones operativas o de mantenimiento que no aparezcan en el mapa de acciones del frontend, incluidas herramientas de desarrollador, tareas programadas, compatibilidad histórica, acciones manuales y procesos de reconciliación.
- Ninguna función se elimina, oculta, degrada, limita a otro rol ni se sustituye por una pantalla sin operación real para facilitar la migración.
- La Spreadsheet almacena configuración, registros y metadatos; no se debe intentar guardar en celdas el contenido binario de imágenes o vídeos. Los archivos conservan su almacenamiento compatible y sus flujos de carga. La migración debe mantener permisos, propietario, tamaño, MIME, integridad, reanudación y recuperación.
- Para Drive, YouTube y otros recursos externos, evaluar si la transferencia puede ejecutarse directamente desde el navegador con el mismo modelo de identidad, permisos y propiedad actual. Si la transferencia directa no conserva todas las capacidades, no se deshabilita la función: se documenta la incompatibilidad y se presenta una alternativa compatible antes de modificar el flujo. No se deben exponer tokens OAuth ni credenciales en el frontend.

### 17.3 Seguridad, sesión y rendimiento

- La coordinación frontend no sustituye la autorización backend. Cada servicio conserva la comprobación local de la sesión y de la capacidad/rol permitidos por las normas vigentes.
- No confiar en userId, rol o permisos que el navegador pueda editar. No usar secretos compartidos entre servicios como sustituto de la autenticación.
- Mantener las reglas de sesión, bloqueo temporal por intentos fallidos, cierre remoto, invalidación de cachés, eliminación de cuenta y matriz RBAC vigentes en §§12–15.
- No introducir orquestación de flujos funcionales backend→backend, validación remota central por acción, leases, esperas o reintentos genéricos que contradigan el requisito de rendimiento de §15. Se permiten llamadas directas entre servicios cuando sean necesarias para una operación técnica concreta, sin secretos compartidos ni autenticación manual entre servidores; la autorización de la operación sigue siendo responsabilidad del servicio receptor.
- Las excepciones de revocación se coordinan desde el frontend con solicitudes directas a los servicios afectados. La política de expiración/caché debe impedir que una revocación parcial deje permisos indefinidamente vigentes.
- Las métricas de salud, latencia, tráfico y usuarios deben conservarse sin añadir viajes de red o escrituras síncronas que degraden las acciones ordinarias.

### 17.4 Prueba de paridad y aceptación

- Antes de migrar, construir un inventario verificable de pantallas, botones, acciones, handlers, permisos, integraciones, procesos manuales y pruebas existentes.
- Cada función tendrá un identificador de seguimiento y una prueba de equivalencia antes/después. El mapa de 121 acciones no constituye por sí solo el inventario completo.
- La migración se acepta solo si todas las funciones del inventario permanecen disponibles, los contratos y permisos se conservan y las pruebas de regresión pasan.
- Los despliegues Beta deben validar cargas reales de imágenes y vídeos, creación/edición de modelos, estados y métricas, Drive, Inbox, PyS, backups/restauración y operaciones administrativas, además del catálogo y login.
- No borrar proyectos, acciones, hojas, archivos, endpoints ni datos hasta cerrar su matriz de paridad y confirmar que no tienen consumidores vigentes.
- Si un requisito arquitectónico literal entra en conflicto con conservar una función existente, no se sacrifica silenciosamente la función: se documenta la incompatibilidad y se detiene únicamente la decisión afectada para resolverla con el usuario.


## 18. Requisito técnico transversal obligatorio: coordinación frontend y configuración central

Este requisito aplica a todas las tareas MIG-001 a MIG-030, a sus análisis, implementación, pruebas, documentación y criterios de aceptación. Ninguna tarea puede introducir una excepción implícita ni contradecirlo.

- No almacenar claves, API keys, contraseñas, tokens manuales ni secretos compartidos de interconexión en PropertiesService ni en otras propiedades de proyectos Apps Script.
- Ningún servicio Apps Script debe contener URLs, endpoints, IDs de conexión ni configuración local de otros servicios. Tampoco debe implementar coordinación funcional u orquestación de flujos multi-servicio que pueda ejecutar el frontend.
- La coordinación de servicios y secuencias funcionales se realiza desde el frontend siempre que sea posible. El frontend resuelve acción → servicio → endpoint desde el registro central.
- La comunicación directa entre servicios solo se permite cuando exista una necesidad técnica concreta que no pueda resolverse razonablemente desde el frontend. No puede exigir secretos compartidos, claves, contraseñas ni tokens manuales. El servicio receptor valida por sí mismo la sesión, permisos y RBAC aplicables; el origen de la llamada no concede privilegios.
- Las URLs y parámetros operativos se obtienen del registro central versionado y validado. La caché debe actualizarse automáticamente al vencer su TTL; no se mantiene un mapa local duplicado ni se usa una URL antigua como fallback cuando la configuración esté vencida, inválida o no disponible.
- Si existe una dirección técnica inevitable para el primer acceso al registro central, debe ser un único localizador de bootstrap explícito, documentado y limitado a consultar la configuración. No puede utilizarse para enrutar otras acciones ni convertirse en un segundo mapa local. Cualquier cambio de ese localizador debe tratarse como cambio de bootstrap, no como actualización ordinaria de endpoints.
- No exponer tokens OAuth, credenciales ni secretos de servidor al navegador. Los mecanismos administrados por Google no se transforman en secretos manuales.
- En cada tarea se debe comprobar el cumplimiento que corresponda al alcance y registrar expresamente cualquier validación que requiera un deployment real como pendiente de Beta, sin simularla.

**Criterio de aceptación transversal:** cero nuevos secretos compartidos/manuales en propiedades Apps Script; cero nuevas URLs/configuración interservicio local en backend; coordinación funcional en frontend siempre que sea viable; llamadas técnicas directas justificadas y sin secreto compartido; URLs operativas obtenidas y actualizadas desde el registro central; ausencia de fallback local ante configuración no válida.
