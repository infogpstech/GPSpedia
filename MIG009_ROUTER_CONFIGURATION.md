# MIG-009 — Router de acciones basado en configuración central

Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
Dependencia: MIG-008 — lector y caché central  
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA

## Diseño implementado

- ACTION_TO_SERVICE_MAP permanece en frontend como metadato acción → servicio; no contiene URLs.
- CENTRAL_SERVICE_KEYS enumera los siete servicios admitidos y valida el registro público.
- api-config.js consulta getPublicConfiguration en AUTH para obtener la proyección pública. El router POST resuelve cada endpoint con resolveCentralServiceEndpoint.
- Los health checks y el feed incremental GET de FEEDBACK utilizan el mismo resolver; no conservan URLs paralelas.
- Se retiró el mapa API_ENDPOINTS de siete URLs estáticas.
- La caché central conserva cache-first/single-flight y actualiza automáticamente la revisión después de vencer TTL. El endpoint se utiliza solo si el snapshot declara routingAvailable=true, el servicio está habilitado y la URL cumple el patrón Apps Script HTTPS.
- Si la configuración no está disponible, venció, es inválida o el servicio está deshabilitado, el router falla cerrado. No hay fallback a endpoints anteriores ni locales.

## Bootstrap

La primera consulta necesita una dirección de arranque para AUTH, porque el registro central no puede localizarse a sí mismo. Se conserva un único CENTRAL_CONFIGURATION_BOOTSTRAP_URL, limitado a la acción pública getPublicConfiguration. No se utiliza para acciones ordinarias ni para reemplazar un endpoint ausente. Es un localizador público de deployment, no una credencial ni un secreto. Las actualizaciones ordinarias de CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN provienen exclusivamente de la configuración central. Un cambio del deployment AUTH que sirve el registro requiere actualizar ese único localizador; no puede resolverse automáticamente desde el propio registro sin introducir un segundo bootstrap.

## Seguridad y límites

- No se añadió ningún secreto, token manual, API key ni propiedad Apps Script.
- No se modificó código backend ni se añadió comunicación entre servicios.
- La autorización de sesión/RBAC permanece en cada servicio receptor.
- No se exponen tokens OAuth.
- No se modifica deployment ni configuración real de Spreadsheet.
- La disponibilidad real de getActiveSpreadsheet()/CacheService y la actualización de endpoint desde navegador real se validan en Beta.
- El workflow de salud de deployments es manual y se ejecuta tras desplegar el handler de configuración central.

## Pruebas

- MIG009FrontendActionRouter.mjs: cobertura del mapa de 120 acciones, siete servicios, endpoint dinámico, actualización de revisión, servicio deshabilitado, URL inválida y fail-closed.
- ActionDispatchContract.js: valida servicios contra CENTRAL_SERVICE_KEYS y comprueba que el router no mantiene mapa ni fallback local.
- ServiceHealthContract.mjs: ejecuta comprobaciones con una proyección central simulada e inyectable.
- RemoteServiceHealth.mjs: obtiene endpoints del bootstrap central y realiza únicamente GET de diagnóstico.
- RunServiceTests.mjs: incluye la suite MIG-009.
- La aprobación final de CI y sintaxis corresponde al commit publicado.
