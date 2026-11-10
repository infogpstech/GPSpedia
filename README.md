# GPSpedia v2.2.5 - Plataforma Técnica Vehicular

## 1. Descripción General
GPSpedia es una Aplicación Web Progresiva (PWA) de alto rendimiento diseñada específicamente para técnicos e instaladores de sistemas de seguridad y rastreo vehicular. La plataforma centraliza, estandariza y facilita el acceso a información crítica sobre puntos de corte (bomba de combustible, ignición, señal a botón de encendido), diagramas de conexión y guías de desarme de paneles plásticos para una amplia variedad de marcas y modelos de vehículos.

El objetivo principal es optimizar los tiempos de instalación en campo, reducir errores operativos mediante información visual clara y proporcionar una base de conocimientos técnica robusta y portátil que funcione incluso sin conexión a internet.

---

## 2. Estructura del Repositorio
El repositorio actual contiene el **App Shell** y la lógica del cliente (Frontend) de la plataforma, organizada bajo una arquitectura modular de JavaScript moderno.

### Archivos Principales y Vistas
- **index.html:** Puerta de entrada principal. Contiene el contenedor maestro, el sistema de modales dinámicos y la estructura base del catálogo, tutoriales y sección de relay.
- **add_cortes.html:** Interfaz para el registro colaborativo de nuevos vehículos y cortes, con asistente de registro guiado de instalación.
- **users.html:** Panel de gestión de usuarios y perfiles, que permite la personalización de datos personales y visualización de la red de técnicos.

### Módulos de Lógica (JavaScript ES6)
- **main.js:** Orquestador principal. Gestiona la inicialización de la app, listeners globales, validación de sesión y el sistema de navegación por historial de navegación del navegador (History API).
- **ui.js:** Módulo de renderizado. Centraliza toda la manipulación del DOM, creación dinámica de tarjetas, gestión de carruseles y renderizado de detalles técnicos.
- **auth.js:** Gestiona la autenticación del lado del cliente, persistencia de tokens de sesión y comunicación inicial con los servicios de acceso.
- **navigation.js:** Controla la lógica de filtrado del catálogo, gestión de la barra de búsqueda y transiciones entre niveles de navegación (Marca -> Modelo -> Versión).
- **state.js:** Implementa un patrón centralizado de gestión de estado con sistema de suscripción (Pub/Sub) para sincronizar la UI con los datos.
- **offline.js:** Núcleo de persistencia local. Gestiona la base de datos IndexedDB para el almacenamiento del catálogo, historial de usuario e imágenes optimizadas (thumbnails).
- **lightbox.js:** Módulo especializado para la visualización y zoom de imágenes técnicas de alta resolución.
- **api-config.js:** Archivo de configuración que rutea las peticiones del frontend hacia los microservicios operativos.

---

## 3. Arquitectura del Sistema
La plataforma utiliza una arquitectura desacoplada:
- **Frontend:** HTML5, CSS3 y JavaScript Modular. Implementa una estrategia "Cache-First" con rehidratación silenciosa desde IndexedDB.
- **Backend (Microservicios):** Lógica operativa desplegada de forma independiente (fuera de este repositorio).
- **Persistencia de Datos:** Google Sheets como motor de base de datos técnica y Google Drive para el almacenamiento de activos visuales.
- **Seguridad:** Implementa un sistema de Control de Acceso Basado en Roles (RBAC) con niveles de privilegios.

---

## 4. Características y Mejoras Recientes (v2.1.5)

### Mejoras Generales de Navegación y Gestos
- **Navegación Fluida por Niveles:** El sistema guía al usuario a través de niveles lógicos: Categoría -> Marca -> Modelos -> Versiones/Equipamiento -> Rango de Años. El botón "< Volver" restaura dinámicamente el estado anterior sin perder el contexto de la navegación.
- **Navegación mediante Gestos:** Interceptación robusta del gesto de retroceso físico o deslizamiento táctil en dispositivos móviles. El sistema prioriza el cierre secuencial de overlays visibles (como modales principales, sub-modales, el visor de imágenes Lightbox o el menú lateral) antes de realizar transiciones de retroceso en el catálogo, previniendo el cierre accidental de la aplicación.
- **Navegación Interactiva en Modales:** El logotipo del fabricante y la categoría del vehículo mostrados en el modal de detalle son ahora clickables. Al pulsarlos, cierran el modal y redirigen al técnico de forma instantánea al catálogo filtrado por ese fabricante o tipo de vehículo respectivamente.
- **Navegación entre Generaciones:** Flechas interactivas `<` y `>` añadidas directamente en la sección de años del modal de detalle. Permiten alternar de forma inmediata entre generaciones consecutivas del mismo modelo que compartan las mismas características técnicas, optimizando drásticamente la comparación de cableados.

