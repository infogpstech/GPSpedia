# Plan de reorganización estructural del repositorio GPSpedia

**Estado:** PENDIENTE — planificación registrada; no se han movido archivos ni modificado rutas.  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama autorizada:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5`  
**HEAD de trabajo al registrar el plan:** `9303d9b0e0d635fc60963efeb412b8064fc31142`  
**Fecha:** 2026-11-13

## 1. Objetivo

Ordenar la estructura del repositorio agrupando los archivos por tipo y función, actualizando todas las referencias afectadas y conservando el comportamiento actual de GPSpedia.

El alcance contempla:

- Centralizar los archivos JavaScript y módulos relacionados en una carpeta principal.
- Centralizar las imágenes y recursos gráficos en una carpeta.
- Mover los documentos HTML secundarios a una carpeta propia, manteniendo `index.html` en la raíz.
- Actualizar rutas, imports, referencias, precarga y configuración que dependan de las ubicaciones anteriores.
- Validar que la aplicación, sus páginas, pruebas y capacidades PWA continúen funcionando.

Este documento registra el plan; **no autoriza a considerar ejecutados los movimientos ni las validaciones**.

## 2. Estructura objetivo propuesta

La carpeta `JS/` será el contenedor común de los archivos JavaScript, incluidos los módulos `.mjs`, organizados por función para evitar colisiones y mezclas entre frontend, servicios y pruebas.

```text
GPSpedia/
├── index.html
├── HTML/
│   ├── add_cortes.html
│   └── users.html
├── JS/
│   ├── Frontend/
│   │   ├── módulos JavaScript del navegador
│   │   └── módulos auxiliares del cliente
│   ├── Services/
│   │   └── fuentes JavaScript de los servicios
│   └── Tests/
│       ├── suites de pruebas
│       └── RunServiceTests.mjs
├── Images/
│   └── imágenes e iconos activos
├── Services/
│   └── documentación y archivos auxiliares no JavaScript
├── Spreadsheet/
├── Legal/
├── Olds/
├── .github/
├── manifest.json
├── style.css
├── button-system.css
└── documentación y configuración del proyecto
```

La estructura es una propuesta de destino. Durante el inventario se determinará la ubicación exacta de cada archivo, sin mover documentación, datos, configuraciones o archivos históricos por el solo hecho de compartir una extensión.

### Excepciones técnicas que deben resolverse antes de mover archivos

1. **Service Worker:** actualmente `service-worker.js` está en la raíz. Su ubicación determina el alcance de control predeterminado del navegador. Moverlo a `JS/Frontend/` puede limitar el control a esa ruta y dejar fuera la aplicación. Antes de moverlo se debe comprobar si el hosting permite establecer `Service-Worker-Allowed: /` o una alternativa compatible. No se debe sacrificar el funcionamiento offline para cumplir la organización de carpetas. Si no existe una solución verificable, se documentará esta excepción técnica y se solicitará decisión antes de continuar con ese archivo.
2. **Servicios Apps Script:** se debe verificar cómo se copian, publican y consumen los archivos de `Services/`. La nueva ubicación en el repositorio no debe alterar nombres, contenido, orden de carga ni contratos de los proyectos desplegados.
3. **Pruebas:** los runners pueden leer fuentes mediante rutas relativas. Se actualizarán sus referencias y workflows sin modificar la lógica de las pruebas.

## 3. Fase 1 — Inventario y mapa de dependencias

Antes de mover archivos:

- Obtener el inventario completo de archivos `.js`, `.mjs`, HTML e imágenes, incluyendo subdirectorios.
- Distinguir código activo, pruebas, servicios, recursos históricos y archivos auxiliares.
- Detectar nombres duplicados y posibles conflictos de destino.
- Identificar referencias estáticas y dinámicas: `import`, `import()`, `export`, `src`, `href`, `fetch()`, `importScripts()`, rutas construidas en tiempo de ejecución y referencias dentro de CSS/HTML.
- Revisar `manifest.json`, `service-worker.js`, workflows de GitHub Actions, runners y documentación con comandos de ejecución.
- Registrar para cada archivo su ubicación actual, destino propuesto y consumidores conocidos.

**Entregable:** inventario y matriz de rutas origen → destino → referencias que deben actualizarse.

## 4. Fase 2 — Centralización de JavaScript

- Crear `JS/Frontend/`, `JS/Services/` y `JS/Tests/`.
- Reubicar los módulos frontend y sus dependencias dentro de `JS/Frontend/`.
- Reubicar los fuentes JavaScript de backend dentro de `JS/Services/`, una vez comprobadas las condiciones de carga y despliegue.
- Reubicar suites y runners dentro de `JS/Tests/`.
- Mantener los nombres de archivo siempre que sea posible.
- Resolver explícitamente las colisiones de nombres mediante subcarpetas funcionales, nunca sobrescribiendo archivos.
- Actualizar imports entre módulos y rutas utilizadas por pruebas y automatizaciones.

No se refactorizarán funciones ni se cambiará la lógica de negocio como parte de esta fase.

## 5. Fase 3 — Centralización de HTML

- Crear `HTML/`.
- Mover allí los HTML activos secundarios, inicialmente `add_cortes.html` y `users.html`.
- Mantener `index.html` en la raíz como punto de entrada principal.
- Actualizar rutas de hojas de estilo, scripts, imágenes, manifiesto, enlaces entre páginas y redirecciones.
- Revisar imports relativos de módulos dentro de cada página y las rutas que utilizan `window.location`.
- Verificar navegación directa a las páginas secundarias y retorno al catálogo.

Los HTML históricos o de pruebas dentro de archivos históricos no se moverán automáticamente.

## 6. Fase 4 — Centralización de imágenes

- Crear `Images/`.
- Mover los recursos gráficos activos identificados en el inventario.
- Actualizar referencias en HTML, CSS, JavaScript, manifiesto y cualquier configuración PWA.
- Revisar iconos de instalación, logos, imágenes de términos y recursos de interfaz.
- Confirmar que las rutas de imágenes generadas dinámicamente continúen siendo válidas.
- Mantener sin cambios los recursos históricos de `Olds/`, salvo que exista una dependencia activa demostrada.

## 7. Fase 5 — Actualización integral de rutas e infraestructura

Se revisarán, como mínimo, los siguientes puntos:

| Archivo o componente | Trabajo requerido |
|---|---|
| `index.html` | Imports, CSS, imágenes, iconos y enlaces |
| `HTML/add_cortes.html` | Imports, imágenes, CSS y navegación |
| `HTML/users.html` | Imports, CSS, redirecciones y navegación |
| `manifest.json` | Rutas de iconos y recursos PWA |
| `service-worker.js` | Precache, rutas de recursos, fallback y alcance |
| Archivos CSS | Referencias relativas a imágenes y otros recursos |
| Módulos JS | Imports y rutas de recursos locales |
| Pruebas y runners | Lectura de fuentes y dependencias por nuevas rutas |
| `.github/workflows/` | Comandos y ubicaciones de archivos |
| Documentación | Árbol del repositorio, rutas y comandos vigentes |

Se buscarán también referencias antiguas en cadenas, plantillas HTML, rutas calculadas y comandos de automatización. No se considerará suficiente reemplazar únicamente los imports visibles.

## 8. Fase 6 — Validación y regresión

La reorganización se validará después de completar los movimientos y actualizar las referencias:

1. Comprobar que cada archivo previsto exista en su destino y que no haya sobrescrituras ni pérdidas.
2. Buscar referencias a las rutas antiguas y resolver cada coincidencia; las menciones históricas o explicativas se clasificarán y documentarán.
3. Verificar la resolución de imports estáticos y dinámicos.
4. Ejecutar comprobaciones sintácticas sobre todos los JS/MJS modificados.
5. Ejecutar las suites automatizadas pertinentes y el runner actualizado.
6. Verificar que GitHub Actions utilice las nuevas rutas y finalice correctamente.
7. Validar manifiesto, precache, actualización de cachés, fallback offline y alcance del Service Worker.
8. Revisar navegación entre páginas, enlaces directos, recursos gráficos y carga de estilos.
9. Revisar el diff completo para asegurar que los cambios funcionales se limiten a las rutas y ajustes imprescindibles.
10. Confirmar que la rama base no haya sido modificada.

Las comprobaciones que requieran navegador real, instalación PWA, Apps Script desplegado, OAuth, Spreadsheet, Drive o servicios externos se identificarán como validaciones pendientes de Beta. No se ejecutarán pruebas contra producción.

## 9. Restricciones de alcance y preservación

- Trabajar exclusivamente en `GPSpedia2.2.5_work`.
- No modificar ni fusionar cambios en `GPSpedia2.2.5`.
- Mantener `index.html` en la raíz.
- Mantener los CSS y demás archivos no incluidos en el alcance en su ubicación actual, salvo dependencia demostrada y decisión documentada.
- No modificar lógica de negocio, contratos, permisos, endpoints, credenciales ni datos.
- No borrar archivos por parecer duplicados sin verificar sus referencias y consumidores.
- No reorganizar ni reescribir el contenido histórico de `Olds/`.
- Conservar `lista_beta.txt`, `lista_beta_parte1.txt` y `lista_beta_parte2.txt`.
- No recrear ni llenar `checkpoint.md` como parte de este documento; su contenido fue vaciado por instrucción previa.
- No crear respaldos dentro del repositorio.
- No afirmar validaciones, despliegues o resultados que no se hayan ejecutado.

## 10. Criterios de finalización

La reorganización podrá marcarse como **COMPLETADA** o **COMPLETADA CON VALIDACIÓN DIFERIDA** cuando:

- Los JS/MJS activos estén centralizados bajo `JS/`, con las excepciones técnicas justificadas y aprobadas.
- Las imágenes activas estén centralizadas bajo `Images/`.
- Los HTML activos secundarios estén bajo `HTML/`, con `index.html` en la raíz.
- Todas las rutas y referencias afectadas estén actualizadas.
- No existan referencias activas rotas a las ubicaciones anteriores.
- Las pruebas locales pertinentes se hayan ejecutado y aprobado.
- Las validaciones pendientes de Beta estén claramente identificadas.
- El diff y el commit estén revisados y verificados.
- La rama base permanezca intacta.

## 11. Secuencia de ejecución

1. Confirmar HEAD y rama de trabajo.
2. Elaborar inventario y mapa de dependencias.
3. Resolver los riesgos de Service Worker y carga de Apps Script.
4. Ejecutar la centralización de JavaScript.
5. Ejecutar la centralización de HTML.
6. Ejecutar la centralización de imágenes.
7. Actualizar rutas, manifiesto, service worker, pruebas y workflows.
8. Ejecutar validaciones locales y corregir regresiones.
9. Revisar diff, registrar cambios y publicar un commit lógico en la rama de trabajo.
10. Verificar commit, HEAD remoto y preservación de la rama base.

---

**Resultado esperado:** un repositorio ordenado por tipo y función, con rutas coherentes, sin referencias rotas y sin cambios involuntarios en el comportamiento de GPSpedia.
