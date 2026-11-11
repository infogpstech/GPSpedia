# AUG-046 — Revisión técnica preliminar del acuerdo y aviso de privacidad

**Repositorio:** infogpstech/GPSpedia  
**Rama revisada:** GPSpedia2.2.5_work  
**HEAD revisado:** cf04440ffb89b744e548b956d44641d97b9c16b1  
**Fecha:** 2026-11-10  
**Estado:** revisión técnica preliminar; pendiente aprobación legal y confirmaciones del responsable del tratamiento.  
**Alcance:** lectura estática del HTML, módulos frontend/backend y esquema documental. No se accedió a datos productivos ni se verificaron despliegues, cuentas de proveedores o configuraciones reales.

## 1. Textos visibles localizados

En `index.html` se encontraron dos piezas relacionadas:

1. **Aviso Importante** (`#terms-modal`): dos párrafos sobre el carácter referencial de la información y el riesgo de intervenciones técnicas; incluye enlace a los términos.
2. **Acuerdo de uso, términos y condiciones** (`#terms-agreement-modal`): fechado “Julio, 2026”, con 16 secciones. No se encontró un aviso de privacidad independiente. La sección 13 (“Privacidad y manejo de información personal”) es el único bloque de privacidad localizado en el acuerdo.

El acuerdo identifica a **Motorlink S.A.** como entidad que autoriza el acceso y recopila información; muestra el logotipo TRACKLINK al final, pero no explica la relación jurídica/comercial entre Motorlink S.A., TRACKLINK y GPSpedia.

## 2. Categorías de información observables en el código

La siguiente lista describe campos y flujos implementados, no determina por sí misma su clasificación legal:

| Categoría | Evidencia estática | Confirmación pendiente |
|---|---|---|
| Datos de cuenta | Users: ID, nombre de usuario, contraseña almacenada/verificada, privilegios, teléfono, correo, nombre y token de sesión. AUTH también registra aceptación versionada en `TermsAcceptance`. | Qué campos son obligatorios, quién los proporciona y cuáles se mantienen realmente en producción. El código conserva compatibilidad con contraseñas heredadas sin hash; verificar si existen registros de ese tipo y su tratamiento. |
| Autenticación y seguridad | ActiveSessions: ID de usuario, usuario, token, fecha de creación y última actividad. AUTH usa hoja Logs con timestamp, nivel, mensaje y datos. | Eventos registrados, acceso a logs, retención, copias y procedimiento de eliminación. |
| Actividad de usuarios | ActividadUsuario: fecha, ID/nombre de usuario, tipo de actividad, elemento asociado y detalle. | Actividades exactas registradas y si los detalles pueden incluir datos personales, VIN u otra información identificable. |
| Contacto | El formulario público valida y almacena nombre, correo y mensaje en Contactanos; existe respuesta administrativa. | Responsable que atiende, canal de respuesta, plazo de conservación, acceso y eliminación. |
| Reportes y aportes | Feedbacks, problemas, soluciones, prevenciones, sugerencias y aportes de tutoriales; algunas operaciones asocian ID/nombre de colaborador, vehículo o corte. | Si los textos/fotos pueden contener datos de clientes, placas, VIN, rostros, ubicaciones u otros datos personales; reglas de moderación y conservación. |
| Datos técnicos vehiculares | Cortes y registros asociados incluyen marca, modelo, versiones, imágenes, identificadores de vehículo y campos VIN en el diseño actual. | Si se vinculan a propietarios/clientes o a órdenes de trabajo identificables; finalidad y límites de uso. |
| Datos locales del dispositivo | IndexedDB guarda historial de búsqueda, vehículos vistos, respuestas de validación, miniaturas y estado administrativo local. | Si se asocian a una cuenta, cuánto permanecen, cómo se borran al cerrar/cambiar de cuenta y si se sincronizan o salen del dispositivo. |
| Vídeos e imágenes | El backend utiliza Google Drive y existe flujo de carga/aprobación de vídeos de YouTube; se almacenan referencias y metadatos de contenido. | Cuenta propietaria, permisos, destinatarios, proveedores/subencargados, regiones de almacenamiento, transferencias y términos contractuales aplicables. |

**Nota de esquema:** el inventario de la copia Spreadsheet documenta Users con ocho columnas; la implementación AUG-045 define una novena columna objetivo `TermsAcceptance`. El inventario es descriptivo de una copia y no acredita el estado físico actual de la hoja productiva.

## 3. Brechas del texto actual

### Privacidad
- La sección 13 enumera finalidades generales (cuentas, acceso, seguridad y mejora), pero no detalla cada categoría de datos ni la correspondencia entre datos y finalidad.
- No indica plazos o criterios de conservación por categoría.
- No describe procedimientos para acceso, rectificación, actualización, eliminación, oposición u otras solicitudes que resulten aplicables.
- No incluye domicilio, correo o canal específico para consultas y solicitudes de privacidad.
- No identifica destinatarios/proveedores tecnológicos ni explica posibles transferencias o ubicaciones de tratamiento.
- La afirmación de que la información solo se comparte por obligación legal o autorización debe revisarse frente al uso efectivo de Google Apps Script/Sheets/Drive y YouTube, así como sus condiciones y roles contractuales.
- No describe el almacenamiento local en el navegador (historial, elementos vistos y cachés).

### Identidad y relación entre entidades
- Motorlink S.A. aparece como responsable/entidad autorizante, pero falta confirmar su denominación registral completa, domicilio, jurisdicción y contacto.
- TRACKLINK aparece como marca/logotipo, sin explicar si es marca comercial, afiliada, proveedor, encargado u otra relación con Motorlink S.A. y GPSpedia.
- No se especifica la ley aplicable, jurisdicción o mecanismo de resolución de controversias.

