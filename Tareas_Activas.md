# GPSpedia — Tareas activas
Fecha de actualización: 2026-11-18
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
Normativa: NORMAS_DESAROLLO.md

## Completadas en esta continuidad
- [x] BETA-ADMIN-CUT-IMAGE-AUDIT-CONSOLE-01 — consola de Cortes como salida principal; confirmación conservada en terminal global del Desarrollador; resultados y resumen verificados.
- [x] BETA-ADMIN-CUT-IMAGE-ORGANIZER-AUDIT-01 — auditoría estática de normalización, movimiento, rutas, nomenclatura, referencias y alta de logos.
- [x] Mitigación de alta de logos — handleAddLogo usa findOrCreateSubFolder y no activa la fusión heredada de carpetas.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD d81894f53e6036a1b3d0e0e86b317ad913ec42ee.

## Pendientes — prioridad inmediata

### P0 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-DRY-RUN-01
Implementar un preview estrictamente de solo lectura:
- Recorrer las ocho columnas de imagen de cada fila válida de Cortes y las referencias de LogosMarca.
- Comparar ID, nombre, extensión y ruta actual del archivo con el destino calculado.
- Usar referencias activas de todas las hojas, excluyendo Imagenes_Reemplazadas para determinar uso vigente.
- Mostrar por archivo: hoja/fila/campo, ID, nombre actual, ruta actual, nombre/ruta propuestos, clasificación y motivo.
- Detectar IDs compartidos, referencias no interpretables, filas duplicadas, destinos ambiguos, carpetas duplicadas y conflictos de nombre.
- No crear carpetas, mover, renombrar, copiar, restaurar de papelera, eliminar, sobrescribir ni escribir en Spreadsheet.
- No inventar valores: bloquear si faltan categoría, marca, modelo, versión/encendido o años.
- Para logos, resolver una sola categoría desde Cortes; si una marca aparece en varias categorías o no aparece, marcarla como ambigua y no elegir arbitrariamente.
- Para imgCorte1/2/3, mapear tipoCorte1/2/3 a ign, bomba o btn usando el valor real. Si no se reconoce, bloquear la propuesta.
- Preservar exactamente la extensión original.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-STRUCTURE-01
Aplicar la estructura objetivo después de validar el dry-run:
- Vehículos: Cortes/<categoría>/<marca>/<modelo>/<versión-o-encendido>/<año-inicio-año-fin>/
- Logo: <marca>_logo.<extensión> en el primer nivel de la carpeta de marca.
- Nombres: <modelo>_<versión-o-encendido>_<año-inicio>_<año-fin>_<función>.<extensión>.
- Códigos: ign1/ign2 para señales de ignición múltiples; bomba1 para corte de bomba; btn para botón; apert para apertura; alim, alim2 y shock para alimentación/señal al ahogador; imagenVehiculo para imagen principal.
- Resolver colisiones sin sobrescribir y sin enviar archivos o carpetas a papelera.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-REGISTRATION-CONSISTENCY-01
- Unificar handleAddLogo y altas de imágenes de Cortes con el mismo constructor de destino.
- La alta de logo debe guardar en el primer nivel de la carpeta de marca, no en Cortes/Logos.
- Mantener bloqueada la operación si la categoría de una marca no es única.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-SAFE-APPLY-01
- Separar preview y aplicación.
- Requerir confirmación explícita desde la terminal del Desarrollador.
- Aplicar por lotes idempotentes; verificar cada movimiento/renombrado y actualización de URL; registrar manifiesto y permitir rollback.
- No eliminar ni restaurar archivos automáticamente.

### P2 — DOC-ROTATION-01
- Rotar Tareas_Pendientes.md y lista_beta_parte2.txt, ambos por encima de 180,000 caracteres Unicode.
- Dividir solo en límites de registro, conservar contenido exacto, verificar reconstrucción y actualizar los manifiestos/índices.
- No añadir más contenido a esos dos archivos hasta completar la rotación.

## Evidencia y límites
- La auditoría de código no equivale a validar los datos reales de Drive/Spreadsheet.
- No se han movido, renombrado, copiado, restaurado ni eliminado archivos productivos.
- No se han desplegado Apps Script. La validación de la nueva organización requerirá ejecutar primero el dry-run tras su despliegue y revisar sus resultados.
- Siguiente paso exacto: construir y probar el endpoint de preview de solo lectura, reutilizando collectActiveDriveReferences y el inventario recursivo existente, sin invocar normalizeImages ni organizePrimaryVehicleImages.
