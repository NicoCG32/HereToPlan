import {
  ErrorTransaccionPuntosDuplicada,
  type RepositorioTransaccionesPuntos,
} from "../../../aplicacion";
import type { TransaccionPuntos } from "../../../dominio";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export class RepositorioTransaccionesPuntosEnMemoria implements RepositorioTransaccionesPuntos {
  private readonly registros = new Map<string, TransaccionPuntosV1>();

  public guardar(transaccion: TransaccionPuntos): Promise<void> {
    const fuenteDuplicada = [...this.registros.values()].some(
      (registro) =>
        registro.fuenteTipo === transaccion.fuenteTipo &&
        registro.fuenteId === transaccion.fuenteId,
    );
    if (this.registros.has(transaccion.id) || fuenteDuplicada) {
      return Promise.reject(
        new ErrorTransaccionPuntosDuplicada(
          transaccion.id,
          transaccion.fuenteTipo,
          transaccion.fuenteId,
        ),
      );
    }
    this.registros.set(
      transaccion.id,
      convertirTransaccionPuntosEnV1(transaccion),
    );
    return Promise.resolve();
  }

  public listar(): Promise<readonly TransaccionPuntos[]> {
    return Promise.resolve(
      [...this.registros.values()].map(rehidratarTransaccionPuntosDesdeV1),
    );
  }
}
