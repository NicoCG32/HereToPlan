# Guía de uso

HereToPlan organiza actividades reutilizables y su planificación en fechas.
El calendario comienza en `Todas`; puedes planificar en `Libre` sin crear una
agenda. Una agenda nombrada sirve para agrupar y filtrar trabajo, y no confirma
automáticamente todos sus bloques.

## Perfil, navegación y HUD

La bienvenida pide un nombre visible para identificar el espacio local. Puedes
editarlo desde el HUD; no es una cuenta ni un inicio de sesión. El HUD permanece
entre rutas y muestra el nombre, saldo de puntos y una frase elegida al abrir
la aplicación. La frase se conserva al navegar y puede variar en una apertura
nueva; no se guarda en el respaldo.

| Ruta hash      | Uso                                                             |
| -------------- | --------------------------------------------------------------- |
| `#/calendario` | Consulta, asignación, revisión y ejecución de bloques           |
| `#/crear`      | Catálogos y formularios de agendas y actividades                |
| `#/puntos`     | Billetera, inventario, aplicaciones y recuperación              |
| `#/respaldo`   | Exportación, análisis, restauración y reinicio de planificación |

La entrada sin ruta y una ruta desconocida conducen a Calendario. En móvil, el
botón de navegación abre los mismos cuatro destinos. El enlace «Saltar al
contenido principal» evita recorrer nuevamente el armazón con teclado.

## Crear y programar

1. En Crear, guarda una tarea simple, tarea compuesta, proyecto o hábito.
   Define su duración o estimación y su modo de seguimiento. «Guardar sin
   programar» conserva únicamente la definición; «Guardar y agendar» continúa
   al calendario con la actividad y fecha elegidas.
2. En Calendario, selecciona una fecha y usa Asignar sobre una actividad. El
   arrastre abre el mismo editor; soltar no guarda por sí solo.
3. Revisa actividad, fecha, agenda de destino, minutos y política estricta o
   flexible, y confirma el editor. Cancelar no crea un bloque. El diálogo
   conserva el mes y la posición del contenido.
4. Consulta el resultado en día, semana, mes, próximos siete días o lista. Las
   vistas y los filtros representan el mismo trabajo persistido.

Una actividad puede existir sin bloques; aparece entonces en `Sin programar`.
Un hábito puede materializar varias fechas compatibles dentro del rango finito
seleccionado, sin duplicar la misma actividad en igual contexto y fecha. No hay
series infinitas ni administración posterior de toda una serie. El dominio
admite composición acíclica de tareas, pero la interfaz todavía no ofrece un
editor de dependencias y subtareas.

El calendario móvil resume el mes en cuatro columnas con día de semana y número
de bloques; el detalle está en el diálogo del día y la lista equivalente. Las
acciones no dependen del arrastre ni de desplazamiento horizontal.

## Revisar, confirmar y resolver

Asignar un bloque a una fecha y confirmar una revisión son acciones diferentes.
Selecciona los bloques que quieres comprometer y abre Revisar. La consulta no
escribe; aceptar «Confirmar revisión» guarda un corte e inicia diez minutos de
gracia.

Durante la gracia, los bloques de ese corte quedan protegidos. Para corregir,
usa la acción sobre el corte completo y vuelve a revisar. Al vencer el plazo,
la confirmación se materializa desde el instante persistido, incluso si cerraste
la aplicación; recargar no prolonga la gracia. Los bloques confirmados conservan
su historia y requieren declarar completado o incumplido.

El modo **Manual** permite resolver sin medir tiempo. **Cronometrado** habilita
iniciar, pausar, reanudar y detener sesiones recuperables; detener no completa
el bloque. El modo puede editarse antes de programar la actividad y queda
protegido desde su primera programación. Sólo puede haber una sesión abierta,
incluso pausada.

## Puntos, inventario y recuperación

Completar un bloque confirmado acredita entre uno y cuatro puntos:
`min(4, ceil(minutos planificados / 30))`. El saldo deriva del historial;
incumplir no genera deuda. Resolución e ingreso se guardan juntos y un reintento
idéntico no duplica la recompensa.