### Uso laboral, cuentas y confidencialidad
- Las secciones 3 y 4 limitan el uso a actividades autorizadas por Motorlink S.A. y condicionan la vigencia a la relación laboral o autorización. Requieren validación de RR. HH./Legal para que el texto refleje contratos, personal externo, contratistas y autorizaciones reales.
- Las prohibiciones de compartir capturas, conocimiento o contenido son amplias; Legal debe determinar excepciones necesarias para trabajo, auditoría, defensa de derechos y obligaciones legales.
- Deben definirse procedimiento, autoridad, causas y notificación para suspensión/cancelación de cuentas.

### Propiedad intelectual y deslinde
- La sección 6 dice que los aportes pueden revisarse, modificarse e incorporarse como conocimiento interno, pero no establece una licencia/cesión clara ni el tratamiento de aportes de terceros.
- La sección 9 prohíbe reproducción y extracción de forma amplia; revisar excepciones legales, contenido de terceros, licencias y atribución.
- La sección 7 contiene exclusiones extensas de responsabilidad y atribuye responsabilidad exclusiva al usuario. No debe asumirse que estas cláusulas son válidas o exigibles sin revisión jurídica según la jurisdicción aplicable.
- El texto de aceptación de la sección 16 debe mantenerse coherente con la aceptación individual versionada introducida en AUG-045.

## 4. Confirmaciones necesarias antes de redactar una versión definitiva

1. **Responsable legal:** nombre/cargo del profesional o área con autoridad para revisar y aprobar el texto.
2. **Jurisdicción:** país(es) donde opera Motorlink S.A., dónde se encuentran los usuarios y cuál legislación/autoridad resulta aplicable.
3. **Identidad corporativa:** razón social registrada, domicilio, datos de contacto y relación documentada entre Motorlink S.A., TRACKLINK y GPSpedia.
4. **Tratamiento real:** lista validada de campos y finalidades; distinguir datos de empleados, contratistas, usuarios, clientes y colaboradores.
5. **Proveedores y transferencias:** confirmar titularidad/configuración de Google Workspace/Apps Script/Sheets/Drive y YouTube, regiones, accesos externos y contratos/condiciones aplicables.
6. **Retención y eliminación:** plazos por categoría, respaldo, logs, contactos, actividad, aportes y cachés locales; quién ejecuta y autoriza la eliminación.
7. **Derechos y canal:** mecanismo real para solicitudes, consultas, reclamos y contacto del responsable.
8. **Política laboral y de cuentas:** validación por RR. HH./Legal de las restricciones, monitoreo, confidencialidad y suspensión.
9. **Propiedad intelectual y responsabilidad:** aprobación expresa de las cláusulas de aportes, material de terceros, extracción, garantías y deslinde.

## 5. Resultado de esta iteración

- Se completó una revisión técnica estática preliminar y se documentaron las brechas visibles.
- No se redactó ni sustituyó el acuerdo; no se modificó el HTML ni se cambió la versión `2026-07`.
- No se considera aprobada la sección 13 ni el documento completo.
- No se debe presentar el texto actual como aviso de privacidad completo ni desplegar una versión legal definitiva basándose únicamente en esta revisión.
- La tarea permanece **BLOQUEADA** hasta identificar al responsable legal competente y obtener sus decisiones sobre jurisdicción, identidad corporativa y tratamiento real. Tras recibirlas, se podrá preparar una propuesta de texto para revisión y aprobación formal.

## 6. Fuentes técnicas revisadas

- `index.html`: Aviso Importante y acuerdo de 16 secciones.
- `Services/Auth.js`: campos de cuenta, sesiones, logs y aceptación de términos.
- `Services/users.js`: lectura/gestión de perfiles.
- `Services/feedback.js`: formulario de contacto, actividad, aportes, reportes y flujo de vídeo.
- `Services/admin.js` y `Services/write.js`: referencias a Google Drive, operaciones técnicas y contenido.
- `Services/catalog.js`: lectura de contenido del catálogo.
- `offline.js`: almacenamiento local de historial, elementos vistos, caché de validación y miniaturas.
- `api-config.js`: rutas de servicios.
- `Spreadsheet/GPSpedia_DB_columnas.md`: inventario documental de hojas y columnas.

**Limitación:** el análisis estático no confirma la configuración real de las cuentas externas, los permisos de Drive/YouTube, las regiones de almacenamiento, la retención efectiva ni el contenido actual de la hoja productiva.


## 7. Adenda de alcance — aclaración del propietario de la plataforma — 2026-11-10

El usuario aclara que GPSpedia es una herramienta interna de la empresa principal y que los asuntos legales corresponden a dicha empresa. Por tanto, la aprobación legal no debe tratarse como una contratación o validación externa necesaria para que el desarrollo técnico continúe. La revisión y aprobación definitiva, si corresponde, pertenece al proceso interno de la empresa y a las personas que esta autorice.

Esta aclaración modifica la clasificación del bloqueo anterior: **no se requiere identificar a un asesor legal externo para continuar AUG-046**. No equivale, sin embargo, a una aprobación del contenido ni permite afirmar que el texto vigente ya fue aprobado por la empresa. La aprobación interna del texto definitivo debe quedar bajo responsabilidad de la empresa principal.

### Hallazgos de consistencia que deben elevarse a la empresa

La lectura del texto vigente permite señalar estos puntos concretos, sin modificarlo:

