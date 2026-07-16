import type { Agenda, Identificador } from "../../dominio";

export class ErrorAgendaDuplicada extends Error {
  public readonly codigo = "AGENDA_DUPLICADA";

  constructor(public readonly id: Identificador) {
    super(`Ya existe una agenda con el identificador ${id}.`);
    this.name = "ErrorAgendaDuplicada";
  }
}

export class ErrorAgendaNoEncontrada extends Error {
  public readonly codigo = "AGENDA_NO_ENCONTRADA";

  constructor(public readonly id: Identificador) {
    super(`No existe una agenda con el identificador ${id}.`);
    this.name = "ErrorAgendaNoEncontrada";
  }
}

export interface RepositorioAgendas {
  guardar(agenda: Agenda): Promise<void>;
  actualizar(agenda: Agenda): Promise<void>;
  obtenerPorId(id: Identificador): Promise<Agenda | undefined>;
  listar(): Promise<readonly Agenda[]>;
}
