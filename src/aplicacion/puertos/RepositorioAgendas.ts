import type { Agenda, Identificador } from "../../dominio";

export class ErrorAgendaDuplicada extends Error {
  public readonly codigo = "AGENDA_DUPLICADA";

  constructor(public readonly id: Identificador) {
    super(`Ya existe una agenda con el identificador ${id}.`);
    this.name = "ErrorAgendaDuplicada";
  }
}

export interface RepositorioAgendas {
  guardar(agenda: Agenda): Promise<void>;
  obtenerPorId(id: Identificador): Promise<Agenda | undefined>;
}
