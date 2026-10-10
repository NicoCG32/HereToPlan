# Mantenimiento de diagramas

Los tres SVG versionados son fuentes editables de documentación. No hay un
archivo de diseño separado ni un generador obligatorio. El diagrama de
despliegue anterior era una exportación sin fuente de diseño en este
repositorio; la vista vigente utiliza SVG legible y editable directamente.

| Vista       | Fuente editable                                              | Contrastar con                                                                                                      |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Componentes | [arquitectura-componentes.svg](arquitectura-componentes.svg) | [Composición](../src/app/configurarAplicacion.ts), puertos de aplicación y adaptadores; [contrato](Arquitectura.md) |
| Despliegue  | [arquitectura-despliegue.svg](arquitectura-despliegue.svg)   | [Workflow](../.github/workflows/calidad-y-pages.yml), [Vite](../vite.config.ts) y [guía de entrega](Despliegue.md)  |
| Dominio     | [modelo-dominio.svg](modelo-dominio.svg)                     | Entidades de `src/dominio/` y [contrato del modelo](Dominio.md)                                                     |

## Qué muestra cada vista

Componentes resume la dirección hacia el núcleo y el flujo mediante puertos.
IndexedDB contiene el estado funcional; el puerto de preferencias conecta
separadamente el tutorial con localStorage. Las transacciones de planificación
no se extienden a esta preferencia.

Despliegue separa verificación de PR, publicación tras push a main y ejecución
del sitio estático. En el navegador distingue los quince almacenes de IndexedDB,
la única preferencia de guía y el archivo de respaldo. Las flechas del respaldo
representan una acción explícita del usuario, sin sincronización remota.

Dominio resume entidades y hechos implementados. El perfil no es autenticación;
los contextos organizan y los cortes confirman una selección. El tutorial, el
HUD y las rutas son contratos de aplicación/presentación y quedan fuera de este
modelo. La política de reinicio tampoco es un agregado nuevo.

## Procedimiento de cambio

1. Identificar el contrato y código que cambiaron; actualizar la vista que
   corresponde, sin añadir una entidad de dominio por cada control visual.
2. Editar el SVG con texto o un editor vectorial. Conservar `viewBox`, título,
   descripción accesible, textos legibles y trazado de las conexiones.
3. Abrirlo en navegador a su tamaño y en el ancho de lectura del documento.
   Comprobar texto dentro de paneles, cruces de flechas y recortes. Las fuentes
   del sistema permiten mostrarlo sin descargar tipografías ni otros recursos.
4. Actualizar la fecha del corte cuando el contenido haya cambiado. Revisar el
   diff y ejecutar `npm run verify:docs`; los SVG están excluidos de Prettier
   para conservar el formato editable.

Los diagramas son resúmenes, no inventarios exhaustivos de clases o almacenes.
Si una conexión cambia el significado, corregir también el contrato textual y
registrar la decisión en la tarea correspondiente.
