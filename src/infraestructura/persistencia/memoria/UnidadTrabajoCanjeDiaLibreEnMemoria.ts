import {
  ErrorConfirmacionCanjeDiaLibreDuplicada,
  ErrorTransaccionPuntosDuplicada,
  type RepositorioAjustesCompromisos,
  type RepositorioCanjesRecompensas,
  type RepositorioResolucionesBloquesPlanificacion,
  type RepositorioTransaccionesPuntos,
  type UnidadTrabajoCanjeDiaLibre,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  type AjusteCompromiso,
  type CanjeRecompensa,
  type Identificador,
  type TransaccionPuntos,
} from "../../../dominio";
import {
  convertirAjusteCompromisoEnV1,
  rehidratarAjusteCompromisoDesdeV1,
} from "../mapeadores/MapeadorAjusteCompromisoV1";
import {
  convertirCanjeRecompensaEnV1,
  rehidratarCanjeRecompensaDesdeV1,
} from "../mapeadores/MapeadorCanjeRecompensaV1";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { AjusteCompromisoV1 } from "../registros/AjusteCompromisoV1";
import type { CanjeRecompensaV1 } from "../registros/CanjeRecompensaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export class UnidadTrabajoCanjeDiaLibreEnMemoria
  implements
    UnidadTrabajoCanjeDiaLibre,
    RepositorioCanjesRecompensas,
    RepositorioAjustesCompromisos,
    RepositorioTransaccionesPuntos
{
  private canjes = new Map<string, CanjeRecompensaV1>();
  private ajustes = new Map<string, AjusteCompromisoV1>();
  private transacciones = new Map<string, TransaccionPuntosV1>();
  private cola: Promise<void> = Promise.resolve();

  constructor(
    private readonly repositorioResoluciones?: RepositorioResolucionesBloquesPlanificacion,
  ) {}

  public confirmar(
    canje: CanjeRecompensa,
    gasto: TransaccionPuntos,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    const ejecucion = this.cola.then(() =>
      this.confirmarExclusivamente(canje, gasto, ajustes),
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

  public obtenerCanjePorId(
    id: Identificador,
  ): Promise<CanjeRecompensa | undefined> {
    const registro = this.canjes.get(id);
    return Promise.resolve(
      registro ? rehidratarCanjeRecompensaDesdeV1(registro) : undefined,
    );
  }

  public listarCanjes(): Promise<readonly CanjeRecompensa[]> {
    return Promise.resolve(
      [...this.canjes.values()].map(rehidratarCanjeRecompensaDesdeV1),
    );
  }

  public listarAjustes(): Promise<readonly AjusteCompromiso[]> {
    return Promise.resolve(
      [...this.ajustes.values()].map(rehidratarAjusteCompromisoDesdeV1),
    );
  }

  private async confirmarExclusivamente(
    canje: CanjeRecompensa,
    gasto: TransaccionPuntos,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    const bloquesAfectados = canje.listarBloquesAfectados();
    const repositorioResoluciones = this.repositorioResoluciones;
    const resoluciones = repositorioResoluciones
      ? await Promise.all(
          bloquesAfectados.map((bloqueId) =>
            repositorioResoluciones.obtenerPorBloqueId(bloqueId),
          ),
        )
      : [];
    const bloquesAjustados = ajustes.map((ajuste) => ajuste.bloqueId);
    const cargaCoherente =
      ajustes.length === bloquesAfectados.length &&
      new Set(ajustes.map((ajuste) => ajuste.id)).size === ajustes.length &&
      new Set(bloquesAjustados).size === bloquesAjustados.length &&
      bloquesAfectados.every((bloqueId) =>
        bloquesAjustados.includes(bloqueId),
      ) &&
      ajustes.every(
        (ajuste) =>
          ajuste.canjeRecompensaId === canje.id && ajuste.tipo === "EXCUSAR",
      ) &&
      gasto.tipo === "GASTO" &&
      gasto.fuenteTipo === "CANJE_RECOMPENSA" &&
      gasto.fuenteId === canje.id &&
      gasto.cantidad === canje.puntosGastados;
    if (!cargaCoherente) {
      throw new Error(
        "El canje, el gasto y los ajustes no describen la misma operación.",
      );
    }
    if (resoluciones.some(Boolean)) {
      throw new ErrorConfirmacionCanjeDiaLibreDuplicada(
        new Error("Uno de los bloques ya fue resuelto."),
      );
    }
    const canjes = new Map(this.canjes);
    const transacciones = new Map(this.transacciones);
    const ajustesPersistidos = new Map(this.ajustes);
    if (
      canjes.has(canje.id) ||
      this.transaccionDuplicada(gasto, transacciones) ||
      ajustes.some(
        (ajuste) =>
          ajustesPersistidos.has(ajuste.id) ||
          [...ajustesPersistidos.values()].some(
            (actual) => actual.bloqueId === ajuste.bloqueId,
          ),
      )
    ) {
      throw new ErrorConfirmacionCanjeDiaLibreDuplicada();
    }
    const billetera = BilleteraPuntos.rehidratar(
      [...transacciones.values()].map(rehidratarTransaccionPuntosDesdeV1),
    );
    billetera.registrar(gasto);
    canjes.set(canje.id, convertirCanjeRecompensaEnV1(canje));
    transacciones.set(gasto.id, convertirTransaccionPuntosEnV1(gasto));
    for (const ajuste of ajustes) {
      ajustesPersistidos.set(ajuste.id, convertirAjusteCompromisoEnV1(ajuste));
    }
    this.canjes = canjes;
    this.transacciones = transacciones;
    this.ajustes = ajustesPersistidos;
  }

  private transaccionDuplicada(
    transaccion: TransaccionPuntos,
    registros: ReadonlyMap<string, TransaccionPuntosV1> = this.transacciones,
  ): boolean {
    return (
      registros.has(transaccion.id) ||
      [...registros.values()].some(
        (actual) =>
          actual.fuenteTipo === transaccion.fuenteTipo &&
          actual.fuenteId === transaccion.fuenteId,
      )
    );
  }
}
