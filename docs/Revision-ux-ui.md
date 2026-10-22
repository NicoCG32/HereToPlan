# Revisión de UX/UI — 2026-10-21

La revisión de [#121](https://github.com/NicoCG32/HereToPlan/issues/121) detectó
y corrigió cuatro problemas reproducibles de orientación, foco y jerarquía
visual. Se ejecutó con datos de prueba en un origen local independiente de la
planificación personal. Es una revisión experta con recorridos completos; no
representa entrevistas ni semanas de uso cotidiano.

## Criterios observables

Las referencias son [WCAG 2.2](https://www.w3.org/TR/WCAG22/) y las
[heurísticas de usabilidad de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/).
Se aplican como criterios de revisión, sin declarar conformidad completa:

| Criterio                         | Comprobación                                                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orientación y consistencia       | Un título principal por ruta, jerarquía de encabezados y acciones con nombres concretos.                                                                                                                              |
| Control y visibilidad del estado | Guardar, cancelar, revisar y confirmar producen resultados distinguibles; recargar no repite una petición ya atendida.                                                                                                |
| Teclado y foco                   | Acceso equivalente a los arrastres, foco visible, retorno al origen y recorrido contenido en los diálogos (2.1.1, 2.4.3, 2.4.7 y 2.4.11).                                                                             |
| Reflujo y controles              | Cuatro rutas entre 320 y 430 px y en escritorio, sin desbordamiento horizontal; objetivo de comodidad móvil de 44 px para controles. El mínimo AA de 2.5.8 es 24 px y contempla excepciones.                          |
| Comprensión y errores            | Etiquetas asociadas, error explicado junto al campo, validación antes de guardar y análisis de respaldo antes de reemplazar datos (3.3.1, 3.3.2, 4.1.2 y 4.1.3).                                                      |
| Contraste                        | Se conservan paleta, contorno de foco de 3 px y contrastes documentados de texto y controles (1.4.3 y 1.4.11). La reducción de encabezados no los convierte en texto que necesite el umbral reducido de texto grande. |

La [auditoría de accesibilidad](Auditoria-accesibilidad.md) conserva las
relaciones de contraste y el alcance de axe. Los textos revisados describen
la acción y su consecuencia en el lenguaje del producto, sin exigir conocer
casos de uso, almacenamiento o versiones de migración.

## Hallazgos y correcciones

S1 significa una barrera de acceso importante; S2, pérdida de orientación o
repetición inesperada de un flujo; S3, fricción visual sin impedir la operación.

| ID       | Antes                                                                                                                                                          | Corrección y resultado                                                                                                                                                                                       | Severidad |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| UX121-01 | Guardar o cancelar en Crear desmontaba el formulario y dejaba el foco en el cuerpo del documento.                                                              | El editor recuerda el control que lo abrió y le devuelve el foco al guardar o cancelar, también al editar actividades y agendas. Guardar y asignar sigue navegando a Calendario.                             | S2        |
| UX121-02 | A 1280 × 720, el título de panel medía 48 px y superaba al título de página de 40,96 px. Con la oferta inicial de guía, Planificar fecha empezaba en y=992 px. | Títulos de panel entre 20,8 y 26,4 px, inferiores al título de página; menos relleno y descripciones más breves. Se mantienen ilustraciones, identidad, etiquetas y acciones.                                | S3        |
| UX121-03 | Crear y asignar dejaba actividad/fecha en la URL. Después de guardar o cancelar, recargar reabría el diálogo de asignación.                                    | Se captura la solicitud inicial y se consumen esos dos parámetros mediante reemplazo del historial, conservando los demás. Recargar reconstruye los bloques sin reabrir el editor.                           | S2        |
| UX121-04 | En móvil, los enlaces del menú cerrado seguían en el orden de Tab. Con el menú abierto, el foco escapaba al contenido cubierto.                                | El menú cerrado queda oculto también para teclado. Abierto tiene semántica de diálogo, fondo inerte, vuelta de Tab/Shift+Tab y cierre con Escape. Al ampliar a escritorio se liberan fondo y desplazamiento. | S1        |

Las pruebas de interacción reprodujeron los fallos de foco y parámetros antes
de corregirlos. Se añaden seis casos de regresión entre Crear, navegación y
reconstrucción completa de App con IndexedDB, sin modificar reglas de dominio,
esquemas, umbrales ni exclusiones de cobertura.

## Recorridos en navegador

El navegador integrado ejecutó la composición real de la aplicación con
IndexedDB. Perfil de prueba, dos actividades manuales y una agenda nombrada:

1. Validación de título vacío, creación sin programar, edición y cancelación;
   el error conserva la relación con Título y el cierre recupera el foco.
2. Asignación flexible a Libre y estricta a la agenda, con fechas y minutos
   distintos. La recarga conserva ambos bloques y no reabre la solicitud.
3. Selección, revisión y confirmación; transcurso real del período de gracia,
   cumplimiento manual y un movimiento de +1 punto, conservado tras recargar.
4. Puntos muestra el ingreso y el saldo; la recompensa de 1500 puntos explica
   cuánto falta y su compra permanece deshabilitada. No se simularon fondos.
5. Exportación y análisis del JSON generado: formato V3, dos bloques, una
   resolución y un movimiento. Vista previa de restauración y reinicio,
   confirmaciones inicialmente deshabilitadas y cancelación sin cambios.
6. Archivo con JSON inválido: error comprensible y retirada de la propuesta de
   restauración anterior. El saldo y la planificación permanecen disponibles.
7. Teclado del menú móvil cerrado/abierto, Escape, retorno del foco y cambio
   de ancho con el menú abierto. Cuatro rutas en 320, 360, 390, 430 y 1280 px.

En las veinte combinaciones se mantiene una región principal y un h1, con el
título de documento correspondiente y sin desbordamiento horizontal. Los anchos
útiles medidos fueron 305, 345, 375, 415 y 1265 px, respectivamente. Los controles
móviles revisados conservan el objetivo táctil de 44 px, incluyendo las etiquetas
activables de casillas y selección de archivos. En escritorio el título de página
mide 35,84 px y el de panel 25,6 px. Con la guía pospuesta, Planificar fecha queda
en y=665 px; esa posición no se compara como una reducción exacta con la línea
base, que tenía la oferta inicial de guía abierta.

No se ejecutó un reinicio destructivo ni una sustitución del estado para esta
revisión. Sus transacciones y reversión tienen cobertura de pruebas existente.
El recorrido comprueba interfaz → casos de uso → IndexedDB → interfaz; esta
aplicación estática no requiere una API para ese trayecto.

## Verificación y límites

La copia limpia con Node 24.18.0 y npm 11.16.0 supera 561 pruebas en 77
archivos. La cobertura es 91,34 % de sentencias, 80 % de ramas, 93,12 % de
funciones y 92,20 % de líneas sobre los mismos 144 archivos de origen.
La suite dedicada de accesibilidad, formato, lint, documentación, auditoría CSS,
TypeScript, build y verificación del artefacto Pages completan la entrega.

El preview de producción recupera el perfil, los dos bloques y el punto del
recorrido. Permite editar el bloque estricto de 45 a 50 minutos, devuelve el
foco a Editar y conserva el cambio al recargar, sin un diálogo abierto.

La instalación limpia detectó avisos posteriores al corte de #112. La tarea
[#122](https://github.com/NicoCG32/HereToPlan/issues/122) actualiza sólo parches
compatibles de Vite y Vitest; [Dependencias](Dependencias.md) conserva el corte.

La evaluación visual y de teclado corresponde al navegador integrado. El
acceso nativo a Brave no pudo determinar su URL de forma fiable y se detuvo.
No se atribuyen pruebas de Brave, lector de pantalla o zoom real: siguen en
[#109](https://github.com/NicoCG32/HereToPlan/issues/109). Tampoco se sustituye
el seguimiento longitudinal de [#119](https://github.com/NicoCG32/HereToPlan/issues/119).
La publicación se confirma mediante el workflow de Pages; este informe no
atribuye una nueva visita automatizada al dominio público.
