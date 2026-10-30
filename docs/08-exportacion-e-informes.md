# 08 — Salidas y entregables

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Salidas, respaldo e informes

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

Respaldo JSON versionado de las colecciones de planificación, identidad e historia según contrato. Su análisis previo no escribe; restauración válida y reinicio son acciones distintas con consecuencias visibles.

### Separación de entregables

- **Resultado de uso:** información/experiencia que obtiene la persona al completar el recorrido.
- **Datos o respaldo:** sólo los formatos explícitamente implementados y su contrato de restauración.
- **Distribución:** aplicación, APK, ZIP o firmware, con fuente y versión; no incluye datos privados por defecto.
- **Documentación académica:** informes/anexos históricos, cuando el origen formativo aplica; se catalogan en su cuarto nivel, sin reescribirlos como especificación vigente.

Cuando un informe representa una decisión calculada, identificar resultados/datos de origen y sus versiones. Si la exportación recalcula por diseño, declararlo; no afirmar inmutabilidad inexistente. Para un proyecto sin exportador funcional, este texto delimita lo que falta y no lo presenta como disponible.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
