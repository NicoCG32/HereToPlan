# Validación de producto: preparación de la ronda

Preparación del **2026-10-11**, [#117](https://github.com/NicoCG32/HereToPlan/issues/117).
Contexto elegido: trabajo, estudio y vida personal. Base disponible:
`25788966a0dc0b2ae7c22c6b024d268188a36fcf`. Las fechas de ejecución y los
resultados se registrarán cuando existan sesiones reales.

El [protocolo](Protocolo-uso-sostenido.md) conserva la ronda histórica y sus
criterios. Este instrumento permite preparar otra ronda, registrar el uso y
redactar una conclusión por hipótesis. La
[guía de uso](Guia-uso.md) explica los controles disponibles; recurrir a ella
durante una sesión cuenta como asistencia y debe anotarse.

## Hipótesis y alcance de la versión

«Evaluable» indica que existe un recorrido en la interfaz; el resultado sigue
pendiente de observación. Una prueba automática demuestra reglas técnicas,
mientras que estas hipótesis preguntan por comprensión y utilidad en uso real.

| ID  | Hipótesis                                                   | Evidencia buscada                                                                                            | Alcance y referencia                                                                                                     |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| H1  | Separar actividad y bloque temporal mejora la planificación | Programar tiempo para una actividad, ajustar la estimación y explicar la diferencia con su fecha límite      | Evaluable: [crear, asignar y consultar](Guia-uso.md)                                                                     |
| H2  | Revisión y gracia reducen compromisos accidentales          | Comprender qué selección se confirma; distinguir corrección de captura de un cambio real de planes           | Evaluable: [cortes y corrección](../tests/gestionar-cortes-planificacion.test.ts)                                        |
| H3  | Se comprenden las políticas de flexibilidad                 | Predecir cuáles bloques admite Día libre y contrastarlo con su vista previa cuando hay una unidad disponible | Parcial: [Día libre](../tests/panel-dia-libre.test.tsx); aplicar depende del inventario                                  |
| H4  | El cronómetro guía sin ser obligatorio                      | Elegir medición o resolución manual, cerrar el bloque y explicar que detener el reloj no lo completa         | Evaluable: [modos y ejecución](Guia-uso.md)                                                                              |
| H5  | Tareas, proyectos y hábitos cubren trabajos reales          | Elegir un tipo adecuado y registrar categorías improvisadas o subtareas que no se pueden administrar         | Parcial: creación de tipos y hábitos; [composición completa pendiente en la interfaz](Dominio.md)                        |
| H6  | La recuperación compensa sobretrabajo sin incentivarlo      | Comprender minutos frente a puntos y observar si la recuperación influye en decisiones de carga              | Parcial: [banco de recuperación](../tests/panel-recuperacion.test.tsx); requiere excedente real y varias observaciones   |
| H7  | Las agendas heredadas reducen trabajo repetitivo            | Reutilizar una plantilla sin generar compromisos involuntarios                                               | Fuera del alcance ejecutable: [plantillas pendientes](Dominio.md); registrar necesidades, sin concluir sobre su utilidad |
| H8  | Libre reduce fricción y conserva planificación consciente   | Empezar a programar sin crear una agenda; crear una nombrada cuando aporta contexto                          | Evaluable: [contextos y calendario](../tests/interfaz-contextos-calendario.test.tsx)                                     |

H3 conserva una limitación adicional: Día libre cuesta inicialmente 1.500
puntos y cada bloque completado confirmado produce como máximo cuatro. Desde
saldo cero, adquirirlo requiere al menos 375 bloques, sin otros gastos. Es una
relación de las reglas vigentes, no una estimación de días de uso. La falta de
saldo o unidad se registra como ausencia de oportunidad; la comprensión de las
condiciones por sí sola no valida adquisición ni aplicación. La calibración
económica permanece abierta.

H6 se observa cuando el trabajo habitual deja excedente cronometrado; prolongar
una actividad para producir saldo cambiaría el comportamiento que se busca
estudiar. Una sesión sin excedente aporta contexto, pero no prueba el consumo.

## Siete escenarios representativos

Usar actividades propias y registrar sólo los escenarios pertinentes a cada
sesión. Las categorías de esta tabla orientan la elección; no son datos para
añadir automáticamente al calendario.

| Escenario                    | Recorrido                                                                                                                                                | Observación que registrar                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E1 · Trabajo sin fecha       | Crear una actividad real sin programar; después asignar un bloque a Libre                                                                                | Diferencia entre definición, fecha límite y tiempo programado; ayuda necesaria; H1/H8                |
| E2 · Estudio con contexto    | Crear una agenda nombrada si aporta valor y planificar un trabajo con fecha externa junto a otro flexible                                                | Motivo para usar la agenda, política elegida y expectativa sobre cambios; H1/H3/H8                   |
| E3 · Compromiso y corrección | Revisar una selección real y confirmar; corregir durante la gracia sólo si se necesita; volver en otra sesión                                            | Qué se creyó confirmado, errores de captura y recuperación del corte; H2                             |
| E4 · Ejecutar trabajo        | Resolver un bloque manual y, en otra oportunidad pertinente, usar el modo cronometrado                                                                   | Elección voluntaria, minutos previstos/medidos, resolución y claridad del cierre; H4                 |
| E5 · Rutina personal         | Crear un hábito real en un rango finito y consultar sus fechas; registrar si un proyecto necesita composición                                            | Tipo adecuado, duplicación o solución improvisada; alcance parcial de H5                             |
| E6 · Puntos y descanso       | Consultar movimientos y saldo; predecir el efecto de Día libre y usar su vista previa si existe una unidad; consultar recuperación si hay excedente real | Diferencia entre adquirir/aplicar, puntos/minutos, oportunidades ausentes y presión percibida; H3/H6 |
| E7 · Continuidad y respaldo  | Volver al mismo navegador/perfil y origen, comprobar datos, usar el calendario desde celular y exportar/analizar el respaldo propio                      | Recuperación, comprensión móvil, análisis sin escritura y fricciones de acceso                       |

Recargar y volver otro día son comprobaciones distintas. Registrar navegador,
perfil u origen diferente cuando cambien; sus datos locales son independientes.
El uso desde celular aporta evidencia de esa sesión y conserva el seguimiento
adicional de lector de pantalla y zoom real en
[#109](https://github.com/NicoCG32/HereToPlan/issues/109).

## Registro breve y privado

Copiar el siguiente bloque a un archivo personal fuera del repositorio. La
bitácora registra observaciones del usuario; una ejecución automática o una
demostración asistida se identifica como tal. Publicar conclusiones agregadas
y pasos anonimizados de incidencias, manteniendo nombres de actividades,
capturas personales y respaldos en el registro privado.

```text
Ronda:
Sesión / fecha / duración real:
Versión (commit o run de publicación):
Navegador / dispositivo / origen:
Escenario e hipótesis:
¿Se recuperaron los datos anteriores? Sí / No / No comprobado / Primera sesión
Qué intenté hacer:
Qué esperaba y qué ocurrió:
¿Necesité guía, explicación o una solución improvisada? ¿Cuál?
Utilidad / claridad / presión: 1–5 o No evaluado; motivo breve
Incidencia / severidad / issue o siguiente acción:
```

Escalas descriptivas: utilidad 1 = no ayudó, 5 = ayudó mucho; claridad 1 = no
pude entenderlo, 5 = lo entendí sin ayuda; presión 1 = ninguna, 5 = mucha.
Una puntuación se interpreta junto a su motivo, contexto y asistencia.

Mantener un registro de incidencias con fecha, versión, pasos, expectativa,
resultado, frecuencia, severidad S0–S3 y decisión según el protocolo. Una
incidencia publicada debe entrar en Backlog antes de implementarse y enlazarse
a la sesión mediante un identificador anónimo.

## Revisión de carga con denominadores

Al revisar la semana, declarar el período, los contextos y la fecha de consulta.
Estas métricas se obtienen del registro disponible; la aplicación no genera
automáticamente este informe.

| Medida                  | Numerador y denominador                                                                                      | Interpretación                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Cierre explícito        | Bloques completados o incumplidos / bloques confirmados del período cuya fecha ya pasó, excluyendo excusados | Excusados se cuentan aparte; denominador cero = No evaluable                          |
| Estimación y medición   | Por bloque cronometrado observado: minutos de sesiones finalizadas − minutos planificados                    | Registrar ambos valores y cantidad de bloques; Manual queda fuera de esta comparación |
| Correcciones de captura | Cortes corregidos por error de captura / cortes revisados observados                                         | Separar cambios de planes; registrar ambos conteos y causa                            |
| Cronómetro voluntario   | Bloques resueltos observados con medición elegida / bloques resueltos observados                             | Registrar el modo y motivo de elección; no convertir mayor uso en objetivo            |
| Asistencia              | Pasos que necesitaron ayuda / pasos observados                                                               | Anotar qué ayuda; dividir por sesiones o pasos distintos produce medidas distintas    |

Cuando falten datos para un numerador o denominador, registrar `No medido`.
Anotar intentos de recompensas permitidos/rechazados y su motivo como hechos
separados. La reutilización de plantillas queda `No evaluable` en esta versión.

## Conclusión y decisión de fase

Para cada H1–H8 completar:

```text
Hipótesis:
Resultado: sostenida / refutada / inconclusa / reemplazada
Sesiones y hechos que lo apoyan:
Hechos contrarios y asistencia:
Limitaciones o falta de oportunidad:
Cambio recomendado / issue / próximo experimento:
```

H5 requiere delimitar la parte observada. H7 queda inconclusa respecto al
producto disponible, con su experimento pendiente; preguntar si una plantilla
sería deseable no reemplaza observar su reutilización. H3 y H6 sin oportunidad
real conservan esa limitación explícita.

Cerrar una ronda operativa según el protocolo permite resumir aprendizajes.
La decisión de fase requiere además evidencia a lo largo de varias semanas,
vocabulario y flujos críticos comprensibles sin asistencia, aceptación de las
reglas, una decisión preliminar de economía y cambios priorizados. Su informe
debe decidir explícitamente **continuar, iterar o detener** y explicar el
tratamiento de hipótesis inconclusas. La preparación, las pruebas técnicas y
la publicación en Pages tienen su propia evidencia.
