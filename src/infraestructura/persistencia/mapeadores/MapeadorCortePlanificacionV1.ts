import {
  CortePlanificacion,
  FechaLocal,
  type DatosBloqueCortePlanificacion,
} from "../../../dominio";
import type {
  BloqueCortePlanificacionV1,
  CortePlanificacionV1,
} from "../registros/CortePlanificacionV1";
import {
  convertirPoliticaEnV1,
  rehidratarPoliticaDesdeV1,
} from "./MapeadorPoliticaCompromisoV1";

export class ErrorMapeoCortePlanificacionV1 extends Error {
  constructor(
    public readonly codigo:
      | "VERSION_CORTE_PLANIFICACION_NO_SOPORTADA"
      | "REGISTRO_CORTE_PLANIFICACION_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoCortePlanificacionV1";
  }
}

export function convertirCortePlanificacionEnV1(
  corte: CortePlanificacion,
): CortePlanificacionV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: corte.id,
    estado: corte.estado,
    creadoEn: corte.creadoEn.toISOString(),
    ...(corte.asignadaEn ? { asignadaEn: corte.asignadaEn.toISOString() } : {}),
    ...(corte.confirmarAutomaticamenteEn
      ? {
          confirmarAutomaticamenteEn:
            corte.confirmarAutomaticamenteEn.toISOString(),
        }
      : {}),
    ...(corte.confirmadaEn
      ? { confirmadaEn: corte.confirmadaEn.toISOString() }
      : {}),
    bloques: Object.freeze(
      corte.listarBloques().map((bloque) =>
        Object.freeze({
          versionEsquema: 1 as const,
          id: bloque.id,
          contextoId: bloque.contextoId,
          actividadId: bloque.actividadId,
          titulo: bloque.titulo,
          fecha: bloque.fecha.toString(),
          minutosPlanificados: bloque.minutosPlanificados,
          politica: convertirPoliticaEnV1(bloque.politica),
          creadoEn: bloque.creadoEn.toISOString(),
        }),
      ),
    ),
  });
}

export function rehidratarCortePlanificacionDesdeV1(
  registro: CortePlanificacionV1,
): CortePlanificacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoCortePlanificacionV1(
      "VERSION_CORTE_PLANIFICACION_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} del corte no está soportada.`,
    );
  }

  try {
    return CortePlanificacion.rehidratar({
      id: registro.id,
      estado: registro.estado,
      creadoEn: convertirInstante(registro.creadoEn, "creadoEn"),
      ...(registro.asignadaEn !== undefined
        ? {
            asignadaEn: convertirInstante(registro.asignadaEn, "asignadaEn"),
          }
        : {}),
      ...(registro.confirmarAutomaticamenteEn !== undefined
        ? {
            confirmarAutomaticamenteEn: convertirInstante(
              registro.confirmarAutomaticamenteEn,
              "confirmarAutomaticamenteEn",
            ),
          }
        : {}),
      ...(registro.confirmadaEn !== undefined
        ? {
            confirmadaEn: convertirInstante(
              registro.confirmadaEn,
              "confirmadaEn",
            ),
          }
        : {}),
      bloques: registro.bloques.map(rehidratarBloque),
    });
  } catch (error: unknown) {
    throw new ErrorMapeoCortePlanificacionV1(
      "REGISTRO_CORTE_PLANIFICACION_INVALIDO",
      `El registro CortePlanificacionV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function rehidratarBloque(
  registro: BloqueCortePlanificacionV1,
): DatosBloqueCortePlanificacion {
  if (Number(registro.versionEsquema) !== 1) {
    throw new Error(
      `La versión ${String(registro.versionEsquema)} de la instantánea de bloque no está soportada.`,
    );
  }
  return {
    id: registro.id,
    contextoId: registro.contextoId,
    actividadId: registro.actividadId,
    titulo: registro.titulo,
    fecha: FechaLocal.crear(registro.fecha),
    minutosPlanificados: registro.minutosPlanificados,
    politica: rehidratarPoliticaDesdeV1(registro.politica).obtenerVista(),
    creadoEn: convertirInstante(registro.creadoEn, "bloques[].creadoEn"),
  };
}

function convertirInstante(valor: string, campo: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new Error(
      `El campo ${campo} debe ser un instante ISO UTC normalizado.`,
    );
  }
  return instante;
}
