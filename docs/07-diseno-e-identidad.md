# 07 · Diseño y accesibilidad

HereToPlan utiliza una identidad visual propia que puede verse en los [banners y logotipos](../branding/README.md). La interfaz debe comunicar **qué se está planificando, qué ya se comprometió y qué efecto tendrá una acción**. Esa claridad importa más que adornar las pantallas con métricas.

![Vista de marca clara de HereToPlan](../branding/banners/heretoplan-banner-claro.webp)

## Estructura de navegación

Las cuatro rutas visibles son Calendario, Crear, Puntos y Respaldo. Cada una reúne sus formularios, diálogos y ayudas contextuales. En pantallas estrechas, el calendario ofrece un resumen mensual y una lista accesible con las acciones disponibles.

## Criterios que se pueden comprobar

- **Estados legibles:** `BORRADOR`, `EN_GRACIA`, `CONFIRMADA` y resultados finales deben explicarse con texto, no solo color.
- **Prevención de errores:** restaurar, reiniciar, consumir recompensas y modificar compromisos deben mostrar consecuencias antes de confirmar.
- **Teclado y foco:** diálogos, errores y rutas deben ser utilizables con teclado; las pruebas de axe apoyan, pero no sustituyen pruebas reales con tecnologías de asistencia.
- **Responsive:** comprobar calendario, formularios y diálogos a varios anchos y con aumento de zoom.
- **Carga cognitiva:** puntos y recuperación no deben ocultar el recorrido fundamental de planificación.

## Qué queda por validar

Queda por comprobar el recorrido con lector de pantalla, zoom real y uso sostenido. La [validación de producto](Validacion-producto.md) recoge los escenarios y las observaciones necesarias para evaluar claridad y facilidad de uso.

[Guía visual](Estilo.md) · [Recursos originales](../branding/README.md)
