import type { Identificador } from "../compartido/tipos";
import { copiarFecha, exigirIdentificador } from "../compartido/validaciones";
import type { TipoAjusteCompromiso } from "./tipos";

interface DatosAjusteCompromiso {
  id: Identificador;
  bloqueId: Identificador;
  canjeRecompensaId: Identificador;
  tipo: TipoAjusteCompromiso;
  aplicadoEn: Date;
}

export class AjusteCompromiso {
  public readonly id: Identificador;
  public readonly bloqueId: Identificador;
  public readonly canjeRecompensaId: Identificador;
  public readonly tipo: TipoAjusteCompromiso;
  private readonly _aplicadoEn: Date;

  constructor(datos: DatosAjusteCompromiso) {
    this.id = exigirIdentificador(datos.id, "identificador de ajuste");
    this.bloqueId = exigirIdentificador(
      datos.bloqueId,
      "identificador de bloque",
    );
    this.canjeRecompensaId = exigirIdentificador(
      datos.canjeRecompensaId,
      "identificador de canje",
    );
    this.tipo = datos.tipo;
    this._aplicadoEn = copiarFecha(datos.aplicadoEn, "fecha de aplicación");
  }

  public get aplicadoEn(): Date {
    return new Date(this._aplicadoEn);
  }
}
