# 04 — Dominio, entidades y persistencia

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Dominio y representación de datos

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

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

La cardinalidad de dominio no prueba que exista una FK física. Revisar adaptadores/migraciones para identificar qué se valida por esquema, por caso de uso o por lectura. No usar «RLS» para almacenamiento que no dispone de esas políticas.

### Consistencia y evolución

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.
- El cronómetro no sustituye la declaración humana de cumplimiento.
- Adquirir una recompensa y aplicarla son operaciones diferentes; la vista previa no escribe.
- Restaurar/reiniciar requiere conocer impacto y preservar los contratos documentados.

Cambios de formato, referencias y restauración se comprueban con datos de prueba. El respaldo/artefacto debe indicar versión; la documentación no autoriza transformar datos reales ni rebajar un esquema para abrirlo con un ejecutable anterior.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
