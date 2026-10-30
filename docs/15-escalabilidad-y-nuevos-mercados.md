# 15 — Justificación, proyección y escalabilidad

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** desarrollo del proyecto.

## Justificación y proyección

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

### Ajuste entre problema y solución

| Necesidad                 | Razón del diseño                                                              |
| ------------------------- | ----------------------------------------------------------------------------- |
| Compromisos involuntarios | La revisión y la gracia hacen explícita la confirmación                       |
| Edición sin trazabilidad  | Cortes/resoluciones conservan la decisión y su resultado                      |
| Flexibilidad arbitraria   | Políticas y recompensas declaran qué ajustes son posibles antes del resultado |

Porcentaje de trabajo cerrado explícitamente, realismo de carga y valoración cualitativa de utilidad; no maximizar puntos o tiempo cronometrado.

### Qué se puede abstraer y qué no

Las entidades, reglas y fronteras de [04-base-de-datos.md](04-base-de-datos.md) permiten evaluar reutilización. Cambiar un nombre o una categoría no prueba compatibilidad con otro sector: datos, permisos, reglas, operación y costos deben validarse de nuevo.

### Extensiones de contexto: hipótesis, no mercados validados

- Planificación académica individual
- Entrenamiento personal
- Proyectos creativos personales
- Seguimiento de hábitos con compromisos explícitos

No se atribuyen clientes, ventas, demanda ni superioridad sobre competidores sin evidencia. La primera validación consiste en una necesidad concreta, un flujo útil y disposición real a adoptarlo. Para juegos, el valor inicial es una experiencia disfrutable, no ahorro de horas ni una promesa educativa no ensayada.

### Límites y trade-offs

- Pérdida de almacenamiento local sin respaldo
- Reglas comprensibles sólo para su autor
- Cronómetro/economía que incentiven comportamiento no deseado
- Confundir validación técnica con utilidad personal

### Prioridad de inversión

| Prioridad   | Iniciativa                                                                  | Impacto a comprobar                                                                                                                              | Criterio económico                                                    |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Alta        | Ciclo de validación de uso, recuperación y corrección de fricción observada | Porcentaje de trabajo cerrado explícitamente, realismo de carga y valoración cualitativa de utilidad; no maximizar puntos o tiempo cronometrado. | Rango de esfuerzo y costo en capítulo 18; no presupuesto comprometido |
| Media       | Reproducción, soporte y recuperación por plataforma                         | Menos fallos de entrega y pérdida de datos                                                                                                       | Costo recurrente separado de implementación                           |
| Estratégica | Validar una extensión/forma de sostenimiento                                | Uso y aceptación fuera del contexto inicial                                                                                                      | Investigar costos, demanda y condiciones antes de monetizar           |

Las cifras CLP/USD, supuestos, sensibilidad y retorno se presentan en [18-analisis-economico-clp-usd.md](18-analisis-economico-clp-usd.md); no son una valoración comercial del repositorio.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
