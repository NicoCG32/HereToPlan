import { ErrorDominio } from "../compartido/ErrorDominio";
import type {
  AutoridadPlazo,
  RigidezCompromiso,
  TipoAjusteCompromiso,
} from "./tipos";

interface DatosPoliticaCompromiso {
  rigidez: RigidezCompromiso;
  autoridadPlazo: AutoridadPlazo;
  ajustesPermitidos?: Iterable<TipoAjusteCompromiso>;
}

export interface VistaPoliticaCompromiso {
  versionEsquema: 1;
  rigidez: RigidezCompromiso;
  autoridadPlazo: AutoridadPlazo;
  ajustesPermitidos: readonly TipoAjusteCompromiso[];
}

export class PoliticaCompromiso {
  public readonly versionEsquema = 1 as const;
  public readonly rigidez: RigidezCompromiso;
  public readonly autoridadPlazo: AutoridadPlazo;
  private readonly ajustesPermitidos: ReadonlySet<TipoAjusteCompromiso>;

  constructor(datos: DatosPoliticaCompromiso) {
    this.rigidez = datos.rigidez;
    this.autoridadPlazo = datos.autoridadPlazo;
    this.ajustesPermitidos = new Set(datos.ajustesPermitidos ?? []);

    if (this.rigidez === "ESTRICTO" && this.ajustesPermitidos.size > 0) {
      throw new ErrorDominio(
        "COMPROMISO_ESTRICTO_CON_AJUSTES",
        "Un compromiso estricto no puede declarar ajustes permitidos.",
      );
    }

    if (
      this.autoridadPlazo === "EXTERNA" &&
      this.ajustesPermitidos.has("EXTENDER_PLAZO")
    ) {
      throw new ErrorDominio(
        "PLAZO_EXTERNO_EXTENDIBLE",
        "Un plazo externo no puede extenderse desde HereToPlan.",
      );
    }
  }

  public permite(tipo: TipoAjusteCompromiso): boolean {
    return this.rigidez === "FLEXIBLE" && this.ajustesPermitidos.has(tipo);
  }

  public obtenerVista(): VistaPoliticaCompromiso {
    return Object.freeze({
      versionEsquema: this.versionEsquema,
      rigidez: this.rigidez,
      autoridadPlazo: this.autoridadPlazo,
      ajustesPermitidos: Object.freeze([...this.ajustesPermitidos]),
    });
  }
}
