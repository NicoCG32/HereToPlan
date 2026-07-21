# Contrato de respaldo de HereToPlan

## 1. Propósito

El respaldo permite obtener una representación portable del estado local de
HereToPlan. El archivo es JSON, se identifica explícitamente y evoluciona con
una versión propia, independiente de la versión interna de IndexedDB.

El contrato vigente permite **exportar**, **analizar** y **restaurar** un
respaldo. Analizar no restaura, combina ni reemplaza datos. Restaurar es una
acción posterior, explícita y destructiva que reemplaza el estado completo bajo
un único límite transaccional.

## 2. Envolvente V1

Los campos obligatorios de la raíz son:

| Campo                     | Tipo   | Regla                                                                                  |
| ------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `formato`                 | cadena | Valor exacto `HereToPlan.respaldo`.                                                    |
| `versionFormato`          | entero | Valor `1` para este contrato.                                                          |
| `creadoEn`                | cadena | Instante ISO válido de generación.                                                     |
| `origen.aplicacion`       | cadena | Valor exacto `HereToPlan`.                                                             |
| `origen.versionBaseDatos` | entero | Versión positiva de la base de origen. Es informativa y no sustituye `versionFormato`. |
| `contenido`               | objeto | Contiene todas las colecciones respaldables, incluso cuando están vacías.              |

`metadatos` es opcional. Su campo `nota`, también opcional, permite incorporar
una descripción humana sin alterar la semántica del contenido.

## 3. Contenido obligatorio

`contenido` incluye exactamente el estado persistente soportado por la versión
actual:

| Colección                            | Clave primaria del registro |
| ------------------------------------ | --------------------------- |
| `agendas`                            | `id`                        |
| `actividades`                        | `id`                        |
| `contextos-planificacion`            | `id`                        |
| `bloques-planificacion`              | `id`                        |
| `cortes-planificacion`               | `id`                        |
| `resoluciones-bloques-planificacion` | `bloqueId`                  |
| `transacciones-puntos`               | `id`                        |
| `canjes-recompensas`                 | `id`                        |
| `ajustes-compromisos`                | `id`                        |
| `sesiones-cronometro`                | `id`                        |
| `movimientos-recuperacion`           | `id`                        |
| `reducciones-carga`                  | `id`                        |

Cada colección es un arreglo. Cada elemento conserva el registro plano
persistido, declara `versionEsquema: 1`, posee una clave primaria no vacía y
satisface los campos obligatorios de su registro V1. Los campos opcionales de
las entidades —por ejemplo, propósito, descripción o instantes asociados a una
transición todavía no ocurrida— se omiten cuando no existen.

## 4. Invariantes

1. `versionFormato` gobierna la envolvente completa; `versionEsquema` gobierna cada tipo de registro.
2. Todas las colecciones conocidas están presentes, aunque contengan `[]`.
3. Una clave primaria no se repite dentro de su colección.
4. La exportación lee los doce almacenes en una única transacción de solo lectura de IndexedDB.
5. Los DTO de pantalla y el estado transitorio de React no forman parte del archivo.
6. Un error de lectura o serialización no modifica ni elimina el estado original.
7. Una versión de formato o de registro no soportada se diagnostica como incompatible.
8. Campos o colecciones adicionales se informan como advertencias; no se confunden con contenido reconocido.
9. El análisis es una función de lectura: recibe texto y devuelve un diagnóstico sin disponer de puertos de escritura.
10. Sólo un diagnóstico `VALIDO` puede producir un plan de restauración.
11. La restauración exige la confirmación exacta `RESTAURAR` y no mezcla el respaldo con el estado previo.
12. Los doce almacenes se limpian y repueblan dentro de una única transacción `readwrite`; se confirman todos o ninguno.

## 5. Ejemplo válido mínimo

```json
{
  "formato": "HereToPlan.respaldo",
  "versionFormato": 1,
  "creadoEn": "2026-07-20T15:30:00.000Z",
  "origen": {
    "aplicacion": "HereToPlan",
    "versionBaseDatos": 10
  },
  "contenido": {
    "agendas": [],
    "actividades": [],
    "contextos-planificacion": [],
    "bloques-planificacion": [],
    "cortes-planificacion": [],
    "resoluciones-bloques-planificacion": [],
    "transacciones-puntos": [],
    "canjes-recompensas": [],
    "ajustes-compromisos": [],
    "sesiones-cronometro": [],
    "movimientos-recuperacion": [],
    "reducciones-carga": []
  }
}
```

El respaldo vacío es válido porque representa de manera completa un estado sin
registros.

## 6. Ejemplo incompatible

```json
{
  "formato": "HereToPlan.respaldo",
  "versionFormato": 2,
  "creadoEn": "2026-07-20T15:30:00.000Z",
  "origen": {
    "aplicacion": "HereToPlan",
    "versionBaseDatos": 12
  },
  "contenido": {}
}
```

Aunque sea JSON válido y pertenezca a HereToPlan, `versionFormato: 2` no puede
interpretarse con el contrato V1. Debe rechazarse como **incompatible**, sin
intentar degradarlo ni tocar IndexedDB.

También son inválidos —no meramente incompatibles— un JSON truncado, un
identificador de formato ajeno, una colección obligatoria ausente, un registro
sin clave o dos registros con la misma clave primaria.

## 7. Restauración y atomicidad

La restauración separa cuatro momentos observables:

1. el archivo se lee y analiza sin acceso de escritura;
2. un respaldo V1 válido se transforma en un plan inmutable mediante la ruta `FORMATO_V1_A_ESTADO_PERSISTENTE_ACTUAL`;
3. la interfaz muestra versión, origen y cantidad de registros, y solicita la confirmación exacta `RESTAURAR`;
4. el adaptador sustituye las doce colecciones en una sola transacción de IndexedDB.

La sustitución no es una secuencia de doce confirmaciones independientes. El
adaptador abre una transacción `readwrite` que incluye todos los almacenes,
ejecuta `clear` y luego `add` para cada colección, y sólo informa éxito cuando
la transacción completa. Un error de clave, índice, dato o almacenamiento aborta
la transacción; IndexedDB conserva entonces íntegramente el estado anterior.

Tras una restauración exitosa, la aplicación ofrece una recarga explícita para
reconstruir sus proyecciones desde la nueva persistencia. La recarga no forma
parte de la transacción: ocurre sólo después de que IndexedDB haya confirmado el
reemplazo.

## 8. Política de migraciones

Una ruta de migración relaciona una versión del formato portable con el estado
persistente que entiende la aplicación actual. La ruta soportada es V1 → estado
actual. En ella se conservan las doce colecciones y sus registros V1; la versión
física de la base de origen se registra para diagnóstico, pero no selecciona por
sí sola una migración.

No existe una conversión implícita para versiones futuras. Un respaldo V2 se
clasifica como `INCOMPATIBLE` y no alcanza el puerto de escritura hasta que se
implemente y pruebe una ruta V2 explícita. Esta regla evita degradar datos
desconocidos o interpretar por conjetura una envolvente nueva.
