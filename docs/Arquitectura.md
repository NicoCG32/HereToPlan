# Contrato de arquitectura de HereToPlan

## 1. Decisión arquitectónica

HereToPlan adopta una **arquitectura hexagonal**, también denominada arquitectura de puertos y adaptadores. El código se distribuye en directorios que pueden parecer capas, pero su propiedad esencial no es el orden vertical de esas carpetas: es la protección del núcleo y la dirección de las dependencias.

El dominio y los casos de uso constituyen el interior de la aplicación. React, el navegador, la persistencia y cualquier integración futura son mecanismos externos conectados mediante adaptadores. El núcleo no conoce esos mecanismos ni depende de ellos.

La formulación precisa para este proyecto es:

> Arquitectura hexagonal con separación interna entre aplicación y dominio, y con composición explícita de adaptadores.

No se utilizará «arquitectura en capas» como denominación principal. Presentación, aplicación, dominio e infraestructura describen responsabilidades organizativas, pero los contratos entre ellas siguen el modelo de puertos y adaptadores.

## 2. Vistas arquitectónicas

### 2.1. Componentes: puertos y adaptadores

La vista `Componentes` representa el hexágono lógico, los puertos y los adaptadores definidos para HereToPlan.

![Diagrama de componentes de HereToPlan](arquitectura-componentes.svg)

### 2.2. Despliegue: GitHub Actions y GitHub Pages

La vista `Despliegue` muestra cómo el código pasa del repositorio al sitio público y dónde se ejecuta la aplicación. El almacenamiento personal permanece en el navegador y no forma parte de los artefactos publicados.

![Diagrama de despliegue de HereToPlan](arquitectura-despliegue.svg)

#### Contrato de entrega continua

El workflow de GitHub Actions separa dos responsabilidades:

1. `calidad` restaura el lockfile, comprueba formato y arquitectura, ejecuta las
   pruebas con cobertura, construye `dist/` y valida sus referencias estáticas;
2. `desplegar` solo se ejecuta para cambios aceptados en `main`, depende del job
   de calidad y publica exactamente el artefacto producido por este.

El workflow posee permiso de lectura del contenido por defecto. Únicamente el
job de despliegue obtiene `pages: write` e `id-token: write`, necesarios para la
publicación mediante GitHub Pages.

Vite construye con `base: "/HereToPlan/"` porque el sitio pertenece a un
repositorio de proyecto y no al dominio raíz de la cuenta. Mientras no exista
un router del lado del cliente, la única ruta soportada es `/HereToPlan/`. Una
futura navegación deberá usar rutas hash o incorporar una estrategia explícita
de fallback antes de añadir rutas navegables.

## 3. Conceptos fundamentales

### Núcleo

El núcleo contiene decisiones propias de HereToPlan y se divide en dos zonas:

- **Dominio:** entidades, objetos de valor, agregados, servicios de dominio e invariantes.
- **Aplicación:** casos de uso, coordinación transaccional y definición de los puertos necesarios para interactuar con el exterior.

La aplicación puede depender del dominio. El dominio no depende de la aplicación.

### Puerto

Un puerto es un contrato definido desde la perspectiva del núcleo. Describe una capacidad sin imponer el mecanismo que la ejecuta.

Existen dos clases:

- **Puertos de entrada:** operaciones que la aplicación ofrece a actores externos; normalmente se materializan como casos de uso o interfaces de comandos y consultas.
- **Puertos de salida:** capacidades que los casos de uso necesitan del entorno, como repositorios, reloj, generación de identificadores, unidad de trabajo o almacenamiento de respaldos.

Un puerto no contiene lógica de interfaz gráfica ni detalles de persistencia.

### Adaptador

Un adaptador traduce entre una tecnología externa y un puerto del núcleo:

- React es un **adaptador de entrada**: convierte interacciones del usuario en llamadas a casos de uso y transforma resultados en vistas.
- La persistencia local es un **adaptador de salida**: implementa contratos solicitados por aplicación y traduce agregados a datos almacenables.

### Composición

`app/` es la raíz de composición. Crea adaptadores concretos, construye casos de uso y entrega los puertos de entrada preparados a la presentación. Es el único lugar que puede conocer simultáneamente implementaciones del núcleo y de infraestructura.

