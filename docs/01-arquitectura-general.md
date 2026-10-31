# 01 — Arquitectura por niveles

## Arquitectura del sistema por niveles

### Nivel 1 — Contexto y fronteras de ejecución

```text
[Persona] -> [React / HashRouter]
                     |
          [Casos de uso y puertos]
                     |
        [Dominio: actividades / bloques / economía]
                     |
             [Adaptadores IndexedDB]
                     |
            [Respaldo JSON versionado]

[GitHub Actions] -> [dist] -> [Pages /HereToPlan/]
```

Actividades reutilizables se asignan a bloques por fecha y contextos opcionales. Los cortes de planificación confirman compromisos; resolución, puntos, inventario y recuperación preservan historia con reglas explícitas. IndexedDB conserva estado y el respaldo permite trasladarlo.

### Nivel 2 — Componentes y responsabilidades

| Componente      | Responsabilidad                    | Fuente                                        |
| --------------- | ---------------------------------- | --------------------------------------------- |
| Dominio         | Invariantes independientes de UI   | [src/dominio](../src/dominio)                 |
| Aplicación      | Casos de uso, puertos y atomicidad | [src/aplicacion](../src/aplicacion)           |
| Infraestructura | IndexedDB, reloj e identidades     | [src/infraestructura](../src/infraestructura) |
| Presentación    | Calendario, editores y feedback    | [src/presentacion](../src/presentacion)       |
| Composición     | Conecta adaptadores y navegación   | [src/app](../src/app)                         |

Las flechas muestran el flujo de información entre componentes. Las transacciones y dependencias de código se detallan en los contratos de cada módulo.

### Nivel 3 — Dominio, contratos y adaptadores

IndexedDB detrás de puertos y transacciones de los adaptadores. Persistencia local por origen/navegador; no hay cuenta cloud implícita. Migraciones y respaldo son contratos versionados. Referencia conceptual no equivale a FK SQL; las invariantes se comprueban por aplicación y transacción.

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.

Consultar [04-base-de-datos.md](04-base-de-datos.md) para entidades, cardinalidades y representación; [05-motor-o-nucleo-de-negocio.md](05-motor-o-nucleo-de-negocio.md) para invariantes. Las piezas marcadas como propuestas pertenecen al diseño del prototipo.

### Nivel 4 — Despliegue y distribución

**Destino:** Webpage de validación.

```text
[Revisión de fuente] -> [Verificación de su plataforma] -> [Build / artefacto]
                                                                  |
                                                          [Instalación / hosting]
                                                                  |
                                                          [Usuario y sus datos]
```

La web estática se publica con el prefijo configurado para Pages. Los datos pertenecen al navegador y al origen: exporta un respaldo antes de cambiar de dominio, navegador o dispositivo. El capítulo [09-instalacion-y-despliegue.md](09-instalacion-y-despliegue.md) concreta la puesta en marcha.

### Calidad y límites arquitectónicos

- Pérdida de almacenamiento local sin respaldo
- Reglas comprensibles sólo para su autor
- Cronómetro/economía que incentiven comportamiento no deseado
- Confundir validación técnica con utilidad personal

El rendimiento y la capacidad dependen del entorno de ejecución. Consulta las guías de instalación y las limitaciones de cada plataforma antes de desplegar.

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
