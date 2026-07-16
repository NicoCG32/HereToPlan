import type { RepositorioAgendas } from "../puertos/RepositorioAgendas";
import {
  convertirAgendaBorradorEnDto,
  type AgendaBorradorDto,
} from "./AgendaBorradorDto";

export interface ListarAgendasBorrador {
  ejecutar(): Promise<readonly AgendaBorradorDto[]>;
}

export class CasoDeUsoListarAgendasBorrador implements ListarAgendasBorrador {
  constructor(private readonly repositorio: RepositorioAgendas) {}

  public async ejecutar(): Promise<readonly AgendaBorradorDto[]> {
    const agendas = await this.repositorio.listar();

    return Object.freeze(
      agendas
        .filter((agenda) => agenda.estado === "BORRADOR")
        .sort((primera, segunda) =>
          primera.creadaEn
            .toISOString()
            .localeCompare(segunda.creadaEn.toISOString()),
        )
        .map(convertirAgendaBorradorEnDto),
    );
  }
}
