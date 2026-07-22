# HereToPlan

HereToPlan es una aplicación de planificación personal que busca combinar responsabilidad, flexibilidad y trazabilidad. En lugar de tratar las tareas como elementos que pueden eliminarse cuando dejan de ser convenientes, el proyecto representa el trabajo planificado mediante compromisos explícitos: cada compromiso confirmado debe completarse, cerrarse como incumplido o modificarse mediante una regla autorizada previamente.

El propósito del proyecto es ayudar a planificar estudio, entrenamiento, proyectos y hábitos de manera realista, sin convertir la organización personal en un sistema punitivo. Los puntos y las recompensas funcionan como mecanismos transparentes de flexibilidad, no como sustitutos de la planificación.

El proyecto apunta a publicarse como aplicación web estática mediante GitHub Pages, de modo que pueda probarse directamente desde el repositorio.

**Aplicación publicada:** [abrir HereToPlan en GitHub Pages](https://nicocg32.github.io/HereToPlan/).

## Estado del proyecto

HereToPlan está en construcción. El repositorio contiene la base del dominio, sus invariantes principales y las decisiones arquitectónicas que orientan el desarrollo del producto. Actualmente ofrece un calendario persistente con planificación libre o agrupada en agendas nombradas, actividades reutilizables y bloques editables por fecha.

La configuración de Vite utiliza la ruta base `/HereToPlan/`, correspondiente a
la subruta asignada al repositorio por GitHub Pages.

Esta base permite explorar, entre otras, las siguientes reglas:

- una agenda confirmada deja de ser libremente editable;
- un bloque de trabajo confirmado permanece en el historial;
- la flexibilidad de un compromiso se decide antes de conocer su resultado;
- los compromisos estrictos y flexibles reaccionan de manera distinta a una recompensa;
- los movimientos de puntos son trazables y no permiten un saldo negativo;
- adquirir un Día libre descuenta puntos y crea una unidad de inventario en una
  sola operación; aplicarla desde Calendario constituye un hecho posterior,
  independiente y atómico;
- cada actividad declara seguimiento manual o cronometrado; el cronómetro
  conserva sus sesiones entre recargas y nunca sustituye la declaración humana
  que completa o incumple un bloque;
- el sobretrabajo cronometrado puede convertirse, con tasa y topes explícitos,
  en minutos para reducir atómicamente carga flexible futura.

El repositorio crecerá mediante incrementos funcionales verificables. Las decisiones documentadas constituyen la base vigente del proyecto, aunque podrán revisarse cuando la evidencia de uso revele una alternativa mejor.

## Roadmap y seguimiento

El desarrollo se planifica y registra públicamente en el
[GitHub Project de HereToPlan](https://github.com/users/NicoCG32/projects/3).
El tablero organiza los hitos, las épicas y las tareas ejecutables, y conserva
su avance desde el backlog hasta su finalización. Las decisiones y resultados
de cada unidad de trabajo quedan vinculados mediante las
[issues del repositorio](https://github.com/NicoCG32/HereToPlan/issues).

## Tecnologías

- React
- TypeScript
- Vite
- Vitest

## Arquitectura

El proyecto adopta una arquitectura hexagonal: el dominio y los casos de uso forman el núcleo, mientras React y la infraestructura actúan como adaptadores. El código se organiza así:

```text
src/
├── app/              # raíz de composición
├── presentacion/     # adaptadores de entrada React
├── aplicacion/       # casos de uso y puertos
├── dominio/          # modelo e invariantes del negocio
└── infraestructura/  # adaptadores de salida
```

Los contratos vigentes se documentan en:

- [`docs/Dominio.md`](docs/Dominio.md)
- [`docs/Arquitectura.md`](docs/Arquitectura.md)
- [`docs/Estilo.md`](docs/Estilo.md)
- [`docs/Respaldo.md`](docs/Respaldo.md)
- [`docs/Auditoria-accesibilidad.md`](docs/Auditoria-accesibilidad.md)
- [`docs/Protocolo-uso-sostenido.md`](docs/Protocolo-uso-sostenido.md)

## Ejecución local

### Requisitos

- Node.js `24.18.0`, perteneciente a la línea LTS 24 (Krypton).
- npm `11`, incluido con la versión de Node indicada.

El archivo `.nvmrc` fija la versión exacta utilizada como línea base. Además,
`package.json` admite actualizaciones compatibles dentro de Node 24 y rechaza
otras versiones mayores para evitar diferencias inadvertidas entre desarrollo,
integración continua y despliegue.

Con nvm en macOS o Linux:

```bash
nvm install
nvm use
```

Con nvm-windows:

```powershell
nvm install 24.18.0
nvm use 24.18.0
```

Comprueba el entorno activo antes de instalar:

```bash
node --version
npm --version
```

`node --version` debe informar `v24.18.0`. Para restaurar exactamente las
dependencias registradas en `package-lock.json` y ejecutar el proyecto:

```bash
npm ci
npm run dev
```

La dirección local se mostrará en la terminal al iniciar Vite.

## Entrega continua

El workflow [`Calidad y despliegue`](.github/workflows/calidad-y-pages.yml)
verifica formato, análisis estático, pruebas, cobertura y build tanto en pull
requests como en cambios de `main`. Los cambios aceptados en `main` publican el
mismo artefacto verificado en GitHub Pages.

La aplicación utiliza navegación hash para conservar compatibilidad con el
alojamiento estático de GitHub Pages. Calendario, Crear, Puntos y Respaldo poseen
rutas propias sin depender de reescrituras del servidor.

## Verificación

```bash
npm test
npm run test:a11y
npm run test:coverage
npm run lint
npm run format:check
npm run build
npm run verify:pages
```

`npm test` comprueba las invariantes implementadas del dominio y
`npm run test:a11y` ejecuta axe sobre los estados principales de la interfaz.
`npm run test:coverage` verifica sus umbrales de cobertura. `npm run lint`
analiza TypeScript, React y la dirección de las dependencias arquitectónicas.
`npm run format:check` comprueba el formato sin modificar archivos; para
aplicarlo se utiliza `npm run format`. Finalmente, `npm run build` ejecuta la
comprobación de TypeScript y genera la aplicación de producción.
`npm run verify:pages` comprueba que el HTML apunte a recursos JavaScript y CSS
existentes bajo `/HereToPlan/`; debe ejecutarse después del build.
`npm run audit:css` comprueba la modularidad de la entrada global, la ausencia
de comentarios CSS y reporta posibles selectores huérfanos.

## Capacidades implementadas

El núcleo disponible incluye actividades, contextos de planificación, agendas,
bloques de trabajo, políticas de compromiso, una billetera de puntos y el
reward `Día libre`. El recorrido principal permite:

- comenzar directamente en `Libre` o crear una agenda nombrada opcional;
- crear, editar y administrar agendas y actividades mediante casos de uso;
- conservar actividades referenciadas para no romper bloques ni historia;
- guardar una actividad sin programarla o continuar al calendario con su
  identidad y fecha de destino explícitas;
- identificar el espacio mediante un perfil local mínimo, editable y respaldable;
- consultar en un HUD compartido el nombre, una frase estable por apertura y el
  saldo derivado de movimientos;
- asignar, editar y quitar bloques estrictos o flexibles en fechas concretas;
- consultar conjuntamente toda la planificación o filtrarla por agenda;
- navegar por día, semana y mes y revisar los siete días próximos;
- revisar una selección, confirmar sus instantáneas tras la gracia y declarar
  cada bloque como completado o incumplido;
- consultar el estado y el instante histórico de la resolución;
- acreditar al completar entre uno y cuatro puntos mediante una fórmula
  explícita, en la misma transacción que registra el cumplimiento;
- reconstruir y mostrar la billetera desde movimientos persistidos, distinguiendo
  ingresos, gastos y la fuente semántica de cada operación;
- adquirir un Día libre desde un catálogo, conservarlo disponible en inventario
  y consultar por separado las aplicaciones históricas;
- asignar actividades o aplicar unidades disponibles desde Calendario mediante
  controles accesibles o arrastre, siempre pasando por editor o vista previa;
- iniciar, pausar, reanudar y detener sesiones opcionales cuya duración se
  deriva de instantes persistidos, sin completar automáticamente el bloque;
- acreditar una sola vez el excedente de sesiones finalizadas y consumir el
  saldo del banco de recuperación sobre carga futura que lo permita;
- descargar un respaldo JSON versionado de todo el estado persistente y
  analizar su compatibilidad sin escribir, o restaurarlo con confirmación y
  reemplazo atómico de las quince colecciones y migración explícita desde V1 y
  V2;
- calcular el impacto de un reinicio de planificación antes de confirmarlo,
  retirar atómicamente el trabajo activo y conservar perfil, catálogos,
  economía e historia;
- recorrer con teclado la navegación, los editores y los diálogos, con foco
  explícito ante errores y retorno al control de origen al cancelar;
- comprender estados vacíos, recuperar lecturas fallidas y conocer el motivo
  de las acciones temporalmente o funcionalmente indisponibles;
- usar el calendario, la ventana de siete días y sus acciones sin
  desplazamiento horizontal en pantallas móviles, con una representación
  temporal equivalente en lista;
- recuperar contextos, actividades, bloques y sesiones de cronómetro desde
  IndexedDB después de recargar.

El catálogo persistente de actividades distingue tareas simples, tareas compuestas, proyectos y hábitos. Las actividades existen independientemente del calendario: solo aparecen en una fecha después de asignarlas mediante un bloque de trabajo.

El dominio distingue además los contextos organizativos de la planificación: `Libre` está siempre disponible y las agendas nombradas pueden representar períodos personalizados sin convertirse por sí mismas en compromisos confirmados.
Los contextos poseen persistencia propia en IndexedDB; al iniciar la aplicación
se garantiza de forma idempotente la existencia de `Libre`, que es administrado
por el sistema y no puede eliminarse.
La aplicación abre el calendario general en la selección `Todas`; desde allí se
puede crear opcionalmente una agenda nombrada con propósito y rango temporal, o
continuar planificando en `Libre` sin completar un formulario previo.
El calendario permite navegar por día, semana y mes, seleccionar fechas
concretas y consultar siempre hoy más los seis días siguientes. Desde una fecha
se puede crear o elegir una tarea simple, tarea compuesta, proyecto o hábito y
asignarle un bloque editable con minutos y política estricta o flexible. Las
actividades que todavía no poseen bloques permanecen visibles en `Sin
programar`.
Las agendas almacenadas con el contrato anterior proyectan sus metadatos a
contextos nombrados mediante una migración atómica e idempotente; sus bloques,
estados e historial permanecen intactos en el registro original.
Una agenda nombrada puede eliminarse desde un diálogo que informa previamente
su impacto. La opción recomendada traslada sus bloques editables a `Libre`; la
alternativa destructiva exige escribir el nombre exacto. Ninguna opción elimina
compromisos confirmados ni su historial.
