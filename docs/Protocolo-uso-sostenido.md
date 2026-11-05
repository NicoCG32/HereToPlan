# Protocolo de uso sostenido

## 1. Propósito

El protocolo convierte el uso cotidiano de HereToPlan en evidencia trazable.
No busca acumular impresiones generales: registra una situación reproducible,
su efecto sobre la planificación y una decisión explícita de seguimiento.

El [instrumento de validación](Validacion-producto.md) define las hipótesis,
los escenarios de trabajo, estudio y vida personal, y el registro privado de
cada sesión. Al terminar una ronda se redacta una conclusión por hipótesis y
se decide qué corregir, mantener o volver a evaluar.

## 2. Ronda mínima

El diseño de una ronda comprende siete días consecutivos y al menos quince
minutos de uso por día. Registrar el comienzo y las sesiones realizadas;
si se interrumpe, conservar las fechas y describir la limitación.
El informe de fase debe considerar uso durante varias semanas, no únicamente
el cierre operativo de una ronda.

Cada día debe incluir consulta del calendario y, según la rotación, al menos uno
de estos recorridos:

1. crear una actividad sin fecha y asignarla después;
2. planificar bloques estrictos y flexibles en más de un contexto;
3. revisar, corregir y confirmar una selección;
4. cronometrar y resolver un bloque;
5. consultar puntos, Día libre y recuperación;
6. exportar y analizar un respaldo sin restaurarlo;
7. usar la aplicación a 320 px o con ampliación del navegador.

Utilizar planificación representativa. Cada sesión comienza comprobando que
la información del día anterior se recuperó correctamente.

## 3. Severidad

| Nivel         | Definición                                                                                     | Decisión predeterminada                                  |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| S0 bloqueante | Pérdida o corrupción de datos, acción irreversible inesperada o flujo esencial imposible       | Detener la ronda y corregir inmediatamente               |
| S1 alta       | Flujo esencial inaccesible, infracción WCAG A/AA o resultado incorrecto sin alternativa segura | Corregir antes del piloto o del siguiente despliegue     |
| S2 media      | Fricción relevante con alternativa comprensible y sin riesgo para los datos                    | Crear issue y programar en el siguiente bloque apropiado |
| S3 baja       | Mejora visual, textual o de comodidad sin pérdida funcional                                    | Incorporar al ajuste final o aceptar con justificación   |

## 4. Registro de incidencias

Registrar cada incidencia con identificador, fecha, versión, pasos, resultado
esperado y observado, severidad, decisión y estado o enlace de seguimiento.

Una fila nunca se elimina. Si el hallazgo no se reproduce, se conserva con la
decisión `No reproducible`, el entorno probado y al menos dos intentos. Si se
acepta temporalmente, debe constar el riesgo, la alternativa y la fecha de
revisión.

## 5. Bitácora diaria

Conservar la bitácora fuera del repositorio, utilizando el
[registro breve de sesión](Validacion-producto.md#registro-breve-y-privado).
Anotar fecha, duración, recorridos cubiertos, incidencias y resultado de cada
día. Publicar únicamente conclusiones agregadas y pasos anonimizados.

## 6. Cierre de una ronda

La ronda puede cerrarse cuando:

- no queda ninguna incidencia S0 o S1 abierta;
- cada incidencia S2 posee issue, responsable lógico y decisión;
- se completaron al menos cinco de los siete días, incluyendo un día móvil;
- se verificó recuperación de datos en una sesión posterior;
- la conclusión distingue defectos funcionales de preferencias visuales.

Los ajustes estéticos posteriores pueden agruparse, pero nunca deben rebajar
contraste, tamaño táctil, nombres accesibles ni previsibilidad del foco.

El mínimo de cinco días permite cerrar una ronda con limitaciones documentadas;
no convierte los días sin registro en completados. El informe distingue este
cierre de la decisión de fase y conserva como inconclusas las hipótesis sin
evidencia suficiente. Cada observación nueva enlaza su versión y las incidencias
reales con el Project.
