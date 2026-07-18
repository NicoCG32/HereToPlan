import { ContextoPlanificacion, FechaLocal } from "../../../dominio";
import type { ContextoPlanificacionV1 } from "../registros/ContextoPlanificacionV1";

export class ErrorMapeoContextoPlanificacionV1 extends Error {
  constructor(
    public readonly codigo:
      "VERSION_CONTEXTO_NO_SOPORTADA" | "REGISTRO_CONTEXTO_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoContextoPlanificacionV1";
  }
}

export function convertirContextoEnV1(
  contexto: ContextoPlanificacion,
): ContextoPlanificacionV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: contexto.id,
    nombre: contexto.nombre,
    ...(contexto.proposito ? { proposito: contexto.proposito } : {}),
    tipo: contexto.tipo,
    ...(contexto.fechaInicio
      ? { fechaInicio: contexto.fechaInicio.toString() }
      : {}),
    ...(contexto.fechaFin ? { fechaFin: contexto.fechaFin.toString() } : {}),
    creadaEn: contexto.creadaEn.toISOString(),
  });
}

export function rehidratarContextoDesdeV1(
  registro: ContextoPlanificacionV1,
): ContextoPlanificacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoContextoPlanificacionV1(
      "VERSION_CONTEXTO_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} del contexto no está soportada.`,
    );
  }
  try {
    return ContextoPlanificacion.rehidratar({
      id: registro.id,
      nombre: registro.nombre,
      ...(registro.proposito !== undefined
        ? { proposito: registro.proposito }
        : {}),
      tipo: registro.tipo,
      ...(registro.fechaInicio
        ? { fechaInicio: FechaLocal.crear(registro.fechaInicio) }
        : {}),
      ...(registro.fechaFin
        ? { fechaFin: FechaLocal.crear(registro.fechaFin) }
        : {}),
      creadaEn: convertirInstante(registro.creadaEn),
    });
  } catch (error: unknown) {
    throw new ErrorMapeoContextoPlanificacionV1(
      "REGISTRO_CONTEXTO_INVALIDO",
      `El registro ContextoPlanificacionV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function convertirInstante(valor: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoContextoPlanificacionV1(
      "REGISTRO_CONTEXTO_INVALIDO",
      "El campo creadaEn debe contener un instante ISO UTC normalizado.",
    );
  }
  return instante;
}
