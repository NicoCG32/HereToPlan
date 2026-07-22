import { AplicacionRecompensa, FechaLocal } from "../../../dominio";
import type { AplicacionRecompensaV1 } from "../registros/AplicacionRecompensaV1";

export class ErrorMapeoAplicacionRecompensaV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoAplicacionRecompensaV1";
  }
}

export function convertirAplicacionRecompensaEnV1(
  aplicacion: AplicacionRecompensa,
): AplicacionRecompensaV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: aplicacion.id,
    recompensaAdquiridaId: aplicacion.recompensaAdquiridaId,
    recompensaId: aplicacion.recompensaId,
    puntosGastados: aplicacion.puntosGastados,
    aplicadaEn: aplicacion.aplicadaEn.toISOString(),
    fechaObjetivo: aplicacion.fechaObjetivo.toString(),
    bloquesAfectados: Object.freeze([...aplicacion.listarBloquesAfectados()]),
  });
}

export function rehidratarAplicacionRecompensaDesdeV1(
  registro: AplicacionRecompensaV1,
): AplicacionRecompensa {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoAplicacionRecompensaV1(
      `La versión ${String(registro.versionEsquema)} de la aplicación no está soportada.`,
    );
  }
  try {
    const aplicadaEn = new Date(registro.aplicadaEn);
    if (
      Number.isNaN(aplicadaEn.getTime()) ||
      aplicadaEn.toISOString() !== registro.aplicadaEn
    ) {
      throw new Error("El instante de aplicación no es ISO UTC normalizado.");
    }
    return new AplicacionRecompensa({
      id: registro.id,
      recompensaAdquiridaId: registro.recompensaAdquiridaId,
      recompensaId: registro.recompensaId,
      puntosGastados: registro.puntosGastados,
      aplicadaEn,
      fechaObjetivo: FechaLocal.crear(registro.fechaObjetivo),
      bloquesAfectados: registro.bloquesAfectados,
    });
  } catch (causa: unknown) {
    throw new ErrorMapeoAplicacionRecompensaV1(
      "El registro AplicacionRecompensaV1 no satisface las invariantes.",
      causa,
    );
  }
}