1. **Identidad de GPSpedia:** varias cláusulas mencionan a “Motorlink S.A. y GPSpedia” como si fueran dos sujetos con facultades propias (por ejemplo, la suspensión de acceso y el deslinde). Dado que GPSpedia es una herramienta de la empresa, la empresa debe confirmar la forma institucional correcta de describir la plataforma y a la entidad que ejerce esas facultades.
2. **Privacidad y proveedores tecnológicos:** la sección 13 afirma que la información solo se comparte por obligación legal o autorización. El código revisado utiliza servicios de Google para Apps Script, Sheets y Drive, y contempla publicación de vídeos mediante YouTube. La empresa debe confirmar cómo se describen esos proveedores y el acceso técnico a los datos para que el texto no resulte engañoso o incompleto.
3. **Registro de actividad:** la sección 12 menciona usuarios, fechas, actividad, aportes y acciones de seguridad, pero no informa criterios de conservación ni el procedimiento para atender solicitudes relacionadas con esos registros.
4. **Información local del navegador:** el código conserva historial de búsqueda, elementos vistos y cachés en IndexedDB. La sección 13 no explica ese almacenamiento local ni cómo se elimina al cerrar sesión, cambiar de cuenta o limpiar los datos del navegador.
5. **Canal de privacidad:** no se identifica un canal específico para consultas o solicitudes relacionadas con la información personal.
6. **Marca y entidad:** el acuerdo identifica a Motorlink S.A. y muestra la marca TRACKLINK. La aclaración confirma que GPSpedia es herramienta interna, pero no define por sí sola la denominación registral, domicilio ni relación corporativa exacta de esas marcas; no se deben inventar esos datos.

Estos son hallazgos de correspondencia entre texto y funcionamiento observable, no conclusiones sobre cumplimiento legal. La empresa puede decidir el tratamiento y la redacción institucional que correspondan.

### Límites expresos de esta iteración

- No se modificó ni se modificará el acuerdo de uso, el aviso, la fecha “Julio, 2026”, la versión 2026-07 ni el HTML que los contiene.
- No se añadió texto legal nuevo ni se alteró el flujo de aceptación de AUG-045.
- No se emitió aprobación jurídica ni aprobación en nombre de la empresa.
- No se verificaron configuraciones reales de cuentas Google/YouTube, permisos, contratos, regiones o plazos de conservación.

**Estado actualizado:** AUG-046 continúa EN PROGRESO. La revisión técnica preliminar está documentada y el bloqueo por falta de un responsable legal externo queda retirado conforme a la aclaración del usuario. Permanecen pendientes las confirmaciones operativas que solo la empresa puede proporcionar y su validación interna del contenido. No iniciar AUG-047.


## 8. Contraste técnico de flujos y datos — 2026-11-11

Esta sección amplía el inventario anterior mediante inspección dirigida de los handlers y persistencia local. Describe el comportamiento implementado en la rama de trabajo; **no confirma que los deployments de Apps Script o la hoja productiva ejecuten exactamente esta misma versión**.

### 8.1 Matriz de flujos observados

| Flujo | Datos y destino observados | Implicación para la información que debe explicar la empresa |
|---|---|---|
| Cuenta y autenticación | `Users`: ID, usuario, contraseña (hash para nuevas/actualizadas; compatibilidad de lectura con credenciales heredadas), privilegios, teléfono, correo y nombre. AUTH también guarda `TermsAcceptance`. `ActiveSessions` contiene ID/usuario, token y marcas de tiempo. | Distinguir datos de empleados/contratistas, finalidad de cada campo, quién accede a perfiles y cuánto tiempo se conservan cuenta, aceptación y sesiones. |
| Sesión en navegador | `auth.js` persiste el objeto de sesión en `localStorage` bajo `gpsepedia_session`. El cierre de sesión elimina esa clave y solicita revocación remota. | La sesión y parte de los datos de perfil/token residen en el dispositivo. La empresa debe decidir y describir el comportamiento esperado en dispositivos compartidos. |
| Catálogo offline | `offline.js` crea IndexedDB `GPSpedia_DB` con almacenes para catálogo, historial de búsqueda, vehículos consultados, miniaturas, respuestas de validación y estado administrativo. | Los datos persisten en el navegador. El cierre de sesión revisado no borra estos almacenes; no debe afirmarse que toda la información local se elimina al cerrar sesión. |
| Contacto público | `sendContactForm` no requiere sesión: recibe nombre, correo y mensaje y los escribe en `Contactanos`. | La recopilación no se limita a usuarios autenticados ni a cuentas laborales. Deben definirse finalidad, responsable de atención, acceso y retención de consultas públicas. |
| Reportes y aportes | FEEDBACK registra usuario/colaborador, ID de vehículo, descripción del problema y, cuando corresponde, metadatos del reporte (ID, corte e indicador de testigo). Problemas y sugerencias pueden incorporar imágenes y detalles técnicos. | Los textos e imágenes podrían incluir datos de clientes, placas, VIN, personas u otros identificadores. La empresa debe definir instrucciones de carga, clasificación y moderación. |
| Imágenes en Drive | En los handlers de problemas y sugerencias de FEEDBACK se invoca explícitamente `setSharing(ANYONE_WITH_LINK, VIEW)`. La función común de WRITE crea archivos en Drive, pero el fragmento revisado no aplica esa misma instrucción de compartición. | No generalizar el permiso a todas las imágenes. Confirmar si el acceso por enlace está habilitado en producción, qué carpetas/archivos afecta, si es intencional y qué contenido puede cargarse. |
| Vídeos en YouTube | FEEDBACK obtiene token OAuth de Apps Script para iniciar carga en YouTube y fija `privacyStatus: unlisted`. Guarda una solicitud de aprobación en `Feedbacks` con creador, título, descripción, URL/ID, destino, metadatos y estado. | Confirmar cuenta/canal propietario, acceso administrativo, visibilidad no listada, moderación, eliminación y tratamiento de metadatos. “No listado” no equivale a privado: quien tenga el enlace puede acceder. |
| Auditoría y actividad | AUTH escribe en `Logs` timestamp, nivel, mensaje y detalles JSON. FEEDBACK escribe `ActividadUsuario` con fecha, ID/nombre, tipo de actividad, elemento y detalle. | Definir quién puede consultar/exportar los registros, contenido potencial de los detalles y conservación. La lectura de código no muestra un calendario automático de retención. |
| Baja de cuentas | AUTH desactiva lógicamente la cuenta: reemplaza el usuario por un identificador `__deleted__`, limpia campos de perfil/credenciales y revoca sesiones. El ID histórico se conserva para mantener referencias. | La baja de acceso no equivale a eliminación de todos los registros históricos relacionados con el usuario. La empresa debe definir el alcance de la eliminación y las excepciones de conservación. |