La composición no debe contener reglas del negocio.

## 4. Mapa del código

```text
src/
├── app/              # raíz de composición
├── presentacion/     # adaptadores de entrada React
├── aplicacion/       # casos de uso y puertos
├── dominio/          # modelo e invariantes del negocio
└── infraestructura/  # adaptadores de salida
```

Esta estructura física sirve a la arquitectura hexagonal; no establece una cadena descendente del tipo presentación → negocio → base de datos.

| Directorio         | Papel hexagonal        | Puede depender de                            |
| ------------------ | ---------------------- | -------------------------------------------- |
| `dominio/`         | Núcleo de dominio      | Código compartido del propio dominio         |
| `aplicacion/`      | Casos de uso y puertos | Dominio                                      |
| `presentacion/`    | Adaptador de entrada   | Puertos de entrada y DTO de aplicación       |
| `infraestructura/` | Adaptadores de salida  | Puertos de salida y tipos mínimos necesarios |
| `app/`             | Composición            | Todas las zonas para ensamblarlas            |

## 5. Regla de dependencias

Las dependencias de código fuente apuntan hacia el núcleo:

```text
Usuario
   ↓
Adaptador de entrada (React)
   ↓
Puerto de entrada / caso de uso
   ↓
Aplicación → Dominio
   ↑
Puerto de salida
   ↑
Adaptador de salida (infraestructura)
```

Reglas obligatorias:

1. `dominio/` no importa React, Vite, APIs del navegador, persistencia, aplicación ni infraestructura.
2. `aplicacion/` no importa componentes React ni adaptadores concretos.
3. Los puertos de salida se definen en el núcleo, no en infraestructura.
4. `presentacion/` invoca puertos de entrada; no accede directamente a repositorios o almacenamiento.
5. `infraestructura/` implementa puertos de salida; no dirige el flujo del negocio.
6. `presentacion/` e `infraestructura/` no se importan entre sí.
7. `app/` ensambla dependencias, pero no decide políticas del dominio.
8. Una librería externa solo puede entrar al dominio cuando representa una necesidad intrínseca, no una comodidad técnica; por defecto debe permanecer fuera.

## 6. Contratos arquitectónicos

Los puertos se incorporarán cuando un caso de uso real los necesite. El diseño establece los siguientes contratos:

### Puertos de entrada

- crear o modificar un contexto de planificación nombrado;
- asignar actividades a bloques dentro de `Libre` o de un contexto nombrado;
- preparar y confirmar un corte de planificación;
- completar o incumplir un bloque;
- consultar agenda e historial;
- preparar y confirmar un canje de recompensa.

### Puertos de salida

- repositorio de actividades;
- repositorio de agendas;
- repositorio de contextos de planificación;
- repositorio de billetera y transacciones;
- repositorio de canjes;
- unidad de trabajo para confirmación atómica;
- reloj;
- generador de identificadores;
- mecanismo de respaldo y restauración.

Esta lista no autoriza a implementar contratos anticipadamente. Un puerto existe para servir a un caso de uso, no para completar una plantilla arquitectónica.

### 6.1. Primer contrato de entrada

`CrearAgendaBorrador` recibe un comando formado por valores primitivos y devuelve
un resultado discriminado. El resultado exitoso contiene una representación de
lectura inmutable; nunca entrega la entidad `Agenda` a presentación. Los rechazos
esperados se expresan mediante códigos estables y pueden señalar el campo de
entrada correspondiente.

El comando no recibe identificadores ni instantes. Estas dos decisiones pertenecen
al caso de uso y se obtienen mediante los puertos `GeneradorIdentificadores` y
`Reloj`, lo que permite controlar ambos valores durante las pruebas.

### 6.2. Semántica de `RepositorioAgendas`

El puerto contiene únicamente las operaciones requeridas por el primer caso de
uso:

