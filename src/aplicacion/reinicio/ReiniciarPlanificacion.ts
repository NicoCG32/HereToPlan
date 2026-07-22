import type {
  ImpactoReinicioPlanificacion,
  LectorImpactoReinicioPlanificacion,
  ResultadoTransaccionReinicioPlanificacion,
  UnidadTrabajoReinicioPlanificacion,
} from "../puertos/ReinicioPlanificacion";

export const CONFIRMACION_REINICIO_PLANIFICACION = "REINICIAR";

export class ErrorConfirmacionReinicioPlanificacion extends Error {
  public readonly codigo = "CONFIRMACION_REINICIO_INVALIDA";

  constructor() {
    super(
      `Escribe ${CONFIRMACION_REINICIO_PLANIFICACION} para confirmar el reinicio de planificación.`,
    );
    this.name = "ErrorConfirmacionReinicioPlanificacion";
  }
}

export class CasoDeUsoConsultarImpactoReinicioPlanificacion {
  constructor(private readonly lector: LectorImpactoReinicioPlanificacion) {}

  public ejecutar(): Promise<ImpactoReinicioPlanificacion> {
    return this.lector.consultarImpacto();
  }
}

export interface ComandoReiniciarPlanificacion {
  readonly impacto: ImpactoReinicioPlanificacion;
  readonly operacionId: string;
  readonly confirmacion: string;
}

export class CasoDeUsoReiniciarPlanificacion {
  constructor(
    private readonly unidadTrabajo: UnidadTrabajoReinicioPlanificacion,
  ) {}

  public ejecutar(
    comando: ComandoReiniciarPlanificacion,
  ): Promise<ResultadoTransaccionReinicioPlanificacion> {
    if (comando.confirmacion !== CONFIRMACION_REINICIO_PLANIFICACION) {
      throw new ErrorConfirmacionReinicioPlanificacion();
    }
    return this.unidadTrabajo.reiniciar({
      operacionId: comando.operacionId,
      huellaEsperada: comando.impacto.huella,
    });
  }
}
