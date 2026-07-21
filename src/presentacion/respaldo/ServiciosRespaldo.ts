import type {
  ArchivoRespaldo,
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
  CasoDeUsoPrepararRestauracionRespaldo,
  CasoDeUsoRestaurarRespaldo,
} from "../../aplicacion";

export interface ServiciosRespaldo {
  readonly exportar: CasoDeUsoExportarRespaldo;
  readonly analizarImportacion: CasoDeUsoAnalizarImportacionRespaldo;
  readonly prepararRestauracion: CasoDeUsoPrepararRestauracionRespaldo;
  readonly restaurar: CasoDeUsoRestaurarRespaldo;
  readonly descargar: (archivo: ArchivoRespaldo) => void;
  readonly leerArchivo: (archivo: File) => Promise<string>;
  readonly recargarAplicacion: () => void;
}
