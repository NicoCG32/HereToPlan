import type { ActividadDto } from "../actividades/ActividadDto";
import type { ContextoPlanificacionDto } from "../contextos/ContextoPlanificacionDto";

export type VistaTemporalCalendario = "DIA" | "SEMANA" | "MES";

export type SeleccionContextoCalendarioDto =
  | Readonly<{ tipo: "TODAS"; nombre: "Todas" }>
  | Readonly<{
      tipo: "CONTEXTO";
      contextoId: string;
      nombre: string;
      tipoContexto: "LIBRE" | "NOMBRADO";
    }>;

export interface RangoVisibleCalendarioDto {
  readonly fechaInicio: string;
  readonly fechaFin: string;
}

export interface OrigenBloqueCalendarioDto {
  readonly contextoId: string;
  readonly nombreContexto: string;
  readonly tipoContexto: "LIBRE" | "NOMBRADO";
}

export interface PoliticaBloqueCalendarioDto {
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
  readonly autoridadPlazo: "PERSONAL" | "EXTERNA";
  readonly ajustesPermitidos: readonly (
    "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
  )[];
}

export interface EventoHistorialBloqueCalendarioDto {
  readonly tipo: "RESOLUCION" | "AJUSTE";
  readonly resultado: "COMPLETADO" | "INCUMPLIDO" | "EXCUSADO";
  readonly ocurridoEn: string;
  readonly operacionId?: string;
  readonly canjeRecompensaId?: string;
}

export interface BloqueCalendarioDto {
  readonly id: string;
  readonly actividadId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly estado: "PENDIENTE" | "COMPLETADO" | "INCUMPLIDO" | "EXCUSADO";
  readonly origen: OrigenBloqueCalendarioDto;
  readonly politica: PoliticaBloqueCalendarioDto;
  readonly editable: boolean;
  readonly historial: readonly EventoHistorialBloqueCalendarioDto[];
  readonly proteccion?: Readonly<{
    corteId: string;
    estado: "EN_GRACIA" | "CONFIRMADA";
  }>;
}

export interface DiaProximoCalendarioDto {
  readonly fecha: string;
  readonly esHoy: boolean;
  readonly bloques: readonly BloqueCalendarioDto[];
  readonly minutosPlanificados: number;
}

export interface ResumenCalendarioDto {
  readonly cantidadBloques: number;
  readonly minutosPlanificados: number;
}

export interface CalendarioDto {
  readonly seleccion: SeleccionContextoCalendarioDto;
  readonly vistaTemporal: VistaTemporalCalendario;
  readonly rangoVisible: RangoVisibleCalendarioDto;
  readonly diaSeleccionado?: string;
  readonly hoy: string;
  readonly contextos: readonly ContextoPlanificacionDto[];
  readonly actividadesAsignables: readonly ActividadDto[];
  readonly actividadesSinProgramar: readonly ActividadDto[];
  readonly bloquesVisibles: readonly BloqueCalendarioDto[];
  readonly proximosSieteDias: readonly DiaProximoCalendarioDto[];
  readonly listaEquivalente: readonly BloqueCalendarioDto[];
  readonly resumenSeleccion: ResumenCalendarioDto;
}
