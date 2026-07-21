import {
  ErrorPerfilNoExiste,
  ErrorPerfilYaExiste,
  type RepositorioPerfilUsuario,
} from "../../../aplicacion";
import type { PerfilUsuario } from "../../../dominio";

export class RepositorioPerfilUsuarioEnMemoria implements RepositorioPerfilUsuario {
  private perfil: PerfilUsuario | undefined;

  constructor(perfilInicial?: PerfilUsuario) {
    this.perfil = perfilInicial;
  }

  public obtener(): Promise<PerfilUsuario | undefined> {
    return Promise.resolve(this.perfil);
  }

  public guardarNuevo(perfil: PerfilUsuario): Promise<void> {
    if (this.perfil) return Promise.reject(new ErrorPerfilYaExiste());
    this.perfil = perfil;
    return Promise.resolve();
  }

  public actualizar(perfil: PerfilUsuario): Promise<void> {
    if (!this.perfil || this.perfil.id !== perfil.id) {
      return Promise.reject(new ErrorPerfilNoExiste());
    }
    this.perfil = perfil;
    return Promise.resolve();
  }
}
