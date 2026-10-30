# 09 — Puesta en marcha y distribución

<!-- DOCUMENTACION:nivel-2026-10-29:BEGIN -->

**Nivel:** técnica.

## Puesta en marcha y distribución por plataforma

Revisión documental: 2026-10-29. Base `5b406d21faed` en `main`; 4 entradas de cambios locales conservadas al iniciar la revisión. La inspección de fuentes no sustituye pruebas de ejecución.

**Estado y alcance:** Aplicación web de validación con persistencia local y publicación Pages documentada. La fase de producción separada depende de evidencia de uso, no de completar funcionalidades o documentos.

**Destinos:** Webpage de validación.

Entorno declarado: engines `{"node": ">=24.18.0 <25"}`; packageManager `consultar lockfile/guía específica`. No actualizar dependencias por redactar documentación.

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

Los comandos se enumeran desde archivos presentes; esta actualización documental no los ejecuta de nuevo ni certifica sus resultados. Estado de pruebas y CI se informa por revisión/fecha, separado de capacidades propuestas.

### Datos, servicios y distribución

IndexedDB detrás de puertos y transacciones de los adaptadores. Persistencia local por origen/navegador; no hay cuenta cloud implícita. Migraciones y respaldo son contratos versionados. Referencia conceptual no equivale a FK SQL; las invariantes se comprueban por aplicación y transacción.

Para APK: application ID estable, versión/código creciente, firma privada preservada, permisos y prueba en dispositivo; adjuntar APK y SHA-256 a la release. Para escritorio: distinguir portable/instalador y dependencias. Para web: base/rutas, servidor/servicios y cambio de origen. Para firmware: dispositivo, cableado, compilación y prueba física separados. Aplicar sólo los targets aprobados.

GitHub Releases no aloja el backend ni convierte un ZIP de fuentes en instalador. No hacer push como parte de una revisión documental: en proyectos con publicación automática desde main, ese push puede generar una nueva APK o despliegue.

### Recuperación

Conservar el artefacto anterior y su procedencia. Retroceder código no revierte automáticamente datos o migraciones. Revisar compatibilidad de guardado/snapshot y restauración antes de instalar una versión antigua. La aceptación debe identificar archivo/URL, commit, target, fecha y limitaciones.

## Fuentes de implementación y contratos

[README.md](../README.md) · [docs/README.md](README.md) · [docs/Dominio.md](Dominio.md) · [docs/Arquitectura.md](Arquitectura.md) · [docs/Respaldo.md](Respaldo.md) · [docs/Protocolo-uso-sostenido.md](Protocolo-uso-sostenido.md).
<!-- DOCUMENTACION:nivel-2026-10-29:END -->

<!-- DOCUMENTACION:evidencia-ci-2026-10-29:BEGIN -->

## Estado remoto consultado el 29 de octubre de 2026

Consulta para el commit `5b406d21faed9f966df553a6699fd3bfa9db1dd0`. Se leyó GitHub Actions; no se ejecutó de nuevo la aplicación ni se repitieron sus pruebas.

| Workflow             | Estado    | Resultado | Evidencia                                                                          |
| -------------------- | --------- | --------- | ---------------------------------------------------------------------------------- |
| Calidad y despliegue | completed | success   | [Run 40027819126](https://github.com/NicoCG32/HereToPlan/actions/runs/40027819126) |

<!-- DOCUMENTACION:evidencia-ci-2026-10-29:END -->