### 8.2 Hallazgos concretos frente al texto actual

1. La sección 13 no menciona el formulario público de contacto, que recoge nombre, correo y mensaje sin autenticación.
2. La sección 13 no describe la persistencia local. En el código revisado, cerrar sesión elimina la clave de sesión, pero no borra el catálogo, historial, elementos vistos, cachés ni miniaturas de IndexedDB.
3. La sección 12 informa que puede registrarse actividad, pero no especifica el detalle de campos, los permisos de consulta ni un plazo/criterio de conservación. AUTH solo dispone de una purga manual para ciertos registros sensibles; no se encontró una política temporal automática en los módulos revisados.
4. La sección 13 dice que la información solo se comparte por obligación legal o autorización. Debe contrastarse con las cargas a Google Drive con acceso “cualquiera con el enlace” en determinados flujos y con la publicación de vídeos de YouTube como “no listados”. La empresa debe decidir qué explicación corresponde a esos recursos y a los proveedores.
5. El mecanismo de baja de cuentas es lógico y conserva el ID histórico. No debe describirse como borrado completo de toda información relacionada.
6. Los datos técnicos de vehículos no identifican necesariamente a una persona por sí solos; la empresa debe confirmar si se vinculan con órdenes de trabajo, clientes, matrículas, VIN completos/parciales, imágenes u otros registros que permitan identificarla.

### 8.3 Confirmaciones operativas para la empresa principal

Esta lista es el siguiente insumo necesario para que la empresa determine si el texto vigente refleja el funcionamiento real. No requiere que el usuario identifique un asesor externo; las respuestas pueden ser consolidadas por el área interna responsable.

1. **Versión desplegada:** confirmar que los proyectos Apps Script publicados corresponden a los servicios revisados en esta rama y señalar diferencias, si existen.
2. **Cuentas y propiedad:** identificar qué cuenta corporativa administra Apps Script, Spreadsheet, Drive y el canal de YouTube; qué personal/administradores tienen acceso y con qué permisos.
3. **Compartición de imágenes:** confirmar si las imágenes de problemas/sugerencias conservan el permiso “cualquiera con el enlace” en la operación real y si se permite subir fotografías con placas, VIN, clientes, rostros u otros datos.
4. **Vídeos:** confirmar que el canal corporativo y el estado “no listado” son los previstos; indicar quién aprueba, quién puede cambiar visibilidad y cómo se retiran vídeos.
5. **Datos del contacto:** confirmar quién atiende el formulario público, para qué se utiliza el nombre/correo/mensaje y durante cuánto tiempo se conservan.
6. **Registros:** fijar criterios de conservación y acceso para `Logs`, `ActividadUsuario`, `ActiveSessions` y registros de contacto/aportes; confirmar si existen limpiezas externas o manuales no visibles en el código.
7. **Baja y eliminación:** determinar qué datos se eliminan, anonimizan o conservan cuando termina la relación laboral o se desactiva una cuenta, incluidos aportes, actividad, backups y referencias históricas.
8. **Almacenamiento local:** decidir si la persistencia de catálogo, búsquedas, vehículos vistos, miniaturas y recuperaciones de carga en el dispositivo es aceptable en equipos compartidos y si se espera limpieza al cerrar sesión.
9. **Datos de vehículos e imágenes:** confirmar si los aportes pueden contener datos personales de clientes/terceros y qué instrucciones o controles internos se aplican.
10. **Google/YouTube:** confirmar términos corporativos aplicables, configuración de región/ubicación, accesos de soporte, transferencias y condiciones de los servicios. El repositorio no permite verificar estos aspectos.
11. **Solicitudes de privacidad:** indicar el canal corporativo que recibe consultas/reclamos y quién verifica identidad, responde y ejecuta correcciones o eliminaciones.
12. **Respaldos:** confirmar frecuencia, ubicación, acceso, duración y eliminación de copias de Spreadsheet/Drive y de registros auxiliares.

### 8.4 Alcance y límites

- Se revisaron los handlers y módulos locales indicados; no se realizaron llamadas a endpoints, despliegues, hojas productivas, Drive ni YouTube.
- La presencia de una función en el repositorio no acredita que esté desplegada ni que su configuración de producción sea idéntica.
- No se alteró el acuerdo, el aviso, su versión/fecha, HTML, frontend, backend ni datos.
- Esta matriz es evidencia técnica para decisión interna, no aprobación jurídica.

**Estado de AUG-046:** EN PROGRESO. El contraste de código está ampliado y la lista de confirmaciones queda preparada para la empresa principal. La validación corporativa del contenido sigue pendiente; no se presume aprobación. No iniciar AUG-047.



### 8.5 Revalidación puntual del cierre de sesión y persistencia local — 2026-11-11

Se volvió a comprobar el código versionado para precisar el comportamiento al cerrar sesión:

