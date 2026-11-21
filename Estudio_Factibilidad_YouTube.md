# ESTUDIO TÉCNICO DE FACTIBILIDAD Y PLAN DE IMPLEMENTACIÓN: INTEGRACIÓN DE SUBIDA DIRECTA DE VÍDEOS A YOUTUBE DESDE GPSPEDIA

**Fecha de elaboración:** 1 de Noviembre de 2026
**Fuentes oficiales consultadas:**
- Google Apps Script Documentation (Quotas for Google Services & Limits) — Consultado: Noviembre 2026.
- YouTube Data API v3 Documentation (Videos: insert & Resumable Uploads protocol) — Consultado: Noviembre 2026.
- Google Cloud Platform Quotas & IAM OAuth 2.0 Policies — Consultado: Noviembre 2026.

---

## 1. Diagnóstico de la Arquitectura Actual de GPSpedia

GPSpedia opera actualmente mediante un App Shell estático (HTML5, Vanilla ES Modules, CSS3 responsive, Service Worker PWA, IndexedDB) conectado a microservicios desacoplados alojados en **Google Apps Script** (`Admin`, `Catalog`, `Feedback`, `Users`, `Write`).
- **Base de Datos:** Google Sheets (`Cortes`, `Tutorial`, `pys`, `Users`, `Feedbacks`).
- **Almacenamiento Multimedia:** Google Drive (`DriveApp`), organizado por carpetas jerárquicas para imágenes PNG, SVG y WEBP.
- **Manejo de Vídeos Actual:** Inserción de cadenas URL de YouTube introducidas manualmente por los usuarios en campos específicos de la Spreadsheet (`videoGuiaDesarmeUrl` en `Cortes`, columna `Video` en `Tutorial`, columna `Video` en `pys`).
- **Autenticación:** Tokens de sesión centralizados validados contra la hoja `Users`.

---

## 2. Investigación Técnica: YouTube Data API v3 y Google Apps Script

### 2.1. Método `videos.insert` y Flujo Resumable (Subidas Reanudables)
- La API oficial de YouTube (`YouTube Data API v3`) exige el método `videos.insert` (HTTP POST al endpoint `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`).
- Una subida de vídeo mediante el protocolo **Resumable Upload** consta de dos etapas:
  1. **Inicialización:** Envío de metadatos (título, descripción, tags, categoría, visibilidad `status.privacyStatus`). YouTube retorna una cabecera HTTP `Location` con la URI única de la sesión de subida (`upload_url`).
  2. **Transferencia de Chunks binarios:** Envío del contenido del archivo en bloques mediante peticiones HTTP `PUT` con cabeceras `Content-Range: bytes START-END/TOTAL`.

### 2.2. Viabilidad de Google Apps Script como Intermediario (Proxy)
- **Limitación crítica de Apps Script (`UrlFetchApp`):**
  * Tamaño máximo de payload por petición en `UrlFetchApp`: **50 MB**.
  * Tiempo máximo de ejecución continua por solicitud web: **6 minutos (360 segundos)**.
  * Si Apps Script intentara actuar como proxy binario recibiendo el archivo completo desde el navegador para transferirlo a YouTube, cualquier vídeo que exceda 50 MB o cuya subida combinada supere 6 minutos fallará de forma irrecuperable por timeout o desbordamiento de memoria.
- **Conclusión técnica:** Apps Script **NO DEBE** actuar como intermediario del flujo binario del vídeo. Debe actuar como **orquestador de autorización y metadatos**, permitiendo que la transferencia binaria ocurra directamente desde el navegador del usuario hacia el endpoint de la sesión reanudable proporcionada por YouTube.

---

## 3. Análisis Exhaustivo de Costos y Cuotas Gratuitas

### 3.1. Cuotas de Google Apps Script (Capa Gratuita)
- Peticiones diarias de `UrlFetchApp`: 20,000 llamadas/día (Cuentas @gmail.com estándar) y 100,000 llamadas/día (Google Workspace).
- Tiempo de ejecución de llamadas web (`doPost`): 6 minutos por ejecución (suficiente para iniciar la sesión de subida y registrar el enlace en Google Sheets en menos de 3 segundos).

### 3.2. Cuotas de YouTube Data API v3 (Capa Gratuita)
- Cuota base predeterminada gratuita por proyecto en Google Cloud Console: **10,000 unidades de cuota por día**.
- Costo de llamada por método:
  * `videos.insert`: **1,600 unidades de cuota** por vídeo subido.
  * Consultas de estado (`videos.list`): **1 unidad de cuota**.
- **Capacidad diaria calculada:**
  $$\frac{10,000\text{ unidades}}{1,600\text{ unidades/vídeo}} \approx 6.25 \implies \mathbf{6\text{ vídeos diarios completados sin costo}}$$
- **Ampliación de cuota gratuita:** Google permite solicitar ampliación de cuota mediante el formulario oficial de auditoría de cuota de YouTube API sin costo monetario, siempre que la aplicación demuestre cumplimiento de los Términos de Servicio de YouTube y justifique la necesidad técnica de su volumen.