En Puntos, adquirir **Día libre** cuesta inicialmente 1.500 puntos y crea una
unidad disponible. Desde Calendario, Aplicar muestra primero sus consecuencias
para una fecha futura. Confirmar consume la unidad y excusa únicamente bloques
pendientes, flexibles, de autoridad personal y con permiso `EXCUSAR`. Los
compromisos estrictos o externos permanecen protegidos; no hay otro gasto al
aplicar.

El banco de recuperación mide minutos, separados de los puntos. Sobretrabajo
verificado de sesiones finalizadas de un bloque completado puede acreditar
excedente con tasa inicial 1:2 y topes de 120 minutos diarios y 300 semanales.
Consumirlos reduce carga flexible futura cuando la política lo permite; conserva
la estimación original y al menos un minuto efectivo. Estas reglas económicas
siguen sujetas a observación de uso.

## Respaldo y reinicios

En Respaldo puedes exportar un JSON V3 y analizar un archivo sin alterar datos.
Restaurar exige escribir `RESTAURAR` y reemplaza las quince colecciones
funcionales de forma atómica. No combina dos planificaciones. Guarda una copia
actual antes de reemplazarla. Los formatos V1 y V2 tienen migraciones explícitas;
una versión futura se rechaza. [Contrato del archivo](Respaldo.md).

| Acción                                                    | Cambia                                                                                            | Conserva                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reiniciar planificación, con `REINICIAR` e impacto previo | Retira planificación activa y sesiones abiertas; conserva las partes históricas de agendas/cortes | Perfil, contextos, catálogo, puntos, inventario, recuperación, hechos históricos y progreso de la guía |
| Reiniciar guía                                            | Vuelve el tutorial al inicio y limpia sus hitos temporales                                        | Toda la planificación, perfil, economía e historia                                                     |
| Restaurar respaldo, con `RESTAURAR`                       | Sustituye todas las colecciones funcionales por el archivo validado                               | Preferencia local del tutorial y estado ajeno al archivo                                               |

El reinicio de planificación vuelve a comprobar el impacto al ejecutar; si el
estado cambió, exige revisarlo nuevamente. El resumen del diálogo es la
referencia para conocer qué se retirará de tu planificación concreta.

## Guía opcional

Después de la bienvenida se ofrece un recorrido de ocho pasos. La guía espera
acciones normales y sus resultados; sus indicaciones no crean actividades,
bloques ni recompensas.

- Iniciar o continuar recupera el paso vigente; «Ver control» localiza el destino
  por petición explícita.
- Posponer mantiene la pausa entre visitas. Cerrar sólo oculta la tarjeta
  durante la visita; un paso activo vuelve a mostrarse al recargar.
- Omitir y completar se conservan. Consultar su estado no empieza otra guía;
  «Reiniciar guía» ofrece nuevamente el inicio.
- Si leer o guardar falla, el aviso permite reintentar o usar progreso temporal.
  Un registro incompatible o inválido se conserva hasta decidir reiniciarlo.

## Privacidad y portabilidad

IndexedDB conserva planificación, perfil e historia en este navegador y perfil
de navegador. LocalStorage contiene sólo versión, situación y paso del tutorial.
La aplicación no envía estas colecciones a un backend ni ofrece cuentas o
sincronización. Publicar su código y frontend no publica tus registros locales.

El origen incluye protocolo, host y puerto. `localhost`, `127.0.0.1` y el dominio
de Pages tienen espacios distintos; otra ruta del mismo origen no crea por sí
sola un almacenamiento separado. Cambiar a Brave desde otro navegador también
requiere trasladar la planificación mediante respaldo. El modo privado, borrar
datos del sitio o políticas de almacenamiento pueden hacer que los registros
dejen de estar disponibles.

El JSON descargado contiene datos funcionales y el nombre del perfil, en texto
legible y sin cifrado propio. Guárdalo según su contenido. No incluye frase,
ruta, filtros, diálogos ni progreso de guía; restaurarlo en otro navegador
transfiere la planificación, pero no el tutorial. El carácter local no es una
garantía frente a otras personas con acceso al mismo perfil del navegador.
