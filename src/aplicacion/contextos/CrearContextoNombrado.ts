import { ContextoPlanificacion, ErrorDominio, FechaLocal } from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorContextoDuplicado,
  type RepositorioContextosPlanificacion,
} from "../puertos/RepositorioContextosPlanificacion";
import type { Reloj } from "../puertos/Reloj";
import {
  convertirContextoADto,
  type ContextoPlanificacionDto,
} from "./ContextoPlanificacionDto";

export interface ComandoCrearContextoNombrado {
  readonly nombre: string;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
}

export type ResultadoCrearContextoNombrado =
  | Readonly<{ exito: true; contexto: ContextoPlanificacionDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo?: "nombre" | "fechaInicio" | "fechaFin";
      }>;
    }>;

export class CasoDeUsoCrearContextoNombrado {
  constructor(
    private readonly repositorio: RepositorioContextosPlanificacion,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoCrearContextoNombrado,
  ): Promise<ResultadoCrearContextoNombrado> {
    let campoFecha: "fechaInicio" | "fechaFin" | undefined;

    try {
      campoFecha = "fechaInicio";
      const fechaInicio = comando.fechaInicio
        ? FechaLocal.crear(comando.fechaInicio)
        : undefined;
      campoFecha = "fechaFin";
      const fechaFin = comando.fechaFin
        ? FechaLocal.crear(comando.fechaFin)
        : undefined;
      campoFecha = undefined;

      const id = this.generadorIdentificadores.generar();
      const contexto = ContextoPlanificacion.crearNombrado({
        id,
        nombre: comando.nombre,
        creadaEn: this.reloj.ahora(),
        ...(fechaInicio ? { fechaInicio } : {}),
        ...(fechaFin ? { fechaFin } : {}),
      });
      await this.repositorio.guardar(contexto);
      return Object.freeze({
        exito: true,
        contexto: convertirContextoADto(contexto),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorContextoDuplicado) {
        return this.rechazar("IDENTIFICADOR_CONTEXTO_DUPLICADO", error.message);
      }
      if (error instanceof ErrorDominio) {
        return this.rechazar(
          error.codigo,
          error.message,
          campoFecha ?? this.resolverCampo(error.codigo),
        );
      }
      throw error;
    }
  }

  private resolverCampo(
    codigo: string,
  ): "nombre" | "fechaInicio" | "fechaFin" | undefined {
    if (codigo === "NOMBRE_CONTEXTO_VACIO") return "nombre";
    if (codigo.startsWith("RANGO_CONTEXTO")) return "fechaFin";
    return undefined;
  }

  private rechazar(
    codigo: string,
    mensaje: string,
    campo?: "nombre" | "fechaInicio" | "fechaFin",
  ): ResultadoCrearContextoNombrado {
    return Object.freeze({
      exito: false,
      error: Object.freeze({
        codigo,
        mensaje,
        ...(campo ? { campo } : {}),
      }),
    });
  }
}
