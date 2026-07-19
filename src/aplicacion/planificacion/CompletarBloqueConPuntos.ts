import {
  ErrorDominio,
  FormulaPuntosBloque,
  ResolucionBloquePlanificacion,
  TransaccionPuntos,
  exigirIdentificador,
  type ResultadoResolucionBloquePlanificacion,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { RepositorioResolucionesBloquesPlanificacion } from "../puertos/RepositorioResolucionesBloquesPlanificacion";
import {
  ErrorConfirmacionBloqueConPuntosDuplicada,
  type TransaccionCompletarBloqueConPuntos,
} from "../puertos/TransaccionCompletarBloqueConPuntos";
import type { ComandoResolverBloquePlanificacion } from "./ResolverBloquePlanificacion";

export interface CumplimientoBloqueConPuntosDto {
  readonly bloqueId: string;
  readonly operacionId: string;
  readonly resultado: "COMPLETADO";
  readonly resueltoEn: string;
  readonly puntosAcreditados: number;
  readonly reintentoIdempotente: boolean;
}

export type ResultadoCompletarBloqueConPuntos =
  | Readonly<{ exito: true; cumplimiento: CumplimientoBloqueConPuntosDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo: "bloqueId" | "operacionId";
      }>;
    }>;

export class CasoDeUsoCompletarBloqueConPuntos {
  constructor(
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
    private readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion,
    private readonly transaccion: TransaccionCompletarBloqueConPuntos,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
    private readonly formula: FormulaPuntosBloque = new FormulaPuntosBloque(),
  ) {}

  public async ejecutar(
    comando: ComandoResolverBloquePlanificacion,
  ): Promise<ResultadoCompletarBloqueConPuntos> {
    const identificadores = validarComando(comando);
    if (!identificadores.exito) return identificadores;
    const { bloqueId, operacionId } = identificadores;

    const repetida =
      await this.repositorioResoluciones.obtenerPorOperacionId(operacionId);
    const bloqueConfirmado = await this.buscarBloqueConfirmado(bloqueId);
    if (repetida) {
      return this.resolverOperacionRepetida(
        repetida.bloqueId,
        repetida.resultado,
        repetida.resueltoEn,
        repetida.operacionId,
        bloqueId,
        bloqueConfirmado?.minutosPlanificados,
      );
    }

    const resolucionExistente =
      await this.repositorioResoluciones.obtenerPorBloqueId(bloqueId);
    if (resolucionExistente) {
      return rechazar(
        "BLOQUE_YA_RESUELTO",
        `El bloque ${bloqueId} ya fue resuelto mediante otra operación.`,
        "bloqueId",
      );
    }
    if (!bloqueConfirmado) {
      const existeEnCorte = (await this.repositorioCortes.listar()).some(
        (corte) =>
          corte.listarBloques().some((bloque) => bloque.id === bloqueId),
      );
      return rechazar(
        existeEnCorte
          ? "BLOQUE_NO_CONFIRMADO"
          : "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
        existeEnCorte
          ? "El bloque debe pertenecer a una planificación confirmada antes de resolverse."
          : `No existe un bloque confirmado con el identificador ${bloqueId}.`,
        "bloqueId",
      );
    }

    const resueltoEn = this.reloj.ahora();
    const puntosAcreditados = this.formula.calcular(
      bloqueConfirmado.minutosPlanificados,
    );
    const resolucion = new ResolucionBloquePlanificacion({
      bloqueId,
      operacionId,
      resultado: "COMPLETADO",
      resueltoEn,
    });
    const ingreso = new TransaccionPuntos({
      id: this.generadorIdentificadores.generar(),
      tipo: "INGRESO",
      cantidad: puntosAcreditados,
      fuenteTipo: "COMPROMISO_COMPLETADO",
      fuenteId: bloqueId,
      descripcion: `Cumplimiento del bloque ${bloqueConfirmado.titulo}`,
      ocurridaEn: resueltoEn,
    });

    try {
      await this.transaccion.confirmar(resolucion, ingreso);
    } catch (error: unknown) {
      if (error instanceof ErrorConfirmacionBloqueConPuntosDuplicada) {
        return this.reconciliarColision(
          bloqueId,
          operacionId,
          bloqueConfirmado.minutosPlanificados,
        );
      }
      throw error;
    }

    return aceptar(resolucion, puntosAcreditados, false);
  }

