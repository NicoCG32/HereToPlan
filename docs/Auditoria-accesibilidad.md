# Auditoría de accesibilidad

## 1. Alcance

Esta auditoría verifica la presentación de HereToPlan conforme a WCAG 2.2 AA
en los recorridos que sostienen el producto: consulta del calendario, creación
de agenda, planificación de una fecha, confirmaciones destructivas, Rewards y
restauración de datos.

La ejecución registrada corresponde al 21 de julio de 2026 sobre la rama
`auditoria` y el commit base `3c2c5c9`.

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

| Aspecto              | Evidencia                                                                                                                                               | Resultado |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Teclado              | Los controles nativos son alcanzables y activables; las pruebas recorren apertura, cancelación, `Escape`, `Tab` y `Shift+Tab` en formularios y diálogos | Conforme  |
| Foco                 | Abrir una agenda enfoca `Nombre`; cancelar devuelve el foco a `Nueva agenda`; planificar una fecha enfoca `Crear primera actividad`                     | Conforme  |
| Foco visible         | Enlaces, botones y campos usan un contorno azul `#236797` de 3 px; su contraste mínimo contra `#e4e6e8` es 4,85:1                                       | Conforme  |
| Nombres accesibles   | El árbol accesible identifica todos los botones, enlaces, campos y selectores; a 320 px no se detectaron controles visibles sin nombre                  | Conforme  |
| Contraste            | Texto, acciones y gradientes se contrastaron contra el fondo claro más desfavorable                                                                     | Conforme  |
| Ampliación y reflujo | A 320 px, equivalente al criterio de reflujo a 400 % sobre 1280 px, documento, calendario, siete días y lista conservan el ancho disponible             | Conforme  |

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
