# 01 · Arquitectura: del contexto al código

HereToPlan es una **aplicación web estática con datos locales**, organizada con arquitectura hexagonal: dominio, casos de uso, puertos y adaptadores. Las reglas de negocio son independientes de React e IndexedDB; los adaptadores del navegador ejecutan las transacciones de persistencia.

## Nivel 1 · Contexto del sistema

```mermaid
flowchart LR
  U[Persona que planifica] -->|usa| W[HereToPlan en el navegador]
  W -->|lee y escribe datos locales| I[(IndexedDB del origen)]
  W -->|preferencias del tutorial| L[(localStorage)]
  U -->|exporta respaldo| F[Archivo de respaldo JSON]
  F -->|selecciona para importar| W
  G[GitHub Pages] -.->|recursos estáticos| W
  classDef core fill:#edf3fb,stroke:#4676a1,color:#172b42;
  classDef data fill:#edf7f1,stroke:#39775e,color:#153a2b;
  class W core;
  class I,L,F data;
```

GitHub Pages entrega el código y los recursos; las actividades, compromisos y saldos permanecen en el navegador de cada persona.

## Nivel 2 · Contenedores en ejecución

```mermaid
flowchart TB
  subgraph N[Equipo y navegador]
    UI[SPA React y React Router]
    APP[Casos de uso TypeScript]
    DOM[Reglas del dominio]
    AD[Adaptadores de persistencia y sistema]
    IDB[(IndexedDB v13)]
    LS[(localStorage: tutorial)]
    JSON[Lectura y descarga JSON]
    UI --> APP
    APP --> DOM
    APP -->|puertos| AD
    AD --> IDB
    AD --> LS
    AD --> JSON
  end
  P[GitHub Pages: HTML / CSS / JS] -->|descarga de recursos| UI
  classDef store fill:#f0f7f1,stroke:#4b8061,color:#163b28;
  class IDB,LS,JSON store;
```

El navegador es a la vez interfaz y entorno de ejecución. No hay API de negocio alojada en un servidor ni autenticación remota en esta versión. Algunas preferencias de ayuda no se incluyen en el respaldo funcional.

## Nivel 3 · Componentes y dirección de dependencias

```mermaid
flowchart LR
  V["Presentación<br/>Pantallas y componentes"] --> A["Aplicación<br/>Casos de uso"]
  A --> D["Dominio<br/>Entidades y políticas"]
  A --> P{{"Puertos<br/>Repositorios y servicios"}}
  X["Infraestructura<br/>Adaptadores IndexedDB / sistema"] -. implementa .-> P
  C["Composición<br/>src/app"] --> V
  C --> A
  C --> X
  classDef core fill:#ebf1fb,stroke:#5576ac,color:#233960;
  classDef boundary fill:#fff7e8,stroke:#b48b41,color:#5c4220;
  class A,D core;
  class P boundary;
```

| Nivel           | Carpeta real                                     | Responsabilidad                                                 |
| --------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| Dominio         | [`src/dominio/`](../src/dominio)                 | Invariantes, estados, fórmulas y reglas independientes de React |
| Aplicación      | [`src/aplicacion/`](../src/aplicacion)           | Coordinar operaciones y contratos de puertos                    |
| Infraestructura | [`src/infraestructura/`](../src/infraestructura) | IndexedDB, mapeadores, reloj, UUID, archivos y preferencias     |
| Presentación    | [`src/presentacion/`](../src/presentacion)       | Calendario, actividad, billetera, respaldo, tutorial y feedback |
| Composición     | [`src/app/`](../src/app)                         | Crear adaptadores reales e inyectarlos en casos de uso y vistas |

Consulta los contratos de cada componente en [Arquitectura](Arquitectura.md).

## Nivel 4 · Distribución y datos

```mermaid
flowchart LR
  SRC[Repositorio GitHub] --> CI["GitHub Actions<br/>pruebas y build"]
  CI -->|push a main y calidad aprobada| PG["GitHub Pages<br/>/HereToPlan/"]
  PG -->|recursos estáticos| BR[Navegador]
  BR --> DB[("IndexedDB<br/>datos de la persona")]
  BR --> TU[("localStorage<br/>tutorial")]
  BR -->|exportación explícita| BK[Respaldo JSON]
  BK -->|análisis y restauración confirmada| BR
  classDef store fill:#ecf6f0,stroke:#488369,color:#1e4a35;
  class DB,TU,BK store;
```

**La publicación no traslada los datos entre navegadores u orígenes.** Cada navegador y perfil conserva su almacenamiento; dentro de ellos, cada origen tiene una base independiente. Para trasladar la planificación, exporta y restaura un respaldo.

## Principales fronteras de consistencia

- El catálogo de actividades existe aunque no se programe ningún bloque.
- El corte confirmado conserva instantáneas, aunque después cambie la definición de la actividad.
- Resolver un compromiso y acreditar puntos forman una operación atómica; reintentar no puede duplicar resultados.
- Comprar una recompensa y consumirla no son sinónimos.
- Restaurar un respaldo sustituye el estado funcional, por lo que la aplicación analiza antes de escribir y exige confirmación.

[Diagrama de componentes](arquitectura-componentes.svg) · [Arquitectura detallada](Arquitectura.md) · [Persistencia](04-dominio-y-persistencia-local.md) · [Despliegue](Despliegue.md)
