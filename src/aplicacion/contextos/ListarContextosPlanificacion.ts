import type { RepositorioContextosPlanificacion } from "../puertos/RepositorioContextosPlanificacion";
import {
  convertirContextoADto,
  type ContextoPlanificacionDto,
} from "./ContextoPlanificacionDto";

export class CasoDeUsoListarContextosPlanificacion {
  constructor(
    private readonly repositorio: RepositorioContextosPlanificacion,
  ) {}

  public async ejecutar(): Promise<readonly ContextoPlanificacionDto[]> {
    const contextos = await this.repositorio.listar();
    return Object.freeze(
      [...contextos]
        .sort((a, b) => {
          if (a.esLibre()) return -1;
          if (b.esLibre()) return 1;
          return a.creadaEn.getTime() - b.creadaEn.getTime();
        })
        .map(convertirContextoADto),
    );
  }
}
