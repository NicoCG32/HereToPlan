# 07 — Diseño y accesibilidad

## Identidad y experiencia de uso

Calendario y formularios con rutas explícitas, foco y teclado; versión móvil puede usar lista equivalente. El diseño debe comunicar impacto y motivo de las acciones indisponibles sin inducir compromisos accidentales.

### Criterios verificables

- Estados vacíos, carga, confirmación y error distinguibles por texto además de color.
- Orden de foco, teclado y nombres accesibles cuando la plataforma los utilice.
- Legibilidad y controles suficientes para el dispositivo objetivo; considerar área segura y ciclo de vida en móvil.
- Evitar que animación, espera o respuesta tardía apliquen efectos ajenos a la selección vigente.

Comprueba estos criterios en los recorridos principales y en los tamaños de pantalla de la plataforma que vas a utilizar.

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).

## Recursos de identidad y distribución

[Catálogo de originales y variantes](../branding/README.md) · [Manifest de identidad](../branding/manifest.json).

La navegación utiliza el nuevo SVG horizontal sin cambiar su ruta de importación. Favicon, Apple Touch y tarjeta de enlace respetan el prefijo /HereToPlan/ de la aplicación estática.

Los banners de presentación se seleccionan por tema en el README. Las aplicaciones incorporan sólo los recursos necesarios, con dimensiones/proporción estables; las variantes y originales permanecen en branding. La identidad visual no amplía funcionalidades ni cambia las condiciones de uso.
