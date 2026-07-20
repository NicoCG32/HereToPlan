import { TransaccionPuntos } from "../../../dominio";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export function convertirTransaccionPuntosEnV1(
  transaccion: TransaccionPuntos,
): TransaccionPuntosV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: transaccion.id,
    tipo: transaccion.tipo,
    cantidad: transaccion.cantidad,
    fuenteTipo: transaccion.fuenteTipo,
    fuenteId: transaccion.fuenteId,
    descripcion: transaccion.descripcion,
    ocurridaEn: transaccion.ocurridaEn.toISOString(),
  });
}

export class ErrorMapeoTransaccionPuntosV1 extends Error {
  constructor(
    public readonly codigo:
      | "VERSION_TRANSACCION_PUNTOS_NO_SOPORTADA"
      | "REGISTRO_TRANSACCION_PUNTOS_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoTransaccionPuntosV1";
  }
}

export function rehidratarTransaccionPuntosDesdeV1(
  registro: TransaccionPuntosV1,
): TransaccionPuntos {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoTransaccionPuntosV1(
      "VERSION_TRANSACCION_PUNTOS_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} de la transacción de puntos no está soportada.`,
    );
  }
  try {
    return new TransaccionPuntos({
      id: registro.id,
      tipo: registro.tipo,
      cantidad: registro.cantidad,
      fuenteTipo: registro.fuenteTipo,
      fuenteId: registro.fuenteId,
      descripcion: registro.descripcion,
      ocurridaEn: convertirInstante(registro.ocurridaEn),
    });
  } catch (error: unknown) {
    if (error instanceof ErrorMapeoTransaccionPuntosV1) throw error;
    throw new ErrorMapeoTransaccionPuntosV1(
      "REGISTRO_TRANSACCION_PUNTOS_INVALIDO",
      `El registro TransaccionPuntosV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function convertirInstante(valor: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoTransaccionPuntosV1(
      "REGISTRO_TRANSACCION_PUNTOS_INVALIDO",
      "El campo ocurridaEn debe contener un instante ISO UTC normalizado.",
    );
  }
  return instante;
}
