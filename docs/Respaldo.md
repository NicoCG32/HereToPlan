# Contrato de respaldo de HereToPlan

## 1. Propósito

El respaldo es una representación portable del estado local de HereToPlan. El
archivo es JSON, posee identidad y versión propias, y no depende de que la
versión física de IndexedDB coincida con la del dispositivo de destino.

El flujo distingue tres operaciones: exportar genera una instantánea; analizar
valida sin escribir; restaurar reemplaza el estado completo sólo después de una
confirmación explícita. Analizar nunca combina, elimina ni restaura datos.

## 2. Envolvente vigente: V2

| Campo                     | Tipo   | Regla                                                                                  |
| ------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `formato`                 | cadena | Valor exacto `HereToPlan.respaldo`.                                                    |
| `versionFormato`          | entero | Valor `2` para una exportación actual.                                                 |
| `creadoEn`                | cadena | Instante ISO UTC de generación.                                                        |
| `origen.aplicacion`       | cadena | Valor exacto `HereToPlan`.                                                             |
| `origen.versionBaseDatos` | entero | Versión positiva de la base de origen; es informativa y no reemplaza `versionFormato`. |
| `contenido`               | objeto | Incluye todas las colecciones respaldables, aun cuando estén vacías.                   |

`metadatos` es opcional. Su campo `nota`, también opcional, incorpora una
descripción humana sin cambiar la semántica del contenido.

## 3. Contenido V2

| Colección                            | Clave primaria |
| ------------------------------------ | -------------- |
| `agendas`                            | `id`           |
| `actividades`                        | `id`           |
| `contextos-planificacion`            | `id`           |
| `bloques-planificacion`              | `id`           |
| `cortes-planificacion`               | `id`           |
| `resoluciones-bloques-planificacion` | `bloqueId`     |
| `transacciones-puntos`               | `id`           |
| `canjes-recompensas`                 | `id`           |
| `ajustes-compromisos`                | `id`           |
| `sesiones-cronometro`                | `id`           |
| `movimientos-recuperacion`           | `id`           |
| `reducciones-carga`                  | `id`           |
| `perfil-usuario`                     | `id`           |

Cada colección es un arreglo. Cada registro declara `versionEsquema: 1`, tiene
una clave primaria no vacía y satisface la forma mínima de su esquema. El perfil
es una entidad local única; por eso `perfil-usuario` contiene cero o un
registro, aunque IndexedDB conserva una clave primaria ordinaria como defensa
adicional.

## 4. Invariantes

1. `versionFormato` gobierna la envolvente; `versionEsquema`, cada registro.
2. Una exportación V2 contiene las trece colecciones, incluso como `[]`.
3. Las claves primarias no se repiten dentro de una colección.
4. La exportación lee los trece almacenes en una sola transacción `readonly`.
5. Los DTO de pantalla y el estado transitorio de React no se respaldan.
6. Un error de lectura o serialización deja intacto el estado original.
7. Una versión no soportada se diagnostica como incompatible.
8. Campos adicionales se advierten y no se confunden con contenido reconocido.
9. Sólo un diagnóstico `VALIDO` puede producir un plan de restauración.
10. Restaurar exige escribir exactamente `RESTAURAR`.
11. Los trece almacenes se limpian y repueblan en una sola transacción
    `readwrite`: se confirman todos o ninguno.

## 5. Ejemplo V2 mínimo

```json
{
  "formato": "HereToPlan.respaldo",
  "versionFormato": 2,
  "creadoEn": "2026-07-21T15:30:00.000Z",
  "origen": {
    "aplicacion": "HereToPlan",
    "versionBaseDatos": 11
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
    "reducciones-carga": [],
    "perfil-usuario": []
  }
}
```

El archivo vacío es válido porque representa por completo un estado sin
registros y sin perfil configurado.

## 6. Restauración y atomicidad

La restauración separa cuatro momentos observables:

1. el navegador lee y analiza el archivo sin abrir un puerto de escritura;
2. el caso de uso produce un plan inmutable y selecciona una ruta de migración;
3. la interfaz muestra versión, origen y cantidad de registros, y solicita la
   confirmación exacta `RESTAURAR`;
4. el adaptador reemplaza las trece colecciones en una única transacción.

El reemplazo no es una secuencia de trece confirmaciones independientes. Todos
los `clear` y `add` pertenecen a la misma transacción de IndexedDB. Un fallo de
clave, índice, dato o almacenamiento aborta el conjunto y conserva íntegramente
el estado anterior.

## 7. Compatibilidad y migraciones

La aplicación admite dos rutas:

| Origen | Ruta                                     | Resultado                                                     |
| ------ | ---------------------------------------- | ------------------------------------------------------------- |
| V1     | `FORMATO_V1_A_ESTADO_PERSISTENTE_ACTUAL` | Conserva las doce colecciones históricas y crea perfil vacío. |
| V2     | `FORMATO_V2_A_ESTADO_PERSISTENTE_ACTUAL` | Conserva las trece colecciones, incluido el perfil.           |

V1 no se interpreta como V2 incompleto. Se valida contra su propio conjunto de
doce colecciones y luego se migra deliberadamente agregando
`perfil-usuario: []`. Esta distinción hace trazable la pérdida de información:
el perfil queda ausente porque V1 nunca lo representó.

Una versión futura, por ejemplo V3, es `INCOMPATIBLE` hasta que exista una ruta
probada. No se degrada ni se interpreta por conjetura.
