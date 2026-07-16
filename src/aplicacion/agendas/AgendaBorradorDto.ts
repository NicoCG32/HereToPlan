import type { Agenda } from "../../dominio/agendas/Agenda";
import type {
  AutoridadPlazo,
  RigidezCompromiso,
  TipoAjusteCompromiso,
} from "../../dominio/compromisos/tipos";

export interface PoliticaBloqueAgendaBorradorDto {
  readonly rigidez: RigidezCompromiso;
  readonly autoridadPlazo: AutoridadPlazo;
  readonly ajustesPermitidos: readonly TipoAjusteCompromiso[];
}

export interface BloqueAgendaBorradorDto {
  readonly id: string;
  readonly actividadId: string;
  readonly actividad: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaBloqueAgendaBorradorDto;
}

export interface AgendaBorradorDto {
  readonly id: string;
  readonly nombre: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: "BORRADOR";
  readonly creadaEn: string;
  readonly bloques: readonly BloqueAgendaBorradorDto[];
  readonly minutosPlanificados: number;
}

export function convertirAgendaBorradorEnDto(
  agenda: Agenda,
): AgendaBorradorDto {
  const bloques = Object.freeze(
    agenda.listarBloques().map((bloque) =>
      Object.freeze({
        id: bloque.id,
        actividadId: bloque.actividadId,
        actividad: bloque.titulo,
        fecha: bloque.fecha.toString(),
        minutosPlanificados: bloque.minutosPlanificados,
        politica: Object.freeze({
          rigidez: bloque.politica.rigidez,
          autoridadPlazo: bloque.politica.autoridadPlazo,
          ajustesPermitidos: Object.freeze([
            ...bloque.politica.ajustesPermitidos,
          ]),
        }),
      }),
    ),
  );

  return Object.freeze({
    id: agenda.id,
    nombre: agenda.nombre,
    fechaInicio: agenda.fechaInicio.toString(),
    fechaFin: agenda.fechaFin.toString(),
    estado: "BORRADOR",
    creadaEn: agenda.creadaEn.toISOString(),
    bloques,
    minutosPlanificados: bloques.reduce(
      (total, bloque) => total + bloque.minutosPlanificados,
      0,
    ),
  });
}
