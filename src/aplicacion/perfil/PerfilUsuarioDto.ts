import type { PerfilUsuario } from "../../dominio";

export interface PerfilUsuarioDto {
  readonly id: string;
  readonly nombreVisible: string;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

export function convertirPerfilUsuarioADto(
  perfil: PerfilUsuario,
): PerfilUsuarioDto {
  return Object.freeze({
    id: perfil.id,
    nombreVisible: perfil.nombreVisible,
    creadoEn: perfil.creadoEn.toISOString(),
    actualizadoEn: perfil.actualizadoEn.toISOString(),
  });
}
