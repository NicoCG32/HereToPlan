# Revisión del logotipo — 2026-11-01

[#126](https://github.com/NicoCG32/HereToPlan/issues/126) conserva el SVG vigente.
La marca integrada en `cf7fcfe` y ajustada en `28d8bd5` ya reemplazó el recurso
histórico de 530 970 bytes. La base de esta revisión es
`19d5f92e5801b8c2d7d3c94e5e4fe7573277d729`: el logotipo pesa 11 460 bytes,
3095 con gzip y 2681 con Brotli. La reducción anterior corresponde a esos
cambios de identidad; no se atribuye al experimento actual.

## Comparación

Se usa Node 24.18.0, gzip nivel 9 y Brotli calidad 11, igual que en la
[medición de carga](Rendimiento.md). SVGO 4.1.0 se ejecuta como herramienta
aislada, sin añadir dependencias al producto.

| Variante         | Bytes originales | Gzip | Brotli |
| ---------------- | ---------------: | ---: | -----: |
| SVG vigente      |           11 460 | 3095 |   2681 |
| SVGO conservador |           13 273 | 3103 |   2695 |
| SVGO compacto    |           11 361 | 3251 |   3020 |

La variante conservadora desactiva las conversiones geométricas y conserva los
identificadores. La compacta permite optimizar trazados y transformaciones con
seis decimales. Ambas usan `multipass`, mantienen el viewBox y conservan las
descripciones. Las configuraciones, hashes y resultados completos están en el
[registro JSON](logotipo-auditoria-2026-11-01.json).

La versión compacta reduce 99 bytes sin comprimir, pero aumenta el gzip un
5,04 % y el Brotli un 12,64 %. La conservadora también aumenta ambas medidas.
No se adopta ninguna de las dos. El SVG actual, sus consumidores, dimensiones,
nombre accesible y rutas permanecen iguales.

## Equivalencia visual y presentación

Se renderizan original y variantes con resvg-js 2.6.2, sin fuentes de sistema,
a 180, 232, 1270 y 2540 px de ancho. Se comparan todos los canales RGBA de cada
píxel. La variante conservadora produce cero diferencias en los cuatro tamaños.
La compacta coincide en los dos pequeños y cambia un píxel a 1270 px y ocho
a 2540 px, con diferencia máxima de 16 niveles en un canal. No se presenta como
equivalencia exacta en cualquier motor o escala.

En el navegador integrado se revisan las tres versiones juntas a 1280 y 390 px,
sobre fondos claros y oscuros para observar contornos y transparencia. Esa
comparación no certifica un modo oscuro del producto. Las seis imágenes cargan
con dimensiones naturales de 1270 × 402 y no generan desbordamiento horizontal.

El preview del build carga `HereToPlanLogo-CrKihdDx.svg` bajo `/HereToPlan/`.
La navegación conserva `alt="HereToPlan"`, dimensiones 1270/402 y `object-fit:
contain`. Se comprueban escritorio a 1280 px y menú móvil abierto a 390 y
320 px: imagen cargada, nombre accesible disponible y ausencia de recortes o
desplazamiento horizontal. Consola sin errores ni avisos. Las capturas de la
revisión se conservan como evidencia de la tarea.

## Reproducibilidad y límites

El archivo SVG del build tiene SHA-256
`cbc68bde9e9fedfdb1c0de8cab4875d4d8295c1172fcb203bbb2a19b02ec05d3`,
igual al recurso fuente de la base. Para repetir el tamaño publicado:

```powershell
npm ci
npm run build -- --manifest
node scripts/medir-carga.mjs dist
```

Las variantes se reproducen con `optimize` de SVGO usando el objeto
`configuracion` de cada entrada del JSON; se añade un salto de línea final.
Para la comparación de píxeles se usa `Resvg` con `fitTo: { mode: "width",
value: ancho }` y `font: { loadSystemFonts: false }`.
[Configuración de SVGO](https://svgo.dev/docs/preset-default/) y
[API de resvg-js](https://github.com/thx/resvg-js/blob/main/index.d.ts).

El resultado mide compresión de laboratorio y presentación local, no tiempos
de descarga, LCP o INP. No añade una prueba de lector de pantalla ni zoom real
en Brave; #109 conserva ese alcance. El estudio longitudinal de #119 continúa
separado. La revisión no cambia la aplicación ni las decisiones de identidad.
