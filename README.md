<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="branding/banners/heretoplan-banner-oscuro.webp" />
  <img src="branding/banners/heretoplan-banner-claro.webp" alt="HereToPlan: identidad gráfica del proyecto" width="100%" />
</picture>

# HereToPlan

**Planificar con intención. Revisar lo hecho. Ajustar sin perder la historia.**

[![Estado](https://img.shields.io/badge/Estado-Validaci%C3%B3n%20de%20uso-5265B1?style=flat-square)](docs/15-escalabilidad-y-nuevos-mercados.md)
[![Web](https://img.shields.io/badge/Aplicaci%C3%B3n-Web%20local--first-347B77?style=flat-square)](docs/01-arquitectura-general.md)
[![Licencia](https://img.shields.io/badge/Licencia-PolyForm%20NC-596273?style=flat-square)](LICENSING.md)

[**Abrir HereToPlan**](https://nicocg32.github.io/HereToPlan/) · [**Conocer el proyecto**](docs/00-problematica-cliente-y-valor.md) · [**Documentación**](docs/README.md)

</div>

---

## Resumen ejecutivo

HereToPlan es una aplicación web de planificación personal que conecta actividades, bloques de tiempo y compromisos con un registro de sus resultados. Incluye cronómetro opcional, puntos, recompensas y herramientas para ajustar la carga de trabajo. Está en fase de validación y guarda los datos en el navegador, con respaldos exportables y sin sincronización entre dispositivos.

## Estado real del proyecto

| Nivel | Alcance de esta versión |
| --- | --- |
| ✅ **Implementado** | Aplicación web local con actividades, bloques, cronómetro opcional, puntos/recompensas y registro de resultados; datos en IndexedDB y respaldos exportables. |
| 🧪 **En validación** | Uso sostenido, claridad del sistema de compromisos, utilidad de los incentivos y recuperación de datos tras exportar/restaurar. |
| 🧭 **Propuesto** | Sincronización entre dispositivos, integración con calendarios y nuevas formas de organizar proyectos; no están disponibles en la versión actual. |

<details>
<summary><strong>¿Qué significa cada estado?</strong></summary>

«Implementado» describe algo respaldado por código o una entrega identificable; no garantiza una validación completa. «En validación» necesita pruebas adicionales, y «propuesto» es una aspiración, no una función disponible. Las notas de versión y los documentos especializados detallan los límites concretos.

</details>

## Por qué existe

HereToPlan comenzó durante unas vacaciones, después de mis estudios. Tenía tiempo libre y se me ocurrió crear mi propio calendario para organizar mejor los días. La idea inicial era sencilla: combinar actividades y hábitos con un **sistema de recompensas** que me animara a cumplir las metas que me propusiera.

Al desarrollar esa idea, quise ir más allá de marcar tareas como completadas. Me interesó distinguir entre **lo que quiero hacer, cuándo planeo hacerlo, el tiempo que me comprometo a dedicarle y lo que efectivamente ocurrió**. De ahí nacieron reglas para registrar compromisos, puntos y formas de ajustar la planificación sin borrar su historia.

Quiero comprobar con el uso si estos incentivos ayudan a cumplir las metas y si el sistema resulta práctico.

## Qué permite hacer

- Crear actividades reutilizables —incluidos tipos de tarea, proyecto y hábito— y organizar la agenda mediante un calendario y contextos de planificación.
- Asignar bloques de tiempo, revisar y confirmar compromisos; resolverlos con estados e historia, distinguiendo políticas estrictas y flexibles.
- Elegir seguimiento manual o cronometrado; registrar sesiones cuando corresponde.
- Consultar puntos, recompensas y recuperación, con operaciones sometidas a reglas de negocio y controles para evitar duplicados.
- Exportar un respaldo JSON, analizarlo antes de importar y restaurar el estado local con confirmación explícita.

**Alcance actual:** aplicación web sin cuenta ni servidor de datos propio. Los registros se guardan en el navegador mediante IndexedDB; las preferencias del tutorial usan `localStorage`. No hay sincronización automática entre dispositivos. La validación de uso sostenido, la calibración de reglas y algunas funciones de composición/recurrencia siguen pendientes. [Estado y límites](docs/02-funcionalidades.md).

## Tecnología y arquitectura

| Parte        | Implementación                                             |
| ------------ | ---------------------------------------------------------- |
| Interfaz     | React 19, TypeScript 6, React Router 7 y Vite 8            |
| Núcleo       | Dominio en TypeScript, casos de uso, puertos y adaptadores |
| Persistencia | IndexedDB local; contratos de respaldo JSON versionados    |
| Calidad      | Vitest, Testing Library, axe-core, ESLint y GitHub Actions |
| Publicación  | Sitio estático en GitHub Pages, bajo `/HereToPlan/`        |

La arquitectura separa reglas de negocio, coordinación de casos de uso, almacenamiento y componentes visuales. [Ver arquitectura, diagramas y fronteras](docs/01-arquitectura-general.md).

## Ejecutarlo localmente

Se necesita Node.js 24 desde la versión **24.18.0**, npm 11 y un navegador moderno. La CI usa la versión fijada en [`.nvmrc`](.nvmrc):

```bash
npm ci
npm run dev
```

El proyecto configura la base `/HereToPlan/`; abre la dirección que indique Vite. Para validar un cambio antes de publicarlo:

```bash
npm run lint
npm run test
npm run build
npm run verify:docs
```

La guía de [despliegue](docs/Despliegue.md) detalla la instalación, las comprobaciones y la publicación en Pages. Para trasladar tu planificación a otro navegador o dispositivo, exporta y restaura un respaldo.

## Documentación, por perfil

- **General:** [problema y propuesta](docs/00-problematica-cliente-y-valor.md), [funciones](docs/02-funcionalidades.md), [uso](docs/Guia-uso.md).
- **Técnica:** [arquitectura](docs/01-arquitectura-general.md), [datos](docs/04-base-de-datos.md), [reglas](docs/05-motor-o-nucleo-de-negocio.md), [estados](docs/10-estados-y-secuencias.md).
- **Desarrollo:** [proceso y límites de validación](docs/17-desarrollo-y-metodologia.md), [instalación](docs/09-instalacion-y-despliegue.md), [evaluación](docs/Validacion-producto.md).

[**Índice completo y guías especializadas**](docs/README.md) · [Recursos de identidad](branding/README.md).

## Licencia

El proyecto se distribuye bajo PolyForm Noncommercial 1.0.0. Consulta [LICENSE](LICENSE), [LICENSING.md](LICENSING.md) y [NOTICE](NOTICE) para las condiciones y atribuciones.
