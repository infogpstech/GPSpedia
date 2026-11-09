# AUTH y USERS — entorno aislado de pruebas

Este directorio contiene copias de los servicios AUTH y USERS destinadas exclusivamente a pruebas de ADMIN 0 sobre una Spreadsheet independiente.

**Spreadsheet de pruebas:** `1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k`

Las copias de prueba reflejan las fuentes vigentes de `Services/Auth.js` y `Services/users.js`, pero conservan su propio `SPREADSHEET_ID`. `api-config.js` no se modifica para apuntar a deployments de prueba; sus endpoints operativos permanecen separados.

## Archivos

- `Auth.js`: copia de `Services/Auth.js`; únicamente cambia `SPREADSHEET_ID` en la línea 9.
- `users.js`: copia de `Services/users.js`; únicamente cambia `SPREADSHEET_ID` en la línea 9.

Cada archivo contiene su propio router `doGet/doPost` y sus constantes globales. **Deben instalarse en proyectos de Apps Script separados. No se deben pegar ambos archivos en un mismo proyecto.**

## Preparar los deployments de prueba

1. Crear un proyecto independiente de Apps Script para AUTH de pruebas.
2. Copiar el contenido completo de `Auth.js` en ese proyecto.
3. Crear otro proyecto independiente para USERS de pruebas.
4. Copiar el contenido completo de `users.js` en ese segundo proyecto.
5. Confirmar en cada proyecto que la constante `SPREADSHEET_ID` conserva el ID de la copia de pruebas.
6. Crear un deployment nuevo para cada proyecto, sin editar ni reemplazar deployments existentes.
7. Mantener las URLs resultantes separadas de la configuración live. No agregarlas a `api-config.js`.

Los deployments de prueba deben conservar la política de acceso que corresponda a los servicios existentes, pero utilizar proyectos y URLs nuevos. Este repositorio no contiene los IDs de proyecto ni las URLs de deployment de Apps Script; se generan desde Apps Script y deben verificarse allí.

## Operaciones que afectan la copia

- AUTH: consulta `Users`; actualiza `Users.Password` al migrar una contraseña legacy y `Users.SessionToken`; es la única autoridad que agrega/elimina registros de `ActiveSessions` para login, logout, resetUserSessions y deleteUser; escribe registros en `Logs`; utiliza CacheService para el contador de intentos.
- USERS: consulta `ActiveSessions` para validar sesiones y modifica `Users` para las acciones que correspondan. El cierre remoto de sesiones se enruta a AUTH; USERS no debe escribir en `ActiveSessions`.

Antes de probar, confirmar que la copia contiene las hojas `Users`, `ActiveSessions` y `Logs`, con los encabezados y columnas esperados por los servicios. Utilizar una cuenta de prueba dedicada y no realizar las pruebas contra las URLs operativas.

## Pruebas de resetUserSessions

La acción `resetUserSessions` debe invocarse exclusivamente contra el deployment AUTH aislado; el deployment USERS ya no expone un handler de escritura para ActiveSessions. Ejecutar pruebas concurrentes de login, logout, resetUserSessions y deleteUser sobre la misma Spreadsheet de prueba. Verificar sesiones objetivo ubicadas al inicio, medio y final; sesiones de otros usuarios preservadas; token solicitante/objetivo duplicado; reintentos; fallo parcial de deleteRow y respuesta cleanupPending. No usar las URLs operativas.

## Pruebas de deleteUser

La acción `deleteUser` debe invocarse exclusivamente contra AUTH aislado. Verificar conservación de fila/ID, congelación de valores históricos, rechazo de IDs vacíos/duplicados, marca `__deleted__:`, limpieza de credenciales, revocación de sesiones, rechazo de sesiones residuales, autodeleción, RBAC, reintentos y carrera login/delete. Confirmar que las cuentas nuevas reciben ID secuencial estático `USR-0001`, `USR-0002`, etc. y que el prefijo `__deleted__:` no se admite como nombre de usuario.

## Límites

- `api-config.js` continúa apuntando a los endpoints actuales; la plataforma live no se enruta a estos servicios de prueba.
- `Services/admin.js` no tiene una copia de prueba en este directorio y no forma parte de esta validación AUTH/USERS.
- No se ha creado ni desplegado ningún proyecto Apps Script desde este repositorio.
- La creación de estos archivos no demuestra que los deployments estén activos ni que apunten a la copia. La validación funcional comienza únicamente después de crear y comprobar ambos deployments.


## Eliminación segura de cuentas (AUG-005)

- La acción `deleteUser` se enruta exclusivamente a AUTH; AUTH utiliza el mismo `LockService.getScriptLock()` que login, logout y resetUserSessions.
- La eliminación es lógica: se sustituye `Nombre_Usuario` por `__deleted__:<UUID>` y se limpian contraseña, rol, datos de contacto, nombre completo y SessionToken. No se ejecuta `deleteRow()` en Users; el ID y la posición de la fila permanecen intactos.
- AUTH desactiva la cuenta antes de revocar sus sesiones. Si la eliminación de sesiones falla parcialmente, la cuenta permanece desactivada, AUTH rechaza las sesiones residuales y la operación puede reintentarse.
- Las cuentas nuevas reciben un ID ID secuencial estático `USR-0001`, `USR-0002`, etc.; no conservan la fórmula de ID heredada de la fila anterior.
- USERS filtra las cuentas desactivadas y rechaza sesiones asociadas a ellas. La interfaz oculta Eliminar para la cuenta autenticada y AUTH bloquea la autodeleción.


### Conservación de identificadores históricos
Antes de desactivar una cuenta, AUTH congela como valores estáticos los IDs calculados de todas las filas existentes. La operación se detiene si detecta una fila con datos sin ID o IDs duplicados. Así se conservan las referencias históricas aunque las fórmulas originales dependieran de otros campos. Las cuentas nuevas copian únicamente formato y validaciones de datos y reciben un ID secuencial estático `USR-0001`, `USR-0002`, etc..


## Identificadores permanentes de usuarios

- `Users.ID` utiliza identificadores secuenciales `USR-0001`, `USR-0002`, etc.
- USERS calcula el siguiente número leyendo los IDs de las filas que contienen datos, bajo el `ScriptLock` del servicio USERS.
- La columna ID de la nueva cuenta se escribe como valor fijo. Al crear la fila solo se copian formato y validaciones; no se copia la fórmula de la columna ID.
- Las filas desactivadas conservan su ID, por lo que los números no se reutilizan. Los IDs duplicados o las filas con datos sin ID bloquean la creación para evitar asignaciones ambiguas.
- La secuencia comienza en `USR-0001` cuando no existen cuentas registradas y admite más de cuatro dígitos sin truncar el número.

## Estado de las mutaciones de sesiones

- `Services/Auth.js` es el único escritor de `ActiveSessions` para login, logout, resetUserSessions y deleteUser.
- `Services/users.js` valida sesiones mediante lectura, pero no agrega, modifica ni elimina filas de `ActiveSessions`.
- El botón Cerrar sesiones de `users.html` invoca `resetUserSessions`, que `api-config.js` enruta a AUTH. AUTH valida el token del Desarrollador, verifica que ambas cuentas estén activas y sean únicas, y elimina las sesiones del usuario objetivo bajo el mismo `ScriptLock` que login/logout.
- No se ha desplegado ni invocado ningún endpoint operativo desde esta modificación. Las pruebas concurrentes de Apps Script deben ejecutarse únicamente después de configurar los deployments aislados.
