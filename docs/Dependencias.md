# Revisión de dependencias

## Actualización compatible — 2026-10-21, #122

La instalación limpia para la [revisión UX/UI](Revision-ux-ui.md) detectó cuatro
paquetes señalados: Vite con severidad alta, y Vitest, su mocker y coverage con
severidad moderada, incluidos avisos propagados. No contradice el resultado
histórico del 10 de octubre: corresponde a un corte posterior del registro.

| Paquete directo | Antes  | Después |
| --------------- | ------ | ------- |
| Vite            | 8.1.4  | 8.1.6   |
| Vitest          | 4.1.11 | 4.1.12  |
| Coverage V8     | 4.1.11 | 4.1.12  |

El manifiesto conserva rangos compatibles y eleva sus mínimos. El lockfile
sincroniza los paquetes internos de Vitest en 4.1.12. No se usa `--force`,
no se introducen overrides y se mantiene Node 24.18.0 y npm 11.16.0.

El [inventario de este corte](dependencias-auditoria-2026-10-21.json) guarda los
rangos y siete avisos propios únicos, además de su propagación entre los cuatro
paquetes. Incluye los avisos del mocker por
[registro de mocks](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) y
[redirecciones en Windows](https://github.com/advisories/GHSA-xp26-3454-mjgp).
La actualización se limita a herramientas de desarrollo y pruebas; no acredita
una explotación del sitio estático.

`npm ci` instala 246 paquetes y audita 247. `npm ls --all` confirma un árbol
válido; `npm audit` y `npm audit --omit=dev` terminan en cero avisos. La suite
completa pasa con 561 pruebas en 77 archivos y la cobertura mantiene 91,34 % de
sentencias, 80 % de ramas, 93,12 % de funciones y 92,20 % de líneas sobre el
mismo alcance. La tarea [#122](https://github.com/NicoCG32/HereToPlan/issues/122)
acompaña la entrega de #121 y su comprobación del artefacto.

## Corte histórico — 2026-10-10, #112

Fecha del corte: **2026-10-10**. Base: `0813980`, después de la auditoría
documental. [Tarea y evidencia](https://github.com/NicoCG32/HereToPlan/issues/112).
El resultado de npm audit pasa de trece paquetes señalados a cero; no modifica
reglas de planificación, esquemas persistentes ni comportamiento de la interfaz.

## Inventario y resolución

La severidad es la reportada por npm para cada paquete. Incluye avisos propios
y propagados; trece paquetes no equivalen a trece ataques independientes.
El [inventario completo en JSON](dependencias-auditoria-2026-10-10.json) conserva
cada aviso, rango, severidad, propagación y cadena del corte, junto con versiones
anteriores y posteriores.

| Paquete                    | Relación / uso                                    | Antes         | Después                  | Severidad inicial |
| -------------------------- | ------------------------------------------------- | ------------- | ------------------------ | ----------------- |
| `vitest`                   | Directa, pruebas                                  | 3.2.7         | 4.1.11                   | Crítica           |
| `@vitest/coverage-v8`      | Directa, cobertura                                | 3.2.7         | 4.1.11                   | Moderada          |
| `@vitest/mocker`           | Transitiva de Vitest, pruebas                     | 3.2.7         | 4.1.11                   | Moderada          |
| `tinypool`                 | Transitiva de Vitest, workers                     | 1.1.1         | Retirada                 | Crítica           |
| `postcss`                  | Directa y usada por Vite, compilación             | 8.5.18        | 8.5.29                   | Moderada          |
| `nanoid`                   | Transitiva de PostCSS, compilación                | 3.3.16        | 3.3.20                   | Alta              |
| `source-map-js`            | Transitiva de PostCSS y herramientas, compilación | 1.2.1         | 1.2.2                    | Alta              |
| `browserslist`             | Transitiva de Babel, compilación                  | 4.28.6        | 4.29.3                   | Alta              |
| `baseline-browser-mapping` | Transitiva de Browserslist, compilación           | 2.10.43       | 2.11.28                  | Moderada          |
| `brace-expansion`          | Transitiva de minimatch/glob, herramientas        | 5.0.7 y 2.1.2 | 5.0.12; copia 2 retirada | Alta              |
| `undici`                   | Transitiva de JSDOM, pruebas                      | 7.28.0        | 7.30.0                   | Alta              |
| `react-router-dom`         | Directa, aplicación                               | 7.18.1        | 7.18.4                   | Alta              |
| `react-router`             | Transitiva del router, aplicación                 | 7.18.1        | 7.18.4                   | Alta              |

El manifiesto eleva Vitest y coverage a `^4.1.11`, el mínimo del router a
`^7.18.2` y conserva el pin exacto de PostCSS en `8.5.29`. Node `24.18.0`,
React/React DOM, Vite 8 y TypeScript mantienen sus versiones declaradas.

Vitest 4.1.11 corrige el [aviso del mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
El árbol instalado confirma que Tinypool ya no está presente. Se eligió esa
rama en lugar de saltar a Vitest 5 por la recomendación automática. Los pares
de runner y coverage son compatibles y `npm ls --all` termina correctamente.

Primero se resolvieron esas dependencias directas; el corte intermedio dejó
cuatro avisos de desarrollo. Una actualización compatible del lockfile resolvió
los transitivos. No se usaron `--force`, overrides ni cambios mayores impuestos
fuera de los rangos de sus paquetes padres.

## Avisos y alcance

El [aviso del router](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) aplica a
APIs RSC inestables; esta composición usa HashRouter en una SPA estática y no
se identificó ese modo. Se actualiza la rama compatible igualmente, sin afirmar
exposición demostrada en Pages. Vitest y Tinypool pertenecían a herramientas de
pruebas, no al JavaScript del producto. Los avisos de workers requieren revisar
sus propias condiciones: [opciones de worker](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
y [opciones de ejecución](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).

Otros avisos del inventario incluyen [PostCSS](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp),
[nanoid](https://github.com/advisories/GHSA-2v37-7h3g-55p8),
[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
[Browserslist](https://github.com/advisories/GHSA-c83g-rgw3-j3cx),
[baseline-browser-mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv)
y la [expansión de llaves](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).
Undici incluye varios avisos de transporte, entre ellos
[descompresión](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) y
[validación TLS](https://github.com/advisories/GHSA-w293-vg96-wgc3).
El archivo versionado conserva el inventario completo por aviso; los enlaces aquí son puntos
de entrada representativos, no una enumeración de ataques aplicables al producto.

## Verificación limpia

| Comprobación                             | Resultado                                                           |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Runtime                                  | Node 24.18.0, npm 11.16.0                                           |
| Instalación                              | `npm ci`, lockfile vigente, 246 paquetes instalados / 247 auditados |
| `npm audit` completo                     | 13 → 0 paquetes señalados                                           |
| `npm audit --omit=dev`                   | 2 → 0                                                               |
| Suite completa                           | 553 pruebas en 76 archivos                                          |
| Suite dedicada de accesibilidad          | 43 pruebas en cuatro archivos                                       |
| Líneas                                   | 92,20 %                                                             |
| Sentencias                               | 91,34 %                                                             |
| Ramas                                    | 80,00 %                                                             |
| Funciones                                | 93,11 %                                                             |
| Alcance de cobertura                     | Mismos 144 archivos de origen, globs y exclusiones                  |
| Formato, lint, TypeScript, build y Pages | Aprobados en copia limpia                                           |

### Cambio del cálculo de cobertura

Con las 426 pruebas iniciales, el nuevo remapeo V8 produjo 74,95 % de ramas.
Se conservaron los umbrales —85 % de líneas/sentencias y funciones, 80 % de
ramas— y se completaron escenarios que faltaban. No se añadieron exclusiones ni
se modificó `vitest.config.ts`. Los contadores de Vitest 3 y 4 no son directamente
comparables; las cifras nuevas no significan que el producto haya cambiado.
[Referencia de migración](https://v4.vitest.dev/guide/migration).

Las 127 pruebas nuevas comprueban disponibilidad real de IndexedDB y base
predeterminada, conservación de una base futura, bloqueo por otra conexión,
registros incompatibles/corruptos, metadatos de actividades y conflictos o
reintentos de cumplimiento e inventario. Se usan puertos y eventos de
fake-indexeddb, sin invocar métodos privados ni simular una escritura desde React.

### Recorrido del artefacto

El preview se ejecuta en un origen local de prueba, separado del desarrollo.
Recuperó el perfil anterior y permitió las cuatro rutas con sus títulos y una
región principal. Una actividad creada en Crear se asignó a Libre, se recuperó
tras recargar y se editó de 30 a 45 minutos, conservados en otra recarga. Una
ruta desconocida redirigió a Calendario. Consola sin errores ni avisos.

Ese recorrido comprueba interfaz → casos de uso → IndexedDB → reconstrucción
de la interfaz con las nuevas dependencias; no requiere API ni backend. No se
atribuyen pruebas adicionales de Brave, lector o zoom real a este smoke, ni se
repitió una visita automatizada al dominio público previamente no disponible.

## Comprobación en futuras entregas

La CI incorpora `npm audit` después de instalar el lockfile. La comprobación
completa incluye desarrollo porque los avisos iniciales afectaban pruebas y
workers. Un aviso posterior requiere una evaluación y actualización concreta;
no se silencia mediante una ejecución que siempre devuelva éxito.

La ausencia de avisos corresponde al registro consultado en este corte y al
árbol reproducible. No certifica todo el software del equipo ni sustituye las
otras comprobaciones. [Entrega](Despliegue.md) y [auditoría integral](Auditoria-integral.md).