### Experiencia de Búsqueda Inteligente
- **Búsqueda Avanzada en Tiempo Real:** El buscador analiza y asocia simultáneamente términos de fabricante, modelo, versión y año de manera predictiva.
- **Historial Optimizado de Búsqueda:** Sincronizado con un flujo nativo "Forward-Stack". Al desplegar el buscador se habilita una pila de historial de 3 niveles en el navegador. Esto permite que el primer retroceso oculte el teclado y contraiga la barra de búsqueda manteniendo los resultados en pantalla, el segundo retroceso restaure el catálogo y el tercero limpie la barra de búsqueda por completo.
- **Deep Linking por Hash:** Soporte completo para búsquedas directas mediante la URL (ej. `#search=término`), permitiendo guardar enlaces de búsqueda o restaurar resultados automáticamente tras una recarga del navegador.

### Rendimiento, Caché y Sincronización Silenciosa
- **Estrategia "Stale-While-Revalidate":** GPSpedia realiza una carga instantánea de los datos técnicos desde la base de datos local (IndexedDB) en el arranque. De forma inmediata y no-bloqueante, realiza una reconciliación en segundo plano contra el servidor para descargar los datos más recientes.
- **Sincronización Silenciosa de Datos:** Las modificaciones, adiciones o eliminaciones de fichas técnicas se actualizan e inyectan reactivamente en caliente en el DOM. Esto se realiza de manera 100% silenciosa en segundo plano, sin interferir con el scroll actual del usuario, el foco del buscador, ni cerrar los modales activos.
- **Sistema de Carga Silenciosa de Imágenes:** Las imágenes se pre-cargan en segundo plano de manera fluida antes de ser mostradas. Las tarjetas del catálogo implementan una carga diferida (lazy loading) e inteligente, recuperando imágenes optimizadas de tamaño adecuado para reducir el consumo de datos móviles (ahorro de ancho de banda).

### Robustecimiento de PWA y Compatibilidad Móvil
- **Soporte Offline Completo:** Capacidad total de navegación y consulta de fichas técnicas completas en IndexedDB (`GPSpedia_DB`) en zonas con mala o nula cobertura.
- **Diseño Adaptativo Táctil (Zero-Zoom Layout):** Interfaz móvil bloqueada contra zooms táctiles accidentales en el cuerpo del catálogo, aislando la capacidad de ampliación táctil (pinch-to-zoom) exclusivamente para los diagramas técnicos y diagramas de relay dentro del visor Lightbox de alta resolución.
- **Indicador de Estado de Conexión:** Pequeño indicador LED de red minimalista ubicado al lado del saludo de bienvenida, informando al técnico de forma síncrona sobre su estado de conexión (online/offline).

### Sistema de Notificaciones Colaborativas
- **Banner de Validación de Años:** Elegante banner integrado en el modal de detalle debajo del modelo del vehículo. Aparece de forma no intrusiva una vez que se carga la imagen del modelo, solicitando validación de la comunidad técnica sobre el rango de años de la generación actual si el vehículo pertenece al modelo más reciente.
- **Flujo Dinámico de Respuestas:** El técnico puede indicar de manera fluida si la información es correcta o sugerir cambios de rango. Si se reporta que la información no es útil, el sistema muestra una notificación interactiva con un enlace rápido para registrar un nuevo corte.

### Seguridad y Compartición de Información
- **Botón Compartir Integrado:** Botón interactivo en el modal de detalle que hace uso de la API nativa de compartición del sistema operativo (Web Share API) para enviar la ficha técnica por aplicaciones de mensajería, o copiar un enlace directo optimizado al portapapeles.
- **Protección de Datos Técnicos:** Bloqueo nativo del menú contextual, desactivación de comandos del sistema que puedan alterar el App Shell y restricciones de selección de texto en áreas no deseadas para prevenir manipulaciones y resguardar el conocimiento técnico de la plataforma.

### Accesibilidad y Mejoras Visuales Recientes
- **Modo Oscuro Integrado y Persistente:** Intercambio fluido de paletas de colores basado en las preferencias locales. Los logotipos de marcas cuentan con un efecto de sombra sutil (drop-shadow) adaptativa en modo oscuro para un contraste y legibilidad óptimos.
- **Pie de Página (Footer) Dinámico:** Rediseño del footer con posicionamiento fijo. Su visualización está controlada dinámicamente mediante sensores de pantalla (`IntersectionObserver`), apareciendo con una animación suave únicamente cuando el técnico alcanza el final de su scroll en el catálogo para evitar distracciones.
- **Tipografías y Contrastes Mejorados:** Estandarización de componentes visuales con bordes compactos y fuentes legibles adaptadas para el trabajo rudo y dinámico en talleres de instalación.

