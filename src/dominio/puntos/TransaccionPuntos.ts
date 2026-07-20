import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import type { TipoFuentePuntos, TipoTransaccionPuntos } from "./tipos";
import { ErrorDominio } from "../compartido/ErrorDominio";

interface DatosTransaccionPuntos {
  id: Identificador;
  tipo: TipoTransaccionPuntos;
  cantidad: number;
  fuenteTipo: TipoFuentePuntos;
  fuenteId: Identificador;
  descripcion: string;
  ocurridaEn: Date;
}

export class TransaccionPuntos {
  public readonly id: Identificador;
  public readonly tipo: TipoTransaccionPuntos;
  public readonly cantidad: number;
  public readonly fuenteTipo: TipoFuentePuntos;
  public readonly fuenteId: Identificador;
  public readonly descripcion: string;
  private readonly _ocurridaEn: Date;

  constructor(datos: DatosTransaccionPuntos) {
    this.id = exigirIdentificador(datos.id, "identificador de transacción");
    if (datos.tipo !== "INGRESO" && datos.tipo !== "GASTO") {
      throw new ErrorDominio(
        "TIPO_TRANSACCION_PUNTOS_INVALIDO",
        "El tipo de transacción debe ser INGRESO o GASTO.",
      );
    }
    this.tipo = datos.tipo;
    this.cantidad = exigirEnteroPositivo(
      datos.cantidad,
      "CANTIDAD_PUNTOS_INVALIDA",
      "La cantidad de puntos debe ser un entero positivo.",
    );
    if (
      datos.fuenteTipo !== "COMPROMISO_COMPLETADO" &&
      datos.fuenteTipo !== "CANJE_RECOMPENSA"
    ) {
      throw new ErrorDominio(
        "TIPO_FUENTE_PUNTOS_INVALIDO",
        "El tipo de fuente de puntos no es reconocido.",
      );
    }
    this.fuenteTipo = datos.fuenteTipo;
    this.fuenteId = exigirIdentificador(
      datos.fuenteId,
      "identificador de fuente",
    );
    this.descripcion = exigirTexto(
      datos.descripcion,
      "DESCRIPCION_TRANSACCION_VACIA",
      "La transacción debe tener una descripción.",
    );
    this._ocurridaEn = copiarFecha(datos.ocurridaEn, "fecha de transacción");
  }

  public get ocurridaEn(): Date {
    return new Date(this._ocurridaEn);
  }

  public obtenerVariacion(): number {
    return this.tipo === "INGRESO" ? this.cantidad : -this.cantidad;
  }
}
