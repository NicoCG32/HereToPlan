import {
  SesionCronometro,
  type TipoOperacionSesionCronometro,
} from "../../../dominio";
import type {
  OperacionSesionCronometroV1,
  SesionCronometroV1,
} from "../registros/SesionCronometroV1";

const TIPOS_OPERACION: readonly TipoOperacionSesionCronometro[] = [
  "INICIAR",
  "PAUSAR",
  "REANUDAR",
  "DETENER",
];

export class ErrorMapeoSesionCronometroV1 extends Error {
  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMapeoSesionCronometroV1";
  }
}

export function convertirSesionCronometroEnV1(
  sesion: SesionCronometro,
): SesionCronometroV1 {
  const operaciones = sesion.listarOperaciones().map((operacion) =>
    Object.freeze({
      id: operacion.id,
      tipo: operacion.tipo,
      ocurridaEn: operacion.ocurridaEn.toISOString(),
    }),
  );
  return Object.freeze({
    versionEsquema: 1,
    id: sesion.id,
    bloqueId: sesion.bloqueId,
    estado: sesion.estado,
    revision: sesion.revision,
    operaciones: Object.freeze(operaciones),
    operacionesIds: Object.freeze(operaciones.map(({ id }) => id)),
    ...(sesion.estado === "FINALIZADA" ? {} : { claveAbierta: "ABIERTA" }),
  });
}

export function rehidratarSesionCronometroDesdeV1(
  registro: SesionCronometroV1,
): SesionCronometro {
  if (Number(registro.versionEsquema) !== 1) {
    throw new ErrorMapeoSesionCronometroV1(
      `La versión ${String(registro.versionEsquema)} de la sesión no está soportada.`,
    );
  }
  try {
    const operaciones = registro.operaciones.map(convertirOperacion);
    const ids = operaciones.map(({ id }) => id);
    if (
      registro.revision !== operaciones.length ||
      registro.operacionesIds.length !== ids.length ||
      registro.operacionesIds.some((id, indice) => id !== ids[indice])
    ) {
      throw new Error(
        "La revisión o el índice de operaciones no es coherente.",
      );
    }
    const sesion = SesionCronometro.rehidratar({
      id: registro.id,
      bloqueId: registro.bloqueId,
      operaciones,
    });
    const claveEsperada =
      sesion.estado === "FINALIZADA" ? undefined : "ABIERTA";
    if (
      sesion.estado !== registro.estado ||
      registro.claveAbierta !== claveEsperada
    ) {
      throw new Error("El estado derivado de la sesión no coincide.");
    }
    return sesion;
  } catch (error: unknown) {
    throw new ErrorMapeoSesionCronometroV1(
      "El registro SesionCronometroV1 no satisface las invariantes.",
      error,
    );
  }
}

function convertirOperacion(registro: OperacionSesionCronometroV1): Readonly<{
  id: string;
  tipo: TipoOperacionSesionCronometro;
  ocurridaEn: Date;
}> {
  if (!TIPOS_OPERACION.includes(registro.tipo)) {
    throw new Error("El tipo de operación no es válido.");
  }
  const ocurridaEn = new Date(registro.ocurridaEn);
  if (
    Number.isNaN(ocurridaEn.getTime()) ||
    ocurridaEn.toISOString() !== registro.ocurridaEn
  ) {
    throw new Error("El instante de operación no es ISO UTC normalizado.");
  }
  return Object.freeze({
    id: registro.id,
    tipo: registro.tipo,
    ocurridaEn,
  });
}
