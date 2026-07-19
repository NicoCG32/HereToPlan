import type {
  Identificador,
  ResolucionBloquePlanificacion,
} from "../../dominio";

export class ErrorResolucionBloquePlanificacionDuplicada extends Error {
  public readonly codigo = "RESOLUCION_BLOQUE_PLANIFICACION_DUPLICADA";

  constructor(
    public readonly bloqueId: Identificador,
    public readonly operacionId: Identificador,
  ) {
    super(
      `Ya existe una resolución para el bloque ${bloqueId} o para la operación ${operacionId}.`,
    );
    this.name = "ErrorResolucionBloquePlanificacionDuplicada";
  }
}

export interface RepositorioResolucionesBloquesPlanificacion {
  guardar(resolucion: ResolucionBloquePlanificacion): Promise<void>;
  obtenerPorBloqueId(
    bloqueId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined>;
  obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined>;
  listar(): Promise<readonly ResolucionBloquePlanificacion[]>;
}
