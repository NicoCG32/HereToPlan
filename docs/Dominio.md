# Contrato del dominio de HereToPlan

El siguiente modelo ofrece una vista resumida de las entidades y relaciones implementadas:

![Modelo de dominio de HereToPlan](modelo-dominio.svg)

## 1. Propósito del modelo

El modelo parte de una regla central del producto:

> Un bloque de trabajo incluido en un corte de planificación confirmado es un compromiso. No puede borrarse ni alterarse libremente. Solo puede completarse, incumplirse o recibir un ajuste autorizado por una recompensa si fue declarado flexible desde el principio.

Este contrato define cómo deben coexistir los compromisos, los puntos y las recompensas. Su alcance crecerá junto con el producto sin debilitar la trazabilidad ni las invariantes aquí establecidas.

## 2. Módulos

```text
dominio/
├── actividades/
├── agendas/
├── contextos/
├── compromisos/
├── puntos/
├── recompensas/
└── compartido/
```

### `actividades`

Contiene `Actividad`, la definición común de aquello que el usuario desea realizar. El contrato distingue `TAREA_SIMPLE`, `TAREA_COMPUESTA`, `PROYECTO` y `HABITO`; las reglas particulares de composición y recurrencia se incorporan sobre esta clasificación sin mezclar la actividad con su programación.

La actividad no se calendariza directamente. Sus ejecuciones concretas se representan mediante bloques de trabajo, permitiendo que un hábito o una tarea produzcan varios compromisos temporales. Una tarea conserva además su propio estado de resultado; resolver un bloque no completa silenciosamente la tarea contenedora.

El catálogo de actividades posee persistencia independiente de las agendas. Crear una actividad no crea un bloque ni le asigna una fecha. La consulta `Sin programar` es una proyección de aplicación: devuelve las actividades cuyo identificador no aparece en ningún bloque existente.

`Tarea` especializa `Actividad` con estimación necesaria, fecha límite opcional, estado y composición. Una tarea simple no admite subtareas; las tareas compuestas y los proyectos forman un grafo dirigido acíclico. Terminar sus subtareas no completa automáticamente la tarea contenedora: su resolución requiere una decisión explícita y queda fechada.

`Habito` especializa `Actividad` con frecuencia `DIARIA`, `SEMANAL` o `PERSONALIZADA`. Los días utilizan numeración ISO de 1 —lunes— a 7 —domingo—. Una frecuencia semanal declara exactamente un día y una personalizada al menos uno. `correspondeA(fecha)` calcula determinísticamente si debe proponerse una ocurrencia, pero cada ocurrencia real continúa siendo un bloque independiente.

### `contextos`

`ContextoPlanificacion` organiza el calendario sin constituir una promesa. Existen dos clases:

- `LIBRE`, con identidad estable administrada por el sistema, sin rango cerrado y no eliminable;
- `NOMBRADO`, creado por el usuario con nombre, propósito textual opcional y rango completo opcional.

El contexto no contiene bloques, estados de confirmación ni horizontes de visualización. Día, semana y mes pertenecen a las proyecciones de lectura. Un contexto nombrado puede representar un semestre, un proyecto con fechas o un período abierto sin modificar la semántica de los compromisos.

El propósito se normaliza eliminando espacios exteriores; un valor vacío equivale a no declararlo y su extensión máxima es de 240 caracteres. `Libre` no admite propósito editable porque su significado es estable y pertenece al sistema.

### `planificacion`

`BloquePlanificacion` representa una asignación temporal todavía editable. Une
explícitamente una actividad y un contexto con una fecha civil, minutos
planificados y una política efectiva versionada. Crear una actividad no crea un
bloque; por ello una tarea, proyecto o hábito puede existir en `Sin programar`
sin ocupar una fecha del calendario.

El bloque editable conserva el título utilizado al asignarlo y la política
efectiva, pero no posee estados de resolución ni confirmación. La planificación
confirmable futura deberá incorporar sus datos a un corte transaccional antes de
volverlos inmutables. `BloqueTrabajo`, contenido actualmente por la `Agenda`
legada, sigue representando el compromiso confirmable e histórico.

