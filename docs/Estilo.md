# Estilo y composición de la interfaz

## 1. Propósito

Este documento define el contrato visual y compositivo de HereToPlan. La
interfaz debe evolucionar hacia una SPA con navegación permanente sin perder
las capacidades existentes, su semántica ni sus garantías de accesibilidad.

La estética no sustituye la arquitectura: React representa DTO y ejecuta
puertos de entrada; no calcula reglas de planificación, puntos, recompensas o
persistencia.

## 2. Lenguaje visual

La identidad usa una base clara de cuarzo y plata. Los acentos tienen una
función estable:

| Familia          | Significado principal                   |
| ---------------- | --------------------------------------- |
| Diamante celeste | precisión, selección y foco             |
| Oro              | valor, puntos y recompensas             |
| Bronce           | advertencia, consecuencia y destrucción |
| Verde planta     | progreso, creación y confirmación       |

Los paneles estructurales son rectos, técnicos y legibles. Los gradientes y
reflejos aportan profundidad controlada; el doble reflejo se reserva al fondo
global. Ninguna decisión depende exclusivamente del color.

## 3. Arquitectura CSS

`src/presentacion/estilos.css` es el punto de entrada transitorio de los estilos.
Importa `src/presentacion/estilos/fundamentos.css`, módulo que concentra:

- propiedades animables y tokens;
- normalización y tipografía base;
- fondo global;
- foco compartido;
- utilidades cromáticas transversales.

La extracción posterior debe producir módulos independientes para:

1. armazón, navegación y HUD;
2. páginas Calendario, Crear, Puntos y Respaldo;
3. capacidades reutilizables, como formularios, diálogos, calendario y
   economías.

Cada módulo conserva junto a su responsabilidad los puntos de quiebre que la
modifican. No se creará una segunda hoja global monolítica ni se usarán
comentarios extensos como sustituto de esta documentación.

## 4. Composición objetivo

El armazón tendrá una navegación lateral y un HUD persistentes, seguidos por un
único `main` que representa la ruta activa. Las rutas públicas serán:

- `#/calendario`;
- `#/crear`;
- `#/puntos`;
- `#/respaldo`.

La separación por páginas reorganiza capacidades existentes; no autoriza a
duplicar estados, consultas o reglas.

### 4.1. Calendario

Es la página inicial y el espacio de trabajo diario. Reúne el selector de
contexto, la navegación Día/Semana/Mes, el calendario principal, el editor del
día seleccionado, los próximos siete días, las actividades asignables, las
recompensas disponibles y la lista accesible equivalente.

En escritorio, calendario y editor forman la primera fila de contenido;
próximos días y elementos asignables forman la segunda. La lista equivalente
ocupa el ancho completo. En móvil, el mismo orden semántico se representa en
una columna.

### 4.2. Crear

Concentra los formularios y catálogos de agendas y actividades. En escritorio,
agenda y actividad forman dos columnas paralelas; en móvil, una secuencia
vertical. La creación y la edición reutilizan los mismos contratos de
validación.

### 4.3. Puntos

Concentra la billetera y su historial, el catálogo e inventario de recompensas,
y el banco de recuperación. La definición, adquisición y aplicación de una
recompensa son estados distintos y deben representarse como tales.

### 4.4. Respaldo

Aísla exportación, análisis, restauración y reinicio de planificación del flujo
cotidiano. Las operaciones destructivas usan bronce, confirmación explícita y
una explicación previa del impacto.

## 5. Adaptación y accesibilidad

En escritorio, la navegación lateral permanece visible sin cubrir el contenido.
En móvil se reemplaza por un panel controlado mediante botón, con cierre por
ruta, cobertura y `Escape`, retorno de foco y bloqueo temporal del scroll.

El contrato transversal conserva:

- un único `main` y el enlace «Saltar al contenido principal»;
- foco visible de al menos 3 px;
- orden del DOM equivalente al recorrido visual;
- alternativa por teclado para cualquier arrastre;
- áreas táctiles mínimas de `2.75rem`;
- reflujo sin desplazamiento horizontal esencial;
- adaptación a `prefers-reduced-motion`;
- estados de carga, vacío, error y resultado comprensibles.

## 6. Protocolo de cambio

La modularización se ejecuta de forma incremental. Antes y después de mover una
regla se validan las mismas rutas, recorridos y tamaños representativos. Un
cambio de ubicación que altere especificidad, orden de cascada o resultado
perceptible debe tratarse como un cambio visual independiente.

Las verificaciones mínimas son `npm run format`, `npm run lint`,
`npm run test:a11y`, `npm test` y `npm run build`. Los gradientes, reflejos y
posiciones se revisan visualmente en navegador real; no se convierten en pruebas
frágiles de píxeles.
