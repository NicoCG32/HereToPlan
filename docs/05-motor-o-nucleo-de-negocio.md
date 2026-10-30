# 05 — Reglas y núcleo

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Núcleo e invariantes

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.
- El cronómetro no sustituye la declaración humana de cumplimiento.
- Adquirir una recompensa y aplicarla son operaciones diferentes; la vista previa no escribe.
- Restaurar/reiniciar requiere conocer impacto y preservar los contratos documentados.

### Entradas, decisión y efectos

El recorrido de [03-flujo-de-usuario.md](03-flujo-de-usuario.md) proporciona entradas al núcleo. Las reglas anteriores determinan lo aceptado y sus efectos; UI y proveedores externos no deben sustituir silenciosamente esas decisiones. El modelo de [04-base-de-datos.md](04-base-de-datos.md) identifica los estados/referencias afectados.

Las fórmulas y parámetros detallados permanecen en las fuentes especializadas enlazadas. Distinguir parámetros provisionales, azar, reloj y resultados persistidos; cambiar presentación o reexportar no debe presentarse como una nueva evaluación equivalente sin identificarlo.

### Pruebas con propósito

Proteger al menos una transición válida, un rechazo importante y la repetición/reapertura que pueda duplicar efectos. No inventar una suite ni un porcentaje de cobertura: consultar los comandos existentes y la evidencia de su ejecución en [09-instalacion-y-despliegue.md](09-instalacion-y-despliegue.md).

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
