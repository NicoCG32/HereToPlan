import {
  ErrorCortePlanificacionDuplicado,
  ErrorCortePlanificacionNoEncontrado,
  type RepositorioCortesPlanificacion,
} from "../../../aplicacion";
import type { CortePlanificacion, Identificador } from "../../../dominio";
import {
  convertirCortePlanificacionEnV1,
  rehidratarCortePlanificacionDesdeV1,
} from "../mapeadores/MapeadorCortePlanificacionV1";
import type { CortePlanificacionV1 } from "../registros/CortePlanificacionV1";

export class RepositorioCortesPlanificacionEnMemoria implements RepositorioCortesPlanificacion {
  private readonly cortes = new Map<Identificador, CortePlanificacionV1>();

  public guardar(corte: CortePlanificacion): Promise<void> {
    if (this.cortes.has(corte.id)) {
      return Promise.reject(new ErrorCortePlanificacionDuplicado(corte.id));
    }
    this.cortes.set(corte.id, convertirCortePlanificacionEnV1(corte));
    return Promise.resolve();
  }

  public actualizar(corte: CortePlanificacion): Promise<void> {
    if (!this.cortes.has(corte.id)) {
      return Promise.reject(new ErrorCortePlanificacionNoEncontrado(corte.id));
    }
    this.cortes.set(corte.id, convertirCortePlanificacionEnV1(corte));
    return Promise.resolve();
  }

  public obtenerPorId(
    id: Identificador,
  ): Promise<CortePlanificacion | undefined> {
    const registro = this.cortes.get(id);
    return Promise.resolve(
      registro ? rehidratarCortePlanificacionDesdeV1(registro) : undefined,
    );
  }

  public listar(): Promise<readonly CortePlanificacion[]> {
    return Promise.resolve(
      [...this.cortes.values()].map(rehidratarCortePlanificacionDesdeV1),
    );
  }
}
