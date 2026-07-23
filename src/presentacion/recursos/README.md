# Recursos visuales

Este directorio contiene los recursos que forman parte de la identidad y la interfaz de HereToPlan.

```text
recursos/
├── fondos/
│   ├── escritorio/
│   └── movil/
├── iconos/
│   ├── conceptos/
│   └── navegacion/
├── ilustraciones/
│   ├── estados-vacios/
│   └── paginas/
└── logos/
```

## Organización

- `logos/`: logotipo principal, isotipos y variantes cromáticas.
- `iconos/navegacion/`: orientación persistente entre rutas.
- `iconos/conceptos/`: conceptos del producto usados en controles funcionales; el nombre evita confundir recursos visuales con la capa arquitectónica `dominio`.
- `ilustraciones/paginas/`: apoyo visual de cabeceras con baja densidad.
- `ilustraciones/estados-vacios/`: explicación visual de ausencia de datos.
- `fondos/`: variantes adaptativas y específicas de cada ruta.

Sólo se conserva aquí un recurso cuando existe un consumidor dentro de la aplicación. El banco original, sus previsualizaciones, referencias rasterizadas y formatos alternativos no forman parte del código de producción.

## Convenciones

1. Utilizar nombres descriptivos en minúsculas y separados por guiones, por ejemplo `logo-heretoplan-claro.svg`.
2. Preferir SVG para logos e iconos escalables.
3. Mantener una sola representación canónica por recurso; usar WebP o AVIF únicamente cuando el origen sea rasterizado.
4. Evitar duplicar el mismo recurso en varios formatos o resoluciones sin una necesidad documentada.
5. Tratar como decorativas las imágenes que no aporten información adicional: `alt=""` y `aria-hidden="true"`.
6. Proporcionar texto alternativo significativo cuando la imagen sí transmita contenido no disponible en el texto cercano.
7. Importar los archivos desde TypeScript o CSS para que Vite genere rutas compatibles con GitHub Pages.
8. No crear un índice global que importe todo el catálogo: cada componente o módulo de ruta debe declarar sus dependencias visuales explícitas.

Ejemplo desde un componente:

```tsx
import logoHereToPlan from "../recursos/logos/HereToPlanLogo.svg";
```

Los archivos que deban conservar un nombre público exacto, como `favicon.ico`, `robots.txt` o un manifiesto web, pertenecen excepcionalmente a `public/`.
