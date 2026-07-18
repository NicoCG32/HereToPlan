import { FechaLocal, Habito, Tarea, type Actividad } from "../../../dominio";
import type { ActividadV1, HabitoV1, TareaV1 } from "../registros/ActividadV1";
import {
  convertirPoliticaEnV1,
  rehidratarPoliticaDesdeV1,
} from "./MapeadorPoliticaCompromisoV1";

export type CodigoErrorMapeoActividadV1 =
  "VERSION_ACTIVIDAD_NO_SOPORTADA" | "REGISTRO_ACTIVIDAD_INVALIDO";

export class ErrorMapeoActividadV1 extends Error {
  constructor(
    public readonly codigo: CodigoErrorMapeoActividadV1,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoActividadV1";
  }
}

export function convertirActividadEnV1(actividad: Actividad): ActividadV1 {
  const politicaPredeterminada = actividad.obtenerPoliticaPredeterminada();
  const base = {
    versionEsquema: 1 as const,
    id: actividad.id,
    titulo: actividad.titulo,
    ...(actividad.descripcion ? { descripcion: actividad.descripcion } : {}),
    creadaEn: actividad.creadaEn.toISOString(),
    ...(politicaPredeterminada
      ? {
          politicaPredeterminada: convertirPoliticaEnV1(politicaPredeterminada),
        }
      : {}),
  };

  if (actividad instanceof Tarea) {
    const resueltaEn = actividad.resueltaEn;
    return Object.freeze({
      ...base,
      tipo: actividad.tipo,
      tiempoNecesarioMinutos: actividad.tiempoNecesarioMinutos,
      ...(actividad.fechaLimite
        ? { fechaLimite: actividad.fechaLimite.toString() }
        : {}),
      subtareasIds: Object.freeze([...actividad.listarSubtareasIds()]),
      estado: actividad.estado,
      ...(resueltaEn ? { resueltaEn: resueltaEn.toISOString() } : {}),
    });
  }
  if (actividad instanceof Habito) {
    return Object.freeze({
      ...base,
      tipo: actividad.tipo,
      tiempoNecesarioMinutos: actividad.tiempoNecesarioMinutos,
      frecuencia: actividad.frecuencia,
      diasSemana: Object.freeze([...actividad.listarDiasSemana()]),
    });
  }
  throw new ErrorMapeoActividadV1(
    "REGISTRO_ACTIVIDAD_INVALIDO",
    "El tipo concreto de actividad no puede persistirse como ActividadV1.",
  );
}

export function rehidratarActividadDesdeV1(registro: ActividadV1): Actividad {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoActividadV1(
      "VERSION_ACTIVIDAD_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} de Actividad no está soportada.`,
    );
  }

  try {
    return registro.tipo === "HABITO"
      ? rehidratarHabito(registro)
      : rehidratarTarea(registro);
  } catch (error: unknown) {
    if (error instanceof ErrorMapeoActividadV1) throw error;
    throw new ErrorMapeoActividadV1(
      "REGISTRO_ACTIVIDAD_INVALIDO",
      `El registro ActividadV1 no satisface las invariantes del dominio.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function rehidratarTarea(registro: TareaV1): Tarea {
  return Tarea.rehidratar({
    id: registro.id,
    titulo: registro.titulo,
    tipo: registro.tipo,
    ...(registro.descripcion !== undefined
      ? { descripcion: registro.descripcion }
      : {}),
    tiempoNecesarioMinutos: registro.tiempoNecesarioMinutos,
    ...(registro.fechaLimite
      ? { fechaLimite: FechaLocal.crear(registro.fechaLimite) }
      : {}),
    subtareasIds: registro.subtareasIds,
    creadaEn: convertirInstante(registro.creadaEn, "creadaEn"),
    ...(registro.politicaPredeterminada
      ? {
          politicaPredeterminada: rehidratarPoliticaDesdeV1(
            registro.politicaPredeterminada,
          ),
        }
      : {}),
    estado: registro.estado,
    ...(registro.resueltaEn
      ? { resueltaEn: convertirInstante(registro.resueltaEn, "resueltaEn") }
      : {}),
  });
}

function rehidratarHabito(registro: HabitoV1): Habito {
  return new Habito({
    id: registro.id,
    titulo: registro.titulo,
    ...(registro.descripcion !== undefined
      ? { descripcion: registro.descripcion }
      : {}),
    tiempoNecesarioMinutos: registro.tiempoNecesarioMinutos,
    frecuencia: registro.frecuencia,
    diasSemana: registro.diasSemana,
    creadaEn: convertirInstante(registro.creadaEn, "creadaEn"),
    ...(registro.politicaPredeterminada
      ? {
          politicaPredeterminada: rehidratarPoliticaDesdeV1(
            registro.politicaPredeterminada,
          ),
        }
      : {}),
  });
}

function convertirInstante(valor: string, campo: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoActividadV1(
      "REGISTRO_ACTIVIDAD_INVALIDO",
      `El campo ${campo} debe contener un instante ISO UTC normalizado.`,
    );
  }
  return instante;
}
