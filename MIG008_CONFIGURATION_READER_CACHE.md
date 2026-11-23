# MIG-008 — Lector central y caché de configuración

**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA  
**Rama:** GPSpedia2.2.5_work  
**Fecha:** 2026-11-23  
**Dependencia externa pendiente:** MIG-006 — prueba de contexto activo desde Web App real.

## 1. Alcance y restricciones

Se implementó el lector y las capas de caché sin sustituir el acceso actual a datos de los servicios. La lectura central usa exclusivamente `SpreadsheetApp.getActiveSpreadsheet()`; si devuelve null o la revisión no supera las validaciones, el lector falla cerrado.

No se añadió ningún ID de Spreadsheet, URL de otro servicio, API key, contraseña, token manual, secreto compartido, `PropertiesService`, `openById()` ni llamada HTTP servicio-a-servicio al lector. El módulo no coordina operaciones de negocio ni confía en identidad/rol enviados por el navegador.

La coordinación funcional multi-servicio continúa en frontend. AUTH solo entrega la proyección pública solicitada por el frontend; cada servicio conserva su autorización y RBAC para sus acciones.

## 2. Componentes

- `JS/Services/CentralConfigurationReader.js`: lectura, validación de snapshot, caché de servidor y proyecciones públicas/backend.
- `JS/Services/Auth.js`: acción pública `getPublicConfiguration`; devuelve solo el registro de servicios y parámetros públicos. No devuelve IDs de recursos ni parámetros backend/admin.
- `JS/Frontend/centralConfigurationCache.js`: caché en memoria cache-first, single-flight, validación, invalidación y recuperación limitada.
- `JS/Frontend/api-config.js`: acción `getPublicConfiguration` dirigida a AUTH mediante el mapa actual; exporta `loadCentralConfiguration`, `refreshCentralConfiguration` e `invalidateCentralConfigurationCache`.
- `JS/Tests/MIG008CentralConfigurationReader.mjs` y `MIG008FrontendConfigurationCache.mjs`: pruebas locales integradas al runner.

La URL de AUTH continúa en el único mapa frontend existente como punto de entrada de transición. No se duplicó como constante adicional ni se colocó en Apps Script. MIG-009 debe sustituir el mapa de endpoints por la proyección central una vez resuelto el bootstrap; esta tarea no inventa un segundo bootstrap.

## 3. Integridad del snapshot

El lector:
1. obtiene la Spreadsheet activa, sin fallback;
2. lee una única fila `CONFIGURATION_ACTIVE` en estado `READY`;
3. exige schema_version compatible y active_revision válida;
4. lee únicamente filas con `config_revision` igual a la revisión activa;
5. valida exactamente los siete service_key conocidos, endpoints únicos y URL HTTPS de Apps Script, enabled booleano y contract_version;
6. valida claves de parámetros contra el catálogo admitido por código, tipos, scope, visibility, JSON y enum; aplica defaults versionados solo a parámetros opcionales aprobados y rechaza los obligatorios ausentes;
7. valida recursos backend por tipo, propietario, alcance e ID;
8. vuelve a leer ConfiguracionControl y descarta la lectura si cambió la revisión durante el proceso.

Se corrigió el esquema MIG-007 para añadir `config_revision` a Servicios, ConfiguracionParametros y ConfiguracionRecursos. Sin esa columna, no era posible garantizar la lectura de una revisión íntegra sin mezclar filas de publicaciones distintas. ConfiguracionEsquema sigue versionada por schema_version.

## 4. Separación de proyecciones

**Pública:** entrega únicamente los siete endpoints, enabled, contract_version, min_client_version y parámetros marcados public. No incluye ConfiguracionRecursos ni valores backend/admin.

**Backend por servicio:** devuelve únicamente parámetros backend y recursos de scope global o del servicio solicitante. No devuelve el registro Servicios, endpoint_url ni URLs de otros servicios. El serviceKey se valida contra el conjunto cerrado de siete servicios; esta función no autentica una petición ni sustituye la autorización propia del servicio consumidor.

No se implementó una proyección admin para el navegador. Los valores admin no se incluyen en ninguna respuesta pública.

## 5. Caché y fallos

- Caché servidor por proyección: 5 minutos de vigencia; se conserva hasta 15 minutos para recuperación si CacheService no la desalojó.
- Frontend: memoria, TTL fresco de 5 minutos, single-flight para solicitudes simultáneas e invalidación/refresh explícitos.
- Si falla la fuente, una copia pública de hasta 5 minutos puede conservar temporalmente endpoints; después de 5 minutos se retiran los endpoints y solo se permite la proyección de parámetros públicos hasta 15 minutos.
- Después de 15 minutos, una fuente indisponible produce error. No se enruta a un endpoint alternativo, local o aproximado.
- Una respuesta nueva reemplaza el snapshot completo solo después de validar toda la estructura; no se mezclan revisiones.
- La caché no extiende sesiones, no concede permisos y no contiene tokens OAuth.

