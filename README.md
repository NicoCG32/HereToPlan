<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="branding/heretoplan-banner-oscuro.webp" />
  <img src="branding/heretoplan-banner-claro.webp" alt="Identidad visual de HereToPlan" width="100%" />
</picture>

# HereToPlan

**Planificar con intención. Cumplir, ajustar y aprender.**

[![Estado: En validación](https://img.shields.io/badge/Estado-En%20validaci%C3%B3n-5265B1?style=flat-square&labelColor=263244)](#sobre-el-proyecto) [![Plataforma: Web / Local](https://img.shields.io/badge/Plataforma-Web%20%2F%20Local-386B8F?style=flat-square&labelColor=263244)](#usar-o-descargar) [![Licencia: PolyForm NC](https://img.shields.io/badge/Licencia-PolyForm%20NC-596273?style=flat-square&labelColor=263244)](LICENSING.md)

[![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#tecnologías) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF)](#tecnologías) [![Vite 8](https://img.shields.io/badge/Vite%208-646CFF?style=for-the-badge&logo=vite&logoColor=FFFFFF)](#tecnologías) [![IndexedDB](https://img.shields.io/badge/IndexedDB-6D28D9?style=for-the-badge)](#tecnologías)

[Abrir aplicación](https://nicocg32.github.io/HereToPlan/) · [Documentación](docs/README.md) · [Arquitectura](docs/01-arquitectura-general.md) · [Inicio rápido](#ejecutar-desde-el-código)

</div>

---

## Sobre el proyecto

Planificador personal que separa actividades y compromisos del calendario. Permite planificar, ejecutar, revisar consecuencias y respaldar la información, con puntos y herramientas de recuperación.

**Estado:** Fase de validación publicada en GitHub Pages. Los datos permanecen en este navegador y dispositivo, sin cuenta ni sincronización. No hay instaladores publicados en GitHub Releases.

## Tecnologías

| Área             | Tecnologías y responsabilidad                                      |
| ---------------- | ------------------------------------------------------------------ |
| **Interfaz**     | React 19 y TypeScript 6; compilación con Vite 8.                   |
| **Datos**        | IndexedDB local, respaldos JSON y navegación con rutas hash.       |
| **Verificación** | Vitest, Testing Library y comprobaciones de accesibilidad con axe. |

> **Enfoque técnico:** Arquitectura hexagonal: dominio, casos de uso y adaptadores del navegador.

## Usar o descargar

[Abrir la aplicación](https://nicocg32.github.io/HereToPlan/) · [Guía de uso y respaldos](docs/Guia-uso.md). La validación de uso sostenido sigue pendiente.

## Ejecutar desde el código

Con Node.js 24.18.0 y npm 11, desde la raíz de esta fase:

```sh
npm ci
npm run dev
```

Abre la dirección que indica Vite bajo `/HereToPlan/`. Para trasladar los datos a otro navegador, exporta y restaura un respaldo. [Build y publicación](docs/Despliegue.md).

## Documentación

[Índice completo y rutas de lectura](docs/README.md) · [Guía de uso](docs/Guia-uso.md).

| Tipo       | Lectura                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General    | [Problema, cliente y solución](docs/00-problematica-cliente-y-valor.md) · [Motivación](docs/16-motivacion-y-contexto.md)                                                         |
| Técnica    | [Arquitectura y diagramas](docs/01-arquitectura-general.md) · [Dominio y datos](docs/04-base-de-datos.md)                                                                        |
| Desarrollo | [Etapas y metodología](docs/17-desarrollo-y-metodologia.md) · [Proyección](docs/15-escalabilidad-y-nuevos-mercados.md) · [Costos CLP/USD](docs/18-analisis-economico-clp-usd.md) |

[Identidad visual](branding/README.md): logos, banners y variantes de aplicación.

## Licencia y créditos

Código y documentación propios: [PolyForm Noncommercial 1.0.0](LICENSE), con [atribución](NOTICE). Uso comercial fuera de sus permisos: acuerdo previo de créditos y compensación. [Alcance y contacto](LICENSING.md).
