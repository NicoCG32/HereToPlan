import { ReduccionCarga } from "../../../dominio";
import type { ReduccionCargaV1 } from "../registros/ReduccionCargaV1";

export class ErrorMapeoReduccionCargaV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoReduccionCargaV1";
  }
}

export function convertirReduccionCargaEnV1(
  reduccion: ReduccionCarga,
): ReduccionCargaV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: reduccion.id,
    operacionId: reduccion.operacionId,
    movimientoId: reduccion.movimientoId,
    bloqueId: reduccion.bloqueId,
    minutosReducidos: reduccion.minutosReducidos,
    aplicadaEn: reduccion.aplicadaEn.toISOString(),
  });
}

export function rehidratarReduccionCargaDesdeV1(
  registro: ReduccionCargaV1,
): ReduccionCarga {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoReduccionCargaV1(
      `La versión ${String(registro.versionEsquema)} de la reducción no está soportada.`,
    );
  }
  try {
    const aplicadaEn = new Date(registro.aplicadaEn);
    if (
      Number.isNaN(aplicadaEn.getTime()) ||
      aplicadaEn.toISOString() !== registro.aplicadaEn
    ) {
      throw new Error("El instante no es ISO UTC normalizado.");
    }
    return new ReduccionCarga({
      id: registro.id,
      operacionId: registro.operacionId,
      movimientoId: registro.movimientoId,
      bloqueId: registro.bloqueId,
      minutosReducidos: registro.minutosReducidos,
      aplicadaEn,
    });
  } catch (error: unknown) {
    throw new ErrorMapeoReduccionCargaV1(
      "El registro ReduccionCargaV1 no satisface las invariantes.",
      error,
    );
  }
}
