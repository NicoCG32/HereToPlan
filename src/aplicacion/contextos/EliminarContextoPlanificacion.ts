import { ErrorDominio, type ContextoPlanificacion } from "../../dominio";
import {
  ErrorContextoNoEncontrado,
  type RepositorioContextosPlanificacion,
} from "../puertos/RepositorioContextosPlanificacion";
import type {
  EstrategiaEliminacionContexto,
  TransaccionEliminacionContextoPlanificacion,
} from "../puertos/TransaccionEliminacionContextoPlanificacion";

export interface ImpactoEliminacionContextoDto {
  readonly contextoId: string;
  readonly nombre: string;
  readonly proposito?: string;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
  readonly cantidadActividades: number;
  readonly cantidadBloquesEditables: number;
  readonly cantidadRegistrosConfirmados: number;
  readonly huella: string;
}

export interface ComandoEliminarContextoPlanificacion {
  readonly contextoId: string;
  readonly estrategia: EstrategiaEliminacionContexto;
  readonly huellaImpacto: string;
  readonly confirmacionReforzada?: string;
}

export interface ResultadoEliminacionContextoDto {
  readonly contextoId: string;
  readonly nombre: string;
  readonly estrategia: EstrategiaEliminacionContexto;
  readonly cantidadBloquesTrasladados: number;
  readonly cantidadBloquesEliminados: number;
  readonly cantidadRegistrosConfirmadosConservados: number;
}

export type ResultadoConsultarImpactoEliminacionContexto =
  | Readonly<{ exito: true; impacto: ImpactoEliminacionContextoDto }>
  | Readonly<{ exito: false; error: ErrorEliminacionContextoDto }>;

export type ResultadoEliminarContextoPlanificacion =
  | Readonly<{ exito: true; resultado: ResultadoEliminacionContextoDto }>
  | Readonly<{ exito: false; error: ErrorEliminacionContextoDto }>;

export interface ErrorEliminacionContextoDto {
  readonly codigo:
    | "CONTEXTO_NO_ENCONTRADO"
    | "CONTEXTO_LIBRE_NO_ELIMINABLE"
    | "CONFIRMACION_REFORZADA_REQUERIDA"
    | "IMPACTO_ELIMINACION_DESACTUALIZADO"
    | "ELIMINACION_CONTEXTO_FALLIDA";
  readonly mensaje: string;
  readonly campo?: "contexto" | "confirmacion" | "impacto";
}

export class CasoDeUsoConsultarImpactoEliminacionContexto {
  constructor(
    private readonly repositorioContextos: RepositorioContextosPlanificacion,
    private readonly transaccion: TransaccionEliminacionContextoPlanificacion,
  ) {}

  public async ejecutar(
    contextoId: string,
  ): Promise<ResultadoConsultarImpactoEliminacionContexto> {
    try {
      const contexto = await this.obtenerContextoEliminable(contextoId);
      const impacto = await this.transaccion.consultarImpacto(contexto.id);
      return Object.freeze({
        exito: true,
        impacto: Object.freeze({
          contextoId: contexto.id,
          nombre: contexto.nombre,
          ...(contexto.proposito ? { proposito: contexto.proposito } : {}),
          ...(contexto.fechaInicio
            ? { fechaInicio: contexto.fechaInicio.toString() }
            : {}),
          ...(contexto.fechaFin
            ? { fechaFin: contexto.fechaFin.toString() }
            : {}),
          cantidadActividades: impacto.actividadIds.length,
          cantidadBloquesEditables: impacto.bloqueIdsEditables.length,
          cantidadRegistrosConfirmados: impacto.cantidadRegistrosConfirmados,
          huella: impacto.huella,
        }),
      });
    } catch (error: unknown) {
      return Object.freeze({ exito: false, error: convertirError(error) });
    }
  }

  private async obtenerContextoEliminable(
    contextoId: string,
  ): Promise<ContextoPlanificacion> {
    const contexto = await this.repositorioContextos.obtenerPorId(contextoId);
    if (!contexto) throw new ErrorContextoNoEncontrado(contextoId);
    contexto.exigirEliminable();
    return contexto;
  }
}

