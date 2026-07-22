import {
  ErrorAplicacionRecompensaDuplicada,
  ErrorAdquisicionRecompensaDuplicada,
  ErrorTransaccionPuntosDuplicada,
  type RepositorioInventarioRecompensas,
  type RepositorioAjustesCompromisos,
  type RepositorioResolucionesBloquesPlanificacion,
  type RepositorioTransaccionesPuntos,
  type UnidadTrabajoAdquisicionRecompensa,
  type UnidadTrabajoAplicacionRecompensa,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  type AjusteCompromiso,
  type AplicacionRecompensa,
  type Identificador,
  type RecompensaAdquirida,
  type TransaccionPuntos,
} from "../../../dominio";
import {
  convertirAjusteCompromisoEnV1,
  rehidratarAjusteCompromisoDesdeV1,
} from "../mapeadores/MapeadorAjusteCompromisoV1";
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
import type { AjusteCompromisoV1 } from "../registros/AjusteCompromisoV1";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export class UnidadTrabajoAdquisicionRecompensaEnMemoria
  implements
    UnidadTrabajoAdquisicionRecompensa,
    UnidadTrabajoAplicacionRecompensa,
    RepositorioInventarioRecompensas,
    RepositorioAjustesCompromisos,
    RepositorioTransaccionesPuntos
{
  private adquiridas = new Map<string, RecompensaAdquiridaV1>();
  private aplicaciones = new Map<string, AplicacionRecompensaV1>();
  private ajustes = new Map<string, AjusteCompromisoV1>();
  private transacciones = new Map<string, TransaccionPuntosV1>();
  private cola: Promise<void> = Promise.resolve();

  constructor(
    private readonly repositorioResoluciones?: RepositorioResolucionesBloquesPlanificacion,
  ) {}

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

  public confirmarAplicacion(
    adquiridaConsumida: RecompensaAdquirida,
    aplicacion: AplicacionRecompensa,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    const ejecucion = this.cola.then(() =>
      this.confirmarAplicacionExclusivamente(
        adquiridaConsumida,
        aplicacion,
        ajustes,
      ),
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

  public obtenerAplicacionPorId(
    id: Identificador,
  ): Promise<AplicacionRecompensa | undefined> {
    const registro = this.aplicaciones.get(id);
    return Promise.resolve(
      registro ? rehidratarAplicacionRecompensaDesdeV1(registro) : undefined,
    );
  }

  public listarAjustes(): Promise<readonly AjusteCompromiso[]> {
    return Promise.resolve(
      [...this.ajustes.values()].map(rehidratarAjusteCompromisoDesdeV1),
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

  private async confirmarAplicacionExclusivamente(
    adquiridaConsumida: RecompensaAdquirida,
    aplicacion: AplicacionRecompensa,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    validarCoherenciaAplicacion(adquiridaConsumida, aplicacion, ajustes);
    const repositorioResoluciones = this.repositorioResoluciones;
    const resoluciones = repositorioResoluciones
      ? await Promise.all(
          aplicacion
            .listarBloquesAfectados()
            .map((bloqueId) =>
              repositorioResoluciones.obtenerPorBloqueId(bloqueId),
            ),
        )
      : [];
    const actual = this.adquiridas.get(adquiridaConsumida.id);
    const bloques = new Set(ajustes.map((ajuste) => ajuste.bloqueId));
    if (
      !actual ||
      rehidratarRecompensaAdquiridaDesdeV1(actual).estado !== "DISPONIBLE" ||
      resoluciones.some(Boolean) ||
      this.aplicaciones.has(aplicacion.id) ||
      ajustes.some((ajuste) => this.ajustes.has(ajuste.id)) ||
      [...this.ajustes.values()].some((ajuste) => bloques.has(ajuste.bloqueId))
    ) {
      throw new ErrorAplicacionRecompensaDuplicada();
    }
    const adquiridas = new Map(this.adquiridas);
    const aplicaciones = new Map(this.aplicaciones);
    const ajustesPersistidos = new Map(this.ajustes);
    adquiridas.set(
      adquiridaConsumida.id,
      convertirRecompensaAdquiridaEnV1(adquiridaConsumida),
    );
    aplicaciones.set(
      aplicacion.id,
      convertirAplicacionRecompensaEnV1(aplicacion),
    );
    for (const ajuste of ajustes) {
      ajustesPersistidos.set(ajuste.id, convertirAjusteCompromisoEnV1(ajuste));
    }
    this.adquiridas = adquiridas;
    this.aplicaciones = aplicaciones;
    this.ajustes = ajustesPersistidos;
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

function validarCoherenciaAplicacion(
  adquirida: RecompensaAdquirida,
  aplicacion: AplicacionRecompensa,
  ajustes: readonly AjusteCompromiso[],
): void {
  const afectados = [...aplicacion.listarBloquesAfectados()].sort();
  const ajustesOrdenados = [...ajustes].sort((a, b) =>
    a.bloqueId.localeCompare(b.bloqueId),
  );
  if (
    adquirida.estado !== "CONSUMIDA" ||
    adquirida.aplicacionId !== aplicacion.id ||
    aplicacion.recompensaAdquiridaId !== adquirida.id ||
    aplicacion.recompensaId !== adquirida.recompensaId ||
    ajustesOrdenados.length !== afectados.length ||
    ajustesOrdenados.some(
      (ajuste, indice) =>
        ajuste.bloqueId !== afectados[indice] ||
        ajuste.canjeRecompensaId !== aplicacion.id ||
        ajuste.tipo !== "EXCUSAR",
    )
  ) {
    throw new Error(
      "La unidad, la aplicación y los ajustes no describen la misma operación.",
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
