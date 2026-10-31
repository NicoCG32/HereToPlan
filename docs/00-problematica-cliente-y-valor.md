# 00 — Problemática, cliente y solución

## Síntesis general — HereToPlan

**Disponibilidad:** Aplicación web de planificación en fase de validación, con datos locales y respaldo. La evolución hacia producción depende de la evaluación de uso sostenido.

### Problemática

Planificar sólo como una lista editable facilita comprometer tiempo sin revisar capacidad o borrar lo incumplido sin aprendizaje. Se busca equilibrar responsabilidad, flexibilidad y trazabilidad sin convertir la organización en un sistema punitivo.

### Cliente, usuario y beneficiario

| Perfil            | Contexto                                         | Necesidad                                                |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Usuario inicial   | Persona que valida su planificación              | Comprometer tiempo de forma realista                     |
| Usuario potencial | Estudiante o trabajador que organiza actividades | Distinguir actividad, bloque, seguimiento y flexibilidad |
| Comprador         | Sin modelo de venta definido                     | La utilidad se valida antes de cuentas/producción        |

### Solución y límites

Actividades reutilizables se asignan a bloques por fecha y contextos opcionales. Los cortes de planificación confirman compromisos; resolución, puntos, inventario y recuperación preservan historia con reglas explícitas. IndexedDB conserva estado y el respaldo permite trasladarlo.

### Por qué corresponde al problema

| Fricción / necesidad      | Mecanismo de la solución                                                      |
| ------------------------- | ----------------------------------------------------------------------------- |
| Compromisos involuntarios | La revisión y la gracia hacen explícita la confirmación                       |
| Edición sin trazabilidad  | Cortes/resoluciones conservan la decisión y su resultado                      |
| Flexibilidad arbitraria   | Políticas y recompensas declaran qué ajustes son posibles antes del resultado |

### Validación pendiente o continua

Porcentaje de trabajo cerrado explícitamente, realismo de carga y valoración cualitativa de utilidad; no maximizar puntos o tiempo cronometrado.

Puedes conocer el origen del proyecto en [16-motivacion-y-contexto.md](16-motivacion-y-contexto.md); el análisis de costos y proyección se separa en [18-analisis-economico-clp-usd.md](18-analisis-economico-clp-usd.md).

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
