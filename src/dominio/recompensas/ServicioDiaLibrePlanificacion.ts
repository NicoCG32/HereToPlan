import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import { exigirIdentificador } from "../compartido/validaciones";
import { AjusteCompromiso } from "../compromisos/AjusteCompromiso";
import type { VistaPoliticaCompromiso } from "../compromisos/PoliticaCompromiso";
import type { BilleteraPuntos } from "../puntos/BilleteraPuntos";
import { TransaccionPuntos } from "../puntos/TransaccionPuntos";
import { CanjeRecompensa } from "./CanjeRecompensa";
import { AplicacionRecompensa } from "./AplicacionRecompensa";
import type { DefinicionRecompensa } from "./DefinicionRecompensa";
import type { RecompensaAdquirida } from "./RecompensaAdquirida";
import type { RecompensaDefinida } from "./RecompensaDefinida";

export type EstadoBloqueDiaLibre = "PENDIENTE" | "RESUELTO" | "EXCUSADO";

export type MotivoProteccionDiaLibre =
  | "YA_RESUELTO"
  | "YA_EXCUSADO"
  | "COMPROMISO_ESTRICTO"
  | "AUTORIDAD_EXTERNA"
  | "EXCUSION_NO_PERMITIDA";

export interface BloqueEvaluableDiaLibre {
  readonly id: Identificador;
  readonly fecha: FechaLocal;
  readonly politica: VistaPoliticaCompromiso;
  readonly estado: EstadoBloqueDiaLibre;
}

export interface EvaluacionDiaLibre {
  readonly costoPuntos: number;
  readonly saldoActual: number;
  readonly saldoPosterior: number;
  readonly saldoSuficiente: boolean;
  readonly afectados: readonly Identificador[];
  readonly protegidos: readonly Readonly<{
    bloqueId: Identificador;
    motivo: MotivoProteccionDiaLibre;
  }>[];
  readonly puedeCanjear: boolean;
}

export interface EvaluacionAplicacionDiaLibre {
  readonly afectados: readonly Identificador[];
  readonly protegidos: readonly Readonly<{
    bloqueId: Identificador;
    motivo: MotivoProteccionDiaLibre;
  }>[];
  readonly puedeAplicar: boolean;
}

interface SolicitudEvaluacionDiaLibre {
  readonly recompensa: DefinicionRecompensa;
  readonly billetera: BilleteraPuntos;
  readonly bloques: readonly BloqueEvaluableDiaLibre[];
  readonly fechaObjetivo: FechaLocal;
  readonly fechaActual: FechaLocal;
}

interface SolicitudPreparacionDiaLibre extends SolicitudEvaluacionDiaLibre {
  readonly idCanje: Identificador;
  readonly idTransaccion: Identificador;
  readonly crearIdAjuste: (bloqueId: Identificador) => Identificador;
  readonly fechaCanje: Date;
}

interface SolicitudEvaluacionAplicacionDiaLibre {
  readonly recompensa: RecompensaDefinida;
  readonly bloques: readonly BloqueEvaluableDiaLibre[];
  readonly fechaObjetivo: FechaLocal;
  readonly fechaActual: FechaLocal;
}

interface SolicitudPreparacionAplicacionDiaLibre extends SolicitudEvaluacionAplicacionDiaLibre {
  readonly idAplicacion: Identificador;
  readonly adquirida: RecompensaAdquirida;
  readonly crearIdAjuste: (bloqueId: Identificador) => Identificador;
  readonly aplicadaEn: Date;
}

export interface ResultadoDiaLibrePreparado {
  readonly canje: CanjeRecompensa;
  readonly gasto: TransaccionPuntos;
  readonly ajustes: readonly AjusteCompromiso[];
  readonly evaluacion: EvaluacionDiaLibre;
}

export interface ResultadoAplicacionDiaLibrePreparada {
  readonly aplicacion: AplicacionRecompensa;
  readonly adquiridaConsumida: RecompensaAdquirida;
  readonly ajustes: readonly AjusteCompromiso[];
  readonly evaluacion: EvaluacionAplicacionDiaLibre;
}

