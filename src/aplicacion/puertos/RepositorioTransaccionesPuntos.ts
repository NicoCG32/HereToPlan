import type { TransaccionPuntos } from "../../dominio";

export class ErrorTransaccionPuntosDuplicada extends Error {
  constructor(
    public readonly transaccionId: string,
    public readonly fuenteTipo: string,
    public readonly fuenteId: string,
    public readonly causa?: unknown,
  ) {
    super("La transacción o su fuente semántica ya fue registrada.");
    this.name = "ErrorTransaccionPuntosDuplicada";
  }
}

export interface RepositorioTransaccionesPuntos {
  guardar(transaccion: TransaccionPuntos): Promise<void>;
  listar(): Promise<readonly TransaccionPuntos[]>;
}
