import type {
  ArchivoRespaldo,
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
} from "../../aplicacion";

export interface ServiciosRespaldo {
  readonly exportar: CasoDeUsoExportarRespaldo;
  readonly analizarImportacion: CasoDeUsoAnalizarImportacionRespaldo;
  readonly descargar: (archivo: ArchivoRespaldo) => void;
  readonly leerArchivo: (archivo: File) => Promise<string>;
}
