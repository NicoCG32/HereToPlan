import {
  ErrorConfirmacionBloqueConPuntosDuplicada,
  ErrorResolucionBloquePlanificacionDuplicada,
  type RepositorioAjustesCompromisos,
  type RepositorioResolucionesBloquesPlanificacion,
  type TransaccionCompletarBloqueConPuntos,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  ErrorDominio,
  type ResolucionBloquePlanificacion,
  type TransaccionPuntos,
} from "../../../dominio";

export class TransaccionCompletarBloqueConPuntosEnMemoria implements TransaccionCompletarBloqueConPuntos {
  private readonly billetera = new BilleteraPuntos();
  private cola: Promise<void> = Promise.resolve();

  constructor(
    private readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion,
    private readonly repositorioAjustes?: RepositorioAjustesCompromisos,
  ) {}

  public confirmar(
    resolucion: ResolucionBloquePlanificacion,
    ingreso: TransaccionPuntos,
  ): Promise<void> {
    const ejecucion = this.cola.then(() =>
      this.confirmarExclusivamente(resolucion, ingreso),
    );
    this.cola = ejecucion.catch(() => undefined);
    return ejecucion;
  }

  public get saldo(): number {
    return this.billetera.saldo;
  }

  public listarIngresos(): readonly TransaccionPuntos[] {
    return this.billetera.listarTransacciones();
  }

  private async confirmarExclusivamente(
    resolucion: ResolucionBloquePlanificacion,
    ingreso: TransaccionPuntos,
  ): Promise<void> {
    const ajustes = await this.repositorioAjustes?.listarAjustes();
    if (ajustes?.some((ajuste) => ajuste.bloqueId === resolucion.bloqueId)) {
      throw new ErrorConfirmacionBloqueConPuntosDuplicada(
        new Error("El bloque ya fue excusado."),
      );
    }
    const billeteraValidada = new BilleteraPuntos();
    for (const transaccion of this.billetera.listarTransacciones()) {
      billeteraValidada.registrar(transaccion);
    }
    try {
      billeteraValidada.registrar(ingreso);
      await this.repositorioResoluciones.guardar(resolucion);
    } catch (error: unknown) {
      if (
        error instanceof ErrorResolucionBloquePlanificacionDuplicada ||
        (error instanceof ErrorDominio &&
          (error.codigo === "TRANSACCION_DUPLICADA" ||
            error.codigo === "FUENTE_PUNTOS_DUPLICADA"))
      ) {
        throw new ErrorConfirmacionBloqueConPuntosDuplicada(error);
      }
      throw error;
    }
    this.billetera.registrar(ingreso);
  }
}
