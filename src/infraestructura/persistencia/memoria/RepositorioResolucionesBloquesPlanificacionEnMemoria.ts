import {
  ErrorResolucionBloquePlanificacionDuplicada,
  type RepositorioResolucionesBloquesPlanificacion,
} from "../../../aplicacion";
import type {
  Identificador,
  ResolucionBloquePlanificacion,
} from "../../../dominio";
import {
  convertirResolucionBloquePlanificacionEnV1,
  rehidratarResolucionBloquePlanificacionDesdeV1,
} from "../mapeadores/MapeadorResolucionBloquePlanificacionV1";
import type { ResolucionBloquePlanificacionV1 } from "../registros/ResolucionBloquePlanificacionV1";

export class RepositorioResolucionesBloquesPlanificacionEnMemoria implements RepositorioResolucionesBloquesPlanificacion {
  private readonly porBloque = new Map<
    Identificador,
    ResolucionBloquePlanificacionV1
  >();
  private readonly porOperacion = new Map<Identificador, Identificador>();

  public guardar(resolucion: ResolucionBloquePlanificacion): Promise<void> {
    if (
      this.porBloque.has(resolucion.bloqueId) ||
      this.porOperacion.has(resolucion.operacionId)
    ) {
      return Promise.reject(
        new ErrorResolucionBloquePlanificacionDuplicada(
          resolucion.bloqueId,
          resolucion.operacionId,
        ),
      );
    }
    this.porBloque.set(
      resolucion.bloqueId,
      convertirResolucionBloquePlanificacionEnV1(resolucion),
    );
    this.porOperacion.set(resolucion.operacionId, resolucion.bloqueId);
    return Promise.resolve();
  }

  public obtenerPorBloqueId(
    bloqueId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined> {
    const registro = this.porBloque.get(bloqueId);
    return Promise.resolve(
      registro
        ? rehidratarResolucionBloquePlanificacionDesdeV1(registro)
        : undefined,
    );
  }

  public obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined> {
    const bloqueId = this.porOperacion.get(operacionId);
    return bloqueId ? this.obtenerPorBloqueId(bloqueId) : Promise.resolve();
  }

  public listar(): Promise<readonly ResolucionBloquePlanificacion[]> {
    return Promise.resolve(
      [...this.porBloque.values()].map(
        rehidratarResolucionBloquePlanificacionDesdeV1,
      ),
    );
  }
}
