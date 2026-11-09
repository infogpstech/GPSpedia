# CONTEXTO DE TRABAJO ACTIVO — GPSpedia

## Repositorio y ramas
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- Rama base: `GPSpedia2.2.5`; no modificar ni fusionar sin autorización.
- HEAD previo a DOC-MIG-2026-001: `63fbee17260ce850d8dcaeae363288559c49715e`. Verificar siempre HEAD actuales.

## Commit autorizado
Solo GitHub Git Database API: verificar HEADs; crear blobs; crear un único árbol sobre el árbol confirmado; crear un commit con parent_sha igual al HEAD; actualizar solo la rama de trabajo con force:false y expected_sha confirmado; verificar commit, padre, archivos y base intacta.
Prohibidos Contents API para escritura, Git local, git commit/push, UI commits, commits intermedios, force push y merge. Un commit por tarea.

## Normas de continuidad
Aplicar `Proceso de desarollo.md`, `Plan_auditoría/Protocolo_Ciclo_Continuo.md` y `Plan_auditoría/Normas_Gestion_Documental.md`. Auditar la implementación anterior, nunca informes de auditoría ni AUD-T cerradas. Registrar hallazgos antes de corregir. No reintroducir filtros rápidos cancelados.

## Historial previo
El contexto anterior se conserva en:
- `Olds/Documentacion_Legacy/contexto_personal_legacy_parte_001.md` (179718 caracteres)
- `Olds/Documentacion_Legacy/contexto_personal_legacy_parte_002.md` (31595 caracteres)
La concatenación reproduce exactamente el documento original previo a DOC-MIG-2026-001.


**Regla:** no borrar, truncar, sobrescribir ni reordenar entradas; agregar cada entrada al final. Verificar antes que el resultado no supere 180,000 caracteres Unicode. Si excede, rotar según `Plan_auditoría/Normas_Gestion_Documental.md`.
