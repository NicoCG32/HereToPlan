import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import { copiarFecha, exigirIdentificador } from "../compartido/validaciones";

export type ResultadoResolucionBloquePlanificacion =
  "COMPLETADO" | "INCUMPLIDO";

export interface DatosResolucionBloquePlanificacion {
  readonly bloqueId: Identificador;
  readonly operacionId: Identificador;
  readonly resultado: ResultadoResolucionBloquePlanificacion;
  readonly resueltoEn: Date;
}

export class ResolucionBloquePlanificacion {
  public readonly bloqueId: Identificador;
  public readonly operacionId: Identificador;
  public readonly resultado: ResultadoResolucionBloquePlanificacion;
  private readonly _resueltoEn: Date;

  constructor(datos: DatosResolucionBloquePlanificacion) {
    this.bloqueId = exigirIdentificador(
      datos.bloqueId,
      "identificador del bloque resuelto",
    );
    this.operacionId = exigirIdentificador(
      datos.operacionId,
      "identificador de la operación de resolución",
    );
    if (datos.resultado !== "COMPLETADO" && datos.resultado !== "INCUMPLIDO") {
      throw new ErrorDominio(
        "RESULTADO_RESOLUCION_INVALIDO",
        "El resultado del bloque debe ser COMPLETADO o INCUMPLIDO.",
      );
    }
    this.resultado = datos.resultado;
    this._resueltoEn = copiarFecha(datos.resueltoEn, "instante de resolución");
  }

  public get resueltoEn(): Date {
    return new Date(this._resueltoEn);
  }
}