---

## 5. Novedades de la Renovación Integral (v2.2.0)

### Registro, Almacenamiento y Búsqueda por VIN (Número de Chasis)
- **Identificación por VIN:** El esquema objetivo reserva la columna 43 liberada en `Cortes` para el campo físico `VIN` (encabezado exacto en mayúsculas), después de trasladar `idOperacion1`, `idOperacion2` e `idOperacion3` a una hoja dedicada de idempotencia. Las columnas 44 y 45 permanecen disponibles para futuras implementaciones. La función de servicio `renameVinColumnHeader` establece el encabezado `VIN` después de verificar la migración.
- **Migración de idempotencia:** La acción administrativa `migrateCortesOperationIds` realiza una simulación por defecto y solo escribe/limpia las columnas heredadas cuando recibe `confirm: true`. Si `Idempotencia` tiene un esquema incompatible, se conserva sin cambios y se utiliza `Idempotencia_Cortes`; si ambas hojas tienen esquemas incompatibles, la acción se detiene sin modificarlas. La función `renameVinColumnHeader` deja el encabezado de la columna 43 exactamente como `VIN`; también detecta opId escalares heredados aunque esa columna ya esté rotulada VIN y se detiene ante datos mezclados. Los campos de testigo tienen posición fija AT:AV (46–48), aunque existan columnas adicionales después de AV; no se agregan dinámicamente al final. Si las columnas objetivo están ocupadas o los encabezados aparecen duplicados/fuera de posición, WRITE y ADMIN detienen la escritura sin desplazar datos.
- **Procesamiento de Seguridad:** El sistema solicita el VIN completo de hasta 18 caracteres, pero descarta automáticamente los últimos 5 caracteres para almacenar únicamente el prefijo procesado, resguardando la privacidad de las unidades individuales.
- **Colecciones de VINs por Equipamiento:** Una sola columna física `VIN` almacena en una misma celda una colección JSON con todos los VIN procesados correspondientes a las versiones de equipamiento registradas en esa fila. La propiedad de datos de los consumidores sigue siendo `vin`. La cantidad máxima de VIN corresponde al número de versiones detectadas en `versionesAplicables`; no se crean columnas `vin2`/`vin3` ni columnas automáticas por versión. La adición de un VIN no modifica la fecha de registro (`timestamp`).
- **Validación de Duplicados:** Detección de duplicados en tiempo real tanto en el formulario `add_cortes.html` como en el modal de detalle. Muestra el mensaje *"VIN ya está registrado para:"* acompañado de un enlace/botón interactivo para navegar directamente al modelo existente.
- **Búsqueda Global por VIN:** La barra de búsqueda detecta consultas de VIN de entre 6 y 18 caracteres, extrae el prefijo procesado y filtra el catálogo por coincidencia exacta.

