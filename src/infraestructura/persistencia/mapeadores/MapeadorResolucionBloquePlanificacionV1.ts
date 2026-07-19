import { ResolucionBloquePlanificacion } from "../../../dominio";
import type { ResolucionBloquePlanificacionV1 } from "../registros/ResolucionBloquePlanificacionV1";

export class ErrorMapeoResolucionBloquePlanificacionV1 extends Error {
  constructor(
    public readonly codigo:
      | "VERSION_RESOLUCION_BLOQUE_NO_SOPORTADA"
      | "REGISTRO_RESOLUCION_BLOQUE_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoResolucionBloquePlanificacionV1";
  }
}

export function convertirResolucionBloquePlanificacionEnV1(
  resolucion: ResolucionBloquePlanificacion,
): ResolucionBloquePlanificacionV1 {
  return Object.freeze({
    versionEsquema: 1,
    bloqueId: resolucion.bloqueId,
    operacionId: resolucion.operacionId,
    resultado: resolucion.resultado,
    resueltoEn: resolucion.resueltoEn.toISOString(),
  });
}

export function rehidratarResolucionBloquePlanificacionDesdeV1(
  registro: ResolucionBloquePlanificacionV1,
): ResolucionBloquePlanificacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoResolucionBloquePlanificacionV1(
      "VERSION_RESOLUCION_BLOQUE_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} de la resolución no está soportada.`,
    );
  }
  try {
    return new ResolucionBloquePlanificacion({
      bloqueId: registro.bloqueId,
      operacionId: registro.operacionId,
      resultado: registro.resultado,
      resueltoEn: convertirInstante(registro.resueltoEn),
    });
  } catch (error: unknown) {
    throw new ErrorMapeoResolucionBloquePlanificacionV1(
      "REGISTRO_RESOLUCION_BLOQUE_INVALIDO",
      `El registro ResolucionBloquePlanificacionV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function convertirInstante(valor: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoResolucionBloquePlanificacionV1(
      "REGISTRO_RESOLUCION_BLOQUE_INVALIDO",
      "El campo resueltoEn debe contener un instante ISO UTC normalizado.",
    );
  }
  return instante;
}
