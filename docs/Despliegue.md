# Instalación y despliegue

HereToPlan se entrega como sitio estático: React se ejecuta en el navegador y
GitHub Pages distribuye HTML, JavaScript, CSS y recursos. El despliegue no
incluye las colecciones personales del navegador.

## Configuración vigente

| Parámetro      | Valor y fuente                                                   |
| -------------- | ---------------------------------------------------------------- |
| Runtime de CI  | Node.js `24.18.0`, [`.nvmrc`](../.nvmrc)                         |
| Dependencias   | `npm ci`, [lockfile](../package-lock.json)                       |
| Build          | `npm run build`, TypeScript y Vite                               |
| Artefacto      | `dist/`                                                          |
| Base pública   | `/HereToPlan/`, [Vite](../vite.config.ts)                        |
| Navegación     | HashRouter; `#/calendario`, `#/crear`, `#/puntos`, `#/respaldo`  |
| Automatización | [Calidad y despliegue](../.github/workflows/calidad-y-pages.yml) |
| Destino        | [GitHub Pages](https://nicocg32.github.io/HereToPlan/)           |

La carpeta local donde se clone el repositorio no cambia su raíz Git. No se
requiere backend, cuenta, clave privada ni variable de entorno para esta
entrega. Una variable expuesta al cliente no sería un lugar para guardar
secretos.

## Instalación reproducible

Utiliza el runtime del pin y npm 11, como se indica en el [README](../README.md).
Desde una copia limpia del repositorio:

```bash
node --version
npm --version
npm ci
npm run format:check
npm run lint
npm run verify:docs
npm run audit:css
npm run test:a11y
npm run test:coverage
npm run build
npm run verify:pages
```

La suite con cobertura incluye todas las pruebas de `npm test`; este último
también puede ejecutarse por separado para diagnosticar un fallo. La
[auditoría integral](Auditoria-integral.md) registra una ejecución limpia y sus
límites. No es necesario alterar umbrales ni incluir archivos locales ajenos al
repositorio para reproducirla.

Para revisar el artefacto construido:

```bash
npm run preview -- --host 127.0.0.1
```

Usa la dirección y puerto que indique Vite, seguidos de `/HereToPlan/` y de la
ruta hash elegida. Preview usa otro origen que el servidor de desarrollo cuando
cambia el puerto; una planificación vacía allí no demuestra pérdida de los
datos del origen anterior.

## GitHub Actions y Pages

En Settings → Pages, selecciona **GitHub Actions** como fuente. El repositorio
usa el environment `github-pages`; sus reglas de protección pueden requerir
una aprobación del despliegue según la configuración de la cuenta.

El workflow se ejecuta en PR hacia `main`, push a `main` y ejecución manual:

1. `calidad` restaura el lockfile y comprueba formato, lint, documentación, CSS,
   accesibilidad, suite con cobertura, build y referencias del artefacto.
2. Sólo un **push a main** configura Pages y empaqueta `dist/`.
3. `desplegar` depende de calidad y publica exactamente ese artefacto. Una PR
   no publica. La ejecución manual actual verifica calidad, pero tampoco
   publica porque ambos pasos de publicación exigen el evento `push`.

El permiso general es `contents: read`; checkout no conserva credenciales. Sólo
el job de publicación recibe `pages: write` e `id-token: write`. La concurrencia
se agrupa por workflow y referencia, cancelando una ejecución anterior del
mismo grupo. No hay dependencias locales dentro del artefacto.

`verify:pages` comprueba que el HTML apunte a JavaScript y CSS existentes bajo
`/HereToPlan/`. No comprueba un navegador remoto ni sustituye el recorrido
funcional. HashRouter resuelve todo lo que sigue a `#` sin pedir al servidor una
página como `/crear`. Cambiar de base o alojamiento exige alinear Vite, este
verificador y los enlaces; un despliegue en dominio raíz aún no está configurado.

## Comprobación posterior

Registra commit y URL del run; verifica que calidad y publicación terminen en
success. Cuando el acceso esté disponible, revisa el sitio en una sesión con
datos de prueba:

1. entrar directamente por las cuatro rutas hash y recargar;
2. crear una actividad, asignar y recuperar el bloque tras una recarga;
3. revisar y resolver después del vencimiento de la gracia, comprobar su
   movimiento y verificar que un reintento no duplique el resultado;
4. exportar y analizar un respaldo; comprobar rechazo de un archivo inválido
   sin escritura;
5. restaurar o reiniciar sólo en un origen de prueba con copia previa.

Una respuesta HTTP exitosa no demuestra estos recorridos. Si no se pueden
ejecutar, registra la limitación y la evidencia disponible; conserva las pruebas
automatizadas y la revisión local como comprobaciones distintas.

## Recuperación de una publicación

Si una entrega falla, consulta los logs del job que falló; el sitio anterior no
queda reemplazado por el build de una PR. Para retirar un cambio ya publicado,
prepara un revert de ese commit mediante una PR revisada y vuelve a publicar
desde main con el mismo pipeline. No basta subir manualmente otro directorio
`dist/` omitiendo calidad.

Republicar assets no revierte IndexedDB ni localStorage. Antes de volver a una
versión incompatible de código, evalúa sus contratos de lectura y exporta un
respaldo; una migración de datos requiere una decisión propia. El perfil y el
estado local no se recuperan desde GitHub Actions.

## Datos por origen

El almacenamiento depende del navegador, su perfil y el origen —protocolo,
host y puerto—, no de la rama Git. Desarrollo local, preview y Pages no
transfieren registros automáticamente. Cambiar de origen o navegador exige
exportar y restaurar el [respaldo funcional](Respaldo.md); la preferencia de
tutorial sigue siendo propia del destino. Consulta [privacidad](Guia-uso.md).
