# HereToPlan

HereToPlan es una aplicación de planificación personal que busca combinar responsabilidad, flexibilidad y trazabilidad. En lugar de tratar las tareas como elementos que pueden eliminarse cuando dejan de ser convenientes, el proyecto representa el trabajo planificado mediante compromisos explícitos: cada compromiso confirmado debe completarse, cerrarse como incumplido o modificarse mediante una regla autorizada previamente.

El propósito del proyecto es ayudar a planificar estudio, entrenamiento, proyectos y hábitos de manera realista, sin convertir la organización personal en un sistema punitivo. Los puntos y las recompensas funcionan como mecanismos transparentes de flexibilidad, no como sustitutos de la planificación.

El proyecto apunta a publicarse como aplicación web estática mediante GitHub Pages, de modo que pueda probarse directamente desde el repositorio.

## Estado del proyecto

HereToPlan está en construcción. El repositorio contiene la base del dominio, sus invariantes principales y las decisiones arquitectónicas que orientan el desarrollo del producto. La interfaz funcional, la persistencia y varios casos de uso todavía están pendientes de implementación.

La configuración de Vite utiliza una base relativa para facilitar su publicación futura mediante GitHub Pages.

Esta base permite explorar, entre otras, las siguientes reglas:

- una agenda confirmada deja de ser libremente editable;
- un bloque de trabajo confirmado permanece en el historial;
- la flexibilidad de un compromiso se decide antes de conocer su resultado;
- los compromisos estrictos y flexibles reaccionan de manera distinta a una recompensa;
- los movimientos de puntos son trazables y no permiten un saldo negativo;
- el canje de un día libre se prepara sin producir mutaciones parciales.

El repositorio crecerá mediante incrementos funcionales verificables. Las decisiones documentadas constituyen la base vigente del proyecto, aunque podrán revisarse cuando la evidencia de uso revele una alternativa mejor.

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

Se requiere Node.js y npm.

```bash
npm install
npm run dev
```

La dirección local se mostrará en la terminal al iniciar Vite.

## Verificación

```bash
npm test
npm run build
```

`npm test` comprueba las invariantes implementadas del dominio. `npm run build` ejecuta la comprobación de TypeScript y genera la aplicación de producción.

## Capacidades implementadas

El núcleo disponible incluye actividades, agendas, bloques de trabajo, políticas de compromiso, una billetera de puntos y la preparación del reward `Día libre`.