import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import { ErrorDominio } from "../compartido/ErrorDominio";
import { esTipoActividad, type TipoActividad } from "./tipos";
import type {
  PoliticaCompromiso,
  VistaPoliticaCompromiso,
} from "../compromisos/PoliticaCompromiso";

export interface DatosActividad {
  id: Identificador;
  titulo: string;
  tipo: TipoActividad;
  descripcion?: string;
  creadaEn: Date;
  politicaPredeterminada?: PoliticaCompromiso;
}

export abstract class Actividad {
  public readonly id: Identificador;
  public readonly titulo: string;
  public readonly tipo: TipoActividad;
  public readonly descripcion: string | undefined;
  private readonly _creadaEn: Date;
  private readonly politicaPredeterminada: PoliticaCompromiso | undefined;

  protected constructor(datos: DatosActividad) {
    this.id = exigirIdentificador(datos.id, "identificador de actividad");
    this.titulo = exigirTexto(
      datos.titulo,
      "TITULO_ACTIVIDAD_VACIO",
      "La actividad debe tener un título.",
    );
    if (!esTipoActividad(datos.tipo)) {
      throw new ErrorDominio(
        "TIPO_ACTIVIDAD_INVALIDO",
        "El tipo de actividad no es reconocido.",
      );
    }
    this.tipo = datos.tipo;
    this.descripcion = datos.descripcion?.trim() || undefined;
    this._creadaEn = copiarFecha(datos.creadaEn, "fecha de creación");
    this.politicaPredeterminada = datos.politicaPredeterminada;
  }

  public get creadaEn(): Date {
    return new Date(this._creadaEn);
  }

  public obtenerPoliticaPredeterminada(): VistaPoliticaCompromiso | undefined {
    return this.politicaPredeterminada?.obtenerVista();
  }
}