| Operación          | Semántica contractual                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guardar(agenda)`  | Registra una agenda nueva. Si el identificador ya existe, rechaza con `ErrorAgendaDuplicada` y conserva intacta la agenda anterior.                 |
| `obtenerPorId(id)` | Recupera la agenda asociada o devuelve `undefined` cuando no existe. No garantiza identidad de referencia entre el objeto guardado y el recuperado. |

La suite `verificarContratoRepositorioAgendas` expresa estas reglas una sola vez.
Los adaptadores en memoria e IndexedDB ejecutan la misma suite. Los fallos
técnicos se propagan como errores; la ausencia de una agenda no se considera un
fallo.

### 6.3. Registro persistido `AgendaV1`

La persistencia utiliza una representación distinta del agregado. `AgendaV1` es
un registro plano, serializable y con `versionEsquema: 1`; no contiene instancias
de clases del dominio.

- Las fechas civiles se almacenan como `YYYY-MM-DD` y nunca se convierten en
  instantes.
- Los eventos históricos se almacenan como cadenas ISO UTC normalizadas.
- Los bloques conservan actividad, duración, política, estado y resolución.
- Los ajustes conservan su canje de origen y el instante de aplicación.
- Confirmación y finalización son opcionales según el estado de la agenda.

`convertirAgendaEnV1` produce el registro sin exponer referencias mutables del
agregado. `rehidratarAgendaDesdeV1` convierte los valores y utiliza las fábricas
de rehidratación del dominio. No reproduce operaciones históricas como
`confirmar`, `completarBloque` o `aplicarAjustes`.

La rehidratación valida nuevamente la coherencia interna: estados y timestamps,
rangos de bloques, duplicados y la correspondencia entre cada bloque excusado y
su ajuste. Una versión desconocida o un registro incoherente se rechaza sin
producir una agenda parcial.

#### Evolución desde `AgendaV1`

`AgendaV1` refleja la frontera inicial, en la que una agenda reúne contexto,
bloques y ciclo de confirmación. La evolución no reinterpreta ese registro ni le
añade campos con otra semántica: incorpora `ContextoPlanificacionV1` como un
contrato persistido independiente.

La migración implementada es incremental. En una transacción sobre `agendas` y
`contextos-planificacion`, valida primero todos los registros y luego:

1. crea una única instancia de `Libre`, administrada por el sistema;
2. proyecta cada `AgendaV1` válida como máximo una vez a un contexto nombrado
   con el mismo identificador, nombre, rango e instante de creación;
3. conserva íntegro cada `AgendaV1`, incluidos bloques, política, estado,
   confirmación, finalización y ajustes;
4. omite un contexto equivalente ya existente y rechaza un identificador cuyos
   metadatos sean divergentes;
5. aborta sin escrituras parciales cuando cualquier agenda, contexto o conflicto
   incumple el contrato vigente.

Por tanto, `ContextoPlanificacionV1` es la fuente de verdad para los metadatos
organizativos migrados, mientras `AgendaV1` continúa siendo la fuente de verdad
para bloques y el ciclo histórico. Esta convivencia es temporal pero explícita:
ningún dato se sincroniza en ambas direcciones ni se reconstruyen operaciones
de dominio a partir del historial.

La separación posterior de planificación editable y corte confirmable queda
fuera de esta migración. Deberá conservar identificadores, políticas, estados e
instantes mediante nuevos registros versionados y otra transacción explícita.
Día, semana y mes tampoco se persistirán como horizontes: son proyecciones del
mismo calendario.

### 6.4. Adaptador IndexedDB

`RepositorioAgendasIndexedDB` implementa el puerto de aplicación sin exponer
tipos de IndexedDB fuera de infraestructura. El adaptador convierte el agregado
en `AgendaV1` antes de escribir y lo rehidrata únicamente después de leer el
registro completo.

Cada escritura usa `IDBObjectStore.add` dentro de una transacción `readwrite`.
Así, dos escrituras concurrentes con el mismo identificador no pueden superar
ambas una comprobación previa: IndexedDB acepta una y aborta la otra con la
semántica contractual de `ErrorAgendaDuplicada`. No se reemplaza el registro
ganador.

La fábrica `IDBFactory` es una dependencia configurable del adaptador. En el
navegador se usa la implementación nativa; las pruebas inyectan una
implementación aislada y ejecutan el mismo código de producción. Crear una nueva
instancia del repositorio sobre la misma base simula la recarga y demuestra que
el estado no depende de referencias conservadas en memoria.

### 6.5. Catálogo persistente de actividades

`RepositorioActividades` define `guardar`, `obtenerPorId` y `listar`. Sus
adaptadores en memoria e IndexedDB cumplen una misma suite contractual: ausencia
como `undefined`, rechazo de identificadores duplicados y conservación del
registro original.

`ActividadV1` es un contrato discriminado. Las tareas persisten estimación,
fecha límite, composición, estado y resolución; los hábitos persisten duración,
frecuencia y días ISO. Ambos conservan metadatos comunes y una política
predeterminada opcional. No contienen fecha de ejecución, agenda ni bloque; esta
ausencia expresa la separación del dominio, no una limitación del adaptador. Los
casos de uso convierten las entidades a `ActividadDto`, por lo que presentación
no recibe agregados ni registros de infraestructura.

Cada política efectiva incluida en un bloque se escribe con
`versionEsquema: 1`. El lector admite registros históricos de `AgendaV1` que no
declaraban esa versión y los normaliza como versión 1; una versión futura
desconocida se rechaza sin rehidratar parcialmente la agenda.

La base IndexedDB utiliza la versión 2 para añadir el almacén `actividades`. La
actualización crea el nuevo almacén sin reemplazar `agendas`; una prueba de
migración abre una base versión 1, incorpora el catálogo y comprueba que la
agenda anterior continúa siendo rehidratable.

### 6.6. Contextos de planificación persistentes

`RepositorioContextosPlanificacion` expresa el contrato de almacenamiento del
agregado `ContextoPlanificacion`: guardar sin reemplazar duplicados, recuperar,
listar y eliminar únicamente contextos nombrados. La prohibición de eliminar
`Libre` pertenece al dominio y ambos adaptadores —memoria e IndexedDB— propagan
la misma semántica asíncrona.

`ContextoPlanificacionV1` es un registro plano y versionado. Conserva identidad,
nombre, tipo, rango civil opcional e instante de creación; deliberadamente no
contiene bloques, estados de confirmación ni una vista temporal. Día, semana y
mes siguen siendo proyecciones del calendario y no clases de contexto.

La versión 3 de la base añade el almacén `contextos-planificacion`. La
actualización de esquema solo crea el almacén ausente: no transforma ni elimina
los registros de `agendas` o `actividades`. La prueba de actualización parte de
una base versión 2 y comprueba explícitamente la conservación de ambos
almacenes.

`InicializarContextosPlanificacion` garantiza una sola instancia de `Libre` de
forma idempotente. La raíz de composición ejecuta este caso de uso antes de
montar React, por lo que la interfaz nunca comienza sobre una base inicializada
sin su contexto obligatorio. Una colisión concurrente se resuelve recuperando
el registro ganador, sin reemplazarlo ni alterar su instante de creación.

Antes de esa comprobación, `MigradorContextosDesdeAgendasIndexedDB` valida y
proyecta los metadatos legados. El migrador también prepara `Libre` dentro de la
misma transacción para que una agenda incompatible no deje una migración
parcial; la inicialización posterior funciona como garantía idempotente para
bases nuevas o ya migradas. Repetir el arranque no duplica registros ni cambia
el instante original de `Libre`.

<<<<<<< Updated upstream
=======
### 6.7. Modelo de lectura del calendario

`ConsultarCalendario` compone los puertos de contextos, actividades, agendas
legadas y bloques editables sin modificar sus agregados. Su resultado es un
`CalendarioDto` inmutable que contiene proyecciones coordinadas:

1. la selección global `Todas`, `Libre` o un contexto nombrado;
2. el rango visible derivado de una fecha ancla y la vista día, semana o mes;
3. los bloques visibles, cada uno con la identidad y el nombre de su contexto de
   origen;
4. exactamente hoy y los seis días civiles siguientes;
5. una lista con los mismos bloques que la proyección visual, destinada a móvil
   y accesibilidad;
6. el catálogo asignable y la proyección `Sin programar`, calculada por ausencia
   de bloques explícitos.

Las vistas temporales no son agregados ni tipos de contexto. Son funciones de
proyección sobre los mismos bloques; cambiar de vista o filtro no escribe ni
duplica información. El resumen de la selección se calcula sobre todos sus
bloques, aunque algunos queden fuera del rango visible.

El puerto `CalendarioLocal` proporciona la fecha civil vigente. Así, aplicación
puede construir los siete días próximos de forma determinista, mientras el
adaptador del entorno conserva la responsabilidad de interpretar el instante y
la zona horaria de la persona usuaria. Las pruebas sustituyen ese puerto por una
fecha controlada y no dependen de la zona horaria del proceso de CI.

Presentación distingue estados `cargando`, `vacío`, `lista` y `error`, además de
la persistencia `sin_cambios`, `guardando`, `guardado` o `error`. Estos estados
envuelven el DTO; no introducen reglas de calendario ni referencias a entidades
del dominio.

La entrada principal abre el calendario en la selección `Todas`. El selector
permite delimitar la lectura a `Libre` o a un contexto nombrado, mientras las
asignaciones que no declaran contexto conservan `Libre` como destino. El panel
de creación es opcional: invoca `CrearContextoNombrado`, muestra los errores del
caso de uso junto a sus campos y, al guardar, actualiza la lista sin acceder al
repositorio desde React. Al cancelar no se ejecuta ningún caso de uso de
escritura.

Seleccionar una fecha habilita dos recorridos. El primero asigna una actividad
existente mediante `AsignarActividad`; el segundo invoca `CrearActividad` y
continúa con la asignación solo cuando la persona lo solicita. Editar y quitar
usan casos de uso independientes. React nunca escribe en IndexedDB ni modifica
entidades directamente: tras cada operación vuelve a ejecutar la consulta y las
vistas de calendario, siete días y lista se derivan del mismo DTO.

### 6.8. Eliminación transaccional de contextos

La eliminación de un contexto nombrado atraviesa dos casos de uso. El primero
consulta el impacto y devuelve cantidades de actividades, bloques editables y
registros confirmados, junto con una huella del estado observado. El segundo
recibe esa huella y una estrategia explícita: trasladar los borradores a
`Libre`, o eliminarlos después de una confirmación reforzada. Ambos casos
rechazan `Libre` y no dependen de que la interfaz oculte la acción.

La operación de escritura se expresa mediante el puerto
`TransaccionEliminacionContextoPlanificacion`. Su adaptador IndexedDB abre una
única transacción de lectura y escritura sobre contextos, bloques editables y
agendas legadas. Dentro de ella vuelve a calcular la huella, aplica la estrategia
y elimina el contexto; cualquier divergencia o fallo aborta todas las
escrituras. El almacén de agendas participa para validar el impacto, pero nunca
se modifica: los compromisos confirmados, sus resoluciones y sus movimientos
históricos permanecen intactos.

El adaptador en memoria conserva el mismo contrato observable y restaura sus
colecciones ante un error. Esta compensación permite probar la atomicidad sin
confundirla con el mecanismo transaccional específico de IndexedDB. Después de
una eliminación válida, presentación selecciona `Libre`, actualiza el calendario
y comunica el resultado; estas reacciones no forman parte de la transacción.

### 6.9. Contrato temporal de la planificación confirmable

`CortePlanificacion` es una raíz de agregado del dominio distinta de
`ContextoPlanificacion`. El contexto responde dónde se organiza un bloque; el
corte determina qué selección explícita atraviesa revisión, gracia y
confirmación. En consecuencia, confirmar un corte no bloquea `Libre`, un
semestre ni un proyecto completo, y esos contextos pueden seguir recibiendo
planificación futura.

El dominio recibe instantes como argumentos y no importa temporizadores,
almacenamiento ni APIs del navegador. Al asignar, deriva un vencimiento único a
diez minutos; al sincronizarse con el reloj, materializa `CONFIRMADA` cuando el
instante observado alcanza ese límite. La fecha registrada de confirmación es
el vencimiento previsto, no el momento accidental en que se reabre la página.

La persistencia de este agregado corresponde al siguiente incremento. Su
registro deberá conservar conjuntamente estado, asignación, vencimiento,
confirmación e instantáneas de bloques. El caso de uso que lo recupere deberá
sincronizarlo con el puerto `Reloj` antes de exponer acciones editables y
persistir cualquier transición materializada. La cuenta regresiva de React será
una proyección derivada del vencimiento; nunca una segunda fuente de verdad.

>>>>>>> Stashed changes
## 7. Operaciones entre agregados y atomicidad

`Agenda` y `BilleteraPuntos` son agregados diferentes. El dominio puede evaluar reglas y preparar una decisión, pero no debe simular una transacción técnica entre agregados.

El canje de un día libre seguirá esta secuencia:

1. un adaptador de entrada solicita el canje mediante un puerto de entrada;
2. el caso de uso carga agendas y billetera mediante puertos de salida;
3. `ServicioCanjeRecompensas` prepara el canje, el gasto y los ajustes sin mutar el estado cargado;
4. el caso de uso aplica la decisión;
5. una unidad de trabajo persiste todos los cambios o ninguno;
6. el caso de uso devuelve un resultado independiente de React y del formato almacenado.

No puede existir un gasto confirmado sin sus ajustes ni ajustes confirmados sin el gasto correspondiente. Los reintentos tampoco deben duplicar transacciones o canjes.

## 8. Límites del dominio

- `Agenda` controla el ciclo de vida de sus bloques y ajustes.
- `CortePlanificacion` controla revisión, gracia y confirmación de una selección explícita de bloques sin absorber el contexto visible.
- Un bloque confirmado no se modifica mediante referencias externas.
- `BilleteraPuntos` deriva su saldo de transacciones y protege la unicidad semántica.
- Los servicios de dominio calculan decisiones; no acceden a almacenamiento ni controlan transacciones técnicas.
- Fechas civiles se representan mediante `FechaLocal`; instantes históricos se reciben desde un reloj externo.
- Los DTO de presentación o persistencia no forman parte del modelo del dominio.

## 9. Estado actual y estado objetivo

La arquitectura es un contrato de evolución; no debe confundirse con el grado actual de implementación.

<<<<<<< Updated upstream
| Elemento        | Estado actual                                                            |
| --------------- | ------------------------------------------------------------------------ |
| Dominio         | Actividades, contextos, agendas y compromisos protegidos por invariantes |
| Presentación    | Formularios React para crear agendas y editar bloques                    |
| Aplicación      | Casos de uso y DTO para actividades, contextos y agendas                 |
| Infraestructura | Repositorios en memoria e IndexedDB y registros persistidos versionados  |
| Composición     | Ensambla casos de uso e inicializa `Libre` antes de montar React         |
| Persistencia    | IndexedDB v3 conserva agendas y actividades al incorporar contextos      |
=======
| Elemento        | Estado actual                                                                               |
| --------------- | ------------------------------------------------------------------------------------------- |
| Dominio         | Actividades, contextos, cortes temporales, agendas y compromisos protegidos por invariantes |
| Presentación    | Calendario general y formularios React para contextos, agendas y bloques                    |
| Aplicación      | Casos de uso y DTO para actividades, contextos, agendas y su eliminación                    |
| Infraestructura | Repositorios y transacciones en memoria e IndexedDB con registros V1                        |
| Composición     | Ensambla casos de uso e inicializa `Libre` antes de montar React                            |
| Persistencia    | IndexedDB v4 añade bloques editables sin alterar los almacenes anteriores                   |
>>>>>>> Stashed changes

HereToPlan cuenta con un **primer corte vertical hexagonal efectivo**: una acción
originada en React atraviesa un puerto de entrada, un caso de uso, las invariantes
del dominio, el puerto `RepositorioAgendas` y el adaptador IndexedDB. Los DTO
impiden que la presentación reciba referencias mutables de los agregados y la
suite contractual mantiene equivalencia entre memoria e IndexedDB.

## 10. Criterios de conformidad

Un incremento respeta esta arquitectura cuando:

- expresa la regla de negocio en dominio o aplicación, no en React;
- introduce puertos desde una necesidad del caso de uso;
- mantiene reemplazables los adaptadores;
- no filtra objetos técnicos hacia el dominio;
- define claramente el límite transaccional;
- prueba las reglas del dominio sin navegador ni almacenamiento;
- prueba los casos de uso con adaptadores de prueba;
- prueba cada adaptador contra el contrato que implementa;
- mantiene el build estático independiente de servicios locales.

Como frontera mínima, deben conservarse las pruebas de inmutabilidad de agendas confirmadas, separación entre compromisos estrictos y flexibles, encapsulación de bloques, preparación no mutante de canjes e imposibilidad de saldo negativo.

El comando contractual actual es:

```bash
npm test
```

Una funcionalidad no está terminada si satisface la interfaz pero viola la dirección de dependencias o las invariantes del núcleo.
