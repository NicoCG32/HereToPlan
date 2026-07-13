# Contrato del dominio de HereToPlan

El siguiente modelo ofrece una vista resumida de las entidades y relaciones implementadas:

![Modelo de dominio de HereToPlan](modelo-dominio.svg)

## 1. Propósito del modelo

El modelo parte de una regla central del producto:

> Un bloque de trabajo dentro de una agenda confirmada es un compromiso. No puede borrarse ni alterarse libremente. Solo puede completarse, incumplirse o recibir un ajuste autorizado por una recompensa si fue declarado flexible desde el principio.

Este contrato define cómo deben coexistir los compromisos, los puntos y las recompensas. Su alcance crecerá junto con el producto sin debilitar la trazabilidad ni las invariantes aquí establecidas.

## 2. Módulos

```text
dominio/
├── actividades/
├── agendas/
├── compromisos/
├── puntos/
├── recompensas/
└── compartido/
```

### `actividades`

Contiene `Actividad`, una definición de aquello que el usuario desea realizar. La implementación disponible distingue entre `TAREA` y `HABITO`.

La actividad no se completa directamente. Sus ejecuciones concretas se representan mediante bloques de trabajo, permitiendo que un hábito o una tarea produzcan varios compromisos temporales en el futuro.

### `agendas`

Contiene `Agenda` y `BloqueTrabajo`.

- `Agenda` es la raíz del agregado: crea y conserva los bloques, confirma la planificación y controla sus cambios.
- `BloqueTrabajo` es el compromiso concreto y puntuable.

La agenda solo permite agregar o quitar bloques mientras está en `BORRADOR`. Al confirmarse, queda bloqueada. Los bloques internos no se exponen; `listarBloques()` devuelve vistas independientes para impedir modificaciones externas.

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

### `compromisos`

Contiene `PoliticaCompromiso` y `AjusteCompromiso`.

`PoliticaCompromiso` se asigna a cada bloque antes de confirmar la agenda. Distingue:

- rigidez `ESTRICTO` o `FLEXIBLE`;
- autoridad de plazo `PERSONAL` o `EXTERNA`;
- ajustes permitidos.

Un compromiso estricto no admite ajustes. Un plazo externo no puede declarar `EXTENDER_PLAZO` como ajuste permitido.

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

1. Una agenda confirmada no vuelve a ser editable.
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

- tareas compuestas o proyectos;
- recurrencia completa de hábitos;
- período de gracia para confirmar;
- plantillas de agenda;
- cronómetro;
- banco de recuperación;
- extensión de plazos;
- reducción de carga;
- persistencia;
- fórmula de puntuación;
- interfaz funcional.

Estas capacidades forman parte de la evolución prevista. Su diseño definitivo puede ajustarse a partir de la evidencia obtenida durante el uso del producto.

## 6. Evolución del modelo

La base permite crecer sin romper la regla central:

- nuevos tipos de actividad pueden añadirse sin cambiar el bloque;
- nuevos ajustes pueden implementarse dentro de `BloqueTrabajo.validarAjuste`;
- nuevas recompensas pueden producir otros tipos de ajuste;
- la capa de aplicación puede incorporar transacciones atómicas;
- infraestructura podrá rehidratar agendas, billeteras y canjes;
- las vistas de los agregados pueden convertirse en DTO persistibles.

La evolución se entiende como capacidad de extensión controlada, no como implementación anticipada de todas las funciones.
