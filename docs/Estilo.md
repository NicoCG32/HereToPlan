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

`src/presentacion/estilos.css` es un agregador de ocho importaciones y no
contiene reglas. `src/presentacion/estilos/fundamentos.css` concentra:

- propiedades animables y tokens;
- normalización y tipografía base;
- fondo global;
- foco compartido;
- utilidades cromáticas transversales.

Las responsabilidades se distribuyen en módulos independientes:

1. `armazon/ArmazonAplicacion.css` contiene únicamente estructura y navegación;
2. `sesion/HudAplicacion.css` y `sesion/DialogoPerfilUsuario.css` acompañan sus
   componentes;
3. `paginas/` contiene encabezado y composición propia de Calendario, Crear,
   Puntos y Respaldo;
4. `estilos/` separa componentes compartidos, agendas, calendario, economías,
   recompensas y respaldo.

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

En escritorio, el calendario ocupa la columna principal izquierda y el banco de
actividades asignables una columna auxiliar derecha que permanece disponible
mientras se recorre el mes. Cada ficha muestra su indicador de arrastre, nombre,
tipo y una acción equivalente por teclado. Asignar o editar abre un diálogo
con actividad, fecha y agenda, sin cambiar el mes visible. El diálogo contiene
el detalle consultado del día elegido, incluso fuera del rango mensual.

En móvil, calendario y banco se apilan sin cambiar su orden semántico; la vista
mensual resume los días en cuatro columnas, con su día de semana explícito y
cantidad de bloques. Los detalles se consultan desde el diálogo del día y la
lista equivalente conserva las acciones del rango visible. Los próximos siete
días muestran fecha y minutos, sin repetir cada bloque. El banco deja de ser
fijo y no introduce desplazamiento horizontal global.

El diálogo bloquea temporalmente el fondo y conserva la posición de la página;
su propio contenido puede desplazarse. `Escape` cancela y devuelve el foco al
origen. Al guardar, el foco vuelve al control visible después de actualizar los
datos; si desapareció o quedó fuera de pantalla, pasa al aviso de resultado.
La creación de una actividad desde Calendario usa el mismo patrón. La revisión
posterior distingue «Asignar un bloque», «Revisar» y «Confirmar revisión», con
explicación del período de gracia previo a la confirmación definitiva.

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

### 4.5. Guía opcional

Una tarjeta junto al contenido ofrece iniciar, posponer u omitir el recorrido.
Mientras está activa, presenta un paso y permite localizar su control, avanzar,
posponer o cerrar. No cubre ni bloquea las páginas; al cambiar de ruta conserva
el paso y ofrece ir a su destino mediante una acción explícita.

El acceso muestra si el avance se conserva en el navegador o sólo durante la
sesión. «Reiniciar guía» permanece visible cuando hay progreso, omisión, término
o una recuperación pendiente. Un registro ilegible ofrece reintentar lectura,
usar la guía sin guardar o cerrar el aviso; el reinicio afecta sólo a la guía.
Consultar una guía omitida o completada muestra ese estado. Un guardado fallido
explica qué avance es temporal y permite reintentar sin bloquear las páginas.

El destino se resalta sin animaciones. Localizarlo mueve el foco por petición del
usuario. Al abrir un diálogo, la tarjeta conserva su espacio, queda fuera del
recorrido accesible y el diálogo incorpora la indicación pertinente. En móvil
las acciones se distribuyen en dos columnas con una altura mínima de 44 px.

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

Las verificaciones mínimas son `npm run audit:css`, `npm run format`,
`npm run lint`, `npm run test:a11y`, `npm test` y `npm run build`.
`audit:css` exige que el agregador sólo importe módulos y que no existan
comentarios CSS; además informa reglas, consultas responsivas y posibles clases
huérfanas. Los gradientes, reflejos y posiciones se revisan visualmente en
navegador real; no se convierten en pruebas frágiles de píxeles.