  private async buscarBloqueConfirmado(bloqueId: string) {
    const cortes = await this.repositorioCortes.listar();
    for (const corte of cortes) {
      if (corte.estado !== "CONFIRMADA") continue;
      const bloque = corte
        .listarBloques()
        .find((candidato) => candidato.id === bloqueId);
      if (bloque) return bloque;
    }
    return undefined;
  }

  private async reconciliarColision(
    bloqueId: string,
    operacionId: string,
    minutosPlanificados: number,
  ): Promise<ResultadoCompletarBloqueConPuntos> {
    const mismaOperacion =
      await this.repositorioResoluciones.obtenerPorOperacionId(operacionId);
    if (mismaOperacion) {
      return this.resolverOperacionRepetida(
        mismaOperacion.bloqueId,
        mismaOperacion.resultado,
        mismaOperacion.resueltoEn,
        mismaOperacion.operacionId,
        bloqueId,
        minutosPlanificados,
      );
    }
    const mismoBloque =
      await this.repositorioResoluciones.obtenerPorBloqueId(bloqueId);
    return rechazar(
      mismoBloque ? "BLOQUE_YA_RESUELTO" : "CONFLICTO_ACREDITACION_PUNTOS",
      mismoBloque
        ? `El bloque ${bloqueId} ya fue resuelto mediante otra operación.`
        : `El ingreso del bloque ${bloqueId} colisionó con un movimiento existente y no pudo conciliarse.`,
      "bloqueId",
    );
  }

  private resolverOperacionRepetida(
    bloqueRegistradoId: string,
    resultado: ResultadoResolucionBloquePlanificacion,
    resueltoEn: Date,
    operacionRegistradaId: string,
    bloqueSolicitadoId: string,
    minutosPlanificados: number | undefined,
  ): ResultadoCompletarBloqueConPuntos {
    if (
      bloqueRegistradoId !== bloqueSolicitadoId ||
      resultado !== "COMPLETADO"
    ) {
      return rechazar(
        "OPERACION_RESOLUCION_EN_CONFLICTO",
        `La operación ${operacionRegistradaId} ya fue utilizada con otro comando.`,
        "operacionId",
      );
    }
    if (minutosPlanificados === undefined) {
      return rechazar(
        "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
        `No se encontró la instantánea confirmada del bloque ${bloqueSolicitadoId}.`,
        "bloqueId",
      );
    }
    return aceptar(
      new ResolucionBloquePlanificacion({
        bloqueId: bloqueRegistradoId,
        operacionId: operacionRegistradaId,
        resultado: "COMPLETADO",
        resueltoEn,
      }),
      this.formula.calcular(minutosPlanificados),
      true,
    );
  }
}

type ValidacionComando =
  | Readonly<{ exito: true; bloqueId: string; operacionId: string }>
  | Extract<ResultadoCompletarBloqueConPuntos, { exito: false }>;

function validarComando(
  comando: ComandoResolverBloquePlanificacion,
): ValidacionComando {
  try {
    const bloqueId = exigirIdentificador(comando.bloqueId, "bloque");
    try {
      return Object.freeze({
        exito: true,
        bloqueId,
        operacionId: exigirIdentificador(comando.operacionId, "operación"),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) {
        return rechazar(error.codigo, error.message, "operacionId");
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof ErrorDominio) {
      return rechazar(error.codigo, error.message, "bloqueId");
    }
    throw error;
  }
}

function aceptar(
  resolucion: ResolucionBloquePlanificacion,
  puntosAcreditados: number,
  reintentoIdempotente: boolean,
): ResultadoCompletarBloqueConPuntos {
  return Object.freeze({
    exito: true,
    cumplimiento: Object.freeze({
      bloqueId: resolucion.bloqueId,
      operacionId: resolucion.operacionId,
      resultado: "COMPLETADO" as const,
      resueltoEn: resolucion.resueltoEn.toISOString(),
      puntosAcreditados,
      reintentoIdempotente,
    }),
  });
}

function rechazar(
  codigo: string,
  mensaje: string,
  campo: "bloqueId" | "operacionId",
): Extract<ResultadoCompletarBloqueConPuntos, { exito: false }> {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, campo }),
  });
}
