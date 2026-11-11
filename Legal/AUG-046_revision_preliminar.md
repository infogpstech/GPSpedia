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
