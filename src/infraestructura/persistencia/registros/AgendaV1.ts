export type EstadoAgendaV1 = "BORRADOR" | "CONFIRMADA" | "FINALIZADA";

export type EstadoBloqueTrabajoV1 =
  "PENDIENTE" | "COMPLETADO" | "INCUMPLIDO" | "EXCUSADO";

export type RigidezCompromisoV1 = "ESTRICTO" | "FLEXIBLE";

export type AutoridadPlazoV1 = "PERSONAL" | "EXTERNA";

export type TipoAjusteCompromisoV1 =
  "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA";

export interface PoliticaCompromisoV1 {
  readonly versionEsquema: 1;
  readonly rigidez: RigidezCompromisoV1;
  readonly autoridadPlazo: AutoridadPlazoV1;
  readonly ajustesPermitidos: readonly TipoAjusteCompromisoV1[];
}

export interface BloqueTrabajoV1 {
  readonly id: string;
  readonly actividadId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaCompromisoV1;
  readonly estado: EstadoBloqueTrabajoV1;
  readonly resueltoEn?: string;
}

export interface AjusteCompromisoV1 {
  readonly id: string;
  readonly bloqueId: string;
  readonly canjeRecompensaId: string;
  readonly tipo: TipoAjusteCompromisoV1;
  readonly aplicadoEn: string;
}

export interface AgendaV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly nombre: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly creadaEn: string;
  readonly politicaPredeterminada?: PoliticaCompromisoV1;
  readonly estado: EstadoAgendaV1;
  readonly confirmadaEn?: string;
  readonly finalizadaEn?: string;
  readonly bloques: readonly BloqueTrabajoV1[];
  readonly ajustes: readonly AjusteCompromisoV1[];
}
