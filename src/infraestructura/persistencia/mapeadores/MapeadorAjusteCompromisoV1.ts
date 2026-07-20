import { AjusteCompromiso } from "../../../dominio";
import type { AjusteCompromisoV1 } from "../registros/AjusteCompromisoV1";

export class ErrorMapeoAjusteCompromisoV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoAjusteCompromisoV1";
  }
}

export function convertirAjusteCompromisoEnV1(
  ajuste: AjusteCompromiso,
): AjusteCompromisoV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: ajuste.id,
    bloqueId: ajuste.bloqueId,
    canjeRecompensaId: ajuste.canjeRecompensaId,
    tipo: ajuste.tipo,
    aplicadoEn: ajuste.aplicadoEn.toISOString(),
  });
}

export function rehidratarAjusteCompromisoDesdeV1(
  registro: AjusteCompromisoV1,
): AjusteCompromiso {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoAjusteCompromisoV1(
      `La versión ${String(registro.versionEsquema)} del ajuste no está soportada.`,
    );
  }
  try {
    const aplicadoEn = new Date(registro.aplicadoEn);
    if (
      Number.isNaN(aplicadoEn.getTime()) ||
      aplicadoEn.toISOString() !== registro.aplicadoEn
    ) {
      throw new Error("El instante del ajuste no es ISO UTC normalizado.");
    }
    return new AjusteCompromiso({
      id: registro.id,
      bloqueId: registro.bloqueId,
      canjeRecompensaId: registro.canjeRecompensaId,
      tipo: registro.tipo,
      aplicadoEn,
    });
  } catch (error: unknown) {
    throw new ErrorMapeoAjusteCompromisoV1(
      "El registro AjusteCompromisoV1 no satisface las invariantes.",
      error,
    );
  }
}
