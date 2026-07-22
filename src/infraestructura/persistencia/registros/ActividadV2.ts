import type { ModoSeguimiento } from "../../../dominio";
import type { PoliticaCompromisoV1 } from "./AgendaV1";

interface ActividadBaseV2 {
  readonly versionEsquema: 2;
  readonly id: string;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly creadaEn: string;
  readonly tiempoNecesarioMinutos: number;
  readonly modoSeguimiento: ModoSeguimiento;
  readonly politicaPredeterminada?: PoliticaCompromisoV1;
}

export interface TareaV2 extends ActividadBaseV2 {
  readonly tipo: "TAREA_SIMPLE" | "TAREA_COMPUESTA" | "PROYECTO";
  readonly fechaLimite?: string;
  readonly subtareasIds: readonly string[];
  readonly estado: "PENDIENTE" | "COMPLETADA" | "NO_COMPLETADA";
  readonly resueltaEn?: string;
}

export interface HabitoV2 extends ActividadBaseV2 {
  readonly tipo: "HABITO";
  readonly frecuencia: "DIARIA" | "SEMANAL" | "PERSONALIZADA";
  readonly diasSemana: readonly number[];
}

export type ActividadV2 = TareaV2 | HabitoV2;
