# HereToPlan

Planificador personal que separa actividades y compromisos del calendario. Permite planificar, ejecutar, revisar consecuencias y respaldar la información, con puntos y herramientas de recuperación.

**Estado:** Fase de validación publicada en GitHub Pages. Los datos permanecen en este navegador y dispositivo, sin cuenta ni sincronización. No hay instaladores publicados en GitHub Releases.

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

## Licencia y créditos

Código y documentación propios: [PolyForm Noncommercial 1.0.0](LICENSE), con [atribución](NOTICE). Uso comercial fuera de sus permisos: acuerdo previo de créditos y compensación. [Alcance y contacto](LICENSING.md).