### 3.3. Criterio Económico Obligatorio
- **Conclusión:** La solución es **100% técnicamente viable sin generar costos monetarios recurrentes** ni contratar servidores externos, siempre que:
  1. Se emplee la arquitectura directa con sesiones reanudables (navegador -> YouTube).
  2. Se gestione la cuota diaria gratuita de 10,000 unidades (límite de 6 subidas simultáneas diarias en fase inicial).
  3. Si la demanda supera 6 vídeos diarios, se tramite la ampliación formal de cuota gratuita en Google Cloud Console.

---

## 4. Comparación de Alternativas Arquitectónicas

| Criterio | Alt. 1: Apps Script como Proxy Completo | Alt. 2: Subida Directa Resumable (Recomendada) | Alt. 3: Subida temporal a Drive y posterior a YouTube | Alt. 4: Servidor Cloud Externo (Node/Go) |
| :--- | :--- | :--- | :--- | :--- |
| **Viabilidad Técnica** | Nula para vídeos >50 MB | **Excelente (hasta 256 GB)** | Deficiente (Duplica tiempos y cuota) | Alta |
| **Costo Monetario** | $0 | **$0 (100% Gratis)** | $0 | Costo mensual recurrente ($5-$25/mes) |
| **Progreso Real de Carga** | Imposible de monitorear | **Exacto (vía `xhr.upload.onprogress`)** | Retardado | Exacto |
| **Resiliencia / Reanudación** | No recuperable | **Soporte nativo HTTP 308 Resume** | Compleja | Alta |
| **Seguridad de Tokens** | Alta | **Alta (Sesión única efímera)** | Media | Media |

### Alternativa Recomendada:
**Alternativa 2 (Subida Directa Resumable con Orquestación por Apps Script):**
1. El usuario selecciona el archivo y completa título y descripción en GPSpedia.
2. GPSpedia solicita a Apps Script la inicialización de la sesión de subida.
3. Apps Script (usando OAuth de la cuenta administradora) ejecuta `videos.insert` con metadatos y devuelve exclusivamente la `upload_url` de la sesión.
4. El navegador transfiere los bytes directamente a YouTube con progreso visual en tiempo real.
5. Al finalizar, el cliente reporta el `videoId` generado a Apps Script, que escribe la URL en la hoja correspondiente de Google Sheets.

---

## 5. Diseño de Interfaz, Estados y Resiliencia ante Interrupciones

### 5.1. Pantalla de Carga y Progreso
- Cartel ineludible: **«Por favor, no abandone este diálogo mientras carga el vídeo»**.
- Barra de progreso porcentual vinculada a `event.loaded / event.total` del `XMLHttpRequest`.
- Indicador discriminado: Diferenciar entre *Transferencia de archivo a YouTube (0-100%)* y *Procesamiento y verificación en servidores de Google*.

### 5.2. Convenciones de Títulos
- Para Vehículos: `"Video Guía: [Marca] - [Modelo] [Versión] - [Año]"` (ej. `"Video Guía: Toyota - Hilux SRV - 2027"`).
- Para Tutoriales: Título definido por el colaborador.
- Para Problemas/Soluciones: `"Solución: [Título del problema] - GPSpedia"`.

### 5.3. Recuperación ante Fallos (Resiliencia)
- Al iniciar la subida, se genera un identificador local de operación `opVideoId` y se guardan metadatos y `upload_url` en `IndexedDB`.
- Si se pierde la conexión o se suspende el navegador, al reabrir la app se consulta el estado de la sesión enviando un `PUT` vacío con cabecera `Content-Range: bytes */TOTAL`. YouTube responde con HTTP `308 Resume Incomplete` indicando el último byte recibido, permitiendo reanudar la subida sin reiniciar desde cero.

---

## 6. Plan Técnico de Implementación por Fases (Futura Ejecución)

- **Fase 1: Configuración en Google Cloud Console:**
  * Habilitación de YouTube Data API v3 en el proyecto existente de Apps Script.
  * Creación de credenciales OAuth 2.0 y configuración de scopes (`youtube.upload`, `youtube.readonly`).
- **Fase 2: Backend Apps Script:**
  * Implementación de `handleInitYouTubeUpload(payload)` en `JS/Services/feedback.js` o servicio dedicado para inicializar sesiones resumables.
  * Implementación de `handleSaveYouTubeUrl(payload)` para actualizar celdas en `Cortes`, `Tutorial` o `pys`.
- **Fase 3: Frontend GPSpedia:**
  * Componente modal interactivo con selección de archivo, validación de formato (MP4, MOV, WebM), estimación de tiempo y barra de progreso real.
  * Gestor de reanudación y persistencia local en `JS/Frontend/offline.js`.
- **Fase 4: Pruebas Funcionales y Despliegue:**
  * Pruebas con archivos pequeños (5 MB) y grandes (150 MB), cortes de red controlados y validación de URLs públicas en YouTube.

---
*Fin del Estudio Técnico de Factibilidad.*
