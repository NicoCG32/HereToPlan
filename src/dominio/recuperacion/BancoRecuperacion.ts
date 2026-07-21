import { ErrorDominio } from "../compartido/ErrorDominio";
import type { MovimientoRecuperacion } from "./MovimientoRecuperacion";

export class BancoRecuperacion {
  private readonly movimientos: MovimientoRecuperacion[] = [];
  private _saldoMinutos = 0;

  public static rehidratar(
    movimientos: Iterable<MovimientoRecuperacion>,
  ): BancoRecuperacion {
    const banco = new BancoRecuperacion();
    for (const movimiento of movimientos) banco.registrar(movimiento);
    return banco;
  }

  public get saldoMinutos(): number {
    return this._saldoMinutos;
  }

  public registrar(movimiento: MovimientoRecuperacion): void {
    if (this.movimientos.some(({ id }) => id === movimiento.id)) {
      throw new ErrorDominio(
        "MOVIMIENTO_RECUPERACION_DUPLICADO",
        "El movimiento de recuperación ya fue registrado.",
      );
    }
    if (
      this.movimientos.some(
        ({ operacionId }) => operacionId === movimiento.operacionId,
      )
    ) {
      throw new ErrorDominio(
        "OPERACION_RECUPERACION_DUPLICADA",
        "La operación de recuperación ya fue utilizada.",
      );
    }
    if (
      this.movimientos.some(
        ({ tipo, bloqueFuenteId }) =>
          tipo === movimiento.tipo &&
          bloqueFuenteId === movimiento.bloqueFuenteId,
      )
    ) {
      throw new ErrorDominio(
        "FUENTE_RECUPERACION_DUPLICADA",
        "El bloque ya originó este tipo de movimiento de recuperación.",
      );
    }
    const saldoSiguiente = this._saldoMinutos + movimiento.obtenerVariacion();
    if (saldoSiguiente < 0) {
      throw new ErrorDominio(
        "SALDO_RECUPERACION_INSUFICIENTE",
        "El banco de recuperación no posee minutos suficientes.",
      );
    }
    this.movimientos.push(movimiento);
    this._saldoMinutos = saldoSiguiente;
  }

  public listarMovimientos(): readonly MovimientoRecuperacion[] {
    return Object.freeze([...this.movimientos]);
  }
}
