# 02 · Funcionalidades y límites

HereToPlan es un **prototipo web funcional en fase de validación**. Estas son sus capacidades y sus límites actuales.

| Área                  | Implementado en el repositorio                                                            | Límite que importa                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Catálogo              | Crear y editar actividades, clasificación por tarea/proyecto/hábito; modos de seguimiento | La composición y administración de subtareas/proyectos no constituyen un editor completo |
| Calendario            | Bloques con fecha, minutos y contexto `Libre` o nombrado                                  | Los bloques se guardan en el navegador                                                   |
| Compromisos           | Revisión, cortes de planificación, gracia y resolución explícita                          | Un bloque confirmado no se edita libremente; hay políticas y transiciones                |
| Cronómetro            | Inicio, pausa, reanudación y cierre de sesiones vinculadas                                | Medir tiempo no resuelve automáticamente el compromiso                                   |
| Puntos                | Movimientos, saldo derivado y acreditación al completar                                   | La fórmula no mide calidad del trabajo                                                   |
| Recompensas           | Adquisición, inventario y aplicación de `Día libre`                                       | El catálogo actual ofrece `Día libre`                                                    |
| Recuperación          | Banco de minutos y reducciones bajo reglas y topes                                        | Las reducciones respetan la política de cada bloque                                      |
| Respaldo              | Exportar JSON V3; analizar y restaurar V1–V3; reinicio selectivo                          | La restauración sustituye datos; el respaldo no está cifrado automáticamente             |
| Accesibilidad y ayuda | Rutas, navegación por teclado, estados de error y tutorial contextual                     | Quedan comprobaciones con lector de pantalla y zoom real                                 |

## No implementado como producto actual

Quedan fuera del alcance actual las cuentas, la sincronización entre dispositivos, las conexiones con calendarios externos y la colaboración. También están pendientes las plantillas de agenda, la recurrencia abierta y el editor completo de composición de tareas.

## Estado de producto

La documentación y las pruebas describen un sistema capaz de conservar estados, reintentos y respaldos en condiciones controladas. Queda por observar el **uso sostenido**: claridad de términos, carga realista, utilidad y posible presión de las reglas. Consulta [Validación de producto](Validacion-producto.md) para hipótesis y sesiones planificadas.

[Recorrido](03-flujo-de-usuario.md) · [Reglas](05-motor-o-nucleo-de-negocio.md) · [Manual](Guia-uso.md)
