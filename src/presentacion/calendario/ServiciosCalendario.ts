import type {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoListarContextosPlanificacion,
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
} from "../../aplicacion";

export interface ServiciosCalendario {
  readonly crearContexto: Pick<CasoDeUsoCrearContextoNombrado, "ejecutar">;
  readonly listarContextos: Pick<
    CasoDeUsoListarContextosPlanificacion,
    "ejecutar"
  >;
  readonly consultarCalendario: Pick<CasoDeUsoConsultarCalendario, "ejecutar">;
  readonly revisarCorte: Pick<CasoDeUsoRevisarCortePlanificacion, "ejecutar">;
  readonly asignarCorte: Pick<CasoDeUsoAsignarCortePlanificacion, "ejecutar">;
  readonly sincronizarCortes: Pick<
    CasoDeUsoSincronizarCortesPlanificacion,
    "ejecutar"
  >;
  readonly crearActividad: Pick<CasoDeUsoCrearActividad, "ejecutar">;
  readonly asignarActividad: Pick<CasoDeUsoAsignarActividad, "ejecutar">;
  readonly editarBloque: Pick<CasoDeUsoEditarBloquePlanificacion, "ejecutar">;
  readonly eliminarBloque: Pick<
    CasoDeUsoEliminarBloquePlanificacion,
    "ejecutar"
  >;
  readonly consultarImpactoEliminacion: Pick<
    CasoDeUsoConsultarImpactoEliminacionContexto,
    "ejecutar"
  >;
  readonly eliminarContexto: Pick<
    CasoDeUsoEliminarContextoPlanificacion,
    "ejecutar"
  >;
}
