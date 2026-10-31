# Documentación de HereToPlan

Aplicación web de planificación en fase de validación, con datos locales y respaldo. La evolución hacia producción depende de la evaluación de uso sostenido.

## Documentación por cuatro tipos

| Tipo                    | Qué encontrarás                                                 | Por dónde empezar                                                                                                                                |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| General                 | Problemática, público, solución y motivación personal           | [Propuesta](00-problematica-cliente-y-valor.md) · [Origen](16-motivacion-y-contexto.md)                                                          |
| Técnica                 | Arquitectura, dominio, datos, interfaz y puesta en marcha       | [Arquitectura](01-arquitectura-general.md) · [Instalación](09-instalacion-y-despliegue.md)                                                       |
| Desarrollo del proyecto | Etapas, metodología, justificación, proyección y costos CLP/USD | [Metodología](17-desarrollo-y-metodologia.md) · [Proyección](15-escalabilidad-y-nuevos-mercados.md) · [Costos](18-analisis-economico-clp-usd.md) |
| Académica/formativa     | No aplica al origen de este proyecto                            | —                                                                                                                                                |

## Rutas de lectura

- **Conocer el proyecto:** [propuesta](00-problematica-cliente-y-valor.md) → [motivación](16-motivacion-y-contexto.md) → [funcionalidades](02-funcionalidades.md).
- **Utilizarlo o desplegarlo:** [recorrido](03-flujo-de-usuario.md) → [instalación](09-instalacion-y-despliegue.md).
- **Desarrollar o contribuir:** [arquitectura](01-arquitectura-general.md) → [dominio y datos](04-base-de-datos.md) → [reglas](05-motor-o-nucleo-de-negocio.md).
- **Evaluar su evolución:** [metodología](17-desarrollo-y-metodologia.md) → [proyección](15-escalabilidad-y-nuevos-mercados.md) → [costos](18-analisis-economico-clp-usd.md).

## Tabla de contenidos

| Capítulo | Documento                                                                          |
| -------- | ---------------------------------------------------------------------------------- |
| 00       | [Problemática, cliente y solución](00-problematica-cliente-y-valor.md)             |
| 01       | [Arquitectura por niveles](01-arquitectura-general.md)                             |
| 02       | [Catálogo funcional](02-funcionalidades.md)                                        |
| 03       | [Recorrido y estados](03-flujo-de-usuario.md)                                      |
| 04       | [Dominio, entidades y persistencia](04-base-de-datos.md)                           |
| 05       | [Reglas y núcleo](05-motor-o-nucleo-de-negocio.md)                                 |
| 06       | [Integraciones y asistencia](06-capa-de-ia-o-analisis.md)                          |
| 07       | [Diseño y accesibilidad](07-diseno-e-identidad.md)                                 |
| 08       | [Salidas y entregables](08-exportacion-e-informes.md)                              |
| 09       | [Puesta en marcha y distribución](09-instalacion-y-despliegue.md)                  |
| 15       | [Justificación, proyección y escalabilidad](15-escalabilidad-y-nuevos-mercados.md) |
| 16       | [Motivación personal y contexto](16-motivacion-y-contexto.md)                      |
| 17       | [Etapas y metodología](17-desarrollo-y-metodologia.md)                             |
| 18       | [Escenarios económicos CLP / USD](18-analisis-economico-clp-usd.md)                |

## Guías especializadas

- [Contrato de arquitectura de HereToPlan](Arquitectura.md).
- [Auditoría de accesibilidad](Auditoria-accesibilidad.md).
- [Auditoría integral de la validación](Auditoria-integral.md).
- [Revisión de dependencias](Dependencias.md).
- [Instalación y despliegue](Despliegue.md).
- [Mantenimiento de diagramas](Diagramas.md).
- [Contrato del dominio de HereToPlan](Dominio.md).
- [Estilo y composición de la interfaz](Estilo.md).
- [Guía de uso](Guia-uso.md).
- [Protocolo de uso sostenido](Protocolo-uso-sostenido.md).
- [Referencia ampliada de uso](Referencia-de-uso.md).
- [Peso de carga y decisión de composición](Rendimiento.md).
- [Contrato de respaldo de HereToPlan](Respaldo.md).
- [Revisión de UX/UI — 2026-10-21](Revision-ux-ui.md).
- [Validación de producto: preparación de la ronda](Validacion-producto.md).

## Vistas del sistema

- [Componentes y dependencias](arquitectura-componentes.svg).
- [Entrega y almacenamiento en el navegador](arquitectura-despliegue.svg).
- [Modelo de dominio](modelo-dominio.svg).

## Convención de mantenimiento

Un contrato describe lo que hace el código. Las propuestas y limitaciones se
nombran como pendientes, y una cifra de pruebas siempre corresponde a un corte
registrado. Una ejecución técnica no completa por sí sola el experimento de
producto ni certifica todas las condiciones de accesibilidad.

Después de cambiar documentación, ejecutar `npm run format:check` y
`npm run verify:docs`; este último comprueba destinos locales de enlaces e
imágenes, sin acceder a URLs externas ni validar sus fragmentos. La revisión
de diagramas incluye lectura visual del SVG y contraste con las fuentes de
código indicadas en [Diagramas](Diagramas.md).

## Uso y distribución

[Presentación y descargas](../README.md) · [Licencia y créditos](../LICENSING.md).
