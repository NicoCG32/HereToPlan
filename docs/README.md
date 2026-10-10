# Documentación de HereToPlan

Esta documentación describe la implementación de la fase de validación.
El [README](../README.md) permite instalarla y ubicar su estado; el tablero
[HereToPlan Dev](https://github.com/users/NicoCG32/projects/3) conserva las tareas
y su revisión.

## Lectura por propósito

| Necesidad                                                   | Documento                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Usar calendario, perfil, puntos, respaldo y guía            | [Guía de uso](Guia-uso.md)                                  |
| Entender entidades, reglas y límites disponibles            | [Dominio](Dominio.md)                                       |
| Seguir casos de uso, puertos, adaptadores y transacciones   | [Arquitectura](Arquitectura.md)                             |
| Mantener vistas, CSS, foco y adaptación móvil               | [Estilo](Estilo.md)                                         |
| Comprender JSON V3, migraciones, restauración y reinicio    | [Respaldo](Respaldo.md)                                     |
| Instalar, comprobar y publicar mediante GitHub Pages        | [Despliegue](Despliegue.md)                                 |
| Editar las fuentes de los tres diagramas                    | [Diagramas](Diagramas.md)                                   |
| Consultar alcance, resultados y pendientes de calidad       | [Auditoría integral](Auditoria-integral.md)                 |
| Distinguir axe, revisión manual y comprobaciones pospuestas | [Accesibilidad](Auditoria-accesibilidad.md)                 |
| Registrar evidencia de uso cotidiano                        | [Protocolo de uso sostenido](Protocolo-uso-sostenido.md)    |
| Consultar procedencia y presupuesto de recursos de interfaz | [Recursos visuales](../src/presentacion/recursos/README.md) |

## Vistas del sistema

- [Componentes y dependencias](arquitectura-componentes.svg).
- [Entrega y almacenamiento en el navegador](arquitectura-despliegue.svg).
- [Modelo de dominio](modelo-dominio.svg).

## Convención de mantenimiento

Un contrato describe lo que hace el código. Las propuestas y limitaciones se
nombran como pendientes, y una cifra de pruebas siempre corresponde a un corte
registrado. Una ejecución técnica no completa por sí sola el experimento de
producto ni certifica todas las condiciones de accesibilidad.

Después de cambiar documentación, ejecutar `npm run format:check` y
`npm run verify:docs`; este último comprueba destinos locales de enlaces e
imágenes, sin acceder a URLs externas ni validar sus fragmentos. La revisión
de diagramas incluye lectura visual del SVG y contraste con las fuentes de
código indicadas en [Diagramas](Diagramas.md).
