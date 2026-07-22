export const VERSION_ESTADO_TUTORIAL = 1 as const;

export type IdPasoTutorial =
  | "NAVEGACION"
  | "LIBRE"
  | "AGENDA_OPCIONAL"
  | "ACTIVIDAD"
  | "ASIGNACION"
  | "REVISION"
  | "CONFIRMACION"
  | "EJECUCION";

export type SituacionTutorial =
  "NO_INICIADO" | "EN_CURSO" | "POSPUESTO" | "OMITIDO" | "COMPLETADO";

export interface PasoTutorial {
  readonly id: IdPasoTutorial;
  readonly proposito: string;
  readonly condicionEntrada: string;
  readonly termino: string;
  readonly destino: "/calendario" | "/crear";
}

export interface EstadoTutorialV1 {
  readonly version: typeof VERSION_ESTADO_TUTORIAL;
  readonly situacion: SituacionTutorial;
  readonly pasoActual: IdPasoTutorial | null;
}

export const RECORRIDO_TUTORIAL: readonly PasoTutorial[] = Object.freeze([
  {
    id: "NAVEGACION",
    proposito: "Reconocer las cuatro rutas y el resumen personal persistente.",
    condicionEntrada: "El armazón de la aplicación está disponible.",
    termino: "La persona identifica Calendario, Crear, Puntos y Respaldo.",
    destino: "/calendario",
  },
  {
    id: "LIBRE",
    proposito: "Comprender que se puede planificar sin crear una agenda.",
    condicionEntrada: "Calendario está visible y Libre existe.",
    termino: "Libre se reconoce como contexto predeterminado no eliminable.",
    destino: "/calendario",
  },
  {
    id: "AGENDA_OPCIONAL",
    proposito: "Distinguir una agenda nombrada de un requisito de entrada.",
    condicionEntrada: "La diferencia entre Todas y Libre es visible.",
    termino: "Crear una agenda se entiende como una decisión opcional.",
    destino: "/crear",
  },
  {
    id: "ACTIVIDAD",
    proposito: "Crear una definición reutilizable sin programarla todavía.",
    condicionEntrada: "La página Crear está disponible.",
    termino: "Una actividad válida existe en el catálogo.",
    destino: "/crear",
  },
  {
    id: "ASIGNACION",
    proposito: "Situar una actividad en una fecha mediante un bloque editable.",
    condicionEntrada: "Existe al menos una actividad reutilizable.",
    termino: "El bloque aparece en la fecha y contexto elegidos.",
    destino: "/calendario",
  },
  {
    id: "REVISION",
    proposito: "Revisar una selección antes de convertirla en compromiso.",
    condicionEntrada: "Existe al menos un bloque editable seleccionado.",
    termino: "La selección entra en revisión sin modificar otros bloques.",
    destino: "/calendario",
  },
  {
    id: "CONFIRMACION",
    proposito: "Entender la gracia y la confirmación inmutable del corte.",
    condicionEntrada: "Un corte revisado está disponible para asignación.",
    termino: "Se reconoce cuándo corregir y cuándo el corte queda confirmado.",
    destino: "/calendario",
  },
  {
    id: "EJECUCION",
    proposito: "Ejecutar y resolver un compromiso manual o cronometrado.",
    condicionEntrada: "Existe un bloque confirmado y pendiente.",
    termino:
      "El resultado humano queda registrado y las proyecciones se actualizan.",
    destino: "/calendario",
  },
]);

export function crearEstadoTutorial(): EstadoTutorialV1 {
  return {
    version: VERSION_ESTADO_TUTORIAL,
    situacion: "NO_INICIADO",
    pasoActual: null,
  };
}

export function iniciarTutorial(estado: EstadoTutorialV1): EstadoTutorialV1 {
  if (estado.situacion === "EN_CURSO") return estado;
  return {
    version: VERSION_ESTADO_TUTORIAL,
    situacion: "EN_CURSO",
    pasoActual:
      estado.situacion === "POSPUESTO" && estado.pasoActual
        ? estado.pasoActual
        : "NAVEGACION",
  };
}

export function posponerTutorial(estado: EstadoTutorialV1): EstadoTutorialV1 {
  exigirSituacion(estado, "EN_CURSO", "posponer");
  return { ...estado, situacion: "POSPUESTO" };
}

export function continuarTutorial(estado: EstadoTutorialV1): EstadoTutorialV1 {
  exigirSituacion(estado, "POSPUESTO", "continuar");
  return { ...estado, situacion: "EN_CURSO" };
}

export function omitirTutorial(estado: EstadoTutorialV1): EstadoTutorialV1 {
  if (estado.situacion === "COMPLETADO") return estado;
  return { ...estado, situacion: "OMITIDO", pasoActual: null };
}

export function cerrarTutorial(estado: EstadoTutorialV1): EstadoTutorialV1 {
  return estado;
}

export function completarPasoTutorial(
  estado: EstadoTutorialV1,
  pasoId: IdPasoTutorial,
): EstadoTutorialV1 {
  exigirSituacion(estado, "EN_CURSO", "completar un paso");
  if (estado.pasoActual !== pasoId)
    throw new Error(
      "El paso completado no coincide con el paso tutorial vigente.",
    );
  const indice = RECORRIDO_TUTORIAL.findIndex((paso) => paso.id === pasoId);
  const siguiente = RECORRIDO_TUTORIAL[indice + 1];
  return siguiente
    ? { ...estado, pasoActual: siguiente.id }
    : { ...estado, situacion: "COMPLETADO", pasoActual: null };
}

export function reiniciarTutorial(): EstadoTutorialV1 {
  return crearEstadoTutorial();
}

function exigirSituacion(
  estado: EstadoTutorialV1,
  esperada: SituacionTutorial,
  operacion: string,
): void {
  if (estado.situacion !== esperada)
    throw new Error(
      `No es posible ${operacion} un tutorial en estado ${estado.situacion}.`,
    );
}
