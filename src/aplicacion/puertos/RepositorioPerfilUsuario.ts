import type { PerfilUsuario } from "../../dominio";

export class ErrorPerfilYaExiste extends Error {
  public readonly codigo = "PERFIL_YA_EXISTE";

  constructor() {
    super(
      "Ya existe un perfil local; debe actualizarse en lugar de crear otro.",
    );
    this.name = "ErrorPerfilYaExiste";
  }
}

export class ErrorPerfilNoExiste extends Error {
  public readonly codigo = "PERFIL_NO_EXISTE";

  constructor() {
    super("No existe un perfil local para actualizar.");
    this.name = "ErrorPerfilNoExiste";
  }
}

export interface RepositorioPerfilUsuario {
  obtener(): Promise<PerfilUsuario | undefined>;
  guardarNuevo(perfil: PerfilUsuario): Promise<void>;
  actualizar(perfil: PerfilUsuario): Promise<void>;
}
