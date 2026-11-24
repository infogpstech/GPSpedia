# MIG-006 — Spike técnico de acceso a Spreadsheet

Fecha: 2026-11-23  
Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
HEAD de análisis: 7b532a9e799b6ad72e9a02c2732b77d12158c6f2

## 1. Objetivo

Determinar si los servicios Apps Script pueden acceder a la Spreadsheet sin guardar un ID, URL bootstrap o credencial manual en código, PropertiesService u otra configuración local. La aceptación exige comprobarlo desde una Web App desplegada, no solo desde el editor.

## 2. Hallazgos del código actual

- AUTH, CATALOG, USERS, WRITE, FEEDBACK, ADMIN y UTILITIES declaran el mismo identificador mediante SPREADSHEET_ID y usan SpreadsheetApp.openById().
- InboxConversations no abre directamente la Spreadsheet; sus funciones se ejecutan dentro del proyecto FEEDBACK.
- No se encontró uso de SpreadsheetApp.getActiveSpreadsheet() como mecanismo de acceso en los servicios revisados.
- El ID actual es un localizador de recurso, no una credencial; aun así, su presencia en constantes locales contradice el objetivo de configuración centralizada de NORMAS §17.
- No se leyó ni modificó ningún valor de ScriptProperties, deployment, hoja ni dato real.

## 3. Decisión técnica sobre el contexto activo

SpreadsheetApp.getActiveSpreadsheet() puede devolver la Spreadsheet activa o null cuando la ejecución no tiene un contexto activo. Por ello, no se puede sustituir openById() de forma global por getActiveSpreadsheet() basándose únicamente en que el proyecto esté vinculado a una hoja o en que la función opere desde el editor.

La Web App debe probarse realmente. Se preparó JS/Tests/MIG006SpreadsheetAccessProbe.js, que expone:
- GET /exec: consulta read-only del contexto activo y del marcador de prueba.
- GET /exec?probeUi=1: formulario de prueba para invocar el POST desde el propio navegador.
- POST /exec: escribe únicamente en la hoja reservada __MIG006_ACCESS_PROBE__, y solo cuando recibe confirmDisposable=true.

El probe no contiene IDs, URLs de otros servicios, PropertiesService, UrlFetchApp, API keys, tokens ni secretos. La UI de escritura debe desplegarse con acceso restringido a la cuenta operadora y solo en una Spreadsheet desechable. El código no incluye borrado automático ni toca otras hojas.

## 4. Prueba local ejecutada y alcance

Se añadió JS/Tests/MIG006SpreadsheetAccessProbe.mjs y se integró en JS/Tests/RunServiceTests.mjs. La prueba usa dobles aislados de SpreadsheetApp, ContentService y HtmlService para verificar:
- ausencia de IDs, secretos, PropertiesService y llamadas HTTP;
- comportamiento cerrado cuando getActiveSpreadsheet() devuelve null;
- formulario Web App con POST;
- GET read-only sin crear hojas ni escribir;
- rechazo de POST sin confirmación explícita;
- escritura limitada al rango A1:B1 de la hoja de prueba y lectura posterior del marcador.

Esta simulación valida la lógica y las guardas del probe. No simula ni afirma que Google Apps Script entregue un contenedor activo en una ejecución Web App real.

## 5. Resultado de las alternativas

| Alternativa | Resultado en este corte | Decisión |
|---|---|---|
| Proyecto independiente vinculado a la Spreadsheet | No hay evidencia Web App desplegada que confirme el contexto activo | Pendiente de prueba Beta |
| Varios proyectos independientes sobre el mismo contenedor | No probado en Web Apps; cada proyecto debe demostrar su propio contexto y permisos | Pendiente de prueba Beta |
| Consolidar módulos en un proyecto vinculado | Puede reducir proyectos y duplicación, pero no resuelve por sí solo un contexto Web App nulo | Evaluar solo después de la prueba real |
| openById con ID en constantes/propiedades | Es el patrón actual, pero mantiene configuración local prohibida por §17 | No adoptar como arquitectura objetivo |
| Bootstrap que devuelve el ID desde otro servicio | Crea circularidad y una dependencia operativa adicional | Rechazado |
| Configuración centralizada en Spreadsheet | Es el destino aprobado, pero primero debe existir un mecanismo no circular para abrirla | Mantener como objetivo |

## 6. Límites, cuotas y operación

No se ejecutaron mediciones de cuotas, latencia, concurrencia ni límites de tamaño en Apps Script porque no hubo deployment ni Spreadsheet desechable autorizados en esta sesión. Tampoco se consultaron manifiestos/scopes ni identidades efectivas de los proyectos instalados. No se extrapolan cifras de CI a Apps Script.

La prueba Beta debe registrar, por cada proyecto y tipo de ejecución: modo de despliegue y cuenta efectiva; resultado de getActiveSpreadsheet() (objeto o null), sin registrar el ID; capacidad de leer la hoja reservada; capacidad de escribir y leer el marcador; comportamiento con dos ejecuciones concurrentes y con dos proyectos independientes; tiempo de respuesta, errores de permisos y límites observados.

## 7. Reglas de comunicación entre servicios — aclaración del usuario 2026-11-23

