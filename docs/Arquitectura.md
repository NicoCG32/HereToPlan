# Contrato de arquitectura de HereToPlan

## 1. Decisión arquitectónica

HereToPlan adopta una **arquitectura hexagonal**, también denominada arquitectura de puertos y adaptadores. El código se distribuye en directorios que pueden parecer capas, pero su propiedad esencial no es el orden vertical de esas carpetas: es la protección del núcleo y la dirección de las dependencias.

El dominio y los casos de uso constituyen el interior de la aplicación. React, el navegador, la persistencia y cualquier integración futura son mecanismos externos conectados mediante adaptadores. El núcleo no conoce esos mecanismos ni depende de ellos.

La formulación precisa para este proyecto es:

> Arquitectura hexagonal con separación interna entre aplicación y dominio, y con composición explícita de adaptadores.

No se utilizará «arquitectura en capas» como denominación principal. Presentación, aplicación, dominio e infraestructura describen responsabilidades organizativas, pero los contratos entre ellas siguen el modelo de puertos y adaptadores.

## 2. Vistas arquitectónicas

### 2.1. Componentes: puertos y adaptadores

La vista `Componentes` representa el hexágono lógico, los puertos y los adaptadores definidos para HereToPlan.

![Diagrama de componentes de HereToPlan](arquitectura-componentes.svg)

### 2.2. Despliegue: GitHub Actions y GitHub Pages

La vista `Despliegue` muestra cómo el código pasa del repositorio al sitio público y dónde se ejecuta la aplicación. El almacenamiento personal permanece en el navegador y no forma parte de los artefactos publicados.

![Diagrama de despliegue de HereToPlan](arquitectura-despliegue.svg)

#### Contrato de entrega continua

El workflow de GitHub Actions separa dos responsabilidades:

1. `calidad` restaura el lockfile, comprueba formato y arquitectura, ejecuta las
   pruebas con cobertura, construye `dist/` y valida sus referencias estáticas;
2. `desplegar` solo se ejecuta para cambios aceptados en `main`, depende del job
   de calidad y publica exactamente el artefacto producido por este.

El workflow posee permiso de lectura del contenido por defecto. Únicamente el
job de despliegue obtiene `pages: write` e `id-token: write`, necesarios para la
publicación mediante GitHub Pages.

Vite construye con `base: "/HereToPlan/"` porque el sitio pertenece a un
repositorio de proyecto y no al dominio raíz de la cuenta. Mientras no exista
un router del lado del cliente, la única ruta soportada es `/HereToPlan/`. Una
futura navegación deberá usar rutas hash o incorporar una estrategia explícita
de fallback antes de añadir rutas navegables.

## 3. Conceptos fundamentales

### Núcleo

El núcleo contiene decisiones propias de HereToPlan y se divide en dos zonas:

- **Dominio:** entidades, objetos de valor, agregados, servicios de dominio e invariantes.
- **Aplicación:** casos de uso, coordinación transaccional y definición de los puertos necesarios para interactuar con el exterior.

La aplicación puede depender del dominio. El dominio no depende de la aplicación.

### Puerto

Un puerto es un contrato definido desde la perspectiva del núcleo. Describe una capacidad sin imponer el mecanismo que la ejecuta.

Existen dos clases:

- **Puertos de entrada:** operaciones que la aplicación ofrece a actores externos; normalmente se materializan como casos de uso o interfaces de comandos y consultas.
- **Puertos de salida:** capacidades que los casos de uso necesitan del entorno, como repositorios, reloj, generación de identificadores, unidad de trabajo o almacenamiento de respaldos.

Un puerto no contiene lógica de interfaz gráfica ni detalles de persistencia.

### Adaptador

Un adaptador traduce entre una tecnología externa y un puerto del núcleo:

- React es un **adaptador de entrada**: convierte interacciones del usuario en llamadas a casos de uso y transforma resultados en vistas.
- La persistencia local es un **adaptador de salida**: implementa contratos solicitados por aplicación y traduce agregados a datos almacenables.

