# Documentación de HereToPlan

<!-- DOCUMENTACION:indice-niveles-2026-10-29:BEGIN -->

## Documentación por cuatro niveles — 2026-10-29

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

| Nivel                      | Pregunta principal                                                    | Lectura                                                                                    |
| -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. General                 | Qué problema, para quién, qué solución y por qué lo eligió el creador | 00, 02, 03 y 16                                                                            |
| 2. Técnica                 | Cómo funciona, entidades, persistencia y ejecución                    | 01, 04, 05, 06, 07, 08 y 09                                                                |
| 3. Desarrollo del proyecto | Cómo se llegó, por qué corresponde y qué cuesta continuar             | 17, 15 y 18                                                                                |
| 4. Académica/formativa     | Qué se entregó en un curso y a qué etapa pertenece                    | No se ha declarado origen académico: este nivel no se inventa ni se exige a este proyecto. |

### Rutas por lector

- **Dirección/cliente/responsable:** 00 → 16 → 01 → 15 → 18.
- **Desarrollo/técnica:** 01 → 04 → 05 → 06 → 09; complementar con las guías especializadas conservadas.
- **Producto/operaciones:** 00 → 02 → 03 → 07 → 08 → 17.
- **Académica/formativa:** contexto de 16 y catálogo del nivel 4 cuando corresponda; contrastar luego con la arquitectura vigente.

| Capítulo | Documento                                                                          | Nivel                   |
| -------- | ---------------------------------------------------------------------------------- | ----------------------- |
| 00       | [Problemática, cliente y solución](00-problematica-cliente-y-valor.md)             | general                 |
| 01       | [Arquitectura por niveles](01-arquitectura-general.md)                             | técnica                 |
| 02       | [Catálogo funcional](02-funcionalidades.md)                                        | general / técnica       |
| 03       | [Recorrido y estados](03-flujo-de-usuario.md)                                      | general / técnica       |
| 04       | [Dominio, entidades y persistencia](04-base-de-datos.md)                           | técnica                 |
| 05       | [Reglas y núcleo](05-motor-o-nucleo-de-negocio.md)                                 | técnica                 |
| 06       | [Integraciones y asistencia](06-capa-de-ia-o-analisis.md)                          | técnica                 |
| 07       | [Diseño y accesibilidad](07-diseno-e-identidad.md)                                 | técnica / producto      |
| 08       | [Salidas y entregables](08-exportacion-e-informes.md)                              | técnica                 |
| 09       | [Puesta en marcha y distribución](09-instalacion-y-despliegue.md)                  | técnica                 |
| 15       | [Justificación, proyección y escalabilidad](15-escalabilidad-y-nuevos-mercados.md) | desarrollo del proyecto |
| 16       | [Motivación personal y contexto](16-motivacion-y-contexto.md)                      | general                 |
| 17       | [Etapas y metodología](17-desarrollo-y-metodologia.md)                             | desarrollo del proyecto |
| 18       | [Escenarios económicos CLP / USD](18-analisis-economico-clp-usd.md)                | desarrollo del proyecto |

Los nuevos capítulos complementan las fuentes especializadas existentes; no reemplazan contratos detallados por resúmenes. Los originales académicos se conservan intactos. La documentación del desarrollo describe etapas/metodología del producto y no contiene instrucciones o conversaciones internas.
<!-- DOCUMENTACION:indice-niveles-2026-10-29:END -->

Esta documentación describe la implementación de la fase de validación.
El [README](../README.md) permite instalarla y ubicar su estado; el tablero
[HereToPlan Dev](https://github.com/users/NicoCG32/projects/3) conserva las tareas
y su revisión.

## Lectura por propósito

| Necesidad                                                   | Documento                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Usar calendario, perfil, puntos, respaldo y guía            | [Guía de uso](Guia-uso.md)                                  |
| Entender entidades, reglas y límites disponibles            | [Dominio](Dominio.md)                                       |
| Seguir casos de uso, puertos, adaptadores y transacciones   | [Arquitectura](Arquitectura.md)                             |
| Mantener vistas, CSS, foco y adaptación móvil               | [Estilo](Estilo.md)                                         |
| Consultar recorridos y correcciones de usabilidad           | [Revisión UX/UI](Revision-ux-ui.md)                         |
| Revisar el peso inicial y la decisión de separar páginas    | [Rendimiento](Rendimiento.md)                               |
| Comprender JSON V3, migraciones, restauración y reinicio    | [Respaldo](Respaldo.md)                                     |
| Instalar, comprobar y publicar mediante GitHub Pages        | [Despliegue](Despliegue.md)                                 |
| Editar las fuentes de los tres diagramas                    | [Diagramas](Diagramas.md)                                   |
| Consultar alcance, resultados y pendientes de calidad       | [Auditoría integral](Auditoria-integral.md)                 |
| Distinguir axe, revisión manual y comprobaciones pospuestas | [Accesibilidad](Auditoria-accesibilidad.md)                 |
| Registrar evidencia de uso cotidiano                        | [Protocolo de uso sostenido](Protocolo-uso-sostenido.md)    |
| Preparar escenarios y registrar resultados por hipótesis    | [Validación de producto](Validacion-producto.md)            |
| Consultar procedencia y presupuesto de recursos de interfaz | [Recursos visuales](../src/presentacion/recursos/README.md) |

La [revisión de dependencias](Dependencias.md) conserva el inventario de avisos,
las versiones corregidas y la comprobación de la migración del runner.

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

<!-- INDICE:uso-y-licencia -->

## Uso, distribución y condiciones

- [Entrada y descargas](../README.md).
- [Licencia, créditos y reutilización](../LICENSING.md).
- [Referencia ampliada de uso](Referencia-de-uso.md).
