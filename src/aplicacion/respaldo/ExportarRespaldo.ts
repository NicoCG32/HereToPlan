import type { LectorEstadoPersistente } from "../puertos/LectorEstadoPersistente";
import type { Reloj } from "../puertos/Reloj";
import {
  IDENTIFICADOR_FORMATO_RESPALDO,
  VERSION_FORMATO_RESPALDO,
  type ArchivoRespaldo,
  type RespaldoHereToPlanV2,
} from "./ContratoRespaldo";

export type CodigoErrorExportacionRespaldo =
  "LECTURA_ESTADO_FALLIDA" | "SERIALIZACION_FALLIDA";

export class ErrorExportacionRespaldo extends Error {
  constructor(
    public readonly codigo: CodigoErrorExportacionRespaldo,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorExportacionRespaldo";
  }
}

export class CasoDeUsoExportarRespaldo {
  constructor(
    private readonly lectorEstado: LectorEstadoPersistente,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(): Promise<ArchivoRespaldo> {
    let estado;
    try {
      estado = await this.lectorEstado.leerEstadoCompleto();
    } catch (causa: unknown) {
      throw new ErrorExportacionRespaldo(
        "LECTURA_ESTADO_FALLIDA",
        "No fue posible leer el estado local. No se generó ningún respaldo.",
        causa,
      );
    }

    const creadoEn = this.reloj.ahora().toISOString();
    const respaldo: RespaldoHereToPlanV2 = Object.freeze({
      formato: IDENTIFICADOR_FORMATO_RESPALDO,
      versionFormato: VERSION_FORMATO_RESPALDO,
      creadoEn,
      origen: Object.freeze({
        aplicacion: "HereToPlan",
        versionBaseDatos: estado.versionBaseDatos,
      }),
      contenido: estado.colecciones,
    });

    try {
      return Object.freeze({
        nombre: crearNombreArchivo(creadoEn),
        tipoMime: "application/json" as const,
        contenido: JSON.stringify(respaldo, null, 2),
        respaldo,
      });
    } catch (causa: unknown) {
      throw new ErrorExportacionRespaldo(
        "SERIALIZACION_FALLIDA",
        "El estado local fue leído, pero no pudo serializarse. Los datos originales permanecen intactos.",
        causa,
      );
    }
  }
}

function crearNombreArchivo(instante: string): string {
  return `heretoplan-respaldo-${instante.replaceAll(":", "-")}.json`;
}
