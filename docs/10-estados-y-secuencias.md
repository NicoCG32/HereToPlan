# 10 · Estados y secuencias

El modelo posee varias máquinas de estado distintas; mezclarlas en un único diagrama ocultaría restricciones. Estos diagramas describen transiciones conceptuales verificadas contra los tipos y casos de uso, sin reemplazar las validaciones del código.

## 1. Corte de planificación

```mermaid
stateDiagram-v2
  [*] --> BORRADOR
  BORRADOR --> EN_REVISION: Asignar a revisión
  EN_REVISION --> BORRADOR: Volver a borrador
  EN_REVISION --> EN_GRACIA: Asignar corte e iniciar gracia
  EN_GRACIA --> CONFIRMADA: Vence gracia y se sincroniza el reloj
  EN_GRACIA --> BORRADOR: Corregir durante la gracia
  CONFIRMADA --> [*]
```

El código define `DURACION_GRACIA_MINUTOS = 10`. La confirmación automática depende de los tiempos y acciones del caso de uso, no de una máquina que se ejecute por sí sola sin sincronización. El estado `CONFIRMADA` protege la instantánea histórica. Consulta [CortePlanificacion.ts](../src/dominio/planificacion/CortePlanificacion.ts).

## 2. Resultado de un bloque

```mermaid
stateDiagram-v2
  [*] --> PENDIENTE
  PENDIENTE --> COMPLETADO: Resolver como completado
  PENDIENTE --> INCUMPLIDO: Resolver como incumplido
  PENDIENTE --> EXCUSADO: Ajuste autorizado (Día libre)
  COMPLETADO --> [*]
  INCUMPLIDO --> [*]
  EXCUSADO --> [*]
```

`COMPLETADO` y `INCUMPLIDO` son resultados del contrato `ResolucionBloquePlanificacion`; `EXCUSADO` es un resultado permitido por la mecánica de recompensa, no una acreditación por trabajo realizado.

## 3. Cronómetro

```mermaid
stateDiagram-v2
  [*] --> ACTIVA: Iniciar
  ACTIVA --> PAUSADA: Pausar
  PAUSADA --> ACTIVA: Reanudar
  ACTIVA --> FINALIZADA: Detener
  PAUSADA --> FINALIZADA: Detener
  FINALIZADA --> [*]
```

Las sesiones conservan operaciones de inicio, pausa, reanudación y detención, con identificadores para evitar reintentos duplicados. Una sesión `FINALIZADA` no completa por sí sola el compromiso. [Fuente](../src/dominio/cronometro/SesionCronometro.ts).

## 4. Unidad de recompensa adquirida

```mermaid
stateDiagram-v2
  [*] --> DISPONIBLE: Adquirir usando puntos
  DISPONIBLE --> CONSUMIDA: Aplicación válida
  CONSUMIDA --> [*]
```

La consulta del catálogo, la compra y la aplicación son pasos diferentes. No se permite consumir la misma unidad dos veces. [Fuente](../src/dominio/recompensas/RecompensaAdquirida.ts).

## 5. Respaldo: secuencia de restauración

```mermaid
sequenceDiagram
  autonumber
  actor U as Persona
  participant UI as Pantalla de respaldo
  participant A as Analizador de respaldo
  participant R as Restaurador
  participant IDB as IndexedDB
  U->>UI: Seleccionar JSON
  UI->>A: Analizar formato y contenido
  A-->>UI: Diagnóstico sin escribir
  alt Archivo inválido / incompatible
    UI-->>U: Explicar por qué se rechaza
  else Archivo válido
    UI-->>U: Mostrar alcance y confirmación
    U->>UI: Escribir RESTAURAR
    UI->>R: Plan válido + confirmación
    R->>IDB: Una transacción readwrite de 15 almacenes
    alt Transacción válida
      IDB-->>R: Commit
      R-->>UI: Restauración confirmada
    else Fallo
      IDB-->>R: Abort
      R-->>UI: Estado previo conservado
    end
  end
```

El archivo se trata como entrada no confiable. La preferencia del tutorial permanece fuera de esta restauración. [Contrato y migraciones](Respaldo.md).

## 6. Referencia complementaria: agenda heredada

`Agenda` también posee estados propios `BORRADOR`, `CONFIRMADA` y `FINALIZADA`, pero no debe confundirse con `CortePlanificacion`, cuyo contrato `EN_REVISION`/`EN_GRACIA` se utiliza en el calendario actual. Ver [Agenda.ts](../src/dominio/agendas/Agenda.ts) y [tipos](../src/dominio/agendas/tipos.ts).