## 6. Validaciones locales

Las pruebas automatizadas cubren:
- Spreadsheet activa ausente;
- proyección pública y backend, incluida la ausencia de URLs de otros servicios en backend;
- integridad de los siete endpoints, contratos, claves y valores;
- revisión modificada durante la lectura;
- caché fría/caliente, single-flight, expiración y stale-if-error;
- invalidación, actualización, rechazo de endpoints no permitidos y fail-closed;
- ausencia de PropertiesService, openById, IDs, URLs de servicios y credenciales en el lector.

No se simula que Google Apps Script realmente proporcione un contenedor activo en Web App. Las pruebas usan dobles locales para verificar la lógica.

## 7. Procedimiento de validación Beta

### 7.1 Sincronización obligatoria

Ejecutar antes de cualquier prueba Beta:

```sh
cd /ruta/a/GPSpedia || exit 1
test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || { echo "Repositorio incorrecto"; exit 1; }
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales sin guardar"; exit 1; }
git fetch origin
git pull --ff-only origin GPSpedia2.2.5_work
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
git status --short
git rev-parse HEAD
```

### 7.2 Prueba de acceso y lectura

1. Ejecutar primero el procedimiento aislado MIG-006 con Spreadsheet desechable. Registrar si getActiveSpreadsheet() devuelve objeto o null, sin registrar IDs.
2. No continuar con el lector si el contexto activo devuelve null. No añadir IDs, propiedades o URLs para sortearlo.
3. Crear en la Spreadsheet desechable las hojas del esquema y los encabezados exactos documentados en ESQUEMA_CONFIGURACION_CENTRAL.md, incluyendo config_revision en Servicios, ConfiguracionParametros y ConfiguracionRecursos.
4. Cargar únicamente datos sintéticos: revisión 1, los siete service_key, un parámetro rich_text_mode y un recurso ficticio de ADMIN. No copiar endpoints ni IDs productivos.
5. Incluir CentralConfigurationReader.js en el proyecto AUTH de prueba y desplegar con acceso restringido al grupo de prueba. La Spreadsheet debe permanecer privada.
6. Invocar getPublicConfiguration desde el frontend de prueba. Verificar que solo aparecen endpoints sintéticos y parámetros public; confirmar ausencia de IDs de Drive y valores backend/admin.
7. Ejecutar getCentralConfigurationForService_("ADMIN") únicamente en un contexto backend de prueba y comprobar que no devuelve Servicios ni endpoint_url.
8. Repetir con CacheService caliente, después de 5 minutos y después de 15 minutos; registrar latencia y respuesta, sin atribuir métricas no medidas.
9. Cambiar active_revision durante una lectura controlada y confirmar que el snapshot parcial se descarta.
10. Probar ausencia de hoja, encabezados duplicados, endpoint inválido y schema_version superior; todos deben fallar cerrados.
11. Registrar resultados anonimizados en Hallazgos_Beta.md. No probar con la Spreadsheet productiva ni actualizar deployments reales desde este procedimiento.

### 7.3 Evidencia requerida

Registrar SHA desplegado, identidad efectiva, modo de ejecución, resultado de contexto activo, revisión, proyección recibida, hit/miss de caché, latencia, resultado de consistencia y errores. No registrar URLs privadas, IDs reales, tokens ni datos personales.

## 8. Límites y continuidad

- No se crearon hojas, no se migraron valores, no se modificaron propiedades ni se desplegó ningún proyecto Apps Script.
- No se sustituyó `openById()` de los servicios actuales; la lectura real del contenedor activo sigue pendiente de MIG-006 Beta.
- El mapa de endpoints frontend vigente se mantiene hasta MIG-009; no se ha cambiado el router ordinario ni el comportamiento de las 120 acciones.
- El lector backend está preparado como módulo reutilizable; su integración en los consumidores se hará en las tareas de migración de configuración correspondientes, sin llamadas entre servicios.
- El frontend ya dispone del cargador y las operaciones de caché, pero el router no lo usa todavía: esa sustitución corresponde a MIG-009.

**Resultado:** MIG-008 COMPLETADA CON VALIDACIÓN DIFERIDA. La lógica local está implementada; el acceso real a Spreadsheet, CacheService, deployment y latencia debe verificarse en Beta mediante MIG-006.