export class CasoDeUsoEliminarContextoPlanificacion {
  constructor(
    private readonly repositorioContextos: RepositorioContextosPlanificacion,
    private readonly transaccion: TransaccionEliminacionContextoPlanificacion,
  ) {}

  public async ejecutar(
    comando: ComandoEliminarContextoPlanificacion,
  ): Promise<ResultadoEliminarContextoPlanificacion> {
    try {
      const contexto = await this.repositorioContextos.obtenerPorId(
        comando.contextoId,
      );
      if (!contexto) throw new ErrorContextoNoEncontrado(comando.contextoId);
      contexto.exigirEliminable();
      this.validarConfirmacionReforzada(contexto, comando);
      const resultado = await this.transaccion.ejecutar({
        contextoId: contexto.id,
        estrategia: comando.estrategia,
        huellaEsperada: comando.huellaImpacto,
      });
      return Object.freeze({
        exito: true,
        resultado: Object.freeze({
          contextoId: contexto.id,
          nombre: contexto.nombre,
          estrategia: comando.estrategia,
          ...resultado,
        }),
      });
    } catch (error: unknown) {
      return Object.freeze({ exito: false, error: convertirError(error) });
    }
  }

  private validarConfirmacionReforzada(
    contexto: ContextoPlanificacion,
    comando: ComandoEliminarContextoPlanificacion,
  ): void {
    if (
      comando.estrategia === "ELIMINAR_BORRADORES" &&
      comando.confirmacionReforzada?.trim() !== contexto.nombre
    ) {
      throw new ErrorConfirmacionReforzadaRequerida(contexto.nombre);
    }
  }
}

class ErrorConfirmacionReforzadaRequerida extends Error {
  public readonly codigo = "CONFIRMACION_REFORZADA_REQUERIDA";

  constructor(nombre: string) {
    super(`Escribe exactamente ${nombre} para confirmar la eliminación.`);
    this.name = "ErrorConfirmacionReforzadaRequerida";
  }
}

function convertirError(error: unknown): ErrorEliminacionContextoDto {
  if (error instanceof ErrorContextoNoEncontrado) {
    return Object.freeze({
      codigo: "CONTEXTO_NO_ENCONTRADO",
      mensaje: error.message,
      campo: "contexto",
    });
  }
  if (
    error instanceof ErrorDominio &&
    error.codigo === "CONTEXTO_LIBRE_NO_ELIMINABLE"
  ) {
    return Object.freeze({
      codigo: "CONTEXTO_LIBRE_NO_ELIMINABLE",
      mensaje: error.message,
      campo: "contexto",
    });
  }
  if (
    error instanceof ErrorConfirmacionReforzadaRequerida ||
    codigoError(error) === "CONFIRMACION_REFORZADA_REQUERIDA"
  ) {
    return Object.freeze({
      codigo: "CONFIRMACION_REFORZADA_REQUERIDA",
      mensaje:
        error instanceof Error
          ? error.message
          : "La confirmación reforzada no coincide con el nombre de la agenda.",
      campo: "confirmacion",
    });
  }
  if (codigoError(error) === "IMPACTO_ELIMINACION_DESACTUALIZADO") {
    return Object.freeze({
      codigo: "IMPACTO_ELIMINACION_DESACTUALIZADO",
      mensaje:
        error instanceof Error
          ? error.message
          : "El impacto de la eliminación cambió.",
      campo: "impacto",
    });
  }
  return Object.freeze({
    codigo: "ELIMINACION_CONTEXTO_FALLIDA",
    mensaje:
      error instanceof Error
        ? error.message
        : "No fue posible eliminar la agenda sin comprometer sus datos.",
  });
}

function codigoError(error: unknown): unknown {
  return typeof error === "object" && error !== null && "codigo" in error
    ? error.codigo
    : undefined;
}