### Composición

`app/` es la raíz de composición. Crea adaptadores concretos, construye casos de uso y entrega los puertos de entrada preparados a la presentación. Es el único lugar que puede conocer simultáneamente implementaciones del núcleo y de infraestructura.

La composición no debe contener reglas del negocio.

## 4. Mapa del código

```text
src/
├── app/              # raíz de composición
├── presentacion/     # adaptadores de entrada React
├── aplicacion/       # casos de uso y puertos
├── dominio/          # modelo e invariantes del negocio
└── infraestructura/  # adaptadores de salida
```

Esta estructura física sirve a la arquitectura hexagonal; no establece una cadena descendente del tipo presentación → negocio → base de datos.

| Directorio         | Papel hexagonal        | Puede depender de                            |
| ------------------ | ---------------------- | -------------------------------------------- |
| `dominio/`         | Núcleo de dominio      | Código compartido del propio dominio         |
| `aplicacion/`      | Casos de uso y puertos | Dominio                                      |
| `presentacion/`    | Adaptador de entrada   | Puertos de entrada y DTO de aplicación       |
| `infraestructura/` | Adaptadores de salida  | Puertos de salida y tipos mínimos necesarios |
| `app/`             | Composición            | Todas las zonas para ensamblarlas            |

## 5. Regla de dependencias

Las dependencias de código fuente apuntan hacia el núcleo:

```text
Usuario
   ↓
Adaptador de entrada (React)
   ↓
Puerto de entrada / caso de uso
   ↓
Aplicación → Dominio
   ↑
Puerto de salida
   ↑
Adaptador de salida (infraestructura)
```

Reglas obligatorias:

1. `dominio/` no importa React, Vite, APIs del navegador, persistencia, aplicación ni infraestructura.
2. `aplicacion/` no importa componentes React ni adaptadores concretos.
3. Los puertos de salida se definen en el núcleo, no en infraestructura.
4. `presentacion/` invoca puertos de entrada; no accede directamente a repositorios o almacenamiento.
5. `infraestructura/` implementa puertos de salida; no dirige el flujo del negocio.
6. `presentacion/` e `infraestructura/` no se importan entre sí.
7. `app/` ensambla dependencias, pero no decide políticas del dominio.
8. Una librería externa solo puede entrar al dominio cuando representa una necesidad intrínseca, no una comodidad técnica; por defecto debe permanecer fuera.

## 6. Contratos arquitectónicos

Los puertos se incorporarán cuando un caso de uso real los necesite. El diseño establece los siguientes contratos:

### Puertos de entrada

- crear o modificar una agenda en borrador;
- confirmar una agenda;
- completar o incumplir un bloque;
- consultar agenda e historial;
- preparar y confirmar un canje de recompensa.

### Puertos de salida

- repositorio de agendas;
- repositorio de billetera y transacciones;
- repositorio de canjes;
- unidad de trabajo para confirmación atómica;
- reloj;
- generador de identificadores;
- mecanismo de respaldo y restauración.

Esta lista no autoriza a implementar contratos anticipadamente. Un puerto existe para servir a un caso de uso, no para completar una plantilla arquitectónica.

### 6.1. Primer contrato de entrada

`CrearAgendaBorrador` recibe un comando formado por valores primitivos y devuelve
un resultado discriminado. El resultado exitoso contiene una representación de
lectura inmutable; nunca entrega la entidad `Agenda` a presentación. Los rechazos
esperados se expresan mediante códigos estables y pueden señalar el campo de
entrada correspondiente.

El comando no recibe identificadores ni instantes. Estas dos decisiones pertenecen
al caso de uso y se obtienen mediante los puertos `GeneradorIdentificadores` y
`Reloj`, lo que permite controlar ambos valores durante las pruebas.

### 6.2. Semántica de `RepositorioAgendas`

El puerto contiene únicamente las operaciones requeridas por el primer caso de
uso:

