import { CanjeRecompensa, FechaLocal } from "../../../dominio";
import type { CanjeRecompensaV1 } from "../registros/CanjeRecompensaV1";

export class ErrorMapeoCanjeRecompensaV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoCanjeRecompensaV1";
  }
}

export function convertirCanjeRecompensaEnV1(
  canje: CanjeRecompensa,
): CanjeRecompensaV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: canje.id,
    recompensaId: canje.recompensaId,
    puntosGastados: canje.puntosGastados,
    canjeadoEn: canje.canjeadoEn.toISOString(),
    fechaObjetivo: canje.fechaObjetivo.toString(),
    bloquesAfectados: Object.freeze([...canje.listarBloquesAfectados()]),
  });
}

export function rehidratarCanjeRecompensaDesdeV1(
  registro: CanjeRecompensaV1,
): CanjeRecompensa {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoCanjeRecompensaV1(
      `La versión ${String(registro.versionEsquema)} del canje no está soportada.`,
    );
  }
  try {
    const canjeadoEn = new Date(registro.canjeadoEn);
    if (
      Number.isNaN(canjeadoEn.getTime()) ||
      canjeadoEn.toISOString() !== registro.canjeadoEn
    ) {
      throw new Error("El instante de canje no es ISO UTC normalizado.");
    }
    return new CanjeRecompensa({
      id: registro.id,
      recompensaId: registro.recompensaId,
      puntosGastados: registro.puntosGastados,
      canjeadoEn,
      fechaObjetivo: FechaLocal.crear(registro.fechaObjetivo),
      bloquesAfectados: registro.bloquesAfectados,
    });
  } catch (error: unknown) {
    throw new ErrorMapeoCanjeRecompensaV1(
      "El registro CanjeRecompensaV1 no satisface las invariantes.",
      error,
    );
  }
}
