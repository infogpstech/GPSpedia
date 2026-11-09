# AUTH y USERS — entorno aislado de pruebas

Este directorio contiene copias de los servicios AUTH y USERS destinadas exclusivamente a pruebas de ADMIN 0 sobre una Spreadsheet independiente.

**Spreadsheet de pruebas:** `1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k`

Los archivos originales `Services/Auth.js` y `Services/users.js` no se modifican y conservan su configuración actual. Tampoco se modifican los endpoints operativos de `api-config.js`.

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

- AUTH: consulta `Users`; actualiza `Users.Password` al migrar una contraseña legacy y `Users.SessionToken`; es la única autoridad que agrega/elimina registros de `ActiveSessions` para login, logout y resetUserSessions; escribe registros en `Logs`; utiliza CacheService para el contador de intentos.
- USERS: consulta `ActiveSessions` para validar sesiones y modifica `Users` para las acciones que correspondan. El cierre remoto de sesiones se enruta a AUTH; USERS no debe escribir en `ActiveSessions`.

Antes de probar, confirmar que la copia contiene las hojas `Users`, `ActiveSessions` y `Logs`, con los encabezados y columnas esperados por los servicios. Utilizar una cuenta de prueba dedicada y no realizar las pruebas contra las URLs operativas.

## Pruebas de resetUserSessions

La acción `resetUserSessions` debe invocarse exclusivamente contra el deployment AUTH aislado; el deployment USERS ya no expone un handler de escritura para ActiveSessions. Ejecutar pruebas concurrentes de login, logout y reset sobre la misma Spreadsheet de prueba. Verificar sesiones objetivo ubicadas al inicio, medio y final; sesiones de otros usuarios preservadas; token solicitante/objetivo duplicado; reintentos; fallo parcial de deleteRow y respuesta cleanupPending. No usar las URLs operativas.

## Límites

- `api-config.js` continúa apuntando a los endpoints actuales; la plataforma live no se enruta a estos servicios de prueba.
- `Services/admin.js` no tiene una copia de prueba en este directorio y no forma parte de esta validación AUTH/USERS.
- No se ha creado ni desplegado ningún proyecto Apps Script desde este repositorio.
- La creación de estos archivos no demuestra que los deployments estén activos ni que apunten a la copia. La validación funcional comienza únicamente después de crear y comprobar ambos deployments.
