# GPSpedia v2.1.5 - Plataforma Técnica Vehicular

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

## 5. Seguridad y Exclusión de Microservicios
Por motivos de seguridad operativa y saneamiento del código antes de producción, los archivos correspondientes a los microservicios del backend (**write.js, auth.js, catalog.js, feedback.js**) han sido retirados de este repositorio público.

La lógica de estos componentes se encuentra resguardada de forma privada bajo la administración del proyecto. El repositorio actual contiene la totalidad de la interfaz de usuario y la lógica de integración necesaria para que la plataforma opere contra los endpoints autorizados definidos en la configuración.

---
*GPSpedia v2.1.5 - 2026 todos los derechos reservados.*
