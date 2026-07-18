import type { PoliticaCompromisoV1 } from "./AgendaV1";

interface ActividadBaseV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly creadaEn: string;
  readonly tiempoNecesarioMinutos: number;
  readonly politicaPredeterminada?: PoliticaCompromisoV1;
}

export interface TareaV1 extends ActividadBaseV1 {
  readonly tipo: "TAREA_SIMPLE" | "TAREA_COMPUESTA" | "PROYECTO";
  readonly fechaLimite?: string;
  readonly subtareasIds: readonly string[];
  readonly estado: "PENDIENTE" | "COMPLETADA" | "NO_COMPLETADA";
  readonly resueltaEn?: string;
}

export interface HabitoV1 extends ActividadBaseV1 {
  readonly tipo: "HABITO";
  readonly frecuencia: "DIARIA" | "SEMANAL" | "PERSONALIZADA";
  readonly diasSemana: readonly number[];
}

export type ActividadV1 = TareaV1 | HabitoV1;
