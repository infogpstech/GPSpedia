# GPSpedia — checkpoint de continuidad
Fecha: 2026-11-26
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)

## Rotación documental
El checkpoint previo completo se archivó, sin alteración, en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-26_parte_007.md`. Verificación Git: blob archivado `5be5e08597d2a354bcde6f5699cbf48387196804`, contenido recuperado igual al original. Las partes previas de archivo permanecen intactas.

## Estado de Git
- HEAD CI verificado: `2796cdee78ee95c151a9525a44133cdcf6d9a721`; commits documentales posteriores registran la evidencia y no alteran código.
- Base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificar.
- Commit posterior de mantenimiento de prueba: `dd85ed5705f9d29fc3a3a94d4074124cbc08e35a`, alinear contrato LocalApiEndpoints con endpoints actualizados.

## Beta — progreso verificado
- Regression actual run `45809570650`, SHA `2796cdee78ee95c151a9525a44133cdcf6d9a721`: 542 suites, 6,453 pruebas, 0 fallos; jobs `service-tests` y `responsive-browser` SUCCESS.
- Job `responsive-browser`: AUG-146 real-browser checks, login surface smoke GET-only y manifest/offline navigation validaciones completadas; screenshots sintéticas cargadas. El job terminó SUCCESS.
- Pages build/deploy run `45809571054`, SHA `2796cdee78ee95c151a9525a44133cdcf6d9a721`: build y deploy SUCCESS.
- El usuario confirmó deployment actualizado de AUTH y ADMIN y URLs nuevas en `JS/Frontend/api-config.js`.
- Run health `45808869604`, SHA `fb96cc841a60cd2852e4578c300332cf4557d26b`: health 6/6 PASS. AUTH v2.2.5 1463 ms; ADMIN v2.7.2 2698 ms (SLOW); CATALOG v2.4.0 993 ms; FEEDBACK v1.2.2 1892 ms; UTILITIES v1.5.0 1323 ms; WRITE v2.3.1 1617 ms.
- CATALOG feed, cursor boundaries, matrix y pagination read-only PASS.
- ADMIN latency 5 muestras: 2410,1756,1861,1036,1953 ms; mediana 1861 ms, 1/5 SLOW.
- UTILITIES 5 muestras: 907,610,915,629,943 ms; mediana 907 ms, 0/5 SLOW.
- La corrección de fixture quedó validada por regresión posterior: run `45809570650` SUCCESS (542 suites / 6,453 pruebas / 0 fallos) y responsive-browser SUCCESS.
- Se corrigió `JS/Tests/LocalApiEndpoints.mjs` para que sus valores esperados coincidan con los endpoints actuales. Commit `dd85ed5705f9d29fc3a3a94d4074124cbc08e35a`; CI nueva pendiente.

## Tareas Beta pendientes
Las pruebas funcionales mutables de AUTH/login real, WRITE, FEEDBACK/Inbox, ADMIN/Drive, imágenes y YouTube siguen diferidas hasta disponer de identidad sintética, recursos aislados y limpieza verificable. Android físico pendiente. F022 es deuda visual offline no bloqueante. BETA-F021 (protección de rama) pendiente administrativa.

## Siguiente acción
- Regression CI de run 45809263608 aprobada en SHA cbe5e8a6adecb1359475d711810677650fbe4fba: 542 suites, 6453 pruebas, 0 fallos.
- Responsive-browser, login surface smoke GET-only, manifest PWA y offline navigation PASS.
- Continuar validaciones Beta no mutables y preparar pendientes diferidos; no ejecutar operaciones mutables sin preflight de recursos sintéticos y cleanup.


## Validación CI/browser 2026-11-26 — run 45810553448
- SHA de ejecución: `adb69eeb2edb5cd28b370194eac49956298115a` (commit documental previo); jobs `service-tests` y `responsive-browser` SUCCESS.
- 542 suites, 6,453 tests, 0 fallos. AUG-146, login GET-only, PWA manifest/offline y browser checks PASS; screenshots sintéticas artifact 15113495824 (16 imágenes).
- PWA: core 49/49 y optional 4/4 HTTP 200, warm offline login visible, cero módulos precache faltantes, pageErrors 0, no GETs Apps Script ni non-GET, credenciales no enviadas y backend writes deshabilitadas.
- Cold scenario mantiene fallo residual de Font Awesome CDN sin impacto funcional; deprecaciones de Actions/runtime registradas.
- Mutaciones remotas de servicios siguen sin ejecutar por falta de entorno sintético aislado/cleanup comprobado.


## Rectificación de estado Git — 2026-11-26
- HEAD de la rama de trabajo verificado por API GitHub: `bf03985d5e078e62a90d78058ff076d939545522` (último commit documental); base `GPSpedia2.2.5` se mantiene en SHA previamente verificado `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Los resultados CI/browser de run `45810553448` fueron ejecutados en el SHA `adb69eeb2edb5cd28b370194eac49956298115a`, antes de las dos actualizaciones documentales que registran resultados.
- Confirmado branch ref apuntando al HEAD documental, sin cambios de código en estas ediciones.


