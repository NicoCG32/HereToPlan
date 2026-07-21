import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
} from "../compartido/validaciones";

export interface DatosReduccionCarga {
  readonly id: Identificador;
  readonly operacionId: Identificador;
  readonly movimientoId: Identificador;
  readonly bloqueId: Identificador;
  readonly minutosReducidos: number;
  readonly aplicadaEn: Date;
}

export class ReduccionCarga {
  public readonly id: Identificador;
  public readonly operacionId: Identificador;
  public readonly movimientoId: Identificador;
  public readonly bloqueId: Identificador;
  public readonly minutosReducidos: number;
  private readonly _aplicadaEn: Date;

  constructor(datos: DatosReduccionCarga) {
    this.id = exigirIdentificador(datos.id, "identificador de reducción");
    this.operacionId = exigirIdentificador(
      datos.operacionId,
      "identificador de operación de reducción",
    );
    this.movimientoId = exigirIdentificador(
      datos.movimientoId,
      "identificador del consumo asociado",
    );
    this.bloqueId = exigirIdentificador(
      datos.bloqueId,
      "identificador del bloque reducido",
    );
    this.minutosReducidos = exigirEnteroPositivo(
      datos.minutosReducidos,
      "MINUTOS_REDUCCION_INVALIDOS",
      "La reducción de carga debe ser un entero positivo.",
    );
    this._aplicadaEn = copiarFecha(datos.aplicadaEn, "fecha de reducción");
  }

  public get aplicadaEn(): Date {
    return new Date(this._aplicadaEn);
  }
}
