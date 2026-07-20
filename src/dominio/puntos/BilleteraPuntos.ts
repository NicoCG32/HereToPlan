import { ErrorDominio } from "../compartido/ErrorDominio";
import type { TransaccionPuntos } from "./TransaccionPuntos";

export class BilleteraPuntos {
  private readonly transacciones: TransaccionPuntos[] = [];

  public static rehidratar(
    transacciones: readonly TransaccionPuntos[],
  ): BilleteraPuntos {
    const billetera = new BilleteraPuntos();
    const ordenadas = [...transacciones].sort(
      (a, b) =>
        a.ocurridaEn.getTime() - b.ocurridaEn.getTime() ||
        a.id.localeCompare(b.id),
    );
    for (const transaccion of ordenadas) billetera.registrar(transaccion);
    return billetera;
  }

  public get saldo(): number {
    return this.transacciones.reduce(
      (total, transaccion) => total + transaccion.obtenerVariacion(),
      0,
    );
  }

  public registrar(transaccion: TransaccionPuntos): void {
    if (this.transacciones.some((actual) => actual.id === transaccion.id)) {
      throw new ErrorDominio(
        "TRANSACCION_DUPLICADA",
        "La transacción ya fue registrada.",
      );
    }
    if (
      this.transacciones.some(
        (actual) =>
          actual.fuenteTipo === transaccion.fuenteTipo &&
          actual.fuenteId === transaccion.fuenteId,
      )
    ) {
      throw new ErrorDominio(
        "FUENTE_PUNTOS_DUPLICADA",
        "El mismo hecho no puede generar o consumir puntos dos veces.",
      );
    }

    const saldoResultante = this.saldo + transaccion.obtenerVariacion();
    if (saldoResultante < 0) {
      throw new ErrorDominio(
        "SALDO_INSUFICIENTE",
        "La billetera no puede quedar con saldo negativo.",
      );
    }

    this.transacciones.push(transaccion);
  }

  public listarTransacciones(): readonly TransaccionPuntos[] {
    return [...this.transacciones];
  }
}
