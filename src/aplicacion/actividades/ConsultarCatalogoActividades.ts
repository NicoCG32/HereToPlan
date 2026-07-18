import type { RepositorioActividades } from "../puertos/RepositorioActividades";
import type { RepositorioAgendas } from "../puertos/RepositorioAgendas";
import { convertirActividadADto, type ActividadDto } from "./ActividadDto";

export type FiltroCatalogoActividades = "TODAS" | "SIN_PROGRAMAR";

export interface ConsultarCatalogoActividades {
  listar(filtro?: FiltroCatalogoActividades): Promise<readonly ActividadDto[]>;
  obtenerPorId(id: string): Promise<ActividadDto | undefined>;
}

export class CasoDeUsoConsultarCatalogoActividades implements ConsultarCatalogoActividades {
  constructor(
    private readonly repositorioActividades: RepositorioActividades,
    private readonly repositorioAgendas: RepositorioAgendas,
  ) {}

  public async listar(
    filtro: FiltroCatalogoActividades = "TODAS",
  ): Promise<readonly ActividadDto[]> {
    const actividades = await this.repositorioActividades.listar();
    if (filtro === "TODAS") {
      return Object.freeze(actividades.map(convertirActividadADto));
    }

    const agendas = await this.repositorioAgendas.listar();
    const programadas = new Set(
      agendas.flatMap((agenda) =>
        agenda.listarBloques().map((bloque) => bloque.actividadId),
      ),
    );

    return Object.freeze(
      actividades
        .filter((actividad) => !programadas.has(actividad.id))
        .map(convertirActividadADto),
    );
  }

  public async obtenerPorId(id: string): Promise<ActividadDto | undefined> {
    const actividad = await this.repositorioActividades.obtenerPorId(id);
    return actividad ? convertirActividadADto(actividad) : undefined;
  }
}
