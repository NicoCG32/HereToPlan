import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import {
  IDENTIFICADOR_CONTEXTO_LIBRE,
  NOMBRE_CONTEXTO_LIBRE,
  type TipoContextoPlanificacion,
} from "./tipos";

interface DatosContextoBase {
  id: Identificador;
  nombre: string;
  proposito?: string;
  tipo: TipoContextoPlanificacion;
  creadaEn: Date;
  fechaInicio?: FechaLocal;
  fechaFin?: FechaLocal;
}

export interface DatosContextoNombrado {
  id: Identificador;
  nombre: string;
  proposito?: string;
  creadaEn: Date;
  fechaInicio?: FechaLocal;
  fechaFin?: FechaLocal;
}

export type DatosRehidratacionContextoPlanificacion = DatosContextoBase;

export interface RangoContextoPlanificacion {
  readonly fechaInicio: FechaLocal;
  readonly fechaFin: FechaLocal;
}

export class ContextoPlanificacion {
  public readonly id: Identificador;
  public readonly nombre: string;
  public readonly proposito: string | undefined;
  public readonly tipo: TipoContextoPlanificacion;
  public readonly fechaInicio: FechaLocal | undefined;
  public readonly fechaFin: FechaLocal | undefined;
  private readonly _creadaEn: Date;

  private constructor(datos: DatosContextoBase) {
    this.id = exigirIdentificador(datos.id, "identificador de contexto");
    this.nombre = exigirTexto(
      datos.nombre,
      "NOMBRE_CONTEXTO_VACIO",
      "El contexto de planificación debe tener un nombre.",
    );
    this.proposito = this.normalizarProposito(datos.proposito);
    this.tipo = datos.tipo;
    this._creadaEn = copiarFecha(datos.creadaEn, "fecha de creación");
    this.validarIdentidadReservada();
    this.validarRango(datos.fechaInicio, datos.fechaFin);
    this.fechaInicio = datos.fechaInicio;
    this.fechaFin = datos.fechaFin;
  }

  public static crearLibre(creadaEn: Date): ContextoPlanificacion {
    return new ContextoPlanificacion({
      id: IDENTIFICADOR_CONTEXTO_LIBRE,
      nombre: NOMBRE_CONTEXTO_LIBRE,
      tipo: "LIBRE",
      creadaEn,
    });
  }

  public static crearNombrado(
    datos: DatosContextoNombrado,
  ): ContextoPlanificacion {
    return new ContextoPlanificacion({
      ...datos,
      tipo: "NOMBRADO",
    });
  }

  public static rehidratar(
    datos: DatosRehidratacionContextoPlanificacion,
  ): ContextoPlanificacion {
    return new ContextoPlanificacion(datos);
  }

  public get creadaEn(): Date {
    return new Date(this._creadaEn);
  }

  public esLibre(): boolean {
    return this.tipo === "LIBRE";
  }

  public obtenerRango(): RangoContextoPlanificacion | undefined {
    if (!this.fechaInicio || !this.fechaFin) return undefined;
    return Object.freeze({
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
    });
  }

  public exigirEliminable(): void {
    if (this.esLibre()) {
      throw new ErrorDominio(
        "CONTEXTO_LIBRE_NO_ELIMINABLE",
        "El contexto Libre es administrado por el sistema y no puede eliminarse.",
      );
    }
  }

  private validarIdentidadReservada(): void {
    if (this.tipo !== "LIBRE" && this.tipo !== "NOMBRADO") {
      throw new ErrorDominio(
        "TIPO_CONTEXTO_INVALIDO",
        "El tipo de contexto de planificación no es reconocido.",
      );
    }
    if (
      this.tipo === "LIBRE" &&
      (this.id !== IDENTIFICADOR_CONTEXTO_LIBRE ||
        this.nombre !== NOMBRE_CONTEXTO_LIBRE)
    ) {
      throw new ErrorDominio(
        "IDENTIDAD_CONTEXTO_LIBRE_INVALIDA",
        "Libre debe conservar la identidad estable definida por el sistema.",
      );
    }
    if (this.tipo === "NOMBRADO" && this.id === IDENTIFICADOR_CONTEXTO_LIBRE) {
      throw new ErrorDominio(
        "IDENTIFICADOR_CONTEXTO_RESERVADO",
        "El identificador del contexto Libre está reservado por el sistema.",
      );
    }
    if (this.tipo === "LIBRE" && this.proposito !== undefined) {
      throw new ErrorDominio(
        "CONTEXTO_LIBRE_CON_PROPOSITO",
        "Libre no declara un propósito editable por la persona usuaria.",
      );
    }
  }

  private normalizarProposito(
    proposito: string | undefined,
  ): string | undefined {
    const normalizado = proposito?.trim() || undefined;
    if (normalizado && normalizado.length > 240) {
      throw new ErrorDominio(
        "PROPOSITO_CONTEXTO_DEMASIADO_LARGO",
        "El propósito del contexto no puede superar 240 caracteres.",
      );
    }
    return normalizado;
  }

  private validarRango(
    fechaInicio: FechaLocal | undefined,
    fechaFin: FechaLocal | undefined,
  ): void {
    if (this.tipo === "LIBRE" && (fechaInicio || fechaFin)) {
      throw new ErrorDominio(
        "CONTEXTO_LIBRE_CON_RANGO",
        "Libre no posee un rango temporal cerrado.",
      );
    }
    if ((fechaInicio === undefined) !== (fechaFin === undefined)) {
      throw new ErrorDominio(
        "RANGO_CONTEXTO_INCOMPLETO",
        "Un rango de contexto debe indicar tanto inicio como término.",
      );
    }
    if (fechaInicio && fechaFin?.esAnteriorA(fechaInicio)) {
      throw new ErrorDominio(
        "RANGO_CONTEXTO_INVALIDO",
        "La fecha final del contexto no puede ser anterior a la inicial.",
      );
    }
  }
}
