# GPSpedia v2.0 - Plataforma Técnica Vehicular

## 1. Descripción General
GPSpedia es una Aplicación Web Progresiva (PWA) de alto rendimiento diseñada específicamente para técnicos e instaladores de sistemas GPS. Su propósito principal es centralizar, estandarizar y facilitar el acceso a la información crítica sobre puntos de corte (combustible, ignición, señal) y desarme de una amplia variedad de vehículos, optimizando los tiempos de instalación y reduciendo errores operativos en campo.

## 2. Características Principales (v2.0)
- **Navegación Inteligente:** Flujo jerárquico guiado por Categoría -> Marca -> Modelo -> Versión -> Año.
- **Buscador Avanzado:** Barra de búsqueda con detección automática de marcas, modelos y años, integrada con iconos visuales de cada fabricante.
- **Catálogo Optimizado:** Visualización de tarjetas con carga diferida (Lazy Load) y resoluciones adaptativas para minimizar el consumo de datos en dispositivos móviles.
- **Detalle Técnico Exhaustivo:** Modales con información granular de múltiples cortes, diagramas de relay vinculados y guías de vídeo integradas (YouTube).
- **Gestión de Feedback (Inbox):** Sistema integrado para que los técnicos reporten problemas o sugieran mejoras, con una bandeja de entrada para la administración centralizada.
- **Dashboard de Actividad:** Registro en tiempo real de las acciones de los usuarios para auditoría y control de calidad.
- **Seguridad y Roles (RBAC):** Jerarquía de permisos (Jefe, Supervisor, Técnico) que restringe el acceso a la gestión de usuarios y funciones administrativas.

## 3. Flujo de Registro de Nuevos Cortes
El sistema implementa un proceso de tres etapas para garantizar la calidad y unicidad de los datos:

1.  **Etapa 1 - Verificación Anti-duplicado:**
    - El usuario ingresa Marca, Modelo, Año y Tipo de Encendido.
    - El sistema busca coincidencias exactas y parciales para evitar registros redundantes.
    - Si se encuentran similitudes, se presenta un asistente que permite al usuario decidir si desea agregar información a un registro existente o crear uno nuevo.
2.  **Etapa 2 - Información Técnica Base:**
    - Registro de imágenes del vehículo y del corte.
    - Definición de la ubicación exacta y el color del cable.
    - Selección de la configuración de relay necesaria desde la biblioteca técnica.
3.  **Etapa 3 - Información Suplementaria:**
    - Adición de detalles de apertura de puertas.
    - Ubicación de cables de alimentación constante.
    - Notas importantes sobre el desarme o advertencias específicas del modelo.

## 4. Arquitectura del Sistema
La plataforma ha migrado a una arquitectura desacoplada basada en:
- **Frontend:** HTML5, CSS3 (con soporte nativo para Modo Oscuro) y JavaScript Modular.
- **Backend:** Microservicios independientes en Google Apps Script (Auth, Catalog, Feedback, Users, Write, Image, Utilities).
- **Base de Datos:** Google Sheets granular (v2.0) con más de 35 columnas de datos técnicos.
- **Almacenamiento:** Google Drive gestionado a través de un Proxy Seguro de imágenes.

## 5. Comparativa GPSpedia 1.5 vs 2.0

| Característica | GPSpedia 1.5 (Olds) | GPSpedia 2.0 |
| :--- | :--- | :--- |
| **Estructura** | Monolítica, difícil de mantener. | Modular (Microservicios), escalable. |
| **Base de Datos** | Mapa de columnas dinámico y frágil. | Mapa fijo y estricto, alta integridad. |
| **Imágenes** | Carga directa de URLs de Drive, lenta. | Proxy seguro con Lazy Load y 3 tamaños optimizados. |
| **Búsqueda** | Básica por texto. | Avanzada con iconos y filtros jerárquicos. |
| **Feedback** | "Likes" generales por vehículo. | Likes y Reportes por corte. |
| **Administración** | Básica. | Inbox centralizado y Dashboard de actividad. |
| **Móviles** | Layout rígido. | UI Responsive adaptada con VisualViewport API. |

## 6. Changelog v2.0
- **Nueva UI/UX:** Rediseño completo de la interfaz con carruseles y transiciones fluidas.
- **Optimización de Rendimiento:** Implementación de constantes de tamaño de imagen (300px, 800px, 1600px) y carga diferida.
- **Seguridad:** Implementación de tokens de sesión y validación jerárquica de roles.
- **Correcciones Técnicas:** Estandarización de términos de corte (Bomba, Señal, Ignición) y reparación del sistema de FAQ.
- **Modularización:** Separación total de la lógica de negocio del renderizado de UI.

---
*GPSpedia v2.0 - 2026 todos los derechos reservados.*
