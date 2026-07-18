import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import type { AjusteCompromiso } from "../compromisos/AjusteCompromiso";
import type {
  PoliticaCompromiso,
  VistaPoliticaCompromiso,
} from "../compromisos/PoliticaCompromiso";
import { resolverPoliticaEfectiva } from "../compromisos/ResolverPoliticaEfectiva";
import type { EstadoBloqueTrabajo } from "./tipos";

export interface DatosNuevoBloqueTrabajo {
  id: Identificador;
  actividadId: Identificador;
  titulo: string;
  fecha: FechaLocal;
  minutosPlanificados: number;
  politica: PoliticaCompromiso;
}

export interface DatosRehidratacionBloqueTrabajo extends DatosNuevoBloqueTrabajo {
  estado: EstadoBloqueTrabajo;
  resueltoEn?: Date;
}

export interface VistaBloqueTrabajo {
  id: Identificador;
  actividadId: Identificador;
  titulo: string;
  fecha: FechaLocal;
  minutosPlanificados: number;
  politica: VistaPoliticaCompromiso;
  estado: EstadoBloqueTrabajo;
  resueltoEn?: Date;
}

export class BloqueTrabajo {
  public readonly id: Identificador;
  public readonly actividadId: Identificador;
  public readonly titulo: string;
  public readonly fecha: FechaLocal;
  public readonly minutosPlanificados: number;
  private readonly politica: PoliticaCompromiso;
  private _estado: EstadoBloqueTrabajo = "PENDIENTE";
  private _resueltoEn: Date | undefined;

  constructor(datos: DatosNuevoBloqueTrabajo) {
    this.id = exigirIdentificador(datos.id, "identificador de bloque");
    this.actividadId = exigirIdentificador(
      datos.actividadId,
      "identificador de actividad",
    );
    this.titulo = exigirTexto(
      datos.titulo,
      "TITULO_BLOQUE_VACIO",
      "El bloque de trabajo debe tener un título.",
    );
    this.fecha = datos.fecha;
    this.minutosPlanificados = exigirEnteroPositivo(
      datos.minutosPlanificados,
      "MINUTOS_BLOQUE_INVALIDOS",
      "Los minutos planificados deben ser un entero positivo.",
    );
    this.politica = resolverPoliticaEfectiva({ explicita: datos.politica });
  }

  public static rehidratar(
    datos: DatosRehidratacionBloqueTrabajo,
  ): BloqueTrabajo {
    const bloque = new BloqueTrabajo(datos);
    const estadosValidos: readonly EstadoBloqueTrabajo[] = [
      "PENDIENTE",
      "COMPLETADO",
      "INCUMPLIDO",
      "EXCUSADO",
    ];
    if (!estadosValidos.includes(datos.estado)) {
      throw new ErrorDominio(
        "ESTADO_BLOQUE_REHIDRATADO_INVALIDO",
        "El estado del bloque rehidratado no es reconocido.",
      );
    }
    const estaPendiente = datos.estado === "PENDIENTE";
    const tieneResolucion = datos.resueltoEn !== undefined;

    if (estaPendiente === tieneResolucion) {
      throw new ErrorDominio(
        "ESTADO_BLOQUE_REHIDRATADO_INVALIDO",
        "Un bloque pendiente no tiene resolución y un bloque resuelto debe tenerla.",
      );
    }

    bloque._estado = datos.estado;
    bloque._resueltoEn = datos.resueltoEn
      ? copiarFecha(datos.resueltoEn, "fecha de resolución")
      : undefined;

    return bloque;
  }

  public get estado(): EstadoBloqueTrabajo {
    return this._estado;
  }

  public permiteAjuste(tipo: AjusteCompromiso["tipo"]): boolean {
    return this.politica.permite(tipo);
  }

  public completar(fecha: Date): void {
    this.exigirPendiente();
    this._estado = "COMPLETADO";
    this._resueltoEn = copiarFecha(fecha, "fecha de resolución");
  }

  public marcarIncumplido(fecha: Date): void {
    this.exigirPendiente();
    this._estado = "INCUMPLIDO";
    this._resueltoEn = copiarFecha(fecha, "fecha de resolución");
  }

  public validarAjuste(ajuste: AjusteCompromiso): void {
    this.exigirPendiente();
    if (ajuste.bloqueId !== this.id) {
      throw new ErrorDominio(
        "AJUSTE_PARA_OTRO_BLOQUE",
        "El ajuste no corresponde al bloque seleccionado.",
      );
    }
    if (!this.politica.permite(ajuste.tipo)) {
      throw new ErrorDominio(
        "AJUSTE_NO_PERMITIDO",
        "La política original del compromiso no permite este ajuste.",
      );
    }
    if (ajuste.tipo !== "EXCUSAR") {
      throw new ErrorDominio(
        "AJUSTE_NO_IMPLEMENTADO",
        "El ajuste solicitado todavía no está implementado.",
      );
    }
  }

  public aplicarAjuste(ajuste: AjusteCompromiso): void {
    this.validarAjuste(ajuste);
    this._estado = "EXCUSADO";
    this._resueltoEn = ajuste.aplicadoEn;
  }

  public obtenerVista(): VistaBloqueTrabajo {
    const vista: VistaBloqueTrabajo = {
      id: this.id,
      actividadId: this.actividadId,
      titulo: this.titulo,
      fecha: this.fecha,
      minutosPlanificados: this.minutosPlanificados,
      politica: this.politica.obtenerVista(),
      estado: this._estado,
    };

    if (this._resueltoEn) {
      vista.resueltoEn = new Date(this._resueltoEn);
    }

    return vista;
  }

  private exigirPendiente(): void {
    if (this._estado !== "PENDIENTE") {
      throw new ErrorDominio(
        "BLOQUE_YA_RESUELTO",
        "Un bloque resuelto no puede resolverse nuevamente.",
      );
    }
  }
}
