export interface ConteosEliminacionReinicioPlanificacion {
  readonly agendasActivas: number;
  readonly bloquesAgendaPendientes: number;
  readonly bloquesPlanificacionActivos: number;
  readonly cortesActivos: number;
  readonly sesionesAbiertas: number;
}

export interface ConteosConservacionReinicioPlanificacion {
  readonly actividades: number;
  readonly contextos: number;
  readonly bloquesHistoricos: number;
  readonly cortesHistoricos: number;
  readonly sesionesFinalizadas: number;
  readonly resoluciones: number;
  readonly movimientosPuntos: number;
  readonly recompensasAdquiridas: number;
  readonly aplicacionesRecompensas: number;
  readonly movimientosRecuperacion: number;
  readonly perfil: number;
}

export interface ImpactoReinicioPlanificacion {
  readonly huella: string;
  readonly eliminar: ConteosEliminacionReinicioPlanificacion;
  readonly conservar: ConteosConservacionReinicioPlanificacion;
  readonly totalEliminaciones: number;
  readonly totalConservados: number;
  readonly incidencias: readonly string[];
}

export interface LectorImpactoReinicioPlanificacion {
  consultarImpacto(): Promise<ImpactoReinicioPlanificacion>;
}

export interface ComandoTransaccionReinicioPlanificacion {
  readonly operacionId: string;
  readonly huellaEsperada: string;
}

export interface ResultadoTransaccionReinicioPlanificacion {
  readonly operacionId: string;
  readonly eliminados: number;
  readonly yaReiniciada: boolean;
}

export interface UnidadTrabajoReinicioPlanificacion {
  reiniciar(
    comando: ComandoTransaccionReinicioPlanificacion,
  ): Promise<ResultadoTransaccionReinicioPlanificacion>;
}

export class ErrorImpactoReinicioDesactualizado extends Error {
  public readonly codigo = "IMPACTO_REINICIO_DESACTUALIZADO";

  constructor() {
    super(
      "La planificación cambió desde la consulta de impacto. Vuelve a revisar los datos antes de reiniciar.",
    );
    this.name = "ErrorImpactoReinicioDesactualizado";
  }
}