### Herramientas Avanzadas para el Rol de Desarrollador
- **Panel Administrativo Adaptativo (`#dev-tools-modal`):** Estilización completa con variables CSS adaptables a modo claro y modo oscuro, manteniendo la terminal de consola (`#dev-console-log`) aislada con su estilo característico de fondo oscuro `#121212` y texto verde `#00ff66`.
- **Terminal Interactiva y Gestión de Google Drive:** Comandos de terminal integrados en la consola (`dir`, `cd`, `cd ..`, `cd \`, `mkdir`, `tree`, `move`) navegables mediante teclado (flechas Arriba/Abajo) para explorar y administrar carpetas y archivos en Google Drive directamente sin salir de la plataforma.
- **Gestión de Estructuras de Spreadsheet:** Comandos administrativos para crear nuevas hojas en la base de datos con fórmulas autogeneradas de ID (`=ROW()-1`) y agregar columnas dinámicas.
- **Diagnóstico y Monitoreo de Salud de Microservicios:** Botón de escaneo e indicador en tiempo real de latencia (ms) y estado de conectividad para todos los microservicios de la arquitectura.
- **Saneamiento y Purgado:** Opciones para vaciar la caché local de IndexedDB/localStorage del cliente y purgar registros de actividad en la base de datos (con opción de conservar los últimos 7 días o limpiar todos).

### Mejoras de Experiencia de Usuario (UX) e Inbox
- **Exportación e Impresión de Fichas Técnicas:** Botón con icono de impresora (`exportVehiclePrintSheet`) en el modal de detalle para generar e imprimir fichas técnicas limpias optimizadas para formato físico/PDF para técnicos instaladores en campo.
- **Filtros rápidos de catálogo:** Funcionalidad cancelada; no forma parte de la versión vigente de GPSpedia y no debe considerarse disponible.
- **Navegación Jerárquica Progresiva de Búsqueda:** Búsqueda agrupada por Modelo único -> Versiones de Equipamiento -> Rangos de Años -> Modal de Detalle (auto-abriendo si sólo existe 1 modelo, 1 versión y 1 rango de año).
- **Gestión Completa del Inbox:** Opción de eliminación permanente de mensajes y reportes (`deleteFeedbackItem`) en el panel del Inbox.

---

## 5. Seguridad y Exclusión de Microservicios

Durante la fase de implementación y corrección, las ramas de trabajo pueden contener temporalmente fuentes de los servicios backend dentro de `Services/`. Estos archivos forman parte del entorno de desarrollo y revisión; su presencia no significa que sus deployments o endpoints hayan sido creados, modificados o publicados desde este repositorio.

Al finalizar las implementaciones y correcciones, las fuentes temporales de `Services/` deberán eliminarse del repositorio como parte del saneamiento previo al cierre y a la entrega. La versión final del repositorio no debe conservar esos archivos de implementación.

Los deployments y endpoints operativos son recursos independientes: se administran y verifican en sus respectivas plataformas y su estado no se deduce de la presencia o ausencia de archivos fuente en GitHub. La configuración de integración del frontend debe apuntar únicamente a los endpoints autorizados.

---
## 6. Novedades y Actualizaciones (v2.2.5)

### Sistema de Subida Directa de Vídeos a YouTube y Flujo de Aprobación
- **Subida Reanudable (Resumable Upload Directo):** Basado en el estudio técnico de factibilidad (`Estudio_Factibilidad_YouTube.md`), la transferencia de vídeo se realiza directamente desde el navegador a la sesión reanudable de YouTube Data API v3 (`videos.insert`), evitando timeouts y el límite de 50 MB de Google Apps Script.
- **Configuración Permanente de Publicación:** Visibilidad estricta como *No listado* (`unlisted`), audiencia definida como *No contenido para niños*, sin etiquetas avanzadas arbitrarias ni remixes.
- **Generación Contextual Inteligente:** Propuesta automática de título y descripción basada en marca, modelo, versión de equipamiento y años del vehículo, o bien en el tema/problema para tutoriales y PyS.
- **Flujo de Aprobación Interna en Inbox:** Cada vídeo cargado entra en estado pendiente y se somete a revisión en el Inbox del equipo supervisor (`Desarrollador`, `Gefe`, `Supervisor`), asociándose al vehículo o tutorial únicamente tras su aprobación.

### Módulo Extendido de Problemas y Soluciones (PyS)
- **Vinculación Bidireccional de Vehículos:** Capacidad de asociar modelos de vehículos a problemas específicos desde el buscador de PyS y desde el menú contextual (+) del modal de detalle del vehículo.
- **Buscador de Vehículos Unificado:** Formato adaptado `[Imagen] | [Versión o Encendido] | [Rango Años]` con exclusión reactiva de vehículos ya asociados o en selección.
- **Prevención de Ciclos Infinitos de Navegación:** Parámetro contextual `originModal` que suprime carruseles recursivos entre vehículos y problemas sin alterar las relaciones en la base de datos.
- **Reproductor de Vídeo Embebido:** Reproducción fluida y responsiva de guías de YouTube mediante `<iframe>` en el modal de detalle del problema y tutoriales.
- **Estandarización de Imagen:** La imagen del problema adopta exactamente las mismas proporciones y estilos que la imagen del modelo de vehículo (`.img-vehiculo-modal`).

### Optimización de Ficha Técnica para Impresión y Límites de Contenido
- **Densidad Visual Adaptativa en Ficha de Impresión:** Ajuste inteligente de densidad (`.card-expanded` y `.card-compact`) para garantizar que la ficha técnica vehicular encaje perfectamente en una sola página Carta vertical con márgenes de 10mm.
- **Ampliación Sincronizada a 700 Caracteres:** Límites de caracteres extendidos y validados tanto en el frontend como en los microservicios backend para los campos de solución y prevención.
- **Coordinación de Acordeones:** Exclusión mutua entre el acordeón de posibles problemas y las secciones de cortes/apertura/alimentación en el modal de detalle.

---
*GPSpedia v2.2.5 - 2026 todos los derechos reservados.*


### Cargas generales de imágenes y reconciliación

WRITE y ADMIN registran cada intento en ImageUploadLedger antes de crear el archivo Drive. Se verifica por lectura posterior la fila del ledger y los metadatos de Drive; al reutilizar archivos se recalcula SHA-256 y se valida operación, carpeta, MIME y tamaño. El límite es 10 MB por imagen. La acción ADMIN reconcilePendingImageUploads trabaja en dry-run por defecto; confirm:true aplica estados, sin eliminar archivos. Si la persistencia de ImageUploadLedger no está disponible, la carga se detiene antes de crear archivos.
