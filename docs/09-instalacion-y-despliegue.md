# 09 · Instalar, comprobar y publicar

HereToPlan se compila como sitio estático. Las carpetas de código y el servidor local se usan para desarrollo; el producto que recibe la persona es HTML, CSS y JavaScript servido bajo `/HereToPlan/`.

## Requisitos y comandos

La versión declarada es **Node.js 24.18.0** en [`.nvmrc`](../.nvmrc) y npm con lockfile. Ejecutar desde la raíz del repositorio:

```bash
npm ci
npm run dev
```

Para comprobar cambios:

```bash
npm run format:check
npm run lint
npm run verify:docs
npm run audit:css
npm run test:a11y
npm run test:coverage
npm run build
npm run verify:pages
```

`npm test` ejecuta la suite Vitest sin cobertura. `npm ci` usa `package-lock.json`; evita sustituciones manuales de versiones antes de diagnosticar un fallo.

## Entorno de desarrollo y producción

| Aspecto                  | Configuración verificable                                                     |
| ------------------------ | ----------------------------------------------------------------------------- |
| Enrutamiento             | `HashRouter` (`#/calendario`, `#/crear`, `#/puntos`, `#/respaldo`)            |
| Base Vite/Pages          | `/HereToPlan/`                                                                |
| Artefacto generado       | `dist/`                                                                       |
| CI                       | [Workflow de calidad y publicación](../.github/workflows/calidad-y-pages.yml) |
| Publicación              | [HereToPlan en GitHub Pages](https://nicocg32.github.io/HereToPlan/)          |
| Persistencia del usuario | Navegador / perfil / origen; no incluida en el build                          |

La CI verifica en PR y en cambios; publica desde `main` según las condiciones declaradas en su workflow. Una prueba verde no sustituye revisar un recorrido real con un perfil limpio.

## Verificación funcional mínima

1. En un navegador de prueba, crear una actividad y un bloque; recargar y comprobar persistencia.
2. Revisar un corte, confirmar, resolver y comprobar resultado y puntos sin duplicar al reintentar.
3. Probar exportación y **análisis sin escritura** de un archivo inválido.
4. En un origen de prueba con copia previa, restaurar un respaldo válido y comprobar estado íntegro.
5. Revisar teclado, foco y lectura móvil; registrar lo que todavía no se ha probado.

No ejecutes restauración ni reinicio con datos importantes sin verificar antes un respaldo independiente.

**Guía completa y recuperación de publicación:** [Despliegue](Despliegue.md).
