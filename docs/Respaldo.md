# Contrato de respaldo de HereToPlan

## 1. Propósito

El respaldo permite obtener una representación portable del estado local de
HereToPlan. El archivo es JSON, se identifica explícitamente y evoluciona con
una versión propia, independiente de la versión interna de IndexedDB.

El contrato vigente permite **exportar** y **analizar** un respaldo. Analizar no
restaura, combina ni reemplaza datos; la escritura de una importación requerirá
un caso de uso y un límite transaccional posteriores.

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
