import type { BloquePlanificacion, Identificador } from "../../dominio";

export class ErrorBloquePlanificacionDuplicado extends Error {
  public readonly codigo = "BLOQUE_PLANIFICACION_DUPLICADO";

  constructor(public readonly id: Identificador) {
    super(`Ya existe un bloque de planificación con el identificador ${id}.`);
    this.name = "ErrorBloquePlanificacionDuplicado";
  }
}

export class ErrorBloquePlanificacionNoEncontrado extends Error {
  public readonly codigo = "BLOQUE_PLANIFICACION_NO_ENCONTRADO";

  constructor(public readonly id: Identificador) {
    super(`No existe el bloque de planificación ${id}.`);
    this.name = "ErrorBloquePlanificacionNoEncontrado";
  }
}

export interface RepositorioBloquesPlanificacion {
  guardar(bloque: BloquePlanificacion): Promise<void>;
  guardarTodos(bloques: readonly BloquePlanificacion[]): Promise<void>;
  actualizar(bloque: BloquePlanificacion): Promise<void>;
  obtenerPorId(id: Identificador): Promise<BloquePlanificacion | undefined>;
  listar(): Promise<readonly BloquePlanificacion[]>;
  eliminar(id: Identificador): Promise<void>;
}
