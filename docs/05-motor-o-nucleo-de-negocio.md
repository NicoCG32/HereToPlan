# 05 — Reglas y núcleo

## Núcleo e invariantes

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.
- El cronómetro no sustituye la declaración humana de cumplimiento.
- Adquirir una recompensa y aplicarla son operaciones diferentes; la vista previa no escribe.
- Restaurar/reiniciar requiere conocer impacto y preservar los contratos documentados.

### Entradas, decisión y efectos

El recorrido de [03-flujo-de-usuario.md](03-flujo-de-usuario.md) proporciona entradas al núcleo. Las reglas anteriores determinan lo aceptado y sus efectos; UI y proveedores externos no deben sustituir silenciosamente esas decisiones. El modelo de [04-base-de-datos.md](04-base-de-datos.md) identifica los estados/referencias afectados.

Los documentos especializados enlazados detallan las fórmulas, parámetros y efectos de cada operación.

### Pruebas con propósito

Para comprobar el núcleo, cubre una operación válida, una entrada rechazada y la reapertura o repetición de la operación. Los comandos de prueba están en [instalación y despliegue](09-instalacion-y-despliegue.md).

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