Reglas del bloque editable:

1. referencia una actividad y un contexto existentes;
2. si el contexto posee rango, su fecha debe pertenecer a él;
3. los minutos son un entero positivo;
4. su política efectiva es estricta o flexible y conserva autoridad y ajustes;
5. agregar, editar o quitar el bloque no modifica la definición de la actividad;
6. quitar el último bloque devuelve la actividad a la proyección `Sin programar`.

### `agendas`

La implementación disponible contiene `Agenda` y `BloqueTrabajo`.

- `Agenda` es la raíz del agregado: crea y conserva los bloques, confirma la planificación y controla sus cambios.
- `BloqueTrabajo` es el compromiso concreto y puntuable.

La agenda solo permite agregar o quitar bloques mientras está en `BORRADOR`. Al confirmarse, queda bloqueada. Los bloques internos no se exponen; `listarBloques()` devuelve vistas independientes para impedir modificaciones externas.

Esta forma todavía concentra dos responsabilidades en `Agenda`: organizar un rango visible y controlar la confirmación de sus bloques. La frontera objetivo, definida para la evolución del calendario, las separa en `ContextoPlanificacion` y `CortePlanificacion`. La implementación actual se conserva hasta introducir una migración explícita; no debe ampliarse suponiendo que una agenda nombrada completa es siempre la unidad confirmable.

Estados de la agenda:

```text
BORRADOR → CONFIRMADA → FINALIZADA
```

Estados de un bloque:

```text
PENDIENTE → COMPLETADO
          → INCUMPLIDO
          → EXCUSADO mediante ajuste autorizado
```

#### Frontera objetivo de planificación