- En `auth.js`, `logout()` (líneas 345–397) valida que la sesión local no haya sido sustituida, limpia el estado en memoria y elimina únicamente la clave `gpsepedia_session` de `localStorage`. Después solicita la revocación remota mediante `routeAction('logout', ...)`; si no recibe confirmación, informa que la revocación queda pendiente.
- En el mismo módulo, la precarga y rehidratación de PyS utiliza `gpsepedia_pys_cache` en `localStorage` (líneas 164 y 268–275). El cuerpo de `logout()` no elimina esa clave.
- En `offline.js`, la base `GPSpedia_DB` (versión 4) declara los almacenes `catalog`, `searchHistory`, `viewedItems`, `thumbnails`, `validationCache` y `adminLocalState` (líneas 8–83). El cierre de sesión revisado no invoca una rutina de borrado de esa base ni vacía esos almacenes.

**Resultado de esta revalidación:** la afirmación de la sección 8.2 sobre persistencia después del cierre de sesión coincide con el código actual de la rama. Esto describe exclusivamente el código versionado; no acredita el comportamiento de deployments externos ni prueba la persistencia en un navegador/dispositivo real. No se ejecutó una prueba de navegador ni se accedió a datos productivos.


### 8.6 Revalidación del flujo de contacto público — 2026-11-10

Se siguió la ruta desde el formulario del cliente hasta el handler FEEDBACK y la lectura del Inbox:

- **Captura en el cliente:** `index.html` define los campos Nombre, Correo Electrónico y Mensaje. En `main.js` (líneas 793–806), el submit recopila esos tres valores y también intenta adjuntar `currentUser?.ID`, si existe, antes de llamar `sendContactForm`.
- **Autorización de escritura:** `api-config.js` enruta `sendContactForm` a FEEDBACK. En `Services/feedback.js` (líneas 311–333), la acción figura en `FEEDBACK_PUBLIC_ACTIONS`; no pasa por `assertFeedbackSession`. El autorizador reemplaza el `userId` recibido por el valor fijo `N/A`. Por tanto, el identificador de cuenta que pudiera enviar el cliente no se conserva en esta ruta.
- **Validación y almacenamiento:** `handleSendContactForm` (líneas 1341–1361) exige nombre, correo y mensaje; limita sus longitudes a 100, 254 y 3000 caracteres, respectivamente, y valida el formato básico del correo. Aplica un contador de frecuencia con `CacheService.getScriptCache()`, bajo la clave `feedback-rate:public_contact:<bucket>`, con límite de 10 solicitudes por intervalo de 3600 segundos. La clave no incorpora identidad del remitente. Después escribe en la hoja `Contactanos`: `User_ID = N/A`, `Asunto = "Contacto de " + nombre` y `Mensaje = "De: " + correo + "\\n\\n" + mensaje`.
- **Consulta del Inbox:** `getFeedbackItems` está restringida por `FEEDBACK_ACTION_PERMISSIONS` a los roles `Desarrollador`, `Gefe`, `Jefe` y `Supervisor`. El handler incorpora los registros de `Contactanos` a la respuesta unificada del Inbox. La acción pública de envío no hace pública la consulta de esos registros.

**Resultado descriptivo:** el formulario puede enviar consultas sin una sesión autenticada; el backend no asocia esos envíos a una cuenta GPSpedia, aunque el cliente intente enviar el ID de la sesión actual. Los datos se almacenan en `Contactanos` y su consulta mediante el Inbox está sujeta a los roles indicados en el código. El límite de frecuencia observado es un contador de caché de script por intervalo, no un límite individual por remitente.

**Límites:** se comprobó el código versionado de la rama, no la configuración desplegada, los permisos reales de la hoja, las cuentas que pueden acceder a ella, el plazo efectivo de conservación ni quién atiende los mensajes en operación. No se enviaron formularios ni se consultó Spreadsheet productivo.

## 9. Consistencia entre los textos informativos y el acuerdo vigente — 2026-11-11

Se realizó una comparación adicional de las superficies informativas presentes en `index.html`: Aviso Importante, acuerdo de uso, modal «Sobre Nosotros» y preguntas frecuentes. El análisis se limita a consistencia documental; no propone ni aplica cambios al contenido.

### 9.1 Diferencias y puntos que requieren decisión corporativa

1. **Titularidad y alcance de propiedad intelectual.** La sección 9 del acuerdo describe todo el contenido organizado en GPSpedia —incluidos textos, fotografías, diagramas, tablas y procedimientos— como recurso privado y restringe su reproducción. En cambio, «Sobre Nosotros» aclara que GPSpedia no busca atribuirse derechos sobre información técnica original de fabricantes, autores o fuentes externas, y la FAQ describe la información técnica como compilación de datos de libre acceso y conocimiento práctico sobre la que GPSpedia no reclama autoría exclusiva. No son necesariamente afirmaciones incompatibles si se distingue entre material de terceros y la selección, estructura, organización y material interno; sin embargo, esa distinción no queda expresada con precisión uniforme en las tres superficies. La empresa debe confirmar qué categorías controla, qué materiales son de terceros y qué restricciones corresponden a cada categoría.
2. **Identidad institucional.** El acuerdo atribuye facultades a Motorlink S.A. y, en algunas cláusulas, presenta «Motorlink S.A. y GPSpedia» como sujetos separados; los modales «Sobre Nosotros» y FAQ hablan de GPSpedia como plataforma/marca, mientras el acuerdo muestra el logotipo TRACKLINK. Debe definirse una descripción institucional única que explique empresa responsable, plataforma y marcas sin atribuir personalidad jurídica a GPSpedia.
3. **Aviso breve y acuerdo.** El Aviso Importante presenta el uso bajo responsabilidad del usuario y enlaza al acuerdo, pero no identifica por sí mismo a la empresa responsable ni resume el tratamiento de datos. La aceptación versionada de AUG-045 corresponde al acuerdo completo; la empresa debe confirmar que la forma de presentar el aviso breve y el documento enlazado refleja la política corporativa deseada. No se modificó el flujo.
4. **Finalidad de la herramienta.** El acuerdo limita el uso a actividades laborales y trabajos realizados en representación de Motorlink S.A.; «Sobre Nosotros» y FAQ describen el producto de forma más general, como plataforma de consulta técnica y apoyo profesional. Conviene distinguir el propósito general de la herramienta de los permisos y límites aplicables al usuario interno.

