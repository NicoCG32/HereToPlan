# 06 · Integraciones y decisiones de frontera

HereToPlan utiliza servicios de publicación y APIs del navegador. Los datos de planificación se procesan y almacenan localmente.

## Integraciones actuales

| Elemento                      | Papel real                                                    | Qué no hace                                                 |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| GitHub Pages                  | Distribuir los archivos compilados del sitio                  | No guarda datos personales de planificación                 |
| GitHub Actions                | Instalar, analizar, probar, construir y publicar desde `main` | No sincroniza la base local de usuarios                     |
| IndexedDB                     | Guardar las 15 colecciones funcionales por origen             | No es una base SQL remota ni un servicio compartido         |
| localStorage                  | Guardar preferencias acotadas del tutorial                    | No guarda las 15 colecciones ni las exporta con el respaldo |
| API de archivos del navegador | Descargar / leer el respaldo elegido por la persona           | No envía datos a un servidor de HereToPlan                  |

Para ejecutar la aplicación basta con instalar sus dependencias e iniciar Vite; no requiere credenciales ni variables de entorno.

## Si el alcance cambiara

Incorporar sincronización o identidad remota requeriría definir el tratamiento de datos, los permisos, las migraciones y los costos de operación.

[Arquitectura](01-arquitectura-general.md) · [Despliegue](Despliegue.md)
