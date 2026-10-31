# 17 — Etapas y metodología

## Desarrollo del proyecto: etapas y método

Validación por hipótesis y uso sostenido antes de una implementación de producción separada. Desarrollo en incrementos con contratos de dominio, pruebas de atomicidad/persistencia, accesibilidad y CI. La validación incluye la experiencia de uso, además de la corrección técnica.

### Etapas del proyecto

| Etapa                   | Alcance                                              |
| ----------------------- | ---------------------------------------------------- |
| Diseño                  | Reglas y contratos del sistema                       |
| Validación implementada | Calendario, persistencia, economía y respaldo        |
| Uso sostenido           | Registrar utilidad, presión y errores de comprensión |
| Puerta de decisión      | Continuar, iterar o detener antes de producción      |

### Ciclo de trabajo y decisión

1. Caracterizar una necesidad y un escenario observable.
2. Revisar contratos, datos y límites del alcance.
3. Implementar o prototipar el incremento apropiado a la etapa.
4. Verificar el recorrido y sus errores relevantes; conservar resultados negativos.
5. Decidir continuar, corregir, limitar o posponer y actualizar documentación vigente.

Los siguientes incrementos siguen este ciclo y se contrastan con los criterios de aceptación del producto.

### Cierre y continuidad

La entrega identifica fuente, plataforma, límites, guía de uso e integridad de datos/artefactos. Los informes académicos conservan su etapa, cuando aplican, y no se actualizan como si fueran manuales del runtime. La proyección no obliga a desarrollar extensiones antes de validar el núcleo.

Justificación y prioridades: [15-escalabilidad-y-nuevos-mercados.md](15-escalabilidad-y-nuevos-mercados.md). Esfuerzo futuro y operación: [18-analisis-economico-clp-usd.md](18-analisis-economico-clp-usd.md).

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
