# 04 · Dominio y persistencia local

**IndexedDB** almacena registros en _object stores_ con claves e índices. La aplicación valida las relaciones entre identificadores y utiliza transacciones para mantener su consistencia.

## Entidades principales (vista conceptual)

```mermaid
erDiagram
  ACTIVIDAD ||--o{ BLOQUE_PLANIFICACION : se_programa_como
  CONTEXTO_PLANIFICACION ||--o{ BLOQUE_PLANIFICACION : organiza
  CORTE_PLANIFICACION ||--o{ INSTANTANEA_BLOQUE : conserva
  BLOQUE_PLANIFICACION ||--o| RESOLUCION_BLOQUE : se_resuelve
  BLOQUE_PLANIFICACION ||--o{ SESION_CRONOMETRO : puede_medirse
  RESOLUCION_BLOQUE ||--o| TRANSACCION_PUNTOS : puede_acreditar
  DEFINICION_RECOMPENSA ||--o{ CANJE_RECOMPENSA : registra_canje_historico
  DEFINICION_RECOMPENSA ||--o{ RECOMPENSA_ADQUIRIDA : permite_adquirir
  RECOMPENSA_ADQUIRIDA ||--o| APLICACION_RECOMPENSA : puede_consumirse
  BLOQUE_PLANIFICACION ||--o| AJUSTE_COMPROMISO : puede_ajustarse
  BLOQUE_PLANIFICACION ||--o{ MOVIMIENTO_RECUPERACION : puede_originar
  BLOQUE_PLANIFICACION ||--o| REDUCCION_CARGA : puede_recibir
  ACTIVIDAD {
    string id PK
  }
  CONTEXTO_PLANIFICACION {
    string id PK
  }
  BLOQUE_PLANIFICACION {
    string id PK
    string actividadId
    string contextoId
  }
  CORTE_PLANIFICACION {
    string id PK
    string estado
  }
  INSTANTANEA_BLOQUE {
    string id
    string corteId
  }
  RESOLUCION_BLOQUE {
    string bloqueId PK
    string operacionId
  }
  SESION_CRONOMETRO {
    string id PK
    string bloqueId
  }
  TRANSACCION_PUNTOS {
    string id PK
    string fuenteId
  }
  CANJE_RECOMPENSA {
    string id PK
  }
  DEFINICION_RECOMPENSA {
    string id PK
  }
  RECOMPENSA_ADQUIRIDA {
    string id PK
    string recompensaId
  }
  APLICACION_RECOMPENSA {
    string id PK
    string recompensaAdquiridaId
  }
  AJUSTE_COMPROMISO {
    string id PK
    string bloqueId
  }
  MOVIMIENTO_RECUPERACION {
    string id PK
  }
  REDUCCION_CARGA {
    string id PK
    string bloqueId
  }
```

Las relaciones son conceptuales: IndexedDB no impone claves foráneas. `INSTANTANEA_BLOQUE` está **embebida** en el corte y las definiciones de recompensas se configuran en código. Los canjes históricos y las unidades adquiridas se guardan por separado; la migración convierte cada canje antiguo en una unidad consumida.

## Modelo físico: object stores IndexedDB (versión 13)

```mermaid
flowchart TB
  DB[(Base IndexedDB v13)]
  DB --> CORE["Planificación<br/>agendas, actividades, contextos-planificacion<br/>bloques-planificacion, cortes-planificacion"]
  DB --> HIST["Resultado e historia<br/>resoluciones-bloques-planificacion<br/>sesiones-cronometro, ajustes-compromisos"]
  DB --> ECON["Economía<br/>transacciones-puntos, canjes-recompensas<br/>recompensas-adquiridas, aplicaciones-recompensas"]
  DB --> REC["Recuperación<br/>movimientos-recuperacion, reducciones-carga"]
  DB --> PROFILE["Identidad local<br/>perfil-usuario"]
  classDef data fill:#eaf3f7,stroke:#47839e,color:#173f53;
  class CORE,HIST,ECON,REC,PROFILE data;
```

Son **15 almacenes**. Las colecciones se respaldan mediante un contrato JSON V3. `localStorage` guarda una preferencia del tutorial que **no forma parte de las 15 colecciones**.

## Correspondencia de operaciones y almacenes

| Operación                     | Lecturas/escrituras que importan                                           |
| ----------------------------- | -------------------------------------------------------------------------- |
| Crear y programar             | Actividades, contextos, bloques; sin comprometer hasta el corte            |
| Confirmar                     | Cortes con instantánea y estado; historia independiente del catálogo       |
| Completar con puntos          | Resolución de bloque + ingreso de puntos en una transacción                |
| Adquirir / aplicar recompensa | Egreso de puntos, unidad adquirida y aplicación; sin doble consumo         |
| Cronometrar                   | Sesión vinculada y operaciones idempotentes                                |
| Recuperar                     | Movimientos y reducciones, ligados a reglas de cálculo                     |
| Restaurar                     | Vaciar y reponer las 15 colecciones en una sola transacción, tras análisis |

**Índices reales relevantes:** `por-operacion-id` en resoluciones y sesiones; `por-fuente-semantica` en movimientos de puntos; `por-bloque-id` en varios registros; estos ayudan a impedir duplicados de operación según el adaptador.

## Versiones de almacenamiento y respaldo

- **Base local:** `VERSION_BASE_DATOS = 13`, en [`esquemaBaseDatos.ts`](../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos.ts).
- **Formato exportado:** `versionFormato = 3`, independiente de la base interna.
- **Registros:** actividades V2; otros mapeadores V1, con compatibilidad según el contrato de respaldo.

[Contrato del dominio](Dominio.md) · [Contrato del respaldo](Respaldo.md) · [Estados](10-estados-y-secuencias.md)
