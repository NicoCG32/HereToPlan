# Mantenimiento de diagramas

HereToPlan dispone de **tres vistas SVG versionadas** para consultar la arquitectura y el dominio. Los diagramas Mermaid de cada capítulo detallan flujos, relaciones y estados junto a su explicación.

| Vista                                            | Archivo                                                      | Fuente de verificación                                  |
| ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| Componentes SVG                                  | [arquitectura-componentes.svg](arquitectura-componentes.svg) | `src/app/configurarAplicacion.ts`, puertos, adaptadores |
| Despliegue SVG                                   | [arquitectura-despliegue.svg](arquitectura-despliegue.svg)   | workflow Pages y `vite.config.ts`                       |
| Dominio SVG                                      | [modelo-dominio.svg](modelo-dominio.svg)                     | `src/dominio/`, contrato [Dominio](Dominio.md)          |
| Contexto, contenedores, componentes y despliegue | [01 · Arquitectura](01-arquitectura-general.md)              | `src/app/`, `src/aplicacion/`, infraestructura          |
| Camino de la persona                             | [03 · Recorrido](03-flujo-de-usuario.md)                     | rutas y casos de uso                                    |
| Entidades lógicas e IndexedDB                    | [04 · Datos](04-dominio-y-persistencia-local.md)                            | `esquemaBaseDatos.ts` y mapeadores                      |
| Operación atómica de cumplimiento                | [05 · Reglas](05-compromisos-puntos-y-recuperacion.md)               | `CompletarBloqueConPuntos.ts`                           |
| Respaldo/restauración                            | [08 · Salidas](08-respaldo-restauracion-y-reinicio.md)                 | `RestaurarRespaldo.ts`, `Respaldo.md`                   |
| Máquinas de estados y secuencia                  | [10 · Estados](10-estados-y-secuencias.md)                   | tipos y entidades del dominio                           |

## Reglas para mantenerlos claros

1. Distinguir una asociación lógica del dominio de una relación física con clave foránea: IndexedDB no ofrece FKs SQL.
2. Mostrar sólo las transiciones respaldadas por el código; las funciones pendientes se describen aparte.
3. Usar nombres de negocio legibles; situar los nombres de tipos y paths fuera de las cajas o en tablas anexas.
4. Evitar conectores que aparenten sincronización con Pages o un backend inexistente.
5. Abrir cada SVG y cada Mermaid en un visor; revisar solapes, contraste y legibilidad de móvil antes de publicar.
6. Ejecutar `npm run verify:docs`, que comprueba rutas locales pero **no** comprueba semántica ni render visual.

Las vistas SVG son editables como XML. Para cambiarlas, conservar `viewBox`, `<title>`, descripciones y contraste. Los bloques Mermaid se editan directamente en Markdown, sin exportaciones binarias obligatorias.
