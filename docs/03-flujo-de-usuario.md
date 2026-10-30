# 03 — Recorrido y estados

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** general / técnica.

## Recorrido operativo y estados

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

1. Crear actividad o reutilizar catálogo.
2. Asignar tiempo y política en una fecha/contexto.
3. Revisar y confirmar el corte.
4. Ejecutar con o sin cronómetro y resolver explícitamente.
5. Consultar historia/economía y exportar respaldo.

### Confirmación y resultado

Una actividad puede existir sin bloque temporal.

Restaurar/reiniciar requiere conocer impacto y preservar los contratos documentados.

En formularios/operaciones, distinguir captura, revisión, confirmación, resultado y fallo. Cancelar una previsualización no debe anunciar un cambio no confirmado; cuando existe una operación persistente, su recuperación sigue el contrato específico. En juegos, las fases de simulación se definen en el núcleo y la vista refleja esas transiciones.

### Criterio de aceptación del recorrido

Porcentaje de trabajo cerrado explícitamente, realismo de carga y valoración cualitativa de utilidad; no maximizar puntos o tiempo cronometrado.

Validar inicio, camino principal, error relevante, cancelación y reapertura según la plataforma; registrar también los escenarios aún no ejecutados. Para HereToPlan, atender especialmente: pérdida de almacenamiento local sin respaldo.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
