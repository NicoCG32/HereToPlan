import type { ContextoPlanificacion, Identificador } from "../../dominio";

export class ErrorContextoDuplicado extends Error {
  public readonly codigo = "CONTEXTO_DUPLICADO";

  constructor(public readonly id: Identificador) {
    super(`Ya existe un contexto con el identificador ${id}.`);
    this.name = "ErrorContextoDuplicado";
  }
}

export class ErrorContextoNoEncontrado extends Error {
  public readonly codigo = "CONTEXTO_NO_ENCONTRADO";

  constructor(public readonly id: Identificador) {
    super(`No existe un contexto con el identificador ${id}.`);
    this.name = "ErrorContextoNoEncontrado";
  }
}

export interface RepositorioContextosPlanificacion {
  guardar(contexto: ContextoPlanificacion): Promise<void>;
  obtenerPorId(id: Identificador): Promise<ContextoPlanificacion | undefined>;
  listar(): Promise<readonly ContextoPlanificacion[]>;
  eliminar(contexto: ContextoPlanificacion): Promise<void>;
}
