# 04 — Dominio, entidades y persistencia

## Dominio y representación de datos

### Entidades y conceptos

| Entidad / concepto                     | Identidad y significado              | Representación / estado             |
| -------------------------------------- | ------------------------------------ | ----------------------------------- |
| Actividad                              | Definición de tarea/proyecto/hábito  | Independiente de programación       |
| Contexto / Agenda                      | Organización libre o nombrada        | IndexedDB                           |
| BloquePlanificación                    | Actividad, fecha, minutos y política | IndexedDB                           |
| CortePlanificación                     | Instantánea confirmable y estado     | IndexedDB                           |
| Resolución                             | Completar/incumplir con historia     | IndexedDB; idempotencia             |
| Movimiento / inventario / recuperación | Economía y ajustes permitidos        | Operaciones conjuntas y persistidas |

### Relaciones de dominio

```text
[Actividad] -- 1:N --> [Bloque]
[Contexto] -- 1:N --> [Bloque]
[Corte] -- contiene --> [InstantáneaBloque]
[Bloque] -- 0:1 --> [Resolución]
[Resolución] -- origina --> [Movimiento]
```

| Origen     | Cardinalidad / relación | Destino           | Semántica                                     |
| ---------- | ----------------------- | ----------------- | --------------------------------------------- |
| Actividad  | 1:N                     | Bloque            | Una definición puede programarse varias veces |
| Contexto   | 1:N                     | Bloque            | Libre no exige crear agenda                   |
| Corte      | contiene                | InstantáneaBloque | Congela el compromiso confirmado              |
| Bloque     | 0:1                     | Resolución        | Resolución histórica no duplicable            |
| Resolución | origina                 | Movimiento        | Acreditación atómica cuando corresponde       |

### Persistencia y garantías

IndexedDB detrás de puertos y transacciones de los adaptadores. Persistencia local por origen/navegador; no hay cuenta cloud implícita. Migraciones y respaldo son contratos versionados. Referencia conceptual no equivale a FK SQL; las invariantes se comprueban por aplicación y transacción.

El diagrama describe relaciones del dominio. Los adaptadores y el esquema de persistencia determinan cómo se mantienen esas relaciones al guardar o recuperar datos.

### Consistencia y evolución

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.
- El cronómetro no sustituye la declaración humana de cumplimiento.
- Adquirir una recompensa y aplicarla son operaciones diferentes; la vista previa no escribe.
- Restaurar/reiniciar requiere conocer impacto y preservar los contratos documentados.

Antes de cambiar el formato de almacenamiento, comprueba la migración y la restauración con una copia de prueba. Conserva la versión del respaldo y verifica su compatibilidad con la aplicación que lo abrirá.

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