| Operación          | Semántica contractual                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guardar(agenda)`  | Registra una agenda nueva. Si el identificador ya existe, rechaza con `ErrorAgendaDuplicada` y conserva intacta la agenda anterior.                 |
| `obtenerPorId(id)` | Recupera la agenda asociada o devuelve `undefined` cuando no existe. No garantiza identidad de referencia entre el objeto guardado y el recuperado. |

La suite `verificarContratoRepositorioAgendas` expresa estas reglas una sola vez.
Todo adaptador, inicialmente memoria y posteriormente IndexedDB, debe ejecutar la
misma suite. Los fallos técnicos se propagan como errores; la ausencia de una
agenda no se considera un fallo.

## 7. Operaciones entre agregados y atomicidad

`Agenda` y `BilleteraPuntos` son agregados diferentes. El dominio puede evaluar reglas y preparar una decisión, pero no debe simular una transacción técnica entre agregados.

El canje de un día libre seguirá esta secuencia:

1. un adaptador de entrada solicita el canje mediante un puerto de entrada;
2. el caso de uso carga agendas y billetera mediante puertos de salida;
3. `ServicioCanjeRecompensas` prepara el canje, el gasto y los ajustes sin mutar el estado cargado;
4. el caso de uso aplica la decisión;
5. una unidad de trabajo persiste todos los cambios o ninguno;
6. el caso de uso devuelve un resultado independiente de React y del formato almacenado.

No puede existir un gasto confirmado sin sus ajustes ni ajustes confirmados sin el gasto correspondiente. Los reintentos tampoco deben duplicar transacciones o canjes.

## 8. Límites del dominio

- `Agenda` controla el ciclo de vida de sus bloques y ajustes.
- Un bloque confirmado no se modifica mediante referencias externas.
- `BilleteraPuntos` deriva su saldo de transacciones y protege la unicidad semántica.
- Los servicios de dominio calculan decisiones; no acceden a almacenamiento ni controlan transacciones técnicas.
- Fechas civiles se representan mediante `FechaLocal`; instantes históricos se reciben desde un reloj externo.
- Los DTO de presentación o persistencia no forman parte del modelo del dominio.

## 9. Estado actual y estado objetivo

La arquitectura es un contrato de evolución; no debe confundirse con el grado actual de implementación.

| Elemento        | Estado actual                                                                 |
| --------------- | ----------------------------------------------------------------------------- |
| Dominio         | Implementado parcialmente y cubierto por pruebas de invariantes               |
| Presentación    | Adaptador mínimo que solo identifica la estructura                            |
| Aplicación      | Caso de uso para crear agendas borrador mediante puertos                      |
| Infraestructura | Adaptador de repositorio en memoria; persistencia durable aún no implementada |
| Composición     | Ensambla únicamente la demostración actual                                    |
| Persistencia    | No implementada                                                               |

Por tanto, HereToPlan posee actualmente un **núcleo de dominio con arquitectura hexagonal definida como objetivo y contrato**. Se considerará una implementación hexagonal efectiva cuando al menos un corte vertical atraviese adaptador de entrada, puerto de entrada, caso de uso, dominio, puerto de salida y adaptador de salida.

## 10. Criterios de conformidad

Un incremento respeta esta arquitectura cuando:

- expresa la regla de negocio en dominio o aplicación, no en React;
- introduce puertos desde una necesidad del caso de uso;
- mantiene reemplazables los adaptadores;
- no filtra objetos técnicos hacia el dominio;
- define claramente el límite transaccional;
- prueba las reglas del dominio sin navegador ni almacenamiento;
- prueba los casos de uso con adaptadores de prueba;
- prueba cada adaptador contra el contrato que implementa;
- mantiene el build estático independiente de servicios locales.

Como frontera mínima, deben conservarse las pruebas de inmutabilidad de agendas confirmadas, separación entre compromisos estrictos y flexibles, encapsulación de bloques, preparación no mutante de canjes e imposibilidad de saldo negativo.

El comando contractual actual es:

```bash
npm test
```

Una funcionalidad no está terminada si satisface la interfaz pero viola la dirección de dependencias o las invariantes del núcleo.
