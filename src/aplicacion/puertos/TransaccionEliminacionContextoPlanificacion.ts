import type { Identificador } from "../../dominio";

export type EstrategiaEliminacionContexto =
  "TRASLADAR_A_LIBRE" | "ELIMINAR_BORRADORES";

export interface ImpactoPersistenteEliminacionContexto {
  readonly actividadIds: readonly Identificador[];
  readonly bloqueIdsEditables: readonly Identificador[];
  readonly cantidadRegistrosConfirmados: number;
  readonly huella: string;
}

export interface ComandoTransaccionEliminacionContexto {
  readonly contextoId: Identificador;
  readonly estrategia: EstrategiaEliminacionContexto;
  readonly huellaEsperada: string;
}

export interface ResultadoTransaccionEliminacionContexto {
  readonly cantidadBloquesTrasladados: number;
  readonly cantidadBloquesEliminados: number;
  readonly cantidadRegistrosConfirmadosConservados: number;
}

export class ErrorImpactoEliminacionDesactualizado extends Error {
  public readonly codigo = "IMPACTO_ELIMINACION_DESACTUALIZADO";

  constructor() {
    super(
      "La planificación de la agenda cambió. Revisa nuevamente el impacto antes de eliminarla.",
    );
    this.name = "ErrorImpactoEliminacionDesactualizado";
  }
}

export interface TransaccionEliminacionContextoPlanificacion {
  consultarImpacto(
    contextoId: Identificador,
  ): Promise<ImpactoPersistenteEliminacionContexto>;
  ejecutar(
    comando: ComandoTransaccionEliminacionContexto,
  ): Promise<ResultadoTransaccionEliminacionContexto>;
}
