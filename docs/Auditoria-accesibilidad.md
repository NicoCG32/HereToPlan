# Auditoría de accesibilidad

## 1. Alcance

Esta auditoría registra comprobaciones de presentación basadas en criterios
WCAG 2.2 A/AA en recorridos que sostienen el producto: consulta del calendario, creación
de agenda, planificación de una fecha, confirmaciones destructivas, Rewards y
restauración de datos.

Las secciones 2–4 conservan la ejecución histórica del 21 de julio de 2026,
rama `auditoria`, commit base `3c2c5c9`. Las secciones posteriores añaden los
incrementos revisados. No constituye una certificación completa de conformidad:
lector de pantalla y ampliación real adicional siguen en
[#109](https://github.com/NicoCG32/HereToPlan/issues/109).

## 2. Auditoría automática

La suite utiliza `axe-core` 4.12.1 y se ejecuta mediante:

```bash
npm run test:a11y
```

Los escenarios automatizados cubren:

- calendario vacío, formulario de agenda y editor de una fecha;
- diálogo de eliminación de una agenda;
- vista previa y diálogo de canje de Día libre;
- preparación y confirmación de una restauración.

La comprobación de CI evalúa reglas WCAG A, AA y buenas prácticas. El contraste
se excluye únicamente del entorno JSDOM porque no compone fondos ni gradientes;
se comprueba en navegador y se documenta en la revisión manual.

La ejecución en navegador produjo 39 reglas aprobadas, ninguna infracción y
ningún resultado incompleto distinto de contraste. Los gradientes impidieron
que el motor decidiera automáticamente 187 muestras, por lo que se verificaron
sus extremos cromáticos de forma conservadora.

## 3. Revisión manual

| Aspecto            | Evidencia                                                                                                                                               | Resultado                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Teclado            | Los controles nativos son alcanzables y activables; las pruebas recorren apertura, cancelación, `Escape`, `Tab` y `Shift+Tab` en formularios y diálogos | Conforme                 |
| Foco               | Abrir una agenda enfoca `Nombre`; cancelar devuelve el foco a `Nueva agenda`; planificar una fecha enfoca `Crear primera actividad`                     | Conforme                 |
| Foco visible       | Enlaces, botones y campos usan un contorno azul `#236797` de 3 px; su contraste mínimo contra `#e4e6e8` es 4,85:1                                       | Conforme                 |
| Nombres accesibles | El árbol accesible identifica todos los botones, enlaces, campos y selectores; a 320 px no se detectaron controles visibles sin nombre                  | Conforme                 |
| Contraste          | Texto, acciones y gradientes se contrastaron contra el fondo claro más desfavorable                                                                     | Conforme                 |
| Reflujo a 320 px   | Documento, calendario, siete días y lista conservan el ancho disponible; corresponde al ancho CSS del criterio sobre 1280 px, sin demostrar zoom real   | Comprobado en ese tamaño |

### 3.1. Contrastes mínimos conservadores

| Uso                           | Primer plano | Fondo de referencia | Relación |
| ----------------------------- | -----------: | ------------------: | -------: |
| Texto principal               |    `#25282d` |           `#e4e6e8` |  11,82:1 |
| Texto secundario              |    `#5a6068` |           `#e4e6e8` |   5,07:1 |
| Enlaces y foco                |    `#236797` |           `#e4e6e8` |   4,85:1 |
| Estado verde                  |    `#20744f` |           `#e4e6e8` |   4,57:1 |
| Estado dorado                 |    `#7d5420` |           `#e4e6e8` |   5,31:1 |
| Botón primario, extremo verde |    `#ffffff` |           `#20744f` |   5,72:1 |
| Botón primario, extremo azul  |    `#ffffff` |           `#236797` |   6,07:1 |

La interpolación del botón principal ocurre entre los dos extremos oscuros. El
reflejo animado es decorativo, breve y se elimina cuando el usuario solicita
movimiento reducido.

## 4. Incidencias encontradas

| ID        | Incidencia                                               | Severidad | Decisión                    | Estado                                                         |
| --------- | -------------------------------------------------------- | --------- | --------------------------- | -------------------------------------------------------------- |
| `ACC-001` | `aria-label` aplicado a contenedores sin rol semántico   | S1 alta   | Corregir antes de cerrar M3 | Resuelta: grupo explícito y saldos representados como `output` |
| `ACC-002` | Colores intermedios y gradiente primario sin garantía AA | S1 alta   | Corregir antes de cerrar M3 | Resuelta: tonos textuales y extremos del gradiente oscurecidos |

No quedan incidencias S0 o S1 abiertas. El seguimiento de hallazgos durante el
uso cotidiano continúa mediante el
[protocolo de uso sostenido](Protocolo-uso-sostenido.md).

## 5. Condición de repetición

La auditoría debe repetirse cuando cambien la paleta, la jerarquía de foco, un
diálogo, un control personalizado o la estructura del calendario. Una prueba
automática aprobada no reemplaza la revisión manual de contraste, ampliación ni
comprensión del flujo.

## 6. Candidato de asignación compacta — #107

La revisión de este incremento añade un diálogo para asignar, editar y crear
actividades desde Calendario. El fondo queda inerte mientras está abierto y el
foco recorre sus controles, incluido el resumen desplegable del día. Se comprobó
en navegador la vuelta de `Tab` y `Shift+Tab` entre sus extremos, cancelación con
`Escape` y retorno al origen; guardar conserva la posición y recupera el control
después de la consulta, incluso cuando la actividad cambia de grupo.

Las pruebas con axe cubren la apertura del editor. La suite también verifica
consulta de una fecha fuera del mes, actualización del nombre del diálogo y
descarte del detalle anterior ante un error de consulta.

En el candidato local, a 360, 390 y 430 px no se detectó desbordamiento horizontal.
Los botones de día miden respectivamente 54, 61,5 y 71,5 px de ancho, con 72 px de
alto. Los campos, botones y etiquetas de política del diálogo conservan un área
de al menos 44 px. A 320 px, usado como comprobación de reflujo, los botones de
día miden 44 × 72 px y el foco inicial queda visible dentro del diálogo.

La superficie mensual pasó de aproximadamente 1.638 a 822 px de alto a 390 px,
con el detalle disponible en el editor y la lista equivalente. No se añaden
animaciones al patrón. El usuario aceptó la mejora visual y el funcionamiento.
Las comprobaciones adicionales con lector de pantalla y ampliación real se
pospusieron y se conservan en #109; no se declaran realizadas a partir del árbol
accesible o del reflujo medido.

## 7. Tutorial contextual — #82

La oferta inicial no toma el foco y espera la bienvenida del perfil. Cerrar con
`Escape`, posponer y continuar conservan el paso; omitir permite seguir usando
las cuatro rutas. El control explícito para ir al destino devuelve el foco a la
indicación, y «Ver control» enfoca el elemento señalado. La guía sólo permite
avanzar cuando el destino y las condiciones del paso están disponibles.

Las pruebas axe incluyen oferta inicial, diálogo de revisión con indicación
contextual y recorrido completado. También se comprueban cambios de ruta y
contexto, actividad guardada, asignación cancelada o fallida, revisión fallida,
confirmación y uso de datos existentes sin operaciones iniciadas por la guía.

El candidato se comprueba en el navegador integrado a 320, 360, 390, 430 y
1.265 px. La guía no presenta desbordamiento horizontal y sus acciones conservan
una altura mínima de 44 px. A 390 px, el paso de actividad mide aproximadamente
347 px de alto; puede cerrarse o posponerse. No añade animaciones. Estas pruebas
no se presentan como validación de Brave, lector de pantalla o zoom real.

## 8. Progreso persistente — #83

La oferta se decide después de leer el progreso: pausa, omisión y término no
producen una oferta nueva al recargar. El reinicio es una acción nombrada y
visible, independiente del reinicio de planificación. Recuperar una lectura
de un paso pospuesto devuelve el foco a «Continuar guía» cuando se oculta la
tarjeta; los estados de recuperación y error de guardado se comprueban con axe.

Se verifican con pruebas de App reconstrucciones mediante adaptadores nuevos,
avance activo, pausa, omisión, término, reinicio, registros incompatibles o
ilegibles, bloqueo de lectura, fallo de guardado, reintento del avance reciente
y ausencia de escrituras o comandos duplicados al renderizar en StrictMode.

En el navegador integrado se comprobaron recargas reales del paso 2 activo y
pospuesto, omisión y reinicio. A 320, 360, 390, 430 y 1.280 px no se detectó
desbordamiento horizontal, y acceso, reinicio y acciones de la guía conservaron
al menos 44 px de alto. La consola no mostró errores. Lector de pantalla,
Brave y ampliación real adicionales mantienen su seguimiento pospuesto en #109.

## 9. Corte de auditoría integral — 2026-10-09

La suite dedicada contiene 43 pruebas en cuatro archivos. Axe evalúa los estados
de calendario, Día libre, respaldo y guía; otras suites comprueban navegación,
perfil/HUD, teclado, retorno de foco y modos. Esta distribución no significa
que se haya ejecutado axe sobre todas las pantallas y combinaciones posibles.
El [informe integral](Auditoria-integral.md) conserva trazabilidad y resultados.

Los resultados a 320–430 px y la aceptación visual de #107, #82 y #83 se
conservan como evidencia de esos incrementos. No equivalen a una nueva revisión
con lector de pantalla, Brave o zoom real para esta auditoría documental.
