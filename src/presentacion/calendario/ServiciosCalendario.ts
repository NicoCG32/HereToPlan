import type {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoCorregirCortePlanificacion,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarActividad,
  CasoDeUsoEditarContextoPlanificacion,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoEliminarActividad,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoListarContextosPlanificacion,
  CasoDeUsoCompletarBloqueConPuntos,
  CasoDeUsoMarcarBloqueIncumplido,
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
  CasoDeUsoConsultarCronometroBloque,
  CasoDeUsoGestionarSesionCronometro,
  CasoDeUsoConsultarInventarioRecompensas,
  CasoDeUsoPrepararAplicacionDiaLibre,
  CasoDeUsoAplicarDiaLibre,
} from "../../aplicacion";

export interface ServiciosCalendario {
  readonly crearContexto: Pick<CasoDeUsoCrearContextoNombrado, "ejecutar">;
  readonly editarContexto?: Pick<
    CasoDeUsoEditarContextoPlanificacion,
    "ejecutar"
  >;
  readonly listarContextos: Pick<
    CasoDeUsoListarContextosPlanificacion,
    "ejecutar"
  >;
  readonly consultarCalendario: Pick<CasoDeUsoConsultarCalendario, "ejecutar">;
  readonly revisarCorte: Pick<CasoDeUsoRevisarCortePlanificacion, "ejecutar">;
  readonly asignarCorte: Pick<CasoDeUsoAsignarCortePlanificacion, "ejecutar">;
  readonly corregirCorte: Pick<CasoDeUsoCorregirCortePlanificacion, "ejecutar">;
  readonly sincronizarCortes: Pick<
    CasoDeUsoSincronizarCortesPlanificacion,
    "ejecutar"
  >;
  readonly crearActividad: Pick<CasoDeUsoCrearActividad, "ejecutar">;
  readonly editarActividad?: Pick<CasoDeUsoEditarActividad, "ejecutar">;
  readonly eliminarActividad?: Pick<CasoDeUsoEliminarActividad, "ejecutar">;
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
  readonly completarBloque: Pick<CasoDeUsoCompletarBloqueConPuntos, "ejecutar">;
  readonly marcarBloqueIncumplido: Pick<
    CasoDeUsoMarcarBloqueIncumplido,
    "ejecutar"
  >;
  readonly consultarCronometro: Pick<
    CasoDeUsoConsultarCronometroBloque,
    "ejecutar"
  >;
  readonly gestionarCronometro: Pick<
    CasoDeUsoGestionarSesionCronometro,
    "ejecutar"
  >;
  readonly consultarInventarioRecompensas?: Pick<
    CasoDeUsoConsultarInventarioRecompensas,
    "ejecutar"
  >;
  readonly prepararAplicacionDiaLibre?: Pick<
    CasoDeUsoPrepararAplicacionDiaLibre,
    "ejecutar"
  >;
  readonly aplicarDiaLibre?: Pick<CasoDeUsoAplicarDiaLibre, "ejecutar">;
  readonly generarOperacionId: () => string;
}
