import type { CortePlanificacion, Identificador } from "../../dominio";

export class ErrorCortePlanificacionDuplicado extends Error {
  public readonly codigo = "CORTE_PLANIFICACION_DUPLICADO";

  constructor(public readonly id: Identificador) {
    super(`Ya existe un corte de planificación con el identificador ${id}.`);
    this.name = "ErrorCortePlanificacionDuplicado";
  }
}

export class ErrorCortePlanificacionNoEncontrado extends Error {
  public readonly codigo = "CORTE_PLANIFICACION_NO_ENCONTRADO";

  constructor(public readonly id: Identificador) {
    super(`No existe el corte de planificación ${id}.`);
    this.name = "ErrorCortePlanificacionNoEncontrado";
  }
}

export interface RepositorioCortesPlanificacion {
  guardar(corte: CortePlanificacion): Promise<void>;
  actualizar(corte: CortePlanificacion): Promise<void>;
  obtenerPorId(id: Identificador): Promise<CortePlanificacion | undefined>;
  listar(): Promise<readonly CortePlanificacion[]>;
}
