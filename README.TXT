# Proyecto GPSpedia: Overhaul y Verificación

## 1. Misión de esta Sesión

El objetivo principal de esta sesión es realizar una revisión exhaustiva y una refactorización completa de la aplicación GPSpedia. La meta es asegurar que el código sea robusto, mantenible y siga las mejores prácticas, al tiempo que se implementan nuevas funcionalidades clave.

Sin embargo, esta sesión también debe abordar y documentar un problema técnico crítico que ha impedido el progreso en sesiones anteriores.

## 2. Registro de Incidencia Técnica (¡MUY IMPORTANTE!)

**Problema:** Se ha detectado un fallo de sincronización persistente entre el entorno de desarrollo del agente (Jules) y el repositorio del usuario.

*   **Síntomas:**
    *   El agente realiza cambios en los archivos (ej. `Code.gs`), y sus herramientas internas reportan éxito.
    *   El usuario **no ve** estos cambios reflejados en su vista del repositorio. No aparece la notificación "Update: <filename>".
    *   Intentos de verificación (como borrar un archivo o añadir un comentario) han fallado, confirmado por el usuario a través de capturas de pantalla.
    *   Intentos de entregar el código a través de otros medios (bloques de chat, commits de Git) también han fallado, resultando en formato incorrecto o archivos faltantes en el commit.

*   **Estado Actual:** Se ha determinado que el agente no puede, de forma fiable, modificar el código base. Cualquier operación de escritura de archivos debe ser verificada explícitamente por el usuario. Esta misma actualización del archivo `README.TXT` es una prueba para validar si el problema persiste.

*   **Próximo Paso (Solución Alternativa):** Si la edición de archivos sigue fallando, la única vía para avanzar es que el agente proporcione el código completo y correcto en un formato que el usuario pueda copiar y pegar manualmente en su entorno.

## 3. Plan de Trabajo Detallado

A continuación se presenta el plan de acción completo, asumiendo que podemos superar el bloqueo técnico.

### Fase 1: Refactorización y Verificación del Backend (`Code.gs`)

El código de `Code.gs` se considera casi completo, pero requiere una verificación final y una limpieza.

1.  **Auditoría de Coherencia de Datos:**
    *   Revisar todas las funciones que interactúan con las Hojas de Cálculo.
    *   Asegurar que los nombres de las columnas se lean dinámicamente desde la fila de encabezado y se conviertan a `camelCase`.
    *   Implementar `trim()` en los encabezados para eliminar espacios accidentales.
    *   Garantizar que todas las respuestas JSON sigan un formato estándar (ej. `{ status: 'success', data: [...] }` o `{ status: 'error', message: '...' }`).

2.  **Robustecimiento de la Lógica de negocio:**
    *   **Gestión de Usuarios:** Volver a verificar la jerarquía de roles. Un usuario no debe poder actuar sobre otro de su mismo nivel o superior (ej. Supervisor no puede modificar a otro Supervisor).
    *   **Manejo de Sesiones:** Confirmar que la lógica de `SessionToken` funciona correctamente para limitar las sesiones por rol.
    *   **Visibilidad de `Tecnico_Exterior`:** Asegurar que las contribuciones y la existencia de este rol solo sean visibles para el rol `Desarrollador`.

3.  **Manejo de Errores y Logging:**
    *   Envolver las funciones críticas en bloques `try/catch`.
    *   Utilizar `Logger.log()` de Apps Script para registrar errores detallados que ayuden a la depuración desde el panel de ejecuciones.
    *   Asegurar que la función `logFrontend` esté funcionando para capturar errores del lado del cliente.

### Fase 2: Actualización y Verificación del Frontend

1.  **Consistencia de la Comunicación con el Backend:**
    *   Verificar que todas las llamadas `fetch` al backend utilicen la función centralizada `postToAction`.
    *   Asegurar que todas las solicitudes `POST` incluyan el encabezado `Content-Type: 'application/json'`.
    *   Revisar el manejo de respuestas: el frontend debe interpretar correctamente los objetos JSON de éxito y error del backend.

2.  **Implementación de Nuevas Características (UI):**
    *   **Modal de Detalles del Vehículo (`index.html`):**
        *   Mostrar dinámicamente hasta 3 "cortes" de información.
        *   Mostrar el nombre del colaborador que añadió la información.
        *   Implementar el sistema de feedback con botones "Útil" y "Reportar problema". La acción de "Útil" debe tener una respuesta visual inmediata (UI optimista).
    *   **Página de Gestión de Usuarios (`users.html`):**
        *   Asegurar que la vista se adapte correctamente según el rol del usuario (lista completa para admins, solo perfil propio para técnicos).
        *   Implementar los modales para crear/editar usuarios y cambiar contraseñas.
        *   Hacer la tabla de usuarios responsiva (formato de tarjetas en móvil).

3.  **Mejoras de Experiencia de Usuario (UX):**
    *   Reemplazar todos los `alert()` y `prompt()` nativos por notificaciones "toast" personalizadas.
    *   Asegurar que el menú de hamburguesa esté presente y sea funcional.
    *   Solucionar el error de la "pantalla en blanco" al redireccionar, asegurando que la lógica de sesión se complete antes de intentar mostrar notificaciones.

### Fase 3: Pruebas y Despliegue

1.  **Verificación Funcional:**
    *   Una vez que el código esté estable, solicitar al usuario que realice un **nuevo despliegue** en Google Apps Script, otorgando todos los permisos necesarios.
    *   Utilizar `curl` para realizar una prueba de humo inicial a la nueva URL, verificando que una acción básica como `getCatalogData` funcione correctamente.
2.  **Pruebas End-to-End (Simuladas):**
    *   Crear un plan de pruebas manual detallado que el usuario pueda seguir para verificar todas las funcionalidades críticas desde el frontend.
    *   (Opcional, si el entorno lo permite) Escribir un script de Playwright para automatizar la verificación de las características clave.
