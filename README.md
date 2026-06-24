# GPSpedia v2.4 - Plataforma Técnica Vehicular

## 1. Descripción General
GPSpedia es una Aplicación Web Progresiva (PWA) de alto rendimiento diseñada específicamente para técnicos e instaladores de sistemas de seguridad y rastreo vehicular. La plataforma centraliza, estandariza y facilita el acceso a información crítica sobre puntos de corte (combustible, ignición, señal), diagramas de conexión y guías de desarme para una amplia variedad de marcas y modelos de vehículos.

El objetivo principal es optimizar los tiempos de instalación en campo, reducir errores operativos mediante información visual clara y proporcionar una base de conocimientos técnica robusta y portátil que funcione incluso sin conexión a internet.

## 2. Estructura del Repositorio
El repositorio actual contiene el **App Shell** y la lógica del cliente (Frontend) de la plataforma, organizada bajo una arquitectura modular de JavaScript moderno.

### Archivos Principales y Vistas
- **index.html:** Puerta de entrada principal. Contiene el contenedor maestro, el sistema de modales dinámicos y la estructura base del catálogo, tutoriales y sección de relay.
- **add_cortes.html:** Interfaz administrativa para el registro de nuevos vehículos y cortes. Implementa un flujo guiado en 3 etapas con sistema anti-duplicados.
- **users.html:** Panel de gestión de usuarios y perfiles. Permite la edición de datos personales y, según el rol, la administración de la jerarquía de técnicos.

### Módulos de Lógica (JavaScript ES6)
- **main.js:** Orquestador principal. Gestiona la inicialización de la app, listeners globales, validación de sesión y el sistema de navegación por historial de navegación del navegador (History API).
- **ui.js:** Módulo de renderizado. Centraliza toda la manipulación del DOM, creación dinámica de tarjetas, gestión de carruseles y renderizado de detalles técnicos.
- **auth.js:** Gestiona la autenticación del lado del cliente, persistencia de tokens de sesión y comunicación inicial con los servicios de acceso.
- **navigation.js:** Controla la lógica de filtrado del catálogo, gestión de la barra de búsqueda y transiciones entre niveles de navegación (Marca -> Modelo -> Versión).
- **state.js:** Implementa un patrón centralizado de gestión de estado con sistema de suscripción (Pub/Sub) para sincronizar la UI con los datos.
- **offline.js:** Núcleo de persistencia local. Gestiona la base de datos IndexedDB para el almacenamiento del catálogo, historial de usuario e imágenes optimizadas (thumbnails).
- **lightbox.js:** Módulo especializado para la visualización y zoom de imágenes técnicas de alta resolución.
- **api-config.js:** Archivo de configuración que rutea las peticiones del frontend hacia los microservicios operativos.

### Recursos y PWA
- **style.css:** Hoja de estilos principal con soporte nativo para Modo Oscuro y diseño adaptativo (Responsive).
- **service-worker.js / manifest.json:** Archivos de configuración para el funcionamiento como PWA, permitiendo la instalación en dispositivos y el cacheo de recursos críticos.
- **services/users/users.js:** Lógica de apoyo para la gestión de usuarios y validación de roles en la vista administrativa.

## 3. Arquitectura del Sistema
La plataforma utiliza una arquitectura desacoplada:
- **Frontend:** HTML5, CSS3 y JavaScript Modular. Implementa una estrategia "Cache-First" con rehidratación silenciosa desde IndexedDB.
- **Backend (Microservicios):** Lógica operativa desplegada de forma independiente (fuera de este repositorio).
- **Persistencia de Datos:** Google Sheets como motor de base de datos técnica y Google Drive para el almacenamiento de activos visuales.
- **Seguridad:** Implementa un sistema de Control de Acceso Basado en Roles (RBAC) con niveles de Desarrollador, Jefe, Supervisor y Técnico.

## 4. Documentación Funcional Detallada

### Exploración del Catálogo
La plataforma ofrece una navegación jerárquica e intuitiva:
- **Navegación Visual:** El usuario puede explorar por categorías populares o mediante un carrusel de logotipos de marcas.
- **Flujo de Navegación:** El sistema guía al usuario a través de niveles lógicos: Categoría -> Marca -> Modelos -> Versiones/Equipamiento -> Rango de Años.
- **Carga Optimizada:** Las tarjetas del catálogo utilizan carga diferida (Lazy Load) y miniaturas optimizadas para minimizar el consumo de datos móviles.

### Buscador Inteligente
La barra de búsqueda principal permite encontrar vehículos rápidamente:
- **Detección Dinámica:** Identifica marcas, modelos y años en tiempo real.
- **Historial de Búsqueda:** Muestra las últimas consultas del usuario vinculadas al foco del buscador.
- **Resultados Claros:** Presenta tarjetas diferenciando variantes (ej. Sedán vs. SUV) si el nombre del modelo es coincidente.

### Secciones Persistentes y Actividad
- **Vistos Recientemente:** Carrusel dinámico en la página de inicio que permite regresar rápidamente a los últimos vehículos consultados.
- **Historial de Búsqueda:** Tags de acceso rápido para repetir búsquedas comunes.
- **Secciones Técnicas:** Acceso directo a Tutoriales de desarme y Configuraciones de Relay desde el menú principal.

### Vista de Detalle de Corte
El modal de detalle es el núcleo de información técnica de la plataforma:
- **Encabezado:** Identificación clara con logo de la marca, modelo, versión y rango de años.
- **Corte Recomendado:** Destaca el punto de corte más fiable según la validación de la comunidad (votos de utilidad).
- **Información Granular:** Detalla el tipo de corte, ubicación exacta, color del cable y configuración de relay necesaria.
- **Interactividad:** Imágenes ampliables mediante Lightbox, integración de vídeos de YouTube para guías de desarme y sistema de feedback (Likes y Reportes).

### Registro de Datos (Add Cortes)
Interfaz especializada para el crecimiento de la base de datos:
- **Validación Anti-duplicado:** Antes de crear un registro, el sistema verifica existencias para evitar redundancia.
- **Registro Multimedia:** Permite asociar imágenes de referencia para cada punto de corte y para el vehículo.
- **Asistente de Relay:** Vinculación directa con la biblioteca de configuraciones de relay predefinidas.

### Experiencia de Interfaz (UI/UX)
- **Modo Oscuro:** Tema visual optimizado para reducir la fatiga visual en entornos de trabajo, persistente mediante las preferencias del usuario.
- **Zero-Zoom Layout:** Diseño bloqueado para evitar zooms accidentales en móviles, con excepción habilitada únicamente en el Lightbox de imágenes técnicas.
- **Gestión de Sesión:** Acceso seguro mediante login con validación de roles y persistencia de sesión offline.

## 5. Seguridad y Exclusión de Microservicios
Por motivos de seguridad operativa y saneamiento del código antes de producción, los archivos correspondientes a los microservicios del backend (**write.js, auth.js, catalog.js, feedback.js**) han sido retirados de este repositorio público.

La lógica de estos componentes se encuentra resguardada de forma privada bajo la administración del proyecto. El repositorio actual contiene la totalidad de la interfaz de usuario y la lógica de integración necesaria para que la plataforma opere contra los endpoints autorizados definidos en la configuración.

---
*GPSpedia v2.4 - 2026 todos los derechos reservados.*
