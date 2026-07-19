import {
  BloquePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../../../dominio";
import type { BloquePlanificacionV1 } from "../registros/BloquePlanificacionV1";

export class ErrorMapeoBloquePlanificacionV1 extends Error {
  constructor(
    public readonly codigo:
      | "VERSION_BLOQUE_PLANIFICACION_NO_SOPORTADA"
      | "REGISTRO_BLOQUE_PLANIFICACION_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoBloquePlanificacionV1";
  }
}

export function convertirBloquePlanificacionEnV1(
  bloque: BloquePlanificacion,
): BloquePlanificacionV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: bloque.id,
    contextoId: bloque.contextoId,
    actividadId: bloque.actividadId,
    titulo: bloque.titulo,
    fecha: bloque.fecha.toString(),
    minutosPlanificados: bloque.minutosPlanificados,
    politica: Object.freeze({
      ...bloque.politica,
      ajustesPermitidos: Object.freeze([...bloque.politica.ajustesPermitidos]),
    }),
    creadoEn: bloque.creadoEn.toISOString(),
  });
}

export function rehidratarBloquePlanificacionDesdeV1(
  registro: BloquePlanificacionV1,
): BloquePlanificacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoBloquePlanificacionV1(
      "VERSION_BLOQUE_PLANIFICACION_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} del bloque no está soportada.`,
    );
  }
  try {
    return new BloquePlanificacion({
      id: registro.id,
      contextoId: registro.contextoId,
      actividadId: registro.actividadId,
      titulo: registro.titulo,
      fecha: FechaLocal.crear(registro.fecha),
      minutosPlanificados: registro.minutosPlanificados,
      politica: new PoliticaCompromiso({
        rigidez: registro.politica.rigidez,
        autoridadPlazo: registro.politica.autoridadPlazo,
        ajustesPermitidos: registro.politica.ajustesPermitidos,
      }),
      creadoEn: convertirInstante(registro.creadoEn),
    });
  } catch (error: unknown) {
    throw new ErrorMapeoBloquePlanificacionV1(
      "REGISTRO_BLOQUE_PLANIFICACION_INVALIDO",
      `El registro BloquePlanificacionV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function convertirInstante(valor: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoBloquePlanificacionV1(
      "REGISTRO_BLOQUE_PLANIFICACION_INVALIDO",
      "El campo creadoEn debe contener un instante ISO UTC normalizado.",
    );
  }
  return instante;
}
