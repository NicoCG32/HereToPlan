# 01 — Arquitectura por niveles

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Arquitectura del sistema por niveles

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

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

Las flechas del contexto representan comunicación/flujo. No se deduce una dependencia de código o transacción compartida sólo porque dos componentes intercambien datos.

### Nivel 3 — Dominio, contratos y adaptadores

IndexedDB detrás de puertos y transacciones de los adaptadores. Persistencia local por origen/navegador; no hay cuenta cloud implícita. Migraciones y respaldo son contratos versionados. Referencia conceptual no equivale a FK SQL; las invariantes se comprueban por aplicación y transacción.

- Una actividad puede existir sin bloque temporal.
- Confirmar conserva instantáneas; no autoriza borrar libremente compromisos históricos.
- Completar y acreditar deben ser atómicos e idempotentes.

Consultar [04-base-de-datos.md](04-base-de-datos.md) para entidades, cardinalidades y representación; [05-motor-o-nucleo-de-negocio.md](05-motor-o-nucleo-de-negocio.md) para invariantes. En un prototipo, las piezas rotuladas propuestas no son clases implementadas.

### Nivel 4 — Despliegue y distribución

**Destino:** Webpage de validación.

```text
[Revisión de fuente] -> [Verificación de su plataforma] -> [Build / artefacto]
                                                                  |
                                                          [Instalación / hosting]
                                                                  |
                                                          [Usuario y sus datos]
```

La persistencia y los servicios del contexto anterior conservan sus propias fronteras. Distribuir un APK no incorpora automáticamente el servidor, una PWA no acredita un instalador y el firmware requiere dispositivo. El capítulo [09-instalacion-y-despliegue.md](09-instalacion-y-despliegue.md) concreta la puesta en marcha.

### Calidad y límites arquitectónicos

- Pérdida de almacenamiento local sin respaldo
- Reglas comprensibles sólo para su autor
- Cronómetro/economía que incentiven comportamiento no deseado
- Confundir validación técnica con utilidad personal

No se publican garantías de latencia, disponibilidad o escala sin medición para la revisión/entorno concretos. Un diagrama explica responsabilidades; no es una certificación de ejecución o seguridad del servicio desplegado.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->
