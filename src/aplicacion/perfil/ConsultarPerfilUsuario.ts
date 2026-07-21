import type { RepositorioPerfilUsuario } from "../puertos/RepositorioPerfilUsuario";
import {
  convertirPerfilUsuarioADto,
  type PerfilUsuarioDto,
} from "./PerfilUsuarioDto";

export class CasoDeUsoConsultarPerfilUsuario {
  constructor(private readonly repositorio: RepositorioPerfilUsuario) {}

  public async ejecutar(): Promise<PerfilUsuarioDto | undefined> {
    const perfil = await this.repositorio.obtener();
    return perfil ? convertirPerfilUsuarioADto(perfil) : undefined;
  }
}