### 9.2 Evidencia de ubicación

- `index.html`, modal `#terms-modal`: Aviso Importante y enlace a los Términos y Condiciones.
- `index.html`, modal `#terms-agreement-modal`: secciones 1, 3, 4, 6, 7, 9, 10, 12, 13 y 16.
- `index.html`, modal `#about-us-modal`: descripción de la plataforma, fuentes de información y aclaración sobre derechos de fabricantes/autores/fuentes externas.
- `index.html`, `#faq-modal`: respuesta «¿La información tiene derechos de autor?».
- SHA del archivo revisado en la rama de trabajo: `5d6c57956e18e7b504475222ba9fa97ef239c947` (sin cambios).

### 9.3 Resultado y límites

Se amplía el inventario de consistencia: además de confirmar los flujos de datos de la sección 8, la empresa debe resolver la delimitación entre contenido de terceros, material interno y estructura/organización propia, y unificar la descripción institucional y el propósito laboral. Son decisiones de la empresa principal; no se infiere titularidad, licencia ni aprobación jurídica a partir del código.

No se modificó `index.html`, el Aviso Importante, el acuerdo, la sección 13, los textos de «Sobre Nosotros» o FAQ, la versión/fecha 2026-07, el frontend, el backend, el flujo AUG-045, endpoints, deployments ni datos productivos.

**Estado de AUG-046:** EN PROGRESO. Revisión comparativa documental ampliada; quedan las confirmaciones operativas y la validación interna corporativa. No iniciar AUG-047.


### 9.4 Aclaración del responsable del proyecto — 2026-11-11

El usuario corrigió expresamente la interpretación de los puntos 1 y 2 anteriores y proporcionó la siguiente descripción funcional e institucional, que prevalece para el contexto de esta auditoría:

- **GPSpedia:** la plataforma y herramienta. La plataforma, su código, diseño, organización, estructura general y elementos propios constituyen el desarrollo privado de la empresa y están protegidos por derechos de autor, según la definición del proyecto.
- **Contenido público organizado:** las imágenes y videos compartidos corresponden a conocimiento público. GPSpedia no pretende atribuirse la autoría de esos materiales originales; su función es organizarlos, etiquetarlos, agregar información útil y reunir con mayor precisión información que se encuentra dispersa en otras fuentes.
- **TRACKLINK:** marca corporativa de la empresa.
- **Motorlink S.A.:** la empresa y su nombre registrado en Honduras.

**Corrección de la revisión anterior:** no debe mantenerse como pendiente que la empresa tenga que decidir desde cero la distinción entre la plataforma/estructura propia y los materiales públicos compartidos, ni que deba definir nuevamente la relación entre GPSpedia, TRACKLINK y Motorlink S.A. El responsable del proyecto ya aclaró esos conceptos. Los puntos 1 y 2 de la sección 9.1 quedan reemplazados por esta aclaración y no deben tratarse como contradicciones pendientes del producto.

La auditoría de esta tarea se limita a describir el funcionamiento técnico y registrar las definiciones del responsable del proyecto. No emitiré opiniones, interpretaciones ni recomendaciones jurídicas, ni sustituiré la revisión o aprobación que corresponda a la empresa. Esta aclaración no autoriza cambios en el acuerdo ni en otros textos legales.


## 10. Delimitación técnica de la revisión — 2026-11-11

Esta adenda precisa el alcance de las observaciones anteriores para que el registro no atribuya al análisis técnico funciones de asesoría o aprobación jurídica.

1. Las observaciones de las secciones 3, 4, 5 y 9.1 que solicitan decisiones de Legal, interpretan el alcance de cláusulas, califican su validez o plantean contradicciones sobre titularidad e identidad no constituyen conclusiones de esta auditoría. Deben leerse como antecedentes históricos de la revisión preliminar, no como dictámenes, recomendaciones ni instrucciones jurídicas.
2. Los puntos 1 y 2 de la sección 9.1 quedan expresamente sustituidos por la definición del responsable registrada en 9.4. No son inconsistencias pendientes.
3. La comprobación que continúa en AUG-046 es exclusivamente técnica y descriptiva: contrastar los textos existentes con los flujos, campos, destinos, permisos y persistencia que pueden observarse en el código versionado; distinguir lo que está implementado de lo que no puede verificarse sin acceso a la operación corporativa.
4. Las confirmaciones sobre cuentas, permisos, conservación, proveedores, respaldos y atención de solicitudes son datos operativos que debe aportar la empresa. Su registro no implica que esta auditoría determine obligaciones, suficiencia, validez o cumplimiento legal.
5. La empresa conserva íntegramente la responsabilidad de cualquier revisión y aprobación interna. Esta auditoría no aprueba, rechaza, redacta ni modifica el acuerdo o el aviso.

**Límite permanente:** no modificar el acuerdo de uso, el aviso, sus fechas/versiones, los modales informativos ni el flujo de aceptación. No emitir interpretaciones, opiniones o recomendaciones jurídicas. No iniciar AUG-047.


## 11. Contraste puntual de registros técnicos y actividad de usuarios — 2026-11-11

Se revisaron las rutas de registro, consulta y limpieza de las hojas `Logs` y `ActividadUsuario` en el código versionado de AUTH y FEEDBACK.

