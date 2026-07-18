# HereToPlan

HereToPlan es una aplicación de planificación personal que busca combinar responsabilidad, flexibilidad y trazabilidad. En lugar de tratar las tareas como elementos que pueden eliminarse cuando dejan de ser convenientes, el proyecto representa el trabajo planificado mediante compromisos explícitos: cada compromiso confirmado debe completarse, cerrarse como incumplido o modificarse mediante una regla autorizada previamente.

El propósito del proyecto es ayudar a planificar estudio, entrenamiento, proyectos y hábitos de manera realista, sin convertir la organización personal en un sistema punitivo. Los puntos y las recompensas funcionan como mecanismos transparentes de flexibilidad, no como sustitutos de la planificación.

El proyecto apunta a publicarse como aplicación web estática mediante GitHub Pages, de modo que pueda probarse directamente desde el repositorio.

**Aplicación publicada:** [abrir HereToPlan en GitHub Pages](https://nicocg32.github.io/HereToPlan/).

## Estado del proyecto

HereToPlan está en construcción. El repositorio contiene la base del dominio, sus invariantes principales y las decisiones arquitectónicas que orientan el desarrollo del producto. Actualmente permite crear una agenda borrador, organizar sus bloques y recuperarla desde el almacenamiento local después de recargar la aplicación.

La configuración de Vite utiliza la ruta base `/HereToPlan/`, correspondiente a
la subruta asignada al repositorio por GitHub Pages.

Esta base permite explorar, entre otras, las siguientes reglas:

- una agenda confirmada deja de ser libremente editable;
- un bloque de trabajo confirmado permanece en el historial;
- la flexibilidad de un compromiso se decide antes de conocer su resultado;
- los compromisos estrictos y flexibles reaccionan de manera distinta a una recompensa;
- los movimientos de puntos son trazables y no permiten un saldo negativo;
- el canje de un día libre se prepara sin producir mutaciones parciales.

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

Actualmente la aplicación no incorpora un router del lado del cliente. Su única
ruta navegable es la raíz `/HereToPlan/`; cualquier ruta adicional deberá usar
una estrategia compatible con GitHub Pages antes de considerarse soportada.

## Verificación

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run build
npm run verify:pages
```

`npm test` comprueba las invariantes implementadas del dominio y
`npm run test:coverage` verifica sus umbrales de cobertura. `npm run lint`
analiza TypeScript, React y la dirección de las dependencias arquitectónicas.
`npm run format:check` comprueba el formato sin modificar archivos; para
aplicarlo se utiliza `npm run format`. Finalmente, `npm run build` ejecuta la
comprobación de TypeScript y genera la aplicación de producción.
`npm run verify:pages` comprueba que el HTML apunte a recursos JavaScript y CSS
existentes bajo `/HereToPlan/`; debe ejecutarse después del build.

## Capacidades implementadas

El núcleo disponible incluye actividades, agendas, bloques de trabajo, políticas de compromiso, una billetera de puntos y la preparación del reward `Día libre`. El primer recorrido funcional permite:

- crear una agenda borrador con nombre y rango de fechas;
- agregar, modificar y quitar bloques de trabajo;
- definir duración, rigidez y autoridad del plazo;
- guardar el borrador mediante IndexedDB;
- recuperar la agenda y sus bloques después de recargar.

El catálogo persistente de actividades distingue tareas simples, tareas compuestas, proyectos y hábitos. Las actividades existen independientemente del calendario: solo aparecen en una fecha después de asignarlas mediante un bloque de trabajo.
