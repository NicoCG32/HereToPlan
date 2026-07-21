import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import { ErrorDominio } from "../compartido/ErrorDominio";

export type TipoMovimientoRecuperacion = "ACREDITACION" | "CONSUMO";

export interface DatosMovimientoRecuperacion {
  readonly id: Identificador;
  readonly operacionId: Identificador;
  readonly tipo: TipoMovimientoRecuperacion;
  readonly minutos: number;
  readonly bloqueFuenteId: Identificador;
  readonly fechaFuente: FechaLocal;
  readonly descripcion: string;
  readonly ocurridoEn: Date;
}

export class MovimientoRecuperacion {
  public readonly id: Identificador;
  public readonly operacionId: Identificador;
  public readonly tipo: TipoMovimientoRecuperacion;
  public readonly minutos: number;
  public readonly bloqueFuenteId: Identificador;
  public readonly fechaFuente: FechaLocal;
  public readonly descripcion: string;
  private readonly _ocurridoEn: Date;

  constructor(datos: DatosMovimientoRecuperacion) {
    this.id = exigirIdentificador(datos.id, "identificador de movimiento");
    this.operacionId = exigirIdentificador(
      datos.operacionId,
      "identificador de operación de recuperación",
    );
    if (datos.tipo !== "ACREDITACION" && datos.tipo !== "CONSUMO") {
      throw new ErrorDominio(
        "TIPO_MOVIMIENTO_RECUPERACION_INVALIDO",
        "El movimiento de recuperación debe ser una acreditación o un consumo.",
      );
    }
    this.tipo = datos.tipo;
    this.minutos = exigirEnteroPositivo(
      datos.minutos,
      "MINUTOS_RECUPERACION_INVALIDOS",
      "Los minutos de recuperación deben ser un entero positivo.",
    );
    this.bloqueFuenteId = exigirIdentificador(
      datos.bloqueFuenteId,
      "identificador del bloque fuente",
    );
    if (!datos.fechaFuente) {
      throw new ErrorDominio(
        "FECHA_FUENTE_RECUPERACION_REQUERIDA",
        "El movimiento debe conservar la fecha local de su fuente.",
      );
    }
    this.fechaFuente = datos.fechaFuente;
    this.descripcion = exigirTexto(
      datos.descripcion,
      "DESCRIPCION_RECUPERACION_VACIA",
      "El movimiento de recuperación debe explicar su origen.",
    );
    this._ocurridoEn = copiarFecha(datos.ocurridoEn, "fecha del movimiento");
  }

  public get ocurridoEn(): Date {
    return new Date(this._ocurridoEn);
  }

  public obtenerVariacion(): number {
    return this.tipo === "ACREDITACION" ? this.minutos : -this.minutos;
  }
}
