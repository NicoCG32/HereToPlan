import { PerfilUsuario } from "../../../dominio";
import type { PerfilUsuarioV1 } from "../registros/PerfilUsuarioV1";

export class ErrorMapeoPerfilUsuarioV1 extends Error {
  constructor(
    public readonly codigo:
      "VERSION_PERFIL_NO_SOPORTADA" | "REGISTRO_PERFIL_INVALIDO",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoPerfilUsuarioV1";
  }
}

export function convertirPerfilUsuarioEnV1(
  perfil: PerfilUsuario,
): PerfilUsuarioV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: perfil.id,
    nombreVisible: perfil.nombreVisible,
    creadoEn: perfil.creadoEn.toISOString(),
    actualizadoEn: perfil.actualizadoEn.toISOString(),
  });
}

export function rehidratarPerfilUsuarioDesdeV1(
  registro: PerfilUsuarioV1,
): PerfilUsuario {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoPerfilUsuarioV1(
      "VERSION_PERFIL_NO_SOPORTADA",
      `La versión ${String(registro.versionEsquema)} del perfil no está soportada.`,
    );
  }
  try {
    return PerfilUsuario.rehidratar({
      id: registro.id,
      nombreVisible: registro.nombreVisible,
      creadoEn: convertirInstante(registro.creadoEn, "creadoEn"),
      actualizadoEn: convertirInstante(registro.actualizadoEn, "actualizadoEn"),
    });
  } catch (error: unknown) {
    throw new ErrorMapeoPerfilUsuarioV1(
      "REGISTRO_PERFIL_INVALIDO",
      `El registro PerfilUsuarioV1 no satisface las invariantes.${error instanceof Error ? ` ${error.message}` : ""}`,
      error,
    );
  }
}

function convertirInstante(valor: string, campo: string): Date {
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime()) || instante.toISOString() !== valor) {
    throw new ErrorMapeoPerfilUsuarioV1(
      "REGISTRO_PERFIL_INVALIDO",
      `${campo} debe contener un instante ISO UTC normalizado.`,
    );
  }
  return instante;
}
