import {
  ContextoPlanificacion,
  IDENTIFICADOR_CONTEXTO_LIBRE,
} from "../../dominio";
import {
  ErrorContextoDuplicado,
  type RepositorioContextosPlanificacion,
} from "../puertos/RepositorioContextosPlanificacion";
import type { Reloj } from "../puertos/Reloj";
import {
  convertirContextoADto,
  type ContextoPlanificacionDto,
} from "./ContextoPlanificacionDto";

export interface InicializarContextosPlanificacion {
  ejecutar(): Promise<ContextoPlanificacionDto>;
}

export class CasoDeUsoInicializarContextosPlanificacion implements InicializarContextosPlanificacion {
  constructor(
    private readonly repositorio: RepositorioContextosPlanificacion,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(): Promise<ContextoPlanificacionDto> {
    const existente = await this.repositorio.obtenerPorId(
      IDENTIFICADOR_CONTEXTO_LIBRE,
    );
    if (existente) return convertirContextoADto(existente);

    const libre = ContextoPlanificacion.crearLibre(this.reloj.ahora());
    try {
      await this.repositorio.guardar(libre);
      return convertirContextoADto(libre);
    } catch (error: unknown) {
      if (error instanceof ErrorContextoDuplicado) {
        const ganador = await this.repositorio.obtenerPorId(
          IDENTIFICADOR_CONTEXTO_LIBRE,
        );
        if (ganador) return convertirContextoADto(ganador);
      }
      throw error;
    }
  }
}
