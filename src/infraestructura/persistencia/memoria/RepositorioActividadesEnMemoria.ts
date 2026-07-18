import {
  ErrorActividadDuplicada,
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

  public listar(): Promise<readonly Actividad[]> {
    return Promise.resolve([...this.actividades.values()]);
  }
}
