<div align="center">

<img src="../branding/logos/heretoplan-isotipo-transparente.webp" alt="Isotipo de HereToPlan" width="100" />

# Documentación de HereToPlan

**La idea, las reglas y la experiencia real; sin confundir lo disponible con lo que aún queremos explorar.**

[**Aplicación**](https://nicocg32.github.io/HereToPlan/) · [**Portada**](../README.md) · [**Manual de uso**](Guia-uso.md) · [**Estado funcional**](02-funcionalidades.md)

</div>

---

## Elige tu recorrido

| Ruta                | Para qué sirve                                   | Comienza por                                                                                     |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **01 · General**    | Entender el origen, la experiencia y el alcance. | [Origen y propuesta](00-origen-y-propuesta.md) · [Guía de uso](Guia-uso.md)                      |
| **02 · Técnica**    | Leer arquitectura, reglas, entidades y guardado. | [Arquitectura](01-arquitectura-general.md) · [Datos locales](04-dominio-y-persistencia-local.md) |
| **03 · Desarrollo** | Ejecutar, verificar y mejorar con evidencia.     | [Instalación](09-instalacion-y-despliegue.md) · [Validación](Validacion-producto.md)             |

> **Estado actual:** aplicación web funcional, publicada como sitio estático y **en validación de uso**. Está implementada la planificación local; no lo están las cuentas, la sincronización entre dispositivos ni los calendarios externos. [Ver qué existe y qué falta](02-funcionalidades.md).

## 01 · General — conocerlo y usarlo

| Lectura                                            | Contenido                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Origen y propuesta](00-origen-y-propuesta.md)     | La necesidad personal que dio origen al proyecto y la hipótesis que exploro. |
| [Motivación](16-motivacion-y-contexto.md)          | La evolución de la idea, contada en primera persona.                         |
| [Funciones y límites](02-funcionalidades.md)       | Capacidades presentes frente a pendientes y validación.                      |
| [Recorrido](03-flujo-de-usuario.md)                | Desde crear una actividad hasta resolver un compromiso.                      |
| [Manual del usuario](Guia-uso.md)                  | Instrucciones para calendario, puntos, recuperación y respaldo.              |
| [Diseño y accesibilidad](07-diseno-e-identidad.md) | Qué decisiones hacen la interfaz más comprensible.                           |

## 02 · Técnica — comprender las decisiones

| Lectura                                                                       | Qué documenta                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Arquitectura por niveles](01-arquitectura-general.md)                        | Contexto, componentes, ejecución y despliegue.                        |
| [Dominio y persistencia local](04-dominio-y-persistencia-local.md)            | Entidades conceptuales, **15 object stores IndexedDB** y sus límites. |
| [Compromisos, puntos y recuperación](05-compromisos-puntos-y-recuperacion.md) | Reglas, fórmula de puntos y transacciones idempotentes.               |
| [Flujos y estados](10-estados-y-secuencias.md)                                | Máquinas de estados de cortes, resultados, cronómetro y recompensas.  |
| [Respaldo y restauración](08-respaldo-restauracion-y-reinicio.md)             | Exportación JSON V3, importación, confirmaciones y reinicio.          |
| [Integraciones](06-integraciones.md)                                          | APIs del navegador y GitHub Pages; sin backend de usuario.            |

<details>
<summary><strong>Ver contratos especializados y diagramas</strong></summary>

Los capítulos anteriores explican el sistema de forma progresiva. Si necesitas verificar contratos, versiones y detalles técnicos, consulta:

- [Contrato de arquitectura](Arquitectura.md), [contrato del dominio](Dominio.md) y [contrato de respaldos](Respaldo.md).
- [Mapa de diagramas](Diagramas.md), incluidas las vistas SVG editables de componentes, despliegue y dominio.
- [Referencia ampliada de uso](Referencia-de-uso.md), complementaria al manual.

Los diagramas conceptuales de IndexedDB representan relaciones lógicas; no se trata de un esquema SQL ni de una base centralizada.

</details>

## 03 · Desarrollo — reproducir y evaluar

| Lectura                                                    | Objetivo                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Ejecutar y desplegar](09-instalacion-y-despliegue.md)     | Node, instalación local, pruebas, build y publicación.                  |
| [Desarrollo y metodología](17-desarrollo-y-metodologia.md) | Cómo evolucionar reglas, casos de uso, adaptadores y vistas.            |
| [Validar antes de ampliar](15-validacion-y-evolucion.md)   | Priorizar mediante resultados, no por una lista hipotética de mercados. |
| [Prueba de producto](Validacion-producto.md)               | Hipótesis evaluables y evidencia aún por recoger.                       |
| [Protocolo de uso sostenido](Protocolo-uso-sostenido.md)   | Cómo registrar observaciones reales sin inventar conclusiones.          |
| [Despliegue](Despliegue.md)                                | Configuración de GitHub Pages y recuperación ante fallos.               |
| [Estilo](Estilo.md)                                        | Criterios de identidad, composición CSS y accesibilidad.                |
| [Licencias y recursos](Licencias-y-recursos.md)            | Estado del aviso legal y comprobaciones de terceros pendientes.         |

## Qué comprobar al leer esta documentación

- **Implementado** significa respaldado por código o una función identificable; **no** significa necesariamente validado con personas o en todos los navegadores.
- **En validación** es trabajo existente que necesita uso sostenido, pruebas adicionales o medición.
- **Propuesto** es una posibilidad. Nunca se presenta como una prestación disponible.
- El documento especializado explica contratos; el capítulo breve explica la idea; los dos no deben contradecirse.

La identidad se conserva en el [catálogo de marca](../branding/README.md). La lectura empieza por la pregunta del lector, no por un índice de archivos impuesto por una plantilla.
