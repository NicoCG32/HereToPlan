import {
  ErrorActividadDuplicada,
  ErrorActividadNoEncontrada,
  type RepositorioActividades,
} from "../../../aplicacion";
import type { Actividad, Identificador } from "../../../dominio";

export class RepositorioActividadesEnMemoria implements RepositorioActividades {
  private readonly actividades = new Map<Identificador, Actividad>();

  public guardar(actividad: Actividad): Promise<void> {
    if (this.actividades.has(actividad.id)) {
      return Promise.reject(new ErrorActividadDuplicada(actividad.id));
    }
    this.actividades.set(actividad.id, actividad);
    return Promise.resolve();
  }

  public obtenerPorId(id: Identificador): Promise<Actividad | undefined> {
    return Promise.resolve(this.actividades.get(id));
  }

  public actualizar(actividad: Actividad): Promise<void> {
    if (!this.actividades.has(actividad.id)) {
      return Promise.reject(new ErrorActividadNoEncontrada(actividad.id));
    }
    this.actividades.set(actividad.id, actividad);
    return Promise.resolve();
  }

  public listar(): Promise<readonly Actividad[]> {
    return Promise.resolve([...this.actividades.values()]);
  }

  public eliminar(id: Identificador): Promise<void> {
    if (!this.actividades.delete(id)) {
      return Promise.reject(new ErrorActividadNoEncontrada(id));
    }
    return Promise.resolve();
  }
}
