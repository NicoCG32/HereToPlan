import { ErrorDominio, PerfilUsuario } from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorPerfilYaExiste,
  type RepositorioPerfilUsuario,
} from "../puertos/RepositorioPerfilUsuario";
import type { Reloj } from "../puertos/Reloj";
import {
  convertirPerfilUsuarioADto,
  type PerfilUsuarioDto,
} from "./PerfilUsuarioDto";

export type ResultadoGuardarPerfilUsuario =
  | Readonly<{ exito: true; perfil: PerfilUsuarioDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo?: "nombreVisible";
      }>;
    }>;

export class CasoDeUsoCrearPerfilUsuario {
  constructor(
    private readonly repositorio: RepositorioPerfilUsuario,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    nombreVisible: string,
  ): Promise<ResultadoGuardarPerfilUsuario> {
    try {
      const perfil = PerfilUsuario.crear({
        id: this.generadorIdentificadores.generar(),
        nombreVisible,
        creadoEn: this.reloj.ahora(),
      });
      await this.repositorio.guardarNuevo(perfil);
      return Object.freeze({
        exito: true,
        perfil: convertirPerfilUsuarioADto(perfil),
      });
    } catch (error: unknown) {
      return rechazarErrorEsperado(error);
    }
  }
}

export function rechazarErrorEsperado(
  error: unknown,
): ResultadoGuardarPerfilUsuario {
  if (error instanceof ErrorDominio || error instanceof ErrorPerfilYaExiste) {
    return Object.freeze({
      exito: false,
      error: Object.freeze({
        codigo: error instanceof ErrorDominio ? error.codigo : error.codigo,
        mensaje: error.message,
        ...(error instanceof ErrorDominio &&
        ["NOMBRE_PERFIL_VACIO", "NOMBRE_PERFIL_DEMASIADO_LARGO"].includes(
          error.codigo,
        )
          ? { campo: "nombreVisible" as const }
          : {}),
      }),
    });
  }
  throw error;
}
