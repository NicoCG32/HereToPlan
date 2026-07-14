import {
  Agenda,
  AjusteCompromiso,
  FechaLocal,
  PoliticaCompromiso,
  type VistaBloqueTrabajo,
} from "../../../dominio";
import type {
  AgendaV1,
  AjusteCompromisoV1,
  BloqueTrabajoV1,
} from "../registros/AgendaV1";

export type CodigoErrorMapeoAgendaV1 =
  "VERSION_AGENDA_NO_SOPORTADA" | "REGISTRO_AGENDA_INVALIDO";

export class ErrorMapeoAgendaV1 extends Error {
  constructor(
    public readonly codigo: CodigoErrorMapeoAgendaV1,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoAgendaV1";
  }
}

export function convertirAgendaEnV1(agenda: Agenda): AgendaV1 {
  const bloques = Object.freeze(
    agenda.listarBloques().map(convertirBloqueEnV1),
  );
  const ajustes = Object.freeze(
    agenda.listarAjustes().map(convertirAjusteEnV1),
  );
  const base = {
    versionEsquema: 1,
    id: agenda.id,
    nombre: agenda.nombre,
    fechaInicio: agenda.fechaInicio.toString(),
    fechaFin: agenda.fechaFin.toString(),
    creadaEn: agenda.creadaEn.toISOString(),
    estado: agenda.estado,
    bloques,
    ajustes,
  } satisfies AgendaV1;
  const confirmadaEn = agenda.confirmadaEn;
  const finalizadaEn = agenda.finalizadaEn;

  return Object.freeze({
    ...base,
    ...(confirmadaEn ? { confirmadaEn: confirmadaEn.toISOString() } : {}),
    ...(finalizadaEn ? { finalizadaEn: finalizadaEn.toISOString() } : {}),
  });
}

export function rehidratarAgendaDesdeV1(registro: AgendaV1): Agenda {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoAgendaV1(
      "VERSION_AGENDA_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} de Agenda no está soportada.`,
    );
  }

  try {
    return Agenda.rehidratar({
      id: registro.id,
      nombre: registro.nombre,
      fechaInicio: FechaLocal.crear(registro.fechaInicio),
      fechaFin: FechaLocal.crear(registro.fechaFin),
      creadaEn: convertirInstante(registro.creadaEn, "creadaEn"),
      estado: registro.estado,
      bloques: registro.bloques.map((bloque) => ({
        id: bloque.id,
        actividadId: bloque.actividadId,
        titulo: bloque.titulo,
        fecha: FechaLocal.crear(bloque.fecha),
        minutosPlanificados: bloque.minutosPlanificados,
        politica: new PoliticaCompromiso({
          rigidez: bloque.politica.rigidez,
          autoridadPlazo: bloque.politica.autoridadPlazo,
          ajustesPermitidos: bloque.politica.ajustesPermitidos,
        }),
        estado: bloque.estado,
        ...(bloque.resueltoEn
          ? {
              resueltoEn: convertirInstante(
                bloque.resueltoEn,
                "bloque.resueltoEn",
              ),
            }
          : {}),
      })),
      ajustes: registro.ajustes.map(
        (ajuste) =>
          new AjusteCompromiso({
            id: ajuste.id,
            bloqueId: ajuste.bloqueId,
            canjeRecompensaId: ajuste.canjeRecompensaId,
            tipo: ajuste.tipo,
            aplicadoEn: convertirInstante(
              ajuste.aplicadoEn,
              "ajuste.aplicadoEn",
            ),
          }),
      ),
      ...(registro.confirmadaEn
        ? {
            confirmadaEn: convertirInstante(
              registro.confirmadaEn,
              "confirmadaEn",
            ),
          }
        : {}),
      ...(registro.finalizadaEn
        ? {
            finalizadaEn: convertirInstante(
              registro.finalizadaEn,
              "finalizadaEn",
            ),
          }
        : {}),
    });
  } catch (error: unknown) {
    if (error instanceof ErrorMapeoAgendaV1) {
      throw error;
    }

    const detalle = error instanceof Error ? ` ${error.message}` : "";
    throw new ErrorMapeoAgendaV1(
      "REGISTRO_AGENDA_INVALIDO",
      `El registro AgendaV1 no satisface las invariantes del dominio.${detalle}`,
      error,
    );
  }
}

function convertirBloqueEnV1(bloque: VistaBloqueTrabajo): BloqueTrabajoV1 {
  const politica = Object.freeze({
    rigidez: bloque.politica.rigidez,
    autoridadPlazo: bloque.politica.autoridadPlazo,
    ajustesPermitidos: Object.freeze([...bloque.politica.ajustesPermitidos]),
  });

  return Object.freeze({
    id: bloque.id,
    actividadId: bloque.actividadId,
    titulo: bloque.titulo,
    fecha: bloque.fecha.toString(),
    minutosPlanificados: bloque.minutosPlanificados,
    politica,
    estado: bloque.estado,
    ...(bloque.resueltoEn
      ? { resueltoEn: bloque.resueltoEn.toISOString() }
      : {}),
  });
}

function convertirAjusteEnV1(ajuste: AjusteCompromiso): AjusteCompromisoV1 {
  return Object.freeze({
    id: ajuste.id,
    bloqueId: ajuste.bloqueId,
    canjeRecompensaId: ajuste.canjeRecompensaId,
    tipo: ajuste.tipo,
    aplicadoEn: ajuste.aplicadoEn.toISOString(),
  });
}

function convertirInstante(valor: string, campo: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoAgendaV1(
      "REGISTRO_AGENDA_INVALIDO",
      `El campo ${campo} debe contener un instante ISO UTC normalizado.`,
    );
  }
  return instante;
}
