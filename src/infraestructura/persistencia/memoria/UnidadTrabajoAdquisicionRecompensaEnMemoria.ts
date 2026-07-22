import {
  ErrorAdquisicionRecompensaDuplicada,
  ErrorTransaccionPuntosDuplicada,
  type RepositorioInventarioRecompensas,
  type RepositorioTransaccionesPuntos,
  type UnidadTrabajoAdquisicionRecompensa,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  type AplicacionRecompensa,
  type Identificador,
  type RecompensaAdquirida,
  type TransaccionPuntos,
} from "../../../dominio";
import {
  convertirAplicacionRecompensaEnV1,
  rehidratarAplicacionRecompensaDesdeV1,
} from "../mapeadores/MapeadorAplicacionRecompensaV1";
import {
  convertirRecompensaAdquiridaEnV1,
  rehidratarRecompensaAdquiridaDesdeV1,
} from "../mapeadores/MapeadorRecompensaAdquiridaV1";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { AplicacionRecompensaV1 } from "../registros/AplicacionRecompensaV1";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export class UnidadTrabajoAdquisicionRecompensaEnMemoria
  implements
    UnidadTrabajoAdquisicionRecompensa,
    RepositorioInventarioRecompensas,
    RepositorioTransaccionesPuntos
{
  private adquiridas = new Map<string, RecompensaAdquiridaV1>();
  private aplicaciones = new Map<string, AplicacionRecompensaV1>();
  private transacciones = new Map<string, TransaccionPuntosV1>();
  private cola: Promise<void> = Promise.resolve();

  public confirmarAdquisicion(
    adquirida: RecompensaAdquirida,
    gasto: TransaccionPuntos,
  ): Promise<void> {
    const ejecucion = this.cola.then(() =>
      this.confirmarExclusivamente(adquirida, gasto),
    );
    this.cola = ejecucion.catch(() => undefined);
    return ejecucion;
  }

  public guardar(transaccion: TransaccionPuntos): Promise<void> {
    if (this.transaccionDuplicada(transaccion)) {
      return Promise.reject(
        new ErrorTransaccionPuntosDuplicada(
          transaccion.id,
          transaccion.fuenteTipo,
          transaccion.fuenteId,
        ),
      );
    }
    const billetera = BilleteraPuntos.rehidratar(
      [...this.transacciones.values()].map(rehidratarTransaccionPuntosDesdeV1),
    );
    billetera.registrar(transaccion);
    this.transacciones.set(
      transaccion.id,
      convertirTransaccionPuntosEnV1(transaccion),
    );
    return Promise.resolve();
  }

  public listar(): Promise<readonly TransaccionPuntos[]> {
    return Promise.resolve(
      [...this.transacciones.values()].map(rehidratarTransaccionPuntosDesdeV1),
    );
  }

  public obtenerAdquiridaPorId(
    id: Identificador,
  ): Promise<RecompensaAdquirida | undefined> {
    const registro = this.adquiridas.get(id);
    return Promise.resolve(
      registro ? rehidratarRecompensaAdquiridaDesdeV1(registro) : undefined,
    );
  }

  public listarAdquiridas(): Promise<readonly RecompensaAdquirida[]> {
    return Promise.resolve(
      [...this.adquiridas.values()].map(rehidratarRecompensaAdquiridaDesdeV1),
    );
  }

  public listarAplicaciones(): Promise<readonly AplicacionRecompensa[]> {
    return Promise.resolve(
      [...this.aplicaciones.values()].map(
        rehidratarAplicacionRecompensaDesdeV1,
      ),
    );
  }

  public sembrarAplicacion(
    adquirida: RecompensaAdquirida,
    aplicacion: AplicacionRecompensa,
  ): void {
    this.adquiridas.set(
      adquirida.id,
      convertirRecompensaAdquiridaEnV1(adquirida),
    );
    this.aplicaciones.set(
      aplicacion.id,
      convertirAplicacionRecompensaEnV1(aplicacion),
    );
  }

  private confirmarExclusivamente(
    adquirida: RecompensaAdquirida,
    gasto: TransaccionPuntos,
  ): void {
    validarCoherencia(adquirida, gasto);
    if (this.adquiridas.has(adquirida.id) || this.transaccionDuplicada(gasto)) {
      throw new ErrorAdquisicionRecompensaDuplicada();
    }
    const billetera = BilleteraPuntos.rehidratar(
      [...this.transacciones.values()].map(rehidratarTransaccionPuntosDesdeV1),
    );
    billetera.registrar(gasto);
    this.adquiridas.set(
      adquirida.id,
      convertirRecompensaAdquiridaEnV1(adquirida),
    );
    this.transacciones.set(gasto.id, convertirTransaccionPuntosEnV1(gasto));
  }

  private transaccionDuplicada(transaccion: TransaccionPuntos): boolean {
    return (
      this.transacciones.has(transaccion.id) ||
      [...this.transacciones.values()].some(
        (actual) =>
          actual.fuenteTipo === transaccion.fuenteTipo &&
          actual.fuenteId === transaccion.fuenteId,
      )
    );
  }
}

function validarCoherencia(
  adquirida: RecompensaAdquirida,
  gasto: TransaccionPuntos,
): void {
  if (
    adquirida.estado !== "DISPONIBLE" ||
    gasto.tipo !== "GASTO" ||
    gasto.fuenteTipo !== "ADQUISICION_RECOMPENSA" ||
    gasto.fuenteId !== adquirida.id ||
    gasto.cantidad !== adquirida.puntosGastados
  ) {
    throw new Error(
      "La recompensa adquirida y el gasto no describen la misma operación.",
    );
  }
}
