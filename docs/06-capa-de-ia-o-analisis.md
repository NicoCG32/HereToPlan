# 06 — Integraciones y asistencia

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Integraciones y límites de asistencia

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

| Servicio / integración | Finalidad / ejecución    | Contrato o límite                             |
| ---------------------- | ------------------------ | --------------------------------------------- |
| GitHub Pages           | Distribución estática    | Base y hash routes                            |
| IndexedDB              | Datos del navegador      | Cuota, origen y recuperación                  |
| No requiere IA/backend | Modo de validación local | No añadir cuentas por conveniencia documental |

Si no hay IA generativa implementada, este capítulo no la introduce. Una IA rival de videojuego no es un proveedor LLM. Cuando existe asistencia, documentar entradas enviadas, revisión, esquema, timeout/cancelación y efecto permitido. Los reintentos/fallback deben corresponder al código y al consentimiento; no se agregan a un contrato de intento único para seguir una plantilla.

Las claves de servidor y firma no se incluyen en cliente, informes o archivos de distribución. La disponibilidad, costo y condiciones de los proveedores se verifican para el entorno real. Sin esa comprobación, distinguir integración configurada, declarada y probada.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
