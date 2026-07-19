import type { PoliticaCompromisoV1 } from "./AgendaV1";

export type EstadoCortePlanificacionV1 =
  "BORRADOR" | "EN_REVISION" | "EN_GRACIA" | "CONFIRMADA";

export interface BloqueCortePlanificacionV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly contextoId: string;
  readonly actividadId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaCompromisoV1;
  readonly creadoEn: string;
}

export interface CortePlanificacionV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly estado: EstadoCortePlanificacionV1;
  readonly creadoEn: string;
  readonly asignadaEn?: string;
  readonly confirmarAutomaticamenteEn?: string;
  readonly confirmadaEn?: string;
  readonly bloques: readonly BloqueCortePlanificacionV1[];
}