- La coordinación funcional de secuencias y operaciones que involucran varios servicios corresponde al frontend.
- Se permite comunicación directa servicio-a-servicio cuando sea técnicamente necesaria; no debe convertirse en una orquestación paralela de flujos que corresponde al frontend.
- La comunicación entre servicios no requiere ni puede exigir API keys, contraseñas, secretos compartidos o tokens manuales almacenados en ScriptProperties.
- Las URLs no son secretos; cuando una llamada directa sea necesaria, su localización debe proceder de la configuración central, no de constantes o propiedades duplicadas por proyecto.
- Cada servicio conserva la autorización de la operación y la validación de sesión/RBAC que le corresponde. La mera procedencia de una llamada de otro servicio no concede privilegios.
- Los tokens OAuth administrados por Google no se copian al frontend ni se convierten en secretos manuales de interconexión.

Esta aclaración corrige las propuestas históricas que prohibían toda comunicación backend→backend o exigían secretos compartidos para ella. No autoriza mantener Coordinator/SharedMutation como coordinadores de negocio ni reintroducir configuración local.

## 8. Procedimiento Beta reproducible

### 8.1 Sincronización obligatoria antes de probar

Ejecutar desde una copia local limpia del repositorio:

    cd /ruta/a/GPSpedia || exit 1
    test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || { echo "Repositorio incorrecto"; exit 1; }
    test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
    test -z "$(git status --porcelain)" || { echo "Hay cambios locales sin guardar"; exit 1; }
    git fetch origin
    git pull --ff-only origin GPSpedia2.2.5_work
    test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
    git status --short
    git rev-parse HEAD

No usar reset, clean, force ni comandos que descarten cambios locales.

### 8.2 Preparación de la prueba Web App

1. Crear una Spreadsheet desechable, sin datos productivos.
2. Crear un proyecto Apps Script vinculado a esa Spreadsheet.
3. Copiar únicamente el contenido de JS/Tests/MIG006SpreadsheetAccessProbe.js en un archivo del proyecto temporal.
4. Guardar y desplegar una nueva versión como Aplicación web. Usar la misma identidad de ejecución que el deployment que se pretende sustituir y restringir el acceso a la cuenta operadora (no acceso público).
5. Abrir /exec. Registrar el código devuelto. Abrir /exec?probeUi=1 y pulsar el botón de escritura.
6. Volver a abrir /exec y confirmar writeMarkerDetected=true. Verificar en la hoja reservada que solo A1:B1 fue modificado.
7. Repetir con un segundo proyecto independiente, apuntando al mismo contenedor desechable si la plataforma permite esa vinculación. No asumir que el primer resultado aplica a los demás proyectos.
8. Repetir en un segundo deployment/ejecución con la identidad efectiva equivalente a la operación real, si el modelo de permisos difiere.
9. Eliminar manualmente el proyecto y Spreadsheet desechables al finalizar, después de conservar evidencia anonimizada.

No copiar el probe a un deployment productivo ni usar la Spreadsheet operativa. No abrir el acceso a cualquiera para facilitar la prueba.

## 9. Criterio de decisión posterior

- Si cada Web App devuelve un contenedor activo y supera lectura/escritura con los permisos requeridos, comparar el coste de mantener proyectos independientes vinculados frente a consolidar módulos.
- Si el contexto activo devuelve null, la opción de proyecto vinculado no cumple el requisito en Web App. No reemplazar openById() ni improvisar un ID bootstrap. Evaluar consolidación u otra arquitectura y registrar la limitación antes de decidir.
- No declarar paridad de acceso hasta probar varios proyectos, permisos, concurrencia y lectura/escritura en Beta.

## 10. Resultado y estado

**MIG-006: COMPLETADA CON VALIDACIÓN DIFERIDA.**

La parte local quedó implementada y probada: probe reproducible, guardas de escritura, harness de simulación y documentación de decisión. La prueba de contexto real Web App, los proyectos independientes, permisos, cuotas, concurrencia y mediciones quedan pendientes de Beta porque requieren proyectos Apps Script y Spreadsheet desechables autorizados. No se afirma que el acceso activo ya funcione en despliegue.

No se modificaron servicios funcionales, IDs actuales, propiedades instaladas, endpoints, deployments, hojas ni datos.


## 11. Cierre del mecanismo legacy Coordinator/SharedMutation (MIG-024/MIG-025)

La inspección posterior a MIG-024 y MIG-025 confirma que las dependencias operativas de SharedMutation y Coordinator fueron retiradas del código activo. Ya no se requiere ni se debe configurar `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET`, `GPSpedia_COORDINATOR_SECRET_<SERVICIO>` ni `GPSpedia_CATALOG_TRAFFIC_SECRET`. No crear, reponer ni copiar esos valores.

Las menciones a esas propiedades en las secciones históricas de este spike y en listas Beta antiguas se conservan únicamente como registro de la arquitectura anterior. No describen la configuración actual. La coordinación funcional corresponde al frontend; cada servicio valida localmente sesión/RBAC. La comunicación directa entre servicios solo se permite cuando sea técnicamente necesaria y debe resolver cualquier endpoint desde la configuración central, sin secretos compartidos.

El único localizador estático de arranque admitido es `CENTRAL_CONFIGURATION_BOOTSTRAP_URL` en el frontend, limitado a `getPublicConfiguration` de AUTH según MIG-009. No es un secreto ni un endpoint para acciones ordinarias.

La única limitación de configuración local detectada en servicios Apps Script sigue siendo el ID de la Spreadsheet en AUTH, CATALOG y UTILITIES. Su retirada depende de la prueba Web App real de MIG-006; no sustituir `openById()` hasta demostrar el acceso activo en Beta.