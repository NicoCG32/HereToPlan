# 17 — Etapas y metodología

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** desarrollo del proyecto.

## Desarrollo del proyecto: etapas y método

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

Validación por hipótesis y uso sostenido antes de una implementación de producción separada. Desarrollo en incrementos con contratos de dominio, pruebas de atomicidad/persistencia, accesibilidad y CI. No se declara validado el producto sólo porque compile.

### Etapas reconstruidas de fuentes

| Etapa                   | Evidencia / alcance                                  |
| ----------------------- | ---------------------------------------------------- |
| Diseño                  | Reglas y contratos del sistema                       |
| Validación implementada | Calendario, persistencia, economía y respaldo        |
| Uso sostenido           | Registrar utilidad, presión y errores de comprensión |
| Puerta de decisión      | Continuar, iterar o detener antes de producción      |

El cuadro distingue hechos documentados y pendientes. Un archivo de planificación describe intención; un commit confirma contenido de código/documentación; una prueba/artefacto con procedencia aporta evidencia de comportamiento. No son intercambiables.

### Ciclo de trabajo y decisión

1. Caracterizar una necesidad y un escenario observable.
2. Revisar contratos, datos y límites del alcance.
3. Implementar o prototipar el incremento apropiado a la etapa.
4. Verificar el recorrido y sus errores relevantes; conservar resultados negativos.
5. Decidir continuar, corregir, limitar o posponer y actualizar documentación vigente.

Este ciclo es una propuesta de continuidad compatible con el método descrito arriba; no se afirma que todas las etapas históricas se ejecutaran con idéntica ceremonia o duración.

### Cierre y continuidad

La entrega identifica fuente, plataforma, límites, guía de uso e integridad de datos/artefactos. Los informes académicos conservan su etapa, cuando aplican, y no se actualizan como si fueran manuales del runtime. La proyección no obliga a desarrollar extensiones antes de validar el núcleo.

Justificación y prioridades: [15-escalabilidad-y-nuevos-mercados.md](15-escalabilidad-y-nuevos-mercados.md). Esfuerzo futuro y operación: [18-analisis-economico-clp-usd.md](18-analisis-economico-clp-usd.md).

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
