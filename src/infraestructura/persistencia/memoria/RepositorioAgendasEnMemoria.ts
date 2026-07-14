import {
  ErrorAgendaDuplicada,
  type RepositorioAgendas,
} from "../../../aplicacion";
import type { Agenda, Identificador } from "../../../dominio";

export class RepositorioAgendasEnMemoria implements RepositorioAgendas {
  private readonly agendas = new Map<Identificador, Agenda>();

  public guardar(agenda: Agenda): Promise<void> {
    if (this.agendas.has(agenda.id)) {
      return Promise.reject(new ErrorAgendaDuplicada(agenda.id));
    }

    this.agendas.set(agenda.id, agenda);
    return Promise.resolve();
  }

  public obtenerPorId(id: Identificador): Promise<Agenda | undefined> {
    return Promise.resolve(this.agendas.get(id));
  }
}
