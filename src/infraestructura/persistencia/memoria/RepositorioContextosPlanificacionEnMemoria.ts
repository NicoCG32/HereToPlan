import {
  ErrorContextoDuplicado,
  ErrorContextoNoEncontrado,
  type RepositorioContextosPlanificacion,
} from "../../../aplicacion";
import type { ContextoPlanificacion, Identificador } from "../../../dominio";

export class RepositorioContextosPlanificacionEnMemoria implements RepositorioContextosPlanificacion {
  private readonly contextos = new Map<Identificador, ContextoPlanificacion>();

  public guardar(contexto: ContextoPlanificacion): Promise<void> {
    if (this.contextos.has(contexto.id)) {
      return Promise.reject(new ErrorContextoDuplicado(contexto.id));
    }
    this.contextos.set(contexto.id, contexto);
    return Promise.resolve();
  }

  public obtenerPorId(
    id: Identificador,
  ): Promise<ContextoPlanificacion | undefined> {
    return Promise.resolve(this.contextos.get(id));
  }

  public listar(): Promise<readonly ContextoPlanificacion[]> {
    return Promise.resolve([...this.contextos.values()]);
  }

  public eliminar(contexto: ContextoPlanificacion): Promise<void> {
    try {
      contexto.exigirEliminable();
    } catch (error: unknown) {
      return Promise.reject(
        error instanceof Error
          ? error
          : new Error("No fue posible validar la eliminación del contexto.", {
              cause: error,
            }),
      );
    }
    if (!this.contextos.delete(contexto.id)) {
      return Promise.reject(new ErrorContextoNoEncontrado(contexto.id));
    }
    return Promise.resolve();
  }
}
