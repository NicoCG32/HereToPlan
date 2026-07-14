# Recursos visuales

Este directorio contiene los recursos que forman parte de la identidad y la interfaz de HereToPlan.

```text
recursos/
├── iconos/
├── imagenes/
└── logos/
```

## Organización

- `logos/`: logotipo principal, isotipos y variantes cromáticas.
- `iconos/`: iconos propios de acciones, estados y navegación.
- `imagenes/`: ilustraciones, fondos y contenido gráfico general.

## Convenciones

1. Utilizar nombres descriptivos en minúsculas y separados por guiones, por ejemplo `logo-heretoplan-claro.svg`.
2. Preferir SVG para logos e iconos escalables.
3. Utilizar WebP o AVIF para imágenes rasterizadas cuando sea compatible con el caso de uso.
4. Evitar duplicar el mismo recurso en varios formatos o resoluciones sin una necesidad documentada.
5. Mantener texto alternativo significativo en el componente que muestre la imagen.
6. Importar los archivos desde TypeScript o CSS para que Vite genere rutas compatibles con GitHub Pages.

Ejemplo desde un componente:

```tsx
import logoHereToPlan from "../recursos/logos/logo-heretoplan.svg";
```

Los archivos que deban conservar un nombre público exacto, como `favicon.ico`, `robots.txt` o un manifiesto web, pertenecen excepcionalmente a `public/`.
