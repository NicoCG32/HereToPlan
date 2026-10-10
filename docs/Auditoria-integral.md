# Auditoría integral de la validación

Fecha del corte: **2026-10-09**. Tarea:
[#104](https://github.com/NicoCG32/HereToPlan/issues/104). Base funcional:
`10670bdfb59d38724023a40ecc6b7faace8ce120`, tras integrar y publicar #83.
Este incremento modifica documentación, diagramas y comprobaciones de entrega;
no añade funciones de producto ni cambia esquemas de datos.

## Contratos contrastados

| Área                       | Implementación y evidencia                                                                                                                                                                                                         | Resultado del contraste                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Rutas                      | [RutasAplicacion](../src/app/rutas/RutasAplicacion.tsx), [pruebas](../tests/navegacion-aplicacion.test.tsx)                                                                                                                        | Cuatro rutas hash, redirección de entrada y ruta desconocida, una región principal                            |
| Perfil y HUD               | [Sesión](../src/presentacion/sesion/SesionAplicacion.tsx), [perfil](../tests/perfil-usuario.test.ts), [HUD](../tests/sesion-aplicacion.test.tsx), [persistencia](../tests/repositorio-perfil-indexeddb.test.ts)                    | Identidad local única; edición conserva identidad; saldo consultado y frase estable por apertura              |
| Calendario                 | [Consulta](../src/aplicacion/calendario/ConsultarCalendario.ts), [recarga vertical](../tests/flujo-calendario-indexeddb.test.tsx), [asignación](../tests/calendario-asignables.test.tsx)                                           | Contexto distinto de compromiso; planificación editable y corte confirmado; diálogo y reflujo móvil compactos |
| Revisión y gracia          | [Cortes](../tests/gestionar-cortes-planificacion.test.ts), [corrección persistente](../tests/flujo-correccion-indexeddb.test.ts), [sincronización](../tests/sincronizar-cortes-planificacion.test.ts)                              | La revisión no escribe; confirmar revisión inicia gracia; corrección integral y vencimiento persistido        |
| Puntos e inventario        | [Cumplimiento](../tests/completar-bloque-con-puntos.test.ts), [inventario](../tests/inventario-recompensas.test.ts), [billetera](../tests/billetera-persistencia.test.ts)                                                          | Resolución/ingreso y adquisición/gasto atómicos; adquirir y aplicar son hechos separados                      |
| Seguimiento y recuperación | [Edición de modos](../tests/editar-definiciones.test.ts), [cronómetro](../tests/gestionar-cronometro.test.ts), [registro temporal](../tests/sesion-cronometro-v1.test.ts), [recuperación](../tests/recuperacion-indexeddb.test.ts) | Modo explícito y protegido tras programar; medir no resuelve; minutos separados de puntos                     |
| Respaldo y reinicio        | [Restauración](../tests/restauracion-indexeddb.test.ts), [reinicio](../tests/reinicio-planificacion-indexeddb.test.ts), [interfaz](../tests/panel-respaldo.test.tsx)                                                               | Reemplazo atómico de quince colecciones; impacto vigente y conservación selectiva al reiniciar                |
| Tutorial                   | [Contrato](../tests/recorrido-tutorial.test.ts), [preferencias](../tests/preferencias-tutorial.test.ts), [App](../tests/guia-tutorial.test.tsx)                                                                                    | Recupera situaciones y pasos; reset independiente; conserva registros incompatibles y permite recuperación    |
| Composición y límites      | [Composición](../src/app/configurarAplicacion.ts), [ESLint](../eslint.config.js)                                                                                                                                                   | Adaptadores se construyen en app; aplicación y dominio no conocen React o infraestructura                     |

Los archivos de prueba enumerados son puntos de entrada representativos. La
suite completa incluye otros contratos de dominio, memoria e IndexedDB,
versionado, idempotencia, concurrencia y abortos. No se añadieron pruebas que
repitan la implementación sólo para aumentar la cifra.

## Discrepancias corregidas

- README y estilo hablaban de la SPA como futura. Se describe la composición
  vigente y se separa la entrada breve de la guía de uso y los contratos.
- Respaldo afirmaba que todos los registros eran V1. Las actividades actuales
  son V2; V1 se admite históricamente y se normaliza a seguimiento `MANUAL`.
- Dominio listaba como ausentes las reglas de tareas compuestas/proyectos,
  aunque ya existen y tienen pruebas. El pendiente real es su administración
  completa desde la interfaz.
- Arquitectura conservaba el puerto inicial de agendas y una adaptación móvil
  anterior. Se incluyen actualización/listado, frontera vigente, cuatro
  columnas mensuales y preferencia independiente de la guía.
- El diagrama de despliegue era una exportación histórica sin fuente de diseño
  disponible. Se sustituyó por SVG editable que separa pipeline, ejecución y
  datos por origen; las otras vistas se alinearon con ese corte. La inspección
  encontró y corrigió un solape entre `AplicacionRecompensa` y
  `FormulaPuntosBloque`, y un rótulo fuera de su panel. Los SVG se ajustan al
  ancho disponible sin cambiar el `viewBox`.
- La auditoría de accesibilidad podía interpretarse como conformidad completa
  o zoom real a partir de un ancho de 320 px. Se acota la evidencia histórica
  y se mantiene el seguimiento manual en #109.

### Diferencia contractual registrada

Una prueba aislada reprodujo que actualizar directamente `Libre` con otra
instancia sustituye su fecha de creación en memoria, mientras IndexedDB rechaza
la operación y conserva el registro. El caso de uso de edición ya rechaza
`Libre`; no se identificó esta modificación a través de la interfaz vigente.
La suite contractual cubre actualización de contextos nombrados, pero no ese
caso reservado. La corrección y su prueba compartida se registraron en
[#113](https://github.com/NicoCG32/HereToPlan/issues/113), Backlog/P2. La
discrepancia preexistente queda documentada sin cambiar comportamiento funcional
durante esta tarea.

## Calidad reproducible

La instalación limpia de este candidato usa Node `24.18.0`, npm `11.16.0` y
`npm ci` sobre el lockfile, en una copia separada que sólo incorpora las fuentes
versionadas y los cambios de esta tarea. El procedimiento está en
[Despliegue](Despliegue.md); la CI ejecuta además `verify:docs` y `audit:css`.

| Comprobación                    | Resultado del corte                                                   |
| ------------------------------- | --------------------------------------------------------------------- |
| Formato y lint                  | Aprobados                                                             |
| Suite completa con cobertura    | 426 pruebas, 73 archivos, aprobados                                   |
| Suite dedicada de accesibilidad | 43 pruebas, cuatro archivos, aprobados                                |
| Líneas / sentencias             | 85,53 %                                                               |
| Ramas                           | 84,34 %                                                               |
| Funciones                       | 89,96 %                                                               |
| Documentación                   | 13 documentos; cero destinos locales rotos                            |
| CSS                             | Ocho imports globales; cero comentarios y clases huérfanas detectadas |
| TypeScript, build y Pages       | Aprobados; artefacto bajo `/HereToPlan/`                              |

El aviso de Vite corresponde a un chunk JavaScript de 604,54 kB minificado,
156,49 kB gzip; no impide el build. Los umbrales y exclusiones de cobertura
permanecen intactos.

### Dependencias señaladas durante la instalación

`npm audit` informa 13 paquetes afectados: cuatro de severidad moderada, siete
alta y dos crítica. Son conteos de paquetes, no de ataques independientes.
`npm audit --omit=dev` informa dos paquetes de la cadena React Router por el
mismo [aviso RSC](https://github.com/advisories/GHSA-qwww-vcr4-c8h2).
El aviso limita su alcance a APIs RSC inestables; al contrastar la composición
HashRouter de esta SPA no se identifica ese modo, por lo que no se afirma
exposición demostrada en el sitio estático.

Vitest/Tinypool y otros transitivos requieren revisar herramientas de desarrollo
y CI; los [avisos de Tinypool](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
y [mocks de Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) tienen
condiciones propias. Npm propone, entre otras opciones, cambios mayores del
runner y coverage. El seguimiento se creó en
[#112](https://github.com/NicoCG32/HereToPlan/issues/112), Backlog, prioridad P1,
vinculado a M6. La instalación y pruebas aprobadas no equivalen a una auditoría
de dependencias sin avisos. No se modifica el lockfile ni se aplica una
actualización forzada dentro de este corte documental.

`verify:docs` comprueba destinos locales de enlaces e imágenes en README,
documentación y el índice de recursos. No navega sitios externos ni valida
fragmentos o semántica del contenido. La inspección del código y los diagramas
complementa esa comprobación.

La cobertura usa el alcance y umbrales existentes: dominio, aplicación y
persistencia; 85 % de líneas/sentencias y funciones y 80 % de ramas. No mide
todo el código React. La suite dedicada de accesibilidad es un subconjunto; las
otras pruebas también pueden ejecutar axe sobre sus estados.

## Persistencia y revisión

La búsqueda de APIs de almacenamiento en `src/presentacion/`, `src/app/`,
`src/aplicacion/` y `src/dominio/` no identifica acceso directo a IndexedDB,
localStorage o sessionStorage. El proveedor de tutorial invoca casos de uso
con un puerto inyectado; su adaptador concentra la API del navegador. Las
escrituras funcionales pasan por repositorios/unidades de trabajo. La ausencia
de coincidencias se complementa con revisión de imports y llamadas, no prueba
por sí sola una propiedad arquitectónica universal.

El diff se revisa para preservar rutas, esquemas, umbrales y recursos de
producto. El pipeline conserva permisos de lectura por defecto, credenciales
de checkout no persistentes y permisos de publicación sólo en el job de Pages.

## Evidencia que conserva su alcance

#107, #82 y #83 tienen aceptación visual del usuario, CI y publicación aprobadas.
En #83 se comprobó recuperación de paso activo, pausa, omisión y reinicio en
recargas reales del navegador integrado, además de tamaños entre 320 y 1280 px.
Son comprobaciones de esos incrementos, no un nuevo smoke remoto de #104.

En #104 se sirvió el artefacto limpio con Vite preview en un origen local de
prueba. Se creó únicamente un perfil de prueba desde la bienvenida, se
recorrieron las cuatro rutas esperando sus encabezados y se verificaron
títulos, una región principal y frase estable durante navegación. Recargar
recuperó el nombre desde la composición real, sin repetir la bienvenida; el
saldo se mantuvo en cero y la consola no mostró errores ni avisos. El recorrido
atraviesa interfaz, casos de uso, IndexedDB y reconstrucción de la interfaz;
no usa API ni backend y no modifica planificación del origen de desarrollo.

Los tres diagramas se abrieron en navegador. Se comprobaron textos dentro de
sus paneles, ausencia de solapes entre cajas del dominio tras la corrección y
conexiones de almacenamiento separadas; los tres SVG tienen XML válido.

La publicación previa de la base está confirmada por
[Actions #38006332096](https://github.com/NicoCG32/HereToPlan/actions/runs/38006332096).
Esta auditoría no repite una inspección automatizada del dominio público cuyo
acceso no estuvo disponible. Se verifican el artefacto y la CI del candidato;
no se presenta el éxito de Actions como ejecución de todos los recorridos en
un navegador remoto.

## Pendientes y decisiones

La diferencia de actualización directa de `Libre` entre adaptadores mantiene
seguimiento en [#113](https://github.com/NicoCG32/HereToPlan/issues/113),
Backlog/P2, con reproducción y criterio de conservación del registro original.

| Asunto                                                 | Estado y seguimiento                                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Lector de pantalla, Brave y zoom real adicionales      | Pospuestos por decisión del usuario; [#109](https://github.com/NicoCG32/HereToPlan/issues/109) en Backlog                                |
| Dependencias con avisos                                | [#112](https://github.com/NicoCG32/HereToPlan/issues/112), Backlog/P1; inventario, compatibilidad y comparación antes/después pendientes |
| Uso sostenido y decisión de fase                       | Seis días sin registrar; falta informe por hipótesis y decisión explícita; [protocolo](Protocolo-uso-sostenido.md)                       |
| Plantillas y recurrencia abierta                       | No implementadas; la hipótesis de plantillas requiere acotar el experimento                                                              |
| Administración de subtareas/proyectos y ajustes nuevos | Reglas de composición en dominio; interfaz completa, reprogramación y extensión pendientes                                               |
| Economía                                               | Fórmula inicial, costo y topes explícitos; calibración pendiente de observaciones                                                        |
| Procedencia y permiso del banco original de recursos   | No se da por resuelta por estar integrado; requiere confirmar su registro de origen                                                      |
| Tamaño del JavaScript                                  | Aviso de chunk de Vite; no se cambia el producto ni se divide código sólo para silenciarlo                                               |

Esta tarea deja documentación y verificación técnica coherentes. La épica y el
programa conservan pendientes; no se declara superada la fase de validación ni
se inicia una reimplementación de producción por obtener una CI aprobada.
