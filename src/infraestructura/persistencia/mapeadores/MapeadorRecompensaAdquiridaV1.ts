import { RecompensaAdquirida } from "../../../dominio";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";

export class ErrorMapeoRecompensaAdquiridaV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoRecompensaAdquiridaV1";
  }
}

export function convertirRecompensaAdquiridaEnV1(
  recompensa: RecompensaAdquirida,
): RecompensaAdquiridaV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: recompensa.id,
    recompensaId: recompensa.recompensaId,
    puntosGastados: recompensa.puntosGastados,
    adquiridaEn: recompensa.adquiridaEn.toISOString(),
    estado: recompensa.estado,
    ...(recompensa.aplicacionId
      ? { aplicacionId: recompensa.aplicacionId }
      : {}),
    ...(recompensa.consumidaEn
      ? { consumidaEn: recompensa.consumidaEn.toISOString() }
      : {}),
  });
}

export function rehidratarRecompensaAdquiridaDesdeV1(
  registro: RecompensaAdquiridaV1,
): RecompensaAdquirida {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoRecompensaAdquiridaV1(
      `La versión ${String(registro.versionEsquema)} de la recompensa adquirida no está soportada.`,
    );
  }
  try {
    const adquiridaEn = instanteNormalizado(registro.adquiridaEn);
    const consumidaEn = registro.consumidaEn
      ? instanteNormalizado(registro.consumidaEn)
      : undefined;
    const recompensa = new RecompensaAdquirida({
      id: registro.id,
      recompensaId: registro.recompensaId,
      puntosGastados: registro.puntosGastados,
      adquiridaEn,
      ...(registro.aplicacionId ? { aplicacionId: registro.aplicacionId } : {}),
      ...(consumidaEn ? { consumidaEn } : {}),
    });
    if (recompensa.estado !== registro.estado) {
      throw new Error("El estado persistido no coincide con el consumo.");
    }
    return recompensa;
  } catch (causa: unknown) {
    throw new ErrorMapeoRecompensaAdquiridaV1(
      "El registro RecompensaAdquiridaV1 no satisface las invariantes.",
      causa,
    );
  }
}

function instanteNormalizado(valor: string): Date {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString() !== valor) {
    throw new Error("El instante no es ISO UTC normalizado.");
  }
  return fecha;
}
