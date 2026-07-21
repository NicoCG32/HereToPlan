import { ContextoPlanificacion, ErrorDominio, FechaLocal } from "../../dominio";
import {
  ErrorContextoNoEncontrado,
  type RepositorioContextosPlanificacion,
} from "../puertos/RepositorioContextosPlanificacion";
import {
  convertirContextoADto,
  type ContextoPlanificacionDto,
} from "./ContextoPlanificacionDto";

export interface ComandoEditarContextoPlanificacion {
  readonly contextoId: string;
  readonly nombre: string;
  readonly proposito?: string;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
}

export type ResultadoEditarContextoPlanificacion =
  | Readonly<{ exito: true; contexto: ContextoPlanificacionDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo?: "nombre" | "proposito" | "fechaInicio" | "fechaFin";
      }>;
    }>;

export class CasoDeUsoEditarContextoPlanificacion {
  constructor(
    private readonly repositorio: RepositorioContextosPlanificacion,
  ) {}

  public async ejecutar(
    comando: ComandoEditarContextoPlanificacion,
  ): Promise<ResultadoEditarContextoPlanificacion> {
    let campoFecha: "fechaInicio" | "fechaFin" | undefined;
    try {
      const existente = await this.repositorio.obtenerPorId(comando.contextoId);
      if (!existente) throw new ErrorContextoNoEncontrado(comando.contextoId);
      existente.exigirEliminable();
      campoFecha = "fechaInicio";
      const fechaInicio = comando.fechaInicio
        ? FechaLocal.crear(comando.fechaInicio)
        : undefined;
      campoFecha = "fechaFin";
      const fechaFin = comando.fechaFin
        ? FechaLocal.crear(comando.fechaFin)
        : undefined;
      campoFecha = undefined;
      const actualizado = ContextoPlanificacion.crearNombrado({
        id: existente.id,
        nombre: comando.nombre,
        ...(comando.proposito !== undefined
          ? { proposito: comando.proposito }
          : {}),
        creadaEn: existente.creadaEn,
        ...(fechaInicio ? { fechaInicio } : {}),
        ...(fechaFin ? { fechaFin } : {}),
      });
      await this.repositorio.actualizar(actualizado);
      return Object.freeze({
        exito: true,
        contexto: convertirContextoADto(actualizado),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorContextoNoEncontrado) {
        return rechazar(error.codigo, error.message);
      }
      if (error instanceof ErrorDominio) {
        return rechazar(
          error.codigo,
          error.message,
          campoFecha ?? resolverCampo(error.codigo),
        );
      }
      throw error;
    }
  }
}

function resolverCampo(
  codigo: string,
): "nombre" | "proposito" | "fechaInicio" | "fechaFin" | undefined {
  if (codigo === "NOMBRE_CONTEXTO_VACIO") return "nombre";
  if (codigo === "PROPOSITO_CONTEXTO_DEMASIADO_LARGO") return "proposito";
  if (codigo.startsWith("RANGO_CONTEXTO")) return "fechaFin";
  return undefined;
}

function rechazar(
  codigo: string,
  mensaje: string,
  campo?: "nombre" | "proposito" | "fechaInicio" | "fechaFin",
): ResultadoEditarContextoPlanificacion {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, ...(campo ? { campo } : {}) }),
  });
}
