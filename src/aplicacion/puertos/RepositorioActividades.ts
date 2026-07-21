import type { Actividad, Identificador } from "../../dominio";

export class ErrorActividadDuplicada extends Error {
  public readonly codigo = "ACTIVIDAD_DUPLICADA";

  constructor(public readonly id: Identificador) {
    super(`Ya existe una actividad con el identificador ${id}.`);
    this.name = "ErrorActividadDuplicada";
  }
}

export class ErrorActividadNoEncontrada extends Error {
  public readonly codigo = "ACTIVIDAD_NO_ENCONTRADA";

  constructor(public readonly id: Identificador) {
    super(`No existe una actividad con el identificador ${id}.`);
    this.name = "ErrorActividadNoEncontrada";
  }
}

export interface RepositorioActividades {
  guardar(actividad: Actividad): Promise<void>;
  actualizar(actividad: Actividad): Promise<void>;
  obtenerPorId(id: Identificador): Promise<Actividad | undefined>;
  listar(): Promise<readonly Actividad[]>;
  eliminar(id: Identificador): Promise<void>;
}
