# Contrato de salud de microservicios

## Alcance y confianza

El diagnóstico comprueba que un endpoint responde con un objeto JSON cuya identidad coincide con el servicio esperado y cuyo estado está reconocido. **No demuestra que las dependencias internas de Google Sheets, Drive, CacheService u otros servicios estén disponibles.** Ningún estado de endpoint debe interpretarse como prueba de salud integral de esas dependencias.

El endpoint de diagnóstico es una superficie pública de solo lectura. Su respuesta debe limitarse a identidad estable, versión y estado. No debe incluir IDs de recursos, nombres de hojas, claves de caché, estructura interna, mensajes de excepción, stack traces, tokens ni secretos. El frontend no sustituye esta redacción del lado servidor.

## Contratos versionados

| Clave | Identidad JSON | Versión del código fuente | Estado esperado |
|---|---|---:|---|
| AUTH | `GPSpedia-Auth` | 2.2.5 | `available` |
| CATALOG | `GPSpedia-Catalog` | 2.4.0 | `available` |
| WRITE | `GPSpedia-Write` | 2.3.1 | `available` |
| FEEDBACK | `GPSpedia-Feedback` | 1.2.2 | `available` |
| UTILITIES | `GPSpedia-Utilities` | 1.5.0 | `available` |
| ADMIN | `GPSpedia-Admin` | 2.7.2 | `available` |

La versión se informa cuando está disponible; no reemplaza la validación de identidad. Los deployments externos no se consideran verificados solo porque exista código fuente con el contrato esperado.

## Servicios retirados

**COORDINATOR fue retirado por MIG-025.** No debe existir una fila activa, endpoint configurado, acción pública ni solicitud de red para ese servicio. La fila histórica del registro central se ignora mientras se completa su limpieza operativa en Beta.


**USERS dejó de ser un microservicio independiente por MIG-012.** `getUsers`, `createUser` y `updateProfile` forman parte de AUTH y no existe una clave de salud ni una ruta frontend hacia un endpoint USERS. El lector de configuración central ignora temporalmente la fila histórica USERS, por lo que no participa en el enrutamiento activo. El deployment y su fila heredados se deshabilitarán/retirarán después de validar AUTH y ausencia de consumidores externos en Beta; no se modificaron desde este commit.


**LEGACY está retirado y no forma parte del inventario de servicios ni del contrato de salud.** No existe endpoint configurado, acción pública ni solicitud de red asociada. La mención se conserva únicamente como constancia de retirada; no debe mostrarse como un microservicio pendiente de conexión.

## Umbrales y estados del cliente

- Timeout individual: **8,000 ms**. Cada servicio se consulta de forma independiente y concurrente.
- Latencia lenta: **2,000 ms o más**; una respuesta válida pasa a `slow` en lugar de `online`.
- Vigencia de último resultado válido: **5 minutos**. Un fallo posterior a ese umbral puede mostrarse como `stale`, conservando el último estado válido y la hora de su respuesta.
- Timeout del ping POST ADMIN: **5,000 ms**. El escaneo GET comienza independientemente del ping.

| Estado | Significado |
|---|---|
| `online` | HTTP correcto, JSON válido, identidad coincidente y estado backend `available`/`online`, bajo el umbral lento. |
| `slow` | Contrato válido, pero latencia igual o superior a 2,000 ms. |
| `unavailable` | Fallo de red/timeout, HTTP 5xx o estado backend `offline`/`unavailable`. |
| `error` | HTTP 4xx, error de lectura o estado backend `error`/`failed`/`degraded`. |
| `unknown` | Cuerpo vacío/no JSON/no objeto, identidad/estado/versión inválidos o contrato ausente/no verificable. |
| `stale` | No hay respuesta válida reciente y existe una respuesta válida anterior cuya antigüedad supera cinco minutos; se presenta como dato histórico, no como disponibilidad actual. |

Un HTTP 2xx por sí solo nunca establece `online`. Un estado backend no reconocido queda `unknown`. Los fallos individuales no cancelan las demás comprobaciones.

## Dependencias Sheets/Drive y deployments

No se añadieron probes de Sheets/Drive: las fuentes disponibles no proporcionan un endpoint de solo lectura que compruebe esas dependencias de forma segura, uniforme y sin efectos secundarios. El panel separa expresamente la respuesta del endpoint de la salud de dependencias internas.

La revisión local cubre los seis servicios activos: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. COORDINATOR fue retirado en MIG-025 y ya no forma parte del registro central ni del contrato de salud; no se debe consultar ni desplegar como servicio activo. LEGACY está excluido del inventario y no genera solicitudes. La identidad, versión, MIME, redacción y comportamiento efectivo de los deployments actuales no pueden certificarse desde este repositorio; deben verificarse en Beta aislada. No se modificaron deployments ni datos productivos.

## Prueba local

`node --experimental-default-type=module JS/Tests/ServiceHealthContract.mjs`

## Revisión de versiones fuente — 2026-11-19

Las versiones de FEEDBACK (1.2.2) y ADMIN (2.7.2) se cotejaron con los objetos JSON de salud de `JS/Services/feedback.js` y `JS/Services/admin.js`, respectivamente. Las versiones documentadas describen la rama fuente; no certifican que los deployments externos estén actualizados.
