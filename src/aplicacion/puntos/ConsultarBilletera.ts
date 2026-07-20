import { BilleteraPuntos } from "../../dominio";
import type { RepositorioTransaccionesPuntos } from "../puertos/RepositorioTransaccionesPuntos";

export interface MovimientoPuntosDto {
  readonly id: string;
  readonly tipo: "INGRESO" | "GASTO";
  readonly cantidad: number;
  readonly variacion: number;
  readonly fuente: Readonly<{
    tipo: "COMPROMISO_COMPLETADO" | "CANJE_RECOMPENSA";
    id: string;
  }>;
  readonly descripcion: string;
  readonly ocurridaEn: string;
}

export interface BilleteraPuntosDto {
  readonly saldo: number;
  readonly movimientos: readonly MovimientoPuntosDto[];
}

export class CasoDeUsoConsultarBilletera {
  constructor(private readonly repositorio: RepositorioTransaccionesPuntos) {}

  public async ejecutar(): Promise<BilleteraPuntosDto> {
    const transacciones = await this.repositorio.listar();
    const billetera = BilleteraPuntos.rehidratar(transacciones);
    const movimientos = [...billetera.listarTransacciones()]
      .sort(
        (a, b) =>
          b.ocurridaEn.getTime() - a.ocurridaEn.getTime() ||
          b.id.localeCompare(a.id),
      )
      .map((transaccion) =>
        Object.freeze({
          id: transaccion.id,
          tipo: transaccion.tipo,
          cantidad: transaccion.cantidad,
          variacion: transaccion.obtenerVariacion(),
          fuente: Object.freeze({
            tipo: transaccion.fuenteTipo,
            id: transaccion.fuenteId,
          }),
          descripcion: transaccion.descripcion,
          ocurridaEn: transaccion.ocurridaEn.toISOString(),
        }),
      );
    return Object.freeze({
      saldo: billetera.saldo,
      movimientos: Object.freeze(movimientos),
    });
  }
}
