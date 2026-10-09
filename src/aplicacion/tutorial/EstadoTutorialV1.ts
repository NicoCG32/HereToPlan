export const VERSION_ESTADO_TUTORIAL = 1 as const;

export const IDS_PASOS_TUTORIAL = [
  "NAVEGACION",
  "LIBRE",
  "AGENDA_OPCIONAL",
  "ACTIVIDAD",
  "ASIGNACION",
  "REVISION",
  "CONFIRMACION",
  "EJECUCION",
] as const;
export type IdPasoTutorial = (typeof IDS_PASOS_TUTORIAL)[number];

export const SITUACIONES_TUTORIAL = [
  "NO_INICIADO",
  "EN_CURSO",
  "POSPUESTO",
  "OMITIDO",
  "COMPLETADO",
] as const;
export type SituacionTutorial = (typeof SITUACIONES_TUTORIAL)[number];

export interface EstadoTutorialV1 {
  readonly version: typeof VERSION_ESTADO_TUTORIAL;
  readonly situacion: SituacionTutorial;
  readonly pasoActual: IdPasoTutorial | null;
}

export function crearEstadoTutorialInicial(): EstadoTutorialV1 {
  return {
    version: VERSION_ESTADO_TUTORIAL,
    situacion: "NO_INICIADO",
    pasoActual: null,
  };
}

export function esEstadoTutorialV1(datos: unknown): datos is EstadoTutorialV1 {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return false;
  const valor = datos as Record<string, unknown>;
  if (
    Object.keys(valor).length !== 3 ||
    valor.version !== VERSION_ESTADO_TUTORIAL ||
    !SITUACIONES_TUTORIAL.some((situacion) => situacion === valor.situacion)
  )
    return false;
  const activo =
    valor.situacion === "EN_CURSO" || valor.situacion === "POSPUESTO";
  return activo
    ? IDS_PASOS_TUTORIAL.some((paso) => paso === valor.pasoActual)
    : valor.pasoActual === null;
}
