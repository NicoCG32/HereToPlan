# Protocolo de uso sostenido

## 1. Propósito

El protocolo convierte el uso cotidiano de HereToPlan en evidencia trazable.
No busca acumular impresiones generales: registra una situación reproducible,
su efecto sobre la planificación y una decisión explícita de seguimiento.

## 2. Ronda mínima

Una ronda comprende siete días consecutivos y al menos quince minutos de uso
por día. La primera ronda queda fijada entre el 21 y el 27 de julio de 2026.

Cada día debe incluir consulta del calendario y, según la rotación, al menos uno
de estos recorridos:

1. crear una actividad sin fecha y asignarla después;
2. planificar bloques estrictos y flexibles en más de un contexto;
3. revisar, corregir y confirmar una selección;
4. cronometrar y resolver un bloque;
5. consultar puntos, Día libre y recuperación;
6. exportar y analizar un respaldo sin restaurarlo;
7. usar la aplicación a 320 px o con ampliación del navegador.

No deben crearse datos ficticios para ocultar un estado vacío. El protocolo se
ejecuta sobre planificación representativa y cada sesión comienza comprobando
que la información del día anterior se recuperó correctamente.

## 3. Severidad

| Nivel         | Definición                                                                                     | Decisión predeterminada                                  |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| S0 bloqueante | Pérdida o corrupción de datos, acción irreversible inesperada o flujo esencial imposible       | Detener la ronda y corregir inmediatamente               |
| S1 alta       | Flujo esencial inaccesible, infracción WCAG A/AA o resultado incorrecto sin alternativa segura | Corregir antes del piloto o del siguiente despliegue     |
| S2 media      | Fricción relevante con alternativa comprensible y sin riesgo para los datos                    | Crear issue y programar en el siguiente bloque apropiado |
| S3 baja       | Mejora visual, textual o de comodidad sin pérdida funcional                                    | Incorporar al ajuste final o aceptar con justificación   |

## 4. Registro de incidencias

| ID        | Fecha      | Versión                          | Contexto y pasos                                                  | Resultado observado                                         | Severidad | Decisión                    | Estado o enlace         |
| --------- | ---------- | -------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | --------- | --------------------------- | ----------------------- |
| `ACC-001` | 2026-07-21 | `3c2c5c9` + cambios de auditoría | Ejecutar axe sobre la pantalla completa                           | Tres nombres ARIA dependían de elementos sin rol compatible | S1        | Corregir antes de cerrar M3 | Resuelta en `auditoria` |
| `ACC-002` | 2026-07-21 | `3c2c5c9` + cambios de auditoría | Revisar contraste del texto y del botón primario sobre gradientes | Algunos extremos no garantizaban 4,5:1                      | S1        | Corregir antes de cerrar M3 | Resuelta en `auditoria` |

Una fila nunca se elimina. Si el hallazgo no se reproduce, se conserva con la
decisión `No reproducible`, el entorno probado y al menos dos intentos. Si se
acepta temporalmente, debe constar el riesgo, la alternativa y la fecha de
revisión.

## 5. Bitácora diaria

| Día | Fecha      |          Duración | Recorridos cubiertos                                        | Incidencias          | Resultado        |
| --: | ---------- | ----------------: | ----------------------------------------------------------- | -------------------- | ---------------- |
|   1 | 2026-07-21 | Auditoría técnica | Calendario, formularios, diálogos, Rewards, respaldo, móvil | `ACC-001`, `ACC-002` | Ambas corregidas |
|   2 | 2026-07-22 |         Pendiente |                                                             |                      |                  |
|   3 | 2026-07-23 |         Pendiente |                                                             |                      |                  |
|   4 | 2026-07-24 |         Pendiente |                                                             |                      |                  |
|   5 | 2026-07-25 |         Pendiente |                                                             |                      |                  |
|   6 | 2026-07-26 |         Pendiente |                                                             |                      |                  |
|   7 | 2026-07-27 |         Pendiente |                                                             |                      |                  |

## 6. Cierre de una ronda

La ronda puede cerrarse cuando:

- no queda ninguna incidencia S0 o S1 abierta;
- cada incidencia S2 posee issue, responsable lógico y decisión;
- se completaron al menos cinco de los siete días, incluyendo un día móvil;
- se verificó recuperación de datos en una sesión posterior;
- la conclusión distingue defectos funcionales de preferencias visuales.

Los ajustes estéticos posteriores pueden agruparse, pero nunca deben rebajar
contraste, tamaño táctil, nombres accesibles ni previsibilidad del foco.