## Continuidad CI/browser — 2026-11-26 (último run verificado)
- HEAD previo a este registro: `85ffaace4e73b2b0b74f25591f834f85d44dc6a6`; base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` sin cambios.
- Run `45811468299`: `service-tests` + `responsive-browser` SUCCESS; 542 suites, 6,453 pruebas, 0 fallos. Pages `45811467538` SUCCESS en el mismo SHA.
- Browser: AUG-146 264/264 en cuatro viewports; Pages login/recuperación UI PASS; PWA cold/warm 49/49 CORE + 4/4 OPTIONAL, login visible, 0 módulos faltantes, 0 pageErrors, 0 Apps Script GET, 0 non-GET, sin credenciales ni escrituras.
- Focales verificadas: útiles FEEDBACK/CATALOG (idempotencia 10/10, append-only 4/4, preflight 8/8, activity 7/7, lock 3/3, retry 2/2, aislamiento CATALOG 2/2, estado botón 10/10, cola 4/4, proyección 9/9); ADMIN/Drive (snapshot 14/14, cursor 23/23, asociación 16/16, metadata 11/11, item reference 3/3, FindOrCreate 7/7, inventario 35/35, IndexedDB 13/13, visual 6/6, retry 7/7, consola 1/1, locations 6/6); tutorial vídeo modal 18/18.
- Capturas sintéticas artifact `15112547683`. Único residual offline frío: CSS Font Awesome CDN; no pageErrors.
- Siguiente Beta: (1) útiles FEEDBACK/CATALOG con dos identidades sintéticas y cleanup verificable; (2) reproducción real tutorial watch y short/shorts en desktop/móvil. Ninguna mutación FEEDBACK/Spreadsheet se ejecutó: faltan identidad/dataset sintético y cleanup verificable en el flujo. Playback remoto no se declara por el test contractual local.
- Incidencia #130: cierre local con validación Beta diferida; no se han ejecutado mutaciones ni despliegues Apps Script.


## Revalidación Beta tras deployments — 2026-11-26
- HEAD previo a esta actualización: `18bfd3c04fdd0016c531a24c9a070705725fbc49`; workflow health `45812643014` SUCCESS: contrato 21/21; seis servicios disponibles y versiones esperadas. ADMIN 2288 ms (SLOW); AUTH 1923, CATALOG 1197, WRITE 1365, FEEDBACK 1380 y UTILITIES 1045 ms.
- CATALOG feed/boundaries/matrix/pagination PASS, GET-only. Sin POST ni cambios de datos remotos.
- Regresión `45812642942`: 542 suites, 6,453 pruebas, 0 fallos; responsive-browser SUCCESS, AUG-146 264/264. Pages `45812641695` SUCCESS.
- PWA cold/warm PASS: 49 core + 4 opcionales, login offline visible, 0 módulos faltantes, 0 pageErrors; Font Awesome CDN falla solo en cold offline. Sin llamadas Apps Script, non-GET, credenciales ni escrituras.
- Siguiente: útiles FEEDBACK/CATALOG con dos identidades sintéticas y cleanup verificable; luego playback real YouTube watch/short/shorts en escritorio/móvil. Mutaciones siguen NO EJECUTADAS.
- Rama base verificada sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## 14. Continuidad Beta — validación posterior a actualización de deployments (2026-11-26)
- HEAD de trabajo al iniciar: `0861215251ab5cba5bfae5eb97361c8ee1b24615`; rama base verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificación.
- Run regression/browser `45813003467` sobre el HEAD actual: ambos jobs SUCCESS. Regresión: 542 suites, 6,453 pruebas aprobadas, 0 fallos; contrato health local 21/21. AUG-146 264/264 en cuatro viewports.
- Pages deployment `45813002541`: SUCCESS. Smoke Pages login/recuperación: HTTP 200 en 1366×768, 390×844, 360×800 y 320×700; 0 errores JS, 0 solicitudes no-GET, 0 GET a Apps Script, sin envío de credenciales ni escrituras.
- PWA cold/warm: Service Worker controlando; 49/49 recursos core y 4/4 opcionales HTTP 200; 0 módulos precache faltantes; login visible offline frío y caliente; 0 pageErrors. Residual visual offline frío: CSS Font Awesome CDN (no bloquea login).
- Health remoto GET-only run `45812643014` (commit fuente `18bfd3c04fdd0016c531a24c9a070705725fbc49`): 6/6 servicios disponibles y versiones esperadas; AUTH 2.2.5, CATALOG 2.4.0, FEEDBACK 1.2.2, UTILITIES 1.5.0, WRITE 2.3.1, ADMIN 2.7.2. ADMIN probe individual 2288 ms (SLOW); cinco muestras 2756/1959/1469/1634/1593 ms, mediana 1634, 1/5 >=2 s. UTILITIES cinco muestras 1199/1333/932/1063/597 ms, mediana 1063, 0/5 lentas.
- CATALOG feed GET-only: revisión 5, cursor inicial 0 y final 5, 5 eventos recuperados (3 reset), paginación de 5 páginas sin cambio concurrente. Límites de cursor negativo/malformado y límites 0/51 rechazados; cursor futuro requiere reset. Sin POST ni mutaciones.
- Próximas validaciones funcionales conservadas: útiles FEEDBACK/CATALOG con dos identidades sintéticas, dataset aislado y cleanup verificable; después reproducción real de tutoriales watch/short/shorts en escritorio y móvil. No se ejecutaron por requerir identidades/recursos de prueba y control de limpieza; no simular resultados.
- No se modificaron Apps Script, deployments, Spreadsheet, Drive, OAuth, permisos ni datos remotos. BETA-F022 permanece como residual visual no bloqueante; Android físico y pruebas mutables siguen pendientes.