- **Registros técnicos de AUTH:** `logToSheet()` escribe en `Logs` cuatro campos: marca de tiempo ISO, nivel, mensaje y detalles serializados como JSON. Inserta cada nuevo registro en la fila 2, debajo de los encabezados. El dispatcher AUTH registra la recepción y el análisis de las solicitudes, además de errores; por ello, la hoja puede contener metadatos técnicos y detalles de ejecución.
- **Consulta de Logs:** no se encontró una acción de lectura de la hoja `Logs` en el dispatcher AUTH ni una ruta `getLogs` en `api-config.js`. Esto solo describe la interfaz de la aplicación revisada; no permite determinar quién puede abrir la hoja directamente ni sus permisos efectivos en Google Sheets.
- **Limpieza de Logs:** `clearSensitiveLogs` está reservada a una cuenta activa con rol Desarrollador y sesión válida, con comprobaciones de unicidad, expiración y revocación pendiente. La rutina elimina registros que coinciden con patrones concretos de campos de credenciales, el inicio de sesión con nombre de usuario o el mensaje de comparación de contraseña. No aplica un corte por antigüedad ni elimina todos los registros. No se encontró otra rutina de purga de `Logs` en AUTH.
- **Consulta de ActividadUsuario:** FEEDBACK autoriza `getActivityLogs` para los roles `Desarrollador`, `Gefe` y `Supervisor`. El handler devuelve los campos ID, fecha, ID/nombre de usuario, tipo de actividad, elemento asociado y detalle; invierte el orden de las filas y limita la respuesta a 100 registros.
- **Limpieza de ActividadUsuario:** `clearActivityLogs` está reservada a Desarrollador. Si se invoca sin `keepLastWeek: true`, limpia el contenido de todos los registros y conserva la fila de encabezados. Si se invoca con ese indicador, elimina filas cuya marca de tiempo tenga más de siete días; los registros con fecha vacía o no interpretable no cumplen esa condición y no son eliminados por esa rama.
- **Carácter de la limpieza:** ambas purgas son acciones invocables de forma explícita. En los módulos AUTH y FEEDBACK revisados no se encontró la creación de un trigger temporal para ejecutarlas automáticamente. Por tanto, el código observado no acredita una política automática de conservación por antigüedad para estas dos hojas.

**Resultado descriptivo:** la aplicación ofrece consulta de una ventana de hasta 100 registros de actividad a determinados roles y limpieza manual de esa hoja por Desarrollador. Para la hoja técnica `Logs`, el código revisado ofrece una purga manual y selectiva de determinados registros sensibles, pero no una acción de consulta desde el dispatcher AUTH ni una purga temporal general. Los permisos directos de las hojas, las copias de seguridad y cualquier limpieza externa no pueden deducirse de estos módulos.

**Límites:** la revisión corresponde a `Services/Auth.js`, `Services/feedback.js` y `api-config.js` versionados en esta rama. No se consultaron las hojas reales, no se ejecutaron acciones de consulta o borrado, no se inspeccionaron permisos de Google Sheets y no se verificaron deployments ni procesos externos. No se modificó código de aplicación, texto del acuerdo, aviso, modales ni flujo de aceptación.

**Ubicaciones de referencia en el HEAD revisado:** `Services/Auth.js` — `logToSheet()` (línea 255) y `handleClearSensitiveLogs()` (línea 290); `Services/feedback.js` — matriz `FEEDBACK_ACTION_PERMISSIONS` (línea 303), `handleGetActivityLogs()` (línea 1552) y `handleClearActivityLogs()` (línea 1989).


## 12. Contraste del ciclo de vida de vídeos de YouTube — 2026-11-10

Se siguió el flujo de inicialización, transferencia, solicitud, consulta, aprobación y rechazo del vídeo en `youtubeUpload.js`, `Services/feedback.js`, `api-config.js` y el formulario de `add_cortes.html`.

- **Creación y visibilidad inicial:** `handleInitYouTubeUpload()` construye la metadata enviada al endpoint de carga reanudable de YouTube con `privacyStatus: "unlisted"` (no listado). La opción `publicStatsViewable: false` aparece en el mismo objeto, pero no cambia el estado de visibilidad del vídeo. La subida se realiza directamente desde el cliente a la sesión reanudable obtenida del backend.
- **Acceso antes de la aprobación:** al terminar la transferencia, el cliente construye la URL de YouTube y llama a `submitVideoForApproval`. El backend guarda en `Feedbacks` el ID y URL del vídeo, título, descripción, creador, tipo y referencia del contenido, metadatos, identificador de operación y estado `pending`. La respuesta al usuario también contiene la URL. Por tanto, antes de la aprobación el vídeo ya existe en YouTube como no listado; no equivale a un vídeo privado y puede ser visto por quien disponga del enlace.
- **Autenticación y consulta:** las acciones de inicialización, consulta de estado y envío de solicitud pasan por `assertFeedbackSession`, que exige sesión activa y cuenta habilitada. La consulta `getVideoApprovalByOperation` comprueba que `createdByUserId` coincida con el usuario autenticado y devuelve estado y URL del vídeo. Las acciones de aprobación y rechazo tienen además una lista de roles permitidos: `Desarrollador`, `Gefe` y `Supervisor`.
- **Aprobación:** `handleApproveVideo()` escribe y verifica la URL en el registro de destino de GPSpedia y cambia el estado de la solicitud a `approved`. En el flujo revisado no se hace una llamada a YouTube para cambiar `privacyStatus`; la aprobación publica el enlace en el contenido de GPSpedia, pero no convierte el vídeo en público en YouTube.
- **Rechazo:** `handleRejectVideo()` retira del destino el enlace exacto y, para tutoriales, la miniatura que corresponda al vídeo. Después marca la solicitud como `rejected`. No se observó en este handler una llamada a YouTube para eliminar el vídeo ni para cambiar su visibilidad. El registro de aprobación conserva el ID y la URL, y la consulta del creador sigue devolviendo la URL junto con el estado.
- **Texto de interfaz:** el modal de subida y la alerta final explican que el vídeo se transfiere como no listado y que solo aparece en GPSpedia tras aprobarse. La etiqueta de estado en `add_cortes.html` dice de forma abreviada que el vídeo «solo será visible después de su aprobación» sin repetir «en GPSpedia»; por sí sola no explica que el recurso ya existe en YouTube y permanece no listado mientras espera revisión.

