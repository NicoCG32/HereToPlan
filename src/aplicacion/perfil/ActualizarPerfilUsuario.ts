import type { RepositorioPerfilUsuario } from "../puertos/RepositorioPerfilUsuario";
import { ErrorPerfilNoExiste } from "../puertos/RepositorioPerfilUsuario";
import type { Reloj } from "../puertos/Reloj";
import {
  rechazarErrorEsperado,
  type ResultadoGuardarPerfilUsuario,
} from "./CrearPerfilUsuario";
import { convertirPerfilUsuarioADto } from "./PerfilUsuarioDto";

export class CasoDeUsoActualizarPerfilUsuario {
  constructor(
    private readonly repositorio: RepositorioPerfilUsuario,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(
    nombreVisible: string,
  ): Promise<ResultadoGuardarPerfilUsuario> {
    const existente = await this.repositorio.obtener();
    if (!existente) {
      return Object.freeze({
        exito: false,
        error: Object.freeze({
          codigo: new ErrorPerfilNoExiste().codigo,
          mensaje: new ErrorPerfilNoExiste().message,
        }),
      });
    }
    try {
      const actualizado = existente.actualizarNombre(
        nombreVisible,
        this.reloj.ahora(),
      );
      await this.repositorio.actualizar(actualizado);
      return Object.freeze({
        exito: true,
        perfil: convertirPerfilUsuarioADto(actualizado),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorPerfilNoExiste) {
        return Object.freeze({
          exito: false,
          error: Object.freeze({
            codigo: error.codigo,
            mensaje: error.message,
          }),
        });
      }
      return rechazarErrorEsperado(error);
    }
  }
}
