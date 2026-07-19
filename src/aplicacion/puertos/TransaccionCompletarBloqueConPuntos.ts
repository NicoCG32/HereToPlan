import type {
  ResolucionBloquePlanificacion,
  TransaccionPuntos,
} from "../../dominio";

export class ErrorConfirmacionBloqueConPuntosDuplicada extends Error {
  constructor(public readonly causa?: unknown) {
    super("La resolución o su fuente de puntos ya fue registrada.");
    this.name = "ErrorConfirmacionBloqueConPuntosDuplicada";
  }
}

export interface TransaccionCompletarBloqueConPuntos {
  confirmar(
    resolucion: ResolucionBloquePlanificacion,
    ingreso: TransaccionPuntos,
  ): Promise<void>;
}