export class ServicioDiaLibrePlanificacion {
  public evaluarAplicacion(
    solicitud: SolicitudEvaluacionAplicacionDiaLibre,
  ): EvaluacionAplicacionDiaLibre {
    this.validarTipoYFecha(solicitud);
    this.validarUnicidad(solicitud.bloques);
    const clasificacion = this.clasificarBloques(solicitud);
    return Object.freeze({
      ...clasificacion,
      puedeAplicar: clasificacion.afectados.length > 0,
    });
  }

  public evaluar(solicitud: SolicitudEvaluacionDiaLibre): EvaluacionDiaLibre {
    this.validarRecompensaYFecha(solicitud);
    this.validarUnicidad(solicitud.bloques);
    const { afectados, protegidos } = this.clasificarBloques(solicitud);

    const saldoActual = solicitud.billetera.saldo;
    const saldoPosterior = saldoActual - solicitud.recompensa.costoPuntos;
    const saldoSuficiente = saldoPosterior >= 0;
    return Object.freeze({
      costoPuntos: solicitud.recompensa.costoPuntos,
      saldoActual,
      saldoPosterior,
      saldoSuficiente,
      afectados: Object.freeze(afectados),
      protegidos: Object.freeze(
        protegidos.map((protegido) => Object.freeze(protegido)),
      ),
      puedeCanjear: saldoSuficiente && afectados.length > 0,
    });
  }

  public preparar(
    solicitud: SolicitudPreparacionDiaLibre,
  ): ResultadoDiaLibrePreparado {
    const evaluacion = this.evaluar(solicitud);
    if (evaluacion.afectados.length === 0) {
      throw new ErrorDominio(
        "DIA_LIBRE_SIN_COMPROMISOS_ELEGIBLES",
        "No existen compromisos flexibles elegibles en la fecha seleccionada.",
      );
    }
    if (!evaluacion.saldoSuficiente) {
      throw new ErrorDominio(
        "SALDO_INSUFICIENTE",
        "No existen puntos suficientes para canjear el día libre.",
      );
    }

    const canje = new CanjeRecompensa({
      id: solicitud.idCanje,
      recompensaId: solicitud.recompensa.id,
      puntosGastados: solicitud.recompensa.costoPuntos,
      canjeadoEn: solicitud.fechaCanje,
      fechaObjetivo: solicitud.fechaObjetivo,
      bloquesAfectados: evaluacion.afectados,
    });
    const gasto = new TransaccionPuntos({
      id: solicitud.idTransaccion,
      tipo: "GASTO",
      cantidad: solicitud.recompensa.costoPuntos,
      fuenteTipo: "CANJE_RECOMPENSA",
      fuenteId: canje.id,
      descripcion: `Canje de recompensa: ${solicitud.recompensa.nombre}`,
      ocurridaEn: solicitud.fechaCanje,
    });
    const ajustes = evaluacion.afectados.map(
      (bloqueId) =>
        new AjusteCompromiso({
          id: exigirIdentificador(
            solicitud.crearIdAjuste(bloqueId),
            "identificador generado de ajuste",
          ),
          bloqueId,
          canjeRecompensaId: canje.id,
          tipo: "EXCUSAR",
          aplicadoEn: solicitud.fechaCanje,
        }),
    );
    return Object.freeze({
      canje,
      gasto,
      ajustes: Object.freeze(ajustes),
      evaluacion,
    });
  }

  public prepararAplicacion(
    solicitud: SolicitudPreparacionAplicacionDiaLibre,
  ): ResultadoAplicacionDiaLibrePreparada {
    if (solicitud.adquirida.recompensaId !== solicitud.recompensa.id) {
      throw new ErrorDominio(
        "UNIDAD_RECOMPENSA_INCOMPATIBLE",
        "La unidad adquirida no corresponde a la recompensa aplicada.",
      );
    }
    const evaluacion = this.evaluarAplicacion(solicitud);
    if (!evaluacion.puedeAplicar) {
      throw new ErrorDominio(
        "DIA_LIBRE_SIN_COMPROMISOS_ELEGIBLES",
        "No existen compromisos flexibles elegibles en la fecha seleccionada.",
      );
    }
    const aplicacion = new AplicacionRecompensa({
      id: solicitud.idAplicacion,
      recompensaAdquiridaId: solicitud.adquirida.id,
      recompensaId: solicitud.recompensa.id,
      puntosGastados: solicitud.adquirida.puntosGastados,
      aplicadaEn: solicitud.aplicadaEn,
      fechaObjetivo: solicitud.fechaObjetivo,
      bloquesAfectados: evaluacion.afectados,
    });
    const adquiridaConsumida = solicitud.adquirida.consumir(
      aplicacion.id,
      solicitud.aplicadaEn,
    );
    const ajustes = evaluacion.afectados.map(
      (bloqueId) =>
        new AjusteCompromiso({
          id: exigirIdentificador(
            solicitud.crearIdAjuste(bloqueId),
            "identificador generado de ajuste",
          ),
          bloqueId,
          canjeRecompensaId: aplicacion.id,
          tipo: "EXCUSAR",
          aplicadoEn: solicitud.aplicadaEn,
        }),
    );
    return Object.freeze({
      aplicacion,
      adquiridaConsumida,
      ajustes: Object.freeze(ajustes),
      evaluacion,
    });
  }

