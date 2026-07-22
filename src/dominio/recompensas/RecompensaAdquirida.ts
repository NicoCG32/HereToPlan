import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
} from "../compartido/validaciones";

interface DatosRecompensaAdquirida {
  id: Identificador;
  recompensaId: Identificador;
  puntosGastados: number;
  adquiridaEn: Date;
  aplicacionId?: Identificador;
  consumidaEn?: Date;
}

export type EstadoRecompensaAdquirida = "DISPONIBLE" | "CONSUMIDA";

export class RecompensaAdquirida {
  public readonly id: Identificador;
  public readonly recompensaId: Identificador;
  public readonly puntosGastados: number;
  public readonly aplicacionId: Identificador | undefined;
  private readonly _adquiridaEn: Date;
  private readonly _consumidaEn: Date | undefined;

  constructor(datos: DatosRecompensaAdquirida) {
    this.id = exigirIdentificador(
      datos.id,
      "identificador de recompensa adquirida",
    );
    this.recompensaId = exigirIdentificador(
      datos.recompensaId,
      "identificador de recompensa definida",
    );
    this.puntosGastados = exigirEnteroPositivo(
      datos.puntosGastados,
      "COSTO_ADQUISICION_INVALIDO",
      "El costo histórico de adquisición debe ser un entero positivo.",
    );
    this._adquiridaEn = copiarFecha(datos.adquiridaEn, "fecha de adquisición");
    if (
      (datos.aplicacionId === undefined) !==
      (datos.consumidaEn === undefined)
    ) {
      throw new ErrorDominio(
        "CONSUMO_RECOMPENSA_INCOMPLETO",
        "Una recompensa consumida debe identificar conjuntamente su aplicación y fecha.",
      );
    }
    this.aplicacionId = datos.aplicacionId
      ? exigirIdentificador(datos.aplicacionId, "identificador de aplicación")
      : undefined;
    this._consumidaEn = datos.consumidaEn
      ? copiarFecha(datos.consumidaEn, "fecha de consumo")
      : undefined;
    if (
      this._consumidaEn &&
      this._consumidaEn.getTime() < this._adquiridaEn.getTime()
    ) {
      throw new ErrorDominio(
        "CONSUMO_ANTERIOR_A_ADQUISICION",
        "Una recompensa no puede consumirse antes de ser adquirida.",
      );
    }
  }

  public get estado(): EstadoRecompensaAdquirida {
    return this.aplicacionId ? "CONSUMIDA" : "DISPONIBLE";
  }

  public get adquiridaEn(): Date {
    return new Date(this._adquiridaEn);
  }

  public get consumidaEn(): Date | undefined {
    return this._consumidaEn ? new Date(this._consumidaEn) : undefined;
  }

  public consumir(
    aplicacionId: Identificador,
    consumidaEn: Date,
  ): RecompensaAdquirida {
    const aplicacion = exigirIdentificador(
      aplicacionId,
      "identificador de aplicación",
    );
    const instante = copiarFecha(consumidaEn, "fecha de consumo");
    if (this.estado === "CONSUMIDA") {
      if (
        this.aplicacionId === aplicacion &&
        this._consumidaEn?.getTime() === instante.getTime()
      ) {
        return this;
      }
      throw new ErrorDominio(
        "RECOMPENSA_YA_CONSUMIDA",
        "La recompensa adquirida ya fue consumida por otra aplicación.",
      );
    }
    return new RecompensaAdquirida({
      id: this.id,
      recompensaId: this.recompensaId,
      puntosGastados: this.puntosGastados,
      adquiridaEn: this._adquiridaEn,
      aplicacionId: aplicacion,
      consumidaEn: instante,
    });
  }
}
