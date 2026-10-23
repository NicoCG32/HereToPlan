# Peso de carga y decisión de composición

El experimento de [#124](https://github.com/NicoCG32/HereToPlan/issues/124),
del 2026-10-23, conserva las importaciones estáticas de las cuatro páginas.
Cargar Crear, Puntos y Respaldo bajo demanda reduce sólo un 2,61 % el JavaScript
inicial con gzip y aumenta un 1,63 % su tamaño con Brotli. No alcanza el umbral
del 15 % definido para adoptar este cambio.

## Comparación reproducible

Base: `3bbc2fb71cca9a3baba314bdf198684c3536fcd6`. Ambas construcciones usan
Node 24.18.0, npm 11.16.0, Vite 8.1.6, React 19.2.7 y el mismo lockfile de la
base. La variante modifica únicamente App: mantiene Calendario estático y usa
`lazy` para las otras tres páginas, con un estado de espera en `Suspense`.
El [parche de medición](experimentos/carga-rutas.patch) conserva el cambio exacto.

| Medida                                   |    Base | Tres páginas diferidas |
| ---------------------------------------- | ------: | ---------------------: |
| Archivos JavaScript requeridos al entrar |       1 |                      5 |
| JavaScript inicial, bytes                | 606 367 |                558 444 |
| JavaScript inicial, gzip nivel 9         | 155 338 |                151 288 |
| JavaScript inicial, Brotli calidad 11    | 128 922 |                131 025 |
| CSS inicial, bytes                       | 100 454 |                 96 579 |
| CSS inicial, gzip nivel 9                |  15 993 |                 15 798 |

El archivo de entrada de la variante baja a unos 367 kB y desaparece el aviso
de chunk grande. Sin embargo, necesita otros cuatro módulos estáticos: su suma
es la cifra inicial de la tabla. Comparar sólo el archivo de entrada habría
sobrestimado la mejora. El [registro JSON](carga-medicion-2026-10-23.json)
incluye archivos, hashes, dependencias, compresión y decisión.

El script recorre las entradas y sus `imports` estáticos en el manifest de Vite,
evita contarlos dos veces y suma la compresión de cada archivo por separado.
Las entradas dinámicas se enumeran sin incorporarlas a la carga inicial.
Los parámetros explícitos de compresión pueden producir cifras distintas al
resumen gzip predeterminado de Vite; se comparan siempre los mismos parámetros.

## Decisión y coste de adopción

Se conserva la composición actual. La variante difiere aproximadamente 48 kB
sin comprimir, pero ahorra sólo 4050 bytes con gzip y añade archivos iniciales.
El resto de los estilos globales y la composición de servicios siguen siendo
compartidos. No se cambian límites de tamaño para ocultar el aviso.

Una carga diferida publicable necesitaría también espera, recuperación de
errores y comprobaciones de navegación. React deriva los errores de `lazy` al
límite de error más cercano; `Suspense` cubre la espera del componente.
[Referencia de React](https://react.dev/reference/react/lazy),
[Suspense](https://react.dev/reference/react/Suspense).
Vite documenta además el fallo de imports antiguos después de un despliegue
que retire sus archivos. [Carga de producción en Vite](https://vite.dev/guide/build.html#load-error-handling).
El parche experimental no incorpora esa recuperación y no se integra en App.

El logotipo domina el inventario gráfico: 530 970 bytes originales,
182 827 con gzip nivel 9 y 116 745 con Brotli calidad 11. Por sí solo supera
el JavaScript inicial comprimido con gzip. Una revisión separada puede estudiar
su optimización conservando apariencia, proporciones, texto e identidad; este
experimento no modifica imágenes ni presume que puedan reducirse sin comprobarlo.

El seguimiento del logotipo queda en
[#126](https://github.com/NicoCG32/HereToPlan/issues/126), en Backlog.

## Repetir la medición

Usar una copia desechable de esta entrega con Node del pin. No aplicar el parche
experimental sobre trabajo en curso.

```powershell
npm ci
npm run build -- --manifest
node scripts/medir-carga.mjs dist > carga-base.json
git apply --unidiff-zero docs/experimentos/carga-rutas.patch
npm run build -- --manifest
node scripts/medir-carga.mjs dist > carga-variante.json
```

El script acepta otro directorio de artefacto como argumento. Requiere
`.vite/manifest.json`, no consulta la red ni modifica el build. Las mediciones
no incluyen el manifest de diagnóstico en los recursos de la aplicación.

## Alcance de la evidencia

Estas cifras miden peso de artefactos y compresión en laboratorio. No son
tiempos de descarga, CPU de un teléfono, LCP, INP ni una captura de transferencia
HTTP real de Pages. No se presenta un porcentaje de bytes como una mejora
equivalente de velocidad percibida. La actualización de Zod en
[#125](https://github.com/NicoCG32/HereToPlan/issues/125) afecta herramientas de
lint y conserva la medición; el [informe de dependencias](Dependencias.md)
registra su alcance. Las comprobaciones de Brave/lector/zoom y uso longitudinal
mantienen seguimiento propio en #109 y #119.

## Verificación de la entrega

La copia limpia supera 561 pruebas en 77 archivos y la suite dedicada de 43
pruebas de accesibilidad. Cobertura: 91,34 % de sentencias, 80 % de ramas,
93,12 % de funciones y 92,20 % de líneas, con alcance y umbrales conservados.
Formato, lint, enlaces locales, auditoría CSS, TypeScript, build y artefacto
Pages aprobados. La prueba temporal detectada durante la verificación se
estabiliza en [#127](https://github.com/NicoCG32/HereToPlan/issues/127).

El build final conserva los hashes de los 18 archivos JS/CSS/SVG de la base.
El informe y la herramienta de medición no se importan en la aplicación.
