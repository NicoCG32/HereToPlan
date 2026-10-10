# HereToPlan

HereToPlan es una aplicación de planificación personal que combina compromisos
explícitos, flexibilidad y trazabilidad. Las actividades existen antes de
programarlas; un bloque confirmado se completa, se declara incumplido o recibe
un ajuste permitido por su política.

[Abrir la aplicación](https://nicocg32.github.io/HereToPlan/) ·
[Guía de uso](docs/Guia-uso.md) · [Documentación](docs/README.md) ·
[Tablero de trabajo](https://github.com/users/NicoCG32/projects/3)

## Estado

Este repositorio contiene la **fase de validación**, publicada como aplicación
estática en GitHub Pages. Ofrece una SPA con cuatro rutas, perfil local, HUD,
calendario persistente, ejecución manual o cronometrada, puntos, inventario,
recuperación, respaldo y tutorial opcional persistente.

La calidad técnica y la aceptación de la interfaz no sustituyen la evidencia
de uso sostenido. La bitácora conserva seis días sin registrar; la evaluación
de hipótesis y la decisión de salida de validación siguen pendientes. Las
plantillas de agenda, la administración de series abiertas y los ajustes de
reprogramación/extensión de plazo tampoco están implementados. El
[informe integral](docs/Auditoria-integral.md) distingue capacidades, pruebas y
pendientes.

## Recorrido disponible

- **Calendario:** planificar directamente en `Libre` o filtrar por una agenda
  nombrada opcional; crear y asignar tareas, proyectos y hábitos a fechas,
  revisar una selección, corregir durante la gracia de diez minutos y resolver
  sus compromisos confirmados. La asignación usa un diálogo que conserva el
  mes y la posición del contenido; el arrastre tiene alternativa por teclado.
- **Crear:** administrar definiciones de actividades y agendas sin programar
  trabajo automáticamente; guardar y agendar continúa con actividad y fecha
  explícitas. Los hábitos se materializan sobre un rango finito.
- **Puntos:** consultar saldo e historial, adquirir Día libre y conservarlo en
  inventario. Su aplicación posterior desde Calendario exige vista previa y
  confirmación. La recuperación de minutos es una economía separada.
- **Respaldo:** exportar JSON V3, analizar sin escribir, restaurar con reemplazo
  atómico o reiniciar planificación conservando perfil, catálogos, economías e
  historia.
- **Guía:** ocho pasos opcionales cuyo progreso se recupera al recargar.
  Posponer conserva el paso; cerrar sólo oculta la tarjeta durante la visita.
  «Reiniciar guía» afecta exclusivamente al tutorial.

Los datos funcionales se guardan en IndexedDB; sólo la preferencia de la guía
usa localStorage. Permanecen en el navegador, perfil y origen utilizados, sin
cuentas ni sincronización remota. Cambiar de navegador o dominio requiere
exportar y restaurar un respaldo para trasladar la planificación. La guía no se
incluye en ese archivo. Consulta [privacidad y portabilidad](docs/Guia-uso.md).

## Ejecución local

La línea base está fijada en `.nvmrc`: **Node.js 24.18.0 y npm 11**.
`package.json` admite actualizaciones compatibles de Node 24; la CI usa el pin.

Con nvm en macOS/Linux:

```bash
nvm install
nvm use
```

Con nvm-windows, desde PowerShell:

```powershell
nvm install 24.18.0
nvm use 24.18.0
```

Después, desde la raíz del repositorio:

```bash
node --version
npm --version
npm ci
npm run dev
```

`node --version` debe mostrar `v24.18.0`. Vite indica la dirección local; la
aplicación se sirve bajo `/HereToPlan/`.

## Arquitectura

El núcleo sigue una arquitectura hexagonal con puertos y adaptadores:

```text
src/
├── app/              # composición y rutas
├── presentacion/     # adaptador de entrada React
├── aplicacion/       # casos de uso y puertos
├── dominio/          # entidades e invariantes
└── infraestructura/  # persistencia y adaptadores del navegador
```

React consume contratos de aplicación; los repositorios y las unidades de
trabajo concentran almacenamiento y atomicidad. Los
[diagramas](docs/Diagramas.md) y el [contrato](docs/Arquitectura.md) muestran
las fronteras, incluidas IndexedDB v13 y la preferencia del tutorial.

## Verificación y entrega

```bash
npm run format:check
npm run lint
npm run verify:docs
npm run audit:css
npm run test:a11y
npm test
npm run test:coverage
npm run build
npm run verify:pages
```

La suite comprueba dominio, aplicación, adaptadores y flujos React. La
cobertura exige al menos 85 % de líneas/sentencias y funciones, y 80 % de ramas
en el alcance definido en `vitest.config.ts`. Axe complementa la revisión
manual; sus límites están en la [auditoría de accesibilidad](docs/Auditoria-accesibilidad.md).

El [workflow](.github/workflows/calidad-y-pages.yml) restaura el lockfile y
verifica la entrega. Los cambios aceptados en `main` publican el artefacto
comprobado en Pages. Las rutas hash permiten navegación directa sin
reescrituras del servidor. [Configuración y recuperación](docs/Despliegue.md).

El [GitHub Project](https://github.com/users/NicoCG32/projects/3) organiza épicas
y tareas por alcance, con Backlog → Ready → In progress → In review → Done,
sin imponer fechas de sprint. Las [issues](https://github.com/NicoCG32/HereToPlan/issues)
y las PR conservan criterios, cambios y evidencia de cada incremento.
