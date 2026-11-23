# GPSpedia — Hallazgos de pruebas Beta

Fecha de apertura: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama: `GPSpedia2.2.5_work`
HEAD de referencia: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`

## Alcance
Registrar únicamente hallazgos observados en pruebas Beta reales. Durante esta etapa no corregir código: documentar evidencia, impacto, severidad, alcance y pasos de reproducción. No incluir secretos, tokens, IDs personales, datos productivos, mensajes, VIN, URLs privadas ni contenido de archivos.

## Estado inicial
- No hay hallazgos Beta registrados todavía.
- Esto no significa que no existan defectos: las pruebas remotas aún no se han ejecutado desde esta sesión.
- Las pruebas locales/CI anteriores no se contabilizan como pruebas Beta.
- Las mediciones sin instrumentación suficiente se registran como **NO MEDIDO**.

## Formato de hallazgo

### BETA-FXXX — Título breve
- **Fecha/hora:**
- **Servicio / módulo / flujo:**
- **Commit probado:**
- **Entorno:** deployment Beta y recursos aislados (solo etiquetas sintéticas; sin URLs/IDs privados).
- **Rol / dispositivo / navegador:**
- **Precondiciones:**
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado observado:**
- **Evidencia anonimizada:**
- **Frecuencia / muestras:**
- **Impacto:**
- **Severidad:** CRÍTICA / ALTA / MEDIA / BAJA / INFORMATIVA.
- **Estado:** NUEVO / CONFIRMADO / NO REPRODUCIBLE / PENDIENTE DE DATOS.
- **Tarea relacionada:**

## Registro
_Aún no hay hallazgos confirmados._


### BETA-F001 — Configuración incompleta de invalidación remota USERS
- **Fecha/hora:** 2026-11-22 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** AUTH → Coordinator → invalidación remota de caché de actor en USERS; flujo de inicio de sesión.
- **Commit probado:** `f3541aac4e08db8eca6c1d60b8242e475d9d7cd6` (HEAD de trabajo al registrar el hallazgo).
- **Entorno:** Beta declarado por el usuario; aislamiento de los recursos no verificado independientemente.
- **Rol / dispositivo / navegador:** NO MEDIDO.
- **Precondiciones:** El usuario informa que no puede iniciar sesión y recibe el mensaje “la configuración de invalidación remota de USERS está incompleta”.
- **Pasos para reproducir:** Intentar iniciar sesión en Beta. No se dispone de una sesión remota para reproducirlo independientemente.
- **Resultado esperado:** AUTH debe completar la invalidación remota requerida y permitir continuar con la creación/sincronización de sesión.
- **Resultado observado:** El usuario reporta que el login es rechazado con el mensaje indicado.
- **Evidencia anonimizada:** En `JS/Services/Coordinator.js`, `invalidateSessionActorCaches_` exige que `GPSpedia_SERVICE_URL_USERS` sea una URL Apps Script terminada en `/exec` y que `GPSpedia_COORDINATOR_SECRET_USERS` tenga al menos 32 caracteres. La función valida también WRITE, FEEDBACK y ADMIN antes de contactar cualquier destino. En `JS/Services/Auth.js`, la creación de sesión puede invocar invalidación remota al retirar sesiones expiradas o excedentes.
- **Frecuencia / muestras:** Un reporte del usuario; reproducción independiente NO MEDIDA.
- **Impacto:** Bloqueo del inicio de sesión cuando el flujo necesita revocar una sesión anterior/expirada y la configuración de Coordinator no supera la validación.
- **Severidad:** ALTA.
- **Estado:** NUEVO — causa probable localizada en la configuración de ScriptProperties de Coordinator; valores y coincidencia de secretos aún no verificados.
- **Tarea relacionada:** BETA-01 — AUTH / USERS y aislamiento; revisar las propiedades Beta de Coordinator para USERS, WRITE, FEEDBACK y ADMIN sin revelar sus valores.
