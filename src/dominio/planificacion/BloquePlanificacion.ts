import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import type {
  PoliticaCompromiso,
  VistaPoliticaCompromiso,
} from "../compromisos/PoliticaCompromiso";
import { resolverPoliticaEfectiva } from "../compromisos/ResolverPoliticaEfectiva";

export interface DatosBloquePlanificacion {
  id: Identificador;
  contextoId: Identificador;
  actividadId: Identificador;
  titulo: string;
  fecha: FechaLocal;
  minutosPlanificados: number;
  politica: PoliticaCompromiso;
  creadoEn: Date;
}

export class BloquePlanificacion {
  public readonly id: Identificador;
  public readonly contextoId: Identificador;
  public readonly actividadId: Identificador;
  public readonly titulo: string;
  public readonly fecha: FechaLocal;
  public readonly minutosPlanificados: number;
  public readonly politica: VistaPoliticaCompromiso;
  private readonly _creadoEn: Date;

  constructor(datos: DatosBloquePlanificacion) {
    this.id = exigirIdentificador(datos.id, "identificador de bloque");
    this.contextoId = exigirIdentificador(
      datos.contextoId,
      "identificador de contexto",
    );
    this.actividadId = exigirIdentificador(
      datos.actividadId,
      "identificador de actividad",
    );
    this.titulo = exigirTexto(
      datos.titulo,
      "TITULO_BLOQUE_VACIO",
      "El bloque de planificación debe tener un título.",
    );
    if (!datos.fecha) {
      throw new ErrorDominio(
        "FECHA_BLOQUE_REQUERIDA",
        "El bloque de planificación debe indicar una fecha.",
      );
    }
    this.fecha = datos.fecha;
    this.minutosPlanificados = exigirEnteroPositivo(
      datos.minutosPlanificados,
      "MINUTOS_BLOQUE_INVALIDOS",
      "Los minutos planificados deben ser un entero positivo.",
    );
    this.politica = resolverPoliticaEfectiva({
      explicita: datos.politica,
    }).obtenerVista();
    this._creadoEn = copiarFecha(datos.creadoEn, "fecha de creación");
  }

  public get creadoEn(): Date {
    return new Date(this._creadoEn);
  }
}