  private clasificarBloques(
    solicitud: Pick<
      SolicitudEvaluacionAplicacionDiaLibre,
      "bloques" | "fechaObjetivo"
    >,
  ): Pick<EvaluacionAplicacionDiaLibre, "afectados" | "protegidos"> {
    const afectados: Identificador[] = [];
    const protegidos: Array<{
      bloqueId: Identificador;
      motivo: MotivoProteccionDiaLibre;
    }> = [];
    for (const bloque of solicitud.bloques) {
      if (!bloque.fecha.esIgualA(solicitud.fechaObjetivo)) continue;
      const motivo = determinarMotivoProteccion(bloque);
      if (motivo) protegidos.push({ bloqueId: bloque.id, motivo });
      else afectados.push(bloque.id);
    }
    return Object.freeze({
      afectados: Object.freeze(afectados),
      protegidos: Object.freeze(
        protegidos.map((protegido) => Object.freeze(protegido)),
      ),
    });
  }

  private validarRecompensaYFecha(
    solicitud: SolicitudEvaluacionDiaLibre,
  ): void {
    if (solicitud.recompensa.tipoEfecto !== "DIA_LIBRE") {
      throw new ErrorDominio(
        "RECOMPENSA_INCORRECTA",
        "La recompensa indicada no corresponde a un día libre.",
      );
    }
    if (!solicitud.fechaObjetivo.esPosteriorA(solicitud.fechaActual)) {
      throw new ErrorDominio(
        "DIA_LIBRE_FUERA_DE_VENTANA",
        "El día libre debe canjearse para una fecha local posterior al día actual.",
      );
    }
  }

  private validarTipoYFecha(
    solicitud: SolicitudEvaluacionAplicacionDiaLibre,
  ): void {
    if (solicitud.recompensa.tipoEfecto !== "DIA_LIBRE") {
      throw new ErrorDominio(
        "RECOMPENSA_INCORRECTA",
        "La recompensa indicada no corresponde a un día libre.",
      );
    }
    if (!solicitud.fechaObjetivo.esPosteriorA(solicitud.fechaActual)) {
      throw new ErrorDominio(
        "DIA_LIBRE_FUERA_DE_VENTANA",
        "El día libre debe aplicarse a una fecha local posterior al día actual.",
      );
    }
  }

  private validarUnicidad(bloques: readonly BloqueEvaluableDiaLibre[]): void {
    const ids = bloques.map((bloque) => bloque.id);
    if (new Set(ids).size !== ids.length) {
      throw new ErrorDominio(
        "BLOQUES_GLOBALES_DUPLICADOS",
        "Los identificadores de bloque deben ser únicos entre cortes confirmados.",
      );
    }
  }
}

function determinarMotivoProteccion(
  bloque: BloqueEvaluableDiaLibre,
): MotivoProteccionDiaLibre | undefined {
  if (bloque.estado === "RESUELTO") return "YA_RESUELTO";
  if (bloque.estado === "EXCUSADO") return "YA_EXCUSADO";
  if (bloque.politica.rigidez === "ESTRICTO") {
    return "COMPROMISO_ESTRICTO";
  }
  if (bloque.politica.autoridadPlazo === "EXTERNA") {
    return "AUTORIDAD_EXTERNA";
  }
  if (!bloque.politica.ajustesPermitidos.includes("EXCUSAR")) {
    return "EXCUSION_NO_PERMITIDA";
  }
  return undefined;
}