**Resultado descriptivo:** la aprobación controla la asociación/publicación del enlace dentro de GPSpedia. No controla, según el flujo versionado revisado, el cambio de privacidad o la eliminación del archivo alojado en YouTube. Un rechazo retira el enlace del destino de GPSpedia, pero no equivale a retirar el vídeo de YouTube; la URL también permanece en el registro de solicitud. Esta diferencia concreta amplía la descripción general de vídeos no listados de la sección 8.1.

**Límites:** se revisó el flujo versionado en la rama de trabajo; no se consultó el canal de YouTube, no se verificaron vídeos reales, propietarios, permisos, configuración del canal ni deployments de Apps Script. No se ejecutaron subidas, aprobaciones, rechazos ni eliminaciones. La ausencia de una llamada de actualización/eliminación se limita a los handlers de FEEDBACK revisados; no descarta acciones manuales o procesos externos. No se modificó código de aplicación, texto del acuerdo, aviso, modales ni flujo de aceptación.

**Ubicaciones de referencia:** `Services/feedback.js` — `assertFeedbackSession()` (línea 53), `handleInitYouTubeUpload()` (línea 2042), metadata de visibilidad (línea 2066), `handleGetVideoApprovalByOperation()` (línea 2158), `handleSubmitVideoForApproval()` (línea 2182), `publishApprovedVideo_()` (línea 2360), `removeRejectedVideoFromDestination_()` (línea 2387), `handleApproveVideo()` (línea 2405) y `handleRejectVideo()` (línea 2470); `youtubeUpload.js` — texto del modal (línea 285), creación de URL y envío de solicitud (líneas 591–593), confirmación al usuario (línea 612); `add_cortes.html` — etiqueta de solicitud pendiente (líneas 309–310).


## 13. Ciclo de vida de imágenes adjuntas a sugerencias de cortes — 2026-11-10

Se contrastó el almacenamiento y la eliminación de imágenes adjuntas a las sugerencias de cambio de cortes, desde FEEDBACK hasta la acción de borrado del Inbox.

- **Carga y acceso:** `handleSuggestCutChange()` acepta una imagen opcional en `imgBase64`. Cuando se proporciona, crea un archivo JPEG en la carpeta de Drive `SugerenciasCortes`, aplica explícitamente `DriveApp.Access.ANYONE_WITH_LINK` con permiso `VIEW` y conserva su URL en el campo `imageUrl` del registro `suggestion_cut`, serializado en la columna `Problema` de `Feedbacks`.
- **Lectura en el Inbox:** `handleGetFeedbackItems()` interpreta el registro `suggestion_cut` y devuelve `suggestionData`, que incluye `imageUrl`. En `ui.js`, el detalle del mensaje presenta esa URL como enlace «Ver imagen de referencia».
- **Eliminación del registro:** la interfaz llama a `deleteFeedbackItem(item.id, item.type, ...)`. Estas sugerencias se presentan al Inbox con `type: "problem_report"`. La política FEEDBACK restringe `deleteFeedbackItem` a los roles `Desarrollador`, `Gefe`, `Jefe` y `Supervisor`. Para `problem_report`, `handleDeleteFeedbackItem()` elimina la fila correspondiente de `Feedbacks`.
- **Efecto sobre el archivo:** el handler de eliminación no extrae la URL de `suggestionData`, no invoca `DriveApp`, no envía el archivo a la papelera ni modifica su configuración de compartición. En el flujo versionado revisado, eliminar la sugerencia del Inbox elimina el registro que contiene la referencia, pero no ejecuta la eliminación del archivo de Drive ni la revocación del acceso por enlace.
- **Alcance:** este resultado corresponde a sugerencias `suggestion_cut` que adjuntan imagen y a la acción `deleteFeedbackItem`; no se generaliza a otros tipos de archivos ni a procesos externos de administración de Drive.

**Resultado descriptivo:** la eliminación del registro de una sugerencia no equivale a la eliminación de su imagen adjunta. El archivo puede conservar su permiso de acceso por enlace aunque la fila que contenía su URL ya no esté en `Feedbacks`. La revisión describe las llamadas presentes en el código, no confirma accesibilidad real de archivos ni configuración efectiva de Drive en producción.

**Límites:** revisión estática de la rama `GPSpedia2.2.5_work`; no se consultaron archivos, carpetas ni permisos reales de Drive, no se ejecutó una carga o eliminación y no se verificaron deployments ni tareas externas de limpieza. No se modificó código funcional, acuerdo, aviso, modales ni flujo de aceptación.

**Ubicaciones de referencia en el HEAD revisado:** `Services/feedback.js` — `FEEDBACK_ACTION_PERMISSIONS` (línea 310), `handleSuggestCutChange()` (línea 1613), `handleGetFeedbackItems()` (línea 1470 aprox.) y `handleDeleteFeedbackItem()` (línea 1877); `ui.js` — renderizado de `suggestionData.imageUrl` y llamada a `deleteFeedbackItem()` (línea 6317).
