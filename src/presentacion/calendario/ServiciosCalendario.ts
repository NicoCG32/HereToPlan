import type {
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoListarContextosPlanificacion,
} from "../../aplicacion";

export interface ServiciosCalendario {
  readonly crearContexto: Pick<CasoDeUsoCrearContextoNombrado, "ejecutar">;
  readonly listarContextos: Pick<
    CasoDeUsoListarContextosPlanificacion,
    "ejecutar"
  >;
  readonly consultarCalendario: Pick<CasoDeUsoConsultarCalendario, "ejecutar">;
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
