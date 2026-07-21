import { FechaLocal, MovimientoRecuperacion } from "../../../dominio";
import type { MovimientoRecuperacionV1 } from "../registros/MovimientoRecuperacionV1";

export class ErrorMapeoMovimientoRecuperacionV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoMovimientoRecuperacionV1";
  }
}

export function convertirMovimientoRecuperacionEnV1(
  movimiento: MovimientoRecuperacion,
): MovimientoRecuperacionV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: movimiento.id,
    operacionId: movimiento.operacionId,
    tipo: movimiento.tipo,
    minutos: movimiento.minutos,
    bloqueFuenteId: movimiento.bloqueFuenteId,
    fechaFuente: movimiento.fechaFuente.toString(),
    descripcion: movimiento.descripcion,
    ocurridoEn: movimiento.ocurridoEn.toISOString(),
  });
}

export function rehidratarMovimientoRecuperacionDesdeV1(
  registro: MovimientoRecuperacionV1,
): MovimientoRecuperacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoMovimientoRecuperacionV1(
      `La versión ${String(registro.versionEsquema)} del movimiento no está soportada.`,
    );
  }
  try {
    const ocurridoEn = new Date(registro.ocurridoEn);
    if (
      Number.isNaN(ocurridoEn.getTime()) ||
      ocurridoEn.toISOString() !== registro.ocurridoEn
    ) {
      throw new Error("El instante no es ISO UTC normalizado.");
    }
    return new MovimientoRecuperacion({
      id: registro.id,
      operacionId: registro.operacionId,
      tipo: registro.tipo,
      minutos: registro.minutos,
      bloqueFuenteId: registro.bloqueFuenteId,
      fechaFuente: FechaLocal.crear(registro.fechaFuente),
      descripcion: registro.descripcion,
      ocurridoEn,
    });
  } catch (error: unknown) {
    throw new ErrorMapeoMovimientoRecuperacionV1(
      "El registro MovimientoRecuperacionV1 no satisface las invariantes.",
      error,
    );
  }
}
