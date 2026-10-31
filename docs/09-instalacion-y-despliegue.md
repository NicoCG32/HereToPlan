# 09 — Puesta en marcha y distribución

## Puesta en marcha y distribución por plataforma

**Disponibilidad:** Aplicación web de planificación en fase de validación, con datos locales y respaldo. La evolución hacia producción depende de la evaluación de uso sostenido.

**Destinos:** Webpage de validación.

Entorno declarado: engines `{"node": ">=24.18.0 <25"}`; packageManager `consultar lockfile/guía específica`. Instala las versiones fijadas en el lockfile.

| Script existente | Definición en package.json                 |
| ---------------- | ------------------------------------------ |
| dev              | `vite`                                     |
| build            | `tsc -b && vite build`                     |
| preview          | `vite preview`                             |
| test             | `vitest run`                               |
| lint             | `eslint . --max-warnings 0`                |
| format:check     | `prettier . --check --ignore-unknown`      |
| verify:pages     | `node scripts/verificar-build-pages.mjs`   |
| verify:docs      | `node scripts/verificar-documentacion.mjs` |

### Secuencia de puesta en marcha

1. Preparar el runtime/editor y la configuración que indiquen las fuentes enlazadas; usar valores de prueba y restaurar el lockfile apropiado.
2. Ejecutar la modalidad local y sus comprobaciones existentes desde la carpeta indicada por esa guía. No confundir preview web con el runtime nativo o montaje físico.
3. Construir/instalar el artefacto de ese target y comprobar recorrido principal, error relevante y reapertura/actualización antes de declararlo entregado.

Ejecuta los comandos de comprobación antes de distribuir una compilación. Puedes consultar sus resultados remotos en la pestaña Actions del repositorio.

### Datos, servicios y distribución

IndexedDB detrás de puertos y transacciones de los adaptadores. Persistencia local por origen/navegador; no hay cuenta cloud implícita. Migraciones y respaldo son contratos versionados. Referencia conceptual no equivale a FK SQL; las invariantes se comprueban por aplicación y transacción.

La web estática se publica con el prefijo configurado para Pages. Los datos pertenecen al navegador y al origen: exporta un respaldo antes de cambiar de dominio, navegador o dispositivo.

GitHub Releases distribuye los archivos de cada versión. Los servicios de servidor se despliegan por separado; consulta la guía de la plataforma para instalar o alojar la aplicación.

### Recuperación

Conservar el artefacto anterior y su procedencia. Retroceder código no revierte automáticamente datos o migraciones. Revisar compatibilidad de guardado/snapshot y restauración antes de instalar una versión antigua. Consulta las notas de la versión para conocer los requisitos y límites de la entrega.

## Código y documentación relacionada

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
