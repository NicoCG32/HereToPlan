import type {
  ArchivoRespaldo,
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
  CasoDeUsoPrepararRestauracionRespaldo,
  CasoDeUsoRestaurarRespaldo,
  CasoDeUsoConsultarImpactoReinicioPlanificacion,
  CasoDeUsoReiniciarPlanificacion,
} from "../../aplicacion";

export interface ServiciosRespaldo {
  readonly exportar: CasoDeUsoExportarRespaldo;
  readonly analizarImportacion: CasoDeUsoAnalizarImportacionRespaldo;
  readonly prepararRestauracion: CasoDeUsoPrepararRestauracionRespaldo;
  readonly restaurar: CasoDeUsoRestaurarRespaldo;
  readonly consultarImpactoReinicio?: CasoDeUsoConsultarImpactoReinicioPlanificacion;
  readonly reiniciarPlanificacion?: CasoDeUsoReiniciarPlanificacion;
  readonly generarOperacionIdReinicio?: () => string;
  readonly descargar: (archivo: ArchivoRespaldo) => void;
  readonly leerArchivo: (archivo: File) => Promise<string>;
  readonly recargarAplicacion: () => void;
}