| Concepto                | Datos propios                                                                                                  | Responsabilidad                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ContextoPlanificacion` | identificador, clase `LIBRE` o `NOMBRADO`, nombre, propósito, rango personalizado opcional y fecha de creación | Organizar y filtrar el calendario sin constituir por sí mismo una promesa      |
| `BloquePlanificacion`   | identificador, actividad, contexto de origen, fecha local, minutos y política efectiva                         | Situar de manera editable una actividad en una fecha concreta                  |
| `BloqueTrabajo`         | identificador, actividad, fecha local, minutos, política efectiva y estado                                     | Conservar el compromiso individual dentro de una planificación confirmable     |
| `CortePlanificacion`    | identificador, bloques seleccionados, estado de revisión, inicio y fin de gracia, confirmación y cierre        | Definir qué conjunto atraviesa revisión, gracia y confirmación como una unidad |
| Vista de calendario     | rango visible, filtros y proyecciones diaria, semanal o mensual                                                | Presentar datos; no introduce estados ni horizontes nuevos en el dominio       |

Reglas de la frontera:

1. `Libre` existe por decisión del sistema, no posee un final natural y no puede eliminarse.
2. Una agenda nombrada es un contexto opcional y admite rangos como un semestre o un proyecto.
3. Día, semana y mes son proyecciones de lectura; no son tipos obligatorios de agenda.
4. Un bloque pertenece a un contexto, pero solo se vuelve inmutable al incorporarse a un corte confirmado.
5. Un contexto puede continuar recibiendo planificación futura aunque contenga bloques históricos confirmados.
6. Eliminar un contexto nombrado nunca elimina historial confirmado; la planificación no confirmada se traslada a `Libre` o se elimina mediante una decisión destructiva independiente.

### `compromisos`

Contiene `PoliticaCompromiso` y `AjusteCompromiso`.

`PoliticaCompromiso` se asigna a cada bloque antes de confirmar la agenda. Distingue:

- rigidez `ESTRICTO` o `FLEXIBLE`;
- autoridad de plazo `PERSONAL` o `EXTERNA`;
- ajustes permitidos.

Un compromiso estricto no admite ajustes. Un plazo externo no puede declarar `EXTENDER_PLAZO` como ajuste permitido.

Agenda y actividad pueden proponer políticas predeterminadas. La política efectiva se resuelve con precedencia explícita del bloque, actividad y agenda. El bloque recibe una copia independiente antes de confirmarse; su vista incluye `versionEsquema: 1` y se persiste como instantánea histórica. Cambiar posteriormente una propuesta no modifica bloques existentes.

`AjusteCompromiso` registra la autorización histórica que modifica un bloque. Actualmente está implementado `EXCUSAR`, utilizado por el día libre. Los tipos `REPROGRAMAR`, `EXTENDER_PLAZO` y `REDUCIR_CARGA` forman parte del modelo de extensión, pero todavía no poseen comportamiento.

### `puntos`

`BilleteraPuntos` deriva su saldo desde `TransaccionPuntos`.

Reglas:

- el saldo nunca puede ser negativo;
- una transacción no puede repetirse;
- una misma fuente semántica no puede otorgar o consumir puntos dos veces;
- el dominio todavía no fija la fórmula para ganar puntos.

### `recompensas`

Contiene:

- `DefinicionRecompensa`: describe una recompensa y su costo;
- `CanjeRecompensa`: registra una compra concreta;
- `ServicioCanjeRecompensas`: prepara el canje de un día libre.

El servicio de dominio no muta agendas ni billeteras. Devuelve:

1. el canje;
2. la transacción de gasto;
3. los ajustes agrupados por agenda.

La capa de aplicación deberá aplicar y persistir esos cambios como una operación coherente.

## 3. Regla del día libre

La recompensa `DIA_LIBRE`:

- requiere saldo suficiente;
- solo considera agendas confirmadas;
- solo afecta bloques pendientes de la fecha seleccionada;
- solo afecta bloques cuya política flexible permita `EXCUSAR`;
- no elimina los bloques;
- registra cada bloque como `EXCUSADO` mediante un `AjusteCompromiso`;
- conserva intactos los compromisos estrictos.

## 4. Invariantes fundamentales

1. Un corte de planificación confirmado no vuelve a ser editable.
2. Un bloque confirmado nunca se elimina del historial.
3. La flexibilidad se decide antes de confirmar la agenda.
4. Un bloque resuelto no puede resolverse nuevamente.
5. Un bloque estricto no puede excusarse.
6. Todo bloque excusado debe tener un ajuste asociado a un canje.
7. La agenda controla sus bloques internos y solo expone vistas.
8. El saldo de puntos nunca es negativo.
9. El mismo hecho no genera dos movimientos de puntos.
10. Un canje no altera el estado hasta que la capa de aplicación aplica su resultado.

## 5. Capacidades todavía no implementadas

El modelo y sus adaptadores aún deben incorporar:

- reglas internas de tareas compuestas y proyectos;
- recurrencia completa de hábitos;
- período de gracia para confirmar;
- plantillas de agenda;
- cronómetro;
- banco de recuperación;
- extensión de plazos;
- reducción de carga;
- persistencia de puntos, recompensas y cortes confirmables separados;
- fórmula de puntuación;
- calendario funcional definitivo.

Estas capacidades forman parte de la evolución prevista. Su diseño definitivo puede ajustarse a partir de la evidencia obtenida durante el uso del producto.

## 6. Evolución del modelo

La base permite crecer sin romper la regla central:

- nuevos tipos de actividad pueden añadirse sin cambiar el bloque;
- contexto de calendario y corte confirmable evolucionarán como conceptos separados;
- nuevos ajustes pueden implementarse dentro de `BloqueTrabajo.validarAjuste`;
- nuevas recompensas pueden producir otros tipos de ajuste;
- la capa de aplicación puede incorporar transacciones atómicas;
- infraestructura podrá rehidratar agendas, billeteras y canjes;
- las vistas de los agregados pueden convertirse en DTO persistibles.

La evolución se entiende como capacidad de extensión controlada, no como implementación anticipada de todas las funciones.
