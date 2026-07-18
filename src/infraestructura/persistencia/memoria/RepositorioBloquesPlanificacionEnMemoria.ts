import {
  ErrorBloquePlanificacionDuplicado,
  ErrorBloquePlanificacionNoEncontrado,
  type RepositorioBloquesPlanificacion,
} from "../../../aplicacion";
import type { BloquePlanificacion, Identificador } from "../../../dominio";

export class RepositorioBloquesPlanificacionEnMemoria implements RepositorioBloquesPlanificacion {
  private readonly bloques = new Map<Identificador, BloquePlanificacion>();

  public guardar(bloque: BloquePlanificacion): Promise<void> {
    if (this.bloques.has(bloque.id)) {
      return Promise.reject(new ErrorBloquePlanificacionDuplicado(bloque.id));
    }
    this.bloques.set(bloque.id, bloque);
    return Promise.resolve();
  }

  public actualizar(bloque: BloquePlanificacion): Promise<void> {
    if (!this.bloques.has(bloque.id)) {
      return Promise.reject(
        new ErrorBloquePlanificacionNoEncontrado(bloque.id),
      );
    }
    this.bloques.set(bloque.id, bloque);
    return Promise.resolve();
  }

  public obtenerPorId(
    id: Identificador,
  ): Promise<BloquePlanificacion | undefined> {
    return Promise.resolve(this.bloques.get(id));
  }

  public listar(): Promise<readonly BloquePlanificacion[]> {
    return Promise.resolve([...this.bloques.values()]);
  }

  public eliminar(id: Identificador): Promise<void> {
    if (!this.bloques.delete(id)) {
      return Promise.reject(new ErrorBloquePlanificacionNoEncontrado(id));
    }
    return Promise.resolve();
  }
}
